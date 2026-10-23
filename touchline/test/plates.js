/* v18.5 player plates (src/v17/77_plates.js). Every frame of the live stage is sampled through an outer wrapper round
   Stage.prototype.draw (after the plates have painted):
   1. 2-D live match at 1x (1440x900): the carrier tag is st.own in >= 95 % of frames where own has been held >= 300 ms with
      no flight; its anchor is within 2 px of the head top drawFigure painted (pose stored by blendPose); the defender never flickers (no A-B-A
      within 1.5 s, no tag shorter than 250 ms, switches per minute of play reported and bounded); tags never overlap each
      other, the minimap or the caption, and stay inside the canvas, at every zoom level, in Sideline and in Tactical.
   2. Hidden: replays, from the goal to the restart, plates off (Settings value), the walkout, full time, skipping, the
      title-screen demo. Penalties/shootouts (lab 'pens'): exactly the taker and the other side's keeper.
   3. Hysteresis on a synthetic stage (v185PlSelect / v185PlPickDef): an oscillating challenger never switches, a clearly
      closer one wins within 600 ms, a committed chase wins on the next frame, nobody near clears the tag within 800 ms.
   4. 3-D (forced, tier C, 960x600): broadcast and sideline; the anchor is within 3 px of the head top the figures module
      solved that frame (captured by a test-side wrapper round v18FigDraw), projected through the painter's camera.
   5. Phone 390x844: compact tags, layout rules, every zoom.
   6. Settings checkbox and the N key (toggle, toast, survives a reload); contrast >= 4.5 for every kit pair of a career;
      the draw costs little (mean ms per frame reported, bounded generously for software rendering); no page errors.
   node test/plates.js [shots]   (shots: screenshots to test/shots/v185/plates/) */
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SHOTS=process.argv.includes('shots'); const OUT='test/shots/v185/plates/'; if(SHOTS) fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const until=async(p,fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(200); } return false; };
const watch=(p,errs)=>{ p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/GL Driver/i.test(m.text())) errs.push('console: '+m.text()); if(m.type()==='warning'&&/v18\.5 plates/.test(m.text())) errs.push('warn: '+m.text()); }); };
const f2=x=>+(+x).toFixed(2);
async function startLive(p,seed,renderer,view){
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.evaluate(([r,v])=>{ PREFS.renderer=r; PREFS.rtier='C'; PREFS.replays=true; PREFS.view=v||'broadcast'; PREFS.zoom='normal'; PREFS.plates=true; savePrefs(); },[renderer,view]);
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Plates Coach'); await p.fill('#nc-seed',seed);
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ App.C.settings.walkout='off'; App.C.settings.walk2=1; });
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  return until(p,()=>!!(App.live&&App.live.stage&&App.live.stage.alive&&App.live.stage.own),25000); }
/* the sampler: one record per draw of the watched stage, taken after the plates painted */
const SAMPLER=()=>{ window.PLS=[]; window.PLW=window.PLW||(()=>App.live&&App.live.stage); if(window._plHooked) return; window._plHooked=true; if(typeof v18FigDraw==='function'){ const FD=v18FigDraw; window.PLH=new Map(); v18FigDraw=function(P,st,p){ const r=FD.apply(this,arguments); if(r&&p&&p.pid!=null&&P&&P._fig&&P._fig.s){ const W=P._fig.s; window.PLH.set(p.pid,[W[42],W[43],W[44],st.now]); } return r; }; } const D=Stage.prototype.draw;
  Stage.prototype.draw=function(){ const r=D.apply(this,arguments); try{ const st=this; if(st.demo){ window.PLDEMO=(window.PLDEMO||0)+((st._pl&&st._pl.drawn)||0); return r; }
    if(!window.PLS||st!==window.PLW()) return r; const S=st._pl; const t=performance.now(); const o=st.own;
    if(o!==window._plO){ window._plO=o; window._plOT=t; }
    const rec={t,own:o?o.pid:null,held:o?t-window._plOT:0,fl:!!st.fl,mode:st.mode,W:st.W,H:st.H,rp:!!(st._rp&&st._rp.on),inNet:!!st.inNet,celeb:[...st.players.values()].some(q=>q.celeb),
      pen:(st.setPiece==='pen'||!!st.so)&&!!st.placed&&!!o&&!st.fl,gkO:o?((st.gkOf(1-o.side)||{}).pid||null):null,paused:!!st.paused,
      drawn:S?S.drawn:0,why:S?S.why:'none',car:S&&S.car?S.car.pid:null,def:S&&S.def?S.def.pid:null,dwhy:S?S.D.why:'',tags:[],blocks:[]};
    if(S){ for(const sl of S.slots.values()){ if(!sl.on||sl.a<=0.004) continue; const p=sl.p; const tg={pid:sl.pid,role:sl.role,a:sl.a,tgt:sl.tgt,cmp:sl.cmp,r:[sl.r.x,sl.r.y,sl.r.w,sl.r.h],an:[sl.an.x,sl.an.y],ptr:sl.ptr,chev:sl.chev};
        if(st.mode!=='tactical'&&!(st._p3d&&!st._p3d.dead)){ const Q=p._pose; const [x,y,k]=st.proj(p.x,p.y); const s=k*((p.hgt||70)/70)*1.06;
          if(Q&&p._poseT===st.now){ /* drawFigure's head: up() about the hips, pr() with yaw and depth, lift, rotation about the pivot */
            const yaw=p.yaw==null?((p.face||1)>0?0:Math.PI):p.yaw; const DEP=st.depthK!=null?st.depthK:Math.min(0.45,Math.max(0.12,(st.H*0.705/68)/Math.max(1,k)));
            const up=(f,u,l)=>{ if(u<=Q.hipU) return [f,u,l]; const du=u-Q.hipU; return [f*Math.cos(Q.lean)+du*Math.sin(Q.lean),Q.hipU+du*Math.cos(Q.lean)-f*Math.sin(Q.lean),l]; };
            const pr=([f,u,l])=>{ const dx=f*Math.cos(yaw)-l*Math.sin(yaw), dy=f*Math.sin(yaw)+l*Math.cos(yaw); return [dx*s,-u*s+dy*s*DEP]; };
            const t=Q.headTilt||0; let [hx,hy]=pr(up(0.02+t*0.05,1.86-Math.abs(t)*0.02,0)); if(Q.rot){ const pv=(Q.pivot||0)*s; hy+=pv; const a=Math.cos(Q.rot)*hx-Math.sin(Q.rot)*hy, b=Math.sin(Q.rot)*hx+Math.cos(Q.rot)*hy; hx=a; hy=b-pv; }
            tg.ex=[x+hx,y-(Q.lift||0)*s+hy-0.165*s]; tg.posed=true; }
          else { const e=st.proj(p.x,p.y,2.15*(p.hgt||70)/70+st.jumpLift(p)); tg.ex=[e[0],e[1]]; } }
        if(st._p3d&&!st._p3d.dead&&st.mode!=='tactical'){ const P=st._p3d, V=new THREE.Vector3(p.x,1.87*(p.hgt||70)/70+st.jumpLift(p),p.y).project(P.camera); const F=new THREE.Vector3(p.x,0,p.y).project(P.camera); tg.e3=[(V.x+1)/2*st.W,(1-V.y)/2*st.H,(1-F.y)/2*st.H,V.z];
          const H=window.PLH&&window.PLH.get(p.pid); if(H&&H[3]===st.now){ /* the head the figures module solved this frame, its top (head radius 0.2 body units) */ const U=new THREE.Vector3(H[0],H[1]+0.2*0.92*(p.hgt||70)/70,H[2]).project(P.camera); tg.h3=[(U.x+1)/2*st.W,(1-U.y)/2*st.H,U.z]; } }
        rec.tags.push(tg); }
      for(let i=0;i<(S.nb||0);i++){ const b=S.blocks[i]; rec.blocks.push([b.x,b.y,b.w,b.h,b.k]); } }
    window.PLS.push(rec); }catch(e){ window.PLERR=String(e); } return r; }; };
