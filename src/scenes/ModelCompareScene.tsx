import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const TITLE_IN    = 0;
const NOKIA_IN    = 22;
const NOKIA_STAG  = 5;   // fast stagger
const APPLE_IN    = 80;
const APPLE_STAG  = 35;  // slow stagger
const BARS_IN     = 480;
const BARS_END    = 580;
const TEXT_IN     = 600;
const FADE        = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

const NOKIA_COUNT = 39;
const APPLE_COUNT = 4;
const NOKIA_COLS  = 8;
const NOKIA_RECT_W = 42;
const NOKIA_RECT_H = 56;
const NOKIA_GAP    = 7;

const APPLE_RECT_W = 88;
const APPLE_RECT_H = 120;
const APPLE_GAP    = 18;
const APPLE_COLS   = 2;

const NOKIA_AREA_X = 80;
const NOKIA_AREA_Y = 130;
const APPLE_AREA_X = 840;
const APPLE_AREA_Y = 150;

const BAR_MAX_W = 280;
const BAR_Y = 580;

export const ModelCompareScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const textOp  = useFade(TEXT_IN);

  const nokiaVisible = Math.min(
    NOKIA_COUNT,
    Math.max(0, Math.floor((frame - NOKIA_IN) / NOKIA_STAG) + 1)
  );

  // Nokia share bar: 40% → 23% (shrinks)
  const nokiaBarW = interpolate(frame, [BARS_IN, BARS_END],
    [BAR_MAX_W, BAR_MAX_W * (23 / 40)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
  // Apple share bar: 0% → 15% (grows)
  const appleBarW = interpolate(frame, [BARS_IN, BARS_END],
    [0, BAR_MAX_W * (15 / 40)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        2007–2010: 39 modelos vs 4 — volumen no resolvía el problema de fondo
      </div>

      {/* ── LEFT: Nokia label ── */}
      <div style={{ position: "absolute", left: NOKIA_AREA_X, top: 95, fontFamily: interFamily, color: "#8b5cf6", fontSize: 16, fontWeight: 700, opacity: useFade(NOKIA_IN) }}>
        Nokia 2007–2010
      </div>

      {/* ── Nokia grid ── */}
      {Array.from({ length: NOKIA_COUNT }, (_, i) => {
        const col = i % NOKIA_COLS;
        const row = Math.floor(i / NOKIA_COLS);
        const x = NOKIA_AREA_X + col * (NOKIA_RECT_W + NOKIA_GAP);
        const y = NOKIA_AREA_Y + row * (NOKIA_RECT_H + NOKIA_GAP);
        const startF = NOKIA_IN + i * NOKIA_STAG;
        const op = interpolate(frame, [startF, startF + 8], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            width: NOKIA_RECT_W, height: NOKIA_RECT_H,
            backgroundColor: "#334155",
            border: "1.5px solid #475569",
            borderRadius: 4, opacity: op,
          }} />
        );
      })}

      {/* Nokia counter */}
      <div style={{
        position: "absolute",
        left: NOKIA_AREA_X,
        top: NOKIA_AREA_Y + Math.ceil(NOKIA_COUNT / NOKIA_COLS) * (NOKIA_RECT_H + NOKIA_GAP) + 8,
        fontFamily: interFamily, color: "#8b5cf6",
        fontSize: 22, fontWeight: 800,
        opacity: useFade(NOKIA_IN),
      }}>
        {nokiaVisible} modelos
      </div>

      {/* ── CENTER divider ── */}
      <div style={{
        position: "absolute", left: 700, top: 90, bottom: 50,
        width: 1, backgroundColor: "#1e293b",
        opacity: useFade(APPLE_IN),
      }} />
      <div style={{
        position: "absolute", left: 640, top: "50%",
        fontFamily: interFamily, color: "#334155",
        fontSize: 28, fontWeight: 900,
        opacity: useFade(APPLE_IN),
      }}>
        VS
      </div>

      {/* ── RIGHT: Apple label ── */}
      <div style={{ position: "absolute", left: APPLE_AREA_X, top: 95, fontFamily: interFamily, color: "#00d4ff", fontSize: 16, fontWeight: 700, opacity: useFade(APPLE_IN) }}>
        Apple 2007–2010
      </div>

      {/* ── Apple grid ── */}
      {Array.from({ length: APPLE_COUNT }, (_, i) => {
        const col = i % APPLE_COLS;
        const row = Math.floor(i / APPLE_COLS);
        const x = APPLE_AREA_X + col * (APPLE_RECT_W + APPLE_GAP);
        const y = APPLE_AREA_Y + row * (APPLE_RECT_H + APPLE_GAP);
        const startF = APPLE_IN + i * APPLE_STAG;
        const op = interpolate(frame, [startF, startF + 16], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            width: APPLE_RECT_W, height: APPLE_RECT_H,
            backgroundColor: "#00d4ff0e",
            border: "2px solid #00d4ff",
            borderRadius: 8, opacity: op,
          }} />
        );
      })}

      {/* Apple counter */}
      <div style={{
        position: "absolute",
        left: APPLE_AREA_X,
        top: APPLE_AREA_Y + Math.ceil(APPLE_COUNT / APPLE_COLS) * (APPLE_RECT_H + APPLE_GAP) + 8,
        fontFamily: interFamily, color: "#00d4ff",
        fontSize: 22, fontWeight: 800,
        opacity: useFade(APPLE_IN + APPLE_COUNT * APPLE_STAG),
      }}>
        4 modelos
      </div>

      {/* ── Market share bars ── */}
      <div style={{ position: "absolute", left: NOKIA_AREA_X, top: BAR_Y, opacity: useFade(BARS_IN - 8) }}>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>Market share Nokia</div>
        <div style={{ width: nokiaBarW, height: 14, backgroundColor: "#ef4444", borderRadius: 3 }} />
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 13, fontWeight: 700, marginTop: 4 }}>40% → 23%</div>
      </div>
      <div style={{ position: "absolute", left: APPLE_AREA_X, top: BAR_Y, opacity: useFade(BARS_IN) }}>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>Market share Apple</div>
        <div style={{ width: appleBarW, height: 14, backgroundColor: "#00d4ff", borderRadius: 3 }} />
        <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 700, marginTop: 4 }}>0% → 15%</div>
      </div>

      {/* Conclusion */}
      <div style={{
        position: "absolute", bottom: 18, left: 80, right: 80,
        textAlign: "center", fontFamily: interFamily,
        fontSize: 17, opacity: textOp, lineHeight: 1.5,
      }}>
        <span style={{ color: "#ef4444", fontWeight: 700 }}>39 modelos. Ninguno resolvía el problema de fondo:</span>
        {" "}
        <span style={{ color: "#94a3b8" }}>Symbian era intrínsecamente más costoso de desarrollar que iOS o Android.</span>
      </div>
    </AbsoluteFill>
  );
};
