'use strict';
/* ====================== player level / XP ====================== */
const RANKS=['Novice','Apprentice','Puzzler','Thinker','Solver','Strategist','Tactician','Mastermind','Sage','Grandmaster','Legend','Mythic','Cosmic'];
const rankOf=L=>RANKS[Math.min(RANKS.length-1,Math.floor((L-1)/3))];
function addXP(n){
  const from={lv:S.plv,xp:S.xp},ups=[];S.xp+=n;
  while(S.xp>=xpNeed(S.plv)){S.xp-=xpNeed(S.plv);S.plv++;const r={lv:S.plv,coins:levelUpReward(S.plv),skip:S.plv%ECON.lvlup.skipEvery===0};S.coins+=r.coins;earned(r.coins);if(r.skip)S.skips++;ups.push(r)}
  return{from,ups};
}
/* coins from any source (not purchases) count towards the "Collect N coins" quest and the lifetime stat */
const earned=n=>{if(n>0){S.stats.coinsEarned+=n;questEvent('coins',n)}};
function xpBanner(res){for(const u of res.ups){banner('🆙','LEVEL UP!',`Player level ${u.lv} · ${rankOf(u.lv)}`,`+${u.coins} coins${u.skip?' · +1 skip':''}`);sfx.levelup()}}

/* ====================== events → stats, quests, trophies ====================== */
function emit(ev,d){
  const st=S.stats;
  if(ev==='win'){st.wins++;if(d.stars===3)st.perfect++;st.types[d.type]=(st.types[d.type]||0)+1;if(!d.hinted)st.nohint++;st.bestStreak=Math.max(st.bestStreak,S.streak);if(d.daily)st.daily++}
  if(ev==='combo')st.maxCombo=Math.max(st.maxCombo,d);
  if(ev==='spin')st.spins++;
  if(ev==='coins')st.coinsEarned+=d;
  if(ev==='hint')st.hints++;
  questEvent(ev,d);checkAch();save();
}

