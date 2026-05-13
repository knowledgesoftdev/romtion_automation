require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Session, TTSRequest } = require('fish-audio-sdk');
const { parseFile } = require('music-metadata');

async function main() {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;

  if (!apiKey || !voiceId) {
    throw new Error('FISH_AUDIO_API_KEY y FISH_AUDIO_VOICE_ID deben estar definidos en .env');
  }

  const guionPath = path.join(__dirname, 'scripts', 'guion.json');
  const guion = JSON.parse(fs.readFileSync(guionPath, 'utf8'));

  const audioDir = path.join(__dirname, 'public', 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const timingPath = path.join(__dirname, 'src', 'timing.json');

  const session = new Session(apiKey);
  const timing = {};
  let currentStart = 0;

  for (const parrafo of guion) {
    const outputPath = path.join(audioDir, `parrafo-${parrafo.id}.mp3`);
    console.log(`[${parrafo.id}] Generando audio: "${parrafo.texto.substring(0, 50)}..."`);

    const request = new TTSRequest(parrafo.texto, {
      modelId: 'speech-1.5',
      referenceId: voiceId,
      format: 'mp3',
      latency: 'balanced',
    });

    const chunks = [];
    for await (const chunk of session.tts(request)) {
      chunks.push(chunk);
    }

    fs.writeFileSync(outputPath, Buffer.concat(chunks));
    console.log(`[${parrafo.id}] Guardado en ${outputPath}`);

    const metadata = await parseFile(outputPath);
    const duration = Math.round((metadata.format.duration ?? 0) * 100) / 100;

    timing[`parrafo-${parrafo.id}`] = {
      start: Math.round(currentStart * 100) / 100,
      duration,
    };

    currentStart += metadata.format.duration ?? 0;
  }

  session.close();

  fs.writeFileSync(timingPath, JSON.stringify(timing, null, 2));
  console.log(`\ntiming.json generado en ${timingPath}`);

  const totalDuration = Math.round(currentStart * 100) / 100;
  console.log(`\nResumen:`);
  console.log(`  Audios generados: ${guion.length}`);
  console.log(`  Duración total:   ${totalDuration} segundos`);
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
