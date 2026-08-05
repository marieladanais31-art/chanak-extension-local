/* =====================================================================
   Chanak Extensión Local — APP LOGIC
   ===================================================================== */

const STAGE_ES = { Primaria:'primaria', ESO:'eso', Bachillerato:'bachillerato' };
const QUARTER_LABEL = { Q1:'Q1 · Octubre · Noviembre · Diciembre', Q2:'Q2 · Febrero · Marzo · Abril', Q3:'Q3 · Mayo · Junio · Julio' };
const MONTH_FULL = { Oct:'Octubre', Nov:'Noviembre', Dic:'Diciembre', Feb:'Febrero', Mar:'Marzo', Abr:'Abril', May:'Mayo', Jun:'Junio', Jul:'Julio' };
const MONTH_Q = { Oct:'Q1', Nov:'Q1', Dic:'Q1', Feb:'Q2', Mar:'Q2', Abr:'Q2', May:'Q3', Jun:'Q3', Jul:'Q3' };
const COINS_PER_MONTH = 20;
const COINS_PER_WEEK = 5;
/* EL_CAPSULES (opcional, cargado por grado, ej. data-capsules-eso1.js) es un
   mapa "gid:mo:week" -> {title, steps[]}. Si no existe para una semana, esa
   sesión se muestra como texto plano (comportamiento previo). */
function capsuleFor(gid,mo,week){
  return (typeof EL_CAPSULES !== 'undefined' && EL_CAPSULES[gid+':'+mo+':'+week]) || null;
}

/* ---------- Progress (localStorage) ---------- */
const LS = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
let PROG = LS.get('chanak_el_progress') || { coins:0, done:{}, doneWeek:{} };
if(!PROG.doneWeek) PROG.doneWeek = {};
function saveProg(){ LS.set('chanak_el_progress', PROG); }
function updateCoins(){ document.getElementById('coinCount').textContent = PROG.coins; }

/* ---------- Views ---------- */
const STATE = { grade:null, monthKey:null, capsule:null, step:0 };
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
  const weekCards = m.sessions.map((s,i)=>{
    const week = i+1, cap = capsuleFor(gid,mo,week), wkey = gid+':'+mo+':'+week;
    if(cap){
      const done = PROG.doneWeek && PROG.doneWeek[wkey];
      return `<div class="wcard" onclick="openCapsule('${gid}','${mo}',${week})">
        <span class="wk-num">SEMANA ${week}</span>
        <h5>${cap.title}</h5><p>${s.length>90?s.slice(0,90)+'…':s}</p>
        <div class="wk-foot">${done?'<span class="chip done">Completado</span>':'<span class="chip soon">▶ Empezar</span>'}<span style="margin-left:auto;color:var(--muted)">+${COINS_PER_WEEK} 🪙</span></div>
      </div>`;
    }
    return `<div class="wcard plain"><span class="wk-num">SEMANA ${week}</span><h5>Sesión ${week}</h5><p>${s}</p></div>`;
  }).join('');
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
      <p class="lsub">Cada sesión dura 60–75 min. Estructura: apertura (versículo) · lectura/investigación · actividad principal · conexión cristiana · cierre. Toca una semana para trabajarla paso a paso.</p>
      <div class="week-grid">${weekCards}</div>
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

/* =====================================================================
   MOTOR DE CÁPSULA SEMANAL (hook → teoría → quiz/relaciona → reflexión)
   ===================================================================== */
function openCapsule(gid, mo, week){
  const cap = capsuleFor(gid, mo, week);
  if(!cap) return;
  STATE.capsule = {gid, mo, week}; STATE.step = 0;
  const g = EL_GRADES.find(x=>x.id===gid);
  document.getElementById('cap-eyebrow').textContent = `${g.label} · ${MONTH_FULL[mo]} · Semana ${week}`;
  document.getElementById('cap-title').textContent = cap.title;
  document.getElementById('cap-back').onclick = ()=>openLesson(gid, mo);

  const all = cap.steps;
  document.getElementById('cap-steps').innerHTML = all.map((s,i)=>renderStep(s,i,all.length)).join('');
  gotoStep(0); showView('capsule'); bindInteractions(cap);
}

