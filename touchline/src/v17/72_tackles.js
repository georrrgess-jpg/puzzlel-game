/* ===================== v18.3 tackles and steals =====================
   Presentation only. The side without the ball only gets it by making a visible play on it:
   - the tackler RUNS to the carrier (chase steering, normal acceleration), then wins it with a standing poke (P.act 'poke'),
     a shoulder-to-shoulder steal when he arrives alongside (P.act 'shoulder'), or, rarely (about 1 in 10, only from
     1.2-3 m away and from the side or behind-side), a slide tackle (P.act 'slide') that carries him forward on momentum;
   - a pass cut out by an opponent shows the interceptor stepping into the lane and stretching a leg (P.act 'intercept');
   - if the tackler is still out of reach when time runs out, the carrier takes a heavy touch and the ball rolls to him;
   - a loose ball nobody reached runs to the fetcher instead of the fetcher appearing beside it.
   The ball always travels from the carrier's foot to the winner (launch with a short duration), and nobody is moved by
   setting x/y: the slide uses the glide momentum of the knee slide in update. Engine, results and event order are untouched. */

/* is the tackler coming from the side or behind-side of the carrier (not head-on)? */
Stage.prototype.v18tSide=function(p,o){ const a=this.yawOf(o); const dx=p.x-o.x, dy=p.y-o.y, d=Math.hypot(dx,dy)||1;
  return (Math.cos(a)*dx+Math.sin(a)*dy)/d<0.35; };

/* the ball leaves the carrier's foot and runs to the winner */
Stage.prototype.v18tTake=async function(p,o,extra){ if(this.own!==o) return;
  o.ov=null; this.placed=false; const d=dist2(p,this.ball);
  await this.launch(null,{home:p,dur:this.D(170)+50+d*(extra||60),h:0.08,kind:'pass'}); };

Stage.prototype.tackle=async function(p,o){
  if(this.hands){ // a keeper holding the ball is never tackled; he releases first
    const mate=this.nearest(o.side,o.x,o.y,true,o); if(mate) await this.pass(o,mate,1.2); if(this.own!==p) return this.gain(p); return; }
  const want=Math.random()<0.1; const canSlide=()=>{ const d=dist2(p,o); return want&&d>1.2&&d<3&&this.v18tSide(p,o); };
  p.chase=o; o.slow=true;
  await this.until(()=>this.own!==o || dist2(p,o)<1.4 || canSlide(), this.eta(p,o.x,o.y,1.2)*1.6+700);
  if(this.own!==o){ p.chase=null; o.slow=false; return; }
  if(canSlide()&&!this.skip){
    // the rare slide: he goes to ground on the run and his momentum carries him through the ball
    const d=dist2(p,o); const ax=this.ball.x+(o.vx||0)*0.25-p.x, ay=this.ball.y+(o.vy||0)*0.25-p.y, al=Math.hypot(ax,ay)||1;
    const v0=Math.sqrt(12.4*(d+0.7)); p.chase=null; p.ov=null; p.meet=null;
    p.glide={vx:ax/al*v0, vy:ay/al*v0}; p.v18sl=true; p.v18slT=this.now; p.v18slD=Math.max(380,1000*v0/(6.2*(this.spdMul||1)));
    this.look(p,o.x,o.y,this.D(500)); this.kickTurf(p.x,p.y,8,1.2); this.snd('slide');
    await this.until(()=>this.own!==o || dist2(p,this.ball)<1.15 || !p.glide, p.v18slD+200);
    o.slow=false; if(this.own!==o) return;
    if(dist2(p,this.ball)<1.6){ o.trip=this.now; o.vx*=0.3; o.vy*=0.3; this.snd('tackle'); await this.v18tTake(p,o); return; }
    // missed it: get up and go again
    await this.until(()=>!p.v18sl, 900); p.chase=o; o.slow=true;
    await this.until(()=>this.own!==o || dist2(p,o)<1.4, this.eta(p,o.x,o.y,1.2)*1.4+500);
    if(this.own!==o){ p.chase=null; o.slow=false; return; }
  }
  p.chase=null; o.slow=false;
  const d=dist2(p,o);
  if(d>1.6){ // still out of reach: the carrier loses control with a heavy touch and it runs to him
    this.look(p,this.ball.x,this.ball.y,this.D(500)); o.touchT=this.now; p.v18pkT=this.now+this.D(170);
    await this.v18tTake(p,o,110); return; }
  this.look(p,o.x,o.y,this.D(500));
  const alongside=!this.v18tSide(p,o)?false:Math.abs(Math.sin(Math.atan2(p.y-o.y,p.x-o.x)-this.yawOf(o)))>0.6;
  if(alongside&&Math.random()<0.45){ // shoulder to shoulder: he comes alongside, leans in, and takes it with a touch
    p.v18shT=this.now; const nx=(o.x-p.x)/(d||1), ny=(o.y-p.y)/(d||1); o.vx=(o.vx||0)*0.6+nx*1.6; o.vy=(o.vy||0)*0.6+ny*1.6;
    await this.wait(this.D(200)); if(this.own!==o) return; p.v18pkT=this.now; }
  else { p.v18pkT=this.now; await this.wait(this.D(110)); if(this.own!==o) return; }
  o.trip=this.now; o.vx*=0.3; o.vy*=0.3; this.snd('tackle');
  await this.v18tTake(p,o);
};

