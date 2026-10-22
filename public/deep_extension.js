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


  /* ---------- Recursos visuales e interactivos: banner, escuchar, mapa, línea de tiempo, tarjetas y juego de unir ---------- */
  var PALETTE = { amber: ['#fef3c7', '#f59e0b'], blue: ['#dbeafe', '#2563eb'], green: ['#dcfce7', '#16a34a'], rose: ['#ffe4e6', '#e11d48'], violet: ['#ede9fe', '#7c3aed'], teal: ['#ccfbf1', '#0d9488'] };
  var IBERIA = [[-9.3, 43.2], [-8.0, 43.7], [-5.8, 43.6], [-3.8, 43.45], [-1.8, 43.35], [-1.45, 43.3], [0.0, 42.7], [1.7, 42.5], [3.2, 42.4], [3.2, 41.9], [2.2, 41.4], [0.9, 41.0], [0.2, 40.2], [-0.3, 39.4], [0.2, 38.8], [-0.5, 38.3], [-0.7, 37.6], [-2.1, 36.8], [-4.4, 36.7], [-5.4, 36.1], [-6.3, 36.5], [-6.9, 37.2], [-7.4, 37.2], [-8.9, 37.0], [-8.8, 38.5], [-9.5, 38.7], [-9.4, 39.5], [-8.8, 40.6], [-8.7, 41.2], [-8.9, 42.0], [-9.0, 42.6]];
  var proj = function (lon, lat) { return [((lon + 10) / 14.5 * 520).toFixed(1), ((44 - lat) / 8.5 * 400).toFixed(1)]; };
  function mapHtml(m, ob) {
    if (!m || !m.markers || !m.markers.length) return '';
    var pts = IBERIA.map(function (p) { return proj(p[0], p[1]).join(','); }).join(' ');
    var icon = { city: '●', river: '≈', mountain: '▲', site: '★' };
    var dots = m.markers.map(function (k) { var p = proj(k.lon, k.lat); return '<g><text x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" dominant-baseline="central" class="dp-mk ' + esc(k.kind || 'city') + '">' + (icon[k.kind] || '●') + '</text><text x="' + (Number(p[0]) + (Number(p[0]) > 400 ? -8 : 8)) + '" y="' + (Number(p[1]) - 8) + '" text-anchor="' + (Number(p[0]) > 400 ? 'end' : 'start') + '" class="dp-ml">' + esc(k.name) + '</text></g>'; }).join('');
    return '<h3 class="dp-h2">🗺️ ' + (ob ? 'Schematic map' : 'Mapa esquemático') + '</h3><svg class="dp-map" viewBox="0 0 520 400" role="img" aria-label="' + (ob ? 'Schematic map of the Iberian Peninsula' : 'Mapa esquemático de la península ibérica') + '"><rect width="520" height="400" rx="14" fill="#e0f2fe"/><polygon points="' + pts + '" fill="#fef9c3" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>' + dots + '</svg><p class="dp-note">' + (ob ? 'Schematic map, not to scale.' : 'Mapa esquemático, no está a escala.') + '</p>';
  }
  function bannerHtml(sc) {
    if (!sc || !sc.icons) return '';
    var pal = PALETTE[sc.palette] || PALETTE.amber;
    return '<div class="dp-banner" style="background:linear-gradient(135deg,' + pal[0] + ',#fff);border-color:' + pal[1] + '">' + sc.icons.slice(0, 3).map(function (e, i) { return '<span style="animation-delay:' + (i * 0.25) + 's">' + esc(e) + '</span>'; }).join('') + '</div>';
  }
  var shuffle = function (a) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; };
  K.games = {};
  function game(key) { return (K.games[key] = K.games[key] || {}); }
  function timelineHtml(d, key, ob) {
    if (!d.timeline || d.timeline.length < 2) return '';
    var g = game(key); if (!g.tl) g.tl = { order: shuffle(d.timeline.map(function (_, i) { return i; })), next: 0, wrong: 0 };
    var st = g.tl, done = st.next >= d.timeline.length, L = function (es, en) { return ob ? en : es; };
    var list = '<ol class="dp-tl">' + d.timeline.map(function (t, i) { return '<li class="' + (i < st.next ? 'ok' : '') + '"><b>' + esc(t.when) + '</b><span>' + esc(t.what) + '</span></li>'; }).join('') + '</ol>';
    var cards = done ? '' : '<div class="dp-tlcards">' + st.order.filter(function (i) { return i >= st.next || true; }).map(function (i) { var placed = i < st.next; return placed ? '' : '<button class="dp-tlc" onclick="ELDeep.tl(\'' + key + '\',' + i + ',this)">' + esc(d.timeline[i].what) + '</button>'; }).join('') + '</div>';
    return '<h3 class="dp-h2">⏳ ' + L('Línea de tiempo: ¡ordénala!', 'Timeline: put it in order!') + '</h3><p class="dp-note">' + (done ? '🎉 ' + L('¡Bien hecho! Errores: ', 'Well done! Mistakes: ') + st.wrong : L('Toca los hechos en el orden en que ocurrieron (del primero al último).', 'Tap the events in the order they happened (first to last).')) + '</p>' +
      (done ? '' : '<ol class="dp-tl dp-tl-pending">' + d.timeline.slice(0, st.next).map(function (t, i) { return '<li class="ok"><b>' + esc(t.when) + '</b><span>' + esc(t.what) + '</span></li>'; }).join('') + '</ol>') + cards + (done ? list + '<button class="btn ghost dp-fb-btn" onclick="ELDeep.tlReset(\'' + key + '\')">🔁 ' + L('Jugar otra vez', 'Play again') + '</button>' : '');
  }
  K.tl = function (key, i, btn) {
    var g = game(key), d = deepData()[key]; if (!g.tl || !d) return;
    if (i === g.tl.next) { g.tl.next++; if (g.tl.next >= d.timeline.length && window.ELKid && ELKid.confetti) ELKid.confetti(); }
    else { g.tl.wrong++; if (btn) { btn.classList.add('bad'); setTimeout(function () { btn.classList.remove('bad'); }, 500); return; } }
    if (K.curCtx) mount(K.curCtx, K.curCtx.d);
  };
  K.tlReset = function (key) { delete game(key).tl; if (K.curCtx) mount(K.curCtx, K.curCtx.d); };
  function flashHtml(d, key, ob) {
    var L = function (es, en) { return ob ? en : es; }, g = game(key);
    var cards = '<div class="dp-flash">' + d.glossary.map(function (x, i) { return '<button class="dp-fc ' + (g.flip && g.flip[i] ? 'is-flipped' : '') + '" onclick="ELDeep.flip(\'' + key + '\',' + i + ')"><span class="f">' + esc(x.term) + '</span><span class="b">' + esc(x.def) + '</span></button>'; }).join('') + '</div>';
    if (!g.match) g.match = { terms: shuffle(d.glossary.map(function (_, i) { return i; })), defs: shuffle(d.glossary.map(function (_, i) { return i; })), sel: null, ok: {}, wrong: 0 };
    var m = g.match, all = Object.keys(m.ok).length === d.glossary.length;
    var game2 = '<h3 class="dp-h2">🧩 ' + L('Juego: une cada término con su definición', 'Game: match each term to its definition') + '</h3><p class="dp-note">' + (all ? '🎉 ' + L('¡Todo unido! Errores: ', 'All matched! Mistakes: ') + m.wrong : L('Toca un término y luego su definición.', 'Tap a term, then its definition.')) + '</p><div class="dp-match"><div>' +
      m.terms.map(function (i) { return '<button class="dp-mt ' + (m.ok[i] ? 'ok' : '') + (m.sel === i ? ' sel' : '') + '" ' + (m.ok[i] ? 'disabled' : '') + ' onclick="ELDeep.pick(\'' + key + '\',\'t\',' + i + ')">' + esc(d.glossary[i].term) + '</button>'; }).join('') + '</div><div>' +
      m.defs.map(function (i) { return '<button class="dp-md ' + (m.ok[i] ? 'ok' : '') + '" ' + (m.ok[i] ? 'disabled' : '') + ' onclick="ELDeep.pick(\'' + key + '\',\'d\',' + i + ')">' + esc(d.glossary[i].def) + '</button>'; }).join('') + '</div></div>' + (all ? '<button class="btn ghost dp-fb-btn" onclick="ELDeep.matchReset(\'' + key + '\')">🔁 ' + L('Jugar otra vez', 'Play again') + '</button>' : '');
    return '<h3 class="dp-h2">🃏 ' + L('Tarjetas para repasar (toca para girar)', 'Flashcards (tap to flip)') + '</h3>' + cards + game2;
  }
  K.flip = function (key, i) { var g = game(key); g.flip = g.flip || {}; g.flip[i] = !g.flip[i]; if (K.curCtx) mount(K.curCtx, K.curCtx.d); };
  K.pick = function (key, side, i) {
    var m = game(key).match; if (!m) return;
    if (side === 't') { m.sel = i; } else if (m.sel != null) { if (m.sel === i) { m.ok[i] = true; } else { m.wrong++; } m.sel = null; }
    var d = deepData()[key]; if (Object.keys(m.ok).length === d.glossary.length && window.ELKid && ELKid.confetti) ELKid.confetti();
    if (K.curCtx) mount(K.curCtx, K.curCtx.d);
  };
  K.matchReset = function (key) { delete game(key).match; if (K.curCtx) mount(K.curCtx, K.curCtx.d); };
  /* Escuchar la lectura (voz del navegador) */
  K.speaking = false;
  K.listen = function (key, lang) {
    var ss = window.speechSynthesis, d = deepData()[key]; if (!ss || !d) { alert(T('Tu navegador no tiene lectura en voz alta.', 'Your browser has no read-aloud.')); return; }
    if (K.speaking) { ss.cancel(); K.speaking = false; if (K.curCtx) mount(K.curCtx, K.curCtx.d); return; }
    var paras = lang === 'es' && d.reading_es ? (Array.isArray(d.reading_es) ? d.reading_es : String(d.reading_es).split(/\n\n+/)) : d.reading;
    ss.cancel(); K.speaking = true; var n = paras.length;
    paras.forEach(function (p, i) { var u = new SpeechSynthesisUtterance(p); u.lang = lang === 'es' ? 'es-ES' : 'en-US'; u.rate = 0.92; u.onend = function () { if (i === n - 1) { K.speaking = false; if (K.curCtx) mount(K.curCtx, K.curCtx.d); } }; ss.speak(u); });
    if (K.curCtx) mount(K.curCtx, K.curCtx.d);
  };
  /* Imágenes: galería propia (si hay) y sugerencias de búsqueda para padres/mentores */
  function mediaHtml(d, ob) {
    var L = function (es, en) { return ob ? en : es; }, out = '';
    if (d.images && d.images.length) out += '<h3 class="dp-h2">🖼️ ' + L('Galería', 'Gallery') + '</h3><div class="dp-gal">' + d.images.map(function (im) { return '<figure><img loading="lazy" src="' + esc(im.src) + '" alt="' + esc(im.caption) + '"><figcaption>' + esc(im.caption) + (im.credit ? ' · <small>' + esc(im.credit) + '</small>' : '') + '</figcaption></figure>'; }).join('') + '</div>';
    if (d.media && d.media.length) out += '<details class="dp-media"><summary>📷 ' + L('Imágenes para ampliar la lección (padres y mentores)', 'Images to enrich the lesson (parents and mentors)') + '</summary><ul>' + d.media.map(function (m) { return '<li><b>' + esc(m.title) + '</b> — ' + esc(m.what) + ' <a href="https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(m.find) + '" target="_blank" rel="noopener noreferrer">' + L('buscar ↗', 'search ↗') + '</a> <small>(' + esc(m.note || '') + ')</small></li>'; }).join('') + '</ul><p class="dp-note">' + L('Comprueba la licencia de cada imagen antes de usarla.', 'Check each image’s license before using it.') + '</p></details>';
    return out;
  }

  /* ---------- Bloque de contenido ---------- */
  var ans = function (key) { return store.get('chanak_el_deep_' + key, { a: [], r: [] }); };
  function blockHtml(key, d, ctx) {
    var st = ans(key), ob = ctx.kind === 'ob';
    var lang = ob ? (S.deepLang || 'en') : 'es';
    var L = function (es, en) { return ob ? en : es; };
    var paras = (lang === 'es' && d.reading_es ? (Array.isArray(d.reading_es) ? d.reading_es : String(d.reading_es).split(/\n\n+/)) : d.reading);
    var tabs = ob && d.reading_es ? '<div class="rt-row" style="margin-bottom:8px"><button class="rt-seg ' + (lang === 'en' ? 'on' : '') + '" onclick="ELDeep.lang(\'en\')">English</button><button class="rt-seg ' + (lang === 'es' ? 'on' : '') + '" onclick="ELDeep.lang(\'es\')">Español</button></div>' : '';
    var listenBtn = '<button class="btn ghost dp-fb-btn" onclick="ELDeep.listen(\'' + ctx.deepKey + '\',\'' + lang + '\')">' + (K.speaking ? '⏹️ ' + L('Detener', 'Stop') : '🔊 ' + L('Escuchar la lectura', 'Listen to the reading')) + '</button>';
    var read = bannerHtml(d.scene) + '<h3 class="dp-h"><span>1</span> ' + L('Lectura académica', 'Academic reading') + '</h3>' + tabs + listenBtn + '<div class="dp-read">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
    var gloss = '<h3 class="dp-h"><span>2</span> ' + L('Vocabulario esencial y glosario', 'Essential vocabulary and glossary') + '</h3><dl class="dp-gloss">' + d.glossary.map(function (g) { return '<dt>' + esc(g.term) + '</dt><dd>' + esc(g.def) + '</dd>'; }).join('') + '</dl>';
    gloss = mapHtml(d.map, ob) + gloss + flashHtml(d, ctx.deepKey, ob) + timelineHtml(d, ctx.deepKey, ob);
    var prac = '<h3 class="dp-h"><span>3</span> ' + L('Práctica guiada', 'Guided practice') + '</h3>' + d.practice.map(function (q, i) {
      return '<div class="dp-q"><p><b>' + (i + 1) + '.</b> ' + esc(q.q) + '</p><textarea rows="3" placeholder="' + L('Escribe tu respuesta con tus palabras…', 'Write your answer in your own words…') + '" onchange="ELDeep.save(\'' + key + '\',' + i + ',this.value)">' + esc(st.a[i] || '') + '</textarea>' +
        '<button class="btn ghost dp-fb-btn" onclick="ELDeep.reveal(\'' + key + '\',' + i + ')">' + (st.r[i] ? L('Ocultar retroalimentación', 'Hide feedback') : L('Ver retroalimentación', 'See feedback')) + '</button>' +
        (st.r[i] ? '<div class="dp-fb"><b>' + L('Respuesta modelo', 'Model answer') + ':</b> ' + esc(q.feedback) + '</div>' : '') + '</div>';
    }).join('');
    var p = quizPct(ctx.evalKey), passed = p != null && p >= C.MASTERY / 100;
    var gate = '<h3 class="dp-h"><span>4</span> ' + L('Checkpoint de dominio', 'Mastery Checkpoint') + '</h3><div class="dp-gate ' + (passed ? 'ok' : '') + '">' +
      (passed ? '✅ ' + L('Dominio alcanzado en el checkpoint (' + Math.round(p * 100) + ' %). La siguiente lección está desbloqueada.', 'Mastery reached on the checkpoint (' + Math.round(p * 100) + '%). The next lesson is unlocked.')
        : '🔒 ' + L('Responde el cuestionario de más abajo: necesitas al menos 80 % (4 de 5) para desbloquear la siguiente lección. Puedes repetirlo; se guarda tu mejor resultado.', 'Answer the quiz below: you need at least 80% (4 of 5) to unlock the next lesson. You may retake it; your best score is kept.')) + '</div>';
    return '<div class="dp" id="el-deep">' + read + gloss + prac + gate + mediaHtml(d, ob) + '</div>';
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
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); K.speaking = false; } catch (e) { /* sin voz */ }
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
      (d.timeline ? '<h4>' + (ob ? 'Timeline' : 'Línea de tiempo') + '</h4><ol class="pu-p">' + d.timeline.map(function (t) { return '<li><b>' + esc(t.when) + '</b> — ' + esc(t.what) + '</li>'; }).join('') + '</ol>' : '') +
      '<h4>' + (ob ? 'Guided practice' : 'Práctica guiada') + '</h4>' + d.practice.map(function (q, i) { return '<p class="pu-p"><b>' + (i + 1) + '.</b> ' + esc(q.q) + '</p>' + lines(4); }).join('') +
      '<p class="ps-note">' + (ob ? 'Mastery Checkpoint: at least 80% (4 of 5) in the app unlocks the next lesson.' : 'Checkpoint de dominio: al menos 80 % (4 de 5) en la app desbloquea la siguiente lección.') + '</p>';
  };
  window.ELDeep = K;
  window.addEventListener('DOMContentLoaded', function () { setTimeout(K.decorate, 100); });
})();
