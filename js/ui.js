'use strict';
/* ====================== game harness ====================== */
let cur=null,meterKey='';
const board=$('#board');
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
    if(cur)cur.last={m,s3,s2};
    api.setStars(n);
  },
  win(stars){onWin(stars)},
  fail(t,m){onFail(t,m)},
  over:()=>!cur||cur.over,
  shake(){board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake')},
  coach(t){$('#coach').innerHTML=t},
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
  if(cur&&cur.puz&&cur.puz.destroy)cur.puz.destroy();
  const daily=!!opts.daily;let type,tier,seed;
  if(daily){const c=dailyCfg();type=c.type;tier=c.tier;seed=c.seed}
  else{type=typeFor(n);tier=tierFor(n);seed=hashSeed(n,TYPES.indexOf(type)+1)}
  const bonus=!daily&&isBonus(n);
  board.innerHTML='';closeModal();
  $('#hudStars').innerHTML=STAR+STAR+STAR;meterKey='';$('#hudInfo').innerHTML='';
  $('#ptitle').textContent=daily?'📅 Daily Challenge':bonus?`👑 Level ${n}`:'Level '+n;
  $('.ptitle').classList.toggle('bonus',bonus||daily);
  $('#psub').textContent=INFO[type].icon+' '+INFO[type].name+(bonus?' · BONUS 2× coins':daily?' · big reward!':'');
  $('#instr').textContent=INFO[type].tip;$('#coach').textContent='';
  cur={level:n,type,daily,bonus,over:false,history:[],puz:null,combo:0,hinted:false,last:null};
  cur.puz=MAKERS[type]({R:rngOf(seed),tier,level:n,board,api});
  cur.history=[cur.puz.snap()];
  $('#undoBtn').disabled=!!cur.puz.noUndo;$('#skipBtn').disabled=daily;
  refreshHUD();show('play');sfx.whoosh();
  const me=cur,go=()=>{if(cur===me&&cur.puz.begin)cur.puz.begin();resetNudge(true)};
  if(!S.seen[type])showHowTo(type,go);else go();
}
let nudgeT=0,nudges=0;
function resetNudge(full){
  clearTimeout(nudgeT);if(full)nudges=0;
  if(!cur||cur.over||cur.puz.noNudge)return;
  nudgeT=setTimeout(()=>{
    if(!cur||cur.over||nudges>=3)return;
    if($('#modal').classList.contains('on')){resetNudge();return}
    nudges++;toast('Stuck? Here\'s a free hint 💡');sfx.good();cur.puz.hint();resetNudge();
  },cur.level<=6&&!cur.daily?7000:16000);
}
$('#play').addEventListener('pointerdown',()=>resetNudge());
function showHowTo(type,done){
  const h=HOWTO[type],i=INFO[type];
  openModal(`<h2>${i.icon} ${i.name}</h2><p class="goal"><b>Goal:</b> ${h.goal}</p><div class="demo">${h.demo()}</div><ol class="steps">${h.steps.map(t=>`<li>${t}</li>`).join('')}</ol>`,
    [{label:'Got it! ▶',cls:'big',fn:()=>{S.seen[type]=true;save();closeModal();if(done)done()}}]);
}
function exitLevel(){if(cur&&cur.puz&&cur.puz.destroy)cur.puz.destroy();cur=null;clearTimeout(nudgeT)}
function undo(){
  if(!cur||cur.over||cur.puz.noUndo)return;
  if(cur.history.length<2){sfx.bad();return}
  cur.history.pop();cur.puz.restore(cur.history[cur.history.length-1]);sfx.swish();cur.combo=0;
}
const HINT_COST=15,SKIP_COST=60;
function useHint(){
  if(!cur||cur.over)return;
  if(S.hints>0)S.hints--;
  else if(S.coins>=HINT_COST)S.coins-=HINT_COST;
  else{toast('Not enough coins for a hint');sfx.bad();return}
  cur.hinted=true;emit('hint',1);save();refreshHUD();sfx.good();cur.puz.hint();
}
function skipLevel(){
  if(!cur||cur.over||cur.daily)return;
  const n=cur.level,hasToken=S.skips>0;
  openModal(`<h2>Skip level?</h2><p>Move on to the next level. This level stays unstarred so you can come back for stars later.</p>
    <div class="reward">${hasToken?'⏭️ Use 1 skip token':`<i class="coin"></i>${SKIP_COST}`}</div>`,
    [{label:'Cancel',cls:'sec',fn:closeModal},{label:'Skip ⏭️',fn:()=>{
      if(hasToken)S.skips--;else if(S.coins>=SKIP_COST)S.coins-=SKIP_COST;else{closeModal();toast('Not enough coins');sfx.bad();return}
      if(S.unlocked<=n)S.unlocked=n+1;S.streak=0;save();refreshHUD();startLevel(n+1);
    }}]);
}
function onWin(stars){
  if(cur.over)return;cur.over=true;clearTimeout(nudgeT);
  const me=cur,n=cur.level,daily=cur.daily;
  let coins,prev=0,streakBonus=0,chest=0,dstreak=0;
  if(daily){
    const d=today();dstreak=S.dchal.last===d-1?S.dchal.streak+1:1;S.dchal.last=d;S.dchal.streak=dstreak;
    coins=60+stars*10+Math.min(7,dstreak)*10;
  }else{
    prev=S.stars[n]||0;coins=prev?3:10;if(stars>prev)coins+=(stars-prev)*10;
    if(stars>prev)S.stars[n]=stars;
    if(S.unlocked<=n)S.unlocked=n+1;
    if(cur.bonus)coins*=2;
  }
  if(stars===3){S.streak++;if(S.streak>=2)streakBonus=Math.min(20,S.streak*2)}else S.streak=0;
  coins+=streakBonus;S.coins+=coins;
  while(totalStars()>=msThreshold(S.milestone)){chest+=msReward(S.milestone);S.milestone++}
  S.coins+=chest;
  const xpGain=10+stars*5+(daily?30:0)+(cur.bonus?10:0),xr=addXP(xpGain);
  save();
  emit('win',{stars,type:cur.type,hinted:cur.hinted,daily});
  if(daily)emit('daily',1);
  emit('coins',coins+chest);
  sfx.win();buzz([30,40,60]);confetti();
  const[bx,by]=centerOf(board);burst(bx,by,'#ffd166',50,1.8);ring(bx,by,'#fff',420,900);
  const els=$$('#board .cell,#board .tile,#board .pad,#board .tube,#board .cbtn'),step=Math.min(28,700/Math.max(1,els.length));
  els.forEach((c,i)=>{c.style.animationDelay=i*step+'ms';c.classList.add('celebrate')});
  const L=cur.last,near=!daily&&stars<3&&L?L.m-(stars===2?L.s3:L.s2):0;
  setTimeout(()=>{
    if(cur!==me)return;
    const lvFrom=xr.from,needFrom=xpNeed(lvFrom.lv);
    openModal(`<div class="rays"></div>
      <div class="ribbon ${daily||me.bonus?'gold':''}">${daily?'DAILY CLEAR!':me.bonus?'BONUS CLEAR!':`LEVEL ${n} CLEAR!`}</div>
      <div class="bigstars">${[0,1,2].map(i=>STAR.replace('<svg','<svg style="animation-delay:'+(i*.38+.25)+'s" class="'+(i<stars?'on':'')+'"')).join('')}</div>
      <div class="reward"><i class="coin"></i>+<span id="cntUp">0</span></div>
      <div class="xpline"><span id="xpLv">Lv ${lvFrom.lv}</span><div class="bar"><div id="xpFill" style="width:${lvFrom.xp/needFrom*100}%"></div></div><span>+${xpGain} XP</span></div>
      <div id="lvSlot"></div>
      ${me.bonus?'<div class="extra gold">👑 Bonus level: double coins!</div>':''}
      ${daily?`<div class="extra gold">📅 Daily streak: ${dstreak} day${dstreak>1?'s':''}! Come back tomorrow</div>`:''}
      ${streakBonus?`<div class="extra">🔥 3-star streak ×${S.streak}: +${streakBonus}</div>`:''}
      ${stars>prev&&prev>0?`<div class="extra">🏅 New best!</div>`:''}
      ${chest?`<div class="extra gold">🎁 Star chest opened: +${chest} coins!</div>`:''}
      ${stars===3?'<p>Perfect! ✨</p>':near>0?`<p class="nearmiss">So close! Just ${near} move${near>1?'s':''} from ${stars===2?'★★★':'★★'}. Replay?</p>`:'<p>Replay to chase 3 stars!</p>'}`,
      daily?[{label:'Home',cls:'sec',fn:()=>{closeModal();exitLevel();show('home')}},{label:'Keep playing ▶',cls:'big',fn:()=>startLevel(S.unlocked)}]
      :[{label:'Levels',cls:'sec sm',fn:()=>{closeModal();exitLevel();show('map')}},
       {label:'Replay',cls:'sec sm',fn:()=>startLevel(n)},
       {label:'Next ▶',cls:'big',fn:()=>startLevel(n+1)}]);
    for(let i=0;i<stars;i++)setTimeout(()=>{if(cur!==me)return;sfx.star(i);buzz(20);const s=$$('.bigstars svg')[i];if(s){const[x,y]=centerOf(s);burst(x,y,'#ffd166',22,1.1);ring(x,y,'#ffd166',140)}},(i*.38+.5)*1000);
    // coin count-up
    const total=coins,t0=performance.now()+300,dur=900;let lt=0;
    const countUp=t=>{const e=$('#cntUp');if(!e||cur!==me)return;const k=clamp((t-t0)/dur,0,1);e.textContent=Math.round(total*(1-Math.pow(1-k,3)));
      if(k>0&&k<1&&t-lt>70){lt=t;sfx.tick(1.5+k)}if(k<1)requestAnimationFrame(countUp)};
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
  setTimeout(()=>cur===me&&openModal(`<h2>${title}</h2><div style="font-size:64px;margin:6px 0">😵‍💫</div><p>${msg}</p>`,[
    me.daily?{label:'Home',cls:'sec sm',fn:()=>{closeModal();exitLevel();show('home')}}:{label:'Levels',cls:'sec sm',fn:()=>{closeModal();exitLevel();show('map')}},
    {label:'Try again 🔄',cls:'big',fn:()=>startLevel(me.level,{daily:me.daily})}]),700);
}

/* ====================== modal / screens ====================== */
function openModal(html,btns,o={}){
  const m=$('#modal');m.innerHTML=`<div class="card ${o.wide?'wide':''}"${o.still?' style="animation:none"':''}>${html}<div class="mbtns"></div></div>`;
  const row=$('.mbtns',m);
  btns.forEach(b=>{const x=el('button','btn '+(b.cls||''),b.label);x.onclick=()=>{sfx.click();b.fn(x)};row.appendChild(x)});
  m.classList.add('on');
}
function closeModal(){$('#modal').classList.remove('on')}
function show(id){
  $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
  if(id==='home')renderHome();if(id==='map')renderMap();if(id==='shop')renderShop();
  Music.setMode(id==='play'?'play':'menu');BG.setCalm(id==='play'?1:0);
  refreshHUD();
}
function refreshCoins(){$$('.coinval').forEach(e=>e.textContent=S.coins)}
function refreshHUD(){
  refreshCoins();
  $('#hintBadge').innerHTML=S.hints>0?S.hints:`<i class="coin" style="width:11px;height:11px"></i>${HINT_COST}`;
  $('#skipBadge').innerHTML=S.skips>0?S.skips:`<i class="coin" style="width:11px;height:11px"></i>${SKIP_COST}`;
}
/* ====================== wiring ====================== */
$('#playBtn').onclick=()=>{sfx.good();startLevel(S.unlocked)};
$('#homeMap').onclick=()=>{sfx.click();show('map')};
$('#homeShop').onclick=()=>{sfx.click();show('shop')};
$('#settingsBtn').onclick=()=>{sfx.click();showSettings()};
$('#profileBtn').onclick=()=>{sfx.click();showProfile()};
$('#tDaily').onclick=()=>{sfx.click();startDaily()};
$('#tSpin').onclick=()=>{sfx.click();showSpin()};
$('#tQuests').onclick=()=>{sfx.click();showQuests()};
$('#tTrophy').onclick=()=>{sfx.click();showTrophies()};
$$('[data-go]').forEach(b=>b.onclick=()=>{sfx.click();show(b.dataset.go)});
$('#backBtn').onclick=()=>{sfx.click();const d=cur&&cur.daily;exitLevel();show(d?'home':'map')};
$('#undoBtn').onclick=undo;
$('#hintBtn').onclick=useHint;
$('#helpBtn').onclick=()=>{if(cur){sfx.click();showHowTo(cur.type)}};
$('#restartBtn').onclick=()=>{if(cur){sfx.click();startLevel(cur.level,{daily:cur.daily})}};
$('#skipBtn').onclick=skipLevel;
const wake=()=>{audio();Music.start()};
addEventListener('pointerdown',wake,{once:true});addEventListener('keydown',wake,{once:true});

buildLogo();applyTheme();BG.start();ensureQuests();checkAch();refreshHUD();renderHome();
if(loginDue())setTimeout(()=>{if(!$('#modal').classList.contains('on'))showLogin()},800);
setInterval(()=>{if($('#home').classList.contains('active'))renderHome()},1000);
window.__game={S,typeFor,startLevel,get cur(){return cur},show,api};
