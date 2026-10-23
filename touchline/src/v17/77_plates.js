/* ===================== v18.5 Player plates (77) =====================
   Presentation only: reads the Stage after it has drawn and never writes a simulation field (all state is on st._pl).
   Up to two broadcast tags on the HUD canvas: one above the ball carrier (number block in the shirt colour, short name on
   dark glass, team-colour underline, ball glyph, pointer to the head) and a smaller one above the opponent engaging him.
   - Hook: Stage.prototype.draw is wrapped, so the tags are painted after the broadcast (2-D or 3-D), the minimap, the
     weather and the goal flash, in the same task as drawLerp (they never lag the figures). Replay frames (68's
     apply-draw-restore, st._rp.on) draw nothing and update nothing.
   - Anchors: 3-D projects the head top through the painter's camera after P.render() (the figures module's head centre is
     captured by a wrapper round v18FigDraw, else a standing-height estimate); 2-D uses st.proj at the 2-D figure's
     head-top height; Tactical puts compact tags beside the dots.
   - Selection (v185PlSelect): the carrier is st.own once it has been stable for 250 ms of real time; a pass receiver is
     shown "incoming" at 60 % from half the flight; the shooter's tag holds 700 ms after the strike, a header 400 ms, a
     loose ball 400 ms. The defender (v185PlPickDef) is scored by distance, chasing (p.chase, set by the v18.3 tackles)
     and goal-side, with hysteresis (keep within 11 m; a challenger must beat him by 1.5 m for 400 ms, except a committed
     chase, which wins at once). Set pieces, throw-ins and keeper holds show the taker only; penalties and shootouts
     pair the taker with the keeper.
   - Hidden: PREFS.plates off (N or Settings), demo/menu/photo/preview stages, skipping, full time, the walkout, replays,
     from the goal (inNet or any celebration) to the restart, and at half time (no carrier).
   - Layout (v185PlFit): above the head with a pointer, clamped to the canvas, never over each other, the minimap, the
     caption or TouchlineTV's overlays (in Tactical, nor over the tagged dots and the ball); a carrier off screen is pinned to the edge with a chevron; a tag that cannot be placed is hidden.
   - Accessibility: a visually hidden status line in the live stage names the carrier and the presser (aria-live off). */
DEFAULT_PREFS.plates=true; if(!('plates' in PREFS)) PREFS.plates=true;

const V185PL={stable:250,fast8:600,inc:0.5,shotHold:700,headHold:400,looseHold:400,defGrace:500,enter:8,enterChase:10,keep:11,beat:1.5,beatT:400,
  fin:180,fout:260,frm:120,gap:6,ptr:5,pad:6,off:40,om:14,font:'"Big Shoulders Display","Arial Narrow",sans-serif',gen:0,err:0};
