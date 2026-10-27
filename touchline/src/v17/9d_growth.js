/* ===================== v18.17 GROWTH CHART =====================
   Height is already tracked for every player (p.h now, p.ah adult, p.mat early/average/late, engine growthLeft(age,mat)).
   The chart turns it into curves: measured (the engine's own rule for every age he has lived at your school), projected (the
   same rule ahead), reference curves for a 5'10" adult (early, average, late), the biggest growth years, and Growth Watch
   (sorted by growth still to come). Every height shown is a whole inch: now, projected and "to go" are rounded the same way,
   so they always add up. Squad -> Growth Chart (and a link from Player Development). Identifiers v1817g / V1817G. */
const V1817G={ COL:['#c39bff','#7cc7ff','#ff8f86','#7fdc8a','#f2c14e'], sel:null };
const v1817gIn=h=>Math.round(h);
function v1817gFt(h){ const t=v1817gIn(h); return `${Math.floor(t/12)}'${t%12}"`; }
function v1817gAt(p,age){ return p.ah-growthLeft(age,p.mat); }
/* height at an age: past ages from the rule (never above what he measures now), the current measurement, future from the rule */
function v1817gH(p,age){ if(Math.abs(age-p.age)<1e-6) return p.h; const f=v1817gAt(p,age); return age<p.age?Math.min(f,p.h):Math.max(f,p.h); }
function v1817gLeft(p){ return Math.max(0,v1817gIn(p.ah)-v1817gIn(p.h)); }
function v1817gMat(p){ return p.mat==='late'?'Late bloomer':p.mat==='early'?'Early':'Average'; }
function v1817gGr(g){ return g>=9?['Fr','So','Jr','Sr'][g-9]:g+'th'; }
function v1817gWatch(C,lvl){ return schoolPlayers(C,C.userSid).filter(p=>!lvl||lvl==='all'||p.lvl===lvl).slice().sort((a,b)=>v1817gLeft(b)-v1817gLeft(a)||(b.ah-b.h)-(a.ah-a.h)||(a.id<b.id?-1:1)); }
function v1817gSel(C){ let s=V1817G.sel; if(!s||s.yr!==C.year||s.sid!==C.userSid){ s=V1817G.sel={yr:C.year,sid:C.userSid,lvl:App.params.gl||'all',ids:v1817gWatch(C,App.params.gl).slice(0,5).map(p=>p.id)}; } s.ids=s.ids.filter(id=>C.players[id]); return s.ids; }
function v1817gChart(C,ids){
  const W=900,H=430,L=58,R=70,T=24,B=46; const A0=12,A1=21; /* late bloomers finish at 20.5 (engine growthLeft) */ const ps=ids.map(id=>C.players[id]).filter(Boolean);
  const all=[]; for(const p of ps) for(let a=A0;a<=A1;a+=0.25) all.push(v1817gH(p,a)); for(const m of ['early','average','late']) for(let a=A0;a<=A1;a+=0.5) all.push(70-growthLeft(a,m));
  let lo=Math.floor((Math.min(...all,60)-1)/2)*2, hi=Math.ceil((Math.max(...all,72)+1)/2)*2;
  const X=a=>L+(a-A0)/(A1-A0)*(W-L-R), Y=h=>T+(1-(h-lo)/(hi-lo))*(H-T-B);
  const line=(f,a0,a1,st)=>{ let d=''; for(let a=a0;a<=a1+1e-9;a+=0.1){ d+=(d?'L':'M')+X(a).toFixed(1)+' '+Y(f(a)).toFixed(1); } return d; };
  const band=`<rect class="v1817g-band" x="${X(14).toFixed(1)}" y="${T}" width="${(X(16)-X(14)).toFixed(1)}" height="${H-T-B}"/><text class="v1817g-bandt" x="${((X(14)+X(16))/2).toFixed(1)}" y="${T+16}" text-anchor="middle">Biggest growth years</text>`;
  const gy=[]; for(let h=lo;h<=hi;h+=4) gy.push(`<line x1="${L}" x2="${W-R}" y1="${Y(h).toFixed(1)}" y2="${Y(h).toFixed(1)}"/><text x="${L-10}" y="${(Y(h)+4).toFixed(1)}" text-anchor="end">${v1817gFt(h)}</text>`);
  const gx=[]; for(let a=A0;a<=A1;a++) gx.push(`<line x1="${X(a).toFixed(1)}" x2="${X(a).toFixed(1)}" y1="${T}" y2="${H-B}" class="v"/><text x="${X(a).toFixed(1)}" y="${H-B+20}" text-anchor="middle">${a}</text>`);
  const ref=['early','average','late'].map(m=>`<path class="v1817g-ref" d="${line(a=>70-growthLeft(a,m),A0,A1)}"/>`).join('');
  const labs=[]; const curves=ps.map((p,i)=>{ const col=V1817G.COL[i%5]; const start=Math.max(A0,Math.min(p.age,p.age-Math.max(0,p.grade-7))); /* measured since 7th grade */
    const meas=line(a=>v1817gH(p,a),start,p.age), proj=line(a=>v1817gH(p,a),p.age,A1); labs.push({y:Y(v1817gH(p,A1)),t:v1817gFt(p.ah),col});
    return `<g style="--gc:${col}"><path class="v1817g-m" d="${meas}"/><path class="v1817g-p" d="${proj}"/><g class="v1817g-dot" transform="translate(${X(p.age).toFixed(1)} ${Y(p.h).toFixed(1)})"><circle r="19"/><g transform="translate(-16 -16)">${portraitSVG(p,32)}</g></g></g>`; }).join('');
  labs.sort((a,b)=>a.y-b.y); for(let i=1;i<labs.length;i++) if(labs[i].y-labs[i-1].y<15) labs[i].y=labs[i-1].y+15;
  const lab=labs.map(l=>`<text class="v1817g-end" x="${W-R+10}" y="${(l.y+4).toFixed(1)}" fill="${l.col}">${l.t}</text>`).join('');
  return `<svg class="v1817g-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Height by age for ${ps.length} players"><g class="v1817g-grid">${band}${gy.join('')}${gx.join('')}<text x="${X(A0)}" y="${H-6}" class="v1817g-ax">Age</text></g>${ref}${curves}${lab}</svg>`; }
