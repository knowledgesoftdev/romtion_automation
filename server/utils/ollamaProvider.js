const fetch = require('node-fetch');

// ── Config ─────────────────────────────────────────────────────────────────────
const OLLAMA_URL   = 'http://localhost:11434/api/generate';
const MODEL_NAME   = 'gemma4:e4b';   // cambia aquí si tu modelo tiene otro nombre
const TIMEOUT_MS   = 180_000;        // 3 minutos — suficiente para 12k chars en 4B

// ── Timeout helper ────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error(`Ollama no respondió en ${ms / 1000}s. ¿Está corriendo?`);
    throw e;
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────
// Adaptado exactamente a la estructura de prompt.txt ("Código Muerto")
function buildPrompt(rawText) {
  return `Eres un extractor de texto. Analiza el guion y devuelve SOLO los párrafos de voz en off.

=== ESTRUCTURA DEL GUION ===
El guion tiene estas secciones:

[GANCHO]           → 1 párrafo narrado
[CONTEXTO]         → 1 párrafo narrado
[AUTOPSIA]         → Cada DECISIÓN tiene 5 sub-bloques:
                       DECISIÓN N: [título]  → incluir el título como párrafo corto
                       QUÉ ERA: [texto]      → incluir el texto
                       POR QUÉ SE TOMÓ: [texto] → incluir el texto
                       DÓNDE FALLÓ: [texto]  → incluir el texto
                       IMPACTO REAL: [texto] → incluir el texto
                       [ANIMACIÓN N: ...]    → IGNORAR COMPLETAMENTE
[LEGADO]           → 1 párrafo narrado
[CRITERIO FINAL]   → 1 párrafo narrado
[ANIMACIONES]      → IGNORAR TODA ESTA SECCIÓN

=== REGLAS ESTRICTAS ===
✅ INCLUIR: El texto narrativo de todas las secciones listadas arriba
❌ EXCLUIR:
   - Cualquier línea que empiece con [ANIMACIÓN o ANIMACIÓN
   - Los encabezados entre corchetes: [GANCHO], [CONTEXTO], etc.
   - Líneas técnicas: "ANIMACIÓN N |", "Duración:", "Elementos:", "Movimiento:"
   - La sección [ANIMACIONES] completa al final del guion

=== FORMATO DE SALIDA ===
Responde ÚNICAMENTE con el array JSON. Nada antes, nada después, sin bloques de código.

[
  {"id":"01","texto":"Texto completo del primer párrafo narrado."},
  {"id":"02","texto":"Texto completo del segundo párrafo narrado."},
  {"id":"03","texto":"DECISIÓN 1: Nombre de la decisión"},
  {"id":"04","texto":"Texto de QUÉ ERA para esta decisión."}
]

=== GUION A PROCESAR ===
${rawText}

=== ARRAY JSON DE SALIDA ===`;
}

// ── JSON extractor ─────────────────────────────────────────────────────────────
function extractArrayFromText(rawText) {
  // Limpiar bloques markdown si el modelo los agrega
  let text = rawText
    .replace(/```json[\s\S]*?```/g, (m) => m.replace(/```json|```/g, ''))
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''))
    .trim();

  // Buscar el array JSON dentro de la respuesta
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('No se encontró un array JSON en la respuesta de Ollama.');
  }

  const jsonStr = text.substring(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (_) {
    // Intentar reparar JSON con comas finales o comillas rotas
    const cleaned = jsonStr
      .replace(/,\s*([}\]])/g, '$1')   // trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":');  // unquoted keys
    parsed = JSON.parse(cleaned);
  }

  // Normalizar el array (acepta varios formatos que el modelo pueda devolver)
  let items = [];
  if (Array.isArray(parsed))                            items = parsed;
  else if (Array.isArray(parsed.guion))                 items = parsed.guion;
  else if (Array.isArray(parsed.paragraphs))            items = parsed.paragraphs;
  else if (Array.isArray(parsed.narration))             items = parsed.narration;
  else if (typeof parsed === 'object')                  items = [parsed];

  // Mapear a { id, texto } y filtrar entradas vacías
  return items
    .map((item, i) => {
      const id = String(item.id || item.numero || (i + 1)).padStart(2, '0');

      // Buscar el texto en el campo correcto (el modelo puede usar distintos nombres)
      let texto = item.texto || item.text || item.narration || item.content || item.audio || '';

      // Si sigue vacío, tomar el string más largo del objeto
      if (!texto) {
        const strings = Object.values(item).filter(v => typeof v === 'string' && v.length > 20);
        texto = strings.sort((a, b) => b.length - a.length)[0] || '';
      }

      return { id, texto: texto.trim() };
    })
    .filter(item => item.texto.length > 15);
}

// ── Main export ───────────────────────────────────────────────────────────────
async function parseWithOllama(rawText) {
  const prompt = buildPrompt(rawText);

  console.log(`🤖 Enviando ${rawText.length} caracteres a Ollama (${MODEL_NAME})...`);

  const response = await fetchWithTimeout(
    OLLAMA_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        stream: false,
        // ⚠️  Sin "format: json" — mejora calidad en modelos pequeños
        options: {
          temperature: 0,       // determinista
          num_predict: 10000,   // suficiente para ~34 párrafos
          stop: ['\n\n\n'],     // evitar salidas muy largas
        }
      })
    },
    TIMEOUT_MS
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama respondió con error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error('Ollama devolvió una respuesta vacía.');
  }

  console.log(`📨 Respuesta recibida (${data.response.length} chars). Extrayendo JSON...`);

  const guion = extractArrayFromText(data.response);

  if (guion.length === 0) {
    throw new Error('El array extraído está vacío — el modelo no produjo párrafos válidos.');
  }

  // Re-numerar IDs correlativamente por si el modelo saltó números
  const normalized = guion.map((item, i) => ({
    id: String(i + 1).padStart(2, '0'),
    texto: item.texto,
  }));

  console.log(`✅ Guion extraído: ${normalized.length} párrafos`);
  return normalized;
}

module.exports = { parseWithOllama };