/* ---------- daily quests ---------- */
const QT={
  win:{ic:'🧩',txt:n=>`Clear ${n} levels`,ns:[3,4,5],ev:'win'},
  three:{ic:'⭐',txt:n=>`Get 3 stars on ${n} levels`,ns:[2,3],ev:'win',ok:d=>d.stars===3},
  type:{ic:'🎯',txt:(n,p)=>`Solve ${n} ${INFO[p].name} puzzle${n>1?'s':''}`,ns:[1,2],ev:'win',ok:(d,p)=>d.type===p,param:true},
  nohint:{ic:'🦉',txt:n=>`Clear ${n} levels without hints`,ns:[2,3],ev:'win',ok:d=>!d.hinted},
  combo:{ic:'⚡',txt:n=>`Reach a ×${n} combo`,ns:[4,5,6],ev:'combo',max:true},
  coins:{ic:'🪙',txt:n=>`Collect ${n} coins`,ns:[80,120,150],ev:'coins',add:true},
  daily:{ic:'📅',txt:()=>'Beat the Daily Challenge',ns:[1],ev:'daily'},
  spin:{ic:'🎡',txt:()=>'Spin the Lucky Wheel',ns:[1],ev:'spin'}
};
function ensureQuests(){
  const d=today();if(S.quests.day===d&&S.quests.list.length)return;
  const R=rngOf(hashSeed(d,4242)),keys=shuffle(Object.keys(QT),R).slice(0,3);
  S.quests={day:d,bonus:false,list:keys.map((k,i)=>{const q=QT[k];return{k,n:R.pick(q.ns),p:q.param?R.pick(TYPES):null,v:0,claimed:false,r:ECON.quest.rewards[i]}})};
  save();
}
function questEvent(ev,d){
  ensureQuests();
  for(const q of S.quests.list){
    const T=QT[q.k];if(T.ev!==ev||q.claimed||q.v>=q.n)continue;if(T.ok&&!T.ok(d,q.p))continue;
    const b=q.v;q.v=T.max?Math.max(q.v,Math.min(q.n,d)):T.add?Math.min(q.n,q.v+d):q.v+1;
    if(q.v>=q.n&&b<q.n){banner(T.ic,'QUEST COMPLETE',T.txt(q.n,q.p),'Claim it in Quests 📜');sfx.unlock()}
  }
}
const allQuestsClaimed=()=>S.quests.list.every(q=>q.claimed);
function questsReady(){ensureQuests();return S.quests.list.filter(q=>q.v>=q.n&&!q.claimed).length+(allQuestsClaimed()&&!S.quests.bonus?1:0)}
function showQuests(still,hit){
  ensureQuests();const L=S.quests.list,allC=allQuestsClaimed();
  const nDone=L.filter(q=>q.v>=q.n).length;
  openModal(`<h2>Daily Quests</h2><p class="qtimer">⏱ Fresh quests in <b>${fmtTime(untilMidnight())}</b></p><div class="qlist">${L.map((q,i)=>{const T=QT[q.k],done=q.v>=q.n;
    return`<div class="quest ${q.claimed?'claimed':done?'ready':''}" style="--i:${i}"><div class="qi">${T.ic}</div><div class="qt"><b>${T.txt(q.n,q.p)}</b><div class="qbar"><div class="bar"><div style="width:${q.v/q.n*100}%"></div></div><em>${q.v}/${q.n}</em></div><div class="rchips"><span class="rc"><i class="coin"></i>${q.r}</span><span class="rc xp">+${ECON.quest.xp} XP</span></div></div>${q.claimed?'<div class="qdone">✓</div>':done?`<button class="btn sm" data-q="${i}">Claim</button>`:''}</div>`}).join('')}
    <div class="quest bonusq ${allC?(S.quests.bonus?'claimed':'ready'):''}" style="--i:3"><div class="qi">🎁</div><div class="qt"><b>Finish all 3 quests</b><div class="qpips">${L.map((q,i)=>`<i class="${i<nDone?'on':''}"></i>`).join('')}</div><div class="rchips"><span class="rc"><i class="coin"></i>${ECON.quest.bonus}</span><span class="rc">💡 ${ECON.quest.bonusHints}</span></div></div>${allC&&!S.quests.bonus?'<button class="btn sm pink" data-q="bonus">Open!</button>':S.quests.bonus?'<div class="qdone">✓</div>':'<div class="qlock">🔒</div>'}</div></div>`,
    [{label:'Close',cls:'sec',fn:()=>{closeModal();renderHome()}}],{wide:true,still,icon:'📜',cls:'quests',dismiss:()=>{closeModal();renderHome()}});
  /* a just-claimed quest pops and its pip on the "finish all 3" row pulses */
  if(hit!=null){
    const rows=$$('#modal .quest'),row=hit==='bonus'?rows[rows.length-1]:rows[hit],pip=hit==='bonus'?null:$$('#modal .qpips i')[hit];
    if(row)wa(row,[{transform:'scale(1)'},{transform:'scale(1.045)',offset:.4},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.3,1.7,.5,1)'});
    if(pip)wa(pip,[{transform:'scale(1)'},{transform:'scale(1.9)',offset:.4},{transform:'scale(1)'}],{duration:520,delay:200,easing:'cubic-bezier(.3,1.7,.5,1)'});
  }
  $$('#modal [data-q]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.q;let coins;
    if(k==='bonus'){S.quests.bonus=true;coins=ECON.quest.bonus;S.hints+=ECON.quest.bonusHints}
    else{const q=L[+k];if(q.claimed)return;q.claimed=true;coins=q.r;S.stats.quests++;xpBanner(addXP(ECON.quest.xp))}
    S.coins+=coins;earned(coins);sfx.chest();const[x,y]=centerOf(b);burst(x,y,'#ffd166',30,1.2);flyCoins(b,8);save();checkAch();showQuests(true,k==='bonus'?'bonus':+k);
  });
}

