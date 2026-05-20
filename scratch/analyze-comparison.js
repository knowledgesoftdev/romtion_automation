require('dotenv').config();
const fs = require('fs');
const path = require('path');
let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (_) {
  Anthropic = null;
}

const COMP_DIR = path.join(__dirname, 'comparison');
const REPORT_PATH = path.join(__dirname, 'comparison_report.md');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_NAME = 'claude-haiku-4-5'; // Use the working model

async function run() {
  console.log('🧠 Iniciando análisis de comparación visual con Claude...');

  if (!Anthropic) {
    console.error('❌ Error: @anthropic-ai/sdk no está instalado.');
    process.exit(1);
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY no está configurada.');
    process.exit(1);
  }

  const clientClass = Anthropic.default || Anthropic;
  const client = new clientClass({ apiKey: ANTHROPIC_API_KEY });

  const timestamps = [10, 30, 50];
  const results = [];

  for (const sec of timestamps) {
    console.log(`🔍 Comparando capturas a los ${sec}s...`);

    const refPath = path.join(COMP_DIR, `ref_${sec}s.jpg`);
    const outPath = path.join(COMP_DIR, `out_${sec}s.jpg`);

    if (!fs.existsSync(refPath) || !fs.existsSync(outPath)) {
      console.warn(`   ⚠️ Faltan imágenes para el segundo ${sec}s. Saltando.`);
      continue;
    }

    const base64Ref = fs.readFileSync(refPath).toString('base64');
    const base64Out = fs.readFileSync(outPath).toString('base64');

    const promptText = `Eres un director de arte y diseñador de movimiento experto. Compara meticulosamente estas dos capturas de pantalla tomadas exactamente en el segundo ${sec}s del video:

Imagen 1: Captura del Video de REFERENCIA original (el objetivo estético).
Imagen 2: Captura de nuestro VIDEO DE SALIDA generado con Remotion (el resultado de nuestro código).

Por favor, analiza y detalla:
1. **Composición y Maquetación (Slots)**: ¿Los elementos de texto, imágenes, logos y flechas están ubicados en los mismos lugares? ¿El diseño espacial se siente similar?
2. **Estilo Gráfico (Aesthetic)**: Compara los colores, el contraste, las fuentes tipográficas, el fondo de pizarra oscura, las flechas y las pegatinas (labels rojas y negras).
3. **Similitud y Diferencias**: Enumera qué cosas se ven idénticas y qué diferencias específicas (si las hay) saltan a la vista.
4. **Calificación**: Ponle una calificación de similitud de 1 a 10 (donde 10 es idéntico) y una calificación de calidad estética al video generado (1 a 10).

Instrucciones de Respuesta:
Devuelve un JSON estrictamente estructurado de la siguiente forma, sin rodeos, sin preámbulos, ni explicaciones fuera del bloque JSON:
{
  "similarityScore": <número entre 1 y 10>,
  "aestheticScore": <número entre 1 y 10>,
  "analysis": {
    "composition": "<análisis corto de la composición y slots>",
    "style": "<análisis corto de la tipografía, colores, stickers y pizarra>",
    "similarities": ["<similitud 1>", "<similitud 2>"],
    "differences": ["<diferencia 1>", "<diferencia 2>"]
  },
  "verdict": "<un párrafo final sintetizando si logramos el mismo nivel de calidad y estética que la referencia>"
}`;

    try {
      const res = await client.messages.create({
        model: MODEL_NAME,
        max_tokens: 1500,
        system: "Eres un director creativo experto analizando similitud estética entre un video de referencia de un canal de Youtube de tecnología y una salida automatizada de Remotion.",
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Aquí está la imagen del video de REFERENCIA original:'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Ref
                }
              },
              {
                type: 'text',
                text: 'Aquí está la imagen de nuestro VIDEO DE SALIDA generado con Remotion:'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Out
                }
              },
              {
                type: 'text',
                text: promptText
              }
            ]
          }
        ]
      });

      const rawText = res.content[0].text;
      const startIdx = rawText.indexOf('{');
      const endIdx = rawText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = rawText.substring(startIdx, endIdx + 1);
        const data = JSON.parse(jsonStr);
        results.push({ sec, ...data });
        console.log(`   ✅ Análisis del segundo ${sec}s completado. Similitud: ${data.similarityScore}/10`);
      } else {
        console.error(`   ❌ Claude no devolvió un JSON en el segundo ${sec}s.`);
      }
    } catch (e) {
      console.error(`   ❌ Error al analizar el segundo ${sec}s:`, e.message);
    }
  }

  // Escribir reporte markdown consolidado
  if (results.length > 0) {
    let md = `# Reporte Comparativo de Calidad Visual y Similitud Estética

Este reporte fue generado analizando fotogramas clave idénticos extraídos directamente de **\`videoreferecncia.mp4\`** y la salida de Remotion **\`out/WhiteboardVideo02.mp4\`**.

---

`;

    results.forEach(r => {
      md += `## ⏱️ Fotograma Clave: ${r.sec} segundos

### 📊 Calificaciones
* **Puntuación de Similitud:** **${r.similarityScore} / 10**
* **Calidad Estética del Output:** **${r.aestheticScore} / 10**

### 🔍 Análisis Detallado
* **Composición y Maquetación:** ${r.analysis.composition}
* **Estilo y Diseño Visual:** ${r.analysis.style}

### 🤝 Puntos de Coincidencia (Similitudes)
${r.analysis.similarities.map(s => `- ${s}`).join('\n')}

### ⚖️ Diferencias Identificadas
${r.analysis.differences.map(d => `- ${d}`).join('\n')}

### 📝 Veredicto de la Dirección Creativa
> ${r.verdict}

---

`;
    });

    fs.writeFileSync(REPORT_PATH, md, 'utf8');
    console.log(`\n✨ Reporte generado exitosamente en: ${REPORT_PATH}`);
  } else {
    console.error('❌ No se generaron análisis válidos.');
  }
}

run().catch(console.error);
