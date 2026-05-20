const { parseScriptSmart } = require('../server/utils/smartParser');

async function run() {
  console.log("🧪 Iniciando prueba de smartParser con Autocuración...");
  
  // Un guion corto pero que requiere generación visual con Claude (menos de 20 fragmentos)
  const scriptTest = `
CHAPTER 1: EL ORIGEN
BlackBerry dominaba el 40% del mercado smartphone en 2007 con su teclado fisico y un diseño único.
Pero la llegada del iPhone cambió las reglas del juego de manera dramática y urgente, forzando un declive total de ingresos.
  `;
  
  try {
    const result = await parseScriptSmart(scriptTest, { projectName: "TestSelfHealing" });
    
    console.log("\n================================================================================");
    console.log("📊 RESULTADOS DEL PARSEO DE PRUEBA:");
    console.log("================================================================================");
    console.log(JSON.stringify(result, null, 2));
    console.log("================================================================================");
    
    // Validar visualizaciones devueltas
    let totalElements = 0;
    result.forEach((scene, index) => {
      const els = scene.visual?.elements || [];
      totalElements += els.length;
      console.log(`Scene ${index + 1} (${scene.chapter_title}):`);
      console.log(`  Texto: "${scene.texto}"`);
      console.log(`  Mood:  ${scene.visual?.color_mood}`);
      console.log(`  Elementos (${els.length}): ${els.map(e => `${e.type}(slot:${e.slot}, id:${e.id})`).join(', ')}`);
      console.log(`  Flechas:   ${(scene.visual?.arrows || []).map(a => `${a.from} -> ${a.to}`).join(', ')}`);
    });
    
    if (totalElements > 0) {
      console.log("\n✅ Test completado con éxito! El parser generó layouts validados y enriquecidos.");
    } else {
      console.log("\n⚠️  El parser devolvió escenas pero sin elementos visuales (probablemente cayó a fallback).");
    }
  } catch (error) {
    console.error("❌ El test falló con error:", error);
  }
}

run();
