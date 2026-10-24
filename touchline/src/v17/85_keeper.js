/* ===================== v18.7 B: more goalkeeper actions =====================
   Presentation only: the engine's events, their order and their emit moments are unchanged (this file only chooses how the
   keeper shows them; the extra corner and distribution choreography runs after the save has been announced).
   Builds on 80_saves.js (save kinds in p.dive, contact through handsOf, keeper rating q, beaten dives) and 70_punt.js (punts):
   - kick (gkkick): a low shot close to his body from close range: weight on the far leg, the near leg and boot out to it.
   - react (gkreact): a close-range shot at or near him with no time to set: a hand thrown up, a flinch, quick (160 ms lead).
   - star: one-on-ones. When a forward is clean through and the keeper has come out, he spreads big as the shot is shaped
     (arms and legs wide, body square to the shooter); saves from there are star blocks (a limb in the way, 'star') or
     smothers, goals and misses are 80's beaten dives starting from the star.
   - claim (gkclaim): corners: a gather step, a one-foot take-off with the near knee up for protection, the catch at the top of
     the jump above the crowd, pulled down to the chest, he lands and holds (then distributes).
   - punch (gkpunch): the same take-off into a crowded box, one fist or both fists through the ball at the top of the jump; the
     ball flies out of the box.
   - throw / roll: after a catch he punts (70), throws overarm to a free full-back or rolls it out underarm to a free defender
     close by, chosen by who is free and his rating. The ball stays in the throwing hand until release, then homes to the receiver.
   Contact: the new kinds reuse 80's solve (v186kSolve / v186kCentre / v186kArm): lim 3/4 = a boot (near foot), lim 5 = both
   fists with the ball in front of them; the flight homes to that point in 2-D and 3-D, so the ball is at the glove, fist or boot.
   Switches V187K; forced kinds for tests: st._v186kforce={k:'kick'|'react'|'star',q,out,z} (80's), st._v187kforce={ck:'claim'|
   'punch'|'head',fists:1|2}, st._v187kDist='throw'|'roll'|'punt'. Lab scene 'keeper2'. */

const V187K={on:true,kick:true,react:true,star:true,cross:true,dist:true,log:null};
const V187K_MINE={kick:1,react:1,star:1,claim:1,punch:1};
Object.assign(V186K_ACT,{kick:'gkkick',react:'gkreact',star:'gkstar',claim:'gkclaim',punch:'gkpunch'});
Object.assign(V186K_STAND,{kick:1,react:1,star:1,claim:1,punch:1});
Object.assign(V186K_A,{kick:210,react:160,star:200,claim:440,punch:420});
Object.assign(V186K_POST,{kick:460,react:380,star:480,claim:620,punch:560});
/* the star: arms and legs wide, square to the shooter (same vector layout as 80's keyframes) */
const V187K_STAR=[.74,.1,0,0,0,.04, .03,0,-.5, .03,0,.5, .2,1.42,-.72, .2,1.42,.72];
function v187kLog(o){ if(V187K.log&&V187K.log.length<4000) V187K.log.push(o); }

/* ---------- keyframes of the new kinds (written for the ball on his LEFT, n=+1: near limb = index 1; mirrored by 80) ---------- */
function v187kKeys(D){ const s=D.s, k=D.k, S0=V186K_SET;
  switch(k){
    case 'kick': return {uc:.5,keys:[[0,S0],
      [.25,[.64,.2,0,.06,.3,.2, .02,0,-.22, .07,.07,.42, .34,1.15,-.44, .36,1.02,.5]],
      [.5,[.6,.18,0,.14,.3,.38, 0,0,-.2, .16,s,.66, .26,1.42,-.62, .34,.85,.7]],
      [.76,[.64,.14,0,.06,.3,.24, .02,0,-.22, .12,.06,.48, .3,1.25,-.5, .34,1.0,.5]],
      [1,[.7,.12,0,0,0,.1, .02,0,-.22, .04,0,.28, .36,1.15,-.34, .36,1.15,.34]]]};
    case 'react': return {uc:.5,keys:[[0,S0],
      [.28,[.7,.08,0,-.06,.6,-.05, .02,0,-.24, .04,0,.28, .34,1.3,-.4, .3,(1.18+s)/2,.42]],
      [.5,[.72,-.08,.04,-.18,.6,-.22, 0,0,-.24, .06,.05,.32, .28,1.42,-.52, .26,s,.56]],
      [.76,[.72,-.02,0,-.1,.6,-.12, .02,0,-.24, .05,0,.3, .3,1.3,-.42, .26,s-.12,.5]],
      [1,[.7,.12,0,0,0,.05, .02,0,-.24, .02,0,.24, .36,1.18,-.34, .36,1.18,.34]]]};
    case 'star': { const C=D.lim>=3?[.72,.1,.04,.1,.4,.12, .03,0,-.52, .12,s,.64, .2,1.48,-.74, .22,1.25,.76]:[.74,.06,.06,-.1,.5,0, .03,0,-.5, .05,.04,.54, .2,1.42,-.74, .2,s,.8];
      return {uc:.5,keys:[[0,V187K_STAR],[.22,V187K_STAR],[.5,C],
      [.78,[.72,.12,0,0,0,.1, .03,0,-.44, .05,.03,.44, .26,1.25,-.62, .26,1.2,.62]],
      [1,[.7,.12,0,0,0,.08, .02,0,-.26, .02,0,.26, .36,1.18,-.34, .36,1.18,.34]]]}; }
    case 'claim': return {uc:.62,keys:[[0,S0],
      [.3,[.62,.3,0,0,0,.1, -.1,0,-.16, .22,.06,.14, .2,1.0,-.3, .2,1.0,.3]],
      [.62,[.8,-.08,s,0,0,-.5, -.06,.05,-.12, .3,.55,.08, .16,2.02,-.1, .16,2.02,.1]],
      [.82,[.74,.14,s*.3,0,0,-.05, -.04,0,-.14, .14,.18,.12, .28,1.3,-.1, .28,1.28,.1]],
      [1,V186K_HOLD]]};
    case 'punch': { const two=D.lim===5; const H=two?[.34,1.95,-.07, .34,1.95,.07]:[.18,1.45,-.3, .36,2.0,.1]; const H2=two?[.42,2.06,-.08, .42,2.06,.08]:[.15,1.4,-.32, .44,2.1,.08];
      return {uc:.6,keys:[[0,S0],
      [.3,[.62,.28,0,0,0,.05, -.1,0,-.16, .22,.06,.14, .24,1.42,-.16, .24,1.42,.16]],
      [.6,[.8,-.04,s,0,0,-.4, -.06,.05,-.12, .28,.5,.08].concat(H)],
      [.78,[.76,-.1,s*.55,0,0,-.3, -.05,.02,-.14, .2,.25,.1].concat(H2)],
      [1,[.72,.12,0,0,0,.05, .02,0,-.2, .06,0,.2, .3,1.15,-.3, .3,1.15,.3]]]}; } }
  return null; }
