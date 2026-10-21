// Live-match integrity + sync audit: runs a full match in Chromium and checks
// (1) the ball is always owned, in flight from a player, or dead at a set-piece spot / in the net,
// (2) every goal's final shot was struck by the scorer, and the GOAL is announced only once the ball is over the line,
// (3) saves are announced with the ball in the keeper's hands, (4) commentary only appears through emit/flush.
const { chromium } = require('./_pw');
const speed=+(process.argv[2]||4), seed=process.argv[3]||'syncaudit';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Audit Coach'); await page.fill('#nc-seed',seed);
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{
    const A=window.__audit={frames:0,loose:0,looseMs:0,far:0,goals:[],saves:[],badFeed:0,launches:[],emits:[]};
    const L0=Stage.prototype.launch; Stage.prototype.launch=function(p,o){ if(p&&o.kind==='shot'){ const gx=p.side===0?105:0; const d=Math.abs(p.x-gx); A.shotDist=A.shotDist||{max:0,n:0,over30:0}; A.shotDist.n++; if(d>A.shotDist.max) A.shotDist.max=+d.toFixed(1); if(d>31){ A.shotDist.over30++; A.shotDist.far=(A.shotDist.far||[]).concat([{d:+d.toFixed(1),sp:this.setPiece}]); } } A.launches.push({pid:p?p.pid:null,kind:o.kind||'pass',t:this.now,fromZ:this.ball.z,owner:this.own?this.own.pid:null}); if(p&&this.own!==null&&this.own!==p) A.badLaunch=(A.badLaunch||0)+1; return L0.call(this,p,o); };
    const G0=Stage.prototype.goalSequence; Stage.prototype.goalSequence=function(e){ e._orig=e.ty; e._seq=(e.seq||[]).map(q=>q.a).join('>'); return G0.call(this,e); };
    const E0=window.liveEmit; let inEmit=false; window.liveEmit=function(e){ const st=App.live&&App.live.stage; inEmit=true;
      if(st){ A.emits.push({t:e.t,now:st.now});
        if(e.t==='goal'){ const shots=A.launches.filter(l=>l.kind==='shot'); const last=shots[shots.length-1]; const gx=e.s===0?105:0; A.goals.push({orig:e._orig,seq:e._seq,pid:e.pid,shooter:last&&last.pid,overLine:e.s===0?st.ball.x>105:st.ball.x<0,bx:+st.ball.x.toFixed(2),bz:+st.ball.z.toFixed(2),ty:e.ty,inNet:!!st.inNet}); }
        if(e.t==='save'){ A.saves.push({inHands:!!(st.own&&st.own.gk&&st.hands),parried:!!(st.fl&&st.fl.phys&&!st.own&&(()=>{ const g=[...st.players.values()].find(q=>q.gk&&q.dive); return g&&Math.hypot(g.x-st.ball.x,g.y-st.ball.y)<4; })())}); } }
      try{ return E0.call(this,e); } finally{ inEmit=false; } };
    const F0=window.feedPush; window.feedPush=function(e,q){ if(!q&&!inEmit&&!window.__flushing) A.badFeed++; return F0.call(this,e,q); };
    const FL=window.flushPending; window.flushPending=function(){ window.__flushing=true; try{ return FL.call(this); } finally{ window.__flushing=false; } };
    let last=performance.now();
    const tick=()=>{ const st=App.live&&App.live.stage; const now=performance.now(); const dt=now-last; last=now;
      if(st&&st.alive&&!App.live.done&&!st.skip){ A.frames++;
        A.prev=A.prev||new Map(); const sx=(ax,ay,bx,by,cx,cy,dx,dy)=>{ const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx); if(Math.abs(d)<1e-9) return false; const u=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d, v=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d; return u>=0&&u<=1&&v>=0&&v<=1; };
        for(const q of st.players.values()){ const pr=A.prev.get(q); if(pr){ for(const gx of [0,105]){ const d=gx===0?-1:1, x1=gx+d*2; if(sx(pr[0],pr[1],q.x,q.y,gx,30.34,x1,30.34)||sx(pr[0],pr[1],q.x,q.y,gx,37.66,x1,37.66)||sx(pr[0],pr[1],q.x,q.y,x1,30.34,x1,37.66)){ A.net=(A.net||0)+1; (A.netD=A.netD||[]).push({pid:q.pid,gk:q.gk,from:pr.map(v=>+v.toFixed(2)),to:[+q.x.toFixed(2),+q.y.toFixed(2)],ov:q.ov,chase:!!q.chase,celeb:q.celebType,glide:!!q.glide,tx:+q.tx.toFixed(2),ty:+q.ty.toFixed(2)}); } } } A.prev.set(q,[q.x,q.y]); }
        { const o=st.own; /* only a direct swap counts: the opponent had it on the previous frame, with no flight or dead ball in between */ if(o&&!st.hands&&A.lastOwn&&A.lastOwn!==o&&A.lastOwn.side!==o.side&&A.ownPrev===A.lastOwn){ const dd=Math.hypot(A.lastOwn.x-o.x,A.lastOwn.y-o.y); if(A.prevFl){ A.won=(A.won||0)+1; } else if(dd>4){ A.farSteal=(A.farSteal||0)+1; (A.fsD=A.fsD||[]).push({from:A.lastOwn.pid,to:o.pid,dd:+dd.toFixed(1),fl:A.launches[A.launches.length-1]}); } A.steals=(A.steals||0)+1; } if(o) A.lastOwn=o; A.ownPrev=o||null; }
        if(st.fl&&st.fl.kind==='shot'&&st.fl.t0===st.now){}
        A.prevFl=!!st.fl||A.flPrev; A.flPrev=!!st.fl;
        const owned=!!st.own, fl=!!st.fl, dead=!!st.inNet || (!st.own && st.ownLock && Math.hypot(st.ball.x-st.ownLock.x,st.ball.y-st.ownLock.y)<0.3);
        if(!owned&&!fl&&!dead){ A.loose++; A.looseMs+=dt; const l=A.launches[A.launches.length-1]; const k=(l?l.kind:'none')+(st.so?'-so':''); A.lk=A.lk||{}; A.lk[k]=(A.lk[k]||0)+dt; }
        if(owned&&!fl&&!st.placed){ const o=st.own; const t=st.hands?st.handsOf(o):st.footOf(o); if(Math.hypot(st.ball.x-t.x,st.ball.y-t.y)>1.6){ A.far++; const l=A.launches[A.launches.length-1]; if((A.farD=A.farD||[]).length<6) A.farD.push({pid:o.pid,hands:st.hands,d:+Math.hypot(st.ball.x-t.x,st.ball.y-t.y).toFixed(2),b:[+st.ball.x.toFixed(1),+st.ball.y.toFixed(1)],p:[+o.x.toFixed(1),+o.y.toFixed(1)],l,now:st.now}); const k=(l?l.kind:'none')+(st.hands?'-hands':''); A.fk=A.fk||{}; A.fk[k]=(A.fk[k]||0)+1; } } }
      requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  });
  await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
  await page.click(`[data-a="pvSpeed"][data-v="${speed}"]`).catch(()=>{}); await page.click('[data-a="kickoff"]');
  await page.waitForTimeout(800); await page.screenshot({path:'test/shots/v3-intro.png'});
  const t0=Date.now();
  while(Date.now()-t0<240000){
    if(await page.$('#lv-ht .htbox')){ await page.click('#ht-go'); }
    if(await page.$('#lv-cont')) break;
    await page.waitForTimeout(400);
  }
  const res=await page.evaluate(()=>{ const A=window.__audit; return {frames:A.frames,loose:A.loose,looseMs:Math.round(A.looseMs),far:A.far,farD:A.farD,badLaunch:A.badLaunch||0,badFeed:A.badFeed,goals:A.goals,saves:A.saves.length,savesNotInHands:A.saves.filter(s=>!s.inHands&&!s.parried).length,parried:A.saves.filter(s=>s.parried).length,airShots:A.launches.filter(l=>l.kind==='shot'&&l.pid==null).length, score:App.live?App.live.view.sc:null, feed:App.live?App.live.feed.length:0,lk:A.lk,fk:A.fk,net:A.net||0,netD:A.netD,fsD:(A.fsD||[]).map(x=>({...x,fl:x.fl&&x.fl.kind})),farD:A.farD,steals:A.steals||0,farSteal:A.farSteal||0,wonViaBall:A.won||0,shotDist:A.shotDist}; });
  console.log(JSON.stringify(res,null,1)); console.log('secs',(Date.now()-t0)/1000); if(errs.length) console.log(errs.join('\n'));
  await browser.close();
})();
