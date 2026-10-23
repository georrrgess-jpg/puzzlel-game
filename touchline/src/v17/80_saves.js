/* ===================== v18.6 C: goalkeeper save variety =====================
   Presentation only: results, events and emit moments are unchanged (the engine's save/goal/miss decides; this file only
   chooses how the keeper shows it).
   - Save kinds (p.dive.k): stand (W-catch, chest height), high (hands overhead), scoop (ground shot at him), lowdive, dive
     (full stretch: diving catch, parry or fingertip tip round the post), tipOver (over the bar), smother (at the feet of a
     forward close in); beaten kinds on goals and near misses: wrong (wrong-footed), late, short; watch (a miss going wide
     or over: he follows it with his eyes, no dive).
   - Choice from the shot (height band by e.ty, placement spread by the shooter's rating, distance, e.cor) and the keeper's
     rating q = clamp((G-35)/60,0,1), G = eff(p,'GK') + 1.7*tr.stop (the engine's own keeper strength). Better keepers set
     before the strike, move first, catch more; poor keepers are still moving at the strike, parry or spill more and are
     wrong-footed more often. The choice uses Math.random like the rest of the stage choreography.
   - Each kind is a set of keyframes in the body frame (as poseOf), timed to the shot's real flight (opt.onRelease): the
     contact keyframe is reached exactly when the ball arrives. handsOf returns the contact point of the same pose, solved
     the way the drawing solves it (2-D: arm IK + screen-plane roll; 3-D: 63's up2/bw roll about the forward axis), so the
     ball is in the gloves (or on the fingertips) at contact in both renderers. blendPose is bypassed once a kind is under
     way so the drawn gloves equal the contact point.
   - 3-D: the keeper faces the shooter (yawLock) and rolls about his forward axis, so dives go along the goal line.
     2-D: dives keep the three-quarter yaw and the screen-plane roll (toward the pitch); standing kinds face the shooter.
   - All state is in a new p.dive object per save (never mutated) plus primitives on the mover, so replays copy it.
   - Fixes: the outfield interception lunge (72) no longer fires for shots and claims homing into a keeper's hands; the dive
     is timed to the release instead of being started before the shooter has squared up.
   Switch: V186K.on. Lab scene 'saves' (forced kinds via st._v186force = {k, q, out}). */

const V186K={on:true, log:null};
const V186K_B={lean:.9,average:1,stocky:1.14};
/* keyframe vector: 0 hipU 1 lean 2 lift 3 rot 4 pivot 5 headTilt | 6-8 foot0 f,u,l | 9-11 foot1 | 12-14 hand0 | 15-17 hand1
   written for the ball on the keeper's LEFT (n=+1: near side = index 1, rot < 0 rolls him to his left); mirrored for n=-1 */
const V186K_SET=[.68,.16,0,0,0,.05, .02,0,-.24, .02,0,.24, .38,1.18,-.34, .38,1.18,.34];
const V186K_HOLD=[.8,.05,0,0,0,.1, .02,0,-.12, .02,0,.12, .3,1.16,-.12, .3,1.12,.12];
const V186K_STAND={stand:1,high:1,scoop:1,tipOver:1,watch:1};
const V186K_ACT={stand:'gkcatch',high:'gkcatch',scoop:'gkscoop',lowdive:'gklow',dive:'dive',tipOver:'gktip',smother:'gksmother',wrong:'dive',late:'dive',short:'dive',watch:'gkwatch'};

/* ---------- ratings (own helper: keeper and shooter, cached as primitives on the mover) ---------- */
function v186kQ(st,p){ if(!p) return 0.6; const F=st&&st._v186force; if(F&&F.q!=null) return F.q; if(st&&st._v186q!=null) return st._v186q; if(p.v186q!=null) return p.v186q;
  let q=0.6; try{ const C=typeof App!=='undefined'?App.C:null; const pl=C&&typeof findPerson==='function'?findPerson(C,p.pid):null;
    if(pl&&pl.sk){ const G=(typeof eff==='function'?eff(pl,'GK'):pl.sk.gk)+1.7*((pl.tr&&pl.tr.stop)||0); if(isFinite(G)) q=clamp((G-35)/60,0,1); } }catch(e){}
  p.v186q=q; return q; }
function v186kShQ(st,pid){ const F=st&&st._v186force; if(F&&F.sq!=null) return F.sq;
  try{ const C=typeof App!=='undefined'?App.C:null; const pl=C&&typeof findPerson==='function'?findPerson(C,pid):null; if(pl&&pl.sk&&isFinite(pl.sk.sho)) return clamp((pl.sk.sho-35)/60,0,1); }catch(e){} return 0.5; }

/* ---------- geometry: the drawn hand of a pose in the world (same solve as the painters) ---------- */
const v186kIs3D=st=>!!(st&&st._p3d&&!st._p3d.dead);
function v186kBR(st){ return v186kIs3D(st)? (typeof V18_BALL_R==='number'?V18_BALL_R:0.176) : BALL_R; }
function v186kW(p,P,f,u,l,is3,yaw){ const a=yaw!=null?yaw:(p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw), ca=Math.cos(a), sa=Math.sin(a), r=P.rot||0, cr=Math.cos(r), sr=Math.sin(r), lift=P.lift||0, pv=P.pivot||0;
  if(is3){ const S=0.92*(p.hgt||70)/70; const b=u-pv; const l2=l*cr-b*sr, u2=l*sr+b*cr+pv+lift; return {x:p.x+(f*ca-l2*sa)*S, y:p.y+(f*sa+l2*ca)*S, z:u2*S}; }
  const hs=1.06*(p.hgt||70)/70; const sx=f*ca-l*sa, dyb=f*sa+l*ca; const sx2=sx*cr+(u-pv)*sr, u2=-sx*sr+(u-pv)*cr+pv+lift; return {x:p.x+sx2*hs, y:p.y+dyb*hs, z:u2*hs}; }
