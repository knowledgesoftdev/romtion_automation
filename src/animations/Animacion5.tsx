import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ─── layout ──────────────────────────────────────────────────────────────────
const ICON_W      = 34;
const ICON_H      = 50;
const ICON_GAP    = 8;
const NOKIA_COLS  = 7;

const NOKIA_GRID_LEFT = 175;
const NOKIA_GRID_TOP  = 148;

const APPLE_ICON_W  = 78;
const APPLE_ICON_H  = 112;
const APPLE_ICON_GAP = 14;
const APPLE_GRID_LEFT = 875;
const APPLE_GRID_TOP  = 180;

const BAR_Y      = 548;
const BAR_H_PX   = 16;
const BAR_MAX_W  = 280;  // same scale for both

// ─── timing ──────────────────────────────────────────────────────────────────
const TITLE_IN           = 0;
const COL_TITLES_IN      = 15;
const NOKIA_ICONS_START  = 28;
const NOKIA_STAGGER      = 4;
const APPLE_ICONS_START  = 38;
const APPLE_STAGGER      = 14;
const BAR_ANIM_START     = 190;
const BAR_ANIM_END       = 228;
const FADE               = 12;

function nokiaIconPos(i: number) {
  return {
    x: NOKIA_GRID_LEFT + (i % NOKIA_COLS) * (ICON_W + ICON_GAP),
    y: NOKIA_GRID_TOP  + Math.floor(i / NOKIA_COLS) * (ICON_H + ICON_GAP),
  };
}

function appleIconPos(i: number) {
  return {
    x: APPLE_GRID_LEFT + (i % 2) * (APPLE_ICON_W + APPLE_ICON_GAP),
    y: APPLE_GRID_TOP  + Math.floor(i / 2) * (APPLE_ICON_H + APPLE_ICON_GAP),
  };
}

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── main ─────────────────────────────────────────────────────────────────────
export const Animacion5: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp      = useFade(TITLE_IN);
  const colTitlesOp  = useFade(COL_TITLES_IN);
  const counterOp    = useFade(NOKIA_ICONS_START);
  const appleCountOp = useFade(APPLE_ICONS_START + 3 * APPLE_STAGGER);
  const barOp        = useFade(BAR_ANIM_START - 8);

  const nokiaVisible = Math.min(39, Math.max(0,
    Math.floor((frame - NOKIA_ICONS_START) / NOKIA_STAGGER) + 1
  ));

  // Nokia bar: 40% → 23% (shrinks)
  const nokiaBarW = interpolate(frame, [BAR_ANIM_START, BAR_ANIM_END],
    [BAR_MAX_W, BAR_MAX_W * (23 / 40)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Apple bar: 0% → 15% (grows), same px scale as Nokia (BAR_MAX_W = 40%)
  const appleBarW = interpolate(frame, [BAR_ANIM_START, BAR_ANIM_END],
    [0, BAR_MAX_W * (15 / 40)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 44, left: 0, right: 0, textAlign: "center", fontFamily: interFamily, color: "#e2e8f0", fontSize: 23, fontWeight: "bold", opacity: titleOp }}>
        Volumen de hardware no compensa déficit de ecosistema.
      </div>

      {/* Center divider */}
      <div style={{ position: "absolute", left: 640, top: 100, bottom: 60, width: 1, backgroundColor: "#1e293b", opacity: colTitlesOp }} />

      {/* ── LEFT: Nokia ── */}
      <div style={{ position: "absolute", left: NOKIA_GRID_LEFT, top: 96, fontFamily: interFamily, color: "#8b5cf6", fontSize: 20, fontWeight: 700, opacity: colTitlesOp }}>
        Nokia 2007–2010
      </div>

      {/* Nokia icon grid */}
      {Array.from({ length: 39 }, (_, i) => {
        const { x, y } = nokiaIconPos(i);
        const startF = NOKIA_ICONS_START + i * NOKIA_STAGGER;
        const op = i < nokiaVisible
          ? interpolate(frame, [startF, startF + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 0;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: ICON_W, height: ICON_H, backgroundColor: "#334155", border: "1.5px solid #475569", borderRadius: 4, opacity: op }} />
        );
      })}

      {/* Nokia counter */}
      <div style={{ position: "absolute", left: NOKIA_GRID_LEFT, top: NOKIA_GRID_TOP + 6 * (ICON_H + ICON_GAP), fontFamily: interFamily, color: "#8b5cf6", fontSize: 21, fontWeight: 700, opacity: counterOp }}>
        {nokiaVisible} modelos
      </div>

      {/* Nokia market share bar */}
      <div style={{ position: "absolute", left: NOKIA_GRID_LEFT, top: BAR_Y, opacity: barOp }}>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>Market share Nokia</div>
        <div style={{ width: nokiaBarW, height: BAR_H_PX, backgroundColor: "#ef4444", borderRadius: 3 }} />
        <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 13, fontWeight: 700, marginTop: 5 }}>40% → 23%</div>
      </div>

      {/* ── RIGHT: Apple ── */}
      <div style={{ position: "absolute", left: APPLE_GRID_LEFT, top: 96, fontFamily: interFamily, color: "#00d4ff", fontSize: 20, fontWeight: 700, opacity: colTitlesOp }}>
        Apple 2007–2010
      </div>

      {/* Apple icon grid */}
      {Array.from({ length: 4 }, (_, i) => {
        const { x, y } = appleIconPos(i);
        const startF = APPLE_ICONS_START + i * APPLE_STAGGER;
        const op = interpolate(frame, [startF, startF + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: APPLE_ICON_W, height: APPLE_ICON_H, backgroundColor: "#00d4ff14", border: "2px solid #00d4ff", borderRadius: 8, opacity: op }} />
        );
      })}

      {/* Apple counter */}
      <div style={{ position: "absolute", left: APPLE_GRID_LEFT, top: APPLE_GRID_TOP + 2 * (APPLE_ICON_H + APPLE_ICON_GAP), fontFamily: interFamily, color: "#00d4ff", fontSize: 21, fontWeight: 700, opacity: appleCountOp }}>
        4 modelos
      </div>

      {/* Apple market share bar */}
      <div style={{ position: "absolute", left: APPLE_GRID_LEFT, top: BAR_Y, opacity: barOp }}>
        <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>Market share Apple</div>
        <div style={{ width: appleBarW, height: BAR_H_PX, backgroundColor: "#00d4ff", borderRadius: 3 }} />
        <div style={{ fontFamily: interFamily, color: "#00d4ff", fontSize: 13, fontWeight: 700, marginTop: 5 }}>0% → 15%</div>
      </div>
    </AbsoluteFill>
  );
};
