/* ===================== v18.23 LOCKER ROOM & PERSONALITIES =====================
   Every player has a personality (seeded from career seed + player id, so it never changes and needs no save data):
   Captain, Gym Rat, Joker, Quiet Pro, Natural, Student, Hothead, Showman. A personality does three things:
   - Growth: a small multiplier on the development core (Gym Rat x1.06, Student x1.03, Joker x0.98, Natural x0.96, others x1).
   - Chemistry: each level's starters add up (Captain +2, Joker +1, Hothead -2, Showman -1); with your locker-room mood it gives that
     squad a small match-form edge (x0.0012 per point, at most +-6 points = +-0.0072; a home edge is about 0.03).
   - Voice: postgame quotes in the News, and weekly locker-room situations (about 40% of league matchdays) where you choose how to
     handle a player. Choices change mood (chemistry for a few games) or one player's growth for a few weeks.
   Parity: other schools have personalities and chemistry from the same tables (no situations), so the averages stay neutral.
   State (your school only): C.lr = {v:1, ev, mood:{V,JV,MOD:[{d,until}]}, pg:{pid:{m,until}}, log[], yr}. Identifiers v1822 / V1822. */
const V1822={ FORM:0.0012, CHEM:6, P:0.4, off:false, cache:new Map() };
const V1822_P=[
  {k:'cap',n:'Captain',ico:'👑',w:8,g:1,c:2,d:'Leads by example and keeps the room together.',q:{W:['We did it for each other tonight.','Proud of every guy in that room.'],L:['That one is on us. We will be better Tuesday.','Heads up. We learn from it.'],D:['A point is a point. We go again.']}},
  {k:'grind',n:'Gym Rat',ico:'💪',w:14,g:1.06,c:0,d:'First in, last out. Grows faster than most.',q:{W:['Back in the weight room tomorrow morning.','The extra work showed tonight.'],L:['I need to get stronger. Simple as that.'],D:['Not good enough. Extra reps this week.']}},
  {k:'joker',n:'Joker',ico:'😄',w:12,g:0.98,c:1,d:'Keeps everyone loose. Not always focused in drills.',q:{W:['Somebody tell the bus driver we want music.','Coach almost smiled. Almost.'],L:['Hey, at least our uniforms looked good.'],D:['A tie? Like kissing your sister. Ask my sister.']}},
  {k:'quiet',n:'Quiet Pro',ico:'🤫',w:20,g:1,c:0,d:'Says little, does his job every week.',q:{W:['Good win. Next game.'],L:['We move on.'],D:['Fine. We keep working.']}},
  {k:'natural',n:'Natural',ico:'✨',w:12,g:0.96,c:0,d:'Gifted, makes it look easy, and sometimes coasts.',q:{W:['Felt easy out there honestly.','I just saw the gap and went.'],L:['Off night. Happens.'],D:['We should have won that one easy.']}},
  {k:'student',n:'Student',ico:'📚',w:14,g:1.03,c:0,d:'Studies film like homework. Learns quickly.',q:{W:['We watched their film all week. It paid off.','Their left back cheated inside. We noticed.'],L:['I already know what I would change. Film tomorrow.'],D:['Tactically even. We need a better plan for the second half.']}},
  {k:'hot',n:'Hothead',ico:'🔥',w:10,g:1,c:-2,d:'Plays with fire. Sometimes burns the room.',q:{W:['Tell them to come back next year. Same result.','I told you all week.'],L:['The ref decided that game, not us.','I am not talking about it.'],D:['We got robbed. Write that down.']}},
  {k:'show',n:'Showman',ico:'🎤',w:10,g:1,c:-1,d:'Loves the cameras and the big moment.',q:{W:['Did you get my celebration on video?','Big stage, big player.'],L:['Just wait until the playoffs.'],D:['Even my highlight reel needs a cliffhanger.']}}];
const V1822_BY=Object.fromEntries(V1822_P.map(x=>[x.k,x]));
/* the personality of a player (stable for a career) */
function v1822Pers(C,p){ if(!p) return V1822_BY.quiet; const key=C.seed+'|'+p.id; let k=V1822.cache.get(key); if(!k){ const r=rngFrom(hashStr(C.seed+'|prs|'+p.id));
    const ws=V1822_P.map(x=>x.w*(x.k==='cap'?(p.grade>=11?1.6:0.5):1)); const t=ws.reduce((a,b)=>a+b,0); let v=r()*t; k='quiet'; for(let i=0;i<ws.length;i++){ v-=ws[i]; if(v<=0){ k=V1822_P[i].k; break; } }
    if(V1822.cache.size>5000) V1822.cache.clear(); V1822.cache.set(key,k); } return V1822_BY[k]; }
