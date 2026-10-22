/* ===================== v17 Phase 2 (body & ball): rolling ball, curl, squash, kick anticipation/recovery, arrival easing, staggered mobs =====================
   Presentation only. Nothing here writes simulation state that land(), the engine or the tests read: the ball's rotation lives
   on the stage (v17M), curl is a draw-time offset, kicks only post-process poseOf, and arrival easing changes steering speed
   near a target (ui_stage.js update(): the `want` line calls v17want when it exists). */

/* cosmetic hash in [0,1): never the match RNG */
function v17h01(s){ let h=2166136261; s=String(s); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return ((h>>>0)%100000)/100000; }

/* ---------- 1a. ball rotation: a 3x3 matrix (row-major, body -> world; world x along the pitch, y toward the near touchline, z up)
   advanced about axis = up x velocity by distance / radius, so the panels roll the way the ball travels ---------- */
function v17rot(M,ax,ay,az,ang){ const c=Math.cos(ang), s=Math.sin(ang), t=1-c;
  const R=[t*ax*ax+c, t*ax*ay-s*az, t*ax*az+s*ay, t*ax*ay+s*az, t*ay*ay+c, t*ay*az-s*ax, t*ax*az-s*ay, t*ay*az+s*ax, t*az*az+c];
  const o=new Array(9); for(let r=0;r<3;r++) for(let k=0;k<3;k++) o[r*3+k]=R[r*3]*M[k]+R[r*3+1]*M[3+k]+R[r*3+2]*M[6+k]; return o; }
function v17ortho(M){ /* Gram-Schmidt on the columns keeps the matrix a rotation after many small steps */
  const c0=[M[0],M[3],M[6]], c1=[M[1],M[4],M[7]]; let l=Math.hypot(...c0); c0.forEach((v,i)=>c0[i]=v/l);
  const d=c0[0]*c1[0]+c0[1]*c1[1]+c0[2]*c1[2]; c1.forEach((v,i)=>c1[i]=v-d*c0[i]); l=Math.hypot(...c1); c1.forEach((v,i)=>c1[i]=v/l);
  const c2=[c0[1]*c1[2]-c0[2]*c1[1], c0[2]*c1[0]-c0[0]*c1[2], c0[0]*c1[1]-c0[1]*c1[0]]; return [c0[0],c1[0],c2[0],c0[1],c1[1],c2[1],c0[2],c1[2],c2[2]]; }

/* ---------- 1b. curl: a sideways offset curl*sin(pi*t) on scripted shots and crosses, applied only while drawing ---------- */
Stage.prototype.v17curl=function(){ const f=this.fl; if(!f||f.phys||this.rm) return null;
  if(this._v17cf!==f){ this._v17cf=f; this._v17c=null; const lofted=(f.h||0)>1.5&&f.kind!=='clear'; const tg=f.aim||this.flightTarget(f);
    if(tg&&(f.kind==='shot'||lofted)){ const dx=tg.x-f.from.x, dy=tg.y-f.from.y, d=Math.hypot(dx,dy);
      if(d>(f.kind==='shot'?8:14)){ const sgn=v17h01(Math.round(f.t0)+':'+Math.round(f.from.x*10))<0.5?-1:1; const amt=f.kind==='shot'?Math.min(1.5,d*0.05):Math.min(2.2,d*0.06);
        this._v17c={nx:-dy/d*sgn*amt, ny:dx/d*sgn*amt}; } } }
  const c=this._v17c; if(!c) return null; const t=clamp((this.now-f.t0)/f.dur,0,1); const s=Math.sin(Math.PI*t); return {x:c.nx*s,y:c.ny*s}; };

