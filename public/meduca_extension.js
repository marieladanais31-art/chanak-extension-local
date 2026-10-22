/* Panamá / Latinoamérica: guías y programas OFICIALES de MEDUCA por grado (Español, Historia, Geografía, Ciencias Sociales y Cívica).
   Es aditivo: no cambia las unidades de Panamá; solo añade el acceso directo a las guías oficiales del grado. */
(function () {
  var U0 = window.ELUI, S = U0.S, esc = U0.esc, M = window.EL_MEDUCA;
  if (!M) return;
  var $ = function (id) { return document.getElementById(id); };
  var SUBJ = { espanol: ['📖', 'Español'], sociales: ['🌎', 'Ciencias Sociales (Historia, Geografía y Cívica)'], historia: ['🏛️', 'Historia'], geografia: ['🗺️', 'Geografía'], civica: ['⚖️', 'Cívica / Ética y valores'] };
  var ORDER = ['espanol', 'sociales', 'historia', 'geografia', 'civica'];
  var TRACK_SUBJ = { lengua: ['espanol'], historia_geo: ['sociales', 'historia', 'geografia', 'civica'] };
  function programLinks(g, kinds) {
    var out = [];
    if (g <= 6 && M.programs_primaria[g]) out.push({ t: 'Programa de estudio · ' + g + '.º grado (todas las asignaturas)', u: M.programs_primaria[g] });
    if (g >= 7 && g <= 9) kinds.forEach(function (k) { if (M.programs_premedia[k]) out.push({ t: 'Programa de ' + SUBJ[k][1] + ' · 7.º-9.º', u: M.programs_premedia[k] }); });
    return out;
  }
  function boxHtml(g, trackId) {
    var kinds = trackId ? TRACK_SUBJ[trackId] : ORDER, all = (M.guides[String(g)] || []);
    var rows = ORDER.filter(function (k) { return kinds.indexOf(k) >= 0; }).map(function (k) {
      var items = all.filter(function (x) { return x.k === k; });
      if (!items.length) return '';
      return '<li><b>' + SUBJ[k][0] + ' ' + esc(SUBJ[k][1]) + '</b><span>' + items.map(function (x) { return '<a href="' + esc(x.u) + '" target="_blank" rel="noopener noreferrer">' + (x.w === 'docente' ? '👩‍🏫 ' : '🎒 ') + esc(x.t) + ' ↗</a>'; }).join('') + '</span></li>';
    }).join('');
    var progs = programLinks(g, kinds).map(function (x) { return '<a href="' + esc(x.u) + '" target="_blank" rel="noopener noreferrer">📘 ' + esc(x.t) + ' ↗</a>'; }).join('');
    var missing = ORDER.filter(function (k) { return kinds.indexOf(k) >= 0 && !all.some(function (x) { return x.k === k; }); }).map(function (k) { return SUBJ[k][1]; });
    var note = (missing.length && g >= 10) ? '<p class="mdc-note">MEDUCA aún no publica en su portal guía de ' + esc(missing.join(', ')) + ' para ' + g + '.º grado; usa el programa oficial y las unidades de Chanak.</p>' : '';
    return '<div class="mdc" id="meduca-box"><h3>📘 Guías oficiales de MEDUCA · ' + g + '.º grado</h3>' +
      '<p class="mdc-sub">Las abre el portal oficial del Ministerio de Educación de Panamá. 🎒 = guía del estudiante · 👩‍🏫 = guía del docente / familia.</p>' +
      (rows ? '<ul class="mdc-list">' + rows + '</ul>' : '<p class="mdc-note">No hay guías de estas asignaturas en el portal para este grado.</p>') +
      (progs ? '<div class="mdc-prog">' + progs + '</div>' : '') + note +
      '<p class="mdc-sub"><a href="' + esc(M.portal) + '" target="_blank" rel="noopener noreferrer">Abrir el portal de Guías de Aprendizaje de MEDUCA ↗</a></p></div>';
  }
  function pickerHtml() {
    var o = '<option value="">— elige tu grado —</option>'; for (var g = 1; g <= 12; g++) o += '<option value="' + g + '">' + g + '.º grado</option>';
    return '<div class="mdc" id="meduca-box"><h3>📘 Guías oficiales de MEDUCA</h3><p class="mdc-sub">Elige tu grado para ver las guías de Español, Historia, Geografía y Cívica del Ministerio.</p><select onchange="elSetGrade(this.value)" class="mdc-sel">' + o + '</select></div>';
  }
  function decorate() {
    if (S.route !== 'pa') return;
    var old = $('meduca-box'); if (old) old.remove();
    var g = S.grade, unitView = $('view-unit') && $('view-unit').classList.contains('active');
    var host = unitView ? document.querySelector('#view-unit .lesson') : document.querySelector('#view-route .page-head');
    if (!host) return;
    var html = g ? boxHtml(g, S.track) : pickerHtml(), d = document.createElement('div'); d.innerHTML = html;
    if (unitView) host.insertBefore(d.firstChild, host.firstChild); else host.parentNode.insertBefore(d.firstChild, host.nextSibling);
  }
  ['elOpenRoute', 'elPickTrack', 'elSetGrade', 'elSetLang', 'elOpenUnit'].forEach(function (n) { var o = window[n]; if (!o) return; window[n] = function () { var r = o.apply(this, arguments); setTimeout(decorate, 90); return r; }; });
  window.ELMeduca = { decorate: decorate, box: boxHtml };
})();