const _v187kKeys0=v186kKeys;
/* every kind armed from the star starts from the star (keyframe 0), so there is no pop when the save or the dive begins */
v186kKeys=function(D){ let K=V187K_MINE[D.k]?v187kKeys(D):_v187kKeys0(D); if(D.v187s&&K&&K.keys&&K.keys.length) K={uc:K.uc,keys:K.keys.map((x,i)=>i?x:[x[0],V187K_STAR])}; return K; };

/* ---------- contact points: a boot (lim 3/4) and two fists with the ball in front of them (lim 5) ---------- */
function v187kUp(P,is3,f,u,l){ const lean=P.lean||0, cl=Math.cos(lean), sl=Math.sin(lean), hipU=P.hipU;
  if(is3){ const du=u-0.8; return du<=0?[f,hipU+du,l]:[f*cl+du*sl,hipU+du*cl-f*sl,l]; }
  if(u<=hipU) return [f,u,l]; const du=u-hipU; return [f*cl+du*sl,hipU+du*cl-f*sl,l]; }
/* the drawn ankle (leg IK 0.43 + 0.43 from the hip, as both painters solve it) */
function v187kFoot(p,P,i,is3,yaw){ const B=V186K_B[(p.look&&p.look.build)]||1, sd=i?1:-1, F=P.feet[i], hp=[0,P.hipU,sd*0.09*B]; let t=[F.f,F.u+0.06,F.l];
  const dx=t[0]-hp[0], dy=t[1]-hp[1], dz=t[2]-hp[2], d=Math.hypot(dx,dy,dz), mx=0.86*0.999; if(d>mx){ const k=mx/d; t=[hp[0]+dx*k,hp[1]+dy*k,hp[2]+dz*k]; }
  return v186kW(p,P,t[0],t[1],t[2],is3,yaw); }
const _v187kCentre0=v186kCentre;
v186kCentre=function(st,p,P,lim,is3,yaw,bey){ if(lim!==3&&lim!==4&&lim!==5) return _v187kCentre0.apply(this,arguments);
  const R=is3?(typeof V18_BALL_R==='number'?V18_BALL_R:0.176):BALL_R;
  if(lim===5){ const a=v186kHand(p,P,0,is3,yaw), b=v186kHand(p,P,1,is3,yaw), m={x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2}; const u=v187kUp(P,is3,0,1.5,0), S=v186kW(p,P,u[0],u[1],u[2],is3,yaw);
    const ex=m.x-S.x, ey=m.y-S.y, ez=m.z-S.z, el=Math.hypot(ex,ey,ez)||1, k=R*0.85/el; return {x:m.x+ex*k,y:m.y+ey*k,z:m.z+ez*k}; }
  /* the ball beside the boot, on the side the leg reaches out to */
  const A=v187kFoot(p,P,lim-3,is3,yaw), H=v186kW(p,P,0,P.hipU,0,is3,yaw); let ex=A.x-H.x, ey=A.y-H.y; const el=Math.hypot(ex,ey)||1; ex/=el; ey/=el;
  return {x:A.x+ex*R*0.8,y:A.y+ey*R*0.8,z:Math.max(R,A.z+0.1)}; };

