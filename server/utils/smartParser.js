/**
 * server/utils/smartParser.js
 *
 * v4 — Schema multi-element estilo "explainer board":
 *      Cada escena devuelve un array `visual.elements[]` con 4-7 elementos
 *      visuales (pexels_image | icon | logo | label_red | label_black |
 *      motion_graphic) posicionados en una constelación de 7 slots y
 *      sincronizados con el audio vía `trigger_word`.
 *
 * Mantiene fallback al parser determinista cuando Claude no está disponible.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { parseScript } = require('./parser');

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch (_) { Anthropic = null; }

// 25 words ≈ 9-10 seconds at ~160 wpm speaking speed
const MAX_WORDS_PER_FRAGMENT = 25;
const CHUNK_SIZE             = 10;   // párrafos por petición
const ANTHROPIC_MODEL        = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// ── Active channel detection ─────────────────────────────────────────────────
function getActiveChannelId() {
  try {
    const activeFile = path.join(__dirname, '..', '..', 'active-channel.json');
    if (fs.existsSync(activeFile)) {
      return JSON.parse(fs.readFileSync(activeFile, 'utf8')).channelId || '';
    }
  } catch (_) {}
  return '';
}

// ── Robust sentence-aware text splitter (preserves ALL words) ────────────────
/**
 * Splits `text` into fragments of at most `maxWords` words each.
 * Prefers natural break points in this order:
 *   1. Sentence ends  (. ! ?)
 *   2. Clause breaks  (, ; : — –)
 *   3. Hard word-count cut
 * Every word from the original text appears in exactly one fragment.
 */
function splitTextIntoFragments(text, maxWords) {
  maxWords = maxWords || MAX_WORDS_PER_FRAGMENT;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [text.trim()];

  const fragments = [];
  let i = 0;

  while (i < words.length) {
    const remaining = words.length - i;
    if (remaining <= maxWords) {
      // Last chunk — take everything
      fragments.push(words.slice(i).join(' '));
      break;
    }

    // Look for the best cut point within [i+5 .. i+maxWords]
    const lo = Math.max(i + 5, i);        // minimum fragment size
    const hi = Math.min(i + maxWords, words.length - 1);

    // Priority 1: sentence boundary (.  !  ?) anywhere in window
    let cut = -1;
    for (let j = hi; j >= lo; j--) {
      if (/[.!?]$/.test(words[j])) { cut = j + 1; break; }
    }

    // Priority 2: clause boundary (, ; : — –) anywhere in window
    if (cut === -1) {
      for (let j = hi; j >= lo; j--) {
        if (/[,;:—–]$/.test(words[j])) { cut = j + 1; break; }
      }
    }

    // Priority 3: hard cut at maxWords
    if (cut === -1) cut = i + maxWords;

    // Safety: never produce an empty fragment
    if (cut <= i) cut = i + maxWords;
    cut = Math.min(cut, words.length);

    fragments.push(words.slice(i, cut).join(' '));
    i = cut;
  }

  return fragments.filter(f => f.trim().length > 0);
}

// ── Constantes de validación ─────────────────────────────────────────────────
const VALID_SLOTS = [
  'top-left', 'top-right',
  'mid-left', 'center', 'mid-right',
  'bottom-left', 'bottom-right',
];

const VALID_SIZES = ['sm', 'md', 'lg', 'xl'];

const VALID_MOTION_GRAPHICS = [
  'contador_porcentaje', 'donut_chart',
  'flecha_subiendo', 'flecha_bajando', 'timeline_barras',
];

const VALID_ARROW_STYLES = ['dashed_curve', 'dashed_straight', 'solid'];

const VALID_ELEMENT_TYPES = [
  'pexels_image', 'icon', 'logo',
  'label_red', 'label_black', 'motion_graphic',
];

const VALID_MOODS = ['neutro', 'urgente', 'positivo', 'nostalgia'];

