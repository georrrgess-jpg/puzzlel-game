/* ===================== CONTROLLER & BOOT ===================== */
function curLuCtx(){ const C=App.C; const sid=App.route==='squads'?squadSid():C.userSid; const lvl=App.params.lvl||'V'; return {C,sid,lvl,lu:getLu(C,sid,lvl)}; }
function changed(opts={}){ App.odds.clear(); queueSave(); App.keepScroll=true; render(); }
async function openSlot(slot){
  const raw=await DB.getCareer(slot); if(!raw){ toast('That slot is empty.'); return; }
  const C=migrate(raw); C.logs=C.logs||{}; App.C=C; App.slot=slot; App.loadedYears=new Set(); App.odds.clear(); App.modal=null; App.drawer=null; App.route='office'; App.params={};
  await ensureLogs(C.year); if(C.year>2000) ensureLogs(C.year-1);
  PREFS.lastSlot=slot; savePrefs(); render(); Sound.syncMenu();
  if(C.live && C.fixtures[C.live.fid] && C.fixtures[C.live.fid].st==='s') toast('You have a match in progress. Press Play to resume it.');
}
function closeModal(){ App.modal=null; renderModal(); }

A.go = el => { App.scroll[App.route]=window.scrollY; App.route=el.dataset.r; App.params=el.dataset.p?JSON.parse(el.dataset.p):{}; App.modal=null; document.body.classList.remove('navopen'); render(); window.scrollTo(0,App.scroll[App.route]&&!el.dataset.p?App.scroll[App.route]:0); };
A.setParam = el => { const k=el.dataset.k, v=el.dataset.v; const C=App.C;
  if(k==='fgrade'||k==='fgrp'){ App.filt={...(App.filt||{grade:'all',grp:'all'}),[k==='fgrade'?'grade':'grp']:v}; }
  else if(k.startsWith('set_')){ C.settings[k.slice(4)]=v; App.odds.clear(); queueSave(); }
  else if(App.modal && el.closest('#modal-root')) { App.modal[k]=v; renderModal(); return; }
  else { if(v==='') delete App.params[k]; else App.params[k]=v; if(k==='lvl'||k==='tab') delete App.params.sel; }
  App.keepScroll=true; render(); };
A.burger = ()=> document.body.classList.toggle('navopen');
A.toSaves = async ()=>{ await saveNow(); App.C=null; App.modal=null; Sound.musicStop(); render(); };
A.openSlot = el => openSlot(+el.dataset.slot);
A.newCareerForm = el => { App.modal={type:'newCareer',slot:+el.dataset.slot}; renderModal(); };
function setMascot(C,sid,mk){ const s=C.schools[sid]; if(s.mk===mk) return; const other=C.league.map(id=>C.schools[id]).find(x=>x.id!==sid&&x.mk===mk); if(other){ other.mk=s.mk; other.mascot=MASCOT_BY[s.mk].alt[0]; } s.mk=mk; s.mascot=MASCOT_BY[mk].alt[0]; }
function ncRead(){ const D=App.draft; if(!D) return; const s=D.schools[D.userSid]; const v=id=>($(id)?.value||'').trim(); if(v('#nc-school')) s.name=v('#nc-school').slice(0,48); if(v('#nc-town')) s.town=v('#nc-town').slice(0,24); if(v('#nc-mname')&&MASCOT_BY[s.mk].alt.includes(v('#nc-mname'))) s.mascot=v('#nc-mname'); if(validHex(v('#nc-c1'))) s.c1=v('#nc-c1'); if(validHex(v('#nc-c2'))) s.c2=v('#nc-c2'); }
function draftWorld(name, seedTxt){ return newCareer({slot:App.modal.slot, coachName:name, seed: seedTxt? hashStr(seedTxt) : (Math.random()*4294967295)>>>0, now:Date.now()}); }
A.ncNext = ()=>{ const name=($('#nc-name').value||'').trim()||'Coach Rivera'; const seed=($('#nc-seed').value||'').trim(); App.modal.name=name; App.modal.seed=seed; App.draft=draftWorld(name,seed); App.modal.step=2; renderModal(); };
A.ncBack = ()=>{ ncRead(); App.modal.step=1; renderModal(); };
A.ncReroll = ()=>{ ncRead(); const old=App.draft.schools[App.draft.userSid]; const D=draftWorld(App.modal.name,''); const s=D.schools[D.userSid]; setMascot(D,D.userSid,old.mk); s.mascot=old.mascot; s.c1=old.c1; s.c2=old.c2; App.draft=D; renderModal(); };
A.ncMascot = el => { ncRead(); setMascot(App.draft,App.draft.userSid,el.dataset.k); renderModal(); };
A.ncSwatch = el => { ncRead(); const s=App.draft.schools[App.draft.userSid]; s.c1=el.dataset.c1; s.c2=el.dataset.c2; renderModal(); };
A.ncSwapColors = ()=>{ ncRead(); const s=App.draft.schools[App.draft.userSid]; [s.c1,s.c2]=[s.c2,s.c1]; renderModal(); };
CH.ncColor = ()=>{ ncRead(); renderModal(); };
A.createCareer = async el => { ncRead(); const C=App.draft; if(!C) return; App.draft=null; const slot=+el.dataset.slot; C.slot=slot; C.logs={}; C.flags={};
  const us=C.schools[C.userSid]; C.news=C.news.filter(n=>n.type!=='program'); addNews(C,'program',`${C.coaches[C.userCoachId].name} named head coach of the ${us.name} ${us.mascot}`,C.userSid);
  App.C=C; App.slot=slot; App.loadedYears=new Set([C.year]); App.modal=null; App.route='office'; App.params={}; PREFS.lastSlot=slot; savePrefs();
  await saveNow(); render(); Sound.syncMenu(); toast(`Welcome to ${us.name}, Coach.`); };
