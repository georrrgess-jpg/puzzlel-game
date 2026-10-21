/* ===================== v10: SEASON WRAPPED — the season as a swipeable story ===================== */
const wrOrd=n=>{ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
function wrPerson(p){ return p?{id:p.id,fn:p.fn,ln:p.ln,num:p.num,sid:p.sid,pos:p.pos,grade:p.grade,look:lookOf(p)}:null; }
function wrGoals(p,yr){ let g=0,a=0,gp=0; const y=p.st&&p.st[yr]; if(!y) return {g,a,gp}; for(const lvl of ['V']) for(const bk of ['pre','reg','post']){ const b=y[lvl]&&y[lvl][bk]; if(b){ g+=b.g||0; a+=b.a||0; gp+=b.gp||0; } } return {g,a,gp}; }
/* everything the story needs, captured before the seniors graduate and the logs are archived */
function buildWrapped(C,yr){ const u=C.userSid; const me=C.schools[u];
  const tab=standings(C,'V',yr); const pos=Math.max(1,tab.findIndex(r=>r.sid===u)+1); const row=tab[pos-1]||{w:0,d:0,l:0,gf:0,ga:0,pts:0};
  const fx=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.lvl==='V'&&f.st==='d'&&(f.h===u||f.a===u)).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  const ord={pre:0,reg:1,sec:2,rgn:3,st:4}; fx.sort((a,b)=>(ord[a.comp]-ord[b.comp])||(a.rd-b.rd));
  const my=f=>f.h===u?f.hg:f.ag, th=f=>f.h===u?f.ag:f.hg, opp=f=>f.h===u?f.a:f.h, won=f=>f.w===u, lost=f=>f.w&&f.w!==u;
  const all={w:fx.filter(won).length,d:fx.filter(f=>!f.w).length,l:fx.filter(lost).length,gf:fx.reduce((t,f)=>t+my(f),0),ga:fx.reduce((t,f)=>t+th(f),0),cs:fx.filter(f=>th(f)===0).length,gp:fx.length};
  let streak=0,cur=0; for(const f of fx){ if(!lost(f)){ cur++; streak=Math.max(streak,cur); } else cur=0; }
  const wins=fx.filter(won).sort((a,b)=>(my(b)-th(b))-(my(a)-th(a))||my(b)-my(a)); const bw=wins[0];
  const big=bw?{fid:bw.id,opp:opp(bw),sc:[my(bw),th(bw)],home:bw.h===u,label:fixtureLabel(bw)}:null;
  const roster=Object.values(C.players).filter(p=>p.sid===u);
  const scorers=roster.map(p=>({p,...wrGoals(p,yr)})).filter(x=>x.gp>0);
  const ts=[...scorers].sort((a,b)=>b.g-a.g||b.a-a.a)[0]; const ta=[...scorers].sort((a,b)=>b.a-a.a||b.g-a.g)[0];
  const br=roster.map(p=>({p,d:p.ovr0&&p.ovr0[yr]!=null?ovr(p)-p.ovr0[yr]:0})).sort((a,b)=>b.d-a.d)[0];
  const seniors=roster.filter(p=>p.grade>=12).map(p=>{ const t=careerTotals(p,'V'); return {p:wrPerson(p),g:t.g,a:t.a,gp:t.gp}; }).filter(x=>x.gp>0).sort((a,b)=>b.gp-a.gp).slice(0,8);
  /* the moment of the season: the goal that mattered most */
  let moment=null;
  for(const f of fx){ const lg=C.logs[f.id]; if(!lg||!lg.ev) continue; const side=f.h===u?0:1; const goals=lg.ev.filter(e=>e.t==='goal');
    goals.forEach((e,i)=>{ if(e.s!==side) return; const sc=e.sc||[0,0]; const us=sc[side], them=sc[1-side]; const fin=[my(f),th(f)];
      let sco=0, label='Goal of the season'; const late=e.m>=72; const winner=won(f)&&us===them+1&&fin[1]<us; const leveller=!f.w&&us===them&&fin[0]===us;
      if(winner){ sco+=6; label=late?'Last-minute winner':'The winner'; } else if(leveller){ sco+=4; label=late?'Late equalizer':'The equalizer'; }
      if(late) sco+=3; if(['sec','rgn','st'].includes(f.comp)) sco+=3; if(f.comp==='st') sco+=2; if(isRivalry(C,f.h,f.a)==='heated') sco+=2; if(e.ty==='solo'||e.ty==='long'||e.ty==='fk') sco+=1.5; if(e.seq) sco+=1;
      if(!moment||sco>moment.sco) moment={sco,fid:f.id,gi:i,m:e.m,p:wrPerson(C.players[e.pid]),pname:pname(C.players[e.pid]),opp:opp(f),label,ty:e.ty,comp:f.comp,fin,canReplay:!!(e.seq&&e.seq.length)}; }); }
  const homes=fx.filter(f=>f.h===u&&f.att); const att=homes.length?{max:Math.max(...homes.map(f=>f.att)),avg:Math.round(homes.reduce((t,f)=>t+f.att,0)/homes.length),fid:homes.reduce((a,b)=>b.att>a.att?b:a).id}:null;
  const rv=C.rivals&&C.rivals.heated; const rg=rv?fx.filter(f=>opp(f)===rv):[]; const riv=rv&&rg.length?{sid:rv,w:rg.filter(won).length,d:rg.filter(f=>!f.w).length,l:rg.filter(lost).length,games:rg.map(f=>[my(f),th(f)])}:null;
  const hon=(me.honors||[]).filter(h=>h.yr===yr).map(h=>h.label);
  const lastPost=[...fx].reverse().find(f=>['sec','rgn','st'].includes(f.comp)); const post={honors:hon,last:lastPost?{label:fixtureLabel(lastPost),won:won(lastPost),opp:opp(lastPost),sc:[my(lastPost),th(lastPost)]}:null};
  const A=C.awards&&C.awards[yr]; const awards=[]; if(A){ for(const k in A.list){ const a=A.list[k]; if(a.sid===u) awards.push({k,n:AWARD_NAME[k]||k,p:wrPerson(C.players[a.pid]),pname:pname(C.players[a.pid])}); } }
  const allLeague=A?[...(A.al1||[]),...(A.al2||[])].filter(id=>C.players[id]&&C.players[id].sid===u).length:0; const coy=!!(A&&A.coy&&A.coy.sid===u);
  return {yr,pos,n:tab.length,row:{w:row.w,d:row.d,l:row.l,gf:row.gf,ga:row.ga,pts:row.pts},all,streak,big,top:ts&&ts.g>0?{p:wrPerson(ts.p),g:ts.g,a:ts.a,gp:ts.gp}:null,ast:ta&&ta.a>0?{p:wrPerson(ta.p),a:ta.a}:null,
    breakout:br&&br.d>=1?{p:wrPerson(br.p),d:Math.round(br.d),now:Math.round(ovr(br.p))}:null,seniors,moment,att,riv,post,awards,allLeague,coy,coach:(C.coaches[me.coachId]||{}).name||'Coach'}; }
