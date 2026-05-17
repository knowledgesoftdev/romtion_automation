/**
 * server/utils/smartParser.js
 * Parser inteligente para guiones de "Código Muerto".
 * Usa Claude para fragmentar el texto en párrafos cortos y visualmente
 * efectivos (≤45 palabras). Si Claude no está disponible, hace fallback
 * al parser determinista existente.
 *
 * Principio: cada párrafo = 1 escena visual. Escenas cortas = más dinamismo.
 */

require('dotenv').config();
const { parseScript } = require('./parser');

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) { Anthropic = null; }

const MAX_WORDS_PER_FRAGMENT = 45;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// ── Prompt de fragmentación ────────────────────────────────────────────────────
const FRAGMENT_SYSTEM = `Eres un editor de video especializado en minidocumentales rápidos estilo YouTube.
Tu tarea: recibir un guion de video y dividirlo en fragmentos cortos para escenas de video.

REGLAS ESTRICTAS:
1. Cada fragmento debe tener entre 20 y 45 palabras (NUNCA más de 45).
2. Cada fragmento debe tener sentido semántico completo por sí solo.
3. Los títulos de sección (ej: "DECISIÓN UNO:", "QUÉ ERA:") van como fragmentos solos de 1 línea.
4. Las líneas de [ANIMACIÓN N:] se eliminan completamente del output.
5. La sección [ANIMACIONES — LISTA COMPLETA] y todo lo que sigue se elimina completamente.
6. Mantén el orden narrativo exacto del guion original.
7. Si una oración tiene más de 45 palabras, córtala en el punto más natural (coma, punto y coma, conjunción).
8. NO inventes contenido. Solo reorganiza y corta el texto existente.

FORMATO DE SALIDA: devuelve un array JSON donde cada elemento es un objeto { "texto": "..." }.
NADA más. Solo el array JSON sin markdown ni explicaciones.`;

// ── Claude call ────────────────────────────────────────────────────────────────
async function fragmentWithClaude(rawScript) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic no disponible');
  }

  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  // Dividimos el guion en chunks de ~3000 chars para no saturar el contexto
  // Claude procesa el guion completo si es razonable (<15k chars)
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    system: FRAGMENT_SYSTEM,
    messages: [{
      role: 'user',
      content: `Guion a fragmentar:\n\n${rawScript}\n\nDevuelve solo el array JSON.`,
    }],
  });

  let text = '';
  for (const block of res.content || []) {
    if (block.type === 'text') text += block.text;
  }

  // Limpiar posible markdown
  text = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Claude no devolvió un array JSON válido');

  const parsed = JSON.parse(text.substring(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('Resultado no es un array');

  return parsed;
}

// ── Validación y normalización de fragmentos ───────────────────────────────────
function normalizeFragments(rawFragments) {
  const result = [];
  let counter = 1;

  for (const item of rawFragments) {
    const text = (item.texto || item.text || '').trim().replace(/\s+/g, ' ');
    if (!text || text.length < 10) continue;

    // Contar palabras
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length <= MAX_WORDS_PER_FRAGMENT) {
      result.push({
        id: String(counter++).padStart(2, '0'),
        texto: text,
      });
    } else {
      // Si Claude devolvió algo muy largo, lo cortamos en el punto medio más cercano
      const half = Math.floor(words.length / 2);
      // Buscar punto de corte natural (punto, coma) cerca del mid
      let cutIdx = half;
      for (let i = half; i >= half - 10 && i >= 0; i--) {
        if (/[.,;]$/.test(words[i])) { cutIdx = i + 1; break; }
      }
      const part1 = words.slice(0, cutIdx).join(' ');
      const part2 = words.slice(cutIdx).join(' ');
      if (part1.length > 10) result.push({ id: String(counter++).padStart(2, '0'), texto: part1 });
      if (part2.length > 10) result.push({ id: String(counter++).padStart(2, '0'), texto: part2 });
    }
  }

  return result;
}

// ── Fragmentación del parser determinista (fallback) ───────────────────────────
// El parser determinista devuelve párrafos a veces muy largos.
// Esta función los corta respetando el límite de palabras.
function splitLongParagraphs(paragraphs) {
  const result = [];
  let counter = 1;

  for (const p of paragraphs) {
    const words = p.texto.trim().split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS_PER_FRAGMENT) {
      result.push({ id: String(counter++).padStart(2, '0'), texto: p.texto });
      continue;
    }

    // Cortar en fragmentos de MAX_WORDS_PER_FRAGMENT buscando puntos naturales
    let i = 0;
    while (i < words.length) {
      let end = Math.min(i + MAX_WORDS_PER_FRAGMENT, words.length);
      // Retroceder hasta un punto de corte natural
      let cut = end;
      for (let j = end - 1; j >= i + 15; j--) {
        if (/[.!?]$/.test(words[j])) { cut = j + 1; break; }
      }
      const fragment = words.slice(i, cut).join(' ');
      if (fragment.trim().length > 10) {
        result.push({ id: String(counter++).padStart(2, '0'), texto: fragment });
      }
      i = cut;
    }
  }

  return result;
}

// ── Función principal exportada ────────────────────────────────────────────────
/**
 * parseScriptSmart(rawScript)
 * Intenta fragmentar con Claude. Si falla, usa parser determinista + splitter.
 * @param {string} rawScript
 * @returns {Promise<Array<{id: string, texto: string}>>}
 */
async function parseScriptSmart(rawScript) {
  // Intento 1: Claude
  try {
    console.log('🧠 [smartParser] Fragmentando con Claude...');
    const fragments = await fragmentWithClaude(rawScript);
    const normalized = normalizeFragments(fragments);
    console.log(`✅ [smartParser] Claude generó ${normalized.length} fragmentos`);
    return normalized;
  } catch (err) {
    console.warn(`⚠️  [smartParser] Claude falló: ${err.message}. Usando parser determinista.`);
  }

  // Fallback: parser determinista + corte de párrafos largos
  const deterministicParagraphs = parseScript(rawScript);
  const result = splitLongParagraphs(deterministicParagraphs);
  console.log(`✅ [smartParser] Fallback: ${result.length} fragmentos`);
  return result;
}

module.exports = { parseScriptSmart };
