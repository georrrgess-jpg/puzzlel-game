'use strict';
/* ====================== FLUID PUZZLES: Colour Flood, Sort Tubes, Echo Pads ======================
   Same `api` contract as js/puzzles-grid.js. */
/* ---------- Colour Flood ---------- */
MAKERS.flood=function({R,tier,board,api}){
  const n=Math.min(14,6+tier),nc=Math.min(6,4+Math.floor(tier/2));
  let grid=Array.from({length:n*n},()=>R.int(0,nc-1));
  const NB=[[1,0],[-1,0],[0,1],[0,-1]];
  function region(g){
    const col=g[0],seen=new Uint8Array(n*n),q=[0];seen[0]=1;
    for(let h=0;h<q.length;h++){const p=q[h],x=p%n,y=(p/n)|0;
      for(const[dx,dy]of NB){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=n||Y>=n)continue;const m=Y*n+X;if(!seen[m]&&g[m]===col){seen[m]=1;q.push(m)}}}
    return q;
  }
  function fill(g,col){for(const p of region(g))g[p]=col}
  const gainOf=(g,c)=>{if(c===g[0])return 0;const t=g.slice();fill(t,c);return region(t).length-region(g).length};
  function best(g){let bs=-1,bc=-1;for(let c=0;c<nc;c++){if(c===g[0])continue;const t=g.slice();fill(t,c);const s=region(t).length;if(s>bs){bs=s;bc=c}}return bc}
  const sim=grid.slice();let gs=0;
  while(region(sim).length<n*n&&gs<300){fill(sim,best(sim));gs++}
  const limit=gs+Math.ceil(gs*.25)+2,s3=gs,s2=gs+Math.max(1,Math.floor(gs*.15));
  const training=tier<2;
  let moves=0;
  const wrap=el('div','floodwrap');
  const gridEl=el('div','floodgrid');gridEl.style.gridTemplateColumns=`repeat(${n},1fr)`;
  const cellEls=grid.map(()=>{const c=el('i');gridEl.appendChild(c);return c});
  const prog=el('div','fprog','<div class="bar"><div></div></div>'),pbar=prog.querySelector('.bar>div');
  const btns=el('div','cbtns');
  const bEls=[...Array(nc).keys()].map(c=>{const b=el('button','cbtn');b.style.background=COLORS[c];b.onclick=()=>pick(c);btns.appendChild(b);return b});
  wrap.append(gridEl,prog,btns);board.appendChild(wrap);api.stagger(bEls,60);
  gridEl.classList.add('popin');
  function render(animate,fresh){
    const reg=new Set(region(grid));
    cellEls.forEach((c,i)=>{
      c.style.transitionDelay=animate&&reg.has(i)?((i%n)+((i/n)|0))*16+'ms':'0ms';
      c.style.background=COLORS[grid[i]];c.classList.toggle('own',reg.has(i));c.textContent=S.symbols?SYMS[grid[i]]:'';
    });
    if(fresh)fresh.forEach(i=>{const c=cellEls[i];c.style.animationDelay=((i%n)+((i/n)|0))*16+'ms';c.classList.remove('cap');void c.offsetWidth;c.classList.add('cap')});
    bEls.forEach((b,c)=>{b.classList.toggle('cur',c===grid[0]);b.classList.remove('hint');
      const g=training&&c!==grid[0]?gainOf(grid,c):0;b.innerHTML=(S.symbols?SYMS[c]:'')+(g?`<span class="gain">+${g}</span>`:'')});
    pbar.style.width=reg.size/(n*n)*100+'%';
    const left=limit-moves;
    api.coach(`🎨 ${Math.round(reg.size/(n*n)*100)}% flooded · ${left} move${left===1?'':'s'} left${training?' · numbers show how many squares you\'ll grab':''}`);
    api.moves(moves,s3,s2,limit);
  }
  function pick(c){
    if(api.over()||c===grid[0])return;
    const old=new Set(region(grid));fill(grid,c);moves++;
    const now_=region(grid),fresh=now_.filter(i=>!old.has(i));
    sfx.pad(c+2);sfx.pour(1);buzz(10);
    const[x,y]=centerOf(cellEls[0]);burst(x,y,COLORS[c],12,.9);
    render(true,fresh);api.commit();
    fresh.length>=Math.max(2,n/3)?api.good(bEls[c]):api.meh();
    if(now_.length===n*n)api.win(starsFor(moves,s3,s2));
    else if(moves>=limit)api.fail('Out of moves!',`The board wasn't flooded in ${limit} moves. Tip: pick the colour that grabs the most squares.`);
  }
  render();
  return{
    snap:()=>JSON.stringify({grid,moves}),
    restore(s){({grid,moves}=JSON.parse(s));render(true)},
    hint(){const c=best(grid);if(c>=0)api.flash(bEls[c])}
  };
};

