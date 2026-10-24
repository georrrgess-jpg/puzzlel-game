/* ===================== TOUCHLINE ENGINE =====================
   Pure domain logic: generation, development, lineups, match simulation,
   competitions, awards, records, rollover. No DOM access in this file. */
'use strict';
const SCHEMA = 8;
const LVLS = ['V','JV','MOD'];
const LVL_NAME = {V:'Varsity',JV:'JV',MOD:'Modified'};
const clamp = (v,a,b)=> v<a?a:v>b?b:v;
const r1 = v => Math.round(v*10)/10;

/* ---------- seeded RNG (mulberry32), state is a plain uint32 ---------- */
function rngFrom(seed){
  let s = seed>>>0;
  const f = ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  f.get = ()=>s; return f;
}
function hashStr(str){ let h=2166136261>>>0; str=String(str); for(let i=0;i<str.length;i++){h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
const rint=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function gauss(r){ let u=0; while(!u) u=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r()); }
function wpick(r, items, wf){ let tot=0; const ws=items.map(it=>{const w=Math.max(0,wf(it)||0); tot+=w; return w;}); if(!items.length) return null; if(tot<=0) return items[Math.floor(r()*items.length)]; let x=r()*tot; for(let i=0;i<items.length;i++){ x-=ws[i]; if(x<=0) return items[i]; } return items[items.length-1]; }
function shuffle(r,a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
/* generation RNG bound to the career so world/dev randomness is reproducible */
function genR(C){ const r=rngFrom(C.gs); const f=()=>{const v=r(); C.gs=r.get(); return v;}; return f; }
const nid = (C,p)=> p + (C.nextId++).toString(36);

/* ---------- positions, roles, formations ---------- */
const ROLE_GROUP = {GK:'GK',CB:'DEF',LB:'DEF',RB:'DEF',LWB:'DEF',RWB:'DEF',DM:'MID',CM:'MID',AM:'MID',LM:'MID',RM:'MID',LW:'FWD',RW:'FWD',ST:'FWD'};
const GROUPS = ['GK','DEF','MID','FWD'];
const FORMS = {
  '4-4-2':[['GK',50,7],['LB',14,27],['CB',38,22],['CB',62,22],['RB',86,27],['LM',14,54],['CM',38,48],['CM',62,48],['RM',86,54],['ST',38,80],['ST',62,80]],
  '4-3-3':[['GK',50,7],['LB',14,27],['CB',38,22],['CB',62,22],['RB',86,27],['CM',28,50],['DM',50,42],['CM',72,50],['LW',16,76],['ST',50,83],['RW',84,76]],
  '4-2-3-1':[['GK',50,7],['LB',14,27],['CB',38,22],['CB',62,22],['RB',86,27],['DM',36,41],['DM',64,41],['AM',18,65],['AM',50,63],['AM',82,65],['ST',50,85]],
  '3-5-2':[['GK',50,7],['CB',26,23],['CB',50,20],['CB',74,23],['LWB',10,50],['CM',32,48],['DM',50,40],['CM',68,48],['RWB',90,50],['ST',38,80],['ST',62,80]],
  '3-4-3':[['GK',50,7],['CB',26,23],['CB',50,20],['CB',74,23],['LM',12,50],['CM',38,46],['CM',62,46],['RM',88,50],['LW',20,77],['ST',50,84],['RW',80,77]],
  '5-3-2':[['GK',50,7],['LWB',8,33],['CB',30,22],['CB',50,19],['CB',70,22],['RWB',92,33],['CM',28,52],['CM',50,47],['CM',72,52],['ST',38,80],['ST',62,80]],
  '4-1-4-1':[['GK',50,7],['LB',14,27],['CB',38,22],['CB',62,22],['RB',86,27],['DM',50,39],['LM',14,58],['CM',38,55],['CM',62,55],['RM',86,58],['ST',50,83]],
  '4-5-1':[['GK',50,7],['LB',14,27],['CB',38,22],['CB',62,22],['RB',86,27],['LM',12,55],['CM',31,51],['CM',50,46],['CM',69,51],['RM',88,55],['ST',50,83]]
};
const ROLES_BY_GROUP = {GK:['GK'],DEF:['CB','LB','RB','LWB','RWB'],MID:['DM','CM','AM','LM','RM'],FWD:['ST','LW','RW']};

/* ---------- player model ---------- */
const OVR_W = {GK:{gk:.72,pas:.06,spd:.07,h:.15}, DEF:{def:.5,spd:.14,pas:.14,sta:.12,h:.10}, MID:{pas:.42,sta:.14,def:.14,sho:.16,spd:.14}, FWD:{sho:.5,spd:.24,pas:.16,h:.10}};
const SKILLS = ['spd','sta','sho','pas','def','gk'];
/* Special traits outweigh every other rating: each point is worth more than a big skill gap. */
const TRAIT = {shotW:0.13, xg:0.03, astW:0.13, defW:0.13, stopG:1.7, attU:1.0, astU:0.6, defU:1.2, pen:0.009}; // strong, but teammates still get their share
const SKILL_NAME = {spd:'Speed',sta:'Stamina',sho:'Shooting',pas:'Passing',def:'Defending',gk:'Goalkeeping'};
function hF(p){ return clamp(70+(p.h-70)*4, 30, 99); }
function ovrAt(p,g){ const w=OVR_W[g]; let v=0; for(const k in w) v += w[k]*(k==='h'?hF(p):p.sk[k]); return v; }
function ovr(p){ return ovrAt(p,p.pos); }
function fitMult(pos,g){ if(pos===g) return 1; if(g==='GK') return .55; if(pos==='GK') return .6; const o={DEF:0,MID:1,FWD:2}; return Math.abs(o[pos]-o[g])===1?.9:.8; }
function eff(p,role){ const g=ROLE_GROUP[role]||role; return ovrAt(p,g)*fitMult(p.pos,g); }
function ftIn(h){ const t=Math.round(h); return `${Math.floor(t/12)}'${t%12}"`; }
function growthLeft(age,mat){ const a = age + (mat==='early'?1.5:mat==='late'?-1.5:0); const T=[[11,9],[12,7],[13,5.5],[14,4],[15,2.6],[16,1.4],[17,.6],[18,.15],[19,0]]; if(a<=11) return 9; if(a>=19) return 0; for(let i=0;i<T.length-1;i++){ if(a>=T[i][0]&&a<T[i+1][0]){ const f=a-T[i][0]; return T[i][1]+(T[i+1][1]-T[i][1])*f; } } return 0; }

/* raise or lower OVR by `amt` along a position-appropriate skill profile (exact linear solve) */
const FOCUS_SHARE = {
  balanced:{}, attacking:{sho:1.6,spd:1.2}, defending:{def:1.7,gk:1.4}, possession:{pas:1.7,sta:1.1}, fitness:{sta:1.8,spd:1.4}, youth:{}
};
function shiftOvr(p, amt, focus){
  if(Math.abs(amt)<0.01) return;
  const w=OVR_W[p.pos]; const fx=FOCUS_SHARE[focus]||{};
  const target = ovr(p)+amt;
  for(let it=0; it<5; it++){
    const cur=ovr(p), diff=target-cur; if(Math.abs(diff)<0.02) break;
    let share={}, denom=0;
    for(const k of SKILLS){ let s=(w[k]||0.03)*(fx[k]||1); if(p.pos!=='GK'&&k==='gk') s=0.005; if(diff>0&&p.sk[k]>=99) s=0; if(diff<0&&p.sk[k]<=5) s=0; share[k]=s; denom += (w[k]||0)*s; }
    if(denom<=0) break;
    for(const k of SKILLS){ p.sk[k]=clamp(p.sk[k]+diff*share[k]/denom, 5, 99); }
  }
}

function genName(r){ return [pick(r,FIRST_NAMES), pick(r,LAST_NAMES)]; }
function genPlayer(C, r, o){
  const p = {id:nid(C,'p'), fn:'', ln:'', num:0, sid:o.sid, lvl:o.lvl, grade:o.grade, pos:o.pos,
    age:o.grade+5+(r()<0.55?1:0), h:0, ah:0, mat:'average', sk:{}, pot:0, dev:'steady', aggr:0,
    tr:{score:0,assist:0,stop:0,defend:0}, opp:0, st:{}, honors:[], awards:[], plan:null, susp:0, joined:C.year, ovr0:{}};
  [p.fn,p.ln]=genName(r);
  const mr=r(); p.mat = mr<0.25?'early':mr<0.75?'average':'late';
  p.ah = clamp(69.6+gauss(r)*2.8+(o.pos==='GK'?1.8:0)+(o.pos==='DEF'?0.6:0), 63, 78.5);
  p.h = p.ah - growthLeft(p.age,p.mat);
  const dr=r(); p.dev = dr<0.55?'steady':dr<0.85?'rapid':'streaky';
  p.aggr = clamp(Math.round(45+gauss(r)*16+(o.pos==='DEF'?8:0)), 5, 99);
  const prof={GK:{gk:0,spd:-14,pas:-12,sho:-30,def:-16,sta:-12},DEF:{def:0,spd:-4,pas:-7,sta:-3,sho:-18,gk:-45},MID:{pas:0,sta:-1,def:-7,sho:-6,spd:-5,gk:-45},FWD:{sho:0,spd:-1,pas:-7,def:-24,sta:-7,gk:-48}}[o.pos];
  const t=o.target;
  for(const k of SKILLS) p.sk[k]=clamp(t+prof[k]+gauss(r)*5, 8, 97);
  for(let i=0;i<4;i++){ const d=t-ovr(p); shiftOvr(p,d,'balanced'); }
  // special traits (0-10) start at 0 for everyone; only the editor raises them
  p.tr={score:0,assist:0,stop:0,defend:0};
  const cur=ovr(p); let gap;
  if(o.lvl==='MOD'){ gap = o.user ? 30+r()*26 : 15+r()*25; }
  else if(o.lvl==='JV'){ gap = o.user ? 14+r()*18 : 11+r()*17; }
  else gap = p.grade<=10? 8+r()*12 : p.grade===11? 4+r()*9 : 1+r()*5;
  if(o.potGap!=null) gap=o.potGap;
  let pot = cur+gap;
  if(o.user && o.lvl==='MOD' && r()<0.09) pot = 99;
  p.pot = Math.round(clamp(pot, Math.ceil(cur), o.user?99:94));
  return p;
}
function levelTarget(lvl, grade, s, user){
  if(lvl==='V') return 60 + s*14 + (grade>=12?2:grade===11?0:-2);
  if(lvl==='JV') return 47 + s*10 + (grade>=10?2:-1);
  return 36 + s*8 + (grade>=8?2:-2) + (user?2:0);
}
function pname(p){ return p? p.fn+' '+p.ln : 'Unknown'; }

/* ---------- world generation ---------- */
function genTown(r, used){
  for(let i=0;i<200;i++){
    const t = r()<0.6 ? pick(r,TOWNS) : (r()<0.45 ? pick(r,TOWN_PRE)+' '+pick(r,TOWN_STEM)+pick(r,TOWN_ROOT).toLowerCase() : pick(r,TOWN_STEM)+pick(r,TOWN_ROOT).toLowerCase());
    if(!used.has(t)){ used.add(t); return t; }
  }
  return 'Town '+used.size;
}
function genStadium(r, town, tier){
  const tpl = pick(r, STADIUM_NAMES[tier]);
  const T = STADIUM_TIERS[tier];
  return {name: tpl.replace('{T}',town).replace('{L}',pick(r,LAST_NAMES)), tier, cap: Math.round((T.min+r()*(T.max-T.min))/10)*10,
    surface: r()<0.72?'turf':'grass', track: r()<0.6?'red':'blue', every: r()<0.5?4:5, lastEval:0, ovr:null};
}
function genCoach(C, r, sid, user){
  const pers = pick(r, COACH_PERS);
  const [fn,ln]=genName(r);
  return {id:nid(C,'c'), name:fn+' '+ln, sid, pers:pers.k, youth: user?0:clamp(pers.youth+gauss(r)*0.15,-1,1),
    ab: user?70:Math.round(clamp(62+gauss(r)*10,40,92)), user:!!user, rec:{}, titles:0, since:C.year,
    tac:{pass:rint(r,25,75), tempo:rint(r,30,75), press:rint(r,25,80), ment:rint(r,30,70)}, form: pick(r,Object.keys(FORMS))};
}
function genSchool(C, r, o){
  let town = o.town, idName=null; if(!town){ const usedT=C._towns || new Set(Object.values(C.schools).map(s=>s.town)); if(typeof genIdentity==='function'){ const id=genIdentity(r,usedT); town=id.town; idName=id.name; } else town=genTown(r,usedT); }
  const usedMk=new Set(Object.values(C.schools).filter(x=>!x.ext&&!o.ext).map(x=>x.mk)); const freeMk=MASCOT_KEYS.filter(k=>!usedMk.has(k));
  const mk = o.mk || pick(r, freeMk.length?freeMk:MASCOT_KEYS); const mascot = pick(r, MASCOT_BY[mk].alt);
  const cp = pick(r, COLOR_PAIRS);
  const sfx = pick(r, SCHOOL_SUFFIX);
  const s = {id:nid(C,'s'), name: idName||(town+' '+sfx), town, mascot, mk, c1:cp[0], c2:cp[1], strength:o.strength,
    ext:o.ext||null, extYear:o.ext?C.year:null, devFocus: pick(r,['attacking','defending','possession','fitness','balanced']),
    prestige: Math.round(30+o.strength*50), honors:[], lu:{}, coachId:null, hist:[], stadium:null};
  s.stadium = genStadium(r, town, o.tier || (o.strength>0.8&&r()<0.5?4: o.strength>0.45?(r()<0.6?3:2): (r()<0.6?2:1)));
  const coach = genCoach(C, r, s.id, o.user);
  C.coaches[coach.id]=coach; s.coachId=coach.id;
  C.schools[s.id]=s;
  return s;
}
const SQUAD_PLAN = {V:{size:22,pos:{GK:3,DEF:7,MID:7,FWD:5},grades:[10,10,11,11,11,11,11,11,11,11,11,11,12,12,12,12,12,12,12,12,12,12]},
  JV:{size:20,pos:{GK:2,DEF:7,MID:6,FWD:5},grades:[9,9,9,9,9,9,9,9,9,9,10,10,10,10,10,10,10,10,10,10]},
  MOD:{size:20,pos:{GK:2,DEF:7,MID:6,FWD:5},grades:[7,7,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8,8]}};
function posList(r, plan){ const a=[]; for(const g of GROUPS) for(let i=0;i<plan.pos[g];i++) a.push(g); return shuffle(r,a); }
function genSquad(C, r, sch, lvl, user, baseOverride){
  const plan = SQUAD_PLAN[lvl];
  const pos = posList(r, plan);
  const used = new Set();
  const list=[];
  plan.grades.forEach((g,i)=>{
    const target = (baseOverride!=null? baseOverride + (g>=12?1:g===11?0:-2) : levelTarget(lvl,g,sch.strength,user)) + gauss(r)*5;
    const p = genPlayer(C, r, {sid:sch.id, lvl, grade:g, pos:pos[i], target, user});
    p.num = assignNum(r, used, p.pos);
    C.players[p.id]=p; list.push(p);
  });
  return list;
}
function assignNum(r, used, pos){
  const pref = pos==='GK'?[1,0,12,13,30,31]:pos==='DEF'?[2,3,4,5,6,15,16,22]:pos==='MID'?[6,8,10,14,17,18,20,23]:[7,9,11,19,21,24,27,99];
  for(const n of pref) if(!used.has(n)&&r()<0.7){ used.add(n); return n; }
  for(let i=0;i<300;i++){ const n=rint(r,1,99); if(!used.has(n)){ used.add(n); return n; } }
  return 0;
}

function newCareer(opts){
  const seed = opts.seed>>>0 || (Math.random()*4294967295)>>>0;
  const C = {v:SCHEMA, slot:opts.slot, seed, gs:hashStr('gen'+seed), nextId:1, year:opts.year||2026, seasonNo:1,
    phase:'preseason', md:0, pre:{rd:0, fx:[], skipped:false}, post:null,
    schools:{}, coaches:{}, players:{}, alumni:{}, fixtures:{}, league:[], userSid:null, userCoachId:null,
    stateName:'', section:5, news:[], awards:{}, archives:[], tourneys:{},
    rec:{game:{}, gameSchool:{}}, rivals:{heated:null,seasonal:null},
    training:'balanced', directed:{}, live:null, rolled:{}, logs:{},
    settings:{difficulty:'normal', cards:'normal', suspensions:true, legacyFav:false, manager:false, halftime:true, speed:2, odds:true},
    created: opts.now||0, _towns:new Set()};
  const r = genR(C);
  C.stateName = pick(r, US_STATES);
  // eight league schools with spread strengths
  const strengths = shuffle(r,[0.15,0.28,0.38,0.48,0.56,0.66,0.78,0.9]).map(s=>clamp(s+gauss(r)*0.04,0.05,0.97));
  const userIdx = rint(r,0,7);
  strengths[userIdx] = 0.38 + r()*0.16;
  for(let i=0;i<8;i++){
    const sch = genSchool(C, r, {strength:strengths[i], user:i===userIdx});
    C.league.push(sch.id);
    for(const lvl of LVLS) genSquad(C, r, sch, lvl, i===userIdx);
    if(i===userIdx){ C.userSid = sch.id; C.userCoachId = sch.coachId; C.coaches[sch.coachId].name = opts.coachName||C.coaches[sch.coachId].name; }
  }
  // rivals
  const others = C.league.filter(id=>id!==C.userSid);
  C.rivals.heated = pick(r, others);
  C.rivals.seasonal = pick(r, others.filter(id=>id!==C.rivals.heated));
  for(const sid of C.league) for(const lvl of LVLS) setLineup(C, sid, lvl, autoLineup(C, sid, lvl, C.coaches[C.schools[sid].coachId].form));
  const us = C.schools[C.userSid];
  for(const lvl of LVLS){ const best=bestFormation(C, C.userSid, lvl); setLineup(C, C.userSid, lvl, best.lineup); us.lu[lvl].strat='balanced'; us.lu[lvl].tac={pass:50,tempo:50,press:50,ment:50}; }
  seasonStart(C);
  addNews(C,'program',`${C.coaches[C.userCoachId].name} named head coach at ${us.name}`, C.userSid);
  addNews(C,'rivalry',`${us.town} and ${C.schools[C.rivals.heated].town} renew one of ${C.stateName}'s fiercest rivalries this fall`, C.rivals.heated);
  delete C._towns;
  return C;
}

/* ---------- squads & lineups ---------- */
function squad(C, sid, lvl){ const out=[]; for(const id in C.players){ const p=C.players[id]; if(p.sid===sid&&p.lvl===lvl) out.push(p); } return out; }
function schoolPlayers(C, sid){ const out=[]; for(const id in C.players){ const p=C.players[id]; if(p.sid===sid) out.push(p); } return out; }
function getLu(C,sid,lvl){ return C.schools[sid].lu[lvl]; }
function setLineup(C, sid, lvl, lu){ const s=C.schools[sid]; const prev=s.lu[lvl]||{}; s.lu[lvl]={tac:prev.tac||{...C.coaches[s.coachId].tac}, strat:prev.strat||'balanced', caps:prev.caps||[], ...lu}; if(!s.lu[lvl].caps||s.lu[lvl].caps.length<2) s.lu[lvl].caps=defaultCaptains(C,sid,lvl); }
function defaultCaptains(C,sid,lvl){ return squad(C,sid,lvl).sort((a,b)=>(b.grade-a.grade)||(ovr(b)-ovr(a))||(a.id<b.id?-1:1)).slice(0,2).map(p=>p.id); }
function autoLineup(C, sid, lvl, form, opts={}){
  const tpl = FORMS[form]||FORMS['4-4-2'];
  const youth = opts.youth!=null? opts.youth : (sid===C.userSid?0:(C.coaches[C.schools[sid].coachId]||{}).youth||0);
  const pool = squad(C,sid,lvl).filter(p=>!p.susp);
  const slots = tpl.map(([role,x,y])=>({role,x,y,pid:null}));
  const sc = (p,role)=> eff(p,role) + (12-p.grade-1)*youth*1.2;
  const pairs=[];
  slots.forEach((s,si)=>pool.forEach(p=>pairs.push([sc(p,s.role),si,p.id])));
  pairs.sort((a,b)=>b[0]-a[0]|| (a[2]<b[2]?-1:1));
  const used=new Set();
  for(const [v,si,pid] of pairs){ if(slots[si].pid||used.has(pid)) continue; slots[si].pid=pid; used.add(pid); }
  // improvement passes: swaps and bench replacements
  for(let pass=0; pass<4; pass++){
    let improved=false;
    for(let i=0;i<slots.length;i++) for(let j=i+1;j<slots.length;j++){
      const a=C.players[slots[i].pid], b=C.players[slots[j].pid]; if(!a||!b) continue;
      if(sc(a,slots[j].role)+sc(b,slots[i].role) > sc(a,slots[i].role)+sc(b,slots[j].role)+0.01){ [slots[i].pid,slots[j].pid]=[slots[j].pid,slots[i].pid]; improved=true; }
    }
    for(const s of slots){ for(const p of pool){ if(used.has(p.id)) continue; const cur=C.players[s.pid]; if(!cur || sc(p,s.role)>sc(cur,s.role)+0.01){ if(cur) used.delete(cur.id); s.pid=p.id; used.add(p.id); improved=true; } } }
    if(!improved) break;
  }
  return {form, slots};
}
function lineupScore(C, lu){ let t=0; for(const s of lu.slots){ const p=C.players[s.pid]; if(p) t+=eff(p,s.role); } return t; }
function bestFormation(C, sid, lvl){
  let best=null;
  for(const f of Object.keys(FORMS)){ const lu=autoLineup(C,sid,lvl,f,{youth:0}); const v=lineupScore(C,lu); if(!best||v>best.v+0.001) best={form:f,v,lineup:lu}; }
  const sq=squad(C,sid,lvl);
  const grp = g=>sq.filter(p=>p.pos===g).sort((a,b)=>ovr(b)-ovr(a));
  const top=(g,n)=>{ const a=grp(g).slice(0,n); return a.length? Math.round(a.reduce((s,p)=>s+ovr(p),0)/a.length):0; };
  const cnt = {DEF:0,MID:0,FWD:0}; FORMS[best.form].forEach(([role])=>{ const g=ROLE_GROUP[role]; if(g!=='GK') cnt[g]++; });
  best.why = `${best.form} puts your strongest players in natural roles: top ${cnt.DEF} defenders average ${top('DEF',cnt.DEF)}, top ${cnt.MID} midfielders ${top('MID',cnt.MID)}, top ${cnt.FWD} forward${cnt.FWD>1?'s':''} ${top('FWD',cnt.FWD)}. It maximizes position fit for this roster; it does not guarantee results.`;
  return best;
}
function validateLineup(C, sid, lvl){
  const lu=getLu(C,sid,lvl); const issues=[], warns=[];
  if(!lu||!lu.slots||lu.slots.length!==11) { issues.push('Lineup needs 11 starters.'); return {ok:false,issues,warns}; }
  const gkSlots = lu.slots.filter(s=>s.role==='GK'); if(gkSlots.length!==1) issues.push('Exactly one goalkeeper slot is required.');
  const seen=new Set();
  for(const s of lu.slots){ const p=C.players[s.pid];
    if(!p){ issues.push(`${s.role} slot is empty.`); continue; }
    if(p.sid!==sid||p.lvl!==lvl) issues.push(`${pname(p)} is no longer in this squad.`);
    if(seen.has(p.id)) issues.push(`${pname(p)} is listed twice.`); seen.add(p.id);
    if(p.susp>0) issues.push(`${pname(p)} is suspended.`);
    const g=ROLE_GROUP[s.role]; if(p.pos!==g) warns.push(`${pname(p)} (${p.pos}) is playing ${s.role}.`);
  }
  return {ok:!issues.length, issues, warns};
}
function repairLineup(C, sid, lvl){
  const lu=getLu(C,sid,lvl); if(!lu) { setLineup(C,sid,lvl,autoLineup(C,sid,lvl,'4-4-2')); return; }
  const pool=squad(C,sid,lvl).filter(p=>!p.susp); const used=new Set();
  for(const s of lu.slots){ const p=C.players[s.pid]; if(p&&p.sid===sid&&p.lvl===lvl&&!p.susp&&!used.has(p.id)) used.add(p.id); else s.pid=null; }
  for(const s of lu.slots){ if(s.pid) continue; let best=null,bv=-1; for(const p of pool){ if(used.has(p.id)) continue; const v=eff(p,s.role); if(v>bv){bv=v;best=p;} } if(best){ s.pid=best.id; used.add(best.id);} }
  lu.caps=(lu.caps||[]).filter(id=>C.players[id]&&C.players[id].sid===sid&&C.players[id].lvl===lvl);
  if(lu.caps.length<2){ for(const id of defaultCaptains(C,sid,lvl)) if(lu.caps.length<2&&!lu.caps.includes(id)) lu.caps.push(id); }
}
/* match-day copy of a lineup with invalid or suspended entries filled; never mutates the saved lineup */
function matchSlots(C,sid,lvl){
  const lu=getLu(C,sid,lvl); const slots=lu.slots.map(s=>({...s})); const pool=squad(C,sid,lvl).filter(p=>!p.susp); const used=new Set();
  for(const s of slots){ const p=C.players[s.pid]; if(p&&p.sid===sid&&p.lvl===lvl&&!p.susp&&!used.has(p.id)) used.add(p.id); else s.pid=null; }
  for(const s of slots){ if(s.pid) continue; let best=null,bv=-1; for(const p of pool){ if(used.has(p.id)) continue; const v=eff(p,s.role); if(v>bv){bv=v;best=p;} } if(best){ s.pid=best.id; used.add(best.id);} }
  return slots;
}
function xiRating(C,sid,lvl){ const lu=getLu(C,sid,lvl); if(!lu) return 0; let t=0,n=0; for(const s of lu.slots){ const p=C.players[s.pid]; if(p){ t+=eff(p,s.role); n++; } } return n? t/n : 0; }

/* ---------- strategies & speeches (user only) ---------- */
const STRATS = {
  balanced:{n:'Balanced',d:'Neutral approach. No modifiers either way.',m:{}},
  press:{n:'High Press',d:'Win the ball high. More possession and chances, but space opens behind your back line.',m:{poss:.05,A:1.03,D:.97,oppRate:1.04}},
  possession:{n:'Possession Control',d:'Keep the ball and wait for openings. Fewer shots, better ones.',m:{poss:.08,rate:.9,xg:1.09}},
  counter:{n:'Counter Attack',d:'Sit in, break fast. Less of the ball, sharper chances. Suits weaker sides.',m:{poss:-.08,rate:.95,xg:1.14,D:1.03}},
  setpiece:{n:'Set-Piece Focus',d:'Drill corners and free kicks. More dead-ball chances, slightly less open play.',m:{setp:1.7,spX:1.2,rate:.97}},
  wings:{n:'Wing Play',d:'Stretch the pitch. More crosses and headers; tall strikers love it.',m:{cross:1.8,A:1.02,M:.98}},
  youth:{n:'Youth Showcase',d:'Build around underclassmen. They play a little above themselves and develop faster, at a small cost overall.',m:{youth:1.05,A:.99,M:.99,D:.99,dev:1.25}}
};
const SPEECHES = {
  none:{n:'No Speech',d:'Say nothing. The team keeps its first-half settings.',f:()=>({})},
  rally:{n:'Rally the Boys',d:'Lift morale. Strongest when you are behind; does little if you are already ahead.',f:c=>({A:c.diff<0?1.09:c.diff===0?1.03:1,M:c.diff<0?1.03:1})},
  focus:{n:'Demand Focus',d:'Sharper passing and shot selection, with a little more tension at the back.',f:()=>({M:1.05,xg:1.06,D:.95,card:1.2})},
  hold:{n:'Hold the Line',d:'Defensive work rate and tackling. Protects a lead, but you create less.',f:()=>({D:1.13,A:.88,rate:.86,oppRate:.92})},
  underdog:{n:'Encourage the Underdogs',d:'Belief against a stronger side. Backfires slightly if you are the favorite.',f:c=>c.weaker?({A:1.06,M:1.05,D:1.05}):({A:.96,M:.97,D:.97})},
  composed:{n:'Stay Composed',d:'Calm heads. Half the card risk and steadier possession, with no attacking lift.',f:()=>({card:.5,M:1.02,D:1.01})},
  push:{n:'Push for the Winner',d:'Commit numbers forward. More chances at both ends; risky with a lead.',f:()=>({A:1.16,rate:1.25,D:.82,oppRate:1.25})},
  youngsters:{n:'Trust the Youngsters',d:'Back your underclassmen. Lifts sophomores and younger; little effect on a veteran XI.',f:()=>({youth:1.1})},
  shape:{n:'Protect Our Shape',d:'Stay compact and slow it down. Fewer chances at both ends.',f:()=>({D:1.06,M:1.04,A:.96,rate:.9,oppRate:.84})}
};
const TRAINING = {balanced:'Balanced',attacking:'Finishing & speed',defending:'Defending & keeping',possession:'Passing & possession',fitness:'Fitness & pace',youth:'Youth program focus'};

/* ---------- match engine ---------- */
const SHOT_TYPES = [
  {k:'open',n:'Open-play finish',w:38,xg:.104,ast:.6},
  {k:'cross',n:'Finish from a cross',w:11,xg:.16,ast:.9,cross:1},
  {k:'header',n:'Header',w:10,xg:.12,ast:.9,cross:1,head:1},
  {k:'long',n:'Long-range strike',w:15,xg:.045,ast:.12},
  {k:'tapin',n:'Tap-in',w:7,xg:.42,ast:.85},
  {k:'corner',n:'Corner header',w:7,xg:.08,ast:.95,setp:1,head:1},
  {k:'fk',n:'Free kick',w:5,xg:.07,ast:0,setp:1},
  {k:'pen',n:'Penalty',w:1.6,xg:.76,ast:0,setp:1},
  {k:'solo',n:'Solo run',w:5.4,xg:.2,ast:0},
  {k:'break',n:'Breakaway',w:3.1,xg:.3,ast:.6}
];
/* how much space the shooter had: open shots go in far more often than heavily marked ones */
const SPACE_X={open:1.6,normal:1,tight:0.45};
const SHOT_BY = Object.fromEntries(SHOT_TYPES.map(t=>[t.k,t]));
const COMP_NAME = {pre:'Preseason Cup',reg:'League',sec:'Sectionals',rgn:'Regional',st:'State Tournament'};
const isKO = comp => comp==='sec'||comp==='rgn'||comp==='st';
const bucketOf = comp => comp==='pre'?'pre':comp==='reg'?'reg':'post';
const blankTeamStats = ()=>({sh:0,sot:0,xg:0,pos:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,cor:0,off:0});
const blankRow = (pid,role)=>({pid,role,g:0,a:0,sh:0,sot:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,ga:0,rt:0});

function attendance(C, f){
  if(f.comp==='rgn'||f.comp==='st') return {att: f.comp==='st'?4200+(hashStr(f.id)%1500):2600, home:0, neutral:true};
  if(f.neutral) return {att: 1600+(hashStr(f.id)%900), home:0, neutral:true}; // a preseason showcase at a neutral district stadium
  const s=C.schools[f.h]; const st=effStadium(s);
  let fill=0.42; const riv=isRivalry(C,f.h,f.a); if(riv) fill+=0.25; if(f.comp==='sec') fill+=0.25; if(f.lvl!=='V') fill*=0.35;
  const att=Math.round(Math.min(1,fill)*st.cap);
  return {att, home: Math.min(0.025, att/160000), neutral:false};
}
function isRivalry(C,a,b){ const u=C.userSid; if(a!==u&&b!==u) return null; const o=a===u?b:a; if(o===C.rivals.heated) return 'heated'; if(o===C.rivals.seasonal) return 'seasonal'; return null; }

function startMatch(C, fid, opts={}){
  const f=C.fixtures[fid];
  const at=attendance(C,f);
  const sides=[f.h,f.a].map((sid,i)=>{
    if(!getLu(C,sid,f.lvl)) setLineup(C,sid,f.lvl,autoLineup(C,sid,f.lvl,'4-4-2'));
    const lu=getLu(C,sid,f.lvl); const user = sid===C.userSid;
    const coach=C.coaches[C.schools[sid].coachId]||{tac:{pass:50,tempo:50,press:50,ment:50}};
    const slots=matchSlots(C,sid,f.lvl);
    let gk=(slots.find(s=>s.role==='GK')||{}).pid; if(!gk){ const b=slots.filter(s=>s.pid).reduce((a,s)=>!a||eff(C.players[s.pid],'GK')>eff(C.players[a.pid],'GK')?s:a,null); gk=b&&b.pid; }
    return {sid, user, form:lu.form, slots, tac:{...(user?lu.tac:coach.tac)}, strat:user?(lu.strat||'balanced'):'balanced', off:{}, yel:{}, gk, speech:'none', home: i===0?at.home:0};
  });
  const seed = hashStr(C.seed+'|'+fid+(opts.seedSalt||''));
  const M={fid, lvl:f.lvl, comp:f.comp, ko:isKO(f.comp), min:0, phase:'play', sc:[0,0], rs:seed, rc:hashStr('cos'+seed), ver:0, sides,
    ev:[], st:[blankTeamStats(),blankTeamStats()], pl:{}, heat:[new Array(12).fill(0),new Array(12).fill(0)], shots:[],
    htDone:false, htOn:!!opts.halftime, user: sides[0].user?0:sides[1].user?1:-1, preP:opts.preP||null, att:at.att,
    fast:!!opts.fast, so:null, forced:null, legacy:false, touch:[], cards:{low:.6,normal:1,strict:1.4}[C.settings.cards]||1, ht:null};
  for(const S of sides) for(const s of S.slots) if(s.pid) M.pl[s.pid]=blankRow(s.pid,s.role);
  if(!M.fast && C.settings.legacyFav && M.user>=0 && M.preP && M.preP[M.user]>=0.85) M.legacy = M.preP[M.user]>=0.905?2:1;
  const d = !opts.fast && C.directed[fid];
  if(d) M.forced = buildForced(C, M, f, d);
  return M;
}
function unitsFor(C, M, i){
  const S=M.sides[i]; const half=M.min>40?2:1; const diff=M.sc[i]-M.sc[1-i];
  const key=M.ver+'|'+half+'|'+Math.sign(diff); if(S._uk===key) return S._u;
  const sp = (S.user && half===2 && S.speech!=='none') ? SPEECHES[S.speech].f({diff, weaker: M.preP? M.preP[i]<M.preP[1-i] : false}) : {};
  const st = STRATS[S.strat]?STRATS[S.strat].m:{};
  const W={att:{FWD:1,MID:.55,DEF:.15},mid:{FWD:.35,MID:1,DEF:.4},def:{FWD:.08,MID:.45,DEF:1}};
  const sums={att:0,mid:0,def:0}, wts={att:0,mid:0,def:0}; let G=25; const cnt={DEF:0,MID:0,FWD:0};
  for(const s of S.slots){ const g=ROLE_GROUP[s.role]; if(g==='GK') continue; for(const k in wts) wts[k]+=W[k][g]; }
  for(const s of S.slots){
    const p=C.players[s.pid]; if(!p) continue;
    if(s.pid===S.gk){ if(!S.off[s.pid]) G=eff(p,'GK')+TRAIT.stopG*(p.tr.stop||0); continue; }
    if(S.off[s.pid]) continue; const g=ROLE_GROUP[s.role]; if(g==='GK') continue;
    let e=eff(p,s.role);
    if(p.grade<=10){ if(st.youth) e*=st.youth; if(sp.youth) e*=sp.youth; }
    const tr=p.tr||{}; sums.att+=W.att[g]*(e+TRAIT.attU*(tr.score||0)+TRAIT.astU*0.6*(tr.assist||0)); sums.mid+=W.mid[g]*(e+TRAIT.astU*(tr.assist||0)); sums.def+=W.def[g]*(e+TRAIT.defU*(tr.defend||0)); cnt[g]++;
  }
  let A=sums.att/wts.att, Mi=sums.mid/wts.mid, D=sums.def/wts.def;
  A*=1+0.015*(cnt.FWD-2); D*=1+0.02*(cnt.DEF-4); Mi*=1+0.015*(cnt.MID-4);
  const t=S.tac; const m=(t.ment-50)/50, tp=(t.tempo-50)/50, pr=(t.press-50)/50, pa=(t.pass-50)/50;
  A*=1+0.06*m; D*=1-0.05*m;
  let rate=(1+0.1*m)*(1+0.12*tp)*(1+0.05*pr), oppRate=(1+0.06*tp)*(1+0.04*pr), poss=0.03*pr-0.02*tp-0.04*pa, xg=1-0.05*pa, cross=1+0.6*pa, setp=1, spX=1, card=(1+0.3*pr);
  const mods=[st,sp];
  for(const md of mods){ if(md.A) A*=md.A; if(md.M) Mi*=md.M; if(md.D) D*=md.D; if(md.rate) rate*=md.rate; if(md.oppRate) oppRate*=md.oppRate; if(md.poss) poss+=md.poss; if(md.xg) xg*=md.xg; if(md.cross) cross*=md.cross; if(md.setp) setp*=md.setp; if(md.spX) spX*=md.spX; if(md.card) card*=md.card; }
  Mi*=1+S.home; D*=1+S.home;
  if(M.legacy && i===M.user){ rate*=M.legacy===2?1.75:1.45; xg*=M.legacy===2?1.3:1.15; }
  const u={A,M:Mi,D,G,rate,oppRate,poss,xg,cross,setp,spX,card};
  S._uk=key; S._u=u; return u;
}
function onPitch(C,S,includeGK){ const a=[]; for(const s of S.slots){ if(!s.pid||S.off[s.pid]) continue; if(!includeGK && s.pid===S.gk) continue; const p=C.players[s.pid]; if(p) a.push({p,s}); } return a; }
const GRP_SHOT={FWD:1,MID:.42,DEF:.1,GK:0};
function shooterWeight(M,o,type){
  const {p,s}=o; const g=ROLE_GROUP[s.role]; let w=GRP_SHOT[g]||0;
  const q = type.head? (p.sk.sho*0.4+hF(p)*0.6) : p.sk.sho;
  w *= Math.pow(q/60,2.2) * (1+TRAIT.shotW*(p.tr.score||0));
  if(g==='FWD') w*=1+p.opp/230; else if(g==='MID') w*=1+p.opp/380;
  if(s.role==='ST') w*=1.3; else if(s.role==='LW'||s.role==='RW'||s.role==='AM') w*=1.12;
  const row=M.pl[p.id]; if(row) w*=Math.min(1.2,1+0.07*row.g);
  return w;
}
function shotLoc(rc,type){
  const R=(a,b)=>a+rc()*(b-a);
  switch(type.k){ case 'tapin': return [R(42,58),R(94,98)]; case 'header': case 'corner': return [R(36,64),R(88,95)]; case 'cross': return [R(32,68),R(86,94)];
    case 'long': return [R(22,78),R(66,79)]; case 'fk': return [R(28,72),R(70,80)]; case 'pen': return [50,89]; case 'solo': return [R(30,70),R(82,92)]; case 'break': return [R(36,64),R(83,91)]; default: return [R(28,72),R(79,92)]; }
}
function buildSeq(C, rc, S, shooter, assister, type, loc){
  // build-up always moves the ball forward: deeper players start it, the assister and scorer finish it
  const seq=[]; const posOf=pid=>{ const sl=S.slots.find(s=>s.pid===pid); return sl?[sl.x,sl.y]:[50,50]; };
  const others=onPitch(C,S,false).filter(o=>o.p.id!==shooter.id&&(!assister||o.p.id!==assister.id)).map(o=>({o,y:posOf(o.p.id)[1]}));
  const n = type.k==='pen'||type.k==='fk'||type.k==='corner'?0 : type.k==='break'?1 : 1+Math.floor(rc()*2);
  const bands = type.k==='break'? [[28,42]] : n===1? [[44,60]] : [[36,50],[52,64]];
  let lastY=0;
  for(let i=0;i<n&&others.length;i++){ const [lo,hi]=bands[i]; const pool=others.filter(x=>x.y<=hi+18&&x.y>=lastY-6); const pick=(pool.length?pool:others)[Math.floor(rc()*(pool.length||others.length))]; others.splice(others.indexOf(pick),1);
    const [x]=posOf(pick.o.p.id); const y=clamp(Math.max(lastY+8,lo+rc()*(hi-lo)),10,80); lastY=y; seq.push({pid:pick.o.p.id,x:clamp(x+(rc()-.5)*14,8,92),y,a:'pass'}); }
  if(type.k==='break'){ const [x]=posOf(shooter.id); seq.push({pid:shooter.id,x:clamp(x,25,75),y:Math.max(lastY+14,56),a:'run'}); }
  if(!assister && (type.k==='corner'||type.cross) && others.length){ const wide=others.filter(x=>{ const sl=S.slots.find(s=>s.pid===x.o.p.id); return sl&&(sl.x<25||sl.x>75); }); const d=(wide.length?wide:others)[Math.floor(rc()*(wide.length||others.length))].o.p;
    if(type.k==='corner') seq.push({pid:d.id,x:rc()<.5?2:98,y:99,a:'corner',na:1}); else seq.push({pid:d.id,x:rc()<.5?rint(rc,6,14):rint(rc,86,94),y:rint(rc,Math.max(80,lastY+6),92),a:'cross',na:1}); }
  if(assister){
    if(type.k==='corner') seq.push({pid:assister.id,x:rc()<.5?2:98,y:99,a:'corner'});
    else if(type.cross) seq.push({pid:assister.id,x:rc()<.5?rint(rc,6,14):rint(rc,86,94),y:rint(rc,Math.max(80,lastY+6),92),a:'cross'});
    else if(type.k!=='break'){ const [x]=posOf(assister.id); seq.push({pid:assister.id,x:clamp(x,20,80),y:Math.max(lastY+6,rint(rc,66,80)),a:'pass'}); }
  } else if(type.k==='solo'){ const [x,y]=posOf(shooter.id); seq.push({pid:shooter.id,x,y:clamp(Math.max(y,lastY+6),50,72),a:'run'}); }
  if(type.k==='fk') seq.push({pid:shooter.id,x:loc[0],y:loc[1],a:'setup'});
  if(type.k==='pen') seq.push({pid:shooter.id,x:50,y:89,a:'setup'});
  seq.push({pid:shooter.id,x:loc[0],y:loc[1],a:'shot'});
  return seq;
}
function zoneOf(x,y){ const r=clamp(Math.floor(y/25),0,3), c=clamp(Math.floor(x/33.34),0,2); return r*3+c; }
function addTeamDef(C,M,rc,side,kind){
  const S=M.sides[side]; const pool=onPitch(C,S,false); if(!pool.length) return;
  const G={DEF:1,MID:.55,FWD:.12};
  const o=wpick(rc,pool,({p,s})=>{ const g=ROLE_GROUP[s.role]; let w=(G[g]||.1)*Math.pow(p.sk.def/60,2)*(1+TRAIT.defW*(p.tr.defend||0)); if(g==='DEF') w*=1+p.opp/200; else if(g==='MID') w*=1+p.opp/380; return w; });
  M.pl[o.p.id][kind]++; M.st[side][kind]++; M.heat[side][zoneOf(o.s.x,o.s.y)]++;
}
const USER_REG_CAP=6;
function userCapped(C,M,side){ const S=M.sides[side]; if(!S||S.sid!==C.userSid) return false; const f=C.fixtures[M.fid]; return !!f&&f.comp==='reg'&&M.sc[side]>=USER_REG_CAP; }
function stepMatch(C, M){
  if(M.phase==='ft'||M.phase==='ht') return [];
  if(M.phase==='so') return shootoutKick(C,M);
  const r=rngFrom(M.rs), rc=M.fast?null:rngFrom(M.rc);
  const out=[];
  M.min++; const m=M.min;
  const U=[unitsFor(C,M,0),unitsFor(C,M,1)];
  let pH=clamp(0.5+(U[0].M-U[1].M)/70+U[0].poss-U[1].poss,0.22,0.78);
  let side = r()<pH?0:1;
  const fg = M.forced && M.forced.goals[m]!=null ? M.forced.goals[m] : null;
  if(fg!=null) side=fg;
  const opp=1-side; M.st[side].pos++;
  if(!M.fast){
    const S=M.sides[side]; const pool=onPitch(C,S,true);
    M.touch=[]; for(let i=0;i<2&&pool.length;i++){ const o=wpick(rc,pool,({p,s})=>{const g=ROLE_GROUP[s.role]; return (g==='MID'?1.4:g==='GK'?.3:1)*(p.sk.pas/60)*(1+(g==='MID'?p.opp/200:0));}); M.touch.push({s:side,pid:o.p.id,x:o.s.x,y:o.s.y}); M.heat[side][zoneOf(o.s.x,o.s.y)]++; }
  }
  let rate=clamp(0.288*Math.exp(1.1*Math.tanh((U[side].A-U[opp].D)/24))*U[side].rate*U[opp].oppRate,0.02,0.92);
  let shotHappened=false;
  if(fg!=null || r()<rate){
    shotHappened=true;
    const S=M.sides[side], O=M.sides[opp];
    const pool=onPitch(C,S,false);
    if(pool.length){
      const tempo=(S.tac&&S.tac.tempo!=null)?S.tac.tempo:50; const brk=clamp(1+(tempo-50)/80,0.6,1.6)*(U[side].xg>1.1?1.4:1);
      const type=wpick(r,SHOT_TYPES,t=>t.w*(t.setp?U[side].setp:1)*(t.cross?U[side].cross:1)*(t.k==='break'?brk:1));
      let sh;
      if(type.k==='pen'){ sh=pool.reduce((a,b)=>b.p.sk.sho>a.p.sk.sho?b:a); }
      else sh=wpick(r,pool,o=>shooterWeight(M,o,type));
      const p=sh.p;
      const shQ = type.head? p.sk.sho*0.45+hF(p)*0.55 : p.sk.sho*0.8+p.sk.spd*0.1+p.sk.pas*0.1;
      let q=type.xg*Math.exp((shQ-U[opp].G)/55)*Math.exp(clamp(U[side].A-U[opp].D,-25,25)/80)*U[side].xg*(type.setp?U[side].spX:1)*(1+TRAIT.xg*(p.tr.score||0));
      let space='normal'; if(type.k==='open'||type.k==='long'||type.k==='solo'||type.k==='cross'){ const z=r(); space=z<0.24?'open':z>0.76?'tight':'normal'; } else if(type.k==='break'||type.k==='tapin'||type.k==='pen') space='open';
      if(type.k==='open'||type.k==='long'||type.k==='solo'||type.k==='cross') q*=SPACE_X[space];
      q=clamp(q, type.k==='pen'?0.55:0.015, type.k==='pen'?0.9:0.82);
      let goal = fg!=null ? true : (M.forced? false : r()<q);
      /* regular season: the user's team never scores more than USER_REG_CAP in a game; a chance beyond that is saved or missed */
      if(goal&&userCapped(C,M,side)) goal=false;
      const onT = goal || r()<0.4;
      const row=M.pl[p.id]; row.sh++; M.st[side].sh++; M.st[side].xg+=q; if(onT){row.sot++; M.st[side].sot++;}
      let ast=null, loc=[50,88], seq=null;
      if(!M.fast){
        loc=shotLoc(rc,type);
        if(goal && type.ast>0 && rc()<type.ast){
          const cand=onPitch(C,S,true).filter(o=>o.p.id!==p.id);
          const ao=wpick(rc,cand,({p:q2,s})=>{ const g=ROLE_GROUP[s.role]; let w=(g==='MID'?1:g==='FWD'?.75:g==='DEF'?.35:.04)*Math.pow(q2.sk.pas/60,2)*(1+TRAIT.astW*(q2.tr.assist||0))*(1+(g==='MID'?q2.opp/240:g==='FWD'?q2.opp/420:0)); if(type.cross&&(s.role==='LW'||s.role==='RW'||s.role==='LB'||s.role==='RB'||s.role==='LWB'||s.role==='RWB'||s.role==='LM'||s.role==='RM')) w*=1.8; return w; });
          if(ao) ast=ao.p;
        }
        seq = goal? buildSeq(C,rc,S,p,ast,type,loc) : null;
        M.heat[side][zoneOf(loc[0],loc[1])]++;
      }
      const ev={m, t:goal?'goal':onT?'save':'miss', s:side, pid:p.id, ty:type.k, xg:r1(q*100)/100, sp:space};
      if(goal){ M.sc[side]++; row.g++; if(ast){ ev.ast=ast.id; M.pl[ast.id].a++; } ev.sc=[...M.sc]; if(seq) ev.seq=seq; }
      else if(onT){ const gk=O.gk; if(gk&&M.pl[gk]){ M.pl[gk].sv++; ev.gk=gk; } M.st[opp].sv++; }
      if(goal){ const gk=O.gk; if(gk&&M.pl[gk]) M.pl[gk].ga++; }
      if(!M.fast){ ev.x=r1(loc[0]); ev.y=r1(loc[1]); M.shots.push({m,s:side,pid:p.id,ty:type.k,xg:ev.xg,x:ev.x,y:ev.y,res:ev.t}); }
      if(goal || !M.fast) out.push(ev);
      if(type.k==='corner'||(!goal&&onT&&r()<0.3)){ M.st[side].cor++; if(!goal) ev.cor=1; /* the save went behind: the broadcast shows the corner */ }
    }
  }
  // discipline (main stream: affects results)
  for(let i=0;i<2;i++){
    const S=M.sides[i]; const u=U[i]; const pool=onPitch(C,S,true); if(!pool.length) continue;
    if(r()<0.0042*M.cards*u.card){
      const o=wpick(r,pool,({p,s})=>Math.pow(p.aggr/50,2)*({DEF:1.3,MID:1.1,FWD:.8,GK:.25}[ROLE_GROUP[s.role]]||1));
      const pid=o.p.id; M.pl[pid].y++; M.st[i].y++;
      if(S.yel[pid]){ out.push(sendOff(C,M,i,pid,'2y')); }
      else { S.yel[pid]=1; out.push({m,t:'yellow',s:i,pid}); }
    } else if(r()<0.0001*M.cards*u.card){
      const o=wpick(r,pool,({p})=>Math.pow(p.aggr/50,3)); out.push(sendOff(C,M,i,o.p.id,'red'));
    }
  }
  /* offsides: their own random stream, keyed to the match and minute, so they never change a result or any other event */
  if(!M.fast&&M.phase!=='so'){ const ro=rngFrom(hashStr((M.fid||'m')+':off:'+m)); const S=M.sides[side];
    if(!out.some(e=>e.t==='goal')&&ro()<0.05*clamp(0.7+(U[side].A-U[opp].D)/60,0.5,1.5)){ const pool=onPitch(C,S,false).filter(o=>ROLE_GROUP[o.s.role]==='FWD'||ROLE_GROUP[o.s.role]==='MID');
      if(pool.length){ const o=wpick(ro,pool,({p,s:sl})=>(ROLE_GROUP[sl.role]==='FWD'?3:0.5)*(p.sk.spd/60)); const row=M.pl[o.p.id]; row.off=(row.off||0)+1; M.st[side].off=(M.st[side].off||0)+1;
        out.push({m,t:'offside',s:side,pid:o.p.id}); } } }
  // defensive actions (cosmetic stream only - never touches results RNG)
  if(!M.fast){
    if(rc()<0.34) addTeamDef(C,M,rc,opp,'tk');
    if(rc()<0.3) addTeamDef(C,M,rc,opp,'int');
    if(shotHappened? rc()<0.55 : rc()<0.14) addTeamDef(C,M,rc,opp,'cl');
    M.rc=rc.get();
  }
  M.rs=r.get();
  // period ends
  if(m===40 && !M.htDone){ M.htDone=true; M.ht={sc:[...M.sc], st:JSON.parse(JSON.stringify(M.st))}; if(M.htOn&&M.user>=0){ M.phase='ht'; } out.push({m:40,t:'ht'}); }
  if(m===80 || m===100){
    if(M.sc[0]===M.sc[1] && M.ko){
      if(m===80){ out.push({m,t:'et'}); }
      else { initShootout(C,M); out.push({m,t:'so'}); }
    } else { M.phase='ft'; out.push({m,t:'ft'}); }
  }
  if(!M.fast) M.ev.push(...out);
  return out;
}
function sendOff(C,M,i,pid,kind){
  const S=M.sides[i]; S.off[pid]=true; M.pl[pid].r++; M.st[i].r++; M.ver++;
  if(pid===S.gk){ const cand=onPitch(C,S,false); if(cand.length){ const b=cand.reduce((a,c)=>eff(c.p,'GK')>eff(a.p,'GK')?c:a); S.gk=b.p.id; } else S.gk=null; }
  return {m:M.min,t:'red',s:i,pid,k:kind};
}
function resumeSecondHalf(M, speech){ if(M.phase!=='ht') return false; if(M.user>=0) M.sides[M.user].speech = SPEECHES[speech]?speech:'none'; M.phase='play'; M.ver++; return true; }
function setLiveTactics(M, side, tac, form, slots){ const S=M.sides[side]; if(tac) S.tac={...tac}; if(slots){ S.slots=slots; S.form=form; } M.ver++; }
function initShootout(C,M){
  const order=[0,1].map(i=>{ const S=M.sides[i]; return onPitch(C,S,true).map(o=>o.p).sort((a,b)=>(b.sk.sho*(1+0.06*(b.tr.score||0)))-(a.sk.sho*(1+0.06*(a.tr.score||0)))).map(p=>p.id); });
  M.phase='so'; M.so={kicks:[],sc:[0,0],n:[0,0],order,turn:0,done:false};
}
function soOver(so){ const [a,b]=so.sc, [na,nb]=so.n; if(na<=5&&nb<=5){ if(a+(5-na)<b||b+(5-nb)<a) return true; if(na===5&&nb===5&&a!==b) return true; return false; } return na===nb && a!==b; }
function shootoutKick(C,M){
  const so=M.so; if(so.done) return [];
  const r=rngFrom(M.rs); const s=so.turn; const S=M.sides[s], O=M.sides[1-s];
  const list=so.order[s]; const pid=list[so.n[s]%list.length]; const p=C.players[pid];
  const gk=C.players[O.gk]; const gkE=gk?eff(gk,'GK'):30;
  const prob=clamp(0.74+(p.sk.sho-gkE)/300+TRAIT.pen*(p.tr.score||0)-TRAIT.pen*((gk&&gk.tr&&gk.tr.stop)||0),0.45,0.95);
  let goal=r()<prob; let res=goal?'goal':(r()<0.6?'save':'miss');
  if(M.forced && M.forced.so!=null){
    const w=M.forced.so; const test=(g)=>{ const sc=[...so.sc], n=[...so.n]; n[s]++; if(g) sc[s]++; return soOver({sc,n}) ? (sc[0]>sc[1]?0:1) : null; };
    const roundsDone=Math.min(so.n[0],so.n[1]);
    if(s!==w && goal && test(true)===s){ goal=false; res='save'; }
    if(s===w && !goal && test(false)===1-s){ goal=true; res='goal'; }
    if(roundsDone>12){ goal = s===w; res=goal?'goal':'save'; }
  }
  so.n[s]++; if(goal) so.sc[s]++;
  const ev={m:M.min,t:'kick',s,pid,res,soSc:[...so.sc],gk:O.gk};
  so.kicks.push({s,pid,res});
  so.turn=1-s;
  const out=[ev];
  if(soOver(so)){ so.done=true; M.phase='ft'; out.push({m:M.min,t:'ft'}); }
  M.rs=r.get(); if(!M.fast) M.ev.push(...out);
  return out;
}
function runToEnd(C,M,stopAtHT){ let guard=0; while(M.phase!=='ft' && guard++<400){ if(M.phase==='ht'){ if(stopAtHT) return; resumeSecondHalf(M,'none'); } stepMatch(C,M); } }
function matchWinnerIdx(M){ if(M.sc[0]!==M.sc[1]) return M.sc[0]>M.sc[1]?0:1; if(M.so&&M.so.done) return M.so.sc[0]>M.so.sc[1]?0:1; return -1; }

/* ---------- manager-mode direction (forced outcomes go through the same engine) ---------- */
function buildForced(C,M,f,d){
  let hg, ag, so=null;
  const r=rngFrom(hashStr('dir'+C.seed+f.id));
  if(d.mode==='winner'){
    const wi = d.winner===f.h?0:1;
    let found=null;
    for(let i=0;i<80&&!found;i++){ const T=startMatch(C,f.id,{fast:true,seedSalt:'d'+i}); runToEnd(C,T); if(T.sc[wi]>T.sc[1-wi]) found=[...T.sc]; }
    if(!found){ const w=rint(r,1,3), l=rint(r,0,w-1); found = wi===0?[w,l]:[l,w]; }
    [hg,ag]=found;
  } else { hg=clamp(d.hg|0,0,15); ag=clamp(d.ag|0,0,15); if(f.comp==='reg'){ if(f.h===C.userSid) hg=Math.min(hg,USER_REG_CAP); if(f.a===C.userSid) ag=Math.min(ag,USER_REG_CAP); } if(hg===ag && isKO(f.comp)) so = d.soWinner===f.a?1:0; }
  const goals={}; const mins=[]; const total=hg+ag;
  const pool=[]; for(let i=2;i<=79;i++) pool.push(i); shuffle(r,pool);
  for(let i=0;i<total;i++) mins.push(pool[i]);
  const sides=[]; for(let i=0;i<hg;i++) sides.push(0); for(let i=0;i<ag;i++) sides.push(1); shuffle(r,sides);
  mins.forEach((mm,i)=>goals[mm]=sides[i]);
  return {goals, so, target:[hg,ag]};
}

/* ---------- odds: same engine, many fast seeded runs ---------- */
function simProbs(C, fid, n=400){
  const f=C.fixtures[fid]; let h=0,d=0,a=0,advH=0,gh=0,ga=0;
  for(let i=0;i<n;i++){
    const M=startMatch(C,fid,{fast:true,seedSalt:'odds'+i});
    let guard=0; while(M.phase!=='ft'&&guard++<300){ if(M.phase==='ht') resumeSecondHalf(M,'none'); stepMatch(C,M); if(!M.ko && M.min>=80) break; if(M.ko && M.min===80 && M.sc[0]!==M.sc[1]) break; }
    // regulation result = score after 80 (extra time does not count for 3-way)
    const reg = M.ev; void reg;
    gh+=M.sc[0]; ga+=M.sc[1];
    if(!M.ko){ if(M.sc[0]>M.sc[1]) h++; else if(M.sc[0]<M.sc[1]) a++; else d++; }
    else { const w=matchWinnerIdx(M); if(w===0) advH++; }
  }
  // light smoothing so no outcome is ever priced as impossible
  if(!isKO(f.comp)) return {kind:'3way', h:(h+0.5)/(n+1.5), d:(d+0.5)/(n+1.5), a:(a+0.5)/(n+1.5), xgH:gh/n, xgA:ga/n, n};
  const ph=(advH+0.5)/(n+1); return {kind:'adv', h:ph, a:1-ph, xgH:gh/n, xgA:ga/n, n};
}
/* Sportsbook-style pricing: a vig (overround) on fair probabilities, then the usual American-odds ladder. */
const ODDS_LADDER=(()=>{ const a=[100]; for(let v=105;v<=200;v+=5) a.push(v); for(const v of [210,220,225,230,240,250,260,270,275,280,290,300,320,325,333,350,375,400,425,450,475,500,550,600,650,700,750,800,900,1000,1100,1200,1400,1500,1600,1800,2000,2500,3000,3500,4000,5000,6000,7500,10000]) a.push(v); return a; })();
function ladder(v){ let best=ODDS_LADDER[0]; for(const x of ODDS_LADDER){ if(Math.abs(x-v)<Math.abs(best-v)) best=x; } return best; }
const ODDS_CAP=1000; // no price is ever posted beyond -1000 / +1000, however lopsided the projection
/* two-way moneyline: always one favourite (negative) and one underdog, like a real book; a draw is "no bet" (stake returned) */
function priceQ(q){ if(Math.abs(q-0.5)<0.006) return 'EVEN'; return q>0.5? '-'+ladder(100*q/(1-q)) : '+'+ladder(100*(1-q)/q); }
function moneyline2(pa,pb,margin=0.045){ const t=(pa+pb)||1; let a=pa/t, b=pb/t; const book=1+margin; let qa=a*book, qb=b*book;
  const cap=ODDS_CAP/(ODDS_CAP+100); if(qa>cap){ qa=cap; qb=book-cap; } if(qb>cap){ qb=cap; qa=book-cap; }
  if(Math.abs(qa-qb)<0.01){ return ['-110','-110']; } return [priceQ(qa),priceQ(qb)]; }
function american(p, margin=0.055){ const q=clamp(p*(1+margin),0.009,0.99); if(Math.abs(q-0.5)<0.0125) return 'EVEN'; if(q>0.5){ return '-'+ladder(Math.min(ODDS_CAP,100*q/(1-q))); } return '+'+ladder(Math.min(ODDS_CAP,100*(1-q)/q)); }

/* ---------- finalize: one pipeline for live, simulated and directed matches ---------- */
function addStat(p, year, lvl, bucket, row, extra){
  p.st[year]=p.st[year]||{}; const y=p.st[year]; y[lvl]=y[lvl]||{pre:null,reg:null,post:null,sid:p.sid};
  const b=y[lvl][bucket] || (y[lvl][bucket]={gp:0,gs:0,g:0,a:0,sh:0,sot:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,ga:0,cs:0,rt:0});
  b.gp++; b.gs++; for(const k of ['g','a','sh','sot','sv','tk','int','cl','y','r','ga']) b[k]+=row[k]; b.rt+=row.rt; if(extra&&extra.cs) b.cs++;
}
function rateRows(C, M){
  const rc=rngFrom(hashStr('rt'+M.rc));
  const w=matchWinnerIdx(M);
  M.sides.forEach((S,i)=>{
    const conc=M.sc[1-i];
    for(const s of S.slots){ const row=M.pl[s.pid]; if(!row) continue; const g=ROLE_GROUP[s.role];
      let rt=6.1+row.g*1.0+row.a*0.6+row.sot*0.12+(row.tk+row.int)*0.08+row.cl*0.04-row.y*0.4-row.r*1.6;
      if(g==='GK') rt+=row.sv*0.28-conc*0.35+(conc===0?0.6:0);
      if(g==='DEF') rt+=(conc===0?0.5:-0.12*conc);
      rt+= w===i?0.35: w===-1?0.05:-0.25; rt+=(rc()-0.5)*0.6;
      row.rt=r1(clamp(rt,3.5,10));
    }
  });
}
function finishMatch(C, M){
  const f=C.fixtures[M.fid]; if(f.st==='d') return f; if(M.phase!=='ft') runToEnd(C,M);
  rateRows(C,M);
  const w=matchWinnerIdx(M);
  f.st='d'; f.hg=M.sc[0]; f.ag=M.sc[1]; f.et=M.min>80; f.pk=M.so?[...M.so.sc]:null; f.w = w===-1?null:(w===0?f.h:f.a); f.dir=!!M.forced; f.att=M.att;
  const detail = f.lvl==='V' || M.user>=0;
  const log={fid:f.id, yr:f.yr, box:[[],[]], st:M.st, lu:M.sides.map(S=>({form:S.form,slots:S.slots.map(s=>({role:s.role,x:s.x,y:s.y,pid:s.pid})),caps:(getLu(C,S.sid,f.lvl)||{}).caps||[],strat:S.user?S.strat:null,speech:S.user?S.speech:null})), ht:M.ht?M.ht.st:null, htSc:M.ht?M.ht.sc:null};
  if(detail){ log.ev=M.ev.filter(e=>e.t!=='miss'||e.xg>=0.2); log.shots=M.shots; log.heat=M.heat; log.so=M.so?M.so.kicks:null; }
  else log.ev=M.ev.filter(e=>e.t==='goal'||e.t==='red'||e.t==='yellow');
  M.sides.forEach((S,i)=>{
    const cs = M.sc[1-i]===0;
    for(const s of S.slots){ const row=M.pl[s.pid]; if(!row) continue; log.box[i].push(row); const p=C.players[s.pid]; if(!p) continue;
      addStat(p, f.yr, f.lvl, bucketOf(f.comp), row, {cs: cs && s.pid===S.gk});
      if(f.lvl==='V' && f.comp!=='pre') recordGame(C,p,row,f,i);
    }
  });
  C.logs[f.id]=log; (C._dirty||(C._dirty=new Set())).add(f.id);
  // suspensions: served for those who sat out, new for red cards
  if(C.settings.suspensions){
    for(const S of M.sides){ for(const p of squad(C,S.sid,f.lvl)){ if(p.susp>0 && !M.pl[p.id]) p.susp--; } for(const pid in S.off) if(C.players[pid]) C.players[pid].susp=1; }
  }
  // coach records (Varsity, non-preseason)
  if(f.lvl==='V'){ [f.h,f.a].forEach((sid,i)=>{ const sch=C.schools[sid]; const co=C.coaches[sch.coachId]; if(!co) return; const y=co.rec[f.yr]||(co.rec[f.yr]={w:0,d:0,l:0}); if(f.comp==='pre') return; if(w===-1) y.d++; else if(w===i) y.w++; else y.l++; }); }
  matchNews(C,f,M,log);
  if(f.lvl==='V'){ celebAfterMatch(C,f,M,log); seniorNightNews(C,f); }
  return f;
}
function recordGame(C,p,row,f,i){
  const opp=i===0?f.a:f.h;
  for(const k of ['g','a','sv','tk','cl','int','y','r']){
    const v=row[k]; if(!v) continue;
    const e={v,pid:p.id,sid:p.sid,yr:f.yr,fid:f.id,comp:f.comp,opp};
    const L=C.rec.game[k]||(C.rec.game[k]=[]); insertTop(L,e,10);
    const S=(C.rec.gameSchool[p.sid]||(C.rec.gameSchool[p.sid]={})); const Ls=S[k]||(S[k]=[]); insertTop(Ls,e,5);
  }
}
function insertTop(L,e,n){ if(L.length>=n && e.v<=L[L.length-1].v) return; L.push(e); L.sort((a,b)=>b.v-a.v||a.yr-b.yr||(a.fid<b.fid?-1:1)); if(L.length>n) L.length=n; }

/* ---------- news ---------- */
function addNews(C,type,text,sid,extra){ C.news.unshift({id:nid(C,'n'),yr:C.year,ph:C.phase,md:C.md,type,text,sid:sid||null,...(extra||{})}); if(C.news.length>320) C.news.length=320; }
/* ---------- rivalry trophy & series (heated rival, Varsity, league + postseason) ---------- */
const RIVAL_TROPHIES=['The Iron Boot','The Golden Boot','The Silver Cleat','The Old Boot','The Bronze Boot','The Iron Cleat','The Copper Boot','The Steel Cleat'];
function ensureRivalry(C){ if(!C.rivalry||C.rivalry.opp!==C.rivals.heated){ const prev=C.rivalry; C.rivalry={opp:C.rivals.heated, name:prev&&prev.opp===C.rivals.heated?prev.name:RIVAL_TROPHIES[hashStr(C.seed+'riv'+C.rivals.heated)%RIVAL_TROPHIES.length], holder:null, games:[]}; } return C.rivalry; }
function rivalrySeries(C){ const R=ensureRivalry(C); const t={w:0,d:0,l:0}; for(const g of R.games) t[g.res==='W'?'w':g.res==='L'?'l':'d']++; return {...t, last:R.games.slice(-5), name:R.name, holder:R.holder, opp:R.opp}; }
function matchNews(C,f,M,log){
  if(f.lvl!=='V'||f.comp==='pre') { if(f.lvl!=='V') return; }
  const nm=sid=>C.schools[sid].town;
  for(let i=0;i<2;i++) for(const row of log.box[i]){ if(row.g>=3){ const p=C.players[row.pid]; addNews(C,'performance',`${pname(p)} scores ${row.g===3?'a hat trick':row.g+' goals'} as ${nm(i===0?f.h:f.a)} face ${nm(i===0?f.a:f.h)}`, p.sid,{pid:p.id,fid:f.id}); } }
  const u=C.userSid; if(f.h!==u&&f.a!==u) return;
  const riv=isRivalry(C,f.h,f.a);
  if(riv==='heated' && f.comp!=='pre' && f.lvl==='V'){ const R=ensureRivalry(C); if(!R.games.some(g=>g.fid===f.id)){ const us=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; R.games.push({yr:f.yr,fid:f.id,res:f.w===u?'W':f.w?'L':'D',sc:`${us}-${th}`}); if(f.w){ const had=R.holder; R.holder=f.w; if(f.w===u&&had!==u){ f.rivWin=true; addNews(C,'rivalry',`${nm(u)} win ${R.name}! The trophy comes home.`,u,{fid:f.id}); } } } }
  if(riv && f.comp!=='pre'){ const won=f.w===u; addNews(C,'rivalry', won?`${nm(u)} take the ${riv==='heated'?'rivalry':'seasonal rivalry'} game, ${Math.max(f.hg,f.ag)}-${Math.min(f.hg,f.ag)}, over ${nm(f.h===u?f.a:f.h)}`:f.w?`${nm(f.w)} win the rivalry game against ${nm(u)}`:`${nm(f.h)} and ${nm(f.a)} draw the rivalry game ${f.hg}-${f.ag}`, u,{fid:f.id}); }
}

/* ---------- standings, leaders, rankings ---------- */
function standings(C, lvl, yr){
  yr=yr||C.year; const T={};
  for(const sid of C.league) T[sid]={sid,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,form:[],streak:0};
  const list=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.comp==='reg'&&f.lvl===lvl&&f.st==='d').sort((a,b)=>a.rd-b.rd);
  for(const f of list){ const H=T[f.h], A=T[f.a]; if(!H||!A) continue; H.p++;A.p++; H.gf+=f.hg;H.ga+=f.ag;A.gf+=f.ag;A.ga+=f.hg;
    if(f.hg>f.ag){H.w++;A.l++;H.pts+=3;H.form.push('W');A.form.push('L');} else if(f.hg<f.ag){A.w++;H.l++;A.pts+=3;A.form.push('W');H.form.push('L');} else {H.d++;A.d++;H.pts++;A.pts++;H.form.push('D');A.form.push('D');} }
  const rows=Object.values(T); for(const t of rows){ let s=0; for(let i=t.form.length-1;i>=0&&t.form[i]==='W';i--) s++; t.streak=s; t.gd=t.gf-t.ga; t.form=t.form.slice(-5); }
  rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||C.schools[a.sid].name.localeCompare(C.schools[b.sid].name));
  return rows;
}
function seasonBucket(p,yr,lvl,bk){ const y=p.st[yr]; if(!y||!y[lvl]) return null; return y[lvl][bk]; }
function leaders(C, stat, yr, lvl='V', n=10){
  yr=yr||C.year; const out=[];
  for(const id in C.players){ const p=C.players[id]; if(!C.league.includes(p.sid)) continue; const b=seasonBucket(p,yr,lvl,'reg'); if(!b) continue;
    const v = stat==='rt'? (b.gp>=3? b.rt/b.gp : null) : stat==='def'? b.tk+b.int+b.cl : stat==='cards'? b.y+b.r*2 : b[stat];
    if(v==null||(!v&&stat!=='rt')) continue; out.push({p,v,b}); }
  out.sort((a,b)=>b.v-a.v||(a.p.id<b.p.id?-1:1)); return out.slice(0,n);
}
function teamRankings(C){
  return C.league.map(sid=>{
    const lu=getLu(C,sid,'V'); let A=0,Mi=0,D=0,n=[0,0,0],tot=0;
    for(const s of lu.slots){ const p=C.players[s.pid]; if(!p) continue; const e=eff(p,s.role); tot+=e; const g=ROLE_GROUP[s.role]; if(g==='FWD'){A+=e;n[0]++;} else if(g==='MID'){Mi+=e;n[1]++;} else {D+=e;n[2]++;} }
    let rt=0,rn=0; for(const p of squad(C,sid,'V')){ const b=seasonBucket(p,C.year,'V','reg'); if(b&&b.gp){rt+=b.rt;rn+=b.gp;} }
    return {sid, ovr:tot/11, off:n[0]?A/n[0]:0, mid:n[1]?Mi/n[1]:0, def:n[2]?D/n[2]:0, rt: rn? rt/rn : null};
  });
}

