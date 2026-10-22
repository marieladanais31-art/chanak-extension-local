import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../public/deep/', import.meta.url);
const load = (f) => { const ctx = { window: {} }; ctx.window.window = ctx.window; vm.runInNewContext(fs.readFileSync(new URL(f, dir), 'utf8'), ctx); return ctx.window; };
const manifest = load('manifest.js').EL_DEEP_MANIFEST;
const MO = ['Oct', 'Nov', 'Dic', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
const BAND = { p1: [250, 350], p2: [250, 350], p3: [400, 520], p4: [400, 520], p5: [550, 800], p6: [550, 700], eso1: [650, 800], eso2: [650, 800], eso3: [750, 950], eso4: [750, 950], bach1: [750, 950], bach2: [750, 950], spanish1: [450, 600], spanish2: [600, 750], conversational: [650, 800] };
const bad = /darwin|homin|simio|australopit|neandert|selecci[oó]n natural|origen del mono|homo sapiens|millones de a[nñ]os|natural selection/i;
const wc = (t) => t.trim().split(/\s+/).length;
assert.ok(manifest.length > 0);
for (const file of manifest) {
  const D = load(file + '.js').EL_DEEP; const lvl = file.replace(/^(es|ob)_/, ''); const keys = Object.keys(D);
  assert.equal(keys.length, 9, file); assert.deepEqual(keys.map((k) => k.split(':').pop()), MO, file);
  for (const k of keys) {
    const u = D[k]; const n = u.reading.reduce((s, p) => s + wc(p), 0);
    assert.ok(n >= BAND[lvl][0] && n <= BAND[lvl][1], `${k} lectura ${n}`);
    assert.ok(u.glossary.length >= 5 && u.glossary.length <= 8 && u.practice.length >= 3 && u.practice.length <= 4, k);
    assert.equal(u.quiz.length, 5, k); u.quiz.forEach((q) => { assert.equal(q.opts.length, 3); assert.equal(q.opts.filter((o) => o.ok).length, 1); });
    if (file.startsWith('ob_')) assert.ok(u.reading_es, k + ' reading_es');
    if (/^es_p\d/.test(file)) assert.ok(!bad.test(JSON.stringify(u)), 'PRIMARIA con término prohibido: ' + k);
  }
}
console.log('deep OK:', manifest.join(', '));
// Recursos interactivos: cuando existen, están completos
for (const file of manifest) { const D = load(file + '.js').EL_DEEP; for (const [k, u] of Object.entries(D)) {
  if (u.timeline) { assert.ok(u.timeline.length >= 5 && u.timeline.length <= 7, k + ' timeline'); assert.equal(u.scene.icons.length, 3, k); assert.ok(u.media.length >= 2, k + ' media'); }
  if (u.map) u.map.markers.forEach((m) => { assert.ok(m.lat >= 35 && m.lat <= 44 && m.lon >= -10 && m.lon <= 4.5, k + ' mapa ' + m.name); });
} }
console.log('recursos interactivos OK');
