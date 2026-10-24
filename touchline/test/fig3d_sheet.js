/* v18 3-D figures sheet: renders through the real build (3-D path forced) and saves PNGs to test/shots/v18/figures/.
   node test/fig3d_sheet.js [lineup|lab|live|close|perf|all] [tier A|B|C] [tag]
   close: standing-height (eye 1.8 m) close-ups at 3, 6 and 12 m from front, three-quarter, side and back for idle, run,
   kick, slide tackle, keeper dive and keeper punt (lab scene 'punt'), one contact sheet per distance and pose set, saved
   to test/shots/v184/figures/<tag>/ (tag defaults to 'now'). perf: the 27-figure live frame at tiers A/B/C, broadcast and
   sideline-height views, renderer.info and the median synchronous render time (render + 1-pixel readPixels).
   (a) line-up of 12 varied figures (10 extras with patterned kits and every hair style, the referee, an AR with the flag up)
       at close range, front and back; (b) the animation-lab scenes at deviceScaleFactor 2 in 3-D and 2-D; (c) a
       broadcast-distance live-match frame in 3-D and 2-D. Prints renderer.info (draw calls, triangles) and page errors. */
const { chromium, DIST } = require('./_pw'); const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'shots/v18/figures')+'/'; fs.mkdirSync(OUT,{recursive:true});
const what=process.argv[2]||'all', tier=process.argv[3]||'A', tag=process.argv[4]||'now';
const OUT2=path.resolve(__dirname,'shots/v184/figures/'+tag)+'/'; if(what==='close'||what==='perf') fs.mkdirSync(OUT2,{recursive:true});
const errs=[]; const watch=p=>{ p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'||(/v18/.test(m.text())&&m.type()==='warning')) errs.push('console: '+m.text().slice(0,400)); }); };
const info=async p=>p.evaluate(()=>{ const s=App.labSt||window.__st; const P=s&&s._p3d; if(!P) return null; const r=P.renderer.info.render; const F=P._fig; return {calls:r.calls,tris:r.triangles,parts:F?F.parts.filter(q=>q.n).map(q=>q.name+':'+q.n).join(' '):''}; });

async function lineup(b){ const p=await b.newPage({viewport:{width:1400,height:760},deviceScaleFactor:1}); watch(p);
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  await p.evaluate(tier=>{ PREFS.renderer='3d'; PREFS.rtier=tier;
    const hairs=['afro','mohawk','long','bun','locs','spiky','sideswept','curly','braids','mullet','buzz','fade','twists','crop','bald'];
    const pats=[['stripes','#c8102e','#ffffff'],['hoops','#0b3d91','#f2c230'],['halves','#111827','#16a34a'],['sash','#ffffff','#dc2626'],['chevron','#7e22ce','#facc15'],['quarters','#0e7490','#f8fafc'],['checker','#b91c1c','#111111'],['panels','#f97316','#1f2937'],['pinstripe','#1e3a8a','#93c5fd']];
    const sl=['cuffs','plain','raglan','stripe','cuffs','plain','raglan','cuffs','stripe'], co=['crew','v','polo','wrap','v','crew','polo','v','wrap'], sp=['top','hoops','stripes','plain','top','hoops','top','stripes','plain'], shp=['stripe','plain','panel','stripe','plain','panel','stripe','plain','panel'], ns=['solid','outline','shadow','solid','outline','solid','shadow','outline','solid'];
    const kits=pats.map(([pat,a,c],i)=>kitFinish({shirt:a,pc:c,trim:c,shorts:i%2?a:'#111111',socks:a,num:contrastOn(a),pat,sleeve:sl[i],collar:co[i],sockPat:sp[i],shortsPat:shp[i],numStyle:ns[i]}));
    const gkk=kitFinish({shirt:'#22c3e6',pc:'#22c3e6',trim:'#111',shorts:'#1b1b1b',num:'#111',socks:'#22c3e6',pat:'plain',sleeve:'long',collar:'crew',sockPat:'plain',shortsPat:'plain',numStyle:'solid'});
    const facial=['none','stubble','goatee','mustache','chinstrap','none','stubble','none','none','none'], mouths=['smile','grin','neutral','smirk','serious','smile','grin','neutral','smile','serious'];
    window.__mk=(set,back)=>{ const X=[]; for(let i=0;i<10;i++){ const L=defaultLook('lu'+i+set,12); L.hair=hairs[(i+set*10)%15]; L.skin=[1,9,4,11,2,6,0,8,3,10][i]; L.facial=facial[i]; L.mouth=mouths[i]; L.band=i===3?3:i===7?1:0; L.tape=i%3===0; L.boots=i%8; L.build=['lean','average','stocky'][i%3]; L.sleeves=i===5?'long':'short';
      const o={x:47+i*1.05,y:62.5+(i%2)*0.35,yaw:back?-Math.PI/2+(i-5)*0.06:Math.PI/2-0.35+(i-5)*0.05,look:L,hgt:66+(i*3)%10,num:[7,10,23,4,9,11,1,18,5,99][i],face:1,ph:0,spd:0,seed:i,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:i===6,v187cNm:['TURNER','NIELSEN','OKAFOR','GARCIA-LOPEZ','KIM','D. SANTOS','MBAPPA','O\'BRIEN','LI','VAN DER BERG'][i],v187cCap:i===3};
      X.push({o,kit:i===6?gkk:kits[i%9],isRef:false}); } return X; };
    window.__extras=__mk(0,false);
    P3D_MODULES.push({name:'sheet-extra',order:25,frame(P){ for(const e of window.__extras||[]) P.extra.push(e); }});
    P3D_MODULES.push({name:'sheet-cam',order:27,frame(P){ const c=window.__cam; if(!c) return; P.camera.fov=c.fov; P.camera.updateProjectionMatrix(); P.camera.position.set(...c.pos); P.camera.lookAt(...c.look); P.camera.updateMatrixWorld(); }});
    setTimeout(()=>labRun('run'),0); },tier);
  await p.waitForTimeout(2500);
  await p.evaluate(()=>{ const st=App.labSt; st.paused=true; for(const q of st.players.values()){ q.off=true; q.ov=null; q.x=-60; q.y=-20; }
    const r=st.ref; Object.assign(r,{x:58.0,y:62.7,yaw:Math.PI/2-0.3,spd:0,vx:0,vy:0,card:{c:'#f5c518',t:st.now-200}}); const a=st.ars[0]; Object.assign(a,{x:59.1,y:62.9,yaw:Math.PI/2-0.3,spd:0,vx:0,vy:0,flag:'up'}); st.ars[1].x=-50;
    st.cam.x=52.5; window.__cam={fov:24,pos:[52.6,2.4,75],look:[52.6,1.0,62.8]}; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'lineup-front.png'}); console.log('lineup front', JSON.stringify(await info(p)));
  await p.evaluate(()=>{ window.__extras=__mk(1,true); const st=App.labSt; st.ref.yaw=-Math.PI/2; st.ars[0].yaw=-Math.PI/2; st.ars[0].flag='point'; st.ars[0].pointDir=1; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'lineup-back.png'});
  await p.evaluate(()=>{ window.__extras=__mk(0,false); window.__cam={fov:9,pos:[50.5,1.9,72],look:[50.2,1.35,62.8]}; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'lineup-close.png'});
  /* poses: celebrations (heart prop, open mouth), whole-body roll (dive, airplane) and pitch (fall, backflip), slide, header, strike */
  await p.evaluate(()=>{ const st=App.labSt, n=st.now; const X=__mk(0,false).slice(0,10); const set=[{celeb:true,celebType:'heart',celebT:n-600},{celeb:true,celebType:'kneeslide',celebT:n-400},{celeb:true,celebType:'airplane',celebT:n-400,spd:0},{celeb:true,celebType:'backflip',celebT:n-560},{fallT:n-500},{slideT:n-200},{gk:true,dive:{t:n-200,dir:1}},{jumpT:n-250},{kickT:n-205,kickW:200,kickF:340,kickK:'shot'},{celeb:true,celebType:'classic',celebT:n-300}];
    X.forEach((e,i)=>{ Object.assign(e.o,set[i],{x:47.4+i*1.15,yaw:i===6?0:Math.PI/2-0.5}); if(i===6) e.kit=X[6].kit; e.o._pose=null; }); window.__extras=X; st.ref.x=-50; st.ars[0].x=-50; window.__cam={fov:22,pos:[52.6,2.6,75],look:[52.6,0.9,62.8]}; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'poses.png'});
  await p.evaluate(()=>{ window.__cam={fov:30,pos:[53,14,94],look:[53,0.5,60]}; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'lineup-far.png'}); console.log('lineup far', JSON.stringify(await info(p)));
  await p.close(); }

async function lab(b){ const p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); watch(p);
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  const box=await p.evaluate(()=>{ const r=document.querySelector('#anim-lab .lab-cv').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
  /* 3-D: a telephoto from the gantry on the ball (the camera module is not part of this branch) */
  await p.evaluate(()=>{ P3D_MODULES.push({name:'sheet-labcam',order:5,frame(P,st){ const b=st.ball; const fx=st.focus&&st.focus.x!=null?st.focus.x:b.x, fy=st.focus&&st.focus.y!=null?st.focus.y:b.y; P.camera.fov=22; P.camera.updateProjectionMatrix(); P.camera.position.set(fx,6,fy+16); P.camera.lookAt(fx,0.8,fy); }}); });
  /* each scene runs on the 2-D path in real time, is paused at the moment, shot in 2-D, then the same paused moment is shot in 3-D */
  for(const [sc,ts] of [['run',[2600]],['keeper',[3600,4400]],['header',[3800,4600]],['tackle',[2600,3400]],['pens',[3800,4800]]]){
    for(let k=0;k<ts.length;k++){ await p.evaluate(([s,t])=>{ PREFS.renderer='2d'; PREFS.rtier=t; setTimeout(()=>labRun(s),0); },[sc,tier]); await p.waitForTimeout(ts[k]);
      await p.evaluate(()=>{ App.labSt.paused=true; }); await p.waitForTimeout(150); await p.screenshot({path:OUT+`lab-${sc}-${k}-2d.png`,clip:box});
      await p.evaluate(()=>{ PREFS.renderer='3d'; const st=App.labSt; st._p3d=undefined; st._v18off=false; }); await p.waitForTimeout(2600); await p.screenshot({path:OUT+`lab-${sc}-${k}-3d.png`,clip:box}); console.log('lab',sc,k,JSON.stringify(await info(p))); } }
  await p.close(); }

async function live(b){ for(const mode of ['3d','2d']){ const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}); watch(p);
  await p.goto(DIST); await p.waitForTimeout(500);
  await p.evaluate(([m,t])=>{ PREFS.renderer=m; PREFS.rtier=t; const d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); c.id='lv-canvas'; c.style.cssText='width:100%;height:100%;display:block'; d.appendChild(c); document.body.appendChild(d);
    const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid+'k',11),h:66+(i*5)%9}; return {pid,role,x,y}; }),off:{}});
    if(m==='3d') P3D_MODULES.push({name:'sheet-livecam',order:5,frame(P,st){ const x=st.cam.x; P.camera.fov=28; P.camera.updateProjectionMatrix(); P.camera.position.set(x,21,68+33); P.camera.lookAt(x,0,30); }});
    const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid],weather:{k:'clear',night:false}}); window.__st=st; st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap();
    (async()=>{ await st.tapOff(); const sc=st.pl('f09'); await st.gain(sc); })(); },[mode,tier]);
  await p.waitForTimeout(mode==='3d'?6000:3000); await p.screenshot({path:OUT+`live-${mode}.png`}); if(mode==='3d') console.log('live', JSON.stringify(await info(p)));
  if(mode==='3d'){ /* measurement: every figure in view (22 players, referee, 2 ARs) plus 2 coaches pushed to P.extra = 27 */
    await p.evaluate(()=>{ const st=window.__st; st.paused=true; const ck=kitFinish({shirt:'#1f2937',pc:'#1f2937',trim:'#ffffff',shorts:'#1f2937',socks:'#1f2937',num:'#ffffff',pat:'plain',sleeve:'long',collar:'polo',sockPat:'plain',shortsPat:'plain',numStyle:'solid'});
      const co=[0,1].map(i=>({x:i?60:45,y:-1,yaw:Math.PI/2,face:1,ph:0,spd:0,seed:i,hgt:72,look:defaultLook('coach'+i,10),num:'',kickT:-9e9,trip:-9e9,jumpT:-9e9}));
      P3D_MODULES.length; const P=st._p3d; P.mods.push({name:'sheet-coach',order:25,frame(P){ for(const o of co) P.extra.push({o,kit:ck,isRef:false}); }}); P.mods.sort((a,b)=>(a.order||50)-(b.order||50));
      const cm=P.mods.find(m=>m.name==='sheet-livecam'); cm.frame=(P)=>{ P.camera.fov=40; P.camera.updateProjectionMatrix(); P.camera.position.set(52.5,48,68+62); P.camera.lookAt(52.5,0,30); }; });
    await p.waitForTimeout(3000); await p.screenshot({path:OUT+'live-all27.png'}); console.log('27 figures', JSON.stringify(await info(p)), await p.evaluate(()=>window.__st._p3d._fig.byName.torso.n+' torsos'));
    for(const t of ['B','C']){ await p.evaluate(t=>{ PREFS.rtier=t; const st=window.__st; const P=st._p3d; const cm=P.mods.find(m=>m.name==='sheet-livecam'), cc=P.mods.find(m=>m.name==='sheet-coach'); window.__keep=[cm,cc]; P.dispose(); st._p3d=undefined; P3D_MODULES.push(cm,cc); },t);
      await p.waitForTimeout(3500); console.log('27 figures tier '+t, JSON.stringify(await info(p))); await p.evaluate(()=>{ for(const m of window.__keep){ const i=P3D_MODULES.indexOf(m); if(i>=0) P3D_MODULES.splice(i,1); } }); } }
  await p.close(); } }