// Lista curada de iconos permitidos de Flat Color Icons.
const ALLOWED_ICONS = [
  'flat-color-icons:approve', 'flat-color-icons:cancel', 'flat-color-icons:alarm-clock',
  'flat-color-icons:area-chart', 'flat-color-icons:bar-chart', 'flat-color-icons:line-chart',
  'flat-color-icons:pie-chart', 'flat-color-icons:positive-dynamic', 'flat-color-icons:negative-dynamic',
  'flat-color-icons:businessman', 'flat-color-icons:businesswoman', 'flat-color-icons:business',
  'flat-color-icons:briefcase', 'flat-color-icons:business-contact', 'flat-color-icons:calculator',
  'flat-color-icons:calendar', 'flat-color-icons:cell-phone', 'flat-color-icons:iphone',
  'flat-color-icons:smartphone-tablet', 'flat-color-icons:multiple-smartphones', 'flat-color-icons:tablet-android',
  'flat-color-icons:multiple-devices', 'flat-color-icons:display', 'flat-color-icons:command-line',
  'flat-color-icons:document', 'flat-color-icons:download', 'flat-color-icons:upload',
  'flat-color-icons:engineering', 'flat-color-icons:factory', 'flat-color-icons:factory-breakdown',
  'flat-color-icons:globe', 'flat-color-icons:home', 'flat-color-icons:idea',
  'flat-color-icons:settings', 'flat-color-icons:lock', 'flat-color-icons:unlock',
  'flat-color-icons:key', 'flat-color-icons:link', 'flat-color-icons:money-transfer',
  'flat-color-icons:currency-exchange', 'flat-color-icons:debt', 'flat-color-icons:paid',
  'flat-color-icons:donate', 'flat-color-icons:news', 'flat-color-icons:rating',
  'flat-color-icons:like', 'flat-color-icons:dislike', 'flat-color-icons:search',
  'flat-color-icons:no-idea', 'flat-color-icons:google',
  'flat-color-icons:linux', 'flat-color-icons:wikipedia', 'flat-color-icons:wi-fi-logo',
  'flat-color-icons:checkmark', 'flat-color-icons:ok', 'flat-color-icons:plus',
  'flat-color-icons:minus', 'flat-color-icons:next', 'flat-color-icons:previous',
  'flat-color-icons:share', 'flat-color-icons:start', 'flat-color-icons:process',
  'flat-color-icons:sim-card-chip', 'flat-color-icons:flash-on', 'flat-color-icons:electricity',
  'flat-color-icons:electronics', 'flat-color-icons:integrated-webcam', 'flat-color-icons:gallery',
  'flat-color-icons:picture', 'flat-color-icons:video-file', 'flat-color-icons:image-file',
  'flat-color-icons:audio-file', 'flat-color-icons:film-reel', 'flat-color-icons:music',
  'flat-color-icons:expired', 'flat-color-icons:safe', 'flat-color-icons:trademark',
  'flat-color-icons:copyright', 'flat-color-icons:signature', 'flat-color-icons:graduation-cap',
  'flat-color-icons:diploma-1', 'flat-color-icons:rules', 'flat-color-icons:decision',
  'flat-color-icons:make-decision', 'flat-color-icons:statistics', 'flat-color-icons:timeline',
];

// ── Prompt principal (modo fragmentar y enriquecer en una sola pasada) ───────
const FRAGMENT_SYSTEM = buildSystemPrompt({ withFragmentation: true });

// ── Prompt de enriquecimiento (modo chunk: ya hay párrafos, sólo añadir visual)
const ENRICH_SYSTEM = buildSystemPrompt({ withFragmentation: false });