function v186kHand(p,P,i,is3,yaw){ const B=V186K_B[(p.look&&p.look.build)]||1, sd=i?1:-1, hd=P.hands[i]; const lean=P.lean||0, cl=Math.cos(lean), sl=Math.sin(lean), hipU=P.hipU;
  let s0,t; if(is3){ const up2=(f,u,l)=>{ const du=u-0.8; return du<=0?[f,hipU+du,l]:[f*cl+du*sl,hipU+du*cl-f*sl,l]; }; s0=up2(0,1.5,sd*0.21*B); t=up2(hd.f,hd.u,hd.l); t[1]=Math.max(0.06,t[1]); }
  else { const up=(f,u,l)=>{ if(u<=hipU) return [f,u,l]; const du=u-hipU; return [f*cl+du*sl,hipU+du*cl-f*sl,l]; }; s0=up(0,1.5,sd*0.21*B); t=up(hd.f,hd.u,hd.l); }
  const dx=t[0]-s0[0], dy=t[1]-s0[1], dz=t[2]-s0[2], d=Math.hypot(dx,dy,dz), mx=0.59*0.999; if(d>mx){ const k=mx/d; t=[s0[0]+dx*k,s0[1]+dy*k,s0[2]+dz*k]; }
  return v186kW(p,P,t[0],t[1],t[2],is3,yaw); }
/* the ball's centre at contact: between the gloves, or just beyond the fingertips of one hand (D.lim 0/1, 2 = both) */
function v186kCentre(st,p,P,lim,is3,yaw){ const R=is3?(typeof V18_BALL_R==='number'?V18_BALL_R:0.176):BALL_R;
  if(lim===2){ const a=v186kHand(p,P,0,is3,yaw), b=v186kHand(p,P,1,is3,yaw); return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2}; }
  const h=v186kHand(p,P,lim,is3,yaw), c=v186kW(p,P,0,1.15,0,is3,yaw); const ex=h.x-c.x, ey=h.y-c.y, ez=h.z-c.z, el=Math.hypot(ex,ey,ez)||1; const k=R*0.8/el;
  return {x:h.x+ex*k,y:h.y+ey*k,z:h.z+ez*k}; }

