/* ===================== v18.12 THE STATE POLL, part d: the State Poll route (Poll / Teams / Players), team and player panels ===================== */
ICON.statepoll='<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/><path d="M13 7l3-3 3 3"/>';
const V1812P_YRS=C=>{ const P=v1812pS(C); const out=[]; for(let y=C.year;y>=P.y0;y--) out.push(y); return out; };
const v1812pCr=(C,id,size)=>crest(v1812pSchool(C,id),size);
const v1812pTeamBtn=(C,id,label,cls)=>`<button class="link ${cls||''}" data-a="v1812pTeam" data-id="${id}">${esc(label==null?v1812pName(C,id):label)}</button>`;
const v1812pSgn=n=>n>0?'+'+n:String(n);
/* a school colour that reads on the current theme's cards (the same recipe as the team tokens) */
function v1812pHi(s){ try{ const tc=themeColors(); const surf=validHex(tc.surface)?tc.surface:'#131c26'; const dark=lum(tc.bg||'#0b1016')<.3; const hi=dark?'#f4f7fa':'#0d1014'; return towards(mascotPalette(s.c1,s.c2).P,hi,3.1,surf); }catch(e){ return s.c1; } }
function v1812pFixed(v,d){ return v==null||isNaN(v)?'—':v.toFixed(d); }
function v1812pPct(v){ return v==null?'—':Math.round(v*100)+'%'; }
function v1812pVoterFace(v,size){ const p={id:'v1812p-'+v.id,fn:v.name.split(' ')[0],ln:v.name.split(' ').slice(1).join(' '),grade:12,num:null}; p.look={...defaultLook(p.id,12),band:0}; return portraitSVG(p,size,{c1:'#26303f',c2:'#d9d2bd'}); }
function v1812pWDL(recs){ let w=0,d=0,l=0; for(const r of recs||[]){ if(r.gf>r.ga) w++; else if(r.gf<r.ga) l++; else d++; } return `${w}-${d}-${l}`; }
function v1812pMv(r){ if(r.nw) return '<span class="v1812p-mv nw">NEW</span>'; if(r.mv>0) return `<span class="v1812p-mv up" title="Up ${r.mv} from No. ${r.prev}">▲${r.mv}</span>`; if(r.mv<0) return `<span class="v1812p-mv dn" title="Down ${-r.mv} from No. ${r.prev}">▼${-r.mv}</span>`; return '<span class="v1812p-mv">–</span>'; }
function v1812pForm(arr,n){ const f=(arr||[]).slice(-(n||5)); return `<span class="v1812p-form" aria-label="Recent form">${f.map(x=>`<i class="${x}">${x}</i>`).join('')||'<em>—</em>'}</span>`; }
function v1812pSpark(run,w,h){ w=w||64; h=h||20; if(!run||run.length<2) return `<svg class="v1812p-spark" width="${w}" height="${h}" aria-hidden="true"></svg>`; const mn=Math.min(0,...run), mx=Math.max(0,...run), sp=(mx-mn)||1;
  const pts=run.map((v,i)=>`${(i/(run.length-1)*(w-4)+2).toFixed(1)},${(h-3-(v-mn)/sp*(h-6)).toFixed(1)}`).join(' '); const z=(h-3-(0-mn)/sp*(h-6)).toFixed(1); const up=run[run.length-1]>=0;
  return `<svg class="v1812p-spark ${up?'up':'dn'}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Cumulative goal difference by game"><line x1="2" x2="${w-2}" y1="${z}" y2="${z}"/><polyline points="${pts}"/></svg>`; }

