"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { inferAudioContentType, ringtoneObjectPathFromPublicUrl, MAX_MB, MAX_BYTES } from '@/lib/audioUtils';

import { useAlarmData } from '@/hooks/useAlarmData';
import { useAlarmEngine } from '@/hooks/useAlarmEngine';

import { AlarmList } from '@/components/alarms/AlarmList';
import { AlarmModal } from '@/components/alarms/AlarmModal';
import { AlarmRinging } from '@/components/alarms/AlarmRinging';
import { FriendsSection } from '@/components/alarms/FriendsSection';
import { RingtonesSection } from '@/components/alarms/RingtonesSection';
import type { DrumTime } from '@/components/alarms/DrumPicker';

export default function AlarmPageClient() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [busyToggle, setBusyToggle] = useState<string | null>(null);
  const [alarmRinging, setAlarmRinging] = useState(false);

  // Modal state
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [alarmDate, setAlarmDate] = useState(() => formatLocalParts(new Date()).date);
  const [drumTime, setDrumTime] = useState<DrumTime>({ hour: '07', minute: '00', period: 'AM' });
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

  // Friends / ringtone upload
  const [friendCode, setFriendCode] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const flash = (m: string, ms = 3500) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), ms);
  };

  // ── Data ──────────────────────────────────────────────────────
  const { friends, ringtones, alarms, pool, loadFriends, loadRingtones, loadAlarms, loadPool } =
    useAlarmData();

  // ── Alarm engine ──────────────────────────────────────────────
  const { stopAlarmRinging } = useAlarmEngine({
    alarms,
    pool,
    user,
    onRingStart: () => setAlarmRinging(true),
    onRingNoPool: () =>
      flash('Alarm fired but no friend ringtones in pool — add friends or tones', 6000),
    onRingError: () => {
      setAlarmRinging(false);
      flash('Could not play audio — unlock audio by tapping anywhere on the page', 6000);
    },
    onReloadAlarms: loadAlarms,
  });

  const handleStopAlarm = () => {
    stopAlarmRinging();
    setAlarmRinging(false);
  };

  // ── Auth + initial load ───────────────────────────────────────
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
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_e, s) =>
      void applySession(s)
    );
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const ringtoneChannel = supabaseBrowser.channel('live-ringtones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ringtones' }, () => {
        loadRingtones(user.id);
        void loadPool(user.id);
      })
      .subscribe();

    const friendsChannel = supabaseBrowser.channel('live-friends')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        loadFriends(user.id);
      })
      .subscribe();

    const alarmsChannel = supabaseBrowser.channel('live-alarms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms' }, () => {
        loadAlarms(user.id);
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(ringtoneChannel);
      supabaseBrowser.removeChannel(friendsChannel);
      supabaseBrowser.removeChannel(alarmsChannel);
    };
  }, [user]);

  // Pool refresh every 20s and on tab focus
  const loadPoolCb = useCallback(() => { if (user?.id) void loadPool(user.id); }, [user?.id]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadPoolCb();
    }, 20000);
    document.addEventListener('visibilitychange', loadPoolCb);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', loadPoolCb); };
  }, [loadPoolCb]);

  // Escape key to close modal
  useEffect(() => {
    if (!alarmModalOpen || alarmRinging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAlarmModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alarmModalOpen, alarmRinging]);

  // ── Modal helpers ─────────────────────────────────────────────
  const openNewAlarmModal = () => {
    setEditingAlarmId(null);
    const parts = formatLocalParts(new Date());
    setAlarmDate(parts.date);
    setDrumTime({ hour: parts.hour, minute: parts.minute, period: parts.period });
    setRepeatEnabled(false);
    setRepeatDays([]);
    setAlarmModalOpen(true);
  };

  const openEditAlarmModal = (alarm: any) => {
    const parts = scheduledLocalParts(alarm.scheduled_at);
    setEditingAlarmId(alarm.id);
    setAlarmDate(parts.date);
    setDrumTime({ hour: parts.hour, minute: parts.minute, period: parts.period });
    const rw = normalizeWeekdays(alarm.repeat_weekdays);
    setRepeatEnabled(rw.length > 0);
    setRepeatDays(rw);
    setAlarmModalOpen(true);
  };

  const closeAlarmModal = () => {
    setAlarmModalOpen(false);
    setEditingAlarmId(null);
    setRepeatEnabled(false);
    setRepeatDays([]);
  };

  const toggleRepeatDay = (day: number) => {
    setRepeatDays(prev => {
      const set = new Set(prev);
      set.has(day) ? set.delete(day) : set.add(day);
      return [...set].sort((a, b) => a - b);
    });
  };

  // ── Alarm CRUD ────────────────────────────────────────────────
  const saveAlarmFromModal = async () => {
    if (!user) return;
    if (!editingAlarmId && !pool.length) {
      flash('Your friends have not uploaded ringtones yet');
      return;
    }
    if (repeatEnabled && !repeatDays.length) {
      flash('Pick at least one day for a repeating alarm');
      return;
    }

    const weekdaysDb = repeatEnabled && repeatDays.length ? repeatDays : null;
    const iso = repeatEnabled
      ? firstRepeatISO(drumTime.hour, drumTime.minute, drumTime.period, repeatDays)
      : ensureFutureOneShotISO(alarmDate, drumTime.hour, drumTime.minute, drumTime.period);

    setBusy('alarm');
    try {
      if (editingAlarmId) {
        const { error } = await supabaseBrowser
          .from('alarms')
          .update({ scheduled_at: iso, repeat_weekdays: weekdaysDb, enabled: true })
          .eq('id', editingAlarmId)
          .eq('setter_id', user.id);
        if (error) { flash(error.message, 8000); return; }
        flash('Alarm updated');
      } else {
        const { error } = await supabaseBrowser.from('alarms').insert({
          setter_id: user.id,
          target_id: user.id,
          scheduled_at: iso,
          repeat_weekdays: weekdaysDb,
          enabled: true,
        });
        if (error) { flash(error.message, 8000); return; }
        flash('Scheduled — you will not know the tone until it rings');
      }
      closeAlarmModal();
      loadAlarms(user.id);
    } finally {
      setBusy(null);
    }
  };

  /** Deletes immediately with no confirmation dialog. */
  const deleteAlarm = async (id: string) => {
    if (!user) return;
    setBusy('delete');
    try {
      const { error } = await supabaseBrowser
        .from('alarms').delete().eq('id', id).eq('setter_id', user.id);
      if (error) { flash(error.message, 8000); return; }
      loadAlarms(user.id);
    } finally {
      setBusy(null);
    }
  };

  /** Flips the enabled (active) flag — lets users pause an alarm without deleting it. */
  const toggleAlarmActive = async (alarm: any) => {
    if (!user) return;
    setBusyToggle(alarm.id);
    try {
      const { error } = await supabaseBrowser
        .from('alarms')
        .update({ enabled: !(alarm.enabled !== false) })
        .eq('id', alarm.id)
        .eq('setter_id', user.id);
      if (error) { flash(error.message, 8000); return; }
      loadAlarms(user.id);
    } finally {
      setBusyToggle(null);
    }
  };

  // ── Friend ────────────────────────────────────────────────────
  const addFriend = async () => {
    if (!friendCode.trim() || !user) return;
    setBusy('friend');
    try {
      const { data: fp, error: fe } = await supabaseBrowser
        .from('profiles').select('user_id, full_name')
        .eq('friend_code', friendCode.trim().toUpperCase()).single();
      if (fe || !fp) { flash('Friend code not found'); return; }
      if (fp.user_id === user.id) { flash("That's your own code"); return; }

      const { data: existing } = await supabaseBrowser
        .from('friends').select('id')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${fp.user_id}),` +
          `and(user_id.eq.${fp.user_id},friend_id.eq.${user.id})`
        ).maybeSingle();
      if (existing) { flash('Already friends'); return; }

      const { error } = await supabaseBrowser
        .from('friends').insert({ user_id: user.id, friend_id: fp.user_id });
      if (error) { flash(error.message); return; }

      flash(`Added ${fp.full_name ?? 'friend'}!`);
      setFriendCode('');
      loadFriends(user.id);
    } finally {
      setBusy(null);
    }
  };

  // ── Ringtones ─────────────────────────────────────────────────
  const uploadRingtone = async () => {
    if (!uploadFile || !user) return;
    if (uploadFile.size > MAX_BYTES) { flash(`File too large — max ${MAX_MB} MB`); return; }
    setBusy('upload');
    try {
      const ext = uploadFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: ue } = await supabaseBrowser.storage
        .from('ringtones').upload(filePath, uploadFile, {
          contentType: inferAudioContentType(uploadFile),
          upsert: false,
        });
      if (ue) { flash(`Upload failed: ${ue.message}`, 8000); return; }

      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('ringtones').getPublicUrl(filePath);

      const { error: de } = await supabaseBrowser.from('ringtones').insert({
        user_id: user.id, title: uploadFile.name, file_path: publicUrl,
      });
      if (de) { flash(`Saved file but database error: ${de.message}`, 8000); return; }

      flash('Uploaded!');
      setUploadFile(null);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
      loadRingtones(user.id);
      await loadPool(user.id);
    } finally {
      setBusy(null);
    }
  };

  const deleteOwnRingtone = async (r: { id: string; title: string; file_path: string }) => {
    if (!user) return;
    setBusy('del-ring');
    try {
      const path = ringtoneObjectPathFromPublicUrl(r.file_path);
      if (path) {
        const { error: se } = await supabaseBrowser.storage.from('ringtones').remove([path]);
        if (se) console.error('[deleteOwnRingtone] storage', se);
      }
      const { error } = await supabaseBrowser
        .from('ringtones').delete().eq('id', r.id).eq('user_id', user.id);
      if (error) { flash(error.message, 8000); return; }
      flash('Ringtone removed');
      await loadRingtones(user.id);
      await loadPool(user.id);
    } finally {
      setBusy(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  if (!user) return <p style={{ padding: 24 }}>Please sign in</p>;

  return (
    <>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        {profile?.friend_code && (
          <p style={{ marginBottom: 24, fontSize: 13, color: '#666' }}>
            Your code:{' '}
            <strong style={{ letterSpacing: '0.1em' }}>{profile.friend_code}</strong>
          </p>
        )}

        {msg && <p style={{ marginBottom: 16, fontSize: 14 }}>{msg}</p>}

        <AlarmList
          alarms={alarms}
          busyDelete={busy === 'delete'}
          busyToggle={busyToggle}
          onNewAlarm={openNewAlarmModal}
          onEditAlarm={openEditAlarmModal}
          onDeleteAlarm={deleteAlarm}
          onToggleAlarm={toggleAlarmActive}
        />

        <FriendsSection
          friends={friends}
          friendCode={friendCode}
          busy={busy === 'friend'}
          onFriendCodeChange={setFriendCode}
          onAddFriend={addFriend}
        />

        <RingtonesSection
          ringtones={ringtones}
          uploadFile={uploadFile}
          busy={busy === 'upload'}
          onFileChange={setUploadFile}
          onUpload={uploadRingtone}
          onDelete={deleteOwnRingtone}
          flash={flash}
        />
      </div>

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
