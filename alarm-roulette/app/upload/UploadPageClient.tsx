"use client"

import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ensureProfileForUser } from '@/lib/ensureProfile';
import { inferAudioContentType, ringtoneObjectPathFromPublicUrl, MAX_MB, MAX_BYTES } from '@/lib/audioUtils';
import { useAlarmData } from '@/hooks/useAlarmData';

export default function UploadPageClient() {
  const [user, setUser]           = useState<User | null>(null);
  const [msg, setMsg]             = useState('');
  const [busy, setBusy]           = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const flash = (m: string, ms = 3500) => { setMsg(m); window.setTimeout(() => setMsg(''), ms); };

  const { ringtones, loadRingtones, loadPool } = useAlarmData();

  useEffect(() => {
    let cancelled = false;
    const applySession = async (session: Session | null) => {
      if (!session?.user) { if (!cancelled) setUser(null); return; }
      await ensureProfileForUser(session.user);
      if (cancelled) return;
      setUser(session.user);
      loadRingtones(session.user.id);
    };
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => void applySession(session));
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_e, s) => void applySession(s));
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const uploadRingtone = async () => {
    if (!uploadFile || !user) return;
    if (uploadFile.size > MAX_BYTES) { flash(`File too large — max ${MAX_MB} MB`); return; }
    setBusy(true);
    try {
      const ext = uploadFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: ue } = await supabaseBrowser.storage
        .from('ringtones').upload(filePath, uploadFile, {
          contentType: inferAudioContentType(uploadFile), upsert: false,
        });
      if (ue) { flash(`Upload failed: ${ue.message}`, 8000); return; }
      const { data: { publicUrl } } = supabaseBrowser.storage.from('ringtones').getPublicUrl(filePath);
      const { error: de } = await supabaseBrowser.from('ringtones').insert({
        user_id: user.id, title: uploadFile.name, file_path: publicUrl,
      });
      if (de) { flash(`Saved file but database error: ${de.message}`, 8000); return; }
      flash('Uploaded!');
      setUploadFile(null);
      if (inputRef.current) inputRef.current.value = '';
      loadRingtones(user.id);
      await loadPool(user.id);
    } finally { setBusy(false); }
  };

  const deleteRingtone = async (r: { id: string; title: string; file_path: string }) => {
    if (!user) return;
    const path = ringtoneObjectPathFromPublicUrl(r.file_path);
    if (path) await supabaseBrowser.storage.from('ringtones').remove([path]);
    const { error } = await supabaseBrowser.from('ringtones').delete().eq('id', r.id).eq('user_id', user.id);
    if (error) { flash(error.message, 8000); return; }
    flash('Removed');
    loadRingtones(user.id);
    await loadPool(user.id);
  };

  if (!user) return <p style={{ padding: 24, textAlign: 'center' }}>Please sign in</p>;

  return (
    <>
      <h1 className="margin-top">Upload your sound!</h1>

      {msg && (
        <p style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.9rem', color: '#FCBA04' }}>{msg}</p>
      )}

      {/* Card 1: Record */}
      <div className="bg-icon-card center margin-top-half" style={{ padding: '20px 0 16px' }}>
        <i className="fa-solid fa-microphone fa-5x center margin-top" />
        <p className="recording-instructions margin-vertical">
          Press the big microphone to start recording.
        </p>
      </div>

      {/* Tip 1 */}
      <p className="poppins-semibold-italic margin-vertical tip-text">
        Stuck? Consider:<br />
        Beatbox so badly that your friend has no choice but to turn it off
      </p>

      {/* Card 2: Upload file */}
      <div
        className="bg-icon-card center"
        style={{ padding: '20px 0 16px', cursor: 'pointer' }}
        onClick={() => inputRef.current?.click()}
      >
        <i className="fa-solid fa-upload fa-5x center margin-top" />
        <p className="recording-instructions margin-vertical">
          {uploadFile ? uploadFile.name : 'Or upload an audio file.'}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/mp4"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > MAX_BYTES) { flash(`File too large — max ${MAX_MB} MB`); e.target.value = ''; return; }
            setUploadFile(f);
          }}
        />

        {uploadFile && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void uploadRingtone(); }}
            disabled={busy}
            style={{
              background: '#A50104',
              border: 'none',
              color: '#fafafa',
              borderRadius: '8px',
              padding: '8px 28px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '10px',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        )}

        <p style={{ fontSize: '0.7rem', opacity: 0.5, paddingBottom: '8px' }}>
          MP3 · WAV · M4A · OGG · max {MAX_MB} MB
        </p>
      </div>

      {/* Tip 2 */}
      <p className="poppins-semibold-italic margin-vertical tip-text">
        Stuck? Consider:<br />
        Literally just fart noises.
      </p>

      {/* Existing uploads */}
      {ringtones.length > 0 && (
        <div style={{ width: '90%', margin: '0 auto 20px' }}>
          <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '8px', textAlign: 'center' }}>
            Your uploads
          </p>
          {ringtones.map(r => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(2,102,0,0.5)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{r.title}</span>
              <button
                type="button"
                onClick={() => void deleteRingtone(r)}
                style={{
                  background: 'transparent',
                  border: '1px solid #A50104',
                  color: '#A50104',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
