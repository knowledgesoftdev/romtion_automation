/**
 * Estima el fontSize máximo para que `text` quepa en `maxWidth` px en una sola
 * línea, dado un fontSize base. Si cabe holgado, devuelve `base`. Si no,
 * reduce proporcionalmente sin bajar de `min`.
 *
 * `charRatio` es el ancho promedio de un glifo expresado como fracción del
 * fontSize. Para sans-serif bold latín ronda 0.55; con `letterSpacing` negativo
 * baja a ~0.50; con `letterSpacing` positivo sube a ~0.62.
 */
export function fitOneLine(
  text: string,
  maxWidth: number,
  base: number,
  min: number,
  charRatio = 0.55,
): number {
  if (!text) return base;
  const chars = text.length;
  const wouldFit = chars * base * charRatio <= maxWidth;
  if (wouldFit) return base;
  const scaled = Math.floor(maxWidth / (chars * charRatio));
  return Math.max(min, Math.min(base, scaled));
}
