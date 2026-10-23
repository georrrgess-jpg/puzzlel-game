'use strict';
/* ====================== player level / XP ====================== */
const xpNeed=L=>60+L*30;
const RANKS=['Novice','Apprentice','Puzzler','Thinker','Solver','Strategist','Tactician','Mastermind','Sage','Grandmaster','Legend','Mythic','Cosmic'];
const rankOf=L=>RANKS[Math.min(RANKS.length-1,Math.floor((L-1)/3))];
function addXP(n){
  const from={lv:S.plv,xp:S.xp},ups=[];S.xp+=n;
  while(S.xp>=xpNeed(S.plv)){S.xp-=xpNeed(S.plv);S.plv++;const r={lv:S.plv,coins:20+S.plv*5,skip:S.plv%5===0};S.coins+=r.coins;if(r.skip)S.skips++;ups.push(r)}
  return{from,ups};
}
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
  S.quests={day:d,bonus:false,list:keys.map((k,i)=>{const q=QT[k];return{k,n:R.pick(q.ns),p:q.param?R.pick(TYPES):null,v:0,claimed:false,r:35+i*15}})};
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
function showQuests(still){
  ensureQuests();const L=S.quests.list,allC=allQuestsClaimed();
  openModal(`<h2>📜 Daily Quests</h2><p>Fresh quests in ${fmtTime(untilMidnight())}</p><div class="qlist">${L.map((q,i)=>{const T=QT[q.k],done=q.v>=q.n;
    return`<div class="quest ${q.claimed?'claimed':done?'ready':''}"><div class="qi">${T.ic}</div><div class="qt"><b>${T.txt(q.n,q.p)}</b><div class="bar"><div style="width:${q.v/q.n*100}%"></div></div><small>${q.v} / ${q.n} · <i class="coin"></i> ${q.r} + 15 XP</small></div>${q.claimed?'✅':done?`<button class="btn sm" data-q="${i}">Claim</button>`:''}</div>`}).join('')}
    <div class="quest ${allC?(S.quests.bonus?'claimed':'ready'):''}"><div class="qi">🎁</div><div class="qt"><b>Finish all 3 quests</b><small>Bonus chest · <i class="coin"></i> 100 + 💡 1</small></div>${allC&&!S.quests.bonus?'<button class="btn sm pink" data-q="bonus">Open!</button>':S.quests.bonus?'✅':'🔒'}</div></div>`,
    [{label:'Close',cls:'sec',fn:()=>{closeModal();renderHome()}}],{wide:true,still});
  $$('#modal [data-q]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.q;let coins;
    if(k==='bonus'){S.quests.bonus=true;coins=100;S.hints++}
    else{const q=L[+k];if(q.claimed)return;q.claimed=true;coins=q.r;S.stats.quests++;xpBanner(addXP(15))}
    S.coins+=coins;sfx.chest();const[x,y]=centerOf(b);burst(x,y,'#ffd166',30,1.2);flyCoins(b,8);save();checkAch();showQuests(true);
  });
}

