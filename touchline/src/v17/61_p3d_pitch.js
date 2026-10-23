/* ===================== v18 3-D broadcast: pitch, markings, goals, corner flags, sky and weather light (order 10) =====================
   Presentation only: reads the Stage (h, wx, netD, now) and never writes simulation state.
   - Pitch: one plane carrying a cached CanvasTexture (2048x1328: 20 mown bands, mottle, goalmouth/spot/centre wear, darker
     run-off) plus, in the shader, a tiling grass-detail texture sampled at two scales and angles (no visible tiling), a
     view-dependent stripe sheen (the bands read lighter/darker the way mown grass does) and a floodlight pool at night.
   - Markings: real ribbons (0.12 m) whose half-width the vertex shader widens to at least ~0.7 screen px at any zoom and
     foreshortening, so the far touchline never breaks up. Spots are discs. One draw call for all of them.
   - Goals: tube frames (posts/crossbar 0.12 m, stanchions/back bars as GF) in one mesh; nets as LineSegments whose
     vertices follow the 2-D netPoint bulge from st.netD every frame they are disturbed.
   - Corner flags wave (vertex sine), sky dome (gradient per weather, stars at night), tree/town silhouette ring.
   Helpers v18sGB (geometry builder in stage metres), v18sCanvas and v18sGlowTex are shared with 62_p3d_stadium. */

function v18sCanvas(w,h){ const c=document.createElement('canvas'); c.width=Math.max(2,Math.ceil(w)); c.height=Math.max(2,Math.ceil(h)); return c; }
/* geometry builder: stage metres in (X along the pitch, Y across, Z up), out in three axes (x=X, y=Z, z=Y); flat triangles,
   vertex colours (linear), optional uv. Materials using it are DoubleSide so winding never matters. */
function v18sGB(T){ const p=[],n=[],c=[],u=[]; const col=new T.Color(); let cr=1,cg=1,cb=1, uv=false;
  const B={
    color(h,k){ col.set(h); if(k!=null) col.multiplyScalar(k); cr=col.r; cg=col.g; cb=col.b; return B; },
    rgb(r,g,b){ cr=r; cg=g; cb=b; return B; },
    tri(a,b,d,ua,ub,ud){ const ax=a[0],ay=a[2],az=a[1],bx=b[0],by=b[2],bz=b[1],dx=d[0],dy=d[2],dz=d[1];
      const e1x=bx-ax,e1y=by-ay,e1z=bz-az,e2x=dx-ax,e2y=dy-ay,e2z=dz-az; let nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x; const l=Math.hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
      p.push(ax,ay,az,bx,by,bz,dx,dy,dz); n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz); c.push(cr,cg,cb,cr,cg,cb,cr,cg,cb);
      if(ua){ uv=true; u.push(ua[0],ua[1],ub[0],ub[1],ud[0],ud[1]); } else u.push(0,0,0,0,0,0); return B; },
    quad(a,b,d,e,q){ B.tri(a,b,d,q&&q[0],q&&q[1],q&&q[2]); B.tri(a,d,e,q&&q[0],q&&q[2],q&&q[3]); return B; },
    box(x0,x1,y0,y1,z0,z1,noBottom){ const A=[x0,y0,z0],Bq=[x1,y0,z0],C=[x1,y1,z0],D=[x0,y1,z0],E=[x0,y0,z1],F=[x1,y0,z1],G=[x1,y1,z1],H=[x0,y1,z1];
      B.quad(E,F,G,H); B.quad(A,Bq,F,E); B.quad(D,H,G,C); B.quad(A,E,H,D); B.quad(Bq,C,G,F); if(!noBottom) B.quad(A,D,C,Bq); return B; },
    /* a round tube between two stage points with smooth radial normals */
    tube(a,b,r,seg,cap){ seg=seg||6; const ax=a[0],ay=a[2],az=a[1],bx=b[0],by=b[2],bz=b[1]; let dx=bx-ax,dy=by-ay,dz=bz-az; const L=Math.hypot(dx,dy,dz)||1; dx/=L; dy/=L; dz/=L;
      let ux=0,uy=1,uz=0; if(Math.abs(dy)>0.9){ ux=1; uy=0; } let px=dy*uz-dz*uy, py=dz*ux-dx*uz, pz=dx*uy-dy*ux; const pl=Math.hypot(px,py,pz); px/=pl; py/=pl; pz/=pl; const qx=dy*pz-dz*py, qy=dz*px-dx*pz, qz=dx*py-dy*px;
      const R=[]; for(let i=0;i<=seg;i++){ const t=i/seg*Math.PI*2, cs=Math.cos(t), sn=Math.sin(t); R.push([px*cs+qx*sn,py*cs+qy*sn,pz*cs+qz*sn]); }
      for(let i=0;i<seg;i++){ const n0=R[i], n1=R[i+1]; const v=(o,nn,e)=>{ p.push(o[0]+nn[0]*r,o[1]+nn[1]*r,o[2]+nn[2]*r); n.push(nn[0],nn[1],nn[2]); c.push(cr,cg,cb); u.push(0,0); };
        const A0=[ax,ay,az], B0=[bx,by,bz]; v(A0,n0); v(B0,n0); v(B0,n1); v(A0,n0); v(B0,n1); v(A0,n1); }
      return B; },
    geo(){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(p,3)); g.setAttribute('normal',new T.Float32BufferAttribute(n,3)); g.setAttribute('color',new T.Float32BufferAttribute(c,3)); if(uv) g.setAttribute('uv',new T.Float32BufferAttribute(u,2)); g.computeBoundingSphere(); return g; },
    get tris(){ return p.length/9; } };
  return B; }
