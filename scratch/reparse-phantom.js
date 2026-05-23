require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { parseScriptSmart } = require('../server/utils/smartParser');

const ROOT       = path.join(__dirname, '..');
const projectId  = "the-us-military's-most-secretive-unit-\u2014-more-hidden-than-delta-force";
const projectDir = path.join(ROOT, 'public', 'projects', 'phantom-directive', projectId);
const scriptPath = path.join(projectDir, 'full_script.txt');

if (!fs.existsSync(scriptPath)) {
  console.error('No se encontro full_script.txt en:', scriptPath);
  process.exit(1);
}

const rawScript = fs.readFileSync(scriptPath, 'utf8');
const wordCount = rawScript.split(/\s+/).filter(Boolean).length;
console.log('Script total words:', wordCount);

parseScriptSmart(rawScript, { projectName: projectId }).then(guion => {
  const maxW = Math.max(...guion.map(g => g.texto.split(/\s+/).filter(Boolean).length));
  const minW = Math.min(...guion.map(g => g.texto.split(/\s+/).filter(Boolean).length));
  const avgW = (guion.reduce((s, g) => s + g.texto.split(/\s+/).filter(Boolean).length, 0) / guion.length).toFixed(1);

  console.log('Total fragments :', guion.length);
  console.log('Max words/frag  :', maxW);
  console.log('Min words/frag  :', minW);
  console.log('Avg words/frag  :', avgW);

  console.log('\nFirst 5 fragments:');
  guion.slice(0, 5).forEach(g => {
    const wc = g.texto.split(/\s+/).filter(Boolean).length;
    console.log('  [' + g.id + '] (' + wc + 'w) ' + g.texto.substring(0, 90));
  });

  console.log('\nLast 3 fragments:');
  guion.slice(-3).forEach(g => {
    const wc = g.texto.split(/\s+/).filter(Boolean).length;
    console.log('  [' + g.id + '] (' + wc + 'w) ' + g.texto.substring(0, 90));
  });

  fs.writeFileSync(path.join(projectDir, 'guion.json'), JSON.stringify(guion, null, 2));
  console.log('\nguion.json saved with', guion.length, 'fragments!');
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
