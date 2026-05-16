import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn, slideUp, popIn } from '../animations';
import { FONT_SANS, TEXT, CYAN } from '../tokens';

interface Props {
  items: string[];
  accent?: string;
  baseDelay?: number;
  stagger?: number;
}

export const Bullets: React.FC<Props> = ({ items, accent = CYAN, baseDelay = 20, stagger = 11 }) => {
  const frame = useCurrentFrame();
  const capped = items.slice(0, 4);
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {capped.map((item, i) => {
        const d = baseDelay + i * stagger;
        return (
          <li key={i} style={{
            display: 'flex', gap: 16, alignItems: 'flex-start',
            opacity: fadeIn(frame, d, 14),
            transform: `translateY(${slideUp(frame, d, 18)}px)`,
          }}>
            <span style={{
              minWidth: 10, width: 10, height: 10, borderRadius: 2,
              background: accent, marginTop: 14,
              transform: `scale(${popIn(frame, d, 22)})`,
              boxShadow: `0 0 14px ${accent}aa`,
            }} />
            <span style={{
              fontFamily: FONT_SANS, color: TEXT,
              fontSize: 30, lineHeight: 1.35, fontWeight: 500,
            }}>
              {item}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
