/* ===================== developer-only ANIMATION LAB — open the game with #anim-lab in the address bar ===================== */
const LAB_SCENES=[
  ['run','Accelerate, stop, turn'],['receive','Receive a pass'],['dribble','Dribble and shoot'],['tackle','Tackle and recover'],
  ['keeper','Keeper: catch, parry, miss'],['backpedal','Defender backpedals and jockeys'],['crossing','Players crossing at depth'],['aerial','Corner and header over the goal'],['pens','Penalty shootout kicks'],['offside','Offside call and free kick'],['throwin','Throw-in'],['corner','Corner headed clear'],['header','Cross and headed goal'],['break','Breakaway through ball']];
const LAB_SPEEDS=[[1,0.85],[2,0.45],[4,0.22],[8,0.12]];
function labOpen(){ if($('#anim-lab')) return; document.body.insertAdjacentHTML('beforeend',`<div id="anim-lab"><div class="lab-top"><b>Animation lab</b><span class="tiny">developer sandbox · nothing here touches a career</span><span class="grow"></span>${LAB_SPEEDS.map(([n])=>`<button class="btn sm" data-a="labSpeed" data-v="${n}">${n}×</button>`).join('')}<button class="btn sm" data-a="labPause">❚❚ / ▶</button><button class="btn sm" data-a="labSlow">Slow-mo</button><button class="btn sm ghost" data-a="labClose">✕</button></div>
    <div class="lab-scenes">${LAB_SCENES.map(([k,n])=>`<button class="btn sm" data-a="labRun" data-v="${k}">${n}</button>`).join('')}</div><div class="lab-cv"><canvas></canvas></div><div class="lab-log" id="lab-log"></div></div>`); labRun('run'); }