/* the ball's spin, speed (game m/s) and a trail of drawn positions are kept after every simulation step */
const v17updPrev=Stage.prototype.update;
Stage.prototype.update=function(dt){ const b0=this.ball, px=b0.x, py=b0.y, pz=b0.z; v17updPrev.apply(this,arguments);
  const b=this.ball; if(!this.v17M) this.v17M=[1,0,0,0,1,0,0,0,1];
  const dx=b===b0?b.x-px:0, dy=b===b0?b.y-py:0, d=Math.hypot(dx,dy);
  if(d>1e-5&&d<3){ /* rolling on the grass: full rate; in the air: the same axis, a little slower; capped so it never strobes */
    const ang=Math.min(d/BALL_R*(b.z>0.05?0.35:0.5), 18*Math.max(dt,0.001)); this.v17M=v17rot(this.v17M,-dy/d,dx/d,0,ang); if(((this._v17n=(this._v17n||0)+1)%240)===0) this.v17M=v17ortho(this.v17M); }
  const k=this.tk?this.tk():1; const sp=dt>0&&d<3?Math.hypot(d,b===b0?b.z-pz:0)/dt/k:0; this.v17bs=(this.v17bs||0)+(sp-(this.v17bs||0))*Math.min(1,dt*30);
  const c=this.v17curl(); const T=this.v17tr||(this.v17tr=[]); T.push([b.x+(c?c.x:0),b.y+(c?c.y:0),b.z]); if(T.length>12) T.shift(); };

/* 1c. a bounce in free physics squashes the ball for a moment */
const v17stepFreePrev=Stage.prototype.stepFree;
Stage.prototype.stepFree=function(dt){ const f=this.fl, vz0=f&&f.v?f.v.z:0; v17stepFreePrev.apply(this,arguments);
  if(f&&f.v&&vz0<0&&f.v.z>0.4&&!this.rm) this.v17sq={t:this.now,a:Math.min(0.28,f.v.z*0.045)}; };

/* the curl offset is applied to the (already interpolated) ball only for the duration of one drawn frame */
const v17drawPrev=Stage.prototype.draw;
Stage.prototype.draw=function(){ const c=this.v17curl(); if(!c) return v17drawPrev.apply(this,arguments); const b=this.ball, x=b.x, y=b.y; b.x+=c.x; b.y+=c.y;
  try{ return v17drawPrev.apply(this,arguments); } finally{ if(this.ball===b){ b.x=x; b.y=y; } } };

Stage.prototype.drawBall=function(g){ const b=this.ball; const [gx,gy,k]=this.proj(b.x,b.y,0); const r=Math.max(3.2,BALL_R*k); const [x,y0]=this.proj(b.x,b.y,b.z); const y=y0-r;
  const hz=Math.min(1,b.z/6); g.fillStyle=`rgba(0,0,0,${0.42-hz*0.3})`; g.beginPath(); g.ellipse(gx+b.z*k*0.08,gy,r*(1.05+hz*0.8),r*0.42*(1+hz*0.45),0,0,7); g.fill();
  /* a short motion trail, only for a ball in flight and really travelling (above ~18 m/s game speed) */
  const s=this.v17bs||0, T=this.v17tr; if(s>18&&T&&this.fl&&!this.rm){ const a=Math.min(1,(s-18)/8)*0.24; for(let i=0;i<T.length-1;i++){ const [sx,sy]=this.proj(T[i][0],T[i][1],T[i][2]); g.fillStyle=`rgba(255,255,255,${i/T.length*a})`; g.beginPath(); g.arc(sx,sy-r,r*(0.55+0.3*i/T.length),0,7); g.fill(); } }
  let sq=0; const Q=this.v17sq; if(Q){ const u=(this.now-Q.t)/Math.max(60,this.D(110)); if(u>=1) this.v17sq=null; else sq=Q.a*Math.sin(Math.PI*u); }
  if(sq>0.005){ g.save(); g.translate(x,y+r); g.scale(1+sq*0.6,1-sq); g.translate(-x,-(y+r)); drawFootball(g,x,y,r,b.spin,this.v17M); g.restore(); }
  else drawFootball(g,x,y,r,b.spin,this.v17M); };

