/* ===================== v18.8: the bicycle kick, reworked (87) =====================
   Presentation only (event timing, contact and results are 82's, unchanged). 82 built the bike from separate eased segments,
   each easing to a stop at its ends, so the body rotation paused at take-off and again at contact, the lift had no arc, the
   legs snapped from the running stride into the keyframes and he stood up leaning backwards. Here the bike is one continuous
   motion (82's scissor kick is untouched):
   - every channel (pitch, feet, hands, head) is a keyframed track through cubic Hermite curves (Catmull-Rom tangents), so
     velocities carry through the keys: the body keeps rotating through contact and the kicking boot is still accelerating
     when it meets the ball;
   - the hips fly one ballistic arc (solved from take-off, contact height and the landing), apex just before contact;
   - anticipation: in the last moments of the set he dips and swings his arms back, then drives them up at take-off;
   - take-off: the stride blends into the push-off over ~100 ms, the take-off foot stays pinned on the turf while his run-in
     carries the body on (no slide); the lead leg swings up first, then the kicking leg whips up past it (the "bicycle");
   - in the air the arms spread for balance, then reach back so the hands meet the turf first; chin tucked on landing;
   - getting up: he sits up on his hands, rolls forward over his feet and rises (leaning forward, never backwards).
   Durations (V186X_MS.bike) are longer after contact (fall 430 ms, lie 140, up 820; take-off 420) - none of them moves the
   contact or the goal. 82's set, contact, release and replay code read the same durations. Globals: v188b* / V188B. */
const V188B={on:true,pre:170,bl:100};
V186X_MS.bike={set:760,to:420,st:220,fall:430,lie:140,up:820};

/* cubic Hermite through keys [t, value(, 'h' = zero tangent: a hold)]; value a number or [f,l,h] */
function v188bTk(K,t){ const n=K.length; if(t<=K[0][0]) return K[0][1]; if(t>=K[n-1][0]) return K[n-1][1];
  let i=0; while(i<n-2&&t>K[i+1][0]) i++;
  const a=K[i], b=K[i+1], h=b[0]-a[0], s=(t-a[0])/h, s2=s*s, s3=s2*s;
  const h00=2*s3-3*s2+1, h10=s3-2*s2+s, h01=-2*s3+3*s2, h11=s3-s2;
  const tan=(j,c)=>{ const k=K[j]; if(j===0||j===n-1||k[2]==='h') return 0; const p=K[j-1], q=K[j+1]; return ((c<0?q[1]:q[1][c])-(c<0?p[1]:p[1][c]))/(q[0]-p[0]); };
  if(typeof a[1]==='number') return h00*a[1]+h10*h*tan(i,-1)+h01*b[1]+h11*h*tan(i+1,-1);
  return [0,1,2].map(c=>h00*a[1][c]+h10*h*tan(i,c)+h01*b[1][c]+h11*h*tan(i+1,c)); }

/* the hips' flight: one arc through take-off (crouched), contact and the landing */
function v188bArc(T){ const y0=-0.06, Lc=0.36, yL=-0.62, sC=T.to/1000, sL=(T.to+T.fall)/1000, a1=Lc-y0, a2=yL-y0;
  const det=0.5*sC*sL*(sC-sL); return {y0,v0:(a1*(-0.5*sL*sL)+0.5*sC*sC*a2)/det,g:(sC*a2-sL*a1)/det}; }

