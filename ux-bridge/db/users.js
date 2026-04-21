import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toTimestamp(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date();
}

function asBigIntString(value, fallback = 0) {
  const numeric = Number(value);
  return String(Number.isFinite(numeric) ? Math.trunc(numeric) : fallback);
}

function readUserPayload(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    ...payload,
    email: normalizeEmail(payload.email || row.email),
  };
}

export function canUsePostgresUserStore() {
  return isPostgresConfigured();
}

export function canUsePostgresAuthStore() {
  return isPostgresConfigured();
}

export async function readUserRecord(email) {
  if (!canUsePostgresUserStore()) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select email, payload
    from ux_users
    where email = ${normalizedEmail}
    limit 1
  `;
  return readUserPayload(rows[0]);
}

export async function writeUserRecord(user) {
  if (!canUsePostgresUserStore()) {
    return;
  }

  const normalizedEmail = normalizeEmail(user?.email);

  if (!normalizedEmail) {
    return;
  }

  const payload = {
    ...(user && typeof user === "object" ? user : {}),
    email: normalizedEmail,
  };
  const sql = getPostgresClient();

  await sql`
    insert into ux_users (
      email,
      first_name,
      last_name,
      role,
      avatar_url,
      avatar_color,
      integrations,
      payload,
      created_at,
      updated_at
    ) values (
      ${normalizedEmail},
      ${String(payload.firstName || "").trim()},
      ${String(payload.lastName || "").trim()},
      ${String(payload.role || "").trim()},
      ${String(payload.avatarUrl || "").trim()},
      ${String(payload.avatarColor || "").trim()},
      ${sql.json(payload.integrations || {})},
      ${sql.json(payload)},
      ${toTimestamp(payload.createdAt)},
      ${toTimestamp(payload.updatedAt || payload.createdAt)}
    )
    on conflict (email) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      role = excluded.role,
      avatar_url = excluded.avatar_url,
      avatar_color = excluded.avatar_color,
      integrations = excluded.integrations,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

export async function deleteUserRecord(email) {
  if (!canUsePostgresUserStore()) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return;
  }

  const sql = getPostgresClient();
  await sql`delete from ux_users where email = ${normalizedEmail}`;
}

export async function listUserRecords() {
  if (!canUsePostgresUserStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select email, payload
    from ux_users
    order by created_at asc, email asc
  `;

  return rows.map((row) => readUserPayload(row)).filter(Boolean);
}

export async function readIntegrationSecretRecord(email, providerId) {
  if (!canUsePostgresUserStore()) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedProviderId = String(providerId || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProviderId) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select encrypted_secret, payload
    from ux_user_integration_secrets
    where email = ${normalizedEmail} and provider_id = ${normalizedProviderId}
    limit 1
  `;
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...(row.payload && typeof row.payload === "object" ? row.payload : {}),
    encryptedSecret: String(row.encrypted_secret || ""),
  };
}

export async function writeIntegrationSecretRecord(email, providerId, record) {
  if (!canUsePostgresUserStore()) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedProviderId = String(providerId || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProviderId) {
    return;
  }

  const payload = record && typeof record === "object" ? { ...record } : {};
  const encryptedSecret = String(payload.encryptedSecret || "").trim();
  const updatedAt = Number(payload.updatedAt) || Date.now();
  const sql = getPostgresClient();

  await sql`
    insert into ux_user_integration_secrets (
      email,
      provider_id,
      encrypted_secret,
      payload,
      updated_at
    ) values (
      ${normalizedEmail},
      ${normalizedProviderId},
      ${encryptedSecret},
      ${sql.json(payload)},
      ${asBigIntString(updatedAt, Date.now())}::bigint
    )
    on conflict (email, provider_id) do update set
      encrypted_secret = excluded.encrypted_secret,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

export async function deleteIntegrationSecretRecord(email, providerId) {
  if (!canUsePostgresUserStore()) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedProviderId = String(providerId || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedProviderId) {
    return;
  }

  const sql = getPostgresClient();
  await sql`
    delete from ux_user_integration_secrets
    where email = ${normalizedEmail} and provider_id = ${normalizedProviderId}
  `;
}

function readSessionPayload(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    ...payload,
    sessionId: String(payload.sessionId || row.session_id || "").trim(),
    email: normalizeEmail(payload.email || row.email),
    expiresAt: Number(payload.expiresAt || row.expires_at || 0),
  };
}

export async function readAuthSessionRecord(sessionId) {
  if (!canUsePostgresAuthStore()) {
    return null;
  }

  const normalizedSessionId = String(sessionId || "").trim();

  if (!normalizedSessionId) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select session_id, email, expires_at, payload
    from ux_auth_sessions
    where session_id = ${normalizedSessionId}
    limit 1
  `;

  return readSessionPayload(rows[0]);
}

