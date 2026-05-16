import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn, grow } from '../animations';
import { FONT_SANS, FONT_MONO, TEXT, MUTED, CYAN } from '../tokens';

interface Props {
  bars: Array<{ label: string; value: number }>;
  max?: number;
  accent?: string;
}

export const BarChart: React.FC<Props> = ({ bars, max, accent = CYAN }) => {
  const frame = useCurrentFrame();
  const ceiling = max ?? Math.max(...bars.map(b => b.value));
  const capped = bars.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
      {capped.map((b, i) => {
        const delay = 14 + i * 8;
        const widthPct = (b.value / ceiling) * 100;
        const drawn = grow(frame, delay, 24) * widthPct;
        return (
          <div key={i} style={{
            opacity: fadeIn(frame, delay, 12),
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: FONT_SANS, color: TEXT, fontSize: 22, fontWeight: 500 }}>
                {b.label}
              </span>
              <span style={{ fontFamily: FONT_MONO, color: accent, fontSize: 22, fontWeight: 600 }}>
                {b.value}
              </span>
            </div>
            <div style={{
              width: '100%', height: 14,
              background: 'rgba(148, 163, 184, 0.12)',
              borderRadius: 7, overflow: 'hidden',
            }}>
              <div style={{
                width: `${drawn}%`, height: '100%',
                background: `linear-gradient(90deg, ${accent}aa, ${accent})`,
                boxShadow: `0 0 16px ${accent}66`,
                borderRadius: 7,
                transition: 'none',
              }} />
            </div>
          </div>
        );
      })}
      <span style={{ color: MUTED, display: 'none' }} />
    </div>
  );
};
