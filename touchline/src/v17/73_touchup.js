/* ===================== v18.3 touch-ups (73) =====================
   Presentation only: nothing here touches engine.js, results, events or their order.
   1. punt boot: the keeper's kicking boot used the generic "toe dips as the foot lifts" tilt, so at the top of the
      follow-through (foot at chest height) the toe pointed down at the grass. A pose may now carry P.bootT=[left,right]
      (toe pitch in radians, + = toe down, null = the generic tilt); the 2-D boot (ui_stage.js drawFigure) and the 3-D
      boot (63_p3d_figures.js) both read it. During the punt the kicking boot goes: flat on the steps, toe down and back
      as the heel comes up to the seat, toe pointed (laces through the ball) at contact, then toe up-forward along the
      line of the kick at the top of the follow-through, flattening again as the foot comes down. The keeper's yaw is
      already locked toward the punt target by 70_punt.js (v18pStep), so the boot points the way he kicks. */
const V18T={punt:true};

/* toe pitch for the kicking (right) boot at punt pose time t; null = leave the generic tilt */
Stage.prototype.v18tPuntPitch=function(K,t){ const W=K.W, Fd=K.Fd;
  if(t<=W){ const u=t/W; if(u<0.52) return null;
    if(u<0.86) return 0.95*smooth((u-0.52)/0.34);
    return lerp(0.95,0.75,smooth((u-0.86)/0.14)); }
  const q=(t-W)/Fd; if(q>=1) return null;
  if(q<0.3) return lerp(0.75,-0.7,smooth(q/0.3));
  if(q<0.75) return lerp(-0.7,0,smooth((q-0.3)/0.45));
  return 0; };

const _v18tuPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v18tuPose.apply(this,arguments);
  if(!V18T.punt||isRef||!P||P.act!=='punt') return P; const K=this._v18pk; if(!K||K.p!==p) return P;
  const r=this.v18tPuntPitch(K,this.v18pkt(K)); if(r!=null) P.bootT=[null,r]; return P; };