/* ---------- competition flow ---------- */
function roundRobin(ids){
  const n=ids.length, arr=ids.slice(), rounds=[];
  for(let r=0;r<n-1;r++){ const pairs=[]; for(let i=0;i<n/2;i++){ const a=arr[i], b=arr[n-1-i]; pairs.push((r+i)%2?[b,a]:[a,b]); } rounds.push(pairs); arr.splice(1,0,arr.pop()); }
  return rounds.concat(rounds.map(rd=>rd.map(([a,b])=>[b,a])));
}
function addFixture(C,o){ const f={id:o.id, yr:C.year, comp:o.comp, rd:o.rd, lvl:o.lvl||'V', h:o.h, a:o.a, st:'s', hg:null, ag:null, pk:null, et:false, w:null, dir:false, ven:o.ven||effStadium(C.schools[o.h]).name, seed:o.seed||null}; C.fixtures[f.id]=f; return f; }
function buildSchedule(C){
  const rr=roundRobin(C.league);
  rr.forEach((pairs,rd)=>{ for(const lvl of LVLS) pairs.forEach(([h,a],i)=>addFixture(C,{id:`${C.year}-R${rd+1}-${lvl}-${i+1}`,comp:'reg',rd,lvl,h,a})); });
}
function genExt(C, target, tag, nameHint){
  const r=genR(C);
  const sch=genSchool(C,r,{strength:clamp((target-66)/14,0.2,1), ext:tag, tier: target>=84?4:3});
  genSquad(C,r,sch,'V',false,target-4);
  setLineup(C,sch.id,'V',autoLineup(C,sch.id,'V',C.coaches[sch.coachId].form));
  if(nameHint) sch.section=nameHint;
  return sch;
}
/* Regional and State opponents never rate above POST_CAP (Starting XI rating); never applied to the user's school */
const POST_CAP=85;
function capTeam(C,sid,cap){ if(sid===C.userSid) return; for(let k=0;k<12;k++){ const r=xiRating(C,sid,'V'); if(r<=cap) break; const d=r-cap+0.15; squad(C,sid,'V').forEach(p=>shiftOvr(p,-d,'balanced')); } }
function capPostTeams(C){ for(const id in C.schools){ const s=C.schools[id]; if(s.ext==='post'&&id!==C.userSid) capTeam(C,id,POST_CAP); } }
function diffOffset(C){ return {easy:-4,normal:0,hard:2}[C.settings.difficulty]||0; }
function seasonStart(C){
  // plans for development, breakouts, season start ratings
  const r=genR(C);
  for(const id in C.players){ const p=C.players[id]; planDev(C,p,r); p.ovr0[C.year]=r1(ovr(p)); }
  for(const sid of C.league){ const user=sid===C.userSid; for(const lvl of ['JV','MOD']){ const n=user?2:1; const cands=squad(C,sid,lvl).filter(p=>p.pot-ovr(p)>=12); shuffle(r,cands); cands.sort((a,b)=>(b.pot-ovr(b))-(a.pot-ovr(a))); const top=cands.slice(0,Math.max(n*3,n)); shuffle(r,top); top.slice(0,n).forEach(p=>{ p.plan.breakout=true; p.plan.gain+=(13+r()*7)*DEV_RATE; p.pot=Math.min(99,Math.round(p.pot+5+r()*5)); shiftOvr(p,(2.5+r()*2)*DEV_RATE,'balanced'); p.bo=(p.bo||0)+1; /* breakouts: an instant jump, a higher ceiling and faster growth */ }); } }
  buildSchedule(C);
  // preseason cup opponents (Varsity only)
  C.pre={rd:0,fx:[],skipped:false};
  for(let i=0;i<3;i++){ const o=genExt(C, 68+i*3+Math.round(r()*4), 'pre'); const id=`${C.year}-P${i+1}`; addFixture(C,{id,comp:'pre',rd:i,lvl:'V',h:i%2?o.id:C.userSid,a:i%2?C.userSid:o.id}); C.pre.fx.push(id); }
  C.phase='preseason'; C.md=0; C.post=null;
}
/* rating growth rate for every player (1 = the original pace); applies to development plans, breakouts, preseason minutes and scrimmages */
const DEV_RATE = 0.5;
function planDev(C,p,r){
  const base={steady:4,rapid:7,streaky:1+r()*9}[p.dev]||4;
  const ageF = p.grade<=9?1.25:p.grade<=11?1:0.7;
  const coach=C.coaches[C.schools[p.sid]?.coachId]; const coachF = coach? 0.8+coach.ab/250 : 1;
  const cpuF = p.sid===C.userSid?1:({easy:0.9,normal:1,hard:1.1}[C.settings.difficulty]||1);
  let gain=base*ageF*coachF*cpuF*(0.85+r()*0.3);
  const stall = r()<0.11; if(stall) gain*=0.25;
  if(p.mat==='late' && p.grade>=10 && p.grade<=11) gain*=1.2;
  p.plan={gain:gain*DEV_RATE, stall, breakout:false};
}
function devTick(C, frac, starters){
  const focus=C.training;
  for(const id in C.players){ const p=C.players[id]; if(!p.plan) continue; const sch=C.schools[p.sid]; if(!sch||sch.ext) continue;
    const user=p.sid===C.userSid;
    let f = user? (focus==='youth'?(p.lvl==='V'?0.85:1.3):1) : 1;
    if(user){ const vlu=getLu(C,p.sid,p.lvl); if(vlu&&vlu.strat==='youth'&&p.grade<=10&&starters&&starters.has(p.id)) f*=STRATS.youth.m.dev; }
    if(starters&&starters.has(p.id)) f*=1.1;
    const cur=ovr(p); const gap=p.pot-cur; if(gap<=0) continue;
    let amt=p.plan.gain*frac*f*clamp(gap/12,0.15,1);
    amt=Math.min(amt,gap);
    shiftOvr(p, amt, user? (focus==='youth'?'balanced':focus) : sch.devFocus);
  }
}
function roundFixtures(C){
  if(C.phase==='preseason') return C.pre.rd<3? [C.fixtures[C.pre.fx[C.pre.rd]]] : [];
  if(C.phase==='regular') return Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.comp==='reg'&&f.rd===C.md);
  if(C.post && (C.phase==='sectionals'||C.phase==='regional'||C.phase==='states')){ const ids=C.post.cur||[]; return ids.map(id=>C.fixtures[id]); }
  return [];
}
function userFixture(C){ return roundFixtures(C).find(f=>f && f.st==='s' && f.lvl==='V' && (f.h===C.userSid||f.a===C.userSid)) || null; }
function simRound(C, exceptFid){
  for(const f of roundFixtures(C)){ if(!f||f.st==='d'||f.id===exceptFid) continue; const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); }
}
function roundDone(C){ const fx=roundFixtures(C); return fx.length>0 && fx.every(f=>f.st==='d'); }
function advance(C){
  // called after every fixture of the current round is complete; idempotent per round
  if(!roundDone(C)) return null;
  const ev={};
  if(C.phase==='preseason'){
    const f=C.fixtures[C.pre.fx[C.pre.rd]];
    for(const row of (C.logs[f.id]?C.logs[f.id].box.flat():[])){ const p=C.players[row.pid]; if(p&&p.sid===C.userSid&&p.pot>ovr(p)) shiftOvr(p,Math.min(0.35*DEV_RATE,p.pot-ovr(p)),'balanced'); }
    C.pre.rd++; if(C.pre.rd>=3){ C.phase='regular'; C.md=0; ev.phase='regular'; addNews(C,'program',`${C.schools[C.userSid].town} wrap up the Preseason Cup`,C.userSid); }
    return ev;
  }
  if(C.phase==='regular'){
    const starters=new Set(); for(const f of roundFixtures(C)){ const lg=C.logs[f.id]; if(lg) lg.box.flat().forEach(r=>starters.add(r.pid)); }
    devTick(C,0.034,starters);
    C.md++;
    if(C.md===7) cpuPromotions(C,'midseason');
    if(C.md>=14){ cpuPromotions(C,'pre-sectionals'); startSectionals(C); ev.phase='sectionals'; }
    return ev;
  }
  if(C.phase==='sectionals'){
    const P=C.post; const winners=P.cur.map(id=>C.fixtures[id].w);
    if(P.secRd<2){ P.secRd++; const ids=[]; for(let i=0;i<winners.length;i+=2){ const a=winners[i], b=winners[i+1]; const hs = P.seed[a]<P.seed[b]?a:b; const as = hs===a?b:a; ids.push(addFixture(C,{id:`${C.year}-SEC${P.secRd+1}-${i/2+1}`,comp:'sec',rd:P.secRd,h:hs,a:as}).id); } P.sec.push(ids); P.cur=ids; return ev; }
    P.secChamp=winners[0]; honor(C,P.secChamp,'Section 5 Champions',P.cur[0]);
    addNews(C,'champion',`${C.schools[P.secChamp].name} win the Section ${C.section} title`,P.secChamp);
    const s6=genExt(C, 79+Math.round(genR(C)()*5)+diffOffset(C), 'post', 'Section 6'); capTeam(C,s6.id,POST_CAP); P.s6=s6.id;
    const id=addFixture(C,{id:`${C.year}-RGN`,comp:'rgn',rd:0,h:P.secChamp,a:s6.id,ven:`${C.stateName} Regional Field`}).id;
    P.cur=[id]; P.rgn=id; C.phase='regional'; ev.phase='regional'; return ev;
  }
  if(C.phase==='regional'){
    const P=C.post; P.rgnChamp=C.fixtures[P.rgn].w; honor(C,P.rgnChamp,'Regional Champions',P.rgn);
    const r=genR(C); const teams=[P.rgnChamp];
    for(let i=0;i<7;i++){ const t=genExt(C, 83+Math.round(r()*8)+diffOffset(C),'post','Section '+[1,2,3,4,7,8,9,10,11][i%9]); capTeam(C,t.id,POST_CAP); teams.push(t.id); }
    const order=[teams[0],...shuffle(r,teams.slice(1))];
    P.st=[[]]; P.stRd=0;
    for(let i=0;i<4;i++) P.st[0].push(addFixture(C,{id:`${C.year}-ST1-${i+1}`,comp:'st',rd:0,h:order[i*2],a:order[i*2+1],ven:`${C.stateName} State Championship Stadium`}).id);
    P.cur=P.st[0]; C.phase='states'; ev.phase='states'; return ev;
  }
  if(C.phase==='states'){
    const P=C.post; const winners=P.cur.map(id=>C.fixtures[id].w);
    if(P.stRd<2){ P.stRd++; const ids=[]; for(let i=0;i<winners.length;i+=2) ids.push(addFixture(C,{id:`${C.year}-ST${P.stRd+1}-${i/2+1}`,comp:'st',rd:P.stRd,h:winners[i],a:winners[i+1],ven:`${C.stateName} State Championship Stadium`}).id); P.st.push(ids); P.cur=ids; return ev; }
    const fin=C.fixtures[P.cur[0]]; P.stChamp=fin.w; P.stRunner = fin.w===fin.h?fin.a:fin.h;
    honor(C,P.stChamp,'State Champions',fin.id); honor(C,P.stRunner,'State Runners-up',fin.id);
    addNews(C,'champion',`${C.schools[P.stChamp].name} are ${C.year} ${C.stateName} state champions`,P.stChamp);
    C.tourneys[C.year]={sec:P.sec, rgn:P.rgn, st:P.st, secChamp:P.secChamp, rgnChamp:P.rgnChamp, stChamp:P.stChamp, stRunner:P.stRunner, seed:P.seed, s6:P.s6};
    C.phase='awards'; finalizeAwards(C, C.year); C.phase='offseason'; ev.phase='offseason'; ev.awards=true; return ev;
  }
  return null;
}
function startSectionals(C){
  const tab=standings(C,'V'); const seed={}; tab.forEach((t,i)=>seed[t.sid]=i+1);
  const s=i=>tab[i].sid; const pairs=[[s(0),s(7)],[s(3),s(4)],[s(2),s(5)],[s(1),s(6)]];
  const ids=pairs.map(([h,a],i)=>addFixture(C,{id:`${C.year}-SEC1-${i+1}`,comp:'sec',rd:0,h,a}).id);
  C.post={seed, sec:[ids], secRd:0, cur:ids};
  C.phase='sectionals';
  if(!seed[C.userSid]) {}
  addNews(C,'program',`Section ${C.section} bracket set: ${C.schools[s(0)].town} take the top seed`,s(0));
}
function honor(C,sid,label,fid){
  const sch=C.schools[sid]; if(!sch) return; if(sch.honors.some(h=>h.yr===C.year&&h.label===label)) return;
  sch.honors.push({yr:C.year,label});
  const lg=C.logs[fid]; const ids=new Set();
  // every player who appeared for this school in the postseason gets the team honor
  for(const id in C.players){ const p=C.players[id]; if(p.sid!==sid) continue; const b=seasonBucket(p,C.year,'V','post'); if(b&&b.gp) ids.add(id); }
  if(lg) lg.box.flat().forEach(r=>{ if(C.players[r.pid]&&C.players[r.pid].sid===sid) ids.add(r.pid); });
  ids.forEach(id=>{ const p=C.players[id]; if(!p.honors.some(h=>h.yr===C.year&&h.label===label)) p.honors.push({yr:C.year,label}); });
  if(label==='State Champions'){ const co=C.coaches[sch.coachId]; if(co) co.titles++; }
}

