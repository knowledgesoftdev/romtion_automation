import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

// ── timing ────────────────────────────────────────────────────────────────────
const TITLE_IN  = 0;
const LAYER_IN  = 22;
const LAYER_STG = 30;
const ARROW_IN  = 140;
const NOTE_IN   = 280;
const FADE      = 14;

function useFade(start: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
}

// Architecture layers (bottom to top)
const LAYERS = [
  { label: "Hardware", sublabel: "ARM processor · 64–128 MB RAM · Flash storage", color: "#334155", bg: "#1e293b" },
  { label: "Symbian OS (kernel)", sublabel: "RTOS · Memory mgmt · IPC · Device drivers", color: "#8b5cf6", bg: "#1a0d2e" },
  { label: "S60 Platform (UI)",   sublabel: "Series 60 · Frameworks · Application framework", color: "#0ea5e9", bg: "#0c1a2e" },
  { label: "Aplicación (third party)", sublabel: "Developer code", color: "#00d4ff", bg: "#041520" },
];

const LAYER_H  = 82;
const LAYER_W  = 620;
const LAYER_X  = 80;
const LAYER_Y  = 520;  // bottom layer y position (draws upward)

// Navigation path showing developer traversal complexity
const NavArrow: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();

  // Animated path progress
  const progress = interpolate(frame, [ARROW_IN, ARROW_IN + 160], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const totalLen = 520;
  const dashOffset = totalLen * (1 - progress);

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, pointerEvents: "none", opacity }}>
      {/* Developer navigating down through layers */}
      <defs>
        <marker id="arrowhead-nav" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 0,0 L 8,4 L 0,8 Z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Path: app layer → S60 → Symbian OS → back up */}
      <path
        d="M 760,456 L 760,374 M 760,374 L 820,374 L 820,290 M 820,290 L 760,290 L 760,210"
        fill="none" stroke="#ef4444" strokeWidth={2.5}
        strokeDasharray={totalLen}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        markerEnd="url(#arrowhead-nav)"
      />

      {/* Labels */}
      {progress > 0.3 && (
        <text x={840} y={380} fill="#ef4444" fontSize={12} fontFamily={interFamily} fontWeight="600">
          S60 API
        </text>
      )}
      {progress > 0.65 && (
        <text x={840} y={296} fill="#ef4444" fontSize={12} fontFamily={interFamily} fontWeight="600">
          Symbian API
        </text>
      )}
      {progress > 0.9 && (
        <text x={720} y={196} fill="#ef4444" fontSize={12} fontFamily={interFamily} fontWeight="600">
          Feature list.
        </text>
      )}
    </svg>
  );
};

export const ArchLayersScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = useFade(TITLE_IN);
  const arrowOp = useFade(ARROW_IN);
  const noteOp  = useFade(NOTE_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>

      {/* Title */}
      <div style={{
        position: "absolute", top: 38, left: 0, right: 0,
        textAlign: "center", fontFamily: interFamily,
        color: "#e2e8f0", fontSize: 24, fontWeight: "bold",
        opacity: titleOp,
      }}>
        Dos capas, dos equipos, dos APIs — una sola fricción para el desarrollador
      </div>

      {/* ── Architecture layers ── */}
      {LAYERS.map(({ label, sublabel, color, bg }, i) => {
        const startF = LAYER_IN + i * LAYER_STG;
        const op = interpolate(frame, [startF, startF + FADE], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const tx = interpolate(frame, [startF, startF + 20], [-20, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const y = LAYER_Y - i * (LAYER_H + 4);

        return (
          <div key={i} style={{
            position: "absolute",
            left: LAYER_X,
            top: y,
            width: LAYER_W,
            height: LAYER_H,
            backgroundColor: bg,
            border: `2px solid ${color}44`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            opacity: op,
            transform: `translateX(${tx}px)`,
          }}>
            <div style={{
              width: 4, height: 48, backgroundColor: color,
              borderRadius: 2, marginRight: 16,
            }} />
            <div>
              <div style={{ fontFamily: interFamily, color, fontSize: 16, fontWeight: 700 }}>
                {label}
              </div>
              <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 13, marginTop: 3 }}>
                {sublabel}
              </div>
            </div>
            {/* Layer number */}
            <div style={{
              marginLeft: "auto",
              fontFamily: interFamily, color: `${color}44`, fontSize: 32, fontWeight: 900,
            }}>
              L{i + 1}
            </div>
          </div>
        );
      })}

      {/* ── Navigation arrows ── */}
      <NavArrow opacity={arrowOp} />

      {/* ── Developer icon ── */}
      <div style={{
        position: "absolute", left: 740, top: 452,
        opacity: useFade(ARROW_IN),
        fontFamily: interFamily, color: "#64748b", fontSize: 11,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>👨‍💻</div>
        Dev
      </div>

      {/* ── API inconsistency note ── */}
      <div style={{
        position: "absolute", right: 60, top: 200, width: 440,
        opacity: noteOp,
      }}>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #ef444444",
          borderRadius: 10, padding: "18px 22px", marginBottom: 18,
        }}>
          <div style={{ fontFamily: interFamily, color: "#ef4444", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 10 }}>
            PROBLEMA CENTRAL
          </div>
          <div style={{ fontFamily: interFamily, color: "#e2e8f0", fontSize: 15, lineHeight: 1.5 }}>
            Symbian OS y S60 eran proyectos separados con <span style={{ color: "#ef4444" }}>APIs parcialmente superpuestas</span> y frecuentemente inconsistentes.
          </div>
        </div>
        <div style={{
          backgroundColor: "#0d1117", border: "1.5px solid #8b5cf644",
          borderRadius: 10, padding: "18px 22px",
        }}>
          <div style={{ fontFamily: interFamily, color: "#8b5cf6", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 10 }}>
            SYMBIAN LTD — 1998
          </div>
          <div style={{ fontFamily: interFamily, color: "#94a3b8", fontSize: 14, lineHeight: 1.5 }}>
            Nokia · Ericsson · Motorola · Psion<br />
            La separación OS/UI tenía sentido <span style={{ color: "#8b5cf6" }}>comercial</span>.<br />
            Para el desarrollador: doble fricción.
          </div>
        </div>
      </div>

      {/* Conclusion bar */}
      <div style={{
        position: "absolute", bottom: 32, left: 80, right: 80,
        fontFamily: interFamily, color: "#64748b", fontSize: 14,
        lineHeight: 1.5, opacity: noteOp,
      }}>
        Un desarrollador debía navegar{" "}
        <span style={{ color: "#ef4444", fontWeight: 700 }}>dos capas de APIs</span>{" "}
        para acceder a funcionalidades del sistema — cada una con sus propios ciclos de release.
      </div>

    </AbsoluteFill>
  );
};
