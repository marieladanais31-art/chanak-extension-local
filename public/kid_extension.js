/* Chanak Extensión Local — MODO AVENTURA (Primaria 1.º-6.º): HUD con nivel y XP, mapa de islas, misiones con estrellas y confeti.
   Usa los mismos cálculos y envíos que el resto de la app (30/40/30); solo cambia la presentación. */
(function () {
  var U0 = window.ELUI, C = window.ELCore, S = U0.S, U = U0.U, T = U0.T, esc = U0.esc;
  var AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐙', '🦄', '🐸', '🚀', '🤖', '🦋'];
  var AREA = { Lengua: ['🔤', '#2563eb'], Historia: ['🏰', '#d97706'], 'Geografía': ['🗺️', '#16a34a'], Fe: ['✝️', '#7c3aed'], Finanzas: ['💰', '#0d9488'], Idioma: ['🗣️', '#db2777'] };
  var areaOf = function (a) { a = String(a || ''); var k = Object.keys(AREA).filter(function (x) { return a.indexOf(x) >= 0; })[0]; return AREA[k] || ['🌟', '#d97706']; };
  var $ = function (id) { return document.getElementById(id); };
  var lsGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  var K = { active: function (c) { return C.stageOf(U0.gradeOf(c)) === 'primary'; }, quiz: {} };
  var isKidGrade = function () { return S.grade != null && S.grade <= 6; };

  /* ---------- Experiencia y HUD ---------- */
  function xp() {
    var n = 0; Object.keys(U).forEach(function (k) { var r = U[k]; if (r.weighted != null) { n += 20; if (C.unitMastery(r.weighted, false, null)) n += 50; } });
    try { if (typeof PROG !== 'undefined') n += Math.floor((PROG.coins || 0) / 4); } catch (e) {}
    return n;
  }
  function hud() {
    var lv = C.kidLevel(xp()), av = AVATARS[Number(lsGet('chanak_el_avatar', 0)) % AVATARS.length];
    var name = (window.STATE && STATE.studentName) || T('Explorador', 'Explorer');
    var stars = Object.keys(U).reduce(function (n, k) { return n + C.starsOf(U[k].weighted); }, 0);
    return '<div class="kd-hud"><button class="kd-avatar" onclick="ELKid.avatar()" aria-label="' + T('Cambiar personaje', 'Change character') + '">' + av + '</button><div class="kd-hud-main"><p class="kd-name">' + esc(name) + ' · ' + lv.level.icon + ' ' + T('Nivel', 'Level') + ' ' + (lv.index + 1) + ': ' + T(lv.level.es, lv.level.en) + '</p>' +
      '<div class="kd-xp"><i style="width:' + lv.pct + '%"></i></div><p class="kd-sub">' + (lv.toNext ? T('Te faltan ' + lv.toNext + ' XP para subir de nivel', lv.toNext + ' XP to level up') : T('¡Nivel máximo! 🏆', 'Max level! 🏆')) + '</p></div><div class="kd-stats"><span title="' + T('Estrellas', 'Stars') + '">⭐ ' + stars + '</span><span title="XP">⚡ ' + xp() + '</span></div></div>';
  }
  K.avatar = function () { lsSet('chanak_el_avatar', String((Number(lsGet('chanak_el_avatar', 0)) + 1) % AVATARS.length)); K.paint(); };
  K.hudHtml = hud;

  /* ---------- Confeti ---------- */
  K.confetti = function () {
    var box = document.createElement('div'); box.className = 'kd-confetti'; var em = ['🎉', '⭐', '✨', '🌟', '🎊', '🏅'];
    for (var i = 0; i < 28; i++) { var s = document.createElement('span'); s.textContent = em[i % em.length]; s.style.left = (Math.random() * 100) + '%'; s.style.animationDelay = (Math.random() * 0.6) + 's'; s.style.fontSize = (18 + Math.random() * 18) + 'px'; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 3200);
  };

  /* ---------- Aplicación del modo aventura a las pantallas ---------- */
  K.paint = function () {
    var kid = isKidGrade() || (U0.cur() && K.active(U0.cur()));
    document.body.classList.toggle('kid-on', !!kid);
    // HUD en el inicio
    var home = $('kid-hud-home'); if (home) home.innerHTML = (isKidGrade() || !U0.hasToken()) ? hud() : '';
    document.querySelectorAll('.kd-hud-slot').forEach(function (n) { n.innerHTML = hud(); });
    // tarjetas de Primaria del inicio con aspecto de aventura
    document.querySelectorAll('#grade-sections .gcard').forEach(function (g) { if (g.querySelector('.stage-tag.primaria')) g.classList.add('kd-card'); });
  };

  // Mapa de aventuras al abrir un grado de Primaria de España
  var _openGrade = window.openGrade;
  window.openGrade = function (gid) {
    _openGrade(gid);
    var m = /^p([1-6])$/.exec(gid); if (!m) return;
    var g = EL_GRADES.filter(function (x) { return x.id === gid; })[0]; if (!g) return;
    var worlds = [['Q1', T('Mundo 1 · Otoño', 'World 1')], ['Q2', T('Mundo 2 · Invierno', 'World 2')], ['Q3', T('Mundo 3 · Primavera', 'World 3')]].map(function (q) {
      var months = g.months.filter(function (x) { return C.quarterOf(x.mo) === q[0]; });
      var done = months.filter(function (x) { var r = U['es:' + gid + ':' + x.mo]; return r && r.weighted != null; }).length;
      return '<div class="kd-world"><div class="kd-world-h"><b>' + q[1] + '</b><div class="kd-prog"><i style="width:' + Math.round(done / months.length * 100) + '%"></i></div><span>' + done + '/' + months.length + '</span></div><div class="kd-islands">' + months.map(function (x) {
        var r = U['es:' + gid + ':' + x.mo], st = C.starsOf(r && r.weighted), ar = areaOf(x.area);
        return '<button class="kd-island ' + (st ? 'done' : '') + '" style="--jk:' + ar[1] + '" onclick="openLesson(\'' + gid + '\',\'' + x.mo + '\')"><span class="kd-ico">' + ar[0] + '</span><b>' + esc(x.tema) + '</b><small>' + esc(x.area) + '</small><span class="kd-stars">' + [1, 2, 3].map(function (n) { return n <= st ? '⭐' : '☆'; }).join('') + '</span></button>';
      }).join('') + '</div></div>';
    }).join('');
    var q = $('gr-quarters'); if (q) q.innerHTML = '<div class="kd-hud-slot"></div><div class="kd-daily">🧭 ' + T('Tu aventura: elige una isla, estudia, cumple tus misiones y gana estrellas.', 'Your adventure: pick an island, study, complete your missions and earn stars.') + '</div>' + worlds;
    S.grade = Number(m[1]); K.paint();
  };

  var _openLesson = window.openLesson;
  window.openLesson = function (gid, mo) {
    _openLesson(gid, mo); K.paint();
    if (!/^p[1-6]$/.test(gid)) return;
    var body = $('lesson-body'); if (body && !body.querySelector('.kd-hud-slot')) { var d = document.createElement('div'); d.className = 'kd-hud-slot'; d.innerHTML = hud(); body.insertBefore(d, body.firstChild); }
  };
  var _showView = window.showView;
  window.showView = function (v) { _showView(v); setTimeout(K.paint, 0); };

  /* ---------- Misiones de evaluación (formato juego) ---------- */
  var FACES = [
    { n: 1, ico: '🌱', es: 'Estoy empezando', en: "I'm just starting" }, { n: 2, ico: '🌿', es: 'Voy avanzando', en: "I'm getting there" },
    { n: 3, ico: '🌳', es: '¡Casi lo logro!', en: 'Almost there!' }, { n: 4, ico: '🌟', es: '¡Lo logré con excelencia!', en: 'I did it with excellence!' }
  ];
  function faces(key, which, cur, text4) {
    return '<div class="kd-faces">' + FACES.map(function (f) { return '<button class="kd-face ' + (cur === f.n ? 'on' : '') + '" onclick="elSetLevel(\'' + key + '\',\'' + which + '\',' + f.n + ')"><span>' + f.ico + '</span><b>' + T(f.es, f.en) + '</b></button>'; }).join('') + '</div>' +
      (text4 ? '<p class="kd-goal">🌟 ' + T('Para lograr la estrella máxima:', 'For the top star:') + ' ' + esc(text4) + '</p>' : '');
  }
  K.pick = function (key, qi, oi) { var a = (S.answers[key] = S.answers[key] || []); if (a[qi] != null) return; a[qi] = oi; K.quiz[key] = { qi: qi, shown: true }; U0.refresh(); };
  K.next = function (key) {
    var c = U0.cur(), qs = c.unit.quiz, st = K.quiz[key] || { qi: 0 };
    if (st.qi + 1 < qs.length) { K.quiz[key] = { qi: st.qi + 1, shown: false }; U0.refresh(); }
    else { K.quiz[key] = { qi: qs.length, shown: false, done: true }; window.elCheckQuiz(key); var r = U[key]; if (r && r.correct === r.total) K.confetti(); }
  };
  K.retry = function (key) { S.answers[key] = []; K.quiz[key] = { qi: 0, shown: false }; if (U[key]) U[key].checked = false; U0.refresh(); };

  K.evalCard = function (c) {
    var u = c.unit, r = U[c.key] || {}, locked = r.status === 'approved', rb = c.view.rubric || {}, key = c.key;
    var hasQuiz = !!(u && u.quiz && u.quiz.length), st = K.quiz[key] || { qi: 0 }, ans = S.answers[key] || [];
    var m1;
    if (hasQuiz) {
      if (r.checked && r.correct != null) {
        m1 = '<div class="kd-done">' + [1, 2, 3, 4, 5].map(function (n) { return n <= r.correct ? '⭐' : '☆'; }).join('') + '<p>' + T('¡Acertaste ' + r.correct + ' de ' + r.total + '!', 'You got ' + r.correct + ' of ' + r.total + ' right!') + '</p><button class="kd-btn ghost" ' + (locked ? 'disabled' : '') + ' onclick="ELKid.retry(\'' + key + '\')">🔁 ' + T('Intentarlo otra vez (se guarda tu mejor puntaje)', 'Try again (your best score is kept)') + '</button></div>';
      } else {
        var q = u.quiz[Math.min(st.qi, u.quiz.length - 1)], qi = Math.min(st.qi, u.quiz.length - 1), picked = ans[qi];
        m1 = '<div class="kd-q"><div class="kd-qn">' + T('Pregunta', 'Question') + ' ' + (qi + 1) + ' / ' + u.quiz.length + '</div><p class="kd-qt">' + esc(q.q) + '</p>' + q.opts.map(function (o, oi) {
          var cls = picked == null ? '' : (o.ok ? 'ok' : (picked === oi ? 'bad' : 'dim'));
          return '<button class="kd-opt ' + cls + '" ' + (picked != null || locked ? 'disabled' : '') + ' onclick="ELKid.pick(\'' + key + '\',' + qi + ',' + oi + ')">' + (cls === 'ok' ? '✅ ' : cls === 'bad' ? '❌ ' : '') + esc(o.t) + '</button>';
        }).join('') + (picked != null ? '<div class="kd-fb ' + (q.opts[picked].ok ? 'ok' : 'bad') + '">' + (q.opts[picked].ok ? '🎉 ' + T('¡Muy bien!', 'Great job!') : '💪 ' + T('¡Casi! Mira la respuesta marcada.', 'Almost! See the marked answer.')) + '</div><button class="kd-btn" onclick="ELKid.next(\'' + key + '\')">' + (qi + 1 < u.quiz.length ? T('Siguiente →', 'Next →') : T('Ver mis estrellas ⭐', 'See my stars ⭐')) + '</button>' : '') + '</div>';
      }
    } else {
      m1 = '<p class="kd-goal">' + T('¿Qué tanto aprendiste este mes?', 'How much did you learn this month?') + '</p>' + faces(key, 'k', r.knowLevel, rb.c);
    }
    var cpl = (r.weighted != null);
    var stars = C.starsOf(r.weighted), mastery = cpl && C.unitMastery(r.weighted, false, null);
    var res = cpl ? '<div class="kd-result ' + (mastery ? 'ok' : '') + '"><div class="kd-bigstars">' + [1, 2, 3].map(function (n) { return n <= stars ? '⭐' : '☆'; }).join('') + '</div><b>' + r.weighted + ' / 100</b><p>' + (mastery ? '🏅 ' + T('¡Maestro de la unidad! Lo lograste.', 'Unit Master! You did it.') : '🔁 ' + T('¡Buen intento! Repasa y vuelve a intentarlo para llegar a 80.', 'Good try! Review and try again to reach 80.')) + '</p></div>' : '';
    var done = r.status === 'approved' ? '<span class="kd-chip ok">' + T('✅ Aprobada por tu mentor', '✅ Approved by your mentor') + '</span>' : r.synced ? '<span class="kd-chip">' + T('📨 Enviada · tu mentor la revisará', '📨 Sent · your mentor will review it') + '</span>' : '';
    return '<div class="kd-missions"><div class="kd-title">🎮 ' + T('Tus misiones', 'Your missions') + '</div>' +
      '<div class="kd-mission"><div class="kd-mh"><span>🎯</span> ' + T('Misión 1 · Reto de conocimiento', 'Mission 1 · Knowledge challenge') + ' <em>30 %</em></div>' + m1 + '</div>' +
      '<div class="kd-mission"><div class="kd-mh"><span>🛠️</span> ' + T('Misión 2 · Mi proyecto', 'Mission 2 · My project') + ' <em>40 %</em></div>' + faces(key, 'e', r.execLevel, rb.e) + '</div>' +
      '<div class="kd-mission"><div class="kd-mh"><span>🏡</span> ' + T('Misión 3 · Mi comunidad y mi fe', 'Mission 3 · My community & faith') + ' <em>30 %</em></div>' + faces(key, 'l', r.localLevel, rb.l) + '</div>' +
      '<label class="kd-check"><input type="checkbox" ' + (r.by === 'supervisor' ? 'checked' : '') + ' ' + (locked ? 'disabled' : '') + ' onchange="elSetBy(\'' + key + '\',this.checked?\'supervisor\':\'self\')"> ' + T('Lo evaluó mi mentor o mi familia conmigo', 'My mentor or family assessed it with me') + '</label>' +
      res + '<div class="kd-actions">' + done + '<button class="kd-btn big" ' + (locked ? 'disabled' : '') + ' onclick="ELKid.submit(\'' + key + '\')">🚀 ' + T('¡Enviar mi misión!', 'Send my mission!') + '</button></div></div>';
  };
  K.submit = async function (key) { await window.elSubmit(key); var r = U[key]; if (r && r.weighted != null && C.unitMastery(r.weighted, false, null)) K.confetti(); K.paint(); };

  window.ELKid = K;
  window.addEventListener('DOMContentLoaded', function () {
    var host = $('route-bar'); if (host && !$('kid-hud-home')) { var d = document.createElement('div'); d.id = 'kid-hud-home'; host.parentNode.insertBefore(d, host); }
    K.paint();
  });
  var _renderHome = window.renderHome; window.renderHome = function () { _renderHome(); K.paint(); };
})();
