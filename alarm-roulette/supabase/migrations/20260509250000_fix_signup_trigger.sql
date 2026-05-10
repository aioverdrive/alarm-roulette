-- Fix "Database error saving new user" on Google OAuth signup.
-- Supabase needs a trigger on auth.users to auto-create the public profile.
-- Without this, new Google users hit an unexpected_failure on the callback.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  -- friend_code is auto-assigned by the set_friend_code trigger on profiles
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