/* ---------- trophies ---------- */
const st=()=>S.stats;
const ACH=[
  {id:'w1',ic:'🎉',name:'First Steps',desc:'Clear your first level',t:()=>st().wins>=1,r:10},
  {id:'w10',ic:'🧩',name:'Warming Up',desc:'Clear 10 levels',t:()=>st().wins>=10,r:25},
  {id:'w50',ic:'🧠',name:'Puzzle Pro',desc:'Clear 50 levels',t:()=>st().wins>=50,r:60},
  {id:'w100',ic:'💯',name:'Centurion',desc:'Clear 100 levels',t:()=>st().wins>=100,r:120},
  {id:'w250',ic:'👑',name:'Puzzle Royalty',desc:'Clear 250 levels',t:()=>st().wins>=250,r:300},
  {id:'s25',ic:'⭐',name:'Star Struck',desc:'Collect 25 stars',t:()=>totalStars()>=25,r:20},
  {id:'s100',ic:'🌟',name:'Constellation',desc:'Collect 100 stars',t:()=>totalStars()>=100,r:60},
  {id:'s300',ic:'🌌',name:'Galaxy Brain',desc:'Collect 300 stars',t:()=>totalStars()>=300,r:180},
  {id:'p10',ic:'✨',name:'Perfectionist',desc:'Get 3 stars 10 times',t:()=>st().perfect>=10,r:30},
  {id:'p50',ic:'💎',name:'Flawless',desc:'Get 3 stars 50 times',t:()=>st().perfect>=50,r:90},
  {id:'k5',ic:'🔥',name:'On Fire',desc:'Reach a 3-star streak of 5',t:()=>st().bestStreak>=5,r:35},
  {id:'k12',ic:'☄️',name:'Unstoppable',desc:'Reach a 3-star streak of 12',t:()=>st().bestStreak>=12,r:120},
  {id:'all',ic:'🎲',name:'Jack of All Trades',desc:'Solve every puzzle type',t:()=>TYPES.every(x=>st().types[x]),r:30},
  {id:'spec',ic:'🎓',name:'Specialist',desc:'Solve 15 puzzles of one type',t:()=>Object.values(st().types).some(v=>v>=15),r:50},
  {id:'c6',ic:'⚡',name:'Combo Starter',desc:'Reach a ×6 combo',t:()=>st().maxCombo>=6,r:25},
  {id:'c12',ic:'🌀',name:'Combo King',desc:'Reach a ×12 combo',t:()=>st().maxCombo>=12,r:70},
  {id:'d1',ic:'📅',name:'Daily Habit',desc:'Beat a Daily Challenge',t:()=>st().daily>=1,r:20},
  {id:'d7',ic:'🗓️',name:'Devoted',desc:'Beat 7 Daily Challenges',t:()=>st().daily>=7,r:90},
  {id:'l7',ic:'🎁',name:'Regular',desc:'Log in 7 days in a row',t:()=>st().bestLogin>=7,r:60},
  {id:'sp5',ic:'🎡',name:'Lucky Duck',desc:'Spin the wheel 5 times',t:()=>st().spins>=5,r:25},
  {id:'nh20',ic:'🦉',name:'Wise Owl',desc:'Clear 20 levels without hints',t:()=>st().nohint>=20,r:50},
  {id:'q10',ic:'📜',name:'Quest Hunter',desc:'Claim 10 quest rewards',t:()=>st().quests>=10,r:50},
  {id:'th',ic:'🎨',name:'Stylish',desc:'Buy a colour theme',t:()=>S.owned.length>=2,r:20},
  {id:'th4',ic:'🖼️',name:'Collector',desc:'Own 4 colour themes',t:()=>S.owned.length>=4,r:60},
  {id:'pl10',ic:'🏅',name:'Rising Star',desc:'Reach player level 10',t:()=>S.plv>=10,r:90}
];
/* [current, target] for every trophy, shown as a progress bar while it is locked */
const ACH_PROG={
  w1:()=>[st().wins,1],w10:()=>[st().wins,10],w50:()=>[st().wins,50],w100:()=>[st().wins,100],w250:()=>[st().wins,250],
  s25:()=>[totalStars(),25],s100:()=>[totalStars(),100],s300:()=>[totalStars(),300],
  p10:()=>[st().perfect,10],p50:()=>[st().perfect,50],k5:()=>[st().bestStreak,5],k12:()=>[st().bestStreak,12],
  all:()=>[TYPES.filter(x=>st().types[x]).length,TYPES.length],spec:()=>[Math.max(0,...Object.values(st().types)),15],
  c6:()=>[st().maxCombo,6],c12:()=>[st().maxCombo,12],d1:()=>[st().daily,1],d7:()=>[st().daily,7],l7:()=>[st().bestLogin,7],
  sp5:()=>[st().spins,5],nh20:()=>[st().nohint,20],q10:()=>[st().quests,10],th:()=>[S.owned.length-1,1],th4:()=>[S.owned.length,4],pl10:()=>[S.plv,10]
};
function checkAch(){
  let n=0,sum=0;
  for(const a of ACH){if(S.ach[a.id]||!a.t())continue;S.ach[a.id]=Date.now();S.coins+=a.r;sum+=a.r;if(n++<3)banner(a.ic,'TROPHY UNLOCKED',a.name,`${a.desc} · +${a.r} coins`)}
  if(n){earned(sum);sfx.unlock();save();refreshCoins()}
}
const achCount=()=>ACH.filter(a=>S.ach[a.id]).length;
/* trophies by kind, for the tabs */
const ACH_CAT=id=>/^w\d/.test(id)?'levels':/^s\d/.test(id)?'stars':/^(p|k|c|nh)\d|^spec/.test(id)?'skill':/^(d|l|sp|q)\d/.test(id)?'daily':'collect';
const ACH_TABS=[['all','All'],['levels','🧩 Levels'],['stars','⭐ Stars'],['skill','🔥 Skill'],['daily','📅 Daily'],['collect','🎨 Collect']];
function showTrophies(){
  const n=achCount(),pct=n/ACH.length,earnedC=ACH.filter(a=>S.ach[a.id]).reduce((t,a)=>t+a.r,0),now=Date.now();
  const prog=a=>{const f=ACH_PROG[a.id];if(!f)return 0;const[v,m]=f();return Math.min(1,v/m)};
  /* unlocked first (newest first), then the locked ones closest to done */
  const list=ACH.map((a,i)=>({a,i,got:S.ach[a.id],p:prog(a)})).sort((x,y)=>(!!y.got-!!x.got)||(x.got&&y.got?y.got-x.got:y.p-x.p));
  const next=list.find(x=>!x.got);
  const card=({a,got,p},k)=>{const tier=a.r>=150?'gold':a.r>=60?'silver':'bronze',isNew=got&&now-got<864e5;
    const pr=got||!ACH_PROG[a.id]?'':(([v,m])=>`<div class="apw"><div class="apb"><i style="width:${p*100}%"></i></div><em>${Math.min(v,m)}/${m}</em></div>`)(ACH_PROG[a.id]());
    return`<div class="ach ${got?'got':''} ${tier}" data-c="${ACH_CAT(a.id)}" style="--i:${k}">${isNew?'<span class="anew">NEW</span>':''}<div class="am"><i>${a.ic}</i>${got?'':'<em>🔒</em>'}</div><b>${a.name}</b><small>${a.desc}</small>${pr}<span class="rc chip"><i class="coin"></i>${a.r}</span></div>`};
  openModal(`<div class="trhead" style="--p:${pct}"><div class="trcup"><span>🏆</span></div><div class="trtx"><b>${n}<small> / ${ACH.length}</small></b><span>trophies unlocked</span><em><i class="coin"></i>${earnedC} coins earned</em></div></div>
    ${next?`<div class="trnext"><small>CLOSEST TO UNLOCK</small><div class="trnc"><i>${next.a.ic}</i><div><b>${next.a.name}</b><span>${next.a.desc}</span>${ACH_PROG[next.a.id]?`<div class="apb"><i style="width:${next.p*100}%"></i></div>`:''}</div><span class="rc chip"><i class="coin"></i>${next.a.r}</span></div></div>`:'<div class="trnext all">🎉 Every trophy unlocked!</div>'}
    <div class="trtabs">${ACH_TABS.map(([k,l],i)=>`<button class="trt ${i?'':'on'}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="achgrid" data-f="all">${list.map(card).join('')}</div>`,
    [{label:'Close',cls:'sec',fn:()=>{closeModal();renderHome()}}],{wide:true,cls:'trophies',dismiss:()=>{closeModal();renderHome()}});
  $$('#modal .trt').forEach(b=>b.onclick=()=>{sfx.tick(1.2);$$('#modal .trt').forEach(x=>x.classList.toggle('on',x===b));const g=$('#modal .achgrid');g.dataset.f=b.dataset.f;
    g.querySelectorAll('.ach').forEach(e=>{const show=b.dataset.f==='all'||e.dataset.c===b.dataset.f;e.hidden=!show})});
}
function showProfile(){
  const s=S.stats;
  const sd=(ic,v,l)=>`<div><i>${ic}</i><b>${v}</b><small>${l}</small></div>`;
  openModal(`<div class="kicker">Player level ${S.plv}</div><h2>${rankOf(S.plv)}</h2>
    <div class="xpline prof"><div class="bar"><div style="width:${S.xp/xpNeed(S.plv)*100}%"></div></div><span class="xpg">${S.xp} / ${xpNeed(S.plv)} XP</span></div>
    <div class="stats">${sd('🧩',s.wins,'Levels cleared')}${sd('⭐',totalStars(),'Stars')}${sd('✨',s.perfect,'Perfect clears')}${sd('🔥',s.bestStreak,'Best streak')}
    ${sd('⚡','×'+s.maxCombo,'Best combo')}${sd('📅',s.daily,'Dailies')}${sd('🏆',achCount()+'/'+ACH.length,'Trophies')}${sd('🎁',S.login.streak,'Login streak')}</div>
    <p class="nextrank">Next rank: <b>${RANKS[Math.min(RANKS.length-1,Math.floor((S.plv-1)/3)+1)]}</b> at level ${(Math.floor((S.plv-1)/3)+1)*3+1}</p>`,
    [{label:'Close',cls:'sec',fn:closeModal}],{icon:`<b class="plv">${S.plv}</b>`,cls:'profcard',dismiss:closeModal});
}

