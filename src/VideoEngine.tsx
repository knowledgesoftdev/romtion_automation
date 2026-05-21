import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { SceneRenderer } from "./runtime/SceneRenderer";
import type { ScenePlan, ScenePlanParagraph } from "./runtime/types";

export interface VideoEngineProps {
  guion: Array<{ id: string; texto: string }>;
  timing: Record<string, { start: number; duration: number }>;
  projectId: string;
  channelId?: string;
  scenePlan?: ScenePlan | null;
}

const FPS = 30;
const FADE_FRAMES = 15;

const DefaultText: React.FC<{ texto: string; durationInFrames: number }> = ({ texto, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 120px", opacity,
    }}>
      <p style={{
        fontFamily: "Inter, sans-serif", color: "#e2e8f0",
        fontSize: 30, fontWeight: "normal",
        textAlign: "center", lineHeight: 1.7, margin: 0,
      }}>
        {texto}
      </p>
    </AbsoluteFill>
  );
};

// SceneWrapper lives INSIDE each <Sequence>, so useCurrentFrame() returns
// the sequence-relative frame (starts at 0 for every scene).
// If the scene-plan has data for the paragraph, render data-driven; otherwise
// fall back to plain centered text.
const SceneWrapper: React.FC<{
  texto: string;
  durationInFrames: number;
  projectId: string;
  channelId?: string;
  planParagraph?: ScenePlanParagraph;
}> = ({ texto, durationInFrames, projectId, channelId, planParagraph }) => {
  if (planParagraph) {
    return <SceneRenderer projectId={projectId} channelId={channelId} paragraph={planParagraph} durationInFrames={durationInFrames} />;
  }
  return <DefaultText texto={texto} durationInFrames={durationInFrames} />;
};

export const VideoEngine: React.FC<VideoEngineProps> = ({ guion, timing, projectId, channelId, scenePlan }) => {
  const planById: Record<string, ScenePlanParagraph> = {};
  if (scenePlan?.paragraphs) {
    for (const p of scenePlan.paragraphs) planById[p.id] = p;
  }

  const projectPath = channelId ? `${channelId}/${projectId}` : projectId;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {guion.map((item) => {
        const key  = `parrafo-${item.id}`;
        const entry = timing[key];
        if (!entry) return null;

        const fromFrame        = Math.round(entry.start * FPS);
        const durationInFrames = Math.ceil(entry.duration * FPS);
        const planParagraph    = planById[item.id];

        return (
          <Sequence key={key} from={fromFrame} durationInFrames={durationInFrames}>
            <Audio src={staticFile(`projects/${projectPath}/audio/${key}.mp3`)} />
            <SceneWrapper
              texto={item.texto}
              durationInFrames={durationInFrames}
              projectId={projectId}
              channelId={channelId}
              planParagraph={planParagraph}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
