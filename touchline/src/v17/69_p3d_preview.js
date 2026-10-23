/* ===================== v18 3-D PREVIEWS (single-figure canvases) =====================
   The appearance editor (figurePreview), the celebration preview and tiles (celebPreview, celebMini) and the kit lab
   (klFigLoop: kit cards and clash panes) all paint through Stage.prototype.drawFigure on a fake stage (no st.cv, a
   proj() that places the feet). When rendererFor('preview') says '3d', that call is answered here instead:
   - ONE shared hidden WebGL renderer for every preview canvas (never a context per canvas), built lazily on the first
     preview draw and disposed once no preview has drawn for 10 s or every preview canvas has left the DOM;
   - the figures module (63_p3d_figures.js) is reused unchanged: v18FigInit on a tiny painter, then v18FigFrame against
     the preview's own fake stage with the one figure pushed to P.extra (the fake has no players/ref/ars/kits/own);
   - a soft grass disc (not on the kit-lab clash panes, which paint their own pitch), the figures module's contact
     shadow, toon key/fill/rim lights; transparent background, so the card's own background shows through;
   - the camera sits at chest height with a 30 deg lens, as far back as the 2-D preview's scale asks (so the 3-D figure
     fills the canvas exactly as the 2-D one did: ~3.7-5.4 m), pitched so the feet land where proj() puts them;
   - each draw renders into the shared canvas at the preview's device-pixel size and is copied into the preview's own
     2-D canvas with drawImage, so the DOM, the loops, their timing and the v17 parking logic are untouched.
   Falls back to the 2-D drawFigure whenever 3-D is off ('auto' on a software renderer, reduced motion, PREFS '2d'),
   when WebGL fails, or after a lost context. Globals prefixed v18Pv / V18PV. */

const V18PV={P:null,fail:false,cvs:new Set(),last:0,timer:0,looks:new Map(),builds:0};
function v18PvOn(){ return !V18PV.fail&&!v18Off&&typeof THREE!=='undefined'&&typeof v18FigInit==='function'&&rendererFor('preview')==='3d'; }

/* a stable look object per appearance: the face atlas is cached per look object, and defaultLook() makes a new one per call */
function v18PvLook(L){ if(!L) return L; let k; try{ k=JSON.stringify(L); }catch(e){ return L; } let o=V18PV.looks.get(k); if(!o){ if(V18PV.looks.size>96) V18PV.looks.clear(); o=Object.assign({},L); V18PV.looks.set(k,o); } return o; }

function v18PvPainter(){ const V=V18PV; if(V.P&&!V.P.dead) return V.P; if(V.fail) return null; const T=THREE;
  const cv=document.createElement('canvas'); cv.width=cv.height=4; let R;
  try{ R=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,premultipliedAlpha:true,stencil:false,powerPreference:'low-power'}); }catch(e){ console.warn('v18 preview: no WebGL, using 2-D',e); V.fail=true; return null; }
  R.setPixelRatio(1); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.NeutralToneMapping; R.toneMappingExposure=1.0; R.setClearColor(0x000000,0); R.shadowMap.enabled=false;
  const P={T,kind:'preview',renderer:R,canvas:cv,scene:new T.Scene(),camera:new T.PerspectiveCamera(30,1,0.1,60),tier:{name:'P',detail:2,shadow:0,aa:true,pr:2},extra:[],H:200,dead:false,_mats:new Map(),cw:4,ch:4};
  P.track=Painter3D.prototype.track; P.toon=Painter3D.prototype.toon;
  P._lost=e=>{ e.preventDefault(); console.warn('v18 preview: WebGL context lost, previews back to 2-D'); V.fail=true; v18PvDispose(); };
  cv.addEventListener('webglcontextlost',P._lost);
  P.gradientMap=P.track(new T.DataTexture(new Uint8Array([70,150,215,255]),4,1,T.RedFormat)); P.gradientMap.minFilter=P.gradientMap.magFilter=T.NearestFilter; P.gradientMap.needsUpdate=true;
  /* soft studio lighting: sky/grass hemisphere, warm key from the front-left, cool fill from the right, a rim from behind */
  P.hemi=new T.HemisphereLight('#dfe9ff','#2f5a36',1.15); P.key=new T.DirectionalLight('#fff2e0',2.3); P.fill=new T.DirectionalLight('#cfe0ff',0.75); P.rim=new T.DirectionalLight('#ffffff',1.1);
  for(const l of [P.key,P.fill,P.rim]){ P.scene.add(l,l.target); } P.scene.add(P.hemi,P.camera);
  /* grass disc: radial alpha falloff with faint mowing stripes */
  const gc=document.createElement('canvas'); gc.width=gc.height=256; const gg=gc.getContext('2d');
  for(let i=0;i<8;i++){ gg.fillStyle=i%2?'#3f9a55':'#46a65c'; gg.fillRect(i*32,0,32,256); }
  gg.globalCompositeOperation='destination-in'; const rg=gg.createRadialGradient(128,128,10,128,128,127); rg.addColorStop(0,'rgba(0,0,0,0.9)'); rg.addColorStop(0.45,'rgba(0,0,0,0.6)'); rg.addColorStop(0.85,'rgba(0,0,0,0.12)'); rg.addColorStop(1,'rgba(0,0,0,0)'); gg.fillStyle=rg; gg.fillRect(0,0,256,256);
  const gt=P.track(new T.CanvasTexture(gc)); gt.colorSpace=T.SRGBColorSpace;
  P.disc=new T.Mesh(P.track(new T.CircleGeometry(0.85,48)),P.track(new T.MeshBasicMaterial({map:gt,transparent:true,depthWrite:false})));
  P.disc.rotation.x=-Math.PI/2; P.disc.renderOrder=-2; P.scene.add(P.disc);
  try{ v18FigInit(P); }catch(e){ console.warn('v18 preview: figures init failed, using 2-D',e); V.fail=true; P.dead=false; V.P=P; v18PvDispose(); return null; }
  V.P=P; V.builds++; v18PvSweepLater(); return P; }

