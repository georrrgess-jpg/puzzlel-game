/* ===================== v18.14 THE STATE POLL, part g: one state (bigger poll, playoff opponents from the poll) =====================
   - The poll ranks a top 50 (V1812P.TOP) from a bigger state: four more simulated sections (12-15), so 120 schools in all.
   - Programs have a level they come back to: each simulated section has one power program (base 82), one contender (77) and six
     others (69). A team's rating drifts toward its base each season instead of the state average, so powers stay powers.
     Old saves get the bases from the season after they load (history is unchanged) and the new sections are added.
   - The schools you play outside your league are poll schools: the Preseason Cup draws three of them near the rating it wants,
     Regionals is the Section 6 champion and the other seven State Tournament places go to the best-ranked section champions.
     Their Varsity takes the school's name, colours, crest, rating for that year and the names of its poll players.
   - This is the one part of the poll that changes games (who you play); V1814.on=false turns it off (test/poll.js does, to keep
     checking that the rest of the poll is presentation only). All identifiers are prefixed v1814 / V1814. */
const V1814={ on:true, NEW:[12,13,14,15], BASE:{power:82,cont:77,rest:69}, SD:{power:2,cont:2,rest:3.5} };
V1812P.TOP=50;
for(const s of V1814.NEW) if(!V1812P.SECS.includes(s)) V1812P.SECS.push(s);

/* ---------- the pool: tiered programs ---------- */
function v1814Team(r,used,id,sec,tier){ const idt=genIdentity(r,used); const mk=MASCOT_KEYS[Math.floor(r()*MASCOT_KEYS.length)]; const mascot=pick(r,MASCOT_BY[mk].alt); const cp=pick(r,COLOR_PAIRS);
  const B=V1814.BASE[tier]; const R=v1812pClamp(B+gauss(r)*V1814.SD[tier],58,85);
  return {id,town:idt.town,name:idt.name,mk,mascot,c1:cp[0],c2:cp[1],sec,R:Math.round(R*100)/100,B,tier,pres:Math.round(v1812pClamp(30+(R-58)*2.4+gauss(r)*8,5,98))}; }
function v1814Sec(r,used,teams,sec){ const tiers=shuffle(r,['power','cont','rest','rest','rest','rest','rest','rest']); for(const t of tiers) teams.push(v1814Team(r,used,'vt'+(teams.length+1),sec,t)); }
function v1814Sig(teams){ return v1812pHash(teams.map(t=>t.id+t.town+t.R+(t.B||'')).join(',')); }
v1812pMakePool=function(C){
  const r=v1812pRng(C,'pool'); const used=new Set(C.league.map(id=>C.schools[id].town)); const teams=[]; /* league towns only: the pool must not depend on when it is first built */
  for(const sec of V1812P.SECS) v1814Sec(r,used,teams,sec);
  return {teams,sig:v1814Sig(teams),v14:1,bY:0};
};
/* an older pool: new sections are added and every school gets a base from next season on */
function v1814Upgrade(C,P){
  const pool=P.pool; const r=v1812pRng(C,'pool14'); const used=new Set([...Object.values(C.schools).map(s=>s.town),...pool.teams.map(t=>t.town)]);
  const have=new Set(pool.teams.map(t=>t.sec));
  for(const sec of V1812P.SECS) if(!have.has(sec)){ const add=[]; v1814Sec(r,used,add,sec); add.forEach(t=>{ t.id='vt'+(pool.teams.length+1); pool.teams.push(t); }); }
  for(const sec of V1812P.SECS){ const ts=pool.teams.filter(t=>t.sec===sec&&t.B==null).sort((a,b)=>b.R-a.R||(a.id<b.id?-1:1)); ts.forEach((t,i)=>{ t.tier=i===0?'power':i===1?'cont':'rest'; t.B=V1814.BASE[t.tier]; }); }
  pool.v14=1; pool.bY=C.year+1; pool.sig=v1814Sig(pool.teams); v1812pMem.cmp.clear();
}
{ const _s=v1812pS; v1812pS=function(C){ const P=_s.apply(this,arguments); if(P.pool&&!P.pool.v14) v1814Upgrade(C,P); return P; }; }
v1812pVR=function(C,vid,yr){
  const P=v1812pS(C); const k=P.pool.sig+'|'+vid+'|'+yr; let v=v1812pMem.vr.get(k); if(v!=null) return v;
  const t=v1812pPoolMap(C).get(vid); let R=t.R; const bY=P.pool.bY||0;
  for(let y=P.y0+1;y<=yr;y++){ const r=v1812pRng(C,'vr',vid,y); const base=t.B!=null&&y>=bY?t.B:70.2; R=0.72*R+0.28*base+gauss(r)*2; }
  v=Math.round(v1812pClamp(R,56,85)*100)/100; v1812pMem.vr.set(k,v); return v;
};

