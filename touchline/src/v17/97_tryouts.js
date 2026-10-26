/* ===================== v18.12 TRYOUTS & CUT DAY (v1812t): rules, pure logic, no DOM =====================
   Each preseason (before the first Preseason Cup game) the whole program tries out. This file holds the state, the pool,
   the hidden ratings and the drills, the roster rules, posting the list, and what happens to the players who are cut.
   The screen, the door scene and the animations are in 97_tryouts_ui.js; the styles in 97_tryouts.css.

   State lives on the career as C.tryout (saved, exported and imported with it; a career without one gets defaults):
     yr, st ('open' | 'posted' | 'auto' | 'none'), day (0-3 drill days run), seen, a {id: 'V'|'JV'|'MOD'|'X'} (the choices),
     tags {id:1}, cands {id: player} (newcomers not yet on the roster), pool [newcomer ids], info {id: {kind, story, ...}},
     posted {summary of the list that went up}, mem {pid: memory}, cut {pid: player} (cut players still out there),
     hist {yr: summary} (Courier-friendly summaries of every posted list).
   Cut memory: mem[pid] = {pid, name, fromLvl, cutYr, grudge, status 'cut'|'back'|'made'|'rival'|'quit'|'grad', cuts, ...}.

   Rules (no change to match simulation):
   - Pool = every player of the program (returning, the new seventh graders and camp commits) plus move-ins, walk-ons and the
     cut players who came back. Newcomers are generated from the career seed and the year only (rngFrom(hashStr(seed+...))).
   - Each candidate has a true OVR; the coach sees a range that narrows with each day (nested ranges that always contain the
     true value): day 1 sprint + juggling, day 2 beep test + position drill, day 3 the final scrimmage. Players the coach
     already knows start with narrow ranges; unknown kids with wide ones; a better coach narrows faster.
   - Drill numbers come from the true skills plus seeded noise, so a reload shows the same results.
   - Roster limits V 22 / JV 20 / Modified 20, minimums 16 / 14 / 14, at least one keeper per level; level eligibility is the
     engine's (`eligible`). Posting is final; lineups are rebuilt and validated; numbers stay unique per level.
   - Cut players remember: over the next summers they may break out, come back for the next tryout, quit, or transfer to a
     school in the league (the heated rival most often). Transfers appear on that roster with a news item. */
const V1812T={
  caps:{V:22,JV:20,MOD:20}, mins:{V:16,JV:14,MOD:14}, wid:[18,12,7,3.6], wmul:{ret:.5,fresh:.85,move:1,walk:1.05,back:.8},
  swid:{ret:[1.1,.6,0,0],fresh:[2.2,1.4,.6,0],move:[3.2,2.2,1.2,0],walk:[3.2,2.2,1.2,0],back:[2.2,1.4,.6,0]},
  dayName:['Sign-ups','Sprint and juggling','Beep test and position drills','Final scrimmage'],
  posMin:{V:{DEF:5,MID:4,FWD:3},JV:{DEF:4,MID:4,FWD:3},MOD:{DEF:4,MID:4,FWD:3}},
  memo:null
};
const v1812tLvlOrd={V:0,JV:1,MOD:2};
const v1812tOK=C=>!!(C&&C.schools&&C.userSid&&C.schools[C.userSid]);

function v1812tBox(C){ let T=C.tryout; if(!T||typeof T!=='object'||Array.isArray(T)) T=C.tryout={};
  if(T.v==null) T.v=1; if(T.yr==null) T.yr=0; if(!T.st) T.st='none'; if(T.day==null) T.day=0;
  for(const k of ['a','tags','cands','info','mem','cut','hist']) if(!T[k]||typeof T[k]!=='object'||Array.isArray(T[k])) T[k]={};
  if(!Array.isArray(T.pool)) T.pool=[]; return T; }
function v1812tRng(C,key){ return rngFrom(hashStr(C.seed+':t18:'+key)); }
/* a state the screen can read: this year's, or 'none' */
function v1812tSt(C){ const T=C&&C.tryout; if(!T||T.yr!==C.year) return 'none'; return T.st||'none'; }
function v1812tIsOpen(C){ return v1812tSt(C)==='open'; }
function v1812tFind(C,id){ const T=C.tryout; return C.players[id]||(T&&T.cands&&T.cands[id])||(T&&T.cut&&T.cut[id])||null; }
function v1812tCoach(C){ const co=C.coaches[C.userCoachId]; return co?co.ab:70; }

/* ---------- eligibility, kinds and stories ---------- */
function v1812tElig(p){ return {V:eligible(p,'V'),JV:eligible(p,'JV'),MOD:eligible(p,'MOD')}; }
function v1812tFeeder(C,id){ return FEEDERS[hashStr(C.seed+':feed:'+id)%FEEDERS.length]; }
function v1812tLastStats(C,p){ const yr=C.year-1; const y=p.st&&p.st[yr]; if(!y) return null; let best=null;
  for(const lvl of ['V','JV','MOD']){ const b=y[lvl]&&y[lvl].reg; if(b&&b.gp>0&&(!best||lvl==='V'||best.lvl!=='V')) best={lvl,gp:b.gp,g:b.g||0,a:b.a||0,sv:b.sv||0,tk:(b.tk||0)+(b.int||0)}; }
  return best; }
