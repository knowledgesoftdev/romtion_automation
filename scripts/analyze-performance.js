#!/usr/bin/env node
/**
 * scripts/analyze-performance.js
 * Consulta YouTube Data API v3 para obtener métricas de un video
 * y actualiza channel-memory.json con los resultados.
 *
 * Requiere en .env:
 *   YOUTUBE_API_KEY=...
 *
 * Uso:
 *   node scripts/analyze-performance.js <videoId> [--hook-style="pregunta retórica"]
 *   node scripts/analyze-performance.js dQw4w9WgXcQ
 *   node scripts/analyze-performance.js dQw4w9WgXcQ --hook-style="dato impactante"
 */

require('dotenv').config();
const { readMemory, saveMemory, getActiveChannelId, detectRemotionFormat } = require('../utils/memory');

// ── Argumentos ─────────────────────────────────────────────────────────────────
const argv      = process.argv.slice(2);
const videoId   = argv.find((a) => !a.startsWith('--'));
const hookArg   = argv.find((a) => a.startsWith('--hook-style='));
const hookStyle = hookArg ? hookArg.split('=').slice(1).join('=') : 'no especificado';

if (!videoId) {
  console.error('❌ Debes proveer un videoId de YouTube.');
  console.error('   Uso: node scripts/analyze-performance.js <videoId> [--hook-style="estilo"]');
  process.exit(1);
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const RETENTION_THRESHOLD = 0.6; // 60%

if (!YOUTUBE_API_KEY) {
  console.error('❌ Falta YOUTUBE_API_KEY en el archivo .env');
  process.exit(1);
}

// ── Función: obtener métricas de YouTube Analytics ─────────────────────────────
/**
 * Obtiene estadísticas básicas (views, likes) desde la YouTube Data API v3.
 * @param {string} id - El ID del video de YouTube.
 * @returns {Promise<{views: number, likes: number, title: string}>}
 */
async function fetchVideoStats(id) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'statistics,snippet');
  url.searchParams.set('id', id);
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API respondió ${res.status}: ${body}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Video "${id}" no encontrado. Verifica el ID.`);
  }

  const item       = data.items[0];
  const stats      = item.statistics || {};
  const snippet    = item.snippet    || {};

  return {
    title: snippet.title || 'Sin título',
    views: parseInt(stats.viewCount  || '0', 10),
    likes: parseInt(stats.likeCount  || '0', 10),
  };
}

/**
 * Intercambia el Refresh Token por un Access Token activo de corta duración.
 */
async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltan credenciales de OAuth2 en el archivo .env (CLIENT_ID, CLIENT_SECRET o REFRESH_TOKEN)');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error de OAuth2 al refrescar token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Obtiene estadísticas de duración del video para calcular el % de retención correcto.
 * @param {string} id - El ID del video
 * @returns {Promise<number>} Duración total en segundos
 */
async function getVideoDuration(id) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'contentDetails');
  url.searchParams.set('id', id);
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return 0;
  const data = await res.json();
  if (!data.items || data.items.length === 0) return 0;

  // Parsear formato ISO 8601 de duración (ej: PT10M15S)
  const durationStr = data.items[0].contentDetails.duration;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return (hours * 3600) + (minutes * 60) + seconds;
}

/**
 * Obtiene métricas avanzadas desde YouTube Analytics API.
 * Requiere OAuth2 configurado.
 *
 * @param {string} id
 * @returns {Promise<{averageViewDuration: number|null, clickThroughRate: number|null}>}
 */
async function fetchAnalyticsMetrics(id) {
  try {
    console.log('   🔄 Generando Access Token de Google OAuth...');
    const accessToken = await getAccessToken();

    const today     = new Date().toISOString().split('T')[0];
    const startDate = '2020-01-01'; // rango amplio para abarcar la vida del video
    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', 'channel==MINE');
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', today);
    url.searchParams.set('metrics', 'averageViewDuration,annotationClickThroughRate');
    url.searchParams.set('filters', `video==${id}`);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Analytics API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const row  = (data.rows || [])[0] || [];
    return {
      averageViewDuration: row[1] || null,  // en segundos
      clickThroughRate:    row[2] || null,  // fracción (ej: 0.05 = 5%)
    };
  } catch (e) {
    console.warn(`   ⚠️  No se pudieron obtener métricas de YouTube Analytics: ${e.message}`);
    console.warn('      Se omitirán la retención exacta y el CTR.');
    return { averageViewDuration: null, clickThroughRate: null };
  }
}

// ── Función principal ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n📊 Analizando rendimiento de video de YouTube...');
  console.log(`   Video ID: ${videoId}`);

  // 1. Obtener métricas
  let stats, analytics;
  try {
    console.log('\n🔍 Consultando YouTube Data API...');
    stats = await fetchVideoStats(videoId);
    console.log(`   ✅ Título: "${stats.title}"`);
    console.log(`   ✅ Views:  ${stats.views.toLocaleString()}`);
    console.log(`   ✅ Likes:  ${stats.likes.toLocaleString()}`);
  } catch (err) {
    console.error(`\n❌ No se pudieron obtener estadísticas: ${err.message}`);
    process.exit(1);
  }

  try {
    console.log('\n🔍 Consultando YouTube Analytics API...');
    analytics = await fetchAnalyticsMetrics(videoId);
    if (analytics.averageViewDuration !== null) {
      console.log(`   ✅ Duración promedio de vista: ${analytics.averageViewDuration}s`);
    }
    if (analytics.clickThroughRate !== null) {
      console.log(`   ✅ CTR: ${(analytics.clickThroughRate * 100).toFixed(2)}%`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Analytics parciales: ${err.message}`);
    analytics = { averageViewDuration: null, clickThroughRate: null };
  }

  // 2. Calcular retention como fracción real basada en la duración real del video
  let duration = 0;
  try {
    duration = await getVideoDuration(videoId);
    if (duration > 0) {
      console.log(`   ✅ Duración real del video: ${duration}s`);
    }
  } catch (e) {
    console.warn(`   ⚠️  No se pudo consultar la duración real del video: ${e.message}`);
  }

  const retention = (analytics.averageViewDuration !== null && duration > 0)
    ? Math.min(analytics.averageViewDuration / duration, 1.0)
    : 0;

  const ctr = analytics.clickThroughRate || 0;

  // 3. Leer memoria y buscar el tema asociado al video
  const memory = await readMemory();

  // Buscar si ya existe una entrada para este videoId
  const existingIdx = memory.mejor_rendimiento.findIndex(
    (v) => v.video_id === videoId
  );
  const existingEntry = existingIdx >= 0 ? memory.mejor_rendimiento[existingIdx] : null;

  // Intentar deducir el tema desde el título del video
  const tema = stats.title;

  const activeChannelId = getActiveChannelId();

  // Preservar la composición de Remotion seleccionada manualmente en el Dashboard si ya existía
  const finalFormat = existingEntry?.remotion_format || detectRemotionFormat(tema, null, activeChannelId);

  // Preservar el tema si el usuario lo editó o simplificó manualmente
  const finalTema = existingEntry?.tema || tema;

  // Preservar valores manuales o previos si la API devuelve 0
  const finalRetention = (retention > 0) ? parseFloat(retention.toFixed(4)) : (existingEntry?.retention || 0);
  const finalCtr = (ctr > 0) ? parseFloat(ctr.toFixed(4)) : (existingEntry?.ctr || 0);

  // Preservar el estilo de hook si ya estaba especificado a mano
  const finalHookStyle = (existingEntry?.hook_style && existingEntry.hook_style !== 'no-especificado' && existingEntry.hook_style !== 'no especificado')
    ? existingEntry.hook_style
    : (hookStyle !== 'no especificado' && hookStyle !== 'no-especificado' ? hookStyle : 'no-especificado');

  const perfEntry = {
    tema:       finalTema,
    video_id:   videoId,
    retention:  finalRetention,
    ctr:        finalCtr,
    views:      stats.views,
    likes:      stats.likes,
    hook_style: finalHookStyle,
    remotion_format: finalFormat,
    fecha:      new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    memory.mejor_rendimiento[existingIdx] = perfEntry;
    console.log(`\n🔄 Entrada actualizada para video "${videoId}"`);
  } else {
    memory.mejor_rendimiento.push(perfEntry);
    console.log(`\n➕ Nueva entrada de rendimiento registrada.`);
  }

  // 4. Si retention > 60%, marcar hook_style como exitoso
  if (retention >= RETENTION_THRESHOLD && hookStyle !== 'no especificado') {
    if (!memory.estilo_hooks.includes(hookStyle)) {
      memory.estilo_hooks.push(hookStyle);
      console.log(`🏆 Hook exitoso registrado: "${hookStyle}" (retención ≥ 60%)`);
    } else {
      console.log(`ℹ️  Hook "${hookStyle}" ya estaba en estilo_hooks.`);
    }
  } else if (retention < RETENTION_THRESHOLD && retention > 0) {
    console.log(`📉 Retención ${(retention * 100).toFixed(1)}% < 60%. Hook no marcado como exitoso.`);
  }

  // 5. Guardar memoria actualizada
  await saveMemory(memory);

  // 6. Resumen final
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║              📊 Resumen de Rendimiento           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  🎬 Video:      "${tema}"`);
  console.log(`  👁️  Views:      ${stats.views.toLocaleString()}`);
  console.log(`  👍 Likes:      ${stats.likes.toLocaleString()}`);
  console.log(`  ⏱️  Retención:  ${retention > 0 ? (retention * 100).toFixed(1) + '%' : 'No disponible'}`);
  console.log(`  🖱️  CTR:        ${ctr > 0 ? (ctr * 100).toFixed(2) + '%' : 'No disponible'}`);
  console.log(`  🪝 Hook style: "${hookStyle}"`);
  console.log(`  ${retention >= RETENTION_THRESHOLD ? '✅ HOOK EXITOSO' : '📉 Retención por debajo del umbral (60%)'}`);
  console.log('\n✅ channel-memory.json actualizado correctamente.\n');
}

main().catch((err) => {
  console.error(`\n❌ Error fatal: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
