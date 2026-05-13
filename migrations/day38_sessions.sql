-- DAY 38: Session management + Postgres logout fallback
-- Run against your Supabase database via the SQL editor.

-- Add logout timestamp fallback for when Redis is unavailable.
-- When a user logs out and Redis is not configured, this column is stamped
-- with the logout time. The auth middleware checks it on every request.
ALTER TABLE users ADD COLUMN IF NOT EXISTS logged_out_at TIMESTAMPTZ NULL;

-- Add device tracking to refresh_tokens so users can see and revoke sessions.
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_name TEXT NULL;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
