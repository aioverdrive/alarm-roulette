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
}

export function RingtonesSection({
  ringtones,
  uploadFile,
  busy,
  onFileChange,
  onUpload,
  onDelete,
  flash,
}: RingtonesSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section>
      <h2 className="ringtones-section__title">Your Ringtones</h2>
      <p className="ringtones-section__hint">
        Uploaded ringtones become part of your friends' random alarm pools.
      </p>

      <input
        ref={inputRef}
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
          onFileChange(f);
        }}
      />
      <p className="ringtones-section__format-hint">
        MP3 · WAV · M4A · OGG · max {MAX_MB} MB
      </p>

      <button
        type="button"
        onClick={onUpload}
        disabled={!uploadFile || busy}
        className="btn-primary"
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>

      <div className="ringtones-section__list">
        {ringtones.length === 0 ? (
          <p className="ringtones-section__empty">No ringtones yet</p>
        ) : (
          ringtones.map(r => (
            <div key={r.id} className="ringtone-item">
              <span>{r.title}</span>
              <button
                type="button"
                onClick={() => onDelete(r)}
                className="btn-remove"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}