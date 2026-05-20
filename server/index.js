const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { exec } = require('child_process');
const { parseScript }     = require('./utils/parser');
const { parseWithOllama } = require('./utils/ollamaProvider');
const { readMemory, saveMemory, recordParseInsights, recordVisualStyle, computeInsights } = require('../utils/memory');
const { parseScriptSmart } = require('./utils/smartParser');

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
  const hasGuion    = fs.existsSync(path.join(dir, 'guion.json'));
  const hasTiming   = fs.existsSync(path.join(dir, 'timing.json'));
  const hasPlan     = fs.existsSync(path.join(dir, 'scene-plan.json'));
  const hasMedia    = fs.existsSync(path.join(dir, 'images')) || fs.existsSync(path.join(dir, 'videos'));
  const hasMetadata = fs.existsSync(path.join(dir, 'yt-metadata.txt'));

  let paragraphCount = 0;
  if (hasGuion) {
    try { paragraphCount = JSON.parse(fs.readFileSync(path.join(dir, 'guion.json'), 'utf8')).length; }
    catch (_) {}
  }

  return { hasGuion, hasTiming, hasPlan, hasMedia, hasMetadata, paragraphCount };
}

// ── 1. List all projects ──────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  if (!fs.existsSync(PROJECTS_DIR)) return res.json([]);

  const activeId = readActiveProject();
  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(d => fs.statSync(path.join(PROJECTS_DIR, d)).isDirectory())
    .map(id => {
      const stat = fs.statSync(path.join(PROJECTS_DIR, id));
      return {
        id,
        active: id === activeId,
        mtime: stat.mtimeMs,
        ...projectStatus(id),
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // Ordenar por modificación: más reciente primero

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
app.post('/api/projects', async (req, res) => {
  const { name, rawScript } = req.body;
  if (!name || !rawScript) return res.status(400).json({ error: 'Nombre y guion son requeridos' });

  const projectId  = name.toLowerCase().trim().replace(/\s+/g, '-');
  const projectDir = path.join(PROJECTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(path.join(projectDir, 'full_script.txt'), rawScript);

  // Usar smartParser (Claude) con fallback determinista
  let guion;
  try {
    guion = await parseScriptSmart(rawScript);
  } catch (err) {
    console.warn(`⚠️  smartParser falló, usando parser determinista: ${err.message}`);
    guion = parseScript(rawScript);
  }
  fs.writeFileSync(path.join(projectDir, 'guion.json'), JSON.stringify(guion, null, 2));

  // Aprendizaje del canal: registramos características del guion y estilo visual
  recordParseInsights(projectId, rawScript, guion).catch(() => {});
  recordVisualStyle(projectId, guion).catch(() => {});

  console.log(`✅ Proyecto "${projectId}" creado: ${guion.length} fragmentos`);
  res.json({ message: 'Proyecto creado correctamente', projectId, paragraphCount: guion.length });
});

// ── 3b. Re-parse determinista (parser original) ───────────────────────────────
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

// ── 3c. Smart re-parse con Claude ─────────────────────────────────────────────
app.post('/api/projects/:id/smart-reparse', async (req, res) => {
  const { id } = req.params;
  const dir = path.join(PROJECTS_DIR, id);
  const scriptPath = path.join(dir, 'full_script.txt');

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'No se encontró full_script.txt para este proyecto' });
  }

  const rawScript = fs.readFileSync(scriptPath, 'utf8');
  let guion;
  try {
    guion = await parseScriptSmart(rawScript);
  } catch (err) {
    return res.status(500).json({ error: 'Error en smart-reparse', detail: err.message });
  }
  fs.writeFileSync(path.join(dir, 'guion.json'), JSON.stringify(guion, null, 2));

  // Aprendizaje: registramos parse insights + estilo visual del nuevo guion
  recordParseInsights(id, rawScript, guion).catch(() => {});
  recordVisualStyle(id, guion).catch(() => {});

  console.log(`🧠 Smart re-parse de "${id}": ${guion.length} fragmentos`);
  res.json({ message: 'Guion re-fragmentado con Claude', projectId: id, paragraphCount: guion.length });
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

  // word-timing.json es opcional — lo incluye si ya fue generado con Faster-Whisper
  const wordTimingPath = path.join(dir, 'word-timing.json');
  let wordTiming = null;
  if (fs.existsSync(wordTimingPath)) {
    try { wordTiming = JSON.parse(fs.readFileSync(wordTimingPath, 'utf8')); }
    catch (e) { console.warn(`word-timing.json inválido: ${e.message}`); }
  }

  res.json({
    projectId,
    guion:      JSON.parse(fs.readFileSync(guionPath,  'utf8')),
    timing:     JSON.parse(fs.readFileSync(timingPath, 'utf8')),
    scenePlan,
    wordTiming,
  });
});

// ── 8. Generate word-level timing with Faster-Whisper ───────────────────────
app.post('/api/projects/:id/whisper-timing', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(PROJECTS_DIR, id);

  if (!fs.existsSync(dir)) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const audioPath = path.join(dir, 'audio.mp3');
  if (!fs.existsSync(audioPath)) {
    return res.status(400).json({ error: 'audio.mp3 no encontrado. Genera el audio primero.' });
  }

  console.log(`🎙️ Generando word-timing para: ${id}`);
  exec(
    `python scripts/whisper-timing.py "${id}"`,
    { cwd: path.join(__dirname, '..'), timeout: 300_000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ whisper-timing error: ${error.message}`);
        return res.status(500).json({
          error:  'Error generando word-timing',
          detail: error.message,
          stderr,
        });
      }
      console.log(stdout);
      res.json({ ok: true, message: stdout.trim() });
    }
  );
});

// ── 8b. Generate YouTube metadata (yt-metadata.txt) ─────────────────────────
app.post('/api/projects/:id/generate-yt-metadata', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const scriptPath = path.join(dir, 'full_script.txt');
  if (!fs.existsSync(scriptPath)) {
    return res.status(400).json({ error: 'full_script.txt no encontrado. Crea el proyecto primero.' });
  }

  console.log(`📺 Generando yt-metadata para: ${id}`);
  exec(
    `node scripts/generate-yt-metadata.js "${id}"`,
    { cwd: path.join(__dirname, '..'), timeout: 180_000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ yt-metadata error: ${error.message}`);
        return res.status(500).json({ error: 'Error generando yt-metadata', detail: error.message, stderr });
      }
      const outPath = path.join(dir, 'yt-metadata.txt');
      const content = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
      console.log(stdout);
      res.json({ ok: true, message: 'yt-metadata.txt generado', content });
    }
  );
});

