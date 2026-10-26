/* v18.12 The County Map (95_countymap.js, styles in 95_countymap.css).
   The league becomes a county of real towns joined by roads. Winning spreads your colours from town to town, the towns you
   hold send you their kids at the Summer Scouting Camp, and towns a short road apart turn into natural rivals.
   - Geography (pure, v1812mGeo): everything is a function of the career seed, the league's schools and the heated rival at
     the time the map was first opened (C.map.anchor). The user's school sits centre-left, the other schools and six
     satellite towns (no varsity program: a county has more towns than schools, which makes 14) are spread with a
     best-candidate sampler and relaxed apart, roads are the Euclidean minimum spanning tree plus a few planar extra edges drawn as
     Bezier curves with distances in miles, plus a river with a tributary, a lake, hamlets and procedural terrain contours
     (value noise, marching squares).
   - Control (pure, v1812mState): each town splits 100% between the league's programs. A prior (the home program in a school
     town; the three nearest programs in a satellite) plus integer points earned from real results: every finished Varsity
     league or sectional game adds points at the home town (an away win counts double, a bigger margin a little more, a draw
     a few points to both) and a share of them spreads along the roads to the neighbouring towns. Points are kept per
     season in C.map.y and decay by 0.6 each season. Integer sums are order independent, so the incremental state equals a
     rebuild from C.fixtures (v1812mRebuild), which is how saves from before this version get their map.
     A town is held at 50% or more. Nothing here touches a random stream or a match.
   - Effects: Scouting Camp prospects get a hometown (held towns send two kids each, the home town three, contested towns
     bid against you), derby tags and Newswire hype for schools a short road apart, and the Road Warrior honor for winning
     at every ground in the county. Match simulation is untouched. */
const V1812M={W:1000,H:640,MI:0.05,NSAT:6,DECAY:0.6,PRIOR_HOME:24,PRIOR_SAT:22,WIN_H:8,WIN_A:16,DRAW:4,RAD:0.9,LAM:10,VEN:1.0,VSP:0.35,HELD:0.495,DERBY_MI:12,QH:3,QA:2,GAMMA:3,
  geo:null,geoKey:'',st:null,stKey:'',stC:null,view:null,sel:null,anim:null,ro:null,fresh:null};

/*== V1812M PURE START ==*/
function v1812mH2(seed,ix,iy){ let h=(seed^Math.imul(ix|0,374761393)^Math.imul(iy|0,668265263))>>>0; h=Math.imul(h^(h>>>13),1274126177)>>>0; return ((h^(h>>>16))>>>0)/4294967296; }
function v1812mNoise(seed,x,y){ const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy; const u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy); const a=v1812mH2(seed,ix,iy), b=v1812mH2(seed,ix+1,iy), c=v1812mH2(seed,ix,iy+1), d=v1812mH2(seed,ix+1,iy+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function v1812mField(seed,x,y){ return 0.58*v1812mNoise(seed,x/340,y/340)+0.28*v1812mNoise(seed+17,x/170+9.3,y/170+4.1)+0.14*v1812mNoise(seed+31,x/85+3.7,y/85+8.9); }
function v1812mF1(n){ return (Math.round(n*10)/10).toString(); }
function v1812mBez(p0,c1,c2,p1,t){ const u=1-t; const a=u*u*u, b=3*u*u*t, c=3*u*t*t, d=t*t*t; return {x:a*p0.x+b*c1.x+c*c2.x+d*p1.x, y:a*p0.y+b*c1.y+c*c2.y+d*p1.y}; }
function v1812mSegs(P,closed){ const n=P.length, out=[]; const m=closed?n:n-1; for(let i=0;i<m;i++){ const p0=closed?P[(i-1+n)%n]:P[Math.max(0,i-1)], p1=P[i], p2=P[(i+1)%n], p3=closed?P[(i+2)%n]:P[Math.min(n-1,i+2)];
    out.push({p0:p1,c1:{x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2:{x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6},p1:p2}); } return out; }
function v1812mSplineD(P,closed){ const S=v1812mSegs(P,closed); let d='M'+v1812mF1(P[0].x)+' '+v1812mF1(P[0].y); for(const s of S) d+='C'+v1812mF1(s.c1.x)+' '+v1812mF1(s.c1.y)+' '+v1812mF1(s.c2.x)+' '+v1812mF1(s.c2.y)+' '+v1812mF1(s.p1.x)+' '+v1812mF1(s.p1.y); return d+(closed?'Z':''); }
function v1812mSplinePts(P,closed,per){ const out=[]; for(const s of v1812mSegs(P,closed)) for(let j=0;j<per;j++) out.push(v1812mBez(s.p0,s.c1,s.c2,s.p1,j/per)); out.push({x:P[closed?0:P.length-1].x,y:P[closed?0:P.length-1].y}); return out; }
function v1812mDist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function v1812mNear(pts,p){ let m=1e9; for(const q of pts){ const d=Math.hypot(q.x-p.x,q.y-p.y); if(d<m) m=d; } return m; }
function v1812mSegPt(a,b,p){ const dx=b.x-a.x, dy=b.y-a.y, L=dx*dx+dy*dy; let t=L?((p.x-a.x)*dx+(p.y-a.y)*dy)/L:0; t=Math.max(0,Math.min(1,t)); return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y); }
function v1812mCross(a,b,c,d){ const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x); const d1=o(a,b,c), d2=o(a,b,d), d3=o(c,d,a), d4=o(c,d,b); return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0)); }

function v1812mAnchor(C){ const m=C.map; return (m&&m.anchor)||(C.rivals&&C.rivals.heated)||''; }
function v1812mMakeRiver(seed,avoid){ const W=V1812M.W, H=V1812M.H; let out=null;
  for(let tr=0;tr<16;tr++){ const rr=rngFrom(seed+101+tr*977); const horiz=rr()<0.5, n=7, A=[];
    if(horiz){ const y0=110+rr()*420, y1=110+rr()*420; for(let i=0;i<n;i++){ const t=i/(n-1); A.push({x:-30+t*(W+60), y:y0+(y1-y0)*t+(i>0&&i<n-1?(rr()-0.5)*170:0)}); } }
    else { const x0=330+rr()*480, x1=330+rr()*480; for(let i=0;i<n;i++){ const t=i/(n-1); A.push({y:-30+t*(H+60), x:x0+(x1-x0)*t+(i>0&&i<n-1?(rr()-0.5)*190:0)}); } }
    const pts=v1812mSplinePts(A,false,10); out={A,pts,d:v1812mSplineD(A,false),horiz};
    const k=2+Math.floor(rr()*(n-4)); const b=A[k]; const up=rr()<0.5; const T=horiz?[{x:b.x,y:b.y},{x:b.x+(rr()-0.5)*140,y:b.y+(up?-1:1)*(70+rr()*30)},{x:b.x+(rr()-0.5)*220,y:up?-30:H+30}]:[{x:b.x,y:b.y},{x:b.x+(up?-1:1)*(80+rr()*30),y:b.y+(rr()-0.5)*140},{x:up?-30:W+30,y:b.y+(rr()-0.5)*220}];
    out.tri={A:T,pts:v1812mSplinePts(T,false,10),d:v1812mSplineD(T,false)};
    if(!avoid||v1812mNear(pts,avoid)>=95) break; }
  return out; }

function v1812mPlace(C,rv,att){ const W=V1812M.W, H=V1812M.H, DMIN=140; const r=rngFrom(hashStr(C.seed+'|county|pos|'+att)); const u=C.userSid; const pts=[], P={};
  const put=(id,x,y,sat)=>{ const p={id,x,y,sat:!!sat}; pts.push(p); P[id]=p; return p; };
  put(u,245+(r()-0.5)*44,322+(r()-0.5)*70);
  const an=v1812mAnchor(C); if(an&&an!==u&&C.league.includes(an)){ const ang=(r()-0.5)*1.7, d=170+r()*40; put(an,P[u].x+Math.cos(ang)*d,P[u].y+Math.sin(ang)*d); }
  const rest=C.league.filter(id=>!P[id]); shuffle(r,rest); const sats=[]; for(let i=1;i<=V1812M.NSAT;i++) sats.push('x'+i);
  const cand=()=>{ let best=null, bs=-1; for(let k=0;k<44;k++){ const x=100+r()*(W-200), y=84+r()*(H-168); let m=1e9; for(const q of pts) m=Math.min(m,Math.hypot(q.x-x,q.y-y)); const dr=v1812mNear(rv.pts,{x,y}); if(dr<54) m=Math.min(m,dr*1.5); if(rv.tri){ const dt=v1812mNear(rv.tri.pts,{x,y}); if(dt<46) m=Math.min(m,dt*1.5); } if(m>bs){ bs=m; best={x,y}; } } return best; };
  for(const id of rest){ const c=cand(); put(id,c.x,c.y,false); } for(const id of sats){ const c=cand(); put(id,c.x,c.y,true); }
  for(let it=0;it<260;it++){ let moved=0;
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){ const a=pts[i], b=pts[j]; const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.01; if(d<DMIN){ const push=(DMIN-d)/2*0.6, ux=dx/d, uy=dy/d; const wa=a.id===u?0:b.id===u?2:1, wb=b.id===u?0:a.id===u?2:1; a.x-=ux*push*wa; a.y-=uy*push*wa; b.x+=ux*push*wb; b.y+=uy*push*wb; moved++; } }
    for(const p of pts){ if(p.id===u) continue; for(const line of [rv.pts,rv.tri&&rv.tri.pts]){ if(!line) continue; let bd=1e9, bq=null; for(const q of line){ const d=Math.hypot(q.x-p.x,q.y-p.y); if(d<bd){ bd=d; bq=q; } } if(bd<46&&bq){ const k=(46-bd)*0.7/(bd||1); p.x+=(p.x-bq.x)*k; p.y+=(p.y-bq.y)*k; moved++; } }
      p.x=Math.max(92,Math.min(W-92,p.x)); p.y=Math.max(76,Math.min(H-76,p.y)); }
    if(!moved) break; }
  let minD=1e9; for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) minD=Math.min(minD,Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y));
  let rc=1e9; for(const p of pts) rc=Math.min(rc,v1812mNear(rv.pts,p),rv.tri?v1812mNear(rv.tri.pts,p):1e9);
  return {pts,minD,rc}; }

function v1812mRoadNames(C){ return ['County Road','Old Mill Road','Ridge Road','Valley Pike','Route','Hollow Creek Road','State Route','Lakeview Road','Quarry Road','Stagecoach Road','Pine Barrens Road','Orchard Lane']; }
function v1812mBuildRoads(C,towns){ const n=towns.length; const cand=[]; for(let i=0;i<n;i++) for(let j=i+1;j<n;j++) cand.push({i,j,d:v1812mDist(towns[i],towns[j])}); cand.sort((a,b)=>a.d-b.d||a.i-b.i||a.j-b.j);
  const uf=towns.map((_,i)=>i); const find=x=>{ while(uf[x]!==x){ uf[x]=uf[uf[x]]; x=uf[x]; } return x; }; const E=[]; const has=new Set(); const key=(i,j)=>i<j?i+'_'+j:j+'_'+i;
  for(const c of cand){ const a=find(c.i), b=find(c.j); if(a!==b){ uf[a]=b; E.push({i:c.i,j:c.j,d:c.d}); has.add(key(c.i,c.j)); } }
  const avg=E.reduce((s,e)=>s+e.d,0)/Math.max(1,E.length); const want=Math.max(3,Math.round(n*0.3)); let extra=0;
  const ang=(i,j)=>Math.atan2(towns[j].y-towns[i].y,towns[j].x-towns[i].x);
  for(const c of cand){ if(extra>=want) break; if(has.has(key(c.i,c.j))||c.d>avg*1.5) continue; const A=towns[c.i], B=towns[c.j]; let bad=false;
    for(const e of E){ if(e.i===c.i||e.i===c.j||e.j===c.i||e.j===c.j) continue; if(v1812mCross(A,B,towns[e.i],towns[e.j])){ bad=true; break; } }
    if(!bad) for(let k=0;k<n;k++){ if(k===c.i||k===c.j) continue; if(v1812mSegPt(A,B,towns[k])<44){ bad=true; break; } }
    if(!bad) for(const e of E){ for(const [end,other] of [[c.i,c.j],[c.j,c.i]]){ let o=-1; if(e.i===end) o=e.j; else if(e.j===end) o=e.i; if(o<0) continue; let da=Math.abs(ang(end,other)-ang(end,o)); if(da>Math.PI) da=2*Math.PI-da; if(da<0.5){ bad=true; } } }
    if(bad) continue; E.push({i:c.i,j:c.j,d:c.d}); has.add(key(c.i,c.j)); extra++; }
  const names=v1812mRoadNames(C); const edges=[];
  for(const e of E){ const a=towns[e.i], b=towns[e.j]; const rr=rngFrom(hashStr(C.seed+'|road|'+a.id+'|'+b.id)); const dx=b.x-a.x, dy=b.y-a.y, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L;
    let o1=(rr()-0.5)*0.34*L, o2=rr()<0.6?o1*(0.5+rr()*0.7):-o1*(0.4+rr()*0.5); let c1, c2, samples, tries=0;
    for(;;){ c1={x:a.x+dx/3+nx*o1,y:a.y+dy/3+ny*o1}; c2={x:a.x+dx*2/3+nx*o2,y:a.y+dy*2/3+ny*o2}; samples=[]; for(let t=0;t<=24;t++) samples.push(v1812mBez(a,c1,c2,b,t/24));
      let clear=true; for(const q of towns){ if(q===a||q===b) continue; if(v1812mNear(samples,q)<40){ clear=false; break; } } if(clear||tries>=3) break; o1*=0.5; o2*=0.5; tries++; }
    let len=0; for(let t=1;t<samples.length;t++) len+=v1812mDist(samples[t-1],samples[t]);
    const num=10+Math.floor(rr()*80); const nm=names[Math.floor(rr()*names.length)]; const name=/Road$|Pike$|Lane$/.test(nm)?nm:nm+' '+num;
    edges.push({id:a.id+'|'+b.id,a:a.id,b:b.id,d:'M'+v1812mF1(a.x)+' '+v1812mF1(a.y)+'C'+v1812mF1(c1.x)+' '+v1812mF1(c1.y)+' '+v1812mF1(c2.x)+' '+v1812mF1(c2.y)+' '+v1812mF1(b.x)+' '+v1812mF1(b.y),
      len:Math.round(len*10)/10,mi:Math.max(2,Math.round(len*V1812M.MI*1.08)),name,mid:{x:Math.round(samples[12].x*10)/10,y:Math.round(samples[12].y*10)/10},pts:samples.map(q=>({x:Math.round(q.x*10)/10,y:Math.round(q.y*10)/10}))}); }
  return edges; }