function v18PvDispose(){ const V=V18PV, P=V.P; if(!P||P.dead) return; P.dead=true; V.P=null; V.cvs.clear();
  try{ const fm=P3D_MODULES.find(m=>m.name==='figures'); if(fm&&fm.dispose) fm.dispose(P); }catch(e){}
  P.scene.traverse(o=>{ if(o.geometry&&o.geometry.dispose) o.geometry.dispose(); const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[]; for(const m of ms){ if(m.map) m.map.dispose(); if(m.dispose) m.dispose(); } });
  for(const o of P._track||[]) try{ o.dispose&&o.dispose(); }catch(e){}
  try{ P.renderer.dispose(); P.renderer.forceContextLoss(); }catch(e){}
  P.canvas.removeEventListener('webglcontextlost',P._lost); }

/* release the shared context once no preview canvas is left in the page, or none has drawn for 10 s (parked loops) */
function v18PvSweepLater(){ if(V18PV.timer) return; V18PV.timer=setTimeout(v18PvSweep,2000); }
function v18PvSweep(){ const V=V18PV; V.timer=0; if(!V.P) return; for(const cv of [...V.cvs]) if(!cv.isConnected) V.cvs.delete(cv);
  if(!V.cvs.size||performance.now()-V.last>10000){ v18PvDispose(); return; } v18PvSweepLater(); }

/* the figures module's contact shadow is sized for the broadcast; at preview range it reads as a dark bar, so tighten it */
function v18PvShadow(P){ const pt=P._fig&&P._fig.p&&P._fig.p.blob; if(!pt||!pt.n) return; const m=pt.im;
  for(let i=0;i<pt.n;i++){ const k=i*16; for(const j of [0,1,2]) m[k+j]*=0.62; for(const j of [8,9,10]) m[k+j]*=0.5; } }

/* render one figure of a fake stage into its 2-D canvas; false = let the 2-D painter draw it */
function v18PvDraw(st,g,p,kit,isRef){ const cv=g&&g.canvas; if(!cv||!cv.isConnected||!cv.width||!cv.height) return false;
  const P=v18PvPainter(); if(!P) return false; const T=P.T, R=P.renderer, V=V18PV;
  const tr=g.getTransform(); const dpr=tr.a||1; const pw=cv.width, ph=cv.height, W=pw/dpr, H=ph/dpr;
  const pr=st.proj(p.x,p.y); const x=pr[0], y=pr[1], k=Math.max(1,pr[2]);
  if(pw>P.cw||ph>P.ch){ P.cw=Math.max(P.cw,pw); P.ch=Math.max(P.ch,ph); R.setSize(P.cw,P.ch,false); }
  R.setViewport(0,0,pw,ph);
  /* camera: same on-screen scale as the 2-D figure (k*1.06 px per body unit, 0.92 m per unit at 70" tall), chest height,
     pitched down so the ground under the figure lands at proj()'s y; the figure is centred and the frame shifted to proj()'s x */
  const cam=P.camera, tf=Math.tan(15*Math.PI/180); cam.fov=30; cam.aspect=pw/ph;
  const hc=1.25, f=H/(2*tf), top=2.02*(p.hgt||70)/70; let d=Math.min(9,Math.max(2.4,H*0.92/(2*tf*k*1.06))), pitch=0;
  /* a perspective head is bigger than the 2-D one: step back until the top of the hair clears the frame by 4% */
  for(let i=0;i<12;i++){ pitch=Math.atan(hc/d)-Math.atan((y-H/2)/f); const yTop=H/2-f*Math.tan(Math.atan((top-hc)/d)+pitch); if(yTop>=H*0.04) break; d*=1.06; }
  cam.position.set(p.x,hc,p.y+d); cam.rotation.set(-pitch,0,0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  P.key.position.set(p.x-2.6,4.2,p.y+3.4); P.key.target.position.set(p.x,0.9,p.y); P.fill.position.set(p.x+3.2,1.8,p.y+2.2); P.fill.target.position.set(p.x,1,p.y); P.rim.position.set(p.x+0.8,3.2,p.y-4); P.rim.target.position.set(p.x,1.1,p.y);
  P.disc.visible=!(cv.dataset&&cv.dataset.klclash!=null); P.disc.position.set(p.x,0,p.y);
  P.H=H; P.extra.length=0; const L0=p.look; if(L0) p.look=v18PvLook(L0);
  P.extra.push({o:p,kit,isRef:!!isRef});
  try{ v18FigFrame(P,st); v18PvShadow(P); R.render(P.scene,cam); }
  catch(e){ console.warn('v18 preview: render failed, using 2-D',e); V.fail=true; v18PvDispose(); if(L0) p.look=L0; return false; }
  finally{ P.extra.length=0; }
  if(L0) p.look=L0;
  g.save(); g.setTransform(1,0,0,1,0,0); g.drawImage(P.canvas,0,P.ch-ph,pw,ph,Math.round((x-W/2)*dpr),0,pw,ph); g.restore();
  V.cvs.add(cv); V.last=performance.now(); v18PvSweepLater(); return true; }

const _v18PvDrawFigure=Stage.prototype.drawFigure;
Stage.prototype.drawFigure=function(g,p,kit,isRef){
  if(!this.cv&&typeof this.proj==='function'&&g&&g.canvas&&p&&v18PvOn()&&v18PvDraw(this,g,p,kit,isRef)) return;
  return _v18PvDrawFigure.apply(this,arguments); };
