/* ===================== v8 FEATURES: signature celebrations, The Courier & TouchlineTV, Senior Night,
   player comparison finder, clearer crests ===================== */

/* ---------- small helpers ---------- */
function teamBadge(s,size=26){ if(!s) return ''; return `<span class="tbadge" style="--c1:${s.c1};--c2:${s.c2};--sz:${size+8}px" title="${esc(s.name||s.town||'')}">${logo(s,size)}</span>`; }

function stageFake(W,H,scale){ const f=Object.create(Stage.prototype); Object.assign(f,{now:0,own:null,hands:false,ball:{x:999,y:0,z:0},spdMul:1,ts:1,placed:false,depthK:0.3,proj:()=>[W/2,H*0.88,H*scale]}); return f; }
function kitFor(p){ const sch=Sx(p.sid)||{c1:'#1d4ed8',c2:'#ffffff'}; const ks=kitsForSchools(sch,{c1:'#777777',c2:'#333333'}); return p.pos==='GK'?ks.gk[0]:ks.team[0]; }
function figOf(p){ return {x:0,y:0,look:lookOf(Px(p.id)||p),hgt:70,num:p.num,face:1,yaw:Math.PI/2-0.3,ph:0,spd:0,seed:1.3,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:p.pos==='GK',side:0}; }
function prepCanvas(cv){ const dpr=Math.min(2,window.devicePixelRatio||1); const W=cv.clientWidth||160, H=cv.clientHeight||180; cv.width=W*dpr; cv.height=H*dpr; const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return {g,W,H}; }
function spotlightBg(g,W,H,c){ g.clearRect(0,0,W,H); const gr=g.createRadialGradient(W/2,H*0.88,4,W/2,H*0.88,W*0.55); gr.addColorStop(0,c||'rgba(60,170,90,.5)'); gr.addColorStop(1,'rgba(60,170,90,0)'); g.fillStyle=gr; g.beginPath(); g.ellipse(W/2,H*0.88,W*0.5,H*0.1,0,0,7); g.fill(); }

/* ---------- signature celebrations ---------- */
/* a still of the celebration at its most recognisable moment */
const CEL_STILL={classic:500,airplane:400,kneeslide:600,flag:300,shush:400,backflip:520,salute:400,heart:600,robot:250,badge:400,auto:500};
function celebMini(cv,p,id){ const {g,W,H}=prepCanvas(cv); const F=stageFake(W,H,0.3); const fig=figOf(p); const kit=kitFor(p);
  fig.celeb=true; fig.celebType=id==='auto'?'classic':id; F.now=100000; fig.celebT=F.now-(CEL_STILL[id]||400); if(id==='airplane'){ fig.spd=4; fig.ph=0.6; } if(id==='backflip') fig.yaw=0.25;
  spotlightBg(g,W,H); F.drawFigure(g,fig,kit,false); }
/* the big looping preview: he runs in, then performs it */
function celebPreview(cv,p,id){ cv._cel=id; if(cv._run) return; cv._run=1; const {g,W,H}=prepCanvas(cv); const F=stageFake(W,H,0.3); const fig=figOf(p); const kit=kitFor(p); const t0=performance.now();
  const loop=ts=>{ if(!cv.isConnected){ return; } const id2=cv._cel==='auto'?(celebFor(App.C,Px(p.id)||p)||'classic'):cv._cel; const t=ts-t0; const cyc=t%4600; F.now=t; fig.look=lookOf(Px(p.id)||p);
    fig.celeb=true; fig.celebType=id2; if(cyc<900){ fig.spd=6.5; fig.ph=t/1000*11; fig.celebT=null; fig.yaw=lerp(0.2,0.9,cyc/900); } else { fig.spd=id2==='airplane'?4.5:0; if(id2==='airplane') fig.ph=t/1000*7; fig.celebT=t-(cyc-900); const tgt=id2==='backflip'?0.25:Math.PI/2-0.3; fig.yaw=lerp(0.9,tgt,smooth((cyc-900)/350)); } spotlightBg(g,W,H,'rgba(255,211,107,.35)'); F.drawFigure(g,fig,kit,false); requestAnimationFrame(loop); };
  requestAnimationFrame(loop); }
function celebTab(p,ed){ const C=App.C; const chosen=p.cel||'auto'; const live=celebFor(C,p); const def=CELEB_BY[live];
  const tile=(c)=>{ const pr=celebProgress(C,p,c); const on=chosen===c.id; return `<button class="cel-tile ${pr.have?'':'locked'} ${on?'on':''}" data-a="celPick" data-id="${p.id}" data-cel="${c.id}" aria-pressed="${on}" aria-label="${esc(c.n)}${pr.have?'':' (locked: '+esc(c.how)+')'}">
      <canvas class="cel-mini" data-celmini="${c.id}" data-pid="${p.id}" aria-hidden="true"></canvas><b>${esc(c.n)}</b><span class="tiny">${esc(pr.have?c.d:c.how)}</span>
      ${pr.have?(on?'<span class="cel-tag">Equipped</span>':''):`<span class="cel-lock" aria-hidden="true">🔒</span><span class="cel-prog"><i style="width:${Math.round(pr.cur/pr.need*100)}%"></i></span><span class="tiny mono">${pr.cur}/${pr.need}</span>`}</button>`; };
  const un=celebUnlocked(C,p).length;
  return `<div class="cel-wrap"><div class="cel-stage card"><canvas class="cel-cv" data-celprev="${live}" data-pid="${p.id}" aria-label="Celebration preview"></canvas>
      <div class="cel-now"><span class="eyebrow">${chosen==='auto'?'Auto · picks from his unlocked moves':'Signature celebration'}</span><h3>${esc(def.n)}</h3><p class="small">${esc(def.d)}</p>
      <div class="small muted">${un} of ${CELEBS.length} unlocked. Unlock more by hitting career milestones, scoring in big games and wearing the armband.</div>
      ${ed?`<div class="row" style="margin-top:8px"><button class="btn sm ${chosen==='auto'?'pri':''}" data-a="celPick" data-id="${p.id}" data-cel="auto">Auto</button><span class="tiny muted">Click any unlocked celebration to equip it. Locked ones can be previewed.</span></div>`:'<div class="tiny muted" style="margin-top:8px">Only his own coach can choose his celebration.</div>'}</div></div>
    <div class="cel-grid">${CELEBS.map(tile).join('')}</div>
    <p class="tiny muted">Celebrations are purely cosmetic: they play in live broadcasts, goal replays and TouchlineTV, and never change a result.</p></div>`; }
A.celPick = el => { const C=App.C; const p=C.players[el.dataset.id]; const id=el.dataset.cel; const cv=document.querySelector('#modal-root canvas[data-celprev]');
  if(cv) cv._cel=id; if(!p) return;
  const ed=canEdit(p.sid);
  if(id==='auto'){ if(ed){ setCeleb(C,p.id,'auto'); queueSave(); keepScroll(renderModal); } return; }
  if(!celebHave(C,p,id)){ toast(`Preview: ${CELEB_BY[id].n}. Unlock it: ${CELEB_BY[id].how}.`); return; }
  if(ed&&setCeleb(C,p.id,id)){ queueSave(); Sound.unlock(); toast(`${pname(p)} will celebrate with ${CELEB_BY[id].n}.`); keepScroll(renderModal); } };
/* the canvases inside modals come alive after each render */
const _afterModal0=afterModal;
afterModal=function(root){ _afterModal0(root);
  root.querySelectorAll('canvas[data-celmini]').forEach(cv=>{ const p=Px(cv.dataset.pid); if(p) celebMini(cv,p,cv.dataset.celmini); });
  root.querySelectorAll('canvas[data-celprev]').forEach(cv=>{ const p=Px(cv.dataset.pid); if(p) celebPreview(cv,p,p.cel||'auto'); });
  root.querySelectorAll('canvas[data-tv]').forEach(cv=>tvStart(cv));
  root.querySelectorAll('[data-photo]').forEach(el=>photoFill(el)); };

/* ---------- press photos: a frame rendered by the broadcast engine itself, from the recorded goal ---------- */
const PHOTO={cache:{},q:[],busy:false};
function photoFill(el){ const k=el.dataset.photo; if(PHOTO.cache[k]){ el.style.backgroundImage=`url(${PHOTO.cache[k]})`; el.classList.add('ready'); return; } if(!PHOTO.q.some(j=>j.el===el)) PHOTO.q.push({el,k}); photoPump(); }
async function photoPump(){ if(PHOTO.busy) return; PHOTO.busy=true;
  while(PHOTO.q.length){ const job=PHOTO.q.shift(); if(PHOTO.cache[job.k]==null){ try{ PHOTO.cache[job.k]=await shootPhoto(job.k); }catch(e){ console.warn('photo',e); PHOTO.cache[job.k]=''; } }
    if(job.el.isConnected&&PHOTO.cache[job.k]){ job.el.style.backgroundImage=`url(${PHOTO.cache[job.k]})`; job.el.classList.add('ready'); } }
  PHOTO.busy=false; }
