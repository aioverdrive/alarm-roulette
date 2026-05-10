"use client"

import { normalizeWeekdays } from '@/lib/alarmUtils';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface AlarmCardProps {
  alarm: any;
  pool: any[];
  friends: any[];
  busyDelete: boolean;
  busyToggle: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function AlarmCard({
  alarm,
  pool,
  busyDelete,
  busyToggle,
  onEdit,
  onDelete,
  onToggleActive,
}: AlarmCardProps) {
  const d = new Date(alarm.scheduled_at);
  const isActive = alarm.enabled !== false;
  const rw = normalizeWeekdays(alarm.repeat_weekdays);

  const daysLabel = rw.length > 0
    ? DAY_LABELS.map((l, i) => (rw.includes(i) ? l : '·')).join(' ')
    : 'One-time';

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="alarm-card center margin-top-half">

      {/* Top row: schedule info left, toggle right */}
      <div className="alarm-info" style={{ padding: '14px 16px 0', alignItems: 'flex-start' }}>
        <div className="vertical-align">
          <p className="days-text">{daysLabel}</p>
          <p className="time-text">{timeStr}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div className="hk-toggle hk-tg-10">
            <input
              type="checkbox"
              id={`tg-${alarm.id}`}
              checked={isActive}
              disabled={busyToggle}
              onChange={onToggleActive}
            />
            <label htmlFor={`tg-${alarm.id}`} />
          </div>
          <p style={{ fontSize: '0.75rem' }}>
            {isActive ? 'Roulette Ready!' : 'Alarm Off'}
          </p>
        </div>
      </div>

      {/* Mystery message */}
      <div style={{ padding: '6px 16px 10px' }}>
        {pool.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: '0.85rem', padding: '6px 0' }}>
            No sounds uploaded by friends yet.
          </p>
        ) : (
          <p style={{ fontSize: '0.85rem', opacity: 0.7, fontStyle: 'italic' }}>
             {pool.length} ringtone{pool.length !== 1 ? 's' : ''} in the pool — you won&apos;t know which one plays until it rings.
          </p>
        )}
      </div>

      {/* Edit / Delete */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 16px 14px' }}>
        <button
          type="button"
          onClick={onEdit}
          disabled={busyDelete}
          style={{
            background: 'transparent',
            border: '1px solid #fafafa',
            color: '#fafafa',
            borderRadius: '8px',
            padding: '6px 24px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busyDelete}
          style={{
            background: '#A50104',
            border: 'none',
            color: '#fafafa',
            borderRadius: '8px',
            padding: '6px 24px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: busyDelete ? 0.6 : 1,
          }}
        >
          {busyDelete ? '…' : 'Delete'}
        </button>
      </div>

    </div>
  );
}