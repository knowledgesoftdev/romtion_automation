#!/usr/bin/env node
/**
 * scripts/visual-qa.js
 *
 * Agente de Aseguramiento de Calidad Visual (Visual QA Agent) para Remotion.
 * Renderiza keyframes estáticos distribuídos de las escenas del proyecto activo
 * y utiliza la API multimodal de Claude para realizar una auditoría de diseño.
 *
 * Uso:
 *   node scripts/visual-qa.js [projectId] [--limit=5]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (_) {
  Anthropic = null;
}

// ─── Configuración ──────────────────────────────────────────────────────────────
let channelId = 'codigo-muerto';
try {
  const activeFile = path.join(__dirname, '..', 'active-channel.json');
  if (fs.existsSync(activeFile)) {
    channelId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || 'codigo-muerto';
  }
} catch (_) {}

let PROJECTS_DIR = path.join(__dirname, '..', 'public', 'projects', channelId);
if (!fs.existsSync(PROJECTS_DIR)) {
  PROJECTS_DIR = path.join(__dirname, '..', 'public', 'projects');
}
const REF_DIR = path.join(__dirname, '..', '.refframes');
const FPS = 30;

// Colores de consola
const log = {
  step:  (msg) => console.log(`\n🔷 ${msg}`),
  ok:    (msg) => console.log(`   ✅ ${msg}`),
  warn:  (msg) => console.log(`   ⚠️  ${msg}`),
  error: (msg) => console.error(`\n❌ ERROR: ${msg}`),
  info:  (msg) => console.log(`   ℹ️  ${msg}`),
};

// Cargar variables de entorno
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_NAME = process.env.VISUAL_QA_MODEL || 'claude-haiku-4-5';

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    👁️   AUDITOR DE CALIDAD VISUAL (VISUAL QA)     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!Anthropic) {
    log.error('Dependencia @anthropic-ai/sdk no encontrada. Ejecuta "npm install".');
    process.exit(1);
  }
  if (!ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY no está configurada en el archivo .env.');
    process.exit(1);
  }

  // 1. Resolver projectId
  let projectId = process.argv.slice(2).find(arg => !arg.startsWith('-') && !arg.endsWith('.js') && !arg.endsWith('visual-qa'));
  if (!projectId) {
    const activeProjectFile = path.join(__dirname, '..', 'active-project.json');
    if (fs.existsSync(activeProjectFile)) {
      try {
        const active = JSON.parse(fs.readFileSync(activeProjectFile, 'utf8'));
        projectId = active.projectId;
      } catch (e) {
        log.warn(`No se pudo leer active-project.json: ${e.message}`);
      }
    }
  }

  // Fallback si no hay
  if (!projectId) {
    projectId = 'google-wave';
    log.info(`Usando proyecto por defecto: ${projectId}`);
  }

  const projectDir = path.join(PROJECTS_DIR, projectId);
  const guionPath = path.join(projectDir, 'guion.json');
  const timingPath = path.join(projectDir, 'timing.json');

  if (!fs.existsSync(projectDir)) {
    log.error(`La carpeta del proyecto no existe: ${projectDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(guionPath) || !fs.existsSync(timingPath)) {
    log.error(`guion.json o timing.json ausentes en ${projectDir}`);
    process.exit(1);
  }

  // Parsear limit
  let limit = 5;
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    limit = parseInt(limitArg.split('=')[1], 10) || 5;
  }

  log.step(`Iniciando auditoría visual para el proyecto: "${projectId}"`);
  log.info(`Límite máximo de escenas a auditar: ${limit}`);

  const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));
  const timing = JSON.parse(fs.readFileSync(timingPath, 'utf8'));

  if (!Array.isArray(guion) || guion.length === 0) {
    log.error('El archivo guion.json está vacío o no es un array válido.');
    process.exit(1);
  }

  // Asegurar que la carpeta de renders temporales existe
  if (!fs.existsSync(REF_DIR)) {
    fs.mkdirSync(REF_DIR, { recursive: true });
    log.ok('Carpeta temporaria .refframes creada.');
  }

  // 2. Seleccionar escenas a auditar (distribuídas uniformemente)
  const auditedScenes = selectScenes(guion, limit);
  log.info(`Seleccionadas ${auditedScenes.length} de ${guion.length} escenas para auditar (distribución equitativa).`);

  const clientClass = Anthropic.default || Anthropic;
  const client = new clientClass({ apiKey: ANTHROPIC_API_KEY });
  const results = [];

  // 3. Iterar y procesar cada escena elegida
  for (let idx = 0; idx < auditedScenes.length; idx++) {
    const scene = auditedScenes[idx];
    const key = `parrafo-${scene.id}`;
    const sceneTime = timing[key];

    if (!sceneTime) {
      log.warn(`No hay tiempos definidos en timing.json para la escena ${scene.id}. Saltando.`);
      continue;
    }

    log.step(`Procesando Escena ${scene.id} (${idx + 1}/${auditedScenes.length})`);
    
    // Calcular el frame del medio de la escena
    const startSec = sceneTime.start;
    const durationSec = sceneTime.duration;
    const midSec = startSec + durationSec / 2;
    const targetFrame = Math.max(15, Math.round(midSec * FPS));

    const imageFilename = `${projectId}-scene-${scene.id}.jpg`;
    const imagePath = path.join(REF_DIR, imageFilename);

    // Renderizar still frame con Remotion
    log.info(`Renderizando frame ${targetFrame} (segundo ${midSec.toFixed(2)}s)...`);
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath); // borrar previo si existe
      }
      
      const renderCmd = `npx remotion still WhiteboardVideo "${imagePath}" --frame=${targetFrame} --overwrite`;
      execSync(renderCmd, { stdio: 'pipe', cwd: path.join(__dirname, '..') });
      
      if (!fs.existsSync(imagePath)) {
        throw new Error('El archivo de imagen no fue generado.');
      }
      log.ok(`Render completado: ${imagePath}`);
    } catch (err) {
      log.error(`Error al renderizar el frame: ${err.message}`);
      continue;
    }

    // 4. Analizar la imagen con Claude Vision
    log.info('Enviando frame a Claude Multimodal para auditoría de diseño...');
    try {
      const base64Data = fs.readFileSync(imagePath).toString('base64');
      const auditFeedback = await auditFrameWithClaude(client, base64Data, scene);
      
      log.ok(`Auditoría completada para escena ${scene.id}. Puntuación: ${auditFeedback.score}/10`);
      results.push({
        sceneId: scene.id,
        chapterTitle: scene.chapter_title || '(Sin Título)',
        text: scene.texto,
        visual: scene.visual || {},
        imagePath,
        imageFilename,
        ...auditFeedback
      });
    } catch (err) {
      log.error(`Error durante el análisis con Claude: ${err.message}`);
    }

    // Pequeño throttling de cortesía
    await new Promise(r => setTimeout(r, 1000));
  }

  // 5. Compilar reporte Markdown final
  if (results.length > 0) {
    const reportPath = compileReport(projectId, results);
    log.step(`🎉 Auditoría completada con éxito!`);
    console.log(`\n📄 Reporte de auditoría visual generado en:`);
    console.log(`   ${reportPath}\n`);
  } else {
    log.error('No se pudo auditar ninguna escena.');
  }
}

/**
 * Selecciona una cantidad N de escenas distribuidas de forma equitativa a lo largo del guion.
 */
