/* ===================== v18.12 TRYOUTS: the drills on screen and the gym door (v1812t) =====================
   Pure presentation: inline SVG and CSS animations, no random streams, nothing here changes the game.
   - v1812tScene(kind, o): a short looping SVG animation per drill (sprint, juggling, beep test, position drill, scrimmage)
   - v1812tSheet(C, lvl, o): the typed roster sheet (HTML), used on the screen, in the door scene and in the recap
   - v1812tDoorOpen(C, sum): the full-screen scene where the list is taped to the gym door, then the trainer's door */

/* a small runner, side view: head, body, two swinging arms and legs (CSS keyframes in 97_tryouts.css) */
function v1812tRunner(x,y,col,o){ o=o||{}; const sk=o.skin||'#e5ae86', s=o.s||1, cls=o.cls||'run';
  return `<g class="v1812t-rn ${cls}" transform="translate(${x} ${y}) scale(${s})"><rect class="rn-l rn-l2" x="-2.6" y="-11" width="5" height="12" rx="2.4" fill="${o.legs||'#1b2430'}"/><rect class="rn-a rn-a2" x="-2" y="-27" width="4" height="12" rx="2" fill="${sk}"/><rect x="-5.2" y="-28" width="10.4" height="18" rx="4.6" fill="${col}"/><circle cx="1" cy="-34" r="5.2" fill="${sk}"/><path d="M-3.6 -37.4 a5.6 5.6 0 0 1 9 -1" fill="none" stroke="${o.hair||'#2b1a10'}" stroke-width="3.2" stroke-linecap="round"/><rect class="rn-l rn-l1" x="-2.6" y="-11" width="5" height="12" rx="2.4" fill="${o.legs||'#1b2430'}"/><rect class="rn-a rn-a1" x="-2" y="-27" width="4" height="12" rx="2" fill="${sk}"/></g>`; }