/* ---------- keyframes ---------- */
function v186kMirror(v){ const o=v.slice(); o[3]=-v[3]; for(const [a,b] of [[6,9],[12,15]]){ o[a]=v[b]; o[a+1]=v[b+1]; o[a+2]=-v[b+2]; o[b]=v[a]; o[b+1]=v[a+1]; o[b+2]=-v[a+2]; } return o; }
/* keys for a kind: [[phase, vector], ...]; s = the solved parameter (rot for dives, hand height for standing catches, lift for tipOver) */
function v186kKeys(D){ const k=D.k, s=D.s, out=D.out; const caught=out==='catch'; const SET=V186K_SET;
  switch(k){
    case 'stand': { const uB=s, lo=uB<0.95; return {uc:.45,keys:[[0,SET],
      [.25,[.7,.15,0,0,0,.12, .1,0,-.2, .02,0,.22, .38,(1.18+uB)/2,-.2, .38,(1.18+uB)/2,.2]],
      [.45,[.74,lo?.3:.1,0,0,0,lo?.32:.12, .1,0,-.18, 0,0,.2, .42,uB,-.07, .42,uB,.07]],
      [.72,caught?[.74,.22,0,0,0,.22, .08,0,-.16, .02,0,.18, .24,1.22,-.08, .24,1.22,.08]:[.7,.1,0,0,0,.2, .06,0,-.2, .02,0,.2, .45,1.0,-.2, .45,1.05,.2]],
      [1,caught?V186K_HOLD:SET]]}; }
    case 'high': { const uB=s; return {uc:.45,keys:[[0,SET],
      [.22,[.64,.12,0,0,0,0, .04,0,-.2, .04,0,.2, .34,1.5,-.2, .34,1.5,.2]],
      [.45,[.8,-.06,.14,0,0,-.32, .02,.12,-.14, .04,.1,.14, .26,uB,-.08, .26,uB,.08]],
      [.72,caught?[.78,.12,0,0,0,.1, .04,0,-.14, .04,0,.14, .24,1.3,-.08, .24,1.3,.08]:[.74,0,0,0,0,0, .04,0,-.16, .04,0,.16, .4,1.4,-.25, .4,1.45,.25]],
      [1,caught?V186K_HOLD:SET]]}; }
    case 'scoop': return {uc:.5,keys:[[0,SET],
      [.3,[.62,.55,0,0,0,.3, 0,0,-.2, .08,0,.2, .5,.6,-.1, .5,.6,.1]],
      [.5,[.55,1.15,0,0,0,.5, -.24,0,-.08, .16,0,.2, .64,.18,-.07, .64,.18,.07]],
      [.76,caught?[.66,.45,0,0,0,.25, -.05,0,-.14, .08,0,.16, .28,1.12,-.08, .28,1.12,.08]:[.6,.7,0,0,0,.4, -.1,0,-.14, .1,0,.18, .55,.6,-.2, .55,.6,.2]],
      [1,caught?V186K_HOLD:SET]]};
    case 'lowdive': { const R=s; return {uc:.55,keys:[[0,SET],
      [.25,[.62,.22,0,-.18,.3,.1, .02,0,-.22, .05,0,.48, .32,.95,-.14, .36,.95,.42]],
      [.55,[.8,0,.08,-R,.3,0, -.03,.04,-.07, .05,.02,.08, .26,1.97,.03, .3,2.06,.15]],
      [.78,caught?[.8,0,0,-1.55,.3,.12, 0,0,-.07, .02,.04,.07, .3,1.42,-.02, .32,1.46,.1]:[.8,0,0,-1.55,.3,.05, 0,0,-.07, .02,.04,.07, .32,2.0,-.1, .36,2.05,.2]],
      [1,caught?[.8,0,0,-1.55,.3,.15, .04,.06,-.07, .06,.1,.07, .32,1.4,-.02, .34,1.43,.1]:[.8,0,0,-1.55,.3,.05, 0,0,-.07, .02,.04,.07, .3,1.85,-.15, .34,1.9,.25]]]}; }
    case 'dive': { const R=s; const tip=out==='corner', par=out==='parry';
      const H=tip?[.3,1.32,.26, .06,2.12,.02]:par?[.25,2.04,-.02, .27,2.08,.16]:[.08,2.06,0, .1,2.1,.13];
      return {uc:.6,keys:[[0,SET],
      [.22,[.6,.2,0,-.12,.55,.05, 0,0,-.2, .05,0,.44, .35,1.1,-.3, .36,1.15,.34]],
      [.42,[.74,.08,.3,-R*0.55,.55,0, -.06,.02,-.16, .14,.24,.2, .2,1.8,-.12, .2,1.86,.2]],
      [.6,tip?[.8,0,.44,-R,.55,-.12, -.08,.04,-.1, .2,.32,.14, H[3],H[4],H[5], H[0],H[1],H[2]]:[.8,0,.44,-R,.55,-.12, -.08,.04,-.1, .2,.32,.14, H[0],H[1],H[2], H[3],H[4],H[5]]],
      [.8,caught?[.8,0,.06,-1.45,.55,.1, 0,0,-.07, .04,.06,.07, .22,1.5,-.04, .24,1.55,.1]:[.8,0,.06,-1.45,.55,0, 0,0,-.07, .04,.06,.07, .2,1.95,-.12, .22,2.0,.18]],
      [1,caught?[.8,0,0,-1.5,.55,.15, .04,.08,-.07, .08,.14,.07, .26,1.42,-.03, .28,1.45,.09]:[.8,0,0,-1.5,.55,.05, 0,0,-.07, .04,.04,.07, .25,1.75,-.2, .28,1.8,.26]]]}; }
    case 'tipOver': { const L=s; return {uc:.55,keys:[[0,SET],
      [.3,[.64,.08,0,0,0,-.1, -.16,0,-.2, .02,0,.2, .3,1.35,-.3, .3,1.45,.3]],
      [.55,[.82,-.32,L,-.3,0,-.42, -.26,.16,-.12, 0,.32,.14, .22,1.5,-.55, -.04,2.1,.24]],
      [.8,[.74,-.12,0,-.05,0,-.12, -.32,0,-.14, 0,.1,.14, .14,1.4,-.42, .1,1.65,.3]],
      [1,[.78,.05,0,0,0,0, -.05,0,-.14, .02,0,.14, .1,1.0,-.27, .1,1.0,.27]]]}; }
    case 'smother': { const R=s; return {uc:.6,keys:[[0,SET],
      [.35,[.56,.42,0,0,0,.32, .04,0,-.3, .04,0,.3, .45,.55,-.42, .45,.55,.42]],
      [.6,[.62,.12,0,-R,.2,.3, .02,.06,-.12, .1,.1,.14, .52,1.05,-.08, .52,1.08,.1]],
      [.82,caught?[.6,.3,0,-1.4,.2,.42, .26,.3,-.06, .3,.36,.06, .36,1.15,-.06, .36,1.12,.06]:[.62,.15,0,-1.4,.2,.3, .05,.1,-.1, .12,.12,.12, .5,1.2,-.25, .52,1.25,.25]],
      [1,caught?[.6,.3,0,-1.4,.2,.42, .28,.32,-.06, .32,.38,.06, .36,1.15,-.06, .36,1.12,.06]:[.62,.15,0,-1.4,.2,.3, .05,.1,-.1, .12,.12,.12, .45,1.1,-.25, .47,1.15,.25]]]}; }
    case 'watch': return {uc:.4,keys:[[0,SET],
      [.4,[.74,.06,0,0,0,-.1, .02,0,-.2, .06,0,.3, .28,1.1,-.3, .3,1.12,.3]],
      [1,[.8,.02,0,0,0,-.05, .02,0,-.14, .04,0,.16, .1,1.0,-.27, .1,1.0,.27]]]};
    default: /* wrong / late / short: a dive (or a low dive) that does not reach */ { const R=s; return D.low?
      {uc:.55,keys:[[0,SET],[.25,[.62,.22,0,-.18,.3,.1, .02,0,-.22, .05,0,.48, .32,.95,-.14, .36,.95,.42]],[.55,[.8,0,.08,-R,.3,0, -.03,.04,-.07, .05,.02,.08, .26,1.97,.03, .3,2.06,.15]],[1,[.8,0,0,-1.55,.3,0, 0,0,-.07, .02,.04,.07, .3,1.9,-.1, .34,1.95,.2]]]} :
      {uc:.6,keys:[[0,SET],[.22,[.6,.2,0,-.12,.55,.05, 0,0,-.2, .05,0,.44, .35,1.1,-.3, .36,1.15,.34]],[.42,[.74,.08,.3,-R*0.55,.55,0, -.06,.02,-.16, .14,.24,.2, .2,1.8,-.12, .2,1.86,.2]],
       [.6,[.8,0,.44,-R,.55,-.12, -.08,.04,-.1, .2,.32,.14, .08,2.06,0, .1,2.1,.13]],[1,[.8,0,0,-1.5,.55,0, 0,0,-.07, .04,.04,.07, .2,1.95,-.12, .22,2.0,.18]]]}; } } }