/* ---------- close-ups from standing height ---------- */
const SHEET_JS=()=>{ /* in-page helpers: render the painter synchronously and copy the GL canvas into a grid cell */
  window.__grid=(cols,rows,cw,ch)=>{ const c=document.createElement('canvas'); c.width=cols*cw; c.height=rows*ch; const g=c.getContext('2d'); g.fillStyle='#202428'; g.fillRect(0,0,c.width,c.height); window.__G={c,g,cw,ch}; };
  window.__shot=(col,row,label)=>{ const st=App.labSt||window.__st, P=st._p3d; P.render(); const gl=P.renderer.domElement, G=window.__G; const sw=gl.width, sh=gl.height, k=Math.max(G.cw/sw,G.ch/sh);
    const w=G.cw/k, h=G.ch/k; G.g.drawImage(gl,(sw-w)/2,(sh-h)/2,w,h,col*G.cw,row*G.ch,G.cw,G.ch); G.g.font='13px monospace'; G.g.fillStyle='rgba(0,0,0,.55)'; G.g.fillRect(col*G.cw,row*G.ch,G.g.measureText(label).width+14,20); G.g.fillStyle='#fff'; G.g.fillText(label,col*G.cw+7,row*G.ch+14); };
  /* camera at eye height 1.8 m, d metres from (x,y) at angle a (radians, stage plane), looking at hy */
  window.__eye=(x,y,a,d,hy,fov)=>{ window.__cam={fov:fov||40,pos:[x+Math.cos(a)*d,1.8,y+Math.sin(a)*d],look:[x,hy==null?0.95:hy,y]}; }; };
