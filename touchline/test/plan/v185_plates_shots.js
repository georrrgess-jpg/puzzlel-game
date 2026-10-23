/* v18.5 plates visual pass: live match frames with the carrier and defender tags up, desktop (1440x900) and phone (390x844),
   two themes each, 3-D Broadcast at Wide / Normal / Tight, Sideline, Tactical, the 2-D renderer, plates off; lab scenes
   (keeper holding, throw-in, penalty). -> test/shots/v185/plates/   node test/plan/v185_plates_shots.js [d|p|lab] */
const { chromium, DIST } = require('../_pw');
const fs=require('fs'); const OUT='test/shots/v185/plates/'; fs.mkdirSync(OUT,{recursive:true});
const until=async(p,fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(200); } return false; };
const only=process.argv[2]||'';
async function startLive(p,seed,renderer,theme){
  await p.goto(DIST); await p.waitForTimeout(600);
  await p.evaluate(([r,t])=>{ PREFS.renderer=r; PREFS.rtier='B'; PREFS.replays=true; PREFS.view='broadcast'; PREFS.zoom='normal'; PREFS.plates=true; PREFS.theme={preset:t,custom:null}; savePrefs(); applyTheme(); },[renderer,theme]);
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Plates Coach'); await p.fill('#nc-seed',seed);
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ App.C.settings.walkout='off'; App.C.settings.walk2=1; });
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  await until(p,()=>!!(App.live&&App.live.stage&&App.live.stage.alive&&App.live.stage.own),25000); await p.evaluate(()=>A.liveSpeed({dataset:{v:1}})); }
/* wait for a carrier tag (and, when asked, a defender tag) fully up, pause, settle the 3-D camera, shoot */
async function shot(p,file,wantDef,st){ const get=st||'App.live.stage';
  await until(p,([g,d])=>{ const s=eval(g), S=s&&s._pl; if(!S) return false; const sl=[...S.slots.values()]; return sl.some(q=>q.role==='car'&&q.a>=0.99&&q.on)&&(!d||sl.some(q=>q.role==='def'&&q.a>=0.89&&q.on)); },wantDef?45000:25000,[get,!!wantDef]);
  await p.evaluate(g=>{ const s=eval(g); s.paused=true; const P=s._p3d; if(P&&!P.dead){ const D=P3D_MODULES.find(m=>m.name==='director'); for(let i=0;i<40;i++){ P.dt=0.05; if(P._sl&&s.mode==='sideline') P.camPose(s); if(D) D.frame(P,s); } } if(s.requestDraw) s.requestDraw(); },get);
  await p.waitForTimeout(2200); await p.screenshot({path:OUT+file}); await p.evaluate(g=>{ eval(g).paused=false; },get); }
async function view(p,v,z){ await p.evaluate(([v,z])=>{ PREFS.zoom=z; savePrefs(); A.liveView({dataset:{v}}); App.live.stage.v184Zoom(true); },[v,z]); await p.waitForTimeout(1500); }
(async()=>{ const b=await chromium.launch(); const errs=[];
  const runs=[[1440,900,'d',1,false,'night','3d'],[1440,900,'d',1,false,'titanium','2d'],[390,844,'p',2,true,'gold','3d'],[390,844,'p',2,true,'night','2d']];
  for(const [w,h,tag,dpr,mob,theme,r] of runs){ if(only&&only!==tag) continue;
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,isMobile:mob,hasTouch:mob}); p.on('pageerror',e=>errs.push(e.message));
    await startLive(p,'plshots',r,theme); const T=`${tag}-${r}-${theme}`;
    await shot(p,`${T}-broadcast-normal.png`,true);
    await view(p,'broadcast','wide'); await shot(p,`${T}-broadcast-wide.png`);
    await view(p,'broadcast','tight'); await shot(p,`${T}-broadcast-tight.png`);
    await view(p,'sideline','normal'); await shot(p,`${T}-sideline-normal.png`,r==='3d');
    await view(p,'tactical','normal'); await shot(p,`${T}-tactical.png`,true);
    await view(p,'broadcast','normal'); await p.evaluate(()=>{ PREFS.plates=false; }); await p.waitForTimeout(1200); await p.screenshot({path:OUT+`${T}-off.png`}); await p.evaluate(()=>{ PREFS.plates=true; });
    await p.close(); }
  if(!only||only==='lab'){ const p=await b.newPage({viewport:{width:1440,height:900}}); p.on('pageerror',e=>errs.push(e.message));
    for(const [scen,r] of [['keeper','3d'],['throwin','3d'],['pens','3d'],['tackle','2d']]){ await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900); await p.evaluate(([s,r])=>{ PREFS.renderer=r; PREFS.plates=true; setTimeout(()=>labRun(s),0); },[scen,r]);
      await until(p,()=>!!App.labSt,8000); await shot(p,`lab-${scen}-${r}.png`,scen==='pens'||scen==='tackle','App.labSt'); }
    await p.close(); }
  console.log(errs.length?'ERRORS '+errs.slice(0,4).join(' | '):'no page errors'); await b.close(); })();
