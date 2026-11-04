/* ===================== v18.19 SEASON CALENDAR (screens) =====================
   VIEWS.calendar (Schedule menu): Month / Week / List, Varsity / JV / Modified, legend chips that filter the grid, the Open
   Week Planner (or its recap) and Season at a glance on the right. MODALS.v1819kPlan is the planner as a gate before Play.
   The Overview's "This week" row gets an open-week item. Identifiers v1819k / V1819K. */
ICON.v1819kcal='<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h0.5M8 17h2M12 17h2"/>';
TITLES.calendar='Season Calendar'; NAV_ICON.calendar='v1819kcal'; if(typeof NAV_DESC!=='undefined') NAV_DESC.calendar='Games, open week and school events by date';
{ const i=NAV.findIndex(n=>n[0]==='schedule'); if(!NAV.some(n=>n[0]==='calendar')) NAV.splice(i>=0?i+1:NAV.length,0,['calendar','Season Calendar']); }
{ const g=TOPNAV.find(t=>t[0]==='schedule'); if(g&&!g[3].includes('calendar')){ const j=g[3].indexOf('schedule'); g[3].splice(j>=0?j+1:g[3].length,0,'calendar'); } }
try{ if(typeof V1817O_MENU!=='undefined'&&V1817O_MENU.schedule&&!V1817O_MENU.schedule[0][1].includes('calendar')) V1817O_MENU.schedule[0][1].splice(1,0,'calendar'); }catch(e){}
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('calendar');

function v1819kWeekRange(dn){ const a=v1819kYmd(dn), b=v1819kYmd(dn+4); return a.m===b.m?`${V1819K.MON[a.m]} ${a.d}–${b.d}`:`${V1819K.MON[a.m]} ${a.d} – ${V1819K.MON[b.m]} ${b.d}`; }
function v1819kOpp(C,f){ return Sx(f.h===C.userSid?f.a:f.h); }
function v1819kRes(C,f){ if(f.st!=='d') return null; const u=C.userSid; const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; const r=f.w===u?'W':f.w?'L':'D'; return {r,sc:`${us}-${th}`+(f.pk?` (${f.h===u?f.pk[0]:f.pk[1]}-${f.h===u?f.pk[1]:f.pk[0]} p)`:'')}; }
function v1819kCompName(f){ try{ return fixtureLabel(f); }catch(e){ return ''; } }
/* one game chip (month cell) */
function v1819kChip(C,it,show){ const f=it.f; const o=v1819kOpp(C,f); const home=f.h===C.userSid; const res=v1819kRes(C,f); const riv=it.riv&&show.riv;
  const tag=`${home?'vs':'@'} ${esc(boardName(o))}`; const skip=f.st==='x';
  const tip=`${v1819kCompName(f)} · ${home?'vs':'at'} ${o.name||o.town} · ${it.sd.label}${res?` · ${res.r} ${res.sc}`:''}${it.heated?' · Rivalry game':''}`;
  return `<button class="v1819k-g ${res?'r'+res.r:skip?'skip':'up'} ${riv?'riv':''} ${f.comp!=='reg'?'c-'+f.comp:''}" data-a="openFixture" data-id="${f.id}" title="${esc(tip)}">${crest(o,22)}<span class="v1819k-gt"><b>${tag}${riv?' <i class="v1819k-fire" aria-label="Rivalry">🔥</i>':''}</b><small>${res?`${res.r} ${res.sc}`:skip?'Skipped':esc(it.sd.time)}</small></span><span class="v1819k-gdot">${res?res.r:''}</span></button>`; }
function v1819kFrChip(C,it){ const O=it.O; const s=v1819kOppSchool(C,it.opp); const r=O.done&&O.res&&O.res.r?`${O.res.r} ${O.res.gf}-${O.res.ga}`:'Friendly';
  return `<span class="v1819k-g fr ${O.done&&O.res?'r'+O.res.r:'up'}" title="${esc(`Open-week friendly at ${s.name||s.town}${O.done?'':' (planned)'}`)}">${crest(s,22)}<span class="v1819k-gt"><b>@ ${esc(boardName(s))}</b><small>${r}</small></span><span class="v1819k-gdot">F</span></span>`; }