function v18sGlowTex(P){ if(P._v18glow) return P._v18glow; const S=128, cv=v18sCanvas(S,S), q=cv.getContext('2d'); const g=q.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.18,'rgba(255,255,255,.55)'); g.addColorStop(0.45,'rgba(255,255,255,.14)'); g.addColorStop(1,'rgba(255,255,255,0)'); q.fillStyle=g; q.fillRect(0,0,S,S);
  const t=P.track(new P.T.CanvasTexture(cv)); t.colorSpace=P.T.SRGBColorSpace; P._v18glow=t; return t; }

/* ---------- the pitch texture (stage metres X -6..111, Y -4..72 -> 2048 x 1328) ---------- */
const V18P={X0:-6,X1:111,Y0:-4,Y1:72,TW:2048,TH:1328};
function v18sPitchCanvas(){ const {X0,X1,Y0,Y1,TW,TH}=V18P, kx=TW/(X1-X0), ky=TH/(Y1-Y0); const cv=v18sCanvas(TW,TH), q=cv.getContext('2d');
  const PX=x=>(x-X0)*kx, PY=y=>(y-Y0)*ky; const r=rngFrom(0x51a7e);
  /* mown bands across the whole surface (continuing faintly into the run-off) */
  for(let i=-2;i<22;i++){ const x0=PX(i*5.25), x1=PX((i+1)*5.25); q.fillStyle=i%2?'#4a9a51':'#3c8745'; q.fillRect(Math.floor(x0),0,Math.ceil(x1-x0)+1,TH); }
  /* run-off: darker, less manicured beyond ~1.8 m outside the lines */
  { q.save(); q.fillStyle='rgba(18,52,24,.42)'; q.beginPath(); q.rect(0,0,TW,TH); q.rect(PX(-1.8),PY(-1.8),PX(106.8)-PX(-1.8),PY(69.8)-PY(-1.8)); q.fill('evenodd'); q.restore();
    const edge=(x0,y0,x1,y1)=>{ const g=q.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,'rgba(18,52,24,.22)'); g.addColorStop(1,'rgba(18,52,24,0)'); return g; };
    q.fillStyle=edge(PX(-1.8),0,PX(0.4),0); q.fillRect(PX(-1.8),0,PX(0.4)-PX(-1.8),TH); q.fillStyle=edge(PX(106.8),0,PX(104.6),0); q.fillRect(PX(104.6),0,PX(106.8)-PX(104.6),TH);
    q.fillStyle=edge(0,PY(-1.8),0,PY(0.4)); q.fillRect(0,PY(-1.8),TW,PY(0.4)-PY(-1.8)); q.fillStyle=edge(0,PY(69.8),0,PY(67.6)); q.fillRect(0,PY(67.6),TW,PY(69.8)-PY(67.6)); }
  /* mottle: soft light/dark blotches at several sizes */
  for(let i=0;i<520;i++){ const x=r()*TW, y=r()*TH, rad=(8+r()*70)*(r()<0.15?2.2:1), dark=r()<0.55, a=0.03+r()*0.05; const g=q.createRadialGradient(x,y,0,x,y,rad); g.addColorStop(0,dark?`rgba(10,40,14,${a})`:`rgba(190,240,140,${a*0.8})`); g.addColorStop(1,'rgba(0,0,0,0)'); q.fillStyle=g; q.fillRect(x-rad,y-rad,rad*2,rad*2); }
  /* wear: goalmouths, the keeper's line, penalty spots, the centre spot, the linesmen's channels */
  const wear=(x,y,rx,ry,a,n,seed)=>{ const rr=rngFrom(seed); const cx=PX(x), cy=PY(y), RX=rx*kx, RY=ry*ky;
    const g=q.createRadialGradient(0,0,0,0,0,1); g.addColorStop(0,`rgba(122,124,66,${a*0.75})`); g.addColorStop(0.6,`rgba(106,120,60,${a*0.35})`); g.addColorStop(1,'rgba(112,116,58,0)');
    q.save(); q.translate(cx,cy); q.scale(RX,RY); q.fillStyle=g; q.beginPath(); q.arc(0,0,1,0,7); q.fill(); q.restore();
    for(let i=0;i<n;i++){ const an=rr()*6.283, u=Math.pow(rr(),0.7); const px=cx+Math.cos(an)*u*RX, py=cy+Math.sin(an)*u*RY; const f=1-u; q.fillStyle=rr()<0.5?`rgba(92,80,48,${(0.06+rr()*0.14)*f})`:`rgba(150,150,90,${(0.05+rr()*0.12)*f})`; q.fillRect(px,py,1+rr()*2.2,1+rr()*1.6); } };
  for(const gx of [0,105]){ const s=gx?-1:1; wear(gx+s*2.2,34,3.2,5.2,0.62,1400,gx+3); wear(gx+s*0.6,34,1.0,4.6,0.5,700,gx+5); wear(gx+s*11,34,1.3,1.1,0.45,260,gx+7); wear(gx+s*7.5,34,4.5,8,0.12,300,gx+9); }
  wear(52.5,34,1.7,1.4,0.42,300,77); wear(52.5,34,5,4,0.07,200,78);
  for(let x=4;x<101;x+=9){ wear(x+r()*3,-0.6,2.2,0.7,0.10,40,x); wear(x+r()*3,68.6,2.2,0.7,0.10,40,x+500); }
  /* per-pixel grain */
  const id=q.getImageData(0,0,TW,TH), d=id.data; let s=0x9e3779b9>>>0; for(let i=0;i<d.length;i+=4){ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; const v=((s&255)-128)*0.075; const w=(((s>>>8)&255)-128)*0.03; d[i]=Math.max(0,Math.min(255,d[i]+v+w)); d[i+1]=Math.max(0,Math.min(255,d[i+1]+v*1.25)); d[i+2]=Math.max(0,Math.min(255,d[i+2]+v*0.6)); }
  q.putImageData(id,0,0); return cv; }
