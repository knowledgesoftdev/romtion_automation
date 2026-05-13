import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN   = 0;
const AXIS_IN    = 18;
const S60_IN     = 40;
const S60_STAG   = 60;
const INCOMPAT_IN = 280;
const IOS_IN     = 460;
const CONCL_IN   = 780;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// ── S60 versions ──────────────────────────────────────────────────────────────
const S60_VERSIONS = [
  { version: "S60 v1", year: 2001, color: "#8b5cf6" },
  { version: "S60 v2", year: 2003, color: "#8b5cf6" },
  { version: "S60 v3", year: 2006, color: "#ef4444", note: "Rompió compatibilidad binaria" },
  { version: "S60 v5", year: 2008, color: "#ef4444", note: "Nueva fragmentación" },
];

// Timeline geometry
const TL_Y     = 310;
const TL_LEFT  = 80;
const TL_RIGHT = 600;
const YR_MIN   = 2000;
const YR_MAX   = 2018;

function yearX(y: number) {
  return TL_LEFT + ((y - YR_MIN) / (YR_MAX - YR_MIN)) * (TL_RIGHT - TL_LEFT);
}

// Incompatibility arrow between two x positions
const IncompatArrow: React.FC<{ x1: number; x2: number; opacity: number }> = ({ x1, x2, opacity }) => {
  const midX = (x1 + x2) / 2;
  return (
    <g opacity={opacity}>
      <line x1={x1 + 8} y1={TL_Y - 40} x2={x2 - 8} y2={TL_Y - 40} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3" />
      <text x={midX} y={TL_Y - 50} textAnchor="middle" fill="#ef4444" fontSize={10} fontFamily={interFamily} fontWeight="700">
        INCOMPAT.
      </text>
      <text x={midX} y={TL_Y - 38} textAnchor="middle" fill="#ef4444" fontSize={9} fontFamily={interFamily}>
        binaria
      </text>
    </g>
  );
};

