"use client"

import { useEffect, useRef } from 'react';
import { HOURS, MINUTES, PERIODS } from '@/lib/alarmUtils';

const ITEM_H = 44;

export interface DrumTime {
  hour: string;
  minute: string;
  period: string;
}

function DrumColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
  }, [selected, items]);

  const onScroll = () => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped] !== selected) onSelect(items[clamped]);
  };

  return (
    <div style={{ position: 'relative', width: 72, height: ITEM_H * 3, overflow: 'hidden' }}>
      {/* Selection highlight matching the card border style */}
      <div
        style={{
          position: 'absolute',
          top: ITEM_H,
          left: 0,
          right: 0,
          height: ITEM_H,
          borderTop: '1px solid rgba(252,186,4,0.5)',
          borderBottom: '1px solid rgba(252,186,4,0.5)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H,
          paddingBottom: ITEM_H,
          scrollbarWidth: 'none',
        }}
      >
        {items.map(v => (
          <div
            key={v}
            onClick={() => onSelect(v)}
            style={{
              height: ITEM_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: 22,
              fontWeight: v === selected ? 600 : 400,
              color: v === selected ? '#FCBA04' : 'rgba(250,250,250,0.35)',
              cursor: 'pointer',
              userSelect: 'none',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlarmPicker({
  value,
  onChange,
}: {
  value: DrumTime;
  onChange: (v: DrumTime) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '12px 0' }}>
      <DrumColumn items={HOURS} selected={value.hour} onSelect={h => onChange({ ...value, hour: h })} />
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, fontWeight: 600, color: '#FCBA04' }}>:</div>
      <DrumColumn items={MINUTES} selected={value.minute} onSelect={m => onChange({ ...value, minute: m })} />
      <DrumColumn items={PERIODS} selected={value.period} onSelect={p => onChange({ ...value, period: p })} />
    </div>
  );
}