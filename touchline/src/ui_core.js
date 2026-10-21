/* ===================== UI CORE: state, storage, theme, sound, art ===================== */
const $ = (s,el=document)=>el.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt1 = v => (Math.round(v*10)/10).toFixed(1);
const R = v => Math.round(v);
const App = { C:null, slot:null, route:'office', params:{}, modal:null, drawer:null, live:null, odds:new Map(), loadedYears:new Set(), toastT:null, saveState:'idle', mem:false, scroll:{} };

/* ---------- global preferences (localStorage, small) ---------- */
const PREF_KEY='touchline.prefs.v2';
const DEFAULT_PREFS={theme:{preset:'night',custom:null}, compact:false, rm:false, panels:{next:true,lineup:true,dev:true,miles:true,recent:true}, sound:{on:true,music:.35,crowd:.55,whistle:.6,goal:.7,mMusic:false,mCrowd:false,mWhistle:false,mGoal:false}, lastSlot:null};
let PREFS = (()=>{ try{ const v=JSON.parse(localStorage.getItem(PREF_KEY)||'null'); return v? deepMerge(structuredClone(DEFAULT_PREFS),v) : structuredClone(DEFAULT_PREFS); }catch(e){ return structuredClone(DEFAULT_PREFS); } })();
function deepMerge(a,b){ for(const k in b){ if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object') deepMerge(a[k],b[k]); else a[k]=b[k]; } return a; }
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(PREFS)); }catch(e){} }

/* ---------- IndexedDB persistence: compact career + per-fixture match logs ---------- */
const DB={ db:null, memCareers:{}, memLogs:{}, memMeta:{},
  open(){ return new Promise(res=>{ try{ const rq=indexedDB.open('touchline-v2',1); rq.onupgradeneeded=()=>{ const d=rq.result; d.createObjectStore('careers'); d.createObjectStore('meta'); const l=d.createObjectStore('logs'); l.createIndex('slotYr',['slot','yr']); l.createIndex('slot','slot'); }; rq.onsuccess=()=>{ DB.db=rq.result; res(true); }; rq.onerror=()=>{ App.mem=true; res(false); }; rq.onblocked=()=>{ App.mem=true; res(false);} }catch(e){ App.mem=true; res(false); } }); },
  tx(stores,mode){ return DB.db.transaction(stores,mode); },
  req(r){ return new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
  async getMeta(){ if(App.mem) return Object.values(DB.memMeta); try{ return await DB.req(DB.tx(['meta'],'readonly').objectStore('meta').getAll()); }catch(e){ return []; } },
  async getCareer(slot){ if(App.mem) return DB.memCareers[slot]? JSON.parse(DB.memCareers[slot]):null; return DB.req(DB.tx(['careers'],'readonly').objectStore('careers').get(slot)); },
  async logsFor(slot,yr){ if(App.mem) return Object.values(DB.memLogs).filter(x=>x.slot===slot&&x.yr===yr); return DB.req(DB.tx(['logs'],'readonly').objectStore('logs').index('slotYr').getAll([slot,yr])); },
  async allLogs(slot){ if(App.mem) return Object.values(DB.memLogs).filter(x=>x.slot===slot); return DB.req(DB.tx(['logs'],'readonly').objectStore('logs').index('slot').getAll(slot)); },
  async put(slot, career, meta, logs){
    if(App.mem){ DB.memCareers[slot]=JSON.stringify(career); DB.memMeta[slot]=meta; for(const l of logs) DB.memLogs[slot+'|'+l.fid]={slot,yr:l.yr,fid:l.fid,log:l}; return; }
    await new Promise((res,rej)=>{ const t=DB.tx(['careers','meta','logs'],'readwrite'); t.objectStore('careers').put(career,slot); t.objectStore('meta').put(meta,slot); const ls=t.objectStore('logs'); for(const l of logs) ls.put({slot,yr:l.yr,fid:l.fid,log:l}, slot+'|'+l.fid); t.oncomplete=res; t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); });
  },
  async del(slot){
    if(App.mem){ delete DB.memCareers[slot]; delete DB.memMeta[slot]; for(const k in DB.memLogs) if(DB.memLogs[k].slot===slot) delete DB.memLogs[k]; return; }
    const keys = await DB.req(DB.tx(['logs'],'readonly').objectStore('logs').index('slot').getAllKeys(slot));
    await new Promise((res,rej)=>{ const t=DB.tx(['careers','meta','logs'],'readwrite'); t.objectStore('careers').delete(slot); t.objectStore('meta').delete(slot); const ls=t.objectStore('logs'); for(const k of keys) ls.delete(k); t.oncomplete=res; t.onerror=()=>rej(t.error); });
  }
};
let saveTimer=null;
function careerForSave(C){ const o={}; for(const k in C){ if(k==='logs'||k==='_dirty') continue; o[k]=C[k]; } return o; }
function metaOf(C){ const s=C.schools[C.userSid]; return {slot:App.slot, school:s.name, mascot:s.mascot, mk:s.mk, town:s.town, c1:s.c1, c2:s.c2, coach:C.coaches[C.userCoachId].name, year:C.year, phase:C.phase, md:C.md, state:C.stateName, seasonNo:C.seasonNo, honors:(s.honors||[]).length, updated:Date.now()}; }
function queueSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveNow,350); }
async function saveNow(){
  const C=App.C; if(!C) return; clearTimeout(saveTimer);
  const dirty=[...(C._dirty||[])].map(id=>C.logs[id]).filter(Boolean);
  App.saveState='saving'; paintSaveState();
  try{ await DB.put(App.slot, careerForSave(C), metaOf(C), dirty); C._dirty=new Set(); App.saveState='saved'; App.saveErr=null; }
  catch(e){ App.saveState='error'; App.saveErr=String(e&&e.message||e); }
  paintSaveState();
}
function paintSaveState(){ const el=$('#savestate'); if(!el) return; el.innerHTML = App.saveState==='error' ? `<span class="bad">Save failed.</span> <button class="link" data-a="retrySave">Retry</button>` : App.mem? '<span class="warnc">Browser storage unavailable: progress lasts this session only</span>' : App.saveState==='saving'?'Saving…':App.saveState==='saved'?'All progress saved':'—'; }
async function ensureLogs(yr){ const C=App.C; if(!C||App.loadedYears.has(yr)) return false; App.loadedYears.add(yr); try{ const rows=await DB.logsFor(App.slot,yr); for(const r of rows) if(!C.logs[r.fid]) C.logs[r.fid]=r.log; }catch(e){} return true; }
function needLogs(yr){ if(App.loadedYears.has(yr)) return; ensureLogs(yr).then(ch=>{ if(ch) render(); }); }

