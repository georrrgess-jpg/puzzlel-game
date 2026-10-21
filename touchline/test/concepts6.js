// Concept art 30–34, rendered with the game's own assets (mascots, portraits, kits, the 3-D figure renderer, the broadcast stage).
const { chromium } = require('./_pw');
const OUT=require('path').resolve(__dirname,'..','concepts')+'/';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Concept'); await page.fill('#nc-seed','concepts6'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ for(let i=0;i<10;i++){ simRound(App.C); advance(App.C); } });
  await page.addStyleTag({content:`
    #cx{position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:Inter,'Barlow Semi Condensed',sans-serif;color:#fff;background:#05080c}
    #cx *{box-sizing:border-box}
    .H{font-family:'Inter Display',Inter,sans-serif;font-weight:900;letter-spacing:-.01em;text-transform:uppercase;line-height:.92}
    .K{font-weight:800;letter-spacing:.28em;text-transform:uppercase;font-size:13px;color:#f5d38a}
    .tag{position:absolute;left:28px;bottom:22px;display:flex;align-items:center;gap:12px;z-index:50}
    .tag b{font-weight:900;font-size:15px;letter-spacing:.2em;padding:7px 12px;border-radius:8px;background:#ffd36b;color:#1d1300}
    .tag span{font-size:14px;color:#cfd8e2;font-weight:600;background:rgba(5,8,12,.8);padding:7px 12px;border-radius:8px}
    .chip{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-weight:700;font-size:14px}
    .glass{background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02)),rgba(8,12,18,.78);border:1px solid rgba(255,255,255,.14);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 30px 60px rgba(0,0,0,.45)}
    .gold{background:linear-gradient(180deg,#fff,#ffe7a6 50%,#d39b2a);-webkit-background-clip:text;background-clip:text;color:transparent}
    .btnc{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;font-weight:800;background:#ffd36b;color:#1d1300}
    .btng{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;font-weight:800;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16)}
    .bar{height:8px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden}.bar i{display:block;height:100%;border-radius:9px}
    .lab{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#93a3b6;font-weight:800}
  `});
  const shot=async(name)=>{ await page.waitForTimeout(1100); await page.screenshot({path:OUT+name}); await page.evaluate(()=>{ const c=document.getElementById('cx'); if(c){ if(c._st) c._st.destroy(); c.remove(); } }); };
  // shared: draw a figure with the game's renderer into a canvas
  await page.evaluate(()=>{ window.figDraw=(cv,p,o={})=>{ const W=cv.width/2, H=cv.height/2; const g=cv.getContext('2d'); g.setTransform(2,0,0,2,0,0);
      const sch=Sx(p.sid); const ks=kitsForSchools(o.sch||sch,{c1:'#777777',c2:'#333333'}); const kit=o.kit||(p.pos==='GK'?ks.gk[0]:ks.team[0]);
      const f=Object.create(Stage.prototype); Object.assign(f,{now:100000,own:null,hands:false,ball:{x:999,y:0,z:0},spdMul:1,ts:1,placed:false,depthK:0.3,proj:()=>[W/2,H*0.9,H*(o.scale||0.36)]});
      const fig={x:0,y:0,look:lookOf(p),hgt:70,num:p.num,face:1,yaw:o.yaw??0.5,ph:o.ph||0,spd:o.spd||0,seed:1,kickT:-9e9,trip:-9e9,jumpT:-9e9,gk:p.pos==='GK',...(o.fig||{})};
      if(o.ground!==false){ g.fillStyle=o.groundC||'rgba(60,170,90,.32)'; g.beginPath(); g.ellipse(W/2,H*0.9,W*0.42,H*0.06,0,0,7); g.fill(); }
      Stage.prototype.drawFigure.call(f,g,fig,kit,false); }; });
  /* a live stage frozen mid-play, shared by boards 18, 21, 22 */
  await page.evaluate(()=>{ window.stageIn=(host,o={})=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated); const cv=document.createElement('canvas'); host.appendChild(cv);
      const T={h:me,a:opp,id:'cx'+(o.id||'')}; const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`c${side}${i}`; looks[pid]={num:[1,2,4,5,3,6,8,10,7,9,11][i],look:defaultLook(pid+'c4',11),h:70}; return {pid,role,x,y}; }),off:{}});
      const st=new Stage(cv,T,{minimap:false,lookup:pid=>looks[pid],weather:o.weather||{k:'clear',night:true}}); st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'c00'); st.setKeeper(1,'c10'); st.kickoffShape(0); st.snap();
      const pls=[...st.players.values()]; const atk=pls.filter(p=>p.side===0&&!p.gk), def=pls.filter(p=>p.side===1&&!p.gk);
      const ap=o.atk||[[70,30],[74,40],[64,36],[78,24],[60,46]]; atk.slice(0,5).forEach((p,i)=>{ p.x=ap[i][0]; p.y=ap[i][1]; p.ov={x:p.x,y:p.y}; p.yaw=0.15; p.spd=5; });
      const dp=o.def||[[80,33],[79,26],[76,42],[84,38]]; def.slice(0,4).forEach((p,i)=>{ p.x=dp[i][0]; p.y=dp[i][1]; p.ov={x:p.x,y:p.y}; p.yaw=Math.PI-0.2; });
      for(const p of [...atk.slice(5),...def.slice(4)]){ p.off=true; p.ov=null; p.y=-12; }
      st.own=atk[0]; st.ball={x:atk[0].x+0.5,y:atk[0].y,z:0,spin:0}; st.zoomTo(o.zoom||0.55); st.cam.w=st.cam.tw; st.cam.x=o.camX||74; st.focus={x:o.camX||74}; st.ref.x=66; st.ref.y=20;
      setTimeout(()=>{ st.paused=true; },o.pause||700); return st; }; });

  const ONLY=process.argv.slice(2);
  const want=n=>!ONLY.length||ONLY.includes(String(n));
  /* an empty night stadium on the broadcast stage, every player hidden except the ones a board asks for */
  await page.evaluate(()=>{ window.bareStage=(host,o={})=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(o.opp||C.rivals.heated); const cv=document.createElement('canvas'); host.appendChild(cv);
      const T={h:me,a:opp,id:'c5'+(o.id||'')}; const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`d${side}${i}`; looks[pid]={num:[1,2,4,5,3,6,8,10,7,9,11][i],look:defaultLook(pid+'c5'+(o.id||''),11),h:70}; return {pid,role,x,y}; }),off:{}});
      const st=new Stage(cv,T,{minimap:false,lookup:pid=>looks[pid],weather:o.weather||{k:'clear',night:true}}); st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'d00'); st.setKeeper(1,'d10'); st.kickoffShape(0); st.snap();
      const pls=[...st.players.values()]; o.place=o.place||[]; pls.forEach(p=>{ p.off=true; p.ov=null; p.y=-30; });
      o.place.forEach(([side,i,x,y,yaw,extra])=>{ const p=pls.filter(q=>q.side===side)[i]; p.off=false; p.x=x; p.y=y; p.ov={x,y}; p.yaw=yaw||0; p.spd=0; Object.assign(p,extra||{}); });
      st.own=null; st.ball=Object.assign({x:52,y:34,z:0,spin:0},o.ball||{}); st.zoomTo(o.zoom||0.6); st.cam.w=st.cam.tw; st.cam.x=o.camX||70; st.focus={x:o.camX||70};
      if(o.ref){ st.ref.x=o.ref[0]; st.ref.y=o.ref[1]; } else { st.ref.x=-20; st.ref.y=-20; }
      setTimeout(()=>{ st.paused=true; if(o.after) o.after(st,pls); },o.pause||900); return st; }; });

  /* project a list of pitch points through a frozen stage into an SVG path */
  await page.evaluate(()=>{ window.pathOf=(st,pts)=>'M'+pts.map(([x,y,z])=>{ const q=st.proj(x,y,z||0); return q[0].toFixed(1)+' '+q[1].toFixed(1); }).join(' L'); });

  /* ---------- 30. BENDING THE BALL ---------- */
  if(want(30)){
  await page.evaluate(()=>{ const C=App.C; const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st30" style="position:absolute;inset:0"></div><svg id="sv30" style="position:absolute;inset:0;width:1600px;height:900px;pointer-events:none"></svg>
      <div style="position:absolute;left:0;top:0;bottom:0;width:600px;background:linear-gradient(90deg,rgba(5,8,12,.95),rgba(5,8,12,.75) 72%,rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Ball physics · animation</div><div class="H gold" style="font-size:70px">Bending<br>the Ball</div><div style="font-weight:700;color:#cfd8e2;margin-top:10px;max-width:480px">Today every pass and shot travels in a perfectly straight line across the grass: spin only turns the ball's panels. Give it real swerve: free kicks curl round the wall, corners whip in, long shots dip.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:330px;width:500px;padding:18px">
        <div class="lab">The strike</div>
        <div style="display:flex;gap:12px;margin-top:10px">${[['🌀','Curler','Inside of the boot, bends around the wall'],['⤵️','Dipper','Topspin, drops under the bar'],['〰️','Knuckleball','No spin, wobbles late']].map(([i,t,s],k)=>`<div style="flex:1;padding:10px;border-radius:12px;${k===0?'background:#ffd36b;color:#1d1300':'background:rgba(255,255,255,.06)'}"><div style="font-size:22px">${i}</div><b>${t}</b><div style="font-size:12px;margin-top:3px;${k===0?'':'color:#93a3b6'}">${s}</div></div>`).join('')}</div>
        <div class="lab" style="margin-top:16px">Swerve comes from the taker</div>
        ${[['Shooting',86],['Technique (passing)',78],['Strong foot','Right']].map(([l,v])=>`<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:14px"><span style="color:#cfd8e2">${l}</span><b style="font-family:'JetBrains Mono',monospace">${v}</b></div>`).join('')}
        <div style="margin-top:12px;font-size:12.5px;color:#93a3b6">Same seeded result as today: the curve is drawn so the ball still ends exactly where the match engine says it does.</div></div>
      <div class="glass" style="position:absolute;right:40px;top:36px;width:360px;padding:14px 16px">
        <div class="lab">Where you'd see it</div><div style="display:flex;flex-direction:column;gap:7px;margin-top:10px;font-size:13.5px;color:#cfd8e2">
        <div>🎯 Free kicks curl round or over the wall</div><div>🚩 Inswinging and outswinging corners</div><div>📐 Crosses that bend away from the keeper</div><div>💥 Long shots that dip or knuckle</div><div>🧤 Keepers wrong-footed by late swerve</div></div></div>
      <div style="position:absolute;right:40px;bottom:72px;display:flex;gap:10px"><span class="chip" style="border-color:#ff9a9a;color:#ffc2c2">Today: straight line</span><span class="chip" style="border-color:#ffd36b;color:#ffe3a3">New: real curve</span></div>
      <div class="tag"><b>CONCEPT 30</b><span>Bending the Ball · swerve, dip and knuckle on free kicks, corners, crosses and long shots</span></div>`;
    document.body.appendChild(d);
    d._st=bareStage(d.querySelector('#st30'),{id:30,zoom:0.5,camX:90,place:[[0,9,80.5,26,0.35,{}],[1,2,89.6,30.2,Math.PI],[1,3,89.6,31.0,Math.PI],[1,4,89.6,31.8,Math.PI],[1,5,89.6,32.6,Math.PI],[1,0,104,33.4,Math.PI],[0,8,95,40,0.2],[1,6,96,38,Math.PI]],ball:{x:81.4,y:26.6,z:0},pause:900,
      after:(st)=>{ st.cam.w=40; st.cam.tw=40; st.cam.x=91; st.focus={x:91}; const sv=document.getElementById('sv30');
        const B=t=>{ const x=81.4+(105-81.4)*t, y=26.6+(35.7-26.6)*t-Math.sin(Math.PI*t)*4.2, z=2.25*t+3.2*t*(1-t)*1.2; return [x,y,z]; };
        const S=t=>[81.4+(105-81.4)*t,26.6+(35.7-26.6)*t,2.25*t+3.2*t*(1-t)*1.2];
        const curve=[], straight=[]; for(let t=0;t<=1.0001;t+=0.025){ curve.push(B(t)); straight.push(S(t)); }
        const q=st.proj(105,35.7,2.25);
        sv.innerHTML=`<path d="${pathOf(st,straight)}" fill="none" stroke="#ff9a9a" stroke-width="2.5" stroke-dasharray="6 9" opacity=".8"/><path d="${pathOf(st,curve)}" fill="none" stroke="#ffd36b" stroke-width="4" stroke-linecap="round" filter="drop-shadow(0 0 6px rgba(255,211,107,.8))"/>
          <circle cx="${q[0]}" cy="${q[1]}" r="18" fill="none" stroke="#fff" stroke-width="2.5" opacity=".8"/>
          ${(()=>{ const w=st.proj(89.6,30.2,2.6); return `<text x="${w[0]-40}" y="${w[1]-14}" fill="#fff" font-family="Inter" font-weight="900" font-size="14" letter-spacing="2">THE WALL</text>`; })()}
          ${(()=>{ const m=st.proj(...B(0.5)); return `<text x="${m[0]-30}" y="${m[1]-16}" fill="#ffd36b" font-family="Inter" font-weight="900" font-size="15" letter-spacing="2">CURL</text>`; })()}`; } }); });
  await page.waitForTimeout(700); await shot('30-bending-the-ball.png'); }

  /* ---------- 31. OFFICIALS & RESTARTS ---------- */
  if(want(31)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated); const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st31" style="position:absolute;inset:0"></div><svg id="sv31" style="position:absolute;inset:0;width:1600px;height:900px;pointer-events:none"></svg>
      <div style="position:absolute;left:0;top:0;right:0;height:200px;background:linear-gradient(180deg,rgba(5,8,12,.95),rgba(5,8,12,.6) 70%,rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:44px;top:30px"><div class="K">Match realism · officials</div><div class="H gold" style="font-size:66px">Officials &amp; Restarts</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Assistant referees run the line, flag offsides and point for throw-ins. Every restart gets its own set-up.</div></div>
      <div class="glass" style="position:absolute;right:40px;top:30px;width:340px;padding:12px 16px;display:flex;align-items:center;gap:12px">${logo(me,36)}<b class="H" style="font-size:30px;font-family:'JetBrains Mono',monospace">0 – 0</b>${logo(opp,36)}<span class="chip" style="background:#e63946;border-color:#e63946">● 34'</span></div>
      <div class="glass" style="position:absolute;left:44px;bottom:72px;width:560px;padding:16px">
        <div class="lab">New restarts</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">${[['🚩','Offside flag','Assistant raises it, ref whistles, free kick'],['🙌','Throw-ins','Both feet down, ball over the head'],['🥅','Goal kicks','Keeper places it, team spreads out'],['📐','Corner set-up','Taker jogs to the flag, box fills']].map(([i,t,s])=>`<div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06)"><b>${i} ${t}</b><div style="font-size:12.5px;color:#93a3b6;margin-top:3px">${s}</div></div>`).join('')}</div></div>
      <div class="glass" style="position:absolute;right:40px;bottom:72px;width:420px;padding:16px">
        <div class="lab">In the log and the stats</div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-top:10px;font-size:13.5px;color:#cfd8e2"><div><b style="color:#fff;font-family:'JetBrains Mono',monospace">34'</b> 🚩 ${esc(opp.town)} striker caught offside</div><div><b style="color:#fff;font-family:'JetBrains Mono',monospace">35'</b> 🙌 Throw-in to ${esc(me.town)}</div><div style="margin-top:4px">New stat lines: <b style="color:#fff">offsides</b> for forwards, <b style="color:#fff">offside traps sprung</b> for defenses</div></div></div>
      <div class="tag"><b>CONCEPT 31</b><span>Officials &amp; Restarts · assistant referees, offside calls, throw-ins and goal kicks</span></div>`;
    document.body.appendChild(d);
    d._st=bareStage(d.querySelector('#st31'),{id:31,zoom:0.5,camX:70,ref:[71.5,66.6],opp:C.rivals.heated,place:[[1,9,74.2,40,0,{}],[1,10,66,30,0,{}],[0,2,72.6,38,Math.PI],[0,3,72.6,30,Math.PI],[0,4,72.2,46,Math.PI],[0,5,71.8,22,Math.PI],[0,0,103,34,Math.PI],[1,7,60,36,0.1]],ball:{x:66.8,y:30.4,z:0},pause:900,
      after:(st)=>{ st.cam.w=46; st.cam.tw=46; st.cam.x=74; st.focus={x:74}; const sv=document.getElementById('sv31');
        const a=st.proj(72.6,0.6,0), b=st.proj(72.6,67.4,0); const h=st.proj(71.5,66.6,2.15); const fl=st.proj(71.5,66.6,2.75);
        const s=st.proj(74.2,40,2.3);
        sv.innerHTML=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ffd36b" stroke-width="3" stroke-dasharray="10 8"/>
          <rect x="${(a[0]+b[0])/2-58}" y="${(a[1]+b[1])/2-120}" width="116" height="28" rx="6" fill="#ffd36b"/><text x="${(a[0]+b[0])/2}" y="${(a[1]+b[1])/2-100}" text-anchor="middle" fill="#1d1300" font-family="Inter" font-weight="900" font-size="15" letter-spacing="2">OFFSIDE</text>
          <line x1="${h[0]}" y1="${h[1]}" x2="${fl[0]}" y2="${fl[1]-30}" stroke="#ddd" stroke-width="3"/><path d="M${fl[0]} ${fl[1]-30} l26 6 l-26 12z" fill="#ffd36b" stroke="#c9302c" stroke-width="2"/>
          <text x="${h[0]+30}" y="${h[1]-36}" fill="#fff" font-family="Inter" font-weight="900" font-size="13" letter-spacing="2">ASSISTANT REFEREE</text>
          <circle cx="${s[0]}" cy="${s[1]-6}" r="34" fill="none" stroke="#ff5d5d" stroke-width="3"/>`; } }); });
  await page.waitForTimeout(700); await shot('31-officials-restarts.png'); }

  /* ---------- 32. THE LIVING PITCH ---------- */
  if(want(32)){
  await page.evaluate(()=>{ const C=App.C; const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 40% 30%,#14301f,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:34px"><div class="K">Broadcast visuals · every stadium</div><div class="H gold" style="font-size:68px">The Living Pitch</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">The grass remembers the season. Wear builds where the games were actually played; rain leaves mud, snow keeps footprints.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:186px;width:960px;height:520px;overflow:hidden;padding:0"><div id="st32" style="position:absolute;inset:0"></div><svg id="sv32" style="position:absolute;inset:0;width:960px;height:520px;pointer-events:none"></svg>
        <div style="position:absolute;left:16px;bottom:14px" class="chip">Week 14 · wear built from this season's real heat maps</div></div>
      <div style="position:absolute;left:1030px;top:186px;width:526px;display:flex;flex-direction:column;gap:14px">
        <div class="glass" style="padding:0;height:250px;overflow:hidden;position:relative"><div id="st32b" style="position:absolute;inset:0"></div><svg id="sv32b" style="position:absolute;inset:0;width:526px;height:250px;pointer-events:none"></svg><div style="position:absolute;left:14px;bottom:12px" class="chip">❄️ Snow: footprints and the ball's track</div></div>
        <div class="glass" style="padding:14px 16px"><div class="lab">Groundskeeper's pattern · picked per stadium</div><div style="display:flex;gap:10px;margin-top:10px">
          ${[['Stripes','repeating-linear-gradient(90deg,#2f8f4e 0 18px,#37a35a 18px 36px)'],['Checkerboard','repeating-conic-gradient(#2f8f4e 0 25%,#37a35a 0 50%) 0 0/36px 36px'],['Diamonds','repeating-linear-gradient(45deg,#2f8f4e 0 14px,#37a35a 14px 28px),repeating-linear-gradient(-45deg,rgba(0,0,0,.08) 0 14px,transparent 14px 28px)'],['Circles','repeating-radial-gradient(circle at 50% 50%,#2f8f4e 0 10px,#37a35a 10px 20px)']].map(([n,bg],i)=>`<div style="flex:1;text-align:center"><div style="height:62px;border-radius:10px;background:${bg};${i===0?'outline:3px solid #ffd36b;outline-offset:2px':''}"></div><div style="font-size:12.5px;font-weight:700;margin-top:6px;color:#cfd8e2">${n}</div></div>`).join('')}</div></div>
        <div class="glass" style="padding:14px 16px;font-size:13.5px;color:#cfd8e2;display:flex;flex-direction:column;gap:6px"><div>🟫 Goalmouths and your favorite wing go bald by October</div><div>💧 Rain: mud patches, splashes on slides, darker kits</div><div>🌱 Fresh-cut grass each preseason; State final turf looks perfect</div></div></div>
      <div class="tag"><b>CONCEPT 32</b><span>The Living Pitch · season wear from real play, mud, snow tracks and mowing patterns</span></div>`;
    document.body.appendChild(d);
    d._st=bareStage(d.querySelector('#st32'),{id:32,zoom:0.9,camX:62,weather:{k:'clouds',night:false},place:[[0,9,70,20,0.2],[1,3,74,24,Math.PI]],ball:{x:71,y:21,z:0},pause:900,
      after:(st)=>{ const sv=document.getElementById('sv32'); const wear=[[100,34,7,9,.55],[60,14,14,5,.45],[78,10,12,4,.5],[52.5,34,6,5,.35],[88,22,8,6,.35],[24,34,6,8,.25]];
        const blob=([x,y,rx,ry,a],i)=>{ const c=st.proj(x,y), e=st.proj(x+rx,y), f=st.proj(x,y+ry); return `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${Math.abs(e[0]-c[0])}" ry="${Math.abs(f[1]-c[1])}" fill="url(#mud)" opacity="${a}"/>`; };
        const div=[[66,18],[67.5,19.4],[83,30],[84,31],[97,37],[58,40]].map(([x,y])=>{ const p=st.proj(x,y), q=st.proj(x+1.6,y+0.5); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#4a3518" stroke-width="3" stroke-linecap="round" opacity=".7"/>`; }).join('');
        sv.innerHTML=`<defs><radialGradient id="mud"><stop offset="0" stop-color="#6b4f2a" stop-opacity=".95"/><stop offset=".6" stop-color="#7c6a3c" stop-opacity=".55"/><stop offset="1" stop-color="#7c6a3c" stop-opacity="0"/></radialGradient></defs>${wear.map(blob).join('')}${div}`; } });
    d._st2=bareStage(d.querySelector('#st32b'),{id:'32b',zoom:0.5,camX:42,weather:{k:'snow',night:false},place:[[0,9,44,30,0.4],[1,4,48,34,Math.PI]],ball:{x:45,y:31,z:0},pause:900,
      after:(st)=>{ const sv=document.getElementById('sv32b'); const P=[...st.players.values()].find(q=>!q.off&&q.side===0); let s=''; for(let i=1;i<=16;i++){ const x=P.x-i*0.75, y=P.y-i*0.32+(i%2?0.28:-0.28); const p=st.proj(x,y); s+=`<ellipse cx="${p[0]}" cy="${p[1]}" rx="${(p[2]*0.16).toFixed(1)}" ry="${(p[2]*0.08).toFixed(1)}" fill="#7d8aa0" opacity=".85"/>`; }
        const bt=[]; for(let t=0;t<=1.0001;t+=0.05) bt.push([P.x+1-12*t,P.y+1.2-5*t+Math.sin(t*4)*0.4,0]); s+=`<path d="${pathOf(st,bt)}" stroke="#8e9bb0" stroke-width="${(st.proj(P.x,P.y)[2]*0.2).toFixed(1)}" fill="none" stroke-linecap="round" opacity=".75"/>`;
        sv.innerHTML=s; } }); });
  await page.waitForTimeout(800); await shot('32-living-pitch.png'); }

  /* ---------- 33. BODY LANGUAGE & THE HANDSHAKE LINE ---------- */
  if(want(33)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated); const d=document.createElement('div'); d.id='cx';
    const P=[]; for(let i=0;i<8;i++){ P.push([0,i+1,44+i*2.5,31.2,0.05,{}]); P.push([1,i+1,45.3+i*2.5,36.4,Math.PI-0.05,{}]); }
    d.innerHTML=`<div id="st33" style="position:absolute;inset:0"></div>
      <div style="position:absolute;left:0;top:0;right:0;height:210px;background:linear-gradient(180deg,rgba(5,8,12,.95),rgba(5,8,12,.6) 70%,rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:44px;top:30px"><div class="K">Animation · emotion</div><div class="H gold" style="font-size:66px">Body Language</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Players react to the game like teenagers who care: the full-time handshake line, a hand up after a foul, a teammate consoling the kid who missed in the shootout.</div></div>
      <div class="glass" style="position:absolute;right:40px;top:30px;width:300px;padding:12px 16px;display:flex;align-items:center;gap:12px">${logo(me,36)}<b class="H" style="font-size:30px;font-family:'JetBrains Mono',monospace">2 – 1</b>${logo(opp,36)}<span class="chip">FT</span></div>
      <div style="position:absolute;left:44px;right:44px;bottom:70px;display:grid;grid-template-columns:repeat(5,1fr);gap:12px">${[['🤝','Handshake line','Both teams walk the halfway line after every game; the losers do it with hands on their heads'],['🫴','Hand up','The fouler offers a hand to the player he brought down'],['🫂','Consoling','Teammates go straight to the kid who missed the last penalty'],['😤','Keeper fury','Slaps the turf after conceding, then organises the wall'],['🗣️','Pleading','Hands out to the ref after a booking; captain steps in']].map(([i,t,s])=>`<div class="glass" style="padding:12px 14px"><div style="font-size:24px">${i}</div><b>${t}</b><div style="font-size:12.5px;color:#93a3b6;margin-top:4px">${s}</div></div>`).join('')}</div>
      <div class="tag"><b>CONCEPT 33</b><span>Body Language · handshake line, hand-ups, consoling, keeper fury and pleading with the ref</span></div>`;
    document.body.appendChild(d);
    d._st=bareStage(d.querySelector('#st33'),{id:33,zoom:0.42,camX:53,ref:[42,30],place:P,ball:{x:40,y:30,z:0},pause:900,
      after:(st)=>{ st.cam.w=30; st.cam.tw=30; st.cam.x=53; st.focus={x:53}; for(const q of st.players.values()) if(!q.off&&q.side===1&&!q.gk) q.sad=true; st.paused=false; setTimeout(()=>{ st.paused=true; },350); } }); });
  await page.waitForTimeout(700); await shot('33-body-language.png'); }

  /* ---------- 34. NEWSROOM MEMORY (bug fix) ---------- */
  if(want(34)){
  /* measured once with MEASURE=1 (8 simulated seasons, seed concepts6); set MEASURE=1 to re-run it */
  const M=process.env.MEASURE?await page.evaluate(()=>{ const C=App.C; const per={}; const _a=addNews; addNews=function(C2,type,text){ per[C2.year]=(per[C2.year]||0)+1; return _a.apply(this,arguments); };
    let yrs=0; const y0=C.year; for(const n of C.news) per[n.yr]=(per[n.yr]||0)+1; for(let step=0;step<12000&&yrs<8;step++){ if(C.phase==='offseason'){ rollover(C); yrs++; continue; } const fx=userFixture(C); if(fx){ const M=startMatch(C,fx.id,{}); runToEnd(C,M); finishMatch(C,M); } simRound(C); advance(C); }
    addNews=_a; const kept={}; C.news.forEach(n=>kept[n.yr]=(kept[n.yr]||0)+1); return {per,kept,y0,now:C.year,total:C.news.length}; }):{per:{2026:57,2027:48,2028:61,2029:72,2030:73,2031:75,2032:87,2033:97},kept:{2030:58,2031:75,2032:87,2033:97},y0:2026,now:2034,total:320};
  console.log('news measure',JSON.stringify(M));
  await page.evaluate(M=>{ const C=App.C; const yrs=Object.keys(M.per).map(Number).filter(y=>y<M.now).sort();
    const d=document.createElement('div'); d.id='cx';
    const bars=yrs.map(y=>{ const w=M.per[y]||0, k=M.kept[y]||0; return `<div style="display:flex;align-items:center;gap:12px;margin-top:10px"><b style="width:52px;font-family:'JetBrains Mono',monospace">${y}</b><div style="flex:1;height:22px;border-radius:6px;background:rgba(255,93,93,.25);position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.round(k/Math.max(1,w)*100)}%;background:#3ccf91;border-radius:6px"></i></div><span style="width:150px;font-size:13px;color:#cfd8e2">${k} of ${w} kept</span></div>`; }).join('');
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,#2a1f14,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:34px"><div class="K" style="color:#ff9a9a">Bug fix · save data</div><div class="H gold" style="font-size:68px">Newsroom Memory</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px;max-width:1100px">The Newsroom keeps only its newest 320 stories. A season writes 50–100 stories (more as your program gets famous), so a long career starts deleting its oldest seasons for good, including the notes that fill old Courier editions.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:206px;width:720px;padding:20px">
        <div class="lab" style="color:#ff9a9a">Measured: ${yrs.length} simulated seasons, stories written vs. still there</div>
        ${bars}
        <div style="display:flex;gap:16px;margin-top:14px;font-size:12.5px;color:#93a3b6"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#3ccf91"></i> still in the Newsroom</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(255,93,93,.5)"></i> written, then deleted</span></div>
        <div style="margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(255,93,93,.1);border:1px solid rgba(255,93,93,.35);font-size:13.5px;color:#ffd0d0">After ${yrs.length} seasons the Newsroom holds exactly ${M.total} stories: ${yrs.filter(y=>!M.kept[y]).join(', ')} are gone entirely and ${yrs.find(y=>M.kept[y]&&M.kept[y]<M.per[y])} is half gone. Every new story now erases an old one.</div></div>
      <div class="glass" style="position:absolute;right:44px;top:206px;width:740px;padding:20px">
        <div class="lab" style="color:#7ff0bd">The fix</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${[...yrs,M.now].map((y,i)=>`<span class="chip" style="${i===yrs.length?'background:#ffd36b;color:#1d1300;border-color:#ffd36b':''}">${y}</span>`).join('')}<span class="chip">All seasons</span></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;font-size:14px;color:#cfd8e2">
          <div>📚 <b style="color:#fff">Season archive:</b> when a season ends, its stories are packed into the save, the same way match logs already are</div>
          <div>🗂️ <b style="color:#fff">Newsroom season tabs:</b> read any year, filter by type</div>
          <div>📰 <b style="color:#fff">Old Courier editions keep their notebook</b> (it's built from those stories)</div>
          <div>🔁 <b style="color:#fff">Recovery:</b> stories that are already gone can be partly rebuilt from match logs (results, hat tricks, awards)</div></div>
        <div style="margin-top:16px;padding:12px 14px;border-radius:12px;background:rgba(60,207,145,.1);border:1px solid rgba(60,207,145,.35);font-size:13.5px;color:#c6f6e0">The current season stays fast in memory; older ones load the first time you open them.</div></div>
      <div class="tag"><b>CONCEPT 34</b><span>Newsroom Memory · stop deleting old seasons' stories; archive them by season</span></div>`;
    document.body.appendChild(d); },M);
  await shot('34-newsroom-memory.png'); }
  console.log(errs.join('\n')||'ok'); await browser.close();
})();
