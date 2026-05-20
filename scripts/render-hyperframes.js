/**
 * ── HyperFrames Headless Video Renderer (Puppeteer + FFmpeg) ─────────────────────
 * Usage: node scripts/render-hyperframes.js [projectId]
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const PROJECT_ID = process.argv[2] || getActiveProjectId();

if (!PROJECT_ID) {
  console.error('❌ Error: No se especificó ningún projectId y no hay proyecto activo.');
  process.exit(1);
}

const PROJECT_DIR = path.join(__dirname, '..', 'public', 'projects', PROJECT_ID);
const AUDIO_PATH = path.join(PROJECT_DIR, 'audio.mp3');
const OUTPUT_DIR = path.join(__dirname, '..', 'out');
const OUTPUT_PATH = path.join(OUTPUT_DIR, `${PROJECT_ID}-hyperframes.mp4`);

async function run() {
  console.log(`🚀 [HyperFrames Renderer] Iniciando renderizado de "${PROJECT_ID}"...`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Verify static server is reachable
  const SERVER_URL = `http://localhost:5000/projects/${PROJECT_ID}/hyperframes/index.html`;
  console.log(`🌐 Cargando lienzo estático desde: ${SERVER_URL}`);

  // 2. Launch headless browser
  console.log('🧠 Inicializando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    await page.goto(SERVER_URL, { waitUntil: 'networkidle0' });
  } catch (err) {
    console.error(`❌ Error: No se pudo cargar el lienzo HyperFrames desde el servidor.`);
    console.error(`👉 Por favor, asegúrate de que el servidor backend está corriendo en http://localhost:5000`);
    await browser.close();
    process.exit(1);
  }

  // 3. Extract metadata
  const metadata = await page.evaluate(() => {
    return {
      dataExists: typeof window.hyperframesData !== 'undefined',
      duration: window.hyperframesData ? window.hyperframesData.duration : 60,
    };
  });

  if (!metadata.dataExists) {
    console.error('❌ Error: data.js no encontrado. Debes compilar el proyecto primero.');
    console.error(`👉 Corre: node scripts/build-hyperframes.js ${PROJECT_ID}`);
    await browser.close();
    process.exit(1);
  }

  const duration = metadata.duration;
  const fps = 60;
  const totalFrames = Math.ceil(duration * fps);

  console.log(`⏱️  Duración: ${duration}s | Resolucion: 1280x720 (16:9) | Framerate: ${fps} FPS`);
  console.log(`🎬 Total fotogramas a renderizar: ${totalFrames}`);

  // 4. Setup FFmpeg
  console.log('📹 Inicializando pipe de FFmpeg...');
  
  const hasAudio = fs.existsSync(AUDIO_PATH);
  if (hasAudio) {
    console.log(`🎵 Audio detectado en ${AUDIO_PATH}. Mezclando con video.`);
  } else {
    console.warn(`⚠️  Advertencia: No se encontró audio.mp3 en ${PROJECT_DIR}. El video final no tendrá sonido.`);
  }

  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', fps.toString(),
    '-i', '-',
  ];

  if (hasAudio) {
    ffmpegArgs.push('-i', AUDIO_PATH);
  }

  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
  );

  if (hasAudio) {
    ffmpegArgs.push('-c:a', 'aac', '-shortest');
  }

  ffmpegArgs.push(OUTPUT_PATH);

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    // Hide spam, but could print for debugging
    // console.log(`[FFmpeg Debug] ${data.toString()}`);
  });

  ffmpegProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✨ [HyperFrames Renderer] Renderizado finalizado con éxito!`);
      console.log(`📦 Video exportado a: ${OUTPUT_PATH}`);
    } else {
      console.error(`❌ Error en el proceso de compilación de FFmpeg. Código de salida: ${code}`);
    }
  });

  // 5. Render Frame-by-Frame loop
  console.log('⚡ Comenzando la captura fotograma a fotograma...');
  
  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    // Seek timeline to the specific frame
    await page.evaluate((f) => {
      if (typeof window.seekToFrame === 'function') {
        window.seekToFrame(f);
      }
    }, frame);

    // Wait a brief tick for render updates
    await new Promise(r => setTimeout(r, 4));

    // Capture screenshot as buffer (JPEG for fast piping)
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 90
    });

    // Write buffer to FFmpeg stdin pipe
    ffmpegProcess.stdin.write(screenshotBuffer);

    // Print progress status
    if (frame % 30 === 0 || frame === totalFrames - 1) {
      const pct = Math.round((frame / totalFrames) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const remainingSecs = pct > 0 ? (((Date.now() - startTime) / frame) * (totalFrames - frame) / 1000).toFixed(0) : '...';
      process.stdout.write(`\r🤖 [Render Progress] Frame ${frame}/${totalFrames} [${pct}%] | Tiempo: ${elapsed}s | Restante: ~${remainingSecs}s   `);
    }
  }

  // End pipeline input streams
  console.log('\n🏁 Captura finalizada. Finalizando codificación de video...');
  ffmpegProcess.stdin.end();

  // Wait for FFmpeg process to close before shutting down Puppeteer
  await new Promise((resolve) => {
    ffmpegProcess.on('close', resolve);
  });

  await browser.close();
}

function getActiveProjectId() {
  const activePath = path.join(__dirname, '..', 'active-project.json');
  try {
    if (fs.existsSync(activePath)) {
      return JSON.parse(fs.readFileSync(activePath, 'utf8')).projectId || null;
    }
  } catch (_) {}
  return null;
}

run().catch(err => {
  console.error('❌ Error fatal en el renderizador:', err);
  process.exit(1);
});
