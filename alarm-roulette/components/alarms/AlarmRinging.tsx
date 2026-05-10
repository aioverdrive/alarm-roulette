"use client"

import { useEffect, useRef } from 'react';

interface AlarmRingingProps {
  visible: boolean;
  onStop: () => void;
}

export function AlarmRinging({ visible, onStop }: AlarmRingingProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    btnRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-overlay-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#010101',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        fontFamily: 'Poppins, sans-serif',
        color: '#fafafa',
      }}
    >
      <h1
        id="alarm-overlay-title"
        style={{
          fontFamily: "'Las Vegas', sans-serif",
          fontSize: '3rem',
          color: '#FCBA04',
          marginBottom: '8px',
        }}
      >
        Alarm Roulette
      </h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '48px' }}>
        Ringing…
      </p>
      <button
        ref={btnRef}
        type="button"
        onClick={onStop}
        style={{
          background: '#A50104',
          border: 'none',
          color: '#fafafa',
          borderRadius: '1rem',
          padding: '14px 48px',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 600,
          fontSize: '1.1rem',
          cursor: 'pointer',
        }}
      >
        Stop Alarm
      </button>
    </div>
  );
}