/* the football drawn from a rotation matrix; without one it falls back to the old two-axis tumble */
const v17footPrev=drawFootball;
const V17CAM=(()=>{ const S=0.4, C=Math.sqrt(1-S*S); return {S,C}; })(); /* the broadcast camera looks down at roughly 24 degrees */
drawFootball=function(g,x,y,r,spin,M){ if(!M) return v17footPrev(g,x,y,r,spin);
  const gr=g.createRadialGradient(x-r*0.4,y-r*0.45,r*0.1,x,y,r*1.05); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.7,'#eceff2'); gr.addColorStop(1,'#aeb4bc');
  g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  g.save(); g.beginPath(); g.arc(x,y,r,0,7); g.clip(); g.fillStyle='#15181d'; const {S,C}=V17CAM; const ps=r*0.36;
  for(const [vx,vy,vz] of ICO){ const wx=M[0]*vx+M[1]*vy+M[2]*vz, wy=M[3]*vx+M[4]*vy+M[5]*vz, wz=M[6]*vx+M[7]*vy+M[8]*vz;
    const sx=wx, sy=wy*S-wz*C, dz=wy*C+wz*S; if(dz<-0.15) continue; const fz=Math.max(0.22,dz);
    g.save(); g.translate(x+sx*r*0.95,y+sy*r*0.95); g.rotate(Math.atan2(sy,sx)); g.scale(fz,1); g.beginPath(); for(let j=0;j<5;j++){ const aa=j*1.2566+0.31; j?g.lineTo(Math.cos(aa)*ps,Math.sin(aa)*ps):g.moveTo(Math.cos(aa)*ps,Math.sin(aa)*ps); } g.closePath(); g.fill(); g.restore(); }
  g.restore();
  g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x-r*0.38,y-r*0.42,r*0.28,r*0.18,-0.5,0,7); g.fill();
  g.strokeStyle='rgba(0,0,0,.6)'; g.lineWidth=Math.max(0.7,r*0.12); g.beginPath(); g.arc(x,y,r,0,7); g.stroke(); };

/* ---------- 2. kicks: a dip with the arms out just before contact, and a recovery step after the follow-through.
   Only the pose changes; kickT/kickW (and so the frame the ball leaves the boot) are untouched. ---------- */
const v17poseOfPrev=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=v17poseOfPrev.apply(this,arguments); if(isRef||this.rm) return P;
  const kk=p.kickK; if(!kk||kk==='head'||kk==='throw') return P; const kt=this.now-(p.kickT||-9e9), W=p.kickW||0, Fd=p.kickF||260; if(kt<0) return P;
  const big=kk==='shot'||kk==='loft';
  if(P.act==='kick'){ const A=Math.max(30,Math.min(W*0.6,this.D(60))), A2=Math.max(40,this.D(90)), rr=kt-W;
    const env=rr<-A?0:rr<0?smooth((rr+A)/A):rr<A2?1-smooth(rr/A2):0; if(env>0){ const H=P.hands;
      P.hipU-=(big?0.1:0.06)*env; P.lean+=0.04*env;
      H[0]={f:H[0].f,u:H[0].u+0.1*env,l:H[0].l-0.22*env}; H[1]={f:H[1].f,u:H[1].u+0.06*env,l:H[1].l+0.16*env}; }
    return P; }
  const RD=Math.max(60,this.D(120)), u=(kt-W-Fd)/RD;
  if(u>=0&&u<1&&(P.act==='idle'||(P.act==='loco'&&(p.spd||0)/Math.max(1,this.spdMul||1)<1))&&!(this.now-(p.touchT||-9e9)<Math.max(70,this.D(170)))){ /* the kicking foot comes back down and the standing foot resets */
    P.act='kick'; const F=P.feet; const a=smooth(Math.min(1,u/0.6)), b=smooth(clamp((u-0.4)/0.6,0,1));
    F[1]={f:lerp(0.06,F[1].f,a)+0.06*Math.sin(Math.PI*Math.min(1,u/0.6)),u:0.07*Math.sin(Math.PI*Math.min(1,u/0.6)),l:lerp(0.06,F[1].l,a)};
    F[0]={f:lerp(0.04,F[0].f,b),u:0.04*Math.sin(Math.PI*b),l:lerp(-0.13,F[0].l,b)};
    P.hipU-=(big?0.04:0.025)*Math.sin(Math.PI*u); P.lean+=(big?0.05:0.03)*(1-u); }
  else if(u>=0&&u<1&&P.act==='loco'){ /* already running on: the gait carries the step, the body just settles out of the strike */
    P.hipU-=(big?0.045:0.03)*Math.sin(Math.PI*u); P.lean+=(big?0.06:0.035)*(1-u); }
  return P; };

/* ---------- 3. arrival easing: over the last ~1.5 m (scaled with stage speed) a player slows with a profile that starts
   gently and arrives in finite time, instead of the exponential creep of want=d*2.6. The ball chaser and the carrier keep
   the old law. The deceleration never exceeds the steering's acceleration cap, so nobody overshoots. ---------- */
Stage.prototype.v17want=function(p,v,d,sp,urgent){ if(p.chase||p===this.own||p.glide) return Math.min(v,d*2.6*sp);
  const vg=v/sp, R=sp*Math.max(1.5,vg*0.3); if(d>=R) return v; const u=d/R; return Math.max(Math.min(v,d*2.6*sp), v*Math.sqrt(u*(2-u))); };