function buildSystemPrompt({ withFragmentation }) {
  const iconList = ALLOWED_ICONS.join(', ');

  const base = `Eres director de arte para un mini-documental tipo YouTube explainer (estilo ColdFusion, MoneyGPS, Patrick Boyle).
Cada escena (parrafo del guion) genera una "constelacion" de 4-7 elementos visuales que aparecen secuencialmente
sincronizados con la narracion del audio.

REGLAS DE COMPOSICION:
- 4 a 7 elementos por escena. NUNCA menos de 3. NUNCA mas de 7.
- Cada elemento aparece cuando se pronuncia su "trigger_word" en el audio.
- Slots disponibles: ${VALID_SLOTS.map(s => '"' + s + '"').join(', ')}
- NO uses el mismo slot para 2 elementos en la misma escena.
- "center" SOLO para 1 elemento hero por escena (tipicamente label_red con el dato clave).
- Si la escena no tiene un dato hero, no uses "center".
- Tamanos: ${VALID_SIZES.map(s => '"' + s + '"').join(', ')}  (sm 140px, md 200px, lg 280px, xl 380px).
- chapter_title: el TEMA de la escena (1-3 palabras). Escenas consecutivas del mismo subtema deben compartir chapter_title.
- color_mood: uno de ${VALID_MOODS.map(s => '"' + s + '"').join(', ')}.

REGLAS ANTI-COLISION (CRITICAS para que los elementos no se monten):
- MAXIMO 2 LABELS (label_red + label_black sumados) por fila. Filas: top (top-left,top-right) | mid (mid-left,center,mid-right) | bottom (bottom-left,bottom-right).
- Si usas "center" con label_red o label_black, los slots mid-left y mid-right en esa misma escena DEBEN ser iconos, logos, motion_graphic o estar vacios. NUNCA labels.
- En filas top y bottom puedes tener label izquierda + label derecha pero ambas deben ser cortas (label_red <=10 chars, label_black <=18 chars).
- NUNCA pongas 3 labels seguidas en la misma fila.

TIPOS DE ELEMENTO:

1. "pexels_image" - foto stock real. Para productos fisicos, personas, lugares, eventos historicos.
   Campos: query (3-5 palabras INGLES MUY especificas), slot, trigger_word, size
   Ejemplos de query: "blackberry phone qwerty keyboard", "wall street trading floor 2008",
                      "nokia phone snake game", "intel chip socket motherboard"
   PROHIBIDO: queries genericas tipo "technology", "business", "concept".

2. "icon" - icono plano coloreado de Flat Color Icons. Para conceptos abstractos.
   Campos: icon_name (UNO de la lista permitida), slot, trigger_word, size
   ICONOS PERMITIDOS:
   ${iconList}

3. "logo" - logo de marca via simple-icons. Para empresas y productos comerciales.
   Campos: name (lowercase, sin sufijo "logo"), slot, trigger_word, size
   Ejemplos: "blackberry", "intel", "apple", "google", "samsung", "nokia", "amd", "nvidia"
   IMPORTANTE: "ibm" y "microsoft" NO estan disponibles. Para esos usa label_black con el nombre.

4. "label_red" - texto grande en rojo estilo sticker. Para anos, cifras hero, datos clave.
   Campos: text, slot, trigger_word, size
   LIMITES DE TEXTO: maximo 12 caracteres. PREFIERE 1-6 caracteres ("1971", "40%", "$1B", "147M").
   Si necesitas explicar mas, usa label_black aparte. NO inventes textos largos como "30 Enero 2007" — corta a "2007" o "Enero".
   Ejemplos buenos: "1971", "40%", "$1B", "147M", "2007", "SSE3", "x86"
   Ejemplos malos: "SIMD Extensions" (15 chars), "30 Enero 2007" (13 chars).

5. "label_black" - texto negrita negro. Para nombres de producto, conceptos clave.
   Campos: text, slot, trigger_word, size
   LIMITES DE TEXTO: maximo 22 caracteres. Ideal 4-15 caracteres.
   Ejemplos buenos: "4-bit processor", "Pentium III", "the Original IBM", "Java Struts 2", "Windows XP"
   Ejemplos malos: "Windows Display Driver Model" (28 chars), "5 años desarrollo" (16 OK).

6. "motion_graphic" - grafico animado vectorial. Para porcentajes y tendencias.
   Campos: graphic, value, slot, trigger_word, size
   graphic permitidos: ${VALID_MOTION_GRAPHICS.map(s => '"' + s + '"').join(', ')}
   value: el dato (ej: "40", "60", "2005,2007,2010", "1.5")
   USAR 0 o 1 motion_graphic por escena. No mas.

CAMPOS COMUNES de cada elemento:
- id: letra unica dentro de la escena ("a", "b", "c", "d", ...)
- slot, trigger_word, size
- trigger_word: la palabra EXACTA del texto del parrafo que dispara la aparicion. DEBE estar en el texto.

ARROWS (opcional):
- arrows: array de { from: "<id>", to: "<id>", style: "dashed_curve" | "dashed_straight" | "solid" }
- Maximo 2 flechas por escena. Conecta elementos logicamente relacionados.

EJEMPLO de una escena con texto "BlackBerry dominaba el 40% del mercado smartphone en 2007 con su teclado fisico":
{
  "texto": "BlackBerry dominaba el 40% del mercado smartphone en 2007 con su teclado fisico",
  "chapter_title": "BlackBerry",
  "visual": {
    "color_mood": "urgente",
    "elements": [
      { "id": "a", "type": "logo", "name": "blackberry", "slot": "top-left", "trigger_word": "BlackBerry", "size": "lg" },
      { "id": "b", "type": "pexels_image", "query": "blackberry phone qwerty keyboard", "slot": "top-right", "trigger_word": "teclado", "size": "md" },
      { "id": "c", "type": "label_red", "text": "40%", "slot": "center", "trigger_word": "40", "size": "xl" },
      { "id": "d", "type": "icon", "icon_name": "flat-color-icons:pie-chart", "slot": "mid-right", "trigger_word": "mercado", "size": "md" },
      { "id": "e", "type": "label_black", "text": "2007", "slot": "bottom-right", "trigger_word": "2007", "size": "lg" },
      { "id": "f", "type": "motion_graphic", "graphic": "donut_chart", "value": "40", "slot": "bottom-left", "trigger_word": "40", "size": "md" }
    ],
    "arrows": [
      { "from": "a", "to": "c", "style": "dashed_curve" }
    ]
  }
}`;

  if (withFragmentation) {
    return `${base}

ADICIONALMENTE, tu tarea es FRAGMENTAR el guion completo:
- Divide el texto en fragmentos de 20-28 palabras (NUNCA mas de 28) para que duren entre 8 y 10 segundos de audio.
- Cada fragmento debe tener sentido semantico completo.
- Los titulos de seccion (ej: "DECISION UNO:", "QUE ERA:") como fragmentos solos de 1 linea.
- Elimina lineas [ANIMACION N:] y la seccion [ANIMACIONES - LISTA COMPLETA].
- Mantén el orden narrativo exacto.
- NO inventes contenido.

FORMATO DE SALIDA: SOLO un array JSON donde cada elemento tiene EXACTAMENTE: { "texto": "...", "chapter_title": "...", "visual": {...} }
Sin markdown, sin explicaciones.`;
  }

  return `${base}

Recibiras un array JSON con parrafos ya cortados (solo campo "texto"). Tu UNICA tarea: anadir "chapter_title" y "visual" a cada elemento.
NO modifiques el texto.
FORMATO DE SALIDA: array JSON completo con texto + chapter_title + visual. Sin markdown.`;
}

// ── Visual por defecto (fallback) ────────────────────────────────────────────
function defaultVisual() {
  return {
    color_mood: 'neutro',
    elements:   [],
    arrows:     [],
  };
}

