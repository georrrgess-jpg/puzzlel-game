/* ===================== v18.12 THE STATE POLL, part b: voters, ballots, polls, Game of the Week, season story, quotes ===================== */
/* Seven voters. w = what each cares about (z-scores across the 64 teams): R starting-XI rating, PRES prestige, PPG points per game,
   GD goal difference, ATT goals for, DEF goals against, REC the last three games, SOS strength of schedule, WIN win percentage,
   Q wins over ranked teams, XG expected-goal difference. loc = hometown pride (+ to the user's school, a third of it to its section). */
const V1812P_VOTERS=[
 {id:'courier',name:'Dana Whitlock',outlet:'Courier sports desk',kind:'Hometown writer',bias:'Loves a hometown story',w:{R:.28,PRES:.1,WIN:.32,REC:.22,GD:.14,PPG:.1},loc:.36,noise:.34,inert:.34},
 {id:'coaches',name:'Ray Tolliver',outlet:'State coaches association',kind:'Coaches poll',bias:'Respects defense and schedule',w:{R:.2,PRES:.06,DEF:.36,SOS:.3,PPG:.18,Q:.12},loc:0,noise:.22,inert:.42},
 {id:'radio',name:'Marcus Delgado',outlet:'Sports talk radio',kind:'Radio host',bias:'Chases the hot team',w:{R:.12,REC:.44,ATT:.3,GD:.2,WIN:.1},loc:0,noise:.5,inert:.2},
 {id:'weekly',name:'Priya Nair',outlet:'Statewide Soccer Weekly',kind:'Analytics writer',bias:'Loves goal difference',w:{R:.16,GD:.44,XG:.26,ATT:.08,DEF:.08},loc:0,noise:.2,inert:.36},
 {id:'tribune',name:'Gene Hargrove',outlet:'Metro Tribune',kind:'Veteran columnist',bias:'Overrates records',w:{R:.12,WIN:.5,PPG:.34,REC:.1},loc:0,noise:.26,inert:.4},
 {id:'insider',name:'Tess Okafor',outlet:'Prep Insider',kind:'Podcast host',bias:'Wants a résumé',w:{R:.2,Q:.4,SOS:.3,PPG:.14},loc:0,noise:.24,inert:.3},
 {id:'scout',name:'Walt Brennan',outlet:'Blue Ridge Preps',kind:'Talent scout',bias:'Trusts talent over results',w:{R:.56,PRES:.1,DEF:.2,PPG:.12},loc:0,noise:.16,inert:.46}
];
const V1812P_PERF=['PPG','GD','ATT','DEF','REC','SOS','WIN','Q','XG'];
function v1812pRankMap(poll){ const m=new Map(); if(poll) for(const r of poll.rows) m.set(r.id,r.rk); return m; }
function v1812pLabel(wk){ return wk===0?'Preseason':'Week '+wk; }