async function close(b){ const p=await b.newPage({viewport:{width:1000,height:760},deviceScaleFactor:1}); watch(p);
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  await p.evaluate(SHEET_JS);
  await p.evaluate(tier=>{ PREFS.renderer='3d'; PREFS.rtier=tier; window.__extras=[];
    P3D_MODULES.push({name:'sheet-extra',order:25,frame(P){ for(const e of window.__extras||[]) P.extra.push(e); }});
    P3D_MODULES.push({name:'sheet-cam',order:27,frame(P){ const c=window.__cam; if(!c) return; P.camera.fov=c.fov; P.camera.updateProjectionMatrix(); P.camera.position.set(...c.pos); P.camera.lookAt(...c.look); P.camera.updateMatrixWorld(); }});
    setTimeout(()=>labRun('run'),0); },tier);
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{ const st=App.labSt; st.paused=true; for(const q of st.players.values()){ q.off=true; q.ov=null; q.x=-60; q.y=-20; } st.ref.x=-50; for(const a of st.ars) a.x=-50; st.ball.x=-40; st.ball.y=-20; });
  await p.waitForTimeout(800);
  /* synthetic poses on one figure at the centre spot; yaw 0.3 so the light falls across him */
  const poses=['idle','run','kick','slide','dive'];
  for(const d of (process.env.QUICK?[3]:[3,6,12])){
    await p.evaluate(([d,poses])=>{ const st=App.labSt; const n=st.now; __grid(4,poses.length,440,330);
      const kitA=kitFinish({shirt:'#c8102e',pc:'#ffffff',trim:'#ffffff',shorts:'#ffffff',socks:'#c8102e',num:'#ffffff',pat:'stripes',sleeve:'cuffs',collar:'crew',sockPat:'top',shortsPat:'stripe',numStyle:'solid'});
      const gkk=kitFinish({shirt:'#22c3e6',pc:'#22c3e6',trim:'#111',shorts:'#1b1b1b',num:'#111',socks:'#22c3e6',pat:'plain',sleeve:'long',collar:'crew',sockPat:'plain',shortsPat:'plain',numStyle:'solid'});
      const L=defaultLook('close7',12); L.hair='crop'; L.skin=4; L.boots=2; L.build='average'; L.sleeves='short';
      const LG=defaultLook('closegk',12); LG.hair='buzz'; LG.skin=9;
      const set={idle:{},run:{spd:6.5,ph:1.1,gv:6.5},kick:{kickT:n-205,kickW:200,kickF:340,kickK:'shot'},slide:{v18slT:n-230,v18slD:520,spd:4,seed:1},dive:{gk:true,dive:{t:n-260,dir:1}}};
      const yaw=0.3; const ang=[['front',0],['3/4',Math.PI/4],['side',Math.PI/2],['back',Math.PI]];
      poses.forEach((ps,r)=>{ const gk=ps==='dive'; const o=Object.assign({x:52.5,y:34,yaw,look:gk?LG:L,hgt:70,num:gk?1:7,face:1,ph:0,spd:0,seed:2,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk,_pose:null,v187cNm:gk?'OKAFOR':'MORALES',v187cCap:!gk},set[ps]);
        window.__extras=[{o,kit:gk?gkk:kitA,isRef:false}];
        ang.forEach(([nm,a],c)=>{ const hy=ps==='slide'||ps==='dive'?0.5:0.95; __eye(52.5,34,yaw+a,d,hy,40); o._pose=null; __shot(c,r,`${ps} ${nm} ${d}m`); }); });
      /* native-resolution detail cells at 3 m (no downscale) */
      if(d===3){ window.__D=[]; const det=[['idle',0],['idle',Math.PI/4],['run',Math.PI/2],['kick',Math.PI/4],['idle',Math.PI],['slide',Math.PI/4]];
        const G0=window.__G; __grid(3,2,500,760); det.forEach(([ps,a],i)=>{ const gk=false; const o=Object.assign({x:52.5,y:34,yaw,look:L,hgt:70,num:7,face:1,ph:0,spd:0,seed:2,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk,_pose:null,v187cNm:'MORALES',v187cCap:true},set[ps]);
          window.__extras=[{o,kit:kitA,isRef:false}]; __eye(52.5,34,yaw+a,3,ps==='slide'?0.5:0.95,40); __shot(i%3,Math.floor(i/3),`${ps} ${a.toFixed(2)} 3m native`); }); window.__D=window.__G; window.__G=G0; } },[d,poses]);
    const url=await p.evaluate(()=>window.__G.c.toDataURL('image/png')); fs.writeFileSync(OUT2+`close-${d}m.png`,Buffer.from(url.split(',')[1],'base64')); console.log('close',d,'m saved', JSON.stringify(await info(p)));
    if(d===3){ const u2=await p.evaluate(()=>window.__D.c.toDataURL('image/png')); fs.writeFileSync(OUT2+'close-3m-native.png',Buffer.from(u2.split(',')[1],'base64')); } }
  if(process.env.QUICK){ await p.close(); return; }
  /* keeper punt from the lab scene: wait for the punt pose, then close-ups around the keeper */
  await p.evaluate(()=>{ window.__extras=[]; window.__cam=null; App.labSt.paused=false; setTimeout(()=>labRun('punt'),0); });
  let gk=null; for(let k=0;k<160&&!gk;k++){ await p.waitForTimeout(150); gk=await p.evaluate(()=>{ const st=App.labSt; if(!st||!st.players) return null; for(const q of st.players.values()){ if(!q.gk) continue; try{ const P=st.poseOf(q,false); if(P&&P.act==='punt') return q.pid; }catch(e){} } return null; }); }
  if(gk){ await p.waitForTimeout(450); await p.evaluate(gk=>{ const st=App.labSt; st.paused=true; const q=st.pl(gk); __grid(4,3,440,330);
      const yaw=st.yawOf?st.yawOf(q):(q.yaw||0); [3,6,12].forEach((d,r)=>[['front',0],['3/4',Math.PI/4],['side',Math.PI/2],['back',Math.PI]].forEach(([nm,a],c)=>{ __eye(q.x,q.y,yaw+a,d,0.9,40); __shot(c,r,`punt ${nm} ${d}m`); })); },gk);
    const url=await p.evaluate(()=>window.__G.c.toDataURL('image/png')); fs.writeFileSync(OUT2+'close-punt.png',Buffer.from(url.split(',')[1],'base64')); console.log('punt saved'); } else console.log('punt pose not reached');
  await p.close(); }

