/* ===================== v18 3-D broadcast: the stadium (order 12) and the crowd (order 20) =====================
   A small US high-school ground on a Friday night. Presentation only; the Stage is read, never written (the two
   coaches are created lazily on st.coaches exactly as the 2-D drawDugouts does, and handed to the figures module).
   Stadium, in stage metres (Y<0 behind the far touchline):
   - main stand: a concrete lower tier of 10 bleacher rows (aisles, hand rails, padded front wall) across the whole
     side; in the middle a hospitality/press band (lit windows, a team-colour fascia carrying the scrolling LED ribbon),
     an upper tier of 8 rows with team-colour benches, side cladding and a roof with ribs, a fascia and downlights;
     a video board hangs from the roof at halfway (CanvasTexture redrawn at most 4 times a second from st.board());
   - open aluminium bleachers behind both goals, ball-stop netting and LED boards on the end lines, photographers;
   - LED boards along the far touchline (the 2-D messages and colours; 'GOAL!' flashing while st.hype>0.55);
   - two dugouts at halfway with benches, substitutes and each head coach (pushed into P.extra);
   - four floodlight masts with lamp banks, glow sprites and lamp glints, and soft light cones at night (not tier C);
   - a near-side rail (mostly out of shot).
   Everything static is merged by material: one lit mesh, one emissive mesh, one lamp mesh, one glass mesh.
   Crowd: one InstancedMesh of low-poly fans (torso, head with hair or hat, scarf, two arms) filling the seats up to
   P.tier.crowd, home-weighted colours, away fans in the right-hand corner; idle sway, standing, jumping and arms-up
   all happen in the vertex shader from uTime/uHype (no CPU per fan); flag-wavers are a second InstancedMesh with a
   cloth that waves in the shader; camera flashes (st.bulbs and the photographers) are one additive Points pool. */

function v18sTeam(st){ const h=st.h||{}, a=st.a||{}; return {h,a,c1:h.c1||'#1d4ed8',c2:h.c2||'#ffffff',a1:a.c1||'#c0392b',a2:a.c2||'#ffffff'}; }
const v18sMix=(a,b,t)=>{ try{ return mix(a,b,t); }catch(e){ return a; } };
const v18sLum=c=>{ try{ return lum(c); }catch(e){ return 0.3; } };
const V18S_FONT='"Big Shoulders Display","Arial Narrow",sans-serif';

/* oriented box: centre o, unit axes ax/ay/az (stage coordinates), half sizes */
function v18sOBox(B,o,ax,ay,az,hx,hy,hz){ const C=(sx,sy,sz)=>[o[0]+ax[0]*hx*sx+ay[0]*hy*sy+az[0]*hz*sz,o[1]+ax[1]*hx*sx+ay[1]*hy*sy+az[1]*hz*sz,o[2]+ax[2]*hx*sx+ay[2]*hy*sy+az[2]*hz*sz];
  const a=C(-1,-1,-1),b=C(1,-1,-1),c=C(1,1,-1),d=C(-1,1,-1),e=C(-1,-1,1),f=C(1,-1,1),g=C(1,1,1),h=C(-1,1,1);
  B.quad(e,f,g,h); B.quad(a,b,f,e); B.quad(d,h,g,c); B.quad(a,e,h,d); B.quad(b,c,g,f); B.quad(a,d,c,b); }

/* ---------- LED texture painters ---------- */
function v18sRibbon(S,st,goal){ const cv=S.ribCv, q=cv.getContext('2d'), W=cv.width, H=cv.height; const tm=S.tm;
  const bg=tm.c1, fg=v18sLum(bg)>0.5?'#111111':'#ffffff'; q.fillStyle=bg; q.fillRect(0,0,W,H);
  q.font=`800 ${Math.round(H*0.78)}px ${V18S_FONT}`; q.textBaseline='middle';
  const one=goal?'  GOAL  ·  GOAL  ·  ':`  ${String(tm.h.town||'HOME').toUpperCase()} ${String(tm.h.mascot||'').toUpperCase()}  ·  SECTION ${st.section||5}  ·  TOUCHLINE  ·  `;
  const w1=q.measureText(one).width||200; const n=Math.max(1,Math.round(W/w1)); const sx=W/(w1*n);
  q.save(); q.scale(sx,1); q.fillStyle=goal?'#ffd36b':fg; for(let i=0;i<n;i++) q.fillText(one,i*w1,H/2+1); q.restore();
  q.fillStyle='rgba(0,0,0,.28)'; for(let x=0;x<W;x+=3) q.fillRect(x,0,1,H); for(let y=0;y<H;y+=3) q.fillRect(0,y,W,1);
  S.ribTex.needsUpdate=true; }
function v18sBoards(S,st,now,goal){ const cv=S.bdCv, q=cv.getContext('2d'), CW=416, CH=32; const tm=S.tm; const msgs=['TOUCHLINE',String(tm.h.town||'').toUpperCase(),`SECTION ${st.section||5}`,'GO '+String(tm.h.mascot||'TEAM').toUpperCase()];
  q.font=`800 ${Math.round(CH*0.68)}px ${V18S_FONT}`; q.textAlign='center'; q.textBaseline='middle';
  for(let i=0;i<S.nBoards;i++){ const x=(i%2)*CW, y=Math.floor(i/2)*CH;
    const bg=goal?(Math.floor(now/160+i)%2?tm.c1:'#ffd36b'):(Math.floor(now/4000+i)%3===0?tm.c1:'#0d1117');
    const gr=q.createLinearGradient(0,y,0,y+CH); gr.addColorStop(0,v18sMix(bg,'#ffffff',0.14)); gr.addColorStop(1,v18sMix(bg,'#000000',0.28)); q.fillStyle=gr; q.fillRect(x,y,CW,CH);
    const fg=v18sLum(bg)>0.45?'#111111':'#ffffff'; q.fillStyle=goal?fg:(bg===tm.c1?fg:(v18sLum(tm.c2)>0.2?tm.c2:'#ffffff'));
    q.fillText(goal?'GOAL!':msgs[(i+Math.floor(now/4000))%4],x+CW/2,y+CH/2+1,CW-12); }
  q.fillStyle='rgba(0,0,0,.22)'; for(let x=0;x<cv.width;x+=2) q.fillRect(x,0,1,cv.height);
  S.bdTex.needsUpdate=true; }
function v18sCrestImg(S,s,key){ if(S.crests[key]!==undefined) return S.crests[key]; S.crests[key]=null;
  try{ if(typeof crest!=='function'||!s) return null; let svg=crest(s,40); svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace(/width="[^"]*" height="[^"]*"/,'width="200" height="230"');
    const img=new Image(); img.onload=()=>{ S.crests[key]=img; S.sbKey=''; }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }catch(e){}
  return null; }