/* z-scored features for every team */
function v1812pFeatures(C,yr,wk,recs,prevRank,priorRank){
  const ids=v1812pAllIds(C); const Rof=id=>v1812pRating(C,id,yr); const F=new Map();
  for(const id of ids){ const A=v1812pAgg(recs.get(id)||[],Rof,prevRank?(o=>prevRank.get(o)||null):null); F.set(id,{A,R:Rof(id),PRES:v1812pPrestige(C,id),PRIOR:priorRank&&priorRank.get(id)?(26-priorRank.get(id)):0}); }
  const meanR=v1812pAvg(ids.map(i=>F.get(i).R));
  const raw=(f,k)=>{ const A=f.A; switch(k){ case 'R':return f.R; case 'PRES':return f.PRES; case 'PRIOR':return f.PRIOR; case 'PPG':return A.ppg; case 'GD':return A.gdpg; case 'ATT':return A.gfpg; case 'DEF':return -A.gapg; case 'REC':return A.last3*0.35+A.last3gd*0.65; case 'SOS':return A.sos==null?meanR:A.sos; case 'WIN':return A.winPct; case 'Q':return A.qw; case 'XG':return A.xgdpg!=null?A.xgdpg:A.gdpg; } return 0; };
  const Z=new Map(); for(const id of ids) Z.set(id,{});
  for(const k of ['R','PRES','PRIOR',...V1812P_PERF]){
    const use=(k==='R'||k==='PRES'||k==='PRIOR')?ids:ids.filter(i=>F.get(i).A.gp>0);
    const vals=use.map(i=>raw(F.get(i),k)); const m=v1812pAvg(vals); const sd=Math.sqrt(v1812pAvg(vals.map(v=>(v-m)*(v-m))))||1;
    for(const id of ids){ const f=F.get(id); const isPerf=V1812P_PERF.includes(k); Z.get(id)[k]=(isPerf&&f.A.gp===0)?0:(raw(f,k)-m)/sd; } }
  return {F,Z};
}
function v1812pBallot(C,yr,wk,voter,Z,prevBal,userId){
  const g=wk/(wk+2.5); const w=voter.w; const scores=[];
  const prevPos=new Map(); if(prevBal) prevBal.forEach((id,i)=>prevPos.set(id,i+1));
  for(const [id,z] of Z){
    let s=(w.R||0)*(1-0.7*g)*z.R+(w.PRES||0)*(1-g)*z.PRES+0.14*(1-g)*z.PRIOR;
    for(const k of V1812P_PERF) if(w[k]) s+=w[k]*g*z[k];
    if(voter.loc){ if(id===userId) s+=voter.loc; else if(v1812pIsLeague(C,id)) s+=voter.loc*0.33; }
    if(prevBal){ const pp=prevPos.get(id); s+=voter.inert*(pp?((26-pp)/25*2.6-0.5):-0.95); }
    const r=v1812pRng(C,'n',yr,wk,voter.id,id); s+=gauss(r)*voter.noise*(1-0.3*g)*0.9;
    scores.push([id,s]); }
  scores.sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1));
  return scores.slice(0,V1812P.TOP).map(x=>x[0]);
}
/* one poll. prev = the previous poll of the same season (or null), prior = the last poll of the season before (or null) */
function v1812pBuild(C,yr,wk,prev,prior,recs){
  const prevRank=prev?v1812pRankMap(prev):null; const priorRank=prior?v1812pRankMap(prior):null;
  const {F,Z}=v1812pFeatures(C,yr,wk,recs,prevRank,priorRank);
  const bal=V1812P_VOTERS.map((v,i)=>v1812pBallot(C,yr,wk,v,Z,prev&&prev.bal?prev.bal[i]:null,C.userSid));
  const pts=new Map(), fp=new Map();
  bal.forEach(b=>b.forEach((id,i)=>{ pts.set(id,(pts.get(id)||0)+(V1812P.TOP+1-(i+1))); if(i===0) fp.set(id,(fp.get(id)||0)+1); }));
  const all=[...pts.keys()].sort((a,b)=>pts.get(b)-pts.get(a)||(fp.get(b)||0)-(fp.get(a)||0)||((prevRank&&prevRank.get(a)||99)-(prevRank&&prevRank.get(b)||99))||(a<b?-1:1));
  const rows=all.slice(0,V1812P.TOP).map((id,i)=>{ const p=prevRank?prevRank.get(id):null; return {id,rk:i+1,pts:pts.get(id),fp:fp.get(id)||0,prev:p||null,mv:p?p-(i+1):null,nw:!!prevRank&&!p}; });
  const ov=all.slice(V1812P.TOP,V1812P.TOP+12).map(id=>({id,pts:pts.get(id)}));
  return {yr,wk,label:v1812pLabel(wk),rows,ov,bal,n:V1812P_VOTERS.length};
}
function v1812pPrior(C,yr){ const P=v1812pS(C); const a=P.polls[yr-1]; return a&&a.length?a[a.length-1]:null; }

