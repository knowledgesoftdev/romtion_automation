import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN   = 0;
const CEO_IN     = 20;
const DEPT_IN    = 70;
const DEPT_STAG  = 30;
const SW_IN      = 220;
const TEXT_IN    = 340;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const DEPTS = [
  { label: "Operaciones",   sub: "Supply chain · manufactura", x: 120 },
  { label: "Ventas",        sub: "Distribución global",        x: 400 },
  { label: "Manufactura",   sub: "Hardware · componentes",     x: 680 },
];

const BOX_W = 200;
const BOX_H = 68;
const CEO_X = 400;
const CEO_Y = 140;
const DEPT_Y = 310;
const SW_X   = 1020;
const SW_Y   = 240;

export const ExecOrgScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const ceoOp   = useFade(CEO_IN);
  const swOp    = useFade(SW_IN);
  const textOp  = useFade(TEXT_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Liderazgo de hardware en una guerra de software — 2006–2010
      </div>

      <svg style={{ position: "absolute", top: 60, left: 0, width: 1280, height: 520 }}>
        {/* ── CEO → Dept connectors ── */}
        {DEPTS.map(({ x }, i) => {
          const op = interpolate(frame, [DEPT_IN + i * DEPT_STAG, DEPT_IN + i * DEPT_STAG + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <line key={i}
              x1={CEO_X + BOX_W / 2} y1={CEO_Y + BOX_H}
              x2={x + BOX_W / 2} y2={DEPT_Y}
              stroke="#334155" strokeWidth={1.5}
              opacity={op}
            />
          );
        })}

        {/* ── CEO box ── */}
        <g opacity={ceoOp}>
          <rect x={CEO_X} y={CEO_Y} width={BOX_W} height={BOX_H}
            rx={8} fill="#33415514" stroke="#475569" strokeWidth={2} />
          <text x={CEO_X + BOX_W / 2} y={CEO_Y + 26}
            textAnchor="middle" fill="#94a3b8"
            fontSize={15} fontWeight="700" fontFamily={interFamily}>
            CEO
          </text>
          <text x={CEO_X + BOX_W / 2} y={CEO_Y + 48}
            textAnchor="middle" fill="#475569"
            fontSize={12} fontFamily={interFamily}>
            Kallasvuo · 2006–2010
          </text>
        </g>

        {/* ── Dept boxes ── */}
        {DEPTS.map(({ label, sub, x }, i) => {
          const startF = DEPT_IN + i * DEPT_STAG;
          const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startF, startF + 18], [8, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <g key={i} opacity={op} transform={`translate(0,${ty})`}>
              <rect x={x} y={DEPT_Y} width={BOX_W} height={BOX_H}
                rx={8} fill="#33415510" stroke="#33415566" strokeWidth={1.5} />
              <text x={x + BOX_W / 2} y={DEPT_Y + 26}
                textAnchor="middle" fill="#64748b"
                fontSize={14} fontWeight="700" fontFamily={interFamily}>
                {label}
              </text>
              <text x={x + BOX_W / 2} y={DEPT_Y + 46}
                textAnchor="middle" fill="#475569"
                fontSize={11} fontFamily={interFamily}>
                {sub}
              </text>
            </g>
          );
        })}

        {/* ── Software box (isolated, dotted) ── */}
        <g opacity={swOp}>
          {/* Dashed connector */}
          <line
            x1={CEO_X + BOX_W} y1={CEO_Y + BOX_H / 2}
            x2={SW_X} y2={SW_Y + BOX_H / 2}
            stroke="#8b5cf6" strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.4}
          />
          {/* Box */}
          <rect x={SW_X} y={SW_Y} width={BOX_W - 16} height={BOX_H + 10}
            rx={8} fill="#8b5cf60a"
            stroke="#8b5cf6" strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <text x={SW_X + (BOX_W - 16) / 2} y={SW_Y + 26}
            textAnchor="middle" fill="#8b5cf6"
            fontSize={14} fontWeight="700" fontFamily={interFamily}>
            Software
          </text>
          <text x={SW_X + (BOX_W - 16) / 2} y={SW_Y + 46}
            textAnchor="middle" fill="#64748b"
            fontSize={11} fontFamily={interFamily}>
            Symbian · MeeGo
          </text>
          <text x={SW_X + (BOX_W - 16) / 2} y={SW_Y + 66}
            textAnchor="middle" fill="#8b5cf666"
            fontSize={10} fontFamily={interFamily}>
            (desconectado)
          </text>
        </g>

        {/* "Origin" labels */}
        <text x={CEO_X + BOX_W / 2} y={CEO_Y - 12}
          textAnchor="middle" fill="#64748b"
          fontSize={11} fontFamily={interFamily} fontWeight="600"
          opacity={ceoOp}>
          Perfil: Operaciones · Ventas · Hardware
        </text>
      </svg>

      {/* Conclusion text */}
      <div style={{
        position: "absolute", bottom: 40, left: 80, right: 80,
        opacity: textOp,
      }}>
        <div style={{
          fontFamily: interFamily, color: "#e2e8f0",
          fontSize: 20, fontWeight: 600, marginBottom: 10, textAlign: "center",
        }}>
          Las decisiones de software se tomaban con criterios de hardware.
        </div>
        <div style={{
          fontFamily: interFamily, color: "#64748b",
          fontSize: 15, lineHeight: 1.5, textAlign: "center",
        }}>
          Ciclos de 18–24 meses · Optimización de costos de producción · Gestión de proveedores de componentes
          <br />
          <span style={{ color: "#f59e0b" }}>
            "El iPhone es interesante, pero Nokia responderá con hardware superior." — Kallasvuo, 2007
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