A.idMascot = el => { const C=App.C; setMascot(C,el.dataset.s,el.dataset.k); changed(); };
A.idSwatch = el => { const s=Sx(el.dataset.s); s.c1=el.dataset.c1; s.c2=el.dataset.c2; changed(); };
A.simMenu = ()=>{ App.simMenu=!App.simMenu; App.keepScroll=true; render(); };
A.simAhead = el => { const kind=el.dataset.k; App.simMenu=false; const C=App.C; const u=C.userSid; let n=0, w=0, d=0, l=0, titles=[]; const t0=C.phase;
  while(n<80 && C.phase!=='offseason'){
    if(kind==='regular' && !['preseason','regular'].includes(C.phase)) break;
    const uf=userFixture(C); if(uf){ const M=startMatch(C,uf.id,{}); runToEnd(C,M); finishMatch(C,M); if(uf.w===u) w++; else if(uf.w) l++; else d++; const tt= uf.w===u ? (uf.comp==='sec'&&uf.rd===2?`Section ${C.section} Champions`: uf.comp==='rgn'?'Regional Champions': uf.comp==='st'&&uf.rd===2?'State Champions':null) : null; if(tt) titles.push([tt,uf.id,C.year]); }
    simRound(C); const ev=advance(C); n++; if(!ev) break; if(kind==='round') break; }
  App.odds.clear(); queueSave(); saveNow(); App.keepScroll=true;
  App.modal={type:'simSummary',n,w,d,l,from:t0,kind,titles:titles.map(t=>t[0])}; render();
  if(titles.length){ const [tt,fid,yr]=titles[titles.length-1]; showTrophy(tt,Sx(u),yr,{chips:titleChips(C,fid)}); } };
A.askDelete = async el => { const slot=+el.dataset.slot; const metas=await DB.getMeta(); const m=metas.find(x=>x.slot===slot); App.modal={type:'confirmDelete',slot,label:m?m.school:''}; renderModal(); };
A.doDelete = async el => { const slot=+el.dataset.slot; if(($('#del-confirm').value||'').trim().toUpperCase()!=='DELETE'){ toast('Type DELETE to confirm.'); return; } await DB.del(slot); if(App.slot===slot){ App.C=null; App.slot=null; } if(PREFS.lastSlot===slot){ PREFS.lastSlot=null; savePrefs(); } App.modal=null; render(); toast(`Slot ${slot} deleted.`); };
A.playNext = ()=>{ const C=App.C; if(!C) return;
  if(C.phase==='offseason'){ const res=rollover(C); if(res.ok){ App.loadedYears.add(C.year); App.odds.clear(); queueSave(); saveNow(); App.route='office'; App.params={}; render(); toast(`Welcome to the ${C.year} season. ${res.grads.filter(id=>C.alumni[id].sid===C.userSid).length} seniors graduated.`);  if(C.hofNew&&C.hofNew.length){ App.modal={type:'hofNight',ids:[...C.hofNew]}; C.hofNew=[]; renderModal(); } } return; }
  if(C.live && C.fixtures[C.live.fid] && C.fixtures[C.live.fid].st==='s'){ resumeLive(); return; }
  const uf=userFixture(C); if(uf){ App.modal={type:'fixture',id:uf.id}; renderModal(); return; }
  if(roundFixtures(C).length) completeRound(null); };
