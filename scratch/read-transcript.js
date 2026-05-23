const fs = require('fs');
const readline = require('readline');

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

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.step_index >= 2780 && obj.step_index <= 2860) {
      console.log(`\n================ STEP ${obj.step_index} (${obj.source} / ${obj.type}) ================`);
      if (obj.content) {
        console.log(`[Content]:\n${obj.content.substring(0, 1000)}...\n`);
      }
    }
  }
}

run();
