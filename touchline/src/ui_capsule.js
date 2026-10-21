/* ===================== v12 THE TIME CAPSULE =====================
   Every fall, each freshman in your program writes one promise for senior year. The notes are sealed in a
   capsule on the Office shelf and opened on graduation day, when each is checked against the real career:
   CAME TRUE, CLOSE, NOT QUITE, BEYOND, or MOVED ON for players who left. Promises are chosen per player from
   his position, potential, starting level, size, temperament and the program's rival, never twice in a class. */

const TC_STAMP={yes:['CAME TRUE','#2f9e5b'],close:['CLOSE','#d08a12'],no:['NOT QUITE','#c0392b'],beyond:['★ BEYOND','#b8860b'],gone:['MOVED ON','#6b7280']};
const TC_ORDER=['beyond','yes','close','no','gone'];

/* ---------- live tracking: the career facts the box score does not keep ---------- */
function tcOf(p){ return p.tc||(p.tc={}); }
function tcAdd(T,k,v){ T[k]=(T[k]||0)+(v==null?1:v); }
const _finishTC=finishMatch;
finishMatch=function(C,M){ const f=C.fixtures[M.fid]; const was=f&&f.st; const out=_finishTC.apply(this,arguments);
  try{ if(was!=='d'&&f&&f.st==='d'&&f.lvl==='V'&&M.user>=0) tcTrack(C,f,M); }catch(e){ console.warn('capsule tracking',e); }
  return out; };
function tcTrack(C,f,M){
  const u=C.userSid; const side=f.h===u?0:f.a===u?1:-1; if(side<0) return;
  const S=M.sides[side]; const us=M.sc[side], them=M.sc[1-side]; const won=us>them, drew=us===them&&!M.so, wonSO=M.so&&f.w===u;
  const riv=f.comp!=='pre'&&isRivalry(C,f.h,f.a)==='heated'; const stFinal=f.comp==='st'&&f.rd===2; const stAny=f.comp==='st';
  const senior=typeof isSeniorNight==='function'&&isSeniorNight(C,f);
  const goals=(M.ev||[]).filter(e=>e.t==='goal');
  /* the game-winning goal: the goal that put the winner one ahead of the loser's final total */
  let gw=null; if(f.w&&!M.so){ const ws=f.w===f.h?0:1; const L=M.sc[1-ws]; const mine=goals.filter(e=>e.s===ws); gw=mine[L]||null; }
  const caps=(getLu(C,u,'V')||{}).caps||[];
  for(const s of S.slots){ const p=C.players[s.pid]; const row=M.pl[s.pid]; if(!p||!row) continue; const T=tcOf(p);
    if(won||wonSO) tcAdd(T,'w');
    if(caps.includes(p.id)) tcAdd(T,'cpg');
    const g=row.g||0, a=row.a||0;
    if(g>=2) tcAdd(T,'b2'); if(g>=3) tcAdd(T,'h3'); if(g&&a) tcAdd(T,'ga'); if(g>(T.mx||0)) T.mx=g;
    if(riv){ tcAdd(T,'rp'); if(won||wonSO) tcAdd(T,'rw'); if(drew) tcAdd(T,'rd'); if(g) tcAdd(T,'rg',g); if(a) tcAdd(T,'ra',a); if(s.pid===S.gk&&them===0) tcAdd(T,'rcs'); }
    if(stAny&&g) tcAdd(T,'stg',g);
    if(stFinal){ tcAdd(T,'sfp'); if(g) tcAdd(T,'sfg',g); if(f.w===u) tcAdd(T,'sfw'); }
    if(senior&&g&&p.grade>=12) tcAdd(T,'sng',g);
  }
  for(const e of goals){ if(e.s!==side) continue; const p=C.players[e.pid]; if(!p) continue; const T=tcOf(p);
    const ty=T.ty||(T.ty={}); ty[e.ty]=(ty[e.ty]||0)+1;
    if(gw&&e===gw){ tcAdd(T,'gw'); if(e.m>=70) tcAdd(T,'lw'); } }
  if(M.so&&M.so.kicks){ const K=M.so.kicks; const last=K[K.length-1];
    for(const k of K){ if(k.s===side){ const p=C.players[k.pid]; if(!p) continue; const T=tcOf(p); tcAdd(T,'sop'); if(k.res==='goal') tcAdd(T,'sog'); if(k===last&&k.res==='goal'&&f.w===u) tcAdd(T,'sow'); }
      else if(k.res==='save'){ const gk=C.players[S.gk]; if(gk) tcAdd(tcOf(gk),'sos'); } } }
}

