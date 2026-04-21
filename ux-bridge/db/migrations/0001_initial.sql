create extension if not exists pgcrypto;

create table if not exists ux_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  role text not null,
  avatar_url text not null default '',
  avatar_color text not null default '',
  integrations jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ux_projects (
  id text primary key,
  name text not null,
  owner_email text not null,
  description text not null default '',
  visibility text not null default 'private',
  sharing_mode text not null default 'invited',
  codex_access_mode text not null default 'contributors',
  codex_context_id text not null,
  share_token text not null,
  design_tokens jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  thumbnail_data_url text not null default '',
  thumbnail_source_url text not null default '',
  thumbnail_updated_at bigint not null default 0,
  thumbnail_refreshed_at bigint not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists ux_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references ux_projects(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null,
  added_by text not null default '',
  joined_at bigint not null default 0,
  invited_at bigint not null default 0,
  requested_at bigint not null default 0,
  unique(project_id, email)
);

create table if not exists ux_pages (
  id text not null,
  project_id text not null references ux_projects(id) on delete cascade,
  name text not null,
  file_slug text not null default '',
  launch_url text not null default '',
  has_content boolean not null default false,
  created_at bigint not null default 0,
  sort_order bigint not null default 0,
  preview jsonb,
  vibe jsonb,
  files jsonb,
  page_lock jsonb,
  primary key (project_id, id)
);

create table if not exists ux_prototype_links (
  id text primary key,
  project_id text not null references ux_projects(id) on delete cascade,
  label text not null,
  url text not null,
  page_id text not null default '',
  created_by text not null default '',
  created_at bigint not null default 0
);

create table if not exists ux_edit_sessions (
  id text primary key,
  project_id text not null references ux_projects(id) on delete cascade,
  user_id text not null,
  page_id text not null default '',
  session_codex_thread_id text not null,
  branch_name text not null,
  worktree_path text not null default '',
  base_branch text not null default 'main',
  execution_mode text not null default 'metadata-only',
  status text not null,
  source text not null default 'scaffold',
  merged_at bigint not null default 0,
  last_git_error text not null default '',
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists ux_page_locks (
  id text primary key,
  project_id text not null references ux_projects(id) on delete cascade,
  page_id text not null,
  locked_by text not null,
  session_id text not null,
  mode text not null default 'soft',
  acquired_at bigint not null,
  expires_at bigint not null
);

create table if not exists ux_comments (
  id text primary key,
  project_id text not null references ux_projects(id) on delete cascade,
  page_id text not null,
  payload jsonb not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

create table if not exists ux_comment_views (
  project_id text not null references ux_projects(id) on delete cascade,
  page_id text not null,
  email text not null,
  last_seen_comment_id text not null default '',
  last_seen_at bigint not null default 0,
  updated_at bigint not null default 0,
  primary key (project_id, page_id, email)
);

create table if not exists ux_assets (
  id text primary key,
  project_id text not null references ux_projects(id) on delete cascade,
  page_id text not null,
  comment_id text not null default '',
  uploaded_by text not null default '',
  file_name text not null default '',
  kind text not null default 'file',
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  blob_pathname text not null default '',
  blob_url text not null default '',
  blob_download_url text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

create table if not exists ux_user_integration_secrets (
  email text not null,
  provider_id text not null,
  encrypted_secret text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  primary key (email, provider_id)
);

create table if not exists ux_auth_sessions (
  session_id text primary key,
  email text not null,
  expires_at bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

create table if not exists ux_password_reset_tokens (
  token text primary key,
  email text not null,
  expires_at bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

create table if not exists ux_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  resource_type text not null default '',
  resource_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at bigint not null default 0
);

create table if not exists ux_operational_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level text not null default 'info',
  context jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  created_at bigint not null default 0
);

create table if not exists ux_role_permissions (
  role text primary key,
  permissions jsonb not null default '[]'::jsonb,
  updated_at bigint not null default 0
);

alter table ux_users add column if not exists payload jsonb not null default '{}'::jsonb;
alter table ux_projects add column if not exists payload jsonb not null default '{}'::jsonb;
alter table ux_pages alter column sort_order type bigint using sort_order::bigint;

create index if not exists ux_project_members_project_id_idx on ux_project_members(project_id);
create index if not exists ux_pages_project_id_sort_order_idx on ux_pages(project_id, sort_order);
create index if not exists ux_edit_sessions_project_id_idx on ux_edit_sessions(project_id);
create index if not exists ux_page_locks_project_id_page_id_idx on ux_page_locks(project_id, page_id);
create index if not exists ux_comments_project_id_page_id_idx on ux_comments(project_id, page_id);
create index if not exists ux_comment_views_email_project_id_idx on ux_comment_views(email, project_id);
create index if not exists ux_assets_project_id_page_id_created_at_idx on ux_assets(project_id, page_id, created_at desc);
create index if not exists ux_assets_project_id_created_at_idx on ux_assets(project_id, created_at desc);
create index if not exists ux_assets_comment_id_idx on ux_assets(comment_id);
create index if not exists ux_user_integration_secrets_email_idx on ux_user_integration_secrets(email);
create index if not exists ux_auth_sessions_email_idx on ux_auth_sessions(email);
create index if not exists ux_password_reset_tokens_email_idx on ux_password_reset_tokens(email);
create index if not exists ux_audit_events_created_at_idx on ux_audit_events(created_at desc);
create index if not exists ux_operational_events_created_at_idx on ux_operational_events(created_at desc);
