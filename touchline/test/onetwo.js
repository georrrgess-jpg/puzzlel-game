// The give-and-go (v18.11, src/v17/91_onetwo.js): a forced one-two in the lab (into a goal and in open play, 2-D, and a 3-D
// smoke run): A plays it into B, A runs, B returns it first time, the return reaches A at his boot past his marker, who reacts
// late; the caption fires. A live 2-D match at 2x: at least one one-two, every goal (minute, scorer, side, score) identical to
// the engine's own run of the match, one-two goals named "One-two finish" when nothing else applies, no page errors.
// The pick is deterministic. Usage: node test/onetwo.js [lab|lab3d|live|all]   (default all).
const { chromium, DIST } = require('./_pw');
const fs=require('fs'); const SH='test/shots/v1811/onetwo/'; fs.mkdirSync(SH,{recursive:true});
const only=process.argv[2]||'all'; const want=k=>only==='all'||only===k;
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function labSuite(browser,three){ const tag=three?'3d':'2d';
  const page=await browser.newPage({viewport:{width:1100,height:680}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  await page.evaluate(t=>{ PREFS.renderer=t?'3d':'2d'; V1811O.log.length=0; window.__caps=[]; window.__launch=[]; labRun('onetwo'); },three);
  await page.waitForFunction(()=>App.labSt&&App.labSt.players.size>0,null,{timeout:20000});
  await page.evaluate(()=>{ const st=App.labSt; const c=st.onCaption; st.onCaption=function(t,k){ window.__caps.push(t); return c.apply(this,arguments); };
    const L=st.launch; st.launch=function(p,o){ if(p&&o&&o.home) window.__launch.push({from:p.pid,to:o.home.pid,t:this.now,ph:this._v1811o?this._v1811o.ph:null}); return L.apply(this,arguments); }; });
  const need=three?1:4; await page.waitForFunction(n=>V1811O.log.filter(l=>l.k==='got').length>=n,need,{timeout:three?300000:150000}).catch(()=>{});
  const R=await page.evaluate(()=>({log:V1811O.log.slice(),caps:window.__caps.slice(),launch:window.__launch.slice()}));
  await page.screenshot({path:`${SH}lab_${tag}.png`});
  const gives=R.log.filter(l=>l.k==='give'), gots=R.log.filter(l=>l.k==='got');
  console.log(tag,JSON.stringify(gots.map(g=>({goal:g.goal,d:+g.d.toFixed(2),beyond:g.beyond==null?null:+g.beyond.toFixed(1),run:+(g.run||0).toFixed(1),late:g.late}))));
  ok(gots.length>=need&&(three||(gots.some(g=>g.goal)&&gots.some(g=>!g.goal))), `${tag} lab: ${gots.length} one-twos completed (${gots.filter(g=>g.goal).length} into a goal, ${gots.filter(g=>!g.goal).length} in open play)`);
  /* each give is A -> B and is followed by B -> A */
  const pairs=gives.filter(g=>R.launch.some(l=>l.from===g.a&&l.to===g.b)&&R.launch.some(l=>l.from===g.b&&l.to===g.a&&l.t>g.t));
  ok(pairs.length>=gots.length&&gots.length>0, `${tag} lab: every one-two is a pass A to B and B straight back to A (${pairs.length})`);
  ok(gots.length>0&&gots.every(g=>g.d<1), `${tag} lab: the return pass reaches A within 1 m of his boot (worst ${Math.max(...gots.map(g=>g.d)).toFixed(2)} m)`);
  ok(gots.length>0&&gots.every(g=>g.run>=3), `${tag} lab: A runs on after his pass (${gots.map(g=>g.run.toFixed(1)).join(', ')} m by the return)`);
  ok(gots.length>0&&gots.every(g=>g.beyond!=null&&g.beyond>0), `${tag} lab: A collects beyond his marker (${gots.map(g=>g.beyond.toFixed(1)).join(', ')} m past him)`);
  ok(gots.length>0&&gots.every(g=>g.late), `${tag} lab: the marker reacts late (holds, then turns and chases)`);
  const caps=R.caps.filter(c=>c==='ONE-TWO!').length; ok(caps>=gots.length&&caps>0, `${tag} lab: caption ONE-TWO! (${caps})`);
  ok(errs.length===0, `${tag} lab: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

async function liveSuite(browser){
  const page=await browser.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Wall Coach'); await page.fill('#nc-seed',process.env.O2SEED||'o2live8');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const pre=await page.evaluate(()=>{ PREFS.renderer='2d'; const C=App.C; const f=userFixture(C); const cl=JSON.parse(JSON.stringify(C)); const od=oddsFor(f.id); const v=validateLineup(cl,cl.userSid,'V'); if(!v.ok) repairLineup(cl,cl.userSid,'V');
    const M=startMatch(cl,f.id,{halftime:false,preP:[od.h,od.a]}); runToEnd(cl,M);
    const g=M.ev.filter(e=>e.t==='goal'); return {goals:g.map(e=>[e.m,e.pid,e.s,e.sc.join('-')]),pick:g.map(e=>v1811oPick(e)),pick2:g.map(e=>v1811oPick(JSON.parse(JSON.stringify(e)))),all:M.ev.filter(e=>e.t!=='goal').map(e=>[e.m,e.t,e.pid||'',e.s]).length}; });
  await page.evaluate(()=>{ V1811O.log.length=0; V1811O.n={goal:0,open:0}; const X=window.__ox={goals:[],caps:[]};
    const E0=window.liveEmit; window.liveEmit=function(e){ const st=App.live&&App.live.stage, O=st&&st._v1811o; const r=E0.apply(this,arguments);
      if(e.t==='goal'){ const sub=document.querySelector('#lv-banner .gb-sub'); X.goals.push({m:e.m,o2:!!(O&&O.e===e&&O.ph>=3),sty:e.sty,banner:sub?sub.textContent:''}); } return r; };
    const C0=window.liveCaption; window.liveCaption=function(t,k){ X.caps.push(t); return C0.apply(this,arguments); }; });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
  await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  const t0=Date.now(); let shot=0;
  while(Date.now()-t0<900000){ if(await page.$('#lv-ht .htbox')){ await page.click('#ht-go').catch(()=>{}); await sleep(300); } if(await page.$('#lv-cont')) break;
    if(!shot&&await page.evaluate(()=>{ const st=App.live&&App.live.stage, O=st&&st._v1811o; return !!(O&&O.ph===3&&O.ret); })){ shot=1; await page.screenshot({path:`${SH}live_2d_wall.png`}); }
    await sleep(250); }
  const R=await page.evaluate(()=>{ const L=App.live; return {X:window.__ox,n:V1811O.n,st:V1811O.st,min:L.M.min,done:!!L.done,ev:L.M.ev.filter(e=>e.t==='goal').map(e=>[e.m,e.pid,e.s,e.sc.join('-')]),all:L.M.ev.filter(e=>e.t!=='goal').map(e=>[e.m,e.t,e.pid||'',e.s]).length,feed:L.feed.map(f=>f.txt).filter(t=>/one-two/i.test(t)),
    log:V1811O.log.filter(l=>l.k==='got')}; });
  console.log('live',JSON.stringify({n:R.n,st:R.st,min:R.min,goals:R.X.goals,feed:R.feed,pick:pre.pick,got:R.log.map(g=>({goal:g.goal,d:+g.d.toFixed(2),beyond:g.beyond==null?null:+g.beyond.toFixed(1)}))}));
  ok(R.done, `live: the match played to full time (minute ${R.min})`);
  ok(JSON.stringify(R.ev)===JSON.stringify(pre.goals)&&R.all===pre.all, `live: goals (minute, scorer, side, score) and the number of other events identical to the engine's own run (${R.ev.length} goals, ${R.all} other events)`);
  ok(R.n.open+R.n.goal>=1, `live: at least one one-two at 2x (seed o2live8 has a goal picked for one; ${R.n.open} in open play, ${R.n.goal} into goals)`);
  ok(R.log.every(g=>g.d<1&&(g.beyond==null||g.beyond>-1)), `live: each return pass reaches the runner (worst ${R.log.length?Math.max(...R.log.map(g=>g.d)).toFixed(2):'-'} m)`);
  const o2=R.X.goals.filter(g=>g.o2); ok(o2.every(g=>g.sty==='onetwo'?/One-two finish/.test(g.banner):true), `live: one-two goals tagged and named (${o2.map(g=>g.sty+' / '+g.banner).join('; ')||'none this match'})`);
  ok(o2.length>=1&&o2.length===R.feed.length, `live: a commentary line for each one-two goal (${R.feed.length})`);
  ok(JSON.stringify(pre.pick)===JSON.stringify(pre.pick2), `pick is deterministic (${pre.pick.join(',')})`);
  ok(errs.length===0, `live: no page errors${errs.length?' '+errs.slice(0,3).join(' | '):''}`);
  await page.close(); }

(async()=>{ const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  try{ if(want('lab')) await labSuite(browser,false); if(want('lab3d')) await labSuite(browser,true); if(want('live')) await liveSuite(browser); }
  catch(e){ console.log('FAIL exception '+(e&&e.stack||e)); fails++; }
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0); })();