/* ---------- the rank-by-week chart ---------- */
function v1812pChart(C,sid,yr,opt){
  opt=opt||{}; const S=v1812pStory(C,sid,yr); const n=S.ranks.length; const W=opt.w||380, H=opt.h||176, L=34, Rr=16, T=14, B=26;
  if(!n) return '<div class="muted small">The first poll comes out before the first game.</div>';
  const Y=r=>T+((r||28)-1)/27*(H-T-B); const X=i=>n===1?(L+(W-L-Rr)/2):L+i/(n-1)*(W-L-Rr);
  const grid=[1,5,10,15,20,25,28].map(r=>`<line x1="${L}" x2="${W-Rr}" y1="${Y(r).toFixed(1)}" y2="${Y(r).toFixed(1)}" class="${r===28?'nr':''}"/><text x="${L-6}" y="${(Y(r)+3.5).toFixed(1)}" text-anchor="end">${r===28?'NR':r}</text>`).join('');
  const labelEvery=n>10?2:1; const xl=S.ranks.map((r,i)=>(i%labelEvery===0||i===n-1)?`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${i===0?'P':'W'+i}</text>`:'').join('');
  let d='', area=''; S.ranks.forEach((r,i)=>{ const x=X(i).toFixed(1), y=Y(r).toFixed(1); d+=(i?'L':'M')+x+' '+y; });
  area=n>1?`${d}L${X(n-1).toFixed(1)} ${Y(28).toFixed(1)}L${X(0).toFixed(1)} ${Y(28).toFixed(1)}Z`:'';
  const dots=S.ranks.map((r,i)=>`<circle class="v1812p-dot ${r?'':'nr'}" cx="${X(i).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="${i===n-1?5:3.4}" style="--i:${i}"><title>${i===0?'Preseason':'Week '+i}: ${r?'No. '+r:'Unranked'}${S.notes[i]?' · '+S.notes[i].text:''}</title></circle>`).join('');
  const li=n-1; const note=S.notes[li]; let ann='';
  if(note){ const tx=X(li), ty=Y(S.ranks[li]); const txt=note.text; const w=Math.min(W-L-Rr-4,txt.length*5.6+16); const left=tx+w+6>W-Rr; const bx=left?tx-w-8:tx+8; const by=Math.max(T,Math.min(H-B-18,ty-26));
    ann=`<g class="v1812p-ann" style="--i:${n}"><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="18" rx="9"/><text x="${(bx+w/2).toFixed(1)}" y="${(by+12.5).toFixed(1)}" text-anchor="middle">${esc(txt)}</text></g>`; }
  return `<svg class="v1812p-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rank by week: ${esc(S.head.toLowerCase())}"><defs><linearGradient id="v1812pg${sid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--vt,var(--team-hi,#2f5fb3))" stop-opacity=".34"/><stop offset="1" stop-color="var(--vt,var(--team-hi,#2f5fb3))" stop-opacity="0"/></linearGradient></defs>
   <g class="v1812p-gl">${grid}${xl}</g>${area?`<path class="v1812p-area" d="${area}" fill="url(#v1812pg${sid})"/>`:''}<path class="v1812p-line" d="${d}" pathLength="1"/>${dots}${ann}</svg>`;
}
function v1812pSeasonCard(C,sid,yr){
  const S=v1812pStory(C,sid,yr); const sch=v1812pSchool(C,sid);
  const stat=(l,v,s)=>`<div><span>${l}</span><b>${v}</b>${s?`<em>${s}</em>`:''}</div>`;
  return `<section class="v1812p-card v1812p-season" style="--vt:${v1812pHi(sch)}"><div class="v1812p-kick">${sid===C.userSid?'Your season in the poll':esc(sch.town)+'’s season in the poll'}</div>
   <h3 class="v1812p-head">${S.head}</h3>${v1812pChart(C,sid,yr)}
   <div class="v1812p-stats">${stat('Best',S.best?'No. '+S.best.r:'—',S.best?(S.best.wk===0?'Preseason':'Week '+S.best.wk):'')}${stat('Lowest',S.worst?'No. '+S.worst.r:'—',S.worst?(S.worst.wk===0?'Preseason':'Week '+S.worst.wk):'')}${stat('Weeks ranked',S.weeks+'/'+S.ranks.length,'')}${stat('Top-10 weeks',S.top10,'')}</div></section>`;
}

