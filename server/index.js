const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const WebSocket = require('ws');
const { exec, spawn } = require('child_process');
const { parseScript }     = require('./utils/parser');
const { parseWithOllama } = require('./utils/ollamaProvider');
const { readMemory, saveMemory, recordParseInsights, recordVisualStyle, computeInsights, getActiveChannelId } = require('../utils/memory');
const { parseScriptSmart } = require('./utils/smartParser');

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/projects', express.static(path.join(__dirname, '..', 'public', 'projects')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');
  ws.send(JSON.stringify({ type: 'status', message: 'Conectado al servidor de logs en tiempo real' }));
});

const getProjectsDir = () => {
  const channelId = getActiveChannelId();
  const dir = path.join(__dirname, '..', 'public', 'projects', channelId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const ACTIVE_FILE   = path.join(__dirname, 'active-project.json');

// ── Streaming helper ──────────────────────────────────────────────────────────
function runCommandStream(cmd, args, taskType, projectId, res, successMessage, extraResponseData = {}) {
  let totalParagraphs = 0;
  let totalScenes = 0;
  if (projectId) {
    try {
      const guionPath = path.join(getProjectsDir(), projectId, 'guion.json');
      if (fs.existsSync(guionPath)) {
        totalParagraphs = JSON.parse(fs.readFileSync(guionPath, 'utf8')).length;
      }
    } catch (_) {}
  }

  console.log(`[Stream] Ejecutando: ${cmd} ${args.join(' ')}`);
  
  // Start task at 0%
  broadcast({ type: 'progress', task: taskType, progress: 0, log: `Iniciando tarea: ${taskType}...` });

  const child = spawn(cmd, args, { cwd: path.join(__dirname, '..'), shell: true });
  
  let stdout = '';
  let stderr = '';
  
  let stdoutBuffer = '';
  let stderrBuffer = '';

  function handleLine(line, isError = false) {
    const trimmed = line.trim();
    if (!trimmed) return;

    let progress = null;
    if (['audio', 'plan', 'pexels'].includes(taskType) && totalParagraphs > 0) {
      const match = trimmed.match(/\[(?:parrafo-)?(\d+)\]/);
      if (match) {
        const current = parseInt(match[1]);
        progress = Math.min(Math.round((current / totalParagraphs) * 100), 100);
      }
    } else if (taskType === 'whisper') {
      const sceneMatch = trimmed.match(/Timing cargado:\s*(\d+)\s*escenas/);
      if (sceneMatch) {
        totalScenes = parseInt(sceneMatch[1]);
      }
      const segmentMatch = trimmed.match(/Procesando segmento\s*(\d+)/);
      if (segmentMatch && totalScenes > 0) {
        const current = parseInt(segmentMatch[1]);
        progress = Math.min(Math.round((current / totalScenes) * 100), 100);
      }
    }

    broadcast({
      type: 'progress',
      task: taskType,
      progress: progress,
      log: trimmed,
      isError
    });
  }

  child.stdout.on('data', (data) => {
    const str = data.toString();
    stdout += str;
    process.stdout.write(str);

    stdoutBuffer += str;
    let lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop();
    for (const line of lines) {
      handleLine(line, false);
    }
  });

  child.stderr.on('data', (data) => {
    const str = data.toString();
    stderr += str;
    process.stderr.write(str);

    stderrBuffer += str;
    let lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop();
    for (const line of lines) {
      handleLine(line, true);
    }
  });

  child.on('close', (code) => {
    if (stdoutBuffer.trim()) handleLine(stdoutBuffer, false);
    if (stderrBuffer.trim()) handleLine(stderrBuffer, true);

    if (code !== 0) {
      console.error(`[Stream] Comando falló con código ${code}`);
      broadcast({
        type: 'progress',
        task: taskType,
        progress: 100,
        log: `❌ Error: La tarea falló con código ${code}`,
        isError: true
      });
      if (!res.headersSent) {
        res.status(500).json({ error: `Error en tarea ${taskType}`, detail: stderr || stdout });
      }
    } else {
      console.log(`[Stream] Comando completado con éxito`);
      broadcast({
        type: 'progress',
        task: taskType,
        progress: 100,
        log: `✨ Tarea completada con éxito`
      });
      if (!res.headersSent) {
        let finalData = { message: successMessage };
        if (typeof extraResponseData === 'function') {
          finalData = { ...finalData, ...extraResponseData(stdout, stderr) };
        } else {
          finalData = { ...finalData, ...extraResponseData };
        }
        res.json(finalData);
      }
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readActiveProject() {
  try { return JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf8')).projectId || null; }
  catch (_) { return null; }
}

function saveActiveProject(projectId) {
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify({ projectId }));
}

function projectStatus(projectId) {
  const dir     = path.join(getProjectsDir(), projectId);
  const hasGuion    = fs.existsSync(path.join(dir, 'guion.json'));
  const hasTiming   = fs.existsSync(path.join(dir, 'timing.json'));
  const hasPlan     = fs.existsSync(path.join(dir, 'scene-plan.json'));
  const hasMedia    = fs.existsSync(path.join(dir, 'images')) || fs.existsSync(path.join(dir, 'videos'));
  const hasMetadata = fs.existsSync(path.join(dir, 'yt-metadata.txt'));
  const hasHyperframes = fs.existsSync(path.join(dir, 'hyperframes', 'index.html'));

  const compFile = path.join(dir, 'rendered-composition.txt');
  const renderedComposition = fs.existsSync(compFile) ? fs.readFileSync(compFile, 'utf8').trim() : null;

  let paragraphCount = 0;
  if (hasGuion) {
    try { paragraphCount = JSON.parse(fs.readFileSync(path.join(dir, 'guion.json'), 'utf8')).length; }
    catch (_) {}
  }

  return { hasGuion, hasTiming, hasPlan, hasMedia, hasMetadata, hasHyperframes, renderedComposition, paragraphCount };
}

// ── 1. List all projects ──────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  if (!fs.existsSync(getProjectsDir())) return res.json([]);

  const activeId = readActiveProject();
  const projects = fs.readdirSync(getProjectsDir())
    .filter(d => fs.statSync(path.join(getProjectsDir(), d)).isDirectory())
    .map(id => {
      const stat = fs.statSync(path.join(getProjectsDir(), id));
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
  const dir = path.join(getProjectsDir(), id);
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

  // Sanitizar el nombre del proyecto para evitar subdirectorios con barras '/' o caracteres extraños
  const projectId  = name.toLowerCase()
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/\\:\*\?\"<>\|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const projectDir = path.join(getProjectsDir(), projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(path.join(projectDir, 'full_script.txt'), rawScript);

  // Usar smartParser (Claude) con fallback determinista
  let guion;
  try {
    guion = await parseScriptSmart(rawScript, { projectName: name });
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
  const dir = path.join(getProjectsDir(), id);
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
  const dir = path.join(getProjectsDir(), id);
  const scriptPath = path.join(dir, 'full_script.txt');

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ error: 'No se encontró full_script.txt para este proyecto' });
  }

  const rawScript = fs.readFileSync(scriptPath, 'utf8');
  let guion;
  try {
    guion = await parseScriptSmart(rawScript, { projectName: id });
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
  runCommandStream('node', ['generate-audio.js', id], 'audio', id, res, 'Audio y timings generados');
});

// ── 5. Build scene-plan (LLM analysis) ───────────────────────────────────────
app.post('/api/projects/:id/scene-plan', (req, res) => {
  const { id } = req.params;
  const force = req.body?.force ? ['--force'] : [];
  console.log(`🧠 Generando scene-plan para: ${id}`);
  runCommandStream('node', ['scripts/build-scene-plan.js', id, ...force], 'plan', id, res, 'Scene-plan generado');
});

// ── 6. Fetch media from Pexels ───────────────────────────────────────────────
app.post('/api/projects/:id/fetch-media', (req, res) => {
  const { id } = req.params;
  console.log(`📥 Descargando media de Pexels para: ${id}`);
  runCommandStream('node', ['fetch-pexels.js', id], 'pexels', id, res, 'Media descargada');
});

// ── 6.5. Build HyperFrames HTML/GSAP ──────────────────────────────────────────
app.post('/api/projects/:id/build-hyperframes', (req, res) => {
  const { id } = req.params;
  console.log(`🎦 Compilando HyperFrames (HTML + GSAP) para: ${id}`);
  runCommandStream('node', ['scripts/build-hyperframes.js', id], 'hyperframes', id, res, 'HyperFrames compilado con éxito');
});

// ── 6.6. Render HyperFrames Video ─────────────────────────────────────────────
app.post('/api/projects/:id/render-hyperframes', (req, res) => {
  const { id } = req.params;
  console.log(`📹 Renderizando HyperFrames (Puppeteer + FFmpeg) para: ${id}`);
  runCommandStream('node', ['scripts/render-hyperframes.js', id], 'render', id, res, 'HyperFrames renderizado y exportado con éxito');
});

// ── 7. Activate existing project ─────────────────────────────────────────────
app.post('/api/projects/:id/activate', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(getProjectsDir(), id);

  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });

  saveActiveProject(id);
  console.log(`🎬 Proyecto activo: ${id}`);
  res.json({ message: `Proyecto "${id}" activado`, projectId: id });
});

// ── 7. Get active project data (for Remotion calculateMetadata) ───────────────
app.get('/api/active-project', (req, res) => {
  const projectId = readActiveProject();
  if (!projectId) return res.status(404).json({ error: 'No hay proyecto activo' });

  const dir = path.join(getProjectsDir(), projectId);
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
    channelId: getActiveChannelId(),
    guion:      JSON.parse(fs.readFileSync(guionPath,  'utf8')),
    timing:     JSON.parse(fs.readFileSync(timingPath, 'utf8')),
    scenePlan,
    wordTiming,
  });
});

