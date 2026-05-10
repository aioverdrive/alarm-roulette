"use client"

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ensureProfileForUser } from '@/lib/ensureProfile';

import {
  formatLocalParts,
  scheduledLocalParts,
  normalizeWeekdays,
  ensureFutureOneShotISO,
  firstRepeatISO,
} from '@/lib/alarmUtils';

import { useAlarmData } from '@/hooks/useAlarmData';
import { useAlarmEngine } from '@/hooks/useAlarmEngine';

import { AlarmList } from '@/components/alarms/AlarmList';
import { AlarmModal } from '@/components/alarms/AlarmModal';
import { AlarmRinging } from '@/components/alarms/AlarmRinging';
import type { DrumTime } from '@/components/alarms/DrumPicker';

export default function AlarmPageClient() {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [msg, setMsg]         = useState('');
  const [busy, setBusy]       = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState<string | null>(null);
  const [alarmRinging, setAlarmRinging] = useState(false);

  // Modal state
  const [alarmModalOpen, setAlarmModalOpen]   = useState(false);
  const [editingAlarmId, setEditingAlarmId]   = useState<string | null>(null);
  const [alarmDate, setAlarmDate]             = useState(() => formatLocalParts(new Date()).date);
  const [drumTime, setDrumTime]               = useState<DrumTime>({ hour: '07', minute: '00', period: 'AM' });
  const [repeatEnabled, setRepeatEnabled]     = useState(false);
  const [repeatDays, setRepeatDays]           = useState<number[]>([]);

  const flash = (m: string, ms = 3500) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), ms);
  };

  const { friends, ringtones, alarms, pool, loadFriends, loadRingtones, loadAlarms, loadPool } =
    useAlarmData();

  const { stopAlarmRinging } = useAlarmEngine({
    alarms, pool, user,
    onRingStart:   () => setAlarmRinging(true),
    onRingNoPool:  () => flash('Alarm fired but no friend ringtones in pool', 6000),
    onRingError:   () => { setAlarmRinging(false); flash('Could not play audio — tap anywhere first', 6000); },
    onReloadAlarms: loadAlarms,
  });

  const handleStopAlarm = () => { stopAlarmRinging(); setAlarmRinging(false); };

  // Auth + initial load
  useEffect(() => {
    let cancelled = false;
    const applySession = async (session: Session | null) => {
      if (!session?.user) { if (!cancelled) setUser(null); return; }
      await ensureProfileForUser(session.user);
      if (cancelled) return;
      setUser(session.user);
      const { data } = await supabaseBrowser
        .from('profiles').select('*').eq('user_id', session.user.id).single();
      if (cancelled) return;
      setProfile(data ?? null);
      loadFriends(session.user.id);
      loadRingtones(session.user.id);
      loadAlarms(session.user.id);
    };
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => void applySession(session));
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_e, s) => void applySession(s));
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const rc = supabaseBrowser.channel('live-ringtones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringtones' }, () => {
        loadRingtones(user.id); void loadPool(user.id);
      }).subscribe();
    const fc = supabaseBrowser.channel('live-friends')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => loadFriends(user.id))
      .subscribe();
    const ac = supabaseBrowser.channel('live-alarms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms' }, () => loadAlarms(user.id))
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(rc);
      supabaseBrowser.removeChannel(fc);
      supabaseBrowser.removeChannel(ac);
    };
  }, [user]);

  const loadPoolCb = useCallback(() => { if (user?.id) void loadPool(user.id); }, [user?.id]);
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') loadPoolCb(); }, 20000);
    document.addEventListener('visibilitychange', loadPoolCb);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', loadPoolCb); };
  }, [loadPoolCb]);

  useEffect(() => {
    if (!alarmModalOpen || alarmRinging) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAlarmModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alarmModalOpen, alarmRinging]);

  // Modal helpers
  const openNewAlarmModal = () => {
    setEditingAlarmId(null);
    const parts = formatLocalParts(new Date());
    setAlarmDate(parts.date);
    setDrumTime({ hour: parts.hour, minute: parts.minute, period: parts.period });
    setRepeatEnabled(false); setRepeatDays([]);
    setAlarmModalOpen(true);
  };
  const openEditAlarmModal = (alarm: any) => {
    const parts = scheduledLocalParts(alarm.scheduled_at);
    setEditingAlarmId(alarm.id);
    setAlarmDate(parts.date);
    setDrumTime({ hour: parts.hour, minute: parts.minute, period: parts.period });
    const rw = normalizeWeekdays(alarm.repeat_weekdays);
    setRepeatEnabled(rw.length > 0); setRepeatDays(rw);
    setAlarmModalOpen(true);
  };
  const closeAlarmModal = () => {
    setAlarmModalOpen(false); setEditingAlarmId(null);
    setRepeatEnabled(false); setRepeatDays([]);
  };
  const toggleRepeatDay = (day: number) => {
    setRepeatDays(prev => {
      const set = new Set(prev);
      set.has(day) ? set.delete(day) : set.add(day);
      return [...set].sort((a, b) => a - b);
    });
  };

  // Alarm CRUD
  const saveAlarmFromModal = async () => {
    if (!user) return;
    if (!editingAlarmId && !pool.length) { flash('Your friends have not uploaded ringtones yet'); return; }
    if (repeatEnabled && !repeatDays.length) { flash('Pick at least one day for a repeating alarm'); return; }
    const weekdaysDb = repeatEnabled && repeatDays.length ? repeatDays : null;
    const iso = repeatEnabled
      ? firstRepeatISO(drumTime.hour, drumTime.minute, drumTime.period, repeatDays)
      : ensureFutureOneShotISO(alarmDate, drumTime.hour, drumTime.minute, drumTime.period);
    setBusy('alarm');
    try {
      if (editingAlarmId) {
        const { error } = await supabaseBrowser.from('alarms')
          .update({ scheduled_at: iso, repeat_weekdays: weekdaysDb, enabled: true })
          .eq('id', editingAlarmId).eq('setter_id', user.id);
        if (error) { flash(error.message, 8000); return; }
        flash('Alarm updated');
      } else {
        const { error } = await supabaseBrowser.from('alarms').insert({
          setter_id: user.id, target_id: user.id,
          scheduled_at: iso, repeat_weekdays: weekdaysDb, enabled: true,
        });
        if (error) { flash(error.message, 8000); return; }
        flash('Scheduled — you won\'t know the tone until it rings');
      }
      closeAlarmModal(); loadAlarms(user.id);
    } finally { setBusy(null); }
  };

  const deleteAlarm = async (id: string) => {
    if (!user) return;
    setBusy('delete');
    try {
      const { error } = await supabaseBrowser.from('alarms').delete().eq('id', id).eq('setter_id', user.id);
      if (error) { flash(error.message, 8000); return; }
      loadAlarms(user.id);
    } finally { setBusy(null); }
  };