/* publish every poll that is due: the preseason poll with the season, one more after each completed round */
let v1812pBusy=false;
function v1812pSync(C){
  if(!C||!C.league||!C.league.length) return null;
  if(v1812pBusy) return 0;
  v1812pBusy=true; try{ return v1812pSync1(C); } finally{ v1812pBusy=false; }
}
function v1812pSync1(C){
  const P=v1812pS(C); const yr=C.year; v1812pSnap(C);
  try{ v1812pBackfill(C); }catch(e){}
  const bound=v1812pBound(C,yr); const arr=P.polls[yr]||(P.polls[yr]=[]); let made=0;
  for(let wk=arr.length;wk<=bound;wk++){
    const prev=wk?arr[wk-1]:null; const recs=v1812pRecords(C,yr,wk);
    const poll=v1812pBuild(C,yr,wk,prev,v1812pPrior(C,yr),recs); arr.push(poll); made++;
    try{ v1812pNews(C,yr,wk,poll,prev); }catch(e){} }
  for(const y of Object.keys(P.polls)) if(+y<yr-1) for(const p of P.polls[y]) if(p.bal) delete p.bal;
  return made;
}
function v1812pPolls(C,yr){ v1812pSync(C); return v1812pS(C).polls[yr||C.year]||[]; }
function v1812pLatest(C){ const a=v1812pPolls(C,C.year); return a.length?a[a.length-1]:null; }
function v1812pRankOf(poll,id){ if(!poll) return null; const r=poll.rows.find(x=>x.id===id); return r?r.rk:null; }

/* ---------- Game of the Week ---------- */
function v1812pRoundGames(C,yr,rd){ return Object.values(C.fixtures).filter(f=>f.yr===yr&&f.comp==='reg'&&f.lvl==='V'&&f.rd===rd).sort((a,b)=>a.id<b.id?-1:1); }
function v1812pRankedGames(C,yr,rd){
  const poll=v1812pPolls(C,yr)[rd]; if(!poll) return [];
  const rk=v1812pRankMap(poll); const u=C.userSid; const out=[];
  for(const f of v1812pRoundGames(C,yr,rd)){ const ra=rk.get(f.h)||null, rb=rk.get(f.a)||null; if(ra&&rb) out.push({fid:f.id,rd,h:f.h,a:f.a,rh:ra,ra:rb,kind:'showdown',user:f.h===u||f.a===u,score:100-(ra+rb)+(f.h===u||f.a===u?2.5:0)-0.05*Math.abs(ra-rb)}); }
  return out.sort((a,b)=>b.score-a.score||(a.fid<b.fid?-1:1));
}
function v1812pGotw(C,yr,rd){
  yr=yr||C.year; if(rd==null) rd=C.phase==='regular'?C.md:-1; if(rd<0||rd>=V1812P.WEEKS) return null;
  const poll=v1812pPolls(C,yr)[rd]; if(!poll) return null;
  const list=v1812pRankedGames(C,yr,rd); if(list.length) return {...list[0],all:list};
  const rk=v1812pRankMap(poll); const uf=v1812pRoundGames(C,yr,rd).find(f=>f.h===C.userSid||f.a===C.userSid);
  if(uf){ const ra=rk.get(uf.h)||null, rb=rk.get(uf.a)||null; if(ra||rb) return {fid:uf.id,rd,h:uf.h,a:uf.a,rh:ra,ra:rb,kind:'spotlight',user:true,score:50,all:[]}; }
  return null;
}
/* the poll after this game under a win, a draw and a loss for each side (the rest of the round is unplayed) */
function v1812pProject(C,f){
  const polls=v1812pPolls(C,f.yr); const prev=polls[f.rd]; if(!prev) return null;
  const key=f.id+'|'+prev.rows.map(r=>r.id).join('')+'|'+Object.values(C.fixtures).filter(x=>x.yr===f.yr&&x.comp==='reg'&&x.lvl==='V'&&x.st==='d').length;
  const hit=v1812pMem.cmp.get('pj'+key); if(hit) return hit;
  const rks={}; const prior=v1812pPrior(C,f.yr);
  for(const [name,hg,ag] of [['win',2,1],['draw',1,1],['loss',1,2]]){
    const extra=f.st==='d'?[]:[{rd:f.rd,h:f.h,a:f.a,hg,ag}];
    rks[name]=v1812pRankMap(v1812pBuild(C,f.yr,f.rd+1,prev,prior,v1812pRecords(C,f.yr,f.rd+1,extra))); }
  const res={h:{win:rks.win.get(f.h)||null,draw:rks.draw.get(f.h)||null,loss:rks.loss.get(f.h)||null},a:{win:rks.loss.get(f.a)||null,draw:rks.draw.get(f.a)||null,loss:rks.win.get(f.a)||null}};
  v1812pMem.cmp.set('pj'+key,res); if(v1812pMem.cmp.size>200) v1812pMem.cmp.delete(v1812pMem.cmp.keys().next().value); return res;
}
function v1812pProjText(rank,cur){ if(rank) return 'projected No. '+rank; return cur?'projected out of the top 25':'projected unranked'; }

