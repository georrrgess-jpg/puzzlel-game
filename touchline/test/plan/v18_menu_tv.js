/* v18: title-screen demo and TouchlineTV highlights with 3-D forced -> test/shots/v18/menu-*.png, tv-*.png */
const { chromium, DIST } = require('../_pw'); const OUT=require('path').resolve(__dirname,'../shots/v18')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const [w,h,tag] of [[1440,900,'d']]){ const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<600?2:1}); p.on('pageerror',e=>errs.push(tag+' '+e.message));
    await p.addInitScript(()=>{ try{ const k=Object.keys(localStorage).find(k=>/pref/i.test(k)); }catch(e){} });
    await p.goto(DIST); await p.waitForTimeout(500); await p.evaluate(()=>{ PREFS.renderer='3d'; savePrefs(); }); await p.reload(); await p.waitForTimeout(6000);
    const st=await p.evaluate(()=>{ const s=[...(V17_STAGES||[])].find(x=>x.demo); return s?{p3d:!!(s._p3d&&!s._p3d.dead),kind:s._p3d&&s._p3d.kind}:null; }); console.log(tag,'menu',JSON.stringify(st));
    await p.screenshot({path:OUT+`menu-${tag}.png`});
    if(tag==='d'){ await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Coach'); await p.fill('#nc-seed','tv18'); await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(900);
      await p.evaluate(async()=>{ for(let i=0;i<6;i++){ try{ await A.simAhead({dataset:{k:'next'}}); }catch(e){} } App.modal=null; renderModal(); });
      const ok=await p.evaluate(()=>{ try{ if(typeof A.tvOpen==='function'){ const iss=courierIssues(App.C); A.tvOpen({dataset:{ix:String(Math.max(0,iss.length-1)),k:'all'}}); return 'tvOpen '+iss.length+' '+(App.modal&&App.modal.type)+' '+((App.modal&&App.modal.plays)||[]).length; } if(typeof A.tv==='function'){ A.tv({dataset:{}}); return 'tv'; } }catch(e){ return 'err '+e.message; } return Object.keys(A).filter(k=>/tv/i.test(k)).join(','); });
      console.log('tv action',ok); await p.waitForTimeout(7000);
      const tv=await p.evaluate(()=>{ const s=[...(V17_STAGES||[])].find(x=>x.T&&x.T.id==='tv'); return s?{p3d:!!(s._p3d&&!s._p3d.dead)}:null; }); console.log('tv stage',JSON.stringify(tv));
      await p.screenshot({path:OUT+`tv-${tag}.png`}); }
    await p.close(); }
  console.log(errs.join('\n')||'no errors'); await b.close(); })();
