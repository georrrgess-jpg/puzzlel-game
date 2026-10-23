/* v18.4 touches sheet: pauses the lab's run/dribble/receive scenes at dribble touches, at the instant a strike releases the
   ball and as a pass arrives, in 3-D and 2-D, and saves close-ups to test/shots/v184/touches/.  node test/touches_sheet.js [3d|2d|both] */
const { chromium, DIST } = require('./_pw'); const path=require('path'), fs=require('fs');
const OUT=path.resolve(__dirname,'shots/v184/touches')+'/'; fs.mkdirSync(OUT,{recursive:true});
const which=process.argv[2]||'both';
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const errs=[];
  for(const r of which==='both'?['3d','2d']:[which]){
    const page=await browser.newPage({viewport:{width:900,height:560},deviceScaleFactor:2}); page.on('pageerror',e=>errs.push(e.message));
    await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
    for(const scen of ['run','dribble','receive']){
      await page.evaluate(([s,r])=>{ PREFS.renderer=r; labRun(s); },[scen,r]);
      await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:20000});
      for(const kind of ['touch','strike','arrive']){
        if(scen!=='receive'&&kind==='arrive') continue; if(scen==='run'&&kind==='strike') continue;
        await page.evaluate(kind=>{ const st=App.labSt; window.__hit=0; let lastT=null, lastOwn=null, lastFl=App.labSt.fl; const U=Stage.prototype.update;
          st.update=function(dt){ if(this.own&&!this.hands) lastOwn=this.own; const fl0=this.fl; const r=U.call(this,dt); const o=this.own;
            let hit=false;
            if(kind==='touch'&&o&&o.v184T===this.now&&o.v184T!==lastT){ lastT=o.v184T; hit=Math.hypot(o.vx||0,o.vy||0)>2.5; }
            if(kind==='strike'&&this.fl&&this.fl!==lastFl&&!this.fl.phys&&lastOwn&&lastOwn.kickK&&lastOwn.kickK!=='head') hit=true; lastFl=this.fl;
            if(kind==='arrive'&&this.fl&&this.fl.home&&!this.fl.phys&&this.fl.t0+this.fl.dur-this.now<45&&this.fl.t0+this.fl.dur-this.now>0) hit=true;
            if(hit&&!window.__hit){ window.__hit=1; this.paused=true; const tgt=o||lastOwn||(this.fl&&this.fl.home); if(tgt){ this.focus=tgt; this.cam.x=tgt.x; this.zoomTo(0.3); this.cam.w=this.cam.tw; } }
            return r; }; },kind);
        const got=await page.waitForFunction(()=>window.__hit===1,null,{timeout:40000}).then(()=>true).catch(()=>false);
        if(!got){ console.log('no '+kind+' in '+scen); continue; }
        await page.waitForTimeout(r==='3d'?1800:300);
        const el=await page.$('#anim-lab .lab-cv'); const f=OUT+`${r}_${scen}_${kind}.png`; await (el||page).screenshot({path:f}); console.log('saved '+f);
        await page.evaluate(()=>{ const st=App.labSt; delete st.update; st.paused=false; });
      }
    }
    await page.close();
  }
  console.log(errs.length?'ERRORS '+errs.slice(0,3).join(' | '):'ERRORS none'); await browser.close();
})();