const V185PL_KINDS={live:1,lab:1,tv:1};
try{ if(document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',()=>{ V185PL.gen++; }); }catch(e){}

/* ---------- colour helpers (WCAG relative luminance and contrast) ---------- */
function v185PlLum(hex){ const m=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex||'').trim()); if(!m) return 0.5; let h=m[1]; if(h.length===3) h=h.replace(/./g,'$&$&');
  const c=[0,2,4].map(i=>{ const v=parseInt(h.slice(i,i+2),16)/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function v185PlCon(a,b){ const x=v185PlLum(a), y=v185PlLum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
/* the number colour on the shirt: the kit's own if it reads (>= 4.5), else white or near-black, whichever reads better */
function v185PlNumCol(kit){ const sh=kit&&kit.shirt||'#888888', n=kit&&kit.num||'#ffffff'; if(v185PlCon(n,sh)>=4.5) return n; return v185PlCon('#ffffff',sh)>=v185PlCon('#111111',sh)?'#ffffff':'#111111'; }
/* the underline: the shirt colour unless it vanishes into the dark glass, then the kit's trim / number colour */
function v185PlLine(kit){ const g='#0c1014'; for(const c of [kit&&kit.shirt,kit&&kit.trim,kit&&kit.num,'#d8dde3']) if(c&&v185PlCon(c,g)>=2.2) return c; return '#d8dde3'; }
const V185PL_COLS=new WeakMap();
function v185PlCols(kit){ const ok=kit&&typeof kit==='object'; let c=ok?V185PL_COLS.get(kit):null; if(!c){ c={shirt:(kit&&kit.shirt)||'#888888',num:v185PlNumCol(kit),line:v185PlLine(kit),dark:v185PlLum((kit&&kit.shirt)||'#888888')<0.03}; if(ok) V185PL_COLS.set(kit,c); } return c; }

/* ---------- names (cached per stage; rebuilt by setSides) ---------- */
function v185PlNames(st){ const N=new Map(); const seen=[new Map(),new Map()]; const rows=[];
  for(const p of st.players.values()){ let P=null; try{ P=(typeof Px==='function'&&typeof App!=='undefined'&&App.C)?Px(p.pid):null; }catch(e){ P=null; }
    const ln=P&&P.ln?String(P.ln).trim():'', fn=P&&P.fn?String(P.fn).trim():''; rows.push([p,ln,fn]); if(ln){ const k=ln.toLowerCase(), m=seen[p.side&1]; m.set(k,(m.get(k)||0)+1); } }
  for(const [p,ln,fn] of rows){ const dup=ln&&seen[p.side&1].get(ln.toLowerCase())>1; const short=ln?((dup&&fn?fn[0]+'. ':'')+ln).toUpperCase():'';
    N.set(p.pid,{num:p.num==null?'':String(p.num),short,full:(fn+' '+ln).trim(),g:-1,w:null}); }
  st._plN=N; return N; }
function v185PlName(st,p){ const N=st._plN||v185PlNames(st); let n=N.get(p.pid); if(!n){ n={num:p.num==null?'':String(p.num),short:'',full:'',g:-1,w:null}; N.set(p.pid,n); } return n; }

/* ---------- the plate graphic (shared: Feature 1 may reuse it for a scorer tag) ---------- */
/* metrics for one tag at font size fs: {h, wNum, wName, wGly, w, name (possibly truncated)}; cached on the name record */
function v185PlMeasure(g,info,fs,glyph,compact,maxW){ const key=fs+(compact?'c':'')+glyph+'|'+Math.round(maxW/8); if(info.g!==V185PL.gen){ info.g=V185PL.gen; info.w=null; }
  const W=info.w||(info.w=new Map()); let m=W.get(key); if(m) return m;
  const h=Math.round(fs*1.62), pad=Math.round(fs*0.55); g.save(); if('letterSpacing' in g) g.letterSpacing='0px';
  g.font=`800 ${Math.round(fs*1.08)}px ${V185PL.font}`; const tn=info.num?g.measureText(info.num).width:0; const wNum=info.num?Math.max(Math.round(h*1.0),Math.ceil(tn+fs*0.9)):0;
  let wGly=0; if(glyph==='ball') wGly=Math.round(h*0.42)+Math.round(fs*0.45); else if(glyph==='gk'){ g.font=`800 ${Math.round(fs*0.66)}px ${V185PL.font}`; wGly=Math.ceil(g.measureText('GK').width+fs*0.62)+Math.round(fs*0.45); }
  let name=info.short||''; if(compact&&name.length>7) name=name.slice(0,6)+'…';
  g.font=`800 ${fs}px ${V185PL.font}`; if('letterSpacing' in g) g.letterSpacing=(fs*0.06).toFixed(2)+'px';
  let tw=name?g.measureText(name).width:0; const room=maxW-wNum-wGly-pad*2;
  if(name&&tw>room){ while(name.length>2&&tw>room){ name=name.slice(0,-2)+'…'; tw=g.measureText(name).width; } }
  g.restore();
  const wName=name?Math.ceil(tw)+pad*2+(wGly?wGly-Math.round(fs*0.45)+Math.round(fs*0.2):0):(wGly?wGly+pad:0);
  m={h,wNum,wName,wGly,w:wNum+wName,name,fs,pad}; W.set(key,m); return m; }
function v185PlRR(g,x,y,w,h,r){ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }
/* draw a plate with its top-left at (x, y). info {num, short}, kit (stage kit), o {fs, glyph:'ball'|'gk'|'', compact, alpha,
   ptr: x of the pointer or null, ptrUp: pointer above instead of below, chev: 'l'|'r'|'u'|'d'|'' , m: metrics} */
function v185DrawPlate(g,x,y,info,kit,o){ o=o||{}; const fs=o.fs||13, glyph=o.glyph||''; const m=o.m||v185PlMeasure(g,info,fs,glyph,!!o.compact,o.maxW||400);
  const C=v185PlCols(kit), h=m.h, w=m.w, glass='rgba(8,12,16,.84)', r=Math.min(3,h*0.16); x=Math.round(x); y=Math.round(y);
  g.save(); g.globalAlpha=Math.max(0,Math.min(1,o.alpha==null?1:o.alpha));
  v185PlDeco(g,x,y,w,h,o.ptr,o.ptrUp,'');
  /* body: number block + glass, one rounded outline (1 px dark border instead of a blur) */
  v185PlRR(g,x,y,w,h,r); g.fillStyle=glass; g.fill(); g.save(); g.clip();
  if(m.wNum){ g.fillStyle=C.shirt; g.fillRect(x,y,m.wNum,h); if(C.dark){ g.fillStyle='rgba(255,255,255,.14)'; g.fillRect(x+m.wNum-1,y,1,h); } }
  const lw=fs>=12?3:2; if(m.wName){ g.fillStyle=C.line; g.fillRect(x+m.wNum,y+h-lw,m.wName,lw); }
  g.restore(); g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=1; v185PlRR(g,x-0.5,y-0.5,w+1,h+1,r+0.5); g.stroke();
  g.textBaseline='middle'; const cy=y+(h-(m.wName?lw:0))/2+0.5;
  if(m.wNum){ if('letterSpacing' in g) g.letterSpacing='0px'; g.font=`800 ${Math.round(fs*1.08)}px ${V185PL.font}`; g.textAlign='center'; g.fillStyle=C.num; g.fillText(info.num,x+m.wNum/2,cy); }
  let cx=x+m.wNum+m.pad;
  if(m.name){ g.font=`800 ${fs}px ${V185PL.font}`; if('letterSpacing' in g) g.letterSpacing=(fs*0.06).toFixed(2)+'px'; g.textAlign='left'; g.fillStyle='#ffffff'; g.fillText(m.name,cx,cy); if('letterSpacing' in g) g.letterSpacing='0px'; cx=x+w-m.pad-(m.wGly?m.wGly-Math.round(fs*0.45):0); }
  else if(m.wGly) cx=x+m.wNum+Math.round(m.pad*0.5);
  if(glyph==='ball'){ const br=Math.round(h*0.21), bx=cx+br, by=cy; g.fillStyle='#ffffff'; g.beginPath(); g.arc(bx,by,br,0,7); g.fill(); g.fillStyle='#14181c'; g.beginPath();
    for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5, rr=br*0.42; if(i) g.lineTo(bx+Math.cos(a)*rr,by+Math.sin(a)*rr); else g.moveTo(bx+Math.cos(a)*rr,by+Math.sin(a)*rr); } g.closePath(); g.fill();
    g.strokeStyle='rgba(20,24,28,.55)'; g.lineWidth=0.8; g.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; g.moveTo(bx+Math.cos(a)*br*0.42,by+Math.sin(a)*br*0.42); g.lineTo(bx+Math.cos(a)*br*0.95,by+Math.sin(a)*br*0.95); } g.stroke(); }
  else if(glyph==='gk'){ const ch=Math.round(h*0.6), cw=m.wGly-Math.round(fs*0.45); v185PlRR(g,cx,Math.round(cy-ch/2),cw,ch,2); g.fillStyle='rgba(255,255,255,.2)'; g.fill(); g.font=`800 ${Math.round(fs*0.66)}px ${V185PL.font}`; g.textAlign='center'; g.fillStyle='#ffffff'; g.fillText('GK',cx+cw/2,cy+0.5); }
  v185PlDeco(g,x,y,w,h,null,false,o.chev);
  g.restore(); return m; }
/* the pointer (a notch in the glass colour toward the head) and the chevron toward a carrier who is off screen */
function v185PlDeco(g,x,y,w,h,ptr,ptrUp,chev){
  if(ptr!=null){ const px=Math.round(ptr), s=V185PL.ptr; g.fillStyle='rgba(8,12,16,.84)'; g.beginPath(); if(ptrUp){ g.moveTo(px-s,y); g.lineTo(px,y-s); g.lineTo(px+s,y); } else { g.moveTo(px-s,y+h); g.lineTo(px,y+h+s); g.lineTo(px+s,y+h); } g.closePath(); g.fill(); }
  if(chev){ const s=6; g.fillStyle='rgba(255,255,255,.92)'; g.beginPath();
    if(chev==='l'){ g.moveTo(x-3,y+h/2-s); g.lineTo(x-3-s,y+h/2); g.lineTo(x-3,y+h/2+s); } else if(chev==='r'){ g.moveTo(x+w+3,y+h/2-s); g.lineTo(x+w+3+s,y+h/2); g.lineTo(x+w+3,y+h/2+s); }
    else if(chev==='u'){ g.moveTo(x+w/2-s,y-3); g.lineTo(x+w/2,y-3-s); g.lineTo(x+w/2+s,y-3); } else { g.moveTo(x+w/2-s,y+h+3); g.lineTo(x+w/2,y+h+3+s); g.lineTo(x+w/2+s,y+h+3); }
    g.closePath(); g.fill(); } }

/* ---------- which stages, and when ---------- */
function v185PlKind(st){ if(st.demo) return 'menu'; const cv=st.cv; if(!cv||!cv.closest) return 'other'; if(cv.id==='lv-canvas') return 'live';
  if(cv.closest('#anim-lab')) return 'lab'; if((st.T&&st.T.id==='tv')||cv.closest('.tv-screen')||(typeof App!=='undefined'&&App.hl===st)) return 'tv'; return 'other'; }
function v185PlLiveOf(st){ const L=typeof App!=='undefined'&&App.live; return L&&L.stage===st?L:null; }
/* '' when plates may show; 'hard' resets and draws nothing; 'soft' fades whatever is up */
function v185PlGate(st,S){ if(S.kind==null||(S.kind==='other'&&S.clk-S.kindT>1000)){ S.kind=v185PlKind(st); S.kindT=S.clk; }
  if(!V185PL_KINDS[S.kind]) return 'hard';
  const L=v185PlLiveOf(st); if(st.skip||st.ft||(L&&(L.skipping||L.done||(L.M&&L.M.phase==='ht')))) return 'hard';
  if(typeof v18WalkFocus!=='undefined'&&v18WalkFocus&&v18WalkFocus.st===st&&(!v18WalkFocus.crane||performance.now()-v18WalkFocus.crane<2600)) return 'hard';
  if(PREFS.plates===false) return 'soft';
  if(st.inNet) return 'soft'; for(const p of st.players.values()) if(p.celeb) return 'soft';
  return ''; }

/* ---------- the defender: distance, chasing, goal-side, with hysteresis ---------- */
/* D = {cur, chal, chalT, why}; returns the engaging opponent or null. Pure apart from D. */
function v185PlPickDef(st,c,D,now){ let closest=null, cd=1e9; D.why='';
  for(const q of st.players.values()){ if(q.side===c.side||q.off||q.celeb) continue; const d=Math.hypot(q.x-c.x,q.y-c.y); if(d<cd){ cd=d; closest=q; } }
  const gxOf=q=>q.side===0?0:105;
  const elig=q=>{ if(!q||q.side===c.side||q.off||q.celeb) return false; if(q.gk){ const gx=gxOf(q.side); const inBox=Math.abs(c.x-gx)<16.5&&c.y>13.85&&c.y<54.15; if(!inBox&&!(q===closest&&cd<12)) return false; } return true; };
  const gside=q=>{ const gx=gxOf(q.side); return (gx-c.x)*(q.x-c.x)>0&&Math.abs(q.x-c.x)<=Math.abs(gx-c.x)+1; };
  const score=(q,d)=>d-(q.chase===c?3:0)-(gside(q)?1.2:0);
  let best=null, bs=1e9;
  for(const q of st.players.values()){ if(!elig(q)) continue; const d=Math.hypot(q.x-c.x,q.y-c.y); if(!(d<V185PL.enter||(q.chase===c&&d<V185PL.enterChase))) continue; const s=score(q,d); if(s<bs){ bs=s; best=q; } }
  let cur=D.cur; let dc=0; if(cur){ dc=Math.hypot(cur.x-c.x,cur.y-c.y); if(!elig(cur)||!(dc<V185PL.keep)) cur=null; }
  if(!cur){ D.cur=best; D.chal=null; D.why=best?'new':''; return best; }
  if(best&&best!==cur){
    if(best.chase===c&&cur.chase!==c){ D.cur=best; D.chal=null; D.why='chase'; return best; }
    if(bs+V185PL.beat<score(cur,dc)){ if(D.chal!==best){ D.chal=best; D.chalT=now; } else if(now-D.chalT>=V185PL.beatT){ D.cur=best; D.chal=null; D.why='beat'; return best; } }
    else D.chal=null; }
  else D.chal=null;
  return cur; }

/* ---------- state ---------- */
function v185PlNew(){ return {clk:0,last:performance.now(),kind:null,kindT:0,fid:0,slots:new Map(),oc:null,ocT:0,lastOwn:null,car:null,fo:null,foT:0,foFrom:null,foShot:false,foHead:false,incP:null,
  D:{cur:null,chal:null,chalT:0,why:''},dc:null,dcT:0,def:null,defT:0,defNull:0,carFor:null,want:[],blocks:[],capT:-1e9,cap:null,sr:null,srT:-1e9,srTxt:'',srPend:null,
  perf:{n:0,sum:0,max:0,ring:new Float32Array(600),i:0},log:{car:[],def:[]},why:''}; }
function v185PlReset(S){ S.slots.clear(); if(S.spr) S.spr.clear(); S.oc=null; S.lastOwn=null; S.car=null; S.fo=null; S.foFrom=null; S.incP=null; S.D.cur=null; S.D.chal=null; S.dc=null; S.def=null; S.carFor=null; }
function v185PlLog(S,k,p){ const L=S.log[k]; const id=p?p.pid:null; if(!L.length||L[L.length-1].pid!==id){ L.push({pid:id,t:S.clk}); if(L.length>400) L.splice(0,100); } }

/* who gets a tag this frame: fills S.want with [pid, role, alpha, player] */
function v185PlSelect(st,S){ const now=S.clk, o=st.own&&st.players.get(st.own.pid)===st.own?st.own:null, f=st.fl; const want=S.want; want.length=0;
  if(o!==S.oc){ S.oc=o; S.ocT=now; } if(o) S.lastOwn=o;
  if(f!==S.fo){ const k=S.car&&S.car===S.lastOwn?S.car:null; S.fo=f; S.foT=now; S.foFrom=f?k:null; S.foShot=!!(f&&f.kind==='shot'); S.foHead=!!(k&&k.kickK==='head'); if(f&&!f.phys&&S.def) S.defDrop=true; }
  let car=null, inc=null, def=null, hold=false;
  const pen=st.setPiece==='pen'||st.so;
  if(o&&!f){ const fast=o===S.incP||o===S.car||st.headBall===o; if(fast||now-S.ocT>=V185PL.stable) car=o; if(car) S.incP=null; }
  else if(f&&!f.phys){ const k=S.foFrom; if(k){ if(S.foShot&&now-S.foT<V185PL.shotHold) car=k; else if(S.foHead&&now-S.foT<V185PL.headHold) car=k; }
    if(f.home&&!f.hands&&f.dur>0&&(st.now-f.t0)/f.dur>=V185PL.inc&&!f.home.off){ inc=f.home; S.incP=f.home; } }
  else if(f&&f.phys){ const k=S.foFrom; if(k&&now-S.foT<V185PL.looseHold){ car=k; hold=true; } S.incP=null; }
  else if(pen&&!o&&!f){ /* a shootout kick placed without a carrier: the nearest outfield player to the ball takes it */ let bd=36; for(const q of st.players.values()){ if(q.gk||q.off) continue; const d=(q.x-st.ball.x)**2+(q.y-st.ball.y)**2; if(d<bd){ bd=d; car=q; } } }
  /* turnover or a new carrier: the defender is chosen fresh */
  if(car&&car!==S.carFor){ S.carFor=car; S.D.cur=null; S.D.chal=null; S.dc=null; S.defDrop=false; }
  const LL=v185PlLiveOf(st), spd=LL&&LL.speed||1;
  if(car&&!f&&(car===o||pen)){
    if(pen) def=st.gkOf(1-car.side);
    else if(!(st.hands||st.placed)){ const pick=v185PlPickDef(st,car,S.D,now);
      if(pick!==S.dc){ S.dc=pick; S.dcT=S.D.why==='beat'||S.D.why==='chase'||(pick&&pick.chase===car)?now-V185PL.fast8:now; }
      if(pick){ S.defNull=0; if(pick===S.def||now-S.dcT>=(spd>=8?V185PL.fast8:V185PL.stable)) def=pick; else if(S.def&&S.def.side!==car.side&&!S.def.off) def=S.def; }
      else { if(!S.defNull) S.defNull=now||1; if(S.def&&now-S.defNull<V185PL.defGrace&&S.def.side!==car.side) def=S.def; } } }
  else if(hold&&S.def&&!S.defDrop) def=S.def;
  if(spd>=8&&def&&def!==st.gkOf(1-(car?car.side:0))&&now-S.dcT<V185PL.fast8) def=null;
  if(pen&&car&&f) def=null; /* the keeper's tag fades at the strike */
  S.car=car; S.def=def;
  if(car) want.push([car.pid,'car',1,car]); if(inc&&inc!==car) want.push([inc.pid,'inc',0.6,inc]); if(def&&def!==car&&def!==inc) want.push([def.pid,'def',0.9,def]);
  v185PlLog(S,'car',car); v185PlLog(S,'def',def); }

/* ---------- anchors ---------- */
const V185PL_P={v:null};
function v185Pl3D(st){ const P=st._p3d; return !!(P&&!P.dead&&P.camera&&st.mode!=='tactical'&&typeof THREE!=='undefined'); }
/* the head top (and the feet) of a player on the HUD, in CSS px; returns false when behind the camera */
function v185PlAnchor(st,S,sl,p,out){ const hg=(p.hgt||70)/70;
  if(st.mode==='tactical'){ const T=st.tacGeom(); out.x=T.ox+p.x*T.s; out.y=T.oy+p.y*T.s; out.fy=out.y; out.ph=Math.max(7,T.s*1.25); return true; }
  if(v185Pl3D(st)){ const P=st._p3d, V=V185PL_P.v||(V185PL_P.v=new THREE.Vector3()); const cam=P.camera;
    const e=S.hd&&S.hd.get(p.pid); if(e&&e[3]===S.fid) V.set(e[0],e[1],e[2]); else V.set(p.x,1.87*hg+(st.jumpLift?st.jumpLift(p):0),p.y);
    V.project(cam); if(!(V.z<1)||!isFinite(V.x)||!isFinite(V.y)) return false; out.x=(V.x+1)/2*st.W; out.y=(1-V.y)/2*st.H;
    V.set(p.x,0,p.y).project(cam); out.fy=V.z<1&&isFinite(V.y)?(1-V.y)/2*st.H:out.y+40; out.ph=Math.max(0,out.fy-out.y); return true; }
  const ft=st.proj(p.x,p.y,0); out.fy=ft[1]; if(v185Pl2DHead(st,p,ft,out)){ out.ph=Math.max(0,out.fy-out.y); return true; }
  const lift=st.jumpLift?st.jumpLift(p):0; const a=st.proj(p.x,p.y,2.15*hg+lift); out.x=a[0]; out.y=a[1]; out.ph=Math.max(0,out.fy-out.y); return true; }
/* 2-D: the top of the head as drawFigure painted it this frame, from the pose blendPose stored on the player (read only):
   the same body-frame -> screen mapping (lean about the hips, yaw, depth squash, lift, whole-body rotation about the pivot) */
function v185Pl2DHead(st,p,ft,out){ const Q=p._pose; if(!Q||p._poseT!==st.now||!isFinite(Q.hipU)) return false;
  const x=ft[0], y=ft[1], k=ft[2], s=k*((p.hgt||70)/70)*1.06; const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw, ca=Math.cos(yaw), sa=Math.sin(yaw);
  const DEP=st.depthK!=null?st.depthK:Math.max(0.12,Math.min(0.45,(st.H*0.705/68)/Math.max(1,k)));
  const lean=Q.lean||0, cl=Math.cos(lean), sl=Math.sin(lean), hipU=Q.hipU, tilt=Q.headTilt||0;
  let f=0.02+tilt*0.05, u=1.86-Math.abs(tilt)*0.02; if(u>hipU){ const du=u-hipU; const f2=f*cl+du*sl; u=hipU+du*cl-f*sl; f=f2; }
  const dy=f*sa; let hx=f*ca*s, hy=-u*s+dy*s*DEP; const rot=Q.rot||0;
  if(rot){ const pv=(Q.pivot||0)*s, c=Math.cos(rot), n=Math.sin(rot); hy+=pv; const rx=hx*c-hy*n, ry=hx*n+hy*c; hx=rx; hy=ry-pv; }
  const cx=x+hx, cy=y-(Q.lift||0)*s+hy; if(!isFinite(cx)||!isFinite(cy)) return false; out.x=cx; out.y=cy-0.165*s; return true; }
/* 3-D: the figures module solves every body this frame; keep the head centre of the tagged players */
if(typeof v18FigDraw==='function'){ const _v185FigDraw=v18FigDraw;
  v18FigDraw=function(P,st,p,kit,isRef){ const r=_v185FigDraw.apply(this,arguments);
    if(r&&!isRef&&p&&p.pid!=null&&st&&st._pl){ const S=st._pl, F=P._fig;
      /* every player's, so a tag that starts this frame (its slot is made after the figures) has it too */
      if(F&&F.s){ const W=F.s, HD=S.hd||(S.hd=new Map()); let e=HD.get(p.pid); if(!e) HD.set(p.pid,e=new Float64Array(4)); e[0]=W[42]; e[1]=W[43]+0.2*0.92*(p.hgt||70)/70; e[2]=W[44]; e[3]=S.fid; } }
    return r; }; }

/* ---------- layout ---------- */
const v185PlHit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
/* fit a w x h rect near (x, y): clamp to the canvas inset, then step around anything it hits (at most 3 passes);
   returns true and writes r, or false when it cannot be placed */
let v185PlFitSide=0;
function v185PlFit(r,x,y,w,h,blocks,nb,W,H,sd){ const pad=V185PL.pad; v185PlFitSide=0; const cx=v=>Math.max(pad,Math.min(W-pad-w,v)), cy=v=>Math.max(pad,Math.min(H-pad-h,v));
  if(w>W-pad*2||h>H-pad*2) return false;
  let cands=[[cx(x),cy(y)]]; const x0=x, y0=y;
  for(let pass=0;pass<3;pass++){ const next=[];
    for(const c of cands){ const px=c[0], py=c[1]; r.x=px; r.y=py; r.w=w; r.h=h; let hit=null; for(let i=0;i<nb;i++){ if(v185PlHit(r,blocks[i])){ hit=blocks[i]; break; } } if(!hit){ v185PlFitSide=c.s||0; return true; }
      const U=[px,cy(hit.y-h-3)], D=[px,cy(hit.y+hit.h+3)], L=[cx(hit.x-w-3),py], R=[cx(hit.x+hit.w+3),py]; U.s=D.s=L.s=R.s=c.s||0;
      /* another tag: beside it on the player's side, then above, the other side, and below last (below would sit on the players);
         the side used last time is kept until the player is half a tag width past the other tag's centre */
      if(hit.k==='tag'){ const nat=x0+w/2-(hit.x+hit.w/2); let right=nat>=0; if(sd){ right=sd>0; if(nat*sd<-w*0.5) right=!right; } L.s=-1; R.s=1; U.s=D.s=0; next.push(right?R:L,U,right?L:R,D); }
      else { const A=[U,D,L,R]; A.sort((a,b)=>Math.hypot(a[0]-x0,a[1]-y0)-Math.hypot(b[0]-x0,b[1]-y0)); next.push(...A); } }
    cands=next.slice(0,12); }
  return false; }
/* obstacles on the HUD: the minimap and the live caption (DOM, read at most every 250 ms) */
function v185PlBlocks(st,S){ const B=S.blocks; let n=0; const W=st.W;
  if(st.minimap&&st.mode!=='tactical'){ const w=Math.min(170,W*0.22), h=w*68/105, x0=W-w-10, y0=10; const b=B[n]||(B[n]={}); b.x=x0-3-6; b.y=y0-3-6; b.w=w+6+12; b.h=h+6+12; b.k='mini'; n++; }
  /* DOM overlays on the stage: the live caption, TouchlineTV's REPLAY bug and lower third */
  if(S.clk-S.capT>250||S.clk<S.capT){ S.capT=S.clk; const caps=S.caps||(S.caps=[]); caps.length=0;
    try{ const host=st.cv.parentElement; const els=host?host.querySelectorAll(':scope > .lv-cap .cap, :scope > .tv-bug, :scope > .tv-lower > *'):[]; if(els.length){ const c=st.cv.getBoundingClientRect(), k=c.width>0?st.W/c.width:1;
      for(const el of els){ if(!el.textContent) continue; const a=el.getBoundingClientRect(); if(a.width>0&&a.height>0&&c.width>0&&caps.length<4) caps.push({x:(a.left-c.left)*k-6,y:(a.top-c.top)*k-6,w:a.width*k+12,h:a.height*k+12}); } } }catch(e){ caps.length=0; } }
  if(S.caps) for(const q of S.caps){ const b=B[n]||(B[n]={}); b.x=q.x; b.y=q.y; b.w=q.w; b.h=q.h; b.k='cap'; n++; }
  /* Tactical: the tagged players' dots (the carrier's with its halo) and the ball stay uncovered */
  if(st.mode==='tactical'&&S.slots.size){ const T=st.tacGeom(), r=Math.max(7,T.s*1.25);
    for(const sl of S.slots.values()){ const p=sl.p; if(!p||!isFinite(p.x)) continue; const rr=(p===st.own?r+5:r)+2, b=B[n]||(B[n]={}); b.x=T.ox+p.x*T.s-rr; b.y=T.oy+p.y*T.s-rr; b.w=b.h=rr*2; b.k='dot'; n++; }
    const bl=st.ball; if(bl&&isFinite(bl.x)){ const z=bl.z||0, rr=6+z*0.5, b=B[n]||(B[n]={}); b.x=T.ox+bl.x*T.s-rr; b.y=T.oy+bl.y*T.s-z*2.2-rr; b.w=b.h=rr*2; b.k='ball'; n++; } }
  S.nb=n; return n; }

/* ---------- per frame ---------- */
function v185PlFrame(st){ if(st._rp&&st._rp.on) return; const t0=performance.now();
  const S=st._pl||(st._pl=v185PlNew()); const dtR=Math.max(0,Math.min(100,t0-S.last)); S.last=t0; const dt=st.paused?0:dtR; S.clk+=dt;
  const pv=PREFS.plates!==false; if(S.pv!=null&&S.pv!==pv&&st.paused) S.snap=true; S.pv=pv;
  const why=v185PlGate(st,S); S.why=why;
  if(why==='hard'){ S.snap=false; if(S.slots.size||S.car||S.oc) v185PlReset(S); v185PlSr(st,S,null,null); return; }
  if(why==='soft'){ S.want.length=0; S.car=null; S.def=null; S.oc=null; S.carFor=null; S.D.cur=null; S.incP=null; S.fo=st.fl; } else { v185PlSelect(st,S);
    /* plates switched on while paused: the stability delays are skipped so the tags appear at once */
    if(S.snap) for(let k=0;k<2&&!(S.car&&(S.def||!S.D.cur));k++){ S.ocT=-1e9; S.dcT=-1e9; v185PlSelect(st,S); } }
  /* slots follow the wanted list; fades in real time (frozen while paused, except a user toggle, which snaps) */
  const rm=!!st.rm, fin=rm?V185PL.frm:V185PL.fin, fout=rm?V185PL.frm:V185PL.fout;
  for(const sl of S.slots.values()) sl.tgt=0;
  for(const [pid,role,a,p] of S.want){ let sl=S.slots.get(pid); if(!sl){ sl={pid,p,role,a:0,tgt:0,r:{x:0,y:0,w:0,h:0},ox:0,oy:0,vx:0,vy:0,init:false,on:false,hf:-1,cmp:false,ptr:null,chev:'',an:{x:0,y:0,fy:0,ph:0}}; S.slots.set(pid,sl); } sl.p=p; sl.role=role; sl.tgt=a; }
  for(const [pid,sl] of S.slots){ const p=st.players.get(pid); if(!p||p.off&&sl.tgt===0){ S.slots.delete(pid); continue; } sl.p=p;
    if(S.snap) sl.a=sl.tgt; else if(sl.a<sl.tgt) sl.a=Math.min(sl.tgt,sl.a+dt/fin); else if(sl.a>sl.tgt) sl.a=Math.max(sl.tgt,sl.a-dt/fout);
    if(sl.a<=0&&sl.tgt<=0) S.slots.delete(pid); }
  if(S.slots.size){ v185PlLayout(st,S,dtR); v185PlPaint(st,S); }
  if(v185PlLiveOf(st)){ if(S.snap) S.srT=-1e9; v185PlSr(st,S,S.car,S.def); } S.snap=false;
  const ms=performance.now()-t0; const pf=S.perf; pf.n++; pf.sum+=ms; if(ms>pf.max) pf.max=ms; pf.ring[pf.i++%600]=ms; }

const V185PL_ORDER={car:0,inc:1,def:2};
function v185PlLayout(st,S,dtR){ const W=st.W, H=st.H, g=st.ctx, tac=st.mode==='tactical'; const nb0=v185PlBlocks(st,S); const B=S.blocks; let nb=nb0;
  const list=S.list||(S.list=[]); list.length=0; for(const sl of S.slots.values()) list.push(sl);
  list.sort((a,b)=>(b.tgt>0)-(a.tgt>0)||V185PL_ORDER[a.role]-V185PL_ORDER[b.role]);
  const phone=W<520; let carOff=false;
  for(const sl of list){ sl.on=false; sl.ptr=null; sl.chev=''; const p=sl.p, A=sl.an; if(!v185PlAnchor(st,S,sl,p,A)) continue;
    const off=A.x<-V185PL.off||A.x>W+V185PL.off||A.y<-V185PL.off||A.y>H+V185PL.off;
    if(off&&sl.role!=='car') continue; if(sl.role==='car'&&off) carOff=true; if(carOff&&sl.role!=='car') continue;
    /* size: compact on phones, in Tactical, and for figures under ~28 px (with a 4 px band so it never flickers) */
    if(tac||phone) sl.cmp=true; else sl.cmp=sl.cmp?A.ph<32:A.ph<28;
    const big=sl.role==='car'||sl.role==='inc'; const fs=tac?11:phone?(big?12:11):W>=900?(big?14:12.5):(big?13:12);
    const n=v185PlName(st,p), glyph=p.gk?'gk':(sl.role==='def'?'':'ball'); const m=v185PlMeasure(g,n,fs,glyph,sl.cmp,W*(phone?0.34:0.3)); sl.m=m; sl.n=n; sl.gly=glyph;
    const w=m.w, h=m.h; let tx, ty, ptrUp=false;
    if(tac){ tx=A.x+A.ph+4; ty=A.y-A.ph-h*0.35; }
    else if(off){ const M=V185PL.pad+10; tx=Math.max(M,Math.min(W-M-w,A.x-w/2)); ty=Math.max(M,Math.min(H-M-h,A.y-V185PL.gap-h)); }
    else { tx=A.x-w/2; ty=A.y-V185PL.gap-h; if(ty<V185PL.pad&&A.fy+V185PL.gap+h<H-V185PL.pad){ ty=A.fy+V185PL.gap; ptrUp=true; } }
    const r=sl.r; if(!v185PlFit(r,tx,ty,w,h,B,nb,W,H,sl.side||0)) continue; if(v185PlFitSide) sl.side=v185PlFitSide;
    /* ease the offset from the anchor (critically damped, ~14/s); snap when new, under reduced motion, or if the eased spot collides */
    const gx=r.x-A.x, gy=r.y-A.y;
    if(!sl.init||st.rm||sl.a<=0.02){ sl.ox=gx; sl.oy=gy; sl.vx=0; sl.vy=0; sl.init=true; }
    else { const dt=Math.min(0.05,dtR/1000), om=V185PL.om, e=Math.exp(-om*dt); let c=sl.ox-gx, tmp=(sl.vx+om*c)*dt; sl.ox=gx+(c+tmp)*e; sl.vx=(sl.vx-om*tmp)*e; c=sl.oy-gy; tmp=(sl.vy+om*c)*dt; sl.oy=gy+(c+tmp)*e; sl.vy=(sl.vy-om*tmp)*e; }
    let fx=A.x+sl.ox, fy=A.y+sl.oy; const rx=r.x, ry=r.y; r.x=fx; r.y=fy; let bad=fx<V185PL.pad-0.5||fy<V185PL.pad-0.5||fx+w>W-V185PL.pad+0.5||fy+h>H-V185PL.pad+0.5; if(!bad) for(let i=0;i<nb;i++) if(v185PlHit(r,B[i])){ bad=true; break; }
    if(bad){ if(!st.rm&&sl.a>0.3&&Math.hypot(fx-rx,fy-ry)>12) sl.a=0.12; r.x=rx; r.y=ry; sl.ox=gx; sl.oy=gy; sl.vx=0; sl.vy=0; }
    /* the pointer, when the tag sits right above (or below) the head */
    if(!tac&&!off){ if(!ptrUp&&A.y-(r.y+h)>=2&&A.y-(r.y+h)<=V185PL.gap+10&&A.x>r.x+5&&A.x<r.x+w-5) sl.ptr=A.x; else if(ptrUp&&r.y-A.fy>=2&&r.y-A.fy<=V185PL.gap+10&&A.x>r.x+5&&A.x<r.x+w-5){ sl.ptr=A.x; sl.ptrUp=true; } }
    sl.ptrUp=ptrUp&&sl.ptr!=null;
    if(off) sl.chev=A.x<0?'l':A.x>W?'r':A.y<0?'u':'d';
    sl.on=true;
    /* the placed tag (with its pointer zone) is an obstacle for the lower-priority ones */
    const b=B[nb]||(B[nb]={}); b.x=r.x-2; b.y=r.y-(sl.ptrUp?V185PL.ptr+1:2); b.w=w+4; b.h=h+4+V185PL.ptr+1; b.k='tag'; nb++; }
  S.nbAll=nb; }
/* each tag is drawn once into a small bitmap (per player, size, glyph, kit and pixel ratio) and blitted every frame */
function v185PlSprite(st,S,sl,kit){ const dpr=st.dpr||1, m=sl.m; const C=S.spr||(S.spr=new Map()); let e=C.get(sl.pid);
  if(e&&e.m===m&&e.kit===kit&&e.dpr===dpr) return e.c;
  if(!e){ e={c:document.createElement('canvas'),m:null,kit:null,dpr:0}; C.set(sl.pid,e); } const c=e.c, w=m.w+2, h=m.h+2; c.width=Math.ceil(w*dpr); c.height=Math.ceil(h*dpr);
  const q=c.getContext('2d'); q.setTransform(dpr,0,0,dpr,0,0); q.clearRect(0,0,w,h); v185DrawPlate(q,1,1,sl.n,kit,{fs:m.fs,glyph:sl.gly,m});
  e.m=m; e.kit=kit; e.dpr=dpr; return c; }
/* true when the leader from (fx, fy) along (dx, dy) would cross the minimap or a caption (the head there is under it anyway) */
function v185PlLeadHid(S,fx,fy,dx,dy){ const B=S.blocks; for(let i=0;i<(S.nb||0);i++){ const b=B[i]; if(b.k!=='mini'&&b.k!=='cap') continue;
    for(let k=1;k<=4;k++){ const x=fx+dx*k/4, y=fy+dy*k/4; if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h) return true; } } return false; }
function v185PlPaint(st,S){ const g=st.ctx; g.save(); const dpr=st.dpr||1; g.setTransform(dpr,0,0,dpr,0,0);
  /* a tag moved aside (no pointer) keeps a thin leader to its player's head, under the tags */
  if(st.mode!=='tactical') for(const sl of S.list){ if(!sl.on||sl.a<=0.004||sl.ptr!=null||sl.chev) continue; const r=sl.r, A=sl.an, w=sl.m.w, h=sl.m.h; let fx, fy;
    if(A.y>=r.y+h){ fx=Math.max(r.x+4,Math.min(r.x+w-4,A.x)); fy=r.y+h; } else if(A.y<=r.y){ fx=Math.max(r.x+4,Math.min(r.x+w-4,A.x)); fy=r.y; }
    else { fx=A.x<r.x?r.x:r.x+w; fy=Math.max(r.y+3,Math.min(r.y+h-3,A.y)); }
    const dx=A.x-fx, dy=A.y-fy, d=Math.hypot(dx,dy); if(d<5||d>170||v185PlLeadHid(S,fx,fy,dx,dy)) continue; const ex=A.x-dx/d*2, ey=A.y-dy/d*2;
    g.globalAlpha=Math.min(1,sl.a)*0.8; g.strokeStyle='rgba(8,12,16,.55)'; g.lineWidth=2.5; g.beginPath(); g.moveTo(fx,fy); g.lineTo(ex,ey); g.stroke();
    g.strokeStyle='rgba(255,255,255,.85)'; g.lineWidth=1; g.beginPath(); g.moveTo(fx,fy); g.lineTo(ex,ey); g.stroke(); g.fillStyle='#ffffff'; g.beginPath(); g.arc(ex,ey,1.6,0,7); g.fill(); }
  for(let i=S.list.length-1;i>=0;i--){ const sl=S.list[i]; if(!sl.on||sl.a<=0.004) continue; const kit=sl.p.gk?st.kits.gk[sl.p.side]:st.kits.team[sl.p.side]; S.drawn++;
    const m=sl.m, spr=v185PlSprite(st,S,sl,kit), x=Math.round(sl.r.x), y=Math.round(sl.r.y); g.globalAlpha=Math.min(1,sl.a);
    g.drawImage(spr,x-1,y-1,m.w+2,m.h+2); if(sl.ptr!=null||sl.chev) v185PlDeco(g,x,y,m.w,m.h,sl.ptr,sl.ptrUp,sl.chev); }
  g.restore(); }

/* ---------- screen readers: a quiet status line (never announced; the commentary already is) ---------- */
function v185PlSr(st,S,car,def){ const host=st.cv&&st.cv.parentElement; if(!host||host.id!=='lv-stage') return;
  let el=S.sr; if(!el||!el.isConnected){ el=host.querySelector(':scope > .v185-sr'); if(!el){ el=document.createElement('span'); el.className='v185-sr'; el.setAttribute('role','status'); el.setAttribute('aria-live','off'); host.appendChild(el); } S.sr=el; }
  const nm=p=>{ const n=v185PlName(st,p); return (n.num?n.num+' ':'')+(n.full||n.short||'').trim(); };
  const txt=car?('Ball: '+nm(car)+(def?'. Pressed by: '+nm(def):'')):'';
  if(txt===S.srTxt){ S.srPend=null; return; }
  if(S.clk-S.srT>=1500||S.clk<S.srT){ S.srTxt=txt; S.srT=S.clk; S.srPend=null; el.textContent=txt; } else S.srPend=txt; }

/* ---------- hooks ---------- */
const _v185PlDraw=Stage.prototype.draw;
Stage.prototype.draw=function(){ const S=this._pl; if(S){ S.fid++; S.drawn=0; } const r=_v185PlDraw.apply(this,arguments);
  try{ v185PlFrame(this); }catch(e){ if(V185PL.err++<3) console.warn('v18.5 plates',e); }
  return r; };
/* a new roster (kick-off, substitutions, a highlight clip): names rebuilt, tags start fresh */
const _v185PlSetSides=Stage.prototype.setSides;
Stage.prototype.setSides=function(){ const r=_v185PlSetSides.apply(this,arguments); this._plN=null; if(this._pl) v185PlReset(this._pl); return r; };
if(typeof Stage.prototype.clipStart==='function'){ const _v185PlClip=Stage.prototype.clipStart;
  Stage.prototype.clipStart=function(){ if(this._pl) v185PlReset(this._pl); return _v185PlClip.apply(this,arguments); }; }

/* the key N toggles the plates during a live match or the goal-replay card */
function v185PlToggle(){ PREFS.plates=PREFS.plates===false; savePrefs(); if(typeof toast==='function') toast(PREFS.plates?'Name plates on':'Name plates off');
  for(const st of [App.live&&App.live.stage,App.hl]) if(st&&st.alive&&st.requestDraw) st.requestDraw();
  document.querySelectorAll('input[data-k="plates"]').forEach(el=>{ el.checked=PREFS.plates!==false; }); }
document.addEventListener('keydown',e=>{ if(e.key!=='n'&&e.key!=='N') return; if(e.ctrlKey||e.metaKey||e.altKey||e.repeat) return; const t=e.target;
  if(t&&(t.isContentEditable||(t.matches&&t.matches('input,select,textarea')))) return;
  const live=App.live&&!App.modal, hl=App.hl&&App.hl.alive&&App.hl.cv&&App.hl.cv.isConnected; if(!live&&!hl) return;
  e.preventDefault(); v185PlToggle(); });

/* Settings > Match graphics: the plates switch, after the goal-replay switch */
const _v185PlSettings=VIEWS.settings;
VIEWS.settings=function(){ const h=_v185PlSettings.apply(this,arguments); if(h.indexOf('data-k="plates"')>=0) return h;
  const add=`<label class="toggle v185-plset"><input type="checkbox" data-c="pref" data-k="plates" ${PREFS.plates!==false?'checked':''}> Player name plates (ball carrier and defender, N)</label>`;
  let i=h.indexOf('class="field v185-rpset"'), j=i<0?-1:h.indexOf('</div>',i); if(j>=0) return h.slice(0,j+6)+add+h.slice(j+6); /* after 76's Goal replays select */
  i=h.indexOf('v18-rpset'); j=i<0?-1:h.indexOf('</label>',i); if(j>=0) return h.slice(0,j+8)+add+h.slice(j+8);
  i=h.indexOf('class="field v17-rend"'); j=i<0?-1:h.indexOf('</div>',i); if(j>=0) return h.slice(0,j+6)+add+h.slice(j+6);
  return h; };
