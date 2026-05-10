-- Supabase schema for Alarm Roulette
-- Drop existing tables in reverse dependency order
drop table if exists alarms cascade;
drop table if exists ringtones cascade;
drop table if exists group_members cascade;
drop table if exists friend_groups cascade;
drop table if exists friends cascade;
drop table if exists profiles cascade;

create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  full_name   text,
  email       text,
  avatar_url  text,
  friend_code text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at  timestamptz not null default now()
);

-- ─── Friends (flat pairs, not groups) ────────────────────────────────────────
create table friends (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  friend_id  uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id)
);

-- ─── Ringtones ────────────────────────────────────────────────────────────────
create table ringtones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  file_path   text not null,
  created_at  timestamptz not null default now()
);

-- ─── Alarms ──────────────────────────────────────────────────────────────────
create table alarms (
  id               uuid primary key default gen_random_uuid(),
  setter_id        uuid references auth.users(id) on delete cascade not null,
  target_id        uuid references auth.users(id) on delete cascade not null,
  scheduled_at     timestamptz not null,
  repeat_weekdays  int[] default null,
  enabled          boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table profiles  enable row level security;
alter table friends   enable row level security;
alter table ringtones enable row level security;
alter table alarms    enable row level security;

-- Profiles
create policy "select own profile"   on profiles for select using (auth.uid() = user_id);
create policy "insert own profile"   on profiles for insert with check (auth.uid() = user_id);
create policy "update own profile"   on profiles for update using (auth.uid() = user_id);

-- Profiles: allow looking up by friend_code (needed for AddFriend)
create policy "select profile by friend_code" on profiles
  for select using (true);  -- profiles are non-sensitive; tighten if needed

-- Friends
create policy "select own friends" on friends
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "insert own friends" on friends
  for insert with check (auth.uid() = user_id);

create policy "delete own friends" on friends
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Ringtones: visible to friends
create policy "select own ringtones" on ringtones
  for select using (
    auth.uid() = user_id or
    auth.uid() in (
      select user_id from friends where friend_id = ringtones.user_id
      union
      select friend_id from friends where user_id = ringtones.user_id
    )
  );

create policy "insert own ringtones" on ringtones
  for insert with check (auth.uid() = user_id);

create policy "update own ringtones" on ringtones
  for update using (auth.uid() = user_id);

create policy "delete own ringtones" on ringtones
  for delete using (auth.uid() = user_id);

-- Alarms
create policy "select own alarms" on alarms
  for select using (auth.uid() = setter_id or auth.uid() = target_id);

create policy "insert own alarms" on alarms
  for insert with check (auth.uid() = setter_id);

create policy "update own alarms" on alarms
  for update using (auth.uid() = setter_id);

create policy "delete own alarms" on alarms
  for delete using (auth.uid() = setter_id);

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
