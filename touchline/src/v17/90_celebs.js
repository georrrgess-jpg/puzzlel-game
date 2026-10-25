/* ===================== v18.10: celebrations polished, and three you have to win (90) =====================
   - The Backflip, rebuilt as a real standing back tuck: he loads (knees bend, chest over the feet, arms swing down and
     back), drives up (legs extend, arms whip overhead, the chest arches back), tucks in the air (knees to the chest,
     hands grab the shins, the rotation is fastest here), opens out to spot the landing, lands with bent knees and
     arms forward for balance, then throws both arms up. The hips fly one arc; the rotation eases in and out of the tuck
     instead of turning at an even rate; the old version rotated the whole straight body like a wheel.
   - Award-only celebrations (CELEBS 'spin', 'archer', 'conductor'; req {k:'award'}): only a player who has won the
     award unlocks them, announced on the Newswire the day the awards are given out.
       League MVP              -> The Spin Jump: a gather step, a leap with a full spin in the air, arms tucked, and a
                                  wide-legged landing with the arms thrust out and down and the chest puffed out.
       Goal Scorer of the Year -> The Archer: drops to one knee, draws a bow at the sky, holds it, and lets the arrow fly.
       Playmaker of the Year   -> The Conductor: conducts the crowd through a bar of four, then a big two-armed
                                  flourish and a clenched hold.
   Poses only (celebPose); positions and timing are the goal sequence's, with a longer hold before the teammates arrive
   for the longer moves (v1810Hold, one expression in 55_body). Globals: v1810* / V1810. */
const V1810={on:true,hold:{backflip:1250,kneeslide:1150,spin:1450,archer:1650,conductor:1900}};
const V1810_AW={spin:'mvp',archer:'scorer',conductor:'playmaker'};
CELEBS.push(
  {id:'spin',      n:'The Spin Jump', d:'A leap, a full spin in the air and a wide-legged landing. Arms out, chest out.', req:{k:'award',v:'mvp'},      how:'Win League MVP', excl:true},
  {id:'archer',    n:'The Archer',    d:'Down on one knee, draws a bow at the sky and lets it fly.',                       req:{k:'award',v:'scorer'},   how:'Win Goal Scorer of the Year', excl:true},
  {id:'conductor', n:'The Conductor', d:'Conducts the crowd through a bar of four, then the big finish.',                  req:{k:'award',v:'playmaker'},how:'Win Playmaker of the Year', excl:true});
for(const c of CELEBS) CELEB_BY[c.id]=c;
if(typeof CEL_STILL==='object'){ CEL_STILL.spin=1100; CEL_STILL.archer=850; CEL_STILL.conductor=420; CEL_STILL.backflip=640; }
function v1810Hold(type,dflt){ return V1810.hold[type]||dflt||1000; }

/* award celebrations unlock with the award itself */
const _v1810Prog=celebProgress;
celebProgress=function(C,p,c){ const r=c&&c.req; if(r&&r.k==='award'){ const have=!!(p&&(p.awards||[]).some(a=>a&&a.k===r.v)); return {have,cur:have?1:0,need:1}; } return _v1810Prog.apply(this,arguments); };
if(typeof finalizeAwards==='function'){ const _v1810Aw=finalizeAwards;
  finalizeAwards=function(C,yr){ const done=!!(C.awards&&C.awards[yr]&&C.awards[yr].done); const A=_v1810Aw.apply(this,arguments);
    try{ if(!done&&A&&A.list) for(const [id,k] of Object.entries(V1810_AW)){ const w=A.list[k]; const p=w&&C.players[w.pid]; if(!p) continue;
        if(!p.celSeen) p.celSeen=['classic']; if(p.celSeen.includes(id)) continue; p.celSeen.push(id); if(p.sid===C.userSid) p.celLast=id;
        addNews(C,'celebration',`${pname(p)} unlocks an award-only celebration: ${CELEB_BY[id].n} (${AWARD_NAME[k]})`,p.sid,{pid:p.id,cel:id}); } }catch(e){}
    return A; }; }

