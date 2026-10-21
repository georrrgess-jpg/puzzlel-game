const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1100,height:650}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(400);
  await page.evaluate(()=>{ const d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:9999;background:#000'; const c=document.createElement('canvas'); d.appendChild(c); document.body.appendChild(d);
    const T=demoTeams(); const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`f${side}${i}`; looks[pid]={num:i+1,look:defaultLook(pid+'k',11),h:70}; return {pid,role,x,y}; }),off:{}});
    const st=new Stage(c,T,{minimap:false,mode:'tactical',lookup:pid=>looks[pid]}); window.__st=st; st.ts=0.5; st.goalTs=0.5;
    st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'f00'); st.setKeeper(1,'f10'); st.kickoffShape(0); st.snap();
    (async()=>{ await st.tapOff(); // side 0 scores at the right goal, side 1 restarts
      const sc=st.pl('f09'); await st.gain(sc); await st.finish({s:0,pid:'f09',ty:'open'},sc); await st.wait(600);
      window.__phase='restart'; const T0=st.tapOff.bind(st); let lined=null; st.tapOff=async function(){ if(this.pendingKick&&!lined){ lined=true; window.__phase='lined'; const bad=[]; for(const p of this.players.values()){ const t=p.ov||{x:p.x,y:p.y}; if(p.side===0&&t.x>52.5) bad.push(p.pid+' L'); if(p.side===1&&t.x<52.5) bad.push(p.pid+' R'); if(p.side===0&&Math.hypot(t.x-52.5,t.y-34)<9.9) bad.push(p.pid+' circle'); } window.__bad=bad; await this.until(()=>{ for(const p of this.players.values()) if(p.ov&&Math.hypot(p.x-p.ov.x,p.y-p.ov.y)>1.2) return false; return true; },8000); window.__phase='set'; await this.wait(1500); } return T0(); }; const P=st.restartAfterGoal(1);
      await P; window.__phase='done'; })(); });
  for(let i=0;i<30;i++){ const ph=await page.evaluate(()=>[window.__phase, __st.pendingKick?1:0, __st.own&&__st.own.pid, __st.inNet?1:0, __st.fl?1:0, __st.waiters.length].join(' ')); console.log(ph); if(ph.startsWith('set')) break; await page.waitForTimeout(1000); } await page.screenshot({path:'test/shots/ko-set.png'});
  await page.waitForFunction(()=>window.__phase==='done',null,{timeout:20000}); await page.waitForTimeout(300); await page.screenshot({path:'test/shots/ko-after.png'});
  console.log('bad spots', JSON.stringify(await page.evaluate(()=>window.__bad)), errs.join('\n')); await browser.close(); })();
