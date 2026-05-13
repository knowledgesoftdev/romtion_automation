import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const AXIS_IN   = 18;
const NODE_STAG = 80;
const NODES_IN  = 40;
const CONCL_IN  = 440;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// ── milestones ───────────────────────────────────────────────────────────────
type Milestone = {
  date: string;
  label: string;
  detail: string;
  color: string;
  boxY: number;    // above (negative) or below (positive) axis
  boxH: number;
};

const TL_Y     = 340;
const TL_LEFT  = 80;
const TL_RIGHT = 1160;
const BOX_W    = 220;

const MILESTONES: Milestone[] = [
  {
    date: "Feb 2011",
    label: "Memo Burning Platform",
    detail: "Elop: Symbian es una plataforma condenada. Filtrado el mismo día.",
    color: "#f59e0b",
    boxY: -180,
    boxH: 90,
  },
  {
    date: "Feb 2011",
    label: "Anuncio Windows Phone",
    detail: "Nokia abandona Symbian y MeeGo. Ventas de Symbian caen en picada.",
    color: "#ef4444",
    boxY: 50,
    boxH: 80,
  },
  {
    date: "Ago 2011",
    label: "Nokia N9 (MeeGo)",
    detail: "Críticas técnicas superiores a cualquier WP Nokia. Descontinuado inmediatamente.",
    color: "#22c55e",
    boxY: -180,
    boxH: 90,
  },
  {
    date: "Fin 2011",
    label: "WP disponible",
    detail: "9 meses de vacío comercial. Android consolida su posición.",
    color: "#0ea5e9",
    boxY: 50,
    boxH: 80,
  },
  {
    date: "2013",
    label: "Microsoft adquiere Nokia",
    detail: "$5,440M. De 40% a <3% de market share. Destrucción de valor >80%.",
    color: "#ef4444",
    boxY: -200,
    boxH: 100,
  },
];

// Distribute milestones along the timeline
const MILESTONE_XS = [140, 140, 560, 860, 1120];

export const DecisionTimelineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const axisOp  = useFade(AXIS_IN);
  const conclOp = useFade(CONCL_IN);

  // Animate the axis line drawing left to right
  const axisW = interpolate(frame, [AXIS_IN, AXIS_IN + 60], [0, TL_RIGHT - TL_LEFT], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp,
      }}>
        La secuencia del colapso — Feb 2011 a 2013
      </div>

      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720 }}>

        {/* ── Timeline axis ── */}
        <g opacity={axisOp}>
          <line x1={TL_LEFT} y1={TL_Y} x2={TL_LEFT + axisW} y2={TL_Y} stroke="#334155" strokeWidth={2} />
          {axisW > TL_RIGHT - TL_LEFT - 5 && (
            <polygon points={`${TL_RIGHT},${TL_Y - 5} ${TL_RIGHT + 12},${TL_Y} ${TL_RIGHT},${TL_Y + 5}`} fill="#334155" />
          )}
        </g>

        {/* ── Milestones ── */}
        {MILESTONES.map(({ date, label, detail, color, boxY, boxH }, i) => {
          const cx = MILESTONE_XS[i];
          const startF = NODES_IN + i * NODE_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 20], [boxY < 0 ? 10 : -10, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          // Connecting line
          const lineY1 = boxY < 0 ? TL_Y + boxY + boxH : TL_Y;
          const lineY2 = boxY < 0 ? TL_Y : TL_Y + boxY;

          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              {/* Connecting line */}
              <line
                x1={cx + BOX_W / 2} y1={lineY1}
                x2={cx + BOX_W / 2} y2={lineY2}
                stroke={color} strokeWidth={1.5} strokeDasharray="4 3"
                strokeOpacity={0.5}
              />
              {/* Dot on axis */}
              <circle cx={cx + BOX_W / 2} cy={TL_Y} r={8} fill={color} />
              {/* Date label on axis */}
              <text
                x={cx + BOX_W / 2} y={TL_Y + (boxY < 0 ? 22 : -10)}
                textAnchor="middle" fill={color}
                fontSize={12} fontWeight="700" fontFamily={interFamily}
              >
                {date}
              </text>
              {/* Info box */}
              <rect
                x={cx} y={TL_Y + boxY}
                width={BOX_W} height={boxH}
                rx={8} fill={`${color}12`} stroke={`${color}55`} strokeWidth={1.5}
              />
              <text
                x={cx + BOX_W / 2} y={TL_Y + boxY + 22}
                textAnchor="middle" fill={color}
                fontSize={13} fontWeight="700" fontFamily={interFamily}
              >
                {label}
              </text>
              {/* Detail text (wrapped manually) */}
              {detail.split(". ").map((line, j) => (
                <text key={j}
                  x={cx + 10} y={TL_Y + boxY + 40 + j * 18}
                  fill="#94a3b8" fontSize={11} fontFamily={interFamily}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Vacuum interval label (Feb→Dec 2011) */}
        <rect
          x={MILESTONE_XS[1] + BOX_W / 2} y={TL_Y + 10}
          width={MILESTONE_XS[3] - MILESTONE_XS[1]}
          height={30} rx={4}
          fill="#0ea5e908" stroke="#0ea5e944" strokeWidth={1}
          opacity={useFade(NODES_IN + 3 * NODE_STAG + 20)}
        />
        <text
          x={(MILESTONE_XS[1] + MILESTONE_XS[3] + BOX_W) / 2}
          y={TL_Y + 30}
          textAnchor="middle" fill="#0ea5e9"
          fontSize={11} fontWeight="600" fontFamily={interFamily}
          opacity={useFade(NODES_IN + 3 * NODE_STAG + 20)}
        >
          9 meses de vacío comercial
        </text>

      </svg>

      {/* Conclusion */}
      <div style={{
        position: "absolute", bottom: 36, left: 80, right: 80,
        fontFamily: interFamily, color: "#94a3b8", fontSize: 15,
        opacity: conclOp, lineHeight: 1.5, textAlign: "center",
      }}>
        Windows Phone nunca superó el{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>4%</span>{" "}
        de market share global.{" "}
        Nokia pasó de <span style={{ color: "#8b5cf6", fontWeight: 700 }}>40%</span>{" "}
        a <span style={{ color: "#ef4444", fontWeight: 700 }}>menos del 3%</span> en seis años.
      </div>

    </AbsoluteFill>
  );
};
