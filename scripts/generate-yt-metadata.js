#!/usr/bin/env node
/**
 * scripts/generate-yt-metadata.js
 * Genera metadata completa de YouTube para un proyecto usando Claude:
 *   - Título optimizado para CTR
 *   - Descripción con capítulos (timestamps)
 *   - Hashtags (máx 500 caracteres)
 *   - Etiquetas SEO
 *   - Concepto de miniatura
 *
 * Guarda yt-metadata.txt en la carpeta del proyecto
 * y actualiza channel-memory.json con los estilos de título usados.
 *
 * Uso:
 *   node scripts/generate-yt-metadata.js <projectId>
 *   node scripts/generate-yt-metadata.js equifax-breach-un-framework-sin-patchear-147m-expuestos
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { readMemory, saveMemory } = require('../utils/memory');

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) { Anthropic = null; }

// ── Args ───────────────────────────────────────────────────────────────────────
const projectId = process.argv[2];
if (!projectId) {
  console.error('❌ Uso: node scripts/generate-yt-metadata.js <projectId>');
  process.exit(1);
}

let channelId = 'codigo-muerto';
try {
  const activeFile = path.join(__dirname, '..', 'active-channel.json');
  if (fs.existsSync(activeFile)) {
    channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
  }
} catch (_) {}

let PROJECTS_DIR = path.join(__dirname, '..', 'public', 'projects', channelId);
if (!fs.existsSync(PROJECTS_DIR)) {
  PROJECTS_DIR = path.join(__dirname, '..', 'public', 'projects');
}
const projectDir   = path.join(PROJECTS_DIR, projectId);

if (!fs.existsSync(projectDir)) {
  console.error(`❌ Proyecto no encontrado: ${projectDir}`);
  process.exit(1);
}

const scriptPath = path.join(projectDir, 'full_script.txt');
const guionPath  = path.join(projectDir, 'guion.json');
const timingPath = path.join(projectDir, 'timing.json');
const outputPath = path.join(projectDir, 'yt-metadata.txt');

if (!fs.existsSync(scriptPath)) {
  console.error('❌ No existe full_script.txt en el proyecto');
  process.exit(1);
}

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// ── Helpers ────────────────────────────────────────────────────────────────────
function secondsToTimestamp(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Construye capítulos reales desde guion.json + timing.json.
 * El timing usa claves 'parrafo-NN', el guion usa id 'NN'.
 * Detecta títulos de sección (DECISIÓN N, LEGADO, CRITERIO FINAL) como puntos de capítulo.
 */
function buildChapters(guion, timing) {
  if (!guion || !timing) return [];

  const chapters = [];

  for (const p of guion) {
    const timingKey = `parrafo-${p.id}`; // guion id '08' → 'parrafo-08'
    const t = timing[timingKey];
    if (!t) continue;

    const text = (p.texto || '').trim();
    const startSec = t.start;

    // Primera entrada siempre es Introducción en 0:00
    if (chapters.length === 0) {
      chapters.push({ time: '0:00', timeSec: 0, title: 'Introducción' });
    }

    // Detectar encabezados de sección como puntos de capítulo
    const decisionMatch = text.match(/^(DECISI[OÓ]N\s+\w+)/i);
    const legadoMatch   = /^LEGADO/i.test(text);
    const criterioMatch = /^CRITERIO FINAL/i.test(text);

    if (decisionMatch) {
      const num = decisionMatch[1].replace(/DECISI[OÓ]N\s+/i, '').trim();
      chapters.push({
        time: secondsToTimestamp(startSec),
        timeSec: startSec,
        title: `Decisión ${num}`,
      });
    } else if (legadoMatch) {
      chapters.push({ time: secondsToTimestamp(startSec), timeSec: startSec, title: 'Legado' });
    } else if (criterioMatch) {
      chapters.push({ time: secondsToTimestamp(startSec), timeSec: startSec, title: 'Criterio final' });
    }
  }

  return chapters;
}

/**
 * Extrae las frases más importantes del guion para incluirlas en la descripción.
 * Prioriza: gancho, contexto, frases con datos numéricos.
 */
