// v18.12 Gameday Graphics (src/v17/96_gameday.js): the program feed is built from real fixtures, results and milestones (and
// capped, and off when the toggle is off); every template renders a non-blank poster of the right size in every style; the
// player is posed in ONE hidden 3-D renderer (pixels drawn, no context left behind, the 2-D figure when 3-D fails); Save image
// downloads a real PNG; pins persist through save and reload; old saves migrate; the route, template/style/pose controls, feed
// strip, Office card, Poster buttons and the phone layout work; no page errors.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
async function career(page,seed){ await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Gameday Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); }
const SIM=n=>{ const C=App.C; for(let i=0;i<n;i++){ simRound(C); try{ advance(C); }catch(e){} } };
const SEASON=()=>{ const C=App.C; let n=0; while(C.phase!=='offseason'&&n<80){ simRound(C); let ev=null; try{ ev=advance(C); }catch(e){} n++; if(!ev) break; } };
const pngSize=buf=>({sig:buf.slice(0,8).toString('hex'),w:buf.readUInt32BE(16),h:buf.readUInt32BE(20)});
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true}); const page=await ctx.newPage(); const errs=[];
  page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,300)); });
  /* count every WebGL context the page makes, and whether it is still alive */
  await page.addInitScript(()=>{ window.__gl=[]; const gc=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(t,...a){ const c=gc.call(this,t,...a); if(c&&/webgl/i.test(String(t))) window.__gl.push(c); return c; }; });
  await career(page,'gd-t1');

  /* ---- a new career ---- */
  ok(await page.evaluate(()=>{ const B=v1812gBox(App.C); return B.on===true&&B.st==='varsity'&&Array.isArray(B.feed)&&Array.isArray(B.pins); }), 'a new career has the defaults (automatic on, varsity style, empty pins)');
  ok(await page.evaluate(()=>{ const t=TOPNAV.find(x=>x[0]==='school'); return t[3].includes('gameday')&&NAV.some(x=>x[0]==='gameday')&&TITLES.gameday==='Gameday Graphics'; }), 'Gameday Graphics is in the Club menu and the side navigation');
  await page.evaluate(()=>{ App.route='office'; render(); });
  ok(await page.evaluate(()=>{ const B=App.C.gd; return B.feed.length>=1&&B.feed.every(e=>e.k==='gameday')&&B.feed[0].id==='GD:'+userFixture(App.C).id; }), 'the first game gets its Gameday poster (an entry of parameters)');
  ok(await page.evaluate(()=>!!document.querySelector('.v1812g-off')), 'the Overview shows the Gameday Graphics card');

  /* ---- the feed from a played season ---- */
  await page.evaluate(`(${SIM})(14)`);
  const F=await page.evaluate(()=>{ const C=App.C, u=C.userSid, B=C.gd; const mine=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&(f.h===u||f.a===u));
    const fin=B.feed.filter(e=>e.k==='final'), gd=B.feed.filter(e=>e.k==='gameday'), ms=B.feed.filter(e=>e.k==='milestone'), pw=B.feed.filter(e=>e.k==='potw');
    const finIds=new Set(fin.map(e=>e.fid)); const gdIds=gd.map(e=>e.fid);
    const bad=[]; for(const e of fin){ const f=C.fixtures[e.fid]; if(!f||f.lvl!=='V'||(f.h!==u&&f.a!==u)||f.st!=='d') bad.push('final '+e.id); const lg=C.logs[e.fid]; const goals=lg.ev.filter(x=>x.t==='goal').length; if(e.m.sc.length!==goals) bad.push('scorers '+e.id); if(e.m.pm){ const i=f.h===u?0:1; const best=Math.max(...lg.box[i].filter(r=>r.gp!==0).map(r=>r.rt||0)); if(Math.abs(e.m.pm.rt-Math.round(best*10)/10)>0.051) bad.push('potm '+e.id); } }
    for(const e of gd){ const f=C.fixtures[e.fid]; if(!f||f.lvl!=='V'||(f.h!==u&&f.a!==u)) bad.push('gameday '+e.id); }
    for(const e of pw){ const p=findPerson(C,e.pid); if(!p||p.sid!==u) bad.push('potw '+e.id); }
    return {mine:mine.length,fin:fin.length,finUniq:finIds.size,gd:gd.length,gdUniq:new Set(gdIds).size,ms:ms.length,pw:pw.length,bad,total:B.feed.length,nw:B.feed.filter(e=>e.nw).length,tags:gd.map(e=>JSON.stringify(v1812gTags(C,C.fixtures[e.fid]))).slice(0,4)}; });
  console.log(JSON.stringify(F));
  ok(F.fin===F.mine&&F.finUniq===F.fin&&F.mine>0, `one Final poster per finished Varsity game of the school (${F.fin} of ${F.mine}), none for other schools or levels`);
  ok(F.gd>=F.mine&&F.gd===F.gdUniq, `a Gameday poster before every Varsity game, once each (${F.gd})`);
  ok(F.pw>0, `Player of the Week posters from completed weeks (${F.pw})`);
  ok(F.bad.length===0, 'every entry points at a real Varsity game of the school; scorers match the match log; player of the match is the best rating on the user\'s side'+(F.bad.length?': '+F.bad.slice(0,4).join(', '):''));
  ok(F.nw>0, 'new entries are marked new (badge)');
  ok(await page.evaluate(()=>navBadges(App.C).gameday!=null), 'the navigation shows a badge for the new posters');
  ok(await page.evaluate(()=>JSON.stringify(App.C.gd).length<24000), 'the stored feed stays small (parameters only, '+await page.evaluate(()=>JSON.stringify(App.C.gd).length)+' bytes)');

  /* ---- milestones: independent recount from the match logs ---- */
  await page.evaluate(`(${SEASON})()`); await page.evaluate(()=>{ const C=App.C; rollover(C); }); await page.evaluate(`(${SIM})(14)`); await page.evaluate(`(${SEASON})()`);
  const MS=await page.evaluate(()=>{ const C=App.C, u=C.userSid, B=C.gd; const dnMs=B.dn.filter(id=>id.startsWith('MS:')); const fx=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&f.comp!=='pre'&&(f.h===u||f.a===u)).sort((a,b)=>a.yr-b.yr||(a.id<b.id?-1:1));
    /* order games the way they were played: by year, then phase order, round, id */
    const ord={reg:1,sec:2,rgn:3,st:4}; fx.sort((a,b)=>a.yr-b.yr||ord[a.comp]-ord[b.comp]||a.rd-b.rd||(a.id<b.id?-1:1));
    const tot={}, exp=new Set(); let wins=0; const co=C.coaches[C.userCoachId];
    const th={g:[10,25,50,100],a:[25,50],cs:[10,25,50]}; const nm={g:'goals',a:'ast',cs:'cs'}; const pr={goals:1000,ast:300,cs:400,hat:500,first:100};
    for(const f of fx){ const lg=C.logs[f.id]; if(!lg||!lg.box) continue; const i=f.h===u?0:1; const conc=i===0?f.ag:f.hg; const items=[];
      for(const r of lg.box[i]){ if(r.gp===0) continue; const t=tot[r.pid]||(tot[r.pid]={g:0,a:0,cs:0}); const prev={...t}; t.g+=r.g||0; t.a+=r.a||0; if(conc===0&&r.role==='GK') t.cs++; const found=[];
        for(const k of ['g','a','cs']) for(const T of th[k]) if(prev[k]<T&&t[k]>=T) found.push({id:`MS:${r.pid}:${nm[k]}:${T}`,pr:pr[nm[k]]+T});
        if((r.g||0)>=3) found.push({id:`MS:${r.pid}:hat:${r.g}:${f.id}`,pr:500+r.g}); if(prev.g===0&&t.g>0) found.push({id:`MS:${r.pid}:first:1:${f.id}`,pr:100});
        found.sort((a,b)=>b.pr-a.pr); if(found.length) items.push(found[0]); }
      if(f.w===u){ wins++; if([10,25,50,100].includes(wins)){ const pm=(()=>{ let best=null; for(const r of lg.box[i]){ if(r.gp===0) continue; if(!best||(r.rt||0)>(best.rt||0)||((r.rt||0)===(best.rt||0)&&(r.g||0)>(best.g||0))) best=r; } return best; })(); if(pm) items.push({id:`MS:${pm.pid}:wins:${wins}`,pr:200+wins}); } }
      items.sort((a,b)=>b.pr-a.pr); for(const it of items.slice(0,2)) exp.add(it.id); }
    const got=new Set(dnMs); const missing=[...exp].filter(x=>!got.has(x)), extra=[...got].filter(x=>!exp.has(x));
    const kinds={}; for(const id of dnMs){ const k=id.split(':')[2]; kinds[k]=(kinds[k]||0)+1; }
    const coachWins=Object.values(co.rec).reduce((s,y)=>s+(y.w||0),0);
    /* the milestone entries agree with the career totals of the players themselves */
    const all=[...Object.values(C.players),...Object.values(C.alumni)].filter(p=>p.sid===u); let totalBad=[]; for(const p of all){ const T=careerTotals(p,'V'); for(const x of th.g) if(T.g>=x&&!got.has(`MS:${p.id}:goals:${x}`)&&!(exp.size===0)) totalBad.push(p.id+' goals '+x+' of '+T.g); }
    return {n:exp.size,got:got.size,missing,extra,kinds,coachWins,totalBad:totalBad.slice(0,4)}; });
  console.log(JSON.stringify(MS));
  ok(MS.n>0&&MS.missing.length===0&&MS.extra.length===0, `milestones detected from the match logs equal an independent recount (${MS.n}: ${JSON.stringify(MS.kinds)})`);
  ok(MS.totalBad.length===0, 'every goals milestone a player\'s career total has passed was made'+(MS.totalBad.length?': '+MS.totalBad.join(', '):''));
  ok(await page.evaluate(()=>{ const B=App.C.gd; return B.feed.length<=V1812G.cap; }), `the feed is capped at ${await page.evaluate(()=>V1812G.cap)} entries (now ${await page.evaluate(()=>App.C.gd.feed.length)})`);

  /* ---- senior night and the hall of fame ---- */
  ok(await page.evaluate(()=>{ const B=App.C.gd; return B.dn.some(id=>id.startsWith('SN:')); }), 'a Senior Night poster was made before the last home game of a season');
  await page.evaluate(()=>{ const C=App.C; const u=C.userSid; const p=Object.values(C.players).filter(q=>q.sid===u).sort((a,b)=>ovr(b)-ovr(a))[0]; C._hofQ=[{pid:p.id,sid:u,yr:C.year,num:p.num,name:pname(p),pos:p.pos,sc:60,g:30,a:12,sv:0,cs:0,gp:40,awards:['mvp'],titles:[]}]; hofInduct(C,C.year); window.__hofP=p.id; V1812G.syncSig=null; v1812gSync(C); });
  ok(await page.evaluate(()=>App.C.gd.feed.some(e=>e.k==='hof'&&e.pid===window.__hofP)), 'a Hall of Fame poster is made for an inducted player');

  /* ---- toggle off: nothing is created ---- */
  const before=await page.evaluate(()=>({n:App.C.gd.feed.length,dn:App.C.gd.dn.join(',')}));
  await page.evaluate(()=>{ App.route='gameday'; render(); }); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const el=document.querySelector('[data-c="v1812gAuto"]'); el.checked=false; el.dispatchEvent(new Event('change',{bubbles:true})); }); await page.waitForTimeout(200);
  await page.evaluate(()=>{ const C=App.C; rollover(C); }); await page.evaluate(`(${SIM})(6)`);
  const off=await page.evaluate(()=>({n:App.C.gd.feed.length,dn:App.C.gd.dn.join(','),on:App.C.gd.on,played:Object.values(App.C.fixtures).filter(f=>f.st==='d'&&f.yr===App.C.year).length}));
  ok(off.on===false&&off.played>0&&off.n===before.n&&off.dn===before.dn, 'with "Make these automatically each week" off, playing games creates no posters');
  await page.evaluate(()=>{ const el=document.querySelector('[data-c="v1812gAuto"]'); el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); }); await page.waitForTimeout(200);
  ok(await page.evaluate(()=>{ const uf=userFixture(App.C); return App.C.gd.on===true&&!!uf&&App.C.gd.feed.some(e=>e.id==='GD:'+uf.id); }), 'turning it back on makes the next Gameday poster');

  /* ---- the 3-D player: ONE hidden renderer, pixels, the 2-D fallback ---- */
  const gl0=await page.evaluate(()=>window.__gl.length);
  const cap=await page.evaluate(async()=>{ const C=App.C; const u=C.userSid; const p=Object.values(C.players).find(q=>q.sid===u&&q.pos!=='GK'); const star=v1812gStar(C,p.id,null); const out={};
    for(const pose of ['hips','cross','shot','airplane','backflip','fist','hold','salute','bust']){ const c=v1812gCapture3D(star,pose,520,{}); out[pose]=c?{r3d:c.r3d,w:c.cv.width,h:c.cv.height,n:v1812gOpaque(c.cv),feet:c.feet.map(Math.round)}:null; }
    const g=window.__gl.filter(x=>!x.isContextLost()).length; const builds=V1812G.builds; return {out,alive:g,builds}; });
  console.log(JSON.stringify(cap));
  ok(Object.values(cap.out).every(x=>x&&x.r3d&&x.n>9000), 'all nine poses render through the 3-D figure pipeline with pixels drawn ('+Object.entries(cap.out).map(([k,v])=>k+':'+(v&&v.n)).join(' ')+')');
  ok(cap.out.airplane.w>cap.out.cross.w, 'a pose with wide arms gets a wider frame (airplane '+cap.out.airplane.w+' vs crossed arms '+cap.out.cross.w+')');
  ok(cap.alive<=1&&cap.builds>=1, `a single hidden WebGL context serves them all (${cap.alive} alive, ${cap.builds} build${cap.builds===1?'':'s'})`);
  const two=await page.evaluate(async()=>{ const C=App.C; const p=Object.values(C.players).find(q=>q.sid===C.userSid&&q.pos!=='GK'); const star=v1812gStar(C,p.id,null); V1812G.force2d=true; V1812G.cuts.clear(); const c=await v1812gCutout(star,'hips',520,{}); const r={r3d:c.r3d,n:v1812gOpaque(c.cv),w:c.cv.width};
    /* 3-D throws: the capture falls back to the 2-D figure, and posters still come out */
    V1812G.force2d=false; V1812G.fail=false; V1812G.fail3=0; V1812G.cuts.clear(); const orig=v1812gCapture3D; v1812gCapture3D=()=>{ throw new Error('boom'); }; const c2=await v1812gCutout(star,'cross',520,{}); const e=v1812gCur(C); const M=v1812gModel(C,e); const cv=await v1812gPoster(M,'varsity',{fmt:'portrait'}); v1812gCapture3D=orig; V1812G.fail=false; V1812G.fail3=0;
    const stat=v1812gStats(cv); return {two:r,thrown:{r3d:c2.r3d,n:v1812gOpaque(c2.cv)},poster:{w:cv.width,h:cv.height,meta:cv._gd,stat}}; });
  ok(!two.two.r3d&&two.two.n>3000, 'the 2-D figure fallback draws the player when 3-D is switched off ('+two.two.n+' px)');
  ok(!two.thrown.r3d&&two.thrown.n>3000&&two.poster.w===1080&&two.poster.h===1350&&two.poster.stat.colors>300, 'when the 3-D capture throws, a full poster is still made with the 2-D figure');
  /* the context is lost while posters are being made: the renderer is dropped, later posters use the 2-D figure */
  const lost=await page.evaluate(async()=>{ const C=App.C; const p=Object.values(C.players).find(q=>q.sid===C.userSid&&q.pos!=='GK'); const star=v1812gStar(C,p.id,null); V1812G.cuts.clear(); V1812G.fail=false; const c1=await v1812gCutout(star,'fist',480,{}); const had=!!V1812G.P&&c1.r3d;
    V1812G.P.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})); const after={P:!!V1812G.P,fail:V1812G.fail}; V1812G.cuts.clear(); const c2=await v1812gCutout(star,'fist',480,{}); const M=v1812gModel(C,v1812gCur(C)); const cv=await v1812gPoster(M,'chrome',{fmt:'square'}); V1812G.fail=false; V1812G.cuts.clear();
    return {had,after,c2:{r3d:c2.r3d,n:v1812gOpaque(c2.cv)},poster:{w:cv.width,h:cv.height,colors:v1812gStats(cv).colors},alive:window.__gl.filter(x=>!x.isContextLost()).length}; });
  ok(lost.had&&!lost.after.P&&lost.after.fail&&!lost.c2.r3d&&lost.c2.n>3000&&lost.poster.h===1080&&lost.poster.colors>250&&lost.alive===0, 'a lost WebGL context drops the renderer and posters carry on with the 2-D figure ('+JSON.stringify({after:lost.after,r3d:lost.c2.r3d,alive:lost.alive})+')');
  /* idle: the renderer is released */
  await page.waitForTimeout(11500);
  const idle=await page.evaluate(()=>({alive:window.__gl.filter(x=>!x.isContextLost()).length,P:!!V1812G.P,made:window.__gl.length}));
  ok(idle.alive===0&&!idle.P, `after 8 s idle the renderer is disposed and its WebGL context lost (${idle.alive} alive of ${idle.made} ever made)`);

  /* ---- every template x style x format ---- */
  const R=await page.evaluate(async()=>{ const C=App.C; const B=v1812gBox(C); const rows=[]; const t0=performance.now();
    for(const k of ['gameday','final','milestone','potw','senior','hof']){ let e=B.feed.filter(x=>x.k===k).sort((a,b)=>b.t-a.t)[0]; const pv=!e; if(!e) e=v1812gPreviewEntry(C,k); if(!e){ rows.push({k,err:'no entry'}); continue; }
      for(const st of ['varsity','chrome','news']){ const M=v1812gModel(C,e); const cv=await v1812gPoster(M,st,{fmt:'portrait'}); const s=v1812gStats(cv); rows.push({k,st,w:cv.width,h:cv.height,colors:s.colors,sd:Math.round(s.sd),pv,meta:cv._gd,id:e.id}); }
      const M2=v1812gModel(C,e); const sq=await v1812gPoster(M2,'varsity',{fmt:'square'}); rows.push({k,st:'sq',w:sq.width,h:sq.height,colors:v1812gStats(sq).colors,id:e.id}); }
    return {rows,ms:Math.round(performance.now()-t0),builds:V1812G.builds}; });
  console.log('posters in '+R.ms+' ms, renderer builds '+R.builds);
  ok(R.rows.every(r=>!r.err), 'every template has a real fixture/result/milestone to draw'+R.rows.filter(r=>r.err).map(r=>' (missing '+r.k+')').join(''));
  ok(R.rows.filter(r=>r.st&&r.st!=='sq').every(r=>r.w===1080&&r.h===1350&&r.colors>250&&r.sd>25), `18 posters (6 templates x 3 styles) are 1080 x 1350 and not blank (${R.rows.filter(r=>r.st&&r.st!=='sq').length} drawn)`);
  ok(R.rows.filter(r=>r.st==='sq').every(r=>r.w===1080&&r.h===1080&&r.colors>400), 'the square 1080 x 1080 option works for every template');
  ok(R.rows.filter(r=>r.meta&&r.st==='varsity').every(r=>r.meta.r3d), 'the posters used the 3-D figure ('+R.rows.filter(r=>r.meta&&r.st==='varsity').map(r=>r.k+':'+(r.meta.r3d?'3d':'2d')).join(' ')+')');
  const pv=R.rows.filter(r=>r.pv&&r.st==='varsity').map(r=>r.k); console.log('previews (nothing in the feed yet):',pv.join(',')||'none');

  /* ---- the route ---- */
  await page.evaluate(()=>{ App.route='gameday'; App.params={}; V1812G.ui.tpl='final'; V1812G.ui.sel=null; V1812G.ui.cur=null; render(); }); await page.waitForFunction(()=>document.querySelector('.v1812g-cv'),null,{timeout:60000}); await page.waitForTimeout(500);
  const U=await page.evaluate(()=>({tpls:document.querySelectorAll('.v1812g-tpl').length,chips:document.querySelectorAll('.v1812g-chip').length,on:document.querySelector('.v1812g-tpl.on b').textContent,hero:/Program media/i.test(document.querySelector('.v1812g-hero').innerText),btns:[...document.querySelectorAll('.v1812g-acts .btn')].map(x=>x.textContent.trim()),meta:V1812G.ui.cur._gd}));
  ok(U.tpls===6&&U.chips===3&&/Final/.test(U.on)&&U.hero, 'the route shows six templates, three styles, the selected template and the Program media intro ('+U.btns.join(' | ')+')');
  ok(['Save image','Pin to the Office','Shuffle pose'].every(t=>U.btns.some(b=>b.includes(t))), 'Save image, Pin to the Office and Shuffle pose are there');
  ok(U.meta.k==='final'&&U.meta.style==='varsity', 'the big preview is the Final poster in the saved style');
  await page.click('.v1812g-tpl[data-k="milestone"]'); await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.cur._gd.k==='milestone',null,{timeout:60000});
  ok(await page.evaluate(()=>document.querySelector('.v1812g-tpl.on').dataset.k==='milestone'&&V1812G.ui.cur._gd.k==='milestone'), 'switching templates redraws the preview');
  await page.click('.v1812g-chip[data-v="news"]'); await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.cur._gd.style==='news',null,{timeout:60000});
  ok(await page.evaluate(()=>App.C.gd.st==='news'&&document.querySelector('.v1812g-chip.on').dataset.v==='news'), 'switching style redraws the preview and is remembered on the career');
  const p0=await page.evaluate(()=>V1812G.ui.cur._gd.pose); await page.click('[data-a="v1812gShuffle"]'); await page.waitForFunction(p=>V1812G.ui.cur&&V1812G.ui.cur._gd.pose!==p,p0,{timeout:60000});
  ok(await page.evaluate(p=>V1812G.ui.cur._gd.pose!==p,p0), 'Shuffle pose picks another pose ('+p0+' > '+await page.evaluate(()=>V1812G.ui.cur._gd.pose)+')');
  await page.click('[data-a="v1812gFmt"][data-v="square"]'); await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.cur._gd.fmt==='square',null,{timeout:60000});
  ok(await page.evaluate(()=>V1812G.ui.cur.height===1080&&document.querySelector('.v1812g-cvbox').classList.contains('sq')), 'the square format option');
  await page.click('[data-a="v1812gFmt"][data-v="portrait"]'); await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.cur._gd.fmt==='portrait',null,{timeout:60000});
  await page.click('.v1812g-chip[data-v="chrome"]'); await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.cur._gd.style==='chrome',null,{timeout:60000}); await page.waitForTimeout(3000);
  const th=await page.evaluate(()=>({n:document.querySelectorAll('.v1812g-th:not(.v1812g-more)').length,ready:document.querySelectorAll('.v1812g-strip canvas.v1812g-thc.ready').length,nb:document.querySelectorAll('.v1812g-nb canvas.v1812g-thc').length,feed:App.C.gd.feed.length}));
  ok(th.n===Math.min(12,th.feed)&&th.ready===th.n, `the Program feed strip shows ${th.n} thumbnails, all drawn`);
  await page.click('.v1812g-th:nth-child(2)'); await page.waitForTimeout(300); ok(await page.evaluate(()=>{ const e=App.C.gd.feed.slice().sort((a,b)=>b.t-a.t)[1]; return V1812G.ui.sel===e.id&&document.querySelector('.v1812g-th.on').dataset.id===e.id; }), 'a feed thumbnail opens that poster in the big preview');
  await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.curE&&V1812G.ui.curE.id===V1812G.ui.sel&&document.querySelector('#v1812g-cv canvas'),null,{timeout:60000});
  /* the parallax tilt follows the pointer */
  const box=await page.locator('.v1812g-frame').boundingBox(); await page.mouse.move(box.x+box.width*0.8,box.y+box.height*0.2); await page.waitForTimeout(150);
  ok(await page.evaluate(()=>{ const f=document.querySelector('.v1812g-frame'); return f.classList.contains('tilting')&&parseFloat(f.style.getPropertyValue('--ry'))>1; }), 'hovering the preview tilts it');
  await page.mouse.move(5,5); await page.waitForTimeout(150); ok(await page.evaluate(()=>!document.querySelector('.v1812g-frame').classList.contains('tilting')), 'the tilt resets when the pointer leaves');

  /* ---- save image: a PNG download, copy, the viewer fallback, download all ---- */
  await page.waitForFunction(()=>V1812G.ui.cur&&V1812G.ui.curKey===v1812gCurKey(App.C,v1812gCur(App.C)),null,{timeout:60000});
  const [dl]=await Promise.all([page.waitForEvent('download',{timeout:30000}),page.click('[data-a="v1812gSave"]')]);
  const nm=dl.suggestedFilename(); const path1=await dl.path(); const buf=require('fs').readFileSync(path1); const png=pngSize(buf);
  ok(/^touchline-[a-z-]+(-[a-z0-9-]+)?\.png$/.test(nm), 'Save image downloads a file named like touchline-<kind>-<detail>.png ('+nm+')');
  ok(png.sig==='89504e470d0a1a0a'&&png.w===1080&&png.h===1350&&buf.length>60000, `the download is a real 1080 x 1350 PNG (${Math.round(buf.length/1024)} KB)`);
  ok(await page.evaluate(()=>{ const e=App.C.gd.feed.find(x=>x.k==='gameday'&&x.wk); return v1812gFileName(App.C,e,'portrait')===`touchline-gameday-${e.wk.toLowerCase().replace(/[^a-z0-9]+/g,'')}.png`; }), 'gameday posters are named touchline-gameday-wk9.png style');
  await page.evaluate(()=>{ window.__clip=null; Object.defineProperty(navigator,'clipboard',{value:{write:async items=>{ window.__clip=await items[0].getType('image/png').then(b=>({type:b.type,size:b.size})); }},configurable:true}); if(!window.ClipboardItem) window.ClipboardItem=class{ constructor(o){ this.o=o; } async getType(t){ return this.o[t]; } }; });
  await page.evaluate(()=>{ render(); }); await page.waitForFunction(()=>V1812G.ui.cur&&document.querySelector('#v1812g-cv canvas'),null,{timeout:60000});
  const hasCopy=await page.evaluate(()=>!!document.querySelector('[data-a="v1812gCopy"]'));
  if(hasCopy){ await page.click('[data-a="v1812gCopy"]'); await page.waitForFunction(()=>window.__clip,null,{timeout:8000}).catch(()=>{}); ok(await page.evaluate(()=>window.__clip&&window.__clip.type==='image/png'&&window.__clip.size>50000), 'Copy image puts a PNG on the clipboard'); } else ok(true,'Copy image hidden when the Clipboard API is missing');
  /* downloads blocked (the artifact view without the downloads capability): the image opens so it can be pressed and held */
  await page.evaluate(()=>{ window.claude={use:async()=>null}; });
  await page.click('[data-a="v1812gSave"]'); await page.waitForSelector('.v1812g-ov img:not([hidden])',{timeout:20000});
  await page.waitForFunction(()=>{ const im=document.querySelector('.v1812g-ov img'); return im&&im.naturalWidth>0; },null,{timeout:20000}).catch(()=>{});
  const vw=await page.evaluate(()=>{ const im=document.querySelector('.v1812g-ov img'); return {blob:im.src.startsWith('blob:'),w:im.naturalWidth,h:im.naturalHeight}; });
  ok(vw.blob&&vw.w===1080&&vw.h===1350, 'when saving is not available, "View full size" opens the poster as an image to press and hold ('+vw.w+' x '+vw.h+')');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); ok(await page.evaluate(()=>!document.querySelector('.v1812g-ov')), 'Esc closes the viewer');
  await page.evaluate(()=>{ delete window.claude; });
  const dls=[]; page.on('download',d=>dls.push(d.suggestedFilename())); await page.click('[data-a="v1812gAll"]'); await page.waitForTimeout(15000);
  ok(dls.length>=2&&new Set(dls.slice(-5)).size>=2, `Download all this week saves several PNGs (${dls.slice(1).join(', ')})`);

  /* ---- pins ---- */
  await page.evaluate(()=>{ App.C.gd.pins=[]; render(); }); await page.waitForTimeout(300);
  const pinned=await page.evaluate(()=>{ const B=App.C.gd; const out=[]; const es=B.feed.slice().sort((a,b)=>b.t-a.t).slice(0,4); for(const e of es){ V1812G.ui.sel=e.id; V1812G.ui.cur=null; V1812G.ui.curE=e; A.v1812gPin(); out.push(B.pins.length); } return out; });
  ok(JSON.stringify(pinned)==='[1,2,3,3]', 'Pin to the Office keeps at most three posters; the oldest is replaced ('+pinned.join(',')+')');
  const pj=await page.evaluate(()=>{ const B=App.C.gd; const p=B.pins[0]; return {keys:Object.keys(p).join(','),size:JSON.stringify(B.pins).length,ids:B.pins.map(x=>x.id)}; });
  ok(pj.size<2500, 'a pin is parameters only ('+pj.size+' bytes for three, '+pj.keys+')');
  await page.evaluate(()=>saveNow()); await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(1000);
  if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); }
  const reload=await page.evaluate(()=>({ids:App.C.gd.pins.map(x=>x.id),on:App.C.gd.on,st:App.C.gd.st,feed:App.C.gd.feed.length}));
  ok(JSON.stringify(reload.ids)===JSON.stringify(pj.ids)&&reload.st==='chrome'&&reload.feed>10, 'pins, style and the feed persist through save and reload');
  await page.evaluate(()=>{ App.route='office'; render(); }); await page.waitForFunction(()=>document.querySelectorAll('.v1812g-off canvas.ready').length>=3,null,{timeout:60000});
  ok(await page.evaluate(()=>document.querySelectorAll('.v1812g-off .v1812g-op').length===3&&[...document.querySelectorAll('.v1812g-off .v1812g-op u')].every(u=>/Pinned/.test(u.textContent))), 'the Office shows the three pinned posters, regenerated from their parameters');
  await page.click('.v1812g-off .v1812g-op'); await page.waitForSelector('.v1812g-ov img:not([hidden])',{timeout:30000}); ok(true,'a pinned poster opens full size'); await page.keyboard.press('Escape');

  /* ---- Poster buttons: match report and the live full-time card ---- */
  const fixId=await page.evaluate(()=>{ const C=App.C, u=C.userSid; const f=Object.values(C.fixtures).filter(x=>x.st==='d'&&x.lvl==='V'&&x.yr===C.year&&(x.h===u||x.a===u)&&C.logs[x.id])[0]; return f&&f.id; });
  if(fixId){ await page.evaluate(id=>{ App.modal={type:'fixture',id}; renderModal(); },fixId); ok(await page.evaluate(()=>!!document.querySelector('#modal-root [data-a="v1812gFx"]')), 'the match report has a Poster button');
    await page.click('#modal-root [data-a="v1812gFx"]'); await page.waitForSelector('.v1812g-ov img:not([hidden])',{timeout:40000}); ok(true,'it opens the Final poster'); await page.keyboard.press('Escape'); await page.evaluate(()=>{ App.modal=null; renderModal(); });
    const ft=await page.evaluate(id=>{ const C=App.C; const host=document.createElement('div'); host.id='lv-ftc'; document.body.appendChild(host); App.live={fid:id,M:{ev:[],spectate:false}}; try{ ftCard(); }catch(e){ return 'err '+e.message; } const has=!!host.querySelector('.v1812g-ftb'); App.live=null; host.remove(); return has; },fixId);
    ok(ft===true, 'the live full-time card gets a Poster button'+(ft===true?'':' ('+ft+')')); }
  else ok(false,'a finished Varsity fixture exists for the Poster button');

  /* ---- old saves ---- */
  const mig=await page.evaluate(()=>{ const C=JSON.parse(JSON.stringify(careerForSave(App.C))); delete C.gd; const M=migrate(C); const B=M.gd; return {has:!!B,on:B&&B.on,st:B&&B.st,feed:B&&B.feed.length,pins:B&&B.pins.length}; });
  ok(mig.has&&mig.on===true&&mig.st==='varsity'&&mig.feed===0&&mig.pins===0, 'an old save (no gd) migrates to the defaults');
  const bf=await page.evaluate(()=>{ const C=App.C; const gd=C.gd; C.gd=undefined; delete C.gd; V1812G.syncSig=null; v1812gSync(C); const B=C.gd; return {fin:B.feed.filter(e=>e.k==='final').length,seen:B.feed.every(e=>!e.nw||e.k!=='final'),gd:B.feed.filter(e=>e.k==='gameday').length,bf:B.bf}; });
  ok(bf.fin>=1&&bf.fin<=4&&bf.seen&&bf.gd>=1, `an old career gets its last results as quiet Final posters (${bf.fin}) and the next Gameday (${bf.gd})`);

  /* ---- a fresh career: templates with nothing to show yet, previews from real data, extra tags ---- */
  const ctx2=await b.newContext({viewport:{width:1280,height:900}}); const p2=await ctx2.newPage(); p2.on('pageerror',e=>errs.push('fresh: '+e.message)); await career(p2,'gd-t2');
  await p2.evaluate(()=>{ App.route='gameday'; App.params={}; render(); V1812G.ui.tpl='final'; V1812G.ui.sel=null; V1812G.ui.cur=null; render(); }); await p2.waitForTimeout(600);
  const fr=await p2.evaluate(()=>({none:!!document.querySelector('.v1812g-none'),save:document.querySelector('[data-a="v1812gSave"]').disabled,prev:{final:v1812gPreviewEntry(App.C,'final'),potw:v1812gPreviewEntry(App.C,'potw'),mile:v1812gPreviewEntry(App.C,'milestone'),sen:!!v1812gPreviewEntry(App.C,'senior'),gd:!!v1812gPreviewEntry(App.C,'gameday')},off:/Posters are made automatically|feed has/.test(v1812gOfficeCard(App.C))}));
  ok(fr.none&&fr.save&&fr.prev.final===null&&fr.prev.potw===null&&fr.prev.mile===null, 'before the first result, Final / Player of the week / Milestone say there is nothing yet and Save is disabled');
  ok(fr.prev.sen&&fr.prev.gd&&fr.off, 'Senior Night and Gameday still draw from the roster and fixtures; the Office card explains the feed');
  await p2.evaluate(()=>{ V1812G.ui.tpl='senior'; V1812G.ui.sel=null; V1812G.ui.cur=null; render(); }); await p2.waitForFunction(()=>document.querySelector('.v1812g-cv'),null,{timeout:60000});
  ok(await p2.evaluate(()=>/Preview/.test(document.getElementById('v1812g-title').textContent)&&V1812G.ui.cur._gd.k==='senior'&&!document.querySelector('[data-a="v1812gSave"]').disabled), 'a template with no entry yet shows a labelled preview from the real roster, and it can be saved');
  const tg=await p2.evaluate(()=>{ const C=App.C; const f=userFixture(C); V1812G.tagHooks.push(()=>['RANKED 2']); const t=v1812gTags(C,f); const M=v1812gModel(C,{id:'GD:'+f.id,k:'gameday',fid:f.id,pid:v1812gStarFor(C,C.userSid,'V').id}); V1812G.tagHooks.length=0; return {t,m:M.tags}; });
  ok(tg.t.includes('RANKED 2')&&tg.m.includes('RANKED 2'), 'other units can add tags to Gameday posters (V1812G.tagHooks)');
  await p2.close(); await ctx2.close();

  /* ---- phone layout ---- */
  const ph=await ctx.newPage(); await ph.setViewportSize({width:390,height:844}); ph.on('pageerror',e=>errs.push('phone: '+e.message));
  await ph.goto(DIST); await ph.waitForTimeout(600); if(!await ph.evaluate(()=>!!App.C)){ await ph.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await ph.waitForTimeout(1200); }
  await ph.evaluate(()=>{ App.route='gameday'; App.params={}; render(); }); await ph.waitForFunction(()=>document.querySelector('.v1812g-cv'),null,{timeout:60000}); await ph.waitForTimeout(800);
  const pl=await ph.evaluate(()=>{ const de=document.documentElement; const cv=document.querySelector('.v1812g-frame').getBoundingClientRect(); const side=document.querySelector('.v1812g-side').getBoundingClientRect(); return {sw:de.scrollWidth,cw:de.clientWidth,cvTop:cv.top,sideTop:side.top,cvW:cv.width}; });
  ok(pl.sw<=pl.cw+1, 'phone: no horizontal page scroll ('+pl.sw+' / '+pl.cw+')');
  ok(pl.cvTop<pl.sideTop&&pl.cvW>300, 'phone: the preview is on top and the controls are below it');
  await ph.close();

  /* ---- no leaks, no errors ---- */
  await page.waitForTimeout(10500);
  const fin=await page.evaluate(()=>({alive:window.__gl.filter(x=>!x.isContextLost()).length,made:window.__gl.length,builds:V1812G.builds}));
  ok(fin.alive<=0, `no WebGL context left behind after everything (${fin.alive} alive of ${fin.made} created, ${fin.builds} renderer builds)`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await b.close(); console.log(fails?`${fails} FAILED`:'all passed'); process.exit(fails?1:0); })();
