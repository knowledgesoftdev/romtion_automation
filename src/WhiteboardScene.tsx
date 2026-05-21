/**
 * src/WhiteboardScene.tsx
 *
 * v3 — Constellation engine multi-element estilo "explainer board".
 *
 * Cada escena renderiza:
 *   - Chapter title arriba (constante por chapter)
 *   - 4-7 elementos distribuidos en 7 slots, cada uno con entrada spring
 *     disparada por la palabra exacta del audio (wordTimings)
 *   - Flechas curvas dashed conectando elementos relacionados
 *   - Karaoke grande al pie con la palabra activa resaltada en amarillo
 *
 * Tipos de elemento:
 *   pexels_image | icon (Iconify Flat Color Icons) | logo (simple-icons) |
 *   label_red    | label_black | motion_graphic (donut/contador/flecha/timeline)
 */

import React from "react";
import {
  AbsoluteFill, Img, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { Icon } from "@iconify/react";
import * as simpleIcons from "simple-icons";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadKalam } from "@remotion/google-fonts/Kalam";
import { loadFont as loadFiraCode } from "@remotion/google-fonts/FiraCode";
import { FCI_ICONS } from "./iconLookup";

const { fontFamily: INTER } = loadInter();
const { fontFamily: KALAM } = loadKalam();
const { fontFamily: FIRA } = loadFiraCode();

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface WordTiming {
  palabra:   string;
  inicio:    number;
  fin:       number;
  escena_id: number | string;
}

export type ElementSlot =
  | "top-left" | "top-right"
  | "mid-left" | "center" | "mid-right"
  | "bottom-left" | "bottom-right";

export type ElementSize = "sm" | "md" | "lg" | "xl";

export interface BaseElement {
  id:           string;
  type:         string;
  slot:         ElementSlot;
  size:         ElementSize;
  trigger_word: string;
}

export interface PexelsImageElement extends BaseElement {
  type:  "pexels_image";
  query: string;
}
export interface IconElement extends BaseElement {
  type:      "icon";
  icon_name: string;
}
export interface LogoElement extends BaseElement {
  type: "logo";
  name: string;
}
export interface LabelElement extends BaseElement {
  type: "label_red" | "label_black";
  text: string;
}
export interface MotionGraphicElement extends BaseElement {
  type:    "motion_graphic";
  graphic: string;
  value:   string;
}

export type VisualElement =
  | PexelsImageElement | IconElement | LogoElement
  | LabelElement | MotionGraphicElement;

export interface ArrowConnection {
  from:  string;
  to:    string;
  style: "dashed_curve" | "dashed_straight" | "solid";
}

export interface WhiteboardSceneProps {
  texto:          string;
  chapterTitle:   string;
  colorMood:      string;
  elements:       VisualElement[];
  arrows:         ArrowConnection[];
  projectId:      string;
  channelId?:     string;
  sceneId:        string;            // ej. "01"
  startFrame:     number;
  durationFrames: number;
  fps:            number;
  wordTimings:    WordTiming[];
  escenaId:       number | string;
}

// ── Paleta ─────────────────────────────────────────────────────────────────────
const MOOD_ACCENT: Record<string, string> = {
  neutro:    "#0f172a",
  urgente:   "#dc2626",
  positivo:  "#16a34a",
  nostalgia: "#2563eb",
};

// ── Slot → coordenadas (canvas 1280x720) ───────────────────────────────────────
const TITLE_BAND_HEIGHT = 90;

const SLOT_COORDS: Record<ElementSlot, { x: number; y: number }> = {
  "top-left":     { x: 270,  y: 220 },
  "top-right":    { x: 1010, y: 220 },
  "mid-left":     { x: 240,  y: 410 },
  "center":       { x: 640,  y: 410 },
  "mid-right":    { x: 1040, y: 410 },
  "bottom-left":  { x: 290,  y: 600 },
  "bottom-right": { x: 990,  y: 600 },
};

