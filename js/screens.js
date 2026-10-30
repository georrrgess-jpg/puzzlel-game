'use strict';
/* ====================== menu screens: home, levels map, shop ====================== */
function buildLogo(){
  const cols=[0,1,2,3,5,6,7,8,0,2];
  $('#logoWord').innerHTML=[...'PUZZLE POP'].map((ch,i)=>ch===' '?'<span class="sp"></span>':`<span data-ch="${ch}" style="color:${COLORS[cols[i]]};--i:${i};animation-delay:${i*.12}s,${.2+i*.07}s">${ch}</span>`).join('');
}
function renderHome(){
  const stars=totalStars(),m=S.milestone,prevT=m?msThreshold(m-1):0,t=msThreshold(m),pct=clamp((stars-prevT)/(t-prevT)*100,4,100);
  /* the garden: your decorations on a bed of soil (tall phones show the bed even when it is empty, as a nudge towards the shop) */
  $('#garden').innerHTML=S.deco.map(id=>{const d=ECON.deco.find(x=>x.id===id);return d?`<i title="${d.name}" style="--k:${(hashSeed(id.length*7+id.charCodeAt(0),3)%100)/100}">${d.ic}</i>`:''}).join('')||'<em class="gempty">🌱 Your garden grows with Shop decorations</em>';
  $('#homeStars').textContent=`${stars} / ${t}`;
  $('#homeBar').style.width=pct+'%';
  $('#homeNext').textContent=`${t-stars} star${t-stars===1?'':'s'} to next chest`;
  $('#chestIco').classList.toggle('near',pct>=70);
  const n=S.unlocked,ty=typeFor(n),ni=$('#nextIcon');
  ni.textContent=INFO[ty].icon;ni.style.setProperty('--tc',INFO[ty].col);ni.parentElement.style.setProperty('--tcn',INFO[ty].col);
  const wn=Math.floor((n-1)/12);$('#heroWorld').textContent=`WORLD ${wn+1}`;$('#heroName').textContent=worldName(wn);
  $('#home .hero').style.setProperty('--wc',WCOL[wn%WCOL.length]);
  $('#nextName').textContent=`${isBonus(n)?'👑 ':''}Level ${n} · ${INFO[ty].name}`;
  const res=S.resume&&S.resume.n===n;$('#playBtn').classList.toggle('resume',!!res);
  /* the card already names the level, so PLAY only adds a line when there is something new to say */
  const pl=res?`Continue level ${n}`:isBonus(n)?'2× coins bonus level':'';$('#playLvl').textContent=pl;$('#playLvl').hidden=!pl;
  const sp=$('#streakPill');sp.innerHTML=`🔥 ${S.streak}<small>streak</small>`;sp.hidden=!S.streak;sp.classList.toggle('hot',S.streak>=2);
  $('#plv').textContent=S.plv;$('#prank').textContent=rankOf(S.plv);$('#pxp').textContent=`${S.xp} / ${xpNeed(S.plv)} XP`;$('#pxpFill').style.width=Math.min(100,S.xp/xpNeed(S.plv)*100)+'%';
  /* the XP ring runs from where it was when you last looked to where it is now (all the way round first after a level-up) */
  const arc=$('#xpArc'),ratio=S.xp/xpNeed(S.plv),off=119.4*(1-ratio),was=renderHome._xp;
  if(was&&!REDUCED&&(was.plv!==S.plv||was.ratio!==ratio)&&$('#home').classList.contains('active')){
    const jump=v=>{arc.style.transition='none';arc.style.strokeDashoffset=v;void arc.getBoundingClientRect();arc.style.transition=''};
    jump(119.4*(1-was.ratio));
    if(was.plv!==S.plv){requestAnimationFrame(()=>{arc.style.strokeDashoffset=0});setTimeout(()=>{jump(119.4);arc.style.strokeDashoffset=off},1050)}
    else requestAnimationFrame(()=>{arc.style.strokeDashoffset=off});
  }else arc.style.strokeDashoffset=off;
  renderHome._xp={plv:S.plv,ratio};
  const ringP=(id,p)=>$(id).style.setProperty('--p',Math.round(clamp(p,0,1)*100));
  const dd=dailyDone();ringP('#tDaily',dd?1:0);ringP('#tSpin',spinReady()?1:typeof SPIN_CD!=='undefined'?1-(S.spinAt-Date.now())/SPIN_CD:0);
  ringP('#tQuests',S.quests.list.filter(q=>q.claimed).length/3);ringP('#tTrophy',achCount()/ACH.length);
  $('#tDaily').classList.toggle('on',!dd);$('#dailySub').textContent=dd?`✅ ${fmtTime(untilMidnight())}`:'Play now!';
  const sr=spinReady();renderHome._k=dd+'|'+sr;$('#tSpin').classList.toggle('on',sr);$('#spinSub').textContent=sr?'Free spin!':fmtTime(S.spinAt-Date.now());
  const qr=questsReady(),qd=S.quests.list.filter(q=>q.claimed).length;$('#tQuests').classList.toggle('on',qr>0);$('#questSub').textContent=qr?`${qr} to claim!`:`${qd}/3 done`;
  $('#achSub').textContent=`${achCount()}/${ACH.length}`;
  refreshCoins();
}
/* once a second: only the countdown labels, and only when their text actually changed (avoids pointless relayout) */
const setTxt=(sel,t)=>{const e=$(sel);if(e.textContent!==t)e.textContent=t};
function tickHome(){
  const dd=dailyDone(),sr=spinReady();
  setTxt('#dailySub',dd?`✅ ${fmtTime(untilMidnight())}`:'Play now!');
  setTxt('#spinSub',sr?'Free spin!':fmtTime(S.spinAt-Date.now()));
  if(dd+'|'+sr!==renderHome._k)renderHome();   // a state flipped (spin ready, daily reset): full refresh
}
let mapCount=48,mapSig='',mapTop=0;
const PADLOCK='<svg class="pad" viewBox="0 0 24 28"><path d="M6 12V8a6 6 0 0 1 12 0v4" fill="none" stroke="#cfd3e6" stroke-width="3.2" stroke-linecap="round"/><rect x="2.5" y="11" width="19" height="15" rx="4" fill="#f2c94c" stroke="#8a6200" stroke-width="1.4"/><rect x="2.5" y="11" width="19" height="5" rx="3" fill="#ffffff55"/><circle cx="12" cy="18.5" r="2.3" fill="#6b4a00"/><rect x="11" y="19" width="2" height="4.2" rx="1" fill="#6b4a00"/></svg>';
const WCOL=['#5b6cff','#22b8c9','#e45bc4','#2ecc8f','#8b5cf6','#ff7a45','#3a86ff','#d9a21b','#14b8a6','#7b61ff','#ff5d73','#a855f7'];
const starSig=()=>{let h=0;for(const k in S.stars)h=(h*31+(+k)*4+S.stars[k])|0;return h};
/* set by onWin on the first clear of the newest level; the next map visit celebrates it (not saved: a reload just skips it) */
let pendingUnlock=null;
function renderMap(more){
  const pu=pendingUnlock&&pendingUnlock.n<S.unlocked?pendingUnlock:null;pendingUnlock=null;
  const lim=pu?pu.n:S.unlocked,g=$('#mapgrid'),wrap=$('#mapwrap'),sig=lim+'|'+mapCount+'|'+starSig()+'|'+(S.resume?S.resume.n:0);
  /* nothing changed since the last visit: keep the DOM (the map is the heaviest screen) and the scroll position */
  if(!pu&&!more&&g.children.length&&mapSig===sig){requestAnimationFrame(()=>{wrap.scrollTop=mapTop;watchCur()});return}
  mapSig=pu?'':sig;
  g.innerHTML='';
  const count=Math.ceil(Math.max(mapCount,S.unlocked+13)/12)*12;
  for(let c=0;c*12<count;c++){
    const lv=[...Array(12)].map((_,k)=>c*12+k+1),cs=lv.reduce((a,n)=>a+(pu&&n===pu.n?0:S.stars[n]||0),0),open=lv[0]<=lim,done=lv[11]<lim;
    const ch=el('div','chapter'+(open?'':' locked')+(done?' done':''));ch.style.setProperty('--wc',WCOL[c%WCOL.length]);
    ch.dataset.w=c;
    ch.innerHTML=`<h3 class="wbanner"><span class="wtx"><small>World ${c+1} · <span class="lw">Levels </span>${lv[0]}–${lv[11]}</small><b>${worldName(c)}</b></span><span class="wprog">${open?'':PADLOCK}<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.6 7 14.5 1.7 9.5l7.2-.9z"/></svg>${cs}/36</span></h3>`;
    if(open){
      const grid=el('div','mapgrid');
      for(let r=0;r<3;r++){const row=lv.slice(r*4,r*4+4);if(r%2)row.reverse();row.forEach(n=>grid.appendChild(mapNode(n,lim,pu&&n===pu.n)))}
      ch.appendChild(grid);
    }else ch.appendChild(el('div','lockcard',`<i>${PADLOCK}</i><b>Clear level ${c*12} to unlock</b><small>12 new levels</small>`));   // a locked world is one card, not 12 padlocks
    g.appendChild(ch);
  }
  const mb=el('button','btn sec sm more','Show more worlds ⬇️');mb.onclick=()=>{sfx.click();mapCount+=36;renderMap(true)};g.appendChild(mb);
  worldTabs(count/12,lim);pickLevel(mapPick&&mapPick<=lim&&pickLim===lim?mapPick:lim);pickLim=lim;   // after progress the panel returns to the new current level
  requestAnimationFrame(()=>{drawPaths(lim);if(!more){const c=pu?$(`.node[data-n="${pu.n}"]`):$('.node.cur');if(c)c.scrollIntoView({block:'center'})}mapTop=wrap.scrollTop;watchCur()});
  if(pu)setTimeout(()=>playUnlock(pu),REDUCED?0:780);
}
/* world tabs: one chip per world (done ✓ / here / locked); a tap scrolls to it, and the tab of the world in view lights up */
let tabIO=null;
function worldTabs(nw,lim){
  const box=$('#wtabs'),cw=Math.floor((lim-1)/12);
  box.innerHTML=[...Array(nw)].map((_,c)=>{const st=c<cw?'done':c===cw?'here':'locked';
    return`<button class="wtab ${st}" data-w="${c}" role="tab" style="--wc:${WCOL[c%WCOL.length]}"><i>${st==='locked'?'🔒':st==='done'?'✓':c+1}</i><span><small>World ${c+1}</small><b>${worldName(c)}</b></span></button>`}).join('');
  box.querySelectorAll('.wtab').forEach(b=>b.onclick=()=>{sfx.click();const ch=$(`.chapter[data-w="${b.dataset.w}"]`);if(ch)$('#mapwrap').scrollTo({top:ch.offsetTop-6,behavior:REDUCED?'auto':'smooth'})});
  if(tabIO)tabIO.disconnect();
  if(window.IntersectionObserver){tabIO=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){const w=e.target.dataset.w;
    box.querySelectorAll('.wtab').forEach(b=>b.classList.toggle('on',b.dataset.w===w));const t=box.querySelector(`.wtab[data-w="${w}"]`);if(t)box.scrollTo({left:t.offsetLeft-box.clientWidth/2+t.offsetWidth/2,behavior:'smooth'})}},
    {root:$('#mapwrap'),rootMargin:'-35% 0px -55% 0px'});$$('#mapgrid .chapter').forEach(c=>tabIO.observe(c))}
}
/* the level panel: the picked level (the current one by default); tap a level to pick it, tap it again or PLAY to play */
let mapPick=0,pickLim=0;
function pickLevel(n){
  mapPick=n;const ty=typeFor(n),st=S.stars[n]||0,i=INFO[ty];
  $$('#mapgrid .node.pick').forEach(e=>e.classList.remove('pick'));const nd=$(`#mapgrid .node[data-n="${n}"]`);if(nd)nd.classList.add('pick');
  $('#mpIcon').textContent=i.icon;$('#mpIcon').style.setProperty('--tc',i.col);
  $('#mpLv').textContent=`${isBonus(n)?'👑 BONUS · ':''}LEVEL ${n}`;$('#mpName').textContent=i.name;
  $('#mpStars').innerHTML=[0,1,2].map(k=>STAR.replace('<svg','<svg class="'+(k<st?'on':'')+'"')).join('');
  const pb=$('#mpPlay b');pb.textContent=S.resume&&S.resume.n===n?'CONTINUE':st?'REPLAY':'PLAY';
}
$('#mpPlay').onclick=()=>{sfx.good();playLevel(mapPick||S.unlocked,{},$('#mpPlay'))};
/* a floating "▼ Level N" pill when the current level is scrolled out of view; tap it to jump back */
let curIO=null;
function watchCur(){
  const pill=$('#curPill'),node=$('.node.cur');
  if(curIO){curIO.disconnect();curIO=null}
  pill.classList.remove('on');
  if(!node||!window.IntersectionObserver)return;
  curIO=new IntersectionObserver(es=>{
    const e=es[es.length-1];if(!e)return;
    const above=e.boundingClientRect.top<(e.rootBounds?e.rootBounds.top:0);
    pill.firstElementChild.textContent=`${above?'▲':'▼'} Level ${S.unlocked}`;pill.classList.toggle('on',!e.isIntersecting);
  },{root:$('#mapwrap'),threshold:.15});
  curIO.observe(node);
}
$('#curPill').onclick=()=>{const n=$('.node.cur');if(n){sfx.click();n.scrollIntoView({block:'center',behavior:'smooth'})}};
function mapNode(n,lim=S.unlocked,bare=false){
  const st=bare?0:S.stars[n]||0,locked=n>lim,ty=typeFor(n),cur=n===lim;
  const b=el('button','node'+(cur?' cur':'')+(isBonus(n)?' bonus':'')+(st===3?' perfect':''));
  b.style.setProperty('--tc',INFO[ty].col);b.dataset.n=n;b.disabled=locked;b.style.animationDelay=((n-1)%12)*30+'ms';
  b.innerHTML=locked?`${PADLOCK}<span class="num">${n}</span>`:`<span class="num">${n}</span><span class="ty">${INFO[ty].icon}</span>${cur?'<span class="here">YOU ARE HERE</span>':''}${S.resume&&S.resume.n===n?'<span class="resm" title="In progress">▶</span>':''}<span class="st">${[0,1,2].map(i=>STAR.replace('<svg','<svg class="'+(i<st?'on':'')+'"')).join('')}</span>`;
  b.onclick=()=>{if(mapPick===n){sfx.good();playLevel(n,{},b)}else{sfx.click();pickLevel(n);wa(b,[{scale:1},{scale:1.12},{scale:1}],{duration:260,easing:'cubic-bezier(.3,1.6,.5,1)'})}};
  return b;
}
/* the path between two node centres (grid-local px): straight on a row, an S-curve round the end of a row */
const mapSeg=(a,b,W)=>{const o=a[0]>W/2?62:-62;return Math.abs(a[1]-b[1])<2?`M${a[0]},${a[1]}L${b[0]},${b[1]}`:`M${a[0]},${a[1]}C${a[0]+o},${a[1]} ${b[0]+o},${b[1]} ${b[0]},${b[1]}`};
const nodePt=(grid,nd)=>{const gr=grid.getBoundingClientRect(),k=gr.width/grid.offsetWidth||1,r=nd.getBoundingClientRect();return[(r.left-gr.left+r.width/2)/k,(r.top-gr.top+r.height/2)/k,+nd.dataset.n]};
function drawPaths(lim=S.unlocked){
  $$('#mapgrid .mapgrid').forEach(grid=>{
    const W=grid.offsetWidth;
    const pts=[...grid.querySelectorAll('.node')].sort((a,b)=>a.dataset.n-b.dataset.n).map(nd=>nodePt(grid,nd));
    let lit='',dim='';
    for(let i=1;i<pts.length;i++){const seg=mapSeg(pts[i-1],pts[i],W);if(pts[i][2]<=lim)lit+=seg;else dim+=seg}
    grid.insertAdjacentHTML('afterbegin',`<svg class="path" width="${W}" height="${grid.offsetHeight}"><path class="road" d="${dim}${lit}"/><path class="dim" d="${dim}"/><path class="glow" d="${lit}"/><path class="lit" d="${lit}"/><path class="spark" d="${lit}"/></svg>`);
  });
}
/* First clear of the newest level, seen on the map: its stars stamp in, the path to the next level draws itself, the
   padlock shakes and bursts, and the next node pops open as the new current level. A tap anywhere skips to the end. */
