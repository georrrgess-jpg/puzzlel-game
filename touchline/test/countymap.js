// v18.12 The County Map (src/v17/95_countymap.js): a deterministic county layout (same seed, same map), every town joined by
// roads, no overlaps, control shares that add up to 100%, control that moves toward the winners and spreads along the roads,
// a rebuild from results that equals the incremental state (also for a save from before the map), Scouting Camp kids from the
// towns you hold, derby tags, Road Warrior, save and reload, the map and the town panel on desktop and phone, pan and zoom,
// reduced motion, results untouched, no page errors.
const { chromium, DIST } = require('./_pw');
const path=require('path');
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
let B_; const errs=[];
async function open(seed,vp,touch){ const ctx=await B_.newContext({viewport:vp||{width:1440,height:900},hasTouch:!!touch}); const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Map Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800); return page; }
const SIM=n=>{ const C=App.C; for(let i=0;i<n;i++){ simRound(C); try{ advance(C); }catch(e){} } };
const SEASON=()=>{ const C=App.C; let g=0; while(C.phase!=='offseason'&&g++<80){ simRound(C); const ev=advance(C); if(!ev) break; } };
/* a geometry digest: everything the map draws, nothing that is a function */
const DIGEST=()=>{ const g=v1812mGeo(App.C); return JSON.stringify({t:g.towns.map(t=>[t.id,t.x,t.y,t.name,t.sat,t.prior]),e:g.edges.map(e=>[e.id,e.d,e.mi,e.name]),r:g.river,l:g.lake,h:g.hamlets,c:g.contours.map(c=>c.d),d:Object.keys(g.derby).map(k=>[k,g.derby[k].mi])}); };
(async()=>{ const b=await chromium.launch(); B_=b; let page=await open('map27');

  /* ---------- geography ---------- */
  const G=await page.evaluate(()=>{ const C=App.C, g=v1812mGeo(C); const T=g.towns; let minD=1e9; for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++) minD=Math.min(minD,Math.hypot(T[i].x-T[j].x,T[i].y-T[j].y));
    const seen=new Set([T[0].id]); const q=[T[0].id]; while(q.length){ const a=q.pop(); for(const o of g.adj[a]) if(!seen.has(o.to)){ seen.add(o.to); q.push(o.to); } }
    let cross=0; const E=g.edges; const P=t=>g.tmap[t]; const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    for(let i=0;i<E.length;i++) for(let j=i+1;j<E.length;j++){ const a=E[i], b=E[j]; if(a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b) continue; const A=P(a.a),B=P(a.b),Cc=P(b.a),D=P(b.b); const d1=o(A,B,Cc),d2=o(A,B,D),d3=o(Cc,D,A),d4=o(Cc,D,B); if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0))) cross++; }
    const u=g.tmap[C.userSid]; const inb=T.every(t=>t.x>=60&&t.x<=g.W-60&&t.y>=50&&t.y<=g.H-50);
    return {n:T.length,sch:T.filter(t=>!t.sat).length,sat:T.filter(t=>t.sat).length,league:C.league.length,minD,conn:seen.size,edges:E.length,cross,ux:u.x,uy:u.y,W:g.W,H:g.H,inb,minMi:Math.min(...E.map(e=>e.mi)),maxMi:Math.max(...E.map(e=>e.mi)),
      ham:g.hamlets.length,ct:g.contours.length,ctLen:g.contours.reduce((s,c)=>s+c.d.length,0),lake:g.lake.r,river:g.river.d.length>50,names:new Set(T.map(t=>t.name)).size,userDerby:Object.values(g.derby).filter(d=>d.a===C.userSid||d.b===C.userSid).length,
      derbyOk:Object.values(g.derby).every(d=>d.mi>=2&&d.path.length>=2&&d.edges.length===d.path.length-1)}; });
  console.log(JSON.stringify(G));
  ok(G.n===14&&G.sch===G.league&&G.sat===6, `a county of ${G.n} towns: the ${G.league} league schools and ${G.sat} satellite towns`);
  ok(G.conn===G.n&&G.edges>=G.n, `every town is connected by road (${G.edges} roads: a spanning tree and ${G.edges-G.n+1} extra)`);
  ok(G.cross===0, 'no two roads cross');
  ok(G.minD>=110, `towns keep their distance (closest pair ${Math.round(G.minD)} units)`);
  ok(G.inb, 'every town is inside the map');
  ok(G.ux<G.W*0.45&&Math.abs(G.uy-G.H/2)<G.H*0.2, `your school sits centre-left (${Math.round(G.ux)}, ${Math.round(G.uy)} of ${G.W} x ${G.H})`);
  ok(G.minMi>=2&&G.maxMi<=25, `road distances in miles (${G.minMi}-${G.maxMi} mi)`);
  ok(G.ham>=2&&G.ct===9&&G.ctLen>6000&&G.lake>=30&&G.river&&G.names===14, `a river, a lake, ${G.ham} hamlets, ${G.ct} contour levels (${G.ctLen} path characters), 14 distinct town names`);
  ok(G.userDerby>=1&&G.derbyOk, `you have ${G.userDerby} derby road(s), each a real road path with miles`);
  const dig1=await page.evaluate(DIGEST);
  { const p2=await open('map27',{width:900,height:700}); const dig2=await p2.evaluate(DIGEST); ok(dig1===dig2, 'the same seed builds the identical county (towns, roads, river, lake, hamlets, contours, derbies)'); await p2.context().close();
    const p3=await open('another-seed',{width:900,height:700}); const dig3=await p3.evaluate(DIGEST); ok(dig1!==dig3, 'a different seed builds a different county'); await p3.context().close(); }
  /* the layout is recomputed from the seed: dropping the cache gives the same county */
  ok(await page.evaluate(d=>{ V1812M.geo=null; V1812M.geoKey=''; return (()=>{ const g=v1812mGeo(App.C); return JSON.stringify({t:g.towns.map(t=>[t.id,t.x,t.y,t.name,t.sat,t.prior]),e:g.edges.map(e=>[e.id,e.d,e.mi,e.name]),r:g.river,l:g.lake,h:g.hamlets,c:g.contours.map(c=>c.d),d:Object.keys(g.derby).map(k=>[k,g.derby[k].mi])}); })()===d; },dig1), 'the layout is a pure function of the career (nothing about it is stored)');

  /* ---------- control: shares, winners, roads ---------- */
  const S0=await page.evaluate(()=>{ const C=App.C, st=v1812mState(C), g=v1812mGeo(C), u=C.userSid; const sums=g.towns.map(t=>Object.values(st.S[t.id]).reduce((a,b)=>a+b,0)); const pc=g.towns.map(t=>Object.values(st.pct[t.id]).reduce((a,b)=>a+b,0));
    return {sumOk:sums.every(x=>Math.abs(x-1)<1e-9),pcOk:pc.every(x=>x===100),home:st.S[u][u],reach:st.reach,sat:g.towns.filter(t=>t.sat).map(t=>Object.keys(st.S[t.id]).length)}; });
  ok(S0.sumOk&&S0.pcOk, 'at the start every town adds up to 100% (and so do the whole-number percentages)');
  ok(S0.home>0.99&&S0.reach>=1, `your home town starts at ${Math.round(S0.home*100)}%; reach ${S0.reach}`);
  ok(S0.sat.every(n=>n>=2), 'a satellite town starts split between the programs around it');
  const M=await page.evaluate(()=>{ const C=App.C, geo=v1812mGeo(C); const T=geo.towns.find(t=>!t.sat&&t.id!==C.userSid); const A=C.league.find(id=>id!==T.id&&id!==C.userSid); const nb=geo.adj[T.id].map(o=>o.to); const far=geo.towns.filter(t=>t.id!==T.id&&!nb.includes(t.id)&&geo.mi(T.id,t.id)>=30).map(t=>t.id);
    const sh=(Y)=>v1812mShares(C,geo,v1812mBox(C),false,{yr:C.year,Y}); const base=sh({});
    const Yaw={}; v1812mContrib(geo,T.id,A,0,1,A,Yaw); const Yho={}; v1812mContrib(geo,T.id,A,1,0,T.id,Yho); const Ydr={}; v1812mContrib(geo,T.id,A,1,1,null,Ydr);
    const aw=sh(Yaw), ho=sh(Yho), dr=sh(Ydr); const Ybig={}; v1812mContrib(geo,T.id,A,0,4,A,Ybig);
    return {atT:[base[T.id][A]||0,aw[T.id][A]||0],homeDrop:[base[T.id][T.id],aw[T.id][T.id]],nb:nb.map(n=>[base[n][A]||0,aw[n][A]||0]),far:far.map(n=>[base[n][A]||0,aw[n][A]||0]),awayPts:Yaw[T.id][A],homePts:Yho[T.id][T.id],drawA:Ydr[T.id][A],drawH:Ydr[T.id][T.id],homeWinHelpsA:(ho[T.id][A]||0)<=(base[T.id][A]||0)+1e-12,homeWinH:[base[T.id][T.id],ho[T.id][T.id]],winA:V1812M.WIN_A,winH:V1812M.WIN_H,bigPts:Ybig[T.id][A],sums:[aw,ho,dr].every(S=>Object.values(S).every(t=>Math.abs(Object.values(t).reduce((a,b)=>a+b,0)-1)<1e-9))}; });
  ok(M.atT[1]>M.atT[0]&&M.homeDrop[1]<M.homeDrop[0], `an away win moves the town toward the winner (${Math.round(M.atT[0]*100)}% to ${Math.round(M.atT[1]*100)}%) and away from its home program`);
  ok(M.winA===2*M.winH&&M.awayPts>=2*M.homePts, `an away win counts double (${M.winA} against ${M.winH} points; at the venue ${M.awayPts} against ${M.homePts})`);
  ok(M.homeWinH[1]>=M.homeWinH[0]&&M.homeWinHelpsA, 'a home win helps the home program and not the visitors');
  ok(M.drawA>0&&M.drawA<M.awayPts&&M.drawH===M.drawA, `a draw shifts less than a win and gives both sides the same (${M.drawA} points)`);
  ok(M.bigPts>M.awayPts, 'a bigger margin earns a little more');
  ok(M.nb.length>0&&M.nb.every(([a,b])=>b>=a-1e-12)&&M.nb.filter(([a,b])=>b>a).length>=Math.max(1,M.nb.length-1), `the win spreads along the roads: every neighbouring town moves toward the winner (${M.nb.map(([a,b])=>Math.round(a*100)+'-'+Math.round(b*100)).join(', ')})`);
  ok(M.far.every(([a,b])=>b-a<=M.nb.reduce((m,[x,y])=>Math.max(m,y-x),0)+1e-9), 'the pull fades with road distance');
  ok(M.sums, 'shares still add up to 100% after any result');
  /* a real season through finishMatch */
  await page.evaluate(`(${SIM})(17)`);
  const R=await page.evaluate(()=>{ const C=App.C, B=C.map, st=v1812mState(C), g=v1812mGeo(C), u=C.userSid; const clone=JSON.stringify(B.y), done=Object.keys(B.done).length, rw=JSON.stringify(B.rw); const nQual=Object.values(C.fixtures).filter(f=>v1812mQual(C,f)).length;
    const sums=g.towns.every(t=>Math.abs(Object.values(st.S[t.id]).reduce((a,b)=>a+b,0)-1)<1e-9); const held=st.held.every(t=>Math.round((st.S[t][u]||0)*100)>=50)&&g.towns.filter(t=>!st.held.includes(t.id)).every(t=>(st.S[t.id][u]||0)<V1812M.HELD);
    const top=C.league.map(id=>[id,g.towns.filter(t=>(st.S[t.id][id]||0)>=V1812M.HELD).length]).sort((a,b)=>b[1]-a[1]);
    return {clone,done,nQual,rw,sums,held,reach:st.reach,delta:st.delta,topHeld:top[0][1],phase:C.phase,newsMap:C.news.filter(n=>n.type==='map').length}; });
  console.log(JSON.stringify({...R,clone:R.clone.length,rw:undefined}));
  ok(R.done===R.nQual&&R.nQual===56, `every finished league game is in the map (${R.done} of ${R.nQual})`);
  ok(R.sums&&R.held, `after a season the shares add up and "held" means 50% or more (reach ${R.reach}, ${R.delta>=0?'+':''}${R.delta} this season)`);
  ok(R.topHeld>=2, `the strongest program holds ${R.topHeld} towns: territory follows results`);
  const RB=await page.evaluate(()=>{ const C=App.C, B=C.map; const before=JSON.stringify(B.y), rw0=JSON.stringify(B.rw), n0=B.n; v1812mRebuild(C); const after=JSON.stringify(C.map.y); const rw1=JSON.stringify(C.map.rw);
    /* reverse order, one game at a time, into a fresh box: integer points add in any order */
    const fx=Object.values(C.fixtures).filter(f=>v1812mQual(C,f)).reverse(); C.map.y={}; C.map.done={}; C.map.n=0; C.map.rw={}; for(const f of fx) v1812mApply(C,f); const rev=JSON.stringify(C.map.y);
    return {same:before===after,rwSame:rw0===rw1,n:C.map.n===n0,rev:rev===before.replace(/\s/g,'')||JSON.stringify(JSON.parse(rev))===JSON.stringify(JSON.parse(before))||(()=>{ const a=JSON.parse(rev), b=JSON.parse(before); const norm=o=>JSON.stringify(Object.keys(o).sort().map(y=>[y,Object.keys(o[y]).sort().map(t=>[t,Object.keys(o[y][t]).sort().map(s=>[s,o[y][t][s]])])])); return norm(a)===norm(b); })()}; });
  ok(RB.same&&RB.rwSame&&RB.n, 'rebuilding the map from C.fixtures gives exactly the incremental state');
  ok(RB.rev, 'applying the same games in reverse order gives the same points (order independent)');
  /* a save from before the map: no C.map, the first open rebuilds it from the results, silently */
  const OLD=await page.evaluate(()=>{ const C=App.C; v1812mRebuild(C); const st0=v1812mState(C); const held0=st0.held.slice(), reach0=st0.reach, y0=JSON.stringify(C.map.y); const news0=C.news.filter(n=>n.type==='map').length;
    const raw=JSON.parse(JSON.stringify(careerForSave(C))); delete raw.map; const M2=migrate(raw); const st=v1812mState(M2);
    const out={has:!!M2.map&&M2.map.v===1,sameY:JSON.stringify(M2.map.y)===y0,held:JSON.stringify(st.held)===JSON.stringify(held0),reach:st.reach===reach0,news:M2.news.filter(n=>n.type==='map').length===news0,seen:!!M2.map.seen&&!!M2.map.seen.S,idem:(()=>{ const a=JSON.stringify(M2.map.y); migrate(M2); return a===JSON.stringify(M2.map.y); })()};
    V1812M.stC=null; V1812M.stKey=''; return out; });
  ok(OLD.has&&OLD.sameY&&OLD.held&&OLD.reach, 'an old save (no C.map) rebuilds the identical map from its results on first open');
  ok(OLD.news&&OLD.seen&&OLD.idem, 'the migration adds no news, starts with the map already seen (no replay), and is idempotent');
  /* results are untouched: the engine alone gives the same scores */
  const same=await page.evaluate(()=>{ const sig=C=>Object.values(C.fixtures).filter(f=>f.st==='d').sort((a,b)=>a.id<b.id?-1:1).map(f=>f.id+':'+f.hg+'-'+f.ag+':'+f.w).join('|'); const mine=sig(App.C);
    const C2=newCareer({slot:1,coachName:'Map Coach',seed:App.C.seed,now:0}); for(let i=0;i<17;i++){ for(const f of roundFixtures(C2)){ if(!f||f.st==='d') continue; const M=startMatch(C2,f.id,{}); runToEnd(C2,M); V1812M.rawFinish(C2,M); } try{ advance(C2); }catch(e){} }
    return {eq:mine===sig(C2),n:mine.length,mapless:!C2.map}; });
  ok(same.eq&&same.n>200&&same.mapless, 'every score is exactly what the engine plays without the map hook: the map changes no result');

  /* ---------- the view: desktop ---------- */
  await page.evaluate(()=>{ App.route='countymap'; App.params={}; render(); }); await page.waitForTimeout(600);
  const V=await page.evaluate(()=>({marks:document.querySelectorAll('.v1812m-mk').length,glows:document.querySelectorAll('.v1812m-g').length,roads:document.querySelectorAll('.v1812m-road').length,rows:document.querySelectorAll('.v1812m-row').length,big:document.querySelector('.v1812m-big b').textContent,card:!!document.querySelector('.v1812m-fri'),rw:!!document.querySelector('.v1812m-rw'),bul:document.querySelectorAll('.v1812m-bul li').length,
    scale:document.getElementById('v1812m-scale').textContent,compass:!!document.querySelector('.v1812m-compass svg'),tools:document.querySelectorAll('.v1812m-tools button').length,stage:document.getElementById('v1812m-stage').getBoundingClientRect().height,sideRight:document.querySelector('.v1812m-side').getBoundingClientRect().right,stageRight:document.getElementById('v1812m-stage').getBoundingClientRect().right,reach:v1812mState(App.C).reach,tot:v1812mState(App.C).total,title:document.querySelector('h1')&&document.querySelector('h1').textContent}));
  console.log(JSON.stringify(V));
  ok(V.marks===14&&V.rows===14&&V.roads>=14&&V.glows>14, `the map draws ${V.marks} towns, ${V.roads} roads, ${V.glows} territory glows and a row for every town`);
  ok(+V.big===V.reach&&V.tot===14&&V.card&&V.rw&&V.bul===3&&V.compass&&V.tools===4&&/mi/.test(V.scale), 'the right panel: program reach, This Friday, Road Warrior, the three bullets; compass, scale bar and map controls');
  ok(V.stage>=500&&V.sideRight<=1440&&V.stageRight<=1440, `the map fills the screen (${Math.round(V.stage)} px tall) and its panel stays inside the window`);
  ok(await page.evaluate(()=>!!document.querySelector('.tn-dd [data-r="countymap"]')&&TOPNAV.find(t=>t[0]==='league')[3].includes('countymap')&&NAV.some(n=>n[0]==='countymap')), 'the County Map is in the Competition menu and the side menu');
  /* a tap on a town opens its panel */
  const pick=await page.evaluate(()=>{ const C=App.C, st=v1812mState(C), g=v1812mGeo(C); const t=g.towns.find(t=>!t.sat&&t.id!==C.userSid); return {id:t.id,name:t.name}; });
  await page.click(`.v1812m-mk[data-t="${pick.id}"] .v1812m-hit`,{force:true}); await page.waitForTimeout(300);
  const TP=await page.evaluate(id=>({panel:!!document.getElementById('v1812m-town'),name:document.querySelector('#v1812m-town h3')&&document.querySelector('#v1812m-town h3').textContent,sel:document.querySelectorAll('.v1812m-mk.sel').length,row:document.querySelectorAll('.v1812m-row.sel').length,facts:[...document.querySelectorAll('#v1812m-town dt')].map(x=>x.textContent),legend:document.querySelectorAll('#v1812m-town .v1812m-leg span').length,co:!document.getElementById('v1812m-co').hidden,sel2:V1812M.sel===id}),pick.id);
  ok(TP.panel&&TP.name===pick.name&&TP.sel===1&&TP.sel2&&TP.row===1, `tapping ${pick.name} opens its panel and selects it`);
  ok(TP.facts.includes('By road')&&TP.facts.includes('Record vs them')&&TP.facts.includes('Next game')&&TP.facts.includes('Scouting pipeline')&&TP.legend>=2&&TP.co, 'the town panel has the control bar, distance, record, next game, pipeline and a callout on the map');
  await page.click('.v1812m-x'); await page.waitForTimeout(100); ok(await page.evaluate(()=>!document.getElementById('v1812m-town')&&!document.querySelector('.v1812m-mk.sel')), 'the close button clears the selection');
  await page.click(`.v1812m-row[data-t="${pick.id}"]`); await page.waitForTimeout(500); ok(await page.evaluate(id=>V1812M.sel===id&&!!document.getElementById('v1812m-town'),pick.id), 'a row in the panel picks the town too');
  await page.keyboard.press('Escape');
  /* satellite town panel */
  const sat=await page.evaluate(()=>v1812mGeo(App.C).towns.find(t=>t.sat).id); await page.click(`.v1812m-row[data-t="${sat}"]`); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>/no varsity program/i.test(document.getElementById('v1812m-town').textContent)), 'a satellite town says it has no varsity program');
  /* pan and zoom */
  const Z0=await page.evaluate(()=>({...V1812M.view}));
  await page.click('[data-a="v1812mZoom"][data-d="in"]'); await page.waitForTimeout(500); const Z1=await page.evaluate(()=>({...V1812M.view})); ok(Z1.k>Z0.k*1.3, `zoom in (${Z0.k.toFixed(2)} to ${Z1.k.toFixed(2)})`);
  await page.click('[data-a="v1812mZoom"][data-d="out"]'); await page.waitForTimeout(500); const Z2=await page.evaluate(()=>({...V1812M.view})); ok(Z2.k<Z1.k, 'zoom out');
  const box=await page.locator('#v1812m-svg').boundingBox(); await page.mouse.move(box.x+box.width*0.5,box.y+box.height*0.5); await page.mouse.wheel(0,-400); await page.waitForTimeout(200); const Z3=await page.evaluate(()=>({...V1812M.view})); ok(Z3.k>Z2.k, 'the mouse wheel zooms');
  await page.evaluate(()=>A.v1812mClose());
  const before=await page.evaluate(()=>({...V1812M.view})); await page.mouse.move(box.x+box.width*0.6,box.y+box.height*0.6); await page.mouse.down(); await page.mouse.move(box.x+box.width*0.6-120,box.y+box.height*0.6-60,{steps:6}); await page.mouse.up(); await page.waitForTimeout(150); const after=await page.evaluate(()=>({...V1812M.view})); ok(Math.abs((after.x-before.x)+120)<6&&Math.abs((after.y-before.y)+60)<6, 'dragging pans the map');
  ok(await page.evaluate(()=>!V1812M.sel), 'a drag does not select a town');
  await page.click('[data-a="v1812mZoom"][data-d="fit"]'); await page.waitForTimeout(600); const Zf=await page.evaluate(()=>({...V1812M.view,fit:v1812mFitK(V1812M.el)})); ok(Math.abs(Zf.k-Zf.fit)<0.02, 'the whole-county button fits the map');
  await page.click('[data-a="v1812mZoom"][data-d="you"]'); await page.waitForTimeout(600); const Zy=await page.evaluate(()=>{ const E=V1812M.el, V=V1812M.view, u=v1812mGeo(App.C).tmap[App.C.userSid]; return {sx:u.x*V.k+V.x,sy:u.y*V.k+V.y,cw:E.cw,ch:E.ch}; }); ok(Zy.sx>0&&Zy.sx<Zy.cw&&Math.abs(Zy.sy-Zy.ch/2)<40, 'the shield button centres your town');
  /* pinch with two pointers */
  await page.click('[data-a="v1812mZoom"][data-d="fit"]'); await page.waitForTimeout(600);
  const pk=await page.evaluate(()=>{ const svg=document.getElementById('v1812m-svg'); const r=svg.getBoundingClientRect(); const k0=V1812M.view.k; const ev=(t,id,x,y)=>svg.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:r.left+x,clientY:r.top+y,bubbles:true,isPrimary:id===1}));
    const cx=r.width/2, cy=r.height/2; ev('pointerdown',1,cx-60,cy); ev('pointerdown',2,cx+60,cy); ev('pointermove',1,cx-120,cy); ev('pointermove',2,cx+120,cy); const k1=V1812M.view.k; ev('pointerup',1,cx-120,cy); ev('pointerup',2,cx+120,cy); return {k0,k1}; });
  await page.waitForTimeout(100); ok(pk.k1>pk.k0*1.5, `a two-finger pinch zooms (${pk.k0.toFixed(2)} to ${pk.k1.toFixed(2)})`);

  /* ---------- This Friday, the Overview teaser, derbies ---------- */
  const F=await page.evaluate(()=>{ const C=App.C; const f=v1812mFriday(C); return {kind:f.kind,txt:v1812mFridayText(C,f),away:f.away,flips:f.flips&&f.flips.length}; });
  ok(['lg','out','none','off'].includes(F.kind)&&F.txt.length>20, `This Friday card (${F.kind}): ${F.txt}`);
  await page.evaluate(()=>{ App.route='office'; App.params={}; render(); }); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>!!document.querySelector('.v1812m-tz')&&/of 14 towns/.test(document.querySelector('.v1812m-tz').textContent)), 'the Overview has a County Map teaser with the reach');
  await page.click('.v1812m-tzb'); await page.waitForTimeout(400); ok(await page.evaluate(()=>App.route==='countymap'), 'the teaser opens the map');

  /* a derby game: tags, hype, broadcast intro */
  { const old=page; page=await open('map27'); await old.context().close(); }
  const D=await page.evaluate(()=>{ const C=App.C, u=C.userSid, g=v1812mGeo(C); const d=Object.values(g.derby).find(x=>x.a===u||x.b===u); const o=d.a===u?d.b:d.a;
    const f=Object.values(C.fixtures).find(f=>f.lvl==='V'&&f.comp==='reg'&&f.h===u&&f.a===o); C.pre.rd=3; C.phase='regular'; C.md=f.rd; App.route='office'; render();
    return {fid:f.id,o,mi:d.mi,heated:C.rivals.heated===o,town:C.schools[o].town}; });
  ok(await page.evaluate(id=>{ const f=App.C.fixtures[id]; return rivalChip(f).includes('Derby')&&resultRow(f).includes('v1812m-dtag')&&v17GameRow(App.C,f).includes('v1812m-dpill'); },D.fid), `a derby game (${D.town}, ${D.mi} mi) carries a Derby tag in the chips, schedule rows and results`);
  const NW=await page.evaluate(()=>App.C.news.filter(n=>n.type==='map'&&/Derby|derby|road/.test(n.text)).map(n=>n.text));
  ok(NW.length===1&&/miles/.test(NW[0]), `derby week puts one hype item on the Newswire: "${NW[0]}"`);
  await page.evaluate(()=>{ render(); render(); }); ok(await page.evaluate(()=>App.C.news.filter(n=>n.type==='map'&&/miles/.test(n.text)).length)===1, 'the hype is posted once per game');
  await page.evaluate(()=>{ App.route='schedule'; App.params={}; render(); }); await page.waitForTimeout(200); ok(await page.evaluate(()=>document.querySelectorAll('.v1812m-dpill,.v1812m-dtag').length>0), 'the schedule shows derby tags');
  await page.evaluate(()=>{ App.route='matchday'; App.params={}; render(); }); await page.waitForTimeout(200); ok(await page.evaluate(()=>[...document.querySelectorAll('.mc-game')].some(e=>e.querySelector('.v1812m-dtag'))), 'the Matchday Center marks derby games');
  await page.evaluate(id=>{ App.route='office'; render(); App.modal={type:'fixture',id}; renderModal(); },D.fid); await page.waitForTimeout(400); ok(await page.evaluate(()=>!!document.querySelector('.modal .v1812m-chip')), 'the match preview shows the Derby chip with the miles');
  await page.evaluate(()=>{ App.modal=null; renderModal(); render(); });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(500); await page.click('[data-a="pvSpeed"][data-v="8"]').catch(()=>{}); await page.click('[data-a="kickoff"]');
  const intro=await page.waitForSelector('#lv-intro .lvi',{timeout:5000}).then(()=>page.evaluate(()=>({txt:document.querySelector('#lv-intro .lvi-top').textContent,sub:!!document.querySelector('#lv-intro .v1812m-lvisub'),cls:document.querySelector('#lv-intro .lvi').classList.contains('v1812m-derby')}))).catch(()=>null);
  ok(intro&&(/DERBY/.test(intro.txt)||(/RIVALRY NIGHT/.test(intro.txt)&&D.heated))&&intro.sub&&intro.cls, `the broadcast intro says ${intro&&/DERBY/.test(intro.txt)?'DERBY':'RIVALRY NIGHT'} with the derby road line`);
  await page.evaluate(()=>{ try{ liveStop&&liveStop(); }catch(e){} });

  /* ---------- Road Warrior ---------- */
  { const old=page; page=await open('map27'); await old.context().close(); }
  const RW=await page.evaluate(()=>{ const C=App.C, u=C.userSid; const others=C.league.filter(id=>id!==u); const out=[]; const honors0=C.schools[u].honors.length;
    for(const o of others){ const f=Object.values(C.fixtures).find(f=>f.lvl==='V'&&f.comp==='reg'&&f.h===o&&f.a===u); f.st='d'; f.hg=0; f.ag=1; f.w=u; v1812mAfter(C,f,false); out.push([Object.keys(C.map.rw).length,!!C.map.rwDone]); }
    const hon=C.schools[u].honors.filter(h=>h.label==='Road Warrior').length; const news=C.news.filter(n=>/ROAD WARRIOR/.test(n.text)).length; const f=Object.values(C.fixtures).find(f=>f.h===others[0]&&f.a===u&&f.lvl==='V'&&f.comp==='reg'); v1812mAfter(C,f,false); v1812mRoadWarrior(C,f,false);
    App.route='countymap'; render(); const panel=document.querySelector('.v1812m-rw').textContent; App.route='hof'; render(); const hof=!!document.querySelector('.v1812m-hof');
    return {out,hon,news,honAfter:C.schools[u].honors.filter(h=>h.label==='Road Warrior').length,newsAfter:C.news.filter(n=>/ROAD WARRIOR/.test(n.text)).length,panel,hof}; });
  ok(RW.out.slice(0,6).every(([n,d],i)=>n===i+1&&!d)&&RW.out[6][0]===7&&RW.out[6][1], 'Road Warrior is earned with the seventh away ground, and not before');
  ok(RW.hon===1&&RW.news===1&&RW.honAfter===1&&RW.newsAfter===1, 'it adds one program honor and one Newswire item, once');
  ok(/Earned/.test(RW.panel)&&RW.hof, 'the map panel shows it earned, and the Hall of Fame has a County honor card');

  /* ---------- the Scouting Camp ---------- */
  { const old=page; page=await open('map27'); await old.context().close(); } await page.evaluate(`(${SEASON})()`);
  const CP=await page.evaluate(()=>{ const C=App.C, u=C.userSid; const st=v1812mState(C), g=v1812mGeo(C); const K=campEnsure(C); const held=st.held; const slots=v1812mCampSlots(C,st,g);
    const counts={}; for(const x of K.prospects) if(x.tid) counts[x.tid]=(counts[x.tid]||0)+1; const heldKids=K.prospects.filter(x=>x.held);
    const quota=(t)=>t===u?3:2; const okQuota=held.every(t=>(counts[t]||0)===Math.min(quota(t),slots.filter(s=>s===t).length)||K.prospects.length<slots.length+0)||heldKids.length===Math.min(slots.length,K.prospects.length);
    return {phase:C.phase,n:K.prospects.length,held:held.length,slots:slots.length,heldKids:heldKids.length,okQuota,noRival:heldKids.every(x=>!x.rival),labels:K.prospects.filter(x=>x.tid).every(x=>x.feeder===x.town+' Middle'&&g.tmap[x.tid]),homeKids:K.prospects.filter(x=>x.tid===u).length,sig:JSON.stringify(K.prospects.map(x=>[x.p.id,x.tid,x.stars,x.know,x.rival]))}; });
  console.log(JSON.stringify({...CP,sig:CP.sig.length}));
  ok(CP.phase==='offseason'&&CP.n>=8&&CP.heldKids===Math.min(CP.slots,CP.n)&&CP.okQuota, `the camp's ${CP.n} prospects: ${CP.heldKids} come from the ${CP.held} towns you hold (three from home, two from each other town)`);
  ok(CP.noRival&&CP.labels&&CP.homeKids>=1, 'prospects from held towns have no rival bids and a hometown middle school');
  await page.evaluate(()=>{ App.route='camp'; render(); }); await page.waitForTimeout(300);
  const CU=await page.evaluate(()=>({from:[...document.querySelectorAll('.v1812m-from')].map(e=>e.textContent),bar:!!document.querySelector('.v1812m-campbar'),cards:document.querySelectorAll('.pros .pro').length}));
  ok(CU.cards===CP.n&&CU.from.length>=CP.heldKids&&CU.from.some(t=>/From /.test(t))&&CU.bar, `the camp screen shows "${CU.from[0]}" and a County pipeline bar`);
  { const p2=await open('map27',{width:900,height:700}); await p2.evaluate(`(${SEASON})()`); const sig=await p2.evaluate(()=>{ const K=campEnsure(App.C); return JSON.stringify(K.prospects.map(x=>[x.p.id,x.tid,x.stars,x.know,x.rival])); }); ok(sig===CP.sig, 'the same seed gives the same camp, hometowns included'); await p2.context().close(); }
  /* an old camp (made before the map) gets its towns without being redrawn; one in progress is left alone */
  const OC=await page.evaluate(()=>{ const C=App.C, K=C.camp; const ids=K.prospects.map(x=>x.p.id).join(','); const pot=K.prospects.map(x=>x.p.pot).join(','); delete K.v1812m; for(const x of K.prospects){ delete x.tid; delete x.town; delete x.held; x.feeder='Cedar Ridge Middle'; } K.prospects[0].invited=true; const K2=campEnsure(C);
    return {same:K2===K&&K2.prospects.map(x=>x.p.id).join(',')===ids&&K2.prospects.map(x=>x.p.pot).join(',')===pot,tagged:K2.prospects.filter(x=>x.tid).length>0,n:K2.prospects.length,flag:K2.v1812m===1}; });
  ok(OC.same&&OC.tagged&&OC.flag, 'an old camp keeps its players and gains hometowns; one already in progress gets no extra kids');
  /* a big program: more towns than the camp has slots adds a few extra prospects from the held towns */
  const BG=await page.evaluate(()=>{ const C=App.C, u=C.userSid, g=v1812mGeo(C); const B=C.map; const Y=B.y[C.year]||(B.y[C.year]={}); for(const t of g.towns.slice(0,8)){ Y[t.id]=Y[t.id]||{}; Y[t.id][u]=400; } V1812M.stKey=''; V1812M.stC=null; delete C.camp; const K=campEnsure(C); const st=v1812mState(C);
    return {held:st.held.length,n:K.prospects.length,extra:K.prospects.filter(x=>x.extra).length,extraHeld:K.prospects.filter(x=>x.extra).every(x=>x.held&&x.tid&&!x.rival),ids:new Set(K.prospects.map(x=>x.p.id)).size}; });
  ok(BG.held>=6&&BG.extra>=1&&BG.extra<=4&&BG.n===8+BG.extra&&BG.extraHeld&&BG.ids===BG.n, `holding ${BG.held} towns adds ${BG.extra} extra prospect(s) from them (${BG.n} in the camp)`);
  await page.evaluate(()=>{ const K=App.C.camp; const x=K.prospects.find(y=>y.held&&!y.invited); const r=campInvite(App.C,x.p.id); window.__inv=r; }); ok(await page.evaluate(()=>window.__inv&&window.__inv.ok), 'inviting a kid from a held town works like any other');
  await page.evaluate(()=>{ App.route='office'; render(); }); await page.waitForTimeout(200); ok(await page.evaluate(()=>!!document.querySelector('.v1812m-tz')), 'the offseason Overview carries the County Map teaser');

  /* ---------- save, reload, backup ---------- */
  { const old=page; page=await open('map27'); await old.context().close(); } await page.evaluate(`(${SIM})(9)`); await page.evaluate(()=>{ App.route='countymap'; render(); }); await page.waitForTimeout(2600);
  const SV=await page.evaluate(()=>{ const C=App.C; return {y:JSON.stringify(C.map.y),seen:JSON.stringify(C.map.seen),reach:v1812mState(C).reach,rw:JSON.stringify(C.map.rw),n:C.map.n}; });
  await page.evaluate(()=>saveNow()); await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(1000);
  if(!await page.evaluate(()=>!!App.C)){ await page.locator('[data-a="openSlot"][data-slot="1"]').first().click(); await page.waitForTimeout(900); }
  const LD=await page.evaluate(()=>{ const C=App.C; return {y:JSON.stringify(C.map.y),seen:JSON.stringify(C.map.seen),reach:v1812mState(C).reach,rw:JSON.stringify(C.map.rw),n:C.map.n,hasC:!!C.map}; });
  ok(LD.hasC&&LD.y===SV.y&&LD.rw===SV.rw&&LD.n===SV.n&&LD.reach===SV.reach, 'the map state survives save and reload');
  ok(LD.seen===SV.seen&&SV.seen.length>20, 'so does the last map you looked at (no replay of the animation)');
  ok(await page.evaluate(()=>{ const C=App.C; const d=JSON.parse(JSON.stringify(careerForSave(C))); const M=migrate(d); return JSON.stringify(M.map.y)===JSON.stringify(C.map.y)&&JSON.stringify(M.map.seen)===JSON.stringify(C.map.seen); }), 'and the backup format (careerForSave / migrate)');
  await page.evaluate(`(${SIM})(1)`); ok(await page.evaluate(n=>App.C.map.n>n,LD.n), 'play continues after a reload and the map keeps growing');

  /* ---------- the animation: from the last map you saw to the new one ---------- */
  { const old=page; page=await open('map27'); await old.context().close(); } await page.evaluate(`(${SIM})(10)`);
  await page.evaluate(()=>{ App.route='countymap'; render(); }); await page.waitForTimeout(2600);
  const AN=await page.evaluate(()=>{ const C=App.C, u=C.userSid, g=v1812mGeo(C), st=v1812mState(C); const t=g.towns.find(t=>!t.sat&&t.id!==u&&(st.S[t.id][u]||0)<0.4); const B=C.map;
    const seen=JSON.parse(JSON.stringify(B.seen)); seen.S[st.held[0]]=Object.assign({},seen.S[st.held[0]],{[u]:0.05}); /* pretend your best town was nearly lost at your last look */ B.seen=seen; App.route='office'; render(); App.route='countymap'; render();
    const gl=[...document.querySelectorAll('.v1812m-g')].filter(c=>c.dataset.t===st.held[0]&&c.dataset.s===u)[0]; const r0=+gl.getAttribute('r'); const flip=document.querySelectorAll('.v1812m-mk.flip').length;
    return {r0,x0:+gl.dataset.x0,x1:+gl.dataset.x1,flip,held:st.held[0]}; });
  await page.waitForTimeout(2600); const AN2=await page.evaluate(()=>{ const u=App.C.userSid, h=V1812M.st&&v1812mState(App.C).held[0]; const gl=[...document.querySelectorAll('.v1812m-g')].filter(c=>c.dataset.t===h&&c.dataset.s===u)[0]; return {r1:+gl.getAttribute('r'),seen:App.C.map.seen.S[h][u]}; });
  ok(AN.x0<AN.x1&&AN.flip>=1, `a town you won since your last look is marked to burst (${AN.flip} flipped), and its glow starts at ${AN.x0} of ${AN.x1}`);
  ok(AN2.r1>AN.r0+3, `the territory glow grows from ${AN.r0.toFixed(0)} to ${AN2.r1.toFixed(0)} units`);
  ok(Math.abs(AN2.seen-AN.x1)<0.01, 'opening the map records the new state as seen');
  /* reduced motion: no tween, no flowing dashes, no burst */
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{ const C=App.C, u=C.userSid, st=v1812mState(C); const seen=JSON.parse(JSON.stringify(C.map.seen)); seen.S[st.held[0]]=Object.assign({},seen.S[st.held[0]],{[u]:0.05}); C.map.seen=seen; App.route='office'; render(); App.route='countymap'; render(); });
  const RM=await page.evaluate(()=>{ const u=App.C.userSid, h=v1812mState(App.C).held[0]; const gl=[...document.querySelectorAll('.v1812m-g')].filter(c=>c.dataset.t===h&&c.dataset.s===u)[0]; const dby=document.querySelector('.v1812m-dby.mine'); const fl=document.querySelector('.v1812m-mk.flip .v1812m-burst'); const pulse=document.querySelector('.v1812m-mk.user .v1812m-held');
    return {done:Math.abs(+gl.getAttribute('opacity')-v1812mGlowAttrs(v1812mGeo(App.C),h,u,+gl.dataset.x1).o)<0.01,dby:dby?getComputedStyle(dby).animationName:'none',burst:fl?getComputedStyle(fl).animationName:'none',pulse:pulse?getComputedStyle(pulse).animationName:'none'}; });
  ok(RM.done&&RM.dby==='none'&&RM.burst==='none'&&RM.pulse==='none', 'reduced motion: the glows jump to the new state; the flowing derby road, the pulse and the burst are off');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{ App.route='countymap'; render(); }); ok(await page.evaluate(()=>{ const d=document.querySelector('.v1812m-dby.mine'); return !d||getComputedStyle(d).animationName.includes('flow'); }), 'with motion allowed the derby road dashes flow');

  /* ---------- phone ---------- */
  { const ph=await open('map27',{width:390,height:844},true); await ph.evaluate(`(${SIM})(12)`); await ph.evaluate(()=>{ App.route='countymap'; App.params={}; render(); }); await ph.waitForTimeout(700);
    const P=await ph.evaluate(()=>{ const s=document.getElementById('v1812m-stage').getBoundingClientRect(); const side=document.querySelector('.v1812m-side').getBoundingClientRect(); return {w:s.width,h:s.height,below:side.top>=s.bottom-2,hscroll:document.documentElement.scrollWidth>innerWidth+1,marks:document.querySelectorAll('.v1812m-mk').length,k:V1812M.view.k,sw:document.getElementById('v1812m-svg').getBoundingClientRect().width,tools:[...document.querySelectorAll('.v1812m-tools button')].every(b=>b.getBoundingClientRect().width>=38)}; });
    ok(P.w<=390&&P.h>=420&&P.below&&!P.hscroll&&P.marks===14&&P.tools, `phone: the map is ${Math.round(P.w)} x ${Math.round(P.h)} with the panel stacked below it, no horizontal scroll, touch-size buttons`);
    const tgt=await ph.evaluate(()=>{ const C=App.C; const t=v1812mGeo(C).towns.find(t=>t.id===C.userSid); const V=V1812M.view; return {x:t.x*V.k+V.x,y:t.y*V.k+V.y}; }); const bx=await ph.locator('#v1812m-svg').boundingBox();
    await ph.touchscreen.tap(bx.x+tgt.x,bx.y+tgt.y); await ph.waitForTimeout(400); ok(await ph.evaluate(()=>V1812M.sel===App.C.userSid&&!!document.getElementById('v1812m-town')), 'phone: tapping your own shield opens the town panel');
    await ph.click('.v1812m-x'); await ph.waitForTimeout(100);
    const Ph=await ph.evaluate(()=>{ const svg=document.getElementById('v1812m-svg'); const r=svg.getBoundingClientRect(); const k0=V1812M.view.k, x0=V1812M.view.x; const ev=(t,id,x,y)=>svg.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:r.left+x,clientY:r.top+y,bubbles:true,isPrimary:id===1}));
      ev('pointerdown',1,200,300); ev('pointermove',1,150,300); ev('pointermove',1,100,300); ev('pointerup',1,100,300); const x1=V1812M.view.x; const sel=V1812M.sel;
      ev('pointerdown',1,150,300); ev('pointerdown',2,230,300); ev('pointermove',1,100,300); ev('pointermove',2,280,300); const k1=V1812M.view.k; ev('pointerup',1,100,300); ev('pointerup',2,280,300); return {pan:x1-x0,sel,k0,k1}; });
    ok(Ph.pan<-60&&!Ph.sel, `phone: a one-finger drag pans (${Math.round(Ph.pan)} px) without selecting a town`);
    ok(Ph.k1>Ph.k0*1.4, `phone: a pinch zooms (${Ph.k0.toFixed(2)} to ${Ph.k1.toFixed(2)})`);
    await ph.evaluate(()=>{ App.route='office'; render(); }); await ph.waitForTimeout(200); ok(await ph.evaluate(()=>{ const t=document.querySelector('.v1812m-tz'); return !!t&&t.getBoundingClientRect().width<=390&&document.documentElement.scrollWidth<=391; }), 'phone: the Overview teaser fits');
    await ph.context().close(); }

  /* ---------- light theme ---------- */
  await page.evaluate(()=>{ PREFS.theme={preset:null,custom:{bg:'#f3f0e8',surface:'#ffffff',text:'#1b1f25',accent:'#d97706',accent2:'#2563eb'}}; savePrefs(); App.route='countymap'; render(); }); await page.waitForTimeout(500);
  ok(await page.evaluate(()=>document.getElementById('v1812m').classList.contains('light')&&getComputedStyle(document.getElementById('v1812m-stage')).backgroundImage!=='none'), 'a light theme gets a light map');
  await page.evaluate(()=>{ PREFS.theme={preset:'night'}; savePrefs(); });

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,4).join(' | '):''));
  await b.close(); console.log(fails?'FAILED '+fails:'ALL PASSED'); process.exit(fails?1:0); })();