function v1812tRetKind(C,p){ if(p.camp&&p.joined===C.year&&C.seasonNo>1) return 'fresh'; if(p.joined===C.year&&p.grade===7&&C.seasonNo>1) return 'fresh'; return 'ret'; }
/* the one-line story of a player already in the program */
function v1812tRetStory(C,p,kind){ const r=rngFrom(hashStr(C.seed+':story:'+p.id+':'+C.year)); const G=p.grade;
  if(kind==='fresh') return p.camp?`Scouting camp commit, ${p.pos==='GK'?'keeper':p.pos.toLowerCase()}`:`New seventh grader from ${v1812tFeeder(C,p.id)}`;
  const cm=p.cutMem; if(cm&&cm.back===C.year) return cm.brk?'Cut once. Came back different.':'Cut once. Made it back.';
  const st=v1812tLastStats(C,p); const L=LVL_NAME;
  if(p.awards&&p.awards.length){ const a=p.awards.find(x=>x&&(x.yr===C.year-1||x.yr==null)); if(a) return 'All-League last fall'; }
  if(st){ if(p.pos==='GK'&&st.sv>=14) return `${st.sv} saves for ${L[st.lvl]} last fall`; if((p.pos==='FWD'||p.pos==='MID')&&st.g>=5) return `Scored ${st.g} for ${L[st.lvl]} last fall`; if(st.a>=5) return `${st.a} assists last fall`; if(p.pos==='DEF'&&st.tk>=18) return `${st.tk} tackles and interceptions last fall`; }
  if(G>=12) return pick(r,['Senior. Last tryout.','Senior, wants one more year to remember','Senior captain material']);
  if(p.bo&&p.lvl!=='V') return 'Breakout kid, wants the next level';
  if(p.lvl==='JV'&&G>=10) return pick(r,['JV captain, going for Varsity','JV regular, eyeing Varsity','Stayed after practice all summer']);
  if(p.lvl==='JV') return pick(r,['Freshman on the JV bubble','JV regular, eyeing Varsity']);
  if(p.lvl==='MOD') return pick(r,['Modified regular, moving up?','Grew two inches over the summer','Eager to show what he did all summer']);
  return pick(r,['Varsity regular, defending his spot','Returning Varsity player','Wants a bigger role this fall']); }
function v1812tRetInfo(C,p){ const kind=v1812tRetKind(C,p); return {kind,story:v1812tRetStory(C,p,kind)}; }
function v1812tInfo(C,id){ const T=C.tryout; if(T&&T.info&&T.info[id]) return T.info[id]; const p=C.players[id]; return p?v1812tRetInfo(C,p):{kind:'ret',story:''}; }

/* ---------- newcomers: move-ins, walk-ons, comebacks ---------- */
function v1812tNewcomer(C,r,i,kind,opt){ opt=opt||{}; const sch=C.schools[C.userSid];
  const gw=opt.walk?{7:3,8:3,9:3.5,10:1.5}:{7:1.5,8:2,9:3,10:2.5,11:1.5,12:.8};
  const g=opt.grade||+wpick(r,Object.keys(gw),k=>gw[k]);
  const pw={GK:.1,DEF:.32,MID:.3,FWD:.28}; const pos=opt.pos||wpick(r,GROUPS,k=>pw[k]);
  const L=g>=11?'V':g>=9?'JV':'MOD'; const gem=r()<(opt.walk?.1:.14);
  const target=levelTarget(L,g,sch.strength,true)+gauss(r)*6.5+(opt.walk?-4.5:0)+(gem?9+r()*6:0);
  const save=C.nextId; const p=genPlayer(C,r,{sid:C.userSid,lvl:L,grade:g,pos,target,user:true}); C.nextId=save;
  p.id='t'+C.year+'_'+i.toString(36); p.num=0; p.joined=C.year; p.tryKind=kind; planDev(C,p,r); p.ovr0[C.year]=r1(ovr(p));
  const st=pick(r,US_STATES.filter(x=>x!==C.stateName)); const town=pick(r,TOWNS);
  let story;
  if(kind==='move'){ story=pick(r,[`Moved here from ${st} in August`,`Family moved over the summer, from ${st}`,`Transferred in from ${town}`,`New in town, played club ball in ${st}`]); }
  else { const gl=g===9?'Freshman':g===7?'Seventh-grade':g===8?'Eighth-grade':g===10?'Sophomore':g===11?'Junior':'Senior';
    story=pos==='GK'&&g<=10?`${gl} walk-on, keeper`:pick(r,[`${gl} walk-on`,`${gl} walk-on, rec-league regular`,`Came out with a friend from class`,`Never played organized soccer`,`${gl} walk-on, plays pickup every night`]); }
  return {p,info:{kind,story,from:kind==='move'?st:null,gem}}; }
function v1812tBuild(C){
  const T=v1812tBox(C); if(T.yr===C.year) return T;
  T.yr=C.year; T.day=0; T.a={}; T.tags={}; T.cands={}; T.pool=[]; T.info={}; T.posted=null; T.seen=false; T.auto=false; T.st='open';
  const u=C.userSid; const r=v1812tRng(C,'pool:'+C.year); let i=1;
  /* cut players who came back */
  const backs=Object.values(T.mem).filter(m=>m.status==='back'&&T.cut[m.pid]).sort((a,b)=>a.pid<b.pid?-1:1);
  for(const m of backs){ const p=T.cut[m.pid]; delete T.cut[m.pid]; p.sid=u; p.num=0; p.tryKind='back'; T.cands[p.id]=p; T.pool.push(p.id);
    T.info[p.id]={kind:'back',story:m.brk?'Cut last fall. Came back.':(m.cutYr===C.year-1?'Cut last fall. Came back.':`Cut in ${m.cutYr}. Back for another go.`),mem:m.pid,brk:!!m.brk}; }
  /* move-ins every summer (not just freshmen) */
  const nMove=3+(r()<.5?1:0)+(C.schools[u].prestige>=60&&r()<.5?1:0);
  for(let k=0;k<nMove;k++){ const o=v1812tNewcomer(C,r,i++,'move'); T.cands[o.p.id]=o.p; T.pool.push(o.p.id); T.info[o.p.id]=o.info; }
  /* walk-ons; at least one keeper somewhere in the pool of newcomers */
  const nWalk=5+(r()<.5?1:0); let gk=T.pool.some(id=>T.cands[id].pos==='GK');
  for(let k=0;k<nWalk;k++){ const o=v1812tNewcomer(C,r,i++,'walk',{walk:true,pos:(!gk&&k===nWalk-1)?'GK':null}); if(o.p.pos==='GK') gk=true; T.cands[o.p.id]=o.p; T.pool.push(o.p.id); T.info[o.p.id]=o.info; }
  /* every level must be able to field a keeper: Modified needs a grade 7-8 keeper, JV a grade 7-10 one */
  for(let guard=0;guard<4;guard++){ const gks=[...schoolPlayers(C,u),...T.pool.map(id=>T.cands[id])].filter(p=>p&&p.pos==='GK');
    const a=gks.filter(p=>p.grade<=8).length, b=gks.filter(p=>p.grade<=10).length; const need=a<1?7+(r()<.5?1:0):b<2?9+(r()<.5?1:0):gks.length<3?11:0; if(!need) break;
    const o=v1812tNewcomer(C,r,i++,'walk',{walk:true,pos:'GK',grade:need}); T.cands[o.p.id]=o.p; T.pool.push(o.p.id); T.info[o.p.id]=o.info; }
  /* the returning players start where they are */
  for(const p of schoolPlayers(C,u)) T.a[p.id]=p.lvl;
  return T; }
