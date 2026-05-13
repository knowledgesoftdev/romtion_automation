import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono, fontFamily as monoFamily } from "@remotion/google-fonts/JetBrainsMono";

loadInter();
loadMono();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN   = 0;
const HEAP_IN    = 20;
const STACK_IN   = 60;
const ARROW_IN   = 100;
const CODE_IN    = 150;
const LABEL_IN   = 220;
const FADE       = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// ── heap objects ──────────────────────────────────────────────────────────────
const HEAP_OBJECTS = [
  { label: "CMyClass*", owner: "EHeap", color: "#8b5cf6" },
  { label: "HBufC*",    owner: "EHeap", color: "#8b5cf6" },
  { label: "CFoo*",     owner: "EHeap", color: "#ef4444" },
  { label: "RFile",     owner: "EStack", color: "#f59e0b" },
];

const CODE_LINES = [
  { text: "void CEngine::InitL()",             hi: false },
  { text: "  {",                               hi: false },
  { text: "  CMyClass* obj = new(ELeave)",     hi: false },
  { text: "      CMyClass();",                 hi: false },
  { text: "  CleanupStack::PushL(obj);",       hi: true  },
  { text: "  HBufC* buf = HBufC::NewLC(256);", hi: true  },
  { text: "  DoSomethingL();  // may leave",   hi: false },
  { text: "  CleanupStack::PopAndDestroy(2);", hi: true  },
  { text: "  }",                               hi: false },
];

// ── component ─────────────────────────────────────────────────────────────────
export const MemoryScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp  = useFade(TITLE_IN);
  const heapOp   = useFade(HEAP_IN);
  const stackOp  = useFade(STACK_IN);
  const arrowOp  = useFade(ARROW_IN);
  const codeOp   = useFade(CODE_IN);
  const labelOp  = useFade(LABEL_IN);

  const HEAP_X   = 80;
  const HEAP_Y   = 180;
  const STACK_X  = 460;
  const STACK_Y  = 160;
  const OBJ_H    = 52;
  const OBJ_W    = 220;
  const OBJ_GAP  = 10;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 44, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp, letterSpacing: "0.02em",
      }}>
        Gestión de memoria manual — sin garbage collector, sin RAII
      </div>

      {/* ── HEAP ── */}
      <div style={{ position: "absolute", left: HEAP_X, top: HEAP_Y - 30, opacity: heapOp }}>
        <div style={{ fontFamily: interFamily, color: "#8b5cf6", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 10 }}>
          HEAP
        </div>
        <div style={{ border: "2px solid #8b5cf622", borderRadius: 8, padding: 12, backgroundColor: "#0d1117" }}>
          {HEAP_OBJECTS.map((obj, i) => {
            const op = interpolate(frame, [HEAP_IN + i * 12, HEAP_IN + i * 12 + 12], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{
                width: OBJ_W, height: OBJ_H, marginBottom: i < HEAP_OBJECTS.length - 1 ? OBJ_GAP : 0,
                border: `2px solid ${obj.color}55`, borderRadius: 6,
                backgroundColor: `${obj.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: monoFamily, color: obj.color, fontSize: 13, fontWeight: 600,
                opacity: op,
              }}>
                {obj.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CLEANUP STACK ── */}
      <div style={{ position: "absolute", left: STACK_X, top: STACK_Y - 30, opacity: stackOp }}>
        <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 10 }}>
          CLEANUP STACK
        </div>
        <div style={{ border: "2px solid #00d4ff22", borderRadius: 8, padding: 12, backgroundColor: "#0d1117", minWidth: 200 }}>
          {HEAP_OBJECTS.slice(0, 2).map((obj, i) => {
            const op = interpolate(frame, [STACK_IN + i * 14, STACK_IN + i * 14 + 14], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            });
            return (
              <div key={i} style={{
                width: 186, height: OBJ_H, marginBottom: i < 1 ? OBJ_GAP : 0,
                border: "2px solid #00d4ff44", borderRadius: 6,
                backgroundColor: "#00d4ff0a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: monoFamily, color: "#00d4ff", fontSize: 13,
                opacity: op,
              }}>
                PushL({obj.label})
              </div>
            );
          })}
          {/* Arrow showing pop */}
          <div style={{
            width: 186, height: 32, marginTop: OBJ_GAP,
            border: "2px dashed #ef444455", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: monoFamily, color: "#ef4444", fontSize: 11,
            opacity: stackOp,
          }}>
            PopAndDestroy() ↓
          </div>
        </div>

        {/* "No compilador" warning */}
        <div style={{
          marginTop: 16, fontFamily: interFamily, color: "#ef4444",
          fontSize: 13, fontWeight: 600, opacity: labelOp,
          lineHeight: 1.4, maxWidth: 220,
        }}>
          ⚠ Omisión silenciosa = memory leak
          <br />
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>El compilador no lo detecta.</span>
        </div>
      </div>

      {/* ── Arrows from heap to stack ── */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, pointerEvents: "none", opacity: arrowOp }}>
        {[0, 1].map((i) => {
          const oy = HEAP_Y + 12 + i * (OBJ_H + OBJ_GAP);
          const dy = STACK_Y + 12 + i * (OBJ_H + OBJ_GAP);
          return (
            <g key={i}>
              <path
                d={`M ${HEAP_X + OBJ_W + 14} ${oy + 14} C ${HEAP_X + OBJ_W + 80} ${oy + 14} ${STACK_X - 80} ${dy + 14} ${STACK_X - 12} ${dy + 14}`}
                fill="none" stroke="#00d4ff" strokeWidth={1.5}
                strokeDasharray="6 3" opacity={0.6}
              />
              <polygon
                points={`${STACK_X - 12},${dy + 10} ${STACK_X},${dy + 14} ${STACK_X - 12},${dy + 18}`}
                fill="#00d4ff" opacity={0.6}
              />
            </g>
          );
        })}
      </svg>

      {/* ── Code panel ── */}
      <div style={{
        position: "absolute", left: 760, top: 130, right: 40,
        backgroundColor: "#0d1117", border: "1.5px solid #1e293b",
        borderRadius: 10, padding: "16px 20px", opacity: codeOp,
      }}>
        <div style={{ fontFamily: interFamily, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12 }}>
          SYMBIAN — L-FUNCTIONS
        </div>
        {CODE_LINES.map(({ text, hi }, i) => {
          const lop = interpolate(frame, [CODE_IN + i * 10, CODE_IN + i * 10 + 10], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{
              fontFamily: monoFamily, fontSize: 13,
              color: hi ? "#00d4ff" : "#e2e8f0",
              lineHeight: 1.8,
              opacity: lop,
              backgroundColor: hi ? "#00d4ff0a" : "transparent",
              marginLeft: hi ? -4 : 0, paddingLeft: hi ? 4 : 0,
              borderLeft: hi ? "2px solid #00d4ff55" : "none",
            }}>
              {text}
            </div>
          );
        })}
      </div>

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 48, left: 80,
        fontFamily: interFamily, color: "#64748b", fontSize: 15,
        opacity: labelOp, lineHeight: 1.5,
      }}>
        Cada función que pudiera fallar terminaba en{" "}
        <span style={{ color: "#ef4444", fontFamily: monoFamily, fontWeight: 700 }}>L</span>
        {" "}— por convención, no por contrato del compilador.
      </div>

    </AbsoluteFill>
  );
};
