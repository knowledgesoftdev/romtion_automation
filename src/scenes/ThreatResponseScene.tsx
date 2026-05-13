import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN   = 0;
const LEFT_IN    = 20;
const RIGHT_IN   = 60;
const ARROW_IN   = 130;
const BOTTOM_IN  = 190;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Bluetooth signal waves (animated, deterministic)
const BluetoothWaves: React.FC<{ cx: number; cy: number; frame: number }> = ({ cx, cy, frame }) => {
  const waves = [0, 1, 2];
  return (
    <g>
      {waves.map((i) => {
        const phase = (frame + i * 20) % 60;
        const r = 30 + phase * 1.6;
        const op = Math.max(0, 1 - phase / 60) * 0.7;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke="#ef4444" strokeWidth={1.5} opacity={op} />
        );
      })}
    </g>
  );
};

// Simple shield shape
const ShieldPath = (x: number, y: number, w: number, h: number) =>
  `M ${x + w / 2},${y} L ${x + w},${y + h * 0.3} L ${x + w},${y + h * 0.6} Q ${x + w / 2},${y + h} ${x},${y + h * 0.6} L ${x},${y + h * 0.3} Z`;

export const ThreatResponseScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const leftOp   = useFade(LEFT_IN);
  const rightOp  = useFade(RIGHT_IN);
  const arrowOp  = useFade(ARROW_IN);
  const bottomOp = useFade(BOTTOM_IN);

  const divX = 640;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 23, fontWeight: "bold",
        opacity: titleOp,
      }}>
        El modelo de capabilities — amenaza real, solución real
      </div>

      {/* Divider */}
      <div style={{
        position: "absolute", left: divX, top: 90, bottom: 60,
        width: 1, backgroundColor: "#1e293b",
        opacity: useFade(10),
      }} />

      {/* ── LEFT: Threat ── */}
      <div style={{ position: "absolute", left: 0, top: 90, width: divX, opacity: leftOp }}>
        <div style={{
          position: "absolute", top: 16, left: 0, right: 0,
          textAlign: "center", fontFamily: interFamily,
          color: "#ef4444", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em",
        }}>
          AMENAZA — 2003–2004
        </div>

        {/* Phone + Bluetooth waves */}
        <svg style={{ display: "block", margin: "60px auto 0", width: 220, height: 220 }}>
          {/* Bluetooth waves */}
          <BluetoothWaves cx={110} cy={110} frame={frame} />
          {/* Phone body */}
          <rect x={80} y={50} width={60} height={100} rx={8} fill="#1e293b" stroke="#ef4444" strokeWidth={2} />
          <rect x={90} y={60} width={40} height={60} rx={2} fill="#0a0a0f" />
          <circle cx={110} cy={136} r={5} fill="#334155" />
          {/* Bluetooth symbol */}
          <text x={110} y={95} textAnchor="middle" fill="#ef4444" fontSize={18} fontWeight="bold">
            ⚡
          </text>
        </svg>

        {/* Cabir label */}
        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#ef4444", fontSize: 18, fontWeight: 700, marginTop: 16,
        }}>
          Cabir
        </div>
        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#64748b", fontSize: 14, marginTop: 4,
        }}>
          Primer gusano móvil — 2004
        </div>
        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#475569", fontSize: 13, marginTop: 8, padding: "0 40px", lineHeight: 1.5,
        }}>
          Propagación vía Bluetooth.<br />
          Target: Symbian OS.
        </div>
      </div>

      {/* ── RIGHT: Solution ── */}
      <div style={{ position: "absolute", left: divX, top: 90, width: divX, opacity: rightOp }}>
        <div style={{
          position: "absolute", top: 16, left: 0, right: 0,
          textAlign: "center", fontFamily: interFamily,
          color: "#00d4ff", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em",
        }}>
          RESPUESTA CORRECTA
        </div>

        {/* Shield */}
        <svg style={{ display: "block", margin: "60px auto 0", width: 220, height: 220 }}>
          <path d={ShieldPath(55, 40, 110, 140)} fill="#00d4ff14" stroke="#00d4ff" strokeWidth={2.5} />
          {/* Lock body */}
          <rect x={90} y={110} width={40} height={34} rx={4} fill="#00d4ff" />
          <path d="M 97,110 L 97,98 Q 97,82 110,82 Q 123,82 123,98 L 123,110"
            fill="none" stroke="#00d4ff" strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={110} cy={127} r={4} fill="#0a0a0f" />
          {/* Glow */}
          <circle cx={110} cy={132} r={55} fill="none"
            stroke="#00d4ff" strokeWidth={1}
            opacity={0.15 + 0.1 * Math.sin(frame * 0.08)} />
        </svg>

        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#00d4ff", fontSize: 18, fontWeight: 700, marginTop: 16,
        }}>
          Capabilities firmadas
        </div>
        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#64748b", fontSize: 14, marginTop: 4,
        }}>
          Firma criptográfica en binario
        </div>
        <div style={{
          textAlign: "center", fontFamily: interFamily,
          color: "#475569", fontSize: 13, marginTop: 8, padding: "0 40px", lineHeight: 1.5,
        }}>
          Network · Bluetooth · AllFiles<br />
          Certificado por Symbian Signed.
        </div>
      </div>

      {/* ── Connecting arrow ── */}
      <svg style={{
        position: "absolute", top: 0, left: 0, width: 1280, height: 720,
        pointerEvents: "none", opacity: arrowOp,
      }}>
        <defs>
          <marker id="arr-threat" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M 0,0 L 8,4 L 0,8 Z" fill="#334155" />
          </marker>
        </defs>
        <line x1={460} y1={310} x2={580} y2={310}
          stroke="#334155" strokeWidth={2}
          markerEnd="url(#arr-threat)" />
        <text x={520} y={298} textAnchor="middle"
          fill="#475569" fontSize={11} fontFamily={interFamily} fontWeight="600">
          respuesta
        </text>
      </svg>

      {/* ── Bottom text ── */}
      <div style={{
        position: "absolute", bottom: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        opacity: bottomOp,
      }}>
        <span style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700 }}>
          La amenaza era real.
        </span>
        {" "}
        <span style={{ color: "#00d4ff", fontSize: 22, fontWeight: 700 }}>
          La solución también.
        </span>
        <div style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
          Criptográficamente sólido. El problema llegó después: el costo del proceso para los desarrolladores.
        </div>
      </div>
    </AbsoluteFill>
  );
};