function v1812mHamletNames(r,n,taken){ const A=['Mill','Hollow','Pine','Silver','Vail','Cedar','Stone','Fox','Elk','Birch','Alder','Heron','Copper','Maple','Thistle','Rook','Linden','Briar'], B=['Creek','Ridge','wood','mont','Crossing','Hollow','Run','Mills','Corners','Bend','Springs','Landing','Gap','Fork'], S=['St. Edward','St. Brigid','St. Anselm','Mill Creek South','Upper Pinewood','Old Quarry','Four Corners','Stagecoach Inn'];
  const out=[]; let g=0; while(out.length<n&&g++<200){ const x=r()<0.14?S[Math.floor(r()*S.length)]:A[Math.floor(r()*A.length)]+(r()<0.5?' ':'')+B[Math.floor(r()*B.length)]; const nm=x.replace(/\s(wood|mont)$/,'$1'); if(!taken.has(nm)){ taken.add(nm); out.push(nm); } } return out; }

function v1812mMarch(F,cols,rows,cs,L){ const P=new Map(), adj=new Map(); const ek=(t,i,j)=>t+i+'_'+j;
  const pt=(t,i,j)=>{ const k=ek(t,i,j); if(!P.has(k)){ let p; if(t==='h'){ const a=F[j*cols+i], b=F[j*cols+i+1]; p={x:(i+(L-a)/(b-a))*cs,y:j*cs}; } else { const a=F[j*cols+i], b=F[(j+1)*cols+i]; p={x:i*cs,y:(j+(L-a)/(b-a))*cs}; } P.set(k,p); } return k; };
  const link=(a,b)=>{ if(!adj.has(a)) adj.set(a,[]); if(!adj.has(b)) adj.set(b,[]); adj.get(a).push(b); adj.get(b).push(a); };
  for(let j=0;j<rows-1;j++) for(let i=0;i<cols-1;i++){ const tl=F[j*cols+i]>L, tr=F[j*cols+i+1]>L, br=F[(j+1)*cols+i+1]>L, bl=F[(j+1)*cols+i]>L; const c=(tl?8:0)|(tr?4:0)|(br?2:0)|(bl?1:0); if(c===0||c===15) continue;
    const T=()=>pt('h',i,j), Bt=()=>pt('h',i,j+1), Lf=()=>pt('v',i,j), Rt=()=>pt('v',i+1,j); const mid=(F[j*cols+i]+F[j*cols+i+1]+F[(j+1)*cols+i]+F[(j+1)*cols+i+1])/4>L;
    switch(c){ case 1: case 14: link(Lf(),Bt()); break; case 2: case 13: link(Bt(),Rt()); break; case 3: case 12: link(Lf(),Rt()); break; case 4: case 11: link(T(),Rt()); break;
      case 5: if(mid){ link(T(),Lf()); link(Bt(),Rt()); } else { link(T(),Rt()); link(Lf(),Bt()); } break; case 6: case 9: link(T(),Bt()); break; case 7: case 8: link(T(),Lf()); break;
      case 10: if(mid){ link(T(),Rt()); link(Lf(),Bt()); } else { link(T(),Lf()); link(Bt(),Rt()); } break; } }
  const seen=new Set(), lines=[]; const walk=s=>{ const path=[s]; seen.add(s); let cur=s; for(;;){ const nx=(adj.get(cur)||[]).find(k=>!seen.has(k)); if(!nx) break; seen.add(nx); path.push(nx); cur=nx; } return path; };
  const keys=[...adj.keys()]; for(const k of keys) if(!seen.has(k)&&adj.get(k).length===1) lines.push(walk(k)); for(const k of keys) if(!seen.has(k)) lines.push(walk(k));
  return lines.filter(l=>l.length>=4).map(l=>l.map(k=>P.get(k))); }
function v1812mLineD(pts){ const n=pts.length; let d='M'+v1812mF1(pts[0].x)+' '+v1812mF1(pts[0].y); for(let i=1;i<n-1;i++){ const m={x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2}; d+='Q'+v1812mF1(pts[i].x)+' '+v1812mF1(pts[i].y)+' '+v1812mF1(m.x)+' '+v1812mF1(m.y); } return d+'L'+v1812mF1(pts[n-1].x)+' '+v1812mF1(pts[n-1].y); }
function v1812mContours(seed,rv){ const W=V1812M.W, H=V1812M.H, cs=12, cols=Math.ceil(W/cs)+1, rows=Math.ceil(H/cs)+1; const F=new Float32Array(cols*rows); let mn=1e9, mx=-1e9; const rp=rv.pts.concat(rv.tri?rv.tri.pts:[]);
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){ const x=i*cs, y=j*cs; let bd=1e9; for(let k=0;k<rp.length;k+=2){ const d=(rp[k].x-x)*(rp[k].x-x)+(rp[k].y-y)*(rp[k].y-y); if(d<bd) bd=d; }
    const v=v1812mField(seed,x,y)-0.2*Math.exp(-bd/(2*80*80)); F[j*cols+i]=v; if(v<mn) mn=v; if(v>mx) mx=v; }
  const out=[]; const K=9; for(let k=1;k<=K;k++){ const L=mn+(mx-mn)*k/(K+1); const lines=v1812mMarch(F,cols,rows,cs,L); out.push({k,major:k%3===0,d:lines.map(v1812mLineD).join('')}); } return out; }

function v1812mFloyd(towns,edges){ const n=towns.length, idx={}; towns.forEach((t,i)=>idx[t.id]=i); const D=[], N=[]; for(let i=0;i<n;i++){ D.push(new Array(n).fill(1e9)); N.push(new Array(n).fill(-1)); D[i][i]=0; N[i][i]=i; }
  for(const e of edges){ const i=idx[e.a], j=idx[e.b]; D[i][j]=D[j][i]=e.len; N[i][j]=j; N[j][i]=i; }
  for(let k=0;k<n;k++) for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(D[i][k]+D[k][j]<D[i][j]-1e-9){ D[i][j]=D[i][k]+D[k][j]; N[i][j]=N[i][k]; } return {D,N,idx}; }