function v18sScoreboard(S,st,now,hype){ const cv=S.sbCv, q=cv.getContext('2d'), W=cv.width, H=cv.height; const tm=S.tm;
  let B=null; try{ B=st.board?st.board():null; }catch(e){ B=null; }
  const key=hype>0.55?'g'+(Math.floor(now/180)%2):(B?B.h+'|'+B.a+'|'+B.sc[0]+'-'+B.sc[1]+'|'+B.min:'-'); if(key===S.sbKey) return; S.sbKey=key;
  const g=q.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0e1a2c'); g.addColorStop(1,'#060b14'); q.fillStyle=g; q.fillRect(0,0,W,H);
  q.textAlign='center'; q.textBaseline='middle';
  if(hype>0.55){ q.fillStyle=Math.floor(now/180)%2?tm.c1:'#ffd36b'; q.font=`900 ${Math.round(H*0.72)}px ${V18S_FONT}`; q.fillText('GOAL!',W/2,H/2+4); }
  else { const hN=B?B.h:String(tm.h.town||'HOME').toUpperCase().slice(0,12), aN=B?B.a:String(tm.a.town||'AWAY').toUpperCase().slice(0,12); const sc=B?B.sc:[0,0];
    const ch=v18sCrestImg(S,tm.h,'h'), ca=v18sCrestImg(S,tm.a,'a'); const cw=H*0.62;
    if(ch) q.drawImage(ch,W*0.03,H*0.15,cw,cw*1.15); if(ca) q.drawImage(ca,W*0.97-cw,H*0.15,cw,cw*1.15);
    q.fillStyle=tm.c1; q.fillRect(W*0.03+cw+10,H*0.72,W*0.22,H*0.06); q.fillStyle=tm.a1; q.fillRect(W*0.97-cw-10-W*0.22,H*0.72,W*0.22,H*0.06);
    q.fillStyle='#e8eef6'; q.font=`800 ${Math.round(H*0.36)}px ${V18S_FONT}`; q.fillText(hN,W*0.03+cw+10+W*0.11,H*0.45,W*0.24); q.fillText(aN,W*0.97-cw-10-W*0.11,H*0.45,W*0.24);
    q.fillStyle='#ffd36b'; q.font=`800 ${Math.round(H*0.56)}px "JetBrains Mono",monospace`; q.fillText(`${sc[0]}-${sc[1]}`,W/2,H*0.44);
    q.fillStyle='#8fa3bb'; q.font=`700 ${Math.round(H*0.17)}px "JetBrains Mono",monospace`; q.fillText(B?String(B.min):'TOUCHLINE',W/2,H*0.84); }
  q.fillStyle='rgba(255,255,255,.04)'; for(let y=0;y<H;y+=3) q.fillRect(0,y,W,1);
  S.sbTex.needsUpdate=true; }