/* the poses */
const v1810Sm=t=>{ t=t<0?0:t>1?1:t; return t*t*(3-2*t); };
const v1810Ss=t=>{ t=t<0?0:t>1?1:t; return t*t*t*(t*(t*6-15)+10); };
const v1810L=(a,b,t)=>a+(b-a)*t;
const v1810LP=(a,b,t)=>[v1810L(a[0],b[0],t),v1810L(a[1],b[1],t),v1810L(a[2],b[2],t)];
const _v1810Pose=Stage.prototype.celebPose;
Stage.prototype.celebPose=function(p,P,moving){ const type=p.celebType;
  if(!V1810.on||!(type==='backflip'||type==='spin'||type==='archer'||type==='conductor')) return _v1810Pose.apply(this,arguments);
  const T=p.celebT!=null?this.now-p.celebT:-1; const Hs=(i,f,u,l)=>{ P.hands[i]={f,u,l:l==null?(i?1:-1)*0.27:l}; }, Fs=(i,f,u,l)=>{ P.feet[i]={f,u,l:l==null?(i?1:-1)*0.1:l}; };
  const H=(i,v)=>Hs(i,v[0],v[1],v[2]*(i?1:-1)), Ft=(i,v)=>Fs(i,v[0],v[1],v[2]*(i?1:-1));
  P.mouth=true;
  if(T<0){ if(moving){ Hs(1,0.2,2.15,0.24); Hs(0,-0.2,1.3,-0.3); } return; }
  const sd=p.seed||0;
  if(type==='backflip'){ const D=Math.max(560,this.D(1100)), u=T/D, fw=Math.cos(p.yaw||0)>=0?1:-1;
    const t0=0.22, t1=0.86; /* in the air from t0 to t1 */
    if(u<t0){ /* load: knees bend, chest over the feet, arms swing down and back */ const q=v1810Sm(u/t0);
      P.hipU=v1810L(0.8,0.56,q); P.lean=0.32*q; Ft(0,[0.02,0,0.11]); Ft(1,[0.02,0,0.11]); H(0,v1810LP([0.1,1.05,0.3],[-0.48,0.95,0.24],q)); H(1,v1810LP([0.1,1.05,0.3],[-0.48,0.95,0.24],q)); P.headTilt=0.15*q; }
    else if(u<t1){ const s=(u-t0)/(t1-t0); /* the hips' arc */ P.lift=1.05*4*s*(1-s);
      /* the rotation: slow off the ground, fast in the tuck, slowing to spot the landing */ const th=2*Math.PI*v1810Ss(Math.min(1,s*1.04)); P.rot=-fw*th; P.pivot=0.92;
      const drive=v1810Sm(s/0.18), tuck=Math.pow(Math.sin(Math.PI*v1810Sm(Math.min(1,Math.max(0,(s-0.12)/0.76)))),0.8), open=v1810Sm((s-0.8)/0.2);
      P.hipU=v1810L(v1810L(0.56,0.84,drive),0.8,tuck); P.lean=v1810L(v1810L(0.32,-0.18,drive),0.35,tuck)*(1-open);
      const ext=[0.02,0,0.11], tk=[0.3,0.6,0.13]; Ft(0,v1810LP(ext,tk,tuck)); Ft(1,v1810LP(ext,tk,tuck));
      const over=[0.08,2.25,0.25], shin=[0.36,0.82,0.2], land=[0.42,1.38,0.36]; const hd=v1810LP(v1810LP([-0.48,0.95,0.24],over,drive),shin,tuck); H(0,v1810LP(hd,land,open)); H(1,v1810LP(hd,land,open));
      P.headTilt=v1810L(-0.35,0.35,tuck); }
    else if(u<1.06){ /* land: knees absorb, arms forward for balance, then stand tall */ const q=(u-t1)/(1.06-t1), dip=Math.sin(Math.PI*Math.min(1,q*1.25));
      P.hipU=0.8-0.22*dip; P.lean=0.22*dip; Ft(0,[0.03,0,0.13]); Ft(1,[0.03,0,0.13]); H(0,[0.42,1.38-0.1*dip,0.36]); H(1,[0.42,1.38-0.1*dip,0.36]); P.headTilt=0.1*dip; }
    else { const q=v1810Sm((u-1.06)/0.15); H(0,v1810LP([0.42,1.38,0.36],[0.1,2.22,0.42],q)); H(1,v1810LP([0.42,1.38,0.36],[0.1,2.27,0.45],q)); P.lift=q*Math.abs(Math.sin(this.now/200+sd))*0.12; }
    return; }
  if(type==='spin'){ const D=Math.max(520,this.D(1000)), u=T/D;
    if(u<0.24){ /* the gather: a hop onto both feet, arms swing back */ const q=v1810Sm(u/0.24); P.hipU=v1810L(0.8,0.58,q); P.lean=0.25*q; Ft(0,[0.05,0,0.12]); Ft(1,[0.05,0,0.12]); H(0,[-0.42*q,1.0,0.3]); H(1,[-0.42*q,1.0,0.3]); }
    else if(u<0.78){ const s=(u-0.24)/0.54; P.lift=0.62*4*s*(1-s); /* a full turn (v1810SpinAng, applied when he is drawn), arms tucked to the chest */
      const tk=Math.sin(Math.PI*s); P.hipU=v1810L(0.84,0.74,tk); P.lean=-0.05; Ft(0,[0.02,0.18*tk,0.08]); Ft(1,[0.06,0.12*tk,0.08]); H(0,v1810LP([0.1,2.1,0.3],[0.2,1.38,0.12],tk)); H(1,v1810LP([0.1,2.1,0.3],[0.2,1.38,0.12],tk)); P.headTilt=-0.2; }
    else { /* the landing stance: feet wide, knees bent, arms thrust out and down, chest out, head back */ const q=v1810Sm((u-0.78)/0.14), br=u>1.2?Math.sin(this.now/420+sd)*0.015:0;
      P.hipU=v1810L(0.84,0.66,q)+br; P.lean=-0.16*q; Ft(0,[0.02,0,v1810L(0.1,0.34,q)]); Ft(1,[0.02,0,v1810L(0.1,0.34,q)]); H(0,v1810LP([0.2,1.38,0.12],[0.18,0.92,0.78],q)); H(1,v1810LP([0.2,1.38,0.12],[0.18,0.92,0.78],q)); P.headTilt=-0.38*q; }
    return; }
  if(type==='archer'){ const D=Math.max(560,this.D(1000)), u=T/D, k=v1810Sm(u/0.28);
    /* down on one knee */ P.hipU=v1810L(0.8,0.5,k); P.lean=v1810L(0,-0.08,k); Ft(0,v1810LP([0.02,0,0.1],[0.36,0,0.12],k)); Ft(1,v1810LP([0.02,0,0.1],[-0.42,0.02,0.12],k));
    const bow=[0.6,1.78,0.08], nock=[0.56,1.74,0.04], cheek=[0.06,1.66,0.14], loose=[-0.2,1.78,0.36];
    if(u<0.28){ H(0,v1810LP([0.1,1.0,0.3],bow,k)); H(1,v1810LP([0.1,1.0,0.3],nock,k)); P.headTilt=-0.1*k; }
    else if(u<0.88){ /* draw: the string hand comes back to the cheek, slowly at the end */ const q=v1810Ss((u-0.28)/0.6); H(0,bow); H(1,v1810LP(nock,cheek,q)); P.headTilt=-0.32; P.headTurn=0.1*q; P.mouth=false; }
    else if(u<1.1){ /* loose: the string hand flies back and opens, the bow arm follows through */ const q=v1810Sm((u-0.88)/0.12); H(0,v1810LP(bow,[0.58,1.86,0.1],q)); H(1,v1810LP(cheek,loose,q)); P.headTilt=-0.42; P.lean=-0.08-0.05*q; }
    else { /* watches it go, then a fist to the sky */ const q=v1810Sm((u-1.6)/0.25); H(0,v1810LP([0.58,1.86,0.1],[0.12,1.0,0.3],q)); H(1,v1810LP(loose,[0.16,2.28,0.2],q)); P.headTilt=-0.42+0.2*q; }
    return; }
  if(type==='conductor'){ const beat=Math.max(200,this.D(360)), b=T/beat; Ft(0,[0.0,0,0.14]); Ft(1,[0.04,0,0.14]);
    if(b<4.2){ /* a bar of four with the right hand (down, in, out, up), the left mirroring smaller; a nod on each beat */
      const R=[[0.36,1.84,0.3],[0.36,1.22,0.24],[0.4,1.46,-0.04],[0.36,1.5,0.58],[0.36,1.84,0.3]], i=Math.min(3,Math.floor(b)), f=b-i, e=f<0.35?v1810Sm(f/0.35):1;
      const r=v1810LP(R[i],R[i+1],e); Hs(1,r[0],r[1],r[2]); Hs(0,0.34,v1810L(1.5,r[1],0.6),-v1810L(0.3,Math.abs(r[2]),0.6));
      P.headTilt=0.12*Math.exp(-f*5); P.lean=0.03; P.mouth=false; }
    else { /* the flourish: both arms sweep up and out, fists clench, hold */ const q=v1810Sm((b-4.2)/0.9); Hs(0,v1810L(0.34,0.14,q),v1810L(1.5,2.26,q),-v1810L(0.3,0.62,q)); Hs(1,v1810L(0.36,0.14,q),v1810L(1.84,2.3,q),v1810L(0.3,0.64,q)); P.lean=-0.12*q; P.headTilt=-0.3*q; P.lift=q>0.95?Math.abs(Math.sin(this.now/210+sd))*0.08:0; }
    return; }
};

