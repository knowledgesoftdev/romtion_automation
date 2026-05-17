#!/usr/bin/env node
/**
 * build-scene-plan.js — analiza public/projects/<projectId>/guion.json y
 * produce scene-plan.json con la organización dinámica.
 *
 * Provider chain (en orden):
 *   1. Anthropic Claude Haiku 4.5 (requiere ANTHROPIC_API_KEY en .env)
 *   2. Ollama local (si responde en :11434)
 *   3. Heurístico determinista (regex)
 *
 * Uso:
 *   node scripts/build-scene-plan.js <projectId> [--force] [--no-llm]
 *                                                 [--provider=auto|anthropic|ollama|fallback]
 */

require('dotenv').config();
const { readMemory } = require('../utils/memory');
const fs   = require('fs');
const path = require('path');
const http = require('http');

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) { Anthropic = null; }

const argv = process.argv.slice(2);
const projectId = argv.find(a => !a.startsWith('--'));
const NO_LLM    = argv.includes('--no-llm');
const FORCE     = argv.includes('--force');
const providerArg = (argv.find(a => a.startsWith('--provider=')) || '').split('=')[1] || 'auto';
const PROVIDER_PREF = ['auto','anthropic','ollama','fallback'].includes(providerArg) ? providerArg : 'auto';

if (!projectId) {
  console.error('Uso: node scripts/build-scene-plan.js <projectId> [--force] [--no-llm] [--provider=auto|anthropic|ollama|fallback]');
  process.exit(1);
}

const projectDir = path.join(__dirname, '..', 'public', 'projects', projectId);
const guionPath  = path.join(projectDir, 'guion.json');
const planPath   = path.join(projectDir, 'scene-plan.json');
const cacheDir   = path.join(projectDir, '.cache', 'plan');

if (!fs.existsSync(guionPath)) {
  console.error(`❌ No existe ${guionPath}`);
  process.exit(1);
}
fs.mkdirSync(cacheDir, { recursive: true });

const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));

// ─── Spanish stopwords ────────────────────────────────────────────────────────
const STOP = new Set('de la el en y a los del las un una se que por con su al lo como mas pero le sus o este esta ese esa es son fue era esto eso entre sobre para sin desde hasta cuando donde quien cual cuyo si no ni también ya tras solo solo cada todo toda todos todas mismo misma muy bien mas más menos pues otro otra otros otras nuestro nuestra nuestros nuestras mi tu tus mis su sus haber tener ser estar hay'.split(/\s+/));

const NUMBER_RE     = /\b\d[\d.,]*\b/;
const PERCENT_RE    = /\b\d[\d.,]*\s*%/;
const MONEY_RE      = /\$\s*\d/;
const YEAR_RE       = /\b(19|20)\d{2}\b/;
const ALL_NUMBER_RE = new RegExp(`${PERCENT_RE.source}|${MONEY_RE.source}|${YEAR_RE.source}|${NUMBER_RE.source}`);