/* ---------- promotion, evaluation ---------- */
function eligible(p,lvl){ if(lvl==='V') return p.grade>=7; if(lvl==='JV') return p.grade<=10; return p.grade<=8; }
function newRecruit(C, r, sid, pos, user, grade){
  const sch=C.schools[sid]; const g=grade||7;
  const p=genPlayer(C,r,{sid,lvl:'MOD',grade:g,pos,target:levelTarget('MOD',g,sch.strength,user)+gauss(r)*5,user});
  const used=new Set([...retiredSet(C,sid),...squad(C,sid,'MOD').map(x=>x.num)]); p.num=assignNum(r,used,pos); C.players[p.id]=p; planDev(C,p,r); p.ovr0[C.year]=r1(ovr(p)); return p;
}
function retiredSet(C,sid){ return new Set(((C.retired||{})[sid]||[]).map(x=>x.num)); }
function freeNum(C,sid,lvl,p){ const used=new Set([...retiredSet(C,sid),...squad(C,sid,lvl).filter(x=>x.id!==p.id).map(x=>x.num)]); if(!used.has(p.num)) return p.num; return assignNum(rngFrom(hashStr(p.id+lvl)),used,p.pos); }
/* atomic promotion with cascade; returns {ok, msg, moved:[...]} */
function promote(C, pid, to){
  const p=C.players[pid]; if(!p) return {ok:false,msg:'Player not found.'};
  const from=p.lvl; if(from===to) return {ok:false,msg:'Already in that squad.'};
  if(!eligible(p,to)) return {ok:false,msg:`${pname(p)} (grade ${p.grade}) is not eligible for ${LVL_NAME[to]}.`};
  const order={V:0,JV:1,MOD:2}; const up = order[to]<order[from];
  if(!up){ // moving down: no cascade, keep at least 2 GKs in source
    if(p.pos==='GK' && squad(C,p.sid,from).filter(x=>x.pos==='GK').length<=2) return {ok:false,msg:'Keep at least two goalkeepers in each squad.'};
    p.lvl=to; p.num=freeNum(C,p.sid,to,p); repairLineup(C,p.sid,from); return {ok:true,msg:`${pname(p)} moved to ${LVL_NAME[to]}.`,moved:[p.id]};
  }
  const r=genR(C); const user=p.sid===C.userSid; const moved=[p.id];
  if(from==='MOD'){
    if(p.pos==='GK' && squad(C,p.sid,'MOD').filter(x=>x.pos==='GK').length<=2){ /* replacement keeps coverage */ }
    p.lvl=to; p.num=freeNum(C,p.sid,to,p);
    const rec=newRecruit(C,r,p.sid,p.pos,user,7); moved.push(rec.id);
  } else if(from==='JV'){
    p.lvl=to; p.num=freeNum(C,p.sid,to,p);
    const mods=squad(C,p.sid,'MOD').filter(x=>x.pos===p.pos&&eligible(x,'JV')).sort((a,b)=>(b.grade-a.grade)||(ovr(b)-ovr(a))||(a.id<b.id?-1:1));
    const up2=mods[0] || squad(C,p.sid,'MOD').sort((a,b)=>ovr(b)-ovr(a))[0];
    if(up2){ up2.lvl='JV'; up2.num=freeNum(C,p.sid,'JV',up2); moved.push(up2.id); const rec=newRecruit(C,r,p.sid,up2.pos,user,7); moved.push(rec.id); }
  }
  for(const l of LVLS) repairLineup(C,p.sid,l);
  return {ok:true,msg:`${pname(p)} promoted to ${LVL_NAME[to]}.`,moved};
}
function evaluate(C,p){
  const sid=p.sid; const lu=getLu(C,sid,'V'); const g=p.pos;
  const vs=(lu?lu.slots:[]).filter(s=>ROLE_GROUP[s.role]===g).map(s=>C.players[s.pid]).filter(Boolean);
  const bar = vs.length? vs.reduce((a,x)=>a+ovr(x),0)/vs.length : 70;
  const o=ovr(p); const gap=o-bar; const potL=p.pot-o; const hRem=p.ah-p.h;
  let score = gap*1.0 + Math.min(potL,30)*0.25 + (p.plan&&p.plan.breakout?4:0) + (g!=='MID'&&hRem<1.5?1:0);
  const grades=[[8,'A+'],[5,'A'],[2,'A-'],[0,'B+'],[-3,'B'],[-6,'B-'],[-9,'C+'],[-12,'C'],[-16,'C-'],[-99,'D']];
  const letter=grades.find(([t])=>score>=t)[1];
  const lines=[];
  lines.push(`Current ${Math.round(o)} vs your Varsity ${g} starters averaging ${Math.round(bar)} (${gap>=0?'+':''}${Math.round(gap)}).`);
  lines.push(potL>=15?`High ceiling: projected up to ${p.pot}.`:potL>=6?`Room to grow toward ${p.pot}.`:`Close to his ceiling of ${p.pot}.`);
  if(hRem>=2) lines.push(`Still growing: ${ftIn(p.h)} now, projected ${ftIn(p.ah)}.`);
  if(p.plan&&p.plan.breakout) lines.push('Flagged as a breakout candidate this season.');
  if(p.plan&&p.plan.stall) lines.push('Development has stalled this season.');
  let rec;
  if(p.lvl==='V') rec = gap>=-4? 'Belongs on Varsity.' : 'Squad depth on Varsity; may see limited minutes.';
  else if(score>=2) rec = 'Ready for Varsity now.';
  else if(score>=-4) rec = p.lvl==='MOD'? 'Could handle JV; Varsity would be a stretch.' : 'Close. Another few weeks of development.';
  else rec = `Belongs at ${LVL_NAME[p.lvl]} for now.`;
  return {letter, lines, rec, score};
}
function cpuPromotions(C, when){
  for(const sid of C.league){ if(sid===C.userSid) continue; const co=C.coaches[C.schools[sid].coachId];
    const lu=getLu(C,sid,'V'); for(const g of ['DEF','MID','FWD']){
      const starters=lu.slots.filter(s=>ROLE_GROUP[s.role]===g).map(s=>C.players[s.pid]).filter(Boolean); if(!starters.length) continue;
      const worst=Math.min(...starters.map(ovr));
      const margin = 3 - (co?co.youth:0)*2;
      const cand=[...squad(C,sid,'JV'),...squad(C,sid,'MOD')].filter(p=>p.pos===g&&ovr(p)>worst+margin).sort((a,b)=>ovr(b)-ovr(a))[0];
      if(cand){ const res=promote(C,cand.id,'V'); if(res.ok){ addNews(C,'promotion',`${C.schools[sid].town} call up ${pname(cand)} to Varsity (${when})`,sid,{pid:cand.id}); setLineup(C,sid,'V',autoLineup(C,sid,'V',co.form)); } }
    }
  }
}

