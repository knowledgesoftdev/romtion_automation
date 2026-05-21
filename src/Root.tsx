import "./index.css";
import React from "react";
import { Audio, Composition, Sequence, staticFile } from "remotion";
import { VideoEngine, VideoEngineProps } from "./VideoEngine";
import {
  WhiteboardScene,
  WhiteboardSceneProps,
  WordTiming,
  VisualElement,
  ArrowConnection,
} from "./WhiteboardScene";

import nokiaGuion from "../public/projects/codigo-muerto/nokia-history/guion.json";
import nokiaTiming from "../public/projects/codigo-muerto/nokia-history/timing.json";

// ── Tipos extendidos para active-project ───────────────────────────────────────
interface ActiveProjectData extends VideoEngineProps {
  wordTiming?: WordTiming[] | null;
}

// ── Fallback Nokia para VideoEngine ───────────────────────────────────────────
const FALLBACK: VideoEngineProps = {
  guion:     nokiaGuion as VideoEngineProps["guion"],
  timing:    nokiaTiming as VideoEngineProps["timing"],
  projectId: "nokia-history",
  scenePlan: null,
};

const FPS = 30;

// ── Helper: calcular duración total en frames a partir del timing ──────────────
function calcDuration(timing: VideoEngineProps["timing"]): number {
  let maxEnd = 0;
  for (const key in timing) {
    const t = timing[key];
    if (!t) continue;
    const end = t.start + t.duration;
    if (end > maxEnd) maxEnd = end;
  }
  return maxEnd > 0 ? Math.ceil(maxEnd * FPS) + 30 : 300;
}

// ── Tipos del nuevo guion.json multi-element ──────────────────────────────────
interface GuionItemVisualNew {
  color_mood: string;
  elements:   VisualElement[];
  arrows:     ArrowConnection[];
}

interface GuionItem {
  id:             string;
  texto:          string;
  chapter_title?: string;
  visual?:        Partial<GuionItemVisualNew> & {
    // Campos legacy (schema v3 single-visual) — tolerados pero no usados.
    pexels_query?:      string;
    asset_type?:        string;
    motion_element?:    string;
    motion_valor?:      string;
    keyword_highlight?: string;
  };
}

interface WhiteboardVideoProps {
  projectId:  string;
  channelId?: string;
  guion:      GuionItem[];
  timing:     Record<string, { start: number; duration: number }>;
  wordTiming: WordTiming[] | null;
}

// ── SceneSequence: wrapper de Sequence ────────────────────────────────────────
const SceneSequence: React.FC<{
  from: number;
  durationInFrames: number;
  sceneProps: WhiteboardSceneProps;
}> = ({ from, durationInFrames, sceneProps }) => (
  <Sequence from={from} durationInFrames={durationInFrames}>
    <WhiteboardScene {...sceneProps} />
  </Sequence>
);

// ── WhiteboardVideo: orquesta todas las escenas ────────────────────────────────
const WhiteboardVideo: React.FC<WhiteboardVideoProps> = ({
  projectId,
  channelId,
  guion,
  timing,
  wordTiming,
}) => {
  const projectPath = channelId ? `${channelId}/${projectId}` : projectId;
  const audioSrc = staticFile(`projects/${projectPath}/audio.mp3`);

  return (
    <>
      {/* Audio único de toda la composición */}
      <Audio src={audioSrc} />

      {guion.map((item) => {
        const key   = `parrafo-${item.id}`;
        const entry = timing[key];
        if (!entry) return null;

        const startFrame     = Math.round(entry.start * FPS);
        const durationFrames = Math.max(1, Math.ceil(entry.duration * FPS));
        const visual         = item.visual;

        const elements: VisualElement[] = Array.isArray(visual?.elements)
          ? (visual?.elements as VisualElement[])
          : [];
        const arrows: ArrowConnection[] = Array.isArray(visual?.arrows)
          ? (visual?.arrows as ArrowConnection[])
          : [];

        const sceneProps: WhiteboardSceneProps = {
          texto:          item.texto,
          chapterTitle:   item.chapter_title || projectId,
          colorMood:      visual?.color_mood || "neutro",
          elements,
          arrows,
          projectId,
          channelId,
          sceneId:        item.id,
          startFrame,
          durationFrames,
          fps:            FPS,
          wordTimings:    wordTiming || [],
          escenaId:       parseInt(item.id, 10) || 0,
        };

        return (
          <SceneSequence
            key={key}
            from={startFrame}
            durationInFrames={durationFrames}
            sceneProps={sceneProps}
          />
        );
      })}
    </>
  );
};

// ── calculateMetadata para VideoEngine (sin cambios) ─────────────────────────
const calculateMetadataVideoEngine = async ({
  abortSignal,
}: {
  props: unknown;
  abortSignal: AbortSignal;
}) => {
  try {
    const res = await fetch("http://localhost:5000/api/active-project", {
      signal: abortSignal,
    });
    if (res.ok) {
      const data: VideoEngineProps = await res.json();
      return { durationInFrames: calcDuration(data.timing), props: data };
    }
  } catch (_) {
    // servidor no disponible → fallback Nokia
  }
  return { durationInFrames: calcDuration(FALLBACK.timing), props: FALLBACK };
};

// ── calculateMetadata para WhiteboardVideo ────────────────────────────────────
const calculateMetadataWhiteboard = async ({
  abortSignal,
}: {
  props: unknown;
  abortSignal: AbortSignal;
}) => {
  const fallbackProps: WhiteboardVideoProps = {
    projectId:  FALLBACK.projectId,
    guion:      FALLBACK.guion as GuionItem[],
    timing:     FALLBACK.timing,
    wordTiming: null,
  };

  try {
    const res = await fetch("http://localhost:5000/api/active-project", {
      signal: abortSignal,
    });
    if (res.ok) {
      const data: ActiveProjectData = await res.json();
      const props: WhiteboardVideoProps = {
        projectId:  data.projectId,
        channelId:  data.channelId,
        guion:      data.guion as GuionItem[],
        timing:     data.timing,
        wordTiming: data.wordTiming ?? null,
      };
      return { durationInFrames: calcDuration(data.timing), props };
    }
  } catch (_) {
    // servidor no disponible → fallback Nokia
  }

  return {
    durationInFrames: calcDuration(FALLBACK.timing),
    props: fallbackProps,
  };
};

// ── RemotionRoot: registra ambas composiciones ────────────────────────────────
export const RemotionRoot: React.FC = () => (
  <>
    {/* Composición original — sin cambios */}
    <Composition
      id="VideoEngine"
      component={VideoEngine as React.ComponentType<any>}
      durationInFrames={300}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={FALLBACK}
      calculateMetadata={calculateMetadataVideoEngine as any}
    />

    {/* Nueva composición — explainer board multi-element */}
    <Composition
      id="WhiteboardVideo"
      component={WhiteboardVideo as React.ComponentType<any>}
      durationInFrames={300}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{
        projectId:  FALLBACK.projectId,
        guion:      FALLBACK.guion as GuionItem[],
        timing:     FALLBACK.timing,
        wordTiming: null,
      }}
      calculateMetadata={calculateMetadataWhiteboard as any}
    />
  </>
);