function playUnlock(pu){
  const map=$('#map');if(!map.classList.contains('active'))return;
  const n=pu.n,nd=$(`.node[data-n="${n}"]`);if(!nd){renderMap(true);return}
  let over=false;const timers=[];
  const at=(ms,f)=>timers.push(setTimeout(()=>{if(!over&&map.classList.contains('active'))f()},ms));
  const finish=()=>{if(over)return;over=true;timers.forEach(clearTimeout);map.removeEventListener('pointerdown',finish,true);if(map.classList.contains('active'))renderMap(true)};
  if(REDUCED){finish();return}
  map.addEventListener('pointerdown',finish,true);
  const ctr=e=>{const r=e.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]};
  // 1. stars stamp in
  const svs=nd.querySelectorAll('.st svg');
  for(let i=0;i<pu.stars;i++)at(i*240,()=>{const v=svs[i];if(!v)return;v.classList.add('on');
    wa(v,[{transform:`${i===1?'translateY(5px) ':''}scale(2.6) rotate(-35deg)`,opacity:0},{transform:`${i===1?'translateY(5px) ':''}scale(1.15)`,opacity:1,offset:.7},{transform:`${i===1?'translateY(5px) ':''}scale(${i===1?1.15:1})`}],{duration:360,easing:'cubic-bezier(.3,1.4,.5,1)'});
    sfx.star(i);const[x,y]=ctr(v);burst(x,y,'#ffd23f',8,.55)});
  let t=pu.stars*240+260;
  const nx=$(`.node[data-n="${n+1}"]`),grid=nd.parentElement,same=nx&&nx.parentElement===grid;
  const lockCard=!nx&&$('.lockcard');   // the last level of a world: the next world's lock card breaks open instead
  // 2. the path to the next level draws itself
  if(same)at(t,()=>{
    const svg=grid.querySelector('svg.path');if(!svg)return;
    const d=mapSeg(nodePt(grid,nd),nodePt(grid,nx),grid.offsetWidth),NS='http://www.w3.org/2000/svg';
    for(const cls of['glow','lit']){const p=document.createElementNS(NS,'path');p.setAttribute('class',cls);p.setAttribute('d',d);svg.appendChild(p);
      const L=p.getTotalLength();p.style.strokeDasharray=L;wa(p,[{strokeDashoffset:L},{strokeDashoffset:0}],{duration:520,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'})}
    sfx.swish();
  });
  if(same)t+=560;
  // 3. padlock shakes, then bursts; the node pops open as the new current level
  if(nx){
    at(t,()=>wa(nx,[{transform:'rotate(0)'},{transform:'rotate(-12deg)'},{transform:'rotate(10deg)'},{transform:'rotate(-7deg)'},{transform:'rotate(4deg)'},{transform:'rotate(0)'}],{duration:420,easing:'ease-in-out'}));
    at(t+440,()=>{
      const[x,y]=ctr(nx),pad=nx.querySelector('.pad');
      if(pad){const fly=pad.cloneNode(true);fly.classList.add('padfly');fly.style.left=x-12+'px';fly.style.top=y-18+'px';document.body.appendChild(fly);
        const a=wa(fly,[{transform:'none',opacity:1},{transform:'translate(18px,-46px) rotate(38deg) scale(1.2)',opacity:1,offset:.45},{transform:'translate(34px,30px) rotate(110deg) scale(.7)',opacity:0}],{duration:700,easing:'cubic-bezier(.3,.6,.6,1)'});
        if(a)a.onfinish=()=>fly.remove();else fly.remove()}
      burst(x,y,'#f2c94c',16,.9);ring(x,y,'#fff',120,520);sfx.chest();buzz([15,30,20]);
      const fresh=mapNode(n+1),prev=mapNode(n);nx.replaceWith(fresh);nd.replaceWith(prev);
      fresh.style.animation='none';prev.style.animation='none';
      wa(fresh,[{transform:'scale(.3)',opacity:.4},{transform:'scale(1.22)',opacity:1,offset:.55},{transform:'scale(.94)',offset:.8},{transform:'none'}],{duration:560,easing:'cubic-bezier(.3,1.4,.5,1)'});
      setTimeout(()=>{fresh.style.animation='';prev.style.animation=''},600);
      if(!same){finish();const f=$(`.node[data-n="${n+1}"]`);if(f)f.scrollIntoView({block:'center',behavior:'smooth'})}
      else{over=true;map.removeEventListener('pointerdown',finish,true);timers.forEach(clearTimeout);mapSig=S.unlocked+'|'+mapCount+'|'+starSig()+'|'+(S.resume?S.resume.n:0);watchCur()}
    });
  }else if(lockCard){
    at(t,()=>wa(lockCard,[{transform:'rotate(0)'},{transform:'rotate(-2deg) scale(1.02)'},{transform:'rotate(2deg) scale(1.02)'},{transform:'rotate(-1.5deg)'},{transform:'rotate(0)'}],{duration:420,easing:'ease-in-out'}));
    at(t+440,()=>{const[x,y]=ctr(lockCard);burst(x,y,'#f2c94c',22,1.1);ring(x,y,'#fff',160,560);sfx.chest();buzz([15,30,20]);finish();const f=$(`.node[data-n="${n+1}"]`);if(f)f.scrollIntoView({block:'center',behavior:'smooth'})});
  }else at(t,finish);
}
const DEALS=[{ic:'💡',name:'Hint ×5',give:()=>S.hints+=5,was:ECON.hint.cost*5},{ic:'⏭️',name:'Skip ×2',give:()=>S.skips+=2,was:ECON.skip.token*2},{ic:'💡',name:'Hint ×10',give:()=>S.hints+=10,was:ECON.hint.p10},{ic:'🎁',name:'Hint ×3 + Skip',give:()=>{S.hints+=3;S.skips+=1},was:ECON.hint.p3+ECON.skip.token}];
const RARITY=c=>c>=500?['legend','Legendary']:c>=350?['epic','Epic']:c>=200?['rare','Rare']:['common','Classic'];
function themePreview(t){
  const v=t.v,on=[1,0,1,0,1,1,0,1,0];
  return `<div class="swatch" style="--b1:${v['--bg1']};--b2:${v['--bg2']};--a:${v['--acc']};--a2:${v['--acc2']}">${on.map((o,i)=>`<i class="${o?(i%3?'a':'b'):''}"></i>`).join('')}</div>`;
}
function renderShop(keep){
  const l=$('#shoplist'),top=keep?l.scrollTop:0;l.innerHTML='';l.classList.toggle('still',!!keep);   // after a purchase: same scroll position, no pop-in replay
  const head=(ic,txt,extra='')=>l.appendChild(el('h3','shead',`<i>${ic}</i><span>${txt}</span>${extra}`));
  const addItem=(ic,name,desc,cost,fn,cls='',tc='#4d8dff')=>{
    const d=el('div','item '+cls);d.style.animationDelay=l.children.length*40+'ms';d.style.setProperty('--tc',tc);
    d.innerHTML=`<div class="ic">${ic}</div><div class="tx"><b>${name}</b><small>${desc}</small></div>`;
    const b=el('button','btn sm buy'+(S.coins<cost?' poor':''),`<i class="coin"></i>${cost}`);
    b.onclick=()=>fn(b);d.appendChild(b);l.appendChild(d);
  };
  const boost=(...a)=>addItem(...a.slice(0,5),'boost'+(a[5]?' '+a[5]:''),a[6]);
  const buy=(cost,give,msg,b)=>{
    if(performance.now()-(buy.t||-1e9)<600)return false;   // a double tap buys once
    if(S.coins<cost){toast('Not enough coins');sfx.bad();b.parentElement.animate([{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'none'}],{duration:250});return false}
    buy.t=performance.now();
    const chip=$('#shop .chip .coin');if(chip&&!REDUCED)flyCoinsTo(chip,b,Math.min(8,3+cost/60|0));   // the coins travel from your balance to the item
    S.coins-=cost;give();save();sfx.coin();sfx.chest();toast(msg);const[x,y]=centerOf(b);burst(x,y,'#ffd166',24,1.1);ring(x,y,'#ffd166',110);renderShop(true);refreshCoins();return true;
  };
  const d=today();if(S.deal.day!==d)S.deal={day:d,bought:false};
  const deal=DEALS[hashSeed(d,9)%DEALS.length],dc=Math.round(deal.was/2);
  head('⚡','Deal of the day',`<em class="timer">⏱ ${fmtTime(untilMidnight())}</em>`);
  if(S.deal.bought){const x=el('div','item claimed','<div class="ic">✅</div><div class="tx"><b>Deal claimed!</b><small>A new deal arrives tomorrow.</small></div>');x.style.setProperty('--tc','#2ecc8f');l.appendChild(x)}
  else addItem(deal.ic,deal.name,`<s><i class="coin"></i>${deal.was}</s> 50% off today`,dc,b=>buy(dc,()=>{deal.give();S.deal.bought=true},'Deal claimed! 🎉',b),'deal','#ff9f43');
  head('🚀','Boosts');
  boost('💡','Hint ×3','Shows the next move',ECON.hint.p3,b=>buy(ECON.hint.p3,()=>S.hints+=3,'+3 hints',b),'','#f5b82e');
  boost('💡','Hint ×10','<span class="tag">Best value</span>',ECON.hint.p10,b=>buy(ECON.hint.p10,()=>S.hints+=10,'+10 hints',b),'best','#f5b82e');
  boost('⏭️','Skip token','Skip any level',ECON.skip.token,b=>buy(ECON.skip.token,()=>S.skips+=1,'+1 skip token',b),'','#4d8dff');
  boost('🎟️','Skip ×3',`Save ${ECON.skip.token*3-ECON.skip.p3} coins`,ECON.skip.p3,b=>buy(ECON.skip.p3,()=>S.skips+=3,'+3 skip tokens',b),'','#9b6bff');
  head('🎨','Themes','<em>recolour everything</em>');
  for(const k in THEMES){
    const t=THEMES[k],owned=S.owned.includes(k),eq=S.theme===k,[rc,rn]=RARITY(t.cost);
    const d=el('div','item theme r-'+rc+(eq?' eq':''));d.style.animationDelay=l.children.length*40+'ms';d.style.setProperty('--tc',t.v['--acc']);
    d.innerHTML=`${themePreview(t)}<div class="tx"><b>${t.name}</b><small><span class="rar">${rn}</span>${eq?'✨ Equipped':owned?'Owned':''}</small></div>`;
    const b=el('button','btn sm'+(eq?' sec eqb':owned?' pink':' buy')+(!owned&&S.coins<t.cost?' poor':''),owned?(eq?'✓ On':'Equip'):`<i class="coin"></i>${t.cost}`);
    b.onclick=()=>{
      if(!owned){if(S.coins<t.cost){toast('Not enough coins');sfx.bad();return}S.coins-=t.cost;S.owned.push(k);sfx.chest();confetti()}
      else sfx.good();
      S.theme=k;save();applyTheme();renderShop();refreshCoins();checkAch();
    };
    d.appendChild(b);l.appendChild(d);
  }
  head('🌿','Garden decorations','<em>shown on your home screen</em>');
  for(const dc of ECON.deco){
    const owned=S.deco.includes(dc.id);
    if(owned){const x=el('div','item claimed',`<div class="ic">${dc.ic}</div><div class="tx"><b>${dc.name}</b><small>In your garden ✓</small></div>`);x.style.setProperty('--tc','#2ecc8f');x.style.animationDelay=l.children.length*40+'ms';l.appendChild(x);continue}
    addItem(dc.ic,dc.name,'For your garden',dc.cost,b=>buy(dc.cost,()=>{S.deco.push(dc.id);checkAch()},`${dc.name} planted! ${dc.ic}`,b),'','#4fb35a');
  }
  /* tabs: each card belongs to the section whose heading came before it; CSS shows the open tab's cards only */
  let t='boosts';[...l.children].forEach(c=>{if(c.matches('h3.shead'))t=/Theme/.test(c.textContent)?'themes':/Garden/.test(c.textContent)?'garden':'boosts';c.dataset.t=t});
  l.dataset.tab=shopTab;
  if(keep)l.scrollTop=top;
}
let shopTab='boosts';
function setShopTab(t){
  shopTab=t;const l=$('#shoplist');if(l.dataset.tab!==t){l.dataset.tab=t;l.scrollTop=0}
  $$('#stabs .stab').forEach(b=>{const on=b.dataset.t===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
}
$$('#stabs .stab').forEach(b=>b.onclick=()=>{if(b.classList.contains('on'))return;sfx.click();setShopTab(b.dataset.t)});
