-- ============================================================
-- CEAL — Supabase Schema
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: off-chain mirror of on-chain ProfileNFT
create table if not exists profiles (
  address             text primary key,        -- lowercase 0x wallet address
  name                text        not null,
  bio                 text        not null default '',
  age                 integer     not null check (age >= 18 and age <= 99),
  city                text        not null default '',
  photos              text[]      not null default '{}',  -- IPFS URIs
  token_id            integer,                 -- on-chain tokenId, set after mint confirms
  is_verified         boolean     not null default false,
  talent_profile_id   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- swipes: records every like / pass
create table if not exists swipes (
  id          uuid        primary key default uuid_generate_v4(),
  swiper      text        not null,   -- lowercase address
  swiped      text        not null,   -- lowercase address
  direction   text        not null check (direction in ('like', 'pass')),
  created_at  timestamptz not null default now(),
  unique (swiper, swiped)             -- one swipe per pair
);

-- matches: off-chain record of on-chain MatchNFT mints
create table if not exists matches (
  id           text        primary key,  -- on-chain matchId (bigint as text)
  user1        text        not null,     -- lowercase address
  user2        text        not null,     -- lowercase address
  matched_at   timestamptz not null default now(),
  last_message text
);

-- messages: chat messages per match
create table if not exists messages (
  id          uuid        primary key default uuid_generate_v4(),
  match_id    text        not null references matches(id) on delete cascade,
  sender      text        not null,   -- lowercase address
  content     text        not null default '',
  gift_data   jsonb,                  -- { gift_type, amount, tx_hash } or null
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- profile lookups are always by address (already primary key, no extra index needed)

-- swipe queries: "has A swiped B?" and "get all swipes by A"
create index if not exists idx_swipes_swiper         on swipes(swiper);
create index if not exists idx_swipes_swiped         on swipes(swiped);
create index if not exists idx_swipes_mutual         on swipes(swiper, swiped, direction);

-- match lookups: "get all matches for a user"
create index if not exists idx_matches_user1         on matches(user1);
create index if not exists idx_matches_user2         on matches(user2);

-- message queries: always ordered by created_at within a match
create index if not exists idx_messages_match_time   on messages(match_id, created_at asc);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ============================================================
-- LAST MESSAGE TRIGGER
-- Keeps matches.last_message in sync when a new message is inserted
-- ============================================================

create or replace function update_last_message()
returns trigger language plpgsql as $$
begin
  update matches
  set last_message = new.content
  where id = new.match_id;
  return new;
end;
$$;

drop trigger if exists trg_update_last_message on messages;
create trigger trg_update_last_message
  after insert on messages
  for each row execute procedure update_last_message();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- We use wallet addresses for identity, not Supabase Auth.
-- Anon key is used client-side. Policies below are permissive
-- for MVP — tighten in production with a signing challenge.

alter table profiles  enable row level security;
alter table swipes    enable row level security;
alter table matches   enable row level security;
alter table messages  enable row level security;

-- profiles: anyone can read; any anon can insert/update (wallet = owner)
create policy "profiles: public read"
  on profiles for select to anon using (true);

create policy "profiles: anon insert"
  on profiles for insert to anon with check (true);

create policy "profiles: anon update"
  on profiles for update to anon using (true);

-- swipes: anon can insert their own; can read swipes where they are swiped
-- (needed for mutual-like check)
create policy "swipes: anon insert"
  on swipes for insert to anon with check (true);

create policy "swipes: read relevant"
  on swipes for select to anon using (true);

-- matches: anon can insert (oracle writes after on-chain mint); read own matches
create policy "matches: anon insert"
  on matches for insert to anon with check (true);

create policy "matches: public read"
  on matches for select to anon using (true);

create policy "matches: anon update"
  on matches for update to anon using (true);

-- messages: anon can insert and read messages in any match
create policy "messages: anon insert"
  on messages for insert to anon with check (true);

create policy "messages: public read"
  on messages for select to anon using (true);

-- ============================================================
-- REALTIME
-- Enable Realtime on messages so chat updates instantly
-- ============================================================

-- Run this in Supabase dashboard → Database → Replication
-- or uncomment below (requires superuser):
--
-- alter publication supabase_realtime add table messages;
-- alter publication supabase_realtime add table matches;

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- leaderboard: top profiles by total gifts received
create or replace view gift_leaderboard as
select
  m.content as gift_json,
  count(*)   as gift_count,
  sum((m.gift_data->>'amount')::numeric) as total_cusd
from messages m
where m.gift_data is not null
group by m.gift_json
order by total_cusd desc nulls last;

-- ============================================================
-- DONE
-- ============================================================
