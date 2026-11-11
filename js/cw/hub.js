'use strict';
/* ====================== Word Search: the book, the hub and rewards ======================
   Its own endless track next to the levels and the Jigsaw: puzzle 1, 2, 3... Each theme of the book holds three
   puzzles; finishing a theme's three pays a bonus. Book 1 has every theme once; Book 2 starts them again with new
   word mixes and layouts, and so on. Opens once level 4 is cleared. */
const cwOpenCheck=()=>typeof cwOpen==='function'&&cwOpen();
const cwThemeKey=(round,t)=>round+'-'+t;
const cwDone=n=>(S.cw.stars[n]||0)>0;
const cwFirstOf=(round,t)=>round*CW_THEMES.length*CW_PER+t*CW_PER+1;
const cwThemeDone=(round,t)=>{const a=cwFirstOf(round,t);for(let n=a;n<a+CW_PER;n++)if(!cwDone(n))return false;return true};
function cwReward(stars,prev){const J=ECON.cw;
  if(prev>0)return{coins:Math.max(0,stars-prev)*J.improve,xp:Math.round((J.xpBase+stars*J.xpStar)*.2)};
  return{coins:J.base+stars*J.perStar,xp:J.xpBase+stars*J.xpStar}}
let cwBookView=0,cwFresh=0;

