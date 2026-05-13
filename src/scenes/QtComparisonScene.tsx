import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN  = 0;
const COL_STAG  = 55;
const COLS_IN   = 20;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const COLUMNS = [
  {
    label: "Documentación",
    s60:   { icon: "✕", note: "Fragmentada entre OS y UI layer", color: "#ef4444" },
    qt:    { icon: "✓", note: "Coherente, unificada",            color: "#00d4ff" },
  },
  {
    label: "Modelo de eventos",
    s60:   { icon: "✕", note: "Dos sistemas superpuestos",       color: "#ef4444" },
    qt:    { icon: "✓", note: "Signals & slots — limpio",         color: "#00d4ff" },
  },
  {
    label: "Compatibilidad multiplataforma",
    s60:   { icon: "✕", note: "Solo Symbian, por versión",        color: "#ef4444" },
    qt:    { icon: "✓", note: "Linux, Windows, Symbian, macOS",  color: "#00d4ff" },
  },
];

const COL_W    = 300;
const ROW_H    = 96;
const START_X  = (1280 - COLUMNS.length * COL_W - 2 * 24) / 2;
const HEADER_Y = 120;
const ROW1_Y   = 220;

export const QtComparisonScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const hdrOp   = useFade(COLS_IN - 5);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Qt vs S60 — técnicamente superior, tres años tarde
      </div>

      {/* Row headers */}
      <div style={{
        position: "absolute", left: START_X - 140, top: ROW1_Y + 28,
        opacity: hdrOp,
      }}>
        <div style={{
          fontFamily: interFamily, color: "#ef4444",
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.12em", marginBottom: 68,
        }}>
          S60
        </div>
        <div style={{
          fontFamily: interFamily, color: "#00d4ff",
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.12em",
        }}>
          Qt
        </div>
      </div>

      {/* Columns */}
      {COLUMNS.map(({ label, s60, qt }, i) => {
        const startF = COLS_IN + i * COL_STAG;
        const colOp = interpolate(frame, [startF, startF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const tx = interpolate(frame, [startF, startF + 22], [10, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const s60StartF = startF + 15;
        const qtStartF  = startF + 35;
        const s60CellOp = interpolate(frame, [s60StartF, s60StartF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const qtCellOp = interpolate(frame, [qtStartF, qtStartF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        const x = START_X + i * (COL_W + 24);

        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: HEADER_Y, width: COL_W,
            opacity: colOp, transform: `translateX(${tx}px)`,
          }}>
            {/* Column header */}
            <div style={{
              height: 76, display: "flex", alignItems: "center",
              justifyContent: "center", textAlign: "center",
              fontFamily: interFamily, color: "#e2e8f0",
              fontSize: 16, fontWeight: 700,
              backgroundColor: "#0d1117",
              border: "1.5px solid #1e293b",
              borderRadius: 8, padding: "0 12px",
              lineHeight: 1.3,
            }}>
              {label}
            </div>

            {/* S60 row */}
            <div style={{
              marginTop: 12, height: ROW_H,
              backgroundColor: "#1a0808",
              border: "1.5px solid #ef444433",
              borderRadius: 8,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 14px", textAlign: "center",
              opacity: s60CellOp,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444", marginBottom: 6 }}>
                {s60.icon}
              </div>
              <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, lineHeight: 1.4 }}>
                {s60.note}
              </div>
            </div>

            {/* Qt row */}
            <div style={{
              marginTop: 10, height: ROW_H,
              backgroundColor: "#001a1f",
              border: "1.5px solid #00d4ff33",
              borderRadius: 8,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "0 14px", textAlign: "center",
              opacity: qtCellOp,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#00d4ff", marginBottom: 6 }}>
                {qt.icon}
              </div>
              <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, lineHeight: 1.4 }}>
                {qt.note}
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom conclusion */}
      <div style={{
        position: "absolute", bottom: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#64748b", fontSize: 17,
        opacity: useFade(COLS_IN + COLUMNS.length * COL_STAG + 20),
        lineHeight: 1.5,
      }}>
        <span style={{ color: "#00d4ff", fontWeight: 700 }}>Técnicamente correcta.</span>{" "}
        Disponible en 2010 — cuando iOS tenía 225,000 apps y Android 70,000.
      </div>
    </AbsoluteFill>
  );
};