/* ---------- a team's season in the poll ---------- */
function v1812pStory(C,sid,yr){
  yr=yr||C.year; const polls=v1812pPolls(C,yr); const ranks=polls.map(p=>v1812pRankOf(p,sid));
  const ranked=ranks.map((r,i)=>r?{r,wk:i}:null).filter(Boolean);
  const best=ranked.length?ranked.reduce((a,b)=>b.r<a.r?b:a):null; const worst=ranked.length?ranked.reduce((a,b)=>b.r>a.r?b:a):null;
  const start=ranks.length?ranks[0]:null, now=ranks.length?ranks[ranks.length-1]:null;
  const head=ranks.length<2?(now?'NO. '+now+' TO START':'UNRANKED TO START'):(!ranked.length?'OUTSIDE THE TOP 25':(start&&now&&start===now&&ranked.length===ranks.length?'HOLDING AT NO. '+now:(start?'NO. '+start:'UNRANKED')+' TO '+(now?'NO. '+now:'UNRANKED')));
  const notes={}; for(let wk=1;wk<polls.length;wk++){ const f=v1812pRoundGames(C,yr,wk-1).find(x=>x.h===sid||x.a===sid); if(!f||f.st!=='d') continue;
    const home=f.h===sid, opp=home?f.a:f.h, gf=home?f.hg:f.ag, ga=home?f.ag:f.hg; const orank=v1812pRankOf(polls[wk-1],opp);
    notes[wk]={res:gf>ga?'W':gf<ga?'L':'D',gf,ga,home,opp,orank,text:`${gf>ga?'Won':gf<ga?'Lost':'Drew'} ${gf}–${ga} ${home?'vs':'at'} ${orank?'No. '+orank+' ':''}${v1812pName(C,opp)}`}; }
  return {ranks,best,worst,start,now,head,notes,weeks:ranked.length,top10:ranked.filter(x=>x.r<=10).length,yr};
}

