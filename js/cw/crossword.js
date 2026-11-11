'use strict';
/* ====================== Word Search: the puzzle ======================
   An 11x11 board of letters with nine words of one theme (js/cw/themes.js) hidden among them, in straight lines.
   The word bank sits under the board, three by three. Drag across the letters to circle a word: a band follows the
   finger and snaps to the eight directions; let go on a bank word and it is found (it keeps its band, in a colour of
   its own). Every board mixes all eight directions: across, down and both diagonals, each either way round. Puzzles 1, 2, 3... go through the themes three at a time; after the last theme the book starts again
   with new word mixes and new boards. (Internally the mode keeps its first name, 'crossword' / 'cw'.) */
const CW_N=11,CW_PER=3;
/* which theme puzzle n belongs to, and which of its word mixes */
function cwPuzzle(n){const i=n-1,T=CW_THEMES.length,t=Math.floor(i/CW_PER)%T,round=Math.floor(i/(CW_PER*T)),v=i%CW_PER;return{t,theme:CW_THEMES[t],round,v,book:round+1}}
/* the directions words may run in: → ↓ ↘ ↗, then the same lines read backwards ← ↑ ↖ ↙ */
const CW_D=[[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
const CW_GEN=2;   // bump when boards change, so a saved half-done puzzle does not tick the wrong words
/* random filler letters, weighted like English (the board reads like words, so the real ones hide well) */
const CW_FILL='EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSRRRRRRHHHHHLLLLDDDDCCCUUUMMMFFPPGGWWYYBBVKXJQZ';

function cwBuild(pool,R,n,target=9){
  const N=CW_N;let best=null;
  for(let att=0;att<40;att++){
    const g=Array(N*N).fill(''),words=[];
    /* every word gets a line of its own kind in turn (across, down, the two diagonals, in a shuffled order) so a
       board always mixes them, and a coin toss for which way round it reads */
    const axes=shuffle([0,1,2,3],R);
    const ws=shuffle(pool.slice(),R).sort((a,b)=>b[0].length-a[0].length+(R()-.5)*3);
    for(const e of ws){
      if(words.length>=target)break;const w=e[0];let placed=null;
      /* never a word inside another one (STAGE in BACKSTAGE): finding one would find the other */
      if(words.some(o=>o.w.includes(w)||w.includes(o.w)||o.w.includes([...w].reverse().join(''))))continue;
      const ax=axes[words.length%4];
      for(let tr=0;tr<300&&!placed;tr++){
        /* the first tries keep to this word's kind of line; after that any line that fits */
        const di=(tr<180?ax:Math.floor(R()*4))+(R()<.5?4:0),[dr,dc]=CW_D[di];
        const r0=Math.floor(R()*N),c0=Math.floor(R()*N),r1=r0+dr*(w.length-1),c1=c0+dc*(w.length-1);
        if(r1<0||c1<0||r1>=N||c1>=N)continue;
        const cells=[];let ok=true,shared=0;
        for(let k=0;k<w.length;k++){const i=(r0+dr*k)*N+c0+dc*k;if(g[i]&&g[i]!==w[k]){ok=false;break}if(g[i])shared++;cells.push(i)}
        if(!ok||shared===w.length)continue;
        /* never along the same line as a word already there (one would hide inside the other) */
        if(words.some(o=>Math.abs(o.dr)===Math.abs(dr)&&Math.abs(o.dc)===Math.abs(dc)&&o.dr*dc===o.dc*dr&&o.cells.some(i=>cells.includes(i))))continue;
        placed={w,clue:e[1],cells,dr,dc,b:di>=4};
      }
      if(placed){placed.cells.forEach((i,k)=>g[i]=w[k]);words.push(placed)}
    }
    /* the best board has the most words, then all four kinds of line, then some read backwards and some not */
    const nb=words.filter(o=>o.b).length,
      score=words.length*10+new Set(words.map(o=>o.dr*3+o.dc).map(k=>Math.abs(k))).size+(nb&&nb<words.length?1:0);
    if(!best||score>best.score)best={g,words,score};
    if(score>=target*10+5)break;
  }
  /* fill the rest; fill again if a bank word turns up a second time by chance */
  const fill=()=>{const g=best.g.slice();for(let i=0;i<N*N;i++)if(!g[i])g[i]=CW_FILL[Math.floor(R()*CW_FILL.length)];return g};
  let g=fill();for(let t=0;t<40&&cwExtra(g,best.words);t++)g=fill();
  return{g,words:best.words.map(o=>({w:o.w,clue:o.clue,cells:o.cells,d:CW_D.findIndex(([a,b])=>a===o.dr&&b===o.dc)}))};
}
/* how often each bank word can be read in the grid (any direction); more than once is a problem */
function cwCount(g,w){const N=CW_N;let k=0;
  /* a palindrome (LEVEL) reads the same from either end of its cells: count each run of cells once */
  const D=[...w].reverse().join('')===w?CW_D.slice(0,4):CW_D;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)for(const[dr,dc]of D){const r1=r+dr*(w.length-1),c1=c+dc*(w.length-1);if(r1<0||c1<0||r1>=N||c1>=N)continue;
    let m=true;for(let j=0;j<w.length;j++)if(g[(r+dr*j)*N+c+dc*j]!==w[j]){m=false;break}if(m)k++}
  return k}
const cwExtra=(g,words)=>words.some(o=>cwCount(g,o.w)>1);
function cwLayout(n){
  if(cwLayout.c&&cwLayout.c.n===n)return cwLayout.c.L;
  const P=cwPuzzle(n),T=P.theme,base=shuffle(T.words.slice(),rngOf(hashSeed(P.t*31+P.round,5150)));
  const pool=[...Array(14)].map((_,k)=>base[(P.v*6+k)%base.length]);
  let L=cwBuild(pool,rngOf(hashSeed(n,9091)),n);
  if(L.words.length<9){const L2=cwBuild(base.slice(),rngOf(hashSeed(n,9092)),n);if(L2.words.length>L.words.length)L=L2}
  L=Object.assign(L,{P});cwLayout.c={n,L};return L;
}

INFO.crossword={name:'Word Search',icon:'🔤',col:'#4dd4ff',tip:'Drag across the letters to circle a word from the bank below. Words run in straight lines.'};
HOWTO.crossword={
  goal:'Find every word of the theme in the letters.',
  steps:['Press on the first letter of a word and drag to its last letter. A band follows your finger in a straight line.','Let go on a word from the bank and it is found: it keeps its colour and the bank ticks it off.','Words run across, down and on a slant, and either way round. Stuck? 💡 lights up where a word starts.'],
  demo:()=>{const t=(ch,c='')=>`<span class="cwdc ${c}">${ch}</span>`;
    return htStage(`<div class="cwdm">${t('Q')}${t('C')}${t('A')}${t('P')}${t('E')}${t('X')}${HT_F}</div>`,`<div class="cwdm done"><i class="cwdb"></i>${t('Q')}${t('C','ok')}${t('A','ok')}${t('P','ok')}${t('E','ok')}${t('X')}</div>`,'Drag from C to E','CAPE is found')}
};
/* sounds: a soft rising tick as the band grows, a chime per word found (higher with every word), a gentle "not that" */
sfx.cwKey=k=>{if(!ok())return;voice({f:pent(Math.min(12,k||0)+4,60),dur:.05,type:'triangle',vol:.05});noise({dur:.01,vol:.03,type:'highpass',f:4500})};
sfx.cwWord=(len,k)=>{if(!ok())return;const b=Math.min(6,k);for(let i=0;i<Math.min(len,8);i++)marimba(pent(i+3+b,60),.13,i*.045,undefined,(i/7-.5)*.6);
  bell(pent(12+b,60),.07,1,.06+Math.min(len,8)*.045);noise({dur:.3,vol:.03,type:'highpass',f:7000,verb:.4})};
sfx.cwWrong=()=>{if(!ok())return;const t=now();voice({f:kf(57),dur:.1,type:'triangle',vol:.07,lp:900,t});voice({f:kf(55),dur:.15,type:'triangle',vol:.06,lp:800,t:t+.07})};
sfx.cwLand=k=>{if(!ok())return;bell(pent(10+Math.min(6,k),60),.05,.35);noise({dur:.04,vol:.025,type:'highpass',f:6000})};
sfx.cwReveal=()=>{if(!ok())return;[88,93,96].forEach((n,i)=>bell(kf(n),.04,.5,i*.04))};
/* little stars that burst from a point: a handful of small elements moved with transform and opacity (cheaper here than the
   full-screen particle canvas, which would be re-uploaded every frame while they fly) */
function cwSparks(x,y,col,n){
  if(FL_RM)return;n=Q.tier==='low'?Math.ceil(n/2):n;
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+Math.random()*.6,d=26+Math.random()*34,s=el('i','cwsp',i%3?'✦':'✧');
    s.style.left=x+'px';s.style.top=y+'px';s.style.color=i%4===3?'#fff':col;document.body.appendChild(s);
    const dx=Math.cos(a)*d,dy=Math.sin(a)*d-10,r=(Math.random()-.5)*160;
    s.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:`translate(calc(-50% + ${dx*.7}px),calc(-50% + ${dy*.7}px)) scale(1.15) rotate(${r*.6}deg)`,opacity:1,offset:.45},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy+14}px)) scale(.2) rotate(${r}deg)`,opacity:0}],{duration:560+Math.random()*200,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>s.remove()}
}
/* a colour for every found word (bright, far apart) */
const CW_BAND=['#ff5d73','#ffb020','#3ddc84','#38b6ff','#b06bff','#ff6fd8','#25d0c6','#ff8a3d','#8bd450'];

MAKERS.crossword=function({level,board,api}){
  const N=CW_N,L=cwLayout(level),P=L.P,T=P.theme,W=L.words,NW=W.length,G=L.g;
  let found=new Array(NW).fill(false),slips=0,hints=0,done=false,gen=0;
  const s3=2,s2=6,score=()=>slips+hints*2;
  /* ---------- the board ---------- */
  const wrap=el('div','cww');wrap.style.setProperty('--ac',T.col);
  const head=el('div','cwhead',`<span class="cwtheme"><i>${T.icon}</i><b>${T.name}</b></span><span class="cwprog"><b class="cwpn">0</b>/${NW} found</span>`);
  const grid=el('div','cwgrid'),bands=el('div','cwbands'),live=el('i','cwband live','<b></b>');grid.appendChild(bands);bands.appendChild(live);
  const cells=G.map((ch,i)=>{const c=el('div','cwc');c.textContent=ch;c.dataset.i=i;return c}),
    rows=[...Array(N)].map((_,r)=>{const e=el('div','cwrow'+(FL_RM?'':' in'));e.style.setProperty('--r',r);e.append(...cells.slice(r*N,r*N+N));return e});grid.append(...rows);
  /* the word bank: three columns, three rows */
  const bank=el('div','cwbank',W.map((w,wi)=>`<span class="cwbw" data-w="${wi}" style="--bc:${CW_BAND[wi%9]}"><i></i><b>${w.w}</b></span>`).join(''));
  wrap.append(head,grid,bank);board.appendChild(wrap);
  const bankEl=wi=>bank.querySelector(`.cwbw[data-w="${wi}"]`);
  /* ---------- geometry: read once per drag (and again only when the board changes size), never between style writes ---------- */
  let geo=null;
  const measure=()=>{const a=cells[0].getBoundingClientRect(),b=cells[N+1].getBoundingClientRect();
    geo={x0:a.left,y0:a.top,cs:a.width,px:b.left-a.left,py:b.top-a.top,pad:cells[0].offsetLeft,padY:cells[0].offsetTop,
      bank:W.map((w,wi)=>{const r=bankEl(wi).getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]})}};
  /* the cell nearest a point (a press in the thin gap between letters still counts); -1 when well off the board */
  const nearest=(x,y)=>{const c=Math.round((x-geo.x0-geo.cs/2)/geo.px),r=Math.round((y-geo.y0-geo.cs/2)/geo.py);
    return r<-.5||c<-.5||r>N-.5||c>N-.5?-1:clamp(r,0,N-1)*N+clamp(c,0,N-1)};
  /* a band from cell a to cell b: one rounded bar, placed and turned with transform (positions inside the grid).
     The angle is kept continuous (170° to -170° turns 20°, not 340°) so the live band swings the short way round. */
  function placeBand(e,a,b,prevAng){
    if(!geo)measure();const cs=geo.cs,px=geo.px;
    const ra=Math.floor(a/N),ca=a%N,rb=Math.floor(b/N),cb=b%N,x=geo.pad+ca*px+cs/2,y=geo.padY+ra*geo.py+cs/2,dx=(cb-ca)*px,dy=(rb-ra)*geo.py;
    const len=Math.hypot(dx,dy),h=cs*.86;let ang=a===b&&prevAng!=null?prevAng:Math.atan2(dy,dx)*180/Math.PI;
    if(prevAng!=null){while(ang-prevAng>180)ang-=360;while(ang-prevAng<-180)ang+=360}
    e.style.width=(len+h)+'px';e.style.height=h+'px';e.style.transform=`translate(${x-h/2}px,${y-h/2}px) rotate(${ang}deg)`;e.style.transformOrigin=`${h/2}px ${h/2}px`;
    return ang;
  }
  const bandOf=(e,w)=>placeBand(e,w.cells[0],w.cells[w.cells.length-1]);
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!grid.isConnected){ro.disconnect();return}geo=null;requestAnimationFrame(()=>{if(!grid.isConnected)return;geo=null;
    W.forEach((w,wi)=>{const b=bands.querySelector(`.got[data-w="${wi}"]`);if(b)bandOf(b,w)})})});ro.observe(grid)}
  /* ---------- dragging ----------
     The band follows the finger's real position, not the cell under it: the direction snaps to the nearest of the eight
     (and holds on to it until the finger is clearly heading another way, so a wobble across a row never tips it onto a
     diagonal), and the length grows a letter only once the finger is well into the next one (so brushing the edge of
     the cell after a word does not add it). */
  let sel=null;
  const D8=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];   // by angle: 0°, 45°, ... (screen y down)
  function track(x,y){
    const a=sel.a,ra=Math.floor(a/N),ca=a%N,cx=geo.x0+ca*geo.px+geo.cs/2,cy=geo.y0+ra*geo.py+geo.cs/2;
    const vx=(x-cx)/geo.px,vy=(y-cy)/geo.py,dist=Math.hypot(vx,vy);
    if(sel.k==null&&dist<.55)return[a];
    const ang=Math.atan2(vy,vx),k0=((Math.round(ang/(Math.PI/4))%8)+8)%8;
    if(sel.k==null)sel.k=k0;
    else if(k0!==sel.k){let d=Math.abs(ang-sel.k*Math.PI/4)%(2*Math.PI);if(d>Math.PI)d=2*Math.PI-d;if(d>Math.PI/8+.14||dist<1.2)sel.k=k0}
    const[sr,sc]=D8[sel.k],t=(vx*sc+vy*sr)/(sr*sr+sc*sc);
    let len=sel.len;if(Math.abs(t-len)>.62)len=Math.max(0,Math.round(t));
    /* never past the edge of the board */
    for(;len>0;len--){const rr=ra+sr*len,cc=ca+sc*len;if(rr>=0&&cc>=0&&rr<N&&cc<N)break}
    sel.len=len;const out=[a];for(let s=1;s<=len;s++)out.push((ra+sr*s)*N+ca+sc*s);
    return out;
  }
  /* the letters under the band lift a little (a class on the cell; the letter moves with a transform transition) */
  function drawSel(list){
    const end=list[list.length-1];if(end===sel.end&&list.length===sel.cells.length)return;
    sel.ang=placeBand(live,sel.a,end,sel.ang);sel.end=end;
    const on=new Set(list);sel.cells.forEach(i=>{if(!on.has(i))cells[i].classList.remove('pk')});list.forEach(i=>cells[i].classList.add('pk'));
    if(list.length!==sel.cells.length){sfx.cwKey(list.length);buzz(3)}
    sel.cells=list;
  }
  const unpick=list=>list.forEach(i=>cells[i].classList.remove('pk'));
  dragify(grid,{
    start(e){if(done||api.over())return false;measure();const a=nearest(e.clientX,e.clientY);if(a<0)return false;
      sel={a,k:null,len:0,end:-1,ang:null,cells:[]};live.classList.remove('bad','fade','go');live.classList.add('nt','on');
      live.style.setProperty('--bc',CW_BAND[found.filter(Boolean).length%9]);drawSel([a]);
      /* the first placement jumps; after that the band glides from cell to cell */
      requestAnimationFrame(()=>{if(sel)live.classList.remove('nt')});return true},
    move(x,y){if(sel)drawSel(track(x,y))},
    end(){if(!sel)return;const list=sel.cells;sel=null;unpick(list);check(list)},
    cancel(){if(sel)unpick(sel.cells);sel=null;live.classList.remove('on')}
  });
  /* ---------- a band let go ----------
     Forgiving at the ends: a word is found if the band covers it exactly, or runs one letter past either end of it,
     or stops one letter short of the end of a word of five or more. */
  const sameCells=(a,b)=>a.length===b.length&&a.every((x,k)=>x===b[k]);
  const isWord=(w,l)=>sameCells(w.cells,l)||sameCells(w.cells,l.slice().reverse());
  function match(list){
    const L=list.length,tries=[list];
    if(L>=4){tries.push(list.slice(0,-1),list.slice(1))}
    for(const l of tries){const wi=W.findIndex((w,j)=>!found[j]&&isWord(w,l));if(wi>=0)return wi}
    if(L>=4){const wi=W.findIndex((w,j)=>{if(found[j]||w.cells.length!==L+1)return false;const c=w.cells;
      return sameCells(c.slice(0,L),list)||sameCells(c.slice(1).reverse(),list)});if(wi>=0)return wi}
    return -1;
  }
  function check(list){
    const wi=match(list);
    if(wi>=0){live.classList.remove('on');find(wi,true);return}
    /* a longer swipe over no word is a slip; a tap, a short brush, part of a word not found yet, or a word already found are not */
    const part=W.some((w,j)=>{if(found[j])return false;const k=w.cells.indexOf(list[0]);if(k<0)return false;
      return list.every((i,m)=>w.cells[k+m]===i)||list.every((i,m)=>w.cells[k-m]===i)});
    const old=W.some((w,j)=>found[j]&&(isWord(w,list)||isWord(w,list.slice(0,-1))||isWord(w,list.slice(1))));
    if(list.length>=3&&!part&&!old){slips++;api.meh();sfx.cwWrong();buzz([8,20,8]);live.classList.add('bad');progress(true)}
    live.classList.add('fade');const my=gen;setTimeout(()=>{if(my===gen&&!sel)live.classList.remove('on','bad','fade')},280);
  }
  /* a found word: its band locks in with a flash of light running along it, its letters hop one after another, and a
     chip with the word flies from the board to its place in the bank, which ticks as it lands */
  function find(wi,anim){
    if(anim&&!geo)measure();   // read the layout before anything below changes it
    found[wi]=true;const w=W[wi],k=found.filter(Boolean).length,col=CW_BAND[wi%9],bw=bankEl(wi);
    const b=el('i','cwband got'+(anim&&!FL_RM?' new':''),'<b></b>');b.dataset.w=wi;b.style.setProperty('--bc',col);bands.insertBefore(b,live);bandOf(b,w);
    w.cells.forEach(i=>cells[i].classList.add('f'));
    if(!anim||FL_RM){bw.classList.add('ok');if(anim)sfx.cwWord(w.w.length,k)}
    if(anim){
      api.good(null,{silent:true});buzz([8,20,12]);
      if(!FL_RM){
        sfx.cwWord(w.w.length,k);
        w.cells.forEach((i,n)=>{cells[i].style.setProperty('--d',n*42+'ms');again(cells[i],'sv')});
        const ia=w.cells[0],iz=w.cells[w.cells.length-1],
          cx=geo.x0+((ia%N)+(iz%N))/2*geo.px+geo.cs/2,cy=geo.y0+(Math.floor(ia/N)+Math.floor(iz/N))/2*geo.py+geo.cs/2;
        cwSparks(cx,cy,col,9);
        /* the chip: one element, transform and opacity only */
        const[bx,by]=geo.bank[wi],chip=el('div','cwfly',w.w);chip.style.setProperty('--bc',col);
        chip.style.left=cx+'px';chip.style.top=cy+'px';document.body.appendChild(chip);
        const tx=bx-cx,ty=by-cy;
        const an=chip.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15)',opacity:1,offset:.22},
          {transform:`translate(calc(-50% + ${tx*.5}px),calc(-50% + ${ty*.5 - 40}px)) scale(1)`,opacity:1,offset:.6},
          {transform:`translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(.7)`,opacity:.2}],{duration:620,easing:'cubic-bezier(.45,0,.4,1)'});
        const land=()=>{chip.remove();if(!bw.isConnected)return;bw.classList.add('ok');again(bw,'bp');sfx.cwLand(k);
          cwSparks(bx,by,col,5)};
        an.onfinish=land;an.oncancel=()=>chip.remove();
      }
      api.coach(`✨ <b>${w.w}</b> · ${w.clue}`);
    }
    progress(!anim);
    if(anim&&found.every(Boolean))finish();
  }
  function progress(quiet){const k=found.filter(Boolean).length,pn=$('.cwpn',head);pn.textContent=k;if(!quiet)again(pn,'bp');head.style.setProperty('--p',k/NW);
    if(quiet)api.coach(done?'🎉 Every word found!':`🔤 ${k}/${NW} found · ${T.icon} ${T.name}`);api.moves(score(),s3,s2,0,'Slips')}
  /* every word found: the letters that were never part of a word fade back, the bands light up one after another, a
     sweep of light crosses the paper, then the win card */
  function finish(){
    done=true;api.lock();const my=gen;
    setTimeout(()=>{if(my!==gen)return;sfx.sparkle();wrap.classList.add('won');
      if(!FL_RM)[...bands.querySelectorAll('.got')].forEach((b,i)=>{b.style.setProperty('--d',i*70+'ms');again(b,'gl')})},650);
    setTimeout(()=>{if(my===gen&&wrap.isConnected)api.win(score()<=s3?3:score()<=s2?2:1)},FL_RM?400:1900);
  }
  /* ---------- 📋: every word of the theme with its clue ---------- */
  function clueList(){
    openModal(`<h2>${T.icon} ${T.name}</h2><p class="cwlsub">${T.tag}</p><div class="cwlist">${W.map((w,wi)=>`<div class="cwli${found[wi]?' ok':''}" style="--bc:${CW_BAND[wi%9]}"><b>${found[wi]?'✓':'?'}</b><span><strong>${w.w}</strong> · ${w.clue}</span></div>`).join('')}</div>`,
      [{label:'Back to the board',fn:closeModal}],{cls:'cwlcard',dismiss:closeModal});
  }
  api.setTip('Drag across the letters to circle a word from the bank. Words run in straight lines.');
  progress(true);
  setTimeout(()=>rows.forEach(e=>e.classList.remove('in')),1100);
  return{
    noUndo:true,noNudge:true,goal:`★★★ with ${s3} slips or fewer`,goalShort:`★★★ ≤${s3} slips`,
    snap:()=>JSON.stringify({f:found.map(Number).join(''),s:slips,h:hints,g:CW_GEN}),
    restore(s){const o=JSON.parse(s);gen++;done=false;wrap.classList.remove('won');slips=o.s||0;hints=o.h||0;
      bands.querySelectorAll('.got').forEach(e=>e.remove());bank.querySelectorAll('.ok').forEach(e=>e.classList.remove('ok'));cells.forEach(c=>c.classList.remove('f'));found=new Array(NW).fill(false);
      [...(o.g===CW_GEN&&o.f||'')].forEach((x,wi)=>{if(x==='1'&&wi<NW)find(wi,false)});progress(true)},
    dirty:()=>found.some(Boolean),
    /* 💡: the first letter of a word still hidden glows, and its bank word too */
    hint(){
      if(done)return false;const wi=found.findIndex(f=>!f);if(wi<0)return false;hints++;
      const w=W[wi],c=cells[w.cells[0]];api.flash(c,3200);again(c,'rv');api.flash(bankEl(wi),3200);sfx.cwReveal();api.coach(`💡 <b>${w.w}</b> starts at the glowing letter`);api.moves(score(),s3,s2,0,'Slips');return true;
    },
    _bot(){if(done)return false;const wi=found.findIndex(f=>!f);if(wi<0)return false;find(wi,true);return true},
    key:()=>false,clues:clueList,theme:T,layout:L,_found:()=>found.slice(),_check:check,_match:match,
    destroy(){gen++}
  };
};
