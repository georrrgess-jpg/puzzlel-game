'use strict';
/* one shared grain tile for every sand layer (random specks, so it tiles seamlessly) */
(function(){
  if(document.documentElement.style.getPropertyValue('--sand'))return;
  const c=document.createElement('canvas');c.width=c.height=60;const g=c.getContext('2d'),d=g.createImageData(60,60);
  for(let i=0;i<d.data.length;i+=4){const r=Math.random();if(r<.36){const light=r<.18;d.data[i]=d.data[i+1]=d.data[i+2]=light?255:0;d.data[i+3]=light?58:64}}
  g.putImageData(d,0,0);document.documentElement.style.setProperty('--sand',`url(${c.toDataURL()})`);
})();
/* ---------- Sort Tubes ---------- */
registerMode('tubes',{name:'Sand Tubes',icon:'⏳',col:'#22b8c9',tip:'Tap a tube to scoop up its top sand, then tap another tube to pour it. Make every tube hold one colour.'},{goal:'Make every tube hold a single colour of sand.',steps:['Tap a tube to scoop up its top sand.','Tap another tube to pour. It must be empty, or already have the same colour on top. Tubes you can pour into glow.','Fill each tube with 4 of one colour. The empty tubes are spare space.'],
    demo:()=>htStage(`<div class="mtrow">${tube([0,6],'tap',HT_F)+tube([6],'tap2',HT_F2)+tube([])}</div>`,`<div class="mtrow">${tube([0])+tube([6,6],'grow')+tube([])}</div>`,
      'Tap the tube with blue on top, then the blue tube','The blue pours across')});
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
  let plan=t0sol?t0sol.slice():null,hintT=0;   // the generation-time solution: hints follow it for free while the player does
  const par=t0sol?t0sol.length:nc*3;
  const s3=par+2+Math.floor(par*.2),s2=Math.ceil(par*1.7)+5;
  let moves=0,sel=-1,hintPair=null,lastNew=null,lastFrom=-1,lastGhost=null;
  const wrap=el('div','tubes');if(tubes.length<=6)wrap.style.setProperty('--seg','clamp(28px,min(11vw,calc((var(--bh0,500px) - 52px) / 4.7)),48px)');board.appendChild(wrap);
  const tEls=tubes.map((_,i)=>{const t=el('div','tube');t.onclick=()=>tapTube(i);wrap.appendChild(t);return t});
  api.stagger(tEls,50);
  /* static decoration is created once per tube; only the sand layers are rebuilt, and only when a tube's contents changed */
  tEls.forEach(e=>{e.appendChild(el('i','gf-tk'));e.appendChild(el('i','gf-sh'));e.appendChild(el('i','gf-gl'))});
  function buildSand(e,t,i){
    e.querySelectorAll('.seg').forEach(x=>x.remove());
    const isNew=j=>lastNew&&lastNew.i===i&&j>=lastNew.from,ghost=lastGhost&&lastGhost.i===i?lastGhost.segs:[];
    t.forEach((c,j)=>{
      const s=el('div','seg'+(isNew(j)?' new':'')+(j===t.length-1&&!ghost.length?' top':'')+(j&&t[j-1]===c?' same':''),S.symbols?SYMS[c]:'');
      s.style.setProperty('--c',COLORS[c]);if(isNew(j))s.style.animationDelay=(FL_RM?0:230)+(j-lastNew.from)*90+'ms';e.appendChild(s)});
    /* sand that just left this tube drains away from the top */
    ghost.forEach((c,k)=>{const s=el('div','seg gone'+(k===ghost.length-1?' top':''));s.style.setProperty('--c',COLORS[c]);s.style.animationDelay=(FL_RM?0:200)+(ghost.length-1-k)*90+'ms';e.appendChild(s)});
  }
  /* once the pour animations have played, turn the tube back into plain resting layers */
  function settle(e){
    e.querySelectorAll('.seg.gone').forEach(x=>x.remove());
    e.querySelectorAll('.seg.new').forEach(x=>{x.classList.remove('new');x.style.animationDelay=''});
    const segs=e.querySelectorAll('.seg');segs.forEach((x,j)=>x.classList.toggle('top',j===segs.length-1));
  }
  function render(){
    if(!wrap.isConnected)return;
    tEls.forEach(e=>{e.querySelectorAll('.hn').forEach(x=>x.remove())});
    tubes.forEach((t,i)=>{
      const e=tEls[i];
      /* rebuild only when the contents change (or a pour just touched this tube), so selecting another tube never cuts a fill/drain short */
      const key=t.join('')+(S.symbols?'s':''),fresh=lastNew&&lastNew.i===i?1400:lastGhost&&lastGhost.i===i?820:0;
      if(e._k!==key||fresh){e._k=key;buildSand(e,t,i);clearTimeout(e._st);if(fresh)e._st=setTimeout(()=>settle(e),FL_RM?0:fresh)}
      e.classList.toggle('sel',i===sel);
      /* mark the top run of one colour (what a pour would move) on the selected tube */
      const segs=e.querySelectorAll('.seg:not(.gone)');let run=0;
      if(i===sel)while(run<t.length&&t[t.length-1-run]===t[t.length-1])run++;
      segs.forEach((x,j)=>x.classList.toggle('run',j>=segs.length-run));
      e.classList.toggle('done',t.length===cap&&uniform(t));
      e.classList.remove('hint');e.removeAttribute('data-h');
      const can=sel>=0&&i!==sel&&canPour(tubes,sel,i)>0;
      e.classList.toggle('ok',can);e.classList.toggle('no',sel>=0&&i!==sel&&!can);
    });
    api.coach(hintPair?'💡 Tap tube 1, then tube 2':sel<0?'👆 Tap a tube to scoop up its top sand':tubes.some((_,i)=>i!==sel&&canPour(tubes,sel,i)>0)?'✨ Now tap a glowing tube to pour into':'🚫 Nowhere to pour that sand. Tap it again to put it down');
    if(hintPair){hintPair.forEach((i,k)=>{tEls[i].classList.add('hint');tEls[i].dataset.h=k+1;tEls[i].appendChild(el('div','hn',k+1))})}
    const done=tubes.filter(t=>t.length===cap&&uniform(t)).length;
    if(!hintPair&&sel<0&&done)api.coach(`🧪 ${done} of ${nc} tubes sorted · tap a tube to scoop up its top sand`);
    api.moves(moves,s3,s2);
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
    const mv=tubes[from].splice(tubes[from].length-cnt,cnt),oldLen=tubes[i].length;
    if(plan&&plan.length&&plan[0][0]===from&&plan[0][1]===i)plan.shift();else plan=null;
    lastNew={i,from:oldLen};tubes[i].push(...mv);lastFrom=from;lastGhost={i:from,segs:mv};
    sel=-1;moves++;sfx.sand(cnt);buzz(10);
    render();api.commit();lastFrom=-1;lastNew=null;lastGhost=null;
    pourAnim(from,i,COLORS[col],cnt,oldLen);
    const finished=tubes[i].length===cap&&uniform(tubes[i]);
    if(finished){const T=tEls[i],cc=COLORS[tubes[i][0]];setTimeout(()=>{if(!T.isConnected)return;sfx.done();const[x,y]=centerOf(T);flBurst(x,y-T.offsetHeight*.45,cc,26,1.1);flBurst(x,y,'#ffffff',8,.6);flRing(x,y,cc,180);
      if(!FL_RM)T.animate([{filter:'brightness(1)'},{filter:'brightness(1.7)',offset:.25},{filter:'brightness(1)'}],{duration:700})},FL_RM?0:520)}
    if(stacking||finished)api.good(tEls[i],{silent:true});
    if(solved(tubes))api.win(starsFor(moves,s3,s2));
    else if(!pourMoves(tubes).length){toast('No moves left — try Undo! ↩️');$('#undoBtn').classList.add('glow');setTimeout(()=>$('#undoBtn').classList.remove('glow'),3000)}
  }
  /* the source tube lifts, tilts over the target and pours a stream of liquid into it */
  function pourAnim(from,to,color,cnt,oldLen){
    const A=tEls[from],B=tEls[to];
    if(FL_RM||!A.isConnected){return}
    if(A._pa)A._pa.cancel();
    const w=A.offsetWidth,h=A.offsetHeight,side=(B.offsetLeft+B.offsetWidth/2)>=(A.offsetLeft+w/2)?1:-1;
    const dx=(B.offsetLeft+B.offsetWidth/2)-(A.offsetLeft+w/2),dy=(B.offsetTop+B.offsetHeight/2)-(A.offsetTop+h/2);
    const th=side*74*Math.PI/180,lip=Math.max(18,h*.12);
    const mx=-side*w*.18,my=-B.offsetHeight/2-lip;
    const tx=dx+mx-Math.sin(th)*h/2,ty=dy+my+Math.cos(th)*h/2,deg=th*180/Math.PI;
    A.style.zIndex=6;
    const an=A.animate([
      {transform:'translate(0,-22px) rotate(0deg)'},
      {transform:`translate(${tx}px,${ty}px) rotate(${deg}deg)`,offset:.3,easing:'ease-in-out'},
      {transform:`translate(${tx}px,${ty+3}px) rotate(${deg+side*8}deg)`,offset:.72,easing:'ease-in-out'},
      {transform:'translate(0,0) rotate(0deg)'}],{duration:820,easing:'cubic-bezier(.4,0,.3,1)'});
    A._pa=an;an.onfinish=an.oncancel=()=>{if(A._pa===an){A._pa=null;A.style.zIndex=''}};
    /* grains fall from the lip to where the sand lands */
    const b=B.getBoundingClientRect(),land=B.querySelectorAll('.seg')[oldLen];
    const sx=b.left+b.width/2+mx,sy=b.top-lip+4,ey=land?land.getBoundingClientRect().bottom:b.bottom-6,fall=Math.max(12,ey-sy);
    const sw=4+cnt*1.5,st=el('div','pourst');
    st.style.cssText=`left:${sx-sw/2}px;top:${sy}px;width:${sw}px;height:${fall}px;--c:${color}`;document.body.appendChild(st);
    st.animate([{transform:'translateY(0) scaleY(0)'},{transform:'translateY(0) scaleY(1)',offset:.3},{transform:'translateY(0) scaleY(1)',offset:.7},{transform:`translateY(${fall}px) scaleY(0)`}],{duration:460,delay:230,easing:'ease-in-out',fill:'both'}).onfinish=()=>st.remove();
    const n=4+cnt*2;
    for(let g=0;g<n;g++){
      const d=el('i','sgr'),sz=2.6+Math.random()*2.6;
      d.style.cssText=`left:${sx+(Math.random()-.5)*(5+cnt*2)-sz/2}px;top:${sy}px;width:${sz}px;height:${sz}px;--c:${color}`;document.body.appendChild(d);
      d.animate([{transform:'translateY(0)',opacity:0},{transform:`translateY(${fall*.15}px)`,opacity:1,offset:.12},{transform:`translateY(${fall}px)`,opacity:.9}],{duration:300+Math.random()*120,delay:230+g*(180/n)+Math.random()*30,easing:'cubic-bezier(.4,0,.9,.6)',fill:'both'}).onfinish=()=>d.remove();
    }
    setTimeout(()=>{if(B.isConnected)flBurst(sx,Math.min(ey,b.bottom)-4,color,4,.3)},460);
  }
  render();
  return{
    snap:()=>JSON.stringify({tubes,moves}),
    restore(s){({tubes}=JSON.parse(s));moves=JSON.parse(s).moves;sel=-1;hintPair=null;plan=null;lastNew=null;lastFrom=-1;render()},
    hint(){
      let m=plan&&plan.length?plan[0]:null;
      if(!m){const path=solve(tubes,6000)||solve(tubes,25000);if(path&&path.length){plan=path;m=path[0]}}   // small search first: it keeps big boards from freezing
      if(!m){toast('No way forward from here — try Undo!');return false}
      sel=-1;hintPair=m;render();clearTimeout(hintT);hintT=setTimeout(()=>{if(hintPair===m&&wrap.isConnected){hintPair=null;render()}},3200);
      return true;
    },
    destroy(){clearTimeout(hintT)}
  };
};

