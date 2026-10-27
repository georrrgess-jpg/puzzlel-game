/* ===================== LIVE MATCH SCREEN =====================
   Sync rule: the engine resolves a minute first, but nothing about it is shown (commentary, score,
   sounds, banners, cards) until the Stage animation reaches that moment and calls emit(e).
   Anything the animation never showed (period markers, low-key events) is flushed in order
   once the minute's animation has finished. */
const SPEED_MS={1:1500,2:780,4:400,8:200};
const GOAL_TS={1:1,2:.8,4:.55,8:.4};
const LINES={
  goal:{open:['{p} finds the bottom corner!','{p} slots it home!','{p} keeps his cool and scores!','{p} picks his spot and buries it!'],cross:['{a} whips it in and {p} converts!','A pinpoint cross from {a}, finished by {p}!','{a} delivers, {p} does the rest!'],header:['{p} rises highest and powers a header in!','Thumping header from {p}!','{p} meets it with his forehead. In off the underside!'],long:['{p} lets fly from distance. What a strike!','{p} from 25 yards! Unstoppable!','{p} hits it on the laces. Top corner!'],tapin:['{p} is there to tap it in!','{p} reacts first and scores from close range.'],corner:['From the corner, {p} heads it in!','Chaos in the box and {p} bundles it over the line!'],fk:['{p} curls the free kick over the wall!','{p} bends it around the wall and in!'],pen:['{p} sends the keeper the wrong way from the spot.','{p} steps up and rolls the penalty home.'],solo:['{p} dances past two defenders and finishes!','Brilliant solo goal from {p}!','{p} beats his man and goes all the way himself!'],break:['{p} races clear and finishes the breakaway!','One on one, and {p} makes no mistake!','{p} outruns everyone and slots it home!']},
  save:['{g} gets down well to deny {p}.','Big stop from {g}!','{p} forces a fine save from {g}.','{g} spreads himself and smothers it.','Strong hands from {g} to keep out {p}.'],
  offside:['🚩 {p} goes too early. The flag is up.','🚩 Offside: {p} was a yard beyond the last defender.','🚩 {p} is caught offside.','🚩 The assistant\'s flag stops {p}.'],
  miss:['{p} should have scored there.','{p} drags it wide.','{p} blazes it over.','{p} can only find the side netting.'],
  yellow:['{p} goes into the book.','Yellow card for {p}.','{p} is cautioned for a late challenge.'],
  poss:['{t} are dominating possession.','{t} are pinning them back.','{t} keep the ball well in midfield.','Patient build-up from {t}.','{t} are moving it side to side, probing for an opening.']
};
function pickLine(list,seed){ return list[hashStr(String(seed))%list.length]; }
function liveRoot(){ let el=$('#live-root'); if(!el){ el=document.createElement('div'); el.id='live-root'; document.body.appendChild(el); } return el; }
function startLive(fid, o){
  const C=App.C; const f=C.fixtures[fid];
  const v=validateLineup(C,C.userSid,'V'); if(!v.ok) repairLineup(C,C.userSid,'V');
  const od=oddsFor(fid); const preP=[od.h,od.a];
  const M=startMatch(C,fid,{halftime:o.ht,preP});
  C.live={fid, M}; queueSave(); App.modal=null; renderModal();
  openLive(M,fid,o.speed||2,false);
}
function resumeLive(){ const C=App.C; if(!C.live) return; const {fid,M}=C.live; if(C.fixtures[fid].st==='d'){ C.live=null; return; } openLive(M,fid,C.settings.speed||2,true); }
const cloneSt=st=>st.map(s=>({...s}));
function openLive(M,fid,speed,resumed){
  const C=App.C; const f=C.fixtures[fid];
  App.live={M,fid,speed,paused:resumed&&M.phase!=='ht',done:false,speech:'none',proceeded:false,tab:'feed',feed:[],mom:[],busy:false,loopId:Math.random(),
    view:{sc:[...M.sc], st:cloneSt(M.st), min:M.min, phase:M.phase, so:M.so?[...M.so.sc]:null}, pending:null};
  buildLive(); const L=App.live;
  L.stage=new Stage($('#lv-canvas'),{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:PREFS.view||'broadcast',uzoom:true,onCaption:liveCaption,emit:liveEmit,section:C.section,weather:weatherFor(f),relabel:true,sfx:true,board:()=>({h:boardName(Sx(f.h)),a:boardName(Sx(f.a)),sc:L.view.sc,min:L.view.phase==='so'?'PENS':L.view.min?`${L.view.min}'`:'KICKOFF'})});
  L.stage.setSides(M.sides); for(let i=0;i<2;i++) L.stage.setKeeper(i,M.sides[i].gk);
  L.stage.kickoffShape(M.min>=40&&M.min<80?1:0); L.stage.snap();
  for(const e of M.ev) feedPush(e,true);
  document.body.classList.add('locked'); Sound.musicStop(); Sound.crowdStart();
  updateLive(); renderFeed();
  if(M.phase==='ht'){ renderHalftime(); return; }
  if(resumed){ L.stage.paused=L.paused; $('.live')?.classList.toggle('paused',L.paused); if(!L.paused) liveLoop(L.loopId); return; }
  const kick=()=>{ if(App.live!==L) return; Sound.whistle('ko'); if(!L.paused) liveLoop(L.loopId); };
  liveIntro(()=>{ if(App.live!==L) return; const next=()=>{ if(App.live!==L) return; if(wantWalkout(f)) liveWalkout(kick); else kick(); }; if(wantSeniorNight(f)) liveSeniorNight(next); else next(); });
}
/* matchday title card: who, what's at stake, where */
function liveIntro(done){
  const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const h=Sx(f.h), a=Sx(f.a); const el=$('#lv-intro'); if(!el){ done(); return; }
  const ko=isKO(f.comp); const big=f.comp==='st'&&f.rd===2? 'STATE CHAMPIONSHIP' : f.comp==='rgn'? 'REGIONAL FINAL' : f.comp==='sec'&&f.rd===2? 'SECTIONAL FINAL' : '';
  const ven=f.ven||(stadiumOf?stadiumOf(h):''); const riv=isHeated(f); const R=riv?rivalrySeries(C):null; const w=weatherFor(f);
  el.innerHTML=`<div class="lvi ${ko?'ko':''} ${riv?'riv':''}" style="--c1:${h.c1};--c2:${a.c1}" data-a="liveIntroSkip"><div class="lvi-bg"></div>${riv?'<div class="lvi-embers"></div>':''}
    <div class="lvi-top">${riv?`<div class="lvi-big">RIVALRY NIGHT</div>`:big?`<div class="lvi-big">${big}</div>`:''}<div class="lvi-comp">${esc(fixtureLabel(f))}${ko?' · Win or go home':''}</div></div>
    ${riv?`<div class="lvi-riv"><div class="lvi-boot">${bootTrophySVG()}</div><div class="lvi-rtxt"><b>${esc(R.name)}</b><span>Series ${R.w}–${R.d}–${R.l} · ${R.holder?(R.holder===C.userSid?'you hold the trophy':esc(Sx(R.holder).town)+' hold the trophy'):'trophy up for grabs'}</span></div></div>`:''}
    <div class="lvi-row"><div class="lvi-team l">${logo(h,112)}<b>${esc(h.town)}</b><span>${esc(h.mascot)}</span></div><div class="lvi-vs">VS</div><div class="lvi-team r">${logo(a,112)}<b>${esc(a.town)}</b><span>${esc(a.mascot)}</span></div></div>
    <div class="lvi-foot">${esc(ven||'')} · ${WX[w.k].i} ${WX[w.k].n}, ${w.t}°F${w.night?' · under the lights':''}</div></div>`;
  let fired=false; const go=()=>{ if(fired) return; fired=true; const node=el.firstElementChild; node?.classList.add('out'); setTimeout(()=>node&&node.remove(),420); done(); };
  L.introGo=go; setTimeout(go, reducedMotion()?900:(ko||riv?3400:2400));
}
function boardName(s){ const w=String(s&&s.town||'').toUpperCase().replace(/[^A-Z ]/g,'').split(' ').filter(Boolean); if(!w.length) return ''; if(w.length===1) return w[0].slice(0,3); const last=w[w.length-1]; return (w.slice(0,-1).map(x=>x[0]).join('')+last).slice(0,3); }
function stadiumOf(s){ return s&&s.stadium&&s.stadium.name? s.stadium.name : ''; }
function buildLive(){
  const L=App.live, M=L.M, C=App.C; const f=C.fixtures[L.fid]; const h=Sx(f.h), a=Sx(f.a); const k=kitsFor(f);
  liveRoot().innerHTML=`<div class="live" role="dialog" aria-modal="true" aria-label="Live match">
   <header class="bug"><div class="bug-team">${crest(h,40)}<div class="bug-name"><b>${esc(h.town)}</b><span>${esc(h.mascot)}</span></div><i class="kitbar" style="background:${k.team[0].shirt}"></i></div>
     <div class="bug-mid"><div class="bug-score" id="lv-score" aria-live="polite"><span>0</span><em>–</em><span>0</span></div><div class="bug-clock" id="lv-clock">KICKOFF</div></div>
     <div class="bug-team r"><i class="kitbar" style="background:${k.team[1].shirt}"></i><div class="bug-name"><b>${esc(a.town)}</b><span>${esc(a.mascot)}</span></div>${crest(a,40)}</div></header>
   <div class="possbar" title="Possession"><i id="lv-ph" style="background:${k.team[0].shirt}"></i><i id="lv-pa" style="background:${k.team[1].shirt}"></i><span id="lv-pt"></span></div>
   <div class="lv-main"><div class="lv-stage" id="lv-stage"><canvas id="lv-canvas" aria-label="Match animation"></canvas><div id="lv-cap" class="lv-cap" aria-live="polite"></div><div id="lv-banner"></div><div id="lv-ftc"></div><button class="lv-paused" data-a="livePause" aria-label="Resume match"><span>❚❚</span><b>Paused</b><small>Press Space or tap to resume</small></button></div>
     <aside class="lv-panel"><div class="tabs" role="tablist">${[['feed','Commentary'],['stats','Stats'],['mom','Momentum'],['lu','Lineups']].map(([k2,l])=>`<button class="tab ${L.tab===k2?'on':''}" role="tab" data-a="liveTab" data-v="${k2}">${l}</button>`).join('')}</div><div id="lv-pbody" class="lv-pbody"></div></aside></div>
   <footer class="lv-ctrl" id="lv-ctrl"></footer><div id="lv-ht"></div><div id="lv-intro"></div></div>`;
}
function liveCaption(text,kind){ const el=$('#lv-cap'); if(!el) return; const L=App.live; if(L&&(L.done||L.skipping||(L.stage&&L.stage.skip))) return; el.innerHTML=`<span class="cap ${kind||''}">${esc(text)}</span>`; clearTimeout(liveCaption.t); liveCaption.t=setTimeout(()=>{ if(el) el.innerHTML=''; },1300); }
/* the single entry point for showing an event: called by the Stage at the visual moment */
function liveEmit(e){
  const L=App.live; if(!L) return; const P=L.pending; if(P){ if(P.done.has(e)) return; P.done.add(e); }
  const V=L.view;
  if(e.t==='goal'){ const sh=(L.M.shots||[]).find(x=>x.m===e.m&&x.pid===e.pid&&x.res==='goal'); if(sh) sh.ty=e.ty; V.sc=[...e.sc]; Sound.goal(); const stg=$('#lv-stage'); if(stg&&!reducedMotion()){ const sc=Sx(e.s===0?App.C.fixtures[L.fid].h:App.C.fixtures[L.fid].a); stg.style.setProperty('--gfc',sc.c1); stg.classList.remove('goalfx'); void stg.offsetWidth; stg.classList.add('goalfx'); } goalBanner(e); clearTimeout(liveEmit.bt); liveEmit.bt=setTimeout(clearBanner, reducedMotion()?1800:3200); bumpScore(e.s); }
  else if(e.t==='yellow'||e.t==='red') Sound.whistle('card');
  else if(e.t==='save') Sound.save();
  else if(e.t==='miss') Sound.miss();
  else if(e.t==='ht') Sound.whistle('ht');
  else if(e.t==='ft') Sound.whistle('ft');
  else if(e.t==='kick'){ V.so=[...e.soSc]; (V.soK||(V.soK=[[],[]]))[e.s].push(e.res==='goal'); if(e.res==='goal') Sound.goal(); else if(e.res==='save') Sound.save(); else Sound.miss(); soBoard(); }
  else if(e.t==='so'){ V.so=[0,0]; V.phase='so'; V.soK=[[],[]]; soBoard(); }
  feedPush(e); renderFeed(); updateLive(true);
}
function bumpScore(side){ const sc=$('#lv-score'); if(!sc) return; const s=sc.children[side===0?0:2]; if(s){ s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); } }
function flushPending(){ const L=App.live; if(!L||!L.pending) return; const P=L.pending; L.pending=null; for(const e of P.out){ if(!P.done.has(e)){ L.pending=P; liveEmit(e); L.pending=null; } } }
function feedPush(e,quiet){ const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const nm=i=>Sx(i===0?f.h:f.a).town; const P=id=>esc(pname(Px(id)));
  let txt=null, cls='';
  if(e.t==='goal'){ const g=LINES.goal[e.ty]||LINES.goal.open; txt=`<b>GOAL! ${esc(nm(e.s))} ${e.sc[0]}–${e.sc[1]}.</b> ${pickLine(g,e.m+e.pid).replace('{p}',P(e.pid)).replace('{a}',e.ast?P(e.ast):'a teammate')}`; cls='goal'; }
  else if(e.t==='save'&&e.xg>=0.12) { txt=pickLine(LINES.save,e.m+e.pid+(e.xg||0)+L.feed.length).replace('{p}',P(e.pid)).replace('{g}',P(e.gk)); cls='chance'; }
  else if(e.t==='miss'&&e.xg>=0.22) { txt=pickLine(LINES.miss,e.m+e.pid+(e.xg||0)+L.feed.length).replace('{p}',P(e.pid)); cls='chance'; }
  else if(e.t==='offside'){ txt=pickLine(LINES.offside,e.m+e.pid).replace('{p}',P(e.pid)); }
  else if(e.t==='yellow'){ txt=`🟨 ${pickLine(LINES.yellow,e.m+e.pid).replace('{p}',P(e.pid))}`; }
  else if(e.t==='red'){ txt=`🟥 ${P(e.pid)} is sent off${e.k==='2y'?' for a second yellow':''}. ${esc(nm(e.s))} down to ten.`; cls='red'; }
  else if(e.t==='ht') { txt='<b>Half time.</b>'; cls='per'; }
  else if(e.t==='et') { txt='<b>Level after 80 minutes. Two 10-minute periods of extra time.</b>'; cls='per'; }
  else if(e.t==='so') { txt='<b>Still level. Penalty shootout.</b>'; cls='per'; }
  else if(e.t==='kick') { txt=`${esc(nm(e.s))}: ${P(e.pid)} ${e.res==='goal'?'scores':e.res==='save'?'is saved':'misses'} (${e.soSc[0]}–${e.soSc[1]})`; cls=e.res==='goal'?'kick ok':'kick no'; }
  else if(e.t==='ft') { txt='<b>Full time.</b>'; cls='per'; }
  if(txt) L.feed.unshift({m:e.t==='kick'?'PK':e.t==='ft'?'FT':e.m+"'",txt,cls,fresh:!quiet});
}
function renderFeed(){ const L=App.live; const body=$('#lv-pbody'); if(!body||L.tab==='tac') return; const M=L.M; const C=App.C; const f=C.fixtures[L.fid]; const k=kitsFor(f); const V=L.view;
  if(L.tab==='feed'){ body.innerHTML = L.feed.length? L.feed.map((x,i)=>`<div class="fe ${x.cls} ${x.fresh&&i===0?'new':''}"><span class="m">${x.m}</span><span>${x.txt}</span></div>`).join('') : '<div class="muted small" style="padding:8px 0">Kickoff. Commentary appears here.</div>'; if(L.feed[0]) L.feed[0].fresh=false; }
  else if(L.tab==='stats'){ const st=V.st; const pt=st[0].pos+st[1].pos||1; const rows=[['Possession',R(st[0].pos/pt*100)+'%',R(st[1].pos/pt*100)+'%',st[0].pos,st[1].pos],['Shots',st[0].sh,st[1].sh],['On target',st[0].sot,st[1].sot],['Expected goals',fmt1(st[0].xg),fmt1(st[1].xg),st[0].xg,st[1].xg],['Saves',st[0].sv,st[1].sv],['Corners',st[0].cor,st[1].cor],['Offsides',st[0].off||0,st[1].off||0],['Fouls carded',st[0].y+st[0].r,st[1].y+st[1].r]];
    body.innerHTML=`<div class="col" style="gap:10px;padding-top:8px">${rows.map(([l,x,y,vx,vy])=>{ const X=+(vx??x), Y=+(vy??y), t=X+Y||1; return `<div class="statline"><b class="mono">${x}</b><span class="lab3">${l}</span><b class="mono" style="text-align:right">${y}</b><div class="dual"><i style="width:${X/t*100}%;background:${k.team[0].shirt}"></i><i style="width:${Y/t*100}%;background:${k.team[1].shirt}"></i></div></div>`; }).join('')}<p class="tiny muted">Running totals, updated as each minute finishes.</p></div>`; }
  else if(L.tab==='mom'){ const n=Math.max(80,V.min); const w=300, h=150; const bw=w/n; let bars=''; for(let i=1;i<=V.min;i++){ const m=L.mom[i]; if(!m) continue; const v=Math.min(1,m.v); const hh=v*(h/2-6); bars+= m.s===0? `<rect x="${(i-1)*bw}" y="${h/2-hh}" width="${Math.max(1,bw-0.6)}" height="${hh}" fill="${k.team[0].shirt}"/>` : `<rect x="${(i-1)*bw}" y="${h/2}" width="${Math.max(1,bw-0.6)}" height="${hh}" fill="${k.team[1].shirt}"/>`; if(m.g) bars+=`<circle cx="${(i-0.5)*bw}" cy="${m.s===0?8:h-8}" r="4" fill="#fff"/>`; }
    body.innerHTML=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Momentum by minute"><rect width="${w}" height="${h}" fill="rgba(255,255,255,.03)"/><path d="M0 ${h/2}H${w}" stroke="rgba(255,255,255,.3)"/><path d="M${40*bw} 0V${h}" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 3"/>${bars}</svg><div class="row small" style="justify-content:space-between"><span>${esc(Sx(f.h).town)} pressure ↑</span><span>${esc(Sx(f.a).town)} ↓</span></div><p class="tiny muted">Each bar is one minute: who had the ball and how dangerous their chances were. Dots mark goals.</p>`; }
  else { body.innerHTML=`<div class="grid g2" style="gap:10px;padding-top:8px">${M.sides.map((S,i)=>`<div><span class="lab">${esc(Sx(S.sid).town)} · ${esc(S.form)}</span><div class="list">${S.slots.map(s=>{ const p=Px(s.pid); const row=M.pl[s.pid]; const off=S.off[s.pid]&&L.stage&&L.stage.pl(s.pid)&&L.stage.pl(s.pid).off; return `<div class="li small" style="${off?'opacity:.4;text-decoration:line-through':''}">${p?`<span class="lu-face">${portraitSVG(p,26)}</span>`:''}<span class="mono muted" style="width:22px">${p?p.num:''}</span><span class="grow trunc">${esc(p?p.ln:'')}</span><span class="tiny muted">${s.role}</span></div>`; }).join('')}</div></div>`).join('')}</div>`; }
}
function updateLive(scoreOnly){
  const L=App.live; if(!L) return; const M=L.M; const V=L.view;
  const sc=$('#lv-score'); if(sc){ const sp=sc.children; if(sp.length===3){ if(sp[0].textContent!=String(V.sc[0])) sp[0].textContent=V.sc[0]; if(sp[2].textContent!=String(V.sc[1])) sp[2].textContent=V.sc[1]; } }
  const cl=$('#lv-clock'); if(cl) cl.textContent = V.phase==='so'?`PENS ${(V.so||[0,0])[0]}–${(V.so||[0,0])[1]}`: V.phase==='ft'?'FULL TIME' : V.phase==='ht'?'HALF TIME' : V.min===0?'KICKOFF': (V.min>80?`ET ${V.min}'`:`${V.min}'`);
  if(scoreOnly) return;
  /* v17: the home fill scales over the away fill (transform, see 30_motion.css); nothing is rewritten when unchanged */
  const ph=(V.st[0].pos+2)/(V.st[0].pos+V.st[1].pos+4)*100; const a=$('#lv-ph'), t=$('#lv-pt'); if(a){ const p=(ph/100).toFixed(4); if(a.style.getPropertyValue('--p')!==p) a.style.setProperty('--p',p); const tx=`${R(ph)}% possession ${R(100-ph)}%`; if(t&&t.textContent!==tx) t.textContent=tx; }
  const ctrl=$('#lv-ctrl'); if(!ctrl) return;
  /* v17: the control bar is only rebuilt when its markup changes (it used to be rebuilt every minute, which
     restyled the bar and dropped a tap that landed between pointerdown and click) */
  const set=h=>{ if(ctrl.v17h===h&&ctrl.firstChild) return; ctrl.v17h=h; ctrl.innerHTML=h; };
  if(L.done){ set(`<button class="btn" data-a="liveReport">Match report</button><button class="btn pri play" data-a="liveContinue" id="lv-cont">Continue</button>`); return; }
  if(M.phase==='ht'){ set('<span class="small muted">Half time: pick a talk, then proceed.</span>'); return; }
  const view=PREFS.view||'broadcast';
  set(`<button class="btn ico" data-a="livePause" aria-label="${L.paused?'Resume':'Pause'}" title="${L.paused?'Resume':'Pause'} (Space)">${L.paused?'▶':'❚❚'}</button>
   <div class="seg" role="group" aria-label="Speed">${[1,2,4,8].map(s=>`<button class="${L.speed===s?'on':''}" data-a="liveSpeed" data-v="${s}" aria-pressed="${L.speed===s}">${s}×</button>`).join('')}</div>
   ${v184ViewSeg('liveView',view)}${v184ZoomCtl('liveZoom',view)}
   <button class="btn sm" data-a="liveTactics">Tactics</button>${typeof soundBtn==='function'?soundBtn():''}
   ${!M.htDone&&M.htOn?'<button class="btn sm ghost" data-a="liveSkip" data-to="ht">Skip to half</button>':''}<button class="btn sm ghost" data-a="liveSkip" data-to="ft">Skip to end</button>
   <span class="tiny muted kb">Space pause · 1–4 speed · V camera · + − zoom · M sound · N names</span>`);
}
const waitMs=ms=>new Promise(r=>setTimeout(r,ms));
/* animate one resolved minute; every visible event is announced by the stage itself */
async function animateMinute(L,out,M){
  const st=L.stage; const W=SPEED_MS[L.speed]; st.goalTs=GOAL_TS[L.speed]||.85;
  const goals=out.filter(e=>e.t==='goal'), kicks=out.filter(e=>e.t==='kick');
  if(kicks.length){ for(const k of kicks) await st.soKick(k); return; }
  if(out.some(e=>e.t==='so')){ liveEmit(out.find(e=>e.t==='so')); await st.shootoutSetup(); return; }
  if(goals.length){
    st.skip=false; st.ts=clamp(W/1500,0.12,1.1);
    for(const e of out.filter(e=>e.t==='save'||e.t==='miss')) await st.shotSeq(e);
    for(const g of goals){ await st.goalSequence(g); }
    st.ts=clamp(W/1500,0.12,1.1); for(const e of out.filter(e=>e.t==='yellow'||e.t==='red')) await st.cardSeq(e);
    clearBanner(); return;
  }
  await st.playMinute(out,M,W);
}
async function liveLoop(id){
  const L=App.live; if(!L||L.busy) return; L.busy=true; const C=App.C; const M=L.M;
  try{
    while(App.live===L && L.loopId===id && !L.done){
      if(L.paused||M.phase==='ht') break;
      if(M.phase==='ft'){ endLive(); break; }
      const out=stepMatch(C,M);
      L.pending={out,done:new Set()}; L.view.min=M.min; updateLive(true);
      await animateMinute(L,out,M);
      if(App.live!==L) return;
      flushPending();
      // minute finished: now the stats, possession and momentum catch up
      const t=M.touch&&M.touch[0]; const xg=out.filter(e=>['goal','save','miss'].includes(e.t)).reduce((s,e)=>s+(e.xg||0),0);
      if(M.min<=100) L.mom[M.min]={s:t?t.s:0,v:0.25+xg*2.5,g:out.some(e=>e.t==='goal')};
      if(out.length===0 && M.min%9===0 && M.min<80){ const pt=M.st[0].pos+M.st[1].pos; const s=M.st[0].pos>M.st[1].pos?0:1; if(pt&&Math.abs(M.st[0].pos-M.st[1].pos)/pt>0.14){ L.feed.unshift({m:M.min+"'",txt:pickLine(LINES.poss,M.min).replace('{t}',esc(Sx(M.sides[s].sid).town)),cls:'flav'}); } }
      L.view.st=cloneSt(M.st); L.view.sc=[...M.sc]; if(M.so) L.view.so=[...M.so.sc]; L.view.phase=M.phase;
      updateLive(); renderFeed();
      if(out.some(e=>e.t==='ht')){ C.live={fid:L.fid,M}; queueSave(); if(M.phase==='ht'){ L.stage.halftime(); renderHalftime(); break; } }
      if(M.phase==='ft'){ endLive(); break; }
    }
  } finally {
    L.busy=false;
    // a resume/skip that arrived while a minute was animating restarts the loop here
    if(App.live===L && L.loopId!==id && !L.skipping && !L.paused && !L.done && L.M.phase!=='ht' && L.M.phase!=='ft') liveLoop(L.loopId);
  }
}
function goalBanner(e){ const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const s=Sx(e.s===0?f.h:f.a); const b=$('#lv-banner'); if(!b) return; const p=Px(e.pid);
  b.innerHTML=`<div class="goalbanner" style="--c1:${s.c1};--c2:${s.c2}"><div class="gb-logo">${logo(s,88)}</div>${p?`<div class="gb-face">${portraitSVG(p,78)}</div>`:''}<div class="gb-txt"><div class="gb-word">${'GOAL'.split('').map((ch,i)=>`<span style="animation-delay:${i*70}ms">${ch}</span>`).join('')}</div><div class="gb-sub">${e.m}' ${esc(pname(p))} · ${esc(v188GoalName(e))}${e.ast?` · assist ${esc(pname(Px(e.ast)))}`:''}</div></div></div>`; }
function clearBanner(){ const b=$('#lv-banner'); const g=b&&b.firstElementChild; if(!g) return; g.classList.add('out'); setTimeout(()=>{ if(b.firstElementChild===g) b.innerHTML=''; },380); }
function renderHalftime(){
  const L=App.live; const M=L.M; const C=App.C; const f=C.fixtures[L.fid]; const u=M.user; const st=M.ht.st; const pt=st[0].pos+st[1].pos||1; const k=kitsFor(f);
  const rows=[['Possession',R(st[0].pos/pt*100)+'%',R(st[1].pos/pt*100)+'%',st[0].pos,st[1].pos],['Shots on target',st[0].sot,st[1].sot],['Expected goals',fmt1(st[0].xg),fmt1(st[1].xg),st[0].xg,st[1].xg]];
  const diff=M.sc[u]-M.sc[1-u]; const weaker=M.preP&&M.preP[u]<M.preP[1-u];
  const hint = diff>0? (weaker?'Underdogs protecting a lead usually do best by keeping their shape and holding the line.':'Favorites with a lead tend to do best staying compact.') : diff<0? (weaker?'Trailing as the underdog, belief and focus matter most.':'Behind as the favorite, pushing numbers forward and rallying pay off most.') : (weaker?'Level as the underdog, belief and a compact shape work well.':'Level as the favorite, pressing for the winner is usually worth the risk.');
  $('#lv-ht').innerHTML=`<div class="htscrim"><div class="htbox" role="dialog" aria-modal="true" aria-labelledby="ht-title"><div class="mhead"><h2 id="ht-title">Half time · ${esc(Sx(f.h).town)} ${M.sc[0]} – ${M.sc[1]} ${esc(Sx(f.a).town)}</h2></div><div class="mbody">
    <div class="card"><h3>First half</h3><div class="col" style="gap:8px">${rows.map(([l,x,y,vx,vy])=>{ const X=+(vx??x), Y=+(vy??y), t=X+Y||1; return `<div class="statline"><b class="mono">${x}</b><span class="lab3">${l}</span><b class="mono" style="text-align:right">${y}</b><div class="dual"><i style="width:${X/t*100}%;background:${k.team[0].shirt}"></i><i style="width:${Y/t*100}%;background:${k.team[1].shirt}"></i></div></div>`; }).join('')}</div></div>
    <div class="notice small">Assistant coach: ${esc(hint)}</div>
    <div><span class="lab">Team talk for ${esc(Sx(M.sides[u].sid).town)}</span><div class="optcards" role="radiogroup" aria-label="Team talk" style="margin-top:6px">${Object.entries(SPEECHES).map(([key,s])=>`<button class="opt ${L.speech===key?'on':''}" role="radio" aria-checked="${L.speech===key}" data-a="htPick" data-k="${key}"><b>${esc(s.n)}</b><span>${esc(s.d)}</span></button>`).join('')}</div></div>
    <div class="card"><h3>Adjust tactics</h3>${tacSliders(M.sides[u].tac,'ht')}<div class="field" style="margin-top:8px"><label for="ht-form">Formation</label><select id="ht-form" data-c="liveForm">${opts(Object.keys(FORMS).map(x=>[x,x]),M.sides[u].form)}</select></div></div>
   </div><div class="mfoot"><span class="tiny muted" style="margin-right:auto">The talk lasts for the second half only. Opponents never get one.</span><button class="btn pri play" data-a="htProceed" id="ht-go">Proceed to second half</button></div></div></div>`;
  $('#ht-go')?.focus({preventScroll:true}); updateLive();
}
function tacSliders(t,pref){ return `<div class="col" style="gap:8px">${[['ment','Mentality','Defensive','Attacking'],['tempo','Tempo','Patient','Direct'],['press','Pressing','Sit off','High press'],['pass','Passing','Short','Long']].map(([k,l,a,b])=>`<div class="slider-row"><label class="lab" for="${pref}-${k}">${l}</label><input type="range" id="${pref}-${k}" min="0" max="100" step="1" value="${t[k]}" data-c="liveTac" data-k="${k}"><span class="mono" id="${pref}v-${k}">${t[k]}</span><div class="slider-ends"><span>${a}</span><span>${b}</span></div></div>`).join('')}</div>`; }
function liveFormationChange(form){ const L=App.live; const M=L.M; const C=App.C; const S=M.sides[M.user]; const tpl=FORMS[form]; if(!tpl) return;
  const avail=S.slots.map(s=>s.pid).filter(pid=>pid&&!S.off[pid]); const offs=S.slots.map(s=>s.pid).filter(pid=>pid&&S.off[pid]);
  const slots=tpl.map(([role,x,y])=>({role,x,y,pid:null})); const used=new Set();
  const gkSlot=slots.find(s=>s.role==='GK'); if(S.gk&&!S.off[S.gk]){ gkSlot.pid=S.gk; used.add(S.gk); }
  const pairs=[]; slots.forEach((s,i)=>{ if(s.pid) return; avail.forEach(pid=>{ if(!used.has(pid)) pairs.push([eff(C.players[pid],s.role),i,pid]); }); }); pairs.sort((a,b)=>b[0]-a[0]);
  for(const [v,i,pid] of pairs){ if(slots[i].pid||used.has(pid)) continue; slots[i].pid=pid; used.add(pid); }
  for(const s of slots) if(!s.pid&&offs.length) s.pid=offs.shift();
  setLiveTactics(M,M.user,null,form,slots);
  // keep the animation's players, just move their home positions
  for(const s of slots){ const p=L.stage.players.get(s.pid); if(p) p.slot=s; } }
function endLive(){ const L=App.live; if(!L||L.done) return; L.done=true; const C=App.C;
  flushPending(); finishMatch(C,L.M); C.live=null; queueSave(); const cap=$('#lv-cap'); if(cap) cap.innerHTML='';
  L.view.sc=[...L.M.sc]; L.view.st=cloneSt(L.M.st); L.view.phase='ft'; if(L.M.so) L.view.so=[...L.M.so.sc];
  if(!L.feed.length||L.feed[0].m!=='FT'){ feedPush({t:'ft'}); Sound.whistle('ft'); }
  if(!L.resPlayed&&!L.M.spectate){ L.resPlayed=1; try{ const w=matchWinnerIdx(L.M), u=L.M.user; Sound.result(u<0||w===-1?'draw':w===u?'win':'loss'); }catch(e){} }
  updateLive(); renderFeed(); Sound.crowdStop();
  const f=C.fixtures[L.fid]; const u=L.M.user; const won=f.w===C.userSid; const drew=!f.w;
  const st=L.stage; const ws=f.w===f.h?0:f.w===f.a?1:-1; st.cancel(); st.fullTime(ws);
  clearTimeout(endLive.t); endLive.t=setTimeout(()=>{ if(App.live===L) ftCard(); }, reducedMotion()?200:1500);
  setTimeout(()=>$('#lv-cont')?.focus(),50);
}
async function closeLiveAndContinue(){
  const L=App.live; const C=App.C; if(!L) return; const f=C.fixtures[L.fid];
  L.loopId=null; if(!L.done){ L.stage.cancel(); endLive(); }
  clearTimeout(liveEmit.bt); L.stage.destroy(); App.live=null; liveRoot().innerHTML=''; document.body.classList.remove('locked'); Sound.syncMenu();
  completeRound(f.id);
}

/* full-time card over the pitch: user's school on the left, the goals, and the player of the match */
function ftCard(){ const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const lg=C.logs[f.id]; const el=$('#lv-ftc'); if(!el) return;
  const o=userFirst(f); const T=[Sx(f.h),Sx(f.a)], G=[f.hg,f.ag]; const me=C.userSid; const spec=!!L.M.spectate&&f.h!==me&&f.a!==me; const res=spec?(f.w?`${esc(Sx(f.w).town)} win`:'Draw'):f.w===me?'Victory':f.w?'Defeat':'Draw';
  const goals=(L.M.ev||[]).filter(e=>e.t==='goal'); const col=i=>goals.filter(e=>e.s===i).map(e=>`<li><b>${e.m}'</b> ${esc(pname(Px(e.pid)))}</li>`).join('')||'<li class="muted">—</li>';
  let potm=null; if(lg&&lg.box){ for(const side of lg.box) for(const r of side){ if(r.gp===0) continue; if(!potm||(r.rt||0)>(potm.rt||0)) potm=r; } }
  const pp=potm&&Px(potm.pid);
  el.innerHTML=`<div class="ftc ${spec?'draw':f.w===me?'win':f.w?'loss':'draw'}" data-a="ftHide"><div class="ftc-k">Full time${f.pk?' · penalties':f.et?' · after extra time':''}</div>
    <div class="ftc-row"><div class="ftc-t">${logo(T[o[0]],64)}<b>${esc(T[o[0]].town)}</b></div><div class="ftc-s"><span>${G[o[0]]}</span><i>–</i><span>${G[o[1]]}</span>${f.pk?`<small>${f.pk[o[0]]}–${f.pk[o[1]]} pens</small>`:''}</div><div class="ftc-t">${logo(T[o[1]],64)}<b>${esc(T[o[1]].town)}</b></div></div>
    <div class="ftc-res">${res}</div>
    <div class="ftc-goals"><ul>${col(o[0])}</ul><ul class="r">${col(o[1])}</ul></div>
    ${pp?`<div class="ftc-potm"><span class="ftc-face">${portraitSVG(pp,54)}</span><div><span class="eyebrow">Player of the match</span><b>${esc(pname(pp))}</b><small>${esc(Sx(pp.sid).town)} · rating ${fmt1(potm.rt)}${potm.g?` · ${potm.g} G`:''}${potm.a?` · ${potm.a} A`:''}${potm.sv?` · ${potm.sv} saves`:''}</small></div></div>`:''}
    <small class="ftc-hint">Tap to view the pitch</small></div>`; }

/* penalty shootout tracker on the broadcast: five spots per team (more in sudden death), filled as each kick goes in or not */
function soBoard(){ const L=App.live; if(!L) return; const st=$('#lv-stage'); if(!st) return; const V=L.view; const K=V.soK||[[],[]]; const f=App.C.fixtures[L.fid]; const T=[Sx(f.h),Sx(f.a)];
  const n=Math.max(5,K[0].length,K[1].length); const next=K[0].length<=K[1].length?0:1;
  const row=i=>`<div class="sob-row ${next===i?'next':''}"><span class="sob-team">${logo(T[i],22)}<b>${esc(boardName(T[i]))}</b></span>${Array.from({length:n},(_,j)=>{ const r=K[i][j]; return `<i class="${r===true?'ok':r===false?'no':''}">${r===true?'✓':r===false?'✕':''}</i>`; }).join('')}<span class="sob-sc">${K[i].filter(Boolean).length}</span></div>`;
  let el=$('#so-board'); if(!el){ st.insertAdjacentHTML('beforeend','<div id="so-board" aria-live="polite"></div>'); el=$('#so-board'); }
  el.innerHTML=`<div class="sob-h">Penalty shootout</div>${row(0)}${row(1)}`; }
