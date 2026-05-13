import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN   = 0;
const ICONS_IN   = 22;
const ICON_STAG  = 14;
const BARS_IN    = 230;
const BARS_END   = 340;
const LABEL_IN   = 350;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Simple person SVG icon
const PersonIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 40 }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
    <circle cx={20} cy={11} r={9} fill={color} fillOpacity={0.85} />
    <path d="M4 44 C4 32 36 32 36 44 L36 52 L4 52 Z" fill={color} fillOpacity={0.85} />
  </svg>
);

const SYMBIAN_COUNT = 7;
const IOS_COUNT     = 1;

// Timeline bar data
const TIMELINES = [
  { label: "Ciclo Symbian (mayor)", months: 18, color: "#ef4444", maxW: 540 },
  { label: "Ciclo iOS (mayor)",     months: 12, color: "#00d4ff", maxW: 360 },
];

export const ImpactScene1: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const labelOp = useFade(LABEL_IN);

  const ICON_SIZE = 44;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Productividad por ingeniero — el costo de la complejidad
      </div>

      {/* ── Left: Symbian engineers ── */}
      <div style={{ position: "absolute", left: 80, top: 120 }}>
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}>
          SYMBIAN
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, width: 280, marginBottom: 16 }}>
          {Array.from({ length: SYMBIAN_COUNT }, (_, i) => {
            const op = interpolate(frame, [ICONS_IN + i * ICON_STAG, ICONS_IN + i * ICON_STAG + 12], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            const ty = interpolate(frame, [ICONS_IN + i * ICON_STAG, ICONS_IN + i * ICON_STAG + 16], [-12, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div key={i} style={{ opacity: op, transform: `translateY(${ty}px)` }}>
                <PersonIcon color="#ef4444" size={ICON_SIZE} />
              </div>
            );
          })}
        </div>
        <div style={{
          fontFamily: interFamily, color: "#ef4444", fontSize: 36, fontWeight: 800,
          opacity: interpolate(frame, [ICONS_IN + SYMBIAN_COUNT * ICON_STAG, ICONS_IN + SYMBIAN_COUNT * ICON_STAG + 14], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>
          5–8 ingenieros
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 4 }}>
          por feature equivalente
        </div>
        <div style={{
          marginTop: 16, fontFamily: interFamily, color: "#ef4444", fontSize: 18, fontWeight: 600,
          opacity: labelOp,
        }}>
          4–6× más costo por feature
        </div>
      </div>

      {/* Center vs label */}
      <div style={{
        position: "absolute", left: 490, top: 220,
        fontFamily: interFamily, color: "#334155", fontSize: 32, fontWeight: 900,
        opacity: useFade(ICONS_IN),
      }}>
        VS
      </div>

      {/* ── Right: iOS engineers ── */}
      <div style={{ position: "absolute", left: 560, top: 120 }}>
        <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}>
          iOS
        </div>
        <div style={{ marginBottom: 16 }}>
          {Array.from({ length: IOS_COUNT }, (_, i) => {
            const op = interpolate(frame, [ICONS_IN + (SYMBIAN_COUNT + 2) * ICON_STAG, ICONS_IN + (SYMBIAN_COUNT + 4) * ICON_STAG], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{ opacity: op }}>
                <PersonIcon color="#00d4ff" size={ICON_SIZE + 8} />
              </div>
            );
          })}
        </div>
        <div style={{
          fontFamily: interFamily, color: "#00d4ff", fontSize: 36, fontWeight: 800,
          opacity: interpolate(frame, [ICONS_IN + (SYMBIAN_COUNT + 3) * ICON_STAG, ICONS_IN + (SYMBIAN_COUNT + 5) * ICON_STAG], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
        }}>
          1 ingeniero
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 4 }}>
          misma funcionalidad
        </div>
        <div style={{
          marginTop: 16, fontFamily: interFamily, color: "#00d4ff", fontSize: 18, fontWeight: 600,
          opacity: labelOp,
        }}>
          Menos tiempo. Mismo resultado.
        </div>
      </div>

      {/* ── Timeline bars ── */}
      <div style={{ position: "absolute", left: 80, bottom: 60, right: 80 }}>
        <div style={{
          fontFamily: interFamily, color: "#475569", fontSize: 11,
          fontWeight: 700, letterSpacing: "0.15em", marginBottom: 18,
          opacity: useFade(BARS_IN - 10),
        }}>
          CICLO DE ACTUALIZACIÓN MAYOR
        </div>
        {TIMELINES.map(({ label, months, color, maxW }, i) => {
          const startF = BARS_IN + i * 30;
          const barW = interpolate(frame, [startF, BARS_END], [0, maxW], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ marginBottom: 16, opacity: op }}>
              <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 14, marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: barW, height: 22, backgroundColor: color, borderRadius: 4 }} />
                <div style={{ fontFamily: interFamily, color, fontSize: 16, fontWeight: 700 }}>
                  {months} meses
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </AbsoluteFill>
  );
};
