import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN  = 0;
const BOX_STAG  = 50;
const BOXES_IN  = 20;
const TEXT_IN   = 260;
const COST_IN   = 360;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const VERSIONS = [
  { label: "S60 v1", year: "2001", color: "#8b5cf6", compat: "S60 1st" },
  { label: "S60 v2", year: "2003", color: "#7c3aed", compat: "S60 2nd" },
  { label: "S60 v3", year: "2006", color: "#ef4444", compat: "S60 3rd ✗", note: "Rompe compat." },
  { label: "S60 v5", year: "2008", color: "#dc2626", compat: "S60 5th ✗", note: "Nueva ruptura" },
];

const BOX_W = 220;
const BOX_H = 280;
const GAP   = 24;
const TOTAL_W = VERSIONS.length * BOX_W + (VERSIONS.length - 1) * GAP;
const START_X = (1280 - TOTAL_W) / 2;
const BOX_Y   = 160;

// Simple person icon SVG
const DevIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={40} height={52} viewBox="0 0 40 52" style={{ display: "block", margin: "0 auto 8px" }}>
    <circle cx={20} cy={11} r={9} fill={color} fillOpacity={0.8} />
    <path d="M4 44 C4 32 36 32 36 44 L36 52 L4 52 Z" fill={color} fillOpacity={0.8} />
  </svg>
);

export const S60VersionsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const textOp  = useFade(TEXT_IN);
  const costOp  = useFade(COST_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        S60 — cuatro versiones activas e incompatibles simultáneamente
      </div>

      {/* ── Version boxes ── */}
      {VERSIONS.map(({ label, year, color, compat, note }, i) => {
        const startF = BOXES_IN + i * BOX_STAG;
        const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const ty = interpolate(frame, [startF, startF + 22], [-16, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const x = START_X + i * (BOX_W + GAP);

        // Incompatibility X between versions
        const showX = i > 0 && i < VERSIONS.length;

        return (
          <React.Fragment key={i}>
            {/* Incompat marker */}
            {showX && (
              <div style={{
                position: "absolute",
                left: x - GAP - 6,
                top: BOX_Y + BOX_H / 2 - 14,
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "#1a0808",
                border: "1.5px solid #ef444466",
                borderRadius: "50%",
                fontFamily: interFamily,
                color: "#ef4444",
                fontSize: 14, fontWeight: 900,
                opacity: useFade(BOXES_IN + i * BOX_STAG + 10),
              }}>
                ✕
              </div>
            )}

            <div style={{
              position: "absolute",
              left: x, top: BOX_Y, width: BOX_W, height: BOX_H,
              backgroundColor: `${color}0e`,
              border: `2px solid ${color}44`,
              borderRadius: 12,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-start",
              paddingTop: 24, paddingBottom: 16,
              opacity: op, transform: `translateY(${ty}px)`,
            }}>
              {/* Dev icon */}
              <DevIcon color={color} />

              <div style={{
                fontFamily: interFamily, color, fontSize: 20, fontWeight: 800, marginBottom: 4,
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: interFamily, color: "#64748b", fontSize: 14, marginBottom: 16,
              }}>
                {year}
              </div>

              {/* Compat badge */}
              <div style={{
                backgroundColor: note ? "#ef44441a" : `${color}1a`,
                border: `1px solid ${note ? "#ef444455" : `${color}55`}`,
                borderRadius: 6, padding: "4px 10px",
                fontFamily: interFamily,
                color: note ? "#ef4444" : color,
                fontSize: 12, fontWeight: 700, marginBottom: 8,
              }}>
                {compat}
              </div>
              {note && (
                <div style={{
                  fontFamily: interFamily, color: "#ef4444",
                  fontSize: 11, fontWeight: 600, textAlign: "center",
                  padding: "0 12px",
                }}>
                  {note}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      {/* ── Text ── */}
      <div style={{
        position: "absolute",
        bottom: 80, left: 0, right: 0,
        textAlign: "center",
        opacity: textOp,
      }}>
        <div style={{
          fontFamily: interFamily, color: "#e2e8f0",
          fontSize: 26, fontWeight: 700, marginBottom: 8,
        }}>
          Un desarrollador. Cuatro productos distintos.
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b", fontSize: 16,
        }}>
          Una app de S60 v2 no corría en S60 v3 sin recompilación y frecuentemente reescritura.
        </div>
      </div>

      {/* Cost counter badge */}
      <div style={{
        position: "absolute",
        right: 48, top: 170,
        backgroundColor: "#1a0808",
        border: "2px solid #ef444455",
        borderRadius: 10, padding: "14px 20px",
        opacity: costOp,
        textAlign: "center",
      }}>
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>
          4×
        </div>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          mantenimiento
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 12, marginTop: 4 }}>
          vs iOS (1 build)
        </div>
      </div>
    </AbsoluteFill>
  );
};
