/* ===================== v18.19 SCENARIO MODE, the screens (v1819s) =====================
   - The hub (MODALS.v1819sHub): the selected scenario on the left (crest, "SCENARIO 3 OF 6", setup line, top five of the real
     starting squad, rules, medals, Start / Share), all scenarios on the right (stars, best medal, lock), Make your own and
     Enter a challenge code. Opened from the main menu entry (wraps v1811mHTML), the in-career page and the coach card.
     The left panel also hosts the builder (U.view 'build') and the save-slot picker (U.view 'slot').
     Starting worlds are built for real (v1819sBuild) one at a time in the background while the hub is open, so the squad,
     crest and "rated 8th of 8" line are the ones you will get; Start reuses that exact draft.
   - In career: VIEWS.scenario (goals with live progress, seasons, rules), a "This week" item on the Overview, a Competition menu
     entry, rule locks on the controls (editor tab, Manager Mode, difficulty, cards, directed results, call-ups), medal toasts,
     the end-of-scenario ceremony (MODALS.v1819sEnd) and a medal shelf on School & Stadium (the coach profile). */
const V1819S_UI={pick:null,seeds:{},drafts:{},order:[],timer:null,view:'detail',codeErr:'',share:null,metas:[],confirm:null,b:null,copied:0};
ICON.v1819s='<circle cx="12" cy="14" r="6"/><path d="M8.5 9.2L6 3h4l2 4 2-4h4l-2.5 6.2"/><path d="M12 11.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 13.6l2-.3z"/>';
ICON.lock='<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
ICON.flame='<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 1.5 2 2 2 0-3-1-5 1-7z"/>';
ICON.alert='<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>';
ICON.card='<rect x="7" y="3" width="10" height="16" rx="2"/>';
ICON.cross='<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>';
ICON.copy='<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>';
ICON.check='<path d="M5 12.5l4.5 4.5L19 7.5"/>';
let v1819sN=0;
const V1819S_PAL={b:['#f6c08f','#c27a3e','#7a4318'],s:['#ffffff','#b9c3ce','#66717e'],g:['#fff1b8','#e8b030','#93610b']};
function v1819sMedalSVG(m,size,state){ size=size||28; state=state||'on'; const nm={b:'Bronze',s:'Silver',g:'Gold'}[m]||'';
  if(state==='lock') return `<span class="v1819s-med v1819s-lock" style="--s:${size}px" role="img" aria-label="Locked">${icon('lock',Math.round(size*.5))}</span>`;
  if(state==='empty'||!V1819S_PAL[m]) return `<span class="v1819s-med v1819s-empty" style="--s:${size}px" role="img" aria-label="${state==='empty'?'No medal yet':''}"></span>`;
  const [l,c,d]=V1819S_PAL[m]; const id='v1819sm'+(v1819sN++);
  return `<span class="v1819s-med v1819s-${state} v1819s-m${m}" style="--s:${size}px" role="img" aria-label="${nm} medal${state==='off'?' (not earned)':''}"><svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient></defs>
    <circle cx="20" cy="20" r="18" fill="url(#${id})" stroke="${d}" stroke-width="1.6"/><circle cx="20" cy="20" r="13.2" fill="none" stroke="${l}" stroke-opacity=".75" stroke-width="1.3"/><circle cx="20" cy="20" r="13.2" fill="none" stroke="${d}" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="1.2 1.6"/>
    <path d="M20 11.6l2.5 5.1 5.6.8-4.05 3.95.95 5.6L20 24.4l-5 2.65.95-5.6L11.9 17.5l5.6-.8z" fill="${d}" fill-opacity=".9"/><path d="M20 12.6l2.1 4.3" stroke="${l}" stroke-width=".9" stroke-linecap="round"/></svg></span>`; }
