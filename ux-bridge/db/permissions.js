import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function normalizeRoleKey(value) {
  return String(value || "").trim();
}

export function canUsePostgresPermissionStore() {
  return isPostgresConfigured();
}

export async function listRolePermissionRecords() {
  if (!canUsePostgresPermissionStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select role, permissions, updated_at
    from ux_role_permissions
    order by role asc
  `;

  return rows.map((row) => ({
    role: normalizeRoleKey(row.role),
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    updatedAt: Number(row.updated_at) || 0,
  }));
}

export async function writeRolePermissionRecord(role, permissions, updatedAt = Date.now()) {
  if (!canUsePostgresPermissionStore()) {
    return;
  }

  const normalizedRole = normalizeRoleKey(role);

  if (!normalizedRole) {
    return;
  }

  const sql = getPostgresClient();
  await sql`
    insert into ux_role_permissions (
      role,
      permissions,
      updated_at
    ) values (
      ${normalizedRole},
      ${sql.json(Array.isArray(permissions) ? permissions : [])},
      ${String(Number(updatedAt) || Date.now())}::bigint
    )
    on conflict (role) do update set
      permissions = excluded.permissions,
      updated_at = excluded.updated_at
  `;
}