function v1812mBuildGeo(C){ const W=V1812M.W, H=V1812M.H; const seed=hashStr(C.seed+'|county'); const u=C.userSid; let ct=null;
  const rv=v1812mMakeRiver(seed,{x:250,y:322});
  let best=null; for(let att=0;att<8;att++){ const pl=v1812mPlace(C,rv,att); const sc=Math.min(pl.minD,150)+Math.min(pl.rc,50); if(!best||sc>best.sc) best={pl,sc}; if(pl.minD>=126&&pl.rc>=38){ best={pl,sc}; break; } }
  const rn=rngFrom(hashStr(C.seed+'|county|names')); const used=new Set(C.league.map(id=>C.schools[id].town)); const satNames=[]; for(let i=0;i<V1812M.NSAT;i++){ const idn=genIdentity(rn,used); satNames.push(idn.town); }
  const towns=best.pl.pts.map(p=>{ const s=C.schools[p.id]; return {id:p.id,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,sat:p.sat,sid:p.sat?null:p.id,name:p.sat?satNames[+p.id.slice(1)-1]:s.town,user:p.id===u}; });
  towns.sort((a,b)=>(a.sat-b.sat)||(a.user?-1:b.user?1:0)||(C.league.indexOf(a.id)-C.league.indexOf(b.id))||(a.id<b.id?-1:1));
  const tmap={}; towns.forEach(t=>tmap[t.id]=t);
  const edges=v1812mBuildRoads(C,towns); const adj={}; towns.forEach(t=>adj[t.id]=[]); for(const e of edges){ adj[e.a].push({to:e.b,e:e.id,mi:e.mi}); adj[e.b].push({to:e.a,e:e.id,mi:e.mi}); }
  const emap={}; edges.forEach(e=>emap[e.id]=e); const fl=v1812mFloyd(towns,edges);
  /* the lake: the emptiest spot in the county */
  const rl=rngFrom(seed+555); let lk=null; const roadPts=[]; edges.forEach(e=>{ for(let i=0;i<e.pts.length;i+=3) roadPts.push(e.pts[i]); });
  for(let k=0;k<60;k++){ const x=150+rl()*700, y=105+rl()*430; const sc=Math.min(v1812mNear(towns,{x,y})-10,v1812mNear(rv.pts,{x,y})+28,(rv.tri?v1812mNear(rv.tri.pts,{x,y})+28:1e9),v1812mNear(roadPts,{x,y})+18); if(!lk||sc>lk.sc) lk={x,y,sc}; }
  const R=Math.max(34,Math.min(70,lk.sc*0.62)); const nB=14, LP=[]; for(let i=0;i<nB;i++){ const a=i/nB*Math.PI*2, rr=R*(0.74+rl()*0.5); LP.push({x:lk.x+Math.cos(a)*rr*1.38,y:lk.y+Math.sin(a)*rr*0.92}); }
  const lake={cx:Math.round(lk.x),cy:Math.round(lk.y),r:Math.round(R),d:v1812mSplineD(LP,true)};
  /* hamlets sit on the roads, away from the towns, the lake and each other */
  const rh=rngFrom(seed+909); const hn=v1812mHamletNames(rh,12,new Set(towns.map(t=>t.name))); const ham=[]; const order=shuffle(rh,edges.map((_,i)=>i));
  /* a few passes, each a little less fussy about the distance from the towns, until the county has five or more */
  for(const th of [102,90,78]){ if(ham.length>=5) break;
    for(const ei of order){ if(ham.length>=8) break; const e=edges[ei]; const s0=rh()<0.5?1:-1;
      for(const t of [0.34,0.5,0.66]){ let done=false; for(const s of [s0,-s0]){ const q=e.pts[Math.round(t*24)]; const q2=e.pts[Math.min(24,Math.round(t*24)+1)]; const dx=q2.x-q.x, dy=q2.y-q.y, L=Math.hypot(dx,dy)||1; const p={x:q.x-dy/L*14*s,y:q.y+dx/L*14*s};
          if(v1812mNear(towns,p)<th||v1812mDist(p,lake)<lake.r*1.5||ham.some(h=>v1812mDist(h,p)<95)||v1812mNear(rv.pts,p)<22) continue; ham.push({x:Math.round(p.x),y:Math.round(p.y),name:hn[ham.length],e:e.id,s}); done=true; break; }
        if(done) break; } } }
  /* a hamlet's name runs away from its nearest town, so it never lands on that town's label */
  for(const h of ham){ let n=null, bd=1e9; for(const t of towns){ const d=v1812mDist(t,h); if(d<bd){ bd=d; n=t; } } h.s=n&&n.x>h.x?-1:1; }
  /* satellite priors: the three nearest programs, weighted by inverse square distance */
  const schools=towns.filter(t=>!t.sat); for(const t of towns){ if(!t.sat){ t.prior={[t.id]:V1812M.PRIOR_HOME}; continue; }
    const near=schools.map(s=>({s,d:v1812mDist(s,t)})).sort((a,b)=>a.d-b.d||(a.s.id<b.s.id?-1:1)).slice(0,3); const w=near.map(o=>1/(o.d*o.d)), tot=w.reduce((a,b)=>a+b,0); const raw=w.map(x=>x/tot*V1812M.PRIOR_SAT); const fl2=raw.map(Math.floor); let rem=V1812M.PRIOR_SAT-fl2.reduce((a,b)=>a+b,0);
    raw.map((x,i)=>[x-fl2[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([_,i])=>{ if(rem>0){ fl2[i]++; rem--; } }); t.prior={}; near.forEach((o,i)=>{ if(fl2[i]>0) t.prior[o.s.id]=fl2[i]; }); }
  /* derby pairs: schools a short road apart, plus every school's nearest neighbour by road */
  const derby={}; const pathOf=(a,b)=>{ const out=[fl.idx[a]]; let c=fl.idx[a]; const tg=fl.idx[b]; let g=0; while(c!==tg&&g++<40){ c=fl.N[c][tg]; out.push(c); } return out.map(i=>towns[i].id); };
  const nearest={}; for(const a of schools){ let bd=1e9, bb=null; for(const b of schools){ if(a===b) continue; const d=fl.D[fl.idx[a.id]][fl.idx[b.id]]; if(d<bd-1e-9||(Math.abs(d-bd)<1e-9&&bb&&b.id<bb)){ bd=d; bb=b.id; } } nearest[a.id]=bb; }
  for(let i=0;i<schools.length;i++) for(let j=i+1;j<schools.length;j++){ const a=schools[i].id, b=schools[j].id; const d=fl.D[fl.idx[a]][fl.idx[b]]; const mi=Math.max(2,Math.round(d*V1812M.MI*1.08));
    if(mi<=V1812M.DERBY_MI||nearest[a]===b||nearest[b]===a){ const path=pathOf(a,b); const es=[]; for(let k=0;k<path.length-1;k++){ const x=path[k], y=path[k+1]; es.push(emap[x+'|'+y]?x+'|'+y:y+'|'+x); }
      /* the pill sits at the middle of the path's longest road, clear of any satellite town the path runs through */
      const eb=es.reduce((m,id)=>emap[id].len>emap[m].len?id:m,es[0]); const E0=emap[eb]; const lab=E0.pts[12], pa=E0.pts[10], pb=E0.pts[14]; let ang=Math.atan2(pb.y-pa.y,pb.x-pa.x)*180/Math.PI; if(ang>90) ang-=180; if(ang<-90) ang+=180;
      derby[a<b?a+'|'+b:b+'|'+a]={a:a<b?a:b,b:a<b?b:a,mi,path,edges:es,lab:{x:lab.x,y:lab.y},ang:Math.round(ang),len:Math.round(E0.len),name:E0.name}; } }
  return {W,H,seed,towns,tmap,edges,emap,adj,river:{d:rv.d,tri:rv.tri.d,pts:rv.pts.filter((_,i)=>i%4===0).map(q=>({x:Math.round(q.x),y:Math.round(q.y)}))},lake,hamlets:ham,get contours(){ return ct||(ct=v1812mContours(seed,rv)); },derby,nearest,
    mi:(a,b)=>{ const d=fl.D[fl.idx[a]][fl.idx[b]]; return Math.max(0,Math.round(d*V1812M.MI*1.08)); },miF:(a,b)=>fl.D[fl.idx[a]][fl.idx[b]]*V1812M.MI*1.08,idx:fl.idx,anchor:v1812mAnchor(C)}; }
function v1812mGeo(C){ const key=C.seed+'|'+C.league.join(',')+'|'+v1812mAnchor(C)+'|'+C.userSid; if(V1812M.geoKey===key&&V1812M.geo) return V1812M.geo; const g=v1812mBuildGeo(C); V1812M.geo=g; V1812M.geoKey=key; return g; }
function v1812mDerbyOf(C,a,b){ if(!a||!b||a===b) return null; const g=v1812mGeo(C); return g.derby[a<b?a+'|'+b:b+'|'+a]||null; }

/* ---------- the saved part: C.map ---------- */
function v1812mBox(C){ let m=C.map; if(!m||typeof m!=='object'){ m=C.map={v:1}; }
  if(!m.anchor) m.anchor=(C.rivals&&C.rivals.heated)||''; if(!m.y) m.y={}; if(!m.done) m.done={}; if(!m.rw) m.rw={}; if(!m.log) m.log=[]; if(!m.ms) m.ms={}; if(!m.hype) m.hype={}; if(!m.nf) m.nf={}; if(m.n==null) m.n=Object.keys(m.done).length; if(m.nn==null) m.nn=0; return m; }
function v1812mQual(C,f){ return !!f&&f.st==='d'&&f.lvl==='V'&&(f.comp==='reg'||f.comp==='sec')&&f.hg!=null&&f.ag!=null&&C.league.includes(f.h)&&C.league.includes(f.a); }
function v1812mAdd(Y,t,s,n){ if(!n) return; const T=Y[t]||(Y[t]={}); T[s]=(T[s]||0)+n; }
/* one finished game's points, added into a season bucket Y (pure; used by the real fold and by the what-if preview) */
function v1812mContrib(geo,h,a,hg,ag,w,Y){ const V=V1812M, m=Math.abs(hg-ag), mf=1+0.12*Math.max(0,Math.min(m,4)-1);
  const radial=(sid,g)=>{ for(const t of geo.towns){ const v=Math.round(g*V.RAD*Math.exp(-geo.miF(sid,t.id)/V.LAM)); if(v>0) v1812mAdd(Y,t.id,sid,v); } };
  if(w===a){ const g=Math.round(V.WIN_A*mf); radial(a,g); v1812mAdd(Y,h,a,Math.round(g*V.VEN)); for(const o of geo.adj[h]||[]) v1812mAdd(Y,o.to,a,Math.round(g*V.VSP*Math.max(0.5,Math.min(1,1.25-o.mi/20)))); }
  else if(w===h){ const g=Math.round(V.WIN_H*mf); radial(h,g); }
  else { v1812mAdd(Y,h,h,V.DRAW); v1812mAdd(Y,h,a,V.DRAW); } }
function v1812mApply(C,f){ const B=v1812mBox(C); if(B.done[f.id]||!v1812mQual(C,f)) return false; const geo=v1812mGeo(C); const Y=B.y[f.yr]||(B.y[f.yr]={});
  v1812mContrib(geo,f.h,f.a,f.hg,f.ag,f.w,Y); B.done[f.id]=1; B.n++;
  if(f.a===C.userSid&&f.w===C.userSid&&!B.rw[f.h]) B.rw[f.h]=f.yr; V1812M.stKey=''; return true; }
function v1812mFxOrder(f){ return ({pre:0,reg:100,sec:200,rgn:300,st:400}[f.comp]||0)+(f.rd||0); }
function v1812mRebuild(C){ const B=v1812mBox(C); B.y={}; B.done={}; B.n=0; B.rw={}; V1812M.stKey='';
  const fx=Object.values(C.fixtures).filter(f=>v1812mQual(C,f)).sort((a,b)=>(a.yr-b.yr)||(v1812mFxOrder(a)-v1812mFxOrder(b))||(a.id<b.id?-1:a.id>b.id?1:0)); for(const f of fx) v1812mApply(C,f); return B; }
/* fold any finished game the map has not seen (a save from before this version, or a game finished some other way) */
function v1812mEnsure(C){ const B=v1812mBox(C); const sig=C.year+'|'+C.phase+'|'+C.md+'|'+(C.post?C.post.secRd:'')+'|'+(C.pre?C.pre.rd:'')+'|'+Object.keys(C.fixtures).length; if(B.sig===sig) return B; B.sig=sig;
  const fx=Object.values(C.fixtures).filter(f=>v1812mQual(C,f)&&!B.done[f.id]); if(fx.length){ fx.sort((a,b)=>(a.yr-b.yr)||(v1812mFxOrder(a)-v1812mFxOrder(b))||(a.id<b.id?-1:1)); for(const f of fx) v1812mApply(C,f); }
  if(!B.seen&&B.n===0&&C.userSid&&C.schools[C.userSid]){ try{ B.seen=v1812mSnap(C); }catch(e){} } return B; }

/* shares {town:{sid:0..1}}: prior + decayed season points. excl: leave this season out (the state at the season's start). over: {yr,Y} replaces one season's bucket (what-if) */
function v1812mShares(C,geo,B,excl,over){ const P={}; for(const t of geo.towns){ P[t.id]={}; for(const s in t.prior) P[t.id][s]=t.prior[s]; }
  const now=C.year; const yrs=new Set(Object.keys(B.y).map(Number)); if(over) yrs.add(over.yr);
  for(const yr of [...yrs].filter(y=>excl?y<now:y<=now).sort((a,b)=>a-b)){ const w=Math.pow(V1812M.DECAY,now-yr); const Y=over&&over.yr===yr?over.Y:B.y[yr]; if(!Y) continue;
    for(const tid in Y){ if(!P[tid]) continue; for(const sid in Y[tid]){ if(Y[tid][sid]>0) P[tid][sid]=(P[tid][sid]||0)+w*Y[tid][sid]; } } }
  const S={}, G=V1812M.GAMMA; for(const tid in P){ let tot=0; const q={}; for(const s in P[tid]){ q[s]=Math.pow(P[tid][s],G); tot+=q[s]; } S[tid]={}; for(const s in P[tid]) S[tid][s]=tot>0?q[s]/tot:0; } return S; }
/* integer percentages that always add up to 100 (largest remainder) */
function v1812mPct(sh){ const ks=Object.keys(sh).filter(k=>sh[k]>0).sort(); const raw=ks.map(k=>sh[k]*100), fl=raw.map(Math.floor); let rem=100-fl.reduce((a,b)=>a+b,0); const out={};
  raw.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([_,i])=>{ if(rem>0){ fl[i]++; rem--; } }); ks.forEach((k,i)=>out[k]=fl[i]); return out; }
function v1812mOwner(sh){ let b=null, bv=-1; for(const k of Object.keys(sh).sort()) if(sh[k]>bv+1e-12){ bv=sh[k]; b=k; } return b; }
function v1812mHeldList(geo,S,u){ return geo.towns.filter(t=>(S[t.id][u]||0)>=V1812M.HELD-1e-12).map(t=>t.id); }
function v1812mState(C){ const B=v1812mBox(C); const key=C.year+'|'+B.n+'|'+C.userSid; if(V1812M.stC===C&&V1812M.stKey===key&&V1812M.st) return V1812M.st;
  const geo=v1812mGeo(C), u=C.userSid; const S=v1812mShares(C,geo,B,false), S0=v1812mShares(C,geo,B,true); const held=v1812mHeldList(geo,S,u), held0=v1812mHeldList(geo,S0,u);
  const pct={}, owner={}; for(const t of geo.towns){ pct[t.id]=v1812mPct(S[t.id]); owner[t.id]=v1812mOwner(S[t.id]); }
  const st={S,S0,held,held0,pct,owner,reach:held.length,reach0:held0.length,total:geo.towns.length,delta:held.length-held0.length}; V1812M.st=st; V1812M.stKey=key; V1812M.stC=C; return st; }
/* what a result at the user's next fixture would do: shares before and after */
function v1812mWhatIf(C,f,hg,ag){ const B=v1812mBox(C), geo=v1812mGeo(C); const Y=JSON.parse(JSON.stringify(B.y[f.yr]||{})); const w=hg>ag?f.h:ag>hg?f.a:null; v1812mContrib(geo,f.h,f.a,hg,ag,w,Y);
  const after=v1812mShares(C,geo,B,false,{yr:f.yr,Y}); const before=v1812mState(C).S; return {before,after,heldAfter:v1812mHeldList(geo,after,C.userSid)}; }
/*== V1812M PURE END ==*/

/* ---------- colours that read on the map ---------- */
function v1812mDark(){ try{ return lum(themeColors().bg)<0.3; }catch(e){ return true; } }
function v1812mVis(c,dark){ const L=lum(c); if(dark){ if(L<0.1) return mix(c,'#ffffff',0.46); if(L<0.2) return mix(c,'#ffffff',0.24); return c; } if(L>0.6) return mix(c,'#000000',0.38); if(L>0.4) return mix(c,'#000000',0.16); return c; }
function v1812mCol(C,sid,dark){ const s=C.schools[sid]; return s?v1812mVis(s.c1,dark):'#8aa'; }
function v1812mName(C,tid){ const t=v1812mGeo(C).tmap[tid]; return t?t.name:''; }
function v1812mPlural(n,w){ return n+' '+w+(n===1?'':'s'); }
const V1812M_NUM=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
function v1812mWord(n){ return V1812M_NUM[n]||String(n); }
function v1812mList(a){ return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1]; }

/* ---------- the news: type 'county', so the Newswire filters it as its own kind ---------- */
function v1812mNews(C,text,sid,extra){ addNews(C,'county',text,sid||C.userSid,extra); }
function v1812mPoss(m){ return /s$/.test(m)?m+"'":m+"'s"; }
function v1812mOnce(B,k){ if(B.nf[k]) return false; B.nf[k]=1; return true; }

/* ---------- after a game: fold it into the map, announce flips, hand out Road Warrior ---------- */
function v1812mAfter(C,f,quiet){ const B=v1812mBox(C); if(B.done[f.id]||!v1812mQual(C,f)) return false; const u=C.userSid, geo=v1812mGeo(C);
  const st0=v1812mState(C); const held0=st0.held.slice(); const mine=f.h===u||f.a===u;
  if(!v1812mApply(C,f)) return false; const st=v1812mState(C);
  const gained=st.held.filter(t=>!held0.includes(t)), lost=held0.filter(t=>!st.held.includes(t));
  if(mine){ const t=f.h, p0=Math.round((st0.S[t][u]||0)*100), p1=Math.round((st.S[t][u]||0)*100); B.log.push({fid:f.id,yr:f.yr,t,k:'v',p0,p1}); }
  const me=C.schools[u];
  for(const t of gained){ const nm=geo.tmap[t].name, p=Math.round((st.S[t][u]||0)*100); B.log.push({fid:f.id,yr:f.yr,t,k:'g',p});
    if(!quiet&&v1812mOnce(B,f.yr+'|'+t+'|g')) v1812mNews(C,`${nm} flips to the ${me.mascot}: your colours now cover ${p}% of the town${f.h===t&&f.a===u?', won on the road':''}`,u,{fid:f.id}); }
  for(const t of lost){ const nm=geo.tmap[t].name, ow=st.owner[t], p=Math.round((st.S[t][u]||0)*100); B.log.push({fid:f.id,yr:f.yr,t,k:'l',p});
    if(!quiet&&v1812mOnce(B,f.yr+'|'+t+'|l')) v1812mNews(C,ow&&ow!==u&&C.schools[ow]?`${C.schools[ow].town} take ${nm} back: the ${me.mascot} slip to ${p}% of the town`:`${nm} slips out of ${v1812mPoss(me.mascot)} hands (${p}%)`,ow&&C.schools[ow]?ow:u,{fid:f.id}); }
  if(B.log.length>80) B.log.splice(0,B.log.length-80);
  if(gained.length||lost.length) B.nv=1;
  for(const n of [4,6,8,10,12]) if(st.reach>=n&&!B.ms[n]){ B.ms[n]=C.year; if(!quiet&&st.reach>st0.reach) v1812mNews(C,`${me.town} colours now fly over ${st.reach} of ${st.total} towns in the county`,u); }
  v1812mRoadWarrior(C,f,quiet);
  return true; }
