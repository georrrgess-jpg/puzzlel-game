/* prototype: 3-D toon figures driven by the game's own pose solver (poseOf/blendPose/ik3) */
window.protoFig=function(opts){
  const T=THREE, W=opts.W, H=opts.H; const cv=document.createElement('canvas'); cv.width=W; cv.height=H; cv.style.cssText=`position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:99999`; document.body.appendChild(cv);
  const R=new T.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true}); R.setPixelRatio(1); R.setSize(W,H,false); R.outputColorSpace=T.SRGBColorSpace; R.shadowMap.enabled=true; R.shadowMap.type=T.PCFShadowMap;
  const S=new T.Scene(); S.background=new T.Color('#16301f');
  const cam=new T.PerspectiveCamera(opts.fov||28,W/H,0.1,400); cam.position.set(...opts.cam); cam.lookAt(...opts.look);
  S.add(new T.HemisphereLight('#cfe0ff','#2a4a2a',1.1)); const sun=new T.DirectionalLight('#fff1d6',2.4); sun.position.set(opts.look[0]-18,40,opts.look[2]+28); sun.target.position.set(...opts.look); S.add(sun.target); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:120}); sun.shadow.bias=-0.0006; S.add(sun);
  const pit=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshLambertMaterial({color:'#2a8a48'})); pit.rotation.x=-Math.PI/2; pit.receiveShadow=true; S.add(pit);
  const gm=new T.DataTexture(new Uint8Array([110,190,255]),3,1,T.RedFormat); gm.needsUpdate=true; gm.minFilter=gm.magFilter=T.NearestFilter;
  const mats={}; const toon=c=>mats[c]||(mats[c]=new T.MeshToonMaterial({color:c,gradientMap:gm})); const outlineM=new T.MeshBasicMaterial({color:'#101010',side:T.BackSide});
  const cyl=new T.CylinderGeometry(1,1,1,12,1,true), sph=new T.SphereGeometry(1,16,12), cylC=new T.CylinderGeometry(1,1,1,12,1,false);
  function part(group,geo,c,ol){ const m=new T.Mesh(geo,toon(c)); m.castShadow=true; group.add(m); let o=null; if(ol){ o=new T.Mesh(geo,outlineM); group.add(o); } return {m,o}; }
  const up=new T.Vector3(0,1,0), tmp=new T.Vector3();
  function seg(pp,a,b,r0){ const len=a.distanceTo(b); tmp.subVectors(b,a).normalize(); for(const [mm,k] of [[pp.m,1],[pp.o,1.0]]){ if(!mm) continue; const ol=mm===pp.o; const r=r0+(ol?opts.ol:0); mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(up,tmp); mm.scale.set(r,len+(ol?opts.ol*1.2:0),r); } }
  function ball(pp,c,r0){ for(const mm of [pp.m,pp.o]){ if(!mm) continue; const r=r0+(mm===pp.o?opts.ol:0); mm.position.copy(c); mm.scale.set(r,r,r); } }
  function makeFig(kit,look){ const g=new T.Group(); S.add(g); const sk=LOOK.skin[look.skin]||LOOK.skin[3], hair=LOOK.hairCol[look.hairCol]||'#111', boot=LOOK.boots[look.boots]||'#111';
    const P={}; const add=(k,geo,c)=>P[k]=part(g,geo,c,true);
    for(const s of ['L','R']){ add('th'+s,cylC,kit.shorts); add('kn'+s,sph,sk); add('sh'+s,cylC,kit.socks); add('ft'+s,sph,boot); add('ua'+s,cylC,kit.shirt); add('fa'+s,cylC,sk); add('el'+s,sph,sk); add('hd'+s,sph,sk); add('so'+s,sph,kit.shirt); add('hp'+s,sph,kit.shorts); }
    add('torso',cylC,kit.shirt); add('chest',sph,kit.shirt); add('pelvis',sph,kit.shorts); add('neck',cylC,sk); add('head',sph,sk); add('hair',sph,hair);
    return {g,P,look}; }
  function V(f,u,l,root,yaw,hs){ const ca=Math.cos(yaw), sa=Math.sin(yaw); return new T.Vector3(root.x+(f*ca-l*sa)*hs, u*hs, root.z+(f*sa+l*ca)*hs); }
  function pose(F,fig,stg){ const isRef=false; const P=stg.blendPose(fig,stg.poseOf(fig,isRef)); const B=({lean:.9,average:1,stocky:1.14}[F.look.build]||1);
    const lean=P.lean, cl=Math.cos(lean), sl=Math.sin(lean), hipU=P.hipU; const upf=(f,u,l)=>{ if(u<=hipU) return [f,u,l]; const du=u-hipU; return [f*cl+du*sl, hipU+du*cl-f*sl, l]; };
    const hs=(fig.hgt||70)/70*opts.unit; const root={x:fig.x,z:fig.y}; const yaw=fig.yaw; const lift=P.lift||0;
    const v=a=>{ const p=V(a[0],a[1]+lift,a[2],root,yaw,hs); return p; };
    const legs=[0,1].map(i=>{ const sd=i?1:-1; const hip=[0,hipU,sd*0.09*B]; const ft=P.feet[i]; const J=ik3(hip,[ft.f,ft.u+0.06,ft.l],0.43,0.43,[1,0.05,sd*0.12]); return [v(hip),v(J.j),v(J.t),v([J.t[0]+0.08,J.t[1]-0.03,J.t[2]])]; });
    const arms=[0,1].map(i=>{ const sd=i?1:-1; const sh=upf(0,1.48,sd*0.2*B); const hd=P.hands[i]; const J=ik3(sh,upf(hd.f,hd.u,hd.l),0.3,0.29,[-0.7,-0.5,sd*0.6]); return [v(sh),v(J.j),v(J.t)]; });
    const top=v(upf(0,1.5,0)), wst=v(upf(0,0.95,0)), neckA=v(upf(0,1.56,0)); const tilt=P.headTilt||0; const head=v(upf(0.02+tilt*0.05,1.80,0));
    const Q=F.P, u=hs; ['L','R'].forEach((s,i)=>{ const [h,k,a,toe]=legs[i]; seg(Q['th'+s],h,k,0.085*u*B); ball(Q['kn'+s],k,0.07*u*B); seg(Q['sh'+s],k,a,0.065*u*B); ball(Q['ft'+s],toe,0.07*u); Q['ft'+s].m.scale.x*=1.6; if(Q['ft'+s].o) Q['ft'+s].o.scale.x*=1.6;
      const [sh,el,hd]=arms[i]; seg(Q['ua'+s],sh,el,0.062*u*B); ball(Q['el'+s],el,0.05*u*B); seg(Q['fa'+s],el,hd,0.05*u*B); ball(Q['hd'+s],hd,0.055*u); ball(Q['so'+s],sh,0.08*u*B); ball(Q['hp'+s],h,0.1*u*B); });
    seg(Q.torso,wst,top,0.19*u*B); ball(Q.chest,top,0.19*u*B); Q.chest.m.scale.y*=0.55; if(Q.chest.o) Q.chest.o.scale.y*=0.6; ball(Q.pelvis,wst,0.18*u*B); seg(Q.neck,neckA,head,0.055*u); ball(Q.head,head,0.135*u); ball(Q.hair,head.clone().add(new T.Vector3(0,0.03*u,0)),0.138*u); Q.hair.m.scale.y*=0.8;
    /* whole-body rotation (dive / fall) about the pivot, in the camera plane like the 2-D painter */
    if(P.rot){ const piv=new T.Vector3(root.x, (P.pivot+lift)*hs, root.z); F.g.children.forEach(c=>{ c.position.sub(piv).applyAxisAngle(new T.Vector3(Math.cos(yaw),0,Math.sin(yaw)),-P.rot).add(piv); c.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(Math.cos(yaw),0,Math.sin(yaw)),-P.rot)); }); }
  }
  return {T,R,S,cam,makeFig,pose,render:()=>R.render(S,cam),cv};
};
