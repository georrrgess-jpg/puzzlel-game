/* v18.7 integration (loaded after 83 motion, 84 shots, 85 keeper).
   84's technique strikes and volleys set their own arm targets after 83 has bent the kick's balance arm, which brought the
   straight-out T-pose back on most shots. The balance arm is corrected again here, last in the poseOf chain, with 83's own
   idempotent v187mKickArm (kicks only; never headers, throws, punts or 82's bicycle and scissor kicks). */
const _v187fPose=Stage.prototype.poseOf;
Stage.prototype.poseOf=function(p,isRef){ const P=_v187fPose.apply(this,arguments);
  if(isRef||!p||!P||typeof v187mKickArm!=='function') return P;
  try{ v187mKickArm(this,p,P); }catch(e){}
  return P; };
