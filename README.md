# 🎥 Remotion Automation - Generador de Videos Documentales

Este proyecto es una herramienta de automatización para la creación de videos documentales y educativos utilizando **Remotion**, React y generación de contenido mediante IA.

## 🚀 Estado Actual del Proyecto
El proyecto cuenta actualmente con un motor de renderizado optimizado para un video sobre la **Historia y el Colapso de Nokia y Symbian**.

### Características principales:
- **Sincronización Perfecta:** Utiliza un sistema de mapeo entre guiones JSON, audios generados y un archivo de `timing.json` para asegurar que las visuales coincidan exactamente con la voz.
- **Visuales Premium:** Animaciones complejas en React que incluyen:
  - Diagramas de gestión de memoria dinámicos.
  - Líneas de tiempo interactivas.
  - Efectos de glitch y tipografía estilo documental.
  - Gráficos comparativos de mercado.
- **Estructura Basada en Datos:** Todo el contenido (texto y tiempos) se maneja de forma externa al código fuente, facilitando la edición.

## 📁 Estructura del Proyecto
- `src/`: Componentes de React y lógica de animación.
- `scripts/`: Contiene el `guion.json` con el texto narrativo.
- `public/audio/`: Archivos de audio generados para cada párrafo.
- `timing.json`: Archivo de configuración con los inicios y duraciones exactas de cada escena.
- `animacions.txt`: Storyboard técnico detallado de cada escena.

## 🛠️ Comandos

**Instalar Dependencias**
```bash
npm install
```

**Iniciar Previsualización (Modo Desarrollo)**
```bash
npm run dev
```

**Renderizar Video Final**
```bash
npx remotion render
```

## 🎯 Próximos Pasos (Hoja de Ruta)
- [ ] **Organización por Proyectos:** Implementar una estructura de carpetas `projects/` para manejar múltiples videos de forma independiente.
- [ ] **Automatización de Contenido:** Integrar scripts que generen el guion y el audio automáticamente a partir de un tema central.
- [ ] **Frontend de Gestión:** Crear una interfaz de usuario para que cualquier persona pueda generar videos sin tocar el código.

---
Creado con ❤️ para la automatización de contenido de alto impacto.