function v1812mRoadWarrior(C,f,quiet){ const B=v1812mBox(C), u=C.userSid; if(B.rwDone) return false; const need=C.league.filter(id=>id!==u); if(!need.every(id=>B.rw[id])) return false;
  const yr=f?f.yr:C.year; B.rwDone={yr,fid:f?f.id:null}; const me=C.schools[u]; if(me&&!me.honors.some(h=>h.label==='Road Warrior')) me.honors.push({yr,label:'Road Warrior'});
  if(!quiet) v1812mNews(C,`ROAD WARRIOR: ${me.name} have now won on the road in every town in the county. A first for the program`,u,f?{fid:f.id}:{}); B.nv=1; return true; }
function v1812mWarrior(C){ const B=v1812mBox(C), u=C.userSid; const need=C.league.filter(id=>id!==u); return {need,have:need.filter(id=>B.rw[id]),done:!!B.rwDone,info:B.rwDone}; }

if(typeof finishMatch==='function'){ const _v1812mFinish=finishMatch;
  finishMatch=function(C,M){ const f=C&&M&&C.fixtures[M.fid]; const was=f&&f.st; const out=_v1812mFinish.apply(this,arguments);
    try{ if(was!=='d'&&f&&f.st==='d') v1812mAfter(C,f,false); }catch(e){ console.error(e); } return out; }; V1812M.rawFinish=_v1812mFinish; }
/* a save from before this version: build the map from the results on the first open (no news, no animation) */
function v1812mSnap(C){ const st=v1812mState(C), o={}; for(const t in st.S){ o[t]={}; for(const s in st.S[t]) if(st.S[t][s]>0.004) o[t][s]=Math.round(st.S[t][s]*1000)/1000; } return {yr:C.year,S:o}; }
function v1812mCatchUp(C){ if(!C||!C.league||!C.fixtures||!C.userSid||!C.schools[C.userSid]) return; const fresh=!C.map; const B=v1812mBox(C);
  if(fresh||B.sig==null){ const n0=B.n; v1812mEnsure(C); if(fresh||B.n!==n0){ v1812mRoadWarrior(C,null,true); B.seen=v1812mSnap(C); } } }
if(typeof migrate==='function'){ const _v1812mMig=migrate; migrate=function(C){ const r=_v1812mMig.apply(this,arguments); try{ v1812mCatchUp(C); }catch(e){ console.error(e); } return r; }; }

/* ---------- the Scouting Camp: kids from the towns you hold ---------- */
/* kids a town sends to the camp: your home town three, a town you hold two, three where your grip is firm (80%+), none otherwise */
function v1812mQuota(C,st,tid){ const x=st.S[tid][C.userSid]||0; if(x<V1812M.HELD) return 0; if(tid===C.userSid) return V1812M.QH; return x>=0.8?V1812M.QA+1:V1812M.QA; }
function v1812mCampSlots(C,st,geo){ const u=C.userSid; const held=geo.towns.filter(t=>st.held.includes(t.id)).sort((a,b)=>(a.id===u?-1:b.id===u?1:0)||(st.S[b.id][u]-st.S[a.id][u])||(a.id<b.id?-1:1)); const out=[]; for(const t of held){ const n=v1812mQuota(C,st,t.id); for(let i=0;i<n;i++) out.push(t.id); } return out; }
function v1812mCamp(C,K){ K.v1812m=1; const geo=v1812mGeo(C); v1812mEnsure(C); const st=v1812mState(C), u=C.userSid; const touched=K.prospects.some(x=>x.invited); const r=rngFrom(hashStr(C.seed+'|mapcamp|'+C.year));
  const slots=v1812mCampSlots(C,st,geo); const pr=K.prospects; const order=pr.map((x,i)=>i).sort((a,b)=>(pr[b].p.pot-pr[a].p.pot)||(a-b));
  const tag=(x,tid,held)=>{ const nm=geo.tmap[tid].name; x.tid=tid; x.town=nm; x.feeder=nm+' Middle'; x.held=!!held; if(held&&!touched){ x.rival=null; x.know=Math.min(100,(x.know||0)+10); } };
  const contested=geo.towns.filter(t=>{ const s=st.S[t.id][u]||0; return s>=0.12&&s<V1812M.HELD; });
  let k=0; for(const i of order){ const x=pr[i]; if(k<slots.length){ tag(x,slots[k++],true); continue; }
    if(contested.length&&r()<0.6){ const t=wpick(r,contested,c=>st.S[c.id][u]); tag(x,t.id,false); const ow=st.owner[t.id]; if(!touched&&ow&&ow!==u&&C.league.includes(ow)) x.rival=ow; } }
  const n0=pr.length; const extra=touched?0:Math.min(4,Math.max(0,slots.length-n0));
  if(extra){ const sch=C.schools[u]; const r2=rngFrom(hashStr(C.seed+'|mapcamp+|'+C.year));
    for(let i=0;i<extra;i++){ const grade=r2()<0.55?7:8; const pos=pick(r2,['GK','DEF','DEF','MID','MID','FWD','FWD','MID']); const tier=r2()*0.82; const bonus=tier<0.12?16:tier<0.35?9:tier<0.75?3:-3;
      const p=genPlayer(C,r2,{sid:u,lvl:'MOD',grade,pos,target:levelTarget('MOD',grade,sch.strength,true)+bonus+gauss(r2)*4,user:true}); const stars=clamp(Math.round((p.pot-62)/8+(bonus>10?1:0)),1,5);
      const x={p,feeder:'',stars,know:Math.round(20+r2()*25),off:Math.round((r2()-.5)*10),rival:null,invited:false,committed:false,declined:false,extra:true}; tag(x,slots[n0+i],true); pr.push(x); } }
  return K; }
if(typeof campEnsure==='function'){ const _v1812mCampEnsure=campEnsure;
  campEnsure=function(C){ const K=_v1812mCampEnsure.apply(this,arguments); try{ if(K&&!K.v1812m) v1812mCamp(C,K); }catch(e){ console.error(e); } return K; }; }
/* how many kids a town sends to the next camp, and what this year's camp holds from it */
function v1812mPipeline(C,tid){ const st=v1812mState(C), u=C.userSid; const held=st.held.includes(tid); const K=C.camp&&C.camp.yr===C.year&&C.camp.v1812m?C.camp:null;
  return {held,n:v1812mQuota(C,st,tid),list:K?K.prospects.filter(x=>x.tid===tid):[]}; }

/* ---------- derbies: schools a short road apart ---------- */
function v1812mDerbyFx(C,f){ if(!f||(f.comp!=='reg'&&f.comp!=='sec')||!C.league.includes(f.h)||!C.league.includes(f.a)) return null; const d=v1812mDerbyOf(C,f.h,f.a); if(!d) return null; return {mi:d.mi,road:d.name,heated:isRivalry(C,f.h,f.a)==='heated'}; }
function v1812mChip(d){ return `<span class="chip v1812m-chip" title="Neighbouring towns, ${d.mi} miles apart by road">${icon('v1812mmap',13)} Derby · ${d.mi} mi</span>`; }
if(typeof rivalChip==='function'){ const _v1812mRC=rivalChip; rivalChip=function(f){ let h=_v1812mRC.apply(this,arguments); try{ const d=v1812mDerbyFx(App.C,f); if(d) h+=v1812mChip(d); }catch(e){} return h; }; }
if(typeof resultRow==='function'){ const _v1812mRR=resultRow; resultRow=function(f){ let h=_v1812mRR.apply(this,arguments); try{ const d=v1812mDerbyFx(App.C,f); if(d) h=h.replace('</div></div><b class="mono">',` <span class="v1812m-dtag" title="Derby road, ${d.mi} mi">Derby</span></div></div><b class="mono">`); }catch(e){} return h; }; }
if(typeof v17GameRow==='function'){ const _v1812mGR=v17GameRow; v17GameRow=function(C,f){ let h=_v1812mGR.apply(this,arguments); try{ const d=v1812mDerbyFx(C,f); if(d) h=h.replace('</div><b class="mono">',` <span class="pill v1812m-dpill" title="${d.mi} miles apart by road">Derby</span></div><b class="mono">`); }catch(e){} return h; }; }
/* the broadcast intro: a DERBY caption (the heated rivalry keeps its RIVALRY NIGHT, with a derby line under it) */
if(typeof liveIntro==='function'){ const _v1812mLI=liveIntro; liveIntro=function(done){ const out=_v1812mLI.apply(this,arguments);
    try{ const L=App.live, C=App.C, f=L&&C.fixtures[L.fid]; const d=f&&v1812mDerbyFx(C,f); const top=document.querySelector('#lv-intro .lvi-top'); if(d&&top){ top.parentNode.classList.add('v1812m-derby'); const big=top.querySelector('.lvi-big');
        if(!big) top.insertAdjacentHTML('afterbegin','<div class="lvi-big v1812m-lvi">DERBY</div>'); top.insertAdjacentHTML('beforeend',`<div class="v1812m-lvisub">${icon('v1812mmap',15)} Derby road · ${d.mi} mi · ${esc(d.road)}</div>`); } }catch(e){}
    return out; }; }
/* Matchday Center cards for derbies */
function v1812mDecorateMatchday(){ const C=App.C; if(!C||App.route!=='matchday') return; const games=roundGames(C); document.querySelectorAll('.mc-game').forEach(el=>{ if(el.querySelector('.v1812m-dtag')) return; const tw=[...el.querySelectorAll('.mc-team b')].map(x=>x.textContent); if(tw.length<2) return;
    const f=games.find(g=>C.schools[g.h]&&C.schools[g.a]&&C.schools[g.h].town===tw[0]&&C.schools[g.a].town===tw[1]); const d=f&&v1812mDerbyFx(C,f); const top=el.querySelector('.mc-top'); if(d&&top) top.insertAdjacentHTML('beforeend',`<span class="pill v1812m-dtag v1812m-mcp">Derby \u00b7 ${d.mi} mi</span>`); }); }
/* derby week hype for the user's next game, once per fixture */
function v1812mHype(C){ if(!C||C.phase==='offseason') return; const f=userFixture(C); if(!f||f.st==='d') return; const d=v1812mDerbyFx(C,f); const B=v1812mBox(C); if(!d||B.hype[f.id]) return; B.hype[f.id]=1;
  const u=C.userSid, o=f.h===u?f.a:f.h, ot=C.schools[o], me=C.schools[u]; const st=v1812mState(C); const p=Math.round((st.S[o][u]||0)*100);
  const lines=[`Derby week: ${me.town} and ${ot.town} are ${v1812mWord(d.mi)} miles apart on ${d.road}, and both towns will empty out on Friday`,
    `${d.heated?'The heated rivalry meets the county derby':'A county derby'}: ${ot.town} sits ${v1812mWord(d.mi)} miles down ${d.road}${p?`, and your colours already cover ${p}% of it`:''}`,
    `${ot.town} ${ot.mascot} know the way: ${d.road} runs ${v1812mWord(d.mi)} miles between the two schools, and the winner takes the road`];
  v1812mNews(C,lines[hashStr(f.id)%lines.length],u,{fid:f.id}); }

/* ---------- navigation ---------- */
ICON.v1812mmap='<path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v13"/>';
NAV_ICON.countymap='v1812mmap'; TITLES.countymap='The County Map';
if(typeof NAV_DESC!=='undefined') NAV_DESC.countymap='Your league as towns and roads';
if(typeof TOPNAV!=='undefined'){ const g=TOPNAV.find(t=>t[0]==='league'); if(g&&!g[3].includes('countymap')) g[3].splice(1,0,'countymap'); }
{ const i=NAV.findIndex(x=>x[0]==='league'); if(i>=0&&!NAV.some(x=>x[0]==='countymap')) NAV.splice(i+1,0,['countymap','County Map']); }
if(typeof navBadges==='function'){ const _v1812mNB=navBadges; navBadges=function(C){ const b=_v1812mNB(C); try{ if(C&&C.map&&C.map.nv&&App.route!=='countymap') b.countymap='NEW'; }catch(e){} return b; }; }

/* ---------- panel data ---------- */
function v1812mRecord(C,sid){ const u=C.userSid; const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&(f.comp==='reg'||f.comp==='sec')&&((f.h===u&&f.a===sid)||(f.a===u&&f.h===sid))).sort((a,b)=>(a.yr-b.yr)||(v1812mFxOrder(a)-v1812mFxOrder(b)));
  const r={w:0,d:0,l:0,last:fx[fx.length-1]||null,gf:0,ga:0}; for(const f of fx){ const mine=f.h===u?f.hg:f.ag, th=f.h===u?f.ag:f.hg; r.gf+=mine; r.ga+=th; if(f.w===u) r.w++; else if(f.w) r.l++; else r.d++; } return r; }