function ensureWrapped(C,yr){ C.wrapped=C.wrapped||{}; yr=yr||C.year; if(!C.wrapped[yr]&&C.phase==='offseason'&&yr===C.year){ try{ C.wrapped[yr]=buildWrapped(C,yr); queueSave(); }catch(e){ console.error(e); } } return C.wrapped[yr]; }
const _rolloverW=rollover; rollover=function(C){ try{ if(C.phase==='offseason') ensureWrapped(C,C.year); }catch(e){} return _rolloverW.apply(this,arguments); };

/* ---------- the slides ---------- */
function wrSlides(W){ const C=App.C; const me=Sx(C.userSid); const S=[]; const c1=me.c1, c2=me.c2; const P=p=>p?portraitSVG(p,190):'';
  const sch=id=>Sx(id)||{town:'Opponent',c1:'#444',c2:'#999',name:'Opponent'};
  S.push({k:'intro',bg:`radial-gradient(120% 90% at 50% 0%,${c1},#06080d 75%)`,h:`<div class="wr-logo">${logo(me,170)}</div><span class="wr-kick">${esc(me.name)}</span><h2 class="wr-big">Your ${W.yr} season</h2><h3 class="wr-sub">wrapped</h3><p class="wr-p">${W.all.gp} games. ${W.all.gf} goals. One story.</p>`});
  S.push({k:'finish',bg:`linear-gradient(160deg,${c1},#05080c 80%)`,h:`<span class="wr-kick">League table</span><h3 class="wr-sub">You finished</h3><div class="wr-huge gold">${wrOrd(W.pos)}</div><p class="wr-p">out of ${W.n} in Section ${C.section}</p>
    <div class="wr-stats"><span><b data-count="${W.row.w}">${W.row.w}</b>W</span><span><b data-count="${W.row.d}">${W.row.d}</b>D</span><span><b data-count="${W.row.l}">${W.row.l}</b>L</span><span><b data-count="${W.row.pts}">${W.row.pts}</b>pts</span></div>
    <p class="wr-p small">${W.all.gf} scored, ${W.all.ga} conceded across every competition. ${W.all.cs} clean sheet${W.all.cs===1?'':'s'}${W.streak>=3?`, and a ${W.streak}-game unbeaten run`:''}.</p>`});
  if(W.top) S.push({k:'scorer',bg:'linear-gradient(160deg,#ffd36b,#e98b2a)',ink:'#1d1300',h:`<span class="wr-kick">Your top scorer</span><div class="wr-face">${P(W.top.p)}</div><h2 class="wr-name">${esc(W.top.p.fn)}<br>${esc(W.top.p.ln)}</h2><div class="wr-huge"><b data-count="${W.top.g}">${W.top.g}</b> <small>goals</small></div><p class="wr-p">${W.top.a} assist${W.top.a===1?'':'s'} in ${W.top.gp} games${W.ast&&W.ast.p.id!==W.top.p.id?` · Top playmaker: ${esc(W.ast.p.fn[0])}. ${esc(W.ast.p.ln)} (${W.ast.a})`:''}</p>`});
  if(W.moment){ const m=W.moment, o=sch(m.opp); S.push({k:'moment',dur:11000,bg:'linear-gradient(170deg,#0f3a2a,#03060a 85%)',h:`<span class="wr-kick" style="color:#9ff0c6">Moment of the season</span>${m.canReplay&&App.C.logs[m.fid]?`<div class="wr-replay"><canvas id="wr-cv" aria-label="Replay of the goal"></canvas><span id="wr-cap" class="wr-cap"></span></div>`:`<div class="wr-face">${P(m.p)}</div>`}
    <h2 class="wr-big sm">${esc(m.label)}</h2><p class="wr-p"><b>${esc(m.pname)}</b>, ${m.m}' against ${esc(o.town)}${m.comp!=='reg'&&m.comp!=='pre'?` in the ${m.comp==='st'?'State tournament':m.comp==='rgn'?'Regional final':'Sectionals'}`:''}. Final score ${m.fin[0]}–${m.fin[1]}.</p>`}); }
  if(W.big){ const o=sch(W.big.opp); S.push({k:'big',bg:`linear-gradient(200deg,${o.c1},#06080d 70%)`,h:`<span class="wr-kick">Biggest win</span><div class="wr-vs">${logo(me,110)}<div class="wr-score"><b>${W.big.sc[0]}</b><i>–</i><b>${W.big.sc[1]}</b></div>${logo(o,110)}</div><p class="wr-p">${W.big.home?'At home':'Away'} against ${esc(o.name)} · ${esc(W.big.label)}</p>`}); }
  if(W.breakout) S.push({k:'breakout',bg:'linear-gradient(160deg,#7c3aed,#0b0716 80%)',h:`<span class="wr-kick">Breakout player</span><div class="wr-face">${P(W.breakout.p)}</div><h2 class="wr-name">${esc(W.breakout.p.fn)} ${esc(W.breakout.p.ln)}</h2><div class="wr-huge">+<b data-count="${W.breakout.d}">${W.breakout.d}</b> <small>overall</small></div><p class="wr-p">Now rated ${Math.round(W.breakout.now)}. Grade ${W.breakout.p.grade}, and still improving.</p>`});
  if(W.riv){ const o=sch(W.riv.sid); S.push({k:'riv',bg:`linear-gradient(135deg,${c1} 0 49.6%,${o.c1} 50.4% 100%)`,h:`<span class="wr-kick">Rivalry Night</span><div class="wr-vs">${logo(me,104)}<span class="wr-vsx">VS</span>${logo(o,104)}</div><h2 class="wr-big sm">${W.riv.w}W · ${W.riv.d}D · ${W.riv.l}L</h2><p class="wr-p">against ${esc(o.name)}: ${W.riv.games.map(g=>g.join('–')).join(', ')}. ${W.riv.w>W.riv.l?'Bragging rights are yours.':W.riv.w<W.riv.l?'Next year.':'Honors even.'}</p>`}); }
  if(W.att) S.push({k:'crowd',bg:'linear-gradient(180deg,#1b2a4a,#05080c 80%)',h:`<span class="wr-kick">The home crowd</span><div class="wr-crowd">${Array.from({length:42},(_,i)=>`<i style="--d:${(i%7)*0.12}s;background:${[c1,c2,'#ffd36b','#e5e7eb'][i%4]}"></i>`).join('')}</div><div class="wr-huge"><b data-count="${W.att.max}">${W.att.max.toLocaleString()}</b></div><p class="wr-p">Your biggest home crowd of the season. ${W.att.avg.toLocaleString()} came out on an average night.</p>`});
  if(W.post.honors.length||W.post.last){ const L=W.post.last; S.push({k:'post',bg:'linear-gradient(160deg,#3a2a05,#05080c 75%)',h:`<span class="wr-kick">The postseason</span>${W.post.honors.length?`<div class="wr-trophy">🏆</div><h2 class="wr-big sm gold">${W.post.honors.map(esc).join(' · ')}</h2>`:`<div class="wr-trophy dim">🏟️</div><h2 class="wr-big sm">${L&&!L.won?'The run ended':'The run'}</h2>`}${L?`<p class="wr-p">${esc(L.label)}: ${L.sc[0]}–${L.sc[1]} ${L.won?'win over':'against'} ${esc(sch(L.opp).town)}.</p>`:''}`}); }
  if(W.awards.length||W.allLeague||W.coy) S.push({k:'awards',bg:'linear-gradient(160deg,#5c4410,#05080c 80%)',h:`<span class="wr-kick">Awards night</span><div class="wr-awards">${W.awards.map(a=>`<div class="wr-aw"><div class="wr-aw-f">${a.p?portraitSVG(a.p,64):''}</div><div><b>${esc(a.n)}</b><span>${esc(a.pname)}</span></div></div>`).join('')}${W.coy?`<div class="wr-aw"><div class="wr-aw-f wr-cap-ic">🧢</div><div><b>Coach of the Year</b><span>${esc(W.coach)}</span></div></div>`:''}</div>${W.allLeague?`<p class="wr-p">${W.allLeague} player${W.allLeague===1?'':'s'} named All-League.</p>`:''}`});
  if(W.seniors.length) S.push({k:'seniors',bg:'linear-gradient(170deg,#3b1d2e,#06080d 80%)',h:`<span class="wr-kick">Class of ${W.yr} farewell</span><h2 class="wr-big sm">Thank you, seniors</h2><div class="wr-seniors">${W.seniors.map(s=>`<div class="wr-sn"><div class="wr-sn-f">${portraitSVG(s.p,70)}</div><b>${esc(s.p.fn[0])}. ${esc(s.p.ln)}</b><span>#${s.p.num} · ${s.gp} gp${s.g?` · ${s.g} g`:''}</span></div>`).join('')}</div>`});
  S.push({k:'outro',bg:`radial-gradient(120% 90% at 50% 100%,${c1},#06080d 70%)`,h:`<div class="wr-logo sm">${logo(me,110)}</div><span class="wr-kick">${W.yr} in one card</span><div class="wr-sum"><div><b>${wrOrd(W.pos)}</b><span>in the league</span></div><div><b>${W.all.w}-${W.all.d}-${W.all.l}</b><span>overall</span></div><div><b>${W.all.gf}</b><span>goals</span></div>${W.top?`<div><b>${W.top.g}</b><span>${esc(W.top.p.ln)}</span></div>`:''}</div>
    <div class="wr-act"><button class="btn pri" data-a="wrSave">⤓ Save image</button><button class="btn" data-a="wrGo" data-v="0">↺ Watch again</button><button class="btn ghost" data-a="wrClose">Done</button></div>`});
  return S; }

/* ---------- the player ---------- */
A.wrapped=el=>{ const C=App.C; const yr=+(el&&el.dataset&&el.dataset.yr)||C.year; const W=(C.wrapped&&C.wrapped[yr])||ensureWrapped(C,yr); if(!W){ toast('Season Wrapped is ready when the season ends.'); return; }
  (C.wrappedSeen||(C.wrappedSeen={}))[yr]=1; queueSave();
  App.wr={W,S:wrSlides(W),i:0,t0:performance.now(),paused:false}; wrMount(); Sound.ui&&Sound.ui('success'); };
function wrMount(){ let root=$('#wr-root'); if(!root){ document.body.insertAdjacentHTML('beforeend','<div id="wr-root" role="dialog" aria-modal="true" aria-label="Season Wrapped"></div>'); root=$('#wr-root'); }
  document.body.classList.add('locked'); wrShow(0); if(!App._wrLoop){ App._wrLoop=true; requestAnimationFrame(wrTick); } }
function wrShow(i){ const R=App.wr; if(!R) return; R.i=clamp(i,0,R.S.length-1); R.t0=performance.now(); const sl=R.S[R.i]; const root=$('#wr-root');
  if(App.wrSt){ App.wrSt.destroy(); App.wrSt=null; }
  root.innerHTML=`<div class="wr-shell"><div class="wr-bars">${R.S.map((_,j)=>`<i class="${j<R.i?'done':''}"><b id="wr-b${j}"></b></i>`).join('')}</div>
    <div class="wr-top"><span>${esc(Sx(App.C.userSid).town)} · Season Wrapped ${R.W.yr}</span><span class="grow"></span><button class="wr-x" data-a="wrPause" aria-label="${R.paused?'Play':'Pause'}">${R.paused?'▶':'❚❚'}</button><button class="wr-x" data-a="wrClose" aria-label="Close">✕</button></div>
    <article class="wr-card wr-s-${sl.k}" style="background:${sl.bg};${sl.ink?`--ink:${sl.ink}`:''}">${sl.h}</article>
    <button class="wr-nav prev" data-a="wrGo" data-v="${R.i-1}" aria-label="Previous"></button><button class="wr-nav next" data-a="wrGo" data-v="${R.i+1}" aria-label="Next"></button></div>`;
  for(const el of root.querySelectorAll('[data-count]')){ const to=+el.dataset.count; const t0=performance.now(); const fmt=v=>to>=1000?Math.round(v).toLocaleString():Math.round(v); const step=t=>{ const u=Math.min(1,(t-t0)/900); el.textContent=fmt(to*(1-Math.pow(1-u,3))); if(u<1&&el.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  if(sl.k==='moment') wrReplay(); if(Sound.ui) Sound.ui('tab'); }
function wrTick(t){ const R=App.wr; if(!R||!$('#wr-root')){ App._wrLoop=false; return; } const sl=R.S[R.i]; const D=sl.dur||6500;
  if(R.paused){ R.t0=t-(R.pp||0); } else R.pp=t-R.t0; const u=clamp((t-R.t0)/D,0,1); const b=$('#wr-b'+R.i); if(b) b.style.width=(u*100)+'%';
  if(u>=1&&!R.paused&&R.i<R.S.length-1) wrShow(R.i+1); requestAnimationFrame(wrTick); }
function wrReplay(){ const R=App.wr; const m=R.W.moment; const cv=$('#wr-cv'); if(!cv||!m) return; const C=App.C; const f=C.fixtures[m.fid]; const lg=C.logs[m.fid]; if(!f||!lg) return; const e=(lg.ev||[]).filter(x=>x.t==='goal')[m.gi]; if(!e||!e.seq) return;
  const st=new Stage(cv,{h:Sx(f.h),a:Sx(f.a),id:f.id},{mode:'broadcast',section:C.section,minimap:false,sfx:false,onCaption:t=>{ const c=$('#wr-cap'); if(c) c.textContent=t; }}); App.wrSt=st;
  setTimeout(()=>{ if(!st.alive) return; st.skip=false; st.setSides(lg.lu.map(L=>({slots:L.slots,off:{}}))); lg.lu.forEach((L,i)=>{ const g=L.slots.find(s=>s.role==='GK'); if(g) st.setKeeper(i,g.pid); });
    st.clipStart(e); st.goalTs=0.85; st.emit=()=>{}; st.goalSequence(e).catch(()=>{}); },60); }
A.wrGo=el=>{ const R=App.wr; if(!R) return; const v=+el.dataset.v; if(v<0) return; if(v>=R.S.length) return A.wrClose(); wrShow(v); };
A.wrPause=()=>{ const R=App.wr; if(!R) return; R.paused=!R.paused; const b=document.querySelector('#wr-root [data-a="wrPause"]'); if(b){ b.textContent=R.paused?'▶':'❚❚'; b.setAttribute('aria-label',R.paused?'Play':'Pause'); } };
A.wrClose=()=>{ if(App.wrSt){ App.wrSt.destroy(); App.wrSt=null; } App.wr=null; const r=$('#wr-root'); if(r) r.remove(); document.body.classList.remove('locked'); };
document.addEventListener('keydown',e=>{ if(!App.wr) return; if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); A.wrClose(); } else if(e.key==='ArrowRight'){ e.preventDefault(); A.wrGo({dataset:{v:App.wr.i+1}}); } else if(e.key==='ArrowLeft'){ e.preventDefault(); A.wrGo({dataset:{v:App.wr.i-1}}); } else if(e.key===' '){ e.preventDefault(); A.wrPause(); } },true);

/* ---------- a shareable poster, drawn on a canvas ---------- */
function svgImg(svg,size){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); const s2=svg.includes('xmlns=')?svg:svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s2); }); }
A.wrSave=async()=>{ const R=App.wr; if(!R) return; const W=R.W; const me=Sx(App.C.userSid); const cv=document.createElement('canvas'); cv.width=1080; cv.height=1920; const g=cv.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,1920); bg.addColorStop(0,me.c1); bg.addColorStop(0.55,'#0a0e15'); bg.addColorStop(1,'#05070b'); g.fillStyle=bg; g.fillRect(0,0,1080,1920);
  g.globalAlpha=0.08; for(let i=0;i<14;i++){ g.fillStyle=i%2?me.c2:'#ffffff'; g.fillRect(i*80-200,0,40,1920); } g.globalAlpha=1;
  const lg=await svgImg(logo(me,360),360); if(lg) g.drawImage(lg,360,120,360,360);
  const fit=(txt,x,y,px,maxW,font)=>{ let f=px; g.font=font.replace('PX',f+'px'); while(g.measureText(txt).width>maxW&&f>20){ f-=4; g.font=font.replace('PX',f+'px'); } g.fillText(txt,x,y); };
  g.textAlign='center'; g.fillStyle='#ffffff'; fit(me.name.toUpperCase(),540,560,46,940,'800 PX "Big Shoulders Display","Arial Narrow",sans-serif');
  g.fillStyle='#ffd36b'; fit(`${W.yr} WRAPPED`,540,720,150,940,'900 PX "Big Shoulders Display","Arial Narrow",sans-serif');
  const box=(y,big,small)=>{ g.fillStyle='rgba(255,255,255,.07)'; g.beginPath(); g.roundRect?g.roundRect(120,y,840,190,36):g.rect(120,y,840,190); g.fill(); g.fillStyle='#ffffff'; fit(big,540,y+105,96,780,'900 PX "Big Shoulders Display","Arial Narrow",sans-serif'); g.fillStyle='#b8c4d4'; fit(small,540,y+158,34,780,'600 PX "Barlow Semi Condensed",Arial,sans-serif'); };
  box(800,`${wrOrd(W.pos)} PLACE`,`League finish · ${W.row.w}W ${W.row.d}D ${W.row.l}L · ${W.row.pts} pts`);
  box(1020,`${W.all.gf} GOALS`,`${W.all.cs} clean sheets · ${W.all.w}-${W.all.d}-${W.all.l} in all competitions`);
  if(W.top) box(1240,`${W.top.g} · ${W.top.p.ln.toUpperCase()}`,`Top scorer${W.top.a?` · ${W.top.a} assists`:''}`);
  if(W.moment) box(1460,W.moment.label.toUpperCase(),`${W.moment.pname} · ${W.moment.m}' vs ${(Sx(W.moment.opp)||{}).town||''}`);
  g.fillStyle='rgba(255,255,255,.55)'; g.font='700 30px "JetBrains Mono",monospace'; g.fillText('TOUCHLINE · VARSITY SOCCER MANAGER',540,1840);
  const name=`touchline-${String(me.town).toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${W.yr}-wrapped.png`;
  cv.toBlob(b=>{ if(!b){ toast('Could not create the image.'); return; } saveFile(name,b).then(r=>{ if(r==='saved') toast('Saved your Season Wrapped image.'); else if(r==='declined') toast('Save cancelled.'); else if(r==='unavailable') toast('Saving files is not available in this view.'); }); },'image/png'); };
