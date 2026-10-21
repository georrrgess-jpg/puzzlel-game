// Concept art 25–29, rendered with the game's own assets (mascots, portraits, kits, the 3-D figure renderer, the broadcast stage).
const { chromium } = require('./_pw');
const OUT=require('path').resolve(__dirname,'..','concepts')+'/';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Concept'); await page.fill('#nc-seed','concepts5'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
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

  /* ---------- 25. HALFTIME CROSSBAR CHALLENGE ---------- */
  if(want(25)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid);
    const fan={id:'fanDerek',grade:11,sid:C.userSid,look:Object.assign(defaultLook('fanDerek',11),{facial:'none',mouth:'grin'})};
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st25" style="position:absolute;inset:0"></div><svg id="arc25" style="position:absolute;inset:0;width:1600px;height:900px;pointer-events:none"></svg>
      <div style="position:absolute;left:0;top:0;bottom:0;width:640px;background:linear-gradient(90deg,rgba(5,8,12,.94),rgba(5,8,12,.72) 70%,rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Halftime show · home games</div><div class="H gold" style="font-size:70px">Crossbar<br>Challenge</div><div style="font-weight:700;color:#cfd8e2;margin-top:10px;max-width:470px">A fan from the stands gets one shot from midfield. Hit the bar and the place goes up for the second half.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:292px;width:470px;padding:18px">
        <div class="lab">Tonight's contestant · from the student section</div>
        <div style="display:flex;gap:16px;align-items:center;margin-top:12px"><div style="width:92px;height:106px;flex:none">${portraitSVG(fan,92,{c1:me.c1,c2:me.c2})}</div>
          <div><div class="H" style="font-size:34px">Derek Moss</div><div style="color:#cfd8e2;font-weight:700;margin-top:4px">Junior · Section 104 · Row F</div><div style="margin-top:8px;font-family:Georgia,serif;font-style:italic;font-size:17px;color:#fff3cf">"Says he's never missed."</div></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
          <div style="padding:10px 12px;border-radius:12px;background:rgba(60,207,145,.12);border:1px solid rgba(60,207,145,.4)"><b style="color:#7ff0bd">CLANG!</b><div style="font-size:12.5px;color:#cfd8e2;margin-top:3px">Crowd erupts · home atmosphere boost for the 2nd half</div></div>
          <div style="padding:10px 12px;border-radius:12px;background:rgba(255,93,93,.1);border:1px solid rgba(255,93,93,.35)"><b style="color:#ffb3b3">Parking lot</b><div style="font-size:12.5px;color:#cfd8e2;margin-top:3px">Groans · the camera follows his walk of shame</div></div></div></div>
      <div class="glass" style="position:absolute;left:44px;top:636px;width:470px;padding:16px 18px">
        <div style="display:flex;justify-content:space-between"><span class="lab">Power</span><span class="lab" style="color:#ffd36b">Sweet spot</span></div>
        <div style="position:relative;height:22px;border-radius:12px;margin-top:8px;background:linear-gradient(90deg,#3ccf91,#ffd36b 55%,#ff5d5d)"><i style="position:absolute;left:58%;width:11%;top:-4px;bottom:-4px;border:2px solid #fff;border-radius:8px;box-shadow:0 0 18px rgba(255,255,255,.6)"></i><i style="position:absolute;left:62.5%;top:-9px;width:4px;height:40px;background:#fff;border-radius:3px;box-shadow:0 0 10px #fff"></i></div>
        <div style="display:flex;justify-content:space-between;margin-top:14px"><span class="lab">Aim</span><span style="font-size:12px;color:#93a3b6">Wind: 6 mph, left to right</span></div>
        <div style="position:relative;height:12px;border-radius:8px;margin-top:8px;background:rgba(255,255,255,.12)"><i style="position:absolute;left:46%;width:8%;top:0;bottom:0;background:#ffd36b;border-radius:8px"></i><i style="position:absolute;left:41%;top:-6px;width:4px;height:24px;background:#fff;border-radius:3px"></i></div>
        <div style="display:flex;gap:8px;margin-top:14px;align-items:center"><span class="btnc">⎵ Strike</span><span style="font-size:12.5px;color:#93a3b6">Tap once for power, again for aim</span></div></div>
      <div class="glass" style="position:absolute;right:40px;top:36px;width:330px;padding:16px 18px">
        <div class="lab">Crossbar hits · this season</div><div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span class="H gold" style="font-size:54px">2</span><span style="color:#cfd8e2;font-weight:700">of 7 attempts</span></div>
        <div style="display:flex;gap:6px;margin-top:8px">${[1,0,0,1,0,0,0].map(h=>`<i style="flex:1;height:10px;border-radius:5px;background:${h?'#ffd36b':'rgba(255,255,255,.14)'}"></i>`).join('')}<i style="flex:1;height:10px;border-radius:5px;border:2px dashed #fff"></i></div>
        <div style="margin-top:14px;padding:10px 12px;border-radius:12px;background:rgba(255,211,107,.1);border:1px solid rgba(255,211,107,.35);font-size:13px;color:#ffe9b3">🏆 <b>Legend unlock:</b> hit one at halftime of a State final and it goes in the Hall of Fame as <i>The Shot</i>.</div></div>
      <div style="position:absolute;right:40px;bottom:70px" class="chip">📣 "From the halfway line... here... we... go!"</div>
      <div class="tag"><b>CONCEPT 25</b><span>Halftime Crossbar Challenge · a timed mini-game played on the real broadcast stage</span></div>`;
    document.body.appendChild(d);
    const Z=t=>4*3.4*t*(1-t)+2.44*t, PX=t=>57.6+(105-57.6)*t, PY=t=>34+0.8*t;
    const st=bareStage(d.querySelector('#st25'),{id:25,zoom:0.62,camX:84,place:[[0,9,57,34,0.05,{kickT:0}]],ball:{x:PX(0.72),y:PY(0.72),z:Z(0.72)},pause:900,
      after:(st)=>{ st.cam.w=60; st.cam.tw=60; st.cam.x=84; st.focus={x:84}; st.draw&&st.draw(); const pts=[]; for(let t=0;t<=1.0001;t+=0.025){ const q=st.proj(PX(t),PY(t),Z(t)); pts.push([q[0].toFixed(1),q[1].toFixed(1)]); }
        const svg=document.getElementById('arc25'); svg.innerHTML=`<path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="#ffd36b" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" opacity=".95"/>`;
        const b=st.proj(105,34.8,2.44); svg.innerHTML+=`<circle cx="${b[0]}" cy="${b[1]}" r="26" fill="none" stroke="#fff" stroke-width="2.5" opacity=".7"/><text x="${b[0]-150}" y="${b[1]-34}" fill="#fff" font-family="Inter" font-weight="900" font-size="15" letter-spacing="3">THE CROSSBAR</text>`; } });
    d._st=st; });
  await page.waitForTimeout(800); await shot('25-crossbar-challenge.png'); }

  /* ---------- 26. REFEREE PERSONALITIES ---------- */
  if(want(26)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated);
    const refP=(id,o)=>({id,grade:12,look:Object.assign(defaultLook(id,12),o)}); const KIT={c1:'#16181d',c2:'#f5d10b'};
    const R=[['Carl Dunleavy','Card-Happy Carl','#ff5d5d',[92,30,50],['5.1 cards a game, most in the state','Books coaches for dissent fast'],refP('refCarl',{facial:'mustache',hair:'buzz'})],
             ['Linda Ortiz','Let-It-Play Linda','#3ccf91',[28,94,50],['Plays advantage almost every time','Physical games: tacklers love her'],refP('refLinda',{facial:'none'})],
             ['Gus Pritchard','The Homer','#ffd36b',[55,52,86],['Home team wins 64% of his 50/50s','Crowd noise sways his close calls'],refP('refGus',{facial:'goatee'})]];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st26" style="position:absolute;inset:0"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,12,.95),rgba(5,8,12,.82) 58%,rgba(5,8,12,.2) 78%,rgba(5,8,12,.85))"></div>
      <div style="position:absolute;left:44px;top:34px"><div class="K">Matchday · the third team on the field</div><div class="H gold" style="font-size:68px">Referees With Personality</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Every ref in the state has a style. Check who's working your game, then decide how hard to lean on them.</div></div>
      <div style="position:absolute;left:44px;right:44px;top:200px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">${R.map(([n,nick,c,m,tr,p])=>`<div class="glass" style="padding:16px 18px;border-top:5px solid ${c}">
        <div style="display:flex;gap:14px;align-items:center"><div style="width:78px;height:90px;flex:none">${portraitSVG(p,78,KIT)}</div><div><div class="H" style="font-size:24px">${n}</div><span class="chip" style="margin-top:6px;border-color:${c};color:${c}">${nick}</span></div></div>
        ${[['Strictness',m[0]],['Lets play on',m[1]],['Home lean',m[2]]].map(([l,v])=>`<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span class="lab" style="width:104px">${l}</span><div class="bar" style="flex:1"><i style="width:${v}%;background:${c}"></i></div></div>`).join('')}
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:5px">${tr.map(x=>`<div style="font-size:13.5px;color:#cfd8e2">▸ ${x}</div>`).join('')}</div></div>`).join('')}</div>
      <div class="glass" style="position:absolute;left:44px;bottom:74px;width:640px;padding:16px 18px;border-color:rgba(255,93,93,.4)">
        <div style="display:flex;align-items:center;gap:14px"><span class="btnc" style="background:#ff5d5d;color:#fff;font-size:17px">📢 Work the Ref</span><div style="font-size:13.5px;color:#cfd8e2">Shout after a bad call. The next 50/50 might go your way, or you might be watching from behind the fence.</div></div>
        <div style="display:flex;gap:6px;margin-top:14px">${[['Calm','#3ccf91',1],['Warned','#ffd36b',1],['Coach booked 🟨','#ff9a3c',0],['Sent to the stands 🟥','#ff5d5d',0]].map(([t,c,on])=>`<div style="flex:1;text-align:center;padding:8px 4px;border-radius:10px;font-size:12.5px;font-weight:800;background:${on?c:'rgba(255,255,255,.06)'};color:${on?'#10130a':'#93a3b6'}">${t}</div>`).join('')}</div>
        <div style="margin-top:12px;font-size:13px;color:#7ff0bd">✔ 61' · Free kick given your way after the shout · Carl has warned you once</div></div>
      <div class="glass" style="position:absolute;right:44px;bottom:74px;width:400px;padding:14px 18px"><div class="lab">Refs remember</div><div style="display:flex;align-items:center;gap:10px;margin-top:8px">${logo(me,30)}<div style="font-size:13.5px;color:#cfd8e2">You've been booked by <b style="color:#fff">Card-Happy Carl</b> twice in two seasons. He starts this game with you on a shorter leash.</div></div></div>
      <div class="tag"><b>CONCEPT 26</b><span>Referee personalities · pregame ref cards, live "Work the Ref" and long memories</span></div>`;
    document.body.appendChild(d);
    d._st=bareStage(d.querySelector('#st26'),{id:26,zoom:0.5,camX:62,ref:[64,46],place:[[0,9,60,40,0.4,{trip:0}],[1,3,62,41,Math.PI-0.3],[0,7,54,36,0.2],[1,5,66,34,Math.PI]],ball:{x:61.5,y:43,z:0},pause:900}); });
  await page.waitForTimeout(800); await shot('26-referee-personalities.png'); }

  /* ---------- 27. THE ALUMNI GAME ---------- */
  if(want(27)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a));
    const age=(p,o)=>Object.assign({},p,{look:Object.assign({},lookOf(p),o)});
    const AL=[[sq[0],'2027','Captain · State Champion','D1 · Penn State',+4,'#3ccf91',{facial:'stubble'}],[sq[1],'2026','All-State striker','Plays Sunday league',-2,'#ffd36b',{facial:'goatee'}],
              [sq[2],'2028','Golden Boot','Accountant',-9,'#ff5d5d',{facial:'mustache'}],[sq[3],'2025','Keeper of the Year','Coaches U-12s',-4,'#ffd36b',{facial:'chinstrap'}],[sq[5],'2029','Record 22 assists','D3 · still starting',+1,'#3ccf91',{facial:'none'}]];
    const cur=sq.slice(6,11);
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 40%,${me.c1}55,#05080c 62%),#05080c"></div>
      ${[0,1,2].map(i=>`<i style="position:absolute;top:-80px;left:${180+i*420}px;width:240px;height:1100px;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 80%);transform:rotate(${-14+i*12}deg);filter:blur(8px)"></i>`).join('')}
      <div style="position:absolute;left:44px;top:34px"><div class="K">Preseason exhibition · every August</div><div class="H gold" style="font-size:72px">The Alumni Game</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Your graduates come home to take on this year's varsity. Real players from your own career, a few years older.</div></div>
      <div style="position:absolute;left:44px;top:206px;display:flex;gap:16px">${AL.map(([p,cls,hon,now,dr,c,o],i)=>`<div class="glass" style="width:206px;padding:14px;text-align:center;${i===0?'border-color:#ffd36b;box-shadow:0 0 40px rgba(255,211,107,.25)':''}">
        <div style="font-family:'JetBrains Mono',monospace;font-weight:900;font-size:13px;color:#93a3b6">CLASS OF ${cls}</div>
        <div style="width:120px;height:138px;margin:8px auto 0">${portraitSVG(age(p,o),120)}</div>
        <div class="H" style="font-size:21px;margin-top:6px">${esc(p.ln)}</div><div style="font-size:12.5px;color:#ffe3a3;font-weight:700;margin-top:3px">${hon}</div>
        <div style="margin-top:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.06)"><div class="lab" style="font-size:10px">Now</div><div style="font-weight:800;font-size:13.5px;margin-top:2px">${now}</div>
        <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-weight:900;color:${c}">${Math.round(ovr(p))} ${dr>0?'▲':'▼'} ${dr>0?'+':''}${dr}</div></div></div>`).join('')}</div>
      <div class="glass" style="position:absolute;right:44px;top:206px;width:380px;padding:16px">
        <div class="lab">Current varsity</div><div style="display:flex;align-items:center;gap:10px;margin-top:8px">${logo(me,46)}<div><b style="font-size:18px">${esc(me.town)} ${esc(me.mascot)}</b><div style="font-size:12.5px;color:#93a3b6">Starting XI rating ${Math.round(xiRating(C,C.userSid,'V'))}</div></div></div>
        <div style="display:flex;gap:6px;margin-top:12px">${cur.map(p=>`<div style="width:58px;height:66px">${portraitSVG(p,58)}</div>`).join('')}</div>
        <div style="margin-top:14px;font-size:13.5px;color:#cfd8e2">Win: <b style="color:#7ff0bd">confidence boost</b> going into the season.<br>Lose: <b style="color:#ffb3b3">bragging rights</b> for the legends, and a headline.</div></div>
      <div class="glass" style="position:absolute;right:44px;top:470px;width:380px;padding:16px;border-left:4px solid #ffd36b">
        <div class="lab">On the PA</div><div style="margin-top:8px;font-size:17px;font-weight:800;line-height:1.35">"Returning home... your 2027 State Champion captain... number ${sq[0].num}...<br><span class="gold H" style="font-size:30px">${esc(sq[0].fn)} ${esc(sq[0].ln)}!</span>"</div></div>
      <div style="position:absolute;left:44px;top:610px;width:1060px;padding:18px 22px;border-radius:6px;background:#f3ecdc;color:#1b1a17;box-shadow:0 20px 50px rgba(0,0,0,.5);transform:rotate(-0.6deg)">
        <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:.3em;font-weight:700;color:#6b5f4a">THE COURIER · SPORTS · AUGUST</div>
        <div style="font-family:Georgia,serif;font-weight:900;font-size:34px;line-height:1.05;margin-top:6px">Legends still got it: Alumni stun varsity 3–2</div>
        <div style="font-family:Georgia,serif;font-size:15px;margin-top:6px;color:#3a352c">${esc(sq[2].ln)}, now an accountant, scored twice in the second half, then asked for an ice pack and a ride home.</div></div>
      <div class="tag"><b>CONCEPT 27</b><span>The Alumni Game · an annual exhibition against your own graduates, aged up with real careers</span></div>`;
    document.body.appendChild(d); });
  await shot('27-alumni-game.png'); }

  /* ---------- 28. THE TIME CAPSULE ---------- */
  if(want(28)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').concat(squad(C,C.userSid,'JV')).sort((a,b)=>ovr(b)-ovr(a));
    const N=[[sq[0],'By senior year I\'ll be captain.','CAME TRUE','#2f9e5b','Captain 2029–30 · 41 career goals',-2.5],
             [sq[7],'I will finally learn the offside rule.','NOT QUITE','#c0392b','Flagged offside 23 times as a senior',2],
             [sq[3],'Score in a State final.','CLOSE','#d08a12','Hit the post in the 2029 State final',-1.5],
             [sq[12]||sq[9],'Just start one varsity game.','BEYOND','#b8860b','Started 58 · All-State 2030',1.8],
             [sq[5],'Beat Riverside. Just once.','CAME TRUE','#2f9e5b','3–2 in the 2028 Rivalry Night',-1]];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,#3b2a1c,#140d08 70%)"></div>
      <div style="position:absolute;inset:0;opacity:.18;background:repeating-linear-gradient(90deg,#6b4a2c 0 3px,transparent 3px 46px)"></div>
      <div style="position:absolute;left:44px;top:34px"><div class="K">Sealed fall 2026 · opened on graduation day 2030</div><div class="H gold" style="font-size:72px">The Time Capsule</div><div style="font-weight:700;color:#e8dcc6;margin-top:6px">Every freshman writes one promise for senior year. Four seasons later, the game checks it against what really happened.</div></div>
      <svg style="position:absolute;left:44px;top:230px" width="300" height="420" viewBox="0 0 300 420">
        <defs><linearGradient id="tc" x1="0" x2="1"><stop offset="0" stop-color="#6d7783"/><stop offset=".45" stop-color="#dfe6ee"/><stop offset="1" stop-color="#525b66"/></linearGradient></defs>
        <ellipse cx="150" cy="400" rx="120" ry="14" fill="rgba(0,0,0,.45)"/>
        <rect x="50" y="130" width="200" height="270" rx="22" fill="url(#tc)"/><rect x="50" y="200" width="200" height="16" fill="rgba(0,0,0,.18)"/><rect x="50" y="330" width="200" height="16" fill="rgba(0,0,0,.18)"/>
        <g transform="rotate(-24 60 120)"><rect x="40" y="96" width="220" height="40" rx="14" fill="url(#tc)"/></g>
        <rect x="88" y="240" width="124" height="70" rx="8" fill="${me.c1}"/><text x="150" y="268" text-anchor="middle" fill="#fff" font-family="Inter" font-weight="900" font-size="15">CLASS OF</text><text x="150" y="296" text-anchor="middle" fill="#fff" font-family="Inter" font-weight="900" font-size="24">2030</text>
        ${[0,1,2,3].map(i=>`<rect x="${92+i*24}" y="${60-i*16}" width="44" height="64" rx="3" fill="#f6efdf" transform="rotate(${-20+i*12} ${114+i*24} ${92-i*16})" stroke="#c9bb9c"/>`).join('')}
        <text x="150" y="20" text-anchor="middle" fill="#ffd36b" font-family="Inter" font-weight="900" font-size="13" letter-spacing="3">✦ OPENED ✦</text></svg>
      <div style="position:absolute;left:380px;right:44px;top:204px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">${N.map(([p,t,st,c,ev,rot],i)=>`<div style="position:relative;padding:18px 18px 16px;background:#f6efdf;color:#2b241a;border-radius:4px;box-shadow:0 16px 34px rgba(0,0,0,.5);transform:rotate(${rot}deg);background-image:repeating-linear-gradient(180deg,transparent 0 27px,rgba(80,110,160,.22) 27px 28px)">
        <div style="display:flex;gap:10px;align-items:center"><div style="width:48px;height:56px;flex:none">${portraitSVG(p,48)}</div><div style="font-size:12.5px;font-weight:800;color:#6b5f4a">${esc(pname(p))}<br><span style="font-weight:600">Freshman, fall 2026</span></div></div>
        <div style="font-family:'Bitstream Charter',Georgia,serif;font-style:italic;font-size:22px;line-height:1.25;margin-top:12px;color:#1d3f8a">"${t}"</div>
        <div style="margin-top:12px;font-size:12.5px;font-weight:700;color:#4a4235">${ev}</div>
        <div style="position:absolute;right:14px;top:14px;padding:5px 10px;border:3px solid ${c};color:${c};font-weight:900;font-size:15px;letter-spacing:.12em;border-radius:6px;transform:rotate(${i%2?9:-8}deg);opacity:.9;${st==='BEYOND'?'background:rgba(255,211,107,.35);':''}">${st==='BEYOND'?'★ ':''}${st}</div></div>`).join('')}
        <div style="padding:18px;border-radius:14px;border:2px dashed rgba(255,231,180,.35);color:#e8dcc6;display:flex;flex-direction:column;justify-content:center;gap:8px">
          <div class="lab" style="color:#ffd36b">Class of 2030 · results</div><div style="font-size:15px">✅ 9 came true · 🟠 5 close · ❌ 4 not quite · ⭐ 1 beyond</div>
          <div style="font-size:13px;color:#bfae92">Next on the shelf: <b style="color:#fff">Class of 2031</b>, opens in 1 season 🔒</div></div></div>
      <div style="position:absolute;left:380px;right:44px;top:610px"><div class="lab" style="color:#ffd36b">On the Office shelf · still sealed</div>
        <div style="position:relative;margin-top:12px;height:150px"><div style="position:absolute;left:0;right:0;bottom:0;height:18px;border-radius:4px;background:linear-gradient(180deg,#8a5a34,#5b3a20);box-shadow:0 12px 24px rgba(0,0,0,.5)"></div>
        ${[['2031','opens next season'],['2032','opens in 2 seasons'],['2033','opens in 3 seasons'],['2034','sealed this fall']].map(([y,t],i)=>`<div style="position:absolute;left:${i*290}px;bottom:18px;display:flex;align-items:flex-end;gap:12px"><svg width="70" height="120" viewBox="0 0 70 120"><rect x="6" y="18" width="58" height="102" rx="10" fill="#8f99a5"/><rect x="2" y="6" width="66" height="18" rx="6" fill="#b9c2cc"/><rect x="14" y="56" width="42" height="26" rx="4" fill="${me.c1}"/><text x="35" y="74" text-anchor="middle" fill="#fff" font-family="Inter" font-weight="900" font-size="12">${y}</text></svg><div style="padding-bottom:10px"><b style="font-size:16px">Class of ${y} 🔒</b><div style="font-size:12.5px;color:#bfae92">${t} · 17 notes</div></div></div>`).join('')}</div></div>
      <div class="tag"><b>CONCEPT 28</b><span>The Time Capsule · freshman promises sealed for four years, judged on graduation day</span></div>`;
    document.body.appendChild(d); });
  await shot('28-time-capsule.png'); }

  /* ---------- 29. THE BUS RIDE ---------- */
  if(want(29)){
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)); const fresh=squad(C,C.userSid,'V').filter(p=>p.grade<=9)[0]||sq[14];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:linear-gradient(180deg,#0b1430 0%,#26275a 42%,#a4566a 62%,#1a1418 63%,#121014 100%)"></div>
      ${Array.from({length:60},(_,i)=>`<i style="position:absolute;left:${(i*97)%1600}px;top:${(i*53)%300}px;width:2px;height:2px;border-radius:2px;background:#fff;opacity:${0.25+(i%5)*0.12}"></i>`).join('')}
      <svg style="position:absolute;left:0;top:420px" width="1600" height="160" viewBox="0 0 1600 160"><path d="M0 160 L0 90 L120 60 L260 96 L420 40 L560 92 L700 66 L860 110 L1000 54 L1180 98 L1320 62 L1480 100 L1600 70 L1600 160Z" fill="#1d1a2a"/></svg>
      <div style="position:absolute;left:0;right:0;top:566px;height:334px;background:linear-gradient(180deg,#2a2730,#16141a)"></div>
      <div style="position:absolute;left:0;right:0;top:760px;height:8px;background:repeating-linear-gradient(90deg,#ffd36b 0 80px,transparent 80px 160px);opacity:.75"></div>
      <div style="position:absolute;right:150px;top:392px;padding:10px 16px;border-radius:8px;background:#1f7a3d;border:3px solid #fff;color:#fff;font-weight:800;font-size:16px;line-height:1.3;box-shadow:0 10px 24px rgba(0,0,0,.4)"><span style="display:inline-block;padding:1px 7px;border-radius:5px;background:#1d4ed8;margin-right:6px">87 N</span> State Championship Stadium<br><span style="font-size:22px">42 mi ↑</span></div>
      <i style="position:absolute;right:266px;top:476px;width:10px;height:100px;background:#6d7783"></i>
      <svg style="position:absolute;left:240px;top:470px" width="980" height="330" viewBox="0 0 980 330">
        <ellipse cx="490" cy="314" rx="470" ry="16" fill="rgba(0,0,0,.5)"/>
        <path d="M20 60 Q20 20 60 20 L880 20 Q950 20 960 90 L966 250 Q966 278 940 278 L40 278 Q20 278 20 258Z" fill="#f2b705"/>
        <rect x="20" y="196" width="946" height="24" fill="${me.c1}"/><rect x="20" y="220" width="946" height="6" fill="${me.c2}"/>
        ${[0,1,2,3,4,5,6].map(i=>`<rect x="${70+i*100}" y="48" width="84" height="80" rx="8" fill="#1b2533"/>`).join('')}
        <rect x="890" y="48" width="58" height="140" rx="8" fill="#1b2533"/>
        <rect x="844" y="48" width="36" height="210" rx="4" fill="#0f151d" stroke="#333" />
        <circle cx="180" cy="280" r="40" fill="#141414"/><circle cx="180" cy="280" r="16" fill="#777"/><circle cx="780" cy="280" r="40" fill="#141414"/><circle cx="780" cy="280" r="16" fill="#777"/>
        <rect x="954" y="230" width="18" height="16" rx="4" fill="#fff6c7"/><text x="430" y="182" text-anchor="middle" font-family="Inter" font-weight="900" font-size="26" fill="#1b1300" letter-spacing="2">${esc(me.town.toUpperCase())} HIGH SCHOOL</text></svg>
      <div style="position:absolute;left:240px;top:470px;width:980px;height:330px">${sq.slice(0,7).map((p,i)=>`<div style="position:absolute;left:${76+i*100}px;top:56px;width:72px;height:72px;overflow:hidden">${portraitSVG(p,72)}</div>`).join('')}
        <div style="position:absolute;left:690px;top:150px;width:110px;height:110px">${logo(me,110)}</div></div>
      <div style="position:absolute;left:1180px;top:640px;width:360px;height:110px;background:radial-gradient(ellipse at 0% 50%,rgba(255,246,199,.45),rgba(255,246,199,0) 70%)"></div>
      <div style="position:absolute;left:44px;top:34px"><div class="K">Away games · the road trip</div><div class="H gold" style="font-size:72px">The Bus Ride</div><div style="font-weight:700;color:#e5ddf2;margin-top:6px">Pick the playlist, handle what the road throws at you, and arrive in the right mood.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:200px;width:420px;padding:16px">
        <div class="lab">Playlist</div>
        ${[['🔥','Hype','+Energy · −Focus',1],['🌙','Chill','+Composure'],['🎓','Seniors\' pick','+Chemistry · anything goes']].map(([ic,t,e,on])=>`<div style="display:flex;align-items:center;gap:10px;margin-top:8px;padding:9px 12px;border-radius:12px;${on?'background:#ffd36b;color:#1d1300':'background:rgba(255,255,255,.06)'}"><span style="font-size:20px">${ic}</span><b style="flex:1">${t}</b><span style="font-size:12.5px;font-weight:700">${e}</span></div>`).join('')}
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13px;color:#cfd8e2"><span>▶ Now playing</span><div class="bar" style="flex:1"><i style="width:46%;background:#ffd36b"></i></div><span>Team mood 😤</span></div></div>
      <div class="glass" style="position:absolute;right:44px;top:34px;width:500px;padding:18px;border-color:rgba(255,154,60,.55)">
        <div style="display:flex;align-items:center;gap:10px"><span style="font-size:30px">🚌💨</span><div><div class="lab" style="color:#ffb26b">Road event · 40 min to kickoff</div><div class="H" style="font-size:26px;margin-top:2px">Breakdown on Route 9</div></div></div>
        <div style="font-size:14px;color:#cfd8e2;margin-top:8px">Smoke from the engine, the driver is on the phone, and your keeper is filming everything.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          <div style="padding:10px 12px;border-radius:12px;background:rgba(255,211,107,.14);border:1px solid #ffd36b"><b>Warm up on the shoulder</b><div style="font-size:12.5px;color:#cfd8e2;margin-top:3px">Ready on arrival · makes the paper</div></div>
          <div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16)"><b>Wait for the spare bus</b><div style="font-size:12.5px;color:#cfd8e2;margin-top:3px">Arrive rushed · slow first 10 min</div></div></div></div>
      <div style="position:absolute;right:44px;top:282px;width:540px;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end">
        ${[['👟',`${esc(fresh?fresh.ln:'Freshman')} forgot his cleats`],['🎤','The back row starts singing'],['🏨','Overnight hotel before States']].map(([ic,t])=>`<span class="chip">${ic} ${t}</span>`).join('')}</div>
      <div class="tag"><b>CONCEPT 29</b><span>The Bus Ride · playlist, road events and arrival mood before every away game</span></div>`;
    document.body.appendChild(d); });
  await shot('29-bus-ride.png'); }
  console.log(errs.join('\n')||'ok'); await browser.close();
})();
