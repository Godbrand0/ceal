-- ============================================================
-- CEAL — Gender & Interests Schema Patch
-- Run this in the Supabase SQL Editor if you already have the
-- base schema applied. If starting fresh, use schema.sql instead
-- (it already includes these columns).
-- ============================================================

alter table profiles
  add column if not exists gender    text    default null,
  add column if not exists interests text[]  not null default '{}';

-- ============================================================
-- DONE
-- ============================================================
