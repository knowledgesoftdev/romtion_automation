import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { VideoEngine, VideoEngineProps } from "./VideoEngine";

import nokiaGuion from "../public/projects/nokia-history/guion.json";
import nokiaTiming from "../public/projects/nokia-history/timing.json";

const FALLBACK: VideoEngineProps = {
  guion:     nokiaGuion as VideoEngineProps["guion"],
  timing:    nokiaTiming as VideoEngineProps["timing"],
  projectId: "nokia-history",
  scenePlan: null,
};

function calcDuration(timing: VideoEngineProps["timing"]): number {
  let maxEnd = 0;
  for (const key in timing) {
    const t = timing[key];
    if (!t) continue;
    const end = t.start + t.duration;
    if (end > maxEnd) maxEnd = end;
  }
  return maxEnd > 0 ? Math.ceil(maxEnd * 30) + 30 : 300;
}

const calculateMetadata = async ({
  abortSignal,
}: {
  props: unknown;
  abortSignal: AbortSignal;
}) => {
  // Always fetch active project from server — defaultProps are only a TS placeholder
  try {
    const res = await fetch("http://localhost:5000/api/active-project", {
      signal: abortSignal,
    });
    if (res.ok) {
      const data: VideoEngineProps = await res.json();
      return { durationInFrames: calcDuration(data.timing), props: data };
    }
  } catch (_) {
    // server not running — fall back to Nokia defaults
  }

  return { durationInFrames: calcDuration(FALLBACK.timing), props: FALLBACK };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="VideoEngine"
    component={VideoEngine as React.ComponentType<any>}
    durationInFrames={300}
    fps={30}
    width={1280}
    height={720}
    defaultProps={FALLBACK}
    calculateMetadata={calculateMetadata as any}
  />
);