// POST /api/active-project/set-composition → registra qué composición se está renderizando/previsualizando
app.post('/api/active-project/set-composition', (req, res) => {
  const { compositionId } = req.body;
  const projectId = readActiveProject();
  if (!projectId || !compositionId) {
    return res.status(400).json({ error: 'Falta active project o compositionId' });
  }

  const channelId = getActiveChannelId();
  const projectDir = path.join(getProjectsDir(), projectId);
  const fallbackDir = path.join(__dirname, '..', 'public', 'projects', projectId);
  const targetDir = fs.existsSync(projectDir) ? projectDir : (fs.existsSync(fallbackDir) ? fallbackDir : projectDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(path.join(targetDir, 'rendered-composition.txt'), compositionId, 'utf8');
  console.log(`📝 [Server] Registrado formato Remotion: "${compositionId}" para el proyecto activo: ${projectId}`);

  res.json({ ok: true, projectId, compositionId });
});

// ── 8. Generate word-level timing with Faster-Whisper ───────────────────────
app.post('/api/projects/:id/whisper-timing', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(getProjectsDir(), id);

  if (!fs.existsSync(dir)) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const audioPath = path.join(dir, 'audio.mp3');
  if (!fs.existsSync(audioPath)) {
    return res.status(400).json({ error: 'audio.mp3 no encontrado. Genera el audio primero.' });
  }

  console.log(`🎙️ Generando word-timing para: ${id}`);
  runCommandStream('python', ['scripts/whisper-timing.py', id], 'whisper', id, res, 'word-timing.json generado');
});