function labLog(t){ const el=$('#lab-log'); if(el) el.textContent=t; }
function labTeams(){ const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`L${side}${i}`; looks[pid]={num:[1,2,4,5,3,6,8,10,7,9,11][i],look:defaultLook(pid+'lab',11),h:66+(i%5)*2}; return {pid,role,x,y}; }),off:{}}); return {T,looks,mk}; }
async function labRun(scen){ const host=$('#anim-lab .lab-cv'); if(!host) return; if(App.labSt){ App.labSt.destroy(); App.labSt=null; } host.innerHTML='<canvas></canvas>'; const cv=host.firstChild;
  const {T,looks,mk}=labTeams(); const st=new Stage(cv,T,{minimap:true,lookup:pid=>looks[pid],celebFor:()=>'classic',weather:{k:'clear',night:false},sfx:true}); App.labSt=st; window.__lab=st; st.emit=e=>labLog(`event: ${e.t}${e.res?' · '+e.res:''}`);
  st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'L00'); st.setKeeper(1,'L10'); st.kickoffShape(0); st.snap(); st.ts=App.labTs||0.85; st.goalTs=st.ts; st.demoCalm=scen!=='backpedal';
  const P=[...st.players.values()]; const A=P.filter(p=>p.side===0), B=P.filter(p=>p.side===1); const fw=A[9], mid=A[7], def=B[2], gk=B[0];
  const alive=()=>st.alive&&App.labSt===st; labLog(scen); await st.tapOff(); if(!alive()) return;
  const loop=async fn=>{ while(alive()){ await fn(); await st.wait(st.D(900)); } };
  if(scen==='run') await loop(async()=>{ await st.gain(fw); fw.x=40; fw.y=34; st.focus=fw; st.zoomTo(0.45); await st.dribble(fw,70,34,1600); fw.ov={x:fw.x,y:fw.y}; await st.wait(st.D(700)); await st.dribble(fw,46,44,1600); await st.wait(st.D(500)); fw.ov=null; });
  if(scen==='receive') await loop(async()=>{ st.focus=mid; st.zoomTo(0.5); await st.gain(fw); fw.x=48; fw.y=30; mid.x=64; mid.y=40; mid.ov={x:66,y:38}; await st.wait(st.D(300)); await st.pass(fw,mid); await st.wait(st.D(600)); await st.pass(mid,fw,3.5); await st.wait(st.D(600)); mid.ov=null; });
  if(scen==='dribble') await loop(async()=>{ st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=90; st.focus=null; await st.gain(fw); fw.x=74; fw.y=30; await st.dribble(fw,86,32,900); await st.goalSequence({s:0,pid:fw.pid,t:'goal',ty:'open',seq:[{pid:fw.pid,x:45,y:88,a:'shot'}],sc:[1,0],m:10}); });
  if(scen==='tackle') await loop(async()=>{ st.zoomTo(0.45); await st.gain(fw); fw.x=60; fw.y=34; def.x=70; def.y=36; st.focus=fw; const g=st.dribble(fw,78,34,1600); await st.wait(st.D(500)); await st.tackle(def,fw); await g.catch(()=>{}); await st.wait(st.D(900)); });
  if(scen==='keeper') await loop(async()=>{ st.zoomTo(0.42); st.cam.w=st.cam.tw; st.focus={x:96}; st.cam.x=96; for(const t of ['save','save','miss']){ if(!alive()) return; await st.gain(fw); fw.x=84; fw.y=28+Math.random()*12; await st.shotSeq({s:0,pid:fw.pid,t,x:40,y:84}); await st.wait(st.D(500)); } });
  if(scen==='backpedal') await loop(async()=>{ st.zoomTo(0.45); st.demoCalm=false; await st.gain(fw); fw.x=50; fw.y=34; def.x=60; def.y=34; def.ov=null; st.focus=fw; await st.dribble(fw,80,30,2600); await st.wait(st.D(500)); });
  if(scen==='crossing') await loop(async()=>{ st.zoomTo(0.45); st.focus={x:52}; const a=A.slice(1,5), b=B.slice(1,5); a.forEach((p,i)=>{ p.x=40; p.y=24+i*6; p.ov={x:64,y:44-i*6}; }); b.forEach((p,i)=>{ p.x=64; p.y=22+i*6; p.ov={x:40,y:46-i*6}; }); await st.wait(st.D(4200)); [...a,...b].forEach(p=>p.ov=null); });
  if(scen==='aerial') await loop(async()=>{ st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=94; const e={s:0,pid:fw.pid,t:'goal',ty:'corner',seq:[{pid:mid.pid,x:100,y:100,a:'corner'},{pid:fw.pid,x:50,y:94,a:'shot'}],sc:[1,0],m:10}; await st.goalSequence(e); });
  if(scen==='offside') await loop(async()=>{ st.zoomTo(0.9); st.focus=null; await st.gain(mid); mid.x=60; mid.y=36; await st.wait(st.D(300)); await st.offsideSeq({t:'offside',s:0,pid:fw.pid,m:10}); });
  if(scen==='throwin') await loop(async()=>{ st.zoomTo(0.7); st.focus=null; await st.gain(A[3]); A[3].x=40; A[3].y=5; A[3].ov={x:46,y:4}; await st.wait(st.D(500)); A[3].ov=null; await st.throwIn(); });
  if(scen==='corner') await loop(async()=>{ st.zoomTo(0.5); st.cam.w=st.cam.tw; st.focus={x:96}; st.cam.x=95; await st.cornerKick(0,1); });
  if(scen==='header') await loop(async()=>{ st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=92; const e={s:0,pid:fw.pid,t:'goal',ty:'header',seq:[{pid:A[8].pid,x:10,y:84,a:'cross'},{pid:fw.pid,x:48,y:93,a:'shot'}],sc:[1,0],m:10}; st.clipStart(e); await st.goalSequence(e); });
  if(scen==='break') await loop(async()=>{ st.zoomTo(0.9); const e={s:0,pid:fw.pid,t:'goal',ty:'break',seq:[{pid:A[3].pid,x:45,y:36,a:'pass'},{pid:fw.pid,x:55,y:66,a:'run'},{pid:fw.pid,x:50,y:86,a:'shot'}],sc:[1,0],m:10}; st.clipStart(e); await st.goalSequence(e); });
  if(scen==='pens'){ await st.shootoutSetup(); let i=0; while(alive()){ const s=i%2; await st.soKick({t:'kick',s,pid:`L${s}${10-Math.floor(i/2)%10}`,gk:s===0?'L10':'L00',res:['goal','save','miss','goal'][i%4],soSc:[0,0]}); i++; } }
}
A.labRun=el=>labRun(el.dataset.v);
A.labSpeed=el=>{ const v=+el.dataset.v; const t=(LAB_SPEEDS.find(x=>x[0]===v)||[1,0.85])[1]; App.labTs=t; const st=App.labSt; if(st){ st.ts=t; st.goalTs=t; } labLog(`${v}× playback`); };
A.labPause=()=>{ const st=App.labSt; if(st){ st.paused=!st.paused; labLog(st.paused?'paused':'playing'); } };
A.labSlow=()=>{ const st=App.labSt; if(st){ st.ts=st.ts>=2?(App.labTs||0.85):3.4; st.goalTs=st.ts; labLog(st.ts>=2?'slow motion':'normal speed'); } };
A.labClose=()=>{ if(App.labSt){ App.labSt.destroy(); App.labSt=null; } const el=$('#anim-lab'); if(el) el.remove(); if(location.hash==='#anim-lab') history.replaceState(null,'',location.pathname+location.search); };
window.animLab=labOpen;
window.addEventListener('hashchange',()=>{ if(location.hash==='#anim-lab') labOpen(); });
setTimeout(()=>{ if(location.hash==='#anim-lab') labOpen(); },300);
