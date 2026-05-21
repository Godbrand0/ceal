-- ============================================================
-- CEAL — Migration 006: role column
-- Run this in the Supabase SQL Editor if you already have the
-- base schema applied. If starting fresh, update schema.sql.
-- ============================================================

alter table profiles
  add column if not exists role text default null;

-- ============================================================
-- DONE
-- ============================================================