function defaultChapterTitle(rawText, projectName) {
  // Toma primeras 2-3 palabras significativas del texto como chapter title.
  const stop = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
                        'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
                        'y', 'o', 'pero', 'que', 'se', 'su', 'sus', 'lo']);
  const words = (rawText || '').split(/\s+/).filter(w => w.length > 2 && !stop.has(w.toLowerCase()));
  if (words.length === 0) return projectName || 'Tema';
  return words.slice(0, 2).join(' ');
}

// ── Validación del campo visual completo ─────────────────────────────────────
function validateElement(raw, scene, usedSlots) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').trim();
  if (!VALID_ELEMENT_TYPES.includes(type)) return null;

  const slot = VALID_SLOTS.includes(raw.slot) ? raw.slot : null;
  if (!slot) return null;
  if (usedSlots.has(slot)) return null;          // no duplicar slot
  usedSlots.add(slot);

  const size = VALID_SIZES.includes(raw.size) ? raw.size : 'md';
  const trigger = typeof raw.trigger_word === 'string' ? raw.trigger_word.trim() : '';
  const id = typeof raw.id === 'string' && raw.id.length <= 3 ? raw.id : null;
  if (!id) return null;

  const base = { id, type, slot, size, trigger_word: trigger };

  switch (type) {
    case 'pexels_image': {
      const q = typeof raw.query === 'string' ? raw.query.trim() : '';
      if (!q || q.length < 3) return null;
      return { ...base, query: q };
    }
    case 'icon': {
      const ic = typeof raw.icon_name === 'string' ? raw.icon_name.trim() : '';
      if (!ALLOWED_ICONS.includes(ic)) {
        // Si Claude inventó un nombre fuera de la lista, caemos a un icono seguro.
        return { ...base, icon_name: 'flat-color-icons:idea' };
      }
      return { ...base, icon_name: ic };
    }
    case 'logo': {
      const n = typeof raw.name === 'string' ? raw.name.trim().toLowerCase() : '';
      if (!n) return null;
      return { ...base, name: n };
    }
    case 'label_red': {
      let t = typeof raw.text === 'string' ? raw.text.trim() : '';
      if (!t) return null;
      // Si Claude pasó texto largo, lo recortamos al primer fragmento corto
      // (palabra clave o número). Buscamos un número/sigla primero.
      if (t.length > 12) {
        const numMatch = t.match(/[\d.,$%KMBkmb€]+/);
        if (numMatch) t = numMatch[0];
        else t = t.split(/\s+/)[0];
        t = t.slice(0, 12);
      }
      return { ...base, text: t };
    }
    case 'label_black': {
      let t = typeof raw.text === 'string' ? raw.text.trim() : '';
      if (!t) return null;
      if (t.length > 22) t = t.slice(0, 22);
      return { ...base, text: t };
    }
    case 'motion_graphic': {
      const g = VALID_MOTION_GRAPHICS.includes(raw.graphic) ? raw.graphic : 'donut_chart';
      const v = typeof raw.value === 'string' ? raw.value : (typeof raw.value === 'number' ? String(raw.value) : '');
      return { ...base, graphic: g, value: v };
    }
    default:
      return null;
  }
}

function validateArrow(raw, elementIds) {
  if (!raw || typeof raw !== 'object') return null;
  const from = String(raw.from || '').trim();
  const to   = String(raw.to   || '').trim();
  if (!elementIds.has(from) || !elementIds.has(to) || from === to) return null;
  const style = VALID_ARROW_STYLES.includes(raw.style) ? raw.style : 'dashed_curve';
  return { from, to, style };
}

function validateVisual(raw, sceneText) {
  if (!raw || typeof raw !== 'object') return defaultVisual();

  const mood = VALID_MOODS.includes(raw.color_mood) ? raw.color_mood : 'neutro';

  const usedSlots = new Set();
  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];

  // Hay que filtrar y limpiar
  let elements = [];
  for (const el of rawElements) {
    const ve = validateElement(el, sceneText, usedSlots);
    if (ve) elements.push(ve);
    if (elements.length >= 7) break;
  }

  // Si quedó vacío (Claude rompió todo el output), devolvemos default
  if (elements.length === 0) return defaultVisual();

  elements = enforceLayoutRules(elements);

  // Validar arrows contra los IDs realmente presentes
  const ids = new Set(elements.map(e => e.id));
  const arrows = Array.isArray(raw.arrows)
    ? raw.arrows.map(a => validateArrow(a, ids)).filter(Boolean).slice(0, 2)
    : [];

  return { color_mood: mood, elements, arrows };
}

// Enforce reglas anti-colision al output de Claude (por si ignoró las reglas del prompt).
//   1. Si "center" tiene label, mid-left y mid-right NO pueden ser labels (se eliminan)
//   2. Maximo 2 labels por fila (top, mid, bottom)
function enforceLayoutRules(elements) {
  const isLabel = (el) => el.type === 'label_red' || el.type === 'label_black';

  const center = elements.find(e => e.slot === 'center');
  const centerHasLabel = center && isLabel(center);

  let filtered = elements.filter(el => {
    if (centerHasLabel && (el.slot === 'mid-left' || el.slot === 'mid-right') && isLabel(el)) {
      return false;
    }
    return true;
  });

  // Max 2 labels por fila
  const rows = {
    top:    ['top-left', 'top-right'],
    mid:    ['mid-left', 'center', 'mid-right'],
    bottom: ['bottom-left', 'bottom-right'],
  };
  for (const slotList of Object.values(rows)) {
    const labelsInRow = filtered.filter(el => slotList.includes(el.slot) && isLabel(el));
    if (labelsInRow.length > 2) {
      // Mantenemos los primeros 2 (orden de inserción), descartamos el resto
      const dropIds = new Set(labelsInRow.slice(2).map(e => e.id));
      filtered = filtered.filter(el => !dropIds.has(el.id));
    }
  }

  return filtered;
}

