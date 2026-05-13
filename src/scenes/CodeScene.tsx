import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono, fontFamily as monoFamily } from "@remotion/google-fonts/JetBrainsMono";

loadInter();
loadMono();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN    = 0;
const CODE_IN     = 18;
const LINE_DELAY  = 28;   // frames between lines
const COUNTER_IN  = 700;
const PROGRESS_IN = 900;
const FADE        = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

type Line = { code: string; isL: boolean; indent: number };

const CODE_LINES: Line[] = [
  { code: "class CUserManager : public CBase", isL: false, indent: 0 },
  { code: "    {", isL: false, indent: 0 },
  { code: "public:", isL: false, indent: 0 },
  { code: "    static CUserManager* NewL();", isL: true,  indent: 4 },
  { code: "    static CUserManager* NewLC();", isL: true,  indent: 4 },
  { code: "    void ConnectL();", isL: true,  indent: 4 },
  { code: "    void LoadUsersL();", isL: true,  indent: 4 },
  { code: "    HBufC* GetNameL( TInt aIndex );", isL: true,  indent: 4 },
  { code: "    void SavePrefsL();", isL: true,  indent: 4 },
  { code: "    void RefreshCacheL();", isL: true,  indent: 4 },
  { code: "private:", isL: false, indent: 0 },
  { code: "    void ConstructL();", isL: true,  indent: 4 },
  { code: "    RArray<CUser*> iUsers;  // owned", isL: false, indent: 4 },
  { code: "    RFile iPrefsFile;", isL: false, indent: 4 },
  { code: "    };", isL: false, indent: 0 },
  { code: "", isL: false, indent: 0 },
  { code: "// Si omites CleanupStack::PushL() antes de cualquier", isL: false, indent: 0 },
  { code: "// operación que pueda fallar → memory leak silencioso.", isL: false, indent: 0 },
];

export const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp    = useFade(TITLE_IN);
  const counterOp  = useFade(COUNTER_IN);
  const progressOp = useFade(PROGRESS_IN);

  const visibleLines = Math.floor((frame - CODE_IN) / (LINE_DELAY / 2));

  // Animated engineer counter: 0 → 3000
  const engineers = Math.round(
    interpolate(frame, [COUNTER_IN, COUNTER_IN + 120], [0, 3000], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  // Progress bar for 6-12 months training
  const progW = interpolate(frame, [PROGRESS_IN, PROGRESS_IN + 160], [0, 300], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Count L-functions visible
  const lCount = CODE_LINES.slice(0, Math.max(0, visibleLines)).filter((l) => l.isL).length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 22, fontWeight: "bold",
        opacity: titleOp, letterSpacing: "0.02em",
      }}>
        Convencion de L-functions — fricción sistémica en 3,000 ingenieros
      </div>

      {/* ── Code editor panel ── */}
      <div style={{
        position: "absolute", left: 60, top: 100, width: 780,
        backgroundColor: "#0d1117",
        border: "1.5px solid #1e293b",
        borderRadius: 10, overflow: "hidden",
      }}>
        {/* Editor header */}
        <div style={{
          backgroundColor: "#161b22", borderBottom: "1px solid #21262d",
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 6,
        }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
          ))}
          <span style={{ fontFamily: monoFamily, color: "#64748b", fontSize: 12, marginLeft: 8 }}>
            CUserManager.h — Symbian C++
          </span>
        </div>

        {/* Code lines */}
        <div style={{ padding: "12px 0" }}>
          {CODE_LINES.map(({ code, isL, indent }, i) => {
            const startF = CODE_IN + i * (LINE_DELAY / 2);
            const op = interpolate(frame, [startF, startF + 10], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            const lineColor = isL ? "#ef4444" : code.startsWith("//") ? "#475569" : "#e2e8f0";

            return (
              <div key={i} style={{
                display: "flex", opacity: op, height: 24,
                backgroundColor: isL && op > 0.5 ? "#ef44440a" : "transparent",
              }}>
                <span style={{
                  fontFamily: monoFamily, color: "#334155", fontSize: 13,
                  width: 40, textAlign: "right", paddingRight: 12, userSelect: "none",
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontFamily: monoFamily, color: lineColor, fontSize: 13,
                  paddingLeft: indent * 4,
                  fontWeight: isL ? 600 : 400,
                }}>
                  {code}
                </span>
                {isL && op > 0.5 && (
                  <span style={{
                    fontFamily: interFamily, color: "#ef4444", fontSize: 10,
                    fontWeight: 700, marginLeft: 8, alignSelf: "center",
                    backgroundColor: "#ef44441a", borderRadius: 3, padding: "1px 5px",
                  }}>
                    LEAVING
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── L-function counter badge ── */}
      <div style={{
        position: "absolute", left: 60, top: 590,
        fontFamily: interFamily, color: "#ef4444",
        fontSize: 16, fontWeight: 600, opacity: useFade(CODE_IN + 5 * (LINE_DELAY / 2)),
      }}>
        {lCount} L-functions visibles — cada una requiere gestión manual de pila
      </div>

      {/* ── Right panel: stats ── */}
      <div style={{ position: "absolute", right: 60, top: 120, width: 340 }}>

        {/* Engineer counter */}
        <div style={{
          backgroundColor: "#0d1117", border: "2px solid #8b5cf633",
          borderRadius: 10, padding: "20px 24px", marginBottom: 24,
          opacity: counterOp,
        }}>
          <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 8 }}>
            NOKIA SYMBIAN — 2007
          </div>
          <div style={{ fontFamily: interFamily, color: "#8b5cf6", fontSize: 56, fontWeight: 800, lineHeight: 1 }}>
            {engineers.toLocaleString()}
          </div>
          <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 6 }}>
            ingenieros activos
          </div>
        </div>

        {/* Training time progress bar */}
        <div style={{
          backgroundColor: "#0d1117", border: "2px solid #f59e0b33",
          borderRadius: 10, padding: "20px 24px",
          opacity: progressOp,
        }}>
          <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
            TIEMPO PARA ESCRIBIR CÓDIGO SIN LEAKS
          </div>
          <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 13, marginBottom: 10 }}>
            Nuevos desarrolladores
          </div>
          <div style={{ width: 300, height: 14, backgroundColor: "#1e293b", borderRadius: 7 }}>
            <div style={{ width: progW, height: 14, backgroundColor: "#f59e0b", borderRadius: 7 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontFamily: interFamily, color: "#f59e0b", fontSize: 13, fontWeight: 700 }}>6 meses</div>
            <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 13, fontWeight: 700 }}>12 meses</div>
          </div>
          <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>
            No era problema de talento.<br />Era fricción estructural.
          </div>
        </div>

      </div>

    </AbsoluteFill>
  );
};