VIEWS.growth=()=>{ const C=App.C; const gl=App.params.gl||'all'; if(V1817G.sel&&V1817G.sel.lvl!==gl) V1817G.sel=null; const ids=v1817gSel(C); const watch=v1817gWatch(C,gl); const show=watch.slice(0,App.params.all?watch.length:10);
  const row=(p)=>{ const i=ids.indexOf(p.id); const col=i>=0?V1817G.COL[i%5]:'var(--line)'; const left=v1817gLeft(p); const h0=v1817gH(p,12); const pct=Math.round(Math.max(0,Math.min(1,(p.h-h0)/Math.max(0.5,p.ah-h0)))*100);
    return `<button class="v1817g-row ${i>=0?'on':''}" style="--gc:${col}" data-a="v1817gPick" data-id="${p.id}" aria-pressed="${i>=0}">${portraitSVG(p,48)}<span class="v1817g-rt"><span class="v1817g-nm"><b>${esc(pname(p))}</b><i>${v1817gGr(p.grade)} · ${p.pos}</i><i class="mat ${p.mat}">${v1817gMat(p)}</i></span>
      <small>${v1817gFt(p.h)} now · ${v1817gFt(p.ah)} projected · ${left>1?`<b>+${left} in to go</b>`:left===1?'<b>+1 in to go</b> · nearly done growing':'done growing'}</small><span class="v1817g-bar"><i style="width:${pct}%"></i></span></span></button>`; };
  const W=OVR_W; const pct=g=>Math.round((W[g].h||0)*100);
  return `<div class="v1817g"><section class="v1817g-main"><p class="v1817g-lead">Height is tracked for every player. The chart turns it into a curve: who has stopped growing, who is a late bloomer worth waiting for, and when the spurt arrives. Pick up to five players from Growth Watch.</p>
    <div class="v1817g-card">${ids.length?v1817gChart(C,ids):'<div class="empty">Pick a player from Growth Watch to draw his curve.</div>'}</div>
    <div class="v1817g-legend"><span><i class="m"></i>Measured</span><span><i class="p"></i>Projected</span><span><i class="r"></i>Reference curves at 5'10" (early, average, late)</span></div></section>
   <aside class="v1817g-side"><h2>Growth Watch <small>sorted by growth still to come</small></h2>${seg('gl',[['all','All'],['V','Varsity'],['JV','JV'],['MOD','Modified']],gl)}<div class="v1817g-list">${show.map(row).join('')}</div>${watch.length>show.length?`<button class="btn sm ghost" data-a="setParam" data-k="all" data-v="1">Show all ${watch.length} players</button>`:''}
    <div class="v1817g-why"><b>Why it matters</b><p>Height feeds keeper ratings the most (${pct('GK')}% of a keeper's rating), then defenders and forwards (${pct('DEF')}%); midfielders not at all. Early bloomers stop sooner; late bloomers grow most in 10th and 11th grade.</p></div></aside></div>`; };