function v1819kEvChip(it){ return `<span class="v1819k-ev k-${it.k}" title="${esc(it.t+': '+it.tip)}" tabindex="0"><i>${it.ico}</i><span>${esc(it.t)}</span></span>`; }
function v1819kPostChip(it){ return `<span class="v1819k-ev k-post" title="${esc(it.t+' (your school plays only if it gets there)')}" tabindex="0"><i>🏆</i><span>${esc(it.t)}</span></span>`; }
function v1819kVisible(it,show){ if(it.kind==='game'||it.kind==='friendly') return !!show.game; if(it.kind==='open') return !!show.open; if(it.kind==='ev'||it.kind==='post') return !!show.ev; return true; }
function v1819kCell(C,items,show){ return items.map(it=>it.kind==='game'?v1819kChip(C,it,show):it.kind==='friendly'?v1819kFrChip(C,it):it.kind==='ev'&&!it.bar?v1819kEvChip(it):it.kind==='post'?v1819kPostChip(it):'').join(''); }

/* ---------- month ---------- */
function v1819kMonth(C,items,show,m,today){ const y=C.year; const first=v1819kDn(y,m,1), last=v1819kDn(y,m+1,1)-1; let s=first-v1819kYmd(first).dow; const rows=[];
  const byDay=new Map(); for(const it of items){ if(!v1819kVisible(it,show)) continue; if(it.kind==='open'||it.bar) continue; (byDay.get(it.dn)||byDay.set(it.dn,[]).get(it.dn)).push(it); }
  const spans=items.filter(it=>v1819kVisible(it,show)&&(it.kind==='open'||it.bar));
  while(s<=last){ const cells=[]; for(let i=0;i<7;i++){ const dn=s+i; const t=v1819kYmd(dn); const out=t.m!==m; const isT=dn===today; const list=out?[]:(byDay.get(dn)||[]);
      cells.push(`<div class="v1819k-day ${out?'out':''} ${isT?'today':''} ${i===0||i===6?'we':''}" data-dn="${dn}"><div class="v1819k-dh"><span class="v1819k-dnum">${t.d}</span>${isT?'<span class="v1819k-tag">Today</span>':''}</div><div class="v1819k-dc">${v1819kCell(C,list,show)}</div></div>`); }
    let ov=''; for(const sp of spans){ const a=Math.max(sp.dn,s,first), b=Math.min(sp.dn2,s+6,last); if(a>b) continue; const c0=a-s, n=b-a+1; const st=`left:calc(${c0}/7*100% + 3px);width:calc(${n}/7*100% - 6px)`;
      if(sp.kind==='open'){ const O=sp.O; const lab=O.done&&O.res?`Open week · ${v1819kOpt(O.pick).t}`:'Open week · No league games'; ov+=`<div class="v1819k-band ${O.done?'done':''}" style="${st}" title="${esc('The whole league is off this week.'+(O.pick?' Plan: '+v1819kOpt(O.pick).t:''))}"><span>◆ ${esc(lab)}</span></div>`; }
      else ov+=`<div class="v1819k-bar k-${sp.k}" style="${st}" title="${esc(sp.t+': '+sp.tip)}" tabindex="0"><i>${sp.ico}</i><span>${esc(sp.t)}</span></div>`; }
    rows.push(`<div class="v1819k-row">${ov}${cells.join('')}</div>`); s+=7; }
  return `<div class="v1819k-month"><div class="v1819k-dows">${V1819K.DOW.map((d,i)=>`<span class="${i===0||i===6?'we':''}">${d}</span>`).join('')}</div>${rows.join('')}</div>`; }