A.openFixture = el => { const C=App.C; const f=C.fixtures[el.dataset.id]; if(f&&f.st==='s'){ C.flags=C.flags||{}; const uf=userFixture(C); if(uf&&uf.id===f.id){ C.flags.scouted=f.id; queueSave(); } } App.modal={type:'fixture',id:el.dataset.id}; renderModal(); if(App.route==='office'){ App.keepScroll=true; render(); } };
A.openPlayer = el => { App.modal={type:'player',id:el.dataset.id,back:App.modal}; renderModal(); };
A.openSchool = el => { App.modal={type:'school',id:el.dataset.id}; renderModal(); };
A.closeModal = ()=>{ const back=App.modal&&App.modal.back; App.modal=back||null; renderModal(); };
A.scrimClose = (el,e)=>{ if(e.target===el) A.closeModal(); };
A.closeDrawer = ()=>{ App.drawer=null; renderModal(); };
A.modalTab = el => { App.modal.tab=el.dataset.v; renderModal(); };
A.pvSpeed = el => { App.modal.speed=+el.dataset.v; App.C.settings.speed=+el.dataset.v; queueSave(); renderModal(); };
A.kickoff = el => { const m=App.modal||{}; const ht=m.ht!=null?m.ht:App.C.settings.halftime; startLive(el.dataset.id,{ht,speed:m.speed||App.C.settings.speed||2}); };
A.quickSim = el => { const C=App.C; const M=startMatch(C,el.dataset.id,{}); runToEnd(C,M); finishMatch(C,M); App.modal=null; completeRound(el.dataset.id); };
A.skipPre = ()=>{ const C=App.C; if(C.phase!=='preseason') return; for(const id of C.pre.fx){ const f=C.fixtures[id]; if(f.st==='s') f.st='x'; } C.pre.skipped=true; C.pre.rd=3; C.phase='regular'; C.md=0; addNews(C,'program',`${Sx(C.userSid).town} skip the Preseason Cup and head straight into league play`,C.userSid); App.modal=null; changed(); toast('Preseason skipped. Matchday 1 is next.'); };
A.fixLineup = ()=>{ repairLineup(App.C,App.C.userSid,'V'); App.odds.clear(); queueSave(); renderModal(); };
A.saveDirect = el => { const C=App.C; const id=el.dataset.id; const mode=$('#dir-mode').value; if(mode==='none') delete C.directed[id]; else C.directed[id]={mode, winner:$('#dir-win').value, hg:+$('#dir-hg').value||0, ag:+$('#dir-ag').value||0, soWinner:$('#dir-so')?$('#dir-so').value:null}; queueSave(); renderModal(); toast(mode==='none'?'Direction cleared.':'Direction saved.'); };
A.autoXI = ()=>{ const {C,sid,lvl,lu}=curLuCtx(); const form=lu.custom?(lu.base||'4-4-2'):lu.form; const n=autoLineup(C,sid,lvl,form,isUser(sid)?{youth:0}:{}); lu.form=form; lu.slots=n.slots; lu.custom=false; delete App.params.why; changed(); };
A.bestForm = ()=>{ const {C,sid,lvl,lu}=curLuCtx(); const b=bestFormation(C,sid,lvl); lu.form=b.form; lu.slots=b.lineup.slots; lu.custom=false; App.params.why=b.why; changed(); };
A.selSlot = el => { if(el.dataset.i==='') delete App.params.sel; else App.params.sel=el.dataset.i; App.keepScroll=true; render(); };
A.nudge = el => { const {lu}=curLuCtx(); const i=+App.params.sel; const s=lu.slots[i]; if(!s) return; moveSlot(lu,i,s.x+ +el.dataset.dx,s.y+ +el.dataset.dy); changed(); };
function moveSlot(lu,i,x,y){ const s=lu.slots[i]; const gk=s.role==='GK'; const snap=App.snap!==false; if(snap){ x=Math.round(x/4)*4; y=Math.round(y/4)*4; } s.x=clamp(x, gk?22:4, gk?78:96); s.y=clamp(y, gk?3:5, gk?15:96); if(!lu.custom){ lu.base=lu.form; lu.custom=true; } }
A.benchIn = el => { const {C,sid,lvl,lu}=curLuCtx(); const p=C.players[el.dataset.id]; let i=App.params.sel!=null?+App.params.sel:-1;
  if(i<0){ let worst=1e9; lu.slots.forEach((s,k)=>{ if(ROLE_GROUP[s.role]!==p.pos) return; const q=C.players[s.pid]; const v=q?eff(q,s.role):-1; if(v<worst){ worst=v; i=k; } }); if(i<0) { toast('Select a slot on the pitch first.'); return; } }
  lu.slots[i].pid=p.id; App.params.sel=String(i); changed(); };
A.pickForm = el => { CH.formation({value:el.dataset.f}); };
A.tacPreset = el => { const {lu}=curLuCtx(); const t=TAC_PRESETS.find(x=>x[0]===el.dataset.k); if(!t) return; lu.tac={...lu.tac,...t[2]}; changed(); };
A.strat = el => { const {lu}=curLuCtx(); lu.strat=el.dataset.k; changed(); };
A.training = el => { App.C.training=el.dataset.k; App.C.flags=App.C.flags||{}; App.C.flags.trainingYear=App.C.year; changed(); };
A.promote = el => { const C=App.C; const res=promote(C,el.dataset.id,el.dataset.to); toast(res.msg); if(res.ok){ if(!isUser(C.players[el.dataset.id].sid)) addNews(C,'promotion',res.msg,C.players[el.dataset.id].sid); else addNews(C,'promotion',`${Sx(C.userSid).town}: ${res.msg}`,C.userSid,{pid:el.dataset.id}); } changed(); };
A.sortBy = (el,e) => { const k=el.dataset.k; let keys=App.sort||[{k:'ovr',d:-1}]; const i=keys.findIndex(s=>s.k===k);
  if(e.shiftKey){ if(i>=0) keys[i]={k,d:-keys[i].d}; else keys=[...keys,{k,d:-1}]; } else { keys = i===0? [{k,d:-keys[0].d}] : [{k,d:k==='name'||k==='pos'?1:-1}]; }
  App.sort=keys; App.keepScroll=true; render(); };
A.panelsOpen = ()=>{ App.modal={type:'panels'}; renderModal(); };
A.saveIdentity = el => { const C=App.C; const s=Sx(el.dataset.id); const v=id=>($(id)?.value||'').trim();
  if(v('#id-name')) s.name=v('#id-name').slice(0,48); if(v('#id-town')) s.town=v('#id-town').slice(0,24); if(MASCOT_BY[s.mk].alt.includes(v('#id-mname'))) s.mascot=v('#id-mname'); if(validHex(v('#id-c1'))) s.c1=v('#id-c1'); if(validHex(v('#id-c2'))) s.c2=v('#id-c2');
  if($('#id-coach')&&v('#id-coach')) C.coaches[s.coachId].name=v('#id-coach').slice(0,40); changed(); toast('Identity saved.'); };