/* ---------- Sort Tubes ---------- */
MAKERS.tubes=function({R,tier,board,api}){
  const cap=4,nc=Math.min(10,3+Math.floor(tier*.9));
  let tubes;
  do{
    const segs=shuffle([...Array(nc*cap).keys()].map(i=>Math.floor(i/cap)),R);
    tubes=[...Array(nc)].map((_,i)=>segs.slice(i*cap,i*cap+cap)).concat([[],[]]);
  }while(tubes.some(t=>t.length&&t.every(v=>v===t[0])));
  const canPour=(ts,a,b)=>{
    if(a===b)return 0;const A=ts[a],B=ts[b];if(!A.length||B.length>=cap)return 0;
    const col=A[A.length-1];if(B.length&&B[B.length-1]!==col)return 0;
    let run=0;for(let i=A.length-1;i>=0&&A[i]===col;i--)run++;return Math.min(run,cap-B.length);
  };
  const uniform=t=>t.length>0&&t.every(v=>v===t[0]);
  const solved=ts=>ts.every(t=>!t.length||(t.length===cap&&uniform(t)));
  const pourMoves=ts=>{
    const out=[];
    for(let a=0;a<ts.length;a++)for(let b=0;b<ts.length;b++){
      const cnt=canPour(ts,a,b);if(!cnt)continue;
      if(uniform(ts[a])&&!ts[b].length)continue;
      out.push([a,b,cnt]);
    }
    return out;
  };
  const doPour=(ts,a,b,cnt)=>{const nx=ts.map(t=>t.slice());nx[b].push(...nx[a].splice(nx[a].length-cnt,cnt));return nx};
  // weighted A*; tubes are interchangeable so states are keyed with sorted tubes
  function solve(start,maxNodes=12000){
    const hf=ts=>{let h=0;for(const t of ts){if(!t.length)continue;let r=1;while(r<t.length&&t[r]===t[0])r++;h+=t.length-r}return h};
    const ck=ts=>ts.map(t=>t.join('')).sort().join('|');
    const nodes=[{ts:start,g:0,p:-1,mv:null}],heap=[[2*hf(start),0]],seen=new Set([ck(start)]);
    const push=e=>{heap.push(e);let i=heap.length-1;while(i>0){const q=(i-1)>>1;if(heap[q][0]<=heap[i][0])break;[heap[q],heap[i]]=[heap[i],heap[q]];i=q}};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let l=2*i+1,r=l+1,m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
    let exp=0;
    while(heap.length&&exp++<maxNodes){
      const id=pop()[1],nd=nodes[id];
      if(solved(nd.ts)){const path=[];for(let i=id;nodes[i].p>=0;i=nodes[i].p)path.push(nodes[i].mv);return path.reverse()}
      for(const[a,b,cnt]of pourMoves(nd.ts)){
        const nx=doPour(nd.ts,a,b,cnt),k=ck(nx);if(seen.has(k))continue;seen.add(k);
        nodes.push({ts:nx,g:nd.g+1,p:id,mv:[a,b]});push([nd.g+1+2*hf(nx),nodes.length-1]);
      }
    }
    return null;
  }
  const t0sol=solve(tubes);
  const par=t0sol?t0sol.length:nc*3;
  const s2=Math.ceil(par*1.4)+2;
  let moves=0,sel=-1,hintPair=null,lastNew=null,lastFrom=-1;
  const wrap=el('div','tubes');if(tubes.length<=6)wrap.style.setProperty('--seg','clamp(30px,min(11vw,8dvh),48px)');board.appendChild(wrap);
  const tEls=tubes.map((_,i)=>{const t=el('div','tube');t.onclick=()=>tapTube(i);wrap.appendChild(t);return t});
  api.stagger(tEls,50);
  function render(){
    tubes.forEach((t,i)=>{
      const e=tEls[i];e.innerHTML='';
      t.forEach((c,j)=>{const s=el('div','seg'+(lastNew&&lastNew.i===i&&j>=lastNew.from?' new':''),S.symbols?SYMS[c]:'');s.style.background=`linear-gradient(90deg,${COLORS[c]},color-mix(in srgb,${COLORS[c]} 78%,#000))`;if(lastNew&&lastNew.i===i)s.style.animationDelay=(j-lastNew.from)*60+'ms';e.appendChild(s)});
      e.classList.toggle('sel',i===sel);
      e.classList.toggle('done',t.length===cap&&uniform(t));
      e.classList.toggle('tilt',i===lastFrom);
      e.classList.remove('hint');e.removeAttribute('data-h');
      const can=sel>=0&&i!==sel&&canPour(tubes,sel,i)>0;
      e.classList.toggle('ok',can);e.classList.toggle('no',sel>=0&&i!==sel&&!can);
    });
    api.coach(hintPair?'💡 Tap tube 1, then tube 2':sel<0?'👆 Tap a tube to pick up its top colour':tubes.some((_,i)=>i!==sel&&canPour(tubes,sel,i)>0)?'✨ Now tap a glowing tube to pour into':'🚫 Nowhere to pour that colour. Tap it again to put it down');
    if(hintPair){hintPair.forEach((i,k)=>{tEls[i].classList.add('hint');tEls[i].dataset.h=k+1;tEls[i].appendChild(el('div','hn',k+1))})}
    const done=tubes.filter(t=>t.length===cap&&uniform(t)).length;
    if(!hintPair&&sel<0&&done)api.coach(`🧪 ${done} of ${nc} tubes sorted · tap a tube to pick up its top colour`);
    api.moves(moves,par,s2);
  }
  function tapTube(i){
    if(api.over())return;
    if(!(hintPair&&sel<0&&i===hintPair[0]))hintPair=null;
    if(sel<0){if(!tubes[i].length){sfx.bad();return}sel=i;sfx.pop(1.2);render();return}
    if(sel===i){sel=-1;sfx.pop(.8);render();return}
    const cnt=canPour(tubes,sel,i);
    if(!cnt){
      if(tubes[i].length){sel=i;sfx.pop(1.2)}else{sel=-1;sfx.bad()}
      render();return;
    }
    const from=sel,col=tubes[from][tubes[from].length-1],stacking=tubes[i].length>0;
    flyDrops(tEls[from],tEls[i],COLORS[col],3+cnt*2);
    const mv=tubes[from].splice(tubes[from].length-cnt,cnt);
    lastNew={i,from:tubes[i].length};tubes[i].push(...mv);lastFrom=from;
    sel=-1;moves++;sfx.pour(cnt);buzz(10);
    render();api.commit();lastFrom=-1;lastNew=null;
    const finished=tubes[i].length===cap&&uniform(tubes[i]);
    if(finished){setTimeout(sfx.done,250);const[x,y]=centerOf(tEls[i]);burst(x,y,COLORS[tubes[i][0]],24,1.1);ring(x,y,COLORS[tubes[i][0]],160)}
    if(stacking||finished)api.good(tEls[i],{silent:true});
    if(solved(tubes))api.win(starsFor(moves,par,s2));
    else if(!pourMoves(tubes).length){toast('No moves left — try Undo! ↩️');$('#undoBtn').classList.add('glow');setTimeout(()=>$('#undoBtn').classList.remove('glow'),3000)}
  }
  render();
  return{
    snap:()=>JSON.stringify({tubes,moves}),
    restore(s){({tubes}=JSON.parse(s));moves=JSON.parse(s).moves;sel=-1;hintPair=null;lastNew=null;lastFrom=-1;render()},
    hint(){
      const path=solve(tubes,25000);
      if(!path||!path.length){toast('No way forward from here — try Undo!');return}
      const m=path[0];sel=-1;hintPair=m;render();setTimeout(()=>{if(hintPair===m){hintPair=null;render()}},3200);
    }
  };
};

