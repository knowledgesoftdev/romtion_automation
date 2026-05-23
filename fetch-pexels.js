#!/usr/bin/env node
/**
 * fetch-pexels.js — descarga imágenes y videos desde Pexels a partir del
 * scene-plan.json de un proyecto.
 *
 * Uso: node fetch-pexels.js <projectId>
 *
 * Lee:
 *   public/projects/<projectId>/scene-plan.json
 *     { paragraphs: [ { id, media: { type, query, filename, orientation, pick } } ] }
 *
 * Descarga a:
 *   public/projects/<projectId>/images/<filename>
 *   public/projects/<projectId>/videos/<filename>
 *
 * Idempotente: si el archivo destino ya existe, lo salta.
 * Cache por hash de (query+type+orientation+pick) en .cache/ del proyecto
 * para evitar duplicar llamadas a la API en reruns.
 */

require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const crypto = require('crypto');

const PEXELS_API_KEY = process.env.PEXELS_API;
if (!PEXELS_API_KEY) {
  console.error('❌ Falta PEXELS_API en .env');
  process.exit(1);
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('❌ Uso: node fetch-pexels.js <projectId>');
  process.exit(1);
}

let channelId = 'codigo-muerto';
try {
  const activeFile = path.join(__dirname, 'active-channel.json');
  if (fs.existsSync(activeFile)) {
    channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
  }
} catch (_) {}

let projectDir = path.join(__dirname, 'public', 'projects', channelId, projectId);
if (!fs.existsSync(projectDir)) {
  projectDir = path.join(__dirname, 'public', 'projects', projectId);
}
const planPath   = path.join(projectDir, 'scene-plan.json');
const imagesDir  = path.join(projectDir, 'images');
const videosDir  = path.join(projectDir, 'videos');
const cacheDir   = path.join(projectDir, '.cache', 'pexels');

let paragraphs = [];

// Prioridad de fuente:
//   1. guion.json con schema multi-element (visual.elements[]) ← nuevo flow
//   2. scene-plan.json (legacy, salida de build-scene-plan.js)
//   3. guion.json con schema viejo (visual.pexels_query directo)
const guionPath = path.join(projectDir, 'guion.json');
let guion = null;
if (fs.existsSync(guionPath)) {
  try { guion = JSON.parse(fs.readFileSync(guionPath, 'utf8')); }
  catch (e) { console.error(`❌ guion.json invalido: ${e.message}`); process.exit(1); }
}

const guionHasMultiElement =
  Array.isArray(guion) &&
  guion.some(p => p?.visual && Array.isArray(p.visual.elements) && p.visual.elements.length > 0);

// 1. Collect from guion.json multi-element if present (for Whiteboard)
if (guionHasMultiElement) {
  console.log(`✅ Detectado guion.json (schema multi-element). Agregando imágenes del Whiteboard.`);
  for (const p of guion) {
    const v = p.visual;
    if (!v || !Array.isArray(v.elements)) continue;
    const pexelsEls = v.elements.filter(el => el && el.type === 'pexels_image' && el.query);
    for (const el of pexelsEls) {
      paragraphs.push({
        id: `${p.id}-${el.id}`,
        media: {
          type:        'image',
          query:       el.query,
          filename:    `parrafo-${p.id}-${el.id}.jpg`,
          orientation: 'landscape',
          pick:        'first',
        },
      });
    }
  }
}

// 2. Collect from scene-plan.json if present (for VideoEngine)
if (fs.existsSync(planPath)) {
  try {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    if (plan.paragraphs && Array.isArray(plan.paragraphs)) {
      console.log(`ℹ️  Detectado scene-plan.json. Agregando assets del VideoEngine.`);
      for (const p of plan.paragraphs) {
        if (p && p.media) {
          paragraphs.push(p);
        }
      }
    }
  } catch (e) {
    console.error(`⚠️  Error al leer scene-plan.json: ${e.message}`);
  }
}

// 3. Fallback to legacy single-visual guion.json ONLY if no other media was collected
if (paragraphs.length === 0 && guion) {
  console.log(`ℹ️  Usando guion.json (schema viejo single-visual) como fallback.`);
  for (const p of guion) {
    const v = p.visual;
    if (!v || !v.pexels_query) continue;
    const ext = v.asset_type === 'video' ? 'mp4' : 'jpg';
    paragraphs.push({
      id: p.id,
      media: {
        type:        v.asset_type === 'video' ? 'video' : 'image',
        query:       v.pexels_query,
        filename:    `parrafo-${p.id}.${ext}`,
        orientation: 'landscape',
        pick:        'first',
      },
    });
  }
}

