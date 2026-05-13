import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN   = 0;
const CHART_IN   = 20;
const NODE_STAG  = 28;
const ALERT_IN   = 240;
const BLOCK_IN   = 380;
const CONCL_IN   = 600;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// ── org chart nodes ───────────────────────────────────────────────────────────
type OrgNode = { label: string; sublabel: string; x: number; y: number; color: string; level: number };

const NODES: OrgNode[] = [
  { label: "Board",          sublabel: "Accionistas",          x: 580,  y: 80,  color: "#64748b", level: 0 },
  { label: "CEO",            sublabel: "O-P. Kallasvuo 2006–2010", x: 580, y: 180, color: "#8b5cf6", level: 1 },
  { label: "VP Hardware",    sublabel: "Diseño · Manufactura",  x: 240,  y: 310, color: "#64748b", level: 2 },
  { label: "VP Software",    sublabel: "Symbian · MeeGo",      x: 580,  y: 310, color: "#f59e0b", level: 2 },
  { label: "VP Ventas",      sublabel: "Distribución global",   x: 920,  y: 310, color: "#64748b", level: 2 },
  { label: "Ingenieros",     sublabel: "3,000 devs Symbian",   x: 440,  y: 448, color: "#ef4444", level: 3 },
  { label: "Ingenieros",     sublabel: "MeeGo · Qt",           x: 720,  y: 448, color: "#f59e0b", level: 3 },
];

const W = 170, H = 62;

// Edges (parent → child by index)
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [3, 5],
  [3, 6],
];

// Alert positions (one per engineer node)
const ALERTS = [
  { x: 440, y: 448, label: "⚠ Symbian tiene deuda técnica estructural" },
  { x: 720, y: 448, label: "⚠ MeeGo necesita 18 meses más" },
];

export const OrgChartScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const blockOp = useFade(BLOCK_IN);
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
        La organización penalizaba la señal de alarma técnica
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 580 }}>

        {/* ── Edges ── */}
        {EDGES.map(([pi, ci], i) => {
          const parent = NODES[pi];
          const child = NODES[ci];
          const startF = CHART_IN + ci * NODE_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const px = parent.x + W / 2, py = parent.y + H;
          const cx = child.x + W / 2,  cy = child.y;
          return (
            <line key={i} x1={px} y1={py} x2={cx} y2={cy}
              stroke="#1e293b" strokeWidth={2} opacity={op} />
          );
        })}

        {/* ── Nodes ── */}
        {NODES.map(({ label, sublabel, x, y, color }, i) => {
          const startF = CHART_IN + i * NODE_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 18], [-8, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              <rect x={x} y={y} width={W} height={H} rx={8}
                fill={`${color}14`} stroke={`${color}55`} strokeWidth={1.5} />
              <text x={x + W / 2} y={y + 24} textAnchor="middle"
                fill={color} fontSize={14} fontWeight="700" fontFamily={interFamily}>
                {label}
              </text>
              <text x={x + W / 2} y={y + 44} textAnchor="middle"
                fill="#475569" fontSize={11} fontFamily={interFamily}>
                {sublabel}
              </text>
            </g>
          );
        })}

        {/* ── Alert bubbles at engineer level ── */}
        {ALERTS.map(({ x, y, label }, i) => {
          const op = interpolate(frame, [ALERT_IN + i * 25, ALERT_IN + i * 25 + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <g key={i} opacity={op}>
              {/* Bubble box */}
              <rect x={x - 20} y={y + H + 12} width={210} height={36} rx={6}
                fill="#ef444414" stroke="#ef444455" strokeWidth={1.5} />
              <text x={x - 12} y={y + H + 35} fill="#ef4444" fontSize={11}
                fontFamily={interFamily} fontWeight="600">
                {label}
              </text>
              {/* Upward arrow (signal) */}
              <line x1={x + W / 2} y1={y + H + 12} x2={x + W / 2} y2={y - 20}
                stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3"
                strokeOpacity={0.5} markerEnd="url(#arrow-up-red)" />
            </g>
          );
        })}

        {/* Arrow marker def */}
        <defs>
          <marker id="arrow-up-red" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
            <path d="M 0,6 L 3,0 L 6,6" stroke="#ef4444" strokeWidth={1.2} fill="none" />
          </marker>
        </defs>

        {/* ── Block indicators (X marks on signal path) ── */}
        {[
          { x: 580 + W / 2, y: 380 },  // VP Software level
          { x: 580 + W / 2, y: 244 },  // CEO level
        ].map(({ x, y }, i) => {
          const op = interpolate(frame, [BLOCK_IN + i * 30, BLOCK_IN + i * 30 + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <g key={i} opacity={op}>
              <circle cx={x} cy={y} r={14} fill="#1a0808" stroke="#ef444488" strokeWidth={2} />
              <text x={x} y={y + 5} textAnchor="middle" fill="#ef4444" fontSize={14} fontWeight="900" fontFamily={interFamily}>
                ✕
              </text>
            </g>
          );
        })}

        {/* Block label */}
        <text
          x={720} y={380} fill="#ef4444" fontSize={11}
          fontFamily={interFamily} fontWeight="700"
          opacity={blockOp}
        >
          Señal bloqueada
        </text>

      </svg>

      {/* ── Right context panel ── */}
      <div style={{
        position: "absolute", right: 40, top: 100, width: 280,
        opacity: conclOp,
      }}>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #f59e0b33",
          borderRadius: 10, padding: "16px 18px", marginBottom: 16,
        }}>
          <div style={{ fontFamily: interFamily, color: "#f59e0b", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>
            KALLASVUO — 2007
          </div>
          <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>
            "El iPhone es interesante, pero Nokia responderá con hardware superior."
          </div>
        </div>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #ef444433",
          borderRadius: 10, padding: "16px 18px",
        }}>
          <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>
            RESULTADO
          </div>
          <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
            Los problemas reales de Symbian no llegaron al nivel de decisión hasta 2010. Tres años perdidos.
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div style={{
        position: "absolute", bottom: 36, left: 40, right: 350,
        fontFamily: interFamily, color: "#64748b", fontSize: 14,
        opacity: conclOp, lineHeight: 1.5,
      }}>
        Ingenieros que reportaban problemas estructurales en Symbian eran reubicados o ignorados.<br />
        <span style={{ color: "#f59e0b" }}>— "Operation Elop", Salminen & Nykänen, 2014</span>
      </div>

    </AbsoluteFill>
  );
};
