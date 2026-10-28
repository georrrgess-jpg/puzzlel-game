'use strict';
/* ---------- Arrow Escape: tap a tile and it zips off the board the way its arrow points ----------
   A tile can only leave if nothing stands in its way; a blocked tile bumps into the one in front and slides back (that
   costs a move). Clear the board.
   Levels are built by placing tiles one at a time, each with a direction that is clear at the moment it is placed.
   Taking them off in reverse order always works, and taking a tile off never blocks another, so any position that is
   still on the board can be finished: the solver simply removes any free tile. */
const AR_D=[[0,-1],[1,0],[0,1],[-1,0]];                       // up, right, down, left
const AR_COL=['#ff4f8b','#ff9f1c','#1fb8ff','#8c5bff'];        // one colour per direction: the board reads at a glance
const AR_ARROW='<svg viewBox="0 0 24 24" class="aa"><path d="M12 3.5l7.5 7.5h-4.6v9.5h-5.8v-9.5H4.5z"/></svg>';
sfx.zip=k=>{if(!ok())return;const b=Math.min(6,k||0);voice({f:pent(b+4,60),dur:.16,type:'triangle',vol:.13,slide:2.4,slideT:.14});
  noise({dur:.18,vol:.06,type:'bandpass',f:1600,f2:5200,q:.9});if(b>=2)bell(pent(b+9,60),.06,.5,.08)};

registerMode('arrows',{name:'Arrow Escape',icon:'🏹',col:'#ff6a3d',tip:'Tap a tile and it slides off the board the way its arrow points. Tiles in the way block it, so pick the free ones first.'},{
  goal:'Clear every tile off the board.',
  steps:['Tap a tile: it slides off the way its arrow points.','A tile with another tile in front of it is blocked. It bumps and comes back.','Free the way first, then tap the tiles behind. Fewer bumps, more stars!'],
  demo:()=>{const t=(d,c='')=>`<span class="ard ${c}" style="--ac:${AR_COL[d]}"><span style="rotate:${d*90}deg">${AR_ARROW}</span></span>`;
    return htStage(`<div class="ardr">${t(1)}${t(1,'tap')}${HT_F}</div>`,`<div class="ardr">${t(1,'go2')}<span class="ard gone go1" style="--ac:${AR_COL[1]}"><span style="rotate:90deg">${AR_ARROW}</span></span></div>`,
      'Tap the front tile','It slides away; now the one behind can go')}
});

