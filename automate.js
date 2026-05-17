/**
 * automate.js — Orquestador inteligente para "Código Muerto"
 *
 * Uso: node automate.js "Nombre del tema"
 *
 * Pasos:
 *   1. Verificar que el tema no fue usado antes (channel-memory.json)
 *   2. Crear proyecto + parsear guion  → valida guion.json
 *   3. Generar audio + timings         → valida timing.json y duración ≤ 720s
 *   4. Construir scene-plan (IA)       → valida scene-plan.json
 *   5. Descargar media de Pexels       → valida que existen archivos
 *   6. Actualizar memoria del canal
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { isTopicUsed, updateAfterPublish } = require('./utils/memory');

// ── Configuración ──────────────────────────────────────────────────────────────
const PROJECTS_DIR   = path.join(__dirname, 'public', 'projects');
const SERVER_BASE    = 'http://localhost:5000';
const MAX_DURATION_S = 720; // 12 minutos máximo

// ── Helpers de consola ─────────────────────────────────────────────────────────
const log = {
  step:    (msg) => console.log(`\n🔷 ${msg}`),
  ok:      (msg) => console.log(`   ✅ ${msg}`),
  warn:    (msg) => console.log(`   ⚠️  ${msg}`),
  error:   (msg) => console.error(`\n❌ ERROR: ${msg}`),
  info:    (msg) => console.log(`   ℹ️  ${msg}`),
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// ── Validaciones ───────────────────────────────────────────────────────────────

/**
 * Verifica que un archivo JSON existe y es válido.
 * @param {string} filePath
 * @returns {object} El objeto parseado.
 */
function requireJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`JSON inválido en ${filePath}: ${e.message}`);
  }
}

/**
 * Verifica que una carpeta tiene al menos 1 archivo de media (mp4 o jpg).
 * @param {string} dir
 * @returns {number} Cantidad de archivos encontrados.
 */
function countMediaFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter(
    (e) => e.isFile() && /\.(mp4|jpg|jpeg|png|webm)$/i.test(e.name)
  ).length;
}

/**
 * Calcula la duración total en segundos a partir de un timing.json.
 * @param {object} timing
 * @returns {number}
 */
function totalDuration(timing) {
  let maxEnd = 0;
  for (const key of Object.keys(timing)) {
    const t = timing[key];
    if (!t) continue;
    const end = (t.start || 0) + (t.duration || 0);
    if (end > maxEnd) maxEnd = end;
  }
  return maxEnd;
}

// ── Pasos del orquestador ──────────────────────────────────────────────────────

/**
 * PASO 1: Crear el proyecto enviando el guion al servidor Express.
 * Requiere que exista public/projects/<id>/guion.json al terminar.
 */
async function stepCreateProject(projectId, rawScript) {
  log.step(`[1/4] Creando proyecto "${projectId}"...`);

  // Petición HTTP al servidor
  const res = await fetch(`${SERVER_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectId, rawScript }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`El servidor rechazó crear el proyecto: ${body.error || res.statusText}`);
  }

  const data = await res.json();

  // Validar que guion.json existe
  const guionPath = path.join(PROJECTS_DIR, projectId, 'guion.json');
  const guion = requireJson(guionPath);
  if (!Array.isArray(guion) || guion.length === 0) {
    throw new Error('guion.json está vacío o no es un array. Revisa el script de entrada.');
  }

  log.ok(`Proyecto creado. Párrafos parseados: ${guion.length}`);
  return guion;
}

/**
 * PASO 2: Generar audio y timing via servidor Express.
 * Valida que timing.json exista y que la duración total no supere MAX_DURATION_S.
 */
async function stepGenerateAudio(projectId) {
  log.step(`[2/4] Generando audio y timing para "${projectId}"...`);
  log.info('Este paso puede tardar varios minutos dependiendo del tamaño del guion.');

  const res = await fetch(`${SERVER_BASE}/api/projects/${projectId}/generate-audio`, {
    method: 'POST',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Error generando audio: ${body.error || res.statusText}`);
  }

  // Validar timing.json
  const timingPath = path.join(PROJECTS_DIR, projectId, 'timing.json');
  const timing = requireJson(timingPath);

  const durationSec = totalDuration(timing);
  if (durationSec === 0) {
    throw new Error('timing.json no contiene tiempos válidos. Revisa generate-audio.js.');
  }
  if (durationSec > MAX_DURATION_S) {
    throw new Error(
      `El video tiene ${durationSec.toFixed(1)}s, supera el límite de ${MAX_DURATION_S}s (${(MAX_DURATION_S/60).toFixed(0)} min). Divide el guion.`
    );
  }

  log.ok(`Audio generado. Duración total: ${durationSec.toFixed(1)}s (${(durationSec/60).toFixed(1)} min)`);
  return timing;
}

/**
 * PASO 3: Generar el scene-plan con Claude (o fallback).
 * Valida que scene-plan.json exista al terminar.
 */
