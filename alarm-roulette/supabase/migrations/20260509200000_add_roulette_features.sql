-- Add friend groups, members, ringtones tables

create table friend_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references friend_groups(id) not null,
  user_id uuid references auth.users(id) not null,
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table ringtones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  file_path text not null, -- Supabase Storage path
  created_at timestamptz not null default now()
);

-- Update profiles
alter table profiles add column friend_code text unique;

-- Enable RLS for new tables
alter table friend_groups enable row level security;
alter table group_members enable row level security;
alter table ringtones enable row level security;

-- Policies for friend_groups
create policy "Users can view groups they are members of" on friend_groups
  for select using (
    auth.uid() in (
      select user_id from group_members where group_id = friend_groups.id
    )
  );

create policy "Users can create groups" on friend_groups
  for insert with check (auth.uid() = created_by);

create policy "Group creators can update their groups" on friend_groups
  for update using (auth.uid() = created_by);

-- Policies for group_members
create policy "Users can view members of groups they are in" on group_members
  for select using (
    auth.uid() in (
      select user_id from group_members gm where gm.group_id = group_members.group_id
    )
  );

create policy "Users can join groups" on group_members
  for insert with check (auth.uid() = user_id);

-- Policies for ringtones
create policy "Users can view ringtones from their groups" on ringtones
  for select using (
    auth.uid() in (
      select gm.user_id from group_members gm
      join ringtones r on r.user_id = gm.user_id
      where r.id = ringtones.id
    ) or auth.uid() = user_id
  );

create policy "Users can insert their own ringtones" on ringtones
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own ringtones" on ringtones
  for update using (auth.uid() = user_id);

create policy "Users can delete their own ringtones" on ringtones
  for delete using (auth.uid() = user_id);

-- Update alarms table and policies
drop policy "Users can view their own alarms" on alarms;
drop policy "Users can insert their own alarms" on alarms;
drop policy "Users can update their own alarms" on alarms;
drop policy "Users can delete their own alarms" on alarms;

alter table alarms add column setter_id uuid references auth.users(id);
alter table alarms add column target_id uuid references auth.users(id);
alter table alarms add column group_id uuid references friend_groups(id);
alter table alarms add column ringtone_id uuid references ringtones(id);
alter table alarms drop column user_id;
alter table alarms drop column title;
alter table alarms drop column sound;
alter table alarms add constraint alarms_different_users check (setter_id != target_id);

create policy "Users can view alarms where they are setter or target" on alarms
  for select using (auth.uid() = setter_id or auth.uid() = target_id);

create policy "Users can insert alarms for targets in their groups" on alarms
  for insert with check (
    auth.uid() = setter_id and
    target_id in (
      select user_id from group_members where group_id = alarms.group_id
    ) and
    setter_id in (
      select user_id from group_members where group_id = alarms.group_id
    )
  );

create policy "Users can update their own alarms" on alarms
  for update using (auth.uid() = setter_id);

create policy "Users can delete their own alarms" on alarms
  for delete using (auth.uid() = setter_id);