function v186kVec(KS,ph){ const K=KS.keys; if(ph<=K[0][0]) return K[0][1]; for(let i=1;i<K.length;i++){ if(ph<=K[i][0]){ const a=K[i-1], b=K[i]; const w=smooth((ph-a[0])/Math.max(1e-6,b[0]-a[0])); return a[1].map((x,j)=>x+(b[1][j]-x)*w); } } return K[K.length-1][1]; }
function v186kP(v,n,act){ const V=n<0?v186kMirror(v):v; return {rot:V[3],pivot:V[4],lift:V[2],hipU:V[0],lean:V[1],feet:[{f:V[6],u:V[7],l:V[8]},{f:V[9],u:V[10],l:V[11]}],hands:[{f:V[12],u:V[13],l:V[14]},{f:V[15],u:V[16],l:V[17]}],headTilt:V[5],headTurn:0,prop:null,mouth:false,act}; }
/* pose phase of a dive object at a stage time: 0..uc before the pose's contact moment, uc..1 after it */
function v186kPh(D,KS,now){ if(now<=D.t) return 0; if(now<D.tP0) return KS.uc*clamp((now-D.t)/Math.max(1,D.tP0-D.t),0,1); return KS.uc+(1-KS.uc)*clamp((now-D.tP0)/Math.max(1,D.post),0,1); }
Stage.prototype.v186kPose=function(p,D,now){ const KS=v186kKeys(D); const ph=v186kPh(D,KS,now==null?this.now:now); const P=v186kP(v186kVec(KS,ph),D.n,V186K_ACT[D.k]||'dive'); P.v186=D.t; P.v186ph=ph;
  if(D.k==='watch'){ const b=this.ball, a=Math.atan2(b.y-p.y,b.x-p.x), y=p.yaw==null?0:p.yaw; P.headTurn=clamp(-Math.atan2(Math.sin(a-y),Math.cos(a-y)),-1.1,1.1)*0.8; P.headTilt=clamp(-(b.z||0)*0.12,-0.45,0.1); }
  /* a poor keeper dives less tidily: legs apart and a knee up in flight, and after contact the free arm flaps (the contact limbs never move) */
  if(!D.stand&&D.q<0.55){ const m=(0.55-D.q)/0.55*Math.sin(Math.PI*clamp(ph,0,1)); const F=P.feet, sd=D.n>0?1:-1;
    F[0]={f:F[0].f-0.12*m,u:F[0].u+0.1*m,l:F[0].l-0.16*m}; F[1]={f:F[1].f+0.16*m,u:F[1].u+0.22*m,l:F[1].l+0.12*m};
    if(ph>KS.uc+0.05&&D.lim!==2){ const fr=D.lim?0:1, w=m*smooth(clamp((ph-KS.uc)/0.2,0,1)); const H=P.hands[fr]; P.hands[fr]={f:H.f+0.25*w,u:H.u-0.35*w,l:H.l+(fr?1:-1)*0.3*w}; } }
  return P; };
/* the contact pose with parameter s, for planning */
function v186kAt(D,s){ const E={...D,s}; const KS=v186kKeys(E); return v186kP(v186kVec(KS,KS.uc),D.n,'plan'); }

/* ---------- planning ---------- */
const V186K_BANDS={open:[.4,.35,.25],solo:[.4,.35,.25],cross:[.4,.35,.25],long:[.2,.4,.4],fk:[.2,.4,.4],header:[.25,.55,.2],corner:[.25,.55,.2],tapin:[.65,.3,.05],break:[.65,.3,.05]};
function v186kN(){ let u=0; for(let i=0;i<4;i++) u+=Math.random(); return (u-2)/0.577; }
/* where the keeper sets for a shot from (sx,sy): on the line from the middle of his goal to the ball, ~1-1.6 m off the line */
function v186kSetSpot(gk,sx,sy,q){ const gl=gk.side===0?0:105, pd=gk.side===0?1:-1; const off=1.0+0.6*q; const y=clamp(34+(sy-34)*0.3,29.5,38.5); return {x:gl+pd*off,y}; }
/* solve the kind's parameter so the contact point is at height zc; returns {s, d (contact offset from the body), z} */
function v186kSolve(D,pseudo,is3,yaw,lo,hi,zc){ const z=s=>v186kCentre(null,pseudo,v186kAt(D,s),D.lim,is3,yaw).z; let a=lo,b=hi; const za=z(a), zb=z(b); const inc=zb>za;
  if(inc?zc<=za:zc>=za){ a=b=lo; } else if(inc?zc>=zb:zc<=zb){ a=b=hi; } else { for(let i=0;i<22;i++){ const m=(a+b)/2, zm=z(m); if((zm<zc)===inc) a=m; else b=m; } }
  const s=(a+b)/2; const c=v186kCentre(null,pseudo,v186kAt(D,s),D.lim,is3,yaw); return {s,d:{x:c.x-pseudo.x,y:c.y-pseudo.y},z:c.z}; }
/* choose the save kind and outcome for an engine save event */
Stage.prototype.v186kPlan=function(e,gk,sh,sx,sy){ const F=this._v186force||{}; const q=v186kQ(this,gk), sq=v186kShQ(this,e.pid);
  const gl=gk.side===0?0:105, pd=gk.side===0?1:-1; const set=v186kSetSpot(gk,sx,sy,q); const dist=Math.hypot(sx-gl,sy-34);
  const cor=!!e.cor; const W=V186K_BANDS[e.ty]||V186K_BANDS.open; const r=Math.random(); let band=r<W[0]?0:r<W[0]+W[1]?1:2;
  let ty=34+clamp(v186kN()*lerp(1.0,2.6,sq),-3.3,3.3); let z=band===0?0.03+Math.random()*0.25:band===1?0.55+Math.random()*0.95:1.65+Math.random()*0.5;
  let k, out;
  if(cor){ if(band===2||Math.random()<0.35){ k='tipOver'; z=1.9+Math.random()*0.25; ty=34+clamp(v186kN()*1.4,-2.4,2.4); } else { ty=34+(Math.random()<0.5?-1:1)*(2.6+Math.random()*0.7); k=band===0?'lowdive':'dive'; } out='corner'; }
  else { const close=dist<13.5&&(e.ty==='break'||e.ty==='solo'||e.ty==='tapin'||(e.xg||0)>=0.25);
    if(close&&band<2&&Math.random()<0.75){ k='smother'; band=0; z=0.02+Math.random()*0.12; }
    else { const dy=Math.abs(ty-set.y);
      if(band===0) k=dy<0.8?'scoop':'lowdive';
      else if(band===2&&dy<0.7) k='high';
      else if(dy<0.6||(dy<1.6&&Math.random()<q*(1.6-dy)/1.0)) k=band===2?'high':'stand';
      else k='dive'; }
    const reach=Math.abs(ty-set.y); const pc={stand:.55+.43*q,high:.5+.45*q,scoop:.55+.42*q,lowdive:.22+.6*q,dive:reach>2.2?.1+.6*q:.25+.6*q,smother:.38+.55*q}[k];
    out=Math.random()<(reach>lerp(2.3,3.2,q)&&(k==='dive'||k==='lowdive')?pc*0.25:pc)?'catch':'parry'; }
  if(F.k){ k=F.k; if(F.out) out=F.out; if(F.ty!=null) ty=F.ty; if(F.z!=null) z=F.z; else if(k==='scoop'||k==='lowdive'||k==='smother') z=0.06; else if(k==='high') z=1.85; else if(k==='tipOver') z=2.0; else if(k==='stand') z=0.9; else if(k==='dive') z=0.95+Math.random()*0.6;
    if(k==='stand'||k==='high'||k==='scoop') ty=set.y+(Math.random()-0.5)*0.6; else if((k==='dive'||k==='lowdive')&&Math.abs(ty-set.y)<1.6) ty=set.y+(Math.random()<0.5?-1:1)*(1.8+Math.random()*1.2); }
  ty=clamp(ty,GF.y0+0.35,GF.y1-0.35); z=Math.min(z,2.2);
  return {k,out,ty,z,q,sq,set,band,dist,cor}; };

