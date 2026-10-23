/* ===================== v18.4 ball touches (presentation only) =====================
   1. Dribble touches follow the stride. Contacts are counted on the stride phase p.ph (a foot passes its contact point at
      90% of its cycle: foot 0 when ph/2pi has fraction 0.9, foot 1 at 0.4), and every n-th contact is a touch: n=1 when
      walking with it (both feet tap it along), 2 at a jog (the same foot), 3 at a sprint (feet alternate). After a touch
      the ball runs ahead of the foot on a constant-deceleration profile, lead = L*4q(1-q) over the touch interval q in
      [0,1], so it leaves the boot quickly, slows and is met again; the peak L grows with speed. A sharp change of direction
      brings the next touch forward, and the lead shrinks while he turns so the ball never swings wide of him. When the lead
      has to come back (he plants to strike, slows or stops) it shrinks no faster than he moves: the ball stops, it never rolls
      back into his feet.
   2. The touching foot meets the ball: over the last third of a contact before a touch and the first tenth of a stride after it (before that foot lands), that
      foot's target is pulled onto the back of the ball (both in 2-D and 3-D, which share poseOf). A received pass is met the
      same way: the nearer foot reaches for the ball over its last ~140 ms and gives a little as it arrives (cushion).
   3. Strikes make contact when the ball leaves: the stage releases the ball at the end of the wind-up (kickT + kickW), so
      the swing is retimed to backswing (first 62%), downswing accelerating into the ball (to 100%), then the follow-through;
      the contact point is the back of the ball and the standing foot is planted beside it.
   Nothing the simulation, the tests or the event timing read is written: only dribLead's return value (the ball's drawn
   offset), cosmetic fields on the player (v184*) and the pose. Switch: V184T.on. */
const V184T={on:true, uc:0.9};
function v184Cad(sp){ return sp<2.4?1:sp<4.8?2:3; }
function v184Peak(sp){ return Math.max(0.1,Math.min(1.15,(sp-1.6)*0.22)); }
/* contacts so far: an integer at each contact (even: foot 0, odd: foot 1) */
function v184Cpos(p){ return (p.ph||0)/Math.PI-2*V184T.uc; }
const v184Foot=m=>((Math.round(m)%2)+2)%2;

const _v184DribLead=Stage.prototype.dribLead;
Stage.prototype.dribLead=function(o,sp,dt,now){
  if(!V184T.on||this.rm) return _v184DribLead.apply(this,arguments);
  let S=o.v184; const c=v184Cpos(o); const mv=Math.hypot(o.vx||0,o.vy||0), hx=mv>0.3?o.vx/mv:null, hy=mv>0.3?o.vy/mv:null;
  if(!S||now-S.t>220){ /* a fresh possession (the receiving touch): the interval starts now */
    const n=v184Cad(sp); S=o.v184={t:now,c0:c,next:Math.ceil(c+n*0.75-1e-6),L:v184Peak(sp),out:0,hx,hy,wait:false}; }
  S.t=now;
  const dribbling=sp>1.6&&!o.plant&&!this.so;
  let want=0;
  if(dribbling){
    if(hx!=null&&S.hx!=null&&S.hx*hx+S.hy*hy<0.8&&c-S.c0>0.3*(S.next-S.c0)) S.next=Math.min(S.next,Math.floor(c)+1); /* turning: touch it again at the next contact */
    if(c>=S.next){ const m=Math.floor(c); const n=v184Cad(sp); S.c0=m; S.next=m+n; S.L=v184Peak(sp); S.hx=hx; S.hy=hy; S.wait=false;
      o.v184T=now; o.v184F=v184Foot(m); this.snd('touch'); }
    const q=Math.max(0,Math.min(1,(c-S.c0)/Math.max(0.5,S.next-S.c0)));
    let al=1; if(hx!=null&&S.hx!=null) al=Math.max(0.25,S.hx*hx+S.hy*hy);
    want=S.wait?0:S.L*4*q*(1-q)*al;
    /* he is about to pull up (the end of his run): the last touches shrink so the ball stops at his feet, not a yard beyond */
    if(o.ov&&isFinite(o.ov.x)) want=Math.min(want,Math.max(0,Math.hypot(o.ov.x-o.x,o.ov.y-o.y)-0.15)*0.6); }
  else { /* standing on it, planting or shielding: when he sets off again the first contact is a touch */
    S.wait=true; S.c0=c; S.next=Math.ceil(c+0.2); }
  /* the lead comes back no faster than he moves (the ball slows to a stop; it never rolls back) */
  const back=(Math.max(1,mv)*0.95+0.35)*dt; S.out=Math.max(want,S.out-back);
  if(!dribbling) o.dribD=0;
  return S.out; };

/* body frame of a player: forward f and lateral l (body units, as poseOf's feet) of a world point */
function v184Body(p,x,y){ const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw; const ca=Math.cos(yaw), sa=Math.sin(yaw); const hs=1.06*(p.hgt||70)/70;
  const dx=x-p.x, dy=y-p.y; return [(dx*ca+dy*sa)/hs,(-dx*sa+dy*ca)/hs,hs]; }
const V184_BR=0.11; /* ball radius, m */
/* pull a foot target onto the back of the ball (world contact a little behind the ball's centre), weight w */
function v184Meet(F,i,bf,bl,hs,w,up,give){ if(!(w>0)) return; const o=F[i]; if(!o) return; const sd=i?1:-1;
  let tf=bf-(V184_BR+0.07+(give||0))/hs, tl=bl-sd*0.02/hs; tf=Math.max(-0.2,Math.min(0.62,tf)); tl=Math.max(-0.42,Math.min(0.42,tl)); if(tl*sd<0.02) tl=sd*0.02;
  F[i]={f:o.f+(tf-o.f)*w,u:o.u+((up==null?0.07:up)-o.u)*w,l:o.l+(tl-o.l)*w}; }

