'use strict';
/* ---------- Star Threads: light up every thread of a constellation in one continuous path ----------
   Press a star and slide to a star it is linked to: that thread lights up and the path carries on from there. Each
   thread can be lit only once. The constellation is generated so that a single path through every thread exists
   (connected, at most two stars with an odd number of threads), so every level can be finished. Hints and the bot use
   Hierholzer's algorithm from the current end of the path, and rewind the path first if it can no longer finish. */
const CONSTELLATIONS=['The Sleepy Fox','The Little Teapot','The Paper Lantern','The Gentle Whale','The Moon Moth','The Tiny Crown','The Garden Gate','The Night Owl','The Dancing Crane','The Lucky Clover','The Silver Kite','The Quiet Harbor'];
const thrDemo=(P,E,lit,finger)=>`<svg class="thd" viewBox="0 0 120 80">${E.map(([a,b],i)=>`<line class="${lit.includes(i)?'g':'d'}" x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}"/>`).join('')}${P.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5.5"/>`).join('')}${finger?`<text class="fg" x="${finger[0]}" y="${finger[1]}">👆</text>`:''}</svg>`;
registerMode('threads',{name:'Star Threads',icon:'✨',col:'#7c6bff',tip:'Light up every thread in one continuous path: press a star and slide to a linked star. Each thread lights only once.'},{
  goal:'Light up every thread of the constellation in one continuous path.',
  steps:['Press a star and slide to a star it is linked to. The thread lights up.','Keep going from the bright star. Each thread can only be lit once. You can lift your finger and carry on.','Light every thread to finish. Stuck? Undo ↩️, or tap 💡 for the next thread.'],
  demo:()=>{const P=[[16,62],[60,14],[104,62],[60,62]],E=[[0,1],[1,2],[2,3],[3,0],[1,3]];
    return htStage(thrDemo(P,E,[],[10,76]),thrDemo(P,E,[0,1,2,3,4]),'Press a star and slide along the threads','Every thread lit: the stars shine!')}
});

/* A constellation: N stars spread over the board, threads between near neighbours that never cross, never pass close
   to another star and never meet at a sliver angle. Then the odd-thread stars are paired off until at most two remain,
   which makes one continuous path through every thread possible. Returns {P,E}. */
function thrGenerate(R,N,Et,SIZE,PAD){
  const seg=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0};
  const ptSeg=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};
  for(let tries=0;tries<300;tries++){
    const P=[],minD=N>9?16:18;
    for(let k=0;k<4000&&P.length<N;k++){const p=[PAD+R()*(SIZE-2*PAD),PAD+R()*(SIZE-2*PAD)];if(P.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=minD))P.push(p)}
    if(P.length<N)continue;
    const E=[],deg=Array(N).fill(0),has=new Set(),key=(a,b)=>Math.min(a,b)+','+Math.max(a,b);
    const ok=(a,b,maxDeg)=>{
      if(has.has(key(a,b))||deg[a]>=maxDeg||deg[b]>=maxDeg)return false;
      for(const[c,d]of E)if(c!==a&&c!==b&&d!==a&&d!==b&&seg(P[a],P[b],P[c],P[d]))return false;
      for(let v=0;v<N;v++)if(v!==a&&v!==b&&ptSeg(P[v],P[a],P[b])<6)return false;
      const ang=(u,w)=>Math.atan2(P[w][1]-P[u][1],P[w][0]-P[u][0]);
      for(const[c,d]of E)for(const[u,w]of[[a,b],[b,a]]){const o=c===u?d:d===u?c:-1;if(o<0)continue;let t=Math.abs(ang(u,w)-ang(u,o));if(t>Math.PI)t=2*Math.PI-t;if(t<.42)return false}
      return true;
    };
    const add=(a,b)=>{E.push([a,b]);deg[a]++;deg[b]++;has.add(key(a,b))};
    const cand=[];for(let a=0;a<N;a++)for(let b=a+1;b<N;b++){const d=Math.hypot(P[a][0]-P[b][0],P[a][1]-P[b][1]);if(d<52)cand.push([a,b,d*(.8+R()*.45)])}
    cand.sort((x,y)=>x[2]-y[2]);
    // connect everything first (Kruskal over the planar candidates), then add threads up to the target count
    const comp=[...Array(N).keys()],find=v=>comp[v]===v?v:comp[v]=find(comp[v]);
    for(const[a,b]of cand)if(find(a)!==find(b)&&ok(a,b,4)){add(a,b);comp[find(a)]=find(b)}
    if(new Set(P.map((_,v)=>find(v))).size>1)continue;
    for(const[a,b]of cand)if(E.length<Et&&ok(a,b,4))add(a,b);
    // pair off odd stars: join two of them with a new thread, or drop a thread between two of them if that keeps it connected
    const connected=()=>{const seen=new Set([0]),st=[0];while(st.length){const v=st.pop();for(const[a,b]of E){const o=a===v?b:b===v?a:-1;if(o>=0&&!seen.has(o)){seen.add(o);st.push(o)}}}return seen.size===N};
    for(let guard=0;guard<40;guard++){
      const odd=[...Array(N).keys()].filter(v=>deg[v]%2);if(odd.length<=2)break;
      let done=false;
      for(const[a,b]of cand)if(deg[a]%2&&deg[b]%2&&ok(a,b,5)){add(a,b);done=true;break}
      if(done)continue;
      for(let i=E.length-1;i>=0&&!done;i--){const[a,b]=E[i];if(!(deg[a]%2&&deg[b]%2))continue;E.splice(i,1);if(connected()){deg[a]--;deg[b]--;has.delete(key(a,b));done=true}else E.splice(i,0,[a,b])}
      if(!done)break;
    }
    if([...Array(N).keys()].filter(v=>deg[v]%2).length>2||!connected()||E.length<N)continue;
    return{P,E,tries};
  }
  return{P:[[22,78],[50,22],[78,78],[50,58],[22,40],[78,40]],E:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,1],[1,5],[5,2]],fallback:true};
}