/* ---------- ranked showdown card (Matchday Center, Overview, State Poll) ---------- */
function v1812pOddsChip(C,f){
  if(!C.settings.odds||f.st==='d') return ''; const o=oddsFor(f.id,true);
  if(!o) return `<span class="v1812p-chip v1812p-odds wait" data-v1812p-od="${f.id}" title="Fictional moneyline">Odds loading…</span>`;
  const ml=moneyline2(o.h,o.a); return `<span class="v1812p-chip v1812p-odds" data-v1812p-od="${f.id}" title="Fictional moneyline from ${o.n} simulations. A draw returns the stake."><b>${ml[0]}</b><i>/</i><b>${ml[1]}</b></span>`;
}
function v1812pShowCard(C,g,o){
  o=o||{}; const f=C.fixtures[g.fid]; if(!f) return ''; const u=C.userSid; const proj=f.st==='s'?v1812pProject(C,f):null;
  let L=f.h, Rg=f.a, rl=g.rh, rr=g.ra, side='h'; if(f.a===u){ L=f.a; Rg=f.h; rl=g.ra; rr=g.rh; side='a'; }
  const projFor=(id,rank)=>{ if(!proj) return ''; const k=id===f.h?'h':'a'; const p=proj[k]; return `<span class="v1812p-chip win" title="If ${esc(v1812pName(C,id))} lose: ${p.loss?'No. '+p.loss:'unranked'} · draw: ${p.draw?'No. '+p.draw:'unranked'}">${id===u?'Win':esc(v1812pName(C,id))+' win'}: ${v1812pProjText(p.win,rank)}</span>`; };
  const team=(id,rank,cls)=>`<div class="v1812p-st ${cls}">${v1812pCr(C,id,o.small?38:52)}<div><span class="v1812p-no">${rank?'NO. '+rank:'UNRANKED'}</span><b>${esc(v1812pName(C,id))}</b></div></div>`;
  const kick=g.kind==='showdown'?'Ranked showdown':'Ranked opponent';
  const fin=f.st==='d'?`<span class="v1812p-chip fin">Final ${f.hg}–${f.ag}</span>`:'';
  const where=f.st==='d'?esc(fixtureLabel(f)):'Friday 7:00 PM';
  const acts=o.noActs?'':f.st==='d'?`<button class="btn sm" data-a="openFixture" data-id="${f.id}">Match report</button>`:
    (f.h===u||f.a===u)?`<button class="btn sm" data-a="openFixture" data-id="${f.id}">Match preview</button>`:`<button class="btn sm" data-a="openFixture" data-id="${f.id}">Preview</button><button class="btn sm pri" data-a="spectate" data-id="${f.id}">▶ Watch live</button>`;
  return `<section class="v1812p-card v1812p-show ${o.cls||''}" style="--hc:${v1812pSchool(C,L).c1};--ac:${v1812pSchool(C,Rg).c1}"><div class="v1812p-kick"><i></i>${kick} · ${where}</div>
   <div class="v1812p-vs">${team(L,rl,'l')}<span class="v1812p-vsm">vs</span>${team(Rg,rr,'r')}</div>
   <div class="v1812p-ven">${esc(f.ven||'')} · ${esc(fixtureLabel(f))}</div>
   <div class="v1812p-chips"><span class="v1812p-chip gotw">${g.kind==='showdown'?'Game of the week in the Matchday Center':'Spotlight game in the Matchday Center'}</span>${fin}${f.st==='s'?projFor(L,rl):''}${f.st==='s'&&L!==u&&!(f.h===u||f.a===u)?projFor(Rg,rr):''}${v1812pOddsChip(C,f)}</div>
   ${acts?`<div class="v1812p-act">${acts}</div>`:''}</section>`;
}
function v1812pVotersCard(C,sid,yr,wk){
  const feat=v1812pFeatured(C,sid,yr,wk); const sch=v1812pSchool(C,sid); if(!feat.length) return '';
  const all=v1812pVoterView(C,sid,yr,wk);
  const row=x=>{ const q=v1812pQuote(C,x.i,sid,yr,wk); return `<div class="v1812p-vt"><span class="v1812p-face">${v1812pVoterFace(x.v,46)}</span><div class="v1812p-vb"><b>${esc(x.v.name)}</b><small>${esc(x.v.outlet)}</small><p>“${esc(q)}”</p></div><div class="v1812p-vr ${x.rank?'':'nr'}" title="${esc(x.v.name)} had ${esc(sch.town)} ${x.rank?'No. '+x.rank:'off the ballot'}"><small>Had you</small><b>${x.rank?'#'+x.rank:'—'}</b></div></div>`; };
  const rest=all.filter(x=>!feat.includes(x));
  return `<section class="v1812p-card v1812p-voters"><div class="v1812p-kick">The voters · where they had ${sid===C.userSid?'you':esc(sch.town)}</div>${feat.map(row).join('')}
   ${rest.length?`<details class="v1812p-more"><summary>All ${all.length} voters</summary>${rest.map(row).join('')}<p class="tiny muted">Seven voters submit a top-25 ballot each week; 25 points for a first-place vote down to 1 for 25th. Each has a lean: ${V1812P_VOTERS.map(v=>esc(v.name.split(' ')[1])+' '+esc(v.bias.toLowerCase())).join('; ')}.</p></details>`:''}</section>`;
}

