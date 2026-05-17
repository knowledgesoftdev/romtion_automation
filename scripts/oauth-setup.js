#!/usr/bin/env node
/**
 * scripts/oauth-setup.js
 * Inicia un servidor web local temporal para realizar el flujo de autenticación OAuth 2.0.
 * Guarda automáticamente el YOUTUBE_REFRESH_TOKEN obtenido en tu archivo .env
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('\n❌ ERROR: Falta configurar las variables en tu archivo .env:');
  console.error('   Añade YOUTUBE_CLIENT_ID y YOUTUBE_CLIENT_SECRET antes de correr este script.\n');
  process.exit(1);
}

// ── Construir URL de Autorización de Google ────────────────────────────────────
const scopes = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.readonly'
];

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline', // Crítico para obtener el refresh_token
  prompt: 'consent'
}).toString();

// ── Iniciar Servidor Local Temporal ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, REDIRECT_URI);
  const code = urlObj.searchParams.get('code');

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Error: No se recibió ningún código de autorización de Google</h1>');
    return;
  }

  // Intercambiar código por tokens
  try {
    console.log('🔄 Intercambiando código de autorización por tokens...');
    
    // Hacemos fetch nativo utilizando node-fetch (si existe) o fetch global (Node 18+)
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(tokens));
    }

    if (!tokens.refresh_token) {
      throw new Error('No se recibió refresh_token. Asegúrate de desvincular la app en tu cuenta de Google y volver a intentar para forzar el consentimiento.');
    }

    console.log('✅ Tokens recibidos con éxito.');

    // ── Guardar Refresh Token en .env ──────────────────────────────────────────
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/YOUTUBE_REFRESH_TOKEN=.*/, `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      envContent += `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('💾 YOUTUBE_REFRESH_TOKEN guardado automáticamente en tu archivo .env!');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <div style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #10B981;">¡Conexión Exitosa con YouTube!</h1>
        <p style="font-size: 1.1em; color: #4B5563;">El Refresh Token se ha guardado correctamente en tu archivo <b>.env</b>.</p>
        <p style="color: #9CA3AF;">Ya puedes cerrar esta ventana y regresar a tu terminal.</p>
      </div>
    `);

    // Detener el servidor de forma segura
    setTimeout(() => {
      server.close(() => {
        console.log('\n🚪 Servidor temporal cerrado. ¡Todo listo!\n');
        process.exit(0);
      });
    }, 1500);

  } catch (error) {
    console.error('❌ Error al obtener los tokens:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Error al procesar la autenticación</h1><p>${error.message}</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor de autenticación escuchando en http://localhost:${PORT}`);
  console.log('🌐 Si tu navegador no se abre automáticamente, copia y abre este enlace:');
  console.log(`\n🔗 ${authUrl}\n`);
  
  // Abrir navegador automáticamente dependiendo del OS
  try {
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} "${authUrl.replace(/"/g, '\\"')}"`);
  } catch (e) {
    // Silently handle if auto-open fails, the link is already in console
  }
});
