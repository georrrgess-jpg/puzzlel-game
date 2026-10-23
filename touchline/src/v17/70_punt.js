/* ===================== v18.2 goalkeeper punts =====================
   Presentation only. After a catch or claim the keeper either throws or rolls it short (the old distribute, about 40%)
   or punts it long (about 60%): two quick steps toward the edge of his area with the ball held out at waist height,
   the support foot plants beside the dropping ball, the ball falls from his hands onto the laces and a full leg swing
   volleys it high (14-18 m) and long (45-58 m) to a teammate in midfield through the normal flight system (launch with
   home: receiver), so landing, possession and the camera are unchanged. The choice uses Math.random like the rest of the
   stage choreography; nothing here touches the engine, results or the order of events.
   State: this._v18pk = {p, x0,y0 (start), ax,ay (unit forward), t0 (kickT), W (wind), Fd (follow-through), Td (drop),
   SE (settle), run (approach length), rel (stage time the ball left the boot, null until then)}.
   Pose time: the strike holds at contact until the ball has actually left the boot (the release can land a few fixed steps
   after the wind-up on a slow frame), so the foot always meets the ball. */

const V18P_HOLD={f:0.44,u:1.04};
const V18P_CON={f:0.3,u:0.26,l:0.07};
const V18P_BACK={f:-0.42,u:0.64};
const V18P_TOP={f:0.6,u:1.3};

/* body-unit scale used to put pose points in the world (the 2-D figure is drawn at 1.06, the 3-D one at 0.92) */
Stage.prototype.v18pS=function(p){ return (p.hgt||70)/70; };

/* pose clock: ms since kickT, frozen at contact (kt=W) until release; then W + time since release */
Stage.prototype.v18pkt=function(K){ const kt=this.now-K.t0; return K.rel==null? Math.min(kt,K.W) : K.W+(this.now-K.rel); };

/* how far the keeper has travelled along his run (metres) at pose time t */
Stage.prototype.v18pBody=function(K,t){ const u=t/K.W; if(t<=K.W) return K.run*smooth(Math.min(1,Math.max(0,u)/0.6));
  const q=(t-K.W)/K.Fd; return K.run+0.45*smooth(clamp((q-0.15)/0.55,0,1)); };

/* the ball while he still has it: held out in front, then dropped (gravity-shaped) onto the kicking foot */
Stage.prototype.v18pBall=function(K,t){ const p=K.p, S=this.v18pS(p), ca=K.ax, sa=K.ay; const ud=K.W-K.Td;
  const hold={f:V18P_HOLD.f*S, l:0, z:V18P_HOLD.u*S-BALL_R};
  const con={f:V18P_CON.f*S+0.14, l:V18P_CON.l*S, z:Math.max(0.12,V18P_CON.u*S-0.07)};
  let f,l,z; if(t<ud){ const e=smooth(clamp(t/Math.max(1,K.W*0.14),0,1)); f=lerp(0.3*S,hold.f,e); l=0; z=lerp(0.92,hold.z,e); }
  else { const s=clamp((t-ud)/K.Td,0,1), g=0.25*s+0.75*s*s; f=lerp(hold.f,con.f,s); l=lerp(0,con.l,s); z=lerp(hold.z,con.z,g); }
  return {x:p.x+f*ca-l*sa, y:p.y+f*sa+l*ca, z}; };

/* the kicking (right) foot in the world from a pose */
Stage.prototype.v18pFootW=function(p,P){ const S=this.v18pS(p), a=this.yawOf(p), ca=Math.cos(a), sa=Math.sin(a), F=P.feet[1]; const lift=P.lift||0;
  return {x:p.x+(F.f*ca-F.l*sa)*S, y:p.y+(F.f*sa+F.l*ca)*S, z:(F.u+lift)*S}; };

const _v18pKK=Stage.prototype.kickKind;
Stage.prototype.kickKind=function(p,opt){ if(p&&opt&&opt.punt&&this.hands&&this.own===p&&!opt.nod) return 'punt'; return _v18pKK.apply(this,arguments); };

const _v18pWind=Stage.prototype.windOf;
Stage.prototype.windOf=function(kk){ if(kk==='punt') return this.D(480); return _v18pWind.apply(this,arguments); };

