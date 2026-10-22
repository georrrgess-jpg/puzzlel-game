/* ===================== v17 look: the turf, the light and the crowd (presentation only) =====================
   Replaces the flat pitch fills, the five radial "light pools", the wear ellipses, the constant-width markings and the
   dot crowd of Stage.prototype.drawBroadcast. Nothing here reads or writes simulation state, the match RNG or engine.js.
   drawBroadcast has no seam for these pieces, so it is redefined below as a faithful copy of the v16 body with exactly
   four edits (each marked "v17 look"): the live crowd fan, a roof shadow, the pitch block and the markings block.
   If another module has already wrapped drawBroadcast (its source no longer contains the v16 marker) nothing is replaced.
   1. Light. One layer, baked once into an offscreen canvas at half resolution and blitted every frame (rebuilt on
      resize, render-scale change or weather/time change; zoom only changes the blit): a wide elliptical falloff that is
      brightest around the middle of the floodlight coverage and darkens gently toward the far corners and the near edge,
      a warm/cool side-sheen (lit from the left), floodlight lobes at night, a low warm sun when golden and a wet sheen
      when it rains. A fraction of the camera pan moves the layer, so the light feels fixed to the stadium, not the lens.
   2. Turf. The 20 mown stripes keep their exact perspective polygons but are filled with two shared horizontal gradients,
      so the stripe contrast is strong on the lit side and fades across the pitch (the way real mown grass looks from one
      side), and the checker polygons are gone. The grass noise is a 384 px tile of blades and mottle, drawn in five depth
      bands with a different scale each (finer far away) and anchored to the ground, so it pans with the pitch.
   3. Wear. Goalmouths, penalty spots and the centre spot are cached textures of worn, flattened grass (blades, bare
      earth flecks, an irregular edge) instead of translucent ellipses.
   4. Markings. Each line is a ribbon whose width follows perspective (thicker near the camera, thinner at the far
      touchline), painted slightly warm-white with a faint soft halo; one path and one fill per pass.
   5. Crowd. genCrowd gives fans a home-colour-weighted palette, hair, a few hats and scarves. Fans are drawn as head,
      hair and shoulders with a dark rim, darker toward the back rows and the top of the stand and darker again at night;
      the cached strips come in two frames (a tiny sway) that each row swaps about every 0.9 s on its own phase (reduced
      motion keeps one frame). The live drawing after a goal and the flag-wavers use the same fan function and tones. */
const V17L_MARK='light: pools under the floodlights';
const v17lClamp=(v,a,b)=>v<a?a:v>b?b:v;
const v17lMk=(w,h)=>{ const c=document.createElement('canvas'); c.width=Math.max(2,Math.ceil(w)); c.height=Math.max(2,Math.ceil(h)); return c; };

/* ---------- light layer ---------- */
function v17lBakeLight(W,H,yTop,night,golden,kind,dpr){
  const s=dpr; const LW=Math.ceil(W*1.5), LH=Math.max(2,Math.ceil(H-yTop)); const cv=v17lMk(LW*s,LH*s); const q=cv.getContext('2d'); q.scale(s,s);
  const cx=LW/2; const wet=kind==='rain'||kind==='snow'||kind==='clouds'||kind==='fog';
  const ell=(x,y,rx,ry,stops)=>{ q.save(); q.translate(x,y); q.scale(1,ry/rx); const gr=q.createRadialGradient(0,0,0,0,0,rx); for(const [o,c] of stops) gr.addColorStop(o,c); q.fillStyle=gr; q.fillRect(-LW*3,-LW*3,LW*6,LW*6); q.restore(); };
  /* broad glow around the middle of the coverage */
  if(night){ for(const sx of [-1,1]) ell(cx+sx*W*0.40,LH*0.10,W*0.62,LH*0.95,[[0,'rgba(255,246,214,.085)'],[0.5,'rgba(255,246,214,.035)'],[1,'rgba(255,246,214,0)']]);
    ell(cx,LH*0.58,W*0.52,LH*0.72,[[0,'rgba(255,248,226,.05)'],[1,'rgba(255,248,226,0)']]); }
  else if(golden) ell(cx-W*0.12,LH*0.45,W*0.62,LH*0.9,[[0,'rgba(255,214,150,.10)'],[1,'rgba(255,214,150,0)']]);
  else ell(cx,LH*0.5,W*0.6,LH*0.85,[[0,wet?'rgba(205,220,235,.05)':'rgba(255,255,236,.075)'],[1,'rgba(255,255,236,0)']]);
  if(kind==='rain') ell(cx+W*0.05,LH*0.30,W*0.55,LH*0.14,[[0,'rgba(215,230,250,.07)'],[1,'rgba(215,230,250,0)']]);
  /* falloff toward the far corners and the edges */
  const vA=night?0.34:golden?0.30:wet?0.28:0.19;
  ell(cx,LH*0.62,W*0.74,LH*1.0,[[0,'rgba(0,10,6,0)'],[0.5,'rgba(0,10,6,0)'],[1,`rgba(0,10,6,${vA})`]]);
  /* lit from the left: a gentle side-sheen across the pitch */
  const sh=q.createLinearGradient(cx-W*0.55,0,cx+W*0.55,0);
  if(golden){ sh.addColorStop(0,'rgba(255,176,92,.11)'); sh.addColorStop(0.55,'rgba(255,176,92,0)'); sh.addColorStop(1,'rgba(40,30,64,.15)'); }
  else if(night){ sh.addColorStop(0,'rgba(255,248,226,.045)'); sh.addColorStop(0.5,'rgba(255,248,226,0)'); sh.addColorStop(1,'rgba(0,8,14,.07)'); }
  else { sh.addColorStop(0,wet?'rgba(215,225,235,.035)':'rgba(255,255,230,.06)'); sh.addColorStop(0.5,'rgba(255,255,230,0)'); sh.addColorStop(1,'rgba(0,16,8,.07)'); }
  q.fillStyle=sh; q.fillRect(0,0,LW,LH);
  /* nearer to the camera the turf sits further from the lamps */
  const bt=q.createLinearGradient(0,LH*0.62,0,LH); bt.addColorStop(0,'rgba(0,0,0,0)'); bt.addColorStop(1,night?'rgba(0,0,0,.20)':'rgba(0,0,0,.10)'); q.fillStyle=bt; q.fillRect(0,LH*0.62,LW,LH*0.38);
  return {cv,LW,LH};
}