function extractKeyPoints(guion, timing, maxPoints = 5) {
  if (!guion) return [];

  const keyPoints = [];

  for (const p of guion) {
    const text = (p.texto || '').trim();
    // Saltar títulos de sección
    if (/^(DECISI[OÓ]N|LEGADO|CRITERIO FINAL)/i.test(text)) continue;
    // Saltar textos muy cortos
    if (text.split(/\s+/).length < 10) continue;
    // Priorizar frases con datos numéricos o impacto
    const hasData = /\d{1,3}([.,]\d+)?(%| millones| días| años| horas)/.test(text);
    if (hasData) keyPoints.push(text);
    if (keyPoints.length >= maxPoints) break;
  }

  // Si no hay suficientes con datos, tomar los primeros párrafos narrativos
  if (keyPoints.length < 3) {
    for (const p of guion.slice(0, 6)) {
      const text = (p.texto || '').trim();
      if (!/^(DECISI[OÓ]N|LEGADO)/i.test(text) && text.split(/\s+/).length >= 10) {
        if (!keyPoints.includes(text)) keyPoints.push(text);
      }
      if (keyPoints.length >= maxPoints) break;
    }
  }

  return keyPoints.slice(0, maxPoints);
}

// ── Prompt de Claude para metadata ────────────────────────────────────────────
function buildMetadataPrompt(channelId, rawScript, titlesUsed, bestTitles, chapters, keyPoints) {
  let contextBlock = '';
  if (titlesUsed && titlesUsed.length > 0) {
    contextBlock += `\nTÍTULOS YA USADOS EN EL CANAL (no repitas este patrón exacto):\n${titlesUsed.map(t => `  - ${t}`).join('\n')}\n`;
  }
  if (bestTitles && bestTitles.length > 0) {
    contextBlock += `\nTÍTULOS CON MEJOR RENDIMIENTO (sigue este estilo):\n${bestTitles.map(t => `  - "${t.titulo}" → ${t.views} views`).join('\n')}\n`;
  }

  const chaptersBlock = chapters.length > 1
    ? `\nCAPÍTULOS REALES DEL VIDEO (con timestamps exactos del audio):\n${chapters.map(c => `  ${c.time} ${c.title}`).join('\n')}\n`
    : '';

  const keyPointsBlock = keyPoints.length > 0
    ? `\nFRASES CLAVE DEL GUION (usa estas ideas en la descripción):\n${keyPoints.map(k => `  - "${k}"`).join('\n')}\n`
    : '';

  if (channelId === 'phantom-directive') {
    return `You are an expert in YouTube SEO and growth, specialized in military history, declassified operations, and classified programs.
The channel is called "Phantom Directive" — focusing on declassified operations, US military secret units, and compartmented programs.
Tone: Calm, authoritative, slightly ominous, investigative, fact-based. No cheap clickbait.
${contextBlock}${chaptersBlock}${keyPointsBlock}
VIDEO SCRIPT:
${rawScript.substring(0, 3000)}${rawScript.length > 3000 ? '\n[...script continues...]' : ''}

Generate a JSON with exactly this structure (no markdown, just raw JSON). All values MUST be written in English:
{
  "titulo_principal": "The main title optimized for CTR (max 80 chars)",
  "titulo_alternativo": "An alternative title variation (different pattern)",
  "descripcion_corta": "2-3 hook sentences before the 'show more' fold. Impactful. Max 200 chars.",
  "descripcion_con_capitulos": "Full description ready to paste. Must include:\n1) An introductory paragraph of 3-4 lines with the key concepts of the video.\n2) A blank line.\n3) The chapters EXACTLY as received in CAPÍTULOS REALES, one per line with its timestamp.\n4) A blank line.\n5) A short Call To Action (subscribe, comment on which secret unit or classified program should be covered next).\nTotal length: 400-600 chars without counting chapters.",
  "hashtags": "List of hashtags separated by spaces, max 500 characters total including spaces",
  "etiquetas": ["array", "of", "SEO", "tags", "between", "5", "and", "12", "keywords"],
  "miniatura_concepto": "Detailed description of the ideal thumbnail: background image/footage, text overlay, colors, composition. Specific and actionable.",
  "estilo_titulo": "One word describing the title pattern (e.g., classified-unit, secret-operation, declassified-file, mysterious-program)"
}`;
  }

  return `Eres un experto en SEO y crecimiento de canal de YouTube especializado en tecnología y programación.
El canal se llama "Código Muerto" — autopsia técnica de arquitecturas de software que fallaron.
Tono: periodístico, técnico, sin clickbait barato. Hooks que prometan información real.
${contextBlock}${chaptersBlock}${keyPointsBlock}
GUION DEL VIDEO:
${rawScript.substring(0, 3000)}${rawScript.length > 3000 ? '\n[...guion continúa...]' : ''}

Genera un JSON con exactamente esta estructura (sin markdown, solo JSON). Todos los valores DEBEN estar en español:
{
  "titulo_principal": "El título principal optimizado para CTR (máx 80 chars)",
  "titulo_alternativo": "Una variación del título (diferente patrón)",
  "descripcion_corta": "2-3 oraciones gancho que aparecen antes del 'ver más'. Impactantes. Máx 200 chars.",
  "descripcion_con_capitulos": "Descripción completa lista para pegar en YouTube. Incluye:\n1) Párrafo introductorio de 3-4 líneas con las ideas clave del video.\n2) Línea en blanco.\n3) Los capítulos EXACTAMENTE como los recibes en CAPÍTULOS REALES, uno por línea con su timestamp.\n4) Línea en blanco.\n5) Llamada a la acción corta (suscripción, comentar qué empresa debería ser la próxima autopsia).\nLongitud total: 400-600 chars sin contar capítulos.",
  "hashtags": "Lista de hashtags separados por espacio, máx 500 caracteres totales incluyendo espacios",
  "etiquetas": ["array", "de", "etiquetas", "SEO", "entre", "5", "y", "12", "palabras", "clave"],
  "miniatura_concepto": "Descripción detallada de la miniatura ideal: imagen de fondo, texto encima, colores, disposición. Específico y accionable.",
  "estilo_titulo": "Una palabra que describe el patrón del título (ej: estadistica-impactante, pregunta-retorica, declaracion-contraintuitiva, dato-oculto)"
}`;
}