function playCw(n){if(!cwOpenCheck())return;Trans.stop();startLevel(n,{cw:true})}
/* ---------- the hub ---------- */
function renderCw(){
  const n=S.cw.next,P=cwPuzzle(n),T=P.theme,res=S.cw.res&&S.cw.res.n===n;
  const nx=$('#cwNext');nx.style.setProperty('--ac',T.col);
  $('#cwIcon').textContent=T.icon;$('#cwNum').textContent=`PUZZLE ${n}${P.round?` · BOOK ${P.book}`:''}`;$('#cwName').textContent=T.name;$('#cwTag').textContent=T.tag;
  $('#cwDots').innerHTML=[0,1,2].map(v=>{const m=cwFirstOf(P.round,P.t)+v;return`<i class="${cwDone(m)?'on':m===n?'cur':''}"></i>`}).join('')+`<small>${P.v+1} of ${CW_PER} in this theme</small>`;
  /* a little preview of the next board: its letters, faint (the words stay hidden) */
  const L=cwLayout(n);$('#cwMini').innerHTML=L.g.map(ch=>`<i>${ch}</i>`).join('');
  $('#cwPlay b').textContent=res?'CONTINUE':'PLAY';
  const solved=Object.keys(S.cw.stars).length;$('#cwCount').innerHTML=`<b>${solved}</b> puzzle${solved===1?'':'s'} solved`;
  renderCwBook();
}
function renderCwBook(){
  const maxB=cwPuzzle(S.cw.next).book,b=clamp(cwBookView||maxB,1,maxB);cwBookView=b;const round=b-1;
  let done=0,html='';
  CW_THEMES.forEach((T,t)=>{
    const a=cwFirstOf(round,t),open=a<=S.cw.next,full=cwThemeDone(round,t);if(full)done++;
    const st=[0,1,2].map(v=>S.cw.stars[a+v]||0);
    html+=open?`<button class="cwtc${full?' full':''}${a<=cwFresh&&cwFresh<a+CW_PER?' fresh':''}" data-t="${t}" style="--ac:${T.col};--i:${t}"><i class="cwti">${T.icon}</i><b>${T.name}</b><span class="cwts">${st.map(k=>`<em class="${k?'on':''}">${k?'★'.repeat(k):'·'}</em>`).join('')}</span>${full?'<u>✓</u>':''}</button>`
      :`<div class="cwtc lock" style="--ac:${T.col};--i:${t}"><i class="cwti">${T.icon}</i><b>${T.name}</b><span class="cwtl">🔒</span></div>`;
  });
  $('#cwGrid').innerHTML=html;
  $('#cwBk').textContent=`Book ${b}`;$('#cwBkN').textContent=`${done}/${CW_THEMES.length}`;$('#cwBkBar').style.width=done/CW_THEMES.length*100+'%';
  $('#cwPrev').disabled=b<=1;$('#cwNextB').disabled=b>=maxB;
  const J=ECON.cw.theme;$('#cwReward').innerHTML=`Finish a theme's ${CW_PER} puzzles: <span class="rc"><i class="coin"></i>${J.coins}</span><span class="rc">💡 ${J.hints}</span>`;
  $$('#cwGrid .cwtc[data-t]').forEach(e=>e.onclick=()=>{sfx.click();showCwTheme(round,+e.dataset.t)});
  if(cwFresh){const f=$('#cwGrid .cwtc.fresh');cwFresh=0;if(f)setTimeout(()=>{sfx.star(2);const[x,y]=centerOf(f);burst(x,y,'#ffd166',18,1)},650)}
}
/* a theme's page: its three puzzles, their stars, replay */
function showCwTheme(round,t){
  const T=CW_THEMES[t],a=cwFirstOf(round,t);
  openModal(`<div class="cwtp" style="--ac:${T.col}"><div class="cwtpi">${T.icon}</div><h2>${T.name}</h2><p>${T.tag}</p>
    <div class="cwtpl">${[0,1,2].map(v=>{const n=a+v,k=S.cw.stars[n]||0,open=n<=S.cw.next;
      return`<button class="cwtpr${open?'':' lock'}" data-n="${n}" ${open?'':'disabled'}><b>Puzzle ${n}</b><span>${open?(k?`<em class="st">${'★'.repeat(k)}${'☆'.repeat(3-k)}</em>`:'<em>New</em>'):'🔒'}</span><i>${open?(k?'Replay ▶':'Play ▶'):''}</i></button>`}).join('')}</div>
    ${cwThemeDone(round,t)?'<div class="cwtpd">✓ Theme complete</div>':''}</div>`,[{label:'Close',cls:'sec',fn:closeModal}],{cls:'cwtcard',dismiss:closeModal});
  $$('#modal .cwtpr:not(.lock)').forEach(b=>b.onclick=()=>{closeModal();sfx.good();playCw(+b.dataset.n)});
}
$('#cwPlay').onclick=()=>{sfx.good();playCw(S.cw.next)};
$('#cwNext .cwnmini').onclick=()=>$('#cwPlay').click();
$('#cwPrev').onclick=()=>{sfx.click();cwBookView--;renderCwBook()};
$('#cwNextB').onclick=()=>{sfx.click();cwBookView++;renderCwBook()};
function refreshCwTab(){const b=$('#nav .bn[data-nav="cw"]');if(!b)return;b.classList.toggle('lock',!cwOpenCheck());b.classList.toggle('new',cwOpenCheck()&&!S.cw.intro)}
function showCwIntro(){
  if(!cwOpenCheck()||S.cw.intro)return;S.cw.intro=true;save();refreshCwTab();
  const T=CW_THEMES[0];
  openModal(`<div class="kicker">New mode unlocked</div><h2>🔤 Word Search</h2>
    <div class="cwdemo" style="--ac:${T.col}">${[...'HERO'].map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div>
    <p>A book of themed word searches, from caped crusaders to haunted manors. Drag across the letters to circle each hidden word. Three puzzles per theme, and a bonus for each theme you finish.</p>`,
    [{label:'Later',cls:'sec',fn:closeModal},{label:'Try it ▶',cls:'big',fn:()=>{closeModal();show('cw')}}],{icon:'🔤',cls:'jintro',back:closeModal});
}