/* ---------- Poll tab ---------- */
function v1812pRow(C,r,poll,recs,prevPts,me){
  const s=v1812pSchool(C,r.id); const rec=v1812pWDL(recs.get(r.id)); const isMe=r.id===me; const lg=v1812pIsLeague(C,r.id);
  return `<li class="v1812p-row ${isMe?'me':''} ${lg?'lg':''}" data-tid="${r.id}" data-rk="${r.rk}" style="--c1:${s.c1};--c2:${s.c2}"><button class="v1812p-rb" data-a="v1812pTeam" data-id="${r.id}" aria-label="${esc(s.town)}, number ${r.rk}${isMe?', your team':''}">
   <span class="v1812p-rk">${r.rk}</span>${v1812pMv(r)}<span class="v1812p-sh">${crest(s,30)}</span>
   <span class="v1812p-nm"><span class="v1812p-nl"><b>${esc(s.town)}<span class="v1812p-mas"> ${esc(s.mascot)}</span></b>${r.fp?`<em class="v1812p-fp" title="${r.fp} first-place vote${r.fp>1?'s':''}">(${r.fp})</em>`:''}</span><small class="d">${lg?`Section ${C.section}${isMe?' · your program':''}`:'Section '+v1812pSec(C,r.id)}</small><small class="m">${esc(s.mascot)}</small></span>
   <span class="v1812p-rec">${rec}</span><span class="v1812p-pts" data-to="${r.pts}" data-from="${prevPts==null?0:prevPts}">${r.pts}</span></button></li>`;
}
function v1812pTitle(C,p){ return p.wk===V1812P.WEEKS&&(p.yr<C.year||C.phase!=='regular')?p.label+' \u00b7 Final':p.label; }
function v1812pMovers(C,poll,prev){
  if(!prev) return `<section class="v1812p-card v1812p-movers"><div class="v1812p-kick">How it works</div><p class="v1812p-how">Seven voters (coaches, writers, radio hosts and scouts) each submit a top-25 ballot every week. A first-place vote is worth 25 points, 25th place 1. Each voter has a lean, and nobody changes his mind all at once: ballots start from last week’s and move with the results.</p></section>`;
  const rows=poll.rows; const rise=rows.filter(r=>r.mv>0).sort((a,b)=>b.mv-a.mv||a.rk-b.rk)[0]; const fall=rows.filter(r=>r.mv<0).sort((a,b)=>a.mv-b.mv||a.rk-b.rk)[0];
  const nw=rows.filter(r=>r.nw); const cur=new Set(rows.map(r=>r.id)); const out=prev.rows.filter(r=>!cur.has(r.id));
  const line=(lab,cls,html)=>`<div class="v1812p-mvr"><span class="v1812p-mvl ${cls}">${lab}</span><div>${html}</div></div>`; const item=h=>`<span class="v1812p-mvi">${h}</span>`;
  const t=(r)=>`${crest(v1812pSchool(C,r.id),18)} ${v1812pTeamBtn(C,r.id)}`;
  return `<section class="v1812p-card v1812p-movers"><div class="v1812p-kick">This week’s movers</div>
   ${rise?line('Biggest rise','up',`${t(rise)} <b class="v1812p-mv up">▲${rise.mv}</b> <span class="muted">to No. ${rise.rk}</span>`):''}${fall?line('Biggest fall','dn',`${t(fall)} <b class="v1812p-mv dn">▼${-fall.mv}</b> <span class="muted">to No. ${fall.rk}</span>`):''}
   ${nw.length?line('New in','nw',nw.map(r=>item(`${t(r)} <span class="muted">No. ${r.rk}</span>`)).join('')):''}${out.length?line('Dropped out','dn',out.map(r=>item(`${t(r)} <span class="muted">was No. ${r.rk}</span>`)).join('')):''}
   ${!rise&&!fall&&!nw.length&&!out.length?'<div class="muted small">The poll did not move this week.</div>':''}</section>`;
}
function v1812pPollTab(C){
  const yr=C.year; const polls=v1812pPolls(C,yr); const me=C.userSid; if(!polls.length) return '<div class="empty card">The first poll is on its way.</div>';
  let wk=App.params.pw!=null&&App.params.pw!==''?v1812pClamp(+App.params.pw,0,polls.length-1):polls.length-1; const poll=polls[wk]; const prev=polls[wk-1]||null;
  const recs=v1812pRecords(C,yr,wk); const prevPts=new Map(prev?prev.rows.map(r=>[r.id,r.pts]):[]); const from={}; if(prev) for(const r of prev.rows) from[r.id]=r.rk;
  const key=[yr,wk,C.slot||0].join('|');
  const opts_=polls.map((p,i)=>`<option value="${i}" ${i===wk?'selected':''}>${esc(v1812pTitle(C,p))}</option>`).join('');
  const board=`<section class="v1812p-card v1812p-board"><header class="v1812p-bh"><div><span class="v1812p-kick">Poll of ${poll.n} voters</span><h2>${esc(C.stateName)} Varsity <i>·</i> ${esc(v1812pTitle(C,poll))}</h2></div>
    <div class="v1812p-step"><button class="btn sm ghost" data-a="v1812pWeek" data-d="-1" ${wk===0?'disabled':''} aria-label="Previous poll">${icon('chevl',16)}</button><select data-c="v1812pWeekSel" aria-label="Poll week">${opts_}</select><button class="btn sm ghost" data-a="v1812pWeek" data-d="1" ${wk>=polls.length-1?'disabled':''} aria-label="Next poll">${icon('chev',16)}</button></div></header>
    <div class="v1812p-colh"><span>#</span><span></span><span></span><span>School</span><span>W-D-L</span><span>Pts</span></div>
    <ol class="v1812p-rows" data-key="${key}" data-from='${JSON.stringify(from)}'>${poll.rows.map(r=>v1812pRow(C,r,poll,recs,prevPts.has(r.id)?prevPts.get(r.id):0,me)).join('')}</ol>
    <p class="v1812p-ov"><b>Others receiving votes:</b> ${poll.ov.length?poll.ov.map(o=>`${v1812pTeamBtn(C,o.id,v1812pName(C,o.id),'v1812p-olink')} ${o.pts}`).join(', '):'none'}.</p>
    ${v1812pRankOf(poll,me)||poll.ov.some(o=>o.id===me)?'':`<p class="v1812p-ov me"><b>${esc(v1812pName(C,me))}</b> is not on a ballot this week.</p>`}</section>`;
  const sideTop=[]; const gk=v1812pGotw(C,yr,wk);
  if(gk&&(gk.user||gk.kind==='showdown')) sideTop.push(v1812pShowCard(C,gk,{}));
  const side=`<div class="v1812p-side">${v1812pSeasonCard(C,me,yr)}${sideTop.join('')}${v1812pVotersCard(C,me,yr,wk)}${v1812pMovers(C,poll,prev)}</div>`;
  return `<div class="v1812p-grid" data-v1812p-key="${key}">${board}${side}</div>`;
}
A.v1812pWeek=el=>{ const C=App.C; const polls=v1812pPolls(C,C.year); const cur=App.params.pw!=null&&App.params.pw!==''?+App.params.pw:polls.length-1; App.params.pw=v1812pClamp(cur+(+el.dataset.d||0),0,polls.length-1); App.keepScroll=true; render(); };
CH.v1812pWeekSel=el=>{ App.params.pw=+el.value; App.keepScroll=true; render(); };

