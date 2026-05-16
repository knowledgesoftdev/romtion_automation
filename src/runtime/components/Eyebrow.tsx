import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn, slideInX } from '../animations';
import { FONT_MONO, CYAN } from '../tokens';

export const Eyebrow: React.FC<{ text: string; accent?: string; delay?: number }> = ({
  text, accent = CYAN, delay = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      fontFamily: FONT_MONO,
      fontSize: 20, color: accent,
      letterSpacing: 4, textTransform: 'uppercase',
      opacity: fadeIn(frame, delay, 14),
      transform: `translateX(${slideInX(frame, delay, 18, -20)}px)`,
      marginBottom: 14,
    }}>
      [ {text} ]
    </div>
  );
};