const SIZE_PX: Record<ElementSize, number> = {
  sm: 130,
  md: 200,
  lg: 280,
  xl: 360,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseNum(raw: string): number {
  if (!raw) return 0;
  const m = raw.replace(/[^0-9.,-]/g, "").replace(",", ".").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function getSpringConfig(type: string) {
  switch (type) {
    case "icon":
    case "logo":
      return { mass: 0.45, damping: 9, stiffness: 170 }; // Playful bouncy "pop"
    case "pexels_image":
      return { mass: 1.3, damping: 21, stiffness: 85 }; // Heavy, smooth, elegant slide
    case "label_red":
    case "label_black":
      return { mass: 0.8, damping: 14, stiffness: 125 }; // Balanced, neat whiteboard writing speed
    case "motion_graphic":
      return { mass: 0.75, damping: 12, stiffness: 135 }; // Crisp and energetic
    default:
      return { mass: 1, damping: 15, stiffness: 100 };
  }
}


// Tamaño efectivo del bounding box según tipo (limita iconos/logos para que no dominen).
function effectiveSize(el: VisualElement): number {
  const base = SIZE_PX[el.size] || SIZE_PX.md;
  switch (el.type) {
    case "icon":          return Math.min(base, 160);
    case "logo":          return Math.min(base, 180);
    case "pexels_image":  return Math.min(base, 280);
    case "motion_graphic":return Math.min(base, 220);
    case "label_red":
    case "label_black":   return base;
    default:              return base;
  }
}

// Max width disponible para cada slot, considerando vecinos y bordes del canvas.
// Cuando center está ocupado, mid-left y mid-right se aprietan para no colisionar.
const SLOT_MAX_WIDTH_NO_CENTER: Record<ElementSlot, number> = {
  "top-left":     440,
  "top-right":    440,
  "mid-left":     400,
  "center":       480,
  "mid-right":    400,
  "bottom-left":  440,
  "bottom-right": 440,
};

const SLOT_MAX_WIDTH_WITH_CENTER: Record<ElementSlot, number> = {
  "top-left":     440,
  "top-right":    440,
  "mid-left":     260,
  "center":       480,
  "mid-right":    260,
  "bottom-left":  440,
  "bottom-right": 440,
};

function computeSlotMaxWidths(elements: VisualElement[]): Record<ElementSlot, number> {
  const used = new Set(elements.map(e => e.slot));
  return used.has("center") ? SLOT_MAX_WIDTH_WITH_CENTER : SLOT_MAX_WIDTH_NO_CENTER;
}

// Auto-shrink fontSize para labels: target = min(sizePx*1.6, slotMaxWidth), single line.
function labelFontSize(text: string, sizePx: number, isRed: boolean, slotMaxWidth: number): number {
  const maxFont = isRed ? sizePx * 0.36 : sizePx * 0.22;
  const minFont = isRed ? 28             : 16;
  const charsPerEm = 0.56;
  const targetWidth = Math.min(sizePx * 1.6, slotMaxWidth);
  const computed = targetWidth / (charsPerEm * Math.max(text.length, 3));
  return Math.max(minFont, Math.min(maxFont, computed));
}

// Half-dimensiones del bounding box de un elemento. Labels son flat-rectangles.
function elementHalfDims(el: VisualElement, slotMaxWidth: number): { hw: number; hh: number } {
  const sizePx = effectiveSize(el);
  switch (el.type) {
    case "label_red":
    case "label_black": {
      const isRed = el.type === "label_red";
      const fontSize = labelFontSize(el.text, sizePx, isRed, slotMaxWidth);
      const textWidth = el.text.length * fontSize * 0.56;
      const textHeight = fontSize * 1.15;
      return { hw: textWidth / 2 + 14, hh: textHeight / 2 + 10 };
    }
    case "icon":
    case "logo":
      return { hw: sizePx * 0.42, hh: sizePx * 0.42 };
    case "pexels_image":
      return { hw: sizePx * 0.5, hh: sizePx * 0.5 * 0.7 + 5 };
    case "motion_graphic":
      return { hw: sizePx * 0.45, hh: sizePx * 0.45 };
    default:
      return { hw: sizePx / 2, hh: sizePx / 2 };
  }
}

// Radio efectivo de una bounding rect en la dirección (ux, uy) — i.e. hasta dónde
// llega el borde del rectángulo desde su centro a lo largo del vector dirección.
function rectRadius(hw: number, hh: number, ux: number, uy: number): number {
  const ax = Math.abs(ux);
  const ay = Math.abs(uy);
  if (ax < 0.001) return hh;
  if (ay < 0.001) return hw;
  return Math.min(hw / ax, hh / ay);
}

// Acorta un segmento desde from-to usando los rect-bounding boxes de cada elemento
// en la dirección de la flecha. Devuelve null si segmento resultante < 50px.
function shortenArrow(
  from: { x: number; y: number },
  to:   { x: number; y: number },
  fromDims: { hw: number; hh: number },
  toDims:   { hw: number; hh: number }
): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const fromR = rectRadius(fromDims.hw, fromDims.hh, ux, uy) + 14;
  const toR   = rectRadius(toDims.hw,   toDims.hh,   ux, uy) + 14;
  const remaining = len - fromR - toR;
  if (remaining < 50) return null;   // arrow muy corto, no se ve
  return {
    from: { x: from.x + ux * fromR, y: from.y + uy * fromR },
    to:   { x: to.x   - ux * toR,   y: to.y   - uy * toR   },
  };
}

// Encuentra el primer segundo donde se pronuncia trigger_word dentro de sceneWords.
// Devuelve null si no se encuentra.
function findTriggerSec(
  triggerWord: string,
  sceneWords: WordTiming[]
): number | null {
  if (!triggerWord || !sceneWords.length) return null;
  const target = normalizeWord(triggerWord);
  if (!target) return null;

  // Diccionario de equivalencias fonéticas e inteligentes para Whisper en español
  const equivalents: Record<string, string[]> = {
    "xml": ["eksml", "exml", "xml"],
    "cpu": ["pu", "pego", "cpu"],
    "transformation": ["transformacion", "transformations"],
    "ellis": ["elis"],
    "gibbs": ["yips"],
    "10": ["diez", "10"],
    "diez": ["10", "diez"],
    "20": ["veinte", "20"],
    "veinte": ["20", "veinte"],
    "30": ["treinta", "30"],
    "50": ["cincuenta", "50"],
    "cincuenta": ["50", "cincuenta"],
    "500ms": ["500", "500ms"],
    "800ms": ["800", "800ms"],
    "gmail": ["jamal", "gmail"],
    "21mb": ["uno", "omega", "omegas", "dos", "21mb"],
    "ttfmr": ["ttf", "mr", "ttfmr"],
    "xmpp": ["xmp", "xmpp", "eksml"],
    "parsearse": ["parcearse", "parsearse"],
    "parchear": ["parchar", "parchear"],
    "overhead": ["overjet", "overhead"],
    "docs": ["dogs", "docs"],
    "anidada": ["formanidad", "anidada"],
    "threads": ["trets", "tretsanidados", "threads"]
  };

  const candidates = [target];
  if (equivalents[target]) {
    candidates.push(...equivalents[target]);
  }

  for (const w of sceneWords) {
    const n = normalizeWord(w.palabra);
    for (const cand of candidates) {
      if (n === cand) return w.inicio;
      if (cand.length > 3 && n.includes(cand)) return w.inicio;
      if (n.length > 3 && cand.includes(n)) return w.inicio;
    }
  }

  for (const w of sceneWords) {
    const n = normalizeWord(w.palabra);
    for (const cand of candidates) {
      if (cand.length > 4 && (cand.includes(n) || n.includes(cand))) {
        return w.inicio;
      }
    }
  }

  return null;
}

// ── Motion graphics ────────────────────────────────────────────────────────────
const ContadorGraphic: React.FC<{ valor: string; color: string; frame: number; sizePx: number }> =
({ valor, color, frame, sizePx }) => {
  const target = parseNum(valor) || 100;
  const progress = interpolate(frame, [0, 32], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const current = Math.round(target * progress);
  const suffix = valor.includes("%") ? "%" : valor.replace(/[\d.,\s]/g, "").trim();
  return (
    <div style={{
      fontFamily: INTER,
      fontSize: sizePx * 0.38,
      fontWeight: 900,
      color,
      letterSpacing: "-0.025em",
      lineHeight: 1,
    }}>
      {current}{suffix}
    </div>
  );
};

const FlechaGraphic: React.FC<{ direccion: "up" | "down"; valor: string; frame: number; fps: number; sizePx: number }> =
({ direccion, valor, frame, fps, sizePx }) => {
  const color = direccion === "up" ? "#16a34a" : "#dc2626";
  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 130 } });
  const bounce = Math.sin(frame / 7) * 4;
  const arrowSize = sizePx * 0.55;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      transform: `scale(${appear}) translateY(${bounce}px)`, opacity: appear,
    }}>
      <svg width={arrowSize} height={arrowSize} viewBox="0 0 92 92">
        {direccion === "up" ? (
          <path d="M46 12 L74 52 L56 52 L56 80 L36 80 L36 52 L18 52 Z"
                fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        ) : (
          <path d="M46 80 L74 40 L56 40 L56 12 L36 12 L36 40 L18 40 Z"
                fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
        )}
      </svg>
      {valor && (
        <div style={{ fontFamily: INTER, fontSize: sizePx * 0.16, fontWeight: 800, color }}>
          {valor}
        </div>
      )}
    </div>
  );
};

