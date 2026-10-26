/* v18.12 County Map screenshots: desktop and phone, night and a light theme. Usage: node test/plan/map_shots.js [outdir] (default test/shots/v1812/map) */
const { chromium, DIST } = require('../_pw'); const fs=require('fs');
const OUT=process.argv[2]||'test/shots/v1812/map'; fs.mkdirSync(OUT,{recursive:true});
const THEMES={night:{preset:'night'},light:{preset:null,custom:{bg:'#f3f0e8',surface:'#ffffff',text:'#1b1f25',accent:'#d97706',accent2:'#2563eb'}}};
const SEED=process.argv[3]||'map27';
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const [W,H,dev] of [[1440,900,'desktop'],[390,844,'phone']]) for(const th of Object.keys(THEMES)){
    const ctx=await b.newContext({viewport:{width:W,height:H},hasTouch:dev==='phone'}); const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(dev+' '+th+' '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(dev+' '+th+' console '+m.text()); });
    await page.goto(DIST); await page.waitForTimeout(400); await page.evaluate(t=>{ PREFS.theme=t; savePrefs(); },THEMES[th]); await page.reload(); await page.waitForTimeout(400);
    await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Map Coach'); await page.fill('#nc-seed',SEED);
    await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
    const S=n=>`${OUT}/${dev}-${th}-${n}.png`; const go=async(r,p)=>{ await page.evaluate(([r,p])=>{ App.modal=null; renderModal(); App.route=r; App.params=p||{}; render(); },[r,p]); await page.waitForTimeout(450); };
    /* the first look, before any game: your home town and the satellites around it */
    await go('countymap'); await page.waitForTimeout(1600); await page.screenshot({path:S('00-start')});
    /* a season in: sim until your next game is away at a town that a win would flip */
    await page.evaluate(()=>{ const C=App.C; for(let i=0;i<3;i++){ simRound(C); try{ advance(C); }catch(e){} } });
    const seek=await page.evaluate(()=>{ const C=App.C; let n=0; for(let i=0;i<13;i++){ const F=v1812mFriday(C); if(F.kind==='lg'&&F.away&&F.flips.length){ return {found:true,n}; } simRound(C); try{ advance(C); }catch(e){} n++; } return {found:false,n}; });
    console.log(dev,th,'flip fixture found:',JSON.stringify(seek));
    await go('countymap'); await page.waitForTimeout(2600); await page.screenshot({path:S('01-callout')});
    /* tap a rival town */
    const id=await page.evaluate(()=>{ const C=App.C, st=v1812mState(C), g=v1812mGeo(C); const t=g.towns.filter(t=>!t.user&&!t.sat).sort((a,b)=>(st.S[b.id][C.userSid]||0)-(st.S[a.id][C.userSid]||0))[0]; return t.id; });
    await page.evaluate(i=>{ v1812mSelect(i,true); },id); await page.waitForTimeout(900); await page.screenshot({path:S('02-town')});
    if(dev==='phone') await page.screenshot({path:S('02-town-full'),fullPage:true});
    /* play the game, come back: the glows ease to the new state */
    await page.evaluate(()=>{ App.route='office'; render(); const C=App.C; const uf=userFixture(C); if(uf){ simRound(C); try{ advance(C); }catch(e){} } });
    await go('countymap'); await page.waitForTimeout(900); await page.screenshot({path:S('03-spreading-mid')}); await page.waitForTimeout(2600); await page.screenshot({path:S('04-spreading-done')});
    /* the Overview teaser */
    await go('office'); await page.evaluate(()=>{ const t=document.querySelector('.v1812m-tz'); if(t) t.scrollIntoView({block:'center'}); }); await page.waitForTimeout(400); await page.screenshot({path:S('05-overview-teaser')});
    await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(150); await page.screenshot({path:S('05b-overview')});
    {
      /* a derby: schedule, matchday, preview, the broadcast intro */
      const d=await page.evaluate(()=>{ const C=App.C, u=C.userSid, g=v1812mGeo(C); const dd=Object.values(g.derby).find(x=>x.a===u||x.b===u); const o=dd.a===u?dd.b:dd.a; const f=Object.values(C.fixtures).find(f=>f.lvl==='V'&&f.comp==='reg'&&f.st==='s'&&((f.h===u&&f.a===o)||(f.a===u&&f.h===o)))||Object.values(C.fixtures).find(f=>f.lvl==='V'&&f.comp==='reg'&&((f.h===u&&f.a===o)||(f.a===u&&f.h===o))); C.phase='regular'; C.md=f.rd; return {fid:f.id}; });
      await go('office'); await page.screenshot({path:S('06-derby-overview')});
      await go('schedule'); await page.screenshot({path:S('07-derby-schedule')});
      await go('matchday'); await page.screenshot({path:S('08-derby-matchday')});
      await go('news',{nv:'wire'}); await page.waitForTimeout(500); await page.screenshot({path:S('09-newswire')});
      await page.evaluate(id=>{ App.route='office'; render(); App.modal={type:'fixture',id}; renderModal(); },d.fid); await page.waitForTimeout(500); await page.screenshot({path:S('10-derby-preview')});
      await page.evaluate(()=>{ App.modal=null; renderModal(); render(); });
      await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500); await page.click('[data-a="pvSpeed"][data-v="8"]').catch(()=>{}); await page.click('[data-a="kickoff"]'); await page.waitForSelector('#lv-intro .lvi',{timeout:5000}).catch(()=>{}); await page.waitForTimeout(900); await page.screenshot({path:S('11-derby-intro')});
      await page.evaluate(()=>{ try{ if(App.live){ App.live.introGo&&App.live.introGo(); } }catch(e){} });
      await ctx.close(); const c2=await b.newContext({viewport:{width:W,height:H}}); const p2=await c2.newPage(); p2.on('pageerror',e=>errs.push('p2 '+e.message)); await p2.goto(DIST); await p2.waitForTimeout(400); await p2.evaluate(t=>{ PREFS.theme=t; savePrefs(); },THEMES[th]); await p2.reload(); await p2.waitForTimeout(400);
      await p2.click('[data-a="newCareerForm"][data-slot="1"]'); await p2.fill('#nc-name','Map Coach'); await p2.fill('#nc-seed',SEED); await p2.click('[data-a="ncNext"]'); await p2.waitForTimeout(200); await p2.click('[data-a="createCareer"]'); await p2.waitForTimeout(800);
      /* results strip after a round, Road Warrior and the camp at the end of a season */
      await p2.evaluate(()=>{ const C=App.C; for(let i=0;i<8;i++){ simRound(C); try{ advance(C); }catch(e){} } const uf=userFixture(C); completeRound(uf?uf.id:null); }); await p2.waitForTimeout(900); await p2.screenshot({path:S('12-results-strip')});
      await p2.evaluate(()=>{ App.modal=null; renderModal(); const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); const ev=advance(C); if(!ev) break; } const u=C.userSid; for(const o of C.league.filter(x=>x!==u)){ const f=Object.values(C.fixtures).find(f=>f.lvl==='V'&&f.comp==='reg'&&f.h===o&&f.a===u&&f.yr===C.year); if(f&&f.w!==u){ f.hg=0; f.ag=1; f.w=u; f.st='d'; } } v1812mRebuild(C); v1812mRoadWarrior(C,null,false); App.route='camp'; render(); });
      await p2.waitForTimeout(500); await p2.screenshot({path:S('13-camp')});
      await p2.evaluate(()=>{ App.route='hof'; render(); }); await p2.waitForTimeout(400); await p2.screenshot({path:S('14-halloffame')});
      await p2.evaluate(()=>{ App.route='countymap'; render(); }); await p2.waitForTimeout(2500); await p2.screenshot({path:S('15-roadwarrior')});
      await c2.close(); }
  }
  console.log(errs.length?errs.join('\n'):'no page errors'); await b.close(); })();
