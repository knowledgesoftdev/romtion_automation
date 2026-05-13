import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN   = 0;
const MONEY_IN   = 22;
const ENG_IN     = 130;
const RESULT_IN  = 360;
const TL_IN      = 480;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const ENG_COLS = 15;
const ENG_ROWS = 5; // 15 * 5 = 75, close enough to 1500 displayed symbolically

const PersonDot: React.FC<{ x: number; y: number; opacity: number }> = ({ x, y, opacity }) => (
  <div style={{
    position: "absolute", left: x, top: y,
    width: 12, height: 12, borderRadius: "50%",
    backgroundColor: "#8b5cf6", opacity,
  }} />
);

export const QtInvestmentScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const moneyOp  = useFade(MONEY_IN);
  const engOp    = useFade(ENG_IN);
  const resultOp = useFade(RESULT_IN);
  const tlOp     = useFade(TL_IN);

  const moneyVal = Math.round(
    interpolate(frame, [MONEY_IN, MONEY_IN + 80], [0, 104], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  const engVal = Math.round(
    interpolate(frame, [ENG_IN, ENG_IN + 120], [0, 1500], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  const visibleDots = Math.floor(
    interpolate(frame, [ENG_IN, ENG_IN + 120], [0, ENG_COLS * ENG_ROWS], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
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
        La inversión en Qt — 104M y 1,500 ingenieros. Resultado: cero tracción.
      </div>

      {/* ── Investment card ── */}
      <div style={{
        position: "absolute", left: 80, top: 110, opacity: moneyOp,
        backgroundColor: "#1a1200",
        border: "2px solid #f59e0b44",
        borderRadius: 12, padding: "20px 28px",
      }}>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6 }}>
          INVERSIÓN NOKIA EN QT (2008–2011)
        </div>
        <div style={{ fontFamily: interFamily, color: "#f59e0b", fontSize: 64, fontWeight: 900, lineHeight: 1 }}>
          ${moneyVal}M
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 6 }}>
          Adquisición de Trolltech + migración
        </div>
      </div>

      {/* ── Engineer grid ── */}
      <div style={{
        position: "absolute", left: 80, top: 290, opacity: engOp,
      }}>
        <div style={{ fontFamily: interFamily, color: "#8b5cf6", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
          INGENIEROS ASIGNADOS AL PROYECTO
        </div>
        <div style={{ position: "relative", width: ENG_COLS * 18, height: ENG_ROWS * 18, marginBottom: 12 }}>
          {Array.from({ length: ENG_COLS * ENG_ROWS }, (_, i) => {
            const col = i % ENG_COLS;
            const row = Math.floor(i / ENG_COLS);
            return (
              <PersonDot
                key={i}
                x={col * 18} y={row * 18}
                opacity={i < visibleDots ? 0.85 : 0.1}
              />
            );
          })}
        </div>
        <div style={{ fontFamily: interFamily, color: "#8b5cf6", fontSize: 32, fontWeight: 800 }}>
          {engVal.toLocaleString()}
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 14, marginTop: 2 }}>
          ingenieros · 2008–2011
        </div>
      </div>

      {/* ── Arrow → Result ── */}
      <svg style={{
        position: "absolute", top: 0, left: 0, width: 1280, height: 720,
        pointerEvents: "none", opacity: resultOp,
      }}>
        <defs>
          <marker id="arr-qt-inv" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M 0,0 L 8,4 L 0,8 Z" fill="#ef4444" />
          </marker>
        </defs>
        <line x1={460} y1={340} x2={620} y2={340}
          stroke="#ef4444" strokeWidth={2} markerEnd="url(#arr-qt-inv)" />
      </svg>

      {/* ── Result card ── */}
      <div style={{
        position: "absolute", left: 640, top: 270, width: 360,
        opacity: resultOp,
        backgroundColor: "#1a0808",
        border: "2px solid #ef444444",
        borderRadius: 12, padding: "20px 24px",
      }}>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 8 }}>
          RESULTADO — 2011
        </div>
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 28, fontWeight: 800, lineHeight: 1.3 }}>
          0 tracción<br />en ecosistema
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>
          El memo "burning platform" de Elop (Feb 2011) fue filtrado el mismo día. Los desarrolladores que evaluaban Qt lo leyeron. La adopción se detuvo.
        </div>
      </div>

      {/* ── Mini timeline ── */}
      <div style={{
        position: "absolute", left: 640, top: 440, right: 60, opacity: tlOp,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { year: "2008", label: "Adquisición Qt", color: "#f59e0b" },
            { year: "2010", label: "Qt disponible", color: "#8b5cf6" },
            { year: "Feb 2011", label: "Memo filtrado", color: "#ef4444" },
            { year: "Nov 2011", label: "WP anunciado", color: "#64748b" },
          ].map(({ year, label, color }, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div style={{ flex: 1, height: 2, backgroundColor: "#1e293b" }} />
              )}
              <div style={{ textAlign: "center", minWidth: 90 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: color, margin: "0 auto 6px" }} />
                <div style={{ fontFamily: interFamily, color, fontSize: 12, fontWeight: 700 }}>{year}</div>
                <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 11, marginTop: 2 }}>{label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
