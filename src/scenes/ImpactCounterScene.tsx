import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const COUNTER_START = 20;
const COUNTER_END   = 200;
const LINE1_IN      = 220;
const LINE2_IN      = 320;
const FADE          = 16;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

export const ImpactCounterScene: React.FC = () => {
  const frame = useCurrentFrame();

  const pct = Math.round(
    interpolate(frame, [COUNTER_START, COUNTER_END], [0, 75], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  const numOp = interpolate(frame, [COUNTER_START, COUNTER_START + 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const line1Op = useFade(LINE1_IN);
  const line2Op = useFade(LINE2_IN);

  // Pulse the number as it reaches 75
  const atMax = frame >= COUNTER_END;
  const pulseScale = atMax
    ? 1 + 0.015 * Math.sin((frame - COUNTER_END) * 0.12)
    : 1;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#0a0a0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 300,
        background: "radial-gradient(ellipse at center, rgba(239,68,68,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Counter */}
      <div style={{
        fontFamily: interFamily,
        fontSize: 180,
        fontWeight: 900,
        color: "#ef4444",
        lineHeight: 1,
        letterSpacing: "-0.05em",
        opacity: numOp,
        transform: `scale(${pulseScale})`,
        textShadow: atMax ? "0 0 60px rgba(239,68,68,0.4)" : "none",
      }}>
        {pct}
        <span style={{ fontSize: 80 }}>%</span>
      </div>

      {/* Line 1 */}
      <div style={{
        fontFamily: interFamily,
        color: "#e2e8f0",
        fontSize: 26,
        fontWeight: 400,
        marginTop: 16,
        opacity: line1Op,
        textAlign: "center",
      }}>
        de desarrolladores móviles evitaban Symbian
      </div>

      {/* Divider */}
      <div style={{
        width: 480, height: 1, backgroundColor: "#1e293b",
        marginTop: 32, marginBottom: 32,
        opacity: line1Op,
      }} />

      {/* Line 2 */}
      <div style={{
        fontFamily: interFamily,
        color: "#e2e8f0",
        fontSize: 22,
        fontWeight: 500,
        opacity: line2Op,
        textAlign: "center",
        maxWidth: 720,
        lineHeight: 1.5,
      }}>
        Nokia perdió el ecosistema{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>3 años antes</span>{" "}
        que el hardware.
      </div>

      {/* Source note */}
      <div style={{
        position: "absolute",
        bottom: 44, left: 0, right: 0,
        textAlign: "center",
        fontFamily: interFamily,
        color: "#334155",
        fontSize: 13,
        opacity: line2Op,
      }}>
        Evans Data Corp · 2010
      </div>
    </AbsoluteFill>
  );
};
