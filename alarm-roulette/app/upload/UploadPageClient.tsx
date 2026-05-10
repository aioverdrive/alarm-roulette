"use client"

import { useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { ensureProfileForUser } from '@/lib/ensureProfile';
import { inferAudioContentType, ringtoneObjectPathFromPublicUrl, MAX_MB, MAX_BYTES } from '@/lib/audioUtils';
import { useAlarmData } from '@/hooks/useAlarmData';

type RecordState = 'idle' | 'recording' | 'recorded';

export default function UploadPageClient() {
  const [user, setUser]             = useState<User | null>(null);
  const [msg, setMsg]               = useState('');
  const [busy, setBusy]             = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Recording state
  const [recordState, setRecordState]   = useState<RecordState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl]   = useState<string | null>(null); // ← stable object URL
  const [recordingMs, setRecordingMs]   = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef         = useRef<HTMLAudioElement | null>(null);

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

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob); // ← create once, store in state
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordState('recorded');
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecordingMs(0);
      setRecordState('recording');
      timerRef.current = setInterval(() => setRecordingMs(ms => ms + 100), 100);
    } catch {
      flash('Microphone access denied — please allow mic permissions and try again');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const discardRecording = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current.load(); }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordState('idle');
    setRecordingMs(0);
  };

  const uploadRecording = async () => {
    if (!recordedBlob || !user) return;
    if (recordedBlob.size > MAX_BYTES) { flash(`Recording too large — max ${MAX_MB} MB`); return; }
    setBusy(true);
    try {
      const ext = recordedBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: ue } = await supabaseBrowser.storage
        .from('ringtones').upload(filePath, recordedBlob, {
          contentType: recordedBlob.type, upsert: false,
        });
      if (ue) { flash(`Upload failed: ${ue.message}`, 8000); return; }
      const { data: { publicUrl } } = supabaseBrowser.storage.from('ringtones').getPublicUrl(filePath);
      const title = `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const { error: de } = await supabaseBrowser.from('ringtones').insert({
        user_id: user.id, title, file_path: publicUrl,
      });
      if (de) { flash(`Saved file but database error: ${de.message}`, 8000); return; }
      flash('Recording uploaded!');
      discardRecording(); // also revokes the object URL
      loadRingtones(user.id);
      await loadPool(user.id);
    } finally { setBusy(false); }
  };

  // ── File upload ────────────────────────────────────────────────────────────

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

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!user) return <p style={{ padding: 24, textAlign: 'center' }}>Please sign in</p>;

  return (
    <>
      <h1 className="margin-top">Upload your sound!</h1>

      {msg && (
        <p style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.9rem', color: '#FCBA04' }}>{msg}</p>
      )}

      {/* Card 1: Record */}
      <div className="bg-icon-card center margin-top-half" style={{ padding: '28px 16px 20px' }}>

        {/* Idle — big mic button */}
        {recordState === 'idle' && (
          <>
            <button
              type="button"
              onClick={startRecording}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#fafafa',
                display: 'block',
                margin: '0 auto',
              }}
            >
              <i className="fa-solid fa-microphone fa-5x" />
            </button>
            <p className="recording-instructions margin-vertical">
              Press the big microphone to start recording.
            </p>
          </>
        )}

        {/* Recording — pulsing mic + timer + stop */}
        {recordState === 'recording' && (
          <>
            <button
              type="button"
              onClick={stopRecording}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#FCBA04',
                display: 'block',
                margin: '0 auto',
                animation: 'pulse-mic 1s ease-in-out infinite',
              }}
            >
              <i className="fa-solid fa-microphone fa-5x" />
            </button>
            <p style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.8rem',
              color: '#FCBA04',
              margin: '12px 0 4px',
              letterSpacing: '0.05em',
            }}>
              {formatMs(recordingMs)}
            </p>
            <p className="recording-instructions" style={{ marginBottom: '8px' }}>
              Tap to stop recording.
            </p>
          </>
        )}

        {/* Recorded — preview + upload/discard */}
        {recordState === 'recorded' && recordedBlob && (
          <>
            <i className="fa-solid fa-circle-check fa-4x" style={{ color: '#FCBA04', display: 'block', margin: '0 auto' }} />
            <p className="recording-instructions margin-vertical">
              {formatMs(recordingMs)} recorded
            </p>
            <audio
              controls
              src={recordedUrl ?? ''}  // ← stable reference, no new URL per render
              style={{ width: '85%', margin: '0 auto 14px', display: 'block' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={discardRecording}
                disabled={busy}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fafafa',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void uploadRecording()}
                disabled={busy}
                style={{
                  background: 'rgba(2,102,0,1)',
                  border: 'none',
                  color: '#fafafa',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? 'Uploading…' : 'Use this'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.12); opacity: 0.7; }
        }
      `}</style>

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
              background: 'rgba(2,102,0,1)',
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
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fafafa',
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