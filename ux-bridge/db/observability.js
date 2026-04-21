import { getPostgresClient, isPostgresConfigured } from "./postgres.js";

function asBigIntString(value, fallback = 0) {
  const numeric = Number(value);
  return String(Number.isFinite(numeric) ? Math.trunc(numeric) : fallback);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function sanitizeJson(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function readAuditEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: normalizeText(row.id),
    actorEmail: normalizeEmail(row.actor_email),
    actorRole: normalizeText(row.actor_role),
    action: normalizeText(row.action),
    resourceType: normalizeText(row.resource_type),
    resourceId: normalizeText(row.resource_id),
    metadata: sanitizeJson(row.metadata),
    createdAt: Number(row.created_at || 0),
  };
}

function readOperationalEvent(row) {
  if (!row) {
    return null;
  }

  return {
    id: normalizeText(row.id),
    name: normalizeText(row.name),
    level: normalizeText(row.level || "info"),
    context: sanitizeJson(row.context),
    errorMessage: normalizeText(row.error_message),
    createdAt: Number(row.created_at || 0),
  };
}

export function canUseObservabilityStore() {
  return isPostgresConfigured();
}

export async function recordAuditEvent(event = {}) {
  if (!canUseObservabilityStore()) {
    console.info("[audit:event]", event);
    return;
  }

  const sql = getPostgresClient();
  const now = Date.now();
  const payload = sanitizeJson(event.metadata);

  await sql`
    insert into ux_audit_events (
      actor_email,
      actor_role,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at
    ) values (
      ${normalizeEmail(event.actorEmail)},
      ${normalizeText(event.actorRole)},
      ${normalizeText(event.action)},
      ${normalizeText(event.resourceType)},
      ${normalizeText(event.resourceId)},
      ${sql.json(payload)},
      ${asBigIntString(event.createdAt, now)}::bigint
    )
  `;
}

export async function captureOperationalEvent(event = {}) {
  if (!canUseObservabilityStore()) {
    console.info("[ops:event]", event);
    return;
  }

  const sql = getPostgresClient();
  const now = Date.now();
  const context = sanitizeJson(event.context);

  await sql`
    insert into ux_operational_events (
      name,
      level,
      context,
      error_message,
      created_at
    ) values (
      ${normalizeText(event.name)},
      ${normalizeText(event.level || "info")},
      ${sql.json(context)},
      ${normalizeText(event.errorMessage)},
      ${asBigIntString(event.createdAt, now)}::bigint
    )
  `;
}

export async function listRecentAuditEvents(limit = 20) {
  if (!canUseObservabilityStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select id, actor_email, actor_role, action, resource_type, resource_id, metadata, created_at
    from ux_audit_events
    order by created_at desc, id desc
    limit ${Math.max(1, Math.min(Number(limit) || 20, 100))}
  `;

  return rows.map((row) => readAuditEvent(row)).filter(Boolean);
}

export async function listRecentOperationalEvents(limit = 20) {
  if (!canUseObservabilityStore()) {
    return [];
  }

  const sql = getPostgresClient();
  const rows = await sql`
    select id, name, level, context, error_message, created_at
    from ux_operational_events
    order by created_at desc, id desc
    limit ${Math.max(1, Math.min(Number(limit) || 20, 100))}
  `;

  return rows.map((row) => readOperationalEvent(row)).filter(Boolean);
}