/* ---------- section champions and the State Tournament field ---------- */
function v1814Table(C,yr,sec){
  const vs=v1812pVSeason(C,yr); const rows=[];
  for(const t of v1812pS(C).pool.teams){ if(t.sec!==sec) continue; const a=vs.rec.get(t.id)||[]; let pts=0,gf=0,ga=0,w=0,d=0,l=0; for(const x of a){ gf+=x.gf; ga+=x.ga; if(x.gf>x.ga){ pts+=3; w++; } else if(x.gf===x.ga){ pts++; d++; } else l++; }
    rows.push({id:t.id,pts,gf,ga,gd:gf-ga,w,d,l}); }
  return rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||(a.id<b.id?-1:1));
}
function v1814Champ(C,yr,sec){ const t=v1814Table(C,yr,sec); return t.length?t[0].id:null; }
/* the seven other State Tournament places: section champions (not Section 6, which plays Regionals) by the final poll, then power */
function v1814Field(C,yr){
  const polls=v1812pPolls(C,yr); const last=polls.length?polls[polls.length-1]:null; const rk=v1812pRankMap(last);
  const ch=V1812P.SECS.filter(s=>s!==6).map(s=>v1814Champ(C,yr,s)).filter(Boolean);
  const pw=new Map(); try{ for(const r of v1812pTable(C,yr)) pw.set(r.id,r.power); }catch(e){}
  return ch.sort((a,b)=>(rk.get(a)||999)-(rk.get(b)||999)||(pw.get(b)||v1812pVR(C,b,yr))-(pw.get(a)||v1812pVR(C,a,yr))||(a<b?-1:1)).slice(0,7);
}

/* ---------- a poll school's Varsity, for real ---------- */
function v1814St(C){ const S=C.v1814||(C.v1814={}); return S[C.year]||(S[C.year]={pre:[],rgn:null,st:[],ext:{}}); }
function v1814Dress(C,s,vid,target){
  const t=v1812pPoolMap(C).get(vid); const old=s.town;
  Object.assign(s,{town:t.town,name:t.name,mk:t.mk,mascot:t.mascot,c1:t.c1,c2:t.c2,prestige:t.pres,section:'Section '+t.sec,vid});
  if(s.stadium&&s.stadium.name) s.stadium.name=s.stadium.name.split(old).join(t.town);
  fitTeam(C,s.id,Math.min(POST_CAP,target));
  /* the poll players become the real roster: best with best, position by position */
  const vr=v1812pVRoster(C,vid,C.year); const used=new Set();
  for(const g of GROUPS){ const real=squad(C,s.id,'V').filter(p=>p.pos===g).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1)); const virt=vr.filter(p=>p.pos===g).sort((a,b)=>v1812pVOv(b,C.year)-v1812pVOv(a,C.year)||(a.id<b.id?-1:1));
    real.forEach((p,i)=>{ const q=virt[i]; if(!q) return; p.fn=q.fn; p.ln=q.ln; p.grade=v1812pVGrade(q,C.year); p.vpid=q.id; if(!used.has(q.num)){ p.num=q.num; } used.add(p.num); }); }
  return s;
}
function v1814PickPre(C,target,S){
  const r=v1812pRng(C,'v1814pre',C.year,S.pre.length); const yr=C.year;
  const last=S.pre.length===2; const T=last?target+4:target; /* the Cup's last game is against one of the state's best programs */
  const cand=v1812pS(C).pool.teams.filter(t=>!S.pre.includes(t.id)&&(!last||t.tier==='power'||t.tier==='cont')).map(t=>({id:t.id,d:Math.abs(v1812pVR(C,t.id,yr)-T)+r()*0.01})).sort((a,b)=>a.d-b.d).slice(0,4);
  return cand.length?cand[Math.floor(r()*cand.length)].id:null;
}
const _v1814Ext=genExt;
genExt=function(C,target,tag,hint){
  const s=_v1814Ext.apply(this,arguments); if(!V1814.on||!C.league||!C.league.length) return s;
  try{ const S=v1814St(C); const yr=C.year; let vid=null, T=target;
    if(tag==='pre'){ vid=v1814PickPre(C,target,S); if(vid){ S.pre.push(vid); T=v1812pVR(C,vid,yr); } }
    else if(tag==='post'&&hint==='Section 6'){ vid=v1814Champ(C,yr,6); if(vid){ S.rgn=vid; T=v1812pVR(C,vid,yr)+diffOffset(C); } }
    else if(tag==='post'){ if(!S.field) S.field=v1814Field(C,yr); vid=S.field[S.st.length]||null; if(vid){ S.st.push(vid); T=v1812pVR(C,vid,yr)+diffOffset(C); } }
    if(vid){ S.ext[s.id]=vid; v1814Dress(C,s,vid,T); }
  }catch(e){ console.warn('v1814 link',e); }
  return s;
};

