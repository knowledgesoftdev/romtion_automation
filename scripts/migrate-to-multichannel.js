#!/usr/bin/env node
/**
 * scripts/migrate-to-multichannel.js
 * Script de migración única para estructurar el proyecto en modo Multi-Canal.
 * Reubica de forma segura la data existente de "Código Muerto".
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CHANNELS_DIR = path.join(ROOT_DIR, 'channels');
const PROJECTS_DIR = path.join(ROOT_DIR, 'public', 'projects');
const ACTIVE_CHANNEL_FILE = path.join(ROOT_DIR, 'active-channel.json');

console.log('🏁 Iniciando migración a estructura Multi-Canal...');

// 1. Verificar si ya se ha migrado antes
if (fs.existsSync(ACTIVE_CHANNEL_FILE) && fs.existsSync(path.join(CHANNELS_DIR, 'codigo-muerto'))) {
  console.log('✅ El proyecto ya está en formato Multi-Canal. No se requiere migración.');
  process.exit(0);
}

// 2. Crear carpetas destino
const codMuertoChannelDir = path.join(CHANNELS_DIR, 'codigo-muerto');
if (!fs.existsSync(codMuertoChannelDir)) {
  fs.mkdirSync(codMuertoChannelDir, { recursive: true });
}

const codMuertoProjectsDir = path.join(PROJECTS_DIR, 'codigo-muerto');
if (!fs.existsSync(codMuertoProjectsDir)) {
  fs.mkdirSync(codMuertoProjectsDir, { recursive: true });
}

// 3. Mover channel-memory.json
const rootMemory = path.join(ROOT_DIR, 'channel-memory.json');
const targetMemory = path.join(codMuertoChannelDir, 'channel-memory.json');
if (fs.existsSync(rootMemory)) {
  fs.renameSync(rootMemory, targetMemory);
  console.log('📦 Movido channel-memory.json a channels/codigo-muerto/');
} else {
  console.warn('⚠️ No se encontró channel-memory.json en la raíz (se generará uno nuevo por defecto en el primer arranque).');
}

// 4. Mover prompt.txt
const rootPrompt = path.join(ROOT_DIR, 'prompt.txt');
const targetPrompt = path.join(codMuertoChannelDir, 'prompt.txt');
if (fs.existsSync(rootPrompt)) {
  fs.copyFileSync(rootPrompt, targetPrompt);
  // Dejamos el prompt.txt en la raíz como copia de seguridad temporal por si algún script externo lo busca
  console.log('📄 Copiado prompt.txt a channels/codigo-muerto/');
} else {
  console.warn('⚠️ No se encontró prompt.txt en la raíz.');
}

// 5. Mover proyectos existentes a public/projects/codigo-muerto/
if (fs.existsSync(PROJECTS_DIR)) {
  const items = fs.readdirSync(PROJECTS_DIR);
  for (const item of items) {
    const itemPath = path.join(PROJECTS_DIR, item);
    // Ignorar la nueva subcarpeta y archivos que no sean directorios de proyectos
    if (item === 'codigo-muerto' || !fs.statSync(itemPath).isDirectory()) {
      continue;
    }
    
    // Mover de forma segura
    const targetPath = path.join(codMuertoProjectsDir, item);
    fs.renameSync(itemPath, targetPath);
    console.log(`📁 Proyecto "${item}" movido a public/projects/codigo-muerto/${item}`);
  }
}

// 6. Crear active-channel.json por defecto
fs.writeFileSync(ACTIVE_CHANNEL_FILE, JSON.stringify({ channelId: 'codigo-muerto' }, null, 2), 'utf8');
console.log('⚙️ Creado active-channel.json apuntando a "codigo-muerto"');

console.log('🎉 Migración completada con éxito. El entorno ahora es Multi-Canal.');