export async function listAuthSessionRecordsForEmail(email) {
  if (!canUsePostgresAuthStore()) {
    return [];
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select session_id, email, expires_at, payload
    from ux_auth_sessions
    where email = ${normalizedEmail}
    order by created_at asc, session_id asc
  `;

  return rows.map((row) => readSessionPayload(row)).filter(Boolean);
}

export async function writeAuthSessionRecord(sessionId, record) {
  if (!canUsePostgresAuthStore()) {
    return;
  }

  const normalizedSessionId = String(sessionId || "").trim();
  const normalizedEmail = normalizeEmail(record?.email);

  if (!normalizedSessionId || !normalizedEmail) {
    return;
  }

  const payload = {
    ...(record && typeof record === "object" ? record : {}),
    sessionId: normalizedSessionId,
    email: normalizedEmail,
  };
  const now = Date.now();
  const createdAt = Number(payload.createdAt) || now;
  const updatedAt = Number(payload.updatedAt) || now;
  const expiresAt = Number(payload.expiresAt) || now;
  const sql = getPostgresClient();

  await sql`
    insert into ux_auth_sessions (
      session_id,
      email,
      expires_at,
      payload,
      created_at,
      updated_at
    ) values (
      ${normalizedSessionId},
      ${normalizedEmail},
      ${asBigIntString(expiresAt, now)}::bigint,
      ${sql.json(payload)},
      ${asBigIntString(createdAt, now)}::bigint,
      ${asBigIntString(updatedAt, now)}::bigint
    )
    on conflict (session_id) do update set
      email = excluded.email,
      expires_at = excluded.expires_at,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

export async function deleteAuthSessionRecord(sessionId) {
  if (!canUsePostgresAuthStore()) {
    return;
  }

  const normalizedSessionId = String(sessionId || "").trim();

  if (!normalizedSessionId) {
    return;
  }

  const sql = getPostgresClient();
  await sql`delete from ux_auth_sessions where session_id = ${normalizedSessionId}`;
}

export async function deleteAuthSessionsForEmail(email) {
  if (!canUsePostgresAuthStore()) {
    return;
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return;
  }

  const sql = getPostgresClient();
  await sql`delete from ux_auth_sessions where email = ${normalizedEmail}`;
}

function readResetPayload(row) {
  if (!row) {
    return null;
  }

  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    ...payload,
    token: String(payload.token || row.token || "").trim(),
    email: normalizeEmail(payload.email || row.email),
    expiresAt: Number(payload.expiresAt || row.expires_at || 0),
  };
}

export async function readPasswordResetTokenRecord(token) {
  if (!canUsePostgresAuthStore()) {
    return null;
  }

  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    return null;
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select token, email, expires_at, payload
    from ux_password_reset_tokens
    where token = ${normalizedToken}
    limit 1
  `;

  return readResetPayload(rows[0]);
}

export async function writePasswordResetTokenRecord(token, record) {
  if (!canUsePostgresAuthStore()) {
    return;
  }

  const normalizedToken = String(token || "").trim();
  const normalizedEmail = normalizeEmail(record?.email);

  if (!normalizedToken || !normalizedEmail) {
    return;
  }

  const payload = {
    ...(record && typeof record === "object" ? record : {}),
    token: normalizedToken,
    email: normalizedEmail,
  };
  const now = Date.now();
  const createdAt = Number(payload.createdAt) || now;
  const updatedAt = Number(payload.updatedAt) || now;
  const expiresAt = Number(payload.expiresAt) || now;
  const sql = getPostgresClient();

  await sql`
    insert into ux_password_reset_tokens (
      token,
      email,
      expires_at,
      payload,
      created_at,
      updated_at
    ) values (
      ${normalizedToken},
      ${normalizedEmail},
      ${asBigIntString(expiresAt, now)}::bigint,
      ${sql.json(payload)},
      ${asBigIntString(createdAt, now)}::bigint,
      ${asBigIntString(updatedAt, now)}::bigint
    )
    on conflict (token) do update set
      email = excluded.email,
      expires_at = excluded.expires_at,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `;
}

export async function deletePasswordResetTokenRecord(token) {
  if (!canUsePostgresAuthStore()) {
    return;
  }

  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    return;
  }

  const sql = getPostgresClient();
  await sql`delete from ux_password_reset_tokens where token = ${normalizedToken}`;
}

export async function listIntegrationSecretRecords() {
  if (!canUsePostgresUserStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select email, provider_id, encrypted_secret, payload, updated_at
    from ux_user_integration_secrets
    order by email asc, provider_id asc
  `;

  return rows.map((row) => ({
    ...(row.payload && typeof row.payload === "object" ? row.payload : {}),
    email: normalizeEmail(row.email),
    providerId: String(row.provider_id || "").trim().toLowerCase(),
    encryptedSecret: String(row.encrypted_secret || ""),
    updatedAt: Number(row.updated_at || 0),
  }));
}

export async function listAuthSessionRecords() {
  if (!canUsePostgresAuthStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select session_id, email, expires_at, payload
    from ux_auth_sessions
    order by created_at asc, session_id asc
  `;

  return rows.map((row) => readSessionPayload(row)).filter(Boolean);
}

export async function listPasswordResetTokenRecords() {
  if (!canUsePostgresAuthStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select token, email, expires_at, payload
    from ux_password_reset_tokens
    order by created_at asc, token asc
  `;

  return rows.map((row) => readResetPayload(row)).filter(Boolean);
}