/* ---------- trophies ---------- */
const st=()=>S.stats;
const ACH=[
  {id:'w1',ic:'🎉',name:'First Steps',desc:'Clear your first level',t:()=>st().wins>=1,r:20},
  {id:'w10',ic:'🧩',name:'Warming Up',desc:'Clear 10 levels',t:()=>st().wins>=10,r:40},
  {id:'w50',ic:'🧠',name:'Puzzle Pro',desc:'Clear 50 levels',t:()=>st().wins>=50,r:100},
  {id:'w100',ic:'💯',name:'Centurion',desc:'Clear 100 levels',t:()=>st().wins>=100,r:200},
  {id:'w250',ic:'👑',name:'Puzzle Royalty',desc:'Clear 250 levels',t:()=>st().wins>=250,r:500},
  {id:'s25',ic:'⭐',name:'Star Struck',desc:'Collect 25 stars',t:()=>totalStars()>=25,r:30},
  {id:'s100',ic:'🌟',name:'Constellation',desc:'Collect 100 stars',t:()=>totalStars()>=100,r:100},
  {id:'s300',ic:'🌌',name:'Galaxy Brain',desc:'Collect 300 stars',t:()=>totalStars()>=300,r:300},
  {id:'p10',ic:'✨',name:'Perfectionist',desc:'Get 3 stars 10 times',t:()=>st().perfect>=10,r:50},
  {id:'p50',ic:'💎',name:'Flawless',desc:'Get 3 stars 50 times',t:()=>st().perfect>=50,r:150},
  {id:'k5',ic:'🔥',name:'On Fire',desc:'Reach a 3-star streak of 5',t:()=>st().bestStreak>=5,r:60},
  {id:'k12',ic:'☄️',name:'Unstoppable',desc:'Reach a 3-star streak of 12',t:()=>st().bestStreak>=12,r:200},
  {id:'all',ic:'🎲',name:'Jack of All Trades',desc:'Solve every puzzle type',t:()=>TYPES.every(x=>st().types[x]),r:50},
  {id:'spec',ic:'🎓',name:'Specialist',desc:'Solve 15 puzzles of one type',t:()=>Object.values(st().types).some(v=>v>=15),r:80},
  {id:'c6',ic:'⚡',name:'Combo Starter',desc:'Reach a ×6 combo',t:()=>st().maxCombo>=6,r:40},
  {id:'c12',ic:'🌀',name:'Combo King',desc:'Reach a ×12 combo',t:()=>st().maxCombo>=12,r:120},
  {id:'d1',ic:'📅',name:'Daily Habit',desc:'Beat a Daily Challenge',t:()=>st().daily>=1,r:30},
  {id:'d7',ic:'🗓️',name:'Devoted',desc:'Beat 7 Daily Challenges',t:()=>st().daily>=7,r:150},
  {id:'l7',ic:'🎁',name:'Regular',desc:'Log in 7 days in a row',t:()=>st().bestLogin>=7,r:100},
  {id:'sp5',ic:'🎡',name:'Lucky Duck',desc:'Spin the wheel 5 times',t:()=>st().spins>=5,r:40},
  {id:'nh20',ic:'🦉',name:'Wise Owl',desc:'Clear 20 levels without hints',t:()=>st().nohint>=20,r:80},
  {id:'q10',ic:'📜',name:'Quest Hunter',desc:'Claim 10 quest rewards',t:()=>st().quests>=10,r:80},
  {id:'th',ic:'🎨',name:'Stylish',desc:'Buy a colour theme',t:()=>S.owned.length>=2,r:30},
  {id:'th4',ic:'🖼️',name:'Collector',desc:'Own 4 colour themes',t:()=>S.owned.length>=4,r:100},
  {id:'pl10',ic:'🏅',name:'Rising Star',desc:'Reach player level 10',t:()=>S.plv>=10,r:150}
];
function checkAch(){
  let n=0;
  for(const a of ACH){if(S.ach[a.id]||!a.t())continue;S.ach[a.id]=Date.now();S.coins+=a.r;if(n++<3)banner(a.ic,'TROPHY UNLOCKED',a.name,`${a.desc} · +${a.r} coins`)}
  if(n){sfx.unlock();save();refreshCoins()}
}
const achCount=()=>ACH.filter(a=>S.ach[a.id]).length;
function showTrophies(){
  openModal(`<h2>🏆 Trophies</h2><p>${achCount()} of ${ACH.length} unlocked</p><div class="achgrid">${ACH.map(a=>`<div class="ach ${S.ach[a.id]?'got':''}"><i>${a.ic}</i><div><b>${a.name}</b><small>${a.desc} · 🪙${a.r}</small></div></div>`).join('')}</div>`,
    [{label:'Close',cls:'sec',fn:()=>{closeModal();renderHome()}}],{wide:true});
}
function showProfile(){
  const s=S.stats;
  openModal(`<h2>${rankOf(S.plv)}</h2><p>Player level ${S.plv} · ${S.xp} / ${xpNeed(S.plv)} XP</p>
    <div class="bar" style="margin:0 10px"><div style="width:${S.xp/xpNeed(S.plv)*100}%"></div></div>
    <div class="stats"><div><b>${s.wins}</b><small>Levels cleared</small></div><div><b>${totalStars()}</b><small>Stars</small></div>
    <div><b>${s.perfect}</b><small>Perfect clears</small></div><div><b>${s.bestStreak}</b><small>Best 3★ streak</small></div>
    <div><b>×${s.maxCombo}</b><small>Best combo</small></div><div><b>${s.daily}</b><small>Daily challenges</small></div>
    <div><b>${achCount()}/${ACH.length}</b><small>Trophies</small></div><div><b>${S.login.streak}</b><small>Login streak</small></div></div>
    <p>Next rank: <b>${RANKS[Math.min(RANKS.length-1,Math.floor((S.plv-1)/3)+1)]}</b> at level ${(Math.floor((S.plv-1)/3)+1)*3+1}</p>`,
    [{label:'Close',cls:'sec',fn:closeModal}]);
}