/* ---------- the promises ---------- */
/* tiers come from a realistic projection, not the raw potential: in calibration runs freshmen finished about 6 below it on average */
function tcTier(pot){ const x=pot-6; return x>=84?'star':x>=74?'good':x>=66?'solid':'long'; }
function tcPick(seed,list){ return list[hashStr(seed)%list.length]; }
const TC_AWARD={FWD:'scorer',MID:'playmaker',DEF:'dpoy',GK:'gk'};
const TC=[
  {k:'captain',w:c=>({star:3,good:2,solid:0.5}[c.tier]||0), say:c=>['By senior year I\'ll be captain.','I\'m wearing the armband one day. Write it down.','Captain. Senior year. Watch.','One day they\'ll call me Captain '+c.ln+'.'],
    chk:(c,D)=>D.capYrs>=2?['beyond',`Captain ${D.capList.join(' & ')}`]:D.capYrs===1||D.F.cap?['yes',`Captain ${D.capList.join('')||'senior year'}`]:D.V.gp>=30?['close',`${D.V.gp} varsity games, never captain`]:['no',`Never wore the armband`]},
  {k:'goals',pos:['FWD','MID'],w:c=>c.pos==='FWD'?({star:4,good:4,solid:3.4,long:2}[c.tier]):c.tier==='star'?1.6:0, n:c=>c.pos==='MID'?tcPick(c.id+'n',[8,10,12]):({star:[25,30,40],good:[10,12,15],solid:[3,4,5],long:[1,1,2]}[c.tier]).at(hashStr(c.id+'g')%3),
    say:c=>c.n===1?['Score one varsity goal. Just one.','One goal on varsity. That\'s all I need.']:[`Score ${c.n} varsity goals.`,`${c.n} goals. Minimum.`,`I'm scoring ${c.n} for the ${c.mascot}.`],
    chk:(c,D)=>{ const g=D.V.g; return [g>=Math.max(c.n+3,c.n*1.6)?'beyond':g>=c.n?'yes':g>=c.n*0.7&&g>0?'close':'no',`${g} varsity goal${g===1?'':'s'}`]; }},
  {k:'assists',pos:['MID','FWD'],w:c=>c.pos==='MID'?({star:3.4,good:3.4,solid:2.8,long:1.4}[c.tier]):c.tier==='star'?0.6:0, n:c=>({star:[15,18,20],good:[6,8,10],solid:[3,4,5],long:[1,1,2]}[c.tier]).at(hashStr(c.id+'a')%3),
    say:c=>c.n===1?['Get one varsity assist.']:[`${c.n} assists. I make everyone better.`,`Set up ${c.n} varsity goals.`,`${c.n} assists. Strikers will owe me dinner.`],
    chk:(c,D)=>{ const a=D.V.a; return [a>=Math.max(c.n+3,c.n*1.6)?'beyond':a>=c.n?'yes':a>=c.n*0.7&&a>0?'close':'no',`${a} varsity assist${a===1?'':'s'}`]; }},
  {k:'tackles',pos:['DEF'],w:c=>({star:3,good:3,solid:2.6,long:1.2}[c.tier]), n:c=>({star:[90,100,120],good:[50,60,70],solid:[25,30,40],long:[5,10,15]}[c.tier]).at(hashStr(c.id+'t')%3),
    say:c=>[`Nobody gets past me. ${c.n} tackles.`,`${c.n} varsity tackles.`,`Make ${c.n} tackles. Strikers will hate me.`],
    chk:(c,D)=>{ const t=D.V.tk; return [t>=c.n*1.5?'beyond':t>=c.n?'yes':t>=c.n*0.7&&t>0?'close':'no',`${t} varsity tackles`]; }},
  {k:'saves',pos:['GK'],w:c=>({star:3,good:3,solid:2.6,long:1.4}[c.tier]), n:c=>({star:[120,150,180],good:[60,80,100],solid:[30,40,50],long:[5,10,15]}[c.tier]).at(hashStr(c.id+'s')%3),
    say:c=>[`Make ${c.n} varsity saves.`,`${c.n} saves. The net is mine.`,`Stop ${c.n} shots on varsity.`],
    chk:(c,D)=>{ const s=D.V.sv; return [s>=c.n*1.5?'beyond':s>=c.n?'yes':s>=c.n*0.7&&s>0?'close':'no',`${s} varsity saves`]; }},
  {k:'shutouts',pos:['GK'],w:c=>({star:2,good:1.6,solid:0.8}[c.tier]||0), n:c=>({star:[8,10,12],good:[4,5,6],solid:[2,2,3]}[c.tier]).at(hashStr(c.id+'c')%3),
    say:c=>[`Keep ${c.n} clean sheets.`,`${c.n} shutouts. Zero means zero.`],
    chk:(c,D)=>{ const s=D.V.cs; return [s>=c.n*1.5?'beyond':s>=c.n?'yes':s>=c.n*0.6&&s>0?'close':'no',`${s} varsity clean sheet${s===1?'':'s'}`]; }},
  {k:'ovr',w:c=>({star:1.6,good:1.8,solid:1.6,long:1}[c.tier]), n:c=>clamp(Math.round((c.pot-7)/5)*5,55,95),
    say:c=>[`Be a ${c.n} overall by senior year.`,`Get my rating to ${c.n}.`,`${c.n} overall. Then we talk.`],
    chk:(c,D)=>[D.fin>=c.n+5?'beyond':D.fin>=c.n?'yes':D.fin>=c.n-3?'close':'no',`Graduated at ${Math.round(D.fin)} overall`]},
  {k:'allleague',w:c=>({star:2.4,good:2.2,solid:0.8}[c.tier]||0),
    say:c=>['Make All-League.','All-League. At least once.','Get my name on the All-League team.'],
    chk:(c,D)=>{ const n=D.aw.al1+D.aw.al2; return n>=2?['beyond',`All-League ${n} times (${D.alYrs.join(', ')})`]:n===1?['yes',`All-League ${D.aw.al1?'First':'Second'} Team ${D.alYrs[0]}`]:D.V.gp>=30?['close',`${D.V.gp} varsity games, no All-League nod`]:['no','No All-League selection']; }},
  {k:'award',w:c=>c.tier==='star'?2:c.tier==='good'?0.6:0,
    say:c=>{ const a=AWARD_NAME[TC_AWARD[c.pos]]; return [`Win ${a}.`,`${a}. That's the one I want.`]; },
    chk:(c,D)=>{ const k=TC_AWARD[c.pos]; const n=D.awk[k]||0; const any=Object.keys(D.awk).filter(x=>!['al1','al2'].includes(x)); return n>=2||n&&D.awk.mvp?['beyond',`${AWARD_NAME[k]}${n>1?' ×'+n:''}${D.awk.mvp&&k!=='mvp'?' + League MVP':''}`]:n?['yes',`${AWARD_NAME[k]} ${D.awYr[k]||''}`]:any.length?['close',`Won ${AWARD_NAME[any[0]]} instead`]:['no',`No ${AWARD_NAME[k]}`]; }},
  {k:'freshaward',w:c=>c.lvl==='V'||c.o>=56?1.4:0, sealOnly:true,
    say:c=>['Win the Freshman Award. This year.','Freshman of the Year. Starting now.'],
    chk:(c,D)=>D.awYrK[c.seal+':freshman']?(D.aw.al1+D.aw.al2>=1?['beyond','Freshman Award, then All-League']:['yes',`Freshman Award ${c.seal}`]):D.aw.al1+D.aw.al2?['close','Missed it, but made All-League later']:['no','Freshman Award went elsewhere']},
  {k:'state',w:c=>({star:0.8,good:0.3}[c.tier]||0),
    say:c=>['Win State.','Bring a State title to '+c.town+'.','State champions. All four of us.'],
    chk:(c,D)=>{ const n=D.hon['State Champions']||0; return n>=2?['beyond',`${n} State titles`]:n?['yes',`State Champions ${D.honYr['State Champions']}`]:D.hon['State Runners-up']?['close',`State runners-up ${D.honYr['State Runners-up']}`]:D.hon['Regional Champions']?['close',`Regional Champions ${D.honYr['Regional Champions']}`]:['no','No State title']; }},
  {k:'section',w:c=>({star:1,good:1.4,solid:1.6,long:1}[c.tier]),
    say:c=>[`Win the Section ${c.sec} title.`,`Section ${c.sec} champions. Banner in the gym.`,'Hang a Section banner in the gym.'],
    chk:(c,D)=>{ const n=D.hon['Section 5 Champions']||0; return n>=2?['beyond',`Section champions ×${n}`]:n?['yes',`Section champions ${D.honYr['Section 5 Champions']}`]:D.post.gp?['close',`${D.post.gp} postseason game${D.post.gp>1?'s':''}, no banner`]:['no','No Section title']; }},
  {k:'beatriv',w:c=>c.riv?({star:2.2,good:2.2,solid:1}[c.tier]||0):0, tc:true,
    say:c=>[`Beat ${c.rivTown}. Just once.`,`We're beating ${c.rivTown}. I don't care what it takes.`,`Never lose to the ${c.rivMascot}.`].slice(0,c.tier==='star'?3:2),
    chk:(c,D,txt)=>{ const T=D.T; const never=/Never lose/.test(txt); if(!T.rp) return ['no',`Never played ${c.rivTown} on varsity`]; const l=T.rp-(T.rw||0)-(T.rd||0);
      if(never) return [l===0?(T.rw>=2?'beyond':'yes'):l===1?'close':'no',`${T.rw||0}W ${T.rd||0}D ${l}L vs ${c.rivTown}`];
      return [T.rw>=3?'beyond':T.rw>=1?'yes':T.rd?'close':'no',`${T.rw||0}W ${T.rd||0}D ${l}L vs ${c.rivTown}`]; }},
  {k:'rivgoal',pos:['FWD','MID'],w:c=>c.riv&&c.tier!=='long'?1.8:0, tc:true,
    say:c=>[`Score against ${c.rivTown}.`,`Put one past the ${c.rivMascot}.`,`Score on ${c.rivTown} and do my celebration right in front of their fans.`],
    chk:(c,D)=>{ const T=D.T; return T.rg>=3?['beyond',`${T.rg} goals vs ${c.rivTown}`]:T.rg?['yes',`${T.rg} goal${T.rg>1?'s':''} vs ${c.rivTown}`]:T.ra?['close',`Assisted vs ${c.rivTown}, no goal`]:['no',T.rp?`0 goals in ${T.rp} rivalry game${T.rp>1?'s':''}`:`Never faced ${c.rivTown} on varsity`]; }},
  {k:'rivcs',pos:['GK'],w:c=>c.riv&&c.tier!=='long'?2:0, tc:true,
    say:c=>[`Shut out ${c.rivTown}.`,`Clean sheet against the ${c.rivMascot}. Zero.`],
    chk:(c,D)=>{ const T=D.T; return T.rcs>=2?['beyond',`${T.rcs} shutouts vs ${c.rivTown}`]:T.rcs?['yes',`Clean sheet vs ${c.rivTown}`]:T.rp?['close',`${T.rp} rivalry games, no shutout`]:['no',`Never faced ${c.rivTown} on varsity`]; }},
  {k:'hat',pos:['FWD','MID'],w:c=>c.pos==='FWD'?({star:2,good:1.8,solid:0.8}[c.tier]||0):c.tier==='star'?0.8:0,
    say:c=>['Score a varsity hat trick.','Three goals in one game. Hat trick.','Get a hat trick and keep the ball.'],
    chk:(c,D)=>{ const n=D.T.h3||(D.F.hat?1:0); return n>=2?['beyond',`${n} hat tricks`]:n?['yes','Varsity hat trick']:(D.T.b2?['close',`${D.T.b2} brace${D.T.b2>1?'s':''}, no hat trick`]:['no',`Best game: ${D.T.mx||0} goal${D.T.mx===1?'':'s'}`]); }},
  {k:'stfinal',pos:['FWD','MID'],w:c=>c.tier==='star'?0.6:0, tc:true,
    say:c=>['Score in a State final.','Score the goal that wins State.'],
    chk:(c,D,txt)=>{ const T=D.T; const win=/wins State/.test(txt); if(T.sfg) return [T.sfw?(win?'yes':'beyond'):(win?'close':'yes'),`${T.sfg} goal${T.sfg>1?'s':''} in the State final${T.sfw?', and won it':''}`];
      return T.sfp?['close','Played in the State final']:T.stg?['close',`${T.stg} State tournament goal${T.stg>1?'s':''}`]:['no','Never scored at States']; }},
  {k:'latewin',pos:['FWD','MID'],w:c=>c.tier==='long'?0:1.2, tc:true,
    say:c=>['Score a last-minute winner.','Win a game in the last ten minutes. Crowd goes nuts.'],
    chk:(c,D)=>{ const T=D.T; return T.lw>=2?['beyond',`${T.lw} late winners`]:T.lw?['yes','Late winner'+(T.gw>1?`, ${T.gw} winners overall`:'')]:T.gw?['close',`${T.gw} game-winner${T.gw>1?'s':''}, none late`]:['no','No game-winning goals']; }},
  {k:'sosave',pos:['GK'],w:c=>c.tier==='long'?0.3:0.8, tc:true,
    say:c=>['Save a penalty in a shootout.','Shootout. I guess right. We win.'],
    chk:(c,D)=>{ const T=D.T; return T.sos>=3?['beyond',`${T.sos} shootout saves`]:T.sos?['yes',`${T.sos} shootout save${T.sos>1?'s':''}`]:['no','Never saved one in a shootout']; }},
  {k:'sowin',pos:['FWD','MID'],w:c=>c.tier==='long'?0:0.3, tc:true,
    say:c=>['Take the winning kick in a shootout.','Shootout, last kick, me. Top corner.'],
    chk:(c,D)=>{ const T=D.T; return T.sow>=2?['beyond',`${T.sow} winning shootout kicks`]:T.sow?['yes','Scored the winning shootout kick']:T.sog?['close',`Scored ${T.sog} shootout kick${T.sog>1?'s':''}, not the winner`]:['no',T.sop?'Missed in the shootout':'Never took a shootout kick']; }},
  {k:'onegame',w:c=>({solid:0.8,long:3}[c.tier]||0),
    say:c=>['Just start one varsity game.','Make it onto the varsity field. Once.','Play one varsity game so my grandma can see.'],
    chk:(c,D)=>D.V.gp>=30||D.aw.al1+D.aw.al2?['beyond',`${D.V.gp} varsity games${D.aw.al1+D.aw.al2?' · All-League':''}`]:D.V.gp?['yes',`${D.V.gp} varsity game${D.V.gp>1?'s':''}`]:D.JV.gp>=15?['close',`${D.JV.gp} JV games, no varsity call`]:['no','Never reached varsity']},
  {k:'early',w:c=>c.lvl!=='V'&&(c.tier==='star'||c.tier==='good')?1.8:0,
    say:c=>['Make varsity before junior year.','Varsity as a sophomore. Bet.'],
    chk:(c,D)=>D.firstV==null?['no','Never reached varsity']:D.firstV<=c.seal?['beyond',`On varsity as a freshman (${D.firstV})`]:D.firstV<=c.seal+1?['yes',`Varsity as a sophomore (${D.firstV})`]:D.firstV<=c.seal+2?['close',`Varsity as a junior (${D.firstV})`]:['no',`Varsity only as a senior`]},
  {k:'defgoal',pos:['DEF'],w:c=>1.8,
    say:c=>['Score one goal. Just one. I\'m a defender.','Score a goal so the strikers stop talking.','One goal. Then I retire from attacking.'],
    chk:(c,D)=>D.V.g>=4?['beyond',`${D.V.g} goals from defense`]:D.V.g?['yes',`${D.V.g} varsity goal${D.V.g>1?'s':''}`]:D.V.a?['close',`${D.V.a} assist${D.V.a>1?'s':''}, no goal`]:['no','0 goals. Defended, though']},
  {k:'gkgoal',pos:['GK'],w:c=>0.7,
    say:c=>['Score a goal. Yes, I\'m a keeper.','Score from my own box. One time.'],
    chk:(c,D)=>D.V.g?['beyond','Actually did it']:D.V.a?['close','Got an assist with a long punt']:['no','0 goals, as the coaches predicted']},
  {k:'header',w:c=>(c.pos==='FWD'||c.pos==='DEF')&&c.h>=71?1.6:c.pos==='FWD'?0.6:0, tc:true,
    say:c=>['Score a header.','Score with my head. On purpose.'],
    chk:(c,D)=>{ const n=(D.T.ty&&((D.T.ty.header||0)+(D.T.ty.corner||0)))||0; return n>=4?['beyond',`${n} headed goals`]:n?['yes',`${n} headed goal${n>1?'s':''}`]:D.V.g?['close',`${D.V.g} goals, none with his head`]:['no','No headers']; }},
  {k:'fk',pos:['MID','FWD'],w:c=>c.tier==='star'||c.tier==='good'?1.2:0, tc:true,
    say:c=>['Bend one in from a free kick.','Free kick, over the wall, top bins.'],
    chk:(c,D)=>{ const n=(D.T.ty&&D.T.ty.fk)||0; return n>=3?['beyond',`${n} free-kick goals`]:n?['yes','Free-kick goal']:D.T.ty&&D.T.ty.long?['close','Scored from distance, never a free kick']:['no','No free-kick goals']; }},
  {k:'long',pos:['MID','FWD','DEF'],w:c=>c.tier==='long'?0:0.9, tc:true,
    say:c=>['Score from outside the box.','Score from 30 yards. Keeper doesn\'t move.'],
    chk:(c,D)=>{ const n=(D.T.ty&&D.T.ty.long)||0; return n>=3?['beyond',`${n} long-range goals`]:n?['yes','Long-range goal']:D.V.g?['close',`${D.V.g} goals, all from close in`]:['no','No long-range goals']; }},
  {k:'pen',pos:['FWD'],w:c=>c.tier==='long'?0:0.8, tc:true,
    say:c=>['Score a penalty in a real game.','Take a penalty and don\'t look at the keeper.'],
    chk:(c,D)=>{ const n=(D.T.ty&&D.T.ty.pen)||0; return n>=3?['beyond',`${n} penalties scored`]:n?['yes','Scored from the spot']:D.T.sog?['close','Only in shootouts']:['no','Never scored a penalty']; }},
  {k:'nored',w:c=>c.aggr>=58?1.6:0,
    say:c=>['Four years. Zero red cards.','No red cards. Mom said.'],
    chk:(c,D)=>{ const y=D.V.y+D.JV.y, r=D.V.r+D.JV.r; return [r===0?(y<=3?'beyond':'yes'):r===1?'close':'no',`${y} yellow${y===1?'':'s'}, ${r} red${r===1?'':'s'}`]; }},
  {k:'yellows',w:c=>c.aggr>=68?1.4:0,
    say:c=>['Fewer than 10 yellow cards. Coach made me write this.','Stop getting yellow cards. (Coach wrote this one.)'],
    chk:(c,D)=>{ const y=D.V.y+D.JV.y; return [y<=3?'beyond':y<10?'yes':y<14?'close':'no',`${y} career yellow cards`]; }},
  {k:'accuracy',pos:['FWD'],w:c=>c.tier==='long'?0.3:1,
    say:c=>['Put more shots on target than off it.','Hit the target. More than half the time.'],
    chk:(c,D)=>D.sh<10?['no',`Only ${D.sh} varsity shots`]:[D.sot/D.sh>=0.6?'beyond':D.sot/D.sh>=0.5?'yes':D.sot/D.sh>=0.42?'close':'no',`${Math.round(D.sot/D.sh*100)}% on target (${D.sot}/${D.sh})`]},
  {k:'gna',pos:['FWD','MID'],w:c=>c.tier==='long'?0.3:1.1, tc:true,
    say:c=>['Get a goal and an assist in the same game.','Score one, set one up. Same night.'],
    chk:(c,D)=>{ const n=D.T.ga||0; return n>=4?['beyond',`Goal + assist in ${n} games`]:n?['yes',`Goal + assist in ${n} game${n>1?'s':''}`]:D.V.g&&D.V.a?['close','Did both, never on the same night']:['no','Never did both in one game']; }},
  {k:'senior',pos:['FWD','MID'],w:c=>c.tier==='star'||c.tier==='good'?1:0, tc:true,
    say:c=>['Score on Senior Night.','Score on Senior Night with my family in the stands.'],
    chk:(c,D)=>{ const n=D.T.sng||0; return n>=2?['beyond',`${n} goals on Senior Night`]:n?['yes','Scored on Senior Night']:['no','Quiet on Senior Night']; }},
  {k:'games',w:c=>({star:0.8,good:1.4,solid:1}[c.tier]||0), n:c=>({star:[50,60],good:[40,50],solid:[25,30],long:[10,15]}[c.tier]).at(hashStr(c.id+'gp')%2),
    say:c=>[`Play ${c.n} varsity games.`,`${c.n} varsity games. Iron man.`],
    chk:(c,D)=>[D.V.gp>=c.n+15?'beyond':D.V.gp>=c.n?'yes':D.V.gp>=c.n*0.7&&D.V.gp?'close':'no',`${D.V.gp} varsity games`]},
  {k:'wins',w:c=>({star:1,good:1,solid:0.5}[c.tier]||0), tc:true, n:c=>({star:[30,35],good:[20,25],solid:[12,15]}[c.tier]).at(hashStr(c.id+'w')%2),
    say:c=>[`Win ${c.n} varsity games.`,`${c.n} wins. Losing is not my thing.`],
    chk:(c,D)=>{ const w=D.T.w||0; return [w>=c.n*1.5?'beyond':w>=c.n?'yes':w>=c.n*0.7&&w?'close':'no',`${w} varsity wins`]; }},
  {k:'unbeaten',w:c=>c.tier==='star'?0.9:c.tier==='good'?0.5:0,
    say:c=>['Go a whole season unbeaten.','Undefeated season. Not one loss.'],
    chk:(c,D)=>D.bestL==null?['no','Never on varsity']:D.bestL===0?['yes',`Unbeaten in ${D.bestLYr}`]:D.bestL===1?['close',`Just 1 loss in ${D.bestLYr}`]:['no',`Best season: ${D.bestL} losses`]},
  {k:'college',w:c=>c.tier==='good'||c.tier==='solid'?1.6:c.tier==='star'?0.6:0,
    say:c=>['Play college soccer.','Keep playing after high school. College ball.'],
    chk:(c,D)=>/Division I program/.test(D.out)?['beyond',D.out]:/Division|junior college/.test(D.out)?['yes',D.out]:/intramural|amateur/.test(D.out)?['close',D.out]:['no',D.out||'Hung up the cleats']},
  {k:'d1',w:c=>c.tier==='star'?1.6:0,
    say:c=>['Get a D1 offer.','Division I. Full ride.'],
    chk:(c,D)=>/Division I program/.test(D.out)?['yes',D.out]:/Division II/.test(D.out)?['close',D.out]:['no',D.out||'No college offer']},
  {k:'hof',w:c=>c.tier==='star'?0.9:0,
    say:c=>[`Make the ${c.town} Hall of Fame.`,'Get my picture on the Hall of Fame wall.'],
    chk:(c,D)=>D.retired?['beyond','Hall of Fame, number retired']:D.hof?['yes','Inducted into the Hall of Fame']:D.aw.al1?['close','All-League First Team, missed the Hall']:['no','Not inducted']},
  {k:'record',w:c=>c.tier==='long'?0.3:0.8,
    say:c=>['Get my name in the record book.','Break a school record. Any record.'],
    chk:(c,D)=>D.recLeague?['beyond','Holds a league single-game record']:D.recSchool?['yes','In the school record book']:['no','Not in the record book']},
  {k:'post',pos:['FWD','MID'],w:c=>c.tier==='long'?0.2:1,
    say:c=>['Score in the playoffs.','Playoff goal. Big stage, big moment.'],
    chk:(c,D)=>D.post.g>=4?['beyond',`${D.post.g} postseason goals`]:D.post.g?['yes',`${D.post.g} postseason goal${D.post.g>1?'s':''}`]:D.post.gp?['close',`${D.post.gp} postseason games, no goal`]:['no','No postseason minutes']},
  {k:'stay',w:c=>c.tier==='long'?1.4:0.2,
    say:c=>['Don\'t get cut.','Still be on this team senior year.','Make it four years. No quitting.'],
    chk:(c,D)=>D.V.gp>=10?['beyond',`Stayed all four years and played ${D.V.gp} varsity games`]:['yes','Stayed all four years']},
  {k:'improve',w:c=>({star:0.6,good:1,solid:1.4,long:1.6}[c.tier]), n:c=>clamp(Math.round((c.pot-c.o)*0.55/2)*2,6,30),
    say:c=>[`Get ${c.n} points better by senior year.`,`+${c.n} overall. Watch me grow.`,`I'll be ${c.n} points better when you open this.`],
    chk:(c,D)=>{ const g=Math.round(D.fin-c.o); return [g>=c.n+6?'beyond':g>=c.n?'yes':g>=c.n-3?'close':'no',`${g>=0?'+':''}${g} overall since freshman year (${c.o} → ${Math.round(D.fin)})`]; }},
  {k:'jvgoals',pos:['FWD','MID'],w:c=>({solid:1,long:1.8}[c.tier]||0), n:c=>c.pos==='FWD'?tcPick(c.id+'jg',[8,10,12]):tcPick(c.id+'jg',[3,4,5]),
    say:c=>[`Score ${c.n} JV goals.`,`${c.n} JV goals, then varsity.`],
    chk:(c,D)=>{ const g=D.JV.g; return [g>=c.n*1.6?'beyond':g>=c.n?'yes':g>=c.n*0.6&&g?'close':'no',`${g} JV goal${g===1?'':'s'}${D.V.g?`, ${D.V.g} on varsity`:''}`]; }},
  {k:'jvgames',w:c=>c.tier==='long'?1.4:0, n:c=>tcPick(c.id+'jp',[20,25,30]),
    say:c=>[`Play ${c.n} JV games. Every minute counts.`,`${c.n} games for the JV. Then we'll see.`],
    chk:(c,D)=>{ const n=D.JV.gp; return [D.V.gp>=5?'beyond':n>=c.n?'yes':n>=c.n*0.7?'close':'no',`${n} JV games${D.V.gp?`, then ${D.V.gp} on varsity`:''}`]; }},
  {k:'jvsaves',pos:['GK'],w:c=>({solid:0.8,long:1.6}[c.tier]||0), n:c=>tcPick(c.id+'js',[40,60,80]),
    say:c=>[`Make ${c.n} JV saves.`,`${c.n} saves on JV. Nothing gets by.`],
    chk:(c,D)=>{ const n=D.JV.sv; return [n>=c.n*1.5||D.V.sv>=30?'beyond':n>=c.n?'yes':n>=c.n*0.7?'close':'no',`${n} JV saves${D.V.sv?`, ${D.V.sv} on varsity`:''}`]; }},
  {k:'celeb',w:c=>c.tier==='star'||c.tier==='good'?0.7:0.2,
    say:c=>['Get my own signature celebration.','Invent a celebration the whole state copies.'],
    chk:(c,D)=>D.cel>=4?['beyond',`${D.cel-1} signature celebrations unlocked`]:D.cel>=2?['yes','Unlocked a signature celebration']:['no','Still doing the classic']},
];
const TC_BY=Object.fromEntries(TC.map(t=>[t.k,t]));
const TC_PS=[c=>`P.S. Coach, I'm keeping #${c.num}.`, c=>'P.S. Coach, please learn my name.', c=>'P.S. Tell my mom I said hi.', c=>c.mate?`P.S. If I don't, I owe ${c.mate} a pizza.`:'P.S. Pizza after the game?',
  c=>c.mate?`P.S. ${c.mate} is going to say the same thing. Mine counts more.`:'P.S. This counts as a contract.', c=>`P.S. ${c.mascot} forever.`, c=>'P.S. I am not crying, you are.', c=>'P.S. Whoever reads this: hi from freshman year.'];

