-- ============================================================
-- Fix 1: Auto-generate friend codes via trigger
-- ============================================================

-- Helper: generate a random 6-char code from unambiguous chars
create or replace function generate_friend_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I ambiguity
  code  text := '';
  i     int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- Trigger function: assigns a unique code before insert if none provided
create or replace function set_friend_code()
returns trigger
language plpgsql
as $$
begin
  if new.friend_code is null then
    loop
      new.friend_code := generate_friend_code();
      exit when not exists (
        select 1 from profiles where friend_code = new.friend_code
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists auto_friend_code on profiles;

create trigger auto_friend_code
  before insert on profiles
  for each row execute function set_friend_code();

-- Backfill any existing rows that are still null
do $$
declare
  r     record;
  code  text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i     int;
begin
  for r in select id from profiles where friend_code is null loop
    loop
      code := '';
      for i in 1..6 loop
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      end loop;
      exit when not exists (select 1 from profiles where friend_code = code);
    end loop;
    update profiles set friend_code = code where id = r.id;
  end loop;
end;
$$;

-- Now enforce not-null going forward
alter table profiles alter column friend_code set not null;

-- ============================================================
-- Fix 2: Remove the constraint that blocks self-alarms.
-- The whole point is YOU set YOUR OWN alarm; the roulette is
-- which friend's ringtone gets chosen, not who the alarm targets.
-- ============================================================

alter table alarms drop constraint if exists alarms_different_users;

-- ============================================================
-- Fix 3: Replace the broken RLS policies on alarms.
--   Old (wrong): setter picks a friend as target, uses own ringtone.
--   New (correct): setter = target = the user themselves; ringtone
--                  is chosen client-side from the friends' pool.
-- ============================================================

drop policy if exists "Users can set alarms for their friends"           on alarms;
drop policy if exists "Users can insert alarms for targets in their groups" on alarms;
drop policy if exists "Users can view alarms where they are setter or target" on alarms;
drop policy if exists "Users can view alarms they are involved in"       on alarms;
drop policy if exists "Users can update their own alarms"                on alarms;
drop policy if exists "Users can delete their own alarms"                on alarms;

-- Select: you can see your own alarms (you are always both setter & target)
create policy "Users can view their own alarms"
  on alarms
  for select using (auth.uid() = setter_id);

-- Insert: you can only create alarms for yourself
create policy "Users can create their own alarms"
  on alarms
  for insert with check (
    auth.uid() = setter_id and
    auth.uid() = target_id
  );

-- Update / Delete: only the person who set the alarm
create policy "Users can update their own alarms"
  on alarms
  for update using (auth.uid() = setter_id);

create policy "Users can delete their own alarms"
  on alarms
  for delete using (auth.uid() = setter_id);