/* ---------- daily login calendar ---------- */
const LOGIN=ECON.login;
const loginDue=()=>S.login.last!==today();
function showLogin(){
  const d=today(),streak=S.login.last===d-1?S.login.streak:0,idx=streak%7;
  const txt=r=>[r.c?`🪙${r.c}`:'',r.h?`💡${r.h}`:'',r.s?`⏭️${r.s}`:''].filter(Boolean).join(' ');
  openModal(`<h2>Daily Reward</h2><p>${streak?`🔥 <b>${streak}-day streak!</b> Come back tomorrow for more.`:'Log in every day for bigger rewards!'}</p>
    <div class="days">${LOGIN.map((r,i)=>`<div class="day ${i<idx?'got':i===idx?'now':''} ${i===6?'big':''}" style="--i:${i}"><small>Day ${i+1}</small><i>${r.ic}</i><b>${txt(r)}</b></div>`).join('')}</div>`,
    [{label:'Claim!',cls:'big',fn:b=>{
      if(S.login.last===d){closeModal();return}   // already claimed (a second tap, a key repeat, or another tab)
      const r=LOGIN[idx];S.login={last:d,streak:streak+1};S.stats.bestLogin=Math.max(S.stats.bestLogin,streak+1);
      S.coins+=r.c||0;earned(r.c||0);S.hints+=r.h||0;S.skips+=r.s||0;save();
      sfx.chest();const now_=$('.day.now');if(now_){const[x,y]=centerOf(now_);burst(x,y,'#ffd166',40,1.4)}flyCoins(now_,10);
      if(now_){
        const nxt=now_.nextElementSibling;
        wa(now_,[{transform:'rotateY(0)'},{transform:'rotateY(90deg)',offset:.5},{transform:'rotateY(0)'}],{duration:420,easing:'ease-in-out'});
        setTimeout(()=>{now_.classList.remove('now');now_.classList.add('got','dayclaim')},210);
        if(nxt){nxt.classList.add('tomorrow');const sm=nxt.querySelector('small');if(sm)sm.textContent='Tomorrow'}
      }
      setTimeout(()=>{closeModal();checkAch();renderHome()},1100);
    }}],{icon:'🎁',cls:'login'});
}

