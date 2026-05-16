import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn, slideInX, popIn } from '../animations';
import { FONT_SANS, TEXT, CYAN } from '../tokens';

interface Props {
  keywords: string[];
  /** Position anchor for the stack (default: bottom-left). */
  anchor?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  accent?: string;
  /** Frames between each keyword fade-in. */
  stagger?: number;
}

const ANCHOR_STYLES: Record<NonNullable<Props['anchor']>, React.CSSProperties> = {
  'bottom-left':  { left: 64,  bottom: 64,  alignItems: 'flex-start' },
  'bottom-right': { right: 64, bottom: 64,  alignItems: 'flex-end'   },
  'top-left':     { left: 64,  top: 64,     alignItems: 'flex-start' },
  'top-right':    { right: 64, top: 64,     alignItems: 'flex-end'   },
};

export const KeywordOverlay: React.FC<Props> = ({
  keywords, anchor = 'bottom-left', accent = CYAN, stagger = 10,
}) => {
  const frame = useCurrentFrame();
  const capped = keywords.slice(0, 3);
  const slideFromRight = anchor.endsWith('right');

  return (
    <div style={{
      position: 'absolute',
      display: 'flex', flexDirection: 'column', gap: 14,
      maxWidth: 720, pointerEvents: 'none', zIndex: 5,
      ...ANCHOR_STYLES[anchor],
    }}>
      {capped.map((kw, i) => {
        const delay = 10 + i * stagger;
        const xOffset = slideInX(frame, delay, 18, slideFromRight ? 60 : -60);
        const scale = popIn(frame, delay, 26);
        return (
          <div key={i} style={{
            fontFamily: FONT_SANS,
            fontSize: 38, fontWeight: 700,
            color: TEXT, letterSpacing: 1.5,
            padding: '10px 22px',
            background: 'rgba(10, 10, 15, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderLeft: `3px solid ${accent}`,
            borderRadius: 4,
            opacity: fadeIn(frame, delay, 14),
            transform: `translateX(${xOffset}px) scale(${scale})`,
            transformOrigin: slideFromRight ? 'right center' : 'left center',
            textShadow: '0 2px 16px rgba(0,0,0,0.8)',
          }}>
            {kw}
          </div>
        );
      })}
    </div>
  );
};
