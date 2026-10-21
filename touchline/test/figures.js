const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1200,height:700},deviceScaleFactor:2});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); d.appendChild(c); document.body.appendChild(d);
    const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid+'zz',11),h:66+(i%5)*2}; return {pid,role,x,y}; }),off:{}});
    const st=new Stage(c,T,{minimap:false,lookup:pid=>looks[pid],demo:true}); window.__st=st; st.demoCalm=true;
    st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10');
    // line players up across the frame for a close look
    let i=0; for(const p of st.players.values()){ p.ov={x:40+(i%11)*2.2, y:30+Math.floor(i/11)*5}; i++; }
    st.snap(); st.zoomTo(0.6); st.cam.w=st.cam.tw; st.cam.x=51; st.focus={x:51};
    const arr=[...st.players.values()]; arr[2].celeb=true; arr[3].sad=true; arr[4].kickT=1e9; arr[13].dive={dir:1,t:0}; arr[0].gk=true; st.own=arr[5]; setInterval(()=>{ arr[7].slideT=st.now-220; arr[8].fallT=st.now-450; arr[9].trip=st.now-200; },30);
  });
  await page.waitForTimeout(900); await page.screenshot({path:'test/shots/v3-figures.png'});
  console.log(errs.join('\n')); await browser.close();
})();