// GET /api/projects/:id/yt-metadata → devuelve el contenido si existe
app.get('/api/projects/:id/yt-metadata', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(PROJECTS_DIR, id, 'yt-metadata.txt');
  if (!fs.existsSync(filePath)) return res.json({ exists: false });
  res.json({ exists: true, content: fs.readFileSync(filePath, 'utf8') });
});

// ── 9. Delete project ─────────────────────────────────────────────────────────
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const dir = path.join(PROJECTS_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });
  fs.rmSync(dir, { recursive: true, force: true });
  if (readActiveProject() === id) saveActiveProject(null);
  res.json({ message: `Proyecto "${id}" eliminado` });
});

// ── 9. Memory endpoints ────────────────────────────────────────────────────────

// GET /api/memory → retorna channel-memory.json completo
app.get('/api/memory', async (req, res) => {
  try {
    const memory = await readMemory();
    res.json(memory);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo leer la memoria del canal', detail: err.message });
  }
});

// POST /api/memory/topic-used → marca un tema como usado
app.post('/api/memory/topic-used', async (req, res) => {
  const { tema } = req.body;
  if (!tema || typeof tema !== 'string') {
    return res.status(400).json({ error: 'El campo "tema" es requerido y debe ser un string' });
  }
  try {
    const memory = await readMemory();
    const normalized = tema.trim().toLowerCase();
    const alreadyExists = memory.temas_usados.some(
      (t) => t.toLowerCase().trim() === normalized
    );
    if (!alreadyExists) {
      memory.temas_usados.push(tema.trim());
      await saveMemory(memory);
      console.log(`✅ Tema "${tema}" marcado como usado.`);
    }
    res.json({
      message: alreadyExists ? 'El tema ya estaba registrado' : 'Tema marcado como usado',
      tema:    tema.trim(),
      total:   memory.temas_usados.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar la memoria', detail: err.message });
  }
});

// POST /api/prompt/enriched → genera prompt-enriched.txt con insights inyectados
// Body: { tema?: string }
app.post('/api/prompt/enriched', (req, res) => {
  const tema = (req.body && req.body.tema) ? String(req.body.tema) : '';
  const args = tema ? `"${tema.replace(/"/g, '\\"')}"` : '';
  exec(
    `node scripts/build-enriched-prompt.js ${args}`,
    { cwd: path.join(__dirname, '..'), timeout: 30_000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ build-enriched-prompt error: ${error.message}`);
        return res.status(500).json({ error: 'No se pudo generar prompt enriquecido', detail: error.message, stderr });
      }
      const outPath = path.join(__dirname, '..', 'prompt-enriched.txt');
      const content = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
      res.json({ ok: true, content, stdout: stdout.trim() });
    }
  );
});

// GET /api/memory/insights → análisis derivado (no ML, agregación estadística)
app.get('/api/memory/insights', async (req, res) => {
  try {
    const insights = await computeInsights();
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron computar los insights', detail: err.message });
  }
});

// GET /api/memory/performance → retorna mejor_rendimiento ordenado por retention desc
app.get('/api/memory/performance', async (req, res) => {
  try {
    const memory = await readMemory();
    const sorted = (memory.mejor_rendimiento || [])
      .slice()
      .sort((a, b) => (b.retention || 0) - (a.retention || 0));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo leer el rendimiento', detail: err.message });
  }
});

// POST /api/memory/sync → ejecuta el script scripts/auto-sync.js
app.post('/api/memory/sync', (req, res) => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'auto-sync.js');
  console.log(`🔄 Servidor iniciando auto-sync: node ${scriptPath}`);
  
  exec(`node "${scriptPath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ Error en auto-sync desde API: ${err.message}`);
      return res.status(500).json({ error: 'Error en auto-sync', detail: err.message, stderr });
    }
    console.log(`✅ Sincronización exitosa.`);
    res.json({ message: 'Sincronización completada con éxito', stdout });
  });
});
// ── 9. Analyze comments ────────────────────────────────────────────────────────
app.post('/api/projects/:id/analyze-comments', (req, res) => {
  const { id } = req.params;
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'Falta el videoId' });

  console.log(`💬 Analizando comentarios de video ${videoId} para proyecto ${id}`);

  exec(`node scripts/analyze-comments.js ${videoId}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error analizando comentarios', detail: error.message });
    }

    const reportFile = path.join(PROJECTS_DIR, id, `comments-analysis-${videoId}.md`);
    let reportContent = '';
    if (fs.existsSync(reportFile)) {
      reportContent = fs.readFileSync(reportFile, 'utf8');
    } else {
      reportContent = stdout;
    }

    res.json({ message: 'Comentarios analizados con éxito', report: reportContent });
  });
});

app.get('/api/projects/:id/comments-analysis', (req, res) => {
  const { id } = req.params;
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Falta el videoId' });

  const reportFile = path.join(PROJECTS_DIR, id, `comments-analysis-${videoId}.md`);
  if (fs.existsSync(reportFile)) {
    const content = fs.readFileSync(reportFile, 'utf8');
    return res.json({ exists: true, report: content });
  }

  res.json({ exists: false });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

