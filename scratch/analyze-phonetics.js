const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'google-wave';
const PROJECT_DIR = path.join('c:', 'Users', 'BrayanDeveloper', 'Desktop', 'prueba-remo-claude', 'public', 'projects', PROJECT_ID);

const guion = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'guion.json'), 'utf8'));
const wordTimings = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'word-timing.json'), 'utf8'));

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

console.log('--- ANALYZING UNMATCHED TRIGGER WORDS ---');

const unmatched = [];

guion.forEach(scene => {
  const sceneWords = wordTimings.filter(w => parseInt(w.escena_id, 10) === parseInt(scene.id, 10));
  
  if (!scene.visual || !scene.visual.elements) return;
  
  scene.visual.elements.forEach(el => {
    const matchedSec = findTriggerSec(el.trigger_word, sceneWords);
    if (matchedSec === null) {
      unmatched.push({
        sceneId: scene.id,
        triggerWord: el.trigger_word,
        normalizedTrigger: normalizeWord(el.trigger_word),
        sceneWords: sceneWords.map(w => w.palabra)
      });
    }
  });
});

console.log(`Found ${unmatched.length} unmatched triggers out of all elements.\n`);

unmatched.forEach(item => {
  console.log(`Scene ${item.sceneId} | Trigger: "${item.triggerWord}" (normalized: "${item.normalizedTrigger}")`);
  console.log(`  Spoken words: ${item.sceneWords.join(', ')}`);
  console.log('-'.repeat(60));
});
