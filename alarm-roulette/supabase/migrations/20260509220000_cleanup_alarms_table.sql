-- Remove group_id dependency from alarms
alter table alarms drop column if exists group_id;

-- Drop old RLS policies on alarms that referenced group_members
drop policy if exists "Users can view alarms they are involved in" on alarms;
drop policy if exists "Users can set alarms for their friends" on alarms;
drop policy if exists "Users can update their own alarms" on alarms;
drop policy if exists "Users can delete their own alarms" on alarms;

-- Create new RLS policies for alarms based on friendship
-- Users can view alarms where they are the setter or target
create policy "Users can view alarms they are involved in"
  on alarms
  for select using (
    auth.uid() = setter_id or auth.uid() = target_id
  );

-- Users can create alarms for their friends
create policy "Users can set alarms for their friends"
  on alarms
  for insert with check (
    auth.uid() = setter_id and
    exists (
      select 1 from friends
      where (user_id = auth.uid() and friend_id = target_id)
         or (user_id = target_id and friend_id = auth.uid())
    )
  );

-- Users can update their own alarms
create policy "Users can update their own alarms"
  on alarms
  for update using (auth.uid() = setter_id);

-- Users can delete their own alarms
create policy "Users can delete their own alarms"
  on alarms
  for delete using (auth.uid() = setter_id);