const _v18pHands=Stage.prototype.handsOf;
Stage.prototype.handsOf=function(p){ const K=this._v18pk; if(K&&K.p===p&&K.rel==null&&this.own===p) return this.v18pBall(K,this.v18pkt(K)); return _v18pHands.apply(this,arguments); };

const _v18pLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ const punt=!!(p&&opt&&opt.punt&&!this.skip&&this.hands&&this.own===p);
  const r=_v18pLaunch.apply(this,arguments);
  if(punt&&p.kickK==='punt'&&p.kickT===this.now){ const tg=opt.home||opt.to; const ang=Math.atan2(tg.y-p.y,tg.x-p.x);
    const W=p.kickW||this.D(480); const Fd=Math.max(140,this.D(560)); p.kickF=Fd; p.plant=false;
    p.yawLock=ang; p.yawLockT=this.now+W+Fd+Math.max(200,this.D(500)); p.face=Math.cos(ang)>=0?1:-1; p.yaw=ang;
    this._v18pk={p,x0:p.x,y0:p.y,ax:Math.cos(ang),ay:Math.sin(ang),t0:this.now,W,Fd,Td:Math.min(W*0.4,Math.max(45,this.D(150))),SE:Math.max(90,this.D(300)),run:this.ts<0.3?0.7:1.6,rel:null}; this.v18pStep(); }
  return r; };

/* after every step: script the keeper along his run and keep the ball in his hands / on its way to his foot */
Stage.prototype.v18pStep=function(){ const K=this._v18pk; if(!K) return; const p=K.p;
  if(!this.alive||p.off||(this.now-K.t0)>K.W*4+K.Fd+K.SE+3000){ this._v18pk=null; return; }
  if(K.rel==null&&this.own!==p){ const fl=this.fl; K.rel=fl&&!fl.phys&&fl.t0>=K.t0? fl.t0 : this.now;
    if(fl&&!fl.phys&&this.lastPunt&&this.lastPunt.gk===p){ const P=this.v18pPose(p,_v18pPose.call(this,p,false),K,K.W), ft=this.v18pFootW(p,P), b=fl.from; this.lastPunt.fl=fl; this.lastPunt.from={x:b.x,y:b.y,z:b.z}; this.lastPunt.foot=ft; this.lastPunt.contactD=Math.hypot(ft.x-b.x,ft.y-b.y,ft.z-(b.z+BALL_R)); } }
  const t=this.v18pkt(K); if(t>K.W+K.Fd+K.SE){ this._v18pk=null; return; }
  const B=this.v18pBody(K,t), nx=K.x0+K.ax*B, ny=K.y0+K.ay*B;
  p.vx=0; p.vy=0; p.x=nx; p.y=ny; p.yaw=Math.atan2(K.ay,K.ax);
  if(K.rel==null&&this.own===p&&this.hands){ const b=this.v18pBall(K,t); this.ball.x=b.x; this.ball.y=b.y; this.ball.z=b.z; } };

const _v18pUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v18pUpd.apply(this,arguments); if(this._v18pk) this.v18pStep(); return r; };