/* ---------- awards (deterministic, one award per player, All-League counts) ---------- */
const AWARD_ORDER = ['mvp','scorer','playmaker','dpoy','gk','tmvp','breakout','freshman'];
const AWARD_NAME = {mvp:'League MVP',scorer:'Goal Scorer of the Year',playmaker:'Playmaker of the Year',dpoy:'Defensive Player of the Year',gk:'Goalkeeper of the Year',tmvp:'Tournament MVP',breakout:'Breakout Player',freshman:'Freshman Award',coy:'Coach of the Year',al1:'All-League First Team',al2:'All-League Second Team'};
function allPlayersAt(C){ return Object.values(C.players); }
function finalizeAwards(C, yr){
  if(C.awards[yr] && C.awards[yr].done) return C.awards[yr];
  const used=new Set(); const A={yr,done:true,list:{},al1:[],al2:[],coy:null};
  const pool=allPlayersAt(C).filter(p=>C.league.includes(p.sid));
  const V=p=>seasonBucket(p,yr,'V','reg');
  const avg=b=>b&&b.gp? b.rt/b.gp:0;
  const teamPts={}; standings(C,'V',yr).forEach(t=>teamPts[t.sid]=t.pts);
  const elig=pool.filter(p=>{ const b=V(p); return b&&b.gp>=5; });
  const tie=(a,b)=>a.id<b.id?-1:1;
  const choose=(key,list,score)=>{ const c=list.filter(p=>!used.has(p.id)).map(p=>({p,s:score(p)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||tie(a.p,b.p))[0]; if(c){ used.add(c.p.id); A.list[key]={pid:c.p.id,sid:c.p.sid,v:r1(c.s)}; c.p.awards.push({yr,k:key}); } };
  choose('mvp',elig,p=>{const b=V(p); return b.g*3+b.a*2+avg(b)*6+(teamPts[p.sid]||0)*0.15+ovr(p)*0.05;});
  choose('scorer',elig,p=>{const b=V(p); return b.g+b.a*0.01+avg(b)*0.001;});
  choose('playmaker',elig,p=>{const b=V(p); return b.a+b.g*0.01+avg(b)*0.001;});
  choose('dpoy',elig.filter(p=>p.pos==='DEF'),p=>{const b=V(p); return b.tk+b.int+b.cl*0.7+avg(b)*4;});
  choose('gk',elig.filter(p=>p.pos==='GK'),p=>{const b=V(p); return b.sv+b.cs*3+avg(b)*5;});
  const postPool=allPlayersAt(C).filter(p=>{ const b=seasonBucket(p,yr,'V','post'); return b&&b.gp>=1; });
  choose('tmvp',postPool,p=>{const b=seasonBucket(p,yr,'V','post'); return b.g*3+b.a*2+b.sv*0.4+(b.tk+b.int)*0.15+b.rt/b.gp*2+b.gp;});
  choose('breakout',pool,p=>{ const s=p.ovr0[yr]; return s!=null? ovr(p)-s : 0; });
  choose('freshman',pool.filter(p=>p.grade===9),p=>{ let b=seasonBucket(p,yr,'V','reg')||seasonBucket(p,yr,'JV','reg'); if(!b||!b.gp) return 0; return b.g*2+b.a*1.5+avg(b)*3+ovr(p)*0.1; });
  const need={GK:1,DEF:4,MID:4,FWD:2};
  for(const team of ['al1','al2']){ for(const g of GROUPS){ const c=elig.filter(p=>p.pos===g&&!used.has(p.id)).map(p=>{const b=V(p); return {p,s:avg(b)*10+b.g*1.5+b.a+(g==='GK'?b.sv*0.3+b.cs:0)+(g==='DEF'?(b.tk+b.int)*0.15:0)};}).sort((a,b)=>b.s-a.s||tie(a.p,b.p)).slice(0,need[g]); for(const x of c){ used.add(x.p.id); A[team].push(x.p.id); x.p.awards.push({yr,k:team}); } } }
  // coach of the year: points over expectation + titles
  const exp={}; C.league.map(sid=>({sid,r:xiRating(C,sid,'V')})).sort((a,b)=>b.r-a.r).forEach((x,i)=>exp[x.sid]=42-i*5);
  let best=null; for(const sid of C.league){ const co=C.coaches[C.schools[sid].coachId]; const v=(teamPts[sid]||0)-exp[sid]+(C.post&&C.post.secChamp===sid?6:0)+(C.post&&C.post.stChamp===sid?10:0); if(!best||v>best.v||(v===best.v&&co.id<best.id)) best={id:co.id,sid,v}; }
  if(best){ A.coy={cid:best.id,sid:best.sid}; }
  C.awards[yr]=A;
  const u=C.userSid; for(const k of AWARD_ORDER){ const a=A.list[k]; if(a&&a.sid===u) addNews(C,'award',`${pname(C.players[a.pid])} wins ${AWARD_NAME[k]}`,u,{pid:a.pid}); }
  if(A.coy) addNews(C,'award',`${C.coaches[A.coy.cid].name} (${C.schools[A.coy.sid].town}) named Coach of the Year`,A.coy.sid);
  return A;
}

/* ---------- season rollover ---------- */
function gradOutcome(r,p){
  const o=ovr(p), x=r()*10;
  if(o>=82) return x<7?'Signs with an NCAA Division I program':'Joins a Division II program on scholarship';
  if(o>=75) return x<5?'Commits to an NCAA Division II program':'Plays Division III college soccer';
  if(o>=68) return x<5?'Plays Division III college soccer':'Joins a junior college or club team';
  if(o>=60) return x<4?'Joins a local adult amateur club':'Plays intramural soccer in college';
  return 'Completes his competitive career';
}
function compactAlum(p,yr,outcome){ return {id:p.id,fn:p.fn,ln:p.ln,num:p.num,sid:p.sid,pos:p.pos,grade:p.grade,gradYr:yr,ovr:r1(ovr(p)),pot:p.pot,h:r1(p.h),st:p.st,honors:p.honors,awards:p.awards,outcome}; }
function archiveSeason(C){
  const yr=C.year; if(C.archives.some(a=>a.yr===yr)) return;
  const arc={yr, stand:{}, rosters:{}, coaches:{}, champs:C.tourneys[yr]||null};
  for(const lvl of LVLS) arc.stand[lvl]=standings(C,lvl,yr).map(t=>({sid:t.sid,p:t.p,w:t.w,d:t.d,l:t.l,gf:t.gf,ga:t.ga,pts:t.pts}));
  for(const sid of C.league){ arc.rosters[sid]={}; arc.coaches[sid]=C.schools[sid].coachId; for(const lvl of LVLS){ const lu=getLu(C,sid,lvl); const starters=new Set(lu.slots.map(s=>s.pid));
    arc.rosters[sid][lvl]={form:lu.form,caps:[...lu.caps],rows:squad(C,sid,lvl).map(p=>({pid:p.id,n:pname(p),num:p.num,pos:p.pos,gr:p.grade,ovr:Math.round(ovr(p)),pot:p.pot,xi:starters.has(p.id)})).sort((a,b)=>b.ovr-a.ovr)}; } }
  C.archives.push(arc);
}
/* ---------- Hall of Fame ---------- */
const HOF_AW={mvp:16,tmvp:10,scorer:9,playmaker:9,dpoy:9,gk:9,breakout:4,freshman:4};
function hofScore(p){ const t=careerTotals(p); let sc=t.g*1.0+t.a*0.75+t.sv*0.13+(t.tk+t.int)*0.06+t.gp*0.15; for(const a of p.awards||[]) sc+=HOF_AW[a.k]||0; for(const h of p.honors||[]) sc+=/State Champ/.test(h.label)?9:/Regional/.test(h.label)?4:/Section/.test(h.label)?2:0; return {sc,t}; }
function hofCandidate(C,p,yr){ const {sc,t}=hofScore(p); (C._hofQ||(C._hofQ=[])).push({pid:p.id,sid:p.sid,yr,num:p.num,name:`${p.fn} ${p.ln}`,pos:p.pos,sc:r1(sc),g:t.g,a:t.a,sv:t.sv,cs:t.cs,gp:t.gp,awards:(p.awards||[]).map(a=>a.k),titles:(p.honors||[]).map(h=>h.label)}); }
function hofInduct(C,yr){ const q=(C._hofQ||[]).sort((a,b)=>b.sc-a.sc); delete C._hofQ; C.hof=C.hof||[]; const inducted=q.filter(x=>x.sc>=30).slice(0,3);
  for(const x of inducted){ C.hof.push({...x,retired:false}); addNews(C,'program',`${x.name} is inducted into the ${C.schools[x.sid].town} Hall of Fame`,x.sid,{pid:x.pid}); }
  C.hofNew=inducted.map(x=>x.pid); return inducted; }
function retireNumber(C,pid){ const h=(C.hof||[]).find(x=>x.pid===pid); if(!h||h.retired) return false; const R=C.retired||(C.retired={}); const L=R[h.sid]||(R[h.sid]=[]); if(L.some(x=>x.num===h.num)) return false; L.push({num:h.num,pid,yr:C.year,name:h.name}); h.retired=true; for(const q of Object.values(C.players)) if(q.sid===h.sid&&q.num===h.num) q.num=freeNum(C,q.sid,q.lvl,q); addNews(C,'program',`${C.schools[h.sid].town} retire #${h.num} in honor of ${h.name}`,h.sid,{pid}); return true; }

/* ---------- v8: signature celebrations ---------- */
const CELEBS=[
  {id:'classic',  n:'Fist Pump',        d:'Leaps and punches the air.', how:'Every player has it'},
  {id:'airplane', n:'The Airplane',     d:'Arms out wide, banking away toward the crowd.', req:{k:'g',v:3},  how:'Score 3 career Varsity goals'},
  {id:'salute',   n:'The Salute',       d:'Stands to attention for the home stand.',        req:{k:'gp',v:20}, how:'Play 20 Varsity games'},
  {id:'heart',    n:'Heart Hands',      d:'Makes a heart for the fans.',                    req:{k:'a',v:8},   how:'Make 8 career Varsity assists'},
  {id:'robot',    n:'The Robot',        d:'Pops and locks like it is the school dance.',    req:{k:'sg',v:6},  how:'Score 6 Varsity goals in one season'},
  {id:'kneeslide',n:'The Knee Slide',   d:'Drops at full speed and slides on his knees.',   req:{k:'g',v:10},  how:'Score 10 career Varsity goals'},
  {id:'badge',    n:'Kiss the Badge',   d:'Grabs the crest and kisses it.',                 req:{k:'cap'},     how:'Be named a Varsity captain'},
  {id:'shush',    n:'Shush the Crowd',  d:'Finger to the lips. The away end goes quiet.',   req:{k:'feat',v:'riv'}, how:'Score against your heated rival'},
  {id:'flag',     n:'Corner-Flag Jig',  d:'Straight to the corner flag for a dance.',       req:{k:'feat',v:'post'},how:'Score in the postseason'},
  {id:'backflip', n:'The Backflip',     d:'One standing backflip. Sticks the landing.',     req:{k:'feat',v:'hat'}, how:'Score a Varsity hat trick'}];
const CELEB_BY=Object.fromEntries(CELEBS.map(c=>[c.id,c]));
function seasonGoalsMax(p){ let m=0; for(const yr in p.st){ const y=p.st[yr].V; if(!y) continue; let g=0; for(const bk of ['reg','post']) if(y[bk]) g+=y[bk].g; m=Math.max(m,g); } return m; }
/* how far a player is toward a celebration: {have, cur, need} */
function celebProgress(C,p,c){ const r=c.req; if(!r) return {have:true,cur:1,need:1}; const F=p.feats||{};
  if(r.k==='g'||r.k==='a'||r.k==='gp'){ const t=careerTotals(p,'V'); const cur=t[r.k]; return {have:cur>=r.v,cur:Math.min(cur,r.v),need:r.v}; }
  if(r.k==='sg'){ const cur=seasonGoalsMax(p); return {have:cur>=r.v,cur:Math.min(cur,r.v),need:r.v}; }
  if(r.k==='feat') return {have:!!F[r.v],cur:F[r.v]?1:0,need:1};
  if(r.k==='cap'){ const lu=C&&getLu(C,p.sid,'V'); const have=!!F.cap||!!(lu&&lu.caps&&lu.caps.includes(p.id)); return {have,cur:have?1:0,need:1}; }
  return {have:false,cur:0,need:1}; }
function celebHave(C,p,id){ const c=CELEB_BY[id]; return !!c && celebProgress(C,p,c).have; }
function celebUnlocked(C,p){ return CELEBS.filter(c=>celebProgress(C,p,c).have).map(c=>c.id); }
/* the celebration a player actually does: his chosen one if unlocked, otherwise (auto) one of his unlocked ones */
function celebFor(C,p){ if(!p) return 'classic'; if(p.cel&&p.cel!=='auto'&&celebHave(C,p,p.cel)) return p.cel;
  const un=celebUnlocked(C,p).filter(id=>id!=='classic'); if(!un.length) return 'classic';
  const last=p.celLast&&un.includes(p.celLast)? p.celLast : null; return last||un[hashStr(p.id)%un.length]; }
function setCeleb(C,pid,id){ const p=C.players[pid]; if(!p) return false; if(id==='auto'){ delete p.cel; return true; } if(!celebHave(C,p,id)) return false; p.cel=id; return true; }
/* after every game: record the one-off feats and announce new unlocks for your own players */
function celebAfterMatch(C,f,M,log){
  const u=C.userSid; const riv=isRivalry(C,f.h,f.a)==='heated';
  M.sides.forEach((S,i)=>{ const caps=(getLu(C,S.sid,f.lvl)||{}).caps||[];
    for(const s of S.slots){ const row=M.pl[s.pid]; const p=C.players[s.pid]; if(!row||!p||f.lvl!=='V') continue; const F=p.feats||(p.feats={});
      if(caps.includes(p.id)) F.cap=1;
      if(row.g>0&&f.comp!=='pre'){ if(['sec','rgn','st'].includes(f.comp)) F.post=1; if(row.g>=3) F.hat=1; if(riv) F.riv=1; }
      if(p.sid!==u) continue;
      const now=celebUnlocked(C,p); if(!p.celSeen) p.celSeen=['classic'];
      const fresh=now.filter(id=>!p.celSeen.includes(id)); if(!fresh.length) continue; p.celSeen=now; p.celLast=fresh[fresh.length-1];
      for(const id of fresh) addNews(C,'celebration',`${pname(p)} unlocks a signature celebration: ${CELEB_BY[id].n}`,u,{pid:p.id,cel:id,fid:f.id}); } }); }

/* ---------- v8: Senior Night (last regular-season home Varsity game) ---------- */
function seniorNightFixture(C,yr){ yr=yr||C.year; const L=Object.values(C.fixtures).filter(f=>f.yr===yr&&f.comp==='reg'&&f.lvl==='V'&&f.h===C.userSid).sort((a,b)=>a.rd-b.rd); return L.length?L[L.length-1]:null; }
function isSeniorNight(C,f){ if(!f||f.comp!=='reg'||f.lvl!=='V'||f.h!==C.userSid) return false; const sn=seniorNightFixture(C,f.yr); return !!sn&&sn.id===f.id; }
function seniorsOf(C){ return squad(C,C.userSid,'V').filter(p=>p.grade>=12).sort((a,b)=>(a.num||99)-(b.num||99)); }
function seniorCard(C,p){ const t=careerTotals(p,'V'); const all={gp:0,g:0,a:0,cs:0,sv:0}; for(const l of ['MOD','JV','V']){ const x=careerTotals(p,l); for(const k in all) all[k]+=x[k]||0; }
  const yrs=Object.keys(p.st||{}).map(Number); const first=yrs.length?Math.min(...yrs):C.year; const since=p.joined||Math.min(first,C.year-3); // a senior has been in the program at least since ninth grade
  return {pid:p.id,name:pname(p),num:p.num,pos:p.pos,v:t,all,since,seasons:C.year-since+1,honors:(p.honors||[]).length,awards:(p.awards||[]).length}; }
function seniorNightRecord(C,f){ const S=C.seniorNights||(C.seniorNights={}); if(S[f.yr]) return S[f.yr]; const list=seniorsOf(C).map(p=>seniorCard(C,p)); S[f.yr]={fid:f.id,yr:f.yr,ids:list.map(x=>x.pid),list}; return S[f.yr]; }
function seniorNightNews(C,f){ if(!isSeniorNight(C,f)) return; const rec=seniorNightRecord(C,f); const u=C.userSid; const n=rec.ids.length; if(rec.done) return; rec.done=true; const res=f.w===u?'win':f.w?'loss':'draw'; rec.res=res; rec.sc=`${f.hg}-${f.ag}`;
  addNews(C,'program',`Senior Night: ${C.schools[u].town} honor ${n} senior${n===1?'':'s'}${res==='win'?' and send them off with a win':res==='draw'?' in a hard-fought draw':', though the night ends in defeat'}`,u,{fid:f.id}); }

/* ---------- v8: The Courier (weekly front page) and TouchlineTV top plays ---------- */
const COMP_ORDER={pre:0,reg:1,sec:2,rgn:3,st:4};
function courierIssues(C,yr){ yr=yr||C.year; const map={};
  for(const f of Object.values(C.fixtures)){ if(f.yr!==yr||f.lvl!=='V'||f.st!=='d') continue; if(!C.league.includes(f.h)&&!C.league.includes(f.a)&&f.h!==C.userSid&&f.a!==C.userSid) continue; const k=f.comp+':'+f.rd; (map[k]||(map[k]={k,comp:f.comp,rd:f.rd,yr,fx:[]})).fx.push(f.id); }
  return Object.values(map).sort((a,b)=>COMP_ORDER[a.comp]-COMP_ORDER[b.comp]||a.rd-b.rd); }
const PLAY_PTS={solo:9,long:8.5,fk:8,break:6.5,header:6,cross:5,corner:5,open:4,tapin:2.5,pen:1.5};
function playScore(C,f,e){ let sc=PLAY_PTS[e.ty]||4; const s=e.s, mine=e.sc?e.sc[s]:0, theirs=e.sc?e.sc[1-s]:0; const fin=[f.hg,f.ag]; const loser=fin[1-s];
  if(e.m>=80) sc+=2.5; if(fin[s]>fin[1-s]&&mine===loser+1) sc+=3; else if(mine===theirs&&e.m>=70) sc+=2;
  if(['sec','rgn','st'].includes(f.comp)) sc+=2; if(isRivalry(C,f.h,f.a)) sc+=1.5; if(f.h===C.userSid||f.a===C.userSid) sc+=1;
  sc+=Math.min(2,((e.seq||[]).length-1)*0.4); sc+=(hashStr(f.id+':'+e.m+e.pid)%100)/1000; return Math.round(sc*100)/100; }
function topPlays(C,issue,n=5){ const out=[]; if(!issue) return out;
  for(const fid of issue.fx){ const f=C.fixtures[fid]; const lg=C.logs[fid]; if(!f||!lg||!lg.ev) continue; lg.ev.filter(x=>x.t==='goal').forEach((e,i)=>{ if(!e.seq||!e.seq.length) return; out.push({fid,i,pid:e.pid,s:e.s,m:e.m,ty:e.ty,ast:e.ast||null,score:playScore(C,f,e)}); }); }
  out.sort((a,b)=>b.score-a.score); return out.slice(0,n); }
/* player of the week: best match rating among the issue's games */
function playerOfWeek(C,issue){ let best=null; if(!issue) return null; for(const fid of issue.fx){ const lg=C.logs[fid]; if(!lg) continue; lg.box.forEach((rows,i)=>rows.forEach(r=>{ if(!best||r.rt>best.rt||(r.rt===best.rt&&r.g>best.g)) best={...r,fid,side:i}; })); } return best; }

/* ---------- Summer Scouting Camp (off-season): scout and invite rising middle schoolers ---------- */
const FEEDERS=['Cedar Ridge Middle','Northside Middle','St. Anne\'s Academy','Lakeview Middle','Pine Hollow Middle','Westbrook Middle','Oak Grove School','Riverside Middle'];
function campEnsure(C){
  if(C.phase!=='offseason'||C.rolled[C.year]) return null;
  if(C.camp&&C.camp.yr===C.year) return C.camp;
  const r=rngFrom(hashStr(C.seed+'camp'+C.year)); const sch=C.schools[C.userSid]; const pros=[];
  for(let i=0;i<8;i++){ const grade=r()<0.55?7:8; const pos=pick(r,['GK','DEF','DEF','MID','MID','FWD','FWD','MID']);
    const tier=r(); const bonus=tier<0.12?16:tier<0.35?9:tier<0.75?3:-3;
    const p=genPlayer(C,r,{sid:C.userSid,lvl:'MOD',grade,pos,target:levelTarget('MOD',grade,sch.strength,true)+bonus+gauss(r)*4,user:true});
    const stars=clamp(Math.round((p.pot-62)/8+(bonus>10?1:0)),1,5);
    pros.push({p, feeder:pick(r,FEEDERS), stars, know:Math.round(10+r()*25), off:Math.round((r()-.5)*10), rival:r()<0.3?pick(r,C.league.filter(s=>s!==C.userSid)):null, invited:false, committed:false, declined:false}); }
  C.camp={yr:C.year, pts:12, spots:3, prospects:pros}; return C.camp; }
function campProspect(C,id){ const K=campEnsure(C); return K? K.prospects.find(x=>x.p.id===id) : null; }
function campScout(C,id){ const K=campEnsure(C); const x=campProspect(C,id); if(!K||!x||K.pts<2||x.know>=100) return {ok:false,msg:'No scouting points left.'}; K.pts-=2; x.know=Math.min(100,x.know+35); return {ok:true}; }
function campInvite(C,id){ const K=campEnsure(C); const x=campProspect(C,id); if(!K||!x||x.invited) return {ok:false,msg:''};
  if(K.prospects.filter(y=>y.committed).length>=K.spots) return {ok:false,msg:'All roster spots for incoming players are filled.'};
  if(K.pts<1) return {ok:false,msg:'You need 1 scouting point to send an invitation.'};
  K.pts-=1; x.invited=true; const pres=C.schools[C.userSid].prestige; const r=rngFrom(hashStr(C.seed+'inv'+id));
  let pr=[0,.85,.75,.62,.48,.36][x.stars]*(0.7+pres/160)*(x.rival?0.75:1)*(0.85+x.know/400); pr=clamp(pr,0.12,0.95);
  if(r()<pr){ x.committed=true; addNews(C,'program',`${x.p.fn} ${x.p.ln} (${x.p.pos}, ${x.stars}★) commits to ${C.schools[C.userSid].town}`,C.userSid); return {ok:true,committed:true}; }
  x.declined=true; return {ok:true,committed:false,msg:x.rival?`${x.p.fn} ${x.p.ln} chose ${C.schools[x.rival].town}.`:`${x.p.fn} ${x.p.ln} decided to stay at his school.`}; }
function campJoin(C,r){ const K=C.camp; if(!K||K.joined) return; K.joined=true;
  for(const x of K.prospects.filter(y=>y.committed)){ const p=x.p; p.sid=C.userSid; p.lvl='MOD'; p.joined=C.year; p.num=assignNum(r,new Set([...retiredSet(C,C.userSid),...squad(C,C.userSid,'MOD').map(y=>y.num)]),p.pos); p.camp=true; C.players[p.id]=p; } }

function rollover(C){
  if(C.phase!=='offseason' || C.rolled[C.year]) return {ok:false};
  const yr=C.year; if(!C.awards[yr]) finalizeAwards(C,yr);
  archiveSeason(C);
  const r=genR(C); const grads=[];
  const keep=new Set(); const A=C.awards[yr]; if(A){ Object.values(A.list).forEach(a=>keep.add(a.pid)); A.al1.forEach(x=>keep.add(x)); A.al2.forEach(x=>keep.add(x)); }
  for(const k in C.rec.game) C.rec.game[k].forEach(e=>keep.add(e.pid));
  for(const s in C.rec.gameSchool) for(const k in C.rec.gameSchool[s]) C.rec.gameSchool[s][k].forEach(e=>keep.add(e.pid));
  // offseason development (bulk of the year's growth)
  for(const id in C.players){ const p=C.players[id]; const sch=C.schools[p.sid]; if(!p.plan||!sch||sch.ext) continue; const gap=p.pot-ovr(p); if(gap>0) shiftOvr(p,Math.min(gap,p.plan.gain*0.52*clamp(gap/12,0.2,1)),p.sid===C.userSid?'balanced':sch.devFocus); }
  // prestige & strength drift, coaching changes
  const tab=standings(C,'V',yr);
  tab.forEach((t,i)=>{ const s=C.schools[t.sid]; const perf=1-i/7; const title=C.tourneys[yr]&&C.tourneys[yr].secChamp===t.sid?0.12:0; s.prestige=Math.round(clamp(s.prestige*0.8+(perf*70+title*100)*0.2,5,99)); s.strength=clamp(s.strength*0.85+(perf*0.9+title)*0.15,0.05,0.98); s.hist.push({yr,pos:i+1,pts:t.pts}); });
  for(const sid of C.league){ if(sid===C.userSid) continue; const s=C.schools[sid]; const last=s.hist.slice(-3); if(last.length===3&&last.every(h=>h.pos>=7)){ const old=C.coaches[s.coachId]; const co=genCoach(C,r,sid,false); C.coaches[co.id]=co; s.coachId=co.id; addNews(C,'program',`${s.town} part ways with ${old.name}; ${co.name} (${co.pers}) takes over`,sid); } }
  // graduation and level progression
  for(const id of Object.keys(C.players)){ const p=C.players[id]; const sch=C.schools[p.sid];
    if(!sch||sch.ext){ if(keep.has(id)) C.alumni[id]=compactAlum(p,yr,`Played for ${sch?sch.name:'another program'}`); delete C.players[id]; continue; }
    if(p.grade>=12){ const out=gradOutcome(r,p); C.alumni[id]=compactAlum(p,yr,out); grads.push(id); if(p.sid===C.userSid) hofCandidate(C,p,yr); delete C.players[id]; continue; }
    p.grade++; p.age++; p.susp=0;
    p.h=Math.max(p.h, p.ah-growthLeft(p.age,p.mat));
    if(p.lvl==='JV'&&p.grade>=11) p.lvl='V';
    if(p.lvl==='MOD'&&p.grade>=9) p.lvl='JV';
  }
  hofInduct(C,yr);
  C.rolled[yr]=true;
  C.year++; C.seasonNo++;
  campJoin(C,r);
  // recruits & coverage
  for(const sid of C.league){ const user=sid===C.userSid; const sch=C.schools[sid];
    for(const lvl of ['V','JV']){ const sq=squad(C,sid,lvl); const gks=sq.filter(p=>p.pos==='GK').length; for(let i=gks;i<2;i++){ const below=lvl==='V'?'JV':'MOD'; const g=squad(C,sid,below).filter(p=>p.pos==='GK'&&eligible(p,lvl)).sort((a,b)=>ovr(b)-ovr(a))[0]; if(g){ g.lvl=lvl; } else { const p=genPlayer(C,r,{sid,lvl,grade:lvl==='V'?11:9,pos:'GK',target:levelTarget(lvl,lvl==='V'?11:9,sch.strength,user),user}); p.num=assignNum(r,new Set(sq.map(x=>x.num)),'GK'); C.players[p.id]=p; addNews(C,'program',`${sch.town} add transfer keeper ${pname(p)}`,sid); } } }
    const need={GK:2,DEF:7,MID:6,FWD:5};
    const mod=squad(C,sid,'MOD'); const have={GK:0,DEF:0,MID:0,FWD:0}; mod.forEach(p=>have[p.pos]++);
    const want=[]; for(const g of GROUPS) for(let i=have[g];i<need[g];i++) want.push(g);
    while(mod.length+want.length<20) want.push(pick(r,['DEF','MID','FWD']));
    for(const g of want){ const p=genPlayer(C,r,{sid,lvl:'MOD',grade:7,pos:g,target:levelTarget('MOD',7,sch.strength,user)+gauss(r)*5,user}); p.num=assignNum(r,new Set([...retiredSet(C,sid),...squad(C,sid,'MOD').map(x=>x.num)]),g); p.joined=C.year; C.players[p.id]=p; }
    // Varsity size bounds
    let v=squad(C,sid,'V'); if(v.length<18){ const jv=squad(C,sid,'JV').sort((a,b)=>ovr(b)-ovr(a)); while(v.length<18&&jv.length){ const p=jv.shift(); p.lvl='V'; v.push(p); } }
    v=squad(C,sid,'V').sort((a,b)=>ovr(a)-ovr(b)); while(v.length>26){ const p=v.shift(); C.alumni[p.id]=compactAlum(p,C.year-1,'Left the program before his final season'); delete C.players[p.id]; }
    for(const lvl of LVLS){ const used=retiredSet(C,sid); for(const p of squad(C,sid,lvl)){ if(used.has(p.num)) p.num=assignNum(r,used,p.pos); else used.add(p.num); } }
    for(const lvl of LVLS){ const lu=getLu(C,sid,lvl); const form=user?lu.form:C.coaches[sch.coachId].form; const keepTac=lu.tac, keepStrat=lu.strat;
      const caps=(lu.caps||[]).filter(id=>C.players[id]&&C.players[id].lvl===lvl&&C.players[id].sid===sid);
      sch.lu[lvl]={...autoLineup(C,sid,lvl,form), tac:keepTac, strat:keepStrat, caps}; if(caps.length<2) sch.lu[lvl].caps=[...caps, ...defaultCaptains(C,sid,lvl).filter(x=>!caps.includes(x))].slice(0,2); }
  }
  // external schools: keep as stubs for history, drop rosters (already removed)
  // seasonal rival: closest finisher to user last season
  const ui=tab.findIndex(t=>t.sid===C.userSid); const near=[tab[ui-1],tab[ui+1]].filter(Boolean).map(t=>t.sid).filter(s=>s!==C.rivals.heated);
  C.rivals.seasonal = near[0] || C.league.find(s=>s!==C.userSid&&s!==C.rivals.heated);
  // facilities: organic growth every 4-5 seasons
  for(const sid of C.league){ const s=C.schools[sid]; const st=s.stadium; if(!st.lastEval) st.lastEval=yr-1;
    if(C.year-st.lastEval>=st.every){ st.lastEval=C.year; const recent=s.hist.slice(-st.every); const avgPos=recent.reduce((a,h)=>a+h.pos,0)/Math.max(1,recent.length);
      const titles=s.honors.filter(h=>h.yr>yr-st.every).length; const score=(8-avgPos)/7*60+titles*12+s.prestige*0.3;
      const need={1:30,2:42,3:58}[st.tier]; if(st.tier<4 && score>=need){ st.tier++; const T=STADIUM_TIERS[st.tier]; st.cap=Math.round((T.min+r()*(T.max-T.min))/10)*10; addNews(C,'facility',`${s.town} unveil upgrades: ${st.name} becomes a ${T.n} (${st.cap.toLocaleString()} seats)`,sid); } } }
  addNews(C,'program',`${grads.filter(id=>C.alumni[id].sid===C.userSid).length} seniors graduate from ${C.schools[C.userSid].town}`,C.userSid);
  seasonStart(C);
  return {ok:true, grads};
}

/* ---------- stadium (organic tier vs manager override) ---------- */
function stadiumDefaults(st){ const t=st.tier; return {name:st.name, tier:t, cap:st.cap, surface:st.surface, marks:t===2?'multi':'soccer', markColor:'#ffffff', track:t>=3?st.track:'none', goals:t===1?'portable':t===4?'box':'classic', lights:t>=4?'towers':t>=3?'poles':'none', stands:'primary', board:t>=4?'video':'led'}; }
function effStadium(s){ const st=(s&&s.stadium)||{name:'Neutral Field',tier:2,cap:600,surface:'turf',track:'red'}; const d=stadiumDefaults(st); if(st.ovr){ const o={...d,...st.ovr}; if(st.ovr.tier && !st.ovr.cap){ const T=STADIUM_TIERS[o.tier]; o.cap=Math.round((T.min+T.max)/20)*10; } return o; } return d; }

/* ---------- milestones, briefing, alerts ---------- */
function careerTotals(p, lvl='V'){ const t={gp:0,g:0,a:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,cs:0}; for(const yr in p.st){ const y=p.st[yr][lvl]; if(!y) continue; for(const bk of ['reg','post']){ const b=y[bk]; if(!b) continue; for(const k in t) t[k]+=b[k]||0; } } return t; }
function milestones(C){
  const out=[]; const marks=[10,25,40,50,75,100];
  for(const p of squad(C,C.userSid,'V')){ const t=careerTotals(p); for(const [k,lab] of [['g','career goals'],['a','career assists'],['sv','career saves']]){ const nx=marks.find(m=>m>t[k]); if(nx && nx-t[k]<= (k==='sv'?4:2)) out.push({text:`${pname(p)} is ${nx-t[k]} away from ${nx} ${lab}`,pid:p.id,d:nx-t[k]}); } }
  const co=C.coaches[C.userCoachId]; let w=0; for(const y in co.rec) w+=co.rec[y].w; const nx=[10,25,50,75,100,150,200].find(m=>m>w); if(nx&&nx-w<=3) out.push({text:`Coach ${co.name} is ${nx-w} win${nx-w>1?'s':''} from ${nx} career wins`,d:nx-w});
  const rec=(C.rec.gameSchool[C.userSid]||{}).g; if(rec&&rec[0]) {}
  const tab=standings(C,'V'); const me=tab.find(t=>t.sid===C.userSid); if(me&&me.streak>=2) out.push({text:`${C.schools[C.userSid].town} have won ${me.streak} straight; one more extends the streak to ${me.streak+1}`,d:1});
  return out.sort((a,b)=>a.d-b.d).slice(0,5);
}
function briefing(C, sid){
  const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&f.comp!=='pre'&&(f.h===sid||f.a===sid)).sort((a,b)=>(b.yr-a.yr)||(b.comp===a.comp?b.rd-a.rd:0)).slice(0,5);
  const scorers={}, types={}, halves=[0,0]; let gf=0, ga=0;
  for(const f of fx){ const lg=C.logs[f.id]; if(!lg) continue; const side=f.h===sid?0:1; gf+= side===0?f.hg:f.ag; ga+= side===0?f.ag:f.hg;
    for(const e of lg.ev||[]){ if(e.t!=='goal'||e.s!==side) continue; scorers[e.pid]=(scorers[e.pid]||0)+1; if(e.ty) types[e.ty]=(types[e.ty]||0)+1; halves[e.m<=40?0:1]++; } }
  const sc=Object.entries(scorers).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([pid,n])=>({pid,n}));
  const ty=Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>({k,n}));
  const danger=squad(C,sid,'V').map(p=>({p,b:seasonBucket(p,C.year,'V','reg')})).filter(x=>x.b).sort((a,b)=>(b.b.g*2+b.b.a)-(a.b.g*2+a.b.a)).slice(0,3);
  return {n:fx.length, gf, ga, scorers:sc, types:ty, halves, danger};
}

