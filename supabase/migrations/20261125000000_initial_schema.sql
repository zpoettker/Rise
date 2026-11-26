-- Rise: initial schema (Stage 4).
--
-- Run once in Supabase → SQL Editor (or `supabase db push`).
--
-- Mirrors the app's saved state (src/lib/logins.js):
--   settings        → profiles.settings (jsonb, the whole settings object)
--   timer           → profiles.timer (jsonb, the running work timer, so it
--                     shows and can be stopped from any device)
--   entries         → wake_logs (one morning log-on per day)
--   workouts        → workouts
--   workSessions    → work_sessions
--   weights         → weights (stored in kg)
--   customLog       → custom_days (kind 'done')
--   customSlips     → custom_days (kind 'slip')
--
-- Times are local wall-clock times like the app uses ('yyyy-MM-ddTHH:mm'),
-- so they're `timestamp` (without time zone): a 7:00 workout stays 7:00.
-- Ids are the app's own string ids, so they're `text`, unique per user.
--
-- Every table has row-level security: an account can only read and write its
-- own rows. The browser uses the publishable key, which can't get past that.

-- ---------------------------------------------------------------------------
-- profiles: one row per account, created automatically on sign-up

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  timer jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tracker data

create table public.wake_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  edited boolean not null default false,
  primary key (user_id, date)
);

create table public.workouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  started_at timestamp not null,
  ended_at timestamp not null check (ended_at > started_at),
  -- for Stage 6 (Strong via the iPhone Shortcut / CSV import)
  source text not null default 'manual',
  external_id text,
  details jsonb,
  primary key (user_id, id)
);

-- a synced workout is only stored once
create unique index workouts_external_id
  on public.workouts (user_id, source, external_id)
  where external_id is not null;

create table public.work_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  started_at timestamp not null,
  ended_at timestamp not null check (ended_at > started_at),
  primary key (user_id, id)
);

create table public.weights (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  at timestamp not null,
  -- full precision, so a weight typed in lb comes back exactly
  kg numeric not null check (kg between 20 and 400),
  primary key (user_id, id)
);

create table public.custom_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('done', 'slip')),
  primary key (user_id, date, kind)
);

-- Stage 6: tokens for the iPhone Shortcut (only a hash is stored)
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'iPhone',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- ---------------------------------------------------------------------------
-- row-level security: each account sees and changes only its own rows

alter table public.profiles enable row level security;
alter table public.wake_logs enable row level security;
alter table public.workouts enable row level security;
alter table public.work_sessions enable row level security;
alter table public.weights enable row level security;
alter table public.custom_days enable row level security;
alter table public.api_tokens enable row level security;

create policy "Own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Own wake logs" on public.wake_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own workouts" on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own work sessions" on public.work_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own weights" on public.weights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own custom days" on public.custom_days
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- tokens can be listed and revoked from the app, but are created by a server
-- function (Stage 6), so there's no insert or update policy
create policy "Own API tokens (read)" on public.api_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Own API tokens (revoke)" on public.api_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));