/* ---------- placing a new kind (the standing-kind part of 80's v186kMake, with the new limbs) ---------- */
Stage.prototype.v187kMake=function(gk,sh,k,o){ const is3=v186kIs3D(this), q=o.q, gl=gk.side===0?0:105, pd=gk.side===0?1:-1, R=v186kBR(this);
  const bx=o.bx!=null?o.bx:o.set?o.set.x:gk.x, by=o.by!=null?o.by:o.set?o.set.y:gk.y;
  const yaw=o.yaw!=null?o.yaw:sh?Math.atan2(sh.y-by,sh.x-bx):(pd>0?0:Math.PI);
  let n=(o.ty-by)*Math.cos(yaw)>=0?1:-1; if(o.n) n=o.n; const nn=n>0?1:0;
  const lim=k==='kick'?3+nn : k==='react'?nn : k==='star'?(o.z<0.5?3+nn:nn) : k==='claim'?2 : (o.fists===1?nn:5);
  const D0={k,n,out:o.out||'none',lim,low:o.z<0.5,q,s:0};
  const pseudo={x:0,y:0,yaw,hgt:gk.hgt,look:gk.look};
  const rng=k==='kick'||(k==='star'&&lim>=3)?[0,0.5] : k==='react'?[0.95,2.05] : k==='star'?[0.9,2.0] : [0,0.62];
  const sol=v186kSolve(D0,pseudo,is3,yaw,rng[0],rng[1],o.z+R); D0.s=sol.s;
  let x1=bx, y1=by; if(k==='kick'||k==='react'){ const lm=k==='react'?0.45:0.9; y1=by+clamp(o.ty-sol.d.y-by,-lm,lm); }
  const cin=pd*(x1+sol.d.x-gl); if(cin<0.4) x1+=pd*(0.4-cin); x1=pd>0?Math.max(x1,gl+0.25):Math.min(x1,gl-0.25);
  return {D:D0,x1,y1,yaw,syaw:yaw,stand:true,c:{x:x1+sol.d.x,y:y1+sol.d.y,z:sol.z}}; };
const _v187kMake0=Stage.prototype.v186kMake;
Stage.prototype.v186kMake=function(gk,sh,k,o){ if(V187K.on){ const W=this._v187kSwap; if(k==='smother'&&W){ this._v187kSwap=null; k=W.k; o={...o,n:Math.random()<0.5?1:-1}; }
    if(V187K_MINE[k]) return this.v187kMake(gk,sh,k,o); } return _v187kMake0.apply(this,arguments); };
/* a kind armed while he is spread in the star starts from it */
const _v187kArm0=Stage.prototype.v186kArm;
Stage.prototype.v186kArm=function(gk,sh,M,f,o){ const S=gk&&gk.v187st; if(V187K.on&&S&&this.now-S.t0<S.max&&M&&M.D&&!M.D.v187s) M={...M,D:{...M.D,v187s:1}};
  const D=_v187kArm0.call(this,gk,sh,M,f,o); if(D&&V187K_MINE[D.k]) v187kLog({arm:D.k,out:D.out,lim:D.lim,q:+D.q.toFixed(2),tC:D.tP0,t:D.t,star:!!D.v187s,is3:v186kIs3D(this)}); return D; };

/* ---------- choosing kick / react / star on saves (after 80's plan; the event and its timing are 80's) ---------- */
const _v187kPlan0=Stage.prototype.v186kPlan;
Stage.prototype.v186kPlan=function(e,gk,sh,sx,sy){ const P=_v187kPlan0.apply(this,arguments); this._v187kSwap=null; if(!V187K.on||!P) return P;
  const F=this._v186kforce||{}; const q=P.q, set=P.set; let k=null;
  if(F.k){ if(!V187K_MINE[F.k]) return P; k=F.k; }
  else if(P.k!=='tipOver'){ const r=Math.random(), dy=Math.abs(P.ty-set.y);
    if(P.k==='smother'){ if(V187K.star&&r<0.42) k='star'; }
    else if(V187K.kick&&P.band===0&&P.dist<=14&&dy>=0.3&&dy<=1.6&&r<0.6) k='kick';
    else if(V187K.react&&P.dist<=10.5&&P.z>=0.7&&dy<=1.5&&r<0.62) k='react'; }
  if(!k) return P;
  const R={...P}, sg=Math.sign(P.ty-set.y)||(Math.random()<0.5?1:-1);
  if(k==='kick'){ R.band=0; R.z=F.z!=null?F.z:0.03+Math.random()*0.26; R.ty=set.y+sg*(0.45+Math.random()*0.8); R.out=P.cor?'corner':'parry'; }
  else if(k==='react'){ R.z=F.z!=null?F.z:clamp(P.z,0.8,1.9); R.band=R.z>1.6?2:1; R.ty=set.y+sg*(0.25+Math.random()*0.75); R.out=P.cor?'corner':(q>0.8&&Math.random()<0.5?'catch':'parry'); }
  else { R.z=F.z!=null?F.z:(Math.random()<0.55?0.05+Math.random()*0.3:0.7+Math.random()*0.7); R.band=R.z<0.5?0:1; R.out=P.cor?'corner':'parry';
    /* the come-out is 80's smother approach; the kind is swapped at the strike */ this._v187kSwap={e,k:'star'}; }
  if(F.out) R.out=F.out; if(F.ty!=null) R.ty=F.ty;
  R.ty=clamp(R.ty,GF.y0+0.35,GF.y1-0.35); R.k=k==='star'?'smother':k; e._v187k=k; return R; };

/* the save's caption and commentary name the new kinds */
if(typeof V186R_LINES==='object'&&V186R_LINES){
  V186R_LINES.kick=['{g} sticks out a leg and keeps out {p}!','A save with the feet from {g} to deny {p}.','{p} is denied by an outstretched boot from {g}.'];
  V186R_LINES.react=['What reflexes from {g}! {p} is denied from close range.','{g} throws up a hand to keep out {p}.','Point-blank from {p}, and {g} somehow gets a hand to it.'];
  V186R_LINES.star=['{g} comes out, makes himself big and blocks {p}!','One-on-one, and {g} spreads himself to deny {p}.','{p} is clean through, but {g} stands tall and blocks it.']; }