async function stepBuildScenePlan(projectId) {
  log.step(`[3/4] Generando scene-plan con IA para "${projectId}"...`);

  const res = await fetch(`${SERVER_BASE}/api/projects/${projectId}/scene-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: false }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Error generando scene-plan: ${body.error || res.statusText}`);
  }

  // Validar scene-plan.json
  const planPath = path.join(PROJECTS_DIR, projectId, 'scene-plan.json');
  const plan = requireJson(planPath);
  if (!plan.paragraphs || plan.paragraphs.length === 0) {
    throw new Error('scene-plan.json no contiene párrafos. Algo falló en el análisis.');
  }

  log.ok(`Scene-plan generado. Escenas: ${plan.paragraphs.length}`);
  return plan;
}

/**
 * PASO 4: Descargar media de Pexels.
 * Valida que se hayan descargado archivos en images/ o videos/.
 */
async function stepFetchMedia(projectId) {
  log.step(`[4/4] Descargando media de Pexels para "${projectId}"...`);

  const res = await fetch(`${SERVER_BASE}/api/projects/${projectId}/fetch-media`, {
    method: 'POST',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Error descargando media: ${body.error || res.statusText}`);
  }

  const projectDir  = path.join(PROJECTS_DIR, projectId);
  const imagesCount = countMediaFiles(path.join(projectDir, 'images'));
  const videosCount = countMediaFiles(path.join(projectDir, 'videos'));
  const total = imagesCount + videosCount;

  if (total === 0) {
    log.warn('No se encontraron archivos de media descargados. Verifica PEXELS_API_KEY en .env.');
    // No lanzamos error porque el video puede renderizarse sin media externa
  } else {
    log.ok(`Media descargada: ${videosCount} videos, ${imagesCount} imágenes`);
  }

  return { imagesCount, videosCount };
}

// ── Orquestador principal ──────────────────────────────────────────────────────
async function automate(topic) {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     🎬 CÓDIGO MUERTO — Orquestador de Videos     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!topic || topic.trim() === '') {
    log.error('Debes proveer un tema.');
    console.log('   Uso: node automate.js "Nombre del Tema"');
    process.exit(1);
  }

  const projectId = slugify(topic);
  console.log(`\n📌 Tema:       ${topic}`);
  console.log(`📁 Project ID: ${projectId}`);

  // ── Verificar si el tema ya fue usado ─────────────────────────────────────
  log.step('Verificando memoria del canal...');
  try {
    const used = await isTopicUsed(topic);
    if (used) {
      log.error(`El tema "${topic}" ya fue utilizado en un video anterior.`);
      console.log('   Revisa channel-memory.json → temas_usados para ver la lista completa.');
      process.exit(1);
    }
    log.ok('Tema nuevo. No hay conflicto con videos anteriores.');
  } catch (memErr) {
    log.warn(`No se pudo verificar la memoria: ${memErr.message}. Continuando de todas formas.`);
  }

  // ── Verificar que el servidor está corriendo ───────────────────────────────
  log.step('Verificando conexión con el servidor Express...');
  try {
    const ping = await fetch(`${SERVER_BASE}/api/projects`);
    if (!ping.ok) throw new Error(`Status ${ping.status}`);
    log.ok(`Servidor activo en ${SERVER_BASE}`);
  } catch (e) {
    log.error(`No se puede conectar al servidor en ${SERVER_BASE}. ¿Está corriendo con "npm run server"?`);
    process.exit(1);
  }

  // ── Verificar que existe el guion raw ─────────────────────────────────────
  const rawScriptPath = path.join(PROJECTS_DIR, projectId, 'full_script.txt');
  let rawScript = '';
  if (fs.existsSync(rawScriptPath)) {
    rawScript = fs.readFileSync(rawScriptPath, 'utf8');
    log.info('Usando full_script.txt existente del proyecto.');
  } else {
    log.error(`No existe ${rawScriptPath}.`);
    console.log(`   Por favor, crea el proyecto desde el dashboard y pega el guion completo,`);
    console.log(`   o crea manualmente: ${rawScriptPath}`);
    process.exit(1);
  }

  // ── Ejecutar pasos en orden ────────────────────────────────────────────────
  try {
    await stepCreateProject(projectId, rawScript);
    await stepGenerateAudio(projectId);
    await stepBuildScenePlan(projectId);
    await stepFetchMedia(projectId);
  } catch (err) {
    log.error(err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }

  // ── Activar proyecto ───────────────────────────────────────────────────────
  try {
    await fetch(`${SERVER_BASE}/api/projects/${projectId}/activate`, { method: 'POST' });
    log.ok(`Proyecto "${projectId}" activado como proyecto activo en Remotion.`);
  } catch (e) {
    log.warn('No se pudo activar el proyecto automáticamente. Hazlo manualmente desde el dashboard.');
  }

  // ── Actualizar memoria del canal ───────────────────────────────────────────
  try {
    await updateAfterPublish(topic, projectId);
  } catch (memErr) {
    log.warn(`No se pudo actualizar la memoria del canal: ${memErr.message}`);
  }

  // ── Resumen final ──────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  🎉 ¡Proyecto "${projectId}" listo!`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\n📺 Para previsualizar en Remotion Studio:');
  console.log('   npm run dev\n');
  console.log('🎬 Para renderizar el video final:');
  console.log(`   npx remotion render VideoEngine out/${projectId}.mp4\n`);
}

// ── Entry point ────────────────────────────────────────────────────────────────
const topic = process.argv.slice(2).join(' ');
automate(topic);
