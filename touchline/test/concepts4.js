// Concept art 18–24, rendered with the game's own assets (mascots, portraits, kits, the 3-D figure renderer, the broadcast stage).
const { chromium } = require('./_pw');
const OUT=require('path').resolve(__dirname,'..','concepts')+'/';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Concept'); await page.fill('#nc-seed','concepts4'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
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

  /* ---------- 18. LIVE MATCH DIRECTOR ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)); const off=sq[4], on=sq[13]||sq[12];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st18" style="position:absolute;left:0;top:0;width:1600px;height:900px"></div>
      <div style="position:absolute;left:0;top:0;right:0;height:210px;background:linear-gradient(180deg,rgba(5,8,12,.95),rgba(5,8,12,.75) 60%,rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:30px;top:26px"><div class="K">Matchday · in-game control</div><div class="H gold" style="font-size:66px">Live Match Director</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Make the calls during the 80 minutes, not just at halftime.</div></div>
      <div class="glass" style="position:absolute;right:30px;top:24px;width:380px;justify-content:center;padding:10px 18px;display:flex;align-items:center;gap:16px">${logo(me,42)}<div class="H" style="font-size:40px;font-family:'JetBrains Mono',monospace">1 – 1</div>${logo(opp,42)}<span class="chip" style="background:#e63946;border-color:#e63946">● 72'</span></div>
      <div class="glass" style="position:absolute;right:30px;top:104px;width:380px;padding:16px">
        <div class="lab">Substitution</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px"><div style="width:62px;height:72px">${portraitSVG(off,62)}</div><div style="flex:1"><b>${esc(pname(off))}</b><div style="font-size:12px;color:#ff9a9a">Off · tiring</div><div class="bar" style="margin-top:6px"><i style="width:38%;background:#ffb347"></i></div></div></div>
        <div style="text-align:center;font-size:22px;margin:4px 0;color:#ffd36b">⇅</div>
        <div style="display:flex;align-items:center;gap:10px"><div style="width:62px;height:72px">${portraitSVG(on,62)}</div><div style="flex:1"><b>${esc(pname(on))}</b><div style="font-size:12px;color:#7ff0bd">On · fresh legs, ${on.pos}</div><div class="bar" style="margin-top:6px"><i style="width:100%;background:#3ccf91"></i></div></div></div>
        <div style="display:flex;gap:8px;margin-top:14px"><span class="btnc">Make change</span><span class="btng">2 subs left</span></div>
        <div class="lab" style="margin-top:18px">Formation flip</div>
        <div style="display:flex;gap:8px;margin-top:8px">${['4-3-3','4-4-2','5-3-2'].map((f,i)=>`<span class="chip" style="${i===2?'background:#ffd36b;color:#1d1300;border-color:#ffd36b':''}">${f}</span>`).join('')}</div>
        <div style="font-size:12.5px;color:#cfd8e2;margin-top:8px">Park the bus for the last 10: one more center-back, wing-backs drop deep.</div>
        <div class="lab" style="margin-top:16px">Momentum</div>
        <div style="display:flex;height:12px;border-radius:9px;overflow:hidden;margin-top:8px"><i style="flex:58;background:${me.c1}"></i><i style="flex:42;background:${opp.c1}"></i></div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(180deg,rgba(5,8,12,0),#05080c 45%)"></div>
      <div style="position:absolute;left:30px;bottom:74px;display:flex;align-items:center;gap:10px"><span class="lab" style="color:#ffd36b">Touchline shouts</span>${[['📣','Push up!','5 min',true],['🧱','Hold the line',''],['⏱️','Slow it down',''],['🚀','Go direct',''],['🔥','Press them!','']].map(([ic,t,s,on])=>`<span class="${on?'btnc':'btng'}" style="font-size:15px">${ic} ${t}${s?` <small style="opacity:.75">${s}</small>`:''}</span>`).join('')}</div>
      <div class="tag"><b>CONCEPT 18</b><span>Live Match Director · substitutions, touchline shouts and formation flips during play</span></div>`;
    document.body.appendChild(d); d._st=stageIn(document.getElementById('st18'),{id:18}); });
  await shot('18-live-match-director.png');

  /* ---------- 19. RIVAL COACHES WITH PERSONALITIES ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const ids=C.league.filter(id=>id!==C.userSid).slice(0,3);
    const P=[['The Mind-Games Veteran','"Their kids are young. Big nights like this have a way of finding that out."','1W · 2D · 6L',['Parks the bus late','Times substitutions to kill momentum']],
      ['The Hothead','"We owe them one. My boys know it, and so do theirs."','4W · 1D · 1L',['Booked twice this season','Throws everyone forward when losing']],
      ['The Young Tactician','"I watched every minute of their last three. We have a plan."','2W · 2D · 2L',['Changes formation at halftime','High press, high line']]];
    const coachP=(sid,i)=>({id:'coach'+sid,fn:'',ln:'',grade:12,sid,num:''});
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#2a1a14,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">League depth · storylines</div><div class="H gold" style="font-size:72px">Rival Coaches</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Every opposing coach has a style, a voice and a history with you.</div></div>
      <div style="position:absolute;left:44px;top:200px;right:44px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">${ids.map((sid,i)=>{ const s=Sx(sid); const co=C.coaches[s.coachId]||{name:'Coach'}; const [t,q,rec,tr]=P[i]; return `<div class="glass" style="padding:20px;border-top:5px solid ${s.c1}">
        <div style="display:flex;align-items:center;gap:14px"><div style="width:84px;height:98px">${portraitSVG(coachP(sid,i),84)}</div><div><div class="H" style="font-size:26px">${esc(co.name)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:4px">${logo(s,26)}<span style="font-weight:700;color:#cfd8e2">${esc(s.town)}</span></div></div></div>
        <span class="chip" style="margin-top:14px;${i===1?'border-color:#ff5d5d;color:#ffb3b3':i===0?'border-color:#ffd36b;color:#ffe3a3':'border-color:#5be3ff;color:#bdf4ff'}">${t}</span>
        <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.06);font-family:'Playfair Display',serif;font-style:italic;font-size:17px;line-height:1.4">${q}<div style="font-family:Inter,sans-serif;font-style:normal;font-size:11px;letter-spacing:.14em;color:#93a3b6;margin-top:8px">THE COURIER · PRE-MATCH</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span class="lab">Your record vs him</span><b style="font-family:'JetBrains Mono',monospace">${rec}</b></div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">${tr.map(x=>`<div style="font-size:13.5px;color:#cfd8e2">▸ ${x}</div>`).join('')}</div></div>`; }).join('')}</div>
      <div class="glass" style="position:absolute;left:44px;right:44px;bottom:76px;padding:14px 20px;display:flex;align-items:center;gap:16px"><span style="font-size:26px">🟨</span><div><b>Touchline moment:</b> <span style="color:#cfd8e2">the Hothead is booked for dissent after your equalizer. His team's discipline drops for ten minutes.</span></div></div>
      <div class="tag"><b>CONCEPT 19</b><span>Rival Coaches · personalities, press quotes, head-to-head records and touchline drama</span></div>`;
    document.body.appendChild(d); });
  await shot('19-rival-coaches.png');

  /* ---------- 20. DYNASTY MODE ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const yrs=Array.from({length:10},(_,i)=>2026+i); const rt=[42,51,49,63,71,78,74,86,91,94];
    const X=i=>80+i*118, Y=v=>360-v*3;
    const eras=[[0,2,'Rebuild','#93a3b6'],[3,5,'The Rise','#5be3ff'],[6,9,'Golden Era','#ffd36b']];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 60% 30%,#1e1a33,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Career · the long game</div><div class="H gold" style="font-size:72px">Dynasty Mode</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Build a program over a decade. Every title, alumnus and upgrade raises it.</div></div>
      <div class="glass" style="position:absolute;right:44px;top:40px;padding:16px 22px;display:flex;align-items:center;gap:16px">${logo(me,64)}<div><div class="lab">Program rating</div><div class="H" style="font-size:54px">94 <span style="font-size:20px;color:#ffd36b">ELITE</span></div></div></div>
      <div class="glass" style="position:absolute;left:44px;right:44px;top:200px;height:420px;padding:0"><svg viewBox="0 0 1512 420" style="width:100%;height:100%">
        ${eras.map(([a,b,n,c])=>`<rect x="${X(a)-50}" y="20" width="${X(b)-X(a)+100}" height="360" fill="${c}" opacity=".06" rx="14"/><text x="${(X(a)+X(b))/2}" y="48" text-anchor="middle" fill="${c}" font-weight="900" font-size="18" font-family="Inter" letter-spacing="3">${n.toUpperCase()}</text>`).join('')}
        <path d="M${rt.map((v,i)=>X(i)+' '+Y(v)).join(' L')}" stroke="#ffd36b" stroke-width="5" fill="none" stroke-linejoin="round"/>
        <path d="M${X(0)} 380 L${rt.map((v,i)=>X(i)+' '+Y(v)).join(' L')} L${X(9)} 380Z" fill="url(#dg)" opacity=".35"/><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></linearGradient></defs>
        ${rt.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v)}" r="9" fill="#05080c" stroke="#ffd36b" stroke-width="4"/><text x="${X(i)}" y="404" text-anchor="middle" fill="#93a3b6" font-size="15" font-weight="700" font-family="Inter">${yrs[i]}</text>`).join('')}
        ${[[3,'🏆 Section title'],[5,'🏟️ Turf upgrade'],[7,'🏆 State champions'],[9,'⭐ 3rd state title']].map(([i,t])=>`<g transform="translate(${X(i)},${Y(rt[i])-34})"><rect x="-82" y="-22" width="164" height="32" rx="16" fill="rgba(8,12,18,.92)" stroke="rgba(255,255,255,.2)"/><text y="0" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="Inter">${t}</text></g>`).join('')}
      </svg></div>
      <div style="position:absolute;left:44px;right:44px;top:642px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${[['🎽','4th assistant coach','Unlocked at 70'],['🌱','Feeder school pipeline','Unlocked at 80'],['✈️','Out-of-state showcase','Unlocked at 90'],['🏛️','New stadium','Next at 96']].map(([ic,t,s],i)=>`<div class="glass" style="padding:14px 16px;display:flex;gap:12px;align-items:center;${i===3?'opacity:.55':''}"><span style="font-size:30px">${ic}</span><div><b>${t}</b><div style="font-size:13px;color:${i===3?'#93a3b6':'#7ff0bd'}">${s}</div></div></div>`).join('')}</div>
      <div class="tag"><b>CONCEPT 20</b><span>Dynasty Mode · a program rating, eras and unlocks across a ten-year timeline</span></div>`;
    document.body.appendChild(d); });
  await shot('20-dynasty-mode.png');

  /* ---------- 21. COMMENTARY TRACK ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)); const a=sq[0], b=sq[1];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st21" style="position:absolute;left:0;top:0;width:1600px;height:900px"></div>
      <div style="position:absolute;left:0;top:0;right:0;height:200px;background:linear-gradient(180deg,rgba(5,8,12,.95),rgba(5,8,12,0))"></div>
      <div style="position:absolute;left:30px;top:26px"><div class="K">Broadcast · atmosphere</div><div class="H gold" style="font-size:66px">Commentary Track</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">A play-by-play voice that calls what the broadcast shows.</div></div>
      <div class="glass" style="position:absolute;right:30px;top:110px;width:400px;padding:16px"><div style="display:flex;align-items:center;gap:8px"><span style="display:flex;gap:2px;align-items:flex-end;height:16px">${[8,14,6,12,9].map(h=>`<i style="width:3px;height:${h}px;background:#ffd36b;border-radius:2px"></i>`).join('')}</span><span class="lab" style="color:#ffd36b">On air</span></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;font-size:14.5px">${[["63'",`${esc(b.ln)} wins it back in midfield…`,'.55'],["63'",`…slides it through for ${esc(a.ln)}!`,'.75'],["64'",`${esc(a.ln)} cuts inside, one defender left…`,'1'],["64'",'SHOOTS!','1']].map(([m,t,o])=>`<div style="display:flex;gap:10px;opacity:${o}"><b style="color:#93a3b6;font-family:'JetBrains Mono',monospace">${m}</b><span>${t}</span></div>`).join('')}</div>
        <div class="lab" style="margin-top:16px">Voice</div><div style="display:flex;gap:8px;margin-top:8px"><span class="chip" style="background:#ffd36b;color:#1d1300;border-color:#ffd36b">Spoken</span><span class="chip">Text ticker</span><span class="chip">Off</span></div>
        <div class="lab" style="margin-top:14px">Style</div><div style="display:flex;gap:8px;margin-top:8px"><span class="chip">Calm</span><span class="chip" style="border-color:#ffd36b;color:#ffe3a3">Excitable</span><span class="chip">Local radio</span></div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(180deg,rgba(5,8,12,0),rgba(5,8,12,.9) 60%)"></div>
      <div style="position:absolute;left:30px;right:470px;bottom:90px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.5)"><div style="background:${me.c1};padding:12px 16px;display:flex;align-items:center">${logo(me,40)}</div><div style="flex:1;background:rgba(8,12,18,.94);padding:12px 18px"><div class="lab" style="color:#ffd36b">64' · Play-by-play</div><div class="H" style="font-size:34px;margin-top:4px">${esc(a.ln)} cuts inside… <span style="color:#ffd36b">shoots!</span></div></div></div>
      <div class="tag"><b>CONCEPT 21</b><span>Commentary Track · spoken or ticker play-by-play driven by the match events</span></div>`;
    document.body.appendChild(d); d._st=stageIn(document.getElementById('st21'),{id:21,atk:[[86,30],[80,40],[72,34],[84,22],[68,46]],def:[[90,31],[92,36],[88,40],[95,28]],camX:84,zoom:0.5}); });
  await shot('21-commentary-track.png');

  /* ---------- 22. WEATHER THAT CHANGES THE GAME ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated);
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="st22" style="position:absolute;left:0;top:0;width:1600px;height:900px"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,12,.96) 0,rgba(5,8,12,.85) 36%,rgba(5,8,12,0) 62%)"></div>
      <div style="position:absolute;left:44px;top:36px;width:620px"><div class="K">Matchday · conditions</div><div class="H gold" style="font-size:68px">Weather that matters</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Rain, wind, snow and heat become tactical factors, not just visuals.</div></div>
      <div style="position:absolute;left:44px;top:220px;width:600px;display:flex;flex-direction:column;gap:12px">${[['🌧️','Heavy rain','Ball skids and slows on the turf. More mis-controls; short passing suffers, direct play gains.','−8% passing · +12% errors','#5be3ff',true],['💨','Strong wind','Long balls, corners and goal kicks drift. Kicking with the wind in one half, against it in the other.','Long balls ±15% range','#c4b5fd'],['❄️','Snow','Heavy pitch, dull shooting, an orange ball. Fitness drains faster.','−10% shot power','#e5e7eb'],['🔥','Heat','Second-half fatigue bites. Rotation and water breaks matter.','+30% fatigue after 50\'','#ffb347']].map(([ic,t,dsc,fx,c,on])=>`<div class="glass" style="padding:14px 16px;display:flex;gap:14px;align-items:flex-start;${on?`border-color:${c};box-shadow:0 0 0 2px ${c}55`:'opacity:.82'}"><span style="font-size:32px">${ic}</span><div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${t}</b><span class="chip" style="font-size:12px;border-color:${c};color:${c}">${fx}</span></div><div style="font-size:13.5px;color:#cfd8e2;margin-top:4px">${dsc}</div></div></div>`).join('')}</div>
      <div class="glass" style="position:absolute;right:44px;top:44px;width:420px;padding:16px"><div class="lab">Match preview · tactical factor</div><div style="display:flex;align-items:center;gap:10px;margin-top:10px">${logo(me,36)}<b>vs</b>${logo(opp,36)}<span class="chip" style="margin-left:auto;border-color:#5be3ff;color:#bdf4ff">🌧️ Heavy rain</span></div>
        <div style="margin-top:12px;font-size:14px;color:#cfd8e2">Your tiki-taka style loses <b style="color:#ff9a9a">3 points</b> of edge tonight. ${esc(opp.town)} play direct and lose nothing.</div><div style="display:flex;gap:8px;margin-top:12px"><span class="btnc">Switch to Direct</span><span class="btng">Keep it</span></div></div>
      <div class="tag"><b>CONCEPT 22</b><span>Weather that matters · conditions change the ball, the tactics and the odds</span></div>`;
    document.body.appendChild(d); d._st=stageIn(document.getElementById('st22'),{id:22,weather:{k:'rain',night:true},camX:70,zoom:0.6,pause:1600}); });
  await shot('22-weather-tactics.png');

  /* ---------- 23. PLAYER NICKNAMES ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)); const p=sq[0];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 40%,#2b2410,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Players · personality</div><div class="H gold" style="font-size:72px">Nicknames & Legends</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Players earn nicknames from what they actually do on the field.</div></div>
      <div class="glass" style="position:absolute;left:44px;top:200px;width:520px;height:560px;padding:20px;text-align:center"><canvas id="nk" width="760" height="760" style="width:380px;height:380px"></canvas>
        <div class="lab" style="margin-top:4px">#${p.num} · ${p.pos}</div><div class="H" style="font-size:44px;margin-top:6px">${esc(p.fn)} <span class="gold">"Late Show"</span> ${esc(p.ln)}</div><div style="font-size:14px;color:#cfd8e2;margin-top:8px">Earned for 3 goals after the 75th minute. Shown on the broadcast, in The Courier and on the PA.</div></div>
      <div style="position:absolute;left:600px;top:200px;right:44px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${[['🧱','The Wall','5 clean sheets in a row',true],['🧊','Ice','Scores the winning shootout kick',true],['🌙','Late Show','3 goals after the 75th minute',true],['🎯','Sniper','10 goals from outside the box',false],['⚡','The Flash','Wins 20 footraces on the break',false],['🎩','Hat Trick Hero','Two hat tricks in a season',false]].map(([ic,t,how,got])=>`<div class="glass" style="padding:16px;${got?'':'opacity:.55'}"><div style="font-size:34px">${ic}</div><div class="H" style="font-size:24px;margin-top:6px">"${t}"</div><div style="font-size:13px;color:#cfd8e2;margin-top:6px">${how}</div><div style="font-size:12px;font-weight:800;margin-top:8px;color:${got?'#7ff0bd':'#93a3b6'}">${got?'✓ Earned this season':'🔒 Locked'}</div></div>`).join('')}</div>
      <div style="position:absolute;left:600px;right:44px;top:590px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.5)"><div style="background:${me.c1};padding:12px 16px;display:flex;align-items:center"><b style="font-family:'JetBrains Mono',monospace;font-size:30px">${p.num}</b></div><div style="flex:1;background:rgba(8,12,18,.94);padding:12px 18px"><div class="lab" style="color:#ffd36b">89' · GOAL · Broadcast lower-third</div><div class="H" style="font-size:32px;margin-top:4px">${esc(p.fn)} <span class="gold">"Late Show"</span> ${esc(p.ln)}</div></div></div>
      <div class="glass" style="position:absolute;left:600px;right:44px;top:700px;padding:12px 18px;display:flex;align-items:center;gap:12px"><span style="font-size:24px">🎙️</span><span style="font-size:15px;color:#cfd8e2">PA: "Number ${p.num}! Senior… ${esc(p.fn)} <b style="color:#ffd36b">'Late Show'</b> ${esc(p.ln)}!"</span></div>
      <div class="tag"><b>CONCEPT 23</b><span>Nicknames & Legends · earned nicknames on the broadcast, The Courier and the PA</span></div>`;
    document.body.appendChild(d); figDraw(document.getElementById('nk'),p,{yaw:Math.PI/2-0.3,scale:0.42,groundC:'rgba(255,211,107,.25)',fig:{celeb:true,celebType:'classic',celebT:100000-500}}); });
  await shot('23-nicknames.png');

  /* ---------- 24. SCHEDULE BUILDER ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const ops=C.league.filter(id=>id!==C.userSid).slice(0,6).map(Sx);
    const diff=[['Tune-up','#3ccf91'],['Even','#ffd36b'],['Test','#ff8b5d'],['Tune-up','#3ccf91'],['Giant','#ff5d5d'],['Even','#ffd36b']];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#10263a,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Preseason · your choices</div><div class="H gold" style="font-size:72px">Schedule Builder</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Pick your Preseason Cup opponents, a showcase venue and a JV scrimmage.</div></div>
      <div style="position:absolute;left:44px;right:44px;top:200px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">${[['Aug 18','Scrimmage','Your own JV','🔁'],['Aug 22','Cup · Game 1',ops[0].town,'✓'],['Aug 26','Cup · Game 2',ops[4].town,'✓'],['Aug 30','Cup · Game 3','Pick an opponent','+']].map(([dt,t,o,ic],i)=>`<div class="glass" style="padding:16px;${i===3?'border-style:dashed;border-color:#ffd36b':''}"><div class="lab">${dt}</div><div class="H" style="font-size:22px;margin-top:6px">${t}</div><div style="display:flex;align-items:center;gap:8px;margin-top:10px">${i===0?logo(me,30):i<3?logo(i===1?ops[0]:ops[4],30):'<span style="font-size:26px;color:#ffd36b">+</span>'}<b>${esc(o)}</b></div></div>`).join('')}</div>
      <div class="glass" style="position:absolute;left:44px;top:360px;width:960px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><div class="H" style="font-size:26px">Choose game 3</div><span class="chip">Out-of-section showcase available</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px">${ops.map((o,i)=>`<div style="padding:14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid ${i===2?'#ffd36b':'rgba(255,255,255,.1)'};display:flex;align-items:center;gap:12px">${logo(o,44)}<div style="flex:1"><b>${esc(o.town)}</b><div style="font-size:12.5px;color:#93a3b6">${esc(o.mascot)} · ${recLine(o.id).replace(/<[^>]+>/g,'')}</div></div><span class="chip" style="font-size:12px;border-color:${diff[i][1]};color:${diff[i][1]}">${diff[i][0]}</span></div>`).join('')}</div></div>
      <div class="glass" style="position:absolute;right:44px;top:360px;width:470px;padding:18px"><div class="lab">Why it matters</div><div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;font-size:14px;color:#cfd8e2"><div>🟢 <b style="color:#fff">Tune-ups</b> build confidence and morale.</div><div>🔴 <b style="color:#fff">Giants</b> boost prestige and scouting interest if you win, cost morale if you lose.</div><div>🔁 <b style="color:#fff">JV scrimmage</b> gives your bench minutes and shows who is ready to move up.</div><div>🏟️ <b style="color:#fff">Showcase</b> plays at a neutral district stadium with a bigger crowd.</div></div><div style="display:flex;gap:8px;margin-top:16px"><span class="btnc">Lock schedule</span><span class="btng">Auto-pick</span></div></div>
      <div class="tag"><b>CONCEPT 24</b><span>Schedule Builder · shape your preseason with difficulty-tagged opponents and a JV scrimmage</span></div>`;
    document.body.appendChild(d); });
  await shot('24-schedule-builder.png');

  console.log(errs.join('\n')||'ok'); await browser.close();
})();