/* ---------- week ---------- */
function v1819kWeekView(C,items,show,s,today){ const cols=[]; const O=v1819kOW(C);
  for(let i=0;i<7;i++){ const dn=s+i; const t=v1819kYmd(dn); const isT=dn===today; const its=items.filter(it=>v1819kVisible(it,show)&&(it.dn===dn||(it.dn2!=null&&it.dn<=dn&&it.dn2>=dn)));
    const body=its.map(it=>{ if(it.kind==='game'){ const f=it.f, o=v1819kOpp(C,f), res=v1819kRes(C,f), home=f.h===C.userSid; const riv=it.riv&&show.riv;
        return `<button class="v1819k-wg ${res?'r'+res.r:'up'} ${riv?'riv':''}" data-a="openFixture" data-id="${f.id}">${crest(o,40)}<span><small>${esc(v1819kCompName(f))}${riv?' · 🔥 Rivalry':''}</small><b>${home?'vs':'at'} ${esc(o.town)}</b><em>${esc(f.ven||'')}</em><span class="v1819k-wr">${res?`<i>${res.r}</i> ${res.sc}`:f.st==='x'?'Skipped':esc(it.sd.time)}</span></span></button>`; }
      if(it.kind==='friendly'){ const s2=v1819kOppSchool(C,it.opp); const R=it.O.done&&it.O.res; return `<div class="v1819k-wg fr ${R?'r'+R.r:'up'}">${crest(s2,40)}<span><small>Open-week friendly</small><b>at ${esc(s2.town)}</b><em>${esc(s2.section||'')}</em><span class="v1819k-wr">${R?`<i>${R.r}</i> ${R.gf}-${R.ga}`:'Planned · 4:00 PM'}</span></span></div>`; }
      if(it.kind==='open') return `<div class="v1819k-wo"><b>◆ Open week</b><small>No league games${O.pick?` · ${esc(v1819kOpt(O.pick).t)}`:''}</small></div>`;
      if(it.kind==='post') return `<div class="v1819k-we k-post"><i>🏆</i><span><b>${esc(it.t)}</b><small>If you get there</small></span></div>`;
      return `<div class="v1819k-we k-${it.k}"><i>${it.ico}</i><span><b>${esc(it.t)}</b><small>${esc(it.tip)}</small></span></div>`; }).join('');
    cols.push(`<div class="v1819k-wcol ${isT?'today':''}"><div class="v1819k-wh"><span>${V1819K.DOW[t.dow]}</span><b>${t.d}</b>${isT?'<i>Today</i>':''}</div><div class="v1819k-wb">${body||'<span class="v1819k-none">—</span>'}</div></div>`); }
  return `<div class="v1819k-week">${cols.join('')}</div>`; }
/* ---------- list ---------- */
function v1819kList(C,items,show,today){ let cur=-1, h=''; let mark=false;
  for(const it of items){ if(!v1819kVisible(it,show)) continue; const t=v1819kYmd(it.dn); if(t.m!==cur){ cur=t.m; h+=`<h3 class="v1819k-lm">${V1819K.MONL[t.m]}</h3>`; }
    if(!mark&&it.dn>=today){ mark=true; h+=`<div class="v1819k-lnow"><span>Today · ${v1819kFmt(today)}</span></div>`; }
    const date=`<span class="v1819k-ld ${it.dn===today?'today':''}"><small>${V1819K.DOW[t.dow]}</small><b>${t.d}</b></span>`;
    if(it.kind==='game'){ const f=it.f, o=v1819kOpp(C,f), res=v1819kRes(C,f), home=f.h===C.userSid; const riv=it.riv&&show.riv;
      h+=`<button class="v1819k-li g ${res?'r'+res.r:''} ${riv?'riv':''}" data-a="openFixture" data-id="${f.id}">${date}${crest(o,32)}<span class="v1819k-lt"><b>${home?'vs':'at'} ${esc(o.town)}${riv?' 🔥':''}</b><small>${esc(v1819kCompName(f))} · ${esc(it.sd.time)}</small></span><span class="v1819k-lr">${res?`<i>${res.r}</i>${res.sc}`:f.st==='x'?'Skipped':'<em>Upcoming</em>'}</span></button>`; }
    else if(it.kind==='friendly'){ const s2=v1819kOppSchool(C,it.opp); const R=it.O.done&&it.O.res; h+=`<div class="v1819k-li g fr ${R?'r'+R.r:''}">${date}${crest(s2,32)}<span class="v1819k-lt"><b>at ${esc(s2.town)}</b><small>Open-week friendly · ${esc(s2.section||'outside the section')}</small></span><span class="v1819k-lr">${R?`<i>${R.r}</i>${R.gf}-${R.ga}`:'<em>Planned</em>'}</span></div>`; }
    else if(it.kind==='open'){ const O=it.O; h+=`<div class="v1819k-li open">${date}<span class="v1819k-li-ico">◆</span><span class="v1819k-lt"><b>Open week · No league games</b><small>${v1819kWeekRange(it.dn)}${O.legacy?'':O.done?` · ${esc(v1819kOpt(O.pick).t)}`:O.pick?` · Plan: ${esc(v1819kOpt(O.pick).t)}${O.locked?' (locked in)':''}`:' · Nothing planned yet'}</small></span>${!O.done&&v1819kUpcoming(C)?'<button class="btn sm" data-a="v1819kOpenPlan">Plan</button>':''}</div>`; }
    else if(it.kind==='post') h+=`<div class="v1819k-li post">${date}<span class="v1819k-li-ico">🏆</span><span class="v1819k-lt"><b>${esc(it.t)}</b><small>Postseason · if you get there</small></span></div>`;
    else h+=`<div class="v1819k-li ev k-${it.k}">${date}<span class="v1819k-li-ico">${it.ico}</span><span class="v1819k-lt"><b>${esc(it.t)}${it.dn2?` <em>${v1819kWeekRange(it.dn)}</em>`:''}</b><small>${esc(it.tip)}</small></span></div>`; }
  if(!mark) h+=`<div class="v1819k-lnow"><span>Today · ${v1819kFmt(today)}</span></div>`;
  return `<div class="v1819k-list">${h}</div>`; }

