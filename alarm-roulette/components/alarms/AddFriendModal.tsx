"use client"

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

interface Props {
  myCode: string;
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddFriendModal({ myCode, userId, onClose, onAdded }: Props) {
  const [friendCode, setFriendCode] = useState('');
  const [msg, setMsg]               = useState('');
  const [busy, setBusy]             = useState(false);
  const [copied, setCopied]         = useState(false);

  const flash = (m: string) => setMsg(m);

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addFriend = async () => {
    if (!friendCode.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const { data: fp, error: fe } = await supabaseBrowser
        .from('profiles').select('user_id, full_name')
        .eq('friend_code', friendCode.trim().toUpperCase()).single();
      if (fe || !fp) { flash('Friend code not found'); return; }
      if (fp.user_id === userId) { flash("That's your own code"); return; }

      const { data: existing } = await supabaseBrowser
        .from('friends').select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${fp.user_id}),and(user_id.eq.${fp.user_id},friend_id.eq.${userId})`)
        .maybeSingle();
      if (existing) { flash('Already friends'); return; }

      const { error } = await supabaseBrowser
        .from('friends').insert({ user_id: userId, friend_id: fp.user_id });
      if (error) { flash(error.message); return; }

      onAdded();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        padding: '0 24px',
      }}
    >
      {/* Sheet — stop clicks propagating to backdrop */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#fafafa', margin: 0 }}>
            Add a Friend
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Your code */}
        <div>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', color: '#aaa', marginBottom: '8px' }}>
            YOUR FRIEND CODE
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{
              flex: 1,
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.6rem',
              letterSpacing: '0.25em',
              color: '#FCBA04',
              margin: 0,
              background: 'rgba(252,186,4,0.08)',
              borderRadius: '10px',
              padding: '10px 0',
              textAlign: 'center',
            }}>
              {myCode}
            </p>
            <button
              type="button"
              onClick={copyCode}
              title="Copy code"
              style={{
                background: copied ? '#FCBA04' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '10px',
                color: copied ? '#010101' : '#fafafa',
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', color: '#555' }}>OR</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        {/* Enter a code */}
        <div>
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', color: '#aaa', marginBottom: '8px' }}>
            ENTER THEIR CODE
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="ABC123"
              value={friendCode}
              maxLength={6}
              onChange={e => setFriendCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fafafa',
                padding: '10px 14px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '0.12em',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={addFriend}
              disabled={busy || !friendCode.trim()}
              style={{
                background: '#A50104',
                border: 'none',
                color: '#fafafa',
                borderRadius: '8px',
                padding: '10px 22px',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                opacity: busy || !friendCode.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {busy ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {msg && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#FCBA04', margin: 0 }}>{msg}</p>
        )}
      </div>
    </div>
  );
}
