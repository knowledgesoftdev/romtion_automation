import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaSource } from '../components/MediaSource';
import { Eyebrow } from '../components/Eyebrow';
import { Bullets } from '../components/Bullets';
import { fadeIn, fadeOut, slideInX, springIn } from '../animations';
import { BG, PANEL, FONT_SANS, TEXT, CYAN } from '../tokens';
import type { ScenePlanParagraph } from '../types';

interface Props {
  projectId: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}

export const SplitMedia: React.FC<Props> = ({ projectId, paragraph, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = fadeOut(frame, durationInFrames, 14);
  const accent = paragraph.accentColor || CYAN;
  const headlineScale = springIn(frame, 8, fps, { damping: 18, stiffness: 100 });

  const bullets = paragraph.sideContent?.kind === 'bullets'
    ? paragraph.sideContent.payload.items
    : (paragraph.keywords || []);

  // Panel slides in from the right (media stays anchored left)
  const panelX = slideInX(frame, 0, 22, 80);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity, display: 'flex', flexDirection: 'row' }}>
      <div style={{ width: '50%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        <MediaSource projectId={projectId} media={paragraph.media} durationInFrames={durationInFrames} />
        <AbsoluteFill style={{
          background: `linear-gradient(90deg, transparent 65%, ${BG} 100%)`,
        }} />
      </div>
      <div style={{
        width: '50%', height: '100%',
        background: PANEL,
        padding: '72px 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        transform: `translateX(${panelX}px)`,
      }}>
        {paragraph.eyebrow && <Eyebrow text={paragraph.eyebrow} accent={accent} delay={4} />}
        {paragraph.headline && (
          <h2 style={{
            fontFamily: FONT_SANS,
            color: TEXT, fontSize: 52, fontWeight: 800,
            lineHeight: 1.1, margin: '0 0 28px 0', letterSpacing: -1,
            opacity: fadeIn(frame, 8, 16),
            transform: `scale(${headlineScale})`,
            transformOrigin: 'left top',
          }}>{paragraph.headline}</h2>
        )}
        {bullets.length > 0 && <Bullets items={bullets} accent={accent} baseDelay={22} />}
      </div>
    </AbsoluteFill>
  );
};