/* ---------- side: planner / recap ---------- */
function v1819kPlanBody(C,inModal){ const O=v1819kOW(C); const dn=v1819kOpenDn(C.year); const pend=v1819kPending(C);
  if(O.legacy) return '';
  if(O.done){ const o=v1819kOpt(O.pick); const res=O.res||{lines:[],ps:[]}; const tmp=v1819kS(C).fx.filter(e=>e.why===O.pick||e.why==='knock');
    const ps=(res.ps||[]).filter(x=>!x.tmp).slice(0,6).map(x=>{ const p=C.players[x.pid]; return p?`<li>${portraitSVG(p,28)}<span>${esc(pname(p))} <small>${p.pos} · ${LVL_NAME[p.lvl]||p.lvl}</small></span><b>+${(+x.d).toFixed(x.d<0.1?2:1)}</b></li>`:''; }).join('');
    return `<div class="v1819k-recap"><div class="v1819k-ph"><span class="v1819k-kick">Open week · ${v1819kWeekRange(dn)}</span><h3>${o.ico} ${esc(o.k==='friendly'&&res.opp?`Friendly at ${res.opp.town}`:o.t)}</h3></div>
      <ul class="v1819k-lines">${res.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>${ps?`<ul class="v1819k-gains">${ps}</ul>`:''}
      ${tmp.length?`<p class="v1819k-still">Still active: ${tmp.filter(e=>e.amt>0).length?`+${(tmp.find(e=>e.amt>0)||{}).amt.toFixed(1)} on ${tmp.filter(e=>e.amt>0).length} players for ${Math.max(...tmp.filter(e=>e.amt>0).map(e=>e.left))} more game${Math.max(...tmp.filter(e=>e.amt>0).map(e=>e.left))===1?'':'s'}`:''}${tmp.some(e=>e.amt<0)?`${tmp.some(e=>e.amt>0)?' · ':''}a knock (${tmp.filter(e=>e.amt<0).map(e=>esc(pname(C.players[e.pid]))).join(', ')})`:''}</p>`:'<p class="v1819k-still done">Effects applied.</p>'}${O.auto?'<p class="v1819k-auto">Nothing was locked in, so the coaches gave everyone the week off.</p>':''}
      ${inModal?`<div class="v1819k-pf"><button class="btn primary" data-a="v1819kGo">Continue to Matchday ${V1819K.OPEN_AFTER+1}</button></div>`:''}</div>`; }
  const opp=v1819kFriendlyOpp(C); const os=v1819kOppSchool(C,opp);
  const cards=V1819K_OPTS.map(o=>{ const on=O.pick===o.k; const t=o.k==='friendly'?`Friendly vs ${esc(opp.town)}`:esc(o.t);
    return `<button class="v1819k-opt ${on?'on':''}" data-a="v1819kPick" data-k="${o.k}" aria-pressed="${on}"><span class="v1819k-oi">${o.k==='friendly'?crest(os,34):o.ico}</span><span class="v1819k-ot"><b>${t}</b><small>${esc(o.d)}${o.k==='friendly'&&opp.sec?` ${esc(os.section||'')}, rated ${(+opp.R).toFixed(1)}.`:''}</small><span class="v1819k-tags">${o.tags.map(([x,c])=>`<i class="${c}">${esc(x)}</i>`).join('')}</span></span><span class="v1819k-ck" aria-hidden="true">${on?'✓':''}</span></button>`; }).join('');
  const note=pend?'This is the open week. Lock it in and the week plays out.':O.locked?`Locked in. You can change this until Monday morning (${v1819kFmt(dn)}).`:`You can change this until Monday morning (${v1819kFmt(dn)}).`;
  return `<div class="v1819k-plan"><div class="v1819k-ph"><span class="v1819k-kick">Open week planner · ${v1819kWeekRange(dn)}</span><h3>The whole league is off.</h3><p>Pick one thing for your team.</p></div>
    <div class="v1819k-opts">${cards}</div><div class="v1819k-pf"><small>${note}</small><button class="btn ${O.locked&&!pend?'':'primary'}" data-a="v1819kLock" ${O.pick?'':'disabled'}>${O.locked&&!pend?'✓ Locked in':'Lock it in'}</button></div></div>`; }
