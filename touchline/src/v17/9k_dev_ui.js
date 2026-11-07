/* v18.21 Player Development hub: tabs on Squads -> Development (the existing page is the Overview tab), a growth card with
   where this season's growth came from, a boosts strip fed by each feature's summary(), and a growth-factors strip in the
   player card. Identifiers v1821d. */
const V1821D_UI={};
function v1821dTabNow(){ const k=App.params&&App.params.dtab; return k&&V1821D.tabs.some(t=>t.id===k)?k:'overview'; }
function v1821dTabBar(C,cur){ const T=[{id:'overview',label:'Overview'},...V1821D.tabs];
  return `<nav class="v1821d-tabs" role="tablist" aria-label="Player development">${T.map(t=>{ let badge=''; try{ const b=t.badge&&t.badge(C); if(b) badge=`<i class="v1821d-bd">${esc(String(b))}</i>`; }catch(e){}
    return `<button role="tab" aria-selected="${t.id===cur}" class="${t.id===cur?'on':''}" data-a="v1821dTab" data-k="${t.id}">${t.ico?`<span aria-hidden="true">${t.ico}</span>`:''}${esc(t.label)}${badge}</button>`; }).join('')}</nav>`; }
A.v1821dTab=el=>{ App.params={...(App.params||{}),dtab:el.dataset.k}; App.keepScroll=true; render(); };
function v1821dLabel(k){ const m=V1821D.mods.find(x=>x.k===k); return m?m.label:k; }
function v1821dGrowthCard(C){ const u=C.userSid; const Y=(C.dvx&&C.dvx.yr[C.year])||null;
  const cols=LVLS.map(l=>{ const ps=squad(C,u,l); const g=ps.length?ps.reduce((a,p)=>a+(ovr(p)-(p.ovr0[C.year]??ovr(p))),0)/ps.length:0; const L=Y&&Y[l];
    const parts=L?Object.entries(L.parts).filter(([,v])=>Math.abs(v)>0.005).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])):[]; const n=Math.max(1,ps.length);
    const avg=v1821dLvlAvg(C,l,'tick'); const pct=Math.round((avg.m-1)*100);
    return `<div class="v1821d-gl"><div class="v1821d-glh"><b>${LVL_NAME[l]}</b><span class="v1821d-pct ${pct>0?'up':pct<0?'dn':''}">${pct>0?'+':''}${pct}% growth rate</span></div>
      <div class="v1821d-big"><span class="${g>0?'good':''}">${g>0?'+':''}${fmt1(g)}</span><small>average OVR this season · ${ps.length} players</small></div>
      <ul class="v1821d-parts">${parts.length?parts.map(([k,v])=>`<li><span>${esc(v1821dLabel(k))}</span><b class="${v>0?'good':'bad'}">${v>0?'+':''}${fmt1(v)}</b></li>`).join('')+`<li class="tot"><span>Extra OVR in the squad from boosts</span><b>${fmt1(parts.reduce((a,[,v])=>a+v,0))}</b></li>`:`<li class="muted">No boosts have paid out yet this season.</li>`}</ul></div>`; }).join('');
  const sums=[]; for(const t of V1821D.tabs){ try{ const s=t.summary&&t.summary(C); if(s) sums.push(`<button class="v1821d-sum ${s.warn?'warn':''}" data-a="v1821dTab" data-k="${t.id}"><span aria-hidden="true">${t.ico||'•'}</span><span><b>${esc(s.t)}</b><small>${esc(s.s||'')}</small></span></button>`); }catch(e){} }
  return `<section class="card v1821d-gc"><div class="hd"><h3>Growth this season</h3><span class="small muted">Boosts multiply each player's normal growth; nobody passes his potential</span></div>
    <div class="v1821d-gls">${cols}</div>${sums.length?`<div class="v1821d-sums">${sums.join('')}</div>`:''}</section>`; }
{ const _dv=VIEWS.dev; VIEWS.dev=function(){ const C=App.C; const cur=v1821dTabNow(); let body;
    try{ if(cur==='overview') body=v1821dGrowthCard(C)+_dv.apply(this,arguments); else { const t=V1821D.tabs.find(x=>x.id===cur); body=t.render(C); } }catch(e){ console.warn('dev hub',e); body=_dv.apply(this,arguments); }
    return v1821dTabBar(C,cur)+`<div class="v1821d-body">${body}</div>`; }; }
/* player card: what moves this player's growth now */
{ const _mp=MODALS.player; MODALS.player=function(m){ let h=_mp.apply(this,arguments); try{ const C=App.C; const p=C&&C.players[m.id]; if(!p||p.sid!==C.userSid||(m.tab||'overview')!=='overview'||!p.plan) return h;
    const M=v1821dMult(C,p,'tick'); const fk=v1821dFocus(C,p,null); if(!M.parts.length&&!fk) return h;
    const chips=M.parts.map(x=>`<span class="v1821d-fc ${x.m>=1?'up':'dn'}">${esc(x.label)} <b>${x.m>=1?'+':'−'}${Math.round(Math.abs(x.m-1)*100)}%</b></span>`).join('')+(fk?`<span class="v1821d-fc foc">Focus <b>${esc(V1821D_FOC[fk]||fk)}</b></span>`:'');
    const strip=`<div class="v1821d-pstrip"><span class="v1821d-pk">Growth ${M.m>=1?'+':'−'}${Math.round(Math.abs(M.m-1)*100)}%</span>${chips}<button class="v1821d-fc more" data-a="go" data-r="dev">Development</button></div>`;
    const i=h.indexOf('<div class="mbody">'); if(i>=0){ const j=i+'<div class="mbody">'.length; h=h.slice(0,j)+strip+h.slice(j); } }catch(e){ console.warn('v1821d player',e); } return h; }; }
