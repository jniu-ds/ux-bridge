import {
  ADMIN_ROLE,
  USER_ROLES,
  buildUserPayload,
  countAdmins,
  deleteUserIntegrationSecret,
  deleteUser,
  getSession,
  isAllowedNuSkinEmail,
  issuePasswordResetForUser,
  migrateUserIntegrationSecrets,
  migrateSessionsToEmail,
  normalizeEmail,
  normalizeRole,
  readJsonBody,
  readUser,
  sendJson,
  writeUser,
  writeUserIntegrationSecret,
} from "./auth-store.js";
import { migrateCommentAuthorProfile } from "./comments-store.js";
import { recordAuditEvent } from "./db/observability.js";
import { reassignOwnedProjectsEmail } from "./projects-store.js";
import { listVibeProviders } from "./vibe-providers.js";
import { validateCodexApiKey } from "./codex-connector.js";

const MAX_AVATAR_LENGTH = 1_500_000;

function sanitizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function sanitizeAvatarUrl(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  if (input.length > MAX_AVATAR_LENGTH) {
    throw new Error("Profile photo is too large. Choose a smaller image.");
  }

  if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(input)) {
    throw new Error("Choose a valid image file for the profile photo.");
  }

  return input;
}

async function getProfileAccess(req, requestedEmail = "") {
  const session = await getSession(req);

  if (!session) {
    return {
      ok: false,
      status: 401,
      payload: {
        ok: false,
        error: "Authentication required.",
      },
    };
  }

  const currentUser = session.user;
  const currentUserEmail = normalizeEmail(currentUser.email);
  const targetEmail = normalizeEmail(requestedEmail || currentUserEmail);
  const isAdmin = normalizeRole(currentUser.role) === ADMIN_ROLE;

  if (!targetEmail) {
    return {
      ok: false,
      status: 400,
      payload: {
        ok: false,
        error: "A profile email is required.",
      },
    };
  }

  if (!isAdmin && targetEmail !== currentUserEmail) {
    return {
      ok: false,
      status: 403,
      payload: {
        ok: false,
        error: "You can only view your own profile.",
      },
    };
  }

  const targetUser = await readUser(targetEmail);

  if (!targetUser) {
    return {
      ok: false,
      status: 404,
      payload: {
        ok: false,
        error: "User not found.",
      },
    };
  }

  return {
    ok: true,
    session,
    currentUser,
    currentUserEmail,
    targetUser,
    targetEmail,
    isAdmin,
    viewingSelf: targetEmail === currentUserEmail,
  };
}

function buildProfileResponse(access) {
  return {
    ok: true,
    user: buildUserPayload(access.targetUser),
    currentUser: buildUserPayload(access.currentUser),
    viewingSelf: access.viewingSelf,
    canManageAllProfiles: access.isAdmin,
    canEditRole: access.isAdmin,
    roles: USER_ROLES,
    toolProviders: listVibeProviders(),
  };
}