/* the one entry point: make this preseason's tryouts exist (idempotent). Years in which the Preseason Cup has begun get none. */
function v1812tEnsure(C){
  if(!v1812tOK(C)) return null; const T=v1812tBox(C);
  if(T.yr===C.year) return T;
  if(C.phase==='preseason'&&C.pre&&C.pre.rd===0&&!C.pre.skipped&&(C.pre.fx||[]).every(id=>C.fixtures[id]&&C.fixtures[id].st==='s')) return v1812tBuild(C);
  T.yr=C.year; T.st='none'; T.day=0; T.a={}; T.tags={}; T.cands={}; T.pool=[]; T.info={}; T.posted=null; return T; }

/* ---------- the pool, in a stable order ---------- */
function v1812tPoolIds(C){ const T=v1812tBox(C); const ret=schoolPlayers(C,C.userSid).sort((a,b)=>(v1812tLvlOrd[a.lvl]-v1812tLvlOrd[b.lvl])||(ovr(b)-ovr(a))||(a.id<b.id?-1:1)).map(p=>p.id);
  return [...ret,...T.pool.filter(id=>T.cands[id])]; }
function v1812tAsg(C,id){ const T=C.tryout; const a=T&&T.a?T.a[id]:undefined; if(a) return a; const p=C.players[id]; return p&&p.sid===C.userSid?p.lvl:null; }

/* ---------- hidden ratings: nested ranges that always contain the truth ---------- */
function v1812tNest(r,t,widths){ const out=[]; const w0=widths[0]; const lo0=t-w0*(.12+.76*r()); out.push([lo0,lo0+w0]);
  for(let k=1;k<widths.length;k++){ const [plo,phi]=out[k-1]; const w=Math.min(widths[k],phi-plo); const a=Math.max(plo,t-w), b=Math.min(t,phi-w); const lo=a+(b-a)*(.1+.8*r()); out.push([lo,lo+w]); }
  return out; }
function v1812tRanges(C,id){ const p=v1812tFind(C,id); if(!p) return null; const info=v1812tInfo(C,id); const kind=info.kind||'ret';
  const cm=clamp(1.65-v1812tCoach(C)/100,.75,1.25); const mu=(V1812T.wmul[kind]||1)*cm;
  const r=v1812tRng(C,'range:'+C.year+':'+id); const t=ovr(p);
  const ow=V1812T.wid.map((w,k)=>k===3?Math.max(2.4,w*mu):w*mu);
  const o=v1812tNest(r,t,ow).map(([lo,hi])=>[clamp(Math.floor(lo+1e-9),20,99),clamp(Math.ceil(hi-1e-9),20,99)]);
  const ts=clamp(Math.round((p.pot-55)/8),1,5);
  const sw=(V1812T.swid[kind]||V1812T.swid.move);
  const s=v1812tNest(r,ts,sw).map(([lo,hi])=>[clamp(Math.floor(lo+1e-9),1,5),clamp(Math.ceil(hi-1e-9),1,5)]);
  return {t,o,s,ts}; }

/* ---------- drills: deterministic from the true skills plus seeded noise ---------- */
function v1812tGaussFor(C,id,drill){ const r=v1812tRng(C,'drill:'+C.year+':'+id+':'+drill); return gauss(r); }
function v1812tDrillRaw(C,p,id){ const sk=p.sk, g=v1812tGaussFor;
  const spr=clamp(6.12-.0128*sk.spd+g(C,id,'spr')*.075,4.55,6.4);
  const tech=.5*sk.pas+.35*sk.sho+.15*sk.spd; const jj=6+(tech-30)*1.35; const jug=clamp(Math.round(jj+g(C,id,'jug')*(5+Math.max(0,jj)*.08)),3,150);
  const beep=clamp(3.2+(sk.sta-25)*.115+(sk.spd-50)*.01+g(C,id,'beep')*.45,3,15);
  const ps=p.pos==='GK'?sk.gk:p.pos==='DEF'?sk.def:p.pos==='MID'?.55*sk.pas+.25*sk.def+.2*sk.sta:sk.sho;
  const pos=clamp(Math.round(ps+g(C,id,'pos')*5),5,99);
  const scr=ovrAt(p,p.pos)+g(C,id,'scr')*4.2;
  return {spr,jug,beep,pos,scr}; }