// ── Validación Detallada con Recopilación de Errores para Autocuración ───────
function validateSceneVisualDetailed(raw, sceneText, sceneIndex) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    errors.push(`Escena ${sceneIndex}: 'visual' no es un objeto JSON válido.`);
    return errors;
  }

  const mood = raw.color_mood;
  if (mood && !VALID_MOODS.includes(mood)) {
    errors.push(`Escena ${sceneIndex}: 'color_mood' inválido ('${mood}'). Debe ser uno de: ${VALID_MOODS.join(', ')}.`);
  }

  const elements = raw.elements;
  if (!Array.isArray(elements)) {
    errors.push(`Escena ${sceneIndex}: 'elements' debe ser un array.`);
    return errors;
  }

  if (elements.length < 3) {
    errors.push(`Escena ${sceneIndex}: Tiene muy pocos elementos (${elements.length}). Debe tener al menos 3 (idealmente entre 4 y 7).`);
  } else if (elements.length > 7) {
    errors.push(`Escena ${sceneIndex}: Tiene demasiados elementos (${elements.length}). El máximo es 7.`);
  }

  const usedSlots = new Set();
  const elementIds = new Set();

  for (let idx = 0; idx < elements.length; idx++) {
    const el = elements[idx];
    const elDesc = `elemento en índice ${idx}`;
    if (!el || typeof el !== 'object') {
      errors.push(`Escena ${sceneIndex}: El ${elDesc} no es un objeto válido.`);
      continue;
    }

    const id = el.id;
    if (!id || typeof id !== 'string') {
      errors.push(`Escena ${sceneIndex}: El ${elDesc} no tiene un 'id' válido.`);
    } else {
      elementIds.add(id);
    }

    const type = el.type;
    if (!type || !VALID_ELEMENT_TYPES.includes(type)) {
      errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): Tipo de elemento inválido o faltante ('${type}'). Debe ser uno de: ${VALID_ELEMENT_TYPES.join(', ')}.`);
    }

    const slot = el.slot;
    if (!slot || !VALID_SLOTS.includes(slot)) {
      errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): Slot inválido ('${slot}'). Debe ser uno de: ${VALID_SLOTS.join(', ')}.`);
    } else {
      if (usedSlots.has(slot)) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El slot '${slot}' ya está en uso por otro elemento en esta escena. NO duplicar slots.`);
      }
      usedSlots.add(slot);
    }

    const size = el.size;
    if (size && !VALID_SIZES.includes(size)) {
      errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): Tamaño inválido ('${size}'). Debe ser uno de: ${VALID_SIZES.join(', ')}.`);
    }

    // Trigger word validation
    const trigger = el.trigger_word;
    if (!trigger || typeof trigger !== 'string') {
      errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): 'trigger_word' faltante o no es un string.`);
    } else {
      const normalizedTrigger = trigger.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
      const normalizedSceneText = sceneText.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
      if (!normalizedSceneText.includes(normalizedTrigger)) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): La palabra clave de activación 'trigger_word' ('${trigger}') no existe en el texto de la escena ("${sceneText}").`);
      }
    }

    // Specific type validation
    if (type === 'pexels_image') {
      const q = el.query;
      if (!q || typeof q !== 'string' || q.trim().length < 3) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'pexels_image' requiere un 'query' de búsqueda válido en inglés.`);
      }
    } else if (type === 'icon') {
      const ic = el.icon_name;
      if (!ic || typeof ic !== 'string') {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'icon' requiere un 'icon_name'.`);
      } else if (!ALLOWED_ICONS.includes(ic)) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El icono '${ic}' no está en la lista curada de iconos permitidos.`);
      }
    } else if (type === 'logo') {
      const n = el.name;
      if (!n || typeof n !== 'string' || n.trim().length === 0) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'logo' requiere un campo 'name' en minúsculas.`);
      }
    } else if (type === 'label_red') {
      const t = el.text;
      if (!t || typeof t !== 'string') {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'label_red' requiere un campo 'text'.`);
      } else if (t.length > 12) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El texto '${t}' en label_red supera el límite de 12 caracteres (tiene ${t.length}).`);
      }
    } else if (type === 'label_black') {
      const t = el.text;
      if (!t || typeof t !== 'string') {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'label_black' requiere un campo 'text'.`);
      } else if (t.length > 22) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El texto '${t}' en label_black supera el límite de 22 caracteres (tiene ${t.length}).`);
      }
    } else if (type === 'motion_graphic') {
      const g = el.graphic;
      if (!g || !VALID_MOTION_GRAPHICS.includes(g)) {
        errors.push(`Escena ${sceneIndex} (ID: ${id || idx}): El elemento de tipo 'motion_graphic' requiere un campo 'graphic' válido (${VALID_MOTION_GRAPHICS.join(', ')}).`);
      }
    }
  }

  // Anti-collision: Max 2 labels per row
  const rows = {
    top:    ['top-left', 'top-right'],
    mid:    ['mid-left', 'center', 'mid-right'],
    bottom: ['bottom-left', 'bottom-right'],
  };
  const isLabel = (el) => el && (el.type === 'label_red' || el.type === 'label_black');
  
  for (const [rowName, slotList] of Object.entries(rows)) {
    const labelsInRow = elements.filter(el => slotList.includes(el.slot) && isLabel(el));
    if (labelsInRow.length > 2) {
      errors.push(`Escena ${sceneIndex}: Colisión detectada en la fila '${rowName}'. Hay ${labelsInRow.length} etiquetas (labels) en la misma fila. Máximo permitido es 2.`);
    }
  }

  // Center label collision
  const centerEl = elements.find(el => el.slot === 'center');
  if (centerEl && isLabel(centerEl)) {
    const midLeftEl = elements.find(el => el.slot === 'mid-left');
    const midRightEl = elements.find(el => el.slot === 'mid-right');
    if (isLabel(midLeftEl) || isLabel(midRightEl)) {
      errors.push(`Escena ${sceneIndex}: Colisión crítica. El slot 'center' tiene una etiqueta, por lo que 'mid-left' y 'mid-right' no pueden tener etiquetas.`);
    }
  }

  // Arrows validation
  const arrows = raw.arrows;
  if (arrows) {
    if (!Array.isArray(arrows)) {
      errors.push(`Escena ${sceneIndex}: 'arrows' debe ser un array.`);
    } else {
      if (arrows.length > 2) {
        errors.push(`Escena ${sceneIndex}: Demasiadas flechas (${arrows.length}). El máximo es 2 por escena.`);
      }
      for (let idx = 0; idx < arrows.length; idx++) {
        const arr = arrows[idx];
        if (!arr || typeof arr !== 'object') continue;
        const from = arr.from;
        const to = arr.to;
        if (!elementIds.has(from)) {
          errors.push(`Escena ${sceneIndex}: Flecha conectando un origen ('from') inexistente ('${from}').`);
        }
        if (!elementIds.has(to)) {
          errors.push(`Escena ${sceneIndex}: Flecha conectando un destino ('to') inexistente ('${to}').`);
        }
        if (from && to && from === to) {
          errors.push(`Escena ${sceneIndex}: Flecha conectando un elemento consigo mismo ('${from}').`);
        }
      }
    }
  }

  return errors;
}

