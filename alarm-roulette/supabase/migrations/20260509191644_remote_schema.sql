-- Supabase schema for Alarm Roulette user data

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null unique,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table alarms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  scheduled_at timestamptz not null,
  enabled boolean not null default true,
  sound text,
  created_at timestamptz not null default now(),
  constraint alarms_user_fk foreign key (user_id) references auth.users(id)
);

-- Enable RLS
alter table profiles enable row level security;
alter table alarms enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = user_id);

-- Policies for alarms
create policy "Users can view their own alarms" on alarms
  for select using (auth.uid() = user_id);

create policy "Users can insert their own alarms" on alarms
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own alarms" on alarms
  for update using (auth.uid() = user_id);

create policy "Users can delete their own alarms" on alarms
  for delete using (auth.uid() = user_id);