const take=p=>p.evaluate(()=>{ const s=window.PLS||[]; window.PLS=[]; return s; });
const hit=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
/* layout rules over a sample: tags inside the canvas (6 px inset, half a px slack), no overlap with each other or the HUD boxes */
function layout(S){ let n=0, out=0, over=0, block=0, bad=[];
  for(const s of S){ const T=s.tags; for(const t of T){ n++; const [x,y,w,h]=t.r; if(x<5.5||y<5.5||x+w>s.W-5.5||y+h>s.H-5.5){ out++; if(bad.length<3) bad.push(['out',s.W,s.H,t.r.map(Math.round)]); }
      for(const b of s.blocks){ if(b[4]==='tag') continue; if(hit(t.r,b)){ block++; if(bad.length<3) bad.push(['block',b[4],t.r.map(Math.round)]); } } }
    for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++) if(hit(T[i].r,T[j].r)){ over++; if(bad.length<3) bad.push(['overlap',T[i].r.map(Math.round),T[j].r.map(Math.round)]); } }
  return {n,out,over,block,bad}; }
function jumps(S){ let n=0, worst=0; const last=new Map();
  for(const s of S){ const cur=new Map(); for(const t of s.tags){ if(t.chev) continue; const o=[t.r[0]-t.an[0],t.r[1]-t.an[1]]; cur.set(t.pid,[o,t.a]); const q=last.get(t.pid);
      if(q&&t.a>0.6&&q[1]>0.6){ const d=Math.hypot(o[0]-q[0][0],o[1]-q[0][1]); worst=Math.max(worst,d); if(d>40) n++; } } last.clear(); for(const [k,v] of cur) last.set(k,v); }
  return {n,worst}; }
