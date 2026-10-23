/* ===================== v18 3-D BROADCAST RENDERER: core (ANIMATION_PLAN Phase 3.1) =====================
   The Stage keeps simulating exactly as before; only its broadcast painting changes. When rendererFor(kind) says '3d'
   for a stage (live match, animation lab, TouchlineTV, title-screen demo) a Painter3D is attached on its first draw:
   - a WebGL canvas is inserted under the stage's 2-D canvas; the 2-D canvas stays on top, transparent, as the HUD
     (minimap, weather particles, goal flash, confetti are still drawn there by the existing 2-D code);
   - Stage.drawBroadcast, when a painter is attached, clears the HUD, renders the 3-D scene and draws the minimap.
     drawLerp has already interpolated positions, yaw, gait and the clock, and 55_body has applied the ball's curl,
     so every module sees the in-between moment;
   - modules register in P3D_MODULES (pitch/stadium 10, crowd 20, figures 30, ball/fx 40, camera 90) and build
     their objects in init(P) and update them in frame(P, st). Modules keep their state on P (one painter per stage).
   Axes: stage X (0..105) -> x, stage Y (0 = far touchline / main stand, 68 = near touchline) -> z, height -> y.
   Fallback to the 2-D painter: no WebGL2, a software renderer under 'auto', reduced motion under 'auto', a lost
   context, or a device too slow even at tier C. PREFS.renderer: 'auto' | '3d' | '2d'; PREFS.rtier: 'A' | 'B' | 'C'. */

const P3D_MODULES=[];
const V18_TIERS={
  A:{name:'A',shadow:2048,crowd:6000,aa:true,detail:2,pr:1.5},
  B:{name:'B',shadow:1024,crowd:2600,aa:true,detail:1,pr:1.25},
  C:{name:'C',shadow:0,crowd:900,aa:false,detail:0,pr:1}};
let v18Off=false;
/* the 3-D wide shot frames a little tighter than the 2-D one (perspective makes mid-pitch players smaller than the 2-D painter's) */
const V18_FRAME=0.86;   /* set when 3-D failed this session (lost context, too slow): 'auto' then stays 2-D */

/* WebGL2 availability and whether it is a software rasteriser (SwiftShader / llvmpipe / Microsoft Basic Render) */
const v18GL=(()=>{ let info=null; return ()=>{ if(info) return info; info={ok:false,software:false,name:''};
  try{ const c=document.createElement('canvas'); const g=c.getContext('webgl2'); if(g){ info.ok=true; const d=g.getExtension('WEBGL_debug_renderer_info'); info.name=d?String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)):''; info.software=/swiftshader|llvmpipe|software|basic render/i.test(info.name); const lc=g.getExtension('WEBGL_lose_context'); if(lc) lc.loseContext(); } }catch(e){}
  return info; }; })();
/* a sensible default tier before any measurement: phones and integrated GPUs start at B, others at A */
function v18DefaultTier(){ const g=v18GL(); const coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches; const n=g.name.toLowerCase();
  if(coarse) return /apple gpu|adreno \(tm\) [67]|mali-g7|immortalis/.test(n)?'B':'C';
  if(/nvidia|geforce|radeon|rtx|apple m|apple gpu|iris xe|arc/.test(n)) return 'A'; return 'B'; }
function v18Tier(){ const t=PREFS.rtier; return V18_TIERS[t]||V18_TIERS[v18DefaultTier()]; }

const _v18RendererFor=rendererFor;
rendererFor=function(kind){ const pref=PREFS.renderer||'auto'; if(pref==='2d') return '2d';
  if(!['live','lab','tv','menu','photo'].includes(kind)) return '2d'; if(typeof THREE==='undefined') return '2d';
  const g=v18GL(); if(!g.ok) return '2d'; if(pref==='3d') return '3d';
  if(g.software||v18Off||reducedMotion()) return '2d'; if(kind==='menu'&&v18Tier().name==='C') return '2d'; return '3d'; };
if(!V17_RENDERER_OPTIONS.some(o=>o[0]==='3d')) V17_RENDERER_OPTIONS.splice(1,0,['3d','3D broadcast']);
DEFAULT_PREFS.rtier=null; if(!('rtier' in PREFS)) PREFS.rtier=null;

/* which kind of stage this is (decided on its first draw, when its canvas is in the page) */
function v18KindOf(st){ if(st.demo) return 'menu'; const cv=st.cv; if(!cv||!cv.closest) return 'other';
  if(cv.id==='lv-canvas') return 'live'; if(cv.closest('#anim-lab')) return 'lab';
  /* TouchlineTV (teams id 'tv'), match-report highlights (App.hl) and Season Wrapped clips (App.wrSt) */
  if((st.T&&st.T.id==='tv')||App.hl===st||App.wrSt===st) return 'tv';
  try{ if(getComputedStyle(cv).visibility==='hidden') return 'photo'; }catch(e){} return 'other'; }