const V187K_CAP={kick:'KICK SAVE!',react:'REFLEX SAVE!',star:'BLOCKED!'};
const _v187kSave0=Stage.prototype.v186kSave;
Stage.prototype.v186kSave=async function(e){ if(!V187K.on) return _v187kSave0.apply(this,arguments);
  const em=this.emit, oc=this.onCaption; let capd=false;
  const myEmit=function(ev){ if(ev===e&&e._v187k&&e.t==='save'){ const k=e._v187k; if(k!=='react'||e._how!=='tip') e._how=k; } return em.apply(this,arguments); };
  const myCap=function(t,kind){ if(!capd&&kind==='shot'&&e._v187k){ capd=true; const k=e._v187k; if(k!=='react'||t!=='TIPPED AROUND THE POST') t=V187K_CAP[k]||t; } return oc.call(this,t,kind); };
  this.emit=myEmit; this.onCaption=myCap;
  try{ return await _v187kSave0.apply(this,arguments); } finally{ if(this.emit===myEmit) this.emit=em; if(this.onCaption===myCap) this.onCaption=oc; } };

/* ---------- one-on-ones: the star before the shot ---------- */
/* a forward clean through (no outfield defender between him and the goal), the keeper off his line and in front of him */
Stage.prototype.v187kStarPre=function(p,opt){ const gk=this.gkOf(1-p.side); if(!gk||(gk.dive&&gk.dive.k)||this.hands) return; const gl=gk.side===0?0:105, pd=gk.side===0?1:-1;
  const ds=Math.hypot(p.x-gl,p.y-34); if(ds>17||ds<4.5) return; const off=pd*(gk.x-gl); if(off<1.8) return;
  const ux=(p.x-gl)/ds, uy=(p.y-34)/ds; const along=(gk.x-gl)*ux+(gk.y-34)*uy, side=Math.abs(-(gk.x-gl)*uy+(gk.y-34)*ux); if(along<1.2||along>ds-1.5||side>2.4) return;
  for(const q of this.players.values()){ if(q.side!==gk.side||q.gk||q.off) continue; const a=(q.x-gl)*ux+(q.y-34)*uy, sd=Math.abs(-(q.x-gl)*uy+(q.y-34)*ux); if(a>0&&a<ds-0.5&&sd<2.6) return; }
  const W=this.windOf('shot'); gk.v187st={t0:this.now,tS:this.now+Math.max(80,W*0.9),max:Math.max(900,this.D(1700))}; gk.ov={x:gk.x,y:gk.y}; gk.hurry=false; this.look(gk,p.x,p.y,Math.max(700,this.D(1500)));
  v187kLog({k:'starPre',ds:+ds.toFixed(1),off:+off.toFixed(1),t:this.now}); };
const _v187kLaunch0=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ if(V187K.on&&V187K.star&&p&&opt&&opt.kind==='shot'&&!opt.nod&&!opt.head&&this.setPiece!=='pen'&&!this.skip&&!this.so){ try{ this.v187kStarPre(p,opt); }catch(err){ v187kLog({err:String(err)}); } }
  return _v187kLaunch0.call(this,p,opt); };

/* ---------- corners: high claim and punch ---------- */
/* who deals with the cross: the keeper comes for more of them the better he is; into a crowd (or for a poorer keeper) he punches */
Stage.prototype.v187kCrossChoice=function(gk,mx,my){ const F=this._v187kforce; if(F&&F.ck) return F.ck; const q=v186kQ(this,gk); let crowd=0;
  for(const p of this.players.values()){ if(p.off||p===gk) continue; if(Math.hypot(p.x-mx,p.y-my)<3.2) crowd++; }
  if(Math.random()>=lerp(0.34,0.58,q)) return 'head'; return Math.random()<clamp(0.22+0.12*crowd-0.3*q,0.12,0.8)?'punch':'claim'; };
/* the leap is armed one lead time before the cross arrives (he runs to the spot until then, then gathers, takes off and meets it) */
Stage.prototype.v187kAir=function(gk,sh,k,f,o){ const self=this, q=v186kQ(this,gk); const tA=f.t0+f.dur; const Ld=this.D(V186K_A[k]*(0.85+0.35*q)); const react=Math.max(30,this.D(lerp(170,70,q)));
  const go=()=>{ if(!self.alive||self.fl!==f||gk.off) return; const sp=gk.ov||{x:gk.x,y:gk.y};
    const M=self.v187kMake(gk,sh,k,{q,ty:sp.y,z:o.z,out:k==='claim'?'catch':'punch',fists:o.fists,bx:sp.x,by:sp.y,yaw:Math.atan2(sh.y-sp.y,sh.x-sp.x),n:o.n||(Math.random()<0.5?1:-1)});
    self.v186kArm(gk,sh,M,f,null); };
  const tw=tA-Ld-react; if(this.now>=tw) go(); else this.until(()=>this.now>=tw||!this.alive||this.fl!==f,tw-this.now+400).then(go); };