const toggleAlarmActive = async (alarm: any) => {
  if (!user) return;

  // If re-enabling a one-shot with a past scheduled_at, make them pick a new time
  const rw = normalizeWeekdays(alarm.repeat_weekdays);
  const isPast = new Date(alarm.scheduled_at).getTime() < Date.now();
  if (alarm.enabled === false && rw.length === 0 && isPast) {
    openEditAlarmModal(alarm);
    return;
  }

  setBusyToggle(alarm.id);
  try {
    const { error } = await supabaseBrowser.from('alarms')
      .update({ enabled: !(alarm.enabled !== false) })
      .eq('id', alarm.id).eq('setter_id', user.id);
    if (error) { flash(error.message, 8000); return; }
    loadAlarms(user.id);
  } finally { setBusyToggle(null); }
};

  if (!user) return <p style={{ padding: 24, textAlign: 'center' }}>Please sign in</p>;

  const displayName = profile?.full_name?.split(' ')[0] ?? 'Friend';

  return (
    <>
      {/* Header — matches "Welcome to the Alarm Roulette, Name!" */}
      <h1 className="margin-top">
        Welcome to the{' '}
        <br />
        <span style={{ fontFamily: "'Las Vegas', cursive", fontSize: '3rem', color: '#FCBA04' }}>
          Alarm Roulette,
        </span>{' '}
        {displayName}!
      </h1>

      {msg && (
        <p style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.9rem', color: '#FCBA04' }}>
          {msg}
        </p>
      )}

      <AlarmList
        alarms={alarms}
        pool={pool}
        friends={friends}
        busyDelete={busy === 'delete'}
        busyToggle={busyToggle}
        onNewAlarm={openNewAlarmModal}
        onEditAlarm={openEditAlarmModal}
        onDeleteAlarm={deleteAlarm}
        onToggleAlarm={toggleAlarmActive}
      />

      <AlarmModal
        isOpen={alarmModalOpen}
        editingAlarmId={editingAlarmId}
        drumTime={drumTime}
        alarmDate={alarmDate}
        repeatEnabled={repeatEnabled}
        repeatDays={repeatDays}
        busy={busy === 'alarm'}
        onClose={closeAlarmModal}
        onSave={saveAlarmFromModal}
        onDrumTimeChange={setDrumTime}
        onDateChange={setAlarmDate}
        onRepeatEnabledChange={setRepeatEnabled}
        onToggleRepeatDay={toggleRepeatDay}
      />

      <AlarmRinging visible={alarmRinging} onStop={handleStopAlarm} />
    </>
  );
}