/* ---------- Teams tab ---------- */
const V1812P_COLS=[
 ['poll','Poll','Rank in the latest poll',r=>r.poll||99,r=>r.poll?'<b>'+r.poll+'</b>':'<span class="muted">NR</span>',1],
 ['rec','W-D-L','Record',r=>r.A.pts+r.A.gd/1000,r=>`${r.A.w}-${r.A.d}-${r.A.l}`,0],
 ['ppg','PPG','Points per game',r=>r.A.ppg,r=>v1812pFixed(r.A.ppg,2),0],
 ['gd','GD','Goal difference',r=>r.A.gd,r=>`<span class="${r.A.gd>0?'good':r.A.gd<0?'bad':''}">${v1812pSgn(r.A.gd)}</span>`,0],
 ['xgf','xGF','Expected goals for, per game',r=>r.A.nx?r.A.xgf/r.A.nx:-9,r=>r.A.nx?v1812pFixed(r.A.xgf/r.A.nx,2):'—',0],
 ['xga','xGA','Expected goals against, per game',r=>r.A.nx?r.A.xga/r.A.nx:99,r=>r.A.nx?v1812pFixed(r.A.xga/r.A.nx,2):'—',1],
 ['xgd','xGD','Expected goal difference, per game',r=>r.A.xgdpg==null?-99:r.A.xgdpg,r=>r.A.xgdpg==null?'—':`<span class="${r.A.xgdpg>0?'good':r.A.xgdpg<0?'bad':''}">${v1812pSgn(+r.A.xgdpg.toFixed(2))}</span>`,0],
 ['sh','Shot %','Share of all shots taken',r=>r.A.shShare==null?-1:r.A.shShare,r=>v1812pPct(r.A.shShare),0],
 ['pos','Poss.','Average possession',r=>r.A.pos==null?-1:r.A.pos,r=>r.A.pos==null?'—':Math.round(r.A.pos)+'%',0],
 ['cs','CS %','Clean-sheet rate',r=>r.A.csPct,r=>v1812pPct(r.A.gp?r.A.csPct:null),0],
 ['sos','SOS','Strength of schedule: the average opponent starting-XI rating',r=>r.A.sos==null?-1:r.A.sos,r=>v1812pFixed(r.A.sos,1),0],
 ['power','Power','Power rating on the starting-XI scale: results shrunk toward the team’s XI rating',r=>r.power,r=>`<b>${r.power.toFixed(1)}</b>`,0],
 ['seed','Seed','Projected finish in its section',r=>r.seed,r=>`${r.seed}${r.A.gp<14?'<small>proj</small>':''}`,1]
];
function v1812pFilterRows(C,rows,P){
  const sec=P.tsec||'all', rk=P.trk||'all', q=(P.tq||'').trim().toLowerCase();
  return rows.filter(r=>{ if(sec==='mine'&&!r.league) return false; if(sec!=='all'&&sec!=='mine'&&String(r.sec)!==String(sec)) return false; if(rk==='ranked'&&!r.poll) return false; if(q){ const s=v1812pSchool(C,r.id); if(!(s.town+' '+s.mascot+' '+s.name).toLowerCase().includes(q)) return false; } return true; });
}
function v1812pSortRows(rows,P){ const k=P.ts||'power'; const col=V1812P_COLS.find(c=>c[0]===k); const dir=P.td?(P.td==='a'?1:-1):(col?(col[5]?1:-1):-1);
  const f=col?col[3]:(r=>r.power); return rows.slice().sort((a,b)=>(f(a)-f(b))*dir||(b.power-a.power)||(a.id<b.id?-1:1)); }