/* a 256 px wrapping grass-detail tile (grey; multiplied in the shader) */
function v18sDetailCanvas(){ const S=256, cv=v18sCanvas(S,S), q=cv.getContext('2d'); const r=rngFrom(0x6a52); q.fillStyle='#808080'; q.fillRect(0,0,S,S);
  const wrap=(x,y,rad,fn)=>{ for(const ox of [0,-S,S]) for(const oy of [0,-S,S]){ const X=x+ox,Y=y+oy; if(X<-rad||X>S+rad||Y<-rad||Y>S+rad) continue; fn(X,Y); } };
  for(let i=0;i<40;i++){ const x=r()*S,y=r()*S,rad=10+r()*26,dk=r()<0.5,a=0.08+r()*0.08; wrap(x,y,rad,(X,Y)=>{ const g=q.createRadialGradient(X,Y,0,X,Y,rad); g.addColorStop(0,dk?`rgba(0,0,0,${a})`:`rgba(255,255,255,${a})`); g.addColorStop(1,'rgba(128,128,128,0)'); q.fillStyle=g; q.fillRect(X-rad,Y-rad,rad*2,rad*2); }); }
  q.lineCap='round'; for(let i=0;i<5200;i++){ const x=r()*S,y=r()*S,L=2+r()*5,an=(r()-0.5)*0.9,dk=r()<0.5; q.lineWidth=0.7+r()*0.6; q.strokeStyle=dk?`rgba(0,0,0,${0.10+r()*0.16})`:`rgba(255,255,255,${0.08+r()*0.14})`;
    wrap(x,y,8,(X,Y)=>{ q.beginPath(); q.moveTo(X,Y); q.lineTo(X+Math.sin(an)*L,Y-Math.cos(an)*L); q.stroke(); }); }
  return cv; }