/* ---------- facts and quotes ---------- */
function v1812pFacts(C,sid,yr,wk){
  const polls=v1812pPolls(C,yr); const poll=polls[wk==null?polls.length-1:wk]||polls[polls.length-1]; const wkk=poll?poll.wk:0;
  const ck='ft'+sid+'|'+yr+'|'+wkk+'|'+polls.length+'|'+v1812pDoneCount(C,yr); const hit=v1812pMem.cmp.get(ck); if(hit) return hit;
  const before=polls[wkk-1]||null; const recs=v1812pRecords(C,yr,wkk); const Rof=id=>v1812pRating(C,id,yr); const rkBefore=before?v1812pRankMap(before):null;
  const rkOf=o=>rkBefore?(rkBefore.get(o)||null):null; const A=v1812pAgg(recs.get(sid)||[],Rof,rkOf);
  const others=v1812pAllIds(C).map(i=>{ const x=v1812pAgg(recs.get(i)||[],Rof,null); return {gf:x.gfpg,ga:x.gapg}; });
  const attRank=others.filter(o=>o.gf>A.gfpg).length+1, defRank=others.filter(o=>o.ga<A.gapg).length+1;
  const last=A.games.length?A.games[A.games.length-1]:null;
  const nx=v1812pRoundGames(C,yr,wkk).find(f=>f.h===sid||f.a===sid); const next=nx&&nx.st==='s'?{opp:nx.h===sid?nx.a:nx.h,home:nx.h===sid,orank:v1812pRankOf(poll,nx.h===sid?nx.a:nx.h)}:null;
  const F={id:sid,town:v1812pName(C,sid),wk:wkk,A,gp:A.gp,rec:`${A.w}-${A.d}-${A.l}`,w:A.w,d:A.d,l:A.l,streak:A.streak,unb:A.unb,gd:A.gd,gfpg:A.gfpg,gapg:A.gapg,cs:A.cs,xgd:A.xgd,
    last:last?{res:last.res,gf:last.gf,ga:last.ga,home:last.home,opp:last.opp,oppName:v1812pName(C,last.opp),orank:last.orank}:null,
    best:A.best?{opp:A.best.opp,oppName:v1812pName(C,A.best.opp),orank:A.best.orank,gf:A.best.gf,ga:A.best.ga}:null,
    worst:A.worst?{opp:A.worst.opp,oppName:v1812pName(C,A.worst.opp),gf:A.worst.gf,ga:A.worst.ga}:null,
    rank:v1812pRankOf(poll,sid),prev:before?v1812pRankOf(before,sid):null,next,nextName:next?v1812pName(C,next.opp):'',attRank,defRank,qw:A.qw,sos:A.sos};
  v1812pMem.cmp.set(ck,F); if(v1812pMem.cmp.size>300) v1812pMem.cmp.delete(v1812pMem.cmp.keys().next().value); return F;
}
function v1812pDoneCount(C,yr){ let n=0; for(const f of Object.values(C.fixtures)) if(f.yr===yr&&f.comp==='reg'&&f.lvl==='V'&&f.st==='d') n++; return n; }
/* [condition, text] lists in priority order; the first few that apply compete, a hash picks one so the same week always reads the same */
function v1812pLines(vid,f){
  const t=f.town, o=f.last?f.last.oppName:'', nx=f.nextName;
  const L={
   courier:[
    [f.gp>=1&&f.last&&f.last.res==='L',`One bad night doesn't change what I saw the other ${Math.max(1,f.gp-1)}. ${t} are fine.`],
    [f.streak>=3,`Hometown bias? Maybe. But ${f.streak} straight wins is ${f.streak} straight wins.`],
    [f.rank&&f.prev&&f.rank<f.prev,`Moving up to No. ${f.rank} is overdue. I have watched every minute of this team.`],
    [f.last&&f.last.res==='W'&&f.last.orank,`Beating No. ${f.last&&f.last.orank} ${o} is the kind of night the town remembers.`],
    [f.next&&f.next.orank,`Friday is the test: No. ${f.next&&f.next.orank} ${nx} comes to town. I'll believe it after.`],
    [f.gp===0,`Everyone in town is talking about this team. Let's see if the talk holds up.`],
    [true,`${f.rec} and a team the town can get behind. Good enough for my ballot.`]],
   coaches:[
    [f.gp>=3&&f.gapg<=0.8,`Best back line in the section. They're for real.`],
    [f.cs>=3,`${f.cs} clean sheets already. That back four does not blink.`],
    [f.gp>=3&&f.gapg>=2,`Too many goals against. I want a back line first, results second.`],
    [f.best&&f.best.orank&&f.best.orank<=10,`The win over No. ${f.best&&f.best.orank} ${f.best&&f.best.oppName} was the real thing. Schedule strength matters.`],
    [f.sos!=null&&f.gp>=4&&f.sos<69,`${f.rec} against that schedule? I need to see more before I move them.`],
    [f.gp===0,`Talent on paper. Coaches vote on what happens in November.`],
    [true,`Organized and hard to break down. That is how you win in October.`]],
   radio:[
    [f.streak>=3,`${t} are the hottest team in the state right now. Period.`],
    [f.last&&f.last.res==='L'&&f.gp>=2,`Did anybody watch ${o} last time out? That was an exposure.`],
    [f.gp>=3&&f.gd>=8,`+${f.gd} goal difference. Somebody stop them. Please.`],
    [f.last&&f.last.res==='W'&&f.last.gf-f.last.ga>=3,`${f.last&&f.last.gf}–${f.last&&f.last.ga} against ${o}? That's a statement, folks.`],
    [f.gp>=3&&f.gfpg>=2.6,`Goals, goals, goals. Turn on a ${t} game and thank me later.`],
    [f.gp===0,`Give me a week of games and I'll tell you who's for real.`],
    [true,`Can't call it yet, but I like what I'm seeing from ${t}.`]],
   weekly:[
    [f.xgd!=null&&f.gp>=3&&f.xgd>f.gd+2,`The numbers say ${t} are better than the table: ${(f.xgd||0)>=0?"+":""}${(f.xgd||0).toFixed(1)} expected goals.`],
    [f.xgd!=null&&f.gp>=3&&f.xgd<f.gd-2,`Results are running ahead of the chances. Regression is coming.`],
    [f.gp>=3&&f.gd>=6,`A +${f.gd} goal difference travels. That's why they're where they are.`],
    [f.gp>=3&&f.gd<=-3,`${f.gd} on goal difference. It's hard to justify more than this.`],
    [f.gp===0,`My model likes ${t} more than the consensus does. We'll see.`],
    [true,`Goal difference of ${f.gd>=0?'+':''}${f.gd} after ${f.gp}. The model has them about right.`]],
   tribune:[
    [f.gp>=3&&f.l===0,`${f.rec}. You can't argue with the record.`],
    [f.gp>=3&&f.l>=3,`${f.l} losses is ${f.l} losses. Records don't lie.`],
    [f.gp>=2&&f.last&&f.last.res==='W'&&f.streak===1,`One good win. Show me it again Friday.`],
    [f.last&&f.last.res==='L',`A loss to ${o} costs you in my book. That's how I vote.`],
    [f.gp===0,`I rank on wins and losses. Nothing to rank yet, so I'm going on last year.`],
    [true,`${f.rec} is a respectable record. Not a special one.`]],
   insider:[
    [f.gp>=3&&!f.qw&&(!f.rank||f.rank>5),`Not on my ballot until they beat a top-five team.`],
    [f.best&&f.best.orank,`The ${f.best&&f.best.oppName} win goes on the résumé. Now I need a second one.`],
    [f.next&&f.next.orank&&f.next.orank<=10,`${nx} on Friday decides whether they're a contender or a pretender.`],
    [f.gp>=3&&f.sos!=null&&f.sos>=71,`A real schedule and a real record. That's a résumé.`],
    [f.gp===0,`Résumés are written in games. Ask me again in three weeks.`],
    [true,`The résumé is thin so far. Good wins are what move me.`]],
   scout:[
    [f.gp>=3&&f.attRank<=5&&f.defRank>12,`Attackers I'd pay to see. Somebody has to teach them to defend.`],
    [f.gp>=3&&f.defRank<=4,`Back line has real college players on it. That travels.`],
    [f.gp>=3&&f.attRank<=4,`The front line is the best I've scouted in this section.`],
    [f.rank&&f.rank<=10,`The talent is there. The results are catching up to it.`],
    [f.gp===0,`I vote on talent in September. The tape comes later.`],
    [true,`Solid group, not a special one. I'd want to see a real finisher.`]]
  };
  return (L[vid]||[]).filter(x=>x[0]).map(x=>x[1]);
}
function v1812pQuote(C,vi,sid,yr,wk){
  const v=V1812P_VOTERS[vi]; const f=v1812pFacts(C,sid,yr,wk); const lines=v1812pLines(v.id,f);
  const pick=lines.slice(0,Math.min(2,lines.length)); const h=v1812pHash(C.seed,'q',yr,f.wk,v.id,sid);
  return pick[h%pick.length]||'';
}
/* who had you where: personal rank on each ballot */
function v1812pVoterView(C,sid,yr,wk){
  const polls=v1812pPolls(C,yr); const poll=polls[wk==null?polls.length-1:wk]; if(!poll||!poll.bal) return [];
  return V1812P_VOTERS.map((v,i)=>{ const ix=poll.bal[i].indexOf(sid); return {v,i,rank:ix<0?null:ix+1}; });
}
/* the three voters shown on a card: the hometown paper, the highest and the lowest ballot */
function v1812pFeatured(C,sid,yr,wk){
  const all=v1812pVoterView(C,sid,yr,wk); if(!all.length) return [];
  const rk=x=>x.rank||99; const out=[all[0]]; const hi=all.slice().sort((a,b)=>rk(a)-rk(b)||a.i-b.i).find(x=>!out.includes(x)); if(hi) out.push(hi);
  const lo=all.slice().sort((a,b)=>rk(b)-rk(a)||a.i-b.i).find(x=>!out.includes(x)); if(lo) out.push(lo);
  return out.sort((a,b)=>a.i-b.i);
}