function hasNumbers(text) { return ALL_NUMBER_RE.test(text); }
function wordCount(text) { return text.trim().split(/\s+/).filter(Boolean).length; }
function deburr(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// ─── Schema for structured output ─────────────────────────────────────────────
const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mainQuery','subQueries','keywords','eyebrow','headline','bullets','stat','hasNumbers'],
  properties: {
    mainQuery:  { type: 'string', description: '2-4 word ENGLISH query for Pexels (visual concept that represents the paragraph topic). Examples: "neural network abstract", "data center server room", "person typing laptop"' },
    subQueries: {
      type: 'array',
      items: { type: 'string' },
      description: '1-2 alternative ENGLISH queries (subtopics, different angles). Return between 1 and 2 items.',
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: '1-3 SHORT Spanish keywords in UPPERCASE (≤3 words each), no articles, no punctuation. These overlay on the media. Return between 1 and 3 items.',
    },
    eyebrow:  { type: 'string', description: '1-3 word category label in Spanish UPPERCASE (e.g. "DECISIÓN 1", "CONTEXTO", "DATO CLAVE")' },
    headline: { type: 'string', description: 'Spanish summary ≤8 words, no trailing punctuation' },
    bullets: {
      type: 'array',
      items: { type: 'string' },
      description: '0-3 key ideas in Spanish, each ≤6 words, no trailing punctuation. Empty array if no relevant bullets.',
    },
    stat: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object', additionalProperties: false,
          required: ['value','unit','label'],
          properties: {
            value: { type: 'string', description: 'Numeric value as displayed (e.g. "40", "175", "5,440")' },
            unit:  { type: 'string', description: 'Unit (e.g. "%", "millones", "mil millones", "años", null-string if none)' },
            label: { type: 'string', description: 'Short Spanish caption ≤8 words' },
          },
        },
      ],
      description: 'Most salient numeric fact in the paragraph, or null if no clear single stat.',
    },
    hasNumbers: { type: 'boolean' },
  },
};

const SYSTEM_PROMPT = `Eres director de arte para un canal de minidocumentales tipo Vox / Veritasium. Tu trabajo: analizar UN párrafo en español y devolver UNA descripción visual estructurada.

Tu salida (JSON) alimenta:
- Búsquedas en Pexels (imágenes/videos) → los campos mainQuery y subQueries deben estar en INGLÉS, ser concretos y visuales. NO conceptos abstractos como "probability" o "complexity"; SÍ cosas filmables como "server data center", "person coding laptop screen", "circuit board macro", "smartphone screen apps", "nokia phone vintage". Piensa: "¿qué imagen exacta busco?"
- Sobreimpresos en pantalla → keywords en español MAYÚSCULAS, sin artículos, máx 3 palabras cada una, ≤3 keywords. Tienen que ser palabras CONCEPTUALMENTE FUERTES, no palabras de relleno. Ej: para "Nokia controló el 40% del mercado en 2007" → ["NOKIA", "40% MERCADO", "2007"]; no ["CONTROLÓ", "MERCADO", "MISMO"].
- Headline = resumen literal ≤8 palabras, sin punto final. No filosofía: hecho específico.
- Bullets (0-3) = ideas concretas ≤6 palabras cada una, sin punto final, sin redundar el headline.
- Stat: SOLO si hay UN dato numérico dominante (porcentaje, año, monto, métrica). Si el párrafo tiene varios números, elige el más impactante. Si no hay número claro, stat = null.

Reglas estrictas:
- mainQuery y subQueries siempre en INGLÉS (Pexels indexa mejor en inglés).
- Una imagen genérica vence a una metáfora vaga. Para "alineamiento de modelos" prefiere "ai robot face" o "neural network visualization" sobre "alignment concept".
- Para temas históricos (Nokia, BlackBerry, MySpace, etc.) usa queries específicas: "nokia 3310", "blackberry phone keyboard", "old computer crt monitor".
- Devuelve SOLO el JSON. Nada de texto adicional, sin markdown, sin comentarios.`;

// ─── Anthropic Claude provider ────────────────────────────────────────────────
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
let anthropicClient = null;

function initAnthropic() {
  if (anthropicClient) return anthropicClient;
  if (!Anthropic) throw new Error('@anthropic-ai/sdk no instalado');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY en .env');
  // SDK is exported as default in v0.96+
  const Client = Anthropic.default || Anthropic;
  anthropicClient = new Client();
  return anthropicClient;
}

async function callAnthropic(paragraphText, systemPrompt = SYSTEM_PROMPT) {
  const client = initAnthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
    ],
    output_config: {
      format: { type: 'json_schema', schema: PLAN_SCHEMA },
    },
    messages: [
      { role: 'user', content: `Párrafo:\n"""${paragraphText}"""\n\nDevuelve el JSON.` },
    ],
  });

  // Extract text content (structured outputs come through as text blocks)
  let text = '';
  for (const block of res.content || []) {
    if (block.type === 'text') text += block.text;
  }
  const parsed = JSON.parse(text);
  return parsed;
}

