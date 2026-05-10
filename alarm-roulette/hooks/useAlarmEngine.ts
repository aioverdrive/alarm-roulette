"use client"

import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { normalizeWeekdays, computeNextRepeatISO } from '@/lib/alarmUtils';
import { randomPoolIndex } from '@/lib/audioUtils';

interface UseAlarmEngineOptions {
  alarms: any[];
  pool: any[];
  user: User | null;
  onRingStart: () => void;
  onRingNoPool: () => void;
  onRingError: () => void;
  onReloadAlarms: (uid: string) => void;
}

export function useAlarmEngine({
  alarms,
  pool,
  user,
  onRingStart,
  onRingNoPool,
  onRingError,
  onReloadAlarms,
}: UseAlarmEngineOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const poolRef = useRef<any[]>([]);
  const alarmsRef = useRef<any[]>([]);
  const userRef = useRef<User | null>(null);
  const busyRef = useRef(false);

  useEffect(() => { poolRef.current = pool; }, [pool]);
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);
  useEffect(() => { userRef.current = user; }, [user]);

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
  };

  // Interval-based engine — checks every second
  useEffect(() => {
    const tick = () => {
      if (busyRef.current) return;

      const now = Date.now();
      // Only fire alarms where enabled === true (user's active toggle)
      const toFire = alarmsRef.current.filter(
        a => a.enabled !== false && now >= new Date(a.scheduled_at).getTime()
      );
      if (!toFire.length) return;

      busyRef.current = true;
      const currentPool = poolRef.current;

      if (!currentPool.length) {
        onRingNoPool();
      } else {
        const picked = currentPool[randomPoolIndex(currentPool.length)]!;
        const audio = new Audio(picked.file_path);
        audio.loop = true;
        clearPlayback();
        audioRef.current = audio;
        void audio.play()
          .then(() => onRingStart())
          .catch(() => {
            onRingError();
          });
      }

      // Post-fire: advance repeat alarms; mark one-shots as finished (user deletes manually)
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
              // One-shot fired: mark disabled so it shows as "Finished" until user deletes it
              await supabaseBrowser
                .from('alarms')
                .update({ enabled: false })
                .eq('id', alarm.id);
            }
          }
          if (uid) onReloadAlarms(uid);
        } finally {
          busyRef.current = false;
        }
      })();
    };

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stopAlarmRinging };
}