/* ---------- perf + wide frames: 27 figures, broadcast and sideline-height ---------- */
async function perf(b){ const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}); watch(p);
  await p.goto(process.env.DISTF?'file://'+process.env.DISTF:DIST); await p.waitForTimeout(500); await p.evaluate(SHEET_JS);
  const out={};
  for(const t of (process.env.TIERS||'ABC').split('')){
    await p.evaluate(t=>{ if(window.__st){ window.__st.destroy(); document.getElementById('lv-host').remove(); }
      PREFS.renderer='3d'; PREFS.rtier=t; const d=document.createElement('div'); d.id='lv-host'; d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); c.id='lv-canvas'; c.style.cssText='width:100%;height:100%;display:block'; d.appendChild(c); document.body.appendChild(d);
      const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid+'k',11),h:66+(i*5)%9}; return {pid,role,x,y}; }),off:{}});
      if(!window.__pm){ window.__pm=1; const ck=kitFinish({shirt:'#1f2937',pc:'#1f2937',trim:'#ffffff',shorts:'#1f2937',socks:'#1f2937',num:'#ffffff',pat:'plain',sleeve:'long',collar:'polo',sockPat:'plain',shortsPat:'plain',numStyle:'solid'});
        const co=[0,1].map(i=>({x:i?60:45,y:-1,yaw:Math.PI/2,face:1,ph:0,spd:0,seed:i,hgt:72,look:defaultLook('coach'+i,10),num:'',kickT:-9e9,trip:-9e9,jumpT:-9e9}));
        P3D_MODULES.push({name:'sheet-coach',order:25,frame(P){ for(const o of co) P.extra.push({o,kit:ck,isRef:false}); }});
        P3D_MODULES.push({name:'sheet-cam',order:27,frame(P){ const c=window.__cam; if(!c) return; P.camera.fov=c.fov; P.camera.updateProjectionMatrix(); P.camera.position.set(...c.pos); P.camera.lookAt(...c.look); P.camera.updateMatrixWorld(); }}); }
      window.__cam={fov:40,pos:[52.5,48,68+62],look:[52.5,0,30]};
      const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid],weather:{k:'clear',night:false}}); window.__st=st; st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap();
      (async()=>{ await st.tapOff(); const sc=st.pl('f09'); await st.gain(sc); })(); },t);
    await p.waitForTimeout(5000);
    const r=await p.evaluate(()=>{ const st=window.__st; st.paused=true; const P=st._p3d; const gl=P.renderer.getContext(); const px=new Uint8Array(4); const ms=[];
      const one=()=>{ const t0=performance.now(); P.render(); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); return performance.now()-t0; };
      one(); one(); for(let k=0;k<9;k++) ms.push(one()); ms.sort((a,b)=>a-b); const inf=P.renderer.info.render;
      const fm=P.mods.find(m=>m.name==='figures'); const fs=[]; for(let k=0;k<30;k++){ const t0=performance.now(); fm.frame(P,st); fs.push(performance.now()-t0); } fs.sort((a,b)=>a-b);
      return {calls:inf.calls,tris:inf.triangles,ms:+ms[4].toFixed(1),figMs:+fs[15].toFixed(2),torsos:P._fig.byName.torso.n}; });
    out[t]=r; console.log('perf tier',t,JSON.stringify(r));
    if(t==='A'){ await p.evaluate(()=>{ __grid(1,1,1280,720); __shot(0,0,'broadcast 27 figures'); }); let url=await p.evaluate(()=>window.__G.c.toDataURL('image/png')); fs.writeFileSync(OUT2+'wide-broadcast.png',Buffer.from(url.split(',')[1],'base64'));
      await p.evaluate(()=>{ const st=window.__st; const b=st.ball; window.__cam={fov:42,pos:[b.x-4,1.85,70.5],look:[b.x+2,1.0,b.y]}; __grid(1,1,1280,720); __shot(0,0,'sideline eye 1.85 m'); }); url=await p.evaluate(()=>window.__G.c.toDataURL('image/png')); fs.writeFileSync(OUT2+'wide-sideline.png',Buffer.from(url.split(',')[1],'base64'));
      await p.evaluate(()=>{ window.__cam={fov:40,pos:[52.5,48,68+62],look:[52.5,0,30]}; }); } }
  fs.writeFileSync(OUT2+'perf.json',JSON.stringify(out,null,1)); await p.close(); }

(async()=>{ const b=await chromium.launch(); try{
  if(what==='lineup'||what==='all') await lineup(b);
  if(what==='lab'||what==='all') await lab(b);
  if(what==='live'||what==='all') await live(b);
  if(what==='close') await close(b);
  if(what==='perf') await perf(b);
} finally { console.log(errs.length?'ERRORS\n'+errs.slice(0,20).join('\n'):'ERRORS none'); await b.close(); } process.exit(errs.length?1:0); })();
