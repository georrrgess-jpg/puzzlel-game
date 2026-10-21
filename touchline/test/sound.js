// Sound v2: the engine starts on the first gesture, plays the right music per screen, effects are audible, M mutes
const { chromium } = require('./_pw');
const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
(async()=>{ const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const page = await browser.newPage({viewport:{width:1100,height:700}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push('console '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(800);
  ok(await page.evaluate(()=>!Sound.ctx), 'no audio before the first gesture');
  await page.mouse.click(5,5); await page.waitForTimeout(500);
  const level=async(fn)=>page.evaluate(fn=>new Promise(res=>{ const S=Sound; if(!S._an){ S._an=S.ctx.createAnalyser(); S._an.fftSize=2048; S.master.connect(S._an); } if(fn){ S.musicStop(true); setTimeout(()=>{ (new Function(fn))(); },350); } const a=new Float32Array(2048); let mx=0,n=0; const iv=setInterval(()=>{ S._an.getFloatTimeDomainData(a); let s=0; for(const v of a) s+=v*v; mx=Math.max(mx,Math.sqrt(s/a.length)); if(++n>16){ clearInterval(iv); res(mx); } },50); }),fn);
  ok(await page.evaluate(()=>Sound.ctx&&Sound.ctx.state==='running'&&Sound.music&&Sound.music.which==='menu'), 'menu music starts after the first click');
  ok(await level()>0.005, 'menu music is audible');
  for(const [n,f] of [['a strike','Sound.kick("shot",1)'],['the net','Sound.net(1)'],['a save','Sound.save()'],['a goal','Sound.goal()'],['a whistle','Sound.whistle("ko")'],['a click','Sound.ui("success")'],['the fanfare','Sound.fanfare()']]){ ok(await level(f)>0.004, n+' is audible'); await page.waitForTimeout(300); }
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','S'); await page.fill('#nc-seed','snd'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(1500);
  ok(await page.evaluate(()=>Sound.music&&Sound.music.which==='office'), 'the office has its own track');
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(5000);
  ok(await page.evaluate(()=>!Sound.music&&!!Sound.crowd), 'music stops for the match and the crowd comes in');
  ok(await page.evaluate(()=>App.live.stage.sfx===true), 'match effects are wired to the broadcast');
  await page.keyboard.press('m'); await page.waitForTimeout(800); ok(!(await page.evaluate(()=>PREFS.sound.on)) && (await level())<0.0005, 'M mutes everything');
  await page.keyboard.press('m'); await page.waitForTimeout(300); ok(await page.evaluate(()=>PREFS.sound.on), 'M turns it back on');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); if(errs.length) process.exitCode=1; await browser.close(); })();
