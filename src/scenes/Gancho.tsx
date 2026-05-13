import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── text ─────────────────────────────────────────────────────────────────────
const PART1 = "Symbian tenía multitarea real,";
const PART2 = "iOS llegó con 12 millones.";
const PART3 = "Nokia perdió igual.";

// ─── typewriter timing (1 char / frame) ───────────────────────────────────────
const P1_START   = 12;
const P1_END     = P1_START + PART1.length;        // 42
const P2_START   = P1_END + 18;                    // 60
const P2_END     = P2_START + PART2.length;        // 86
const P3_START   = P2_END + 22;                    // 108
const P3_END     = P3_START + PART3.length;        // 127

const FLASH_PEAK = P3_START + 6;
const FLASH_DONE = P3_START + 45;

const LINE_START = P3_END + 14;                    // 141
const LINE_END   = LINE_START + 34;               // 175

// ─── vertical layout ─────────────────────────────────────────────────────────
const P1_TOP   = 220;
const P2_TOP   = 308;
const P3_TOP   = 400;
const LINE_TOP = P3_TOP + 100;

// ─── particles (deterministic — no Math.random) ───────────────────────────────
const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  x:        (i * 137.508) % 1280,
  startY:   ((i * 97.5)   % 820) - 300,
  speed:    0.45 + (i % 8) * 0.15,
  char:     i % 3 === 0 ? "1" : "0",
  fontSize: 10 + (i % 4) * 2,
  opacity:  0.06 + (i % 5) * 0.04,
}));

// ─── component ────────────────────────────────────────────────────────────────
export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();

  // typewriter helper
  const typeChars = (text: string, start: number, end: number): string => {
    const n = Math.round(
      interpolate(frame, [start, end], [0, text.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    return text.slice(0, n);
  };

  const p1 = typeChars(PART1, P1_START, P1_END);
  const p2 = frame >= P2_START ? typeChars(PART2, P2_START, P2_END) : "";
  const p3 = frame >= P3_START ? typeChars(PART3, P3_START, P3_END) : "";

  // cursor blink (visible while actively typing)
  const typing = frame >= P1_START && frame < P3_END;
  const cursor = typing && Math.floor(frame / 8) % 2 === 0 ? "|" : "";

  // active typing cursor goes after the last part that is being typed
  const p1Cursor = frame >= P1_START && frame < P2_START ? cursor : "";
  const p2Cursor = frame >= P2_START && frame < P3_START ? cursor : "";
  const p3Cursor = frame >= P3_START && frame < P3_END   ? cursor : "";

  // flash glow behind Part 3
  const flashOp = interpolate(
    frame,
    [P3_START, FLASH_PEAK, P3_END, FLASH_DONE],
    [0, 1, 0.65, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // cyan line — expands symmetrically from center
  const lineHalfW = interpolate(frame, [LINE_START, LINE_END], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lineOp = interpolate(frame, [LINE_START, LINE_START + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // shared text style
  const base: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: interFamily,
    fontWeight: "bold",
    whiteSpace: "pre",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", overflow: "hidden" }}>

      {/* ── Binary rain particles ── */}
      {PARTICLES.map((p, i) => {
        const rawY = p.startY + frame * p.speed;
        const y = ((rawY % 920) + 920) % 920;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y,
              fontFamily: "'Courier New', monospace",
              fontSize: p.fontSize,
              color: "#1a1a2e",
              opacity: p.opacity,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {p.char}
          </div>
        );
      })}

      {/* ── Flash glow behind Part 3 ── */}
      <div
        style={{
          position: "absolute",
          top: P3_TOP - 28,
          left: "50%",
          transform: "translateX(-50%)",
          width: 720,
          height: 160,
          background:
            "radial-gradient(ellipse at center, rgba(239,68,68,0.55) 0%, rgba(239,68,68,0.18) 45%, transparent 70%)",
          opacity: flashOp,
          pointerEvents: "none",
        }}
      />

      {/* ── Part 1 ── */}
      <div style={{ ...base, top: P1_TOP, fontSize: 64, color: "#e2e8f0", letterSpacing: "0.01em" }}>
        {p1}{p1Cursor}
      </div>

      {/* ── Part 2 ── */}
      <div style={{ ...base, top: P2_TOP, fontSize: 64, color: "#e2e8f0", letterSpacing: "0.01em" }}>
        {p2}{p2Cursor}
      </div>

      {/* ── Part 3 ── */}
      <div
        style={{
          ...base,
          top: P3_TOP,
          fontSize: 80,
          color: "#ef4444",
          letterSpacing: "0.02em",
          textShadow: flashOp > 0.05 ? `0 0 40px rgba(239,68,68,${flashOp * 0.8})` : "none",
        }}
      >
        {p3}{p3Cursor}
      </div>

      {/* ── Cyan line (slides from center outward) ── */}
      <div
        style={{
          position: "absolute",
          top: LINE_TOP,
          left: "50%",
          marginLeft: -lineHalfW,
          width: lineHalfW * 2,
          height: 2,
          backgroundColor: "#00d4ff",
          boxShadow: "0 0 10px #00d4ff99",
          opacity: lineOp,
        }}
      />

    </AbsoluteFill>
  );
};