/* the whole pool's raw drill numbers, memoised per year and pool (letter grades are relative to the pool) */
function v1812tAllRaw(C){ const ids=v1812tPoolIds(C); const key=C.seed+':'+C.year+':'+ids.join(',')+':'+ids.map(id=>{ const p=v1812tFind(C,id); return p?Math.round(ovr(p)*10):0; }).join('');
  if(V1812T.memo&&V1812T.memo.key===key) return V1812T.memo.val;
  const raw={}; for(const id of ids){ const p=v1812tFind(C,id); if(p) raw[id]=v1812tDrillRaw(C,p,id); }
  const scr=ids.filter(id=>raw[id]).map(id=>raw[id].scr).sort((a,b)=>a-b);
  const pct=v=>{ if(scr.length<2) return .5; let lo=0; while(lo<scr.length&&scr[lo]<v) lo++; return lo/(scr.length-1); };
  for(const id in raw) raw[id].pct=clamp(pct(raw[id].scr),0,1);
  V1812T.memo={key,val:raw}; return raw; }
function v1812tLetter(pct){ const G=[[.95,'A+'],[.86,'A'],[.74,'A-'],[.62,'B+'],[.48,'B'],[.36,'B-'],[.24,'C+'],[.13,'C'],[.05,'C-']]; for(const [t,l] of G) if(pct>=t) return l; return 'D'; }
const v1812tPosDrill={GK:'Reaction saves',DEF:'1v1 defending',MID:'Passing squares',FWD:'Finishing circuit'};
/* the numbers a card shows after `day` days: [{k, lab, txt, bar, day}] */
function v1812tDrills(C,id,day){ const raw=v1812tAllRaw(C)[id]; const p=v1812tFind(C,id); if(!raw||!p) return [];
  const d=[{k:'spr',lab:'40-yd sprint',val:raw.spr,txt:raw.spr.toFixed(2)+' s',bar:clamp((6.15-raw.spr)/(6.15-4.7),.04,1),day:1},
    {k:'jug',lab:'Juggling',val:raw.jug,txt:String(raw.jug),bar:clamp(raw.jug/90,.04,1),day:1},
    {k:'beep',lab:'Beep test',val:raw.beep,txt:raw.beep.toFixed(1),bar:clamp((raw.beep-4)/9,.04,1),day:2},
    {k:'pos',lab:v1812tPosDrill[p.pos]||'Position drill',val:raw.pos,txt:String(raw.pos),bar:clamp(raw.pos/100,.04,1),day:2},
    {k:'scr',lab:'Scrimmage',val:raw.pct,txt:v1812tLetter(raw.pct),bar:clamp(.08+raw.pct*.92,.04,1),day:3}];
  return d.filter(x=>x.day<=day); }

/* ---------- the view model of one candidate at the current day ---------- */
function v1812tView(C,id){ const T=v1812tBox(C); const p=v1812tFind(C,id); if(!p) return null; const info=v1812tInfo(C,id); const rg=v1812tRanges(C,id); const day=Math.min(3,Math.max(0,(V1812T.dayO!=null?V1812T.dayO:T.day)|0));
  const o=rg.o[day], s=rg.s[day]; const dr=v1812tDrills(C,id,day);
  const ret=!!C.players[id]; const code=v1812tAsg(C,id);
  return {id,p,kind:info.kind||'ret',story:info.story||'',info,lo:o[0],hi:o[1],mid:(o[0]+o[1])/2,slo:s[0],shi:s[1],smid:(s[0]+s[1])/2,t:rg.t,ts:rg.ts,drills:dr,
    scr:(raw=>raw&&day>=3?raw.pct:null)(v1812tAllRaw(C)[id]),elig:v1812tElig(p),code,ret,tag:!!T.tags[id],mem:info.mem?T.mem[info.mem]:(p.cutMem||null)}; }

/* ---------- the roster the choices make, and the rules it must meet ---------- */
function v1812tCounts(C){ const ids=v1812tPoolIds(C); const out={V:0,JV:0,MOD:0,X:0,U:0,N:ids.length}; const pos={V:{GK:0,DEF:0,MID:0,FWD:0},JV:{GK:0,DEF:0,MID:0,FWD:0},MOD:{GK:0,DEF:0,MID:0,FWD:0}};
  for(const id of ids){ const c=v1812tAsg(C,id); const p=v1812tFind(C,id); if(!c){ out.U++; continue; } if(c==='X'){ out.X++; continue; } out[c]++; if(p) pos[c][p.pos]++; }
  out.pos=pos; return out; }
function v1812tCheck(C){ const n=v1812tCounts(C); const errors=[], warns=[]; const nm={V:'Varsity',JV:'JV',MOD:'Modified'};
  for(const l of LVLS){ const cap=V1812T.caps[l], mn=V1812T.mins[l], c=n[l], pc=n.pos[l];
    if(c>cap) errors.push({k:'over',l,msg:`${nm[l]} holds ${cap}: cut or move ${c-cap}.`});
    if(c<mn) errors.push({k:'under',l,msg:`${nm[l]} needs at least ${mn} players (has ${c}).`});
    if(c>0&&pc.GK===0) errors.push({k:'gk0',l,msg:`${nm[l]} has no goalkeeper.`});
    else if(c>0&&pc.GK===1) warns.push({k:'gk1',l,msg:`Only 1 goalkeeper on ${nm[l]}: one card or injury and a field player is in goal.`});
    for(const g of ['DEF','MID','FWD']) if(c>=mn&&pc[g]<V1812T.posMin[l][g]) warns.push({k:'pos',l,g,msg:`${nm[l]} has only ${pc[g]} ${g==='DEF'?'defender':g==='MID'?'midfielder':'forward'}${pc[g]===1?'':'s'}.`}); }
  if(n.U>0) errors.push({k:'undecided',msg:`${n.U} player${n.U===1?' is':'s are'} still undecided.`});
  for(const id of v1812tPoolIds(C)){ const c=v1812tAsg(C,id); const p=v1812tFind(C,id); if(c&&c!=='X'&&p&&!eligible(p,c)) errors.push({k:'elig',id,msg:`${pname(p)} (grade ${p.grade}) is not eligible for ${nm[c]}.`}); }
  return {ok:errors.length===0,errors,warns,n}; }
