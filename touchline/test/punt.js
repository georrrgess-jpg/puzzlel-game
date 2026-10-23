// Goalkeeper punt (v18.2): in the lab punt scene the keeper punts (P.act 'punt'), the ball meets the kicking foot at contact,
// rises above 10 m, lands more than 35 m from the keeper, never jumps more than 3 m between steps, and the page throws nothing.
const { chromium, DIST } = require('./_pw');
(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1100,height:640}});
  const errs=[]; page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1]));
  let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
  await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
  ok(await page.evaluate(()=>LAB_SCENES.some(s=>s[0]==='punt')), 'the lab lists a keeper punt scene');
  await page.evaluate(()=>{ try{ PREFS.renderer='2d'; }catch(e){} labRun('punt'); return 1; });
  await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:20000});
  await page.evaluate(()=>{ const st=App.labSt; const R=window.__pr={acts:{},maxZ:0,jumps:0,maxJump:0,landed:null,steps:0,started:false}; let prev=null;
    const U=Stage.prototype.update; st.update=function(dt){ const r=U.call(this,dt); const K=this._v18pk, L=this.lastPunt, b=this.ball;
      if(K){ R.started=true; R.acts[this.poseOf(K.p).act]=1; R.kick=R.kick||{x:K.x0+K.ax*K.run,y:K.y0+K.ay*K.run}; }
      const inPunt=R.started&&!R.landed; if(inPunt){ R.steps++; if(prev){ const j=Math.hypot(b.x-prev[0],b.y-prev[1],b.z-prev[2]); R.maxJump=Math.max(R.maxJump,j); if(j>3) R.jumps++; } prev=[b.x,b.y,b.z]; }
      if(L&&L.fl){ if(this.fl===L.fl) R.maxZ=Math.max(R.maxZ,b.z); else if(!R.landed){ R.landed={x:b.x,y:b.y}; R.contactD=L.contactD; R.h=L.h; R.gk=L.gk.pid; } }
      return r; }; });
  await page.waitForFunction(()=>window.__pr&&window.__pr.landed,null,{timeout:90000}).catch(()=>{});
  const R=await page.evaluate(()=>window.__pr);
  ok(R.started&&R.acts.punt, 'the keeper punts after the catch (P.act punt seen: '+Object.keys(R.acts).join(',')+')');
  ok(R.contactD!=null&&R.contactD<0.6, 'the ball is on the kicking foot at contact ('+(R.contactD!=null?R.contactD.toFixed(2)+' m':'no contact seen')+')');
  ok(R.maxZ>10, 'the punt goes high (apex '+R.maxZ.toFixed(1)+' m)');
  const far=R.landed&&R.kick? Math.hypot(R.landed.x-R.kick.x,R.landed.y-R.kick.y) : 0;
  ok(far>35, 'the punt lands far upfield ('+far.toFixed(1)+' m from the keeper)');
  ok(R.jumps===0, 'the ball never teleports during the punt (largest step '+R.maxJump.toFixed(2)+' m over '+R.steps+' steps)');
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
