const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REF_VIDEO = path.join(__dirname, '..', 'videoreferecncia.mp4');
const OUT_VIDEO = path.join(__dirname, '..', 'out', 'WhiteboardVideo02.mp4');
const COMP_DIR = path.join(__dirname, 'comparison');

async function run() {
  console.log('🎬 Iniciando extracción de fotogramas para comparación visual...');

  if (!fs.existsSync(REF_VIDEO)) {
    console.error(`❌ Error: El video de referencia no existe en: ${REF_VIDEO}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_VIDEO)) {
    console.error(`❌ Error: El video de salida Remotion no existe en: ${OUT_VIDEO}`);
    process.exit(1);
  }

  if (!fs.existsSync(COMP_DIR)) {
    fs.mkdirSync(COMP_DIR, { recursive: true });
    console.log('📂 Creado directorio temporal de comparación scratch/comparison/');
  }

  // Tiempos en segundos para comparar (al inicio, a los 15s y a los 40s)
  const timestamps = [10, 30, 50];

  timestamps.forEach((sec) => {
    console.log(`📸 Extraiendo fotograma a los ${sec}s...`);

    const refFramePath = path.join(COMP_DIR, `ref_${sec}s.jpg`);
    const outFramePath = path.join(COMP_DIR, `out_${sec}s.jpg`);

    // Comando FFmpeg para extraer 1 frame
    const cmdRef = `ffmpeg -y -ss ${sec} -i "${REF_VIDEO}" -vframes 1 -q:v 2 "${refFramePath}"`;
    const cmdOut = `ffmpeg -y -ss ${sec} -i "${OUT_VIDEO}" -vframes 1 -q:v 2 "${outFramePath}"`;

    try {
      execSync(cmdRef, { stdio: 'ignore' });
      console.log(`   ✅ Extraído frame de referencia: ${refFramePath}`);
    } catch (e) {
      console.error(`   ❌ Error al extraer frame de referencia en ${sec}s:`, e.message);
    }

    try {
      execSync(cmdOut, { stdio: 'ignore' });
      console.log(`   ✅ Extraído frame de salida: ${outFramePath}`);
    } catch (e) {
      console.error(`   ❌ Error al extraer frame de salida en ${sec}s:`, e.message);
    }
  });

  console.log('\n✨ Extracción completada con éxito. Listo para inspección visual.');
}

run().catch(console.error);
