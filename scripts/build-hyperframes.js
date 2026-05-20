/**
 * ── HyperFrames Project Compiler (GSAP Timeline compiler) ─────────────────────────
 * Usage: node scripts/build-hyperframes.js [projectId]
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ID = process.argv[2] || getActiveProjectId();

if (!PROJECT_ID) {
  console.error('❌ Error: No se especificó ningún projectId y no hay proyecto activo.');
  process.exit(1);
}

console.log(`🧠 [HyperFrames Compiler] Iniciando compilación de "${PROJECT_ID}"...`);

const PROJECT_DIR = path.join(__dirname, '..', 'public', 'projects', PROJECT_ID);
const GUION_PATH = path.join(PROJECT_DIR, 'guion.json');
const TIMING_PATH = path.join(PROJECT_DIR, 'timing.json');
const PLAN_PATH = path.join(PROJECT_DIR, 'scene-plan.json');
const OUTPUT_DIR = path.join(PROJECT_DIR, 'hyperframes');
const TEMPLATES_DIR = path.join(__dirname, '..', 'server', 'templates', 'hyperframes');

// ── Validation ────────────────────────────────────────────────────────────────
if (!fs.existsSync(PROJECT_DIR)) {
  console.error(`❌ Error: El directorio del proyecto no existe: ${PROJECT_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(GUION_PATH)) {
  console.error(`❌ Error: No se encontró guion.json en ${PROJECT_DIR}`);
  process.exit(1);
}

// ── Read Inputs ──────────────────────────────────────────────────────────────
const guion = JSON.parse(fs.readFileSync(GUION_PATH, 'utf8'));

let timings = {};
if (fs.existsSync(TIMING_PATH)) {
  timings = JSON.parse(fs.readFileSync(TIMING_PATH, 'utf8'));
  console.log(`✅ Timings de audio cargados desde timing.json`);
} else {
  console.warn(`⚠️  Advertencia: No se encontró timing.json. Generando timings automáticos...`);
  // Generate dummy timings: 8 seconds per scene
  guion.forEach((scene, index) => {
    const start = index * 8;
    timings[`parrafo-${scene.id}`] = {
      start: start,
      duration: 8
    };
  });
}

// Try reading scene-plan for exact image filename mappings
let scenePlan = null;
if (fs.existsSync(PLAN_PATH)) {
  try {
    scenePlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
  } catch (_) {}
}

// ── Process Scenes ────────────────────────────────────────────────────────────
let totalDuration = 0;
const processedScenes = [];

guion.forEach((scene, index) => {
  const pKey = `parrafo-${scene.id}`;
  const timeInfo = timings[pKey] || timings[scene.id] || { start: index * 8, duration: 8 };
  
  const start = timeInfo.start;
  const duration = timeInfo.duration;
  const end = start + duration;
  
  if (end > totalDuration) {
    totalDuration = end;
  }

  // Pre-process visual elements to link downloaded Pexels media files
  const elements = (scene.visual.elements || []).map(el => {
    const elCopy = { ...el };
    
    if (elCopy.type === 'pexels_image') {
      // 1. Try to find the exact filename in scene-plan
      let matchedFilename = null;
      if (scenePlan && scenePlan.paragraphs) {
        const pData = scenePlan.paragraphs.find(p => p.id === scene.id);
        if (pData && pData.media && pData.media.filename) {
          matchedFilename = pData.media.filename;
        }
      }
      
      // 2. Scan images folder for local files matching parrafo-ID
      const imagesDir = path.join(PROJECT_DIR, 'images');
      if (fs.existsSync(imagesDir)) {
        const filesInDir = fs.readdirSync(imagesDir);
        
        // Find if any file starts with parrafo-ID
        const basePattern = `parrafo-${scene.id}`;
        const localFile = filesInDir.find(f => f.toLowerCase().startsWith(basePattern.toLowerCase()));
        
        if (localFile) {
          elCopy.local_path = `public/projects/${PROJECT_ID}/images/${localFile}`;
          console.log(`   🖼️ [Escena ${scene.id}] Imagen local vinculada: ${localFile}`);
        } else if (matchedFilename && filesInDir.includes(matchedFilename)) {
          elCopy.local_path = `public/projects/${PROJECT_ID}/images/${matchedFilename}`;
          console.log(`   🖼️ [Escena ${scene.id}] Imagen vinculada por plan: ${matchedFilename}`);
        }
      }
    }
    
    return elCopy;
  });

  processedScenes.push({
    id: scene.id,
    texto: scene.texto,
    chapter_title: scene.chapter_title,
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    visual: {
      color_mood: scene.visual.color_mood || 'positivo',
      elements: elements,
      arrows: scene.visual.arrows || []
    }
  });
});

console.log(`📊 Total escenas procesadas: ${processedScenes.length}`);
console.log(`⏱️ Duración total calculada: ${totalDuration.toFixed(2)}s`);

// ── Copy Templates and Output Files ──────────────────────────────────────────
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Copy index.html, style.css, engine.js from templates
const filesToCopy = ['index.html', 'style.css', 'engine.js'];
filesToCopy.forEach(file => {
  const src = path.join(TEMPLATES_DIR, file);
  const dest = path.join(OUTPUT_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});
console.log(`📂 Copiados archivos base de plantilla a la carpeta del proyecto`);

// ── Generate data.js ──────────────────────────────────────────────────────────
const dataPayload = {
  projectId: PROJECT_ID,
  duration: Number(totalDuration.toFixed(2)),
  scenes: processedScenes
};

const dataJsContent = `// Archivo generado automáticamente. No editar manualmente.
window.hyperframesData = ${JSON.stringify(dataPayload, null, 2)};
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'data.js'), dataJsContent, 'utf8');
console.log(`✨ Creado archivo de datos de línea de tiempo "data.js"`);

console.log(`✅ [HyperFrames Compiler] Compilación exitosa para "${PROJECT_ID}"!`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getActiveProjectId() {
  const activePath = path.join(__dirname, '..', 'active-project.json');
  try {
    if (fs.existsSync(activePath)) {
      return JSON.parse(fs.readFileSync(activePath, 'utf8')).projectId || null;
    }
  } catch (_) {}
  return null;
}