/* the user's next game against a county town: what a win would do there and around it */
function v1812mFriday(C){ if(C.phase==='offseason') return {kind:'off'}; const f=userFixture(C); if(!f) return {kind:'none'};
  if(!((f.comp==='reg'||f.comp==='sec')&&C.league.includes(f.h)&&C.league.includes(f.a))) return {kind:'out',f};
  const u=C.userSid, away=f.a===u, t=f.h, opp=away?f.h:f.a; const st=v1812mState(C), geo=v1812mGeo(C); const W=v1812mWhatIf(C,f,away?0:1,away?1:0);
  const before=st.S[t][u]||0, after=W.after[t][u]||0; const flips=W.heldAfter.filter(x=>!st.held.includes(x));
  const push=geo.towns.filter(x=>x.id!==t).map(x=>({id:x.id,d:(W.after[x.id][u]||0)-(st.S[x.id][u]||0)})).filter(x=>x.d>=0.015).sort((a,b)=>b.d-a.d).slice(0,3);
  const ft=flips.includes(t)?t:flips[0]; const kids=ft?((W.after[ft][u]||0)>=0.8?V1812M.QA+1:V1812M.QA):0;
  return {kind:'lg',f,away,t,opp,before,after,flips,push,kids,derby:v1812mDerbyFx(C,f),heldNow:st.held.includes(t)}; }
function v1812mFridayText(C,F){ const geo=v1812mGeo(C); const nm=id=>esc(geo.tmap[id].name);
  if(F.kind==='off') return 'The season is over. The towns you hold send their kids to the Summer Scouting Camp.';
  if(F.kind==='none') return 'No county game this round. Your colours hold where they are.';
  if(F.kind==='out') return 'This one is outside the county, so it will not move the map.';
  const pb=Math.round(F.before*100), pa=Math.round(F.after*100);
  if(F.flips.length){ const t=F.flips.includes(F.t)?F.t:F.flips[0]; return `Win and ${t===F.t?(F.flips.length>1?F.flips.length+' towns flip':'the town flips'):nm(t)+(F.flips.length>1?' and '+(F.flips.length-1)+' more flip':' flips')}: ${v1812mPlural(F.kids,'Scouting Camp prospect')} from ${nm(t)} start looking your way.`; }
  if(F.away) return F.heldNow?`Win and you tighten your grip on ${nm(F.t)} (${pb}% to ${pa}%).`:`Win and ${nm(F.t)} moves from ${pb}% to ${pa}% your colours${F.push.length?`, with the pull reaching ${v1812mList(F.push.map(p=>nm(p.id)))}`:''}.`;
  return `Defend ${nm(F.t)}. A win keeps it at ${pa}% and pushes your colours${F.push.length?` into ${v1812mList(F.push.map(p=>nm(p.id)))}`:' further along the roads'}.`; }

/* ---------- the map drawing ---------- */
function v1812mRing(r){ return +(2*Math.PI*r).toFixed(1); }
function v1812mGlowAttrs(geo,tid,sid,x){ const t=geo.tmap[tid], h=geo.tmap[sid]; const base=t.sat?66:82; const r=base*(0.42+1.25*Math.sqrt(Math.max(0,x))); const o=Math.min(0.9,0.08+0.86*Math.pow(Math.max(0,x),0.62)); let cx=t.x, cy=t.y;
  if(h&&sid!==tid){ const dx=h.x-t.x, dy=h.y-t.y, d=Math.hypot(dx,dy)||1; const off=Math.min(48,d*0.2)*(1-x); cx+=dx/d*off; cy+=dy/d*off; } return {cx,cy,r,o}; }
function v1812mStack(C,sh,dark,minPct){ const pc=v1812mPct(sh); const u=C.userSid; const ks=Object.keys(pc).filter(k=>pc[k]>=(minPct||2)).sort((a,b)=>(a===u?-1:b===u?1:0)||(sh[b]-sh[a])||(a<b?-1:1));
  return `<span class="v1812m-bar" aria-hidden="true">${ks.map(k=>`<i style="width:${sh[k]*100}%;background:${v1812mCol(C,k,dark)}"></i>`).join('')}<u></u></span>`; }
function v1812mMark(C,t,st,dark,ctx){ const u=C.userSid, sh=st.S[t.id], x=sh[u]||0, held=x>=V1812M.HELD, ow=st.owner[t.id]; const pc=Math.round(x*100); const s=t.sat?null:C.schools[t.id];
  const cls=['v1812m-mk',t.user?'v1812m-isuser':'',held?'v1812m-isheld':'',t.sat?'v1812m-issat':'',ctx.next===t.id?'v1812m-isnext':'',ctx.flip.includes(t.id)?'v1812m-isflip':'',ctx.lost.includes(t.id)?'v1812m-islost':'',V1812M.sel===t.id?'v1812m-issel':''].filter(Boolean).join(' ');
  const rr=t.sat?13:25, ring=v1812mRing(rr); const col=v1812mCol(C,u,dark); const oc=ow&&C.schools[ow]?v1812mCol(C,ow,dark):'#889';
  const label=t.name; const aria=`${label}, ${held?'you hold this town':'you control '+pc+'%'}${s?'':', no varsity program'}`;
  const body=t.sat?`<circle class="v1812m-satring" r="${rr}"/><circle class="v1812m-rg" r="${rr}" stroke="${col}" data-c="${ring}" stroke-dasharray="${(x*ring).toFixed(1)} ${ring}" transform="rotate(-90)"/><circle class="v1812m-satdot" r="6.5" fill="${oc}"/>${held?`<path class="v1812m-flag" d="M-1 -2V-12L7 -9L-1 -6" fill="${col}"/>`:''}`
    :`<circle class="v1812m-rbg" r="${rr}"/><circle class="v1812m-rg" r="${rr}" stroke="${col}" data-c="${ring}" stroke-dasharray="${(x*ring).toFixed(1)} ${ring}" transform="rotate(-90)"/><g class="v1812m-shield" transform="translate(-18 -20.7)">${crest(s,36)}</g>`;
  return `<g class="${cls}" data-t="${t.id}" style="--i:${ctx.n=(ctx.n||0)+1}" tabindex="0" role="button" aria-label="${esc(aria)}"><title>${esc(aria)}</title><circle class="v1812m-hit" r="34"/><circle class="v1812m-halo" r="${rr+6}"/><circle class="v1812m-burst" r="${rr}"/><g class="v1812m-pop">${body}</g>${held?`<circle class="v1812m-held" r="${rr+3.5}" stroke="${col}"/>`:''}
    <text class="v1812m-lbl" y="${rr+19}">${esc(label)}</text><text class="v1812m-pct" y="${rr+32}">${pc>0?pc+'%':''}</text>${ctx.next===t.id?`<g class="v1812m-tag" transform="translate(0 ${-rr-12})"><rect x="-19" y="-9" width="38" height="16" rx="8"/><text y="3">NEXT</text></g>`:''}</g>`; }
function v1812mSVG(C,st,geo,dark,seen){ const u=C.userSid; const F=v1812mFriday(C); const next=F.kind==='lg'?F.opp:null; const ctx={next,flip:[],lost:[]};
  if(seen&&seen.S){ for(const t of geo.towns){ const a=(seen.S[t.id]&&seen.S[t.id][u])||0, b=st.S[t.id][u]||0; if(a<V1812M.HELD&&b>=V1812M.HELD) ctx.flip.push(t.id); else if(a>=V1812M.HELD&&b<V1812M.HELD) ctx.lost.push(t.id); } }
  const cols={}; for(const sid of C.league) cols[sid]=v1812mCol(C,sid,dark);
  const defs=C.league.map(sid=>`<radialGradient id="v1812m-g-${sid}"><stop offset="0" stop-color="${cols[sid]}" stop-opacity="1"/><stop offset=".5" stop-color="${cols[sid]}" stop-opacity=".5"/><stop offset="1" stop-color="${cols[sid]}" stop-opacity="0"/></radialGradient>`).join('');
  const order=C.league.slice().sort((a,b)=>(a===u?1:b===u?-1:0)||(a<b?-1:1)); let glows='';
  for(const sid of order) for(const t of geo.towns){ const x1=st.S[t.id][sid]||0, x0=seen&&seen.S?((seen.S[t.id]&&seen.S[t.id][sid])||0):x1; if(Math.max(x0,x1)<0.05) continue; const a=v1812mGlowAttrs(geo,t.id,sid,x1);
    glows+=`<circle class="v1812m-g" data-t="${t.id}" data-s="${sid}" data-x0="${x0.toFixed(3)}" data-x1="${x1.toFixed(3)}" cx="${a.cx.toFixed(1)}" cy="${a.cy.toFixed(1)}" r="${a.r.toFixed(1)}" opacity="${a.o.toFixed(3)}" fill="url(#v1812m-g-${sid})"/>`; }
  let rib='', roads='';
  for(const e of geo.edges){ const oa=st.owner[e.a], ob=st.owner[e.b]; const sa=st.S[e.a][oa]||0, sb=st.S[e.b][ob]||0; if(oa&&oa===ob&&sa>=0.5&&sb>=0.5) rib+=`<path class="v1812m-rib" d="${e.d}" stroke="${cols[oa]}"/>`; roads+=`<path class="v1812m-road" d="${e.d}"/>`; }
  let dby=''; for(const k in geo.derby){ const d=geo.derby[k]; const mine=d.a===u||d.b===u; const col=cols[u]; dby+=d.edges.map(id=>`<path class="v1812m-dby ${mine?'v1812m-mine':''}" d="${geo.emap[id].d}" ${mine?`stroke="${col}"`:''}/>`).join(''); }
  const marks=geo.towns.map(t=>v1812mMark(C,t,st,dark,ctx)).join('');
  const ham=geo.hamlets.map((h,i)=>`<g class="v1812m-hm" data-x="${h.x}" data-y="${h.y}"><circle r="2.4"/><text x="${h.s>0?7:-7}" y="3.5" text-anchor="${h.s>0?'start':'end'}">${esc(h.name)}</text></g>`).join('');
  const dl=Object.values(geo.derby).filter(d=>d.a===u||d.b===u).map(d=>`<g class="v1812m-dl" data-x="${d.lab.x}" data-y="${d.lab.y}" data-r="${d.ang}" data-len="${d.len}" data-mi="${d.mi}"><rect rx="9" ry="9" height="18" fill="${cols[u]}"/><text y="12.5" style="fill:${lum(cols[u])>0.42?'#10141a':'#ffffff'}">Derby road · ${d.mi} mi</text></g>`).join('');
  const rm=geo.edges.map(e=>`<g class="v1812m-rm" data-x="${e.mid.x}" data-y="${e.mid.y}"><text>${e.mi} mi</text></g>`).join('');
  return `<svg class="v1812m-svg" id="v1812m-svg" role="group" aria-label="County map: ${st.reach} of ${st.total} towns held" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>
   <g id="v1812m-world"><g class="v1812m-ct">${geo.contours.map(c=>`<path class="${c.major?'v1812m-maj':''}" d="${c.d}"/>`).join('')}</g>
    <path class="v1812m-river v1812m-bank" d="${geo.river.d}"/><path class="v1812m-river v1812m-bank v1812m-tri" d="${geo.river.tri}"/><path class="v1812m-lake" d="${geo.lake.d}"/><path class="v1812m-river" d="${geo.river.d}"/><path class="v1812m-river v1812m-tri" d="${geo.river.tri}"/>
    <g class="v1812m-gl">${glows}</g><g class="v1812m-ribs">${rib}</g><g class="v1812m-roads">${roads}</g><g class="v1812m-dbys">${dby}</g></g>
   <g id="v1812m-sg"><g class="v1812m-rms">${rm}</g><g class="v1812m-hms">${ham}</g><g class="v1812m-dls">${dl}</g><g class="v1812m-mks">${marks}</g></g></svg>`; }

/* ---------- the side panel ---------- */
function v1812mRowHTML(C,t,st,dark){ const sh=st.S[t.id], x=sh[C.userSid]||0, pc=Math.round(x*100), s=t.sat?null:C.schools[t.id];
  return `<button class="v1812m-row ${x>=V1812M.HELD?'v1812m-isheld':''} ${V1812M.sel===t.id?'v1812m-issel':''}" data-a="v1812mPick" data-t="${t.id}"><span class="v1812m-rt">${s?crest(s,20):'<i class="v1812m-sdot"></i>'}<b>${esc(t.name)}</b>${t.user?'<em>home</em>':''}</span><span class="v1812m-rp">${pc}%</span>${v1812mStack(C,sh,dark)}</button>`; }
function v1812mReachHTML(C,st,geo,dark){ const u=C.userSid; const rows=geo.towns.slice().sort((a,b)=>((st.S[b.id][u]||0)-(st.S[a.id][u]||0))||(a.name<b.name?-1:1)); const d=st.delta;
  return `<section class="v1812m-card v1812m-reach"><div class="v1812m-eb">Program reach</div><div class="v1812m-big"><b>${st.reach}</b><span>OF ${st.total} TOWNS</span><em class="${d>0?'v1812m-up':d<0?'v1812m-dn':''}">${d>0?'+'+d+' this season':d<0?'−'+(-d)+' this season':'steady this season'}</em></div>
   <div class="v1812m-rows">${rows.map(t=>v1812mRowHTML(C,t,st,dark)).join('')}</div></section>`; }