function selectScenes(guion, limit) {
  if (guion.length <= limit) return guion;
  
  const selected = [];
  const step = (guion.length - 1) / (limit - 1);
  
  for (let i = 0; i < limit; i++) {
    const idx = Math.round(i * step);
    if (!selected.includes(guion[idx])) {
      selected.push(guion[idx]);
    }
  }
  
  // Asegurarnos de que el primer y el último elemento estén incluidos
  if (!selected.includes(guion[0])) selected.unshift(guion[0]);
  if (!selected.includes(guion[guion.length - 1])) selected.push(guion[guion.length - 1]);
  
  return selected.slice(0, limit);
}

/**
 * Llama a la API multimodal de Claude para auditar un keyframe base64.
 */
async function auditFrameWithClaude(client, base64Image, scene) {
  const elementsSummary = (scene.visual?.elements || [])
    .map(e => `- [${e.slot}] ${e.type} (${e.size}): trigger_word='${e.trigger_word}' ${e.text ? `'${e.text}'` : e.name || e.graphic || ''}`)
    .join('\n');
    
  const arrowsSummary = (scene.visual?.arrows || [])
    .map(a => `- Conector de '${a.from}' a '${a.to}' (${a.style})`)
    .join('\n');

  const promptText = `Analiza detalladamente esta captura de pantalla de un video automatizado estilo Whiteboard (pizarra blanca hecha a mano). 

DATOS DE LA ESCENA:
- Capítulo: "${scene.chapter_title || '(Sin título)'}"
- Texto narrado: "${scene.texto}"
- Composición de Slots (Layout):
${elementsSummary || '(Sin elementos)'}
${arrowsSummary ? `\nConexiones con Flechas:\n${arrowsSummary}` : ''}

Por favor, realiza un análisis minucioso de la calidad visual de esta imagen enfocándote en los siguientes aspectos estéticos y de usabilidad:
1. **Colisiones y Solapes**: ¿Hay textos, etiquetas, iconos o flechas que se encimen, se tapen o colisionen entre sí?
2. **Límites del Lienzo**: ¿Algún elemento se ve recortado por los bordes de la pantalla (1280x720) o la banda superior del título?
3. **Legibilidad y Contraste**: ¿Las etiquetas rojas o negras son legibles? ¿Tienen la escala y tamaño tipográfico adecuado?
4. **Densidad y Composición**: ¿La distribución espacial de slots se siente balanceada u orgánica, o por el contrario se ve demasiado vacía o apretada?
5. **Pertinencia Semántica**: ¿Los elementos representados visualmente tienen sentido y complementan de forma inteligente la narración del texto?

Instrucciones de Respuesta:
Devuelve obligatoriamente un formato JSON válido y limpio en tu respuesta. No agregues preámbulo ni explicaciones fuera del bloque JSON.

La estructura JSON debe ser exactamente la siguiente:
{
  "score": <número entero entre 1 y 10 indicando la calidad estética general>,
  "critique": "<un párrafo descriptivo sintetizando el análisis visual detectado>",
  "collisions_detected": <true si hay colisiones reales de encimado, false si no>,
  "suggestions": [
    "<sugerencia concreta 1>",
    "<sugerencia concreta 2>"
  ]
}`;

  const res = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1200,
    system: "Eres un diseñador UX/UI experto y director de arte de videos premium de YouTube. Analizas capturas de pantalla buscando defectos visuales de solapamiento, legibilidad, contraste y problemas compositivos.",
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: promptText
          }
        ]
      }
    ]
  });

  const rawText = res.content[0].text;
  
  // Extraer bloque JSON
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Claude no devolvió un JSON válido. Respuesta cruda: ${rawText}`);
  }
  
  const jsonStr = rawText.substring(startIdx, endIdx + 1);
  return JSON.parse(jsonStr);
}

/**
 * Compila y escribe el reporte Markdown del QA.
 */
function compileReport(projectId, results) {
  const dateStr = new Date().toLocaleString();
  const avgScore = (results.reduce((acc, r) => acc + r.score, 0) / results.length).toFixed(1);
  
  let report = `# Auditoría de Calidad Visual — Proyecto: \`${projectId}\`