/* set one player's level (or 'X' to cut) */
function v1812tSet(C,id,code){ const T=v1812tBox(C); if(v1812tSt(C)!=='open') return {ok:false,msg:'The roster is already posted.'};
  const p=v1812tFind(C,id); if(!p||!v1812tPoolIds(C).includes(id)) return {ok:false,msg:'He is not in the tryout pool.'};
  if(code!=='X'&&!LVLS.includes(code)) return {ok:false,msg:'Unknown squad.'};
  if(code!=='X'&&!eligible(p,code)) return {ok:false,msg:`${pname(p)} (grade ${p.grade}) is not eligible for ${LVL_NAME[code]}.`};
  T.a[id]=code; return {ok:true}; }

/* ---------- auto-sort: a sensible roster from what the coach can see ---------- */
function v1812tScore(v,lvl,day){ let s=v.mid; const g=v.p.grade;
  const gb={V:{12:2.5,11:1.5,10:.3,9:-1.2,8:-4,7:-6},JV:{10:1,9:.3,8:-2,7:-3.5},MOD:{}}[lvl]||{}; s+=gb[g]||0;
  if(v.kind==='ret'||v.kind==='fresh') s+=3+(g===12?1.5:0)+(v.p.lvl===lvl?1.2:0)+(g>=11&&v.p.lvl==='V'&&lvl==='V'?12:0);
  if(g<=9&&lvl!=='V') s+=(v.smid-3)*.8;
  if(day>=3&&v.scr!=null) s+=(v.scr-.5)*3;
  return s; }
function v1812tAutoPlan(C){ const T=v1812tBox(C); const day=Math.min(3,T.day|0); const ids=v1812tPoolIds(C); const views=ids.map(id=>v1812tView(C,id)).filter(Boolean);
  const out={}; const left=new Set(views.map(v=>v.id)); const byId=Object.fromEntries(views.map(v=>[v.id,v]));
  for(const l of LVLS){ const cap=V1812T.caps[l]; const el=views.filter(v=>left.has(v.id)&&v.elig[l]); const sc=v=>v1812tScore(v,l,day);
    const sorted=el.slice().sort((a,b)=>(sc(b)-sc(a))||(a.id<b.id?-1:1)); const chosen=[]; const have=new Set();
    const need=Object.assign({GK:2},V1812T.posMin[l]);
    for(const g of ['GK','DEF','MID','FWD']){ let n=need[g]; for(const v of sorted){ if(n<=0||chosen.length>=cap) break; if(v.p.pos===g&&!have.has(v.id)){ chosen.push(v); have.add(v.id); n--; } } }
    let gkn=chosen.filter(v=>v.p.pos==='GK').length;
    for(const v of sorted){ if(chosen.length>=cap) break; if(v.p.pos==='GK'&&gkn>=3) continue; if(!have.has(v.id)){ chosen.push(v); have.add(v.id); if(v.p.pos==='GK') gkn++; } }
    for(const v of chosen){ out[v.id]=l; left.delete(v.id); } }
  for(const id of left) out[id]='X';
  v1812tFixKeepers(C,views,out,day);
  return out; }
/* every level gets two keepers where the pool allows it (Modified first: only grade 7-8 players qualify) */
function v1812tFixKeepers(C,views,out,day){
  for(const l of ['MOD','JV','V']){ const cap=V1812T.caps[l]; const sc=v=>v1812tScore(v,l,day);
    const at=lv=>views.filter(v=>out[v.id]===lv); const gkAt=lv=>at(lv).filter(v=>v.p.pos==='GK').length;
    for(let guard=0;guard<4&&gkAt(l)<2;guard++){
      let cand=views.filter(v=>v.p.pos==='GK'&&out[v.id]==='X'&&v.elig[l]).sort((a,b)=>sc(b)-sc(a)||(a.id<b.id?-1:1))[0];
      if(!cand) cand=views.filter(v=>v.p.pos==='GK'&&out[v.id]!=='X'&&out[v.id]!==l&&v.elig[l]&&gkAt(out[v.id])>2).sort((a,b)=>sc(b)-sc(a)||(a.id<b.id?-1:1))[0];
      if(!cand&&gkAt(l)>=1) break; if(!cand) cand=views.filter(v=>v.p.pos==='GK'&&out[v.id]!=='X'&&out[v.id]!==l&&v.elig[l]&&gkAt(out[v.id])>1).sort((a,b)=>sc(b)-sc(a)||(a.id<b.id?-1:1))[0];
      if(!cand) break;
      if(at(l).length>=cap){ const ev=at(l).filter(v=>v.p.pos!=='GK').sort((a,b)=>sc(a)-sc(b)||(a.id<b.id?-1:1))[0]; if(ev) out[ev.id]='X'; }
      out[cand.id]=l; } } }
function v1812tApplyAuto(C){ const T=v1812tBox(C); const plan=v1812tAutoPlan(C); for(const id in plan) T.a[id]=plan[id]; return plan; }

/* ---------- running a day ---------- */
function v1812tRunDay(C){ const T=v1812tBox(C); if(v1812tSt(C)!=='open'||T.day>=3) return T.day; T.seen=true; T.day++; return T.day; }

/* ---------- posting the list ---------- */
function v1812tFixNums(C,lvls){ const u=C.userSid; const used0=retiredSet(C,u);
  for(const l of lvls){ const used=new Set(used0); const r=rngFrom(hashStr(C.seed+':nums:'+C.year+':'+l)); const sq=squad(C,u,l).sort((a,b)=>(a.num||999)-(b.num||999)||(a.id<b.id?-1:1));
    for(const p of sq){ if(!p.num||used.has(p.num)) p.num=assignNum(r,used,p.pos); else used.add(p.num); } } }
