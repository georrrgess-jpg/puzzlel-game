/* v18.12 Gameday Graphics sample sheets: a simulated career, every template x style rendered through the real build.
   node test/plan/gameday_sheet.js [tpl|all] [style|all] [fmt portrait|square] [outDir] [rounds]
   Saves PNGs to test/shots/v1812/gameday/ (or outDir). Prints timing, renderer used and page errors. */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const tplArg=process.argv[2]||'all', styleArg=process.argv[3]||'all', fmt=process.argv[4]||'portrait'; const OUT=path.resolve(process.argv[5]||path.join(__dirname,'../shots/v1812/gameday')); const ROUNDS=+(process.argv[6]||10);
fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push('console: '+m.text().slice(0,300)); });
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Sheet Coach'); await page.fill('#nc-seed',process.env.SEED||'gd-sheet'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(n=>{ const C=App.C; for(let i=0;i<n;i++){ simRound(C); try{ advance(C); }catch(e){} } },ROUNDS);
  if(process.env.COLORS){ const [c1,c2]=process.env.COLORS.split(','); await page.evaluate(([a,b])=>{ const s=Sx(App.C.userSid); s.c1=a; s.c2=b; },[c1,c2]); }
  const info=await page.evaluate(()=>{ const C=App.C, B=v1812gBox(C); return {feed:B.feed.map(e=>e.id), n:B.feed.length, week:C.md, phase:C.phase, kinds:B.feed.reduce((o,e)=>(o[e.k]=(o[e.k]||0)+1,o),{})}; }); console.log(JSON.stringify(info));
  const tpls=tplArg==='all'?['gameday','final','milestone','potw','senior','hof']:tplArg.split(','); const styles=styleArg==='all'?['varsity','chrome','news']:styleArg.split(',');
  for(const k of tpls){ for(const st of styles){ const t0=Date.now();
      const r=await page.evaluate(async ([k,st,fmt,pose])=>{ const C=App.C; const B=v1812gBox(C); let e=B.feed.filter(x=>x.k===k).sort((a,b)=>b.t-a.t)[0]; let pv=false; if(!e){ e=v1812gPreviewEntry(C,k); pv=true; } if(!e) return {err:'no entry for '+k};
        const M=v1812gModel(C,e); if(!M) return {err:'no model '+e.id}; const cv=await v1812gPoster(M,st,{fmt,pose}); return {id:e.id,pv,url:cv.toDataURL('image/png'),meta:cv._gd,opaque:v1812gOpaque(cv)}; },[k,st,fmt,+(process.env.POSE||0)]);
      if(r.err){ console.log(k,st,r.err); continue; } const f=path.join(OUT,`${process.env.TAG?process.env.TAG+'-':''}${k}-${st}${fmt==='square'?'-sq':''}.png`); fs.writeFileSync(f,Buffer.from(r.url.split(',')[1],'base64')); console.log(k,st,r.id,r.pv?'(preview)':'',JSON.stringify(r.meta),(Date.now()-t0)+'ms'); } }
  console.log('errors',errs.slice(0,8)); await b.close(); })();
