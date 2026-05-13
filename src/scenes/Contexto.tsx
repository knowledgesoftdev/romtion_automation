import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";

loadInter();

const FADE = 15;

const TEXT_LINES = [
  { text: "Nokia controló el 40% del mercado global de móviles en 2007.", frame: 20, color: "#e2e8f0", size: 22 },
  { text: "Symbian corría en 250 millones de dispositivos activos ese mismo año.", frame: 190, color: "#e2e8f0", size: 22 },
  { text: "Era un RTOS — diseñado para hardware con solo 64 MB de RAM.", frame: 360, color: "#94a3b8", size: 20 },
  { text: "Funcionaba. Era eficiente. Era el estándar.", frame: 490, color: "#94a3b8", size: 20 },
  { text: "El iPhone se anunció en enero de 2007.", frame: 610, color: "#f59e0b", size: 22 },
  { text: "Nokia vendió su división de móviles a Microsoft en 2013.", frame: 730, color: "#ef4444", size: 22 },
  { text: "Seis años. Eso tardó el colapso.", frame: 880, color: "#ef4444", size: 30 },
];

const METRICS = [
  { value: "40%", label: "mercado global", color: "#8b5cf6", frame: 150 },
  { value: "250M", label: "dispositivos activos", color: "#00d4ff", frame: 340 },
  { value: "$5,440M", label: "venta a Microsoft · 2013", color: "#ef4444", frame: 700 },
];

const MetricCard: React.FC<{ value: string; label: string; color: string; startFrame: number }> = ({
  value, label, color, startFrame,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [startFrame, startFrame + 22], [0.88, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{
      opacity: op,
      transform: `scale(${scale})`,
      backgroundColor: `${color}12`,
      border: `2px solid ${color}55`,
      borderRadius: 12,
      padding: "18px 24px",
      marginBottom: 22,
    }}>
      <div style={{ fontFamily: interFamily, color, fontSize: 52, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: interFamily, color: "#64748b", fontSize: 15, marginTop: 6, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

// Abstract geographic grid lines (suggestive of Europe/Asia map)
const MapBackground: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, opacity }} aria-hidden>
    {/* Latitude lines */}
    {[120, 200, 280, 360, 440, 520, 600].map((y) => (
      <line key={y} x1={0} y1={y} x2={1280} y2={y} stroke="#1a1a2e" strokeWidth={0.8} />
    ))}
    {/* Longitude lines */}
    {[120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200].map((x) => (
      <line key={x} x1={x} y1={0} x2={x} y2={720} stroke="#1a1a2e" strokeWidth={0.8} />
    ))}
    {/* Abstract continent shapes */}
    <polyline points="180,180 220,155 275,148 320,158 355,180 370,215 355,248 320,262 280,258 245,245 215,225 195,205 180,180" fill="none" stroke="#1e2a3a" strokeWidth={1.5} />
    <polyline points="355,180 420,160 510,145 620,148 720,158 820,180 900,210 935,255 920,295 870,315 810,305 750,285 680,278 600,290 530,282 460,265 410,245 375,222 355,180" fill="none" stroke="#1e2a3a" strokeWidth={1.5} />
    {/* City dots */}
    {[[280, 205], [390, 198], [500, 175], [650, 195], [780, 230]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={2.5} fill="#1e2a3a" />
    ))}
  </svg>
);

export const Contexto: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOp = interpolate(frame, [0, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dividerOp = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", overflow: "hidden" }}>
      <MapBackground opacity={bgOp * 0.5} />

      {/* Left text panel */}
      <div style={{ position: "absolute", left: 80, top: 80, width: 660 }}>
        <div style={{
          fontFamily: interFamily, color: "#334155", fontSize: 11,
          fontWeight: 700, letterSpacing: "0.18em", marginBottom: 28,
          opacity: bgOp,
        }}>
          CONTEXTO — 2007
        </div>
        {TEXT_LINES.map(({ text, frame: startFrame, color, size }, i) => {
          const op = interpolate(frame, [startFrame, startFrame + FADE], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [startFrame, startFrame + 22], [10, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div key={i} style={{
              fontFamily: interFamily, color, fontSize: size,
              fontWeight: i === 6 ? 700 : i === 4 ? 600 : 400,
              lineHeight: 1.55, marginBottom: 10,
              opacity: op, transform: `translateY(${ty}px)`,
            }}>
              {text}
            </div>
          );
        })}
      </div>

      {/* Vertical divider */}
      <div style={{
        position: "absolute", left: 790, top: 80, width: 1, height: 560,
        backgroundColor: "#1e293b", opacity: dividerOp,
      }} />

      {/* Right metrics */}
      <div style={{ position: "absolute", left: 820, top: 130, width: 360 }}>
        {METRICS.map((m) => (
          <MetricCard key={m.value} value={m.value} label={m.label} color={m.color} startFrame={m.frame} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