// ── Llamada Claude: fragmentar guion completo ────────────────────────────────
async function fragmentWithClaude(rawScript) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic no disponible');
  }
  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  const messages = [{
    role: 'user',
    content: `Guion a fragmentar:\n\n${rawScript}\n\nDevuelve solo el array JSON con texto + chapter_title + visual por cada escena.`,
  }];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🤖 [smartParser] Intento ${attempts}/${maxAttempts} de fragmentación y composición con Claude...`);

    const res = await client.messages.create({
      model:      ANTHROPIC_MODEL,
      max_tokens: 16000,                  // multi-element pide mucho mas JSON
      system:     FRAGMENT_SYSTEM,
      messages:   messages,
    });

    let rawText = '';
    for (const block of res.content || []) {
      if (block.type === 'text') rawText += block.text;
    }

    let rawFragments;
    try {
      rawFragments = extractJsonArray(res);
    } catch (parseErr) {
      console.warn(`⚠️  Intento ${attempts} falló al parsear el JSON de Claude: ${parseErr.message}`);
      if (attempts === maxAttempts) throw parseErr;

      messages.push({ role: 'assistant', content: rawText });
      messages.push({
        role: 'user',
        content: `Error al parsear el JSON: ${parseErr.message}. Asegúrate de devolver ÚNICAMENTE un array JSON válido sin bloques markdown adicionales ni explicaciones.`
      });
      continue;
    }

    // Validar visual y recolectar errores
    const validationErrors = [];
    for (let i = 0; i < rawFragments.length; i++) {
      const frag = rawFragments[i];
      const text = (frag.texto || frag.text || '').trim();
      const errors = validateSceneVisualDetailed(frag.visual, text, i + 1);
      if (errors.length > 0) {
        validationErrors.push(...errors);
      }
    }

    if (validationErrors.length === 0) {
      console.log(`✅ [smartParser] Validación exitosa en el intento ${attempts}! Ningún error de diseño encontrado.`);
      return rawFragments;
    }

    console.warn(`⚠️  Intento ${attempts} falló la validación estricta con ${validationErrors.length} errores.`);
    if (attempts === maxAttempts) {
      console.warn(`🛑 Se alcanzó el límite de intentos en fragmentWithClaude. Retornando output actual con correcciones heurísticas.`);
      return rawFragments;
    }

    // Construir retroalimentación de corrección
    const errorListStr = validationErrors.slice(0, 15).map(e => `- ${e}`).join('\n');
    console.log(`📝 Enviando retroalimentación de corrección a Claude:\n${errorListStr}`);

    messages.push({ role: 'assistant', content: rawText });
    messages.push({
      role: 'user',
      content: `El JSON devuelto tiene los siguientes errores de composición y límites de diseño. Por favor corrígelos y vuelve a generar el array JSON completo respetando estrictamente las reglas anti-colisión, límites de caracteres y triggers:

