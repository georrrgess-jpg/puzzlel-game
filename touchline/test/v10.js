// v10: Kit Lab, clash check, Season Wrapped, penalties and woodwork
const { chromium } = require('./_pw');
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1366,height:860}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Kit Tester'); await page.fill('#nc-seed','kitlab'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  // Kit Lab
  ok(await page.$('.nav[data-r="kits"]'), 'Kit Lab is in the navigation');
  await page.dispatchEvent('.tnav [data-r="kits"]','click'); await page.waitForTimeout(600);
  ok((await page.$$('.kl-card')).length===3, 'three kit cards (home, away, third)');
  ok((await page.$$('.kl-pat')).length>=16, 'at least 16 patterns offered');
  ok((await page.$$('.kl-col')).length>=60, 'at least 60 colors in the palette');
  const drawn=await page.evaluate(()=>{ const c=document.querySelector('[data-klfig]'); const g=c.getContext('2d'); const d=g.getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n; });
  ok(drawn>500, 'kit figures are drawn on the cards');
  await page.click('[data-a="klSet"][data-k="pat"][data-v="hoops"]'); await page.waitForTimeout(200);
  await page.click('[data-a="setParam"][data-k="kt"][data-v="pc"]'); await page.click('.kl-col[data-v="#facc15"]'); await page.waitForTimeout(200);
  await page.click('[data-a="klSet"][data-k="collar"][data-v="polo"]'); await page.click('[data-a="klSet"][data-k="sockPat"][data-v="hoops"]'); await page.waitForTimeout(200);
  const home=await page.evaluate(()=>{ const s=Sx(App.C.userSid); return s.kits&&s.kits.home; });
  ok(home&&home.pat==='hoops'&&home.pc==='#facc15'&&home.collar==='polo'&&home.sockPat==='hoops', 'edits are saved to the home kit');
  await page.click('[data-a="setParam"][data-k="kk"][data-v="third"]'); await page.waitForTimeout(200); await page.click('[data-a="klPreset"][data-v="blackout"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>Sx(App.C.userSid).kits.third.pat==='pinstripe'), 'presets apply to the selected kit');
  const mu=await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); return C.league.filter(id=>id!==me.id).map(id=>{ const m=kitMatchup(Sx(id),me); return {sc:m.score,key:m.keys[1],gk:m.gk.map(k=>k.shirt)}; }); });
  ok(mu.every(m=>m.sc>=2.6), 'every away matchup reads clearly (score >= 2.6) '+mu.map(m=>m.sc.toFixed(1)).join(','));
  ok(mu.every(m=>m.gk[0]!==m.gk[1]), 'goalkeepers never share a color');
  const cb=await page.evaluate(()=>{ const a={shirt:'#d62828',pc:'#d62828',shorts:'#ffffff'}, b={shirt:'#2f8f2f',pc:'#2f8f2f',shorts:'#ffffff'}; const r=clashReport(a,b); return r; });
  ok(cb.n>cb.d, 'red vs green looks closer to red-green colorblind fans ('+cb.n.toFixed(1)+' vs '+cb.d.toFixed(1)+')');
  await page.click('[data-a="klAutoFix"]'); await page.waitForTimeout(300);
  ok(await page.$('#toasts, .toast'), 'auto-fix reports what it did');
  // kits reach the broadcast
  const stageKit=await page.evaluate(()=>{ const f=userFixture(App.C); const k=kitsFor(f); return k.team.map(t=>t.pat); });
  ok(stageKit.length===2&&stageKit.every(Boolean), 'match kits carry their patterns');
  // penalties and woodwork in a sandbox stage
  const pen=await page.evaluate(async()=>{ const d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); d.appendChild(c); document.body.appendChild(d);
    const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid,11),h:70}; return {pid,role,x,y}; }),off:{}});
    const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid]}); const em=[]; st.emit=e=>em.push({t:e.t,inNet:!!st.inNet,own:st.own&&st.own.pid,hands:st.hands}); st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap(); st.ts=0.2; st.goalTs=0.2;
    const fw=[...st.players.values()][9]; await st.tapOff(); await st.gain(fw); fw.x=84; fw.y=30;
    await st.goalSequence({s:0,pid:fw.pid,t:'goal',ty:'pen',seq:[{pid:fw.pid,x:50,y:89,a:'setup'}],sc:[1,0],m:10});
    await st.gain(fw); fw.x=84; fw.y=30; await st.shotSeq({s:0,pid:fw.pid,t:'save',ty:'pen',x:50,y:89});
    await st.gain(fw); fw.x=84; fw.y=30; await st.shotSeq({s:0,pid:fw.pid,t:'miss',ty:'pen',x:50,y:89});
    // woodwork: a ball fired at the post comes back out
    st.own=null; st.ball={x:100,y:GF.y0-0.17,z:0.5,spin:0}; const fr=st.startFree({x:30,y:0,z:0},{max:1500}); await fr; const wood=st.ball.x<105&&!st.ball.ing;
    st.destroy(); d.remove(); return {em,wood}; });
  ok(pen.em[0]&&pen.em[0].t==='goal'&&pen.em[0].inNet, 'penalty goal ends in the net');
  ok(pen.em[1]&&pen.em[1].t==='save', 'saved penalty is shown as a save');
  ok(pen.em[2]&&pen.em[2].t==='miss'&&!pen.em[2].inNet, 'missed penalty stays out');
  ok(pen.wood, 'a shot at the post rebounds off the frame');
  // Season Wrapped
  await page.evaluate(()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<220){ const f=userFixture(C); if(f){ const M=startMatch(C,f.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); } App.route='office'; App.params={}; render(); });
  await page.waitForTimeout(500);
  ok(await page.$('.wr-banner'), 'the Office shows the Season Wrapped banner at season end');
  await page.click('.wr-banner [data-a="wrapped"]'); await page.waitForTimeout(700);
  const n=await page.evaluate(()=>App.wr&&App.wr.S.length);
  ok(n>=6, 'the story has at least six cards ('+n+')');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>App.wr.i===1), 'arrow keys move through the story');
  await page.evaluate(()=>A.wrGo({dataset:{v:App.wr.S.length-1}})); await page.waitForTimeout(300);
  ok(await page.$('#wr-root [data-a="wrSave"]'), 'the last card offers Save image');
  const dl=page.waitForEvent('download',{timeout:8000}).catch(()=>null); await page.click('#wr-root [data-a="wrSave"]'); const got=await dl;
  ok(got&&/wrapped\.png$/.test(got.suggestedFilename()), 'Save image downloads a PNG ('+(got?got.suggestedFilename():'none')+')');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(!(await page.$('#wr-root')), 'Escape closes the story');
  const yr=await page.evaluate(()=>App.C.year);
  await page.evaluate(()=>{ rollover(App.C); App.route='history'; render(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(y=>!!(App.C.wrapped&&App.C.wrapped[y]),yr), 'the season is kept after rollover');
  ok(await page.$(`.wr-hist [data-yr="${yr}"]`), 'History lists the wrapped season');
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ERRORS none'); console.log(fails?fails+' FAILED':'ALL PASS');
  await browser.close(); process.exit(fails||errs.length?1:0);
})();
