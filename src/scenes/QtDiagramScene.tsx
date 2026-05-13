import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono, fontFamily as monoFamily } from "@remotion/google-fonts/JetBrainsMono";

loadInter();
loadMono();

const TITLE_IN    = 0;
const CENTER_IN   = 18;
const SIGNALS_IN  = 60;
const PLATS_IN    = 130;
const PLAT_STAG   = 35;
const PRICE_IN    = 290;
const CODE_IN     = 360;
const FADE        = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const PLATFORMS = [
  { label: "Symbian",  color: "#8b5cf6", x: 240, y: 430 },
  { label: "Linux",    color: "#22c55e", x: 560, y: 430 },
  { label: "Windows",  color: "#0ea5e9", x: 880, y: 430 },
];

const QT_CX = 560;
const QT_CY = 240;
const QT_W  = 220;
const QT_H  = 80;

// Signal/slot arrow (bidirectional)
const SignalArrow: React.FC<{ angle: number; opacity: number; frame: number }> = ({ angle, opacity, frame }) => {
  const phase = (frame * 2 + angle * 30) % 60;
  const pulse = phase < 30 ? phase / 30 : (60 - phase) / 30;
  const len = 60 + pulse * 10;

  const rad = (angle * Math.PI) / 180;
  const x2 = Math.cos(rad) * len;
  const y2 = Math.sin(rad) * len;

  return (
    <g opacity={opacity * (0.5 + pulse * 0.5)} transform={`translate(${QT_CX}, ${QT_CY})`}>
      <line x1={0} y1={0} x2={x2} y2={y2}
        stroke="#00d4ff" strokeWidth={1.5}
        strokeDasharray="4 3" />
      <circle cx={x2} cy={y2} r={3} fill="#00d4ff" />
    </g>
  );
};

const CODE_SNIPPET = [
  "// Qt Signal/Slot",
  "connect(sender, &Sender::signal,",
  "        receiver, &Receiver::slot);",
  "",
  "emit mySignal(data);",
];

export const QtDiagramScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const centerOp = useFade(CENTER_IN);
  const sigOp    = useFade(SIGNALS_IN);
  const priceOp  = useFade(PRICE_IN);
  const codeOp   = useFade(CODE_IN);

  // Price counter
  const price = Math.round(
    interpolate(frame, [PRICE_IN, PRICE_IN + 60], [0, 104], {
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
        Qt — framework multiplataforma adquirido por Nokia en 2008
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 560 }}>

        {/* ── Signal arrows ── */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <SignalArrow key={i} angle={angle} opacity={sigOp} frame={frame} />
        ))}

        {/* ── Qt center box ── */}
        <g opacity={centerOp}>
          <rect
            x={QT_CX - QT_W / 2} y={QT_CY - QT_H / 2}
            width={QT_W} height={QT_H}
            rx={12} fill="#00d4ff18" stroke="#00d4ff" strokeWidth={2.5}
          />
          {/* Glow ring */}
          <circle cx={QT_CX} cy={QT_CY} r={70}
            fill="none" stroke="#00d4ff"
            strokeWidth={1} opacity={0.12 + 0.06 * Math.sin(frame * 0.07)}
          />
          <text x={QT_CX} y={QT_CY - 6} textAnchor="middle"
            fill="#00d4ff" fontSize={22} fontWeight="900" fontFamily={interFamily}>
            Qt Framework
          </text>
          <text x={QT_CX} y={QT_CY + 18} textAnchor="middle"
            fill="#00d4ff88" fontSize={13} fontFamily={interFamily}>
            signals · slots · events
          </text>
        </g>

        {/* ── Platform boxes ── */}
        {PLATFORMS.map(({ label, color, x, y }, i) => {
          const startF = PLATS_IN + i * PLAT_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 20], [15, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              {/* Connector line */}
              <line
                x1={QT_CX} y1={QT_CY + QT_H / 2}
                x2={x} y2={y}
                stroke={color} strokeWidth={1.5}
                strokeDasharray="5 3" strokeOpacity={0.4}
              />
              {/* Platform box */}
              <rect x={x - 80} y={y - 28} width={160} height={56}
                rx={8} fill={`${color}12`} stroke={`${color}55`} strokeWidth={1.5} />
              <text x={x} y={y + 7} textAnchor="middle"
                fill={color} fontSize={16} fontWeight="700" fontFamily={interFamily}>
                {label}
              </text>
            </g>
          );
        })}

      </svg>

      {/* ── Price badge ── */}
      <div style={{
        position: "absolute", right: 60, top: 130, opacity: priceOp,
        backgroundColor: "#1a1200",
        border: "2px solid #f59e0b55",
        borderRadius: 12, padding: "16px 22px", textAlign: "center",
      }}>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6 }}>
          ADQUISICIÓN DE TROLLTECH
        </div>
        <div style={{ fontFamily: interFamily, color: "#f59e0b", fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
          ${price}M
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, marginTop: 4 }}>
          Nokia · 2008
        </div>
      </div>

      {/* ── Code snippet ── */}
      <div style={{
        position: "absolute", left: 60, bottom: 60,
        backgroundColor: "#0d1117",
        border: "1.5px solid #1e293b",
        borderRadius: 10, padding: "14px 18px",
        opacity: codeOp,
      }}>
        {CODE_SNIPPET.map((line, i) => (
          <div key={i} style={{
            fontFamily: monoFamily,
            color: line.startsWith("//") ? "#475569" : line.includes("emit") ? "#00d4ff" : "#e2e8f0",
            fontSize: 13, lineHeight: 1.7,
          }}>
            {line || " "}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
