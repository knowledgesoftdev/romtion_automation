import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaSource } from '../components/MediaSource';
import { KeywordOverlay } from '../components/KeywordOverlay';
import { fadeIn, fadeOut, slideUp, springIn } from '../animations';
import { BG, FONT_SANS, TEXT } from '../tokens';
import type { ScenePlanParagraph } from '../types';

interface Props {
  projectId: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}

export const FullBleedMedia: React.FC<Props> = ({ projectId, paragraph, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = fadeOut(frame, durationInFrames, 14);
  const accent = paragraph.accentColor;
  const headlineScale = springIn(frame, 6, fps, { damping: 18, stiffness: 95 });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity }}>
      <AbsoluteFill>
        <MediaSource projectId={projectId} media={paragraph.media} durationInFrames={durationInFrames} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(10,10,15,0.35) 0%, rgba(10,10,15,0.0) 30%, rgba(10,10,15,0.0) 55%, rgba(10,10,15,0.85) 100%)',
      }} />
      {paragraph.headline && (
        <div style={{
          position: 'absolute', top: 64, left: 64, right: 64,
          fontFamily: FONT_SANS, color: TEXT,
          fontSize: 64, fontWeight: 800, lineHeight: 1.05,
          letterSpacing: -1,
          textShadow: '0 2px 24px rgba(0,0,0,0.85)',
          maxWidth: 900,
          opacity: fadeIn(frame, 6, 18),
          transform: `translateY(${slideUp(frame, 6, 22)}px) scale(${headlineScale})`,
          transformOrigin: 'left top',
        }}>{paragraph.headline}</div>
      )}
      {paragraph.keywords && paragraph.keywords.length > 0 && (
        <KeywordOverlay keywords={paragraph.keywords} accent={accent} anchor="bottom-left" />
      )}
    </AbsoluteFill>
  );
};
