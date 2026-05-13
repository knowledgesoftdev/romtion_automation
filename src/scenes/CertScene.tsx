import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const NODE_STAG = 40;
const CERT_IN   = 200;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Flow nodes
type FlowNode = { label: string; sublabel: string; color: string };

const NODES: FlowNode[] = [
  { label: "Desarrollador", sublabel: "Escribe app", color: "#64748b" },
  { label: "Empaqueta binario", sublabel: "Con capabilities", color: "#8b5cf6" },
  { label: "Symbian Signed", sublabel: "Autoridad cert.", color: "#f59e0b" },
  { label: "Auditoría manual", sublabel: "Revisión de código", color: "#f59e0b" },
  { label: "Certificado", sublabel: "Firmado criptog.", color: "#00d4ff" },
  { label: "Distribución", sublabel: "Ovi Store", color: "#22c55e" },
];

const NODE_W   = 140;
const NODE_H   = 68;
const NODE_GAP = 56;
const ROW_Y    = 280;
const START_X  = 60;

function nodeX(i: number) {
  return START_X + i * (NODE_W + NODE_GAP);
}

// Lock icon SVG
const LockIcon: React.FC<{ x: number; y: number; open?: boolean }> = ({ x, y, open = false }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-9} y={0} width={18} height={14} rx={2} fill={open ? "#22c55e" : "#ef4444"} />
    <path
      d={open
        ? "M -5,-8 Q -5,-14 0,-14 Q 5,-14 5,-8"
        : "M -5,-8 Q -5,-14 0,-14 Q 5,-14 5,-8 L 5,-6 L -5,-6 Z"}
      stroke={open ? "#22c55e" : "#ef4444"} strokeWidth={2.5} fill="none"
      strokeLinecap="round"
    />
  </g>
);

export const CertScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const certOp  = useFade(CERT_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Modelo de capabilities — firma criptográfica por binario
      </div>

      {/* ── Flow diagram ── */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720 }}>

        {/* Arrows between nodes */}
        {NODES.slice(0, -1).map((_, i) => {
          const startF = NODE_STAG * (i + 1);
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const x1 = nodeX(i) + NODE_W;
          const x2 = nodeX(i + 1);
          const midY = ROW_Y + NODE_H / 2;
          return (
            <g key={i} opacity={op}>
              <line x1={x1} y1={midY} x2={x2} y2={midY} stroke="#1e293b" strokeWidth={2} />
              <polygon
                points={`${x2},${midY - 5} ${x2 + 10},${midY} ${x2},${midY + 5}`}
                fill="#1e293b"
              />
              {/* Lock on gates 1 and 2 (Symbian Signed and Auditoría) */}
              {(i === 1 || i === 2 || i === 3) && (
                <LockIcon
                  x={(x1 + x2) / 2}
                  y={midY - 7}
                  open={i === 3}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map(({ label, sublabel, color }, i) => {
          const startF = NODE_STAG * i;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 20], [-10, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const x = nodeX(i);

          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              <rect
                x={x} y={ROW_Y} width={NODE_W} height={NODE_H}
                rx={8} fill={`${color}12`} stroke={`${color}55`} strokeWidth={1.5}
              />
              <text
                x={x + NODE_W / 2} y={ROW_Y + 26}
                textAnchor="middle" fill={color}
                fontSize={14} fontWeight="700" fontFamily={interFamily}
              >
                {label}
              </text>
              <text
                x={x + NODE_W / 2} y={ROW_Y + 46}
                textAnchor="middle" fill="#64748b"
                fontSize={12} fontFamily={interFamily}
              >
                {sublabel}
              </text>
            </g>
          );
        })}

        {/* Capability icons (labels above flow) */}
        {["Network", "Bluetooth", "AllFiles", "UserEnv"].map((cap, i) => {
          const startF = NODE_STAG + i * 15;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <g key={cap} opacity={op}>
              <rect
                x={nodeX(1) + 10 + i * 36} y={ROW_Y - 60} width={32} height={32}
                rx={6} fill="#8b5cf622" stroke="#8b5cf655" strokeWidth={1}
              />
              <text
                x={nodeX(1) + 26 + i * 36} y={ROW_Y - 38}
                textAnchor="middle" fill="#8b5cf6"
                fontSize={10} fontFamily={interFamily}
              >
                {cap}
              </text>
            </g>
          );
        })}
        <text
          x={nodeX(1) + 10} y={ROW_Y - 72}
          fill="#64748b" fontSize={11} fontFamily={interFamily} fontWeight="700"
          opacity={useFade(NODE_STAG + 10)}
        >
          CAPABILITIES REQUERIDAS
        </text>

      </svg>

      {/* ── Certification stats ── */}
      <div style={{
        position: "absolute", bottom: 60, left: 60,
        display: "flex", gap: 32, opacity: certOp,
      }}>
        {[
          { label: "Tiempo de certificación", value: "4–12 semanas", color: "#ef4444" },
          { label: "Costo por certificado", value: "$200–$3,000", color: "#f59e0b" },
          { label: "Nivel AllFiles", value: "Auditoría manual", color: "#8b5cf6" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: "#0d1117",
            border: `2px solid ${color}33`,
            borderRadius: 10, padding: "14px 20px",
          }}>
            <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontFamily: interFamily, color, fontSize: 22, fontWeight: 800 }}>
              {value}
            </div>
          </div>
        ))}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          fontFamily: interFamily, color: "#64748b", fontSize: 14, lineHeight: 1.5,
          maxWidth: 320,
        }}>
          vs App Store: <span style={{ color: "#00d4ff", fontWeight: 700 }}>1–2 semanas, $0</span>
          <br />para el desarrollador.
        </div>
      </div>

    </AbsoluteFill>
  );
};
