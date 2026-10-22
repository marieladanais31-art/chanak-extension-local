/* Chanak Extensión Local — RUTAS (España · EE. UU. · Panamá/LatAm), doble modalidad, rúbrica 30/40/30,
   sincronización con el SIS y ficha trimestral imprimible. Depende de el-core.js, data-routes.js y app.js. */
(function () {
  var C = window.ELCore, ST = STATE;
  var P = C.parseParams(location.search);
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var U = store.get('chanak_el_units', {});           // progreso por unidad (clave estable)
  var S = { route: 'es', track: null, level: null, band: store.get('chanak_el_band', 'middle'), lang: 'es',
            mode: (P.mode === 'dual' || P.mode === 'homeschool') ? P.mode : store.get('chanak_el_mode', 'homeschool'),
            answers: {}, sheetQ: 'Q1', server: null, busy: false };
  var T = function (es, en) { return S.lang === 'en' ? en : es; };
  var Lb = function (o) { return o ? (o[S.lang] || o.es) : ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };
  var BANDS = [{ id: 'elem', es: 'Primaria · grados 1–5', en: 'Elementary · grades 1–5' }, { id: 'middle', es: 'Secundaria baja · grados 6–8', en: 'Middle · grades 6–8' }, { id: 'high', es: 'Secundaria alta · grados 9–12', en: 'High · grades 9–12' }];
  var MONTH_NAME = { es: { Oct: 'Octubre', Nov: 'Noviembre', Dic: 'Diciembre', Feb: 'Febrero', Mar: 'Marzo', Abr: 'Abril', May: 'Mayo', Jun: 'Junio', Jul: 'Julio' }, en: { Oct: 'October', Nov: 'November', Dic: 'December', Feb: 'February', Mar: 'March', Abr: 'April', May: 'May', Jun: 'June', Jul: 'July' } };
  var monthName = function (mo) { return (MONTH_NAME[S.lang] || MONTH_NAME.es)[mo] || mo; };
  function save() { store.set('chanak_el_units', U); }
  var hasToken = function () { return !!(ST && ST.token); };

  /* ---------- Unidades de cada ruta ---------- */
  function trackUnits() {
    var r = C.ROUTES[S.route], t = r && r.tracks.filter(function (x) { return x.id === S.track; })[0];
    if (!t) return [];
    var d = C.pick(window.EL_DATA || {}, t.data);
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
  window.elPickBand = function (b) { S.band = b; store.set('chanak_el_band', b); renderRoute(); };

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
      h += '<div class="rt-bands"><b>' + T('Tu banda de entregables:', 'Your deliverable band:') + '</b> ' + BANDS.map(function (b) { return '<button class="rt-seg ' + (S.band === b.id ? 'on' : '') + '" onclick="elPickBand(\'' + b.id + '\')">' + esc(b[S.lang]) + '</button>'; }).join('') + '</div>';
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

  /* ---------- Unidad ---------- */
  window.elOpenUnit = function (mo) {
    var u = trackUnits().filter(function (x) { return x.mo === mo; })[0]; if (!u) return;
    var c = ctxOf(u);
    var track = C.ROUTES[S.route].tracks.filter(function (x) { return x.id === S.track; })[0];
    var h = '<div class="wrap"><button class="back" onclick="elOpenRoute(\'' + S.route + '\')">' + T('← Volver a la pista', '← Back to the track') + '</button><div class="lesson">' +
      '<div class="lhead"><div class="lo-mo">' + esc(Lb(track.label)) + (S.level ? ' · ' + esc(Lb(track.levels.filter(function (l) { return l.id === S.level; })[0].label)) : '') + ' · ' + monthName(mo) + ' · ' + esc(u.area) + '</div><h2>' + esc(u.title) + '</h2>' +
      '<div class="lverse">“' + esc(u.verse) + '”<span>' + esc(u.ref) + '</span></div></div>' +
      '<div class="lsec"><h3>📘 ' + T('Contenidos del mes', 'Contents of the month') + '</h3><ul class="bullets">' + u.contents.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<div class="codes-row">' + u.standards.map(function (x) { return '<span class="code-pill">' + esc(x) + '</span>'; }).join('') + '</div></div>' +
      '<div class="lsec"><h3>🗓️ ' + T('Las 4 sesiones semanales', 'The 4 weekly sessions') + '</h3><div class="week-grid">' + u.sessions.map(function (s, i) { return '<div class="wcard plain"><span class="wk-num">' + T('SEMANA', 'WEEK') + ' ' + (i + 1) + '</span><p>' + esc(s) + '</p></div>'; }).join('') + '</div></div>' +
      '<div class="taskbox"><div class="tb-head"><span class="tb-badge">📦</span><div><h3>' + T('Tu entregable', 'Your deliverable') + '</h3><div class="rt-row">' + BANDS.map(function (b) { return '<button class="rt-seg ' + (S.band === b.id ? 'on' : '') + '" onclick="elPickBand(\'' + b.id + '\');elOpenUnit(\'' + mo + '\')">' + esc(b[S.lang]) + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="tb-block"><h4>✅ ' + T('Qué tienes que producir', 'What you need to produce') + '</h4><div class="tb-produce">' + esc(u.deliverable[S.band]) + '</div></div>' +
      '<div class="tb-block"><h4>📍 ' + T('Conexión local', 'Local connection') + '</h4><div class="tb-produce">' + esc(u.local) + '</div></div></div>' +
      '<div id="el-eval">' + evalCard(c) + '</div></div></div>';
    $('view-unit').innerHTML = h; S.cur = c; showView('unit');
  };

  /* ---------- Tarjeta de evaluación (30/40/30) ---------- */
  var EXEC_GEN = { 3: ['Cumple casi todo el criterio; faltan detalles menores.', 'Meets most of the criterion; minor gaps remain.'], 2: ['Cumple parte del criterio; necesita mejorar para dominar.', 'Meets part of the criterion; needs work to reach mastery.'], 1: ['Primer intento; falta lo esencial. Repasa y vuelve a entregar.', 'First attempt; essentials are missing. Review and resubmit.'] };
  function levelPicker(key, which, rec, text4) {
    var cur = rec[which === 'e' ? 'execLevel' : which === 'l' ? 'localLevel' : 'knowLevel'];
    return '<div class="el-levels">' + C.LEVELS.map(function (l) {
      var d = l.n === 4 ? text4 : (EXEC_GEN[l.n][S.lang === 'en' ? 1 : 0]);
      return '<label class="el-lv ' + (cur === l.n ? 'on' : '') + '"><input type="radio" name="' + which + key + '" ' + (cur === l.n ? 'checked' : '') + ' onchange="elSetLevel(\'' + key + '\',\'' + which + '\',' + l.n + ')"><b>' + l.n + ' · ' + l[S.lang] + '</b><span>' + esc(d) + '</span></label>';
    }).join('') + '</div>';
  }
  function evalCard(c) {
    var u = c.unit, rec = U[c.key] || {}, locked = rec.status === 'approved';
    var hasQuiz = !!(u.quiz && u.quiz.length), ans = S.answers[c.key] || [];
    var k = '<div class="el-sec"><div class="el-top"><b>' + T('Conocimiento', 'Knowledge') + '</b><span>30 %</span></div>';
    if (hasQuiz) {
      k += u.quiz.map(function (q, qi) {
        var checked = rec.correct != null && rec.checked;
        return '<div class="el-q"><p><b>' + (qi + 1) + '.</b> ' + esc(q.q) + '</p>' + q.opts.map(function (o, oi) {
          var sel = ans[qi] === oi, cls = checked ? (o.ok ? 'ok' : (sel ? 'bad' : '')) : (sel ? 'on' : '');
          return '<label class="el-o ' + cls + '"><input type="radio" name="q' + c.key + qi + '" ' + (sel ? 'checked' : '') + ' ' + (locked ? 'disabled' : '') + ' onchange="elAnswer(\'' + c.key + '\',' + qi + ',' + oi + ')"> ' + esc(o.t) + '</label>';
        }).join('') + '</div>';
      }).join('') + '<div class="rt-row"><button class="btn primary" ' + (locked ? 'disabled' : '') + ' onclick="elCheckQuiz(\'' + c.key + '\')">' + T('Calificar cuestionario', 'Score the quiz') + '</button>' + (rec.checked ? '<span class="el-pts">' + rec.correct + '/' + rec.total + ' → ' + C.knowledgePts(rec.correct, rec.total) + ' / 30</span>' : '') + '</div>';
    } else {
      k += '<p class="lsub">' + T('Sin cuestionario: el supervisor valora el conocimiento con la rúbrica.', 'No quiz: the supervisor rates knowledge with the rubric.') + '</p>' + levelPicker(c.key, 'k', rec, (u.rubric && u.rubric.c) || '');
    }
    k += '</div>';
    var rb = u.rubric || {};
    var e = '<div class="el-sec"><div class="el-top"><b>' + T('Ejecución', 'Execution') + '</b><span>40 %</span></div>' + levelPicker(c.key, 'e', rec, rb.e || '') + '</div>';
    var l = '<div class="el-sec"><div class="el-top"><b>' + T('Conexión local y fe', 'Local connection & faith') + '</b><span>30 %</span></div>' + levelPicker(c.key, 'l', rec, rb.l || '') + '</div>';
    var ready = rec.weighted != null;
    var res = ready ? '<div class="el-result ' + (rec.weighted >= C.MASTERY ? 'ok' : 'warn') + '"><div class="el-big">' + rec.weighted + '<small>/100 · ' + C.letter(rec.weighted) + '</small></div><div>' +
      (rec.weighted >= C.MASTERY ? '🏅 ' + T('Dominio alcanzado (Mastery ≥ ' + C.MASTERY + ').', 'Mastery reached (≥ ' + C.MASTERY + ').') : '🔁 ' + T('Todavía no hay dominio (se pide ≥ ' + C.MASTERY + '): repasa, mejora el entregable y vuelve a evaluar.', 'Mastery not reached yet (≥ ' + C.MASTERY + ' required): review, improve the deliverable, and reassess.')) +
      '<br><small>' + T('Conocimiento', 'Knowledge') + ' ' + rec.k + ' · ' + T('Ejecución', 'Execution') + ' ' + rec.e + ' · ' + T('Conexión', 'Connection') + ' ' + rec.l + '</small></div></div>' : '';
    var st = rec.status === 'approved' ? '<span class="chip done">' + T('Aprobada por el personal', 'Approved by staff') + '</span>' : rec.synced ? '<span class="chip soon">' + T('Enviada al SIS · pendiente de revisión', 'Sent to the SIS · pending review') + '</span>' : '';
    return '<div class="taskbox"><div class="tb-head"><span class="tb-badge">📊</span><div><h3>' + T('Evaluación oficial Chanak · 30 / 40 / 30', 'Official Chanak evaluation · 30 / 40 / 30') + '</h3><p>' + T('Conocimiento 30 % + Ejecución 40 % + Conexión local y fe 30 % = 100 puntos.', 'Knowledge 30% + Execution 40% + Local connection & faith 30% = 100 points.') + '</p></div></div>' +
      k + e + l +
      '<div class="el-sec"><label class="el-lbl">' + T('¿Quién evalúa?', 'Who is assessing?') + ' <select onchange="elSetBy(\'' + c.key + '\',this.value)" ' + (locked ? 'disabled' : '') + '><option value="self" ' + (rec.by !== 'supervisor' ? 'selected' : '') + '>' + T('Estudiante (autoevaluación)', 'Student (self-assessment)') + '</option><option value="supervisor" ' + (rec.by === 'supervisor' ? 'selected' : '') + '>' + T('Supervisor / mentor', 'Supervisor / mentor') + '</option></select></label>' +
      '<label class="el-lbl">' + T('Notas (opcional)', 'Notes (optional)') + '<textarea onchange="elSetNotes(\'' + c.key + '\',this.value)" ' + (locked ? 'disabled' : '') + ' placeholder="' + T('Enlace a la evidencia, comentarios…', 'Link to evidence, comments…') + '">' + esc(rec.notes || '') + '</textarea></label></div>' +
      res + '<div class="rt-row">' + st + '<button class="btn primary" ' + (locked ? 'disabled' : '') + ' onclick="elSubmit(\'' + c.key + '\')">' + T('Calcular y enviar al SIS', 'Calculate & send to the SIS') + '</button></div></div>';
  }
  function refreshEval() { var h = $('el-eval'); if (h && S.cur) h.innerHTML = evalCard(S.cur); }
  function rec(key) { if (!U[key]) U[key] = { route: S.cur.route, track: S.cur.track, quarter: S.cur.quarter, title: S.cur.title, mo: S.cur.mo }; return U[key]; }
  window.elAnswer = function (key, qi, oi) { (S.answers[key] = S.answers[key] || [])[qi] = oi; var r = rec(key); r.checked = false; refreshEval(); };
  window.elCheckQuiz = function (key) {
    var qs = S.cur.unit.quiz, a = S.answers[key] || [];
    if (a.filter(function (x) { return x != null; }).length < qs.length) { alert(T('Responde las ' + qs.length + ' preguntas primero.', 'Answer all ' + qs.length + ' questions first.')); return; }
    var ok = qs.reduce(function (n, q, i) { return n + (q.opts[a[i]] && q.opts[a[i]].ok ? 1 : 0); }, 0), r = rec(key);
    if (r.correct == null || ok >= r.correct) { r.correct = ok; } r.total = qs.length; r.checked = true; r.lastCorrect = ok; compute(r); save(); refreshEval();
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
    var r = rec(key); compute(r);
    if (r.weighted == null) { alert(T('Falta completar el cuestionario/conocimiento, la ejecución y la conexión local.', 'Complete knowledge, execution and local connection first.')); return; }
    r.synced = false; save(); refreshEval();
    if (!hasToken()) { alert(T('Guardado en este dispositivo. Para enviarlo al SIS abre el módulo desde tu perfil del SIS.', 'Saved on this device. To send it to the SIS, open the module from your SIS profile.')); return; }
    var res = await syncUnit(key);
    if (!res.ok) alert(T('No se pudo enviar al SIS: ', 'Could not send to the SIS: ') + res.error);
    refreshEval(); if (typeof showCoinToast === 'function' && res.ok) showCoinToast(T('Nota enviada al SIS · pendiente de revisión', 'Grade sent to the SIS · pending review'));
  };
  async function syncUnit(key) {
    var r = U[key];
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/submit_extension_local_grade', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
        body: JSON.stringify({ p_token: ST.token, p_route: r.route, p_track: r.track, p_unit_key: key, p_unit_title: r.title, p_quarter: r.quarter, p_quiz_correct: r.correct, p_quiz_total: r.total || 5, p_execution_level: r.execLevel, p_local_level: r.localLevel, p_assessed_by: r.by === 'supervisor' ? 'supervisor' : 'self', p_notes: r.notes || null }) });
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

  /* ---------- España: evaluación del mes dentro de la lección existente ---------- */
  var _openLesson = window.openLesson;
  window.openLesson = function (gid, mo) {
    _openLesson(gid, mo); S.route = 'es'; S.lang = 'es';
    var g = EL_GRADES.filter(function (x) { return x.id === gid; })[0], m = g && g.months.filter(function (x) { return x.mo === mo; })[0];
    if (!m) return;
    S.cur = { key: C.unitKey('es', gid, null, mo), route: 'es', track: gid, mo: mo, quarter: C.quarterOf(mo), title: m.tema, unit: { rubric: m.rubric } };
    var box = document.createElement('div'); box.id = 'el-eval'; box.innerHTML = evalCard(S.cur);
    var body = $('lesson-body'); if (body) body.appendChild(box);
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

  /* ---------- Arranque ---------- */
  var _renderHome = window.renderHome;
  window.renderHome = function () { _renderHome(); renderRouteBar(); };
  window.addEventListener('DOMContentLoaded', function () {
    renderRouteBar(); hydrate();
    if (P.route && C.ROUTES[P.route] && P.route !== 'es') window.elOpenRoute(P.route);
  });
  window.ELUI = { S: S, U: U, T: T };
})();
