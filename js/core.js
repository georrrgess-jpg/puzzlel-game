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

/* ====================== save data ====================== */
const KEY='endless-puzzle-pop-v1';
const DEFAULTS={unlocked:1,stars:{},coins:0,hints:2,skips:0,theme:'midnight',owned:['midnight'],muted:false,milestone:0,streak:0,seen:{},
  // big update
  xp:0,plv:1,music:true,sfx:true,musVol:.55,sfxVol:.85,haptics:true,symbols:false,
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
  return s;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const totalStars=()=>Object.values(S.stars).reduce((a,b)=>a+b,0);
const msThreshold=m=>12*(m+1)+3*m*m;
const msReward=m=>30+15*m;

/* ====================== themes ====================== */
const THEMES={
  midnight:{name:'Midnight',cost:0,v:{'--bg1':'#141432','--bg2':'#2d1b4e','--acc':'#ffd166','--acc2':'#ef476f'}},
  ocean:{name:'Ocean',cost:150,v:{'--bg1':'#06223a','--bg2':'#0b4a6b','--acc':'#7df9ff','--acc2':'#3a86ff'}},
  forest:{name:'Forest',cost:150,v:{'--bg1':'#0d2a1c','--bg2':'#1d4d2f','--acc':'#c6ff6b','--acc2':'#2ecc8f'}},
  sunset:{name:'Sunset',cost:250,v:{'--bg1':'#2b0f2e','--bg2':'#6b2142','--acc':'#ffb86b','--acc2':'#ff4d6d'}},
  aurora:{name:'Aurora',cost:300,v:{'--bg1':'#071a24','--bg2':'#123d4a','--acc':'#7dffb2','--acc2':'#b06bff'}},
  candy:{name:'Candy',cost:350,v:{'--bg1':'#3a1a4f','--bg2':'#7a2f7a','--acc':'#ff9ee5','--acc2':'#7df9ff'}},
  sakura:{name:'Sakura',cost:400,v:{'--bg1':'#2a1424','--bg2':'#5a2a48','--acc':'#ffc2d9','--acc2':'#ff6b9d'}},
  lava:{name:'Lava',cost:450,v:{'--bg1':'#1a0805','--bg2':'#4a1608','--acc':'#ffb020','--acc2':'#ff3d1f'}},
  galaxy:{name:'Galaxy',cost:600,v:{'--bg1':'#05030f','--bg2':'#1b1040','--acc':'#a8b4ff','--acc2':'#ff5ce1'}},
  mono:{name:'Noir',cost:500,v:{'--bg1':'#0a0a0a','--bg2':'#2a2a2a','--acc':'#ffffff','--acc2':'#9aa0a6'}}
};
function applyTheme(){const t=THEMES[S.theme]||THEMES.midnight;for(const k in t.v)document.documentElement.style.setProperty(k,t.v[k]);$('meta[name=theme-color]').content=t.v['--bg1'];if(typeof BG!=='undefined')BG.retheme()}

/* ====================== level generation ====================== */
const TYPES=['lights','tubes','rotate','slide','flood','memory'];
const INFO={
  lights:{name:'Lights Out',icon:'💡',col:'#f5b82e',tip:'Tap a square to flip it and its neighbours. Turn every light off.'},
  tubes:{name:'Sort Tubes',icon:'🧪',col:'#22b8c9',tip:'Tap a tube to pick up its top colour, then tap another tube to pour. Make every tube one colour.'},
  rotate:{name:'Spin Lock',icon:'🧭',col:'#4fb35a',tip:'Tap an arrow to turn it and its neighbours. Make every arrow point up.'},
  slide:{name:'Slide Tiles',icon:'🔢',col:'#4d7dff',tip:'Tap or swipe a tile beside the gap to slide it. Put the numbers in order, gap in the bottom-right.'},
  flood:{name:'Colour Flood',icon:'🎨',col:'#e45bc4',tip:'Tap a colour to flood from the top-left corner. Cover the whole board before moves run out.'},
  memory:{name:'Echo Pads',icon:'🎵',col:'#8b5cf6',tip:'Watch the pads light up, then tap them in the same order. You have 4 lives, and one slip still earns 3 stars.'}
};
function bagOrder(b){
  if(b===0)return TYPES.slice();
  const a=shuffle(TYPES.slice(),mulberry32(hashSeed(b,99)));
  const prevLast=b===1?TYPES[5]:shuffle(TYPES.slice(),mulberry32(hashSeed(b-1,99)))[5];
  if(a[0]===prevLast)[a[0],a[1]]=[a[1],a[0]];
  return a;
}
function typeFor(n){const b=Math.floor((n-1)/6);return bagOrder(b)[(n-1)%6]}
const tierFor=n=>Math.floor((n-1)/6);
const isBonus=n=>n%10===0;
const MAKERS={};
const starsFor=(v,s3,s2)=>v<=s3?3:v<=s2?2:1;
const WORLDS=['Twilight Grove','Crystal Caves','Neon Harbor','Sunken Temple','Cloud Citadel','Ember Peaks','Starfall Bay','Clockwork City','Aurora Fields','Moonlit Maze','Prism Desert','Cosmic Garden'];
const worldName=c=>WORLDS[c%WORLDS.length]+(c>=WORLDS.length?' '+'I'.repeat(Math.floor(c/WORLDS.length)+1):'');
