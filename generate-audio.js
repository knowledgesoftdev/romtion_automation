#!/usr/bin/env node
require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const os       = require('os');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const { Session, TTSRequest } = require('fish-audio-sdk');
const { parseFile } = require('music-metadata');

const execFileP = promisify(execFile);

// ─── Config (env-driven) ──────────────────────────────────────────────────────
const FISH_MODEL          = process.env.FISH_MODEL          || 's2';
const FISH_MODEL_FALLBACK = process.env.FISH_MODEL_FALLBACK || 's1';
const FISH_LATENCY        = process.env.FISH_LATENCY        || 'normal';
const FISH_CHUNK_LENGTH   = Number(process.env.FISH_CHUNK_LENGTH || 200);
const FISH_PROSODY_SPEED  = Number(process.env.FISH_PROSODY_SPEED || 1.0);
const FISH_PROSODY_VOLUME = Number(process.env.FISH_PROSODY_VOLUME || 0);
const FISH_NORMALIZE      = (process.env.FISH_NORMALIZE || 'true') === 'true';
const FISH_SAMPLE_RATE    = Number(process.env.FISH_SAMPLE_RATE || 44100);
const FISH_BITRATE        = 192;

const MAX_CHUNK_CHARS  = Number(process.env.TTS_MAX_CHUNK_CHARS || 280);
const MIN_CHUNK_CHARS  = Number(process.env.TTS_MIN_CHUNK_CHARS || 60);
const SILENCE_MS       = Number(process.env.TTS_GAP_MS || 180);
const MAX_RETRIES      = Number(process.env.TTS_MAX_RETRIES || 3);
const LOUDNORM_TARGET  = process.env.TTS_LOUDNORM || 'I=-16:TP=-1.5:LRA=11';

const ASSETS_DIR = path.join(__dirname, 'assets');

// ─── ffmpeg detection ─────────────────────────────────────────────────────────
function ffmpegAvailable() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}
const HAS_FFMPEG = ffmpegAvailable();

// ─── Spanish text normalization ───────────────────────────────────────────────
// Pragmatic: cubre los casos que más rompen TTS en español (acrónimos, números,
// %, $). Para casos extremos, `normalize: true` del servidor cubre el resto.

const SPANISH_UNITS    = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
const SPANISH_10_19    = ['diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
const SPANISH_TENS     = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const SPANISH_HUNDREDS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];

function intToSpanish(n) {
  if (n < 0) return 'menos ' + intToSpanish(-n);
  if (n < 10) return SPANISH_UNITS[n];
  if (n < 20) return SPANISH_10_19[n - 10];
  if (n < 30) {
    if (n === 20) return 'veinte';
    return 'veinti' + SPANISH_UNITS[n - 20].replace(/^uno$/, 'uno');
  }
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return SPANISH_TENS[t] + (u ? ' y ' + SPANISH_UNITS[u] : '');
  }
  if (n < 1000) {
    if (n === 100) return 'cien';
    const h = Math.floor(n / 100);
    const r = n % 100;
    return SPANISH_HUNDREDS[h] + (r ? ' ' + intToSpanish(r) : '');
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r  = n % 1000;
    const thStr = th === 1 ? 'mil' : intToSpanish(th).replace(/uno$/, 'un') + ' mil';
    return thStr + (r ? ' ' + intToSpanish(r) : '');
  }
  if (n < 1000000000) {
    const mil = Math.floor(n / 1000000);
    const r   = n % 1000000;
    const milStr = mil === 1 ? 'un millón' : intToSpanish(mil) + ' millones';
    return milStr + (r ? ' ' + intToSpanish(r) : '');
  }
  return String(n); // fallback for huge numbers
}

const ACRONYM_TABLE = {
  'iOS':'i O S','RAM':'R A M','ROM':'R O M','CPU':'C P U','GPU':'G P U',
  'API':'A P I','SDK':'S D K','HTML':'H T M L','CSS':'C S S','JS':'J S',
  'SQL':'S Q L','USB':'U S B','CEO':'C E O','CTO':'C T O','CFO':'C F O',
  'PDF':'P D F','URL':'U R L','HTTP':'H T T P','HTTPS':'H T T P S',
  'IBM':'I B M','AWS':'A W S','GCP':'G C P','AI':'A I','ML':'M L',
  'IoT':'I o T','VR':'V R','AR':'A R','UI':'U I','UX':'U X','TV':'T V',
  'RTOS':'R T O S','OS':'O S','SOS':'S O S','FBI':'F B I','CIA':'C I A',
};

