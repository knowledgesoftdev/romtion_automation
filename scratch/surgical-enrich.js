/**
 * scratch/surgical-enrich.js
 *
 * Busca de forma quirúrgica todas las escenas vacías de "friendster" en guion.json
 * y llama a Claude para enriquecerlas en lotes individuales, respetando las que
 * ya fueron generadas exitosamente.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { enrichChunkWithClaude, validateVisual, Anthropic } = require('../server/utils/smartParser');

async function main() {
  const projectId = 'friendster';
  const projectDir = path.join(__dirname, '..', 'public', 'projects', projectId);
  const guionPath = path.join(projectDir, 'guion.json');

  if (!fs.existsSync(guionPath)) {
    console.error(`❌ No se encontró guion.json en ${guionPath}`);
    process.exit(1);
  }

  console.log(`📖 Leyendo guion.json de: ${guionPath}`);
  const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));

  // 1. Identificar escenas vacías
  const emptyScenes = [];
  for (let i = 0; i < guion.length; i++) {
    const scene = guion[i];
    if (!scene.visual || !scene.visual.elements || scene.visual.elements.length === 0) {
      emptyScenes.push({ index: i, scene });
    }
  }

  console.log(`🔍 Total de escenas en el guion: ${guion.length}`);
  console.log(`⚠️ Escenas vacías identificadas: ${emptyScenes.length}`);

  if (emptyScenes.length === 0) {
    console.log('✅ ¡Todas las escenas ya tienen elementos visuales! Nada que hacer.');
    return;
  }

  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Anthropic no está disponible o falta ANTHROPIC_API_KEY en .env');
    process.exit(1);
  }

  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  // 2. Agrupar en lotes (chunks) de 10
  const CHUNK_SIZE = 10;
  const chunks = [];
  for (let i = 0; i < emptyScenes.length; i += CHUNK_SIZE) {
    chunks.push(emptyScenes.slice(i, i + CHUNK_SIZE));
  }

  console.log(`📦 Procesando en ${chunks.length} lotes de máximo ${CHUNK_SIZE} escenas...`);

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    console.log(`\n🚀 Lote ${c + 1}/${chunks.length} (${chunk.length} escenas)...`);

    // Mapeamos al formato que espera enrichChunkWithClaude: array de { texto }
    const paragraphs = chunk.map(item => ({ texto: item.scene.texto }));

    try {
      const enrichedResult = await enrichChunkWithClaude(client, paragraphs);

      // Fusionar los resultados enriquecidos de vuelta en el guion original
      for (let i = 0; i < chunk.length; i++) {
        const targetIndex = chunk[i].index;
        const originalScene = chunk[i].scene;
        const fromClaude = enrichedResult[i];

        if (fromClaude) {
          const visual = validateVisual(fromClaude.visual, originalScene.texto);
          const chapter_title = (typeof fromClaude.chapter_title === 'string' && fromClaude.chapter_title.trim())
            ? fromClaude.chapter_title.trim()
            : originalScene.chapter_title;

          guion[targetIndex].visual = visual;
          guion[targetIndex].chapter_title = chapter_title;

          console.log(`  ✅ Escena ID ${originalScene.id} enriquecida: ${visual.elements.length} elementos`);
        } else {
          console.warn(`  ⚠️ No se recibió enriquecimiento para la escena ID ${originalScene.id}`);
        }
      }

      // Guardar progreso parcial
      fs.writeFileSync(guionPath, JSON.stringify(guion, null, 2));
      console.log(`💾 Progreso guardado parcialmente en guion.json.`);

    } catch (err) {
      console.error(`❌ Error procesando el lote ${c + 1}:`, err.message);
      console.log('Esperando 2 segundos antes de continuar con el siguiente lote...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Pequeño retardo entre lotes para evitar overload
    if (c < chunks.length - 1) {
      console.log('Esperando 1.5 segundos para evitar sobrecarga del API...');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n🎉 ¡Proceso de enriquecimiento quirúrgico completado!');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
});