/* the bike's keyframes at tau (ms from contact), world terms in his yaw frame (body units: F forward, L left, H up) */
function v188bFrame(p,tau,T){ if(tau<-T.to) return null;
  const K=p.v186xf===1?1:0, N=1-K, sd=K===1?1:-1;
  const A=-T.to, X=x=>A*(1-x), Y=y=>T.fall*y, L1=T.fall+T.lie, U=u=>L1+T.up*u;
  const C=[-0.1,0.06*sd,1.95];
  const th=v188bTk([[X(0),-0.10],[X(0.3),-0.36],[X(0.6),-0.82],[X(0.85),-1.18],[X(1),-1.38],[Y(0.5),-1.52],[Y(1),-1.56,'h'],[L1,-1.53,'h'],[U(0.3),-0.9],[U(0.58),0.36],[U(0.82),0.2],[U(1),0,'h']],tau);
  let lift; if(tau<=Y(1)){ const R=v188bArc(T), s=(tau-A)/1000; lift=Math.max(-0.64,R.y0+R.v0*s-0.5*R.g*s*s); }
  else if(tau<=L1) lift=-0.62-0.02*v186xSm((tau-Y(1))/Math.max(1,Math.min(60,T.lie)));
  else lift=v188bTk([[L1,-0.64,'h'],[U(0.3),-0.6],[U(0.58),-0.42],[U(0.82),-0.13],[U(1),0,'h']],tau);
  const kL=[0.62,0.12*sd,0.04], nL=[0.55,-0.12*sd,0.04];
  const fK=v188bTk([[X(0),[0,0.1*sd,0]],[X(0.15),[-0.03,0.1*sd,0]],[X(0.35),[-0.12,0.11*sd,0.2]],[X(0.6),[-0.26,0.12*sd,0.42]],[X(0.82),[0.4,0.11*sd,1.2]],[X(0.94),[0.18,0.08*sd,1.8]],[X(1),C],
    [Y(0.12),[-0.3,0.1*sd,1.85]],[Y(0.45),[0.15,0.12*sd,1.25]],[Y(0.8),[0.5,0.12*sd,0.4]],[Y(1),[0.62,0.12*sd,0.06]],[L1,kL,'h'],
    [U(0.3),[0.42,0.14*sd,0.02]],[U(0.58),[0.14,0.13*sd,0]],[U(0.82),[0.06,0.11*sd,0]],[U(1),[0.04,0.1*sd,0],'h']],tau);
  const fN=v188bTk([[X(0),[0.1,-0.1*sd,0]],[X(0.3),[0.42,-0.12*sd,0.7]],[X(0.55),[0.55,-0.12*sd,1.18]],[X(0.8),[0.5,-0.12*sd,1.02]],[X(1),[0.42,-0.12*sd,0.72]],
    [Y(0.5),[0.5,-0.12*sd,0.32]],[Y(1),[0.55,-0.12*sd,0.05]],[L1,nL,'h'],
    [U(0.3),[0.4,-0.14*sd,0.02]],[U(0.58),[0.12,-0.13*sd,0]],[U(0.82),[0.05,-0.11*sd,0]],[U(1),[0.04,-0.1*sd,0],'h']],tau);
  const hand=g=>v188bTk([[X(0),[-0.22,0.38*g,0.95]],[X(0.3),[0.22,0.5*g,1.45]],[X(0.65),[-0.05,0.78*g,1.3]],[X(1),[-0.45,0.72*g,0.98]],
    [Y(0.45),[-0.55,0.66*g,0.55]],[Y(0.85),[-0.4,0.56*g,0.06]],[Y(1),[-0.32,0.52*g,0.03]],[L1,[-0.3,0.5*g,0.03],'h'],
    [U(0.3),[-0.6,0.4*g,0.03]],[U(0.58),[0.3,0.3*g,0.45]],[U(0.82),[0.12,0.35*g,0.72]],[U(1),[0.04,0.3*g,1.0],'h']],tau);
  const tilt=v188bTk([[X(0),-0.35],[X(0.5),-0.5],[X(1),-0.55],[Y(0.4),-0.25],[Y(1),0.28],[L1,0.25,'h'],[U(0.3),0.15],[U(0.58),0.25],[U(1),0,'h']],tau);
  const feet=[null,null]; feet[K]=fK; feet[N]=fN; for(const f of feet) if(f[2]<0) f[2]=0;
  const hands=[hand(-1),hand(1)]; for(const h of hands) if(h[2]<0.02) h[2]=0.02;
  /* the take-off foot stays where it pushed off while the run-in carries his body on (82 moves p.x/p.y from take-off) */
  if(tau<X(0.35)&&p.v186xpx!=null){ const S=0.92*(p.hgt||70)/70, y=p.v186xy!=null?p.v186xy:(p.yaw||0), c=Math.cos(y), s=Math.sin(y), dx=(p.x-p.v186xpx)/S, dy=(p.y-p.v186xpy)/S;
    const w=tau<=X(0.15)?1:1-v186xSm((tau-X(0.15))/Math.max(1,X(0.35)-X(0.15))); fK[0]-=(dx*c+dy*s)*w; fK[1]-=(-dx*s+dy*c)*w; }
  return {th,ra:0,lift,feet,hands,tilt}; }

const _v188bFrame0=v186xFrame;
v186xFrame=function(p,tau,T){ if(V188B.on&&p&&p.v186xk==='bike') return v188bFrame(p,tau,T); return _v188bFrame0.apply(this,arguments); };

/* the set's last moments (anticipation) and the blend from the running stride into the take-off */
const _v188bPose0=Stage.prototype.v186xPose;
Stage.prototype.v186xPose=function(p,P){ if(!V188B.on||p.v186xk!=='bike'||this.rm) return _v188bPose0.apply(this,arguments);
  const T=v186xDur('bike',p.v186xts), tau=v186xTau(this,p), k=p.v186xts||1, pre=V188B.pre*k, bl=Math.max(40,V188B.bl*k);
  const bf=[{...P.feet[0]},{...P.feet[1]}], bh=[{...P.hands[0]},{...P.hands[1]}];
  const R=_v188bPose0.apply(this,arguments);
  if(tau<-T.to){ const w=v186xSm((tau+T.to+pre)/pre); if(!(w>0)) return R;
    /* dip and arms back (the keyframes at take-off start from here) */
    const F0=v188bFrame(p,-T.to,T); R.hipU=lerp(R.hipU,0.74,w); R.headTilt=lerp(R.headTilt||0,F0.tilt,w);
    for(const i of [0,1]){ const t=v186xInv(F0.hands[i],F0.th,0,F0.lift,0.8), h=R.hands[i]; R.hands[i]={f:lerp(h.f,t.f,w),u:lerp(h.u,t.u-0.06,w),l:lerp(h.l,t.l,w)}; }
    return R; }
  if(tau<-T.to+bl&&R.act==='v186x'){ const w=v186xSm((tau+T.to)/bl);
    for(const i of [0,1]){ const a=bf[i], b=R.feet[i]; R.feet[i]={f:lerp(a.f,b.f,w),u:lerp(a.u,b.u,w),l:lerp(a.l,b.l,w)}; } }
  return R; };
