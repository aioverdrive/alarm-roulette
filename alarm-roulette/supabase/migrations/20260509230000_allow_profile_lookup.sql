-- Allow any authenticated user to view profiles by friend code
drop policy if exists "Users can view profiles of people they know" on profiles;

create policy "Users can view any profile (for friend code lookup)" on profiles
  for select using (true);