/* ---------- daily login calendar ---------- */
const LOGIN=[{c:25,ic:'🪙'},{c:40,ic:'🪙'},{c:30,h:1,ic:'💡'},{c:60,ic:'💰'},{c:50,h:2,ic:'💡'},{c:100,ic:'💰'},{c:150,h:2,s:1,ic:'🎁'}];
const loginDue=()=>S.login.last!==today();
function showLogin(){
  const d=today(),streak=S.login.last===d-1?S.login.streak:0,idx=streak%7;
  const txt=r=>[r.c?`🪙${r.c}`:'',r.h?`💡${r.h}`:'',r.s?`⏭️${r.s}`:''].filter(Boolean).join(' ');
  openModal(`<h2>🎁 Daily Reward</h2><p>${streak?`🔥 ${streak}-day streak! Come back tomorrow for more.`:'Log in every day for bigger rewards!'}</p>
    <div class="days">${LOGIN.map((r,i)=>`<div class="day ${i<idx?'got':i===idx?'now':''} ${i===6?'big':''}"><small>Day ${i+1}</small><i>${r.ic}</i><b>${txt(r)}</b></div>`).join('')}</div>`,
    [{label:'Claim!',cls:'big',fn:b=>{
      const r=LOGIN[idx];S.login={last:d,streak:streak+1};S.stats.bestLogin=Math.max(S.stats.bestLogin,streak+1);
      S.coins+=r.c||0;S.hints+=r.h||0;S.skips+=r.s||0;save();
      sfx.chest();const now_=$('.day.now');if(now_){const[x,y]=centerOf(now_);burst(x,y,'#ffd166',40,1.4)}flyCoins(now_,10);
      setTimeout(()=>{closeModal();checkAch();renderHome()},700);
    }}]);
}

/* ---------- daily challenge ---------- */
const dailyDone=()=>S.dchal.last===today();
function dailyCfg(){
  const d=today();
  if(S.dchal.tday!==d){S.dchal.tday=d;S.dchal.tier=clamp(tierFor(S.unlocked)+2,2,14);save()}
  return{type:TYPES[hashSeed(d,5)%6],tier:S.dchal.tier,seed:hashSeed(d,777)};
}
function startDaily(){if(dailyDone()){toast(`✅ Done for today! New challenge in ${fmtTime(untilMidnight())}`);sfx.bad();return}startLevel(0,{daily:true})}

/* ---------- lucky spin ---------- */
const WHEEL=[{t:'25',c:25,w:20,col:'#ff5d73'},{t:'💡',h:1,w:14,col:'#f5a524'},{t:'50',c:50,w:14,col:'#4d7dff'},{t:'10',c:10,w:20,col:'#22b07d'},
  {t:'150',c:150,w:5,col:'#e04fc2'},{t:'💡×2',h:2,w:9,col:'#15b5c4'},{t:'⏭️',s:1,w:8,col:'#8b5cf6'},{t:'500',c:500,w:1,col:'#ff7a1a'}];
