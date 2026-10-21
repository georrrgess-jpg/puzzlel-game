const { chromium } = require('./_pw');
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:800,height:450}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(400);
  for(const w of [{k:'rain',night:true},{k:'snow',night:true},{k:'fog',night:false},{k:'golden',night:false}]){
    await page.evaluate(w=>{ document.getElementById('wxd')?.remove(); const d=document.createElement('div'); d.id='wxd'; d.style.cssText='position:fixed;inset:0;z-index:9999'; const c=document.createElement('canvas'); d.appendChild(c); document.body.appendChild(d); const st=startMenuShow(c); st.wx=w; st.wxp=null; window.__s&&window.__s.destroy(); window.__s=st; },w);
    await page.waitForTimeout(1800); await page.screenshot({path:`test/shots/wx-${w.k}.png`}); }
  console.log(errs.join('\n')||'no errors'); await browser.close(); })();