/* the context a promise is written from: who the freshman is right now */
function tcCtx(C,p,o0){ const me=C.schools[C.userSid]; const rv=C.rivals&&C.rivals.heated?C.schools[C.rivals.heated]:null; const o=o0!=null?o0:ovr(p);
  return {id:p.id, ln:p.ln, fn:p.fn, num:p.num, pos:p.pos, lvl:p.lvl, pot:p.pot, o, tier:tcTier(p.pot), aggr:p.aggr||45, h:p.ah||p.h||70,
    town:me.town, mascot:me.mascot, sec:C.section||5, riv:!!rv, rivTown:rv?rv.town:'', rivMascot:rv?rv.mascot:''}; }

/* seal one class: every freshman gets a different kind of promise, chosen from who he is */
function tcSeal(C,ids,sealYr,back){
  const cls=sealYr+3; const P=ids.slice().sort().map(id=>C.players[id]).filter(Boolean); if(!P.length) return null;
  const r=rngFrom(hashStr(C.seed+':capsule:'+cls)); const order=shuffle(r,P.slice());
  const used=new Set(); const notes=[];
  for(const p of order){ const o0=p.ovr0&&p.ovr0[sealYr]!=null?p.ovr0[sealYr]:ovr(p); const c=tcCtx(C,p,o0); c.seal=sealYr;
    const opts=TC.filter(t=>(!t.pos||t.pos.includes(p.pos))&&!(back&&(t.tc||t.sealOnly))).map(t=>({t,w:t.w(c)||0})).filter(x=>x.w>0);
    let pool=opts.filter(x=>!used.has(x.t.k)); if(!pool.length) pool=opts;
    let tot=pool.reduce((a,x)=>a+x.w,0), x=r()*tot, pick=pool[0];
    for(const q of pool){ x-=q.w; if(x<=0){ pick=q; break; } }
    const T=pick.t; used.add(T.k); if(T.n) c.n=T.n(c);
    const lines=T.say(c); const said=new Set(notes.map(q=>q.txt)); const fresh=lines.filter(l=>!said.has(l)); const txt=(fresh.length?fresh:lines)[Math.floor(r()*(fresh.length||lines.length))];
    const mates=P.filter(q=>q!==p); c.mate=mates.length?mates[Math.floor(r()*mates.length)].fn:'';
    const ps=r()<0.3?TC_PS[Math.floor(r()*TC_PS.length)](c):'';
    notes.push({pid:p.id,fn:p.fn,ln:p.ln,num:p.num,pos:p.pos,lvl:p.lvl,o:Math.round(o0),pot:p.pot,look:lookOf(p),k:T.k,n:c.n==null?null:c.n,txt,ps,tilt:+((r()-0.5)*4).toFixed(2)}); }
  const cap={cls,seal:sealYr,back:!!back,st:'sealed',notes,ctx:{rivTown:'',rivMascot:''}};
  const rv=C.rivals&&C.rivals.heated?C.schools[C.rivals.heated]:null; if(rv) cap.ctx={rivTown:rv.town,rivMascot:rv.mascot};
  (C.capsules||(C.capsules={}))[cls]=cap; return cap;
}
/* make sure every class in the program has a capsule (new careers, older saves, each new fall) */
function tcEnsure(C){ if(!C||!C.userSid||!C.players) return; C.capsules=C.capsules||{};
  const by={}; for(const id in C.players){ const p=C.players[id]; if(p.sid!==C.userSid||p.grade<9||p.grade>12) continue; const cls=C.year+(12-p.grade); (by[cls]||(by[cls]=[])).push(id); }
  /* only classes whose freshman fall happened inside this career: earlier years have no history to judge */
  const start=C.year-((C.seasonNo||1)-1);
  let made=0; for(const cls in by){ if(C.capsules[cls]) continue; const sealYr=+cls-3; const back=sealYr<C.year; if(sealYr<start) continue; const cap=tcSeal(C,by[cls].sort(),sealYr,back); if(cap){ made++; if(!back) cap.needNews=1; } }
  /* the news goes out once the career has a newsroom (a brand-new career seals before it exists) */
  if(Array.isArray(C.news)&&typeof App!=='undefined'&&App.C===C) for(const cap of Object.values(C.capsules)) if(cap.needNews){ delete cap.needNews; try{ addNews(C,'program',`The Class of ${cap.cls} seals its time capsule: ${cap.notes.length} freshman promises, opened on graduation day`,C.userSid); }catch(e){} }
  return made; }

