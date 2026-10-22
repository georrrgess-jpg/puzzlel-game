const { chromium, DIST } = require('../_pw');
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), dpr=+(process.argv[4]||1);
(async()=>{
  const browser=await chromium.launch(); const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:dpr});
  await page.goto(DIST); await page.waitForTimeout(500);
  const gl=await page.evaluate(()=>{ const c=document.createElement('canvas'); return {webgl2:!!c.getContext('webgl2'), webgl:!!c.getContext('webgl'), dpr:devicePixelRatio}; }); console.log('GL', JSON.stringify(gl));
  // start-screen fps
  const sfps=await page.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<3000) requestAnimationFrame(f); else r(n/3); }; requestAnimationFrame(f); })); console.log('start screen fps', sfps.toFixed(1));
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Coach'); await page.fill('#nc-seed','animplan');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  // menu render timings
  const menu=await page.evaluate(()=>{ const out={}; const routes=Object.keys(VIEWS); for(const r of routes){ try{ App.route=r; App.params={}; const t0=performance.now(); render(); const t1=performance.now(); render(); const t2=performance.now(); out[r]=[+(t1-t0).toFixed(1),+(t2-t1).toFixed(1)]; }catch(e){ out[r]='err '+e.message.slice(0,40); } } App.route='office'; render(); return out; });
  console.log('menu render ms cold/warm', JSON.stringify(menu));
  await page.evaluate(()=>{ try{ C.settings.walkout='off'; }catch(e){} });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(800);
  for(let i=0;i<6;i++){ await page.click('canvas',{force:true}).catch(()=>{}); await page.waitForTimeout(250); }
  const res=await page.evaluate(()=>new Promise(r=>{ const st=Object.values(App.live).find(v=>v&&v.constructor&&v.constructor.name==='Stage'); let draw=0,upd=0,nd=0; const D0=st.drawLerp.bind(st), U0=st.update.bind(st); st.drawLerp=a=>{ const t=performance.now(); D0(a); draw+=performance.now()-t; nd++; }; st.update=d=>{ const t=performance.now(); U0(d); upd+=performance.now()-t; };
    let lt=0,ln=0; const po=new PerformanceObserver(l=>{ for(const e of l.getEntries()){ lt+=e.duration; ln++; } }); po.observe({entryTypes:['longtask']});
    let frames=0; const t0=performance.now(); const f=()=>{ frames++; if(performance.now()-t0<8000) requestAnimationFrame(f); else { po.disconnect(); r({fps:+(frames/8).toFixed(1),drawMs:+(draw/nd).toFixed(2),updMsPerStep:+(upd/Math.max(1,nd)).toFixed(2),longtasks:ln,longMs:+lt.toFixed(0),rs:st.rs||1,W:st.W,H:st.H,dpr:st.dpr}); } }; requestAnimationFrame(f); }));
  console.log('live', JSON.stringify(res));
  await browser.close(); })();