function v1822S(C){ let S=C.lr; if(!S||typeof S!=='object') S=C.lr={v:1,ev:null,mood:{},pg:{},log:[],yr:C.year}; if(!S.mood||typeof S.mood!=='object') S.mood={}; for(const l of LVLS) if(!Array.isArray(S.mood[l])) S.mood[l]=[];
  if(!S.pg||typeof S.pg!=='object') S.pg={}; if(!Array.isArray(S.log)) S.log=[]; if(S.yr!==C.year){ S.yr=C.year; for(const l of LVLS) S.mood[l]=[]; S.pg={}; if(S.ev&&!S.ev.done) S.ev=null; } return S; }
/* starters of a level (lineup), falling back to the best 11 */
function v1822Starters(C,sid,lvl){ const lu=getLu(C,sid,lvl); const ids=lu&&lu.slots?lu.slots.map(s=>s.pid).filter(id=>C.players[id]):[]; if(ids.length) return ids.map(id=>C.players[id]); return squad(C,sid,lvl).sort((a,b)=>ovr(b)-ovr(a)).slice(0,11); }
function v1822Mood(C,lvl){ const S=C.lr; if(!S||!S.mood||S.yr!==C.year) return 0; return (S.mood[lvl]||[]).filter(m=>m.until>=C.md).reduce((a,m)=>a+m.d,0); }
function v1822Chem(C,sid,lvl){ let c=0; for(const p of v1822Starters(C,sid,lvl)) c+=v1822Pers(C,p).c; if(sid===C.userSid) c+=v1822Mood(C,lvl); return clamp(c,-V1822.CHEM,V1822.CHEM); }
function v1822ChemParts(C,lvl){ const o={}; for(const p of v1822Starters(C,C.userSid,lvl)){ const P=v1822Pers(C,p); if(P.c){ const e=o[P.k]||(o[P.k]={P,n:0,sum:0}); e.n++; e.sum+=P.c; } } return Object.values(o); }
/* development core hooks */
v1821dMod('pers','Personality',(C,p)=>{ if(V1822.off) return null; const sch=C.schools[p.sid]; if(!sch||sch.ext) return null; const g=v1822Pers(C,p).g; return g===1?null:g; });
v1821dMod('lr','Locker room',(C,p,ctx)=>{ if(V1822.off||ctx!=='tick'||p.sid!==C.userSid) return null; const S=C.lr; const x=S&&S.yr===C.year&&S.pg&&S.pg[p.id]; return x&&x.until>=C.md?x.m:null; });
v1821dMatch((C,f,sid)=>{ if(V1822.off) return 0; const sch=C.schools[sid]; if(!sch||sch.ext) return 0; return v1822Chem(C,sid,f.lvl)*V1822.FORM; });
/* ---------- weekly situations ---------- */
const V1822_EV={
  hot:{t:'{A} got into a shouting match with a teammate at practice.',ch:[{l:'Talk it out',d:'Both sides say their piece. Squad mood +1 for 3 games.',mood:1,g:3},{l:'Make an example of him',d:'Extra laps for him: mood +2 for 3 games, but he grows 10% slower for 3 weeks.',mood:2,g:3,pm:0.9}]},
  grind:{t:'{A} asks for the gym keys so he can lift before school.',ch:[{l:'Open the gym',d:'He grows 25% faster for 3 weeks.',pm:1.25,g:3},{l:'Tell him to rest',d:'Rest days are part of the plan: squad mood +1 for 2 games.',mood:1,g:2}]},
  joker:{t:'{A} swapped every cone in practice for traffic cones from the parking lot.',ch:[{l:'Laugh it off',d:'The room loosens up: mood +2 for 2 games.',mood:2,g:2},{l:'Crack down',d:'Mood −1 for 2 games, but he grows 10% faster for 3 weeks.',mood:-1,g:2,pm:1.1}]},
  show:{t:'{A} posted a video calling out this week’s opponent.',ch:[{l:'Back him publicly',d:'He grows 15% faster for 3 weeks; the room is annoyed: mood −1 for 2 games.',pm:1.15,mood:-1,g:2},{l:'Make him take it down',d:'Team first: mood +1 for 2 games.',mood:1,g:2}]},
  student:{t:'{A} has a chemistry exam and asks to skip Wednesday practice.',ch:[{l:'Let him study',d:'The room respects it: mood +1 for 2 games. He grows 20% slower for 2 weeks.',mood:1,g:2,pm:0.8},{l:'Practice comes first',d:'He practices. Mood −1 for 2 games.',mood:-1,g:2}]},
  cap:{t:'{A} wants to run a players-only meeting before the next game.',ch:[{l:'Let him lead it',d:'Mood +2 for 3 games.',mood:2,g:3},{l:'Run it yourself',d:'Mood +1 for 2 games, and he grows 10% faster for 3 weeks.',mood:1,g:2,pm:1.1}]},
  natural:{t:'{A} is coasting through drills again.',ch:[{l:'Challenge him',d:'He grows 25% faster for 3 weeks; he sulks: mood −1 for 2 games.',pm:1.25,mood:-1,g:2},{l:'Leave him be',d:'Nothing changes.'}]},
  quiet:{t:'{A} stayed late to help the younger players with their touch.',ch:[{l:'Praise him in front of the team',d:'Mood +1 for 3 games.',mood:1,g:3},{l:'Ask him to keep doing it',d:'He grows 10% faster for 3 weeks.',pm:1.1,g:3}]}};