${errorListStr}

Devuelve el JSON corregido completo.`
    });
  }

  throw new Error('Excedido el número máximo de intentos');
}

// ── Llamada Claude: enriquecer chunk de párrafos ya cortados ─────────────────
async function enrichChunkWithClaude(client, paragraphs) {
  const input = paragraphs.map(p => ({ texto: p.texto }));
  const messages = [{
    role: 'user',
    content: `Añade chapter_title y visual a cada parrafo:\n\n${JSON.stringify(input, null, 2)}\n\nDevuelve el array completo.`,
  }];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🤖 [smartParser] Intento ${attempts}/${maxAttempts} de enriquecimiento de chunk con Claude...`);

    const res = await client.messages.create({
      model:      ANTHROPIC_MODEL,
      max_tokens: 8000,
      system:     ENRICH_SYSTEM,
      messages:   messages,
    });

    let rawText = '';
    for (const block of res.content || []) {
      if (block.type === 'text') rawText += block.text;
    }

    let rawFragments;
    try {
      rawFragments = extractJsonArray(res);
    } catch (parseErr) {
      console.warn(`⚠️  Intento ${attempts} de chunk falló al parsear el JSON de Claude: ${parseErr.message}`);
      if (attempts === maxAttempts) throw parseErr;

      messages.push({ role: 'assistant', content: rawText });
      messages.push({
        role: 'user',
        content: `Error al parsear el JSON del chunk: ${parseErr.message}. Asegúrate de devolver ÚNICAMENTE un array JSON válido sin bloques markdown ni explicaciones.`
      });
      continue;
    }

    // Validar visual y recolectar errores
    const validationErrors = [];
    for (let i = 0; i < rawFragments.length; i++) {
      const frag = rawFragments[i];
      const original = paragraphs[i];
      if (!original) continue;
      const errors = validateSceneVisualDetailed(frag.visual, original.texto, i + 1);
      if (errors.length > 0) {
        validationErrors.push(...errors);
      }
    }

    if (validationErrors.length === 0) {
      console.log(`✅ [smartParser] Chunk validado con éxito en el intento ${attempts}!`);
      return rawFragments;
    }

    console.warn(`⚠️  Intento ${attempts} de chunk falló la validación estricta con ${validationErrors.length} errores.`);
    if (attempts === maxAttempts) {
      console.warn(`🛑 Límite de intentos en enrichChunkWithClaude. Usando correcciones heurísticas.`);
      return rawFragments;
    }

    // Construir retroalimentación de corrección
    const errorListStr = validationErrors.slice(0, 10).map(e => `- ${e}`).join('\n');
    console.log(`📝 Enviando retroalimentación de corrección de chunk a Claude:\n${errorListStr}`);

    messages.push({ role: 'assistant', content: rawText });
    messages.push({
      role: 'user',
      content: `El JSON del chunk tiene los siguientes errores de composición. Por favor corrígelos y vuelve a generar el array JSON completo:

${errorListStr}

Devuelve el JSON corregido completo.`
    });
  }

  throw new Error('Excedido el número máximo de intentos en chunk');
}

