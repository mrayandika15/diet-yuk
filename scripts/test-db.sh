#!/usr/bin/env bash
set -euo pipefail
# Needs local PostgreSQL and psql. Uses an isolated DB, never the linked Supabase.
name="diet_yuk_test_$(date +%s)_$$"
psql postgres -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
 ALTER ROLE service_role BYPASSRLS;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
END $$;
SQL
createdb "$name"
trap 'dropdb "$name"' EXIT
psql "$name" -v ON_ERROR_STOP=1 -f tests/database.sql