A.useSchoolColors = ()=>{ const s=Sx(App.C.userSid); const dark=lum(s.c1)<0.25; const bg = mix(dark?s.c1:'#0b1016','#05070a',dark?0.72:0); PREFS.theme={preset:null,custom:{bg, surface:mix(bg,s.c1,0.18), text:'#eef2f6', accent: lum(s.c2)>0.2? s.c2 : mix(s.c1,'#ffffff',0.45), accent2: mix(s.c1,'#ffffff',0.35)}}; savePrefs(); render(); toast('School colors applied. Contrast was adjusted where needed.'); };
A.resetStadium = el => { Sx(el.dataset.id).stadium.ovr=null; changed(); toast('Stadium reset to its organic look.'); };
A.openTheme = ()=>{ App.drawer={type:'theme',title:'Theme'}; renderModal(); };
A.preset = el => { PREFS.theme={preset:el.dataset.k,custom:null}; savePrefs(); applyTheme(); renderModal(); if(App.C){ App.keepScroll=true; render(); } else renderStart(); };
A.resetTheme = ()=>{ PREFS.theme={preset:'night',custom:null}; savePrefs(); applyTheme(); render(); renderModal(); };
A.testSound = el => { PREFS.sound.on=true; Sound.gestured=true; savePrefs(); Sound.ensure(); const k=el.dataset.k; if(k==='goal') Sound.goal(); else if(k==='kick'){ Sound.kick('shot',0.95); setTimeout(()=>Sound.net(0.9),420); } else if(k==='fanfare') Sound.fanfare(); else Sound.whistle('ko'); };
A.copyText = el => copy(el.dataset.t);
async function copy(t){ try{ await navigator.clipboard.writeText(t); toast('Copied.'); }catch(e){ toast('Copy blocked here. Select the text and copy it manually.'); } }
A.exportOpen = async ()=>{ App.modal={type:'export',text:''}; renderModal(); await saveNow(); const logs=await DB.allLogs(App.slot); const data={app:'touchline',v:SCHEMA,career:careerForSave(App.C),logs:logs.map(l=>l.log)}; App.modal={type:'export',text:JSON.stringify(data)}; renderModal(); };
A.copyExport = ()=>{ const t=$('#exp-text'); t.select(); copy(t.value); };
A.importOpen = ()=>{ App.modal={type:'import'}; renderModal(); };
A.doImport = async ()=>{ const err=$('#imp-err'); try{ const d=JSON.parse($('#imp-text').value); if(!d||d.app!=='touchline'||!d.career||!d.career.schools||!d.career.players) throw new Error('This is not a Touchline backup.'); const slot=+$('#imp-slot').value; const C=migrate(d.career); C.slot=slot; await DB.del(slot); App.slot=slot; App.C=C; C.logs={}; for(const l of d.logs||[]) C.logs[l.fid]=l; C._dirty=new Set(Object.keys(C.logs)); await saveNow(); C.logs={}; await openSlot(slot); toast('Backup restored.'); }catch(e){ err.textContent = e.message||'Could not read that backup.'; } };
function keepScroll(fn){ const sc=[...document.querySelectorAll('#modal-root .modal, #modal-root .mbody, #modal-root .lk-ctl')].map(e=>e.scrollTop); fn(); [...document.querySelectorAll('#modal-root .modal, #modal-root .mbody, #modal-root .lk-ctl')].forEach((e,i)=>{ if(sc[i]!=null) e.scrollTop=sc[i]; }); }
A.lookSet = el => { const p=App.C.players[el.dataset.id]; if(!p||!canEdit(p.sid)) return; const L={...lookOf(p)}; const k=el.dataset.k; let v=el.dataset.v; if(el.dataset.n) v=+v; if(el.dataset.b) v=v==='1'; L[k]=v; p.look=L; queueSave(); keepScroll(renderModal); };
A.lookRandom = el => { const p=App.C.players[el.dataset.id]; if(!p||!canEdit(p.sid)) return; p.look=randomLook(p.id); queueSave(); keepScroll(renderModal); };
A.lookReset = el => { const p=App.C.players[el.dataset.id]; if(!p||!canEdit(p.sid)) return; delete p.look; queueSave(); keepScroll(renderModal); toast('Appearance reset to his original look.'); };
function afterModal(root){ root.querySelectorAll('canvas[data-fig]').forEach(cv=>{ const p=Px(cv.dataset.fig); if(p) figurePreview(cv,p); }); }
A.savePlayer = el => { const C=App.C; const p=C.players[el.dataset.id]; const g=id=>Number($(id).value); const err=$('#edit-err');
  const grade=g('#e-grade'), age=g('#e-age'), pot=g('#e-pot'), h=g('#e-h'), ah=g('#e-ah');
  if(!(grade>=7&&grade<=12)) return err.textContent='Grade must be 7–12.'; if(!(age>=11&&age<=19)) return err.textContent='Age must be 11–19.';
  const sk={}; for(const k of SKILLS){ const v=g('#e-'+k); if(!(v>=5&&v<=99)) return err.textContent=`${SKILL_NAME[k]} must be 5–99.`; sk[k]=v; }
  const test={...p, sk, pos:$('#e-pos').value, h}; const newOvr=ovr(test); if(!(pot>=Math.ceil(newOvr)&&pot<=99)) return err.textContent=`Potential must be between ${Math.ceil(newOvr)} (current rating) and 99.`;
  if(!(h>=56&&h<=82&&ah>=h)) return err.textContent='Projected adult height must be at least the current height.';
  const oldLvl=p.lvl; p.grade=grade; p.age=age; p.sk=sk; p.pos=$('#e-pos').value; p.pot=pot; p.h=h; p.ah=ah; p.mat=$('#e-mat').value; p.dev=$('#e-dev').value; p.aggr=clamp(g('#e-aggr'),1,99); p.opp=clamp(g('#e-opp')|0,0,99); for(const k of ['score','assist','stop','defend']) p.tr[k]=clamp(g('#e-tr-'+k)|0,0,10); p.num=clamp(g('#e-num')|0,0,99);
  if(!eligible(p,p.lvl)){ p.lvl = grade>=11?'V':grade>=9?'JV':'MOD'; }
  for(const l of LVLS) repairLineup(C,p.sid,l); App.modal.tab='overview'; changed(); toast(p.lvl!==oldLvl?`Saved. ${pname(p)} moved to ${LVL_NAME[p.lvl]} to match his grade.`:'Player updated.'); };