/* ---------- graduation day: check every promise against the real career ---------- */
function tcData(C,p,alum){
  const sum=(lvl,bk)=>{ const t={gp:0,g:0,a:0,sv:0,tk:0,int:0,cl:0,y:0,r:0,cs:0,sh:0,sot:0}; for(const yr in p.st||{}){ const y=p.st[yr][lvl]; if(!y) continue; for(const b of bk){ const q=y[b]; if(!q) continue; for(const k in t) t[k]+=q[k]||0; } } return t; };
  const V=sum('V',['reg','post']), JV=sum('JV',['reg','post','pre']), post=sum('V',['post']);
  const yrs=Object.keys(p.st||{}).map(Number).sort((a,b)=>a-b); const vy=yrs.filter(y=>{ const v=p.st[y].V; return v&&['pre','reg','post'].some(b=>v[b]&&v[b].gp); });
  const hon={}, honYr={}; for(const h of p.honors||[]){ hon[h.label]=(hon[h.label]||0)+1; honYr[h.label]=honYr[h.label]?honYr[h.label]+', '+h.yr:String(h.yr); }
  const aw={al1:0,al2:0}, awk={}, awYr={}, awYrK={}, alYrs=[]; for(const a of p.awards||[]){ if(a.k==='al1'||a.k==='al2'){ aw[a.k]++; alYrs.push(a.yr); } else { awk[a.k]=(awk[a.k]||0)+1; awYr[a.k]=awYr[a.k]?awYr[a.k]+', '+a.yr:String(a.yr); } awYrK[a.yr+':'+a.k]=1; }
  const capList=[]; for(const arc of C.archives||[]){ const R=arc.rosters&&arc.rosters[p.sid]&&arc.rosters[p.sid].V; if(R&&R.caps&&R.caps.includes(p.id)) capList.push(arc.yr); }
  let bestL=null, bestLYr=null; for(const y of vy){ const arc=(C.archives||[]).find(a=>a.yr===y); const row=arc&&arc.stand&&arc.stand.V&&arc.stand.V.find(t=>t.sid===p.sid); if(row&&(bestL==null||row.l<bestL)){ bestL=row.l; bestLYr=y; } }
  const recSchool=Object.values((C.rec.gameSchool||{})[p.sid]||{}).some(L=>L.some(e=>e.pid===p.id)); const recLeague=Object.values(C.rec.game||{}).some(L=>L.some(e=>e.pid===p.id));
  const hofE=(C.hof||[]).find(h=>h.pid===p.id); let cel=1; try{ cel=celebUnlocked(C,p).length; }catch(e){}
  return {V,JV,post,sh:V.sh,sot:V.sot,F:p.feats||{},T:p.tc||{},hon,honYr,aw,awk,awYr,awYrK,alYrs,capList,capYrs:capList.length,firstV:vy.length?vy[0]:null,bestL,bestLYr,recSchool,recLeague,
    hof:!!hofE,retired:!!(hofE&&hofE.retired),cel,fin:alum?alum.ovr:ovr(p),out:alum?alum.outcome:''};
}
function tcJudge(C,cap,src){
  const tally={beyond:0,yes:0,close:0,no:0,gone:0};
  for(const n of cap.notes){ const p=src[n.pid]||C.alumni[n.pid]||C.players[n.pid]; const alum=C.alumni[n.pid];
    if(!p){ n.st='gone'; n.ev='Left the program'; tally.gone++; continue; }
    if(alum&&alum.gradYr<cap.cls&&!src[n.pid]){ n.st='gone'; n.ev=alum.outcome||'Left the program'; tally.gone++; continue; }
    if(p.sid!==C.userSid){ n.st='gone'; n.ev='Transferred'; tally.gone++; continue; }
    const T=TC_BY[n.k]; const c=Object.assign(tcCtx(C,p,n.o),{n:n.n,seal:cap.seal,rivTown:cap.ctx.rivTown||'their rival',rivMascot:cap.ctx.rivMascot||'rivals'});
    let res=['no','']; try{ res=T.chk(c,tcData(C,p,alum),n.txt); }catch(e){ console.warn('capsule check',n.k,e); }
    n.st=res[0]; n.ev=res[1]; tally[n.st]++; }
  cap.tally=tally; cap.st='ready'; return cap; }