/* ---------- season at a glance ---------- */
function v1819kGlance(C){ const u=C.userSid; const O=v1819kOW(C); const fx=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.lvl==='V'&&(f.h===u||f.a===u));
  const reg=fx.filter(f=>f.comp==='reg').sort((a,b)=>a.rd-b.rd); const post=fx.filter(f=>!f.lpo&&['sec','rgn','st'].includes(f.comp)).sort((a,b)=>fxOrder(a)-fxOrder(b));
  let w=0,d=0,l=0; for(const f of [...reg,...post]){ const r=v1819kRes(C,f); if(!r) continue; if(r.r==='W') w++; else if(r.r==='L') l++; else d++; }
  const left=reg.filter(f=>f.st==='s').length;
  const pip=f=>{ const r=v1819kRes(C,f); const o=v1819kOpp(C,f); return `<button class="v1819k-pip ${r?'r'+r.r:''}" data-a="openFixture" data-id="${f.id}" title="${esc(`${v1819kCompName(f)}: ${f.h===u?'vs':'at'} ${o.town}${r?` · ${r.r} ${r.sc}`:''}`)}">${r?r.r:''}</button>`; };
  let pips=''; reg.forEach((f,i)=>{ pips+=pip(f); if(f.rd===V1819K.OPEN_AFTER-1) pips+=`<span class="v1819k-pip ow ${O.done?'done':''}" title="Open week">◆</span>`; });
  const P=C.post||{}; const reached=k=>post.some(f=>f.comp===k); const won=k=>post.some(f=>f.comp===k&&f.w===u&&(k==='rgn'||f.rd===2));
  const chip=(k,t)=>`<span class="v1819k-pc ${won(k)?'won':reached(k)?'in':''}">${t}${won(k)?' ✓':''}</span>`;
  const secp=post.filter(f=>f.comp==='sec').map(pip).join('');
  return `<section class="v1819k-glance"><div class="v1819k-gh"><h3>Season at a glance</h3><span>${w}–${d}–${l} so far · ${left} game${left===1?'':'s'} to go</span></div>
    <div class="v1819k-pips">${pips}</div><div class="v1819k-pips post">${chip('sec','Sectionals')}${secp}${chip('rgn','Regional')}${chip('st','State')}</div>
    <div class="v1819k-key"><span><i class="rW"></i>Win</span><span><i class="rD"></i>Draw</span><span><i class="rL"></i>Loss</span><span><i class="ow">◆</i>Open week</span><span><i></i>To play</span></div></section>`; }

