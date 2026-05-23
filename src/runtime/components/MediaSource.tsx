import React from 'react';
import { Img, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { kenBurns } from '../animations';
import type { MediaSpec } from '../types';

interface Props {
  projectId: string;
  channelId?: string;
  media: MediaSpec;
  durationInFrames: number;
  /** Apply Ken Burns zoom (images and videos). Default true for images, false for videos. */
  kenBurnsEnabled?: boolean;
  /** Object-position override; defaults derived from media.focal. */
  objectPosition?: string;
  /** When true, render at full width/height with overflow hidden. */
  fill?: boolean;
}

function focalToPosition(focal: MediaSpec['focal']): string {
  switch (focal) {
    case 'left':  return '25% 50%';
    case 'right': return '75% 50%';
    default:      return '50% 50%';
  }
}

export const MediaSource: React.FC<Props> = ({
  projectId, channelId, media, durationInFrames,
  kenBurnsEnabled, objectPosition, fill = true,
}) => {
  const frame = useCurrentFrame();
  const dir = media.type === 'video' ? 'videos' : 'images';
  const projectPath = channelId ? `${channelId}/${projectId}` : projectId;
  const src = staticFile(`projects/${projectPath}/${dir}/${media.filename}`);

  const enableKB = kenBurnsEnabled ?? (channelId === 'phantom-directive' ? true : media.type === 'image');
  const scale = enableKB ? kenBurns(frame, durationInFrames, 1.06) : 1;
  const position = objectPosition || focalToPosition(media.focal);

  const wrap: React.CSSProperties = fill
    ? { width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }
    : { position: 'relative' };

  const mediaStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    objectFit: 'cover',
    objectPosition: position,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
    display: 'block',
  };

  return (
    <div style={wrap}>
      {media.type === 'video' ? (
        <OffthreadVideo src={src} muted style={mediaStyle} />
      ) : (
        <Img src={src} style={mediaStyle} />
      )}
    </div>
  );
};
