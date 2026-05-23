/**
 * Parser determinista para el formato "Código Muerto".
 * Entiende la estructura exacta del prompt del canal:
 * [GANCHO] → [CONTEXTO] → [AUTOPSIA] (DECISIÓN N + sub-bloques) → [LEGADO] → [CRITERIO FINAL]
 * Ignora todas las líneas de [ANIMACIÓN] y la sección [ANIMACIONES] completa.
 */
function hasSectionHeaders(rawText) {
  return /\[GANCHO\]|\[CONTEXTO\]|\[AUTOPSIA\]|\[LEGADO\]|\[CRITERIO FINAL\]/i.test(rawText);
}

function parseScript(rawText) {
  if (!hasSectionHeaders(rawText)) {
    // Plain-text parser for new niches (e.g. phantom-directive)
    const lines = rawText.split(/\r?\n/);
    const paragraphs = [];
    let counter = 1;
    let paragraphBuffer = '';

    const flushParagraph = () => {
      const pText = paragraphBuffer.trim().replace(/\s+/g, ' ');
      if (pText.length > 5) {
        paragraphs.push({ id: String(counter++).padStart(2, '0'), texto: pText });
      }
      paragraphBuffer = '';
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip animations list section if it starts
      if (/^\[ANIMACIONES/i.test(line)) break;
      // Skip inline animations
      if (/^\[?ANIMACI[OÓ]N\s*\d+/i.test(line)) continue;
      // Skip generic bracket lines
      if (/^\[.+\]/.test(line)) continue;

      if (!line) {
        // Empty line splits paragraphs
        flushParagraph();
      } else {
        paragraphBuffer += (paragraphBuffer ? ' ' : '') + line;
      }
    }
    flushParagraph();
    return paragraphs;
  }

  // Original Código Muerto parsing logic
  const lines = rawText.split('\n');
  const paragraphs = [];
  let counter = 1;
  let section = null;
  let buffer = '';
  let stopProcessing = false;

  function push(text) {
    const t = text.trim().replace(/\s+/g, ' ');
    if (t.length > 15) {
      paragraphs.push({ id: String(counter++).padStart(2, '0'), texto: t });
    }
  }

  function flush() {
    if (buffer.trim()) { push(buffer); buffer = ''; }
  }

  for (const rawLine of lines) {
    if (stopProcessing) break;
    const line = rawLine.trim();

    // Stop at the full animations list section
    if (/^\[ANIMACIONES/i.test(line)) { stopProcessing = true; continue; }

    // Skip animation inline lines (con o sin acento, con o sin corchete)
    if (/^\[?ANIMACI[OÓ]N\s*\d+/i.test(line)) continue;

    // Skip other pure bracket-only lines that aren't known sections
    // (but fall through to section detection first)

    // ── Section headers ──────────────────────────────────────────────────────
    if (/^\[GANCHO/i.test(line))         { flush(); section = 'gancho';   continue; }
    if (/^\[CONTEXTO/i.test(line))       { flush(); section = 'contexto'; continue; }
    if (/^\[AUTOPSIA/i.test(line))       { flush(); section = 'autopsia'; continue; }
    if (/^\[LEGADO/i.test(line))         { flush(); section = 'legado';   continue; }
    if (/^\[CRITERIO FINAL/i.test(line)) { flush(); section = 'criterio'; continue; }
    // Any other [HEADER] we don't know → skip
    if (/^\[.+\]/.test(line) && section !== 'autopsia') continue;

    // Skip blank lines (handled inline)
    if (!line || !section) continue;

    // ── AUTOPSIA: sub-bloques ─────────────────────────────────────────────────
    if (section === 'autopsia') {
      // DECISIÓN N: título → párrafo propio
      if (/^DECISI[OÓ]N\s+\d+:/i.test(line)) {
        flush();
        push(line);
        continue;
      }

      // Sub-bloque: QUÉ ERA / POR QUÉ SE TOMÓ / DÓNDE FALLÓ / IMPACTO REAL
      const subMatch = line.match(
        /^(QU[EÉ] ERA|POR QU[EÉ] SE TOM[OÓ]|D[OÓ]NDE FALL[OÓ]|IMPACTO REAL):\s*(.*)/i
      );
      if (subMatch) {
        flush();
        buffer = subMatch[2]; // texto tras los dos puntos
        continue;
      }

      // Línea de continuación del sub-bloque actual
      buffer += (buffer ? ' ' : '') + line;
      continue;
    }

    // ── Secciones narrativas: GANCHO, CONTEXTO, LEGADO, CRITERIO FINAL ───────
    // Acumulamos todo como un único párrafo (= 1 párrafo por sección)
    buffer += (buffer ? ' ' : '') + line;
  }

  flush();
  return paragraphs;
}

module.exports = { parseScript };