export async function handleProfileRequest(req) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const requestedEmail = requestUrl.searchParams.get("email") || "";
  const access = await getProfileAccess(req, requestedEmail);

  if (!access.ok) {
    return {
      status: access.status,
      payload: access.payload,
    };
  }

  if (req.method === "GET") {
    return {
      status: 200,
      payload: buildProfileResponse(access),
    };
  }

  if (req.method !== "POST") {
    return {
      status: 405,
      payload: {
        ok: false,
        error: "Method not allowed.",
      },
    };
  }

  const payload = await readJsonBody(req);
  const action = String(payload.action || "").trim();

  if (action === "resetPassword") {
    return issuePasswordResetForUser(req, access.targetUser);
  }

  if (action === "connectTool" || action === "disconnectTool") {
    if (!access.viewingSelf) {
      return {
        status: 403,
        payload: {
          ok: false,
          error: "Tool connections can only be managed by the account owner.",
        },
      };
    }

    const providerId = String(payload.providerId || "").trim().toLowerCase();
    const provider = listVibeProviders().find((entry) => entry.id === providerId);

    if (!provider) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: "Choose a valid tool provider.",
        },
      };
    }

    const currentIntegrations = access.targetUser.integrations || {};
    let accountLabel = action === "connectTool" ? access.targetUser.email : "";
    let connectionType = action === "connectTool" ? "scaffold" : "";

    if (providerId === "codex") {
      if (action === "connectTool") {
        const apiKey = String(payload.apiKey || "").trim();
        const validation = await validateCodexApiKey(apiKey);

        if (!validation.ok) {
          return {
            status: 400,
            payload: {
              ok: false,
              error: validation.error,
            },
          };
        }

        await writeUserIntegrationSecret(access.targetUser.email, providerId, apiKey, {
          providerLabel: provider.label,
        });
        accountLabel = validation.accountLabel;
        connectionType = "api-key";
      } else {
        await deleteUserIntegrationSecret(access.targetUser.email, providerId);
      }
    }

    const nextIntegration = {
      ...(currentIntegrations[providerId] || {}),
      providerId: provider.id,
      label: provider.label,
      credentialMode: provider.credentialMode,
      connectionType,
      connected: action === "connectTool",
      accountLabel,
      connectedAt: action === "connectTool" ? Date.now() : 0,
      lastVerifiedAt: action === "connectTool" ? Date.now() : 0,
    };

    const updatedUser = {
      ...access.targetUser,
      integrations: {
        ...currentIntegrations,
        [providerId]: nextIntegration,
      },
      updatedAt: Date.now(),
    };

    await writeUser(updatedUser.email, updatedUser);
    await recordAuditEvent({
      actorEmail: access.currentUser.email,
      actorRole: access.currentUser.role,
      action: action === "connectTool" ? "profile.connect_tool" : "profile.disconnect_tool",
      resourceType: "tool_provider",
      resourceId: providerId,
      metadata: {
        targetEmail: access.targetUser.email,
        providerLabel: provider.label,
        connectionType,
      },
    });

    const refreshedTargetUser = await readUser(updatedUser.email);
    const refreshedCurrentUser =
      access.viewingSelf || updatedUser.email === access.currentUserEmail
        ? refreshedTargetUser
        : await readUser(access.currentUserEmail);
    const currentUserIsAdmin = normalizeRole(refreshedCurrentUser?.role) === ADMIN_ROLE;

    return {
      status: 200,
      payload: {
        ok: true,
        message:
          action === "connectTool"
            ? providerId === "codex"
              ? `${provider.label} connected and verified.`
              : `${provider.label} connected.`
            : `${provider.label} disconnected.`,
        user: buildUserPayload(refreshedTargetUser),
        currentUser: buildUserPayload(refreshedCurrentUser),
        viewingSelf: access.viewingSelf,
        canManageAllProfiles: currentUserIsAdmin,
        canEditRole: currentUserIsAdmin,
        roles: USER_ROLES,
        toolProviders: listVibeProviders(),
      },
    };
  }

  if (action !== "updateProfile") {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "Unsupported profile action.",
      },
    };
  }

  const firstName = sanitizeName(payload.firstName);
  const lastName = sanitizeName(payload.lastName);
  const nextEmail = normalizeEmail(payload.email);

  if (!firstName || !lastName) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "First and last name are required.",
      },
    };
  }

  if (!isAllowedNuSkinEmail(nextEmail)) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "Use a valid Nu Skin email ending in @nuskin.com or @NuSkin.onmicrosoft.com.",
      },
    };
  }

  let avatarUrl = "";

  try {
    avatarUrl = sanitizeAvatarUrl(payload.avatarUrl);
  } catch (error) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: error instanceof Error ? error.message : "Choose a valid profile photo.",
      },
    };
  }
  const nextRole = access.isAdmin ? normalizeRole(payload.role) || normalizeRole(access.targetUser.role) || USER_ROLES[1] : normalizeRole(access.targetUser.role) || USER_ROLES[1];

  if (access.isAdmin && !nextRole) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "Choose a valid role.",
      },
    };
  }

  if (nextEmail !== access.targetEmail) {
    const existingUser = await readUser(nextEmail);

    if (existingUser) {
      return {
        status: 409,
        payload: {
          ok: false,
          error: "That email is already in use by another account.",
        },
      };
    }
  }

  const currentRole = normalizeRole(access.targetUser.role) || USER_ROLES[1];
  const isLastAdmin = currentRole === ADMIN_ROLE && nextRole !== ADMIN_ROLE && (await countAdmins()) <= 1;

  if (isLastAdmin) {
    return {
      status: 400,
      payload: {
        ok: false,
        error: "You must keep at least one Admin in the application.",
      },
    };
  }

  const updatedUser = {
    ...access.targetUser,
    firstName,
    lastName,
    email: nextEmail,
    avatarUrl,
    role: nextRole,
    updatedAt: Date.now(),
  };

  await writeUser(nextEmail, updatedUser);

  if (nextEmail !== access.targetEmail) {
    await migrateUserIntegrationSecrets(access.targetEmail, nextEmail);
    await migrateSessionsToEmail(access.targetEmail, nextEmail);
    await reassignOwnedProjectsEmail(access.targetEmail, nextEmail);
    await deleteUser(access.targetEmail);
  }

  await migrateCommentAuthorProfile(access.targetEmail, buildUserPayload(updatedUser));
  await recordAuditEvent({
    actorEmail: access.currentUser.email,
    actorRole: access.currentUser.role,
    action: "profile.update_profile",
    resourceType: "user",
    resourceId: nextEmail,
    metadata: {
      previousEmail: access.targetEmail,
      nextEmail,
      previousRole: currentRole,
      nextRole,
      viewingSelf: access.viewingSelf,
    },
  });

  const refreshedTargetUser = await readUser(nextEmail);
  const refreshedCurrentUser =
    access.viewingSelf || nextEmail === access.currentUserEmail
      ? refreshedTargetUser
      : await readUser(access.currentUserEmail);
  const currentUserIsAdmin = normalizeRole(refreshedCurrentUser?.role) === ADMIN_ROLE;

  return {
    status: 200,
    payload: {
      ok: true,
      message: "Profile updated.",
      user: buildUserPayload(refreshedTargetUser),
      currentUser: buildUserPayload(refreshedCurrentUser),
      viewingSelf: access.viewingSelf,
      canManageAllProfiles: currentUserIsAdmin,
      canEditRole: currentUserIsAdmin,
      roles: USER_ROLES,
    },
  };
}

export { sendJson };
