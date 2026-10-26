'use strict';
/* ---------- Star Threads: drag the stars until no thread crosses another ----------
   Generation (guaranteed solvable): take L lines in general position; every intersection is a star and
   consecutive intersections along a line are joined by a thread. The intersection layout is a crossing-free
   solution. The puzzle shows the same stars scrambled around a circle. */
const CONSTELLATIONS=['The Sleepy Fox','The Little Teapot','The Paper Lantern','The Gentle Whale','The Moon Moth','The Tiny Crown','The Garden Gate','The Night Owl','The Dancing Crane','The Lucky Clover','The Silver Kite','The Quiet Harbor'];
const thrDemo=(P,E,bad,finger)=>`<svg class="thd" viewBox="0 0 120 80">${E.map(([a,b],i)=>`<line class="${bad.includes(i)?'b':'g'}" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`).join('')}${P.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="6"/>`).join('')}${finger?`<text class="fg" x="${finger[0]}" y="${finger[1]}">👆</text>`:''}</svg>`;
registerMode('threads',{name:'Star Threads',icon:'✨',col:'#7c6bff',tip:'Drag the stars so that no glowing threads cross. When every thread is gold, the constellation lights up!'},{
  goal:'Untangle the stars so that no threads cross.',
  steps:['Press and drag a star to move it. On a phone it floats just above your finger.','Threads that cross glow red. Free threads glow gold.','Move stars until every thread is gold. Tap 💡 if you want a suggestion.'],
  demo:()=>{const E=[[0,1],[1,2],[2,3],[3,0],[0,2]];
    return htStage(thrDemo([[20,16],[100,16],[20,64],[100,64]],E,[1,3],[88,70]),thrDemo([[20,16],[100,16],[100,64],[20,64]],E,[]),'Two threads cross. Drag a star','Swap them: every thread is gold!')}
});

/* L lines in general position -> every intersection is a star, consecutive intersections on a line are threads.
   The arrangement is kept near the centre (so every pair intersects) and then stretched to fill the board; stretching
   is an affine map, so the layout stays crossing-free. Returns {sol:[[x,y]..], E:[[a,b]..]}. */
function thrGenerate(R,L,SIZE,PAD){
  const lo=PAD+3,hi=SIZE-PAD-3,minD0={4:18,5:11,6:6,7:3.8}[L]||4;
  for(let tries=0;tries<600;tries++){
    const minD=minD0*(tries<200?1:tries<400?.8:.6);
    const lines=[...Array(L)].map((_,i)=>({th:(i+R()*.5-.25)*Math.PI/L,off:(R()-.5)*14}));
    const V=[],idx={};let ok=true;
    for(let i=0;i<L&&ok;i++)for(let j=i+1;j<L;j++){
      const ni=[-Math.sin(lines[i].th),Math.cos(lines[i].th)],nj=[-Math.sin(lines[j].th),Math.cos(lines[j].th)],det=ni[0]*nj[1]-ni[1]*nj[0];
      if(Math.abs(det)<.12){ok=false;break}
      idx[i+','+j]=V.length;V.push([(lines[i].off*nj[1]-ni[1]*lines[j].off)/det,(ni[0]*lines[j].off-lines[i].off*nj[0])/det]);
    }
    if(!ok)continue;
    const xs=V.map(p=>p[0]),ys=V.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    if(x1-x0<1||y1-y0<1)continue;
    const P=V.map(p=>[lo+(p[0]-x0)/(x1-x0)*(hi-lo),lo+(p[1]-y0)/(y1-y0)*(hi-lo)]);
    let md=1e9;for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++)md=Math.min(md,Math.hypot(P[a][0]-P[b][0],P[a][1]-P[b][1]));
    if(md<minD)continue;
    const E=[];
    for(let i=0;i<L;i++){
      const on=[];for(let j=0;j<L;j++)if(j!==i)on.push(idx[Math.min(i,j)+','+Math.max(i,j)]);
      const d=[Math.cos(lines[i].th),Math.sin(lines[i].th)];
      on.sort((a,b)=>(V[a][0]*d[0]+V[a][1]*d[1])-(V[b][0]*d[0]+V[b][1]*d[1]));
      for(let k=0;k+1<on.length;k++)E.push([on[k],on[k+1]]);
    }
    return{sol:P,E,minD:md,tries};
  }
  return{sol:[[20,20],[80,20],[80,80],[20,80],[50,50]],E:[[0,1],[1,2],[2,3],[3,0],[4,0],[4,2]],fallback:true};
}

MAKERS.threads=function({R,tier,board,api}){
  const L=tier<2?4:tier<5?5:tier<12?6:7;
  const SIZE=100,PAD=9;
  /* ---- build a planar graph from L lines ---- */
  const gen=thrGenerate(R,L,SIZE,PAD);
  const sol=gen.sol,E=gen.E;
  const N=sol.length;
  const share=(a,b)=>a[0]===b[0]||a[0]===b[1]||a[1]===b[0]||a[1]===b[1];
  const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const crosses=(P,e,f)=>{if(share(e,f))return false;const a=P[e[0]],b=P[e[1]],c=P[f[0]],d=P[f[1]];return orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0};
  const countAll=P=>{let n=0;for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++)if(crosses(P,E[i],E[j]))n++;return n};
  const countAt=(P,v)=>{let n=0;for(let i=0;i<E.length;i++){if(E[i][0]!==v&&E[i][1]!==v)continue;for(let j=0;j<E.length;j++)if(j!==i&&crosses(P,E[i],E[j]))n++}return n};
  /* ---- scrambled start: stars evenly round a circle in shuffled order ---- */
  let P;
  for(let t=0;t<60;t++){
    const ord=shuffle([...Array(N).keys()],R);
    P=Array(N);ord.forEach((v,k)=>{const a=k/N*Math.PI*2-Math.PI/2;P[v]=[50+Math.cos(a)*37,50+Math.sin(a)*37]});
    if(countAll(P)>=Math.max(2,Math.floor(E.length*.28)))break;
  }
  const s3=N+3,s2=2*N+5;
  let moves=0,sel=-1,fallback=false,hintTO=0;
  const name=R.pick(CONSTELLATIONS);

  /* ---- DOM ---- */
  const NS='http://www.w3.org/2000/svg';
  const box=el('div','thr glass');
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('class','thsvg');
  svg.innerHTML=`<defs><radialGradient id="thHalo"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="var(--acc)" stop-opacity=".55"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></radialGradient>
    <linearGradient id="thStar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8d6"/><stop offset=".55" stop-color="var(--acc)"/><stop offset="1" stop-color="color-mix(in srgb,var(--acc) 60%,#c47a00)"/></linearGradient></defs>
    <g class="tl"></g><g class="ts"></g><g class="tg"></g>`;
  box.appendChild(svg);board.appendChild(box);
  const gl=svg.querySelector('.tl'),gs=svg.querySelector('.ts'),gg=svg.querySelector('.tg');
  const line=(cls)=>{const l=document.createElementNS(NS,'line');l.setAttribute('class',cls);return l};
  const tg=E.map(()=>{const g=line('thg'),c=line('th');gl.append(g,c);return[g,c]});
  const STAR_D='M0-4.6L1.35-1.5 4.4-1.3 2.1 .7 2.8 3.8 0 2.1-2.8 3.8-2.1 .7-4.4-1.3-1.35-1.5z';
  const sg=P.map((_,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class','st');g.dataset.i=i;
    g.innerHTML=`<circle class="halo" r="8.5" fill="url(#thHalo)"/><path class="core" d="${STAR_D}" transform="scale(1.35)" fill="url(#thStar)"/><circle class="hit" r="8.5"/>`;gs.appendChild(g);return g});
  const ghost=document.createElementNS(NS,'g');ghost.setAttribute('class','tghost');ghost.innerHTML='<circle r="6"/><line/>';gg.appendChild(ghost);
  api.stagger(sg.map(g=>g),40);

  const pos=(g,x,y)=>g.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  let badE=[],badV=[];
  function refresh(){
    const bad=new Uint8Array(E.length),vb=new Uint8Array(N);
    for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++)if(crosses(P,E[i],E[j])){bad[i]=bad[j]=1}
    E.forEach((e,i)=>{if(bad[i]){vb[e[0]]=vb[e[1]]=1}});
    E.forEach((e,i)=>{const[g,c]=tg[i],a=P[e[0]],b=P[e[1]];
      for(const l of[g,c]){l.setAttribute('x1',a[0].toFixed(2));l.setAttribute('y1',a[1].toFixed(2));l.setAttribute('x2',b[0].toFixed(2));l.setAttribute('y2',b[1].toFixed(2))}
      if(bad[i]!==badE[i]){c.setAttribute('class',bad[i]?'th bad':'th');g.setAttribute('class',bad[i]?'thg bad':'thg')}});
    sg.forEach((g,i)=>{pos(g,P[i][0],P[i][1]);if(vb[i]!==badV[i])g.classList.toggle('cx',!!vb[i])});
    badE=[...bad];badV=[...vb];
    const pairs=countAll(P);
    api.coach(pairs?`✨ ${pairs} crossing${pairs>1?'s':''} left`:`🌟 ${name}`);
    api.moves(moves,s3,s2);
    return pairs;
  }
  refresh();
  api.setTip('Drag the stars so that no glowing threads cross. Threads that cross glow red.');

  /* ---- input ---- */
  let rect=svg.getBoundingClientRect();   // refreshed at the start of every drag (the board never moves mid-drag)
  const toView=(x,y)=>[(x-rect.left)/rect.width*SIZE,(y-rect.top)/rect.height*SIZE];
  const clampP=(x,y)=>[clamp(x,PAD,SIZE-PAD),clamp(y,PAD,SIZE-PAD)];
  let drag=-1,dragStartPos=null;
  function clearHint(){clearTimeout(hintTO);ghost.classList.remove('on');sg.forEach(g=>g.classList.remove('hint'))}
  function place(v,x,y,count){
    const[cx,cy]=clampP(x,y);P[v]=[cx,cy];moves+=count?1:0;
    const pairs=refresh();api.commit();
    const was=sg[v];if(count)sfx.pluck(v);
    if(!pairs)finish();
    else if(count&&countAt(P,v)===0)api.good(was);else if(count)api.meh();
  }
  function finish(){
    box.classList.add('solved');sel=-1;sg.forEach(g=>g.classList.remove('sel'));
    sfx.sparkle();buzz([20,40,30]);
    sg.forEach((g,i)=>setTimeout(()=>{if(!g.isConnected||Q.modal)return;const b=g.getBoundingClientRect();burst(b.left+b.width/2,b.top+b.height/2,'#ffd166',5,.45)},120+i*50));
    api.win(starsFor(moves,s3,s2));
  }
  dragify(svg,{
    start(e){
      if(api.over())return false;
      rect=svg.getBoundingClientRect();
      const t=e.target.closest&&e.target.closest('.st');
      clearHint();
      if(t){drag=+t.dataset.i;dragStartPos=P[drag].slice();sg[drag].classList.add('drag');sfx.lift();return true}
      if(sel>=0){const[x,y]=toView(e.clientX,e.clientY);const v=sel;sel=-1;sg[v].classList.remove('sel');place(v,x,y,true);return false}
      return false;
    },
    move(x,y,e){
      if(drag<0)return;
      const[vx,vy]=toView(x,y);
      P[drag]=clampP(vx,vy-LIFT(e)/rect.height*SIZE);
      refresh();
    },
    end(x,y,e,moved){
      if(drag<0)return;const v=drag;drag=-1;sg[v].classList.remove('drag');
      const d=Math.hypot(P[v][0]-dragStartPos[0],P[v][1]-dragStartPos[1]);
      if(!moved||d<2.2){ // a tap: select this star (then tap an empty spot to put it there)
        P[v]=dragStartPos;refresh();
        const was=sel===v;sel=was?-1:v;sg.forEach((g,i)=>g.classList.toggle('sel',i===sel));sfx.tick(was?.8:1.2);return;
      }
      sel=-1;sg.forEach(g=>g.classList.remove('sel'));
      place(v,P[v][0],P[v][1],true);
    },
    cancel(){if(drag>=0){P[drag]=dragStartPos;sg[drag].classList.remove('drag');drag=-1;refresh()}}
  });

  /* ---- hint / bot: the star with most crossings goes to the spot that removes the most ---- */
  function nextMove(){
    const cur=countAll(P);if(!cur)return null;
    if(!fallback){
      const order=[...Array(N).keys()].sort((a,b)=>countAt(P,b)-countAt(P,a)).filter(v=>countAt(P,v)>0);
      for(const v of order){
        let best=null,bc=countAll(P);const old=P[v];
        const cand=[sol[v]];for(let k=0;k<110;k++)cand.push([PAD+R()*(SIZE-2*PAD),PAD+R()*(SIZE-2*PAD)]);
        for(const c of cand){
          if(P.some((p,i)=>i!==v&&Math.hypot(p[0]-c[0],p[1]-c[1])<6))continue;
          P[v]=c;const n=countAll(P);if(n<bc){bc=n;best=c}
        }
        P[v]=old;if(best)return{v,x:best[0],y:best[1]};
      }
      fallback=true;
    }
    const v=[...Array(N).keys()].filter(i=>Math.hypot(P[i][0]-sol[i][0],P[i][1]-sol[i][1])>2).sort((a,b)=>countAt(P,b)-countAt(P,a))[0];
    return v===undefined?null:{v,x:sol[v][0],y:sol[v][1]};
  }
  return{
    snap:()=>JSON.stringify({P,moves}),
    restore(s){({P,moves}=JSON.parse(s));fallback=false;sel=-1;box.classList.remove('solved');clearHint();sg.forEach(g=>g.classList.remove('sel'));badE=[];badV=[];refresh()},
    hint(){
      const m=nextMove();if(!m)return;clearHint();
      const g=sg[m.v];api.flash(g,3200);g.dataset.h=1;
      const c=ghost.querySelector('circle'),l=ghost.querySelector('line');
      c.setAttribute('cx',m.x);c.setAttribute('cy',m.y);l.setAttribute('x1',P[m.v][0]);l.setAttribute('y1',P[m.v][1]);l.setAttribute('x2',m.x);l.setAttribute('y2',m.y);
      ghost.classList.add('on');hintTO=setTimeout(clearHint,3200);
      api.coach('💡 Drag the glowing star to the dashed circle');
    },
    _info:{stars:N,threads:E.length,lines:L,fallback:!!gen.fallback,minD:gen.minD},
    _bot(){const m=nextMove();if(!m)return false;place(m.v,m.x,m.y,true);return true},
    destroy(){clearHint()}
  };
};
