/**
 * TrainerSync demo – navigation, HR simulator, exercise library, gym map.
 * Loads exercise-data.json from the main app's assets folder.
 */
const DATA_URL  = "./assets/exercise-data.json";
const ASSET_ROOT = "./";

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  page: "p1",
  exerciseData: [],
  selectedExercise: "",
  filters: { muscle: "all", equipment: "all", search: "" },
  live: { hr: 142, elapsed: 22, setNum: 3, setTotal: 5 },
  loaded: false,
  hrSimInterval: null,
  hrTarget: 142,
  hrHistory: Array.from({length:60}, (_,i)=>
    Math.round(130 + Math.sin(i*0.18)*14 + Math.sin(i*0.07)*8 + (Math.random()-0.5)*4)
  ),

  trainees: [
    { id:"me",  name:"Na Li",     initials:"NL", role:"user",  exerciseId:"", exerciseName:"—",
      setInfo:"—", hr:142, status:"normal",
      dotColor:"#41b4ff", dotBg:"rgba(65,180,255,.85)", x:0,y:0, pos:null, online:true },
    { id:"xm",  name:"Xiao Ming", initials:"XM", role:"buddy",
      exerciseId:"eq_seated_chest_press", exerciseName:"Seated Chest Press",
      setInfo:"Set 3 / 5", hr:142, status:"normal",
      dotColor:"#ff6b6b", dotBg:"rgba(255,107,107,.9)", x:36.21,y:64.57,
      pos:{x:36.21,y:64.57}, online:true },
    { id:"xh",  name:"Xiao Hong", initials:"XH", role:"buddy",
      exerciseId:"eq_seated_leg_press", exerciseName:"Seated Leg Press",
      setInfo:"Set 4 / 5", hr:162, status:"alert",
      dotColor:"#ffd166", dotBg:"rgba(255,209,102,.9)", x:27.80,y:54.96,
      pos:{x:27.80,y:54.96}, online:true },
    { id:"xg",  name:"Xiao Gang", initials:"XG", role:"buddy",
      exerciseId:"eq_lat_pulldown", exerciseName:"Lat Pulldown",
      setInfo:"Resting", hr:78, status:"normal",
      dotColor:"#a29bfe", dotBg:"rgba(162,155,254,.9)", x:62.15,y:68.12,
      pos:{x:62.15,y:68.12}, online:true },
  ],
};

// ── DOM refs ───────────────────────────────────────────────────────────────

const phoneFrame  = document.getElementById("phoneFrame");
const phoneScreen = document.getElementById("phoneScreen");
const toast       = document.getElementById("toast");
const emojiOverlay= document.getElementById("emojiOverlay");
const allPages    = [...document.querySelectorAll(".page")];

// ── Utility ────────────────────────────────────────────────────────────────