function carrier(S){ let n=0, m=0, anc=0, ancMax=0; for(const s of S){ if(s.rp||s.inNet||s.celeb||s.why!==''||!s.own||s.fl||s.held<300||s.paused) continue; n++; if(s.car===s.own) m++;
    const t=s.tags.find(q=>q.role==='car'); if(t&&t.ex){ const d=Math.hypot(t.an[0]-t.ex[0],t.an[1]-t.ex[1]); anc++; ancMax=Math.max(ancMax,d); } }
  return {n,match:n?m/n:0,anc,ancMax}; }
/* defender stability: changes of the shown defender while the carrier stays the same */
function defender(S){ let sw=0, aba=0, short=0, ms=0, prev=null, prevT=0, hist=[], car=null;
  for(let i=1;i<S.length;i++){ const s=S[i], a=S[i-1]; if(s.why!==''||a.why!=='') { hist=[]; continue; } if(s.car&&!s.fl) ms+=Math.min(100,s.t-a.t);
    if(s.car!==car){ car=s.car; hist=[]; prev=s.def; prevT=s.t; continue; }
    if(s.def!==prev){ if(prev&&s.def) sw++; if(prev&&s.t-prevT<250) short++; hist.push([s.def,s.t]); if(hist.length>=3){ const [x,tx]=hist[hist.length-3], [y]=hist[hist.length-2], [z,tz]=hist[hist.length-1]; if(x&&x===z&&x!==y&&tz-tx<1500) aba++; } prev=s.def; prevT=s.t; } }
  return {sw,aba,short,min:ms/60000}; }

