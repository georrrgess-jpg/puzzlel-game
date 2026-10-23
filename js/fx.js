'use strict';
/* ====================== particles ====================== */
const fxc=$('#fx'),fctx=fxc.getContext('2d');let parts=[],raf=0,dpr=1;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resizeFx(){dpr=Math.min(2,window.devicePixelRatio||1);fxc.width=innerWidth*dpr;fxc.height=innerHeight*dpr;fctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resizeFx);resizeFx();
function starPath(c,r){c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath()}
/* soft glow sprites, cached per colour (drawn with additive blending) */
const GLOW={};
function glowSprite(col){
  if(GLOW[col])return GLOW[col];
  const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d'),rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(.18,col);rg.addColorStop(.5,col+'55');rg.addColorStop(1,col+'00');
  g.fillStyle=rg;g.fillRect(0,0,64,64);return GLOW[col]=s;
}
const hex6=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#ffffff';
function burst(x,y,color,n=14,power=1){
  const gc=hex6(color);
  parts.push({x,y,vx:0,vy:0,g:0,life:1,decay:.07,size:70*power,color:gc,rot:0,vr:0,sh:'flash'});
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(2+Math.random()*5)*power,k=Math.random();
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2*power,g:.22,life:1,decay:.016+Math.random()*.02,size:3+Math.random()*5,color,rot:Math.random()*6,vr:(Math.random()-.5)*.4,sh:k<.3?'sq':k<.55?'star':'dot'})}
  for(let i=0;i<n/2;i++){const a=Math.random()*Math.PI*2,s=(3+Math.random()*6)*power;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:0,life:1,decay:.04,size:2,color:'#fff',rot:0,vr:0,sh:'spark'})}
  for(let i=0;i<Math.ceil(n/3);i++){const a=Math.random()*Math.PI*2,s=(1+Math.random()*3)*power;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,g:.04,life:1,decay:.02+Math.random()*.015,size:14+Math.random()*14,color:gc,rot:0,vr:0,sh:'glow'})}
  kick();
}
function confetti(){
  for(let i=0;i<180;i++){const k=i%6;parts.push({x:Math.random()*innerWidth,y:-20-Math.random()*240,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,g:.07,life:1,decay:.005+Math.random()*.005,size:6+Math.random()*7,color:COLORS[i%COLORS.length],rot:Math.random()*6,vr:(Math.random()-.5)*.3,sh:k===0?'star':k<3?'rib':'sq',wob:Math.random()*6})}
  for(let i=0;i<24;i++)parts.push({x:Math.random()*innerWidth,y:-10-Math.random()*200,vx:(Math.random()-.5)*1.5,vy:1.5+Math.random()*2,g:.03,life:1,decay:.008,size:10+Math.random()*10,color:hex6(COLORS[i%COLORS.length]),rot:0,vr:0,sh:'glow',wob:Math.random()*6});
  kick();
}
function fountain(x,y,n=60){
  for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*1.2,s=7+Math.random()*8;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:.25,life:1,decay:.01+Math.random()*.01,size:5+Math.random()*6,color:i%3?COLORS[i%COLORS.length]:'#ffd166',rot:0,vr:(Math.random()-.5)*.3,sh:i%2?'star':'sq'})}
  for(let i=0;i<n/4;i++){const a=-Math.PI/2+(Math.random()-.5)*1,s=5+Math.random()*7;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:.2,life:1,decay:.018,size:16+Math.random()*10,color:'#ffd166',rot:0,vr:0,sh:'glow'})}
  kick();
}
function loop(){
  fctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.life>0&&p.y<innerHeight+40);
  for(const p of parts){p.x+=p.vx+(p.wob?Math.sin(p.life*20+p.wob)*.8:0);p.y+=p.vy;p.vy+=p.g;p.vx*=.985;p.life-=p.decay;p.rot+=p.vr;
    const al=Math.max(0,Math.min(1,p.life*1.6));fctx.globalAlpha=al;fctx.fillStyle=p.color;
    if(p.sh==='spark'){fctx.strokeStyle='#fff';fctx.lineWidth=2;fctx.lineCap='round';fctx.beginPath();fctx.moveTo(p.x,p.y);fctx.lineTo(p.x-p.vx*3,p.y-p.vy*3);fctx.stroke();continue}
    if(p.sh==='glow'||p.sh==='flash'){
      const s=p.sh==='flash'?p.size*(1.25-p.life*.6):p.size*(.6+p.life*.4);
      fctx.globalCompositeOperation='lighter';fctx.globalAlpha=p.sh==='flash'?p.life*.8:al*.75;
      fctx.drawImage(glowSprite(p.color),p.x-s/2,p.y-s/2,s,s);fctx.globalCompositeOperation='source-over';continue}
    fctx.save();fctx.translate(p.x,p.y);fctx.rotate(p.rot);
    if(p.sh==='sq'){fctx.scale(1,Math.cos(p.rot*2));fctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);fctx.fillStyle='#ffffff55';fctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.2)}
    else if(p.sh==='rib'){fctx.scale(Math.cos(p.rot*1.7),1);fctx.fillRect(-p.size*.18,-p.size*.8,p.size*.36,p.size*1.6)}
    else if(p.sh==='star'){starPath(fctx,p.size*.8);fctx.fill();fctx.fillStyle='#ffffff70';starPath(fctx,p.size*.32);fctx.fill()}
    else{fctx.beginPath();fctx.arc(0,0,p.size/2,0,7);fctx.fill();fctx.fillStyle='#ffffff80';fctx.beginPath();fctx.arc(-p.size*.15,-p.size*.15,p.size*.17,0,7);fctx.fill()}
    fctx.restore()}
  fctx.globalAlpha=1;
  raf=parts.length?requestAnimationFrame(loop):0;
}
function kick(){if(!raf)raf=requestAnimationFrame(loop)}
function centerOf(e){const r=e.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]}
function ring(x,y,color='#fff',size=90,dur=550){
  [[0,1,8],[90,.7,4]].forEach(([dl,k,bw])=>{
    const r=el('div','ring');r.style.left=x+'px';r.style.top=y+'px';r.style.width=r.style.height=size*k+'px';r.style.borderColor=color;r.style.boxShadow=`0 0 14px ${color},inset 0 0 10px ${color}`;r.style.opacity=0;document.body.appendChild(r);
    r.animate([{transform:'translate(-50%,-50%) scale(.15)',opacity:1,borderWidth:bw+'px'},{transform:'translate(-50%,-50%) scale(1)',opacity:0,borderWidth:'1px'}],{duration:dur,delay:dl,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>r.remove();
  });
}
function floatText(x,y,txt,big){const t=el('div','ftxt'+(big?' big':''),txt);t.style.left=x+'px';t.style.top=y+'px';document.body.appendChild(t);setTimeout(()=>t.remove(),1050)}
function flyCoins(fromEl,n=8){
  const target=$('.screen.active .chip .coin')||$('.chip .coin');if(!target)return;
  const [fx_,fy]=fromEl?centerOf(fromEl):[innerWidth/2,innerHeight/2],[tx,ty]=centerOf(target);
  for(let i=0;i<n;i++){
    const c=el('i','coin flycoin');c.style.left=fx_-12+'px';c.style.top=fy-12+'px';document.body.appendChild(c);
    const dx=(Math.random()-.5)*140,dy=(Math.random()-.5)*140,sp=(Math.random()<.5?-1:1)*360;
    const a=c.animate([{transform:'translate(0,0) scale(.3) rotateY(0)',opacity:0},{transform:`translate(${dx}px,${dy}px) scale(1.25) rotateY(${sp/2}deg)`,opacity:1,offset:.3},{transform:`translate(${tx-fx_}px,${ty-fy}px) scale(.7) rotateY(${sp}deg)`,opacity:1}],{duration:750+i*65,easing:'cubic-bezier(.5,0,.7,.4)',fill:'forwards'});
    a.onfinish=()=>{c.remove();sfx.coin();refreshCoins();target.parentElement.animate([{transform:'scale(1.25)'},{transform:'scale(1)'}],{duration:220});if(i===n-1&&!REDUCED){const[cx,cy]=centerOf(target);burst(cx,cy,'#ffd166',6,.5)}};
  }
}
/* coloured droplets arcing from one element to another (tube pours) */
function flyDrops(fromEl,toEl,color,n=6){
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();
  const x0=a.left+a.width/2,y0=a.top,x1=b.left+b.width/2,y1=b.top+6,mx=(x0+x1)/2,my=Math.min(y0,y1)-60;
  for(let i=0;i<n;i++){
    const d=el('div','drop');d.style.background=color;d.style.left=x0-6+'px';d.style.top=y0-6+'px';document.body.appendChild(d);
    d.animate([{transform:'translate(0,0) scale(.6)'},{transform:`translate(${mx-x0}px,${my-y0}px) scale(1)`,offset:.45},{transform:`translate(${x1-x0}px,${y1-y0}px) scale(.5)`}],{duration:380,delay:i*35,easing:'cubic-bezier(.4,0,.6,1)',fill:'backwards'}).onfinish=()=>d.remove();
  }
}
function toast(msg){const t=$('#toast');t.innerHTML=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1900)}
/* stacked slide-in banners (achievements, quest done, level up) */
function banner(icon,kicker,title,sub){
  const b=el('div','banner',`<i>${icon}</i><div><small>${kicker}</small><b>${title}</b>${sub?`<em>${sub}</em>`:''}</div>`);
  $('#banners').appendChild(b);
  setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),420)},2800);
}

