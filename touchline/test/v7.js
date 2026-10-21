const { chromium } = require('./_pw');
const W=+(process.argv[2]||1440), H=+(process.argv[3]||900), tag=process.argv[4]||'d';
const S=n=>`test/shots/v7-${tag}-${n}.png`;
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:W,height:H}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','V7'); await page.fill('#nc-seed','rivalry7'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ App.route='camp'; render(); }); await page.waitForTimeout(300); await page.screenshot({path:S('01-camp-locked')});
  // advance until the user's next Varsity fixture is the heated rival
  const fid=await page.evaluate(()=>{ const C=App.C; for(let i=0;i<30;i++){ const f=userFixture(C); if(f&&isHeated(f)) return f.id; if(f){ const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); } return null; });
  await page.evaluate(()=>{ App.modal=null; render(); renderModal(); });
  console.log('rival fixture', fid);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500); await page.screenshot({path:S('02-preview')});
  await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  await page.waitForTimeout(1500); await page.screenshot({path:S('03-intro')});
  await page.waitForTimeout(3200); await page.screenshot({path:S('04-walkout')});
  await page.waitForTimeout(6000); await page.screenshot({path:S('05-live-weather')});
  const wx=await page.evaluate(()=>JSON.stringify(App.live.stage.wx)); console.log('weather', wx);
  for(let k=0;k<4;k++){ if(await page.$('#lv-cont')) break; if(await page.$('#lv-ht .htbox')){ await page.click('#ht-go'); await page.waitForTimeout(400); } await page.click('#lv-ctrl [data-a="liveSkip"][data-to="ft"]',{timeout:3000}).catch(()=>{}); await page.waitForTimeout(1200); } await page.waitForSelector('#lv-cont',{timeout:30000}); await page.waitForTimeout(500);
  await page.click('[data-a="liveContinue"]'); await page.waitForTimeout(1500); await page.screenshot({path:S('06-after')});
  console.log('rivalry', await page.evaluate(()=>JSON.stringify(rivalrySeries(App.C)).slice(0,200)));
  await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; renderModal(); A.simAhead({dataset:{k:'season'}}); }); await page.waitForTimeout(800);
  await page.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; renderModal(); App.route='camp'; render(); }); await page.waitForTimeout(400);
  await page.click('[data-a="campScout"] >> nth=0'); await page.click('[data-a="campScout"] >> nth=1'); await page.click('[data-a="campInvite"] >> nth=0'); await page.click('[data-a="campInvite"] >> nth=2'); await page.waitForTimeout(300);
  await page.screenshot({path:S('07-camp'),fullPage:true});
  // fake an inductee so the hall can be seen in season one
  await page.evaluate(()=>{ const C=App.C; const p=squad(C,C.userSid,'V').sort((a,b)=>b.grade-a.grade||ovr(b)-ovr(a))[0]; hofCandidate(C,p,C.year); C._hofQ[0].sc=99; hofInduct(C,C.year); App.modal={type:'hofNight',ids:[...C.hofNew]}; renderModal(); });
  await page.waitForTimeout(1200); await page.screenshot({path:S('08-hof-night')});
  await page.click('.hofn [data-a="retireNum"]'); await page.waitForTimeout(300);
  await page.evaluate(()=>{ App.modal=null; renderModal(); App.route='hof'; render(); }); await page.waitForTimeout(400); await page.screenshot({path:S('09-hof'),fullPage:true});
  await page.evaluate(()=>A.playNext()); await page.waitForTimeout(600);
  console.log('after rollover', await page.evaluate(()=>{ const C=App.C; return JSON.stringify({yr:C.year, campers:Object.values(C.players).filter(p=>p.camp&&p.sid===C.userSid).length, retired:C.retired}); }));
  await page.evaluate(()=>{ App.modal=null; renderModal(); App.route='school'; render(); }); await page.waitForTimeout(300); await page.screenshot({path:S('10-school'),fullPage:true});
  console.log(errs.join('\n')||'no errors'); await browser.close(); })();
