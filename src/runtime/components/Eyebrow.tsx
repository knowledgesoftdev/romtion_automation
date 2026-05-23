import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn, slideInX } from '../animations';
import { FONT_MONO, FONT_SANS, CYAN } from '../tokens';

export const Eyebrow: React.FC<{ text: string; accent?: string; delay?: number; channelId?: string }> = ({
  text, accent = CYAN, delay = 0, channelId,
}) => {
  const frame = useCurrentFrame();
  const isCinematic = channelId === 'phantom-directive';
  return (
    <div style={{
      fontFamily: isCinematic ? FONT_SANS : FONT_MONO,
      fontSize: isCinematic ? 24 : 20, color: isCinematic ? '#94a3b8' : accent,
      letterSpacing: isCinematic ? 2 : 4, textTransform: 'uppercase',
      opacity: fadeIn(frame, delay, 14),
      transform: `translateX(${slideInX(frame, delay, 18, -20)}px)`,
      marginBottom: isCinematic ? 16 : 14,
      fontWeight: isCinematic ? 700 : 'normal',
    }}>
      {isCinematic ? text : `[ ${text} ]`}
    </div>
  );
};
