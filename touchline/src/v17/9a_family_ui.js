/* ===================== v18.16 FAMILY TIES, the screens: mailbox letter, family trees, Family Ties page, profile strip, HoF wall ===================== */
const V1816_POS={GK:'Goalkeeper',DEF:'Defender',MID:'Midfielder',FWD:'Forward'};
function v1816CardHtml(C,c,o){ o=o||{}; const sc=Sx(c.sid)||{c1:'#345',c2:'#fff'};
  return `<article class="v1816-fc ${o.hi?'hi':''} ${c.elder?'el':''}" style="--c1:${sc.c1};--c2:${sc.c2}">${o.isNew?'<span class="v1816-new">NEW</span>':''}
   <b class="v1816-num">${o.q?'?':esc(String(c.num==null?'':c.num))}</b><span class="v1816-face" ${!c.elder?`data-a="openPlayer" data-id="${esc(c.id)}" role="button" tabindex="0"`:''}>${portraitSVG(c.face,o.sm?64:96)}</span>
   <span class="v1816-role">${esc(c.role)}</span><b class="v1816-nm">${esc(c.fn+' '+c.ln)}</b><span class="v1816-cls">Class of ${c.cls} · ${V1816_POS[c.pos]||c.pos}</span>
   ${c.tags&&c.tags.length?`<span class="v1816-tags">${c.tags.map(t=>`<i>${esc(t)}</i>`).join('')}</span>`:''}${c.note&&!o.sm?`<em class="v1816-note">${esc(c.note)}</em>`:''}</article>`; }
function v1816TreeHtml(C,famId,o){ o=o||{}; const tree=v1816Tree(C,famId); const ids=[]; for(const g of tree){ const arr=g.ids.map(id=>v1816Card(C,id)).filter(Boolean).sort((a,b)=>a.cls-b.cls); arr.forEach(c=>ids.push(c)); }
  const cards=o.focus?ids.slice(0,4):ids; let h=''; cards.forEach((c,i)=>{ if(i){ const rel=v1816Rel(C,c.id,cards[i-1].id); h+=`<span class="v1816-link"><b>${rel}</b><i></i></span>`; } h+=v1816CardHtml(C,c,{hi:o.focus===c.id,isNew:o.focus===c.id,q:o.q&&o.focus===c.id,sm:o.sm}); });
  return `<div class="v1816-tree ${o.sm?'sm':''}">${h}</div>`; }
function v1816Letter(C,m){ const p=C.players[m.pid]; const R=v1816Person(C,m.of); const who=m.rel==='son'?'dad':'brother'; const fn=p?p.fn:'';
  return `Coach,\nMy ${who} wore ${m.num}. I know it’s up in the gym. Can I wear it anyway?\n${fn}`; }
function v1816Meters(M){ const row=(l,v,c)=>`<div class="v1816-mt"><span>${l}</span><i><b class="${c}" style="width:${v}%"></b></i><em>${v}</em></div>`;
  return `<section class="v1816-meters"><h4>Legacy pressure <small>your choice moves these</small></h4>${row('Expectations',M.exp,'r')}${row('Your support',M.sup,'y')}${row('Teammates',M.team,'g')}</section>`; }