Generado automáticamente por el **Agente Auditor Visual (Visual QA Agent)**.
**Fecha de análisis:** ${dateStr}

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
| :--- | :--- |
| **Puntuación Estética Promedio** | **${avgScore} / 10** |
| **Escenas Auditadas** | **${results.length}** |
| **Colisiones de Texto/Diseño Detectadas** | **${results.some(r => r.collisions_detected) ? '⚠️ Sí (Requieren atención)' : '✅ Ninguna'}** |

---

## 🔍 Análisis Escena por Escena

`;

  results.forEach((res) => {
    const starRating = '⭐'.repeat(res.score) + '☆'.repeat(10 - res.score);
    const badgeColor = res.score >= 8 ? 'green' : (res.score >= 5 ? 'yellow' : 'red');
    
    report += `### 🎬 Escena ${res.sceneId} — *${res.chapterTitle}*

> **Texto Narrado:** "${res.text}"

* **Puntuación:** **${res.score}/10** (\`${starRating}\`)
* **Colisión de Elementos:** ${res.collisions_detected ? '🚨 **Detectada**' : '✅ Ninguna'}
* **Captura de Pantalla:** [Abrir Frame](${path.toNamespacedPath ? 'file:///' + res.imagePath.replace(/\\/g, '/') : res.imagePath})

#### 🧠 Crítica Estética de la IA:
${res.critique}

#### 📋 Recomendaciones de Mejora:
${res.suggestions.map(s => `- [ ] ${s}`).join('\n')}

---

`;
  });

  // Agregar bloque final de consejos de diseño
  report += `## 💡 Directrices Generales de Diseño

Para optimizar y resolver los problemas reportados, considera:
1. **Reducir textos en slots**: Si Claude se queja de legibilidad, acorta las etiquetas en \`guion.json\` para que no pasen el límite de caracteres (12 para rojas, 22 para negras).
2. **Re-ubicar slots conflictivos**: Si hay colisión entre \`top-left\` y \`mid-left\`, re-mapea uno de ellos a slots libres como \`bottom-left\` o \`center\` si está disponible.
3. **Forzar Regeneración Inteligente**: Puedes usar el endpoint de re-parseo en el dashboard alimentándole sugerencias específicas al prompt para que Claude reorganice los slots de forma balanceada.
`;

  const reportPath = path.join(PROJECTS_DIR, projectId, 'visual_audit_report.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  return reportPath;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
