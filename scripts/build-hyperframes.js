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

let channelId = 'codigo-muerto';
try {
  const activeFile = path.join(__dirname, '..', 'active-channel.json');
  if (fs.existsSync(activeFile)) {
    channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
  }
} catch (_) {}

let PROJECT_DIR = path.join(__dirname, '..', 'public', 'projects', channelId, PROJECT_ID);
if (!fs.existsSync(PROJECT_DIR)) {
  PROJECT_DIR = path.join(__dirname, '..', 'public', 'projects', PROJECT_ID);
}
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

// Try reading word timings from Faster-Whisper if available
const WORD_TIMING_PATH = path.join(PROJECT_DIR, 'word-timing.json');
let wordTimings = [];
if (fs.existsSync(WORD_TIMING_PATH)) {
  try {
    wordTimings = JSON.parse(fs.readFileSync(WORD_TIMING_PATH, 'utf8'));
    console.log(`🎙️  Timings de palabras cargados desde word-timing.json (${wordTimings.length} palabras)`);
  } catch (e) {
    console.warn(`⚠️  Advertencia: Error al leer word-timing.json: ${e.message}`);
  }
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

  // Filter word timings specifically for this scene
  const sceneWords = wordTimings.filter(w => 
    String(w.escena_id) === String(scene.id) || 
    parseInt(w.escena_id, 10) === parseInt(scene.id, 10)
  );

  // Pre-process visual elements to link downloaded Pexels media files
  const elements = (scene.visual.elements || []).map((el, idx) => {
    const elCopy = { ...el };
    
    // Calculate precise speech-timed trigger start_sec matching Remotion exactly
    let triggerSec = findTriggerSec(elCopy.trigger_word, sceneWords);
    if (triggerSec === null) {
      const ratio = (scene.visual.elements || []).length > 0 ? idx / (scene.visual.elements || []).length : 0;
      triggerSec = start + duration * ratio * 0.6;
    }
    
    // Convert to 30fps frame relative to scene to align with Remotion's Math.max(4, Math.round(sceneRelSec * 30))
    const sceneRelSec = triggerSec - start;
    const fireFrame = Math.max(4, Math.round(sceneRelSec * 30));
    elCopy.start_sec = Number((start + fireFrame / 30).toFixed(3));
    console.log(`   👁️ [Escena ${scene.id}] Elemento "${elCopy.id}" (${elCopy.trigger_word}) sincronizado en t=${elCopy.start_sec}s`);

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

  // Calculate timing for explicit connections & arrows
  const processedArrows = (scene.visual.arrows || []).map(arr => {
    const arrCopy = { ...arr };
    const fromEl = elements.find(e => e.id === arr.from);
    const toEl = elements.find(e => e.id === arr.to);
    if (fromEl && toEl) {
      const fromFireFrame = Math.max(4, Math.round(((fromEl.start_sec || start) - start) * 30));
      const toFireFrame = Math.max(4, Math.round(((toEl.start_sec || start) - start) * 30));
      // Arrow fires 4 frames after both connected elements have appeared
      const arrowFireFrame = Math.max(fromFireFrame, toFireFrame) + 4;
      arrCopy.start_sec = Number((start + arrowFireFrame / 30).toFixed(3));
    } else {
      arrCopy.start_sec = Number((start + 0.8).toFixed(3));
    }
    return arrCopy;
  });

  // Generate automatic center connectors for radial layouts (scene has center and >= 4 elements)
  const hasCenter = elements.some(e => e.slot === 'center');
  if (elements.length >= 4 && hasCenter) {
    const centerEl = elements.find(e => e.slot === 'center');
    const orbitalElements = elements.filter(e => e.slot !== 'center' && !processedArrows.some(a => a.from === e.id || a.to === e.id));
    
    orbitalElements.forEach(el => {
      const fromFireFrame = Math.max(4, Math.round(((centerEl.start_sec || start) - start) * 30));
      const toFireFrame = Math.max(4, Math.round(((el.start_sec || start) - start) * 30));
      const arrowFireFrame = Math.max(fromFireFrame, toFireFrame) + 4;
      
      const autoArrow = {
        from: centerEl.id,
        to: el.id,
        style: 'dashed_straight',
        start_sec: Number((start + arrowFireFrame / 30).toFixed(3))
      };
      
      processedArrows.push(autoArrow);
      console.log(`   🏹 [Escena ${scene.id}] Conector radial auto-generado: ${centerEl.id} -> ${el.id} en t=${autoArrow.start_sec}s`);
    });
  }

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
      arrows: processedArrows
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

function normalizeWord(w) {
  if (!w) return "";
  return w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findTriggerSec(triggerWord, sceneWords) {
  if (!triggerWord || !sceneWords || !sceneWords.length) return null;
  const target = normalizeWord(triggerWord);
  if (!target) return null;

  const equivalents = {
    "xml": ["eksml", "exml", "xml"],
    "cpu": ["pu", "pego", "cpu"],
    "transformation": ["transformacion", "transformations"],
    "ellis": ["elis"],
    "gibbs": ["yips"],
    "10": ["diez", "10"],
    "diez": ["10", "diez"],
    "20": ["veinte", "20"],
    "veinte": ["20", "veinte"],
    "30": ["treinta", "30"],
    "50": ["cincuenta", "50"],
    "cincuenta": ["50", "cincuenta"],
    "500ms": ["500", "500ms"],
    "800ms": ["800", "800ms"],
    "gmail": ["jamal", "gmail"],
    "21mb": ["uno", "omega", "omegas", "dos", "21mb"],
    "ttfmr": ["ttf", "mr", "ttfmr"],
    "xmpp": ["xmp", "xmpp", "eksml"],
    "parsearse": ["parcearse", "parsearse"],
    "parchear": ["parchar", "parchear"],
    "overhead": ["overjet", "overhead"],
    "docs": ["dogs", "docs"],
    "anidada": ["formanidad", "anidada"],
    "threads": ["trets", "tretsanidados", "threads"]
  };

  const candidates = [target];
  if (equivalents[target]) {
    candidates.push(...equivalents[target]);
  }

  for (const w of sceneWords) {
    const n = normalizeWord(w.palabra);
    for (const cand of candidates) {
      if (n === cand) return w.inicio;
      if (cand.length > 3 && n.includes(cand)) return w.inicio;
      if (n.length > 3 && cand.includes(n)) return w.inicio;
    }
  }

  for (const w of sceneWords) {
    const n = normalizeWord(w.palabra);
    for (const cand of candidates) {
      if (cand.length > 4 && (cand.includes(n) || n.includes(cand))) {
        return w.inicio;
      }
    }
  }

  return null;
}
