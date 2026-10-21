// v8 engine checks: signature celebrations, Senior Night, The Courier / TouchlineTV top plays
const E=require('./load');
const assert=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
const C=E.newCareer({slot:2,seed:8080});
const sn=E.seniorNightFixture(C);
const homeReg=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.comp==='reg'&&f.lvl==='V'&&f.h===C.userSid);
assert(sn && sn.h===C.userSid && sn.rd===Math.max(...homeReg.map(f=>f.rd)), 'Senior Night is the last regular-season home Varsity game');
assert(E.isSeniorNight(C,sn) && homeReg.filter(f=>E.isSeniorNight(C,f)).length===1, 'exactly one Senior Night per season');
const seniors=E.seniorsOf(C); assert(seniors.length>0 && seniors.every(p=>p.grade>=12&&p.lvl==='V'), 'seniors are grade-12 Varsity players');
const rec=E.seniorNightRecord(C,sn); assert(rec.list.length===seniors.length && rec.list.every(x=>x.v&&x.all&&x.name), 'senior cards carry career numbers');

// play a full season
let g=0; while(C.phase!=='offseason'&&g++<220){ E.simRound(C); E.advance(C); }
assert(C.news.some(n=>/^Senior Night:/.test(n.text)), 'Senior Night is reported in the news after the game');
assert(C.seniorNights[sn.yr].done===true && C.seniorNights[sn.yr].res, 'Senior Night result is archived');

// celebrations
const all=Object.values(C.players);
assert(all.every(p=>E.CELEB_BY[E.celebFor(C,p)]), 'every player has a valid celebration');
assert(all.every(p=>E.celebHave? true : true) && all.every(p=>E.celebUnlocked(C,p).includes('classic')), 'everyone has the Fist Pump');
const scorers=all.filter(p=>E.careerTotals(p,'V').g>=10); assert(scorers.length===0 || scorers.every(p=>E.celebUnlocked(C,p).includes('kneeslide')), '10 career goals unlocks the Knee Slide');
const postScorers=all.filter(p=>(p.feats||{}).post); assert(postScorers.every(p=>E.celebUnlocked(C,p).includes('flag')), 'postseason scorers unlock the Corner-Flag Jig');
const mine=all.filter(p=>p.sid===C.userSid&&E.celebUnlocked(C,p).length>1);
const p0=mine[0]||all.find(p=>p.sid===C.userSid); const lockedId=E.CELEBS.find(c=>!E.celebUnlocked(C,p0).includes(c.id));
assert(!lockedId || E.setCeleb(C,p0.id,lockedId.id)===false, 'a locked celebration cannot be equipped');
const un=E.celebUnlocked(C,p0); const pick=un[un.length-1]; assert(E.setCeleb(C,p0.id,pick)===true && E.celebFor(C,p0)===pick, 'an unlocked celebration can be equipped and is used');
assert(E.setCeleb(C,p0.id,'auto')===true && p0.cel===undefined, 'Auto clears the choice');
assert(C.news.some(n=>n.type==='celebration'), 'celebration unlocks are announced for your players');
assert(C.news.filter(n=>n.type==='celebration').every(n=>C.players[n.pid]?C.players[n.pid].sid===C.userSid:true), 'only your own players generate unlock news');

// courier / top plays
const issues=E.courierIssues(C); assert(issues.length>=14, 'one Courier issue per completed round ('+issues.length+')');
const orderOk=issues.every((x,i)=>i===0||({pre:0,reg:1,sec:2,rgn:3,st:4}[issues[i-1].comp]<{pre:0,reg:1,sec:2,rgn:3,st:4}[x.comp])||(issues[i-1].comp===x.comp&&issues[i-1].rd<x.rd)); assert(orderOk, 'issues are in calendar order');
let okPlays=true, nonEmpty=0; for(const is of issues){ const T=E.topPlays(C,is,5); if(T.length) nonEmpty++; if(T.length>5) okPlays=false; for(let i=1;i<T.length;i++) if(T[i].score>T[i-1].score) okPlays=false;
  for(const t of T){ const lg=C.logs[t.fid]; const e=lg.ev.filter(x=>x.t==='goal')[t.i]; if(!e||e.pid!==t.pid||!e.seq) okPlays=false; } }
assert(okPlays, 'top plays: at most 5, ranked, each points at a real recorded goal');
assert(nonEmpty>=issues.length-2, 'almost every week has highlights');
const pow=E.playerOfWeek(C,issues[3]); assert(pow && pow.rt>=6, 'player of the week is a strong performer');