/* place a kind: solve its parameter for the contact height and put the body where the contact meets the target point.
   T = ball centre target {y,z} (x from the body anchor), returns the new dive object */
Stage.prototype.v186kMake=function(gk,sh,k,o){ const is3=v186kIs3D(this), q=o.q; const gl=gk.side===0?0:105, pd=gk.side===0?1:-1; const R=v186kBR(this);
  const stand=!!V186K_STAND[k]; const smo=k==='smother';
  /* body anchor x (off his line) */
  const offX=o.bx!=null? Math.max(0.5,Math.abs(o.bx-gl)) : smo? lerp(3,6,q) : k==='tipOver'? 0.9 : stand? (o.set?Math.abs(o.set.x-gl):1.2) : 0.7;
  let bx=gl+pd*offX, by=o.set?o.set.y:gk.y; if(smo&&sh){ const ux=sh.x-gl, uy=sh.y-34, ul=Math.hypot(ux,uy)||1; bx=gl+ux/ul*offX; by=34+uy/ul*offX; }
  /* facing at contact: 3-D (and standing kinds in 2-D) look at the shooter; 2-D dives keep the three-quarter yaw */
  const lookYaw=sh?Math.atan2(sh.y-by,sh.x-bx):(pd>0?0:Math.PI); const yaw=(is3||stand)?lookYaw:(gk.side===0?1.15:Math.PI-1.15);
  /* which side he goes to (n=+1: his left) */
  let n; if(!is3&&!stand) n=-pd; else n=(o.ty-by)*Math.cos(yaw)>=0?1:-1; /* lateral axis (+l) is (-sin yaw, cos yaw) */
  if(o.flip) n=-n; if(smo) n=Math.random()<0.5?1:-1;
  const low=o.z<0.5, kk=k;
  const lim=k==='dive'&&o.out==='corner'?(n>0?0:1) : k==='tipOver'?(n>0?1:0) : 2;
  const D0={k:kk,n,out:o.out||'none',lim,low:!!(o.low!=null?o.low:low),q,s:0};
  const pseudo={x:0,y:0,yaw,hgt:gk.hgt,look:gk.look};
  const zc=o.z+R; /* ball centre height */
  let rng; if(k==='stand') rng=[0.55,1.75]; else if(k==='high') rng=[1.6,2.25]; else if(k==='scoop') rng=[0,0]; else if(k==='tipOver') rng=[0,0.55]; else if(k==='watch') rng=[0,0]; else if(k==='smother') rng=[1.15,1.55]; else if(D0.low||k==='lowdive') rng=[1.2,1.62]; else rng=[0.3,1.55];
  const sol=v186kSolve(D0,pseudo,is3,yaw,rng[0],rng[1],zc); D0.s=sol.s;
  /* body at contact: the contact point lands on the target lateral position (short dives stop short of it) */
  let x1=bx, y1=smo?by:o.ty-sol.d.y;
  if(k==='watch'){ x1=gk.x; y1=gk.y+clamp(o.ty-gk.y,-0.5,0.5); }
  /* the gloves always meet the ball in front of the line */
  const cin=pd*(x1+sol.d.x-gl); if(cin<0.4) x1+=pd*(0.4-cin);
  x1=pd>0?Math.max(x1,gl+0.25):Math.min(x1,gl-0.25); y1=clamp(y1,GF.y0-2.5,GF.y1+2.5);
  return {D:D0,x1,y1,yaw:lookYaw,stand,c:{x:x1+sol.d.x,y:y1+sol.d.y,z:sol.z}}; };

/* the lead time of a kind (ms at 1x) and its follow-through */
const V186K_A={stand:260,high:280,scoop:300,lowdive:330,dive:300,tipOver:320,smother:380,wrong:300,late:300,short:300,watch:240};
const V186K_POST={stand:420,high:420,scoop:480,lowdive:520,dive:560,tipOver:520,smother:620,wrong:600,late:600,short:600,watch:700};
/* arm the dive at the real release: tC = when the ball arrives; the kind's pose reaches its contact keyframe at tC */
Stage.prototype.v186kArm=function(gk,sh,M,f,o){ const now=this.now, q=M.D.q; const tA=f.t0+f.dur; const react=Math.max(30,this.D(lerp(170,70,q))); const tR=now+react;
  const Ld=this.D((V186K_A[M.D.k]||300)*(0.85+0.35*q)); let t0=Math.max(tR,tA-Ld); let tC=tA;
  if(M.D.k==='late'){ t0=Math.max(tR,tA-0.4*Ld); tC=t0+Ld; }
  if(tC-t0<45) t0=tC-45;
  const post=Math.max(90,this.D(V186K_POST[M.D.k]||500));
  const fin=M.stand?0:(M.D.n>0?-1:1); /* sign of the final roll */
  const D={...M.D, t:t0, tR, tP0:tC, tA, post, dir:(fin||1)*(gk.x>52.5?1:-1), x0:gk.x, y0:gk.y, x1:M.x1, y1:M.y1, stand:M.stand, cx:M.c.x, cy:M.c.y, cz:M.c.z, catch:M.D.out==='catch', rel:now};
  gk.dive=D; gk.ov={x:gk.x,y:gk.y}; gk.v186L=0;
  /* 3-D and standing kinds face the shooter through the save and the get-up; 2-D dives use the three-quarter yaw */
  if(v186kIs3D(this)||M.stand){ gk.yawLock=M.yaw; gk.yawLockT=tC+post+(M.stand?this.D(250):Math.max(260,this.D(700))); } /* through the get-up, then free (a parry is chased facing the ball) */ else if(gk.yawLockT>now) gk.yawLockT=now;
  if(o&&o.aim&&f.home===gk) f.aim={x:M.c.x,y:M.c.y};
  if(V186K.log) V186K.log.push({pid:gk.pid,act0:gk._act,spd:+((gk.spd||0)/Math.max(1,this.spdMul||1)).toFixed(2),k:D.k,out:D.out,q,n:D.n,t:D.t,tR,tC,tA,rel:now,dur:f.dur,ts:this.ts,set:!!gk.v186set,c:M.c,is3:v186kIs3D(this),late:t0===tR&&tR>tA-Ld});
  return D; };