const _v187kCK0=Stage.prototype.cornerKick;
Stage.prototype.cornerKick=async function(s,sg){ if(!V187K.on||!V187K.cross) return _v187kCK0.apply(this,arguments);
  /* the set-up mirrors ui_stage.js cornerKick :488-495 (keep the two in step); the delivery adds the keeper's high claim and punch */
  const dir=s===0?1:-1, gx=s===0?105:0; const cy=sg<0?0.6:67.4, cx=gx-dir*0.6;
  this.onCaption('CORNER','set'); const taker=this.nearest(s,cx-dir*6,cy,true); if(!taker) return; const gk=this.gkOf(1-s);
  let a=0,d=0; for(const q of this.players.values()){ if(q===taker||q.off||q.gk) continue; if(q.side===s&&a<4){ q.ov={x:gx-dir*(6+Math.random()*6),y:29.5+Math.random()*9}; a++; } else if(q.side!==s&&d<5){ q.ov={x:gx-dir*(2.5+Math.random()*6.5),y:29.5+Math.random()*9}; d++; } }
  taker.ov={x:cx+dir*0.9,y:cy+(sg<0?-0.7:0.7)}; this.own=null;
  await this.launch(null,{to:{x:cx,y:cy,z:0},dur:this.D(420)+80,h:1.2,kind:'pass'}); this.ownLock={x:cx,y:cy};
  await this.until(()=>dist2(taker,taker.ov)<0.8, this.eta(taker,taker.ov.x,taker.ov.y,1.3)); if(this.skip) return;
  taker.x=taker.ov.x; taker.y=taker.ov.y; this.own=taker; this.placed=true; this.hands=false; this.ownLock={x:cx,y:cy}; this.ball={x:cx,y:cy,z:0,spin:this.ball.spin};
  await this.wait(this.D(220));
  const JD=Math.max(260,this.D(560));
  const mx=gx-dir*(3.8+Math.random()*1.6), my=34+sg*(1.5+Math.random()*2.5);
  const ch=gk?this.v187kCrossChoice(gk,mx,my):'head';
  if(gk&&(ch==='claim'||ch==='punch')){ const punch=ch==='punch', F=this._v187kforce||{}; const fists=punch?(F.fists||(Math.random()<0.55?2:1)):0;
    gk.dive=null; gk.ov={x:mx,y:my}; gk.hurry=true; const z=(punch?2.2:2.3)+Math.random()*0.25;
    /* the box makes room where he comes for it (nobody stands in his take-off spot); an attacker goes up with him, beside him */
    for(const q of this.players.values()){ if(q===gk||q===taker||q.off) continue; const t=q.ov||q; const ex=t.x-mx, ey=t.y-my, el=Math.hypot(ex,ey); if(el<1.6){ const ux=el>0.05?ex/el:-dir, uy=el>0.05?ey/el:0; q.ov={x:clamp(mx+ux*1.7,1,104),y:clamp(my+uy*1.7,1,67)}; } }
    let rival=null, rd=9; for(const q of this.players.values()){ if(q.side!==s||q===taker||q.off||q.gk) continue; const dd=Math.hypot(q.x-mx,q.y-my); if(dd>1.4&&dd<3.6&&dd<rd){ rd=dd; rival=q; } }
    v187kLog({k:ch,fists,q:+v186kQ(this,gk).toFixed(2),t:this.now});
    await this.launch(taker,{home:gk,hands:true,dur:this.D(760),h:4,onRelease:f=>{ const ul=Math.hypot(taker.x-mx,taker.y-my)||1; f.aim={x:mx+(taker.x-mx)/ul*0.25,y:my+(taker.y-my)/ul*0.25}; /* aimed at the meeting point from the start (no late change of aim) */ this.v187kAir(gk,taker,ch,f,{z,fists}); if(rival) rival.jumpT=this.now+f.dur-JD*0.5; }});
    gk.hurry=false; const D=gk.dive;
    if(punch){ if(this.own===gk){ this.own=null; this.hands=false; } const b=this.ball;
      const tx=clamp(gx-dir*(16+Math.random()*13),8,97), ty=clamp(34+sg*(Math.random()<0.7?1:-1)*(7+Math.random()*12),5,63);
      v187kLog({k:'punchOut',from:{x:+b.x.toFixed(2),y:+b.y.toFixed(2),z:+b.z.toFixed(2)},to:{x:+tx.toFixed(1),y:+ty.toFixed(1)}});
      await this.launch(null,{to:{x:tx,y:ty,z:0},dur:this.D(820)+120,h:3+Math.random()*2.5,kind:'clear',cont:true});
      this.onCaption('PUNCHED CLEAR','set'); this.clearStaged(); }
    else { gk.gatherT=this.now; this.onCaption(this.own===gk?'CLAIMED':'CORNER','set'); this.clearStaged(); }
    if(D&&D.k&&gk.dive===D){ const end=D.tP0+D.post; await this.until(()=>this.now>=end||gk.dive!==D,Math.max(60,end-this.now)+300); if(gk.dive===D) gk.dive=null; }
    gk.ov=null; if(!punch&&this.own===gk&&this.hands) await this.distribute(gk); return; }
  /* headed clear (ui_stage.js cornerKick :498-502) */
  const df=this.nearest(1-s,gx-dir*6,34+sg*2,true); if(!df){ this.clearStaged(); return; }
  df.ov={x:df.x,y:df.y};
  await this.launch(taker,{home:df,head:true,dur:this.D(760),h:4.2,onRelease:f=>{ df.jumpT=this.now+f.dur-JD*0.5; }});
  if(this.own===df) await this.launch(df,{to:{x:clamp(gx-dir*(24+Math.random()*12),8,97),y:clamp(34+(Math.random()-.5)*34,6,62),z:0},dur:this.D(760),h:3.2,kind:'clear',nod:true,cont:true});
  this.onCaption('HEADED CLEAR','set'); this.clearStaged(); df.ov=null; };

