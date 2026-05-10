"use client"

import { AlarmPicker, type DrumTime } from './DrumPicker';
import { WEEKDAY_PRESETS } from '@/lib/alarmUtils';

interface AlarmModalProps {
  isOpen: boolean;
  editingAlarmId: string | null;
  drumTime: DrumTime;
  alarmDate: string;
  repeatEnabled: boolean;
  repeatDays: number[];
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onDrumTimeChange: (v: DrumTime) => void;
  onDateChange: (d: string) => void;
  onRepeatEnabledChange: (v: boolean) => void;
  onToggleRepeatDay: (day: number) => void;
}

export function AlarmModal({
  isOpen,
  editingAlarmId,
  drumTime,
  alarmDate,
  repeatEnabled,
  repeatDays,
  busy,
  onClose,
  onSave,
  onDrumTimeChange,
  onDateChange,
  onRepeatEnabledChange,
  onToggleRepeatDay,
}: AlarmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-modal-title"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#010101',
          border: '1px solid rgba(2, 102, 0, 0.5)',
          borderRadius: '1rem 1rem 0 0',
          width: '100%',
          maxWidth: '480px',
          padding: '24px 20px 32px',
          fontFamily: 'Poppins, sans-serif',
          color: '#fafafa',
        }}
      >
        <h2
          id="alarm-modal-title"
          style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '6px' }}
        >
          {editingAlarmId ? 'Edit Alarm' : 'New Alarm'}
        </h2>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.65, marginBottom: '16px' }}>
          A random sound from your friends will play — you won't know which one.
        </p>

        <AlarmPicker value={drumTime} onChange={onDrumTimeChange} />

        {/* Repeat toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
          <span style={{ fontWeight: 600 }}>Repeat</span>
          <div className="hk-toggle hk-tg-10">
            <input
              type="checkbox"
              id="modal-repeat-toggle"
              checked={repeatEnabled}
              onChange={() => onRepeatEnabledChange(!repeatEnabled)}
            />
            <label htmlFor="modal-repeat-toggle" />
          </div>
        </div>

        {/* Weekday chips */}
        {repeatEnabled && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {WEEKDAY_PRESETS.map(({ d, short }) => (
              <button
                key={d}
                type="button"
                onClick={() => onToggleRepeatDay(d)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1px solid #fafafa',
                  background: repeatDays.includes(d) ? '#A50104' : 'transparent',
                  color: '#fafafa',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {short}
              </button>
            ))}
          </div>
        )}

        {/* Date (one-shot only) */}
        {!repeatEnabled && (
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="alarm-modal-date"
              style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}
            >
              Date
            </label>
            <input
              id="alarm-modal-date"
              type="date"
              value={alarmDate}
              onChange={e => onDateChange(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fafafa',
                padding: '8px 12px',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '1rem',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid #fafafa',
              color: '#fafafa',
              borderRadius: '8px',
              padding: '10px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            style={{
              flex: 1,
              background: 'rgba(2, 102, 0, 0.5)',
              border: 'none',
              color: '#fafafa',
              borderRadius: '8px',
              padding: '10px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving…' : editingAlarmId ? 'Save' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}