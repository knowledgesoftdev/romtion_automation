import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn, springIn, slideUp } from '../animations';
import { FONT_SANS, FONT_MONO, MUTED, CYAN } from '../tokens';

interface Props {
  value: string;
  unit?: string;
  label: string;
  accent?: string;
  channelId?: string;
}

export const StatBlock: React.FC<Props> = ({ value, unit, label, accent = CYAN, channelId }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = springIn(frame, 10, fps, { damping: 12, stiffness: 90 });
  const isCinematic = channelId === 'phantom-directive';
  const statColor = isCinematic ? '#ffffff' : accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        opacity: fadeIn(frame, 10, 14),
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
      }}>
        <span style={{
          fontFamily: FONT_SANS, color: statColor, fontSize: 168, fontWeight: 800,
          lineHeight: 0.95, letterSpacing: -3,
          textShadow: isCinematic ? 'none' : `0 0 48px ${accent}55`,
        }}>{value}</span>
        {unit && (
          <span style={{
            fontFamily: FONT_MONO, color: statColor, fontSize: 42, fontWeight: 600,
            opacity: 0.85,
          }}>{unit}</span>
        )}
      </div>
      <div style={{
        fontFamily: FONT_SANS, color: MUTED, fontSize: 26, fontWeight: 500,
        letterSpacing: 0.5, marginTop: 8,
        opacity: fadeIn(frame, 28, 14),
        transform: `translateY(${slideUp(frame, 28, 18)}px)`,
        maxWidth: 520,
      }}>{label}</div>
    </div>
  );
};
