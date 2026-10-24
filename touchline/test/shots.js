// Shot techniques and header variety (v18.7 A2, src/v17/84_shots.js). Lab (2-D, each kind forced in the 'shots' and
// 'headers' scenes): every technique (driven, placed side-foot, chip, toe-poke, outside of the boot, first-time volley) and
// every header (diving, glancing, power, defensive clearing) happens; the kicking boot / the head is within 0.3 m of the
// ball when it leaves; the wind-up is the stage's (the volley's cross is longer by exactly the wind-up it no longer has);
// the chip's arc is higher, the clearance climbs; the dive is flat at contact, lands on the chest and is up before the
// celebration; the jump apex scales with height (tall > short). Live: a full match with the feature on shows several
// techniques and the same events (type, minute, player, side, kind) as the same match with it off. No page errors.
// Usage: node test/shots.js [lab|live|all]   (default all)
const { chromium, DIST } = require('./_pw');
const only=process.argv[2]||'all'; const want=k=>only==='all'||only===k;
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
const errs=[]; const watch=page=>{ page.on('pageerror',e=>errs.push('pageerror: '+e.message+' '+(e.stack||'').split('\n')[1])); page.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); }); };

/* in-page: per-step record of the striker's releases and the header's contact (installed on each lab stage) */
const INSTR=()=>{ const st=App.labSt; const R=window.__R={rel:[],cross:[],dive:[],nod:[],celeb:[]}; const P=[...st.players.values()]; const fw=P.filter(q=>q.side===0)[9];
  const S=p=>v187sS(st,p); const W=(p,w)=>v187sW(p,w,S(p),v187sYaw(p));
  const footW=(p,Q,i)=>{ const ft=Q.feet[i]; return W(p,v187sFwd(ft.f,ft.u+0.06,ft.l,Q.pitchB||0,Q.rollB||0,Q.lift||0,Q.pivot||0)); };
  const headW=(p,Q)=>W(p,v187sFwd(0.02,1.83,0,Q.pitchB||0,Q.rollB||0,Q.lift||0,Q.pivot||0));
  let lastFl=null, lastCel=new Set(); const U=st.update;
  st.update=function(dt){ const r=U.call(this,dt); try{ const f=this.fl, b=this.ball;
    if(f&&f!==lastFl&&!f.phys){ lastFl=f; const k=[...this.players.values()].find(q=>q.kickT>-1e8&&Math.abs(q.kickT+(q.kickW||0)-f.t0)<1.5); /* the striker: his wind-up ended as this flight began */ const c={x:f.from.x,y:f.from.y,z:f.from.z+BALL_R};
      if(f.home&&!f.hands){ R.cross.push({to:f.home.pid,head:f.head,dur:Math.round(f.dur),h:+f.h.toFixed(2),W:this.windOf('shot'),vol:f.home.v187vk||null,hk:f.home.v187hk||null}); }
      if(k&&(f.kind==='shot'||f.kind==='clear')){ const Q=this.poseOf(k); const head=k.kickK==='head';
        const pt=head?headW(k,Q):footW(k,Q,1); const d=Math.hypot(pt.x-c.x,pt.y-c.y,pt.z-c.z);
        R.rel.push({pid:k.pid,t:f.v187s||null,hd:f.v187hd||null,kind:f.kind,d:+d.toFixed(3),W:k.kickW,W0:this.windOf('shot'),h:+f.h.toFixed(2),dur:Math.round(f.dur),th:+(Q.pitchB||0).toFixed(2),head}); } }
    for(const q of this.players.values()){
      if(q.v187hk==='dive'&&q.v187hc!=null&&q.v187hl){ const T=v187sHDur(this), tau=v187sHTau(this,q); if(tau>=T.fa&&tau<T.fa+T.li){ const Q=this.poseOf(q); R.dive.push({lie:1,lift:+(Q.lift||0).toFixed(2),th:+(Q.pitchB||0).toFixed(2),hz:+headW(q,Q).z.toFixed(2)}); } }
      if((q.v187hk==='glance'||q.v187hk==='clear')&&q.nodT!=null&&this.now-q.nodT>=0&&this.now-q.nodT<this.D(280)){ const Q=this.poseOf(q); R.nod.push({k:q.v187hk,turn:+(Q.headTurn||0).toFixed(2),tilt:+(Q.headTilt||0).toFixed(2)}); }
      if(q.celeb&&!lastCel.has(q)){ lastCel.add(q); const Q=this.poseOf(q); R.celeb.push({pid:q.pid,act:Q.act,dive:q.v187hk==='dive'&&q.v187hc!=null?Math.round(v187sHTau(this,q)):null,end:q.v187hk==='dive'?(()=>{ const T=v187sHDur(this); return Math.round(T.fa+T.li+T.up); })():null}); } else if(!q.celeb) lastCel.delete(q); }
  }catch(e){ R.err=String(e&&e.stack||e); } return r; }; };

