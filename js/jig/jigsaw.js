'use strict';
/* ====================== Jigsaw: the puzzle ======================
   A picture cut into a grid (2x2 up to 5x5) and shuffled. Drag a piece (or tap it, then tap a spot) to move it: the
   pieces it lands on trade places with it. Two pieces that belong side by side lock together for good and from then on
   move as one group. The puzzle is done when every piece is home.
   Groups never break. When a group moves, every group it lands on is lifted out whole and fitted, without turning or
   splitting, into the space that is left; single pieces go to the nearest free spot (by preference straight back where
   the moving group came from, so a plain drag reads as a swap). If the groups it lands on cannot be fitted, the move
   is refused and the group springs back.
   Pieces are drawn like Picture Pop cards: a coloured frame around a slice of the picture. Where two pieces are locked
   together the frame and the rounded corners between them melt away, so a finished group reads as one card. */
const JIG_SIZES=[[2,2],[2,3],[3,3],[3,4],[4,4],[4,5],[5,5]];
/* grid size for puzzle n: a gentle climb through the first album page, then mostly 4x5 and 5x5 with a smaller
   breather every few puzzles (12 puzzles = one album page; the page ends on a big one) */
const JIG_EARLY=[0,1,2,3,2,3,4,3,4,5,4,5],JIG_MID=[4,5,3,5,4,6,4,5,6,4,5,6],JIG_LATE=[5,6,4,6,5,6,3,6,5,6,4,6];
const jigSize=n=>{const i=(n-1)%12;return n<=12?JIG_EARLY[i]:n<=36?JIG_MID[i]:JIG_LATE[i]};
/* star targets in moves, by number of pieces (measured against the solver; a careful player beats it) */
const jigPar=N=>({s3:N+1,s2:Math.ceil(N*1.6)+2});
/* pictures as image URLs, kept for a while (the album shows the same ones again) */
const JigPic=(()=>{
  const cache=new Map();
  function get(n){
    let r=cache.get(n);
    if(r){cache.delete(n);cache.set(n,r);return r}
    const c=JIGART.compose(n);r={...c,url:URL.createObjectURL(new Blob([c.svg],{type:'image/svg+xml'}))};delete r.svg;
    cache.set(n,r);
    if(cache.size>48){const k=cache.keys().next().value;URL.revokeObjectURL(cache.get(k).url);cache.delete(k)}
    return r;
  }
  return{get};
})();
INFO.jigsaw={name:'Jigsaw',icon:'🧩',col:'#ff8a3d',tip:'Drag a piece onto another to swap them. Pieces that belong together lock and move as one.'};
HOWTO.jigsaw={
  goal:'Put the picture back together.',
  steps:['Drag a piece onto another piece: they swap places. (Tap a piece, then tap a spot, works too.)','Two pieces that belong side by side lock together and from then on move as one.','Drag a whole group to move it. Hold 👁️ Peek to see the finished picture.'],
  demo:()=>{const a=ppArt(5,160),q=(k,c='')=>`<span class="jdq ${c}"><svg viewBox="${k%2?60:0} ${k>1?80:0} 60 80" preserveAspectRatio="none"><use href="#${a}"/></svg></span>`;
    return htStage(`<div class="jdm">${q(1,'tap')}${q(0)}${q(2)}${q(3)}${HT_F}</div>`,`<div class="jdm done">${q(0,'jl')}${q(1,'jr')}${q(2)}${q(3)}</div>`,'Swap the two top pieces','They lock together')}
};
sfx.jigLift=()=>{if(!ok())return;voice({f:420,dur:.07,type:'triangle',vol:.09,slide:1.5,slideT:.05})};
sfx.jigDrop=()=>{if(!ok())return;voice({f:240,dur:.09,vol:.16,slide:.7});noise({dur:.03,vol:.06,type:'bandpass',f:1600,q:2})};
sfx.jigSnap=k=>{if(!ok())return;const b=Math.min(6,k|0);marimba(pent(b+6,60),.22);marimba(pent(b+8,60),.16,.06);noise({dur:.04,vol:.07,type:'highpass',f:5000})};
sfx.jigCut=()=>{if(!ok())return;const t=now();for(let i=0;i<4;i++)noise({t:t+i*.028,dur:.035,vol:.08,type:'highpass',f:2800+i*700});voice({f:990,dur:.14,type:'triangle',vol:.05,slide:.6})};
sfx.jigScatter=()=>{if(!ok())return;noise({dur:.5,vol:.09,type:'bandpass',f:450,f2:2800,q:1.1,verb:.3});[0,2,4].forEach((s,i)=>marimba(pent(s+9,60),.07,.12+i*.09))};
sfx.jigSlide=()=>{if(!ok())return;noise({dur:.09,vol:.03,type:'bandpass',f:900,f2:1700,q:1.5})};
sfx.jigDone=()=>{if(!ok())return;[0,2,4,7,9].forEach((s,i)=>marimba(pent(s+7,60),.2,i*.07));bell(pent(16,60),.12,1.2,.4)};