/* the home crest painted in the centre circle: a transparent decal; the crest SVG is drawn in when its image loads */
function v18sCrestCanvas(P,st){ const S=512, cv=v18sCanvas(S,S), q=cv.getContext('2d'); const h=st.h||{}; const c1=h.c1||'#1d4ed8';
  const paint=img=>{ q.clearRect(0,0,S,S); q.save(); q.translate(S/2,S/2);
    q.globalAlpha=0.20; q.fillStyle=c1; q.beginPath(); q.arc(0,0,S*0.47,0,7); q.fill(); q.globalAlpha=0.30; q.strokeStyle='#ffffff'; q.lineWidth=S*0.025; q.beginPath(); q.arc(0,0,S*0.41,0,7); q.stroke();
    if(img){ q.globalAlpha=0.36; const w=S*0.36, hh=w*1.15; q.drawImage(img,-w/2,-S*0.36,w,hh); }
    q.globalAlpha=0.40; q.fillStyle='#ffffff'; q.textAlign='center'; q.textBaseline='middle';
    q.font=`900 ${Math.round(S*0.15)}px "Big Shoulders Display","Arial Narrow",sans-serif`; q.fillText(String(h.town||'').toUpperCase(),0,img?S*0.13:-S*0.03,S*0.78);
    q.font=`800 ${Math.round(S*0.075)}px "Big Shoulders Display","Arial Narrow",sans-serif`; q.fillText(String(h.mascot||'').toUpperCase(),0,img?S*0.25:S*0.13,S*0.6); q.restore(); };
  paint(null); const tex=P.track(new P.T.CanvasTexture(cv)); tex.colorSpace=P.T.SRGBColorSpace; tex.anisotropy=4;
  try{ if(typeof crest==='function'){ let svg=crest(h,40); svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace(/width="[^"]*" height="[^"]*"/,'width="200" height="230"');
      const img=new Image(); img.onload=()=>{ if(P.dead) return; try{ paint(img); tex.needsUpdate=true; }catch(e){} }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); } }catch(e){}
  return tex; }

