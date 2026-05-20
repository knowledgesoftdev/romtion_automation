#!/usr/bin/env node
/**
 * scripts/build-enriched-prompt.js
 *
 * Toma `prompt.txt` (la plantilla base que pegás en Claude/ChatGPT para
 * generar guiones) y le inyecta una sección [CONTEXTO DEL CANAL] con los
 * insights aprendidos del canal:
 *   - Temas ya cubiertos (no repetir)
 *   - Hooks ganadores (replicá este patrón)
 *   - Hooks perdedores (evitalo)
 *   - Visual styles que correlacionan con buen rendimiento
 *
 * Uso:
 *   node scripts/build-enriched-prompt.js [tema]
 *
 *   Si pasás un tema, reemplaza la sección [TEMA DEL VIDEO] del template
 *   por el tema indicado. Si no, deja el placeholder original.
 *
 * Output: prompt-enriched.txt en la raíz del proyecto.
 */

const fs   = require('fs');
const path = require('path');
const { computeInsights } = require('../utils/memory');

const BASE_PROMPT = path.join(__dirname, '..', 'prompt.txt');
const OUTPUT      = path.join(__dirname, '..', 'prompt-enriched.txt');

async function main() {
  if (!fs.existsSync(BASE_PROMPT)) {
    console.error('❌ No existe prompt.txt en la raíz');
    process.exit(1);
  }

  const tema = process.argv.slice(2).join(' ') || null;
  const base = fs.readFileSync(BASE_PROMPT, 'utf8');
  const insights = await computeInsights();
  
  // ── Construir bloque de contexto de aprendizaje ─────────────────────────
  const lines = [];
  lines.push('## CONTEXTO DEL CANAL — APRENDIZAJE ACUMULADO');
  lines.push(`Total de videos publicados: ${insights.total_videos}`);
  if (insights.last_publication) {
    lines.push(`Última publicación: ${insights.last_publication}`);
  }
  lines.push('');

  if (insights.topics_agotados?.length) {
    lines.push('### TEMAS YA CUBIERTOS — NO REPETIR:');
    insights.topics_agotados.forEach(t => lines.push(`  - ${t}`));
    lines.push('');
  }

  if (insights.best_hook_patterns?.length) {
    lines.push('### HOOKS POR RENDIMIENTO HISTÓRICO (replicá el patrón ganador):');
    insights.best_hook_patterns.forEach(h => {
      const tag = h.avg_views >= 50 ? '✅ FUNCIONA' : h.avg_views >= 20 ? '⚠ MEDIO' : '🚫 EVITAR';
      lines.push(`  ${tag} "${h.pattern}" → ${h.avg_views} views promedio (n=${h.uses})`);
    });
    lines.push('');
  }

  if (insights.visual_winners?.length) {
    lines.push('### MOTION GRAPHICS QUE CORRELACIONAN CON VIEWS:');
    insights.visual_winners.slice(0, 5).forEach(v => {
      lines.push(`  - ${v.element}: ${v.avg_views} views promedio (n=${v.samples})`);
    });
    lines.push('');
  }

  if (insights.mood_performance?.length) {
    lines.push('### COLOR MOODS GANADORES:');
    insights.mood_performance.forEach(m => {
      lines.push(`  - ${m.mood}: ${m.avg_views} views promedio (n=${m.samples})`);
    });
    lines.push('');
  }

  if (insights.recommendations?.length) {
    lines.push('### RECOMENDACIONES ESTRATÉGICAS:');
    insights.recommendations.forEach(r => lines.push(`  ${r}`));
    lines.push('');
  }

  lines.push('### CÓMO USAR ESTE CONTEXTO:');
  lines.push('  1. NO escribas un guion sobre temas en "YA CUBIERTOS".');
  lines.push('  2. El gancho del guion DEBE seguir el patrón del hook etiquetado ✅ FUNCIONA.');
  lines.push('  3. Si el dato lo permite, incluye al menos 2 elementos visuales del top de motion graphics.');
  lines.push('  4. Las animaciones deben usar el color_mood ganador del canal.');
  lines.push('');
  lines.push('────────────────────────────────────────────────────────────────────');

  const enrichmentBlock = lines.join('\n');

  // ── Inyectar el bloque en el prompt base ─────────────────────────────────
  // Lo metemos JUSTO ANTES de "## TEMA DEL VIDEO" para que Claude lea
  // el aprendizaje antes de empezar a planear el guion.
  let enrichedPrompt;
  const insertMarker = /^## TEMA DEL VIDEO/m;
  if (insertMarker.test(base)) {
    enrichedPrompt = base.replace(insertMarker, `${enrichmentBlock}\n\n## TEMA DEL VIDEO`);
  } else {
    // Si no encontramos el marker, lo metemos al final
    enrichedPrompt = base + '\n\n' + enrichmentBlock;
  }

  // Si hay un tema explícito, reemplazamos la sección "## TEMA DEL VIDEO"
  if (tema) {
    enrichedPrompt = enrichedPrompt.replace(
      /## TEMA DEL VIDEO\r?\n[\s\S]*?(?=\r?\n## )/,
      `## TEMA DEL VIDEO\r\n${tema}\r\n\r\n`
    );
  }

  // Extraer el tema corto (por ejemplo, "Yahoo" a partir de "Yahoo — la arquitectura que falló")
  // para reemplazar de forma dinámica el placeholder [TEMA] en el cuerpo del prompt (ej. en la orden final)
  const temaFinal = tema || "Nokia";
  const temaCorto = temaFinal.split(/[—\-:]/)[0].trim();
  enrichedPrompt = enrichedPrompt.replace(/\[TEMA\]/g, temaCorto);

  fs.writeFileSync(OUTPUT, enrichedPrompt, 'utf8');
  console.log(`✅ Prompt enriquecido guardado en ${OUTPUT}`);
  console.log(`   ${enrichedPrompt.split('\n').length} líneas, ${enrichedPrompt.length} caracteres`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