/* the punt pose (P.act='punt'); P.rot stays 0 so the 3-D figure never rolls the whole body */
Stage.prototype.v18pPose=function(p,P,K,tAt){ const t=tAt!=null?tAt:this.v18pkt(K), W=K.W, Fd=K.Fd, S=this.v18pS(p), run=K.run; const B=this.v18pBody(K,t);
  const F=P.feet, H=P.hands; P.act='punt'; P.rot=0; P.pivot=0; P.headTurn=0; P.mouth=false;
  const bf=w=>(w-B)/S; const ud=1-K.Td/W; const kR=0.95*run/1.6, kL=run+0.25;
  if(t<=W){ const u=t/W;
    /* kicking (right) foot: a quick step, planted, then the backswing (heel to the seat) and the whip through to contact */
    let rf,ru,rl=0.1;
    if(u<0.06){ rf=bf(0); ru=0; }
    else if(u<0.3){ const s=(u-0.06)/0.24; rf=bf(lerp(0,kR,smooth(s))); ru=0.16*Math.sin(Math.PI*s); }
    else if(u<0.52){ rf=bf(kR); ru=0; }
    else if(u<0.86){ const s=smooth((u-0.52)/0.34), f0=bf(kR); rf=lerp(f0,V18P_BACK.f,s); ru=lerp(0,V18P_BACK.u,s); rl=lerp(0.1,0.08,s); }
    else { const s=(u-0.86)/0.14, e=s*s*(1.6-0.6*s); rf=lerp(V18P_BACK.f,V18P_CON.f,e); ru=lerp(V18P_BACK.u,V18P_CON.u,e)-0.22*Math.sin(Math.PI*e); rl=lerp(0.08,V18P_CON.l,e); }
    F[1]={f:rf,u:Math.max(0,ru),l:rl};
    /* support (left) foot: planted, then the long last stride that plants it beside the dropping ball */
    let lf,lu=0,ll=-0.12;
    if(u<0.3){ lf=bf(0); }
    else if(u<0.6){ const s=(u-0.3)/0.3; lf=bf(lerp(0,kL,smooth(s))); lu=0.2*Math.sin(Math.PI*s); ll=lerp(-0.12,-0.17,s); }
    else { lf=bf(kL); ll=-0.17; }
    F[0]={f:lf,u:lu,l:ll};
    /* ball held out in front at waist height in both hands, then they open outward for balance as it drops */
    const bob=u<0.6?Math.sin(u/0.6*Math.PI*2)*0.025:0;
    if(u<ud){ H[0]={f:V18P_HOLD.f,u:V18P_HOLD.u+bob,l:-0.13}; H[1]={f:V18P_HOLD.f,u:V18P_HOLD.u+bob,l:0.13}; }
    else { const s=smooth((u-ud)/(1-ud)); H[0]={f:lerp(V18P_HOLD.f,0.22,s),u:lerp(V18P_HOLD.u,1.3,s),l:lerp(-0.13,-0.66,s)}; H[1]={f:lerp(V18P_HOLD.f,-0.08,s),u:lerp(V18P_HOLD.u,1.26,s),l:lerp(0.13,0.62,s)}; }
    const lb=smooth(clamp((u-0.55)/0.45,0,1)); P.lean=lerp(0.07,-0.13,lb); P.hipU=0.8-0.05*Math.sin(Math.PI*clamp((u-0.45)/0.55,0,1)); P.lift=u<0.6?0.025*Math.abs(Math.sin(u/0.6*Math.PI*2)):0;
    P.headTilt=lerp(0.22,0.42,smooth(clamp((u-0.5)/0.5,0,1))); return P; }
  const q=(t-W)/Fd;
  if(q<1){ /* follow-through: the leg carries on up to chest height, he rises onto his toes and hops forward, then lands */
    let rf,ru;
    if(q<0.35){ const s=q/0.35, e=1-(1-s)*(1-s); rf=lerp(V18P_CON.f,V18P_TOP.f,e); ru=lerp(V18P_CON.u,V18P_TOP.u,e); }
    else if(q<0.75){ const s=smooth((q-0.35)/0.4); rf=lerp(V18P_TOP.f,0.32,s); ru=lerp(V18P_TOP.u,0,s); }
    else { const s=smooth((q-0.75)/0.25); rf=lerp(0.32,0.12,s); ru=0; }
    F[1]={f:rf,u:ru,l:lerp(V18P_CON.l,0.11,smooth(q))};
    const hop=clamp((q-0.1)/0.5,0,1); P.lift=0.11*Math.sin(Math.PI*hop);
    const lw=kL+0.42*smooth(hop); F[0]={f:bf(lw),u:0,l:-0.16};
    const a=smooth(Math.min(1,q/0.3)), z=smooth(clamp((q-0.55)/0.45,0,1));
    H[0]={f:lerp(lerp(0.22,0.34,a),0.05,z),u:lerp(lerp(1.3,1.42,a),1.05,z),l:lerp(-0.66,-0.36,z)}; H[1]={f:lerp(lerp(-0.08,-0.3,a),0.0,z),u:lerp(lerp(1.26,1.3,a),1.05,z),l:lerp(0.62,0.34,z)};
    P.lean=lerp(-0.13,-0.2,Math.sin(Math.PI*Math.min(1,q/0.7)))*(1-z)+0.04*z; P.hipU=0.8+0.02*Math.sin(Math.PI*hop)-0.05*z*(1-z)*4*0.5;
    P.headTilt=lerp(0.42,-0.22,smooth(Math.min(1,q/0.35)))*(1-z)+(-0.1)*z; return P; }
  /* settle: he lands, the feet square up and the arms come down while the ball is still in the air */
  const s=smooth(clamp((t-W-Fd)/K.SE,0,1));
  F[1]={f:lerp(0.12,P.feet[1]?P.feet[1].f:0.06,s),u:0,l:lerp(0.11,P.feet[1]?P.feet[1].l:0.1,s)};
  F[0]={f:lerp(bf(kL+0.42),P.feet[0]?P.feet[0].f:0.02,s),u:0,l:lerp(-0.16,P.feet[0]?P.feet[0].l:-0.1,s)};
  H[0]={f:lerp(0.05,H[0].f,s),u:lerp(1.05,H[0].u,s),l:lerp(-0.36,H[0].l,s)}; H[1]={f:lerp(0,H[1].f,s),u:lerp(1.05,H[1].u,s),l:lerp(0.34,H[1].l,s)};
  P.lean=lerp(0.04,P.lean||0,s); P.headTilt=lerp(-0.1,P.headTilt||0,s); P.lift=0; P.hipU=lerp(0.8,P.hipU||0.8,s); return P; };

