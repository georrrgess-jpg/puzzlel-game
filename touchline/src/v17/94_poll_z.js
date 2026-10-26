/* ===================== v18.12 THE STATE POLL, part f: where it shows up (Overview, Matchday Center, schedule, live intro, Courier) and the animations ===================== */
function v1812pFixInfo(C,f){
  if(!f||f.comp!=='reg'||f.lvl!=='V'||!C.poll) return null; const polls=C.poll.polls&&C.poll.polls[f.yr]; const poll=polls&&polls[f.rd]; if(!poll) return null;
  const rh=v1812pRankOf(poll,f.h), ra=v1812pRankOf(poll,f.a); if(!rh&&!ra) return null;
  const g=v1812pGotw(C,f.yr,f.rd); return {rh,ra,both:!!(rh&&ra),gotw:!!(g&&g.fid===f.id),kind:rh&&ra?'showdown':'one'};
}

/* ---------- Overview: the State Poll strip ---------- */
function v1812pOverviewCard(C){
  const yr=C.year; const polls=v1812pPolls(C,yr); if(!polls.length) return ''; const me=C.userSid; const poll=polls[polls.length-1]; const rk=v1812pRankOf(poll,me); const row=poll.rows.find(x=>x.id===me); const s=v1812pSchool(C,me); const S=v1812pStory(C,me,yr);
  const top=poll.rows.slice(0,5).map(r=>({r,me:r.id===me})); if(rk&&rk>5) top.push({r:row,me:true});
  const list=top.map(({r,me:m})=>`<li class="${m?'me':''}"><b class="v1812p-ork">${r.rk}</b>${v1812pMv(r)}${crest(v1812pSchool(C,r.id),20)}<span class="trunc">${esc(v1812pName(C,r.id))}</span><i class="mono">${r.pts}</i></li>`).join('')+(rk?'':`<li class="me nr"><b class="v1812p-ork">NR</b><span class="v1812p-mv">–</span>${crest(s,20)}<span class="trunc">${esc(s.town)}</span><i class="mono">${poll.ov.find(o=>o.id===me)?poll.ov.find(o=>o.id===me).pts:0}</i></li>`);
  const g=v1812pGotw(C);
  const side=g?v1812pShowCard(C,g,{small:true,cls:'in-ov',noActs:true}):(()=>{ const feat=v1812pFeatured(C,me,yr,polls.length-1)[0]; if(!feat) return ''; const q=v1812pQuote(C,feat.i,me,yr,polls.length-1); return `<div class="v1812p-ovq"><div class="v1812p-kick">The voters</div><div class="v1812p-vt"><span class="v1812p-face">${v1812pVoterFace(feat.v,44)}</span><div class="v1812p-vb"><b>${esc(feat.v.name)}</b><small>${esc(feat.v.outlet)}</small><p>“${esc(q)}”</p></div><div class="v1812p-vr ${feat.rank?'':'nr'}"><small>Had you</small><b>${feat.rank?'#'+feat.rank:'—'}</b></div></div></div>`; })();
  return `<section class="ov-card v1812p-ovcard" data-v1812p-ov="${yr}|${polls.length}"><div class="v1812p-ovl"><div class="v1812p-kick"><i></i>The State Poll · ${esc(poll.label)}</div>
    <div class="v1812p-ovbig"><span class="v1812p-no">${rk?'NO.':'UNRANKED'}</span>${rk?`<b>${rk}</b>`:'<b class="v1812p-nr">NR</b>'}${row?v1812pMv(row):''}</div><div class="v1812p-ovh">${S.head}</div>
    <button class="btn sm pri" data-a="go" data-r="statepoll">Open State Poll</button></div>
   <div class="v1812p-ovc">${v1812pChart(C,me,yr,{w:300,h:150})}</div>
   <ol class="v1812p-ovt" aria-label="Top of the State Poll">${list}</ol><div class="v1812p-ovs">${side}</div></section>`;
}
{ const _v1812pOv=v15Overview; v15Overview=function(){ let h=_v1812pOv.apply(this,arguments); try{ const card=v1812pOverviewCard(App.C); if(card){ const i=h.indexOf('<div class="ov-more-h">'); if(i>0){ const j=h.lastIndexOf('</div>',i); h=h.slice(0,j)+card+h.slice(j); } } }catch(e){ console.warn('poll overview',e); } return h; }; }