// ── 8b. Generate YouTube metadata (yt-metadata.txt) ─────────────────────────
app.post('/api/projects/:id/generate-yt-metadata', (req, res) => {
  const { id } = req.params;
  const dir    = path.join(getProjectsDir(), id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const scriptPath = path.join(dir, 'full_script.txt');
  if (!fs.existsSync(scriptPath)) {
    return res.status(400).json({ error: 'full_script.txt no encontrado. Crea el proyecto primero.' });
  }

  console.log(`📺 Generando yt-metadata para: ${id}`);
  runCommandStream('node', ['scripts/generate-yt-metadata.js', id], 'metadata', id, res, 'yt-metadata.txt generado', () => {
    const outPath = path.join(dir, 'yt-metadata.txt');
    const content = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
    return { ok: true, content };
  });
});

// GET /api/projects/:id/yt-metadata → devuelve el contenido si existe
app.get('/api/projects/:id/yt-metadata', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(getProjectsDir(), id, 'yt-metadata.txt');
  if (!fs.existsSync(filePath)) return res.json({ exists: false });
  res.json({ exists: true, content: fs.readFileSync(filePath, 'utf8') });
});

// ── 9. Delete project ─────────────────────────────────────────────────────────
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const dir = path.join(getProjectsDir(), id);
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