function shootPhoto(k){ return new Promise(res=>{ const [fid,gi]=k.split(':'); const C=App.C; const f=C.fixtures[fid]; const lg=C.logs[fid]; const e=lg&&lg.ev?lg.ev.filter(x=>x.t==='goal')[+gi]:null;
  if(!f||!lg||!e||!lg.lu){ res(''); return; }
  const box=document.createElement('div'); box.style.cssText='position:fixed;left:-3000px;top:0;width:640px;height:400px;pointer-events:none;visibility:hidden'; const cv=document.createElement('canvas'); box.appendChild(cv); document.body.appendChild(box);
  const st=new Stage(cv,{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:'broadcast',minimap:false,section:C.section,weather:weatherFor(f)}); st.rm=true;
  st.setSides(lg.lu.map(L=>({slots:L.slots,off:{}}))); lg.lu.forEach((L,j)=>{ const g=L.slots.find(s=>s.role==='GK'); if(g) st.setKeeper(j,g.pid); });
  const s=e.s, gx=s===0?105:0, dir=s===0?1:-1; const sc=st.pl(e.pid);
  for(const q of st.players.values()){ q.off=true; q.ov=null; q.x=52; q.y=-12; }
  const cx=clamp(gx-dir*11,10,95), cy=50; const place=(q,x,y,face)=>{ q.off=false; q.x=x; q.y=y; q.ov={x,y}; q.face=face; q.yaw=face>0?0.5:Math.PI-0.5; };
  if(sc){ place(sc,cx,cy,-dir); sc.celeb=true; sc.celebType=celebFor(C,Px(e.pid)); sc.celebT=-(CEL_STILL[sc.celebType]||400); sc.yaw=sc.celebType==='backflip'?0.25:Math.PI/2-0.25; if(sc.celebType==='kneeslide'){ sc.knelt=true; } }
  const mates=[...st.players.values()].filter(q=>q!==sc&&q.side===s&&!q.gk).slice(0,4); mates.forEach((q,i)=>{ place(q,cx+dir*(1.6+i*0.9)*(i%2?1:-1)*0.8+dir*1.5,cy-1.6-(i%2)*1.1,-dir); q.celeb=true; q.celebType='mob'; q.yaw=Math.PI/2+(i%2?0.4:-0.4); });
  const opp=[...st.players.values()].find(q=>q.side!==s&&!q.gk); if(opp){ place(opp,cx+dir*7,cy-5,dir); opp.sad=true; }
  st.ball={x:gx+dir*1.5,y:34,z:0,spin:1}; st.inNet={gx,dir}; st.poss=s; st.zoomTo(0.32); st.cam.w=st.cam.tw; st.cam.x=cx; st.focus={x:cx};
  const t0=performance.now(); const tick=()=>{ if(sc) sc.celebT=st.now-(CEL_STILL[sc.celebType]||400); st.hype=1; if(performance.now()-t0<170) return requestAnimationFrame(tick);
    let url=''; try{ url=cv.toDataURL('image/jpeg',0.84); }catch(err){} st.destroy(); box.remove(); res(url); };
  requestAnimationFrame(tick); }); }

/* ---------- The Courier: a front page written from the week's real results ---------- */
const GOAL_VERB={solo:'danced past two defenders and finished',long:'let fly from distance and found the corner',header:'rose highest to head home',fk:'curled a free kick over the wall',pen:'converted from the penalty spot',cross:'met a cross and finished',corner:'bundled home from a corner',tapin:'tapped in from close range',break:'raced clear and finished the breakaway',open:'slotted home'};
function issueLabel(is){ if(!is) return ''; if(is.comp==='reg') return `Week ${is.rd+1}`; if(is.comp==='pre') return `Preseason Cup, Round ${is.rd+1}`;
  if(is.comp==='sec') return ['Sectional Quarterfinals','Sectional Semifinals','Sectional Final'][is.rd]||'Sectionals'; if(is.comp==='rgn') return 'Regional Final'; return ['State Quarterfinals','State Semifinals','State Final'][is.rd]||'State Tournament'; }
function recordThrough(C,sid,f){ const t={w:0,d:0,l:0}; for(const x of Object.values(C.fixtures)){ if(x.yr!==f.yr||x.lvl!=='V'||x.comp!=='reg'||x.st!=='d'||x.rd>f.rd||(x.h!==sid&&x.a!==sid)) continue; if(x.w===sid) t.w++; else if(x.w) t.l++; else t.d++; } return `${t.w}-${t.d}-${t.l}`; }
function hpick(list,key){ return list[hashStr(String(key))%list.length]; }
function leadFixture(C,is){ const fx=is.fx.map(id=>C.fixtures[id]).filter(Boolean); const mine=fx.find(f=>f.h===C.userSid||f.a===C.userSid); if(mine) return mine; return fx.sort((a,b)=>(b.hg+b.ag)-(a.hg+a.ag)||(a.id<b.id?-1:1))[0]; }
function storyOf(C,f){ const lg=C.logs[f.id]||{ev:[],box:[[],[]]}; const goals=(lg.ev||[]).filter(e=>e.t==='goal');
  const us=(f.h===C.userSid||f.a===C.userSid)?C.userSid:(f.w||f.h); const them=us===f.h?f.a:f.h; const uI=us===f.h?0:1; const ug=uI===0?f.hg:f.ag, tg=uI===0?f.ag:f.hg;
  const U=Sx(us), T=Sx(them); const UP=U.town.toUpperCase(), TP=T.town.toUpperCase(); const key=f.id;
  const byP={}; goals.forEach(e=>byP[e.pid]=(byP[e.pid]||0)+1); const star=Object.entries(byP).sort((a,b)=>b[1]-a[1])[0]; const sp=star?Px(star[0]):null; const SN=sp?sp.ln.toUpperCase():'';
  const last=goals[goals.length-1]; const usGoals=goals.filter(e=>e.s===uI);
  let head;
  if(f.pk){ head=`${Sx(f.w).town.toUpperCase()} SURVIVE SHOOTOUT DRAMA`; }
  else if(ug>tg){ const d=ug-tg; if(star&&star[1]>=3&&sp.sid===us) head=`${SN} HAT TRICK SINKS ${TP}`; else if(d>=3) head=hpick([`${UP} ROUT ${TP} ${ug}-${tg}`,`${UP} RUN RIOT AGAINST ${TP}`],key); else if(d===1&&last&&last.m>=78&&last.s===uI) head=`${Px(last.pid).ln.toUpperCase()} STRIKES LATE AS ${UP} EDGE ${TP}`; else if(star&&sp.sid===us&&star[1]>=2) head=`${SN} DOUBLE POWERS ${UP} PAST ${TP}`; else head=hpick([`${UP} GET PAST ${TP}`,`${UP} TOP ${TP} ${ug}-${tg}`],key); }
  else if(ug===tg) head= ug===0? `${UP} AND ${TP} PLAY OUT SCORELESS DRAW` : `${UP}, ${TP} SHARE THE SPOILS IN ${ug}-${tg} DRAW`;
  else head=hpick([`${TP} HAND ${UP} ${tg}-${ug} DEFEAT`,`${UP} FALL TO ${TP}`],key);
  const kicker= isHeated(f)?'Rivalry Night' : (isSeniorNight(C,f)?'Senior Night':'') || (f.comp==='reg'?'Section '+C.section+' Varsity':issueLabel({comp:f.comp,rd:f.rd}));
  const scorers=[0,1].map(i=>{ const L=goals.filter(e=>e.s===i); const m={}; L.forEach(e=>{ (m[e.pid]=m[e.pid]||[]).push(e.m+"'"); }); return Object.entries(m).map(([pid,ms])=>`${pname(Px(pid))} ${ms.join(', ')}`).join('; '); });
  const gkRow=(lg.box[uI]||[]).find(r=>r.role==='GK'); const deck=`${U.town} ${ug}, ${T.town} ${tg}${f.pk?` (${uI===0?f.pk[0]:f.pk[1]}-${uI===0?f.pk[1]:f.pk[0]} on penalties)`:''}. ${scorers[uI]?`Goals: ${scorers[uI]}.`:''}${gkRow&&gkRow.sv?` ${pname(Px(gkRow.pid))} made ${gkRow.sv} save${gkRow.sv===1?'':'s'}.`:''}`;
  const w=weatherFor(f); const when=w.night?'night':'afternoon'; const ven=f.ven?` at ${f.ven}`:'';
  const verb= ug>tg? (ug-tg>=3?'cruised past':ug-tg===1?'edged':'beat') : ug===tg?'drew with':'fell to';
  const rec= f.comp==='reg'? `, ${ug>tg?'improving':'moving'} to ${recordThrough(C,us,f)} in league play` : '';
  const paras=[`${U.town.toUpperCase()} — ${U.town} ${verb} ${T.town} ${ug}-${tg}${ven} on a ${WX[w.k].n.toLowerCase()}, ${w.t}-degree ${when}${rec}.`];
  if(goals.length){ const sc=[0,0]; const lines=goals.map(e=>{ const before=[...sc]; sc[e.s]++; const me=sc[e.s], th=sc[1-e.s]; const team=e.s===uI?U.town:T.town;
      const ctx= me===1&&th===0?'open the scoring' : me===th?'level it at '+me+'-'+th : me===th+1&&before[e.s]===before[1-e.s]?`put ${team} in front`: me<th?'pull one back':`make it ${me}-${th}`;
      const a=e.ast?Px(e.ast):null; let v=GOAL_VERB[e.ty]||'scored'; if(e.ty==='cross'&&a) v=`met ${pname(a)}'s cross`; v=v188GoalVerb(e,a)||v;
      return `${pname(Px(e.pid))} ${v} in the ${ordinal(e.m)} minute to ${ctx}${a&&e.ty!=='cross'?`, set up by ${pname(a)}`:''}.`; });
    paras.push(lines.join(' ')); }
  else paras.push(`Neither side could find a way through. ${gkRow&&gkRow.sv?`${pname(Px(gkRow.pid))} was equal to everything that came his way.`:'Chances were few and far between.'}`);
  if(lg.st&&lg.st[0]){ const P=lg.st.map(x=>x.pos||0); const tot=(P[0]+P[1])||1; const pu=Math.round(P[uI]/tot*100); const shu=lg.st[uI].sh, sht=lg.st[1-uI].sh;
    paras.push(`${U.town} had ${pu}% of the ball and ${shu>sht?`outshot ${T.town} ${shu}-${sht}`:shu===sht?`matched ${T.town} with ${shu} shots`:`were outshot ${sht}-${shu}`}${lg.st[uI].sot?`, putting ${lg.st[uI].sot} on target`:''}.`); }
  const co=C.coaches[U.coachId]; const coach=co?co.name:'the head coach';
  const Q= ug>tg? ['We talked all week about starting fast, and the guys did it.','That is a team win. Everybody who stepped on the field contributed.','I loved our response every time they pushed.','We will enjoy it tonight and get back to work Monday.'] : ug===tg? ['A point is a point. We wanted more, but there is plenty to build on.','Credit to them. We will take the positives and move on.','We had our moments. The finishing will come.'] : ['That one stings. We will learn from it.','We did not do enough with the ball tonight, and that is on me.','Give them credit. Our response is what matters now.'];
  paras.push(`“${hpick(Q,key+'q')}” said coach ${coach}.`);
  const sg=goals.filter(e=>e.s===uI); const photo= sg.length? `${f.id}:${goals.indexOf(sg[sg.length-1])}` : goals.length? `${f.id}:${goals.length-1}` : null;
  const ph=photo?goals[+photo.split(':')[1]]:null; const caption= ph? `${pname(Px(ph.pid))} celebrates his ${ordinal(ph.m)}-minute goal${ph.s===uI?'':` for ${T.town}`}.` : '';
  return {head,kicker,deck,paras,photo,caption,us,them}; }
