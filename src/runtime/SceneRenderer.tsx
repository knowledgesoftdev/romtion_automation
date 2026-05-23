import React from 'react';
import { FullBleedMedia } from './layouts/FullBleedMedia';
import { SplitMedia } from './layouts/SplitMedia';
import { DataSplit } from './layouts/DataSplit';
import { KeywordOnly } from './layouts/KeywordOnly';
import type { ScenePlanParagraph } from './types';

interface Props {
  projectId: string;
  channelId?: string;
  paragraph: ScenePlanParagraph;
  durationInFrames: number;
}

export const SceneRenderer: React.FC<Props> = ({ projectId, channelId, paragraph, durationInFrames }) => {
  switch (paragraph.layout) {
    case 'fullBleedMedia':
      return <FullBleedMedia projectId={projectId} channelId={channelId} paragraph={paragraph} durationInFrames={durationInFrames} />;
    case 'splitMedia':
      return <SplitMedia projectId={projectId} channelId={channelId} paragraph={paragraph} durationInFrames={durationInFrames} />;
    case 'dataSplit':
      return <DataSplit projectId={projectId} channelId={channelId} paragraph={paragraph} durationInFrames={durationInFrames} />;
    case 'keywordOnly':
      return <KeywordOnly projectId={projectId} channelId={channelId} paragraph={paragraph} durationInFrames={durationInFrames} />;
    default:
      return <FullBleedMedia projectId={projectId} channelId={channelId} paragraph={paragraph} durationInFrames={durationInFrames} />;
  }
};