const SPIN_CD=4*3600e3,SPIN_COST=40;
const spinReady=()=>Date.now()>=S.spinAt;
let wheelAng=0,spinning=false;
function showSpin(){
  const seg=360/WHEEL.length;
  const grad=`radial-gradient(circle,transparent 58%,#00000030 59%,transparent 61%),conic-gradient(${WHEEL.map((w,i)=>`${w.col} ${i*seg}deg ${(i+1)*seg-.6}deg,#fff8 ${(i+1)*seg-.6}deg ${(i+1)*seg}deg`).join(',')})`;
  const free=spinReady();
  openModal(`<h2>🎡 Lucky Spin</h2><p id="spinTxt">${free?'Your free spin is ready!':`Next free spin in ${fmtTime(S.spinAt-Date.now())}`}</p>
    <div class="wheelwrap"><div class="bulbs">${[...Array(16)].map((_,i)=>{const a=i/16*Math.PI*2;return`<i style="left:${50+50*Math.sin(a)}%;top:${50-50*Math.cos(a)}%;animation-delay:${(i%2)*.5}s"></i>`}).join('')}</div>
    <div class="wheel" id="wheel" style="background:${grad};transform:rotate(${wheelAng}deg)">${WHEEL.map((w,i)=>`<div class="lb" style="transform:rotate(${(i+.5)*seg}deg)"><span>${w.c?'<i class="coin"></i>':''}${w.t}</span></div>`).join('')}</div>
    <div class="hub">⭐</div><svg class="ptr" id="ptr" viewBox="0 0 32 40"><path d="M16 40L2 8a14 14 0 1 1 28 0z" fill="#fff"/><circle cx="16" cy="12" r="5" fill="var(--acc2)"/></svg></div>`,
    [{label:'Close',cls:'sec',fn:()=>{if(!spinning){closeModal();renderHome()}}},
     {label:free?'SPIN! 🎡':`Spin · <i class="coin"></i> ${SPIN_COST}`,cls:free?'big':'',fn:()=>doSpin()}]);
}
function doSpin(){
  if(spinning)return;
  const free=spinReady();
  if(!free){if(S.coins<SPIN_COST){toast('Not enough coins');sfx.bad();return}S.coins-=SPIN_COST;refreshCoins()}
  else S.spinAt=Date.now()+SPIN_CD;
  save();spinning=true;$$('#modal .mbtns .btn').forEach(b=>b.disabled=true);
  const tot=WHEEL.reduce((a,w)=>a+w.w,0);let r=Math.random()*tot,i=0;while(r>=WHEEL[i].w){r-=WHEEL[i].w;i++}
  const seg=360/WHEEL.length,start=wheelAng,base=((-(i+.5)*seg-start)%360+360)%360;
  const end=start+360*6+base+(Math.random()-.5)*seg*.6,T=4600,t0=performance.now(),wh=$('#wheel'),ptr=$('#ptr');
  let lastSeg=Math.floor(start/seg);sfx.whoosh();
  (function step(t){
    const k=Math.min(1,(t-t0)/T),e=1-Math.pow(1-k,4);wheelAng=start+(end-start)*e;
    if(wh)wh.style.transform=`rotate(${wheelAng}deg)`;
    const sNow=Math.floor(wheelAng/seg);if(sNow!==lastSeg){lastSeg=sNow;sfx.wheel();if(ptr){ptr.classList.remove('tick');void ptr.offsetWidth;ptr.classList.add('tick')}}
    if(k<1)return requestAnimationFrame(step);
    spinning=false;wheelAng%=360;
    const w=WHEEL[i];S.coins+=w.c||0;S.hints+=w.h||0;S.skips+=w.s||0;emit('spin',1);save();
    sfx.chest();const hub=$('.wheelwrap .hub');if(hub){const[x,y]=centerOf(hub);burst(x,y,w.col,46,1.6);ring(x,y,w.col,260,800)}
    if(w.c){flyCoins(hub,Math.min(14,4+w.c/20|0));if(w.c>=150)confetti()}
    toast(`You won ${w.c?`<i class="coin"></i> ${w.c} coins`:w.h?`💡 ${w.h} hint${w.h>1?'s':''}`:'⏭️ a skip token'}!`);
    setTimeout(()=>{if($('#wheel'))showSpin()},1400);
  })(t0);
}

/* ---------- settings ---------- */
function showSettings(){
  const sw=(k,label,sub)=>`<div class="set"><b>${label}${sub?`<small>${sub}</small>`:''}</b><button class="sw ${S[k]?'on':''}" data-k="${k}" aria-label="${label}"></button></div>`;
  openModal(`<h2>⚙️ Settings</h2>
    ${sw('music','🎵 Music','Relaxing generative soundtrack')}<div class="set"><b>Music volume</b><input type="range" min="0" max="1" step=".05" value="${S.musVol}" data-v="musVol"></div>
    ${sw('sfx','🔊 Sound effects')}<div class="set"><b>Effects volume</b><input type="range" min="0" max="1" step=".05" value="${S.sfxVol}" data-v="sfxVol"></div>
    ${sw('haptics','📳 Vibration')}${sw('symbols','🔣 Colour symbols','Shapes on colours, helps colour-blind players')}
    <div class="set"><b>Reset progress<small>Erases all levels, coins and trophies</small></b><button class="btn sm sec" id="resetBtn">Reset</button></div>`,
    [{label:'Done',fn:()=>{closeModal();refreshHUD()}}]);
  $$('#modal .sw').forEach(b=>b.onclick=()=>{const k=b.dataset.k;S[k]=!S[k];b.classList.toggle('on',S[k]);save();applyVolumes();audio();if(k==='music'&&S.music)Music.start();sfx.click();if(k==='haptics')buzz(30)});
  $$('#modal input[type=range]').forEach(r=>r.oninput=()=>{S[r.dataset.v]=+r.value;applyVolumes();save()});
  $$('#modal input[type=range]').forEach(r=>r.onchange=()=>sfx.good());
  $('#resetBtn').onclick=()=>openModal('<h2>Erase everything?</h2><p>All levels, stars, coins, themes and trophies will be lost. This cannot be undone.</p>',
    [{label:'Cancel',cls:'sec',fn:showSettings},{label:'Erase',cls:'pink',fn:()=>{try{localStorage.removeItem(KEY)}catch(e){}location.reload()}}]);
}