/* ---------- who they are, in the news ---------- */
function v1814Rank(C,id,yr){ try{ const pl=v1812pPolls(C,yr); return v1812pRankOf(pl[pl.length-1],id); }catch(e){ return null; } }
function v1814Desc(C,vid,yr){ const t=v1812pPoolMap(C).get(vid); const rk=v1814Rank(C,vid,yr); return `${t.town} (${rk?'No. '+rk+', ':''}Section ${t.sec})`; }
function v1814PreRes(C,vid,yr){ const S=(C.v1814||{})[yr]; if(!S) return null; const sid=Object.keys(S.ext).find(k=>S.ext[k]===vid); if(!sid) return null; const f=Object.values(C.fixtures).find(x=>x.yr===yr&&x.comp==='pre'&&(x.h===sid||x.a===sid)); if(!f||f.st!=='d') return null; const us=f.h===C.userSid?0:1; const gf=us?f.ag:f.hg, ga=us?f.hg:f.ag; return {gf,ga,res:gf>ga?'beat':gf<ga?'lost to':'drew with'}; }
{ const _adv=advance; advance=function(C){ const ph=C.phase; const ev=_adv.apply(this,arguments);
  try{ if(V1814.on&&C.phase!==ph){ const S=(C.v1814||{})[C.year]; const yr=C.year;
    if(S&&C.phase==='regional'&&S.rgn){ addNews(C,'playoffs',`Regional final: ${C.schools[C.post.secChamp].town} meet Section 6 champions ${v1814Desc(C,S.rgn,yr)}`,C.post.secChamp); }
    if(S&&C.phase==='states'&&S.st.length){ addNews(C,'playoffs',`State Tournament field: ${S.st.map(v=>v1814Desc(C,v,yr)).join(', ')} join ${C.schools[C.post.rgnChamp].town}`,C.post.rgnChamp);
      if(C.post.rgnChamp===C.userSid){ for(const v of S.st.filter(v=>S.pre.includes(v))){ const pr=v1814PreRes(C,v,yr); addNews(C,'playoffs',`A Preseason Cup rematch is possible at States: ${C.schools[C.userSid].town} ${pr?pr.res+' '+v1812pName(C,v)+' '+pr.gf+'-'+pr.ga:'met '+v1812pName(C,v)} in the summer`,C.userSid); } } } } }catch(e){ console.warn('v1814 news',e); }
  return ev; }; }
{ const _ss=seasonStart; seasonStart=function(C){ const r=_ss.apply(this,arguments); try{ const S=(C.v1814||{})[C.year]; if(V1814.on&&S&&S.pre.length===3) addNews(C,'preseason',`Preseason Cup draw: ${S.pre.map(v=>v1814Desc(C,v,C.year)).join(', ')}`,C.userSid); }catch(e){} return r; }; }
/* a fixture against a poll school shows its poll rank in the preview and on the schedule */
function v1814VidOf(C,sid){ const s=C.schools[sid]; return s&&s.vid||null; }