MAKERS.threads=function({R,tier,board,api}){
  const SIZE=100,PAD=11;
  const N=tier<1?5:tier<2?6:tier<4?7:tier<6?8:tier<9?9:tier<13?10:11;
  const Et=N+1+Math.min(Math.floor(N*.7),1+Math.floor(tier*.8));
  const gen=thrGenerate(R,N,Et,SIZE,PAD),P=gen.P,E=gen.E,NS='http://www.w3.org/2000/svg';
  const eKey={};E.forEach(([a,b],i)=>{eKey[a+','+b]=eKey[b+','+a]=i});
  const deg=Array(N).fill(0);E.forEach(([a,b])=>{deg[a]++;deg[b]++});
  const odd=[...Array(N).keys()].filter(v=>deg[v]%2);
  const other=(i,v)=>E[i][0]===v?E[i][1]:E[i][0];
  const s3=E.length+Math.max(2,Math.ceil(E.length*.3)),s2=2*E.length+4;
  const name=R.pick(CONSTELLATIONS);
  let path=[],moves=0,used=new Uint8Array(E.length),over=false,hintTO=0;

  /* ---- path logic ---- */
  const usedOf=pth=>{const u=new Uint8Array(E.length);for(let k=1;k<pth.length;k++)u[eKey[pth[k-1]+','+pth[k]]]=1;return u};
  const left=()=>E.length-used.reduce((a,b)=>a+b,0);
  const freeFrom=v=>E.some(([a,b],i)=>!used[i]&&(a===v||b===v));
  /* one path through every unused thread starting at s (Hierholzer), as edge indices; null if impossible */
  function trailFrom(s,u){
    const cnt=E.length-u.reduce((a,b)=>a+b,0);if(!cnt)return[];
    const adj=[...Array(N)].map(()=>[]);E.forEach(([a,b],i)=>{if(!u[i]){adj[a].push(i);adj[b].push(i)}});
    const taken=new Uint8Array(E.length),ptr=Array(N).fill(0),stack=[[s,-1]],out=[];
    while(stack.length){
      const[v,e]=stack[stack.length-1];
      while(ptr[v]<adj[v].length&&taken[adj[v][ptr[v]]])ptr[v]++;
      if(ptr[v]===adj[v].length){stack.pop();if(e>=0)out.push(e)}
      else{const ei=adj[v][ptr[v]];taken[ei]=1;stack.push([other(ei,v),ei])}
    }
    if(out.length!==cnt)return null;
    out.reverse();let cur=s;for(const ei of out){if(E[ei][0]!==cur&&E[ei][1]!==cur)return null;cur=other(ei,cur)}
    return out;
  }
  const goodStart=()=>odd.length?odd[0]:0;
  /* the next thread to light; if the current path can no longer finish, how far to rewind first */
  function plan(){
    if(!path.length){const s=goodStart();return{keep:0,from:s,to:other(trailFrom(s,used)[0],s)}}
    for(let k=path.length;k>=1;k--){const pth=path.slice(0,k),t=trailFrom(pth[k-1],usedOf(pth));if(t&&t.length)return{keep:k,from:pth[k-1],to:other(t[0],pth[k-1])}}
    const s=goodStart();return{keep:0,from:s,to:other(trailFrom(s,new Uint8Array(E.length))[0],s)};
  }

  /* ---- DOM ---- */
  const box=el('div','thr glass');
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('class','thsvg');
  svg.innerHTML=`<defs><radialGradient id="thHalo"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd166" stop-opacity=".55"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
    <radialGradient id="thHaloDim"><stop offset="0" stop-color="#dfe6ff" stop-opacity=".7"/><stop offset=".4" stop-color="#8fa2ff" stop-opacity=".22"/><stop offset="1" stop-color="#8fa2ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="thStar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6"/><stop offset=".55" stop-color="#ffd166"/><stop offset="1" stop-color="#f0a020"/></linearGradient>
    <linearGradient id="thStarDim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#aab8ff"/></linearGradient></defs>
    <g class="tl"></g><line class="trb"/><g class="ts"></g><g class="tfx"></g>`;
  const banner=el('div','thname',`<small>constellation</small>${name}`);
  box.append(svg,banner);board.appendChild(box);
  const gl=svg.querySelector('.tl'),gs=svg.querySelector('.ts'),gfx_=svg.querySelector('.tfx'),band=svg.querySelector('.trb');
  const mk=(tag,cls)=>{const e=document.createElementNS(NS,tag);if(cls)e.setAttribute('class',cls);return e};
  const setL=(l,a,b)=>{l.setAttribute('x1',a[0].toFixed(2));l.setAttribute('y1',a[1].toFixed(2));l.setAttribute('x2',b[0].toFixed(2));l.setAttribute('y2',b[1].toFixed(2))};
  const thr=E.map(([a,b])=>{const g=mk('line','thg'),c=mk('line','th');setL(g,P[a],P[b]);setL(c,P[a],P[b]);gl.append(g,c);return{g,c}});
  const STAR_D='M0-4.6L1.35-1.5 4.4-1.3 2.1 .7 2.8 3.8 0 2.1-2.8 3.8-2.1 .7-4.4-1.3-1.35-1.5z';
  const sg=P.map((p,i)=>{const g=mk('g','st');g.dataset.i=i;g.setAttribute('transform',`translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`);
    g.innerHTML=`<circle class="ring" r="6.6"/><circle class="halo" r="9"/><path class="core" d="${STAR_D}"/><circle class="hit" r="9"/>`;gs.appendChild(g);return g});
  api.stagger(sg,45);

  function render(){
    const lit=new Uint8Array(N),dark=new Uint8Array(N);
    E.forEach(([a,b],i)=>{if(used[i]){lit[a]=lit[b]=1}else{dark[a]=dark[b]=1}thr[i].c.classList.toggle('lit',!!used[i]);thr[i].g.classList.toggle('lit',!!used[i])});
    const end=path.length?path[path.length-1]:-1,stuck=end>=0&&!freeFrom(end)&&left()>0;
    sg.forEach((g,i)=>{g.classList.toggle('done',!dark[i]);g.classList.toggle('part',!!lit[i]&&!!dark[i]);g.classList.toggle('end',i===end&&!over);g.classList.toggle('stuck',i===end&&stuck);
      g.classList.toggle('start',!path.length&&tier<2&&i===goodStart())});
    const n=left();
    if(over)api.coach(`🌟 ${name}`);
    else if(stuck)api.coach(`🌑 Dead end: ${n} thread${n>1?'s':''} still dark. Undo ↩️ or tap a star to start over`);
    else if(!path.length)api.coach(tier<2?'👆 Press the glowing star and slide along a thread':'👆 Press any star and slide along a thread');
    else api.coach(`✨ ${n} thread${n>1?'s':''} left · keep going from the bright star`);
    api.moves(moves,s3,s2);
  }
  api.setTip('Light every thread once, in one continuous path: press a star and slide to a linked star. You can lift your finger and carry on from the bright star.');

  /* ---- effects ---- */
  let rect=svg.getBoundingClientRect();
  const toClient=p=>[rect.left+p[0]/SIZE*rect.width,rect.top+p[1]/SIZE*rect.height];
  function lightUp(i,from,to){
    const{c,g}=thr[i];setL(c,P[from],P[to]);setL(g,P[from],P[to]);   // draw in the direction travelled
    const len=Math.hypot(P[to][0]-P[from][0],P[to][1]-P[from][1]);
    wa(c,[{strokeDasharray:String(len),strokeDashoffset:String(len)},{strokeDasharray:String(len),strokeDashoffset:'0'}],{duration:220,easing:'ease-out'});
    wa(g,[{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});
    if(!FL_RM){const sp=mk('circle','tspark');sp.setAttribute('r','2.2');gfx_.appendChild(sp);
      const a=wa(sp,[{transform:`translate(${P[from][0]}px,${P[from][1]}px) scale(1)`,opacity:1},{transform:`translate(${P[to][0]}px,${P[to][1]}px) scale(1.6)`,opacity:1,offset:.85},{transform:`translate(${P[to][0]}px,${P[to][1]}px) scale(2.6)`,opacity:0}],{duration:260,easing:'ease-out'});
      if(a)a.onfinish=()=>sp.remove();else sp.remove()}
    const core=sg[to].querySelector('.core');
    wa(core,[{transform:'scale(1.35)'},{transform:'scale(2.3)',offset:.35},{transform:'scale(1.35)'}],{duration:380,delay:180,easing:'cubic-bezier(.3,1.6,.5,1)'});
  }
  function starDone(v){
    const[x,y]=toClient(P[v]);setTimeout(()=>{if(box.isConnected&&!Q.modal){flBurst(x,y,'#ffd166',6,.45)}},200);
    const h=sg[v].querySelector('.halo');wa(h,[{transform:'scale(1)'},{transform:'scale(1.9)',offset:.35},{transform:'scale(1)'}],{duration:600,delay:180,easing:'ease-out'});
  }
  function flashThread(i){const c=thr[i].c;c.classList.remove('no');void c.getBoundingClientRect();c.classList.add('no');setTimeout(()=>c.classList.remove('no'),420)}
  function nudgeEnd(){const end=path[path.length-1];if(end==null)return;const g=sg[end];g.classList.remove('nudge');void g.getBoundingClientRect();g.classList.add('nudge');setTimeout(()=>g.classList.remove('nudge'),600)}

  /* ---- moves ---- */
  function addSeg(to){
    const from=path[path.length-1],i=eKey[from+','+to];
    used[i]=1;path.push(to);moves++;
    lightUp(i,from,to);sfx.pluck(path.length+3);buzz(8);
    const doneTo=E.every(([a,b],j)=>used[j]||(a!==to&&b!==to)),doneFrom=E.every(([a,b],j)=>used[j]||(a!==from&&b!==from));
    if(doneTo)starDone(to);if(doneFrom&&from!==to)starDone(from);
    clearHint();render();api.commit();
    if(!left())finish();
    else if(!freeFrom(to)){sfx.bonk();buzz([20,40,20]);api.meh();nudgeEnd();const u=$('#undoBtn');u.classList.add('glow');setTimeout(()=>u.classList.remove('glow'),3000)}
    else if(doneTo)api.good(null,{silent:true});   // a star fully lit keeps the combo going
  }
  function startAt(v){path=[v];used=new Uint8Array(E.length);clearHint();render();sfx.lift();
    wa(sg[v].querySelector('.core'),[{transform:'scale(1.35)'},{transform:'scale(2.1)',offset:.4},{transform:'scale(1.35)'}],{duration:340,easing:'cubic-bezier(.3,1.6,.5,1)'})}
  function finish(){
    over=true;box.classList.add('solved');band.classList.remove('on');render();
    sfx.sparkle();buzz([20,40,30]);
    for(let k=1;k<path.length;k++){const i=eKey[path[k-1]+','+path[k]];thr[i].c.style.animationDelay=thr[i].g.style.animationDelay=k*55+'ms'}
    sg.forEach((g,i)=>{g.style.setProperty('--tw',(i*137%900)+'ms');setTimeout(()=>{if(!g.isConnected||Q.modal)return;const[x,y]=toClient(P[i]);flBurst(x,y,'#ffd166',5,.45)},150+i*60)});
    if(!FL_RM){const sh=el('i','tshoot');box.appendChild(sh);setTimeout(()=>sh.remove(),1600)}
    api.win(starsFor(moves,s3,s2));
  }

  /* ---- input: press a star, slide along threads ---- */
  const toView=(x,y)=>[(x-rect.left)/rect.width*SIZE,(y-rect.top)/rect.height*SIZE];
  const starAt=(x,y,r)=>{let best=-1,bd=r;P.forEach((p,i)=>{const d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=i}});return best};
  let drawing=false,lastNo=-1;
  dragify(svg,{
    start(e){
      if(api.over()||over)return false;
      rect=svg.getBoundingClientRect();
      const[x,y]=toView(e.clientX,e.clientY),s=starAt(x,y,9.5);if(s<0)return false;
      const end=path.length?path[path.length-1]:-1;
      if(end<0)startAt(s);
      else if(s!==end){
        const i=eKey[end+','+s];
        if(i!=null&&!used[i])addSeg(s);                                  // tapping a linked star draws to it
        else if(path.length===1||!freeFrom(end)){const had=path.length>1;startAt(s);if(had)api.commit()}   // re-pick the start, or start over after a dead end
        else{sfx.bonk();nudgeEnd();if(i!=null)flashThread(i);api.coach('✨ Carry on from the bright star');return false}
      }
      drawing=true;lastNo=-1;band.classList.add('on');setL(band,P[path[path.length-1]],[x,y]);return true;
    },
    move(x,y){
      if(!drawing||over)return;
      const[vx,vy]=toView(x,y),end=path[path.length-1];
      setL(band,P[end],[vx,vy]);
      const s=starAt(vx,vy,7);
      if(s<0||s===end){lastNo=-1;return}
      const i=eKey[end+','+s];
      if(i!=null&&!used[i]){addSeg(s);lastNo=-1;if(!over)setL(band,P[s],[vx,vy])}
      else if(s!==lastNo){lastNo=s;if(i!=null){flashThread(i);sfx.bonk()}}
    },
    end(){drawing=false;band.classList.remove('on')},
    cancel(){drawing=false;band.classList.remove('on')}
  });

  /* ---- hint / bot ---- */
  function clearHint(){clearTimeout(hintTO);thr.forEach(t=>t.c.classList.remove('next'));sg.forEach(g=>{g.classList.remove('hint');g.removeAttribute('data-h')})}
  /* rewinds a path that can no longer finish (the hint does it for you), then returns the next thread */
  function fixAndPlan(){
    const p=plan();
    if(p.keep<path.length){
      const drop=path.length-Math.max(p.keep,1);
      path=p.keep?path.slice(0,p.keep):[p.from];used=usedOf(path);render();api.commit();
      if(drop>0)toast(`Rewound ${drop} thread${drop>1?'s':''}: that route could not finish ✨`);
    }
    if(!path.length){path=[p.from];render()}
    return p;
  }
  function restore(s){({path,moves}=JSON.parse(s));used=usedOf(path);over=false;box.classList.remove('solved');clearHint();
    thr.forEach(t=>{t.c.style.animationDelay=t.g.style.animationDelay=''});render()}
  render();
  return{
    snap:()=>JSON.stringify({path,moves}),
    restore,
    hint(){
      if(over)return;const p=fixAndPlan();clearHint();
      sg[p.from].dataset.h=1;sg[p.to].dataset.h=2;api.flash(sg[p.to],3200);sg[p.to].classList.add('hint');
      thr[eKey[p.from+','+p.to]].c.classList.add('next');
      hintTO=setTimeout(clearHint,3200);
      api.coach('💡 Slide from the bright star along the glowing thread');
    },
    _info:{stars:N,threads:E.length,odd:odd.length,fallback:!!gen.fallback},
    _bot(){if(over)return false;const p=fixAndPlan();addSeg(p.to);return true},
    destroy(){clearHint()}
  };
};
