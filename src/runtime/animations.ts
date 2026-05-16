import { interpolate, spring, Easing } from 'remotion';

// ─── Easing curves (siguen las recomendaciones del skill remotion-best-practices) ───

// "Crisp UI entrance" — ease-out-expo estilo Apple/Stripe. Lo usamos en todo
// lo que entra sin overshoot: títulos, subtítulos, bullets, eyebrow.
export const EASE_CRISP_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// "Playful overshoot" — control point y > 1 hace que el valor se pase del
// target y vuelva. Mismo look que Framer Motion `type: 'spring'`. Lo usamos
// en énfasis: stat value, keywords, headlines de scenes cortas.
export const EASE_OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);

// "Editorial fade" — symmetric ease-in-out para tránsitos largos suaves.
export const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1);

// "Ease-in cubic" — usado en salidas (acelera hacia afuera).
export const EASE_OUT_EXIT = Easing.in(Easing.cubic);

// ─── Entry/Exit helpers ──────────────────────────────────────────────────────

export const fadeIn = (frame: number, startFrame = 0, durationFrames = 18) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    easing: EASE_CRISP_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

export const fadeOut = (frame: number, totalFrames: number, fadeFrames = 14) =>
  interpolate(frame, [totalFrames - fadeFrames, totalFrames], [1, 0], {
    easing: EASE_OUT_EXIT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// Slide-up con curva crisp (entrada limpia desde abajo, sin rebote).
export const slideUp = (frame: number, startFrame = 0, durationFrames = 22) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [44, 0], {
    easing: EASE_CRISP_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// Slide-in horizontal (default: desde la izquierda).
export const slideInX = (frame: number, startFrame = 0, durationFrames = 22, distance = -40) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [distance, 0], {
    easing: EASE_CRISP_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// "Pop-in" con overshoot real (el look Framer Motion). Devuelve el scale [0,1+]
export const popIn = (frame: number, startFrame = 0, durationFrames = 26) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [0.5, 1], {
    easing: EASE_OVERSHOOT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// Spring físico — para énfasis máximo (stat value, headlines clave).
// `damping` bajo = más rebote. `stiffness` alto = más rápido.
export const springIn = (
  frame: number,
  startFrame: number,
  fps: number,
  config: { damping?: number; mass?: number; stiffness?: number } = {},
) =>
  spring({
    fps,
    frame: frame - startFrame,
    from: 0.6,
    to: 1,
    config: { damping: 14, mass: 0.9, stiffness: 110, ...config },
  });

// Ken Burns: zoom suave para imágenes, sutil para video. `max` controla destino.
export const kenBurns = (frame: number, totalFrames: number, max = 1.08) =>
  interpolate(frame, [0, totalFrames], [1, max], {
    easing: EASE_EDITORIAL,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// Ken Burns dramático para imágenes estáticas.
export const kenBurnsDramatic = (frame: number, totalFrames: number) =>
  kenBurns(frame, totalFrames, 1.14);

// Parallax pan (desplazamiento horizontal de la media). Útil para fullbleed.
export const parallax = (frame: number, totalFrames: number, distance = 30) =>
  interpolate(frame, [0, totalFrames], [-distance / 2, distance / 2], {
    easing: EASE_EDITORIAL,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

// "Grow" — para barras de chart. Crece de 0 a 1.
export const grow = (frame: number, startFrame = 0, durationFrames = 32) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    easing: EASE_CRISP_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
