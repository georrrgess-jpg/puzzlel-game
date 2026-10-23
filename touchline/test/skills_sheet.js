// v18.6 skill moves: close-up frames of every move from the lab ('skills' / 'skillsmod'), paused at fixed points of each move
// (u = .1 .3 .5 .7 .9), cropped round the carrier. Usage: node test/skills_sheet.js [scene] [2d|3d] [moves,comma,separated]
// -> test/shots/v186/skills/<scene>-<renderer>-<move>-<u>.png
const { chromium } = require('./_pw'); const DIST=process.env.V186DIST||require('./_pw').DIST;
const fs=require('fs'), path=require('path');
const scen=process.argv[2]||'skills', rend=process.argv[3]||'2d', only=(process.argv[4]||'').split(',').filter(Boolean);
const OUT=path.join(__dirname,'shots','v186','skills'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:rend==='3d'?['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:[]});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  await page.evaluate(([s,r,o])=>{ PREFS.renderer=r==='3d'?'3d':'2d'; if(o.length) window.__seq=o; labRun(s); },[scen,rend,only]);
  await page.waitForFunction(()=>App.labSt&&App.labSt._v186lab,null,{timeout:20000});
  await page.evaluate(()=>{ const st=App.labSt; if(window.__seq) st._v186seq=window.__seq; const P=[...st.players.values()]; const fw=P.filter(p=>p.side===0)[9]; st.focus=fw; window.__fw=fw;
    const U=[0.1,0.3,0.5,0.7,0.9]; const W=window.__W={q:[],done:{}}; const up=st.update;
    st.update=function(dt){ const r=up.call(this,dt); this.zoomTo(window.__Z||0.2); const o=fw; if(o.v186k){ const C=v186sClock(this,o); const key=o.v186k+'@'+o.v186t0; const d=W.done[key]||(W.done[key]=0);
        if(C&&d<U.length&&C.u>=U[d]){ W.done[key]=d+1; this.paused=true; W.q.push({k:o.v186k,u:U[d]}); } } return r; }; });
  const seen={}; const t0=Date.now();
  while(Date.now()-t0<(rend==='3d'?600000:240000)){
    const w=await page.evaluate(()=>{ const W=window.__W; const st=App.labSt; if(!st.paused||!W.q.length) return null; const it=W.q.shift(); const fw=window.__fw;
      const [x,y]=st.proj(fw.x,fw.y); const r=st.cv.getBoundingClientRect(); return {...it,x:r.left+x,y:r.top+y}; });
    if(!w){ await page.waitForTimeout(40); continue; }
    await page.waitForTimeout(rend==='3d'?900:120);
    const name=`${scen}-${rend}-${w.k}-${w.u.toFixed(1)}.png`; const cw=460, ch=420;
    await page.screenshot({path:path.join(OUT,name),clip:{x:Math.max(0,Math.min(1100-cw,w.x-cw/2)),y:Math.max(0,Math.min(640-ch,w.y-ch*0.82)),width:cw,height:ch}});
    seen[w.k]=(seen[w.k]||0)+1; await page.evaluate(()=>{ App.labSt.paused=false; });
    const want=only.length?only:['feint','step1','step2','roll','cut','chop','drag','cruyff']; if(want.every(k=>(seen[k]||0)>=5)) break; }
  console.log('frames', JSON.stringify(seen)); console.log('errors', errs.slice(0,4));
  await browser.close();
})();