function v1812mSplit(C,aSid,bSid,sh,dark){ const a=sh[aSid]||0, b=bSid?(sh[bSid]||0):0; return `<span class="v1812m-split" aria-hidden="true"><i style="width:${(a*100).toFixed(1)}%;background:${v1812mCol(C,aSid,dark)}"></i><i style="width:${(b*100).toFixed(1)}%;background:${bSid?v1812mCol(C,bSid,dark):'transparent'}"></i></span>`; }
function v1812mFridayHTML(C,st,geo,dark){ const F=v1812mFriday(C), u=C.userSid; const text=v1812mFridayText(C,F); let head='', foot='', bar='';
  if(F.kind==='lg'){ const o=C.schools[F.opp]; head=F.away?`At ${esc(geo.tmap[F.t].name)}`:`Home to ${esc(o.town)}`; const ow=st.owner[F.t]!==u?st.owner[F.t]:null;
    bar=`<div class="v1812m-fb"><span>${F.away?esc(o.town):'Now'}</span>${v1812mSplit(C,u,ow,st.S[F.t],dark)}<b>${Math.round(F.before*100)}%</b><i>→</i><b class="v1812m-up">${Math.round(F.after*100)}%</b></div>`;
    foot=`<div class="v1812m-act"><button class="btn sm" data-a="v1812mPick" data-t="${F.t}">Show on map</button><button class="btn sm ghost" data-a="openFixture" data-id="${F.f.id}">Match preview</button></div>`;
    if(F.derby) head+=` <span class="v1812m-dtag">${icon('v1812mmap',12)} Derby · ${F.derby.mi} mi</span>`; }
  else if(F.kind==='off'){ head='Scouting Camp'; foot=`<div class="v1812m-act"><button class="btn sm" data-a="go" data-r="camp">Open the camp</button></div>`; }
  else head=F.kind==='out'?'Outside the county':'Rest week';
  return `<section class="v1812m-card v1812m-fri"><div class="v1812m-eb">${F.kind==='off'?'Next up':'This Friday'}</div><h3>${head}</h3><p>${text}</p>${bar}${foot}</section>`; }
function v1812mWarriorHTML(C,geo){ const W=v1812mWarrior(C); const chips=W.need.map(id=>{ const on=!!C.map.rw[id]; return `<button class="v1812m-wchip ${on?'v1812m-on':''}" data-a="v1812mPick" data-t="${id}" aria-label="${esc(C.schools[id].town)}: ${on?'won there':'not won there yet'}">${on?'✓ ':''}${esc(C.schools[id].town)}</button>`; }).join('');
  return `<section class="v1812m-card v1812m-rw ${W.done?'v1812m-done':''}"><div class="v1812m-eb">Road Warrior</div><h3>${W.done?`Earned in ${W.info.yr}`:`${W.have.length} of ${W.need.length} grounds won`}</h3><p>Win in every town in the county: one victory at each of the ${W.need.length} other grounds, in any season.</p><div class="v1812m-wc">${chips}</div></section>`; }
function v1812mBulletsHTML(){ return `<ul class="v1812m-bul"><li>${icon('binoc',16)}<span><b>Scouting Camp prospects</b> come from towns you hold: the firmer your grip, the more kids.</span></li><li>${icon('v1812mflag',16)}<span><b>Neighbours turn into natural rivals.</b> A short road between towns makes a derby.</span></li><li>${icon('trophy',16)}<span><b>Road Warrior:</b> win in every town in the county.</span></li></ul>`; }
function v1812mTownHTML(C,tid,st,geo,dark){ const t=geo.tmap[tid]; if(!t) return ''; const u=C.userSid, sh=st.S[tid], pc=st.pct[tid]; const ks=Object.keys(pc).sort((a,b)=>(sh[b]-sh[a])||(a<b?-1:1)).filter(k=>pc[k]>=1).slice(0,5);
  const x=sh[u]||0, held=x>=V1812M.HELD, s=t.sat?null:C.schools[tid], ow=st.owner[tid]; const rec=!t.sat&&tid!==u?v1812mRecord(C,tid):null; const mi=tid===u?0:geo.mi(u,tid); const dby=!t.sat&&tid!==u?v1812mDerbyOf(C,u,tid):null;
  const F=v1812mFriday(C); const nf=F.kind==='lg'&&tid!==u&&(F.f.h===tid||F.f.a===tid)?F.f:null; const pipe=v1812mPipeline(C,tid); const won=!t.sat&&tid!==u&&C.map.rw[tid];
  const status=held?`You hold ${tid===u?'your home town':'this town'}: ${Math.round(x*100)}%`:(ow&&ow!==u&&C.schools[ow]?`${esc(C.schools[ow].town)} hold it at ${pc[ow]}%, you have ${Math.round(x*100)}%`:`Nobody holds it yet: you have ${Math.round(x*100)}%`);
  const last=rec&&rec.last?`${rec.last.w===u?'W':rec.last.w?'L':'D'} ${rec.last.h===u?rec.last.hg:rec.last.ag}–${rec.last.h===u?rec.last.ag:rec.last.hg}`:'';
  const pl=pipe.list.length?pipe.list.map(x=>esc(x.p.fn+' '+x.p.ln)).join(', '):'';
  return `<section class="v1812m-card v1812m-town" id="v1812m-town"><div class="v1812m-th">${s?crest(s,40):'<span class="v1812m-satbig"></span>'}<div class="grow"><h3>${esc(t.name)}</h3><small>${s?esc(s.mascot)+' · '+(tid===u?'your program':'rival program'):'County town · no varsity program'}</small></div><button class="v1812m-x" data-a="v1812mClose" aria-label="Close town panel">×</button></div>
   <p class="v1812m-st ${held?'v1812m-good':''}">${status}</p>${v1812mStack(C,sh,dark,1)}
   <div class="v1812m-leg">${ks.map(k=>`<span><i style="background:${v1812mCol(C,k,dark)}"></i>${esc(C.schools[k].town)}${k===u?' (you)':''}<b>${pc[k]}%</b></span>`).join('')}</div>
   <dl class="v1812m-facts">
    <div><dt>By road</dt><dd>${tid===u?'Home':mi+' mi'}${dby?` <span class="v1812m-dtag">Derby</span>`:''}</dd></div>
    ${rec?`<div><dt>Record vs them</dt><dd>${rec.w}-${rec.d}-${rec.l}${last?` <small>last ${last}</small>`:''}</dd></div>`:''}
    <div><dt>Next game</dt><dd>${nf?`${nf.h===u?'Home':'At '+esc(t.name)} · <button class="link" data-a="openFixture" data-id="${nf.id}">Preview</button>`:'—'}</dd></div>
    ${!t.sat&&tid!==u?`<div><dt>Rivalry</dt><dd>${dby?`Derby on ${esc(dby.name)}, ${dby.mi} mi`:'Not neighbours'}${isRivalry(C,u,tid)==='heated'?' · <b>Heated rivalry</b>':isRivalry(C,u,tid)==='seasonal'?' · Seasonal rival':''}</dd></div>`:''}
    <div><dt>Scouting pipeline</dt><dd>${pipe.held?`Sends ${v1812mPlural(pipe.n,'kid')} to your camp${pl?`: ${pl}`:''}`:'Hold the town to open it'}</dd></div>
    ${!t.sat&&tid!==u?`<div><dt>Road Warrior</dt><dd>${won?`✓ Won there (${won})`:'Win there to tick it off'}</dd></div>`:''}</dl></section>`; }

/* ---------- the view ---------- */
ICON.v1812mflag='<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>';
function v1812mCompass(){ return `<svg viewBox="-30 -30 60 60" width="54" height="54" aria-hidden="true"><circle r="25" class="v1812m-cring"/><path class="v1812m-cn" d="M0 -22 L5 0 L0 -4 L-5 0Z"/><path class="v1812m-cs" d="M0 22 L5 0 L0 4 L-5 0Z"/><path class="v1812m-ct2" d="M-22 0H-8M8 0H22"/><text y="-26.5" text-anchor="middle">N</text></svg>`; }
VIEWS.countymap=()=>{ const C=App.C; v1812mEnsure(C); const geo=v1812mGeo(C), st=v1812mState(C), B=v1812mBox(C), dark=v1812mDark(); const seen=B.seen&&B.seen.S?B.seen:null;
  if(V1812M.sel&&!geo.tmap[V1812M.sel]) V1812M.sel=null;
  return `<div class="v1812m ${dark?'':'v1812m-light'} ${V1812M.enterNow?'v1812m-enter':''}" id="v1812m" style="--mu:${v1812mCol(C,C.userSid,dark)}"><div class="v1812m-stage" id="v1812m-stage">${v1812mSVG(C,st,geo,dark,seen)}
    <div class="v1812m-hdr"><span class="v1812m-kick">LEAGUE WORLD${B.vis<=3?' · NEW':''}</span><small>Your league laid out as real towns, roads and rivalries. Win and your colours spread town to town; the towns you hold send you their best kids.</small></div>
    <div class="v1812m-tools" role="group" aria-label="Map controls"><button data-a="v1812mZoom" data-d="in" aria-label="Zoom in">+</button><button data-a="v1812mZoom" data-d="out" aria-label="Zoom out">−</button><button data-a="v1812mZoom" data-d="you" aria-label="Centre on your town">${icon('shield',16)}</button><button data-a="v1812mZoom" data-d="fit" aria-label="Show the whole county">${icon('v1812mmap',16)}</button></div>
    <div class="v1812m-compass">${v1812mCompass()}</div><div class="v1812m-scale" id="v1812m-scale"></div>
    <div class="v1812m-key" aria-hidden="true"><span><i class="you"></i>Your colours</span><span><i class="held"></i>Held (50%+)</span><span><i class="dby"></i>Derby road</span></div>
    <div class="v1812m-co" id="v1812m-co" hidden></div></div>
   <aside class="v1812m-side" aria-label="County details"><div id="v1812m-tp">${V1812M.sel?v1812mTownHTML(C,V1812M.sel,st,geo,dark):''}</div>${v1812mReachHTML(C,st,geo,dark)}${v1812mFridayHTML(C,st,geo,dark)}${v1812mWarriorHTML(C,geo)}${v1812mBulletsHTML()}</aside></div>`; };

function v1812mReduced(){ try{ return reducedMotion(); }catch(e){ return false; } }
function v1812mFitK(E){ return Math.min(E.cw/V1812M.W,E.ch/V1812M.H)*0.96; }
function v1812mKRange(E){ return [Math.max(0.2,v1812mFitK(E)*0.85),3.6]; }
function v1812mClampView(E){ const V=V1812M.view, k=V.k; const mx=Math.min(140,E.cw*0.3), my=Math.min(120,E.ch*0.3); V.x=Math.max(mx-V1812M.W*k,Math.min(E.cw-mx,V.x)); V.y=Math.max(my-V1812M.H*k,Math.min(E.ch-my,V.y)); }
function v1812mViewFor(E,mode,geo,C){ const fit=v1812mFitK(E); const u=geo.tmap[C.userSid]; let k=fit;
  if(mode==='you'){ k=Math.max(fit,E.cw<720?0.78:0.95); return {k,x:E.cw*(E.cw<720?0.4:0.4)-u.x*k,y:E.ch*0.5-u.y*k}; }
  if(mode==='init'&&E.cw<720){ k=Math.max(fit,0.7); return {k,x:E.cw*0.4-u.x*k,y:E.ch*0.5-u.y*k}; }
  return {k,x:(E.cw-V1812M.W*k)/2,y:(E.ch-V1812M.H*k)/2}; }
function v1812mPlaceAll(){ const E=V1812M.el; if(!E||!E.svg.isConnected) return; const V=V1812M.view, k=V.k;
  E.world.setAttribute('transform',`translate(${V.x.toFixed(2)} ${V.y.toFixed(2)}) scale(${k.toFixed(4)})`);
  for(const it of E.items) it.el.setAttribute('transform',`translate(${(it.x*k+V.x).toFixed(1)} ${(it.y*k+V.y).toFixed(1)})${it.r?` rotate(${it.r})`:''}`);
  for(const it of E.items){ if(!it.len) continue; const px=it.len*k; const mode=px>=330?'f':px>=235?'s':px>=170?'t':'x'; if(mode!==it.mode){ it.mode=mode; const g=it.el; if(mode==='x'){ g.style.display='none'; } else { g.style.display=''; const txt=mode==='f'?'Derby road \u00b7 '+it.mi+' mi':mode==='s'?'Derby \u00b7 '+it.mi+' mi':it.mi+' mi'; const tx=g.querySelector('text'), r=g.querySelector('rect'); tx.textContent=txt; const w=txt.length*6.6+18; r.setAttribute('width',w); r.setAttribute('x',-w/2); r.setAttribute('y',-9); tx.setAttribute('x',0); tx.setAttribute('y',3.6); } } }
  E.svg.classList.toggle('v1812m-zlo',k<0.72); E.svg.classList.toggle('v1812m-zhi',k>1.25);
  const miles=[2,5,10,20,50]; let mi=2; for(const m of miles) if(m/V1812M.MI*k<=150) mi=m; const px=mi/V1812M.MI*k; const sc=document.getElementById('v1812m-scale'); if(sc){ sc.style.width=px.toFixed(0)+'px'; sc.innerHTML=`<i></i><span>0</span><span>${mi} mi</span>`; }
  v1812mPlaceCallout(); }
function v1812mSchedule(){ const E=V1812M.el; if(!E||E.raf) return; E.raf=requestAnimationFrame(()=>{ E.raf=0; v1812mPlaceAll(); }); }
function v1812mTween(to,ms){ const E=V1812M.el; if(!E) return; const V=V1812M.view; cancelAnimationFrame(E.tw); const from={k:V.k,x:V.x,y:V.y};
  if(v1812mReduced()||!ms){ Object.assign(V,to); v1812mClampView(E); v1812mPlaceAll(); return; }
  const t0=performance.now(); const step=now=>{ const p=Math.min(1,(now-t0)/ms), e=1-Math.pow(1-p,3); V.k=from.k+(to.k-from.k)*e; V.x=from.x+(to.x-from.x)*e; V.y=from.y+(to.y-from.y)*e; v1812mPlaceAll(); if(p<1) E.tw=requestAnimationFrame(step); else v1812mClampView(E); }; E.tw=requestAnimationFrame(step); }