/* ---------- marking ribbons ---------- */
function v18sMarkGeo(T){ const P=[],S=[],Tn=[],Bw=[]; const y=0.012;
  const seg=(x0,z0,x1,z1,hw)=>{ let tx=x1-x0, tz=z1-z0; const l=Math.hypot(tx,tz)||1; tx/=l; tz/=l; const sx=-tz, sz=tx;
    const V=(x,z,s,t)=>{ P.push(x,y,z); S.push(sx*s,0,sz*s); Tn.push(tx*t,0,tz*t); Bw.push(hw); };
    V(x0,z0,1,-1); V(x1,z1,1,1); V(x1,z1,-1,1); V(x0,z0,1,-1); V(x1,z1,-1,1); V(x0,z0,-1,-1); };
  const poly=pts=>{ for(let i=1;i<pts.length;i++) seg(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1],0.06); };
  const circ=(cx,cy,r,a0,a1,N)=>{ const pts=[]; for(let i=0;i<=N;i++){ const a=a0+(a1-a0)*i/N; pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]); } poly(pts); };
  const PI=Math.PI;
  poly([[0,0],[105,0],[105,68],[0,68],[0,0]]); poly([[52.5,0],[52.5,68]]); circ(52.5,34,9.15,0,2*PI,96);
  poly([[0,13.84],[16.5,13.84],[16.5,54.16],[0,54.16]]); poly([[105,13.84],[88.5,13.84],[88.5,54.16],[105,54.16]]);
  poly([[0,24.84],[5.5,24.84],[5.5,43.16],[0,43.16]]); poly([[105,24.84],[99.5,24.84],[99.5,43.16],[105,43.16]]);
  circ(11,34,9.15,-0.9273,0.9273,40); circ(94,34,9.15,PI-0.9273,PI+0.9273,40);
  circ(0,0,1,0,PI/2,10); circ(105,0,1,PI/2,PI,10); circ(0,68,1,-PI/2,0,10); circ(105,68,1,PI,1.5*PI,10);
  /* spots: discs (radius 0.11 m) */
  for(const [cx,cz] of [[52.5,34],[11,34],[94,34]]){ const N=14; for(let i=0;i<N;i++){ const a0=i/N*2*PI, a1=(i+1)/N*2*PI;
    P.push(cx,y,cz, cx,y,cz, cx,y,cz); S.push(0,0,0, Math.cos(a0),0,Math.sin(a0), Math.cos(a1),0,Math.sin(a1)); Tn.push(0,0,0,0,0,0,0,0,0); Bw.push(0.11,0.11,0.11); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('aSide',new T.Float32BufferAttribute(S,3)); g.setAttribute('aTan',new T.Float32BufferAttribute(Tn,3)); g.setAttribute('aBase',new T.Float32BufferAttribute(Bw,1));
  const nrm=new Float32Array(P.length); for(let i=1;i<nrm.length;i+=3) nrm[i]=1; g.setAttribute('normal',new T.BufferAttribute(nrm,3));
  g.boundingSphere=new T.Sphere(new T.Vector3(52.5,0,34),70); return g; }

/* ---------- goals: frame tubes and the net grid (base points in stage coordinates) ---------- */
function v18sGoalFrame(T,B){ const {y0,y1,H,DB,DT,ZB}=GF;
  for(const gx of [0,105]){ const d=gx?1:-1;
    B.color('#f6f7f8'); B.tube([gx,y0,-0.02],[gx,y0,H+0.06],0.06,10); B.tube([gx,y1,-0.02],[gx,y1,H+0.06],0.06,10); B.tube([gx,y0-0.06,H],[gx,y1+0.06,H],0.06,10);
    B.color('#c9ced4'); for(const y of [y0,y1]){ B.tube([gx,y,H-0.05],[gx+d*DT,y,ZB],0.025,5); B.tube([gx+d*DT,y,ZB],[gx+d*DB,y,0.02],0.025,5); B.tube([gx,y,0.02],[gx+d*DB,y,0.02],0.022,5); }
    B.tube([gx+d*DT,y0,ZB],[gx+d*DT,y1,ZB],0.025,5); B.tube([gx+d*DB,y0,0.02],[gx+d*DB,y1,0.02],0.025,5); }
  /* corner flag poles */
  B.color('#e9ecef'); for(const [x,y] of [[0,0],[105,0],[0,68],[105,68]]) B.tube([x,y,0],[x,y,1.5],0.018,5); }
function v18sNetBase(gx){ const {y0,y1,H,DB,DT,ZB}=GF, dir=gx?1:-1, lerp=(a,b,t)=>a+(b-a)*t; const pts=[];
  const grid=(fn,nu,nv)=>{ const P=[]; for(let i=0;i<=nu;i++){ P[i]=[]; for(let j=0;j<=nv;j++) P[i][j]=fn(i/nu,j/nv); }
    for(let i=0;i<=nu;i++) for(let j=0;j<nv;j++) pts.push(P[i][j],P[i][j+1]); for(let j=0;j<=nv;j++) for(let i=0;i<nu;i++) pts.push(P[i][j],P[i+1][j]); };
  grid((u,v)=>[gx+dir*lerp(DB,DT,v), lerp(y0,y1,u), ZB*v],30,8);
  grid((u,w)=>[gx+dir*DT*w, lerp(y0,y1,u), lerp(H,ZB,w)],30,5);
  for(const yy of [y0,y1]) grid((w,v)=>[gx+dir*w*lerp(DB,DT,v), yy, v*lerp(H,ZB,w)],8,9);
  const a=new Float32Array(pts.length*3); pts.forEach((q,i)=>{ a[i*3]=q[0]; a[i*3+1]=q[1]; a[i*3+2]=q[2]; }); return a; }

/* ---------- weather looks: sky top/horizon/bottom, stars, tree tint, outer ground, pitch pool, fog ---------- */
const V18_WX={
  clear:  {sky:['#3f78c0','#a9cbe9','#7d9a86'],stars:0,tree:'#3d5a4f',treeK:1.0,gnd:'#2b5a31',pool:0.25,lamps:0},
  golden: {sky:['#32467a','#f2a86a','#7a6a58'],stars:0,tree:'#3b3a3c',treeK:1.0,gnd:'#3a5228',pool:0.30,lamps:0.6},
  cloud:  {sky:['#6f7c8b','#b4bec8','#7f8a84'],stars:0,tree:'#46564f',treeK:1.0,gnd:'#2c5432',pool:0.35,lamps:0.7},
  rain:   {sky:['#4b5561','#86919c','#5b6660'],stars:0,tree:'#3c4a46',treeK:1.0,gnd:'#26482c',pool:0.45,lamps:0.85},
  snow:   {sky:['#8793a1','#c6d0da','#b8c2cb'],stars:0,tree:'#5d6a70',treeK:1.0,gnd:'#9aa7a6',pool:0.35,lamps:0.8},
  fog:    {sky:['#8e98a3','#b1bac3','#9aa3a8'],stars:0,tree:'#7f8a90',treeK:1.0,gnd:'#2f5034',pool:0.40,lamps:0.85},
  night:  {sky:['#02040b','#0e1a33','#050a10'],stars:1,tree:'#060a10',treeK:1.0,gnd:'#0d2414',pool:1.0,lamps:1}};

P3D_MODULES.push({name:'pitch',order:10,
  init(P){ const T=P.T, st=P.st, S=P.pitch={}; const tr=o=>P.track(o);
    const maxAn=Math.min(8,P.renderer.capabilities.getMaxAnisotropy?P.renderer.capabilities.getMaxAnisotropy():4);
    /* ----- pitch surface ----- */
    const alb=tr(new T.CanvasTexture(v18sPitchCanvas())); alb.colorSpace=T.SRGBColorSpace; alb.anisotropy=maxAn;
    const det=tr(new T.CanvasTexture(v18sDetailCanvas())); det.wrapS=det.wrapT=T.RepeatWrapping; det.anisotropy=maxAn;
    S.u={uDetail:{value:det},uPool:{value:0.3},uSheen:{value:1}};
    const pm=tr(new T.MeshLambertMaterial({map:alb}));
    pm.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,S.u);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP; uniform sampler2D uDetail; uniform float uPool; uniform float uSheen;')
        .replace('#include <map_fragment>',`#include <map_fragment>
        { vec2 wp=vWP.xz; float d1=texture2D(uDetail,wp*0.47).r; float d2=texture2D(uDetail,mat2(0.8,-0.6,0.6,0.8)*wp*0.137+0.31).r; float d3=texture2D(uDetail,mat2(0.28,0.96,-0.96,0.28)*wp*0.031).r;
          diffuseColor.rgb*=0.70+0.30*d1+0.22*d2+0.18*d3;
          float inP=step(-1.8,wp.x)*step(wp.x,106.8)*step(-1.8,wp.y)*step(wp.y,69.8);
          vec3 V=normalize(cameraPosition-vWP); vec2 vh=normalize(V.xz+vec2(1e-4)); float band=mod(floor(wp.x/5.25),2.0)*2.0-1.0;
          diffuseColor.rgb*=1.0+uSheen*band*(0.045+0.035*abs(vh.y)+0.03*vh.x)*(0.45+0.55*inP);
          vec2 q=(wp-vec2(52.5,34.0))/vec2(66.0,45.0); float r2=dot(q,q);
          float lobes=0.0; lobes+=exp(-dot(wp-vec2(18.0,10.0),wp-vec2(18.0,10.0))/1500.0); lobes+=exp(-dot(wp-vec2(87.0,10.0),wp-vec2(87.0,10.0))/1500.0); lobes+=exp(-dot(wp-vec2(18.0,58.0),wp-vec2(18.0,58.0))/1500.0); lobes+=exp(-dot(wp-vec2(87.0,58.0),wp-vec2(87.0,58.0))/1500.0);
          float pool=(1.06-0.42*smoothstep(0.35,1.35,r2))*(0.93+0.10*min(lobes,1.4));
          diffuseColor.rgb*=mix(1.0,pool,uPool); }`); };
    const pw=V18P.X1-V18P.X0, ph=V18P.Y1-V18P.Y0;
    const pitch=S.mesh=new T.Mesh(tr(new T.PlaneGeometry(pw,ph)),pm); pitch.rotation.x=-Math.PI/2; pitch.position.set((V18P.X0+V18P.X1)/2,0,(V18P.Y0+V18P.Y1)/2); pitch.receiveShadow=true; P.scene.add(pitch);
    if(P.ground){ P.ground.position.y=-0.03; }
    /* ----- crest decal ----- */
    const ctex=v18sCrestCanvas(P,st); const cm=tr(new T.MeshLambertMaterial({map:ctex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
    const cr=new T.Mesh(tr(new T.PlaneGeometry(14,14)),cm); cr.rotation.x=-Math.PI/2; cr.position.set(52.5,0.004,34); cr.receiveShadow=true; cr.renderOrder=1; P.scene.add(cr);
    /* ----- markings ----- */
    S.mu={uPx:{value:0.0006}};
    const mm=tr(new T.MeshLambertMaterial({color:'#f3f6ef',polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    mm.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,S.mu);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aSide; attribute vec3 aTan; attribute float aBase; uniform float uPx;')
        .replace('#include <begin_vertex>',`vec3 transformed=vec3(position);
        { vec4 wc=modelMatrix*vec4(position,1.0); vec3 tc=cameraPosition-wc.xyz; float dist=length(tc); vec3 vd=tc/dist; float fs=length(aSide-dot(aSide,vd)*vd);
          float hw=max(aBase,uPx*dist/max(fs,0.12)); transformed+=aSide*hw+aTan*hw; }`); };
    const marks=new T.Mesh(tr(v18sMarkGeo(T)),mm); marks.receiveShadow=true; marks.renderOrder=2; marks.frustumCulled=false; P.scene.add(marks);
    /* ----- goals ----- */
    const fb=v18sGB(T); v18sGoalFrame(T,fb); const frame=new T.Mesh(tr(fb.geo()),tr(new T.MeshLambertMaterial({vertexColors:true}))); frame.castShadow=true; P.scene.add(frame);
    S.nets=[0,105].map(gx=>{ const base=v18sNetBase(gx); const pos=new Float32Array(base.length); for(let i=0;i<base.length;i+=3){ pos[i]=base[i]; pos[i+1]=base[i+2]; pos[i+2]=base[i+1]; }
      const g=tr(new T.BufferGeometry()); const at=new T.BufferAttribute(pos,3); at.setUsage(T.DynamicDrawUsage); g.setAttribute('position',at); g.boundingSphere=new T.Sphere(new T.Vector3(gx,1.2,34),6);
      const m=new T.LineSegments(g,S.netMat||(S.netMat=tr(new T.LineBasicMaterial({color:'#f4f6f8',transparent:true,opacity:0.62})))); P.scene.add(m); return {gx,base,pos,at,dirty:false}; });
    /* ----- corner flags (cloth waved on the CPU: 4 x 12 vertices) ----- */
    { const n=4*12, pos=new Float32Array(n*3), nrm=new Float32Array(n*3), idx=[]; for(let f=0;f<4;f++) for(let i=0;i<5;i++){ const a=f*12+i*2; idx.push(a,a+1,a+3,a,a+3,a+2); }
      for(let i=0;i<n;i++) nrm[i*3+2]=1; const g=tr(new T.BufferGeometry()); const at=new T.BufferAttribute(pos,3); at.setUsage(T.DynamicDrawUsage); g.setAttribute('position',at); g.setAttribute('normal',new T.BufferAttribute(nrm,3)); g.setIndex(idx);
      g.boundingSphere=new T.Sphere(new T.Vector3(52.5,1,34),70);
      const fm=new T.Mesh(g,tr(new T.MeshLambertMaterial({color:(st.h&&st.h.c1)||'#d33',side:T.DoubleSide}))); fm.castShadow=false; P.scene.add(fm); S.flags={pos,at}; }
    /* ----- sky dome ----- */
    S.sky={top:{value:new T.Color()},hor:{value:new T.Color()},bot:{value:new T.Color()},stars:{value:0}};
    const skm=tr(new T.ShaderMaterial({uniforms:S.sky,side:T.BackSide,depthWrite:false,fog:false,
      vertexShader:'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:`uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform float stars; varying vec3 vD;
        float h3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){ float y=vD.y; vec3 c=y>0.0?mix(hor,top,pow(clamp(y/0.55,0.0,1.0),0.7)):mix(hor,bot,clamp(-y*6.0,0.0,1.0));
          if(stars>0.0&&y>0.06){ vec3 q=floor(vD*260.0); float s=h3(q); float tw=step(0.9965,s)*smoothstep(0.06,0.25,y); c+=vec3(0.9,0.93,1.0)*tw*stars*(0.35+0.65*h3(q+7.0)); }
          gl_FragColor=vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`}));
    const sky=new T.Mesh(tr(new T.SphereGeometry(700,32,16)),skm); sky.position.set(52.5,0,34); sky.renderOrder=-10; sky.frustumCulled=false; P.scene.add(sky); S.skyMesh=sky;
    /* ----- tree line and town silhouette on an arc behind the far side and the ends ----- */
    { const W=2048, Hc=160, cv=v18sCanvas(W,Hc), q=cv.getContext('2d'); const r=rngFrom(0x7ee5); q.fillStyle='#fff';
      let x=0; while(x<W){ const w=10+r()*34, h=Hc*(0.38+r()*0.34); q.beginPath(); q.ellipse(x,Hc-h+w*0.5,w*0.65,w*0.8,0,0,7); q.fill(); q.fillRect(x-w*0.6,Hc-h+w*0.5,w*1.2,h); x+=w*0.7; }
      for(let i=0;i<9;i++){ const bx=r()*W, bw=26+r()*60, bh=Hc*(0.18+r()*0.18); q.fillRect(bx,Hc-bh,bw,bh); q.beginPath(); q.moveTo(bx-4,Hc-bh); q.lineTo(bx+bw/2,Hc-bh-bw*0.35); q.lineTo(bx+bw+4,Hc-bh); q.fill(); }
      /* water tower and a steeple */
      { const wx=W*0.37; q.fillRect(wx-2,Hc*0.25,4,Hc*0.75); q.fillRect(wx-22,Hc*0.4,3,Hc*0.6); q.fillRect(wx+19,Hc*0.4,3,Hc*0.6); q.beginPath(); q.ellipse(wx,Hc*0.2,30,17,0,0,7); q.fill(); q.fillRect(wx-30,Hc*0.12,60,Hc*0.1); q.beginPath(); q.moveTo(wx-31,Hc*0.12); q.lineTo(wx,Hc*0.02); q.lineTo(wx+31,Hc*0.12); q.fill(); }
      { const sx=W*0.71; q.fillRect(sx-9,Hc*0.35,18,Hc*0.65); q.beginPath(); q.moveTo(sx-11,Hc*0.36); q.lineTo(sx,Hc*0.04); q.lineTo(sx+11,Hc*0.36); q.fill(); }
      S.treeCv=cv;
      const tt=tr(new T.CanvasTexture(cv)); tt.colorSpace=T.SRGBColorSpace; tt.wrapS=T.RepeatWrapping;
      const N=64, a0=-0.42, a1=Math.PI+0.42, RX=128, RZ=96, H=17; const pos=[], uv=[], idx=[];
      for(let i=0;i<=N;i++){ const a=a0+(a1-a0)*i/N, x=52.5+Math.cos(a)*RX, z=34-Math.sin(a)*RZ; const u=i/N*3; pos.push(x,-0.5,z, x,H,z); uv.push(u,0,u,1); if(i<N){ const k=i*2; idx.push(k,k+1,k+3,k,k+3,k+2); } }
      const g=tr(new T.BufferGeometry()); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeBoundingSphere();
      S.treeMat=tr(new T.MeshBasicMaterial({map:tt,color:'#3d5a4f',alphaTest:0.5,side:T.DoubleSide})); const tm=new T.Mesh(g,S.treeMat); tm.renderOrder=-5; P.scene.add(tm); }
    S.wk=null; },
  frame(P,st){ const S=P.pitch; if(!S) return; const T=P.T;
    if(S.wk!==P._wxKey) this.weather(P,st);
    /* markings: minimum half-width ~0.7 px whatever the zoom */
    const cam=P.camera; S.mu.uPx.value=2*Math.tan(cam.fov*Math.PI/360)/Math.max(150,st.H)*(P.tier.aa?0.72:0.95);
    /* nets: follow the 2-D spring (netPoint) while disturbed, then settle back once */
    for(const N of S.nets){ const D=st.netD&&st.netD[N.gx]; const on=D&&D.c&&Math.abs(D.a)>0.003; if(!on&&!N.dirty) continue; const b=N.base, p=N.pos;
      if(on){ const cx=D.c.x, cy=D.c.y, cz=D.c.z, nx=D.n[0], ny=D.n[1], nz=D.n[2], a=D.a; for(let i=0;i<b.length;i+=3){ const x=b[i], y=b[i+1], z=b[i+2]; const d2=(x-cx)*(x-cx)+(y-cy)*(y-cy)+(z-cz)*(z-cz); const w=Math.exp(-d2/0.5)*a; p[i]=x+nx*w; p[i+1]=z+nz*w; p[i+2]=y+ny*w; } N.dirty=true; }
      else { for(let i=0;i<b.length;i+=3){ p[i]=b[i]; p[i+1]=b[i+2]; p[i+2]=b[i+1]; } N.dirty=false; }
      N.at.needsUpdate=true; }
    /* corner flags */
    { const F=S.flags, p=F.pos, t=(st.now||0)/1000; let k=0; const corners=V18P.flagC||(V18P.flagC=[[0,0],[105,0],[0,68],[105,68]]);
      for(let f=0;f<4;f++){ const x=corners[f][0], y=corners[f][1]; for(let i=0;i<6;i++){ const u=i/5; const L=u*0.46; const wv=Math.sin(t*5.2-u*5+x*0.3+y)*0.07*u; const dx=Math.cos(0.5)*L, dy=Math.sin(0.5)*L*0.6+wv;
          p[k++]=x+dx; p[k++]=1.5-u*0.03; p[k++]=y+dy; p[k++]=x+dx; p[k++]=1.16+u*0.03; p[k++]=y+dy; } }
      F.at.needsUpdate=true; } },
  weather(P,st){ const S=P.pitch; S.wk=P._wxKey; const k=P.wxKind; const L=V18_WX[k]||V18_WX.clear; S.L=L;
    S.sky.top.value.set(L.sky[0]); S.sky.hor.value.set(L.sky[1]); S.sky.bot.value.set(L.sky[2]); S.sky.stars.value=L.stars; S.u.uPool.value=L.pool;
    S.treeMat.color.set(L.tree); if(P.ground&&P.ground.material&&P.ground.material.color) P.ground.material.color.set(L.gnd);
    P.scene.background=new P.T.Color(L.sky[1]);
    /* light tuning on top of the core's per-weather set-up */
    if(k==='night'){ P.sun.color.set('#fff2dc'); P.sun.intensity=2.7; P.hemi.color.set('#40527a'); P.hemi.groundColor.set('#13281a'); P.hemi.intensity=0.75; if(P.scene.fog){ P.scene.fog.color.set('#0a1224'); P.scene.fog.near=170; P.scene.fog.far=620; } }
    else if(k==='golden'){ P.sun.intensity=2.5; P.hemi.intensity=0.95; }
    else if(k==='clear'){ P.sun.intensity=2.6; }
    if(P.scene.fog&&k!=='night') P.scene.fog.color.set(L.sky[1]); },
  resize(P){},
  dispose(P){ P.pitch=null; } });
