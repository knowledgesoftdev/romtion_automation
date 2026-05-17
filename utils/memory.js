/**
 * utils/memory.js
 * Gestiona la memoria persistente del canal "Código Muerto".
 * Todas las funciones son async y usan try/catch para manejar errores.
 */

const fs   = require('fs');
const path = require('path');

const MEMORY_PATH = path.join(__dirname, '..', 'channel-memory.json');

/**
 * Estructura por defecto. Se usa cuando el archivo no existe o está corrupto.
 */
const DEFAULT_MEMORY = {
  temas_usados:              [],
  palabras_clave_agotadas:   [],
  mejor_rendimiento:         [],
  estilo_hooks:              [],
  ultima_publicacion:        '',
  total_videos:              0,
};

/**
 * readMemory() → lee y parsea channel-memory.json.
 * Si el archivo no existe o está corrupto, devuelve la estructura por defecto.
 * @returns {Promise<object>}
 */
async function readMemory() {
  try {
    const raw = fs.readFileSync(MEMORY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return { ...DEFAULT_MEMORY };
  }
}

/**
 * saveMemory(data) → serializa y guarda channel-memory.json.
 * @param {object} data - El objeto completo de memoria a persistir.
 * @returns {Promise<void>}
 */
async function saveMemory(data) {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`[memory] No se pudo guardar channel-memory.json: ${err.message}`);
  }
}

/**
 * isTopicUsed(tema) → retorna true si el tema ya fue registrado como usado.
 * La comparación es insensible a mayúsculas/minúsculas y espacios extras.
 * @param {string} tema
 * @returns {Promise<boolean>}
 */
async function isTopicUsed(tema) {
  try {
    const memory = await readMemory();
    const normalized = tema.trim().toLowerCase();
    return memory.temas_usados.some(
      (t) => t.toLowerCase().trim() === normalized
    );
  } catch (err) {
    console.warn(`[memory] Error verificando tema: ${err.message}`);
    return false;
  }
}

/**
 * updateAfterPublish(tema, projectId) → actualiza la memoria del canal
 * después de que un proyecto fue publicado exitosamente.
 * - Agrega el tema a temas_usados (si no está ya).
 * - Incrementa total_videos.
 * - Actualiza ultima_publicacion con la fecha actual.
 * @param {string} tema
 * @param {string} projectId
 * @returns {Promise<object>} La memoria actualizada.
 */
async function updateAfterPublish(tema, projectId) {
  try {
    const memory = await readMemory();

    // Agregar tema si no existe
    const normalized = tema.trim().toLowerCase();
    if (!memory.temas_usados.some((t) => t.toLowerCase().trim() === normalized)) {
      memory.temas_usados.push(tema.trim());
    }

    memory.total_videos        = (memory.total_videos || 0) + 1;
    memory.ultima_publicacion  = new Date().toISOString();

    await saveMemory(memory);
    console.log(`✅ [memory] Memoria actualizada → "${tema}" | total: ${memory.total_videos} videos`);
    return memory;
  } catch (err) {
    throw new Error(`[memory] Error en updateAfterPublish: ${err.message}`);
  }
}

module.exports = { readMemory, saveMemory, isTopicUsed, updateAfterPublish };