function toAssetWebPath(p) { return String(p||"").replace(/\\/g,"/"); }
function resolveAssetUrl(rel) {
  rel = toAssetWebPath(rel).replace(/^\//,"");
  return rel ? ASSET_ROOT+rel : "";
}
function safeMediaPath(p) {
  const n = toAssetWebPath(p);
  return n && !n.endsWith("/") ? n : "";
}
function cap(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }

function mapTargetToFilter(g) {
  return ({chest:"chest",back:"back",legs_glutes:"legs",
           core:"core",arms:"arms",shoulders:"shoulders"})[g]||"other";
}
function formatProgramming(p) {
  if (!p||!p.beginner||!p.advanced) return "";
  const b=p.beginner, a=p.advanced;
  return `Beginner: ${b.sets}×${b.reps} @ RPE${b.rpe}  ·  Advanced: ${a.sets}×${a.reps} @ RPE${a.rpe}`;
}
function pickEquipmentRecord(ex, byId) {
  const cands = (ex.equipment_ids||[]).map(id=>byId[id]).filter(Boolean);
  if (!cands.length) return null;
  return cands.find(eq=>eq.ex_gif_paths&&eq.ex_gif_paths[ex.id])
      || cands.find(eq=>eq.ex_paths&&eq.ex_paths[ex.id])
      || cands[0];
}
function inferEquipmentCategory(id) {
  if (!id) return "machine";
  if (id.includes("cable")) return "cable";
  if (id.includes("free_weight")) return "free_weight";
  return "machine";
}
function prettifyEquipmentName(id) {
  return String(id||"").replace(/^eq_/,"").split("_")
    .map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(" ");
}
function buildFallbackEquipmentById(exercises) {
  const ids = new Set();
  exercises.forEach(ex=>(ex.equipment_ids||[]).forEach(id=>ids.add(id)));
  const out={};
  ids.forEach(id=>{
    out[id]={ id, name:prettifyEquipmentName(id), category:inferEquipmentCategory(id),
      path:`assets/equipment/${id}/${id}.jpeg`, ex_paths:{}, ex_gif_paths:{} };
  });
  exercises.forEach(ex=>{
    (ex.equipment_ids||[]).forEach(id=>{
      if (out[id]) out[id].ex_paths[ex.id]=`assets/equipment/${id}/${ex.id}.jpeg`;
    });
  });
  return out;
}
function buildExerciseList(data) {
  const muscles  = data.muscles||[];
  const equip    = data.equipment||[];
  const exercises= data.exercises||[];
  const muscleById = Object.fromEntries(muscles.map(m=>[m.id,m]));
  const equipById  = Object.assign({},
    buildFallbackEquipmentById(exercises),
    Object.fromEntries(equip.map(e=>[e.id,e]))
  );
  return exercises.map(ex=>{
    const eq = pickEquipmentRecord(ex, equipById);
    if (!eq) return null;
    const primaryId = (ex.primary_muscle_ids||[])[0]||"";
    const muscleDoc = muscleById[primaryId];
    const muscleKey = mapTargetToFilter(muscleDoc?.target_group||"");
    const muscleLabel = muscleDoc?.name||cap(muscleKey);
    const gifRaw = eq.ex_gif_paths&&eq.ex_gif_paths[ex.id];
    const level = ex.programming?.beginner
      ? `Beginner ${ex.programming.beginner.sets}×${ex.programming.beginner.reps}` : "—";
    return {
      id:ex.id, name:ex.name, muscle:muscleKey, muscleLabel,
      equipment:eq.category, equipmentLabel:eq.name, level,
      how:ex.instructions||ex.description||"",
      breathing:formatProgramming(ex.programming),
      media:{
        equipmentImg:resolveAssetUrl(eq.path),
        exerciseImg :resolveAssetUrl(eq.ex_paths[ex.id]),
        exerciseGif :gifRaw?resolveAssetUrl(gifRaw):"",
      },
      searchHaystack:[ex.name,ex.description||"",ex.instructions||"",muscleLabel,eq.name,
        ...(ex.movement_pattern||[])].join(" ").toLowerCase(),
    };
  }).filter(Boolean);
}

// ── HR Simulator ──────────────────────────────────────────────────────────

function getZone(hr) {
  return hr<120?"blue":hr<=150?"green":"red";
}

function updateHRUI(hr) {
  const zone  = getZone(hr);
  const colors = { blue:"var(--z-blue)", green:"var(--z-green)", red:"var(--z-red)" };
  const labels = { blue:"Below Zone — Pick up pace", green:"In Target Zone", red:"High Intensity — Ease off" };
  const anns   = {
    blue :"Breathing lamp: BLUE · 2s pulse · speed up",
    green:"Breathing lamp: GREEN · 3s pulse · maintain zone",
    red  :"Breathing lamp: RED · 4s pulse · ease off",
  };
  const bthCls = { blue:"bth-blue", green:"bth-green", red:"bth-red" };
  const pct    = Math.min(100, Math.round((hr-40)/(200-40)*100));
  const col    = colors[zone];

  const ring = document.getElementById("hrRing");
  if (ring) ring.style.background=`conic-gradient(${col} 0 ${pct}%, var(--s3) ${pct}% 100%)`;

  const num = document.getElementById("hrNum");
  if (num) { num.textContent=hr; num.style.color=col; }

  const lbl = document.getElementById("hrZoneLabel");
  if (lbl) { lbl.textContent=labels[zone]; lbl.style.color=col; }

  const hint = document.getElementById("breathHint");
  if (hint) { hint.textContent=anns[zone]; hint.style.borderLeftColor=col; }

  const p3c = document.getElementById("p3Content");
  if (p3c) p3c.className=`content ${bthCls[zone]}`;

  const me = state.trainees.find(t=>t.id==="me");
  if (me) { me.hr=hr; me.status=zone==="red"?"alert":"normal"; }

  renderHRMiniChart();
}

function tickHR() {
  const noise = (Math.random()-0.5)*4;
  const drift = (state.hrTarget-state.live.hr)*0.08;
  state.live.hr = Math.round(Math.max(50,Math.min(195,state.live.hr+noise+drift)));
  state.hrTarget += (Math.random()-0.48)*1.5;
  state.hrTarget  = Math.max(110,Math.min(165,state.hrTarget));
  state.hrHistory.push(state.live.hr);
  if (state.hrHistory.length > 60) state.hrHistory.shift();
  updateHRUI(state.live.hr);
}

function startHRSim() {
  if (state.hrSimInterval) return;
  updateHRUI(state.live.hr);
  state.hrSimInterval = setInterval(tickHR, 1000);
}
function stopHRSim() {
  if (state.hrSimInterval) { clearInterval(state.hrSimInterval); state.hrSimInterval=null; }
}

// ── Set dots ──────────────────────────────────────────────────────────────

function updateSetDots() {
  const c = document.getElementById("setDots");
  if (!c) return;
  c.innerHTML="";
  for (let i=1;i<=state.live.setTotal;i++) {
    const d = document.createElement("div");
    d.className = i<state.live.setNum?"sdot done":i===state.live.setNum?"sdot cur":"sdot";
    c.appendChild(d);
  }
}

function updateElapsed() {
  const el = document.getElementById("elapsedValue");
  if (el) el.textContent=`${state.live.elapsed}m`;
}

// ── P4 HR Chart ───────────────────────────────────────────────────────────

function renderHRChart() {
  const svg = document.getElementById("hrChart");
  if (!svg) return;

  const W = 340, H = 80, PAD_L = 28, PAD_R = 8, PAD_T = 6, PAD_B = 14;
  const CW = W - PAD_L - PAD_R, CH = H - PAD_T - PAD_B;
  const HR_MIN = 80, HR_MAX = 185;

  // Simulated HR data: 31 points over 45 min
  const raw = [
    88,102,115,124,132,138,142,145,148,150,
    152,158,162,168,160,155,148,142,138,135,
    130,128,132,138,142,145,148,150,145,138,130
  ];

  function zoneColor(hr) {
    return hr < 120 ? "#3b82f6" : hr <= 150 ? "#22c55e" : "#ef4444";
  }
  function toX(i) { return PAD_L + (i / (raw.length - 1)) * CW; }
  function toY(hr) { return PAD_T + CH - ((hr - HR_MIN) / (HR_MAX - HR_MIN)) * CH; }

  let out = "";

  // Zone band backgrounds
  const y120 = toY(120), y150 = toY(150);
  out += `<rect x="${PAD_L}" y="${PAD_T}" width="${CW}" height="${y150 - PAD_T}" fill="rgba(239,68,68,0.06)" rx="2"/>`;
  out += `<rect x="${PAD_L}" y="${y150}" width="${CW}" height="${y120 - y150}" fill="rgba(34,197,94,0.06)" rx="2"/>`;
  out += `<rect x="${PAD_L}" y="${y120}" width="${CW}" height="${PAD_T + CH - y120}" fill="rgba(59,130,246,0.06)" rx="2"/>`;

  // Zone boundary lines
  out += `<line x1="${PAD_L}" y1="${y150}" x2="${W - PAD_R}" y2="${y150}" stroke="rgba(34,197,94,0.25)" stroke-width="1" stroke-dasharray="3,3"/>`;
  out += `<line x1="${PAD_L}" y1="${y120}" x2="${W - PAD_R}" y2="${y120}" stroke="rgba(59,130,246,0.25)" stroke-width="1" stroke-dasharray="3,3"/>`;

  // Y-axis labels
  out += `<text x="${PAD_L - 4}" y="${y150 + 3}" text-anchor="end" font-size="8" fill="rgba(34,197,94,0.7)" font-family="JetBrains Mono,monospace">150</text>`;
  out += `<text x="${PAD_L - 4}" y="${y120 + 3}" text-anchor="end" font-size="8" fill="rgba(59,130,246,0.7)" font-family="JetBrains Mono,monospace">120</text>`;

  // Smooth curve segments — split by zone color changes
  // Build cubic bezier path per segment between consecutive same-zone pairs
  function cpX(i, dir) { return toX(i) + dir * (CW / (raw.length - 1)) * 0.4; }

  // Draw one smooth path per color run
  let i = 0;
  while (i < raw.length - 1) {
    const col = zoneColor(raw[i]);
    let j = i + 1;
    while (j < raw.length && zoneColor(raw[j]) === col) j++;
    // segment from i to j-1 (may be just one step)
    let d = `M ${toX(i)} ${toY(raw[i])}`;
    for (let k = i; k < j - 1; k++) {
      const x1 = cpX(k, 1), y1 = toY(raw[k]);
      const x2 = cpX(k + 1, -1), y2 = toY(raw[k + 1]);
      d += ` C ${x1} ${y1}, ${x2} ${y2}, ${toX(k + 1)} ${toY(raw[k + 1])}`;
    }
    out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    i = j - 1;
  }

  // Dots — every other point to avoid clutter
  raw.forEach((hr, i) => {
    if (i % 2 !== 0) return;
    const col = zoneColor(hr);
    out += `<circle cx="${toX(i)}" cy="${toY(hr)}" r="3" fill="${col}" stroke="var(--s1)" stroke-width="1.5"/>`;
  });

  svg.innerHTML = out;
}

// ── C3 Live HR Mini-Chart ─────────────────────────────────────────────────

function renderHRMiniChart() {
  const svg = document.getElementById("hrMiniChart");
  if (!svg) return;

  const W = 280, H = 52, PAD_L = 26, PAD_R = 4, PAD_T = 4, PAD_B = 10;
  const CW = W - PAD_L - PAD_R, CH = H - PAD_T - PAD_B;
  const HR_MIN = 80, HR_MAX = 185;

  const data = state.hrHistory.length >= 2 ? state.hrHistory : Array(60).fill(state.live.hr);

  function zoneColor(hr) {
    return hr < 120 ? "#3b82f6" : hr <= 150 ? "#22c55e" : "#ef4444";
  }
  function toX(i) { return PAD_L + (i / (data.length - 1)) * CW; }
  function toY(hr) { return PAD_T + CH - ((hr - HR_MIN) / (HR_MAX - HR_MIN)) * CH; }

  let out = "";

  const y120 = toY(120), y150 = toY(150);
  out += `<rect x="${PAD_L}" y="${PAD_T}" width="${CW}" height="${Math.max(0,y150-PAD_T)}" fill="rgba(239,68,68,0.05)" rx="1"/>`;
  out += `<rect x="${PAD_L}" y="${y150}" width="${CW}" height="${Math.max(0,y120-y150)}" fill="rgba(34,197,94,0.05)" rx="1"/>`;
  out += `<rect x="${PAD_L}" y="${y120}" width="${CW}" height="${Math.max(0,PAD_T+CH-y120)}" fill="rgba(59,130,246,0.05)" rx="1"/>`;

  out += `<line x1="${PAD_L}" y1="${y150}" x2="${W-PAD_R}" y2="${y150}" stroke="rgba(34,197,94,0.2)" stroke-width="1" stroke-dasharray="2,2"/>`;
  out += `<line x1="${PAD_L}" y1="${y120}" x2="${W-PAD_R}" y2="${y120}" stroke="rgba(59,130,246,0.2)" stroke-width="1" stroke-dasharray="2,2"/>`;

  out += `<text x="${PAD_L-3}" y="${y150+3}" text-anchor="end" font-size="7" fill="rgba(34,197,94,0.6)" font-family="JetBrains Mono,monospace">150</text>`;
  out += `<text x="${PAD_L-3}" y="${y120+3}" text-anchor="end" font-size="7" fill="rgba(59,130,246,0.6)" font-family="JetBrains Mono,monospace">120</text>`;

  let i = 0;
  const step = CW / (data.length - 1);
  while (i < data.length - 1) {
    const col = zoneColor(data[i]);
    let j = i + 1;
    while (j < data.length && zoneColor(data[j]) === col) j++;
    let d = `M ${toX(i)} ${toY(data[i])}`;
    for (let k = i; k < j - 1; k++) {
      const cx1 = toX(k) + step * 0.4;
      const cx2 = toX(k+1) - step * 0.4;
      d += ` C ${cx1} ${toY(data[k])}, ${cx2} ${toY(data[k+1])}, ${toX(k+1)} ${toY(data[k+1])}`;
    }
    out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    i = j - 1;
  }

  const last = data[data.length - 1];
  const lastCol = zoneColor(last);
  out += `<circle cx="${toX(data.length-1)}" cy="${toY(last)}" r="3" fill="${lastCol}" stroke="#111114" stroke-width="1.5"/>`;
  out += `<text x="${W-PAD_R-4}" y="${toY(last)-5}" text-anchor="end" font-size="8" fill="${lastCol}" font-weight="700" font-family="JetBrains Mono,monospace">${last}</text>`;

  out += `<text x="${PAD_L}" y="${H}" text-anchor="start" font-size="7" fill="rgba(180,180,200,0.4)" font-family="JetBrains Mono,monospace">−60s</text>`;
  out += `<text x="${W-PAD_R}" y="${H}" text-anchor="end" font-size="7" fill="rgba(180,180,200,0.4)" font-family="JetBrains Mono,monospace">now</text>`;

  svg.innerHTML = out;
}

// ── Navigation ─────────────────────────────────────────────────────────────

const COACH_PAGES = new Set(["c1","c2","c3","c4","c4b"]);

function go(pageId) {
  if (!pageId) return;

  // Stop HR sim when leaving P3
  if (state.page==="p3" && pageId!=="p3") stopHRSim();

  state.page = pageId;
  allPages.forEach(el=>el.classList.toggle("active", el.id===pageId));

  if (phoneScreen) phoneScreen.scrollTop=0;
  if (phoneFrame)  phoneFrame.classList.toggle("coach-mode", COACH_PAGES.has(pageId));

  // Page-specific init
  if (pageId==="p3") {
    syncLiveHeader();
    updateSetDots();
    updateElapsed();
    startHRSim();
  }
  if (pageId==="p4") renderHRChart();
  if (pageId==="c3") { renderHRMiniChart(); startHRSim(); }
  if (pageId==="p5a"||pageId==="p5b") updateGymMap();
  if (pageId==="p2") renderExerciseDetail();
}

// ── Toast & Emoji burst ───────────────────────────────────────────────────

function showToast(msg) {
  if (!toast) return;
  toast.textContent=msg;
  toast.classList.add("show");
  clearTimeout(window._toastT);
  window._toastT=setTimeout(()=>toast.classList.remove("show"),2600);
}

function emojiBurst(emoji) {
  if (!emojiOverlay) return;
  emojiOverlay.innerHTML="";
  for (let i=0;i<16;i++) {
    const s=document.createElement("span");
    s.className="emoji-float";
    s.textContent=emoji;
    s.style.left=`${8+Math.random()*80}%`;
    s.style.bottom=`${8+Math.random()*18}%`;
    s.style.animationDelay=`${Math.random()*0.3}s`;
    emojiOverlay.appendChild(s);
  }
  clearTimeout(window._emojiT);
  window._emojiT=setTimeout(()=>{emojiOverlay.innerHTML="";},1800);
}

// ── Gym Map ───────────────────────────────────────────────────────────────

function syncUserTraineePosition() {
  const me = state.trainees.find(t=>t.id==="me");
  if (!me) return;
  me.exerciseId = state.selectedExercise;
  const ex = state.exerciseData.find(e=>e.id===state.selectedExercise);
  me.exerciseName = ex?ex.name:"—";
  me.setInfo = `Set ${state.live.setNum} / ${state.live.setTotal}`;
  const pos = getTraineePosition(state.selectedExercise, state.exerciseData);
  me.pos=pos;
  if (pos) { me.x=pos.x; me.y=pos.y; }
}

function updateP3Demo() {
  const wrap = document.getElementById("p3DemoWrap");
  const ph   = document.getElementById("p3DemoPlaceholder");
  if (!wrap) return;
  const item = state.exerciseData.find(x=>x.id===state.selectedExercise);
  const src  = safeMediaPath(item?.media?.exerciseGif) || safeMediaPath(item?.media?.exerciseImg || item?.media?.equipmentImg);
  if (src) {
    wrap.innerHTML = `<img src="${src}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    wrap.innerHTML = `<span style="font-size:11px;color:var(--mu2)">${item ? item.name : "Select an exercise"}</span>`;
  }
}

function syncLiveHeader() {
  const title = document.getElementById("liveExerciseTitle");
  const meta  = document.getElementById("liveExerciseMeta");
  const item  = state.exerciseData.find(x=>x.id===state.selectedExercise);
  if (!title||!meta) return;
  if (!item) { title.textContent="—"; meta.textContent="Select an exercise"; updateP3Demo(); return; }
  title.textContent=item.name;
  meta.textContent =`Set ${state.live.setNum} of ${state.live.setTotal} · ${item.muscleLabel} · ${item.equipmentLabel}`;
  updateP3Demo();
  const me = state.trainees.find(t=>t.id==="me");
  if (me) {
    me.exerciseId=state.selectedExercise; me.exerciseName=item.name;
    me.setInfo=`Set ${state.live.setNum} / ${state.live.setTotal}`;
    const pos=getTraineePosition(state.selectedExercise, state.exerciseData);
    me.pos=pos;
    if (pos){me.x=pos.x;me.y=pos.y;}
  }
  updateGymMap();
}

function updateGymMap() {
  const container   = document.getElementById("gymMapContainer");
  const dynLayer    = document.getElementById("gymDynamicLayer");
  const traineeList = document.getElementById("gymTraineeList");
  if (!container) return;

  const layer = dynLayer||container;
  layer.querySelectorAll(".gym-trainee-dot,.gym-dot-label").forEach(el=>el.remove());

  state.trainees.filter(t=>t.online&&t.pos).forEach(t=>{
    const dot = document.createElement("div");
    dot.className="gym-trainee-dot";
    dot.style.cssText=`left:${t.x}%;top:${t.y}%;background:${t.dotBg};border-color:${t.dotColor};
      box-shadow:0 0 0 3px ${t.dotColor}44,0 4px 12px rgba(0,0,0,.5)`;
    dot.title=`${t.name} — ${t.exerciseName}`;
    layer.appendChild(dot);

    const lbl=document.createElement("div");
    lbl.className="gym-dot-label";
    lbl.style.cssText=`left:${t.x}%;top:${t.y-7}%;color:${t.dotColor};border-color:${t.dotColor}66`;
    lbl.textContent=t.name;
    layer.appendChild(lbl);
  });

  if (traineeList) {
    const me = state.trainees.find(t=>t.id==="me");
    const buddies = state.trainees.filter(t=>t.id!=="me");
    traineeList.innerHTML="";

    if (me&&me.pos) {
      const el=document.createElement("div");
      el.className="map-trainee-item you";
      el.innerHTML=`<div class="map-trainee-avatar" style="background:${me.dotBg};border-color:${me.dotColor}">${me.initials}</div>
        <div class="map-trainee-info"><strong>${me.name} <span class="you-tag">You</span></strong><span>${me.exerciseName} · ${me.setInfo}</span></div>
        <span class="map-trainee-hr ok">${me.hr} bpm</span>`;
      traineeList.appendChild(el);
    }
    buddies.forEach(t=>{
      if (!t.online||!t.pos) return;
      const hrIcon = t.hr<120 ? "💙" : t.hr<=150 ? "💚" : "❤️";
      const el=document.createElement("div");
      el.className="map-trainee-item";
      el.innerHTML=`<div class="map-trainee-avatar" style="background:${t.dotBg};border-color:${t.dotColor}">${t.initials}</div>
        <div class="map-trainee-info"><strong>${t.name} <span style="font-size:14px">${hrIcon}</span></strong><span>${t.exerciseName} · ${t.setInfo}</span></div>
        <span class="map-trainee-hr ${t.status==="alert"?"alert":"ok"}">${t.hr} bpm</span>`;
      traineeList.appendChild(el);
    });
  }
}

function advanceUserSet() {
  if (state.live.setNum < state.live.setTotal) {
    state.live.setNum++;
    const me=state.trainees.find(t=>t.id==="me");
    if (me) me.setInfo=`Set ${state.live.setNum} / ${state.live.setTotal}`;
    updateSetDots();
    syncLiveHeader();
    updateGymMap();
  }
}

// ── Exercise Library ──────────────────────────────────────────────────────

function createPreviewMarkup(item) {
  const src = safeMediaPath(item.media?.exerciseGif)||safeMediaPath(item.media?.exerciseImg||item.media?.equipmentImg);
  if (!src) return `<span class="visual-fallback">${item.name}</span>`;
  return `<img src="${src}" alt="${item.name}" loading="lazy"><span class="visual-fallback hidden">${item.name}</span>`;
}

function renderExercises() {
  const c = document.getElementById("exerciseGrid");
  if (!c) return;
  if (!state.loaded) {
    c.innerHTML=`<article class="exercise-card"><div class="exercise-visual"><span class="visual-fallback">Loading…</span></div><div class="exercise-copy"><h4>Loading exercises</h4><p class="t-m">Please wait</p></div></article>`;
    return;
  }
  if (!state.exerciseData.length) {
    c.innerHTML=`<article class="exercise-card"><div class="exercise-visual"><span class="visual-fallback">—</span></div><div class="exercise-copy"><h4>No exercise data</h4><p class="t-m">Run via a local HTTP server</p></div></article>`;
    return;
  }
  const q=state.filters.search.toLowerCase().trim();
  const list=state.exerciseData.filter(item=>{
    return (state.filters.muscle==="all"||item.muscle===state.filters.muscle)
        && (state.filters.equipment==="all"||item.equipment===state.filters.equipment)
        && (!q||item.searchHaystack.includes(q));
  });
  c.innerHTML="";
  if (!list.length) {
    c.innerHTML=`<article class="exercise-card"><div class="exercise-visual"><span class="visual-fallback">0</span></div><div class="exercise-copy"><h4>No matches</h4><p class="t-m">Adjust filters</p></div></article>`;
    return;
  }
  list.forEach(item=>{
    const btn=document.createElement("button");
    btn.className=`exercise-card ${item.id===state.selectedExercise?"active":""}`;
    btn.innerHTML=`<div class="exercise-visual">${createPreviewMarkup(item)}</div>
      <div class="exercise-copy"><h4>${item.name}</h4><p>${item.muscleLabel} · ${item.equipmentLabel}</p>
      <div class="exercise-tags"><span>${item.level}</span><span>${item.muscleLabel}</span></div></div>`;
    btn.addEventListener("click",()=>{
      state.selectedExercise=item.id;
      renderExercises(); renderExerciseDetail();
      syncUserTraineePosition(); updateGymMap();
    });
    c.appendChild(btn);
  });
  c.querySelectorAll("img").forEach(img=>{
    img.addEventListener("error",()=>{
      const fb=img.nextElementSibling;
      if (fb) fb.classList.remove("hidden");
      img.remove();
    });
  });
}

function renderExerciseDetail() {
  const item=state.exerciseData.find(x=>x.id===state.selectedExercise)||state.exerciseData[0];
  if (!item) return;
  const get=id=>document.getElementById(id);
  if (get("detailLevel")) get("detailLevel").textContent=item.level;
  if (get("detailName"))  get("detailName").textContent=item.name;
  if (get("detailSubtitle")) get("detailSubtitle").textContent=`${item.muscleLabel} · ${item.equipmentLabel}`;
  if (get("detailHow"))  get("detailHow").textContent=item.how;
  if (get("detailBreath")) get("detailBreath").textContent=item.breathing||"(no programming data)";
  const visual=document.querySelector("#p2 .detail-visual");
  if (!visual) return;
  const src=safeMediaPath(item.media?.exerciseGif)||safeMediaPath(item.media?.exerciseImg||item.media?.equipmentImg);
  if (!src) { visual.innerHTML=`<span class="visual-fallback">${item.name}</span>`; return; }
  visual.innerHTML=`<img src="${src}" alt="${item.name}" loading="lazy">${item.media?.exerciseGif?'<span class="detail-gif-tip">GIF</span>':""}`;
  visual.querySelector("img")?.addEventListener("error",()=>{ visual.innerHTML=`<span class="visual-fallback">${item.name}</span>`; });
}

function setChip(id,value) {
  document.querySelectorAll(`#${id} .filter-chip`).forEach(c=>c.classList.toggle("active",c.dataset.value===value));
}

// ── Mobile float panel ────────────────────────────────────────────────────

function toggleFloatPanel() {
  const panel   = document.getElementById("floatPanel");
  const overlay = document.getElementById("floatOverlay");
  const isOpen  = panel&&panel.classList.contains("open");
  panel?.classList.toggle("open",!isOpen);
  overlay?.classList.toggle("open",!isOpen);
}

// ── Event delegation ──────────────────────────────────────────────────────

document.body.addEventListener("click", e=>{
  const goto=e.target.closest("[data-goto]");
  if (goto) { go(goto.dataset.goto); return; }

  const toastEl=e.target.closest("[data-toast]");
  if (toastEl) { showToast(toastEl.dataset.toast); return; }

  const burstEl=e.target.closest("[data-burst]");
  if (burstEl) { emojiBurst(burstEl.dataset.burst); return; }

  const modalOpen=e.target.closest("[data-modal]");
  if (modalOpen) { openModal(modalOpen.dataset.modal, modalOpen.dataset.cheer||modalOpen.dataset.burst); return; }

  const modalClose=e.target.closest("[data-modal-close]");
  if (modalClose) { closeModal(modalClose.dataset.modalClose); return; }

  if (e.target.closest("#floatBtn")) { toggleFloatPanel(); return; }
  if (e.target.closest("#floatOverlay")) { toggleFloatPanel(); return; }
});

// ── Modal system ──────────────────────────────────────────────────────────

function openModal(modalId, content) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("show");

  if (modalId==="p6b" && content) {
    const preview = document.getElementById("danmakuPreview");
    if (preview) {
      preview.innerHTML = "";
      for (let i=0; i<3; i++) {
        setTimeout(()=>{
          const bubble = document.createElement("div");
          bubble.className = "danmaku-bubble";
          bubble.textContent = content;
          bubble.style.top = `${20 + Math.random()*60}%`;
          preview.appendChild(bubble);
          setTimeout(()=>bubble.remove(), 4000);
        }, i*800);
      }
    }
  }

  if (modalId==="p6c" && content) {
    const preview = document.getElementById("emojiPreview");
    if (preview) {
      preview.innerHTML = "";
      const centerX = preview.offsetWidth / 2;
      const centerY = preview.offsetHeight / 2;
      for (let i=0; i<12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 60 + Math.random()*30;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const particle = document.createElement("div");
        particle.className = "emoji-particle";
        particle.textContent = content;
        particle.style.left = centerX + "px";
        particle.style.top = centerY + "px";
        particle.style.setProperty("--tx", tx+"px");
        particle.style.setProperty("--ty", ty+"px");
        particle.style.animationDelay = (i*0.05)+"s";
        preview.appendChild(particle);
      }
      setTimeout(()=>preview.innerHTML="", 1500);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("show");
}

const exerciseSearch=document.getElementById("exerciseSearch");
if (exerciseSearch) {
  exerciseSearch.addEventListener("input",e=>{ state.filters.search=e.target.value; renderExercises(); });
}

const filterMuscle=document.getElementById("filterMuscle");
if (filterMuscle) {
  filterMuscle.addEventListener("click",e=>{
    const b=e.target.closest(".filter-chip");
    if (!b) return;
    state.filters.muscle=b.dataset.value;
    setChip("filterMuscle",b.dataset.value);
    renderExercises();
  });
}

const filterEquipment=document.getElementById("filterEquipment");
if (filterEquipment) {
  filterEquipment.addEventListener("click",e=>{
    const b=e.target.closest(".filter-chip");
    if (!b) return;
    state.filters.equipment=b.dataset.value;
    setChip("filterEquipment",b.dataset.value);
    renderExercises();
  });
}

const nextSetBtn=document.getElementById("nextSetBtn");
if (nextSetBtn) {
  nextSetBtn.addEventListener("click",()=>{
    state.live.elapsed+=2;
    state.hrTarget=Math.max(110,state.hrTarget-10);
    updateElapsed();
    advanceUserSet();
    showToast("Next set. Rest 30s recommended.");
  });
}

// ── Data loading ──────────────────────────────────────────────────────────

async function fetchExerciseData() {
  for (const url of [DATA_URL,"../assets/exercise-data.json"]) {
    try {
      const res=await fetch(url);
      if (!res.ok) continue;
      const data=await res.json();
      if (data&&Array.isArray(data.exercises)&&data.exercises.length) return data;
    } catch(_){}
  }
  throw new Error("exercise-data.json not reachable");
}

async function init() {
  renderExercises();
  try {
    const data=await fetchExerciseData();
    state.exerciseData=buildExerciseList(data);
    state.selectedExercise=state.exerciseData[0]?.id||"";
    state.loaded=true;
    renderExercises();
    renderExerciseDetail();
    syncLiveHeader();
    updateGymMap();
  } catch(err) {
    state.loaded=true; state.exerciseData=[];
    renderExercises();
    if (window.location.protocol==="file:")
      showToast("file:// detected — use a local HTTP server to load exercises.");
    else
      showToast("Could not load exercise-data.json. Check server path.");
  }
}

// ── Boot ───────────────────────────────────────────────────────────────────

go("p1");
init();
