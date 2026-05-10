-- Weekly repeat: JS weekday numbers 0 = Sunday … 6 = Saturday (Date.getDay()).
alter table alarms add column if not exists repeat_weekdays smallint[];

comment on column alarms.repeat_weekdays is 'Empty or null = one-shot alarm; otherwise repeats on those weekdays.';

-- Deleting a ringtone clears alarm FK instead of blocking delete.
do $$
declare
  r record;
begin
  for r in
    select tc.constraint_name as cn
    from information_schema.table_constraints as tc
    join information_schema.key_column_usage as kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'alarms'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'ringtone_id'
  loop
    execute format('alter table public.alarms drop constraint %I', r.cn);
  end loop;
end $$;

alter table public.alarms
  add constraint alarms_ringtone_id_fkey
  foreign key (ringtone_id)
  references public.ringtones(id)
  on delete set null;
