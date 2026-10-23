/* v18 3-D figures sheet: renders through the real build (3-D path forced) and saves PNGs to test/shots/v18/figures/.
   node test/fig3d_sheet.js [lineup|lab|live|all] [tier A|B|C]
   (a) line-up of 12 varied figures (10 extras with patterned kits and every hair style, the referee, an AR with the flag up)
       at close range, front and back; (b) the animation-lab scenes at deviceScaleFactor 2 in 3-D and 2-D; (c) a
       broadcast-distance live-match frame in 3-D and 2-D. Prints renderer.info (draw calls, triangles) and page errors. */
const { chromium, DIST } = require('./_pw'); const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'shots/v18/figures')+'/'; fs.mkdirSync(OUT,{recursive:true});
const what=process.argv[2]||'all', tier=process.argv[3]||'A';
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
      const o={x:47+i*1.05,y:62.5+(i%2)*0.35,yaw:back?-Math.PI/2+(i-5)*0.06:Math.PI/2-0.35+(i-5)*0.05,look:L,hgt:66+(i*3)%10,num:[7,10,23,4,9,11,1,18,5,99][i],face:1,ph:0,spd:0,seed:i,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:i===6};
      X.push({o,kit:i===6?gkk:kits[i%9],isRef:false}); } return X; };
    window.__extras=__mk(0,false);
    P3D_MODULES.push({name:'sheet-extra',order:25,frame(P){ for(const e of window.__extras||[]) P.extra.push(e); }});
    P3D_MODULES.push({name:'sheet-cam',order:5,frame(P){ const c=window.__cam; if(!c) return; P.camera.fov=c.fov; P.camera.updateProjectionMatrix(); P.camera.position.set(...c.pos); P.camera.lookAt(...c.look); }});
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
  await p.evaluate(()=>{ window.__cam={fov:30,pos:[53,14,94],look:[53,0.5,60]}; });
  await p.waitForTimeout(2500); await p.screenshot({path:OUT+'lineup-far.png'}); console.log('lineup far', JSON.stringify(await info(p)));
  await p.close(); }

async function lab(b){ const p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); watch(p);
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900);
  const box=await p.evaluate(()=>{ const r=document.querySelector('#anim-lab .lab-cv').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; });
  /* 3-D: a telephoto from the gantry on the ball (the camera module is not part of this branch) */
  await p.evaluate(()=>{ P3D_MODULES.push({name:'sheet-labcam',order:5,frame(P,st){ const b=st.ball; const fx=st.focus&&st.focus.x!=null?st.focus.x:b.x, fy=st.focus&&st.focus.y!=null?st.focus.y:b.y; P.camera.fov=22; P.camera.updateProjectionMatrix(); P.camera.position.set(fx,7.5,fy+21); P.camera.lookAt(fx,0.7,fy); }}); });
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
    const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid]}); window.__st=st; st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap();
    (async()=>{ await st.tapOff(); const sc=st.pl('f09'); await st.gain(sc); })(); },[mode,tier]);
  await p.waitForTimeout(mode==='3d'?6000:3000); await p.screenshot({path:OUT+`live-${mode}.png`}); if(mode==='3d') console.log('live', JSON.stringify(await info(p)));
  await p.close(); } }

(async()=>{ const b=await chromium.launch(); try{
  if(what==='lineup'||what==='all') await lineup(b);
  if(what==='lab'||what==='all') await lab(b);
  if(what==='live'||what==='all') await live(b);
} finally { console.log(errs.length?'ERRORS\n'+errs.slice(0,20).join('\n'):'ERRORS none'); await b.close(); } process.exit(errs.length?1:0); })();