/* ---------- 4. staggered celebration arrivals: the signature celebration plays out, then teammates reach him one by one,
   each delayed by a small seeded amount (cosmetic hash). Total duration is the same as before at every speed. ---------- */
const v17cancelPrev=Stage.prototype.cancel;
Stage.prototype.cancel=function(){ this._v17cel=null; return v17cancelPrev.apply(this,arguments); };
Stage.prototype.celebrate=async function(sc,s){
  const gx=s===0?105:0, dir=s===0?1:-1; const type=(this.celebFor&&this.celebFor(sc.pid))||'classic'; const def=(typeof CELEB_BY!=='undefined'&&CELEB_BY[type])||{n:'Celebration'};
  this.focus=sc; this.zoomTo(0.66);
  let cx=clamp(gx-dir*9,8,97), cy=63.2;
  if(type==='flag'){ cx=gx-dir*1.6; cy=66.2; }
  if(type==='kneeslide'){ cx=clamp(gx-dir*15,8,97); cy=58.5; }
  if(type==='airplane'){ cx=clamp(gx-dir*14,8,97); }
  sc.celeb=true; sc.celebType=type; sc.celebT=null; sc.ov={x:cx,y:cy}; sc.hurry=true; sc.glide=null;
  /* teammates gather on a loose ring 4.6-6.8 m from where he is heading, so the scorer has the stage to himself */
  for(const q of this.players.values()){ if(q===sc||q.off) continue;
    if(q.side!==s&&!q.gk){ const [bx,by]=this.base(q); q.trail=null; q.ov={x:lerp(q.x,bx,0.5),y:lerp(q.y,by,0.5)}; q.sad=true; q.slow=true; }
    else if(q.side===s&&!q.gk){ q.celeb=true; q.celebType='mob'; const ex=q.x-cx, ey=q.y-cy, el=Math.hypot(ex,ey)||1, rr=Math.min(el,4.6+v17h01((q.pid||'')+'r')*2.2); q.ov={x:clamp(cx+ex/el*rr,1,104),y:clamp(cy+ey/el*rr,2,66.5)}; } }
  const reach=type==='kneeslide'?1.6:0.9;
  await this.until(()=>dist2(sc,sc.ov||{x:cx,y:cy})<reach, this.eta(sc,cx,cy,1.5)+500);
  if(type==='kneeslide'&&!this.rm){ const ux=dir*-0.35, uy=1, ul=Math.hypot(ux,uy); sc.ov=null; sc.glide={vx:ux/ul*7.5, vy:uy/ul*7.5}; }
  sc.hurry=false; sc.celebT=this.now; if(type!=='kneeslide') sc.ov={x:sc.x,y:sc.y};
  this.onCaption(String(def.n||'').toUpperCase(),'celeb'); this.hype=Math.max(this.hype,0.9);
  const hold=this.rm?300:this.D(type==='backflip'?1250:type==='kneeslide'?1150:1000);
  await this.wait(hold);
  /* teammates arrive and mob him, one by one: each sets off after a small seeded delay (inside the same 1.5 s window) */
  const fx=sc.x, fy=Math.min(sc.y,65.5); let i=0; const mates=[...this.players.values()].filter(q=>q!==sc&&!q.off&&q.side===s&&!q.gk).sort((a,b)=>dist2(a,sc)-dist2(b,sc));
  const tok={}; this._v17cel=tok;
  for(const q of mates){ const a=(i/Math.max(1,mates.length))*Math.PI*2+0.4; const r=i<4?1.25:2.2; const tgt={x:clamp(fx+Math.cos(a)*r,1,104),y:clamp(fy+Math.sin(a)*r*0.75,2,67)}; const hu=i<4;
    const go=()=>{ if(this._v17cel!==tok||!this.alive) return; q.ov=tgt; q.hurry=hu; };
    const dl=this.rm?0:v17h01((q.pid||i)+':'+Math.round(fx*7+fy*13))*450*Math.min(1,this.ts||1);
    if(dl<this.D(40)) go(); else this.wait(dl).then(go); i++; }
  await this.wait(this.rm?400:this.D(1500));
  if(this._v17cel===tok){ this._v17cel=null; }
  for(const q of mates) q.hurry=false;
};
