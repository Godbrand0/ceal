-- Migration 001: add github_username to profiles + pledge_evidence table
-- Run this in Supabase dashboard → SQL Editor

-- 1. Add github_username column to existing profiles table
alter table profiles
  add column if not exists github_username text;

-- 2. Create pledge_evidence table for AI-verified date confirmations
create table if not exists pledge_evidence (
  id            uuid        primary key default uuid_generate_v4(),
  pledge_id     text        not null,
  address       text        not null,
  evidence_type text        not null check (evidence_type in ('confirm_photo', 'cancel_reason')),
  content       text        not null default '',
  ai_verified   boolean     not null default false,
  ai_confidence numeric(4,3) not null default 0,
  ai_notes      text        not null default '',
  created_at    timestamptz not null default now(),
  unique (pledge_id, address, evidence_type)
);

-- 3. RLS for pledge_evidence
alter table pledge_evidence enable row level security;

create policy "pledge_evidence: anon insert"
  on pledge_evidence for insert to anon with check (true);

create policy "pledge_evidence: public read"
  on pledge_evidence for select to anon using (true);
