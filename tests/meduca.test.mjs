import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; ctx.window.window = ctx.window;
vm.runInNewContext(fs.readFileSync(new URL('../public/meduca_guides.js', import.meta.url), 'utf8'), ctx);
const M = ctx.window.EL_MEDUCA;
for (let g = 1; g <= 12; g++) assert.ok(M.guides[g]?.length, 'grado ' + g);
for (let g = 1; g <= 9; g++) { const k = new Set(M.guides[g].map((x) => x.k)); assert.ok(k.has('espanol'), 'español ' + g); assert.ok(k.has('sociales') || (k.has('historia') && k.has('geografia')), 'sociales/historia-geografía ' + g); }
for (let g = 7; g <= 9; g++) assert.ok(M.guides[g].some((x) => x.k === 'civica'), 'cívica ' + g);
for (const a of Object.values(M.guides)) for (const x of a) assert.match(x.u, /^https:\/\/guias\.meduca\.gob\.pa\/sites\/default\/files\/.+\.pdf$/, x.u);
assert.equal(Object.keys(M.programs_primaria).length, 6); assert.ok(M.programs_premedia.civica);
console.log('meduca OK:', Object.values(M.guides).flat().length, 'enlaces');