/* ---------- theme engine ---------- */
const PRESETS=[
  {k:'night',n:'Classic Night Match',c:{bg:'#0b1016',surface:'#131c26',text:'#e8eef5',accent:'#f5b942',accent2:'#3ccf91'}},
  {k:'gold',n:'Varsity Gold & Navy',c:{bg:'#0a1330',surface:'#111d45',text:'#eef2ff',accent:'#f2c230',accent2:'#7aa2ff'}},
  {k:'crimson',n:'Crimson Pride',c:{bg:'#140809',surface:'#231113',text:'#f7eaea',accent:'#e2313f',accent2:'#f0c27a'}},
  {k:'emerald',n:'Emerald Pitch',c:{bg:'#06140e',surface:'#0d2219',text:'#e6f5ec',accent:'#2fd27f',accent2:'#e8d36a'}},
  {k:'stealth',n:'Stealth Dark',c:{bg:'#08090a',surface:'#121315',text:'#e4e4e6',accent:'#b8c0cc',accent2:'#6ee7f0'}},
  {k:'titanium',n:'Titanium Dark',c:{bg:'#15171a',surface:'#202327',text:'#edeff2',accent:'#ff8a3d',accent2:'#c9d1db'}},
  {k:'slate',n:'Classic Slate',c:{bg:'#1b222b',surface:'#252e39',text:'#eef2f6',accent:'#5aa9e6',accent2:'#f4b860'}},
  {k:'flood',n:'Grass & Floodlights',c:{bg:'#0c1a10',surface:'#14281b',text:'#f2f7ee',accent:'#f3eba8',accent2:'#6fdc6f'}}
];
function hexRgb(h){ h=String(h||'#000').replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h.slice(0,6),16)||0; return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgbHex(r,g,b){ return '#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join(''); }
function lum(h){ const c=hexRgb(h).map(v=>{v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function contrast(a,b){ const A=lum(a),B=lum(b); return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05); }
function mix(a,b,t){ const x=hexRgb(a),y=hexRgb(b); return rgbHex(x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t); }
function towards(c, target, minC, against){ let x=c; for(let i=0;i<20&&contrast(x,against)<minC;i++) x=mix(x,target,0.12); return x; }
const validHex = h => /^#?[0-9a-f]{6}$/i.test(String(h||''));
function themeColors(){ const t=PREFS.theme; if(t.custom) return t.custom; return (PRESETS.find(p=>p.k===t.preset)||PRESETS[0]).c; }
function applyTheme(){
  const c={...themeColors()}; const root=document.documentElement.style;
  for(const k of ['bg','surface','text','accent','accent2']) if(!validHex(c[k])) c[k]=PRESETS[0].c[k];
  const dark = lum(c.bg)<0.3;
  const hi = dark?'#f4f7fa':'#0d1014';
  if(contrast(c.text,c.bg)<7 || contrast(c.text,c.surface)<6) c.text = towards(c.text, hi, 7, c.bg);
  if(contrast(c.text,c.surface)<6) c.text=hi;
  const surface2 = mix(c.surface,c.text,0.06), line=mix(c.surface,c.text,0.14);
  let muted = mix(c.text,c.bg,0.4); muted = towards(muted, c.text, 4.6, c.surface);
  const accent = towards(c.accent, hi, 3.2, c.surface), accent2 = towards(c.accent2, hi, 3, c.surface);
  const onA = contrast('#111111',accent) >= contrast('#ffffff',accent) ? '#111111' : '#ffffff';
  const set={bg:c.bg,surface:c.surface,surface2,line,text:c.text,muted,accent,accent2,'on-accent':onA};
  for(const k in set) root.setProperty('--'+k,set[k]);
  root.setProperty('color-scheme',dark?'dark':'light');
  document.body.classList.toggle('compact',!!PREFS.compact); document.body.classList.toggle('rm',!!PREFS.rm);
}
const reducedMotion = ()=> PREFS.rm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- procedural sound (Web Audio, no recordings) ---------- */
const Sound={ ctx:null, ch:{}, crowd:null, music:null,
  ensure(){ if(!PREFS.sound.on) return false; try{ if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false; this.ctx=new AC(); const m=this.ctx.createGain(); m.gain.value=0.9; m.connect(this.ctx.destination); for(const k of ['music','crowd','whistle','goal']){ const g=this.ctx.createGain(); g.connect(m); this.ch[k]=g; } this.noise=this.mkNoise(); } if(this.ctx.state==='suspended') this.ctx.resume(); this.vols(); return true; }catch(e){ return false; } },
  vols(){ if(!this.ctx) return; const s=PREFS.sound; const map={music:s.mMusic?0:s.music,crowd:s.mCrowd?0:s.crowd,whistle:s.mWhistle?0:s.whistle,goal:s.mGoal?0:s.goal}; for(const k in map) this.ch[k].gain.setTargetAtTime(PREFS.sound.on?map[k]:0,this.ctx.currentTime,0.05); },
  mkNoise(){ const b=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate); const d=b.getChannelData(0); let last=0; for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.5+w*0.08; } return b; },
  src(){ const s=this.ctx.createBufferSource(); s.buffer=this.noise; s.loop=true; return s; },
  whistle(kind){ if(!this.ensure()) return; const t0=this.ctx.currentTime; const blasts = kind==='ft'?[[0,.35],[.45,.35],[.9,.9]] : kind==='ht'?[[0,.3],[.4,.7]] : kind==='card'?[[0,.45]] : [[0,.6]];
    for(const [o,d] of blasts){ const osc=this.ctx.createOscillator(); osc.type='sine'; osc.frequency.value=2850; const lfo=this.ctx.createOscillator(); lfo.frequency.value=34; const lg=this.ctx.createGain(); lg.gain.value=90; lfo.connect(lg); lg.connect(osc.frequency); const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t0+o); g.gain.linearRampToValueAtTime(.32,t0+o+.03); g.gain.setValueAtTime(.32,t0+o+d-.05); g.gain.linearRampToValueAtTime(0,t0+o+d); osc.connect(g); g.connect(this.ch.whistle); osc.start(t0+o); lfo.start(t0+o); osc.stop(t0+o+d+.05); lfo.stop(t0+o+d+.05); } },
  crowdStart(){ if(!this.ensure()||this.crowd) return; const s=this.src(); const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=650; bp.Q.value=.5; const g=this.ctx.createGain(); g.gain.value=.5; const lfo=this.ctx.createOscillator(); lfo.frequency.value=.13; const lg=this.ctx.createGain(); lg.gain.value=.12; lfo.connect(lg); lg.connect(g.gain); s.connect(bp); bp.connect(g); g.connect(this.ch.crowd); s.start(); lfo.start(); this.crowd={s,lfo,g}; },
  crowdStop(){ if(!this.crowd) return; try{ this.crowd.g.gain.setTargetAtTime(0,this.ctx.currentTime,.2); const c=this.crowd; setTimeout(()=>{ try{c.s.stop(); c.lfo.stop();}catch(e){} },900); }catch(e){} this.crowd=null; },
  goal(){ if(!this.ensure()) return; const t=this.ctx.currentTime; for(const [f,q,v] of [[900,.7,1],[1900,.9,.5]]){ const s=this.src(); const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q; const g=this.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.35); g.gain.exponentialRampToValueAtTime(.001,t+3.6); s.connect(bp); bp.connect(g); g.connect(this.ch.goal); s.start(t); s.stop(t+3.7); } this.chant(t+1.2); },
  chant(t0){ if(!this.ensure()) return; t0=t0||this.ctx.currentTime; const pat=[0,.42,.84,1.05,1.26]; for(let rep=0;rep<2;rep++) for(const o of pat){ const t=t0+rep*1.9+o; const s=this.src(); const hp=this.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1300; const g=this.ctx.createGain(); g.gain.setValueAtTime(.0,t); g.gain.linearRampToValueAtTime(.5,t+.005); g.gain.exponentialRampToValueAtTime(.001,t+.09); s.connect(hp); hp.connect(g); g.connect(this.ch.goal); s.start(t); s.stop(t+.12); } },
  musicStart(){ if(!this.ensure()||this.music) return; const ctx=this.ctx; const chords=[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7]]; let step=0; const beat=60/84; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400; lp.connect(this.ch.music); let next=ctx.currentTime+.1;
    const tick=()=>{ while(next<ctx.currentTime+.4){ const bar=Math.floor(step/4)%4; if(step%4===0){ for(const f of chords[bar]){ const o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=f/2; const g=ctx.createGain(); g.gain.setValueAtTime(0,next); g.gain.linearRampToValueAtTime(.07,next+.4); g.gain.linearRampToValueAtTime(0,next+beat*4); o.connect(g); g.connect(lp); o.start(next); o.stop(next+beat*4+.05); } }
        const k=ctx.createOscillator(); k.frequency.setValueAtTime(120,next); k.frequency.exponentialRampToValueAtTime(45,next+.18); const kg=ctx.createGain(); kg.gain.setValueAtTime(step%2?0.05:0.14,next); kg.gain.exponentialRampToValueAtTime(.001,next+.22); k.connect(kg); kg.connect(this.ch.music); k.start(next); k.stop(next+.25);
        const arp=chords[bar][step%3]*2; const a=ctx.createOscillator(); a.type='sine'; a.frequency.value=arp; const ag=ctx.createGain(); ag.gain.setValueAtTime(.035,next+beat/2); ag.gain.exponentialRampToValueAtTime(.001,next+beat/2+.3); a.connect(ag); ag.connect(lp); a.start(next+beat/2); a.stop(next+beat/2+.35);
        next+=beat; step++; } };
    const id=setInterval(tick,120); tick(); this.music={id,lp}; },
  musicStop(){ if(!this.music) return; clearInterval(this.music.id); try{ this.music.lp.disconnect(); }catch(e){} this.music=null; },
  syncMenu(){ if(!PREFS.sound.on){ this.musicStop(); this.crowdStop(); return; } if(App.live){ this.musicStop(); } else if(App.C){ this.musicStart(); } }
};