/* ---------- the save branch (replaces ui_stage.js shotSeq's save branch :396-414 for non-penalty saves) ---------- */
Stage.prototype.v186kSave=async function(e){
  const p=this.pl(e.pid); if(!p){ this.emit(e); return; }
  const s=e.s, dir=s===0?1:-1, gx=s===0?105:0;
  /* the approach mirrors ui_stage.js shotSeq :387-395; keep the two in step */
  await this.gain(p); if(this.own!==p) await this.gain(p);
  let [sx,sy]= e.x!=null? livePos(s,e.x,Math.max(e.y,70)) : [gx-dir*16,34];
  const gk=this.gkOf(1-s); const q0=v186kQ(this,gk); if(q0>=0.5){ gk.ov=v186kSetSpot(gk,clamp(sx,gx-dir*29.5,gx+dir*29.5),sy,q0); gk.v186set=1; } /* a good keeper reads where it will come from and takes his angle early */
  p.ov={x:sx,y:sy}; await this.until(()=>this.own!==p||Math.hypot(p.x-sx,p.y-sy)<1.2, this.eta(p,sx,sy)+400);
  if(this.own!==p) await this.gain(p);
  if(Math.abs(p.x-gx)>29.5){ sx=gx-dir*27; p.ov={x:sx,y:p.y}; await this.until(()=>Math.abs(p.x-gx)<=29.5, this.eta(p,sx,p.y)+400); }
  this.stageSpace(e,p); const plan=this.v186kPlan(e,gk,p,p.x,p.y); const q=plan.q;
  /* a good keeper is set on his angle before the strike; a poor one is still drifting across when it is struck */
  gk.v186set=0; const SS=plan.k==='smother'? (()=>{ const gl=gk.side===0?0:105, ux=p.x-gl, uy=p.y-34, ul=Math.hypot(ux,uy)||1, off=lerp(3,6,q); return {x:gl+ux/ul*off,y:34+uy/ul*off}; })() : plan.set;
  if(plan.k==='smother'){ gk.ov={...SS}; gk.hurry=true; }
  else if(q>=0.5){ gk.ov={...SS}; gk.v186set=1; }
  else { gk.ov={x:SS.x,y:clamp(SS.y+(SS.y>=34?-1:1)*(1-q)*2.2,29,39)}; }
  await this.wait(this.D(220));
  if(!gk.v186set&&plan.k!=='smother') gk.ov={...SS};
  const self=this; let M=null; const ty=plan.ty;
  const h=plan.band===0?0.12:plan.band===1?0.4:0.55; const zT=plan.z;
  const arm=f=>{ gk.hurry=false; M=self.v186kMake(gk,p,plan.k,{q,ty,z:zT,out:plan.out,set:{x:gk.x,y:gk.y}}); self.v186kArm(gk,p,M,f,{aim:true}); };
  const dur=this.D(340)+120;
  await this.launch(p,{home:gk,hands:true,dur,h,hFn:()=>this.shotH(s,{x:gk.x,y:ty,z:zT},h),kind:'shot',onRelease:arm});
  const D=gk.dive; const out=plan.out; const corner=out==='corner'; const k=plan.k;
  if(corner){ this.emit(e); e._done=1; }
  if(out!=='catch'){ if(this.own===gk){ this.own=null; this.hands=false; }
    const sg=Math.sign(ty-34)||1;
    if(corner&&k==='tipOver'){ /* fingertips over the bar: up and over (the whole ball clears the crossbar), onto the roof of the net or behind it */ await this.launch(null,{to:{x:gx+dir*1.6,y:clamp(this.ball.y+(Math.random()-0.5)*1.2,30,38),z:3.4},dur:this.D(260)+60,h:0.5,kind:'clear',cont:true}); }
    else if(corner){ /* round the post and behind: a corner. The deflection crosses the line at least 0.6 m outside the post */ const b=this.ball, tx=gx+dir*1.3, fr=clamp((gx-b.x)/((tx-b.x)||1e-3),0.05,1); let yt=34+sg*(7+Math.random()*2.5); const need=b.y+(34+sg*4.3-b.y)/fr; if(sg>0?yt<need:yt>need) yt=need; yt=clamp(yt,34-16,34+16);
      await this.launch(null,{to:{x:tx,y:yt,z:0.2},dur:this.D(420)+80,h:k==='lowdive'?0.3:1.1,kind:'clear'}); this.ownLock={x:this.ball.x,y:this.ball.y}; }
    else if(k==='stand'||k==='high'||k==='scoop'){ /* spilled: it comes off his chest or gloves and drops in front of him */ this.startFree({x:-dir*(2+Math.random()*2),y:(Math.random()-0.5)*4,z:k==='scoop'?0.5:1.6},{max:1800}); }
    else if(k==='smother'){ /* squirms loose a couple of metres */ this.startFree({x:-dir*(3+Math.random()*3),y:(Math.random()<0.5?-1:1)*(3+Math.random()*4),z:0.4},{max:1800}); }
    else { /* palmed away from goal, wide of the post */ this.startFree({x:-dir*(4+Math.random()*5),y:sg*(12+Math.random()*6),z:(k==='lowdive'?1:4)+Math.random()*3},{max:1800}); } }
  if(!e._done) this.emit(e);
  const fs=D&&D.k===k&&(k==='dive'||k==='lowdive')&&Math.abs(ty-plan.set.y)>2.2;
  this.onCaption(k==='tipOver'?'TIPPED OVER THE BAR':corner?'TIPPED AROUND THE POST':k==='smother'&&out==='catch'?'SMOTHERED':out==='parry'?(fs&&q>=0.75?'WHAT A SAVE!':'PARRIED!'):fs&&q>=0.75?'WHAT A SAVE!':'SAVED','shot');
  this.hype=Math.max(this.hype,fs?0.6:0.4); this.clearStaged();
  await this.wait(this.D(380)+120);
  if(corner){ gk.dive=null; gk.ov=null; if(this.ts>=0.45&&!this.skip) await this.cornerKick(s,sg2(ty)); else { const m=this.nearest(1-s,gx-dir*8,34); if(m) await this.fetch(m,false); } }
  else if(out==='parry'){ gk.dive=null; const d=this.nearest(1-s,this.ball.x,this.ball.y); const fetcher=d&&dist2(d,this.ball)<dist2(gk,this.ball)?d:gk; await this.fetch(fetcher,fetcher===gk);
    if(this.own===fetcher&&fetcher!==gk){ await this.launch(fetcher,{to:{x:clamp(fetcher.x-dir*30,10,95),y:clamp(34+(Math.random()-.5)*30,6,62),z:0},dur:this.D(900),h:3,kind:'clear',cont:true}); } else if(this.own===gk){ gk.ov=null; await this.distribute(gk); } gk.ov=null; }
  else { gk.dive=null; gk.ov=null; await this.distribute(gk); }
  function sg2(y){ return Math.sign(y-34)||1; }
};

