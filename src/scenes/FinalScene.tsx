import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── text ──────────────────────────────────────────────────────────────────────
const FULL_TEXT =
  "La próxima vez que evalúes adoptar o mantener una arquitectura de sistema, " +
  "pregúntate cuánto tiempo tarda un ingeniero nuevo en escribir código correcto sin supervisión. " +
  "Eso es lo que separa una plataforma que escala su ecosistema " +
  "de una que lo erosiona desde adentro.";

// Split into words with metadata: is it part of the final blue phrase?
const BLUE_START = "Eso es lo que separa una plataforma que escala su ecosistema de una que lo erosiona desde adentro.";

const WORDS = FULL_TEXT.split(" ").map((word) => ({
  word,
  isBlue: BLUE_START.includes(word) && FULL_TEXT.indexOf(word) >= FULL_TEXT.indexOf("Eso"),
}));

// ── timing ────────────────────────────────────────────────────────────────────
const WORD_RATE = 6;     // frames between words
const START_IN  = 18;
const FADE_OUT  = 390;   // frame to start fading out everything

export const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();

  const globalOp = interpolate(frame, [FADE_OUT, FADE_OUT + 40], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const visibleWords = Math.floor((frame - START_IN) / WORD_RATE) + 1;

  // Background pulse (subtle, synced to word reveal)
  const pulseScale = interpolate(
    (frame - START_IN) % WORD_RATE,
    [0, 2, WORD_RATE],
    [1.0, 1.002, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 120px",
        opacity: globalOp,
        transform: `scale(${pulseScale})`,
      }}
    >
      {/* Subtle radial glow */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 400,
        background: "radial-gradient(ellipse at center, rgba(0,212,255,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Word-by-word text */}
      <p style={{
        fontFamily: interFamily,
        fontSize: 26,
        lineHeight: 1.75,
        textAlign: "center",
        margin: 0,
        color: "#e2e8f0",
        letterSpacing: "0.01em",
      }}>
        {WORDS.map(({ word, isBlue }, i) => {
          const wordFrame = START_IN + i * WORD_RATE;
          const op = interpolate(frame, [wordFrame, wordFrame + 8], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [wordFrame, wordFrame + 10], [8, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          if (i >= visibleWords) return null;

          return (
            <span
              key={i}
              style={{
                opacity: op,
                display: "inline-block",
                transform: `translateY(${ty}px)`,
                color: isBlue ? "#00d4ff" : "#e2e8f0",
                fontWeight: isBlue ? 700 : 400,
                marginRight: "0.28em",
              }}
            >
              {word}
            </span>
          );
        })}
      </p>

      {/* Bottom attribution line */}
      <div style={{
        position: "absolute",
        bottom: 48,
        left: 0, right: 0,
        textAlign: "center",
        fontFamily: interFamily,
        color: "#1e293b",
        fontSize: 13,
        letterSpacing: "0.15em",
        opacity: interpolate(frame, [WORDS.length * WORD_RATE + START_IN, WORDS.length * WORD_RATE + START_IN + 20], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        }) * globalOp,
      }}>
        NOKIA 2007 — 2013
      </div>
    </AbsoluteFill>
  );
};
