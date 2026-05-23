#!/usr/bin/env node
/**
 * scripts/auto-sync.js
 * Sincroniza automáticamente los últimos 10 videos subidos a tu canal de YouTube.
 * Obtiene vistas, likes, duración, retención y CTR en tiempo real usando OAuth2.
 * Cruza títulos con miniatura_conceptos para heredar el estilo del hook / título.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { readMemory, saveMemory, getActiveChannelId, detectRemotionFormat } = require('../utils/memory');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Resolver el ID del canal dinámicamente según el canal activo
const activeChannelId = getActiveChannelId();
const channelEnvKey = `YOUTUBE_CHANNEL_ID_${activeChannelId.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
const CHANNEL_ID = process.env[channelEnvKey] || process.env.YOUTUBE_CHANNEL_ID;

const RETENTION_THRESHOLD = 0.20; // 20% — umbral realista para canal nuevo (top plataformas tienen 25-40%)

if (!YOUTUBE_API_KEY || !CHANNEL_ID) {
  console.error(`❌ Falta YOUTUBE_API_KEY o CHANNEL_ID (${channelEnvKey} o YOUTUBE_CHANNEL_ID) en el archivo .env`);
  process.exit(1);
}

// ── Helpers de OAuth2 ──────────────────────────────────────────────────────────
async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth2 no configurado en .env (YOUTUBE_REFRESH_TOKEN vacío)');
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
  if (!response.ok) throw new Error(`OAuth2 Error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Obtener duración real de un video ──────────────────────────────────────────
async function getVideoDuration(id) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'contentDetails');
  url.searchParams.set('id', id);
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return 0;
  const data = await res.json();
  if (!data.items || data.items.length === 0) return 0;

  const durationStr = data.items[0].contentDetails.duration;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return (hours * 3600) + (minutes * 60) + seconds;
}

// ── Obtener Analytics (Retención, CTR) ─────────────────────────────────────────
async function fetchAnalytics(id, accessToken) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', 'channel==MINE');
    url.searchParams.set('startDate', '2020-01-01');
    url.searchParams.set('endDate', today);
    url.searchParams.set('metrics', 'averageViewDuration,annotationClickThroughRate');
    url.searchParams.set('filters', `video==${id}`);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return { averageViewDuration: null, clickThroughRate: null };
    const data = await res.json();
    const row  = (data.rows || [])[0] || [];
    return {
      averageViewDuration: row[1] || null,
      clickThroughRate:    row[2] || null
    };
  } catch (e) {
    return { averageViewDuration: null, clickThroughRate: null };
  }
}

// ── Algoritmo de similitud de títulos (Jaro-Winkler simplificado) ───────────────
function titleSimilarity(s1, s2) {
  s1 = s1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s2 = s2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Limpieza de caracteres no alfanuméricos comunes
  s1 = s1.replace(/[^a-z0-9\s]/g, '');
  s2 = s2.replace(/[^a-z0-9\s]/g, '');

  const words1 = s1.split(/\s+/).filter(Boolean);
  const words2 = s2.split(/\s+/).filter(Boolean);

  let matches = 0;
  for (const w of words1) {
    if (words2.includes(w)) matches++;
  }

  return matches / Math.max(words1.length, words2.length);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔄 Iniciando sincronización automática de YouTube...');
  
  let accessToken;
  try {
    accessToken = await getAccessToken();
    console.log('✅ Conectado a YouTube Analytics (OAuth2).');
  } catch (err) {
    console.warn(`⚠️  No se pudo conectar a YouTube Analytics: ${err.message}`);
    console.warn('   Se sincronizará solo información pública (views/likes).');
  }

  // 1. Obtener ID de playlist de subidas
  const uploadsPlaylistId = CHANNEL_ID.startsWith('UC')
    ? 'UU' + CHANNEL_ID.slice(2)
    : CHANNEL_ID;

  console.log(`🔍 Buscando videos en playlist de subidas: ${uploadsPlaylistId}`);

  const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  playlistUrl.searchParams.set('part', 'snippet,status');
  playlistUrl.searchParams.set('playlistId', uploadsPlaylistId);
  playlistUrl.searchParams.set('maxResults', '15');
  playlistUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const playlistRes = await fetch(playlistUrl.toString());
  if (!playlistRes.ok) {
    throw new Error(`Error en playlistItems: ${await playlistRes.text()}`);
  }

  const playlistData = await playlistRes.json();
  const items = playlistData.items || [];
  console.log(`✅ Se encontraron ${items.length} videos subidos.`);

  const memory = await readMemory();
  if (!memory.mejor_rendimiento) memory.mejor_rendimiento = [];
  if (!memory.estilo_hooks) memory.estilo_hooks = [];

  let updatedCount = 0;

  for (const item of items) {
    const videoId = item.snippet.resourceId.videoId;
    const title   = item.snippet.title;
    
    // Ignorar directos pendientes o privados
    if (item.status && item.status.privacyStatus === 'private') continue;

    console.log(`\n📹 Procesando: "${title}" (${videoId})...`);

    // 2. Obtener estadísticas públicas (views, likes)
    const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    statsUrl.searchParams.set('part', 'statistics');
    statsUrl.searchParams.set('id', videoId);
    statsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const statsRes = await fetch(statsUrl.toString());
    if (!statsRes.ok) continue;
    const statsData = await statsRes.json();
    const stats = (statsData.items || [])[0]?.statistics || {};

    const views = parseInt(stats.viewCount || '0', 10);
    const likes = parseInt(stats.likeCount || '0', 10);

    // 3. Obtener duración y Analytics
    let duration = await getVideoDuration(videoId);
    let analytics = { averageViewDuration: null, clickThroughRate: null };

    if (accessToken) {
      analytics = await fetchAnalytics(videoId, accessToken);
    }

    const retention = (analytics.averageViewDuration !== null && duration > 0)
      ? Math.min(analytics.averageViewDuration / duration, 1.0)
      : 0;

    const ctr = analytics.clickThroughRate || 0;

    // Extracción inteligente de tema corto (Prioridad 1: Detección directa de marca)
    const marcas = ['Yahoo', 'Internet Explorer', 'BlackBerry', 'MySpace', 'Nokia', 'Flash', 'Equifax', 'Google', 'Windows'];
    const encontrada = marcas.find(m => title.toLowerCase().includes(m.toLowerCase()));
    
    let cleanTema = title;
    if (encontrada) {
      cleanTema = encontrada;
    } else {
      const splitByDash = title.split(/[—\-\:]/)[0].trim();
      cleanTema = splitByDash;
    }

    // 4. Intentar cruzar estilo de hook/título con miniatura_conceptos para obtener el estilo visual
    let matchedConcept = memory.miniatura_conceptos?.find(c => {
      return titleSimilarity(c.titulo, title) > 0.5;
    });

    // Fallback de concepto: buscar por marca detectada
    if (!matchedConcept && encontrada) {
      matchedConcept = memory.miniatura_conceptos?.find(c => {
        return c.projectId && c.projectId.toLowerCase().includes(encontrada.toLowerCase());
      });
    }

    const hookStyle = matchedConcept?.estilo_titulo || 'no-especificado';

    // Añadir tema formateado a temas_usados si no está registrado aún
    const formattedTema = cleanTema.charAt(0).toUpperCase() + cleanTema.slice(1);
    if (!memory.temas_usados) memory.temas_usados = [];
    if (!memory.temas_usados.some(t => t.toLowerCase().trim() === formattedTema.toLowerCase().trim())) {
      memory.temas_usados.push(formattedTema);
      console.log(`➕ Añadido nuevo tema cubierto: "${formattedTema}"`);
    }

    // 5. Registrar / Actualizar en mejor_rendimiento
    const existingIdx = memory.mejor_rendimiento.findIndex(v => v.video_id === videoId);
    const existingEntry = existingIdx >= 0 ? memory.mejor_rendimiento[existingIdx] : null;

    // Preservar valores manuales o previos si la API devuelve 0 (por retraso de 48h de YouTube Analytics o falta de OAuth2)
    const finalRetention = (retention > 0) ? parseFloat(retention.toFixed(4)) : (existingEntry?.retention || 0);
    const finalCtr = (ctr > 0) ? parseFloat(ctr.toFixed(4)) : (existingEntry?.ctr || 0);

    // Preservar la composición de Remotion seleccionada manualmente en el Dashboard si ya existía
    const finalFormat = existingEntry?.remotion_format || detectRemotionFormat(cleanTema, null, activeChannelId);

    // Preservar el tema si el usuario lo editó o simplificó manualmente
    const finalTema = existingEntry?.tema || cleanTema;

    // Preservar el estilo de hook si ya estaba especificado a mano
    const finalHookStyle = (existingEntry?.hook_style && existingEntry.hook_style !== 'no-especificado')
      ? existingEntry.hook_style
      : (hookStyle !== 'no-especificado' ? hookStyle : 'no-especificado');

    const perfEntry = {
      tema: finalTema,
      video_id: videoId,
      retention: finalRetention,
      ctr: finalCtr,
      views,
      likes,
      hook_style: finalHookStyle,
      remotion_format: finalFormat,
      published_at: item.snippet.publishedAt,
      fecha: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      memory.mejor_rendimiento[existingIdx] = perfEntry;
    } else {
      memory.mejor_rendimiento.push(perfEntry);
    }

    // 6. Si retención > 60% registrar estilo de hook exitoso
    if (retention >= RETENTION_THRESHOLD && perfEntry.hook_style !== 'no-especificado') {
      if (!memory.estilo_hooks.includes(perfEntry.hook_style)) {
        memory.estilo_hooks.push(perfEntry.hook_style);
        console.log(`🏆 [Estilo Exitoso]: "${perfEntry.hook_style}"`);
      }
    }

    console.log(`   📈 Views: ${views} | Likes: ${likes} | Retención: ${(retention * 100).toFixed(1)}% | CTR: ${(ctr * 100).toFixed(2)}% | Hook: "${perfEntry.hook_style}"`);
    updatedCount++;
  }

  // Actualizar estadísticas globales en memoria
  memory.total_videos = memory.mejor_rendimiento.length;
  if (items.length > 0) {
    memory.ultima_publicacion = items[0].snippet.publishedAt;
  }
  memory.ultima_sincronizacion = new Date().toISOString();

  // Consolidar hooks en estilo_hooks (todos los hooks que tuvieron vistas > 0)
  const allHooks = (memory.mejor_rendimiento || [])
    .filter(v => v.views > 0 && v.hook_style && v.hook_style !== 'no-especificado')
    .sort((a, b) => b.views - a.views)
    .map(v => v.hook_style);
  for (const h of allHooks) {
    if (!memory.estilo_hooks.includes(h)) {
      memory.estilo_hooks.push(h);
    }
  }

  await saveMemory(memory);
  console.log(`\n🎉 Sincronización finalizada. Se procesaron ${updatedCount} videos.`);

}

main().catch(err => {
  console.error(`\n❌ Error fatal en auto-sync: ${err.message}`);
  process.exit(1);
});