/* ---------- grass grain tile (blades and mottle; wraps at the edges) ---------- */
function v17lGrainTile(d){
  const S=384, c=v17lMk(S*d,S*d), q=c.getContext('2d'); q.scale(d,d); const r=rngFrom(0x6a51); const wrap=(x,y,rad,fn)=>{ for(const ox of [0,-S,S]) for(const oy of [0,-S,S]){ const X=x+ox,Y=y+oy; if(X<-rad||X>S+rad||Y<-rad||Y>S+rad) continue; fn(X,Y); } };
  for(let i=0;i<64;i++){ const x=r()*S,y=r()*S,rad=12+r()*30,dark=r()<0.5,a=0.04+r()*0.035; wrap(x,y,rad,(X,Y)=>{ const gr=q.createRadialGradient(X,Y,0,X,Y,rad); gr.addColorStop(0,dark?`rgba(0,28,10,${a})`:`rgba(200,255,150,${a})`); gr.addColorStop(1,'rgba(0,0,0,0)'); q.fillStyle=gr; q.fillRect(X-rad,Y-rad,rad*2,rad*2); }); }
  q.lineCap='round';
  for(let i=0;i<4600;i++){ const x=r()*S,y=r()*S,L=2.2+r()*4.6,an=(r()-0.5)*0.7,dark=r()<0.52,a=dark?0.07+r()*0.10:0.05+r()*0.09; q.lineWidth=0.7+r()*0.5; q.strokeStyle=dark?`rgba(0,30,10,${a})`:`rgba(215,255,170,${a})`;
    wrap(x,y,7,(X,Y)=>{ q.beginPath(); q.moveTo(X,Y); q.lineTo(X+Math.sin(an)*L,Y-Math.cos(an)*L); q.stroke(); }); }
  return c; }

/* ---------- worn grass patch (goalmouth, spot) ---------- */
function v17lWearTex(seed,big){
  const w=big?224:128, h=big?144:88, c=v17lMk(w,h), q=c.getContext('2d'); const r=rngFrom(seed); const cx=w/2, cy=h/2;
  const ph=[r()*6.28,r()*6.28,r()*6.28], am=[0.16,0.09,0.05];
  const R=a=>0.74+am[0]*Math.sin(a*2+ph[0])+am[1]*Math.sin(a*3+ph[1])+am[2]*Math.sin(a*5+ph[2]);
  const gr=q.createRadialGradient(cx,cy,0,cx,cy,w/2); gr.addColorStop(0,'rgba(104,112,52,.30)'); gr.addColorStop(0.55,'rgba(104,112,52,.14)'); gr.addColorStop(1,'rgba(104,112,52,0)'); q.save(); q.translate(0,0); q.fillStyle=gr; q.beginPath(); q.ellipse(cx,cy,w/2,h/2,0,0,7); q.fill(); q.restore();
  q.lineCap='round'; const n=big?1500:700; const cols=['rgba(158,134,76,','rgba(122,128,60,','rgba(88,68,36,','rgba(188,168,108,','rgba(70,92,40,'];
  for(let i=0;i<n;i++){ const a=r()*6.2832, u=Math.pow(r(),0.62), lim=R(a); if(u>lim) continue; const f=1-u/lim; if(r()>Math.pow(f,0.55)+0.05) continue;
    const x=cx+Math.cos(a)*u*w*0.47, y=cy+Math.sin(a)*u*h*0.47, L=2+r()*(big?6:5), ci=Math.floor(r()*cols.length), al=(0.08+r()*0.18)*(0.45+f*0.8);
    q.strokeStyle=cols[ci]+Math.min(0.5,al)+')'; q.lineWidth=0.8+r()*0.8; q.beginPath(); q.moveTo(x,y); q.lineTo(x+(r()-0.5)*2.4,y-L); q.stroke(); }
  for(let i=0;i<(big?70:26);i++){ const a=r()*6.2832, u=Math.pow(r(),0.8)*0.8, lim=R(a); if(u>lim*0.85) continue; q.fillStyle=`rgba(76,58,32,${0.10+r()*0.12})`; q.beginPath(); q.ellipse(cx+Math.cos(a)*u*w*0.45,cy+Math.sin(a)*u*h*0.45,0.8+r()*1.6,0.5+r()*0.9,0,0,7); q.fill(); }
  return c; }