(async()=>{ const t0=Date.now(); const b=await chromium.launch(); const errs=[];
  /* ================= 1. 2-D desktop ================= */
  let p=await b.newPage({viewport:{width:1440,height:900}}); watch(p,errs);
  await p.goto(DIST); await p.waitForTimeout(500); await p.evaluate(SAMPLER); await p.waitForTimeout(2500);
  ok(await p.evaluate(()=>!window.PLDEMO),'title-screen demo stage: no plates drawn');
  ok(await p.evaluate(()=>v185PlKind({demo:true})==='menu'&&!V185PL_KINDS.menu),'demo/menu stages are excluded');
  ok(await startLive(p,'plates1','2d'),'2-D live match started');
  await p.evaluate(SAMPLER); await p.click('[data-a="liveSpeed"][data-v="1"]');
  await p.waitForTimeout(+process.env.PL_MS||24000);
  let S=await take(p); let C=carrier(S), L=layout(S), Dd=defender(S);
  console.log('  2-D 1x',JSON.stringify({frames:S.length,carrierFrames:C.n,match:f2(C.match),ancMax:f2(C.ancMax),def:Dd,layout:L}));
  ok(S.length>200,'enough frames sampled ('+S.length+')');
  ok(C.n>=60&&C.match>=0.95,'the carrier tag is st.own after the stability delay in >= 95 % of frames ('+(C.match*100).toFixed(1)+' % of '+C.n+')');
  ok(C.anc>=60&&C.ancMax<=2,'2-D: the carrier anchor is within 2 px of the drawn head top (drawFigure\'s head from the stored pose; max '+f2(C.ancMax)+' px)');
  ok(S.some(s=>s.tags.some(t=>t.role==='def')),'a defender tag appears');
  ok(Dd.aba===0,'the defender never flickers back and forth (A-B-A within 1.5 s: '+Dd.aba+')');
  ok(Dd.short===0,'no defender tag shown for less than 250 ms ('+Dd.short+')');
  ok(Dd.min>0&&Dd.sw/Dd.min<=20,'defender switches with the same carrier: '+Dd.sw+' in '+f2(Dd.min)+' min of possession');
  ok(L.n>100&&!L.out&&!L.over&&!L.block,'broadcast Normal: tags inside the canvas, never over each other, the minimap or the caption '+JSON.stringify(L.bad));
  ok(S.some(s=>s.tags.some(t=>t.ptr!=null)),'tags carry a pointer to the head');
  { const J=jumps(S); ok(J.n===0,'no tag at full strength jumps against its player in one frame (> 40 px: '+J.n+', largest '+f2(J.worst)+' px)'); }
  const mean=await p.evaluate(()=>{ const f=App.live.stage._pl.perf; const r=[...f.ring.slice(0,Math.min(600,f.n))].sort((a,b)=>a-b); return {mean:f.sum/f.n,max:f.max,n:f.n,med:r[r.length>>1]}; });
  console.log('  cost',JSON.stringify({mean:+mean.mean.toFixed(4),median:+mean.med.toFixed(4),max:f2(mean.max),n:mean.n}));
  ok(mean.mean<0.5,'the plates cost '+mean.mean.toFixed(3)+' ms per frame on average (software, shared machine; budget 0.5 ms)');
  if(SHOTS){ await shot(p,'d-2d-broadcast.png'); }
  /* presentation only: running the plates never writes a field of the stage or of any mover */
  ok(await p.evaluate(()=>{ const st=App.live.stage; const prim=v=>v===null||['number','string','boolean','undefined'].includes(typeof v);
    const snap=()=>{ const o={}; for(const k of Object.keys(st)) if(prim(st[k])) o[k]=st[k]; o.own=st.own&&st.own.pid; o.fl=!!st.fl; o.ball=JSON.stringify(st.ball); o.m=[...st.players.values()].map(q=>Object.keys(q).filter(k=>prim(q[k])).map(k=>k+'='+q[k]).join(',')).join('|'); return JSON.stringify(o); };
    const was=st.paused; st.paused=true; const a=snap(); for(let i=0;i<5;i++) v185PlFrame(st); const b=snap(); st.paused=was; return a===b; }),'presentation only: the plates write no stage or player field');
  /* every zoom level, sideline and tactical */
  for(const [view,zoom] of [['broadcast','wide'],['broadcast','close'],['broadcast','tight'],['sideline','normal'],['sideline','tight'],['tactical','normal']]){
    await p.evaluate(([v,z])=>{ PREFS.zoom=z; savePrefs(); A.liveView({dataset:{v}}); App.live.stage.v184Zoom(true); },[view,zoom]); await p.waitForTimeout(600); await take(p);
    await p.waitForTimeout(+process.env.PL_VMS||5000); S=await take(p); L=layout(S); const n=S.filter(s=>s.drawn).length;
    ok(n>20&&L.n>20&&!L.out&&!L.over&&!L.block,`2-D ${view} ${zoom}: ${n} frames with tags, layout rules hold `+JSON.stringify({n:L.n,out:L.out,over:L.over,block:L.block,bad:L.bad}));
    if(view==='tactical') ok(S.every(s=>s.tags.every(t=>t.cmp&&t.ptr==null)),'tactical: compact tags beside the dots, no pointer');
    if(SHOTS) await shot(p,`d-2d-${view}-${zoom}.png`); }
  await p.evaluate(()=>{ PREFS.zoom='normal'; savePrefs(); A.liveView({dataset:{v:'broadcast'}}); App.live.stage.v184Zoom(true); });
  /* two players stacked at the same point: the tags still never overlap */
  { const r=await p.evaluate(()=>{ const st=App.live.stage, S=st._pl; const ps=[...st.players.values()].filter(q=>!q.off&&!q.gk); const a=ps.find(q=>q.side===0), c=ps.find(q=>q.side===1);
      const L=v185PlLayout, out=[]; S.slots.clear(); for(const [q,role] of [[a,'car'],[c,'def']]){ S.slots.set(q.pid,{pid:q.pid,p:q,role,a:1,tgt:1,r:{x:0,y:0,w:0,h:0},ox:0,oy:0,vx:0,vy:0,init:false,on:false,hf:-1,cmp:false,ptr:null,chev:'',an:{x:0,y:0,fy:0,ph:0}}); }
      const sx=a.x, sy=a.y, cx=c.x, cy=c.y; a.x=c.x=st.ball.x; a.y=c.y=st.ball.y; try{ L(st,S,16); for(const sl of S.slots.values()) out.push({on:sl.on,r:[sl.r.x,sl.r.y,sl.r.w,sl.r.h]}); } finally{ a.x=sx; a.y=sy; c.x=cx; c.y=cy; } return out; });
    ok(r.length===2&&r.every(q=>q.on)&&!hit(r[0].r,r[1].r),'two players stacked at one point: both tags placed, no overlap '+JSON.stringify(r.map(q=>q.r.map(Math.round)))); }
  /* a carrier at the minimap corner: his tag steps out of the minimap */
  { const r=await p.evaluate(()=>{ const hit=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3]; const st=App.live.stage, S=st._pl; const q=[...st.players.values()].find(z=>!z.off&&!z.gk); const sl={pid:q.pid,p:q,role:'car',a:1,tgt:1,r:{x:0,y:0,w:0,h:0},ox:0,oy:0,vx:0,vy:0,init:false,on:false,hf:-1,cmp:false,ptr:null,chev:'',an:{x:0,y:0,fy:0,ph:0}};
      S.slots.clear(); S.slots.set(q.pid,sl); v185PlBlocks(st,S); const M=S.blocks[0]; const sx=q.x, sy=q.y; let best=null;
      /* find a point (on the far touchline or just behind it) whose natural tag, centred above the head, would sit on the minimap */
      for(let y=-3;y<=20&&!best;y+=0.5) for(let x=0;x<=105&&!best;x+=0.5){ const a=st.proj(x,y,2.15*(q.hgt||70)/70); const r=[a[0]-40,a[1]-27,80,21]; if(a[0]<st.W-20&&hit(r,[M.x,M.y,M.w,M.h])) best=[x,y]; }
      if(!best) return {skip:true}; q.x=best[0]; q.y=best[1]; try{ v185PlLayout(st,S,16); } finally{ q.x=sx; q.y=sy; } const B=S.blocks[0]; return {on:sl.on,r:[sl.r.x,sl.r.y,sl.r.w,sl.r.h],b:[B.x,B.y,B.w,B.h],k:B.k}; });
    ok(r.skip||(r.on&&r.k==='mini'&&!hit(r.r,r.b)),'a carrier under the minimap: the tag is placed clear of it '+JSON.stringify(r)); }
  /* a carrier far off the left of the frame: his tag is pinned to the edge with a chevron; a defender off screen is hidden */
  { const r=await p.evaluate(()=>{ const st=App.live.stage, S=st._pl; const ps=[...st.players.values()].filter(z=>!z.off&&!z.gk); const q=ps.find(z=>z.side===0), d=ps.find(z=>z.side===1);
      const mk=(z,role)=>({pid:z.pid,p:z,role,a:1,tgt:1,r:{x:0,y:0,w:0,h:0},ox:0,oy:0,vx:0,vy:0,init:false,on:false,hf:-1,cmp:false,ptr:null,chev:'',an:{x:0,y:0,fy:0,ph:0}});
      S.slots.clear(); const a=mk(q,'car'), b=mk(d,'def'); S.slots.set(q.pid,a); S.slots.set(d.pid,b); const sv=[q.x,q.y,d.x,d.y]; q.x=d.x=st.cam.x-st.cam.w*1.6; q.y=d.y=34;
      try{ v185PlLayout(st,S,16); } finally{ q.x=sv[0]; q.y=sv[1]; d.x=sv[2]; d.y=sv[3]; } return {car:{on:a.on,chev:a.chev,r:[a.r.x,a.r.y,a.r.w,a.r.h].map(Math.round),ax:Math.round(a.an.x)},def:b.on,W:st.W}; });
    ok(r.car.on&&r.car.chev==='l'&&r.car.r[0]>=15&&!r.def,'a carrier off the left edge: pinned at the edge with a chevron, the defender hidden '+JSON.stringify(r)); }
  /* ---------- hidden states ---------- */
  await p.evaluate(()=>{ App.live.paused=true; }); await until(p,()=>!App.live.busy,90000);
  await p.evaluate(()=>{ const st=App.live.stage; st.paused=false; });
  { await until(p,()=>{ const S=App.live.stage._pl; return !!(S&&[...S.slots.values()].some(s=>s.role==='car'&&s.a>=0.99)); },20000);
    const r=await p.evaluate(()=>{ const st=App.live.stage, S=st._pl, o={}; st.paused=true; try{ v185PlFrame(st); v185PlToggle(); v185PlFrame(st); o.off=S.slots.size; o.offSr=(S.sr&&S.sr.textContent)||'';
        v185PlToggle(); v185PlFrame(st); const c=[...S.slots.values()].find(s=>s.role==='car'); o.on=c?c.a:0; o.own=!!st.own&&!st.fl; } finally{ st.paused=false; } return o; });
    ok(r.off===0&&r.offSr===''&&(!r.own||r.on>=0.99),'N while paused: the tags go at once, and come straight back '+JSON.stringify(r)); }
  await p.evaluate(()=>{ PREFS.plates=false; savePrefs(); }); await p.waitForTimeout(700); await take(p); await p.waitForTimeout(1200); S=await take(p);
  ok(S.length>10&&S.every(s=>!s.drawn),'PREFS.plates=false: nothing drawn ('+S.length+' frames)');
  await p.evaluate(()=>{ PREFS.plates=true; savePrefs(); });
  const gates=await p.evaluate(()=>{ const st=App.live.stage, S=st._pl, L=App.live, o={}; const g=()=>{ S.kind=null; return v185PlGate(st,S); };
    o.normal=g(); st.ft=true; o.ft=g(); st.ft=false; L.skipping=true; o.skipping=g(); L.skipping=false; st.skip=true; o.skip=g(); st.skip=false;
    const wf=typeof v18WalkFocus!=='undefined'?v18WalkFocus:null; v18WalkFocus={st,L,crane:0}; o.walkout=g(); v18WalkFocus=wf;
    const ph=L.M&&L.M.phase; if(L.M){ L.M.phase='ht'; o.ht=g(); L.M.phase=ph; } st.inNet=1; o.inNet=g(); st.inNet=null; const q=[...st.players.values()][3]; q.celeb=true; o.celeb=g(); q.celeb=false; o.after=g(); return o; });
  ok(gates.normal===''&&gates.ft==='hard'&&gates.skipping==='hard'&&gates.skip==='hard'&&gates.walkout==='hard'&&gates.ht==='hard'&&gates.inNet==='soft'&&gates.celeb==='soft'&&gates.after==='','gates: full time, half time, skipping, walkout hide; goal window fades '+JSON.stringify(gates));
  /* a goal at 1x: the celebration, the replay and the restart; no tags from the goal (after the 260 ms fade) to the restart */
  await take(p);
  const goal=p.evaluate(async()=>{ const L=App.live, st=L.stage; L.speed=1; st.goalTs=GOAL_TS[1]; st.skip=false; const sc=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off);
    const n0=App.v18Replays||0; await st.goalSequence({s:0,pid:sc.pid,t:'goal',ty:'open',seq:[{pid:sc.pid,x:50,y:84,a:'shot'}],m:L.M.min,sc:[1,0]}); return (App.v18Replays||0)-n0; });
  if(SHOTS){ await until(p,()=>!!(App.live.stage._rp&&App.live.stage._rp.on),40000); await p.screenshot({path:OUT+'d-2d-replay.png'}); }
  const nrp=await goal; S=await take(p);
  let win=null, hid=0, bad=0; for(const s of S){ const w=s.inNet||s.celeb||s.rp; if(w&&win==null) win=s.t; if(!w){ win=null; continue; } if(s.t-win>300){ hid++; if(s.drawn) bad++; } }
  ok(nrp===1&&S.some(s=>s.rp),'the 2-D goal replay played');
  ok(hid>20&&bad===0,'goal window and replay: no tags ('+bad+' of '+hid+' frames drawn)');
  ok(S.filter(s=>s.rp).every(s=>!s.drawn),'replay frames: nothing drawn');
  /* ---------- the N key and the persisted value ---------- */
  await p.evaluate(()=>{ document.activeElement&&document.activeElement.blur&&document.activeElement.blur(); });
  await p.keyboard.press('n'); const k1=await p.evaluate(()=>({v:PREFS.plates,toast:(document.querySelector('#toast')||{}).textContent||''}));
  await p.keyboard.press('n'); const k2=await p.evaluate(()=>({v:PREFS.plates,toast:(document.querySelector('#toast')||{}).textContent||'',ls:JSON.parse(localStorage.getItem(PREF_KEY)).plates}));
  ok(k1.v===false&&/off/i.test(k1.toast)&&k2.v===true&&/on/i.test(k2.toast)&&k2.ls===true,'N toggles the plates with a toast and saves '+JSON.stringify([k1,k2]));
  ok(await p.evaluate(()=>/N names/.test((document.querySelector('#lv-ctrl .kb')||{}).textContent||'')),'the keyboard hint lists N');
  await p.keyboard.press('n'); await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(()=>PREFS.plates===false),'plates off survives a reload');
  /* ---------- Settings ---------- */
  if(!await p.evaluate(()=>!!App.C)){ const c=await p.$('.cont-hero'); if(c) await c.click(); await until(p,()=>!!App.C,8000); }
  const set=await p.evaluate(async()=>{ if(!App.C){ return {noCareer:true}; } A.go({dataset:{r:'settings'}}); await new Promise(r=>setTimeout(r,500)); const el=document.querySelector('input[data-k="plates"]'); if(!el) return {el:false};
    const before=el.checked; el.click(); await new Promise(r=>setTimeout(r,100)); const after=PREFS.plates; el.click(); await new Promise(r=>setTimeout(r,100));
    return {el:true,before,after,back:PREFS.plates,label:el.closest('label').textContent.trim(),afterReplay:!!el.closest('label').previousElementSibling}; });
  ok(set.noCareer||(set.el&&set.before===false&&set.after===true&&set.back===false),'Settings: the plates checkbox reflects and toggles PREFS.plates '+JSON.stringify(set));
  /* ---------- contrast of the number on every kit pair ---------- */
  const con=await p.evaluate(()=>{ if(!App.C) return null; const ids=Object.keys(App.C.schools); let n=0, worst=99, at=null;
    for(const h of ids) for(const a of ids){ if(h===a) continue; const K=kitMatchup(Sx(h),Sx(a)); for(const k of [...K.team,...K.gk]){ const c=v185PlCon(v185PlNumCol(k),k.shirt); n++; if(c<worst){ worst=c; at=[h,a,k.shirt,v185PlNumCol(k)]; } } } return {n,worst,at}; });
  ok(!con||(con.n>0&&con.worst>=4.5),'number contrast >= 4.5 on every kit of every school pair '+JSON.stringify(con&&{n:con.n,worst:f2(con.worst),at:con.at}));
  await p.evaluate(()=>{ PREFS.plates=true; savePrefs(); });
  await p.close();

  /* ================= 2. lab: penalties and the synthetic hysteresis ================= */
  p=await b.newPage({viewport:{width:1200,height:760}}); watch(p,errs);
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900); await p.evaluate(()=>{ PREFS.renderer='2d'; PREFS.plates=true; setTimeout(()=>labRun('pens'),0); });
  await until(p,()=>!!App.labSt,8000); await p.evaluate(()=>{ window.PLW=()=>App.labSt; }); await p.evaluate(SAMPLER);
  await until(p,()=>(window.PLS||[]).filter(s=>s.pen&&s.car).length>40,40000); S=await take(p);
  const pens=S.filter(s=>s.pen&&s.car&&s.held>500); const exact=pens.filter(s=>{ const ids=s.tags.filter(t=>t.tgt>0).map(t=>t.pid).sort().join(); return ids===[s.own,s.gkO].sort().join(); });
  ok(pens.length>10&&exact.length/pens.length>=0.95,'penalties/shootout: the tags are exactly the taker and the other keeper ('+exact.length+'/'+pens.length+')');
  if(SHOTS){ await p.evaluate(()=>{ App.labSt.paused=true; }); await p.waitForTimeout(700); await p.screenshot({path:OUT+'d-lab-pens.png'}); await p.evaluate(()=>{ App.labSt.paused=false; }); }
  const hy=await p.evaluate(()=>{ const mk=(pid,side,x,y,gk)=>({pid,side,x,y,gk:!!gk,off:false,celeb:false,chase:null,num:pid.length}); const c=mk('c',0,50,34), A=mk('A',1,53,34), B=mk('B',1,51.6,36.8), G=mk('G',1,103,34,true);
    const players=new Map([[c.pid,c],[A.pid,A],[B.pid,B],[G.pid,G]]); const st={players,own:c,fl:null,setPiece:null,so:false,hands:false,placed:false,headBall:null,now:0,ball:{x:50,y:34},gkOf(s){ return s===1?G:null; }};
    const S=v185PlNew(); const step=()=>{ S.clk+=1000/60; st.now+=1000/60; v185PlSelect(st,S); return S.def?S.def.pid:null; };
    const out={}; let t=0, last=null, sw=-1, first=null;
    for(let i=0;i<300;i++){ const r=3.2+0.4*Math.sin(2*Math.PI*2*t/1000); B.x=50+r*0.5; B.y=34+r*0.866; t+=1000/60; const d=step(); if(d!==last){ sw++; last=d; if(first==null) first={d,t:Math.round(t)}; } }
    out.osc={switches:Math.max(0,sw),first,cur:last};
    B.x=50.5; B.y=34.87; let tB=null; for(let i=0;i<60;i++){ const d=step(); if(d==='B'&&tB==null) tB=(i+1)*1000/60; } out.closer=tB;
    A.chase=c; let tA=null; for(let i=0;i<10;i++){ const d=step(); if(d==='A'&&tA==null) tA=i+1; } out.chaseFrames=tA; A.chase=null;
    A.x=64; A.y=34; B.x=50; B.y=48; G.x=103; let tN=null; for(let i=0;i<60;i++){ const d=step(); if(d==null&&tN==null) tN=(i+1)*1000/60; } out.clear=tN==null?null:tN+V185PL.fout;
    /* the carrier stability delay */
    const c2=mk('c2',0,30,30); players.set('c2',c2); st.own=c2; let tc=null; for(let i=0;i<40;i++){ step(); if(S.car===c2&&tc==null) tc=(i+1)*1000/60; } out.stable=tc;
    return out; });
  console.log('  hysteresis',JSON.stringify(hy));
  ok(hy.osc.switches===0&&hy.osc.cur==='A','an oscillating challenger 0.2 m further away never takes the tag (switches '+hy.osc.switches+')');
  ok(hy.closer!=null&&hy.closer<=600,'a challenger 2 m closer takes it within 600 ms ('+Math.round(hy.closer)+' ms)');
  ok(hy.chaseFrames===1,'a committed chase takes it on the next frame');
  ok(hy.clear!=null&&hy.clear<=800,'nobody near: the defender tag is gone within 800 ms ('+Math.round(hy.clear)+' ms incl. fade)');
  ok(hy.stable!=null&&hy.stable>=250&&hy.stable<=300,'a new carrier is tagged after 250 ms of stable possession ('+Math.round(hy.stable)+' ms)');
  await p.close();

  /* ================= 3. phone ================= */
  p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}); watch(p,errs);
  ok(await startLive(p,'plates2','2d'),'phone: live match started');
  await p.evaluate(SAMPLER); await p.evaluate(()=>A.liveSpeed({dataset:{v:1}}));
  for(const [view,zoom] of [['broadcast','normal'],['broadcast','wide'],['broadcast','tight'],['sideline','close'],['tactical','normal']]){
    await p.evaluate(([v,z])=>{ PREFS.zoom=z; savePrefs(); A.liveView({dataset:{v}}); App.live.stage.v184Zoom(true); },[view,zoom]); await p.waitForTimeout(600); await take(p);
    await p.waitForTimeout(+process.env.PL_VMS||5000); S=await take(p); L=layout(S); const n=S.filter(s=>s.drawn).length;
    ok(n>15&&L.n>15&&!L.out&&!L.over&&!L.block&&S.every(s=>s.tags.every(t=>t.cmp)),`phone ${view} ${zoom}: compact tags, layout rules hold `+JSON.stringify({frames:n,n:L.n,out:L.out,over:L.over,block:L.block,bad:L.bad}));
    if(SHOTS) await shot(p,`p-2d-${view}-${zoom}.png`); }
  await p.close();

  /* ================= 4. 3-D ================= */
  p=await b.newPage({viewport:{width:960,height:600}}); watch(p,errs);
  ok(await startLive(p,'plates3','3d'),'3-D live match started');
  ok(await until(p,()=>{ const s=App.live.stage; return !!(s._p3d&&!s._p3d.dead); },20000),'3-D painter attached');
  await p.evaluate(SAMPLER); await p.click('[data-a="liveSpeed"][data-v="1"]');
  await p.waitForTimeout(+process.env.PL_3MS||22000); S=await take(p); L=layout(S);
  let a3=0, dx=0, inBody=0; for(const s of S){ for(const t of s.tags){ if(t.role!=='car'||!t.e3||t.e3[3]>=1) continue; a3++; const d=Math.abs(t.an[0]-t.e3[0]); dx=Math.max(dx,d); const h=t.e3[2]-t.e3[1]; if(t.an[1]>=t.e3[1]-Math.max(6,h*0.25)&&t.an[1]<=t.e3[1]+h*0.25) inBody++; } }
  const head3=S=>{ let n=0, mx=0; for(const s of S) for(const t of s.tags){ if(t.role!=='car'||!t.h3||!(t.h3[2]<1)) continue; n++; mx=Math.max(mx,Math.hypot(t.an[0]-t.h3[0],t.an[1]-t.h3[1])); } return {n,mx}; };
  const hd3=head3(S);
  console.log('  3-D broadcast',JSON.stringify({frames:S.length,anchors:a3,dxMax:f2(dx),headY:inBody,head:{n:hd3.n,max:f2(hd3.mx)},layout:{n:L.n,out:L.out,over:L.over,block:L.block}}));
  ok(hd3.n>=5&&hd3.mx<=3,'3-D: the carrier anchor is within 3 px of the head top the figures module solved this frame, projected through the painter camera ('+hd3.n+' frames, max '+f2(hd3.mx)+' px)');
  ok(a3>=5,'3-D: carrier anchors sampled ('+a3+')');
  ok(dx<=40,'3-D: the anchor is within 40 px horizontally of the projected figure (max '+f2(dx)+' px)');
  ok(a3&&inBody/a3>=0.95,'3-D: the anchor sits at the projected head height ('+inBody+'/'+a3+')');
  ok(L.n>=5&&!L.out&&!L.over&&!L.block,'3-D broadcast: layout rules hold '+JSON.stringify(L.bad));
  const c3=await p.evaluate(()=>{ const f=App.live.stage._pl.perf; const r=[...f.ring.slice(0,Math.min(600,f.n))].sort((a,b)=>a-b); return {mean:+(f.sum/f.n).toFixed(4),median:+r[r.length>>1].toFixed(4),max:+f.max.toFixed(2),n:f.n}; }); console.log('  3-D cost (ms)',JSON.stringify(c3));
  ok(c3.median<0.5,'3-D: the plates cost '+c3.median+' ms per frame (median; software GL)');
  if(SHOTS) await shot(p,'d-3d-broadcast.png',true);
  await p.evaluate(()=>A.liveView({dataset:{v:'sideline'}})); await until(p,()=>!!App.live.stage._p3d._slOn,8000); await p.waitForTimeout(800); await take(p);
  await p.waitForTimeout(+process.env.PL_3MS||16000); S=await take(p); L=layout(S); const sl=S.filter(s=>s.drawn).length;
  ok(sl>=4&&L.n>=4&&!L.out&&!L.over&&!L.block,'3-D sideline: tags drawn ('+sl+' frames), layout rules hold '+JSON.stringify({n:L.n,bad:L.bad}));
  { const h=head3(S); ok(h.n>=3&&h.mx<=3,'3-D sideline: the carrier anchor is within 3 px of the solved head top ('+h.n+' frames, max '+f2(h.mx)+' px)'); }
  if(SHOTS) await shot(p,'d-3d-sideline.png',true);
  await p.close();

  ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  console.log((fails?'FAILED '+fails:'ALL PASS')+' in '+Math.round((Date.now()-t0)/1000)+' s'); await b.close(); process.exit(fails?1:0);

  /* screenshots: pause until a carrier tag is fully up, then shoot */
  async function shot(pg,file,gl){ await until(pg,()=>{ const st=App.live.stage, S=st._pl; return !!(S&&[...S.slots.values()].some(s=>s.role==='car'&&s.a>=0.99&&s.on)); },gl?30000:15000);
    await pg.evaluate(()=>{ App.live.stage.paused=true; }); await pg.waitForTimeout(gl?2600:700); await pg.screenshot({path:OUT+file}); await pg.evaluate(()=>{ App.live.stage.paused=false; }); }
})().catch(e=>{ console.error(e); process.exit(1); });
