import { ensureDurableStoreAvailable } from "./db/config.js";
import { canUsePostgresPermissionStore, listRolePermissionRecords, writeRolePermissionRecord } from "./db/permissions.js";
import { DEFAULT_ROLE, USER_ROLES, normalizeRole } from "./roles.js";

const ROLE_PERMISSION_STORE_KEY = "__uxBridgeRolePermissions__";
const ROLE_PERMISSION_CACHE_KEY = "__uxBridgeRolePermissionsCache__";
const ROLE_PERMISSION_CACHE_TTL_MS = 5000;

export const ROLE_PERMISSION_DEFINITIONS = [
  {
    key: "projects.create",
    group: "Projects",
    label: "Create projects",
    description: "Create brand new projects from the Projects page.",
  },
  {
    key: "projects.duplicate",
    group: "Projects",
    label: "Duplicate projects",
    description: "Duplicate existing projects into new drafts.",
  },
  {
    key: "projects.access_all",
    group: "Projects",
    label: "Access all projects",
    description: "Open and collaborate across every project without being explicitly added.",
  },
  {
    key: "projects.manage_sharing_all",
    group: "Projects",
    label: "Manage sharing on all projects",
    description: "Update privacy, invites, access requests, and Codex sharing controls across all projects.",
  },
  {
    key: "projects.manage_identity_all",
    group: "Projects",
    label: "Manage project identity on all projects",
    description: "Rename, transfer ownership, and delete any project.",
  },
  {
    key: "comments.delete_any",
    group: "Comments",
    label: "Delete any comment",
    description: "Remove comments written by other users.",
  },
  {
    key: "assets.delete_any",
    group: "Files",
    label: "Delete any file",
    description: "Remove uploaded assets added by other users.",
  },
];

const DEFAULT_ROLE_PERMISSION_MAP = {
  Admin: ROLE_PERMISSION_DEFINITIONS.map((definition) => definition.key),
  Designer: [
    "projects.create",
    "projects.duplicate",
    "projects.access_all",
    "projects.manage_sharing_all",
  ],
  "Product Owner": [],
  Developer: [],
  "View Only": [],
};

function getPermissionStore() {
  if (!globalThis[ROLE_PERMISSION_STORE_KEY]) {
    globalThis[ROLE_PERMISSION_STORE_KEY] = new Map();
  }

  return globalThis[ROLE_PERMISSION_STORE_KEY];
}

function getPermissionCache() {
  const entry = globalThis[ROLE_PERMISSION_CACHE_KEY] || null;

  if (!entry || Number(entry.expiresAt) <= Date.now()) {
    return null;
  }

  return entry.value;
}

function setPermissionCache(value) {
  globalThis[ROLE_PERMISSION_CACHE_KEY] = {
    value,
    expiresAt: Date.now() + ROLE_PERMISSION_CACHE_TTL_MS,
  };
}

function validPermissionKeys() {
  return new Set(ROLE_PERMISSION_DEFINITIONS.map((definition) => definition.key));
}

function isMissingRolePermissionTableError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.toLowerCase().includes("ux_role_permissions");
}

function normalizePermissionList(values) {
  const keys = validPermissionKeys();
  const unique = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const normalizedValue = String(value || "").trim();

    if (keys.has(normalizedValue)) {
      unique.add(normalizedValue);
    }
  }

  return Array.from(unique);
}

export function buildDefaultRolePermissionMap() {
  return USER_ROLES.reduce((result, role) => {
    result[role] = normalizePermissionList(DEFAULT_ROLE_PERMISSION_MAP[role] || []);
    return result;
  }, {});
}

export function normalizeRolePermissionMap(input) {
  const source = input && typeof input === "object" ? input : {};

  return USER_ROLES.reduce((result, role) => {
    result[role] = normalizePermissionList(source[role] || []);
    return result;
  }, {});
}

export async function readRolePermissionMap() {
  const cached = getPermissionCache();

  if (cached) {
    return cached;
  }

  const defaults = buildDefaultRolePermissionMap();

  if (canUsePostgresPermissionStore()) {
    try {
      const rows = await listRolePermissionRecords();

      if (rows.length) {
        const next = { ...defaults };

        for (const row of rows) {
          const role = normalizeRole(row.role);

          if (!role) {
            continue;
          }

          next[role] = normalizePermissionList(row.permissions);
        }

        setPermissionCache(next);
        return next;
      }
    } catch (error) {
      if (!isMissingRolePermissionTableError(error)) {
        throw error;
      }
    }
  }

  const memoryStore = getPermissionStore();

  if (memoryStore.size) {
    const next = { ...defaults };

    USER_ROLES.forEach((role) => {
      next[role] = normalizePermissionList(memoryStore.get(role));
    });
    setPermissionCache(next);
    return next;
  }

  setPermissionCache(defaults);
  return defaults;
}

export async function writeRolePermissionMap(input) {
  ensureDurableStoreAvailable("role permissions");
  const next = normalizeRolePermissionMap(input);

  if (canUsePostgresPermissionStore()) {
    try {
      await Promise.all(USER_ROLES.map((role) => writeRolePermissionRecord(role, next[role], Date.now())));
    } catch (error) {
      if (!isMissingRolePermissionTableError(error)) {
        throw error;
      }

      const memoryStore = getPermissionStore();
      memoryStore.clear();
      USER_ROLES.forEach((role) => {
        memoryStore.set(role, next[role]);
      });
    }
  } else {
    const memoryStore = getPermissionStore();
    memoryStore.clear();
    USER_ROLES.forEach((role) => {
      memoryStore.set(role, next[role]);
    });
  }

  setPermissionCache(next);
  return next;
}

export async function resetRolePermissionMap() {
  return writeRolePermissionMap(buildDefaultRolePermissionMap());
}

export async function roleHasPermission(role, permissionKey, rolePermissionMap = null) {
  const normalizedRole = normalizeRole(role) || DEFAULT_ROLE;
  const permissions = rolePermissionMap || (await readRolePermissionMap());
  return Array.isArray(permissions[normalizedRole]) && permissions[normalizedRole].includes(String(permissionKey || "").trim());
}

export async function userHasPermission(user, permissionKey, rolePermissionMap = null) {
  return roleHasPermission(user?.role, permissionKey, rolePermissionMap);
}

export function getRolePermissionCatalog() {
  return ROLE_PERMISSION_DEFINITIONS.map((definition) => ({ ...definition }));
}
