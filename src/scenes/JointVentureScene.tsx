import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN  = 0;
const CENTER_IN = 18;
const CORP_IN   = 50;
const CORP_STAG = 35;
const ARROW_IN  = 200;
const TEXT_IN   = 300;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Corners for the 4 companies
const COMPANIES = [
  { label: "Nokia",    sub: "Finlandia",  x: 130, y: 140, color: "#00d4ff" },
  { label: "Ericsson", sub: "Suecia",     x: 930, y: 140, color: "#f59e0b" },
  { label: "Motorola", sub: "EE.UU.",     x: 130, y: 470, color: "#22c55e" },
  { label: "Psion",    sub: "Reino Unido",x: 930, y: 470, color: "#8b5cf6" },
];

const BOX_W = 180;
const BOX_H = 66;
const CTR_X = 490;
const CTR_Y = 278;
const CTR_W = 200;
const CTR_H = 70;

export const JointVentureScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const centerOp = useFade(CENTER_IN);
  const textOp   = useFade(TEXT_IN);

  // Year counter: 0 → 1998
  const yearVal = Math.round(
    interpolate(frame, [CENTER_IN, CENTER_IN + 60], [1990, 1998], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 23, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Symbian Ltd — la joint venture que separó OS de UI
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 600 }}>
        <defs>
          <marker id="arr-jv" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <circle cx={3.5} cy={3.5} r={3} fill="#8b5cf6" />
          </marker>
        </defs>

        {/* ── Center node: Symbian Ltd ── */}
        <g opacity={centerOp}>
          <rect x={CTR_X} y={CTR_Y} width={CTR_W} height={CTR_H}
            rx={10} fill="#8b5cf622" stroke="#8b5cf6" strokeWidth={2} />
          <text x={CTR_X + CTR_W / 2} y={CTR_Y + 28}
            textAnchor="middle" fill="#8b5cf6"
            fontSize={18} fontWeight="800" fontFamily={interFamily}>
            Symbian Ltd
          </text>
          <text x={CTR_X + CTR_W / 2} y={CTR_Y + 50}
            textAnchor="middle" fill="#8b5cf666"
            fontSize={12} fontFamily={interFamily}>
            Joint venture
          </text>
          {/* Year label */}
          <text x={CTR_X + CTR_W / 2} y={CTR_Y - 14}
            textAnchor="middle" fill="#8b5cf6"
            fontSize={20} fontWeight="900" fontFamily={interFamily}
            opacity={centerOp}>
            {yearVal}
          </text>
        </g>

        {/* ── Company boxes + arrows ── */}
        {COMPANIES.map(({ label, sub, x, y, color }, i) => {
          const startF = CORP_IN + i * CORP_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const aop = interpolate(frame, [ARROW_IN + i * 15, ARROW_IN + i * 15 + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          // Arrow from company box edge to center box
          const bx = x + BOX_W / 2;
          const by = y + BOX_H / 2;
          const cx = CTR_X + CTR_W / 2;
          const cy = CTR_Y + CTR_H / 2;

          return (
            <g key={i}>
              {/* Company box */}
              <g opacity={op}>
                <rect x={x} y={y} width={BOX_W} height={BOX_H}
                  rx={8} fill={`${color}12`} stroke={`${color}55`} strokeWidth={1.5} />
                <text x={x + BOX_W / 2} y={y + 26}
                  textAnchor="middle" fill={color}
                  fontSize={16} fontWeight="700" fontFamily={interFamily}>
                  {label}
                </text>
                <text x={x + BOX_W / 2} y={y + 46}
                  textAnchor="middle" fill="#64748b"
                  fontSize={12} fontFamily={interFamily}>
                  {sub}
                </text>
              </g>
              {/* Arrow */}
              <line
                x1={bx} y1={by} x2={cx} y2={cy}
                stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
                strokeDasharray="5 3"
                opacity={aop}
                markerEnd="url(#arr-jv)"
              />
            </g>
          );
        })}
      </svg>

      {/* Bottom text */}
      <div style={{
        position: "absolute", bottom: 48, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 20, lineHeight: 1.5,
        opacity: textOp, padding: "0 120px",
      }}>
        Cada fabricante construía su propia UI sobre el mismo kernel.
        <div style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>
          Sentido comercial para distribuir costos de desarrollo.
          Doble fricción para el desarrollador third-party.
        </div>
      </div>
    </AbsoluteFill>
  );
};