/* ---------- the letter ---------- */
MODALS.v1816mail=m=>{ const C=App.C; const F=v1816S(C); const L=F.mail.find(x=>x.id===m.id); if(!L) return modalShell('Coach’s mailbox','<div class="empty">That letter is gone.</div>');
  const p=C.players[L.pid]; const fam=v1816Fam(C,L.pid); const me=Sx(C.userSid); const M=F.meters[L.pid]||{exp:70,sup:54,team:71}; const R=v1816Person(C,L.of);
  const opts=['keep','wear','patch'].map(k=>{ const o=V1816_CH[k]; const t=typeof o.t==='function'?o.t(L.num):o.t; const on=L.choice===k;
    return `<button class="v1816-opt ${on?'on':''} ${k==='wear'?'warm':''}" ${L.status==='open'?`data-a="v1816Pick" data-m="${L.id}" data-c="${k}"`:'disabled'}><b>${esc(t)}</b><span>${esc(o.d(L.num))}</span><span class="v1816-otags">${o.tags.map(([c,x])=>`<i class="${c}">${esc(x)}</i>`).join('')}</span>${on?'<em>Your call</em>':''}</button>`; }).join('');
  const pairs=v1816Pairs(C,C.userSid).filter(x=>x.rel==='brothers'&&!(fam&&x.fam===fam.id)).slice(0,1);
  const extra=`<div class="v1816-strip">${pairs.map(x=>{ const o=C.players[x.o], y=C.players[x.y]; return `<div class="v1816-mini"><span class="v1816-faces">${portraitSVG(o,40)}${portraitSVG(y,40)}</span><span><b>${esc(o.ln)} brothers</b><small>${esc(o.fn)} (Gr ${o.grade}) and ${esc(y.fn)} (Gr ${y.grade}) · ${x.n?'start together: +'+x.n+' chemistry':'on the same roster'}</small></span></div>`; }).join('')}
    <button class="v1816-mini" data-a="go" data-r="hof"><span class="v1816-ic">🏛️</span><span><b>Hall of Fame family wall</b><small>Fathers, sons and brothers hang side by side</small></span></button></div>`;
  const body=`<div class="v1816-mail"><div class="v1816-ml">${fam?v1816TreeHtml(C,fam.id,{focus:L.pid,q:L.status==='open'}):''}${extra}</div>
    <div class="v1816-mr"><div class="v1816-paper"><div class="v1816-ph"><div><b>${esc(me.town)} Soccer · coach’s mailbox</b><small>Handwritten · left on your desk</small></div><span class="v1816-jer">${shirtSVG(me.c1,me.c2,String(L.num),64)}<small>RETIRED ${R&&R.cls?R.cls:''}</small></span></div><p>${esc(v1816Letter(C,L)).replace(/\n/g,'<br>')}</p></div>
    <div class="v1816-opts">${opts}</div>${v1816Meters(M)}</div></div>`;
  return modalShell('Coach’s mailbox',body,'','v1816-modal'); };
A.v1816Pick=el=>{ const C=App.C; if(v1816Choose(C,el.dataset.m,el.dataset.c)){ queueSave(); try{ Sound.ui('pop'); }catch(e){} renderModal(); if(App.route==='office'||App.route==='families'){ App.keepScroll=true; render(); } } };
A.v1816Open=el=>{ App.modal={type:'v1816mail',id:el.dataset.m}; renderModal(); };
function v1816Open(C){ return v1816S(C).mail.filter(m=>m.status==='open'&&C.players[m.pid]); }

/* ---------- Overview: a letter on the desk ---------- */
{ const _ov=v15Overview; v15Overview=function(){ let h=_ov.apply(this,arguments); try{ const C=App.C; const o=v1816Open(C)[0]; if(o){ const p=C.players[o.pid];
    const card=`<section class="ov-card v1816-ovmail" data-a="v1816Open" data-m="${o.id}" role="button" tabindex="0"><span class="v1816-env">✉️</span><div><span class="v1812p-kick">Coach’s mailbox · 1 letter</span><b>${esc(pname(p))} wants #${o.num}</b><small>${esc(v1816Name(C,o.of))}’s number is retired. Your call.</small></div><span class="btn sm pri">Read it</span></section>`;
    const i=h.indexOf('<div class="ov-grid'); h=i>=0?h.slice(0,i)+card+h.slice(i):card+h; } }catch(e){ console.warn('v1816 ov',e); } return h; }; }

