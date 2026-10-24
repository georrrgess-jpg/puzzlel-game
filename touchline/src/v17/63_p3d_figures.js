/* ===================== v18 3-D FIGURES (ANIMATION_PLAN 3.3), P3D module order 30 =====================
   Players, keepers, referee, assistants (with flags) and any extra figure another module pushes to P.extra
   ({o, kit, isRef}: the dugout coaches, for instance) are drawn from the SAME pose solver as the 2-D painter:
   st.blendPose(p, st.poseOf(p,isRef)) once per figure per frame, then drawFigure's skeleton (feet/hands targets, the
   lean about the hips, ik3 with the same lengths and poles, hipU, lift, headTilt/headTurn, build B).
   One deliberate difference: everything above the hips is carried by hipU (the 2-D torso stays at standing height when
   the hips drop, which reads as a floating torso in 3-D). Feet are untouched, so planted feet stay planted.
   Whole-body rotations: P.rot about P.pivot is a ROLL about the body's forward axis (dive, get-up, airplane, the run's
   turn lean) or a PITCH about its lateral axis (fall, trip, backflip, flag celebration).
   Rendering is by PART: one InstancedMesh per part kind across all figures (~25 meshes + outlines), toon shading with
   P.gradientMap, an inverted-hull outline whose push is a constant ~1.2 CSS px on screen (v18.4: and pushed uOlZ = 3.5 cm back
   along the view ray, so seams where two parts of one body meet carry no line), kits from a per-kit canvas
   atlas (paintKitPattern on the shirt, sleeves, shorts, socks), faces from a per-look face atlas (eyes, brows, mouth,
   facial hair), shirt numbers from a number atlas on curved decals. Body units are the solver's; 1 unit = 0.92*hgt/70 m.
   Public helpers: v18FigDraw(P, st, o, kit, isRef) draws one extra figure this frame (same as pushing to P.extra);
   V18_REFKIT is the officials' kit. Globals are prefixed v18F / V18F. */

const V18_REFKIT={shirt:'#141414',shorts:'#141414',num:'#f5c518',socks:'#141414',trim:'#f5c518',dark:'#000',light:'#2a2a2a',pat:'plain',sleeve:'long',collar:'v',sockPat:'plain',shortsPat:'plain',numStyle:'solid',_ref:true};
const V18F_NR=16, V18F_AW=2048, V18F_RH=128;
/* kit atlas columns (px of a 2048-wide row): shirt body, short/upper sleeve, shorts, sock, long-sleeve forearm, misc */
const V18F_C={torso:[0,768],sleeve:[768,256],shorts:[1024,256],sock:[1280,256],fore:[1536,256],misc:[1792,256]};
const V18F_U=(col,u)=>(V18F_C[col][0]+u*V18F_C[col][1])/V18F_AW;
const V18F_TU=(1792+64)/V18F_AW, V18F_TV=0.75; /* a fully transparent texel: "use the instance colour" */
const V18F_HAIRS=['buzz','crop','fade','curly','afro','sideswept','spiky','mohawk','long','bun','braids','twists','locs','mullet'];

/* ---------- geometry helpers (body units, built once per painter) ---------- */
/* loft along +y: rings [y, rx, rz, cx, cz, u0, uw, v]; u around (0.5 = +z = front), x = rx*sin(th), z = cz+rz*cos(th) */
function v18FLoft(rings,N,sq){ const T=THREE; sq=sq||2; const nR=rings.length, pos=new Float32Array(nR*(N+1)*3), uv=new Float32Array(nR*(N+1)*2), idx=[];
  for(let i=0;i<nR;i++){ const r=rings[i]; const y=r[0], rx=r[1], rz=r[2], cx=r[3]||0, cz=r[4]||0, u0=r[5]==null?0:r[5], uw=r[6]==null?1:r[6], v=r[7]==null?i/(nR-1):r[7];
    for(let j=0;j<=N;j++){ const u=j/N, th=2*Math.PI*u-Math.PI; let s=Math.sin(th), c=Math.cos(th); if(sq!==2){ s=Math.sign(s)*Math.pow(Math.abs(s),2/sq); c=Math.sign(c)*Math.pow(Math.abs(c),2/sq); }
      const k=i*(N+1)+j; pos[k*3]=cx+rx*s; pos[k*3+1]=y; pos[k*3+2]=cz+rz*c; uv[k*2]=u0+u*uw; uv[k*2+1]=v; } }
  for(let i=0;i<nR-1;i++) for(let j=0;j<N;j++){ const a=i*(N+1)+j, b=a+1, c=a+N+1, d=c+1; idx.push(a,b,d,a,d,c); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('uv',new T.BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const n=g.attributes.normal.array;
  for(let i=0;i<nR;i++){ const a=i*(N+1), b=a+N; const x=n[a*3]+n[b*3], y=n[a*3+1]+n[b*3+1], z=n[a*3+2]+n[b*3+2], l=Math.hypot(x,y,z)||1; n[a*3]=n[b*3]=x/l; n[a*3+1]=n[b*3+1]=y/l; n[a*3+2]=n[b*3+2]=z/l;
    if(rings[i][1]<1e-5){ const sy=i===0?-1:1; for(let j=0;j<=N;j++){ const k=(a+j)*3; n[k]=0; n[k+1]=sy; n[k+2]=0; } } }
  return g; }
/* merge indexed/non-indexed geometries (position, normal, uv); an entry {g, uv:[u,v]} forces a uv */
function v18FMerge(list){ const T=THREE; let nv=0, ni=0; for(const e of list){ const g=e.g||e; nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; }
  const P=new Float32Array(nv*3), N=new Float32Array(nv*3), U=new Float32Array(nv*2), I=new Uint32Array(ni); let o=0, oi=0;
  for(const e of list){ const g=e.g||e; if(!g.attributes.normal) g.computeVertexNormals(); const p=g.attributes.position, n=g.attributes.normal, u=g.attributes.uv; const c=p.count;
    for(let k=0;k<c;k++){ P[(o+k)*3]=p.getX(k); P[(o+k)*3+1]=p.getY(k); P[(o+k)*3+2]=p.getZ(k); N[(o+k)*3]=n.getX(k); N[(o+k)*3+1]=n.getY(k); N[(o+k)*3+2]=n.getZ(k);
      if(e.uv){ U[(o+k)*2]=e.uv[0]; U[(o+k)*2+1]=e.uv[1]; } else if(u){ U[(o+k)*2]=u.getX(k); U[(o+k)*2+1]=u.getY(k); } }
    if(g.index){ for(let k=0;k<g.index.count;k++) I[oi++]=g.index.getX(k)+o; } else for(let k=0;k<c;k++) I[oi++]=k+o; o+=c; }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(P,3)); g.setAttribute('normal',new T.BufferAttribute(N,3)); g.setAttribute('uv',new T.BufferAttribute(U,2)); g.setIndex(new T.BufferAttribute(I,1)); return g; }
function v18FEll(rx,ry,rz,x,y,z,ws,hs,rotX){ const g=new THREE.SphereGeometry(1,ws||10,hs||7); g.scale(rx,ry,rz); if(rotX) g.rotateX(rotX); g.translate(x,y,z); return g; }
/* a capsule-ish strand from a to b (body units, head frame) */
function v18FStrand(a,b,r0,r1,N){ const T=THREE; const L=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])||1e-3;
  const g=v18FLoft([[0,0,0],[r0*0.4,r0*0.7,r0*0.7],[r0*1.2,r0,r0],[L*0.5,(r0+r1)/2,(r0+r1)/2],[L-r1,r1,r1],[L-r1*0.3,r1*0.7,r1*0.7],[L,0,0]],N||6);
  const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize(); const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d); g.applyQuaternion(q); g.translate(a[0],a[1],a[2]); return g; }

/* head: an ellipsoid with a narrower jaw; uv maps the front ~135 deg to the face cell, the rest to the cell's transparent edge */
const V18F_HEAD={rx:0.125,ry:0.148,rz:0.14};
function v18FHeadPt(lam,phi,out){ const H=V18F_HEAD; let x=Math.cos(phi)*Math.sin(lam), y=Math.sin(phi), z=Math.cos(phi)*Math.cos(lam);
  let rx=H.rx, rz=H.rz; if(y<0){ const t=-y; rx*=1-0.22*t*t; rz*=1-0.05*t; } if(z<0&&y>-0.3) rz*=1.04; /* occiput */
  out[0]=x*rx; out[1]=y*H.ry; out[2]=z*rz+(y<0&&z>0?0.012*(-y)*z:0); return out; }
