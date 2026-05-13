import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const METRIC1_IN  = 10;
const METRIC1_END = 200;
const METRIC2_IN  = 240;
const METRIC2_END = 430;
const TEXT_IN     = 470;
const PULSE_AT    = 560;
const FADE        = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

export const MarketCollapseScene: React.FC = () => {
  const frame = useCurrentFrame();

  const m1Op = useFade(METRIC1_IN);
  const m2Op = useFade(METRIC2_IN);
  const textOp = useFade(TEXT_IN);

  // Market share: 40 → 3 (counting down)
  const shareVal = Math.round(
    interpolate(frame, [METRIC1_IN, METRIC1_END], [40, 3], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    })
  );

  // Valuation: 30000 → 5440 (counting down)
  const valVal = Math.round(
    interpolate(frame, [METRIC2_IN, METRIC2_END], [30000, 5440], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    })
  );

  // Red pulse at PULSE_AT
  const pulseFrame = Math.max(0, frame - PULSE_AT);
  const pulseOp = interpolate(pulseFrame, [0, 8, 30], [0, 0.18, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      {/* Red pulse overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundColor: "#ef4444",
        opacity: pulseOp,
        pointerEvents: "none",
      }} />

      {/* Background glow */}
      <div style={{
        position: "absolute",
        width: 900, height: 500,
        background: "radial-gradient(ellipse at center, rgba(239,68,68,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Metric 1: Market share ── */}
      <div style={{ opacity: m1Op, textAlign: "center", marginBottom: 32 }}>
        <div style={{
          fontFamily: interFamily, color: "#64748b",
          fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 8,
        }}>
          MARKET SHARE GLOBAL — 2007 → 2013
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 16 }}>
          <span style={{
            fontFamily: interFamily, color: "#8b5cf6",
            fontSize: 72, fontWeight: 900, lineHeight: 1,
          }}>
            40%
          </span>
          <span style={{ fontFamily: interFamily, color: "#475569", fontSize: 40 }}>→</span>
          <span style={{
            fontFamily: interFamily, color: "#ef4444",
            fontSize: 120, fontWeight: 900, lineHeight: 1,
            textShadow: frame >= METRIC1_END ? "0 0 40px rgba(239,68,68,0.5)" : "none",
          }}>
            {shareVal}%
          </span>
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 8 }}>
          Nokia · móviles globales
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: 600, height: 1, backgroundColor: "#1e293b",
        marginBottom: 32, opacity: m2Op,
      }} />

      {/* ── Metric 2: Valuation ── */}
      <div style={{ opacity: m2Op, textAlign: "center" }}>
        <div style={{
          fontFamily: interFamily, color: "#64748b",
          fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 8,
        }}>
          VALORACIÓN DIVISIÓN MÓVILES — IMPLÍCITA 2007 → VENTA 2013
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 16 }}>
          <span style={{
            fontFamily: interFamily, color: "#8b5cf6",
            fontSize: 52, fontWeight: 900, lineHeight: 1,
          }}>
            ~$30,000M
          </span>
          <span style={{ fontFamily: interFamily, color: "#475569", fontSize: 36 }}>→</span>
          <span style={{
            fontFamily: interFamily, color: "#ef4444",
            fontSize: 72, fontWeight: 900, lineHeight: 1,
          }}>
            ${valVal.toLocaleString()}M
          </span>
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 8 }}>
          Venta a Microsoft · 2013
        </div>
      </div>

      {/* ── Conclusion ── */}
      <div style={{
        marginTop: 40, opacity: textOp,
        fontFamily: interFamily, color: "#ef4444",
        fontSize: 26, fontWeight: 800, textAlign: "center",
        letterSpacing: "0.01em",
      }}>
        Destrucción de valor del 80% en 6 años.
      </div>
      <div style={{
        marginTop: 10, opacity: textOp,
        fontFamily: interFamily, color: "#64748b",
        fontSize: 15, textAlign: "center",
      }}>
        No por un solo error puntual — por seis decisiones estructurales acumuladas.
      </div>
    </AbsoluteFill>
  );
};
