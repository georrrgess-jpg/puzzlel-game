/* ===================== v18.12 TRYOUTS & CUT DAY: the screen (v1812t) =====================
   Route 'tryouts' (Squad menu): week header with the day stepper, a sticky counters bar (Varsity / JV / Modified / Cut /
   Undecided with roster-limit warnings), the player cards (portrait, OVR range, stars, four drill tiles, a Varsity | JV |
   Modified | Cut control), the roster sheet on the gym door, and the explainers. Posting opens the door scene
   (97_tryouts_scene.js). The Overview gets a "Tryout week" card; playing the Preseason Cup without finishing the tryouts
   asks first when the coach has started them, and quietly lets the staff post the list when he never opened them. */
const V1812T_UI={freshDay:0,freshUntil:0,running:null,undo:null,then:null};
const V1812T_LVL={V:'Varsity',JV:'JV',MOD:'Modified',X:'Cut'};
const V1812T_KIND={move:['Move-in','mv'],walk:['Walk-on','wk'],back:['Comeback','bk'],fresh:['New this year','fr']};
const V1812T_DAYTAG=['SIGN-UPS','SPRINT & JUGGLING','BEEP TEST & POSITION DRILLS','FINAL SCRIMMAGE'];
ICON.tryouts='<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h7M9 15.5h7M9 19h4"/><circle cx="11.5" cy="11.6" r="3.2" stroke-width="1.5"/>';
ICON.flag=ICON.flag||'<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>';
NAV_ICON.tryouts='tryouts'; TITLES.tryouts='Tryouts & Cut Day';
if(typeof NAV_DESC!=='undefined') NAV_DESC.tryouts='Preseason drills and the roster on the gym door';
if(typeof TOPNAV!=='undefined'){ const g=TOPNAV.find(t=>t[0]==='squads'); if(g&&!g[3].includes('tryouts')) g[3].splice(1,0,'tryouts'); }
{ const i=NAV.findIndex(x=>x[0]==='squads'); if(i>=0&&!NAV.some(x=>x[0]==='tryouts')) NAV.splice(i+1,0,['tryouts','Tryouts & Cut Day']); }
const _v1812tBadges=navBadges; navBadges=function(C){ const b=_v1812tBadges.apply(this,arguments); try{ if(v1812tIsOpen(C)) b.tryouts='NEW'; }catch(e){} return b; };

const v1812tSave=()=>{ try{ queueSave(); }catch(e){} };
const v1812tIc=k=>icon(k,16);
function v1812tPos(p){ return `<span class="pos ${p.pos}">${p.pos}</span>`; }
function v1812tStars(v){ const a=v.slo, b=v.shi; return `<span class="v1812t-stars" role="img" aria-label="${a===b?a:a+' to '+b} of 5 stars of potential">${'★'.repeat(a)}<i class="u">${'★'.repeat(b-a)}</i><i class="e">${'★'.repeat(5-b)}</i></span>`; }
function v1812tCountUp(root){ if(typeof reducedMotion==='function'&&reducedMotion()) return; (root||document).querySelectorAll('[data-count]').forEach(el=>{ const to=+el.dataset.count, dec=+el.dataset.dec||0, suf=el.dataset.suf||''; const t0=performance.now()+(+el.dataset.delay||0), dur=620;
  const step=t=>{ if(!el.isConnected) return; const k=Math.max(0,Math.min(1,(t-t0)/dur)); const e=1-Math.pow(1-k,3); el.textContent=(to*e).toFixed(dec)+suf; if(k<1) requestAnimationFrame(step); else el.textContent=to.toFixed(dec)+suf; };
  el.textContent=(0).toFixed(dec)+suf; requestAnimationFrame(step); }); }

