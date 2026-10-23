'use strict';
/* ====================== menu screens: home, levels map, shop ====================== */
function buildLogo(){
  const cols=[0,1,2,3,5,6,7,8,0,2];
  $('#logoWord').innerHTML=[...'PUZZLE POP'].map((ch,i)=>ch===' '?'<span class="sp"></span>':`<span style="color:${COLORS[cols[i]]};animation-delay:${i*.12}s,${.2+i*.07}s">${ch}</span>`).join('');
}
function renderHome(){
  const stars=totalStars(),m=S.milestone,prevT=m?msThreshold(m-1):0,t=msThreshold(m),pct=clamp((stars-prevT)/(t-prevT)*100,4,100);
  $('#homeStars').textContent=stars;
  $('#homeBar').style.width=pct+'%';
  $('#homeNext').textContent=`🎁 chest at ${t} ⭐`;
  $('#chestIco').classList.toggle('near',pct>=70);
  const n=S.unlocked,ty=typeFor(n),ni=$('#nextIcon');
  ni.textContent=INFO[ty].icon;ni.style.setProperty('--tc',INFO[ty].col);
  $('#nextName').textContent=(isBonus(n)?'👑 ':'')+INFO[ty].name;
  $('#playLvl').textContent='Level '+n+(isBonus(n)?' · 2× BONUS':'');
  const sp=$('#streakPill');sp.textContent='🔥 '+S.streak;sp.classList.toggle('hot',S.streak>=2);
  $('#plv').textContent=S.plv;$('#prank').textContent=rankOf(S.plv);$('#pxp').textContent=`${S.xp} / ${xpNeed(S.plv)} XP`;
  $('#xpArc').style.strokeDashoffset=119.4*(1-S.xp/xpNeed(S.plv));
  const dd=dailyDone();$('#tDaily').classList.toggle('on',!dd);$('#dailySub').textContent=dd?`✅ ${fmtTime(untilMidnight())}`:'Play now!';
  const sr=spinReady();$('#tSpin').classList.toggle('on',sr);$('#spinSub').textContent=sr?'Free spin!':fmtTime(S.spinAt-Date.now());
  const qr=questsReady(),qd=S.quests.list.filter(q=>q.claimed).length;$('#tQuests').classList.toggle('on',qr>0);$('#questSub').textContent=qr?`${qr} to claim!`:`${qd}/3 done`;
  $('#achSub').textContent=`${achCount()}/${ACH.length}`;
  refreshCoins();
}
let mapCount=48;
function renderMap(more){
  const g=$('#mapgrid');g.innerHTML='';
  const count=Math.ceil(Math.max(mapCount,S.unlocked+13)/12)*12;
  for(let c=0;c*12<count;c++){
    const lv=[...Array(12)].map((_,k)=>c*12+k+1),cs=lv.reduce((a,n)=>a+(S.stars[n]||0),0);
    const ch=el('div','chapter',`<h3>World ${c+1} · ${worldName(c)}<small>Levels ${lv[0]}–${lv[11]} · ${cs}/36 ⭐</small></h3>`);
    const grid=el('div','mapgrid');
    for(let r=0;r<3;r++){const row=lv.slice(r*4,r*4+4);if(r%2)row.reverse();row.forEach(n=>grid.appendChild(mapNode(n)))}
    ch.appendChild(grid);g.appendChild(ch);
  }
  const mb=el('button','btn sec sm more','Show more worlds ⬇️');mb.onclick=()=>{sfx.click();mapCount+=36;renderMap(true)};g.appendChild(mb);
  requestAnimationFrame(()=>{drawPaths();if(!more){const c=$('.node.cur');if(c)c.scrollIntoView({block:'center'})}});
}
function mapNode(n){
  const st=S.stars[n]||0,locked=n>S.unlocked,ty=typeFor(n);
  const b=el('button','node'+(n===S.unlocked?' cur':'')+(isBonus(n)?' bonus':''));
  b.style.setProperty('--tc',INFO[ty].col);b.dataset.n=n;b.disabled=locked;b.style.animationDelay=((n-1)%12)*30+'ms';
  b.innerHTML=`<span class="ty">${locked?'🔒':INFO[ty].icon}</span>${n}${locked?'':`<span class="st">${[0,1,2].map(i=>STAR.replace('<svg','<svg class="'+(i<st?'on':'')+'"')).join('')}</span>`}`;
  b.onclick=()=>{sfx.click();startLevel(n)};
  return b;
}
function drawPaths(){
  $$('#mapgrid .mapgrid').forEach(grid=>{
    const gr=grid.getBoundingClientRect(),k=gr.width/grid.offsetWidth||1,W=grid.offsetWidth;
    const pts=[...grid.querySelectorAll('.node')].sort((a,b)=>a.dataset.n-b.dataset.n).map(nd=>{const r=nd.getBoundingClientRect();return[(r.left-gr.left+r.width/2)/k,(r.top-gr.top+r.height/2)/k,+nd.dataset.n]});
    let lit='',dim='';
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],o=a[0]>W/2?70:-70;
      const seg=Math.abs(a[1]-b[1])<2?`M${a[0]},${a[1]}L${b[0]},${b[1]}`:`M${a[0]},${a[1]}C${a[0]+o},${a[1]} ${b[0]+o},${b[1]} ${b[0]},${b[1]}`;
      if(b[2]<=S.unlocked)lit+=seg;else dim+=seg;
    }
    grid.insertAdjacentHTML('afterbegin',`<svg class="path" width="${W}" height="${grid.offsetHeight}"><path d="${dim}"/><path class="lit" d="${lit}"/></svg>`);
  });
}
const DEALS=[{ic:'💡',name:'Hint ×5',give:()=>S.hints+=5,was:75},{ic:'⏭️',name:'Skip ×2',give:()=>S.skips+=2,was:140},{ic:'💡',name:'Hint ×10',give:()=>S.hints+=10,was:130},{ic:'🎁',name:'Hint ×3 + Skip',give:()=>{S.hints+=3;S.skips+=1},was:115}];
function renderShop(){
  const l=$('#shoplist');l.innerHTML='';
  const addItem=(ic,name,desc,cost,fn,cls='')=>{
    const d=el('div','item '+cls);d.style.animationDelay=l.children.length*40+'ms';
    d.innerHTML=`<div class="ic">${ic}</div><div class="tx"><b>${name}</b><small>${desc}</small></div>`;
    const b=el('button','btn sm',`<i class="coin"></i> ${cost}`);
    if(S.coins<cost)b.style.opacity=.6;
    b.onclick=()=>fn(b);d.appendChild(b);l.appendChild(d);
  };
  const buy=(cost,give,msg,b)=>{
    if(S.coins<cost){toast('Not enough coins');sfx.bad();b.parentElement.animate([{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'none'}],{duration:250});return false}
    S.coins-=cost;give();save();sfx.coin();sfx.chest();toast(msg);const[x,y]=centerOf(b);burst(x,y,'#ffd166',24,1.1);renderShop();refreshCoins();return true;
  };
  const d=today();if(S.deal.day!==d)S.deal={day:d,bought:false};
  const deal=DEALS[hashSeed(d,9)%DEALS.length],dc=Math.round(deal.was/2);
  l.appendChild(el('h3',null,`⚡ Deal of the day · ${fmtTime(untilMidnight())} left`));
  if(S.deal.bought){const x=el('div','item','<div class="ic">✅</div><div class="tx"><b>Deal claimed!</b><small>A new deal arrives tomorrow.</small></div>');l.appendChild(x)}
  else addItem(deal.ic,deal.name,`<s>🪙${deal.was}</s> 50% off today only!`,dc,b=>buy(dc,()=>{deal.give();S.deal.bought=true},'Deal claimed! 🎉',b),'deal');
  l.appendChild(el('h3',null,'Boosts'));
  addItem('💡','Hint ×3','Highlights a helpful move.',45,b=>buy(45,()=>S.hints+=3,'+3 hints',b));
  addItem('💡','Hint ×10','Best value!',130,b=>buy(130,()=>S.hints+=10,'+10 hints',b));
  addItem('⏭️','Skip token','Skip any level without paying later.',70,b=>buy(70,()=>S.skips+=1,'+1 skip token',b));
  addItem('🎟️','Skip ×3','Save 30 coins.',180,b=>buy(180,()=>S.skips+=3,'+3 skip tokens',b));
  l.appendChild(el('h3',null,'Themes · recolour everything'));
  for(const k in THEMES){
    const t=THEMES[k],owned=S.owned.includes(k);
    const d=el('div','item');d.style.animationDelay=l.children.length*40+'ms';
    d.innerHTML=`<div class="swatch" style="background:radial-gradient(circle at 70% 30%,${t.v['--acc']} 0 18%,transparent 19%),radial-gradient(circle at 30% 75%,${t.v['--acc2']} 0 14%,transparent 15%),linear-gradient(135deg,${t.v['--bg2']},${t.v['--bg1']})"></div><div class="tx"><b>${t.name}</b><small>${S.theme===k?'✨ Equipped':owned?'Owned':'Colour theme'}</small></div>`;
    const b=el('button','btn sm'+(S.theme===k?' sec':''),owned?(S.theme===k?'Equipped':'Equip'):`<i class="coin"></i> ${t.cost}`);
    b.onclick=()=>{
      if(!owned){if(S.coins<t.cost){toast('Not enough coins');sfx.bad();return}S.coins-=t.cost;S.owned.push(k);sfx.chest();confetti()}
      else sfx.good();
      S.theme=k;save();applyTheme();renderShop();refreshCoins();checkAch();
    };
    d.appendChild(b);l.appendChild(d);
  }
}

