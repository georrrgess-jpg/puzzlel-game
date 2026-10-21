// v10.1: the stadium announcer calls the starting XI (number, grade, name) as each player is revealed
const { chromium } = require('./_pw');
const SHOTS=process.argv[2]||null;
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  // a stand-in speech engine: records every line and "speaks" it in 700 ms
  await page.addInitScript(()=>{ window.__said=[]; window.__cancel=0; const fake={ speaking:false, getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){ window.__cancel++; },
      speak(u){ window.__said.push({text:u.text,t:performance.now()}); setTimeout(()=>u.onend&&u.onend(),700); } };
    Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','PA Tester'); await page.fill('#nc-seed','announcer'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ delete App.C.settings.walkout; App.C.settings.senior='off'; });
  ok(await page.evaluate(()=>{ const f=Object.values(App.C.fixtures).find(x=>x.h===App.C.userSid||x.a===App.C.userSid); return wantWalkout(Object.assign({},f,{comp:'reg',lvl:'JV'}))&&wantWalkout(Object.assign({},f,{comp:'reg',lvl:'V'})); }), 'announcements now run before every game by default, including ordinary and JV games');
  await page.evaluate(()=>{ App.C.settings.walkout='big'; App.C.settings.walk2=0; wantWalkout(Object.values(App.C.fixtures)[0]); }); ok(await page.evaluate(()=>App.C.settings.walkout==='all'), 'an older save on "Big games" is moved to every game once');
  ok(await page.evaluate(()=>PREFS.sound.voice>0), 'announcer volume has a default');
  await page.dispatchEvent('.tnav [data-r="settings"]','click'); await page.waitForTimeout(200); ok(await page.$('#vol-voice'), 'Settings has an announcer volume slider');
  await page.dispatchEvent('.tnav [data-r="office"]','click'); await page.waitForTimeout(200);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="kickoff"]');
  await page.waitForSelector('.walk',{timeout:20000}); ok(true,'the starting XI walkout appears');
  const sides=await page.evaluate(()=>{ const L=App.live, C=App.C; const pl=i=>L.M.sides[i].slots.map(s=>C.players[s.pid]).filter(Boolean).map(p=>({num:p.num,grade:p.grade,fn:p.fn,ln:p.ln})); return {mine:pl(L.M.user),them:pl(1-L.M.user),opp:Sx(L.M.sides[1-L.M.user].sid||'').town}; });
  const words={12:'senior',11:'junior',10:'sophomore',9:'freshman',8:'eighth grade',7:'seventh grade'};
  await page.waitForFunction(()=>window.__said.length>=3,null,{timeout:30000});
  ok(await page.$('.walk-them'), 'the opponents are introduced first, on their own lineup screen');
  if(SHOTS){ await page.waitForTimeout(2500); await page.screenshot({path:SHOTS+'/pa-opp.png'}); }
  let said=await page.evaluate(()=>window.__said.map(x=>x.text));
  ok(/starting lineup for/i.test(said[0]), 'opens with the visitors introduction: "'+said[0]+'"');
  const oc=said[1]; const op=sides.them.find(x=>oc.includes(x.fn+' '+x.ln));
  ok(op&&oc.startsWith('Number '+op.num+',')&&oc.toLowerCase().indexOf(words[op.grade])<oc.indexOf(op.fn), 'opponents get number, grade, then name: "'+oc+'"');
  await page.waitForSelector('.walk-vs',{timeout:60000}); ok(true,'a VS slam separates the two lineups');
  if(SHOTS){ await page.waitForTimeout(600); await page.screenshot({path:SHOTS+'/pa-vs.png'}); }
  await page.waitForSelector('.walk-mine',{timeout:20000}); ok(true,'then your XI gets its own screen');
  const t0=await page.evaluate(()=>window.__said.length);
  await page.waitForFunction(n=>window.__said.length>=n+10,t0,{timeout:60000});
  const revealedEarly=await page.evaluate(()=>document.querySelectorAll('.walk-mine .wk-tok.in').length);
  ok(revealedEarly>=1&&revealedEarly<sides.mine.length, 'your players are revealed one at a time ('+revealedEarly+' so far)');
  if(SHOTS){ await page.screenshot({path:SHOTS+'/pa-2.png'}); }
  await page.waitForFunction(()=>/head coach/i.test(window.__said.map(x=>x.text).join(' ')),null,{timeout:120000});
  await page.waitForTimeout(1500);
  said=await page.evaluate(()=>window.__said.map(x=>x.text)); const mineText=said.slice(t0).join(' | ');
  ok(/time to meet your/i.test(said.join(' | ')), 'your team gets the big build-up');
  const order=sides.mine.every(x=>{ const a=mineText.indexOf('Number '+x.num+'!'); if(a<0) return false; const g=mineText.toLowerCase().indexOf(words[x.grade],a); const fn=mineText.indexOf(x.fn,g); const ln=mineText.indexOf(x.ln+'!',fn); return g>a&&fn>g&&ln>fn; });
  ok(order, 'all '+sides.mine.length+' of your starters: number, then grade, then first name, then the drawn-out last name');
  ok(sides.them.every(x=>said.some(t=>t.includes(x.fn+' '+x.ln)&&t.includes('Number '+x.num+','))), 'all '+sides.them.length+' opponents are announced too');
  ok(/head coach/i.test(said.slice(-3).join(' ')), 'closes with the head coach');
  const gaps=await page.evaluate(t0=>{ const s=window.__said.slice(t0); const idx=s.map((x,i)=>/^Number \d+!/.test(x.text)?i:-1).filter(i=>i>=0); const g=[]; for(let k=1;k<idx.length;k++) g.push(s[idx[k]].t-s[idx[k-1]].t); return Math.min(...g); },t0);
  ok(gaps>=1200&&gaps<2400, 'your players are paced briskly but each gets a moment (gap between calls '+Math.round(gaps)+' ms, was over 3300)');
  await page.waitForFunction(()=>!document.querySelector('.walk'),null,{timeout:15000}); ok(true,'the walkout hands over to kickoff');
  ok(await page.evaluate(()=>!CIN.bed), 'the intro music stops at kickoff');
  // tap to skip mid-announcement, in a fresh browser context
  const p2=await browser.newPage({viewport:{width:1280,height:800}}); p2.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p2.addInitScript(()=>{ window.__said=[]; window.__cancel=0; const fake={ getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){ window.__cancel++; }, speak(u){ window.__said.push({text:u.text}); setTimeout(()=>u.onend&&u.onend(),700); } };
    Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
  await p2.goto(require('./_pw').DIST); await p2.waitForTimeout(500);
  await p2.click('[data-a="newCareerForm"][data-slot="1"]'); await p2.fill('#nc-name','PA Skip'); await p2.fill('#nc-seed','skipper'); await p2.click('[data-a="ncNext"]'); await p2.waitForTimeout(200); await p2.click('[data-a="createCareer"]'); await p2.waitForTimeout(800);
  await p2.evaluate(()=>{ App.C.settings.senior='off'; });
  await p2.click('.cta [data-a="playNext"]'); await p2.waitForTimeout(400); await p2.click('[data-a="kickoff"]');
  await p2.waitForSelector('.walk',{timeout:20000}); await p2.waitForFunction(()=>window.__said.length>=2,null,{timeout:20000}); const n0=await p2.evaluate(()=>window.__said.length);
  ok(await p2.$('.walk-them [data-a="paSkipThem"]')&&await p2.$('.walk-them [data-a="paSkipAll"]'), 'the other team\'s lineup shows "Skip to us" and "Skip all" buttons');
  await p2.click('[data-a="paSkipThem"]'); await p2.waitForTimeout(400);
  ok(await p2.$('.walk-mine'), 'skipping the opponents jumps straight to your XI');
  ok(await p2.evaluate(()=>window.__cancel>0), 'skipping cuts the opponent call off mid-sentence');
  await p2.waitForFunction(()=>window.__said.some(x=>/meet your/i.test(x.text)),null,{timeout:8000});
  const afterSkip=await p2.evaluate(n=>window.__said.slice(n).map(x=>x.text),n0);
  ok(afterSkip.length&&/meet your/i.test(afterSkip[0]), 'your own announcements still play in full after skipping theirs ("'+afterSkip[0]+'")');
  await p2.waitForFunction(()=>window.__said.some(x=>/^Number \d+!/.test(x.text)),null,{timeout:10000}); ok(true,'your players start being called');
  const n1=await p2.evaluate(()=>window.__said.length); await p2.click('.walk'); await p2.waitForTimeout(800);
  ok(!(await p2.$('.walk')), 'tapping during your XI ends the walkout');
  await p2.waitForTimeout(2500); ok(await p2.evaluate(n=>window.__said.length<=n,n1), 'no more calls after skipping');
  // Skip all from the opponent screen, in another fresh context
  const p3=await browser.newPage({viewport:{width:1280,height:800}}); p3.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p3.addInitScript(()=>{ window.__said=[]; const fake={ getVoices:()=>[{name:'Test Guy',lang:'en-US'}], addEventListener(){}, cancel(){}, speak(u){ window.__said.push({text:u.text}); setTimeout(()=>u.onend&&u.onend(),700); } };
    Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
  await p3.goto(require('./_pw').DIST); await p3.waitForTimeout(500);
  await p3.click('[data-a="newCareerForm"][data-slot="1"]'); await p3.fill('#nc-name','PA All'); await p3.fill('#nc-seed','skipall'); await p3.click('[data-a="ncNext"]'); await p3.waitForTimeout(200); await p3.click('[data-a="createCareer"]'); await p3.waitForTimeout(800);
  await p3.evaluate(()=>{ App.C.settings.senior='off'; }); await p3.click('.cta [data-a="playNext"]'); await p3.waitForTimeout(400); await p3.click('[data-a="kickoff"]');
  await p3.waitForSelector('.walk-them [data-a="paSkipAll"]',{timeout:20000}); await p3.click('[data-a="paSkipAll"]'); await p3.waitForTimeout(800);
  const n3=await p3.evaluate(()=>window.__said.length); ok(!(await p3.$('.walk')), '"Skip all" ends the whole walkout from the opponent screen');
  await p3.waitForTimeout(2000); ok(await p3.evaluate(n=>window.__said.length<=n,n3), 'and nothing else is announced');
  await p3.setViewportSize({width:390,height:780}); 
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