function renderStep(s,i,total){
  let inner='';
  if(s.type==='hook') inner=`<div class="scenario">${s.scenario}</div><p>${s.body}</p>`;
  else if(s.type==='theory') inner=`<p>${s.body}</p>${s.diagram?`<div class="diagram">${s.diagram}</div>`:''}`;
  else if(s.type==='quiz') inner=`<p>${s.q}</p><div class="opts">${s.opts.map(o=>`<button class="opt" data-ok="${o.ok}" data-step="${i}">${o.t}</button>`).join('')}</div><div class="feedback" id="fb-${i}"></div>`;
  else if(s.type==='match') inner=`<p>Arrastra cada tarjeta a su categoría.</p><div class="match-wrap"><div class="pool">${s.pool.map(p=>`<div class="drag" draggable="true" data-id="${p.id}">${p.t}</div>`).join('')}</div><div class="targets">${s.targets.map(t=>`<div class="target" data-ans="${t.ans}"><b>${t.label}</b></div>`).join('')}</div></div><div class="feedback" id="fb-${i}"></div>`;
  else if(s.type==='reflect') inner=`<p>${s.body}</p><textarea placeholder="${(s.prompt||'').replace(/"/g,'&quot;')}"></textarea>`;
  return `<div class="step" data-step="${i}"><div class="kicker">${s.kicker} · paso ${i+1} de ${total}</div><h3>${s.h}</h3>${inner}${navHtml(i,total)}</div>`;
}
function navHtml(i,total){
  const isLast = i===total-1;
  const backBtn = `<button class="btn ghost" ${i===0?'style="visibility:hidden"':''} onclick="prevStep()">← Atrás</button>`;
  const nextBtn = isLast
    ? `<button class="btn primary" onclick="finishCapsule()">Completar cápsula</button>`
    : `<button class="btn primary" onclick="nextStep()">Continuar →</button>`;
  return `<div class="step-nav">${backBtn}${nextBtn}</div>`;
}
function gotoStep(n){
  const steps = document.querySelectorAll('#cap-steps .step');
  steps.forEach(s=>s.classList.remove('active'));
  if(steps[n]) steps[n].classList.add('active');
  STATE.step = n;
  document.getElementById('cap-bar').style.width = (n/(steps.length-1)*100)+'%';
  window.scrollTo({top:0,behavior:'smooth'});
}
function nextStep(){ gotoStep(STATE.step+1); }
function prevStep(){ gotoStep(STATE.step-1); }

function bindInteractions(cap){
  document.querySelectorAll('#cap-steps .opt').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const stepIdx = btn.dataset.step, parent = btn.closest('.opts');
      parent.querySelectorAll('.opt').forEach(b=>b.disabled=true);
      const ok = btn.dataset.ok==='true';
      btn.classList.add(ok?'correct':'wrong');
      const s = cap.steps[stepIdx], fb = document.getElementById('fb-'+stepIdx);
      fb.textContent = ok ? s.okMsg : s.noMsg;
      fb.className = 'feedback show '+(ok?'ok':'no');
      if(!ok) parent.querySelectorAll('.opt').forEach(b=>{ if(b.dataset.ok==='true') b.classList.add('correct'); });
    });
  });
  let dragged=null;
  document.querySelectorAll('#cap-steps .drag').forEach(d=>{
    d.addEventListener('dragstart',()=>{dragged=d;d.classList.add('dragging');});
    d.addEventListener('dragend',()=>{d.classList.remove('dragging');dragged=null;});
  });
  document.querySelectorAll('#cap-steps .target').forEach(t=>{
    t.addEventListener('dragover',e=>{e.preventDefault();t.classList.add('over');});
    t.addEventListener('dragleave',()=>t.classList.remove('over'));
    t.addEventListener('drop',e=>{
      e.preventDefault();t.classList.remove('over');if(!dragged)return;
      const correct = t.dataset.ans===dragged.dataset.id, label = t.querySelector('b').textContent;
      t.innerHTML = `<b>${label}</b><div class="placed">${dragged.textContent} ${correct?'✓':'✕'}</div>`;
      t.classList.add('filled'); dragged.remove();
      const targets = t.closest('.match-wrap').querySelectorAll('.target');
      if([...targets].every(x=>x.classList.contains('filled'))){
        const si = t.closest('.step').dataset.step, fb = document.getElementById('fb-'+si);
        const allRight = [...targets].every(x=>x.querySelector('.placed').textContent.includes('✓'));
        fb.textContent = allRight ? cap.steps[si].okMsg : 'Casi. Revisa los que tienen ✕ e inténtalo de nuevo.';
        fb.className = 'feedback show '+(allRight?'ok':'no');
      }
    });
  });
}

function finishCapsule(){
  const {gid, mo, week} = STATE.capsule;
  const key = gid+':'+mo+':'+week;
  const cap = capsuleFor(gid, mo, week);
  if(!PROG.doneWeek[key]){ PROG.doneWeek[key]=true; PROG.coins+=COINS_PER_WEEK; saveProg(); updateCoins(); }
  document.getElementById('cap-steps').innerHTML = `<div class="step active done-card">
    <div class="medal">🏅</div><h3>¡Cápsula completada!</h3>
    <div class="coins-earned">🪙 +${COINS_PER_WEEK} ChanakCoins</div>
    <p>${cap.title}. Este trabajo te acerca al entregable del mes.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button class="btn primary" onclick="openLesson('${gid}','${mo}')">Volver al mes</button>
      <button class="btn ghost" onclick="showView('home')">Ir al inicio</button></div></div>`;
  document.getElementById('cap-bar').style.width='100%';
  window.scrollTo({top:0,behavior:'smooth'});
}