/* ---------- a finished crossword ---------- */
function onCwWin(stars){
  const me=cur,n=cur.level,prev=S.cw.stars[n]||0,first=!prev,P=cwPuzzle(n),T=P.theme,L=cur.puz.layout;
  const rw=cwReward(stars,prev);
  if(stars>prev)S.cw.stars[n]=stars;
  if(n>=S.cw.next)S.cw.next=n+1;
  if(first){cwFresh=n;cwBookView=P.book}
  if(S.cw.res&&S.cw.res.n===n)S.cw.res=null;
  let bonus=null;const key=cwThemeKey(P.round,P.t);
  if(first&&cwThemeDone(P.round,P.t)&&!S.cw.themes[key]){S.cw.themes[key]=1;bonus=ECON.cw.theme;rw.coins+=bonus.coins;S.hints+=bonus.hints}
  S.coins+=rw.coins;const xr=addXP(rw.xp);save();
  emit('cw',{stars});if(rw.coins)emit('coins',rw.coins);
  sfx.win();buzz([30,40,60]);confetti();
  const a=cwFirstOf(P.round,P.t),k=[0,1,2].filter(v=>cwDone(a+v)).length,nn=n+1,NP=cwPuzzle(nn);
  /* the solved board in miniature, every found word in its own colour */
  const col=new Map();L.words.forEach((w,wi)=>w.cells.forEach(i=>{if(!col.has(i))col.set(i,CW_BAND[wi%9])}));
  const mini=L.g.map((ch,i)=>col.has(i)?`<i class="l" style="--bc:${col.get(i)}">${ch}</i>`:`<i>${ch}</i>`).join('');
  setTimeout(()=>{
    if(cur!==me)return;
    openModal(`<div class="rays"></div><div class="wglow"></div>
      <div class="ribbon"><span>WORD SEARCH ${n} DONE</span></div>
      <div class="cwwin" style="--ac:${T.col}"><div class="cwwg">${mini}</div></div>
      <div class="jwtitle"><b>${T.icon} ${T.name}</b><small>${L.words.length} words found · ${T.tag}</small></div>
      <div class="jwst">${[0,1,2].map(i=>`<span class="sock ${i<stars?'on':''}" style="--d:${i*.3+.5}s">${STAR}</span>`).join('')}</div>
      <div class="wrows">
        <div class="wrow wrw">${rw.coins?`<div class="reward"><i class="coin"></i><b>+${rw.coins}</b></div>`:`<div class="reward none"><i class="coin"></i><span>Coins already collected</span></div>`}<i class="wsep"></i><div class="wxp"><i>⭐</i><b>+${rw.xp} XP</b></div></div>
        <div class="wrow jwalb"><span class="lvb">${T.icon} Theme</span><div class="xpw"><small>${k===CW_PER?'Theme complete!':`${CW_PER-k} more to finish ${T.name}`}</small><div class="bar"><div style="width:${k/CW_PER*100}%"></div></div></div><b class="chn">${k}/${CW_PER}</b></div>
      </div>
      ${bonus?`<div class="extra gold">${T.icon} ${T.name} complete: +${bonus.coins} coins and +${bonus.hints} 💡</div>`:''}
      ${xr.ups.length?`<div class="extra gold">🆙 Level up! Player level ${S.plv}</div>`:''}
      ${stars<3?'<p>Find them all with 2 slips or fewer for ★★★ (a hint counts as 2)</p>':''}`,
      [{label:'Book',cls:'sec sm',fn:b=>playExit('cw',b)},{label:'Replay',cls:'sec sm',fn:()=>playCw(n)},
       {label:`<span class="nx">${NP.theme.icon}</span>Puzzle ${nn} ▶`,cls:'big next',fn:()=>playCw(nn)}],{cls:'win jwin cwwincard',back:()=>playExit('cw')});
    for(let i=0;i<stars;i++)setTimeout(()=>{if(cur!==me)return;sfx.star(i);const s=$$('.jwst .sock')[i];if(s){s.classList.add('hit');const[x,y]=centerOf(s);burst(x,y,'#ffd166',18,1)}},(i*.3+1.2)*1000);
    if(bonus)setTimeout(()=>{if(cur!==me)return;sfx.chest();const e=$('#modal .extra.gold');if(e){const[x,y]=centerOf(e);fountain(x,y,30)}},1600);
    if(rw.coins)setTimeout(()=>{if(cur===me)flyCoins($('.reward .coin'),Math.min(10,3+rw.coins/4|0))},900);
    if(xr.ups.length)xpBanner(xr);
    refreshHUD();
  },500);
}
refreshCwTab();if(cwOpenCheck()&&!S.cw.intro&&!renderHome._cq){renderHome._cq=1;queueModal(()=>{renderHome._cq=0;showCwIntro()},2200)}
