/* ===================== v18 3-D renderer: ball and small effects (module order 40, ANIMATION_PLAN 3.4 / 3.6) =====================
   - the football: a sphere with a classic 32-panel texture (black pentagons, white hexagons, grey seams) painted once into a
     CanvasTexture, MeshStandard with a low roughness so the sun leaves a specular highlight. Radius 0.11 m x 1.6 for
     readability; the stage's ball z is the underside of the ball, so the centre sits at z + R.
   - orientation from st.v17M (55_body: row-major 3x3, body -> world, world x along the pitch, y toward the near touchline,
     z up). Three's axes swap y and z, so the rotation is conjugated by that swap: R = B M B with B = swap(y,z); the ball rolls
     the way it travels. The bounce squash (st.v17sq) scales a non-rotating parent.
   - a real cast shadow (tiers A/B) and a soft contact blob that shrinks and fades with height;
   - a camera-facing ribbon from the drawn trail (st.v17tr, curl included) only for fast shots (> 18 m/s game speed);
   - turf flecks (st.turf) as small instanced quads;
   - the offside freeze line (st.offMark) as a thin translucent line across the grass, faded like the 2-D one. The 2-D painter
     clears st.offMark when its fade is over; while the 3-D painter draws instead, this module does the same.
   Presentation only: nothing the simulation reads is written (st.offMark is the painter's own fade state). */
const V18_BALL_R=0.11*1.6;

/* the panel texture: equirectangular, every pixel coloured by the nearest of the 32 panel centres (12 pentagon centres =
   icosahedron vertices, 20 hexagon centres = its face centres), with a seam where two panels are nearly equidistant.
   Painted once per page (it is the same for every painter) */
const v18BallCanvas=(()=>{ const cache={}; return detail=>{ const W=detail>=2?1024:512, H=W/2; if(cache[W]) return cache[W];
  const f=(1+Math.sqrt(5))/2; const V=[[0,1,f],[0,-1,f],[0,1,-f],[0,-1,-f],[1,f,0],[-1,f,0],[1,-f,0],[-1,-f,0],[f,0,1],[-f,0,1],[f,0,-1],[-f,0,-1]].map(([a,b,c])=>{ const l=Math.hypot(a,b,c); return [a/l,b/l,c/l]; });
  const C=[]; for(const v of V) C.push([v[0],v[1],v[2],1]);
  /* faces of the icosahedron: triples of mutually adjacent vertices (edge length 2 in the unnormalised coordinates) */
  const adj=(i,j)=>Math.abs(V[i][0]*V[j][0]+V[i][1]*V[j][1]+V[i][2]*V[j][2]-1/Math.sqrt(5))<1e-3;
  for(let i=0;i<12;i++) for(let j=i+1;j<12;j++) for(let k=j+1;k<12;k++) if(adj(i,j)&&adj(j,k)&&adj(i,k)){ const x=V[i][0]+V[j][0]+V[k][0], y=V[i][1]+V[j][1]+V[k][1], z=V[i][2]+V[j][2]+V[k][2], l=Math.hypot(x,y,z); C.push([x/l,y/l,z/l,0]); }
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); const img=g.createImageData(W,H); const d=img.data;
  const PENT=1.012; /* pentagon cells a touch larger, closer to a real truncated icosahedron */
  for(let j=0;j<H;j++){ const th=(j+0.5)/H*Math.PI, st=Math.sin(th), ct=Math.cos(th);
    for(let i=0;i<W;i++){ const ph=(i+0.5)/W*Math.PI*2; const x=-Math.cos(ph)*st, y=ct, z=Math.sin(ph)*st;
      let b1=-9,b2=-9,p1=0; for(let n=0;n<32;n++){ const c=C[n]; let dd=(c[0]*x+c[1]*y+c[2]*z); if(c[3]) dd=1-(1-dd)/PENT; if(dd>b1){ b2=b1; b1=dd; p1=c[3]; } else if(dd>b2) b2=dd; }
      const seam=b1-b2; const o=(j*W+i)*4; let r,gg,bb;
      if(p1){ r=24; gg=26; bb=31; } else { r=244; gg=244; bb=240; }
      if(seam<0.012){ const k=seam/0.012; const s=p1?60:150; r=s+(r-s)*k*k; gg=s+(gg-s)*k*k; bb=s+5+(bb-s-5)*k*k; }
      d[o]=r; d[o+1]=gg; d[o+2]=bb; d[o+3]=255; } }
  g.putImageData(img,0,0); cache[W]=cv; return cv; }; })();

