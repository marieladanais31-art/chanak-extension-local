/* =====================================================================
   Chanak Extensión Local — APP LOGIC
   ===================================================================== */

const STAGE_ES = { Primaria:'primaria', ESO:'eso', Bachillerato:'bachillerato' };
const QUARTER_LABEL = { Q1:'Q1 · Octubre · Noviembre · Diciembre', Q2:'Q2 · Febrero · Marzo · Abril', Q3:'Q3 · Mayo · Junio · Julio' };
const MONTH_FULL = { Oct:'Octubre', Nov:'Noviembre', Dic:'Diciembre', Feb:'Febrero', Mar:'Marzo', Abr:'Abril', May:'Mayo', Jun:'Junio', Jul:'Julio' };
const MONTH_Q = { Oct:'Q1', Nov:'Q1', Dic:'Q1', Feb:'Q2', Mar:'Q2', Abr:'Q2', May:'Q3', Jun:'Q3', Jul:'Q3' };
const COINS_PER_MONTH = 20;

/* ---------- Progress (localStorage) ---------- */
const LS = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
let PROG = LS.get('chanak_el_progress') || { coins:0, done:{} };
function saveProg(){ LS.set('chanak_el_progress', PROG); }
function updateCoins(){ document.getElementById('coinCount').textContent = PROG.coins; }

/* ---------- Views ---------- */
const STATE = { grade:null, monthKey:null };
function showView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- HOME ---------- */
function gradeCard(g){
  const stageClass = STAGE_ES[g.stage] || 'primaria';
  return `<div class="gcard" onclick="openGrade('${g.id}')">
    <span class="stage-tag ${stageClass}">${g.stage}</span>
    <span class="age">${g.age} años</span>
    <h4>${g.label}</h4>
    <p>${g.desc.split('.')[0]}.</p>
  </div>`;
}
function renderHome(){
  const stages = [['Primaria','Primaria'],['ESO','ESO'],['Bachillerato','Bachillerato']];
  const html = stages.map(([key,label])=>{
    const grades = EL_GRADES.filter(g=>g.stage===key);
    return `<div class="section-label"><h3>${label}</h3></div><div class="grid">${grades.map(gradeCard).join('')}</div>`;
  }).join('');
  document.getElementById('grade-sections').innerHTML = html;
}

/* ---------- SEARCH (home) ---------- */
const norm = (s) => (s||'').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

function buildIndex(){
  const idx = [];
  EL_GRADES.forEach(g=>{
    g.months.forEach(m=>{
      idx.push({
        gid:g.id, glabel:g.label, mo:m.mo, area:m.area, tema:m.tema,
        hay:[g.label,g.stage,m.area,m.tema,...m.contenidos,m.deliverable,...m.sessions].join(' ')
      });
    });
  });
  return idx;
}
let SEARCH_IDX = null;
function idx(){ if(!SEARCH_IDX) SEARCH_IDX = buildIndex(); return SEARCH_IDX; }

