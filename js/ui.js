'use strict';
/* ====================== game harness ====================== */
let cur=null,meterKey='';
const board=$('#board');
/* Boards size themselves from the space that is actually free (whatever the phone), via --bw0 / --bh0 on #board.
   #board is a flex:1 area, so its own size doesn't depend on what is inside it: no feedback loop. */
(()=>{let w=0,h=0;const set=()=>{const nw=board.clientWidth,nh=board.clientHeight;if(nw===w&&nh===h||!nw)return;w=nw;h=nh;board.style.setProperty('--bw0',w+'px');board.style.setProperty('--bh0',h+'px')};
  if(window.ResizeObserver)new ResizeObserver(set).observe(board);addEventListener('resize',set);addEventListener('orientationchange',()=>setTimeout(set,200))})();
const api={
  commit(){cur.history.push(cur.puz.snap())},
  setInfo(h){$('#hudInfo').innerHTML=h;meterKey=''},
  setStars(n){$$('#hudStars svg').forEach((s,i)=>{const on=i<n;if(!on&&s.classList.contains('on')){s.classList.remove('lose');void s.offsetWidth;s.classList.add('lose');sfx.pop(.5)}s.classList.toggle('on',on)})},
  /* star meter: green ★★★ zone, yellow ★★ zone, red ★ zone and a marker for moves used */
  moves(m,s3,s2,limit){
    const max=limit||s2+Math.max(2,Math.ceil(s2*.4)),pct=v=>clamp(v/max*100,0,100),n=m<=s3?3:m<=s2?2:1,info=$('#hudInfo'),key=[s3,s2,limit].join();
    if(meterKey!==key){meterKey=key;info.innerHTML=`<div class="meter"><div class="mtx"><span>Moves <b class="mv"></b>${limit?` / ${limit}`:''}</span><span class="nx"></span></div><div class="mbar"><i class="z3" style="width:${pct(s3)}%"></i><i class="z2" style="width:${pct(s2)-pct(s3)}%"></i><i class="z1" style="width:${100-pct(s2)}%"></i><div class="mk"></div></div></div>`}
    $('.mv',info).textContent=m;
    $('.nx',info).textContent=n===3?`★★★ within ${s3}`:n===2?`★★ within ${s2}`:limit?`${limit-m} left`:'★ finish it!';
    $('.mk',info).style.left=pct(m)+'%';
    if(cur){if(cur.last&&cur.last.m<=s3&&m===s3+1&&!cur.warned&&!cur.over){cur.warned=true;toast('★★★ slipped away! Tap ↩️ Undo or 🔄 Restart to get it back')}cur.last={m,s3,s2}}
    api.setStars(n);
  },
  win(stars){onWin(stars)},
  fail(t,m){onFail(t,m)},
  over:()=>!cur||cur.over,
  /* a win is certain but still playing out its animation: no hint, skip, restart, undo or back may throw it away */
  lock(){if(cur)cur.locked=true},
  shake(){board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake')},
  coach(t){const c=$('#coach');if(c._t===t)return;c._t=t;c.innerHTML=t;if(t&&!REDUCED&&c.animate)c.animate([{transform:'scale(.9)',opacity:.4},{transform:'scale(1.06)',opacity:1,offset:.6},{transform:'none'}],{duration:340,easing:'cubic-bezier(.3,1.6,.5,1)'})},
  setTip(h){$('#instr').innerHTML=h},
  flash(e,ms=2600){e.classList.add('hint');clearTimeout(e._ht);e._ht=setTimeout(()=>e.classList.remove('hint'),ms)},
  good(e,o={}){
    if(!cur||cur.over)return;const k=++cur.combo;if(!o.silent)sfx.combo(k);
    if(e&&k>=2){const[x,y]=centerOf(e);floatText(x,y-26,k>=5?`Combo ×${k}! 🔥`:`×${k}`,k>=5)}
    if(k===5||k===10)buzz([20,30,20]);
    if(k>=3)emit('combo',k);
  },
  meh(){if(cur)cur.combo=0},
  stagger(els,step=18){els.forEach((e,i)=>{e.style.animationDelay=i*step+'ms';e.classList.add('popin');
    const end=ev=>{if(ev.target!==e)return;e.classList.remove('popin');e.style.animationDelay='';e.removeEventListener('animationend',end)};e.addEventListener('animationend',end)})}
};
function startLevel(n,opts={}){
  if(opts.daily&&dailyDone()){toast(`✅ Done for today! New challenge in ${fmtTime(untilMidnight())}`);sfx.bad();return}
  if(cur&&cur.puz&&cur.puz.destroy)cur.puz.destroy();
  const daily=!!opts.daily;let type,tier,seed;
  if(daily){const c=dailyCfg();type=c.type;tier=c.tier;seed=c.seed}
  else{type=typeFor(n);tier=tierFor(n);seed=hashSeed(n,TYPES.indexOf(type)+1)}
  const bonus=!daily&&isBonus(n);
  board.innerHTML='';closeModal();pendingUnlock=null;
  $('#hudStars').innerHTML=STAR+STAR+STAR;meterKey='';$('#hudInfo').innerHTML='';
  $('#ptitle').textContent=daily?'📅 Daily Challenge':bonus?`👑 Level ${n}`:'Level '+n;
  $('.ptitle').classList.toggle('bonus',bonus||daily);
  $('#psub').textContent=INFO[type].icon+' '+INFO[type].name+(bonus?' · BONUS 2× coins':daily?' · big reward!':'');
  $('#instr').textContent=INFO[type].tip;api.coach('');
  cur={level:n,type,daily,bonus,over:false,locked:false,history:[],puz:null,combo:0,hinted:false,last:null,dday:daily?today():0,t0:performance.now()};
  cur.puz=MAKERS[type]({R:rngOf(seed),tier,level:n,board,api});
  cur.history=[cur.puz.snap()];
  $('#undoBtn').disabled=!!cur.puz.noUndo;$('#skipBtn').disabled=daily;
  refreshHUD();show('play');sfx.whoosh();
  const me=cur,go=()=>{if(cur===me&&cur.puz.begin)cur.puz.begin();resetNudge(true)};
  if(!S.seen[type])showHowTo(type,go);else{go();showIntro()}
}
/* level intro: a short banner that names the puzzle and states the 3-star goal */
function showIntro(){
  if(!cur)return;$$('.lvintro').forEach(e=>e.remove());
  const c=cur,i=INFO[c.type],L=c.last,best=c.daily?0:S.stars[c.level]||0;
  const goal=L?`★★★ in ${L.s3} moves or fewer`:'';
  const b=el('div','lvintro',`<div class="lvi-card" style="--tc:${i.col}"><div class="lvi-ic">${i.icon}</div>
    <small>${c.daily?'DAILY CHALLENGE':c.bonus?'👑 BONUS LEVEL · 2× COINS':'LEVEL '+c.level}</small><b>${i.name}</b>
    ${goal?`<em>${goal}</em>`:''}${best?`<span class="lvi-best">Your best: ${'★'.repeat(best)}${'☆'.repeat(3-best)}</span>`:''}</div>`);
  $('#play').appendChild(b);
  setTimeout(()=>b.classList.add('out'),1500);setTimeout(()=>b.remove(),2100);
}
let nudgeT=0,nudges=0;
function resetNudge(full){
  clearTimeout(nudgeT);if(full)nudges=0;
  if(!cur||cur.over||cur.puz.noNudge)return;
  /* a quiet helping hand after a long pause: the hint just appears (no toast, no sound), at most twice per level */
  nudgeT=setTimeout(()=>{
    if(!cur||cur.over||nudges>=2)return;
    if($('#modal').classList.contains('on')||document.hidden){resetNudge();return}
    nudges++;cur.puz.hint();resetNudge();
  },cur.level<=6&&!cur.daily?12000:24000);
}
$('#play').addEventListener('pointerdown',()=>resetNudge());
addEventListener('keydown',()=>resetNudge());
/* the board ignores taps in the first 250 ms of a level: the second tap of a double-tap on Next / Replay lands there */
['pointerdown','click'].forEach(t=>board.addEventListener(t,e=>{if(cur&&performance.now()<cur.t0+250){e.stopPropagation();e.preventDefault()}},true));
function showHowTo(type,done){
  const h=HOWTO[type],i=INFO[type],gotIt=()=>{S.seen[type]=true;save();closeModal();if(done)done()};
  openModal(`<div class="kicker">How to play</div><h2>${i.name}</h2><p class="goal"><b>Goal</b> ${h.goal}</p><div class="demo">${h.demo()}</div><ol class="steps">${h.steps.map(t=>`<li>${t}</li>`).join('')}</ol>`,
    [{label:'Got it! ▶',cls:'big',fn:gotIt}],{icon:i.icon,cls:'howto',dismiss:gotIt});
}
function exitLevel(){if(cur&&cur.puz&&cur.puz.destroy)cur.puz.destroy();cur=null;clearTimeout(nudgeT)}
function undo(){
  if(!cur||cur.over||cur.locked||cur.puz.noUndo)return;
  if(cur.history.length<2){sfx.bad();return}
  cur.history.pop();cur.puz.restore(cur.history[cur.history.length-1]);sfx.swish();cur.combo=0;
}
const HINT_COST=ECON.hint.cost,SKIP_COST=ECON.skip.cost;
function useHint(){
  if(!cur||cur.over||cur.locked)return;
  const free=S.hints>0;
  if(!free&&S.coins<HINT_COST){toast('Not enough coins for a hint');sfx.bad();return}
  if(cur.puz.hint()===false)return;   // the mode had nothing to show (it says why): no charge, and no "used a hint" mark
  if(free)S.hints--;else S.coins-=HINT_COST;
  cur.hinted=true;emit('hint',1);save();refreshHUD();sfx.good();
}
function skipLevel(){
  if(!cur||cur.over||cur.locked||cur.daily)return;
  const n=cur.level,hasToken=S.skips>0;
  openModal(`<h2>Skip level?</h2><p>Move on to the next level. This level stays unstarred so you can come back for stars later.</p>
    <div class="reward cost">${hasToken?'<span>Use 1 skip token</span>':`<i class="coin"></i><b>${SKIP_COST}</b>`}</div>`,
    [{label:'Cancel',cls:'sec',fn:closeModal},{label:'Skip ⏭️',fn:()=>{
      if(!cur||cur.over||cur.locked||cur.level!==n){closeModal();return}   // the level was won (or changed) while this was open
      if(hasToken)S.skips--;else if(S.coins>=SKIP_COST)S.coins-=SKIP_COST;else{closeModal();toast('Not enough coins');sfx.bad();return}
      if(S.unlocked<=n)S.unlocked=n+1;S.streak=0;save();refreshHUD();playLevel(n+1,{},$('#modal .mbtns .btn:last-child'));
    }}],{icon:'⏭️',back:closeModal});
}
function onWin(stars){
  if(cur.over)return;cur.over=true;clearTimeout(nudgeT);
  const me=cur,n=cur.level,daily=cur.daily;
  let coins,prev=0,streakBonus=0,chest=0,dstreak=0;
  /* a daily is booked to the day it was STARTED (a win after midnight still counts for that day) and only once; a
     replay of a 3-star level earns little XP, no streak bonus and doesn't extend the streak */
  const dd=cur.dday,booked=daily&&S.dchal.last>=dd,replay3=!daily&&(S.stars[n]||0)===3;
  if(!booked&&!replay3){if(stars===3)S.streak++;else S.streak=0}
  if(daily){
    dstreak=S.dchal.streak;coins=0;
    if(!booked){
      dstreak=S.dchal.last===dd-1?S.dchal.streak+1:1;S.dchal.last=dd;S.dchal.streak=dstreak;
      coins=dailyReward(stars,dstreak);
      if(stars===3&&S.streak>=2){streakBonus=levelReward(3,3,false,S.streak).streakBonus}
    }
  }else{
    prev=S.stars[n]||0;
    const r=levelReward(prev,stars,cur.bonus,S.streak);coins=r.coins-r.streakBonus;streakBonus=replay3?0:r.streakBonus;
    if(stars>prev)S.stars[n]=stars;
    if(S.unlocked<=n){S.unlocked=n+1;pendingUnlock={n,stars}}
  }
  coins+=streakBonus;S.coins+=coins;
  while(totalStars()>=msThreshold(S.milestone)){chest+=chestReward(S.milestone);S.milestone++}
  S.coins+=chest;
  const xpGain=booked?0:Math.round(xpForWin(stars,daily,cur.bonus)*(replay3?.2:1)),xr=addXP(xpGain);
  save();
  emit('win',{stars,type:cur.type,hinted:cur.hinted,daily:daily&&!booked});
  if(daily&&!booked)emit('daily',1);
  emit('coins',coins+chest);
  sfx.win();buzz([30,40,60]);confetti();
  const[bx,by]=centerOf(board);burst(bx,by,'#ffd166',50,1.8);ring(bx,by,'#fff',420,900);
  const els=$$('#board .cell,#board .tube,#board .cel'),step=Math.min(28,700/Math.max(1,els.length));
  els.forEach((c,i)=>{c.style.animationDelay=i*step+'ms';c.classList.add('celebrate')});
  const L=cur.last,near=!daily&&stars<3&&L?L.m-(stars===2?L.s3:L.s2):0;
  setTimeout(()=>{
    if(cur!==me)return;
    const lvFrom=xr.from,needFrom=xpNeed(lvFrom.lv);
    openModal(`<svg class="sdefs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="hudSG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--acc) 30%,#fff)"/><stop offset=".5" style="stop-color:var(--acc)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--acc) 65%,#e05a00)"/></linearGradient></defs></svg><div class="rays"></div><div class="rays r2"></div><div class="wglow"></div>
      <div class="ribbon ${daily||me.bonus?'gold':''}"><span>${daily?'DAILY CLEAR!':me.bonus?'BONUS CLEAR!':`LEVEL ${n} CLEAR!`}</span></div>
      <div class="bigstars">${[0,1,2].map(i=>`<div class="sock ${i<stars?'on':''}" style="--d:${i*.38+.25}s">${STAR}</div>`).join('')}</div>
      <div class="verdict" style="--d:${stars*.38+.35}s">${stars===3?'PERFECT!':stars===2?'GREAT JOB!':'CLEARED!'}</div>
      <div class="reward"><i class="coin"></i><b>+<span id="cntUp">0</span></b></div>
      <div class="xpline"><span class="lvb" id="xpLv">Lv ${lvFrom.lv}</span><div class="bar"><div id="xpFill" style="width:${lvFrom.xp/needFrom*100}%"></div></div><span class="xpg">+${xpGain} XP</span></div>
      <div id="lvSlot"></div>
      ${me.bonus?'<div class="extra gold">👑 Bonus level: double coins!</div>':''}
      ${daily?`<div class="extra gold">📅 Daily streak: ${dstreak} day${dstreak>1?'s':''}! Come back tomorrow</div>`:''}
      ${streakBonus?`<div class="extra">🔥 3-star streak ×${S.streak}: +${streakBonus}</div>`:''}
      ${stars>prev&&prev>0?`<div class="extra">🏅 New best!</div>`:''}
      ${chest?`<div class="extra gold">🎁 Star chest opened: +${chest} coins!</div>`:''}
      ${stars===3?'':near>0?`<p class="nearmiss">So close! Just ${near} move${near>1?'s':''} from ${stars===2?'★★★':'★★'}. Replay?</p>`:'<p>Replay to chase 3 stars!</p>'}`,
      daily?[{label:'Home',cls:'sec',fn:b=>playExit('home',b)},{label:'Keep playing ▶',cls:'big',fn:b=>playLevel(S.unlocked,{},b)}]
      :[{label:'Levels',cls:'sec sm',fn:b=>playExit('map',b)},
       {label:'Replay',cls:'sec sm',fn:b=>playLevel(n,{},b)},
       {label:'Next ▶',cls:'big',fn:b=>playLevel(n+1,{},b)}],{cls:'win',back:()=>playExit(daily?'home':'map')});
    for(let i=0;i<stars;i++)setTimeout(()=>{if(cur!==me)return;sfx.star(i);buzz(20);const s=$$('.bigstars .sock')[i];if(s){s.classList.add('hit');const[x,y]=centerOf(s);burst(x,y,'#ffd166',26+i*8,1.1+i*.15);ring(x,y,'#ffd166',150+i*30);ring(x,y,'#fff',90,420);
      const c=$('#modal .card');if(c&&c.animate)c.animate([{transform:'none'},{transform:`translateY(${5+i*2}px) scale(.985)`},{transform:'none'}],{duration:220,easing:'ease-out'})}},(i*.38+.58)*1000);
    // coin count-up
    const total=coins,t0=performance.now()+300,dur=900;let lt=0;
    const countUp=t=>{const e=$('#cntUp');if(!e||cur!==me)return;const k=clamp((t-t0)/dur,0,1);e.textContent=Math.round(total*(1-Math.pow(1-k,3)));
      if(k>0&&k<1&&t-lt>70){lt=t;sfx.tick(1.5+k)}if(k<1)requestAnimationFrame(countUp);else{const r=$('#modal .reward');if(r)r.classList.add('done')}};
    requestAnimationFrame(countUp);
    setTimeout(()=>{if(cur===me)flyCoins($('.reward .coin'),Math.min(12,4+total/4|0))},600+stars*380);
    // XP bar (with level-up flourish)
    setTimeout(()=>{
      const f=$('#xpFill');if(!f||cur!==me)return;
      if(!xr.ups.length){f.style.width=S.xp/xpNeed(S.plv)*100+'%';return}
      f.style.width='100%';
      setTimeout(()=>{
        if(cur!==me||!$('#xpFill'))return;const u=xr.ups[xr.ups.length-1];
        f.style.transition='none';f.style.width='0';void f.offsetWidth;f.style.transition='';f.style.width=S.xp/xpNeed(S.plv)*100+'%';
        $('#xpLv').textContent='Lv '+S.plv;
        $('#lvSlot').innerHTML=`<div class="lvup">🆙 LEVEL UP! ${rankOf(u.lv)} · +${xr.ups.reduce((a,b)=>a+b.coins,0)} coins${xr.ups.some(x=>x.skip)?' · +1 ⏭️':''}</div>`;
        sfx.levelup();const s=$('.lvup');if(s){const[x,y]=centerOf(s);burst(x,y,'#b26bff',40,1.4);fountain(x,y,40)}
        refreshCoins();
      },900);
    },1500+stars*300);
    refreshHUD();
  },1000);
}
function onFail(title,msg){
  if(cur.over)return;cur.over=true;sfx.fail();buzz(200);api.meh();
  const me=cur;
  setTimeout(()=>cur===me&&openModal(`<div class="kicker">${me.daily?'Daily challenge':'Level '+me.level}</div><h2>${title}</h2><p>${msg}</p><div class="failtip">💡 Stuck? A hint shows the best next move</div>`,[
    me.daily?{label:'Home',cls:'sec sm',fn:b=>playExit('home',b)}:{label:'Levels',cls:'sec sm',fn:b=>playExit('map',b)},
    {label:'Try again 🔄',cls:'big',fn:b=>playLevel(me.level,{daily:me.daily},b)}],{icon:'😵‍💫',cls:'fail',back:()=>playExit(me.daily?'home':'map')}),700);
}

/* ====================== modal / screens ====================== */
function openModal(html,btns,o={}){
  const m=$('#modal'),st=o.still?' style="animation:none"':'';
  clearTimeout(closeModal.t);m.classList.remove('closing');
  if(!m.classList.contains('on')){const a=document.activeElement;m._prevFocus=a&&a!==document.body?a:null}
  m.dataset.noenter=o.noEnter?'1':'';
  m._dismiss=o.dismiss||null;m._back=o.back||o.dismiss||null;   // dismiss: tap on the dimmed backdrop; back: Escape / the phone's Back button
  /* .mbody scrolls (medal and content); .mbtns is a separate footer, so buttons are never on top of content */
  m.innerHTML=`<div class="card ${o.wide?'wide':''} ${o.cls||''}${o.still?' still':''}" role="dialog" aria-modal="true"${st}><div class="mbody">${o.icon?`<div class="medal"${st}><span>${o.icon}</span></div>`:''}${html}</div><div class="mfade"></div><div class="mbtns"></div></div>`;
  const card=$('.card',m),body=$('.mbody',m),row=$('.mbtns',m);
  $$('.rays,.wglow',body).forEach(e=>card.prepend(e));   // the win card's light show is clipped by the card, not by the scrolling body
  const more=()=>card.classList.toggle('canscroll',body.scrollHeight-body.scrollTop-body.clientHeight>6);   // soft fade at the bottom while there is more to scroll
  body.addEventListener('scroll',more,{passive:true});requestAnimationFrame(more);setTimeout(more,600);
  btns.forEach((b,i)=>{const big=/\bbig\b/.test(b.cls||''),x=el('button','btn '+(b.cls||''),b.label+(big?'<span class="shine"></span>':''));x.style.setProperty('--i',i);
    /* a button works once per tap (no double-charge on a double tap); a handler that returns false declines and re-arms it */
    x.onclick=()=>{if(x.disabled)return;x.disabled=true;sfx.click();if(b.fn(x)===false)x.disabled=false};row.appendChild(x)});
  m.classList.add('on');Q.setModal(true);syncGuard();
  const fb=o.noEnter?row.firstChild:row.lastChild;if(fb)try{fb.focus({preventScroll:true})}catch(_){}
}
/* popups that appear on their own (welcome, daily reward) wait until the player is on the home screen with nothing open */
const modalQ=[];
function queueModal(fn,delay=0){modalQ.push(fn);setTimeout(drainModalQ,delay)}
function drainModalQ(){
  if(!modalQ.length)return;const m=$('#modal');
  if(m.classList.contains('on')||m.classList.contains('closing')||Trans.busy||!$('#home').classList.contains('active'))return;
  modalQ.shift()();
}
/* ---- the phone's Back button ----
   While anything is open (a popup, a level, the map or shop) one extra history entry stands guard: Back consumes it and
   we close the popup, leave the level or go home instead. With nothing open we pass the Back on, so the game still exits. */
let guard=false;
function syncGuard(){
  const need=$('#modal').classList.contains('on')||!$('#home').classList.contains('active');
  if(need&&!guard){try{history.pushState({g:1},'');guard=true}catch(_){}}
}
addEventListener('popstate',()=>{
  guard=false;const m=$('#modal');
  if(m.classList.contains('on')){const f=m._back;if(f&&!Trans.busy)f();syncGuard();return}
  if(Trans.busy){syncGuard();return}
  if($('#play').classList.contains('active')){$('#backBtn').click();syncGuard();return}
  if($('#map').classList.contains('active')||$('#shop').classList.contains('active')){show('home');return}
  history.back();   // the home screen: let the Back button really leave
});
/* closing is instant for the game (state flips now); the card just plays a short exit while it fades */
function closeModal(){
  const m=$('#modal');if(!m.classList.contains('on'))return;
  m.classList.remove('on');Q.setModal(false);
  const pf=m._prevFocus;m._prevFocus=null;if(pf&&pf.isConnected)try{pf.focus({preventScroll:true})}catch(_){}
  setTimeout(drainModalQ,450);
  if(REDUCED||Q.tier==='low')return;
  m.classList.add('closing');clearTimeout(closeModal.t);closeModal.t=setTimeout(()=>m.classList.remove('closing'),200);
}
function show(id,o={}){
  Trans.go(id,o,()=>{
    $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
    if(id==='home')renderHome();if(id==='map')renderMap();if(id==='shop')renderShop();
    Music.setMode(id==='play'?'play':'menu');BG.setCalm(id==='play'?1:0);
    refreshHUD();syncGuard();
    if(id==='home')setTimeout(drainModalQ,700);
  });
}
/* enter a level through the iris, growing from the button or map node that was tapped */
function playLevel(n,opts={},from){
  const type=opts.daily?dailyCfg().type:typeFor(n);
  Trans.iris({from,color:INFO[type].col},()=>startLevel(n,opts));
}
/* leave the level: the iris closes from the back button and reopens on the level's map node (or the Play button) */
function playExit(to='map',from){
  const n=cur&&cur.level,col=cur?INFO[cur.type].col:'#7c6bff';
  Trans.iris({from:from||$('#backBtn'),color:col,to:()=>to==='map'?$(`.node[data-n="${n}"]`)||$('.node.cur'):$('#playBtn')},()=>{closeModal();exitLevel();show(to)});
}
function refreshCoins(){$$('.coinval').forEach(e=>e.textContent=S.coins)}
function refreshHUD(){
  refreshCoins();
  $('#hintBadge').innerHTML=S.hints>0?S.hints:`<i class="coin" style="width:11px;height:11px"></i>${HINT_COST}`;
  $('#skipBadge').innerHTML=S.skips>0?S.skips:`<i class="coin" style="width:11px;height:11px"></i>${SKIP_COST}`;
}
/* ====================== wiring ====================== */
$('#playBtn').onclick=()=>{sfx.good();playLevel(S.unlocked,{},$('#playBtn'))};
$('#homeMap').onclick=()=>{sfx.click();show('map')};
$('#homeShop').onclick=()=>{sfx.click();show('shop')};
$('#settingsBtn').onclick=()=>{sfx.click();showSettings()};
$('#profileBtn').onclick=()=>{sfx.click();showProfile()};
$('#tDaily').onclick=()=>{sfx.click();startDaily()};
$('#tSpin').onclick=()=>{sfx.click();showSpin()};
$('#tQuests').onclick=()=>{sfx.click();showQuests()};
$('#tTrophy').onclick=()=>{sfx.click();showTrophies()};
$$('[data-go]').forEach(b=>b.onclick=()=>{sfx.click();show(b.dataset.go)});
$('#backBtn').onclick=()=>{if(Trans.busy||(cur&&cur.locked&&!cur.over))return;sfx.click();playExit(cur&&cur.daily?'home':'map')};
$('#undoBtn').onclick=undo;
$('#hintBtn').onclick=useHint;
$('#helpBtn').onclick=()=>{if(cur){sfx.click();showHowTo(cur.type)}};
$('#restartBtn').onclick=()=>{if(cur&&!cur.over&&!cur.locked){sfx.click();startLevel(cur.level,{daily:cur.daily})}};
$('#skipBtn').onclick=skipLevel;
// desktop shortcuts: U/Z undo, H hint, R restart, Enter or Space presses the main popup button, Esc goes back
$('#modal').addEventListener('pointerdown',e=>{if(e.target===e.currentTarget&&e.currentTarget._dismiss&&!Trans.busy)e.currentTarget._dismiss()});
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input'))return;
  const m=$('#modal.on'),k=e.key.toLowerCase();
  if(m&&k==='escape'){if(m._back)m._back();return}
  if(m&&(k==='enter'||k===' ')){
    const ae=document.activeElement;
    if(ae&&m.contains(ae)&&ae.matches('button,input,a'))return;   // the browser presses the focused control itself
    if(m.dataset.noenter)return;                                  // destructive popups are never answered by a bare key
    const b=$('.mbtns .btn:last-child',m);if(b&&!b.disabled){e.preventDefault();b.click()}return}
  if(m||!$('#play').classList.contains('active'))return;
  if(k==='u'||(k==='z'&&(e.ctrlKey||e.metaKey))){e.preventDefault();undo()}
  else if(k==='h')useHint();
  else if(k==='r')$('#restartBtn').click();
  else if(k==='escape')$('#backBtn').click();
});
const wake=()=>{audio();Music.start()};
// iOS Safari only unlocks audio inside certain gestures (touchend/click), so keep trying until it's running
const WAKE_EVENTS=['pointerdown','touchend','click','keydown'];
WAKE_EVENTS.forEach(ev=>addEventListener(ev,wakeUntilRunning,{passive:true}));
/* these stay for good: iOS suspends the audio context after a call or a trip to another app, and only a tap revives it */
function wakeUntilRunning(){if(!AU.ctx||AU.ctx.state!=='running')wake()}

buildLogo();applyTheme();BG.start();ensureQuests();checkAch();refreshHUD();renderHome();
if(S.welcome3)queueModal(()=>{if(S.welcome3)showWelcome()},700);else if(loginDue())queueModal(()=>{if(loginDue())showLogin()},800);
setInterval(()=>{if($('#home').classList.contains('active')&&!document.hidden&&!Q.modal)tickHome()},1000);
/* another tab saved: take its progress instead of overwriting it with this tab's older copy on the next save */
addEventListener('storage',e=>{
  if(e.key!==KEY||!e.newValue)return;
  const fresh=load();Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,fresh);
  applyTheme();refreshHUD();const a=$('.screen.active');if(a&&a.id!=='play')show(a.id);
  toast('Progress updated from another tab');
});
window.__game={S,TYPES,typeFor,startLevel,get cur(){return cur},show,api,closeModal};
