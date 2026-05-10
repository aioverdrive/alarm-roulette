-- Supabase schema for Alarm Roulette user data

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null unique,
  full_name text,
  email text,
  avatar_url text,
  friend_code text unique not null,
  created_at timestamptz not null default now()
);

create table friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  friend_id uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  unique(user_id, friend_id),
  constraint friends_different_users check (user_id != friend_id)
);

create table ringtones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  file_path text not null, -- Supabase Storage path
  created_at timestamptz not null default now()
);

create table alarms (
  id uuid primary key default gen_random_uuid(),
  setter_id uuid references auth.users(id) not null,
  target_id uuid references auth.users(id) not null,
  ringtone_id uuid references ringtones(id) not null,
  scheduled_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint alarms_different_users check (setter_id != target_id)
);

-- Enable RLS
alter table profiles enable row level security;
alter table friends enable row level security;
alter table ringtones enable row level security;
alter table alarms enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users can view any profile (for friend code lookup)" on profiles
  for select using (true);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = user_id);

-- Policies for friends
create policy "Users can view their friends" on friends
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can add friends" on friends
  for insert with check (auth.uid() = user_id);

create policy "Users can remove friendships" on friends
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Policies for ringtones
create policy "Users can view their own ringtones" on ringtones
  for select using (auth.uid() = user_id);

create policy "Users can view ringtones of friends" on ringtones
  for select using (
    auth.uid() in (
      select user_id from friends where friend_id = ringtones.user_id
      union
      select friend_id from friends where user_id = ringtones.user_id
    )
  );

create policy "Users can insert their own ringtones" on ringtones
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own ringtones" on ringtones
  for update using (auth.uid() = user_id);

create policy "Users can delete their own ringtones" on ringtones
  for delete using (auth.uid() = user_id);

-- Policies for alarms
create policy "Users can view alarms they are involved in" on alarms
  for select using (auth.uid() = setter_id or auth.uid() = target_id);

create policy "Users can set alarms for their friends" on alarms
  for insert with check (
    auth.uid() = setter_id and
    exists (
      select 1 from friends
      where (user_id = auth.uid() and friend_id = target_id)
         or (user_id = target_id and friend_id = auth.uid())
    )
  );

create policy "Users can update their own alarms" on alarms
  for update using (auth.uid() = setter_id);

create policy "Users can delete their own alarms" on alarms
  for delete using (auth.uid() = setter_id);

-- Create indexes for better performance
create index idx_profiles_user_id on profiles(user_id);
create index idx_profiles_friend_code on profiles(friend_code);
create index idx_friends_user_id on friends(user_id);
create index idx_friends_friend_id on friends(friend_id);
create index idx_ringtones_user_id on ringtones(user_id);
create index idx_alarms_setter_id on alarms(setter_id);
create index idx_alarms_target_id on alarms(target_id);
create index idx_alarms_scheduled_at on alarms(scheduled_at);
