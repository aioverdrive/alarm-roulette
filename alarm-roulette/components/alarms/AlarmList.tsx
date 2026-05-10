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
    <section style={{ paddingBottom: '20px' }}>
      <button
        type="button"
        onClick={onNewAlarm}
        style={{
          display: 'block',
          margin: '20px auto 0',
          background: 'rgba(2, 102, 0, 0.5)',
          border: 'none',
          color: '#fafafa',
          borderRadius: '1rem',
          padding: '12px 32px',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: 'pointer',
          width: '90%',
        }}
      >
        +  Alarm
      </button>

      {alarms.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.6, marginTop: '20px' }}>
          No alarms yet. Tap above to schedule one.
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
    </section>
  );
}