// PATCH /api/memory/video-format → asigna remotion_format manualmente a un video
app.patch('/api/memory/video-format', async (req, res) => {
  try {
    const { video_id, tema, remotion_format } = req.body;
    const allowed = ['VideoEngine', 'WhiteboardVideo'];
    if (!remotion_format || !allowed.includes(remotion_format)) {
      return res.status(400).json({ error: `remotion_format debe ser uno de: ${allowed.join(', ')}` });
    }
    if (!video_id && !tema) {
      return res.status(400).json({ error: 'Se necesita video_id o tema para identificar el video' });
    }

    const memory = await readMemory();
    const list   = memory.mejor_rendimiento || [];
    let updated  = false;

    for (const v of list) {
      const matchId   = video_id && v.video_id === video_id;
      const matchTema = tema     && v.tema      === tema;
      if (matchId || matchTema) {
        v.remotion_format = remotion_format;
        updated = true;
      }
    }

    if (!updated) {
      return res.status(404).json({ error: 'No se encontró el video en memoria' });
    }

    memory.mejor_rendimiento = list;
    await saveMemory(memory);
    res.json({ ok: true, updated_count: list.filter(v =>
      (video_id && v.video_id === video_id) || (tema && v.tema === tema)
    ).length });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar formato', detail: err.message });
  }
});


// POST /api/memory/sync → ejecuta el script scripts/auto-sync.js
app.post('/api/memory/sync', (req, res) => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'auto-sync.js');
  console.log(`🔄 Servidor iniciando auto-sync: node ${scriptPath}`);
  runCommandStream('node', [scriptPath], 'sync', null, res, 'Sincronización completada con éxito');
});

// ── 9. Analyze comments ────────────────────────────────────────────────────────
app.post('/api/projects/:id/analyze-comments', (req, res) => {
  const { id } = req.params;
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'Falta el videoId' });

  console.log(`💬 Analizando comentarios de video ${videoId} para proyecto ${id}`);
  runCommandStream('node', ['scripts/analyze-comments.js', videoId], 'comments', id, res, 'Comentarios analizados con éxito', () => {
    const reportFile = path.join(getProjectsDir(), id, `comments-analysis-${videoId}.md`);
    let reportContent = '';
    if (fs.existsSync(reportFile)) {
      reportContent = fs.readFileSync(reportFile, 'utf8');
    }
    return { report: reportContent };
  });
});

app.get('/api/projects/:id/comments-analysis', (req, res) => {
  const { id } = req.params;
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Falta el videoId' });

  const reportFile = path.join(getProjectsDir(), id, `comments-analysis-${videoId}.md`);
  if (fs.existsSync(reportFile)) {
    const content = fs.readFileSync(reportFile, 'utf8');
    return res.json({ exists: true, report: content });
  }

  res.json({ exists: false });
});

const CHANNELS_DIR = path.join(__dirname, '..', 'channels');
const ACTIVE_CHANNEL_FILE = path.join(__dirname, '..', 'active-channel.json');

// Listar canales disponibles
app.get('/api/channels', (req, res) => {
  if (!fs.existsSync(CHANNELS_DIR)) {
    return res.json([{ id: 'codigo-muerto', name: 'Código Muerto' }]);
  }
  const channels = fs.readdirSync(CHANNELS_DIR)
    .filter(d => fs.statSync(path.join(CHANNELS_DIR, d)).isDirectory())
    .map(id => {
      // Intentar formatear el nombre
      const name = id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      return { id, name };
    });
  res.json(channels);
});

// Obtener canal activo
app.get('/api/active-channel', (req, res) => {
  res.json({ channelId: getActiveChannelId() });
});

// Cambiar canal activo
app.post('/api/channels/activate', (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'Falta channelId' });
  const channelDir = path.join(CHANNELS_DIR, channelId);
  if (!fs.existsSync(channelDir)) {
    return res.status(404).json({ error: 'Canal no encontrado' });
  }
  fs.writeFileSync(ACTIVE_CHANNEL_FILE, JSON.stringify({ channelId }, null, 2));
  console.log(`🎬 Canal activo cambiado a: ${channelId}`);
  res.json({ message: `Canal "${channelId}" activado`, channelId });
});