class Painter3D {
  constructor(st,kind){ const T=THREE; this.T=T; this.st=st; this.kind=kind; this.tier=v18Tier(); this.dead=false;
    const host=st.cv.parentElement; try{ if(getComputedStyle(host).position==='static') host.style.position='relative'; }catch(e){}
    const cv=document.createElement('canvas'); cv.className='v18-gl'; cv.setAttribute('aria-hidden','true'); host.insertBefore(cv,st.cv); st.cv.classList.add('v18-hud'); this.canvas=cv;
    this._lost=e=>{ e.preventDefault(); console.warn('v18: WebGL context lost, back to 2-D'); v18Off=true; this.st._v18off=true; this.dispose(); if(this.st.requestDraw) this.st.requestDraw(); };
    cv.addEventListener('webglcontextlost',this._lost);
    let R; try{ R=this.renderer=new T.WebGLRenderer({canvas:cv,antialias:this.tier.aa,powerPreference:'high-performance',alpha:false,stencil:false}); }
    catch(e){ cv.removeEventListener('webglcontextlost',this._lost); cv.remove(); st.cv.classList.remove('v18-hud'); throw e; }
    R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.NeutralToneMapping; R.toneMappingExposure=1.0;
    R.shadowMap.enabled=this.tier.shadow>0; R.shadowMap.type=T.PCFShadowMap;
    this.scene=new T.Scene(); this.camera=new T.PerspectiveCamera(30,1,0.3,1200); this.scene.add(this.camera);
    this.hemi=new T.HemisphereLight('#cfe0ff','#24452b',1.0); this.scene.add(this.hemi);
    this.sun=new T.DirectionalLight('#fff3df',2.4); this.sun.target.position.set(52.5,0,34); this.scene.add(this.sun,this.sun.target);
    if(this.tier.shadow>0){ const s=this.sun.shadow; this.sun.castShadow=true; s.mapSize.set(this.tier.shadow,this.tier.shadow); Object.assign(s.camera,{left:-78,right:78,top:56,bottom:-56,near:1,far:400}); s.bias=-0.0004; s.normalBias=0.03; s.camera.updateProjectionMatrix(); }
    this.gradientMap=this.track(new T.DataTexture(new Uint8Array([70,150,215,255]),4,1,T.RedFormat)); this.gradientMap.minFilter=this.gradientMap.magFilter=T.NearestFilter; this.gradientMap.needsUpdate=true;
    this._mats=new Map(); this.extra=[]; this.time=st.now; this.dt=0; this._t=0; this._v=new T.Vector3();
    /* a plain grass ground so the scene is never empty, even before the pitch module draws */
    this.ground=new T.Mesh(this.track(new T.PlaneGeometry(600,600)),this.track(new T.MeshLambertMaterial({color:'#1d5a33'}))); this.ground.rotation.x=-Math.PI/2; this.ground.position.set(52.5,-0.02,34); this.ground.receiveShadow=true; this.scene.add(this.ground);
    this.setWeather(); this.resize();
    this.mods=P3D_MODULES.slice().sort((a,b)=>(a.order||50)-(b.order||50));
    for(const m of this.mods){ try{ if(m.init) m.init(this); }catch(e){ console.warn('v18 init',m.name,e); (this._deadMods=this._deadMods||new Set()).add(m); } }
    this.perf={ema:null,n:0,slow:0};
  }
  /* ---------- helpers for modules ---------- */
  v3(X,Y,Z){ return new this.T.Vector3(X,Z||0,Y); }
  toW(X,Y,Z,out){ return out.set(X,Z||0,Y); }
  track(o){ (this._track=this._track||[]).push(o); return o; }
  toon(color,opts){ const k=color+(opts?JSON.stringify(opts):''); let m=this._mats.get(k); if(!m){ m=this.track(new this.T.MeshToonMaterial(Object.assign({color,gradientMap:this.gradientMap},opts||{}))); this._mats.set(k,m); } return m; }
  get night(){ const wx=this.st.wx; return !wx||!!wx.night; }
  get wxKind(){ const wx=this.st.wx; return wx?(wx.night?'night':(wx.k||'clear')):'night'; }
  get W(){ return this.st.W; } get H(){ return this.st.H; }
  /* ---------- lighting per weather / time of day ---------- */
  setWeather(){ const T=this.T, k=this.wxKind; this._wxKey=k+'|'+(this.st.wx&&this.st.wx.k);
    const L={ /* sun colour, intensity, position; hemisphere sky, ground, intensity; background; fog */
      clear:  ['#fff3df',2.5,[-34,72,118],'#cfe0ff','#2c5532',1.05,'#7fa9d6',null],
      golden: ['#ffbe78',2.3,[-70,26,92],'#ffd6b0','#3a4a2a',0.85,'#e7a46b',null],
      cloud:  ['#e8eef5',1.5,[-20,80,100],'#d5dde6','#3a4f3e',1.35,'#9aa8b6',null],
      rain:   ['#dfe6ee',1.2,[-20,80,100],'#b9c4cf','#2f4234',1.3,'#6f7c88',['#6f7c88',110,420]],
      snow:   ['#eef3fa',1.4,[-20,80,100],'#e6eef7','#c9d3dc',1.4,'#b9c6d3',['#c3cfdb',120,460]],
      fog:    ['#e6e9ee',1.1,[-20,80,100],'#cfd5dc','#3b4a40',1.4,'#a3acb5',['#a3acb5',60,260]],
      night:  ['#eef3ff',2.2,[-24,92,96],'#2b3d63','#0f2416',0.55,'#050a14',['#060b16',180,700]] }[k]||null;
    const c=L||[ '#fff3df',2.5,[-34,72,118],'#cfe0ff','#2c5532',1.05,'#7fa9d6',null ];
    this.sun.color.set(c[0]); this.sun.intensity=c[1]; this.sun.position.set(52.5+c[2][0],c[2][1],34+c[2][2]-68);
    this.hemi.color.set(c[3]); this.hemi.groundColor.set(c[4]); this.hemi.intensity=c[5];
    this.scene.background=new T.Color(c[6]); this.scene.fog=c[7]?new T.Fog(c[7][0],c[7][1],c[7][2]):null; }
  /* ---------- broadcast camera from the stage camera (x = centre, w = metres visible at the near touchline) ----------
     The camera sits on a line rising from the near touchline at elevation `elev`, far enough back that the near
     touchline spans w metres, and pitches down so the near touchline sits near the bottom edge. */
  /* Like a real gantry camera it dollies only for wide shots (w 30..64 m); tighter shots (penalties, celebrations, the
     lab, phones) keep the gantry position and narrow the lens, aiming between the frame centre and the play (ball y). */
  camPose(st,opt){ const cam=this.camera, c=st.cam; const w=Math.max(3,c.w*V18_FRAME), elev=(opt&&opt.elev)||0.62, fov0=(opt&&opt.fov)||30;
    const wPos=Math.min(64,Math.max(30,w)), k=w/wPos;
    const vf=fov0*Math.PI/180, hf=2*Math.atan(Math.tan(vf/2)*cam.aspect); const below=vf/2*0.88;
    const dn=(wPos/2)/Math.tan(hf/2)/Math.cos(below);
    const x=c.x, cz=68+dn*Math.cos(elev), cy=dn*Math.sin(elev); const pitch=elev-below;
    cam.position.set(x,cy,cz); cam.up.set(0,1,0);
    const gz=cz-cy/Math.tan(pitch); /* where the wide shot's axis meets the grass */
    if(k<0.999){ const by=st.focus&&st.focus.y!=null?st.focus.y:st.ball.y; const ty=Math.min(64,Math.max(4,by));
      this._fy=this._fy==null?ty:this._fy+(ty-this._fy)*Math.min(1,(this.dt||0.016)*3);
      const fov=2*Math.atan(Math.tan(vf/2)*k)*180/Math.PI; if(Math.abs(cam.fov-fov)>1e-4){ cam.fov=fov; cam.updateProjectionMatrix(); }
      cam.lookAt(x,0.9*(1-k),gz+(this._fy-gz)*Math.min(1,(1-k)*1.6)); }
    else { if(cam.fov!==fov0){ cam.fov=fov0; cam.updateProjectionMatrix(); } this._fy=null; cam.lookAt(x,cy-Math.sin(pitch)*100,cz-Math.cos(pitch)*100); } }
  resize(){ const st=this.st; const dpr=Math.min(this.tier.pr,window.devicePixelRatio||1)*(st.rs||1); this.dpr=dpr;
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(st.W,st.H,false); this.canvas.style.width=st.W+'px'; this.canvas.style.height=st.H+'px';
    this.camera.aspect=st.W/Math.max(1,st.H); this.camera.updateProjectionMatrix();
    for(const m of this.mods||[]) if(m.resize&&!(this._deadMods&&this._deadMods.has(m))) try{ m.resize(this); }catch(e){ console.warn('v18 resize',m.name,e); } }
  render(){ if(this.dead) return; const st=this.st; const t=performance.now(); this.dt=this._t?Math.min(0.1,(t-this._t)/1000):0; this._t=t; this.time=st.now; this.extra.length=0;
    const wk=this.wxKind+'|'+(st.wx&&st.wx.k); if(wk!==this._wxKey) this.setWeather();
    this.camPose(st);
    for(const m of this.mods){ if(!m.frame||(this._deadMods&&this._deadMods.has(m))) continue;
      try{ m.frame(this,st); }catch(e){ console.warn('v18 frame',m.name,e); m._v18err=(m._v18err||0)+1; if(m._v18err>3) (this._deadMods=this._deadMods||new Set()).add(m); } }
    this.renderer.render(this.scene,this.camera);
    this.watch(t); }
  /* ---------- frame-time watchdog (auto only): step down a tier when slow, give up on 3-D if tier C is too slow ---------- */
  watch(t){ if(PREFS.renderer==='3d'||this.st.paused) { this._wl=t; return; } const P=this.perf; if(this._wl){ const fi=Math.min(200,t-this._wl); P.ema=P.ema==null?fi:P.ema*0.95+fi*0.05; P.n++; } this._wl=t;
    if(P.n>120&&P.ema>48){ P.n=0; P.ema=null; const order=['A','B','C']; const i=order.indexOf(this.tier.name);
      if(i<2){ PREFS.rtier=order[i+1]; savePrefs(); this.rebuild(); }
      else if(this.kind!=='lab'){ v18Off=true; this.st._v18off=true; this.dispose(); if(typeof toast==='function') toast('Switched to classic 2D graphics for speed'); } } }
  rebuild(){ const st=this.st; this.dispose(); st._p3d=undefined; }
  dispose(){ if(this.dead) return; this.dead=true;
    for(const m of this.mods||[]) if(m.dispose) try{ m.dispose(this); }catch(e){}
    this.scene.traverse(o=>{ if(o.geometry&&o.geometry.dispose) o.geometry.dispose(); const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[]; for(const m of ms){ if(m.map) m.map.dispose(); if(m.dispose) m.dispose(); } });
    for(const o of this._track||[]) try{ o.dispose&&o.dispose(); }catch(e){}
    try{ this.renderer.dispose(); this.renderer.forceContextLoss(); }catch(e){}
    this.canvas.removeEventListener('webglcontextlost',this._lost); this.canvas.remove(); if(this.st.cv) this.st.cv.classList.remove('v18-hud');
    if(this.st._p3d===this) this.st._p3d=null; }
}