const _rollTC=rollover;
rollover=function(C){ const pre=C&&C.phase==='offseason'&&!(C.rolled&&C.rolled[C.year]); const yr=C.year; const src={};
  if(pre){ try{ tcEnsure(C); for(const id in C.players){ const p=C.players[id]; if(p.sid===C.userSid&&p.grade>=12) src[id]=p; } }catch(e){} }
  const out=_rollTC.apply(this,arguments);
  if(pre&&out&&out.ok){ try{ const cap=C.capsules&&C.capsules[yr]; if(cap&&cap.st==='sealed'){ tcJudge(C,cap,src); addNews(C,'program',`Graduation day: the Class of ${yr} time capsule is ready to open`,C.userSid); } tcEnsure(C); }catch(e){ console.warn('capsule open',e); } }
  return out; };
const _seasonTC=seasonStart; seasonStart=function(C){ const out=_seasonTC.apply(this,arguments); try{ tcEnsure(C); }catch(e){} return out; };
const _migrateTC=migrate; migrate=function(C){ const out=_migrateTC.apply(this,arguments); try{ if(out) tcEnsure(out); }catch(e){} return out; };

/* ---------- UI ---------- */
NAV.splice(NAV.findIndex(n=>n[0]==='history')+1,0,['capsule','Time Capsule']);
NAV_ICON.capsule='capsule'; TITLES.capsule='Time Capsule';
ICON.capsule='<rect x="6" y="7" width="12" height="15" rx="3"/><path d="M5 7h14M9 3h6v4H9zM6 12h12M6 17h12"/>';
function tcReady(C){ return Object.values(C.capsules||{}).filter(c=>c.st==='ready').sort((a,b)=>a.cls-b.cls)[0]||null; }
function tcFace(n,size){ return portraitSVG({id:n.pid,sid:App.C.userSid,grade:9,look:n.look},size); }
function tcNote(n,i,o={}){ const S=n.st&&!o.hide?TC_STAMP[n.st]:null;
  return `<article class="tcx-note ${o.anim?'anim':''} ${n.st==='gone'?'gone':''}" style="--tilt:${n.tilt||0}deg;--d:${(i*0.42).toFixed(2)}s" ${o.nolink?'':`data-a="openPlayer" data-id="${n.pid}"`}>
    <header><span class="tcx-face">${tcFace(n,48)}</span><div><b>${esc(n.fn)} ${esc(n.ln)}</b><small>#${n.num} · ${n.pos} · Freshman, fall ${o.seal}</small></div></header>
    <p class="tcx-txt">“${esc(n.txt)}”</p>${n.ps?`<p class="tcx-ps">${esc(n.ps)}</p>`:''}
    ${S?`<footer>${esc(n.ev||'')}</footer><span class="tcx-stamp ${n.st}" style="--sc:${S[1]}">${S[0]}</span>`:''}</article>`; }