function v1812tCone(x,y,c){ return `<path d="M${x-4.5} ${y} L${x} ${y-12} L${x+4.5} ${y}Z" fill="${c||'#f97316'}"/><path d="M${x-3} ${y-5} h6" stroke="#fff" stroke-width="1.6"/>`; }
/* kind: spr | jug | beep | pos | scr. o: {c1, c2, dur (s)} */
function v1812tScene(kind,o){ o=o||{}; const c1=o.c1||'#2f5fb3', c2=o.c2||'#f2c230', d=o.dur||2.6;
  const crowd=Array.from({length:44},(_,i)=>`<rect x="${i*9.2}" y="${78+(i*7%5)}" width="7" height="${20-(i*7%5)}" rx="3" fill="${['#2a4a5c','#34596b','#244152','#3b6074'][i%4]}"/>`).join('');
  const sky=`<defs><linearGradient id="v1812t-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1f2d"/><stop offset="1" stop-color="#1d5560"/></linearGradient><linearGradient id="v1812t-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23844a"/><stop offset="1" stop-color="#16622f"/></linearGradient></defs><rect width="400" height="140" fill="url(#v1812t-sky)"/><g opacity=".9">${crowd}</g><rect x="0" y="96" width="400" height="4" fill="#d8dde5" opacity=".5"/><g><rect x="30" y="20" width="3" height="76" fill="#33414d"/><rect x="367" y="20" width="3" height="76" fill="#33414d"/><circle cx="31.5" cy="20" r="13" fill="#fff6d8" opacity=".16"/><circle cx="368.5" cy="20" r="13" fill="#fff6d8" opacity=".16"/><rect x="22" y="14" width="19" height="7" rx="2" fill="#f4efd2"/><rect x="359" y="14" width="19" height="7" rx="2" fill="#f4efd2"/></g><rect x="0" y="100" width="400" height="40" fill="url(#v1812t-grass)"/><g stroke="#fff" stroke-opacity=".16" stroke-width="10">${[0,1,2,3,4,5].map(i=>`<path d="M${i*80+20} 100v40"/>`).join('')}</g>`;
  const wrap=b=>`<svg class="v1812t-scene-svg" viewBox="0 0 400 140" role="img" aria-label="${esc(o.label||'Drill animation')}" preserveAspectRatio="xMidYMid meet" style="--d:${d}s">${sky}${b}</svg>`;
  if(kind==='spr'){ const lanes=[[c1,110,.74,1],['#e8ecf1',122,.88,1.1],[c2,135,1.02,1.2]].map(([c,y,sc,k])=>`<g class="v1812t-dash" style="--k:${k}">${v1812tRunner(26,y,c,{s:sc,cls:'run'})}</g>`).join('');
    return wrap(`<g stroke="#fff" stroke-opacity=".4" stroke-width="1.2"><path d="M0 116H400M0 128.5H400"/>${[26,114,202,290,376].map(x=>`<path d="M${x} 100v38"/>`).join('')}</g><g fill="#fff" fill-opacity=".8" font-size="7.5" font-family="JetBrains Mono,monospace" text-anchor="middle">${['0','10','20','30','40 yd'].map((t,i)=>`<text x="${26+i*87.5}" y="98">${t}</text>`).join('')}</g>${lanes}`); }
  if(kind==='jug'){ return wrap(`${v1812tRunner(200,132,c1,{cls:'still',s:1.55})}<g class="v1812t-ball"><circle cx="207" cy="112" r="6.6" fill="#f5f5f5" stroke="#1b1b1b" stroke-width="1.4"/><path d="M204 109l3-2 3 2-1 3.4h-4z" fill="#1b1b1b"/></g><ellipse class="v1812t-bsh" cx="207" cy="134" rx="7" ry="1.8" fill="#000" opacity=".28"/>`); }
  if(kind==='beep'){ const R=[0,1,2].map(i=>`<g class="v1812t-shut" style="animation-delay:${i*0.09}s">${v1812tRunner(60,110+i*12.5,[c1,'#e8ecf1',c2][i],{s:.74+i*.14,cls:'run'})}</g>`).join('');
    return wrap(`<g stroke="#fff" stroke-width="2.6" opacity=".9"><path d="M52 100v38"/><path d="M348 100v38"/></g><g fill="#fff" font-size="7.5" font-family="JetBrains Mono,monospace" text-anchor="middle" opacity=".85"><text x="52" y="96">20 m</text><text x="348" y="96">20 m</text></g><circle class="v1812t-beepdot" cx="200" cy="62" r="9" fill="${c2}"/><text x="200" y="65.2" text-anchor="middle" font-size="7.5" font-weight="800" fill="#111" font-family="JetBrains Mono,monospace">BEEP</text>${R}`); }
  if(kind==='pos'){ const path='M40 122 C80 100 100 138 140 118 S200 100 240 120 S300 138 360 116'; const cones=[90,170,250,320].map((x,i)=>v1812tCone(x,i%2?136:104)).join('');
    return wrap(`${cones}<g><animateMotion dur="${d}s" repeatCount="indefinite" path="${path}" rotate="0" calcMode="linear"/>${v1812tRunner(0,0,c1,{s:.95,cls:'run'})}</g><circle r="4.8" fill="#f5f5f5" stroke="#1b1b1b" stroke-width="1.2"><animateMotion dur="${d}s" repeatCount="indefinite" path="${path}" rotate="0" calcMode="linear" begin="0.08s"/></circle>`); }
  /* scrimmage: a mini pitch seen from above */
  const dots=(col,pts)=>pts.map(([x,y],i)=>`<circle r="5.2" fill="${col}" stroke="#0b0f14" stroke-width="1"><animate attributeName="cx" dur="${(2.2+i*0.35).toFixed(2)}s" repeatCount="indefinite" values="${x};${x+14};${x-8};${x}"/><animate attributeName="cy" dur="${(2.6+i*0.3).toFixed(2)}s" repeatCount="indefinite" values="${y};${y-9};${y+8};${y}"/></circle>`).join('');
  return `<svg class="v1812t-scene-svg" viewBox="0 0 400 140" role="img" aria-label="${esc(o.label||'Final scrimmage')}" style="--d:${d}s"><rect width="400" height="140" fill="#1f7a3f"/><g stroke="#fff" stroke-opacity=".08" stroke-width="20">${[0,1,2,3,4].map(i=>`<path d="M${i*80+40} 0v140"/>`).join('')}</g><g fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"><rect x="8" y="8" width="384" height="124"/><path d="M200 8v124"/><circle cx="200" cy="70" r="20"/><rect x="8" y="38" width="48" height="64"/><rect x="344" y="38" width="48" height="64"/><rect x="8" y="55" width="16" height="30"/><rect x="376" y="55" width="16" height="30"/></g>${dots('#f4f6f8',[[80,40],[110,70],[80,100],[150,55],[150,88]])}${dots(c1,[[320,40],[290,70],[320,100],[250,55],[250,88]])}<circle r="4" fill="#fff" stroke="#111" stroke-width="1"><animate attributeName="cx" dur="${d}s" repeatCount="indefinite" values="120;280;190;300;120"/><animate attributeName="cy" dur="${d}s" repeatCount="indefinite" values="70;50;90;70;70"/></circle></svg>`; }

