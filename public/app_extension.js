/* Chanak Extensión Local — RUTAS (España · EE. UU. · Panamá/LatAm), doble modalidad, rúbrica 30/40/30,
   sincronización con el SIS y ficha trimestral imprimible. Depende de el-core.js, data-routes.js y app.js. */
(function () {
  var C = window.ELCore, ST = STATE;
  var P = C.parseParams(location.search);
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var U = store.get('chanak_el_units', {});           // progreso por unidad (clave estable)
  var S = { route: 'es', track: null, level: null, grade: C.gradeNum(P.gradeLevel) != null && C.gradeNum(P.gradeLevel) > 0 ? C.gradeNum(P.gradeLevel) : store.get('chanak_el_grade', null), lang: 'es',
            mode: (P.mode === 'dual' || P.mode === 'homeschool') ? P.mode : store.get('chanak_el_mode', 'homeschool'),
            answers: {}, sheetQ: 'Q1', server: null, busy: false };
  var T = function (es, en) { return S.lang === 'en' ? en : es; };
  var Lb = function (o) { return o ? (o[S.lang] || o.es) : ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };
    var MONTH_NAME = { es: { Oct: 'Octubre', Nov: 'Noviembre', Dic: 'Diciembre', Feb: 'Febrero', Mar: 'Marzo', Abr: 'Abril', May: 'Mayo', Jun: 'Junio', Jul: 'Julio' }, en: { Oct: 'October', Nov: 'November', Dic: 'December', Feb: 'February', Mar: 'March', Abr: 'April', May: 'May', Jun: 'June', Jul: 'July' } };
  var monthName = function (mo) { return (MONTH_NAME[S.lang] || MONTH_NAME.es)[mo] || mo; };
  function save() { store.set('chanak_el_units', U); }
  // Etapa y banda salen del grado (Primaria 1-6 · Secundaria/Bachillerato 7-12). Sin grado: nada secular y banda media (opción prudente).
  var ES_GRADE = { p1: 1, p2: 2, p3: 3, p4: 4, p5: 5, p6: 6, eso1: 7, eso2: 8, eso3: 9, eso4: 10, bach1: 11, bach2: 12 };
  var gradeOf = function (c) { return c && c.esGrade != null ? c.esGrade : S.grade; };
  var stageOfCtx = function (c) { return C.stageOf(gradeOf(c)); };
  var bandOfCtx = function (c) { var g = gradeOf(c); return g ? C.bandOf(g) : 'middle'; };
  var DATA = function () { return window.EL_DATA || {}; };
  var CPS = function () { return window.EL_CHECKPOINTS || {}; };
  var AXES = function () { return window.EL_AXES || {}; };
  var hasToken = function () { return !!(ST && ST.token); };

  /* ---------- Unidades de cada ruta ---------- */
  function trackUnits() {
    var r = C.ROUTES[S.route], t = r && r.tracks.filter(function (x) { return x.id === S.track; })[0];
    if (!t) return [];
    var d = C.pick(DATA(), t.data);
    if (t.levels) d = d && d[S.level];
    return d || [];
  }
  function ctxOf(u) {
    return { key: C.unitKey(S.route, S.track, S.level, u.mo), route: S.route, track: S.track + (S.level ? ':' + S.level : ''), mo: u.mo, quarter: C.quarterOf(u.mo), title: u.title, unit: u };
  }

  /* ---------- Barra de ruta (inicio) ---------- */
  function renderRouteBar() {
    var host = $('route-bar'); if (!host) return;
    var chips = ['es', 'us', 'pa'].map(function (id) {
      var r = C.ROUTES[id];
      return '<button class="rt-chip ' + (S.route === id ? 'on' : '') + '" onclick="elOpenRoute(\'' + id + '\')"><span>' + r.flag + '</span> ' + esc(Lb(r.label)) + '</button>';
    }).join('');
    var m = ['homeschool', 'dual'].map(function (id) { return '<button class="rt-seg ' + (S.mode === id ? 'on' : '') + '" onclick="elSetMode(\'' + id + '\')">' + (id === 'homeschool' ? T('A · Homeschool guiado', 'A · Guided Homeschool') : T('B · Dual Diploma / colegio local', 'B · Dual Diploma / local school')) + '</button>'; }).join('');
    host.innerHTML = '<div class="rt-wrap"><div class="rt-title">' + T('1. Elige tu ruta geográfica', '1. Choose your geographic route') + '</div><div class="rt-row">' + chips + '</div>' +
      '<div class="rt-title" style="margin-top:12px">' + T('2. Modalidad de evaluación', '2. Evaluation mode') + '</div><div class="rt-row">' + m + '</div>' +
      '<div class="rt-row" style="margin-top:10px">' +
      '<button class="btn ghost rt-act" onclick="elOpenSheet()">🖨️ ' + T('Ficha de evaluación trimestral', 'Quarterly evaluation sheet') + '</button>' +
      (S.mode === 'dual' ? '<button class="btn ghost rt-act" onclick="elOpenReports()">📎 ' + T('Boletines del colegio', 'School report cards') + '</button>' : '') +
      (hasToken() ? '<span class="rt-ok">🔗 ' + T('Conectado al SIS', 'Connected to the SIS') + '</span>' : '<span class="rt-warn">' + T('Sin conexión al SIS: las notas se guardan en este dispositivo. Abre el módulo desde el SIS para sincronizar.', 'Not connected to the SIS: grades are kept on this device. Open the module from the SIS to sync.') + '</span>') +
      '</div></div>';
  }
  window.elSetMode = function (m) { S.mode = m; store.set('chanak_el_mode', m); renderRouteBar(); if ($('view-route').classList.contains('active')) renderRoute(); };
  window.elSetLang = function (l) { S.lang = l; renderRouteBar(); renderRoute(); };

  /* ---------- Vista de ruta: pistas y unidades ---------- */
  window.elOpenRoute = function (id) {
    S.route = id; S.lang = C.ROUTES[id].lang;
    if (id === 'es') { S.track = null; S.level = null; renderRouteBar(); showView('home'); return; }
    var r = C.ROUTES[id]; if (r.tracks.length === 1 || !r.tracks.some(function (t) { return t.id === S.track; })) { S.track = null; S.level = null; }
    renderRouteBar(); renderRoute(); showView('route');
  };
  window.elPickTrack = function (tid, lvl) { S.track = tid; var t = C.ROUTES[S.route].tracks.filter(function (x) { return x.id === tid; })[0]; S.level = t.levels ? (lvl || (t.levels[0] && t.levels[0].id)) : null; renderRoute(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  window.elSetGrade = function (g) { S.grade = g ? Number(g) : null; store.set('chanak_el_grade', S.grade); renderRouteBar(); if ($('view-route').classList.contains('active')) renderRoute(); if ($('view-unit').classList.contains('active') && S.cur && S.cur.mo) window.elOpenUnit(S.cur.mo); };
  function gradePicker() {
    var opts = '<option value="">' + T('— elige —', '— choose —') + '</option>';
    for (var g = 1; g <= 12; g++) opts += '<option value="' + g + '" ' + (S.grade === g ? 'selected' : '') + '>' + (S.lang === 'en' ? 'Grade ' + g : g + '.º') + (g <= 6 ? ' · ' + T('Primaria', 'Elementary') : g <= 10 ? ' · ' + T('Secundaria', 'Secondary') : ' · ' + T('Bachillerato', 'High school')) + '</option>';
    return '<label class="el-lbl" style="display:inline-block;margin:0">' + T('Tu grado', 'Your grade') + ' <select onchange="elSetGrade(this.value)" style="display:inline-block;width:auto">' + opts + '</select></label>';
  }

  function renderRoute() {
    var r = C.ROUTES[S.route]; if (!r || S.route === 'es') return;
    var h = '<div class="wrap"><button class="back" onclick="showView(\'home\')">' + T('← Volver al inicio', '← Back to home') + '</button>' +
      '<div class="page-head"><div class="eyebrow">' + r.flag + ' ' + esc(Lb(r.label)) + ' · ' + T('Extensión Local · 20 %', 'Local Extension · 20%') + '</div><h2>' + esc(Lb(r.label)) + '</h2><p>' + esc(Lb(r.desc)) + '</p>' +
      '<div class="rt-row" style="margin-top:10px"><button class="rt-seg ' + (S.lang === 'es' ? 'on' : '') + '" onclick="elSetLang(\'es\')">ES</button><button class="rt-seg ' + (S.lang === 'en' ? 'on' : '') + '" onclick="elSetLang(\'en\')">EN</button></div></div>';
    h += '<div class="grid">' + r.tracks.map(function (t) {
      var on = S.track === t.id;
      var lv = t.levels && on ? '<div class="rt-row" style="margin-top:8px">' + t.levels.map(function (l) { return '<button class="rt-seg ' + (S.level === l.id ? 'on' : '') + '" onclick="event.stopPropagation();elPickTrack(\'' + t.id + '\',\'' + l.id + '\')">' + esc(Lb(l.label)) + '</button>'; }).join('') + '</div>' : '';
      return '<div class="gcard ' + (on ? 'rt-sel' : '') + '" onclick="elPickTrack(\'' + t.id + '\')"><span class="stage-tag primaria">' + t.icon + ' ' + T('Pista', 'Track') + '</span><h4>' + esc(Lb(t.label)) + '</h4>' + lv + '</div>';
    }).join('') + '</div>';
    if (S.track) {
      var units = trackUnits();
      h += '<div class="rt-bands">' + gradePicker() + (S.grade ? '<span class="rt-hint" style="margin:0">' + (C.stageOf(S.grade) === 'primary' ? T('Etapa Primaria: enfoque de la creación y la narrativa providencial.', 'Elementary stage: creation and providential narrative focus.') : T('Etapa Secundaria/Bachillerato: incluye el Checkpoint de Cosmovisión Bíblica.', 'Secondary/High school stage: includes the Biblical Worldview Checkpoint.')) + '</span>' : '') + '</div>';
      h += C.QUARTERS.map(function (q) {
        var us = units.filter(function (u) { return C.quarterOf(u.mo) === q; });
        return '<div class="quarter-block"><div class="quarter-head"><span class="qid">' + q + ' · ' + us.map(function (u) { return monthName(u.mo); }).join(' · ') + '</span></div><div class="grid">' + us.map(function (u) {
          var k = C.unitKey(S.route, S.track, S.level, u.mo), rec = U[k];
          var chip = rec && rec.weighted != null ? '<span class="chip ' + (rec.weighted >= C.MASTERY ? 'done' : 'soon') + '">' + rec.weighted + '/100' + (rec.status === 'approved' ? ' ✓' : '') + '</span>' : '';
          return '<div class="mcard" onclick="elOpenUnit(\'' + u.mo + '\')"><span class="mo">' + monthName(u.mo) + '</span><span class="area-tag">' + esc(u.area) + '</span><h4>' + esc(u.title) + '</h4><div class="foot">' + chip + '<span class="status">' + T('Abrir →', 'Open →') + '</span></div></div>';
        }).join('') + '</div></div>';
      }).join('');
    } else h += '<p class="rt-hint">' + T('Elige una pista para ver sus 9 unidades mensuales.', 'Pick a track to see its 9 monthly units.') + '</p>';
    $('view-route').innerHTML = h + '</div>';
  }

  /* ---------- Vista normalizada de una unidad (rutas nuevas y España) ---------- */
  function viewOfRoute(u, c) {
    var b = bandOfCtx(c);
    return { title: u.title, area: u.area, contents: u.contents, sessions: u.sessions, deliverable: u.deliverable[b], local: u.local, verse: u.verse, ref: u.ref, standards: u.standards || [], rubric: u.rubric || {}, church: u.church_history || null };
  }
  function viewOfEs(m, gid) {
    var b = C.bandOf(ES_GRADE[gid] || 7);
    return { title: m.tema, area: m.area, contents: m.contenidos, sessions: m.sessions, deliverable: m.deliverable, local: m.rubric && m.rubric.l, verse: m.verse, ref: m.ref, standards: (m.codes || []).map(function (x) { return x; }), rubric: m.rubric || {}, church: null, band: b };
  }
  function cpKeyOf(c) { return c.route === 'es' ? c.track + ':' + c.mo : c.key; }
  function cpOf(c) { return stageOfCtx(c) === 'secondary' ? ((c.unit && c.unit.checkpoint) || CPS()[cpKeyOf(c)] || null) : null; }
  function axesOf(c) {
    if (c.route === 'es') { var a = AXES()[c.track]; return a && a[c.mo] || null; }
    if (c.route === 'pa' && c.track === 'lengua') { var a2 = AXES()['pa_' + bandOfCtx(c)]; return a2 && a2[c.mo] || null; }
    return null;
  }

  /* ---------- Tarjetas informativas ---------- */
  function axesCard(a) {
    if (!a) return '';
    return '<div class="lsec el-axes"><h3>🗣️ ' + T('Bloque de Lengua · 4 ejes continuos', 'Language block · 4 continuous axes') + '</h3><ul class="bullets">' +
      '<li><b>' + T('Comunicación oral y retórica', 'Oral communication & rhetoric') + ':</b> ' + esc(a.oral) + '</li>' +
      '<li><b>' + T('Gramática y ortografía', 'Grammar & spelling') + ':</b> ' + esc(a.grammar) + '</li>' +
      '<li><b>' + T('Redacción y estilo', 'Writing & style') + ':</b> ' + esc(a.writing) + '</li>' +
      '<li><b>' + T('Canon literario', 'Literary canon') + ':</b> ' + esc(a.canon.author) + ' — <i>' + esc(a.canon.work) + '</i>. ' + esc(a.canon.focus) + '</li></ul></div>';
  }
  function churchCard(ch) {
    if (!ch) return '';
    return '<div class="lsec el-church"><h3>⛪ ' + T('Historia de la Iglesia iberoamericana', 'Ibero-American Church History') + ': ' + esc(ch.topic) + '</h3><ul class="bullets">' + ch.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><p class="lsub"><b>' + T('Para conversar:', 'Discussion:') + '</b> ' + esc(ch.discussion) + '</p></div>';
  }
  var CRITERIA_LV = ['0', '1', '2', '3', '4'];
  function checkpointCard(c, cp, r) {
    var locked = r.status === 'approved', words = C.wordCount(r.cpEssay), pct = C.checkpointPct(r.cpScores);
    var crit = cp.criteria.map(function (t, i) {
      var v = r.cpScores && r.cpScores[i];
      return '<label class="el-crit"><span>' + esc(t) + '</span><select ' + (locked ? 'disabled' : '') + ' onchange="elCpScore(\'' + c.key + '\',' + i + ',this.value)"><option value="">—</option>' + CRITERIA_LV.map(function (n) { return '<option ' + (String(v) === n ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>';
    }).join('');
    return '<div class="el-cp"><div class="el-cp-h">🛡️ Biblical Worldview Checkpoint <small>· ' + T('Aviso de Cosmovisión Bíblica', 'Biblical Worldview Notice') + '</small></div>' +
      '<div class="el-cp-b"><b>' + T('Lo que sostiene el relato secular', 'What the secular account holds') + '</b><p>' + esc(cp.claim) + '</p></div>' +
      '<div class="el-cp-b truth"><b>' + T('Lo que dice la Revelación', 'What Revelation says') + '</b><p>' + esc(cp.truth) + '</p><div class="codes-row">' + cp.refs.map(function (x) { return '<span class="code-pill">' + esc(x) + '</span>'; }).join('') + '</div></div>' +
      '<div class="el-cp-b q"><b>' + T('Razonamiento crítico', 'Critical reasoning') + '</b><p>' + esc(cp.question) + '</p>' +
      '<textarea class="el-essay" ' + (locked ? 'disabled' : '') + ' placeholder="' + T('Escribe tu ensayo breve (mínimo ' + C.CP_MIN_WORDS + ' palabras)…', 'Write your short essay (minimum ' + C.CP_MIN_WORDS + ' words)…') + '" oninput="elCpEssay(\'' + c.key + '\',this.value)">' + esc(r.cpEssay || '') + '</textarea>' +
      '<div class="el-wc ' + (words >= C.CP_MIN_WORDS ? 'ok' : '') + '">' + words + ' / ' + C.CP_MIN_WORDS + ' ' + T('palabras', 'words') + '</div></div>' +
      '<div class="el-cp-b"><b>' + T('Evaluación del ensayo (0–4 por criterio)', 'Essay assessment (0–4 per criterion)') + '</b>' + crit +
      '<div class="el-pts">' + (pct != null ? T('Checkpoint: ', 'Checkpoint: ') + pct + ' % ' + (pct >= C.MASTERY ? '✅ ' + T('dominio', 'mastery') : '🔁 ' + T('por debajo del 80 %: reescribe y vuelve a evaluar', 'below 80%: rewrite and reassess')) : T('Completa los 5 criterios.', 'Rate all 5 criteria.')) + '</div></div></div>';
  }
  window.elCpEssay = function (key, v) { var r = rec(key); r.cpEssay = v; save(); var el = document.querySelector('.el-wc'); if (el) { var n = C.wordCount(v); el.textContent = n + ' / ' + C.CP_MIN_WORDS + ' ' + T('palabras', 'words'); el.className = 'el-wc ' + (n >= C.CP_MIN_WORDS ? 'ok' : ''); } };
  window.elCpScore = function (key, i, v) { var r = rec(key); r.cpScores = r.cpScores || [null, null, null, null, null]; r.cpScores[i] = v === '' ? null : Number(v); save(); refreshEval(); };

  /* ---------- Unidad (EE. UU. y Panamá/Latinoamérica) ---------- */
  window.elOpenUnit = function (mo) {
    var u = trackUnits().filter(function (x) { return x.mo === mo; })[0]; if (!u) return;
    var c = ctxOf(u); c.view = viewOfRoute(u, c); S.cur = c;
    var track = C.ROUTES[S.route].tracks.filter(function (x) { return x.id === S.track; })[0];
    var v = c.view;
    var h = '<div class="wrap"><button class="back" onclick="elOpenRoute(\'' + S.route + '\')">' + T('← Volver a la pista', '← Back to the track') + '</button><div class="lesson">' + unitBody(c, v, esc(Lb(track.label)) + (S.level ? ' · ' + esc(Lb(track.levels.filter(function (l) { return l.id === S.level; })[0].label)) : '')) + '</div></div>';
    $('view-unit').innerHTML = h; showView('unit');
  };
  function unitBody(c, v, crumb) {
    var gradeBar = '<div class="rt-row" style="margin:0 0 12px">' + gradePicker() + '</div>';
    return gradeBar + '<div class="lhead"><div class="lo-mo">' + crumb + ' · ' + monthName(c.mo) + ' · ' + esc(v.area) + '</div><h2>' + esc(v.title) + '</h2>' +
      (v.verse ? '<div class="lverse">“' + esc(v.verse) + '”<span>' + esc(v.ref) + '</span></div>' : '') + '</div>' +
      '<div class="lsec"><h3>📘 ' + T('Contenidos del mes', 'Contents of the month') + '</h3><ul class="bullets">' + v.contents.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (v.standards.length && c.route !== 'es' ? '<div class="codes-row">' + v.standards.map(function (x) { return '<span class="code-pill">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      axesCard(axesOf(c)) + churchCard(v.church) +
      '<div class="lsec"><h3>🗓️ ' + T('Las 4 sesiones semanales', 'The 4 weekly sessions') + '</h3><div class="week-grid">' + v.sessions.map(function (s, i) { return '<div class="wcard plain"><span class="wk-num">' + T('SEMANA', 'WEEK') + ' ' + (i + 1) + '</span><p>' + esc(s) + '</p></div>'; }).join('') + '</div></div>' +
      '<div class="taskbox"><div class="tb-head"><span class="tb-badge">📦</span><div><h3>' + T('Tu entregable', 'Your deliverable') + '</h3></div></div>' +
      '<div class="tb-block"><h4>✅ ' + T('Qué tienes que producir', 'What you need to produce') + '</h4><div class="tb-produce">' + esc(v.deliverable) + '</div></div>' +
      (v.local && c.route !== 'es' ? '<div class="tb-block"><h4>📍 ' + T('Conexión local', 'Local connection') + '</h4><div class="tb-produce">' + esc(v.local) + '</div></div>' : '') +
      '<div class="rt-row"><button class="btn ghost" onclick="elPrintUnit()">🖨️ ' + T('Descargar / Imprimir Unidad en PDF', 'Download / Print Unit as PDF') + '</button></div></div>' +
      '<div id="el-eval">' + evalCard(c) + '</div>';
  }

  /* ---------- Tarjeta de evaluación (30/40/30 + compuerta de dominio) ---------- */
  var EXEC_GEN = { 3: ['Cumple casi todo el criterio; faltan detalles menores.', 'Meets most of the criterion; minor gaps remain.'], 2: ['Cumple parte del criterio; necesita mejorar para dominar.', 'Meets part of the criterion; needs work to reach mastery.'], 1: ['Primer intento; falta lo esencial. Repasa y vuelve a entregar.', 'First attempt; essentials are missing. Review and resubmit.'] };
  function levelPicker(key, which, r, text4) {
    var cur = r[which === 'e' ? 'execLevel' : which === 'l' ? 'localLevel' : 'knowLevel'];
    return '<div class="el-levels">' + C.LEVELS.map(function (l) {
      var d = l.n === 4 ? text4 : (EXEC_GEN[l.n][S.lang === 'en' ? 1 : 0]);
      return '<label class="el-lv ' + (cur === l.n ? 'on' : '') + '"><input type="radio" name="' + which + key + '" ' + (cur === l.n ? 'checked' : '') + ' onchange="elSetLevel(\'' + key + '\',\'' + which + '\',' + l.n + ')"><b>' + l.n + ' · ' + l[S.lang] + '</b><span>' + esc(d) + '</span></label>';
    }).join('') + '</div>';
  }
  function evalCard(c) {
    var u = c.unit, r = U[c.key] || {}, locked = r.status === 'approved', cp = cpOf(c);
    var hasQuiz = !!(u && u.quiz && u.quiz.length), ans = S.answers[c.key] || [];
    var k = '<div class="el-sec"><div class="el-top"><b>' + T('Conocimiento', 'Knowledge') + '</b><span>30 %</span></div>';
    if (hasQuiz) {
      k += u.quiz.map(function (q, qi) {
        var checked = r.correct != null && r.checked;
        return '<div class="el-q"><p><b>' + (qi + 1) + '.</b> ' + esc(q.q) + '</p>' + q.opts.map(function (o, oi) {
          var sel = ans[qi] === oi, cls = checked ? (o.ok ? 'ok' : (sel ? 'bad' : '')) : (sel ? 'on' : '');
          return '<label class="el-o ' + cls + '"><input type="radio" name="q' + c.key + qi + '" ' + (sel ? 'checked' : '') + ' ' + (locked ? 'disabled' : '') + ' onchange="elAnswer(\'' + c.key + '\',' + qi + ',' + oi + ')"> ' + esc(o.t) + '</label>';
        }).join('') + '</div>';
      }).join('') + '<div class="rt-row"><button class="btn primary" ' + (locked ? 'disabled' : '') + ' onclick="elCheckQuiz(\'' + c.key + '\')">' + T('Calificar cuestionario (checkup de dominio)', 'Score the quiz (mastery checkup)') + '</button>' + (r.checked ? '<span class="el-pts">' + r.correct + '/' + r.total + ' → ' + C.knowledgePts(r.correct, r.total) + ' / 30</span>' : '') + '</div>';
    } else {
      k += '<p class="lsub">' + T('Sin cuestionario: el supervisor valora el conocimiento con la rúbrica.', 'No quiz: the supervisor rates knowledge with the rubric.') + '</p>' + levelPicker(c.key, 'k', r, (c.view.rubric && c.view.rubric.c) || '');
    }
    k += '</div>';
    var rb = c.view.rubric || {};
    var e = '<div class="el-sec"><div class="el-top"><b>' + T('Ejecución', 'Execution') + '</b><span>40 %</span></div>' + levelPicker(c.key, 'e', r, rb.e || '') + '</div>';
    var l = '<div class="el-sec"><div class="el-top"><b>' + T('Conexión local y fe', 'Local connection & faith') + '</b><span>30 %</span></div>' + levelPicker(c.key, 'l', r, rb.l || '') + '</div>';
    var cpPct = cp ? C.checkpointPct(r.cpScores) : null;
    var mastery = r.weighted != null && C.unitMastery(r.weighted, !!cp, cpPct);
    var res = r.weighted != null ? '<div class="el-result ' + (mastery ? 'ok' : 'warn') + '"><div class="el-big">' + r.weighted + '<small>/100 · ' + C.letter(r.weighted) + '</small></div><div>' +
      (mastery ? '🏅 ' + T('Dominio alcanzado (≥ ' + C.MASTERY + ').', 'Mastery reached (≥ ' + C.MASTERY + ').')
        : (r.weighted >= C.MASTERY && cp ? '🛡️ ' + T('La nota llega a 80, pero falta el dominio del Checkpoint de Cosmovisión (≥ 80 %).', 'The grade reaches 80, but the Worldview Checkpoint mastery (≥ 80%) is still missing.') : '🔁 ' + T('Todavía no hay dominio (se pide ≥ ' + C.MASTERY + '): repasa, mejora el entregable y vuelve a evaluar.', 'Mastery not reached yet (≥ ' + C.MASTERY + ' required): review, improve the deliverable, and reassess.'))) +
      '<br><small>' + T('Conocimiento', 'Knowledge') + ' ' + r.k + ' · ' + T('Ejecución', 'Execution') + ' ' + r.e + ' · ' + T('Conexión', 'Connection') + ' ' + r.l + (cp && cpPct != null ? ' · Checkpoint ' + cpPct + ' %' : '') + '</small></div></div>' : '';
    var st = r.status === 'approved' ? '<span class="chip done">' + T('Aprobada por el personal', 'Approved by staff') + '</span>' : r.synced ? '<span class="chip soon">' + T('Enviada al SIS · pendiente de revisión', 'Sent to the SIS · pending review') + '</span>' : '';
    return '<div class="taskbox"><div class="tb-head"><span class="tb-badge">📊</span><div><h3>' + T('Evaluación oficial Chanak · 30 / 40 / 30', 'Official Chanak evaluation · 30 / 40 / 30') + '</h3><p>' + T('Conocimiento 30 % + Ejecución 40 % + Conexión local y fe 30 % = 100 puntos.', 'Knowledge 30% + Execution 40% + Local connection & faith 30% = 100 points.') + '</p></div></div>' +
      k + e + l + (cp ? '<div class="el-sec">' + checkpointCard(c, cp, r) + '</div>' : '') +
      '<div class="el-sec"><label class="el-lbl">' + T('¿Quién evalúa?', 'Who is assessing?') + ' <select onchange="elSetBy(\'' + c.key + '\',this.value)" ' + (locked ? 'disabled' : '') + '><option value="self" ' + (r.by !== 'supervisor' ? 'selected' : '') + '>' + T('Estudiante (autoevaluación)', 'Student (self-assessment)') + '</option><option value="supervisor" ' + (r.by === 'supervisor' ? 'selected' : '') + '>' + T('Supervisor / mentor', 'Supervisor / mentor') + '</option></select></label>' +
      '<label class="el-lbl">' + T('Notas (opcional)', 'Notes (optional)') + '<textarea onchange="elSetNotes(\'' + c.key + '\',this.value)" ' + (locked ? 'disabled' : '') + ' placeholder="' + T('Enlace a la evidencia, comentarios…', 'Link to evidence, comments…') + '">' + esc(r.notes || '') + '</textarea></label></div>' +
      res + '<div class="rt-row">' + st + '<button class="btn primary" ' + (locked ? 'disabled' : '') + ' onclick="elSubmit(\'' + c.key + '\')">' + T('Calcular y enviar al SIS', 'Calculate & send to the SIS') + '</button></div></div>';
  }
  function refreshEval() { var h = $('el-eval'); if (h && S.cur) h.innerHTML = evalCard(S.cur); }
  function rec(key) { if (!U[key]) U[key] = { route: S.cur.route, track: S.cur.track, quarter: S.cur.quarter, title: S.cur.title, mo: S.cur.mo }; U[key].grade = gradeOf(S.cur); return U[key]; }
  window.elAnswer = function (key, qi, oi) { (S.answers[key] = S.answers[key] || [])[qi] = oi; rec(key).checked = false; refreshEval(); };
  window.elCheckQuiz = function (key) {
    var qs = S.cur.unit.quiz, a = S.answers[key] || [];
    if (a.filter(function (x) { return x != null; }).length < qs.length) { alert(T('Responde las ' + qs.length + ' preguntas primero.', 'Answer all ' + qs.length + ' questions first.')); return; }
    var ok = qs.reduce(function (n, q, i) { return n + (q.opts[a[i]] && q.opts[a[i]].ok ? 1 : 0); }, 0), r = rec(key);
    if (r.correct == null || ok >= r.correct) r.correct = ok;     // Mastery Learning: se conserva el mejor intento
    r.total = qs.length; r.checked = true; compute(r); save(); refreshEval();
  };
  window.elSetLevel = function (key, which, n) { var r = rec(key); r[which === 'e' ? 'execLevel' : which === 'l' ? 'localLevel' : 'knowLevel'] = n; if (which === 'k') { r.correct = n; r.total = 4; r.checked = true; } compute(r); save(); refreshEval(); };
  window.elSetBy = function (key, v) { rec(key).by = v; save(); };
  window.elSetNotes = function (key, v) { rec(key).notes = v; save(); };
  function compute(r) {
    if (r.correct == null || !r.execLevel || !r.localLevel) { r.weighted = null; return; }
    var s = C.unitScore({ correct: r.correct, total: r.total || 5, execLevel: r.execLevel, localLevel: r.localLevel });
    r.k = s.k; r.e = s.e; r.l = s.l; r.weighted = s.weighted;
  }
  window.elSubmit = async function (key) {
    var r = rec(key); compute(r); var cp = cpOf(S.cur);
    if (r.weighted == null) { alert(T('Falta completar el cuestionario/conocimiento, la ejecución y la conexión local.', 'Complete knowledge, execution and local connection first.')); return; }
    if (cp && (C.wordCount(r.cpEssay) < C.CP_MIN_WORDS || C.checkpointPct(r.cpScores) == null)) { alert(T('Completa el Checkpoint de Cosmovisión Bíblica: ensayo de al menos ' + C.CP_MIN_WORDS + ' palabras y los 5 criterios.', 'Complete the Biblical Worldview Checkpoint: an essay of at least ' + C.CP_MIN_WORDS + ' words and all 5 criteria.')); return; }
    r.cp = !!cp; r.synced = false; save(); refreshEval();
    if (!hasToken()) { alert(T('Guardado en este dispositivo' + (S.demo ? ' (modo demostración)' : '') + '. Para enviarlo al SIS abre el módulo desde tu perfil del SIS.', 'Saved on this device' + (S.demo ? ' (demo mode)' : '') + '. To send it to the SIS, open the module from your SIS profile.')); return; }
    var res = await syncUnit(key);
    if (!res.ok) alert(T('No se pudo enviar al SIS: ', 'Could not send to the SIS: ') + res.error);
    refreshEval(); if (typeof showCoinToast === 'function' && res.ok) showCoinToast(T('Nota enviada al SIS · pendiente de revisión', 'Grade sent to the SIS · pending review'));
  };
  async function syncUnit(key) {
    var r = U[key];
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/submit_extension_local_grade', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
        body: JSON.stringify({ p_token: ST.token, p_route: r.route, p_track: r.track, p_unit_key: key, p_unit_title: r.title, p_quarter: r.quarter, p_quiz_correct: r.correct, p_quiz_total: r.total || 5, p_execution_level: r.execLevel, p_local_level: r.localLevel,
          p_assessed_by: r.by === 'supervisor' ? 'supervisor' : 'self', p_notes: r.notes || null, p_grade_level: r.grade != null ? String(r.grade) : null, p_checkpoint_required: !!r.cp, p_checkpoint_scores: r.cp ? r.cpScores : null, p_checkpoint_essay: r.cp ? r.cpEssay : null }) });
      var j = await res.json();
      if (j && j.success) { r.synced = true; r.status = j.status === 'approved' ? 'approved' : 'pending_review'; save(); return { ok: true }; }
      return { ok: false, error: (j && (j.error || j.message)) || res.status };
    } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }
  async function hydrate() {
    if (!hasToken()) return;
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_extension_local_summary', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }, body: JSON.stringify({ p_token: ST.token }) });
      var j = await res.json(); if (!j || !j.success) return; S.server = j;
      (j.units || []).forEach(function (u) { var r = U[u.unit_key]; if (r) { r.status = u.status; r.synced = true; } });
      save();
    } catch (e) { /* sin red: se sigue con lo local */ }
  }

  /* ---------- España: evaluación, ejes de lengua y checkpoint dentro de la lección existente ---------- */
  var _openLesson = window.openLesson;
  window.openLesson = function (gid, mo) {
    _openLesson(gid, mo); S.route = 'es'; S.lang = 'es';
    var g = EL_GRADES.filter(function (x) { return x.id === gid; })[0], m = g && g.months.filter(function (x) { return x.mo === mo; })[0];
    if (!m) return;
    var c = { key: C.unitKey('es', gid, null, mo), route: 'es', track: gid, mo: mo, quarter: C.quarterOf(mo), title: m.tema, unit: { rubric: m.rubric }, esGrade: ES_GRADE[gid], view: viewOfEs(m, gid) };
    S.cur = c;
    var body = $('lesson-body'); if (!body) return;
    var host = document.createElement('div'); host.id = 'el-extra';
    host.innerHTML = axesCard(axesOf(c)) + '<div class="rt-row" style="margin:12px 0"><button class="btn ghost" onclick="elPrintUnit()">🖨️ Descargar / Imprimir Unidad en PDF</button></div><div id="el-eval">' + evalCard(c) + '</div>';
    body.appendChild(host);
  };

  /* ---------- Modalidad B: boletines del colegio presencial ---------- */
  window.elOpenReports = function () { renderReports(); showView('reports'); };
  function renderReports(msg) {
    var rows = ((S.server && S.server.reports) || []).map(function (r) { return '<tr><td>' + esc(r.quarter) + '</td><td>' + esc(r.school_name || '—') + '</td><td>' + (r.school_grade != null ? esc(r.school_grade) + '/100' : '—') + '</td><td>' + esc(r.file_name || '') + '</td><td>' + esc(r.status) + '</td></tr>'; }).join('');
    $('view-reports').innerHTML = '<div class="wrap"><button class="back" onclick="showView(\'home\')">' + T('← Volver al inicio', '← Back to home') + '</button><div class="page-head"><div class="eyebrow">B · Dual Diploma / ' + T('colegio local', 'local school') + '</div><h2>' + T('Boletines trimestrales del colegio', 'Quarterly school report cards') + '</h2><p>' + T('Sube el boletín de cada trimestre (PDF, JPG, PNG o WebP, máx. 4 MB). Se guarda en la carpeta del SIS «03 Extensión Local» del estudiante.', 'Upload each quarter’s report card (PDF, JPG, PNG or WebP, max 4 MB). It is stored in the student’s SIS folder “03 Extensión Local”.') + '</p></div>' +
      (hasToken() ? '' : '<div class="rt-warn" style="margin:10px 0">' + T('Abre este módulo desde el SIS para poder subir boletines.', 'Open this module from the SIS to upload report cards.') + '</div>') +
      '<div class="taskbox"><div class="el-sec"><label class="el-lbl">' + T('Trimestre', 'Quarter') + ' <select id="rp-q"><option>Q1</option><option>Q2</option><option>Q3</option></select></label>' +
      '<label class="el-lbl">' + T('Colegio', 'School') + ' <input id="rp-school" type="text" maxlength="120"></label>' +
      '<label class="el-lbl">' + T('Nota del colegio (0–100, opcional)', 'School grade (0–100, optional)') + ' <input id="rp-grade" type="number" min="0" max="100" step="0.1"></label>' +
      '<label class="el-lbl">' + T('Archivo del boletín', 'Report card file') + ' <input id="rp-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label></div>' +
      '<div class="rt-row"><button class="btn primary" ' + (hasToken() ? '' : 'disabled') + ' onclick="elUploadReport()">' + T('Subir boletín', 'Upload report card') + '</button><span id="rp-msg" class="rt-hint">' + esc(msg || '') + '</span></div></div>' +
      '<div class="section-label"><h3>' + T('Boletines enviados', 'Uploaded report cards') + '</h3></div>' + (rows ? '<table class="el-tbl"><tr><th>' + T('Trim.', 'Qtr') + '</th><th>' + T('Colegio', 'School') + '</th><th>' + T('Nota', 'Grade') + '</th><th>' + T('Archivo', 'File') + '</th><th>' + T('Estado', 'Status') + '</th></tr>' + rows + '</table>' : '<p class="rt-hint">' + T('Aún no hay boletines.', 'No report cards yet.') + '</p>') + '</div>';
  }
  window.elUploadReport = async function () {
    var f = $('rp-file').files[0], msg = function (t) { $('rp-msg').textContent = t; };
    if (!f) return msg(T('Elige un archivo.', 'Choose a file.'));
    if (f.size > 4 * 1024 * 1024) return msg(T('El archivo supera 4 MB.', 'The file is larger than 4 MB.'));
    msg(T('Subiendo…', 'Uploading…'));
    try {
      var res = await fetch('/api/upload-report', { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream', 'x-el-token': ST.token, 'x-el-quarter': $('rp-q').value, 'x-el-school': encodeURIComponent($('rp-school').value || ''), 'x-el-grade': $('rp-grade').value || '', 'x-el-filename': encodeURIComponent(f.name) }, body: f });
      var j = await res.json().catch(function () { return {}; });
      if (!res.ok || !j.ok) return msg((j && j.error) || T('No se pudo subir.', 'Upload failed.'));
      await hydrate(); renderReports(T('Boletín recibido ✓', 'Report card received ✓'));
    } catch (e) { msg(T('Sin conexión. Inténtalo de nuevo.', 'No connection. Try again.')); }
  };

  /* ---------- Unidad imprimible (A4 vertical): membrete, datos, rúbrica 30/40/30, renglones y firmas ---------- */
  var lines = function (n, h) { var o = ''; for (var i = 0; i < n; i++) o += '<div class="pu-line"' + (h ? ' style="height:' + h + 'px"' : '') + '></div>'; return o; };
  function unitPrintHtml(c) {
    var v = c.view, g = gradeOf(c), cp = cpOf(c), rb = v.rubric || {}, r = U[c.key] || {};
    var routeName = { es: 'España · LOMLOE', us: 'United States', pa: 'Panamá / Latinoamérica' }[c.route] || c.route;
    var rubricRows = [['Conocimiento / Knowledge', '30 %', rb.c], ['Ejecución / Execution', '40 %', rb.e], ['Conexión local y fe / Local connection & faith', '30 %', rb.l]].map(function (x) {
      return '<tr><td><b>' + x[0] + '</b><br>' + x[1] + '</td><td>' + esc(x[2] || '') + '</td><td class="pu-box">☐4 ☐3 ☐2 ☐1</td><td class="pu-pts">/ ' + x[1].replace(' %', '') + '</td></tr>';
    }).join('');
    var ax = axesOf(c), church = v.church;
    return '<div class="pu-head"><div class="pu-crest">C</div><div><b>Chanak International Academy · FLDOE #134620</b><br><small>MSA Candidacy · Extensión Local (20 %) · Local Extension</small></div></div>' +
      '<table class="ps-meta"><tr><td>Estudiante / Student</td><td>' + esc(ST.studentName || '________________________') + '</td><td>ID SIS</td><td>' + esc(ST.studentId ? String(ST.studentId).slice(0, 8) : '________') + '</td></tr>' +
      '<tr><td>Grado / Grade</td><td>' + (g ? g + (g <= 6 ? ' · Primaria / Elementary' : ' · Secundaria-Bachillerato / Secondary') : '______') + '</td><td>Año escolar / Year</td><td>' + esc(ST.schoolYear || '2026-2027') + '</td></tr>' +
      '<tr><td>Ruta / Route</td><td>' + esc(routeName) + '</td><td>Trimestre / Quarter</td><td>' + c.quarter + ' · ' + monthName(c.mo) + '</td></tr></table>' +
      '<h2 class="pu-title">' + esc(v.title) + '</h2><p class="pu-sub">' + esc(v.area) + (v.verse ? ' · “' + esc(v.verse) + '” ' + esc(v.ref) : '') + '</p>' +
      '<h4>' + T('Contenidos', 'Contents') + '</h4><ul>' + v.contents.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (ax ? '<h4>Lengua · 4 ejes</h4><ul><li>' + esc(ax.oral) + '</li><li>' + esc(ax.grammar) + '</li><li>' + esc(ax.writing) + '</li><li>' + esc(ax.canon.author) + ' — ' + esc(ax.canon.work) + ': ' + esc(ax.canon.focus) + '</li></ul>' : '') +
      (church ? '<h4>' + esc(church.topic) + '</h4><ul>' + church.facts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<h4>' + T('Sesiones semanales', 'Weekly sessions') + '</h4><ol>' + v.sessions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<h4>' + T('Entregable', 'Deliverable') + '</h4><p>' + esc(v.deliverable) + '</p>' + (v.local && c.route !== 'es' ? '<p><b>' + T('Conexión local', 'Local connection') + ':</b> ' + esc(v.local) + '</p>' : '') +
      '<h4>' + T('Espacio de escritura a mano', 'Handwriting space') + '</h4>' + lines(g && g <= 3 ? 9 : 12, g && g <= 3 ? 34 : 0) +
      (cp ? '<div class="pu-cp"><h4>🛡️ Biblical Worldview Checkpoint</h4><p><b>' + T('Relato secular', 'Secular account') + ':</b> ' + esc(cp.claim) + '</p><p><b>' + T('Revelación', 'Revelation') + ':</b> ' + esc(cp.truth) + ' <i>(' + cp.refs.map(esc).join('; ') + ')</i></p><p><b>' + T('Pregunta', 'Question') + ':</b> ' + esc(cp.question) + '</p>' + lines(10) + '<p class="ps-note">' + T('Ensayo de ' + C.CP_MIN_WORDS + '–200 palabras. Dominio ≥ 80 % en los 5 criterios (0–4): ', 'Essay of ' + C.CP_MIN_WORDS + '–200 words. Mastery ≥ 80% across 5 criteria (0–4): ') + cp.criteria.map(esc).join(' · ') + '</p></div>' : '') +
      '<h4>' + T('Rúbrica de evaluación Chanak · 30 / 40 / 30 (nivel 4 = excelente)', 'Chanak evaluation rubric · 30 / 40 / 30 (level 4 = excellent)') + '</h4><table class="el-tbl"><tr><th>' + T('Criterio', 'Criterion') + '</th><th>' + T('Nivel 4 (excelente)', 'Level 4 (excellent)') + '</th><th>' + T('Nivel', 'Level') + '</th><th>' + T('Puntos', 'Points') + '</th></tr>' + rubricRows + '</table>' +
      '<p class="ps-sum"><b>' + T('Total', 'Total') + ': ______ / 100</b> · ' + T('Dominio (Mastery) ≥ 80', 'Mastery ≥ 80') + (r.weighted != null ? ' · ' + T('Calculado en la app', 'App-calculated') + ': ' + r.weighted : '') + '</p>' +
      '<div class="ps-sign"><div>' + T('Estudiante', 'Student') + '<hr></div><div>' + T('Validación familiar (padre/madre o tutor)', 'Family validation (parent or guardian)') + '<hr></div><div>' + T('Supervisor / Coordinación académica', 'Supervisor / Academic coordination') + '<hr></div></div><p class="ps-foot">' + T('Fecha', 'Date') + ': ____ / ____ / ________</p>';
  }
  window.elPrintUnit = function () {
    if (!S.cur) return; if (!S.cur.view) return;
    $('print-sheet').innerHTML = unitPrintHtml(S.cur); document.body.classList.add('print-unit');
    var done = function () { document.body.classList.remove('print-unit'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print();
  };

  /* ---------- Ficha de evaluación trimestral (imprimible) ---------- */
  window.elOpenSheet = function () { renderSheet(); showView('sheet'); };
  window.elSheetQ = function (q) { S.sheetQ = q; renderSheet(); };
  function sheetRows(q) {
    var rows = []; Object.keys(U).forEach(function (k) { var r = U[k]; if (r.quarter === q && r.weighted != null) rows.push({ key: k, r: r }); });
    rows.sort(function (a, b) { return a.key < b.key ? -1 : 1; }); return rows;
  }
  function renderSheet() {
    var q = S.sheetQ, rows = sheetRows(q), g = C.quarterGrades(rows.map(function (x) { return { quarter: x.r.quarter, weighted: x.r.weighted }; }));
    var rlabel = { es: 'España · LOMLOE', us: 'United States', pa: 'Panamá / Latinoamérica' };
    var tr = rows.map(function (x) { var r = x.r; return '<tr><td>' + esc(rlabel[r.route] || r.route) + '</td><td>' + esc(r.title || x.key) + '</td><td>' + r.k + '</td><td>' + r.e + '</td><td>' + r.l + '</td><td><b>' + r.weighted + '</b></td><td>' + (r.status === 'approved' ? 'Approved' : r.synced ? 'Pending review' : 'Local') + '</td></tr>'; }).join('');
    var reps = ((S.server && S.server.reports) || []).filter(function (r) { return r.quarter === q; });
    var sheet = '<div class="ps-head"><div><b>Chanak International Academy</b><br><small>FLDOE #134620 · MSA Candidacy</small></div><div style="text-align:right"><b>Extensión Local (20 %) · Local Extension</b><br><small>Ficha de evaluación trimestral / Quarterly evaluation sheet</small></div></div>' +
      '<table class="ps-meta"><tr><td>Estudiante / Student</td><td>' + esc(ST.studentName || '________________________') + '</td><td>ID SIS</td><td>' + esc(ST.studentId ? String(ST.studentId).slice(0, 8) : '________') + '</td></tr>' +
      '<tr><td>Año escolar / School year</td><td>' + esc(ST.schoolYear || '2026-2027') + '</td><td>Trimestre / Quarter</td><td>' + q + '</td></tr>' +
      '<tr><td>Modalidad / Mode</td><td colspan="3">' + (S.mode === 'dual' ? 'B · Dual Diploma / colegio local' : 'A · Homeschool guiado / Guided Homeschool') + '</td></tr></table>' +
      '<table class="el-tbl"><tr><th>Ruta / Route</th><th>Unidad / Unit</th><th>Conocimiento<br>Knowledge /30</th><th>Ejecución<br>Execution /40</th><th>Conexión local y fe<br>Local &amp; faith /30</th><th>Total /100</th><th>Estado / Status</th></tr>' + (tr || '<tr><td colspan="7" style="text-align:center">— Sin unidades evaluadas / No assessed units —</td></tr>') + '</table>' +
      '<p class="ps-sum"><b>Promedio del trimestre / Quarter average:</b> ' + (g[q].grade != null ? g[q].grade + ' / 100 (' + C.letter(g[q].grade) + ')' : '—') + ' · <b>Mastery ≥ ' + C.MASTERY + '</b> · Este promedio es el 20 % del modelo 60/20/20 / This average is the 20% of the 60/20/20 model.</p>' +
      (S.mode === 'dual' ? '<p class="ps-sum"><b>Boletines del colegio / School report cards:</b> ' + (reps.length ? reps.map(function (r) { return esc(r.school_name || '—') + (r.school_grade != null ? ' (' + esc(r.school_grade) + '/100)' : '') + ' — ' + esc(r.file_name || ''); }).join('; ') : 'ninguno recibido / none received') + '</p>' : '') +
      '<p class="ps-note">Rúbrica Chanak: Conocimiento 30 % · Ejecución 40 % · Conexión local y fe 30 %. Niveles 1–4 (4 = excelente). Las notas «Pending review» no son oficiales hasta su aprobación en el SIS. / Chanak rubric: Knowledge 30% · Execution 40% · Local connection &amp; faith 30%. Levels 1–4 (4 = excellent). “Pending review” grades are not official until approved in the SIS.</p>' +
      '<div class="ps-sign"><div>Estudiante / Student<hr></div><div>Supervisor o padre / Supervisor or parent<hr></div><div>Coordinación académica / Academic coordination<hr></div></div><p class="ps-foot">Fecha / Date: ____ / ____ / ________</p>';
    $('print-sheet').innerHTML = sheet;
    $('view-sheet').innerHTML = '<div class="wrap"><button class="back" onclick="showView(\'home\')">' + T('← Volver al inicio', '← Back to home') + '</button><div class="page-head"><h2>' + T('Ficha de evaluación trimestral', 'Quarterly evaluation sheet') + '</h2><p>' + T('Formato formal para auditorías académicas. Elige el trimestre e imprime o guarda en PDF.', 'Formal format for academic audits. Choose the quarter and print or save as PDF.') + '</p></div>' +
      '<div class="rt-row">' + C.QUARTERS.map(function (x) { return '<button class="rt-seg ' + (q === x ? 'on' : '') + '" onclick="elSheetQ(\'' + x + '\')">' + x + '</button>'; }).join('') + '<button class="btn primary" onclick="window.print()">🖨️ ' + T('Imprimir / guardar PDF', 'Print / save as PDF') + '</button></div>' +
      '<div class="ps-preview">' + sheet + '</div></div>';
  }

  /* ---------- Modo demostración (sin token): muestra Primaria y Secundaria con Checkpoint ---------- */
  S.demo = !hasToken();
  function demoBanner() {
    var host = $('demo-banner'); if (!host) return;
    if (hasToken()) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="rt-warn el-demo"><b>' + T('Modo demostración', 'Demo mode') + '</b> · ' + T('sin token del SIS: todo funciona y se guarda solo en este dispositivo.', 'no SIS token: everything works and is stored only on this device.') +
      ' <button class="rt-seg" onclick="elDemo(\'primary\')">' + T('Muestra Primaria (4.º)', 'Elementary sample (4th)') + '</button> <button class="rt-seg" onclick="elDemo(\'secondary\')">' + T('Muestra Secundaria (con Checkpoint)', 'Secondary sample (with Checkpoint)') + '</button></div>';
  }
  window.elDemo = function (kind) {
    if (kind === 'primary') { S.grade = 4; openGrade('p4'); openLesson('p4', 'Oct'); }
    else { S.grade = 7; openGrade('eso1'); openLesson('eso1', 'Oct'); }
    store.set('chanak_el_grade', S.grade);
  };

  /* ---------- Arranque ---------- */
  var _renderHome = window.renderHome;
  window.renderHome = function () { _renderHome(); renderRouteBar(); demoBanner(); };
  window.addEventListener('DOMContentLoaded', function () {
    S.demo = !hasToken(); renderRouteBar(); demoBanner(); hydrate();
    // país de la ficha o ?route= abre la ruta correspondiente; ?grade_level= fija etapa y banda
    var want = (P.route && C.ROUTES[P.route]) ? P.route : C.routeForCountry(P.country);
    if (want && want !== 'es') window.elOpenRoute(want);
  });
  window.ELUI = { S: S, U: U, T: T };
})();