function tcCan(cls,open,col){ return `<svg class="tcx-can ${open?'open':''}" viewBox="0 0 300 420" aria-hidden="true"><defs><linearGradient id="tcg${cls}" x1="0" x2="1"><stop offset="0" stop-color="#6d7783"/><stop offset=".45" stop-color="#dfe6ee"/><stop offset="1" stop-color="#525b66"/></linearGradient></defs>
  <ellipse cx="150" cy="404" rx="120" ry="12" fill="rgba(0,0,0,.4)"/><rect x="50" y="130" width="200" height="270" rx="22" fill="url(#tcg${cls})"/><rect x="50" y="200" width="200" height="14" fill="rgba(0,0,0,.18)"/><rect x="50" y="330" width="200" height="14" fill="rgba(0,0,0,.18)"/>
  <g class="tcx-lid"><rect x="40" y="104" width="220" height="40" rx="14" fill="url(#tcg${cls})"/></g>
  <rect x="88" y="236" width="124" height="70" rx="8" fill="${col}"/><text x="150" y="264" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-weight="900" font-size="15">CLASS OF</text><text x="150" y="292" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-weight="900" font-size="24">${cls}</text>
  ${open?[0,1,2,3].map(i=>`<rect x="${92+i*24}" y="${60-i*14}" width="44" height="64" rx="3" fill="#f6efdf" stroke="#c9bb9c" transform="rotate(${-20+i*12} ${114+i*24} ${92-i*14})"/>`).join(''):''}</svg>`; }