/* ---------- the typed roster sheet ---------- */
/* o: {circ:Set of ids to circle, num:bool, draft:bool, title:string} */
function v1812tSheet(C,lvl,o){ o=o||{}; const s=C.schools[C.userSid]; const ids=o.ids||[];
  const list=ids.map(id=>v1812tFind(C,id)).filter(Boolean).sort((a,b)=>a.ln.localeCompare(b.ln)||a.fn.localeCompare(b.fn));
  const circ=o.circ||new Set(); const nm={V:'Varsity',JV:'JV',MOD:'Modified'}[lvl];
  const rows=list.map((p,i)=>`<li class="${circ.has(p.id)?'circ':''}" style="--i:${i}"><span class="n">${i+1}.</span><span class="w"><span class="nm">${esc(p.fn)} ${esc(p.ln)}${circ.has(p.id)?`<svg class="v1812t-circle" viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true"><path d="M8 15C5 6 60 2 120 3 176 4 197 8 196 16 195 25 150 28 90 27 36 26 3 24 5 12 6 7 14 5 26 5" pathLength="1"/></svg>`:''}</span></span><span class="g">${p.grade}</span></li>`).join('');
  const note=lvl==='V'?`<p class="note">Not on this list? JV and Modified are posted on the trainer's door. See me Monday.<br><em>— Coach</em></p>`:`<p class="note">Cuts were told individually. See me Monday if you have questions.<br><em>— Coach</em></p>`;
  return `<div class="v1812t-sheet ${o.draft?'draft':''}" data-lvl="${lvl}"><span class="tape t1"></span><span class="tape t2"></span><div class="sh-head"><b>${esc(o.title||s.town+' '+nm+' Soccer')}</b><small>${C.year} roster · posted Friday 3:15 pm</small></div><ol class="sh-list">${rows||'<li class="empty"><span class="w">No one yet</span></li>'}</ol>${o.noNote?'':note}${o.draft?'<span class="stamp">DRAFT</span>':''}</div>`; }

/* ---------- the scene: the list goes up on the gym door ---------- */
function v1812tSnd(k){ try{ if(typeof Sound!=='undefined'&&Sound.ui) Sound.ui(k); }catch(e){} }
const V1812T_SC={t:[],on:false};
function v1812tBricks(){ const col=['#8a3f2e','#7d3727','#944634','#86402f','#703225','#923f2c','#7a3a2b']; let b='';
  for(let r=0;r<2;r++) for(let c=-1;c<3;c++){ const x=c*40+(r?-20:0); b+=`<rect x="${x+1.2}" y="${r*20+1.2}" width="37.6" height="17.6" rx="1.4" fill="${col[(r*3+c+8)%col.length]}"/>`; }
  return `<svg class="v1812t-wallsvg" aria-hidden="true" focusable="false"><defs><pattern id="v1812t-brick" width="80" height="40" patternUnits="userSpaceOnUse" patternTransform="scale(1.7)"><rect width="80" height="40" fill="#5b4a40"/>${b}</pattern></defs><rect width="100%" height="100%" fill="url(#v1812t-brick)"/></svg>`; }
function v1812tDoorOpen(C,sum){ v1812tDoorClose(true);
  const s=C.schools[C.userSid]; const T=C.tryout; const rm=typeof reducedMotion==='function'&&reducedMotion();
  const circ=new Set(sum.newV); const sh=(l,ids,ex)=>v1812tSheet(C,l,{ids,circ:l==='V'?circ:new Set(),...ex});
  const nCut=sum.n.X, nNew=sum.newcomers.length;
  const root=document.createElement('div'); root.id='v1812t-scene'; root.className='v1812t-scene'+(rm?' inst final':''); root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-label','The roster goes up on the gym door');
  root.style.setProperty('--c1',s.c1); root.style.setProperty('--c2',s.c2);
  root.innerHTML=`${v1812tBricks()}<div class="v1812t-vig" aria-hidden="true"></div>
   <div class="v1812t-cap" aria-live="polite"><span class="eyebrow" id="v1812t-capk">Friday · 3:15 pm</span><b id="v1812t-capt">The coach walks to the gym door with the list.</b></div>
   <div class="v1812t-slides">
    <section class="v1812t-slide s-gym" aria-label="The gym door"><div class="v1812t-sign">GYMNASIUM</div>
      <div class="v1812t-doorwrap"><div class="v1812t-leaf l"><span class="win" aria-hidden="true"></span><span class="bar" aria-hidden="true"></span><span class="plate" aria-hidden="true"></span>${sh('V',sum.v)}</div>
      <div class="v1812t-leaf r" aria-hidden="true"><span class="win"></span><span class="bar"></span><span class="plate"></span><div class="flyer f1"><b>Fall Concert</b><small>Thursday, 7 pm</small></div><div class="flyer f2"><b>Lost &amp; found</b><small>Ask the front office</small></div></div></div></section>
    <section class="v1812t-slide s-trainer" aria-label="The trainer's door"><div class="v1812t-sign sm">ATHLETIC TRAINER</div>
      <div class="v1812t-doorwrap tr"><div class="v1812t-leaf t">${sh('JV',sum.jv,{noNote:true})}${sh('MOD',sum.mod,{noNote:true})}</div></div></section>
   </div>
   <div class="v1812t-final"><div class="v1812t-fin-in"><div class="v1812t-fin-tiles"><span><b>${sum.n.V}</b>Varsity</span><span><b>${sum.n.JV}</b>JV</span><span><b>${sum.n.MOD}</b>Modified</span><span class="cut"><b>${nCut}</b>cut</span></div>
     <p>${sum.newV.length?`${sum.newV.length} new face${sum.newV.length===1?'':'s'} on the Varsity list. `:''}${nNew?`${nNew} newcomer${nNew===1?'':'s'} made a roster. `:''}${nCut?`${nCut} player${nCut===1?' was':'s were'} told Monday. They will remember it.`:'Nobody was cut.'}</p>
     <div class="row"><button class="btn pri" data-a="v1812tDoorDone" data-autofocus>Continue</button><button class="btn" data-a="v1812tDoorAgain">Watch again</button><button class="btn ghost" data-a="v1812tDoorSquads">Open the squads</button></div></div></div>
   <div class="v1812t-ctl"><button class="btn sm ghost" data-a="v1812tDoorSkip" id="v1812t-skip">Skip</button></div>`;
  document.body.appendChild(root); document.body.classList.add('locked'); V1812T_SC.on=true; V1812T_SC.sum=sum;
  const later=(ms,fn)=>{ V1812T_SC.t.push(setTimeout(()=>{ if(V1812T_SC.on) fn(); },ms)); };
  const cap=(k,t)=>{ const a=document.getElementById('v1812t-capk'), b=document.getElementById('v1812t-capt'); if(a) a.textContent=k; if(b) b.textContent=t; };
  const finish=()=>{ root.classList.add('inst','final','s2'); root.querySelectorAll('.sh-list li').forEach(li=>li.classList.add('in')); root.classList.add('on-paper','on-names','on-circ','on-note'); cap('Posted','The lists are up. Everyone on them is in.'); const sk=document.getElementById('v1812t-skip'); if(sk) sk.style.display='none'; const b=root.querySelector('[data-a="v1812tDoorDone"]'); if(b) b.focus({preventScroll:true}); };
  V1812T_SC.finish=finish;
  if(rm){ finish(); return root; }
  requestAnimationFrame(()=>root.classList.add('on'));
  later(500,()=>{ v1812tSnd('swoosh'); root.classList.add('on-paper'); cap('3:15 pm','The Varsity list goes up.'); });
  later(1250,()=>{ v1812tSnd('pop'); root.classList.add('on-tape'); });
  const nRows=sum.v.length; later(1500,()=>{ root.classList.add('on-names'); const lis=root.querySelectorAll('.s-gym .sh-list li'); lis.forEach((li,i)=>setTimeout(()=>{ if(V1812T_SC.on){ li.classList.add('in'); if(i%5===0) v1812tSnd('tick'); } },i*58)); });
  const tNames=1500+nRows*58+500;
  later(tNames,()=>{ root.classList.add('on-circ'); const n=root.querySelectorAll('.s-gym li.circ').length; for(let i=0;i<Math.min(n,4);i++) setTimeout(()=>v1812tSnd('pop'),i*260); cap('New to Varsity',sum.newV.length?`${sum.newV.length} circled: new on the list this year.`:'The same core returns.'); });
  later(tNames+1100,()=>{ root.classList.add('on-note'); });
  later(tNames+3000,()=>{ v1812tSnd('swoosh'); root.classList.add('s2'); cap('Next door down','JV and Modified are posted on the trainer\'s door.'); const lis=root.querySelectorAll('.s-trainer .sh-list li'); lis.forEach((li,i)=>setTimeout(()=>{ if(V1812T_SC.on) li.classList.add('in'); },500+i*30)); });
  later(tNames+3000+700+Math.max(sum.jv.length,sum.mod.length)*30+900,()=>{ v1812tSnd('success'); root.classList.add('final'); cap('Posted','The lists are up. Everyone on them is in.'); const sk=document.getElementById('v1812t-skip'); if(sk) sk.style.display='none'; const b=root.querySelector('[data-a="v1812tDoorDone"]'); if(b) b.focus({preventScroll:true}); });
  return root; }
function v1812tDoorClose(quiet){ for(const t of V1812T_SC.t) clearTimeout(t); V1812T_SC.t=[]; V1812T_SC.on=false; const el=document.getElementById('v1812t-scene'); if(el) el.remove(); if(!App.modal&&!App.drawer&&!App.live) document.body.classList.remove('locked'); }
document.addEventListener('keydown',e=>{ if(!V1812T_SC.on) return; if(e.key==='Tab'){ const root=document.getElementById('v1812t-scene'); if(root){ const f=[...root.querySelectorAll('button:not([disabled])')].filter(b=>b.offsetParent!==null); if(f.length){ const i=f.indexOf(document.activeElement); const n=e.shiftKey?(i<=0?f[f.length-1]:f[i-1]):(i<0||i===f.length-1?f[0]:f[i+1]); e.preventDefault(); n.focus(); } } return; } if(e.key==='Escape'||e.key===' '){ const root=document.getElementById('v1812t-scene'); if(root&&!root.classList.contains('final')){ e.preventDefault(); V1812T_SC.finish&&V1812T_SC.finish(); } else if(e.key==='Escape'){ A.v1812tDoorDone(); } } });
