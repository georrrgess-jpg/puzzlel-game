/* ===================== MATCH STAGE v3 =====================
   Canvas renderer + choreographer for live matches, replays and the menu backdrop.
   Ball integrity rule: the ball is always (a) at a player's feet, (b) in a player's hands,
   or (c) in flight that began with a player's kick/throw/header (or a shot's own roll-out / drop into the net).
   Events are announced through emit() at the exact moment the animation shows them. */
const lerp=(a,b,t)=>a+(b-a)*t;
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOut=t=>1-Math.pow(1-t,2.2);
const dist2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const smooth=t=>{ t=t<0?0:t>1?1:t; return t*t*(3-2*t); };
/* ball and goal geometry (metres). The ball is drawn a touch larger than life so it reads on TV;
   collisions use the same radius, so what you see touching the net is what the physics touched. */
const BALL_R=0.24, GRAV=9.8;
const GF={y0:30.34,y1:37.66,H:2.44,DB:2.0,DT:1.2,ZB:1.9};
const NET_N={back:Math.hypot(GF.ZB,GF.DB-GF.DT), roof:Math.hypot(GF.H-GF.ZB,GF.DT)};
/* two-bone inverse kinematics: joint position for a limb from a to target t (bend = +1 / -1 picks the side) */
/* three-dimensional two-bone IK: root R, target T (arrays), segment lengths a,b, pole = the way the joint should point */
/* the knee's aim: forward, turning upward as the foot rises well in front of the hip (a punt or a high follow-through), so the knee never folds backwards */
function v186LegPole(f,u,sd){ const up=2.2*clamp((u-0.35)/0.35,0,1)*clamp(f/0.3,0,1); return [1,0.05+up,sd*0.12]; }
function ik3(R,T,a,b,pole){ let D=[T[0]-R[0],T[1]-R[1],T[2]-R[2]]; let d=Math.hypot(D[0],D[1],D[2]); const mx=(a+b)*0.999; if(d>mx){ const k=mx/d; T=[R[0]+D[0]*k,R[1]+D[1]*k,R[2]+D[2]*k]; D=[T[0]-R[0],T[1]-R[1],T[2]-R[2]]; d=mx; }
  d=Math.max(d,Math.abs(a-b)+1e-3); const n=[D[0]/d,D[1]/d,D[2]/d]; const along=(a*a+d*d-b*b)/(2*d); const h=Math.sqrt(Math.max(0,a*a-along*along));
  const pd=pole[0]*n[0]+pole[1]*n[1]+pole[2]*n[2]; let q=[pole[0]-n[0]*pd,pole[1]-n[1]*pd,pole[2]-n[2]*pd]; let ql=Math.hypot(q[0],q[1],q[2]); if(ql<1e-4){ q=[n[1],-n[0],0]; ql=Math.hypot(q[0],q[1])||1; }
  q=[q[0]/ql,q[1]/ql,q[2]/ql]; return {j:[R[0]+n[0]*along+q[0]*h,R[1]+n[1]*along+q[1]*h,R[2]+n[2]*along+q[2]*h], t:T}; }
function ik2(ax,ay,tx,ty,l1,l2,bend){ let dx=tx-ax, dy=ty-ay; let d=Math.hypot(dx,dy); const max=(l1+l2)*0.999; if(d>max){ tx=ax+dx/d*max; ty=ay+dy/d*max; dx=tx-ax; dy=ty-ay; d=max; } d=Math.max(d,Math.abs(l1-l2)+1e-3);
  const base=Math.atan2(dy,dx); const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)); const ang=base+bend*a; return {jx:ax+Math.cos(ang)*l1, jy:ay+Math.sin(ang)*l1, tx, ty}; }
function livePos(side,x,y){ return side===0? [y/100*105, x/100*68] : [105-y/100*105, 68-x/100*68]; }
/* gait from real running speed (m/s): cycle length (two steps), the part of each cycle a foot is planted, the planted foot's sweep,
   swing height and body bounce. sp stretches strides at fast playback so feet slide as little as possible. */
function gaitOf(v,sp){ v=clamp(v||0,0,9.5); const cw=(1.3+0.36*v)*Math.sqrt(clamp(sp||1,1,9)); const D0=clamp(0.62-0.05*v,0.22,0.62); const L=Math.min(0.92,D0*cw);
  return {cw, L, h:0.05+0.035*v, lift:0.012+0.011*v}; }
function kitsForSchools(h,a){ return kitMatchup(h,a); }
function kitsFor(f){ return kitsForSchools(Sx(f.h),Sx(f.a)); }
const defaultCelebFor = pid=>{ const p=typeof Px==='function'?Px(pid):null; return p&&typeof celebFor==='function'&&typeof App!=='undefined'&&App.C? celebFor(App.C,p) : 'classic'; };
const defaultLookup = pid=>{ const p=Px(pid); return p? {num:p.num, look:lookOf(p), h:p.h||70} : {num:'', look:defaultLook(pid,10), h:70}; };

