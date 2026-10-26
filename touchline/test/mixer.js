// v10.2: match sound mixer — per-sound switches, presets, volumes, in-match pop-over
const { chromium } = require('./_pw');
const SHOTS=process.argv[2]||null;
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  // count audio nodes so we can tell whether a sound actually played
  await page.addInitScript(()=>{ window.__nodes=0; const AC=window.AudioContext||window.webkitAudioContext; if(AC){ for(const m of ['createOscillator','createBufferSource']){ const o=AC.prototype[m]; AC.prototype[m]=function(){ window.__nodes++; return o.apply(this,arguments); }; } }
    window.__said=[]; const fake={ getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){}, speak(u){ window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(),300); } }; Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Mixer Tester'); await page.fill('#nc-seed','mixer'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  // Settings
  await page.dispatchEvent('.tnav [data-r="settings"]','click'); await page.waitForTimeout(300);
  ok((await page.$$('[data-mixer="set"] .mx-row')).length===14, 'Settings lists 14 match sounds to switch on or off');
  ok((await page.$$('[data-mixer="set"] .mx-pre')).length===5, 'five presets');
  const plays=async fn=>page.evaluate(fn=>{ Sound.gestured=true; Sound.ensure(); const n=window.__nodes; eval(fn); return window.__nodes-n; },fn);
  ok(await plays('Sound.step(0.9)')>0, 'footsteps play while switched on');
  await page.click('[data-mixer="set"] .mx-row[data-k="steps"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>PREFS.sound.fx.steps===false), 'switching footsteps off is saved');
  ok(await plays('Sound.step(0.9)')===0, 'footsteps are silent once switched off');
  ok(await plays('Sound.kick("shot",0.8)')>0, 'other sounds still play');
  await page.click('[data-mixer="set"] .mx-row[data-k="goal"]'); await page.waitForTimeout(200);
  const g=await plays('Sound.horn()'); ok(g===0, 'goal horn off: no horn');
  await page.click('[data-mixer="set"] .mx-pre[data-k="pitch"]'); await page.waitForTimeout(200);
  const fx=await page.evaluate(()=>({...PREFS.sound.fx}));
  ok(fx.ball&&fx.steps&&fx.whistle&&!fx.crowd&&!fx.chants&&!fx.voice, 'Pitchside preset keeps only on-field sounds');
  ok(await page.$('[data-mixer="set"] .mx-pre.on[data-k="pitch"]'), 'the active preset is highlighted');
  ok(await page.evaluate(()=>!PA.ok()), 'announcer is off in the Pitchside preset');
  await page.click('[data-mixer="set"] .mx-pre[data-k="full"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>SFX_GROUPS.every(([k])=>fxOn(k))), 'Full stadium turns everything back on');
  // volume slider in the mixer
  await page.evaluate(()=>{ const d=document.querySelector('[data-mixer="set"] details'); d.open=true; });
  await page.$eval('#mx-set-crowd',el=>{ el.value='0.2'; el.dispatchEvent(new Event('change',{bubbles:true})); });
  ok(await page.evaluate(()=>Math.abs(PREFS.sound.crowd-0.2)<0.001), 'crowd volume slider works');
  // in a match
  await page.evaluate(()=>{ App.C.settings.walkout='off'; App.C.settings.senior='off'; });
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(200); await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(3500);
  ok(await page.$('#lv-ctrl .mixbtn'), 'the broadcast has a Sounds button');
  await page.click('#lv-ctrl .mixbtn'); await page.waitForTimeout(300);
  ok(await page.$('#mix-pop .mx-row'), 'it opens the mixer over the match');
  if(SHOTS) await page.screenshot({path:SHOTS+'/mixer-live.png'});
  await page.waitForFunction(()=>Sound.crowd||V189.failed,null,{timeout:60000}).catch(()=>{});
  ok(await page.evaluate(()=>!!Sound.crowd), 'crowd atmosphere is running');
  await page.click('#mix-pop .mx-row[data-k="crowd"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>!Sound.crowd), 'switching the crowd off silences it immediately');
  ok(await page.$('#mix-pop'), 'the mixer stays open while you change things');
  await page.click('#mix-pop .mx-row[data-k="crowd"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>!!Sound.crowd), 'and back on');
  await page.mouse.click(400,300); await page.waitForTimeout(200);
  ok(!(await page.$('#mix-pop')), 'clicking away closes the mixer');
  await page.click('#lv-ctrl .mixbtn'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(!(await page.$('#mix-pop')), 'Escape closes it too');
  await page.click('#lv-ctrl .mixbtn'); await page.waitForTimeout(200); await page.click('#mix-pop [data-a="mixMaster"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>!PREFS.sound.on&&!Sound.crowd), 'the master switch mutes everything');
  await page.click('#mix-pop [data-a="mixMaster"]'); await page.waitForTimeout(200);
  // persists
  await page.click('#mix-pop .mx-row[data-k="chants"]'); await page.waitForTimeout(200);
  const saved=await page.evaluate(()=>{ try{ return Object.keys(localStorage).map(k=>localStorage.getItem(k)).join('\n'); }catch(e){ return ''; } });
  ok(/"chants":false/.test(saved), 'choices are remembered');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