/* ---------- Echo Pads ---------- */
MAKERS.memory=function({R,tier,board,api}){
  const pads=tier<2?4:tier<5?6:9,cols=pads===4?2:3;
  const L=Math.min(12,3+tier);
  const reverse=tier>=3&&R()<.5;
  const speed=Math.max(270,580-tier*22);
  const seq=Array.from({length:L},()=>R.int(0,pads-1));
  let dead=false,round=1,pos=0,mistakes=0,phase='idle',timers=[];
  const after=(fn,ms)=>{const t=setTimeout(()=>{if(!dead)fn()},ms);timers.push(t)};
  const wrap=el('div');wrap.style.cssText='width:100%;display:flex;flex-direction:column;align-items:center;gap:14px';
  const note=el('div','memnote');
  const dots=el('div','rdots');dots.innerHTML='<i></i>'.repeat(L);
  const grid=el('div','pads glass');grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  if(pads===9)grid.style.setProperty('--bs','min(86vw,calc(100dvh - 450px),420px)');
  else grid.style.setProperty('--bs','min(86vw,calc(100dvh - 430px),440px)');
  const pEls=[...Array(pads).keys()].map(i=>{const p=el('button','pad',`<span>${SYMS[i]}</span>`);p.style.background=`radial-gradient(circle at 50% 120%,color-mix(in srgb,${COLORS[i]} 60%,#000),${COLORS[i]})`;p.style.setProperty('--pc',COLORS[i]);p.onclick=()=>tapPad(i);grid.appendChild(p);return p});
  wrap.append(note,grid,dots);board.appendChild(wrap);api.stagger(pEls,70);
  const yourTurn=()=>reverse?`Your turn · BACKWARDS · ${pos+1}/${round}`:`Your turn! · ${pos+1}/${round}`;
  if(reverse)api.setTip('<b>Backwards rounds:</b> watch the pattern, then tap it in reverse. Start with the last pad that lit up.');
  const expected=()=>reverse?seq.slice(0,round).reverse():seq.slice(0,round);
  function info(){
    api.setInfo(`<div class="meter"><div class="mtx"><span>Round <b>${round}</b> / ${L}</span><span>${'❤️'.repeat(3-mistakes)}${'🖤'.repeat(mistakes)}</span></div></div>`);
    api.setStars(mistakes===0?3:mistakes===1?2:1);
    [...dots.children].forEach((d,i)=>{d.className=i<round-1?'d':i===round-1?'c':''});
  }
  function lit(i,ms){const p=pEls[i];p.classList.add('lit');sfx.pad(i);const[x,y]=centerOf(p);ring(x,y,COLORS[i],p.offsetWidth*1.6,500);after(()=>p.classList.remove('lit'),ms)}
  function setNote(t,go){note.textContent=t;note.classList.toggle('go',!!go)}
  function showRound(){
    phase='show';pos=0;info();setNote(reverse?'👀 Watch… then repeat in REVERSE':'👀 Watch closely…');
    api.coach(`🎵 Round ${round}: ${round} pad${round>1?'s':''} to remember`);
    const s=seq.slice(0,round);
    s.forEach((p,k)=>{after(()=>lit(p,speed*.7),700+k*speed)});
    after(()=>{phase='input';setNote(yourTurn(),true)},700+s.length*speed);
  }
  function tapPad(i){
    if(api.over()||phase!=='input'){if(phase==='show')sfx.tick(.7);return}
    const want=expected()[pos];
    if(i===want){
      lit(i,200);buzz(8);const[x,y]=centerOf(pEls[i]);burst(x,y,COLORS[i],10,.7);pos++;api.good(pEls[i],{silent:true});
      if(pos<round)setNote(yourTurn(),true);
      if(pos===round){
        phase='idle';sfx.good();
        if(round===L){after(()=>api.win(mistakes===0?3:mistakes===1?2:1),500);return}
        round++;setNote(['Nice! ✨','Great memory! 🧠','Perfect! 🎯','Keep going! 🔥'][round%4]);info();after(showRound,900);
      }
    }else{
      mistakes++;phase='idle';sfx.bad();buzz(120);api.shake();api.meh();
      pEls[i].classList.add('wrong');after(()=>pEls[i].classList.remove('wrong'),400);info();
      if(mistakes>=3){api.fail('Out of lives!','Your memory got scrambled. Give it another go!');return}
      setNote('Oops! Watch again…');after(showRound,1100);
    }
  }
  info();
  return{
    noUndo:true,noNudge:true,begin(){after(showRound,600)},_seq:seq,_expected:expected,_phase:()=>phase,_pos:()=>pos,
    snap:()=>'',restore(){},
    destroy(){dead=true;timers.forEach(clearTimeout)},
    hint(){
      if(phase!=='input')return;phase='show';setNote('👀 Watch again…');
      seq.slice(0,round).forEach((p,k)=>after(()=>lit(p,speed*.7),500+k*speed));
      pos=0;after(()=>{phase='input';setNote(yourTurn(),true)},500+round*speed);
    }
  };
};