/* ---------- records (season & career computed from stored stats) ---------- */
function everyone(C){ return [...Object.values(C.players), ...Object.values(C.alumni)]; }
function seasonRecords(C, stat, sid){ const out=[]; for(const p of everyone(C)){ for(const yr in p.st){ const y=p.st[yr].V; if(!y||!y.reg) continue; const s=y.sid||p.sid; if(sid&&s!==sid) continue; if(!C.league.includes(s)) continue; const v=y.reg[stat]; if(v>0) out.push({v,pid:p.id,sid:s,yr:+yr}); } } return out.sort((a,b)=>b.v-a.v||a.yr-b.yr).slice(0,10); }
function careerRecords(C, stat, sid){ const out=[]; for(const p of everyone(C)){ if(sid&&p.sid!==sid) continue; if(!C.league.includes(p.sid)) continue; const v=careerTotals(p)[stat]; if(v>0) out.push({v,pid:p.id,sid:p.sid}); } return out.sort((a,b)=>b.v-a.v||(a.pid<b.pid?-1:1)).slice(0,10); }
function teamSeasonRecords(C, sid){ const out=[]; for(const a of C.archives){ for(const t of a.stand.V){ if(sid&&t.sid!==sid) continue; out.push({...t,yr:a.yr}); } } if(C.phase!=='preseason'){ for(const t of standings(C,'V')) if((!sid||t.sid===sid)&&t.p) out.push({sid:t.sid,p:t.p,w:t.w,d:t.d,l:t.l,gf:t.gf,ga:t.ga,pts:t.pts,yr:C.year,live:true}); } return out.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.yr-b.yr).slice(0,10); }
function findPerson(C,id){ return C.players[id]||C.alumni[id]||null; }

