import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const BARS_IN   = 28;
const BARS_END  = 420;
const BURN_IN   = 560;
const MEMO_IN   = 640;
const CONCL_IN  = 860;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// ── datasets ─────────────────────────────────────────────────────────────────
const STORES = [
  { label: "App Store (Apple)", count: 225000, color: "#00d4ff", startFrame: BARS_IN },
  { label: "Android Market",   count: 70000,  color: "#22c55e", startFrame: BARS_IN + 20 },
  { label: "Qt / Symbian",     count: 0,      color: "#8b5cf6", startFrame: BARS_IN + 40 },
];

const BAR_MAX_W = 720;
const MAX_COUNT = 225000;

// Animated number formatter
function formatCount(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export const AppRaceScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const burnOp  = useFade(BURN_IN);
  const memoOp  = useFade(MEMO_IN);
  const conclOp = useFade(CONCL_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        El ecosistema de aplicaciones — 2010: Qt llega tres años tarde
      </div>

      {/* ── Racing bars ── */}
      <div style={{ position: "absolute", left: 80, top: 110, width: 820 }}>
        <div style={{
          fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.15em", marginBottom: 24,
          opacity: useFade(BARS_IN - 5),
        }}>
          APPS DISPONIBLES — 2010
        </div>

        {STORES.map(({ label, count, color, startFrame }, i) => {
          const currentCount = Math.round(
            interpolate(frame, [startFrame, BARS_END], [0, count], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })
          );
          const barW = (currentCount / MAX_COUNT) * BAR_MAX_W;
          const op = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });

          // Qt bar is essentially 0 but show a stub
          const displayW = label.includes("Qt") ? 4 : barW;

          return (
            <div key={i} style={{ marginBottom: 32, opacity: op }}>
              <div style={{
                fontFamily: interFamily, color: "#94a3b8", fontSize: 15,
                marginBottom: 8, fontWeight: 500,
              }}>
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", height: 36, width: BAR_MAX_W, backgroundColor: "#0d1117", borderRadius: 5 }}>
                  <div style={{
                    width: displayW, height: 36, backgroundColor: color,
                    borderRadius: 5, position: "absolute", top: 0, left: 0,
                    boxShadow: displayW > 8 ? `0 0 12px ${color}44` : "none",
                  }} />
                </div>
                <div style={{
                  fontFamily: interFamily, color, fontSize: 22, fontWeight: 800, width: 80,
                }}>
                  {label.includes("Qt") ? "~0" : formatCount(currentCount)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Qt adoption line */}
        <div style={{
          fontFamily: interFamily, color: "#8b5cf6", fontSize: 14,
          opacity: useFade(BARS_END - 20), lineHeight: 1.5, marginTop: 8,
        }}>
          Qt para Symbian disponible en 2010 — 2 años después de la adquisición,<br />
          3 años después del iPhone.
        </div>
      </div>

      {/* ── Burning platform line ── */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, pointerEvents: "none", opacity: burnOp }}>
        <line x1={950} y1={100} x2={950} y2={540} stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" />
        <text x={958} y={118} fill="#ef4444" fontSize={13} fontFamily={interFamily} fontWeight="700">
          Feb 2011
        </text>
        <text x={958} y={136} fill="#ef4444" fontSize={11} fontFamily={interFamily}>
          Burning platform memo
        </text>
      </svg>

      {/* ── Memo card ── */}
      <div style={{
        position: "absolute", right: 60, top: 160, width: 280,
        backgroundColor: "#1a0808",
        border: "2px solid #ef444455",
        borderRadius: 10, padding: "16px 18px",
        opacity: memoOp,
      }}>
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 8 }}>
          STEPHEN ELOP — FEB 2011
        </div>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>
          "Estamos de pie sobre una plataforma en llamas."
        </div>
        <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 12, marginTop: 8 }}>
          Memo filtrado el mismo día.
          <br />Adopción de Qt se detuvo.
        </div>
      </div>

      {/* Conclusion */}
      <div style={{
        position: "absolute", bottom: 44, left: 80, right: 80,
        fontFamily: interFamily, color: "#94a3b8", fontSize: 16,
        opacity: conclOp, lineHeight: 1.5,
      }}>
        Los desarrolladores que evaluaban adoptar Qt para Symbian leyeron ese memo.{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>La adopción se detuvo.</span>
      </div>

    </AbsoluteFill>
  );
};