function runSearch(){
  const q = document.getElementById('search-input').value;
  const terms = norm(q).split(' ').filter(Boolean);
  const out = document.getElementById('search-results-home');
  const sections = document.getElementById('grade-sections');
  if(!terms.length){ out.innerHTML=''; sections.style.display='block'; return; }
  sections.style.display='none';
  const results = idx().map(x=>{
    const h = norm(x.hay), t = norm(x.tema);
    let score=0;
    terms.forEach(term=>{ if(t.includes(term)) score+=10; if(h.includes(term)) score+=2; });
    return {x,score};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).map(r=>r.x);
  if(!results.length){
    out.innerHTML = `<div class="s-empty"><span>🔍</span><p>No encontramos nada con esa palabra. Prueba con otro tema, mes o grado.</p></div>`;
    return;
  }
  out.innerHTML = `<div class="section-label"><h3>${results.length} resultados</h3></div><div class="grid">` +
    results.slice(0,40).map(x=>`
      <div class="mcard" onclick="openLesson('${x.gid}','${x.mo}')">
        <span class="mo">${MONTH_FULL[x.mo]}</span><span class="area-tag">${x.area}</span>
        <h4>${x.tema}</h4>
        <div class="foot"><span class="status">${x.glabel} →</span></div>
      </div>`).join('') + '</div>';
}

/* ---------- GRADE ---------- */
function openGrade(gid){
  STATE.grade = gid;
  const g = EL_GRADES.find(x=>x.id===gid);
  document.getElementById('gr-eyebrow').textContent = `${g.stage} · ${g.age} años · Extensión Local`;
  document.getElementById('gr-title').textContent = g.label;
  document.getElementById('gr-desc').textContent = g.desc;
  document.getElementById('gr-subjects').innerHTML =
    ['Lengua Castellana y Literatura','Historia de España','Geografía'].map(s=>`<span class="subj">${s}</span>`).join('');

  const quarters = ['Q1','Q2','Q3'];
  document.getElementById('gr-quarters').innerHTML = quarters.map(q=>{
    const months = g.months.filter(m=>MONTH_Q[m.mo]===q);
    return `<div class="quarter-block">
      <div class="quarter-head"><span class="qid">${QUARTER_LABEL[q]}</span></div>
      <div class="grid">${months.map(m=>{
        const key = gid+':'+m.mo;
        const done = PROG.done[key] ? `<span class="chip done">Completado</span>` : '';
        return `<div class="mcard" onclick="openLesson('${gid}','${m.mo}')">
          <span class="mo">${MONTH_FULL[m.mo]}</span><span class="area-tag">${m.area}</span>
          <h4>${m.tema}</h4>
          <div class="foot">${done}<span class="status">+${COINS_PER_MONTH} 🪙</span></div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }).join('');
  showView('grade');
}

/* ---------- LESSON (mes) ---------- */
function openLesson(gid,mo){
  STATE.grade = gid; STATE.monthKey = gid+':'+mo;
  const g = EL_GRADES.find(x=>x.id===gid);
  const m = g.months.find(x=>x.mo===mo);
  const key = gid+':'+mo;

  document.getElementById('ls-back').onclick = ()=>openGrade(gid);

  const bullets = m.contenidos.map(c=>`<li>${c}</li>`).join('');
  const sessions = m.sessions.map((s,i)=>`<div class="session"><b>S${i+1}</b><span>${s}</span></div>`).join('');
  const codes = m.codes.map(c=>`<span class="code-pill"><b>${c}</b> · ${EL_COMPETENCY_NAMES[c]||c}</span>`).join('');

  const marked = PROG.done[key];
  document.getElementById('lesson-body').innerHTML = `
    <div class="lhead">
      <div class="lo-mo">${g.label} · ${MONTH_FULL[m.mo]} · ${m.area}</div>
      <h2>${m.tema}</h2>
      <div class="lverse">“${m.verse}”<span>${m.ref}</span></div>
    </div>

    <div class="lsec">
      <h3>📘 Contenidos del mes</h3>
      <ul class="bullets">${bullets}</ul>
    </div>

    <div class="lsec">
      <h3>🗓️ Las 4 sesiones semanales</h3>
      <p class="lsub">Cada sesión dura 60–75 min. Estructura: apertura (versículo) · lectura/investigación · actividad principal · conexión cristiana · cierre.</p>
      <div class="sessions">${sessions}</div>
    </div>

    <div class="taskbox">
      <div class="tb-head">
        <span class="tb-badge">📦</span>
        <div><h3>Tu próxima tarea a entregar</h3><p>Esto es exactamente lo que tienes que producir este mes.</p></div>
      </div>
      <div class="tb-block">
        <h4>✅ Qué tienes que producir</h4>
        <div class="tb-produce">${m.deliverable}</div>
      </div>
      <div class="tb-block">
        <h4>📊 Cómo se te evalúa (100 pts)</h4>
        <div class="tb-rubric">
          <div class="tb-r"><div class="tb-r-top"><b>Conocimiento</b><span>30 pts</span></div><div class="tb-r-bar"><i style="width:30%"></i></div><p>${m.rubric.c}</p></div>
          <div class="tb-r"><div class="tb-r-top"><b>Ejecución</b><span>40 pts</span></div><div class="tb-r-bar"><i style="width:40%"></i></div><p>${m.rubric.e}</p></div>
          <div class="tb-r"><div class="tb-r-top"><b>Conexión local y fe</b><span>30 pts</span></div><div class="tb-r-bar"><i style="width:30%"></i></div><p>${m.rubric.l}</p></div>
        </div>
      </div>
      <div class="tb-block">
        <h4>🎓 Competencias clave LOMLOE</h4>
        <div class="codes-row">${codes}</div>
      </div>
      <button class="btn ${marked?'ghost':'primary'} full" onclick="markMonth('${key}')" id="tb-mark">
        ${marked ? 'Completado ✓' : 'Marcar como completado (+'+COINS_PER_MONTH+' 🪙)'}
      </button>
    </div>
  `;
  showView('lesson');
}

function markMonth(key){
  const wasDone = !!PROG.done[key];
  PROG.done[key] = !wasDone;
  PROG.coins += wasDone ? -COINS_PER_MONTH : COINS_PER_MONTH;
  if(PROG.coins < 0) PROG.coins = 0;
  saveProg(); updateCoins();
  const b = document.getElementById('tb-mark');
  if(b){
    b.textContent = PROG.done[key] ? 'Completado ✓' : `Marcar como completado (+${COINS_PER_MONTH} 🪙)`;
    b.className = 'btn '+(PROG.done[key]?'ghost':'primary')+' full';
  }
}

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  updateCoins();
  renderHome();
  showView('home');
});
