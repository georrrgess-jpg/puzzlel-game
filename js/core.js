'use strict';
/* ====================== helpers ====================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashSeed(n,salt=0){let h=(2166136261^salt)>>>0;h=Math.imul(h^n,16777619);h^=h>>>13;h=Math.imul(h,0x85ebca6b);h^=h>>>16;return h>>>0}
function rngOf(seed){const f=mulberry32(seed);f.int=(a,b)=>a+Math.floor(f()*(b-a+1));f.pick=a=>a[Math.floor(f()*a.length)];return f}
function shuffle(a,R){for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const STAR='<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.6 7 14.5 1.7 9.5l7.2-.9z"/></svg>';
const COLORS=['#ff5d73','#ff9f43','#ffd93d','#9be564','#2ecc8f','#3ddbd9','#4d8dff','#9b6bff','#ff6bd6','#c8b6a0'];
const SYMS=['●','▲','■','◆','★','♥','✚','☾','✿','⬢'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ====================== dates ====================== */
const dayNum=(d=new Date())=>Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/864e5);
const today=()=>dayNum();
function untilMidnight(){const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);return m-n}
function fmtTime(ms){ms=Math.max(0,ms);const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}:${String(s).padStart(2,'0')}`}

/* ====================== economy ======================
   Every price and reward lives here (the game code and tools/economy-sim.cjs both read this table), so balancing is
   a one-file change. Targets: about 20-30 coins per level on average from all sources; a hint costs about 1.5 levels
   of earnings, a skip about 4; the first colour theme lands around level 15-25 and the whole shop takes 250+ levels. */
const ECON={
  clear:{base:6,perStar:4,improve:2,bonusMult:2,streakStep:1,streakCap:5},   // first clear = base + perStar per star; replays only pay for new stars
  daily:{base:20,perStar:4,streakStep:4,streakMax:7},
  hint:{cost:40,p3:100,p10:300},
  skip:{cost:150,token:120,p3:330},
  spin:{cd:4*3600e3,cost:40},
  quest:{rewards:[8,12,16],bonus:20,bonusHints:1,xp:15},
  lvlup:{base:10,per:2,cap:60,skipEvery:5},
  chest:{base:12,per:5},
  xp:{need:L=>60+L*30,clear:10,perStar:5,daily:30,bonus:10},
  login:[{c:15,ic:'🪙'},{c:20,ic:'🪙'},{c:20,h:1,ic:'💡'},{c:30,ic:'💰'},{c:25,h:2,ic:'💡'},{c:40,ic:'💰'},{c:60,h:2,s:1,ic:'🎁'}],
  wheel:[{t:'5',c:5,w:22,col:'#22b07d'},{t:'10',c:10,w:22,col:'#ff5d73'},{t:'20',c:20,w:16,col:'#4d7dff'},{t:'💡',h:1,w:14,col:'#f5a524'},
    {t:'40',c:40,w:7,col:'#e04fc2'},{t:'💡×2',h:2,w:8,col:'#15b5c4'},{t:'⏭️',s:1,w:5,col:'#8b5cf6'},{t:'100',c:100,w:2,col:'#ff7a1a'}],
  themes:{midnight:0,ocean:400,forest:400,sunset:700,aurora:700,candy:1000,sakura:1000,lava:1400,mono:1400,galaxy:2000},
  /* garden decorations: a long-term coin sink that decorates the home screen once the themes are bought */
  deco:[{id:'sprout',ic:'🌱',name:'Sprout patch',cost:300},{id:'sunflower',ic:'🌻',name:'Sunflower',cost:600},{id:'lantern',ic:'🏮',name:'Paper lantern',cost:800},
    {id:'butterfly',ic:'🦋',name:'Butterflies',cost:1000},{id:'kite',ic:'🪁',name:'Kite',cost:1200},{id:'fountain',ic:'⛲',name:'Fountain',cost:1600},
    {id:'bunny',ic:'🐇',name:'Garden bunny',cost:1800},{id:'rainbow',ic:'🌈',name:'Rainbow',cost:2200},{id:'cottage',ic:'🏡',name:'Cottage',cost:2800}]
};
function levelReward(prev,stars,bonus,streak){   // streak counts consecutive 3-star clears including this one
  const c=ECON.clear;let coins=prev?0:c.base;
  if(stars>prev){coins+=(stars-prev)*c.perStar;if(prev)coins+=c.improve}
  if(bonus)coins*=c.bonusMult;
  const streakBonus=stars===3&&streak>=2?Math.min(c.streakCap,streak*c.streakStep):0;
  return{coins:coins+streakBonus,streakBonus};
}
const dailyReward=(stars,dstreak)=>ECON.daily.base+stars*ECON.daily.perStar+Math.min(ECON.daily.streakMax,dstreak)*ECON.daily.streakStep;
const levelUpReward=L=>Math.min(ECON.lvlup.cap,ECON.lvlup.base+L*ECON.lvlup.per);
const chestReward=m=>ECON.chest.base+ECON.chest.per*m;
const xpNeed=L=>ECON.xp.need(L);
const xpForWin=(stars,daily,bonus)=>ECON.xp.clear+stars*ECON.xp.perStar+(daily?ECON.xp.daily:0)+(bonus?ECON.xp.bonus:0);

/* ====================== save data ====================== */
const KEY='endless-puzzle-pop-v1';
const DEFAULTS={ver:3,deco:[],unlocked:1,stars:{},coins:0,hints:2,skips:0,theme:'midnight',owned:['midnight'],muted:false,milestone:0,streak:0,seen:{},seenN:{},
  // big update
  xp:0,plv:1,music:true,sfx:true,musVol:.55,sfxVol:.85,haptics:true,symbols:false,gfx:'auto',
  login:{last:-1,streak:0},spinAt:0,quests:{day:-1,list:[],bonus:false},ach:{},
  dchal:{last:-1,streak:0},deal:{day:-1,bought:false},
  stats:{wins:0,perfect:0,types:{},bestStreak:0,maxCombo:0,daily:0,spins:0,nohint:0,quests:0,bestLogin:0,coinsEarned:0,hints:0}
};
let S=load();
function load(){
  const d=JSON.parse(JSON.stringify(DEFAULTS));let raw={};
  try{raw=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
  const s=Object.assign(d,raw);
  for(const k of['login','quests','dchal','deal','stats'])s[k]=Object.assign(JSON.parse(JSON.stringify(DEFAULTS[k])),raw[k]||{});
  s.stats.types=Object.assign({},s.stats.types);
  // migrate older saves: count existing clears so trophies make sense
  if(!raw.stats&&raw.stars){const v=Object.values(raw.stars);s.stats.wins=v.length;s.stats.perfect=v.filter(x=>x===3).length}
  if(raw.muted&&raw.music===undefined){s.music=false;s.sfx=false}
  // the picture-card mode 'vases' became 'pics' (new rules, so its how-to shows again); quests and stats follow it
  if(s.seen.vases!==undefined)delete s.seen.vases;
  if(s.stats.types.vases!==undefined){s.stats.types.pics=(s.stats.types.pics||0)+s.stats.types.vases;delete s.stats.types.vases}
  if(s.quests&&s.quests.list)s.quests.list.forEach(q=>{if(q.p==='vases')q.p='pics'});
  // Lights Out was replaced by Arrow Escape (same place in the level rotation): quests and stats follow it
  if(s.seen.lights!==undefined)delete s.seen.lights;
  if(s.stats.types.lights!==undefined){s.stats.types.arrows=(s.stats.types.arrows||0)+s.stats.types.lights;delete s.stats.types.lights}
  if(s.quests&&s.quests.list)s.quests.list.forEach(q=>{if(q.p==='lights')q.p='arrows'});
  if(s.resume&&!s.resume.t)s.resume=null;   // a kept level from before levels recorded their mode
  if(!(raw.ver>=3)){
    // v3 replaced four puzzle modes, so level N is a different puzzle now: per-level progress restarts,
    // everything else (coins, XP, themes, trophies, hints, login/daily streaks) is kept.
    const hadProgress=!!(raw.unlocked>1||raw.coins>0||(raw.stats&&raw.stats.wins));
    s.stars={};s.unlocked=1;s.milestone=0;s.streak=0;s.seen={};
    s.quests={day:-1,list:[],bonus:false};s.dchal.tday=-1;
    s.stats.types={};
    if(hadProgress){s.coins+=200;s.hints+=3;s.welcome3=true}
    s.ver=3;
  }
  return s;
}
let saveWarned=false;
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(S))}
  catch(e){if(!saveWarned){saveWarned=true;if(typeof toast==='function')toast("Can't save progress on this device (private mode?)")}}
}
const totalStars=()=>Object.values(S.stars).reduce((a,b)=>a+b,0);
const msThreshold=m=>12*(m+1)+3*m*m;
const msReward=m=>chestReward(m);

/* ====================== themes ====================== */
const THEMES={
  midnight:{name:'Midnight',cost:ECON.themes.midnight,v:{'--bg1':'#141432','--bg2':'#2d1b4e','--acc':'#ffd166','--acc2':'#ef476f'}},
  ocean:{name:'Ocean',cost:ECON.themes.ocean,v:{'--bg1':'#06223a','--bg2':'#0b4a6b','--acc':'#7df9ff','--acc2':'#3a86ff'}},
  forest:{name:'Forest',cost:ECON.themes.forest,v:{'--bg1':'#0d2a1c','--bg2':'#1d4d2f','--acc':'#c6ff6b','--acc2':'#2ecc8f'}},
  sunset:{name:'Sunset',cost:ECON.themes.sunset,v:{'--bg1':'#2b0f2e','--bg2':'#6b2142','--acc':'#ffb86b','--acc2':'#ff4d6d'}},
  aurora:{name:'Aurora',cost:ECON.themes.aurora,v:{'--bg1':'#071a24','--bg2':'#123d4a','--acc':'#7dffb2','--acc2':'#b06bff'}},
  candy:{name:'Candy',cost:ECON.themes.candy,v:{'--bg1':'#3a1a4f','--bg2':'#7a2f7a','--acc':'#ff9ee5','--acc2':'#7df9ff'}},
  sakura:{name:'Sakura',cost:ECON.themes.sakura,v:{'--bg1':'#2a1424','--bg2':'#5a2a48','--acc':'#ffc2d9','--acc2':'#ff6b9d'}},
  lava:{name:'Lava',cost:ECON.themes.lava,v:{'--bg1':'#1a0805','--bg2':'#4a1608','--acc':'#ffb020','--acc2':'#ff3d1f'}},
  galaxy:{name:'Galaxy',cost:ECON.themes.galaxy,v:{'--bg1':'#05030f','--bg2':'#1b1040','--acc':'#a8b4ff','--acc2':'#ff5ce1'}},
  mono:{name:'Noir',cost:ECON.themes.mono,v:{'--bg1':'#0a0a0a','--bg2':'#2a2a2a','--acc':'#ffffff','--acc2':'#9aa0a6'}}
};
function applyTheme(){const t=THEMES[S.theme]||THEMES.midnight;for(const k in t.v)document.documentElement.style.setProperty(k,t.v[k]);$('meta[name=theme-color]').content=t.v['--bg1'];if(typeof BG!=='undefined')BG.retheme()}

/* ====================== level generation ====================== */
/* Modes register themselves (js/modes/*.js, loaded in this order) so the rotation always matches what exists. */
const TYPES=[],INFO={},MAKERS={};
function registerMode(id,info,howto){TYPES.push(id);INFO[id]=info;if(howto)HOWTO[id]=howto}
function bagOrder(b){
  const N=TYPES.length;
  if(b===0)return TYPES.slice();
  const a=shuffle(TYPES.slice(),mulberry32(hashSeed(b,99)));
  const prevLast=b===1?TYPES[N-1]:shuffle(TYPES.slice(),mulberry32(hashSeed(b-1,99)))[N-1];
  if(a[0]===prevLast)[a[0],a[1]]=[a[1],a[0]];
  return a;
}
function typeFor(n){const N=TYPES.length,b=Math.floor((n-1)/N);return bagOrder(b)[(n-1)%N]}
const tierFor=n=>Math.floor((n-1)/TYPES.length);
const isBonus=n=>n%10===0;
const starsFor=(v,s3,s2)=>v<=s3?3:v<=s2?2:1;
const WORLDS=['Twilight Grove','Crystal Caves','Neon Harbor','Sunken Temple','Cloud Citadel','Ember Peaks','Starfall Bay','Clockwork City','Aurora Fields','Moonlit Maze','Prism Desert','Cosmic Garden'];
const worldName=c=>WORLDS[c%WORLDS.length]+(c>=WORLDS.length?' '+'I'.repeat(Math.floor(c/WORLDS.length)+1):'');
