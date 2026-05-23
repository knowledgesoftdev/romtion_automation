const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function run() {
  const filePath = "C:\\Users\\BrayanDeveloper\\.gemini\\antigravity\\brain\\b8130ff4-f013-44ab-b235-cd4151586d0a\\.system_generated\\logs\\transcript.jsonl";
  if (!fs.existsSync(filePath)) {
    console.error('Transcript not found');
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let found = 0;
  for await (const line of rl) {
    const obj = JSON.parse(line);
    const content = (obj.content || '').toLowerCase();
    const thinking = (obj.thinking || '').toLowerCase();
    
    if (content.includes('videoreferencianichonuevo') || thinking.includes('videoreferencianichonuevo') || content.includes('nicho nuevo')) {
      // skip the early steps if we already saw them, let's print steps after 2780
      if (obj.step_index >= 2780) {
        console.log(`\n================ STEP ${obj.step_index} (${obj.source}) ================`);
        if (obj.thinking) {
          console.log(`[Thinking]:\n${obj.thinking.substring(0, 1500)}...\n`);
        }
        if (obj.content) {
          console.log(`[Content]:\n${obj.content.substring(0, 1500)}...\n`);
        }
        found++;
        if (found > 15) break;
      }
    }
  }
}

run();
