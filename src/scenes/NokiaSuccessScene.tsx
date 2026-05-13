import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN   = 0;
const AXIS_IN    = 18;
const BAR_IN     = 40;
const BAR_FREEZE = 460;  // bar freezes at 2007
const HIT_STAG   = 80;
const HITS_IN    = 100;
const TEXT_IN    = 400;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const MILESTONES = [
  { year: 1993, label: "Primer GSM Nokia",        sub: "Nokia 1011",      color: "#00d4ff" },
  { year: 1998, label: "Líder europeo",            sub: "Supera Motorola", color: "#00d4ff" },
  { year: 2003, label: "1,000M teléfonos vendidos",sub: "Hito global",     color: "#00d4ff" },
  { year: 2007, label: "40% mercado global",       sub: "Peak Nokia",      color: "#f59e0b" },
];

const TL_Y     = 300;
const TL_LEFT  = 100;
const TL_RIGHT = 1000;
const YR_MIN   = 1990;
const YR_MAX   = 2007;

function yearX(y: number) {
  return TL_LEFT + ((y - YR_MIN) / (YR_MAX - YR_MIN)) * (TL_RIGHT - TL_LEFT);
}

export const NokiaSuccessScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const axisOp  = useFade(AXIS_IN);
  const textOp  = useFade(TEXT_IN);

  // Progress bar grows from 1990 to 2007, then freezes
  const barEnd = Math.min(frame, BAR_FREEZE);
  const barPct = interpolate(barEnd, [BAR_IN, BAR_FREEZE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const barW = barPct * (TL_RIGHT - TL_LEFT);

  // After freeze, bar turns amber
  const frozen = frame >= BAR_FREEZE;
  const barColor = frozen ? "#f59e0b" : "#22c55e";

  // Current year label on bar
  const displayYear = Math.round(
    interpolate(Math.min(frame, BAR_FREEZE), [BAR_IN, BAR_FREEZE], [YR_MIN, YR_MAX], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    })
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        15 años de competencia real — por qué el liderazgo hardware tenía sentido
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 560 }}>

        {/* ── Axis ── */}
        <g opacity={axisOp}>
          <line x1={TL_LEFT} y1={TL_Y} x2={TL_RIGHT + 20} y2={TL_Y}
            stroke="#334155" strokeWidth={2} />
          {[1990, 1993, 1996, 1999, 2002, 2005, 2007].map((y) => (
            <g key={y}>
              <line x1={yearX(y)} y1={TL_Y - 5} x2={yearX(y)} y2={TL_Y + 5}
                stroke="#334155" strokeWidth={1.5} />
              <text x={yearX(y)} y={TL_Y + 20}
                textAnchor="middle" fill="#475569"
                fontSize={12} fontFamily={interFamily}>{y}</text>
            </g>
          ))}
        </g>

        {/* ── Progress bar ── */}
        <rect x={TL_LEFT} y={TL_Y + 30} width={barW} height={20}
          rx={4} fill={barColor}
          opacity={interpolate(frame, [BAR_IN, BAR_IN + 14], [0, 0.85], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          })}
        />

        {/* Year label on bar tip */}
        {barW > 20 && (
          <text x={TL_LEFT + barW + 6} y={TL_Y + 44}
            fill={barColor} fontSize={13} fontWeight="700" fontFamily={interFamily}>
            {displayYear}
          </text>
        )}

        {/* Freeze marker */}
        {frozen && (
          <g>
            <line x1={yearX(2007)} y1={TL_Y - 80} x2={yearX(2007)} y2={TL_Y + 60}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.5} />
            <text x={yearX(2007) + 6} y={TL_Y - 60}
              fill="#f59e0b" fontSize={12} fontWeight="700" fontFamily={interFamily}>
              iPhone announcement
            </text>
          </g>
        )}

        {/* ── Milestones ── */}
        {MILESTONES.map(({ year, label, sub, color }, i) => {
          const startF = HITS_IN + i * HIT_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 18], [-10, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const cx = yearX(year);
          const boxY = i % 2 === 0 ? TL_Y - 130 : TL_Y - 170;

          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              <circle cx={cx} cy={TL_Y} r={8} fill={color} />
              <line x1={cx} y1={TL_Y - 8} x2={cx} y2={boxY + 60}
                stroke={color} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.4} />
              <rect x={cx - 100} y={boxY} width={200} height={56}
                rx={8} fill={`${color}12`} stroke={`${color}44`} strokeWidth={1.5} />
              <text x={cx} y={boxY + 22}
                textAnchor="middle" fill={color}
                fontSize={13} fontWeight="700" fontFamily={interFamily}>{label}</text>
              <text x={cx} y={boxY + 42}
                textAnchor="middle" fill="#64748b"
                fontSize={11} fontFamily={interFamily}>{sub} · {year}</text>
            </g>
          );
        })}
      </svg>

      {/* Bottom text */}
      <div style={{
        position: "absolute", bottom: 40, left: 80, right: 80,
        textAlign: "center", opacity: textOp,
      }}>
        <div style={{
          fontFamily: interFamily, color: "#00d4ff", fontSize: 24, fontWeight: 700, marginBottom: 8,
        }}>
          15 años de competencia real en hardware.
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b", fontSize: 15, lineHeight: 1.5,
        }}>
          Era razonable que el liderazgo que construyó ese dominio tomara las decisiones de la siguiente etapa.
          <br />
          <span style={{ color: "#f59e0b" }}>El problema: la siguiente etapa era software.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