MAKERS.jigsaw=function({R,tier,level,board,api}){
  const[C,RW]=JIG_SIZES[Math.min(tier,JIG_SIZES.length-1)],N=C*RW,pic=JigPic.get(level),{s3,s2}=jigPar(N);
  /* ---------- rules (pure: the hint and the solver use them too) ---------- */
  const cx=i=>i%C,cy=i=>(i/C)|0;
  /* group id (a root cell) for every cell: neighbours lock when they hold neighbouring pieces in the same order */
  function groups(g){
    const p=Array.from({length:N},(_,i)=>i),fd=i=>{while(p[i]!==i){p[i]=p[p[i]];i=p[i]}return i};
    for(let i=0;i<N;i++){const a=g[i];
      if(cx(i)<C-1&&cx(a)<C-1&&g[i+1]===a+1)p[fd(i+1)]=fd(i);
      if(i+C<N&&g[i+C]===a+C)p[fd(i+C)]=fd(i)}
    return p.map((_,i)=>fd(i));
  }
  const links=g=>{let n=0;for(let i=0;i<N;i++){const a=g[i];if(cx(i)<C-1&&cx(a)<C-1&&g[i+1]===a+1)n++;if(i+C<N&&g[i+C]===a+C)n++}return n};
  const home=g=>{let n=0;for(let i=0;i<N;i++)if(g[i]===i)n++;return n};
  const cellsOf=(gid,G)=>{const r=[];for(let i=0;i<N;i++)if(gid[i]===G)r.push(i);return r};
  /* move group G by (ox,oy): the new board, or null when it does not fit */
  function plan(g,G,ox,oy,gid=groups(g)){
    if(!ox&&!oy)return null;
    const S=cellsOf(gid,G),T=[];
    for(const c of S){const x=cx(c)+ox,y=cy(c)+oy;if(x<0||y<0||x>=C||y>=RW)return null;T.push(y*C+x)}
    const inS=new Uint8Array(N),inT=new Uint8Array(N);S.forEach(c=>inS[c]=1);T.forEach(c=>inT[c]=1);
    const touched=new Map();
    for(const t of T)if(!inS[t]&&!touched.has(gid[t]))touched.set(gid[t],cellsOf(gid,gid[t]));
    const free=new Uint8Array(N);
    for(const c of S)if(!inT[c])free[c]=1;
    for(const cs of touched.values())for(const c of cs)if(!inT[c])free[c]=1;
    const out=g.slice();S.forEach((c,k)=>{out[T[k]]=g[c]});
    const multi=[...touched.values()].filter(cs=>cs.length>1).sort((a,b)=>b.length-a.length),singles=[...touched.values()].filter(cs=>cs.length===1).map(cs=>cs[0]);
    const used=new Uint8Array(N);let budget=4000;
    const offs=cs=>{const r=[];
      for(let dy=-RW+1;dy<RW;dy++)for(let dx=-C+1;dx<C;dx++){let ok=true;for(const c of cs){const x=cx(c)+dx,y=cy(c)+dy;if(x<0||y<0||x>=C||y>=RW||!free[y*C+x]){ok=false;break}}if(ok)r.push([dx,dy])}
      const d=([dx,dy])=>(dx+ox)**2+(dy+oy)**2+(dx*dx+dy*dy)*.01;return r.sort((a,b)=>d(a)-d(b))};
    const put=[];
    const bt=k=>{if(k===multi.length)return true;if(--budget<0)return false;const cs=multi[k];
      for(const[dx,dy]of offs(cs)){const tc=cs.map(c=>c+dy*C+dx);if(tc.some(t=>used[t]))continue;tc.forEach(t=>used[t]=1);put[k]=[cs,tc];if(bt(k+1))return true;tc.forEach(t=>used[t]=0)}
      return false};
    if(!bt(0))return null;
    put.forEach(([cs,tc])=>cs.forEach((c,i)=>{out[tc[i]]=g[c]}));
    /* single pieces: straight back along the move if that spot is free, else the nearest free spot */
    const left=[];for(let i=0;i<N;i++)if(free[i]&&!used[i])left.push(i);
    const todo=[];
    for(const c of singles){const x=cx(c)-ox,y=cy(c)-oy,t=y*C+x;if(x>=0&&y>=0&&x<C&&y<RW&&free[t]&&!used[t]){used[t]=1;out[t]=g[c]}else todo.push(c)}
    for(const c of todo){let best=-1,bd=1e9;for(const t of left)if(!used[t]){const d=Math.abs(cx(t)-cx(c))+Math.abs(cy(t)-cy(c));if(d<bd){bd=d;best=t}}if(best<0)return null;used[best]=1;out[best]=g[c]}
    return out;
  }
  /* the best next move: a group to its home spot, choosing the one that locks the most pieces; else any move that
     adds locks */
  function best(g){
    const gid=groups(g),roots=[...new Set(gid)];let bm=null,bs=-1;const base=links(g);
    for(const G of roots){const c0=G,a=g[c0],ox=cx(a)-cx(c0),oy=cy(a)-cy(c0);if(!ox&&!oy)continue;
      const ng=plan(g,G,ox,oy,gid);if(!ng)continue;const sc=(links(ng)-base)*100+home(ng)*2+cellsOf(gid,G).length;if(sc>bs){bs=sc;bm={G,ox,oy,anchor:c0}}}
    if(bm)return bm;
    for(const G of roots)for(let oy=-RW+1;oy<RW;oy++)for(let ox=-C+1;ox<C;ox++){const ng=plan(g,G,ox,oy,gid);if(!ng)continue;const sc=links(ng)-base;if(sc>bs){bs=sc;bm={G,ox,oy,anchor:G}}}
    return bs>0?bm:null;
  }
  /* the shuffle: no piece starts at home and no two pieces start locked together */
  function scramble(){
    let g;
    for(let t=0;t<4000;t++){g=shuffle([...Array(N).keys()],R);if(home(g)===0&&links(g)===0)return g}
    return g;
  }

  /* ---------- the board ---------- */
  const IDENT=[...Array(N).keys()],ALL=v=>IDENT.map(()=>[v,v,v,v]);
  const LINKS=(C-1)*RW+C*(RW-1);   // locks in the finished picture
  let g=scramble(),moves=0,busy=true,sel=null,dr=null,justDragged=false,cw=60,ch=80,flags=null;
  /* the opening: the whole picture, a shine, it cracks into cards and they fly to their shuffled spots (tap to skip) */
  let introT=[],introRun=false,introDone=false,introView=[],tutor=null,lastLocks=0,cheered=0;
  const wrap=el('div','jgw'),frame=el('div','jgf'),bd=el('div','jgb'),tl=el('div','jtl'),peekEl=el('div','jpeek'),fx=el('div','jfx');
  const prog=el('div','jprog','<i class="jpb"><b></b></i><span class="jpt"></span>');
  wrap.style.setProperty('--C',C);wrap.style.setProperty('--R',RW);wrap.style.setProperty('--fc',pic.frame);wrap.style.setProperty('--pic',`url("${pic.url}")`);
  peekEl.innerHTML=`<img alt="" src="${pic.url}">`;
  frame.appendChild(bd);frame.appendChild(prog);wrap.appendChild(frame);bd.appendChild(tl);bd.appendChild(peekEl);bd.appendChild(fx);
  const pe=[];   // piece elements by piece id
  for(let p=0;p<N;p++){const e=el('div','jp','<div class="jc"><div class="ji"></div></div>');e.dataset.p=p;e.style.setProperty('--hx',cx(p));e.style.setProperty('--hy',cy(p));pe.push(e);bd.appendChild(e)}
  const tg=Array.from({length:N},()=>{const e=el('div','jtg');tl.appendChild(e);return e});
  board.appendChild(wrap);
  wrap.classList.add('loading');
  const img=new Image();img.src=pic.url;
  const ready=(img.decode?img.decode():Promise.resolve()).catch(()=>{});
  function layout(){
    const w=Math.max(120,board.clientWidth-14),h=Math.max(160,board.clientHeight-10-24);
    let bw=Math.min(w,h*.75,620);cw=Math.floor(bw/C);ch=Math.floor(bw*4/3/RW);
    wrap.style.setProperty('--cw',cw+'px');wrap.style.setProperty('--ch',ch+'px');wrap.style.setProperty('--bw',cw*C+'px');wrap.style.setProperty('--bh',ch*RW+'px');
    if(introRun)place(false,...introView);else place(false);
  }
  const posOf=p=>g.indexOf(p);
  function lockFlags(gg){   // per cell: [left,right,top,bottom] open (1) or locked (0)
    const f=[];for(let i=0;i<N;i++){const a=gg[i];
      f.push([+!(cx(i)>0&&cx(a)>0&&gg[i-1]===a-1),+!(cx(i)<C-1&&cx(a)<C-1&&gg[i+1]===a+1),+!(i>=C&&gg[i-C]===a-C),+!(i+C<N&&gg[i+C]===a+C)])}
    return f;
  }
  /* put every piece where the board `arr` says (with locks `fl`, by default the ones `arr` has) */
  function place(anim=true,arr=g,fl=null){
    const f=fl||lockFlags(arr);
    for(let i=0;i<N;i++){const e=pe[arr[i]],[l,r,t,b]=f[i];
      if(!anim)e.classList.add('still');e.classList.remove('pv');
      e.style.transform=`translate(${cx(i)*cw}px,${cy(i)*ch}px)`;e.dataset.c=i;
      e.style.setProperty('--ul',l);e.style.setProperty('--ur',r);e.style.setProperty('--ut',t);e.style.setProperty('--ub',b)}
    if(!anim){void bd.offsetWidth;pe.forEach(e=>e.classList.remove('still'))}
    if(arr===g)flags=f;
  }
  const ro=window.ResizeObserver?new ResizeObserver(()=>{if(!dr)layout()}):null;if(ro)ro.observe(board);
  layout();
  /* how much of the picture is put together: locks made out of all there are */
  function progress(anim=true){
    const k=links(g),pct=Math.round(k/LINKS*100);
    prog.querySelector('b').style.width=pct+'%';prog.querySelector('.jpt').textContent=pct+'%';
    prog.classList.toggle('full',pct>=100);
    if(anim&&k>lastLocks){gfx.pulse(prog,'bump')}
    lastLocks=k;return pct;
  }

  function runIntro(){
    if(introDone||introRun)return;
    if(gfx.reduced()){endIntro();return}
    introRun=true;busy=true;
    introView=[IDENT,ALL(0)];place(false,...introView);wrap.classList.remove('loading');wrap.classList.add('intro');
    prog.querySelector('b').style.width='0%';prog.querySelector('.jpt').textContent='0%';
    const at=(ms,f)=>introT.push(setTimeout(f,ms));
    at(950,()=>{introView=[IDENT,ALL(1)];place(true,...introView);wrap.classList.add('cut');sfx.jigCut()});
    at(1230,()=>{
      /* each card flies on its own little delay and tilt */
      const order=shuffle(IDENT.slice(),R);
      order.forEach((p,k)=>{const e=pe[p],d=(k*Math.min(18,340/N))+'ms';e.style.transitionDelay=d;e.style.animationDelay=d;e.style.setProperty('--tilt',(R()*16-8).toFixed(1)+'deg');e.classList.add('jfly')});
      introView=[g,null];place(true);sfx.jigScatter();
    });
    at(1230+Math.min(18,340/N)*N+600,endIntro);
  }
  function endIntro(){
    introT.forEach(clearTimeout);introT=[];
    const was=introRun;introRun=false;introDone=true;busy=false;
    pe.forEach(e=>{e.style.transitionDelay='';e.style.animationDelay='';e.classList.remove('jfly')});
    wrap.classList.remove('intro','cut','loading');place(!was);progress(false);
    if(level<=1&&!S.jig.tips.drag)setTimeout(()=>{if(!busy&&!moves)showTutor()},250);
  }
  /* a finger that drags a piece to where it belongs (the first puzzle until the first move, and every hint) */
  function finger(from,to,loops=2){
    hideFinger();
    const f=el('div','jfinger','<i>👆</i>');
    f.style.setProperty('--x0',(cx(from)+.5)*cw+'px');f.style.setProperty('--y0',(cy(from)+.5)*ch+'px');
    f.style.setProperty('--x1',(cx(to)+.5)*cw+'px');f.style.setProperty('--y1',(cy(to)+.5)*ch+'px');
    f.style.setProperty('--n',loops);fx.appendChild(f);tutor=f;
    f.addEventListener('animationend',e=>{if(e.target===f&&loops!=='infinite')hideFinger()});
  }
  function hideFinger(){if(tutor){tutor.remove();tutor=null}}
  function showTutor(){const m=best(g);if(!m)return;finger(m.anchor,m.anchor+m.oy*C+m.ox,'infinite');api.coach('👆 Drag a piece onto another to swap them');S.jig.tips.drag=1;save()}

  /* ---------- feedback ---------- */
  function seams(before,after){
    /* every newly locked edge: a line of light zips along the seam, with a few sparkles; returns them */
    const r=bd.getBoundingClientRect(),out=[];
    for(let i=0;i<N;i++){
      if(before[i][1]&&!after[i][1])out.push([cx(i)+1,cy(i)+.5,'v']);
      if(before[i][3]&&!after[i][3])out.push([cx(i)+.5,cy(i)+1,'h']);
    }
    out.forEach(([x,y,d],k)=>{
      const z=el('i','jzip '+d);z.style.left=x*cw+'px';z.style.top=y*ch+'px';z.style.setProperty('--len',(d==='v'?ch:cw)+'px');z.style.animationDelay=k*45+'ms';
      fx.appendChild(z);setTimeout(()=>z.remove(),900);
      if(k<6)setTimeout(()=>flBurst(r.left+x*cw,r.top+y*ch,'#fff3b0',7,.5),80+k*45);
    });
    return out;
  }
  const say=(x,y,t,big)=>{const r=bd.getBoundingClientRect();floatText(r.left+x*cw,r.top+y*ch,t,big)};
  function settle(prevFlags,G){
    const now=lockFlags(g),made=seams(prevFlags,now),k=made.length;
    const pct=progress(true);
    if(k>0){
      /* the lock chime climbs as the picture comes together */
      sfx.jigSnap(Math.round(pct/100*8));buzz(k>1?[10,30,14]:12);
      const[x,y]=made[0],cell=Math.min(N-1,Math.floor(y)*C+Math.floor(x-(made[0][2]==='v'?1:0)));api.good(pe[g[cell]],{silent:true});
      /* the group that just grew glows */
      const gid=groups(g),root=gid[cell];cellsOf(gid,root).forEach((c,i)=>{const e=pe[g[c]];e.style.setProperty('--d',i*25+'ms');gfx.pulse(e,'jsnap')});
      if(k>=2)setTimeout(()=>say(x,y-.3,k>=4?'Amazing! ✨':k>=3?'Great!':'Nice!',k>=4),120);
      if(moves<=4&&!S.jig.tips.lock){S.jig.tips.lock=1;save();api.coach('🔒 Locked! Locked pieces move as one')}
      /* cheers on the way */
      const cheer=(t)=>setTimeout(()=>{if(busy||api.over())return;say(C/2,RW/2,t,true);sfx.sparkle()},380);
      if(pct<100&&pct>=80&&cheered<2){cheered=2;cheer('Almost there! 🌟')}
      else if(pct<100&&pct>=50&&cheered<1){cheered=1;cheer('Halfway there! 🧩')}
    }else{api.meh();sfx.jigDrop()}
    if(home(g)===N)return win(G);
    api.moves(moves,s3,s2);
  }
  function win(){
    busy=true;api.lock();api.moves(moves,s3,s2);hideFinger();
    /* a wave of light runs across the picture from the last piece placed, sparkles circle the frame, then the card */
    const last=+(bd.dataset.last||0),lx=cx(last),ly=cy(last);
    setTimeout(()=>{pe.forEach((e,p)=>{const d=Math.hypot(cx(p)-lx,cy(p)-ly);e.style.setProperty('--d',Math.round(d*70)+'ms');gfx.pulse(e,'jwave')})},260);
    setTimeout(()=>{
      wrap.classList.add('won');sfx.jigDone();buzz([20,40,30]);
      const r=frame.getBoundingClientRect(),n=14;
      for(let i=0;i<n;i++)setTimeout(()=>{const t=i/n*4,side=Math.floor(t),u=t-side;
        const x=side===0?r.left+u*r.width:side===1?r.right:side===2?r.right-u*r.width:r.left,y=side===0?r.top:side===1?r.top+u*r.height:side===2?r.bottom:r.bottom-u*r.height;
        flBurst(x,y,i%2?'#ffd166':'#ffffff',8,.7)},i*45);
      flRing(r.left+r.width/2,r.top+r.height/2,'#fff',Math.max(r.width,r.height)*.7,900);
    },520);
    setTimeout(()=>api.win(moves<=s3?3:moves<=s2?2:1),1500);
  }
  function commit(ng,anchor){
    const before=flags,prev=g;g=ng;moves++;if(anchor!=null)bd.dataset.last=g[anchor];hideFinger();
    api.commit();place(true);
    /* pieces that were pushed aside get a soft glint when they arrive (the group that was carried has its own landing) */
    for(let i=0;i<N;i++){const q=g[i];if(prev[i]!==q){const e=pe[q];if(e._moved)e._moved=false;else gfx.pulse(e,'jbump')}}
    settle(before);
  }

  /* ---------- drag, tap and the target outline ---------- */
  const bounds=cs=>{let x0=C,x1=0,y0=RW,y1=0;for(const c of cs){x0=Math.min(x0,cx(c));x1=Math.max(x1,cx(c));y0=Math.min(y0,cy(c));y1=Math.max(y1,cy(c))}return{x0,x1,y0,y1}};
  let tgOn=[];
  function showTarget(cs,ox,oy,ok){
    hideTarget();
    cs.forEach((c,k)=>{const e=tg[k],t=c+oy*C+ox;e.style.transform=`translate(${cx(t)*cw}px,${cy(t)*ch}px)`;e.className='jtg on'+(ok?'':' bad');tgOn.push(e)});
  }
  function hideTarget(){tgOn.forEach(e=>{e.className='jtg';delete e.dataset.h});tgOn=[]}
  /* while a group is dragged, the pieces it would push aside slide to where they would go (and back if it can't land) */
  let pvKey='';
  function preview(ng,cs){
    const mv=new Set(cs.map(c=>g[c])),src=ng||g,key=src.join();if(key===pvKey)return;pvKey=key;
    let any=false;
    for(let i=0;i<N;i++){const q=src[i];if(mv.has(q))continue;const e=pe[q];e.style.transform=`translate(${cx(i)*cw}px,${cy(i)*ch}px)`;const m=!!ng&&g[i]!==q;if(m)any=true;e.classList.toggle('pv',m)}
    if(any)sfx.jigSlide();
  }
  let lift=null;
  const grab=(cs,on)=>cs.forEach(c=>pe[g[c]].classList.toggle('grab',on));
  function liftUp(cs,ox=0,oy=0){
    const L=el('div','jlift');L.style.transformOrigin=`${ox}px ${oy}px`;bd.appendChild(L);cs.forEach(c=>{const e=pe[g[c]];e.classList.remove('grab');e._moved=true;L.appendChild(e)});lift=L;sfx.jigLift();
    requestAnimationFrame(()=>L.classList.add('up'));return L;
  }
  function liftDown(cb,toX=0,toY=0,landed=false){
    const L=lift;if(!L){cb&&cb();return}lift=null;
    L.classList.add('land');L.style.transform=`translate(${toX}px,${toY}px)`;
    /* the pieces go back on the board exactly where the lift put them (no transition), then the move plays out */
    const done=()=>{if(!L.isConnected)return;const kids=[...L.children];kids.forEach(e=>{const c=+e.dataset.c;e.classList.add('still');e.style.transform=`translate(${cx(c)*cw+toX}px,${cy(c)*ch+toY}px)`;bd.appendChild(e)});
      void bd.offsetWidth;pe.forEach(e=>e.classList.remove('still'));L.remove();kids.forEach(e=>{if(landed)gfx.pulse(e,'jland');else e._moved=false});cb&&cb()};
    if(gfx.reduced())done();else setTimeout(done,190);
  }
  function refuse(){api.shake();sfx.bonk();buzz(30);if(!S.jig.tips.room){S.jig.tips.room=1;save();api.coach('No room for that group there: move the other group first')}}
  const cellAt=(x,y)=>{const r=bd.getBoundingClientRect(),c=Math.floor((x-r.left)/cw),w=Math.floor((y-r.top)/ch);return c<0||w<0||c>=C||w>=RW?-1:w*C+c};
  bd.addEventListener('pointerdown',e=>{
    if(introRun){endIntro();return}   // a tap during the opening skips it
    if(busy||api.over()||dr)return;const p=e.target.closest('.jp');if(!p||e.button>0)return;
    const c=posOf(+p.dataset.p),gid=groups(g),G=gid[c],cs=cellsOf(gid,G),r=bd.getBoundingClientRect();
    dr={G,c,cs,b:bounds(cs),x0:e.clientX,y0:e.clientY,gx:e.clientX-r.left,gy:e.clientY-r.top,id:e.pointerId,moved:false,ox:0,oy:0,lx:e.clientX,tilt:0};
    if(!sel)grab(cs,true);
    try{bd.setPointerCapture(e.pointerId)}catch(_){}
  });
  bd.addEventListener('pointermove',e=>{
    if(!dr||e.pointerId!==dr.id)return;const dx=e.clientX-dr.x0,dy=e.clientY-dr.y0;
    if(!dr.moved){if(Math.hypot(dx,dy)<7)return;dr.moved=true;clearSel();hideFinger();liftUp(dr.cs,dr.gx,dr.gy);pvKey=''}
    /* the lifted group leans a little into the direction it is moving */
    dr.tilt=dr.tilt*.7+clamp((e.clientX-dr.lx)*.6,-7,7)*.3;dr.lx=e.clientX;
    lift.style.transform=`translate(${dx}px,${dy}px) scale(1.05) rotate(${dr.tilt.toFixed(2)}deg)`;
    const ox=clamp(Math.round(dx/cw),-dr.b.x0,C-1-dr.b.x1),oy=clamp(Math.round(dy/ch),-dr.b.y0,RW-1-dr.b.y1);
    if(ox!==dr.ox||oy!==dr.oy||!tgOn.length){dr.ox=ox;dr.oy=oy;
      if(ox||oy){const ng=plan(g,dr.G,ox,oy);showTarget(dr.cs,ox,oy,!!ng);preview(ng,dr.cs);if(!ng)sfx.tick(.6)}else{hideTarget();preview(null,dr.cs)}}
  });
  const endDrag=e=>{
    if(!dr||e.pointerId!==dr.id)return;const d=dr;dr=null;grab(d.cs,false);
    if(!d.moved)return;   // a tap: the click handler takes it
    justDragged=true;setTimeout(()=>justDragged=false,60);hideTarget();
    const ng=e.type==='pointercancel'||(!d.ox&&!d.oy)?null:plan(g,d.G,d.ox,d.oy);
    if(ng){liftDown(()=>commit(ng,d.c+d.oy*C+d.ox),d.ox*cw,d.oy*ch,true)}
    else{preview(null,d.cs);if(d.ox||d.oy)refuse();liftDown(null,0,0)}
  };
  bd.addEventListener('pointerup',endDrag);bd.addEventListener('pointercancel',endDrag);
  function clearSel(){if(sel){sel=null;liftDown(null,0,0)}hideTarget()}
  bd.addEventListener('click',e=>{
    if(justDragged||busy||api.over())return;
    /* the board captures the pointer, so a tap usually arrives on the board itself: find the cell from where it was */
    let p=e.target.closest('.jp');const t=e.target.closest('.jtg[data-h]');
    const c=t?+t.dataset.c:p&&!lift?.contains(p)?posOf(+p.dataset.p):cellAt(e.clientX,e.clientY);
    if(c<0)return;if(!p||lift?.contains(p))p=pe[g[c]];
    if(!sel){if(!p)return;hideFinger();const gid=groups(g),cs=cellsOf(gid,gid[c]);sel={G:gid[c],c,cs};liftUp(cs,(cx(c)+.5)*cw,(cy(c)+.5)*ch);return}
    const gid=groups(g);
    if(p&&gid[c]===sel.G&&!t){clearSel();return}
    const ox=cx(c)-cx(sel.c),oy=cy(c)-cy(sel.c),G=sel.G,a=sel.c;sel=null;hideTarget();
    const ng=plan(g,G,ox,oy);
    if(ng)liftDown(()=>commit(ng,a+oy*C+ox),ox*cw,oy*ch,true);else{liftDown(null,0,0);refuse()}
  });

  /* ---------- peek: the whole picture over the board ---------- */
  let peekT=0;
  function peek(on){clearTimeout(peekT);wrap.classList.toggle('peek',on!==false);if(on===undefined)peekT=setTimeout(()=>wrap.classList.remove('peek'),1600)}

  api.moves(0,s3,s2);
  const skip=()=>{if(!introDone)endIntro()};
  return{
    noNudge:true,
    goal:`${C}×${RW} · ${N} pieces · ★★★ in ${s3} moves`,goalShort:`${N} pieces · ★★★ ≤${s3}`,
    snap:()=>g.join(',')+'|'+moves,
    restore(s){skip();const[a,m]=s.split('|');g=a.split(',').map(Number);moves=+m;sel=null;if(lift){[...lift.children].forEach(e=>bd.appendChild(e));lift.remove();lift=null}hideTarget();hideFinger();place(true);progress(false);api.moves(moves,s3,s2)},
    hint(){
      skip();if(busy)return false;const m=best(g);if(!m){toast('No move to show');return false}
      clearSel();const gid=groups(g),cs=cellsOf(gid,m.G);
      cs.forEach(c=>api.flash(pe[g[c]],3200));pe[g[m.anchor]].dataset.h='1';
      showTarget(cs,m.ox,m.oy,true);const t=tgOn[cs.indexOf(m.anchor)]||tgOn[0];t.dataset.h='2';t.dataset.c=m.anchor+m.oy*C+m.ox;tgOn.forEach(e=>e.classList.add('hint'));
      finger(m.anchor,m.anchor+m.oy*C+m.ox,2);
      setTimeout(()=>{if(!sel)hideTarget();pe.forEach(e=>delete e.dataset.h)},3200);
      return true;
    },
    _bot(){skip();if(busy)return true;const m=best(g);if(!m)return false;const ng=plan(g,m.G,m.ox,m.oy);if(!ng)return false;commit(ng,m.anchor+m.oy*C+m.ox);return true},
    _state:()=>({g:g.slice(),moves,C,R:RW,N,links:links(g),home:home(g),groups:new Set(groups(g)).size,title:pic.title,intro:introRun}),
    _plan:(G,ox,oy)=>!!plan(g,G,ox,oy),
    _move(G,ox,oy){skip();if(busy)return false;const ng=plan(g,G,ox,oy);if(!ng)return false;commit(ng);return true},
    _groups:()=>groups(g),
    peek,
    /* the opening plays once the how-to (if any) is closed; a kept puzzle (restore) skips it */
    begin(){ready.then(()=>{if(!introDone)runIntro()})},
    destroy(){if(ro)ro.disconnect();clearTimeout(peekT);introT.forEach(clearTimeout)}
  };
};
