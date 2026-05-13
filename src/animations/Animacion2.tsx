import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── timing ────────────────────────────────────────────────────────────────
const COL_TITLES_IN  = 0;
const SYM_NODE_START = 20;
const SYM_STAGGER    = 28;   // frames between each Symbian node
const IOS_NODE_START = 30;
const IOS_STAGGER    = 38;   // fewer nodes → larger gap looks balanced
const COSTS_IN       = 165;
const BOTTOM_TEXT_IN = 182;
const FADE           = 12;

// ─── data ───────────────────────────────────────────────────────────────────
const SYMBIAN_NODES = ["Código", "Certificado", "Auditoría", "Firma", "Distribución"];
const IOS_NODES     = ["Código", "Revisión", "Distribución"];

// ─── helpers ────────────────────────────────────────────────────────────────
function useFadeSlide(startFrame: number, dy = -12) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [startFrame, startFrame + FADE], [dy, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity, ty };
}

// ─── sub-components ─────────────────────────────────────────────────────────
const FlowNode: React.FC<{
  label: string;
  color: string;
  startFrame: number;
}> = ({ label, color, startFrame }) => {
  const { opacity, ty } = useFadeSlide(startFrame);
  return (
    <div style={{ opacity, transform: `translateY(${ty}px)` }}>
      <div
        style={{
          border: `2px solid ${color}`,
          borderRadius: 8,
          padding: "11px 0",
          width: 240,
          textAlign: "center",
          fontFamily: interFamily,
          color: "#e2e8f0",
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "0.02em",
          boxShadow: `0 0 12px ${color}30`,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Connector: React.FC<{ color: string; startFrame: number }> = ({
  color,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: 30,
        justifyContent: "center",
        gap: 0,
      }}
    >
      <div style={{ width: 2, height: 18, backgroundColor: color, opacity: 0.6 }} />
      <div style={{ color, fontSize: 11, lineHeight: 1, marginTop: -2 }}>▼</div>
    </div>
  );
};

const CostLabel: React.FC<{
  text: string;
  color: string;
  startFrame: number;
}> = ({ text, color, startFrame }) => {
  const { opacity, ty } = useFadeSlide(startFrame);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        marginTop: 10,
        fontFamily: interFamily,
        color,
        fontSize: 15,
        fontWeight: 600,
        textAlign: "center",
        width: 240,
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </div>
  );
};

const ColumnTitle: React.FC<{
  label: string;
  color: string;
  startFrame: number;
}> = ({ label, color, startFrame }) => {
  const { opacity, ty } = useFadeSlide(startFrame, -8);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        fontFamily: interFamily,
        color,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: "0.04em",
        marginBottom: 24,
        width: 240,
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
};

// ─── main component ─────────────────────────────────────────────────────────
export const Animacion2: React.FC = () => {
  const frame = useCurrentFrame();

  const bottomTextOpacity = interpolate(
    frame,
    [BOTTOM_TEXT_IN, BOTTOM_TEXT_IN + FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dividerOpacity = interpolate(frame, [COL_TITLES_IN + 5, COL_TITLES_IN + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Two columns container */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          bottom: 90,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* ── LEFT: Symbian ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 360,
          }}
        >
          <ColumnTitle
            label="Symbian Signed"
            color="#8b5cf6"
            startFrame={COL_TITLES_IN}
          />
          {SYMBIAN_NODES.map((label, i) => (
            <React.Fragment key={label}>
              <FlowNode
                label={label}
                color="#8b5cf6"
                startFrame={SYM_NODE_START + i * SYM_STAGGER}
              />
              {i < SYMBIAN_NODES.length - 1 && (
                <Connector
                  color="#8b5cf6"
                  startFrame={SYM_NODE_START + i * SYM_STAGGER + 8}
                />
              )}
            </React.Fragment>
          ))}
          <CostLabel
            text="4–12 semanas / $200–$3,000"
            color="#ef4444"
            startFrame={COSTS_IN}
          />
        </div>

        {/* ── DIVIDER ── */}
        <div
          style={{
            width: 1,
            height: 520,
            backgroundColor: "#1e293b",
            alignSelf: "center",
            marginTop: -20,
            opacity: dividerOpacity,
          }}
        />

        {/* ── RIGHT: App Store ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 360,
          }}
        >
          <ColumnTitle
            label="App Store"
            color="#00d4ff"
            startFrame={COL_TITLES_IN}
          />
          {IOS_NODES.map((label, i) => (
            <React.Fragment key={label}>
              <FlowNode
                label={label}
                color="#00d4ff"
                startFrame={IOS_NODE_START + i * IOS_STAGGER}
              />
              {i < IOS_NODES.length - 1 && (
                <Connector
                  color="#00d4ff"
                  startFrame={IOS_NODE_START + i * IOS_STAGGER + 8}
                />
              )}
            </React.Fragment>
          ))}
          <CostLabel
            text="1–2 semanas / $0"
            color="#00d4ff"
            startFrame={COSTS_IN}
          />
        </div>
      </div>

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 38,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: interFamily,
          color: "#e2e8f0",
          fontSize: 20,
          opacity: bottomTextOpacity,
          letterSpacing: "0.02em",
        }}
      >
        Mismo producto. Una barrera técnica. La otra económica.
      </div>
    </AbsoluteFill>
  );
};
