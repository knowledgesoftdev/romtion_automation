import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const BARS_IN   = 28;
const LABEL_IN  = 120;
const CLOCK_IN  = 180;
const CONC_IN   = 340;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const BARS = [
  { label: "2000 — Nokia 3310", mb: 4,   color: "#8b5cf6", maxW: 40  },
  { label: "2002 — Nokia 7650", mb: 16,  color: "#8b5cf6", maxW: 160 },
  { label: "2007 — iPhone",     mb: 128, color: "#00d4ff", maxW: 640 },
  { label: "2007 — N95",        mb: 64,  color: "#f59e0b", maxW: 320 },
];

const BAR_MAX_PX = 580;

// Animated clock ticks to show determinism
const ClockWidget: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const angle = ((frame % 30) / 30) * 360;

  return (
    <div style={{
      opacity,
      backgroundColor: "#0d1117",
      border: "2px solid #00d4ff33",
      borderRadius: 12,
      padding: "20px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
        DETERMINISMO EN TIEMPO REAL
      </div>
      <svg width={100} height={100} style={{ display: "block", margin: "0 auto 12px" }}>
        <circle cx={50} cy={50} r={44} fill="none" stroke="#1e293b" strokeWidth={2} />
        {/* Tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const r1 = 36, r2 = 42;
          return (
            <line key={i}
              x1={50 + Math.cos(a) * r1} y1={50 + Math.sin(a) * r1}
              x2={50 + Math.cos(a) * r2} y2={50 + Math.sin(a) * r2}
              stroke="#334155" strokeWidth={1.5}
            />
          );
        })}
        {/* Second hand */}
        <line
          x1={50} y1={50}
          x2={50 + Math.cos((angle - 90) * Math.PI / 180) * 34}
          y2={50 + Math.sin((angle - 90) * Math.PI / 180) * 34}
          stroke="#ef4444" strokeWidth={2} strokeLinecap="round"
        />
        {/* Center */}
        <circle cx={50} cy={50} r={3} fill="#00d4ff" />
      </svg>
      <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
        Latencia garantizada<br />
        <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>GC haría esto imposible</span>
      </div>
    </div>
  );
};

export const RamScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const labelOp = useFade(LABEL_IN);
  const clockOp = useFade(CLOCK_IN);
  const concOp  = useFade(CONC_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp, letterSpacing: "0.02em",
      }}>
        Restricción real de hardware — la decisión era correcta en 2000
      </div>

      {/* ── RAM bars ── */}
      <div style={{ position: "absolute", left: 80, top: 130, width: 720 }}>
        <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20 }}>
          RAM DISPONIBLE POR DISPOSITIVO
        </div>
        {BARS.map(({ label, mb, color, maxW }, i) => {
          const startF = BARS_IN + i * 22;
          const barW = interpolate(frame, [startF, startF + 45], [0, (maxW / 640) * BAR_MAX_PX], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const op = interpolate(frame, [startF, startF + 14], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ marginBottom: 22, opacity: op }}>
              <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 14, marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: barW, height: 28, backgroundColor: color, borderRadius: 4, transition: "none" }} />
                <div style={{ fontFamily: interFamily, color, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {mb} MB
                </div>
              </div>
            </div>
          );
        })}

        {/* Context annotation */}
        <div style={{
          marginTop: 24, fontFamily: interFamily, color: "#64748b",
          fontSize: 14, lineHeight: 1.5, opacity: labelOp,
        }}>
          Con 4–16 MB de RAM, un garbage collector consumía ciclos<br />
          y memoria que <span style={{ color: "#ef4444" }}>no existían</span>.<br />
          El modelo manual era la única opción viable.
        </div>
      </div>

      {/* ── Clock widget ── */}
      <div style={{ position: "absolute", right: 80, top: 200, width: 240 }}>
        <ClockWidget opacity={clockOp} />
      </div>

      {/* Conclusion */}
      <div style={{
        position: "absolute", bottom: 56, left: 80, right: 80,
        fontFamily: interFamily, fontSize: 18, lineHeight: 1.5,
        opacity: concOp,
      }}>
        <span style={{ color: "#00d4ff", fontWeight: 700 }}>Correcto en 2000. </span>
        <span style={{ color: "#94a3b8" }}>
          El mismo modelo en 2007, con hardware moderno y un ecosistema de desarrolladores en expansión,
          se convirtió en fricción estructural.
        </span>
      </div>

    </AbsoluteFill>
  );
};
