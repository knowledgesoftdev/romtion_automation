import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MediaSource } from '../components/MediaSource';
import { KeywordOverlay } from '../components/KeywordOverlay';
import { fadeIn, fadeOut, slideInX, slideUp, springIn } from '../animations';
import { BG, FONT_SANS, TEXT } from '../tokens';
import type { ScenePlanParagraph } from '../types';

interface Props {
  projectId: string;
  channelId?: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}


// ─── Main layout ─────────────────────────────────────────────────────────────
export const FullBleedMedia: React.FC<Props> = ({ projectId, channelId, paragraph, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = fadeOut(frame, durationInFrames, 14);
  const isCinematic = channelId === 'phantom-directive';
  const accent = paragraph.accentColor;
  const headlineScale = springIn(frame, 6, fps, { damping: 18, stiffness: 95 });

  const keywords = paragraph.keywords || [];
  const kwTopLeft = keywords[0];
  const kwBottomLeft = keywords[1];
  const kwBottomCenter = keywords.slice(2);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity }}>
      {/* ── Full-bleed background media ── */}
      <AbsoluteFill>
        <MediaSource
          projectId={projectId}
          channelId={channelId}
          media={paragraph.media}
          durationInFrames={durationInFrames}
        />
      </AbsoluteFill>

      {/* ── Overlay gradient / vignette ── */}
      {isCinematic ? (
        // Cinematic: radial vignette + lower-third gradient for text legibility
        <>
          <AbsoluteFill style={{
            background: 'radial-gradient(circle at center, rgba(0,0,0,0) 25%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }} />
          <AbsoluteFill style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0) 65%)',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        <AbsoluteFill style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.35) 0%, rgba(10,10,15,0.0) 30%, rgba(10,10,15,0.0) 55%, rgba(10,10,15,0.85) 100%)',
        }} />
      )}

      {/* ── Whiteboard: headline (original) ── */}
      {!isCinematic && paragraph.headline && (
        <div style={{
          position: 'absolute',
          top: 64,
          left: 64, right: 64,
          fontFamily: FONT_SANS, color: TEXT,
          fontSize: 64,
          fontWeight: 800, lineHeight: 1.05,
          letterSpacing: -1,
          textShadow: '0 2px 24px rgba(0,0,0,0.85)',
          maxWidth: 900,
          opacity: fadeIn(frame, 6, 18),
          transform: `scale(${headlineScale})`,
          transformOrigin: 'left top',
        }}>{paragraph.headline}</div>
      )}

      {/* ── Cinematic: corner keyword labels ── */}
      {isCinematic ? (
        <>
          {kwTopLeft && (
            <div style={{
              position: 'absolute', top: 56, left: 56,
              backgroundColor: '#ffffff', color: '#000000',
              padding: '10px 22px', fontFamily: FONT_SANS,
              fontSize: 24, fontWeight: 900, letterSpacing: 2,
              textTransform: 'uppercase', borderRadius: 0,
              opacity: fadeIn(frame, 10, 12),
              transform: `translateX(${slideInX(frame, 10, 16, -40)}px)`,
            }}>
              {kwTopLeft}
            </div>
          )}
          {kwBottomLeft && (
            <div style={{
              position: 'absolute', bottom: 64, left: 56,
              backgroundColor: '#ffffff', color: '#000000',
              padding: '10px 22px', fontFamily: FONT_SANS,
              fontSize: 24, fontWeight: 900, letterSpacing: 2,
              textTransform: 'uppercase', borderRadius: 0,
              opacity: fadeIn(frame, 15, 12),
              transform: `translateX(${slideInX(frame, 15, 16, -40)}px)`,
            }}>
              {kwBottomLeft}
            </div>
          )}
          {kwBottomCenter.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 64, right: 56,
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              {kwBottomCenter.map((kw, i) => {
                const delay = 20 + i * 8;
                return (
                  <div key={i} style={{
                    backgroundColor: '#ffffff', color: '#000000',
                    padding: '8px 18px', fontFamily: FONT_SANS,
                    fontSize: 20, fontWeight: 900, letterSpacing: 1.5,
                    textTransform: 'uppercase', borderRadius: 0,
                    opacity: fadeIn(frame, delay, 12),
                    transform: `translateY(${slideUp(frame, delay, 16)}px)`,
                  }}>
                    {kw}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        // Whiteboard: original KeywordOverlay component
        paragraph.keywords && paragraph.keywords.length > 0 && (
          <KeywordOverlay keywords={paragraph.keywords} accent={accent} anchor="bottom-left" />
        )
      )}
    </AbsoluteFill>
  );
};