A.retrySave = ()=> saveNow();
/* live controls */
A.liveSpeed = el => { App.live.speed=+el.dataset.v; App.C.settings.speed=+el.dataset.v; queueSave(); updateLive(); };
A.livePause = ()=>{ const L=App.live; if(!L||L.done||L.M.phase==='ht'||L.skipping) return; L.paused=!L.paused; if(L.stage) L.stage.paused=L.paused; $('.live')?.classList.toggle('paused',L.paused);
  if(L.paused){ App.C.live={fid:L.fid,M:L.M}; queueSave(); Sound.crowdStop(); } else { Sound.crowdStart(); if(!L.busy){ L.loopId=Math.random(); liveLoop(L.loopId); } } updateLive(); };
A.liveView = el => { const L=App.live; PREFS.view=el.dataset.v; savePrefs(); if(L&&L.stage){ L.stage.mode=el.dataset.v; L.stage.bgTac=null; } updateLive(); };
A.liveTab = el => { const L=App.live; L.tab=el.dataset.v; document.querySelectorAll('.lv-panel .tab').forEach(t=>t.classList.toggle('on',t.dataset.v===L.tab)); renderFeed(); };
A.liveTactics = ()=>{ const L=App.live; L.tab='tac'; document.querySelectorAll('.lv-panel .tab').forEach(t=>t.classList.remove('on')); const S=L.M.sides[L.M.user]; $('#lv-pbody').innerHTML=`<div style="padding-top:8px"><h3>Tactics</h3>${tacSliders(S.tac,'lt')}<div class="field" style="margin-top:10px"><label for="lt-form">Formation</label><select id="lt-form" data-c="liveForm">${opts(Object.keys(FORMS).map(x=>[x,x]),S.form)}</select></div><p class="tiny muted">Changes apply from the next minute.</p><button class="btn sm" data-a="liveTab" data-v="feed">Back to commentary</button></div>`; };
A.liveSkip = el => { const L=App.live; if(!L||L.done||L.skipping) return; const M=L.M; const C=App.C; const to=el.dataset.to;
  L.skipping=true; L.loopId=Math.random(); flushPending(); L.stage.cancel(); clearBanner();
  // let the cancelled animation drain (it resolves instantly while skipping) before moving on
  setTimeout(()=>{ if(App.live!==L) return;
    let guard=0; while(M.phase!=='ft'&&M.phase!=='ht'&&guard++<400){ const out=stepMatch(C,M); const t=M.touch&&M.touch[0]; const xg=out.reduce((a,e)=>a+(e.xg||0),0); if(M.min<=100) L.mom[M.min]={s:t?t.s:0,v:0.25+xg*2.5,g:out.some(e=>e.t==='goal')}; for(const e of out) feedPush(e,true); if(to==='ht'&&M.htDone) break; }
    L.view={sc:[...M.sc],st:cloneSt(M.st),min:M.min,phase:M.phase,so:M.so?[...M.so.sc]:null};
    L.skipping=false; L.stage.skip=false; L.stage.so=false; L.stage.soInit=false; L.stage.kickoffShape(M.min>=40&&M.min<80?1:0); L.stage.snap(); updateLive(); renderFeed();
    if(M.phase==='ft'){ Sound.whistle('ft'); endLive(); } else if(M.phase==='ht'){ Sound.whistle('ht'); C.live={fid:L.fid,M}; queueSave(); L.stage.halftime(); renderHalftime(); } else if(!L.paused) liveLoop(L.loopId); },0); };
A.liveIntroSkip = ()=>{ const L=App.live; if(L&&L.introGo) L.introGo(); };
A.htPick = el => { App.live.speech=el.dataset.k; document.querySelectorAll('#lv-ht .opt').forEach(b=>{ const on=b.dataset.k===el.dataset.k; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); }); };
A.htProceed = ()=>{ const L=App.live; if(!L||L.M.phase!=='ht') return; const ok=resumeSecondHalf(L.M, L.speech); $('#lv-ht').innerHTML=''; if(ok){ Sound.whistle('ko'); L.paused=false; L.view.phase=L.M.phase; L.stage.kickoffShape(1); L.loopId=Math.random(); updateLive(); liveLoop(L.loopId); } };
A.ftHide = el => { const c=el.closest('.ftc'); if(c) c.classList.toggle('min'); };
A.liveReport = async ()=>{ const fid=App.live.fid; await closeLiveAndContinue(); App.modal={type:'fixture',id:fid}; renderModal(); };
A.liveContinue = ()=> closeLiveAndContinue();
A.awardsNight = el => { App.modal={type:'awardsNight',yr:+el.dataset.y}; renderModal(); };
A.closeCeremony = el => { const c=el.closest('.ceremony'); if(c){ if(c._fw) c._fw.stop(); c.classList.add('out'); setTimeout(()=>c.remove(),300); } };
A.replayGoal = el => { const C=App.C; const f=C.fixtures[el.dataset.f]; const lg=C.logs[f.id]; const e=(lg.ev||[]).filter(x=>x.t==='goal')[+el.dataset.i]; if(!e||!e.seq) return; const cv=$('#hl-canvas'); if(!cv) return;
  if(App.hl&&App.hl.cv!==cv){ App.hl.destroy(); App.hl=null; }
  if(!App.hl){ App.hl=new Stage(cv,{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:PREFS.view||'broadcast',section:C.section,sfx:true,onCaption:(t)=>{ const c=$('#hl-cap'); if(c) c.textContent=t; }}); }
  const st=App.hl; st.cancel(); const gen=(st.replayGen=(st.replayGen||0)+1);
  setTimeout(()=>{ if(!st.alive||st.replayGen!==gen) return; st.skip=false; st.setSides(lg.lu.map(L=>({slots:L.slots,off:{}})));
    lg.lu.forEach((L,i)=>{ const g=L.slots.find(s=>s.role==='GK'); if(g) st.setKeeper(i,g.pid); });
    st.clipStart(e); st.goalTs=0.9;
    const cap=$('#hl-cap'); if(cap) cap.textContent=`${e.m}' ${pname(Px(e.pid))} · ${GOAL_TYPE_NAME[e.ty]||''}${e.ast?' · assist '+pname(Px(e.ast)):''}`;
    st.goalSequence(e); },0); };