/* ---------- one candidate's card ---------- */
function v1812tCard(C,v,plan){
  const p=v.p, id=v.id, code=v.code, T=C.tryout, day=Math.min(3,T.day|0);
  const km=V1812T_KIND[v.kind]; const sug=plan?plan[id]:null; const hot=V1812T_UI.freshDay&&performance.now()<V1812T_UI.freshUntil;
  const gaps=Math.round((v.hi-v.lo)); const pctL=clamp((v.lo-20)/79*100,0,100), pctW=Math.max(2.5,(v.hi-v.lo)/79*100);
  const rng=day>=3&&v.hi-v.lo<=0?`${v.lo}`:`${v.lo}–${v.hi}`;
  const tile=(k,lab,i)=>{ const d=v.drills.find(x=>x.k===k); if(!d) return `<div class="v1812t-dt pend" title="${esc(lab)}: not run yet"><span class="l">${lab}</span><b class="mono">—</b><i class="bar"><u></u></i></div>`;
    const fresh=hot&&V1812T_UI.freshDay===d.day; const num=k!=='scr'; const dec=k==='spr'?2:k==='beep'?1:0; const raw=k==='spr'?d.val:k==='beep'?d.val:d.val;
    return `<div class="v1812t-dt ${fresh?'new':''}" style="--d:${i*80}ms;--bc:${badgeColor(35+d.bar*60)}" title="${esc(lab)}"><span class="l">${lab}</span><b class="mono" ${fresh&&num?`data-count="${(+raw).toFixed(dec)}" data-dec="${dec}" data-suf="${k==='spr'?' s':''}" data-delay="${i*80}"`:''}>${d.txt}</b><i class="bar"><u style="width:${(d.bar*100).toFixed(0)}%"></u></i></div>`; };
  const pd=v.drills.find(x=>x.k==='pos');
  const seg=['V','JV','MOD','X'].map(c=>{ const dis=c!=='X'&&!v.elig[c]; const on=code===c; return `<button type="button" class="c-${c} ${on?'on':''}" data-a="v1812tSeg" data-id="${id}" data-code="${c}" aria-pressed="${on}" ${dis?`disabled title="Grade ${p.grade} players are not eligible for ${V1812T_LVL[c]}"`:''}>${V1812T_LVL[c]}</button>`; }).join('');
  const now=v.ret?`<span class="v1812t-now" title="Where he played last season">Now: ${V1812T_LVL[p.lvl]}</span>`:(v.kind==='back'&&v.mem?`<span class="v1812t-now" title="His rating on the day he was cut">Was ${Math.round(v.mem.ovr)} when cut</span>`:'');
  const sugg=day>=1&&sug&&code&&sug!==code?`<span class="v1812t-sug" title="Auto-sort would put him here">Auto: ${V1812T_LVL[sug]}</span>`:'';
  return `<article class="v1812t-card ${v.kind==='ret'?'':'newc'} ${code==='X'?'is-cut':''} ${code?'':'undec'} ${v.tag?'tagged':''}" data-id="${id}" data-code="${code||''}" data-kind="${v.kind}" aria-label="${esc(pname(p))}">
   <header class="v1812t-top"><span class="v1812t-face">${portraitSVG(p,64)}</span>
    <div class="v1812t-id"><h4 class="v1812t-name">${esc(p.fn)} ${esc(p.ln)}</h4><div class="v1812t-sub">${v1812tPos(p)}<span>Grade ${p.grade}</span>${p.num?`<span class="mono">#${p.num}</span>`:''}${km?`<span class="v1812t-kind k-${km[1]}">${km[0]}</span>`:''}${v.kind==='back'&&v.info.brk?'<span class="v1812t-kind k-rem">He remembers</span>':''}</div><p class="v1812t-story">${esc(v.story)}</p></div>
    <div class="v1812t-side">${v1812tStars(v)}<button type="button" class="v1812t-tagbtn ${v.tag?'on':''}" data-a="v1812tTag" data-id="${id}" aria-pressed="${v.tag}" aria-label="${v.tag?'Remove tag from':'Tag'} ${esc(pname(p))}" title="Tag to watch">${icon('flag',15)}</button></div></header>
   <div class="v1812t-ovr"><span class="lab">OVR</span><b class="mono v1812t-rng" style="color:${badgeColor(v.mid)}" aria-label="Overall rating ${v.hi>v.lo?'between '+v.lo+' and '+v.hi:v.lo}">${rng}</b><span class="v1812t-track" aria-hidden="true"><i style="left:${pctL.toFixed(1)}%;width:${pctW.toFixed(1)}%;background:${badgeColor(v.mid)}"></i></span><small>${day>=3?'final read':day===0?'wide open':`narrowing (${gaps})`}</small>${now}${sugg}</div>
   <div class="v1812t-drills">${tile('spr','40-yd sprint',0)}${tile('jug','Juggling',1)}${tile('beep','Beep test',2)}${tile('scr','Scrimmage',3)}</div>
   ${pd?`<div class="v1812t-pd ${hot&&V1812T_UI.freshDay===2?'new':''}"><span>${esc(pd.lab)}</span><i class="bar"><u style="width:${(pd.bar*100).toFixed(0)}%;background:${badgeColor(35+pd.bar*60)}"></u></i><b class="mono">${pd.txt}</b></div>`:''}
   <div class="v1812t-seg" role="group" aria-label="Place ${esc(pname(p))}">${seg}</div></article>`; }

/* ---------- counters bar ---------- */
function v1812tBar(C){ const chk=v1812tCheck(C); const n=chk.n; const T=C.tryout;
  const cell=(l,lab)=>{ const cap=V1812T.caps[l], c=n[l], mn=V1812T.mins[l]; const cls=c>cap?'over':c<mn?'under':c===cap?'full':'ok'; return `<div class="v1812t-ct ${cls}" title="${lab}: ${c} of ${cap} (at least ${mn})"><span class="lab">${lab}</span><b class="mono">${c}<small>/${cap}</small></b><i style="--f:${Math.min(1,c/cap).toFixed(3)}"></i></div>`; };
  const chips=[...chk.errors.map(e=>`<span class="v1812t-chip bad">${esc(e.msg)}</span>`),...chk.warns.map(e=>`<span class="v1812t-chip warn">${esc(e.msg)}</span>`)].join('');
  return `<div class="v1812t-bar" id="v1812t-bar" role="region" aria-label="Roster counters" aria-live="polite"><div class="v1812t-bar-in">
    <div class="v1812t-cts">${cell('V','Varsity')}${cell('JV','JV')}${cell('MOD','Modified')}<div class="v1812t-ct cutc"><span class="lab">Cut</span><b class="mono">${n.X}</b></div><div class="v1812t-ct ${n.U?'under':'ok'}"><span class="lab">Undecided</span><b class="mono">${n.U}</b></div></div>
    <div class="v1812t-bar-acts"><button class="btn sm" data-a="v1812tAuto" title="Suggest a roster from what the drills have shown so far">Auto-sort</button>${V1812T_UI.undo&&V1812T_UI.undo.k===C.seed+':'+C.year?`<button class="btn sm ghost" data-a="v1812tUndo">Undo auto-sort</button>`:''}<button class="btn pri ${chk.ok?'':'dim'}" data-a="v1812tPostAsk" ${chk.ok?'':'aria-disabled="true"'}>${chk.ok?'Post the roster':'Post the roster…'}</button></div></div>
    ${chips?`<div class="v1812t-chips">${chips}</div>`:''}</div>`; }

/* ---------- the day header and the stepper ---------- */
function v1812tStandouts(C,day){ if(day<1) return []; const raw=v1812tAllRaw(C); const ids=Object.keys(raw); if(!ids.length) return [];
  const best=(f,cmp)=>ids.reduce((a,id)=>(a==null||cmp(f(raw[id]),f(raw[a])))?id:a,null); const nm=id=>{ const p=v1812tFind(C,id); return p?p.fn[0]+'. '+p.ln:'?'; };
  const out=[]; if(day===1){ const a=best(r=>r.spr,(x,y)=>x<y), b=best(r=>r.jug,(x,y)=>x>y); out.push(['Fastest 40',nm(a),raw[a].spr.toFixed(2)+' s'],['Most juggles',nm(b),String(raw[b].jug)]); }
  if(day===2){ const a=best(r=>r.beep,(x,y)=>x>y), b=best(r=>r.pos,(x,y)=>x>y); out.push(['Beep test leader',nm(a),raw[a].beep.toFixed(1)],['Top position drill',nm(b),String(raw[b].pos)]); }
  if(day>=3){ const a=best(r=>r.pct,(x,y)=>x>y); out.push(['Best in the scrimmage',nm(a),v1812tLetter(raw[a].pct)]); } return out; }
function v1812tWeek(C){ const T=C.tryout; const day=Math.min(3,T.day|0); const run=V1812T_UI.running; const shown=run?day-1:day; const steps=['Sign-ups','Day 1','Day 2','Day 3','Post'];
  const title=shown===0?'Tryout week — sign-ups are in':`Tryout week — DAY ${shown} OF 3 · ${V1812T_DAYTAG[shown]}`;
  const next=day<3?`Run Day ${day+1}`:'';
  const so=v1812tStandouts(C,shown);
  const sub=shown===0?`${v1812tPoolIds(C).length} players are trying out for ${V1812T.caps.V+V1812T.caps.JV+V1812T.caps.MOD} spots. Each day tightens the range on every rating; the final scrimmage is graded.`:shown<3?`${V1812T_DAYTAG[shown+1]} is next. You can place and cut players at any point; nothing is posted until you say so.`:'All the drills are done. Set every level, then post the roster on the gym door.';
  return `<section class="v1812t-week" aria-label="Tryout week"><div class="v1812t-week-l"><span class="eyebrow v1812t-kick">Preseason · ${C.year}</span><h2 class="v1812t-wk-t" id="v1812t-wk-t">${title}</h2><p class="small muted v1812t-wk-s">${sub}</p>
    <ol class="v1812t-steps" aria-label="Tryout progress">${steps.map((s,i)=>{ const st=i<=shown?(i===shown&&i<4?'now':'done'):'next'; return `<li class="${i<shown?'done':i===shown?'now':'next'}" ${i===shown?'aria-current="step"':''}><i>${i<shown?'✓':i+1}</i><span>${s}</span></li>`; }).join('')}</ol>
    ${so.length?`<div class="v1812t-standouts" aria-label="Standouts">${so.map(([l,n,v])=>`<span><em>${l}</em> <b>${esc(n)}</b> <i class="mono">${v}</i></span>`).join('')}</div>`:''}</div>
   <div class="v1812t-week-r">${day<3?`<button class="btn pri play v1812t-run" data-a="v1812tRun" ${run?'disabled aria-busy="true"':''}>${run?'Running the drills…':next}</button>`:`<span class="v1812t-alldone">${icon('office',18)} Drills complete</span>`}<button class="btn ghost sm" data-a="v1812tSkipAsk">Skip tryouts (auto-sort the program)</button></div></section>
   <section class="v1812t-stage" id="v1812t-stage" hidden aria-live="polite"></section>`; }

/* ---------- the gym-door preview (left column) ---------- */
function v1812tDoorBox(C){ const T=C.tryout; const lv=App.params.td||'V'; const ids=v1812tPoolIds(C).filter(id=>v1812tAsg(C,id)===lv);
  const newV=new Set(lv==='V'?ids.filter(id=>{ const p=C.players[id]; return !p||p.lvl!=='V'; }):[]);
  const n=ids.length; const cap=V1812T.caps[lv];
  return `<div class="v1812t-doorbox" id="v1812t-doorbox"><div class="v1812t-doortabs" role="tablist" aria-label="Roster sheet">${['V','JV','MOD'].map(l=>`<button role="tab" class="${lv===l?'on':''}" aria-selected="${lv===l}" data-a="v1812tDoorTab" data-v="${l}">${V1812T_LVL[l]}</button>`).join('')}</div>
   <div class="v1812t-minidoor"><div class="v1812t-minileaf">${v1812tSheet(C,lv,{ids,circ:newV,draft:true,noNote:false}).replace('class="v1812t-sheet','class="v1812t-sheet static')}</div></div>
   <p class="tiny muted v1812t-doorcap">${n} of ${cap} on the ${V1812T_LVL[lv]} list so far.${lv==='V'&&newV.size?` ${newV.size} circled: new to Varsity.`:''}</p></div>`; }
function v1812tTiles(){ return `<div class="v1812t-expl" aria-label="How tryouts work"><div><i class="ic">${icon('binoc',20)}</i><b>Drills narrow the range</b><p>Each drill tightens a hidden rating like scouting at camp. Players you already coach start with a narrow range; unknown kids start wide open.</p></div><div><i class="ic">${icon('flag',20)}</i><b>Cut players remember it</b><p>Most come back stronger. Some transfer to a rival. A few quit. You will see them again.</p></div><div><i class="ic">${icon('users',20)}</i><b>Move-ins and walk-ons</b><p>New kids arrive every summer, not just freshmen. The best might be hiding in a wide range.</p></div></div>`; }

/* ---------- the open screen ---------- */
function v1812tOpenView(C){
  const T=C.tryout; T.seen=true; const s=Sx(C.userSid); const day=Math.min(3,T.day|0);
  const ids=v1812tPoolIds(C); const RA=v1812tAllRaw(C); const views=ids.map(id=>v1812tView(C,id,RA)).filter(Boolean); const plan=day>=1?v1812tAutoPlan(C):null;
  const P=App.params||{}; let f=P.tf||(views.some(v=>v.kind!=='ret')?'new':'all'); const sort=P.ts||'level';
  const bubble=v=>!!(plan&&v.code&&plan[v.id]!==v.code&&v.ret);
  const F={new:{l:'Newcomers',f:v=>v.kind!=='ret'},bubble:{l:'On the bubble',f:bubble},all:{l:'Everyone',f:()=>true},V:{l:'Varsity',f:v=>v.code==='V'},JV:{l:'JV',f:v=>v.code==='JV'},MOD:{l:'Modified',f:v=>v.code==='MOD'},X:{l:'Cut',f:v=>v.code==='X'},U:{l:'Undecided',f:v=>!v.code},tag:{l:'Tagged',f:v=>v.tag},gk:{l:'Keepers',f:v=>v.p.pos==='GK'}};
  if(!F[f]) f='all'; if(f==='bubble'&&!plan) f='new';
  let list=views.filter(F[f].f); if(sort==="level") list=list.slice().sort((a,b)=>(a.code?1:0)-(b.code?1:0));
  if(sort==='rating') list=list.slice().sort((a,b)=>(b.mid-a.mid)||(a.id<b.id?-1:1)); else if(sort==='name') list=list.slice().sort((a,b)=>a.p.ln.localeCompare(b.p.ln)||a.p.fn.localeCompare(b.p.fn)); else if(sort==='pos') list=list.slice().sort((a,b)=>GROUPS.indexOf(a.p.pos)-GROUPS.indexOf(b.p.pos)||(b.mid-a.mid));
  const chip=k=>{ if(k==='bubble'&&!plan) return ''; const n=views.filter(F[k].f).length; if(k==='tag'&&!n&&f!=='tag') return ''; return `<button class="v1812t-fc ${f===k?'on':''}" data-a="v1812tFilter" data-v="${k}" aria-pressed="${f===k}">${F[k].l}<em>${n}</em></button>`; };
  const mobileClosed=window.innerWidth<900;
  const html=`<div class="v1812t" style="--c1:${s.c1};--c2:${s.c2}" data-day="${day}">
    ${v1812tWeek(C)}
    ${v1812tBar(C)}
    <div class="v1812t-body"><aside class="v1812t-aside"><details class="v1812t-doord" ${mobileClosed?'':'open'}><summary>The gym door</summary>${v1812tDoorBox(C)}</details></aside>
     <div class="v1812t-main"><div class="v1812t-filters" role="group" aria-label="Filter players">${['new','bubble','all','V','JV','MOD','X','U','gk','tag'].map(chip).join('')}<span class="grow"></span><label class="v1812t-sort"><span class="lab">Sort</span><select data-c="v1812tSort" aria-label="Sort players">${opts([['level','By squad'],['rating','Rating'],['pos','Position'],['name','Name']],sort)}</select></label></div>
      <div class="v1812t-grid">${list.map(v=>v1812tCard(C,v,plan)).join('')||`<div class="empty card">No players match this filter.</div>`}</div></div></div>
    ${v1812tTiles()}</div>`;
  return html; }
CH.v1812tSort=el=>{ App.params={...(App.params||{}),ts:el.value}; App.keepScroll=true; render(); };

/* ---------- the posted screen ---------- */
const V1812T_ST={cut:'Waiting out the year',back:'Coming back for tryouts',made:null,rival:null,quit:'Quit the sport',away:'Playing club ball elsewhere',grad:'Graduated'};
function v1812tMemLine(C,m){ if(m.status==='made') return `Made ${V1812T_LVL[m.madeLvl]||'the roster'} in ${m.madeYr}`; if(m.status==='rival'){ const s=C.schools[m.sid]; return `Plays for ${s?s.town:'a rival'}${s&&m.sid===C.rivals.heated?' (your heated rival)':''}${m.toLvl?' · '+V1812T_LVL[m.toLvl]:''}`; } return V1812T_ST[m.status]||''; }
function v1812tGrudgeMeter(g){ const n=Math.round(g/20); return `<span class="v1812t-gr" title="How much it stung: ${g}/100" aria-label="Grudge ${g} of 100">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5-n)}</span>`; }
function v1812tMemCard(C,m){ const p=(C.tryout.cut&&C.tryout.cut[m.pid])||C.players[m.pid]; const alive=p&&portraitSVG? portraitSVG(p,44):''; return `<div class="v1812t-mem st-${m.status}"><span class="f">${alive}</span><div class="grow"><b>${esc(m.name)}</b><small>${m.pos||''} · Gr ${m.gradeNow||m.grade} · cut ${m.fromLvl?'from '+V1812T_LVL[m.fromLvl]:'at tryouts'} in ${m.cutYr}${m.brk?' · <em>He remembers</em>':''}</small><span class="s">${esc(v1812tMemLine(C,m))}</span></div>${v1812tGrudgeMeter(m.grudge)}</div>`; }
function v1812tPostedView(C){ const T=C.tryout; const sum=T.posted; const s=Sx(C.userSid);
  if(!sum) return v1812tEmptyView(C);
  const old=Object.values(T.mem).filter(m=>m.cutYr<C.year).sort((a,b)=>b.cutYr-a.cutYr||(a.pid<b.pid?-1:1));
  const mine=Object.values(T.mem).filter(m=>m.cutYr===C.year).sort((a,b)=>(a.pid<b.pid?-1:1));
  const nm=id=>{ const p=C.players[id]; return p?`<button class="link" data-a="openPlayer" data-id="${id}">${esc(pname(p))}</button>`:esc(id); };
  return `<div class="v1812t posted" style="--c1:${s.c1};--c2:${s.c2}">
   <section class="v1812t-week posted"><div class="v1812t-week-l"><span class="eyebrow v1812t-kick">Preseason · ${C.year}</span><h2 class="v1812t-wk-t">${sum.auto?'The staff posted the roster':'The roster is posted'}</h2><p class="small muted">${sum.auto?'You skipped the tryouts, so the coaching staff ran the drills and sorted the program.':'Posted Friday at 3:15 pm.'} Lineups were rebuilt and checked for every level.</p>
     <div class="v1812t-fin-tiles"><span><b>${sum.n.V}</b>Varsity</span><span><b>${sum.n.JV}</b>JV</span><span><b>${sum.n.MOD}</b>Modified</span><span class="cut"><b>${sum.n.X}</b>cut</span></div></div>
    <div class="v1812t-week-r"><button class="btn pri" data-a="v1812tDoorAgain">Watch the door scene</button><button class="btn" data-a="go" data-r="squads">Open Squads &amp; Lineups</button>${C.phase==='preseason'&&C.pre.rd===0?`<button class="btn" data-a="playNext">${esc(playLabel(C))}</button>`:''}</div></section>
   <div class="v1812t-body posted"><aside class="v1812t-aside"><div class="v1812t-doorbox"><div class="v1812t-minidoor"><div class="v1812t-minileaf">${v1812tSheet(C,'V',{ids:sum.v,circ:new Set(sum.newV)}).replace('class="v1812t-sheet','class="v1812t-sheet static')}</div></div><p class="tiny muted v1812t-doorcap">The Varsity list, as posted. ${sum.newV.length} circled: new to Varsity.</p></div></aside>
    <div class="v1812t-main">
     <div class="card"><div class="hd"><h3>Cut list</h3><span class="tiny muted">${mine.length} player${mine.length===1?'':'s'} · they remember it</span></div>${mine.length?`<div class="v1812t-mems">${mine.map(m=>v1812tMemCard(C,m)).join('')}</div>`:'<p class="muted small">Nobody was cut.</p>'}</div>
     ${sum.newV.length||sum.newcomers.length?`<div class="card"><div class="hd"><h3>Who made it</h3></div><div class="v1812t-made">${sum.newcomers.map(x=>{ const p=C.players[x.id]; if(!p) return ''; const inf=T.info[x.id]||{}; return `<div class="v1812t-mem"><span class="f">${portraitSVG(p,44)}</span><div class="grow">${nm(x.id)}<small>${p.pos} · Gr ${p.grade} · ${V1812T_KIND[x.kind]?V1812T_KIND[x.kind][0]:'Newcomer'}${inf.story?' · '+esc(inf.story):''}</small><span class="s">Made ${V1812T_LVL[x.lvl]}</span></div></div>`; }).join('')||'<p class="muted small">No newcomers made a roster.</p>'}</div></div>`:''}
     ${old.length?`<div class="card"><div class="hd"><h3>Where are they now?</h3><span class="tiny muted">Players you cut in earlier years</span></div><div class="v1812t-mems">${old.slice(0,24).map(m=>v1812tMemCard(C,m)).join('')}</div></div>`:''}
    </div></div>${v1812tTiles()}</div>`; }
function v1812tEmptyView(C){ const T=C.tryout||{}; const old=Object.values(T.mem||{}).sort((a,b)=>b.cutYr-a.cutYr);
  return `<div class="v1812t"><section class="v1812t-week posted"><div class="v1812t-week-l"><span class="eyebrow v1812t-kick">Every preseason</span><h2 class="v1812t-wk-t">${C.phase==='preseason'?'Tryouts are not running this year':'Tryouts open at the start of each preseason'}</h2><p class="small muted">Three days of drills (sprint and juggling, beep test and position drills, a graded scrimmage), then you post the roster on the gym door. Players you cut remember it.</p></div></section>
   ${old.length?`<div class="card"><div class="hd"><h3>Where are they now?</h3></div><div class="v1812t-mems">${old.slice(0,24).map(m=>v1812tMemCard(C,m)).join('')}</div></div>`:''}${v1812tTiles()}</div>`; }
VIEWS.tryouts=()=>{ const C=App.C; try{ v1812tEnsure(C); }catch(e){ console.error(e); } const st=v1812tSt(C);
  if(st==='open') return v1812tOpenView(C); if(st==='posted'||st==='auto') return v1812tPostedView(C); return v1812tEmptyView(C); };
/* after drawing: the count-ups, and focus-safe things */
const _v1812tRender=render; render=function(){ const out=_v1812tRender.apply(this,arguments); try{ if(App.route==='tryouts'&&V1812T_UI.freshDay&&performance.now()<V1812T_UI.freshUntil) v1812tCountUp(document.querySelector('.v1812t')); }catch(e){} return out; };

/* ---------- Overview: the tryout week card ---------- */
function v1812tHero(C){ const st=v1812tSt(C); const T=C.tryout; const s=Sx(C.userSid);
  if(st==='open'){ const n=v1812tPoolIds(C).length; const nn=T.pool.length; const day=Math.min(3,T.day|0); const u=v1812tCounts(C).U;
    return `<section class="v1812t-hero" style="--c1:${s.c1};--c2:${s.c2}"><div class="v1812t-hero-art" aria-hidden="true">${icon('tryouts',46)}</div><div class="grow"><span class="eyebrow">Preseason · ${day===0?'new':'Day '+day+' of 3 done'}</span><h2>Tryouts &amp; Cut Day</h2><p class="small">${day===0?`${n} players are trying out for ${V1812T.caps.V+V1812T.caps.JV+V1812T.caps.MOD} spots, including ${nn} newcomers${T.pool.filter(id=>(T.info[id]||{}).kind==='back').length?` (${T.pool.filter(id=>(T.info[id]||{}).kind==='back').length} you cut before, back for another go)`:''}. Three days of drills, then you post the roster on the gym door.`:day<3?`${V1812T_DAYTAG[day+1]} is next. ${u} undecided.`:`The drills are done. ${u?u+' undecided. ':''}Post the roster when you are ready.`}</p></div>
      <div class="v1812t-hero-acts"><button class="btn pri play" data-a="v1812tOpen">${day===0?'Open tryouts':'Continue tryouts'}</button><button class="btn ghost sm" data-a="v1812tSkipAsk">Skip (auto-sort)</button></div></section>`; }
  if((st==='posted'||st==='auto')&&C.phase==='preseason'&&C.pre.rd===0&&T.posted){ const sm=T.posted;
    return `<section class="v1812t-hero done" style="--c1:${s.c1};--c2:${s.c2}"><div class="v1812t-hero-art" aria-hidden="true">${icon('tryouts',38)}</div><div class="grow"><span class="eyebrow">Roster posted</span><h2>${sm.n.V} Varsity · ${sm.n.JV} JV · ${sm.n.MOD} Modified</h2><p class="small">${sm.n.X} cut${sm.newV.length?` · ${sm.newV.length} new on Varsity`:''}. They will remember it.</p></div><div class="v1812t-hero-acts"><button class="btn" data-a="v1812tOpen">View the list</button></div></section>`; }
  return ''; }
{ const _ov=VIEWS.office; VIEWS.office=function(){ let h=''; try{ v1812tEnsure(App.C); h=v1812tHero(App.C); }catch(e){ console.error(e); } return h+_ov.apply(this,arguments); }; }
{ const _ps=VIEWS.presched; if(_ps) VIEWS.presched=function(){ const h=_ps.apply(this,arguments); try{ const C=App.C; if(v1812tIsOpen(C)) return `<div class="notice warn small v1812t-note"><b>Tryouts are still open.</b> Your Varsity XI changes when the roster is posted, so hold tryouts before you lock the schedule. <button class="btn sm" data-a="v1812tOpen">Open tryouts</button></div>`+h; }catch(e){} return h; }; }

/* ---------- actions ---------- */
A.v1812tOpen=()=>{ App.modal=null; renderModal(); App.route='tryouts'; App.params={}; render(); window.scrollTo(0,0); };
A.v1812tFilter=el=>{ App.params={...(App.params||{}),tf:el.dataset.v}; App.keepScroll=true; render(); };
A.v1812tDoorTab=el=>{ App.params={...(App.params||{}),td:el.dataset.v}; const b=document.getElementById('v1812t-doorbox'); if(b){ b.outerHTML=v1812tDoorBox(App.C); } };
function v1812tPaint(){ const C=App.C; if(App.route!=='tryouts'||!v1812tIsOpen(C)) return; const bar=document.getElementById('v1812t-bar'); if(bar) bar.outerHTML=v1812tBar(C); const b=document.getElementById('v1812t-doorbox'); if(b) b.outerHTML=v1812tDoorBox(C);
}
A.v1812tSeg=el=>{ const C=App.C; if(!v1812tIsOpen(C)) return; const id=el.dataset.id, code=el.dataset.code; const res=v1812tSet(C,id,code); if(!res.ok){ toast(res.msg); return; }
  const card=el.closest('.v1812t-card'); if(card){ card.dataset.code=code; card.classList.toggle('is-cut',code==='X'); card.classList.remove('undec'); card.querySelectorAll('.v1812t-seg button').forEach(b=>{ const on=b.dataset.code===code; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); card.classList.remove('v1812t-pulse'); void card.offsetWidth; card.classList.add('v1812t-pulse'); }
  v1812tPaint(); v1812tSave(); try{ Sound.ui(code==='X'?'close':'tick'); }catch(e){} };
A.v1812tTag=el=>{ const T=App.C.tryout; const id=el.dataset.id; if(T.tags[id]) delete T.tags[id]; else T.tags[id]=1; el.classList.toggle('on',!!T.tags[id]); el.setAttribute('aria-pressed',!!T.tags[id]); const card=el.closest('.v1812t-card'); if(card) card.classList.toggle('tagged',!!T.tags[id]); v1812tSave(); };
A.v1812tAuto=()=>{ const C=App.C; if(!v1812tIsOpen(C)) return; const T=C.tryout; V1812T_UI.undo={k:C.seed+':'+C.year,a:JSON.stringify(T.a)}; const plan=v1812tApplyAuto(C); v1812tSave(); App.keepScroll=true; render(); toast('Auto-sort placed everyone from what the drills have shown. Review the cards, then post.'); };
A.v1812tUndo=()=>{ const C=App.C; if(!V1812T_UI.undo||V1812T_UI.undo.k!==C.seed+':'+C.year||!v1812tIsOpen(C)) return; try{ C.tryout.a=JSON.parse(V1812T_UI.undo.a); }catch(e){} V1812T_UI.undo=null; v1812tSave(); App.keepScroll=true; render(); };
/* running a day: the drill animations, then the numbers fill in */
function v1812tHeadline(C,kind){ const raw=v1812tAllRaw(C); const ids=Object.keys(raw); const best=(f,cmp)=>ids.reduce((a,id)=>(a==null||cmp(f(raw[id]),f(raw[a])))?id:a,null); const nm=id=>{ const p=v1812tFind(C,id); return p?pname(p):''; };
  if(kind==='spr'){ const a=best(r=>r.spr,(x,y)=>x<y); return {to:raw[a].spr,dec:2,suf:' s',who:nm(a),txt:`Fastest 40 so far: ${nm(a)}, ${raw[a].spr.toFixed(2)} s`}; }
  if(kind==='jug'){ const a=best(r=>r.jug,(x,y)=>x>y); return {to:raw[a].jug,dec:0,suf:'',who:nm(a),txt:`Most juggles: ${nm(a)}, ${raw[a].jug}`}; }
  if(kind==='beep'){ const a=best(r=>r.beep,(x,y)=>x>y); return {to:raw[a].beep,dec:1,suf:'',who:nm(a),txt:`Beep test leader: ${nm(a)}, level ${raw[a].beep.toFixed(1)}`}; }
  if(kind==='pos'){ const a=best(r=>r.pos,(x,y)=>x>y); return {to:raw[a].pos,dec:0,suf:'',who:nm(a),txt:`Best position-drill score: ${nm(a)}, ${raw[a].pos}`}; }
  const a=best(r=>r.pct,(x,y)=>x>y); const h=hashStr(C.seed+':scr:'+C.year); const w=1+(h%3), b=(h>>>3)%3; return {to:0,dec:0,suf:'',who:nm(a),txt:`Scrimmage: Whites ${w+1} – ${b} Blues. Best on the day: ${nm(a)}`,sc:[w+1,b]}; }
/* the five best of a drill, for the stage's leaderboard */
function v1812tLeaders(C,k,n){ const raw=v1812tAllRaw(C); const ids=Object.keys(raw).filter(id=>v1812tFind(C,id)); const key={spr:r=>-r.spr,jug:r=>r.jug,beep:r=>r.beep,pos:r=>r.pos,scr:r=>r.pct}[k];
  const fmt={spr:r=>r.spr.toFixed(2)+' s',jug:r=>String(r.jug),beep:r=>r.beep.toFixed(1),pos:r=>String(r.pos),scr:r=>v1812tLetter(r.pct)}[k];
  return ids.sort((a,b)=>key(raw[b])-key(raw[a])||(a<b?-1:1)).slice(0,n||5).map(id=>{ const p=v1812tFind(C,id); return {nm:pname(p),pos:p.pos,txt:fmt(raw[id]),isNew:!C.players[id]||v1812tInfo(C,id).kind!=='ret'}; }); }
const V1812T_SCN={1:[['spr','40-yard sprint'],['jug','Juggling']],2:[['beep','Beep test'],['pos','Position drills']],3:[['scr','Final scrimmage']]};
function v1812tStageShow(C,day,i){ const el=document.getElementById('v1812t-stage'); if(!el) return; const list=V1812T_SCN[day]; const [k,lab]=list[i]; const s=Sx(C.userSid); const h=v1812tHeadline(C,k); const dur=k==='spr'?2.2:k==='beep'?2.8:2.6;
  el.hidden=false; el.classList.add('on');
  el.innerHTML=`<div class="v1812t-stage-in"><div class="st-top"><span class="eyebrow">Day ${day} · drill ${i+1} of ${list.length}</span><b class="st-title">${lab}</b><button class="btn sm ghost" data-a="v1812tStageSkip">Skip</button></div><div class="st-grid"><div class="st-art">${v1812tScene(k,{c1:s.c1,c2:s.c2,dur,label:lab})}<div class="st-clock mono" id="v1812t-clock" aria-hidden="true">${k==='scr'?'':'0'}</div></div><div class="st-lead"><span class="eyebrow">${k==='scr'?'Best in the scrimmage':'Leaders so far'}</span><ol>${v1812tLeaders(C,k,5).map((x,j)=>`<li style="--i:${j}"><span class="n">${j+1}</span><span class="w"><b>${esc(x.nm)}</b><small>${x.pos}${x.isNew?' · newcomer':''}</small></span><i class="mono">${x.txt}</i></li>`).join('')}</ol></div></div><p class="st-foot" id="v1812t-hl">${esc(k==='spr'?'On your marks…':k==='jug'?'Counting touches…':k==='beep'?'Level by level, until the beep wins…':k==='pos'?'Weaving through the cones…':'Whites against Blues…')}</p><div class="st-dots">${list.map((_,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div></div>`;
  try{ if(k==='scr'||k==='spr') (Sound.whistle&&Sound.whistle('start')); else Sound.ui('swoosh'); }catch(e){}
  const clock=document.getElementById('v1812t-clock'); const t0=performance.now(); const ms=dur*1000*0.92; let ticks=0;
  const step=t=>{ if(!V1812T_UI.running||V1812T_UI.running.gen!==V1812T_UI.gen||!clock.isConnected) return; const kk=Math.min(1,(t-t0)/ms); const e=1-Math.pow(1-kk,2);
    if(k==='scr') clock.textContent=`${Math.round(h.sc[0]*e)} – ${Math.round(h.sc[1]*e)}`; else clock.textContent=(h.to*e).toFixed(h.dec)+h.suf;
    if(k==='jug'&&Math.floor(kk*6)>ticks){ ticks=Math.floor(kk*6); try{ Sound.ui('tick'); }catch(e2){} }
    if(kk<1) requestAnimationFrame(step); else { const hl=document.getElementById('v1812t-hl'); if(hl) hl.textContent=h.txt; try{ Sound.ui('pop'); }catch(e3){} } };
  requestAnimationFrame(step);
  if(k==='beep'){ let n=0; const iv=setInterval(()=>{ if(!V1812T_UI.running||V1812T_UI.running.gen!==V1812T_UI.gen||n++>5){ clearInterval(iv); return; } try{ Sound.ui('tick'); }catch(e){} },dur*1000/6); }
  return dur*1000+900; }
function v1812tStageEnd(gen){ if(!V1812T_UI.running||V1812T_UI.running.gen!==gen) return; const day=V1812T_UI.running.day; V1812T_UI.running=null; V1812T.dayO=null; V1812T_UI.freshDay=day; V1812T_UI.freshUntil=performance.now()+2600;
  const el=document.getElementById('v1812t-stage'); if(el){ el.hidden=true; el.classList.remove('on'); el.innerHTML=''; }
  if(App.route==='tryouts'&&v1812tIsOpen(App.C)){ App.keepScroll=true; render(); try{ const f=document.querySelector('[data-a="v1812tRun"]')||document.querySelector('[data-a="v1812tPostAsk"]'); if(f) f.focus({preventScroll:true}); Sound.ui('success'); }catch(e){} if(day===3) toast('The final scrimmage is graded. Set the levels, then post the roster.'); } }
function v1812tStageRun(day,i,gen){ if(!V1812T_UI.running||V1812T_UI.running.gen!==gen) return; const C=App.C; const list=V1812T_SCN[day]; if(i>=list.length||App.route!=='tryouts'){ v1812tStageEnd(gen); return; } const ms=v1812tStageShow(C,day,i); V1812T_UI.running.timer=setTimeout(()=>v1812tStageRun(day,i+1,gen),ms||2800); }
A.v1812tRun=()=>{ const C=App.C; if(!v1812tIsOpen(C)||C.tryout.day>=3||V1812T_UI.running) return; const day=v1812tRunDay(C); v1812tSave(); const rm=reducedMotion();
  if(rm){ V1812T_UI.freshDay=day; V1812T_UI.freshUntil=performance.now()+10; App.keepScroll=true; render(); toast(`Day ${day} is in the books: ${V1812T_DAYTAG[day].toLowerCase()}.`); return; }
  V1812T_UI.gen=(V1812T_UI.gen||0)+1; V1812T_UI.running={day,gen:V1812T_UI.gen}; V1812T.dayO=day-1; App.keepScroll=true; render();
  const st=document.getElementById('v1812t-stage'); if(st) st.scrollIntoView({block:'nearest',behavior:'smooth'});
  v1812tStageRun(day,0,V1812T_UI.gen); };
A.v1812tStageSkip=()=>{ const r=V1812T_UI.running; if(!r) return; clearTimeout(r.timer); v1812tStageEnd(r.gen); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&V1812T_UI.running&&!App.modal){ A.v1812tStageSkip(); } });
/* arrow keys move along a card's Varsity | JV | Modified | Cut control */
document.addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return; const b=e.target.closest&&e.target.closest('.v1812t-seg button'); if(!b) return; const all=[...b.parentElement.querySelectorAll('button:not([disabled])')]; const i=all.indexOf(b); const n=all[(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length]; if(n){ e.preventDefault(); n.focus(); } });

/* ---------- posting, skipping, the confirmation ---------- */
A.v1812tPostAsk=()=>{ const C=App.C; if(!v1812tIsOpen(C)) return; const chk=v1812tCheck(C); if(!chk.ok){ toast(chk.errors[0].msg+' Auto-sort can fix the rest.'); const b=document.getElementById('v1812t-bar'); if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } try{ Sound.ui('error'); }catch(e){} return; }
  App.modal={type:'v1812tConfirm'}; renderModal(); };
MODALS.v1812tConfirm=m=>{ const C=App.C; if(!v1812tIsOpen(C)) return ''; const chk=v1812tCheck(C); const n=chk.n; const ids=v1812tPoolIds(C); const views=ids.map(id=>({id,p:v1812tFind(C,id),code:v1812tAsg(C,id)}));
  const cuts=views.filter(x=>x.code==='X').sort((a,b)=>ovr(b.p)-ovr(a.p)); const newV=views.filter(x=>x.code==='V'&&!(C.players[x.id]&&C.players[x.id].lvl==='V')).length;
  const body=`<div class="v1812t-confirm"><p style="margin-top:0">Once the list is on the door it is final. There is no undo: cut players are told on Monday, and they will remember it.</p>
    <div class="v1812t-fin-tiles"><span><b>${n.V}</b>Varsity<small>/${V1812T.caps.V}</small></span><span><b>${n.JV}</b>JV<small>/${V1812T.caps.JV}</small></span><span><b>${n.MOD}</b>Modified<small>/${V1812T.caps.MOD}</small></span><span class="cut"><b>${n.X}</b>cut</span></div>
    ${newV?`<p class="small">${newV} player${newV===1?'':'s'} new to Varsity will be circled on the list.</p>`:''}
    ${chk.warns.length?`<div class="v1812t-chips">${chk.warns.map(w=>`<span class="v1812t-chip warn">${esc(w.msg)}</span>`).join('')}</div>`:''}
    ${cuts.length?`<details class="v1812t-cutlist" open><summary>${cuts.length} cut</summary><ul>${cuts.map(x=>`<li><span>${esc(pname(x.p))}</span><small>${x.p.pos} · Gr ${x.p.grade}${C.players[x.id]?' · was '+V1812T_LVL[C.players[x.id].lvl]:' · '+({move:'move-in',walk:'walk-on',back:'comeback',fresh:'new this year'}[(v1812tInfo(C,x.id).kind)]||'newcomer')}</small></li>`).join('')}</ul></details>`:''}</div>`;
  return modalShell('<h2>Post the roster?</h2>',body,`<button class="btn" data-a="closeModal" data-autofocus>Keep editing</button><button class="btn pri" data-a="v1812tPost">Post it on the gym door</button>`,'v1812t-modal'); };
A.v1812tPost=()=>{ const C=App.C; const res=v1812tPost(C,'user'); if(!res.ok){ App.modal=null; renderModal(); toast(res.errors&&res.errors[0]?res.errors[0].msg:'The roster is already posted.'); App.keepScroll=true; render(); return; }
  App.modal=null; renderModal(); App.odds.clear(); V1812T_UI.undo=null; v1812tSave(); saveNow(); App.route='tryouts'; App.params={}; render(); window.scrollTo(0,0); v1812tDoorOpen(C,res.sum); };
A.v1812tSkipAsk=()=>{ const C=App.C; if(!v1812tIsOpen(C)) return; App.modal={type:'v1812tSkip'}; renderModal(); };
MODALS.v1812tSkip=m=>{ const C=App.C; const n=v1812tPoolIds(C).length; return modalShell('<h2>Skip the tryouts?</h2>',`<p style="margin-top:0">The coaching staff will run all three days and post a sensible roster for you: ${V1812T.caps.V} on Varsity, ${V1812T.caps.JV} on JV, ${V1812T.caps.MOD} on Modified, a keeper or two on each. The ${Math.max(0,n-V1812T.caps.V-V1812T.caps.JV-V1812T.caps.MOD)} or so who do not fit are cut, and they will remember it.</p><p class="small muted">It is final once posted. Your lineups are rebuilt and checked.</p>`,`<button class="btn" data-a="closeModal" data-autofocus>Back to tryouts</button><button class="btn pri" data-a="v1812tSkip">Skip and auto-sort the program</button>`,'v1812t-modal'); };
A.v1812tSkip=()=>{ const C=App.C; App.modal=null; renderModal(); const ok=v1812tAutoResolve(C); App.odds.clear(); v1812tSave(); saveNow(); App.route='tryouts'; App.params={}; render(); if(ok) toast(`The staff posted the roster: ${C.tryout.posted.n.X} cut.`); window.scrollTo(0,0); };
/* called by the engine hook when a preseason game starts with the tryouts still open */
function v1812tAfterAuto(C){ try{ v1812tSave(); if(App.odds) App.odds.clear(); const sm=C.tryout&&C.tryout.posted; if(typeof toast==='function'&&sm) toast(`Tryouts were skipped: the staff posted the roster (${sm.n.X} cut).`); }catch(e){} }

/* ---------- the door scene's buttons ---------- */
A.v1812tDoorDone=()=>{ v1812tDoorClose(); if(App.route==='tryouts'){ App.keepScroll=true; render(); } };
A.v1812tDoorAgain=()=>{ const sm=App.C.tryout&&App.C.tryout.posted; if(sm) v1812tDoorOpen(App.C,sm); };
A.v1812tDoorSkip=()=>{ V1812T_SC.finish&&V1812T_SC.finish(); };
A.v1812tDoorSquads=()=>{ v1812tDoorClose(); App.route='squads'; App.params={lvl:'V',tab:'lineup'}; render(); window.scrollTo(0,0); };

/* ---------- gate: leaving tryouts half-done by playing the Preseason Cup ---------- */
function v1812tNeedGate(C){ if(!C||C.phase!=='preseason'||App.live) return false; const T=C.tryout; return !!(T&&v1812tIsOpen(C)&&(T.seen||T.day>0)); }
function v1812tQuiet(C){ if(C&&C.phase==='preseason'&&C.userSid&&(!C.tryout||C.tryout.yr!==C.year||C.tryout.st==='open')){ v1812tEnsure(C); if(v1812tIsOpen(C)&&!v1812tNeedGate(C)){ if(v1812tAutoResolve(C)) v1812tAfterAuto(C); } } }
function v1812tGuard(name,quiet){ const orig=A[name]; if(!orig) return; A[name]=function(el,ev){ const C=App.C; if(C&&C.phase==='preseason'){ try{ v1812tEnsure(C); }catch(e){}
      if(v1812tNeedGate(C)){ V1812T_UI.then=()=>orig.call(this,el,ev); App.modal={type:'v1812tGate'}; renderModal(); return; }
      if(quiet) v1812tQuiet(C); }
    return orig.apply(this,arguments); }; }
/* Play and skip settle the tryouts first (so the match preview shows the final lineups); simulating and kicking off settle them when the match starts (the engine hook); merely looking at a preview never does */
v1812tGuard('playNext',true); v1812tGuard('skipPre',true); for(const n of ['simAhead','quickSim','kickoff']) v1812tGuard(n,false);
MODALS.v1812tGate=m=>{ const C=App.C; const T=C.tryout; const n=T?v1812tCounts(C).U:0;
  return modalShell('<h2>Tryouts are still open</h2>',`<p style="margin-top:0">You have started the tryouts but have not posted the roster${n?` (${n} undecided)`:''}. If you go on, the coaching staff finish the drills and post a sensible list for you. It is final.</p>`,`<button class="btn pri" data-a="v1812tGateBack" data-autofocus>Back to tryouts</button><button class="btn" data-a="v1812tGateGo">Auto-sort and continue</button>`,'v1812t-modal'); };
A.v1812tGateBack=()=>{ V1812T_UI.then=null; A.v1812tOpen(); };
A.v1812tGateGo=()=>{ const C=App.C; const fn=V1812T_UI.then; V1812T_UI.then=null; App.modal=null; renderModal(); const ok=v1812tAutoResolve(C); App.odds.clear(); v1812tSave(); if(ok) toast(`The staff posted the roster: ${C.tryout.posted.n.X} cut.`); if(fn) fn(); else render(); };

/* ---------- stories elsewhere: player profile, a cut player's profile, revenge games ---------- */
{ const _mp=MODALS.player; MODALS.player=function(m){ const C=App.C; const T=C&&C.tryout;
    if(T&&T.cut&&T.cut[m.id]&&!C.players[m.id]){ const p=T.cut[m.id]; const mem=T.mem[m.id]||{}; const s=Sx(p.sid); const o=ovr(p);
      return modalShell(`<h2>${esc(pname(p))}</h2>`,`<div class="v1812t-cutp"><span class="f">${portraitSVG(p,96)}</span><div><div class="eyebrow">Cut at tryouts · ${mem.cutYr||''}</div><h3>${esc(pname(p))}</h3><div class="row small">${posTag(p.pos)}<span class="muted">Grade ${p.grade}${mem.fromLvl?' · was on '+V1812T_LVL[mem.fromLvl]:''}</span></div><div class="ratingbox"><div><span class="lab">OVR</span><b style="color:${badgeColor(R(o))}">${R(o)}</b></div><div><span class="lab">POT</span><b>${p.pot}</b></div></div></div></div>
        <p>${esc(v1812tMemLine(C,mem)||'Out there somewhere.')}. ${mem.grudge!=null?`It stung: ${v1812tGrudgeMeter(mem.grudge)}`:''}</p><p class="small muted">Cut players keep developing without the program. Some come back stronger, some transfer to a rival, some quit.</p>`,`<button class="btn" data-a="closeModal">Close</button>`); }
    let h=_mp.apply(this,arguments); const p=C&&C.players[m.id]; const cm=p&&p.cutMem;
    if(cm){ const where=p.sid===C.userSid?`He made the ${V1812T_LVL[p.lvl]} roster in ${cm.back||C.year}.`:`He now plays for ${esc(Sx(p.sid).town)}${cm.rv?', your heated rival':''}.`;
      h=h.replace('<div class="mbody">',`<div class="mbody"><div class="v1812t-rem"><span class="eyebrow">${cm.brk?'He remembers':'Cut once'}</span><p>Cut${cm.lvl?' from '+V1812T_LVL[cm.lvl]:' at tryouts'} in ${cm.yr}. ${where}</p></div>`); }
    return h; }; }
{ const _rc=rivalChip; rivalChip=function(f){ let h=_rc.apply(this,arguments); try{ const C=App.C; const rv=C&&v1812tRevenge(C,f); if(rv&&rv.length&&f.st!=='d'){ const x=rv.find(y=>y.xi)||rv[0]; h+=` <span class="chip riv v1812t-rvchip" title="${esc(pname(x.p))} was cut by your program in ${x.cm.yr}">Revenge game: ${esc(pname(x.p))}</span>`; } }catch(e){} return h; }; }
{ const _fm=MODALS.fixture; MODALS.fixture=function(m){ let h=_fm.apply(this,arguments); try{ const C=App.C; const f=C.fixtures[m.id]; const rv=f&&v1812tRevenge(C,f); if(rv&&rv.length){ const done=f.st==='d'; const lg=C.logs&&C.logs[f.id];
        const lines=rv.slice(0,3).map(x=>{ let extra=''; if(done&&lg&&lg.box){ const opp=f.h===C.userSid?f.a:f.h; const rows=lg.box[f.h===opp?0:1]||[]; const r=rows.find(q=>q.pid===x.p.id); extra=r&&r.gp!==0?` He ${r.g?'scored '+r.g:'played'}${r.a?' and set up '+r.a:''}.`:''; }
          return `<div class="v1812t-rvline"><span class="f">${portraitSVG(x.p,38)}</span><div><b>${esc(pname(x.p))}</b> was cut by ${esc(Sx(C.userSid).town)} in ${x.cm.yr}${x.cm.lvl?' from '+V1812T_LVL[x.cm.lvl]:''}. ${x.xi?'He starts for':'He is on the roster at'} ${esc(Sx(x.p.sid).town)}.${extra}</div></div>`; }).join('');
        h=h.replace('<div class="mbody">',`<div class="mbody"><div class="v1812t-rv"><span class="eyebrow">Revenge game</span>${lines}</div>`); } }catch(e){ console.error(e); } return h; }; }
/* ---------- the Courier: the first edition of a season carries Cut Day ---------- */
{ const _cf=courierFront; courierFront=function(C,is,ix,issues){ let h=_cf.apply(this,arguments);
    try{ const H=C.tryout&&C.tryout.hist&&C.tryout.hist[is.yr]; if(H&&is.comp==='pre'&&is.rd===0&&typeof h==='string'&&h.includes('<div class="np-body">')){
        const names=(H.newV||[]).map(id=>Px(id)).filter(Boolean).slice(0,2).map(pname); const top=(H.cut||[]).slice().sort((a,b)=>b.ovr-a.ovr)[0];
        const box=`<aside class="v1812t-np"><b>Cut Day at the gym door</b><span>${H.n.V} make Varsity, ${H.n.JV} JV and ${H.n.MOD} Modified; ${H.n.X} are cut.${names.length?` New on the Varsity list: ${esc(names.join(' and '))}.`:''}${top?` The toughest cut: ${esc(top.name)}.`:''} ${H.auto?'The coaching staff posted the list.':'The coach posted it Friday at 3:15 pm.'}</span></aside>`;
        h=h.replace('<div class="np-body">',box+'<div class="np-body">'); } }catch(e){ console.error(e); }
    return h; }; }