/* ---------- daily challenge ---------- */
const dailyDone=()=>S.dchal.last===today();
function dailyCfg(){
  const d=today();
  if(S.dchal.tday!==d){S.dchal.tday=d;S.dchal.tier=clamp(tierFor(S.unlocked)+2,2,14);save()}
  return{type:TYPES[hashSeed(d,5)%TYPES.length],tier:S.dchal.tier,seed:hashSeed(d,777)};
}
function startDaily(){if(dailyDone()){toast(`✅ Done for today! New challenge in ${fmtTime(untilMidnight())}`);sfx.bad();return}playLevel(0,{daily:true},$('#tDaily'))}

/* ---------- lucky spin ---------- */
const WHEEL=ECON.wheel,SPIN_CD=ECON.spin.cd,SPIN_COST=ECON.spin.cost;
const spinReady=()=>Date.now()>=S.spinAt;
let wheelAng=0,spinning=false;
/* the wheel is one SVG: shaded segments, gold separators with studs, a gold rim with 24 chasing bulbs and the prizes */
function wheelSVG(){
  const n=WHEEL.length,seg=360/n,P=(r,a)=>[+(r*Math.sin(a*Math.PI/180)).toFixed(2),+(-r*Math.cos(a*Math.PI/180)).toFixed(2)];
  const mix=(c,o,t)=>{const h=x=>[1,3,5].map(k=>parseInt(x.slice(k,k+2),16)),A=h(c),B=h(o);return'#'+A.map((v,k)=>Math.round(v+(B[k]-v)*t).toString(16).padStart(2,'0')).join('')};
  const defs=WHEEL.map((w,i)=>`<radialGradient id="wg${i}" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse"><stop offset=".2" stop-color="${mix(w.col,'#ffffff',.5)}"/><stop offset=".72" stop-color="${w.col}"/><stop offset="1" stop-color="${mix(w.col,'#000000',.32)}"/></radialGradient>`).join('');
  const segs=WHEEL.map((w,i)=>{const a0=i*seg,a1=(i+1)*seg,[x0,y0]=P(96,a0),[x1,y1]=P(96,a1);return`<path class="wseg" data-i="${i}" d="M0 0L${x0} ${y0}A96 96 0 0 1 ${x1} ${y1}Z" fill="url(#wg${i})"/>`}).join('');
  const shine=WHEEL.map((w,i)=>{const a0=i*seg+2,a1=(i+.5)*seg,[x0,y0]=P(92,a0),[x1,y1]=P(92,a1),[x2,y2]=P(30,a1);return`<path d="M${x2} ${y2}L${x0} ${y0}A92 92 0 0 1 ${x1} ${y1}Z" fill="#fff" opacity=".1"/>`}).join('');
  const lines=WHEEL.map((w,i)=>{const[x,y]=P(96,i*seg),[sx,sy]=P(88,i*seg);return`<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="url(#wgold)" stroke-width="2.6"/><circle cx="${sx}" cy="${sy}" r="3.2" fill="url(#wgoldr)" stroke="#8a5a00" stroke-width=".6"/>`}).join('');
  const coin=(y)=>`<circle cy="${y}" r="7.5" fill="url(#wgoldr)" stroke="#a86a00" stroke-width="1"/><circle cy="${y}" r="4.6" fill="none" stroke="#fff6c0" stroke-width="1"/>`;
  const labels=WHEEL.map((w,i)=>{const big=w.c?w.c:'',ic=w.c?'':w.h?'💡':'⏭️',mult=w.h>1?'×2':'';
    return`<g transform="rotate(${(i+.5)*seg})">${w.c?`<text y="-62" class="wnum">${big}</text>${coin(-40)}`:`<text y="-56" class="wic">${ic}</text>${mult?`<text y="-36" class="wsm">${mult}</text>`:''}`}</g>`}).join('');
  const bulbs=[...Array(24)].map((_,i)=>{const[x,y]=P(104,i*15+7.5);return`<circle class="wb ${i%2?'b':'a'}" cx="${x}" cy="${y}" r="3.6"/>`}).join('');
  return`<svg viewBox="-112 -112 224 224" class="wsvg"><defs>${defs}
    <linearGradient id="wgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffc83a"/><stop offset=".7" stop-color="#e09a00"/><stop offset="1" stop-color="#fff0a0"/></linearGradient>
    <radialGradient id="wgoldr" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#b87400"/></radialGradient></defs>
    <circle r="110" fill="#5a1f6a"/><circle r="108" fill="url(#wgold)"/><circle r="99" fill="#3a1050"/>${bulbs}
    <g id="wheel" class="wrot">${segs}${shine}${lines}${labels}<path id="wwin" d="" fill="#fff" opacity="0"/></g>
    <circle r="97" fill="none" stroke="#2a0a3a" stroke-width="2.5" opacity=".6"/></svg>`;
}
function showSpin(){
  const free=spinReady();
  openModal(`<h2>🎡 Lucky Spin</h2><p id="spinTxt">${free?'Your free spin is ready!':`Next free spin in ${fmtTime(S.spinAt-Date.now())}`}</p>
    <div class="wheelwrap"><div class="wstand"></div>${wheelSVG()}<div class="wblur"></div>
    <div class="hub"><span>⭐</span></div><svg class="ptr" id="ptr" viewBox="0 0 32 40"><defs><linearGradient id="ptrg" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe9a8"/><stop offset="1" stop-color="#d9a400"/></linearGradient></defs><path d="M16 40L2 8a14 14 0 1 1 28 0z" fill="url(#ptrg)" stroke="#7a4b00" stroke-width="1.5"/><circle cx="16" cy="12" r="5" fill="#ff4f8b" stroke="#fff" stroke-width="1.5"/></svg>
    <div class="wprize"></div></div>`,
    [{label:'Close',cls:'sec',fn:()=>{if(!spinning){closeModal();renderHome()}}},
     {label:free?'SPIN! 🎡':`Spin · <i class="coin"></i> ${SPIN_COST}`,cls:free?'big':'',fn:()=>doSpin()}],{cls:'spin',dismiss:()=>{if(!spinning){closeModal();renderHome()}}});
  const wh=$('#wheel');if(wh)wh.style.transform=`rotate(${wheelAng}deg)`;
}
function doSpin(){
  if(spinning)return false;
  const free=spinReady();
  if(!free){if(S.coins<SPIN_COST){toast('Not enough coins');sfx.bad();return false}S.coins-=SPIN_COST;refreshCoins()}
  else S.spinAt=Date.now()+SPIN_CD;
  /* the prize is chosen and paid (and saved) right now; the animation only reveals it, so closing the app mid-spin loses nothing */
  const tot=WHEEL.reduce((a,w)=>a+w.w,0);let r=Math.random()*tot,i=0;while(r>=WHEEL[i].w){r-=WHEEL[i].w;i++}
  const w=WHEEL[i];S.coins+=w.c||0;S.hints+=w.h||0;S.skips+=w.s||0;S.stats.spins++;save();
  spinning=true;$$('#modal .mbtns .btn').forEach(b=>b.disabled=true);const ww=$('.wheelwrap');if(ww)ww.classList.add('going');
  $('#spinTxt')&&($('#spinTxt').textContent='Good luck! 🍀');
  /* wind-up (a small pull back), a long ease-out over 6+ turns to just past the prize, then a settle back onto it */
  const seg=360/WHEEL.length,start=wheelAng,base=((-(i+.5)*seg-start)%360+360)%360;
  const end=start+360*6+base+(Math.random()-.5)*seg*.6,TW=260,T1=3600,T2=560,t0=performance.now(),wh=$('#wheel'),ptr=$('#ptr'),blur=$('.wblur'),over=4,back=10;
  let lastSeg=Math.floor(start/seg),prev=start;sfx.whoosh();
  const fast=REDUCED||Q.tier==='low';
  (function step(t){
    const e=t-t0;
    if(e<TW){const k=e/TW;wheelAng=start-back*Math.sin(k*Math.PI/2)}
    else if(e<TW+T1){const k=(e-TW)/T1;wheelAng=start-back+(end+over-start+back)*(1-Math.pow(1-k,4))}
    else{const k=clamp((e-TW-T1)/T2,0,1);wheelAng=end+over*(1-k*k*(3-2*k))}
    if(wh)wh.style.transform=`rotate(${wheelAng}deg)`;
    const v=Math.abs(wheelAng-prev);prev=wheelAng;if(blur&&!fast)blur.style.opacity=clamp((v-4)/14,0,.85);
    const sNow=Math.floor(wheelAng/seg);if(sNow!==lastSeg){lastSeg=sNow;if(v<20)sfx.wheel();if(ptr){ptr.classList.remove('tick');void ptr.offsetWidth;ptr.classList.add('tick')}}
    if(e<TW+T1+T2)return requestAnimationFrame(step);
    spinning=false;wheelAng=end%360;if(blur)blur.style.opacity=0;
    questEvent('spin',1);earned(w.c||0);checkAch();save();if(!w.c)refreshCoins();
    reveal(w,i);
  })(t0);
}
/* the win: every bulb flashes in the prize colour, the winning wedge glows, and a prize badge bursts out of the hub */
function reveal(w,i){
  const ww=$('.wheelwrap');if(!ww)return;
  ww.classList.remove('going');ww.classList.add('won');ww.style.setProperty('--wc',w.col);
  const seg=360/WHEEL.length,P=(r,a)=>[(r*Math.sin(a*Math.PI/180)).toFixed(2),(-r*Math.cos(a*Math.PI/180)).toFixed(2)],[x0,y0]=P(96,i*seg),[x1,y1]=P(96,(i+1)*seg);
  const ws=$('#wwin');if(ws){ws.setAttribute('d',`M0 0L${x0} ${y0}A96 96 0 0 1 ${x1} ${y1}Z`);ws.classList.add('on')}
  const label=w.c?`<i class="coin"></i><b>+${w.c}</b><small>coins</small>`:w.h?`<span class="pic">💡</span><b>+${w.h}</b><small>hint${w.h>1?'s':''}</small>`:`<span class="pic">⏭️</span><b>+1</b><small>skip token</small>`;
  const pz=$('.wprize');if(pz){pz.innerHTML=`<i class="prays"></i><div class="pcard">${label}</div>`;pz.classList.add('on')}
  sfx.chest();setTimeout(()=>sfx.levelup&&w.c>=40&&sfx.levelup(),120);buzz([20,40,20]);
  const hub=$('.wheelwrap .hub');if(hub){const[x,y]=centerOf(hub);burst(x,y,w.col,Q.tier==='low'?16:40,1.5);burst(x,y,'#ffd166',Q.tier==='low'?6:18,1.1);ring(x,y,w.col,280,800)}
  if(w.c){flyCoins(hub,Math.min(14,4+w.c/20|0));if(w.c>=40)confetti()}
  $('#spinTxt')&&($('#spinTxt').innerHTML=`You won ${w.c?`<b>${w.c} coins</b>`:w.h?`<b>${w.h} hint${w.h>1?'s':''}</b>`:'<b>a skip token</b>'}! 🎉`);
  setTimeout(()=>{if($('#wheel'))showSpin()},2600);
}