function v1812mZoomAt(f,cx,cy){ const E=V1812M.el; if(!E) return; const V=V1812M.view; const [lo,hi]=v1812mKRange(E); const nk=Math.max(lo,Math.min(hi,V.k*f)); const r=nk/V.k; V.x=cx-(cx-V.x)*r; V.y=cy-(cy-V.y)*r; V.k=nk; v1812mClampView(E); v1812mSchedule(); }

/* the callout bubble on a town: the selected one, or the one you play next */
function v1812mCalloutTarget(C,st){ if(V1812M.sel) return V1812M.sel; const F=v1812mFriday(C); if(F.kind!=='lg') return null; if(F.flips.length) return F.flips.includes(F.t)?F.t:F.flips[0]; return F.away&&F.after-F.before>=0.08?F.t:null; }
function v1812mCalloutHTML(C,tid,st,geo,dark){ const t=geo.tmap[tid]; const u=C.userSid, x=st.S[tid][u]||0, ow=st.owner[tid]!==u?st.owner[tid]:null; const F=v1812mFriday(C); const me=C.schools[u]; const own=ow&&C.schools[ow];
  const fl=F.kind==='lg'&&F.flips.includes(tid)&&x<V1812M.HELD; const pu=Math.round(x*100), po=own?Math.round((st.S[tid][ow]||0)*100):0; const venue=F.kind==='lg'?geo.tmap[F.t].name:'';
  let title, body;
  if(x>=V1812M.HELD){ title=`${esc(t.name)} flies your colours`; body=`${pu}% ${esc(me.mascot)}${own?`, ${po}% ${esc(own.mascot)}`:''}. ${tid===u?'Your home town.':'Hold it and its kids come to your camp.'}`; }
  else if(fl){ title=`${esc(t.name)} is up for grabs`; body=`${pu}% ${esc(me.mascot)}${own?`, ${po}% ${esc(own.mascot)}`:''}. ${tid===F.t?'Win there Friday':'Win '+(F.away?'at '+esc(venue):'at home')+' Friday'} and the town flips.`; }
  else { title=esc(t.name); body=`${pu}% ${esc(me.mascot)}${own?`, ${po}% ${esc(own.mascot)}`:''}${F.kind==='lg'&&F.t===tid?`. A win Friday takes it to ${Math.round(F.after*100)}%.`:'.'}`; }
  return `<b>${title}</b><p>${body}</p>${v1812mSplit(C,u,ow,st.S[tid],dark)}`; }
function v1812mPlaceCallout(){ const E=V1812M.el, C=App.C; if(!E||!C) return; const el=document.getElementById('v1812m-co'); if(!el) return; const st=v1812mState(C), geo=v1812mGeo(C); const tid=v1812mCalloutTarget(C,st);
  document.querySelectorAll('.v1812m-ctarget').forEach(m=>{ if(m.dataset.t!==tid) m.classList.remove('v1812m-ctarget'); }); if(tid){ const mk=document.querySelector(`.v1812m-mk[data-t="${tid}"]`); if(mk) mk.classList.add('v1812m-ctarget'); }
  if(!tid){ el.hidden=true; return; } const t=geo.tmap[tid], V=V1812M.view; const sx=t.x*V.k+V.x, sy=t.y*V.k+V.y; if(sx<-20||sy<-20||sx>E.cw+20||sy>E.ch+20){ el.hidden=true; return; }
  if(el.dataset.t!==tid||el.dataset.k!==String(st.reach+'|'+Object.keys(C.map.done).length)){ el.innerHTML=v1812mCalloutHTML(C,tid,st,geo,v1812mDark()); el.dataset.t=tid; el.dataset.k=String(st.reach+'|'+Object.keys(C.map.done).length); }
  el.hidden=false; const w=Math.min(250,E.cw-20); el.style.width=w+'px'; el.style.transform='none'; const h=el.offsetHeight; const rr=t.sat?13:25;
  /* six places (above or below, centred or leaning left or right); take the one that covers the fewest other towns and stays on the map */
  const boxes=geo.towns.filter(o=>o.id!==tid).map(o=>({x:o.x*V.k+V.x,y:o.y*V.k+V.y,s:o.sat?0:1})); let best=null;
  for(const side of ['above','below']) for(const gap of [0,44]) for(const dx of [0,-(w/2-34),(w/2-34)]){ const left=Math.max(8,Math.min(E.cw-w-66,sx-w/2+dx)); const top=side==='above'?sy-(rr+(t.sat?16:22))-h-6-gap:sy+rr+(t.sat?22:38)+gap;
    let pen=0; if(top<6) pen+=(6-top)*40; if(top+h>E.ch-6) pen+=(top+h-(E.ch-6))*40; if(sx<left+14||sx>left+w-14) pen+=900;
    for(const o of boxes){ const ox=Math.max(0,Math.min(left+w,o.x+(o.s?52:44))-Math.max(left,o.x-(o.s?52:44))), oy=Math.max(0,Math.min(top+h,o.y+(o.s?50:34))-Math.max(top,o.y-(o.s?52:22))); pen+=ox*oy*(o.s?4:2); }
    pen+=Math.abs(dx)*0.3+gap*1.5+(side==='below'?8:0); if(!best||pen<best.pen) best={pen,left,top,side,gap}; }
  el.style.left=best.left.toFixed(0)+'px'; el.style.top=best.top.toFixed(0)+'px'; el.classList.toggle('v1812m-below',best.side==='below'&&best.gap===0); el.classList.toggle('v1812m-float',best.gap>0); el.style.setProperty('--ax',(sx-best.left).toFixed(0)+'px'); }

/* choose a town (a tap on the map, a row in the panel) */
function v1812mSelect(tid,pan){ const C=App.C, E=V1812M.el; V1812M.sel=tid||null; const geo=v1812mGeo(C), st=v1812mState(C), dark=v1812mDark();
  document.querySelectorAll('.v1812m-mk.v1812m-issel,.v1812m-row.v1812m-issel').forEach(el=>el.classList.remove('v1812m-issel')); if(tid){ document.querySelectorAll(`.v1812m-mk[data-t="${tid}"],.v1812m-row[data-t="${tid}"]`).forEach(el=>el.classList.add('v1812m-issel')); }
  const tp=document.getElementById('v1812m-tp'); if(tp) tp.innerHTML=tid?v1812mTownHTML(C,tid,st,geo,dark):'';
  if(E&&tid&&pan){ const t=geo.tmap[tid], V=V1812M.view; const sx=t.x*V.k+V.x, sy=t.y*V.k+V.y; if(sx<70||sy<70||sx>E.cw-70||sy>E.ch-70||V.k<0.6){ const k=Math.max(V.k,0.9); v1812mTween({k,x:E.cw*0.5-t.x*k,y:E.ch*0.5-t.y*k},420); } }
  v1812mPlaceCallout();
  if(tid&&tp&&window.innerWidth<980){ const r=tp.getBoundingClientRect(); if(r.top>window.innerHeight*0.7||r.bottom<0){ try{ tp.scrollIntoView({block:'nearest',behavior:v1812mReduced()?'auto':'smooth'}); }catch(e){} } } }
A.v1812mPick=el=>{ v1812mSelect(el.dataset.t,true); };
A.v1812mClose=()=>{ v1812mSelect(null); };
A.v1812mZoom=el=>{ const E=V1812M.el, C=App.C; if(!E) return; const d=el.dataset.d, V=V1812M.view, geo=v1812mGeo(C);
  if(d==='in'||d==='out'){ const [lo,hi]=v1812mKRange(E); const nk=Math.max(lo,Math.min(hi,V.k*(d==='in'?1.45:1/1.45))); const r=nk/V.k, cx=E.cw/2, cy=E.ch/2; v1812mTween({k:nk,x:cx-(cx-V.x)*r,y:cy-(cy-V.y)*r},260); }
  else v1812mTween(v1812mViewFor(E,d,geo,C),420); };
A.v1812mOpen=()=>{ App.modal=null; try{ renderModal(); }catch(e){} A.go({dataset:{r:'countymap'}}); };

/* the territory glows ease from the last state you looked at to the one the results made */
function v1812mAnimate(from,reduced){ const E=V1812M.el; if(!E) return; const geo=v1812mGeo(App.C); const gl=[...E.world.querySelectorAll('.v1812m-g')], rg=[...E.svg.querySelectorAll('.v1812m-rg')]; const C=App.C, u=C.userSid, st=v1812mState(C);
  const apply=e=>{ for(const c of gl){ const x0=+c.dataset.x0, x1=+c.dataset.x1; const x=x0+(x1-x0)*e; const a=v1812mGlowAttrs(geo,c.dataset.t,c.dataset.s,x); c.setAttribute('cx',a.cx.toFixed(1)); c.setAttribute('cy',a.cy.toFixed(1)); c.setAttribute('r',a.r.toFixed(1)); c.setAttribute('opacity',a.o.toFixed(3)); }
    for(const r of rg){ const tid=r.closest('.v1812m-mk').dataset.t, c=+r.dataset.c; const x1=st.S[tid][u]||0, x0=(from&&from.S&&from.S[tid]&&from.S[tid][u])||0; const x=from?x0+(x1-x0)*e:x1; r.setAttribute('stroke-dasharray',(x*c).toFixed(1)+' '+c); } };
  cancelAnimationFrame(E.an); const changed=from&&gl.some(c=>Math.abs(+c.dataset.x1-+c.dataset.x0)>0.004);
  if(!changed||reduced){ apply(1); E.svg.classList.add('v1812m-ready'); return; }
  apply(0); E.svg.classList.add('v1812m-ready'); const t0=performance.now()+260, dur=1700; const step=now=>{ if(!E.svg.isConnected) return; const p=Math.max(0,Math.min(1,(now-t0)/dur)); apply(1-Math.pow(1-p,3)); if(p<1) E.an=requestAnimationFrame(step); }; E.an=requestAnimationFrame(step); }