const _v186kShot=Stage.prototype.shotSeq;
Stage.prototype.shotSeq=function(e){
  if(V186K.on&&e&&e.t==='save'&&e.ty!=='pen'&&this.pl(e.pid)&&this.gkOf(1-e.s)) return this.v186kSave(e);
  if(V186K.on&&e&&e.t==='miss'&&e.ty!=='pen'){ this._v186ctx={k:'miss',e}; const r=_v186kShot.apply(this,arguments); const clr=()=>{ if(this._v186ctx&&this._v186ctx.e===e) this._v186ctx=null; }; Promise.resolve(r).then(clr,clr); return r; }
  return _v186kShot.apply(this,arguments); };

const _v186kFinish=Stage.prototype.finish;
Stage.prototype.finish=function(e,pl){ if(!V186K.on||!e||e.ty==='pen') return _v186kFinish.apply(this,arguments);
  this._v186ctx={k:'goal',e}; const r=_v186kFinish.apply(this,arguments); const clr=()=>{ if(this._v186ctx&&this._v186ctx.e===e) this._v186ctx=null; }; Promise.resolve(r).then(clr,clr); return r; };

/* goals and misses: the first shot launched under a context gets a beaten dive or a watch, armed at the real release */
const _v186kLaunch=Stage.prototype.launch;
Stage.prototype.launch=function(p,opt){ const C=this._v186ctx;
  if(V186K.on&&C&&p&&opt&&opt.kind==='shot'&&opt.to&&!opt.home&&this.setPiece!=='pen'){ this._v186ctx=null; const gk=this.gkOf(1-p.side);
    if(gk){ if(gk.dive&&!gk.dive.k) gk.dive=null; const self=this, o0=opt.onRelease; opt={...opt,onRelease(f){ if(o0) o0(f); try{ self.v186kBeaten(gk,p,C,opt.to,f); }catch(err){ if(V186K.log) V186K.log.push({err:String(err)}); } }}; } }
  return _v186kLaunch.call(this,p,opt); };
/* how a keeper is beaten: goals are wrong-footed (68 % for the poorest keeper, 32 % for the best), late or short; a miss going
   clearly wide or over is watched (a poor keeper sometimes makes a token late dive), a near miss gets a dive that falls short */
function v186kBeatKind(q,ck,to){ const wide=Math.abs(to.y-34)-3.66, over=(to.z||0)>2.5;
  if(ck==='miss') return over||wide>1.2? (q<0.3&&Math.random()<0.3?'late':'watch') : (Math.random()<lerp(.4,.1,q)?'late':'short');
  const r=Math.random(), w=lerp(.68,.32,q), l=lerp(.22,.05,q); return r<w?'wrong':r<w+l?'late':'short'; }
/* the keeper's torso axis in the world (pelvis, neck) for a pose, as drawn */
function v186kTorso(p,P,is3){ const lean=P.lean||0, cl=Math.cos(lean), sl=Math.sin(lean), hipU=P.hipU; const du=is3?0.77:1.57-hipU; const n=[du*sl,hipU+du*cl,0];
  return [v186kW(p,P,0,hipU,0,is3),v186kW(p,P,n[0],n[1],0,is3)]; }
Stage.prototype.v186kBeaten=function(gk,sh,C,to,f){ const q=v186kQ(this,gk), gl=gk.side===0?0:105; const F=this._v186force||{};
  let k=v186kBeatKind(q,C.k,to);
  if(F.beaten&&!(C.k==='goal'&&F.beaten==='watch')) k=F.beaten;
  const z=clamp(to.z||0,0,2.1); let ty=clamp(to.y,GF.y0-0.8,GF.y1+0.8); const set={x:gk.x,y:gk.y};
  const sgn=Math.sign(ty-set.y)||1;
  if(k==='wrong'){ ty=clamp(set.y-sgn*(1.0+Math.random()*1.4),GF.y0-0.6,GF.y1+0.6); }
  else if(k==='short'){ const sh0=0.35+Math.random()*0.25; const gap=Math.abs(ty-set.y); ty=gap>1.5? ty-sgn*(sh0+(1-q)*0.3) : set.y+sgn*Math.max(1.4,gap); }
  else if(k==='late'){ if(Math.abs(ty-set.y)<1.5) ty=set.y+sgn*1.6; }
  const M=this.v186kMake(gk,sh,k,{q,ty,z:k==='wrong'?clamp(z+(Math.random()-0.5)*0.5,0,1.9):z,out:'none',set,low:z<0.45,bx:gk.x});
  this.v186kArm(gk,sh,M,f,null); };