/* ---------- marking geometry (world metres), subdivided so thickness can follow perspective ---------- */
const V17L_MK=(()=>{ const out=[]; const poly=(pts,corners)=>{ const X=[],Y=[],C=[]; for(let i=0;i<pts.length;i++){ const [x1,y1]=pts[i]; if(i===0){ X.push(x1); Y.push(y1); C.push(true); continue; } const [x0,y0]=pts[i-1]; X.push(x1); Y.push(y1); C.push(corners||i===pts.length-1); } out.push({X,Y,C}); };
  const circ=(cx,cy,r,a0=0,a1=6.2832,N=40)=>{ const pts=[]; for(let i=0;i<=N;i++){ const a=a0+(a1-a0)*i/N; pts.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]); } poly(pts,false); };
  poly([[0,0],[105,0],[105,68],[0,68],[0,0]],true); poly([[52.5,0],[52.5,68]],true); circ(52.5,34,9.15,0,6.2832,48);
  poly([[0,13.84],[16.5,13.84],[16.5,54.16],[0,54.16]],true); poly([[105,13.84],[88.5,13.84],[88.5,54.16],[105,54.16]],true);
  poly([[0,24.84],[5.5,24.84],[5.5,43.16],[0,43.16]],true); poly([[105,24.84],[99.5,24.84],[99.5,43.16],[105,43.16]],true);
  circ(11,34,9.15,-0.93,0.93,22); circ(94,34,9.15,Math.PI-0.93,Math.PI+0.93,22);
  circ(0,0,1,0,1.5708,6); circ(105,0,1,1.5708,3.1416,6); circ(0,68,1,-1.5708,0,6); circ(105,68,1,3.1416,4.7124,6);
  return out; })();

/* ---------- crowd ---------- */
const V17L_HAIR=['#15100c','#241810','#3a2616','#5a3d22','#8a6a3a','#c9a35a','#a9a9a9','#0d0d0d','#4a2a18'];
function v17lTone(row,night){ const t=row<8?row*0.012:0.13+(row-8)*0.03; return Math.min(0.8,t+(night?(row<8?0.07:0.15):0)); }
function v17lCols(c,t){ if(c._tk===t) return; c._tk=t; const D='#05080c'; c.kC=mix(c.c,D,t); c.kS=mix(c.sk,D,t*0.85); c.kH=mix(c.hair,D,t*0.7); c.kR='rgba(0,0,0,'+Math.min(0.62,0.34+t*0.4)+')'; c.kT=c.hat?mix(c.hat,D,t):null; c.kF=c.scarf?mix(c.scarf,D,t):null; c.kF2=c.scarf2?mix(c.scarf2,D,t):null; }
/* one fan: dome of shoulders with a dark rim, head, hair or a hat, an occasional scarf; (x,y) is the head centre, rr its radius */
function v17Fan(q,x,y,rr,c,tone,dx,dy){
  rr*=1.12; v17lCols(c,tone||0); if(dx){ x+=dx; } if(dy){ y+=dy; }
  const sw=rr*1.5, yb=y+rr*2.05, lw=Math.max(0.55,rr*0.26);
  q.fillStyle=c.kR; q.beginPath(); q.ellipse(x,yb,sw+lw*0.6,rr*1.42+lw*0.6,0,Math.PI,6.2832); q.fill();
  q.fillStyle=c.kC; q.beginPath(); q.ellipse(x,yb,sw,rr*1.42,0,Math.PI,6.2832); q.fill();
  if(c.kF){ q.fillStyle=c.kF; q.fillRect(x-rr*0.78,y+rr*0.86,rr*1.56,rr*0.4); if(c.kF2){ q.fillStyle=c.kF2; q.fillRect(x-rr*0.2,y+rr*0.86,rr*0.38,rr*0.4); } q.fillStyle=c.kF; q.fillRect(x+rr*0.18,y+rr*1.1,rr*0.4,rr*0.7); }
  q.fillStyle=c.kS; q.beginPath(); q.arc(x,y,rr*0.93,0,7); q.fill();
  if(c.kT){ q.fillStyle=c.kT; q.beginPath(); q.arc(x,y,rr*1.0,Math.PI*0.94,Math.PI*2.06); q.closePath(); q.fill(); q.fillStyle='rgba(255,255,255,.22)'; q.fillRect(x-rr*0.96,y-rr*0.12,rr*1.92,rr*0.18); }
  else { q.fillStyle=c.kH; q.beginPath(); q.arc(x,y,rr*0.96,Math.PI*(1-c.hk),Math.PI*(2+c.hk)); q.closePath(); q.fill(); }
}
Stage.prototype.genCrowd=function(){
  const r=rngFrom(hashStr((this.T&&this.T.id)||'crowd')); const out=[]; const h=this.h, a=this.a;
  const pal=[[h.c1,5],[h.c2,1.6],['#d8dde3',1.2],['#5b6573',1.1],['#2d333b',1.1],[a.c1,0.35],['#c49a6c',0.6],['#8a5a3c',0.5],['#46607d',0.7],['#7d8a99',0.6],[mix(h.c1,'#ffffff',0.35),0.9]]; let tw=0; for(const p of pal) tw+=p[1];
  const pick=()=>{ let v=r()*tw; for(const p of pal){ v-=p[1]; if(v<=0) return p[0]; } return pal[0][0]; };
  for(let row=0;row<13;row++){ const up=row>=7; const R=up?row+1:row; for(let x=-24;x<130;x+=(up?0.95:1.1)+r()*0.55){ const away=x>92&&r()<0.6; const fl=r()<0.035?(away?a.c1:(r()<0.5?h.c1:h.c2)):null;
    let col=away?a.c1:pick(); const t=r(); col=mix(col,t<0.5?'#ffffff':'#000000',(t<0.5?t:t-0.5)*0.26);
    const f={x, row:R, c:col, sk:LOOK.skin[Math.floor(r()*12)], ph:r()*6.28, s:0.82+r()*0.4, flag:fl, hair:V17L_HAIR[Math.floor(r()*V17L_HAIR.length)], hk:0.05+r()*0.2, hat:null, scarf:null, scarf2:null};
    const q=r(); const own=away?a:h; if(q<0.05){ f.hat=r()<0.7?own.c1:own.c2; } else if(q<0.115){ f.scarf=own.c1; f.scarf2=own.c2; }
    out.push(f); } }
  return out; };