function v1812pTeamRows(C,rows,me){
  return rows.map(r=>{ const s=v1812pSchool(C,r.id);
    return `<tr class="${r.id===me?'me':''} ${r.league?'lg':''}" data-tid="${r.id}"><td class="v1812p-t1"><button class="v1812p-tb" data-a="v1812pTeam" data-id="${r.id}"><span class="v1812p-pr">${r.prank}</span>${crest(s,22)}<span class="v1812p-tn"><b>${esc(s.town)}</b><small>${esc(s.mascot)} · ${r.league?'Sec. '+C.section+' · yours':'Sec. '+r.sec}</small></span></button></td>
     ${V1812P_COLS.map(c=>`<td class="n ${c[0]==='power'?'pw':''}">${c[4](r)}</td>`).join('')}<td>${v1812pForm(r.A.form,5)}</td><td>${v1812pSpark(r.A.gdRun,60,20)}</td></tr>`; }).join('');
}
function v1812pTeamsTab(C){
  const P=App.params; const yr=P.tyr?+P.tyr:C.year; const rows=v1812pTable(C,yr); const me=C.userSid; const sort=P.ts||'power';
  const secs=['all','mine',...V1812P.SECS.map(String)]; const secLab={all:'All sections',mine:`My section (${C.section})`};
  const shown=v1812pSortRows(v1812pFilterRows(C,rows,P),P);
  const th=V1812P_COLS.map(c=>`<th class="n"><button class="v1812p-sortb ${sort===c[0]?'on':''}" data-a="v1812pSort" data-k="${c[0]}" title="${esc(c[2])}">${c[1]}${sort===c[0]?`<i>${(P.td?(P.td==='a'):(c[5]))?'▲':'▼'}</i>`:''}</button></th>`).join('');
  return `<div class="v1812p-filters"><label class="v1812p-f"><span>Season</span><select data-c="v1812pYr" data-k="tyr" aria-label="Season">${V1812P_YRS(C).map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('')}</select></label>
    <label class="v1812p-f"><span>Section</span><select data-c="v1812pFil" data-k="tsec" aria-label="Section">${secs.map(s=>`<option value="${s}" ${String(P.tsec||'all')===s?'selected':''}>${esc(secLab[s]||'Section '+s)}</option>`).join('')}</select></label>
    <label class="v1812p-f"><span>Poll</span><select data-c="v1812pFil" data-k="trk" aria-label="Poll status"><option value="all" ${(P.trk||'all')==='all'?'selected':''}>Everyone</option><option value="ranked" ${P.trk==='ranked'?'selected':''}>Top 25 only</option></select></label>
    <label class="v1812p-f grow"><span>Find a school</span><input type="search" placeholder="Name or mascot" value="${esc(P.tq||'')}" data-v1812p-q="1" aria-label="Find a school" autocomplete="off"></label>
    <span class="v1812p-count tiny muted"><b id="v1812p-n">${shown.length}</b> of ${rows.length} schools</span></div>
   <div class="v1812p-card v1812p-tcard"><div class="tw v1812p-tw"><table class="v1812p-tt"><thead><tr><th class="v1812p-t1">Team <small class="muted">(power rank)</small></th>${th}<th>Form</th><th>GD trend</th></tr></thead><tbody id="v1812p-tb">${v1812pTeamRows(C,shown,me)}</tbody></table></div>
   <p class="tiny muted v1812p-note">Every school in ${esc(C.stateName)}: your Section ${C.section} plays the real engine; the other ${V1812P.SECS.length} sections are simulated on the same scale (about ${V1812P.GM*2} goals a game, ${V1812P.SLOPE*2} goals of margin per rating point). xG, shot share and possession come from each game’s shot log. Power starts from the starting-XI rating and moves with goal difference and opponents; the seed projects the section finish from the remaining schedule.</p></div>`;
}
A.v1812pSort=el=>{ const P=App.params; const k=el.dataset.k; const col=V1812P_COLS.find(c=>c[0]===k); const cur=P.ts||'power'; if(cur===k){ const was=P.td||(col&&col[5]?'a':'d'); P.td=was==='a'?'d':'a'; } else { P.ts=k; delete P.td; } App.keepScroll=true; render(); };
CH.v1812pYr=el=>{ App.params[el.dataset.k]=el.value; App.keepScroll=true; render(); };
CH.v1812pFil=el=>{ App.params[el.dataset.k]=el.value; App.keepScroll=true; render(); };
document.addEventListener('input',e=>{ const el=e.target.closest&&e.target.closest('[data-v1812p-q]'); if(!el||!App.C) return; App.params.tq=el.value; const C=App.C; const P=App.params; const yr=P.tyr?+P.tyr:C.year;
  const rows=v1812pSortRows(v1812pFilterRows(C,v1812pTable(C,yr),P),P); const tb=document.getElementById('v1812p-tb'); if(tb) tb.innerHTML=v1812pTeamRows(C,rows,C.userSid); const n=document.getElementById('v1812p-n'); if(n) n.textContent=rows.length; });