function tcTallyHTML(cap){ const t=cap.tally||{}; return `<div class="tcx-tally"><span class="eyebrow">Class of ${cap.cls} · results</span><div class="tcx-tally-row">${TC_ORDER.filter(k=>t[k]).map(k=>`<span class="tcx-chip" style="--sc:${TC_STAMP[k][1]}"><b>${t[k]}</b> ${TC_STAMP[k][0].replace('★ ','')}</span>`).join('')}</div></div>`; }
VIEWS.capsule=()=>{ const C=App.C; tcEnsure(C); const me=Sx(C.userSid); const all=Object.values(C.capsules||{}).sort((a,b)=>a.cls-b.cls);
  const ready=tcReady(C); const opened=all.filter(c=>c.st==='open'); const sealed=all.filter(c=>c.st==='sealed');
  const pick=App.params.cls?C.capsules[App.params.cls]:null; const show=pick&&pick.st==='open'?pick:opened[opened.length-1]||null; const peek=App.params.peek?C.capsules[App.params.peek]:null;
  const head=`<div class="tcx-head"><div><span class="eyebrow">Every freshman class · opened on graduation day</span><h2>The Time Capsule</h2><p>Each fall, every freshman writes one promise for senior year. Four seasons later the capsule is opened and every note is checked against what really happened.</p></div></div>`;
  let main='';
  if(ready) main=`<section class="tcx-stage"><div class="tcx-can-wrap">${tcCan(ready.cls,false,me.c1)}</div><div class="tcx-ready"><span class="eyebrow">Graduation day · ${ready.cls}</span><h3>The Class of ${ready.cls} capsule is ready</h3><p>${ready.notes.length} promises sealed in the fall of ${ready.seal}${ready.back?' (rescued from the equipment room)':''}. Time to find out who kept their word.</p><button class="btn pri big" data-a="tcOpen" data-cls="${ready.cls}">✦ Open the capsule</button></div></section>`;
  else if(show) main=`<section class="tcx-stage open"><div class="tcx-can-wrap">${tcCan(show.cls,true,me.c1)}${tcTallyHTML(show)}</div><div class="tcx-notes">${show.notes.slice().sort((a,b)=>TC_ORDER.indexOf(a.st)-TC_ORDER.indexOf(b.st)).map((n,i)=>tcNote(n,i,{seal:show.seal,anim:App.params.reveal==show.cls})).join('')}</div></section>`;
  else main=`<section class="tcx-stage empty"><div class="tcx-can-wrap">${tcCan(sealed[0]?sealed[0].cls:C.year+3,false,me.c1)}</div><div class="tcx-ready"><span class="eyebrow">Nothing to open yet</span><h3>${sealed.length?`The Class of ${sealed[0].cls} opens first`:'No capsules yet'}</h3><p>${sealed.length?`Its ${sealed[0].notes.length} notes stay sealed until that class graduates. ${sealed[0].cls-C.year<=0?'That happens this offseason.':`That's ${sealed[0].cls-C.year} season${sealed[0].cls-C.year>1?'s':''} away.`}`:'Your freshmen will write their promises when the next season starts.'}</p></div></section>`;
  const shelf=`<section class="tcx-shelf"><span class="eyebrow">On the Office shelf</span><div class="tcx-shelf-row">${all.map(c=>{ const left=c.cls-C.year; const lab=c.st==='open'?'Opened':c.st==='ready'?'Ready to open':left<=0?'Opens this offseason':`Opens in ${left} season${left>1?'s':''}`;
      return `<div class="tcx-jar ${c.st} ${show&&show.cls===c.cls?'on':''}">${tcCan(c.cls,c.st==='open',me.c1)}<div><b>Class of ${c.cls} ${c.st==='sealed'?'🔒':''}</b><small>${lab} · ${c.notes.length} notes</small>
        ${c.st==='open'?`<button class="btn sm" data-a="setParam" data-k="cls" data-v="${c.cls}">View</button>`:c.st==='sealed'?`<button class="btn sm ghost" data-a="tcPeek" data-cls="${c.cls}">${peek&&peek.cls===c.cls?'Hide':'Peek'}</button>`:''}</div></div>`; }).join('')||'<div class="muted small">No capsules yet.</div>'}</div>
    <div class="tcx-shelf-board"></div></section>`;
  const peekHTML=peek&&peek.st==='sealed'?`<section class="tcx-peek"><div class="row"><span class="eyebrow">Peeking into the Class of ${peek.cls} · no results until graduation</span><span class="grow"></span><button class="btn sm ghost" data-a="tcPeek" data-cls="${peek.cls}">Close</button></div><div class="tcx-notes">${peek.notes.map((n,i)=>tcNote(n,i,{seal:peek.seal,hide:true})).join('')}</div></section>`:'';
  return `<div class="tcx-room">${head}${main}${peekHTML}${shelf}</div>`; };