/* ---------- the page ---------- */
VIEWS.calendar=()=>{ const C=App.C; const S=v1819kS(C); const show=S.show; const lvl=['V','JV','MOD'].includes(App.params.clvl)?App.params.clvl:'V';
  const view=['month','week','list'].includes(App.params.cv)?App.params.cv:(window.innerWidth<=600?'list':'month');
  const items=v1819kItems(C,C.year,lvl); const today=v1819kToday(C); const tt=v1819kYmd(today);
  let m=App.params.cm!=null?+App.params.cm:Math.max(7,Math.min(10,tt.m)); m=Math.max(7,Math.min(10,m));
  const w0=App.params.cw!=null?+App.params.cw:today-tt.dow;
  let title, body, prevOk=true, nextOk=true;
  if(view==='month'){ title=`${V1819K.MONL[m]} <em>${C.year}</em>`; body=v1819kMonth(C,items,show,m,today); prevOk=m>7; nextOk=m<10; }
  else if(view==='week'){ const a=v1819kYmd(w0), b=v1819kYmd(w0+6); title=a.m===b.m?`${V1819K.MON[a.m]} ${a.d}–${b.d}`:`${V1819K.MON[a.m]} ${a.d} – ${V1819K.MON[b.m]} ${b.d}`; body=v1819kWeekView(C,items,show,w0,today); prevOk=w0>v1819kWk(C.year,-2); nextOk=w0<v1819kWk(C.year,13); }
  else { title=`The ${C.year} season`; body=v1819kList(C,items,show,today); prevOk=nextOk=false; }
  const chip=(k,t,ic)=>`<button class="v1819k-lg k-${k} ${show[k]?'on':''}" data-a="v1819kToggle" data-k="${k}" aria-pressed="${!!show[k]}"><i>${ic}</i>${t}</button>`;
  const nav=view==='list'?'':`<div class="v1819k-nav"><button class="v1819k-arr" data-a="v1819kStep" data-d="-1" ${prevOk?'':'disabled'} aria-label="Previous">${icon('chevl',18)}</button><button class="btn sm ghost" data-a="v1819kToday">Today</button><button class="v1819k-arr" data-a="v1819kStep" data-d="1" ${nextOk?'':'disabled'} aria-label="Next">${icon('chev',18)}</button></div>`;
  const vseg=`<div class="seg v1819k-vs" role="group">${[['month','Month'],['week','Week'],['list','List']].map(([v,l])=>`<button class="${v===view?'on':''}" aria-pressed="${v===view}" data-a="v1819kView" data-v="${v}">${l}</button>`).join('')}</div>`;
  const lseg=`<div class="seg v1819k-ls" role="group">${[['V','Varsity'],['JV','JV'],['MOD','Modified']].map(([v,l])=>`<button class="${v===lvl?'on':''}" aria-pressed="${v===lvl}" data-a="setParam" data-k="clvl" data-v="${v}">${l}</button>`).join('')}</div>`;
  const plan=v1819kPlanBody(C,false);
  return `<div class="v1819k v1819k-v-${view}"><section class="v1819k-main"><div class="v1819k-top"><div class="v1819k-ttl"><span class="v1819k-kick">${esc(Sx(C.userSid).town)} · ${LVL_NAME[lvl]||lvl} · Section ${C.section}</span><h2>${title}</h2></div><div class="v1819k-ctl">${nav}${vseg}${lseg}</div></div>
    <div class="v1819k-legend">${chip('game','Game','⚽')}${chip('open','Open week','◆')}${chip('ev','School events','🏫')}${chip('riv','Rivalry','🔥')}<span class="v1819k-today-l">Today: <b>${v1819kFmt(today)}</b></span></div>
    <div class="v1819k-card">${body}</div></section>
    <aside class="v1819k-side">${plan?`<section class="v1819k-pcard">${plan}</section>`:''}${v1819kGlance(C)}</aside></div>`; };
