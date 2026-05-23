#!/usr/bin/env node
/**
 * scripts/import-manual-project.js
 * 
 * Utilidad para importar proyectos creados manualmente:
 * 1. Lee guion.json y audio.mp3 de la carpeta del proyecto.
 * 2. Si no existe timing.json, estima los tiempos proporcionalmente según el conteo de palabras y la duración del audio.
 * 3. Utiliza ffmpeg para recortar automáticamente el audio.mp3 en pequeños fragmentos (parrafo-01.mp3, parrafo-02.mp3, etc.)
 *    para que la composición VideoEngine de Remotion reproduzca el audio de cada escena a la perfección.
 * 
 * Uso:
 *   node scripts/import-manual-project.js <projectId>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectId = process.argv[2];
if (!projectId) {
  console.error("❌ Uso: node scripts/import-manual-project.js <projectId>");
  process.exit(1);
}

// 1. Obtener canal activo
let channelId = 'codigo-muerto';
try {
  const activeFile = path.join(__dirname, '..', 'active-channel.json');
  if (fs.existsSync(activeFile)) {
    channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
  }
} catch (_) {}

const projectDir = path.join(__dirname, '..', 'public', 'projects', channelId, projectId);
const guionPath = path.join(projectDir, 'guion.json');
const audioPath = path.join(projectDir, 'audio.mp3');
const timingPath = path.join(projectDir, 'timing.json');
const audioDir = path.join(projectDir, 'audio');

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║        🛠️  Importador de Proyecto Manual          ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log(`📌 Canal Activo: ${channelId}`);
console.log(`📌 Proyecto:     ${projectId}\n`);

if (!fs.existsSync(projectDir)) {
  // Crear directorio si no existe para facilitar el copiado
  fs.mkdirSync(projectDir, { recursive: true });
  console.log(`📁 Carpeta creada: ${projectDir}`);
  console.log(`👉 Coloca tu "guion.json" y tu "audio.mp3" dentro de esa carpeta y vuelve a ejecutar el script.`);
  process.exit(0);
}

if (!fs.existsSync(guionPath)) {
  console.error(`❌ Error: Falta el archivo "guion.json" en: ${guionPath}`);
  process.exit(1);
}

if (!fs.existsSync(audioPath)) {
  console.error(`❌ Error: Falta el archivo "audio.mp3" en: ${audioPath}`);
  process.exit(1);
}

const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));
fs.mkdirSync(audioDir, { recursive: true });

// 2. Obtener duración de audio.mp3 con ffprobe
let totalDuration = 0;
try {
  const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: 'utf8' });
  totalDuration = parseFloat(output.trim());
  console.log(`🎵 Duración detectada de audio.mp3: ${totalDuration.toFixed(2)} segundos`);
} catch (e) {
  console.warn(`⚠️  Advertencia: No se pudo obtener la duración con ffprobe.`);
}

// 3. Estimar o cargar timing.json
let timing = {};
if (!fs.existsSync(timingPath)) {
  console.log(`ℹ️  timing.json no encontrado. Estimando distribución de tiempos por palabra...`);
  if (!totalDuration) {
    console.error("❌ Error: Se requiere que ffprobe pueda leer la duración del audio para realizar la estimación.");
    process.exit(1);
  }

  // Contar palabras por párrafo
  const wordCounts = guion.map(p => {
    const text = p.texto || '';
    return text.split(/\s+/).filter(Boolean).length;
  });
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let currentStart = 0;
  for (let i = 0; i < guion.length; i++) {
    const p = guion[i];
    const words = wordCounts[i];
    const duration = (words / totalWords) * totalDuration;

    timing[`parrafo-${p.id}`] = {
      start: Math.round(currentStart * 100) / 100,
      duration: Math.round(duration * 100) / 100
    };
    currentStart += duration;
  }
  
  fs.writeFileSync(timingPath, JSON.stringify(timing, null, 2));
  console.log(`✅ timing.json autogenerado y estimado en: ${timingPath}`);
} else {
  timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
  console.log(`✅ timing.json existente cargado con éxito.`);
}

// 4. Slicing del audio completo usando ffmpeg
console.log(`\n✂️  Cortando audio.mp3 en fragmentos por párrafo...`);
for (const p of guion) {
  const key = `parrafo-${p.id}`;
  const entry = timing[key];
  if (!entry) continue;

  const destPath = path.join(audioDir, `${key}.mp3`);
  
  try {
    // Usamos ffmpeg para extraer de forma limpia la sección del audio con fading o normal
    execSync(`ffmpeg -y -ss ${entry.start} -t ${entry.duration} -i "${audioPath}" -c:a libmp3lame -b:a 192k "${destPath}"`, { stdio: 'ignore' });
    console.log(`   ✅ ${key}.mp3 creado (${entry.start}s -> +${entry.duration}s)`);
  } catch (err) {
    console.error(`   ❌ Falló recortar ${key}.mp3: ${err.message}`);
  }
}

console.log(`\n✨ ¡Importación Completa! Ahora puedes abrir Remotion y verás tu proyecto manual reproduciéndose.`);
