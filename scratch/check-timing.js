const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const projectId  = "the-us-military's-most-secretive-unit-\u2014-more-hidden-than-delta-force";
const projectDir = path.join(ROOT, 'public', 'projects', 'phantom-directive', projectId);
const timingPath = path.join(projectDir, 'timing.json');

if (!fs.existsSync(timingPath)) { console.error('No timing.json found'); process.exit(1); }

const t    = JSON.parse(fs.readFileSync(timingPath, 'utf8'));
const vals = Object.values(t);
const durs = vals.map(v => v.duration);
const max  = Math.max(...durs).toFixed(2);
const min  = Math.min(...durs).toFixed(2);
const avg  = (durs.reduce((s, v) => s + v, 0) / durs.length).toFixed(2);
const total = durs.reduce((s, v) => s + v, 0);
const over6 = vals.filter(v => v.duration > 6).length;

console.log('Scenes     :', vals.length);
console.log('Max dur    :', max + 's');
console.log('Min dur    :', min + 's');
console.log('Avg dur    :', avg + 's');
console.log('Total      :', (total / 60).toFixed(2) + ' min');
console.log('Over 6s    :', over6);

if (over6 > 0) {
  console.log('\nScenes exceeding 6s:');
  Object.entries(t).filter(([, v]) => v.duration > 6).forEach(([k, v]) => {
    console.log('  ' + k + ' => ' + v.duration.toFixed(2) + 's');
  });
}
