/* Chanak Extensión Local — NÚCLEO (sin DOM): rutas, rúbrica 30/40/30, promedios y parámetros de URL.
   Se carga en el navegador (window.ELCore) y en Node (pruebas). */
(function (root) {
  var W = { c: 30, e: 40, l: 30 };            // pesos oficiales de la rúbrica Chanak (suman 100)
  var MASTERY = 80;                            // Mastery Learning: 80 % o más = dominio; por debajo se repasa y se vuelve a intentar
  var MONTH_Q = { Oct: 'Q1', Nov: 'Q1', Dic: 'Q1', Feb: 'Q2', Mar: 'Q2', Abr: 'Q2', May: 'Q3', Jun: 'Q3', Jul: 'Q3' };
  var MONTHS = ['Oct', 'Nov', 'Dic', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
  var QUARTERS = ['Q1', 'Q2', 'Q3'];

  // Rutas geográficas y sus pistas. `data` dice dónde están las unidades en window.EL_DATA (es usa el currículo LOMLOE existente).
  var ROUTES = {
    es: { id: 'es', lang: 'es', label: { es: 'España · LOMLOE', en: 'Spain · LOMLOE' }, flag: '🇪🇸',
      desc: { es: 'Lengua Castellana y Literatura, Geografía e Historia de España / autonómica.', en: 'Spanish Language & Literature, Geography and History of Spain.' }, tracks: [] },
    us: { id: 'us', lang: 'en', label: { es: 'Estados Unidos', en: 'United States' }, flag: '🇺🇸',
      desc: { es: 'Elige una de tres pistas: Historia de Florida y Civismo, Idioma extranjero (Español 1 / 2) o Finanzas personales y Tecnología.', en: 'Choose one of three tracks: Florida History & Deep Civics, World Language (Spanish 1 / 2), or Personal Finance & Technology.' },
      tracks: [
        { id: 'fl_civics', label: { es: 'Historia de Florida y Civismo profundo', en: 'Florida State History & Deep Civics' }, icon: '🏛️', data: 'us.civics' },
        { id: 'world_language', label: { es: 'Idioma extranjero: Español 1 / Español 2', en: 'World Language: Spanish 1 / Spanish 2' }, icon: '🗣️', data: 'us.world_language', levels: [{ id: 'spanish1', label: { es: 'Español 1', en: 'Spanish 1' } }, { id: 'spanish2', label: { es: 'Español 2', en: 'Spanish 2' } }] },
        { id: 'finance_tech', label: { es: 'Finanzas personales y Tecnología', en: 'Personal Finance & Technology' }, icon: '💳', data: 'us.finance' } ] },
    pa: { id: 'pa', lang: 'es', label: { es: 'Panamá / Latinoamérica', en: 'Panama / Latin America' }, flag: '🇵🇦',
      desc: { es: 'Lengua Española y Geografía e Historia nacional.', en: 'Spanish Language and national Geography & History.' },
      tracks: [
        { id: 'lengua', label: { es: 'Lengua Española', en: 'Spanish Language' }, icon: '📖', data: 'pa.lengua' },
        { id: 'historia_geo', label: { es: 'Geografía e Historia nacional', en: 'National Geography & History' }, icon: '🗺️', data: 'pa.historia_geo' } ] }
  };

  var LEVELS = [
    { n: 4, es: 'Excelente', en: 'Excellent' }, { n: 3, es: 'Logrado', en: 'Proficient' },
    { n: 2, es: 'En desarrollo', en: 'Developing' }, { n: 1, es: 'Inicial', en: 'Beginning' }
  ];

  function round2(x) { return Math.round(x * 100) / 100; }
  function clamp(n, lo, hi) { n = Number(n); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); }
  // Conocimiento: aciertos del cuestionario → 0..30
  function knowledgePts(correct, total) { total = Math.max(1, Number(total) || 1); return round2(W.c * clamp(correct, 0, total) / total); }
  // Ejecución / Conexión local: nivel 1..4 → puntos (el nivel 4 vale el máximo del criterio)
  function levelPts(level, max) { return round2(max * clamp(level, 1, 4) / 4); }
  function unitScore(o) {
    var k = knowledgePts(o.correct, o.total), e = levelPts(o.execLevel, W.e), l = levelPts(o.localLevel, W.l);
    var w = round2(k + e + l);
    return { k: k, e: e, l: l, weighted: w, mastery: w >= MASTERY };
  }
  function avg(a) { return a.length ? round2(a.reduce(function (s, x) { return s + x; }, 0) / a.length) : null; }
  // units: [{quarter, weighted, status}] → {Q1:{grade,units}, ..., final}  (el 20 % del trimestre = promedio de sus unidades)
  function quarterGrades(units) {
    var out = {}, qs = [];
    QUARTERS.forEach(function (q) {
      var w = units.filter(function (u) { return u.quarter === q && u.weighted != null; }).map(function (u) { return Number(u.weighted); });
      out[q] = { grade: avg(w), units: w.length };
      if (w.length) qs.push(out[q].grade);
    });
    out.final = avg(qs);
    return out;
  }
  // Nota 0-100 → escala de letras de EE. UU. (A 90-100, B 80-89, C 70-79, D 60-69, F)
  function letter(g) { if (g == null) return '—'; return g >= 90 ? 'A' : g >= 80 ? 'B' : g >= 70 ? 'C' : g >= 60 ? 'D' : 'F'; }
  function unitKey(route, track, level, mo) { return [route, track].concat(level ? [level] : []).concat([mo]).join(':'); }
  function quarterOf(mo) { return MONTH_Q[mo] || null; }
  // Parámetros que manda Chanak Flex / el SIS por la URL
  function parseParams(search) {
    var p = new URLSearchParams(search || '');
    var dec = function (v) { try { return v ? decodeURIComponent(v) : v; } catch (e) { return v; } };
    return { token: p.get('token'), studentId: p.get('student_id'), studentName: dec(p.get('student_name')), schoolYear: p.get('school_year'), mode: p.get('mode'), route: p.get('route') };
  }
  // Ruta sugerida por país de la ficha / modalidad (para abrir directamente la ruta correcta)
  function routeForCountry(c) {
    var s = String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    if (['es', 'espana', 'spain'].indexOf(s) >= 0) return 'es';
    if (['us', 'usa', 'estados unidos', 'united states', 'ee.uu.', 'eeuu'].indexOf(s) >= 0) return 'us';
    return s ? 'pa' : null;
  }
  // Levanta datos desde window.EL_DATA con rutas tipo 'us.civics'
  function pick(data, path) { return String(path).split('.').reduce(function (o, k) { return o && o[k]; }, data); }

  var api = { W: W, MASTERY: MASTERY, MONTHS: MONTHS, MONTH_Q: MONTH_Q, QUARTERS: QUARTERS, ROUTES: ROUTES, LEVELS: LEVELS,
    knowledgePts: knowledgePts, levelPts: levelPts, unitScore: unitScore, quarterGrades: quarterGrades, letter: letter,
    unitKey: unitKey, quarterOf: quarterOf, parseParams: parseParams, routeForCountry: routeForCountry, pick: pick };
  root.ELCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