const _v184Pose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){
  if(isRef||!V184T.on||this.rm||!p) return _v184Pose.apply(this,arguments);
  const now=this.now, b=this.ball, own=this.own===p&&!this.hands&&this.headBall!==p&&!this.placed;
  const kt=now-(p.kickT||-9e9), W=p.kickW||0, Fd=p.kickF||260, kk=p.kickK; const kicking=kt>=0&&kt<W+Fd&&kk&&kk!=='head'&&kk!=='throw'&&kk!=='punt';
  /* the stage's own receiving prod (front foot only) is replaced by the reach below */
  const tT=p.touchT, TD=Math.max(70,this.D(170)); const rcv=own&&!kicking&&tT!=null&&now-tT>=0&&now-tT<TD;
  let P; if(rcv){ p.touchT=-9e9; try{ P=_v184Pose.apply(this,arguments); } finally{ p.touchT=tT; } } else P=_v184Pose.apply(this,arguments);
  if(!P||!P.feet||!P.feet[0]||!P.feet[1]) return P;
  const F=P.feet;
  /* 3. strikes: the contact point is read from the ball until it leaves, then kept for the follow-through */
  if(kicking&&P.act==='kick'){ const big=kk==='shot'||kk==='loft'; const [bf,bl,hs]=v184Body(p,b.x,b.y);
    let K=p.v184K&&p.v184K.k===p.kickT?p.v184K:null;
    if(kt<W&&this.own===p&&!this.hands&&(b.z||0)<0.5&&bf>0.1&&bf<1.15&&Math.abs(bl)<0.55){ K=p.v184K={k:p.kickT,f:Math.max(0.12,Math.min(0.62,bf-(V184_BR+0.06)/hs)),l:Math.max(-0.1,Math.min(0.3,bl)),pf:Math.max(-0.05,Math.min(0.5,bf-0.12/hs)),pl:Math.min(-0.16,bl-0.25/hs)}; }
    const near=!!K; const con=near?{f:K.f,u:0.09,l:K.l}:{f:0.3,u:0.1,l:0.06};
    const back={f:-0.46,u:big?0.5:0.3}, top={f:big?0.62:0.48,u:big?0.9:0.42,l:con.l}, rest={f:0.06,u:0,l:0.06};
    let ff,fu,fl;
    if(kt<W){ const s=kt/W; if(s<0.62){ const q=smooth(s/0.62); ff=lerp(0.04,back.f,q); fu=lerp(0,back.u,q); fl=lerp(0.06,con.l,q); }
      else { const q=(s-0.62)/0.38, e=q*q; ff=lerp(back.f,con.f,e); fu=lerp(back.u,con.u,e)+0.05*Math.sin(Math.PI*q); fl=con.l; } }
    else { const u=(kt-W)/Fd; if(u<0.4){ const q=smooth(u/0.4); ff=lerp(con.f,top.f,q); fu=lerp(con.u,top.u,q); fl=con.l; } else { const q=smooth((u-0.4)/0.6); ff=lerp(top.f,rest.f,q); fu=lerp(top.u,rest.u,q); fl=lerp(top.l,rest.l,q); } }
    F[1]={f:ff,u:fu,l:fl};
    if(near){ /* the standing foot is planted beside the ball through the downswing and contact */
      const pw=kt<W?smooth(Math.min(1,kt/(W*0.62))):1-smooth(Math.min(1,(kt-W)/(Fd*0.5)));
      F[0]={f:lerp(F[0].f,K.pf,pw),u:F[0].u*(1-pw),l:lerp(F[0].l,K.pl,pw)}; }
    return P; }
  /* 2a. receiving: the nearer foot reaches for the arriving ball over its last ~140 ms */
  const f=this.fl; if(f&&f.home===p&&!f.hands&&!f.head&&!f.phys&&!kicking&&(P.act==='loco'||P.act==='idle')){ const rem=f.t0+f.dur-now, A=Math.max(90,this.D(140));
    if(rem>=0&&rem<A&&(b.z||0)<0.6){ const [bf,bl,hs]=v184Body(p,b.x,b.y); v184Meet(F,bl>=0?1:0,Math.min(bf,0.6),bl,hs,smooth(1-rem/A)*0.9,0.06+Math.min(0.25,b.z||0)); } return P; }
  if(!own) return P;
  const [bf,bl,hs]=v184Body(p,b.x,b.y);
  if(rcv){ const u=(now-tT)/TD; v184Meet(F,bl>=0?1:0,bf,bl,hs,(1-smooth(u))*0.9,0.06,0.05*smooth(u)); }
  /* 2b. dribble touches: the touching foot meets the back of the ball around the touch */
  const S=p.v184; if(S&&now-S.t<160&&P.act==='loco'){ const c=v184Cpos(p);
    const pre=S.next-c; if(pre>=0&&pre<0.34){ const w=smooth(1-pre/0.34); v184Meet(F,v184Foot(S.next),bf,bl,hs,w,0.06); P.headTilt=(P.headTilt||0)+0.1*w; } /* eyes down onto the ball for the touch */
    const post=c-S.c0; if(Math.abs(S.c0-Math.round(S.c0))<1e-6&&post>=0&&post<0.18){ const w=1-smooth(post/0.18); v184Meet(F,v184Foot(S.c0),bf,bl,hs,w,0.07); P.headTilt=(P.headTilt||0)+0.1*w; } }
  return P; };
