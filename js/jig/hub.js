'use strict';
/* ====================== Jigsaw: the hub, the album and rewards ======================
   The Jigsaw is its own endless track next to the levels: puzzle 1, 2, 3... each a new picture, a little bigger at
   first, then mostly 4x5 and 5x5 with breathers. Finished pictures fill an album, 12 to a page; a full page pays a
   bonus. It opens once level 6 is cleared (every level mode has been met by then), and it pays a little less per
   minute than levels do, so neither track starves the other. */

const jigPage=n=>Math.ceil(n/12);
const jigDims=n=>JIG_SIZES[jigSize(n)];
function jigReward(n,stars,prev){
  const[C,R]=jigDims(n),N=C*R,J=ECON.jig;
  if(prev>0)return{coins:Math.max(0,stars-prev)*J.improve,xp:Math.round((J.xpBase+N*J.xpPiece+stars*J.xpStar)*.2)};
  return{coins:Math.round(J.base+N*J.perPiece+stars*J.perStar),xp:Math.round(J.xpBase+N*J.xpPiece+stars*J.xpStar)};
}
const jigDone=n=>(S.jig.stars[n]||0)>0;
const pageDone=p=>{for(let n=(p-1)*12+1;n<=p*12;n++)if(!jigDone(n))return false;return true};
const starRow=k=>[0,1,2].map(i=>STAR.replace('<svg','<svg class="'+(i<k?'on':'')+'"')).join('');
let jigPageView=0,jigFresh=0;
/* the finished picture lifts off the board and flies into the win card */
function flyPicture(from,to,url,fc){
  if(REDUCED||!from||!to)return;
  const a=from.getBoundingClientRect();if(!a.width)return;
  const f=el('div','jflight',`<img alt="" src="${url}">`);f.style.cssText=`left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;--fc:${fc}`;
  document.body.appendChild(f);to.style.opacity='0';to.classList.add('flown');
  setTimeout(()=>{
    const b=to.getBoundingClientRect();if(!b.width||!f.animate){to.style.opacity='';f.remove();return}
    const an=f.animate([{transform:'none'},{transform:`translate(${(b.left-a.left)*.5}px,${(b.top-a.top)*.5-30}px) scale(${(b.width/a.width+1)/2},${(b.height/a.height+1)/2}) rotate(-3deg)`,offset:.55},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(${b.width/a.width},${b.height/a.height})`}],{duration:700,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'});
    an.onfinish=()=>{to.style.opacity='';f.remove();sfx.pop(1.4)};
  },420);
}

function playJig(n){if(!jigOpen())return;Trans.stop();startLevel(n,{jig:true})}
/* the hub screen */
function renderJig(){
  const n=S.jig.next,[C,R]=jigDims(n),pic=JigPic.get(n),res=S.jig.res&&S.jig.res.n===n,pg=jigPage(n);
  if(!jigPageView)jigPageView=pg;
  const cv=$('#jgCover');
  cv.innerHTML=`<img alt="" src="${pic.url}"><i class="jgcut" style="--C:${C};--R:${R}"></i><b class="jgq">?</b>`;
  $('#jgNum').textContent=`PUZZLE ${n}`;$('#jgSize').innerHTML=`<i>🧩</i>${C*R} pieces <small>${C}×${R}</small>`;
  $('#jgPlay b').textContent=res?'CONTINUE':'PLAY';$('#jgPlay').classList.toggle('resume',!!res);
  const done=Object.keys(S.jig.stars).length;
  $('#jgCount').innerHTML=`<b>${done}</b> picture${done===1?'':'s'} collected`;
  renderAlbum();
}
function renderAlbum(){
  const maxPg=Math.max(1,jigPage(S.jig.next)),p=clamp(jigPageView||maxPg,1,maxPg);jigPageView=p;
  let k=0,html='';
  for(let n=(p-1)*12+1;n<=p*12;n++){
    const st=S.jig.stars[n]||0,isNext=n===S.jig.next;if(st)k++;
    if(st)html+=`<button class="jslot done${n===jigFresh?' fresh':''}" data-n="${n}" style="--i:${n%12}"><img alt="" src="${JigPic.get(n).url}"><span class="jsst">${starRow(st)}</span></button>`;
    else if(isNext)html+=`<button class="jslot next" data-n="${n}" style="--i:${n%12}"><b>?</b><small>Next</small></button>`;
    else html+=`<div class="jslot lock" style="--i:${n%12}"><b>${n}</b></div>`;
  }
  $('#jgGrid').innerHTML=html;
  if(jigFresh&&$('#jgGrid .jslot.fresh')){jigFresh=0;setTimeout(()=>{sfx.star(2);const e=$('#jgGrid .jslot.fresh');if(e){const[x,y]=centerOf(e);burst(x,y,'#ffd166',20,1)}},700)}
  $('#jgPg').textContent=`Page ${p}`;$('#jgPgN').textContent=`${k}/12`;$('#jgPgBar').style.width=k/12*100+'%';
  $('#jgPrev').disabled=p<=1;$('#jgNext').disabled=p>=maxPg;
  const J=ECON.jig.page;$('#jgReward').innerHTML=S.jig.pages[p]?'<span class="ok">✓ Page complete · bonus collected</span>':`Fill the page: <span class="rc"><i class="coin"></i>${J.coins}</span><span class="rc">💡 ${J.hints}</span>`;
  $$('#jgGrid .jslot.done').forEach(b=>b.onclick=()=>{sfx.click();showJigPicture(+b.dataset.n)});
  $$('#jgGrid .jslot.next').forEach(b=>b.onclick=()=>{sfx.good();playJig(+b.dataset.n)});
}
function showJigPicture(n){
  const pic=JigPic.get(n),[C,R]=jigDims(n),st=S.jig.stars[n]||0;
  openModal(`<div class="jview"><img alt="" src="${pic.url}" style="--fc:${pic.frame}"></div><h2>${pic.title}</h2><p class="jvsub">${pic.sub} · Puzzle ${n} · ${C*R} pieces</p><div class="jvst">${starRow(st)}</div>`,
    [{label:'Close',cls:'sec',fn:closeModal},{label:'Replay ▶',fn:()=>{closeModal();playJig(n)}}],{cls:'jvcard',dismiss:closeModal});
}
$('#jgPlay').onclick=()=>{sfx.good();playJig(S.jig.next)};
$('#jgCover').onclick=()=>$('#jgPlay').click();
$('#jgPrev').onclick=()=>{sfx.click();jigPageView--;renderAlbum()};
$('#jgNext').onclick=()=>{sfx.click();jigPageView++;renderAlbum()};
/* the nav tab: locked until level 6 is cleared, with a NEW dot until the jigsaw is first opened */
function refreshJigTab(){
  const b=$('#nav .bn[data-nav="jig"]');if(!b)return;
  b.classList.toggle('lock',!jigOpen());b.classList.toggle('new',jigOpen()&&!S.jig.intro);
}
/* the first visit after it opens: a short welcome with the first picture */
function showJigIntro(){
  if(!jigOpen()||S.jig.intro)return;S.jig.intro=true;save();refreshJigTab();
  const pic=JigPic.get(1);
  openModal(`<div class="kicker">New mode unlocked</div><h2>🧩 Jigsaw</h2><div class="jview sm"><img alt="" src="${pic.url}"></div>
    <p>An endless gallery of brand-new pictures to piece together. Drag pieces to swap them: pieces that belong together lock and move as one.</p>`,
    [{label:'Later',cls:'sec',fn:closeModal},{label:'Try it ▶',cls:'big',fn:()=>{closeModal();show('jig')}}],{icon:'🧩',cls:'jintro',back:closeModal});
}

/* ---------- a finished puzzle ---------- */
function onJigWin(stars){
  const me=cur,n=cur.level,prev=S.jig.stars[n]||0,first=!prev,pic=JigPic.get(n),[C,R]=jigDims(n);
  const rw=jigReward(n,stars,prev);
  if(stars>prev)S.jig.stars[n]=stars;
  if(n>=S.jig.next)S.jig.next=n+1;
  if(first){jigFresh=n;jigPageView=jigPage(n)}
  if(S.jig.res&&S.jig.res.n===n)S.jig.res=null;
  const p=jigPage(n);let page=null;
  if(first&&pageDone(p)&&!S.jig.pages[p]){S.jig.pages[p]=1;page=ECON.jig.page;rw.coins+=page.coins;S.hints+=page.hints}
  S.coins+=rw.coins;const xr=addXP(rw.xp);save();
  emit('jig',{stars});if(rw.coins)emit('coins',rw.coins);
  sfx.win();buzz([30,40,60]);confetti();
  const[bx,by]=centerOf($('.jgb')||board);burst(bx,by,'#ffd166',50,1.8);
  const k=Array.from({length:12},(_,i)=>jigDone((p-1)*12+i+1)).filter(Boolean).length;
  const nn=n+1,[nC,nR]=jigDims(nn);
  setTimeout(()=>{
    if(cur!==me)return;
    openModal(`<div class="rays"></div><div class="wglow"></div>
      <div class="ribbon"><span>PUZZLE ${n} COMPLETE</span></div>
      <div class="jwpic" style="--fc:${pic.frame}"><img alt="" src="${pic.url}"><i class="jwshine"></i></div>
      <div class="jwtitle"><b>${pic.title}</b><small>${pic.sub}</small></div>
      <div class="jwst">${[0,1,2].map(i=>`<span class="sock ${i<stars?'on':''}" style="--d:${i*.3+.5}s">${STAR}</span>`).join('')}</div>
      <div class="wrows">
        <div class="wrow wrw">${rw.coins?`<div class="reward"><i class="coin"></i><b>+${rw.coins}</b></div>`:`<div class="reward none"><i class="coin"></i><span>Coins already collected</span></div>`}<i class="wsep"></i><div class="wxp"><i>⭐</i><b>+${rw.xp} XP</b></div></div>
        <div class="wrow jwalb"><span class="lvb">📖 Page ${p}</span><div class="xpw"><small>${k===12?'Album page complete!':`${12-k} more to fill the page`}</small><div class="bar"><div style="width:${k/12*100}%"></div></div></div><b class="chn">${k}/12</b></div>
      </div>
      ${page?`<div class="extra gold">📖 Album page ${p} complete: +${page.coins} coins and +${page.hints} 💡</div>`:''}
      ${xr.ups.length?`<div class="extra gold">🆙 Level up! Player level ${S.plv}</div>`:''}
      ${stars<3?`<p>Finish in ${jigPar(C*R).s3} moves or fewer for ★★★</p>`:''}`,
      [{label:'Gallery',cls:'sec sm',fn:b=>playExit('jig',b)},{label:'Replay',cls:'sec sm',fn:()=>playJig(n)},
       {label:`<span class="nx">🧩</span>Puzzle ${nn} <small class="nxp">· ${nC*nR} pieces</small> ▶`,cls:'big next',fn:()=>playJig(nn)}],{cls:'win jwin',back:()=>playExit('jig')});
    flyPicture($('.jgb'),$('#modal .jwpic'),pic.url,pic.frame);
    for(let i=0;i<stars;i++)setTimeout(()=>{if(cur!==me)return;sfx.star(i);const s=$$('.jwst .sock')[i];if(s){s.classList.add('hit');const[x,y]=centerOf(s);burst(x,y,'#ffd166',18,1)}},(i*.3+1.2)*1000);
    if(page)setTimeout(()=>{if(cur!==me)return;sfx.chest();const e=$('#modal .extra.gold');if(e){const[x,y]=centerOf(e);fountain(x,y,30)}},1600);
    if(rw.coins)setTimeout(()=>{if(cur===me)flyCoins($('.reward .coin'),Math.min(10,3+rw.coins/4|0))},900);
    if(xr.ups.length)xpBanner(xr);
    refreshHUD();
  },450);
}

/* first paint: the tab state, and the welcome once the Jigsaw is open */
refreshJigTab();if(jigOpen()&&!S.jig.intro&&!renderHome._jq){renderHome._jq=1;queueModal(()=>{renderHome._jq=0;showJigIntro()},1500)}
