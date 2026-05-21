/**
 * utils/memory.js
 * Gestiona la memoria persistente del canal "Código Muerto".
 * Todas las funciones son async y usan try/catch para manejar errores.
 */

const fs   = require('fs');
const path = require('path');

const ACTIVE_CHANNEL_FILE = path.join(__dirname, '..', 'active-channel.json');

function getActiveChannelId() {
  try {
    if (fs.existsSync(ACTIVE_CHANNEL_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVE_CHANNEL_FILE, 'utf8'));
      return data.channelId || 'codigo-muerto';
    }
  } catch (_) {}
  return 'codigo-muerto';
}

function getMemoryPath() {
  const channelId = getActiveChannelId();
  const channelMemoryPath = path.join(__dirname, '..', 'channels', channelId, 'channel-memory.json');
  
  // Fallback: si es codigo-muerto y el archivo no está en channels, pero sí en la raíz, úsalo
  if (channelId === 'codigo-muerto' && !fs.existsSync(channelMemoryPath)) {
    const rootMemory = path.join(__dirname, '..', 'channel-memory.json');
    if (fs.existsSync(rootMemory)) {
      return rootMemory;
    }
  }
  
  // Asegurar que la carpeta del canal exista
  const channelDir = path.dirname(channelMemoryPath);
  if (!fs.existsSync(channelDir)) {
    fs.mkdirSync(channelDir, { recursive: true });
  }

  return channelMemoryPath;
}

/**
 * Estructura por defecto. Se usa cuando el archivo no existe o está corrupto.
 */
const DEFAULT_MEMORY = {
  temas_usados:              [],
  palabras_clave_agotadas:   [],
  mejor_rendimiento:         [],
  estilo_hooks:              [],
  ultima_publicacion:        '',
  total_videos:              0,
};

/**
 * readMemory() → lee y parsea channel-memory.json.
 * Si el archivo no existe o está corrupto, devuelve la estructura por defecto.
 * @returns {Promise<object>}
 */