function extractJsonArray(res) {
  let text = '';
  for (const block of res.content || []) {
    if (block.type === 'text') text += block.text;
  }
  text = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Claude no devolvio un array JSON valido');
  const parsed = JSON.parse(text.substring(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('Resultado no es un array');
  return parsed;
}

// ── Normalización: limpiar y validar la salida cruda de Claude ───────────────
function normalizeFragments(rawFragments, projectName) {
  const result = [];
  let counter = 1;
  for (const item of rawFragments) {
    const text = (item.texto || item.text || '').trim().replace(/\s+/g, ' ');
    if (!text || text.length < 10) continue;

    const visual = validateVisual(item.visual, text);
    const chapter_title =
      (typeof item.chapter_title === 'string' && item.chapter_title.trim())
        ? item.chapter_title.trim()
        : defaultChapterTitle(text, projectName);

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS_PER_FRAGMENT) {
      result.push({
        id:            String(counter++).padStart(2, '0'),
        texto:         text,
        chapter_title,
        visual,
      });
    } else {
      // Si el fragmento vino demasiado largo, lo cortamos por la mitad usando puntuación.
      const half = Math.floor(words.length / 2);
      let cutIdx = half;
      for (let i = half; i >= half - 10 && i >= 0; i--) {
        if (/[.,;]$/.test(words[i])) { cutIdx = i + 1; break; }
      }
      const part1 = words.slice(0, cutIdx).join(' ');
      const part2 = words.slice(cutIdx).join(' ');
      if (part1.length > 10) result.push({ id: String(counter++).padStart(2, '0'), texto: part1, chapter_title, visual });
      if (part2.length > 10) result.push({ id: String(counter++).padStart(2, '0'), texto: part2, chapter_title, visual });
    }
  }
  return result;
}

// ── Corte de párrafos largos del parser determinista (sin visual) ────────────
function splitLongParagraphs(paragraphs, projectName) {
  const result = [];
  let counter = 1;
  for (const p of paragraphs) {
    const chapter_title = defaultChapterTitle(p.texto, projectName);
    // Use the robust splitter which preserves ALL words
    const fragments = splitTextIntoFragments(p.texto, MAX_WORDS_PER_FRAGMENT);
    for (const fragment of fragments) {
      if (fragment.trim().length > 5) {
        result.push({
          id:            String(counter++).padStart(2, '0'),
          texto:         fragment.trim(),
          chapter_title,
          visual:        defaultVisual(),
        });
      }
    }
  }
  return result;
}

// ── Modo chunk: parser determinista + enriquecer en lotes ────────────────────
async function enrichInChunks(rawScript, projectName) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic no disponible');
  }
  const Client = Anthropic.default || Anthropic;
  const client = new Client();

  const deterministicParagraphs = parseScript(rawScript);
  const base = splitLongParagraphs(deterministicParagraphs, projectName);
  const total = base.length;
  console.log(`🧩 [smartParser] Modo chunk multi-element: ${total} párrafos → lotes de ${CHUNK_SIZE}`);

  const chunks = [];
  for (let i = 0; i < total; i += CHUNK_SIZE) chunks.push(base.slice(i, i + CHUNK_SIZE));

  const enriched = [];
  let successChunks = 0;
  let failedChunks  = 0;

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    console.log(`  📦 Chunk ${ci + 1}/${chunks.length} (${chunk.length} párrafos)...`);
    try {
      const enrichedChunk = await enrichChunkWithClaude(client, chunk);
      for (let i = 0; i < chunk.length; i++) {
        const original = chunk[i];
        const fromClaude = enrichedChunk[i];
        const visual = validateVisual(fromClaude?.visual, original.texto);
        const chapter_title =
          (typeof fromClaude?.chapter_title === 'string' && fromClaude.chapter_title.trim())
            ? fromClaude.chapter_title.trim()
            : original.chapter_title;
        enriched.push({
          id:            original.id,
          texto:         original.texto,
          chapter_title,
          visual,
        });
      }
      successChunks++;
    } catch (err) {
      console.warn(`  ⚠️  Chunk ${ci + 1} falló: ${err.message}. Usando visual por defecto.`);
      for (const p of chunk) enriched.push(p);
      failedChunks++;
    }
    if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  console.log(`✅ [smartParser] Chunks: ${successChunks} OK, ${failedChunks} fallback`);
  return enriched;
}

// ── Función principal exportada ──────────────────────────────────────────────
async function parseScriptSmart(rawScript, opts = {}) {
  const projectName = opts.projectName || '';

  // ── Phantom-directive: skip Claude entirely ──────────────────────────────
  // For full-bleed B-roll channels the visual.elements field is not used by
  // the VideoEngine / scene-plan renderer, so Claude enrichment is unnecessary.
  // We only need a clean word-capped partition of the script.
  const channelId = getActiveChannelId();
  if (channelId === 'phantom-directive') {
    console.log(`⚡ [smartParser] Canal phantom-directive → partición determinista directa (sin Claude)`);
    const deterministicParagraphs = parseScript(rawScript);
    const result = splitLongParagraphs(deterministicParagraphs, projectName);
    console.log(`✅ [smartParser] ${result.length} fragmentos (≤${MAX_WORDS_PER_FRAGMENT} palabras c/u)`);
    return result;
  }

  // ── codigo-muerto (and other visual niches): use Claude as before ────────
  const wordCount = rawScript.split(/\s+/).filter(Boolean).length;
  const estimatedScenes = Math.ceil(wordCount / 30);
  const useChunkMode = estimatedScenes > 20;

  if (useChunkMode) {
    console.log(`🧠 [smartParser] Guion largo (~${estimatedScenes} escenas) → modo chunk`);
    try {
      const result = await enrichInChunks(rawScript, projectName);
      console.log(`✅ [smartParser] Chunk mode: ${result.length} fragmentos`);
      return result;
    } catch (err) {
      console.warn(`⚠️  Chunk mode falló: ${err.message}. Fallback determinista.`);
    }
  } else {
    try {
      console.log(`🧠 [smartParser] Fragmentando+enriqueciendo con Claude (~${estimatedScenes} escenas)...`);
      const raw = await fragmentWithClaude(rawScript);
      const normalized = normalizeFragments(raw, projectName);
      console.log(`✅ [smartParser] Claude generó ${normalized.length} fragmentos multi-element`);
      return normalized;
    } catch (err) {
      console.warn(`⚠️  Claude falló: ${err.message}. Fallback determinista.`);
    }
  }

  const deterministicParagraphs = parseScript(rawScript);
  const result = splitLongParagraphs(deterministicParagraphs, projectName);
  console.log(`✅ [smartParser] Fallback: ${result.length} fragmentos (visual vacío)`);
  return result;
}

module.exports = { parseScriptSmart, enrichChunkWithClaude, validateVisual, Anthropic };
