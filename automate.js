const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración básica
const PROJECTS_DIR = path.join(__dirname, 'public', 'projects');

/**
 * Función para generar un ID amigable de proyecto
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

async function automate(topic) {
  if (!topic) {
    console.error('Uso: node automate.js "Nombre del Tema"');
    process.exit(1);
  }

  const projectId = slugify(topic);
  const projectDir = path.join(PROJECTS_DIR, projectId);

  console.log(`\n🏗️  Creando nuevo proyecto: ${projectId}`);

  if (fs.existsSync(projectDir)) {
    console.log('⚠️  El proyecto ya existe. Saltando creación de carpeta.');
  } else {
    fs.mkdirSync(projectDir, { recursive: true });
    console.log('✅ Carpeta creada.');
  }

  // PASO 1: Generar Guion (Aquí es donde conectarías con Gemini/GPT)
  // Por ahora, si no existe, creamos un placeholder o pedimos al usuario
  const guionPath = path.join(projectDir, 'guion.json');
  if (!fs.existsSync(guionPath)) {
    console.log(`\n📝 [PENDIENTE] Generar guion.json para: ${topic}`);
    console.log(`   Por favor, coloca el archivo guion.json en ${projectDir}`);
    // Aquí es donde podrías automatizar la llamada a Claude/GPT
    return;
  }

  // PASO 2: Generar Audio y Tiempos
  console.log(`\n🎙️  Iniciando generación de audio...`);
  try {
    execSync(`node generate-audio.js ${projectId}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error generando audio.');
    return;
  }

  // PASO 3: Comando para renderizar
  console.log(`\n🎉 ¡Proyecto "${projectId}" listo!`);
  console.log(`\nPara previsualizar:`);
  console.log(`  npm run dev`);
  console.log(`\nPara renderizar:`);
  console.log(`  npx remotion render VideoEngine --props='{"projectId": "${projectId}"}' out/${projectId}.mp4`);
}

const topic = process.argv[2];
automate(topic);
