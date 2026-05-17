# 🎥 Remotion Video Automation Pipeline — Código Muerto

¡Bienvenido al motor definitivo de automatización para canales de documentales de tecnología! Este sistema integra **generación inteligente de guiones**, **mapeo de audio por IA**, **segmentación semántica con Claude (Anthropic)**, **renderizado dinámico con Remotion (React)** y un **bucle de aprendizaje continuo (Auto-Sync)** conectado a la API oficial de YouTube.

---

## 🌟 Características de Nivel Premium

### 🧠 1. Memoria Continua del Canal (`channel-memory.json`)
El sistema no solo crea videos, sino que **aprende de su rendimiento real**. Guarda un registro histórico de:
- Temas cubiertos y palabras clave agotadas.
- Lista completa de videos publicados, sus vistas y likes en tiempo real.
- Estilos de hook usados y rendimiento del CTR / Retención analizados mediante la API de YouTube Analytics.
- Sugerencias optimizadas de miniatura generadas durante el pipeline de planificación.

### 🔄 2. Sincronización YouTube en 1-Clic
Integrado directamente en el Dashboard, permite sincronizar tu canal en segundos:
- Intercambia y refresca dinámicamente credenciales **Google OAuth2** seguras.
- Detecta y cruza de manera semántica tus videos subidos con los proyectos locales.
- Actualiza automáticamente estadísticas de retención (`retention = averageViewDuration / duration`) y CTR exactos.

### 🧠 3. Fragmentación Inteligente (Smart Parser)
- Utiliza **Claude (Anthropic API)** para dividir tus narrativas de forma inteligente en escenas cortas de $\le 45$ palabras.
- Evita escenas largas y aburridas, garantizando un ritmo ágil y dinámico ideal para redes sociales y retención masiva.

### 🎨 4. Dashboard de Control Moderno
Una interfaz visual premium con tema oscuro, gradientes HSL y micro-animaciones:
1. **Paso 1: Guion**: Carga tu texto, utiliza el **🧠 Smart Reparse** con Claude para fragmentarlo, genera metadatos completos para YouTube (título, descripción, tags y capítulos automáticos cruzando `guion.json` y `timing.json`).
2. **Paso 2: Audio & Timings**: Generación sincronizada párrafo por párrafo de voz artificial realista y mapeo milimétrico de tiempos (`timing.json`).
3. **Paso 3: Planificación**: Generación automatizada del plan visual escena por escena, sugiriendo conceptos de imágenes/videos.
4. **Paso 4: Media Assets**: Descarga directa de assets premium libres de derechos desde Pexels.
5. **Paso 5: Previsualización & Render**: Visualización directa a través de Remotion Studio y exportación final.

---

## 📁 Estructura del Ecosistema

```
prueba-remo-claude/
├── dashboard/                 # Frontend React (Vite)
│   └── src/App.jsx            # Interfaz moderna de usuario
├── server/                    # Servidor Express de control del pipeline
│   ├── index.js               # Rutas API de automatización
│   └── utils/smartParser.js   # Segmentador de guiones conectado a Claude
├── scripts/                   # Scripts auxiliares del pipeline de producción
│   ├── auto-sync.js           # Sincronizador de YouTube Analytics
│   ├── oauth-setup.js         # Asistente interactivo de autorización OAuth2
│   ├── build-scene-plan.js    # Planificador visual de escenas
│   └── generate-yt-metadata.js# Generador de títulos, descripciones y tags
├── public/projects/           # Carpetas independientes por video producido
│   └── [nombre-proyecto]/     # Guion, timings, assets y metadatos del proyecto
├── channel-memory.json        # Base de datos local de memoria persistente
└── .env                       # Credenciales seguras (API Keys, OAuth2 Tokens)
```

---

## 🛠️ Instalación y Configuración

### 1. Requisitos Previos
Asegúrate de tener instalado **Node.js (v18+)** y contar con credenciales de **Google Cloud Platform** (con habilitación de YouTube Data API v3 y YouTube Analytics API).

### 2. Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:
```env
ANTHROPIC_API_KEY=tu-api-key-de-claude
YOUTUBE_API_KEY=tu-api-key-de-google-cloud
YOUTUBE_CHANNEL_ID=UCqaBQHDWjnfARx6L4rYjB_A
YOUTUBE_CLIENT_ID=tu-oauth-client-id
YOUTUBE_CLIENT_SECRET=tu-oauth-client-secret
YOUTUBE_REFRESH_TOKEN=tu-refresh-token-autogenerado
```

### 3. Autenticación OAuth2 Rápida
Ejecuta el asistente interactivo para conectarte a tu canal de YouTube de forma segura:
```bash
node scripts/oauth-setup.js
```
El script levantará un servidor temporal, abrirá tu navegador para iniciar sesión con Google, capturará tu token de renovación y lo inyectará directamente en tu `.env` de forma 100% segura.

---

## 🚀 Uso del Pipeline

### Iniciar los Servidores
Inicia el entorno de automatización completo con un solo comando:

```bash
# Iniciar Servidor API y Frontend Dev
npm run server
npm run dev
```

1. Abre tu navegador en `http://localhost:5173`.
2. Crea un **Nuevo Proyecto**, introduce el título y pega el guion original.
3. Haz click en **Smart Reparse** en el Step 1 para fragmentar semánticamente el texto.
4. Genera el audio, descarga los multimedia de Pexels, ¡y abre Remotion Studio para ver tu video cobrar vida en tiempo real!
5. **Cierra el loop**: Una vez que subas tu video a YouTube, haz click en el botón morado **"🔄 Sincronizar YouTube"** del Dashboard para que el sistema aprenda automáticamente de tu CTR y retención para tus futuros videos.

---
Creado para revolucionar la automatización de video con IA y código premium. 🎬🤖💡