/* a soft round blob (contact shadow, glow) */
const v18BlobCanvas=(()=>{ let cv=null; return ()=>{ if(cv) return cv; cv=document.createElement('canvas'); cv.width=cv.height=64; const g=cv.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.45,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return cv; }; })();

const V18_STREAK_N=12;
P3D_MODULES.push({name:'ball',order:40,
  init(P){ const T=P.T, R=V18_BALL_R; const B=P.ball3={};
    const tex=P.track(new T.CanvasTexture(v18BallCanvas(P.tier.detail))); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=Math.min(4,P.renderer.capabilities.getMaxAnisotropy?P.renderer.capabilities.getMaxAnisotropy():1);
    const seg=P.tier.detail>=1?32:20;
    B.mat=P.track(new T.MeshStandardMaterial({map:tex,roughness:0.36,metalness:0,color:'#ffffff'}));
    B.root=new T.Group(); B.root.name='v18-ball'; B.mesh=new T.Mesh(P.track(new T.SphereGeometry(R,seg,Math.round(seg*0.62))),B.mat);
    B.mesh.castShadow=P.tier.shadow>0; B.root.add(B.mesh); P.scene.add(B.root);
    /* contact blob */
    const bt=P.track(new T.CanvasTexture(v18BlobCanvas()));
    B.blob=new T.Mesh(P.track(new T.PlaneGeometry(1,1)),P.track(new T.MeshBasicMaterial({map:bt,color:'#000000',transparent:true,opacity:0.5,depthWrite:false})));
    B.blob.rotation.x=-Math.PI/2; B.blob.renderOrder=2; P.scene.add(B.blob);
    /* motion streak: a ribbon of V18_STREAK_N points, two vertices each, vertex alpha */
    const sg=P.track(new T.BufferGeometry()); B.sPos=new Float32Array(V18_STREAK_N*2*3); B.sCol=new Float32Array(V18_STREAK_N*2*4);
    sg.setAttribute('position',new T.BufferAttribute(B.sPos,3).setUsage(T.DynamicDrawUsage)); sg.setAttribute('color',new T.BufferAttribute(B.sCol,4).setUsage(T.DynamicDrawUsage));
    const idx=[]; for(let i=0;i<V18_STREAK_N-1;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); } sg.setIndex(idx);
    B.streak=new T.Mesh(sg,P.track(new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending})));
    B.streak.frustumCulled=false; B.streak.visible=false; B.streak.renderOrder=3; P.scene.add(B.streak);
    /* turf flecks */
    B.fl=new T.InstancedMesh(P.track(new T.PlaneGeometry(0.075,0.05)),P.track(new T.MeshLambertMaterial({color:'#ffffff',side:T.DoubleSide})),64);
    B.fl.instanceMatrix.setUsage(T.DynamicDrawUsage); B.fl.count=0; B.fl.frustumCulled=false; P.scene.add(B.fl); B.flC=new T.Color(); B.m4=new T.Matrix4(); B.q=new T.Quaternion(); B.e=new T.Euler(); B.s=new T.Vector3(); B.p=new T.Vector3();
    /* offside line: a crisp core and a soft glow */
    const lg=P.track(new T.PlaneGeometry(1,68));
    B.off=new T.Mesh(lg,P.track(new T.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})));
    B.offG=new T.Mesh(lg,P.track(new T.MeshBasicMaterial({color:'#ffe9b0',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})));
    for(const m of [B.off,B.offG]){ m.rotation.x=-Math.PI/2; m.visible=false; m.renderOrder=1; P.scene.add(m); }
    B.m3=new T.Matrix4(); B.v=new T.Vector3(); B.v2=new T.Vector3(); B.v3=new T.Vector3(); B.cam=new T.Vector3(); },
  frame(P,st){ const B=P.ball3; if(!B) return; const b=st.ball, R=V18_BALL_R; const z=Math.max(0,b.z||0);
    B.root.position.set(b.x,z+R,b.y); B.root.visible=true;
    /* rotation: R = B M B, B swapping y and z (stage z up -> three y up) */
    const M=st.v17M; if(M){ B.m3.set(M[0],M[2],M[1],0, M[6],M[8],M[7],0, M[3],M[5],M[4],0, 0,0,0,1); B.mesh.quaternion.setFromRotationMatrix(B.m3); }
    else B.mesh.rotation.set(0,0,-(b.spin||0));
    /* squash on a bounce: wider and flatter for a moment, anchored at the bottom */
    let sq=0; const Q=st.v17sq; if(Q&&!st.rm){ const u=(st.now-Q.t)/Math.max(60,st.D?st.D(110):110); if(u>=0&&u<1) sq=Q.a*Math.sin(Math.PI*u); }
    if(sq>0.005){ B.root.scale.set(1+sq*0.6,1-sq,1+sq*0.6); B.root.position.y=z+R*(1-sq); } else B.root.scale.set(1,1,1);
    /* contact blob: shrinks and fades as the ball rises */
    const hz=Math.min(1,z/4); const bs=R*2.9*(1-hz*0.45); B.blob.scale.set(bs,bs,1); B.blob.position.set(b.x,0.012,b.y); B.blob.material.opacity=(P.night?0.62:0.55)*(1-hz*0.85); B.blob.visible=B.blob.material.opacity>0.02;
    this.streak(P,st,B);
    this.flecks(P,st,B);
    this.offside(P,st,B); },
  /* the streak: from the drawn ball back along the trail, tapering to nothing */
  streak(P,st,B){ const s=st.v17bs||0, Tr=st.v17tr||st.trail, f=st.fl; const on=!st.rm&&s>18&&f&&!f.phys&&f.kind==='shot'&&Tr&&Tr.length>3;
    if(!on){ B.streak.visible=false; return; }
    const R=V18_BALL_R, b=st.ball, n=Math.min(V18_STREAK_N,Tr.length); const pts=[]; pts.push([b.x,Math.max(0,b.z)+R,b.y]);
    for(let i=Tr.length-2;i>=0&&pts.length<n;i--){ const t=Tr[i]; pts.push([t[0],Math.max(0,t[2])+R,t[1]]); }
    if(pts.length<3){ B.streak.visible=false; return; }
    while(pts.length<V18_STREAK_N) pts.push(pts[pts.length-1]);
    const cam=P.camera.position, a0=Math.min(1,(s-18)/8)*0.42; const P3=B.sPos, C4=B.sCol;
    for(let i=0;i<V18_STREAK_N;i++){ const p=pts[i], q=pts[Math.min(V18_STREAK_N-1,i+1)], o=pts[Math.max(0,i-1)];
      let tx=o[0]-q[0], ty=o[1]-q[1], tz=o[2]-q[2]; const tl=Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
      const vx=cam.x-p[0], vy=cam.y-p[1], vz=cam.z-p[2]; let sx=ty*vz-tz*vy, sy=tz*vx-tx*vz, sz=tx*vy-ty*vx; const sl=Math.hypot(sx,sy,sz)||1; const u=i/(V18_STREAK_N-1); const w=R*0.95*(1-u*0.85);
      sx=sx/sl*w; sy=sy/sl*w; sz=sz/sl*w;
      P3.set([p[0]+sx,p[1]+sy,p[2]+sz, p[0]-sx,p[1]-sy,p[2]-sz],i*6);
      const al=a0*(1-u)*(i===0?0.6:1); C4.set([1,1,1,al, 1,1,1,al],i*8); }
    const g=B.streak.geometry; g.attributes.position.needsUpdate=true; g.attributes.color.needsUpdate=true; B.streak.visible=true; },
  flecks(P,st,B){ const Tf=st.turf, I=B.fl; if(!Tf||!Tf.length||st.rm){ I.count=0; I.visible=false; return; }
    const n=Math.min(64,Tf.length); for(let i=0;i<n;i++){ const q=Tf[i]; const sc=Math.max(0.05,Math.min(1,q.life*2.4));
      B.e.set(i*1.7+P.time*0.011,i*2.3,i*0.9+P.time*0.007); B.q.setFromEuler(B.e); B.s.set(sc,sc,sc); B.p.set(q.x,Math.max(0.01,q.z)+0.02,q.y);
      B.m4.compose(B.p,B.q,B.s); I.setMatrixAt(i,B.m4); B.flC.set(q.c||'#2f7a3d'); I.setColorAt(i,B.flC); }
    I.count=n; I.visible=true; I.instanceMatrix.needsUpdate=true; if(I.instanceColor) I.instanceColor.needsUpdate=true; },
  offside(P,st,B){ const m=st.offMark; if(!m){ B.off.visible=B.offG.visible=false; return; }
    const t=(st.now-m.t)/Math.max(700,st.D?st.D(1500):1500); if(t>=1){ st.offMark=null; B.off.visible=B.offG.visible=false; return; }
    const al=t<0.15?t/0.15:1-Math.max(0,(t-0.6)/0.4);
    B.off.position.set(m.x,0.018,34); B.off.scale.set(0.12,1,1); B.off.material.opacity=0.82*al; B.off.visible=true;
    B.offG.position.set(m.x,0.016,34); B.offG.scale.set(0.9,1,1); B.offG.material.opacity=0.16*al; B.offG.visible=true; },
  resize(P){},
  dispose(P){ P.ball3=null; } });
