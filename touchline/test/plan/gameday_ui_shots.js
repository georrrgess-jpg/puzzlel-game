/* v18.12 Gameday Graphics: the Media route and the Office card, desktop and phone, several themes.
   node test/plan/gameday_ui_shots.js [outDir] [rounds]  ->  test/shots/v1812/gameday/ui-*.png */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'../shots/v1812/gameday')); const ROUNDS=+(process.argv[3]||9); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const errs=[];
  for(const [name,vp,dsf,theme] of [['desk',{width:1440,height:900},1,null],['phone',{width:390,height:844},2,null],['desk-gold',{width:1440,height:900},1,'gold'],['phone-light',{width:390,height:844},2,'light']].filter(x=>!process.env.ONLY||process.env.ONLY.split(',').includes(x[0]))){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:dsf,hasTouch:name.startsWith('phone'),isMobile:name.startsWith('phone')}); const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(name+': '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(name+' console: '+m.text().slice(0,200)); });
    await page.goto(DIST); await page.waitForTimeout(500);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Shot Coach'); await page.fill('#nc-seed','gd-sheet'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    await page.evaluate(n=>{ const C=App.C; for(let i=0;i<n;i++){ simRound(C); try{ advance(C); }catch(e){} } App.route='office'; render(); },ROUNDS);
    if(theme==='gold') await page.evaluate(()=>{ PREFS.theme={preset:'gold'}; applyTheme(); });
    if(theme==='light') await page.evaluate(()=>{ PREFS.theme={custom:{bg:'#f3efe6',surface:'#ffffff',text:'#14110d',accent:'#d9930d',accent2:'#2a7f62'}}; applyTheme(); });
    await page.waitForTimeout(1200); await page.evaluate(()=>{ const c=document.querySelector('.v1812g-off'); if(c) c.scrollIntoView({block:'center'}); }); await page.waitForTimeout(1500); await page.screenshot({path:path.join(OUT,`ui-${name}-office.png`),fullPage:false}); await page.evaluate(()=>window.scrollTo(0,0));
    await page.evaluate(()=>{ App.route='gameday'; App.params={}; render(); }); await page.waitForFunction(()=>document.querySelector('.v1812g-cv'),null,{timeout:60000}); await page.waitForTimeout(2500);
    await page.screenshot({path:path.join(OUT,`ui-${name}-route.png`),fullPage:name.startsWith('phone')});
    if(name==='desk'){ await page.evaluate(()=>A.v1812gTpl({dataset:{k:'final'}})); await page.waitForTimeout(2500); await page.evaluate(()=>A.v1812gStyle({dataset:{v:'chrome'}})); await page.waitForTimeout(2500); await page.screenshot({path:path.join(OUT,`ui-${name}-final-chrome.png`)}); }
    await ctx.close(); }
  console.log('errors',errs.slice(0,10)); await b.close(); })();