P3D_MODULES.push({name:'stadium',order:12,
  init(P){ const T=P.T, st=P.st, tr=o=>P.track(o); const det=P.tier.detail; const tm=v18sTeam(st);
    const S=P.stadium={seats:[],tm,crests:{},sbKey:'',sbT:-1e9,bdKey:'',ribGoal:null,glows:[],lampPts:[],dl:[]};
    const B=v18sGB(T), E=v18sGB(T), L=v18sGB(T), G=v18sGB(T), Bd=v18sGB(T);
    const CONC='#a3a8ae', CONC2='#8f959c', STEEL='#2d343e', ALU='#c6ccd3', ALU2='#a8b0b9', CLAD='#4b5563', ROOF='#626b77', DARK='#10161e', GALV='#8a929c';
    const teamDark=v18sMix(tm.c1,'#000000',0.4), seatUp=v18sMix(tm.c1,'#000000',0.18);
    const rnd=rngFrom(hashStr('stadium'+((st.T&&st.T.id)||'')));
    /* ===== main stand: lower tier across the whole side ===== */
    const LX0=-14, LX1=119, CX0=14, CX1=91, NR=10;
    const aisles=[]; for(let k=1;k<9;k++) aisles.push(LX0+k*(LX1-LX0)/9);
    const secs=(x0,x1,ais)=>{ const out=[]; let a=x0; for(const m of ais){ out.push([a,m-0.6]); a=m+0.6; } out.push([a,x1]); return out; };
    const lowSecs=secs(LX0,LX1,aisles);
    const zl=i=>0.95+0.34*i, yl=i=>-6-0.8*i;
    B.color(CONC).box(LX0,LX1,-6.0,-5.75,0,1.3);                      /* front wall */
    B.color(tm.c1).box(LX0,LX1,-5.76,-5.70,0.45,1.18);                  /* padding */
    B.color(CONC2).box(LX0,LX1,-5.75,-4.35,-0.02,0.03,true);             /* walkway */
    for(let i=0;i<NR;i++){ const yf=yl(i), yb=yf-0.8, z=zl(i), zp=i?zl(i-1):1.3;
      B.color(i%2?CONC:CONC2).quad([LX0,yf,z],[LX1,yf,z],[LX1,yb,z],[LX0,yb,z]); B.color('#7d838a').quad([LX0,yf,zp],[LX1,yf,zp],[LX1,yf,z],[LX0,yf,z]);
      B.color('#7a8087').quad([LX0,yf,0],[LX0,yb,0],[LX0,yb,z],[LX0,yf,z]).quad([LX1,yf,0],[LX1,yb,0],[LX1,yb,z],[LX1,yf,z]);
      for(const [s0,s1] of lowSecs){ B.color(ALU).box(s0+0.1,s1-0.1,yf-0.62,yf-0.28,z+0.38,z+0.44); if(det>0) B.color(ALU2).box(s0+0.1,s1-0.1,yf-0.12,yf-0.02,z-0.02,z+0.02);
        for(let x=s0+0.55;x<s1-0.2;x+=0.56) S.seats.push({x:x+(rnd()-0.5)*0.08,y:yf-0.47,z:z+0.44,r:0,zone:'L',row:i,tone:0.015*i}); }
      for(const a of aisles){ B.color('#b5b9bd').box(a-0.55,a+0.55,yf-0.8,yf-0.4,z,z+0.2,true); } }
    if(det>0) for(const a of aisles){ B.color(ALU).tube([a,-6.1,2.1],[a,yl(NR-1)-0.6,zl(NR-1)+1.0],0.03,4); }
    for(let x=LX0+0.5;x<LX1;x+=2.5) B.color(ALU).tube([x,-5.88,1.3],[x,-5.88,2.1],0.02,4);
    B.color(ALU).tube([LX0,-5.88,2.1],[LX1,-5.88,2.1],0.03,5);
    /* wings: a rear wall and rail where there is no upper block */
    const yBack=yl(NR-1)-0.8, zBack=zl(NR-1);
    for(const [x0,x1] of [[LX0,CX0],[CX1,LX1]]){ B.color(CLAD).box(x0,x1,yBack-0.4,yBack,0,zBack+1.25); B.color(tm.c1).box(x0,x1,yBack+0.01,yBack+0.05,zBack+0.75,zBack+1.05); }
    B.color(CLAD).box(LX0-0.4,LX0,yBack-0.4,-5.75,0,1.6).box(LX1,LX1+0.4,yBack-0.4,-5.75,0,1.6);
    /* ===== hospitality / press band ===== */
    const zF0=zBack+1.25, zF1=zF0+0.9, zW1=zF1+1.95;
    B.color(CONC2).box(CX0,CX1,-17.6,yBack,0,zF0); B.color(CLAD).box(CX0,CX1,yBack-0.2,yBack+0.02,zBack,zF0); B.color(tm.c1).box(CX0,CX1,yBack+0.02,yBack+0.05,zBack+0.75,zBack+1.0);
    B.color(teamDark).box(CX0,CX1,yBack-0.2,yBack+0.05,zF0,zF1);
    S.rib={x0:CX0,x1:CX1,y:yBack+0.06,z0:zF0+0.08,z1:zF1-0.08};
    { const nb=18, bw=(CX1-CX0)/nb; for(let b=0;b<=nb;b++){ const x=CX0+b*bw; B.color(STEEL).box(x-0.1,x+0.1,yBack-0.45,yBack-0.25,zF1,zW1); }
      for(let b=0;b<nb;b++){ const x=CX0+b*bw; const lit=(hashStr('box'+b+((st.T&&st.T.id)||''))%5)!==0;
        const wq=(z0,z1,c)=>E.color(c).quad([x+0.1,yBack-0.36,z0],[x+bw-0.1,yBack-0.36,z0],[x+bw-0.1,yBack-0.36,z1],[x+0.1,yBack-0.36,z1]);
        if(lit){ wq(zW1-0.55,zW1-0.1,'#7a5c3e'); wq(zF1+1.0,zW1-0.55,'#ffe3ae'); wq(zF1+0.55,zF1+1.0,'#d6a76c'); wq(zF1+0.1,zF1+0.55,'#5a4430'); }
        else { wq(zF1+1.2,zW1-0.1,'#5d7290'); wq(zF1+0.1,zF1+1.2,'#33435a'); }
        if(lit&&det>0){ for(let k=0;k<3;k++){ const px=x+0.5+rnd()*(bw-1.0); E.color(k%2?'#2a2018':'#3b2c20').box(px-0.2,px+0.2,yBack-0.35,yBack-0.34,zF1+0.1,zF1+1.0).box(px-0.1,px+0.1,yBack-0.35,yBack-0.34,zF1+1.0,zF1+1.28); } } } }
    B.color('#c3c7cc').box(CX0,CX1,yBack-0.5,yBack-0.05,zF1,zF1+0.1); B.color(CLAD).box(CX0,CX1,yBack-0.5,yBack-0.05,zW1-0.1,zW1+0.15);
    B.color(CONC).box(CX0,CX1,-17.6,yBack-0.3,zW1,zW1+0.35);
    /* ===== upper tier ===== */
    const NU=det>0?7:5, yu=j=>-17.8-0.8*j, zu=j=>zW1+0.6+0.4*j; const upSecs=secs(CX0,CX1,[1,2,3,4].map(k=>CX0+k*(CX1-CX0)/5));
    B.color(CONC).box(CX0,CX1,-17.85,-17.55,zW1,zW1+1.15); B.color(tm.c1).box(CX0,CX1,-17.56,-17.5,zW1+0.4,zW1+0.95);
    for(let j=0;j<NU;j++){ const yf=yu(j), yb=yf-0.8, z=zu(j), zp=j?zu(j-1):zW1+1.15;
      B.color(j%2?'#8b9197':'#80868d').quad([CX0,yf,z],[CX1,yf,z],[CX1,yb,z],[CX0,yb,z]); B.color('#70767d').quad([CX0,yf,zp],[CX1,yf,zp],[CX1,yf,z],[CX0,yf,z]);
      for(const [s0,s1] of upSecs){ B.color(seatUp).box(s0+0.1,s1-0.1,yf-0.62,yf-0.28,z+0.38,z+0.44); B.color(v18sMix(seatUp,'#000000',0.2)).box(s0+0.1,s1-0.1,yf-0.75,yf-0.66,z+0.4,z+0.85);
        for(let x=s0+0.55;x<s1-0.2;x+=0.56) S.seats.push({x:x+(rnd()-0.5)*0.08,y:yf-0.47,z:z+0.44,r:0,zone:'U',row:j,tone:0.16+0.02*j}); } }
    const yUB=yu(NU-1)-0.8, zUB=zu(NU-1), zR=zUB+1.95;
    B.color(CLAD).box(CX0,CX1,yUB-0.4,yUB,0,zR);
    for(const x of [CX0,CX1]){ const s=x===CX0?-1:1; B.color(CLAD).box(Math.min(x,x+s*0.35),Math.max(x,x+s*0.35),yUB-0.4,yBack,0,zW1+0.35).box(Math.min(x,x+s*0.35),Math.max(x,x+s*0.35),yUB-0.4,-17.5,zW1+0.35,zR); }
    /* roof, ribs, fascia, downlights */
    const yRF=-14.6;
    B.color(ROOF).box(CX0-0.6,CX1+0.6,yUB-0.4,yRF,zR,zR+0.35);
    for(let x=CX0;x<=CX1+0.01;x+=(CX1-CX0)/14) B.color(STEEL).box(x-0.12,x+0.12,yUB-0.4,yRF,zR+0.35,zR+0.55);
    B.color(teamDark).box(CX0-0.6,CX1+0.6,yRF-0.3,yRF,zR-0.5,zR+0.55); B.color(tm.c1).box(CX0-0.6,CX1+0.6,yRF+0.0,yRF+0.03,zR-0.25,zR-0.08);
    for(let x=CX0+1.2;x<CX1-0.8;x+=2.75){ L.color('#fff6e0').box(x-0.32,x+0.32,yRF-0.55,yRF-0.15,zR-0.72,zR-0.5); S.dl.push([x,yRF-0.35,zR-0.75]); }
    /* video board hanging at halfway, in front of the press band */
    const VB={x0:46.4,x1:58.6,y:yBack-0.08,z0:zF1+0.22,z1:zF1+3.07}; /* hung low over the press band so the broadcast frame always shows it */ S.vb=VB;
    B.color(DARK).box(VB.x0-0.35,VB.x1+0.35,VB.y-0.5,VB.y,VB.z0-0.35,VB.z1+0.35); B.color(teamDark).box(VB.x0-0.35,VB.x1+0.35,VB.y+0.001,VB.y+0.03,VB.z0-0.35,VB.z0-0.12);
    if(det>0) for(const x of [VB.x0+1,VB.x1-1]) B.color(STEEL).tube([x,VB.y-0.25,VB.z1+0.35],[x,VB.y-0.25,zR],0.03,4);
    /* ===== end bleachers (open aluminium), ball-stop netting, end boards, photographers ===== */
    const EY0=10, EY1=58, NE=det>0?7:5;
    const nets=[];
    for(const side of [0,1]){ const mx=X=>side?105-X:X; const xs=(a,b)=>[Math.min(mx(a),mx(b)),Math.max(mx(a),mx(b))];
      for(let k=0;k<NE;k++){ const xf=-8.6-0.8*k, z=0.45+0.42*k;
        B.color(ALU2).box(...xs(xf-0.32,xf),EY0,EY1,z-0.05,z); B.color(ALU).box(...xs(xf-0.75,xf-0.47),EY0,EY1,z+0.38,z+0.43);
        for(let y=EY0+0.35;y<EY1-0.2;y+=0.56) S.seats.push({x:mx(xf-0.6),y:y+(rnd()-0.5)*0.08,z:z+0.43,r:side?-Math.PI/2:Math.PI/2,zone:side?'R':'E',row:k,tone:0.01*k}); }
      const xB=-8.6-0.8*NE, zT=0.45+0.42*(NE-1)+0.43;
      for(let y=EY0;y<=EY1+0.01;y+=4){ B.color(STEEL).tube([mx(-8.5),y,0],[mx(xB),y,zT],0.05,4).tube([mx(xB),y,0],[mx(xB),y,zT+1.1],0.05,4); if(det>0) B.tube([mx((xB-8.5)/2),y,0],[mx((xB-8.5)/2),y,zT*0.5],0.04,4); }
      B.color(ALU).tube([mx(xB),EY0,zT+1.1],[mx(xB),EY1,zT+1.1],0.035,4); for(const y of [EY0,EY1]) B.tube([mx(-8.5),y,1.0],[mx(xB),y,zT+1.1],0.03,4);
      B.color(CONC2).box(...xs(xB-0.6,-8.0),EY0-1.2,EY1+1.2,-0.02,0.03,true);
      /* ball-stop netting: poles and a fine grid (lines) */
      const nx=mx(-4.4); for(const y of [12,23,34,45,56]) B.color('#3c444e').tube([nx,y,0],[nx,y,6.1],0.07,5);
      for(let y=12;y<=56.01;y+=0.5) nets.push(nx,0.95,y, nx,6.0,y); for(let z=1.0;z<=6.01;z+=0.5) nets.push(nx,z,12, nx,z,56);
      /* end-line LED boards: bodies here, faces in the board atlas */
      const bx=mx(-3.6), bxb=mx(-3.85); for(let b=0;b<6;b++){ const y0=-2+b*12, y1=y0+12; B.color(DARK).box(Math.min(bx,bxb),Math.max(bx,bxb),y0+0.05,y1-0.05,0,0.95); }
      /* photographers crouched beside the goal, facing the pitch */
      for(const y of [24,44]){ const px=mx(-2.9), f=side?-1:1; const jc=y===24?'#2a3140':'#3a2f2a';
        B.color(jc).box(px-0.28,px+0.28,y-0.25,y+0.25,0,0.62); B.color('#c79a6a').box(px-0.12+f*0.05,px+0.12+f*0.05,y-0.11,y+0.11,0.62,0.86); B.color('#1a1a1a').box(px-0.13+f*0.04,px+0.13+f*0.04,y-0.12,y+0.12,0.8,0.9);
        B.color('#0b0b0b').box(Math.min(px+f*0.18,px+f*0.55),Math.max(px+f*0.18,px+f*0.55),y-0.07,y+0.07,0.66,0.8); B.color('#d8dde3').box(px-0.25,px+0.25,y+0.2,y+0.32,0,0.35);
        S.photogs=S.photogs||[]; S.photogs.push([px+f*0.5,y,0.75]); } }
    /* ===== far touchline LED boards and dugouts ===== */
    const far=[[-5.5,5],[5,15.5],[15.5,26],[26,36.5],[68.5,79],[79,89.5],[89.5,100],[100,110.5]];
    for(const [x0,x1] of far) B.color(DARK).box(x0+0.04,x1-0.04,-2.45,-2.2,0,0.95);
    const kits=(st.kits&&st.kits.team)||[{shirt:tm.c1,shorts:tm.c2},{shirt:tm.a1,shorts:tm.a2}];
    const skins=(typeof LOOK!=='undefined'&&LOOK.skin)||['#c79a6a','#8a5a3c','#e8c4a0'];
    for(const [x0,x1,side] of [[39,51,0],[54,66,1]]){ const kit=kits[side]||kits[0]; const shirt=kit.shirt||tm.c1, shorts=kit.shorts||'#222';
      B.color(CONC2).box(x0,x1,-4.3,-2.3,-0.02,0.04,true);
      B.color(DARK).box(x0,x1,-4.35,-4.15,0,2.15); B.color(shirt).box(x0,x1,-4.15,-4.11,1.55,1.78);
      B.color(STEEL).box(x0-0.06,x1+0.06,-2.36,-2.24,1.98,2.2).box(x0-0.06,x0+0.04,-2.36,-2.24,0,2.0).box(x1-0.04,x1+0.06,-2.36,-2.24,0,2.0);
      G.color('#a9c4e2').box(x0-0.05,x1+0.05,-4.35,-2.25,2.12,2.18).box(x0-0.05,x0+0.03,-4.3,-2.3,0.05,2.12).box(x1-0.03,x1+0.05,-4.3,-2.3,0.05,2.12);
      B.color(v18sMix(shirt,'#000000',0.35)).box(x0+0.4,x1-0.4,-3.95,-3.5,0.42,0.5).box(x0+0.4,x1-0.4,-4.12,-4.0,0.5,1.02);
      for(let i=0;i<7;i++){ const bx=x0+1+(x1-x0-2)*i/6+(rnd()-0.5)*0.2; const sk=skins[(i*5+side*3)%skins.length];
        B.color(shirt).box(bx-0.2,bx+0.2,-3.9,-3.6,0.5,1.08); B.color(shorts).box(bx-0.19,bx+0.19,-3.6,-3.1,0.42,0.6); B.color(sk).box(bx-0.06,bx+0.06,-3.15,-3.0,0.05,0.5);
        B.color(sk).box(bx-0.11,bx+0.11,-3.86,-3.62,1.1,1.36); B.color('#20160f').box(bx-0.12,bx+0.12,-3.88,-3.6,1.3,1.4); } }
    /* ===== floodlight masts ===== */
    const MASTS=[[-18,-9],[123,-9],[-18,77],[123,77]], HM=det>0?27:25; S.masts=[];
    for(const [mx,my] of MASTS){ B.color(GALV).tube([mx,my,0],[mx,my,HM-1.2],0.34,8).color(CONC2).box(mx-0.8,mx+0.8,my-0.8,my+0.8,0,0.5);
      let dx=52.5-mx, dy=34-my; const dl=Math.hypot(dx,dy); dx/=dl; dy/=dl; const tilt=0.42; const az=[dx*Math.cos(tilt),dy*Math.cos(tilt),-Math.sin(tilt)]; const ax=[-dy,dx,0]; const ay=[az[1]*ax[2]-az[2]*ax[1],az[2]*ax[0]-az[0]*ax[2],az[0]*ax[1]-az[1]*ax[0]];
      const o=[mx,my,HM]; B.color('#3a424c'); v18sOBox(B,o,ax,ay,az,2.7,1.75,0.22); B.color(GALV).tube([mx,my,HM-1.2],[mx,my,HM],0.2,6);
      for(let r=0;r<3;r++) for(let c=0;c<4;c++){ const u=(c-1.5)*1.25, v=(r-1)*1.1; const p=[o[0]+ax[0]*u+ay[0]*v+az[0]*0.26,o[1]+ax[1]*u+ay[1]*v+az[1]*0.26,o[2]+ax[2]*u+ay[2]*v+az[2]*0.26];
        L.color('#fff4dc'); v18sOBox(L,p,ax,ay,az,0.48,0.42,0.06); S.lampPts.push([p[0]+az[0]*0.3,p[1]+az[1]*0.3,p[2]+az[2]*0.3]); }
      S.masts.push({o:[o[0]+az[0]*1.2,o[1]+az[1]*1.2,o[2]+az[2]*1.2],tgt:[mx<50?30:75,my<30?24:44,0]}); }
    /* ===== car park behind the main stand (seen on wide and phone shots) ===== */
    { B.color('#3b3f45').box(-30,135,-62,yUB-0.5,-0.025,0.0,true); B.color('#5a5f66').box(-30,135,yUB-3.5,yUB-0.5,0.0,0.06,true);
      const carC=['#b8bec6','#2b2f36','#8a1f1f','#e8e8e8','#1f3a66','#5b6470','#c9b48a','#24402c','#7a7f88','#101418'];
      for(let row=0;row<(det>0?4:2);row++){ const yc=yUB-7.5-row*7.2; B.color('#c9ccd0'); for(let x=-26;x<132;x+=2.7) B.box(x-0.05,x+0.05,yc-2.4,yc+2.4,0.0,0.012,true);
        for(let x=-24.6;x<131;x+=2.7){ if(rnd()<0.3) continue; const c=carC[Math.floor(rnd()*carC.length)]; const yo=yc+(rnd()<0.5?-1.25:1.25);
          B.color(c).box(x-0.85,x+0.85,yo-1.05,yo+1.05,0.18,0.82).box(x-0.75,x+0.75,yo-0.55,yo+0.45,0.82,1.32); B.color('#1a2230').box(x-0.76,x+0.76,yo-0.45,yo+0.4,0.86,1.26); } } }
    /* ===== near-side rail ===== */
    for(let x=-12;x<=117;x+=3) B.color(ALU).tube([x,71.6,0],[x,71.6,1.1],0.03,4);
    B.tube([-12,71.6,1.1],[117,71.6,1.1],0.035,4).tube([-12,71.6,0.55],[117,71.6,0.55],0.03,4);
    /* ===== meshes ===== */
    const add=(geo,mat,cast,recv,ro)=>{ const m=new T.Mesh(tr(geo),tr(mat)); m.castShadow=!!cast; m.receiveShadow=!!recv; if(ro) m.renderOrder=ro; P.scene.add(m); return m; };
    S.static=add(B.geo(),new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),P.tier.shadow>0,P.tier.shadow>0);
    S.emis=add(E.geo(),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
    S.lamps=add(L.geo(),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));
    S.glass=add(G.geo(),new T.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.32,depthWrite:false,side:T.DoubleSide}),false,false,3);
    { const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(nets,3)); g.computeBoundingSphere(); const m=new T.LineSegments(tr(g),tr(new T.LineBasicMaterial({color:'#dfe6ee',transparent:true,opacity:0.12,depthWrite:false}))); m.renderOrder=3; P.scene.add(m); }
    /* LED ribbon (scrolls by texture offset) */
    { const cv=S.ribCv=v18sCanvas(2048,64); const t=S.ribTex=tr(new T.CanvasTexture(cv)); t.colorSpace=T.SRGBColorSpace; t.wrapS=T.RepeatWrapping; t.anisotropy=4; const R=S.rib; const span=(R.z1-R.z0)*2048/64, uMax=(R.x1-R.x0)/span;
      const Rb=v18sGB(T); Rb.quad([R.x0,R.y,R.z0],[R.x1,R.y,R.z0],[R.x1,R.y,R.z1],[R.x0,R.y,R.z1],[[0,0],[uMax,0],[uMax,1],[0,1]]); add(Rb.geo(),new T.MeshBasicMaterial({map:t})); v18sRibbon(S,st,false); S.ribGoal=false; }
    /* boards atlas: 8 far boards + 6 per end */
    { S.nBoards=20; const cv=S.bdCv=v18sCanvas(832,320); const t=S.bdTex=tr(new T.CanvasTexture(cv)); t.colorSpace=T.SRGBColorSpace; t.anisotropy=4;
      const cell=n=>{ const u0=(n%2)/2, r=Math.floor(n/2); const v0=1-(r+1)/10, v1=1-r/10; return [u0+0.004,v0+0.004,u0+0.496,v1-0.004]; };
      far.forEach(([x0,x1],n)=>{ const [u0,v0,u1,v1]=cell(n); Bd.quad([x0+0.08,-2.19,0.06],[x1-0.08,-2.19,0.06],[x1-0.08,-2.19,0.9],[x0+0.08,-2.19,0.9],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]); });
      for(const side of [0,1]) for(let b=0;b<6;b++){ const n=8+side*6+b, [u0,v0,u1,v1]=cell(n); const y0=-2+b*12+0.1, y1=y0+11.8, X=side?108.59:-3.59;
        if(!side) Bd.quad([X,y1,0.06],[X,y0,0.06],[X,y0,0.9],[X,y1,0.9],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]); else Bd.quad([X,y0,0.06],[X,y1,0.06],[X,y1,0.9],[X,y0,0.9],[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]); }
      add(Bd.geo(),new T.MeshBasicMaterial({map:t})); }
    /* video board screen */
    { const cv=S.sbCv=v18sCanvas(1024,240); const t=S.sbTex=tr(new T.CanvasTexture(cv)); t.colorSpace=T.SRGBColorSpace; t.anisotropy=4; const V=S.vb;
      const Vb=v18sGB(T); Vb.quad([V.x0,V.y+0.01,V.z0],[V.x1,V.y+0.01,V.z0],[V.x1,V.y+0.01,V.z1],[V.x0,V.y+0.01,V.z1],[[0,0],[1,0],[1,1],[0,1]]); add(Vb.geo(),new T.MeshBasicMaterial({map:t})); }
    /* floodlight glows (sprites), lamp glints and downlight glints (points) */
    const glow=v18sGlowTex(P);
    for(const m of S.masts){ const sp=new T.Sprite(tr(new T.SpriteMaterial({map:glow,color:'#fff1d6',blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false}))); sp.position.set(m.o[0],m.o[2],m.o[1]); sp.renderOrder=6; P.scene.add(sp); S.glows.push(sp); }
    { const pts=[]; for(const p of S.lampPts) pts.push(p[0],p[2],p[1]); for(const p of S.dl) pts.push(p[0],p[2],p[1]); const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pts,3)); g.computeBoundingSphere();
      S.glint=new T.Points(tr(g),tr(new T.PointsMaterial({map:glow,color:'#fff3da',size:2.2,sizeAttenuation:true,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false}))); S.glint.renderOrder=6; P.scene.add(S.glint); }
    /* soft light cones at night (merged, additive, fading along the beam and toward the silhouette) */
    if(det>0){ const pos=[], at=[], nrm=[], idx=[]; const SEG=18;
      for(const m of S.masts){ const a=[m.o[0],m.o[2],m.o[1]], b=[m.tgt[0],0,m.tgt[1]]; let d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]]; const len=Math.hypot(...d); d=d.map(v=>v/len);
        let ux=0,uy=1,uz=0; let px=d[1]*uz-d[2]*uy, py=d[2]*ux-d[0]*uz, pz=d[0]*uy-d[1]*ux; const pl=Math.hypot(px,py,pz); px/=pl; py/=pl; pz/=pl; const qx=d[1]*pz-d[2]*py, qy=d[2]*px-d[0]*pz, qz=d[0]*py-d[1]*px;
        const base=pos.length/3; const r0=1.6, r1=len*0.42;
        for(let i=0;i<=SEG;i++){ const t=i/SEG*Math.PI*2, cs=Math.cos(t), sn=Math.sin(t); const nx=px*cs+qx*sn, ny=py*cs+qy*sn, nz=pz*cs+qz*sn;
          pos.push(a[0]+nx*r0,a[1]+ny*r0,a[2]+nz*r0, b[0]+nx*r1,b[1]+ny*r1+0.2,b[2]+nz*r1); nrm.push(nx,ny,nz,nx,ny,nz); at.push(0,1);
          if(i<SEG){ const k=base+i*2; idx.push(k,k+1,k+3,k,k+3,k+2); } } }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3)); g.setAttribute('aT',new T.Float32BufferAttribute(at,1)); g.setIndex(idx); g.computeBoundingSphere();
      S.coneU={uI:{value:0.06}};
      const mat=new T.ShaderMaterial({uniforms:S.coneU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false,
        vertexShader:'attribute float aT; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT=aT; vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
        fragmentShader:'uniform float uI; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float e=pow(abs(dot(normalize(vN),normalize(vV))),1.6); float a=uI*e*pow(1.0-vT,1.1)*smoothstep(0.0,0.08,vT); gl_FragColor=vec4(vec3(1.0,0.95,0.84)*a,1.0); }'});
      S.cones=new T.Mesh(tr(g),tr(mat)); S.cones.renderOrder=7; S.cones.frustumCulled=false; P.scene.add(S.cones); }
    /* the two head coaches (figures module draws them) */
    S.coachKit={shirt:'#1b2230',shorts:'#1b2230',num:'#fff',socks:'#111',dark:'#11161f',light:'#2a3242'};
    S.tris=B.tris+E.tris+L.tris+G.tris+Bd.tris; S.wk=null; },
  frame(P,st){ const S=P.stadium; if(!S) return; const now=st.now||0, hype=st.rm?0:(st.hype||0), goal=hype>0.55;
    if(S.wk!==P._wxKey) this.weather(P,st);
    /* LED ribbon: scroll, swap message on goals */
    if(S.ribGoal!==goal){ v18sRibbon(S,st,goal); S.ribGoal=goal; }
    S.ribTex.offset.x=(now*0.00004)%1;
    /* boards: redraw only when their state changes (every 4 s, or each 160 ms flash during a goal) */
    { const key=goal?Math.floor(now/160)*2+1:Math.floor(now/4000)*2; if(key!==S.bdKey){ S.bdKey=key; v18sBoards(S,st,now,goal); } }
    /* video board: at most 4 redraws a second */
    if(now-S.sbT>=250||now<S.sbT){ S.sbT=now; v18sScoreboard(S,st,now,hype); }
    /* coaches: same lazy objects and behaviour as the 2-D drawDugouts */
    try{ if(!st.coaches&&typeof defaultLook==='function') st.coaches=[0,1].map(i=>({x:i?60:45,y:-1.0,face:i?-1:1,yaw:i?Math.PI:0,ph:0,spd:0,seed:i*3.1,hgt:72,look:defaultLook('coach'+((st.T&&st.T.id)||'')+i,10),num:'',kickT:-9e9,trip:-9e9,jumpT:-9e9,side:i}));
      if(st.coaches) for(let i=0;i<st.coaches.length;i++){ const c=st.coaches[i]; const scoring=hype>0.6&&st.poss===c.side&&st.inNet; c.celeb=!!scoring; c.celebType='classic'; c.celebT=scoring?(c.celebT||now):null; const ty=Math.atan2(st.ball.y-c.y,st.ball.x-c.x); const dd=Math.atan2(Math.sin(ty-c.yaw),Math.cos(ty-c.yaw)); c.yaw+=dd<-0.08?-0.08:dd>0.08?0.08:dd; const X=S.xo||(S.xo=[{o:null,kit:S.coachKit,isRef:false},{o:null,kit:S.coachKit,isRef:false}]); X[i].o=c; P.extra.push(X[i]); } }catch(e){} },
  weather(P,st){ const S=P.stadium; S.wk=P._wxKey; const k=P.wxKind, night=k==='night'; const on=night?1:(k==='clear'?0:(k==='golden'?0.55:0.75));
    S.emis.material.color.setScalar(night?1:0.62);
    S.static.material.color.setScalar(night?0.62:k==='clear'||k==='golden'?1:0.9);
    S.lamps.material.color.setScalar(on>0?0.75+0.25*on:0.55); if(on<=0) S.lamps.material.color.setRGB(0.5,0.52,0.55);
    for(const g of S.glows){ g.visible=on>0; const s=night?20:9+5*on; g.scale.set(s,s,1); g.material.opacity=night?0.9:0.35+0.35*on; }
    S.glint.visible=on>0; S.glint.material.opacity=night?1:0.55*on; S.glint.material.size=night?2.6:1.8;
    if(S.cones){ S.cones.visible=night||k==='fog'||k==='rain'; S.coneU.uI.value=night?0.12:0.05; } },
  resize(P){}, dispose(P){ P.stadium=null; } });