/* ---------- settings ---------- */
function showSettings(){
  const sw=(k,ic,label,sub)=>`<div class="set"><span class="si">${ic}</span><b>${label}${sub?`<small>${sub}</small>`:''}</b><button class="sw ${S[k]?'on':''}" data-k="${k}" aria-label="${label}"></button></div>`;
  const rg=(k,label)=>`<div class="set rng"><span class="si"></span><b>${label}</b><input type="range" min="0" max="1" step=".05" value="${S[k]}" data-v="${k}" style="--p:${S[k]*100}%"></div>`;
  openModal(`<h2>Settings</h2>
    <details class="sgroup" open><summary class="sgh">Sound</summary>${sw('music','🎵','Music','Relaxing generative soundtrack')}${rg('musVol','Volume')}${sw('sfx','🔊','Sound effects')}${rg('sfxVol','Volume')}</details>
    <details class="sgroup"><summary class="sgh">Gameplay</summary>${sw('haptics','📳','Vibration')}${sw('symbols','🔣','Colour symbols','Shapes on colours, helps colour-blind players')}</details>
    <details class="sgroup"><summary class="sgh">Graphics</summary><div class="set gfxset"><span class="si">✨</span><b>Quality<small id="gfxNote"></small></b></div><div class="seg3" id="gfxSeg">${[['auto','Auto'],['high','High'],['med','Medium'],['low','Battery saver']].map(([v,l])=>`<button data-g="${v}" class="${(S.gfx||'auto')===v?'on':''}">${l}</button>`).join('')}</div></details>
    <details class="sgroup danger"><summary class="sgh">Danger zone</summary><div class="set"><span class="si">🗑️</span><b>Reset progress<small>Erases all levels, coins and trophies</small></b><button class="btn sm sec" id="resetBtn">Reset</button></div></details>`,
    [{label:'Done',fn:()=>{closeModal();refreshHUD()}}],{icon:'⚙️',cls:'settings',dismiss:()=>{closeModal();refreshHUD()}});
  const gfxNote=()=>{$('#gfxNote').textContent=(S.gfx||'auto')==='auto'?`Auto picked: ${{high:'High',med:'Medium',low:'Battery saver'}[Q.tier]}`:'Smoother on older phones if you lower it'};gfxNote();
  $$('#gfxSeg button').forEach(b=>b.onclick=()=>{S.gfx=b.dataset.g;save();Q.apply();$$('#gfxSeg button').forEach(x=>x.classList.toggle('on',x===b));gfxNote();sfx.click()});
  $$('#modal .sw').forEach(b=>b.onclick=()=>{const k=b.dataset.k;S[k]=!S[k];b.classList.toggle('on',S[k]);save();applyVolumes();audio();if(k==='music'&&S.music)Music.start();sfx.click();if(k==='haptics')buzz(30)});
  $$('#modal input[type=range]').forEach(r=>r.oninput=()=>{S[r.dataset.v]=+r.value;r.style.setProperty('--p',r.value*100+'%');applyVolumes();save()});
  $$('#modal input[type=range]').forEach(r=>r.onchange=()=>sfx.good());
  $('#resetBtn').onclick=()=>openModal('<h2>Erase everything?</h2><p>All levels, stars, coins, themes and trophies will be lost. This cannot be undone.</p>',
    [{label:'Cancel',cls:'sec',fn:showSettings},{label:'Erase',cls:'pink',fn:()=>{try{localStorage.removeItem(KEY)}catch(e){}location.reload()}}],{icon:'⚠️',cls:'fail',noEnter:true,back:showSettings});
}

/* ---------- one-time welcome card for players who had v1/v2 progress ---------- */
function showWelcome(){
  S.welcome3=false;save();
  const list=TYPES.map(t=>`<div class="wm"><i>${INFO[t].icon}</i><b>${INFO[t].name}</b></div>`).join('');
  openModal(`<div class="kicker">Big update</div><h2>Welcome to v3!</h2>
    <p>The game now has ${TYPES.length} calm, easy-to-learn puzzle modes. Your levels start fresh, and everything else came with you: coins, level, themes and trophies.</p>
    <div class="wmodes">${list}</div>
    <div class="reward"><i class="coin"></i><b>+200</b></div><div class="extra gold">🎁 Welcome gift: 200 coins and 3 hints</div>`,
    [{label:"Let's go! ▶",cls:'big',fn:()=>{closeModal();renderHome();if(loginDue())queueModal(()=>{if(loginDue())showLogin()},400)}}],{icon:'🌟',cls:'welcome'});
}
