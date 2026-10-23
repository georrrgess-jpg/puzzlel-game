/* v18.5 plates visual pass, part 2 (2-D, desktop 1440x900, night theme unless noted): a pass in flight (incoming tag),
   8x, a throw-in, a keeper holding (lab), the goal-replay card and TouchlineTV. -> test/shots/v185/plates/
   node test/plan/v185_plates_scenes.js */
const { chromium, DIST } = require('../_pw');
const fs=require('fs'); const OUT='test/shots/v185/plates/'; fs.mkdirSync(OUT,{recursive:true});
const until=async(p,fn,ms,arg)=>{ const end=Date.now()+ms; while(Date.now()<end){ if(await p.evaluate(fn,arg)) return true; await p.waitForTimeout(150); } return false; };
const HOOK=()=>{ if(window._scHook) return; window._scHook=true; const D=Stage.prototype.draw; Stage.prototype.draw=function(){ if(this.cv&&this.cv.dataset&&this.cv.dataset.tv) window.TVST=this; return D.apply(this,arguments); }; };
async function freeze(p,get,file){ await p.evaluate(g=>{ eval(g).paused=true; },get); await p.waitForTimeout(800); await p.screenshot({path:OUT+file}); await p.evaluate(g=>{ eval(g).paused=false; },get); console.log('shot',file); }
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:1440,height:900}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST); await p.waitForTimeout(600); await p.evaluate(HOOK);
  await p.evaluate(()=>{ PREFS.renderer='2d'; PREFS.view='broadcast'; PREFS.zoom='normal'; PREFS.plates=true; PREFS.theme={preset:'night',custom:null}; savePrefs(); applyTheme(); });
  await p.click('[data-a="newCareerForm"][data-slot="1"]'); await p.fill('#nc-name','Plates Coach'); await p.fill('#nc-seed','plscenes');
  await p.click('[data-a="ncNext"]'); await p.waitForTimeout(200); await p.click('[data-a="createCareer"]'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ App.C.settings.walkout='off'; App.C.settings.walk2=1; });
  await p.click('.cta [data-a="playNext"]'); await p.waitForTimeout(400); await p.click('[data-a="kickoff"]');
  await until(p,()=>!!(App.live&&App.live.stage&&App.live.stage.own),25000); await p.evaluate(()=>A.liveSpeed({dataset:{v:1}}));
  const L='App.live.stage';
  if(await until(p,()=>{ const S=App.live.stage._pl; return !!S&&[...S.slots.values()].some(q=>q.role==='inc'&&q.a>=0.55&&q.on); },40000)) await freeze(p,L,'s-incoming.png');
  await p.evaluate(()=>A.liveSpeed({dataset:{v:8}})); await p.waitForTimeout(3000);
  if(await until(p,()=>{ const S=App.live.stage._pl; return !!S&&[...S.slots.values()].some(q=>q.role==='car'&&q.a>=0.99&&q.on); },20000)) await freeze(p,L,'s-8x.png');
  await p.evaluate(()=>A.liveSpeed({dataset:{v:1}}));
  /* a throw-in on the near side (the minute loop is held, as in test/sideline.js) */
  await p.evaluate(()=>{ App.live.paused=true; }); await until(p,()=>!App.live.busy,90000); await p.evaluate(()=>{ App.live.stage.paused=false; });
  p.evaluate(async()=>{ const st=App.live.stage; st.skip=false; const o=[...st.players.values()].find(q=>q.side===0&&!q.gk&&!q.off); await st.gain(o); o.x=46; o.y=63; o.ov={x:47,y:64}; await st.wait(st.D(300)); o.ov=null; await st.throwIn(); }).catch(()=>{});
  if(await until(p,()=>{ const st=App.live.stage, S=st._pl; return st.hands&&st.ball.y>67&&S&&S.car&&[...S.slots.values()].some(q=>q.role==='car'&&q.a>=0.99&&q.on); },60000)) await freeze(p,L,'s-throwin.png');
  await p.waitForTimeout(3000);
  /* the goal-replay card of a played fixture */
  await p.evaluate(()=>{ App.live.paused=false; }); await p.evaluate(()=>{ try{ A.liveSkip({dataset:{to:'ft'}}); }catch(e){} }); await until(p,()=>!!(App.live&&App.live.done),120000);
  await p.evaluate(()=>{ try{ A.liveContinue(); }catch(e){} }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); App.modal=null; });
  await p.evaluate(()=>A.simAhead({dataset:{k:'round'}})); await p.waitForTimeout(800);
  const fid=await p.evaluate(()=>{ document.querySelectorAll('.ceremony').forEach(x=>x.remove()); const C=App.C; const f=Object.values(C.fixtures).find(f=>f.st==='d'&&(f.h===C.userSid||f.a===C.userSid)&&f.hg+f.ag>0); if(!f) return null; App.modal={type:'fixture',id:f.id,tab:'high'}; renderModal(); return f.id; });
  if(fid){ await p.waitForTimeout(600); const bt=await p.$('[data-a="replayGoal"]'); if(bt){ await bt.click();
    if(await until(p,()=>{ const S=App.hl&&App.hl._pl; return !!S&&[...S.slots.values()].some(q=>q.role==='car'&&q.a>=0.99&&q.on); },30000)) await freeze(p,'App.hl','s-hlcard.png'); } }
  /* TouchlineTV */
  await p.evaluate(()=>{ App.modal=null; renderModal&&renderModal(); });
  const tv=await p.evaluate(()=>{ try{ const is=courierIssues(App.C); if(!is.length) return false; A.tvOpen({dataset:{ix:'0',k:'0'}}); return true; }catch(e){ return String(e); } });
  if(tv===true){ if(await until(p,()=>{ const st=window.TVST, S=st&&st._pl; return !!S&&[...S.slots.values()].some(q=>q.role==='car'&&q.a>=0.99&&q.on); },40000)) await freeze(p,'window.TVST','s-tv.png'); } else console.log('no TouchlineTV issue',tv);
  /* a keeper holding the ball (lab, 2-D) */
  await p.goto(DIST+'#anim-lab'); await p.waitForTimeout(900); await p.evaluate(()=>{ PREFS.renderer='2d'; PREFS.plates=true; setTimeout(()=>labRun('keeper'),0); });
  if(await until(p,()=>{ const st=App.labSt, S=st&&st._pl; return !!S&&st.hands&&st.own&&st.own.gk&&[...S.slots.values()].some(q=>q.role==='car'&&q.a>=0.99&&q.on); },40000)) await freeze(p,'App.labSt','s-lab-keeper-hands.png');
  console.log(errs.length?'ERRORS '+errs.slice(0,4).join(' | '):'no page errors'); await b.close(); })();
