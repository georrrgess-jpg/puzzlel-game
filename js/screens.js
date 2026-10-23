'use strict';
/* ====================== menu screens: home, levels map, shop ====================== */
function buildLogo(){
  const cols=[0,1,2,3,5,6,7,8,0,2];
  $('#logoWord').innerHTML=[...'PUZZLE POP'].map((ch,i)=>ch===' '?'<span class="sp"></span>':`<span data-ch="${ch}" style="color:${COLORS[cols[i]]};--i:${i};animation-delay:${i*.12}s,${.2+i*.07}s">${ch}</span>`).join('');
}
function renderHome(){
  const stars=totalStars(),m=S.milestone,prevT=m?msThreshold(m-1):0,t=msThreshold(m),pct=clamp((stars-prevT)/(t-prevT)*100,4,100);
  $('#homeStars').textContent=stars;
  $('#homeBar').style.width=pct+'%';
  $('#homeNext').textContent=`🎁 chest at ${t} ⭐`;
  $('#chestIco').classList.toggle('near',pct>=70);
  const n=S.unlocked,ty=typeFor(n),ni=$('#nextIcon');
  ni.textContent=INFO[ty].icon;ni.style.setProperty('--tc',INFO[ty].col);ni.parentElement.style.setProperty('--tcn',INFO[ty].col);
  $('#nextName').textContent=(isBonus(n)?'👑 ':'')+INFO[ty].name;
  $('#playLvl').textContent='Level '+n+(isBonus(n)?' · 2× BONUS':'');
  const sp=$('#streakPill');sp.textContent='🔥 '+S.streak;sp.classList.toggle('hot',S.streak>=2);
  $('#plv').textContent=S.plv;$('#prank').textContent=rankOf(S.plv);$('#pxp').textContent=`${S.xp} / ${xpNeed(S.plv)} XP`;
  $('#xpArc').style.strokeDashoffset=119.4*(1-S.xp/xpNeed(S.plv));
  const ringP=(id,p)=>$(id).style.setProperty('--p',Math.round(clamp(p,0,1)*100));
  const dd=dailyDone();ringP('#tDaily',dd?1:0);ringP('#tSpin',spinReady()?1:typeof SPIN_CD!=='undefined'?1-(S.spinAt-Date.now())/SPIN_CD:0);
  ringP('#tQuests',S.quests.list.filter(q=>q.claimed).length/3);ringP('#tTrophy',achCount()/ACH.length);
  $('#tDaily').classList.toggle('on',!dd);$('#dailySub').textContent=dd?`✅ ${fmtTime(untilMidnight())}`:'Play now!';
  const sr=spinReady();$('#tSpin').classList.toggle('on',sr);$('#spinSub').textContent=sr?'Free spin!':fmtTime(S.spinAt-Date.now());
  const qr=questsReady(),qd=S.quests.list.filter(q=>q.claimed).length;$('#tQuests').classList.toggle('on',qr>0);$('#questSub').textContent=qr?`${qr} to claim!`:`${qd}/3 done`;
  $('#achSub').textContent=`${achCount()}/${ACH.length}`;
  refreshCoins();
}
let mapCount=48;
const PADLOCK='<svg class="pad" viewBox="0 0 24 28"><path d="M6 12V8a6 6 0 0 1 12 0v4" fill="none" stroke="#cfd3e6" stroke-width="3.2" stroke-linecap="round"/><rect x="2.5" y="11" width="19" height="15" rx="4" fill="#f2c94c" stroke="#8a6200" stroke-width="1.4"/><rect x="2.5" y="11" width="19" height="5" rx="3" fill="#ffffff55"/><circle cx="12" cy="18.5" r="2.3" fill="#6b4a00"/><rect x="11" y="19" width="2" height="4.2" rx="1" fill="#6b4a00"/></svg>';
const WCOL=['#5b6cff','#22b8c9','#e45bc4','#2ecc8f','#8b5cf6','#ff7a45','#3a86ff','#d9a21b','#14b8a6','#7b61ff','#ff5d73','#a855f7'];
function renderMap(more){
  const g=$('#mapgrid');g.innerHTML='';
  const count=Math.ceil(Math.max(mapCount,S.unlocked+13)/12)*12;
  for(let c=0;c*12<count;c++){
    const lv=[...Array(12)].map((_,k)=>c*12+k+1),cs=lv.reduce((a,n)=>a+(S.stars[n]||0),0),open=lv[0]<=S.unlocked,done=lv[11]<S.unlocked;
    const ch=el('div','chapter'+(open?'':' locked')+(done?' done':''));ch.style.setProperty('--wc',WCOL[c%WCOL.length]);
    ch.innerHTML=`<h3 class="wbanner"><span class="wnum">${open?c+1:PADLOCK}</span><span class="wtx"><small>World ${c+1} · Levels ${lv[0]}–${lv[11]}</small><b>${worldName(c)}</b></span><span class="wprog"><span><svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.6 7 14.5 1.7 9.5l7.2-.9z"/></svg>${cs}/36</span><span class="bar"><span style="width:${Math.round(cs/36*100)}%"></span></span></span></h3>`;
    const grid=el('div','mapgrid');
    for(let r=0;r<3;r++){const row=lv.slice(r*4,r*4+4);if(r%2)row.reverse();row.forEach(n=>grid.appendChild(mapNode(n)))}
    ch.appendChild(grid);g.appendChild(ch);
  }
  const mb=el('button','btn sec sm more','Show more worlds ⬇️');mb.onclick=()=>{sfx.click();mapCount+=36;renderMap(true)};g.appendChild(mb);
  requestAnimationFrame(()=>{drawPaths();if(!more){const c=$('.node.cur');if(c)c.scrollIntoView({block:'center'})}});
}
function mapNode(n){
  const st=S.stars[n]||0,locked=n>S.unlocked,ty=typeFor(n),cur=n===S.unlocked;
  const b=el('button','node'+(cur?' cur':'')+(isBonus(n)?' bonus':'')+(st===3?' perfect':''));
  b.style.setProperty('--tc',INFO[ty].col);b.dataset.n=n;b.disabled=locked;b.style.animationDelay=((n-1)%12)*30+'ms';
  b.innerHTML=locked?`${PADLOCK}<span class="num">${n}</span>`:`<span class="num">${n}</span><span class="ty">${INFO[ty].icon}</span>${cur&&((n-1)%12)<4?'<span class="pin">▼</span>':''}<span class="st">${[0,1,2].map(i=>STAR.replace('<svg','<svg class="'+(i<st?'on':'')+'"')).join('')}</span>`;
  b.onclick=()=>{sfx.click();startLevel(n)};
  return b;
}
function drawPaths(){
  $$('#mapgrid .mapgrid').forEach(grid=>{
    const gr=grid.getBoundingClientRect(),k=gr.width/grid.offsetWidth||1,W=grid.offsetWidth;
    const pts=[...grid.querySelectorAll('.node')].sort((a,b)=>a.dataset.n-b.dataset.n).map(nd=>{const r=nd.getBoundingClientRect();return[(r.left-gr.left+r.width/2)/k,(r.top-gr.top+r.height/2)/k,+nd.dataset.n]});
    let lit='',dim='';
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],o=a[0]>W/2?62:-62;
      const seg=Math.abs(a[1]-b[1])<2?`M${a[0]},${a[1]}L${b[0]},${b[1]}`:`M${a[0]},${a[1]}C${a[0]+o},${a[1]} ${b[0]+o},${b[1]} ${b[0]},${b[1]}`;
      if(b[2]<=S.unlocked)lit+=seg;else dim+=seg;
    }
    grid.insertAdjacentHTML('afterbegin',`<svg class="path" width="${W}" height="${grid.offsetHeight}"><path class="road" d="${dim}${lit}"/><path class="dim" d="${dim}"/><path class="glow" d="${lit}"/><path class="lit" d="${lit}"/><path class="spark" d="${lit}"/></svg>`);
  });
}
const DEALS=[{ic:'💡',name:'Hint ×5',give:()=>S.hints+=5,was:75},{ic:'⏭️',name:'Skip ×2',give:()=>S.skips+=2,was:140},{ic:'💡',name:'Hint ×10',give:()=>S.hints+=10,was:130},{ic:'🎁',name:'Hint ×3 + Skip',give:()=>{S.hints+=3;S.skips+=1},was:115}];
const RARITY=c=>c>=500?['legend','Legendary']:c>=350?['epic','Epic']:c>=200?['rare','Rare']:['common','Classic'];
function themePreview(t){
  const v=t.v,on=[1,0,1,0,1,1,0,1,0];
  return `<div class="swatch" style="--b1:${v['--bg1']};--b2:${v['--bg2']};--a:${v['--acc']};--a2:${v['--acc2']}">${on.map((o,i)=>`<i class="${o?(i%3?'a':'b'):''}"></i>`).join('')}</div>`;
}
function renderShop(){
  const l=$('#shoplist');l.innerHTML='';
  const head=(ic,txt,extra='')=>l.appendChild(el('h3','shead',`<i>${ic}</i><span>${txt}</span>${extra}`));
  const addItem=(ic,name,desc,cost,fn,cls='',tc='#4d8dff')=>{
    const d=el('div','item '+cls);d.style.animationDelay=l.children.length*40+'ms';d.style.setProperty('--tc',tc);
    d.innerHTML=`<div class="ic">${ic}</div><div class="tx"><b>${name}</b><small>${desc}</small></div>`;
    const b=el('button','btn sm buy'+(S.coins<cost?' poor':''),`<i class="coin"></i>${cost}`);
    b.onclick=()=>fn(b);d.appendChild(b);l.appendChild(d);
  };
  const buy=(cost,give,msg,b)=>{
    if(S.coins<cost){toast('Not enough coins');sfx.bad();b.parentElement.animate([{transform:'translateX(-8px)'},{transform:'translateX(8px)'},{transform:'none'}],{duration:250});return false}
    S.coins-=cost;give();save();sfx.coin();sfx.chest();toast(msg);const[x,y]=centerOf(b);burst(x,y,'#ffd166',24,1.1);ring(x,y,'#ffd166',110);renderShop();refreshCoins();return true;
  };
  const d=today();if(S.deal.day!==d)S.deal={day:d,bought:false};
  const deal=DEALS[hashSeed(d,9)%DEALS.length],dc=Math.round(deal.was/2);
  head('⚡','Deal of the day',`<em class="timer">⏱ ${fmtTime(untilMidnight())}</em>`);
  if(S.deal.bought){const x=el('div','item claimed','<div class="ic">✅</div><div class="tx"><b>Deal claimed!</b><small>A new deal arrives tomorrow.</small></div>');x.style.setProperty('--tc','#2ecc8f');l.appendChild(x)}
  else addItem(deal.ic,deal.name,`<s><i class="coin"></i>${deal.was}</s> 50% off today only!`,dc,b=>buy(dc,()=>{deal.give();S.deal.bought=true},'Deal claimed! 🎉',b),'deal','#ff9f43');
  head('🚀','Boosts');
  addItem('💡','Hint ×3','Highlights a helpful move.',45,b=>buy(45,()=>S.hints+=3,'+3 hints',b),'','#f5b82e');
  addItem('💡','Hint ×10','<span class="tag">Best value</span>',130,b=>buy(130,()=>S.hints+=10,'+10 hints',b),'best','#f5b82e');
  addItem('⏭️','Skip token','Skip any level without paying later.',70,b=>buy(70,()=>S.skips+=1,'+1 skip token',b),'','#4d8dff');
  addItem('🎟️','Skip ×3','Save 30 coins.',180,b=>buy(180,()=>S.skips+=3,'+3 skip tokens',b),'','#9b6bff');
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
}