/* a loose ball he could not reach runs to him; he is never put beside it */
Stage.prototype.fetch=async function(p,hands){ p.chase={ball:true}; const near=()=>dist2(p,this.ball)<1.1&&(hands||this.ball.z<0.6);
  await this.until(near, Math.max(this.D(1600)+900, this.eta(p,this.ball.x,this.ball.y,1.4)*1.4+500));
  if(!near()&&!this.skip) await this.until(near, this.eta(p,this.ball.x,this.ball.y,1.2)*2+1500);
  p.chase=null;
  if(this.fl&&!this.fl.phys) await this.until(()=>!this.fl,2000);
  if(!near()&&!this.skip&&!this.fl){ const o=this.own; if(o===p) return;
    if(!o||!this.hands){ const d=dist2(p,this.ball); this.ball.z=Math.min(this.ball.z||0,0.3);
      await this.launch(null,{home:p,hands:!!hands,dur:this.D(220)+d*90,h:hands?0.5:0.05,kind:'pass'}); if(this.own===p&&hands) p.gatherT=this.now; return; } }
  if(this.fl&&this.fl.phys) this.endFree();
  this.own=p; this.hands=!!hands; this.poss=p.side; this.placed=false; this.ball.ing=null; if(hands) p.gatherT=this.now; else p.touchT=this.now; };

/* slides: hand the momentum back to the stride when the glide stops; interceptions stretch into the lane */
const _v18tUpdate=Stage.prototype.update;
Stage.prototype.update=function(dt){
  const f=this.fl; if(f&&!f.phys&&f.home&&this.lastPass&&this.lastPass.to===f.home&&this.lastPass.from&&this.lastPass.from.side!==f.home.side&&this.now-f.t0>f.dur-260&&!f._v18ic){ f._v18ic=1; f.home.v18icT=this.now; }
  const r=_v18tUpdate.apply(this,arguments);
  for(const p of this.players.values()){ if(p.v18sl&&!p.glide){ p.v18sl=false; p.knelt=false; p.ov=null; p.upT=this.now; } }
  return r; };

const _v18tPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v18tPose.apply(this,arguments); if(isRef||!P) return P; const now=this.now;
  const F=P.feet, H=P.hands; const Fs=(i,f,u,l)=>{ F[i]={f,u,l:l==null?(i?1:-1)*0.1:l}; }, Hs=(i,f,u,l)=>{ H[i]={f,u,l}; };
  // slide: run-in, drop onto the hip with the lead leg long and low along the grass, trailing leg tucked, one hand on the turf, pop up
  let sT=-1, SD=520; if(p.v18slT!=null&&now-p.v18slT<(p.v18slD||520)+260){ sT=now-p.v18slT; SD=(p.v18slD||520)+260; } else if(P.act==='slide'){ sT=now-(p.slideT||-9e9); SD=520; }
  if(sT>=0&&sT<SD){ const t=sT/SD; P.act='slide';
    const a=smooth(clamp(t/0.18,0,1)), up=smooth(clamp((t-0.78)/0.22,0,1)), k=a*(1-up), sd=(p.seed||0)%2<1?1:-1;
    P.hipU=lerp(0.8,0.26,k); P.lean=lerp(0.08,-0.62,k); P.lift=0; P.pivot=0; P.rot=sd*0.2*k; P.headTilt=0.18*k; P.headTurn=0;
    Fs(1,lerp(0.12,0.98,k),lerp(0.08,0.05,k),lerp(0.1,0.06,k));
    Fs(0,lerp(-0.08,0.12,k),lerp(0.06,0.04,k),lerp(-0.1,-0.24,k));
    Hs(0,lerp(0.0,-0.42,k),lerp(1.0,0.06,k),lerp(-0.28,-0.42,k));
    Hs(1,lerp(0.06,0.32,k),lerp(1.05,1.02,k),lerp(0.28,0.46,k));
    return P; }
  // standing poke: the near foot jabs out at the ball, the standing knee bends
  const pk=now-(p.v18pkT==null?-9e9:p.v18pkT), PD=Math.max(240,this.D(380));
  if(pk>=0&&pk<PD&&P.act!=='kick'){ const w=Math.sin(Math.PI*clamp(pk/PD,0,1)); P.act='poke'; P.rot=0;
    P.hipU=0.8-0.1*w; P.lean=0.14*w; Fs(1,0.12+0.66*w,0.1*w,0.14); Fs(0,-0.04,0,-0.12);
    Hs(0,-0.1*w,1.0+0.12*w,-0.42); Hs(1,0.12,1.04,0.36); }
  // shoulder to shoulder: lean into the carrier, arm tucked, before the poke
  const sh=now-(p.v18shT==null?-9e9:p.v18shT), SH=Math.max(200,this.D(320));
  if(sh>=0&&sh<SH&&P.act!=='poke'){ const w=Math.sin(Math.PI*clamp(sh/SH,0,1)); P.act='shoulder'; P.rot=0.16*w*(p.seed%2<1?1:-1); P.lean=0.1+0.08*w; P.hipU=0.76;
    Hs(0,0.12,0.92,-0.2); Hs(1,0.18,0.96,0.2); }
  // interception: a long step into the lane with the leg stretched across
  const ic=now-(p.v18icT==null?-9e9:p.v18icT), ID=Math.max(240,this.D(420));
  if(ic>=0&&ic<ID&&P.act!=='kick'){ const w=Math.sin(Math.PI*clamp(ic/ID,0,1)); P.act='intercept'; P.hipU=0.8-0.16*w; P.lean=0.06*w;
    Fs(1,0.36*w,0.06*w,0.1+0.42*w); Fs(0,-0.06,0,-0.14); Hs(0,0.05,1.0+0.25*w,-0.5*w-0.27); Hs(1,0.1,1.02,0.3); }
  return P; };