/* ---------- per-step: intercept fix, sounds, scripted body motion, ball held in the gloves ---------- */
const _v186kUpd=Stage.prototype.update;
Stage.prototype.update=function(dt){ const now=this.now; const f=this.fl;
  if(V186K.on&&f&&!f.phys&&f.hands&&f.home&&f.home.gk) f._v18ic=1; /* a shot or claim into a keeper's hands is not an interception */
  for(const p of this.players.values()){ const D=p.gk&&p.dive; if(!D||!D.k) continue; if(D.stand){ p.diveSnd=1; p._landT=1; }
    else if(p.v186L!==D.t){ if(now<D.tP0+Math.min(D.post*0.3,this.D(160))) p._landT=1; else { p._landT=0; p.v186L=D.t; } } }
  const r=_v186kUpd.apply(this,arguments);
  for(const p of this.players.values()){ const D=p.gk&&p.dive; if(!D||!D.k||!V186K.on) continue;
    if(now>=D.t&&now<=D.tP0+1){ const rem=D.tP0-now, H=dt*1000; const w=rem<=0?1:Math.min(1,H/(rem+H)); p.x+=(D.x1-p.x)*w; p.y+=(D.y1-p.y)*w; p.vx=0; p.vy=0; if(p.ov){ p.ov={x:p.x,y:p.y}; } }
    else if(now>D.tP0){ p.x=D.x1; p.y=D.y1; p.vx=0; p.vy=0; if(p.ov) p.ov={x:D.x1,y:D.y1}; }
    if(now>=D.t&&this.own===p&&this.hands&&!this.fl){ const b=this.handsOf(p); this.ball.x=b.x; this.ball.y=b.y; this.ball.z=b.z; } }
  return r; };

/* ---------- handsOf / poseOf / blendPose ---------- */
const _v186kHands=Stage.prototype.handsOf;
Stage.prototype.handsOf=function(p){ const D=p&&p.gk&&p.dive; if(!V186K.on||!D||!D.k||this.now<D.t) return _v186kHands.apply(this,arguments);
  const is3=v186kIs3D(this), P=this.v186kPose(p,D), R=v186kBR(this); const lim=D.k==='wrong'||D.k==='late'||D.k==='short'?2:D.lim;
  const c=v186kCentre(this,p,P,lim,is3); return {x:c.x,y:c.y,z:Math.max(0,c.z-R)}; };

const _v186kPoseOf=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v186kPoseOf.apply(this,arguments); if(isRef||!p||!p.gk||!V186K.on) return P; const D=p.dive; if(!D||!D.k||this.now<D.t) return P;
  if(D.stand) p._dv=null; /* standing kinds never trigger the roll-to-knee get-up */
  return this.v186kPose(p,D); };

const _v186kBlend=Stage.prototype.blendPose;
Stage.prototype.blendPose=function(p,P){ const Q=_v186kBlend.apply(this,arguments); if(!P||P.v186==null||!p.dive) return Q;
  const D=p.dive; const lead=Math.min(this.D(60),Math.max(1,(D.tP0-D.t)*0.4)); if(this.now-P.v186<lead) return Q; p._pose=P; return P; };

/* ---------- the lab: every kind, three keeper ratings ---------- */
LAB_SCENES.push(['saves','Keeper: save variety']);
const V186K_LAB=[['stand','catch'],['high','catch'],['scoop','catch'],['lowdive','catch'],['dive','catch'],['dive','parry'],['dive','corner'],['tipOver','corner'],['smother','catch'],['lowdive','parry'],['stand','parry'],['goal','wrong'],['goal','short'],['goal','late'],['miss','watch']];
const _v186kLabRun=labRun;
labRun=function(scen){ const r=_v186kLabRun.apply(this,arguments); if(scen!=='saves') return r;
  return Promise.resolve(r).then(async()=>{ const st=App.labSt; if(!st||!st.alive) return; const alive=()=>st.alive&&App.labSt===st;
    const P=[...st.players.values()]; const A=P.filter(p=>p.side===0); const fw=A[9]; let i=0; st._v18forcePunt=false;
    while(alive()){ if(window.__v186labIdle){ await st.wait(200); continue; } const L=window.__v186lab||V186K_LAB; const [k,o]=L[i%L.length]; const qs=window.__v186labQ||[0.15,0.6,0.92]; const q=qs[Math.floor(i/L.length)%qs.length]; i++;
      st.zoomTo(0.42); st.cam.w=st.cam.tw; st.focus={x:96}; st.cam.x=96; await st.gain(fw); if(!alive()) return;
      const close=k==='smother'; fw.x=close?95:84; fw.y=28+Math.random()*12;
      if(typeof labLog==='function') labLog(`${k} · ${o} · q ${q}`);
      if(k==='goal'){ st._v186force={q,beaten:o}; await st.finish({s:0,pid:fw.pid,t:'goal',ty:'open',m:10,sc:[1,0]},fw); if(!alive()) return; st._v186force=null; await st.wait(st.D(900)); const g=st.gkOf(1); if(g){ g.dive=null; } st.inNet=null; st.ball.ing=null; await st.wait(st.D(300)); }
      else if(k==='miss'){ st._v186force={q,beaten:o}; await st.shotSeq({s:0,pid:fw.pid,t:'miss',ty:'open',x:40,y:84}); st._v186force=null; }
      else { st._v186force={q,k,out:o}; await st.shotSeq({s:0,pid:fw.pid,t:'save',ty:close?'break':'open',x:40,y:close?90:84,cor:o==='corner'?1:0,xg:close?0.3:0.1}); st._v186force=null; }
      if(!alive()) return; await st.wait(st.D(500)); } }); };