/* the spin jump's turn: a function of the celebration clock, added to his facing only while he is drawn (2-D and 3-D),
   so nothing that steers his facing between frames ever sees it */
function v1810SpinAng(st,p){ if(!V1810.on||!p||!p.celeb||p.celebType!=='spin'||p.celebT==null||!st) return 0; const u=(st.now-p.celebT)/Math.max(520,st.D(1000));
  if(u<=0.24||u>=0.78) return 0; return 2*Math.PI*v1810Ss((u-0.24)/0.54); }
const _v1810Draw=Stage.prototype.drawFigure;
Stage.prototype.drawFigure=function(g,p){ const a=v1810SpinAng(this,p); if(!a) return _v1810Draw.apply(this,arguments); const y=p.yaw; p.yaw=(y==null?((p.face||1)>0?0:Math.PI):y)+a; try{ return _v1810Draw.apply(this,arguments); } finally{ p.yaw=y; } };
if(typeof v18FigDraw==='function'){ const _v1810Fig=v18FigDraw;
  v18FigDraw=function(P,st,p){ const a=v1810SpinAng(st,p); if(!a) return _v1810Fig.apply(this,arguments); const y=p.yaw; p.yaw=(y==null?((p.face||1)>0?0:Math.PI):y)+a; try{ return _v1810Fig.apply(this,arguments); } finally{ p.yaw=y; } }; }