/* ====================== living background ======================
   cached base gradient + vignette, additive aurora ribbons, soft bokeh sprites,
   glossy drifting shapes and twinkling sparkles. ~30fps, paused when hidden. */
const BG=(()=>{
  const cv=$('#bg'),c=cv.getContext('2d');let W=0,H=0,pal={},shapes=[],sparks=[],bokeh=[],calm=0,calmT=0,px=0,py=0,tx=0,ty=0,last=0,base=null,sprites={};
  const hex=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  function size(){const d=Math.min(1.5,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;c.setTransform(d,0,0,d,0,0);bake()}
  /* static layer: gradient, big soft glows, vignette - rendered once per resize/theme */
  function bake(){
    if(!pal.bg1||!W)return;
    base=document.createElement('canvas');base.width=Math.ceil(W/2);base.height=Math.ceil(H/2);const b=base.getContext('2d');b.scale(.5,.5);
    const g=b.createLinearGradient(0,0,W*.35,H);g.addColorStop(0,pal.bg2);g.addColorStop(.65,pal.bg1);g.addColorStop(1,pal.bg1);b.fillStyle=g;b.fillRect(0,0,W,H);
    const spot=(x,y,r,col,a)=>{const rg=b.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,hex(col,a));rg.addColorStop(1,hex(col,0));b.fillStyle=rg;b.fillRect(0,0,W,H)};
    b.globalCompositeOperation='lighter';
    spot(W*.15,H*.12,Math.max(W,H)*.55,pal.acc2,.2);spot(W*.95,H*.45,Math.max(W,H)*.5,pal.acc,.11);spot(W*.3,H*.95,Math.max(W,H)*.5,'#7c5cff',.14);
    b.globalCompositeOperation='source-over';
    const vg=b.createRadialGradient(W/2,H*.45,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.5)');b.fillStyle=vg;b.fillRect(0,0,W,H);
    sprites={};
  }
  function sprite(col){
    if(sprites[col])return sprites[col];
    const s=document.createElement('canvas');s.width=s.height=96;const g=s.getContext('2d'),rg=g.createRadialGradient(48,48,0,48,48,48);
    rg.addColorStop(0,hex(col,.55));rg.addColorStop(.55,hex(col,.28));rg.addColorStop(.8,hex(col,.1));rg.addColorStop(1,hex(col,0));g.fillStyle=rg;g.fillRect(0,0,96,96);
    g.strokeStyle=hex('#ffffff',.12);g.lineWidth=1.5;g.beginPath();g.arc(48,48,30,0,7);g.stroke();
    return sprites[col]=s;
  }
  function retheme(){const v=(THEMES[S.theme]||THEMES.midnight).v;pal={bg1:v['--bg1'],bg2:v['--bg2'],acc:v['--acc'],acc2:v['--acc2']};bake();if(REDUCED)draw(0)}
  function init(){
    size();retheme();
    shapes=[...Array(13)].map((_,i)=>({x:Math.random()*W,y:Math.random()*H,z:.3+Math.random()*.9,s:14+Math.random()*28,rot:Math.random()*6,vr:(Math.random()-.5)*.006,vy:-(.12+Math.random()*.3),type:i%5,col:COLORS[i%COLORS.length]}));
    sparks=[...Array(42)].map((_,i)=>({x:Math.random()*W,y:Math.random()*H,ph:Math.random()*6,s:.6+Math.random()*1.6,star:i%4===0}));
    bokeh=[...Array(12)].map((_,i)=>({x:Math.random(),y:Math.random(),r:24+Math.random()*60,z:.2+Math.random()*.8,ph:Math.random()*6,sp:.00012+Math.random()*.0002,k:i%3}));
  }
  function rr(x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function shape(sh){
    const s=sh.s;c.save();c.translate(sh.x+px*sh.z*30,sh.y+py*sh.z*30);c.rotate(sh.rot);
    c.globalAlpha=(.13+sh.z*.13)*(1-calm*.6);
    const g=c.createLinearGradient(-s/2,-s/2,s/2,s/2);g.addColorStop(0,'#ffffffcc');g.addColorStop(.35,sh.col);g.addColorStop(1,hex(sh.col,.45));c.fillStyle=g;
    if(sh.type===0){rr(-s/2,-s/2,s,s,s*.25);c.fill()}
    else if(sh.type===1){c.beginPath();c.arc(0,0,s/2,0,7);c.fill()}
    else if(sh.type===2){starPath(c,s*.6);c.fill()}
    else if(sh.type===3){rr(-s*.22,-s*.7,s*.44,s*1.4,s*.2);c.fill()}
    else{c.beginPath();c.moveTo(0,-s*.6);c.lineTo(s*.5,0);c.lineTo(0,s*.6);c.lineTo(-s*.5,0);c.closePath();c.fill()}
    c.globalAlpha*=.85;c.fillStyle='#ffffff';c.beginPath();c.ellipse(-s*.15,-s*.2,s*.14,s*.07,-.6,0,7);c.fill();
    c.restore();
  }
  /* a wavy translucent band, brighter in its middle */
  function aurora(t,yb,amp,th,col,sp,ph){
    const k=1-calm*.65,y0=yb*H+py*16,g=c.createLinearGradient(0,y0-amp,0,y0+amp+th);
    g.addColorStop(0,hex(col,0));g.addColorStop(.45,hex(col,.16*k));g.addColorStop(.6,hex(col,.08*k));g.addColorStop(1,hex(col,0));c.fillStyle=g;
    c.beginPath();const step=Math.max(24,W/14),top=[];
    for(let x=-step;x<=W+step;x+=step){const y=y0+Math.sin(x*.006+t*sp+ph)*amp+Math.sin(x*.013-t*sp*1.6+ph*2)*amp*.35+px*10;top.push([x,y]);c.lineTo(x,y)}
    for(let i=top.length-1;i>=0;i--){const[x,y]=top[i];c.lineTo(x,y+th*(.6+.4*Math.sin(x*.01+t*sp*2+ph)))}
    c.closePath();c.fill();
  }
  function draw(t){
    if(base)c.drawImage(base,0,0,W,H);else{c.fillStyle=pal.bg1||'#141432';c.fillRect(0,0,W,H)}
    c.globalCompositeOperation='lighter';
    aurora(t,.2,40,120,pal.acc2,.00028,0);
    aurora(t,.34,34,90,pal.acc,.00022,2.1);
    aurora(t,.72,46,110,'#7c5cff',.00018,4.2);
    const cols=[pal.acc,pal.acc2,'#9b8cff'];
    for(const b of bokeh){
      const x=(b.x+Math.sin(t*b.sp+b.ph)*.06)*W+px*40*b.z,y=(b.y+Math.cos(t*b.sp*.8+b.ph)*.05)*H+py*40*b.z,r=b.r*(.9+.1*Math.sin(t*.001+b.ph));
      c.globalAlpha=(.35+.4*b.z)*(1-calm*.6);c.drawImage(sprite(cols[b.k]),x-r,y-r,r*2,r*2);
    }
    c.globalAlpha=1;c.globalCompositeOperation='source-over';
    for(const sh of shapes)shape(sh);
    c.fillStyle='#fff';
    for(const s of sparks){
      const a=.2+.8*Math.abs(Math.sin(t*.0012+s.ph));c.globalAlpha=a*(.75-calm*.35);const x=s.x+px*8,y=s.y+py*8;
      if(s.star){const r=s.s*3*a;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill()}
      else{c.beginPath();c.arc(x,y,s.s,0,7);c.fill()}
    }
    c.globalAlpha=1;
  }
  function frame(t){
    requestAnimationFrame(frame);
    if(document.hidden||t-last<30)return;const dt=Math.min(50,t-last);last=t;
    calm+=(calmT-calm)*.04;px+=(tx-px)*.04;py+=(ty-py)*.04;
    for(const sh of shapes){sh.y+=sh.vy*sh.z*dt*.06*(1-calm*.6);sh.rot+=sh.vr*dt*.06;if(sh.y<-60){sh.y=H+60;sh.x=Math.random()*W}}
    for(const s of sparks){s.y-=.008*dt*(1-calm*.7);if(s.y<-4){s.y=H+4;s.x=Math.random()*W}}
    draw(t);
  }
  addEventListener('resize',()=>{size();if(REDUCED)draw(0)});
  addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
  addEventListener('deviceorientation',e=>{if(e.gamma!=null){tx=clamp(e.gamma/45,-.5,.5);ty=clamp((e.beta-40)/45,-.5,.5)}},{passive:true});
  return{start(){init();if(REDUCED)draw(0);else requestAnimationFrame(frame)},retheme,setCalm(v){calmT=v}};
})();
