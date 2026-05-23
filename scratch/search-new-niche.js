const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const filePath = "C:\\Users\\BrayanDeveloper\\.gemini\\antigravity\\brain\\b8130ff4-f013-44ab-b235-cd4151586d0a\\.system_generated\\logs\\transcript.jsonl";
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.toLowerCase().includes("videoreferencianichonuevo")) {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index} | Source: ${obj.source} | Type: ${obj.type}`);
      if (obj.thinking) {
        console.log(`  Thinking: ${obj.thinking.substring(0, 500)}...`);
      }
      if (obj.content) {
        console.log(`  Content: ${obj.content.substring(0, 500)}...`);
      }
      if (obj.tool_calls) {
        console.log(`  Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
      }
      console.log("-".repeat(40));
    }
  }
}

searchTranscript();