function v1812tRelineup(C,sid,lvls){ const s=C.schools[sid]; const user=sid===C.userSid;
  for(const l of lvls){ const lu=getLu(C,sid,l)||{}; const form=user?(FORMS[lu.custom?(lu.base||'4-4-2'):lu.form]?(lu.custom?(lu.base||'4-4-2'):lu.form):'4-4-2'):C.coaches[s.coachId].form;
    const keepTac=lu.tac, keepStrat=lu.strat; const caps=(lu.caps||[]).filter(id=>C.players[id]&&C.players[id].lvl===l&&C.players[id].sid===sid);
    s.lu[l]={...autoLineup(C,sid,l,form),tac:keepTac||{...C.coaches[s.coachId].tac},strat:keepStrat||'balanced',caps};
    if(caps.length<2) s.lu[l].caps=[...caps,...defaultCaptains(C,sid,l).filter(x=>!caps.includes(x))].slice(0,2); } }
function v1812tGrudge(C,p,fromLvl,prev){ const r=rngFrom(hashStr(C.seed+':grudge:'+p.id+':'+C.year));
  let g=({V:42,JV:26,MOD:14}[fromLvl]||8)+Math.min(20,Math.max(0,p.pot-ovr(p))*.6)+gauss(r)*8+((prev&&prev.cuts)||0)*12+(p.aggr-50)*.3;
  return clamp(Math.round(g),0,100); }
function v1812tPost(C,mode){
  const T=v1812tBox(C); if(v1812tSt(C)!=='open') return {ok:false,errors:[{msg:'The roster is already posted.'}]};
  if(mode==='auto'){ T.day=3; v1812tApplyAuto(C); T.auto=true; }
  if(mode==='auto'){ /* the staff always produce a legal list: a keeper signs up late if a level has none */
    for(const l of LVLS){ const gk=v1812tPoolIds(C).filter(id=>T.a[id]===l&&(v1812tFind(C,id)||{}).pos==='GK').length;
      if(!gk){ const rr=v1812tRng(C,'late:'+C.year+':'+l); const o=v1812tNewcomer(C,rr,90+LVLS.indexOf(l),'walk',{walk:true,pos:'GK',grade:l==='MOD'?8:l==='JV'?10:11}); o.info.story='Signed up late, keeper'; T.cands[o.p.id]=o.p; T.pool.push(o.p.id); T.info[o.p.id]=o.info; T.a[o.p.id]=l;
        const ev=v1812tPoolIds(C).filter(id=>T.a[id]===l&&(v1812tFind(C,id)||{}).pos!=='GK').sort((a,b)=>ovr(v1812tFind(C,a))-ovr(v1812tFind(C,b)))[0]; if(ev&&v1812tCounts(C)[l]>V1812T.caps[l]) T.a[ev]='X'; } } }
  const chk=v1812tCheck(C); if(!chk.ok&&mode!=='auto') return {ok:false,errors:chk.errors};
  const u=C.userSid; const yr=C.year; const r=rngFrom(hashStr(C.seed+':post:'+yr)); const ids=v1812tPoolIds(C);
  const before={V:new Set(),JV:new Set(),MOD:new Set()}; for(const l of LVLS) for(const p of squad(C,u,l)) before[l].add(p.id);
  const sum={yr,auto:mode==='auto',n:{V:0,JV:0,MOD:0,X:0},v:[],jv:[],mod:[],cut:[],newV:[],up:[],down:[],newcomers:[],backs:[],prevV:[...before.V]};
  const touched=new Set();
  for(const id of ids){ const code=T.a[id]||'X'; const p=v1812tFind(C,id); if(!p) continue; const inProg=!!C.players[id];
    const prevLvl=inProg?p.lvl:null;
    if(code==='X'){ const prev=T.mem[id]; const m={pid:id,name:pname(p),fromLvl:prevLvl,cutYr:yr,grudge:v1812tGrudge(C,p,prevLvl,prev),kind:(v1812tInfo(C,id).kind||'ret'),status:'cut',cuts:(prev?prev.cuts:0)+1,from:u,ovr:r1(ovr(p)),pot:p.pot,grade:p.grade,pos:p.pos,brk:false};
      T.mem[id]=m; if(inProg){ delete C.players[id]; if(prevLvl) touched.add(prevLvl); } p.cutYr=yr; T.cut[id]=p; delete T.cands[id];
      sum.n.X++; sum.cut.push({id,name:pname(p),pos:p.pos,grade:p.grade,from:prevLvl,ovr:r1(ovr(p)),pot:p.pot,kind:m.kind}); continue; }
    if(!inProg){ p.sid=u; p.lvl=code; p.joined=yr; p.num=0; delete p.tryKind; delete p.cutYr; if(!p.plan) planDev(C,p,r); p.ovr0[yr]=r1(ovr(p)); C.players[id]=p; delete T.cands[id];
      const inf=T.info[id]||{}; const m=T.mem[id]; if(m){ m.status='made'; m.madeYr=yr; m.madeLvl=code; p.cutMem={yr:m.cutYr,lvl:m.fromLvl,g:m.grudge,from:u,back:yr,brk:!!m.brk}; sum.backs.push(id); }
      sum.newcomers.push({id,kind:inf.kind||'walk',lvl:code}); touched.add(code); }
    else if(p.lvl!==code){ touched.add(p.lvl); touched.add(code); p.lvl=code; }
    sum.n[code]++;
    if(code==='V'&&!before.V.has(id)) sum.newV.push(id);
    if(inProg&&v1812tLvlOrd[code]<v1812tLvlOrd[prevLvl]) sum.up.push(id); if(inProg&&v1812tLvlOrd[code]>v1812tLvlOrd[prevLvl]) sum.down.push(id); }
  for(const l of LVLS){ for(const p of squad(C,u,l).sort((a,b)=>ovr(b)-ovr(a)||(a.id<b.id?-1:1))) sum[l==='V'?'v':l==='JV'?'jv':'mod'].push(p.id); }
  v1812tFixNums(C,LVLS);
  /* lineups: rebuilt where the group changed, repaired elsewhere, then validated */
  for(const l of LVLS){ if(touched.has(l)) v1812tRelineup(C,u,[l]); else repairLineup(C,u,l);
    let v=validateLineup(C,u,l); if(!v.ok){ v1812tRelineup(C,u,[l]); v=validateLineup(C,u,l); } }
  /* the story, in the Newswire */
  const town=C.schools[u].town; const N=(t,x,sid,e)=>addNews(C,t,x,sid||u,e);
  N('tryouts',`${town} post the ${yr} roster: ${sum.n.V} on Varsity, ${sum.n.JV} on JV, ${sum.n.MOD} on Modified, ${sum.n.X} cut`,u);
  for(const id of sum.backs.slice(0,3)){ const p=C.players[id]; N('comeback',`He remembers: ${pname(p)}, cut in ${p.cutMem.yr}, makes the ${LVL_NAME[p.lvl]} roster`,u,{pid:id}); }
  for(const c of sum.cut.filter(c=>c.from==='V').slice(0,2)) N('tryouts',`${c.name}, a Varsity player last fall, is cut`,u);
  const nv=sum.newV.map(id=>C.players[id]).filter(p=>p&&p.tryKind===undefined).sort((a,b)=>ovr(b)-ovr(a));
  for(const x of sum.newcomers.filter(x=>x.lvl==='V'&&x.kind!=='back').slice(0,2)){ const p=C.players[x.id]; const inf=T.info[x.id]||{}; N('tryouts',`${x.kind==='move'?'Move-in':'Walk-on'} ${pname(p)} makes Varsity${inf.from?` (from ${inf.from})`:''}`,u,{pid:x.id}); }
  T.posted=sum; T.st=mode==='auto'?'auto':'posted'; T.postedAt=mode==='auto'?'staff':'user'; T.hist[yr]={yr,auto:sum.auto,n:sum.n,newV:sum.newV,cut:sum.cut.map(c=>({id:c.id,name:c.name,from:c.from,ovr:c.ovr})),newcomers:sum.newcomers.length,backs:sum.backs};
  T.cands={}; T.pool=[]; V1812T.memo=null;
  return {ok:true,sum}; }