/* ---------- distribution: punt, overarm throw or roll out ---------- */
/* keyframes over the throw clock: 0..1 the wind-up (release at 1), 1..2 the follow-through; the ball is in hand 1 (his right) */
const V187K_TH={
  throw:[[0,V186K_HOLD],[.35,[.76,-.1,0,0,0,0, .3,0,-.12, -.1,0,.14, .5,1.5,-.14, -.2,1.6,.3]],[.8,[.76,-.16,0,0,0,-.05, .42,0,-.1, -.14,0,.14, .55,1.6,-.16, -.42,1.78,.28]],
    [1,[.78,.16,0,0,0,.05, .42,0,-.1, -.12,.02,.14, .05,1.05,-.3, .3,2.02,.1]],[1.35,[.76,.3,0,0,0,.15, .42,0,-.1, .05,.1,.12, -.05,1.0,-.32, .5,1.22,-.08]],
    [1.75,[.78,.12,0,0,0,.08, .3,0,-.12, .26,0,.12, .1,1.0,-.28, .25,1.05,.22]],[2,[.8,.06,0,0,0,.05, .12,0,-.12, .12,0,.12, .05,1.0,-.27, .05,1.0,.27]]],
  roll:[[0,V186K_HOLD],[.35,[.66,.55,0,0,0,.25, .32,0,-.14, -.1,0,.16, .4,1.0,-.3, -.18,.8,.26]],[.75,[.58,1.05,0,0,0,.35, .46,0,-.14, -.28,0,.16, .5,.85,-.32, -.32,.7,.26]],
    [1,[.58,1.15,0,0,0,.35, .46,0,-.14, -.26,0,.16, .45,.85,-.34, .75,.3,.12]],[1.35,[.64,.8,0,0,0,.25, .46,0,-.14, -.2,0,.16, .4,.95,-.32, .75,.62,.1]],
    [1.75,[.74,.3,0,0,0,.12, .3,0,-.13, .1,0,.14, .25,1.0,-.3, .35,1.0,.2]],[2,[.8,.06,0,0,0,.05, .12,0,-.12, .12,0,.12, .05,1.0,-.27, .05,1.0,.27]]]};
/* the arm accelerates into the release and decelerates after it */
function v187kTVec(K,ph){ if(ph<=K[0][0]) return K[0][1]; for(let i=1;i<K.length;i++){ if(ph<=K[i][0]){ const a=K[i-1], b=K[i]; const s=clamp((ph-a[0])/Math.max(1e-6,b[0]-a[0]),0,1);
  const w=b[0]===1?s*s:a[0]===1?1-(1-s)*(1-s):smooth(s); return a[1].map((x,j)=>x+(b[1][j]-x)*w); } } return K[K.length-1][1]; }
/* the throw clock: held at the release until the ball has actually left his hand (the release can land a step or two after the wind-up) */
function v187kClock(K,now){ return K.rel==null?Math.min(now-K.t0,K.W):K.W+(now-K.rel); }
Stage.prototype.v187kThrowPose=function(p,K,now){ const t=v187kClock(K,now); const ph=t<=K.W?Math.max(0,t)/K.W:t<=K.W+K.Fd?1+(t-K.W)/K.Fd:2;
  const v=v187kTVec(V187K_TH[K.k],ph).slice();
  /* the front foot steps (lifted, not slid) into the throw, the back foot comes through after it */
  if(ph<0.5){ const w=clamp((ph-0.04)/0.42,0,1); v[7]+=(K.k==='roll'?0.12:0.16)*Math.sin(Math.PI*w); }
  if(ph>1.2&&ph<1.8){ const w=(ph-1.2)/0.6; v[10]+=0.12*Math.sin(Math.PI*w); }
  const P=v186kP(v,1,K.k==='roll'?'gkroll':'gkthrow'); P.v187=K.t0; P.v187ph=ph; return P; };
/* the ball in the throwing hand (taken from the chest hold over the first moments) */
Stage.prototype.v187kBall=function(p,K){ const is3=v186kIs3D(this), R=v186kBR(this), P=this.v187kThrowPose(p,K,this.now), yaw=this.yawOf(p); const H=v186kHand(p,P,1,is3,yaw); let c;
  if(K.k==='roll') c={x:H.x+Math.cos(yaw)*R*0.75,y:H.y+Math.sin(yaw)*R*0.75,z:Math.max(R,H.z)};
  else { const u=v187kUp(P,is3,0,1.5,0.21*(V186K_B[(p.look&&p.look.build)]||1)), S=v186kW(p,P,u[0],u[1],u[2],is3,yaw); const ex=H.x-S.x, ey=H.y-S.y, ez=H.z-S.z, el=Math.hypot(ex,ey,ez)||1; c={x:H.x+ex/el*R*0.7,y:H.y+ey/el*R*0.7,z:H.z+ez/el*R*0.7}; }
  const t=v187kClock(K,this.now)/K.W; if(t<0.18){ const b={x:p.x+Math.cos(yaw)*0.3,y:p.y+Math.sin(yaw)*0.3+0.03,z:0.92+R}, w=smooth(Math.max(0,t)/0.18); c={x:lerp(b.x,c.x,w),y:lerp(b.y,c.y,w),z:lerp(b.z,c.z,w)}; }
  return {x:c.x,y:c.y,z:Math.max(0,c.z-R)}; };
