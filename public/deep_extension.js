/* Chanak Extensión Local — LMS PROFUNDO: lectura académica, glosario, práctica guiada y Checkpoint de dominio (≥ 80 %) con compuerta
   entre lecciones. El contenido de cada grado se carga bajo demanda desde deep/*.js (window.EL_DEEP); sin archivo, la unidad se ve como antes. */
(function () {
  var U0 = window.ELUI, C = window.ELCore, S = U0.S, U = U0.U, T = U0.T, esc = U0.esc;
  var $ = function (id) { return document.getElementById(id); };
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var loaded = {}, K = {};
  var manifest = function () { return window.EL_DEEP_MANIFEST || []; };
  var deepData = function () { return window.EL_DEEP || {}; };
  K.has = function (file) { return manifest().indexOf(file) >= 0; };
  K.load = function (file) {
    if (!K.has(file)) return Promise.resolve(false);
    if (!loaded[file]) loaded[file] = new Promise(function (res) { var s = document.createElement('script'); s.src = 'deep/' + file + '.js'; s.onload = function () { res(true); }; s.onerror = function () { res(false); }; document.head.appendChild(s); });
    return loaded[file];
  };

  /* ---------- Claves ---------- */
  var MONTHS = C.MONTHS;
  var esKey = function (gid, mo) { return C.unitKey('es', gid, null, mo); };
  var obKey = function (level, mo) { return C.unitKey('us', 'world_language', level, mo); };
  var deepKeyEs = function (gid, mo) { return gid + ':' + mo; };
  var fileEs = function (gid) { return 'es_' + gid; };
  var fileOb = function (level) { return 'ob_' + level; };

  /* ---------- Compuerta de dominio: la lección siguiente se abre con ≥ 80 % en el checkpoint de la anterior ---------- */
  var unlockStore = function () { return store.get('chanak_el_unlock', {}); };
  var quizPct = function (key) { var r = U[key]; return r && r.total ? r.correct / r.total : null; };
  K.locked = function (kind, id, mo) {
    var file = kind === 'es' ? fileEs(id) : fileOb(id);
    if (!K.has(file) || S.demo) return false;                      // sin contenido profundo (o demostración): sin compuerta
    var i = MONTHS.indexOf(mo); if (i <= 0) return false;
    if (unlockStore()[kind + ':' + id]) return false;
    var prev = kind === 'es' ? esKey(id, MONTHS[i - 1]) : obKey(id, MONTHS[i - 1]);
    var p = quizPct(prev); return !(p != null && p >= C.MASTERY / 100);
  };
  K.askUnlock = function (kind, id, mo) {
    var prevName = U0.monthName(MONTHS[MONTHS.indexOf(mo) - 1]);
    var ok = window.confirm(T('🔒 Lección bloqueada. Para abrir esta lección completa antes el Checkpoint de dominio de «' + prevName + '» con al menos 80 % (4 de 5).\n\n¿Eres supervisor o familia y quieres desbloquear todas las lecciones de este grado?', '🔒 Locked lesson. To open it, first pass the Mastery Checkpoint of “' + prevName + '” with at least 80% (4 of 5).\n\nAre you a supervisor or parent and want to unlock all lessons of this course?'));
    if (ok) { var u = unlockStore(); u[kind + ':' + id] = true; store.set('chanak_el_unlock', u); }
    return ok;
  };
  K.decorate = function () {
    var mark = function (el, locked) { if (!el) return; el.classList.toggle('is-locked', locked); var tag = el.querySelector('.mo,.kd-ico'); if (!tag) return; var has = tag.textContent.indexOf('🔒 ') === 0; if (locked && !has) tag.textContent = '🔒 ' + tag.textContent; else if (!locked && has) tag.textContent = tag.textContent.slice(3); };
    document.querySelectorAll('[onclick^="openLesson("]').forEach(function (el) { var m = /openLesson\('([^']+)','([^']+)'\)/.exec(el.getAttribute('onclick')); if (m) mark(el, K.locked('es', m[1], m[2])); });
    if (S.route === 'us' && S.track === 'world_language' && S.level) document.querySelectorAll('#view-route [onclick^="elOpenUnit("]').forEach(function (el) { var m = /elOpenUnit\('([^']+)'\)/.exec(el.getAttribute('onclick')); if (m) mark(el, K.locked('ob', S.level, m[1])); });
  };

  /* ---------- Bloque de contenido ---------- */
  var ans = function (key) { return store.get('chanak_el_deep_' + key, { a: [], r: [] }); };
  function blockHtml(key, d, ctx) {
    var st = ans(key), ob = ctx.kind === 'ob';
    var lang = ob ? (S.deepLang || 'en') : 'es';
    var L = function (es, en) { return ob ? en : es; };
    var paras = (lang === 'es' && d.reading_es ? (Array.isArray(d.reading_es) ? d.reading_es : String(d.reading_es).split(/\n\n+/)) : d.reading);
    var tabs = ob && d.reading_es ? '<div class="rt-row" style="margin-bottom:8px"><button class="rt-seg ' + (lang === 'en' ? 'on' : '') + '" onclick="ELDeep.lang(\'en\')">English</button><button class="rt-seg ' + (lang === 'es' ? 'on' : '') + '" onclick="ELDeep.lang(\'es\')">Español</button></div>' : '';
    var read = '<h3 class="dp-h"><span>1</span> ' + L('Lectura académica', 'Academic reading') + '</h3>' + tabs + '<div class="dp-read">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
    var gloss = '<h3 class="dp-h"><span>2</span> ' + L('Vocabulario esencial y glosario', 'Essential vocabulary and glossary') + '</h3><dl class="dp-gloss">' + d.glossary.map(function (g) { return '<dt>' + esc(g.term) + '</dt><dd>' + esc(g.def) + '</dd>'; }).join('') + '</dl>';
    var prac = '<h3 class="dp-h"><span>3</span> ' + L('Práctica guiada', 'Guided practice') + '</h3>' + d.practice.map(function (q, i) {
      return '<div class="dp-q"><p><b>' + (i + 1) + '.</b> ' + esc(q.q) + '</p><textarea rows="3" placeholder="' + L('Escribe tu respuesta con tus palabras…', 'Write your answer in your own words…') + '" onchange="ELDeep.save(\'' + key + '\',' + i + ',this.value)">' + esc(st.a[i] || '') + '</textarea>' +
        '<button class="btn ghost dp-fb-btn" onclick="ELDeep.reveal(\'' + key + '\',' + i + ')">' + (st.r[i] ? L('Ocultar retroalimentación', 'Hide feedback') : L('Ver retroalimentación', 'See feedback')) + '</button>' +
        (st.r[i] ? '<div class="dp-fb"><b>' + L('Respuesta modelo', 'Model answer') + ':</b> ' + esc(q.feedback) + '</div>' : '') + '</div>';
    }).join('');
    var p = quizPct(ctx.evalKey), passed = p != null && p >= C.MASTERY / 100;
    var gate = '<h3 class="dp-h"><span>4</span> ' + L('Checkpoint de dominio', 'Mastery Checkpoint') + '</h3><div class="dp-gate ' + (passed ? 'ok' : '') + '">' +
      (passed ? '✅ ' + L('Dominio alcanzado en el checkpoint (' + Math.round(p * 100) + ' %). La siguiente lección está desbloqueada.', 'Mastery reached on the checkpoint (' + Math.round(p * 100) + '%). The next lesson is unlocked.')
        : '🔒 ' + L('Responde el cuestionario de más abajo: necesitas al menos 80 % (4 de 5) para desbloquear la siguiente lección. Puedes repetirlo; se guarda tu mejor resultado.', 'Answer the quiz below: you need at least 80% (4 of 5) to unlock the next lesson. You may retake it; your best score is kept.')) + '</div>';
    return '<div class="dp" id="el-deep">' + read + gloss + prac + gate + '</div>';
  }
  function mount(ctx, d) {
    var host = $('el-deep'); var html = blockHtml(ctx.deepKey, d, ctx);
    if (host) { host.outerHTML = html; return; }
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var anchor = ctx.kind === 'es' ? $('el-extra') : $('el-eval');
    if (!anchor) return;
    if (ctx.kind === 'es') anchor.insertBefore(tmp.firstChild, anchor.firstChild); else anchor.parentNode.insertBefore(tmp.firstChild, anchor);
  }
  K.curCtx = null;
  function setQuiz(ctx, d) { var c = U0.cur(); if (c && d.quiz && c.unit) { c.unit.quiz = d.quiz; U0.refresh(); } }
  function openDeep(ctx) {
    K.load(ctx.file).then(function (ok) {
      var d = ok && deepData()[ctx.deepKey]; if (!d) return;
      K.curCtx = ctx; ctx.d = d; mount(ctx, d); setQuiz(ctx, d);
    });
  }
  K.lang = function (l) { S.deepLang = l; if (K.curCtx) mount(K.curCtx, K.curCtx.d); };
  K.save = function (key, i, v) { var st = ans(key); st.a[i] = v; store.set('chanak_el_deep_' + key, st); };
  K.reveal = function (key, i) { var st = ans(key); st.r[i] = !st.r[i]; store.set('chanak_el_deep_' + key, st); if (K.curCtx) mount(K.curCtx, K.curCtx.d); };

  /* ---------- Enganche con España y con la Opción B ---------- */
  var _openLesson = window.openLesson;
  window.openLesson = function (gid, mo) {
    if (K.locked('es', gid, mo) && !K.askUnlock('es', gid, mo)) return;
    _openLesson(gid, mo);
    if (K.has(fileEs(gid))) openDeep({ kind: 'es', file: fileEs(gid), deepKey: deepKeyEs(gid, mo), evalKey: esKey(gid, mo) });
  };
  var _openUnit = window.elOpenUnit;
  window.elOpenUnit = function (mo) {
    var isOb = S.route === 'us' && S.track === 'world_language' && S.level;
    if (isOb && K.locked('ob', S.level, mo) && !K.askUnlock('ob', S.level, mo)) return;
    _openUnit(mo);
    if (isOb && K.has(fileOb(S.level))) openDeep({ kind: 'ob', file: fileOb(S.level), deepKey: obKey(S.level, mo), evalKey: obKey(S.level, mo) });
  };
  ['openGrade', 'elPickTrack', 'elOpenRoute'].forEach(function (n) { var o = window[n]; window[n] = function () { var r = o.apply(this, arguments); setTimeout(K.decorate, 60); return r; }; });

  /* ---------- Impresión: lectura, glosario y práctica con renglones para escribir a mano ---------- */
  K.printHtml = function (c) {
    var key = c.route === 'es' ? deepKeyEs(c.track, c.mo) : c.key, d = deepData()[key]; if (!d) return '';
    var ob = c.route !== 'es', lines = function (n) { var o = ''; for (var i = 0; i < n; i++) o += '<div class="pu-line"></div>'; return o; };
    return '<h4>' + (ob ? 'Academic reading' : 'Lectura académica') + '</h4>' + d.reading.map(function (p) { return '<p class="pu-p">' + esc(p) + '</p>'; }).join('') +
      '<h4>' + (ob ? 'Glossary' : 'Vocabulario esencial y glosario') + '</h4><table class="el-tbl">' + d.glossary.map(function (g) { return '<tr><td><b>' + esc(g.term) + '</b></td><td>' + esc(g.def) + '</td></tr>'; }).join('') + '</table>' +
      '<h4>' + (ob ? 'Guided practice' : 'Práctica guiada') + '</h4>' + d.practice.map(function (q, i) { return '<p class="pu-p"><b>' + (i + 1) + '.</b> ' + esc(q.q) + '</p>' + lines(4); }).join('') +
      '<p class="ps-note">' + (ob ? 'Mastery Checkpoint: at least 80% (4 of 5) in the app unlocks the next lesson.' : 'Checkpoint de dominio: al menos 80 % (4 de 5) en la app desbloquea la siguiente lección.') + '</p>';
  };
  window.ELDeep = K;
  window.addEventListener('DOMContentLoaded', function () { setTimeout(K.decorate, 100); });
})();
