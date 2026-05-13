import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── timing ──────────────────────────────────────────────────────────────────
const TITLE_IN      = 0;
const HARDWARE_IN   = 18;
const SYMBIAN_IN    = 52;
const S60UI_IN      = 84;
const BOUNDARY_IN   = 100;   // after both Symbian OS and S60 UI are visible
const TL_V1_IN      = 28;
const TL_V2_IN      = 82;
const TL_V3_IN      = 128;
const TL_V5_IN      = 174;
const FADE          = 14;

// ─── layout constants ────────────────────────────────────────────────────────
const LAYER_LEFT   = 80;
const LAYER_WIDTH  = 490;
const LAYER_HEIGHT = 88;
const S60UI_TOP    = 148;
const SYMBIAN_TOP  = 260;    // S60UI_TOP + LAYER_HEIGHT + 24 (gap for boundary)
const HARDWARE_TOP = 372;    // SYMBIAN_TOP + LAYER_HEIGHT + 24

// timeline
const TL_LINE_X    = 740;
const TL_NODE_X    = 758;
const TL_NODE_W    = 120;
const TL_NODE_H    = 40;
const TL_V1_Y      = 148;
const TL_STEP      = 100;   // px between node tops

// ─── helpers ─────────────────────────────────────────────────────────────────
function useSlideLeft(startFrame: number) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = interpolate(frame, [startFrame, startFrame + FADE], [-70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity, tx };
}

function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return opacity;
}