// ─── Ollama provider (legacy fallback) ────────────────────────────────────────
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';
const OLLAMA_TIMEOUT_MS = 90_000;

function callOllama(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: OLLAMA_MODEL, prompt, stream: false,
      options: { temperature: 0, num_predict: 600 },
    });
    const req = http.request(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: OLLAMA_TIMEOUT_MS,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Ollama ${res.statusCode}`));
        try { resolve(JSON.parse(buf).response || ''); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Ollama timeout')); });
    req.write(body); req.end();
  });
}

function ollamaPrompt(text, systemPrompt = SYSTEM_PROMPT) {
  return `${systemPrompt}\n\nPárrafo:\n"""${text}"""\n\nJSON:`;
}

function tryParseJson(text) {
  let t = (text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = t.indexOf('{'), end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  const slice = t.substring(start, end + 1);
  try { return JSON.parse(slice); }
  catch (_) { try { return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1')); } catch (__) { return null; } }
}

// ─── Deterministic fallback ───────────────────────────────────────────────────
function fallbackAnalyze(text) {
  const wc = wordCount(text);
  const hn = hasNumbers(text);

  const tokens = text
    .replace(/[^\wÁÉÍÓÚÑáéíóúñ%$\-\s]/g, ' ')
    .toLowerCase().split(/\s+/)
    .filter(t => t.length > 4 && !STOP.has(t));
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  const keywords = sorted.slice(0, 3).map(([w]) => w.toUpperCase());

  const firstSentence = (text.match(/[^.!?]+/) || [''])[0].trim();
  const headline = firstSentence.split(/\s+/).slice(0, 8).join(' ');

  let stat = null;
  const numMatch = text.match(/\b(\d[\d.,]*)\s*(%|millones?|mil millones?|años?|MB|GB|días?)/i);
  if (numMatch) stat = { value: numMatch[1], unit: numMatch[2], label: headline };

  return {
    mainQuery: 'abstract technology concept',
    subQueries: ['data visualization', 'digital network'],
    keywords,
    eyebrow: hn ? 'DATO' : 'CONTEXTO',
    headline,
    bullets: [],
    stat,
    hasNumbers: hn,
  };
}

// ─── Provider dispatch ────────────────────────────────────────────────────────
async function checkOllama() {
  if (NO_LLM) return false;
  try {
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:11434/api/tags', { timeout: 1500 }, (res) => {
        if (res.statusCode === 200) resolve(); else reject(new Error(`${res.statusCode}`));
        res.resume();
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
    });
    return true;
  } catch (_) { return false; }
}

function anthropicAvailable() {
  return !NO_LLM && Anthropic && !!process.env.ANTHROPIC_API_KEY;
}

async function selectProvider() {
  if (PROVIDER_PREF === 'fallback') return 'fallback';
  if (PROVIDER_PREF === 'anthropic') {
    if (!anthropicAvailable()) throw new Error('Provider anthropic forzado pero falta ANTHROPIC_API_KEY o SDK');
    return 'anthropic';
  }
  if (PROVIDER_PREF === 'ollama') {
    if (!await checkOllama()) throw new Error('Provider ollama forzado pero no responde en :11434');
    return 'ollama';
  }
  // auto
  if (anthropicAvailable()) return 'anthropic';
  if (await checkOllama()) return 'ollama';
  return 'fallback';
}

async function analyzeParagraph(paragraph, provider, systemPrompt = SYSTEM_PROMPT) {
  const cacheFile = path.join(cacheDir, `${paragraph.id}.json`);
  if (!FORCE && fs.existsSync(cacheFile)) {
    try { return { ...JSON.parse(fs.readFileSync(cacheFile, 'utf8')), _source: 'cache' }; }
    catch (_) { /* recompute */ }
  }

  let analysis = null;

  if (provider === 'anthropic') {
    try {
      analysis = await callAnthropic(paragraph.texto, systemPrompt);
      analysis._source = 'anthropic';
    } catch (e) {
      console.log(`   ⚠️  [${paragraph.id}] Anthropic falló: ${e.message}`);
    }
  }

  if (!analysis && provider !== 'fallback') {
    // try ollama if anthropic failed (or if provider was ollama)
    if (provider === 'anthropic' || provider === 'ollama') {
      try {
        const ollamaUp = await checkOllama();
        if (ollamaUp) {
          const raw = await callOllama(ollamaPrompt(paragraph.texto, systemPrompt));
          const parsed = tryParseJson(raw);
          if (parsed && parsed.mainQuery) {
            analysis = { ...parsed, _source: 'ollama' };
          }
        }
      } catch (e) {
        console.log(`   ⚠️  [${paragraph.id}] Ollama falló: ${e.message}`);
      }
    }
  }

  if (!analysis) {
    analysis = { ...fallbackAnalyze(paragraph.texto), _source: 'fallback' };
  }

  // Hard layout heuristic — el LLM solo provee material, el layout lo decide JS
  const wc = wordCount(paragraph.texto);
  const hn = hasNumbers(paragraph.texto);
  if (wc <= 15)        analysis.suggestedLayout = 'keywordOnly';
  else if (hn)         analysis.suggestedLayout = 'dataSplit';
  else if (wc <= 60)   analysis.suggestedLayout = 'splitMedia';
  else                 analysis.suggestedLayout = 'fullBleedMedia';

  fs.writeFileSync(cacheFile, JSON.stringify(analysis, null, 2));
  return analysis;
}

// ─── Assemble plan paragraph ──────────────────────────────────────────────────
function buildSideContent(analysis) {
  if (analysis.stat && analysis.stat.value) {
    return {
      kind: 'stat',
      payload: {
        value: String(analysis.stat.value),
        unit:  analysis.stat.unit || '',
        label: analysis.stat.label || '',
      },
    };
  }
  if (Array.isArray(analysis.bullets) && analysis.bullets.length > 0) {
    return { kind: 'bullets', payload: { items: analysis.bullets.slice(0, 4) } };
  }
  return undefined;
}

function buildMedia(paragraphIndex, paragraphId, analysis) {
  const isVideo = (paragraphIndex % 5) < 3;  // 60% video / 40% image
  const type = isVideo ? 'video' : 'image';
  const ext  = isVideo ? 'mp4' : 'jpg';
  return {
    type,
    query: analysis.mainQuery,
    filename: `parrafo-${paragraphId}.${ext}`,
    orientation: 'landscape',
    pick: 'first',
    perPage: 15,
    focal: 'center',
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// ─── Build channel context block for the LLM prompt ───────────────────────────
function buildChannelContext(memory) {
  const lines = [
    '## CONTEXTO DEL CANAL "CÓDIGO MUERTO"',
    'Estilo visual del canal: fondo #0a0a0f, acento cyan #00d4ff, tipografía JetBrains Mono.',
    'El canal hace autopsia técnica de arquitecturas de software que fallaron.',
  ];

  if (memory.temas_usados && memory.temas_usados.length > 0) {
    lines.push(`\nTEMAS YA CUBIERTOS (no repitas estas referencias en visual queries ni keywords):`
      + `\n${memory.temas_usados.map(t => `  - ${t}`).join('\n')}`);
  }

  if (memory.palabras_clave_agotadas && memory.palabras_clave_agotadas.length > 0) {
    lines.push(`\nKEYWORDS YA SOBREUSADAS (evítalas como keywords en pantalla):`
      + `\n${memory.palabras_clave_agotadas.map(k => `  - ${k}`).join('\n')}`);
  }

  if (memory.estilo_hooks && memory.estilo_hooks.length > 0) {
    lines.push(`\nESTILOS DE HOOK YA USADOS (varía el enfoque visual, no repitas el mismo patrón):`
      + `\n${memory.estilo_hooks.map(h => `  - ${h}`).join('\n')}`);
  }

  if (memory.mejor_rendimiento && memory.mejor_rendimiento.length > 0) {
    const top = memory.mejor_rendimiento
      .filter(v => v.retention >= 0.6)
      .sort((a, b) => b.retention - a.retention)
      .slice(0, 3);
    if (top.length > 0) {
      lines.push(`\nHOOKS CON MEJOR RETENCIÓN (>60%) — replica este estilo visual cuando sea posible):`
        + `\n${top.map(v => `  - Tema: "${v.tema}" | Hook: ${v.hook_style} | Retención: ${(v.retention * 100).toFixed(0)}%`).join('\n')}`);
    }
  }

  lines.push('\nAplica este contexto para asegurarte de que cada video se siente DIFERENTE al anterior en queries de Pexels, keywords en pantalla y estilo visual.');
  return lines.join('\n');
}

async function main() {
  if (fs.existsSync(planPath) && !FORCE) {
    console.log(`ℹ️  scene-plan.json ya existe en ${planPath}`);
    console.log('   Usa --force para regenerar.');
    process.exit(0);
  }

  // ── Leer memoria del canal e inyectarla en el prompt ──────────────────────
  let effectiveSystemPrompt = SYSTEM_PROMPT;
  try {
    const memory = await readMemory();
    const channelCtx = buildChannelContext(memory);
    effectiveSystemPrompt = `${channelCtx}\n\n${SYSTEM_PROMPT}`;
    if (memory.temas_usados.length > 0) {
      console.log(`🧠 Memoria del canal cargada: ${memory.temas_usados.length} temas previos, ${memory.mejor_rendimiento.length} métricas de retención.`);
    }
  } catch (memErr) {
    console.warn(`⚠️  No se pudo leer channel-memory.json: ${memErr.message}. Continuando sin contexto de canal.`);
  }

  const provider = await selectProvider();
  const label = {
    anthropic: `Anthropic Claude (${ANTHROPIC_MODEL})`,
    ollama:    `Ollama (${OLLAMA_MODEL})`,
    fallback:  'Heurístico determinista',
  }[provider];
  console.log(`🤖 Provider: ${label}`);
  console.log(`📝 Analizando ${guion.length} párrafos para "${projectId}"\n`);

  const paragraphs = [];
  for (let i = 0; i < guion.length; i++) {
    const p = guion[i];
    process.stdout.write(`   [${p.id}] `);
    const analysis = await analyzeParagraph(p, provider, effectiveSystemPrompt);
    const media = buildMedia(i, p.id, analysis);
    const sideContent = buildSideContent(analysis);

    paragraphs.push({
      id: p.id,
      layout: analysis.suggestedLayout,
      media,
      eyebrow: analysis.eyebrow || undefined,
      headline: analysis.headline || undefined,
      keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 3) : [],
      sideContent,
    });

    console.log(`${analysis.suggestedLayout.padEnd(15)} | ${media.type.padEnd(5)} | "${analysis.mainQuery}" (${analysis._source})`);
  }

  const plan = { version: 1, projectId, paragraphs };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

  const counts = paragraphs.reduce((acc, p) => { acc[p.layout] = (acc[p.layout] || 0) + 1; return acc; }, {});
  const mediaCounts = paragraphs.reduce((acc, p) => { acc[p.media.type] = (acc[p.media.type] || 0) + 1; return acc; }, {});
  console.log(`\n✨ Plan generado en ${planPath}`);
  console.log(`   Layouts: ${Object.entries(counts).map(([k,v]) => `${k}=${v}`).join(', ')}`);
  console.log(`   Media:   ${Object.entries(mediaCounts).map(([k,v]) => `${k}=${v}`).join(', ')}`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