class Stage {
  constructor(canvas, T, opts={}){
    this.cv=canvas; this.ctx=canvas.getContext('2d'); this.T=T; this.h=T.h; this.a=T.a; this.kits=kitsForSchools(T.h,T.a);
    this.mode=opts.mode||'broadcast'; this.lookup=opts.lookup||defaultLookup; this.emit=opts.emit||(()=>{}); this.onCaption=opts.onCaption||(()=>{});
    this.minimap=opts.minimap!==false; this.wx=opts.weather||null; this.relabel=!!opts.relabel; this.wxp=null; this.demo=!!opts.demo; this.rm=reducedMotion(); this.section=opts.section||5;
    this.players=new Map(); this.ref={x:50,y:24,tx:50,ty:24,ph:0,spd:0,face:1,card:null,ov:null,ref:true};
    /* assistant referees: far touchline covers the right half, near touchline the left; each runs the offside line of his half */
    const AR=(x,y,att,x0,x1,yaw)=>({x,y,tx:x,ty:y,y0:y,att,x0,x1,arYaw:yaw,yaw,ph:0,spd:0,face:1,card:null,ov:null,ref:true,ar:true,hgt:70,flag:null,flagT:-9e9,seed:att*2.3});
    this.ars=[AR(70,-0.45,0,52.5,104.2,Math.PI/2),AR(35,68.9,1,0.8,52.5,-Math.PI/2)];
    this.ball={x:52.5,y:34,z:0,spin:0}; this.own=null; this.hands=false; this.fl=null; this.inNet=null;
    this.poss=0; this.cam={x:52.5,w:46,tw:46}; this.trail=[]; this.flash=0; this.hype=0; this.shake=0; this.conf=[]; this.bulge=null; this.bulbs=[];
    this.netD={0:{a:0,va:0,tgt:0,c:null,n:null,touch:-9e9},105:{a:0,va:0,tgt:0,c:null,n:null,touch:-9e9}};
    this.sfx=!!opts.sfx; this.celebFor=opts.celebFor||defaultCelebFor; this.board=opts.board||null; this.grassPat=null;
    this.waiters=[]; this.timers=[]; this.skip=false; this.ts=1; this.goalTs=1; this.alive=true; this.now=0; this.t0=performance.now(); this.lastReal=0; this.paused=false; this.pendingKick=null; this.focus=null; this.so=false; this.zoom=1; this.v184z=!!opts.uzoom;
    this.crowd=this.genCrowd(); this.resize();
    this.loop=this.loop.bind(this); this.raf=requestAnimationFrame(this.loop);
    this.ro = typeof ResizeObserver!=='undefined' ? new ResizeObserver(()=>this.resize()) : null; if(this.ro) this.ro.observe(canvas.parentElement);
  }
  destroy(){ if(this.sfx&&typeof Sound!=='undefined'&&Sound.crowd&&Sound.crowd.hush) Sound.hush(false); this.alive=false; cancelAnimationFrame(this.raf); this.timers.forEach(clearTimeout); this.waiters.forEach(w=>w.res()); this.waiters=[]; if(this.ro) this.ro.disconnect(); }
  resize(){ const pe=this.cv.parentElement; const r={width:pe.clientWidth||pe.getBoundingClientRect().width, height:pe.clientHeight||pe.getBoundingClientRect().height}; /* layout size: unaffected by opening animations */ const dpr=Math.min(1.5,window.devicePixelRatio||1)*(this.rs||1); this.dpr=dpr; this._cc=null; this.W=Math.max(200,r.width); this.H=Math.max(150,r.height); this.cv.width=this.W*dpr; this.cv.height=this.H*dpr; this.cv.style.width=this.W+'px'; this.cv.style.height=this.H+'px'; this.ctx.setTransform(dpr,0,0,dpr,0,0); this.bgTac=null; this.bw=clamp(this.W/30,20,38); this.cam.w=this.cam.tw=this.bw*this.zoom*(this.v184K?this.v184K():1); }
  genCrowd(){ const r=rngFrom(hashStr(this.T.id||'crowd')); const out=[]; const pal=[this.h.c1,this.h.c2,this.h.c1,'#d8dde3','#5b6573',this.a.c1,'#2d333b','#c49a6c','#8a5a3c']; for(let row=0;row<13;row++){ const up=row>=7; const R=up?row+1:row; for(let x=-24;x<130;x+=(up?0.95:1.1)+r()*0.55){ const away=x>92&&r()<0.6; const fl=r()<0.035?(away?this.a.c1:(r()<0.5?this.h.c1:this.h.c2)):null; out.push({x, row:R, c:away?this.a.c1:pal[Math.floor(r()*pal.length)], sk:LOOK.skin[Math.floor(r()*12)], ph:r()*6.28, s:0.82+r()*0.4, flag:fl}); } } return out; }
  /* ---------- roster ---------- */
  setSides(sides){
    this.players.clear();
    sides.forEach((S,i)=>{ for(const s of S.slots){ if(!s.pid) continue; const info=this.lookup(s.pid); const [x,y]=livePos(i,s.x,s.y);
      this.players.set(s.pid,{pid:s.pid, side:i, slot:s, x, y, tx:x, ty:y, num:info.num, look:info.look, hgt:info.h||70, gk:s.role==='GK', off:!!(S.off&&S.off[s.pid]), ph:(hashStr(s.pid)%100)/16, seed:(hashStr(s.pid)%997)/97, ov:null, chase:null, kickT:-9e9, dive:null, celeb:false, trip:-9e9, jumpT:-9e9, spd:0, face:i===0?1:-1}); } });
  }
  setKeeper(side,pid){ for(const p of this.players.values()) if(p.side===side) p.gk = p.pid===pid; }
  pl(pid){ return this.players.get(pid); }
  gkOf(side){ for(const p of this.players.values()) if(p.side===side&&p.gk&&!p.off) return p; return null; }
  base(p){ return livePos(p.side,p.slot.x,p.slot.y); }
  nearest(side,x,y,noGK=true,except){ let best=null,bd=1e9; for(const p of this.players.values()){ if(p.side!==side||p.off||(noGK&&p.gk)||p===except) continue; const d=(p.x-x)**2+(p.y-y)**2; if(d<bd){bd=d;best=p;} } return best; }
  /* the offside line a side's attackers must stay behind: the second-last defender (keeper included) or the ball, never inside their own half */
  offLine(att){ const xs=[]; for(const q of this.players.values()) if(q.side!==att&&!q.off) xs.push(q.x);
    if(att===0){ xs.sort((a,b)=>b-a); return Math.max(xs.length>1?xs[1]:105,this.ball.x,52.5); }
    xs.sort((a,b)=>a-b); return Math.min(xs.length>1?xs[1]:0,this.ball.x,52.5); }
  isOffside(p){ const L=this.offLine(p.side); return p.side===0? p.x>L+0.2 : p.x<L-0.2; }
  /* how many opponents stand in the lane of a ball played along the ground from a to b */
  laneBlock(a,b){ let n=0; const vx=b.x-a.x, vy=b.y-a.y, L=vx*vx+vy*vy||1; for(const q of this.players.values()){ if(q.side===a.side||q.off) continue; const t=((q.x-a.x)*vx+(q.y-a.y)*vy)/L; if(t<0.06||t>0.95) continue; if(Math.hypot(a.x+vx*t-q.x,a.y+vy*t-q.y)<1.3+t*0.7) n++; } return n; }
  /* a ball never rolls through a defender: a clear lane is played on the ground, a blocked one is chipped or lofted over */
  passH(a,b,d){ const n=this.laneBlock(a,b); if(!n) return d>32?3.2:d>24?1.2:0.25; if(d<8) return 1.6; return d>30?3.8:clamp(2.4+d*0.04,2.6,3.6); }
  /* a shot never rolls through a defender's legs: if one stands in the lane, the strike rises enough to clear him */
  shotH(side,to,h0){ const b=this.ball; let h=h0; const vx=to.x-b.x, vy=to.y-b.y, L=vx*vx+vy*vy||1; const z1=to.z||0;
    for(const q of this.players.values()){ if(q.side===side||q.off||q.gk) continue; const t=((q.x-b.x)*vx+(q.y-b.y)*vy)/L; if(t<0.04||t>0.9) continue;
      if(Math.hypot(b.x+vx*t-q.x,b.y+vy*t-q.y)>0.9) continue; const need=(0.95-lerp(b.z,z1,t))/(4*t*(1-t)); if(need>h) h=need; }
    return Math.min(h,2.6); }
  /* kickoff positions: everyone in his own half, the defending team outside the centre circle */
  kickoffSpots(kicker){
    const out=new Map(); const ks=this.nearest(kicker,52.5,34); let partner=null, pd=1e9;
    for(const p of this.players.values()){ if(p.side===kicker&&p!==ks&&!p.gk&&!p.off){ const [bx,by]=this.base(p); const d=Math.abs(by-34)+Math.abs(bx-52.5)*0.5; if(d<pd){pd=d;partner=p;} } }
    for(const p of this.players.values()){ if(p.off) continue; const own=p.side===0?-1:1; // -1 = left half
      const depth=clamp(p.slot.y,0,100); let x=52.5+own*(3+(100-depth)/100*36); let y=livePos(p.side,p.slot.x,p.slot.y)[1];
      if(p.gk){ x=p.side===0?2:103; y=34; }
      else { x=p.side===0?Math.min(x,51.3):Math.max(x,53.7);
        if(p.side!==kicker){ const dx=x-52.5, dy=y-34, d=Math.hypot(dx,dy); if(d<10.2){ const k=10.2/(d||1); x=52.5+(Math.abs(dx)<0.3?own*0.6:dx)*k; y=34+dy*k; x=p.side===0?Math.min(x,51.3):Math.max(x,53.7); if(Math.hypot(x-52.5,y-34)<10.2) y=34+(dy>=0?1:-1)*Math.sqrt(Math.max(0,10.2**2-(x-52.5)**2)); } } }
      out.set(p,{x,y}); }
    if(ks) out.set(ks,{x:52.5+(kicker===0?-0.55:0.55),y:34});
    if(partner) out.set(partner,{x:52.5+(kicker===0?-2.6:2.6),y:34+(this.base(partner)[1]<34?-3:3)});
    return {spots:out, ks, partner};
  }
  kickoffShape(kicker){
    this.fl=null; this.trail=[]; this.focus=null; this.inNet=null; this.so=false; this.soInit=false; this.clip=false; this.headBall=null; this.offMark=null;
    const {spots,ks,partner}=this.kickoffSpots(kicker);
    for(const p of this.players.values()){ p.chase=null; p.meet=null; p.trail=null; p.celeb=false; p.celebType=null; p.glide=null; p.hurry=false; p.slow=false; p.sad=false; p.dive=null; const t=spots.get(p); p.ov=t?{...t}:null; if(t){ p.tx=t.x; p.ty=t.y; } }
    this.ball={x:52.5,y:34,z:0,spin:0}; this.hands=false; this.placed=false; this.own=ks||null; if(ks){ ks.x=ks.ov.x; ks.y=34; ks.face=kicker===0?1:-1; ks.yaw=kicker===0?0:Math.PI; }
    this.poss=kicker; this.pendingKick={side:kicker,ks,partner};
  }
  /* a highlight starts where the recorded move started: the first player on the ball at his spot, both teams in shape around
     it and the attackers onside. A set piece starts at the set piece. Nothing before the first recorded touch is invented. */
  clipStart(e){ const s=e.s, dir=s===0?1:-1, gx=s===0?105:0;
    const seq=e.seq&&e.seq.length?e.seq:[{pid:e.pid,x:50,y:86,a:'shot'}]; const first=seq[0]; const fp=this.pl(first.pid)||this.pl(e.pid);
    this.fl=null; this.trail=[]; this.focus=null; this.inNet=null; this.so=false; this.soInit=false; this.pendingKick=null; this.setPiece=null; this.headBall=null; this.bulge=null; this.lastPass=null; this.offMark=null; this.clip=true;
    for(const p of this.players.values()){ p.chase=null; p.meet=null; p.trail=null; p.ov=null; p.celeb=false; p.celebType=null; p.celebT=null; p.glide=null; p.hurry=false; p.slow=false; p.sad=false; p.dive=null; p.card=null; p.jumpT=-9e9; p.kickT=-9e9; p.slideT=-9e9; p.fallT=-9e9; p.knelt=false; p.penReady=false; p.hipsHands=false; }
    let [bx,by]=livePos(s,first.x,first.y); const corner=first.a==='corner', setup=first.a==='setup', pen=setup&&e.ty==='pen';
    if(corner){ by=by<34?0.6:67.4; bx=gx-dir*0.6; } else if(pen){ bx=gx-dir*11; by=34; }
    this.ball={x:bx,y:by,z:0,spin:0}; this.poss=s;
    for(const p of this.players.values()){ if(p.off) continue; const d=p.side===0?1:-1; const [x,y]=this.base(p);
      if(p.gk){ const g=p.side===0?1.5:103.5; p.x=g+d*clamp(Math.abs(bx-g)*0.05,0,5); p.y=clamp(34+(by-34)*0.3,29,39); }
      else { const push=p.side===s?d*7:-d*4; p.x=clamp(x+(bx-52.5)*0.55+push,2,103); p.y=clamp(y+(by-34)*0.33,3,65); } }
    const OL=this.offLine(s); for(const p of this.players.values()) if(p.side===s&&!p.gk&&!p.off&&p!==fp) p.x=s===0?Math.min(p.x,OL-0.7):Math.max(p.x,OL+0.7);
    if(fp){ if(corner){ fp.x=bx+dir*0.9; fp.y=by+(by<34?-0.7:0.7); } else if(setup){ fp.x=bx-dir*2.4; fp.y=by+0.8; } else { fp.x=bx-dir*0.45; fp.y=by; }
      for(const q of this.players.values()){ if(q===fp||q.off||q.gk) continue; const ex=q.x-fp.x, ey=q.y-fp.y, d=Math.hypot(ex,ey); if(d<3.2){ const k=3.2/(d||1); q.x=clamp(fp.x+(d?ex:dir*-1)*k,2,103); q.y=clamp(fp.y+(d?ey:1)*k,3,65); } } }
    for(const p of this.players.values()){ p.tx=p.x; p.ty=p.y; p.vx=0; p.vy=0; p.spd=0; p.gv=0; p._px=null; p.yaw=p===fp?(dir>0?0:Math.PI):Math.atan2(by-p.y,bx-p.x); p.face=Math.cos(p.yaw)>=0?1:-1; }
    if(e.ty==='break'&&fp){ const ri=seq.findIndex(q=>q.a==='run'); if(ri>0){ const [X,Y]=livePos(s,seq[ri].x,seq[ri].y); const BL=this.breakLine(s,bx,X,Y); BL.spots.forEach(t=>{ t.q.x=t.x; t.q.y=t.y; t.q.tx=t.x; t.q.ty=t.y; }); const rp=this.pl(seq[ri].pid); if(rp&&rp!==fp){ rp.x=BL.run.x; rp.y=BL.run.y; rp.tx=rp.x; rp.ty=rp.y; }
        const OL2=this.offLine(s); for(const p of this.players.values()) if(p.side===s&&!p.gk&&!p.off&&p!==fp&&p!==rp){ p.x=s===0?Math.min(p.x,OL2-1.2):Math.max(p.x,OL2+1.2); p.tx=p.x; } } }
    this.own=fp||null; this.hands=false; this.placed=!!(fp&&(corner||setup)); if(this.placed) this.ownLock={x:bx,y:by};
    if(fp&&!this.placed) this.placeBallAtOwner();
    const r=this.ref; r.x=clamp(bx-dir*9,8,97); r.y=clamp(by+(by<34?12:-12),6,62); r.tx=r.x; r.ty=r.y; r.ov=null; r.card=null; r._px=null;
    for(const a of this.ars||[]){ a.flag=null; a.x=a.tx=clamp(this.offLine(a.att),a.x0,a.x1); a._px=null; }
    this.cam.x=clamp(bx+(dir*4),this.cam.w*0.36,105-this.cam.w*0.36); }
  /* whistle, the kicker rolls it to his partner, and play is live */
  async tapOff(){ const K=this.pendingKick; if(!K) return; this.pendingKick=null;
    await this.until(()=>{ for(const p of this.players.values()){ if(p.ov&&!p.off&&Math.hypot(p.x-p.ov.x,p.y-p.ov.y)>1.2) return false; } return true; }, this.D(2500)+600);
    if(K.ks&&this.own===K.ks&&K.partner&&!K.partner.off){ this.look(K.ks,K.partner.x,K.partner.y,this.D(900)); await this.wait(this.D(180)); await this.launch(K.ks,{home:K.partner,dur:this.D(420),h:0.1}); }
    for(const p of this.players.values()) if(!p.off) p.ov=null; }
  snap(){ for(const p of this.players.values()){ const t=p.ov||{x:p.tx,y:p.ty}; p.x=t.x; p.y=t.y; p.vx=0; p.vy=0; p._px=null; p.yaw=p.side===0?0:Math.PI; p.face=p.side===0?1:-1; } this.placeBallAtOwner(); this.cam.x=clamp(this.ball.x,22,83); }
  /* ---------- timing ---------- */
  // all waiting runs on the stage clock, which stops dead while the match is paused
  wait(ms){ return new Promise(res=>{ if(this.skip||!this.alive) return res(); this.waiters.push({cond:()=>false,res,dl:this.now+ms}); }); }
  until(cond,maxMs){ return new Promise(res=>{ if(this.skip||!this.alive||cond()) return res(); this.waiters.push({cond,res,dl:this.now+maxMs}); }); }
  D(ms){ return Math.max(55, ms*this.ts); }
  spd(){ return 7.2*clamp(Math.pow(1/this.ts,0.8),1,6); }
  eta(p,x,y,mult=1){ return Math.hypot(p.x-x,p.y-y)/(this.spd()*mult)*1000+250; }
  cancel(){ if(this.sfx&&typeof Sound!=='undefined'&&Sound.crowd&&Sound.crowd.hush) Sound.hush(false); this.skip=true; this.timers.forEach(clearTimeout); this.timers=[]; if(this.fl) this.land(); const w=this.waiters; this.waiters=[]; w.forEach(x=>x.res()); for(const p of this.players.values()){ p.chase=null; } }
  /* ---------- ball positions ---------- */
  /* sound effects follow what the camera shows: panned to where the ball is on screen, silent while skipping or paused */
  snd(fn,...a){ if(!this.sfx||this.skip||this.paused||!this.alive||typeof Sound==='undefined'||!Sound[fn]) return; const sx=this.proj(this.ball.x,this.ball.y)[0]; try{ Sound[fn](...a,clamp(sx/this.W*2-1,-1,1)*0.75); }catch(e){} }
  /* heading: every body turns smoothly toward where he runs, what he looks at, or where he has been told to face */
  turn(p,dt,sp){ const b=this.ball, now=this.now; if(p.yaw==null) p.yaw=(p.face||1)>0?0:Math.PI; let t=null; const sr=(p.spd||0)/sp; p._mv=p._mv?sr>0.6:sr>1.15; const mv=p._mv; const y0=p.yaw;
    const fl=this.fl; const incoming=fl&&!fl.phys&&fl.home===p&&!(p.yawLock!=null&&now<p.yawLockT);
    const bdx=b.x-p.x, bdy=b.y-p.y, bd=Math.hypot(bdx,bdy); const defending=!p.gk&&!p.ref&&this.poss!=null&&p.side!==this.poss&&this.own&&!this.hands&&bd<16&&!p.chase&&!p.ov&&!p.celeb&&!p.sad;
    let jockey=false; if(defending&&mv&&sr<5.2){ const va=Math.atan2(p.vy,p.vx), ba=Math.atan2(bdy,bdx); const dd=Math.abs(Math.atan2(Math.sin(va-ba),Math.cos(va-ba))); jockey=dd>1.0; }
    if(p.ar&&!(p.yawLock!=null&&now<p.yawLockT)) t=p.arYaw;
    else if(p.yawLock!=null&&now<p.yawLockT) t=p.yawLock;
    else if(p.glide) t=Math.atan2(p.glide.vy,p.glide.vx);
    else if(p.dive) t=p.side===0?1.15:Math.PI-1.15; // a keeper's dive is shown three-quarters on, so it reads as a dive
    else if(p.celeb&&!mv&&(p.celebType==='backflip'||p.celebType==='archer')) t=Math.cos(p.yaw)>=0?0.25:Math.PI-0.25;
    else if(p.celeb&&!mv) t=Math.PI/2+Math.sin(now/1600+(p.seed||0))*0.35; // celebrations are performed for the cameras
    else if(incoming) t=Math.atan2(bdy,bdx);
    else if(jockey) t=Math.atan2(bdy,bdx);
    else if(mv) t=Math.atan2(p.vy,p.vx);
    else if(p===this.own) t=p.side===0?0:Math.PI;
    else { const dx=b.x-p.x, dy=b.y-p.y; if(dx*dx+dy*dy>2.5) t=Math.atan2(dy,dx); }
    if(t!=null){ const d=Math.atan2(Math.sin(t-p.yaw),Math.cos(t-p.yaw)); if(!mv&&Math.abs(d)<0.12&&!incoming) t=null; else { const r=(sr>3?11:8)*sp*dt; p.yaw+=clamp(d,-r,r); } }
    p.yaw=Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw));
    /* lean into a turn: the body tips toward the centre of the curve, as seen by the camera */
    const w=dt>0?Math.atan2(Math.sin(p.yaw-y0),Math.cos(p.yaw-y0))/dt:0; const tl=mv&&sr>2.5?clamp(w*(-p.vy)/sp*0.012,-0.13,0.13):0; p.turnLean=(p.turnLean||0)+(tl-(p.turnLean||0))*Math.min(1,dt*10);
    p.face=Math.cos(p.yaw)>=0?1:-1; }
  look(p,x,y,ms){ if(!p) return; p.yawLock=Math.atan2(y-p.y,x-p.x); p.yawLockT=this.now+(ms==null?this.D(700):ms); p.face=x>=p.x?1:-1; }
  /* z is the height of the underside of the ball (0 = on the grass) */
  yawOf(p){ return p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw; }
  footOf(p){ const a=this.yawOf(p); return {x:p.x+Math.cos(a)*0.5, y:p.y+Math.sin(a)*0.5+0.05, z:0}; }
  handsOf(p){ const a=this.yawOf(p); const kt=this.now-(p.kickT||-9e9); if(p.kickK==='throw'&&kt>=0&&kt<(p.kickW||0)&&this.own===p){ const b=smooth(kt/p.kickW); return {x:p.x-Math.cos(a)*0.12*b, y:p.y-Math.sin(a)*0.12*b+0.03, z:lerp(0.92,2.15,b)}; }
    if(p.gk&&p.dive&&this.now>=p.dive.t){ const t=clamp((this.now-p.dive.t)/240,0,1); const e=1-Math.pow(1-t,2.2); const rot=p.dive.dir*(p.x>52.5?1:-1)*1.3*e; const hs=1.06*(p.hgt||70)/70;
      return {x:p.x+Math.sin(rot)*1.5*hs, y:p.y+0.03, z:Math.max(0.2,(0.55+Math.cos(rot)*1.5+Math.sin(t*Math.PI)*0.5)*hs)}; }
    const uT=this.now-(p.upT||-9e9), UD=Math.max(260,this.D(650)); if(p.gk&&uT>=0&&uT<UD){ const t=uT/UD; const aa=smooth(Math.min(1,t/0.55)), bb=smooth(clamp((t-0.35)/0.65,0,1)); const rot=p.upDir*1.3*(1-aa)*0.9; const hs=1.06*(p.hgt||70)/70;
      return {x:p.x+Math.sin(rot)*1.3*hs*(1-bb)+Math.cos(a)*0.3*bb, y:p.y+Math.sin(a)*0.3*bb+0.03, z:lerp(0.45,0.92,bb)}; }
    return {x:p.x+Math.cos(a)*0.3, y:p.y+Math.sin(a)*0.3+0.03, z:0.92}; }
  /* the forehead rises with the leap, so a cross meets it at the top of the jump */
  jumpLift(p){ const jt=this.now-(p.jumpT||-9e9), JD=Math.max(260,this.D(560)); return jt>=0&&jt<JD? Math.sin(jt/JD*Math.PI)*0.72 : 0; }
  headOf(p){ const a=this.yawOf(p); return {x:p.x+Math.cos(a)*0.16, y:p.y+Math.sin(a)*0.16, z:1.66+this.jumpLift(p)}; }
  /* how far ahead of the foot the dribbled ball runs (metres along his direction of travel) */
  dribLead(o,sp,dt,now){ let lead=0; if(sp>1.6&&!o.plant&&!this.so){ o.dribD=(o.dribD||0)+sp*dt; const TD=1.8+Math.min(9,sp)*0.12; if(o.dribD>=TD){ o.dribD-=TD; o.touchT=now; this.snd('touch'); } const u=o.dribD/TD; const L=Math.min(0.8,0.2+sp*0.065); lead=L*(u<0.16?smooth(u/0.16):1-smooth((u-0.16)/0.84)); } else o.dribD=0; return lead; }
  placeBallAtOwner(){ const o=this.own; if(!o) return; const t=this.hands?this.handsOf(o):this.footOf(o); this.ball.x=t.x; this.ball.y=t.y; this.ball.z=t.z; }
  /* what kind of strike a release is, and how long the backswing takes on the stage clock */
  /* opt.head = the flight is aimed at the receiver's head; opt.nod = this player is heading it */
  kickKind(p,opt){ if(!p) return null; if(opt.nod) return 'head'; if(this.hands&&this.own===p) return 'throw'; return opt.kind==='shot'?'shot':(opt.h||0)>1.5||opt.kind==='clear'?'loft':'pass'; }
  windOf(kk){ return kk==='shot'? this.D(200) : kk==='loft'? this.D(165) : kk==='throw'? this.D(170) : kk==='head'||!kk? 0 : this.D(105); }
  /* a flight always starts from where the ball is now (a player's foot, head or hands).
     A kicked ball is struck at the end of a backswing, so the leg, the sound and the ball all move together. */
  launch(p, opt){ // opt: {home, hands, head, to:{x,y,z}, dur, h, kind, cont}
    if(p&&opt.home) this.lastPass={from:p,to:opt.home,h:opt.h||0,fy:p.y,t:this.now};
    if(this.fl&&this.fl.phys) this.endFree();
    const kk=this.kickKind(p,opt);
    const release=res=>{ if(this.ft&&p){ res(); return; } if(p&&kk==='shot') this.kickTurf(this.ball.x,this.ball.y,4,0.8);
      if(p){ p.plant=false; if(!this.so) p.ov=null; } // having released the ball he rejoins the team shape
      if(p){ if(kk==='head') this.snd('trap'); else if(kk==='throw') this.snd('touch'); else { const dist=opt.home?dist2(p,opt.home):opt.to?Math.hypot(opt.to.x-p.x,opt.to.y-p.y):10; this.snd('kick',kk,kk==='shot'?0.95:kk==='loft'?0.75:Math.min(0.75,0.32+dist/55)); } }
      this.own=null; this.placed=false; this.ball.ing=null; this.headBall=null; const from={x:this.ball.x,y:this.ball.y,z:this.ball.z};
      const f={from,home:opt.home||null,hands:!!opt.hands,head:!!opt.head,to:opt.to||null,t0:this.now,dur:Math.max(60,opt.dur),h:(opt.hFn?opt.hFn():opt.h)||0,kind:opt.kind||'pass',cont:!!opt.cont,res};
      f.ground = f.kind==='pass' && f.h<0.6 && !f.hands && !f.head && from.z<0.3;
      // lead the receiver: aim where he will be, then home in over the last part of the flight
      if(f.home){ const H=f.home, L=Math.min(1.2,f.dur/1000)*0.5; const t=this.flightTarget(f); f.aim={x:t.x+(H.vx||0)*L, y:t.y+(H.vy||0)*L}; }
      this.fl=f; if(opt.onRelease) opt.onRelease(f); if(this.skip) this.land(); };
    return new Promise(async res=>{
      if(p&&!this.skip){ const tx=opt.home?opt.home.x:opt.to.x, ty=opt.home?opt.home.y:opt.to.y; const fdir=tx>=this.ball.x?1:-1;
        // a dead ball is approached with a short run-up so the kicking foot meets it
        if(kk!=='throw'&&kk!=='head'&&!this.hands&&this.own===p&&this.placed&&Math.hypot(p.x-this.ball.x,p.y-this.ball.y)>0.9){
          const ux=tx-this.ball.x, uy=ty-this.ball.y, ul=Math.hypot(ux,uy)||1; const st={x:this.ball.x-ux/ul*0.5, y:this.ball.y-uy/ul*0.5-0.18};
          p.ov=st; await this.until(()=>Math.hypot(p.x-st.x,p.y-st.y)<0.35, this.eta(p,st.x,st.y)+200); }
        // he squares up to where the ball is going: a turn first (the ball rolls round his foot), then the strike
        const ang=Math.atan2(ty-p.y,tx-p.x); this.look(p,tx,ty,this.D(1100));
        if(kk!=='head'&&!this.hands&&this.own===p&&Math.abs(Math.atan2(Math.sin(ang-this.yawOf(p)),Math.cos(ang-this.yawOf(p))))>0.6){ p.plant=true; p.touchT=this.now; await this.until(()=>Math.abs(Math.atan2(Math.sin(ang-this.yawOf(p)),Math.cos(ang-this.yawOf(p))))<0.45, Math.max(240,this.D(260))); } }
      const wind=(p&&!this.skip&&opt.wind!==0)? this.windOf(kk) : 0;
      if(p){ p.kickT=this.now; p.kickW=wind; p.kickK=kk; p.kickF=this.D(kk==='shot'?340:kk==='throw'?300:260); if(wind) p.plant=true; if(kk==='head') p.nodT=this.now; }
      if(wind>0){ await this.wait(wind); if(!this.alive) return res(); }
      release(res); });
  }
  flightTarget(f){ if(f.home){ return f.hands? this.handsOf(f.home) : f.head? this.headOf(f.home) : this.footOf(f.home); } return f.to; }
  /* horizontal progress along a flight: a pass on the deck slows as it rolls, a ball in the air carries with a little drag */
  flC(f){ return f.kind==='shot'?0.3:f.h>1?0.45:0.25; }
  flE(f,t){ if(f.ground) return t*(2-0.55*t)/1.45; const c=this.flC(f); return (1-Math.exp(-c*t))/(1-Math.exp(-c)); }
  flVel(f,tg){ const T=f.dur/1000; const d1=f.ground? (2-1.1)/1.45 : (()=>{ const c=this.flC(f); return c*Math.exp(-c)/(1-Math.exp(-c)); })(); const hz=f.ground?0:f.h;
    return {x:(tg.x-f.from.x)*d1/T, y:(tg.y-f.from.y)*d1/T, z:(((tg.z||0)-f.from.z)-4*hz)/T}; }
  land(){ const f=this.fl; if(!f) return; if(f.phys){ this.endFree(); return; } this.fl=null; const t=this.flightTarget(f);
    const vel=this.flVel(f,t); this.ball.x=t.x; this.ball.y=t.y; this.ball.z=t.z||0; this.lastVel=vel;
    if(f.home){ if(f.hands) this.snd('glove'); else if(!f.head) this.snd(f.h>1?'trap':'touch');
      this.own=f.home; this.hands=f.hands; this.poss=f.home.side; f.home.meet=null; f.home.dribD=0; this.headBall=f.head?f.home:null; if(!f.hands&&!f.head&&f.h>1) this.cush={t:this.now,p:f.home}; if(!f.hands&&!f.head) f.home.touchT=this.now; }
    else if(f.cont&&!this.skip) this.startFree(vel);
    f.res(); }
  /* ---------- free-ball physics: gravity, bounces, rolling friction, the net and the ball-stop fences ---------- */
  tk(){ return 1.5/Math.max(0.12,this.ts); } // game seconds per stage second
  startFree(vStage,opt={}){ const k=this.tk(); const v={x:vStage.x/k,y:vStage.y/k,z:vStage.z/k};
    return new Promise(res=>{ this.own=null; this.fl={phys:true,v,t0:this.now,res,max:opt.max||8000,hold:!!opt.hold}; }); }
  endFree(){ const f=this.fl; if(!f||!f.phys) return; this.fl=null; if(!this.own) this.ownLock={x:this.ball.x,y:this.ball.y}; f.res(); }
  stepFree(dt){ const f=this.fl, b=this.ball, v=f.v; const gd=dt*this.tk(); const n=Math.max(1,Math.min(48,Math.ceil(gd/0.006))); const h=gd/n;
    for(let i=0;i<n;i++){ const px=b.x,py=b.y,pz=b.z;
      v.z-=GRAV*h; const dr=Math.exp(-0.08*h); v.x*=dr; v.y*=dr;
      b.x+=v.x*h; b.y+=v.y*h; b.z+=v.z*h;
      if(b.z<=0){ b.z=0; if(v.z<-1.1){ this._bnc=Math.max(this._bnc||0,-v.z); v.z=-v.z*0.5; v.x*=0.82; v.y*=0.82; } else { v.z=0; const sp=Math.hypot(v.x,v.y); if(sp>0){ const ns=Math.max(0,sp-(2.4+sp*0.2)*h); v.x*=ns/sp; v.y*=ns/sp; } } }
      this.netPhys(px,py,pz,v,h); this.woodwork(v);
      // ball-stop fences behind the goals, boards along the touchlines
      if(b.x<-3.7&&v.x<0){ b.x=-3.7; v.x*=-0.1; v.y*=0.5; } if(b.x>108.7&&v.x>0){ b.x=108.7; v.x*=-0.1; v.y*=0.5; }
      if(b.y<-1.85&&v.y<0){ b.y=-1.85; v.y*=-0.3; } if(b.y>70.5&&v.y>0){ b.y=70.5; v.y*=-0.3; } }
    if(this._bnc){ if(this._bnc>1.6) this.snd('bounce',this._bnc); this._bnc=0; }
    if((b.z===0&&v.z===0&&Math.hypot(v.x,v.y)<0.12) || this.now-f.t0>f.max) this.endFree(); }
  /* the goal is a box of netting: a ball that went in through the mouth is held inside it, a ball outside bounces off it.
     The mesh gives (spring + damper) and the drawn net deforms by exactly the same amount, so nothing ever passes through. */
  netPhys(px,py,pz,v,h){ const b=this.ball, R=BALL_R;
    for(const gx of [0,105]){ const dir=gx===0?-1:1; const d=dir*(b.x-gx); if(d<-R-0.3||d>GF.DB+1.2||b.y<GF.y0-1.2||b.y>GF.y1+1.2) continue;
      const zc=b.z+R;
      const P=[ {n:[0,-1,0], s:GF.y0-b.y}, {n:[0,1,0], s:b.y-GF.y1},
        {n:[dir*GF.ZB/NET_N.back,0,(GF.DB-GF.DT)/NET_N.back], s:((d-GF.DB)*GF.ZB+zc*(GF.DB-GF.DT))/NET_N.back},
        {n:[dir*(GF.H-GF.ZB)/NET_N.roof,0,GF.DT/NET_N.roof], s:(d*(GF.H-GF.ZB)+(zc-GF.H)*GF.DT)/NET_N.roof} ];
      if(b.ing===gx){
        for(const q of P){ const pen=q.s+R; if(pen>0) this.netContact(gx,q.n,pen,v,h,-1); }
        // once it is in, it stays in: the ball never rolls back out through the mouth
        if(this.inNet&&d<R+0.05){ b.x=gx+dir*(R+0.05); if(v.x*dir<0) v.x*=-0.3; }
      } else {
        const dp=dir*(px-gx);
        if(dp<=0&&d>0&&b.y>GF.y0&&b.y<GF.y1&&zc<GF.H){ b.ing=gx; continue; }
        let mx=-d, mi=-1; P.forEach((q,i)=>{ if(q.s>mx){ mx=q.s; mi=i; } });
        if(mx<R&&mi>=0) this.netContact(gx,P[mi].n,R-mx,v,h,1);
      } } }
  /* the frame: two round posts and a crossbar the ball can ring off */
  woodwork(v){ const b=this.ball, R=BALL_R, r=0.06, cz=b.z+R;
    for(const gx of [0,105]){ if(Math.abs(b.x-gx)>0.9||b.ing===gx) continue;
      if(cz<GF.H+r+R) for(const py of [GF.y0,GF.y1]){ const dx=b.x-gx, dy=b.y-py, d=Math.hypot(dx,dy); if(d<R+r&&d>1e-4&&cz<GF.H+r){ const nx=dx/d, ny=dy/d; const vn=v.x*nx+v.y*ny; if(vn<0){ v.x-=1.62*vn*nx; v.y-=1.62*vn*ny; v.z*=0.85; this.hitWood(-vn); } b.x=gx+nx*(R+r+0.002); b.y=py+ny*(R+r+0.002); } }
      if(b.y>GF.y0-r&&b.y<GF.y1+r){ const dx=b.x-gx, dz=cz-(GF.H+r*0.5); const d=Math.hypot(dx,dz); if(d<R+r&&d>1e-4){ const nx=dx/d, nz=dz/d; const vn=v.x*nx+v.z*nz; if(vn<0){ v.x-=1.62*vn*nx; v.z-=1.62*vn*nz; this.hitWood(-vn); } b.x=gx+nx*(R+r+0.002); b.z=GF.H+r*0.5+nz*(R+r+0.002)-R; } } } }
  hitWood(sp){ if(this.now-(this._woodT||-9e9)<250) return; this._woodT=this.now; this.woodHit={t:this.now}; this.snd('post',clamp(sp/14,0.35,1)); }
  netContact(gx,n,pen,v,h,sgn){ const b=this.ball, R=BALL_R; const N=[n[0]*sgn,n[1]*sgn,n[2]*sgn];
    const vn=v.x*N[0]+v.y*N[1]+v.z*N[2]; let a=1700*pen; if(vn<0) a-=75*vn;
    v.x+=N[0]*a*h; v.y+=N[1]*a*h; v.z+=N[2]*a*h;
    const vn2=v.x*N[0]+v.y*N[1]+v.z*N[2]; const fr=Math.exp(-4*h); // the mesh drags along its surface
    v.x=N[0]*vn2+(v.x-N[0]*vn2)*fr; v.y=N[1]*vn2+(v.y-N[1]*vn2)*fr; v.z=N[2]*vn2+(v.z-N[2]*vn2)*fr;
    if(pen>0.5){ const c=pen-0.5; b.x+=N[0]*c; b.y+=N[1]*c; b.z+=N[2]*c; pen=0.5; } // the mesh never tears
    if(pen>0.05&&this.now-(this._netSnd||-9e9)>400){ this._netSnd=this.now; this.snd('net',clamp(Math.abs(vn)/12,0.2,1)); }
    const D=this.netD[gx]; const k=R-pen; D.c={x:b.x-N[0]*k, y:b.y-N[1]*k, z:b.z+R-N[2]*k}; D.n=[-N[0],-N[1],-N[2]]; D.tgt=Math.max(D.tgt,pen); D.touch=this.now; }
  updNet(dt){ for(const gx of [0,105]){ const D=this.netD[gx]; const live=this.now-D.touch<60;
      if(live){ if(D.a<D.tgt){ D.va=Math.max(D.va,(D.tgt-D.a)/Math.max(dt,0.008)); D.a=D.tgt; } else { D.a+=(D.tgt-D.a)*Math.min(1,dt*10); D.va=0; } }
      else { D.va+=(-D.a*260-D.va*9)*dt; D.a+=D.va*dt; if(Math.abs(D.a)<0.002&&Math.abs(D.va)<0.01){ D.a=0; D.va=0; } }
      D.tgt=0; } }
  /* ---------- possession primitives ---------- */
  /* engine touches are cosmetic, so turn any implausible one into a sensible football action */
  sensible(p){
    const o=this.own; if(!p||!o||p.off) return p;
    const ownGoalX=s=>s===0?0:105; const fwd=q=>q.side===0?q.x:105-q.x; // distance up the pitch for that side
    if(p.side===o.side){
      // never a cross-field ball back to the keeper: only defenders near their own box play it back
      if(p.gk && (Math.abs(o.x-ownGoalX(o.side))>32 || dist2(o,p)>30)) return this.nearest(o.side,lerp(o.x,ownGoalX(o.side),0.25),o.y,true,o);
      // an attacker near goal doesn't pump it 25 m backwards: he finds someone close by or ahead
      if(fwd(o)>60 && fwd(o)-fwd(p)>18){ let best=null,bd=1e9; for(const q of this.players.values()){ if(q.side!==o.side||q.off||q.gk||q===o) continue; if(fwd(o)-fwd(q)>10) continue; const d=dist2(o,q); if(d<bd){bd=d;best=q;} } return best||p; }
      return p;
    }
    // the ball is won by the opponent closest to it, never by someone out of the picture
    return this.nearest(p.side,this.ball.x,this.ball.y,!(p.gk&&Math.abs(this.ball.x-ownGoalX(p.side))<14))||p;
  }
  /* nobody walks through a goal: paths that would cross the side or back netting go round the post or in through the mouth */
  detour(p){ const tx=p.tx, ty=p.ty;
    for(const gx of [0,105]){ const dir=gx===0?-1:1; const x0=gx, x1=gx+dir*2.0, y0=29.9, y1=38.1;
      const behind=X=>dir>0?X>x0-0.05:X<x0+0.05; if(!behind(p.x)&&!behind(tx)) continue;
      const inside=(X,Y)=>(dir>0?X>x0&&X<x1:X<x0&&X>x1)&&Y>y0&&Y<y1;
      const segX=(ax,ay,bx,by,cx,cy,dx,dy)=>{ const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx); if(Math.abs(d)<1e-9) return false; const u=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d, v=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d; return u>0&&u<1&&v>=0&&v<=1; };
      const hits=segX(p.x,p.y,tx,ty,x0,y0,x1,y0)||segX(p.x,p.y,tx,ty,x0,y1,x1,y1)||segX(p.x,p.y,tx,ty,x1,y0,x1,y1);
      if(!hits) continue;
      const mouth=c=>({x:gx-dir*0.7,y:clamp(c,31.4,36.6)}); const pIn=inside(p.x,p.y), tIn=inside(tx,ty);
      if(pIn) return mouth(p.y); const py=((p.y+ty)/2<34)?y0-1.3:y1+1.3;
      if(behind(p.x)) return {x:x1+dir*1.1,y:py};
      if(tIn) return mouth(ty);
      // already level with the post and beside the frame: carry on round the back corner
      if(Math.abs(p.y-34)>3.66+0.3&&Math.abs(p.y-py)<1.6) return {x:x1+dir*1.1,y:py};
      return {x:gx-dir*0.7,y:py}; }
    return null; }
  /* would a step from (ax,ay) to (bx,by) pass through a goal's side or back netting? */
  netBlock(ax,ay,bx,by){ const sx=(ax,ay,bx,by,cx,cy,dx,dy)=>{ const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx); if(Math.abs(d)<1e-9) return false; const u=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d, v=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d; return u>=0&&u<=1&&v>=0&&v<=1; };
    for(const gx of [0,105]){ const x1=gx+(gx===0?-2:2); if(Math.min(ax,bx)>Math.max(gx,x1)+0.5||Math.max(ax,bx)<Math.min(gx,x1)-0.5) continue;
      if(sx(ax,ay,bx,by,gx,GF.y0,x1,GF.y0)||sx(ax,ay,bx,by,gx,GF.y1,x1,GF.y1)||sx(ax,ay,bx,by,x1,GF.y0,x1,GF.y1)) return true; } return false; }
  /* is q close to the lane between a and b? */
  nearLane(q,a,b,w){ const vx=b.x-a.x, vy=b.y-a.y, L=vx*vx+vy*vy||1; const t=clamp(((q.x-a.x)*vx+(q.y-a.y)*vy)/L,0,1); return Math.hypot(a.x+vx*t-q.x,a.y+vy*t-q.y)<w && t>0.15; }
  /* long balls go through a teammate in between instead of 50-metre passes */
  relayFor(a,b){ const d=dist2(a,b); if(d<=34) return null; let best=null,bd=1e9; const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    for(const q of this.players.values()){ if(q.side!==a.side||q.off||q.gk||q===a||q===b) continue; const v=(q.x-mx)**2+(q.y-my)**2; if(v<bd){bd=v;best=q;} }
    return best&&dist2(a,best)<d*0.75&&dist2(best,b)<d*0.75 ? best : null; }
  async gain(p){
    if(!p||this.own===p) return;
    if(this.fl&&this.fl.phys){ await this.fetch(p,false); return; }
    if(this.fl) await this.until(()=>!this.fl,3000);
    if(this.own===p) return;
    const o=this.own;
    if(o&&o.side===p.side){ const r=this.hands?null:this.relayFor(o,p); if(r){ await this.pass(o,r); if(this.own===r) await this.pass(r,p); return; } await this.pass(o,p); return; }
    if(o){ // either the pass is cut out, or he goes and wins it
      const d=dist2(p,o); const mate=this.nearest(o.side,o.x+(o.side===0?12:-12),o.y,true,o);
      if(!this.hands && mate && d>3 && d<16 && this.nearLane(p,o,mate,3.5)){ this.look(p,o.x,o.y); p.meet={x:lerp(p.x,o.x,0.25),y:lerp(p.y,o.y,0.25)}; await this.launch(o,{home:p,dur:this.D(460)*clamp(d/14,0.6,1.3),h:0.2}); return; }
      await this.tackle(p,o); return; }
    await this.fetch(p,false);
  }
  async pass(a,b,loft){
    if(!a||!b||a===b) return; if(this.own!==a) await this.gain(a); if(this.own!==a) return;
    if(!b.ov&&!b.gk) b.meet={x:lerp(b.x,b.tx,0.55),y:lerp(b.y,b.ty,0.55)};
    const d=Math.hypot(b.x-a.x,b.y-a.y); const h= loft!=null? loft : this.passH(a,b,d);
    if(this.hands && a.gk){ await this.wait(this.D(160)); }
    await this.launch(a,{home:b,dur:this.D(520)*clamp(d/18,0.55,1.7)*(h>2?1.12:1),h,hFn:loft!=null?null:()=>Math.max(h,this.passH(a,b,Math.hypot(b.x-a.x,b.y-a.y)))});
  }
  async tackle(p,o){
    if(this.hands){ // a keeper holding the ball is never tackled; he releases first
      const mate=this.nearest(o.side,o.x,o.y,true,o); if(mate) await this.pass(o,mate,1.2); if(this.own!==p) return this.gain(p); return; }
    p.chase=o; o.slow=true;
    await this.until(()=>this.own!==o || dist2(p,o)<1.7, this.eta(p,o.x,o.y,1.2)*1.6+700);
    p.chase=null; o.slow=false; if(this.own!==o) return;
    if(dist2(p,o)>2.6) return; // never took it off him from a distance
    const slide=dist2(p,o)>1.1||Math.random()<0.35; this.look(p,o.x,o.y,this.D(500));
    if(slide){ p.slideT=this.now; p.vx=(o.x-p.x)*3; p.vy=(o.y-p.y)*3; this.kickTurf(p.x,p.y,8,1.2); this.snd('slide'); } else { p.kickT=this.now; p.kickW=0; p.kickK='pass'; p.kickF=this.D(220); }
    o.trip=this.now; o.ov=null; o.vx*=0.3; o.vy*=0.3; this.placed=false;
    // the challenge pokes the ball off his foot and it runs to the tackler
    this.snd('tackle');
    await this.launch(null,{home:p,dur:this.D(170)+50,h:0.12,kind:'pass'});
  }
  async fetch(p,hands){ p.chase={ball:true}; const near=()=>dist2(p,this.ball)<1.1&&(hands||this.ball.z<0.6);
    await this.until(near, Math.max(this.D(1600)+900, this.eta(p,this.ball.x,this.ball.y,1.4)*1.4+500));
    if(!near()&&!this.skip) await this.until(near, this.eta(p,this.ball.x,this.ball.y,1.2)*2+1500);
    if(!near()&&!this.skip){ const a=Math.atan2(p.y-this.ball.y,p.x-this.ball.x); p.x=this.ball.x+Math.cos(a)*0.9; p.y=this.ball.y+Math.sin(a)*0.9; } // never collect the ball from a distance
    p.chase=null;
    if(this.fl&&!this.fl.phys) await this.until(()=>!this.fl,2000); if(this.fl&&this.fl.phys) this.endFree();
    this.own=p; this.hands=!!hands; this.poss=p.side; this.placed=false; this.ball.ing=null; if(hands) p.gatherT=this.now; else p.touchT=this.now; }
  async dribble(p,x,y,ms){ if(this.own!==p) await this.gain(p); p.ov={x,y}; await this.until(()=>this.own!==p||Math.hypot(p.x-x,p.y-y)<0.6, Math.max(this.D(ms)+300, this.eta(p,x,y,0.88)+250)); }
  async carry(p,x,y,ms){ this.own=p; this.hands=true; this.placed=false; p.ov={x,y}; await this.until(()=>Math.hypot(p.x-x,p.y-y)<0.5, Math.max(this.D(ms)+400, this.eta(p,x,y)+300)); }
  async place(p,x,y,standX,standY){ // set the ball down on a spot and stand behind it
    if(this.own!==p||Math.hypot(p.x-x,p.y-y)>1.2) await this.carry(p,x,y,400); // the ball is only set down where its holder stands
    this.hands=false; this.own=null; this.ownLock={x,y}; this.ball={x,y,z:0,spin:this.ball.spin}; p.ov={x:standX,y:standY}; p.placeT=this.now;
    await this.until(()=>Math.hypot(p.x-standX,p.y-standY)<0.5, Math.max(this.D(500)+300, this.eta(p,standX,standY)+200)); this.own=p; this.placed=true; this.ownLock={x,y}; this.look(p,x,y,this.D(900)); }
  /* ---------- minute choreography ---------- */
  async playMinute(out,M,W){
    const start=this.now; this.skip=false; this.ts=clamp(W/1500,0.12,1.1); await this.tapOff();
    const touch=(M.touch||[]).map(t=>this.pl(t.pid)).filter(p=>p&&!p.off);
    const shots=out.filter(e=>e.t==='save'||e.t==='miss'); const cards=out.filter(e=>e.t==='yellow'||e.t==='red');
    const fast=W<300;
    const seq = fast? touch.slice(-1) : touch;
    let n=0; for(const t of seq){ if(this.skip) break; if(n++>0 && this.now-start>W*0.55) break; // keep to the chosen speed
      const p=this.sensible(t); if(!p) continue; await this.gain(p); if(!fast){ const dir=p.side===0?1:-1; await this.dribble(p, clamp(p.x+dir*(3+Math.random()*5),4,101), clamp(p.y+(Math.random()-.5)*6,3,65), 300); } }
    const offs=out.filter(e=>e.t==='offside');
    for(const e of offs){ if(this.skip) break; if(W>=700) await this.offsideSeq(e); else this.quickFlag(e); }
    for(const e of shots){ if(this.skip) break; await this.shotSeq(e); }
    for(const e of cards){ if(this.skip) break; await this.cardSeq(e); }
    if(!fast&&W>=700&&!this.skip&&!shots.length&&!offs.length&&!cards.length){ const o=this.own; if(o&&!this.hands&&!o.gk&&(o.y<9||o.y>59)&&Math.random()<0.42){ const near=[...this.players.values()].some(q=>!q.off&&!q.gk&&q!==o&&Math.hypot(q.x-o.x,q.y-(o.y<34?0:68))<11); if(near) await this.throwIn(); } }
    const left=W-(this.now-start); if(left>0) await this.wait(left);
  }
  /* arrange defenders to match how much space the shooter had */
  stageSpace(e,pl){ const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const sp=e.sp||(e.xg>=0.25?'open':e.xg<0.07?'tight':'normal');
    const defs=[...this.players.values()].filter(q=>q.side!==s&&!q.gk&&!q.off).sort((a,b)=>dist2(a,pl)-dist2(b,pl));
    if(sp==='open'){ defs.slice(0,3).forEach((q,i)=>{ if(dist2(q,pl)<9) q.ov={x:pl.x-dir*(5+i*2.5),y:pl.y+(i%2?1:-1)*(2+i)}; }); }
    else if(sp==='tight'){ const bx=pl.x+dir*1.6, by=lerp(pl.y,34,0.15); if(defs[0]) defs[0].ov={x:bx,y:by}; if(defs[1]) defs[1].ov={x:pl.x+dir*0.4,y:pl.y+(pl.y<34?1.4:-1.4)}; }
    return sp; }
  clearStaged(){ for(const q of this.players.values()){ q.trail=null; if(q.ov&&!q.gk&&q!==this.own&&!this.so) q.ov=null; } }
  async shotSeq(e){
    const p=this.pl(e.pid); if(!p){ this.emit(e); return; }
    const s=e.s, dir=s===0?1:-1, gx=s===0?105:0;
    if(e.ty==='pen') return this.penNoGoal(e,p);
    await this.gain(p); if(this.own!==p) await this.gain(p);
    let [sx,sy]= e.x!=null? livePos(s,e.x,Math.max(e.y,70)) : [gx-dir*16,34]; // nobody shoots from beyond ~30 m
    p.ov={x:sx,y:sy}; await this.until(()=>this.own!==p||Math.hypot(p.x-sx,p.y-sy)<1.2, this.eta(p,sx,sy)+400);
    if(this.own!==p) await this.gain(p);
    if(Math.abs(p.x-gx)>29.5){ sx=gx-dir*27; p.ov={x:sx,y:p.y}; await this.until(()=>Math.abs(p.x-gx)<=29.5, this.eta(p,sx,p.y)+400); }
    this.stageSpace(e,p); await this.wait(this.D(220));
    const gk=this.gkOf(1-s); const wind=this.windOf('shot');
    if(e.t==='save'){
      let ty=34+(Math.random()-.5)*5.2;
      // the keeper reads it as the shooter's foot comes through, and the ball arrives in his hands at full stretch
      const corner=!!gk&&!!e.cor; if(corner) ty=34+(Math.random()<.5?-1:1)*(2.8+Math.random()*0.5);
      const parry=corner||(!!gk&&Math.abs(ty-34)>1.2&&Math.random()<0.3);
      const sdur=this.D(340)+120; if(gk){ gk.dive={dir:Math.sign(ty-gk.y)||1,t:this.now+wind+Math.max(this.D(40),sdur-Math.max(150,this.D(250))),catch:!parry}; gk.ov={x:gx-dir*0.8,y:ty}; }
      if(gk&&!parry) await this.launch(p,{home:gk,hands:true,dur:this.D(340)+120,h:0.5,hFn:()=>this.shotH(s,{x:gk.x,y:ty,z:1},0.5),kind:'shot'});
      else if(gk){ /* a strong hand pushes it round the post and out of danger: the ball meets the glove, then flies off it */ await this.launch(p,{home:gk,hands:true,dur:this.D(340)+120,h:0.4,hFn:()=>this.shotH(s,{x:gk.x,y:ty,z:1},0.4),kind:'shot'}); if(corner){ this.emit(e); e._done=1; } if(this.own===gk){ this.own=null; this.hands=false; } const sg=Math.sign(ty-34)||1;
        if(corner){ /* round the post and behind: a corner */ await this.launch(null,{to:{x:gx+dir*1.3,y:34+sg*(7+Math.random()*2.5),z:0.2},dur:this.D(420)+80,h:1.1,kind:'clear'}); this.ownLock={x:this.ball.x,y:this.ball.y}; }
        else this.startFree({x:-dir*(4+Math.random()*5),y:sg*(12+Math.random()*6),z:4+Math.random()*3},{max:1800}); }
      else await this.launch(p,{to:{x:gx-dir*0.5,y:ty,z:0},dur:this.D(340)+120,h:0.5,kind:'shot'});
      if(!e._done) this.emit(e); this.onCaption(corner?'TIPPED AROUND THE POST':parry?'PARRIED!':'SAVED','shot'); this.hype=Math.max(this.hype,0.4); this.clearStaged();
      await this.wait(this.D(380)+120);
      if(gk&&corner){ gk.dive=null; gk.ov=null; if(this.ts>=0.45&&!this.skip) await this.cornerKick(s,Math.sign(ty-34)||1); else { const m=this.nearest(1-s,gx-dir*8,34); if(m) await this.fetch(m,false); } }
      else if(gk&&parry){ gk.dive=null; const d=this.nearest(1-s,this.ball.x,this.ball.y); const fetcher=d&&dist2(d,this.ball)<dist2(gk,this.ball)?d:gk; await this.fetch(fetcher,fetcher===gk);
        if(this.own===fetcher&&fetcher!==gk){ await this.launch(fetcher,{to:{x:clamp(fetcher.x-dir*30,10,95),y:clamp(34+(Math.random()-.5)*30,6,62),z:0},dur:this.D(900),h:3,kind:'clear',cont:true}); } else if(this.own===gk){ gk.ov=null; await this.distribute(gk); } gk.ov=null; }
      else if(gk){ gk.dive=null; gk.ov=null; await this.distribute(gk); }
    } else {
      const over=Math.random()<.38; const side=Math.random()<.5?-1:1; const wood=Math.random()<0.16?(Math.random()<0.65?'post':'bar'):null;
      // it crosses the line clear of the frame: over the bar with the whole ball, or wide of the post with room to spare; now and then it rings off the woodwork
      let to= over? {x:gx+dir*0.4,y:34+(Math.random()-.5)*5,z:2.75+Math.random()*1.0} : {x:gx+dir*0.4,y:34+side*(4.2+Math.random()*2.6),z:Math.random()*0.8};
      if(wood) to=this.woodTarget(wood,gx,dir,side);
      if(gk){ gk.dive={dir:Math.sign(to.y-gk.y)||1,t:this.now+wind+Math.max(this.D(70),this.D(400)+140-Math.max(150,this.D(250)))}; }
      await this.launch(p,{to,dur:this.D(400)+140,h:over&&!wood?0.9:0.3,hFn:()=>this.shotH(s,to,over&&!wood?0.9:0.3),kind:'shot',cont:true}); // then real physics: it bounces and rolls out, catches the side netting or comes back off the frame
      this.emit(e); this.onCaption(wood==='post'?'OFF THE POST!':wood==='bar'?'OFF THE BAR!':over?'OVER THE BAR':'WIDE','shot'); this.clearStaged();
      await this.wait(this.D(260)); if(gk) gk.dive=null; await this.goalKick(1-s);
    }
  }
  async goalKick(side){
    const gk=this.gkOf(side)||this.nearest(side,this.ball.x,this.ball.y,false); if(!gk) return;
    const gx=side===0?0:105, dir=side===0?1:-1;
    await this.fetch(gk,true);
    const sy=34+(this.ball.y>34?8:-8); await this.carry(gk,gx+dir*5.5,sy,500);
    await this.place(gk,gx+dir*5.5,sy,gx+dir*3.6,sy);
    await this.wait(this.D(200));
    const mates=[...this.players.values()].filter(q=>q.side===side&&!q.gk&&!q.off).sort((a,b)=>Math.abs(b.x-gx)-Math.abs(a.x-gx));
    const tgt=mates[Math.floor(Math.random()*Math.min(4,mates.length))]; if(tgt) await this.pass(gk,tgt,4.5);
  }
  async distribute(gk){
    const dir=gk.side===0?1:-1; await this.carry(gk,gk.x+dir*4,gk.y,350);
    const tgt=this.nearest(gk.side,gk.x+dir*14,gk.y,true); if(tgt) await this.pass(gk,tgt,1.1);
  }
  async cardSeq(e){
    const p=this.pl(e.pid); if(!p){ this.emit(e); return; }
    const r=this.ref; r.ov={x:p.x+(p.x<52?1.4:-1.4),y:p.y+0.8};
    await this.until(()=>Math.hypot(r.x-r.ov.x,r.y-r.ov.y)<0.8, this.D(800)+300);
    r.card={c:e.t==='red'?'#e53935':'#ffd400',t:this.now}; this.emit(e); this.onCaption(e.t==='red'?'RED CARD':'YELLOW CARD','card');
    await this.wait(this.D(750)+250);
    if(e.t==='red'){ p.off=true; p.ov={x:p.x,y:-4}; if(this.own===p){ const m=this.nearest(p.side,p.x,p.y,true,p); if(m){ this.own=m; this.hands=false; } } }
    r.ov=null; r.card=null;
  }
  /* ---------- officials & restarts ---------- */
  arFor(att){ return this.ars.find(a=>a.att===att); }
  blow(k){ if(this.sfx&&!this.skip&&!this.paused&&typeof Sound!=='undefined'&&Sound.whistle) Sound.whistle(k); }
  /* at high speed the call is shown without stopping play: the flag, the freeze-line and the whistle */
  quickFlag(e){ const ar=this.arFor(e.s); const L=this.offLine(e.s); if(ar){ ar.flag='up'; ar.flagT=this.now; } this.offMark={x:L,t:this.now}; this.blow('pen'); this.emit(e); this.onCaption('OFFSIDE','set'); }
  /* offside: he goes a moment too early, a yard or two past the second-last defender as the ball is played; the flag goes up
     with the pass, the whistle goes, and the defending side takes the free kick from where he was caught */
  async offsideSeq(e){ const p=this.pl(e.pid); if(!p||p.off||this.skip){ this.emit(e); return; }
    const s=e.s, dir=s===0?1:-1;
    let o=this.own; if(!o||o.side!==s||o===p||this.hands){ const m=this.nearest(s,p.x-dir*16,lerp(p.y,34,0.3),true,p); if(m) await this.gain(m); o=this.own; }
    if(!o||o.side!==s||o===p||this.hands||this.skip){ this.quickFlag(e); return; }
    const L=this.offLine(s); const ox=clamp(L+dir*(1.4+Math.random()*1.6),3,102), oy=clamp(lerp(p.y,34,0.25),6,62);
    this.focus={x:(o.x+ox)/2}; p.ov={x:ox,y:oy}; p.hurry=true; p.offRun=true; this.wait(this.D(3000)).then(()=>{ p.offRun=false; }); await this.until(()=>this.own!==o||dist2(p,p.ov)<1.6, Math.min(this.D(1000)+200,this.eta(p,ox,oy,1.3)));
    p.hurry=false; if(this.own!==o||this.skip){ p.ov=null; this.focus=null; this.quickFlag(e); return; }
    const ar=this.arFor(s); const d=dist2(o,p);
    await this.launch(o,{home:p,dur:this.D(560)*clamp(d/18,0.6,1.5),h:this.passH(o,p,d),onRelease:()=>{ const lx=this.offLine(s); if(ar){ ar.flag='up'; ar.flagT=this.now; } this.offMark={x:lx,t:this.now}; }});
    p.ov={x:p.x,y:p.y}; this.blow('pen'); this.emit(e); this.onCaption('OFFSIDE','set');
    const spot={x:clamp(p.x,4,101),y:clamp(p.y,3,65)};
    await this.wait(this.D(360));
    if(this.own===p){ this.own=null; } this.ownLock={x:this.ball.x,y:this.ball.y}; p.ov=null;
    this.focus=null; const df=this.nearest(1-s,spot.x,spot.y,true); if(!df||this.skip) return;
    await this.fetch(df,false); if(this.own!==df) return; await this.wait(this.D(120));
    const m=this.nearest(1-s,spot.x-dir*16,lerp(spot.y,34,0.4),true,df); if(m) await this.pass(df,m); }
  /* a throw-in: the ball runs out, the assistant points the way, the nearest man takes it from the line with both hands over his head */
  async throwIn(){ const o=this.own; if(!o||this.hands||o.gk||this.skip) return; const s0=o.side, d0=s0===0?1:-1; const far=o.y<34;
    const tx=clamp(o.x+d0*(3+Math.random()*6),6,99), ty=far?-0.8:68.8;
    await this.launch(o,{to:{x:tx,y:ty,z:0},dur:this.D(460)+60,h:0.25,kind:'pass'}); this.ownLock={x:this.ball.x,y:this.ball.y}; if(this.skip) return;
    const side=Math.random()<0.65?1-s0:s0, dir=side===0?1:-1; const ar=tx>52.5?this.ars[0]:this.ars[1];
    if(!this.nearest(side,tx,far?0:68,true)){ return; }
    if(ar){ ar.flag='point'; ar.pointDir=dir; ar.flagT=this.now; }
    this.onCaption('THROW-IN','set');
    const thrower=this.nearest(side,tx,far?0:68,true); if(!thrower) return;
    const ly=far?-0.4:68.4; const mate=this.nearest(side,tx+dir*7,far?8:60,true,thrower);
    if(mate) mate.ov={x:clamp(tx+dir*(4+Math.random()*5),4,101),y:far?6+Math.random()*4:62-Math.random()*4};
    await this.fetch(thrower,true); if(this.own!==thrower) return;
    await this.carry(thrower,tx,ly,380); this.look(thrower,tx+dir*5,34,this.D(900)); await this.wait(this.D(110));
    const to=mate||this.nearest(side,tx+dir*8,34,true,thrower); if(to&&!this.skip){ if(mate) await this.until(()=>dist2(mate,mate.ov)<1.8,this.D(450)+120); await this.pass(thrower,to,1.3); } if(mate) mate.ov=null; thrower.ov=null; }
  /* a corner after the keeper turns it behind: a ball goes to the flag, the box fills, the cross is headed clear or claimed */
  async cornerKick(s,sg){ const dir=s===0?1:-1, gx=s===0?105:0; const cy=sg<0?0.6:67.4, cx=gx-dir*0.6;
    this.onCaption('CORNER','set'); const taker=this.nearest(s,cx-dir*6,cy,true); if(!taker) return; const gk=this.gkOf(1-s);
    let a=0,d=0; for(const q of this.players.values()){ if(q===taker||q.off||q.gk) continue; if(q.side===s&&a<4){ q.ov={x:gx-dir*(6+Math.random()*6),y:29.5+Math.random()*9}; a++; } else if(q.side!==s&&d<5){ q.ov={x:gx-dir*(2.5+Math.random()*6.5),y:29.5+Math.random()*9}; d++; } }
    taker.ov={x:cx+dir*0.9,y:cy+(sg<0?-0.7:0.7)}; this.own=null;
    await this.launch(null,{to:{x:cx,y:cy,z:0},dur:this.D(420)+80,h:1.2,kind:'pass'}); /* the ball is tossed back to the flag */ this.ownLock={x:cx,y:cy};
    await this.until(()=>dist2(taker,taker.ov)<0.8, this.eta(taker,taker.ov.x,taker.ov.y,1.3)); if(this.skip) return;
    taker.x=taker.ov.x; taker.y=taker.ov.y; this.own=taker; this.placed=true; this.hands=false; this.ownLock={x:cx,y:cy}; this.ball={x:cx,y:cy,z:0,spin:this.ball.spin};
    await this.wait(this.D(220));
    const JD=Math.max(260,this.D(560));
    if(gk&&Math.random()<0.4){ gk.ov={x:gx-dir*4.5,y:34+sg*3}; await this.launch(taker,{home:gk,hands:true,dur:this.D(760),h:4}); gk.gatherT=this.now; this.onCaption('CLAIMED','set'); this.clearStaged(); gk.ov=null; if(this.own===gk) await this.distribute(gk); return; }
    const df=this.nearest(1-s,gx-dir*6,34+sg*2,true); if(!df){ this.clearStaged(); return; }
    df.ov={x:df.x,y:df.y};
    await this.launch(taker,{home:df,head:true,dur:this.D(760),h:4.2,onRelease:f=>{ df.jumpT=this.now+f.dur-JD*0.5; }});
    if(this.own===df) await this.launch(df,{to:{x:clamp(gx-dir*(24+Math.random()*12),8,97),y:clamp(34+(Math.random()-.5)*34,6,62),z:0},dur:this.D(760),h:3.2,kind:'clear',nod:true,cont:true});
    this.onCaption('HEADED CLEAR','set'); this.clearStaged(); df.ov=null; }
  /* ---------- goals ---------- */
  async goalSequence(e){
    this.skip=false; this.ts=this.goalTs; await this.tapOff(); this.setPiece=null; const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; this.poss=s;
    const seq=e.seq&&e.seq.length? e.seq : [{pid:e.pid,x:50,y:86,a:'shot'}];
    this.zoomTo(0.82);
    const first=seq[0];
    if(first.a==='corner') await this.setupCorner(e,first);
    else if(first.a==='setup') await this.setupDeadBall(e,first);
    for(let i=0;i<seq.length;i++){
      const pt=seq[i]; const pl=this.pl(pt.pid); if(!pl) continue; const [X,Y]=livePos(s,pt.x,pt.y); const prevA=i>0?seq[i-1].a:null;
      if(i===0&&(pt.a==='corner'||pt.a==='setup')){ if(pt.a==='setup'&&seq.length===1){ await this.finish(e,pl); } continue; }
      if(pt.a==='run'&&e.ty==='break'&&this.own&&this.own!==pl&&this.own.side===s&&!this.hands){ await this.breakaway(e,this.own,pl,X,Y); continue; }
      if(this.own!==pl){
        pl.ov={x:X,y:Y};
        const o=this.own; const lofted=(prevA==='cross'||prevA==='corner');
        if(o&&o.side===s){ const header = lofted && (e.ty==='header'||e.ty==='corner') && pt.a==='shot';
          const dd=Math.hypot(pl.x-o.x,pl.y-o.y); const dur=this.D(lofted?760:560)*clamp(dd/20,0.7,1.6); const h=lofted?4.2:this.passH(o,pl,dd);
          /* the header: he times his leap so the top of the jump meets the cross */
          const JD=Math.max(260,this.D(560)); if(header) pl.jumpT=this.now+9e6; /* not yet: he leaps when the cross is struck */
          await this.launch(o,{home:pl,head:header,dur:dur*(h>2&&!lofted?1.12:1),h,onRelease:header?(f=>{ pl.jumpT=this.now+f.dur-JD*0.5; }):null}); }
        else { const w=this.sensible(pl); if(w&&w!==pl&&w.side===pl.side){ await this.gain(w); if(this.own===w) await this.gain(pl); } else await this.gain(pl); } // the nearest attacker wins it back, then finds him
      }
      if(pt.a==='shot'){ if(this.ball.z<0.5 && Math.hypot(pl.x-X,pl.y-Y)>1.2) await this.dribble(pl,X,Y,350); await this.finish(e,pl); }
      else if(pt.a==='run'){ if(e.ty==='break') this.onCaption('BREAKAWAY','set');
        let beat=null; if(e.ty==='solo'){ beat=this.nearest(1-s,lerp(pl.x,X,0.5),lerp(pl.y,Y,0.5)); if(beat){ beat.ov={x:lerp(pl.x,X,0.45),y:lerp(pl.y,Y,0.45)+(Math.random()<.5?1:-1)}; } }
        if(beat){ await this.dribble(pl,lerp(pl.x,X,0.4),lerp(pl.y,Y,0.4),500); beat.slideT=this.now; pl.jumpT=this.now; this.onCaption('SKILL!','set'); }
        await this.dribble(pl,X,Y,700); if(beat) beat.ov=null; }
      else { await this.dribble(pl,X,Y,380); }
    }
    // the scorer's signature celebration, then the team piles in
    const sc=this.pl(e.pid);
    if(sc&&!sc.off) await this.celebrate(sc,s); else await this.wait(this.rm?600:this.D(1900));
    await this.restartAfterGoal(1-s);
  }
  /* a breakaway: the back line steps up, he sits on the last man's shoulder (onside), the through ball goes into the space
     behind them and he is gone as it is struck; the defenders turn and chase, the keeper comes off his line */
  /* the high line a breakaway beats: where the back four stand, and where the runner waits on the last man's shoulder */
  breakLine(s,ox,X,Y){ const dir=s===0?1:-1, gx=s===0?105:0; const lineX=X-dir*clamp(Math.abs(X-ox)*0.42,6,12);
    const opp=[...this.players.values()].filter(q=>q.side!==s&&!q.gk&&!q.off).sort((a,b)=>Math.abs(a.x-gx)-Math.abs(b.x-gx));
    const back=opp.filter((q,i)=>i<4||dir*(q.x-lineX)>-2).sort((a,b)=>a.y-b.y);
    const spots=back.map((q,i)=>({q,x:clamp(lineX+dir*(0.5+i%2*0.6),3,102),y:clamp(Y+(i-(back.length-1)/2)*7,5,63)}));
    return {lineX,back,spots,run:{x:clamp(lineX-dir*0.6,3,102),y:clamp(Y+(Y<34?2.2:-2.2),5,63)}}; }
  async breakaway(e,o,pl,X,Y){ const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const gk=this.gkOf(1-s);
    const BL=this.breakLine(s,o.x,X,Y); const lineX=BL.lineX, back=BL.back;
    BL.spots.forEach(t=>{ t.q.ov={x:t.x,y:t.y}; if(dist2(t.q,t.q.ov)>4) t.q.hurry=true; });
    pl.ov={...BL.run}; pl.hurry=dist2(pl,pl.ov)>4;
    if(this.own===o) o.ov={x:o.x,y:o.y}; this.focus={x:(o.x+lineX)/2+dir*3};
    await this.until(()=>dist2(pl,pl.ov)<1.6&&back.every(q=>dist2(q,q.ov)<2.4), this.D(1500)+300); back.forEach(q=>{ q.hurry=false; }); pl.hurry=false;
    if(this.own!==o){ this.focus=null; pl.ov={x:X,y:Y}; await this.gain(pl); return; }
    const dd=Math.hypot(X-o.x,Y-o.y); const dur=this.D(620)*clamp(dd/18,0.8,1.6);
    const h=this.passH(o,{x:X,y:Y,side:s},dd);
    this.onCaption('THROUGH BALL','set');
    await this.launch(o,{home:pl,dur,h:Math.max(h,0.25),onRelease:()=>{ pl.ov={x:X,y:Y}; pl.hurry=true;
      back.forEach((q,i)=>{ q.ov=null; q.trail={p:pl,ahead:1.2,dy:(q.y<pl.y?-1:1)*(1.2+i*0.5)}; });
      if(gk) gk.ov={x:clamp(gx-dir*7.5,1,104),y:lerp(34,Y,0.35)}; this.focus=pl; }});
    this.focus=null;
    this.onCaption('BREAKAWAY','set'); this.hype=Math.max(this.hype,0.7);
    o.ov=null; }
  /* ---------- signature celebrations ---------- */
  async celebrate(sc,s){
    const gx=s===0?105:0, dir=s===0?1:-1; const type=(this.celebFor&&this.celebFor(sc.pid))||'classic'; const def=(typeof CELEB_BY!=='undefined'&&CELEB_BY[type])||{n:'Celebration'};
    this.focus=sc; this.zoomTo(0.66);
    // towards the near touchline, where the cameras and the home crowd are
    let cx=clamp(gx-dir*9,8,97), cy=63.2;
    if(type==='flag'){ cx=gx-dir*1.6; cy=66.2; }
    if(type==='kneeslide'){ cx=clamp(gx-dir*15,8,97); cy=58.5; }
    if(type==='airplane'){ cx=clamp(gx-dir*14,8,97); }
    sc.celeb=true; sc.celebType=type; sc.celebT=null; sc.ov={x:cx,y:cy}; sc.hurry=true; sc.glide=null;
    let k=0; for(const q of this.players.values()){ if(q===sc||q.off) continue;
      if(q.side!==s&&!q.gk){ const [bx,by]=this.base(q); q.trail=null; q.ov={x:lerp(q.x,bx,0.5),y:lerp(q.y,by,0.5)}; q.sad=true; q.slow=true; }
      else if(q.side===s&&!q.gk){ q.celeb=true; q.celebType='mob'; q.ov={x:lerp(q.x,cx,0.55),y:lerp(q.y,cy,0.55)}; k++; } }
    const reach=type==='kneeslide'?1.6:0.9;
    await this.until(()=>dist2(sc,sc.ov||{x:cx,y:cy})<reach, this.eta(sc,cx,cy,1.5)+500);
    if(type==='kneeslide'&&!this.rm){ // drops to his knees at full speed and slides along the turf
      const ux=dir*-0.35, uy=1, ul=Math.hypot(ux,uy); sc.ov=null; sc.glide={vx:ux/ul*7.5, vy:uy/ul*7.5}; }
    sc.hurry=false; sc.celebT=this.now; if(type!=='kneeslide') sc.ov={x:sc.x,y:sc.y};
    this.onCaption(String(def.n||'').toUpperCase(),'celeb'); this.hype=Math.max(this.hype,0.9);
    await this.wait(this.rm?300:this.D(type==='backflip'?1250:type==='kneeslide'?1150:1000));
    // teammates arrive and mob him
    const fx=sc.x, fy=Math.min(sc.y,65.5); let i=0; const mates=[...this.players.values()].filter(q=>q!==sc&&!q.off&&q.side===s&&!q.gk).sort((a,b)=>dist2(a,sc)-dist2(b,sc));
    for(const q of mates){ const a=(i/Math.max(1,mates.length))*Math.PI*2+0.4; const r=i<4?1.25:2.2; q.ov={x:clamp(fx+Math.cos(a)*r,1,104),y:clamp(fy+Math.sin(a)*r*0.75,2,67)}; q.hurry=i<4; i++; }
    await this.wait(this.rm?400:this.D(1500));
    for(const q of mates) q.hurry=false;
  }
  async restartAfterGoal(side){
    const gk=this.gkOf(side); this.focus=null; this.zoomTo(1);
    for(const q of this.players.values()){ q.celeb=false; q.celebType=null; q.celebT=null; q.glide=null; q.sad=false; q.slow=false; q.hurry=false; q.ov=null; q.trail=null; }
    const {spots,ks}=this.kickoffSpots(side);
    // everyone jogs back to his kickoff spot while the ball is fetched
    for(const [p,t] of spots){ if(p!==gk&&p!==ks) { p.ov={...t}; } }
    if(gk && this.inNet){ await this.fetch(gk,true); this.inNet=null;
      const dir=side===0?1:-1; await this.carry(gk,gk.x+dir*4,34+(gk.y>34?3:-3),400);
      const back=this.nearest(side,gk.x+dir*14,gk.y,true,ks); if(back){ back.ov={x:gk.x+dir*14,y:gk.y+(gk.y>34?6:-6)}; await this.wait(this.D(200)); await this.pass(gk,back,1.0); back.ov=null; if(ks){ ks.ov={...spots.get(ks)}; await this.pass(back,ks); } else gk.ov=null; if(spots.get(back)) back.ov={...spots.get(back)}; } }
    else if(ks){ this.inNet=null; await this.gain(ks); }
    if(gk) gk.ov={...spots.get(gk)};
    if(ks){ if(this.own!==ks) await this.gain(ks); await this.dribble(ks,spots.get(ks).x,34,700); }
    const holder=this.own; this.kickoffShape(side); if(holder&&holder===ks) this.own=ks;
    await this.tapOff();
  }
  async finish(e,pl){
    const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const gk=this.gkOf(1-s);
    if(this.own!==pl) await this.gain(pl); const brk=e.ty==='break'&&pl.hurry; pl.hurry=false;
    const header=this.headBall===pl||this.ball.z>1.2;
    if(!header&&this.ball.z<1 && Math.abs(pl.x-gx)>30 && e.ty!=='fk'){ const X=gx-dir*(e.ty==='long'?25:16); pl.ov={x:X,y:lerp(pl.y,34,0.4)}; await this.until(()=>Math.abs(pl.x-gx)<=Math.abs(X-gx)+1, this.eta(pl,X,pl.y)+400); }
    let ty=34+(Math.random()<.5?-1:1)*(0.5+Math.random()*2.75);
    const offPost=!header&&e.ty!=='pen'&&e.ty!=='tapin'&&Math.random()<0.08; if(offPost) ty=Math.random()<.5?GF.y0+0.24:GF.y1-0.24; /* in off the post */
    // tz is the underside of the ball as it crosses the line: the whole ball always passes under the bar and inside the posts
    const tz= header? 0.4+Math.random()*1.15 : e.ty==='long'||e.ty==='fk'? 0.6+Math.random()*1.15 : Math.random()*1.25;
    if(e.ty==='pen'){ const r=await this.penStrike(pl,gk,'goal',{gx,dir}); if(this.relabel) e.ty='pen';
      this.inNet={gx,dir}; this.ball.ing=gx; this.bulge={gx,dir,y:r.to.y,z:Math.min(r.to.z,2.1),t:this.now}; this.flash=1; this.hype=1; this.shake=this.rm?0:1; this.popBulbs(); this.burst(s);
      this.emit(e); const settle=this.startFree(this.lastVel||{x:dir*20,y:0,z:0},{max:2600}); await Promise.race([settle,this.wait(this.D(420)+120)]);
      if(gk){ this.wait(this.D(700)).then(()=>{ gk.dive=null; }); } return; }
    if(e.ty==='fk'){ const [X,Y]=[this.ball.x,this.ball.y]; pl.ov={x:X-dir*2.4,y:Y+0.8}; await this.wait(this.D(300)); pl.ov={x:X-dir*0.5,y:Y-0.18}; await this.until(()=>Math.hypot(pl.x-pl.ov.x,pl.y-pl.ov.y)<0.4, this.D(500)+200); }
    if(!header && e.ty!=='pen' && e.ty!=='fk') this.stageSpace(e,pl);
    this.zoomTo(0.72);
    const wind=header?0:this.windOf('shot');
    const dur=this.D(header?430:e.ty==='long'?560:e.ty==='tapin'?240:380)+90;
    /* the keeper times his dive so he is fully stretched as the ball arrives, not lying on the turf waiting for it */
    if(gk){ const wrong=Math.random()<0.6; gk.dive={dir:(wrong?-1:1)*(Math.sign(ty-34)||1),t:this.now+wind+Math.max(this.D(60),dur-Math.max(150,this.D(250)))}; gk.ov=brk?{x:clamp(gx-dir*3.4,1,104),y:lerp(34,pl.y,0.35)}:{x:gx-dir*0.7,y:34+(wrong?-1:0.6)*(ty-34)*0.7}; }
    const shownPre=this.relabel?this.shownType(e,pl,header,Math.abs(pl.x-gx)):null;
    const sTo={x:gx+dir*0.3,y:ty,z:Math.min(tz,1.85)}; const h0=header?0.1:e.ty==='fk'?1.6:e.ty==='long'?1.1:0.25;
    await this.launch(pl,{to:sTo,dur,h:h0,hFn:header||e.ty==='fk'?null:()=>this.shotH(s,sTo,h0),kind:'shot',nod:header});
    if(this.relabel) e.ty=shownPre;
    if(offPost){ this.hitWood(16); const lv=this.lastVel; if(lv){ lv.y=(ty<34?1:-1)*Math.abs(lv.x)*0.42; lv.x*=0.72; } this.onCaption('IN OFF THE POST!','set'); }
    // the whole ball is over the line: GOAL. It carries on into the net, which catches it.
    this.inNet={gx,dir}; this.ball.ing=gx; this.bulge={gx,dir,y:ty,z:Math.min(tz,2.1),t:this.now}; this.flash=1; this.hype=1; this.shake=this.rm?0:1; this.popBulbs(); this.burst(s);
    this.emit(e);
    const settle=this.startFree(this.lastVel||{x:dir*20,y:0,z:0},{max:2600});
    await Promise.race([settle,this.wait(this.D(420)+120)]);
    if(gk){ const t=this.now; this.wait(500).then(()=>{ if(gk.dive&&gk.dive.t<=t+400) gk.dive=null; }); }
  }
  async setupCorner(e,pt){
    this.setPiece='corner';
    const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const [cx,cy]=livePos(s,pt.x,pt.y); const cornerY= cy<34?0.6:67.4; const cornerX= gx-dir*0.6;
    const o=this.clip&&this.placed?null:this.own;
    if(o&&o.side===s){ const df=this.nearest(1-s,gx-dir*9,34); if(df){ df.ov={x:gx-dir*7,y:34+(cornerY<34?-6:6)}; await this.launch(o,{home:df,dur:this.D(520),h:0.6}); await this.launch(df,{to:{x:gx+dir*1.0,y:cornerY<34?6:62,z:0.6},dur:this.D(520),h:1.6,kind:'clear',cont:true}); df.ov=null; } }
    else if(o){ await this.launch(o,{to:{x:gx+dir*1.0,y:cornerY<34?7:61,z:0.5},dur:this.D(700),h:2.4,kind:'clear',cont:true}); }
    this.onCaption('CORNER','set');
    const taker=this.pl(pt.pid); if(!taker) return;
    if(!(this.clip&&this.own===taker&&this.placed)){ await this.fetch(taker,true); await this.carry(taker,cornerX,cornerY,700);
    await this.place(taker,cornerX,cornerY,cornerX+dir*0.9,cornerY+(cornerY<34?-0.7:0.7)); }
    // pack the box
    let a=0,d=0; for(const q of this.players.values()){ if(q===taker||q.off||q.gk) continue; if(q.side===s&&a<5){ q.ov={x:gx-dir*(6+Math.random()*7),y:28+Math.random()*12}; a++; } else if(q.side!==s&&d<6){ q.ov={x:gx-dir*(3+Math.random()*7),y:29+Math.random()*10}; d++; } }
    await this.wait(this.D(700)+200);
  }
  async setupDeadBall(e,pt){
    const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const taker=this.pl(pt.pid); if(!taker) return; this.setPiece=e.ty==='pen'?'pen':'fk';
    const pen=e.ty==='pen'; const [X,Y]= pen? [gx-dir*11,34] : livePos(s,pt.x,pt.y);
    const ready=this.clip&&this.own===taker&&this.placed;
    if(!ready){ await this.gain(taker);
    await this.dribble(taker,X-dir*1.5,Y+(pen?2:0),450);
    const df=this.nearest(1-s,taker.x,taker.y); if(df){ df.chase=taker; await this.until(()=>dist2(df,taker)<1.5, this.D(700)+300); df.chase=null; }
    taker.fallT=this.now; if(this.sfx) Sound.whistle('card'); }
    this.onCaption(pen?'PENALTY!':'FREE KICK','set'); this.ref.ov={x:X-dir*4,y:Y+5};
    if(!ready){ await this.wait(this.D(500));
    await this.carry(taker,X,Y,500); await this.place(taker,X,Y,X-dir*2.4,Y+0.8); }
    if(pen){ for(const q of this.players.values()){ if(q===taker||q.off) continue; if(q.gk&&q.side!==s){ q.ov={x:gx-dir*0.3,y:34}; continue; } if(q.gk) continue; q.ov={x:gx-dir*(19+Math.random()*5),y:16+Math.random()*36}; } }
    else { const walls=[...this.players.values()].filter(q=>q.side!==s&&!q.gk&&!q.off).sort((a,b)=>dist2(a,taker)-dist2(b,taker)).slice(0,4); const vx=gx-X, vy=34-Y, vl=Math.hypot(vx,vy)||1; walls.forEach((q,i)=>{ q.ov={x:X+vx/vl*9.15+(-vy/vl)*(i-1.5)*0.75,y:Y+vy/vl*9.15+(vx/vl)*(i-1.5)*0.75}; }); }
    this.ref.ov=null; await this.wait(this.D(900)+200);
  }
  /* ---------- penalties: walk back, hands on hips, the whistle, a run-up (sometimes a stutter), the keeper guessing ---------- */
  woodTarget(wood,gx,dir,side){ if(wood==='post'){ const py=side<0?GF.y0:GF.y1; return {x:gx-dir*0.06,y:py+side*0.17,z:0.25+Math.random()*1.3}; } return {x:gx-dir*0.11,y:34+side*(0.4+Math.random()*2.6),z:GF.H+0.04-BALL_R}; }
  async penStrike(k,gk,res,o){ const gx=o.gx, dir=o.dir, X=this.ball.x, Y=this.ball.y; this.setPiece='pen'; this.zoomTo(o.so?0.5:0.56); this.focus={x:X+dir*3.5,y:34};
    const lf=(hashStr(String(k.pid))%5===0)?-1:1; /* one in five strikes it with his left */
    if(gk){ gk.dive=null; gk.ov={x:gx-dir*0.35,y:34}; gk.penReady=true; this.look(gk,X,Y,this.D(9000)+4000); }
    const back=3.9+Math.random()*1.4, off=1.4+Math.random()*1.3; const sx=X-dir*back, sy=Y-dir*lf*off;
    k.ov={x:sx,y:sy}; k.slow=true; this.look(k,X,Y,this.D(4000)+2000);
    await this.until(()=>dist2(k,{x:sx,y:sy})<0.45, this.eta(k,sx,sy,0.45)+500); k.slow=false; k.hipsHands=true; this.look(k,gx,34,this.D(3000)+1500);
    if(this.sfx&&typeof Sound!=='undefined'&&Sound.hush) Sound.hush(true);
    await this.wait(this.D(650)+150); if(this.sfx&&typeof Sound!=='undefined') Sound.whistle('pen');
    await this.wait(this.D(320)+80); k.hipsHands=false;
    const side=Math.random()<.5?-1:1; const panenka=res==='goal'&&!o.noChip&&Math.random()<0.07; const high=Math.random()<0.33; let to=null, wood=null;
    if(res==='goal') to= panenka? {x:gx+dir*0.3,y:34+(Math.random()-.5)*0.9,z:0.9+Math.random()*0.6} : {x:gx+dir*0.3,y:34+side*(1.7+Math.random()*1.65),z:high?1.25+Math.random()*0.6:Math.random()*0.45};
    else if(res==='miss'){ const q=Math.random(); if(q<0.24) wood='post'; else if(q<0.4) wood='bar'; to= wood? this.woodTarget(wood,gx,dir,side) : q<0.66? {x:gx+dir*0.4,y:34+side*(1+Math.random()*2),z:2.8+Math.random()*0.7} : {x:gx+dir*0.4,y:34+side*(4.15+Math.random()*1.3),z:Math.random()*0.5}; }
    /* the run-up: a curved approach onto the ball, sometimes with a stutter step to freeze the keeper */
    const cx=X-dir*0.55, cy=Y-dir*lf*0.2; k.ov={x:cx,y:cy}; this.look(k,X,Y,this.D(2000)+800);
    if(Math.random()<0.24){ await this.until(()=>dist2(k,{x:cx,y:cy})<1.6, this.eta(k,cx,cy)+300); k.plant=true; await this.wait(this.D(260)+60); k.plant=false; }
    await this.until(()=>dist2(k,{x:cx,y:cy})<0.42, this.eta(k,cx,cy)+300);
    const ts0=this.ts; const slow=!this.rm&&!o.fast; if(slow) this.ts=ts0*1.45;
    let parry=false;
    let gd=0; if(gk){ if(res==='save'){ gd=side; parry=Math.random()<0.5; } else if(res==='goal'){ gd= panenka? (Math.random()<.5?-1:1) : (Math.random()<0.68?-side:side); } else gd=Math.random()<.5?-side:side; }
    const tStart=this.now; const pt=res==='save'&&parry?{x:gx-dir*0.7,y:34+side*2.15,z:0.55+Math.random()*0.7}:null;
    const lp= res==='save'&&gk&&!parry? this.launch(k,{home:gk,hands:true,dur:this.D(360)+60,h:0.3,kind:'shot'})
      : res==='save'? this.launch(k,{home:gk,hands:true,dur:this.D(330)+60,h:0.25,kind:'shot'})
      : this.launch(k,{to,dur:this.D(panenka?620:300)+60,h:panenka?0.9:0.25,kind:'shot',cont:res!=='goal'});
    /* the keeper goes as the boot meets the ball (a fraction early when he has guessed; and for a chip he has already gone) */
    await this.until(()=>k.kickT>=tStart&&this.now>=k.kickT+(k.kickW||0)-(panenka?this.D(160):this.D(25)), this.D(1600)+400);
    if(gk){ gk.penReady=false; gk.dive={dir:gd,t:this.now,catch:res==='save'&&!parry}; gk.ov={x:gx-dir*0.55,y:34+gd*(res==='save'?2:2.3)}; }
    await lp;
    if(res==='save'&&parry){ if(this.own===gk){ this.own=null; this.hands=false; } this.startFree({x:-dir*(10+Math.random()*6),y:side*(9+Math.random()*7),z:5+Math.random()*4},{max:2200}); }
    this.ts=ts0; if(this.sfx&&typeof Sound!=='undefined'&&Sound.hush) Sound.hush(false);
    if(res==='save'&&gk){ const g2=gk; this.wait(this.D(500)+150).then(()=>{ g2.fistT=this.now; }); }
    if(res==='miss'&&wood&&this.sfx&&typeof Sound!=='undefined') Sound.ooh(1);
    this.setPiece=null; this.focus=null;
    return {to:to||{x:gx,y:34,z:1},wood,parry,panenka}; }
  /* a penalty that is saved or missed during play: the foul, the set-up and the kick, then play goes on */
  async penNoGoal(e,p){ const s=e.s, dir=s===0?1:-1, gx=s===0?105:0; const gk=this.gkOf(1-s);
    await this.setupDeadBall({...e,ty:'pen'},{pid:p.pid});
    const r=await this.penStrike(p,gk,e.t==='save'?'save':'miss',{gx,dir});
    this.emit(e); this.onCaption(e.t==='save'?(r.parry?'SAVED! PARRIED AWAY':'SAVED!'):r.wood==='post'?'OFF THE POST!':r.wood==='bar'?'OFF THE BAR!':'MISSED!','shot'); this.hype=Math.max(this.hype,0.5);
    p.sad=true; await this.wait(this.D(700)+200); p.sad=false; this.clearStaged();
    if(e.t==='save'&&gk&&this.own===gk){ await this.wait(this.D(300)); gk.dive=null; gk.ov=null; await this.distribute(gk); return; }
    if(gk) gk.dive=null;
    if(e.t==='save'){ /* a parry: the nearest defender gets there first and clears */ const d=this.nearest(1-s,this.ball.x,this.ball.y); if(d){ await this.fetch(d); if(this.own===d){ await this.launch(d,{to:{x:clamp(d.x+(-dir)*30,10,95),y:clamp(d.y+(Math.random()-.5)*20,6,62),z:0},dur:this.D(900),h:3,kind:'clear',cont:true}); } } if(gk) gk.ov=null; return; }
    if(gk) gk.ov=null; await this.goalKick(1-s); }
  /* ---------- shootout ---------- */
  soArrange(){ this.soInit=true; let i=0,j=0;
    for(const p of this.players.values()){ p.dive=null; p.celeb=false; p.sad=false; p.chase=null; p.meet=null; if(p.off) continue;
      if(p.gk){ p.soSpot={x:95.5,y:p.side===0?21:47}; }
      else { const k=p.side===0?i++:j++; p.soSpot={x:52.5+(p.side===0?-1:1)*(1.3+(k%5)*1.25), y:32.4+Math.floor(k/5)*2.3}; }
      p.ov={...p.soSpot}; } }
  async shootoutSetup(){
    this.so=true; this.skip=false; this.ts=this.goalTs; this.zoomTo(0.6); this.focus=null; this.soArrange();
    const o=this.own; if(o&&!o.off){ this.hands=true; o.ov={x:89,y:34}; }
    this.ref.ov={x:88.5,y:39};
    await this.until(()=>!o||Math.hypot(o.x-89,o.y-34)<1, this.D(2400)+600);
    await this.wait(this.D(400));
  }
  /* ---------- shootout ---------- */
  async soKick(ev){
    this.so=true; this.skip=false; this.ts=this.goalTs; this.zoomTo(0.6);
    const kicker=this.pl(ev.pid); const gk=this.pl(ev.gk); if(!kicker){ this.emit(ev); return; }
    if(!this.soInit) this.soArrange();
    this.ref.ov={x:88.5,y:39};
    for(const p of this.players.values()){ if(p.gk&&p!==gk&&!p.off){ p.ov={x:95.5,y:21}; } }
    if(gk){ gk.ov={x:104.5,y:34}; }
    kicker.ov={x:90,y:31}; kicker.hurry=true; await this.until(()=>dist2(kicker,{x:90,y:31})<2, this.eta(kicker,90,31,1.5)+300); kicker.hurry=false;
    // the ball comes to the kicker from whoever holds it
    if(this.own!==kicker){ const o=this.own; if(o){ if(!this.hands) this.hands=true; await this.launch(o,{home:kicker,hands:true,dur:this.D(560),h:1.4}); if(o!==gk&&o.soSpot) o.ov={...o.soSpot}; } else { await this.fetch(kicker,true); } }
    await this.carry(kicker,94,34,500); await this.place(kicker,94,34,91.6,33);
    await this.until(()=>!gk||dist2(gk,{x:104.5,y:34})<0.8, this.D(2600)+800); // keeper set on his line
    const r=await this.penStrike(kicker,gk,ev.res,{gx:105,dir:1,so:true});
    if(ev.res==='goal'){ this.bulge={gx:105,dir:1,y:r.to.y,z:r.to.z,t:this.now}; this.inNet={gx:105,dir:1}; this.ball.ing=105; this.hype=0.8; this.flash=0.4; this.popBulbs(); this.emit(ev); const settle=this.startFree(this.lastVel||{x:20,y:0,z:0},{max:2400}); await Promise.race([settle,this.wait(this.D(300))]); }
    else this.emit(ev);
    this.onCaption(ev.res==='goal'?(r.panenka?'PANENKA!':'SCORED'):ev.res==='save'?'SAVED':r.wood==='post'?'OFF THE POST':r.wood==='bar'?'OFF THE BAR':'MISSED', ev.res==='goal'?'good':'bad');
    if(ev.res==='goal') kicker.celeb=true; else kicker.sad=true;
    await this.wait(this.D(650)+200);
    kicker.celeb=false; kicker.sad=false; kicker.ov=kicker.soSpot?{...kicker.soSpot}:null;
    // the keeper collects the ball for the next kick
    if(gk&&this.own!==gk){ gk.dive=null; await this.fetch(gk,true); this.inNet=null; }
    if(gk){ gk.dive=null; gk.ov={x:104.5,y:34}; }
  }
  /* final whistle: play stops, the winners gather and celebrate, the losers trudge off; a draw ends in a handshake line */
  fullTime(w){ this.cancelSeq=true; this.ft=true; this.focus=null; this.pendingKick=null; this.so=false;
    if(this.fl){ this.fl.res(); this.fl=null; } this.inNet=null; this.ball.ing=null; this.placed=false; this.own=this.ref; this.hands=true;
    this.ref.ov={x:52.5,y:30.5}; const dirW=w===0?1:-1; const hx=w===-1?52.5:52.5+dirW*14; let i=0,j=0;
    for(const p of this.players.values()){ if(p.off) continue; p.chase=null; p.meet=null; p.dive=null; p.slideT=-9e9; p.celeb=false; p.sad=false; p.slow=false;
      if(w===-1){ const k=p.side===0?i++:j++; p.ov={x:52.5+(p.side===0?-1.3:1.3), y:24+k*1.9}; }
      else if(p.side===w){ const k=i++; const a=k/11*Math.PI*2; p.ov={x:hx+Math.cos(a)*(p.gk?4:2.4), y:34+Math.sin(a)*(p.gk?4:2.4)}; p.celeb=true; }
      else { const k=j++; const [bx,by]=this.base(p); p.ov={x:lerp(p.x,bx,0.35),y:lerp(p.y,by,0.35)}; p.sad=!p.gk; p.slow=true; } }
    this.zoomTo(w===-1?0.9:1.1); this.focus=w===-1?{x:52.5}:{x:hx}; this.hype=w===-1?0.3:1; if(w!==-1) this.burst(w); }
  halftime(){ for(const p of this.players.values()) p.card=null; this.kickoffShape(1); this.snap(); }
  zoomTo(f){ this.zoom=f; this.cam.tw=this.bw*f*(this.v184K?this.v184K():1); }
  burst(side){ if(this.rm) return; const cols=side===0?[this.h.c1,this.h.c2,'#ffd36b']:[this.a.c1,this.a.c2,'#ffd36b']; for(let i=0;i<150;i++) this.conf.push({x:this.W*(0.1+Math.random()*0.8),y:-10-Math.random()*this.H*0.4,vx:(Math.random()-.5)*60,vy:60+Math.random()*120,r:Math.random()*6.28,vr:(Math.random()-.5)*8,c:cols[i%cols.length],life:3+Math.random()*1.5,w:5+Math.random()*5}); }
  popBulbs(){ if(this.rm) return; for(let i=0;i<40;i++) this.bulbs.push({x:-20+Math.random()*145,row:Math.random()*7,t:this.now+Math.random()*900}); }
  /* the goal is described the way the broadcast showed it */
  shownType(e,pl,header,d){ const sp=this.setPiece; if(sp==='pen'||sp==='fk') return sp; if(sp==='corner') return 'corner'; if(header) return 'header';
    const lp=this.lastPass; const crossed=lp&&lp.to===pl&&lp.h>2&&(lp.fy<18||lp.fy>50)&&this.now-lp.t<5000; if(crossed) return d<7?'tapin':'cross';
    const run=this.ownSince&&this.ownSince.p===pl? Math.hypot(pl.x-this.ownSince.x,pl.y-this.ownSince.y):0;
    if(run>=16) return e.ty==='break'?'break':'solo'; if(d>=20) return 'long'; if(d<6.5) return 'tapin'; return e.ty==='break'?'break':'open'; }
  /* ---------- motion ---------- */
  update(dt){
    const b=this.ball, now=this.now;
    if(this.own!==this._lastOwn){ this._lastOwn=this.own; this.ownSince=this.own?{p:this.own,x:this.own.x,y:this.own.y}:null; }
    if(this.wx) this.updWeather(dt);
    // waiters
    if(this.waiters.length){ const keep=[]; for(const w of this.waiters){ if(w.cond()||now>=w.dl) w.res(); else keep.push(w); } this.waiters=keep; }
    // ball
    const px=b.x, py=b.y;
    if(this.fl&&this.fl.phys) this.stepFree(dt);
    else if(this.fl){ const f=this.fl; const t=clamp((now-f.t0)/f.dur,0,1); const live=this.flightTarget(f);
      const w=f.aim? smooth((t-0.3)/0.7) : 1; const tx=f.aim?lerp(f.aim.x,live.x,w):live.x, ty=f.aim?lerp(f.aim.y,live.y,w):live.y;
      const e=this.flE(f,t); b.x=lerp(f.from.x,tx,e); b.y=lerp(f.from.y,ty,e); b.z=Math.max(0,lerp(f.from.z,live.z||0,t)+(f.ground?0:f.h)*4*t*(1-t)); if(t>=1) this.land(); }
    else if(this.own&&this.placed){ /* a dead ball sits on its spot until it is struck */ }
    else if(this.own){ const o=this.own; let t;
      if(this.hands) t=this.handsOf(o);
      else if(this.headBall===o) t=this.headOf(o); /* met in the air: it stays on his head for the instant before he nods it on */
      else { t=this.footOf(o); const sp=(o.spd||0)/Math.max(1,this.spdMul||1), mv=Math.hypot(o.vx||0,o.vy||0);
        // close control: every couple of strides he knocks it a yard ahead and runs onto it (dribLead; v18.4 syncs it to the stride)
        const lead=this.dribLead(o,sp,dt,now);
        if(mv>0.6&&lead>0){ const ux=o.vx/mv, uy=o.vy/mv; t={x:t.x+ux*lead, y:t.y+uy*lead, z:0}; }
        const f0=this.footOf(o), ex=t.x-f0.x, ey=t.y-f0.y, el=Math.hypot(ex,ey); if(el>1.3){ t.x=f0.x+ex/el*1.3; t.y=f0.y+ey/el*1.3; } }
      // the ball travels with him (feed-forward of his own motion) and is steered onto the foot, never jumping
      b.x+=(o.vx||0)*dt; b.y+=(o.vy||0)*dt; const k=Math.min(1,dt*22); b.x+=(t.x-b.x)*k; b.y+=(t.y-b.y)*k; b.z+=(t.z-b.z)*k;
      const ex=b.x-t.x, ey=b.y-t.y, ed=Math.hypot(ex,ey), cap=1.1; if(ed>cap){ b.x=t.x+ex/ed*cap; b.y=t.y+ey/ed*cap; }
      if(!this.hands){ const f0=this.footOf(o), fx=b.x-f0.x, fy=b.y-f0.y, fd=Math.hypot(fx,fy); if(fd>1.4){ b.x=f0.x+fx/fd*1.4; b.y=f0.y+fy/fd*1.4; } }
      // a lofted ball that drops onto his foot is cushioned with a little bounce
      if(!this.hands&&this.cush&&this.cush.p===o){ const u=(now-this.cush.t)/Math.max(80,this.D(380)); if(u<1) b.z=Math.abs(Math.sin(u*Math.PI*2))*0.35*(1-u); else this.cush=null; } }
    this.updNet(dt);
    b.spin+=Math.hypot(b.x-px,b.y-py)*1.6;
    this.trail.push([b.x,b.y,b.z]); if(this.trail.length>12) this.trail.shift();
    // targets
    const ps=this.poss; const carrier=this.own&&!this.hands?this.own:null; const OL=ps!=null&&!this.so&&this.players.size>12?this.offLine(ps):null;
    let presser=null; if(carrier&&!this.so&&!this.demoCalm){ presser=this.nearest(1-carrier.side,b.x,b.y); }
    for(const p of this.players.values()){
      if(p.chase){ const c=p.chase.ball? b : p.chase; p.tx=c.x; p.ty=c.y; continue; }
      if(p.ov){ p.tx=p.ov.x; p.ty=p.ov.y+(p.penReady?Math.sin(now/290+(p.seed||0))*0.5:0); continue; }
      /* chasing a runner: aim goal-side of him, at normal pace, so a sprinting attacker pulls clear */
      if(p.trail){ const T=p.trail, d=T.p.side===0?1:-1; p.tx=clamp(T.p.x+d*T.ahead,1,104); p.ty=clamp(T.p.y+T.dy,2,66); continue; }
      if(p.meet){ p.tx=p.meet.x; p.ty=p.meet.y; continue; }
      if(p.off) continue;
      const dir=p.side===0?1:-1; const [x,y]=this.base(p);
      if(p.gk){ const gx=p.side===0?1.5:103.5; p.tx=gx+dir*clamp(Math.abs(b.x-gx)*0.05,0,5); p.ty=clamp(34+(b.y-34)*0.3,29,39); continue; }
      const push=p.side===ps? dir*7 : -dir*4;
      p.tx=clamp(x+(b.x-52.5)*0.55+push+Math.sin(now/1500+p.seed)*1.2,2,103); p.ty=clamp(y+(b.y-34)*0.33+Math.cos(now/1800+p.seed)*1.0,2,66);
      /* attackers hold their runs on the offside line instead of loitering beyond it */
      if(OL!=null&&p.side===ps){ p.tx=p.side===0?Math.min(p.tx,OL-0.7):Math.max(p.tx,OL+0.7); }
    }
    if(carrier&&!carrier.ov&&!carrier.chase){ const dir=carrier.side===0?1:-1; carrier.tx=clamp(carrier.x+dir*2,3,102); carrier.ty=carrier.y; }
    if(presser&&!presser.ov&&!presser.chase){ const d=presser.side===0?-1:1; presser.tx=b.x+d*1.8; presser.ty=b.y; }
    const sp=clamp(Math.pow(1/this.ts,0.8),1,6); const vmax=7.2*sp; this.spdMul=sp;
    const movers=[...this.players.values(),this.ref,...this.ars];
    for(const a of this.ars){ if(a.flag&&now-a.flagT>Math.max(900,this.D(1700))) a.flag=null; if(a.flag==='up'){ a.tx=a.x; } else a.tx=clamp(this.offLine(a.att),a.x0,a.x1); a.ty=a.y0; }
    // referee keeps up with play from a distance
    const r=this.ref; if(r.ov){ r.tx=r.ov.x; r.ty=r.ov.y; } else { r.tx=clamp(b.x-(b.x>52.5?9:-9),8,97); r.ty=clamp(b.y+(b.y<34?12:-12),6,62); }
    // steering: accelerate toward the target, ease in on arrival, jog when only holding shape
    for(const p of movers){
      const pvx=p.vx||0, pvy=p.vy||0;
      if(p.glide){ // a knee slide: momentum only, friction brings him to rest
        const g2=p.glide; const v0=Math.hypot(g2.vx,g2.vy); const nv=Math.max(0,v0-6.2*sp*dt); if(v0>0){ g2.vx*=nv/v0; g2.vy*=nv/v0; }
        p.x=clamp(p.x+g2.vx*sp*dt,1,104); p.y=clamp(p.y+g2.vy*sp*dt,2,67); p.vx=g2.vx*sp; p.vy=g2.vy*sp; p.spd=nv*sp; if(nv<=0.05){ p.glide=null; p.vx=0; p.vy=0; p.spd=0; p.ov={x:p.x,y:p.y}; p.knelt=true; }
        p.tx=p.x; p.ty=p.y; this.turn(p,dt,sp); continue; }
      const wpt=this.detour(p); if(wpt){ p.tx=wpt.x; p.ty=wpt.y; } const dx=p.tx-p.x, dy=p.ty-p.y; const d=Math.hypot(dx,dy);
      const urgent=!!(p.chase||p.ov||p.meet||p.trail||p===this.own||p===presser||p.ref);
      const v=vmax*(p.upT&&now-p.upT<this.D(650)?0.2:1)*(p.chase?1.4:1)*(p.slow?0.45:1)*(p.celeb?1.3:1)*(p.hurry?1.5:1)*(p===this.own&&!this.hands?0.88:1)*(p.ref&&!p.ar?0.85:1)*(p.plant?0.22:1)*(urgent?1:0.62);
      const want=this.v17want?this.v17want(p,v,d,sp,urgent):Math.min(v, d*2.6*sp); const wx=d>0.01?dx/d*want:0, wy=d>0.01?dy/d*want:0;
      p.vx=pvx; p.vy=pvy; const acc=v*(p.chase?5:3.6)*dt; let ax=wx-p.vx, ay=wy-p.vy; const al=Math.hypot(ax,ay); if(al>acc){ ax*=acc/al; ay*=acc/al; }
      p.vx+=ax; p.vy+=ay; let mx=p.vx*dt, my=p.vy*dt; const ml=Math.hypot(mx,my); if(ml>d&&!p.chase){ mx=dx; my=dy; p.vx*=0.5; p.vy*=0.5; }
      if(this.netBlock(p.x,p.y,p.x+mx,p.y+my)){ mx=0; my=0; p.vx=0; p.vy=0; }
      p.x+=mx; p.y+=my; const m=Math.hypot(mx,my); const ps=p.spd||0; p.spd=m/(dt||0.016);
      // stride: cadence rises with speed, so a jog takes short quick steps and a sprint long ones
      const real=p.spd/sp; p.gv=(p.gv||0)+(real-(p.gv||0))*Math.min(1,dt*9); p.ph+=m*2*Math.PI/gaitOf(p.gv,sp).cw;
      if(this.sfx&&real>3.2&&!p.ref){ const kk=Math.floor(p.ph/Math.PI); if(kk!==p.stepK){ p.stepK=kk; if(p===this.own||Math.abs(p.x-b.x)+Math.abs(p.y-b.y)<9) this.snd('step',real/8); } }
      if(p.dive&&!p.diveSnd&&now>=p.dive.t){ p.diveSnd=1; this.snd('dive'); } else if(!p.dive) p.diveSnd=0;
      // forward acceleration along his heading, for leaning into a sprint and sitting back when braking
      const hy=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, hx=Math.cos(hy), hz=Math.sin(hy); const fwd=p.vx*hx+p.vy*hz, pf=pvx*hx+pvy*hz; p.acS=(p.acS||0)+(((fwd-pf)/(dt||0.016))/sp-(p.acS||0))*Math.min(1,dt*6);
      this.turn(p,dt,sp); }
    for(const p of this.players.values()){ if(!p.gk||!p.dive||now<p.dive.t) continue; const h=this.handsOf(p); if(p.x>52.5&&h.x>104.72) p.x-=h.x-104.72; else if(p.x<52.5&&h.x<0.28) p.x+=0.28-h.x; }
    // personal space: players holding shape never stand inside one another
    const ps2=[...this.players.values()].filter(p=>!p.off&&!p.ov&&!p.chase&&p!==this.own);
    for(let a1=0;a1<ps2.length;a1++) for(let b1=a1+1;b1<ps2.length;b1++){ const P=ps2[a1], Q=ps2[b1]; const ex=Q.x-P.x, ey=Q.y-P.y, ed=Math.hypot(ex,ey); if(ed<1.25&&ed>0.001){ const k=(1.25-ed)*0.5*Math.min(1,dt*8); P.x-=ex/ed*k; P.y-=ey/ed*k; Q.x+=ex/ed*k; Q.y+=ey/ed*k; } }
    // the ball stays with its owner after everyone has moved (feet: within a stride, hands: firmly held)
    if(this.own&&!this.fl&&!this.placed){ const o=this.own; const t=this.hands?this.handsOf(o):this.headBall===o?this.headOf(o):this.footOf(o); const lim=this.hands?0.35:1.4; const ex=b.x-t.x, ey=b.y-t.y, ed=Math.hypot(ex,ey); if(ed>lim){ b.x=t.x+ex/ed*lim; b.y=t.y+ey/ed*lim; } if(this.hands) b.z=t.z; }
    // camera
    const c=this.cam; c.w+=(c.tw-c.w)*Math.min(1,dt*1.8); const fx=this.focus?this.focus.x:b.x+(this.own?(this.own.side===0?4:-4):0); const tx=this.so?92:clamp(fx,c.w*0.36,105-c.w*0.36); c.x+=(tx-c.x)*Math.min(1,dt*2.4);
    if(this.sfx&&now-(this._exT||0)>300&&typeof Sound!=='undefined'){ this._exT=now; let x=0; const o=this.own; if(o&&!o.gk){ const gx=o.side===0?105:0; const d=Math.abs(b.x-gx); x=d<32?(32-d)/32:0; if(Math.abs(b.y-34)<20) x*=1.15; } if(this.fl&&this.fl.kind==='shot') x=1; if(this.so) x=0.6; Sound.crowdExcite(Math.min(1,x+this.hype*0.6)); }
    this.flash=Math.max(0,this.flash-dt*1.6); this.hype=Math.max(0,this.hype-dt*0.22); this.shake=Math.max(0,this.shake-dt*2.5);
    for(const q of this.conf){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=40*dt; q.vx*=0.99; q.r+=q.vr*dt; q.life-=dt; } this.conf=this.conf.filter(q=>q.life>0&&q.y<this.H+20);
    this.bulbs=this.bulbs.filter(q=>now-q.t<220);
    if(this.turf&&this.turf.length){ const g2=dt*this.tk(); for(const q of this.turf){ q.x+=q.vx*g2; q.y+=q.vy*g2; q.z+=q.vz*g2; q.vz-=GRAV*g2; if(q.z<0){ q.z=0; q.vz=0; q.vx*=0.6; q.vy*=0.6; } q.life-=dt; } this.turf=this.turf.filter(q=>q.life>0); }
    /* a keeper landing from a dive throws up a little turf, once */
    for(const p of this.players.values()){ if(p.gk&&p.dive&&now-p.dive.t>200&&!p._landT){ p._landT=1; this.kickTurf(p.x,p.y,7,1.6); } if(!p.dive) p._landT=0; }
    if(!this.rm && Math.random()<dt*(0.6+this.hype*14)) this.bulbs.push({x:-20+Math.random()*145,row:Math.random()*7,t:now});
  }
  /* fixed-step simulation (120 Hz) with interpolated rendering: motion is the same at any frame rate, a dropped frame never
     launches anyone across the pitch, and returning from a background tab resumes from where it was instead of replaying a backlog */
  loop(ts){ if(!this.alive) return; if(!this.cv.isConnected){ this.destroy(); return; } const real=ts-this.t0; const step=Math.min(50,Math.max(0,real-this.lastReal)); this.lastReal=real;
    const H=1000/120; let alpha=1;
    if(this.paused){ this.acc=0; }
    else { this.acc=(this.acc||0)+step; let n=0; while(this.acc>=H&&n<8){ this.keepPrev(); this.now+=H; this.update(H/1000); this.acc-=H; n++; } if(n===8) this.acc=0; alpha=this.acc/H; }
    /* draw at most ~60 times a second (high-refresh screens) and drop the render resolution on slow devices */
    const since=ts-(this._ld||0); if(since>=15.5||since<0){ if(this._ld){ const fi=Math.min(100,since); this._fe=this._fe==null?fi:this._fe*0.94+fi*0.06; this._fn=(this._fn||0)+1; if(this._fn>90&&this._fe>30&&(this.rs||1)>0.72){ this.rs=Math.max(0.7,(this.rs||1)-0.12); this._fn=0; this._fe=null; const cw=this.cam.w, cx=this.cam.x, tw=this.cam.tw; this.resize(); this.cam.w=cw; this.cam.tw=tw; this.cam.x=cx; } }
      this._ld=ts; this.drawLerp(alpha); }
    this.raf=requestAnimationFrame(this.loop); }
  keepPrev(){ for(const p of this.players.values()){ p._px=p.x; p._py=p.y; } const r=this.ref; r._px=r.x; r._py=r.y; for(const a of this.ars){ a._px=a.x; a._py=a.y; } const b=this.ball; this._bp=[b.x,b.y,b.z]; }
  drawLerp(a){ if(a>=0.999||this.rm){ this.draw(); return; } const L=[]; const lerpObj=o=>{ if(o._px==null) return; const dx=o.x-o._px, dy=o.y-o._py; if(dx*dx+dy*dy>9) return; L.push(o,o.x,o.y); o.x=o._px+dx*a; o.y=o._py+dy*a; };
    for(const p of this.players.values()) lerpObj(p); lerpObj(this.ref); for(const a of this.ars) lerpObj(a);
    const b=this.ball, bp=this._bp; let bs=null; if(bp&&Math.hypot(b.x-bp[0],b.y-bp[1])<6){ bs=[b.x,b.y,b.z]; b.x=bp[0]+(b.x-bp[0])*a; b.y=bp[1]+(b.y-bp[1])*a; b.z=bp[2]+(b.z-bp[2])*a; }
    try{ this.draw(); } finally { for(let i=0;i<L.length;i+=3){ L[i].x=L[i+1]; L[i].y=L[i+2]; } if(bs){ b.x=bs[0]; b.y=bs[1]; b.z=bs[2]; } } }
  /* ---------- drawing ---------- */
  draw(){ const g=this.ctx; g.save(); if(this.shake){ g.translate((Math.random()-.5)*6*this.shake,(Math.random()-.5)*4*this.shake); }
    if(this.mode==='tactical') this.drawTac(g); else this.drawBroadcast(g);
    if(this.wx) this.drawWeather(g);
    if(this.flash>0){ g.fillStyle=`rgba(255,250,230,${this.flash*0.3})`; g.fillRect(0,0,this.W,this.H); }
    for(const q of this.conf){ g.save(); g.translate(q.x,q.y); g.rotate(q.r); g.scale(1,Math.cos(q.r*2)); g.fillStyle=q.c; g.globalAlpha=Math.min(1,q.life); g.fillRect(-q.w/2,-2,q.w,4); g.restore(); }
    g.restore(); }
  /* weather: purely cosmetic */
  updWeather(dt){ const w=this.wx; if(!this.wxp){ const n=w.k==='rain'?320:w.k==='snow'?200:0; this.wxp=Array.from({length:n},()=>({x:Math.random()*this.W,y:Math.random()*this.H,z:0.5+Math.random()*0.8,ph:Math.random()*6.28})); }
    for(const q of this.wxp){ if(w.k==='rain'){ q.y+=950*q.z*dt; q.x-=220*q.z*dt; } else { q.y+=55*q.z*dt; q.x+=Math.sin(this.now/900+q.ph)*18*dt; } if(q.y>this.H+10){ q.y=-10; q.x=Math.random()*(this.W+200); } if(q.x<-20) q.x+=this.W+40; if(q.x>this.W+20) q.x-=this.W+40; } }
  drawWeather(g){ const w=this.wx, W=this.W, H=this.H;
    if(w.night){ g.fillStyle='rgba(6,12,30,.22)'; g.fillRect(0,0,W,H); g.save(); g.globalCompositeOperation='lighter'; for(const fx of [0.06,0.94]){ const gr=g.createRadialGradient(W*fx,10,0,W*fx,10,H*1.1); gr.addColorStop(0,'rgba(200,220,255,.16)'); gr.addColorStop(1,'rgba(200,220,255,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H); } g.restore(); }
    if(w.k==='golden'){ const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'rgba(255,170,70,.22)'); gr.addColorStop(1,'rgba(255,120,60,.06)'); g.fillStyle=gr; g.fillRect(0,0,W,H); }
    if(w.k==='clouds'||w.k==='rain'||w.k==='snow'){ g.fillStyle=w.k==='snow'?'rgba(200,210,225,.10)':'rgba(110,120,135,.12)'; g.fillRect(0,0,W,H); }
    if(w.k==='fog'){ const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'rgba(215,222,230,.55)'); gr.addColorStop(.45,'rgba(215,222,230,.22)'); gr.addColorStop(1,'rgba(215,222,230,.05)'); g.fillStyle=gr; g.fillRect(0,0,W,H); }
    if(this.wxp&&!this.rm){ if(w.k==='rain'){ g.strokeStyle='rgba(210,225,255,.45)'; g.lineWidth=1; g.beginPath(); for(const q of this.wxp){ const l=12*q.z; g.moveTo(q.x,q.y); g.lineTo(q.x+l*0.23,q.y-l); } g.stroke(); }
      else if(w.k==='snow'){ g.fillStyle='rgba(255,255,255,.85)'; for(const q of this.wxp){ g.beginPath(); g.arc(q.x,q.y,1.2+q.z*1.6,0,7); g.fill(); } } } }
  /* tactical: top-down */
  tacGeom(){ const m=14; const s=Math.min((this.W-m*2)/105,(this.H-m*2)/68); return {s, ox:(this.W-105*s)/2, oy:(this.H-68*s)/2}; }
  drawTac(g){
    const {s,ox,oy}=this.tacGeom(); const T=(x,y)=>[ox+x*s,oy+y*s];
    if(!this.bgTac){ const c=document.createElement('canvas'); c.width=this.W*2; c.height=this.H*2; const q=c.getContext('2d'); q.scale(2,2);
      q.fillStyle='#123a22'; q.fillRect(0,0,this.W,this.H); for(let i=0;i<14;i++){ q.fillStyle=i%2?'#1f7040':'#1b6539'; q.fillRect(ox+i*7.5*s,oy,7.5*s+1,68*s); }
      q.strokeStyle='rgba(255,255,255,.75)'; q.lineWidth=1.5; q.strokeRect(ox,oy,105*s,68*s); q.beginPath(); q.moveTo(ox+52.5*s,oy); q.lineTo(ox+52.5*s,oy+68*s); q.stroke(); q.beginPath(); q.arc(ox+52.5*s,oy+34*s,9.15*s,0,7); q.stroke();
      for(const [x0,w] of [[0,16.5],[88.5,16.5]]) q.strokeRect(ox+x0*s,oy+13.84*s,w*s,40.32*s); for(const [x0,w] of [[0,5.5],[99.5,5.5]]) q.strokeRect(ox+x0*s,oy+24.84*s,w*s,18.32*s);
      q.beginPath(); q.arc(ox+11*s,oy+34*s,9.15*s,-0.93,0.93); q.stroke(); q.beginPath(); q.arc(ox+94*s,oy+34*s,9.15*s,Math.PI-0.93,Math.PI+0.93); q.stroke();
      q.fillStyle='rgba(255,255,255,.85)'; q.fillRect(ox-2*s,oy+30.34*s,2*s,7.32*s); q.fillRect(ox+105*s,oy+30.34*s,2*s,7.32*s);
      this.bgTac=c; }
    g.drawImage(this.bgTac,0,0,this.W,this.H);
    if(this.bulge){ const a=1-(this.now-this.bulge.t)/900; if(a>0){ const [x,y]=T(this.bulge.gx+this.bulge.dir*1.2,this.bulge.y); g.strokeStyle=`rgba(255,255,255,${a})`; g.lineWidth=2; g.beginPath(); g.arc(x,y,(1-a)*30+6,0,7); g.stroke(); } }
    if(this.fl&&this.fl.kind==='pass'&&this.fl.home){ const [x0,y0]=T(this.fl.from.x,this.fl.from.y), [x1,y1]=T(this.fl.home.x,this.fl.home.y); g.setLineDash([5,5]); g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=1.5; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); g.setLineDash([]); }
    const r=Math.max(7,s*1.25);
    for(const a of this.ars){ const [x,y]=T(a.x,clamp(a.y,-0.6,68.6)); g.fillStyle='#111'; g.strokeStyle='#f5c518'; g.lineWidth=1.2; g.beginPath(); g.arc(x,y,r*0.45,0,7); g.fill(); g.stroke(); if(a.flag){ g.fillStyle='#f6c514'; g.fillRect(x-1,y-r*1.9,r*0.8,r*0.6); g.fillStyle='#e0362c'; g.fillRect(x-1,y-r*1.6,r*0.8,r*0.3); } }
    if(this.offMark){ const [x0,y0]=T(this.offMark.x,0), [, y1]=T(this.offMark.x,68); g.strokeStyle='rgba(255,211,107,.85)'; g.setLineDash([6,5]); g.lineWidth=2; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0,y1); g.stroke(); g.setLineDash([]); if(this.now-this.offMark.t>1500) this.offMark=null; }
    const R2=this.ref; { const [x,y]=T(R2.x,R2.y); g.fillStyle='#111'; g.strokeStyle='#f5c518'; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,r*0.6,0,7); g.fill(); g.stroke(); if(R2.card){ g.fillStyle=R2.card.c; g.fillRect(x+r*0.5,y-r*1.8,r*0.7,r*0.95); } }
    for(const p of this.players.values()){ if(p.off&&!p.ov) continue; const [x,y]=T(p.x,p.y); const kit=p.gk?this.kits.gk[p.side]:this.kits.team[p.side];
      if(p===this.own){ g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.arc(x,y,r+5,0,7); g.fill(); }
      g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x+1.5,y+2,r,r*0.8,0,0,7); g.fill();
      g.fillStyle=kit.shirt; g.strokeStyle=kit.num; g.lineWidth=2; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); g.stroke();
      g.fillStyle=kit.num; g.font=`800 ${Math.round(r*1.05)}px "JetBrains Mono",monospace`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(p.num,x,y+0.5); }
    for(let i=0;i<this.trail.length;i++){ const [bx,by]=T(this.trail[i][0],this.trail[i][1]); g.fillStyle=`rgba(255,255,255,${i/this.trail.length*0.3})`; g.beginPath(); g.arc(bx,by,2.2,0,7); g.fill(); }
    const b=this.ball; const [bx,by]=T(b.x,b.y); g.fillStyle='rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(bx+b.z*2,by+b.z*2,4.5,3.4,0,0,7); g.fill();
    g.fillStyle='#fff'; g.strokeStyle='#111'; g.lineWidth=1; g.beginPath(); g.arc(bx,by-b.z*2.2,4.4+b.z*0.5,0,7); g.fill(); g.stroke();
  }
  /* broadcast: tilted TV camera */
  proj(X,Y,Z=0){ const v=Y/68; const k=(this.W/this.cam.w)*(0.56+0.44*v); const yF=this.H*0.265, yN=this.H*0.97; return [this.W/2+(X-this.cam.x)*k, yF+(yN-yF)*v - Z*k, k]; }
  drawBroadcast(g){
    const W=this.W,H=this.H, now=this.now, hype=this.rm?0:this.hype; const wx=this.wx; const night=!wx||wx.night; const golden=wx&&wx.k==='golden';
    const [,yBase]=this.proj(0,-5.5); const rowH=Math.max(3,H*0.0128);
    // sky
    const sky=g.createLinearGradient(0,0,0,yBase); if(night){ sky.addColorStop(0,'#03060c'); sky.addColorStop(1,'#101b2e'); } else if(golden){ sky.addColorStop(0,'#3b4c78'); sky.addColorStop(1,'#f0a868'); } else { sky.addColorStop(0,'#4f7fb8'); sky.addColorStop(1,'#a9c6e3'); }
    g.fillStyle=sky; g.fillRect(0,0,W,H);
    // ---------- the stand: lower tier, hospitality band, upper tier, roof ----------
    const yLow=yBase-rowH*7, conH=rowH*1.55, yCon=yLow-conH, uH=rowH*0.78, yUp=yCon-uH*6, yRoof=yUp-rowH*1.1;
    const steel=night?'#0b1018':'#1d2530';
    g.fillStyle=steel; g.fillRect(0,yRoof-rowH*3,W,yBase-yRoof+rowH*3);
    g.fillStyle=night?'#151c27':'#2a3340'; for(let r=0;r<7;r++) g.fillRect(0,yBase-rowH*(r+1),W,1); for(let r=0;r<6;r++) g.fillRect(0,yCon-uH*(r+1),W,1);
    // hospitality band: glass boxes with warm light, a team-colour fascia and a scrolling LED ribbon
    const cg=g.createLinearGradient(0,yCon,0,yLow); cg.addColorStop(0,'#1a2230'); cg.addColorStop(1,'#0c1118'); g.fillStyle=cg; g.fillRect(0,yCon,W,conH);
    for(let x=-30;x<136;x+=4.2){ const [x0]=this.proj(x,-14), [x1]=this.proj(x+3.6,-14); if(x1<0||x0>W) continue; const lit=(hashStr('box'+Math.round(x*10))%5)!==0; g.fillStyle=lit?(night?'rgba(255,214,150,.55)':'rgba(255,230,190,.28)'):'rgba(120,150,190,.18)'; g.fillRect(x0,yCon+conH*0.12,x1-x0,conH*0.42); }
    g.fillStyle=this.h.c1; g.fillRect(0,yLow-conH*0.3,W,conH*0.3);
    { const ry=yLow-conH*0.3, rh=conH*0.3; g.save(); g.beginPath(); g.rect(0,ry,W,rh); g.clip(); g.fillStyle=lum(this.h.c1)>0.5?'#111':'#fff'; g.font=`800 ${Math.max(7,Math.round(rh*0.82))}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.textBaseline='middle'; g.textAlign='left';
      const msg=hype>0.55?`  GOAL  ·  GOAL  ·  GOAL  ·  `:`  ${(this.h.town||'HOME').toUpperCase()} ${String(this.h.mascot||'').toUpperCase()}  ·  SECTION ${this.section}  ·  TOUCHLINE  ·  `;
      const mw=g.measureText(msg).width||200; const off=-((now*0.05)%mw)-((this.cam.x*4)%mw); for(let xx=off;xx<W;xx+=mw) g.fillText(msg,xx,ry+rh/2+1); g.restore(); }
    // crowd (lower tier big, upper tier smaller); flags and scarves in the home colours; everyone up when it goes in
    const crowdFast=hype<=0.02&&this.drawCrowdFast(g,W,yBase,yCon,rowH,uH);
    for(const c of this.crowd){ if(crowdFast&&!c.flag) continue; const upTier=c.row>=8; const rr0=upTier?uH:rowH; const Y=upTier?-17-(c.row-8)*1.5:-6-c.row*1.6; const [x]=this.proj(c.x,Y); if(x<-4||x>W+4) continue;
      const jump=hype*Math.abs(Math.sin(now/95+c.ph))*rr0*0.6; const yy=(upTier? yCon-uH*(c.row-8+0.55) : yBase-rowH*(c.row+0.55))-jump-Math.sin(now/1700+c.ph)*0.4;
      const rr=rr0*0.27*c.s; g.fillStyle=c.c; g.fillRect(x-rr*0.85,yy+rr*0.55,rr*1.7,rr*1.4); g.fillStyle=c.sk; g.beginPath(); g.arc(x,yy,rr,0,7); g.fill();
      if(c.flag){ const w=Math.sin(now/240+c.ph)*rr; g.strokeStyle='#ccc'; g.lineWidth=Math.max(0.6,rr*0.2); g.beginPath(); g.moveTo(x+rr,yy+rr); g.lineTo(x+rr,yy-rr*3.4); g.stroke(); g.fillStyle=c.flag; g.beginPath(); g.moveTo(x+rr,yy-rr*3.4); g.lineTo(x+rr*3.8+w,yy-rr*3.1); g.lineTo(x+rr*3.6+w,yy-rr*1.6); g.lineTo(x+rr,yy-rr*1.9); g.fill(); }
      else if(hype>0.35&&c.ph<1.4){ g.strokeStyle=c.sk; g.lineWidth=rr*0.5; g.beginPath(); g.moveTo(x-rr,yy+rr); g.lineTo(x-rr*1.6,yy-rr*1.4-jump*0.2); g.moveTo(x+rr,yy+rr); g.lineTo(x+rr*1.6,yy-rr*1.4); g.stroke(); } }
    for(const q of this.bulbs){ if(now<q.t) continue; const [x]=this.proj(q.x,-6-q.row*1.6); const y=yBase-rowH*(q.row+0.6); const a=1-(now-q.t)/220; const gr=g.createRadialGradient(x,y,0,x,y,rowH*1.4); gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x-rowH*1.5,y-rowH*1.5,rowH*3,rowH*3); }
    // roof: steel fascia, a line of downlights and the video board hanging over halfway
    g.fillStyle=night?'#1b2330':'#3a4554'; g.fillRect(0,yRoof-rowH*0.5,W,rowH*1.1); g.fillStyle=mix(this.h.c1,'#000000',0.35); g.fillRect(0,yRoof+rowH*0.45,W,rowH*0.18);
    for(let x=-30;x<136;x+=3){ const [lx]=this.proj(x,-24); if(lx<0||lx>W) continue; g.fillStyle=night?'rgba(255,248,220,.95)':'rgba(255,255,255,.6)'; g.fillRect(lx-1,yRoof+rowH*0.62,2.2,1.6); }
    { const [bx]=this.proj(52.5,-26); const bw=Math.min(W*0.28,rowH*17), bh=rowH*3.6, by=Math.max(2,yRoof+rowH*0.9); if(bx+bw/2>0&&bx-bw/2<W){
        g.fillStyle='#05070a'; g.fillRect(bx-bw/2-3,by-3,bw+6,bh+6); g.strokeStyle='#2a3340'; g.lineWidth=1; g.beginPath(); g.moveTo(bx-bw*0.3,by-3); g.lineTo(bx-bw*0.3,0); g.moveTo(bx+bw*0.3,by-3); g.lineTo(bx+bw*0.3,0); g.stroke();
        const sg=g.createLinearGradient(0,by,0,by+bh); sg.addColorStop(0,'#0c1626'); sg.addColorStop(1,'#060b14'); g.fillStyle=sg; g.fillRect(bx-bw/2,by,bw,bh);
        const B=this.board?this.board():null; g.textBaseline='middle'; g.textAlign='center';
        if(hype>0.55){ g.fillStyle=Math.floor(now/180)%2?this.h.c1:'#ffd36b'; g.font=`900 ${Math.round(bh*0.62)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillText('GOAL!',bx,by+bh/2+1); }
        else if(B){ g.font=`800 ${Math.round(bh*0.36)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillStyle='#e8eef6'; g.fillText(B.h,bx-bw*0.3,by+bh*0.36); g.fillText(B.a,bx+bw*0.3,by+bh*0.36);
          g.fillStyle='#ffd36b'; g.font=`800 ${Math.round(bh*0.5)}px "JetBrains Mono",monospace`; g.fillText(`${B.sc[0]}-${B.sc[1]}`,bx,by+bh*0.42); g.fillStyle='#8fa3bb'; g.font=`700 ${Math.round(bh*0.2)}px "JetBrains Mono",monospace`; g.fillText(B.min,bx,by+bh*0.82); }
        else { g.fillStyle='#e8eef6'; g.font=`800 ${Math.round(bh*0.42)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillText('TOUCHLINE',bx,by+bh*0.5); }
        g.fillStyle='rgba(255,255,255,.05)'; for(let yy=by;yy<by+bh;yy+=2) g.fillRect(bx-bw/2,yy,bw,1); } }
    // floodlight masts at the four corners, lamp banks and their glow
    for(const [mx,my] of [[-16,-10],[121,-10]]){ const [x,yb]=this.proj(mx,my); const top=Math.max(6,yRoof-rowH*5); if(x<-80||x>W+80) continue;
      g.strokeStyle=night?'#1c232c':'#4a5563'; g.lineWidth=3; g.beginPath(); g.moveTo(x,yb); g.lineTo(x,top+10); g.stroke(); g.lineWidth=1; g.beginPath(); for(let yy=yb;yy>top+10;yy-=8){ g.moveTo(x-3,yy); g.lineTo(x+3,yy-8); } g.stroke();
      g.fillStyle='#2a323d'; g.fillRect(x-26,top-4,52,18); for(let r2=0;r2<2;r2++) for(let i=0;i<6;i++){ g.fillStyle=night?'#fffbe8':'#f2f2ea'; g.beginPath(); g.arc(x-21+i*8.4,top+1+r2*8,2.8,0,7); g.fill(); }
      if(night||(wx&&wx.k!=='clear')){ g.save(); g.globalCompositeOperation='lighter'; const gr=g.createRadialGradient(x,top+5,0,x,top+5,H*0.9); gr.addColorStop(0,'rgba(255,246,214,.30)'); gr.addColorStop(0.15,'rgba(255,246,214,.10)'); gr.addColorStop(1,'rgba(255,246,214,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H);
        const fl=g.createRadialGradient(x,top+5,0,x,top+5,30); fl.addColorStop(0,'rgba(255,255,255,.9)'); fl.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=fl; g.fillRect(x-30,top-25,60,60); g.restore(); } }
    // ---------- the pitch ----------
    const poly=(pts,fill)=>{ g.beginPath(); pts.forEach(([x,y],i)=>{ const [sx,sy]=this.proj(x,y); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.closePath(); g.fillStyle=fill; g.fill(); };
    poly([[-40,-2.6],[145,-2.6],[145,80],[-40,80]],night?'#123d24':'#1a5532');
    for(let i=0;i<20;i++) poly([[i*5.25,0],[(i+1)*5.25,0],[(i+1)*5.25,68],[i*5.25,68]], i%2?'#2d944f':'#268646');
    for(let j=0;j<4;j++) for(let i=0;i<20;i++) if((i+j)%2) poly([[i*5.25,j*17],[(i+1)*5.25,j*17],[(i+1)*5.25,(j+1)*17],[i*5.25,(j+1)*17]],'rgba(255,255,255,.028)');
    if(!this.grassPat){ const c=document.createElement('canvas'); c.width=c.height=96; const q=c.getContext('2d'); const r=rngFrom(7); for(let i=0;i<900;i++){ q.fillStyle=r()<0.5?'rgba(0,0,0,.16)':'rgba(255,255,255,.10)'; q.fillRect(r()*96,r()*96,1+r()*1.4,1); } this.grassPat=g.createPattern(c,'repeat'); }
    { const [,yF]=this.proj(0,0), [,yN]=this.proj(0,68); g.save(); g.globalAlpha=0.55; g.fillStyle=this.grassPat; g.fillRect(0,yF,W,yN-yF+40); g.restore(); }
    // goalmouth and centre-circle wear
    for(const [x,y,rx,ry] of [[3,34,3.2,3.6],[102,34,3.2,3.6],[11,34,1.4,1],[94,34,1.4,1],[52.5,34,2.2,1.6]]){ const [sx,sy,kk]=this.proj(x,y); g.fillStyle='rgba(122,104,60,.16)'; g.beginPath(); g.ellipse(sx,sy,rx*kk,ry*kk*0.55,0,0,7); g.fill(); }
    // light: pools under the floodlights, falloff toward the far side
    g.save(); g.globalCompositeOperation=night?'lighter':'source-over'; for(const [lx,ly] of [[8,10],[97,10],[8,58],[97,58],[52.5,34]]){ const [sx,sy,kk]=this.proj(lx,ly); const rr=kk*26; const gr=g.createRadialGradient(sx,sy,0,sx,sy,rr); gr.addColorStop(0,night?'rgba(255,250,225,.07)':'rgba(255,255,240,.05)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(sx-rr,sy-rr,rr*2,rr*2); } g.restore();
    const vg=g.createLinearGradient(0,yBase,0,H); vg.addColorStop(0,'rgba(0,0,0,.3)'); vg.addColorStop(0.35,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.2)'); g.fillStyle=vg; g.fillRect(0,yBase,W,H-yBase);
    // the home crest painted in the centre circle
    { const [ox,oy]=this.proj(52.5,34), [ex,ey]=this.proj(53.5,34), [fx,fy]=this.proj(52.5,35); g.save(); g.transform(ex-ox,ey-oy,fx-ox,fy-oy,ox,oy);
      g.globalAlpha=0.2; g.fillStyle=this.h.c1; g.beginPath(); g.arc(0,0,6.2,0,7); g.fill(); g.globalAlpha=0.28; g.strokeStyle='#ffffff'; g.lineWidth=0.35; g.beginPath(); g.arc(0,0,5.4,0,7); g.stroke();
      g.globalAlpha=0.34; g.fillStyle='#ffffff'; g.textAlign='center'; g.textBaseline='middle'; g.font='900 2.6px "Big Shoulders Display","Arial Narrow",sans-serif'; g.fillText(String(this.h.town||'').toUpperCase(),0,-0.4,10.6); g.font='800 1.3px "Big Shoulders Display","Arial Narrow",sans-serif'; g.fillText(String(this.h.mascot||'').toUpperCase(),0,1.9); g.restore(); }
    // markings
    g.strokeStyle='rgba(255,255,255,.88)'; g.lineWidth=Math.max(1.3,this.W/650); g.lineCap='round';
    const L=(pts)=>{ g.beginPath(); pts.forEach(([x,y],i)=>{ const [sx,sy]=this.proj(x,y); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.stroke(); };
    const circ=(cx,cy,r,a0=0,a1=6.2832)=>{ const pts=[]; for(let i=0;i<=40;i++){ const a=a0+(a1-a0)*i/40; pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]); } L(pts); };
    L([[0,0],[105,0],[105,68],[0,68],[0,0]]); L([[52.5,0],[52.5,68]]); circ(52.5,34,9.15);
    L([[0,13.84],[16.5,13.84],[16.5,54.16],[0,54.16]]); L([[105,13.84],[88.5,13.84],[88.5,54.16],[105,54.16]]);
    L([[0,24.84],[5.5,24.84],[5.5,43.16],[0,43.16]]); L([[105,24.84],[99.5,24.84],[99.5,43.16],[105,43.16]]);
    circ(11,34,9.15,-0.93,0.93); circ(94,34,9.15,Math.PI-0.93,Math.PI+0.93);
    circ(0,0,1,0,1.5708); circ(105,0,1,1.5708,3.1416); circ(0,68,1,-1.5708,0); circ(105,68,1,3.1416,4.7124);
    for(const [x,y] of [[52.5,34],[11,34],[94,34]]){ const [sx,sy]=this.proj(x,y); g.fillStyle='#fff'; g.beginPath(); g.ellipse(sx,sy,2.2,1.4,0,0,7); g.fill(); }
    // LED boards along the far touchline (the dugouts sit in the gap at halfway)
    const [,yb,kb]=this.proj(0,-2.2); const bh=Math.max(6,kb*0.9);
    for(let x=-30;x<136;x+=12){ if(x>=36&&x<66) continue; const [x0]=this.proj(x,-2.2), [x1]=this.proj(x+12,-2.2); if(x1<0||x0>W) continue; const i=Math.round((x+30)/12); const goal=hype>0.55;
      const bg=goal?(Math.floor(now/160+i)%2?this.h.c1:'#ffd36b'):(Math.floor(now/4000+i)%3===0?this.h.c1:'#0d1117'); const grd=g.createLinearGradient(0,yb-bh,0,yb); grd.addColorStop(0,mix(bg,'#ffffff',.14)); grd.addColorStop(1,mix(bg,'#000000',.28)); g.fillStyle=grd; g.fillRect(x0,yb-bh,x1-x0-1,bh);
      if(x1-x0>60){ g.save(); g.beginPath(); g.rect(x0,yb-bh,x1-x0-1,bh); g.clip(); const fg=lum(bg)>0.45?'#111':'#fff'; g.fillStyle=goal?fg:(bg===this.h.c1?fg:(lum(this.h.c2)>0.2?this.h.c2:'#ffffff')); g.font=`800 ${Math.round(bh*0.66)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.textAlign='center'; g.textBaseline='middle';
        const txt=goal?'GOAL!':['TOUCHLINE',(this.h.town||'').toUpperCase(),`SECTION ${this.section}`,'GO '+String(this.h.mascot||'TEAM').toUpperCase()][(i+Math.floor(now/4000))%4]; const sl=goal?0:((now/40)%(x1-x0))*0; g.fillText(txt,(x0+x1)/2+sl,yb-bh/2+1); g.restore(); } }
    this.drawDugouts(g);
    // ball-stop netting and boards behind each goal, photographers crouched by the posts
    for(const ex of [-4.4,109.4]) this.drawEndFence(g,ex);
    // corner flags (far side first)
    for(const [x,y] of [[0,0],[105,0]]) this.drawFlag(g,x,y);
    // goals: back halves before players, near halves sorted with them
    this.drawGoal(g,0,-1,'back'); this.drawGoal(g,105,1,'back');
    const items=[...this.players.values()].filter(p=>!(p.off&&!p.ov&&p.y<-3)).map(p=>({y:p.y,p}));
    items.push({y:this.ball.y+0.01,ball:true}); items.push({y:this.ref.y,ref:true}); for(const a of this.ars) items.push({y:a.y,ar:a}); items.push({y:37.66,goal:0}); items.push({y:37.66,goal:105});
    items.sort((a,b)=>a.y-b.y);
    if(this.offMark) this.drawOffMark(g);
    for(const it of items){ if(it.ar){ this.drawFigure(g,it.ar,{shirt:'#141414',shorts:'#141414',num:'#f5c518',socks:'#141414',dark:'#000',light:'#2a2a2a'},true); this.drawARFlag(g,it.ar); } else if(it.ball) this.drawBall(g); else if(it.ref) this.drawFigure(g,this.ref,{shirt:'#141414',shorts:'#141414',num:'#f5c518',socks:'#141414',dark:'#000',light:'#2a2a2a'},true); else if(it.goal!=null) this.drawGoal(g,it.goal,it.goal===0?-1:1,'front'); else this.drawPlayerB(g,it.p); }
    this.drawTurf(g);
    for(const [x,y] of [[0,68],[105,68]]) this.drawFlag(g,x,y);
    if(this.minimap) this.drawMini(g);
  }
  /* the assistant's flag: held down while he runs, straight up for offside, out at an angle to point a throw-in */
  drawARFlag(g,a){ const P=this.poseOf(a,true); const h=P.hands[1]; if(!h) return; const hs=1.06*(a.hgt||70)/70, ca=Math.cos(a.yaw||0), sa=Math.sin(a.yaw||0);
    const hx=a.x+(h.f*ca-h.l*sa)*hs, hy=a.y+(h.f*sa+h.l*ca)*hs, hz=h.u*hs+(P.lift||0);
    const up=a.flag==='up', pt=a.flag==='point'; const px=pt?(a.pointDir||1):0;
    const tip= up? [hx,hy,hz+0.6] : pt? [hx+px*0.46,hy,hz+0.22] : [hx+0.05,hy,Math.max(0.12,hz-0.52)];
    const [x0,y0,k]=this.proj(hx,hy,hz), [x1,y1]=this.proj(...tip); g.strokeStyle='#d9d9d9'; g.lineWidth=Math.max(1,k*0.045); g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke();
    const wv=Math.sin(this.now/120+a.seed)*0.06, fx=up?(a.att===0?-1:1):pt?px:0.4; const W=up||pt?0.44:0.22, Hh=up||pt?0.32:0.4;
    const c= up? [[tip[0],tip[1],tip[2]],[tip[0]+fx*W,tip[1],tip[2]-0.02+wv],[tip[0]+fx*W,tip[1],tip[2]-Hh+wv],[tip[0],tip[1],tip[2]-Hh]]
      : pt? [[tip[0],tip[1],tip[2]],[tip[0]+fx*W,tip[1],tip[2]+0.04+wv],[tip[0]+fx*W,tip[1],tip[2]-Hh+wv],[tip[0],tip[1],tip[2]-Hh]]
      : [[tip[0],tip[1],tip[2]+0.05],[tip[0]+0.12,tip[1],tip[2]+0.02],[tip[0]+0.1,tip[1],tip[2]+Hh],[tip[0],tip[1],tip[2]+Hh]];
    const S=c.map(q=>this.proj(q[0],q[1],q[2])); g.fillStyle='#f6c514'; g.beginPath(); g.moveTo(S[0][0],S[0][1]); g.lineTo(S[1][0],S[1][1]); g.lineTo(S[2][0],S[2][1]); g.closePath(); g.fill();
    g.fillStyle='#e0362c'; g.beginPath(); g.moveTo(S[0][0],S[0][1]); g.lineTo(S[2][0],S[2][1]); g.lineTo(S[3][0],S[3][1]); g.closePath(); g.fill(); }
  /* the broadcast's offside freeze-line, drawn for a moment when the flag goes up */
  drawOffMark(g){ const m=this.offMark; const t=(this.now-m.t)/Math.max(700,this.D(1500)); if(t>=1){ this.offMark=null; return; } const al=t<0.15?t/0.15:1-Math.max(0,(t-0.6)/0.4);
    const [x0,y0]=this.proj(m.x,0.2), [x1,y1]=this.proj(m.x,67.8); g.save(); g.globalAlpha=al*0.9; g.strokeStyle='#ffd36b'; g.lineWidth=2.4; g.setLineDash([9,7]); g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); g.setLineDash([]); g.restore(); }
  /* dugouts at halfway with the benches and each head coach in his technical area */
  drawDugouts(g){ const now=this.now;
    if(!this.coaches){ this.coaches=[0,1].map(i=>({x:i?60:45,y:-1.0,face:i?-1:1,yaw:i?Math.PI:0,ph:0,spd:0,seed:i*3.1,hgt:72,look:defaultLook('coach'+(this.T.id||'')+i,10),num:'',kickT:-9e9,trip:-9e9,jumpT:-9e9,side:i})); }
    for(const [x0,x1,side] of [[39,51,0],[54,66,1]]){ const kit=this.kits.team[side];
      const A=this.proj(x0,-4.2), Bq=this.proj(x1,-4.2), A2=this.proj(x0,-4.2,2.1), B2=this.proj(x1,-4.2,2.1), C2=this.proj(x1,-2.4,2.0), D2=this.proj(x0,-2.4,2.0);
      if(Bq[0]<-20||A[0]>this.W+20) continue;
      g.fillStyle='#10161e'; g.beginPath(); g.moveTo(A[0],A[1]); g.lineTo(Bq[0],Bq[1]); g.lineTo(B2[0],B2[1]); g.lineTo(A2[0],A2[1]); g.closePath(); g.fill();
      for(let i=0;i<7;i++){ const bx=lerp(x0+1,x1-1,i/6); const [sx,sy,kk]=this.proj(bx,-3.6,0.9); g.fillStyle=kit.shirt; g.fillRect(sx-kk*0.22,sy,kk*0.44,kk*0.5); g.fillStyle=LOOK.skin[(i*5+side*3)%12]; g.beginPath(); g.arc(sx,sy-kk*0.12,kk*0.15,0,7); g.fill(); }
      g.fillStyle='rgba(170,200,230,.22)'; g.beginPath(); g.moveTo(A2[0],A2[1]); g.lineTo(B2[0],B2[1]); g.lineTo(C2[0],C2[1]); g.lineTo(D2[0],D2[1]); g.closePath(); g.fill(); g.strokeStyle='rgba(220,235,255,.5)'; g.lineWidth=1; g.stroke(); }
    const coachKit={shirt:'#1b2230',shorts:'#1b2230',num:'#fff',socks:'#111',dark:'#11161f',light:'#2a3242'};
    for(const c of this.coaches){ const scoring=this.hype>0.6&&this.poss===c.side&&this.inNet; c.celeb=!!scoring; c.celebType='classic'; c.celebT=scoring?(c.celebT||now):null; if(!scoring) c.celebT=null; const ty=Math.atan2(this.ball.y-c.y,this.ball.x-c.x); c.yaw+=clamp(Math.atan2(Math.sin(ty-c.yaw),Math.cos(ty-c.yaw)),-0.08,0.08); this.drawFigure(g,c,coachKit,false); } }
  drawEndFence(g,ex){ const [cx]=this.proj(ex,34); if(cx<-200||cx>this.W+200) return; const k=this.proj(ex,34)[2];
    // advertising board along the end line
    const P=(y,z)=>this.proj(ex,y,z); g.fillStyle='#0d1117'; g.beginPath(); [[-2,0],[70,0],[70,0.9],[-2,0.9]].forEach(([y,z],i)=>{ const [sx,sy]=P(y,z); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.closePath(); g.fill(); g.strokeStyle=this.h.c1; g.lineWidth=Math.max(1,k*0.08); g.beginPath(); { const [a1,b1]=P(-2,0.88), [a2,b2]=P(70,0.88); g.moveTo(a1,b1); g.lineTo(a2,b2); } g.stroke();
    // tall ball-stop netting behind the goal
    g.strokeStyle='rgba(220,230,240,.13)'; g.lineWidth=1; g.beginPath(); for(let y=12;y<=56;y+=2){ const [a1,b1]=P(y,0.9), [a2,b2]=P(y,5.5); g.moveTo(a1,b1); g.lineTo(a2,b2); } for(let z=1.5;z<=5.5;z+=1){ const [a1,b1]=P(12,z), [a2,b2]=P(56,z); g.moveTo(a1,b1); g.lineTo(a2,b2); } g.stroke();
    g.strokeStyle='rgba(60,70,80,.9)'; g.lineWidth=Math.max(1.2,k*0.06); g.beginPath(); for(const y of [12,34,56]){ const [a1,b1]=P(y,0), [a2,b2]=P(y,5.6); g.moveTo(a1,b1); g.lineTo(a2,b2); } g.stroke();
    // photographers by the posts; their flashes go off at goals
    for(const y of [24,44]){ const [sx,sy,kk]=this.proj(ex+(ex<0?-0.8:0.8),y); g.fillStyle='#20262e'; g.beginPath(); g.ellipse(sx,sy-kk*0.45,kk*0.32,kk*0.45,0,0,7); g.fill(); g.fillStyle='#c79a6a'; g.beginPath(); g.arc(sx,sy-kk*1.0,kk*0.16,0,7); g.fill(); g.fillStyle='#111'; g.fillRect(sx+(ex<0?1:-1)*kk*0.12-kk*0.1,sy-kk*1.05,kk*0.2,kk*0.14);
      if(this.hype>0.5&&Math.random()<0.25){ const gr=g.createRadialGradient(sx,sy-kk,0,sx,sy-kk,kk*2.2); gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(sx-kk*2.2,sy-kk*3.2,kk*4.4,kk*4.4); } } }
  drawFlag(g,x,y){ const [sx,sy,k]=this.proj(x,y); const [,ty]=this.proj(x,y,1.5); g.strokeStyle='#ddd'; g.lineWidth=Math.max(1,k*0.05); g.beginPath(); g.moveTo(sx,sy); g.lineTo(sx,ty); g.stroke(); const w=Math.sin(this.now/300+x)*k*0.08; g.fillStyle=this.h.c1; g.beginPath(); g.moveTo(sx,ty); g.lineTo(sx+k*0.5+w,ty+k*0.12); g.lineTo(sx,ty+k*0.3); g.fill(); }
  /* realistic goal: tubular frame, box net with diamond mesh that bulges where the ball hits */
  netPoint(gx,dir,x,y,z){ const D=this.netD[gx]; if(D&&D.c&&Math.abs(D.a)>0.003){ const d2=(x-D.c.x)**2+(y-D.c.y)**2+(z-D.c.z)**2; const w=Math.exp(-d2/0.5)*D.a; x+=D.n[0]*w; y+=D.n[1]*w; z+=D.n[2]*w; } return this.proj(x,y,z); }
  drawGoal(g,gx,dir,part){
    const y0=30.34,y1=37.66,H=2.44,DB=2.0,DT=1.2,ZB=1.9; const k=this.proj(gx,34)[2]; if(this.proj(gx,34)[0]<-k*6||this.proj(gx,34)[0]>this.W+k*6) return;
    const P=(x,y,z)=>this.netPoint(gx,dir,x,y,z);
    const back=(u,v)=>[gx+dir*lerp(DB,DT,v), lerp(y0,y1,u), ZB*v];
    const roof=(u,w)=>[gx+dir*DT*w, lerp(y0,y1,u), lerp(H,ZB,w)];
    const side=(yy)=>(w,v)=>[gx+dir*w*lerp(DB,DT,v), yy, v*lerp(H,ZB,w)];
    const mesh=(fn,nu,nv,alpha)=>{ g.strokeStyle=`rgba(255,255,255,${alpha})`; g.lineWidth=Math.max(0.6,k*0.025);
      for(let i=0;i<=nu;i++){ g.beginPath(); for(let j=0;j<=nv;j++){ const [x,y,z]=fn(i/nu,j/nv); const [sx,sy]=P(x,y,z); j?g.lineTo(sx,sy):g.moveTo(sx,sy); } g.stroke(); }
      for(let j=0;j<=nv;j++){ g.beginPath(); for(let i=0;i<=nu;i++){ const [x,y,z]=fn(i/nu,j/nv); const [sx,sy]=P(x,y,z); i?g.lineTo(sx,sy):g.moveTo(sx,sy); } g.stroke(); } };
    const tube=(pts,w,col)=>{ g.lineCap='round'; g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=w+1.6; g.beginPath(); pts.forEach(([x,y,z],i)=>{ const [sx,sy]=this.proj(x,y,z); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.stroke(); g.strokeStyle=col; g.lineWidth=w; g.stroke(); g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=Math.max(0.6,w*0.3); g.stroke(); };
    const pw=Math.max(2,k*0.12);
    if(part==='back'){
      // shadow of the goal on the grass
      g.fillStyle='rgba(0,0,0,.18)'; g.beginPath(); [[gx,y0],[gx+dir*DB,y0],[gx+dir*DB,y1],[gx,y1]].forEach(([x,y],i)=>{ const [sx,sy]=this.proj(x,y); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.fill();
      mesh(side(y0),8,6,0.32); mesh(back,14,7,0.42); mesh(roof,14,4,0.38);
      tube([[gx+dir*DB,y0,0],[gx+dir*DT,y0,ZB],[gx+dir*DT,y1,ZB],[gx+dir*DB,y1,0]],pw*0.55,'#d9dde2');
      tube([[gx,y0,0],[gx,y0,H]],pw,'#f4f4f4');
    } else {
      mesh(side(y1),8,6,0.36);
      tube([[gx,y0,H],[gx,y1,H],[gx,y1,0]],pw,'#f4f4f4');
      tube([[gx,y0,H],[gx+dir*DT,y0,ZB]],pw*0.5,'#d9dde2'); tube([[gx,y1,H],[gx+dir*DT,y1,ZB]],pw*0.5,'#d9dde2');
    }
  }
  /* small, short-lived flecks of turf for slides, dive landings and big strikes; capped, and off with reduced motion */
  kickTurf(x,y,n,pow=1){ if(this.rm) return; const T=this.turf||(this.turf=[]); if(T.length>60) return; for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=(0.6+Math.random()*1.4)*pow; T.push({x:x+(Math.random()-.5)*0.4,y:y+(Math.random()-.5)*0.3,z:0.02,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.6,vz:1.2+Math.random()*1.8*pow,life:0.45+Math.random()*0.35,c:Math.random()<0.7?'#2f7a3d':'#6b4f2e'}); } }
  drawTurf(g){ const T=this.turf; if(!T||!T.length) return; for(const q of T){ const [x,y,k]=this.proj(q.x,q.y,q.z); const r=Math.max(0.8,k*0.035); g.globalAlpha=Math.min(1,q.life*2.4); g.fillStyle=q.c; g.fillRect(x-r,y-r,r*2,r*1.4); } g.globalAlpha=1; }
  drawBall(g){ const b=this.ball; const [gx,gy,k]=this.proj(b.x,b.y,0); const r=Math.max(3.2,BALL_R*k); const [x,y0]=this.proj(b.x,b.y,b.z); const y=y0-r;
    const hz=Math.min(1,b.z/6); g.fillStyle=`rgba(0,0,0,${0.42-hz*0.28})`; g.beginPath(); g.ellipse(gx+b.z*k*0.08,gy,r*(1.05+hz*0.6),r*0.42*(1+hz*0.3),0,0,7); g.fill();
    const fast=this.fl&&!this.fl.phys&&(this.fl.kind==='shot'||this.fl.h>1); if(fast&&!this.rm){ for(let i=0;i<this.trail.length;i++){ const [tx,ty,tz]=this.trail[i]; const [sx,sy]=this.proj(tx,ty,tz); g.fillStyle=`rgba(255,255,255,${i/this.trail.length*0.2})`; g.beginPath(); g.arc(sx,sy-r,r*0.8,0,7); g.fill(); } }
    drawFootball(g,x,y,r,b.spin); }
  drawPlayerB(g,p){ const kit=p.gk?this.kits.gk[p.side]:this.kits.team[p.side]; this.drawFigure(g,p,kit,false); }
  /* ---------- the figure ----------
     A pose is solved in the player's own 3-D frame: f = forward, u = up, l = lateral (+ = his left side, toward the
     camera when he faces right). Limbs are solved with 3-D two-bone IK, then everything is turned to the player's heading
     (yaw) and projected through the broadcast camera, so shoulders, arms, hips and head always line up with the torso. */
  poseOf(p,isRef){
    const now=this.now, P={rot:0,pivot:0,lift:0,hipU:0.8,lean:0,feet:[null,null],hands:[null,null],headTilt:0,headTurn:0,prop:null,mouth:false};
    const real=(p.spd||0)/Math.max(1,this.spdMul||1); const moving=real>0.5&&!p.knelt; const run=moving?Math.min(1,0.25+real*0.09):0; const ph=p.ph||0;
    const F=P.feet, Hn=P.hands; const Hs=(i,f,u,l)=>{ Hn[i]={f,u,l:l==null?(i?1:-1)*0.27:l}; }, Fs=(i,f,u,l)=>{ F[i]={f,u,l:l==null?(i?1:-1)*0.1:l}; };
    /* locomotion: each foot is planted for the stance part of its cycle and travels back at exactly the body's speed (no skating),
       then swings through with the knee lifting. Walk, jog and sprint differ in cadence, stride, flight time, lean and arm drive.
       The stride follows the direction of travel in the body's frame, so backpedalling and side-shuffling look like what they are. */
    const vxx=p.vx||0, vyy=p.vy||0, vm=Math.hypot(vxx,vyy); const yw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw;
    let mf=1, ml=0; if(vm>0.05){ const ps=Math.atan2(vyy,vxx)-yw; mf=Math.cos(ps); ml=Math.sin(ps); }
    const v=Math.min(9,p.gv!=null?p.gv:real); const G=gaitOf(v,this.spdMul||1); const back=moving&&mf<-0.4, shuffle=moving&&!back&&Math.abs(ml)>0.72;
    const hsc=1.06*(p.hgt||70)/70; const Lw=G.L*(back?0.75:shuffle?0.65:1), Dd=Math.min(0.68,Lw/G.cw), Ls=Lw/hsc; /* body units are scaled by height, the turf is not */ const ph01=((ph/(2*Math.PI))%1+1)%1; const along=[0,0];
    for(const i of [0,1]){ const sd=i?1:-1; const u=(ph01+(i?0.5:0))%1; let fp=0, h=0;
      if(moving){ if(u<Dd){ fp=Ls*(0.5-u/Dd); } else { const w=(u-Dd)/(1-Dd); fp=Ls*(-0.5+smooth(w)); h=G.h*(shuffle?0.45:back?0.6:1)*Math.sin(Math.PI*Math.pow(w,0.75)); } }
      along[i]=fp; let lf=sd*(0.1-0.02*Math.min(1,v/6))+fp*ml; if(lf*sd<0.04) lf=sd*0.04;
      Fs(i, 0.02+fp*mf, h, lf); }
    // arms counter-swing with the opposite leg; elbows drive harder the faster he goes
    for(const i of [0,1]){ const sd=i?1:-1;
      if(moving){ const k=(0.42+0.035*v)*(back||shuffle?0.45:1); const hf=along[1-i]*k*Math.max(0.2,mf>0?1:0.6); Hs(i, 0.04+hf, 1.06+0.016*v+Math.max(0,hf)*0.32, sd*(shuffle||back?0.32:0.25-0.012*v)); }
      else Hs(i,0.03,1.0,sd*0.27); }
    if(moving){ P.lift=G.lift*0.5*(1-Math.cos(4*Math.PI*(ph01-Dd/2))); for(const f of F) if(f.u===0) f.u=-P.lift; /* the bounce lifts the body, never the planted foot */ P.lean=(back?-0.05:shuffle?0.05:0.02+0.016*v)+clamp((p.acS||0)*0.012,-0.12,0.12); P.act='loco';
      P.rot=clamp(p.turnLean||0,-0.13,0.13); P.pivot=0.2; }
    else { P.hipU+=Math.sin(now/650+(p.seed||0))*0.006; P.act='idle'; } // breathing
    if(isRef){ if(p.ar){ if(p.flag==='up') Hs(1,0.04,2.3,0.12); else if(p.flag==='point') Hs(1,0.3,1.8,0.66); else Hs(1,0.08,0.96,0.3); } else if(p.card&&now-p.card.t<1600) Hs(1,0.12,2.2,0.3); return P; }
    const holding=this.hands&&this.own===p;
    // goalkeeper's set position: knees bent, weight forward, hands ready
    if(p.gk&&!moving&&!holding&&!p.dive&&!p.celeb&&Math.abs(this.ball.x-p.x)<40){ P.act='gkset'; P.hipU=0.68; Fs(0,0.02,0,-0.24); Fs(1,0.02,0,0.24); Hs(0,0.38,1.18,-0.34); Hs(1,0.38,1.18,0.34); P.lean=0.16; }
    /* penalty keeper: wide on his line, arms out, bouncing on his toes */
    if(p.penReady&&!p.dive&&!holding){ P.act='gkset'; const bo=Math.abs(Math.sin(now/170)); P.hipU=0.7+bo*0.03; P.lift=bo*0.04; Fs(0,0.04,0,-0.3); Fs(1,0.04,0,0.3); const fl=Math.sin(now/210)*0.1; Hs(0,0.22,1.28+fl,-0.72); Hs(1,0.22,1.28-fl,0.72); P.lean=0.13; P.headTilt=0.05; }
    if(p.hipsHands&&!moving){ P.act='hips'; Hs(0,-0.02,1.02,-0.38); Hs(1,-0.02,1.02,0.38); P.lean=-0.03; P.hipU+=Math.sin(now/420)*0.008; }
    const fpT=now-(p.fistT||-9e9); if(fpT>=0&&fpT<1300&&!p.dive){ const w=Math.min(1,fpT/160)*(fpT>1100?1-(fpT-1100)/200:1); Hs(1,lerp(Hn[1].f,0.12,w),lerp(Hn[1].u,2.18,w),lerp(Hn[1].l,0.3,w)); Hs(0,lerp(Hn[0].f,0.3,w),lerp(Hn[0].u,1.25,w),-0.3); P.headTilt=-0.18*w; P.mouth=true; }
    if(holding){ P.act='hold'; Hs(0,0.3,1.16,-0.12); Hs(1,0.3,1.12,0.12); if(p.gatherT!=null&&now-p.gatherT<Math.max(120,this.D(260))){ P.lean=0.35; P.hipU=0.7; } }
    // strikes: backswing, contact, follow-through; contact is the frame the ball leaves the boot
    const kt=now-(p.kickT||-9e9), W=p.kickW||0, Fd=p.kickF||260, kk=p.kickK; const kicking=kt>=0&&kt<W+Fd&&kk&&kk!=='head'&&kk!=='throw';
    if(kicking){ P.act='kick'; P.rot=0; const big=kk==='shot'||kk==='loft';
      const back={f:-0.46,u:big?0.5:0.3}, con={f:0.3,u:0.1}, top={f:big?0.62:0.48,u:big?0.9:0.42}, rest={f:0.06,u:0};
      let ff,fu,lb;
      if(kt<W){ const b=smooth(kt/W); ff=lerp(0.04,back.f,b); fu=lerp(0,back.u,b); lb=b; P.lean=-0.06*b*(big?1:0.5); Fs(0,lerp(0.02,0.2,b),0,-0.13); P.hipU=0.8-0.04*b; P.lift=0; }
      else { const u=(kt-W)/Fd; const from=W>0?back:{f:-0.12,u:0.15};
        if(u<0.18){ const q=u/0.18; ff=lerp(from.f,con.f,q); fu=lerp(from.u,con.u,q); }
        else if(u<0.5){ const q=smooth((u-0.18)/0.32); ff=lerp(con.f,top.f,q); fu=lerp(con.u,top.u,q); }
        else { const q=smooth((u-0.5)/0.5); ff=lerp(top.f,rest.f,q); fu=lerp(top.u,rest.u,q); }
        lb=1-smooth(u); P.lean=(big?0.12:0.06)*Math.sin(Math.min(1,u*1.6)*Math.PI); Fs(0,lerp(0.2,0.04,smooth(u)),0,-0.13); P.lift=0; }
      F[1]={f:ff,u:fu,l:0.06};
      // the arm opposite the kicking leg swings out wide for balance, the other one back
      Hn[0]={f:lerp(Hn[0].f,0.22,lb),u:lerp(Hn[0].u,1.42,lb),l:lerp(Hn[0].l,-0.62,lb)}; Hn[1]={f:lerp(Hn[1].f,-0.32,lb),u:lerp(Hn[1].u,1.18,lb),l:lerp(Hn[1].l,0.36,lb)}; }
    // a dribbling touch: a quick prod with the front foot
    const tt=now-(p.touchT||-9e9), TD=Math.max(70,this.D(170)); if(tt>=0&&tt<TD&&!kicking){ const w=Math.sin(tt/TD*Math.PI); F[1]={f:lerp(F[1].f,0.36,w),u:lerp(F[1].u,0.07,w),l:F[1].l}; }
    // the keeper's throw: ball taken back over the head, then released forward
    if(kk==='throw'&&kt>=0&&kt<W+Fd){ P.act='throw'; if(kt<W){ const b=smooth(kt/W); Hs(0,lerp(0.3,-0.2,b),lerp(1.16,2.15,b),-0.12); Hs(1,lerp(0.3,-0.12,b),lerp(1.12,2.2,b),0.12); P.lean=-0.12*b; Fs(0,0.25*b,0); }
      else { const u=(kt-W)/Fd, q=smooth(Math.min(1,u*2)); Hs(0,lerp(-0.2,0.55,q),lerp(2.15,1.5,q),-0.1); Hs(1,lerp(-0.12,0.5,q),lerp(2.2,1.45,q),0.1); P.lean=lerp(-0.12,0.22,q)*(1-smooth((u-0.5)*2)); } }
    // headers: leap with knees tucked and arms up, then nod through the ball
    const jt=now-(p.jumpT||-9e9), JD=Math.max(260,this.D(560)); if(jt>=0&&jt<JD){ P.act='head'; P.rot=0; const u=jt/JD, w=Math.sin(u*Math.PI); P.lift=w*0.72; Fs(0,-0.12,0.28*w); Fs(1,0.06,0.2*w); Hs(0,0.3,1.72,-0.42); Hs(1,0.3,1.72,0.42); P.lean=0.3*Math.sin(clamp((u-0.35)/0.45,0,1)*Math.PI)-0.08*w; P.headTilt=0.3*Math.sin(clamp((u-0.4)/0.4,0,1)*Math.PI); }
    /* the nod: neck and shoulders snap forward through the ball, eyes open */
    const ndT=now-(p.nodT||-9e9), ND=Math.max(130,this.D(280)); if(ndT>=0&&ndT<ND){ const w=Math.sin(ndT/ND*Math.PI); P.headTilt=(P.headTilt||0)+0.55*w; P.lean=(P.lean||0)+0.22*w; Hs(0,0.12,1.5,-0.5); Hs(1,0.12,1.5,0.5); if(P.act!=='head') P.act='head'; }
    // keeper dive: body flat, arms stretched beyond the head, legs together
    if(p.dive&&now>=p.dive.t){ p._dv=p.dive.dir*(p.x>52.5?1:-1); const t=clamp((now-p.dive.t)/240,0,1); const e=1-Math.pow(1-t,2.2); P.rot=p._dv*1.3*e; P.act='dive'; P.pivot=0.55; P.lift=Math.sin(t*Math.PI)*0.5; Fs(0,0,0,-0.07); Fs(1,0,0.04,0.07); Hs(0,0.06,2.45,-0.14); Hs(1,0.06,2.45,0.14); P.lean=0; P.hipU=0.8; }
    // slide tackle: hip down, front leg driving through, trailing leg folded, a hand on the turf
    const slT=now-(p.slideT||-9e9); if(slT>=0&&slT<520){ P.act='slide'; P.rot=0; const t=slT/520, k2=t<0.2?t/0.2:t<0.7?1:1-(t-0.7)/0.3; P.hipU=lerp(0.8,0.32,k2); P.lean=-0.5*k2; P.lift=0; Fs(1,lerp(0.04,0.88,k2),0.04*k2,0.08); Fs(0,lerp(0.02,-0.1,k2),0,-0.14); Hs(0,lerp(Hn[0].f,-0.45,k2),lerp(Hn[0].u,0.6,k2),-0.38); Hs(1,0.35,1.25,0.32); }
    // knocked off balance, stays on his feet
    const trT=now-(p.trip||-9e9); if(trT>=0&&trT<420){ P.act='trip'; P.rot=(Math.cos(p.yaw||0)>=0?1:-1)*0.38*Math.sin(trT/420*Math.PI); Hs(0,0.3,1.6,-0.6); Hs(1,-0.2,1.5,0.6); }
    // fouled: goes down, then gets up
    const flT=now-(p.fallT||-9e9); if(flT>=0&&flT<1100){ P.act='fall'; const t=flT/1100; const k2=t<0.25?t/0.25:t<0.7?1:1-(t-0.7)/0.3; P.rot=(Math.cos(p.yaw||0)>=0?1:-1)*1.35*easeOut(k2); P.pivot=0; P.lift=0; Hs(0,0.45,1.3,-0.2); Hs(1,0.5,1.2,0.2); }
    else if(p._dv){ p.upT=now; p.upDir=p._dv; p._dv=null; }
    /* back up after a dive: roll onto a knee, push off the turf, stand */
    const uT=now-(p.upT||-9e9), UD=Math.max(260,this.D(650)); if(uT>=0&&uT<UD&&!p.dive){ const t=uT/UD; const a=smooth(Math.min(1,t/0.55)), b=smooth(clamp((t-0.35)/0.65,0,1)); P.rot=p.upDir*1.3*(1-a)*0.9; P.pivot=0.45; P.lift=0; P.hipU=lerp(0.34,0.8,b); P.lean=0.25*(1-b);
      Fs(0,lerp(-0.25,0.02,b),0,-0.14); Fs(1,lerp(0.32,0.02,b),0,0.14); Hs(0,lerp(0.35,0.03,b),lerp(0.35,1.0,b),-0.3); Hs(1,lerp(0.3,0.03,b),lerp(0.45,1.0,b),0.3); P.act='getup'; }
    if(p.sad&&!p.celeb){ P.act='sad'; Hs(0,0.08,1.97,-0.1); Hs(1,0.08,1.98,0.1); P.headTilt=0.35; P.lean=moving?0.05:0.12; }
    if(p.celeb){ P.act='celeb'; P.rot=0; this.celebPose(p,P,moving); }
    return P;
  }
  /* signature celebrations: each one is a pose over time (T = ms since it began; -1 while he is still running to his spot) */
  celebPose(p,P,moving){
    const now=this.now, F=P.feet; const Hs=(i,f,u,l)=>{ P.hands[i]={f,u,l:l==null?(i?1:-1)*0.27:l}; }, Fs=(i,f,u,l)=>{ F[i]={f,u,l:l==null?(i?1:-1)*0.1:l}; };
    const type=p.celebType||'classic'; const T=p.celebT!=null? now-p.celebT : -1; const sd=p.seed||0; const bounce=(f,a)=>Math.abs(Math.sin(now/f+sd))*a;
    P.mouth=true;
    if(T<0&&moving&&type!=='airplane'&&type!=='mob'){ Hs(1,0.2,2.15,0.24); Hs(0,-0.2,1.3,-0.3); return; } // racing away, finger to the sky
    switch(type){
      case 'mob': if(moving){ Hs(0,0.1,2.05,-0.32); Hs(1,0.1,2.1,0.32); } else { P.lift=bounce(170,0.3); Hs(0,0.12,2.22,-0.34); Hs(1,0.12,2.25,0.36); } P.lean=0; break;
      case 'airplane': Hs(0,0.04,1.52,-0.98); Hs(1,0.04,1.48,0.98); P.rot=Math.sin(now/260+sd)*0.17; P.pivot=1.1; P.lean=moving?0.16:0.04; break;
      case 'kneeslide': P.hipU=0.47; Fs(0,-0.44,0,-0.13); Fs(1,-0.34,0,0.13); P.lean=-0.3; P.lift=0; Hs(0,0.1,2.2,-0.62); Hs(1,0.1,2.25,0.62); P.headTilt=-0.35; break;
      case 'flag': { const b=Math.sin(T/140); P.rot=b*0.1; P.pivot=0.8; P.lift=Math.abs(Math.cos(T/140))*0.12; Fs(0,0.05+0.12*b,Math.max(0,b)*0.25,-0.16); Fs(1,0.05-0.12*b,Math.max(0,-b)*0.25,0.16); Hs(0,0.22,1.35+0.25*b,-0.4); Hs(1,0.22,1.35-0.25*b,0.4); P.lean=0; break; }
      case 'shush': Hs(1,0.2,1.8,0.04); Hs(0,0.03,1.0,-0.27); P.lean=0.08; Fs(0,-0.06,0,-0.14); Fs(1,0.1,0,0.14); P.headTurn=Math.sin(T/700)*0.5; P.mouth=false; break;
      case 'backflip': { const D=Math.max(500,this.D(950)), u=T/D; const fw=Math.cos(p.yaw||0)>=0?1:-1;
        if(u<0.18){ const q=u/0.18; P.hipU=lerp(0.8,0.55,q); Hs(0,-0.35*q,1.0,-0.3); Hs(1,-0.4*q,1.05,0.3); P.lean=0.25*q; }
        else if(u<0.86){ const q=(u-0.18)/0.68; P.lift=Math.sin(q*Math.PI)*1.2; P.rot=-fw*Math.PI*2*smooth(q); P.pivot=0.95; Fs(0,0.12,0.42,-0.1); Fs(1,0.2,0.45,0.1); Hs(0,0.28,0.95,-0.16); Hs(1,0.32,0.98,0.16); P.hipU=0.82; }
        else if(u<1){ const q=(u-0.86)/0.14; P.hipU=lerp(0.55,0.8,q); Hs(0,0.1,1.2+q,-0.3-0.1*q); Hs(1,0.1,1.2+q,0.3+0.1*q); }
        else { Hs(0,0.1,2.2,-0.42); Hs(1,0.1,2.25,0.45); P.lift=bounce(200,0.12); } break; }
      case 'salute': Fs(0,0,0,-0.05); Fs(1,0,0,0.05); Hs(1,0.17,1.95,0.12); Hs(0,0.02,1.0,-0.24); P.lean=-0.04; P.mouth=false; break;
      case 'heart': { const q=smooth(T/450); Hs(0,lerp(0.24,0.16,q),lerp(1.42,2.22,q),-0.07); Hs(1,lerp(0.24,0.16,q),lerp(1.42,2.22,q),0.07); P.prop='heart'; P.lean=-0.05*q; break; }
      case 'robot': { const k=Math.floor(T/230)%4; const H=[[0.36,1.5,-0.3,0.02,1.02,0.27],[0.02,1.02,-0.27,0.36,1.5,0.3],[0.36,1.78,-0.3,0.36,1.25,0.3],[0.1,1.72,-0.5,0.3,1.5,0.4]][k]; Hs(0,H[0],H[1],H[2]); Hs(1,H[3],H[4],H[5]); Fs(0,k%2?-0.08:0,0,-0.12); Fs(1,k%2?0.04:0.12,0,0.12); P.lean=0; P.headTurn=[0,0.4,0,-0.4][k]; P.mouth=false; break; }
      case 'badge': if(T<Math.max(500,this.D(900))){ Hs(1,0.2,1.42,-0.06); Hs(0,0.12,1.4,-0.2); P.headTilt=0.45; P.lean=0.12; } else { Hs(1,0.2,1.42,-0.06); Hs(0,0.1,2.3,-0.32); P.headTilt=-0.15; } break;
      default: if(T<0){ Hs(1,0.2,2.15,0.24); break; } P.lift=bounce(160,0.32); Hs(1,0.14,2.3,0.22); Hs(0,-0.12,1.55+Math.abs(Math.sin(now/160+sd))*0.2,-0.36);
    } }
  /* poses never pop: each joint target eases toward the new pose over a few frames (fast enough to keep strikes crisp) */
  blendPose(p,P){ const now=this.now, prev=p._pose, dt=prev?Math.min(0.2,(now-p._poseT)/1000):0; p._poseT=now;
    if(P.act!==p._act){ p._act=P.act; p._actT=now; }
    if(!prev||dt<=0||this.rm){ p._pose=P; return P; } const trans=now-(p._actT||0)<Math.max(140,this.D(260));
    const k=trans? 1-Math.exp(-dt*15*Math.max(1,this.spdMul||1)) : 1-Math.exp(-dt*60); const L=(a,b)=>a+(b-a)*k;
    const Q={...P,hipU:L(prev.hipU,P.hipU),lean:L(prev.lean,P.lean),headTilt:L(prev.headTilt,P.headTilt),headTurn:L(prev.headTurn,P.headTurn),rot:L(prev.rot||0,P.rot||0),lift:L(prev.lift||0,P.lift||0),pivot:L(prev.pivot||0,P.pivot||0)};
    if(!trans&&P.act==='loco'){ Q.feet=P.feet; Q.hands=P.hands.map((h,i)=>({f:L(prev.hands[i].f,h.f),u:L(prev.hands[i].u,h.u),l:L(prev.hands[i].l,h.l)})); p._pose=Q; return Q; }
    Q.feet=P.feet.map((f,i)=>({f:L(prev.feet[i].f,f.f),u:L(prev.feet[i].u,f.u),l:L(prev.feet[i].l,f.l)})); Q.hands=P.hands.map((h,i)=>({f:L(prev.hands[i].f,h.f),u:L(prev.hands[i].u,h.u),l:L(prev.hands[i].l,h.l)}));
    p._pose=Q; return Q; }
  /* draw one figure: solve the skeleton, sort limbs by depth, paint */
  drawFigure(g,p,kit,isRef){
    const [x,y,k]=this.proj(p.x,p.y); if(x<-40||x>this.W+40) return;
    const L=p.look||defaultLook('ref',12); const skin=isRef?'#c68a5c':LOOK.skin[L.skin]||LOOK.skin[3]; const hair=isRef?'#2b1a10':LOOK.hairCol[L.hairCol]||'#111';
    const bootC=isRef?'#111':LOOK.boots[L.boots]||'#111'; const B=isRef?1:({lean:.9,average:1,stocky:1.14}[L.build]||1);
    const s=k*((p.hgt||70)/70)*1.06; const skinD=mix(skin,'#000000',0.22); const P=this.blendPose(p,this.poseOf(p,isRef));
    const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw; const ca=Math.cos(yaw), sa=Math.sin(yaw);
    const DEP=this.depthK!=null?this.depthK:clamp((this.H*0.705/68)/Math.max(1,k),0.12,0.45); // how far a metre of depth moves on screen
    // body frame → screen (relative to the feet), and the upper-body lean about the hips
    const lean=P.lean, cl=Math.cos(lean), sl=Math.sin(lean), hipU=P.hipU;
    const up=(f,u,l)=>{ if(u<=hipU) return [f,u,l]; const du=u-hipU; return [f*cl+du*sl, hipU+du*cl-f*sl, l]; };
    const pr=([f,u,l])=>{ const dx=f*ca-l*sa, dy=f*sa+l*ca; return [dx*s, -u*s+dy*s*DEP, dy]; };
    // shadow (shrinks as he leaves the ground) + possession ring
    const sh=Math.max(0.35,1-P.lift/1.4); const spread=Math.abs(P.feet[1].f-P.feet[0].f);
    g.fillStyle=`rgba(0,0,0,${0.32*sh})`; g.beginPath(); g.ellipse(x+0.12*s,y,(0.36+spread*0.3*Math.abs(ca)+0.08*Math.abs(sa))*s*sh,0.14*s*sh,0,0,7); g.fill();
    if(p===this.own&&!isRef){ g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=Math.max(1.2,s*0.04); g.beginPath(); g.ellipse(x,y,0.72*s,0.24*s,0,0,7); g.stroke(); }
    g.save(); g.translate(x,y-P.lift*s); if(P.rot){ g.translate(0,-P.pivot*s); g.rotate(P.rot); g.translate(0,P.pivot*s); } g.lineCap='round'; g.lineJoin='round';
    const ln=(a,b)=>{ g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke(); };
    const ol=Math.max(0.7,s*0.028);
    // skeleton
    const legs=[0,1].map(i=>{ const sd=i?1:-1; const hip=[0,hipU,sd*0.09*B]; const ft=P.feet[i]; const tgt=[ft.f,ft.u+0.06,ft.l];
      const J=ik3(hip,tgt,0.43,0.43,v186LegPole(tgt[0],tgt[1],sd)); return {i,hip:pr(hip),knee:pr(J.j),ank:pr(J.t),raw:J}; });
    const arms=[0,1].map(i=>{ const sd=i?1:-1; const sh0=up(0,1.5,sd*0.21*B); const hd=P.hands[i]; const tgt=up(hd.f,hd.u,hd.l);
      const J=ik3(sh0,tgt,0.3,0.29,[-0.7,-0.5,sd*0.6]); return {i,sh:pr(sh0),el:pr(J.j),hand:pr(J.t)}; });
    const legD=l=>(l.hip[2]+l.knee[2]+l.ank[2])/3, armD=a=>(a.sh[2]+a.el[2]+a.hand[2])/3+0.02;
    // paint helpers
    const drawLeg=lg=>{ const near=lg.hip[2]+lg.ank[2]>=0; const c1=near?skin:skinD;
      g.strokeStyle=c1; g.lineWidth=0.165*s*B; ln(lg.hip,lg.knee);
      if(s>12&&!isRef){ /* a soft highlight down the front of the thigh and a knee cap */ const hx=-0.03*s; g.strokeStyle=near?'rgba(255,255,255,.16)':'rgba(255,255,255,.07)'; g.lineWidth=0.05*s*B; ln([lerp(lg.hip[0],lg.knee[0],0.35)+hx,lerp(lg.hip[1],lg.knee[1],0.35)],[lg.knee[0]+hx*0.6,lg.knee[1]-0.02*s]); g.fillStyle=near?mix(skin,'#000000',0.1):mix(skinD,'#000000',0.08); g.beginPath(); g.arc(lg.knee[0],lg.knee[1],0.07*s*B,0,7); g.fill(); }
      g.strokeStyle=near?kit.socks:mix(kit.socks,'#000000',0.22); g.lineWidth=0.14*s*B; ln(lg.knee,lg.ank);
      const ang=Math.atan2(lg.ank[1]-lg.knee[1],lg.ank[0]-lg.knee[0]); const qx=-Math.sin(ang), qy=Math.cos(ang); const at=t=>[lerp(lg.knee[0],lg.ank[0],t),lerp(lg.knee[1],lg.ank[1],t)];
      const band=(t0,t1,c,w)=>{ g.strokeStyle=c; g.lineWidth=w; g.lineCap='butt'; ln(at(t0),at(t1)); g.lineCap='round'; };
      if(!isRef&&s>7){ const tr=near?(kit.trim||kit.num):mix(kit.trim||kit.num,'#000000',0.22); const sp=kit.sockPat||'plain';
        if(sp==='top') band(0,0.2,tr,0.142*s*B); else if(sp==='hoops'){ band(0.06,0.16,tr,0.142*s*B); band(0.3,0.4,tr,0.142*s*B); band(0.54,0.64,tr,0.142*s*B); }
        else if(sp==='stripes'){ band(0.1,0.14,tr,0.142*s*B); band(0.2,0.24,tr,0.142*s*B); }
        /* shin guard bulge and a fold at the top of the sock */
        g.strokeStyle='rgba(255,255,255,.16)'; g.lineWidth=0.035*s; ln([at(0.25)[0]-qx*0.025*s,at(0.25)[1]-qy*0.025*s],[at(0.7)[0]-qx*0.025*s,at(0.7)[1]-qy*0.025*s]);
        g.strokeStyle='rgba(0,0,0,.22)'; g.lineWidth=0.022*s; const f0=at(sp==='top'?0.21:0.17); ln([f0[0]-qx*0.07*s,f0[1]-qy*0.07*s],[f0[0]+qx*0.07*s,f0[1]+qy*0.07*s]); }
      else { const b0=at(0.18); g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=0.03*s; ln([b0[0]-qx*0.07*s,b0[1]-qy*0.07*s],[b0[0]+qx*0.07*s,b0[1]+qy*0.07*s]); }
      // boot: points the way he faces, foreshortened when he faces the camera
      const toeX=ca, toeY=sa*DEP; const bl=Math.max(0.35,Math.hypot(toeX,toeY)); const bang=Math.atan2(toeY,toeX)+(P.bootT&&P.bootT[lg.i]!=null?(Math.cos(yaw)>=0?1:-1)*P.bootT[lg.i]:lg.raw.t[1]>0.12?(Math.cos(yaw)>=0?1:-1)*0.5*clamp((lg.raw.t[1]-0.12)*2,0,1):0);
      g.save(); g.translate(lg.ank[0],lg.ank[1]+0.03*s); g.rotate(bang); g.fillStyle=near?bootC:mix(bootC,'#000000',0.25); g.beginPath(); g.ellipse(0.055*s*bl,0.01*s,0.13*s*bl,0.058*s,0,0,7); g.fill();
      g.fillStyle='rgba(255,255,255,.22)'; g.fillRect(-0.02*s*bl,-0.015*s,0.12*s*bl,0.016*s);
      if(s>18){ g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0.1*s*bl,-0.035*s); g.quadraticCurveTo(0.03*s*bl,0.0,-0.04*s*bl,0.03*s); g.lineTo(-0.02*s*bl,0.035*s); g.quadraticCurveTo(0.05*s*bl,0.005*s,0.12*s*bl,-0.025*s); g.fill(); /* the swoosh-free side stripe of a boot */ g.fillStyle='rgba(0,0,0,.45)'; for(const sx of [-0.04,0.03,0.1]){ g.beginPath(); g.arc(sx*s*bl,0.06*s,0.011*s,0,7); g.fill(); } }
      g.restore(); };
    const drawArm=a=>{ const near=a.sh[2]+a.hand[2]>=-0.02; const sleeve=L.sleeves==='long'||isRef||p.gk||kit.sleeve==='long'; const armC=near?skin:skinD; const sc0=isRef?kit.shirt:(kit.sleeveC||kit.shirt); const shirt=near?sc0:mix(sc0,'#000000',0.3);
      const AL=(u,v,t)=>[lerp(u[0],v[0],t),lerp(u[1],v[1],t)]; const mid=AL(a.sh,a.el,0.55);
      g.strokeStyle=sleeve?shirt:armC; g.lineWidth=0.12*s*B; ln(a.sh,a.el); ln(a.el,a.hand);
      if(!sleeve){ g.strokeStyle=shirt; g.lineWidth=0.155*s*B; ln(a.sh,mid); }
      if(!isRef&&s>9){ const tr=near?(kit.trim||kit.num):mix(kit.trim||kit.num,'#000000',0.3); g.lineCap='butt';
        if(kit.sleeve==='cuffs'&&!sleeve){ g.strokeStyle=tr; g.lineWidth=0.158*s*B; ln(AL(a.sh,a.el,0.45),mid); }
        if(sleeve&&!p.gk){ g.strokeStyle=tr; g.lineWidth=0.124*s*B; ln(AL(a.el,a.hand,0.8),AL(a.el,a.hand,0.9)); }
        if(kit.sleeve==='stripe'){ const ux=a.el[0]-a.sh[0], uy=a.el[1]-a.sh[1], ul=Math.hypot(ux,uy)||1; const ox=-uy/ul*0.03*s, oy=ux/ul*0.03*s; const e=sleeve?a.el:mid; g.strokeStyle=tr; g.lineWidth=Math.max(0.6,0.022*s);
          for(const k2 of [-1,1]){ ln([a.sh[0]+ox*k2,a.sh[1]+oy*k2],[e[0]+ox*k2,e[1]+oy*k2]); } }
        g.lineCap='round';
        /* sleeve shading on the underside */
        g.strokeStyle='rgba(0,0,0,.16)'; g.lineWidth=0.04*s; const e2=sleeve?a.el:mid; ln([a.sh[0]+0.03*s,a.sh[1]+0.02*s],[e2[0]+0.03*s,e2[1]+0.02*s]); }
      if(p.gk&&!isRef){ g.fillStyle='#f4f4f4'; g.beginPath(); g.arc(a.hand[0],a.hand[1],0.085*s,0,7); g.fill(); g.fillStyle=kit.shirt; g.fillRect(a.hand[0]-0.06*s,a.hand[1]-0.01*s,0.12*s,0.025*s); }
      else { g.fillStyle=armC; g.beginPath(); g.arc(a.hand[0],a.hand[1],0.055*s,0,7); g.fill(); if(L.tape&&!isRef){ g.strokeStyle='#f2f2f2'; g.lineWidth=0.06*s; ln([lerp(a.el[0],a.hand[0],0.72),lerp(a.el[1],a.hand[1],0.72)],[lerp(a.el[0],a.hand[0],0.86),lerp(a.el[1],a.hand[1],0.86)]); } } };
    // torso + shorts: a box whose screen width comes from its true width and depth at this heading
    const hwOf=(wl,wd)=>(wl*Math.abs(sa)+wd*Math.abs(ca))*B*s;
    const drawShorts=()=>{ const a=pr([0,1.04,0]), b2=pr([0,0.74,0]); const hw=hwOf(0.25,0.15);
      g.fillStyle=kit.shorts; g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=ol; g.beginPath(); g.moveTo(a[0]-hw,a[1]); g.lineTo(a[0]+hw,a[1]); g.lineTo(b2[0]+hw*1.05,b2[1]); g.lineTo(b2[0]-hw*1.05,b2[1]); g.closePath(); g.fill(); g.stroke();
      if(Math.abs(sa)>0.35){ g.beginPath(); g.moveTo(b2[0],b2[1]); g.lineTo(lerp(a[0],b2[0],0.7),lerp(a[1],b2[1],0.7)); g.stroke(); }
      if(!isRef&&s>8&&kit.shortsPat&&kit.shortsPat!=='plain'){ g.strokeStyle=kit.trim||kit.num; g.lineCap='butt'; g.lineWidth=(kit.shortsPat==='panel'?0.09:0.035)*s;
        if(Math.abs(sa)<0.55){ for(const k2 of [-1,1]){ ln([a[0]+k2*hw*0.9,a[1]],[b2[0]+k2*hw*0.96,b2[1]]); } } else { ln([lerp(a[0],b2[0],0.02),a[1]],[b2[0],b2[1]]); } g.lineCap='round'; }
      if(s>24){ const sg=g.createLinearGradient(a[0]-hw,0,a[0]+hw,0); sg.addColorStop(0,'rgba(0,0,0,.22)'); sg.addColorStop(0.45,'rgba(0,0,0,0)'); sg.addColorStop(0.7,'rgba(255,255,255,.08)'); sg.addColorStop(1,'rgba(0,0,0,.15)'); g.fillStyle=sg; } else g.fillStyle='rgba(0,0,0,.08)';
      g.beginPath(); g.moveTo(a[0]-hw,a[1]); g.lineTo(a[0]+hw,a[1]); g.lineTo(b2[0]+hw*1.05,b2[1]); g.lineTo(b2[0]-hw*1.05,b2[1]); g.closePath(); g.fill();
      g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(a[0]-hw,a[1],hw*2,0.05*s); };
    const drawTorso=()=>{ const top=pr(up(0,1.64,0)), wst=pr(up(0,0.98,0)); const ht=hwOf(0.31,0.14), hb=hwOf(0.25,0.13);
      const vx=top[0]-wst[0], vy=top[1]-wst[1], vl=Math.hypot(vx,vy)||1; const nx=-vy/vl, ny=vx/vl; // across the chest
      const P1=[top[0]-nx*ht,top[1]-ny*ht], P2=[top[0]+nx*ht,top[1]+ny*ht], P3=[wst[0]+nx*hb,wst[1]+ny*hb], P4=[wst[0]-nx*hb,wst[1]-ny*hb];
      const tpath=()=>{ g.beginPath(); g.moveTo(P1[0]+vx/vl*-0.08*s,P1[1]+vy/vl*-0.08*s); g.quadraticCurveTo(P1[0],P1[1],P1[0]+nx*0.07*s,P1[1]+ny*0.07*s); g.lineTo(P2[0]-nx*0.07*s,P2[1]-ny*0.07*s); g.quadraticCurveTo(P2[0],P2[1],P2[0]-vx/vl*0.08*s,P2[1]-vy/vl*0.08*s); g.lineTo(P3[0],P3[1]); g.lineTo(P4[0],P4[1]); g.closePath(); };
      const front=sa, side=Math.abs(ca);
      tpath(); g.fillStyle=kit.shirt; g.fill();
      g.save(); tpath(); g.clip();
      if(!isRef&&kit.pat&&kit.pat!=='plain'&&s>4){ const mf=front>=0?-1:1; const TP=(a2,h2)=>{ const hw2=lerp(hb,ht,h2); return [wst[0]+vx*h2+nx*a2*hw2, wst[1]+vy*h2+ny*a2*hw2]; }; paintKitPattern(g,kit,TP,mf); }
      /* fabric shading: a soft key light from the upper left, a darker hem, and creases that move with his stride */
      if(s>24){ const tg=g.createLinearGradient(P1[0],P1[1],P2[0],P2[1]); tg.addColorStop(0,'rgba(0,0,0,.3)'); tg.addColorStop(0.32,'rgba(0,0,0,0)'); tg.addColorStop(0.64,'rgba(255,255,255,.13)'); tg.addColorStop(1,'rgba(0,0,0,.14)'); g.fillStyle=tg; tpath(); g.fill();
        const vg=g.createLinearGradient(top[0],top[1],wst[0],wst[1]); vg.addColorStop(0,'rgba(255,255,255,.07)'); vg.addColorStop(0.65,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.2)'); g.fillStyle=vg; tpath(); g.fill(); }
      else { /* far from the camera: the same light in two flat strokes, no gradients */ g.fillStyle='rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(P1[0],P1[1]); g.lineTo(lerp(P1[0],P2[0],0.28),lerp(P1[1],P2[1],0.28)); g.lineTo(lerp(P4[0],P3[0],0.28),lerp(P4[1],P3[1],0.28)); g.lineTo(P4[0],P4[1]); g.fill(); }
      if(s>15&&!isRef){ const sw=Math.sin((p.ph||0))*(p.spd>0.5?1:0.2); g.strokeStyle='rgba(0,0,0,.15)'; g.lineWidth=Math.max(0.7,0.025*s);
        for(const k2 of [-1,1]){ const a0=[lerp(P1[0],P2[0],k2<0?0.12:0.88)+vx*-0.12, lerp(P1[1],P2[1],k2<0?0.12:0.88)+vy*-0.12]; const b0=[wst[0]+nx*k2*hb*0.25+nx*sw*0.04*s, wst[1]+ny*k2*hb*0.25+0.02*s]; g.beginPath(); g.moveTo(a0[0],a0[1]); g.quadraticCurveTo(lerp(a0[0],b0[0],0.5)+nx*k2*0.05*s, lerp(a0[1],b0[1],0.5), b0[0],b0[1]); g.stroke(); } }
      g.restore(); tpath(); g.strokeStyle='rgba(0,0,0,.4)'; g.lineWidth=ol; g.stroke();
      const numDraw=(txt,x2,y2,px,sx)=>{ g.save(); g.translate(x2,y2); g.scale(sx,1); g.font=`800 ${Math.round(px)}px "JetBrains Mono",monospace`; g.textAlign='center'; g.textBaseline='middle';
        const st2=kit.numStyle; if(st2==='shadow'){ g.fillStyle='rgba(0,0,0,.45)'; g.fillText(txt,px*0.06,px*0.06); }
        if(st2==='outline'||(KIT_COVER[kit.pat]||0)>=0.3){ g.strokeStyle=st2==='outline'&&kit.trim&&colorDist(kit.trim,kit.num)>60?kit.trim:contrastOn(kit.num); g.lineWidth=Math.max(1,px*0.12); g.lineJoin='round'; g.strokeText(txt,0,0); }
        g.fillStyle=kit.num; g.fillText(txt,0,0); g.restore(); };
      /* collar: crew, V, polo or wrap-over, in the trim colour */
      const trim=isRef?'#f5c518':(kit.trim||kit.num);
      if(front>0.15){ const c=pr(up(0.14,1.62,0)); const w=0.085*s*front; g.globalAlpha=Math.min(1,front*2)*0.95; g.fillStyle=trim; g.strokeStyle=trim; const cl=isRef?'v':(kit.collar||'v');
        if(cl==='crew'){ g.lineWidth=Math.max(1,0.04*s); g.beginPath(); g.ellipse(c[0],c[1]+0.005*s,w*1.05,0.035*s,0,0,Math.PI); g.stroke(); }
        else if(cl==='polo'){ g.beginPath(); g.moveTo(c[0]-w*1.2,c[1]-0.01*s); g.lineTo(c[0]-w*0.1,c[1]+0.07*s); g.lineTo(c[0]-w*0.45,c[1]+0.11*s); g.closePath(); g.fill(); g.beginPath(); g.moveTo(c[0]+w*1.2,c[1]-0.01*s); g.lineTo(c[0]+w*0.1,c[1]+0.07*s); g.lineTo(c[0]+w*0.45,c[1]+0.11*s); g.closePath(); g.fill(); g.lineWidth=Math.max(0.7,0.02*s); ln([c[0],c[1]+0.06*s],[c[0],c[1]+0.16*s]); }
        else if(cl==='wrap'){ g.lineWidth=Math.max(1,0.035*s); ln([c[0]-w,c[1]],[c[0]+w*0.35,c[1]+0.11*s]); ln([c[0]+w,c[1]],[c[0]-w*0.35,c[1]+0.11*s]); }
        else { g.beginPath(); g.moveTo(c[0]-w,c[1]); g.lineTo(c[0]+w,c[1]); g.lineTo(c[0],c[1]+0.1*s); g.closePath(); g.fill(); if(!isRef){ g.fillStyle=mix(skin,'#000000',0.1); g.beginPath(); g.moveTo(c[0]-w*0.6,c[1]); g.lineTo(c[0]+w*0.6,c[1]); g.lineTo(c[0],c[1]+0.065*s); g.closePath(); g.fill(); } }
        if(!isRef&&s>14){ const cr=pr(up(0.14,1.44,-0.12)); g.fillStyle=trim; g.beginPath(); g.ellipse(cr[0],cr[1],0.05*s*front,0.056*s,0,0,7); g.fill(); g.fillStyle=kit.shirt; g.beginPath(); g.ellipse(cr[0],cr[1],0.03*s*front,0.034*s,0,0,7); g.fill(); const nb=pr(up(0.14,1.44,0.12)); numDraw(String(p.num),nb[0],nb[1],0.13*s,front); } g.globalAlpha=1; }
      if(front<-0.3&&!isRef&&s>9){ const c=pr(up(-0.14,1.62,0)); g.strokeStyle=trim; g.lineWidth=Math.max(1,0.035*s); g.beginPath(); g.ellipse(c[0],c[1]+0.01*s,0.08*s*(-front),0.025*s,0,0,Math.PI); g.stroke(); }
      if(front<-0.15&&!isRef&&s>11){ const c=pr(up(-0.14,1.3,0)); numDraw(String(p.num),c[0],c[1],0.32*s,-front); }
      if(side>0.6&&!isRef&&s>13&&Math.abs(front)<0.5){ const c=pr(up(0,1.3,0)); g.globalAlpha=0.9; numDraw(String(p.num),c[0],c[1],0.26*s,side*0.55); g.globalAlpha=1; }
      if(isRef){ g.fillStyle='#f5c518'; const a=pr(up(0,1.5,0)); g.fillRect(a[0]-ht,a[1],0.05*s,0.4*s); }
      g.fillStyle='rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(P1[0],P1[1]); g.lineTo(lerp(P1[0],P2[0],0.3),lerp(P1[1],P2[1],0.3)); g.lineTo(lerp(P4[0],P3[0],0.3),lerp(P4[1],P3[1],0.3)); g.lineTo(P4[0],P4[1]); g.fill(); };
    const drawHead=()=>{ const hy0=yaw+P.headTurn; const hc=Math.cos(hy0), hs=Math.sin(hy0); const tilt=P.headTilt;
      const neckA=pr(up(0,1.62,0)), hcP=pr(up(0.02+tilt*0.05,1.86-Math.abs(tilt)*0.02,0)); const hr=0.165*s;
      g.strokeStyle=skinD; g.lineWidth=0.12*s; ln(neckA,[hcP[0],hcP[1]+hr*0.6]);
      const hx=hcP[0], hy=hcP[1]; const prof=(hc<0?-1:1)*Math.max(0.5,Math.abs(hc)); // hair art is drawn in profile, squeezed toward the camera
      g.save(); g.translate(hx,0); g.scale(prof,1); if(!isRef) this.hairBack(g,L,hair,hr,hy,s); g.restore();
      // ears at the sides of the head
      const ear=e=>{ const ex=hx+(-e*0.155*hs-0.02*hc)*s, ez=e*0.155*hc; return {ex,ez}; };
      const ears=[ear(-1),ear(1)];
      if(Math.abs(hs)>0.55) for(const E of ears){ g.fillStyle=skinD; g.beginPath(); g.ellipse(E.ex,hy+hr*0.08,hr*0.19,hr*0.27,0,0,7); g.fill(); }
      const hg=g.createRadialGradient(hx+hr*0.3*hc,hy-hr*0.3,hr*0.2,hx,hy,hr*1.1); hg.addColorStop(0,mix(skin,'#ffffff',0.12)); hg.addColorStop(1,skin);
      g.fillStyle=hg; g.beginPath(); g.ellipse(hx,hy,hr*0.94,hr,0,0,7); g.fill(); g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=ol*0.8; g.stroke();
      if(Math.abs(hs)<=0.55){ const E=ears[0].ez>ears[1].ez?ears[0]:ears[1]; g.fillStyle=skinD; g.beginPath(); g.ellipse(E.ex,hy+hr*0.08,hr*0.2,hr*0.27,0,0,7); g.fill(); }
      const faceVis=hs>-0.35;
      if(faceVis&&s>16){ // eyes, nose, mouth placed on the face surface for this heading
        for(const e of [-1,1]){ const dz=0.13*hs+e*0.06*hc; if(dz<-0.02) continue; const ex=hx+(0.13*hc-e*0.06*hs)*s; g.fillStyle='#1a1a1a'; g.beginPath(); g.arc(ex,hy-hr*0.06,hr*(0.08+0.03*Math.max(0,hs)),0,7); g.fill(); }
        g.strokeStyle=skinD; g.lineWidth=Math.max(0.6,hr*0.12);
        if(Math.abs(hc)>0.3){ const nx=hx+0.155*hc*s; ln([nx,hy+hr*0.02],[nx+0.025*hc*s,hy+hr*0.22]); } else { g.fillStyle=skinD; g.beginPath(); g.arc(hx,hy+hr*0.22,hr*0.07,0,7); g.fill(); }
        if(P.mouth&&p.celeb&&s>20){ g.fillStyle='#3a1414'; g.beginPath(); g.ellipse(hx+0.11*hc*s,hy+hr*0.47,hr*(0.12+0.08*Math.max(0,hs)),hr*0.13,0,0,7); g.fill(); }
        else if(s>24&&hs>0.3){ g.strokeStyle='rgba(60,20,20,.55)'; g.lineWidth=Math.max(0.6,hr*0.07); ln([hx-hr*0.15,hy+hr*0.45],[hx+hr*0.15,hy+hr*0.45]); } }
      g.save(); g.translate(hx,0); g.scale(prof,1);
      if(!isRef) this.hairFront(g,L,hair,hr,hy,s); else { g.fillStyle=hair; g.beginPath(); g.ellipse(0,hy-hr*0.5,hr*0.96,hr*0.52,0,Math.PI,0); g.fill(); }
      g.restore();
      // back of the head: the hair covers it
      if(hs<-0.3&&!isRef&&L.hair!=='bald'){ g.globalAlpha=clamp((-hs-0.3)*2.2,0,1)*(L.hair==='buzz'?0.7:1); g.fillStyle=hair; g.beginPath(); g.ellipse(hx,hy-hr*0.08,hr*(L.hair==='afro'?1.35:0.97),hr*(L.hair==='afro'?1.3:0.9),0,0,7); g.fill(); g.globalAlpha=1; }
      if(!isRef&&L.facial&&L.facial!=='none'&&s>18&&faceVis){ g.fillStyle=mix(hair,skin,0.35); g.globalAlpha=L.facial==='stubble'?0.45:0.9; g.beginPath(); const fx=hx+0.08*hc*s; if(L.facial==='mustache') g.ellipse(hx+0.12*hc*s,hy+hr*0.38,hr*(0.18+0.12*Math.abs(hs)),hr*0.08,0,0,7); else g.ellipse(fx,hy+hr*0.62,hr*(0.4+0.2*Math.abs(hs)),hr*0.3,0,0,Math.PI); g.fill(); g.globalAlpha=1; }
      if(!isRef&&LOOK.band[L.band]){ g.strokeStyle=LOOK.band[L.band]; g.lineWidth=hr*0.3; ln([hx-hr*0.94,hy-hr*0.34],[hx+hr*0.94,hy-hr*0.34]); }
      if(isRef&&p.card&&this.now-p.card.t<1600){ const h=arms[1].hand; g.fillStyle=p.card.c; g.strokeStyle='#000'; g.lineWidth=1; g.fillRect(h[0]-0.1*s,h[1]-0.36*s,0.22*s,0.3*s); g.strokeRect(h[0]-0.1*s,h[1]-0.36*s,0.22*s,0.3*s); } };
    const drawProp=()=>{ if(P.prop!=='heart') return; const a=arms[0].hand, b2=arms[1].hand; const hx=(a[0]+b2[0])/2, hy=(a[1]+b2[1])/2-0.05*s, r=0.11*s; g.fillStyle='#ff4d6d'; g.beginPath(); g.moveTo(hx,hy+r*1.2); g.bezierCurveTo(hx-r*1.6,hy,hx-r*0.8,hy-r*1.2,hx,hy-r*0.4); g.bezierCurveTo(hx+r*0.8,hy-r*1.2,hx+r*1.6,hy,hx,hy+r*1.2); g.fill(); };
    // paint back to front
    const items=[...legs.map(l=>({d:legD(l),leg:l})),{d:0,torso:true},{d:0.03,head:true},...arms.map(a=>({d:armD(a),arm:a}))];
    items.sort((a,b)=>a.d-b.d);
    let torsoDone=false; drawShorts.done=false;
    for(const it of items){
      if(it.leg){ drawLeg(it.leg); if(torsoDone) drawShorts(); }
      else if(it.torso){ drawShorts(); drawTorso(); torsoDone=true; }
      else if(it.head) drawHead();
      else drawArm(it.arm); }
    drawProp();
    g.restore();
  }
  hairBack(g,L,c,r,hy,s){ g.fillStyle=c; const h=L.hair;
    if(h==='afro'){ g.beginPath(); g.arc(0,hy-r*0.3,r*1.55,0,7); g.fill(); }
    else if(h==='long'){ g.beginPath(); g.ellipse(-r*0.25,hy+r*0.7,r*1.0,r*1.3,0,0,7); g.fill(); }
    else if(h==='locs'){ g.strokeStyle=c; g.lineWidth=r*0.32; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*r*0.35,hy-r*0.4); g.lineTo(i*r*0.42-r*0.2,hy+r*1.9); g.stroke(); } }
    else if(h==='mullet'){ g.beginPath(); g.ellipse(-r*0.45,hy+r*0.75,r*0.6,r*0.8,0,0,7); g.fill(); }
    else if(h==='bun'){ g.beginPath(); g.arc(-r*0.2,hy-r*1.25,r*0.45,0,7); g.fill(); } }
  hairFront(g,L,c,r,hy,s){ g.fillStyle=c; const h=L.hair; const capTop=()=>{ g.beginPath(); g.ellipse(0,hy-r*0.25,r*1.0,r*0.85,0,Math.PI*1.02,Math.PI*1.98); g.closePath(); g.fill(); };
    switch(h){
      case 'bald': g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.arc(-r*0.3,hy-r*0.55,r*0.25,0,7); g.fill(); break;
      case 'buzz': g.globalAlpha=0.7; capTop(); g.globalAlpha=1; break;
      case 'mohawk': g.beginPath(); g.moveTo(-r*0.2,hy-r*0.7); g.lineTo(-r*0.05,hy-r*1.6); g.lineTo(r*0.2,hy-r*0.75); g.fill(); g.globalAlpha=0.3; capTop(); g.globalAlpha=1; break;
      case 'spiky': capTop(); for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*r*0.35-r*0.15,hy-r*0.85); g.lineTo(i*r*0.38,hy-r*1.45); g.lineTo(i*r*0.35+r*0.15,hy-r*0.85); g.fill(); } break;
      case 'curly': case 'twists': for(let i=0;i<7;i++){ const a=Math.PI*(1.05+i*0.15); g.beginPath(); g.arc(Math.cos(a)*r*0.9,hy+Math.sin(a)*r*0.9,r*0.32,0,7); g.fill(); } break;
      case 'afro': g.beginPath(); g.arc(0,hy-r*0.35,r*1.15,Math.PI,0); g.fill(); break;
      case 'sideswept': capTop(); g.beginPath(); g.moveTo(-r*0.9,hy-r*0.2); g.quadraticCurveTo(r*0.2,hy-r*1.3,r*1.0,hy-r*0.1); g.lineTo(r*0.6,hy-r*0.5); g.fill(); break;
      case 'braids': capTop(); g.strokeStyle=mix(c,'#ffffff',.25); g.lineWidth=Math.max(0.6,r*0.08); for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*r*0.3,hy-r*0.95); g.lineTo(i*r*0.36,hy-r*0.35); g.stroke(); } break;
      default: capTop();
    } }
  drawMini(g){ const w=Math.min(170,this.W*0.22), h=w*68/105, x0=this.W-w-10, y0=10; g.fillStyle='rgba(8,14,10,.78)'; g.fillRect(x0-3,y0-3,w+6,h+6); g.strokeStyle='rgba(255,255,255,.4)'; g.lineWidth=1; g.strokeRect(x0,y0,w,h); g.beginPath(); g.moveTo(x0+w/2,y0); g.lineTo(x0+w/2,y0+h); g.stroke();
    const vw=this.cam.w*0.86; g.strokeStyle='rgba(255,214,107,.7)'; g.strokeRect(x0+(this.cam.x-vw/2)/105*w,y0,vw/105*w,h);
    for(const p of this.players.values()){ if(p.off) continue; g.fillStyle=(p.gk?this.kits.gk:this.kits.team)[p.side].shirt; g.beginPath(); g.arc(x0+p.x/105*w,y0+p.y/68*h,2.6,0,7); g.fill(); }
    g.fillStyle='#fff'; g.beginPath(); g.arc(x0+this.ball.x/105*w,y0+this.ball.y/68*h,2.4,0,7); g.fill(); }
}

/* classic black-and-white football: the 12 black pentagons sit on an icosahedron's vertices and tumble as it rolls */
const ICO=(()=>{ const f=(1+Math.sqrt(5))/2; const v=[[0,1,f],[0,-1,f],[0,1,-f],[0,-1,-f],[1,f,0],[-1,f,0],[1,-f,0],[-1,-f,0],[f,0,1],[-f,0,1],[f,0,-1],[-f,0,-1]]; return v.map(([a,b,c])=>{ const l=Math.hypot(a,b,c); return [a/l,b/l,c/l]; }); })();
function drawFootball(g,x,y,r,spin){
  const gr=g.createRadialGradient(x-r*0.4,y-r*0.45,r*0.1,x,y,r*1.05); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.7,'#eceff2'); gr.addColorStop(1,'#aeb4bc');
  g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,7); g.fill();
  g.save(); g.beginPath(); g.arc(x,y,r,0,7); g.clip();
  const a=spin*0.55, c=spin*0.31; const ca=Math.cos(a), sa=Math.sin(a), cc=Math.cos(c), sc=Math.sin(c);
  g.fillStyle='#15181d';
  for(const [vx,vy,vz] of ICO){ // rotate about the vertical then the horizontal axis
    const x1=vx*ca+vz*sa, z1=-vx*sa+vz*ca; const y2=vy*cc-z1*sc, z2=vy*sc+z1*cc; if(z2<-0.15) continue;
    const px=x+x1*r*0.95, py=y+y2*r*0.95; const ps=r*0.36; const fz=Math.max(0.22,z2);
    g.save(); g.translate(px,py); g.rotate(Math.atan2(y2,x1)); g.scale(fz,1); g.beginPath(); for(let j=0;j<5;j++){ const aa=j*1.2566+0.31; j?g.lineTo(Math.cos(aa)*ps,Math.sin(aa)*ps):g.moveTo(Math.cos(aa)*ps,Math.sin(aa)*ps); } g.closePath(); g.fill(); g.restore(); }
  g.restore();
  g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x-r*0.38,y-r*0.42,r*0.28,r*0.18,-0.5,0,7); g.fill();
  g.strokeStyle='rgba(0,0,0,.6)'; g.lineWidth=Math.max(0.7,r*0.12); g.beginPath(); g.arc(x,y,r,0,7); g.stroke(); }

/* ===================== MENU BACKDROP: a never-ending showcase match ===================== */
function demoTeams(){ const r=Math.random; const pk=a=>a[Math.floor(r()*a.length)]; const k1=pk(MASCOT_KEYS); let k2=pk(MASCOT_KEYS); if(k2===k1) k2=MASCOT_KEYS[(MASCOT_KEYS.indexOf(k1)+7)%MASCOT_KEYS.length];
  const c1=pk(COLOR_PAIRS), c2=pk(COLOR_PAIRS.filter(c=>c!==c1)); return {h:{c1:c1[0],c2:c1[1],town:'Touchline',mk:k1,mascot:MASCOT_BY[k1].n},a:{c1:c2[0],c2:c2[1],town:'Visitors',mk:k2,mascot:MASCOT_BY[k2].n},id:'demo'+Math.floor(r()*1e6)}; }
function startMenuShow(canvas){
  const T=demoTeams(); const looks={};
  const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`d${side}${i}`; looks[pid]={num:[1,2,4,5,3,6,8,10,7,9,11][i],look:defaultLook(pid+T.id,11),h:66+Math.random()*9}; return {pid,role,x,y}; }),off:{}});
  const cel=CELEBS.map(c=>c.id); let curCel='classic'; const score=[0,0];
  const st=new Stage(canvas,T,{mode:'broadcast',minimap:false,lookup:pid=>looks[pid]||{num:'',look:defaultLook(pid,10),h:70},demo:true,celebFor:()=>curCel,board:()=>({h:String(T.h.mascot||'HOME').toUpperCase().slice(0,9),a:String(T.a.mascot||'AWAY').toUpperCase().slice(0,9),sc:score,min:'LIVE'}),
    onCaption:(t,k)=>{ if(typeof menuCaption==='function') menuCaption(t,k); }});
  const bug=()=>{ if(typeof menuBug==='function') menuBug(T,score); }; st.emit=e=>{ if(e&&e.t==='goal'){ score[e.s]++; bug(); } }; setTimeout(bug,50);
  st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'d00'); st.setKeeper(1,'d10'); st.kickoffShape(0); st.snap(); st.zoomTo(0.92);
  (async()=>{ let n=0; await st.tapOff(); while(st.alive){ st.ts=0.85; const side=st.own?st.own.side:0; const mates=[...st.players.values()].filter(p=>p.side===side&&!p.gk);
      const next=mates[Math.floor(Math.random()*mates.length)]; await st.pass(st.own,next); await st.dribble(next,clamp(next.x+(side===0?6:-6),5,100),clamp(next.y+(Math.random()-.5)*8,4,64),600);
      n++; if(Math.random()<0.18){ const lost=st.nearest(1-side,st.ball.x,st.ball.y); if(lost) await st.gain(lost); }
      if(n%9===0 && st.own){ const s=st.own.side; const roll=Math.random(); const e={s,pid:st.own.pid,t:roll<0.5?'goal':roll<0.8?'save':'miss',ty:'open',x:50,y:84,m:0};
        if(e.t==='goal'){ curCel=cel[Math.floor(Math.random()*cel.length)]; st.goalTs=0.9; const sc=st.own; await st.finish(e,sc); await st.celebrate(sc,s); await st.restartAfterGoal(1-s); } else await st.shotSeq(e); }
      if(!st.alive) break; } })();
  return st;
}

/* ===================== FIGURE PREVIEW (appearance editor) ===================== */
function figurePreview(cv,p){
  if(cv._fp) return; cv._fp=1;
  const g=cv.getContext('2d'); const dpr=Math.min(2,window.devicePixelRatio||1); const W=cv.clientWidth||170, H=cv.clientHeight||210; cv.width=W*dpr; cv.height=H*dpr; g.setTransform(dpr,0,0,dpr,0,0);
  const sch=Sx(p.sid)||{c1:'#1d4ed8',c2:'#ffffff'}; const ks=kitsForSchools(sch,{c1:'#777777',c2:'#333333'}); const kit=p.pos==='GK'?ks.gk[0]:ks.team[0];
  const fake=Object.create(Stage.prototype); Object.assign(fake,{now:0,own:null,hands:false,placed:false,ball:{x:999,y:0,z:0},spdMul:1,ts:1,depthK:0.3,proj:()=>[W/2,H*0.88,H*0.37]});
  const fig={x:0,y:0,look:lookOf(p),hgt:70,num:p.num,face:1,yaw:0,ph:0,spd:0,seed:1,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:p.pos==='GK'};
  const t0=performance.now();
  const loop=ts=>{ if(!cv.isConnected) return; const t=(ts-t0)/1000; fake.now=ts-t0; const cyc=t%8.4;
    fig.look=lookOf(Px(p.id)||p); fig.celeb=false; fig.spd=0;
    // run past, square up and strike, then a slow turntable so every angle of his look is visible, then celebrate
    if(cyc<2.6){ fig.spd=6; fig.ph=t*9; fig.yaw=0; }
    else if(cyc<4.2){ fig.yaw=lerp(0,0.35,smooth((cyc-2.6)/0.4)); if(cyc>3.1&&fake.now-fig.kickT>1500){ fig.kickT=fake.now; fig.kickW=200; fig.kickF=340; fig.kickK='shot'; } }
    else if(cyc<6.8){ fig.yaw=0.35+smooth((cyc-4.2)/2.6)*Math.PI*2; }
    else { fig.yaw=Math.PI/2-0.2; fig.celeb=true; fig.celebType='classic'; fig.celebT=fake.now-(cyc-6.8)*1000; }
    g.clearRect(0,0,W,H); const gr=g.createRadialGradient(W/2,H*0.88,4,W/2,H*0.88,W*0.5); gr.addColorStop(0,'rgba(60,170,90,.55)'); gr.addColorStop(1,'rgba(60,170,90,0)'); g.fillStyle=gr; g.beginPath(); g.ellipse(W/2,H*0.88,W*0.48,H*0.1,0,0,7); g.fill();
    Stage.prototype.drawFigure.call(fake,g,fig,kit,false); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

/* ---------- crowd cache: each stand row is painted once into a strip and blitted every frame (re-painted when the
   camera zoom changes by more than ~12%, or the canvas resizes); goal celebrations and flag-wavers stay live ---------- */
Stage.prototype.drawCrowdFast=function(g,W,yBase,yCon,rowH,uH){
  try{
    if(!this._crows){ const m=new Map(); for(const c of this.crowd){ if(!m.has(c.row)) m.set(c.row,[]); m.get(c.row).push(c); } this._crows=[...m.entries()].sort((a,b)=>a[0]-b[0]); }
    const dpr=this.dpr||1, X0=-25, X1=132; if(!this._cc||this._cc.W!==W||this._cc.H!==this.H) this._cc={W,H:this.H,rows:{}};
    for(const [row,fans] of this._crows){ const up=row>=8; const rr0=up?uH:rowH; const Y=up?-17-(row-8)*1.5:-6-row*1.6;
      const k=(W/this.cam.w)*(0.56+0.44*(Y/68)); const yy=up? yCon-uH*(row-8+0.55) : yBase-rowH*(row+0.55);
      const top=yy-rr0*0.5, h=rr0*1.25; let st=this._cc.rows[row];
      if(!st||Math.abs(k/st.k-1)>0.12){ const cw=Math.ceil((X1-X0)*k*dpr), ch=Math.max(2,Math.ceil(h*dpr)); if(cw>16000) return false;
        const cv=st&&st.cv||document.createElement('canvas'); cv.width=cw; cv.height=ch; const q=cv.getContext('2d'); q.setTransform(dpr,0,0,dpr,0,0); q.clearRect(0,0,cw,ch);
        for(const c of fans){ if(c.flag) continue; const x=(c.x-X0)*k, y=yy-top; const rr=rr0*0.27*c.s; q.fillStyle=c.c; q.fillRect(x-rr*0.85,y+rr*0.55,rr*1.7,rr*1.4); q.fillStyle=c.sk; q.beginPath(); q.arc(x,y,rr,0,7); q.fill(); }
        st=this._cc.rows[row]={cv,k}; }
      const dx=W/2+(X0-this.cam.x)*k, dw=(X1-X0)*k; g.drawImage(st.cv,dx,top,dw,h); }
    return true;
  }catch(e){ return false; }
};