const _v18pPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v18pPose.apply(this,arguments); const K=this._v18pk; if(isRef||!K||K.p!==p||this.rm||p.dive||p.celeb) return P;
  if(this.now<K.t0) return P; return this.v18pPose(p,P,K); };

/* distribute: punt about 60% of the time (this._v18forcePunt makes it always, for the lab and tests) */
const _v18pDist=Stage.prototype.distribute;
Stage.prototype.distribute=async function(gk){
  const want=this._v18forcePunt!=null? !!this._v18forcePunt : Math.random()<0.6;
  if(!want||this.skip||!gk||this.own!==gk||!this.hands||!this.alive) return _v18pDist.apply(this,arguments);
  const dir=gk.side===0?1:-1, gl=gk.side===0?0:105; const fast=this.ts<0.3;
  const sy=clamp(gk.y,34-13,34+13); const sx=gl+dir*(fast?13.4:12.6);
  await this.carry(gk,sx,sy,fast?220:520); if(this.own!==gk||!this.hands||!this.alive) return;
  await this.wait(this.D(fast?60:200)); if(this.own!==gk||!this.hands||!this.alive||this.skip) return _v18pDist.apply(this,arguments);
  const run=fast?0.7:1.6, kx=gk.x+dir*run; const dist=46+Math.random()*12; const lx=clamp(kx+dir*dist,8,97), ly=clamp(sy+(Math.random()-0.5)*26,9,59);
  const tgt=this.nearest(gk.side,lx,ly,true); if(!tgt) return _v18pDist.apply(this,arguments);
  if(!tgt.ov) tgt.meet={x:lerp(tgt.x,lx,0.7),y:lerp(tgt.y,ly,0.7)};
  const h=14+Math.random()*4; const d=Math.hypot(lx-kx,ly-sy);
  this.lastPunt={t:this.now,gk,to:tgt,h};
  await this.launch(gk,{home:tgt,dur:this.D(2250+(d-45)*14),h,kind:'loft',punt:true});
  gk.ov=null;
};

/* the lab scene: a shot is caught and punted upfield */
LAB_SCENES.push(['punt','Keeper catch and punt']);
const _v18pLabRun=labRun;
labRun=function(scen){ const r=_v18pLabRun.apply(this,arguments); if(scen!=='punt') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    st._v18forcePunt=true; const P=[...st.players.values()]; const A=P.filter(p=>p.side===0); const fw=A[9];
    while(alive()){ st.zoomTo(0.5); st.focus=null; await st.gain(fw); if(!alive()) return; fw.x=82; fw.y=30+Math.random()*8; await st.shotSeq({s:0,pid:fw.pid,t:'save',x:40,y:84}); if(!alive()) return; await st.wait(st.D(1400)); } }); };