async function labScene(page,scen,k,until,ms){ await page.evaluate(([s,k])=>{ PREFS.renderer='2d'; PREFS.plates=false; window.__v187only=k; V187S.log.length=0; labRun(s); },[scen,k]);
  await page.waitForFunction(()=>App.labSt&&App.labSt.players&&App.labSt.players.size>0,null,{timeout:30000}); await page.evaluate(INSTR);
  const t0=Date.now(); while(Date.now()-t0<ms){ await page.waitForTimeout(500); const R=await page.evaluate(()=>window.__R); if(until(R)) break; }
  return page.evaluate(()=>({R:window.__R,log:V187S.log.slice()})); }

(async()=>{
  const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  if(want('lab')){ const page=await browser.newPage({viewport:{width:1100,height:640}}); watch(page);
    await page.goto(DIST+'#anim-lab'); await page.waitForTimeout(900);
    /* shots */
    for(const k of ['drive','place','chip','toe','outside','volley']){
      const {R,log}=await labScene(page,'shots',k,R=>R.rel.some(r=>r.t===k)&&(k!=='volley'||R.rel.length>=1),40000);
      const r=R.rel.find(x=>x.t===k); if(R.err) console.log('  instr error',R.err);
      ok(!!r, `${k}: the technique happens (${log.filter(l=>l.k==='shot').map(l=>l.t).join(',')||'none'})`);
      if(!r) continue;
      ok(r.d<=0.3, `${k}: the boot is ${r.d.toFixed(2)} m from the ball as it leaves (<= 0.3)`);
      if(k==='volley'){ const c=R.cross.find(x=>x.vol); ok(r.W===0&&c&&c.dur>0, `volley: no wind-up on the strike (W ${r.W}), the cross carries it (${c?c.vol:'-'}, cross ${c?c.dur:'-'} ms incl. +${c?c.W:'-'} ms)`); }
      else ok(r.W===r.W0, `${k}: the wind-up is the stage's own (${r.W} ms)`);
      if(k==='chip') ok(r.h>=1.5, `chip: the arc rises to ${r.h} (ordinary shot 0.25)`); }
    /* headers */
    { const {R,log}=await labScene(page,'headers','dive',R=>R.celeb.length>0&&R.rel.some(r=>r.hd==='dive'),45000); const r=R.rel.find(x=>x.hd==='dive');
      ok(!!r, `dive: a diving header happens (${log.filter(l=>l.k==='head').map(l=>l.kind).join(',')||'none'})`);
      if(r){ ok(r.d<=0.3, `dive: the head is ${r.d.toFixed(2)} m from the ball at contact`); ok(r.th>=1.1, `dive: the body is flat at contact (pitch ${r.th} rad)`); }
      const lie=R.dive.filter(x=>x.lie); ok(lie.length>0&&lie.every(x=>x.lift<=-0.6&&x.hz<0.4), `dive: he lands on his chest (${lie.length} steps, head ${lie.length?Math.max(...lie.map(x=>x.hz)):'-'} m, lift ${lie.length?Math.max(...lie.map(x=>x.lift)):'-'})`);
      const c=R.celeb.find(x=>x.dive!=null); ok(!c||c.dive>=c.end, `dive: he is up before the celebration (${c?c.dive+' / '+c.end+' ms':'no celebration seen'})`); }
    { const {R,log}=await labScene(page,'headers','glance',R=>R.rel.some(r=>r.hd==='glance')&&R.nod.length>2,40000); const r=R.rel.find(x=>x.hd==='glance');
      ok(!!r, `glance: a glancing header happens (${log.filter(l=>l.k==='head').map(l=>l.kind).join(',')||'none'})`);
      if(r){ ok(r.d<=0.3, `glance: the head is ${r.d.toFixed(2)} m from the ball`); ok(r.h<=0.06, `glance: a skimming flight (h ${r.h})`); }
      const n=R.nod.filter(x=>x.k==='glance'); ok(n.some(x=>Math.abs(x.turn)>0.25), `glance: the head turns to steer it (max ${n.length?Math.max(...n.map(x=>Math.abs(x.turn))).toFixed(2):'-'} rad)`); }
    { const {R,log}=await labScene(page,'headers','power',R=>R.rel.some(r=>r.hd==='power'),40000); const r=R.rel.find(x=>x.hd==='power');
      ok(!!r&&r.d<=0.3, `power: a power header happens, head ${r?r.d.toFixed(2):'-'} m from the ball`); }
    { const {R,log}=await labScene(page,'headers','clear',R=>R.rel.some(r=>r.hd==='clear')&&R.nod.length>2,40000); const r=R.rel.find(x=>x.hd==='clear');
      ok(!!r, `clear: a defensive clearing header happens (${log.filter(l=>l.k==='head').map(l=>l.kind).join(',')||'none'})`);
      if(r){ ok(r.d<=0.3, `clear: the head is ${r.d.toFixed(2)} m from the ball`); ok(r.h>=4.9, `clear: it climbs (h ${r.h}, before 3.2)`); }
      const n=R.nod.filter(x=>x.k==='clear'); ok(n.some(x=>x.tilt>0.75), `clear: the neck snaps forward (max tilt ${n.length?Math.max(...n.map(x=>x.tilt)).toFixed(2):'-'})`); }
    /* jump apex by height */
    { const J=await page.evaluate(()=>{ const st=App.labSt; const fw=[...st.players.values()].filter(q=>q.side===0)[9]; const JD=Math.max(260,st.D(560)); const out={};
        for(const h of [64,70,77]){ const q={...fw,hgt:h,jumpT:st.now-JD/2,nodT:-9e9,kickT:-9e9,v187hk:null,v187hc:null,v187vk:null,celeb:false,_pose:null,dive:null}; const Q=st.poseOf(q); out[h]={head:+st.headOf(q).z.toFixed(3),lift:+st.jumpLift(q).toFixed(3),drawn:+((Q.lift||0)*v187sS(st,q)).toFixed(3)}; } return out; });
      console.log('  apex by height: '+JSON.stringify(J));
      ok(J[77].head>J[70].head+0.12&&J[70].head>J[64].head+0.12, `jump apex scales with height (head at the top: 64 in ${J[64].head} m, 70 in ${J[70].head} m, 77 in ${J[77].head} m)`);
      ok(J[77].lift>J[64].lift*1.4&&J[77].drawn>J[64].drawn*1.4, `the leap itself is higher for the tall player (${J[64].lift} vs ${J[77].lift} m; drawn ${J[64].drawn} vs ${J[77].drawn} m)`); }
    await page.close(); }

  if(want('live')){ const speed=+(process.env.SPEED||4); const runs={};
    for(const on of [true,false]){ const page=await browser.newPage({viewport:{width:1280,height:800}}); watch(page);
      await page.goto(DIST); await page.waitForTimeout(500);
      await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Shots Coach'); await page.fill('#nc-seed','shots187');
      await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
      await page.evaluate(on=>{ V187S.on=on; V187S.log.length=0; const A=window.__lv={ev:[],winds:[]};
        const E0=window.liveEmit; window.liveEmit=function(e){ A.ev.push([e.t,e.m,e.pid,e.s,e.ty||'',e.res||''].join('|')); return E0.apply(this,arguments); };
        const L0=Stage.prototype.launch; Stage.prototype.launch=function(p,o){ const r=L0.apply(this,arguments); try{ if(p&&o&&o.kind==='shot'&&!o.nod&&!this.skip&&p.kickT===this.now) A.winds.push({W:p.kickW,W0:this.windOf('shot'),vol:p.v187t==='volley'}); }catch(e){} return r; }; },on);
      await page.click('.cta [data-a="playNext"]'); await page.waitForTimeout(400);
      await page.click(`[data-a="pvSpeed"][data-v="${speed}"]`).catch(()=>{}); await page.click('[data-a="kickoff"]');
      const t0=Date.now(); while(Date.now()-t0<420000){ if(await page.$('#lv-ht .htbox')) await page.click('#ht-go').catch(()=>{}); if(await page.$('#lv-cont')) break; await page.waitForTimeout(400); }
      runs[on]=await page.evaluate(()=>({ev:window.__lv.ev,winds:window.__lv.winds,log:V187S.log.slice()})); runs[on].secs=Math.round((Date.now()-t0)/1000); await page.close(); }
    const A=runs[true], B=runs[false]; const tech={}, head={}; for(const l of A.log){ if(l.k==='shot') tech[l.t]=(tech[l.t]||0)+1; if(l.k==='head') head[l.kind]=(head[l.kind]||0)+1; }
    console.log(`  live ${speed}x: ${A.ev.length} events in ${A.secs}s (off: ${B.ev.length} in ${B.secs}s); techniques ${JSON.stringify(tech)}; headers ${JSON.stringify(head)}`);
    ok(Object.keys(tech).length>=3, `live: several strike techniques in one match (${Object.keys(tech).length})`);
    ok(A.ev.length>20&&A.ev.join('\n')===B.ev.join('\n'), `live: the same events with the feature on and off (${A.ev.length} vs ${B.ev.length}${A.ev.join('\n')===B.ev.join('\n')?'':'; first difference at '+A.ev.findIndex((x,i)=>x!==B.ev[i])})`);
    const bad=A.winds.filter(w=>w.vol?w.W!==0:w.W!==w.W0); ok(A.winds.length>0&&bad.length===0, `live: every strike keeps the stage's wind-up (${A.winds.length} strikes, ${bad.length} changed)`); }

  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  await browser.close(); console.log(fails?`${fails} FAILED`:'ALL PASS'); process.exit(fails?1:0);
})();
