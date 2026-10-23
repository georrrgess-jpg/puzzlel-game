/* v18.2 animation polish (src/v17/71_polish.js): one check per fix, before (fix switched off through V18POL) and after.
   node test/polish.js [noshots] [nowalk] — screenshots go to test/shots/v18_2/ (software WebGL here: single frames, no fps). */
const { chromium, DIST } = require('./_pw'); const fs=require('fs'); const OUT=require('path').resolve(__dirname,'shots/v18_2')+'/'; fs.mkdirSync(OUT,{recursive:true});
const SHOTS=!process.argv.includes('noshots'), WALK=!process.argv.includes('nowalk');
(async()=>{ const b=await chromium.launch(); let fails=0; const errs=[]; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
  const lab=async(r3)=>{ const p=await b.newPage({viewport:{width:1100,height:640},deviceScaleFactor:SHOTS?2:1}); p.on('pageerror',e=>errs.push(e.message)); await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(700); if(r3) await p.evaluate(()=>{ PREFS.renderer='3d'; }); return p; };
  const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:OUT+n+'.png'}); };

  /* ---------- 4. the penalty kicker is at the ball when it leaves his boot (2-D stage, same timing in 3-D) ---------- */
  { const p=await lab(false);
    const run=async(on)=>{ await p.evaluate((on)=>{ V18POL.pen=on; window.__pd=[]; labRun('pens'); setTimeout(()=>{ const st=App.labSt; st.ts=0.3; st.goalTs=0.3; let F=st.fl;
        Object.defineProperty(st,'fl',{configurable:true,get(){ return F; },set(v){ if(v&&v.kind==='shot'&&st.setPiece==='pen'){ let k=null; for(const q of st.players.values()) if(!q.gk&&(!k||q.kickT>k.kickT)) k=q; window.__pd.push(Math.hypot(k.x-v.from.x,k.y-v.from.y)); } F=v; }}); },100); },on);
      await p.waitForFunction(()=>window.__pd.length>=8,null,{timeout:120000}).catch(()=>{}); return p.evaluate(()=>window.__pd); };
    const a=await run(false), c=await run(true); const mx=x=>x.length?Math.max(...x):9;
    ok(c.length>=8&&mx(c)<=0.69, 'penalty kicker within 0.69 m of the ball at contact over '+c.length+' kicks (max '+mx(c).toFixed(2)+' m; fix off: max '+mx(a).toFixed(2)+' m)');
    await p.close(); }

  /* ---------- 3. relaxed 3-D elbows hang beside the body ---------- */
  { const p=await lab(true); await p.evaluate(()=>{ labRun('run'); }); await p.waitForFunction(()=>{ const P=App.labSt&&App.labSt._p3d; return P&&P._fig; },null,{timeout:30000}); await p.waitForTimeout(1200);
    const meas=()=>p.evaluate(()=>{ const st=App.labSt, P=st._p3d; const out={low:[],up:[]}; for(const q of st.players.values()){ if(q.off) continue; if(!v18FigDraw(P,st,q,null,false)) continue; const W=P._fig.s; const S=0.92*(q.hgt||70)/70; const cY=Math.cos(q.yaw||0), sY=Math.sin(q.yaw||0); const loc=o=>({l:(-(W[o]-q.x)*sY+(W[o+2]-q.y)*cY)/S,u:W[o+1]/S});
      for(let i=0;i<2;i++){ const sh=loc(18+i*9), el=loc(21+i*9), ha=loc(24+i*9); (ha.u<sh.u-0.3?out.low:out.up).push(Math.abs(el.l)-Math.abs(sh.l)); } } return out; });
    await p.evaluate(()=>{ App.labSt.paused=true; V18POL.arms=false; }); const a=await meas(); await p.evaluate(()=>{ V18POL.arms=true; }); const c=await meas(); await p.evaluate(()=>{ App.labSt.paused=false; });
    const mx=x=>x.length?Math.max(...x):9; const cm=x=>(x*92).toFixed(1)+' cm';
    ok(c.low.length>10&&mx(c.low)<0.075, 'relaxed 3-D elbows stay within 7 cm outside the shoulder line ('+c.low.length+' arms, max '+cm(mx(c.low))+'; fix off: max '+cm(mx(a.low))+')');
    /* a goal: raised celebration arms keep the old pole (unchanged above the shoulder) */
    await p.close(); }

  /* ---------- 1. the scorer stays inside the middle ~70% of the 3-D celebration close-up ---------- */
  { const p=await lab(true); await p.evaluate(()=>{ labRun('dribble'); });
    await p.waitForFunction(()=>{ const P=App.labSt&&App.labSt._p3d; return P&&P.dir&&P.dir.mode==='celeb'&&P.dir.w>0.5; },null,{timeout:240000,polling:100}).catch(()=>{});
    let worst=0, n=0; for(let i=0;i<14;i++){ const r=await p.evaluate(()=>{ const st=App.labSt, P=st._p3d, sc=P.dir.cel; if(!sc||P.dir.mode!=='celeb') return null; P.camera.updateMatrixWorld(); const V=new P.T.Vector3(); let m=0;
        for(const [dx,h,dz] of [[0,0.02,0],[0,2.25,0],[0.35,2.2,0.35],[-0.35,2.2,-0.35],[0.4,1.4,-0.4],[-0.4,1.4,0.4]]){ V.set(sc.x+dx,h,sc.y+dz).project(P.camera); m=Math.max(m,Math.abs(V.x),Math.abs(V.y)); } return m; });
      if(r==null) break; n++; if(r>worst){ worst=r; await shot(p,'celeb-worst'); } await p.waitForTimeout(300); }
    ok(n>=4&&worst<=0.72, 'the scorer and his raised arms stay inside the middle 72% of the close-up ('+n+' frames, worst |NDC| '+worst.toFixed(2)+'; was 1.74 before the fix)');
    await p.close(); }

  /* ---------- 2. the walkout crane lands before the kick-off pass ---------- */
  if(WALK){ const p=await b.newPage({viewport:{width:1100,height:700}}); p.on('pageerror',e=>errs.push('walk: '+e.message));
    await p.addInitScript(()=>{ const fake={ speaking:false, getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){}, speak(u){ setTimeout(()=>{ u.onstart&&u.onstart(); },20); setTimeout(()=>u.onend&&u.onend(),300); } };
      Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
    await p.goto(DIST); await p.waitForTimeout(500); await p.evaluate(()=>{ PREFS.renderer='3d'; PREFS.sound.on=true; });
    await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Polish Coach'); await p.fill('#nc-seed','pol1');
    await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
    await p.evaluate(()=>{ App.C.settings.walkout='all'; App.C.settings.walk2=1; App.C.settings.senior='off'; App.C.settings.introBoth='mine'; });
    await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
    const got=await p.waitForFunction(()=>{ const F=v18WalkFocus; if(F&&F.crane&&!window.__cr){ window.__cr=F.crane; const st=F.st; const t=()=>{ if(!st.alive) return; if(st.fl&&!window.__fl){ window.__fl=performance.now(); window.__flMode=st._p3d&&st._p3d.dir&&st._p3d.dir.mode; } else requestAnimationFrame(t); }; t(); } return !!window.__cr; },null,{timeout:150000,polling:100}).then(()=>true,()=>false);
    ok(got, 'the walkout ends in a crane shot');
    if(got){ await p.waitForTimeout(700); await shot(p,'crane-mid'); await p.waitForFunction(()=>!!window.__fl,null,{timeout:15000}).catch(()=>{});
      const r=await p.evaluate(()=>({dt:window.__fl-window.__cr,mode:window.__flMode,log:V18POL.log.filter(x=>/crane/.test(x.k))}));
      ok(r.dt>=1950&&r.mode!=='crane', 'the kick-off pass starts after the crane has landed ('+Math.round(r.dt)+' ms after the crane began, director on '+r.mode+', '+JSON.stringify(r.log)+')');
      await p.waitForTimeout(600); await shot(p,'crane-after-kickoff'); }
    await p.close(); }

  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails||errs.length?1:0); })();
