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
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alarm-modal-title"
        className="modal"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="alarm-modal-title" className="modal__title">
          {editingAlarmId ? 'Edit Alarm' : 'New Alarm'}
        </h2>
        <p className="modal__subtitle">
          A random sound from your friends will play — you won't know which one.
        </p>

        <AlarmPicker value={drumTime} onChange={onDrumTimeChange} />

        {/* Repeat toggle */}
        <div className="modal__repeat-row">
          <span className="modal__repeat-label">Repeat</span>
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
          <div className="modal__weekday-picker">
            {WEEKDAY_PRESETS.map(({ d, short }) => (
              <button
                key={d}
                type="button"
                onClick={() => onToggleRepeatDay(d)}
                className={`btn-weekday ${repeatDays.includes(d) ? 'btn-weekday--active' : ''}`}
              >
                {short}
              </button>
            ))}
          </div>
        )}

        {/* Date (one-shot only) */}
        {!repeatEnabled && (
          <>
            <label htmlFor="alarm-modal-date" className="modal__date-label">
              Date
            </label>
            <input
              id="alarm-modal-date"
              type="date"
              value={alarmDate}
              onChange={e => onDateChange(e.target.value)}
              className="modal__date-input"
            />
          </>
        )}

        <div className="modal__actions">
          <button type="button" onClick={onClose} disabled={busy} className="btn-modal-cancel">
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={busy} className="btn-modal-save">
            {busy ? 'Saving…' : editingAlarmId ? 'Save' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}