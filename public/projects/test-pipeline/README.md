# test-pipeline

Proyecto-semilla para validar el pipeline end-to-end. 6 párrafos breves que
ejercitan los 4 layouts del runtime: `keywordOnly`, `splitMedia`, `dataSplit`,
`fullBleedMedia`.

## Pipeline (en orden)

```bash
# 1. TTS (Fish Audio s2) — genera audio/*.mp3 y timing.json
node generate-audio.js test-pipeline

# 2. Análisis dinámico — genera scene-plan.json
#    Si Ollama está corriendo en :11434 usa el LLM (mejor calidad de queries);
#    si no, cae a heurístico determinista (queries menos precisas).
node scripts/build-scene-plan.js test-pipeline --force

# 3. Descarga de media desde Pexels — genera images/ y videos/
node fetch-pexels.js test-pipeline

# 4. Activar el proyecto (server/active-project.json)
#    + arrancar el servidor en :5000 para que Remotion lo lea
node server/index.js &

# 5a. Preview en navegador (Remotion Studio)
npm run dev

# 5b. O render headless a out/
npx remotion render VideoEngine out/test-pipeline.mp4
```

## Distribución de layouts (esperada)

| ID | Layout            | Trigger                          | Media |
|----|-------------------|----------------------------------|-------|
| 01 | `keywordOnly`     | ≤15 palabras                     | video |
| 02 | `splitMedia`      | 16-60 palabras, sin números      | video |
| 03 | `dataSplit`       | tiene `\d+` / `%` / `$` / año    | video |
| 04 | `dataSplit`       | tiene `\d+` / `%` / `$` / año    | image |
| 05 | `fullBleedMedia`  | >60 palabras, sin números fuertes| image |
| 06 | `keywordOnly`     | ≤15 palabras                     | video |

Mix media: ~60% video / 40% imagen (rotación por índice).

## Notas

- `scene-plan.json` se cachea por párrafo en `.cache/plan/`. Borrar esa carpeta
  o pasar `--force` regenera el análisis.
- `fetch-pexels.js` cachea las URLs resueltas en `.cache/pexels/` — re-ejecutar
  el script no vuelve a pegarle a la API si los archivos ya existen.
- Los audios se cachean por hash de texto+modelo en `audio/.cache/`. Cambiar
  `FISH_TEMPERATURE`, `FISH_MODEL` o el texto del párrafo invalida el caché.
- Sin Ollama, las queries de Pexels son menos relevantes (extracción literal
  de tokens en español). Levantar Ollama con `gemma4:e4b` da queries en inglés
  bien alineadas al tema.
