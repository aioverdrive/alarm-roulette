-- Ringtone is chosen only when the alarm fires (client roulette), not when scheduling.
alter table alarms alter column ringtone_id drop not null;
