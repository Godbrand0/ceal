-- Migration 002: add on_chain_match_id to matches table
-- Run this in Supabase dashboard → SQL Editor

alter table matches
  add column if not exists on_chain_match_id text;

create index if not exists idx_matches_on_chain_id on matches(on_chain_match_id);