/* ---------- news: the Courier tie-in lines ---------- */
function v1812pNews(C,yr,wk,poll,prev){
  const P=v1812pS(C); const k=yr+':'+wk; if(P.news[k]) return; P.news[k]=1; const u=C.userSid; const town=v1812pName(C,u);
  const now=v1812pRankOf(poll,u), was=prev?v1812pRankOf(prev,u):null; const st=v1812pStory(C,u,yr);
  const polls=P.polls[yr]||[]; const seasonBest=Math.min(99,...polls.slice(0,wk).map(p=>v1812pRankOf(p,u)||99));
  let text=null;
  if(wk===0){ text=now?`Preseason State Poll: ${town} open the season ranked No. ${now} in ${C.stateName}`:`Preseason State Poll: ${town} start the season outside the ${C.stateName} top 25`; }
  else if(now===1&&was!==1) text=`${town} reach No. 1 in the ${C.stateName} State Poll`;
  else if(now&&!was) text=`${town} crack the ${C.stateName} State Poll at No. ${now}`;
  else if(!now&&was) text=`${town} fall out of the State Poll after dropping from No. ${was}`;
  else if(now&&now<=10&&(was==null||was>10)) text=`${town} climb into the State Poll top 10 at No. ${now}`;
  else if(now&&seasonBest!==99&&now<seasonBest&&wk>=2) text=`${town} reach a season-best No. ${now} in the State Poll`;
  /* the id counter is shared with the generators, so a news item must not consume one: the world a seed builds stays exactly as it was */
  if(text){ const keep=C.nextId; addNews(C,'poll',text,u,{pollWk:wk}); C.nextId=keep; }
}

/* ---------- hooks: save/migration, results, season start ---------- */
const _v1812pMigrate=migrate;
migrate=function(C){ const r=_v1812pMigrate.apply(this,arguments); try{ if(r&&r.league&&r.league.length){ v1812pS(r); } }catch(e){ console.warn('poll migrate',e); } return r; };
if(typeof finishMatch==='function'){ const _v1812pFin=finishMatch; finishMatch=function(C,M){ const f=_v1812pFin.apply(this,arguments); try{ if(f) v1812pIngest(C,f); }catch(e){} return f; }; }
if(typeof seasonStart==='function'){ const _v1812pSS=seasonStart; seasonStart=function(C){ const r=_v1812pSS.apply(this,arguments); try{ if(C.userSid){ v1812pSnap(C); v1812pSync(C); } }catch(e){ console.warn('poll season',e); } return r; }; }
if(typeof advance==='function'){ const _v1812pAdv=advance; advance=function(C){ const r=_v1812pAdv.apply(this,arguments); try{ if(r&&C.userSid) v1812pSync(C); }catch(e){ console.warn('poll sync',e); } return r; }; }
