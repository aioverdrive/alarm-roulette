"use client"

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ensureProfileForUser } from '@/lib/ensureProfile';
import { useAlarmData } from '@/hooks/useAlarmData';
import AddFriendModal from '@/components/alarms/AddFriendModal';

export default function FriendsPageClient() {
  const [user, setUser]           = useState<User | null>(null);
  const [myCode, setMyCode]       = useState('');
  const [showModal, setShowModal] = useState(false);

  const { friends, loadFriends } = useAlarmData();

  useEffect(() => {
    let cancelled = false;
    const applySession = async (session: Session | null) => {
      if (!session?.user) { if (!cancelled) setUser(null); return; }
      await ensureProfileForUser(session.user);
      if (cancelled) return;
      setUser(session.user);
      loadFriends(session.user.id);

      const { data: profile } = await supabaseBrowser
        .from('profiles').select('friend_code')
        .eq('user_id', session.user.id).single();
      if (profile?.friend_code && !cancelled) setMyCode(profile.friend_code);
    };
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => void applySession(session));
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_e, s) => void applySession(s));
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (!user) return <p style={{ padding: 24, textAlign: 'center' }}>Please sign in</p>;

  return (
    <>
      <h1 className="margin-top">Who is in your Alarm Roulette?</h1>

            <div className="center margin-top" style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            background: '#fafafa',
            color: '#010101',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 22px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fa-solid fa-person-circle-plus" />
          Add Friend
        </button>
      </div>
      
      <div style={{ width: '90%', margin: '16px auto 0' }}>
        {friends.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.6, marginTop: '20px' }}>
            No friends yet — add one with their friend code!
          </p>
        ) : (
          friends.map(f => (
            <div
              key={f.user_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#A50104',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#fafafa',
                flexShrink: 0,
              }}>
                {(f.full_name || f.email || '?')[0].toUpperCase()}
              </div>
              <p style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                margin: 0,
              }}>
                {f.full_name || f.email || 'Friend'}
              </p>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <AddFriendModal
          myCode={myCode}
          userId={user.id}
          onClose={() => setShowModal(false)}
          onAdded={() => loadFriends(user.id)}
        />
      )}
    </>
  );
}