function v1812mInit(){ const C=App.C; const stage=document.getElementById('v1812m-stage'); if(!stage) return; const svg=stage.querySelector('#v1812m-svg'); if(!svg) return; const geo=v1812mGeo(C), st=v1812mState(C), B=v1812mBox(C); const seen=B.seen&&B.seen.S?B.seen:null;
  if(V1812M.el&&V1812M.el.ro) V1812M.el.ro.disconnect(); cancelAnimationFrame(V1812M.el&&V1812M.el.an); cancelAnimationFrame(V1812M.el&&V1812M.el.tw);
  const E=V1812M.el={stage,svg,world:svg.querySelector('#v1812m-world'),items:[],cw:0,ch:0,raf:0,an:0,tw:0,ro:null};
  const pt=(el)=>({el,x:+el.dataset.x,y:+el.dataset.y,r:el.dataset.r?+el.dataset.r:0}); svg.querySelectorAll('.v1812m-mk').forEach(el=>{ const t=geo.tmap[el.dataset.t]; E.items.push({el,x:t.x,y:t.y}); });
  svg.querySelectorAll('.v1812m-hm,.v1812m-rm,.v1812m-dl').forEach(el=>E.items.push(pt(el)));
  E.items.filter(it=>it.el.classList.contains('v1812m-dl')).forEach(it=>{ it.len=+it.el.dataset.len; it.mi=it.el.dataset.mi; it.mode=''; });
  const measure=()=>{ const r=stage.getBoundingClientRect(); E.cw=Math.max(200,r.width); E.ch=Math.max(260,r.height); svg.setAttribute('viewBox',`0 0 ${E.cw.toFixed(0)} ${E.ch.toFixed(0)}`); };
  measure(); const key=C.seed+'|'+(E.cw<720?'s':'l'); if(!V1812M.view||V1812M.view.key!==key){ V1812M.view=Object.assign(v1812mViewFor(E,'init',geo,C),{key}); } v1812mClampView(E); v1812mPlaceAll();
  if(typeof ResizeObserver==='function'){ E.ro=new ResizeObserver(()=>{ const ow=E.cw, oh=E.ch; measure(); if(Math.abs(ow-E.cw)>2||Math.abs(oh-E.ch)>2){ const V=V1812M.view; V.x+=(E.cw-ow)/2; V.y+=(E.ch-oh)/2; v1812mClampView(E); v1812mPlaceAll(); } }); E.ro.observe(stage); }
  /* pointers: drag to pan, wheel and pinch to zoom, tap a town */
  const P=new Map(); let drag=null, pinch=null, tap=null; const V=()=>V1812M.view;
  svg.addEventListener('pointerdown',ev=>{ if(ev.button>0) return; try{ svg.setPointerCapture(ev.pointerId); }catch(e){} cancelAnimationFrame(E.tw); P.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(P.size===1){ drag={x:ev.clientX,y:ev.clientY,vx:V().x,vy:V().y,moved:false}; tap={t:ev.target.closest?ev.target.closest('.v1812m-mk'):null,at:performance.now()}; }
    else if(P.size===2){ const [a,b]=[...P.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,k:V().k,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,vx:V().x,vy:V().y}; drag=null; tap=null; } });
  svg.addEventListener('pointermove',ev=>{ if(!P.has(ev.pointerId)) return; P.set(ev.pointerId,{x:ev.clientX,y:ev.clientY}); const r=svg.getBoundingClientRect();
    if(P.size===2&&pinch){ const [a,b]=[...P.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y)||1, mx=(a.x+b.x)/2-r.left, my=(a.y+b.y)/2-r.top; const [lo,hi]=v1812mKRange(E); const nk=Math.max(lo,Math.min(hi,pinch.k*d/pinch.d)); const rr=nk/pinch.k; const pmx=pinch.mx-r.left, pmy=pinch.my-r.top;
      V().k=nk; V().x=mx-(pmx-pinch.vx)*rr; V().y=my-(pmy-pinch.vy)*rr; v1812mClampView(E); v1812mSchedule(); }
    else if(drag){ const dx=ev.clientX-drag.x, dy=ev.clientY-drag.y; if(!drag.moved&&Math.hypot(dx,dy)>6){ drag.moved=true; svg.classList.add('v1812m-panning'); } if(drag.moved){ V().x=drag.vx+dx; V().y=drag.vy+dy; v1812mClampView(E); v1812mSchedule(); } } });
  const up=ev=>{ if(!P.has(ev.pointerId)) return; P.delete(ev.pointerId); if(P.size<2) pinch=null; if(P.size===0){ if(tap&&drag&&!drag.moved&&performance.now()-tap.at<700){ v1812mSelect(tap.t?tap.t.dataset.t:null,false); } drag=null; tap=null; svg.classList.remove('v1812m-panning'); } };
  svg.addEventListener('pointerup',up); svg.addEventListener('pointercancel',up);
  svg.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=svg.getBoundingClientRect(); v1812mZoomAt(Math.exp(-ev.deltaY*(ev.ctrlKey?0.01:0.0017)),ev.clientX-r.left,ev.clientY-r.top); },{passive:false});
  svg.addEventListener('dblclick',ev=>{ const r=svg.getBoundingClientRect(); v1812mZoomAt(1.6,ev.clientX-r.left,ev.clientY-r.top); });
  svg.addEventListener('keydown',ev=>{ const m=ev.target.closest&&ev.target.closest('.v1812m-mk'); if(m&&(ev.key==='Enter'||ev.key===' ')){ ev.preventDefault(); v1812mSelect(m.dataset.t,true); return; }
    const mv={ArrowLeft:[70,0],ArrowRight:[-70,0],ArrowUp:[0,70],ArrowDown:[0,-70]}[ev.key]; if(mv){ ev.preventDefault(); V().x+=mv[0]; V().y+=mv[1]; v1812mClampView(E); v1812mSchedule(); } else if(ev.key==='+'||ev.key==='='){ ev.preventDefault(); v1812mZoomAt(1.3,E.cw/2,E.ch/2); } else if(ev.key==='-'){ ev.preventDefault(); v1812mZoomAt(1/1.3,E.cw/2,E.ch/2); } else if(ev.key==='Escape'&&V1812M.sel){ v1812mSelect(null); } });
  v1812mAnimate(seen,v1812mReduced()); B.nv=0; const snap=v1812mSnap(C); const same=seen&&JSON.stringify(seen.S)===JSON.stringify(snap.S); if(!same){ B.seen=snap; queueSave(); }
  v1812mPlaceCallout(); }
function v1812mLeave(){ const E=V1812M.el; if(!E) return; if(E.ro) E.ro.disconnect(); cancelAnimationFrame(E.an); cancelAnimationFrame(E.tw); cancelAnimationFrame(E.raf); V1812M.el=null; }

/* ---------- the Overview teaser, the results strip, the camp, the Hall of Fame ---------- */
function v1812mThumb(C,st,geo,dark){ const u=C.userSid; const cols={}; for(const sid of C.league) cols[sid]=v1812mCol(C,sid,dark);
  const glow=geo.towns.map(t=>{ const x=st.S[t.id][u]||0; return x>=0.12?`<circle cx="${t.x}" cy="${t.y}" r="${(40+90*Math.sqrt(x)).toFixed(0)}" fill="${cols[u]}" opacity="${(0.1+0.4*x).toFixed(2)}"/>`:''; }).join('');
  const roads=geo.edges.map(e=>`<path d="${e.d}"/>`).join(''); const dots=geo.towns.map(t=>{ const x=st.S[t.id][u]||0, ow=st.owner[t.id]; return `<circle cx="${t.x}" cy="${t.y}" r="${t.user?22:t.sat?11:17}" fill="${x>=V1812M.HELD?cols[u]:ow&&cols[ow]?cols[ow]:'#889'}" class="${x>=V1812M.HELD?'v1812m-th2':'v1812m-to'}"/>`; }).join('');
  return `<svg class="v1812m-thumb ${dark?'':'v1812m-light'}" viewBox="0 0 ${geo.W} ${geo.H}" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><path class="v1812m-tw" d="${geo.lake.d}"/><path class="v1812m-tw v1812m-tws" d="${geo.river.d}"/>${glow}<g class="v1812m-trd">${roads}</g>${dots}</svg>`; }
function v1812mTeaser(C){ const geo=v1812mGeo(C), st=v1812mState(C), dark=v1812mDark(), F=v1812mFriday(C); const d=st.delta;
  const line=F.kind==='lg'?(F.flips.length?`${F.away?'At':'Home vs'} ${esc(geo.tmap[F.t].name)}: a win flips the town.`:F.away?`At ${esc(geo.tmap[F.t].name)}: ${Math.round(F.before*100)}% yours.`:`Home to ${esc(C.schools[F.opp].town)}: defend the roads.`):(C.phase==='offseason'?'The towns you hold send their kids to the Scouting Camp.':'Wins spread your colours along the roads.');
  return `<section class="ov-card v1812m-tz ${dark?'':'v1812m-light'}"><div class="hd"><h3>${icon('v1812mmap',18)} The County Map</h3><button class="btn sm" data-a="go" data-r="countymap">Open map</button></div>
   <button class="v1812m-tzb" data-a="go" data-r="countymap" aria-label="Open the County Map">${v1812mThumb(C,st,geo,dark)}<span class="v1812m-tzt"><span class="v1812m-tzn"><b>${st.reach}</b> of ${st.total} towns</span><em class="${d>0?'v1812m-up':d<0?'v1812m-dn':''}">${d>0?'+'+d+' this season':d<0?'−'+(-d)+' this season':'steady this season'}</em><span class="v1812m-tzl">${line}</span></span></button></section>`; }
if(typeof v15Overview==='function'){ const _v1812mOv=v15Overview; v15Overview=function(){ let h=_v1812mOv.apply(this,arguments); try{ v1812mEnsure(App.C); h=h.replace('<div class="ov-more">','<div class="ov-more">'+v1812mTeaser(App.C)); }catch(e){ console.error(e); } return h; }; }
if(typeof v15MatchCard==='function'){ const _v1812mMC=v15MatchCard; v15MatchCard=function(){ let h=_v1812mMC.apply(this,arguments); try{ const C=App.C, F=v1812mFriday(C); if(F.kind==='lg'){ const geo=v1812mGeo(C), st=v1812mState(C); const line=F.flips.length?`${esc(geo.tmap[F.t].name)} flips if you win`:F.away?`At ${esc(geo.tmap[F.t].name)}: ${Math.round(F.before*100)}% your colours`:`Home: defend ${Math.round(F.before*100)}% of ${esc(geo.tmap[F.t].name)}`;
        const add=`<button class="v1812m-ovline ${F.flips.length?'v1812m-good':''}" data-a="go" data-r="countymap" aria-label="Open the County Map">${icon('v1812mmap',16)}<span><b>County Map</b> ${line}</span><i>${st.reach} of ${st.total} towns</i></button>`; const i=h.indexOf('<button class="btn pri play om-play"'); if(i>=0) h=h.slice(0,i)+add+h.slice(i); } }catch(e){ console.error(e); } return h; }; }
if(typeof offseasonView==='function'){ const _v1812mOff=offseasonView; offseasonView=function(){ let h=_v1812mOff.apply(this,arguments); try{ v1812mEnsure(App.C); h+=`<div class="ov-more" style="margin-top:16px">${v1812mTeaser(App.C)}</div>`; }catch(e){ console.error(e); } return h; }; }
function v1812mResultsHTML(m){ const C=App.C, B=v1812mBox(C); const ids=new Set(m.ids||[]); const L=B.log.filter(e=>ids.has(e.fid)); if(!L.length) return ''; const geo=v1812mGeo(C);
  const g=L.filter(e=>e.k==='g'), l=L.filter(e=>e.k==='l'), v=L.find(e=>e.k==='v'); const nm=e=>geo.tmap[e.t].name; let txt='', good=false;
  if(g.length){ good=true; txt=`${g.map(nm).join(' and ')} ${g.length>1?'flip':'flips'} to your colours (${g.map(e=>e.p+'%').join(', ')}).`; }
  else if(l.length) txt=`${l.map(nm).join(' and ')} slip${l.length>1?'':'s'} out of your hands.`;
  else if(v&&v.p1!==v.p0) txt=`${nm(v)}: your colours ${v.p0}% → ${v.p1}%.`; else return '';
  const rw=B.rwDone&&B.rwDone.fid&&ids.has(B.rwDone.fid)?' Road Warrior earned: you have won in every town in the county.':'';
  return `<div class="v1812m-rs ${good?'v1812m-good':''}">${icon('v1812mmap',20)}<div class="grow"><b>County Map</b><span>${txt}${rw}</span></div><button class="btn sm" data-a="v1812mOpen">View map</button></div>`; }
if(typeof MODALS!=='undefined'&&MODALS.results){ const _v1812mRes=MODALS.results; MODALS.results=m=>{ const h=_v1812mRes(m); try{ const add=v1812mResultsHTML(m); if(add){ const i=h.indexOf('<div class="mbody">'); return i<0?h:h.slice(0,i+19)+add+h.slice(i+19); } }catch(e){ console.error(e); } return h; }; }
function v1812mDecorateCamp(){ const C=App.C; if(App.route!=='camp') return; const K=C.camp&&C.camp.yr===C.year&&C.camp.v1812m?C.camp:null; if(!K) return; const geo=v1812mGeo(C), st=v1812mState(C), dark=v1812mDark(), u=C.userSid;
  document.querySelectorAll('.pros .pro').forEach(el=>{ if(el.querySelector('.v1812m-from')) return; const b=el.querySelector('[data-id]'); const x=b&&K.prospects.find(y=>y.p.id===b.dataset.id); if(!x||!x.tid) return; const line=el.querySelector('.pro-top .grow .small');
    const col=v1812mCol(C,st.owner[x.tid]||u,dark); const html=`<div class="v1812m-from ${x.held?'v1812m-isheld':''}"><i style="background:${col}"></i>From ${esc(x.town)} <span>${x.held?(x.tid===u?'your home town':'you hold it'):'contested'}</span></div>`; if(line) line.insertAdjacentHTML('afterend',html); });
  const pros=document.querySelector('.pros'); if(pros&&!document.querySelector('.v1812m-campbar')){ const n=K.prospects.filter(x=>x.held).length; const held=st.held.length;
    pros.insertAdjacentHTML('beforebegin',`<div class="v1812m-campbar">${icon('v1812mmap',20)}<div class="grow"><b>Kids from your towns</b><span>You hold ${held} of ${st.total} towns, and ${n} of this year's ${K.prospects.length} prospects come from them. Towns you hold send no rival bids.</span></div><button class="btn sm" data-a="go" data-r="countymap">County Map</button></div>`); } }
if(typeof VIEWS!=='undefined'&&VIEWS.hof){ const _v1812mHof=VIEWS.hof; VIEWS.hof=function(){ let h=_v1812mHof.apply(this,arguments); try{ const C=App.C, B=C.map; if(B&&B.rwDone){ const me=Sx(C.userSid);
      const card=`<div class="card v1812m-hof" style="--c1:${me.c1};--c2:${me.c2}"><span class="v1812m-hofi">${icon('v1812mmap',30)}</span><div class="grow"><div class="eyebrow">County honor</div><h3>Road Warrior</h3><p class="small muted">${esc(me.name)} won on the road in every town in the county, the first time in ${B.rwDone.yr}.</p></div><button class="btn sm" data-a="go" data-r="countymap">County Map</button></div>`;
      const key='will wear it again.</p></div>'; const i=h.indexOf(key); h=i>=0?h.slice(0,i+key.length)+card+h.slice(i+key.length):card+h; } }catch(e){ console.error(e); } return h; }; }

/* ---------- render hook ---------- */
if(typeof render==='function'){ const _v1812mRender=render; render=function(){ const out=_v1812mRender.apply(this,arguments);
    try{ const C=App.C; if(C&&C.league&&C.userSid){ v1812mEnsure(C); v1812mHype(C); if(App.route==='countymap'){ v1812mInit(); } else v1812mLeave(); if(App.route==='matchday') v1812mDecorateMatchday(); if(App.route==='camp') v1812mDecorateCamp(); V1812M.last=App.route; } else v1812mLeave(); }catch(e){ console.error(e); } return out; }; }
if(typeof VIEWS!=='undefined'&&VIEWS.countymap){ const _v1812mV=VIEWS.countymap; VIEWS.countymap=function(){ V1812M.enterNow=V1812M.last!=='countymap'; if(V1812M.enterNow){ V1812M.sel=null; try{ const B=v1812mBox(App.C); B.vis=(B.vis||0)+1; }catch(e){} } return _v1812mV.apply(this,arguments); }; }
/*== NEXT ==*/
