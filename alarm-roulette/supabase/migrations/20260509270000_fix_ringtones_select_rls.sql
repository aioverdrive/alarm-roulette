-- Ringtones SELECT policies referenced group_members; dropping that table with
-- CASCADE removed those policies, leaving no SELECT rules on ringtones. Inserts
-- still succeeded but PostgREST returned zero rows (friends saw empty pools).

drop policy if exists "Users can view ringtones from their groups" on ringtones;
drop policy if exists "Users can view their own ringtones" on ringtones;
drop policy if exists "Users can view ringtones of friends" on ringtones;

create policy "Users can view their own ringtones"
  on ringtones for select
  using (auth.uid() = user_id);

create policy "Users can view ringtones of friends"
  on ringtones for select
  using (
    exists (
      select 1 from friends f
      where (f.user_id = auth.uid() and f.friend_id = ringtones.user_id)
         or (f.friend_id = auth.uid() and f.user_id = ringtones.user_id)
    )
  );
