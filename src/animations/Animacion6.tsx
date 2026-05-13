import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── chart geometry ───────────────────────────────────────────────────────────
const CL = 90;    // chart left
const CR = 1110;  // chart right
const CT = 128;   // chart top
const CB = 578;   // chart bottom
const CW = CR - CL;   // 1020
const CH = CB - CT;   // 450

const YR_START = 2007;
const YR_END   = 2013;
const MAX_PCT  = 75;

const yearX  = (y: number) => CL + ((y - YR_START) / (YR_END - YR_START)) * CW;
const pctY   = (p: number) => CB - (p / MAX_PCT) * CH;

const YEARS = [2007, 2008, 2009, 2010, 2011, 2012, 2013];

// ─── dataset ─────────────────────────────────────────────────────────────────
const NOKIA_PTS   = [40, 38, 35, 30, 24, 13, 3];
const ANDROID_PTS = [0,  3,  6,  17, 38, 57, 70];
const IOS_PTS     = [0,  2,  4,  6,  9,  12, 15];

function areaPath(pts: number[]): string {
  const top = pts.map((p, i) => `${yearX(YR_START + i)},${pctY(p)}`).join(" ");
  return `${yearX(YR_START)},${pctY(pts[0])} ${top} ${yearX(YR_END)},${pctY(pts[pts.length - 1])} ${CR},${CB} ${CL},${CB}`;
}

const NOKIA_POLY   = areaPath(NOKIA_PTS);
const ANDROID_POLY = areaPath(ANDROID_PTS);
const IOS_POLY     = areaPath(IOS_PTS);

// Burning platform x (2011)
const BURN_X = yearX(2011);

// ─── timing ──────────────────────────────────────────────────────────────────
const TITLE_IN   = 0;
const AXES_IN    = 14;
const FILL_START = 24;
const FILL_END   = 218;
const BURN_IN    = 162;   // clip reaches x=2011 around frame 162
const LEGEND_IN  = 222;
const XLABELS_IN = 228;
const FADE       = 13;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── y-axis grid values ───────────────────────────────────────────────────────
const Y_TICKS = [0, 25, 50, 75];

// ─── main ─────────────────────────────────────────────────────────────────────
export const Animacion6: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp   = useFade(TITLE_IN);
  const axesOp    = useFade(AXES_IN);
  const burnOp    = useFade(BURN_IN);
  const legendOp  = useFade(LEGEND_IN);
  const xlabelsOp = useFade(XLABELS_IN);

  const clipW = interpolate(frame, [FILL_START, FILL_END], [0, CW], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 46, left: 0, right: 0, textAlign: "center", fontFamily: interFamily, color: "#e2e8f0", fontSize: 26, fontWeight: "bold", opacity: titleOp, letterSpacing: "0.02em" }}>
        Nokia 2007→2013: de líder a residual.
      </div>

      {/* SVG chart */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720 }}>
        <defs>
          <clipPath id="area-clip-6">
            <rect x={CL} y={CT - 10} width={clipW} height={CH + 20} />
          </clipPath>
        </defs>

        {/* ── Y-axis grid lines + labels ── */}
        {Y_TICKS.map((p) => (
          <g key={p} opacity={axesOp}>
            <line x1={CL} y1={pctY(p)} x2={CR} y2={pctY(p)} stroke="#1e293b" strokeWidth={1} />
            <text x={CL - 8} y={pctY(p) + 5} textAnchor="end" fill="#475569" fontSize={13} fontFamily={interFamily}>{p}%</text>
          </g>
        ))}

        {/* ── Axes ── */}
        <g opacity={axesOp}>
          {/* Y axis */}
          <line x1={CL} y1={CT} x2={CL} y2={CB} stroke="#334155" strokeWidth={2} />
          {/* X axis */}
          <line x1={CL} y1={CB} x2={CR} y2={CB} stroke="#334155" strokeWidth={2} />
        </g>

        {/* ── Area fills (clipped) ── */}
        <polygon points={NOKIA_POLY}   fill="#8b5cf6" fillOpacity={0.55} clipPath="url(#area-clip-6)" />
        <polygon points={ANDROID_POLY} fill="#00d4ff" fillOpacity={0.45} clipPath="url(#area-clip-6)" />
        <polygon points={IOS_POLY}     fill="#f59e0b" fillOpacity={0.50} clipPath="url(#area-clip-6)" />

        {/* ── Area outlines ── */}
        <polyline
          points={NOKIA_PTS.map((p, i) => `${yearX(YR_START + i)},${pctY(p)}`).join(" ")}
          fill="none" stroke="#8b5cf6" strokeWidth={2.5} clipPath="url(#area-clip-6)"
        />
        <polyline
          points={ANDROID_PTS.map((p, i) => `${yearX(YR_START + i)},${pctY(p)}`).join(" ")}
          fill="none" stroke="#00d4ff" strokeWidth={2.5} clipPath="url(#area-clip-6)"
        />
        <polyline
          points={IOS_PTS.map((p, i) => `${yearX(YR_START + i)},${pctY(p)}`).join(" ")}
          fill="none" stroke="#f59e0b" strokeWidth={2.5} clipPath="url(#area-clip-6)"
        />

        {/* ── X-axis year labels ── */}
        {YEARS.map((y) => (
          <g key={y} opacity={xlabelsOp}>
            <line x1={yearX(y)} y1={CB} x2={yearX(y)} y2={CB + 6} stroke="#334155" strokeWidth={1.5} />
            <text x={yearX(y)} y={CB + 20} textAnchor="middle" fill="#475569" fontSize={13} fontFamily={interFamily}>{y}</text>
          </g>
        ))}

        {/* ── Burning platform vertical line ── */}
        <g opacity={burnOp}>
          <line x1={BURN_X} y1={CT} x2={BURN_X} y2={CB} stroke="white" strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.7} />
          <text x={BURN_X + 8} y={CT + 18} fill="white" fontSize={12} fontFamily={interFamily} fontWeight="600" opacity={0.85}>
            Memo burning platform
          </text>
        </g>

        {/* ── Legend (top right) ── */}
        <g opacity={legendOp}>
          {[
            { label: "Nokia",   color: "#8b5cf6", y: CT + 8  },
            { label: "Android", color: "#00d4ff", y: CT + 30 },
            { label: "iOS",     color: "#f59e0b", y: CT + 52 },
          ].map(({ label, color, y }) => (
            <g key={label}>
              <rect x={CR - 110} y={y} width={14} height={14} fill={color} rx={2} />
              <text x={CR - 90} y={y + 11} fill="#e2e8f0" fontSize={13} fontFamily={interFamily} fontWeight="600">{label}</text>
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