/* a roster posted by the staff (skip tryouts, or the preseason moving on without them) */
function v1812tAutoResolve(C){ if(!v1812tOK(C)) return false; v1812tEnsure(C); if(!v1812tIsOpen(C)) return false; const res=v1812tPost(C,'auto'); return !!(res&&res.ok); }

/* ---------- the summer: what happens to the players who were cut ---------- */
function v1812tPlaceAtRival(C,p,dest,rr){ const sch=C.schools[dest]; const prefer=['V','JV','MOD'].filter(l=>eligible(p,l));
  let lvl=prefer[prefer.length-1];
  for(const l of prefer){ const sq=squad(C,dest,l).sort((a,b)=>ovr(b)-ovr(a)); const ref=sq.length?ovr(sq[Math.min(sq.length-1,Math.floor(sq.length/2))]):0; if(ovr(p)>=ref-1){ lvl=l; break; } }
  p.sid=dest; p.lvl=lvl; p.joined=C.year; C.players[p.id]=p; p.num=freeNum(C,dest,lvl,p);
  const touched=new Set([lvl]);
  const sq=squad(C,dest,lvl); if(sq.length>V1812T.caps[lvl]){ const weakest=sq.filter(x=>x.id!==p.id&&!(x.pos==='GK'&&sq.filter(y=>y.pos==='GK').length<=2)).sort((a,b)=>ovr(a)-ovr(b))[0];
    if(weakest){ const down=['JV','MOD'].find(l=>v1812tLvlOrd[l]>v1812tLvlOrd[lvl]&&eligible(weakest,l)&&squad(C,dest,l).length<V1812T.caps[l]);
      if(down){ weakest.lvl=down; weakest.num=freeNum(C,dest,down,weakest); touched.add(down); } else { C.alumni[weakest.id]=compactAlum(weakest,C.year-1,'Left the program before his final season'); delete C.players[weakest.id]; } } }
  v1812tRelineup(C,dest,[...touched]); return lvl; }
