#!/usr/bin/env node
/**
 * scripts/analyze-comments.js
 * Descarga y analiza los comentarios de un video de YouTube con la API de YouTube y Claude.
 * Genera resúmenes de opinión, dudas técnicas y sugerencias premium para responder.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { readMemory } = require('../utils/memory');

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) { Anthropic = null; }

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

if (!YOUTUBE_API_KEY) {
  console.error('❌ Falta YOUTUBE_API_KEY en el archivo .env');
  process.exit(1);
}

// Prompt para el análisis de los comentarios
const SYSTEM_PROMPT = `Eres el Community Manager y Redactor Técnico del canal "Código Muerto".
Tu canal hace autopsias técnicas premium y de alto nivel sobre fallos arquitectónicos de software y hardware (con tono geek, analítico, profesional, un poco de misterio y sumamente respetuoso).

Recibirás un listado de comentarios de un video. Debes generar un informe detallado en formato Markdown estructurado:

1. **Sentimiento General**: Breve resumen HSL de cómo reaccionó la audiencia (ej: fascinada por la explicación técnica, dudas sobre un punto, etc.).
2. **Top 3 Dudas o Aportes Técnicos**: Resumen de los aportes reales de programadores o dudas técnicas.
3. **Sugerencias de Respuestas a Comentarios**:
   Para los comentarios más representativos (o interesantes), proporciona:
   - **Autor**: Nombre de usuario.
   - **Comentario original**.
   - **Respuesta Propuesta**: Una respuesta excelente, técnicamente precisa, que fomente el debate sano y use el tono analítico del canal.
4. **Propuestas de Siguientes Autopsias**: Si los usuarios sugieren temas para futuros videos (ej: "hablen de Theranos", "hagan de Yahoo"), lístalos como viñetas limpias para agregarlos a la memoria del canal.

Sé conciso, técnico y directo. Escribe en español de manera premium.`;

async function fetchComments(videoId) {
  const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('maxResults', '25');
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Error de la API de YouTube: ${await res.text()}`);
  }

  const data = await res.json();
  const items = data.items || [];
  return items.map(item => {
    const topComment = item.snippet.topLevelComment.snippet;
    return {
      id: item.id,
      author: topComment.authorDisplayName,
      text: topComment.textDisplay,
      likes: topComment.likeCount,
      publishedAt: topComment.publishedAt
    };
  });
}

async function analyzeWithClaude(comments, videoTitle) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic SDK o ANTHROPIC_API_KEY no están disponibles');
  }

  console.log(`🧠 Consultando a Claude (${ANTHROPIC_MODEL}) para analizar comentarios...`);
  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  const promptContent = `Video: "${videoTitle}"
Comentarios recolectados:
${JSON.stringify(comments, null, 2)}`;

  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: promptContent
    }]
  });

  let text = '';
  for (const block of res.content || []) {
    if (block.type === 'text') text += block.text;
  }
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  let videoId = args[0];

  const memory = await readMemory();
  const videos = memory.mejor_rendimiento || [];

  if (!videoId) {
    if (videos.length === 0) {
      console.error('❌ No se especificó videoId y no hay videos registrados en la memoria del canal.');
      console.log('Uso: node scripts/analyze-comments.js <videoId>');
      process.exit(1);
    }
    // Autodetectar el video más reciente en la memoria
    const sorted = [...videos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const latestVideo = sorted[0];
    videoId = latestVideo.video_id;
    console.log(`🔍 No se especificó videoId. Detectando el más reciente en memoria: "${latestVideo.tema}" (${videoId})`);
  }

  // Buscar si el video coincide con algún tema en memoria
  const matchedVideo = videos.find(v => v.video_id === videoId);
  const videoTitle = matchedVideo ? matchedVideo.tema : `Video ID: ${videoId}`;

  console.log(`📥 Descargando los comentarios más recientes de YouTube para: "${videoTitle}"...`);
  try {
    const comments = await fetchComments(videoId);
    console.log(`✅ Descargados ${comments.length} comentarios.`);
    
    if (comments.length === 0) {
      console.log('ℹ️ El video no tiene comentarios aún.');
      process.exit(0);
    }

    const report = await analyzeWithClaude(comments, videoTitle);
    
    // Guardar informe en la carpeta del proyecto si es que existe
    let outputDir = __dirname;
    if (matchedVideo) {
      // Intentar buscar la carpeta del proyecto
      let channelId = 'codigo-muerto';
      try {
        const activeFile = path.join(__dirname, '..', 'active-channel.json');
        if (fs.existsSync(activeFile)) {
          channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
        }
      } catch (_) {}

      let projectsDir = path.join(__dirname, '..', 'public', 'projects', channelId);
      if (!fs.existsSync(projectsDir)) {
        projectsDir = path.join(__dirname, '..', 'public', 'projects');
      }

      if (fs.existsSync(projectsDir)) {
        const projectFolders = fs.readdirSync(projectsDir);
        const matchFolder = projectFolders.find(folder => {
          return folder.toLowerCase().includes(matchedVideo.tema.toLowerCase().replace(/\s+/g, '-'));
        });
        if (matchFolder) {
          outputDir = path.join(projectsDir, matchFolder);
        }
      }
    }

    const reportPath = path.join(outputDir, `comments-analysis-${videoId}.md`);
    fs.writeFileSync(reportPath, report);

    console.log('\n========================================================================');
    console.log(`📝 INFORME GENERADO Y GUARDADO EN: ${reportPath}`);
    console.log('========================================================================\n');
    console.log(report);
    console.log('\n========================================================================');
  } catch (err) {
    console.error(`❌ Error analizando comentarios: ${err.message}`);
    process.exit(1);
  }
}

main();
