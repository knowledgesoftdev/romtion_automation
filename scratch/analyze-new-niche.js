require('dotenv').config();
const fs = require('fs');
const path = require('path');
let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (_) {
  Anthropic = null;
}

const FRAMES_DIR = path.join(__dirname, 'new_niche_frames');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_NAME = 'claude-haiku-4-5';

async function run() {
  console.log('🧠 Enviando fotogramas del nuevo nicho a Claude para analizar el diseño estético de referencia...');

  if (!Anthropic) {
    console.error('❌ Error: @anthropic-ai/sdk no está instalado.');
    process.exit(1);
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY no está configurada.');
    process.exit(1);
  }

  const clientClass = Anthropic.default || Anthropic;
  const client = new clientClass({ apiKey: ANTHROPIC_API_KEY });

  const frameFiles = ['frame_10s.jpg', 'frame_60s.jpg', 'frame_120s.jpg', 'frame_300s.jpg'];
  const mediaContents = [];

  for (const file of frameFiles) {
    const filePath = path.join(FRAMES_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Faltante: ${filePath}`);
      continue;
    }
    const base64Data = fs.readFileSync(filePath).toString('base64');
    mediaContents.push({
      type: 'text',
      text: `--- Fotograma extraído a los ${file.replace('frame_', '').replace('.jpg', '')} del video de referencia ---`
    });
    mediaContents.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64Data
      }
    });
  }

  if (mediaContents.length === 0) {
    console.error('❌ No se encontraron imágenes para analizar.');
    process.exit(1);
  }

  const promptText = `Analiza detenidamente la estética, diseño gráfico y composición visual de este canal de referencia (documental militar premium/cinemático).
Por favor, detalla minuciosamente los siguientes aspectos observados en las imágenes:
1. **Composición de los textos / Leyendas**: ¿Cómo se muestran los títulos, subtítulos o etiquetas en pantalla? ¿Están dentro de bloques/rectángulos de color (badges) blanco o negro?
2. **Tipografía**: Describe el estilo de fuente (serif, sans-serif, monoespaciado, bold, regular). ¿Son letras mayúsculas (UPPERCASE)?
3. **Distribución en pantalla**: ¿Dónde se ubican las etiquetas? (¿esquinas, centro, abajo?). ¿Se usan varias etiquetas concurrentes en pantalla?
4. **Subtítulos/Transcripción**: ¿Hay subtítulos convencionales en la parte inferior? ¿O el texto que aparece son palabras clave o frases cortas en forma de bloques o etiquetas fijas/animadas?
5. **Estilo general del video**: Mood, filtros de color, superposiciones (vignettes, grano, texturas analógicas), material (B-roll, mapas, imágenes de satélite).

Devuelve tu reporte detallado estructurado en markdown en español.`;

  mediaContents.push({
    type: 'text',
    text: promptText
  });

  try {
    const res = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 2500,
      system: "Eres un director de arte y editor de video experto enfocado en la estética premium y de alta retención para canales de YouTube cinematográficos de estilo documental (tipo Aufiora, Magnates del Internet, etc.).",
      messages: [
        {
          role: 'user',
          content: mediaContents
        }
      ]
    });

    const report = res.content[0].text;
    fs.writeFileSync(path.join(__dirname, 'new_niche_design_analysis.md'), report, 'utf8');
    console.log('\n✨ Reporte generado y guardado en: scratch/new_niche_design_analysis.md');
    console.log(report.substring(0, 1500) + '...\n');
  } catch (e) {
    console.error('❌ Error durante el análisis con Claude:', e.message);
  }
}

run().catch(console.error);
