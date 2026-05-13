import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN   = 0;
const CENTER_IN  = 20;
const RUST_IN    = 80;
const QT_IN      = 200;
const TEXT1_IN   = 320;
const TEXT2_IN   = 650;
const FADE       = 16;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Central node position
const CX = 640;
const CY = 280;
const SYMBIAN_R = 60;

// Target nodes
const RUST_X = 240;
const RUST_Y = 230;
const QT_X   = 1040;
const QT_Y   = 230;

const TEXT_BLOCKS = [
  {
    startFrame: TEXT1_IN,
    title: "Symbian → Rust",
    color: "#00d4ff",
    text: "El modelo de cleanup stacks de Symbian influyó directamente en el diseño de Rust. " +
      "La gestión determinista de memoria sin garbage collector — que Symbian necesitaba por restricciones de hardware — " +
      "es exactamente el problema que Rust resuelve con ownership y lifetimes.",
    highlight: "pero con verificación en tiempo de compilación.",
  },
  {
    startFrame: TEXT2_IN,
    title: "Qt — dominio correcto",
    color: "#f59e0b",
    text: "Qt sobrevivió como framework open source y hoy corre en sistemas embebidos, automotive y dispositivos industriales. " +
      "La arquitectura que Nokia no pudo escalar en móviles encontró su dominio correcto " +
      "en sistemas donde el ciclo de vida del software se mide en décadas.",
    highlight: "",
  },
];

export const LegacyScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const centerOp = useFade(CENTER_IN);
  const rustOp   = useFade(RUST_IN);
  const qtOp     = useFade(QT_IN);

  // Animated connection lines (growing from center)
  const rustLineW = interpolate(frame, [RUST_IN, RUST_IN + 50], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const qtLineW = interpolate(frame, [QT_IN, QT_IN + 50], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Center pulse
  const pulse = 1 + 0.018 * Math.sin(frame * 0.07);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp,
      }}>
        El legado técnico de Symbian — lo que sobrevivió
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 430 }}>

        {/* ── Connection lines ── */}
        {/* Symbian → Rust */}
        <line
          x1={CX - SYMBIAN_R} y1={CY}
          x2={CX - SYMBIAN_R - (CX - SYMBIAN_R - RUST_X - 70) * rustLineW}
          y2={CY - (CY - RUST_Y) * rustLineW}
          stroke="#00d4ff" strokeWidth={2}
          strokeDasharray="6 3" opacity={0.5}
        />
        {/* Symbian → Qt */}
        <line
          x1={CX + SYMBIAN_R} y1={CY}
          x2={CX + SYMBIAN_R + (QT_X - CX - SYMBIAN_R - 70) * qtLineW}
          y2={CY - (CY - QT_Y) * qtLineW}
          stroke="#f59e0b" strokeWidth={2}
          strokeDasharray="6 3" opacity={0.5}
        />

        {/* Arrow labels on lines */}
        {rustOp > 0.5 && (
          <g opacity={rustOp}>
            <text x={(CX + RUST_X + 70) / 2} y={(CY + RUST_Y) / 2 - 14}
              textAnchor="middle" fill="#00d4ff"
              fontSize={11} fontFamily={interFamily} fontWeight="600">
              ownership sin GC
            </text>
            <text x={(CX + RUST_X + 70) / 2} y={(CY + RUST_Y) / 2}
              textAnchor="middle" fill="#00d4ff"
              fontSize={11} fontFamily={interFamily}>
              → verificado por compilador
            </text>
          </g>
        )}
        {qtOp > 0.5 && (
          <g opacity={qtOp}>
            <text x={(CX + QT_X - 70) / 2} y={(CY + QT_Y) / 2 - 14}
              textAnchor="middle" fill="#f59e0b"
              fontSize={11} fontFamily={interFamily} fontWeight="600">
              sistemas embebidos
            </text>
            <text x={(CX + QT_X - 70) / 2} y={(CY + QT_Y) / 2}
              textAnchor="middle" fill="#f59e0b"
              fontSize={11} fontFamily={interFamily}>
              automotive · industrial
            </text>
          </g>
        )}

        {/* ── Center: Symbian ── */}
        <g opacity={centerOp} transform={`translate(${CX},${CY}) scale(${pulse})`}>
          <circle cx={0} cy={0} r={SYMBIAN_R} fill="#8b5cf618" stroke="#8b5cf6" strokeWidth={2} />
          <circle cx={0} cy={0} r={SYMBIAN_R + 14} fill="none" stroke="#8b5cf644" strokeWidth={1} />
          <text x={0} y={-4} textAnchor="middle"
            fill="#8b5cf6" fontSize={16} fontWeight="800" fontFamily={interFamily}>
            Symbian
          </text>
          <text x={0} y={16} textAnchor="middle"
            fill="#8b5cf688" fontSize={11} fontFamily={interFamily}>
            2001–2013
          </text>
        </g>

        {/* ── Rust node ── */}
        <g opacity={rustOp}>
          <rect x={RUST_X - 90} y={RUST_Y - 36} width={180} height={72}
            rx={10} fill="#00d4ff10" stroke="#00d4ff" strokeWidth={2} />
          <text x={RUST_X} y={RUST_Y - 8} textAnchor="middle"
            fill="#00d4ff" fontSize={22} fontWeight="900" fontFamily={interFamily}>
            Rust
          </text>
          <text x={RUST_X} y={RUST_Y + 16} textAnchor="middle"
            fill="#00d4ff77" fontSize={12} fontFamily={interFamily}>
            2015 — Mozilla
          </text>
        </g>

        {/* ── Qt node ── */}
        <g opacity={qtOp}>
          <rect x={QT_X - 90} y={QT_Y - 36} width={180} height={72}
            rx={10} fill="#f59e0b10" stroke="#f59e0b" strokeWidth={2} />
          <text x={QT_X} y={QT_Y - 8} textAnchor="middle"
            fill="#f59e0b" fontSize={22} fontWeight="900" fontFamily={interFamily}>
            Qt
          </text>
          <text x={QT_X} y={QT_Y + 16} textAnchor="middle"
            fill="#f59e0b77" fontSize={12} fontFamily={interFamily}>
            Open source — Qt Group
          </text>
        </g>

      </svg>

      {/* ── Text blocks ── */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 430 }}>
        {TEXT_BLOCKS.map(({ startFrame, title, color, text, highlight }, i) => {
          const op = useFade(startFrame);
          return (
            <div key={i} style={{
              opacity: op,
              backgroundColor: "#0d1117",
              border: `1.5px solid ${color}33`,
              borderRadius: 10,
              padding: "16px 22px",
              marginBottom: 12,
            }}>
              <div style={{ fontFamily: interFamily, color, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>
                {title}
              </div>
              <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 15, lineHeight: 1.6 }}>
                {text}
                {highlight && (
                  <span style={{ color, fontWeight: 600 }}> {highlight}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
