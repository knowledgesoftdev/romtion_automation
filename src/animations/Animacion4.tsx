import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── timeline geometry ───────────────────────────────────────────────────────
const AXIS_Y   = 318;
const X_LEFT   = 100;
const X_RIGHT  = 1180;
const YR_START = 2007;
const YR_END   = 2012;
const yearX    = (y: number) => X_LEFT + ((y - YR_START) / (YR_END - YR_START)) * (X_RIGHT - X_LEFT);
const ALL_YEARS = [2007, 2008, 2009, 2010, 2011, 2012];

// ─── nokia bar ───────────────────────────────────────────────────────────────
const BAR_BOTTOM = 460;
const BAR_TOP    = 345;
const BAR_H      = BAR_BOTTOM - BAR_TOP;  // 115 px

const NOKIA_DATA = [
  { year: 2007, share: 40 },
  { year: 2008, share: 38 },
  { year: 2009, share: 35 },
  { year: 2010, share: 30 },
  { year: 2011, share: 23 },
  { year: 2012, share: 20 },
];

const MAX_SHARE = 50;
const shareY = (s: number) => BAR_BOTTOM - (s / MAX_SHARE) * BAR_H;
const nokiaAreaPts = NOKIA_DATA.map((d) => `${yearX(d.year)},${shareY(d.share)}`).join(" ");
const nokiaPolygon = `${nokiaAreaPts} ${X_RIGHT},${BAR_BOTTOM} ${X_LEFT},${BAR_BOTTOM}`;

// ─── events ───────────────────────────────────────────────────────────────────
type EventDef = {
  year: number;
  lines: string[];
  color: string;
  tag: string;
  boxY: number;
  startFrame: number;
};

const EVENTS: EventDef[] = [
  { year: 2007, lines: ["iPhone"],                              color: "#00d4ff", tag: "",            boxY: 192, startFrame: 38  },
  { year: 2008, lines: ["App Store 500 apps","Nokia compra Qt"],color: "#8b5cf6", tag: "",            boxY: 112, startFrame: 85  },
  { year: 2010, lines: ["Qt disponible","App Store 225k apps"], color: "#f59e0b", tag: "3 años tarde",boxY: 192, startFrame: 128 },
  { year: 2011, lines: ["Memo burning platform","Acuerdo Microsoft"], color: "#ef4444", tag: "",     boxY: 112, startFrame: 168 },
];

const BOX_W = 190;

// ─── timing ──────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const AXIS_IN   = 18;
const BAR_IN    = 200;
const BAR_OUT   = 272;
const FADE      = 13;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── EventNode ────────────────────────────────────────────────────────────────
const EventNode: React.FC<EventDef> = ({ year, lines, color, tag, boxY, startFrame }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [startFrame, startFrame + FADE], [-10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const cx = yearX(year);
  const boxH = lines.length > 1 ? 84 : 62;
  const boxLeft = Math.max(8, cx - BOX_W / 2);

  return (
    <>
      {/* Connecting line + circle (SVG overlay) */}
      <svg
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: 1280, height: 720,
          overflow: "visible",
          pointerEvents: "none",
          opacity,
        }}
      >
        <line
          x1={cx} y1={boxY + boxH}
          x2={cx} y2={AXIS_Y}
          stroke={color} strokeWidth={1.5}
          strokeOpacity={0.5} strokeDasharray="4 3"
        />
        <circle cx={cx} cy={AXIS_Y} r={9} fill={color} />
      </svg>

      {/* Text box */}
      <div
        style={{
          position: "absolute",
          left: boxLeft,
          top: boxY,
          width: BOX_W,
          height: boxH,
          border: `2px solid ${color}`,
          borderRadius: 8,
          backgroundColor: `${color}18`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          opacity,
          transform: `translateY(${ty}px)`,
          padding: "6px 10px",
          boxSizing: "border-box",
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: interFamily, color: "#e2e8f0", fontSize: i === 0 ? 14 : 12, fontWeight: i === 0 ? 700 : 400, textAlign: "center", lineHeight: 1.3 }}>
            {l}
          </div>
        ))}
        {tag && (
          <div style={{ marginTop: 2, backgroundColor: color, borderRadius: 4, padding: "2px 8px", fontFamily: interFamily, color: "#0a0a0f", fontSize: 11, fontWeight: 800 }}>
            {tag}
          </div>
        )}
      </div>
    </>
  );
};

// ─── main ─────────────────────────────────────────────────────────────────────
export const Animacion4: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = useFade(TITLE_IN);
  const axisOp  = useFade(AXIS_IN);

  const clipW = interpolate(frame, [BAR_IN, BAR_OUT], [0, X_RIGHT - X_LEFT], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const barLabelsOp = interpolate(frame, [BAR_OUT - 10, BAR_OUT + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 48, left: 0, right: 0, textAlign: "center", fontFamily: interFamily, color: "#e2e8f0", fontSize: 26, fontWeight: "bold", opacity: titleOp, letterSpacing: "0.02em" }}>
        La solución correcta. El momento incorrecto.
      </div>

      {/* SVG: axis + year marks + year labels + nokia bar */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, overflow: "visible" }}>
        <defs>
          <clipPath id="bar-clip-4">
            <rect x={X_LEFT} y={BAR_TOP - 10} width={clipW} height={BAR_H + 20} />
          </clipPath>
        </defs>

        {/* Axis line */}
        <line x1={X_LEFT} y1={AXIS_Y} x2={X_RIGHT + 12} y2={AXIS_Y} stroke="#475569" strokeWidth={2} opacity={axisOp} />
        <polygon points={`${X_RIGHT + 12},${AXIS_Y - 5} ${X_RIGHT + 22},${AXIS_Y} ${X_RIGHT + 12},${AXIS_Y + 5}`} fill="#475569" opacity={axisOp} />

        {/* Tick marks + year labels */}
        {ALL_YEARS.map((y) => (
          <g key={y} opacity={axisOp}>
            <line x1={yearX(y)} y1={AXIS_Y - 6} x2={yearX(y)} y2={AXIS_Y + 6} stroke="#475569" strokeWidth={1.5} />
            <text x={yearX(y)} y={AXIS_Y + 24} textAnchor="middle" fill="#64748b" fontSize={14} fontFamily={interFamily}>{y}</text>
          </g>
        ))}

        {/* Nokia bar section label */}
        <text x={X_LEFT + 4} y={BAR_TOP - 10} fill="#8b5cf6" fontSize={13} fontFamily={interFamily} fontWeight="700" opacity={barLabelsOp}>
          Nokia market share
        </text>

        {/* Nokia area (clipped) */}
        <polygon points={nokiaPolygon} fill="#8b5cf6" fillOpacity={0.75} clipPath="url(#bar-clip-4)" />
        <polyline
          points={NOKIA_DATA.map((d) => `${yearX(d.year)},${shareY(d.share)}`).join(" ")}
          fill="none" stroke="#8b5cf6" strokeWidth={2}
          clipPath="url(#bar-clip-4)"
        />

        {/* % labels */}
        <text x={yearX(2007) + 4} y={shareY(40) - 6} fill="#c4b5fd" fontSize={13} fontFamily={interFamily} fontWeight="700" opacity={barLabelsOp}>40%</text>
        <text x={yearX(2011) + 4} y={shareY(23) - 6} fill="#c4b5fd" fontSize={13} fontFamily={interFamily} fontWeight="700" opacity={barLabelsOp}>23%</text>
      </svg>

      {/* Event nodes */}
      {EVENTS.map((ev) => <EventNode key={ev.year} {...ev} />)}
    </AbsoluteFill>
  );
};
