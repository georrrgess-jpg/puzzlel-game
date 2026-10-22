/* Reference prototype for ANIMATION_PLAN 3.3 (not a test). Needs vendor/three.min.js (Phase 3.1). Run: node test/plan/proto_fig3d/run.js -> test/shots/plan/fig-{close,mid,far}.png */
const { chromium, DIST } = require('../../_pw'); const OUT=require('path').resolve(__dirname,'../../shots/plan')+'/'; require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1200,height:700}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(DIST); await p.waitForTimeout(600); await p.addScriptTag({path:require('path').resolve(__dirname,'../../../vendor/three.min.js')}); await p.addScriptTag({path:__dirname+'/fig.js'});
  for(const [tag,camPos,look,fov] of [['close',[6,1.6,9],[6,1.0,3],30],['mid',[6,6,22],[6,0.8,3],30],['far',[6,16,48],[6,0.5,3],30]]){
    await p.evaluate(([tag,camPos,look,fov])=>{ document.querySelectorAll('canvas[data-proto]').forEach(c=>c.remove());
      const X=protoFig({W:1200,H:700,cam:camPos,look,fov,unit:0.92,ol:0.012}); X.cv.dataset.proto=1;
      const fake=Object.create(Stage.prototype); Object.assign(fake,{now:5000,own:null,hands:false,placed:false,ball:{x:999,y:0,z:0},spdMul:1,ts:1});
      const kitA={shirt:'#c8102e',shorts:'#ffffff',socks:'#c8102e'}, kitB={shirt:'#f2c230',shorts:'#1d2b6b',socks:'#f2c230'}, gk={shirt:'#22c3e6',shorts:'#111',socks:'#22c3e6'};
      const mk=(x,y,yaw,kit,o)=>{ const fig=Object.assign({x,y,yaw,look:defaultLook('p'+x+y,11),hgt:70,num:9,face:1,ph:0,spd:0,seed:x,kickT:-9e9,trip:-9e9,jumpT:-9e9},o||{}); const F=X.makeFig(kit,fig.look); return {fig,F}; };
      const figs=[ mk(1,3,0.2,kitA,{spd:7,vx:7,vy:0,ph:1.1,gv:7}), mk(3,2.4,-0.3,kitB,{spd:3,vx:3,ph:2.4,gv:3}), mk(5,3.2,Math.PI/2,kitA,{kickT:4800,kickW:200,kickF:340,kickK:'shot'}), mk(7,2.6,Math.PI/2,kitB,{jumpT:4800}), mk(9,3,Math.PI/2,gk,{gk:true,dive:{t:4800,dir:1}}), mk(11,2.8,Math.PI/2,kitA,{celeb:true,celebType:'classic',celebT:4300}) ];
      for(const q of figs){ fake.blendPose(q.fig,fake.poseOf(q.fig,false)); fake.now+=40; } fake.now=5000;
      for(const q of figs) X.pose(q.F,q.fig,fake); X.render(); },[tag,camPos,look,fov]);
    await p.waitForTimeout(300); await p.screenshot({path:OUT+`fig-${tag}.png`}); }
  console.log(errs.join('\n')||'no errors'); await b.close(); })();