// Crear nuevo canal
app.post('/api/channels', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre es requerido' });
  
  const channelId = name.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
    
  const channelDir = path.join(CHANNELS_DIR, channelId);
  if (fs.existsSync(channelDir)) {
    return res.status(400).json({ error: 'Ya existe un canal con este nombre' });
  }

  // Crear directorios
  fs.mkdirSync(channelDir, { recursive: true });
  fs.mkdirSync(path.join(__dirname, '..', 'public', 'projects', channelId), { recursive: true });

  // Crear channel-memory.json vacío
  const defaultMemory = {
    temas_usados: [],
    palabras_clave_agotadas: [],
    mejor_rendimiento: [],
    estilo_hooks: [],
    ultima_publicacion: '',
    total_videos: 0
  };
  fs.writeFileSync(path.join(channelDir, 'channel-memory.json'), JSON.stringify(defaultMemory, null, 2), 'utf8');

  // Copiar prompt.txt base (de codigo-muerto)
  const basePromptPath = path.join(CHANNELS_DIR, 'codigo-muerto', 'prompt.txt');
  const targetPromptPath = path.join(channelDir, 'prompt.txt');
  if (fs.existsSync(basePromptPath)) {
    fs.copyFileSync(basePromptPath, targetPromptPath);
  } else {
    fs.writeFileSync(targetPromptPath, '## ROL\nEscritor de guiones para el nuevo canal.', 'utf8');
  }

  console.log(`➕ Nuevo canal creado: ${name} (${channelId})`);
  res.json({ message: `Canal "${name}" creado con éxito`, channelId });
});

// ── Claude: Sugeridor de temas basado en memoria ──────────────────────────────
app.post('/api/memory/suggest-topics', async (req, res) => {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const memory   = await readMemory();
    const insights = computeInsights(memory);

    const perf = (memory.mejor_rendimiento || [])
      .filter(v => v.views > 0)
      .sort((a, b) => b.views - a.views);

    const topVideos = perf.slice(0, 5).map(v =>
      `- "${v.tema}" → ${v.views} views, ret ${v.retention ? (v.retention*100).toFixed(0)+'%' : 'n/d'}, CTR ${v.ctr ? (v.ctr*100).toFixed(1)+'%' : 'n/d'}, hook: ${v.hook_style}, formato: ${v.remotion_format || 'n/d'}`
    ).join('\n');

    const usedTopics = (memory.temas_usados || []).join(', ');
    const bestHooks  = (insights.best_hook_patterns || []).slice(0, 4).map(h =>
      `${h.pattern} (${h.avg_views} views avg, ${(h.avg_retention*100).toFixed(0)}% ret)`
    ).join(' | ');
    const fmtWinner = insights.format_performance?.[0]?.format || 'VideoEngine';

    const systemPrompt = `Eres un estratega de contenido para el canal de YouTube "Código Muerto".
El canal cubre historias de empresas tecnológicas que dominaron su industria y fracasaron dramáticamente.
El tono es técnico-analítico, con datos precisos, narrativa de tensión y un cierre con lección aplicable.
Nunca repites temas ya cubiertos.`;

    const userPrompt = `Analiza estos datos del canal y propón 5 nuevos temas de video.

## Videos más exitosos (top 5):
${topVideos}

## Temas YA cubiertos (NO repetir):
${usedTopics}

## Hooks que mejor funcionan:
${bestHooks}

## Formato ganador: ${fmtWinner}

## Lo que busca la audiencia:
- Historias de caída tecnológica con datos duros
- Paradojas ("tenían X pero hicieron Y")
- Consecuencias técnicas concretas

Para cada tema propón:
1. **Título del video** (formato: "X tenía Y — y Z")
2. **Hook de apertura** (1 oración, máx 25 palabras, con dato numérico)
3. **Tipo de hook** (usa la nomenclatura que funciona: dato-porcentaje-mas-consecuencia-escalada, causa-tecnica-como-condena, etc.)
4. **Por qué funcionará** (1 línea basada en los datos del canal)
5. **Formato recomendado** (VideoEngine o WhiteboardVideo)

Responde SOLO con JSON válido, sin markdown, sin explicaciones fuera del JSON:
{
  "temas": [
    {
      "titulo": "...",
      "hook": "...",
      "tipo_hook": "...",
      "razon": "...",
      "formato": "VideoEngine|WhiteboardVideo"
    }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let raw = message.content[0]?.text || '{}';
    // Limpiar posibles bloques de markdown
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw);

    res.json({ ok: true, suggestions: parsed.temas || [], model: message.model });
  } catch (err) {
    console.error('❌ Claude suggest-topics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});