const DonutGraphic: React.FC<{ valor: string; color: string; frame: number; sizePx: number }> =
({ valor, color, frame, sizePx }) => {
  const target = Math.min(parseNum(valor) || 40, 100);
  const R = sizePx * 0.36;
  const circum = 2 * Math.PI * R;
  const progress = interpolate(frame, [0, 38], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dashOff = circum - (circum * target * progress) / 100;
  const svgSize = sizePx * 0.95;
  const center = svgSize / 2;
  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
      <circle cx={center} cy={center} r={R} fill="none" stroke="#e2e8f0" strokeWidth={R * 0.25} />
      <circle cx={center} cy={center} r={R} fill="none" stroke={color} strokeWidth={R * 0.25}
              strokeDasharray={circum} strokeDashoffset={dashOff}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`} />
      <text x={center} y={center + sizePx * 0.05} textAnchor="middle"
            style={{ fontFamily: INTER, fontSize: sizePx * 0.20, fill: "#0f172a", fontWeight: 900 }}>
        {Math.round(target * progress)}%
      </text>
    </svg>
  );
};

const TimelineBarrasGraphic: React.FC<{ valor: string; color: string; frame: number; sizePx: number }> =
({ valor, color, frame, sizePx }) => {
  const items = valor
    ? valor.split(/[,\s/|]+/).map(s => s.trim()).filter(Boolean).slice(0, 4)
    : ["A", "B", "C"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: sizePx }}>
      {items.map((label, i) => {
        const p = interpolate(frame, [i * 6, i * 6 + 18], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              fontFamily: INTER, fontSize: sizePx * 0.08, fontWeight: 700,
              color: "#1e293b", width: sizePx * 0.30, textAlign: "right", flexShrink: 0,
            }}>{label}</div>
            <div style={{ flex: 1, height: sizePx * 0.08, background: "#f1f5f9", borderRadius: 99 }}>
              <div style={{
                height: "100%", width: `${p * (50 + i * 12)}%`,
                background: color, borderRadius: 99,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Bordes Estilo Boceto a Mano (Sketchy Borders) para Etiquetas ──────────────
const SketchyBorder: React.FC<{
  width: number;
  height: number;
  color: string;
  appear: number;
}> = ({ width, height, color, appear }) => {
  const draw = interpolate(appear, [0.3, 0.95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const w = width;
  const h = height;
  
  // Trazados imperfectos cerrados con ligeras perturbaciones
  const p1 = `M 6,6 L ${w - 5},8 L ${w - 7},${h - 6} L 7,${h - 8} Z`;
  const p2 = `M 8,5 L ${w - 8},6 L ${w - 5},${h - 7} L 5,${h - 5}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <path
        d={p1}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - draw * 100}
      />
      <path
        d={p2}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.65}
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - draw * 100}
      />
    </svg>
  );
};

