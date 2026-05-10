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
      className="alarm-ringing"
    >
      <div id="alarm-overlay-title" className="alarm-ringing__title">
        Alarm Roulette
      </div>
      <p className="alarm-ringing__subtitle">Ringing</p>
      <button ref={btnRef} type="button" onClick={onStop} className="btn-stop">
        Stop Alarm
      </button>
    </div>
  );
}