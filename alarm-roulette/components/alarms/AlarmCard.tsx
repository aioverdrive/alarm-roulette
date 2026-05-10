"use client"

import { normalizeWeekdays } from '@/lib/alarmUtils';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface AlarmCardProps {
  alarm: any;
  pool: any[];       // all friends' uploaded ringtones
  friends: any[];    // friend profile objects { user_id, full_name, email }
  busyDelete: boolean;
  busyToggle: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function AlarmCard({
  alarm,
  pool,
  friends,
  busyDelete,
  busyToggle,
  onEdit,
  onDelete,
  onToggleActive,
}: AlarmCardProps) {
  const d = new Date(alarm.scheduled_at);
  const isActive = alarm.enabled !== false;
  const rw = normalizeWeekdays(alarm.repeat_weekdays);

  // "S M T W T F S" — active days highlighted
  const daysLabel = rw.length > 0
    ? DAY_LABELS.map((l, i) => (rw.includes(i) ? l : '·')).join(' ')
    : 'One-time';

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Match pool items to friend profiles for display
  const friendMap = new Map(friends.map(f => [f.user_id, f.full_name || f.email || 'Friend']));

  return (
    <div className="alarm-card center margin-top-half">

      {/* ── Top row: time + toggle ── */}
      <div className="alarm-info">
        <div className="vertical-align">
          <p className="days-text">{daysLabel}</p>
          <p className="time-text">{timeStr}</p>
        </div>
        <div className="alarm-checkbox">
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
          <p className="alarm-feedback">
            {isActive ? 'Roulette Ready!' : 'Alarm Off'}
          </p>
        </div>
      </div>

      {/* ── Friends who submitted ── */}
      <div className="friends-list">
        {pool.length === 0 ? (
          <p className="friends-empty">No sounds uploaded by friends yet.</p>
        ) : (
          pool.map(r => (
            <div key={r.id} className="friend-card">
              <div className="friend-avatar">🎵</div>
              <div>
                <p>
                  {friendMap.get(r.user_id) ?? 'A friend'} uploaded
                  <br />
                  <i>{r.title}</i>
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Edit / Delete ── */}
      <div className="alarm-card-actions">
        <button
          type="button"
          onClick={onEdit}
          disabled={busyDelete}
          className="btn-secondary"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busyDelete}
          className="btn-danger"
        >
          {busyDelete ? '…' : 'Delete'}
        </button>
      </div>

    </div>
  );
}