/* ===================== crowd (order 20) ===================== */
function v18sFanGeo(T){ const pos=[], nrm=[], part=[];
  const addTri=(a,b,c,pt)=>{ const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]; let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]; const l=Math.hypot(...n)||1; n=n.map(v=>v/l);
    pos.push(...a,...b,...c); nrm.push(...n,...n,...n); part.push(pt,pt,pt); };
  const quad=(a,b,c,d,pt)=>{ addTri(a,b,c,pt); addTri(a,c,d,pt); };
  const box=(x0,x1,y0,y1,z0,z1,pt)=>{ const A=[x0,y0,z0],B=[x1,y0,z0],C=[x1,y1,z0],D=[x0,y1,z0],E=[x0,y0,z1],F=[x1,y0,z1],G=[x1,y1,z1],H=[x0,y1,z1]; quad(E,F,G,H,pt); quad(B,A,D,C,pt); quad(D,H,G,C,pt); quad(A,B,F,E,pt); quad(A,E,H,D,pt); quad(B,C,G,F,pt); };
  /* torso: a hexagonal prism (shoulders sloping), depth 0.26 */
  const pr=[[-0.19,-0.35],[0.19,-0.35],[0.23,0.46],[0.15,0.57],[-0.15,0.57],[-0.23,0.46]], zf=0.12, zb=-0.12;
  for(let i=1;i<pr.length-1;i++){ addTri([pr[0][0],pr[0][1],zf],[pr[i][0],pr[i][1],zf],[pr[i+1][0],pr[i+1][1],zf],0); addTri([pr[0][0],pr[0][1],zb],[pr[i+1][0],pr[i+1][1],zb],[pr[i][0],pr[i][1],zb],0); }
  for(let i=0;i<pr.length;i++){ const a=pr[i], b=pr[(i+1)%pr.length]; quad([a[0],a[1],zb],[b[0],b[1],zb],[b[0],b[1],zf],[a[0],a[1],zf],0); }
  /* scarf ring */
  quad([-0.165,0.5,0.135],[0.165,0.5,0.135],[0.165,0.6,0.135],[-0.165,0.6,0.135],4); quad([0.165,0.5,-0.135],[-0.165,0.5,-0.135],[-0.165,0.6,-0.135],[0.165,0.6,-0.135],4);
  quad([0.165,0.5,0.135],[0.165,0.5,-0.135],[0.165,0.6,-0.135],[0.165,0.6,0.135],4); quad([-0.165,0.5,-0.135],[-0.165,0.5,0.135],[-0.165,0.6,0.135],[-0.165,0.6,-0.135],4);
  /* head */
  { const sg=new T.SphereGeometry(0.118,7,5).toNonIndexed(); sg.scale(1,1.08,1); sg.translate(0,0.75,0.01); const p=sg.attributes.position.array, n=sg.attributes.normal.array; for(let i=0;i<p.length;i++){ pos.push(p[i]); nrm.push(n[i]); } for(let i=0;i<p.length/3;i++) part.push(1); sg.dispose(); }
  /* arms */
  box(-0.31,-0.21,0.06,0.53,-0.05,0.05,2); box(0.21,0.31,0.06,0.53,-0.05,0.05,3);
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3)); g.setAttribute('aPart',new T.Float32BufferAttribute(part,1)); return g; }
function v18sFlagGeo(T){ const pos=[], nrm=[], part=[], uu=[]; const v=(x,y,z,p,u)=>{ pos.push(x,y,z); nrm.push(0,0,1); part.push(p); uu.push(u); };
  const pole=(x0,x1,y0,y1)=>{ v(x0,y0,0,0,0); v(x1,y0,0,0,0); v(x1,y1,0,0,0); v(x0,y0,0,0,0); v(x1,y1,0,0,0); v(x0,y1,0,0,0); };
  pole(0.26,0.3,0.45,2.45);
  const N=6, W=1.05, y0=1.75, y1=2.42; for(let i=0;i<N;i++){ const u0=i/N, u1=(i+1)/N, x0=0.3+u0*W, x1=0.3+u1*W; v(x0,y0,0,1,u0); v(x1,y0,0,1,u1); v(x1,y1,0,1,u1); v(x0,y0,0,1,u0); v(x1,y1,0,1,u1); v(x0,y1,0,1,u0); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new T.Float32BufferAttribute(nrm,3)); g.setAttribute('aPart',new T.Float32BufferAttribute(part,1)); g.setAttribute('aU',new T.Float32BufferAttribute(uu,1)); return g; }