// ── Llamada a Claude ───────────────────────────────────────────────────────────
async function generateMetadataWithClaude(channelId, rawScript, memory, chapters, keyPoints) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic no disponible. Configura ANTHROPIC_API_KEY.');
  }

  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  const titlesUsed  = (memory.estilo_titulo_historial || []);
  const bestTitles  = (memory.mejor_rendimiento || [])
    .filter(v => v.views > 30)
    .map(v => ({ titulo: v.tema, views: v.views }))
    .slice(0, 3);

  const prompt = buildMetadataPrompt(channelId, rawScript, titlesUsed, bestTitles, chapters, keyPoints);

  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = '';
  for (const block of res.content || []) {
    if (block.type === 'text') text += block.text;
  }

  text = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1) throw new Error('Claude no devolvió JSON válido');
  return JSON.parse(text.substring(start, end + 1));
}

// ── Formatear archivo de texto de salida ──────────────────────────────────────
function formatOutputFile(channelId, metadata, chapters) {
  const lines = [];
  const sep = '═'.repeat(60);

  const isPD = channelId === 'phantom-directive';
  const channelLabel = isPD ? 'PHANTOM DIRECTIVE' : 'CÓDIGO MUERTO';
  lines.push(sep);
  lines.push(`  📺 METADATA YOUTUBE — ${channelLabel}`);
  lines.push(sep);
  lines.push('');

  lines.push(isPD ? '【 TITLES 】' : '【 TÍTULOS 】');
  lines.push(`${isPD ? 'Main' : 'Principal'}:     ${metadata.titulo_principal}`);
  lines.push(`${isPD ? 'Alternative' : 'Alternativo'}:   ${metadata.titulo_alternativo}`);
  lines.push('');

  lines.push(isPD ? '【 SHORT DESCRIPTION 】' : '【 DESCRIPCIÓN CORTA (antes del ver más) 】');
  lines.push(metadata.descripcion_corta);
  lines.push('');

  lines.push(isPD ? '【 FULL DESCRIPTION WITH CHAPTERS 】' : '【 DESCRIPCIÓN COMPLETA CON CAPÍTULOS (pegar en YouTube) 】');
  lines.push('─'.repeat(60));
  lines.push(metadata.descripcion_con_capitulos || metadata.descripcion_completa || '');
  lines.push('─'.repeat(60));
  lines.push('');

  // Capítulos en bloque separado para referencia
  if (chapters.length > 1) {
    lines.push(isPD ? '【 CHAPTERS (reference) 】' : '【 CAPÍTULOS (referencia) 】');
    for (const ch of chapters) {
      lines.push(`${ch.time} ${ch.title}`);
    }
    lines.push('');
  }

  lines.push('【 HASHTAGS 】');
  lines.push(metadata.hashtags);
  lines.push(`(${(metadata.hashtags || '').length} ${isPD ? 'characters' : 'caracteres'})`);
  lines.push('');

  lines.push(isPD ? '【 SEO TAGS 】' : '【 ETIQUETAS SEO 】');
  lines.push((metadata.etiquetas || []).join(', '));
  lines.push('');

  lines.push(isPD ? '【 THUMBNAIL CONCEPT 】' : '【 CONCEPTO DE MINIATURA 】');
  lines.push(metadata.miniatura_concepto);
  lines.push('');

  lines.push(sep);
  lines.push(`${isPD ? 'Generated' : 'Generado'}: ${new Date().toLocaleString(isPD ? 'en-US' : 'es-ES')}`);
  lines.push('');

  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📺 Generando metadata de YouTube...');
  console.log(`   Proyecto: ${projectId}\n`);

  const rawScript = fs.readFileSync(scriptPath, 'utf8');
  const memory    = await readMemory();

  // Capítulos desde guion + timing
  let chapters = [];
  let keyPoints = [];
  try {
    const guion  = fs.existsSync(guionPath)  ? JSON.parse(fs.readFileSync(guionPath, 'utf8'))  : null;
    const timing = fs.existsSync(timingPath) ? JSON.parse(fs.readFileSync(timingPath, 'utf8')) : null;
    chapters  = buildChapters(guion, timing);
    keyPoints = extractKeyPoints(guion, timing);
    if (chapters.length > 1) console.log(`✅ ${chapters.length} capítulos detectados automáticamente`);
    if (keyPoints.length > 0) console.log(`✅ ${keyPoints.length} frases clave extraídas del guion`);
  } catch (e) {
    console.warn('⚠️  No se pudieron generar capítulos automáticos:', e.message);
  }

  // Generar metadata con Claude
  let metadata;
  try {
    console.log('🧠 Generando con Claude...');
    metadata = await generateMetadataWithClaude(channelId, rawScript, memory, chapters, keyPoints);
    console.log(`✅ Metadata generada`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  // Guardar archivo de texto
  const output = formatOutputFile(channelId, metadata, chapters);
  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`\n✅ Guardado en: ${outputPath}`);

  // Asegurar que la carpeta de miniaturas exista para el proyecto
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    console.log(`📁 Carpeta de miniaturas creada en: ${thumbnailsDir}`);
  }

  // Actualizar memoria del canal
  if (!memory.estilo_titulo_historial) memory.estilo_titulo_historial = [];
  if (!memory.miniatura_conceptos)     memory.miniatura_conceptos     = [];

  // Registrar estilo de título usado
  if (metadata.estilo_titulo && !memory.estilo_titulo_historial.includes(metadata.estilo_titulo)) {
    memory.estilo_titulo_historial.push(metadata.estilo_titulo);
  }

  // Guardar concepto de miniatura asociado al proyecto
  const existingIdx = memory.miniatura_conceptos.findIndex(m => m.projectId === projectId);
  const miniEntry = {
    projectId,
    titulo: metadata.titulo_principal,
    concepto: metadata.miniatura_concepto,
    estilo_titulo: metadata.estilo_titulo,
    fecha: new Date().toISOString(),
  };
  if (existingIdx >= 0) memory.miniatura_conceptos[existingIdx] = miniEntry;
  else memory.miniatura_conceptos.push(miniEntry);

  await saveMemory(memory);
  console.log('✅ Memoria del canal actualizada\n');

  // Mostrar resumen
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           📺 Metadata generada                   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  🎯 Título:     ${metadata.titulo_principal}`);
  console.log(`  🔀 Alternativo: ${metadata.titulo_alternativo}`);
  console.log(`  🪝 Estilo:     ${metadata.estilo_titulo}`);
  console.log(`  🖼️  Miniatura:  ${(metadata.miniatura_concepto || '').substring(0, 80)}...`);
  console.log(`\n  📄 Archivo completo: ${outputPath}\n`);
}

main().catch(err => {
  console.error(`\n❌ Error fatal: ${err.message}`);
  process.exit(1);
});