// ─── sub-components ──────────────────────────────────────────────────────────
const ArchLayer: React.FC<{
  label: string;
  bg: string;
  textColor: string;
  topY: number;
  startFrame: number;
}> = ({ label, bg, textColor, topY, startFrame }) => {
  const { opacity, tx } = useSlideLeft(startFrame);
  return (
    <div
      style={{
        position: "absolute",
        left: LAYER_LEFT,
        top: topY,
        width: LAYER_WIDTH,
        height: LAYER_HEIGHT,
        backgroundColor: bg,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateX(${tx}px)`,
      }}
    >
      <span
        style={{
          fontFamily: interFamily,
          color: textColor,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
    </div>
  );
};

const ApiBoundary: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const opacity = useFadeIn(startFrame);
  const boundaryY = SYMBIAN_TOP - 14; // centered in the gap between S60UI and Symbian
  return (
    <>
      {/* Dashed line */}
      <div
        style={{
          position: "absolute",
          left: LAYER_LEFT,
          top: boundaryY,
          width: LAYER_WIDTH,
          borderTop: "2px dashed #ef4444",
          opacity,
        }}
      />
      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: LAYER_LEFT + LAYER_WIDTH + 12,
          top: boundaryY - 10,
          fontFamily: interFamily,
          color: "#ef4444",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          opacity,
        }}
      >
        API boundary — breaking changes
      </div>
    </>
  );
};

const TimelineNode: React.FC<{
  label: string;
  topY: number;
  startFrame: number;
}> = ({ label, topY, startFrame }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = interpolate(frame, [startFrame, startFrame + FADE], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <>
      {/* Dot on the line */}
      <div
        style={{
          position: "absolute",
          left: TL_LINE_X - 5,
          top: topY + TL_NODE_H / 2 - 5,
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: "#e2e8f0",
          opacity,
        }}
      />
      {/* Node box */}
      <div
        style={{
          position: "absolute",
          left: TL_NODE_X + 14,
          top: topY,
          width: TL_NODE_W,
          height: TL_NODE_H,
          backgroundColor: "#1e293b",
          border: "1.5px solid #475569",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `translateX(${tx}px)`,
        }}
      >
        <span
          style={{
            fontFamily: interFamily,
            color: "#e2e8f0",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
    </>
  );
};

const IncompatibleConnector: React.FC<{
  topY: number; // y of the node above
  startFrame: number;
}> = ({ topY, startFrame }) => {
  const opacity = useFadeIn(startFrame);
  const connY = topY + TL_NODE_H; // starts at bottom of upper node
  const connHeight = TL_STEP - TL_NODE_H;

  return (
    <>
      {/* Vertical red line */}
      <div
        style={{
          position: "absolute",
          left: TL_LINE_X - 1,
          top: connY,
          width: 2,
          height: connHeight,
          backgroundColor: "#ef4444",
          opacity,
        }}
      />
      {/* Arrowhead */}
      <div
        style={{
          position: "absolute",
          left: TL_LINE_X - 5,
          top: connY + connHeight - 8,
          opacity,
          fontFamily: interFamily,
          color: "#ef4444",
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        ▼
      </div>
      {/* "incompatible" label */}
      <div
        style={{
          position: "absolute",
          left: TL_NODE_X + 18,
          top: connY + connHeight / 2 - 9,
          fontFamily: interFamily,
          color: "#ef4444",
          fontSize: 12,
          fontWeight: 600,
          opacity,
          whiteSpace: "nowrap",
        }}
      >
        incompatible
      </div>
    </>
  );
};

// ─── main component ───────────────────────────────────────────────────────────
export const Animacion3: React.FC = () => {
  const titleOpacity = useFadeIn(TITLE_IN);

  // Timeline vertical base line (appears with first node)
  const tlLineOpacity = useFadeIn(TL_V1_IN);
  const tlTotalHeight = TL_STEP * 3 + TL_NODE_H;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: interFamily,
          color: "#e2e8f0",
          fontSize: 26,
          fontWeight: "bold",
          opacity: titleOpacity,
          letterSpacing: "0.02em",
        }}
      >
        Dos equipos. Un producto. Cero coordinación de contratos.
      </div>

      {/* ── Architecture layers (left) ── */}
      <ArchLayer
        label="Hardware"
        bg="#334155"
        textColor="#e2e8f0"
        topY={HARDWARE_TOP}
        startFrame={HARDWARE_IN}
      />
      <ArchLayer
        label="Symbian OS"
        bg="#8b5cf6"
        textColor="white"
        topY={SYMBIAN_TOP}
        startFrame={SYMBIAN_IN}
      />
      <ArchLayer
        label="S60 UI"
        bg="#00d4ff"
        textColor="#0a0a0f"
        topY={S60UI_TOP}
        startFrame={S60UI_IN}
      />

      {/* API boundary line between S60 UI and Symbian OS */}
      <ApiBoundary startFrame={BOUNDARY_IN} />

      {/* ── Timeline base line (right) ── */}
      <div
        style={{
          position: "absolute",
          left: TL_LINE_X - 1,
          top: TL_V1_Y + TL_NODE_H / 2,
          width: 2,
          height: tlTotalHeight - TL_NODE_H,
          backgroundColor: "#334155",
          opacity: tlLineOpacity,
        }}
      />

      {/* Timeline header */}
      <div
        style={{
          position: "absolute",
          left: TL_NODE_X + 14,
          top: TL_V1_Y - 30,
          fontFamily: interFamily,
          color: "#64748b",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: tlLineOpacity,
        }}
      >
        Versiones S60
      </div>

      {/* S60 v1 */}
      <TimelineNode label="S60 v1" topY={TL_V1_Y} startFrame={TL_V1_IN} />

      {/* Connector → v2 */}
      <IncompatibleConnector topY={TL_V1_Y} startFrame={TL_V2_IN - 10} />
      <TimelineNode label="S60 v2" topY={TL_V1_Y + TL_STEP} startFrame={TL_V2_IN} />

      {/* Connector → v3 */}
      <IncompatibleConnector topY={TL_V1_Y + TL_STEP} startFrame={TL_V3_IN - 10} />
      <TimelineNode label="S60 v3" topY={TL_V1_Y + TL_STEP * 2} startFrame={TL_V3_IN} />

      {/* Connector → v5 */}
      <IncompatibleConnector topY={TL_V1_Y + TL_STEP * 2} startFrame={TL_V5_IN - 10} />
      <TimelineNode label="S60 v5" topY={TL_V1_Y + TL_STEP * 3} startFrame={TL_V5_IN} />
    </AbsoluteFill>
  );
};
