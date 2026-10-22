import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
const load = (f) => { const ctx = { window: {} }; ctx.window.window = ctx.window; vm.runInNewContext(fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8') + '\n;this.__out = typeof EL_GRADES!=="undefined" ? {EL_GRADES} : {};', ctx); return { ...ctx.window, ...(ctx.__out || {}) }; };
const MO = ['Oct', 'Nov', 'Dic', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
const X = load('content_extension.js');
const D = X.EL_DATA, CP = X.EL_CHECKPOINTS, AX = X.EL_AXES;
const tracks = { 'us.civics': D.us.civics, 'us.finance': D.us.finance, 'pa.lengua': D.pa.lengua, 'pa.historia_geo': D.pa.historia_geo, ...Object.fromEntries(Object.entries(D.us.world_language).map(([k, v]) => ['us.wl.' + k, v])) };
assert.deepEqual(Object.keys(D.us.world_language), ['spanish1', 'spanish2', 'conversational']);
for (const [n, us] of Object.entries(tracks)) {
  assert.deepEqual(us.map((u) => u.mo), MO, n);
  for (const u of us) {
    assert.equal(u.sessions.length, 4, n); assert.equal(u.quiz.length, 5, n);
    u.quiz.forEach((q) => assert.equal(q.opts.filter((o) => o.ok).length, 1, n));
    assert.ok(u.deliverable.elem && u.deliverable.middle && u.deliverable.high && u.rubric.c && u.rubric.e && u.rubric.l, n);
    if (n.startsWith('us.wl.')) assert.ok(u.church_history?.facts?.length >= 3, n + ' church_history');
    if (u.checkpoint) { assert.equal(u.checkpoint.criteria.length, 5); assert.ok(u.checkpoint.refs.length); }
  }
}
// Opción B: proyecto final "La Brecha y Cómo Alcanzar" presente en la unidad de julio de cada nivel
for (const k of Object.keys(D.us.world_language)) assert.match(JSON.stringify(D.us.world_language[k][8]), /Brecha|The Gap/i, 'proyecto final ' + k);
// Checkpoints: toda unidad de Historia/Geografía de ESO y Bachillerato (grados 7-12) tiene el suyo
const ES = load('data-curriculum.js').EL_GRADES;
let esNeeded = 0;
for (const g of ES.filter((x) => /^(eso|bach)/.test(x.id))) for (const m of g.months) {
  if (/engua/.test(m.area) && !/istoria|eograf/.test(m.area)) continue;
  esNeeded++; assert.ok(CP[g.id + ':' + m.mo], 'falta checkpoint ' + g.id + ':' + m.mo);
}
for (const u of D.pa.historia_geo) assert.ok(CP['pa:historia_geo:' + u.mo], 'pa ' + u.mo);
for (const u of D.us.civics) assert.ok(CP['us:fl_civics:' + u.mo], 'us ' + u.mo);
// Lengua: 4 ejes continuos en los 12 grados de España y en las 3 bandas de Panamá, los 9 meses
for (const g of ES) { assert.ok(AX[g.id], g.id); for (const mo of MO) { const a = AX[g.id][mo]; assert.ok(a.oral && a.grammar && a.writing && a.canon.author && a.canon.work, g.id + mo); } }
for (const b of ['pa_elem', 'pa_middle', 'pa_high']) for (const mo of MO) assert.ok(AX[b][mo].canon.focus, b + mo);
// Primaria (1.º-6.º): nada de hominización ni evolucionismo (currículo de España, ejes y rutas de EE. UU./Panamá en banda elemental)
const bad = /darwin|homin|simio|australopit|neandert|selecci[oó]n natural|origen del mono|homo sapiens|millones de a[nñ]os|natural selection|biological evolution/i;
for (const g of ES.filter((x) => /^p\d/.test(x.id))) assert.ok(!bad.test(JSON.stringify(g)), 'primaria ' + g.id);
for (const g of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'pa_elem']) assert.ok(!bad.test(JSON.stringify(AX[g])), 'ejes ' + g);
for (const [n, us] of Object.entries(tracks)) for (const u of us) assert.ok(!bad.test(JSON.stringify({ ...u, checkpoint: undefined, deliverable: { e: u.deliverable.elem } })), 'banda elemental ' + n + ' ' + u.mo);
console.log('content OK · checkpoints ES', esNeeded, '· total', Object.keys(CP).length);