/* cached rows: two frames per row (a tiny sway), the second painted the first time it is needed */
Stage.prototype.drawCrowdFast=function(g,W,yBase,yCon,rowH,uH){
  try{
    const night=!this.wx||this.wx.night, dpr=this.dpr||1, X0=-25, X1=132; const key=W+'|'+this.H+'|'+Math.round(dpr*100)+'|'+(night?1:0)+'|'+this.h.c1+this.h.c2;
    if(!this._v17rows||this._v17rowsFor!==this.crowd){ const m=new Map(); for(const c of this.crowd){ if(!m.has(c.row)) m.set(c.row,[]); m.get(c.row).push(c); } this._v17rows=[...m.entries()].sort((a,b)=>a[0]-b[0]); this._v17rowsFor=this.crowd; this._v17cc=null; }
    if(!this._v17cc||this._v17cc.key!==key) this._v17cc={key,rows:{}};
    const swayOn=!this.rm; const now=this.now||0; this._v17bf=(this._v17bf||0)+1;
    for(const [row,fans] of this._v17rows){ const up=row>=8; const rr0=up?uH:rowH; const Y=up?-17-(row-8)*1.5:-6-row*1.6;
      const k=(W/this.cam.w)*(0.56+0.44*(Y/68)); const yy=up? yCon-uH*(row-8+0.55) : yBase-rowH*(row+0.55);
      const top=yy-rr0*0.5, h=rr0*1.25; let st=this._v17cc.rows[row]; const tone=v17lTone(row,night);
      if(!st||Math.abs(k/st.k-1)>0.18){ const cw=Math.ceil((X1-X0)*k*dpr); if(cw>16000) return false; st={k,t:now,f:[null,null],cw,ch:Math.max(2,Math.ceil(h*dpr))}; this._v17cc.rows[row]=st; }
      let fr=swayOn&&now-st.t>1200?(Math.floor((now+row*173)/900)&1):0; if(!st.f[fr]&&st.f[1-fr]&&this._v17bk===this._v17bf) fr=1-fr;
      if(!st.f[fr]){ this._v17bk=this._v17bf; const cv=v17lMk(st.cw,st.ch); const q=cv.getContext('2d'); q.setTransform(dpr,0,0,dpr,0,0);
        for(const c of fans){ if(c.flag) continue; const rr=rr0*0.27*c.s; const sw=fr?Math.PI:0; v17Fan(q,(c.x-X0)*st.k,yy-top,rr,c,tone,swayOn?Math.sin(c.ph*2.3+sw)*rr*0.14:0,swayOn?-(0.5+0.5*Math.sin(c.ph+sw))*rr*0.30:0); }
        st.f[fr]=cv; }
      const dx=W/2+(X0-this.cam.x)*k, dw=(X1-X0)*k; g.drawImage(st.f[fr],dx,top,dw,h); }
    return true;
  }catch(e){ return false; }
};
Stage.prototype._v17RoofShade=function(g,W,yRoof,yUp,uH,rowH,night){
  const y0=yRoof+rowH*0.5, y1=yUp+uH*4.5; const gr=g.createLinearGradient(0,y0,0,y1); gr.addColorStop(0,night?'rgba(0,0,0,.46)':'rgba(0,0,0,.36)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,y0,W,y1-y0); };

/* ---------- the pitch: stripes, grain, wear, light ---------- */
Stage.prototype._v17Pitch=function(g,poly,night,golden,yBase){
  const W=this.W,H=this.H,wx=this.wx,cam=this.cam, kind=wx?wx.k:'clear', dpr=this.dpr||1;
  poly([[-40,-2.6],[145,-2.6],[145,80],[-40,80]],night?'#123d24':'#1a5532');
  /* mown stripes: contrast is strongest on the lit (left) side and relaxes across the pitch */
  const gl=g.createLinearGradient(0,0,W,0), gd=g.createLinearGradient(0,0,W,0);
  gl.addColorStop(0,'#33a457'); gl.addColorStop(0.5,'#2e9650'); gl.addColorStop(1,'#2c9150'); gd.addColorStop(0,'#237f3f'); gd.addColorStop(0.5,'#268646'); gd.addColorStop(1,'#27854a');
  for(let i=0;i<20;i++) poly([[i*5.25,0],[(i+1)*5.25,0],[(i+1)*5.25,68],[i*5.25,68]], i%2?gl:gd);
  /* grain: five depth bands (finer toward the far side), each a tile pre-scaled to device density so it blits 1:1, anchored to the ground */
  { const gk=Math.round(dpr*100); if(!V17L.bands||V17L.bandsKey!==gk){ const master=V17L.master||(V17L.master=v17lGrainTile(2)); V17L.bands=[0.5,0.68,0.88,1.1,1.4].map(sc=>{ const px=Math.max(32,Math.round(384*sc*dpr)); const c=v17lMk(px,px); const q=c.getContext('2d'); q.imageSmoothingQuality='high'; q.drawImage(master,0,0,px,px); return {pat:g.createPattern(c,'repeat'),px}; }); V17L.bandsKey=gk; }
    const yF=H*0.265, yN=H*0.97, k0=W/cam.w; const edges=[-2.6,9,20,34,52,80]; g.save(); g.globalAlpha=night?0.5:0.6;
    for(let b=0;b<5;b++){ const Ya=edges[b],Yb=edges[b+1]; const ya=yF+(yN-yF)*Ya/68, yb=Math.min(H,yF+(yN-yF)*Yb/68)+1; if(yb<=ya) continue; const km=k0*(0.56+0.44*v17lClamp((Ya+Yb)/2/68,0,1)); const B=V17L.bands[b];
      let tx=Math.round((W/2-cam.x*km)*dpr)%B.px; if(tx<0) tx+=B.px; if(B.pat.setTransform) B.pat.setTransform(new DOMMatrix([1/dpr,0,0,1/dpr,tx/dpr,Math.round(ya*dpr)/dpr])); g.fillStyle=B.pat; g.fillRect(0,ya,W,yb-ya); }
    g.restore(); }
  /* wear: cached patches of worn grass */
  if(!V17L.wear) V17L.wear={goal:v17lWearTex(11,true),goal2:v17lWearTex(12,true),spot:v17lWearTex(13,false),spot2:v17lWearTex(14,false),ctr:v17lWearTex(15,false)};
  { const Wr=V17L.wear; g.save(); g.globalAlpha=night?0.8:1; for(const [x,y,rx,ry,t] of [[2.6,34,3.6,4.2,Wr.goal],[102.4,34,3.6,4.2,Wr.goal2],[11,34,1.7,1.25,Wr.spot],[94,34,1.7,1.25,Wr.spot2],[52.5,34,2.6,1.9,Wr.ctr]]){ const [sx,sy,kk]=this.proj(x,y); const w=rx*kk*2.5, h=ry*kk*0.55*2.5; if(sx+w<0||sx-w>W) continue; g.drawImage(t,sx-w/2,sy-h/2,w,h); } g.restore(); }
  /* light: the cached falloff layer (per stage), blitted 1:1 through a window that follows a fraction of the camera pan */
  { const lk=W+'x'+H+'@'+Math.round(dpr*100)+'|'+kind+'|'+(night?1:0)+(golden?1:0); const yTop=this.proj(0,-2.6)[1];
    if(!this._v17light||this._v17lightKey!==lk){ this._v17light=v17lBakeLight(W,H,yTop,night,golden,kind,dpr); this._v17lightKey=lk; this._v17lightTop=yTop; }
    const L=this._v17light; const par=v17lClamp(-(cam.x-52.5)*(W/cam.w)*0.78*0.3,-W*0.25,W*0.25); const sx=v17lClamp((L.LW-W)/2-par,0,L.LW-W);
    g.drawImage(L.cv,Math.round(sx*dpr),0,Math.round(W*dpr),L.cv.height,0,this._v17lightTop,W,L.LH); }
};

/* ---------- markings: perspective-width ribbons, one path per pass ---------- */
Stage.prototype._v17Marks=function(g){
  const W=this.W,H=this.H,cam=this.cam; const k0=W/cam.w, yF=H*0.265, dY=(H*0.97-yF)/68, hx=W/2, wk=0.0275*(W>900?1:0.9); const pts=V17L.mk||(V17L.mk=V17L_MK.map(m=>({n:m.X.length,sx:new Float32Array(m.X.length),sy:new Float32Array(m.X.length),hw:new Float32Array(m.X.length),C:m.C})));
  for(let j=0;j<pts.length;j++){ const m=V17L_MK[j], p=pts[j]; for(let i=0;i<p.n;i++){ const Y=m.Y[i], k=k0*(0.56+0.44*Y/68); p.sx[i]=hx+(m.X[i]-cam.x)*k; p.sy[i]=yF+dY*Y; const w=wk*k; p.hw[i]=w<0.58?0.58:w>2.8?2.8:w; } }
  const pass=(mul,fill)=>{ g.beginPath();
    for(const p of pts){ const {n,sx,sy,hw,C}=p; for(let i=0;i<n-1;i++){ let dx=sx[i+1]-sx[i], dy=sy[i+1]-sy[i]; const l=Math.sqrt(dx*dx+dy*dy); if(l<0.01) continue; dx/=l; dy/=l; const nx=-dy, ny=dx, a=hw[i]*mul, b=hw[i+1]*mul;
        g.moveTo(sx[i]+nx*a,sy[i]+ny*a); g.lineTo(sx[i+1]+nx*b,sy[i+1]+ny*b); g.lineTo(sx[i+1]-nx*b,sy[i+1]-ny*b); g.lineTo(sx[i]-nx*a,sy[i]-ny*a); g.closePath(); }
      for(let i=0;i<n;i++) if(C[i]){ g.moveTo(sx[i]+hw[i]*mul,sy[i]); g.arc(sx[i],sy[i],hw[i]*mul,0,6.2832,true); } }
    g.fillStyle=fill; g.fill(); };
  pass(1,'rgba(248,251,243,.93)');
  for(const [x,y] of [[52.5,34],[11,34],[94,34]]){ const [sx,sy]=this.proj(x,y); g.fillStyle='#f6f9f1'; g.beginPath(); g.ellipse(sx,sy,2.3,1.45,0,0,7); g.fill(); }
};
const V17L={};

if(Stage.prototype.drawBroadcast.toString().indexOf(V17L_MARK)>=0) Stage.prototype.drawBroadcast=function(g){
    const W=this.W,H=this.H, now=this.now, hype=this.rm?0:this.hype; const wx=this.wx; const night=!wx||wx.night; const golden=wx&&wx.k==='golden';
    const [,yBase]=this.proj(0,-5.5); const rowH=Math.max(3,H*0.0128);
    // sky
    const sky=g.createLinearGradient(0,0,0,yBase); if(night){ sky.addColorStop(0,'#03060c'); sky.addColorStop(1,'#101b2e'); } else if(golden){ sky.addColorStop(0,'#3b4c78'); sky.addColorStop(1,'#f0a868'); } else { sky.addColorStop(0,'#4f7fb8'); sky.addColorStop(1,'#a9c6e3'); }
    g.fillStyle=sky; g.fillRect(0,0,W,H);
    // ---------- the stand: lower tier, hospitality band, upper tier, roof ----------
    const yLow=yBase-rowH*7, conH=rowH*1.55, yCon=yLow-conH, uH=rowH*0.78, yUp=yCon-uH*6, yRoof=yUp-rowH*1.1;
    const steel=night?'#0b1018':'#1d2530';
    g.fillStyle=steel; g.fillRect(0,yRoof-rowH*3,W,yBase-yRoof+rowH*3);
    g.fillStyle=night?'#151c27':'#2a3340'; for(let r=0;r<7;r++) g.fillRect(0,yBase-rowH*(r+1),W,1); for(let r=0;r<6;r++) g.fillRect(0,yCon-uH*(r+1),W,1);
    // hospitality band: glass boxes with warm light, a team-colour fascia and a scrolling LED ribbon
    const cg=g.createLinearGradient(0,yCon,0,yLow); cg.addColorStop(0,'#1a2230'); cg.addColorStop(1,'#0c1118'); g.fillStyle=cg; g.fillRect(0,yCon,W,conH);
    for(let x=-30;x<136;x+=4.2){ const [x0]=this.proj(x,-14), [x1]=this.proj(x+3.6,-14); if(x1<0||x0>W) continue; const lit=(hashStr('box'+Math.round(x*10))%5)!==0; g.fillStyle=lit?(night?'rgba(255,214,150,.55)':'rgba(255,230,190,.28)'):'rgba(120,150,190,.18)'; g.fillRect(x0,yCon+conH*0.12,x1-x0,conH*0.42); }
    g.fillStyle=this.h.c1; g.fillRect(0,yLow-conH*0.3,W,conH*0.3);
    { const ry=yLow-conH*0.3, rh=conH*0.3; g.save(); g.beginPath(); g.rect(0,ry,W,rh); g.clip(); g.fillStyle=lum(this.h.c1)>0.5?'#111':'#fff'; g.font=`800 ${Math.max(7,Math.round(rh*0.82))}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.textBaseline='middle'; g.textAlign='left';
      const msg=hype>0.55?`  GOAL  ·  GOAL  ·  GOAL  ·  `:`  ${(this.h.town||'HOME').toUpperCase()} ${String(this.h.mascot||'').toUpperCase()}  ·  SECTION ${this.section}  ·  TOUCHLINE  ·  `;
      const mw=g.measureText(msg).width||200; const off=-((now*0.05)%mw)-((this.cam.x*4)%mw); for(let xx=off;xx<W;xx+=mw) g.fillText(msg,xx,ry+rh/2+1); g.restore(); }
    // crowd (lower tier big, upper tier smaller); flags and scarves in the home colours; everyone up when it goes in
    const crowdFast=hype<=0.02&&this.drawCrowdFast(g,W,yBase,yCon,rowH,uH);
    for(const c of this.crowd){ if(crowdFast&&!c.flag) continue; const upTier=c.row>=8; const rr0=upTier?uH:rowH; const Y=upTier?-17-(c.row-8)*1.5:-6-c.row*1.6; const [x]=this.proj(c.x,Y); if(x<-4||x>W+4) continue;
      const jump=hype*Math.abs(Math.sin(now/95+c.ph))*rr0*0.6; const yy=(upTier? yCon-uH*(c.row-8+0.55) : yBase-rowH*(c.row+0.55))-jump-Math.sin(now/1700+c.ph)*0.4;
      const rr=rr0*0.27*c.s; v17Fan(g,x,yy,rr,c,v17lTone(c.row,night)); /* v17 look */
      if(c.flag){ const w=Math.sin(now/240+c.ph)*rr; g.strokeStyle='#ccc'; g.lineWidth=Math.max(0.6,rr*0.2); g.beginPath(); g.moveTo(x+rr,yy+rr); g.lineTo(x+rr,yy-rr*3.4); g.stroke(); g.fillStyle=c.flag; g.beginPath(); g.moveTo(x+rr,yy-rr*3.4); g.lineTo(x+rr*3.8+w,yy-rr*3.1); g.lineTo(x+rr*3.6+w,yy-rr*1.6); g.lineTo(x+rr,yy-rr*1.9); g.fill(); }
      else if(hype>0.35&&c.ph<1.4){ g.strokeStyle=c.kS; g.lineWidth=rr*0.5; g.beginPath(); g.moveTo(x-rr,yy+rr); g.lineTo(x-rr*1.6,yy-rr*1.4-jump*0.2); g.moveTo(x+rr,yy+rr); g.lineTo(x+rr*1.6,yy-rr*1.4); g.stroke(); } }
    for(const q of this.bulbs){ if(now<q.t) continue; const [x]=this.proj(q.x,-6-q.row*1.6); const y=yBase-rowH*(q.row+0.6); const a=1-(now-q.t)/220; const gr=g.createRadialGradient(x,y,0,x,y,rowH*1.4); gr.addColorStop(0,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x-rowH*1.5,y-rowH*1.5,rowH*3,rowH*3); }
    this._v17RoofShade(g,W,yRoof,yUp,uH,rowH,night); /* v17 look */
    // roof: steel fascia, a line of downlights and the video board hanging over halfway
    g.fillStyle=night?'#1b2330':'#3a4554'; g.fillRect(0,yRoof-rowH*0.5,W,rowH*1.1); g.fillStyle=mix(this.h.c1,'#000000',0.35); g.fillRect(0,yRoof+rowH*0.45,W,rowH*0.18);
    for(let x=-30;x<136;x+=3){ const [lx]=this.proj(x,-24); if(lx<0||lx>W) continue; g.fillStyle=night?'rgba(255,248,220,.95)':'rgba(255,255,255,.6)'; g.fillRect(lx-1,yRoof+rowH*0.62,2.2,1.6); }
    { const [bx]=this.proj(52.5,-26); const bw=Math.min(W*0.28,rowH*17), bh=rowH*3.6, by=Math.max(2,yRoof+rowH*0.9); if(bx+bw/2>0&&bx-bw/2<W){
        g.fillStyle='#05070a'; g.fillRect(bx-bw/2-3,by-3,bw+6,bh+6); g.strokeStyle='#2a3340'; g.lineWidth=1; g.beginPath(); g.moveTo(bx-bw*0.3,by-3); g.lineTo(bx-bw*0.3,0); g.moveTo(bx+bw*0.3,by-3); g.lineTo(bx+bw*0.3,0); g.stroke();
        const sg=g.createLinearGradient(0,by,0,by+bh); sg.addColorStop(0,'#0c1626'); sg.addColorStop(1,'#060b14'); g.fillStyle=sg; g.fillRect(bx-bw/2,by,bw,bh);
        const B=this.board?this.board():null; g.textBaseline='middle'; g.textAlign='center';
        if(hype>0.55){ g.fillStyle=Math.floor(now/180)%2?this.h.c1:'#ffd36b'; g.font=`900 ${Math.round(bh*0.62)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillText('GOAL!',bx,by+bh/2+1); }
        else if(B){ g.font=`800 ${Math.round(bh*0.36)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillStyle='#e8eef6'; g.fillText(B.h,bx-bw*0.3,by+bh*0.36); g.fillText(B.a,bx+bw*0.3,by+bh*0.36);
          g.fillStyle='#ffd36b'; g.font=`800 ${Math.round(bh*0.5)}px "JetBrains Mono",monospace`; g.fillText(`${B.sc[0]}-${B.sc[1]}`,bx,by+bh*0.42); g.fillStyle='#8fa3bb'; g.font=`700 ${Math.round(bh*0.2)}px "JetBrains Mono",monospace`; g.fillText(B.min,bx,by+bh*0.82); }
        else { g.fillStyle='#e8eef6'; g.font=`800 ${Math.round(bh*0.42)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.fillText('TOUCHLINE',bx,by+bh*0.5); }
        g.fillStyle='rgba(255,255,255,.05)'; for(let yy=by;yy<by+bh;yy+=2) g.fillRect(bx-bw/2,yy,bw,1); } }
    // floodlight masts at the four corners, lamp banks and their glow
    for(const [mx,my] of [[-16,-10],[121,-10]]){ const [x,yb]=this.proj(mx,my); const top=Math.max(6,yRoof-rowH*5); if(x<-80||x>W+80) continue;
      g.strokeStyle=night?'#1c232c':'#4a5563'; g.lineWidth=3; g.beginPath(); g.moveTo(x,yb); g.lineTo(x,top+10); g.stroke(); g.lineWidth=1; g.beginPath(); for(let yy=yb;yy>top+10;yy-=8){ g.moveTo(x-3,yy); g.lineTo(x+3,yy-8); } g.stroke();
      g.fillStyle='#2a323d'; g.fillRect(x-26,top-4,52,18); for(let r2=0;r2<2;r2++) for(let i=0;i<6;i++){ g.fillStyle=night?'#fffbe8':'#f2f2ea'; g.beginPath(); g.arc(x-21+i*8.4,top+1+r2*8,2.8,0,7); g.fill(); }
      if(night||(wx&&wx.k!=='clear')){ g.save(); g.globalCompositeOperation='lighter'; const gr=g.createRadialGradient(x,top+5,0,x,top+5,H*0.9); gr.addColorStop(0,'rgba(255,246,214,.30)'); gr.addColorStop(0.15,'rgba(255,246,214,.10)'); gr.addColorStop(1,'rgba(255,246,214,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H);
        const fl=g.createRadialGradient(x,top+5,0,x,top+5,30); fl.addColorStop(0,'rgba(255,255,255,.9)'); fl.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=fl; g.fillRect(x-30,top-25,60,60); g.restore(); } }
    // ---------- the pitch ----------
    const poly=(pts,fill)=>{ g.beginPath(); pts.forEach(([x,y],i)=>{ const [sx,sy]=this.proj(x,y); i?g.lineTo(sx,sy):g.moveTo(sx,sy); }); g.closePath(); g.fillStyle=fill; g.fill(); };
    this._v17Pitch(g,poly,night,golden,yBase); /* v17 look: stripes, grain, wear and the cached light layer */
    const vg=g.createLinearGradient(0,yBase,0,H); vg.addColorStop(0,'rgba(0,0,0,.3)'); vg.addColorStop(0.35,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.2)'); g.fillStyle=vg; g.fillRect(0,yBase,W,H-yBase);
    // the home crest painted in the centre circle
    { const [ox,oy]=this.proj(52.5,34), [ex,ey]=this.proj(53.5,34), [fx,fy]=this.proj(52.5,35); g.save(); g.transform(ex-ox,ey-oy,fx-ox,fy-oy,ox,oy);
      g.globalAlpha=0.2; g.fillStyle=this.h.c1; g.beginPath(); g.arc(0,0,6.2,0,7); g.fill(); g.globalAlpha=0.28; g.strokeStyle='#ffffff'; g.lineWidth=0.35; g.beginPath(); g.arc(0,0,5.4,0,7); g.stroke();
      g.globalAlpha=0.34; g.fillStyle='#ffffff'; g.textAlign='center'; g.textBaseline='middle'; g.font='900 2.6px "Big Shoulders Display","Arial Narrow",sans-serif'; g.fillText(String(this.h.town||'').toUpperCase(),0,-0.4,10.6); g.font='800 1.3px "Big Shoulders Display","Arial Narrow",sans-serif'; g.fillText(String(this.h.mascot||'').toUpperCase(),0,1.9); g.restore(); }
    this._v17Marks(g); /* v17 look: perspective-width ribbons */
    // LED boards along the far touchline (the dugouts sit in the gap at halfway)
    const [,yb,kb]=this.proj(0,-2.2); const bh=Math.max(6,kb*0.9);
    for(let x=-30;x<136;x+=12){ if(x>=36&&x<66) continue; const [x0]=this.proj(x,-2.2), [x1]=this.proj(x+12,-2.2); if(x1<0||x0>W) continue; const i=Math.round((x+30)/12); const goal=hype>0.55;
      const bg=goal?(Math.floor(now/160+i)%2?this.h.c1:'#ffd36b'):(Math.floor(now/4000+i)%3===0?this.h.c1:'#0d1117'); const grd=g.createLinearGradient(0,yb-bh,0,yb); grd.addColorStop(0,mix(bg,'#ffffff',.14)); grd.addColorStop(1,mix(bg,'#000000',.28)); g.fillStyle=grd; g.fillRect(x0,yb-bh,x1-x0-1,bh);
      if(x1-x0>60){ g.save(); g.beginPath(); g.rect(x0,yb-bh,x1-x0-1,bh); g.clip(); const fg=lum(bg)>0.45?'#111':'#fff'; g.fillStyle=goal?fg:(bg===this.h.c1?fg:(lum(this.h.c2)>0.2?this.h.c2:'#ffffff')); g.font=`800 ${Math.round(bh*0.66)}px "Big Shoulders Display","Arial Narrow",sans-serif`; g.textAlign='center'; g.textBaseline='middle';
        const txt=goal?'GOAL!':['TOUCHLINE',(this.h.town||'').toUpperCase(),`SECTION ${this.section}`,'GO '+String(this.h.mascot||'TEAM').toUpperCase()][(i+Math.floor(now/4000))%4]; const sl=goal?0:((now/40)%(x1-x0))*0; g.fillText(txt,(x0+x1)/2+sl,yb-bh/2+1); g.restore(); } }
    this.drawDugouts(g);
    // ball-stop netting and boards behind each goal, photographers crouched by the posts
    for(const ex of [-4.4,109.4]) this.drawEndFence(g,ex);
    // corner flags (far side first)
    for(const [x,y] of [[0,0],[105,0]]) this.drawFlag(g,x,y);
    // goals: back halves before players, near halves sorted with them
    this.drawGoal(g,0,-1,'back'); this.drawGoal(g,105,1,'back');
    const items=[...this.players.values()].filter(p=>!(p.off&&!p.ov&&p.y<-3)).map(p=>({y:p.y,p}));
    items.push({y:this.ball.y+0.01,ball:true}); items.push({y:this.ref.y,ref:true}); for(const a of this.ars) items.push({y:a.y,ar:a}); items.push({y:37.66,goal:0}); items.push({y:37.66,goal:105});
    items.sort((a,b)=>a.y-b.y);
    if(this.offMark) this.drawOffMark(g);
    for(const it of items){ if(it.ar){ this.drawFigure(g,it.ar,{shirt:'#141414',shorts:'#141414',num:'#f5c518',socks:'#141414',dark:'#000',light:'#2a2a2a'},true); this.drawARFlag(g,it.ar); } else if(it.ball) this.drawBall(g); else if(it.ref) this.drawFigure(g,this.ref,{shirt:'#141414',shorts:'#141414',num:'#f5c518',socks:'#141414',dark:'#000',light:'#2a2a2a'},true); else if(it.goal!=null) this.drawGoal(g,it.goal,it.goal===0?-1:1,'front'); else this.drawPlayerB(g,it.p); }
    this.drawTurf(g);
    for(const [x,y] of [[0,68],[105,68]]) this.drawFlag(g,x,y);
    if(this.minimap) this.drawMini(g);
};