A.v1819kView=el=>{ App.params.cv=el.dataset.v; App.keepScroll=true; render(); };
A.v1819kStep=el=>{ const C=App.C; const d=+el.dataset.d; const today=v1819kToday(C); const tt=v1819kYmd(today); const view=App.params.cv||(window.innerWidth<=600?'list':'month');
  if(view==='week'){ const w0=App.params.cw!=null?+App.params.cw:today-tt.dow; App.params.cw=String(w0+7*d); }
  else { const m=App.params.cm!=null?+App.params.cm:Math.max(7,Math.min(10,tt.m)); App.params.cm=String(Math.max(7,Math.min(10,m+d))); }
  App.keepScroll=true; render(); };
A.v1819kToday=()=>{ delete App.params.cm; delete App.params.cw; App.keepScroll=true; render(); };
A.v1819kToggle=el=>{ const C=App.C; const S=v1819kS(C); const k=el.dataset.k; S.show[k]=S.show[k]?0:1; queueSave(); App.keepScroll=true; render(); };
function v1819kRefresh(){ if(App.modal&&App.modal.type==='v1819kPlan') renderModal(); App.keepScroll=true; render(); }
A.v1819kPick=el=>{ const C=App.C; const O=v1819kOW(C); if(O.done) return; O.pick=el.dataset.k; O.locked=false; queueSave(); v1819kRefresh(); };
A.v1819kLock=()=>{ const C=App.C; const O=v1819kOW(C); if(O.done||!O.pick) return; O.locked=true;
  if(v1819kPending(C)){ v1819kResolve(C,'lock'); App.odds.clear(); toast(`Open week: ${v1819kOpt(O.pick).t}. ${O.res&&O.res.lines[0]||''}`); }
  else toast(`${v1819kOpt(O.pick).t} is locked in for the open week.`);
  queueSave(); v1819kRefresh(); };
A.v1819kOpenPlan=()=>{ App.modal={type:'v1819kPlan'}; renderModal(); };
A.v1819kGo=()=>{ App.modal=null; renderModal(); render(); A.playNext(); };
MODALS.v1819kPlan=m=>{ const C=App.C; const b=v1819kPlanBody(C,true)||'<div class="empty">There is no open week left this season.</div>'; return modalShell('Open week',b,'','v1819k-modal'); };
/* Play: the planner first when the open week is here and nothing is locked in */
{ const _pn=A.playNext; A.playNext=function(){ const C=App.C;
    try{ if(C&&v1819kPending(C)){ const O=v1819kOW(C); if(!O.locked){ App.modal={type:'v1819kPlan'}; renderModal(); return; } v1819kResolve(C,'lock'); App.odds.clear(); queueSave(); toast(`Open week: ${v1819kOpt(O.pick).t}. ${O.res&&O.res.lines[0]||''}`); } }catch(e){ console.warn('open week',e); }
    return _pn.apply(this,arguments); }; }
{ const _pl=playLabel; playLabel=function(C){ try{ if(C&&v1819kPending(C)&&!v1819kOW(C).locked) return 'Plan the open week'; }catch(e){} return _pl.apply(this,arguments); }; }
/* Overview: an item in the "This week" row */
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ const C=App.C; if(!C||!v1819kUpcoming(C)) return h; if(C.phase!=='regular'||C.md<V1819K.OPEN_AFTER-3) return h;
    const O=v1819kOW(C); const pend=v1819kPending(C); const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items'); if(!box) return h;
    const cl=box.querySelector('.v1817o-clear'); if(cl) cl.remove();
    const b=document.createElement('button'); b.className='dec v1819k-dec'+(O.locked?' ok':''); b.dataset.a='v1819kOpenPlan';
    const range=v1819kWeekRange(v1819kOpenDn(C.year)); const left=V1819K.OPEN_AFTER-C.md;
    b.innerHTML=`<span class="dec-ico">${O.locked?'✓':'🗓️'}</span><span class="grow"><b>${O.locked?`Open week: ${esc(v1819kOpt(O.pick).t)}`:pend?'Open week: pick a plan':'Plan the open week'}</b><small>${pend?`This week · ${range} · no league games`:`${range} · after ${left} more game${left===1?'':'s'}`}${O.locked?' · locked in':''}</small></span><span class="dec-go"></span>`;
    box.prepend(b); return t.innerHTML; }catch(e){ console.warn('calendar overview',e); return h; } }; }