/* board shapes (true = a cell that can hold a tile) */
const AR_SHAPES={
  rect:(w,h)=>(x,y)=>true,
  diamond:(w,h)=>(x,y)=>Math.abs(x-(w-1)/2)/(w/2)+Math.abs(y-(h-1)/2)/(h/2)<=1.05,
  circle:(w,h)=>(x,y)=>((x-(w-1)/2)/(w/2))**2+((y-(h-1)/2)/(h/2))**2<=1.08,
  heart:(w,h)=>(x,y)=>{const u=(x-(w-1)/2)/(w/2)*1.25,v=-((y-(h-1)/2)/(h/2))*1.25+.25;return (u*u+v*v-1)**3-u*u*v*v*v<=0.05},
  plus:(w,h)=>(x,y)=>Math.abs(x-(w-1)/2)<=w/4.2||Math.abs(y-(h-1)/2)<=h/4.2
};
MAKERS.arrows=function({R,tier,board,api}){
  const SZ=[[4,4],[5,5],[5,6],[6,6],[6,7],[7,7],[7,8],[8,8]][Math.min(tier,7)],W=SZ[0],H=SZ[1];
  const shape=tier<2?'rect':R.pick(['rect','diamond','circle','heart','plus','rect']);
  const inShape=AR_SHAPES[shape](W,H);
  /* ---- build: place tiles one by one, each pointing somewhere that is clear right now ---- */
  let g=Array(W*H).fill(-1);
  const clear=(gr,x,y,d)=>{for(let X=x+AR_D[d][0],Y=y+AR_D[d][1];X>=0&&Y>=0&&X<W&&Y<H;X+=AR_D[d][0],Y+=AR_D[d][1])if(gr[Y*W+X]>=0)return false;return true};
  const cells=shuffle([...Array(W*H).keys()].filter(i=>inShape(i%W,(i/W)|0)),R);
  const fill=tier<1?.75:tier<3?.85:.95;
  for(const i of cells.slice(0,Math.round(cells.length*fill))){
    const x=i%W,y=(i/W)|0,ds=shuffle([0,1,2,3],R).filter(d=>clear(g,x,y,d));
    /* from tier 1 on, tiles lean towards pointing across the board: a long path is more likely to be crossed by a later
       tile, so more tiles start out blocked and the order matters */
    const len=d=>AR_D[d][0]>0?W-1-x:AR_D[d][0]<0?x:AR_D[d][1]>0?H-1-y:y;
    if(tier>=1)ds.sort((a,b)=>len(b)-len(a)+(R()-.5)*3);
    if(ds.length)g[i]=ds[0];
  }
  const N=g.filter(d=>d>=0).length;
  const s3=N+(tier<2?2:1),s2=N+3+Math.ceil(N*.15);
  /* ---- play state ---- */
  let moves=0,combo=0,lastClear=0;
  const free=i=>g[i]>=0&&clear(g,i%W,(i/W)|0,g[i]);
  /* ---- DOM ---- */
  const wrap=el('div','arw');wrap.style.setProperty('--W',W);wrap.style.setProperty('--H',H);
  const bd=el('div','arb');wrap.appendChild(bd);board.appendChild(wrap);
  for(let i=0;i<W*H;i++)if(inShape(i%W,(i/W)|0)){const d=el('i','ardot');d.style.setProperty('--x',i%W);d.style.setProperty('--y',(i/W)|0);bd.appendChild(d)}
  const tiles=new Map();
  function tileEl(i){
    const d=g[i],e=el('div','art',`<span class="arf" style="rotate:${d*90}deg">${AR_ARROW}</span>`);
    e.style.setProperty('--x',i%W);e.style.setProperty('--y',(i/W)|0);e.style.setProperty('--ac',AR_COL[d]);e.dataset.i=i;
    e.setAttribute('role','button');e.setAttribute('aria-label',['Up','Right','Down','Left'][d]+' arrow');
    bd.appendChild(e);tiles.set(i,e);return e;
  }
  function build(){tiles.forEach(e=>e.remove());tiles.clear();g.forEach((d,i)=>{if(d>=0)tileEl(i)})}
  build();
  /* the tiles pop in as a wave from the middle of the board */
  if(!FL_RM)tiles.forEach((e,i)=>{const dx=i%W-(W-1)/2,dy=((i/W)|0)-(H-1)/2;e.style.animationDelay=(140+Math.hypot(dx,dy)*55)+'ms';e.classList.add('arin')});
  bd.addEventListener('animationend',ev=>{if(ev.animationName==='arin')ev.target.classList.remove('arin');if(ev.animationName==='arno')ev.target.classList.remove('arno');if(ev.animationName==='arhit')ev.target.classList.remove('arhit')});
  const left=()=>g.filter(d=>d>=0).length;
  function hud(){api.moves(moves,s3,s2);api.coach(moves?`🏹 ${left()} tiles left`:'👆 Tap a tile with a clear path')}
  api.setTip('Tap a tile and it slides off the way its arrow points. Blocked tiles bump and come back.');
  hud();

  /* ---- a tap ---- */
  function tap(i,quiet){
    if(api.over()||g[i]<0)return false;
    clearHint();
    const d=g[i],x=i%W,y=(i/W)|0,e=tiles.get(i);moves++;
    if(free(i)){
      g[i]=-1;tiles.delete(i);
      const now=performance.now();combo=now-lastClear<1400?combo+1:0;lastClear=now;
      api.commit();hud();
      if(!quiet){sfx.zip(combo);buzz(6)}
      api.good(e,{silent:true});
      fly(e,d,x,y);
      if(!left()){api.lock();setTimeout(finish,FL_RM?0:520)}
      return true;
    }
    /* blocked: slide up to the tile in the way, bump it, come back */
    let k=1;for(let X=x+AR_D[d][0],Y=y+AR_D[d][1];g[Y*W+X]<0;X+=AR_D[d][0],Y+=AR_D[d][1])k++;
    const bi=(y+AR_D[d][1]*k)*W+x+AR_D[d][0]*k,be=tiles.get(bi);
    api.commit();hud();api.meh();combo=0;
    if(!quiet){sfx.bonk();buzz([8,20,8])}
    if(!FL_RM&&e){
      const c=e.offsetWidth+gap(),dist=(k-1)*c+c*.28,[dx,dy]=AR_D[d];
      wa(e,[{translate:'0 0'},{translate:`${dx*dist}px ${dy*dist}px`,offset:.42,easing:'cubic-bezier(.5,0,.9,.5)'},{translate:`${dx*(dist-6)}px ${dy*(dist-6)}px`,offset:.55},{translate:'0 0'}],{duration:280+k*55,easing:'cubic-bezier(.2,.8,.3,1.2)'});
      e.classList.remove('arno');void e.offsetWidth;e.classList.add('arno');
      if(be)setTimeout(()=>{if(!be.isConnected)return;be.classList.remove('arhit');void be.offsetWidth;be.classList.add('arhit');be.style.setProperty('--hx',dx*5+'px');be.style.setProperty('--hy',dy*5+'px')},(280+k*55)*.42);
    }
    return true;
  }
  const gap=()=>{const a=bd.querySelector('.ardot');return a?parseFloat(getComputedStyle(wrap).getPropertyValue('--gap'))||4:4};
  /* the escape: a little squash, then the tile shoots off with a streak behind it and pops in a puff of its colour */
  function fly(e,d,x,y){
    if(!e)return;
    if(FL_RM){e.remove();return}
    const c=e.offsetWidth+gap(),[dx,dy]=AR_D[d];
    const steps=dx>0?W-x:dx<0?x+1:dy>0?H-y:y+1,dist=(steps+1.4)*c;
    const tr=el('i','artrail');tr.style.setProperty('--ac',AR_COL[d]);tr.style.setProperty('--x',x);tr.style.setProperty('--y',y);tr.style.rotate=(d*90)+'deg';bd.appendChild(tr);
    e.classList.add('argo');
    const sq=dx?`${1.18} ${.86}`:`${.86} ${1.18}`;
    const a=e.animate([{translate:'0 0',scale:1,opacity:1},{translate:`${-dx*4}px ${-dy*4}px`,scale:dx?'.86 1.1':'1.1 .86',offset:.14},
      {translate:`${dx*dist*.55}px ${dy*dist*.55}px`,scale:sq,opacity:1,offset:.7},{translate:`${dx*dist}px ${dy*dist}px`,scale:'.5',opacity:0}],{duration:420,easing:'cubic-bezier(.55,0,.75,.4)',fill:'forwards'});
    tr.animate([{opacity:0,transform:'scaleY(.2)'},{opacity:.9,transform:'scaleY(1)',offset:.35},{opacity:0,transform:`scaleY(${(steps+1)*1.1})`}],{duration:460,easing:'ease-out',fill:'forwards'}).onfinish=()=>tr.remove();
    a.onfinish=()=>e.remove();
    setTimeout(()=>{if(!bd.isConnected)return;const r=bd.getBoundingClientRect(),cs=r.width/W;
      const ex=clamp(r.left+(x+.5+dx*(steps-.2))*cs,r.left,r.right),ey=clamp(r.top+(y+.5+dy*(steps-.2))*cs*(r.height/H/cs),r.top,r.bottom);
      flBurst(ex,ey,AR_COL[d],Q.tier==='low'?5:10,.7)},300);
  }
  function finish(){
    if(!bd.isConnected)return;
    wrap.classList.add('won');const r=bd.getBoundingClientRect();
    if(!FL_RM){fountain(r.left+r.width/2,r.top+r.height/2,Q.tier==='low'?14:30);flRing(r.left+r.width/2,r.top+r.height/2,'#ffd166',r.width,700)}
    sfx.sparkle();api.win(starsFor(moves,s3,s2));
  }
  bd.addEventListener('click',ev=>{const t=ev.target.closest('.art');if(!t||t.classList.contains('argo'))return;tap(+t.dataset.i)});
  function clearHint(){bd.querySelectorAll('.hint').forEach(e=>e.classList.remove('hint'))}

  return{
    snap:()=>JSON.stringify({g,moves}),
    restore(s){const o=JSON.parse(s);g=o.g;moves=o.moves;combo=0;wrap.classList.remove('won');bd.querySelectorAll('.art,.artrail').forEach(e=>e.remove());tiles.clear();build();hud()},
    hint(){const i=g.findIndex((d,j)=>free(j));if(i<0)return false;clearHint();api.flash(tiles.get(i),3200);api.coach('💡 Tap the glowing tile');return true},
    _bot(){const i=g.findIndex((d,j)=>free(j));if(i<0)return false;return tap(i,true)},
    _tap:i=>tap(i)
  };
};
