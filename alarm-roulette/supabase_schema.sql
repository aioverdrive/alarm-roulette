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
Q