A.tcOpen=el=>{ const C=App.C; const cap=C.capsules[el.dataset.cls]; if(!cap||cap.st!=='ready') return; cap.st='open'; cap.openedAt=C.year; queueSave();
  App.route='capsule'; App.params={cls:cap.cls,reveal:cap.cls}; render();
  try{ Sound.ui&&Sound.ui('swoosh'); }catch(e){}
  cap.notes.slice().sort((a,b)=>TC_ORDER.indexOf(a.st)-TC_ORDER.indexOf(b.st)).forEach((n,i)=>setTimeout(()=>{ try{ if(App.route!=='capsule') return; if(n.st==='beyond'&&Sound.unlock) Sound.unlock(); else if(Sound.tackle) Sound.tackle(0.5); }catch(e){} },(i*0.42+0.75)*1000));
  setTimeout(()=>{ if(App.params&&App.params.reveal==cap.cls) App.params.reveal=null; },cap.notes.length*420+1600); };
A.tcPeek=el=>{ const v=+el.dataset.cls; App.params.peek=App.params.peek===v?null:v; render(); };
const _officeTC=VIEWS.office; VIEWS.office=()=>{ const C=App.C; try{ tcEnsure(C); }catch(e){} const r=tcReady(C); const me=Sx(C.userSid);
  const b=r?`<section class="tcx-banner" style="--c1:${me.c1}"><div class="tcx-bn-can">${tcCan(r.cls,false,me.c1)}</div><div class="grow"><span class="eyebrow">Graduation day</span><h3>Open the Class of ${r.cls} time capsule</h3><p class="small">${r.notes.length} promises written in the fall of ${r.seal}. Find out who kept their word.</p></div><button class="btn pri" data-a="go" data-r="capsule">✦ Open it</button></section>`:'';
  return b+_officeTC(); };
const _navBadgesTC=navBadges; navBadges=function(C){ const b=_navBadgesTC(C); if(tcReady(C)) b.capsule='1'; return b; };
/* the player profile shows his note: sealed until graduation, then with its stamp */
const _mPlayerTC=MODALS.player; MODALS.player=m=>{ const h=_mPlayerTC(m); if((m.tab||'overview')!=='overview') return h; const C=App.C;
  const cap=Object.values(C.capsules||{}).find(c=>c.notes.some(n=>n.pid===m.id)); if(!cap) return h; const n=cap.notes.find(x=>x.pid===m.id);
  const card=`<div class="tcx-mini"><span class="eyebrow">Time capsule · Class of ${cap.cls}</span>${cap.st==='open'?tcNote(n,0,{seal:cap.seal,nolink:true}):`<div class="tcx-mini-lock">🔒 ${cap.st==='ready'?'Graduated: the capsule is ready to open in the Time Capsule room.':`His freshman promise is sealed until graduation day ${cap.cls}.`}</div>`}</div>`;
  const i=h.lastIndexOf('<div class="mfoot">'); return i<0?h+card:h.slice(0,i)+card+h.slice(i); };
