/* v18 director screenshots (3-D forced): lab scenes at deviceScaleFactor 2, a live goal and its replay at 1440x900, phone.
   node test/shots_v18_director.js [lab|live|phone]... -> test/shots/v18/director/ (git-ignored) */
const { chromium, DIST } = require('./_pw'); const OUT=require('path').resolve(__dirname,'shots/v18/director')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
const want=process.argv.slice(2); const on=k=>!want.length||want.includes(k);
/* this branch has no pitch/figure modules (built in parallel): a stand-in module draws pitch lines, goals and capsule players so the
   camera framing can be judged; it steps aside when real modules are registered */
const STUB=()=>{ if(P3D_MODULES.some(m=>/pitch|stadium|figure|player/i.test(m.name))) return; P3D_MODULES.push({name:'stub',order:30,
  init(P){ const T=P.T; const S=P.stub={figs:new Map()}; const line=(x0,z0,x1,z1)=>{ const g=new T.PlaneGeometry(Math.hypot(x1-x0,z1-z0)||0.12,0.12); const m=new T.Mesh(g,new T.MeshBasicMaterial({color:'#e8f2ea'})); m.rotation.x=-Math.PI/2; m.rotation.z=-Math.atan2(z1-z0,x1-x0); m.position.set((x0+x1)/2,0.005,(z0+z1)/2); P.scene.add(m); };
    line(0,0,105,0); line(0,68,105,68); line(0,0,0,68); line(105,0,105,68); line(52.5,0,52.5,68); for(const g of [0,105]){ const d=g?-1:1; line(g,13.84,g+d*16.5,13.84); line(g,54.16,g+d*16.5,54.16); line(g+d*16.5,13.84,g+d*16.5,54.16); line(g,24.84,g+d*5.5,24.84); line(g,43.16,g+d*5.5,43.16); line(g+d*5.5,24.84,g+d*5.5,43.16);
      const pm=new T.MeshStandardMaterial({color:'#ffffff'}); for(const y of [30.34,37.66]){ const c=new T.Mesh(new T.CylinderGeometry(0.06,0.06,2.44),pm); c.position.set(g,1.22,y); c.castShadow=true; P.scene.add(c); } const bar=new T.Mesh(new T.CylinderGeometry(0.06,0.06,7.32),pm); bar.rotation.x=Math.PI/2; bar.position.set(g,2.44,34); P.scene.add(bar);
      const net=new T.Mesh(new T.BoxGeometry(2,2.44,7.32),new T.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:0.25})); net.position.set(g-d*1,1.22,34); P.scene.add(net); }
    for(let x=0;x<105;x+=10.5){ const s=new T.Mesh(new T.PlaneGeometry(5.25,68),new T.MeshLambertMaterial({color:'#2a7a3e'})); s.rotation.x=-Math.PI/2; s.position.set(x+2.6,0.002,34); s.receiveShadow=true; P.scene.add(s); }
    S.geo=new T.CapsuleGeometry(0.26,1.15,4,10); },
  frame(P,st){ const S=P.stub, T=P.T; const all=[...st.players.values(),st.ref,...(st.ars||[])]; for(const p of all){ let m=S.figs.get(p); if(!m){ const k=p.ref?'#222':p.gk?(p.side?'#f0c020':'#30c0f0'):(p.side?(st.kits.team[1].shirt):(st.kits.team[0].shirt)); m=new T.Mesh(S.geo,new T.MeshStandardMaterial({color:k,roughness:0.6})); m.castShadow=true; S.figs.set(p,m); P.scene.add(m); }
    m.visible=!p.off; m.position.set(p.x,0.84+(p.dive&&st.now>p.dive.t?-0.5:0),p.y); m.rotation.z=p.dive&&st.now>p.dive.t?1.2*(p.dive.dir||1):0; } } }); };
async function lab(b){ const p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900); await p.evaluate(STUB); await p.evaluate(()=>{ PREFS.renderer='3d'; });
  for(const sc of (process.env.SCENES||'pens,header,corner').split(',')){ await p.evaluate(s=>{ setTimeout(()=>labRun(s),0); },sc);
    for(let i=0;i<5;i++){ await p.waitForTimeout(+(process.env.GAP||3500)); const cam=await p.evaluate(()=>{ const P=App.labSt&&App.labSt._p3d; return P&&P.dir?P.dir.mode:'-'; }); await p.screenshot({path:OUT+`lab-${sc}-${i}.png`}); console.log(sc,i,cam); } }
  console.log('lab errors',errs); await p.close(); }
async function live(b,vp,tag){ const p=await b.newPage({viewport:vp,deviceScaleFactor:1}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.evaluate(()=>{ PREFS.renderer='3d'; const C=newCareer({sid:SCHOOLS[0].id,coach:'Test',diff:'normal'}); App.C=C; save&&save(); });
  console.log('started'); await p.close(); }
(async()=>{ const b=await chromium.launch(); if(on('lab')) await lab(b); await b.close(); })();