/* ---------- Matchday Center: the showdown card on top, a badge on each ranked-vs-ranked game ---------- */
{ const _v1812pMD=VIEWS.matchday; VIEWS.matchday=function(){ let h=_v1812pMD.apply(this,arguments); try{ const C=App.C; if(C.phase!=='regular') return h; const g=v1812pGotw(C); if(!g) return h;
    const card=v1812pShowCard(C,g,{cls:'in-md'}); const i=h.indexOf('<section class="mc-hero">'); if(i>=0) h=h.slice(0,i)+card+h.slice(i); else h=card+h;
    const all=v1812pRankedGames(C,C.year,C.md); const byF=new Map(all.map(x=>[x.fid,x]));
    h=h.split('<article class="mc-game').map((chunk,ix)=>{ if(!ix) return chunk; const m=/data-(?:wb|id)="([^"]+)"/.exec(chunk); if(!m) return chunk; const x=byF.get(m[1]); const isG=g.fid===m[1];
      if(!isG&&!x) return chunk; const pill=isG?`<span class="pill v1812p-pill gotw">Game of the week · No. ${g.rh||'NR'} v No. ${g.ra||'NR'}</span>`:`<span class="pill v1812p-pill">Ranked · No. ${x.rh} v No. ${x.ra}</span>`;
      return (isG?' v1812p-gotwc':'')+chunk.replace('<div class="mc-top">','<div class="mc-top">'+pill); }).join('<article class="mc-game'); }catch(e){ console.warn('poll matchday',e); } return h; }; }

/* ---------- schedule rows ---------- */
{ const _v1812pGR=v17GameRow; v17GameRow=function(C,f){ let h=_v1812pGR.apply(this,arguments); try{ const x=v1812pFixInfo(C,f); if(!x) return h;
    const tag=x.gotw?`<span class="v1812p-sb gotw" title="Game of the week: No. ${x.rh} vs No. ${x.ra}">GOTW · #${x.rh} v #${x.ra}</span>`:x.both?`<span class="v1812p-sb" title="Ranked matchup: No. ${x.rh} vs No. ${x.ra}">#${x.rh} v #${x.ra}</span>`:`<span class="v1812p-sb one" title="${x.rh?'Home':'Away'} team ranked No. ${x.rh||x.ra}">#${x.rh||x.ra}</span>`;
    return h.replace('</div><b class="mono">',tag+'</div><b class="mono">'); }catch(e){} return h; }; }

/* ---------- the live broadcast intro ---------- */
{ const _v1812pLI=liveIntro; liveIntro=function(done){ _v1812pLI.apply(this,arguments); try{ const L=App.live, C=App.C; const f=L&&C.fixtures[L.fid]; const x=v1812pFixInfo(C,f); const el=$('#lv-intro .lvi'); if(!x||!el) return;
    const top=el.querySelector('.lvi-top'); const label=x.both?(x.gotw?'Game of the week':'Ranked showdown'):'Ranked opponent';
    if(top) top.insertAdjacentHTML('afterbegin',`<div class="v1812p-lvb"><i></i>${label} · ${x.rh?'No. '+x.rh:'Unranked'} vs ${x.ra?'No. '+x.ra:'Unranked'}</div>`);
    const teams=el.querySelectorAll('.lvi-team'); [x.rh,x.ra].forEach((r,i)=>{ if(r&&teams[i]) teams[i].insertAdjacentHTML('afterbegin',`<em class="v1812p-lvr">NO. ${r}</em>`); }); }catch(e){} }; }

/* ---------- match preview ---------- */
{ const _v1812pFM=MODALS.fixture; MODALS.fixture=function(m){ let h=_v1812pFM.apply(this,arguments); try{ const C=App.C; const f=C.fixtures[m.id]; const x=v1812pFixInfo(C,f); if(!x||f.st!=='s') return h;
    const g=x.gotw?v1812pGotw(C,f.yr,f.rd):null; const txt=x.both?`${x.gotw?'Game of the week':'Ranked showdown'}: No. ${x.rh} ${esc(v1812pName(C,f.h))} vs No. ${x.ra} ${esc(v1812pName(C,f.a))}`:`Ranked opponent: No. ${x.rh||x.ra} ${esc(v1812pName(C,x.rh?f.h:f.a))}`;
    h=h.replace('<div class="mbody">',`<div class="mbody"><div class="v1812p-banner"><i></i><b>${txt}</b><button class="btn sm ghost" data-a="go" data-r="statepoll">State Poll</button></div>`); }catch(e){} return h; }; }

