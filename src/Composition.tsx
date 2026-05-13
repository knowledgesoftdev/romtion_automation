import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

const data = [
  { label: "Ene", value: 15 },
  { label: "Feb", value: 32 },
  { label: "Mar", value: 51 },
  { label: "Abr", value: 74 },
  { label: "May", value: 98 },
  { label: "Jun", value: 130 },
];

const maxValue = Math.max(...data.map((d) => d.value));
const STAGGER = 18;
const BAR_DURATION = 25;
const CHART_BOTTOM = 80;
const CHART_TOP_PADDING = 150;

const BAR_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#c084fc",
  "#e879f9",
];

type BarProps = {
  item: { label: string; value: number };
  index: number;
  barWidth: number;
  maxBarHeight: number;
  left: number;
  color: string;
};

const Bar: React.FC<BarProps> = ({
  item,
  index,
  barWidth,
  maxBarHeight,
  left,
  color,
}) => {
  const frame = useCurrentFrame();
  const startFrame = 10 + index * STAGGER;

  const progress = interpolate(
    frame,
    [startFrame, startFrame + BAR_DURATION],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }
  );

  const targetHeight = (item.value / maxValue) * maxBarHeight;
  const barHeight = targetHeight * progress;
  const displayValue = Math.round(item.value * progress);

  const valueLabelOpacity = interpolate(
    frame,
    [startFrame + BAR_DURATION, startFrame + BAR_DURATION + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const monthOpacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Bar body */}
      <div
        style={{
          position: "absolute",
          left,
          bottom: CHART_BOTTOM,
          width: barWidth,
          height: Math.max(barHeight, 0),
          background: `linear-gradient(to top, ${color}cc, ${color})`,
          borderRadius: "6px 6px 0 0",
          boxShadow: `0 0 28px ${color}55`,
        }}
      />

      {/* Top highlight stripe */}
      {barHeight > 6 && (
        <div
          style={{
            position: "absolute",
            left,
            bottom: CHART_BOTTOM + Math.max(barHeight, 0) - 6,
            width: barWidth,
            height: 6,
            background: `${color}`,
            borderRadius: "6px 6px 0 0",
            opacity: 0.9,
          }}
        />
      )}

      {/* Value label above bar */}
      <div
        style={{
          position: "absolute",
          left,
          bottom: CHART_BOTTOM + Math.max(barHeight, 0) + 12,
          width: barWidth,
          textAlign: "center",
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          opacity: valueLabelOpacity,
          fontFamily: "sans-serif",
        }}
      >
        {displayValue}
      </div>

      {/* Month label below baseline */}
      <div
        style={{
          position: "absolute",
          left,
          bottom: 28,
          width: barWidth,
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 20,
          opacity: monthOpacity,
          fontFamily: "sans-serif",
        }}
      >
        {item.label}
      </div>
    </>
  );
};

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const PADDING_H = 100;
  const maxBarHeight = height - CHART_BOTTOM - CHART_TOP_PADDING;
  const chartWidth = width - PADDING_H * 2;
  const slotWidth = chartWidth / data.length;
  const barWidth = slotWidth * 0.6;

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", fontFamily: "sans-serif" }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "white",
          fontSize: 46,
          fontWeight: "bold",
          opacity: titleOpacity,
          letterSpacing: "0.04em",
        }}
      >
        Crecimiento Mensual
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 112,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#64748b",
          fontSize: 20,
          opacity: subtitleOpacity,
          letterSpacing: "0.06em",
        }}
      >
        Incremento acumulado por mes
      </div>

      {/* Baseline */}
      <div
        style={{
          position: "absolute",
          left: PADDING_H,
          right: PADDING_H,
          bottom: CHART_BOTTOM - 2,
          height: 2,
          backgroundColor: "#1e293b",
          borderRadius: 2,
        }}
      />

      {/* Bars */}
      {data.map((item, i) => {
        const left = PADDING_H + i * slotWidth + (slotWidth - barWidth) / 2;
        return (
          <Bar
            key={i}
            item={item}
            index={i}
            barWidth={barWidth}
            maxBarHeight={maxBarHeight}
            left={left}
            color={BAR_COLORS[i]}
          />
        );
      })}
    </AbsoluteFill>
  );
};
