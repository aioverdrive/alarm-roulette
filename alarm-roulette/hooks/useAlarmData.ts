"use client"

import { useCallback, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export function useAlarmData() {
  const [friends, setFriends] = useState<any[]>([]);
  const [ringtones, setRingtones] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [pool, setPool] = useState<any[]>([]);

  const loadPool = useCallback(async (uid: string) => {
    const { data: rows } = await supabaseBrowser
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    if (!rows?.length) { setPool([]); return; }

    const friendIds = rows.map(r => (r.user_id === uid ? r.friend_id : r.user_id));
    const { data } = await supabaseBrowser
      .from('ringtones')
      .select('*')
      .in('user_id', friendIds);

    setPool(data ?? []);
  }, []);

  const loadFriends = useCallback(async (uid: string) => {
    const { data: rows } = await supabaseBrowser
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    if (!rows?.length) { setFriends([]); return; }

    const ids = rows.map(r => (r.user_id === uid ? r.friend_id : r.user_id));
    const { data } = await supabaseBrowser
      .from('profiles')
      .select('*')
      .in('user_id', ids);

    setFriends(data ?? []);
    await loadPool(uid);
  }, [loadPool]);

  const loadRingtones = useCallback(async (uid: string) => {
    const { data } = await supabaseBrowser
      .from('ringtones')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    setRingtones(data ?? []);
  }, []);

  const loadAlarms = useCallback(async (uid: string) => {
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
  }, []);

  return {
    friends,
    ringtones,
    alarms,
    pool,
    loadFriends,
    loadRingtones,
    loadAlarms,
    loadPool,
  };
}