if (paragraphs.length === 0) {
  console.error(`❌ Faltan archivos del proyecto: no se encontró guion.json ni scene-plan.json con datos de media`);
  process.exit(1);
}

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(cacheDir,  { recursive: true });

// ─── Pexels API ───────────────────────────────────────────────────────────────
function pexelsRequest(urlString) {
  return new Promise((resolve, reject) => {
    https.get(urlString, { headers: { Authorization: PEXELS_API_KEY } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Pexels ${res.statusCode}: ${body.slice(0,200)}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pexelsRequestWithRetry(urlString, retries = 5, delayMs = 10000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Pequeño retraso obligatorio entre peticiones para ser gentiles con el rate limit
      await sleep(250);
      return await pexelsRequest(urlString);
    } catch (err) {
      const is429 = err.message.includes('429');
      if (is429 && attempt < retries) {
        const backoff = delayMs * attempt;
        console.warn(`   ⚠️ [Pexels 429] Límite superado. Reintentando intento ${attempt}/${retries} en ${(backoff/1000).toFixed(0)}s...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

// Pexels IDs and final URLs already taken in this run — used to skip duplicate
// assets even when distinct queries return the same item, or distinct items
// share the same underlying file. Seeded from the URL cache below so reruns
// over a partially-downloaded project still avoid collisions.
const usedPexelsIds    = new Set();
const usedUrls         = new Set();
const usedWikimediaUrls = new Set(); // tracks Wikimedia URLs already downloaded

function pickStartIndex(pick, total, paragraphIdx) {
  if (total <= 0) return -1;
  // Default 'first' rotates by paragraph index so identical queries across
  // paragraphs land on different results.
  if (pick === undefined || pick === null || pick === 'first') {
    return paragraphIdx % total;
  }
  if (pick === 'random') return Math.floor(Math.random() * total);
  const n = Number(pick);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(total - 1, Math.floor(n)));
}

function pickBestVideoFile(video) {
  // Pick the video_file closest to 1280x720, preferring HD and width ≤ 1920.
  const files = (video.video_files || [])
    .filter(f => f.link && (!f.width || f.width <= 1920))
    .sort((a, b) => {
      const score = (f) => {
        const targetW = 1280, targetH = 720;
        const w = f.width || 0, h = f.height || 0;
        const sizeScore = -Math.abs((w * h) - (targetW * targetH));
        const qScore = (f.quality === 'hd' ? 1e8 : f.quality === 'sd' ? 5e7 : 0);
        return sizeScore + qScore;
      };
      return score(b) - score(a);
    });
  return files[0] || null;
}

async function searchImage(query, orientation, pick, perPage, paragraphIdx) {
  if (query.includes('force-fallback')) {
    throw new Error(`Simulated Pexels failure for testing fallback: "${query}"`);
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const data = await pexelsRequestWithRetry(url);
  const photos = data.photos || [];
  if (photos.length === 0) throw new Error(`Sin resultados para "${query}"`);

  const total = photos.length;
  const startIdx = pickStartIndex(pick, total, paragraphIdx);
  for (let offset = 0; offset < total; offset++) {
    const i = (startIdx + offset) % total;
    const photo = photos[i];
    if (usedPexelsIds.has(photo.id)) continue;
    const finalUrl = photo.src.large2x || photo.src.large || photo.src.original;
    if (usedUrls.has(finalUrl)) continue;
    return { url: finalUrl, id: photo.id };
  }
  // All results collide — fall back to the preferred slot to avoid blocking.
  const fallback = photos[startIdx];
  return { url: fallback.src.large2x || fallback.src.large || fallback.src.original, id: fallback.id };
}

async function searchVideo(query, orientation, pick, perPage, paragraphIdx) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`;
  const data = await pexelsRequestWithRetry(url);
  const videos = data.videos || [];
  if (videos.length === 0) throw new Error(`Sin resultados para "${query}"`);

  const total = videos.length;
  const startIdx = pickStartIndex(pick, total, paragraphIdx);
  for (let offset = 0; offset < total; offset++) {
    const i = (startIdx + offset) % total;
    const video = videos[i];
    if (usedPexelsIds.has(video.id)) continue;
    const file = pickBestVideoFile(video);
    if (!file) continue;
    if (usedUrls.has(file.link)) continue;
    return { url: file.link, id: video.id };
  }
  const fallback = videos[startIdx];
  const file = pickBestVideoFile(fallback);
  if (!file) throw new Error(`Sin archivos descargables para "${query}"`);
  return { url: file.link, id: fallback.id };
}

// ─── Wikimedia Commons fallback ─────────────────────────────────────────────
/**
 * Search Wikimedia Commons for images matching `query`.
 * Returns { url, title } of the first suitable result that hasn't been used yet.
 * Filters:
 *   - Only JPEG / PNG (no SVG, no GIF logos)
 *   - Width >= 800px (real photos, not icons)
 *   - Filename must not contain logo|icon|flag|coat_of_arms|wikipedia|wikimedia
 */
async function searchWikimedia(query, paragraphIdx) {
  const WIKIMEDIA_USER_AGENT = 'PhantomDirective-VideoEngine/1.0 (https://github.com/knowledgesoftdev/romtion_automation; contact@phantomdirective.com)';
  const BLOCKED_TERMS = /logo|icon|flag|coat_of_arms|wikipedia|wikimedia|seal_of|emblem/i;

  const params = new URLSearchParams({
    action:      'query',
    generator:   'search',
    gsrsearch:   query,
    gsrnamespace:'6',       // File: namespace only
    gsrlimit:    '20',
    prop:        'imageinfo',
    iiprop:      'url|mime|size|width',
    format:      'json',
    origin:      '*',
  });

  const apiUrl = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;

  const data = await new Promise((resolve, reject) => {
    https.get(apiUrl, {
      headers: {
        'User-Agent': WIKIMEDIA_USER_AGENT,
        'Accept': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200)
          return reject(new Error(`Wikimedia ${res.statusCode}: ${body.slice(0, 120)}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  const pages = (data.query && data.query.pages) ? Object.values(data.query.pages) : [];
  if (pages.length === 0) throw new Error(`Wikimedia: sin resultados para "${query}"`);

  // Sort by page index so results are stable across runs
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));

  // Rotate start index by paragraphIdx (same trick as Pexels)
  const startIdx = paragraphIdx % pages.length;

  for (let offset = 0; offset < pages.length; offset++) {
    const page = pages[(startIdx + offset) % pages.length];
    const info = page.imageinfo && page.imageinfo[0];
    if (!info) continue;

    const mime  = (info.mime || '').toLowerCase();
    const width = info.width || 0;
    const url   = info.url || '';
    const title = (page.title || '').toLowerCase();

    // Quality filters
    if (!['image/jpeg', 'image/png'].includes(mime)) continue;
    if (width < 800) continue;
    if (BLOCKED_TERMS.test(title)) continue;
    if (usedWikimediaUrls.has(url)) continue;

    return { url, title: page.title || '' };
  }

  throw new Error(`Wikimedia: sin resultados válidos para "${query}" (todos filtrados o duplicados)`);
}

async function searchWikimediaWithFallback(query, paragraphIdx) {
  try {
    return await searchWikimedia(query, paragraphIdx);
  } catch (err) {
    console.warn(`   ⚠️  Wikimedia falló para "${query}". Probando búsqueda simplificada...`);
    // Buscar palabras clave simples relacionadas a tecnología e informática como fallback
    const keywords = ['computer', 'programming', 'source code', 'technology', 'server room', 'datacenter', 'internet'];
    const fallbackQuery = keywords[paragraphIdx % keywords.length];
    console.log(`   🔄 Wikimedia: buscando con término genérico: "${fallbackQuery}"`);
    return await searchWikimedia(fallbackQuery, paragraphIdx);
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'PhantomDirective-VideoEngine/1.0 (https://github.com/knowledgesoftdev/romtion_automation; contact@phantomdirective.com)'
      }
    };
    const handler = (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`Download ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    };
    https.get(url, options, handler).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
function cacheKey({ type, query, orientation, pick }) {
  return crypto.createHash('sha1')
    .update(JSON.stringify({ type, query, orientation: orientation || 'landscape', pick: pick ?? 'first' }))
    .digest('hex');
}

function cachedEntry(key) {
  const file = path.join(cacheDir, key + '.json');
  if (!fs.existsSync(file)) return null;
  try {
    const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
    return obj.url ? { url: obj.url, id: obj.id ?? null } : null;
  } catch (_) { return null; }
}

function saveCachedEntry(key, url, id) {
  fs.writeFileSync(path.join(cacheDir, key + '.json'), JSON.stringify({ url, id, ts: Date.now() }));
}

// Walk existing cache files so that reruns honour IDs and URLs already consumed.
function seedUsedIdsFromCache() {
  if (!fs.existsSync(cacheDir)) return;
  for (const f of fs.readdirSync(cacheDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const obj = JSON.parse(fs.readFileSync(path.join(cacheDir, f), 'utf8'));
      if (obj.id)  usedPexelsIds.add(obj.id);
      if (obj.url) usedUrls.add(obj.url);
      // Also seed Wikimedia URLs so reruns don't re-use them
      if (obj.source === 'wikimedia' && obj.url) usedWikimediaUrls.add(obj.url);
    } catch (_) {}
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let ok = 0, skip = 0, fail = 0;
  const startedAt = Date.now();

  console.log(`📥 Descargando media de Pexels para "${projectId}"\n`);
  seedUsedIdsFromCache();

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (!p.media) { console.log(`   ⏭  [${p.id}] sin media`); skip++; continue; }
    // perPage default raised to 15 so dedup has enough candidates when several
    // paragraphs share a query and the top-5 results overlap.
    const { type = 'image', query, filename, orientation = 'landscape', pick = 'first', perPage = 15 } = p.media;
    if (!query || !filename) {
      console.log(`   ⚠️  [${p.id}] media incompleta (query/filename), saltando`);
      skip++;
      continue;
    }

    const targetDir = type === 'video' ? videosDir : imagesDir;
    const outPath = path.join(targetDir, filename);

    if (fs.existsSync(outPath)) {
      console.log(`   ⏭  [${p.id}] ${type}/${filename} (ya existe)`);
      skip++;
      continue;
    }

    const key = cacheKey({ type, query, orientation, pick });
    const cached = cachedEntry(key);

    try {
      let url, id;
      if (cached) {
        url = cached.url;
        id = cached.id;
        console.log(`   💾 [${p.id}] cache hit URL`);
      } else {
        const result = type === 'video'
          ? await searchVideo(query, orientation, pick, perPage, i)
          : await searchImage(query, orientation, pick, perPage, i);
        url = result.url;
        id = result.id;
        saveCachedEntry(key, url, id);
      }
      if (id)  usedPexelsIds.add(id);
      if (url) usedUrls.add(url);
      await download(url, outPath);
      console.log(`   ✅ [${p.id}] ${type}/${filename}  ←  Pexels: "${query}"`);
      ok++;
    } catch (pexelsErr) {
      // ── Wikimedia Commons fallback (images only) ────────────────────────────
      // Only attempt for images — Wikimedia has no video assets.
      if (type === 'image') {
        try {
          process.stdout.write(`   🔄 [${p.id}] Pexels sin resultados, probando Wikimedia Commons...\n`);
          const cleanedQuery = query.replace('force-fallback', '').trim();
          const wikiResult = await searchWikimediaWithFallback(cleanedQuery, i);
          usedWikimediaUrls.add(wikiResult.url);
          // Cache the Wikimedia URL so reruns don't refetch it
          saveCachedEntry(key + '-wiki', wikiResult.url, null);
          // Patch the cache to mark source for seedUsedIdsFromCache
          fs.writeFileSync(
            path.join(cacheDir, key + '-wiki.json'),
            JSON.stringify({ url: wikiResult.url, id: null, source: 'wikimedia', ts: Date.now() })
          );
          await download(wikiResult.url, outPath);
          console.log(`   ✅ [${p.id}] ${type}/${filename}  ←  Wikimedia: "${cleanedQuery}"`);
          ok++;
        } catch (wikiErr) {
          const cleanedQuery = query.replace('force-fallback', '').trim();
          console.log(`   ❌ [${p.id}] ${type}/${filename}  ←  "${cleanedQuery}"`);
          console.log(`        Pexels: ${pexelsErr.message}`);
          console.log(`        Wikimedia: ${wikiErr.message}`);
          fail++;
        }
      } else {
        // Fallback para videos: buscar un video ya descargado con éxito en la carpeta de videos y copiarlo
        try {
          console.warn(`   ⚠️ [${p.id}] Video falló en Pexels. Buscando un video local como fallback...`);
          const localVideos = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4') && f !== filename);
          if (localVideos.length > 0) {
            const fallbackSrc = path.join(videosDir, localVideos[0]);
            fs.copyFileSync(fallbackSrc, outPath);
            console.log(`   ✅ [${p.id}] ${type}/${filename}  ←  Copia Local (Fallback): "${localVideos[0]}"`);
            ok++;
          } else {
            throw new Error('No hay videos locales para usar como fallback');
          }
        } catch (localErr) {
          console.log(`   ❌ [${p.id}] ${type}/${filename}  ←  "${query}"  :: Pexels: ${pexelsErr.message} | Local: ${localErr.message}`);
          fail++;
        }
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✨ Listo en ${elapsed}s   OK:${ok}  skip:${skip}  fail:${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  process.exit(1);
});
