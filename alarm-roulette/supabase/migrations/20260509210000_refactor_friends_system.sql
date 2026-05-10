-- Create friends table to replace group_members
create table if not exists friends (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  friend_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- Enable RLS on friends table
alter table friends enable row level security;

-- Friends can view their own friendships
create policy "Users can view their friends"
  on friends
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- Users can add friends
create policy "Users can add friends"
  on friends
  for insert with check (auth.uid() = user_id);

-- Users can remove friendships
create policy "Users can remove friendships"
  on friends
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Drop the old group_members and friend_groups tables if they exist
drop table if exists group_members cascade;
drop table if exists friend_groups cascade;

-- Add indexes for better performance
create index idx_friends_user_id on friends(user_id);
create index idx_friends_friend_id on friends(friend_id);