/* hand a file to the viewer: through the claude.ai downloads capability when the page runs there, a plain download link otherwise */
async function saveFile(filename,data){ const W=window.claude; if(W&&typeof W.use==='function'){ try{ const dl=await W.use('downloads'); if(dl){ try{ const r=await dl.save({filename,data}); return r&&r.status==='delivered'?'saved':'saved'; }catch(e){ return e&&e.code==='declined'?'declined':e&&e.code==='rate_limited'?'busy':'unavailable'; } } }catch(e){} return 'unavailable'; }
  const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data])); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); return 'saved'; }

/* ---------- where to find it ---------- */
function wrBanner(){ const C=App.C; if(C.phase!=='offseason') return ''; const W=ensureWrapped(C,C.year); if(!W) return ''; const me=Sx(C.userSid); const seen=C.wrappedSeen&&C.wrappedSeen[C.year];
  return `<section class="wr-banner ${seen?'':'new'}" style="--c1:${me.c1};--c2:${me.c2}"><div class="wr-bn-cards" aria-hidden="true"><i></i><i></i><i></i></div><div class="grow"><span class="eyebrow">${seen?'Season Wrapped':'New · Season Wrapped'}</span><h3>Your ${C.year} season, wrapped</h3><p class="small">${wrOrd(W.pos)} in the league · ${W.all.w}-${W.all.d}-${W.all.l} · ${W.all.gf} goals${W.top?` · ${esc(W.top.p.ln)} led the way with ${W.top.g}`:''}</p></div><button class="btn pri" data-a="wrapped" data-yr="${C.year}">▶ Play the story</button></section>`; }
const _officeW=VIEWS.office; VIEWS.office=()=>wrBanner()+_officeW();
const _historyW=VIEWS.history; VIEWS.history=()=>{ const C=App.C; const yrs=Object.keys(C.wrapped||{}).map(Number).sort((a,b)=>b-a); const cur=C.phase==='offseason'&&!yrs.includes(C.year)?[C.year]:[];
  const list=[...cur,...yrs]; const card=list.length?`<div class="card wr-hist"><div class="hd"><h3>Season Wrapped</h3><span class="tiny muted">Every finished season as a story</span></div><div class="row">${list.map(y=>`<button class="btn" data-a="wrapped" data-yr="${y}">▶ ${y}</button>`).join('')}</div></div>`:'';
  return card+_historyW(); };
