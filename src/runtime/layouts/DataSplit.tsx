import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaSource } from '../components/MediaSource';
import { Eyebrow } from '../components/Eyebrow';
import { StatBlock } from '../components/StatBlock';
import { BarChart } from '../components/BarChart';
import { Bullets } from '../components/Bullets';
import { fadeIn, fadeOut, slideInX, springIn } from '../animations';
import { BG, PANEL, FONT_SANS, FONT_SERIF, TEXT, MUTED, CYAN } from '../tokens';
import type { ScenePlanParagraph } from '../types';

interface Props {
  projectId: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}

export const DataSplit: React.FC<Props> = ({ projectId, paragraph, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = fadeOut(frame, durationInFrames, 14);
  const accent = paragraph.accentColor || CYAN;
  const sc = paragraph.sideContent;
  const headlineScale = springIn(frame, 6, fps, { damping: 20, stiffness: 95 });

  // Panel slides in from the left (media on the right stays anchored)
  const panelX = slideInX(frame, 0, 22, -80);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity, display: 'flex', flexDirection: 'row' }}>
      <div style={{
        width: '50%', height: '100%',
        background: PANEL,
        padding: '72px 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        transform: `translateX(${panelX}px)`,
      }}>
        {paragraph.eyebrow && <Eyebrow text={paragraph.eyebrow} accent={accent} delay={4} />}
        {paragraph.headline && (
          <div style={{
            fontFamily: FONT_SANS, color: TEXT,
            fontSize: 30, fontWeight: 600, lineHeight: 1.25,
            letterSpacing: -0.3, marginBottom: 32, maxWidth: 540,
            opacity: fadeIn(frame, 8, 16),
            transform: `scale(${headlineScale})`,
            transformOrigin: 'left top',
          }}>{paragraph.headline}</div>
        )}

        {sc?.kind === 'stat' && (
          <StatBlock value={sc.payload.value} unit={sc.payload.unit} label={sc.payload.label} accent={accent} />
        )}
        {sc?.kind === 'chart' && (
          <BarChart bars={sc.payload.bars} max={sc.payload.max} accent={accent} />
        )}
        {sc?.kind === 'bullets' && (
          <Bullets items={sc.payload.items} accent={accent} baseDelay={22} />
        )}
        {sc?.kind === 'quote' && (
          <div style={{
            opacity: fadeIn(frame, 16, 18),
          }}>
            <div style={{
              fontFamily: FONT_SERIF, color: TEXT, fontSize: 36,
              fontStyle: 'italic', lineHeight: 1.35,
              borderLeft: `4px solid ${accent}`, paddingLeft: 24,
            }}>"{sc.payload.text}"</div>
            {sc.payload.author && (
              <div style={{ fontFamily: FONT_SANS, color: MUTED, fontSize: 22, marginTop: 14, paddingLeft: 28 }}>
                — {sc.payload.author}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ width: '50%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        <MediaSource projectId={projectId} media={paragraph.media} durationInFrames={durationInFrames} />
        <AbsoluteFill style={{
          background: `linear-gradient(270deg, transparent 65%, ${BG} 100%)`,
        }} />
      </div>
    </AbsoluteFill>
  );
};
