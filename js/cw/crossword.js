'use strict';
/* ====================== Word Search: the puzzle ======================
   An 11x11 board of letters with nine words of one theme (js/cw/themes.js) hidden among them, in straight lines.
   The word bank sits under the board, three by three. Drag across the letters to circle a word: a band follows the
   finger and snaps to the eight directions; let go on a bank word and it is found (it keeps its band, in a colour of
   its own). The first puzzles hide words left-to-right and top-to-bottom only; diagonals come next, then words that
   run backwards. Puzzles 1, 2, 3... go through the themes three at a time; after the last theme the book starts again
   with new word mixes and new boards. (Internally the mode keeps its first name, 'crossword' / 'cw'.) */
const CW_N=11,CW_PER=3;
/* which theme puzzle n belongs to, and which of its word mixes */
function cwPuzzle(n){const i=n-1,T=CW_THEMES.length,t=Math.floor(i/CW_PER)%T,round=Math.floor(i/(CW_PER*T)),v=i%CW_PER;return{t,theme:CW_THEMES[t],round,v,book:round+1}}
/* the directions words may run in: → ↓ ↘ ↗, then the backwards ones ← ↑ ↖ ↙ */
const CW_D=[[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
const cwDirs=n=>n<=6?2:n<=18?3:4;          // forward directions open so far
const cwBack=n=>n<=36?0:n<=72?2:4;         // how many words at most may run backwards
/* random filler letters, weighted like English (the board reads like words, so the real ones hide well) */
const CW_FILL='EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSRRRRRRHHHHHLLLLDDDDCCCUUUMMMFFPPGGWWYYBBVKXJQZ';

function cwBuild(pool,R,n,target=9){
  const N=CW_N,nd=cwDirs(n),nb=cwBack(n);let best=null;
  for(let att=0;att<40;att++){
    const g=Array(N*N).fill(''),words=[];let back=0;
    const ws=shuffle(pool.slice(),R).sort((a,b)=>b[0].length-a[0].length+(R()-.5)*3);
    for(const e of ws){
      if(words.length>=target)break;const w=e[0];let placed=null;
      /* never a word inside another one (STAGE in BACKSTAGE): finding one would find the other */
      if(words.some(o=>o.w.includes(w)||w.includes(o.w)||o.w.includes([...w].reverse().join(''))))continue;
      for(let tr=0;tr<300&&!placed;tr++){
        const wantBack=back<nb&&R()<.35,di=wantBack?4+Math.floor(R()*nd):Math.floor(R()*nd),[dr,dc]=CW_D[di];
        const r0=Math.floor(R()*N),c0=Math.floor(R()*N),r1=r0+dr*(w.length-1),c1=c0+dc*(w.length-1);
        if(r1<0||c1<0||r1>=N||c1>=N)continue;
        const cells=[];let ok=true,shared=0;
        for(let k=0;k<w.length;k++){const i=(r0+dr*k)*N+c0+dc*k;if(g[i]&&g[i]!==w[k]){ok=false;break}if(g[i])shared++;cells.push(i)}
        if(!ok||shared===w.length)continue;
        /* never along the same line as a word already there (one would hide inside the other) */
        if(words.some(o=>Math.abs(o.dr)===Math.abs(dr)&&Math.abs(o.dc)===Math.abs(dc)&&o.dr*dc===o.dc*dr&&o.cells.some(i=>cells.includes(i))))continue;
        placed={w,clue:e[1],cells,dr,dc,back:wantBack};
      }
      if(placed){placed.cells.forEach((i,k)=>g[i]=w[k]);words.push(placed);if(placed.back)back++}
    }
    if(!best||words.length>best.words.length)best={g,words};
    if(words.length>=target)break;
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
  steps:['Press on the first letter of a word and drag to its last letter. A band follows your finger in a straight line.','Let go on a word from the bank and it is found: it keeps its colour and the bank ticks it off.','Words run across and down at first; later on a slant, and even backwards. Stuck? 💡 lights up where a word starts.'],
  demo:()=>{const t=(ch,c='')=>`<span class="cwdc ${c}">${ch}</span>`;
    return htStage(`<div class="cwdm">${t('Q')}${t('C')}${t('A')}${t('P')}${t('E')}${t('X')}${HT_F}</div>`,`<div class="cwdm done"><i class="cwdb"></i>${t('Q')}${t('C','ok')}${t('A','ok')}${t('P','ok')}${t('E','ok')}${t('X')}</div>`,'Drag from C to E','CAPE is found')}
};
/* sounds: a soft rising tick as the band grows, a chime per word found (higher with every word), a gentle "not that" */
sfx.cwKey=k=>{if(!ok())return;voice({f:pent(Math.min(12,k||0)+4,60),dur:.05,type:'triangle',vol:.05});noise({dur:.01,vol:.03,type:'highpass',f:4500})};
sfx.cwWord=(len,k)=>{if(!ok())return;const b=Math.min(6,k);for(let i=0;i<Math.min(len,8);i++)marimba(pent(i+3+b,60),.13,i*.045,undefined,(i/7-.5)*.6);
  bell(pent(12+b,60),.07,1,.06+Math.min(len,8)*.045);noise({dur:.3,vol:.03,type:'highpass',f:7000,verb:.4})};
sfx.cwWrong=()=>{if(!ok())return;const t=now();voice({f:kf(57),dur:.1,type:'triangle',vol:.07,lp:900,t});voice({f:kf(55),dur:.15,type:'triangle',vol:.06,lp:800,t:t+.07})};
sfx.cwReveal=()=>{if(!ok())return;[88,93,96].forEach((n,i)=>bell(kf(n),.04,.5,i*.04))};
/* a colour for every found word (bright, far apart) */
const CW_BAND=['#ff5d73','#ffb020','#3ddc84','#38b6ff','#b06bff','#ff6fd8','#25d0c6','#ff8a3d','#8bd450'];

MAKERS.crossword=function({level,board,api}){
  const N=CW_N,L=cwLayout(level),P=L.P,T=P.theme,W=L.words,NW=W.length,G=L.g;
  let found=new Array(NW).fill(false),slips=0,hints=0,done=false,gen=0;
  const s3=2,s2=6,score=()=>slips+hints*2;
  /* ---------- the board ---------- */
  const wrap=el('div','cww');wrap.style.setProperty('--ac',T.col);
  const head=el('div','cwhead',`<span class="cwtheme"><i>${T.icon}</i><b>${T.name}</b></span><span class="cwprog"><b class="cwpn">0</b>/${NW} found</span>`);
  const grid=el('div','cwgrid'),bands=el('div','cwbands'),live=el('i','cwband live');grid.appendChild(bands);bands.appendChild(live);
  const cells=G.map((ch,i)=>{const c=el('div','cwc',`<b>${ch}</b>`);c.dataset.i=i;grid.appendChild(c);return c});
  /* the word bank: three columns, three rows */
  const bank=el('div','cwbank',W.map((w,wi)=>`<span class="cwbw" data-w="${wi}" style="--bc:${CW_BAND[wi%9]}"><i></i><b>${w.w}</b></span>`).join(''));
  wrap.append(head,grid,bank);board.appendChild(wrap);
  const bankEl=wi=>bank.querySelector(`.cwbw[data-w="${wi}"]`);
  /* ---------- geometry: read once per drag (and again only when the board changes size) ---------- */
  let geo=null;
  const measure=()=>{const a=cells[0].getBoundingClientRect(),b=cells[N+1].getBoundingClientRect();geo={x0:a.left,y0:a.top,cs:a.width,px:b.left-a.left,py:b.top-a.top}};
  const cellAt=(x,y)=>{const c=Math.floor((x-geo.x0+(geo.px-geo.cs)/2)/geo.px),r=Math.floor((y-geo.y0+(geo.py-geo.cs)/2)/geo.py);return[clamp(r,0,N-1),clamp(c,0,N-1)]};
  /* a band from cell a to cell b: one rounded bar, placed and turned with transform (positions inside the grid) */
  function placeBand(e,a,b){
    if(!geo)measure();const cs=geo.cs,px=geo.px,pad=cells[0].offsetLeft;
    const ra=Math.floor(a/N),ca=a%N,rb=Math.floor(b/N),cb=b%N,x=pad+ca*px+cs/2,y=pad+ra*px+cs/2,dx=(cb-ca)*px,dy=(rb-ra)*px;
    const len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI,h=cs*.86;
    e.style.width=(len+h)+'px';e.style.height=h+'px';e.style.transform=`translate(${x-h/2}px,${y-h/2}px) rotate(${ang}deg)`;e.style.transformOrigin=`${h/2}px ${h/2}px`;
  }
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!grid.isConnected){ro.disconnect();return}geo=null;requestAnimationFrame(()=>{if(!grid.isConnected)return;geo=null;
    W.forEach((w,wi)=>{const b=bands.querySelector(`.got[data-w="${wi}"]`);if(b)placeBand(b,w.cells[0],w.cells[w.cells.length-1])})})});ro.observe(grid)}
  /* ---------- dragging ---------- */
  let sel=null;
  function lineCells(a,r,c){
    const ra=Math.floor(a/N),ca=a%N,dr=r-ra,dc=c-ca;if(!dr&&!dc)return[a];
    /* snap to the nearest of the eight directions; the length follows the finger */
    const k=Math.round(Math.atan2(dr,dc)/(Math.PI/4)),sr=Math.round(Math.sin(k*Math.PI/4)),sc=Math.round(Math.cos(k*Math.PI/4)),len=Math.max(Math.abs(dr),Math.abs(dc)),out=[a];
    for(let s=1;s<=len;s++){const rr=ra+sr*s,cc=ca+sc*s;if(rr<0||cc<0||rr>=N||cc>=N)break;out.push(rr*N+cc)}
    return out;
  }
  function drawSel(list){placeBand(live,sel.a,list[list.length-1]);if(list.length!==sel.n){sel.n=list.length;sfx.cwKey(list.length);buzz(3)}sel.cells=list}
  dragify(grid,{
    start(e){if(done||api.over())return false;const c=e.target.closest('.cwc');if(!c)return false;measure();
      const a=+c.dataset.i;sel={a,n:0,cells:[a]};live.classList.remove('bad','fade');live.style.setProperty('--bc',CW_BAND[found.filter(Boolean).length%9]);live.classList.add('on');drawSel([a]);return true},
    move(x,y){if(!sel)return;const[r,c]=cellAt(x,y);drawSel(lineCells(sel.a,r,c))},
    end(){if(!sel)return;const list=sel.cells;sel=null;check(list)},
    cancel(){sel=null;live.classList.remove('on')}
  });
  /* ---------- a band let go ---------- */
  function check(list){
    const same=(w)=>w.cells.length===list.length&&(w.cells.every((i,k)=>i===list[k])||w.cells.every((i,k)=>i===list[list.length-1-k]));
    const wi=W.findIndex((w,j)=>!found[j]&&same(w));
    if(wi>=0){find(wi,true);return}
    /* a longer swipe over no word is a slip (a tap, a short brush, or a word already found are not) */
    /* letting go a letter short (or along part of a word you have not found yet) is no slip: just try again */
    const part=W.some((w,j)=>{if(found[j])return false;const k=w.cells.indexOf(list[0]);if(k<0)return false;
      return list.every((i,m)=>w.cells[k+m]===i)||list.every((i,m)=>w.cells[k-m]===i)});
    if(list.length>=3&&!part&&!W.some((w,j)=>found[j]&&same(w))){slips++;api.meh();sfx.cwWrong();buzz([8,20,8]);live.classList.add('bad');progress(true)}
    live.classList.add('fade');setTimeout(()=>live.classList.remove('on','bad','fade'),280);
  }
  function find(wi,anim){
    found[wi]=true;const w=W[wi],k=found.filter(Boolean).length;
    const b=el('i','cwband got'+(anim?' new':''));b.dataset.w=wi;b.style.setProperty('--bc',CW_BAND[wi%9]);bands.insertBefore(b,live);placeBand(b,w.cells[0],w.cells[w.cells.length-1]);
    live.classList.remove('on');bankEl(wi).classList.add('ok');
    if(anim){
      w.cells.forEach((i,n)=>{cells[i].style.setProperty('--d',n*45+'ms');again(cells[i],'sv')});again(bankEl(wi),'bp');
      sfx.cwWord(w.w.length,k);buzz([8,20,12]);api.good(null,{silent:true});
      if(!FL_RM){const a=cells[w.cells[0]].getBoundingClientRect(),z=cells[w.cells[w.cells.length-1]].getBoundingClientRect(),cx=(a.left+z.right)/2,cy=(a.top+z.bottom)/2;
        flBurst(cx,cy,CW_BAND[wi%9],Q.tier==='low'?6:14,.8);flBurst(cx,cy,'#ffffff',6,.5);
        if(k<NW)floatText(cx,cy-24,['Nice!','Great!','Brilliant!','Superb!','On fire!','Unstoppable!'][Math.min(5,Math.floor(Math.random()*3)+(k>5?3:0))])}
      api.coach(`✨ <b>${w.w}</b> · ${w.clue}`);
    }
    progress(!anim);
    if(anim&&found.every(Boolean))finish();
  }
  function progress(quiet){const k=found.filter(Boolean).length;$('.cwpn',head).textContent=k;if(quiet)api.coach(done?'🎉 Every word found!':`🔤 ${k}/${NW} found · ${T.icon} ${T.name}`);api.moves(score(),s3,s2,0,'Slips')}
  function finish(){
    done=true;api.lock();const my=gen;sfx.sparkle();
    if(!FL_RM)cells.forEach((c,i)=>{const r=Math.floor(i/N),q=i%N;c.style.setProperty('--d',Math.round(Math.hypot(r-5,q-5)*45)+'ms');again(c,'win')});
    wrap.classList.add('won');
    setTimeout(()=>{if(my===gen&&wrap.isConnected)api.win(score()<=s3?3:score()<=s2?2:1)},FL_RM?200:1200);
  }
  /* ---------- 📋: every word of the theme with its clue ---------- */
  function clueList(){
    openModal(`<h2>${T.icon} ${T.name}</h2><p class="cwlsub">${T.tag}</p><div class="cwlist">${W.map((w,wi)=>`<div class="cwli${found[wi]?' ok':''}" style="--bc:${CW_BAND[wi%9]}"><b>${found[wi]?'✓':'?'}</b><span><strong>${w.w}</strong> · ${w.clue}</span></div>`).join('')}</div>`,
      [{label:'Back to the board',fn:closeModal}],{cls:'cwlcard',dismiss:closeModal});
  }
  api.setTip('Drag across the letters to circle a word from the bank. Words run in straight lines.');
  progress(true);
  if(!FL_RM)cells.forEach((c,i)=>{const r=Math.floor(i/N),q=i%N;c.style.animationDelay=(60+(r+q)*22)+'ms';c.classList.add('cin')});
  setTimeout(()=>cells.forEach(c=>{c.classList.remove('cin');c.style.animationDelay=''}),1200);
  return{
    noUndo:true,noNudge:true,goal:`★★★ with ${s3} slips or fewer`,goalShort:`★★★ ≤${s3} slips`,
    snap:()=>JSON.stringify({f:found.map(Number).join(''),s:slips,h:hints}),
    restore(s){const o=JSON.parse(s);gen++;done=false;wrap.classList.remove('won');slips=o.s||0;hints=o.h||0;
      bands.querySelectorAll('.got').forEach(e=>e.remove());bank.querySelectorAll('.ok').forEach(e=>e.classList.remove('ok'));found=new Array(NW).fill(false);
      [...(o.f||'')].forEach((x,wi)=>{if(x==='1'&&wi<NW)find(wi,false)});progress(true)},
    dirty:()=>found.some(Boolean),
    /* 💡: the first letter of a word still hidden glows, and its bank word too */
    hint(){
      if(done)return false;const wi=found.findIndex(f=>!f);if(wi<0)return false;hints++;
      const w=W[wi],c=cells[w.cells[0]];api.flash(c,3200);again(c,'rv');api.flash(bankEl(wi),3200);sfx.cwReveal();api.coach(`💡 <b>${w.w}</b> starts at the glowing letter`);api.moves(score(),s3,s2,0,'Slips');return true;
    },
    _bot(){if(done)return false;const wi=found.findIndex(f=>!f);if(wi<0)return false;find(wi,true);return true},
    key:()=>false,clues:clueList,theme:T,layout:L,_found:()=>found.slice(),_check:check,
    destroy(){gen++}
  };
};
