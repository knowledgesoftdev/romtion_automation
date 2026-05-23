import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaSource } from '../components/MediaSource';
import { fadeIn, fadeOut, slideUp, springIn } from '../animations';
import { fitOneLine } from '../textFit';
import { BG, FONT_SANS, TEXT, CYAN } from '../tokens';
import type { ScenePlanParagraph } from '../types';

const CANVAS_INNER_WIDTH = 1280 - 80 * 2;
const KEYWORD_LETTER_SPACING_RATIO = 0.50;

interface Props {
  projectId: string;
  channelId?: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}

export const KeywordOnly: React.FC<Props> = ({ projectId, channelId, paragraph, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = fadeOut(frame, durationInFrames, 14);
  const accent = paragraph.accentColor || CYAN;
  const isCinematic = channelId === 'phantom-directive';
  const words = (paragraph.keywords && paragraph.keywords.length > 0
    ? paragraph.keywords
    : (paragraph.headline || '').split(/\s+/)
  ).slice(0, 2);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity }}>
      <AbsoluteFill style={{ opacity: isCinematic ? 1.0 : 0.55 }}>
        <MediaSource projectId={projectId} channelId={channelId} media={paragraph.media} durationInFrames={durationInFrames} />
      </AbsoluteFill>
      {isCinematic ? (
        <AbsoluteFill style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }} />
      ) : (
        <AbsoluteFill style={{
          background: 'radial-gradient(ellipse at center, rgba(10,10,15,0.25) 0%, rgba(10,10,15,0.92) 80%)',
        }} />
      )}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: isCinematic ? 32 : 24, padding: 80, textAlign: 'center',
      }}>
        {words.map((w, i) => {
          const delay = 4 + i * 12;
          const scale = springIn(frame, delay, fps, { damping: 12, stiffness: 100 });
          const baseSize = isCinematic
            ? (i === 0 ? 100 : 70)
            : (i === 0 ? 190 : 124);
          const minSize = isCinematic
            ? (i === 0 ? 60 : 40)
            : (i === 0 ? 80 : 60);
          const upper    = w.toUpperCase();
          const fontSize = fitOneLine(upper, CANVAS_INNER_WIDTH - (isCinematic ? 100 : 0), baseSize, minSize, isCinematic ? 0.05 : KEYWORD_LETTER_SPACING_RATIO);
          
          if (isCinematic) {
            return (
              <div key={i} style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '16px 36px',
                fontFamily: FONT_SANS,
                fontSize,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
                borderRadius: 0,
                opacity: fadeIn(frame, delay, 14),
                transform: `translateY(${slideUp(frame, delay, 18)}px)`,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                maxWidth: '100%',
                wordBreak: 'break-word',
              }}>{upper}</div>
            );
          }

          return (
            <div key={i} style={{
              fontFamily: FONT_SANS, color: TEXT,
              fontSize,
              fontWeight: 900, lineHeight: 0.95, letterSpacing: -3,
              opacity: fadeIn(frame, delay, 16),
              transform: `scale(${scale})`,
              textShadow: `0 0 90px ${accent}66, 0 6px 32px rgba(0,0,0,0.9)`,
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}>{upper}</div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