const UNIT_TABLE = [
  [/(\d+)\s*MB\b/g,  '$1 megas'],
  [/(\d+)\s*GB\b/g,  '$1 gigas'],
  [/(\d+)\s*TB\b/g,  '$1 teras'],
  [/(\d+)\s*KB\b/g,  '$1 kilos'],
  [/(\d+)\s*GHz\b/g, '$1 gigahercios'],
  [/(\d+)\s*MHz\b/g, '$1 megahercios'],
  [/(\d+)\s*MP\b/g,  '$1 megapíxeles'],
  [/(\d+)\s*Hz\b/g,  '$1 hercios'],
  [/(\d+)\s*km\b/g,  '$1 kilómetros'],
  [/(\d+)\s*ms\b/g,  '$1 milisegundos'],
];

function normalizeForTTS(input) {
  if (!input) return '';
  let t = String(input);

  // Quotes & dashes
  t = t.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");
  t = t.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ', ');

  // Unicode ellipsis → period+space
  t = t.replace(/…/g, '. ');

  // Acronyms (word-boundary, case-sensitive on first letter for safety)
  for (const [acr, spaced] of Object.entries(ACRONYM_TABLE)) {
    const re = new RegExp(`\\b${acr}\\b`, 'g');
    t = t.replace(re, spaced);
  }

  // Units (MB, GB, GHz, etc.) BEFORE generic number conversion
  for (const [re, repl] of UNIT_TABLE) t = t.replace(re, repl);

  // Money: $5,440 millones | $5,440  →  cinco mil cuatrocientos cuarenta millones de dólares
  t = t.replace(/\$\s*([\d.,]+)\s*(millones|mil millones|billones)?/gi, (_, num, scale) => {
    const n = parseInt(num.replace(/[.,]/g, ''), 10);
    if (Number.isNaN(n)) return _;
    const words = intToSpanish(n);
    if (scale) return `${words} ${scale.toLowerCase()} de dólares`;
    return `${words} dólares`;
  });

  // Percentages: 40% → cuarenta por ciento ; 12.5% → doce coma cinco por ciento
  t = t.replace(/(\d+)(?:[.,](\d+))?\s*%/g, (_, intPart, decPart) => {
    const intWord = intToSpanish(parseInt(intPart, 10));
    if (!decPart) return `${intWord} por ciento`;
    const decWord = decPart.split('').map(d => SPANISH_UNITS[parseInt(d, 10)]).join(' ');
    return `${intWord} coma ${decWord} por ciento`;
  });

  // Years (1000-2999) standalone
  t = t.replace(/\b(1\d{3}|20\d{2}|21\d{2})\b/g, (_, y) => intToSpanish(parseInt(y, 10)));

  // Ranges "N a M" with digits → "N a M" both spelled
  // Plain numbers: any remaining 1-9 digit number → palabras
  t = t.replace(/\b\d{1,9}\b/g, (m) => intToSpanish(parseInt(m, 10)));

  // Whitespace cleanup
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}