/* ---------- school profile: a way into the team analytics ---------- */
{ const _v1812pMS=MODALS.school; MODALS.school=function(m){ let h=_v1812pMS.apply(this,arguments); try{ if(m&&App.C&&App.C.league.includes(m.id)) h=h.replace('<div class="mfoot">',`<div class="mfoot"><button class="btn" data-a="v1812pTeam" data-id="${esc(m.id)}">Team analytics</button>`); }catch(e){} return h; }; }

/* ---------- Newsroom: the Courier carries the poll ---------- */
{ const _v1812pCF=courierFront; courierFront=function(C,is,ix,issues){ let h=_v1812pCF.apply(this,arguments); try{ const f0=is.fx&&C.fixtures[is.fx[0]]; if(!f0||f0.comp!=='reg') return h; const polls=v1812pPolls(C,is.yr); const wk=f0.rd+1; const poll=polls[wk]; if(!poll) return h;
    const me=C.userSid; const rk=v1812pRankOf(poll,me); const row=poll.rows.find(r=>r.id===me); const prev=polls[wk-1]; const was=prev?v1812pRankOf(prev,me):null; const feat=v1812pVoterView(C,me,is.yr,wk)[0]; const q=v1812pQuote(C,0,me,is.yr,wk);
    const line=rk?(was?(rk<was?`up ${was-rk} to No. ${rk}`:rk>was?`down ${rk-was} to No. ${rk}`:`holding at No. ${rk}`):`into the poll at No. ${rk}`):(was?`out of the poll after No. ${was}`:'still outside the top 25');
    const t3=poll.rows.slice(0,3).map((r,i)=>`${i+1}. ${esc(v1812pName(C,r.id))}`).join(' · ');
    const box=`<div class="np-box v1812p-np"><h5>State Poll · ${esc(poll.label)}</h5><p class="np-note"><b>${esc(Sx(me).town)}</b> ${line}.</p><p class="np-note">“${esc(q)}” <span class="muted">— ${esc(V1812P_VOTERS[0].name)}, Courier sports desk</span></p><p class="np-note tiny muted">Top three: ${t3}</p><button class="btn sm ghost" data-a="go" data-r="statepoll">Full poll</button></div>`;
    h=h.replace('<aside class="np-side">','<aside class="np-side">'+box); }catch(e){ console.warn('poll courier',e); } return h; }; }

/* ---------- odds chips fill in with the rest of the odds ---------- */
{ const _v1812pOR=oddsRun; oddsRun=function(){ const fid=_oddsQ[0]; const r=_v1812pOR.apply(this,arguments); try{ if(fid){ const C=App.C; const f=C&&C.fixtures[fid]; if(f) document.querySelectorAll(`[data-v1812p-od="${fid}"]`).forEach(el=>{ el.outerHTML=v1812pOddsChip(C,f); }); } }catch(e){} return r; }; }

/* ---------- animation: rows slide to their new ranks, points count up, the chart draws in ---------- */
const v1812pAnim={key:null,ov:null};
function v1812pCount(el,from,to,ms){ if(from===to){ el.textContent=to; return; } const t0=performance.now(); el.textContent=from;
  const step=t=>{ if(!el.isConnected) return; const k=Math.min(1,(t-t0)/ms); const e=1-Math.pow(1-k,3); el.textContent=Math.round(from+(to-from)*e); if(k<1) requestAnimationFrame(step); else el.textContent=to; }; requestAnimationFrame(step); }