async function readMemory() {
  try {
    const memPath = getMemoryPath();
    if (!fs.existsSync(memPath)) {
      return { ...DEFAULT_MEMORY };
    }
    const raw = fs.readFileSync(memPath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return { ...DEFAULT_MEMORY };
  }
}

/**
 * saveMemory(data) → serializa y guarda channel-memory.json.
 * @param {object} data - El objeto completo de memoria a persistir.
 * @returns {Promise<void>}
 */
async function saveMemory(data) {
  try {
    const memPath = getMemoryPath();
    fs.writeFileSync(memPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`[memory] No se pudo guardar channel-memory.json: ${err.message}`);
  }
}

/**
 * isTopicUsed(tema) → retorna true si el tema ya fue registrado como usado.
 * La comparación es insensible a mayúsculas/minúsculas y espacios extras.
 * @param {string} tema
 * @returns {Promise<boolean>}
 */
async function isTopicUsed(tema) {
  try {
    const memory = await readMemory();
    const normalized = tema.trim().toLowerCase();
    return memory.temas_usados.some(
      (t) => t.toLowerCase().trim() === normalized
    );
  } catch (err) {
    console.warn(`[memory] Error verificando tema: ${err.message}`);
    return false;
  }
}

/**
 * updateAfterPublish(tema, projectId) → actualiza la memoria del canal
 * después de que un proyecto fue publicado exitosamente.
 * - Agrega el tema a temas_usados (si no está ya).
 * - Incrementa total_videos.
 * - Actualiza ultima_publicacion con la fecha actual.
 * @param {string} tema
 * @param {string} projectId
 * @returns {Promise<object>} La memoria actualizada.
 */
async function updateAfterPublish(tema, projectId) {
  try {
    const memory = await readMemory();

    // Agregar tema si no existe
    const normalized = tema.trim().toLowerCase();
    if (!memory.temas_usados.some((t) => t.toLowerCase().trim() === normalized)) {
      memory.temas_usados.push(tema.trim());
    }

    memory.total_videos        = (memory.total_videos || 0) + 1;
    memory.ultima_publicacion  = new Date().toISOString();

    await saveMemory(memory);
    console.log(`✅ [memory] Memoria actualizada → "${tema}" | total: ${memory.total_videos} videos`);
    return memory;
  } catch (err) {
    throw new Error(`[memory] Error en updateAfterPublish: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPANSION: aprendizaje del canal end-to-end
//
//  Estos helpers acumulan información en channel-memory.json a medida que el
//  pipeline avanza: parse del guion, render del visual_style, sincronización
//  con YouTube. La función computeInsights() deriva conclusiones útiles de
//  toda la data acumulada sin necesidad de ML — pura agregación estadística.
// ─────────────────────────────────────────────────────────────────────────────

// Heurística simple de sentimiento basada en lexicon. No es ML pero es útil.
const NEGATIVE_TOKENS = ['fracaso','caída','colapso','muerte','perdida','pérdida','obsoleto','obsoleta',
                         'crisis','desastre','error','breach','vulnerabilidad','quiebra','demanda',
                         'fallo','rompió','sabotaje','negó','negaron','demandaron','exitos','exigir',
                         'destrucción','destruir','destruido'];
const POSITIVE_TOKENS = ['éxito','triunfo','revolucionario','innovación','crecimiento','lanzamiento',
                         'pionero','dominaba','dominó','revolucionó','transformó','transformación'];

function lightSentiment(text) {
  const t = (text || '').toLowerCase();
  let neg = 0, pos = 0;
  for (const w of NEGATIVE_TOKENS) if (t.includes(w)) neg++;
  for (const w of POSITIVE_TOKENS) if (t.includes(w)) pos++;
  if (neg > pos + 1) return 'negativo';
  if (pos > neg + 1) return 'positivo';
  return 'neutro';
}

const STOPWORDS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','en','con','por','para','y','o',
  'pero','que','se','su','sus','lo','le','les','no','sí','ser','es','era','fue','sido','este','esta',
  'esto','esos','esas','ese','esa','como','más','menos','muy','tan','todo','todos','toda','todas',
  'hay','había','han','sin','sobre','entre','desde','hacia','hasta','también','ya','aún','solo','sólo',
  'qué','quién','quiénes','cómo','dónde','cuándo','porque','pues','así','aquí','allí','año','años',
  'the','of','and','to','in','that','it','is','was','for','with','as','this'
]);

function extractKeywords(text, limit = 8) {
  const freq = {};
  const tokens = (text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9áéíóúñ\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/**
 * recordParseInsights(projectId, rawScript, parsedGuion)
 * Llamado al final de smartParser para grabar características del guion.
 */
async function recordParseInsights(projectId, rawScript, parsedGuion) {
  try {
    const memory = await readMemory();
    if (!memory.parse_insights) memory.parse_insights = {};

    const text = rawScript || '';
    const wordCount  = text.split(/\s+/).filter(Boolean).length;
    const sceneCount = Array.isArray(parsedGuion) ? parsedGuion.length : 0;
    const keywords   = extractKeywords(text, 10);
    const sentiment  = lightSentiment(text);
    const hasNumbers = /\d{2,}/.test(text);
    const hasDates   = /\b(19|20)\d{2}\b/.test(text);

    memory.parse_insights[projectId] = {
      word_count: wordCount,
      scene_count: sceneCount,
      avg_words_per_scene: sceneCount > 0 ? Math.round(wordCount / sceneCount) : 0,
      keywords,
      sentiment,
      has_numbers: hasNumbers,
      has_dates:   hasDates,
      parsed_at:   new Date().toISOString(),
    };

    await saveMemory(memory);
  } catch (err) {
    console.warn(`[memory] recordParseInsights failed: ${err.message}`);
  }
}

/**
 * recordVisualStyle(projectId, guion)
 * Llamado después de Smart Reparse para registrar qué elementos visuales
 * usa el proyecto (motion_elements, color_moods, asset types).
 */
async function recordVisualStyle(projectId, guion) {
  try {
    const memory = await readMemory();
    if (!memory.visual_styles) memory.visual_styles = {};

    const motion = new Set();
    const moods = new Set();
    const typeCounts = {};
    const pexelsQueries = [];

    for (const s of guion || []) {
      const v = s.visual;
      if (!v) continue;
      if (v.color_mood) moods.add(v.color_mood);
      const els = v.elements || [];
      for (const e of els) {
        if (!e || !e.type) continue;
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
        if (e.type === 'motion_graphic' && e.graphic) motion.add(e.graphic);
        if (e.type === 'pexels_image' && e.query) pexelsQueries.push(e.query);
      }
    }

    memory.visual_styles[projectId] = {
      motion_elements_used: [...motion],
      color_moods:          [...moods],
      asset_types:          typeCounts,
      pexels_queries:       pexelsQueries.slice(0, 15),
      recorded_at:          new Date().toISOString(),
    };

    await saveMemory(memory);
  } catch (err) {
    console.warn(`[memory] recordVisualStyle failed: ${err.message}`);
  }
}

/**
 * computeInsights() → deriva conclusiones útiles de toda la memoria.
 * Pura agregación estadística, no ML.
 *
 * Devuelve:
 *   {
 *     best_hook_patterns: [{ pattern, avg_views, uses }],
 *     topics_agotados: [string],
 *     visual_winners: [{ element, samples, avg_views }],
 *     mood_performance: [{ mood, samples, avg_views }],
 *     recommendations: [string]
 *   }
 */
async function computeInsights() {
  const memory = await readMemory();
  const performance = memory.mejor_rendimiento || [];

  // Hook patterns ordenados por views promedio (cuando hay más de 1 sample, ponderado)
  const hookStats = {};
  for (const v of performance) {
    const h = v.hook_style;
    if (!h) continue;
    if (!hookStats[h]) hookStats[h] = { sum_views: 0, sum_retention: 0, count: 0 };
    hookStats[h].sum_views     += v.views || 0;
    hookStats[h].sum_retention += v.retention || 0;
    hookStats[h].count++;
  }
  const best_hook_patterns = Object.entries(hookStats)
    .map(([pattern, s]) => ({
      pattern,
      avg_views:     Math.round(s.sum_views / s.count),
      avg_retention: +(s.sum_retention / s.count).toFixed(2),
      uses:          s.count,
    }))
    .sort((a, b) => b.avg_views - a.avg_views);

  // Temas agotados: cualquier tema en temas_usados con un proyecto asociado
  const topics_agotados = (memory.temas_usados || []).map(t => t.trim());

  // Cross-ref: para cada visual style (motion_element), promediar performance del proyecto
  const visualStats = {};   // motion_element → { sum_views, sum_retention, count }
  const moodStats = {};     // color_mood → { sum_views, sum_retention, count }

  const styles = memory.visual_styles || {};
  const findVideoByProject = (projectId) => {
    // Heurística: el projectId contiene el tema. Buscar en mejor_rendimiento por inclusión.
    const pid = projectId.toLowerCase();
    return performance.find(v => pid.includes((v.tema || '').toLowerCase().split(' ')[0]));
  };

  for (const [projectId, style] of Object.entries(styles)) {
    const video = findVideoByProject(projectId);
    if (!video) continue;

    for (const me of style.motion_elements_used || []) {
      if (!visualStats[me]) visualStats[me] = { sum_views: 0, sum_retention: 0, count: 0 };
      visualStats[me].sum_views     += video.views || 0;
      visualStats[me].sum_retention += video.retention || 0;
      visualStats[me].count++;
    }
    for (const m of style.color_moods || []) {
      if (!moodStats[m]) moodStats[m] = { sum_views: 0, sum_retention: 0, count: 0 };
      moodStats[m].sum_views     += video.views || 0;
      moodStats[m].sum_retention += video.retention || 0;
      moodStats[m].count++;
    }
  }

  const visual_winners = Object.entries(visualStats)
    .map(([element, s]) => ({
      element,
      samples:       s.count,
      avg_views:     Math.round(s.sum_views / s.count),
      avg_retention: +(s.sum_retention / s.count).toFixed(2),
    }))
    .sort((a, b) => b.avg_views - a.avg_views);

  const mood_performance = Object.entries(moodStats)
    .map(([mood, s]) => ({
      mood,
      samples:       s.count,
      avg_views:     Math.round(s.sum_views / s.count),
      avg_retention: +(s.sum_retention / s.count).toFixed(2),
    }))
    .sort((a, b) => b.avg_views - a.avg_views);

  // Recomendaciones automáticas en lenguaje natural
  const recommendations = [];
  if (best_hook_patterns.length > 0) {
    const top = best_hook_patterns[0];
    recommendations.push(`📈 El hook "${top.pattern}" rinde mejor (${top.avg_views} views promedio, ${top.uses} muestras). Considéralo para el próximo guion.`);
  }
  if (best_hook_patterns.length > 1) {
    const worst = best_hook_patterns[best_hook_patterns.length - 1];
    if (worst.avg_views < (best_hook_patterns[0].avg_views * 0.5)) {
      recommendations.push(`⚠️ El hook "${worst.pattern}" tuvo bajo desempeño (${worst.avg_views} views). Evítalo o cámbialo.`);
    }
  }
  if (visual_winners.length > 0 && visual_winners[0].samples >= 1) {
    const v = visual_winners[0];
    recommendations.push(`🎨 Motion graphic "${v.element}" correlaciona con ${v.avg_views} views promedio. Úsalo en datos clave.`);
  }
  if (mood_performance.length > 0) {
    const m = mood_performance[0];
    recommendations.push(`🎭 Color mood "${m.mood}" funciona mejor en este canal (${m.avg_views} views promedio).`);
  }
  if (topics_agotados.length > 0) {
    recommendations.push(`🚫 Temas ya cubiertos (no repitas): ${topics_agotados.slice(0, 8).join(', ')}.`);
  }

  return {
    total_videos:      memory.total_videos || performance.length,
    total_projects:    Object.keys(memory.parse_insights || {}).length,
    best_hook_patterns,
    topics_agotados,
    visual_winners,
    mood_performance,
    recommendations,
    last_publication:  memory.ultima_publicacion || null,
  };
}

module.exports = {
  readMemory, saveMemory, isTopicUsed, updateAfterPublish,
  recordParseInsights, recordVisualStyle, computeInsights,
  lightSentiment, extractKeywords, getActiveChannelId,
};