A.hlView = el => { PREFS.view=el.dataset.v; savePrefs(); if(App.hl){ App.hl.mode=el.dataset.v; App.hl.bgTac=null; } document.querySelectorAll('[data-a=hlView]').forEach(b=>b.classList.toggle('on',b.dataset.v===el.dataset.v)); };
A.cerAgain = el => { const c=el.closest('.ceremony'); if(c&&c._fw) c._fw.restart(); Sound.goal(); };
/* ---------- change / input handlers ---------- */
CH.search = el => { App.q=el.value; const q=el.value.trim().toLowerCase(); const box=$('#sres'); if(!box) return; if(q.length<2){ box.innerHTML=''; return; } const C=App.C; const out=[];
  for(const s of Object.values(C.schools)){ if(s.ext&&!s.honors.length) continue; if(s.name.toLowerCase().includes(q)||s.mascot.toLowerCase().includes(q)) out.push(`<button data-a="openSchool" data-id="${s.id}">${crest(s,18)}<span class="grow">${esc(s.name)}<div class="tiny muted">School</div></span></button>`); if(out.length>4) break; }
  let n=0; for(const p of everyone(C)){ if((p.fn+' '+p.ln).toLowerCase().includes(q)){ out.push(`<button data-a="openPlayer" data-id="${p.id}">${posTag(p.pos)}<span class="grow">${esc(pname(p))}<div class="tiny muted">${esc(Sx(p.sid)?Sx(p.sid).town:'')} · ${C.alumni[p.id]?'Class of '+C.alumni[p.id].gradYr:LVL_NAME[p.lvl]}</div></span></button>`); if(++n>=10) break; } }
  const sMatch=C.league.find(id=>Sx(id).town.toLowerCase().includes(q)); if(sMatch) out.push(`<button data-a="go" data-r="history" data-p='{"tab":"results","sid":"${sMatch}"}'>${icon('history',16)}<span class="grow">Every ${esc(Sx(sMatch).town)} game<div class="tiny muted">Historical results</div></span></button>`);
  box.innerHTML = out.length? `<div class="sres" role="listbox">${out.join('')}</div>` : `<div class="sres"><div class="muted small" style="padding:10px">No matches.</div></div>`; };
CH.squadSchool = el => { App.params.sid=el.value; delete App.params.sel; render(); };
CH.param = el => { App.params[el.dataset.k]=el.value; App.keepScroll=true; render(); };
CH.tac = (el,e) => { const {lu}=curLuCtx(); lu.tac[el.dataset.k]=+el.value; const lab=$('#tacv-'+el.dataset.k); if(lab) lab.textContent=el.value; if(e.type==='change'){ App.odds.clear(); queueSave(); } };
CH.formation = el => { const {C,sid,lvl,lu}=curLuCtx(); const tpl=FORMS[el.value]; if(!tpl) return; const pids=lu.slots.map(s=>s.pid).filter(Boolean); const slots=tpl.map(([role,x,y])=>({role,x,y,pid:null})); const used=new Set();
  const pairs=[]; slots.forEach((s,i)=>pids.forEach(pid=>{ const p=C.players[pid]; if(p) pairs.push([eff(p,s.role),i,pid]); })); pairs.sort((a,b)=>b[0]-a[0]); for(const [v,i,pid] of pairs){ if(slots[i].pid||used.has(pid)) continue; slots[i].pid=pid; used.add(pid); }
  lu.form=el.value; lu.slots=slots; lu.custom=false; delete App.params.why; changed(); };