/* ---------- migrations ---------- */
function migrate(C){
  if(!C) return C;
  if(!C.v||C.v<4){ C.settings=Object.assign({difficulty:'normal',cards:'normal',suspensions:true,legacyFav:false,manager:false,halftime:true,speed:2,odds:true},C.settings||{}); C.directed=C.directed||{}; C.rolled=C.rolled||{}; C.v=4; }
  if(C.v<5){ for(const id in C.players) C.players[id].tr={score:0,assist:0,stop:0,defend:0}; C.v=5; } // traits are edit-only from v5
  if(C.v<8){ // v8: signature-celebration feats, rebuilt from the archive
    for(const f of Object.values(C.fixtures)){ if(f.st!=='d'||f.lvl!=='V'||f.comp==='pre') continue; const lg=C.logs&&C.logs[f.id]; if(!lg||!lg.box) continue; const riv=C.rivals&&isRivalry(C,f.h,f.a)==='heated';
      lg.box.forEach(rows=>rows.forEach(r=>{ const q=C.players[r.pid]; if(!q||!r.g) return; const F=q.feats||(q.feats={}); if(['sec','rgn','st'].includes(f.comp)) F.post=1; if(r.g>=3) F.hat=1; if(riv) F.riv=1; })); }
    for(const id in C.players){ const q=C.players[id]; if(q.sid===C.userSid) q.celSeen=celebUnlocked(C,q); }
    C.v=8; }
  C.logs=C.logs||{};
  // award recovery: any completed season without awards gets them (idempotent)
  for(const yr of Object.keys(C.tourneys||{})) if(!C.awards[yr]) finalizeAwards(C,+yr);
  capPostTeams(C); /* v11.2: Regional/State opponents capped at 85, also for saves made before the cap */
  return C;
}

if (typeof module !== 'undefined') module.exports = {CELEBS,celebFor,celebProgress,celebUnlocked,setCeleb,isSeniorNight,seniorNightFixture,seniorsOf,courierIssues,topPlays,playerOfWeek,newCareer,startMatch,stepMatch,finishMatch,runToEnd,resumeSecondHalf,simRound,advance,roundFixtures,userFixture,roundDone,standings,simProbs,american,promote,rollover,ovr,squad,getLu,validateLineup,autoLineup,bestFormation,setLineup,finalizeAwards,leaders,seasonRecords,careerRecords,matchWinnerIdx,SPEECHES,STRATS,FORMS,ROLE_GROUP,eff,migrate,evaluate,briefing,milestones,teamSeasonRecords,xiRating,effStadium,stadiumDefaults,repairLineup};
