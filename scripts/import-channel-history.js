#!/usr/bin/env node
/**
 * scripts/import-channel-history.js
 * Importa TODOS los videos de tu canal de YouTube y registra sus
 * métricas en channel-memory.json de una sola pasada.
 *
 * Requiere en .env:
 *   YOUTUBE_API_KEY=...
 *   YOUTUBE_CHANNEL_ID=UCxxxx...  (o pásalo como argumento)
 *
 * Uso:
 *   node scripts/import-channel-history.js
 *   node scripts/import-channel-history.js UCxxxxxxxxxxxxxxxxxxxxx
 */

require('dotenv').config();
const { readMemory, saveMemory } = require('../utils/memory');

// ── Args / Config ──────────────────────────────────────────────────────────────
const channelId = process.argv[2] || process.env.YOUTUBE_CHANNEL_ID;
const API_KEY   = process.env.YOUTUBE_API_KEY;

if (!channelId) {
  console.error('❌ Debes proveer el Channel ID de YouTube.');
  console.error('   Uso: node scripts/import-channel-history.js UCxxxxxxxxxxxxxxxxxxxxx');
  console.error('   O agrega YOUTUBE_CHANNEL_ID en tu .env');
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ Falta YOUTUBE_API_KEY en el archivo .env');
  process.exit(1);
}

// ── Obtener lista de videos del canal ──────────────────────────────────────────
async function fetchAllVideoIds(chId) {
  const videoIds = [];
  let pageToken  = '';

  console.log('🔍 Obteniendo lista de videos del canal...');

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part',       'snippet');
    url.searchParams.set('channelId',  chId);
    url.searchParams.set('type',       'video');
    url.searchParams.set('order',      'date');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key',        API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouTube Search API respondió ${res.status}: ${body}`);
    }

    const data  = await res.json();
    const items = data.items || [];

    for (const item of items) {
      videoIds.push({
        id:    item.id.videoId,
        title: item.snippet.title,
        fecha: item.snippet.publishedAt,
      });
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return videoIds;
}

// ── Obtener estadísticas de múltiples videos en una sola llamada ───────────────
async function fetchStatsBatch(ids) {
  // La API acepta hasta 50 IDs en una sola llamada
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const allStats = {};

  for (const chunk of chunks) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'statistics,snippet');
    url.searchParams.set('id',   chunk.join(','));
    url.searchParams.set('key',  API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouTube Videos API respondió ${res.status}: ${body}`);
    }

    const data = await res.json();
    for (const item of data.items || []) {
      allStats[item.id] = {
        title: item.snippet.title,
        views: parseInt(item.statistics.viewCount  || '0', 10),
        likes: parseInt(item.statistics.likeCount  || '0', 10),
      };
    }
  }

  return allStats;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   📥 Importando historial del canal de YouTube   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n📌 Channel ID: ${channelId}\n`);

  // 1. Listar todos los videos
  let videos;
  try {
    videos = await fetchAllVideoIds(channelId);
  } catch (err) {
    console.error(`\n❌ No se pudieron listar los videos: ${err.message}`);
    process.exit(1);
  }

  if (videos.length === 0) {
    console.log('⚠️  No se encontraron videos en el canal.');
    process.exit(0);
  }

  console.log(`✅ ${videos.length} video(s) encontrados:\n`);
  videos.forEach((v, i) => console.log(`   ${i + 1}. [${v.id}] ${v.title}`));

  // 2. Obtener estadísticas en batch
  console.log('\n📊 Obteniendo estadísticas de todos los videos...');
  let stats;
  try {
    stats = await fetchStatsBatch(videos.map(v => v.id));
  } catch (err) {
    console.error(`\n❌ No se pudieron obtener estadísticas: ${err.message}`);
    process.exit(1);
  }

  // 3. Leer memoria actual
  const memory = await readMemory();

  // 4. Procesar cada video
  let nuevos   = 0;
  let actualizados = 0;

  for (const video of videos) {
    const s = stats[video.id];
    if (!s) {
      console.log(`   ⚠️  Sin estadísticas para ${video.id} — saltando`);
      continue;
    }

    // Agregar tema a temas_usados si no existe
    const temaNorm = s.title.trim().toLowerCase();
    if (!memory.temas_usados.some(t => t.toLowerCase().trim() === temaNorm)) {
      memory.temas_usados.push(s.title.trim());
    }

    // Construir entrada de rendimiento
    const perfEntry = {
      tema:       s.title,
      video_id:   video.id,
      retention:  0,         // Sin OAuth2 no tenemos retención real
      ctr:        0,
      views:      s.views,
      likes:      s.likes,
      hook_style: 'por definir',
      fecha:      video.fecha,
    };

    // Actualizar o insertar
    const existingIdx = memory.mejor_rendimiento.findIndex(v => v.video_id === video.id);
    if (existingIdx >= 0) {
      // Preservar hook_style y retention si ya existen
      perfEntry.hook_style = memory.mejor_rendimiento[existingIdx].hook_style || 'por definir';
      perfEntry.retention  = memory.mejor_rendimiento[existingIdx].retention  || 0;
      memory.mejor_rendimiento[existingIdx] = perfEntry;
      actualizados++;
    } else {
      memory.mejor_rendimiento.push(perfEntry);
      nuevos++;
    }

    console.log(`   ✅ ${s.title} — ${s.views.toLocaleString()} views / ${s.likes.toLocaleString()} likes`);
  }

  // 5. Guardar memoria
  await saveMemory(memory);

  // 6. Resumen
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                  ✅ Importación completa         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  📹 Videos procesados:   ${videos.length}`);
  console.log(`  ➕ Nuevos registros:    ${nuevos}`);
  console.log(`  🔄 Actualizados:        ${actualizados}`);
  console.log(`  🏷️  Temas en memoria:   ${memory.temas_usados.length}`);
  console.log('\n💡 Tip: Usa "node scripts/analyze-performance.js <videoId> --hook-style=\'estilo\'"');
  console.log('   para añadir el hook_style a cada video manualmente.\n');
}

main().catch(err => {
  console.error(`\n❌ Error fatal: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