/* ---------- the Family Ties page ---------- */
VIEWS.families=()=>{ const C=App.C; const F=v1816S(C); const u=C.userSid; const mine=Object.values(F.fams).filter(f=>f.sid===u&&f.mem.length>1);
  const others=Object.values(F.fams).filter(f=>f.sid!==u&&C.league.includes(f.sid)&&f.mem.length>1);
  const open=v1816Open(C);
  const mail=open.map(o=>{ const p=C.players[o.pid]; return `<button class="v1816-banner" data-a="v1816Open" data-m="${o.id}"><span class="v1816-env">✉️</span><span><b>A letter from ${esc(pname(p))}</b><small>He wants #${o.num}, his ${o.rel==='son'?'dad':'brother'}’s retired number</small></span><span class="btn sm pri">Read it</span></button>`; }).join('');
  const pairs=v1816Pairs(C).filter(x=>C.league.includes(C.players[x.o].sid)).sort((a,b)=>(C.players[b.o].sid===u)-(C.players[a.o].sid===u)||b.n-a.n);
  const pairHtml=pairs.map(x=>{ const o=C.players[x.o], y=C.players[x.y]; const s=Sx(o.sid); return `<div class="v1816-pair ${o.sid===u?'mine':''}"><span class="v1816-faces">${portraitSVG(o,44)}${portraitSVG(y,44)}</span><span><b>${esc(o.ln)} ${x.rel}</b><small>${crest(s,14)} ${esc(s.town)} · ${esc(o.fn)} (${LVL_NAME[o.lvl]}, Gr ${o.grade}) and ${esc(y.fn)} (${LVL_NAME[y.lvl]}, Gr ${y.grade})</small></span><em>${x.n?'+'+x.n+' chemistry':'not started together yet'}</em></div>`; }).join('');
  const legacy=Object.entries(F.meters).map(([pid,M])=>{ const p=C.players[pid]; if(!p||p.sid!==u) return ''; return `<div class="v1816-leg"><span>${portraitSVG(p,40)}<b>${esc(pname(p))}</b><small>#${p.num} · ${LVL_NAME[p.lvl]}</small></span>${v1816Meters(M)}</div>`; }).join('');
  const hist=F.mail.filter(m=>m.status==='done').map(m=>`<li><b>${m.cy||m.yr}</b> ${esc(v1816Name(C,m.pid))} asked for #${m.num}: <i>${esc(typeof V1816_CH[m.choice].t==='function'?V1816_CH[m.choice].t(m.num):V1816_CH[m.choice].t)}</i></li>`).join('');
  const around=others.slice(0,24).map(f=>{ const s=Sx(f.sid); const names=f.mem.map(id=>{ const c=v1816Person(C,id); return c?`${esc(c.fn)}${c.elder?' <small>(Class of '+c.cls+')</small>':C.players[id]?' <small>(Gr '+C.players[id].grade+')</small>':' <small>(alum)</small>'}`:''; }).join(' · '); return `<li>${crest(s,18)}<span><b>The ${esc(f.ln)}s</b> <small>${esc(s.town)}</small><br><span class="v1816-mem">${names}</span></span></li>`; }).join('');
  return `<div class="v1816-page"><section class="v1816-hero"><span class="v1812p-kick">Players · New</span><h2>Family Ties</h2><p>Little brothers, cousins and the kids of alumni arrive with a name to live up to. Families share a surname, hand down numbers, and hang in the Hall of Fame as a tree.</p></section>
   ${mail}
   <section class="card"><h3>Your program’s families</h3>${mine.length?mine.map(f=>v1816TreeHtml(C,f.id,{sm:true})).join(''):'<div class="empty">No families at your school yet. New middle schoolers arrive every summer, and some will be somebody’s little brother.</div>'}</section>
   <div class="grid g2"><section class="card"><h3>Brothers together</h3>${pairHtml||'<div class="empty">No brothers share a roster right now.</div>'}<p class="tiny muted">Every game two relatives start together adds chemistry; at the end of the season the younger one grows from it.</p></section>
   <section class="card"><h3>Legacy pressure</h3>${legacy||'<div class="empty">Nobody at your school is carrying a famous number yet.</div>'}${hist?`<h4 class="v1816-h4">The mailbox</h4><ul class="v1816-hist">${hist}</ul>`:''}</section></div>
   <section class="card"><h3>Around the league</h3>${around?`<ul class="v1816-around">${around}</ul>`:'<div class="empty">No families elsewhere yet.</div>'}</section></div>`; };