function courierFront(C,is,ix,issues){ needLogs(is.yr); const U=Sx(C.userSid); const f=leadFixture(C,is); if(!f) return '<div class="empty">No games in this edition.</div>';
  const S=storyOf(C,f); const fx=is.fx.map(id=>C.fixtures[id]).filter(Boolean).sort((a,b)=>(isUser(b.h)||isUser(b.a))-(isUser(a.h)||isUser(a.a))||((b.hg+b.ag)-(a.hg+a.ag)));
  const others=fx.filter(x=>x!==f).slice(0,3).map(x=>{ const s2=storyOf(C,x); return `<article class="np-brief"><h4>${esc(s2.head)}</h4><p>${esc(s2.deck)}</p></article>`; }).join('');
  const pow=playerOfWeek(C,is); const powP=pow?Px(pow.pid):null; const powF=pow?C.fixtures[pow.fid]:null;
  const latest=ix===issues.length-1; const table=is.comp==='reg'&&latest? standings(C,'V',is.yr).slice(0,6) : null;
  const boot=leaders(C,'g',is.yr,'V',3);
  const notes=C.news.filter(n=>n.fid&&is.fx.includes(n.fid)&&n.type!=='result').slice(0,5);
  const plays=topPlays(C,is,1);
  return `<div class="np" role="article" aria-label="The ${esc(U.town)} Courier, ${esc(issueLabel(is))}">
    <header class="np-mast"><div class="np-ear">Vol. ${C.seasonNo} · No. ${ix+1}</div><h1>The ${esc(U.town)} Courier</h1><div class="np-ear r">${esc(U.mascot)} Country<br>Fifty cents</div></header>
    <div class="np-date"><span>${is.yr} season · ${esc(issueLabel(is))}</span><span>Section ${C.section} soccer coverage</span><span>${esc(C.stateName||'')}</span></div>
    <div class="np-body"><section class="np-lead">
      <div class="np-kicker">${esc(S.kicker)}</div><h2 class="np-head">${esc(S.head)}</h2><p class="np-deck">${esc(S.deck)}</p>
      ${S.photo?`<figure class="np-photo"><div class="np-img" data-photo="${S.photo}" role="img" aria-label="${esc(S.caption)}"></div><figcaption>${esc(S.caption)} <span class="muted">Courier photo</span></figcaption></figure>`:''}
      <div class="np-cols">${S.paras.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-a="openFixture" data-id="${f.id}">Full match report</button>${plays.length?`<button class="btn sm pri" data-a="setParam" data-k="nv" data-v="tv">▶ This week's Top 5 on TouchlineTV</button>`:''}</div></section>
    <aside class="np-side">
      <div class="np-box"><h5>Scoreboard</h5>${fx.map(x=>`<button class="np-score ${isUser(x.h)||isUser(x.a)?'u':''}" data-a="openFixture" data-id="${x.id}"><span>${teamBadge(Sx(x.h),16)}${esc(Sx(x.h).town)}</span><b>${x.hg}</b><span>${teamBadge(Sx(x.a),16)}${esc(Sx(x.a).town)}</span><b>${x.ag}</b>${x.pk?`<small>pens ${x.pk[0]}-${x.pk[1]}</small>`:''}</button>`).join('')}</div>
      ${powP?`<div class="np-box np-pow"><h5>Player of the week</h5><div class="row"><span class="np-face">${portraitSVG(powP,64)}</span><div><b>${pLink(powP.id)}</b><div class="small">${esc(Sx(powP.sid).town)} · ${powP.pos}</div><div class="small">${pow.g?`${pow.g} goal${pow.g>1?'s':''}, `:''}${pow.a?`${pow.a} assist${pow.a>1?'s':''}, `:''}${pow.sv?`${pow.sv} saves, `:''}rating ${fmt1(pow.rt)}</div>${powF?`<div class="tiny muted">${esc(Sx(powF.h).town)} ${powF.hg}-${powF.ag} ${esc(Sx(powF.a).town)}</div>`:''}</div></div></div>`:''}
      ${table?`<div class="np-box"><h5>Standings</h5><table class="np-tab">${table.map((r,i)=>`<tr class="${isUser(r.sid)?'u':''}"><td>${i+1}</td><td>${teamBadge(Sx(r.sid),14)} ${esc(Sx(r.sid).town)}</td><td class="n">${r.w}-${r.d}-${r.l}</td><td class="n"><b>${r.pts}</b></td></tr>`).join('')}</table></div>`:''}
      ${boot.length?`<div class="np-box"><h5>Golden Boot race</h5>${boot.map((r,i)=>`<div class="np-li"><span>${i+1}. ${pLink(r.p.id)} <span class="muted">${esc(Sx(r.p.sid).town)}</span></span><b>${r.v}</b></div>`).join('')}</div>`:''}
      ${notes.length?`<div class="np-box"><h5>Notebook</h5>${notes.map(n=>`<p class="np-note">${esc(n.text)}</p>`).join('')}</div>`:''}
    </aside></div>
    ${others?`<div class="np-briefs"><h5>Around the section</h5><div class="np-bgrid">${others}</div></div>`:''}</div>`; }

/* ---------- TouchlineTV: top 5 plays of the week, replayed on the broadcast stage ---------- */
function tvView(C,is,ix){ needLogs(is.yr); const T=topPlays(C,is,5); if(!T.length) return '<div class="empty card">No recorded goals this week, so the highlight show is off the air.</div>';
  const rows=[...T].reverse(); // countdown: #5 first
  return `<div class="tv"><div class="tv-head"><span class="tv-logo">Touchline<b>TV</b></span><div class="grow"><h2>Top ${T.length} plays · ${esc(issueLabel(is))}</h2><div class="small muted">Ranked by difficulty, timing and what was at stake. Every clip is the recorded build-up of a real goal.</div></div><button class="btn pri" data-a="tvOpen" data-ix="${ix}" data-k="all">▶ Play the countdown</button></div>
    <div class="tv-list">${rows.map((t,j)=>{ const rank=T.length-j; const f=C.fixtures[t.fid]; const p=Px(t.pid); const s=Sx(t.s===0?f.h:f.a);
      return `<article class="tv-card ${rank===1?'tv-top':''}" style="--c1:${s.c1};--c2:${s.c2}"><button class="tv-thumb" data-a="tvOpen" data-ix="${ix}" data-k="${T.indexOf(t)}" aria-label="Watch play number ${rank}"><span class="tv-img" data-photo="${t.fid}:${t.i}"></span><span class="tv-rank">${rank}</span><span class="tv-play">▶</span></button>
        <div class="tv-info"><div class="row">${teamBadge(s,18)}<b>${pLink(t.pid)}</b></div><div class="small">${esc(v188GoalName(t)||t.ty)} · ${t.m}'${t.ast?` · assist ${esc(pname(Px(t.ast)))}`:''}</div><div class="tiny muted">${esc(Sx(f.h).town)} ${f.hg}-${f.ag} ${esc(Sx(f.a).town)} · ${esc(fixtureLabel(f))}</div></div></article>`; }).join('')}</div></div>`; }
A.tvOpen = el => { const C=App.C; const is=courierIssues(C)[+el.dataset.ix]; if(!is) return; const T=topPlays(C,is,5); App.modal={type:'tv',ix:+el.dataset.ix,plays:T,all:el.dataset.k==='all',start:el.dataset.k==='all'?T.length-1:+el.dataset.k}; renderModal(); };
MODALS.tv = m => { const C=App.C; const T=m.plays||[];
  return modalShell(`<h2><span class="tv-logo sm">Touchline<b>TV</b></span></h2>`, `<div class="tv-screen"><canvas data-tv="1" aria-label="Highlight replay"></canvas><div class="tv-bug"><i></i>REPLAY</div><div class="tv-lower" id="tv-lower"></div></div>
    <div class="tv-queue">${[...T].map((t,i)=>({t,i})).reverse().map(({t,i})=>`<button class="tv-q" data-a="tvJump" data-k="${i}" id="tvq-${i}"><b>#${i+1}</b> ${esc(pname(Px(t.pid)))} <span class="muted">${t.m}'</span></button>`).join('')}</div>`,
    `<button class="btn" data-a="closeModal">Close</button>`,'wide'); };
A.tvJump = el => { const cv=document.querySelector('#modal-root canvas[data-tv]'); if(!cv||!cv._tv) return; cv._tv.jump(+el.dataset.k); };
function tvStart(cv){ if(cv._tv) return; const m=App.modal; if(!m||m.type!=='tv') return; const C=App.C; const T=m.plays||[]; let cur=m.start, gen=0;
  const st=new Stage(cv,{h:Sx(C.userSid),a:Sx(C.userSid),id:'tv'},{mode:'broadcast',minimap:false,section:C.section,sfx:true,onCaption:()=>{}}); st.restartAfterGoal=async()=>{};
  const lower=()=>{ const el=$('#tv-lower'); const t=T[cur]; if(!el||!t) return; const f=C.fixtures[t.fid]; const s=Sx(t.s===0?f.h:f.a);
    el.innerHTML=`<div class="tvl" style="--c1:${s.c1};--c2:${s.c2}"><span class="tvl-rank">#${cur+1}</span>${teamBadge(s,22)}<div><b>${esc(pname(Px(t.pid)))}</b><span>${esc(v188GoalName(t)||t.ty)} · ${t.m}' · ${esc(Sx(f.h).town)} ${f.hg}-${f.ag} ${esc(Sx(f.a).town)}</span></div></div>`;
    document.querySelectorAll('.tv-q').forEach(b=>b.classList.toggle('on',+b.id.slice(4)===cur)); };
  const play=async i=>{ const my=++gen; cur=i; const t=T[i]; if(!t) return; const f=C.fixtures[t.fid]; const lg=C.logs[t.fid]; const e=lg&&lg.ev?lg.ev.filter(x=>x.t==='goal')[t.i]:null; if(!e) return;
    st.cancel(); await new Promise(r=>setTimeout(r,30)); if(my!==gen||!cv.isConnected) return;
    st.h=Sx(f.h); st.a=Sx(f.a); st.T={h:st.h,a:st.a,id:f.id}; st.kits=kitsFor(f); st.crowd=st.genCrowd(); st.wx=weatherFor(f); st.wxp=null; st.skip=false;
    st.setSides(lg.lu.map(L=>({slots:L.slots,off:{}}))); lg.lu.forEach((L,j)=>{ const g=L.slots.find(s=>s.role==='GK'); if(g) st.setKeeper(j,g.pid); });
    st.clipStart(e); st.goalTs=0.95; lower();
    await st.goalSequence(e); if(my!==gen||!cv.isConnected) return; await st.wait(700);
    if(m.all&&i>0&&my===gen&&cv.isConnected) play(i-1); };
  cv._tv={jump:i=>{ m.all=false; play(i); }}; play(cur); }

