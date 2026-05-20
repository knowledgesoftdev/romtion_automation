# 🎥 Remotion Video Automation Pipeline — Código Muerto

¡Bienvenido al motor definitivo de automatización para canales de documentales de tecnología! Este sistema integra **generación inteligente de guiones**, **mapeo de audio por IA**, **segmentación semántica con Claude (Anthropic)**, **renderizado dinámico con Remotion (React)** y un **bucle de aprendizaje continuo (Auto-Sync)** conectado a la API oficial de YouTube.

---

## 🌟 Características de Nivel Premium

### 📊 1. Análisis de Rendimiento en YouTube (CTR & Retención)
El sistema no solo crea videos, sino que **aprende de su rendimiento real** consultando la API oficial de YouTube Analytics:
- **Cálculo de Retención Real:** Cruza la duración real del video en segundos con la duración promedio de reproducción (`retention = averageViewDuration / duration`).
- **Extracción de CTR:** Captura el Click-Through Rate (CTR) de impresión exacto por cada video.
- **Autoclase de Ganchos (Hook Styles):** Si un video supera el **60% de retención**, el estilo de gancho utilizado (ej. *pregunta retórica*, *dato técnico de ruptura*) se registra automáticamente en `channel-memory.json` como un gancho exitoso para guiar al escritor de IA en futuros videos.
- **Ejecución del análisis:**
  ```bash
  node scripts/analyze-performance.js <videoId> [--hook-style="dato impactante"]
  ```

### 🧠 2. Red de Memoria del Canal (`NeuronGraph.jsx`)
La interfaz incluye una **red neuronal interactiva en 2D/3D** renderizada mediante HTML5 Canvas:
- **Visualización de Neuronas:** Cada neurona representa un video local o publicado en YouTube.
- **Mapeo de Novedades (Etiqueta NEW):** Las neuronas se iluminan dinámicamente y marcan con un tag "NEW" los últimos 3 videos sincronizados desde tu canal.
- **Cálculo de Pesos:** Dibuja sinapsis y conexiones con grosores variables basados en la similitud semántica y los patrones de rendimiento en tu canal.
- **Animaciones fluidas:** Un bucle de simulación física en tiempo real integrado con React que se auto-recupera de estados vacíos.

### 🎨 3. Motor de Composición Smart Whiteboard (`smartParser.js`)
Para evitar videos genéricos aburridos, el sistema utiliza **Claude (Anthropic API)** como un **Director de Arte de Pizarra Virtual**:
- **7-Slots Constellation:** Organiza los elementos visuales en slots (`top-left`, `top-right`, `mid-left`, `center`, `mid-right`, `bottom-left`, `bottom-right`) evitando colisiones.
- **Tipos de Elementos Sincronizados:**
  - `label_red` / `label_black`: Textos y stickers dinámicos limitados para máxima legibilidad.
  - `icon` / `logo`: Integración de logos de marcas e iconos vectoriales dinámicos (`flat-color-icons`).
  - `motion_graphic`: Gráficos animados embebidos (`donut_chart`, `contador_porcentaje`, `timeline_barras`).
  - `pexels_image`: Imágenes de stock reales descargadas de forma automática solo en escenas clave.
- **Trigger Words:** Cada elemento visual está vinculado a una palabra exacta del audio generador y aparece exactamente cuando la voz en off la pronuncia.

### 🔄 4. Sincronización YouTube en 1-Clic
Integrado directamente en el Dashboard, permite sincronizar tu canal en segundos:
- Intercambia y refresca dinámicamente credenciales **Google OAuth2** seguras.
- Detecta y cruza de manera semántica tus videos subidos con los proyectos locales.

---

## 📁 Estructura del Ecosistema

```
prueba-remo-claude/
├── dashboard/                 # Frontend React (Vite)
│   └── src/
│       ├── App.jsx            # Interfaz principal con control de pasos
│       └── NeuronGraph.jsx    # Visualizador interactivo de red neuronal de videos
├── server/                    # Servidor Express de control del pipeline
│   ├── index.js               # Rutas API de automatización
│   └── utils/
│       ├── smartParser.js     # Segmentador de guiones y Director de Arte (Claude)
│       └── ollamaProvider.js  # Proveedor de respaldo local con Ollama
├── scripts/                   # Scripts auxiliares del pipeline de producción
│   ├── auto-sync.js           # Sincronizador de YouTube Analytics
│   ├── analyze-performance.js # Analizador oficial de CTR, Retención y Ganchos
│   ├── oauth-setup.js         # Asistente interactivo de autorización OAuth2
│   ├── build-scene-plan.js    # Planificador visual de escenas
│   └── generate-yt-metadata.js# Generador de títulos, descripciones y tags
├── public/projects/           # Carpetas independientes por video producido
│   └── [nombre-proyecto]/     # Guion, timings, assets y metadatos del proyecto
├── channel-memory.json        # Base de datos local de memoria persistente del canal
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

1. Abre tu navegador en `http://localhost:5173` (o la dirección del frontend).
2. Crea un **Nuevo Proyecto**, introduce el título y pega el guion original.
3. Haz click en **Smart Reparse** en el Step 1 para fragmentar semánticamente el texto y diseñar las escenas visuales de la pizarra virtual.
4. Genera el audio, descarga los multimedia de Pexels (que descargará únicamente las imágenes requeridas para las pizarras), ¡y abre Remotion Studio para ver tu video cobrar vida en tiempo real!
5. **Cierra el loop:** Una vez que subas tu video a YouTube, sincronízalo para que el sistema analice tu CTR, vistas y retención promedio (`analyze-performance.js`), registrando los mejores hooks de cara al futuro.

---
Creado para revolucionar la automatización de video con IA y código de diseño premium. 🎬🤖💡