CH.snap = el => { App.snap=el.checked; App.keepScroll=true; render(); };
CH.role = el => { const {lu}=curLuCtx(); const s=lu.slots[+App.params.sel]; if(!s) return; s.role=el.value; if(!lu.custom){ lu.base=lu.form; lu.custom=true; } changed(); };
CH.captain = el => { const {lu}=curLuCtx(); lu.caps[+el.dataset.i]=el.value; changed(); };
CH.move = el => { if(!el.value) return; A.promote({dataset:{id:el.dataset.id,to:el.value}}); };
CH.panel = el => { PREFS.panels[el.dataset.k]=el.checked; savePrefs(); App.keepScroll=true; render(); };
CH.pvHt = el => { App.modal.ht=el.checked; renderModal(); };
CH.setting = el => { App.C.settings[el.dataset.k]=el.checked; App.odds.clear(); queueSave(); App.keepScroll=true; render(); };
CH.pref = el => { PREFS[el.dataset.k]=el.checked; savePrefs(); applyTheme(); };
CH.soundOn = el => { PREFS.sound.on=el.checked; savePrefs(); if(el.checked){ Sound.ensure(); Sound.syncMenu(); } else { Sound.vols(); Sound.musicStop(); Sound.crowdStop(); } };
CH.vol = el => { PREFS.sound[el.dataset.k]=+el.value; savePrefs(); Sound.vols(); };
CH.mute = el => { PREFS.sound[el.dataset.k]=el.checked; savePrefs(); Sound.vols(); };
CH.themeColor = el => { const c={...themeColors()}; c[el.dataset.k]=el.value; PREFS.theme={preset:null,custom:c}; savePrefs(); applyTheme(); const hx=el.parentElement.querySelector('[data-c=themeHex]'); if(hx) hx.value=el.value; };
CH.themeHex = (el,e) => { let v=el.value.trim(); if(!v.startsWith('#')) v='#'+v; if(!validHex(v)) return; const c={...themeColors()}; c[el.dataset.k]=v.toLowerCase(); PREFS.theme={preset:null,custom:c}; savePrefs(); applyTheme(); const cp=el.parentElement.querySelector('[data-c=themeColor]'); if(cp) cp.value=v.toLowerCase(); };
CH.stadium = (el,e) => { if(el.type==='text'&&e.type==='input') return; const C=App.C; const sid=(App.params.sid&&C.settings.manager)?App.params.sid:C.userSid; const st=Sx(sid).stadium; const v= el.dataset.k==='tier'? +el.value : el.value; st.ovr={...(st.ovr||{}),[el.dataset.k]:v}; if(el.dataset.k==='tier') delete st.ovr.cap; changed(); };
CH.modalYr = el => { App.modal.yr=el.value; renderModal(); };
CH.liveTac = el => { const L=App.live; if(!L) return; const S=L.M.sides[L.M.user]; const t={...S.tac,[el.dataset.k]:+el.value}; setLiveTactics(L.M,L.M.user,t); document.querySelectorAll(`[id$="v-${el.dataset.k}"]`).forEach(x=>{ if(x.id.startsWith('ht')||x.id.startsWith('lt')) x.textContent=el.value; }); };
CH.liveForm = el => { liveFormationChange(el.value); if(App.live.M.phase==='ht'){ renderHalftime(); } };
CH.impFile = el => { const f=el.files&&el.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ $('#imp-text').value=r.result; }; r.readAsText(f); };

/* ---------- lineup drag & keyboard ---------- */
let drag=null;
let bdrag=null;
function benchDown(e){ const card=e.target.closest('.bcard[data-bench]'); if(!card) return false; const {sid}=curLuCtx(); if(!canEdit(sid)) return false; bdrag={card,id:card.dataset.bench,x0:e.clientX,y0:e.clientY,ghost:null,pid:e.pointerId}; return true; }
function benchMove(e){ if(!bdrag) return false; const dx=e.clientX-bdrag.x0, dy=e.clientY-bdrag.y0; if(!bdrag.ghost){ if(Math.hypot(dx,dy)<6) return true; const g=bdrag.card.querySelector('.bc-face').cloneNode(true); g.className='drag-ghost'; document.body.appendChild(g); bdrag.ghost=g; bdrag.card.classList.add('lifted'); document.body.classList.add('dragging'); }
  bdrag.ghost.style.left=e.clientX+'px'; bdrag.ghost.style.top=e.clientY+'px'; document.querySelectorAll('#pitch .tok.drop').forEach(t=>t.classList.remove('drop')); bdrag.ghost.style.display='none'; const u=document.elementFromPoint(e.clientX,e.clientY); bdrag.ghost.style.display=''; const t=u&&u.closest('#pitch .tok'); if(t) t.classList.add('drop'); e.preventDefault(); return true; }
function benchUp(e){ if(!bdrag) return false; const d=bdrag; bdrag=null; document.body.classList.remove('dragging'); document.querySelectorAll('#pitch .tok.drop').forEach(t=>t.classList.remove('drop')); if(!d.ghost) return true; d.ghost.style.display='none'; const u=document.elementFromPoint(e.clientX,e.clientY); d.ghost.remove(); d.card.classList.remove('lifted');
  const t=u&&u.closest('#pitch .tok'); if(t){ App.params.sel=t.dataset.slot; A.benchIn({dataset:{id:d.id}}); toast('Substitution made.'); } return true; }
function onPointerDown(e){ if(benchDown(e)) return; const tok=e.target.closest('#pitch .tok'); if(!tok) return; const {sid}=curLuCtx(); if(!canEdit(sid)) return; drag={tok,i:+tok.dataset.slot,x0:e.clientX,y0:e.clientY,moved:false,pid:e.pointerId}; try{ tok.setPointerCapture(e.pointerId); }catch(_){} }
function onPointerMove(e){ if(benchMove(e)) return; if(!drag) return; const dx=e.clientX-drag.x0, dy=e.clientY-drag.y0; if(!drag.moved&&Math.hypot(dx,dy)<5) return; drag.moved=true; drag.tok.classList.add('drag'); const r=$('#pitch').getBoundingClientRect(); const x=clamp((e.clientX-r.left)/r.width*100,2,98), y=clamp((e.clientY-r.top)/r.height*100,2,98); drag.tok.style.left=x+'%'; drag.tok.style.top=y+'%'; e.preventDefault(); }
function onPointerUp(e){ if(benchUp(e)) return; if(!drag) return; const d=drag; drag=null; try{ d.tok.releasePointerCapture(d.pid); }catch(_){}
  if(!d.moved){ App.params.sel = App.params.sel===String(d.i)?undefined:String(d.i); if(App.params.sel===undefined) delete App.params.sel; App.keepScroll=true; render(); setTimeout(()=>$(`#pitch .tok[data-slot="${d.i}"]`)?.focus({preventScroll:true}),0); return; }
  const {lu}=curLuCtx(); const r=$('#pitch').getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*100, y=100-(e.clientY-r.top)/r.height*100;
  d.tok.style.visibility='hidden'; const under=document.elementFromPoint(e.clientX,e.clientY); d.tok.style.visibility='';
  const other=under&&under.closest('#pitch .tok'); if(other&&+other.dataset.slot!==d.i){ const j=+other.dataset.slot; [lu.slots[d.i].pid,lu.slots[j].pid]=[lu.slots[j].pid,lu.slots[d.i].pid]; toast('Players swapped.'); }
  else moveSlot(lu,d.i,x,y);
  App.params.sel=String(d.i); changed(); }