TITLES.families='Family Ties'; NAV_ICON.families='users'; NAV_DESC.families='Brothers, legacies and the coach’s mailbox';
{ const i=NAV.findIndex(n=>n[0]==='dev'); if(i>=0&&!NAV.some(n=>n[0]==='families')) NAV.splice(i+1,0,['families','Family Ties']); }
{ const g=TOPNAV.find(t=>t[0]==='squads'); if(g&&!g[3].includes('families')) g[3].push('families'); }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('families');
{ const _nb=navBadges; navBadges=function(C){ const b=_nb.apply(this,arguments); try{ const n=v1816Open(C).length; if(n) b.families=n; }catch(e){} return b; }; }

/* ---------- player profile: the family strip ---------- */
{ const _mp=MODALS.player; MODALS.player=function(m){ let h=_mp.apply(this,arguments); try{ const C=App.C; const fam=v1816Fam(C,m.id); if(!fam||fam.mem.length<2) return h;
    const rel=fam.mem.filter(id=>id!==m.id).map(id=>{ const c=v1816Person(C,id); if(!c) return ''; const r=v1816Rel(C,m.id,id); const cur=!!C.players[id]; const lab=c.elder?(c.legend?'Hall of Fame':'Class of '+c.cls):cur?Sx(c.sid).town+' · Gr '+c.grade:'Class of '+c.gradYr;
      return c.elder?`<span class="v1816-chip" title="${esc((c.honors||[]).join(' · '))}"><i>${r}</i> ${esc(c.fn+' '+c.ln)} <small>${esc(lab)}</small></span>`:`<button class="v1816-chip" data-a="openPlayer" data-id="${esc(id)}"><i>${r}</i> ${esc(c.fn+' '+c.ln)} <small>${esc(lab)}</small></button>`; }).join('');
    const strip=`<div class="v1816-pstrip"><span class="v1816-pk">The ${esc(fam.ln)} family</span>${rel}<button class="v1816-chip more" data-a="go" data-r="families">Family Ties</button></div>`;
    const i=h.indexOf('<div class="mbody">'); if(i>=0){ const j=i+'<div class="mbody">'.length; h=h.slice(0,j)+strip+h.slice(j); } }catch(e){ console.warn('v1816 player',e); } return h; }; }

/* ---------- Hall of Fame: the family wall ---------- */
{ const _hof=VIEWS.hof; VIEWS.hof=function(){ let h=_hof.apply(this,arguments); try{ const C=App.C; const F=v1816S(C); const fams=Object.values(F.fams).filter(f=>f.sid===C.userSid&&f.mem.length>1&&f.mem.some(id=>{ const e=F.elders[id]; return (e&&(e.legend||(e.honors||[]).length))||(C.hof||[]).some(x=>x.pid===id); }));
    if(fams.length) h+=`<section class="card v1816-wall"><h3>The family wall</h3><p class="muted small">Fathers, sons and brothers of the program, side by side.</p>${fams.map(f=>v1816TreeHtml(C,f.id,{sm:true})).join('')}</section>`;
    const un=(F.unretired||[]).filter(x=>x.unret&&C.players[x.unret.pid]); const pat=Object.entries(F.patch).map(([pid,num])=>C.players[pid]?`${esc(pname(C.players[pid]))} wears #${num} with a legacy patch`:'').filter(Boolean);
    if(un.length||pat.length) h+=`<p class="tiny muted v1816-retnote">${[...un.map(x=>`#${x.num} (${esc(x.name)}) was un-retired in ${x.unret.yr} for ${esc(x.unret.name)}`),...pat].join(' · ')}</p>`; }catch(e){ console.warn('v1816 hof',e); } return h; }; }