/* ---------- Players tab ---------- */
function v1812pPlayersTab(C){
  const P=App.params; const yr=P.pyr?+P.pyr:C.year; const key=P.pb||'g'; const scope=P.psc||'state'; const bound=v1812pBound(C,yr);
  const def=V1812P_BOARDS.find(b=>b[0]===key)||V1812P_BOARDS[0]; const list=v1812pBoard(C,yr,def[0],scope,25); const me=C.userSid;
  const fmtv=x=>def[0]==='rt'?x.v.toFixed(2):x.v;
  const pod=list.slice(0,3), rest=list.slice(3);
  const open=x=>x.virtual?`data-a="v1812pPlayer" data-id="${x.id}"`:`data-a="openPlayer" data-id="${x.id}"`;
  const face=(x,sz)=>{ if(!x.virtual){ const p=findPerson(C,x.id); return p?portraitSVG(p,sz):''; } const p=v1812pPlayerRec(C,x.id); return p?portraitSVG(p,sz,{c1:v1812pSchool(C,x.sid).c1,c2:v1812pSchool(C,x.sid).c2}):''; };
  const podium=pod.length?`<div class="v1812p-pod">${[1,0,2].filter(i=>pod[i]).map(i=>{ const x=pod[i]; const sc=v1812pSchool(C,x.sid); return `<button class="v1812p-pp p${i+1} ${x.sid===me?'mine':''}" style="--c1:${sc.c1};--c2:${sc.c2}" ${open(x)}><span class="v1812p-prk">${x.rk}</span><span class="v1812p-pface">${face(x,i===0?92:72)}</span><b>${esc(x.name)}</b><span class="v1812p-psc">${crest(sc,16)} ${esc(sc.town)} · ${x.pos}</span><span class="v1812p-pv">${fmtv(x)}</span><small>${esc(x.sub)}</small></button>`; }).join('')}</div>`:'';
  const rows=rest.map(x=>{ const sc=v1812pSchool(C,x.sid); return `<li class="v1812p-lr ${x.sid===me?'mine':''}"><button ${open(x)}><b class="v1812p-lrk">${x.rk}</b><span class="v1812p-lf">${face(x,30)}</span>${crest(sc,18)}<span class="v1812p-ln"><b>${esc(x.name)}</b><small>${esc(sc.town)} · ${x.pos}</small></span><small class="v1812p-lsub">${esc(x.sub)}</small><b class="v1812p-lv">${fmtv(x)}</b></button></li>`; }).join('');
  return `<div class="v1812p-filters"><label class="v1812p-f"><span>Season</span><select data-c="v1812pYr" data-k="pyr" aria-label="Season">${V1812P_YRS(C).map(y=>`<option value="${y}" ${y===yr?'selected':''}>${y}</option>`).join('')}</select></label>
    <div class="v1812p-f"><span>Scope</span>${seg('psc',[['state','Whole state'],['league','My section']],scope)}</div>
    <div class="v1812p-f grow"><span>Leaderboard</span>${seg('pb',V1812P_BOARDS.map(b=>[b[0],b[1].split(' ')[0]==='Goal'?'G+A':b[1]]),def[0])}</div></div>
   <div class="v1812p-card v1812p-lcard"><div class="v1812p-bh"><div><span class="v1812p-kick">${yr} regular season · ${scope==='state'?'all '+esc(C.stateName)+' schools':'Section '+C.section}</span><h2>${esc(def[1])}</h2></div><span class="chip">${esc(def[2])}</span></div>
   ${list.length?podium+`<ol class="v1812p-list">${rows}</ol>`:`<div class="empty">${bound?'Nobody qualifies yet.':'The season has not started.'}</div>`}
   <p class="tiny muted v1812p-note">${def[0]==='rt'?'Average match rating, minimum five games. ':''}Statewide players outside your section are simulated from their team’s season; tap anyone for every season they have played.</p></div>`;
}

