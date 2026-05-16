const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { exec } = require('child_process');
const { parseScript }    = require('./utils/parser');
const { parseWithOllama } = require('./utils/ollamaProvider');

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PROJECTS_DIR  = path.join(__dirname, '..', 'public', 'projects');
const ACTIVE_FILE   = path.join(__dirname, 'active-project.json');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readActiveProject() {
  try { return JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8')).projectId || null; }
  catch (_) { return null; }
}

function saveActiveProject(projectId) {
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ projectId }));
}

function projectStatus(projectId) {
  const dir     = path.join(PROJECTS_DIR, projectId);
  const hasGuion  = fs.existsSync(path.join(dir, 'guion.json'));
  const hasTiming = fs.existsSync(path.join(dir, 'timing.json'));
  const hasPlan   = fs.existsSync(path.join(dir, 'scene-plan.json'));
  const hasMedia  = fs.existsSync(path.join(dir, 'images')) || fs.existsSync(path.join(dir, 'videos'));

  let paragraphCount = 0;
  if (hasGuion) {
    try { paragraphCount = JSON.parse(fs.readFileSync(path.join(dir, 'guion.json'), 'utf8')).length; }
    catch (_) {}
  }

  return { hasGuion, hasTiming, hasPlan, hasMedia, paragraphCount };
}

// ── 1. List all projects ──────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  if (!fs.existsSync(PROJECTS_DIR)) return res.json([]);

  const activeId = readActiveProject();
  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(d => fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory())
    .map(id => ({
      id,
      active: id === activeId,
      ...projectStatus(id),
    }));

  res.json(projects);
});

// ── 2. Get single project detail ──────────────────────────────────────────────
app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const status = projectStatus(id);
  let guion = null;
  let timing = null;

  if (status.hasGuion)  guion  = JSON.parse(fs.readFileSync(path.join(dir, 'guion.json'),  'utf8'));
  if (status.hasTiming) timing = JSON.parse(fs.readFileSync(path.join(dir, 'timing.json'), 'utf8'));

  res.json({ id, ...status, guion, timing });
});

// ── 3. Create project + parse script ─────────────────────────────────────────
app.post('/api/projects', (req, res) => {
  const { name, rawScript } = req.body;
  if (!name || !rawScript) return res.status(400).json({ error: 'Nombre y guion son requeridos' });

  const projectId  = name.toLowerCase().trim().replace(/\s+/g, '-');
  const projectDir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(path.join(projectDir, 'full_script.txt'), rawScript);

  const guion = parseScript(rawScript);
  fs.writeFileSync(path.join(projectDir, 'guion.json'), JSON.stringify(guion, null, 2));

  console.log(`✅ Proyecto "${projectId}" creado: ${guion.length} párrafos`);
  res.json({ message: 'Proyecto creado correctamente', projectId, paragraphCount: guion.length });
});

// ── 3b. Re-parse an existing project (uses deterministic parser) ──────────────
app.post('/api/projects/:id/reparse', (req, res) => {
  const { id } = req.params;
  const dir = path.join(PROJECTS_DIR, id);
  const scriptPath = path.join(dir, 'full_script.txt');

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'No se encontró full_script.txt para este proyecto' });
  }

  const rawScript = fs.readFileSync(scriptPath, 'utf8');
  const guion = parseScript(rawScript);
  fs.writeFileSync(path.join(dir, 'guion.json'), JSON.stringify(guion, null, 2));

  console.log(`🔄 Re-parseo de "${id}": ${guion.length} párrafos`);
  res.json({ message: 'Guion re-procesado correctamente', projectId: id, paragraphCount: guion.length });
});

// ── 4. Generate audio + timings ───────────────────────────────────────────────
app.post('/api/projects/:id/generate-audio', (req, res) => {
  const { id } = req.params;
  console.log(`🎙️ Generando audio para: ${id}`);
  exec(`node generate-audio.js ${id}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error generando audio', detail: error.message });
    }
    console.log(stdout);
    res.json({ message: 'Audio y timings generados' });
  });
});

// ── 5. Build scene-plan (LLM analysis) ───────────────────────────────────────
app.post('/api/projects/:id/scene-plan', (req, res) => {
  const { id } = req.params;
  const force = req.body?.force ? ' --force' : '';
  console.log(`🧠 Generando scene-plan para: ${id}`);
  exec(`node scripts/build-scene-plan.js ${id}${force}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error generando scene-plan', detail: error.message });
    }
    console.log(stdout);
    res.json({ message: 'Scene-plan generado' });
  });
});

// ── 6. Fetch media from Pexels ───────────────────────────────────────────────
app.post('/api/projects/:id/fetch-media', (req, res) => {
  const { id } = req.params;
  console.log(`📥 Descargando media de Pexels para: ${id}`);
  exec(`node fetch-pexels.js ${id}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error descargando media', detail: error.message });
    }
    console.log(stdout);
    res.json({ message: 'Media descargada' });
  });
});

// ── 7. Activate existing project ─────────────────────────────────────────────
app.post('/api/projects/:id/activate', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(PROJECTS_DIR, id);

  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });

  saveActiveProject(id);
  console.log(`🎬 Proyecto activo: ${id}`);
  res.json({ message: `Proyecto "${id}" activado`, projectId: id });
});

// ── 7. Get active project data (for Remotion calculateMetadata) ───────────────
app.get('/api/active-project', (req, res) => {
  const projectId = readActiveProject();
  if (!projectId) return res.status(404).json({ error: 'No hay proyecto activo' });

  const dir = path.join(PROJECTS_DIR, projectId);
  const guionPath  = path.join(dir, 'guion.json');
  const timingPath = path.join(dir, 'timing.json');
  const planPath   = path.join(dir, 'scene-plan.json');

  if (!fs.existsSync(guionPath) || !fs.existsSync(timingPath)) {
    return res.status(404).json({ error: 'Faltan archivos del proyecto activo' });
  }

  let scenePlan = null;
  if (fs.existsSync(planPath)) {
    try { scenePlan = JSON.parse(fs.readFileSync(planPath, 'utf8')); }
    catch (e) { console.warn(`scene-plan.json inválido: ${e.message}`); }
  }

  res.json({
    projectId,
    guion:  JSON.parse(fs.readFileSync(guionPath,  'utf8')),
    timing: JSON.parse(fs.readFileSync(timingPath, 'utf8')),
    scenePlan,
  });
});

// ── 8. Delete project ─────────────────────────────────────────────────────────
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });
  fs.rmSync(dir, { recursive: true, force: true });
  if (readActiveProject() === id) saveActiveProject(null);
  res.json({ message: `Proyecto "${id}" eliminado` });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