/* ---------- crest: shield badge around the school's mascot mark ---------- */
function crest(s, size=40){
  if(!s) return `<svg class="crest" width="${size}" height="${size*1.15}" viewBox="0 0 100 115"><path d="M50 3 93 14v41c0 30-20 47-43 57C27 102 7 85 7 55V14z" fill="#2a2f38" stroke="#5b6573" stroke-width="5"/></svg>`;
  const C=mascotPalette(s.c1,s.c2); const bg=_mc(C.P,'#05070b',0.66); const mk=s.mk||mascotKeyFor(s.mascot);
  return `<svg class="crest" width="${size}" height="${(size*1.15).toFixed(1)}" viewBox="0 0 100 115" role="img" aria-label="${esc(s.town||s.name||'')} ${esc(s.mascot||'')} crest"><path d="M50 3 93 14v41c0 30-20 47-43 57C27 102 7 85 7 55V14z" fill="${bg}" stroke="${C.S}" stroke-width="5" stroke-linejoin="round"/><path d="M50 11 85 20v35c0 25-16 39-35 48C31 94 15 80 15 55V20z" fill="none" stroke="${C.P}" stroke-opacity=".55" stroke-width="2"/><g transform="translate(13 15) scale(.74)">${mascotInner(mk,s.c1,s.c2,size<60)}</g></svg>`;
}
/* big standalone logo (no shield), used in heroes and the scoreboard */
function logo(s, size=72){ if(!s) return ''; return mascotSVG(s.mk||mascotKeyFor(s.mascot), s.c1, s.c2, size, `${s.town||''} ${s.mascot||''}`); }
function badgeColor(v){ return v>=85?'#2fd27f':v>=75?'#9be15d':v>=65?'#f5d142':v>=55?'#f5a142':'#ef6b5b'; }
function ovrBadge(v){ const n=R(v); return `<span class="ovr" style="background:${badgeColor(n)}22;color:${badgeColor(n)}">${n}</span>`; }
function posTag(p){ return `<span class="pos ${p}">${p}</span>`; }

