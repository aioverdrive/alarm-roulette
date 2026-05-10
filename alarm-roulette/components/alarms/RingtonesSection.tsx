"use client"

import { useRef } from 'react';
import { MAX_MB, MAX_BYTES } from '@/lib/audioUtils';

interface RingtonesSectionProps {
  ringtones: any[];
  uploadFile: File | null;
  busy: boolean;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  onDelete: (r: { id: string; title: string; file_path: string }) => void;
  flash: (msg: string) => void;
  onRecord?: () => void;
}

export function RingtonesSection({
  ringtones,
  uploadFile,
  busy,
  onFileChange,
  onUpload,
  onDelete,
  flash,
  onRecord,
}: RingtonesSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h1 className="margin-top">Upload your sound!</h1>

      {/* Card 1: Microphone / record — matches screenshot top green card */}
      <div
        className="bg-icon-card center margin-top-half"
        style={{ padding: '20px 0 16px', cursor: 'pointer' }}
        onClick={onRecord}
      >
        <i
          className="fa-solid fa-microphone fa-5x center margin-top"
          style={{ color: '#fafafa' }}
        />
        <p className="recording-instructions margin-vertical">
          Press the big microphone to start recording.
        </p>
      </div>

      {/* Tip 1 */}
      <p
        className="poppins-semibold-italic margin-vertical tip-text"
        style={{ fontStyle: 'italic' }}
      >
        Stuck? Consider:
        <br />
        Beatbox so badly that your friend has no choice but to turn it off
      </p>

      {/* Card 2: Upload file — matches screenshot bottom green card */}
      <div
        className="bg-icon-card center"
        style={{ padding: '20px 0 16px', cursor: 'pointer' }}
        onClick={() => inputRef.current?.click()}
      >
        <i
          className="fa-solid fa-upload fa-5x center margin-top"
          style={{ color: '#fafafa' }}
        />
        <p className="recording-instructions margin-vertical">
          {uploadFile ? uploadFile.name : 'Or upload an audio file.'}
        </p>

        <input
          ref={inputRef}
          id="ringtone-upload"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/mp4"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > MAX_BYTES) {
              flash(`File too large — max ${MAX_MB} MB`);
              e.target.value = '';
              return;
            }
            onFileChange(f);
          }}
        />

        {/* Show upload button only once file is chosen */}
        {uploadFile && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onUpload(); }}
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
              marginBottom: '12px',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        )}

        <p style={{ fontSize: '0.7rem', opacity: 0.5, paddingBottom: '4px' }}>
          MP3 · WAV · M4A · OGG · max {MAX_MB} MB
        </p>
      </div>

      {/* Tip 2 */}
      <p
        className="poppins-semibold-italic margin-vertical tip-text"
        style={{ fontStyle: 'italic' }}
      >
        Stuck? Consider:
        <br />
        Literally just fart noises.
      </p>

      {/* Existing ringtones list */}
      {ringtones.length > 0 && (
        <div style={{ width: '90%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '8px', opacity: 0.7 }}>Your uploads</h2>
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
                onClick={() => onDelete(r)}
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
    </section>
  );
}