export const S60TimelineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp   = useFade(TITLE_IN);
  const axisOp    = useFade(AXIS_IN);
  const iosOp     = useFade(IOS_IN);
  const conclOp   = useFade(CONCL_IN);

  // iOS bar width (2008→2017 = 9 years)
  const iosBarW = interpolate(frame, [IOS_IN, IOS_IN + 120], [0, yearX(2017) - yearX(2008)], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Cada actualización de Nokia fragmentaba su propio ecosistema
      </div>

      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720 }}>

        {/* ── Axis ── */}
        <g opacity={axisOp}>
          <line x1={TL_LEFT} y1={TL_Y} x2={TL_RIGHT + 20} y2={TL_Y} stroke="#334155" strokeWidth={2} />
          <polygon points={`${TL_RIGHT + 20},${TL_Y - 5} ${TL_RIGHT + 30},${TL_Y} ${TL_RIGHT + 20},${TL_Y + 5}`} fill="#334155" />
          {[2001, 2003, 2006, 2008, 2010, 2012, 2014, 2016, 2017].map((y) => (
            <g key={y}>
              <line x1={yearX(y)} y1={TL_Y - 5} x2={yearX(y)} y2={TL_Y + 5} stroke="#334155" strokeWidth={1.5} />
              <text x={yearX(y)} y={TL_Y + 20} textAnchor="middle" fill="#475569" fontSize={11} fontFamily={interFamily}>
                {y}
              </text>
            </g>
          ))}
          <text x={TL_LEFT - 8} y={TL_Y + 4} textAnchor="end" fill="#334155" fontSize={11} fontFamily={interFamily}>
            {YR_MIN}
          </text>
        </g>

        {/* ── S60 versions ── */}
        {S60_VERSIONS.map(({ version, year, color, note }, i) => {
          const startF = S60_IN + i * S60_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 20], [-14, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const cx = yearX(year);

          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              <circle cx={cx} cy={TL_Y} r={10} fill={color} />
              <line x1={cx} y1={TL_Y - 10} x2={cx} y2={TL_Y - 90} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
              <rect x={cx - 60} y={TL_Y - 160} width={120} height={note ? 66 : 44} rx={6} fill={`${color}18`} stroke={`${color}55`} strokeWidth={1.5} />
              <text x={cx} y={TL_Y - 136} textAnchor="middle" fill={color} fontSize={14} fontWeight="700" fontFamily={interFamily}>
                {version}
              </text>
              <text x={cx} y={TL_Y - 118} textAnchor="middle" fill="#64748b" fontSize={12} fontFamily={interFamily}>
                {year}
              </text>
              {note && (
                <text x={cx} y={TL_Y - 102} textAnchor="middle" fill="#ef4444" fontSize={10} fontFamily={interFamily} fontWeight="600">
                  {note}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Incompatibility markers ── */}
        {[0, 1, 2].map((i) => {
          const op = interpolate(frame, [INCOMPAT_IN + i * 30, INCOMPAT_IN + i * 30 + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <IncompatArrow
              key={i}
              x1={yearX(S60_VERSIONS[i].year)}
              x2={yearX(S60_VERSIONS[i + 1].year)}
              opacity={op}
            />
          );
        })}

        {/* "4 versiones incompatibles en 2007" label */}
        <text
          x={yearX(2007)} y={TL_Y + 48}
          textAnchor="middle" fill="#ef4444"
          fontSize={12} fontWeight="700" fontFamily={interFamily}
          opacity={useFade(INCOMPAT_IN + 60)}
        >
          4 versiones incompatibles simultáneas
        </text>

        {/* ── iOS compatibility bar (9 years) ── */}
        <g opacity={iosOp}>
          <text x={TL_LEFT} y={TL_Y + 110} fill="#64748b" fontSize={11} fontWeight="700" fontFamily={interFamily} letterSpacing="0.12em">
            iOS — COMPATIBILIDAD BINARIA
          </text>
          <rect x={yearX(2008)} y={TL_Y + 120} width={iosBarW} height={28} rx={4} fill="#00d4ff" fillOpacity={0.85} />
          <text x={yearX(2008) + 6} y={TL_Y + 139} fill="#0a0a0f" fontSize={12} fontWeight="700" fontFamily={interFamily}>
            App Store 2008
          </text>
          {iosBarW > yearX(2017) - yearX(2012) && (
            <text x={yearX(2015)} y={TL_Y + 139} textAnchor="middle" fill="#0a0a0f" fontSize={12} fontWeight="700" fontFamily={interFamily}>
              9 años sin ruptura binaria →
            </text>
          )}
          {iosBarW > 0 && (
            <text x={yearX(2008) + iosBarW + 6} y={TL_Y + 139} fill="#00d4ff" fontSize={12} fontWeight="700" fontFamily={interFamily}>
              iOS 11 · 2017
            </text>
          )}
        </g>

      </svg>

      {/* Conclusion */}
      <div style={{
        position: "absolute", right: 60, top: 100, width: 580,
        opacity: conclOp,
      }}>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #ef444433",
          borderRadius: 10, padding: "20px 24px", marginBottom: 16,
        }}>
          <div style={{ fontFamily: interFamily, color: "#e2e8f0", fontSize: 16, lineHeight: 1.6 }}>
            Una app compilada para <span style={{ color: "#8b5cf6", fontWeight: 700 }}>S60 v2</span> no corría en{" "}
            <span style={{ color: "#ef4444", fontWeight: 700 }}>S60 v3</span> sin recompilación y frecuentemente sin reescritura parcial.
          </div>
        </div>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #00d4ff22",
          borderRadius: 10, padding: "20px 24px",
        }}>
          <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 15, lineHeight: 1.6 }}>
            El costo de mantenimiento para un desarrollador third-party con presencia en Symbian era equivalente a mantener{" "}
            <span style={{ color: "#ef4444", fontWeight: 700 }}>cuatro productos distintos</span>.
          </div>
        </div>
      </div>

    </AbsoluteFill>
  );
};