/* ---------- stadium illustration: one perspective system for pitch, markings, track, goals ---------- */
let _stUid=0;
function stadiumSVG(s, opt){
  const st = opt || effStadium(s);
  const c1=(s&&s.c1)||'#1d4ed8', c2=(s&&s.c2)||'#ffffff';
  const W=800,H=440, yF=206, yN=402, wF=470, wN=730, cx=400;
  const P=(u,v)=>{ const y=yF+(yN-yF)*v, w=wF+(wN-wF)*v; return [cx+(u-.5)*w, y]; };
  const pt=(u,v)=>P(u,v).map(n=>n.toFixed(1)).join(',');
  const poly=(pts)=>pts.map(([u,v])=>pt(u,v)).join(' ');
  const M=(mx,my)=>[mx/105,my/68];
  const line=(a,b)=>`M${pt(...M(...a))}L${pt(...M(...b))}`;
  const rect=(x0,y0,x1,y1)=>`M${pt(...M(x0,y0))}L${pt(...M(x1,y0))}L${pt(...M(x1,y1))}L${pt(...M(x0,y1))}Z`;
  const arc=(cxm,cym,r,a0,a1,n=40)=>{ let d=''; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; const p=pt(...M(cxm+r*Math.cos(a),cym+r*Math.sin(a))); d+=(i?'L':'M')+p; } return d; };
  const tier=st.tier;
  const standCol = st.stands==='secondary'?c2: st.stands==='neutral'?'#8a94a3':c1;
  const surfA = st.surface==='turf'?'#2f9e52':'#3f8a3a', surfB = st.surface==='turf'?'#28904a':'#367d33';
  const apron = st.surface==='turf'?'#1f6e3a':'#2f6a2c';
  const mc = st.markColor||'#ffffff';
  const U='st'+(++_stUid), lit=st.lights!=='none';
  const rng=(()=>{ let h=2166136261; for(const ch of String(st.name||'x')+tier) h=Math.imul(h^ch.charCodeAt(0),16777619); return ()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%10000)/10000; }; })();
  let o=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(st.name)} illustration"><defs>
   <linearGradient id="${U}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060a14"/><stop offset="1" stop-color="#1b2a44"/></linearGradient>
   <radialGradient id="${U}glow" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fff6d8" stop-opacity="${st.lights==='none'?0:st.lights==='towers'?.22:.14}"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
   <linearGradient id="${U}seat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(standCol,'#000000',.15)}"/><stop offset="1" stop-color="${mix(standCol,'#000000',.45)}"/></linearGradient>
   <linearGradient id="${U}beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4cf" stop-opacity=".34"/><stop offset="1" stop-color="#fff4cf" stop-opacity="0"/></linearGradient>
   <radialGradient id="${U}vig" cx=".5" cy=".62" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
   <radialGradient id="${U}halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8dc" stop-opacity=".55"/><stop offset=".25" stop-color="#fff1c2" stop-opacity=".18"/><stop offset="1" stop-color="#fff1c2" stop-opacity="0"/></radialGradient>
   <linearGradient id="${U}shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".10"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
   <rect width="${W}" height="${H}" fill="url(#${U}sky)"/>`;
  // stars and a low haze where the lights bleed into the sky
  for(let i=0;i<46;i++){ const x=rng()*W, y=rng()*(yF-40); o+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.4+rng()*.9).toFixed(2)}" fill="#ffffff" opacity="${(.25+rng()*.55).toFixed(2)}"/>`; }
  if(lit) o+=`<ellipse cx="${W/2}" cy="${yF-10}" rx="${W*.62}" ry="90" fill="#ffe7a8" opacity=".07"/>`;
  // distant treeline
  o+=`<path d="M0 ${yF-8} ${Array.from({length:21},(_,i)=>`Q${i*40+20} ${yF-24-(i*37%14)} ${i*40+40} ${yF-8}`).join(' ')} V${H} H0Z" fill="#0d1a14"/>`;
  // light structures (behind stands)
  const sBase0 = P(0,-.16)[1]; const standTop = sBase0 - {1:24,2:42,3:64,4:96}[tier];
  if(st.lights!=='none'){
    const xs=st.lights==='towers'?[.0,.32,.68,1.0]:[.08,.36,.64,.92];
    for(const u of xs){ const [x]=P(u,-.2); const top = st.lights==='towers'? 14 : Math.min(standTop-30,90); const base=yF-10;
      if(st.lights==='towers'){ o+=`<path d="M${x-7} ${base}L${x-2} ${top+16}M${x+7} ${base}L${x+2} ${top+16}" stroke="#5b6573" stroke-width="2"/>`; for(let y=top+24;y<base;y+=14) o+=`<path d="M${x-6+(y-top)/40} ${y}L${x+6-(y-top)/40} ${y+10}" stroke="#4a5360" stroke-width="1"/>`;
        o+=`<rect x="${x-22}" y="${top}" width="44" height="18" rx="2" fill="#2a2f36"/>`; for(let i=0;i<4;i++) for(let j=0;j<2;j++) o+=`<circle cx="${x-15+i*10}" cy="${top+5+j*8}" r="3.2" fill="#fff8dc"/>`;  }
      else { o+=`<rect x="${x-2}" y="${top}" width="4" height="${base-top}" fill="#59636f"/><rect x="${x-12}" y="${top-6}" width="24" height="9" rx="2" fill="#2a2f36"/>`; for(let i=0;i<3;i++) o+=`<circle cx="${x-7+i*7}" cy="${top-1.5}" r="2.6" fill="#fff8dc"/>`;  }
    }
  }
  // stands (far side), continuous blocks
  const blocks = tier===1?[[.36,.64]]: tier===2?[[.1,.44],[.56,.9]] : tier===3?[[.02,.98]] : [[-.06,1.06]];
  const sBase = P(0,-.16)[1];
  for(const [u0,u1] of blocks){ const [x0]=P(u0,-.16), [x1]=P(u1,-.16); const h=sBase-standTop; const slope=h*.18;
    o+=`<path d="M${x0} ${sBase}L${x0+slope} ${standTop}L${x1-slope} ${standTop}L${x1} ${sBase}Z" fill="url(#${U}seat)"/>`;
    const rows=Math.max(3,Math.round(h/7)); for(let i=1;i<rows;i++){ const y=sBase-h*i/rows; const dx=slope*i/rows; o+=`<path d="M${(x0+dx).toFixed(1)} ${y.toFixed(1)}H${(x1-dx).toFixed(1)}" stroke="#000" stroke-opacity=".35" stroke-width="1"/>`; }
    { const fill=[mix(c1,'#000000',.25),mix(c2,'#000000',.3),'#b9b3a8','#2b313b',mix(c1,'#ffffff',.15),'#d8a982','#7a5a44']; const dens=.3+tier*.12; let crowd='';
      for(let i=1;i<rows;i++){ const y=sBase-h*(i-.5)/rows; const dx=slope*(i-.5)/rows; for(let x=x0+dx+3;x<x1-dx-3;x+=4.2){ if(rng()>dens) continue; crowd+=`<circle cx="${(x+rng()*1.6).toFixed(1)}" cy="${(y-1).toFixed(1)}" r="1.3" fill="${fill[(rng()*fill.length)|0]}"/>`; } }
      o+=`<g opacity=".9">${crowd}</g>`; }
    o+=`<path d="M${x0+slope} ${standTop}L${x1-slope} ${standTop}" stroke="#ffffff" stroke-opacity=".18" stroke-width="1"/>`;
    if(tier>=3) o+=`<path d="M${x0+slope-8} ${standTop-3}L${x1-slope+8} ${standTop-3}L${x1-slope+2} ${standTop+5}L${x0+slope-2} ${standTop+5}Z" fill="#232a33" stroke="#4a5462" stroke-width="1"/>`;
    o+=`<rect x="${x0}" y="${sBase-2}" width="${x1-x0}" height="6" fill="${mix(standCol,'#000000',.6)}"/>`;
    if(tier>=2) for(const ux of [u0+.02,u1-.02]){ const [sx]=P(ux,-.16); o+=`<path d="M${sx} ${sBase}V${standTop+4}" stroke="#bfc6cf" stroke-opacity=".5" stroke-width="1.4"/>`; }
  }
  if(tier>=3){ const [x0]=P(.38,-.16),[x1]=P(.62,-.16); o+=`<rect x="${x0}" y="${standTop-22}" width="${x1-x0}" height="22" fill="#1e252e" stroke="#59636f"/><rect x="${x0+4}" y="${standTop-18}" width="${x1-x0-8}" height="10" fill="#7fb3d9" opacity=".75"/><text x="${(x0+x1)/2}" y="${standTop-25}" fill="#c5ccd6" font-size="8" text-anchor="middle" font-family="JetBrains Mono,monospace">PRESS</text>`; }
  if(tier===4){ const [x0]=P(-.06,-.16),[x1]=P(1.06,-.16); o+=`<path d="M${x0-6} ${standTop-6}L${x1+6} ${standTop-6}L${x1-10} ${standTop+6}L${x0+10} ${standTop+6}Z" fill="#2c333c"/>`; }
  if(tier>=2){ const [x0]=P(.42,-.16),[x1]=P(.58,-.16); o+=`<rect x="${x0}" y="${sBase-16}" width="${x1-x0}" height="11" fill="${c1}" stroke="${c2}" stroke-width="1"/><text x="${(x0+x1)/2}" y="${sBase-7.5}" font-size="8" fill="${c2}" text-anchor="middle" font-family="Big Shoulders Display,Arial Narrow,sans-serif" font-weight="800" letter-spacing=".8">${esc((s&&s.town||'HOME').toUpperCase())}</text>`; }
  // scoreboard: left end, clear of stands
  if(tier>=2 || st.board==='video'){ const [bx]=P(-.02,-.1); const big=st.board==='video'; const bw=big?150:96, bh=big?72:40; const x=Math.max(8,bx-bw-30), y=yF-bh-(big?60:34);
    o+=`<rect x="${x+bw/2-3}" y="${y+bh}" width="6" height="${yF-y-bh}" fill="#59636f"/><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="#0a0c0f" stroke="#59636f" stroke-width="2"/>`;
    if(big){ o+=`<rect x="${x+6}" y="${y+6}" width="${bw-12}" height="${bh-26}" fill="${c1}" opacity=".85"/>${s&&s.mk?`<g transform="translate(${x+9} ${y+7}) scale(.42)">${mascotInner(s.mk,c1,c2,true)}</g>`:''}<text x="${x+bw/2+(s&&s.mk?18:0)}" y="${y+bh/2-1}" fill="${c2}" font-size="15" text-anchor="middle" font-family="Big Shoulders Display,Arial Narrow,sans-serif" font-weight="900">${esc((s&&s.mascot||'HOME').toUpperCase())}</text><text x="${x+bw/2}" y="${y+bh-7}" fill="#ffcf5a" font-size="11" text-anchor="middle" font-family="JetBrains Mono,monospace">HOME 0 · 0 GUEST</text>`; }
    else { o+=`<text x="${x+bw/2}" y="${y+17}" fill="#ffcf5a" font-size="11" text-anchor="middle" font-family="JetBrains Mono,monospace">HOME  GUEST</text><text x="${x+bw/2}" y="${y+33}" fill="#ff7a3d" font-size="13" text-anchor="middle" font-family="JetBrains Mono,monospace">00  00</text>`; }
  }
  // surround: track or apron
  const ringPts=(ru,hv,n=28)=>{ const pts=[]; for(let i=0;i<=n;i++){ const u=i/n; pts.push([u,.5-hv]); } for(let i=0;i<=n;i++){ const a=-Math.PI/2+Math.PI*i/n; pts.push([1+ru*Math.cos(a),.5+hv*Math.sin(a)]); } for(let i=n;i>=0;i--){ pts.push([i/n,.5+hv]); } for(let i=0;i<=n;i++){ const a=Math.PI/2+Math.PI*i/n; pts.push([ru*Math.cos(a),.5+hv*Math.sin(a)]); } return pts; };
  if(st.track!=='none'){ const tc=st.track==='blue'?'#2f5fb3':'#b5452f'; o+=`<polygon points="${poly(ringPts(.12,.66))}" fill="${tc}"/>`; for(const k of [.3,.6]){ o+=`<polygon points="${poly(ringPts(.12-.065*k,.66-.12*k))}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/>`; } o+=`<polygon points="${poly(ringPts(.055,.54))}" fill="${apron}"/>`; }
  else o+=`<polygon points="${poly([[-.05,-.1],[1.05,-.1],[1.05,1.08],[-.05,1.08]])}" fill="${apron}"/>`;
  if(tier===1){ for(let i=0;i<=20;i++){ const [x,y]=P(-.06+i*1.12/20,-.13); o+=`<path d="M${x} ${y}v-9" stroke="#9aa3ad" stroke-width="1.2"/>`; } const [a]=P(-.06,-.13),[b]=P(1.06,-.13); const y=P(0,-.13)[1]; o+=`<path d="M${a} ${y-8}H${b}M${a} ${y-3}H${b}" stroke="#9aa3ad" stroke-width=".8"/>`; }
  // pitch with mowing stripes
  const N=14; for(let i=0;i<N;i++) o+=`<polygon points="${poly([[i/N,0],[(i+1)/N,0],[(i+1)/N,1],[i/N,1]])}" fill="${i%2?surfA:surfB}"/>`;
  if(st.surface==='grass'){ for(let i=0;i<40;i++){ const u=(i*0.137)%1, v=(i*0.311)%1; const [x,y]=P(u,v); o+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${10+i%5*3}" ry="3" fill="#2c6b2a" opacity=".25"/>`; } }
  o+=`<polygon points="${poly([[0,0],[1,0],[1,1],[0,1]])}" fill="url(#${U}glow)"/>`;
  // multisport overlay lines (cosmetic)
  if(st.marks==='multi'){ let d=''; for(let i=1;i<10;i++){ const x=i*10.5; d+=line([x,0],[x,68]); } o+=`<path d="${d}" stroke="${c2==='#ffffff'?'#f5d142':c2}" stroke-opacity=".55" stroke-width="1" stroke-dasharray="4 4" fill="none"/>`; o+=`<path d="${arc(13,34,3,0,Math.PI*2)}${arc(92,34,3,0,Math.PI*2)}" stroke="${c2==='#ffffff'?'#f5d142':c2}" stroke-opacity=".55" fill="none" stroke-width="1"/>`; }
  // soccer markings
  let d=rect(0,0,105,68)+line([52.5,0],[52.5,68])+arc(52.5,34,9.15,0,Math.PI*2,60);
  d+=rect(0,13.84,16.5,54.16)+rect(88.5,13.84,105,54.16)+rect(0,24.84,5.5,43.16)+rect(99.5,24.84,105,43.16);
  const aa=Math.acos(5.5/9.15); d+=arc(11,34,9.15,-aa,aa,20)+arc(94,34,9.15,Math.PI-aa,Math.PI+aa,20);
  for(const [x,y] of [[0,0],[105,0],[0,68],[105,68]]) d+=arc(x,y,1,0,Math.PI*2,10);
  o+=`<path d="${d}" fill="none" stroke="${mc}" stroke-width="1.6" stroke-linejoin="round" opacity=".92"/>`;
  for(const [x,y] of [[52.5,34],[11,34],[94,34]]){ const [px,py]=P(...M(x,y)); o+=`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="2.4" ry="1.4" fill="${mc}"/>`; }
  // goals at both ends, posts scaled with depth
  for(const end of [0,1]){ const gx=end?105:0, back=end?107.2:-2.2; const g0=30.34,g1=37.66; const [ax,ay]=P(...M(gx,g0)), [bx,by]=P(...M(gx,g1)); const ppm=(wF+(wN-wF)*.5)/105; const h=2.44*ppm*1.05;
    const [cx0,cy0]=P(...M(back,g0)), [cx1,cy1]=P(...M(back,g1));
    const frame = st.goals==='portable'?'#ff9f1c':'#ffffff'; const sw = st.goals==='portable'?1.6:2.4;
    if(st.goals==='box'){ o+=`<path d="M${cx0} ${cy0}V${cy0-h}L${cx1} ${cy1-h}V${cy1}M${ax} ${ay-h}L${cx0} ${cy0-h}M${bx} ${by-h}L${cx1} ${cy1-h}" stroke="#dfe5ec" stroke-width="1.2" fill="none"/>`; }
    else { o+=`<path d="M${ax} ${ay-h}L${(ax+cx0)/2} ${(ay+cy0)/2}M${bx} ${by-h}L${(bx+cx1)/2} ${(by+cy1)/2}" stroke="#dfe5ec" stroke-width="1" fill="none"/>`; }
    let net=''; for(let i=1;i<6;i++){ const t=i/6; net+=`M${ax+(bx-ax)*t} ${ay+(by-ay)*t-h}L${cx0+(cx1-cx0)*t} ${cy0+(cy1-cy0)*t-(st.goals==='box'?h:h*.2)}`; } o+=`<path d="${net}" stroke="#ffffff" stroke-opacity=".35" stroke-width=".6"/>`;
    o+=`<path d="M${ax} ${ay}V${ay-h}L${bx} ${by-h}V${by}" stroke="${frame}" stroke-width="${sw}" fill="none" stroke-linejoin="round"/>`;
    if(st.goals==='portable'){ o+=`<path d="M${ax} ${ay}L${cx0} ${cy0}L${cx1} ${cy1}L${bx} ${by}" stroke="${frame}" stroke-width="1.2" fill="none"/><circle cx="${cx0}" cy="${cy0}" r="2" fill="#333"/><circle cx="${cx1}" cy="${cy1}" r="2" fill="#333"/>`; }
  }
  // corner flags, benches and pitchside boards
  for(const [u,v] of [[0,0],[1,0],[0,1],[1,1]]){ const [x,y]=P(u,v); const hh=6+v*6; o+=`<path d="M${x} ${y}v-${hh}" stroke="#e9eef4" stroke-width="1.2"/><path d="M${x} ${y-hh}l${u?-6:6} 2.2l${u?6:-6} 2.2z" fill="${u?c2:c1}" stroke="#0b0f14" stroke-width=".5"/>`; }
  if(tier>=2){ for(const [u,col] of [[.36,c1],[.64,'#59636f']]){ const [x0,y0]=P(u-.05,-.05),[x1]=P(u+.05,-.05); o+=`<path d="M${x0} ${y0}L${x0+3} ${y0-11}H${x1-3}L${x1} ${y0}Z" fill="${col}" stroke="#0b0f14" stroke-width="1"/><path d="M${x0+4} ${y0-3}H${x1-4}" stroke="#ffffff" stroke-opacity=".5" stroke-width="2.4" stroke-dasharray="1.6 2.4"/>`; } }
  if(tier>=2){ const v=1.07; const segs=8; for(let i=0;i<segs;i++){ const u0=.04+i*.92/segs, u1=u0+.92/segs-.006; const [x0,y]=P(u0,v),[x1]=P(u1,v); const bc=i%2?c1:'#0e1218'; const tc=i%2?c2:'#c7ced8'; o+=`<rect x="${x0.toFixed(1)}" y="${(y-9).toFixed(1)}" width="${(x1-x0).toFixed(1)}" height="9" fill="${bc}" stroke="#05070a" stroke-width=".8"/><text x="${((x0+x1)/2).toFixed(1)}" y="${(y-2.3).toFixed(1)}" font-size="6.5" fill="${tc}" text-anchor="middle" font-family="Big Shoulders Display,Arial Narrow,sans-serif" font-weight="800" letter-spacing=".6">${i%2?esc((s&&s.mascot||'HOME').toUpperCase()):'TOUCHLINE'}</text>`; } }
  // floodlight beams and halos
  if(lit){ const xs=st.lights==='towers'?[.0,.32,.68,1.0]:[.08,.36,.64,.92]; for(const u of xs){ const [x]=P(u,-.2); const top=st.lights==='towers'?23:Math.min(standTop-30,90)-2; const [px]=P(.5+(u-.5)*.6,.55); o+=`<path d="M${x-8} ${top}L${x+8} ${top}L${px+90} ${yN-20}L${px-90} ${yN-20}Z" fill="url(#${U}beam)" opacity="${st.lights==='towers'?.36:.26}" style="mix-blend-mode:screen"/><circle cx="${x}" cy="${top}" r="${st.lights==='towers'?40:26}" fill="url(#${U}halo)"/>`; } }
  o+=`<rect width="${W}" height="${H}" fill="url(#${U}vig)"/>`;
  if(tier===4){ o+=`<path d="M0 ${H-18}H${W}V${H}H0Z" fill="url(#${U}seat)"/>`; for(let i=1;i<4;i++) o+=`<path d="M0 ${H-18+i*4.5}H${W}" stroke="#000" stroke-opacity=".35"/>`; }
  o+='</svg>';
  return o;
}

/* ---------- small icons ---------- */
const ICON={
  office:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  squads:'<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c.3-2.6 1.8-4.5 4-4.5 2.2 0 3 1.8 3 4.5"/>',
  dev:'<path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/>',
  schedule:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  league:'<path d="M5 20V10M12 20V4M19 20v-7"/>',
  records:'<path d="M5 4h14v16l-7-4-7 4z"/>',
  post:'<path d="M3 5h5v4h4v6h4v4h5M8 9v6"/>',
  awards:'<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  tourneys:'<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6"/>',
  news:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  school:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  ball:''
};
/* classic black-and-white football (truncated icosahedron look) */
const BALL_PATHS=(()=>{ const pent=(cx,cy,r,rot)=>{ let d=''; for(let i=0;i<5;i++){ const a=rot+i*Math.PI*2/5; d+=(i?'L':'M')+(cx+Math.cos(a)*r).toFixed(2)+' '+(cy+Math.sin(a)*r).toFixed(2); } return d+'Z'; };
  const c=pent(12,12,3.9,-Math.PI/2); let outer='', seams=''; for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; const vx=12+Math.cos(a)*3.9, vy=12+Math.sin(a)*3.9; const ox=12+Math.cos(a)*10.6, oy=12+Math.sin(a)*10.6; outer+=pent(ox,oy,3.6,a+Math.PI); seams+=`M${vx.toFixed(2)} ${vy.toFixed(2)}L${(12+Math.cos(a)*7.4).toFixed(2)} ${(12+Math.sin(a)*7.4).toFixed(2)}`; const b=a+Math.PI/5; seams+=`M${(12+Math.cos(a)*7.4).toFixed(2)} ${(12+Math.sin(a)*7.4).toFixed(2)}L${(12+Math.cos(b)*9.4).toFixed(2)} ${(12+Math.sin(b)*9.4).toFixed(2)}L${(12+Math.cos(a+Math.PI*2/5)*7.4).toFixed(2)} ${(12+Math.sin(a+Math.PI*2/5)*7.4).toFixed(2)}`; }
  return {c,outer,seams}; })();
let ballN=0;
function ballSVG(sz=16){ const id='bc'+(ballN++); return `<svg class="ballico" viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="12" cy="12" r="10.6"/></clipPath><radialGradient id="${id}g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".75" stop-color="#eceff2"/><stop offset="1" stop-color="#c3c8cf"/></radialGradient></defs><circle cx="12" cy="12" r="10.6" fill="url(#${id}g)"/><g clip-path="url(#${id})"><path d="${BALL_PATHS.outer}" fill="#14171c"/><path d="${BALL_PATHS.seams}" fill="none" stroke="#3a3f47" stroke-width=".7"/></g><path d="${BALL_PATHS.c}" fill="#14171c"/><circle cx="12" cy="12" r="10.6" fill="none" stroke="#111" stroke-width="1"/></svg>`; }
const icon=(k,sz=18)=>k==='ball'?ballSVG(sz):`<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]||''}</svg>`;

function toast(msg){ clearTimeout(App.toastT); let el=$('#toast'); if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; el.setAttribute('role','status'); document.body.appendChild(el); } el.textContent=msg; el.hidden=false; App.toastT=setTimeout(()=>{ el.hidden=true; },2600); }