/* ---------- Stage hooks ---------- */
function v18Attach(st){ st._p3d=null; if(st._v18off) return null; const kind=v18KindOf(st); if(rendererFor(kind)!=='3d') return null;
  try{ st._p3d=new Painter3D(st,kind); }catch(e){ console.warn('v18: 3-D unavailable, using 2-D',e); st._p3d=null; v18Off=true; } return st._p3d; }
const _v18DrawBroadcast=Stage.prototype.drawBroadcast;
Stage.prototype.drawBroadcast=function(g){ if(this._p3d===undefined) v18Attach(this); const P=this._p3d;
  if(!P||P.dead) return _v18DrawBroadcast.apply(this,arguments);
  P.canvas.style.visibility='visible'; g.clearRect(-40,-40,this.W+80,this.H+80);
  P.render(); if(this.minimap) this.drawMini(g); };
const _v18DrawTac=Stage.prototype.drawTac;
Stage.prototype.drawTac=function(g){ const P=this._p3d; if(P&&!P.dead) P.canvas.style.visibility='hidden'; return _v18DrawTac.apply(this,arguments); };
const _v18Resize=Stage.prototype.resize;
Stage.prototype.resize=function(){ const r=_v18Resize.apply(this,arguments); const P=this._p3d; if(P&&!P.dead) P.resize(); return r; };
const _v18Destroy=Stage.prototype.destroy;
Stage.prototype.destroy=function(){ const P=this._p3d; if(P&&!P.dead) P.dispose(); return _v18Destroy.apply(this,arguments); };
/* switching the preference takes effect for the next stage; the live stage switches at once */
const _v18CHrenderer=CH.renderer;
CH.renderer=el=>{ _v18CHrenderer(el); v18Off=false; const L=App.live; const st=L&&L.stage; if(st&&st.alive){ if(st._p3d) st._p3d.dispose(); st._p3d=undefined; st._v18off=false; if(st.requestDraw) st.requestDraw(); } };