const V18S_MOTION=`float ph=iData.x, eg=iData.y; float up=clamp(uHype*1.7-(1.0-eg)*0.55,0.0,1.0);
  float jmp=up*max(0.0,sin(uTime*(7.5+eg*3.0)+ph*6.2831))*0.24; float lift=up*0.30+jmp+0.012*sin(uTime*1.3+ph*9.0);
  float sway=sin(uTime*(0.6+eg*0.5)+ph*6.2831)*(0.025+0.05*up);`;

P3D_MODULES.push({name:'crowd',order:20,
  init(P){ const T=P.T, st=P.st, S=P.stadium; if(!S||!S.seats.length) return; const tr=o=>P.track(o); const tm=S.tm; const C=P.crowd={n:0,hype:0,bul:64};
    const r=rngFrom(hashStr('crowd3d'+((st.T&&st.T.id)||''))); const seats=S.seats; const N=Math.min(P.tier.crowd,seats.length);
    /* pick which seats are filled: the visible middle of the main stand first, then the rest */
    const lean=P.tier.detail<2; const pri=s=>{ let w=s.zone==='L'?(lean?1.6:1.0):s.zone==='U'?(lean?1.0:0.9):(lean?0.55:0.75); w-=Math.abs((s.zone==='L'||s.zone==='U'?s.x:s.y)-(s.zone==='L'||s.zone==='U'?52.5:34))/(P.tier.detail<1?500:lean?220:400); if(s.zone==='L') w-=s.row*(P.tier.detail<1?0.09:lean?0.03:0.004); return w+r()*(lean?0.45:0.5); };
    let pick=seats.map(s=>({s,w:pri(s)})); pick.sort((a,b)=>b.w-a.w); const occ=Math.min(N,Math.round(seats.length*0.94)); pick=pick.slice(0,occ).map(p=>p.s);
    const pal=[[tm.c1,5],[tm.c2,1.6],['#d8dde3',1.2],['#5b6573',1.1],['#2d333b',1.1],[tm.a1,0.35],['#c49a6c',0.6],['#8a5a3c',0.5],['#46607d',0.7],['#7d8a99',0.6],[v18sMix(tm.c1,'#ffffff',0.35),0.9]]; let tw=0; for(const p of pal) tw+=p[1];
    const pk=()=>{ let v=r()*tw; for(const p of pal){ v-=p[1]; if(v<=0) return p[0]; } return pal[0][0]; };
    const skins=(typeof LOOK!=='undefined'&&LOOK.skin)||['#e8c4a0','#c79a6a','#8a5a3c','#5a3a22']; const hairs=(typeof V17L_HAIR!=='undefined'&&V17L_HAIR)||['#15100c','#3a2616','#8a6a3a','#c9a35a'];
    const n=pick.length; C.n=n; const geo=tr(v18sFanGeo(T));
    const aSh=new Float32Array(n*3), aSk=new Float32Array(n*3), aHr=new Float32Array(n*3), aSc=new Float32Array(n*3), aD=new Float32Array(n*4); const col=new T.Color();
    const mesh=new T.InstancedMesh(geo,null,n); const M=new T.Matrix4(), Q=new T.Quaternion(), V=new T.Vector3(), Sc=new T.Vector3(), Y=new T.Vector3(0,1,0);
    const flags=[];
    for(let i=0;i<n;i++){ const s=pick[i]; const away=s.zone==='R'?r()<0.7:(s.zone==='L'&&s.x>100?r()<0.45:false); const own=away?{c1:tm.a1,c2:tm.a2}:{c1:tm.c1,c2:tm.c2};
      let c=away?(r()<0.75?tm.a1:pk()):pk(); const t=r(); c=v18sMix(c,t<0.5?'#ffffff':'#000000',(t<0.5?t:t-0.5)*0.26);
      col.set(c); aSh.set([col.r,col.g,col.b],i*3); col.set(skins[Math.floor(r()*skins.length)]); aSk.set([col.r,col.g,col.b],i*3);
      const q=r(); let hair=hairs[Math.floor(r()*hairs.length)]; let scarf=null; if(q<0.06) hair=r()<0.7?own.c1:own.c2; else if(q<0.13) scarf=own.c1;
      col.set(hair); aHr.set([col.r,col.g,col.b],i*3); col.set(scarf||c); aSc.set([col.r,col.g,col.b],i*3);
      aD.set([r(),0.25+0.75*r(),s.tone,0],i*4);
      const sc=0.9+r()*0.18; Q.setFromAxisAngle(Y,s.r+(r()-0.5)*0.25); V.set(s.x,s.z,s.y); Sc.set(sc,sc*(0.94+r()*0.12),sc); M.compose(V,Q,Sc); mesh.setMatrixAt(i,M);
      if(r()<(P.tier.detail>1?0.016:0.012)&&s.zone!=='U') flags.push({M:M.clone(),d:[aD[i*4],aD[i*4+1],s.tone,0],c1:own.c1,c2:own.c2}); }
    geo.setAttribute('iShirt',new T.InstancedBufferAttribute(aSh,3)); geo.setAttribute('iSkin',new T.InstancedBufferAttribute(aSk,3)); geo.setAttribute('iHair',new T.InstancedBufferAttribute(aHr,3)); geo.setAttribute('iScarf',new T.InstancedBufferAttribute(aSc,3)); geo.setAttribute('iData',new T.InstancedBufferAttribute(aD,4));
    C.u={uTime:{value:0},uHype:{value:0},uShade:{value:1}};
    const mat=tr(new T.MeshLambertMaterial({color:'#ffffff'}));
    mat.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,C.u);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aPart; attribute vec3 iShirt; attribute vec3 iSkin; attribute vec3 iHair; attribute vec3 iScarf; attribute vec4 iData; uniform float uTime; uniform float uHype; uniform float uShade; varying vec3 vFan;')
        .replace('#include <begin_vertex>',`vec3 transformed=vec3(position); ${V18S_MOTION}
          if(aPart>1.5&&aPart<3.5){ float sd=aPart<2.5?-1.0:1.0; float raise=up*(0.8+0.2*sin(uTime*9.0+ph*12.0))*step(0.3,eg); float ang=sd*(0.12+raise*2.55);
            vec2 pv=vec2(sd*0.25,0.5); vec2 rr=transformed.xy-pv; float cs=cos(ang), sn=sin(ang); transformed.xy=pv+vec2(cs*rr.x-sn*rr.y,sn*rr.x+cs*rr.y); }
          transformed.y+=lift; transformed.x+=sway*(position.y+0.35);
          vFan=iShirt; if(aPart>0.5&&aPart<1.5) vFan=position.y>0.80?iHair:iSkin; else if(aPart>3.5) vFan=iScarf; else if(aPart>1.5&&position.y<0.16) vFan=iSkin;
          vFan*=1.0-clamp(iData.z*uShade,0.0,0.8);`);
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFan;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vFan;'); };
    mesh.material=mat; mesh.instanceMatrix.needsUpdate=true; mesh.frustumCulled=false; mesh.computeBoundingSphere&&mesh.computeBoundingSphere(); P.scene.add(mesh); C.mesh=mesh;
    /* flag-wavers */
    const nf=Math.min(flags.length,P.tier.detail>1?60:P.tier.detail>0?30:12);
    if(nf>0){ const fg=tr(v18sFlagGeo(T)); const fm=new T.InstancedMesh(fg,null,nf); const f1=new Float32Array(nf*3), f2=new Float32Array(nf*3), fd=new Float32Array(nf*4);
      for(let i=0;i<nf;i++){ const f=flags[i]; fm.setMatrixAt(i,f.M); col.set(f.c1); f1.set([col.r,col.g,col.b],i*3); col.set(f.c2); f2.set([col.r,col.g,col.b],i*3); fd.set(f.d,i*4); }
      fg.setAttribute('iC1',new T.InstancedBufferAttribute(f1,3)); fg.setAttribute('iC2',new T.InstancedBufferAttribute(f2,3)); fg.setAttribute('iData',new T.InstancedBufferAttribute(fd,4));
      const m2=tr(new T.MeshLambertMaterial({color:'#ffffff',side:T.DoubleSide}));
      m2.onBeforeCompile=sh=>{ Object.assign(sh.uniforms,C.u);
        sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aPart; attribute float aU; attribute vec3 iC1; attribute vec3 iC2; attribute vec4 iData; uniform float uTime; uniform float uHype; uniform float uShade; varying vec3 vFan;')
          .replace('#include <begin_vertex>',`vec3 transformed=vec3(position); ${V18S_MOTION}
            if(aPart>0.5){ transformed.z+=sin(uTime*6.0-aU*5.0+ph*6.2831)*0.16*aU; transformed.y+=sin(uTime*4.0-aU*3.0+ph)*0.05*aU; }
            float sw=sin(uTime*(2.2+eg)+ph*6.2831)*(0.22+0.45*uHype); vec2 pv=vec2(0.28,0.45); vec2 rr=transformed.xy-pv; float cs=cos(sw), sn=sin(sw); transformed.xy=pv+vec2(cs*rr.x-sn*rr.y,sn*rr.x+cs*rr.y);
            transformed.y+=lift; vFan=aPart<0.5?vec3(0.75):(position.y>2.085?iC1:iC2); vFan*=1.0-clamp(iData.z*uShade,0.0,0.8);`);
        sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFan;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vFan;'); };
      fm.material=m2; fm.instanceMatrix.needsUpdate=true; fm.frustumCulled=false; P.scene.add(fm); C.flags=fm; }
    /* camera flashes: one additive Points pool */
    { const nb=C.bul; const g=tr(new T.BufferGeometry()); C.bp=new Float32Array(nb*3); C.bc=new Float32Array(nb*3); for(let i=0;i<nb;i++) C.bp[i*3+1]=-50;
      const pa=new T.BufferAttribute(C.bp,3), ca=new T.BufferAttribute(C.bc,3); pa.setUsage(T.DynamicDrawUsage); ca.setUsage(T.DynamicDrawUsage); g.setAttribute('position',pa); g.setAttribute('color',ca); C.pa=pa; C.ca=ca; g.boundingSphere=new T.Sphere(new T.Vector3(52.5,0,34),200);
      const pm=new T.Points(g,tr(new T.PointsMaterial({map:v18sGlowTex(P),size:2.4,sizeAttenuation:true,vertexColors:true,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false}))); pm.renderOrder=8; pm.frustumCulled=false; P.scene.add(pm); C.pts=pm; }
    C.wk=null; },
  frame(P,st){ const C=P.crowd, S=P.stadium; if(!C||!C.mesh) return; const now=st.now||0; const h=st.rm?0:(st.hype||0);
    if(C.wk!==P._wxKey){ C.wk=P._wxKey; C.u.uShade.value=P.night?1.5:0.9; }
    C.hype+=(h-C.hype)*Math.min(1,(P.dt||0.016)*(h>C.hype?8:2.5)); C.u.uHype.value=C.hype; C.u.uTime.value=st.rm?0:now/1000;
    /* flashes: st.bulbs on the main stand, photographers while the goal is on */
    const bp=C.bp, bc=C.bc, nb=C.bul; let k=0; const B=st.bulbs||[];
    for(let i=0;i<B.length&&k<nb;i++){ const q=B[i]; if(now<q.t) continue; const a=1-(now-q.t)/220; if(a<=0) continue; const ri=q.row*10/7; bp[k*3]=q.x; bp[k*3+1]=0.95+0.34*ri+1.1; bp[k*3+2]=-6-0.8*ri-0.5; bc[k*3]=bc[k*3+1]=bc[k*3+2]=a; k++; }
    if(S&&S.photogs&&h>0.5){ for(let j=0;j<S.photogs.length;j++){ const p=S.photogs[j]; if(k>=nb) break; if(Math.random()<0.25){ bp[k*3]=p[0]; bp[k*3+1]=p[2]; bp[k*3+2]=p[1]; bc[k*3]=bc[k*3+1]=bc[k*3+2]=1; k++; } } }
    const used=k; for(;k<(C.lastUsed||0);k++){ bc[k*3]=bc[k*3+1]=bc[k*3+2]=0; bp[k*3+1]=-50; } C.lastUsed=used;
    if(used||C.hadB){ C.pa.needsUpdate=true; C.ca.needsUpdate=true; } C.hadB=used>0; },
  resize(P){}, dispose(P){ P.crowd=null; } });