function v1819sStars(n){ if(!n) return ''; return `<span class="v1819s-stars" role="img" aria-label="Difficulty ${n} of 3">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}">★</i>`).join('')}</span>`; }
function v1819sWith(C,fn){ const prev=App.C; App.C=C; try{ return fn(); }finally{ App.C=prev; } }
function v1819sSeed(id){ const U=V1819S_UI; return U.seeds[id]||(U.seeds[id]=(Math.random()*4294967295)>>>0); }
function v1819sKey(pk){ return pk?(pk.def?'c:'+pk.seed+':'+JSON.stringify(pk.def):pk.id+':'+pk.seed):''; }
function v1819sGrade(g){ return {9:'Fr',10:'So',11:'Jr',12:'Sr'}[g]||('Gr '+g); }
function v1819sCoach(){ const P=v1819sP(); return P.coach||'Sam Rivera'; }
function v1819sEmblem(i,size){ const hues=[205,32,150,265,350,48,190]; const h=hues[i%hues.length];
  return `<svg class="v1819s-emb" width="${size}" height="${(size*1.15).toFixed(1)}" viewBox="0 0 100 115" aria-hidden="true"><path d="M50 3 93 14v41c0 30-20 47-43 57C27 102 7 85 7 55V14z" fill="hsl(${h} 35% 22%)" stroke="hsl(${h} 45% 55%)" stroke-width="5"/><text x="50" y="72" text-anchor="middle" font-family="'Big Shoulders Display',sans-serif" font-weight="900" font-size="46" fill="hsl(${h} 60% 80%)">${i<6?i+1:'+'}</text></svg>`; }

/* ---------- background world building ---------- */
function v1819sQueue(){ const U=V1819S_UI; if(U.timer) return; U.timer=setTimeout(v1819sPump,90); }
function v1819sPump(){ const U=V1819S_UI; U.timer=null; if(!App.modal||App.modal.type!=='v1819sHub') return;
  const want=[U.pick&&U.pick.id?U.pick:null,...V1819S_LIST.map(d=>({id:d.id,seed:v1819sSeed(d.id)}))].filter(Boolean);
  const next=want.find(p=>!U.drafts[v1819sKey(p)]); if(!next) return; const k=v1819sKey(next);
  try{ U.drafts[k]=v1819sBuild(next,{coach:v1819sCoach()}); }catch(e){ console.warn('v1819s build',e); U.drafts[k]={err:String(e&&e.message||e)}; }
  U.order.push(k); while(U.order.length>9){ const old=U.order.shift(); if(old!==v1819sKey(U.pick)) delete U.drafts[old]; }
  v1819sPatch(next); v1819sQueue(); }
function v1819sPatch(pk){ const U=V1819S_UI; const k=v1819sKey(pk); const D=U.drafts[k];
  if(D&&D.schools&&!pk.def){ const el=document.querySelector(`.v1819s-lcrest[data-crest="${pk.id}"]`); if(el) el.innerHTML=v1819sWith(D,()=>crest(D.schools[D.userSid],40)); }
  if(k===v1819sKey(U.pick)&&U.view==='detail'){ const det=document.querySelector('.v1819s-detail'); if(det) v1819sKeepFocus(()=>{ det.outerHTML=v1819sDetailHTML(); }); } }
function v1819sKeepFocus(fn){ const a=document.activeElement; const id=a&&a.id; const sc=document.querySelector('.v1819s-modal'); const top=sc?sc.scrollTop:0; fn();
  const sc2=document.querySelector('.v1819s-modal'); if(sc2) sc2.scrollTop=top; if(id){ const el=document.getElementById(id); if(el) el.focus({preventScroll:true}); } }
function v1819sTop(){ const m=document.querySelector('.v1819s-modal'); if(m) m.scrollTop=0; }
function v1819sRefresh(){ v1819sKeepFocus(()=>renderModal()); }

/* ---------- hub: the selected scenario ---------- */
function v1819sPickDef(){ const pk=V1819S_UI.pick; return pk&&!pk.def?V1819S_BY[pk.id]:null; }
function v1819sTop5(C){ const u=C.userSid; const lu=getLu(C,u,'V'); const xi=new Set((lu&&lu.slots||[]).map(s=>s.pid));
  const inj=C.scn&&C.scn.inj?C.players[C.scn.inj.pid]:null; let ps=squad(C,u,'V').sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)).slice(0,5);
  return ps.map(p=>{ const tags=[]; if(inj&&p.id===inj.id) tags.push(['bad','Out for season']); if(p.v1819g) tags.push(['gold','Golden class']); if(p.v1819f) tags.push(['fr','Freshman']); if(!xi.has(p.id)&&!(inj&&p.id===inj.id)) tags.push(['','Bench']);
    return `<li class="v1819s-pl">${portraitSVG(p,44)}<span class="v1819s-plt"><b>${esc(pname(p))}</b><small>${p.pos} · ${R(ovr(p))}<em>${v1819sGrade(p.grade)}</em>${tags.map(([c,t])=>`<i class="${c}">${t}</i>`).join('')}</small></span><span class="v1819s-plr" style="--r:${badgeColor(R(ovr(p)))}">${R(ovr(p))}</span></li>`; }).join(''); }
function v1819sRulesHTML(rules,live){ const all=['fair',...rules];
  return `<ul class="v1819s-rules">${all.map(k=>{ const R0=V1819S_RULES[k]; if(!R0) return ''; return `<li class="${k==='fair'?'fair':''}"><span class="v1819s-ric">${icon(R0.ic,16)}</span><span><b>${esc(R0.t)}</b><small>${esc(R0.d)}</small></span>${live!=null?`<span class="v1819s-rst ${live?'on':''}">${live?icon('lock',13)+'Enforced':'Lifted'}</span>`:''}</li>`; }).join('')}</ul>`; }
function v1819sMedalRows(medals,got){ return `<ul class="v1819s-medals">${V1819S_MEDALS.map(([m,nm])=>{ const on=!!(got&&got[m]); return `<li class="${on?'got':''}">${v1819sMedalSVG(m,30,on?'on':'off')}<span><small>${nm}</small><b>${esc(v1819sGoalText(medals[m]))}</b></span>${on?`<span class="v1819s-tick" aria-label="Earned">${icon('check',16)}</span>`:''}</li>`; }).join('')}</ul>`; }
function v1819sDetailHTML(){ const U=V1819S_UI; const pk=U.pick; if(U.view==='build') return v1819sBuilderHTML(); if(U.view==='slot') return v1819sSlotHTML();
  const d=v1819sPickDef(); const P=v1819sP(); const D=U.drafts[v1819sKey(pk)]; const ready=D&&D.schools;
  const i=d?V1819S_LIST.indexOf(d):6; const locked=d&&!v1819sUnlocked(d)&&pk.from!=='code';
  const name=d?d.name:(pk.def.n||'Custom scenario'); const medals=d?d.medals:pk.def.md; const rules=d?d.rules:pk.def.ru; const seasons=d?d.seasons:pk.def.se;
  const got=d?P.med[d.id]:null; const best=d?P.best[d.id]||0:((P.cust[pk.def?v1819sCustKey({def:pk.def}):'']||{}).best||0);
  const sc=ready?D.schools[D.userSid]:null;
  const crestH=ready?v1819sWith(D,()=>crest(sc,84)):v1819sEmblem(i,84);
  const line=ready?D.scn.line:(d?d.blurb:`${V1819S_SCHOOL[pk.def.sc|0]}. ${seasons} season${seasons>1?'s':''}.`);
  const chal=pk.res?`<div class="v1819s-chal">${v1819sMedalSVG(['', 'b','s','g'][pk.res.medal]||'b',26,pk.res.medal?'on':'empty')}<span><b>Challenge: ${pk.res.medal?['','Bronze','Silver','Gold'][pk.res.medal]:'No medal'} · ${pk.res.w}–${pk.res.d}–${pk.res.l} in the league</b><small>Someone played this exact world. Same school, same squad, same schedule. Beat it.</small></span></div>`:pk.from==='code'?`<div class="v1819s-chal"><span class="v1819s-ric">${icon('v1819s',16)}</span><span><b>From a challenge code</b><small>This is the exact world the code describes.</small></span></div>`:'';
  const squadH=ready?`<ul class="v1819s-squad">${v1819sWith(D,()=>v1819sTop5(D))}</ul>`:D&&D.err?`<p class="v1819s-err">Could not build this world: ${esc(D.err)}</p>`:`<ul class="v1819s-squad v1819s-skel" aria-busy="true">${'<li class="v1819s-pl"><span class="v1819s-skf"></span><span class="v1819s-plt"><b></b><small></small></span></li>'.repeat(5)}</ul>`;
  const lastRun=P.runs.find(r=>d?r.id===d.id:(r.code===(pk.code||'')));
  const shareLab=lastRun&&lastRun.res?'Share result as a challenge code':'Share as a challenge code';
  return `<section class="v1819s-detail" aria-labelledby="v1819s-dname">
    <div class="v1819s-dtop"><span class="v1819s-dcrest">${crestH}</span><div class="v1819s-dtt"><span class="v1819s-eyebrow">${d?`Scenario ${i+1} of ${V1819S_LIST.length}`:'Custom scenario'}${d?' · '+esc(d.kick):''}</span>
      <h3 id="v1819s-dname" tabindex="-1">${esc(name)}</h3><div class="v1819s-dmeta">${d?v1819sStars(d.stars):''}<span>${seasons} season${seasons>1?'s':''}</span>${ready?`<span>${esc(sc.town)} ${esc(sc.mascot)}</span>`:''}</div>
      <p class="v1819s-dline">${esc(line)}</p></div></div>
    ${chal}
    <div class="v1819s-dgrid"><div class="v1819s-blk"><h4>Your starting squad</h4>${squadH}</div>
      <div class="v1819s-blk"><h4>Rules for this scenario</h4>${v1819sRulesHTML(rules)}</div></div>
    <div class="v1819s-blk"><h4>Medals</h4>${v1819sMedalRows(medals,got)}</div>
    <div class="v1819s-actions">${locked?`<button class="btn v1819s-start" disabled id="v1819s-start">${icon('lock',16)} Earn ${d.unlock-v1819sMedalCount()} more medal${d.unlock-v1819sMedalCount()>1?'s':''} to unlock</button>`:`<button class="btn pri v1819s-start" id="v1819s-start" data-a="v1819sStart" ${ready?'':'aria-busy="true"'}>${icon('play',16)} Start scenario</button>`}
      <button class="btn v1819s-ghost" id="v1819s-share" data-a="v1819sShare">${icon('copy',15)} ${shareLab}</button>
      <span class="v1819s-best">${best?`Best so far: ${v1819sMedalSVG(['','b','s','g'][best],18)} <b>${['','Bronze','Silver','Gold'][best]}</b>`:'Best so far: <b>none yet</b>'}</span></div>
    ${U.share?v1819sCodeBox(U.share.code,U.share.note):''}
  </section>`; }
function v1819sCodeBox(code,note){ const U=V1819S_UI; return `<div class="v1819s-codebox"><div class="v1819s-codel"><small>${esc(note||'Challenge code')}</small><code id="v1819s-codeout" tabindex="0">${esc(code)}</code></div><button class="btn sm" id="v1819s-copy" data-a="v1819sCopy" data-code="${esc(code)}">${icon(U.copied&&Date.now()-U.copied<2500?'check':'copy',15)} ${U.copied&&Date.now()-U.copied<2500?'Copied':'Copy'}</button></div>`; }

/* ---------- hub: the list ---------- */
function v1819sListHTML(){ const U=V1819S_UI; const P=v1819sP(); const n=v1819sMedalCount(); const tot=V1819S_LIST.length*3;
  const rows=V1819S_LIST.map((d,i)=>{ const on=U.pick&&!U.pick.def&&U.pick.id===d.id&&U.view==='detail'; const lock=!v1819sUnlocked(d); const best=P.best[d.id]||0;
    const D=U.drafts[d.id+':'+v1819sSeed(d.id)]; const cr=D&&D.schools?v1819sWith(D,()=>crest(D.schools[D.userSid],40)):v1819sEmblem(i,40);
    return `<li><button class="v1819s-li ${on?'on':''} ${lock?'locked':''}" id="v1819s-li-${d.id}" data-a="v1819sPick" data-id="${d.id}" aria-pressed="${on}">
      <span class="v1819s-lcrest" data-crest="${d.id}">${cr}</span>
      <span class="v1819s-lt"><span class="v1819s-ln"><b>${esc(d.name)}</b>${v1819sStars(d.stars)}</span><small>${esc(d.blurb)}</small>${lock?`<em>${icon('lock',12)} ${d.unlock} medal${d.unlock>1?'s':''} to unlock</em>`:''}</span>
      <span class="v1819s-lmed">${lock?v1819sMedalSVG('',30,'lock'):best?v1819sMedalSVG(['','b','s','g'][best],30):v1819sMedalSVG('',30,'empty')}</span></button></li>`; }).join('');
  const cust=U.pick&&U.pick.def&&U.view==='detail'?`<li><button class="v1819s-li on" aria-pressed="true" data-a="v1819sNoop"><span class="v1819s-lcrest">${v1819sEmblem(6,40)}</span><span class="v1819s-lt"><span class="v1819s-ln"><b>${esc(U.pick.def.n||'Custom scenario')}</b></span><small>Custom scenario${U.pick.from==='code'?' from a challenge code':''}</small></span><span class="v1819s-lmed"></span></button></li>`:'';
  return `<aside class="v1819s-side" aria-label="All scenarios">
    <div class="v1819s-sh"><h3>All scenarios</h3><span><b>${n}</b> of ${tot} medal${tot>1?'s':''} earned</span></div>
    <ol class="v1819s-list">${cust}${rows}</ol>
    <p class="v1819s-note">Earned medals unlock the harder scenarios and show on your coach profile.</p>
    <section class="v1819s-own ${U.view==='build'?'on':''}"><span class="v1819s-kick">Make your own</span>
      <ol class="v1819s-steps"><li><i>1</i>Choose a school</li><li><i>2</i>Set rules</li><li><i>3</i>Set medals</li></ol>
      <button class="btn v1819s-ghost wide" id="v1819s-buildbtn" data-a="v1819sBuildOpen">${icon('edit',15)} Build a scenario <small>→ produces a challenge code</small></button></section>
    <section class="v1819s-codef"><label for="v1819s-code">Enter a challenge code</label><div class="v1819s-codein"><input id="v1819s-code" type="text" autocomplete="off" spellcheck="false" placeholder="TL-UNDR-7K2M-…" value="${esc(U.codeIn||'')}" aria-describedby="v1819s-codeerr"><button class="btn" id="v1819s-codego" data-a="v1819sCode">Play</button></div>
      <p id="v1819s-codeerr" class="v1819s-err" role="alert">${esc(U.codeErr||'')}</p></section>
  </aside>`; }

MODALS.v1819sHub=()=>{ const U=V1819S_UI; if(!U.pick) U.pick={id:V1819S_LIST[0].id,seed:v1819sSeed(V1819S_LIST[0].id),from:'list'};
  return `<div class="scrim v1819s-scrim" data-a="scrimClose"><div class="modal v1819s-modal" role="dialog" aria-modal="true" aria-labelledby="v1819s-ttl" data-stop="1">
    <header class="v1819s-hh"><div><span class="v1819s-kick">${icon('v1819s',15)} Scenario Mode</span><h2 id="v1819s-ttl">Start from a hand-built situation</h2><p>Rescue a program, defend a title or survive a brutal run. Each scenario has a goal, a few rules and three medals.</p></div><button class="x" data-a="closeModal" aria-label="Close Scenario Mode" data-autofocus>✕</button></header>
    <div class="v1819s-cols">${v1819sDetailHTML()}${v1819sListHTML()}</div></div></div>`; };

/* ---------- builder ---------- */
function v1819sBDef(){ const U=V1819S_UI; if(!U.b) U.b={n:'My scenario',sc:2,se:2,ru:['tier1'],md:{b:{k:'top',n:4},s:{k:'secfinal'},g:{k:'sec'}},seed:(Math.random()*4294967295)>>>0}; return U.b; }
function v1819sBCode(){ const B=v1819sBDef(); return v1819sEncode({def:{n:v1819sCleanName(B.n)||'Custom scenario',sc:B.sc,se:B.se,ru:B.ru,md:B.md},seed:B.seed}); }
function v1819sBuilderHTML(){ const B=v1819sBDef();
  const seg=(k,opts,cur)=>`<div class="v1819s-seg${opts.length>3?' v1819s-seg4':''}" role="radiogroup">${opts.map(([v,l,sub])=>`<label class="${String(v)===String(cur)?'on':''}"><input type="radio" name="v1819s-${k}" id="v1819s-${k}-${v}" value="${v}" data-c="v1819sB" data-k="${k}" ${String(v)===String(cur)?'checked':''}><span><b>${esc(l)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span></label>`).join('')}</div>`;
  const goalOpts=V1819S_GOAL_IDS.map(k=>[k,k==='top'?'Finish top N in the league':k==='topall'?'Finish top N every season':V1819S_GOALS[k].t]);
  const medal=([m,nm])=>{ const g=B.md[m]; const nOpts=[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${g.n===n?'selected':''}>${n===7&&g.k==='topall'?'7 (above last)':n}</option>`).join('');
    return `<li>${v1819sMedalSVG(m,30)}<label class="v1819s-sel"><span class="v1819s-sr">${nm} goal</span><select id="v1819s-md-${m}" data-c="v1819sB" data-k="md" data-m="${m}">${goalOpts.map(([v,l])=>`<option value="${v}" ${g.k===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>${V1819S_GOALS[g.k].n?`<label class="v1819s-sel n"><span>N =</span><select id="v1819s-mdn-${m}" data-c="v1819sB" data-k="mdn" data-m="${m}">${nOpts}</select></label>`:''}<span class="v1819s-mtx">${esc(v1819sGoalText(g))}</span></li>`; };
  return `<section class="v1819s-detail v1819s-build" aria-labelledby="v1819s-bname">
    <div class="v1819s-dtop"><span class="v1819s-dcrest">${v1819sEmblem(6,84)}</span><div class="v1819s-dtt"><span class="v1819s-eyebrow">Make your own</span><h3 id="v1819s-bname" tabindex="-1">Scenario builder</h3><p class="v1819s-dline">Pick a school, the rules and three medals. You get a code anyone can play, in the same world.</p></div></div>
    <div class="v1819s-field"><label for="v1819s-bn">Scenario name</label><input id="v1819s-bn" type="text" maxlength="24" value="${esc(B.n)}" data-v1819s-in="n" autocomplete="off"></div>
    <div class="v1819s-blk"><h4><i class="v1819s-num">1</i> Choose a school</h4>${seg('sc',[[0,'Strongest','Top of the league'],[1,'Average','Mid-table'],[2,'Weakest','Rated last'],[3,'As dealt','Whatever the seed gives']],B.sc)}
      <div class="v1819s-row2"><div><span class="v1819s-lab">Seasons</span>${seg('se',[[1,'1'],[2,'2'],[3,'3']],B.se)}</div>
      <div class="v1819s-field"><label for="v1819s-bseed">World seed</label><div class="v1819s-codein"><input id="v1819s-bseed" type="text" inputmode="numeric" value="${B.seed}" data-v1819s-in="seed" autocomplete="off"><button class="btn sm" id="v1819s-reroll" data-a="v1819sReroll" aria-label="New random world">↻</button></div></div></div></div>
    <div class="v1819s-blk"><h4><i class="v1819s-num">2</i> Set rules</h4><div class="v1819s-checks">
      <label class="fixed"><input type="checkbox" checked disabled><span><b>${V1819S_RULES.fair.t}</b><small>Always on</small></span></label>
      ${V1819S_RULE_IDS.map(k=>`<label class="${B.ru.includes(k)?'on':''}"><input type="checkbox" id="v1819s-ru-${k}" data-c="v1819sB" data-k="ru" data-r="${k}" ${B.ru.includes(k)?'checked':''}><span><b>${esc(V1819S_RULES[k].t)}</b><small>${esc(V1819S_RULES[k].d)}</small></span></label>`).join('')}</div></div>
    <div class="v1819s-blk"><h4><i class="v1819s-num">3</i> Set medals</h4><ul class="v1819s-bmed">${V1819S_MEDALS.map(medal).join('')}</ul></div>
    ${v1819sCodeBox(v1819sBCode(),'Your challenge code')}
    <div class="v1819s-actions"><button class="btn pri v1819s-start" id="v1819s-bstart" data-a="v1819sBuildStart">${icon('play',16)} Start this scenario</button><button class="btn v1819s-ghost" id="v1819s-bback" data-a="v1819sBack">Back to scenarios</button></div>
  </section>`; }
CH.v1819sB=el=>{ const B=v1819sBDef(); const k=el.dataset.k;
  if(k==='sc') B.sc=+el.value; else if(k==='se') B.se=+el.value;
  else if(k==='ru'){ const r=el.dataset.r; B.ru=B.ru.filter(x=>x!==r); if(el.checked) B.ru.push(r); B.ru.sort((a,b)=>V1819S_RULE_IDS.indexOf(a)-V1819S_RULE_IDS.indexOf(b)); }
  else if(k==='md'){ const m=el.dataset.m; const kk=el.value; B.md[m]=V1819S_GOALS[kk].n?{k:kk,n:B.md[m].n||(kk==='topall'?7:3)}:{k:kk}; }
  else if(k==='mdn'){ const m=el.dataset.m; B.md[m].n=+el.value; }
  v1819sRefresh(); };
document.addEventListener('input',e=>{ const el=e.target&&e.target.closest&&e.target.closest('[data-v1819s-in]'); if(!el) return; if(el.dataset.v1819sIn==='coach'){ V1819S_UI.coachIn=el.value; return; } const B=v1819sBDef();
  if(el.dataset.v1819sIn==='n') B.n=el.value.slice(0,24); else if(el.dataset.v1819sIn==='seed'){ const v=String(el.value).trim(); B.seed=/^\d+$/.test(v)&&+v<4294967296?(+v)>>>0:hashStr(v||'0'); }
  const out=document.getElementById('v1819s-codeout'); if(out) out.textContent=v1819sBCode(); const cp=document.getElementById('v1819s-copy'); if(cp) cp.dataset.code=v1819sBCode(); });
document.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; const t=e.target; if(t&&t.id==='v1819s-code'){ e.preventDefault(); A.v1819sCode(); } });

/* ---------- save slot picker ---------- */
function v1819sSlotHTML(){ const U=V1819S_UI; const by={}; for(const m of U.metas) by[m.slot]=m; const pk=U.pick; const d=v1819sPickDef(); const name=d?d.name:(pk.def&&pk.def.n)||'Custom scenario';
  const rows=[1,2,3].map(n=>{ const m=by[n]; const conf=U.confirm===n;
    if(!m) return `<li><button class="v1819s-slot" id="v1819s-slot-${n}" data-a="v1819sSlot" data-slot="${n}"><span class="v1819s-slot-ic">${icon('play',16)}</span><span><b>Slot ${n} · empty</b><small>Start ${esc(name)} here</small></span></button></li>`;
    return `<li><button class="v1819s-slot filled ${conf?'warn':''}" id="v1819s-slot-${n}" data-a="v1819sSlot" data-slot="${n}" style="--team1:${esc(m.c1||'#345')}"><span class="v1819s-slot-ic">${m.mk?mascotSVG(m.mk,m.c1,m.c2,34):''}</span><span><b>Slot ${n} · ${esc(m.school)}</b><small>${m.year} · season ${m.seasonNo} · Coach ${esc(m.coach)}${App.C&&App.slot===n?' · open now':''}</small></span><span class="v1819s-slot-w">Replace</span></button>
      ${conf?`<div class="v1819s-confirm" role="alert"><p><b>Replace ${esc(m.school)}?</b> That career and its match history will be deleted. This cannot be undone.</p><div><button class="btn" id="v1819s-keep" data-a="v1819sSlotCancel">Keep it</button><button class="btn danger" id="v1819s-replace" data-a="v1819sLaunch" data-slot="${n}">Replace slot ${n}</button></div></div>`:''}</li>`; }).join('');
  return `<section class="v1819s-detail v1819s-slots" aria-labelledby="v1819s-sname">
    <div class="v1819s-dtt"><span class="v1819s-eyebrow">Start · ${esc(name)}</span><h3 id="v1819s-sname" tabindex="-1">Choose a save slot</h3><p class="v1819s-dline">A scenario career lives in a normal save slot. When the scenario ends, it carries on as a normal career.</p></div>
    <div class="v1819s-field"><label for="v1819s-coach">Your coach name</label><input id="v1819s-coach" type="text" maxlength="40" value="${esc(U.coachIn!=null?U.coachIn:v1819sCoach())}" data-v1819s-in="coach" autocomplete="off"></div>
    <ul class="v1819s-slotl">${rows}</ul>
    <div class="v1819s-actions"><button class="btn v1819s-ghost" id="v1819s-sback" data-a="v1819sBack">Back</button></div></section>`; }

/* ---------- hub actions ---------- */
A.v1819sNoop=()=>{};
A.v1819sHub=el=>{ const U=V1819S_UI; U.view='detail'; U.share=null; U.codeErr=''; U.confirm=null; const id=el&&el.dataset&&el.dataset.id; if(id&&V1819S_BY[id]) U.pick={id,seed:v1819sSeed(id),from:'list'};
  if(!U.pick&&App.C&&App.C.scn&&V1819S_BY[App.C.scn.id]) U.pick={id:App.C.scn.id,seed:v1819sSeed(App.C.scn.id),from:'list'};
  App.modal={type:'v1819sHub'}; document.body.classList.remove('navopen'); renderModal(); v1819sQueue(); };
A.v1819sPick=el=>{ const U=V1819S_UI; const id=el.dataset.id; U.pick={id,seed:v1819sSeed(id),from:'list'}; U.view='detail'; U.share=null; U.confirm=null; v1819sRefresh(); v1819sQueue();
  if(window.matchMedia&&matchMedia('(max-width: 900px)').matches){ const h=document.getElementById('v1819s-dname'); const sc=document.querySelector('.v1819s-modal'); if(h&&sc) sc.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'}); } };
A.v1819sShare=()=>{ const U=V1819S_UI; const pk=U.pick; const d=v1819sPickDef(); const P=v1819sP();
  const run=d?P.runs.find(r=>r.id===d.id&&r.res):null;
  if(run&&run.code) U.share={code:run.code,note:`Your ${['','bronze','silver','gold'][run.res]} run${run.rec?` · ${run.rec.w}–${run.rec.d}–${run.rec.l}`:''}: anyone with this code plays your exact world`};
  else U.share={code:v1819sEncode({id:pk.id,seed:pk.seed,def:pk.def||null,res:pk.res||null}),note:'Anyone with this code plays this exact world'};
  U.copied=0; v1819sRefresh(); };
A.v1819sCopy=async el=>{ const U=V1819S_UI; const code=el.dataset.code; let ok=false; try{ await navigator.clipboard.writeText(code); ok=true; }catch(e){}
  if(!ok){ try{ const out=document.getElementById('v1819s-codeout'); const r=document.createRange(); r.selectNodeContents(out); const s=getSelection(); s.removeAllRanges(); s.addRange(r); ok=document.execCommand&&document.execCommand('copy'); }catch(e){} }
  U.copied=Date.now(); el.innerHTML=`${icon('check',15)} Copied`; toast(ok?'Code copied. Send it to a friend.':'Select the code and copy it.'); setTimeout(()=>{ if(el.isConnected) el.innerHTML=`${icon('copy',15)} Copy`; },2500); };
A.v1819sCode=()=>{ const U=V1819S_UI; const inp=document.getElementById('v1819s-code'); const raw=inp?inp.value:''; U.codeIn=raw; const o=v1819sDecode(raw);
  if(o.err){ U.codeErr=o.err; const er=document.getElementById('v1819s-codeerr'); if(er) er.textContent=o.err; if(inp){ inp.setAttribute('aria-invalid','true'); inp.classList.remove('v1819s-shake'); void inp.offsetWidth; inp.classList.add('v1819s-shake'); } return; }
  U.codeErr=''; U.codeIn=''; U.pick={...o,from:'code',code:raw.trim().toUpperCase()}; U.view='detail'; U.share=null; renderModal(); v1819sTop(); v1819sQueue();
  const h=document.getElementById('v1819s-dname'); if(h) h.focus(); toast('Challenge loaded. Building the world…'); };
A.v1819sBuildOpen=()=>{ const U=V1819S_UI; U.view='build'; U.share=null; renderModal(); v1819sTop(); const h=document.getElementById('v1819s-bname'); if(h) h.focus(); };
A.v1819sReroll=()=>{ const B=v1819sBDef(); B.seed=(Math.random()*4294967295)>>>0; v1819sRefresh(); };
A.v1819sBack=()=>{ const U=V1819S_UI; U.view='detail'; U.confirm=null; renderModal(); v1819sTop(); const h=document.getElementById('v1819s-dname'); if(h) h.focus(); };
A.v1819sBuildStart=()=>{ const U=V1819S_UI; const B=v1819sBDef(); U.pick={id:'custom',seed:B.seed,def:{n:v1819sCleanName(B.n)||'Custom scenario',sc:B.sc,se:B.se,ru:[...B.ru],md:JSON.parse(JSON.stringify(B.md))},from:'build'}; U.pick.code=v1819sBCode(); v1819sToSlots(); };
A.v1819sStart=()=>{ const d=v1819sPickDef(); const U=V1819S_UI; if(d&&!v1819sUnlocked(d)&&U.pick.from!=='code'){ toast('Earn more medals to unlock this scenario.'); return; } v1819sToSlots(); };
async function v1819sToSlots(){ const U=V1819S_UI; try{ U.metas=await DB.getMeta(); }catch(e){ U.metas=[]; } U.view='slot'; U.confirm=null; renderModal(); v1819sTop(); v1819sQueue(); const h=document.getElementById('v1819s-sname'); if(h) h.focus(); }
A.v1819sSlot=el=>{ const U=V1819S_UI; const n=+el.dataset.slot; if(U.metas.some(m=>m.slot===n)){ U.confirm=U.confirm===n?null:n; v1819sRefresh(); const b=document.getElementById('v1819s-keep'); if(b&&U.confirm) b.focus(); return; } v1819sLaunch(n); };
A.v1819sSlotCancel=()=>{ V1819S_UI.confirm=null; v1819sRefresh(); };
A.v1819sLaunch=el=>v1819sLaunch(+el.dataset.slot);
async function v1819sLaunch(slot){ const U=V1819S_UI; const pk=U.pick; if(!pk) return; const inp=document.getElementById('v1819s-coach'); const coach=((inp&&inp.value)||v1819sCoach()).trim().slice(0,40)||'Sam Rivera';
  const P=v1819sP(); P.coach=coach; savePrefs();
  const k=v1819sKey(pk); let C=U.drafts[k]; delete U.drafts[k]; if(!C||!C.schools){ C=v1819sBuild(pk,{slot,coach}); }
  C.slot=slot; C.flags={}; C.created=Date.now(); const us=C.schools[C.userSid]; C.coaches[C.userCoachId].name=coach;
  C.news=C.news.filter(n=>!(n.type==='program'&&/named head coach/.test(n.text))); addNews(C,'program',`${coach} named head coach of the ${us.name} ${us.mascot}. Scenario: ${C.scn.name}`,C.userSid);
  if(pk.from==='code'&&pk.code) C.scn.from=pk.code; if(pk.res) C.scn.chal=pk.res;
  C._dirty=new Set(Object.keys(C.logs||{}));
  try{ if(App.C) await saveNow(); }catch(e){}
  try{ const metas=await DB.getMeta(); if(metas.some(m=>m.slot===slot)) await DB.del(slot); }catch(e){}
  App.C=C; App.slot=slot; App.loadedYears=new Set([C.year]); if(App.odds) App.odds.clear(); App.modal=null; App.drawer=null; App.route='scenario'; App.params={}; PREFS.lastSlot=slot; savePrefs();
  U.view='detail'; U.confirm=null; U.share=null; if(!pk.def&&!pk.res) delete U.seeds[pk.id];
  await saveNow(); render(); try{ Sound.syncMenu(); }catch(e){} window.scrollTo(0,0); toast(`${C.scn.name}: you're in charge of ${us.name}. Good luck, Coach.`); }

/* ---------- in career: the scenario page ---------- */
function v1819sStatusLine(C,S){ const ys=v1819sYears(S); const last=ys[ys.length-1];
  if(S.status==='done') return `Complete · ${['No medal','Bronze','Silver','Gold'][S.end.res]}`;
  const i=Math.min(ys.length,Math.max(1,C.year-S.y0+1)); const left=last-C.year; return `Season ${i} of ${S.seasons}${left>0?` · ${left} more after this one`:' · final season'}`; }
function v1819sSeasonRows(C,S){ return v1819sYears(S).map(y=>{ if(y>C.year) return `<li class="v1819s-yr fut"><b>${y}</b><span>Still to come</span></li>`; const F=v1819sFactsFor(C,S,y);
  return `<li class="v1819s-yr ${y===C.year&&S.status==='live'?'now':''}"><b>${y}</b><span class="v1819s-yrc"><span><small>League</small>${F.gp?`${F.w}–${F.d}–${F.l}`:'—'}</span><span><small>Finish</small>${F.pos?v1819sOrd(F.pos)+(F.lgDone?'':' now'):'—'}</span><span><small>Postseason</small>${F.stage?esc(v1819sStageName(F.stage)):F.lgDone?(F.out?'Out in round one':'Sectionals'):'—'}</span></span></li>`; }).join(''); }
VIEWS.scenario=()=>{ const C=App.C; const S=C.scn; const us=Sx(C.userSid);
  if(!S) return `<div class="v1819s-page"><section class="v1819s-hero v1819s-none"><span class="v1819s-heroic">${v1819sMedalSVG('g',72,'off')}</span><div><span class="v1819s-kick">Scenario Mode</span><h2>This is a regular career</h2><p>Scenarios start from a hand-built situation with a goal, a few rules and three medals. Start one in a free save slot; this career stays as it is.</p><button class="btn pri" data-a="v1819sHub">${icon('v1819s',16)} Open Scenario Mode</button></div></section></div>`;
  const st=v1819sMedalStates(C,S); const live=S.status==='live'; const d=V1819S_BY[S.id];
  const goals=V1819S_MEDALS.map(([m,nm])=>{ const e=st[m]; const got=!!(S.earned&&S.earned[m]); const dead=!got&&(e.dead||(!live&&S.missed&&S.missed[m]));
    const pill=got?`<span class="v1819s-pill got">${icon('check',13)} Earned ${S.earned[m].yr}</span>`:dead?'<span class="v1819s-pill dead">Out of reach</span>':live?'<span class="v1819s-pill">In play</span>':'<span class="v1819s-pill dead">Missed</span>';
    return `<li class="v1819s-goal ${got?'got':dead?'dead':''}">${v1819sMedalSVG(m,40,got?'on':'off')}<div class="v1819s-gt"><span class="v1819s-gh"><small>${nm}</small>${pill}</span><b>${esc(v1819sGoalText(S.medals[m]))}</b>
      <span class="v1819s-bar" role="progressbar" aria-label="${nm} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((got?1:e.pct||0)*100)}"><i style="width:${Math.round((got?1:e.pct||0)*100)}%"></i></span><small class="v1819s-prog">${esc(got?'Done':e.prog||'')}</small></div></li>`; }).join('');
  const res=S.end?S.end.res:0;
  const banner=!live?`<section class="v1819s-donebar res${res}">${v1819sMedalSVG(['','b','s','g'][res]||'',56,res?'on':'empty')}<div><span class="v1819s-kick">Scenario complete · ${S.end.yr}</span><b>${['No medal this time','Bronze medal','Silver medal','Gold medal'][res]}</b><small>The rules are lifted. This career carries on as a normal one, as far as you want to take it.</small></div><button class="btn" data-a="v1819sReplay">${icon('history',15)} Replay this world</button></section>`:'';
  const chal=S.chal?`<p class="v1819s-chalnote">${icon('v1819s',14)} Challenge to beat: <b>${['No medal','Bronze','Silver','Gold'][S.chal.medal]}</b> with ${S.chal.w}–${S.chal.d}–${S.chal.l} in the league.</p>`:'';
  return `<div class="v1819s-page">
    <section class="v1819s-hero" style="--c1:${us.c1};--c2:${us.c2}"><span class="v1819s-hcrest">${crest(us,92)}</span><div class="v1819s-ht"><span class="v1819s-kick">${d?`Scenario ${V1819S_LIST.indexOf(d)+1} of ${V1819S_LIST.length}`:'Custom scenario'} ${v1819sStars(S.stars)}</span><h2>${esc(S.name)}</h2><p>${esc(S.line||'')}</p>
      <div class="v1819s-chips"><span class="v1819s-chip ${live?'live':''}">${live?'<i></i>':''}${esc(v1819sStatusLine(C,S))}</span><span class="v1819s-chip">Started ${S.y0}</span><span class="v1819s-chip">Rated ${v1819sOrd(S.rank||1)} of ${C.league.length} at the start</span></div>${chal}</div>
      <div class="v1819s-hact"><button class="btn v1819s-ghost" data-a="v1819sShareCareer">${icon('copy',15)} ${S.status==='done'&&S.end.res?'Share result as a challenge code':'Share as a challenge code'}</button><button class="btn v1819s-ghost" data-a="v1819sHub">${icon('v1819s',15)} All scenarios</button></div></section>
    ${App.v1819sShare?`<div class="v1819s-pshare">${v1819sCodeBox(App.v1819sShare.code,App.v1819sShare.note)}</div>`:''}
    ${banner}
    <div class="v1819s-pgrid"><section class="card v1819s-goals"><h3>Medals</h3><p class="muted small">Checked after every game. Any season in the scenario counts${S.medals.b.k==='topall'?', except "every season" goals':''}.</p><ul>${goals}</ul></section>
      <div class="v1819s-pcol"><section class="card"><h3>Seasons</h3><ul class="v1819s-yrs">${v1819sSeasonRows(C,S)}</ul></section>
      <section class="card"><h3>Rules</h3>${v1819sRulesHTML(S.rules,live)}${S.inj?`<p class="tiny muted">${esc(S.inj.nm)} is listed as out for the ${S.inj.yr} season and cannot be picked.</p>`:''}</section></div></div></div>`; };
A.v1819sShareCareer=()=>{ const C=App.C; const S=C&&C.scn; if(!S) return; const done=S.status==='done';
  App.v1819sShare={code:done?S.rcode:S.code,note:done&&S.end.res?`Your ${['','bronze','silver','gold'][S.end.res]} result: anyone with this code plays your exact world`:'Anyone with this code starts this exact scenario'}; V1819S_UI.copied=0; App.keepScroll=true; render(); };
A.v1819sReplay=()=>{ const C=App.C; const S=C&&C.scn; if(!S) return; const U=V1819S_UI; U.pick={id:S.id,seed:S.seed,def:S.def||null,from:'code',code:S.code}; U.view='detail'; U.share=null; App.modal={type:'v1819sHub'}; renderModal(); v1819sQueue(); };
TITLES.scenario='Scenario'; NAV_ICON.scenario='v1819s'; if(typeof NAV_DESC!=='undefined') NAV_DESC.scenario='Goals, rules and medals';
{ const g=TOPNAV.find(t=>t[0]==='league'); if(g&&!g[3].includes('scenario')) g[3].push('scenario'); }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('scenario');
{ const _nb=navBadges; navBadges=function(C){ const b=_nb.apply(this,arguments); try{ const S=C&&C.scn; if(S&&S.fresh&&S.fresh.length) b.scenario=S.fresh.length; else if(S&&S.status==='live') b.scenario=''; }catch(e){} return b; }; }
{ const _go=A.go; A.go=function(el){ if(el&&el.dataset&&el.dataset.r!=='scenario') App.v1819sShare=null; return _go.apply(this,arguments); }; }

/* ---------- Overview: the scenario in "This week" ---------- */
function v1819sWeekItem(C){ const S=C.scn; if(!S) return ''; const live=S.status==='live'; const st=live?v1819sMedalStates(C,S):null;
  const next=live?V1819S_MEDALS.find(([m])=>!S.earned[m]&&!st[m].dead):null; const got=V1819S_MEDALS.filter(([m])=>S.earned&&S.earned[m]).map(([m])=>v1819sMedalSVG(m,18)).join('');
  const sub=live?(next?`Next: ${v1819sGoalText(S.medals[next[0]])} · ${st[next[0]].prog||''}`:'Every medal is settled'):`Complete · ${['no medal','bronze','silver','gold'][S.end.res]}`;
  return `<button class="dec v1819s-dec" data-a="go" data-r="scenario"><span class="dec-ico">${v1819sMedalSVG(S.end&&S.end.res?['','b','s','g'][S.end.res]:'g',26,live||S.end.res?'on':'empty')}</span><span class="grow"><b>${esc(S.name)} · ${esc(v1819sStatusLine(C,S).replace(/ · .*$/,''))} ${got?`<span class="v1819s-decm">${got}</span>`:''}</b><small>${esc(sub)}</small></span><span class="dec-go"></span></button>`; }
{ const _of=VIEWS.office; VIEWS.office=function(){ let h=_of.apply(this,arguments); try{ const C=App.C; if(!C||!C.scn) return h; const item=v1819sWeekItem(C);
    const t=document.createElement('template'); t.innerHTML=h; const box=t.content.querySelector('.v1817o-items');
    if(box){ const clear=box.querySelector('.v1817o-clear'); if(clear) clear.remove(); box.insertAdjacentHTML('afterbegin',item); h=t.innerHTML; }
    else { const i=h.indexOf('<div class="ov-grid'); const card=`<section class="ov-card v1819s-ovcard">${item}</section>`; h=i>=0?h.slice(0,i)+card+h.slice(i):card+h; } }catch(e){ console.warn('v1819s office',e); } return h; }; }

/* ---------- School & Stadium: the coach's medal shelf ---------- */
function v1819sShelfHTML(){ const P=v1819sP(); const n=v1819sMedalCount();
  return `<section class="card v1819s-shelf"><div class="v1819s-shh"><h3>Scenario medals</h3><span class="muted small">${n} of ${V1819S_LIST.length*3} earned, across every career</span></div>
    <ul>${V1819S_LIST.map(d=>{ const m=P.med[d.id]||{}; const lock=!v1819sUnlocked(d); return `<li><button class="v1819s-shi ${lock?'locked':''}" data-a="v1819sHub" data-id="${d.id}"><span class="v1819s-shm">${V1819S_MEDALS.map(([k])=>v1819sMedalSVG(k,22,m[k]?'on':'off')).join('')}</span><b>${esc(d.name)}</b>${v1819sStars(d.stars)}${lock?`<small>${icon('lock',11)} Locked</small>`:''}</button></li>`; }).join('')}</ul>
    <button class="btn sm" data-a="v1819sHub">${icon('v1819s',15)} Open Scenario Mode</button></section>`; }
{ const _sv=VIEWS.school; VIEWS.school=function(){ const h=_sv.apply(this,arguments); try{ return h+v1819sShelfHTML(); }catch(e){ return h; } }; }

/* ---------- main menu: the entry ---------- */
function v1819sEntryHTML(){ const n=v1819sMedalCount(); const tot=V1819S_LIST.length*3;
  return `<button class="v1819s-entry v1811m-in" style="--v1811m-d:4" data-a="v1819sHub"><span class="v1819s-entry-med" aria-hidden="true">${v1819sMedalSVG('b',30,n>=1?'on':'off')}${v1819sMedalSVG('g',40,'on')}${v1819sMedalSVG('s',30,n>=2?'on':'off')}</span>
    <span class="v1819s-entry-t"><span class="v1819s-entry-k">Scenario Mode</span><b>Six hand-built challenges</b><small>Rescue a program, defend a title or survive a brutal run · ${n} of ${tot} medals</small></span><span class="v1819s-entry-go" aria-hidden="true">${icon('chev',20)}</span></button>`; }
if(typeof v1811mHTML==='function'){ const _mh=v1811mHTML; v1811mHTML=function(){ let h=_mh.apply(this,arguments); try{ const i=h.indexOf('<section class="v1811m-saves'); if(i>=0) h=h.slice(0,i)+v1819sEntryHTML()+h.slice(i); }catch(e){} return h; }; }

/* ---------- rule locks on the controls ---------- */
function v1819sLockMsg(r){ return `Scenario rule: ${V1819S_RULES[r].t}. Locked until the scenario ends.`; }
{ const _sp=A.setParam; A.setParam=function(el){ const C=App.C; const k=el&&el.dataset&&el.dataset.k;
    if(C&&k==='set_difficulty'&&v1819sHas(C,'hard')){ toast(v1819sLockMsg('hard')); return; }
    if(C&&k==='set_cards'&&v1819sHas(C,'strict')){ toast(v1819sLockMsg('strict')); return; }
    return _sp.apply(this,arguments); }; }
{ const _cs=CH.setting; CH.setting=function(el){ const C=App.C; const k=el&&el.dataset&&el.dataset.k;
    if(C&&((k==='manager'&&v1819sHas(C,'fair'))||(k==='suspensions'&&v1819sHas(C,'strict')))){ el.checked=!!C.settings[k]; toast(v1819sLockMsg(k==='manager'?'fair':'strict')); return; }
    return _cs.apply(this,arguments); }; }
for(const [nm,rule] of [['saveDirect','fair'],['savePlayer','fair']]){ const _f=A[nm]; if(typeof _f==='function') A[nm]=function(){ if(App.C&&v1819sHas(App.C,rule)){ toast(v1819sLockMsg(rule)); return; } return _f.apply(this,arguments); }; }
{ const _pr=A.promote; A.promote=function(el){ const C=App.C; if(C&&el&&el.dataset&&el.dataset.to==='V'&&v1819sHas(C,'nocall')&&C.players[el.dataset.id]&&C.players[el.dataset.id].sid===C.userSid){ toast(v1819sLockMsg('nocall')); return; } return _pr.apply(this,arguments); }; }
{ const _mp=MODALS.player; MODALS.player=function(m){ const C=App.C; const fair=C&&v1819sHas(C,'fair'); if(fair&&m&&m.tab==='edit') m.tab='overview'; let h=_mp.apply(this,arguments);
    try{ if(fair){ h=h.replace(/<button role="tab"[^>]*data-v="edit"[^>]*>[^<]*<\/button>/,''); }
      if(C&&v1819sHas(C,'nocall')) h=h.replace(/<button class="btn sm pri" data-a="promote"[^>]*data-to="V">[^<]*<\/button>/,'<span class="tiny muted">No call-ups (scenario rule)</span>');
      const S=C&&C.scn; if(S&&S.inj&&S.inj.pid===m.id&&S.inj.yr===C.year&&S.status==='live'){ const i=h.indexOf('<div class="mbody">'); if(i>=0){ const j=i+19; h=h.slice(0,j)+`<div class="v1819s-injn">${icon('cross',16)} Out for the ${S.inj.yr} season (scenario: ${esc(S.name)})</div>`+h.slice(j); } } }catch(e){} return h; }; }
{ const _st=VIEWS.settings; VIEWS.settings=function(){ const h=_st.apply(this,arguments); try{ const C=App.C; const S=v1819sLive(C); if(!S) return h; const locks=['Player editor','Manager Mode','Directed results'];
    if(S.rules.includes('hard')) locks.push('Difficulty (Hard)'); if(S.rules.includes('strict')) locks.push('Cards and suspensions'); if(S.rules.includes('nocall')) locks.push('Varsity call-ups');
    return `<div class="notice v1819s-setn">${icon('lock',16)}<span><b>${esc(S.name)} is live.</b> Locked until it ends: ${locks.join(', ')}. <button class="link" data-a="go" data-r="scenario">See the rules</button></span></div>`+h; }catch(e){ return h; } }; }

/* ---------- medal toasts and the end-of-scenario ceremony ---------- */
function v1819sAfterRender(){ const C=App.C; const S=C&&C.scn; if(!S) return;
  if(S.fresh&&S.fresh.length&&!App.live){ try{ v1819sSyncPrefs(C); }catch(e){} const names=S.fresh.map(m=>({b:'Bronze',s:'Silver',g:'Gold'}[m])); S.fresh=[]; queueSave(); toast(`${names.join(' and ')} medal earned · ${S.name}`); try{ Sound.ui('pop'); }catch(e){} }
  if(S.pend) v1819sCeremonySoon(); }
function v1819sCeremonySoon(){ clearTimeout(V1819S_UI.cerT); V1819S_UI.cerT=setTimeout(()=>{ const C=App.C; const S=C&&C.scn; if(!S||!S.pend) return;
    if(App.modal||App.drawer||App.live||document.querySelector('.ceremony')){ v1819sCeremonySoon(); return; }
    S.pend=false; queueSave(); App.modal={type:'v1819sEnd'}; renderModal(); },700); }
{ const _r=render; render=function(){ const r=_r.apply(this,arguments); try{ v1819sAfterRender(); }catch(e){ console.warn('v1819s render',e); } return r; }; }
{ const _rm=renderModal; renderModal=function(){ const r=_rm.apply(this,arguments); try{ if(!App.modal&&App.C&&App.C.scn&&App.C.scn.pend) v1819sCeremonySoon(); }catch(e){} return r; }; }
MODALS.v1819sEnd=()=>{ const C=App.C; const S=C&&C.scn; if(!S||!S.end) return ''; const res=S.end.res; const m=['','b','s','g'][res]; const P=v1819sP();
  const nm=['No medal this time','Bronze medal','Silver medal','Gold medal'][res];
  const why={gold:'Gold earned. That is the top of the podium.',time:'The clock ran out on this scenario.',settled:'Every medal is settled.',sudden:'One loss ends it, and the streak is over.'}[S.end.why]||'';
  const rows=V1819S_MEDALS.map(([k,n])=>{ const got=!!S.earned[k]; return `<li class="${got?'got':''}">${v1819sMedalSVG(k,28,got?'on':'off')}<span><small>${n}</small><b>${esc(v1819sGoalText(S.medals[k]))}</b></span><span class="v1819s-rk">${got?icon('check',16):'–'}</span></li>`; }).join('');
  const rec=S.end.rec; const best=S.id!=='custom'&&res>0&&res>=(P.best[S.id]||0);
  return `<div class="scrim v1819s-scrim" data-a="scrimClose"><div class="modal v1819s-endm res${res}" style="--c1:${esc(Sx(C.userSid).c1)};--c2:${esc(Sx(C.userSid).c2)}" role="dialog" aria-modal="true" aria-labelledby="v1819s-endh" data-stop="1">
    <button class="x" data-a="closeModal" aria-label="Close">✕</button>
    <div class="v1819s-rays" aria-hidden="true"></div>
    <div class="v1819s-bigmed">${res?v1819sMedalSVG(m,150):v1819sMedalSVG('',150,'empty')}${res?'<span class="v1819s-ribbon" aria-hidden="true"></span>':''}</div>
    <span class="v1819s-kick">Scenario complete · ${esc(S.name)}</span>
    <h2 id="v1819s-endh">${nm}</h2>${best?'<span class="v1819s-newbest">Your best yet</span>':''}
    <p class="v1819s-why">${esc(why)} ${rec&&(rec.w+rec.d+rec.l)?`League ${rec.w}–${rec.d}–${rec.l}`:''}${S.end.stage?` · ${esc(v1819sStageName(S.end.stage))}`:''}.</p>
    <ul class="v1819s-medals v1819s-endrows">${rows}</ul>
    ${v1819sCodeBox(S.rcode,'Share your result: anyone with this code plays your exact world')}
    <div class="v1819s-endact"><button class="btn v1819s-ghost" data-a="v1819sReplay">Try this world again</button><button class="btn v1819s-ghost" data-a="v1819sHub">Scenario hub</button><button class="btn pri" data-a="closeModal" data-autofocus>Keep playing this career</button></div>
    <p class="tiny muted">The rules are lifted. ${esc(Sx(C.userSid).town)} carry on as a normal career.</p></div></div>`; };