A.v1817gPick=el=>{ const C=App.C; const ids=v1817gSel(C); const id=el.dataset.id; const i=ids.indexOf(id); if(i>=0) ids.splice(i,1); else { ids.push(id); if(ids.length>5) ids.shift(); } App.keepScroll=true; render(); };
TITLES.growth='Growth Chart'; NAV_ICON.growth='dev'; if(typeof NAV_DESC!=='undefined') NAV_DESC.growth='Height curves, late bloomers, projected height';
{ const i=NAV.findIndex(n=>n[0]==='dev'); if(i>=0&&!NAV.some(n=>n[0]==='growth')) NAV.splice(i+1,0,['growth','Growth Chart']); }
{ const g=TOPNAV.find(t=>t[0]==='squads'); if(g&&!g[3].includes('growth')){ const j=g[3].indexOf('dev'); g[3].splice(j>=0?j+1:g[3].length,0,'growth'); } }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('growth');
/* Player Development: a way in */
{ const _dv=VIEWS.dev; VIEWS.dev=function(){ let h=_dv.apply(this,arguments); try{ const C=App.C; const top=v1817gWatch(C)[0]; if(top){ const card=`<button class="v1817g-cta" data-a="go" data-r="growth"><span class="v1817g-ci">📏</span><span><b>Growth Chart</b><small>${esc(pname(top))} has the most still to come: ${v1817gFt(top.h)} now, ${v1817gFt(top.ah)} projected</small></span><span class="btn sm">Open</span></button>`; h=card+h; } }catch(e){} return h; }; }
/* a late bloomer's big year makes the news */
{ const _ro=rollover; rollover=function(C){ const before={}; try{ for(const p of schoolPlayers(C,C.userSid)) before[p.id]=v1817gIn(p.h); }catch(e){} const r=_ro.apply(this,arguments);
  try{ if(r&&r.ok){ const gr=Object.keys(before).map(id=>C.players[id]).filter(p=>p&&v1817gIn(p.h)-before[p.id]>=3).sort((a,b)=>(v1817gIn(b.h)-before[b.id])-(v1817gIn(a.h)-before[a.id])).slice(0,2);
    for(const p of gr) addNews(C,'program',`${pname(p)} shot up ${v1817gIn(p.h)-before[p.id]} inches over the summer: now ${v1817gFt(p.h)}${p.mat==='late'?', a late bloomer arriving':''}`,C.userSid,{pid:p.id}); } }catch(e){} return r; }; }