/* ---------- the Newsroom: The Courier · TouchlineTV · Newswire ---------- */
const _news0=VIEWS.news;
VIEWS.news=()=>{ const C=App.C; const v=App.params.nv||'courier'; const head=tabs('nv',[['courier','The Courier'],['tv','TouchlineTV'],['wire','Newswire']],v);
  if(v==='wire') return head+_news0();
  const issues=courierIssues(C); if(!issues.length) return head+`<div class="empty card">The first edition of The ${esc(Sx(C.userSid).town)} Courier goes to print after your first game day. TouchlineTV's top plays follow the same week.</div>`;
  const ix=App.params.ix!=null&&App.params.ix!==''? clamp(+App.params.ix,0,issues.length-1) : issues.length-1; const is=issues[ix];
  const nav=`<div class="np-nav"><button class="btn sm ghost" data-a="setParam" data-k="ix" data-v="${Math.max(0,ix-1)}" ${ix===0?'disabled':''} aria-label="Previous edition">← Previous</button><select data-c="param" data-k="ix" aria-label="Edition">${opts(issues.map((x,i)=>[i,`No. ${i+1} · ${issueLabel(x)}`]),ix)}</select><button class="btn sm ghost" data-a="setParam" data-k="ix" data-v="${Math.min(issues.length-1,ix+1)}" ${ix===issues.length-1?'disabled':''} aria-label="Next edition">Next →</button><span class="grow"></span><span class="tiny muted">${ix===issues.length-1?'Latest edition':'Back issue'}</span></div>`;
  return head+nav+(v==='tv'? tvView(C,is,ix) : courierFront(C,is,ix,issues)); };
const _render0=render;
render=function(){ _render0(); if(App.C) document.querySelectorAll('#app [data-photo]').forEach(el=>photoFill(el)); };

/* ---------- Senior Night: the pregame ceremony before the last regular-season home game ---------- */
function wantSeniorNight(f){ const C=App.C; return (C.settings.senior||'on')!=='off' && isSeniorNight(C,f) && seniorsOf(C).length>0; }
function seniorChip(f){ return isSeniorNight(App.C,f)? `<span class="chip sn-chip" title="Your seniors are honored before kickoff">🌹 Senior Night</span>` : ''; }
function familySVG(c){ // two parents with a bouquet, in silhouette
  return `<svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true"><g fill="rgba(0,0,0,.72)"><circle cx="30" cy="20" r="9"/><path d="M16 88 L18 46 Q20 32 30 31 Q40 32 42 46 L44 88Z"/><circle cx="88" cy="18" r="9.5"/><path d="M72 88 L75 44 Q78 30 88 29 Q99 30 101 44 L104 88Z"/></g>
    <g><path d="M48 58 L58 40 L66 58Z" fill="#2e7d32"/><circle cx="52" cy="40" r="5" fill="${c}"/><circle cx="60" cy="36" r="5.5" fill="#ff4d6d"/><circle cx="66" cy="42" r="5" fill="#fff3c4"/><circle cx="57" cy="45" r="4.5" fill="#ff8fab"/><path d="M50 56 L66 56 L60 64 L56 64Z" fill="#f4f4f4"/></g></svg>`; }
function framedJersey(p,s){ return `<div class="sn-frame"><div class="sn-mat">${shirtSVG(s.c1,s.c2,String(p.num),118)}<span class="sn-jn">${esc(p.ln.toUpperCase())}</span></div><small>${esc(s.town)} Varsity</small></div>`; }
function liveSeniorNight(done){
  const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const el=$('#lv-intro'); const me=Sx(C.userSid); const rec=seniorNightRecord(C,f); queueSave();
  const list=rec.list.map(x=>({x,p:Px(x.pid)})).filter(o=>o.p); if(!el||!list.length){ done(); return; }
  el.insertAdjacentHTML('beforeend',`<div class="snight" data-a="snNext" style="--c1:${me.c1};--c2:${me.c2}"><div class="sn-bg"></div><i class="sn-spot s1"></i><i class="sn-spot s2"></i><i class="sn-spot s3"></i>
    <div class="sn-top"><div class="eyebrow">${esc(me.town)} ${esc(me.mascot)} · ${esc(fixtureLabel(f))}</div><h2>Senior Night</h2><div class="sn-class">Honoring the Class of ${f.yr}</div></div>
    <div class="sn-stage" id="sn-stage"></div>
    <div class="sn-strip">${list.map(({p},i)=>`<span class="sn-dot" id="snd${i}">${portraitSVG(p,40)}</span>`).join('')}</div>
    <div class="sn-ctl"><small id="sn-n"></small><button class="btn sm ghost" data-a="snSkip">Skip ceremony</button></div></div>`);
  let i=-1, fired=false; const card=({x,p})=>{ const v=x.all; const gk=p.pos==='GK'; const vs=x.v.gp?` · ${x.v.gp} for the Varsity`:'';
      const chips=gk? [['Games',v.gp],['Clean sheets',v.cs],['Saves',v.sv||0],['Years in the program',x.seasons]] : [['Games',v.gp],['Goals',v.g],['Assists',v.a],['Years in the program',x.seasons]];
      return `<div class="sn-card"><div class="sn-left">${framedJersey(p,me)}</div><div class="sn-mid"><span class="sn-face">${portraitSVG(p,120)}</span><h3><i>#${p.num}</i> ${esc(pname(p))}</h3><div class="sn-pos">${posTag(p.pos)} <span>In the program since ${x.since}${vs}</span></div>
        <div class="sn-stats">${chips.map(([l,n])=>`<span><b>${n}</b>${l}</span>`).join('')}</div>${x.honors||x.awards?`<div class="small sn-hon">${x.honors?`${x.honors} team honor${x.honors>1?'s':''}`:''}${x.honors&&x.awards?' · ':''}${x.awards?`${x.awards} individual award${x.awards>1?'s':''}`:''}</div>`:''}</div>
        <div class="sn-right">${familySVG(me.c1)}<small>Escorted by family</small></div></div>`; };
  const step=()=>{ if(fired||App.live!==L) return; i++; if(i<list.length){ const st=$('#sn-stage'); if(st) st.innerHTML=card(list[i]); document.querySelectorAll('.sn-dot').forEach((d,j)=>{ d.classList.toggle('on',j===i); d.classList.toggle('done',j<i); });
      const n=$('#sn-n'); if(n) n.textContent=`${i+1} of ${list.length} seniors`; Sound.goal(); clearTimeout(L.snT); L.snT=setTimeout(step, reducedMotion()?1400:3000); }
    else { const st=$('#sn-stage'); if(st) st.innerHTML=`<div class="sn-thanks"><h3>Thank you, seniors</h3><p>${list.length} player${list.length>1?'s':''}, ${list.reduce((a,o)=>a+o.x.seasons,0)} seasons in ${esc(me.town)} colors between them. One last home game.</p></div>`; clearTimeout(L.snT); L.snT=setTimeout(go,1800); } };
  const go=()=>{ if(fired) return; fired=true; clearTimeout(L.snT); const node=el.querySelector('.snight'); node?.classList.add('out'); setTimeout(()=>node&&node.remove(),420); done(); };
  L.introGo=go; L.snNext=step; L.snT=setTimeout(step,700); }
A.snNext = ()=>{ const L=App.live; if(L&&L.snNext){ clearTimeout(L.snT); L.snNext(); } };
A.snSkip = ()=>{ const L=App.live; if(L&&L.introGo) L.introGo(); };