function v1822Spawn(C){ if(V1822.off||C.phase!=='regular'||C.md>=14) return null; const S=v1822S(C); if(S.ev&&!S.ev.done&&S.ev.md===C.md) return S.ev; const r=v1821dR(C,'v1822ev',C.year,C.md); if(r()>=V1822.P) return null;
  const pool=[]; for(const l of ['V','JV','MOD']) for(const p of squad(C,C.userSid,l)) pool.push(p); if(!pool.length) return null; const p=pool[Math.floor(r()*pool.length)]; const P=v1822Pers(C,p);
  S.ev={yr:C.year,md:C.md,k:P.k,pid:p.id,lvl:p.lvl,done:false}; return S.ev; }
function v1822Pending(C){ const S=C.lr; const e=S&&S.ev; return e&&!e.done&&e.yr===C.year&&e.md===C.md&&C.phase==='regular'&&C.players[e.pid]?e:null; }
function v1822Choose(C,i){ const e=v1822Pending(C); if(!e) return {ok:false,msg:'Nothing to decide right now.'}; const E=V1822_EV[e.k]; const c=E&&E.ch[i]; if(!c) return {ok:false,msg:'Unknown choice.'}; const S=v1822S(C); const p=C.players[e.pid];
  if(c.mood) S.mood[e.lvl].push({d:c.mood,until:C.md+(c.g||2)-1}); if(c.pm) S.pg[p.id]={m:c.pm,until:C.md+2};
  e.done=true; e.ch=i; S.log.unshift({yr:C.year,md:C.md,k:e.k,pid:p.id,nm:pname(p),lvl:e.lvl,c:c.l}); if(S.log.length>12) S.log.length=12;
  addNews(C,'program',`Locker room: ${pname(p)} (${v1822Pers(C,p).n}). ${c.l}.`,C.userSid); return {ok:true,msg:c.d}; }
/* ---------- hooks: situations after each league matchday, quotes after your Varsity games ---------- */
{ const _ad=advance; advance=function(C){ const ph=C.phase, md=C.md; const r=_ad.apply(this,arguments); try{ if(!V1822.off&&r&&C.phase==='regular'&&(ph!=='regular'||C.md!==md)) v1822Spawn(C); }catch(e){ console.warn('locker',e); } return r; }; }
{ const _fm=finishMatch; finishMatch=function(C,M){ const f=C&&M&&C.fixtures[M.fid]; const was=f&&f.st; const r=_fm.apply(this,arguments);
    try{ if(!V1822.off&&f&&was!=='d'&&f.st==='d'&&!M.fast&&f.lvl==='V'&&(f.h===C.userSid||f.a===C.userSid)&&f.comp!=='pre'){ const rr=v1821dR(C,'v1822q',f.id); if(rr()<0.4){ const xi=v1822Starters(C,C.userSid,'V'); if(xi.length){ const p=xi[Math.floor(rr()*xi.length)]; const P=v1822Pers(C,p); const res=f.w===C.userSid?'W':f.w?'L':'D'; const qs=P.q[res]||P.q.W; addNews(C,'program',`“${qs[Math.floor(rr()*qs.length)]}” ${pname(p)} (${P.n}) after the ${f.hg}-${f.ag} ${res==='W'?'win':res==='L'?'loss':'draw'}`,C.userSid); } } } }catch(e){ console.warn('locker quote',e); }
    return r; }; }
