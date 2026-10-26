/* ===================== v18.12 THE STATE POLL, part e: team panel, player seasons ("Across seasons"), virtual player profile ===================== */

/* ---------- player seasons ---------- */
function v1812pTrendSVG(rows,gk){
  const R=rows.filter(r=>r.rt!=null); if(R.length<1) return ''; const W=360,H=132,L=30,Rr=12,T=12,B=24; const n=R.length;
  const pad=n===1?0:34; const X=i=>n===1?(L+(W-L-Rr)/2):L+pad+i/(n-1)*(W-L-Rr-2*pad); const lo=5.5, hi=9.5; const Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const val=r=>gk?r.t.sv:r.ga; const mx=Math.max(1,...R.map(val)); const bw=Math.min(34,(W-L-Rr)/Math.max(n,2)*0.5);
  const bars=R.map((r,i)=>{ const h=(val(r)/mx)*(H-T-B)*0.62; return `<rect class="v1812p-bar" x="${(X(i)-bw/2).toFixed(1)}" y="${(H-B-h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" style="--i:${i}"><title>${r.yr}: ${val(r)} ${gk?'saves':'goals + assists'}</title></rect>`; }).join('');
  const line=R.map((r,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(r.rt).toFixed(1)).join(''); const dots=R.map((r,i)=>`<circle class="v1812p-dot" cx="${X(i).toFixed(1)}" cy="${Y(r.rt).toFixed(1)}" r="3.6" style="--i:${i}"><title>${r.yr}: rating ${r.rt.toFixed(2)}</title></circle>`).join('');
  const grid=[6,7,8,9].map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${L-5}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end">${v}.0</text>`).join('');
  const xl=R.map((r,i)=>`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${r.yr}</text>`).join('');
  return `<svg class="v1812p-chart v1812p-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average rating and ${gk?'saves':'goal involvements'} by season"><g class="v1812p-gl">${grid}${xl}</g>${bars}<path class="v1812p-line" d="${line}" pathLength="1"/>${dots}</svg><div class="v1812p-legend"><span><i class="ln"></i>Average rating</span><span><i class="bar"></i>${gk?'Saves':'Goals + assists'}</span></div>`;
}
function v1812pAcross(C,p){
  const rows=v1812pSeasonRows(C,p); const gk=p.pos==='GK';
  if(!rows.length) return '<div class="empty card">No games recorded yet. Season-by-season stats appear after his first appearance.</div>';
  const V=v1812pCareer(rows,'V'); const hasV=V.seasons>0; const tot=hasV?V:v1812pCareer(rows);
  const kp=(l,v,s)=>`<div class="v1812p-kpi"><span>${l}</span><b>${v}</b>${s?`<em>${s}</em>`:''}</div>`;
  const kpis=gk?[kp('Varsity seasons',tot.seasons),kp('Games',tot.t.gp),kp('Saves',tot.t.sv),kp('Clean sheets',tot.t.cs),kp('Save %',tot.t.sv+tot.t.ga?Math.round(tot.t.sv/(tot.t.sv+tot.t.ga)*100)+'%':'—'),kp('Avg rating',tot.rt==null?'—':tot.rt.toFixed(2))]:
    [kp('Varsity seasons',tot.seasons),kp('Games',tot.t.gp),kp('Goals',tot.t.g,tot.g90.toFixed(2)+' per 90'),kp('Assists',tot.t.a,tot.a90.toFixed(2)+' per 90'),kp('xG',tot.xg==null?'—':tot.xg.toFixed(1),tot.xg==null?'':(tot.t.g-tot.xg>=0?'+':'')+(tot.t.g-tot.xg).toFixed(1)+' vs goals'),kp('Avg rating',tot.rt==null?'—':tot.rt.toFixed(2))];
  const th=gk?['Year','Squad','School','GP','SV','SV%','CS','GA','GA/90','TK','INT','RTG']:['Year','Squad','School','GP','G','A','G+A','TK','INT','RTG','xG','G/90','A/90'];
  const body=rows.map(r=>{ const t=r.t; const sc=v1812pSchool(C,r.sid); const sn=sc?`${crest(sc,16)} ${esc(sc.town)}`:'';
    const cells=gk?[t.gp,t.sv,t.sv+t.ga?Math.round(t.sv/(t.sv+t.ga)*100)+'%':'—',t.cs,t.ga,(t.ga/(t.gp*V1812P.MIN)*90).toFixed(2),t.tk,t.int,r.rt==null?'—':r.rt.toFixed(2)]:
      [t.gp,t.g,t.a,r.ga,t.tk,t.int,r.rt==null?'—':r.rt.toFixed(2),r.xg==null?'—':r.xg.toFixed(1),r.g90.toFixed(2),r.a90.toFixed(2)];
    const tags=[...r.awards.map(a=>`<span class="v1812p-tag aw">${esc(a)}</span>`),...r.honors.map(h=>`<span class="v1812p-tag">${esc(h)}</span>`),...(r.lvl==='V'?v1812pStateHonors(C,p.id,r.yr).map(h=>`<span class="v1812p-tag st">${esc(h)}</span>`):[])];
    return `<tr class="${r.lvl==='V'?'':'minor'}"><td><b>${r.yr}</b></td><td>${LVL_NAME[r.lvl]}</td><td class="v1812p-sch">${sn}</td>${cells.map(c=>`<td class="n">${c}</td>`).join('')}</tr>${tags.length?`<tr class="tags"><td></td><td colspan="${th.length-1}">${tags.join('')}</td></tr>`:''}`; }).join('');
  const foot=hasV&&V.seasons>1?(()=>{ const t=V.t; const cells=gk?[t.gp,t.sv,t.sv+t.ga?Math.round(t.sv/(t.sv+t.ga)*100)+'%':'—',t.cs,t.ga,(t.ga/(t.gp*V1812P.MIN)*90).toFixed(2),t.tk,t.int,V.rt==null?'—':V.rt.toFixed(2)]:[t.gp,t.g,t.a,t.g+t.a,t.tk,t.int,V.rt==null?'—':V.rt.toFixed(2),V.xg==null?'—':V.xg.toFixed(1),V.g90.toFixed(2),V.a90.toFixed(2)]; return `<tr class="tot"><td colspan="3">Varsity career</td>${cells.map(c=>`<td class="n">${c}</td>`).join('')}</tr>`; })():'';
  return `<div class="v1812p-across"><div class="v1812p-kpis">${kpis.join('')}</div>
   <div class="grid g2 v1812p-two"><div class="card"><h3>Season by season</h3><div class="tw"><table class="v1812p-stt"><thead><tr>${th.map((h,i)=>`<th class="${i>2?'n':''}">${h}</th>`).join('')}</tr></thead><tbody>${body}${foot}</tbody></table></div>
     <p class="tiny muted">Regular season and postseason, all squads. Per 90 assumes a full 80-minute game scaled to 90. xG is kept for Varsity games since this feature began; earlier games show a dash.${p.virtual?' This player belongs to a statewide school outside your section: his seasons are simulated from his team’s results.':''}</p></div>
     <div class="card"><h3>Trend</h3>${v1812pTrendSVG(rows.filter(r=>r.lvl==='V'&&r.t.gp),gk)||'<div class="muted small">A trend appears after the first Varsity season.</div>'}</div></div></div>`;
}
{ const _v1812pMP=MODALS.player;
  MODALS.player=m=>{ let h=_v1812pMP(m); try{ const C=App.C; const p=Px(m.id); if(!p) return h; const tab=m.tab||'overview';
    const btn=`<button role="tab" class="tab ${tab==='across'?'on':''}" aria-selected="${tab==='across'}" data-a="modalTab" data-k="ptab" data-v="across"><span class="v1812p-tl">Across seasons</span><span class="v1812p-ts">Seasons</span></button>`;
    h=h.replace(/(<button role="tab"[^>]*data-v="career">Career<\/button>)/,'$1'+btn);
    if(tab==='across') h=h.replace('</div><div class="mfoot">',v1812pAcross(C,p)+'</div><div class="mfoot">'); }catch(e){ console.warn('across',e); } return h; }; }

/* ---------- a statewide player's profile ---------- */
A.v1812pPlayer=el=>{ App.modal={type:'v1812pPlayer',id:el.dataset.id,back:App.modal}; renderModal(); };
MODALS.v1812pPlayer=m=>{
  const C=App.C; const p=v1812pPlayerRec(C,m.id); if(!p) return modalShell('<h2>Player</h2>','<div class="empty">Player not found.</div>');
  const sc=v1812pSchool(C,p.sid); const last=Object.keys(p.st).sort().pop(); const Y=last?+last:C.year;
  const head=`<div class="phead"><span class="ph-face">${portraitSVG(p,72,{c1:sc.c1,c2:sc.c2})}</span><div><div class="eyebrow">${esc(sc.name)} · Section ${v1812pSec(C,p.sid)} · Grade ${p.grade} in ${Y}</div><h2 style="font-size:1.9rem">${esc(p.fn)} ${esc(p.ln)} <span class="mono muted" style="font-size:1.1rem">#${p.num}</span></h2><div class="row small">${posTag(p.pos)}<button class="link" data-a="v1812pTeam" data-id="${p.sid}">${esc(sc.town)} ${esc(sc.mascot)} team page</button></div></div></div>`;
  return modalShell('<h2>Player profile · Statewide</h2>',head+v1812pAcross(C,p),'<button class="btn" data-a="closeModal">Close</button>','wide');
};

/* ---------- team panel ---------- */
A.v1812pTeam=el=>{ App.modal={type:'v1812pTeam',id:el.dataset.id,yr:el.dataset.yr?+el.dataset.yr:null,back:App.modal&&App.modal.type==='v1812pTeam'?App.modal:null}; renderModal(); };
function v1812pRosterRows(C,id,yr){
  const out=[];
  if(v1812pIsLeague(C,id)){ for(const p of squad(C,id,'V')){ const b=seasonBucket(p,yr,'V','reg'); if(b&&b.gp) out.push({id:p.id,virtual:false,name:pname(p),pos:p.pos,num:p.num,s:b,xg:v1812pPlayerXg(C,p,yr)}); } for(const p of Object.values(C.alumni)){ const y=p.st&&p.st[yr]&&p.st[yr].V; if(y&&y.reg&&y.reg.gp&&(y.sid||p.sid)===id) out.push({id:p.id,virtual:false,name:pname(p),pos:p.pos,num:p.num,s:y.reg,xg:v1812pPlayerXg(C,p,yr)}); } }
  else if(v1812pBound(C,yr)>0){ const T=v1812pVTeamSeason(C,id,yr); for(const p of T.starters.concat(T.bench)){ const S=T.stats.get(p.id); if(S&&S.gp) out.push({id:p.id,virtual:true,name:v1812pPlayerName(p),pos:p.pos,num:p.num,s:S,xg:S.xg}); } }
  const order={GK:0,DEF:1,MID:2,FWD:3}; return out.sort((a,b)=>order[a.pos]-order[b.pos]||(b.s.rt/b.s.gp)-(a.s.rt/a.s.gp));
}
MODALS.v1812pTeam=m=>{
  const C=App.C; const id=m.id; const yr=m.yr||C.year; const s=v1812pSchool(C,id); if(!s) return modalShell('<h2>Team</h2>','<div class="empty">Team not found.</div>');
  const row=v1812pTeamRow(C,id,yr); const A=row.A; const polls=v1812pPolls(C,yr); const latest=polls[polls.length-1]; const rk=latest?v1812pRankOf(latest,id):null; const S=v1812pStory(C,id,yr);
  const kp=(l,v,sub,tone)=>`<div class="v1812p-kpi ${tone||''}"><span>${l}</span><b>${v}</b>${sub?`<em>${sub}</em>`:''}</div>`;
  const tb=v1812pTable(C,yr);
  const head=`<div class="v1812p-th" style="--c1:${s.c1};--c2:${s.c2}"><span class="v1812p-thc">${crest(s,84)}</span><div class="grow"><div class="eyebrow">${esc(C.stateName)} · ${row.league?`Section ${C.section} (your league)`:'Section '+row.sec}${id===C.userSid?' · your program':''}</div><h2>${esc(s.name)}</h2><div class="muted">${esc(s.mascot)}</div>
     <div class="row" style="margin-top:8px"><span class="chip ${rk?'acc':''}">${rk?'No. '+rk+' in the State Poll':'Unranked'}</span><span class="chip">${A.w}-${A.d}-${A.l}</span><span class="chip">${yr}</span>${row.league?`<button class="btn sm" data-a="openSchool" data-id="${id}">School profile</button>`:''}</div></div></div>`;
  const kpis=`<div class="v1812p-kpis">${kp('Power',row.power.toFixed(1),'#'+row.prank+' of '+tb.length)}${kp('Proj. seed',row.seed,'in Section '+row.sec)}${kp('Points / game',A.gp?A.ppg.toFixed(2):'—',A.pts+' pts')}${kp('Goal diff',v1812pSgn(A.gd),A.gp?(A.gfpg.toFixed(1)+' for · '+A.gapg.toFixed(1)+' against'):'', A.gd>0?'good':A.gd<0?'bad':'')}${kp('xG diff',A.xgdpg==null?'—':v1812pSgn(+A.xgdpg.toFixed(2)),A.nx?A.xgf.toFixed(1)+' xGF · '+A.xga.toFixed(1)+' xGA':'')}${kp('Strength of schedule',A.sos==null?'—':A.sos.toFixed(1),'avg opponent XI')}${kp('Shots / possession',A.shShare==null?'—':v1812pPct(A.shShare)+' · '+Math.round(A.pos)+'%',A.sh+' shots for · '+A.sha+' against')}${kp('Clean sheets',A.cs,A.gp?v1812pPct(A.csPct)+' of games':'')}</div>`;
  const resume=(g,kind)=>g?`<div class="v1812p-rs ${kind}"><span class="v1812p-rsl">${kind==='win'?'Best win':'Worst loss'}</span>${v1812pCr(C,g.opp,24)}<div class="grow"><b>${g.home?'vs':'at'} ${esc(v1812pName(C,g.opp))}</b><small>${g.orank?'No. '+g.orank+' at the time · ':''}XI ${g.Ro.toFixed(0)}</small></div><b class="mono">${g.gf}–${g.ga}</b></div>`:`<div class="v1812p-rs"><span class="v1812p-rsl">${kind==='win'?'Best win':'Worst loss'}</span><small class="muted">None yet</small></div>`;
  const results=A.games.slice().reverse().map(g=>`<div class="li"><span class="pill v1812p-res ${g.res}">${g.res}</span><span class="mono muted" style="width:26px">R${g.rd+1}</span>${v1812pCr(C,g.opp,18)}<div class="grow trunc small">${g.home?'vs':'at'} ${v1812pTeamBtn(C,g.opp)}${g.orank?` <span class="pill">No. ${g.orank}</span>`:''}</div>${g.xgf!=null?`<span class="tiny muted mono">xG ${g.xgf.toFixed(1)}–${g.xga.toFixed(1)}</span>`:''}<b class="mono">${g.gf}–${g.ga}</b></div>`).join('')||'<div class="muted small">No games yet this season.</div>';
  const R=v1812pRosterRows(C,id,yr); const open=x=>x.virtual?`data-a="v1812pPlayer" data-id="${x.id}"`:`data-a="openPlayer" data-id="${x.id}"`;
  const players=R.length?`<div class="tw"><table><thead><tr><th class="n">#</th><th>Player</th><th>Pos</th><th class="n">GP</th><th class="n">G</th><th class="n">A</th><th class="n">SV</th><th class="n">CS</th><th class="n">TK</th><th class="n">INT</th><th class="n">xG</th><th class="n">RTG</th></tr></thead><tbody>${R.map(x=>`<tr><td class="n">${x.num}</td><td><button class="link" ${open(x)}>${esc(x.name)}</button></td><td>${posTag(x.pos)}</td><td class="n">${x.s.gp}</td><td class="n">${x.s.g}</td><td class="n">${x.s.a}</td><td class="n">${x.pos==='GK'?x.s.sv:''}</td><td class="n">${x.pos==='GK'?x.s.cs:''}</td><td class="n">${x.s.tk}</td><td class="n">${x.s.int}</td><td class="n">${x.xg==null?'—':x.xg.toFixed(1)}</td><td class="n"><b>${(x.s.rt/x.s.gp).toFixed(2)}</b></td></tr>`).join('')}</tbody></table></div><p class="tiny muted">Regular season ${yr}. Tap a player for every season he has played.</p>`:'<div class="muted small">No appearances recorded yet.</div>';
  const body=`${head}${kpis}
   <div class="grid g2 v1812p-two"><div class="card v1812p-season" style="--vt:${v1812pHi(s)}"><div class="v1812p-kick">Season in the poll</div><h3 class="v1812p-head sm">${S.head}</h3>${v1812pChart(C,id,yr,{w:360,h:150})}<div class="row" style="justify-content:space-between;margin-top:6px"><span class="tiny muted">Form</span>${v1812pForm(A.form,5)}</div><div class="row" style="justify-content:space-between;margin-top:6px"><span class="tiny muted">GD trend</span>${v1812pSpark(A.gdRun,120,26)}</div></div>
    <div class="card"><h3>Résumé</h3>${resume(A.best,'win')}${resume(A.worst,'loss')}<h3 style="margin-top:14px">Results</h3><div class="list v1812p-results">${results}</div></div></div>
   <div class="card"><h3>Players</h3>${players}</div>`;
  return modalShell('<h2>Team analytics</h2>',body,'<button class="btn" data-a="closeModal">Close</button>','wide');
};
