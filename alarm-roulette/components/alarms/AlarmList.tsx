"use client"

import { AlarmCard } from './AlarmCard';

interface AlarmListProps {
  alarms: any[];
  pool: any[];
  friends: any[];
  busyDelete: boolean;
  busyToggle: string | null;
  onNewAlarm: () => void;
  onEditAlarm: (alarm: any) => void;
  onDeleteAlarm: (id: string) => void;
  onToggleAlarm: (alarm: any) => void;
}

export function AlarmList({
  alarms,
  pool,
  friends,
  busyDelete,
  busyToggle,
  onNewAlarm,
  onEditAlarm,
  onDeleteAlarm,
  onToggleAlarm,
}: AlarmListProps) {
  return (
    <section className="alarm-section">
      {alarms.length === 0 ? (
        <p className="alarm-section__empty">
          No alarms yet. Tap below to schedule one.
        </p>
      ) : (
        alarms.map(alarm => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            pool={pool}
            friends={friends}
            busyDelete={busyDelete}
            busyToggle={busyToggle === alarm.id}
            onEdit={() => onEditAlarm(alarm)}
            onDelete={() => onDeleteAlarm(alarm.id)}
            onToggleActive={() => onToggleAlarm(alarm)}
          />
        ))
      )}

      <button
        type="button"
        onClick={onNewAlarm}
        className="btn-new-alarm margin-top"
      >
        + New Alarm
      </button>
    </section>
  );
}
