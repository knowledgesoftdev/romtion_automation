import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN  = 0;
const CENTER_IN = 20;
const OPT_STAG  = 55;
const OPTS_IN   = 70;
const N9_IN     = 310;
const TEXT_IN   = 440;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const CX = 640;
const CY = 300;
const NOKIA_R = 52;

const OPTIONS = [
  {
    angle: -100,  dist: 280,
    label: "MeeGo",
    tag: "18–24 meses más",
    color: "#f59e0b",
    status: "available",
  },
  {
    angle: 180,   dist: 280,
    label: "Symbian",
    tag: "Plataforma condenada",
    color: "#ef4444",
    status: "x",
  },
  {
    angle: -70,   dist: 310,
    label: "Windows Phone",
    tag: "$1,000–2,000M / año",
    color: "#00d4ff",
    status: "check",
  },
];

const BOX_W = 200;
const BOX_H = 72;

export const OptionsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const centerOp = useFade(CENTER_IN);
  const n9Op     = useFade(N9_IN);
  const textOp   = useFade(TEXT_IN);

  // Nokia center pulse
  const pulse = 1 + 0.025 * Math.sin(frame * 0.08);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Las opciones descartadas — febrero 2011
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 580 }}>
        <defs>
          <marker id="arr-opt" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M 0,0 L 8,4 L 0,8 Z" fill="#475569" />
          </marker>
        </defs>

        {/* ── Center Nokia node ── */}
        <g opacity={centerOp} transform={`translate(${CX},${CY}) scale(${pulse})`}>
          <circle cx={0} cy={0} r={NOKIA_R} fill="#33415514" stroke="#475569" strokeWidth={2} />
          <circle cx={0} cy={0} r={NOKIA_R + 12} fill="none" stroke="#33415555" strokeWidth={1} />
          <text x={0} y={-4} textAnchor="middle"
            fill="#94a3b8" fontSize={16} fontWeight="800" fontFamily={interFamily}>
            Nokia
          </text>
          <text x={0} y={16} textAnchor="middle"
            fill="#475569" fontSize={22} fontFamily={interFamily}>
            ?
          </text>
        </g>

        {/* ── Option nodes ── */}
        {OPTIONS.map(({ angle, dist, label, tag, color, status }, i) => {
          const startF = OPTS_IN + i * OPT_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const rad = (angle * Math.PI) / 180;
          const bx = CX + Math.cos(rad) * dist;
          const by = CY + Math.sin(rad) * dist;

          // Arrow: from Nokia edge to box
          const ex = CX + Math.cos(rad) * NOKIA_R;
          const ey = CY + Math.sin(rad) * NOKIA_R;

          const abandoned = status === "x";
          const chosen    = status === "check";

          return (
            <g key={i} opacity={op}>
              {/* Arrow */}
              <line
                x1={ex} y1={ey}
                x2={bx - Math.cos(rad) * BOX_W * 0.5}
                y2={by - Math.sin(rad) * BOX_H * 0.5}
                stroke={color} strokeWidth={1.5}
                strokeDasharray={abandoned ? "4 3" : "none"}
                strokeOpacity={0.5}
                markerEnd="url(#arr-opt)"
              />
              {/* Box */}
              <rect
                x={bx - BOX_W / 2} y={by - BOX_H / 2}
                width={BOX_W} height={BOX_H}
                rx={8}
                fill={`${color}10`}
                stroke={color}
                strokeWidth={abandoned ? 1.5 : 2}
                strokeDasharray={abandoned ? "5 3" : "none"}
              />
              <text x={bx} y={by - 8}
                textAnchor="middle" fill={color}
                fontSize={15} fontWeight="700" fontFamily={interFamily}>
                {abandoned ? "✕ " : chosen ? "✓ " : ""}{label}
              </text>
              <text x={bx} y={by + 14}
                textAnchor="middle" fill="#64748b"
                fontSize={12} fontFamily={interFamily}>
                {tag}
              </text>
            </g>
          );
        })}

      </svg>

      {/* ── Nokia N9 note (MeeGo device) ── */}
      <div style={{
        position: "absolute", left: 80, bottom: 120,
        backgroundColor: "#00d4ff0a",
        border: "2px dashed #00d4ff44",
        borderRadius: 10, padding: "14px 18px", width: 360,
        opacity: n9Op,
      }}>
        <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
          NOKIA N9 — AGOSTO 2011
        </div>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 14, lineHeight: 1.5 }}>
          Único dispositivo MeeGo lanzado.<br />
          Críticas técnicas superiores a cualquier Windows Phone Nokia de ese año.
        </div>
        <div style={{
          marginTop: 8, fontFamily: interFamily, color: "#ef4444",
          fontSize: 12, fontWeight: 700,
        }}>
          Descontinuado sin continuidad.
        </div>
      </div>

      {/* Bottom text */}
      <div style={{
        position: "absolute", bottom: 44, left: 80, right: 80,
        textAlign: "center", fontFamily: interFamily,
        color: "#64748b", fontSize: 16, lineHeight: 1.5,
        opacity: textOp,
      }}>
        MeeGo necesitaba 18–24 meses más. Windows Phone ofreció un sistema inmediatamente disponible
        con respaldo financiero de Microsoft.
        <br />
        <span style={{ color: "#f59e0b" }}>La decisión tenía lógica. El timing no.</span>
      </div>
    </AbsoluteFill>
  );
};