/* who is free: a defender close by on a clear lane (roll), or a full-back out wide (throw); punt otherwise, or by choice */
Stage.prototype.v187kDistChoice=function(gk){ const F=this._v187kDist, fp=this._v18forcePunt; const dir=gk.side===0?1:-1; const q=v186kQ(this,gk);
  let roll=null, thr=null, rs=-1e9, ts=-1e9;
  for(const p of this.players.values()){ if(p.side!==gk.side||p.gk||p.off) continue; const d=Math.hypot(p.x-gk.x,p.y-gk.y), fwd=dir*(p.x-gk.x); if(fwd<2) continue;
    let near=9e9; for(const o of this.players.values()){ if(o.side===gk.side||o.off) continue; near=Math.min(near,Math.hypot(o.x-p.x,o.y-p.y)); }
    const lane=this.laneBlock(gk,p);
    if(d>=8&&d<=24&&!lane&&near>4.5){ const sc=near-Math.abs(d-15)*0.3; if(sc>rs){ rs=sc; roll=p; } }
    if(d>=14&&d<=38&&near>5&&Math.abs(p.y-34)>8){ const sc=near+Math.abs(p.y-34)*0.2-Math.abs(d-26)*0.2-lane*3; if(sc>ts){ ts=sc; thr=p; } } }
  if(F==='roll'||F==='throw'){ const to=F==='roll'?(roll||this.nearest(gk.side,gk.x+dir*14,gk.y,true)):(thr||this.nearest(gk.side,gk.x+dir*24,gk.y<34?14:54,true)); return to?{k:F,to}:{k:'punt'}; }
  if(F==='punt'||fp===true) return {k:'punt'};
  const short=fp===false?1:lerp(0.42,0.62,q);
  if((roll||thr)&&Math.random()<short){ if(roll&&thr) return Math.random()<0.5?{k:'roll',to:roll}:{k:'throw',to:thr}; return roll?{k:'roll',to:roll}:{k:'throw',to:thr}; }
  if(fp===false){ const to=this.nearest(gk.side,gk.x+dir*14,gk.y,true); return to?{k:'roll',to}:{k:'base'}; }
  return {k:'punt'}; };
Stage.prototype.v187kThrow=async function(gk,k,R){ const dir=gk.side===0?1:-1, gl=gk.side===0?0:105; const fast=this.ts<0.3;
  const ax=gk.x+dir*(fast?1.5:2.5), lm=gl+dir*15; await this.carry(gk,dir>0?Math.min(ax,lm):Math.max(ax,lm),gk.y,fast?200:330);
  if(this.own!==gk||!this.hands||!this.alive||this.skip||R.off) return false;
  this.look(gk,R.x,R.y,this.D(1500)); await this.wait(this.D(fast?60:170)); if(this.own!==gk||!this.hands||!this.alive||this.skip) return false;
  const d=Math.hypot(R.x-gk.x,R.y-gk.y), roll=k==='roll';
  const W=Math.max(110,this.D(roll?560:540)), Fd=Math.max(150,this.D(roll?520:480));
  gk.v187kd={k,t0:this.now,W,Fd,SE:Math.max(90,this.D(260)),rel:null};
  const dur=roll?this.D(560)*clamp(d/13,0.8,1.9):this.D(640)*clamp(d/18,0.8,1.7), h=roll?0:clamp(0.6+d*0.03,0.8,1.7);
  this.lastDist={k,gk,to:R,t:this.now,d}; v187kLog({k,to:R.pid,d:+d.toFixed(1),q:+v186kQ(this,gk).toFixed(2)});
  this._v187kW=W; let pr; try{ pr=this.launch(gk,{home:R,dur,h,kind:'pass'}); } finally{ this._v187kW=null; }
  await pr; gk.ov=null; return true; };
const _v187kWind0=Stage.prototype.windOf;
Stage.prototype.windOf=function(kk){ if(kk==='throw'&&this._v187kW) return this._v187kW; return _v187kWind0.apply(this,arguments); };
const _v187kDist0=Stage.prototype.distribute;
Stage.prototype.distribute=async function(gk){
  if(!V187K.on||!V187K.dist||this.skip||!gk||this.own!==gk||!this.hands||!this.alive) return _v187kDist0.apply(this,arguments);
  const C=this.v187kDistChoice(gk);
  if(C.k==='punt'){ const fp=this._v18forcePunt; this._v18forcePunt=true; try{ return await _v187kDist0.apply(this,arguments); } finally{ this._v18forcePunt=fp; } }
  if(C.k==='base'||!C.to) return _v187kDist0.apply(this,arguments);
  const r=await this.v187kThrow(gk,C.k,C.to); if(r===false&&this.own===gk&&this.hands&&this.alive&&!this.skip){ const fp=this._v18forcePunt; this._v18forcePunt=false; try{ return await _v187kDist0.apply(this,arguments); } finally{ this._v18forcePunt=fp; } } };

/* ---------- per frame: hands, pose, blend, the ball in the throwing hand ---------- */
const _v187kHands0=Stage.prototype.handsOf;
Stage.prototype.handsOf=function(p){ const K=p&&p.v187kd; if(V187K.on&&K&&K.rel==null&&this.own===p&&this.hands&&!p.dive&&this.now>=K.t0) return this.v187kBall(p,K); return _v187kHands0.apply(this,arguments); };
const _v187kPose0=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v187kPose0.apply(this,arguments); if(isRef||!p||!p.gk||!V187K.on) return P; const now=this.now;
  const K=p.v187kd; if(K){ const c=v187kClock(K,now); if(c>=K.W+K.Fd+K.SE||p.dive||now-K.t0>K.W+K.Fd+K.SE+3000) p.v187kd=null; else if(now>=K.t0) return this.v187kThrowPose(p,K,c>K.W+K.Fd?now-(c-K.W-K.Fd):now); }
  const S=p.v187st; if(S){ if(now-S.t0>S.max){ p.v187st=null; return P; }
    if(!p.dive||!p.dive.k||now<p.dive.t){ const w=smooth(clamp((now-S.t0)/Math.max(60,S.tS-S.t0),0,1)); const v=V186K_SET.map((x,j)=>x+(V187K_STAR[j]-x)*w); const Q=v186kP(v,1,'gkstar'); Q.v187=S.t0; return Q; } }
  return P; };