function v1812pPlay(root,withRows){
  if(reducedMotion()) return; root.classList.remove('v1812p-in'); void root.offsetWidth; root.classList.add('v1812p-in');
  if(!withRows) return; const list=root.querySelector('.v1812p-rows'); if(!list) return;
  let from={}; try{ from=JSON.parse(list.dataset.from||'{}'); }catch(e){} const rows=[...list.children]; if(!rows.length) return; const h=rows[0].getBoundingClientRect().height;
  rows.forEach(r=>{ const pr=from[r.dataset.tid]; const rk=+r.dataset.rk; const first=pr==null; const dy=(first?(rk+3):pr)-rk; r.style.transition='none'; r.style.transform=`translateY(${(dy*h).toFixed(1)}px)`; r.style.opacity=first?'0':''; });
  void list.offsetWidth;
  requestAnimationFrame(()=>{ rows.forEach((r,i)=>{ r.style.transition=`transform .8s cubic-bezier(.2,.8,.2,1) ${Math.min(i,10)*18}ms, opacity .5s ease ${Math.min(i,10)*18}ms`; r.style.transform=''; r.style.opacity=''; setTimeout(()=>{ r.style.transition=''; },1400); }); });
  list.querySelectorAll('.v1812p-pts').forEach(el=>v1812pCount(el,+el.dataset.from||0,+el.dataset.to||0,900));
}
function v1812pAfter(){
  const C=App.C; if(!C) return;
  if(App.route==='statepoll'){ const root=document.querySelector('.v1812p'); if(!root) return; const list=root.querySelector('.v1812p-rows'); const key=list?list.dataset.key:'tab:'+(App.params.pt||'');
    if(v1812pAnim.key!==key){ v1812pAnim.key=key; v1812pPlay(root,!!list); } }
  else v1812pAnim.key=null;
  const ov=document.querySelector('.v1812p-ovcard'); if(ov){ if(v1812pAnim.ov!==ov.dataset.v1812pOv){ v1812pAnim.ov=ov.dataset.v1812pOv; v1812pPlay(ov,false); } } else if(App.route!=='office') v1812pAnim.ov=null;
}
{ const _v1812pR=render; render=function(){ const r=_v1812pR.apply(this,arguments); try{ v1812pAfter(); }catch(e){ console.warn('poll after',e); } return r; }; }
{ const _v1812pAM=afterModal; afterModal=function(root){ _v1812pAM.apply(this,arguments); try{ if(!reducedMotion()) root.querySelectorAll('.v1812p-chart').forEach(c=>c.closest('.card,.modal')&&c.closest('.card,.modal').classList.add('v1812p-in')); }catch(e){} }; }

/* ---------- a new career: the school can be renamed after the world is drawn, so the preseason item is written when the career starts ---------- */
{ const _v1812pCC=A.createCareer; A.createCareer=async function(el){ const D=App.draft; try{ if(D&&D.poll){ D.news=D.news.filter(n=>n.type!=='poll'); } }catch(e){}
    const r=await _v1812pCC.apply(this,arguments);
    try{ const C=App.C; if(C&&C.poll&&C.poll.polls[C.year]&&C.poll.polls[C.year][0]&&!C.news.some(n=>n.type==='poll')){ delete C.poll.news[C.year+':0']; v1812pNews(C,C.year,0,C.poll.polls[C.year][0],null); queueSave(); } }catch(e){ console.warn('poll start',e); }
    return r; }; }

/* ---------- offseason: the season in the poll goes on the wrap-up page ---------- */
{ const _v1812pOS=offseasonView; offseasonView=function(){ let h=_v1812pOS.apply(this,arguments); try{ const C=App.C; const polls=v1812pPolls(C,C.year); if(polls.length>1){ const poll=polls[polls.length-1]; const rk=v1812pRankOf(poll,C.userSid);
      h+=`<div class="v1812p-off">${v1812pSeasonCard(C,C.userSid,C.year)}<section class="v1812p-card"><div class="v1812p-kick">The State Poll · ${esc(v1812pTitle(C,poll))}</div><h3 class="v1812p-head sm">${rk?'Finished No. '+rk+' in '+esc(C.stateName):'Finished outside the '+esc(C.stateName)+' top 25'}</h3><ol class="v1812p-ovt">${poll.rows.slice(0,5).map(r=>`<li class="${r.id===C.userSid?'me':''}"><b class="v1812p-ork">${r.rk}</b>${v1812pMv(r)}${crest(v1812pSchool(C,r.id),20)}<span class="trunc">${esc(v1812pName(C,r.id))}</span><i class="mono">${r.pts}</i></li>`).join('')}</ol><button class="btn sm" data-a="go" data-r="statepoll">Open State Poll</button></section></div>`; } }catch(e){ console.warn('poll offseason',e); } return h; }; }
