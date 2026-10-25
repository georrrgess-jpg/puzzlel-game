// v18.9 crowd (src/v17/89_crowd.js): the bank renders after the first gesture (murmur first), every asset is there and
// at a sane level; a live match starts the new crowd (looping murmur and the raised-voice loop, sized by attendance) and
// it is audible; excitement brings the raised voices in and brightens it, a penalty hush quiets it; a home goal roars
// (two layers on the goal channel), an away goal gets a small cheer and a groan; misses, saves and cards use the new
// reactions; the mixer's switches still silence each group; stopping the match stops the crowd; no page errors.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[];
  page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load/.test(m.text())) errs.push('console '+m.text()); if(/v18.9 crowd/.test(m.text())) errs.push(m.text()); });
  await page.goto(DIST); await page.waitForTimeout(600);
  ok(await page.evaluate(()=>!V189.busy&&!V189.done), 'nothing is rendered before the first gesture');
  const t0=Date.now(); await page.mouse.click(5,5);
  await page.waitForFunction(()=>V189.bank&&V189.bank.hot||V189.failed,null,{timeout:120000}).catch(()=>{}); const tBed=Date.now()-t0;
  await page.waitForFunction(()=>V189.done||V189.failed,null,{timeout:180000}).catch(()=>{}); const tAll=Date.now()-t0;
  const A=await page.evaluate(()=>{ const B=V189.bank||{}, r={}; for(const k of ['bed','hot','roar','ooh','aww','boo','applause','chant','shouts']){ const x=B[k]; if(!x){ r[k]=null; continue; } let s=0,n=0,pk=0; for(let c=0;c<x.numberOfChannels;c++){ const d=x.getChannelData(c); for(let i=0;i<d.length;i+=7){ s+=d[i]*d[i]; n++; pk=Math.max(pk,Math.abs(d[i])); } } r[k]={dur:+x.duration.toFixed(1),rms:+Math.sqrt(s/n).toFixed(3),pk:+pk.toFixed(2)}; } return {r,failed:!!V189.failed,spans:(B.spans||[]).length}; });
  console.log('bank',JSON.stringify({tBed,tAll,...A}));
  ok(!A.failed&&Object.values(A.r).every(x=>x&&x.rms>0.03&&x.rms<0.3&&x.pk<=0.97), `the crowd bank renders, every asset at a sane level (murmur ready in ${(tBed/1000).toFixed(1)} s, all in ${(tAll/1000).toFixed(1)} s)`);
  ok(tAll<90000, 'the whole bank is ready well before a first match would normally start (< 90 s headless)');
  ok(A.spans>=8, `single shouts from the stands (${A.spans})`);
  /* a live match */
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Crowd Coach'); await page.fill('#nc-seed','crowd1');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400); await page.click('[data-a="pvSpeed"][data-v="2"]').catch(()=>{}); await page.click('[data-a="kickoff"]'); await page.waitForTimeout(3000);
  const L=await page.evaluate(()=>{ const c=Sound.crowd; return c?{v189:!!c.v189,size:+c.size.toFixed(2),att:App.live.M.att,loops:!!(c.bed&&c.hot&&c.bed.s.loop&&c.hot.s.loop)}:null; });
  ok(L&&L.v189&&L.loops, `the live match starts the new crowd: the murmur and the raised-voice loop, looping (${JSON.stringify(L)})`);
  const level=()=>page.evaluate(()=>new Promise(res=>{ const S=Sound; if(!S._can){ S._can=S.ctx.createAnalyser(); S._can.fftSize=2048; S.ch.crowd.connect(S._can); } const a=S._can, d=new Float32Array(a.fftSize); let m=0, n=0; const id=setInterval(()=>{ a.getFloatTimeDomainData(d); let s=0; for(const v of d) s+=v*v; m+=Math.sqrt(s/d.length); if(++n>=10){ clearInterval(id); res(m/n); } },50); }));
  const l0=await level(); ok(l0>0.004, `the crowd is audible (${l0.toFixed(4)})`);
  /* excitement: the raised voices come in */
  const X=await page.evaluate(()=>new Promise(res=>{ const S=Sound, c=S.crowd; const h0=c.hot.g.gain.value, f0=c.lp.frequency.value; const st=App.live.stage; st.paused=true; S.crowdExcite(1); setTimeout(()=>{ res({h0,h1:c.hot.g.gain.value,f0,f1:c.lp.frequency.value}); S.crowdExcite(0); st.paused=false; },2500); }));
  ok(X.h1>X.h0+0.5&&X.f1>X.f0+2000, `an attack near goal brings the raised voices in and brightens the crowd (hot ${X.h0.toFixed(2)} -> ${X.h1.toFixed(2)}, lowpass ${Math.round(X.f0)} -> ${Math.round(X.f1)} Hz)`);
  const H=await page.evaluate(()=>new Promise(res=>{ const S=Sound, c=S.crowd; const st=App.live.stage; st.paused=true; S.hush(true); setTimeout(()=>{ const g=c.g.gain.value; S.hush(false); setTimeout(()=>{ res({g,back:c.g.gain.value}); st.paused=false; },1500); },1500); }));
  ok(H.g<0.25&&H.back>H.g*1.5, `a penalty hushes the crowd and it comes back (${H.g.toFixed(2)} -> ${H.back.toFixed(2)})`);
  /* reactions and goals, spied on the playback call */
  const G=await page.evaluate(()=>{ const S=Sound, B=V189.bank, seen=[]; const P0=S.v189Play; S.v189Play=function(buf,o){ const k=Object.keys(B).find(k=>B[k]===buf); seen.push({k,vol:+(o&&o.vol||0).toFixed(2),goal:!!(o&&o.dest===S.ch.goal)}); return P0.apply(this,arguments); };
    const r={}; const take=f=>{ seen.length=0; f(); return seen.slice(); };
    S.v189Side='home'; r.home=take(()=>S.goal()); S.v189Side='away'; r.away=take(()=>S.goal()); S.v189Side=null;
    r.miss=take(()=>{ S.miss(); }); r.save=take(()=>{ performance.now(); S.save(); }); r.card=take(()=>S.boo()); S.v189Play=P0; return r; });
  console.log('reactions',JSON.stringify(G));
  ok(G.home.filter(x=>x.k==='roar'&&x.goal).length===2&&G.home.some(x=>x.vol>=1), 'a home goal: the whole ground roars (two roar layers on the goal channel)');
  ok(G.away.some(x=>x.k==='roar'&&x.vol<0.5)&&G.away.some(x=>x.k==='aww'), 'an away goal: a small cheer from the away end and a groan from the rest');
  ok(G.miss.some(x=>x.k==='ooh'||x.k==='aww'), 'a miss: an "ooh" or a groan');
  ok(G.card.some(x=>x.k==='boo'), 'a card: boos');
  /* the mixer still rules */
  const M=await page.evaluate(()=>{ const S=Sound, fx=PREFS.sound.fx||(PREFS.sound.fx={}); const B=V189.bank, seen=[]; const P0=S.v189Play; S.v189Play=function(buf){ seen.push(Object.keys(B).find(k=>B[k]===buf)); return P0.apply(this,arguments); };
    fx.reactions=false; fx.goal=false; fx.chants=false; S.ooh(1); S.boo(); S.v189Side='home'; S.goal(); S.v189Side=null; const off=seen.slice(); fx.reactions=true; fx.goal=true; fx.chants=true;
    fx.crowd=false; S.crowdStop(); S.crowdStart(); const noCrowd=!S.crowd; fx.crowd=true; S.crowdStart(); S.v189Play=P0; return {off,noCrowd,back:!!(S.crowd&&S.crowd.v189)}; });
  ok(M.off.length===0&&M.noCrowd&&M.back, `the mixer switches still silence reactions, the goal roar, chants and the crowd (${JSON.stringify(M)})`);
  /* leaving the match */
  await page.evaluate(()=>{ Sound.crowdStop(); }); await sleep(300); ok(await page.evaluate(()=>!Sound.crowd), 'stopping the match stops the crowd');
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
