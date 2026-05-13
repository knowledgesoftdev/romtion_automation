import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont, fontFamily as monoFamily } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadFont();
loadInter();

const SYMBIAN_LINES = [
  "CleanupStack::PushL(objeto);",
  "objeto->HeavyOperationL();",
  "CleanupStack::PopAndDestroy(objeto);",
];

const IOS_LINES = [
  "id obj = [[Clase alloc] init];",
  "[obj heavyOperation];",
];

// Frame timing
const TITLE_IN = 0;
const LABELS_IN = 20;
const SYM_LINE_START = 40;
const SYM_LINE_STAGGER = 30;
const IOS_LINE_START = 140;
const IOS_LINE_STAGGER = 30;
const COUNTERS_IN = 210;
const FADE = 12;

type LineProps = {
  code: string;
  startFrame: number;
  showArrow?: boolean;
  slideFrom?: "left" | "right";
};

const CodeLine: React.FC<LineProps> = ({
  code,
  startFrame,
  showArrow = false,
  slideFrom = "left",
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tx = interpolate(
    frame,
    [startFrame, startFrame + FADE],
    [slideFrom === "left" ? -24 : 24, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity,
        transform: `translateX(${tx}px)`,
        marginBottom: 20,
      }}
    >
      {showArrow && (
        <span
          style={{
            color: "#ef4444",
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ▶
        </span>
      )}
      <code
        style={{
          fontFamily: monoFamily,
          color: "#e2e8f0",
          fontSize: 21,
          whiteSpace: "pre",
          lineHeight: 1.5,
        }}
      >
        {code}
      </code>
    </div>
  );
};

export const Animacion1: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [TITLE_IN, TITLE_IN + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelsOpacity = interpolate(frame, [LABELS_IN, LABELS_IN + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countersOpacity = interpolate(frame, [COUNTERS_IN, COUNTERS_IN + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: interFamily,
          color: "#00d4ff",
          fontSize: 30,
          fontWeight: "bold",
          opacity: titleOpacity,
          letterSpacing: "0.02em",
        }}
      >
        El mismo resultado. Diferente costo humano.
      </div>

      {/* Columns */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 80,
          right: 80,
          bottom: 90,
          display: "flex",
        }}
      >
        {/* Left — Symbian */}
        <div style={{ flex: 1, paddingRight: 48 }}>
          <div
            style={{
              fontFamily: interFamily,
              color: "#64748b",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 28,
              opacity: labelsOpacity,
            }}
          >
            Symbian C++
          </div>
          {SYMBIAN_LINES.map((line, i) => (
            <CodeLine
              key={i}
              code={line}
              startFrame={SYM_LINE_START + i * SYM_LINE_STAGGER}
              showArrow
              slideFrom="left"
            />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            backgroundColor: "#1e293b",
            opacity: labelsOpacity,
          }}
        />

        {/* Right — iOS */}
        <div style={{ flex: 1, paddingLeft: 48 }}>
          <div
            style={{
              fontFamily: interFamily,
              color: "#64748b",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 28,
              opacity: labelsOpacity,
            }}
          >
            iOS Objective-C
          </div>
          {IOS_LINES.map((line, i) => (
            <CodeLine
              key={i}
              code={line}
              startFrame={IOS_LINE_START + i * IOS_LINE_STAGGER}
              slideFrom="right"
            />
          ))}
        </div>
      </div>

      {/* Bottom counters */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 80,
          fontFamily: interFamily,
          color: "#ef4444",
          fontSize: 22,
          fontWeight: "bold",
          opacity: countersOpacity,
        }}
      >
        Symbian: 14 líneas
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 44,
          right: 80,
          fontFamily: interFamily,
          color: "#00d4ff",
          fontSize: 22,
          fontWeight: "bold",
          opacity: countersOpacity,
        }}
      >
        iOS: 4 líneas
      </div>
    </AbsoluteFill>
  );
};