const SketchyUnderline: React.FC<{
  width: number;
  color: string;
  appear: number;
}> = ({ width, color, appear }) => {
  const draw = interpolate(appear, [0.4, 0.98], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subrayado ondulado imperfecto de pizarra (boceto a mano)
  const p = `M 2,3 C ${width * 0.25},1 ${width * 0.4},5 ${width * 0.75},2 C ${width * 0.9},0.5 ${width * 0.95},4 ${width - 2},3`;

  return (
    <svg
      width={width}
      height={8}
      viewBox={`0 0 ${width} 8`}
      style={{
        position: "absolute",
        bottom: -5,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <path
        d={p}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={100 - draw * 100}
      />
    </svg>
  );
};

// ── Renderer por tipo de elemento ──────────────────────────────────────────────
const RenderElement: React.FC<{
  el:            VisualElement;
  projectId:     string;
  channelId?:    string;
  sceneId:       string;
  sizePx:        number;
  frame:         number;
  fps:           number;
  appear:        number;
  accentColor:   string;
  slotMaxWidth:  number;
}> = ({ el, projectId, channelId, sceneId, sizePx, frame, fps, appear, accentColor, slotMaxWidth }) => {
  const [imgError, setImgError] = React.useState(false);

  switch (el.type) {
    case "pexels_image": {
      const projectPath = channelId ? `${channelId}/${projectId}` : projectId;
      const src = staticFile(`projects/${projectPath}/images/parrafo-${sceneId}-${el.id}.jpg`);
      if (imgError) {
        return (
          <div style={{
            width: sizePx, height: sizePx * 0.75,
            background: "#f8fafc", border: "2.5px dashed #cbd5e1",
            borderRadius: 12, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 28 }}>🖼️</div>
            <div style={{
              fontFamily: INTER, fontSize: 11, color: "#64748b",
              marginTop: 6, padding: "0 10px", textAlign: "center", fontWeight: 600,
            }}>{el.query}</div>
          </div>
        );
      }
      return (
        <div style={{
          background: "#ffffff",
          padding: "10px 10px 24px 10px",
          boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
          border: "2px solid #0f172a",
          borderRadius: 2,
          transform: `rotate(${el.id.charCodeAt(0) % 2 === 0 ? -1.5 : 1.5}deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          <Img
            src={src}
            onError={() => setImgError(true)}
            style={{
              width: sizePx - 20,
              height: (sizePx - 20) * 0.72,
              objectFit: "cover",
              border: "1.5px solid #0f172a",
            }}
          />
          <div style={{
            fontFamily: KALAM,
            fontSize: Math.max(12, sizePx * 0.08),
            color: "#0f172a",
            fontWeight: 700,
            marginTop: 10,
            lineHeight: 1,
          }}>
            {el.query}
          </div>
        </div>
      );
    }

    case "icon": {
      const iconData = FCI_ICONS[el.icon_name];
      const innerIcon = iconData ? (
        <Icon icon={iconData} width={sizePx * 0.52} height={sizePx * 0.52} />
      ) : (
        <Icon icon={el.icon_name} width={sizePx * 0.52} height={sizePx * 0.52} />
      );

      return (
        <div style={{
          width: sizePx * 0.72,
          height: sizePx * 0.72,
          background: "rgba(255, 255, 255, 0.95)",
          border: "2.5px solid #0f172a",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 25px rgba(15,23,42,0.1)",
          transform: `rotate(${el.id.charCodeAt(0) % 2 === 0 ? -3 : 3}deg)`,
          clipPath: "polygon(4% 2%, 97% 4%, 95% 97%, 2% 95%)",
        }}>
          {innerIcon}
        </div>
      );
    }

    case "logo": {
      const slug = el.name.replace(/[^a-z0-9]/gi, "");
      const key = "si" + slug.charAt(0).toUpperCase() + slug.slice(1);
      const icon = (simpleIcons as Record<string, { svg: string; hex: string; title: string }>)[key];
      
      const innerLogo = icon ? (
        <div
          style={{
            width: sizePx * 0.45, height: sizePx * 0.45,
            color: "#" + icon.hex,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          dangerouslySetInnerHTML={{
            __html: icon.svg.replace(
              "<svg ",
              `<svg width="100%" height="100%" fill="currentColor" `
            ),
          }}
        />
      ) : (
        <div style={{
          fontFamily: FIRA, fontSize: sizePx * 0.12, fontWeight: 800,
          color: "#0f172a", textAlign: "center",
        }}>
          {el.name.toUpperCase()}
        </div>
      );

      return (
        <div style={{
          width: sizePx * 0.72,
          height: sizePx * 0.72,
          background: "rgba(255, 255, 255, 0.95)",
          border: "2.5px solid #0f172a",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 25px rgba(15,23,42,0.1)",
          transform: `rotate(${el.id.charCodeAt(0) % 2 === 0 ? 3 : -3}deg)`,
          clipPath: "polygon(3% 5%, 96% 2%, 98% 95%, 4% 97%)",
        }}>
          {innerLogo}
        </div>
      );
    }

    case "label_red": {
      const fontSize = labelFontSize(el.text, sizePx, true, slotMaxWidth);
      const isHero = el.size === "xl" || el.size === "lg";

      if (isHero) {
        return (
          <div style={{
            fontFamily:    KALAM,
            fontSize:      fontSize * 1.15,
            fontWeight:    900,
            color:         "#dc2626",
            letterSpacing: "-0.01em",
            lineHeight:    1,
            textAlign:     "center",
            whiteSpace:    "nowrap",
          }}>
            {el.text}
          </div>
        );
      }

      // Caja con SketchyBorder
      const textWidth = el.text.length * fontSize * 0.58;
      const textHeight = fontSize * 1.2;
      const paddingX = 18;
      const paddingY = 8;
      const width = textWidth + paddingX * 2;
      const height = textHeight + paddingY * 2;

      return (
        <div style={{
          position:       "relative",
          width,
          height,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     "#fee2e2",
          clipPath:       "polygon(2% 4%, 97% 1%, 99% 95%, 1% 98%)",
        }}>
          <SketchyBorder width={width} height={height} color="#dc2626" appear={appear} />
          <div style={{
            fontFamily:    KALAM,
            fontSize:      fontSize * 1.1,
            fontWeight:    800,
            color:         "#dc2626",
            letterSpacing: "-0.01em",
            lineHeight:    1,
            textAlign:     "center",
            whiteSpace:    "nowrap",
            zIndex:        1,
          }}>
            {el.text}
          </div>
        </div>
      );
    }

    case "label_black": {
      const fontSize = labelFontSize(el.text, sizePx, false, slotMaxWidth);
      const textWidth = el.text.length * fontSize * 0.58;

      return (
        <div style={{
          position:      "relative",
          display:       "inline-block",
        }}>
          <div style={{
            fontFamily:    KALAM,
            fontSize:      fontSize * 1.1,
            fontWeight:    700,
            color:         "#0f172a",
            letterSpacing: "-0.01em",
            textAlign:     "center",
            lineHeight:    1.1,
            whiteSpace:    "nowrap",
          }}>
            {el.text}
          </div>
          <SketchyUnderline width={textWidth} color="#0f172a" appear={appear} />
        </div>
      );
    }

    case "motion_graphic": {
      switch (el.graphic) {
        case "contador_porcentaje":
          return <ContadorGraphic valor={el.value} color={accentColor} frame={frame} sizePx={sizePx} />;
        case "flecha_subiendo":
          return <FlechaGraphic direccion="up" valor={el.value} frame={frame} fps={fps} sizePx={sizePx} />;
        case "flecha_bajando":
          return <FlechaGraphic direccion="down" valor={el.value} frame={frame} fps={fps} sizePx={sizePx} />;
        case "donut_chart":
          return <DonutGraphic valor={el.value} color={accentColor} frame={frame} sizePx={sizePx} />;
        case "timeline_barras":
          return <TimelineBarrasGraphic valor={el.value} color={accentColor} frame={frame} sizePx={sizePx} />;
        default:
          return null;
      }
    }

    default:
      return null;
  }
};

// ── Flecha curva entre 2 slots ─────────────────────────────────────────────────
const ConnectorArrow: React.FC<{
  from:  { x: number; y: number };
  to:    { x: number; y: number };
  style: ArrowConnection["style"];
  frame: number;
  fireFrame: number;
}> = ({ from, to, style, frame, fireFrame }) => {
  if (frame < fireFrame) return null;

  const draw = interpolate(frame, [fireFrame, fireFrame + 22], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;

  let d: string;
  let d2: string;
  if (style === "dashed_curve") {
    const offset = Math.min(80, len * 0.25);
    const cx = mx + (-dy / len) * offset;
    const cy = my + ( dx / len) * offset;
    d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
    
    // Sketchy offset paths with sinuous waviness
    const cx2 = cx + Math.sin(len) * 3 + 1.5;
    const cy2 = cy + Math.cos(len) * 3 - 1.5;
    d2 = `M ${from.x + 1} ${from.y - 1} Q ${cx2} ${cy2} ${to.x - 1} ${to.y + 1}`;
  } else {
    d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    
    // Sketchy double stroke for straight arrows: a wavy offset path
    const mx_p = mx + (-dy / len) * 2;
    const my_p = my + ( dx / len) * 2;
    d2 = `M ${from.x + 1.5} ${from.y - 1} Q ${mx_p} ${my_p} ${to.x - 1.5} ${to.y + 1}`;
  }

  // Arrowhead pointing to the final direction of the path
  let tangentDx = dx, tangentDy = dy;
  if (style === "dashed_curve") {
    const offset = Math.min(80, len * 0.25);
    const cx = mx + (-dy / len) * offset;
    const cy = my + ( dx / len) * offset;
    tangentDx = to.x - cx;
    tangentDy = to.y - cy;
  }
  const angle = Math.atan2(tangentDy, tangentDx);
  const arrowSize = 16;
  const apex = { x: to.x, y: to.y };
  
  // Hand-drawn asymmetric/imperfect arrowheads
  const base1 = {
    x: to.x - arrowSize * Math.cos(angle - Math.PI / 6.5) + (Math.sin(len) * 1.2),
    y: to.y - arrowSize * Math.sin(angle - Math.PI / 6.5) - (Math.cos(len) * 1.2),
  };
  const base2 = {
    x: to.x - (arrowSize - 2) * Math.cos(angle + Math.PI / 6.0) - (Math.sin(len) * 1.0),
    y: to.y - (arrowSize - 2) * Math.sin(angle + Math.PI / 6.0) + (Math.cos(len) * 1.0),
  };

  const headOpacity = interpolate(draw, [0.6, 1], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const maskId = `mask-${fireFrame}-${Math.round(from.x)}-${Math.round(from.y)}-${Math.round(to.x)}-${Math.round(to.y)}`;

  return (
    <svg
      width={1280} height={720}
      viewBox="0 0 1280 720"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        <mask id={maskId}>
          <path
            d={d}
            pathLength={100}
            fill="none"
            stroke="#ffffff"
            strokeWidth={15}
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - draw * 100}
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {/* Primary sketchy stroke */}
        <path
          d={d}
          pathLength={100}
          fill="none"
          stroke="#0f172a"
          strokeWidth={3.2}
          strokeDasharray={style === "solid" ? undefined : "4.5 3.5"}
          strokeLinecap="round"
        />
        {/* Secondary sketchy parallel stroke */}
        <path
          d={d2}
          pathLength={100}
          fill="none"
          stroke="#0f172a"
          strokeWidth={1.5}
          strokeDasharray={style === "solid" ? undefined : "4.5 3.5"}
          strokeLinecap="round"
          opacity={0.35}
        />
      </g>
      {/* Arrowhead */}
      <polygon
        points={`${apex.x},${apex.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
        fill="#0f172a"
        opacity={headOpacity}
        style={{ stroke: "#0f172a", strokeWidth: 1.5, strokeLinejoin: "round" }}
      />
    </svg>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────
export const WhiteboardScene: React.FC<WhiteboardSceneProps> = ({
  texto: _texto,
  chapterTitle,
  colorMood,
  elements,
  arrows,
  projectId,
  channelId,
  sceneId,
  startFrame,
  durationFrames,
  fps,
  wordTimings,
  escenaId,
}) => {
  const frame = useCurrentFrame();
  const { fps: configFps } = useVideoConfig();
  const actualFps = configFps || fps;

  const accentColor = MOOD_ACCENT[colorMood] || MOOD_ACCENT.neutro;

  // ── Max widths por slot, considerando si center está usado ────────────────
  const slotMaxWidths = React.useMemo(
    () => computeSlotMaxWidths(elements),
    [elements]
  );

  // ── Dynamic Slot Coordinates for Radial & Grid Adaptations ──
  const dynamicSlotCoords = React.useMemo(() => {
    const coords = { ...SLOT_COORDS };
    const activeSlots = elements.map(e => e.slot);
    const hasCenter = activeSlots.includes("center");

    // Case 1: 6 Elements Layout (Unified 3x2 Grid)
    if (elements.length === 6) {
      if (activeSlots.includes("top-left")) coords["top-left"] = { x: 270, y: 220 };
      if (activeSlots.includes("top-right")) coords["top-right"] = { x: 1010, y: 220 };
      if (activeSlots.includes("center")) coords["center"] = { x: 640, y: 220 }; // Move to top-center
      if (activeSlots.includes("mid-right")) coords["mid-right"] = { x: 1010, y: 520 }; // Move to bottom-right
      if (activeSlots.includes("bottom-left")) coords["bottom-left"] = { x: 270, y: 520 }; // Move to bottom-left
      if (activeSlots.includes("bottom-right")) coords["bottom-right"] = { x: 640, y: 520 }; // Move to bottom-center
    }
    // Case 2: Radial Layout (Center + Orbitals)
    else if (hasCenter && elements.length >= 4) {
      elements.forEach(e => {
        if (e.slot !== "center") {
          const defaultCoord = SLOT_COORDS[e.slot];
          const dx = defaultCoord.x - 640;
          const dy = defaultCoord.y - 410;
          const factor = 0.82; // Pull 18% closer for tight radial diagram feel
          coords[e.slot] = {
            x: 640 + dx * factor,
            y: 410 + dy * factor,
          };
        }
      });
    }
    // Case 3: 5 Elements Layout with Center
    else if (hasCenter && elements.length === 5) {
      elements.forEach(e => {
        if (e.slot !== "center") {
          const defaultCoord = SLOT_COORDS[e.slot];
          const dx = defaultCoord.x - 640;
          const dy = defaultCoord.y - 410;
          const factor = 0.85;
          coords[e.slot] = {
            x: 640 + dx * factor,
            y: 410 + dy * factor,
          };
        }
      });
    }

    return coords;
  }, [elements]);

  // ── Filtrado de wordTimings por escena ────────────────────────────────────
  const sceneWords = React.useMemo(() => {
    if (!wordTimings?.length) return [];
    const targetInt = parseInt(String(escenaId), 10);
    const targetStr = String(escenaId);
    return wordTimings.filter(w => {
      const wIdStr = String(w.escena_id);
      const wIdInt = parseInt(wIdStr, 10);
      return wIdStr === targetStr || wIdInt === targetInt;
    });
  }, [wordTimings, escenaId]);

  // ── Para cada elemento, calculo su frame de aparición ────────────────────
  const elementFireFrames = React.useMemo(() => {
    const sceneStartSec = startFrame / actualFps;
    const sceneEndSec = (startFrame + durationFrames) / actualFps;

    return elements.map((el, idx) => {
      let triggerSec = findTriggerSec(el.trigger_word, sceneWords);

      // Si no se encuentra trigger en wordTimings, fallback proporcional
      if (triggerSec === null) {
        const ratio = elements.length > 0 ? idx / elements.length : 0;
        triggerSec = sceneStartSec + (sceneEndSec - sceneStartSec) * ratio * 0.6;
      }

      // Convertir a frame relativo a la escena
      const sceneRelSec = triggerSec - sceneStartSec;
      return Math.max(4, Math.round(sceneRelSec * actualFps));
    });
  }, [elements, sceneWords, startFrame, durationFrames, actualFps]);

  // ── Fade global ──────────────────────────────────────────────────────────
  const FADE_IN = 8;
  const FADE_OUT = Math.max(durationFrames - 8, durationFrames - 1);
  const globalOpacity = interpolate(
    frame, [0, FADE_IN, FADE_OUT, durationFrames], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Headline: aparece desde frame 0
  const headlineAppear = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{
      backgroundColor: "#f8fafc",
      backgroundImage: `
        radial-gradient(#cbd5e1 1.5px, transparent 1.5px),
        radial-gradient(#cbd5e1 1.5px, transparent 1.5px)
      `,
      backgroundSize: "32px 32px",
      backgroundPosition: "0 0, 16px 16px",
      overflow: "hidden"
    }}>
      <AbsoluteFill style={{ opacity: globalOpacity }}>

        {/* ── Chapter title ─────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          top:      24,
          left:     0,
          right:    0,
          height:   TITLE_BAND_HEIGHT,
          display:  "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity:  headlineAppear,
          transform: `translateY(${(1 - headlineAppear) * -10}px)`,
        }}>
          <div style={{
            fontFamily: INTER,
            fontSize:   54,
            fontWeight: 900,
            color:      "#0f172a",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            position: "relative",
          }}>
            {chapterTitle}
            <div style={{
              position: "absolute",
              bottom: -8,
              left: "10%",
              width: "80%",
              height: 4,
              background: "#0f172a",
              borderRadius: 2,
              opacity: 0.8,
            }} />
          </div>
        </div>

        {/* ── Flechas (con radio rectangular direccional para terminar en el borde del elemento) ── */}
        {arrows.map((arr, i) => {
          const elFrom = elements.find(e => e.id === arr.from);
          const elTo   = elements.find(e => e.id === arr.to);
          if (!elFrom || !elTo) return null;
          const fromCoord = dynamicSlotCoords[elFrom.slot];
          const toCoord   = dynamicSlotCoords[elTo.slot];
          const fromDims  = elementHalfDims(elFrom, slotMaxWidths[elFrom.slot]);
          const toDims    = elementHalfDims(elTo,   slotMaxWidths[elTo.slot]);
          const seg = shortenArrow(fromCoord, toCoord, fromDims, toDims);
          if (!seg) return null;
          const fireFrame = Math.max(
            elementFireFrames[elements.indexOf(elFrom)] || 0,
            elementFireFrames[elements.indexOf(elTo)]   || 0
          ) + 4;
          return (
            <ConnectorArrow
              key={`arrow-${i}`}
              from={seg.from}
              to={seg.to}
              style={arr.style}
              frame={frame}
              fireFrame={fireFrame}
            />
          );
        })}

        {/* ── Automatic Center Connectors for Circular/Radial Layouts ── */}
        {elements.length >= 4 && elements.some(e => e.slot === "center") &&
          elements.filter(e => e.slot !== "center" && !arrows.some(a => a.from === e.id || a.to === e.id)).map((el, i) => {
            const centerEl = elements.find(e => e.slot === "center")!;
            const fromCoord = dynamicSlotCoords[centerEl.slot];
            const toCoord   = dynamicSlotCoords[el.slot];
            const fromDims  = elementHalfDims(centerEl, slotMaxWidths[centerEl.slot]);
            const toDims    = elementHalfDims(el,   slotMaxWidths[el.slot]);
            const seg = shortenArrow(fromCoord, toCoord, fromDims, toDims);
            if (!seg) return null;
            const fireFrame = Math.max(
              elementFireFrames[elements.indexOf(centerEl)] || 0,
              elementFireFrames[elements.indexOf(el)]       || 0
            ) + 4;
            return (
              <ConnectorArrow
                key={`auto-arrow-${i}`}
                from={seg.from}
                to={seg.to}
                style="dashed_straight"
                frame={frame}
                fireFrame={fireFrame}
              />
            );
          })
        }

        {/* ── Elementos posicionados por slot ────────────────────────────── */}
        {elements.map((el, idx) => {
          const coord = dynamicSlotCoords[el.slot];
          const sizePx = effectiveSize(el);
          const fireFrame = elementFireFrames[idx];
          const appear = spring({
            frame: frame - fireFrame,
            fps:   actualFps,
            config: getSpringConfig(el.type),
          });

          // Hidden hasta su trigger
          if (frame < fireFrame) return null;

          const relFrame = frame - fireFrame;
          const floatWeight = interpolate(relFrame, [12, 32], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Micro-animación de flotación sinuosa orgánica
          const floatX = Math.sin(relFrame / 18 + idx * 1.5) * 3.5 * floatWeight;
          const floatY = Math.cos(relFrame / 14 + idx * 1.5) * 3.5 * floatWeight;
          const floatRot = Math.sin(relFrame / 22 + idx * 2.0) * 0.8 * floatWeight;

          // Inclinación humana base para stickers (label_red)
          const baseTilt = el.type === "label_red" ? (idx % 2 === 0 ? -2.5 : 2.5) : 0;
          const totalRotation = baseTilt + floatRot;

          // Entrada con deslizamiento vertical suave para imágenes
          const entrySlideY = el.type === "pexels_image" ? interpolate(appear, [0, 1], [30, 0]) : 0;

          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left:     coord.x,
                top:      coord.y,
                transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY + entrySlideY}px) scale(${appear}) rotate(${totalRotation}deg)`,
                opacity:  appear,
                display:  "flex",
                alignItems: "center",
                justifyContent: "center",
                width:    sizePx,
                minHeight: sizePx * 0.6,
              }}
            >
              <RenderElement
                el={el}
                projectId={projectId}
                channelId={channelId}
                sceneId={sceneId}
                sizePx={sizePx}
                frame={frame - fireFrame}
                fps={actualFps}
                appear={appear}
                accentColor={accentColor}
                slotMaxWidth={slotMaxWidths[el.slot]}
              />
            </div>
          );
        })}

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