function onKey(e){
  const typing=e.target&&e.target.matches&&e.target.matches('input,select,textarea');
  if(App.live&&!typing&&!App.modal){ if(e.key===' '){ e.preventDefault(); A.livePause(); return; } if(['1','2','3','4'].includes(e.key)){ A.liveSpeed({dataset:{v:[1,2,4,8][+e.key-1]}}); return; } if(e.key==='v'||e.key==='V'){ A.liveView({dataset:{v:(PREFS.view||'broadcast')==='broadcast'?'tactical':'broadcast'}}); return; } }
  if(e.key==='Escape'){ const cer=document.querySelector('.ceremony'); if(cer){ A.closeCeremony(cer.querySelector('button')); return; } if(App.drawer){ A.closeDrawer(); return; } if(App.modal){ A.closeModal(); return; } }
  const tok=e.target.closest&&e.target.closest('#pitch .tok');
  if(tok && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){ const {sid,lu}=curLuCtx(); if(!canEdit(sid)) return; e.preventDefault(); const i=+tok.dataset.slot; const s=lu.slots[i]; const st=App.snap!==false?4:2; const dx={ArrowLeft:-st,ArrowRight:st}[e.key]||0, dy={ArrowUp:st,ArrowDown:-st}[e.key]||0; moveSlot(lu,i,s.x+dx,s.y+dy); App.params.sel=String(i); changed(); setTimeout(()=>$(`#pitch .tok[data-slot="${i}"]`)?.focus({preventScroll:true}),0); }
  if(e.key==='Enter' && e.target.matches&&e.target.matches('th.sort')) A.sortBy(e.target,e);
  if((e.key==='Enter'||e.key===' ') && e.target.matches&&e.target.matches('[role=button][data-a]')){ e.preventDefault(); e.target.click(); return; }
  // focus trap inside open dialogs
  if(e.key==='Tab'){ const box=document.querySelector('.htbox')||(App.live?document.querySelector('.live'):null)||document.querySelector('#modal-root .modal, #modal-root .drawer'); if(!box) return; const f=[...box.querySelectorAll('button,select,input,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null); if(!f.length) return; const first=f[0], last=f[f.length-1]; if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); } }
}

/* ---------- boot ---------- */
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-a]');
  if(App.simMenu && !(el&&(el.dataset.a==='simMenu'||el.dataset.a==='simAhead'))){ App.simMenu=false; App.keepScroll=true; render(); if(!el) return; }
  if(!el){ if(!e.target.closest('.search')) { const b=$('#sres'); if(b) b.innerHTML=''; } return; }
  if(el.closest('#pitch') && el.classList.contains('tok')) return; // handled by pointer events
  const fn=A[el.dataset.a]; if(!fn) return;
  if(el.dataset.a!=='scrimClose' && el.closest('[data-stop]') && el.dataset.a==='scrimClose') return;
  if(el.dataset.a==='scrimClose' && e.target!==el) return;
  e.preventDefault();
  if(PREFS.sound.on && !Sound.ctx) { Sound.ensure(); Sound.syncMenu(); }
  try{ fn(el,e); }catch(err){ console.error(err); toast('Something went wrong: '+(err.message||err)); }
});
document.addEventListener('input', e=>{ const el=e.target.closest('[data-c]'); if(el&&CH[el.dataset.c]&&['search','tac','liveTac','themeHex','vol'].includes(el.dataset.c)) CH[el.dataset.c](el,e); });
document.addEventListener('change', e=>{ const el=e.target.closest('[data-c]'); if(el&&CH[el.dataset.c]&&el.dataset.c!=='search') { try{ CH[el.dataset.c](el,e); }catch(err){ console.error(err); toast('Something went wrong: '+(err.message||err)); } } });
document.addEventListener('pointerdown', onPointerDown); document.addEventListener('pointermove', onPointerMove, {passive:false}); document.addEventListener('pointerup', onPointerUp); document.addEventListener('pointercancel', ()=>{ drag=null; });
document.addEventListener('keydown', onKey);
window.addEventListener('beforeunload', ()=>{ if(App.C) saveNow(); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && App.C) saveNow(); });
(async function boot(){
  applyTheme();
  const ok = typeof indexedDB!=='undefined' ? await DB.open() : (App.mem=true,false);
  if(!ok) App.mem=true;
  if(PREFS.lastSlot && !App.mem){ try{ const c=await DB.getCareer(PREFS.lastSlot); if(c){ await openSlot(PREFS.lastSlot); return; } }catch(e){} }
  render();
})();
