const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1100,height:650}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); d.appendChild(c); document.body.appendChild(d);
    const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid+'q',11),h:70}; return {pid,role,x,y}; }),off:{}});
    const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid],emit:e=>window.__em.push({t:e.t,res:e.res,own:st.own&&st.own.pid,hands:st.hands,bx:st.ball.x,inNet:!!st.inNet})}); window.__st=st; window.__em=[]; window.__loose=0;
    st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap(); st.goalTs=0.8;
    const tick=()=>{ if(!st.own&&!st.fl&&!st.inNet&&!(st.ownLock&&Math.hypot(st.ball.x-st.ownLock.x,st.ball.y-st.ownLock.y)<0.3)) window.__loose++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    (async()=>{ await st.shootoutSetup(); const res=['goal','save','goal','miss','goal','goal'];
      for(let i=0;i<6;i++){ const s=i%2; await st.soKick({t:'kick',s,pid:`f${s}${10-Math.floor(i/2)}`,gk:s===0?'f10':'f00',res:res[i],soSc:[0,0]}); } window.__done=true; })(); });
  for(let i=0;i<8;i++){ await page.waitForTimeout(1600); await page.screenshot({path:`test/shots/v3-so-${i}.png`}); }
  await page.waitForFunction(()=>window.__done,null,{timeout:150000});
  console.log(JSON.stringify(await page.evaluate(()=>({em:window.__em,loose:window.__loose})))); console.log(errs.join('\n')); await browser.close(); })();