function v18FHeadGeo(seg){ const T=THREE, nu=seg*2, nv=seg; const pos=[], uv=[], idx=[], q=[0,0,0];
  for(let i=0;i<=nv;i++){ const phi=-Math.PI/2+Math.PI*i/nv; for(let j=0;j<=nu;j++){ const lam=2*Math.PI*j/nu-Math.PI; v18FHeadPt(lam,phi,q); pos.push(q[0],q[1],q[2]);
    uv.push(Math.min(0.995,Math.max(0.005,0.5+lam/(0.75*Math.PI))), Math.min(0.995,Math.max(0.005,0.5+phi/(0.75*Math.PI)))); } }
  for(let i=0;i<nv;i++) for(let j=0;j<nu;j++){ const a=i*(nu+1)+j, b=a+1, c=a+nu+1, d=c+1; idx.push(a,b,d,a,d,c); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
  const n=g.attributes.normal.array; for(let i=0;i<=nv;i++){ const a=i*(nu+1), b=a+nu; for(let k=0;k<3;k++){ const m=(n[a*3+k]+n[b*3+k])/2; n[a*3+k]=n[b*3+k]=m; } }
  /* v18.4: the face takes one toon band (its normals lean toward forward), so no hard light/shadow edge runs across it up close */
  { const p=g.attributes.position.array; for(let k=0;k<n.length;k+=3){ const z=p[k+2]/V18F_HEAD.rz, y=p[k+1]/V18F_HEAD.ry; if(z<=0) continue; const w=0.62*Math.min(1,z*1.25)*Math.max(0,1-Math.max(0,y-0.35)*1.6);
    let x0=n[k]*(1-w), x1=n[k+1]*(1-w)+0.08*w, x2=n[k+2]*(1-w)+w; const l=Math.hypot(x0,x1,x2)||1; n[k]=x0/l; n[k+1]=x1/l; n[k+2]=x2/l; } }
  const sk=[0.004,0.004]; const s=seg>=10?1:0;
  const nose=v18FEll(0.015,0.031,0.017,0,-0.027,0.126,8+s*4,6+s*2,-0.3); const tip=v18FEll(0.017,0.012,0.013,0,-0.051,0.137,8+s*2,6+s);
  const ears=[-1,1].map(e=>{ const g2=v18FEll(0.014,0.036,0.026,e*0.122,-0.012,-0.004,8,6); return g2; });
  return v18FMerge([g,{g:nose,uv:sk},{g:tip,uv:sk},{g:ears[0],uv:sk},{g:ears[1],uv:sk}]); }

/* hair: a shell over the skull, thick where the style has hair and pulled deep inside the head elsewhere, plus strands/slabs */
function v18FHairGeo(style,seg){ const nu=seg*2+6, nv=seg+3; const pos=[], idx=[], q=[0,0,0]; const H=V18F_HEAD;
  const sm=(a,b,t)=>{ t=Math.min(1,Math.max(0,(t-a)/(b-a))); return t*t*(3-2*t); };
  const line=(al,f,s,b)=>al<0.6?f:al<1.6?f+(s-f)*(al-0.6):s+(b-s)*Math.min(1,(al-1.6)/1.2);
  const th=(lam,phi)=>{ const al=Math.abs(lam); const xs=Math.cos(phi)*Math.sin(lam); let hl=line(al,0.42,0.24,-0.78), t=0.02;
    switch(style){
      case 'buzz': t=0.006; hl=line(al,0.46,0.26,-0.7); break;
      case 'fade': t=0.006+0.03*sm(0.5,0.85,phi); break;
      case 'crop': t=0.018+0.012*Math.max(0,Math.sin(phi)); hl=line(al,0.36,0.24,-0.75); break;
      case 'curly': t=0.034+0.016*(0.5+0.5*Math.sin(lam*9)*Math.sin(phi*9)); hl=line(al,0.36,0.2,-0.8); break;
      case 'twists': t=0.036+0.024*Math.pow(0.5+0.5*Math.sin(lam*11)*Math.sin(phi*11+1),2); hl=line(al,0.36,0.18,-0.8); break;
      case 'afro': t=0.07+0.06*Math.max(0,Math.sin(phi)+0.25)+0.008*Math.sin(lam*13)*Math.sin(phi*13); hl=line(al,0.38,0.05,-0.62); break;
      case 'sideswept': t=0.022+0.012*Math.max(0,Math.sin(phi))+0.016*Math.max(0,-xs)*sm(0.1,0.6,phi); hl=line(al,lam<0?0.22:0.4,0.24,-0.75); break;
      case 'spiky': t=0.02+(phi>0.25?0.06*Math.pow(Math.max(0,Math.cos(lam*7)*Math.cos(phi*8)),2.5):0); hl=line(al,0.4,0.24,-0.75); break;
      case 'mohawk': if(Math.abs(xs)>0.24) return -1; t=0.012+0.07*sm(0.2,0.9,phi)*(1-Math.abs(xs)/0.24); hl=line(al,0.5,0.4,-0.6); break;
      case 'braids': t=0.012+0.012*Math.pow(Math.abs(Math.cos(xs*15)),3); hl=line(al,0.42,0.22,-0.8); break;
      case 'locs': t=0.026+0.01*Math.abs(Math.sin(lam*10)); hl=line(al,0.38,0.2,-0.8); break;
      case 'long': case 'mullet': t=0.022+0.01*Math.max(0,Math.sin(phi)); hl=line(al,0.36,0.18,-0.85); break;
      case 'bun': t=0.016; hl=line(al,0.42,0.22,-0.8); break;
    }
    return phi<hl?-1:t*(0.3+0.7*sm(hl,hl+0.28,phi)); };
  for(let i=0;i<=nv;i++){ const phi=-Math.PI/2+Math.PI*i/nv; for(let j=0;j<=nu;j++){ const lam=2*Math.PI*j/nu-Math.PI; v18FHeadPt(lam,phi,q);
    const nx=q[0]/(H.rx*H.rx), ny=q[1]/(H.ry*H.ry), nz=q[2]/(H.rz*H.rz), nl=Math.hypot(nx,ny,nz)||1; const t=th(lam,phi);
    if(t<0) pos.push(q[0]*0.7,q[1]*0.7,q[2]*0.7); else pos.push(q[0]+nx/nl*(t+0.004),q[1]+ny/nl*(t+0.004),q[2]+nz/nl*(t+0.004)); } }
  for(let i=0;i<nv;i++) for(let j=0;j<nu;j++){ const a=i*(nu+1)+j, b=a+1, c=a+nu+1, d=c+1; idx.push(a,b,d,a,d,c); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  const n=g.attributes.normal.array; for(let i=0;i<=nv;i++){ const a=i*(nu+1), b=a+nu; for(let k=0;k<3;k++){ const m=(n[a*3+k]+n[b*3+k])/2; n[a*3+k]=n[b*3+k]=m; } }
  const parts=[g];
  if(style==='long') parts.push(v18FLoft([[-0.36,0,0,0,-0.07],[-0.35,0.07,0.04,0,-0.075],[-0.3,0.13,0.06,0,-0.085],[-0.15,0.15,0.075,0,-0.09],[-0.02,0.15,0.09,0,-0.07],[0.04,0.13,0.08,0,-0.06],[0.06,0,0,0,-0.06]],14));
  if(style==='mullet') parts.push(v18FLoft([[-0.22,0,0,0,-0.09],[-0.21,0.06,0.03,0,-0.095],[-0.16,0.1,0.05,0,-0.1],[-0.05,0.12,0.07,0,-0.085],[0.03,0.11,0.07,0,-0.07],[0.05,0,0,0,-0.07]],12));
  if(style==='bun') parts.push(v18FEll(0.055,0.05,0.05,0,0.12,-0.1,10,8));
  if(style==='locs'){ for(let k=0;k<11;k++){ const a=Math.PI*0.42+k*Math.PI*0.116, sx=Math.sin(a), cz=Math.cos(a); parts.push(v18FStrand([sx*0.12,0.06,cz*0.13],[sx*0.16,-0.24-0.03*(k%3),cz*0.15-0.02],0.022,0.017,6)); } }
  if(style==='braids'){ for(let k=0;k<4;k++){ const x=-0.06+k*0.04; parts.push(v18FStrand([x,0.0,-0.13],[x*1.3,-0.2,-0.12],0.015,0.012,6)); } }
  if(style==='twists'){ for(let k=0;k<7;k++){ const a=-1.9+k*0.63; parts.push(v18FStrand([Math.sin(a)*0.11,0.1,Math.cos(a)*0.12],[Math.sin(a)*0.16,0.01,Math.cos(a)*0.16],0.02,0.016,5)); } }
  return parts.length>1?v18FMerge(parts):g; }

/* v18.4: a hemispherical cap of radius R centred on the joint at y (dir +1 caps the far end, -1 the near end), n rings,
   extra = [cx, cz, u0, uw, v] copied into each ring. Two limbs that meet at a joint with caps of the same radius centred on it
   form a ball joint: their union stays round at any bend (no cone-tipped knees or elbows, no gaps). */
function v18FCap(y,R,dir,n,extra){ const out=[]; const e=extra||[];
  for(let k=1;k<=n;k++){ const a=k/n*Math.PI/2, r=k===n?0:R*Math.cos(a); out.push([y+dir*R*Math.sin(a),r,r,e[0]||0,e[1]||0,e[2],e[3],e[4]]); }
  return dir<0?out.reverse():out; }
/* torso ring table (torso frame: origin at the hip joint centre, y along the spine): [y, rx, rz, cz] */
const V18F_TORSO=[[0.115,0,0,0],[0.12,0.222,0.148,0],[0.15,0.224,0.149,0],[0.22,0.214,0.142,0],[0.34,0.222,0.146,0],[0.46,0.24,0.156,0.008],[0.56,0.252,0.163,0.012],[0.64,0.254,0.155,0.006],[0.7,0.246,0.142,0],[0.75,0.222,0.126,0],[0.79,0.165,0.104,0],[0.82,0.085,0.07,0],[0.835,0.07,0.062,0],[0.84,0,0,0]];
function v18FTorsoAt(y){ const R=V18F_TORSO; for(let i=1;i<R.length;i++) if(y<=R[i][0]){ const a=R[i-1], b=R[i], t=(y-a[0])/(b[0]-a[0]||1); return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t]; } return [0.07,0.06,0]; }
function v18FPatch(th0,th1,y0,y1,flipU,nx,ny,off){ /* a decal patch on the torso surface (superellipse 2.5), uv 0..1 across the number cell */
  const pos=[], uv=[], idx=[]; const sq=2.5;
  for(let i=0;i<=ny;i++){ const y=y0+(y1-y0)*i/ny; const [rx,rz,cz]=v18FTorsoAt(y); for(let j=0;j<=nx;j++){ const th=th0+(th1-th0)*j/nx; let s=Math.sin(th), c=Math.cos(th); const sp=Math.sign(s)*Math.pow(Math.abs(s),2/sq), cp=Math.sign(c)*Math.pow(Math.abs(c),2/sq);
    let nX=s/rx, nZ=c/rz; const nl=Math.hypot(nX,nZ)||1; pos.push(rx*sp+nX/nl*off, y, cz+rz*cp+nZ/nl*off); uv.push(flipU?1-j/nx:j/nx, i/ny); } }
  for(let i=0;i<ny;i++) for(let j=0;j<nx;j++){ const a=i*(nx+1)+j, b=a+1, c=a+nx+1, d=c+1; idx.push(a,b,d,a,d,c); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals(); return g; }

/* detail 0..2 = the tier C/B/A sets (v18.3 segment counts plus the ball-joint caps); detail 3 = the tier A near set.
   limbs=true stops after the limb parts (legUpper, shin, boot, armUpper, longUpper, forearm, longFore): the near set needs no more */
function v18FBuildGeos(detail,limbs){ const d=Math.max(0,Math.min(3,detail|0)); const N=[7,9,12,16][d], Nt=[12,16,22,28][d], hs=[6,8,11,14][d], nc=[2,2,3,4][d];
  const sk=[0,0,V18F_TU,0,V18F_TV]; /* skin uv for cap rings on kit-mapped limbs */
  const S=(c,u)=>V18F_U(c,u), TU=V18F_TU, TV=V18F_TV; const G={};
  /* thigh with the shorts leg over its top half; the hem ring is doubled so the uv can jump from shorts to skin */
  const sw=V18F_C.shorts[1]/V18F_AW, s0=S('shorts',0);
  G.legUpper=v18FLoft([[-0.11,0,0,0,0,s0,sw,0.62],[-0.085,0.085,0.085,0,0,s0,sw,0.6],[-0.03,0.108,0.108,0,0,s0,sw,0.45],[0.05,0.112,0.112,0,0,s0,sw,0.3],[0.14,0.11,0.112,0,0.004,s0,sw,0.14],[0.193,0.107,0.109,0,0.004,s0,sw,0.03],[0.2,0.102,0.104,0,0.004,s0,sw,0.0],
    [0.2,0.102,0.104,0,0.004,TU,0,TV],[0.205,0.09,0.092,0,0.004,TU,0,TV],[0.25,0.087,0.09,0,0.008,TU,0,TV],[0.32,0.078,0.08,0,0.005,TU,0,TV],[0.385,0.067,0.067,0,0,TU,0,TV],[0.43,0.062,0.062,0,0,TU,0,TV],...v18FCap(0.43,0.062,1,nc,sk)],N);
  const kw=V18F_C.sock[1]/V18F_AW, k0=S('sock',0), sv=y=>Math.max(0,Math.min(1,1-(y+0.065)/0.535));
  G.shin=v18FLoft([...v18FCap(0,0.062,-1,nc),[0.0,0.062,0.062,0,0],[0.05,0.063,0.064,0,0.002],[0.07,0.066,0.067,0,0],[0.085,0.068,0.07,0,-0.002],[0.13,0.068,0.076,0,-0.008],[0.2,0.062,0.068,0,-0.002],[0.27,0.054,0.058,0,0.002],[0.34,0.045,0.048,0,0.002],[0.4,0.04,0.041,0,0],[0.43,0.038,0.038,0,0],...v18FCap(0.43,0.038,1,nc)].map(r=>[r[0],r[1],r[2],r[3],r[4],k0,kw,sv(r[0])]),N);
  /* boot: lofted heel -> toe along +y (bottom = +z), turned so the toe points along +z and the sole faces down */
  const mb0=(1920)/V18F_AW, mbw=128/V18F_AW, bv=y=>0.5+0.49*(y+0.085)/0.313;
  const boot=v18FLoft([[-0.085,0,0,0,0.03],[-0.079,0.026,0.033,0,0.026],[-0.068,0.038,0.05,0,0.016],[-0.04,0.045,0.058,0,0.01],[0,0.047,0.06,0,0.007],[0.05,0.049,0.05,0,0.017],[0.1,0.051,0.04,0,0.025],[0.15,0.048,0.032,0,0.03],[0.185,0.041,0.026,0,0.035],[0.207,0.03,0.019,0,0.039],[0.219,0.017,0.012,0,0.042],[0.225,0,0,0,0.043]].map(r=>[r[0],r[1],r[2],r[3],r[4],mb0,mbw,bv(r[0])]),Math.max(10,N),2.6);
  boot.rotateX(Math.PI/2); G.boot=boot;
  const vw=V18F_C.sleeve[1]/V18F_AW, v0=S('sleeve',0), slv=y=>Math.max(0,Math.min(1,(0.15-y)/0.225));
  G.armUpper=v18FLoft([...v18FCap(0,0.078,-1,nc,[0,0,v0,vw,1]),[0.0,0.078,0.078,0,0,v0,vw,slv(0)],[0.03,0.079,0.078,0,0,v0,vw,slv(0.03)],[0.09,0.077,0.076,0,0,v0,vw,slv(0.09)],[0.14,0.074,0.073,0,0,v0,vw,0.05],[0.15,0.071,0.071,0,0,v0,vw,0],
    [0.15,0.071,0.071,0,0,TU,0,TV],[0.155,0.058,0.058,0,0.002,TU,0,TV],[0.2,0.054,0.056,0,0.005,TU,0,TV],[0.26,0.047,0.048,0,0.002,TU,0,TV],[0.3,0.045,0.045,0,0,TU,0,TV],...v18FCap(0.3,0.045,1,nc,sk)],N);
  const lv=y=>0.3+0.7*Math.max(0,Math.min(1,(0.345-y)/0.42));
  G.longUpper=v18FLoft([...v18FCap(0,0.084,-1,nc),[0,0.084,0.084],[0.03,0.086,0.085],[0.1,0.078,0.078],[0.2,0.066,0.067],[0.27,0.058,0.058],[0.3,0.056,0.056],...v18FCap(0.3,0.056,1,nc)].map(r=>[r[0],r[1],r[2],0,0,v0,vw,lv(r[0])]),N);
  G.forearm=v18FLoft([...v18FCap(0,0.045,-1,nc),[0,0.045,0.045],[0.06,0.049,0.05,0,0.003],[0.14,0.041,0.043],[0.21,0.032,0.034],[0.25,0.029,0.03],[0.27,0.022,0.022],[0.28,0,0]],N);
  const fw=V18F_C.fore[1]/V18F_AW, f0=S('fore',0), fv=y=>Math.max(0,Math.min(1,(0.255-y)/0.285));
  G.longFore=v18FLoft([...v18FCap(0,0.056,-1,nc),[0,0.056,0.056],[0.06,0.055,0.056],[0.14,0.047,0.048],[0.2,0.04,0.041],[0.23,0.038,0.039],[0.255,0.037,0.038],[0.265,0.022,0.022],[0.27,0,0]].map(r=>[r[0],r[1],r[2],0,0,f0,fw,fv(r[0])]),N);
  if(limbs) return G;
  const hand=v18FLoft([[0.245,0,0],[0.255,0.024,0.03],[0.28,0.021,0.042],[0.32,0.018,0.044],[0.35,0.016,0.036],[0.365,0.012,0.02],[0.372,0,0]],Math.max(8,N-2));
  const thumb=v18FStrand([0,0.27,0.03],[0.012,0.33,0.05],0.012,0.01,6); G.hand=v18FMerge([hand,thumb]);
  const gq0=1792/V18F_AW, gqw=128/V18F_AW, gv=y=>0.02+0.46*Math.max(0,Math.min(1,(y-0.285)/0.12));
  G.glove=v18FLoft([[0.235,0,0,0,0,TU,0,TV],[0.245,0.042,0.044,0,0,TU,0,TV],[0.27,0.046,0.047,0,0,TU,0,TV],[0.284,0.046,0.047,0,0,TU,0,TV],[0.285,0.034,0.058,0,0,gq0,gqw,gv(0.285)],[0.33,0.032,0.064,0,0,gq0,gqw,gv(0.33)],[0.37,0.028,0.058,0,0,gq0,gqw,gv(0.37)],[0.395,0.02,0.04,0,0,gq0,gqw,gv(0.395)],[0.405,0,0,0,0,gq0,gqw,gv(0.405)]],Math.max(8,N-2));
  G.tape=v18FLoft([[0.205,0.034,0.035],[0.245,0.031,0.032]],Math.max(8,N-2));
  const tw=V18F_C.torso[1]/V18F_AW, tv=y=>Math.max(0,Math.min(1,(y-0.12)/0.715));
  G.torso=v18FLoft(V18F_TORSO.map(r=>[r[0],r[1],r[2],0,r[3],0,tw,tv(r[0])]),Nt,2.5);
  const shv=y=>Math.max(0,Math.min(1,(y+0.1)/0.355));
  G.shorts=v18FLoft([[-0.1,0,0],[-0.085,0.16,0.115],[-0.05,0.212,0.145],[0.02,0.228,0.152],[0.12,0.22,0.148],[0.15,0.212,0.126],[0.19,0.2,0.11],[0.23,0.19,0.1],[0.235,0,0]].map(r=>[r[0],r[1],r[2],0,0,s0,sw,shv(r[0])]),Nt,2.4);
  G.neck=v18FLoft([[-0.03,0,0],[-0.01,0.064,0.062],[0.05,0.058,0.056,0,0.004],[0.15,0.054,0.054,0,0.008],[0.21,0.05,0.05,0,0.008],[0.23,0,0]],Math.max(8,N-2));
  G.head=v18FHeadGeo(hs);
  G.band=v18FLoft([[0.03,0.126,0.142],[0.072,0.122,0.138]],Nt);
  G.hair={}; for(const h of V18F_HAIRS) G.hair[h]=v18FHairGeo(h,hs);
  /* back number (large) and chest number (small, his left breast) on one decal */
  G.num=v18FMerge([v18FPatch(Math.PI-0.56,Math.PI+0.56,0.34,0.63,false,10,6,0.006),v18FPatch(0.26,0.68,0.56,0.68,false,6,3,0.006)]);
  const heart=new THREE.Shape(); heart.moveTo(0,-0.09); heart.bezierCurveTo(-0.14,0.0,-0.07,0.11,0,0.04); heart.bezierCurveTo(0.07,0.11,0.14,0.0,0,-0.09);
  G.heart=new THREE.ExtrudeGeometry(heart,{depth:0.025,bevelEnabled:true,bevelThickness:0.01,bevelSize:0.01,bevelSegments:2,curveSegments:8}); G.heart.translate(0,0,-0.0125);
  G.card=new THREE.BoxGeometry(0.08,0.115,0.005);
  G.pole=new THREE.CylinderGeometry(0.011,0.011,1,6,1); G.pole.translate(0,0.5,0);
  G.cloth=new THREE.PlaneGeometry(1,1,6,3); G.cloth.translate(0.5,-0.5,0); { const p=G.cloth.attributes.position; for(let k=0;k<p.count;k++) p.setZ(k,Math.sin(p.getX(k)*5.5)*0.05*p.getX(k)); G.cloth.computeVertexNormals(); }
  G.blob=new THREE.PlaneGeometry(1,1); G.blob.rotateX(-Math.PI/2);
  G.ring=new THREE.RingGeometry(0.64,0.72,48); G.ring.rotateX(-Math.PI/2);
  return G; }

/* ---------- texture atlases ---------- */
function v18FCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function v18FKitSig(kit,isRef){ return isRef?'REF':[kit.shirt,kit.pc,kit.trim,kit.shorts,kit.socks,kit.num,kit.pat,kit.sleeve,kit.sleeveC,kit.collar,kit.sockPat,kit.shortsPat,kit.numStyle].join('|'); }
function v18FPaintKit(g,r,kit,isRef){ const y0=r*V18F_RH, H=V18F_RH; const trim=isRef?'#f5c518':(kit.trim||kit.num||'#ffffff'); const sh=kit.shirt||'#888', slc=isRef?sh:(kit.sleeveC||sh);
  const vY=v=>y0+H*(0.96-0.92*v); g.save(); g.globalCompositeOperation='source-over'; g.clearRect(0,y0,V18F_AW,H);
  const box=(x,w)=>{ g.beginPath(); g.rect(x,y0,w,H); g.clip(); };
  /* shirt body: u around the torso (0.5 = chest centre), v hem -> collar; front a = 2-4u, back a = 4u-4 / 4u */
  const TW=V18F_C.torso[1]; g.save(); box(0,TW); g.fillStyle=sh; g.fillRect(0,y0,TW,H);
  if(!isRef&&kit.pat&&kit.pat!=='plain'){ const pv=h=>vY(h);
    g.save(); g.beginPath(); g.rect(TW*0.25,y0,TW*0.5,H); g.clip(); paintKitPattern(g,kit,(a,h)=>[TW*(0.5-a*0.25),pv(h)],1); g.restore();
    g.save(); g.beginPath(); g.rect(0,y0,TW*0.25,H); g.rect(TW*0.75,y0,TW*0.25,H); g.clip(); for(const off of [0,TW]) paintKitPattern(g,kit,(a,h)=>[off+TW*a*0.25,pv(h)],1); g.restore(); }
  if(isRef){ g.fillStyle=trim; for(const u of [0.25,0.75]) g.fillRect(TW*u-6,vY(0.78),12,H*0.78); }
  if(!isRef&&kit.sleeve==='raglan'){ g.fillStyle=slc; for(const u of [0.25,0.75]){ g.beginPath(); g.moveTo(TW*(u-0.13),vY(1.01)); g.lineTo(TW*(u+0.13),vY(1.01)); g.lineTo(TW*(u+0.035),vY(0.66)); g.lineTo(TW*(u-0.035),vY(0.66)); g.closePath(); g.fill(); } }
  /* hem and side seams */
  g.fillStyle='rgba(0,0,0,.22)'; g.fillRect(0,vY(0.03),TW,H*0.03); g.fillStyle='rgba(0,0,0,.08)'; for(const u of [0.25,0.75]) g.fillRect(TW*u-1,vY(0.62),2,H*0.6);
  /* collar */
  const cl=isRef?'v':(kit.collar||'v'); const cx=TW*0.5;
  if(cl==='crew'||cl==='polo'){ g.fillStyle=trim; g.fillRect(0,vY(1),TW,H*0.05); if(cl==='polo'){ g.beginPath(); g.moveTo(cx-34,vY(0.96)); g.lineTo(cx-4,vY(0.86)); g.lineTo(cx-20,vY(0.83)); g.closePath(); g.moveTo(cx+34,vY(0.96)); g.lineTo(cx+4,vY(0.86)); g.lineTo(cx+20,vY(0.83)); g.closePath(); g.fill(); g.fillRect(cx-1.5,vY(0.95),3,H*0.12); g.fillStyle=mix(trim,'#000000',0.35); for(const v of [0.9,0.86]){ g.fillRect(cx-2,vY(v)-1,4,3); } } }
  else if(cl==='wrap'){ g.fillStyle=trim; g.fillRect(0,vY(1),TW,H*0.035); g.strokeStyle=trim; g.lineWidth=7; g.beginPath(); g.moveTo(cx-30,vY(0.99)); g.lineTo(cx+10,vY(0.87)); g.moveTo(cx+30,vY(0.99)); g.lineTo(cx-10,vY(0.87)); g.stroke(); }
  else { g.fillStyle=trim; g.fillRect(0,vY(1),TW,H*0.03); g.beginPath(); g.moveTo(cx-36,vY(1.005)); g.lineTo(cx+36,vY(1.005)); g.lineTo(cx,vY(0.855)); g.closePath(); g.fill();
    g.globalCompositeOperation='destination-out'; g.beginPath(); g.moveTo(cx-30,vY(1.01)); g.lineTo(cx+30,vY(1.01)); g.lineTo(cx,vY(0.875)); g.closePath(); g.fill(); g.globalCompositeOperation='source-over'; }
  /* crest on his right breast (u ~ 0.57); pixels are ~1.5x wider than tall in body space, so draw it squashed */
  const ky=H/256; if(!isRef){ const ux=TW*0.428, vy=vY(0.7); g.fillStyle=trim; g.beginPath(); g.moveTo(ux-17,vy-15*ky); g.lineTo(ux+17,vy-15*ky); g.lineTo(ux+17,vy+2*ky); g.quadraticCurveTo(ux+14,vy+14*ky,ux,vy+20*ky); g.quadraticCurveTo(ux-14,vy+14*ky,ux-17,vy+2*ky); g.closePath(); g.fill();
    g.fillStyle=sh; g.beginPath(); g.moveTo(ux-11,vy-10*ky); g.lineTo(ux+11,vy-10*ky); g.lineTo(ux+11,vy+1*ky); g.quadraticCurveTo(ux+9,vy+9*ky,ux,vy+13*ky); g.quadraticCurveTo(ux-9,vy+9*ky,ux-11,vy+1*ky); g.closePath(); g.fill(); g.fillStyle=trim; g.fillRect(ux-2,vy-6*ky,4,12*ky); }
  else { const ux=TW*0.428, vy=vY(0.7); g.fillStyle=trim; g.fillRect(ux-10,vy-9*ky,20,18*ky); }
  g.restore();
  /* sleeve: v = 1 at the shoulder, 0 at a short sleeve's hem (long upper sleeves use v 0.3..1) */
  const SX=V18F_C.sleeve[0], SW=V18F_C.sleeve[1]; g.save(); box(SX,SW); g.fillStyle=slc; g.fillRect(SX,y0,SW,H);
  if(isRef||kit.sleeve==='cuffs'){ g.fillStyle=trim; g.fillRect(SX,vY(0.15),SW,H*0.15); }
  if(!isRef&&kit.sleeve==='stripe'){ g.fillStyle=trim; for(const u of [0.25,0.75]) for(const d of [-12,8]) g.fillRect(SX+SW*u+d,y0,4,H); }
  g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(SX,vY(0.025),SW,H*0.025); g.restore();
  /* long-sleeve forearm: v = 1 at the elbow, 0 at the wrist; cuff in the trim (not on keeper kits) */
  const FX=V18F_C.fore[0], FW=V18F_C.fore[1]; g.save(); box(FX,FW); g.fillStyle=slc; g.fillRect(FX,y0,FW,H); if(!kit._gk){ g.fillStyle=trim; g.fillRect(FX,vY(0.13),FW,H*0.09); } g.fillStyle='rgba(0,0,0,.2)'; g.fillRect(FX,vY(0.03),FW,H*0.03); g.restore();
  /* shorts: u around, v 0 hem/crotch -> 1 waistband; side stripes at u 0.25/0.75 */
  const HX=V18F_C.shorts[0], HW=V18F_C.shorts[1]; g.save(); box(HX,HW); g.fillStyle=kit.shorts||'#222'; g.fillRect(HX,y0,HW,H);
  g.fillStyle='rgba(0,0,0,.2)'; g.fillRect(HX,vY(1),HW,H*0.09); g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(HX,vY(0.035),HW,H*0.035);
  const sp=kit.shortsPat; if(!isRef&&sp&&sp!=='plain'){ g.fillStyle=trim; const w=sp==='panel'?22:7; for(const u of [0.25,0.75]) g.fillRect(HX+HW*u-w/2,y0,w,H); } g.restore();
  /* sock: v 0 ankle -> 1 knee; skin (transparent) above v 0.76, fold line, patterns in the trim */
  const KX=V18F_C.sock[0], KW=V18F_C.sock[1]; g.save(); box(KX,KW); g.fillStyle=kit.socks||'#eee'; g.fillRect(KX,vY(0.76),KW,H*0.76);
  const st0=v=>vY(0.76*(1-v)); const band=(t0,t1)=>{ g.fillRect(KX,st0(t0),KW,st0(t1)-st0(t0)); };
  g.fillStyle=isRef?'#3a3a3a':trim; const kp=isRef?'top':(kit.sockPat||'plain');
  if(kp==='top') band(0.02,0.2); else if(kp==='hoops'){ band(0.06,0.16); band(0.3,0.4); band(0.54,0.64); } else if(kp==='stripes'){ band(0.1,0.14); band(0.2,0.24); }
  g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(KX,vY(0.765),KW,H*0.025); g.fillStyle='rgba(255,255,255,.1)'; g.fillRect(KX+KW*0.4,vY(0.6),KW*0.2,H*0.35); g.restore();
  /* misc: transparent quadrant, boot (sole, midsole line, side flash, laces), glove */
  const MX=V18F_C.misc[0]; g.save(); box(MX,256);
  const q=H/2, BX=MX+128, BY=y0; g.fillStyle='rgba(20,20,20,.78)'; g.fillRect(BX+128*0.34,BY,128*0.32,q); g.fillStyle='rgba(255,255,255,.75)'; g.fillRect(BX+128*0.32,BY,5,q); g.fillRect(BX+128*0.68-5,BY,5,q);
  g.fillStyle='rgba(255,255,255,.55)'; for(const u of [0.17,0.83]){ g.beginPath(); g.moveTo(BX+128*u-6,BY+q*0.25); g.lineTo(BX+128*u+6,BY+q*0.3); g.lineTo(BX+128*u+3,BY+q*0.72); g.lineTo(BX+128*u-3,BY+q*0.68); g.closePath(); g.fill(); }
  g.fillStyle='rgba(255,255,255,.6)'; for(let k=0;k<5;k++){ const y=BY+q*(0.3+k*0.07); g.fillRect(BX,y,9,2); g.fillRect(BX+119,y,9,2); }
  const GX=MX, GY=y0+q; g.fillStyle='#f4f4f4'; g.fillRect(GX,GY,128,q); g.fillStyle='rgba(0,0,0,.14)'; for(const u of [0.36,0.44,0.56,0.64]) g.fillRect(GX+128*u,GY,2,q*0.5); g.fillStyle=mix(sh,'#ffffff',0.2); g.fillRect(GX+128*0.4,GY+q*0.55,128*0.2,q*0.4);
  g.restore(); g.restore(); }
function v18FPaintNum(g,i,num,kit){ const cs=128, x0=(i%8)*cs, y0=Math.floor(i/8)*cs; g.clearRect(x0,y0,cs,cs); const txt=String(num); if(!txt) return;
  const px=txt.length>1?84:100; g.save(); g.translate(x0+cs/2,y0+cs/2+4); if(txt.length>1) g.scale(0.82,1); g.font=`800 ${px}px "JetBrains Mono",monospace`; g.textAlign='center'; g.textBaseline='middle';
  const st=kit.numStyle; if(st==='shadow'){ g.fillStyle='rgba(0,0,0,.5)'; g.fillText(txt,5,5); }
  if(st==='outline'||(KIT_COVER[kit.pat]||0)>=0.3){ g.strokeStyle=st==='outline'&&kit.trim&&colorDist(kit.trim,kit.num)>60?kit.trim:contrastOn(kit.num); g.lineWidth=10; g.lineJoin='round'; g.strokeText(txt,0,0); }
  g.fillStyle=kit.num||'#fff'; g.fillText(txt,0,0); g.restore(); }
/* face cell (256 px): u = 0.5 + lam/(0.75 pi) (lam > 0 toward his right = viewer's left), v = 0.5 + phi/(0.75 pi) */
function v18FPaintFace(g,i,L,skin,hair,open){ const cs=256, x0=(i%8)*cs, y0=Math.floor(i/8)*cs; g.clearRect(x0,y0,cs,cs); g.save(); g.beginPath(); g.rect(x0,y0,cs,cs); g.clip();
  const K=0.75*Math.PI; const X=lam=>x0+cs*(0.5+lam/K), Y=phi=>y0+cs*(1-(0.5+phi/K));
  const skinD=mix(skin,'#3a1a10',0.32), lip=mix(skin,'#a0303a',0.35), brow=mix(hair,'#000000',0.15);
  const eyes=L.eyes||'round', ec=(LOOK.eyeCol&&LOOK.eyeCol[L.eyeCol])||'#4a3020';
  const ew={round:15,almond:16,narrow:16,wide:17,sleepy:15}[eyes]||15, eh={round:11,almond:9,narrow:7,wide:10,sleepy:8}[eyes]||10;
  /* soft cheek shading and a jaw shadow line help the toon head read as a face */
  g.fillStyle=hexA(skinD,0.12); g.beginPath(); g.ellipse(X(0),Y(-0.62),70,22,0,0,7); g.fill();
  for(const e of [-1,1]){ const cx=X(e*0.36), cy=Y(0.035);
    g.fillStyle='#fbfbf8'; g.beginPath(); g.ellipse(cx,cy,ew,eh,0,0,7); g.fill();
    g.fillStyle=ec; g.beginPath(); g.arc(cx+e*-1,cy+1,Math.min(eh+1,9),0,7); g.fill(); g.fillStyle='#0d0d0d'; g.beginPath(); g.arc(cx+e*-1,cy+1,4.2,0,7); g.fill();
    g.fillStyle='#ffffff'; g.beginPath(); g.arc(cx+e*-1+2.5,cy-2,1.8,0,7); g.fill();
    g.strokeStyle=mix(skin,'#1a0d08',0.7); g.lineWidth=eyes==='sleepy'?4:2.6; g.beginPath(); g.ellipse(cx,cy,ew,eh,0,Math.PI*1.08,Math.PI*1.92); g.stroke();
    if(eyes==='sleepy'){ g.fillStyle=skin; g.beginPath(); g.ellipse(cx,cy-eh*0.6,ew+1,eh*0.55,0,0,7); g.fill(); }
    /* brows */
    const bt={soft:4,thin:2.6,thick:6.5,arched:4,straight:4.5}[L.brows]||4; const by=Y(0.2); g.strokeStyle=brow; g.lineWidth=bt; g.lineCap='round'; g.beginPath();
    if(L.brows==='arched'){ g.moveTo(cx-e*-14,by+3); g.quadraticCurveTo(cx,by-7,cx+e*-1*-14,by+2); } else if(L.brows==='straight'){ g.moveTo(cx-14,by); g.lineTo(cx+14,by); } else { g.moveTo(cx+e*14,by+3); g.quadraticCurveTo(cx,by-4,cx-e*14,by+1); }
    g.stroke(); }
  /* nose shadow and nostrils (the nose itself is geometry) */
  g.fillStyle=hexA(skinD,0.22); g.beginPath(); g.ellipse(X(0),Y(-0.3),7,2.5,0,0,7); g.fill();
  if(L.freckles){ g.fillStyle=hexA(mix(skin,'#7a3b1e',0.5),0.6); for(let k=0;k<14;k++){ const a=k*2.4, r=8+(k*7)%18; g.beginPath(); g.arc(X(0)+Math.cos(a)*r*2.2,Y(-0.12)+Math.sin(a)*r*0.5,1.6,0,7); g.fill(); } }
  /* facial hair */
  const fh=L.facial; const fc=mix(hair,skin,0.25);
  if(fh==='stubble'){ g.fillStyle=hexA(fc,0.34); g.beginPath(); g.ellipse(X(0),Y(-0.56),62,30,0,0,Math.PI); g.fill(); g.beginPath(); g.ellipse(X(0),Y(-0.36),22,6,0,0,7); g.fill(); }
  if(fh==='goatee'||fh==='chinstrap'){ g.fillStyle=hexA(fc,0.92); if(fh==='goatee'){ g.beginPath(); g.ellipse(X(0),Y(-0.6),18,15,0,0,7); g.fill(); } else { g.lineWidth=9; g.strokeStyle=hexA(fc,0.9); g.beginPath(); g.ellipse(X(0),Y(-0.45),74,34,0,0.15,Math.PI-0.15); g.stroke(); } }
  if(fh==='mustache'||fh==='goatee'){ g.fillStyle=hexA(fc,0.92); g.beginPath(); g.ellipse(X(0),Y(-0.36),20,5,0,0,7); g.fill(); }
  /* mouth */
  const my=Y(-0.44), mx=X(0); const m=L.mouth||'neutral';
  if(open){ g.fillStyle='#3a1012'; g.beginPath(); g.ellipse(mx,my+2,17,13,0,0,7); g.fill(); g.fillStyle='#f4f1ea'; g.fillRect(mx-12,my-9,24,5); g.fillStyle='#c4505a'; g.beginPath(); g.ellipse(mx,my+9,9,4,0,0,7); g.fill(); g.strokeStyle=lip; g.lineWidth=2.5; g.beginPath(); g.ellipse(mx,my+2,17,13,0,0,7); g.stroke(); }
  else { g.strokeStyle=mix(lip,'#3a1010',0.35); g.lineCap='round'; g.lineWidth=5.5; g.beginPath();
    if(m==='smile'){ g.moveTo(mx-15,my-3); g.quadraticCurveTo(mx,my+9,mx+15,my-3); }
    else if(m==='grin'){ g.stroke(); g.fillStyle='#4a1414'; g.beginPath(); g.moveTo(mx-16,my-3); g.quadraticCurveTo(mx,my+13,mx+16,my-3); g.closePath(); g.fill(); g.fillStyle='#f4f1ea'; g.fillRect(mx-11,my-3,22,4); g.beginPath(); }
    else if(m==='smirk'){ g.moveTo(mx-13,my+1); g.quadraticCurveTo(mx+4,my+3,mx+15,my-5); }
    else if(m==='serious'){ g.moveTo(mx-12,my+1); g.lineTo(mx+12,my+1); }
    else { g.moveTo(mx-13,my); g.quadraticCurveTo(mx,my+3,mx+13,my); }
    g.stroke(); g.fillStyle=hexA(skinD,0.35); g.beginPath(); g.ellipse(mx,my+12,9,3,0,0,7); g.fill(); }
  g.restore(); }

/* ---------- materials ---------- */
function v18FKitMat(P,tex,mode,U){ /* mode 'kit': atlas row per instance (aRow), 'cell': 8x8 cell per instance (aCell); both mix the instance colour under alpha */
  const m=P.track(new P.T.MeshToonMaterial({color:'#ffffff',map:tex,gradientMap:P.gradientMap}));
  m.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float '+(mode==='kit'?'aRow':'aCell')+';')
      .replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n'+(mode==='kit'?`vMapUv.y=(aRow+0.04+vMapUv.y*0.92)/${V18F_NR}.0;`:'vMapUv=vec2(mod(aCell,8.0)+0.01+vMapUv.x*0.98, 7.0-floor(aCell/8.0)+0.01+vMapUv.y*0.98)/8.0;')+'\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nvec4 kT=texture2D(map,vMapUv);\n#if defined(USE_COLOR)||defined(USE_INSTANCING_COLOR)\ndiffuseColor.rgb=diffuseColor.rgb*vColor.rgb*(1.0-kT.a)+kT.rgb;\n#else\ndiffuseColor.rgb=diffuseColor.rgb*(1.0-kT.a)+kT.rgb;\n#endif\n#endif').replace('#include <color_fragment>','').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*0.14;'); };
  m.customProgramCacheKey=()=>'v18f-'+mode; return m; }
/* plain instance-coloured toon (skin, hair, boots' props) with the same slight lift of the shadow band */
function v18FPlainMat(P){ const m=P.track(new P.T.MeshToonMaterial({color:'#ffffff',gradientMap:P.gradientMap})); m.onBeforeCompile=sh=>{ sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*0.14;'); }; m.customProgramCacheKey=()=>'v18f-plain'; return m; }
function v18FOutlineMat(P,U){ const m=P.track(new P.T.MeshBasicMaterial({color:'#15110f',side:P.T.BackSide}));
  m.onBeforeCompile=sh=>{ sh.uniforms.uOlPx=U.uOlPx; sh.uniforms.uPxK=U.uPxK; sh.uniforms.uFar=U.uFar; sh.uniforms.uOlZ=U.uOlZ;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uOlPx; uniform float uPxK; uniform float uFar; uniform float uOlZ;').replace('#include <project_vertex>',
`vec4 mvPosition=vec4(transformed,1.0); vec3 oN=normal;
#ifdef USE_INSTANCING
mvPosition=instanceMatrix*mvPosition; oN=mat3(instanceMatrix)*oN;
#endif
mvPosition=modelViewMatrix*mvPosition; vec3 vN=normalize(normalMatrix*oN); float dz=max(0.1,-mvPosition.z);
mvPosition.xyz+=vN*(uOlPx*uPxK*dz); mvPosition.xyz*=1.0+uOlZ/max(0.1,-mvPosition.z);
gl_Position=projectionMatrix*mvPosition; if(dz>uFar) gl_Position=vec4(2.0,2.0,2.0,1.0);`); };
  m.customProgramCacheKey=()=>'v18f-outline'; return m; }

/* ---------- init ---------- */
function v18FigInit(P){ const T=P.T, tier=P.tier||{detail:2,shadow:0}; const F=P._fig={parts:[],byName:{},col:new Map(),kitRow:new WeakMap(),kitSig:new Map(),rowUse:new Array(V18F_NR).fill(-1),face:new WeakMap(),faceSig:new Map(),faceUse:new Array(32).fill(-1),num:new Map(),numUse:new Array(64).fill(-1),frame:0,dirty:{kit:false,face:false,num:false}};
  const U=F.U={uOlPx:{value:1.2},uPxK:{value:0.001},uFar:{value:1e9},uOlZ:{value:0.035}};
  const G=F.G=v18FBuildGeos(tier.detail==null?2:tier.detail); for(const k in G){ if(k==='hair') for(const h in G.hair) P.track(G.hair[h]); else P.track(G[k]); }
  /* atlases */
  F.kitCv=v18FCanvas(V18F_AW,V18F_NR*V18F_RH); F.kitG=F.kitCv.getContext('2d'); F.kitTex=P.track(new T.CanvasTexture(F.kitCv));
  F.faceCv=v18FCanvas(2048,2048); F.faceG=F.faceCv.getContext('2d'); F.faceTex=P.track(new T.CanvasTexture(F.faceCv));
  F.numCv=v18FCanvas(1024,1024); F.numG=F.numCv.getContext('2d'); F.numTex=P.track(new T.CanvasTexture(F.numCv));
  const aniso=Math.min(4,P.renderer.capabilities.getMaxAnisotropy?P.renderer.capabilities.getMaxAnisotropy():1);
  for(const t of [F.kitTex,F.faceTex,F.numTex]){ t.colorSpace=T.SRGBColorSpace; t.premultiplyAlpha=true; t.anisotropy=aniso; }
  F.kitTex.generateMipmaps=false; F.kitTex.minFilter=T.LinearFilter; /* rows are packed: mipmaps would bleed one kit into the next at a distance */
  F.mKit=v18FKitMat(P,F.kitTex,'kit',U); F.mFace=v18FKitMat(P,F.faceTex,'cell',U);
  F.mNum=P.track(new T.MeshToonMaterial({color:'#ffffff',map:F.numTex,gradientMap:P.gradientMap,alphaTest:0.5,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  F.mNum.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aCell;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv=vec2(mod(aCell,8.0)+0.02+vMapUv.x*0.96, 7.0-floor(aCell/8.0)+0.02+vMapUv.y*0.96)/8.0;\n#endif'); sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*0.14;'); }; F.mNum.customProgramCacheKey=()=>'v18f-num';
  F.mPlain=v18FPlainMat(P); F.mOl=v18FOutlineMat(P,U);
  const flagCv=v18FCanvas(64,64), fg=flagCv.getContext('2d'); for(let i=0;i<4;i++) for(let j=0;j<4;j++){ fg.fillStyle=(i+j)%2?'#f6c514':'#e8322b'; fg.fillRect(i*16,j*16,16,16); } const flagTex=P.track(new T.CanvasTexture(flagCv)); flagTex.colorSpace=T.SRGBColorSpace;
  F.mFlag=P.track(new T.MeshToonMaterial({map:flagTex,gradientMap:P.gradientMap,side:T.DoubleSide}));
  const bc=v18FCanvas(64,64), bg=bc.getContext('2d'); const gr=bg.createRadialGradient(32,32,2,32,32,31); gr.addColorStop(0,'rgba(0,0,0,0.62)'); gr.addColorStop(0.55,'rgba(0,0,0,0.38)'); gr.addColorStop(1,'rgba(0,0,0,0)'); bg.fillStyle=gr; bg.fillRect(0,0,64,64);
  const blobTex=P.track(new T.CanvasTexture(bc)); F.mBlob=P.track(new T.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
  const cast=(tier.shadow||0)>0, MAXF=48;
  const part=(name,geo,mat,o)=>{ o=o||{}; const max=(o.per||1)*MAXF; const m=new T.InstancedMesh(geo,mat,max); m.name='v18f-'+name; m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled=false; m.count=0;
    m.instanceColor=new T.InstancedBufferAttribute(new Float32Array(max*3).fill(1),3); m.instanceColor.setUsage(T.DynamicDrawUsage); m.castShadow=cast&&o.cast!==false; m.receiveShadow=false;
    let ax=null; if(o.aux){ const a=new T.InstancedBufferAttribute(new Float32Array(max),1); a.setUsage(T.DynamicDrawUsage); geo.setAttribute(o.aux,a); ax=a; }
    let ol=null; if(o.outline!==false){ ol=new T.InstancedMesh(geo,F.mOl,max); ol.instanceMatrix=m.instanceMatrix; ol.frustumCulled=false; ol.count=0; ol.castShadow=false; ol.name=m.name+'-ol'; P.scene.add(ol); }
    if(o.order!=null) m.renderOrder=o.order; P.scene.add(m);
    const pt={name,m,ol,max,n:0,im:m.instanceMatrix.array,ic:m.instanceColor.array,ax:ax?ax.array:null,axA:ax}; F.parts.push(pt); F.byName[name]=pt; return pt; };
  F.p={ legUpper:part('legUpper',G.legUpper,F.mKit,{per:2,aux:'aRow'}), shorts:part('shorts',G.shorts,F.mKit,{aux:'aRow'}), shin:part('shin',G.shin,F.mKit,{per:2,aux:'aRow'}), boot:part('boot',G.boot,F.mKit,{per:2,aux:'aRow',cast:false}),
    armUpper:part('armUpper',G.armUpper,F.mKit,{per:2,aux:'aRow'}), longUpper:part('longUpper',G.longUpper,F.mKit,{per:2,aux:'aRow'}), forearm:part('forearm',G.forearm,F.mPlain,{per:2,cast:false}), longFore:part('longFore',G.longFore,F.mKit,{per:2,aux:'aRow'}),
    hand:part('hand',G.hand,F.mPlain,{per:2,cast:false}), glove:part('glove',G.glove,F.mKit,{per:2,aux:'aRow',cast:false}), tape:part('tape',G.tape,F.mPlain,{per:2,outline:false,cast:false}),
    torso:part('torso',G.torso,F.mKit,{aux:'aRow'}), neck:part('neck',G.neck,F.mPlain,{outline:false,cast:false}), head:part('head',G.head,F.mFace,{aux:'aCell'}), band:part('band',G.band,F.mPlain,{cast:false}),
    num:part('num',G.num,F.mNum,{aux:'aCell',outline:false,cast:false}), heart:part('heart',G.heart,P.toon('#ff4d6d'),{per:0.25}), card:part('card',G.card,F.mPlain,{per:0.25,outline:false}),
    pole:part('pole',G.pole,P.toon('#d9d9d9'),{per:0.25,outline:false}), cloth:part('cloth',G.cloth,F.mFlag,{per:0.25,outline:false}),
    blob:part('blob',G.blob,F.mBlob,{outline:false,cast:false,order:-1}) };
  F.hair={}; for(const h of V18F_HAIRS) F.hair[h]=part('hair-'+h,G.hair[h],F.mPlain,{});
  /* v18.4 near LOD (tier A only): figures taller than about V18F_NEARPX on screen (the sideline camera, close-ups, previews)
     draw their six limb parts from a rounder set built one detail level up, where the ball joints show; torso, head, hair,
     hands, boots and neck stay on the base set, so a frame with near and far figures pays 12 extra calls at most and
     wide shots cost what they did. Same instanced design: one InstancedMesh per part kind and set, an empty mesh is not drawn. */
  F.pn=null; F.nearOf=new WeakMap();
  if((tier.detail==null?2:tier.detail)>=2){ const GN=F.GN=v18FBuildGeos(3,true); for(const k in GN) P.track(GN[k]);
    const nk=(n,o)=>part(n+'~n',GN[n],o.m,o); F.pn=Object.assign({},F.p,{ legUpper:nk('legUpper',{m:F.mKit,per:2,aux:'aRow'}), shin:nk('shin',{m:F.mKit,per:2,aux:'aRow'}),
      armUpper:nk('armUpper',{m:F.mKit,per:2,aux:'aRow'}), longUpper:nk('longUpper',{m:F.mKit,per:2,aux:'aRow'}), forearm:nk('forearm',{m:F.mPlain,per:2,cast:false}), longFore:nk('longFore',{m:F.mKit,per:2,aux:'aRow'}) }); }
  F.ring=new T.Mesh(G.ring,P.track(new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}))); F.ring.visible=false; F.ring.renderOrder=-1; P.scene.add(F.ring);
  F.frustum=new T.Frustum(); F.pm=new T.Matrix4(); F.sph=new T.Sphere(new T.Vector3(),6);
  F.s=new Float64Array(64*3); /* scratch for world points */ F.v=new Float64Array(96); /* scratch for world dirs */ F.ik=new Float64Array(6); F.tmp=new Float64Array(3);
  F.kitG.clearRect(0,0,V18F_AW,V18F_NR*V18F_RH); }

/* ---------- caches ---------- */
function v18FCol(F,hex){ let c=F.col.get(hex); if(!c){ const k=new THREE.Color(hex||'#888888'); c=new Float32Array([k.r,k.g,k.b]); F.col.set(hex,c); } return c; }
function v18FKitRow(F,kit,isRef,gk){ let r=isRef?F.refRow:F.kitRow.get(kit); if(r!=null&&F.rowUse[r]>=0&&F.rowKit[r]===(isRef?'REF':kit)){ F.rowUse[r]=F.frame; return r; }
  const sig=v18FKitSig(kit,isRef)+(gk?'|gk':''); F.rowKit=F.rowKit||[]; r=F.kitSig.get(sig);
  if(r==null){ let best=0; for(let i=0;i<V18F_NR;i++){ if(F.rowUse[i]<0){ best=i; break; } if(F.rowUse[i]<F.rowUse[best]) best=i; }
    for(const [k,v] of F.kitSig) if(v===best) F.kitSig.delete(k); r=best; F.kitSig.set(sig,r); v18FPaintKit(F.kitG,r,Object.assign({},kit,{_gk:gk}),isRef); F.dirty.kit=true; }
  F.rowUse[r]=F.frame; F.rowKit[r]=isRef?'REF':kit; if(isRef) F.refRow=r; else F.kitRow.set(kit,r); return r; }
function v18FFaceCell(F,L,skin,hair){ const key=L; let c=F.face.get(key); const sig=skin+hair; if(c!=null&&F.faceUse[c>>1]>=0&&F.faceOwn[c>>1]===key&&F.faceSk[c>>1]===sig){ F.faceUse[c>>1]=F.frame; return c; }
  F.faceOwn=F.faceOwn||[]; F.faceSk=F.faceSk||[]; let best=0; for(let i=0;i<32;i++){ if(F.faceUse[i]<0){ best=i; break; } if(F.faceUse[i]<F.faceUse[best]) best=i; }
  v18FPaintFace(F.faceG,best*2,L,skin,hair,false); v18FPaintFace(F.faceG,best*2+1,L,skin,hair,true); F.dirty.face=true; F.faceUse[best]=F.frame; F.faceOwn[best]=key; F.faceSk[best]=sig; F.face.set(key,best*2); return best*2; }
function v18FNumCell(F,row,num,kit){ const k=row*1000+(+num||0); let c=F.num.get(k); if(c!=null&&F.numKey[c]===k){ F.numUse[c]=F.frame; return c; }
  F.numKey=F.numKey||[]; let best=0; for(let i=0;i<64;i++){ if(F.numUse[i]<0){ best=i; break; } if(F.numUse[i]<F.numUse[best]) best=i; }
  v18FPaintNum(F.numG,best,num,kit); F.dirty.num=true; F.numUse[best]=F.frame; F.numKey[best]=k; F.num.set(k,best); return best; }

/* ---------- per-instance writes ---------- */
/* columns of the instance matrix: X = ex*sx, Y = ey*sy, Z = ez*sz, origin o (all arrays/offsets into scratch buffers) */
function v18FPut(pt,A,o,B,ex,ey,ez,sx,sy,sz,col,aux){ const i=pt.n; if(i>=pt.max) return; pt.n++; const m=pt.im, k=i*16;
  m[k]=B[ex]*sx; m[k+1]=B[ex+1]*sx; m[k+2]=B[ex+2]*sx; m[k+3]=0; m[k+4]=B[ey]*sy; m[k+5]=B[ey+1]*sy; m[k+6]=B[ey+2]*sy; m[k+7]=0;
  m[k+8]=B[ez]*sz; m[k+9]=B[ez+1]*sz; m[k+10]=B[ez+2]*sz; m[k+11]=0; m[k+12]=A[o]; m[k+13]=A[o+1]; m[k+14]=A[o+2]; m[k+15]=1;
  const c=pt.ic, j=i*3; c[j]=col[0]; c[j+1]=col[1]; c[j+2]=col[2]; if(pt.ax) pt.ax[i]=aux||0; }
/* the elbow pole for one arm in body (f,u,l); 71_polish.js replaces it (v18.2). Returns a shared array. */
const V18_AP=[0,0,0];
function v18ArmPole(a0,a1,a2,t0,t1,t2,sd,Q,p){ V18_AP[0]=-0.7; V18_AP[1]=-0.5; V18_AP[2]=sd*0.6; return V18_AP; }
/* allocation-free copy of ik3 (same math): writes joint to out[0..2], clamped target to out[3..5] */
function v18FIk(R0,R1,R2,T0,T1,T2,a,b,p0,p1,p2,out){ let D0=T0-R0, D1=T1-R1, D2=T2-R2; let d=Math.hypot(D0,D1,D2); const mx=(a+b)*0.999; if(d>mx){ const k=mx/d; T0=R0+D0*k; T1=R1+D1*k; T2=R2+D2*k; D0=T0-R0; D1=T1-R1; D2=T2-R2; d=mx; }
  d=Math.max(d,Math.abs(a-b)+1e-3); const n0=D0/d, n1=D1/d, n2=D2/d; const al=(a*a+d*d-b*b)/(2*d); const h=Math.sqrt(Math.max(0,a*a-al*al));
  const pd=p0*n0+p1*n1+p2*n2; let q0=p0-n0*pd, q1=p1-n1*pd, q2=p2-n2*pd; let ql=Math.hypot(q0,q1,q2); if(ql<1e-4){ q0=n1; q1=-n0; q2=0; ql=Math.hypot(q0,q1)||1; }
  q0/=ql; q1/=ql; q2/=ql; out[0]=R0+n0*al+q0*h; out[1]=R1+n1*al+q1*h; out[2]=R2+n2*al+q2*h; out[3]=T0; out[4]=T1; out[5]=T2; }

/* ---------- one figure ---------- */
const V18F_B={lean:.9,average:1,stocky:1.14};
const V18F_NEARPX=150; /* on-screen figure height (CSS px) around which the near LOD limbs switch in: enter above +15, leave below -15 */
function v18FigDraw(P,st,p,kit,isRef){ const F=P._fig; if(!F||!p||!isFinite(p.x)||!isFinite(p.y)) return false;
  /* frustum test before solving (the 2-D painter also skips off-screen figures) */
  F.sph.center.set(p.x,0.95,p.y); if(!F.frustum.intersectsSphere(F.sph)) return false;
  const gk=!!p.gk&&!isRef; kit=kit||(isRef?V18_REFKIT:{shirt:'#888888',shorts:'#333333',socks:'#888888',num:'#ffffff'});
  let Q; try{ Q=st.blendPose(p,st.poseOf(p,isRef)); }catch(e){ return false; } if(!Q||!Q.feet||!Q.hands||!Q.feet[0]||!Q.feet[1]||!Q.hands[0]||!Q.hands[1]) return false;
  const L=p.look||(window.V18F_REFLOOK||(window.V18F_REFLOOK=defaultLook('ref',12))); const B=isRef?1:(V18F_B[L.build]||1); const S=0.92*(p.hgt||70)/70;
  const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw; const cY=Math.cos(yaw), sY=Math.sin(yaw);
  const lean=Q.lean||0, cl=Math.cos(lean), sl=Math.sin(lean), hipU=Q.hipU, lift=Q.lift||0, tilt=Q.headTilt||0, hturn=Q.headTurn||0;
  if(!isFinite(hipU+lean+lift+tilt+hturn+(Q.rot||0)+(Q.pivot||0))) return false;
  /* whole-body rotation: roll about forward, or pitch about lateral */
  const rot=Q.rot||0, act=Q.act; let ra=0, pa=0;
  if(rot){ const ct=p.celebType; if(act==='fall'||act==='trip'||(act==='celeb'&&(ct==='backflip'||ct==='flag'))) pa=rot*(cY>=0?1:-1); else if(act==='loco') ra=rot*((p.vy||0)>=0?1:-1); else ra=rot; }
  if(Q.rollB||Q.pitchB){ ra=Q.rollB||0; pa=ra?0:(Q.pitchB||0); }
  const cr=Math.cos(ra), sr=Math.sin(ra), cp=Math.cos(pa), sp=Math.sin(pa), pv=lift+(Q.pivot||0); const X0=p.x, Y0=p.y; const W=F.s, D=F.v;
  /* body (f,u,l) -> world point / direction */
  const bw=(f,u,l,o)=>{ u+=lift; if(ra||pa){ let a=f, b=u-pv, c=l; if(ra){ const c2=c*cr-b*sr; b=c*sr+b*cr; c=c2; } else { const a2=a*cp+b*sp; b=-a*sp+b*cp; a=a2; } f=a; u=b+pv; l=c; }
    W[o]=X0+(f*cY-l*sY)*S; W[o+1]=u*S; W[o+2]=Y0+(f*sY+l*cY)*S; };
  const bd=(f,u,l,o)=>{ if(ra||pa){ let a=f, b=u, c=l; if(ra){ const c2=c*cr-b*sr; b=c*sr+b*cr; c=c2; } else { const a2=a*cp+b*sp; b=-a*sp+b*cp; a=a2; } f=a; u=b; l=c; }
    D[o]=f*cY-l*sY; D[o+1]=u; D[o+2]=f*sY+l*cY; };
  /* the upper body rides on the hips (see the header) and leans about them */
  const dU=hipU-0.8; const T3=F.tmp; const up2=(f,u,l)=>{ const du=u-0.8; if(du<=0){ T3[0]=f; T3[1]=hipU+du; T3[2]=l; } else { T3[0]=f*cl+du*sl; T3[1]=hipU+du*cl-f*sl; T3[2]=l; } return T3; };
  /* directions: 0 Fb, 3 Ub, 6 Lb, 9 Rb(-L), 12 Ft, 15 Ut, 18 Fh, 21 Uh, 24 Rh, 27 Ff0, 30 Uf0, 33 Rf0, 36 Ff1, 39 Uf1, 42 Rf1 */
  bd(1,0,0,0); bd(0,1,0,3); bd(0,0,1,6); D[9]=-D[6]; D[10]=-D[7]; D[11]=-D[8]; bd(cl,-sl,0,12); bd(sl,cl,0,15);
  { const ch=Math.cos(hturn), shh=Math.sin(hturn), ct=Math.cos(tilt), stt=Math.sin(tilt); /* head: turn toward +l, then nod */
    const fh0=cl*ch, fh1=-sl*ch, fh2=shh; const f0=fh0*ct-sl*stt, f1=fh1*ct-cl*stt, f2=fh2*ct; const u0=sl*ct+fh0*stt, u1=cl*ct+fh1*stt, u2=fh2*stt;
    bd(f0,f1,f2,18); bd(u0,u1,u2,21); const rx=D[22]*D[20]-D[23]*D[19], ry=D[23]*D[18]-D[21]*D[20], rz=D[21]*D[19]-D[22]*D[18]; const rl=Math.hypot(rx,ry,rz)||1; D[24]=rx/rl; D[25]=ry/rl; D[26]=rz/rl; }
  /* skeleton -> world. W slots: 0 hip0 3 knee0 6 ank0 9 hip1 12 knee1 15 ank1 18 sh0 21 el0 24 hand0 27 sh1 30 el1 33 hand1 36 pelvis 39 neck 42 headC 45 tmp */
  const IK=F.ik; const ankU=[0,0];
  for(let i=0;i<2;i++){ const sd=i?1:-1; const ft=Q.feet[i]; const hl=sd*0.09*B; const lp=v186LegPole(ft.f,ft.u+0.06,sd); v18FIk(0,hipU,hl,ft.f,ft.u+0.06,ft.l,0.43,0.43,lp[0],lp[1],lp[2],IK); ankU[i]=IK[4];
    bw(0,hipU,hl,i*9); bw(IK[0],IK[1],IK[2],i*9+3); bw(IK[3],IK[4],IK[5],i*9+6); }
  for(let i=0;i<2;i++){ const sd=i?1:-1; const s0=up2(0,1.5,sd*0.21*B); const a0=s0[0], a1=s0[1], a2=s0[2]; const hd=Q.hands[i]; const t=up2(hd.f,hd.u,hd.l); const t1=Math.max(0.06,t[1]);
    const ap=v18ArmPole(a0,a1,a2,t[0],t1,t[2],sd,Q,p); v18FIk(a0,a1,a2,t[0],t1,t[2],0.3,0.29,ap[0],ap[1],ap[2],IK); bw(a0,a1,a2,18+i*9); bw(IK[0],IK[1],IK[2],21+i*9); bw(IK[3],IK[4],IK[5],24+i*9); }
  bw(0,hipU,0,36); { const n=up2(0,1.57,0); bw(n[0],n[1],n[2],39); } { const h=up2(0.02+tilt*0.05,1.83-Math.abs(tilt)*0.02,0); bw(h[0],h[1],h[2],42); }
  for(let k=0;k<45;k++) if(!isFinite(W[k])) return false;
  /* level of detail from the on-screen height */
  const dx=W[42]-P.camera.position.x, dy=W[43]-P.camera.position.y, dz=W[44]-P.camera.position.z; const dist=Math.hypot(dx,dy,dz); const px=1.9/Math.max(1e-4,dist*F.U.uPxK.value);
  const fine=px>34, mid=px>18; let near=false; if(F.pn&&p&&typeof p==='object'){ const was=F.nearOf.get(p)===true; near=px>(was?V18F_NEARPX-15:V18F_NEARPX+15); if(near!==was) F.nearOf.set(p,near); }
  /* colours */
  const skinH=isRef?'#c68a5c':(LOOK.skin[L.skin]||LOOK.skin[3]), hairH=isRef?'#2b1a10':(LOOK.hairCol[L.hairCol]||'#111111'), bootH=isRef?'#111111':(LOOK.boots[L.boots]||'#111111');
  const skin=v18FCol(F,skinH), hair=v18FCol(F,hairH), boot=v18FCol(F,bootH); const row=v18FKitRow(F,kit,isRef,gk), aRow=V18F_NR-1-row;
  const pp=near?F.pn:F.p; const SB=S*B; const longSl=L.sleeves==='long'||isRef||gk||kit.sleeve==='long';
  /* limb frame: ey along a->b, ez = L x ey (front), blended toward body forward when the limb points along L */
  const limb=(a,b,pt,col,aux,sx,sy,sz,arm)=>{ let e0=W[b]-W[a], e1=W[b+1]-W[a+1], e2=W[b+2]-W[a+2]; const el=Math.hypot(e0,e1,e2)||1e-6; e0/=el; e1/=el; e2/=el;
    let z0=D[7]*e2-D[8]*e1, z1=D[8]*e0-D[6]*e2, z2=D[6]*e1-D[7]*e0; let zl=Math.hypot(z0,z1,z2); if(zl<0.35){ const w=(0.35-zl)*3; z0+=D[0]*w; z1+=D[1]*w; z2+=D[2]*w; }
    const pd=z0*e0+z1*e1+z2*e2; z0-=e0*pd; z1-=e1*pd; z2-=e2*pd; zl=Math.hypot(z0,z1,z2)||1; z0/=zl; z1/=zl; z2/=zl;
    D[45]=e1*z2-e2*z1; D[46]=e2*z0-e0*z2; D[47]=e0*z1-e1*z0;
    const k=48; D[k]=e0; D[k+1]=e1; D[k+2]=e2; D[k+3]=z0; D[k+4]=z1; D[k+5]=z2;
    v18FPut(pt,W,a,D,45,k,k+3,sx,sy,sz,col,aux); };
  /* legs */
  for(let i=0;i<2;i++){ const o=i*9; limb(o,o+3,pp.legUpper,skin,aRow,SB,S,SB); limb(o+3,o+6,pp.shin,skin,aRow,SB,S,SB);
    /* boot: flat when planted, toe dips as the foot leaves the ground (as the 2-D boot does) */
    const a=Q.bootT&&Q.bootT[i]!=null?Q.bootT[i]:0.5*Math.min(1,Math.max(0,(ankU[i]-0.12)*2)), sd=i?1:-1, spl=sd*0.1; const ca=Math.cos(a), sa=Math.sin(a);
    const fb=27+i*9; bd(ca*Math.cos(spl),-sa,ca*Math.sin(spl),fb); bd(sa,ca,0,fb+3); /* Ff, Uf */
    let x0=D[fb+4]*D[fb+2]-D[fb+5]*D[fb+1], x1=D[fb+5]*D[fb]-D[fb+3]*D[fb+2], x2=D[fb+3]*D[fb+1]-D[fb+4]*D[fb]; const xl=Math.hypot(x0,x1,x2)||1; D[fb+6]=x0/xl; D[fb+7]=x1/xl; D[fb+8]=x2/xl;
    v18FPut(pp.boot,W,o+6,D,fb+6,fb+3,fb,S,S,S,boot,aRow); }
  /* pelvis/shorts and torso */
  v18FPut(pp.shorts,W,36,D,9,3,0,SB,S,SB,skin,aRow);
  v18FPut(pp.torso,W,36,D,9,15,12,SB,S,SB,skin,aRow);
  if(!isRef&&p.num!=null&&p.num!==''&&mid) v18FPut(pp.num,W,36,D,9,15,12,SB,S,SB,skin,v18FNumCell(F,row,p.num,kit));
  /* arms */
  for(let i=0;i<2;i++){ const o=18+i*9; if(longSl){ limb(o,o+3,pp.longUpper,skin,aRow,SB,S,SB); limb(o+3,o+6,pp.longFore,skin,aRow,SB,S,SB); } else { limb(o,o+3,pp.armUpper,skin,aRow,SB,S,SB); limb(o+3,o+6,pp.forearm,skin,0,SB,S,SB); }
    if(gk) limb(o+3,o+6,pp.glove,v18FCol(F,kit.shirt||'#888888'),aRow,S,S,S); else { limb(o+3,o+6,pp.hand,skin,0,S,S,S); if(L.tape&&!isRef&&fine&&!longSl) limb(o+3,o+6,pp.tape,v18FCol(F,'#f2f2f2'),0,SB,S,SB); } }
  /* neck, head, hair, headband */
  { let e0=W[42]-W[39], e1=W[43]-W[40], e2=W[44]-W[41]; const el=Math.hypot(e0,e1,e2)||1e-6; e0/=el; e1/=el; e2/=el; let z0=D[12], z1=D[13], z2=D[14]; const pd=z0*e0+z1*e1+z2*e2; z0-=e0*pd; z1-=e1*pd; z2-=e2*pd; const zl=Math.hypot(z0,z1,z2)||1; z0/=zl; z1/=zl; z2/=zl;
    D[48]=e0; D[49]=e1; D[50]=e2; D[51]=z0; D[52]=z1; D[53]=z2; D[45]=e1*z2-e2*z1; D[46]=e2*z0-e0*z2; D[47]=e0*z1-e1*z0; v18FPut(pp.neck,W,39,D,45,48,51,SB,el/0.26,SB,skin,0); }
  const fs={round:[1.05,0.98],square:[1.04,1],long:[0.96,1.05],heart:[1.0,1.0],oval:[1,1]}[L.face]||[1,1];
  const open=!!(Q.mouth&&p.celeb); const cell=v18FFaceCell(F,L,skinH,hairH)+(open?1:0);
  v18FPut(pp.head,W,42,D,24,21,18,S*fs[0],S*fs[1],S,skin,cell);
  const hs=L.hair, HS=F.hair; const hp=HS[hs==='bald'?null:(HS[hs]?hs:'crop')]; if(hp) v18FPut(hp,W,42,D,24,21,18,S*fs[0],S*fs[1],S,hair,0);
  if(!isRef&&LOOK.band[L.band]&&mid) v18FPut(pp.band,W,42,D,24,21,18,S*fs[0],S*fs[1],S,v18FCol(F,LOOK.band[L.band]),0);
  /* props: heart between the hands, referee's card, assistant's flag */
  if(Q.prop==='heart'){ W[45]=(W[24]+W[33])/2+D[15]*0.03*S; W[46]=(W[25]+W[34])/2+D[16]*0.03*S; W[47]=(W[26]+W[35])/2+D[17]*0.03*S; v18FPut(pp.heart,W,45,D,9,15,12,S*1.1,S*1.1,S*1.1,v18FCol(F,'#ffffff'),0); }
  if(isRef&&p.card&&st.now-p.card.t<1600){ W[45]=W[33]+D[15]*0.1*S; W[46]=W[34]+D[16]*0.1*S; W[47]=W[35]+D[17]*0.1*S; v18FPut(pp.card,W,45,D,9,15,12,S*1.15,S*1.15,S*1.15,v18FCol(F,p.card.c||'#f5c518'),0); }
  if(p.ar) v18FFlag(P,st,p);
  /* contact shadow under every figure (shrinks as he leaves the ground) */
  { const sh=Math.max(0.35,1-lift/1.4), spread=Math.abs(Q.feet[1].f-Q.feet[0].f); W[45]=X0+0.04; W[46]=0.02; W[47]=Y0+0.03; const r=(0.95+spread*0.35)*S*sh;
    D[54]=1; D[55]=0; D[56]=0; D[57]=0; D[58]=1; D[59]=0; D[60]=0; D[61]=0; D[62]=1; v18FPut(pp.blob,W,45,D,54,57,60,r*1.1,1,r,v18FCol(F,'#ffffff'),0); }
  return true; }
function v18FFlag(P,st,a){ const F=P._fig, W=F.s, D=F.v; const up=a.flag==='up', pt=a.flag==='point', px=pt?(a.pointDir||1):0; const hx=W[33], hy=W[34], hz=W[35];
  /* stage metres; three (x, y=height, z) */
  let tx,ty,tz; if(up){ tx=hx; ty=hy+0.6; tz=hz; } else if(pt){ tx=hx+px*0.46; ty=hy+0.22; tz=hz; } else { tx=hx+0.05; ty=Math.max(0.12,hy-0.52); tz=hz; }
  let e0=tx-hx, e1=ty-hy, e2=tz-hz; const len=Math.hypot(e0,e1,e2)||1e-3; e0/=len; e1/=len; e2/=len; D[63]=e0; D[64]=e1; D[65]=e2; D[66]=0; D[67]=0; D[68]=1; D[69]=e1; D[70]=-e0; D[71]=0; const xl=Math.hypot(D[69],D[70])||1; D[69]/=xl; D[70]/=xl;
  v18FPut(F.p.pole,W,33,D,69,63,66,1,len,1,v18FCol(F,'#ffffff'),0);
  const wv=Math.sin(st.now/120+(a.seed||0))*0.06, fx=up?(a.att===0?-1:1):pt?px:1; const Wd=up||pt?0.44:0.12, Hh=up||pt?0.32:0.4;
  W[45]=tx; W[46]=up||pt?ty:ty+Hh+0.05; W[47]=tz; D[72]=fx; D[73]=0; D[74]=0; D[75]=0; D[76]=1; D[77]=wv; D[78]=0; D[79]=-wv*fx; D[80]=fx;
  v18FPut(F.p.cloth,W,45,D,72,75,78,Wd,Hh,1,v18FCol(F,'#ffffff'),0); }

/* ---------- frame ---------- */
function v18FigFrame(P,st){ const F=P._fig; if(!F) return; F.frame++;
  for(const pt of F.parts) pt.n=0;
  const cam=P.camera; cam.updateMatrixWorld(); F.pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse); F.frustum.setFromProjectionMatrix(F.pm);
  const H=Math.max(1,P.H||st.H||600); F.U.uPxK.value=2*Math.tan(cam.fov*Math.PI/360)/H/(cam.zoom||1); const det=P.tier?P.tier.detail:2;
  F.U.uFar.value=det>0?1e9:1.9/(40*F.U.uPxK.value);
  const kits=st.kits||{team:[null,null],gk:[null,null]};
  if(st.players) for(const p of st.players.values()){ if(p.off&&!p.ov&&p.y<-3) continue; const kit=p.gk?(kits.gk&&kits.gk[p.side]):(kits.team&&kits.team[p.side]); v18FigDraw(P,st,p,kit,false); }
  if(st.ref) v18FigDraw(P,st,st.ref,V18_REFKIT,true);
  if(st.ars) for(const a of st.ars) v18FigDraw(P,st,a,V18_REFKIT,true);
  if(P.extra) for(const e of P.extra){ if(e&&e.o) v18FigDraw(P,st,e.o,e.kit,!!e.isRef); }
  for(const pt of F.parts){ const m=pt.m; m.count=pt.n; m.visible=pt.n>0; if(pt.n){ m.instanceMatrix.needsUpdate=true; m.instanceColor.needsUpdate=true; if(pt.axA) pt.axA.needsUpdate=true; }
    if(pt.ol){ pt.ol.count=pt.n; pt.ol.visible=pt.n>0; } }
  const own=st.own; if(own&&isFinite(own.x)&&!(own.off&&own.y<-3)){ F.ring.visible=true; F.ring.position.set(own.x,0.025,own.y); const k=0.92*(own.hgt||70)/70; F.ring.scale.set(k,1,k); } else F.ring.visible=false;
  if(F.dirty.kit){ F.kitTex.needsUpdate=true; F.dirty.kit=false; } if(F.dirty.face){ F.faceTex.needsUpdate=true; F.dirty.face=false; } if(F.dirty.num){ F.numTex.needsUpdate=true; F.dirty.num=false; } }

if(typeof P3D_MODULES!=='undefined') P3D_MODULES.push({name:'figures',order:30,
  init(P){ v18FigInit(P); },
  frame(P,st){ v18FigFrame(P,st); },
  resize(P){},
  dispose(P){ const F=P._fig; if(!F) return; for(const pt of F.parts){ P.scene.remove(pt.m); if(pt.ol) P.scene.remove(pt.ol); pt.m.dispose&&pt.m.dispose(); } P.scene.remove(F.ring); P._fig=null; } });