function v1812tAfterRollover(C){
  const T=v1812tBox(C); const u=C.userSid; if(!u) return; const newYr=C.year;
  const left=Object.values(T.mem).filter(m=>m.status==='cut'&&T.cut[m.pid]).sort((a,b)=>a.pid<b.pid?-1:1);
  const others=C.league.filter(s=>s!==u);
  for(const m of left){ const p=T.cut[m.pid]; const rr=rngFrom(hashStr(C.seed+':fate:'+m.pid+':'+newYr)); m.log=m.log||[];
    p.grade++; p.age++; p.susp=0;
    if(p.grade>12){ m.status='grad'; m.endYr=newYr; delete T.cut[m.pid]; continue; }
    p.h=Math.max(p.h,p.ah-growthLeft(p.age,p.mat));
    const gap0=p.pot-ovr(p); if(p.plan&&gap0>0) shiftOvr(p,Math.min(gap0,p.plan.gain*clamp(gap0/12,.2,1)*.8),'balanced');
    const bonus=(.6+2.2*m.grudge/100)*(.6+rr()*.8); const g1=p.pot-ovr(p); if(bonus>g1) p.pot=Math.min(99,Math.round(ovr(p)+bonus)); shiftOvr(p,bonus,'balanced');
    const pB=clamp(.05+m.grudge*.0012+Math.max(0,m.pot-m.ovr-12)*.004,.04,.26); const brk=rr()<pB;
    if(brk){ shiftOvr(p,4+rr()*5,'balanced'); p.pot=Math.min(99,Math.max(p.pot,Math.round(ovr(p)+2+rr()*4))); p.bo=(p.bo||0)+1; m.brk=true; }
    const o=ovr(p); const cn=m.cuts||1;
    const pQ=clamp(.07+(58-o)*.004-m.grudge*.0004+(cn-1)*.06,.03,.3), pM=clamp(.3+(cn-1)*.18-m.grudge*.002,.12,.62), pT=clamp(.03+m.grudge*.0009+Math.max(0,o-60)*.0035+(m.brk?.05:0),.02,.22); const x=rr();
    planDev(C,p,rr); p.ovr0[newYr]=r1(ovr(p)); m.ovrNow=r1(o); m.gradeNow=p.grade;
    const town=C.schools[u].town;
    if(x<pQ){ m.status='quit'; m.endYr=newYr; delete T.cut[m.pid]; if(m.fromLvl==='V') addNews(C,'tryouts',`${m.name}, cut from the Varsity last fall, has quit the sport`,u); }
    else if(x<pQ+pM){ m.status='away'; m.endYr=newYr; delete T.cut[m.pid]; }
    else if(x<pQ+pM+pT&&others.length){ const w=rr(); const heated=C.rivals.heated, seasonal=C.rivals.seasonal;
      const dest=w<.6&&others.includes(heated)?heated:w<.8&&others.includes(seasonal)?seasonal:others[Math.floor(rr()*others.length)];
      delete T.cut[m.pid]; p.sid=dest; p.cutMem={yr:m.cutYr,lvl:m.fromLvl,g:m.grudge,from:u,rv:dest===heated,brk:!!m.brk,to:dest}; delete p.cutYr; delete p.tryKind;
      const lvl=v1812tPlaceAtRival(C,p,dest,rr); m.status='rival'; m.sid=dest; m.endYr=newYr; m.toLvl=lvl;
      addNews(C,'transfer',`He remembers: ${m.name}, cut by ${town} in ${m.cutYr}, transfers to ${C.schools[dest].town}${dest===heated?' (your heated rival)':''}${m.brk?' and has grown into a player':''}`,dest,{pid:m.pid}); }
    else { m.status='back'; m.backYr=newYr; if(m.brk) addNews(C,'comeback',`He remembers: ${m.name}, cut in ${m.cutYr}, is back for tryouts and looks like a different player`,u); } }
  /* anyone who would have graduated while waiting is dropped the same way; nothing else is touched */
  V1812T.memo=null; }

/* ---------- revenge games: players cut by this program who now play against it ---------- */
function v1812tRevenge(C,f){ if(!f||!C||!C.userSid) return []; const u=C.userSid; if(f.h!==u&&f.a!==u) return []; const opp=f.h===u?f.a:f.h; const lvl=f.lvl||'V';
  const lu=C.schools[opp]&&C.schools[opp].lu[lvl]; const inXI=new Set(lu?lu.slots.map(s=>s.pid):[]);
  return squad(C,opp,lvl).filter(p=>p.cutMem&&p.cutMem.from===u).map(p=>({p,xi:inXI.has(p.id),cm:p.cutMem})).sort((a,b)=>(b.xi-a.xi)||(ovr(b.p)-ovr(a.p))); }

/* ---------- hooks: wrap the engine globals (browser and Node alike) ---------- */
const _v1812tRollover=rollover;
rollover=function(C){ const res=_v1812tRollover.apply(this,arguments); if(res&&res.ok){ try{ v1812tAfterRollover(C); }catch(e){ if(typeof console!=='undefined') console.error('tryouts rollover',e); } } return res; };
const _v1812tMigrate=migrate;
migrate=function(C){ const out=_v1812tMigrate.apply(this,arguments); if(C&&C.userSid) try{ v1812tBox(C); }catch(e){} return out; };
const _v1812tEveryone=everyone;
everyone=function(C){ const all=_v1812tEveryone.apply(this,arguments); const T=C&&C.tryout; if(T&&T.cut){ for(const id in T.cut) if(!C.players[id]&&!C.alumni[id]) all.push(T.cut[id]); } return all; };
const _v1812tFindPerson=findPerson;
findPerson=function(C,id){ const p=_v1812tFindPerson.apply(this,arguments); if(p) return p; const T=C&&C.tryout; return (T&&T.cut&&T.cut[id])||null; };
/* a preseason fixture is about to be played: the tryouts end here, on the coaching staff's list if nobody posted one */
const _v1812tStartMatch=startMatch;
startMatch=function(C,fid,opts){ try{ const f=C&&C.fixtures[fid]; if(!(opts&&(opts.fast||opts.seedSalt))&&f&&f.comp==='pre'&&C.phase==='preseason'&&C.userSid&&(!C.tryout||C.tryout.yr!==C.year||C.tryout.st==='open')){ v1812tEnsure(C); if(v1812tIsOpen(C)){ v1812tAutoResolve(C); if(typeof v1812tAfterAuto==='function') v1812tAfterAuto(C); } } }catch(e){ if(typeof console!=='undefined') console.error('tryouts auto',e); }
  return _v1812tStartMatch.apply(this,arguments); };
/* a cut player who scores against the program that cut him: it makes the Newswire */
const _v1812tFinish=finishMatch;
finishMatch=function(C,M){ const out=_v1812tFinish.apply(this,arguments);
  try{ const f=C.fixtures[M.fid]; if(f&&f.st==='d'&&C.userSid&&(f.h===C.userSid||f.a===C.userSid)){ const rv=v1812tRevenge(C,f); const lg=C.logs&&C.logs[f.id];
      if(rv.length&&lg&&lg.box){ const opp=f.h===C.userSid?f.a:f.h; const rows=lg.box[f.h===opp?0:1]||[];
        for(const x of rv){ const row=rows.find(r=>r.pid===x.p.id); const k='rv'+f.id+x.p.id; C.flags=C.flags||{}; if(!row||!row.g||C.flags[k]) continue; C.flags[k]=1;
          addNews(C,'transfer',`He remembers: ${pname(x.p)} scores ${row.g>1?row.g+' goals ':''}against the program that cut him in ${x.cm.yr}`,opp,{fid:f.id}); } } } }catch(e){}
  return out; };