// ─── Sentence-boundary chunking ───────────────────────────────────────────────
function splitIntoSentences(text) {
  // Split on . ! ? ; : when followed by space + capital/quote
  const parts = text.split(/(?<=[.!?;:])\s+(?=["¿¡]?[A-ZÁÉÍÓÚÑ0-9])/);
  return parts.map(s => s.trim()).filter(Boolean);
}

function chunkText(text, maxChars = MAX_CHUNK_CHARS, minChars = MIN_CHUNK_CHARS) {
  if (text.length <= maxChars) return [text];
  const sentences = splitIntoSentences(text);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if (!cur) { cur = s; continue; }
    if ((cur + ' ' + s).length <= maxChars) {
      cur += ' ' + s;
    } else {
      chunks.push(cur);
      cur = s;
    }
  }
  if (cur) chunks.push(cur);
  // Merge tiny tail
  if (chunks.length >= 2 && chunks[chunks.length - 1].length < minChars) {
    chunks[chunks.length - 2] += ' ' + chunks.pop();
  }
  // Hard-split anything still too long (paragraph with no sentence breaks)
  const final = [];
  for (const c of chunks) {
    if (c.length <= maxChars * 1.4) { final.push(c); continue; }
    // split by comma boundaries
    const pieces = c.split(/(?<=,)\s+/);
    let buf = '';
    for (const p of pieces) {
      if (!buf) { buf = p; continue; }
      if ((buf + ' ' + p).length <= maxChars) buf += ' ' + p;
      else { final.push(buf); buf = p; }
    }
    if (buf) final.push(buf);
  }
  return final;
}

// ─── ffmpeg helpers ───────────────────────────────────────────────────────────
async function ensureSilenceFile() {
  if (!HAS_FFMPEG) return null;
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  const out = path.join(ASSETS_DIR, `silence-${SILENCE_MS}ms.mp3`);
  if (fs.existsSync(out)) return out;
  const dur = (SILENCE_MS / 1000).toFixed(3);
  await execFileP('ffmpeg', [
    '-y', '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=mono:sample_rate=${FISH_SAMPLE_RATE}`,
    '-t', dur, '-c:a', 'libmp3lame', '-b:a', `${FISH_BITRATE}k`,
    out,
  ], { stdio: 'ignore' });
  return out;
}

async function concatMp3s(inputs, outPath) {
  if (inputs.length === 1) {
    fs.copyFileSync(inputs[0], outPath);
    return;
  }
  const listFile = path.join(os.tmpdir(), `tts-concat-${Date.now()}-${process.pid}.txt`);
  fs.writeFileSync(listFile, inputs.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  try {
    await execFileP('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
      '-c', 'copy', outPath,
    ], { stdio: 'ignore' });
  } finally {
    fs.unlinkSync(listFile);
  }
}

async function loudnormInPlace(mp3Path) {
  if (!HAS_FFMPEG) return;
  const tmp = mp3Path + '.norm.mp3';
  await execFileP('ffmpeg', [
    '-y', '-i', mp3Path,
    '-af', `loudnorm=${LOUDNORM_TARGET}`,
    '-c:a', 'libmp3lame', '-b:a', `${FISH_BITRATE}k`,
    '-ar', String(FISH_SAMPLE_RATE),
    tmp,
  ], { stdio: 'ignore' });
  fs.renameSync(tmp, mp3Path);
}

// ─── Cache ────────────────────────────────────────────────────────────────────
function cacheKey(normalizedText, voiceId, modelId) {
  return crypto.createHash('sha1').update(JSON.stringify({
    text: normalizedText,
    voiceId, modelId,
    latency: FISH_LATENCY,
    chunkLength: FISH_CHUNK_LENGTH,
    speed: FISH_PROSODY_SPEED,
    volume: FISH_PROSODY_VOLUME,
    normalize: FISH_NORMALIZE,
    sampleRate: FISH_SAMPLE_RATE,
    bitrate: FISH_BITRATE,
  })).digest('hex');
}

// ─── TTS with retries ─────────────────────────────────────────────────────────
async function ttsToBuffer(session, text, voiceId, modelId) {
  const opts = {
    modelId,
    referenceId: voiceId,
    format: 'mp3',
    mp3Bitrate: FISH_BITRATE,
    sampleRate: FISH_SAMPLE_RATE,
    latency: FISH_LATENCY,
    chunkLength: FISH_CHUNK_LENGTH,
    normalize: FISH_NORMALIZE,
    prosody: { speed: FISH_PROSODY_SPEED, volume: FISH_PROSODY_VOLUME },
  };
  const req = new TTSRequest(text, opts);
  const chunks = [];
  for await (const c of session.tts(req)) chunks.push(c);
  return Buffer.concat(chunks);
}

async function ttsWithRetries(session, text, voiceId) {
  let lastErr;
  let modelId = FISH_MODEL;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const buf = await ttsToBuffer(session, text, voiceId, modelId);
      if (buf.length < 1024) throw new Error(`Audio sospechosamente corto (${buf.length} bytes)`);
      return buf;
    } catch (e) {
      lastErr = e;
      const msg = e.message || String(e);
      console.log(`   ⚠️  intento ${attempt}/${MAX_RETRIES} falló: ${msg}`);
      // Fallback de modelo si el primero no está disponible
      if (attempt === 1 && /model|not found|404|invalid/i.test(msg) && modelId !== FISH_MODEL_FALLBACK) {
        console.log(`   ↩  cambiando a modelo fallback: ${FISH_MODEL_FALLBACK}`);
        modelId = FISH_MODEL_FALLBACK;
        continue;
      }
      if (attempt < MAX_RETRIES) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  throw lastErr;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey  = process.env.FISH_AUDIO_API_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;
  const projectId = process.argv[2];

  if (!projectId) {
    console.error('Error: Debes especificar un nombre de proyecto. Ej: node generate-audio.js test-pipeline');
    process.exit(1);
  }
  if (!apiKey || !voiceId) {
    console.error('Error: FISH_AUDIO_API_KEY y FISH_AUDIO_VOICE_ID deben estar en .env');
    process.exit(1);
  }
  if (!HAS_FFMPEG) {
    console.warn('⚠️  ffmpeg no detectado en PATH — concat y loudnorm deshabilitados.');
    console.warn('   Los párrafos largos no se podrán dividir/concatenar. Instala ffmpeg para usar el pipeline completo.');
  }

  const projectDir = path.join(__dirname, 'public', 'projects', projectId);
  const guionPath  = path.join(projectDir, 'guion.json');
  const audioDir   = path.join(projectDir, 'audio');
  const cacheDir   = path.join(audioDir, '.cache');
  const timingPath = path.join(projectDir, 'timing.json');

  if (!fs.existsSync(guionPath)) {
    console.error(`Error: No se encontró ${guionPath}`);
    process.exit(1);
  }

  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));

  console.log(`🎙️  Modelo: ${FISH_MODEL} (fallback: ${FISH_MODEL_FALLBACK}) | Voice: ${voiceId.slice(0,8)}… | Latency: ${FISH_LATENCY} | Speed: ${FISH_PROSODY_SPEED}`);
  console.log(`🚀 Generando audio para: ${projectId} (${guion.length} párrafos)\n`);

  const silenceFile = HAS_FFMPEG ? await ensureSilenceFile() : null;
  const session = new Session(apiKey);
  const timing = {};
  let currentStart = 0;

  try {
    for (const parrafo of guion) {
      const outPath  = path.join(audioDir, `parrafo-${parrafo.id}.mp3`);
      const normText = normalizeForTTS(parrafo.texto);
      const key      = cacheKey(normText, voiceId, FISH_MODEL);
      const cachePath = path.join(cacheDir, `${key}.mp3`);

      const preview = parrafo.texto.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`[${parrafo.id}] "${preview}…"`);

      let finalBuf;
      if (fs.existsSync(cachePath)) {
        console.log(`   ⏭  cache hit (${path.basename(cachePath)})`);
        fs.copyFileSync(cachePath, outPath);
      } else {
        const chunks = chunkText(normText);
        console.log(`   📝 ${chunks.length} chunk(s) (${normText.length} chars normalizados)`);

        if (chunks.length === 1 || !HAS_FFMPEG) {
          // Single shot
          const text = HAS_FFMPEG ? chunks[0] : normText;
          const buf = await ttsWithRetries(session, text, voiceId);
          fs.writeFileSync(outPath, buf);
        } else {
          // Multi-chunk: render each to temp file, concat with silence
          const tmpFiles = [];
          for (let i = 0; i < chunks.length; i++) {
            const buf = await ttsWithRetries(session, chunks[i], voiceId);
            const tmp = path.join(os.tmpdir(), `tts-${process.pid}-${Date.now()}-${i}.mp3`);
            fs.writeFileSync(tmp, buf);
            tmpFiles.push(tmp);
            if (i < chunks.length - 1 && silenceFile) tmpFiles.push(silenceFile);
          }
          await concatMp3s(tmpFiles, outPath);
          for (const f of tmpFiles) {
            if (f !== silenceFile && fs.existsSync(f)) fs.unlinkSync(f);
          }
        }

        // Loudness normalization on final file
        if (HAS_FFMPEG) await loudnormInPlace(outPath);

        // Update cache (post-normalization)
        fs.copyFileSync(outPath, cachePath);
      }

      const meta = await parseFile(outPath);
      const duration = Math.round((meta.format.duration ?? 0) * 100) / 100;
      if (!duration || duration < 0.1) {
        throw new Error(`Duración inválida (${duration}s) para parrafo-${parrafo.id}`);
      }
      timing[`parrafo-${parrafo.id}`] = {
        start: Math.round(currentStart * 100) / 100,
        duration,
      };
      currentStart += meta.format.duration ?? 0;
      finalBuf = null;

      console.log(`   ✅ ${duration}s\n`);
    }
  } finally {
    session.close();
  }

  // ─── CONCATENACIÓN AUTOMÁTICA CONTINUA ───
  const finalAudioPath = path.join(projectDir, 'audio.mp3');
  if (HAS_FFMPEG) {
    console.log(`\n🔗 Concatenando todos los fragmentos en un audio continuo: audio.mp3...`);
    try {
      const allParagraphsFiles = guion.map(p => path.join(audioDir, `parrafo-${p.id}.mp3`));
      await concatMp3s(allParagraphsFiles, finalAudioPath);
      console.log(`   ✅ Audio continuo unificado guardado en: ${finalAudioPath}`);
    } catch (concatErr) {
      console.error(`   ❌ Falló la unificación del audio continuo:`, concatErr.message);
    }
  } else {
    console.warn(`   ⚠️  No se pudo crear audio.mp3 continuo porque ffmpeg no está disponible.`);
  }

  fs.writeFileSync(timingPath, JSON.stringify(timing, null, 2));
  const total = Math.round(currentStart * 100) / 100;
  console.log(`\n✨ Listo.`);
  console.log(`   Audios:        ${guion.length}`);
  console.log(`   Duración total: ${total}s (${(total/60).toFixed(2)} min)`);
  console.log(`   timing.json:   ${timingPath}`);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