const _v187kBlend0=Stage.prototype.blendPose;
Stage.prototype.blendPose=function(p,P){ const Q=_v187kBlend0.apply(this,arguments); if(!P||P.v187==null||P.v186!=null) return Q; if(this.now-P.v187<Math.max(40,this.D(60))) return Q; p._pose=P; return P; };
const _v187kUpd0=Stage.prototype.update;
Stage.prototype.update=function(dt){ const r=_v187kUpd0.apply(this,arguments); if(!V187K.on) return r; const o=this.own;
  for(const p of this.players.values()){ const K=p.gk&&p.v187kd; if(!K||K.rel!=null) continue; if(this.own===p&&this.hands){ if(!this.fl&&!p.dive&&this.now>=K.t0){ const b=this.handsOf(p); this.ball.x=b.x; this.ball.y=b.y; this.ball.z=b.z; } } else K.rel=this.fl&&!this.fl.phys&&this.fl.t0>=K.t0?this.fl.t0:this.now; }
  return r; };

/* ---------- the lab: every new action, a poor and a good keeper ---------- */
LAB_SCENES.push(['keeper2','Keeper: claims, punches, kick and reflex saves, star, throw and roll']);
const V187K_LAB=['kick','react','star','claim','punch','punch1','throw','roll','starGoal'];
const _v187kLabRun=labRun;
labRun=function(scen){ const r=_v187kLabRun.apply(this,arguments); if(scen!=='keeper2') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    const P=[...st.players.values()]; const A=P.filter(p=>p.side===0); const fw=A[9]; let i=0; st._v187kLab=1;
    while(alive()){ if(window.__v187labIdle){ await st.wait(200); continue; } const L=window.__v187lab||V187K_LAB; const k=L[i%L.length]; const qs=window.__v187labQ||[0.3,0.85]; const q=qs[Math.floor(i/L.length)%qs.length]; i++;
      st.zoomTo(0.42); st.cam.w=st.cam.tw; st.focus={x:96}; st.cam.x=96; st._v186kq=q; st._v187kAct=k;
      if(typeof labLog==='function') labLog(`${k} · q ${q}`);
      const g=st.gkOf(1); if(g){ g.dive=null; g.v187st=null; g.v187kd=null; g.x=103.5; g.y=34; g.ov=null; }
      if(k==='claim'||k==='punch'||k==='punch1'){ st._v187kforce={ck:k==='claim'?'claim':'punch',fists:k==='punch1'?1:2}; st._v187kDist='throw'; await st.cornerKick(0,Math.random()<0.5?1:-1); st._v187kforce=null; st._v187kDist=null; }
      else if(k==='throw'||k==='roll'){ st._v187kDist=k; st._v186kforce={q,k:'stand',out:'catch'}; await st.gain(fw); if(!alive()) return; fw.x=84; fw.y=30+Math.random()*8; /* the lab keeps the box clear so the throw is seen, and puts a free full-back out wide (throw) or a centre-back on the edge of the box (roll) */
        for(const q of A) if(q!==fw&&q.x>78){ q.x=74+Math.random()*4; q.ov=null; } const Bk=P.filter(p=>p.side===1&&!p.gk); const rc=Bk[1]||Bk[0];
        for(const q of Bk) if(q!==rc&&q.x>86){ q.x=80+Math.random()*4; q.ov=null; } if(rc){ rc.x=k==='throw'?76:88.5; rc.y=k==='throw'?(Math.random()<0.5?11:57):34+(Math.random()<0.5?-7:7); rc.ov={x:rc.x,y:rc.y}; }
        await st.shotSeq({s:0,pid:fw.pid,t:'save',ty:'open',x:40,y:84}); st._v186kforce=null; st._v187kDist=null; if(rc) rc.ov=null; }
      else if(k==='starGoal'){ await st.gain(fw); if(!alive()) return; fw.x=88; fw.y=31+Math.random()*6; if(g){ g.x=99.5; g.y=34; } fw.hurry=true; st._v186kforce={q,beaten:Math.random()<0.5?'late':'short'};
        await st.finish({s:0,pid:fw.pid,t:'goal',ty:'break',m:10,sc:[1,0]},fw); st._v186kforce=null; if(!alive()) return; await st.wait(st.D(900)); if(g) g.dive=null; st.inNet=null; st.ball.ing=null; await st.wait(st.D(300)); }
      else { await st.gain(fw); if(!alive()) return; const close=k==='star'; fw.x=close?92:95.5; fw.y=31+Math.random()*6;
        const z=k==='kick'?0.05+Math.random()*0.2:k==='react'?1.0+Math.random()*0.7:(Math.random()<0.5?0.12:1.0);
        st._v186kforce={q,k,z}; st._v18forcePunt=true; await st.shotSeq({s:0,pid:fw.pid,t:'save',ty:close?'break':'open',x:40,y:close?90:94,xg:close?0.3:0.2}); st._v186kforce=null; st._v18forcePunt=null; }
      if(!alive()) return; await st.wait(st.D(600)); } }); };