/* ---------- the route ---------- */
VIEWS.statepoll=()=>{
  const C=App.C; v1812pSync(C); const P=v1812pS(C); const tab=App.params.pt||'poll'; const polls=P.polls[C.year]||[]; if(polls.length) P.seen[C.year+':'+(polls.length-1)]=1;
  const intro=!P.seen.intro; P.seen.intro=1;
  const hero=`<section class="v1812p-hero"><div><span class="v1812p-kick">Statewide · ${esc(C.stateName)}${intro?' · <b class="v1812p-new">New</b>':''}</span><p>A weekly ${esc(C.stateName)} top 25 voted by coaches and writers. Climb it all season; a ranked showdown becomes the game of the week.</p></div>
   <div class="v1812p-tabs">${tabs('pt',[['poll','Poll'],['teams','Teams'],['players','Players']],tab)}</div></section>`;
  const body=tab==='teams'?v1812pTeamsTab(C):tab==='players'?v1812pPlayersTab(C):v1812pPollTab(C);
  return `<div class="v1812p" data-tab="${tab}">${hero}${body}</div>`;
};
TITLES.statepoll="The State Poll"; NAV_ICON.statepoll='statepoll'; NAV_DESC.statepoll='Statewide top 25, team analytics and player stats';
{ const i=NAV.findIndex(n=>n[0]==='league'); if(i>=0&&!NAV.some(n=>n[0]==='statepoll')) NAV.splice(i+1,0,['statepoll','State Poll']); }
{ const g=TOPNAV.find(t=>t[0]==='league'); if(g&&!g[3].includes('statepoll')) g[3].splice(1,0,'statepoll'); }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('statepoll');
{ const _v1812pNB=navBadges; navBadges=function(C){ const b=_v1812pNB.apply(this,arguments); try{ const P=C.poll; const n=P&&P.polls[C.year]?P.polls[C.year].length:0; if(n&&App.route!=='statepoll'&&!P.seen[C.year+':'+(n-1)]&&C.phase!=='offseason') b.statepoll='NEW'; }catch(e){} return b; }; }
