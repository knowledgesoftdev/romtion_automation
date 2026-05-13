import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const COLS_IN   = 18;
const TIMERS_IN = 60;
const BARS_IN   = 400;
const BARS_END  = 560;
const CONCL_IN  = 700;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Countdown widget — counts down from maxWeeks to current display
const WeekTimer: React.FC<{
  weeks: number;
  cost: string;
  color: string;
  label: string;
  startFrame: number;
}> = ({ weeks, cost, color, label, startFrame }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, startFrame + weeks * 12], [weeks, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const displayWeeks = Math.ceil(progress);
  const op = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const arcAngle = (1 - progress / weeks) * Math.PI * 2;
  const r = 52;
  const cx = 72, cy = 72;
  const x1 = cx + r * Math.sin(0);
  const y1 = cy - r * Math.cos(0);
  const x2 = cx + r * Math.sin(arcAngle);
  const y2 = cy - r * Math.cos(arcAngle);
  const large = arcAngle > Math.PI ? 1 : 0;

  return (
    <div style={{ opacity: op, textAlign: "center" }}>
      <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
        {label}
      </div>
      <svg width={144} height={144} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
        {arcAngle > 0.01 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={26} fontWeight="800" fontFamily={interFamily}>
          {displayWeeks}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#64748b" fontSize={13} fontFamily={interFamily}>
          semanas
        </text>
      </svg>
      <div style={{ fontFamily: interFamily, color, fontSize: 20, fontWeight: 700, marginTop: 8 }}>
        {cost}
      </div>
    </div>
  );
};

// App count bar
const AppBar: React.FC<{ count: number; maxCount: number; color: string; label: string; startFrame: number }> = ({
  count, maxCount, color, label, startFrame,
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [startFrame, BARS_END], [0, (count / maxCount) * 460], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const op = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{ marginBottom: 16, opacity: op }}>
      <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 14, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: w, height: 20, backgroundColor: color, borderRadius: 4 }} />
        <div style={{ fontFamily: interFamily, color, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
          {count.toLocaleString()} apps
        </div>
      </div>
    </div>
  );
};

export const CompareScene: React.FC = () => {
  const titleOp = useFade(TITLE_IN);
  const colsOp  = useFade(COLS_IN);
  const barOp   = useFade(BARS_IN - 10);
  const conclOp = useFade(CONCL_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp,
      }}>
        El costo de entrada — por qué los desarrolladores eligieron iOS
      </div>

      {/* Center divider */}
      <div style={{
        position: "absolute", left: 640, top: 90, bottom: 60,
        width: 1, backgroundColor: "#1e293b", opacity: colsOp,
      }} />

      {/* ── LEFT: Symbian Signed ── */}
      <div style={{ position: "absolute", left: 60, top: 100, width: 530 }}>
        <div style={{
          fontFamily: interFamily, color: "#ef4444", fontSize: 15,
          fontWeight: 700, letterSpacing: "0.12em", marginBottom: 24,
          opacity: colsOp,
        }}>
          SYMBIAN SIGNED — 2008
        </div>
        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 28 }}>
          <WeekTimer
            weeks={12} cost="$3,000" color="#ef4444"
            label="MÁXIMO (AllFiles)" startFrame={TIMERS_IN}
          />
          <WeekTimer
            weeks={4} cost="$200" color="#f59e0b"
            label="MÍNIMO (básico)" startFrame={TIMERS_IN + 20}
          />
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b", fontSize: 14,
          lineHeight: 1.5, opacity: useFade(TIMERS_IN + 60), textAlign: "center",
        }}>
          App con red + disco + contactos → nivel AllFiles<br />
          <span style={{ color: "#ef4444" }}>Auditoría manual de código requerida.</span>
        </div>
      </div>

      {/* ── RIGHT: App Store ── */}
      <div style={{ position: "absolute", left: 680, top: 100, width: 530 }}>
        <div style={{
          fontFamily: interFamily, color: "#00d4ff", fontSize: 15,
          fontWeight: 700, letterSpacing: "0.12em", marginBottom: 24,
          opacity: colsOp,
        }}>
          APP STORE — 2008
        </div>
        <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 28 }}>
          <WeekTimer
            weeks={2} cost="$0" color="#00d4ff"
            label="REVISIÓN APPLE" startFrame={TIMERS_IN + 40}
          />
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "center",
            textAlign: "center", opacity: useFade(TIMERS_IN + 50),
          }}>
            <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
              COSTO CERTIFICADO
            </div>
            <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
              $0
            </div>
            <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, marginTop: 8 }}>
              para el desarrollador
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b", fontSize: 14,
          lineHeight: 1.5, opacity: useFade(TIMERS_IN + 80), textAlign: "center",
        }}>
          Sin auditoría de código.<br />
          <span style={{ color: "#00d4ff" }}>Revisión de guidelines de UX.</span>
        </div>
      </div>

      {/* ── App count bars (2009 comparison) ── */}
      <div style={{ position: "absolute", left: 80, bottom: 60, right: 80, opacity: barOp }}>
        <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}>
          RESULTADO — 2009
        </div>
        <AppBar count={50000} maxCount={50000} color="#00d4ff" label="App Store — Apple" startFrame={BARS_IN} />
        <AppBar count={2000}  maxCount={50000} color="#ef4444" label="Ovi Store — Nokia" startFrame={BARS_IN + 30} />
      </div>

      {/* Conclusion */}
      <div style={{
        position: "absolute", bottom: 18, left: 80, right: 80,
        fontFamily: interFamily, color: "#94a3b8", fontSize: 13,
        opacity: conclOp, lineHeight: 1.4,
      }}>
        Nokia perdió el ecosistema de terceros{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>3 años antes</span> de perder el mercado de hardware.
      </div>

    </AbsoluteFill>
  );
};