/* Hall of Fame: the Senior Night archive */
const _hof0=VIEWS.hof;
VIEWS.hof=()=>{ const C=App.C; const S=Object.values(C.seniorNights||{}).filter(r=>r.list&&r.list.length).sort((a,b)=>b.yr-a.yr); const base=_hof0();
  if(!S.length) return base;
  return base+`<div class="card"><h3>Senior Nights</h3><p class="small muted" style="margin-top:0">Every class honored before its last home game.</p><div class="sn-arch">${S.map(r=>{ const f=C.fixtures[r.fid]; return `<div class="sn-yr"><div class="row"><b class="mono">${r.yr}</b><span class="grow small">${f&&f.st==='d'?`${esc(Sx(f.h).town)} ${f.hg}-${f.ag} ${esc(Sx(f.a).town)}`:'Still to come'}</span>${r.res?`<span class="pill ${r.res==='win'?'good':''}">${r.res==='win'?'Won':r.res==='draw'?'Drew':'Lost'}</span>`:''}</div><div class="sn-names">${r.list.map(x=>`<span>${pLink(x.pid,`#${x.num} ${x.name}`)}</span>`).join('')}</div></div>`; }).join('')}</div></div>`; };

/* ---------- Compare players: search, filter by team, sort, and full player cards ---------- */
function cmpPool(){ const C=App.C; if(App._cmpPool&&App._cmpPool.k===C.year+':'+Object.keys(C.players).length+':'+Object.keys(C.alumni).length) return App._cmpPool.L;
  const L=[]; for(const p of Object.values(C.players)){ if(!C.league.includes(p.sid)) continue; const t=careerTotals(p,'V'); L.push({id:p.id,n:pname(p),ln:p.ln,sid:p.sid,pos:p.pos,lv:p.lvl,o:R(ovr(p)),g:t.g,a:t.a,gp:t.gp}); }
  for(const p of Object.values(C.alumni)){ if(!C.league.includes(p.sid)) continue; const t=careerTotals(p,'V'); L.push({id:p.id,n:`${p.fn} ${p.ln}`,ln:p.ln,sid:p.sid,pos:p.pos,lv:'ALUM',yr:p.gradYr,o:R(p.ovr),g:t.g,a:t.a,gp:t.gp}); }
  App._cmpPool={k:C.year+':'+Object.keys(C.players).length+':'+Object.keys(C.alumni).length,L}; return L; }
function cmpFiltered(side){ const P=App.params; const q=(P['q'+side]||'').trim().toLowerCase(); const team=P['t'+side]||'all'; const lv=P['l'+side]||'V'; const sort=P['s'+side]||'team';
  let L=cmpPool().filter(x=>(team==='all'||x.sid===team)&&(lv==='all'||x.lv===lv)&&(!q||x.n.toLowerCase().includes(q)||String(Sx(x.sid).town).toLowerCase().includes(q)));
  const town=x=>Sx(x.sid).town; const by={team:(a,b)=>town(a).localeCompare(town(b))||a.ln.localeCompare(b.ln),name:(a,b)=>a.ln.localeCompare(b.ln)||a.n.localeCompare(b.n),goals:(a,b)=>b.g-a.g||b.o-a.o,rating:(a,b)=>b.o-a.o||b.g-a.g,games:(a,b)=>b.gp-a.gp||b.o-a.o};
  return L.sort(by[sort]||by.team); }
function cmpList(side){ const L=cmpFiltered(side); const sel=App.params['p'+side]; const sort=App.params['s'+side]||'team'; let lastT=null; const out=[];
  for(const x of L.slice(0,80)){ const s=Sx(x.sid); if(sort==='team'&&x.sid!==lastT){ lastT=x.sid; out.push(`<div class="cmp-grp">${teamBadge(s,14)} ${esc(s.name)}</div>`); }
    out.push(`<button class="cmp-row ${sel===x.id?'on':''}" data-a="cmpSet" data-side="${side}" data-id="${x.id}">${sort==='team'?'':teamBadge(s,14)}<span class="grow trunc"><b>${esc(x.n)}</b> <span class="muted small">${x.pos} · ${x.lv==='ALUM'?'Class of '+x.yr:LVL_NAME[x.lv]}${sort!=='team'?' · '+esc(s.town):''}</span></span><span class="mono small">${sort==='goals'?x.g+' G':sort==='games'?x.gp+' GP':x.o}</span></button>`); }
  return out.join('')||'<div class="muted small" style="padding:10px">No players match.</div>'; }
function cmpCard(id){ const C=App.C; const p=Px(id); if(!p) return '<div class="cmp-empty">Search for a player below</div>'; if(!C.alumni[id]) return playerCard(p,{cls:'big'});
  const s=Sx(p.sid); const t=careerTotals(p,'V'); const o=R(p.ovr);
  return `<button class="pcard ${cardTier(o)} big alum" data-a="openPlayer" data-id="${p.id}" style="--c1:${s.c1};--c2:${s.c2}" aria-label="${esc(p.fn+' '+p.ln)}, ${p.pos}, final rating ${o}">
   <span class="pc-wm">${logo(s,80)}</span><span class="pc-face">${portraitSVG(p,104)}</span><span class="pc-top"><b class="pc-ovr">${o}</b><span class="pc-pos">${p.pos}</span></span><span class="pc-num">#${p.num}</span>
   <span class="pc-name"><small>${esc(p.fn)}</small>${esc(p.ln)}</span>
   <span class="pc-stats">${[['GP',t.gp],['G',t.g],['A',t.a],['SV',t.sv],['CS',t.cs],['AW',(p.awards||[]).length]].map(([l,v])=>`<span><b>${v}</b>${l}</span>`).join('')}</span>
   <span class="pc-foot">Class of ${p.gradYr} · Graduated</span></button>`; }
function cmpPicker(side){ const C=App.C; const P=App.params; const lv=P['l'+side]||'V';
  return `<div class="cmp-pick"><div class="cmp-tools"><input type="search" class="cmp-q" data-c="cmpQ" data-side="${side}" value="${esc(P['q'+side]||'')}" placeholder="Search players or towns…" aria-label="Search players for side ${side.toUpperCase()}">
    <select data-c="cmpF" data-k="t${side}" aria-label="Team">${opts([['all','All teams'],...C.league.map(id=>[id,Sx(id).name])],P['t'+side]||'all')}</select>
    <select data-c="cmpF" data-k="l${side}" aria-label="Level">${opts([['V','Varsity'],['JV','JV'],['MOD','Modified'],['ALUM','Graduates'],['all','Everyone']],lv)}</select>
    <select data-c="cmpF" data-k="s${side}" aria-label="Sort">${opts([['team','Sort: by team'],['name','Sort: name'],['rating','Sort: rating'],['goals','Sort: Varsity goals'],['games','Sort: Varsity games']],P['s'+side]||'team')}</select></div>
    <div class="cmp-res" id="cmp-res-${side}" role="listbox" aria-label="Players">${cmpList(side)}</div></div>`; }
function compareView(){ const C=App.C; const P=App.params; const pool=cmpPool(); if(!P.pa){ const u=pool.filter(x=>x.sid===C.userSid&&x.lv==='V').sort((a,b)=>b.o-a.o); if(u[0]) P.pa=u[0].id; } if(!P.pb){ const o=pool.filter(x=>x.sid!==C.userSid&&x.lv==='V').sort((a,b)=>b.o-a.o); if(o[0]) P.pb=o[0].id; }
  const a=Px(P.pa), b=Px(P.pb); const T=p=>p?careerTotals(p,'V'):null; const ta=T(a), tb=T(b);
  const yrs=p=>p?Object.keys(p.st).filter(y=>p.st[y].V).length:0; const rt=p=>p?(C.alumni[p.id]?R(p.ovr):R(ovr(p))):0;
  const rows=[['Overall',rt(a),rt(b)],['Varsity seasons',yrs(a),yrs(b)],['Games',ta&&ta.gp,tb&&tb.gp],['Goals',ta&&ta.g,tb&&tb.g],['Assists',ta&&ta.a,tb&&tb.a],['Goals + assists per game',ta&&ta.gp?+((ta.g+ta.a)/ta.gp).toFixed(2):0,tb&&tb.gp?+((tb.g+tb.a)/tb.gp).toFixed(2):0],['Saves',ta&&ta.sv,tb&&tb.sv],['Clean sheets',ta&&ta.cs,tb&&tb.cs],['Tackles',ta&&ta.tk,tb&&tb.tk],['Interceptions',ta&&ta.int,tb&&tb.int],['Awards',a?(a.awards||[]).length:0,b?(b.awards||[]).length:0],['Team honors',a?(a.honors||[]).length:0,b?(b.honors||[]).length:0]];
  const h2h=rows.map(([l,x,y])=>{ x=x||0; y=y||0; const m=Math.max(x,y)||1; return `<div class="h2h"><b class="mono ${x>y?'win':''}">${x}</b><div class="h2h-bar l"><i style="width:${x/m*100}%"></i></div><span>${l}</span><div class="h2h-bar r"><i style="width:${y/m*100}%"></i></div><b class="mono ${y>x?'win':''}">${y}</b></div>`; }).join('');
  return `<div class="cmp"><div class="cmp-side">${cmpCard(P.pa)}${a?`<div class="small muted cmp-sub">${teamBadge(Sx(a.sid),16)} ${esc(Sx(a.sid).name)}</div>`:''}</div>
     <div class="card cmp-h2h"><h3>Head to head</h3>${a&&b?h2h:'<div class="muted">Pick two players.</div>'}<p class="tiny muted">Varsity career totals, regular season plus postseason. Graduates show their final rating.</p></div>
     <div class="cmp-side">${cmpCard(P.pb)}${b?`<div class="small muted cmp-sub">${teamBadge(Sx(b.sid),16)} ${esc(Sx(b.sid).name)}</div>`:''}</div></div>
    <div class="grid g2 cmp-pickers"><div><h4 class="cmp-h">Player A</h4>${cmpPicker('a')}</div><div><h4 class="cmp-h">Player B</h4>${cmpPicker('b')}</div></div>`; }
A.cmpSet = el => { App.params['p'+el.dataset.side]=el.dataset.id; App.keepScroll=true; render(); };
CH.cmpF = el => { App.params[el.dataset.k]=el.value; const side=el.dataset.k.slice(1); const box=$('#cmp-res-'+side); if(box) box.innerHTML=cmpList(side); };
document.addEventListener('input', e=>{ const el=e.target.closest('[data-c="cmpQ"]'); if(!el) return; App.params['q'+el.dataset.side]=el.value; const box=$('#cmp-res-'+el.dataset.side); if(box) box.innerHTML=cmpList(el.dataset.side); });

/* ---------- main menu: continue hero, live scorebug, ticker, how-to-play and what's new ---------- */
function continueHero(metas){ if(!metas||!metas.length) return '';
  const m=[...metas].sort((a,b)=>(b.updated||0)-(a.updated||0))[0]; const ph=({preseason:'Preseason',regular:'League play',sectionals:'Sectionals',regional:'Regional',states:'State tourney',awards:'Awards',offseason:'Offseason'})[m.phase]||m.phase;
  return `<button class="cont-hero" data-a="openSlot" data-slot="${m.slot}" style="--c1:${m.c1};--c2:${m.c2}" aria-label="Continue ${esc(m.school)}">
    <span class="ch-glow" aria-hidden="true"></span><span class="ch-logo">${m.mk?mascotSVG(m.mk,m.c1,m.c2,86):''}</span>
    <span class="ch-txt"><span class="eyebrow">Pick up where you left off · Career ${m.slot}</span><b>${esc(m.school)}</b><span class="ch-sub">${esc(m.mascot||'')} · Season ${m.seasonNo} (${m.year}) · ${esc(ph)}${m.phase==='regular'&&m.md!=null?` · Matchday ${m.md+1}`:''} · Coach ${esc(m.coach)}</span></span>
    <span class="ch-cta"><span>Continue <i aria-hidden="true">▸</i></span><small>Press Enter</small></span></button>`; }
function startTicker(){ const items=['NEW · Signature celebrations: unlock the Knee Slide, the Backflip and more','NEW · The Courier prints a front page every week','NEW · TouchlineTV counts down the Top 5 plays','NEW · Senior Night honors your graduating class','NEW · A brand-new soundtrack and match sounds (press M to mute)','Develop Modified → JV → Varsity','Rivalry Night · Scouting Camp · Hall of Fame','Every result is simulated, every goal is replayable','Tip: press Space to pause a live match'];
  const one=items.map(t=>`<span>${esc(t)}</span><i>◆</i>`).join(''); return one+one; }
function menuBug(T,score){ const el=$('#start-bug'); if(!el) return; el.innerHTML=`<span class="sb-t" style="--c:${T.h.c1}">${mascotSVG(T.h.mk,T.h.c1,T.h.c2,22)}${esc(String(T.h.mascot||'').toUpperCase())}</span><b>${score[0]}<em>–</em>${score[1]}</b><span class="sb-t r" style="--c:${T.a.c1}">${esc(String(T.a.mascot||'').toUpperCase())}${mascotSVG(T.a.mk,T.a.c1,T.a.c2,22)}</span>`; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function menuCaption(t,k){ if(k!=='celeb'&&k!=='shot') return; const el=$('#start-bug'); if(!el) return; let c=el.querySelector('.sb-cap'); if(!c){ c=document.createElement('span'); c.className='sb-cap'; el.appendChild(c); } c.textContent=t; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); }
A.howTo = ()=>{ App.modal={type:'howTo'}; renderModal(); };
A.whatsNew = ()=>{ App.modal={type:'whatsNew'}; renderModal(); };
MODALS.howTo = ()=> modalShell('<h2>How to play</h2>', `<div class="howto">${[
  ['1','Build your program','You coach three squads: Modified (grades 7–8), JV and Varsity. Promote players when they are ready; Varsity results are what count for titles.'],
  ['2','Set the lineup','Pick a formation, starters, captains and a strategy in Squads & Lineups. The Coach\'s checklist in the Office flags anything missing.'],
  ['3','Matchday','Play Matchday opens the preview with odds and form. Watch the live broadcast (pause any time with Space), give a halftime talk, or simulate. The Matchday Center lets you watch or simulate every other game in the round too.'],
  ['4','Develop','Players grow through training plans, breakout seasons and traits you set in Edit. The Scouting Camp in the offseason brings in the next class.'],
  ['5','Road to State','Finish high in Section standings to seed well for Sectionals, then chase the Regional cup and the State crown.'],
  ['6','The stories','Read The Courier and TouchlineTV in the Newsroom, honor your seniors on Senior Night, unlock signature celebrations, and enshrine legends in the Hall of Fame.']].map(([n,t,d])=>`<div class="ht-step"><span class="ht-n">${n}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>
  <div class="howto-keys"><span><kbd>Space</kbd> Pause / resume a live match</span><span><kbd>Esc</kbd> Close a window</span><span><kbd>Enter</kbd> Continue your latest career from the menu</span></div>`, `<button class="btn pri" data-a="closeModal">Got it</button>`);
MODALS.whatsNew = ()=> modalShell('<h2>What\'s new in Touchline</h2>', `<div class="wn">${[
  ['🚲','The bicycle kick, reworked','Bicycle kicks are far more common: about one in four Varsity goals from a cross, more for technical players. The move itself is one fluid motion: a dip and arm swing before the jump, the lead leg swinging up, the kicking leg whipping over his head, the body rotating through the strike in a real arc, hands breaking the fall, then he sits up and rolls forward onto his feet.'],
  ['📰','Highlights say how it went in','Goals are now named for how they were scored. A bicycle kick is called a bicycle kick in TouchlineTV\'s Top 5, match reports, highlight cards and The Courier, and it makes the Newswire. Scissor kicks, volleys, chips, toe-pokes, outside-of-the-boot finishes and diving or glancing headers are named too.'],
  ['🏃','Players run like themselves','Fast players take longer, lower strides and pump their arms harder; centre-backs run more upright. Late in the game players tire: shorter strides, heavier arms, and at stoppages a tired player may bend over with his hands on his knees. A defender sold by a skill move keeps his planted foot on the turf, and the balancing arm on a kick bends at the elbow and swings forward and down instead of sticking straight out.'],
  ['🎯','Six ways to shoot, four ways to head','Shots are driven, side-footed, chipped, toe-poked, hit with the outside of the boot or volleyed first time, chosen by distance, the keeper\'s position and the shooter\'s finishing. Headers can be diving headers, glancing flick-ons, clearing headers with a snap of the neck or power headers, and taller players jump higher.'],
  ['🧤','Keepers do more','Kick saves, reflex saves, the one-on-one star spread, high claims and punches at corners, and after a catch the keeper throws or rolls it out to a free defender when one is open instead of always punting.'],
  ['👕','Sharper 3-D players','Hair with tufts, sideburns and long hair that moves; names on the backs of shirts, numbers on the shorts, sock tape, shin-guard bulges, the captain\'s armband and keeper gloves with cuffs; a tapered torso, shirts and shorts that move with the run; boots with studs, a coloured flash and a clean sole edge.'],
  ['📣','Skill moves you can see','Every stepover, sole roll, feint, chop, cut, drag-back and Cruyff turn is now called out on the broadcast with the player\'s name ("STEPOVER! TURNER"). Moves also happen at 4x speed now, a little more often, and the double stepover and sole roll show up more.'],
  ['🐢','Slower player development','Every player now improves at half the old pace: season-long development, breakout seasons, preseason minutes and scrimmage boosts are all halved, so building a star takes longer and ratings mean more.'],
  ['🩹','Two glitches fixed','No more small patch on the lower back of the 3-D players (the top of the shorts was poking through the shirt when they leaned into a run), and the keeper\'s knee no longer bends backwards when he punts.'],
  ['🚩','Fair offside calls','A flag now only goes up when the runner is really off: the pass waits until he is beyond the second-last defender and the ball, at every speed, and the freeze frame shows both lines, the defenders\' and his. Throw-ins go to the right team, close-range misses stay close, and the commentary matches what you saw.'],
  ['⭐','Ratings you can see','A 99-rated star now looks it: quicker off the mark, cleaner first touch, beating weaker defenders and finishing nearer the corners, while poor tacklers stand off and get caught flat-footed.'],
  ['🕺','Skill moves','Dribblers now use real moves when a defender closes in: stepovers, double stepovers, the body feint, chops and outside cuts, drag-backs, sole rolls and the Cruyff turn. Varsity stars know them all and do them crisply; Modified players know a few and do them slower. Beaten defenders get sold, frozen or turned.'],
  ['🚲','Bicycle kicks','Once in a while a skilled striker meets a cross with a bicycle kick or a scissor volley, from take-off to landing and getting back up.'],
  ['🧤','Keepers with real saves','Keepers now choose the save that fits the shot: standing catches, crouching scoops, low and full-stretch dives, diving catches, fingertip tips round the post or over the bar, parries and smothers at the feet. Good keepers set early and hold on; poor ones parry, fumble and get wrong-footed.'],
  ['🔁','Every goal from two angles','After a goal the replay now plays twice: first through the scorer\'s own eyes as he runs, touches and strikes, then from behind the goal with the net in front of you and the ball flying at the lens. Tap to skip, or "Next angle" to jump ahead. Settings > Goal replays: Off, One angle or Two angles.'],
  ['🏷️','Name plates','A broadcast tag now follows the player on the ball and the opponent closing him down: shirt number, name and team colours, sliding smoothly as play moves. Press N (or Settings) to turn them off.'],
  ['🎥','Sideline view and zoom','A new Sideline camera watches from the touchline at standing height, the way a coach or a substitute sees it: it walks the line with the play and turns to follow the ball. Pick Broadcast, Sideline or Tactical in the match bar (V cycles them), and zoom with − and +, the + and − keys or the mouse wheel: Wide, Normal, Close or Tight.'],
  ['👟','Closer touches, smoother players','Dribblers now touch the ball in step with their stride and run onto it, a pass is met by a reaching foot and cushioned, and every strike makes contact as the ball leaves the boot, with the standing foot planted beside it. Up close the players have rounded joints, seam-free outlines, softer faces and better boots.'],
  ['⚔️','Earn the ball','Defenders now have to win it: they run in and poke it away, muscle in shoulder to shoulder, or step into a passing lane. Sliding tackles are rarer and more dramatic, and nobody jumps to the ball any more. Keepers\' punts drive the laces through the ball and finish toe-up toward the far goal.'],
  ['🧤','Keepers punt it long','After a catch the goalkeeper often takes two quick steps, drops the ball onto his laces and volleys it high into midfield, in both the 2D and 3D broadcasts. Try it in the animation lab too.'],
  ['🎞️','Cleaner animation','Celebration close-ups keep the scorer in shot, the walkout camera lands before kick-off, 3D players\' arms hang naturally at their sides, and penalty takers reach the ball before they strike.'],
  ['🪞','See your players in 3D','The appearance editor, the celebrations tab and the Kit Lab now show each player as the same 3D model used in matches, running, striking, turning and celebrating in your kits.'],
  ['🚶','Walkouts on camera','In 3D, the lineup announcements happen on the pitch: the camera walks along the line and stops on each player as the PA calls their name, then a crane shot sweeps up over the ground for the kick-off. Courier photos are shot in 3D too.'],
  ['🎬','Matches in 3D','Live matches are now broadcast in full 3D on computers and phones that can handle it: a floodlit high-school ground with a main stand, press box, video scoreboard, bleachers behind the goals and a crowd in your colors that erupts when you score. Settings > Match graphics switches between Auto, 3D broadcast and Classic 2D.'],
  ['🧍','Players with faces','Every player is a detailed 3D model built from their look: face, hair style, skin tone and build, your kit with its pattern, numbers front and back, collar and cuffs, socks, boots and keeper gloves. The referee and linesmen run the line with their flags and cards.'],
  ['🎥','A real broadcast crew','The camera director cuts to a low angle behind the penalty taker, a high angle for corners and a close-up of the scorer, and every goal gets an instant replay from behind the goal. Tap to skip; turn replays off in Settings.'],
  ['🏟️','A stadium that looks the part','Floodlights wash the pitch smoothly instead of leaving green patches, mown stripes catch the light, and goalmouths and spots look like worn grass. Pitch lines are crisper and thicker near the camera, and night, golden hour and rain each get their own lighting. The crowd is now made of actual fans in your team\'s colors, with hats, scarves and a gentle sway, darker toward the back of the stand.'],
  ['🎥','A calmer camera, smoother players','The broadcast camera now follows play like a real cameraman: it looks ahead of a fast ball, stops tugging at every dribble and keeps the goal mouth in view as attacks close in. Facing, stride, kicks, jumps and celebrations move fluidly between frames even on slower devices.'],
  ['⚽','The ball behaves','The ball rolls the way it travels, long shots and crosses bend in the air, and it squashes a little on the bounce. Players set themselves before striking it, settle after the kick and slow into position instead of stopping dead.'],
  ['🎉','Goal celebrations with a build-up','The scorer gets his moment first. Then teammates arrive one by one to mob him.'],
  ['⚡','Menus that keep up','Pages open faster. The schedule shows this week and the next two matchdays, with earlier ones folded into one line each (tap one to open it, or Expand all). Crests are drawn once and reused, and moving between pages only redraws what changed. Tab underlines and progress bars glide instead of jumping.'],
  ['🏟️','A lighter title screen','The mascot parade, floodlight beams and logo shine on the title screen now cost a fraction of what they did, so it runs about twice as smoothly. The match in the background pauses while a window or the career builder covers it.'],
  ['📶','Fewer stalls','Simulating ahead no longer freezes the page between games, the live commentary adds new lines without rebuilding the whole list, and a paused or hidden match stops redrawing to save battery. Settings has a new Match graphics option.'],
  ['🐉','16 new mascots','Phoenix, Dragons, Gators, Scorpions, Owls, Cyclones, Bison, Cobras, Yetis, Krakens, Mammoths, Coyotes, Stingrays, Rhinos, Foxes and Huskies join the original 20, each drawn in the same style and recoloured for every school. New careers can pick any of the 36.'],
  ['🏫','Thousands more school names','Towns now come from a much bigger pool, and schools are named in more ways: Ravenwood Academy, Granite Falls North, Lincoln Memorial High, St. Ambrose Prep, Ironbridge Tech. Older saves keep their names.'],
  ['🧭','A new home screen','The sidebar is replaced by a top bar: Overview, Squad, Schedule, Competition, Club and More, each with a drop-down that says what every page is for. The Overview is now one dashboard: your team card and coach decisions, your starting XI on a pitch, a big Play button for the next match, youth watch, training focus and the section table, with everything else underneath.'],
  ['⚡','Smoother and lighter','Live matches draw the crowd from a cached image, cap drawing at 60 frames a second and lower their resolution on slower computers, so they use far less of your computer. Menus open instantly because match odds are worked out in the background, and "Sim to end of season" shows progress instead of freezing the page.'],
  ['🎽','A new look, in your colors','Every menu is redesigned around your school: a chenille patch and jacket-cuff stripes in your colors, a season rail that shows where you are, cleaner tables with form pips, and selections that light up in your team color. Gold is now saved for buttons and live play. Works with every theme.'],
  ['🦅','Sharper mascots','All 20 mascots gained detail (fur, feathers, rivets, highlights) plus a pro two-tone outline, soft shading and a gloss highlight. Small icons stay crisp and simple.'],
  ['🏟️','Your home ground, lit up','The stadium art now has a starry sky, floodlight beams and halos, crowds in your colors, team benches, corner flags, pitchside boards and a scoreboard with your mascot. School & Stadium opens with a new home-ground banner.'],
  ['🃏','Program-style screens','New career builder with a live team jacket preview, a varsity-letter title screen, player profiles in each school\'s colors, and the lineup pitch now stays in view while you set tactics.'],
  ['6️⃣','Regular-season goal cap','Your team scores at most 6 goals in a regular-season game; extra chances are saved or missed instead. Preseason and postseason are uncapped, and Manager Mode scores follow the same rule.'],
  ['🚩','Officials & restarts','Assistant referees now run both touchlines and flag offsides (with a broadcast freeze-line), point out throw-ins and help with corners. Throw-ins use a real two-handed throw, saves tipped behind become proper corners, and offsides appear in the commentary and match stats. Results are unaffected.'],
  ['⚽','Smarter football on the broadcast','Attackers hold their runs on the offside line, passes are chipped over defenders instead of rolling through them, shots rise over blocking legs, breakaways are real through balls behind a high line, and headed goals are genuine headers timed at the top of the leap.'],
  ['📺','Genuine highlights','TouchlineTV, match-report replays and Season Wrapped now start each clip from the first recorded touch of the real move (or the set piece itself), never from an invented kickoff.'],
  ['🧭','Easier navigation','The sidebar is regrouped into Matchday, Team, Competition, Stories and Club and fits on one screen; phones get a bottom tab bar for the five most-used places.'],
  ['🫙','The Time Capsule','Every fall, each freshman writes one promise for senior year, written from who he is: a striker promises goals, a keeper promises shutouts, a hothead promises zero red cards, a long shot promises just one varsity game. Four seasons later, open the capsule on graduation day and see who kept his word. Archive → Time Capsule.'],
  ['🏆','Fairer postseason','Regional and State opponents now top out at an 85 Starting XI rating. Your own team has no cap.'],
  ['📣','Faster lineup intros, every game','The stadium announcer now runs before every match and moves about twice as fast. On the other team\'s lineup, tap or press "Skip to us" to jump straight to your own starting XI, or "Skip all" to go straight to kickoff.'],
  ['📅','Schedule Builder','Every preseason, pick your three Preseason Cup opponents from tune-ups to giants, choose home, away or a neutral showcase, and run a JV scrimmage.'],
  ['🏃','Smoother match animation','Planted feet that grip the turf, distinct walk, jog and sprint, backpedalling and jockeying defenders, keepers who dive to the ball and get back up, and a steadier 120 Hz simulation clock.'],
  ['🎚️','Match sound mixer','Choose exactly which sounds play during matches: ball, footsteps, net, woodwork, keeper, tackles, crowd, reactions, goal horn, chants, whistle, announcer and jingles. Five presets, volume levels, and a Sounds button right on the broadcast.'],
  ['🎙️','Cinematic lineup intros','Both starting XIs are introduced: the opponents first, a VS slam, then your team with a drum-and-drone score, an impact on every surname and the crowd going up. Pick the announcer voice in Settings.'],
  ['👕','Kit Lab','Design home, away and third kits with 18 patterns, 80+ colors, collars, cuffs, socks and number styles. A colorblind-aware clash check picks the right kit for every match.'],
  ['🎞️','Season Wrapped','When the season ends, relive it as a swipeable story: your finish, top scorer, the moment of the season with a replay, and a shareable image.'],
  ['🥅','Penalties, reworked','Run-ups, stutter steps, keepers bouncing on the line, Panenkas, parries and shots off the woodwork, plus a live shootout tracker.'],
  ['🏟️','Matchday Center','Watch any game in the round live on the broadcast, or quick-sim it. Results count like any other game and your own match is never affected.'],
  ['🎉','Signature celebrations','Ten celebrations, from the Knee Slide to the Backflip, unlocked by real milestones. Pick one in any player\'s Celebration tab.'],
  ['📰','The Courier','A newspaper front page for every week of the season, written from your actual results, with press photos from the broadcast.'],
  ['📺','TouchlineTV','The Top 5 plays of every week, replayed on the broadcast stage with a countdown.'],
  ['🌹','Senior Night','Before your last regular-season home game, every senior is honored with a framed jersey, family and career numbers.'],
  ['⚽','New broadcast engine','Real ball physics with bounces, spin and a net that catches the ball; run cycles, backswings and follow-throughs; a bigger stadium with a video board.'],
  ['🔎','Compare players','Search any player, filter by team or level, sort, and see both player cards side by side. Or press Compare with… on any profile.'],
  ['🎵','Sound','A new soundtrack for the menu and the office, a crowd that swells with every attack, and real match sounds: strikes, touches, footsteps, the net, saves. Press M to mute.'],
  ['🧍','Player models','Bodies now turn in three dimensions: shoulders, arms, hips and head always line up with the torso, from the side, the front or the back.']].map(([i,t,d])=>`<div class="wn-i"><span>${i}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`, `<button class="btn pri" data-a="closeModal">Let's go</button>`);
document.addEventListener('keydown',e=>{ if(e.key!=='Enter'||App.C||App.modal) return; const t=e.target; if(t&&/INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName)) return; const b=document.querySelector('.cont-hero'); if(b){ e.preventDefault(); b.click(); } });

/* ---------- Coach's Office: the press box (latest Courier headline + TouchlineTV's #1 play) ---------- */
function pressBox(){ const C=App.C; const issues=courierIssues(C); if(!issues.length) return ''; const ix=issues.length-1, is=issues[ix]; const f=leadFixture(C,is); if(!f||!C.logs[f.id]) return '';
  const S=storyOf(C,f); const top=topPlays(C,is,1)[0];
  return `<div class="card pressbox"><div class="hd"><h3>Press box</h3><span class="tiny muted">${esc(issueLabel(is))}</span></div>
    <button class="pb-paper" data-a="go" data-r="news" data-p='{"nv":"courier"}'><span class="pb-mast">The ${esc(Sx(C.userSid).town)} Courier</span><b>${esc(S.head)}</b><span class="small">${esc(S.deck)}</span></button>
    ${top?`<button class="pb-tv" data-a="go" data-r="news" data-p='{"nv":"tv"}'><span class="tv-img" data-photo="${top.fid}:${top.i}"></span><span class="pb-tvt"><span class="tv-logo sm">Touchline<b>TV</b></span><span>#1 play: ${esc(pname(Px(top.pid)))}, ${esc(v188GoalName(top)||top.ty)} (${top.m}')</span></span><span class="tv-play">▶</span></button>`:''}</div>`; }

/* ---------- sound in the interface: clicks, navigation, windows, toasts; quick mute (M) ---------- */
function soundBtn(big){ const on=PREFS.sound.on; return `<button class="btn sm ghost sndbtn ${on?'on':''} ${big?'big':''}" data-a="toggleSound" aria-pressed="${on}" aria-label="${on?'Mute sound (M)':'Turn sound on (M)'}" title="${on?'Sound on · press M to mute':'Sound off · press M to turn on'}"><span class="snd-ic" aria-hidden="true">${on?'<i></i><i></i><i></i>':'✕'}</span>${big?`<span>${on?'Sound on':'Sound off'}</span>`:''}</button>`; }
function setSound(on){ PREFS.sound.on=on; savePrefs(); Sound.gestured=true; if(on){ Sound.ensure(); Sound.vols(); Sound.syncMenu(); if(App.live) Sound.crowdStart(); Sound.ui('on'); } else { Sound.vols(); Sound.musicStop(); Sound.crowdStop(); }
  document.querySelectorAll('.sndbtn').forEach(b=>{ const big=b.classList.contains('big'); b.outerHTML=soundBtn(big); }); const chk=document.querySelector('[data-c="soundOn"]'); if(chk) chk.checked=on; toast(on?'Sound on. Press M to mute.':'Sound off. Press M to turn it back on.'); }
A.toggleSound = ()=> setSound(!PREFS.sound.on);
document.addEventListener('keydown',e=>{ const t=e.target; if(t&&/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
  if((e.key==='m'||e.key==='M')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){ e.preventDefault(); setSound(!PREFS.sound.on); }
  else if(e.key==='/'&&App.C&&!App.live&&!App.modal){ const q=$('#q'); if(q){ e.preventDefault(); q.focus(); q.select(); } }
  else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&App.C&&App.route==='news'&&!App.modal&&(App.params.nv||'courier')!=='wire'){ const n=courierIssues(App.C).length; const cur=App.params.ix!=null&&App.params.ix!==''?+App.params.ix:n-1; const nx=clamp(cur+(e.key==='ArrowLeft'?-1:1),0,n-1); if(nx!==cur){ App.params.ix=nx; Sound.ui('swoosh'); render(); } } });
document.addEventListener('click',e=>{ if(typeof Sound==='undefined'||!PREFS.sound.on) return; const el=e.target.closest('button,[data-a],.tab,input[type=checkbox],select'); if(!el||el.disabled) return; const a=el.dataset&&el.dataset.a;
  if(a==='toggleSound'||a==='testSound'||a==='kickoff') return;
  if(a==='go'||(a==='setParam'&&el.classList.contains('tab'))||a==='modalTab') Sound.ui('nav');
  else if(a==='closeModal'||(a==='scrimClose'&&e.target===el)||a==='closeCeremony') Sound.ui('close');
  else if(el.matches('input[type=checkbox]')) Sound.ui(el.checked?'on':'off');
  else if(a!=='scrimClose') Sound.ui('click'); },true);
const _renderModal0=renderModal; renderModal=function(){ const had=!!document.querySelector('#modal-root .modal'); _renderModal0(); const has=!!document.querySelector('#modal-root .modal'); if(has&&!had) Sound.ui('open'); };
const _toast0=toast; toast=function(m){ _toast0(m); Sound.ui('pop'); };

/* ---------- motion polish: staggered view entrances, count-ups, a sliding tab indicator, button ripples ---------- */
const TABPOS={};
function polishView(routeChanged){ const root=$('#content'); if(!root) return; const rm=reducedMotion();
  if(routeChanged&&!rm){ root.classList.add('enter'); [...root.children].slice(0,14).forEach((el,i)=>el.style.setProperty('--d',(i*45)+'ms')); setTimeout(()=>root.classList.remove('enter'),1400);
    // numbers count up from zero the first time a view opens
    root.querySelectorAll('.kpi b, .bignum, .ring-n').forEach(el=>{ const m=String(el.textContent).trim().match(/^([+-]?)(\d{1,4})$/); if(!m||el.children.length) return; const sign=m[1], to=+m[2]; if(to<2) return; const t0=performance.now(), D=650;
      const step=t=>{ const u=Math.min(1,(t-t0)/D), e=1-Math.pow(1-u,3); el.textContent=sign+Math.round(to*e); if(u<1&&el.isConnected) requestAnimationFrame(step); }; el.textContent=sign+'0'; requestAnimationFrame(step); }); }
  tabIndicators(document); }
function tabIndicators(scope){ scope.querySelectorAll('.tabs').forEach(tb=>{ const on=tb.querySelector('.tab.on'); if(!on) return; tb.classList.add('tabs-ind'); const key=(tb.querySelector('.tab')||{}).dataset?.k||'t'; const r={x:on.offsetLeft,w:on.offsetWidth,y:on.offsetTop+on.offsetHeight};
    const prev=TABPOS[key];
    const set=p=>{ tb.style.setProperty('--ti-x',p.x+'px'); tb.style.setProperty('--ti-w',p.w+'px'); tb.style.setProperty('--ti-y',p.y+'px'); };
    if(prev&&prev.y===r.y&&(prev.x!==r.x||prev.w!==r.w)&&!reducedMotion()){ tb.classList.add('ti-still'); set(prev); void tb.offsetWidth; tb.classList.remove('ti-still'); requestAnimationFrame(()=>set(r)); } else set(r);
    TABPOS[key]=r; }); }
const _render1=render; let _lastRoute=null;
render=function(){ const changed=App.C&&App.route!==_lastRoute; _render1(); if(App.C){ _lastRoute=App.route; polishView(changed); } else _lastRoute=null; };
const _renderModal1=renderModal; renderModal=function(){ _renderModal1(); const r=$('#modal-root'); if(r) tabIndicators(r); };
document.addEventListener('pointerdown',e=>{ const b=e.target.closest('.btn,.cel-tile,.tv-thumb,.cmp-row,.nav'); if(!b||reducedMotion()) return; const r=b.getBoundingClientRect(); b.style.setProperty('--rx',(e.clientX-r.left)+'px'); b.style.setProperty('--ry',(e.clientY-r.top)+'px'); b.classList.remove('rip'); void b.offsetWidth; b.classList.add('rip'); setTimeout(()=>b.classList.remove('rip'),600); },true);

/* ---------- player profile: jump straight into a comparison ---------- */
const _mPlayer=MODALS.player;
MODALS.player=m=>{ const h=_mPlayer(m); return h.replace('<div class="mfoot"><button class="btn" data-a="closeModal">Close</button>',`<div class="mfoot"><button class="btn" data-a="cmpWith" data-id="${esc(m.id)}">Compare with…</button><button class="btn" data-a="closeModal">Close</button>`); };
A.cmpWith = el => { const id=el.dataset.id; App.modal=null; renderModal(); App.route='history'; App.params={tab:'compare',pa:id,ta:'all',la:App.C.alumni[id]?'ALUM':(Px(id)||{}).lvl||'V'}; render(); window.scrollTo(0,0); toast('Pick someone in the Player B list to compare.'); };
