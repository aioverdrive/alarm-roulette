"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ensureProfileForUser } from '@/lib/ensureProfile';
import type { Session, User } from '@supabase/supabase-js';

// ── Drum Picker ────────────────────────────────────────────────
const ITEM_H = 44;

function DrumColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
  }, [selected, items]);

  const onScroll = () => {
    if (!ref.current) return;

    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));

    if (items[clamped] !== selected) {
      onSelect(items[clamped]);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: 72,
        height: ITEM_H * 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: ITEM_H,
          left: 0,
          right: 0,
          height: ITEM_H,
          borderTop: '1px solid #ccc',
          borderBottom: '1px solid #ccc',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H,
          paddingBottom: ITEM_H,
          scrollbarWidth: 'none',
        }}
      >
        {items.map(v => (
          <div
            key={v}
            onClick={() => onSelect(v)}
            style={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: 22,
              fontWeight: v === selected ? 600 : 400,
              color: v === selected ? '#000' : '#aaa',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0')
);

const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

const PERIODS = ['AM', 'PM'];

function AlarmPicker({
  value,
  onChange,
}: {
  value: { hour: string; minute: string; period: string };
  onChange: (v: {
    hour: string;
    minute: string;
    period: string;
  }) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        padding: '12px 0',
      }}
    >
      <DrumColumn
        items={HOURS}
        selected={value.hour}
        onSelect={h => onChange({ ...value, hour: h })}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        :
      </div>

      <DrumColumn
        items={MINUTES}
        selected={value.minute}
        onSelect={m => onChange({ ...value, minute: m })}
      />

      <DrumColumn
        items={PERIODS}
        selected={value.period}
        onSelect={p => onChange({ ...value, period: p })}
      />
    </div>
  );
}

/** Local wall-clock → ISO string without `Z` (parsed as local time in browsers). */
function formatLocalScheduledISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${m}:00`;
}

function parseLocalWallClock(
  dateStr: string,
  hour12: string,
  minute: string,
  period: string
): Date {
  let h = parseInt(hour12, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, h, parseInt(minute, 10), 0, 0);
}

/** Rolls forward day-by-day until the instant is in the future (fixes “fires immediately”). */
function ensureFutureOneShotISO(
  dateStr: string,
  hour: string,
  minute: string,
  period: string
): string {
  const d = parseLocalWallClock(dateStr, hour, minute, period);
  const grace = Date.now() + 2500;
  let cursor = new Date(d);
  let guard = 0;
  while (cursor.getTime() <= grace && guard++ < 400) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return formatLocalScheduledISO(cursor);
}

function firstRepeatISO(
  hour: string,
  minute: string,
  period: string,
  weekdays: number[]
): string {
  const allow = new Set(weekdays.filter(w => w >= 0 && w <= 6));
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const mi = parseInt(minute, 10);
  const grace = Date.now() + 2500;

  const mid = new Date();
  mid.setHours(0, 0, 0, 0);

  for (let add = 0; add < 370; add++) {
    const cand = new Date(
      mid.getFullYear(),
      mid.getMonth(),
      mid.getDate() + add,
      h,
      mi,
      0,
      0
    );
    if (cand.getTime() <= grace) continue;
    if (allow.has(cand.getDay())) return formatLocalScheduledISO(cand);
  }
  return formatLocalScheduledISO(new Date(grace + 60_000));
}

function computeNextRepeatISO(
  prevScheduledIso: string,
  weekdays: number[],
  strictlyAfterMs: number
): string {
  const anchor = new Date(prevScheduledIso);
  const hour = anchor.getHours();
  const minute = anchor.getMinutes();
  const allow = new Set(weekdays.filter(w => w >= 0 && w <= 6));

  const mid = new Date(strictlyAfterMs);
  mid.setHours(0, 0, 0, 0);

  for (let add = 0; add < 370; add++) {
    const cand = new Date(
      mid.getFullYear(),
      mid.getMonth(),
      mid.getDate() + add,
      hour,
      minute,
      0,
      0
    );
    if (cand.getTime() <= strictlyAfterMs) continue;
    if (allow.has(cand.getDay())) return formatLocalScheduledISO(cand);
  }
  return prevScheduledIso;
}

function normalizeWeekdays(ws: unknown): number[] {
  if (!Array.isArray(ws)) return [];
  return [...new Set(ws.map(Number).filter(w => w >= 0 && w <= 6))].sort(
    (a, b) => a - b
  );
}

function formatRepeatSummary(ws: unknown): string {
  const n = normalizeWeekdays(ws);
  if (!n.length) return '';
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `Repeats · ${n.map(d => labels[d]).join(', ')}`;
}

function ringtoneObjectPathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/object/public/ringtones/';
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

const WEEKDAY_PRESETS = [
  { d: 0, short: 'Sun' },
  { d: 1, short: 'Mon' },
  { d: 2, short: 'Tue' },
  { d: 3, short: 'Wed' },
  { d: 4, short: 'Thu' },
  { d: 5, short: 'Fri' },
  { d: 6, short: 'Sat' },
] as const;

function formatLocalParts(d: Date): {
  date: string;
  hour: string;
  minute: string;
  period: string;
} {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h24 = d.getHours();
  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return {
    date: `${y}-${mo}-${day}`,
    hour: String(h12).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
    period,
  };
}

function scheduledLocalParts(iso: string): {
  date: string;
  hour: string;
  minute: string;
  period: string;
} {
  return formatLocalParts(new Date(iso));
}

function randomPoolIndex(length: number): number {
  if (length <= 0) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % length;
}

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/** Some browsers leave `file.type` empty; Storage MIME allowlists require a real type. */
function inferAudioContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
    case 'oga':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    default:
      return 'audio/mpeg';
  }
}

// ── Main Page ──────────────────────────────────────────────────
export default function AlarmPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [ringtones, setRingtones] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [pool, setPool] = useState<any[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const poolRef = useRef<any[]>([]);
  const alarmsRef = useRef<any[]>([]);
  const userRef = useRef<User | null>(null);
  const alarmEngineBusyRef = useRef(false);

  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

  const [alarmDate, setAlarmDate] = useState(
    () => formatLocalParts(new Date()).date
  );

  const [drumTime, setDrumTime] = useState({
    hour: '07',
    minute: '00',
    period: 'AM',
  });

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

  const [friendCode, setFriendCode] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [alarmRinging, setAlarmRinging] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const stopAlarmBtnRef = useRef<HTMLButtonElement>(null);

  const flash = (m: string, ms = 3500) => {
    setMsg(m);
    window.setTimeout(() => setMsg(''), ms);
  };

  const clearPlayback = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    a.src = '';
    a.load();
    audioRef.current = null;
  };

  const stopAlarmRinging = () => {
    clearPlayback();
    setAlarmRinging(false);
  };

  const openNewAlarmModal = () => {
    setEditingAlarmId(null);
    const parts = formatLocalParts(new Date());
    setAlarmDate(parts.date);
    setDrumTime({
      hour: parts.hour,
      minute: parts.minute,
      period: parts.period,
    });
    setRepeatEnabled(false);
    setRepeatDays([]);
    setAlarmModalOpen(true);
  };

  const openEditAlarmModal = (alarm: {
    id: string;
    scheduled_at: string;
    repeat_weekdays?: unknown;
  }) => {
    const parts = scheduledLocalParts(alarm.scheduled_at);
    setEditingAlarmId(alarm.id);
    setAlarmDate(parts.date);
    setDrumTime({
      hour: parts.hour,
      minute: parts.minute,
      period: parts.period,
    });
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
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return [...set].sort((a, b) => a - b);
    });
  };

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      if (!session?.user) {
        if (!cancelled) setUser(null);
        return;
      }

      await ensureProfileForUser(session.user);

      if (cancelled) return;

      setUser(session.user);

      const { data } = await supabaseBrowser
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (cancelled) return;

      setProfile(data ?? null);

      loadFriends(session.user.id);
      loadRingtones(session.user.id);
      loadAlarms(session.user.id);
    };

    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      void applySession(session);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Realtime subscriptions ─────────────────────────
useEffect(() => {
  if (!user) return;

  const ringtoneChannel = supabaseBrowser
    .channel('live-ringtones')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ringtones',
      },
      () => {
        loadRingtones(user.id);
        void loadPool(user.id);
      }
    )
    .subscribe();

  const friendsChannel = supabaseBrowser
    .channel('live-friends')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friends',
      },
      () => {
        loadFriends(user.id);
      }
    )
    .subscribe();

  const alarmsChannel = supabaseBrowser
    .channel('live-alarms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'alarms',
      },
      () => {
        loadAlarms(user.id);
      }
    )
    .subscribe();

  return () => {
    supabaseBrowser.removeChannel(ringtoneChannel);
    supabaseBrowser.removeChannel(friendsChannel);
    supabaseBrowser.removeChannel(alarmsChannel);
  };
}, [user]);

  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);

  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── Live Alarm Engine (random friend tone when it fires, not at schedule time)
  useEffect(() => {
    const tick = () => {
      if (alarmEngineBusyRef.current) return;

      const now = Date.now();
      const prev = alarmsRef.current;
      const toFire = prev.filter(
        a =>
          a.enabled !== false &&
          now >= new Date(a.scheduled_at).getTime()
      );
      if (!toFire.length) return;

      alarmEngineBusyRef.current = true;

      const currentPool = poolRef.current;
      if (!currentPool.length) {
        flash(
          'Alarm fired but no friend ringtones in pool — add friends or tones',
          6000
        );
      } else {
        const picked = currentPool[randomPoolIndex(currentPool.length)]!;
        const audio = new Audio(picked.file_path);

        audio.loop = true;
        clearPlayback();
        audioRef.current = audio;
        setAlarmRinging(true);

        void audio.play().catch(() => {
          setAlarmRinging(false);
          flash(
            'Could not play audio — unlock audio by tapping anywhere on the page',
            6000
          );
        });
      }

      void (async () => {
        try {
          const uid = userRef.current?.id;
          for (const alarm of toFire) {
            const rw = normalizeWeekdays(alarm.repeat_weekdays);
            if (rw.length > 0) {
              const nextIso = computeNextRepeatISO(
                alarm.scheduled_at,
                rw,
                Date.now()
              );
              await supabaseBrowser
                .from('alarms')
                .update({ scheduled_at: nextIso })
                .eq('id', alarm.id);
            } else {
              await supabaseBrowser
                .from('alarms')
                .update({ enabled: false })
                .eq('id', alarm.id);
            }
          }
          if (uid) await loadAlarms(uid);
        } finally {
          alarmEngineBusyRef.current = false;
        }
      })();
    };

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadFriends = async (uid: string) => {
    const { data: rows } = await supabaseBrowser
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    if (!rows?.length) {
      setFriends([]);
      return;
    }

    const ids = rows.map(r =>
      r.user_id === uid
        ? r.friend_id
        : r.user_id
    );

    const { data } = await supabaseBrowser
      .from('profiles')
      .select('*')
      .in('user_id', ids);

    setFriends(data ?? []);
    await loadPool(uid);
  };

  const loadRingtones = async (uid: string) => {
    const { data } = await supabaseBrowser
      .from('ringtones')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    setRingtones(data ?? []);
  };

  const loadAlarms = async (uid: string) => {
    const { data } = await supabaseBrowser
      .from('alarms')
      .select('*')
      .eq('target_id', uid)
      .order('scheduled_at', { ascending: true });

    const rows = data ?? [];
    rows.sort((a, b) => {
      const ae = a.enabled !== false;
      const be = b.enabled !== false;
      if (ae !== be) return ae ? -1 : 1;
      const ta = new Date(a.scheduled_at).getTime();
      const tb = new Date(b.scheduled_at).getTime();
      return ae ? ta - tb : tb - ta;
    });

    setAlarms(rows);
  };

  /** Always reads friendships from the DB so realtime callbacks are never stale. */
  const loadPool = useCallback(async (uid: string) => {
    const { data: rows } = await supabaseBrowser
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    if (!rows?.length) {
      setPool([]);
      return;
    }

    const friendIds = rows.map(r =>
      r.user_id === uid ? r.friend_id : r.user_id
    );

    const { data } = await supabaseBrowser
      .from('ringtones')
      .select('*')
      .in('user_id', friendIds);

    setPool(data ?? []);
  }, []);

  // Backup refresh when Realtime is off or misses an event (tab stays open).
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadPool(uid);
    }, 20000);
    return () => window.clearInterval(id);
  }, [user?.id, loadPool]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadPool(uid);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user?.id, loadPool]);

  // ── Add friend ───────────────────────────────────
  const addFriend = async () => {
    if (!friendCode.trim() || !user) return;

    setBusy('friend');

    try {
      const { data: fp, error: fe } = await supabaseBrowser
        .from('profiles')
        .select('user_id, full_name')
        .eq('friend_code', friendCode.trim().toUpperCase())
        .single();

      if (fe || !fp) {
        flash('Friend code not found');
        return;
      }

      if (fp.user_id === user.id) {
        flash("That's your own code");
        return;
      }

      const { data: existing } = await supabaseBrowser
        .from('friends')
        .select('id')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${fp.user_id}),` +
          `and(user_id.eq.${fp.user_id},friend_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        flash('Already friends');
        return;
      }

      const { error } = await supabaseBrowser
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: fp.user_id,
        });

      if (error) {
        flash(error.message);
        return;
      }

      flash(`Added ${fp.full_name ?? 'friend'}!`);

      setFriendCode('');
      loadFriends(user.id);
    } finally {
      setBusy(null);
    }
  };

  // ── Create / update alarm (ringtone picked randomly when it fires)
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

    const weekdaysDb =
      repeatEnabled && repeatDays.length ? repeatDays : null;

    const iso = repeatEnabled
      ? firstRepeatISO(
          drumTime.hour,
          drumTime.minute,
          drumTime.period,
          repeatDays
        )
      : ensureFutureOneShotISO(
          alarmDate,
          drumTime.hour,
          drumTime.minute,
          drumTime.period
        );

    setBusy('alarm');

    try {
      if (editingAlarmId) {
        const { error } = await supabaseBrowser
          .from('alarms')
          .update({
            scheduled_at: iso,
            repeat_weekdays: weekdaysDb,
            enabled: true,
          })
          .eq('id', editingAlarmId)
          .eq('setter_id', user.id);

        if (error) {
          flash(error.message, 8000);
          return;
        }
        flash('Alarm updated');
      } else {
        const { error } = await supabaseBrowser.from('alarms').insert({
          setter_id: user.id,
          target_id: user.id,
          scheduled_at: iso,
          repeat_weekdays: weekdaysDb,
          enabled: true,
        });

        if (error) {
          flash(error.message, 8000);
          return;
        }
        flash('Scheduled — you will not know the tone until it rings');
      }

      closeAlarmModal();
      loadAlarms(user.id);
    } finally {
      setBusy(null);
    }
  };

  const deleteAlarm = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Delete this alarm?')) return;

    setBusy('delete');
    try {
      const { error } = await supabaseBrowser
        .from('alarms')
        .delete()
        .eq('id', id)
        .eq('setter_id', user.id);

      if (error) {
        flash(error.message, 8000);
        return;
      }

      flash('Alarm deleted');
      loadAlarms(user.id);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!alarmModalOpen || alarmRinging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAlarmModalOpen(false);
        setEditingAlarmId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alarmModalOpen, alarmRinging]);

  useEffect(() => {
    if (!alarmRinging) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    stopAlarmBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [alarmRinging]);

  // ── Upload ringtone ──────────────────────────────
  const uploadRingtone = async () => {
    if (!uploadFile || !user) return;

    if (uploadFile.size > MAX_BYTES) {
      flash(`File too large — max ${MAX_MB} MB`);
      return;
    }

    setBusy('upload');

    try {
      const ext = uploadFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const contentType = inferAudioContentType(uploadFile);

      const { error: ue } = await supabaseBrowser.storage
        .from('ringtones')
        .upload(filePath, uploadFile, {
          contentType,
          upsert: false,
        });

      if (ue) {
        flash(`Upload failed: ${ue.message}`, 8000);
        return;
      }

      const {
        data: { publicUrl },
      } = supabaseBrowser.storage
        .from('ringtones')
        .getPublicUrl(filePath);

      const { error: de } = await supabaseBrowser
        .from('ringtones')
        .insert({
          user_id: user.id,
          title: uploadFile.name,
          file_path: publicUrl,
        });

      if (de) {
        flash(`Saved file but database error: ${de.message}`, 8000);
        return;
      }

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
    if (
      !window.confirm(`Remove “${r.title}” from your library and storage?`)
    )
      return;

    setBusy('del-ring');
    try {
      const path = ringtoneObjectPathFromPublicUrl(r.file_path);
      if (path) {
        const { error: se } = await supabaseBrowser.storage
          .from('ringtones')
          .remove([path]);
        if (se) console.error('[deleteOwnRingtone] storage', se);
      }

      const { error } = await supabaseBrowser
        .from('ringtones')
        .delete()
        .eq('id', r.id)
        .eq('user_id', user.id);

      if (error) {
        flash(error.message, 8000);
        return;
      }

      flash('Ringtone removed');
      await loadRingtones(user.id);
      await loadPool(user.id);
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return <p style={{ padding: 24 }}>Please sign in</p>;
  }

  return (
    <>
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {profile?.friend_code && (
        <p
          style={{
            marginBottom: 24,
            fontSize: 13,
            color: '#666',
          }}
        >
          Your code:{' '}
          <strong style={{ letterSpacing: '0.1em' }}>
            {profile.friend_code}
          </strong>
        </p>
      )}

      {msg && (
        <p
          style={{
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {msg}
        </p>
      )}

      {/* ── Alarm List ── */}
      <section style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              margin: 0,
            }}
          >
            Your Alarms
          </h2>
          <button
            type="button"
            onClick={openNewAlarmModal}
            disabled={busy === 'alarm'}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + New alarm
          </button>
        </div>

        {alarms.length === 0 ? (
          <p style={{ fontSize: 14, color: '#aaa' }}>
            No alarms yet — tap <strong>New alarm</strong> to schedule one.
          </p>
        ) : (
          alarms.map(alarm => {
            const d = new Date(alarm.scheduled_at);
            const upcoming = alarm.enabled !== false;
            const rep = formatRepeatSummary(alarm.repeat_weekdays);

            return (
              <div
                key={alarm.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  opacity: upcoming ? 1 : 0.58,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    {d.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#888',
                      marginTop: 6,
                    }}
                  >
                    {d.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  {rep ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#555',
                        marginTop: 6,
                        fontWeight: 600,
                      }}
                    >
                      {rep}
                    </div>
                  ) : null}
                  {!upcoming ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#c00',
                        marginTop: 6,
                        fontWeight: 600,
                      }}
                    >
                      Finished
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontSize: 12,
                      color: '#aaa',
                      marginTop: 8,
                      fontStyle: 'italic',
                    }}
                  >
                    Mystery ringtone — chosen when it rings
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEditAlarmModal(alarm)}
                    disabled={busy === 'delete'}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      background: '#f5f5f5',
                      color: '#111',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAlarm(alarm.id)}
                    disabled={busy === 'delete'}
                    style={{
                      padding: '8px 14px',
                      fontSize: 13,
                      background: '#fff',
                      color: '#c00',
                      border: '1px solid #fcc',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ── Schedule / edit modal ── */}
      {alarmModalOpen && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 'max(16px, env(safe-area-inset-bottom))',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) closeAlarmModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alarm-modal-title"
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 20,
              padding: '24px 20px 28px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              id="alarm-modal-title"
              style={{
                fontSize: 20,
                fontWeight: 650,
                margin: '0 0 8px',
              }}
            >
              {editingAlarmId ? 'Edit alarm' : 'New alarm'}
            </h2>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 20px' }}>
              Time is all you set — a random tone from a friend plays when it
              fires.
            </p>

            <AlarmPicker value={drumTime} onChange={setDrumTime} />

            <label
              htmlFor="alarm-modal-date"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#555',
                marginBottom: 8,
                marginTop: 8,
              }}
            >
              Date
            </label>
            <input
              id="alarm-modal-date"
              type="date"
              value={alarmDate}
              onChange={e => setAlarmDate(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 10,
                marginBottom: 24,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={closeAlarmModal}
                disabled={busy === 'alarm'}
                style={{
                  flex: 1,
                  padding: 14,
                  fontSize: 15,
                  background: '#f0f0f0',
                  color: '#222',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAlarmFromModal}
                disabled={busy === 'alarm'}
                style={{
                  flex: 1,
                  padding: 14,
                  fontSize: 15,
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {busy === 'alarm'
                  ? 'Saving…'
                  : editingAlarmId
                    ? 'Save'
                    : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Friends ── */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 18,
            margin: '0 0 12px',
          }}
        >
          Friends
        </h2>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            placeholder="Friend code"
            value={friendCode}
            maxLength={6}
            onChange={e =>
              setFriendCode(
                e.target.value.toUpperCase()
              )
            }
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 16,
              border: 'none',
              borderBottom: '1px solid #ddd',
              outline: 'none',
            }}
          />

          <button
            onClick={addFriend}
            disabled={busy === 'friend'}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            {busy === 'friend' ? '…' : 'Add'}
          </button>
        </div>

        {friends.length === 0 ? (
          <p style={{ fontSize: 14, color: '#aaa' }}>
            No friends yet
          </p>
        ) : (
          friends.map(f => (
            <div
              key={f.user_id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 15,
              }}
            >
              {f.full_name || f.email || 'Unknown'}
            </div>
          ))
        )}
      </section>

      {/* ── Ringtones ── */}
      <section>
        <h2
          style={{
            fontSize: 18,
            margin: '0 0 4px',
          }}
        >
          Your Ringtones
        </h2>

        <p
          style={{
            fontSize: 13,
            color: '#888',
            margin: '0 0 12px',
          }}
        >
          Uploaded ringtones become part of your friends' random alarm pools.
        </p>

        <input
          ref={uploadInputRef}
          id="ringtone-upload"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/mp4"
          onChange={e => {
            const f = e.target.files?.[0] ?? null;

            if (f && f.size > MAX_BYTES) {
              flash(`File too large — max ${MAX_MB} MB`);
              e.target.value = '';
              return;
            }

            setUploadFile(f);
          }}
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: 14,
          }}
        />

        <p
          style={{
            fontSize: 12,
            color: '#aaa',
            margin: '0 0 10px',
          }}
        >
          MP3 · WAV · M4A · OGG · max {MAX_MB} MB
        </p>

        <button
          onClick={uploadRingtone}
          disabled={!uploadFile || busy === 'upload'}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: uploadFile ? 'pointer' : 'default',
            opacity: uploadFile ? 1 : 0.4,
          }}
        >
          {busy === 'upload' ? 'Uploading…' : 'Upload'}
        </button>

        <div style={{ marginTop: 16 }}>
          {ringtones.length === 0 ? (
            <p style={{ fontSize: 14, color: '#aaa' }}>
              No ringtones yet
            </p>
          ) : (
            ringtones.map(r => (
              <div
                key={r.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 14,
                }}
              >
                {r.title}
              </div>
            ))
          )}
        </div>
      </section>
    </div>

    {alarmRinging && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-overlay-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(12, 12, 18, 0.52)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          id="alarm-overlay-title"
          style={{
            color: '#fff',
            fontSize: 52,
            fontWeight: 200,
            letterSpacing: '-0.02em',
            marginBottom: 12,
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          }}
        >
          Alarm
        </div>
        <p
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 17,
            fontWeight: 500,
            marginBottom: 48,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Ringing
        </p>
        <button
          ref={stopAlarmBtnRef}
          type="button"
          onClick={stopAlarmRinging}
          style={{
            minWidth: 260,
            padding: '18px 36px',
            fontSize: 18,
            fontWeight: 650,
            background: '#ff3b30',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
            boxShadow: '0 12px 40px rgba(255,59,48,0.45)',
          }}
        >
          Stop Alarm
        </button>
      </div>
    )}
    </>
  );
}
