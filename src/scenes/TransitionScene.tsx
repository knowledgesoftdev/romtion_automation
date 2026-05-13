import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN  = 0;
const DATE_IN   = 18;
const BOX_STAG  = 55;
const BOXES_IN  = 50;
const MS_IN     = 260;
const TEXT_IN   = 380;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const BOXES = [
  { label: "Symbian",       status: "abandoned", color: "#ef4444", note: "Abandonado" },
  { label: "MeeGo",         status: "abandoned", color: "#ef4444", note: "Abandonado" },
  { label: "Windows Phone", status: "chosen",    color: "#00d4ff", note: "Elegido" },
];

const BOX_W  = 220;
const BOX_H  = 80;
const GAP    = 60;
const TOTAL  = BOXES.length * BOX_W + (BOXES.length - 1) * GAP;
const BOX_X  = (1280 - TOTAL) / 2;
const BOX_Y  = 240;

export const TransitionScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const dateOp  = useFade(DATE_IN);
  const msOp    = useFade(MS_IN);
  const textOp  = useFade(TEXT_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 23, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Febrero 2011 — Nokia abandona Symbian y MeeGo, adopta Windows Phone
      </div>

      {/* Date badge */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        backgroundColor: "#1a1000",
        border: "2px solid #f59e0b55",
        borderRadius: 8, padding: "8px 20px",
        fontFamily: interFamily, color: "#f59e0b",
        fontSize: 18, fontWeight: 700,
        opacity: dateOp,
        whiteSpace: "nowrap",
      }}>
        Febrero 2011
      </div>

      {/* ── Three boxes ── */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720 }}>
        <defs>
          <marker id="arr-trans" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M 0,0 L 7,3.5 L 0,7 Z" fill="#334155" />
          </marker>
        </defs>
        {/* Connecting arrows */}
        {[0, 1].map((i) => {
          const x1 = BOX_X + (i + 1) * BOX_W + i * GAP;
          const x2 = x1 + GAP;
          const y = BOX_Y + BOX_H / 2;
          const op = interpolate(frame, [BOXES_IN + (i + 1) * BOX_STAG, BOXES_IN + (i + 1) * BOX_STAG + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <line key={i}
              x1={x1} y1={y} x2={x2} y2={y}
              stroke="#334155" strokeWidth={2}
              markerEnd="url(#arr-trans)"
              opacity={op}
            />
          );
        })}
      </svg>

      {/* Boxes */}
      {BOXES.map(({ label, status, color, note }, i) => {
        const startF = BOXES_IN + i * BOX_STAG;
        const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const ty = interpolate(frame, [startF, startF + 20], [-12, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const x = BOX_X + i * (BOX_W + GAP);
        const abandoned = status === "abandoned";

        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: BOX_Y, width: BOX_W, height: BOX_H,
            opacity: op, transform: `translateY(${ty}px)`,
          }}>
            <div style={{
              width: "100%", height: "100%",
              backgroundColor: `${color}10`,
              border: `2px solid ${color}55`,
              borderRadius: 10,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <div style={{
                fontFamily: interFamily, color, fontSize: 18, fontWeight: 700,
                textDecoration: abandoned ? "line-through" : "none",
                textDecorationColor: "#ef4444",
              }}>
                {label}
              </div>
              {/* Status badge */}
              <div style={{
                marginTop: 6,
                backgroundColor: color + "22",
                borderRadius: 4, padding: "2px 10px",
                fontFamily: interFamily, color,
                fontSize: 11, fontWeight: 700,
              }}>
                {abandoned ? "✕ " : "✓ "}{note}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Microsoft arrow ── */}
      <div style={{
        position: "absolute", top: 380,
        left: "50%", transform: "translateX(-50%)",
        opacity: msOp, textAlign: "center",
      }}>
        <svg width={300} height={60}>
          <defs>
            <marker id="arr-ms" markerWidth="7" markerHeight="7" refX="3.5" refY="7" orient="auto">
              <path d="M 0,0 L 7,0 L 3.5,7 Z" fill="#00d4ff" />
            </marker>
          </defs>
          <line x1={150} y1={0} x2={150} y2={42}
            stroke="#00d4ff" strokeWidth={2}
            markerEnd="url(#arr-ms)" />
          <text x={150} y={14} textAnchor="middle"
            fill="#00d4ff" fontSize={13} fontWeight="700" fontFamily={interFamily}>
            Microsoft
          </text>
        </svg>
        <div style={{
          fontFamily: interFamily, color: "#00d4ff",
          fontSize: 18, fontWeight: 700, marginTop: -4,
        }}>
          $1,000–2,000M / año
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b",
          fontSize: 13, marginTop: 4,
        }}>
          subsidio de transición
        </div>
      </div>

      {/* Bottom text */}
      <div style={{
        position: "absolute", bottom: 44, left: 80, right: 80,
        textAlign: "center", opacity: textOp,
        fontFamily: interFamily, color: "#94a3b8", fontSize: 16, lineHeight: 1.5,
      }}>
        El anuncio de abandono de Symbian destruyó sus ventas{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>antes</span>{" "}
        de que hubiera un reemplazo disponible.
        <br />
        9 meses de vacío comercial — en ese intervalo,{" "}
        <span style={{ color: "#22c55e", fontWeight: 700 }}>Android consolidó su posición.</span>
      </div>
    </AbsoluteFill>
  );
};
