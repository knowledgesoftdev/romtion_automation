import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

type Props = { texto: string };

// Extracts "1" from "DECISIÓN 1: ..."
function parseDecision(texto: string): { number: string; subtitle: string } {
  const match = texto.match(/DECISIÓN\s+(\d+):\s*(.+)/i);
  if (match) return { number: match[1], subtitle: match[2] };
  return { number: "?", subtitle: texto };
}

const LINE_START = 8;
const LINE_END   = 32;
const TEXT_IN    = 22;

// Deterministic glitch: small x-offsets at specific frames within a cycle
function glitchX(frame: number): number {
  if (frame < TEXT_IN + 8 || frame > TEXT_IN + 50) return 0;
  const local = frame - (TEXT_IN + 8);
  const cycle = local % 14;
  if (cycle < 2) return 4;
  if (cycle < 4) return -3;
  if (cycle < 5) return 6;
  return 0;
}

export const DecisionTitle: React.FC<Props> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { number, subtitle } = parseDecision(texto);

  const lineHalfW = interpolate(frame, [LINE_START, LINE_END], [0, 440], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const textOp = interpolate(frame, [TEXT_IN, TEXT_IN + 16], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const numberOp = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const gx = glitchX(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* Giant background number */}
      <div style={{
        position: "absolute",
        fontFamily: interFamily,
        fontSize: 480,
        fontWeight: 900,
        color: "#8b5cf6",
        opacity: numberOp * 0.07,
        lineHeight: 1,
        userSelect: "none",
        pointerEvents: "none",
      }}>
        {number}
      </div>

      {/* Expanding cyan line */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -lineHalfW,
        width: lineHalfW * 2,
        height: 2,
        backgroundColor: "#00d4ff",
        boxShadow: "0 0 12px #00d4ff88",
        transform: "translateY(32px)",
      }} />

      {/* Decisión label */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0, right: 0,
        textAlign: "center",
        transform: "translateY(-52px)",
        opacity: textOp,
      }}>
        <div style={{
          fontFamily: interFamily,
          fontSize: 13,
          fontWeight: 700,
          color: "#8b5cf6",
          letterSpacing: "0.25em",
          marginBottom: 12,
        }}>
          DECISIÓN {number}
        </div>
        <div style={{
          fontFamily: interFamily,
          fontSize: 32,
          fontWeight: 700,
          color: "#00d4ff",
          letterSpacing: "0.01em",
          lineHeight: 1.3,
          transform: `translateX(${gx}px)`,
          padding: "0 80px",
        }}>
          {subtitle}
        </div>
      </div>

    </AbsoluteFill>
  );
};
