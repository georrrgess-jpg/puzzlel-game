// Concept art 11–17, rendered with the game's own assets (mascots, portraits, kits, the 3-D figure renderer, the broadcast stage).
const { chromium } = require('./_pw');
const OUT=require('path').resolve(__dirname,'..','concepts')+'/';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Concept'); await page.fill('#nc-seed','concepts3'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
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

  /* ---------- 11. INSTANT REPLAY & TELESTRATOR ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.rivals.heated); const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div id="rp-stage" style="position:absolute;left:0;top:0;width:1600px;height:760px"><canvas></canvas></div>
      <svg style="position:absolute;left:0;top:0;width:1600px;height:760px;pointer-events:none" viewBox="0 0 1600 760">
        <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0L10 5 0 10z" fill="#ffd36b"/></marker><marker id="ah2" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0L10 5 0 10z" fill="#5be3ff"/></marker></defs>
        <path d="M520 560 C 700 420, 900 380, 1105 352" stroke="#ffd36b" stroke-width="6" fill="none" stroke-dasharray="14 10" marker-end="url(#ah)"/>
        <path d="M760 610 C 860 560, 960 500, 1010 440" stroke="#5be3ff" stroke-width="5" fill="none" marker-end="url(#ah2)"/>
        <ellipse cx="1010" cy="445" rx="70" ry="22" stroke="#5be3ff" stroke-width="4" fill="rgba(91,227,255,.12)"/>
        <ellipse cx="520" cy="590" rx="60" ry="18" stroke="#ffd36b" stroke-width="4" fill="rgba(255,211,107,.12)"/>
        <path d="M860 470 L 950 470" stroke="#ff5d7a" stroke-width="4"/><text x="870" y="458" fill="#ff5d7a" font-weight="800" font-size="18" font-family="Inter">GAP</text>
      </svg>
      <div style="position:absolute;left:0;top:0;width:1600px;height:250px;background:linear-gradient(180deg,rgba(5,8,12,.96) 0%,rgba(5,8,12,.88) 62%,rgba(5,8,12,0) 100%)"></div>
      <div style="position:absolute;left:30px;top:24px;display:flex;gap:10px;align-items:center"><span class="chip" style="background:#e63946;border-color:#e63946"><i style="width:9px;height:9px;border-radius:50%;background:#fff"></i>REPLAY</span><span class="chip">0.25× slow motion</span><span class="chip">Angle: Behind the goal</span></div>
      <div class="glass" style="position:absolute;right:30px;top:24px;width:392px;padding:14px"><div class="lab">Telestrator</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:nowrap;white-space:nowrap">${['↗ Arrow','◯ Circle','▭ Zone','✕ Erase'].map((t,i)=>`<span class="chip" style="${i===0?'background:#ffd36b;color:#1d1300;border-color:#ffd36b':''}">${t}</span>`).join('')}</div><div style="display:flex;gap:8px;margin-top:10px">${['#ffd36b','#5be3ff','#ff5d7a','#ffffff'].map(c=>`<i style="width:26px;height:26px;border-radius:50%;background:${c};display:inline-block;border:2px solid rgba(255,255,255,.4)"></i>`).join('')}</div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:140px;background:linear-gradient(180deg,rgba(5,8,12,.2),#05080c 40%);padding:16px 30px">
        <div style="display:flex;align-items:center;gap:16px"><span class="btnc">❚❚</span><span class="btng">⏮ −2s</span><span class="btng">+2s ⏭</span><span class="btng">1× · 0.5× · <b style="color:#ffd36b">0.25×</b></span><div style="flex:1"></div><span class="btng">Broadcast</span><span class="btnc">Behind goal</span><span class="btng">Tactical</span><span class="btng">⤓ Save clip to TouchlineTV</span></div>
        <div style="position:relative;height:30px;margin-top:16px"><div style="position:absolute;left:0;right:0;top:12px;height:6px;border-radius:9px;background:rgba(255,255,255,.12)"></div><div style="position:absolute;left:0;width:62%;top:12px;height:6px;border-radius:9px;background:#ffd36b"></div>
          ${[[8,'Turnover'],[31,'Through ball'],[55,'Shot'],[62,'GOAL']].map(([x,t])=>`<div style="position:absolute;left:${x}%;top:0;transform:translateX(-50%);text-align:center"><i style="display:block;width:14px;height:14px;margin:5px auto 0;border-radius:50%;background:${t==='GOAL'?'#ffd36b':'#fff'};border:3px solid #05080c"></i><span style="font-size:12px;font-weight:700;color:#cfd8e2">${t}</span></div>`).join('')}</div></div>
      <div style="position:absolute;left:30px;top:76px"><div class="K">Broadcast polish</div><div class="H gold" style="font-size:64px">Instant Replay</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Slow motion, three camera angles and a telestrator, after any goal or chance.</div></div>
      <div class="tag" style="bottom:150px"><b>CONCEPT 11</b><span>Instant Replay & Telestrator · rewind any moment, draw on it, save it to TouchlineTV</span></div>`;
    document.body.appendChild(d);
    const cv=d.querySelector('canvas'); const T={h:me,a:opp,id:'rp'}; const looks={}; const mk=(side,form)=>({slots:FORMS[form].map(([role,x,y],i)=>{ const pid=`r${side}${i}`; looks[pid]={num:[1,2,4,5,3,6,8,10,7,9,11][i],look:defaultLook(pid+'rp',11),h:70}; return {pid,role,x,y}; }),off:{}});
    const st=new Stage(cv,T,{minimap:false,lookup:pid=>looks[pid],weather:{k:'clear',night:true}}); d._st=st; st.setSides([mk(0,'4-3-3'),mk(1,'4-4-2')]); st.setKeeper(0,'r00'); st.setKeeper(1,'r10'); st.kickoffShape(0); st.snap();
    const pls=[...st.players.values()]; const atk=pls.filter(p=>p.side===0&&!p.gk), def=pls.filter(p=>p.side===1&&!p.gk);
    const pos=[[86,44],[90,30],[80,38],[92,40],[76,50]]; atk.slice(0,5).forEach((p,i)=>{ p.x=pos[i][0]; p.y=pos[i][1]; p.ov={x:p.x,y:p.y}; p.yaw=0.1; });
    const dp=[[95,38],[94,31],[89,46],[97,43]]; def.slice(0,4).forEach((p,i)=>{ p.x=dp[i][0]; p.y=dp[i][1]; p.ov={x:p.x,y:p.y}; p.yaw=Math.PI-0.3; });
    for(const p of [...atk.slice(5),...def.slice(4)]){ p.off=true; p.ov=null; p.y=-12; }
    const gk=st.gkOf(1); gk.x=103.6; gk.y=35; gk.ov={x:103.6,y:35}; gk.dive={dir:1,t:0};
    st.own=null; st.ball={x:96,y:33,z:0.6,spin:2}; st.zoomTo(0.5); st.cam.w=st.cam.tw; st.cam.x=92; st.focus={x:92}; st.ref.x=80; st.ref.y=20;
    setTimeout(()=>{ st.paused=true; },500); });
  await shot('11-instant-replay.png');

  /* ---------- 12. SET-PIECE PLAYBOOK ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)); const tk=sq.find(p=>p.pos==='MID')||sq[0]; const tall=[...sq].sort((a,b)=>b.h-a.h).slice(0,3);
    const d=document.createElement('div'); d.id='cx';
    const P=(x,y)=>[60+x*7.4, 70+y*9.2]; // pitch half (x 52.5..105 → board)
    const run=(a,b,c,col)=>`<path d="M${a} Q${b} ${c}" stroke="${col}" stroke-width="4" fill="none" marker-end="url(#m${col.slice(1)})" stroke-linecap="round"/>`;
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 70% 40%,#13283a,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Tactics · set pieces</div><div class="H gold" style="font-size:72px">Set-Piece Playbook</div></div>
      <div style="position:absolute;left:44px;top:150px;width:930px;height:640px;border-radius:22px;overflow:hidden;background:repeating-linear-gradient(90deg,#1f7040 0 66px,#1b6539 66px 132px);box-shadow:0 30px 60px rgba(0,0,0,.5)">
        <svg viewBox="0 0 930 640" style="position:absolute;inset:0">
          <defs>${['ffd36b','5be3ff','ff8fab'].map(c=>`<marker id="m${c}" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0L10 5 0 10z" fill="#${c}"/></marker>`).join('')}</defs>
          <g stroke="rgba(255,255,255,.85)" stroke-width="3" fill="none"><rect x="20" y="20" width="890" height="600"/><rect x="560" y="140" width="350" height="360"/><rect x="790" y="235" width="120" height="170"/><path d="M560 250 A90 90 0 0 0 560 390"/><path d="M20 20 V620"/></g>
          <rect x="908" y="282" width="16" height="76" fill="#fff"/>
          ${run('905 600','760 560','700 330','#ffd36b')}${run('650 470','760 420','860 300','#5be3ff')}${run('600 260','760 250','855 345','#ff8fab')}${run('700 520','820 500','880 470','#5be3ff')}
          ${[[905,600,'#ffd36b','T'],[650,470,'#5be3ff','1'],[600,260,'#ff8fab','2'],[700,520,'#5be3ff','3'],[640,380,'#fff','4']].map(([x,y,c,t])=>`<circle cx="${x}" cy="${y}" r="17" fill="${me.c1}" stroke="${c}" stroke-width="4"/><text x="${x}" y="${y+6}" text-anchor="middle" font-weight="900" font-size="16" fill="#fff" font-family="Inter">${t}</text>`).join('')}
          ${[[820,300],[835,350],[780,330],[760,400],[870,330],[845,250]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#cfd8e2" stroke="#05080c" stroke-width="3"/>`).join('')}
          <ellipse cx="855" cy="330" rx="50" ry="70" fill="rgba(255,211,107,.12)" stroke="#ffd36b" stroke-dasharray="8 6" stroke-width="3"/><text x="842" y="222" text-anchor="middle" fill="#ffd36b" font-weight="800" font-size="15" font-family="Inter">DELIVERY ZONE</text>
        </svg></div>
      <div style="position:absolute;right:44px;top:150px;width:560px;display:flex;flex-direction:column;gap:12px">
        ${[['Near-post flick','Taker whips it to the near post; #1 flicks on for the far-post run.','34%','ffd36b',true],['Far-post overload','Three runners hit the back stick. Best with tall center-backs.','28%','5be3ff',false],['Short corner & cross','Play it short, draw two markers, cross from the edge of the box.','22%','ff8fab',false]].map(([n,dd,r,c,on])=>`<div class="glass" style="padding:14px 16px;${on?'border-color:#ffd36b;box-shadow:0 0 0 2px rgba(255,211,107,.35)':''}"><div style="display:flex;justify-content:space-between;align-items:center"><div class="H" style="font-size:26px;color:#${c}">${n}</div><span class="chip">${r} chance quality</span></div><div style="color:#cfd8e2;font-size:14px;margin-top:6px">${dd}</div></div>`).join('')}
        <div class="glass" style="padding:14px 16px"><div class="lab">Assignments</div><div style="display:flex;gap:14px;margin-top:10px">${[[tk,'Taker','T'],...tall.map((p,i)=>[p,['Near post','Far post','Edge'][i],String(i+1)])].map(([p,r,t])=>`<div style="text-align:center;width:116px"><div style="width:84px;height:98px;margin:0 auto">${portraitSVG(p,84)}</div><div style="font-weight:800;font-size:14px">${esc(p.ln)}</div><div style="font-size:12px;color:#93a3b6">${t} · ${r}</div></div>`).join('')}</div></div>
        <div style="display:flex;gap:10px;white-space:nowrap"><span class="btnc">Use in matches</span><span class="btng">Preview live</span><span class="btng">Free kicks · Throw-ins</span></div></div>
      <div class="tag"><b>CONCEPT 12</b><span>Set-Piece Playbook · draw corner and free-kick routines, assign runners, see them play out live</span></div>`;
    document.body.appendChild(d); });
  await shot('12-set-piece-playbook.png');

  /* ---------- 13. SEASON WRAPPED ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const t=standings(C,'V'); const r=t.find(x=>x.sid===C.userSid); const pos=t.indexOf(r)+1;
    const top=leaders(C,'g',C.year,'V',40).find(x=>x.p.sid===C.userSid)||{p:squad(C,C.userSid,'V')[0],v:0};
    const d=document.createElement('div'); d.id='cx';
    const card=(rot,x,y,bg,inner)=>`<div style="position:absolute;left:${x}px;top:${y}px;width:330px;height:560px;border-radius:30px;padding:24px;background:${bg};transform:rotate(${rot}deg);box-shadow:0 40px 80px rgba(0,0,0,.55);overflow:hidden">${inner}</div>`;
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#2a1a4a,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">End of season · shareable story</div><div class="H gold" style="font-size:72px">Season Wrapped</div><div style="font-weight:700;color:#cfd8e2;margin-top:6px">Your ${C.year} season as a swipeable story, built from every game you played.</div></div>
      ${card(-7,80,230,`linear-gradient(160deg,${me.c1},#0b0f15)`,`<div class="lab" style="color:#fff">${C.year} · ${esc(me.town)}</div><div class="H" style="font-size:44px;margin-top:14px">You finished</div><div class="H gold" style="font-size:132px;line-height:.85;white-space:nowrap">${ordinal(pos)}</div><div style="font-size:22px;font-weight:800;margin-top:10px">${r.w}W · ${r.d}D · ${r.l}L</div><div style="margin-top:16px;color:#e7ecf2">${r.gf} goals scored, ${r.ga} conceded. ${r.streak>=2?r.streak+' straight wins to close it out.':'A season to build on.'}</div><div style="position:absolute;right:-30px;bottom:-30px;opacity:.25">${logo(me,260)}</div>`)}
      ${card(2,450,190,`linear-gradient(160deg,#ffd36b,#e98b2a)`,`<div class="lab" style="color:#3a2400">Your top scorer</div><div style="width:240px;height:280px;margin:16px auto 0">${portraitSVG(top.p,240)}</div><div class="H" style="font-size:40px;color:#1d1300;text-align:center">${esc(top.p.fn)}<br>${esc(top.p.ln)}</div><div class="H" style="font-size:80px;color:#1d1300;text-align:center">${top.v} <span style="font-size:30px">goals</span></div>`)}
      ${card(8,820,230,`linear-gradient(160deg,#0f3a2a,#05080c)`,`<div class="lab" style="color:#9ff0c6">Moment of the season</div><div style="height:220px;margin-top:16px;border-radius:18px;background:linear-gradient(180deg,#123a22,#1f7040);position:relative;overflow:hidden"><div style="position:absolute;inset:0;display:grid;place-items:center;font-size:90px">⚽</div></div><div class="H" style="font-size:34px;margin-top:16px">Last-minute winner vs ${esc(Sx(C.rivals.heated).town)}</div><div style="margin-top:10px;color:#cfd8e2">Watched 3 times on TouchlineTV</div><div style="display:flex;gap:6px;margin-top:18px">${[1,2,3,4,5,6].map(i=>`<i style="flex:1;height:5px;border-radius:9px;background:${i<=3?'#9ff0c6':'rgba(255,255,255,.2)'}"></i>`).join('')}</div>`)}
      <div class="glass" style="position:absolute;right:44px;top:200px;width:330px;padding:18px"><div class="lab">More cards in the story</div>${['Biggest win','Breakout player','Best celebration','Rivalry series','Crowd records','Class of '+C.year+' farewell','Coach of the year odds'].map((x,i)=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700"><span>${i+4}. ${x}</span><span style="color:#93a3b6">›</span></div>`).join('')}<div style="display:flex;gap:10px;margin-top:14px"><span class="btnc">▶ Play story</span><span class="btng">Save image</span></div></div>
      <div class="tag"><b>CONCEPT 13</b><span>Season Wrapped · a swipeable end-of-season story with your record, stars and best moments</span></div>`;
    document.body.appendChild(d); });
  await shot('13-season-wrapped.png');

  /* ---------- 14. COACH LEGACY & JOB OFFERS ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const co=C.coaches[C.userCoachId]; const big=Sx(C.league.find(id=>id!==C.userSid&&Sx(id).strength>0.6)||C.league[1]);
    const d=document.createElement('div'); d.id='cx';
    const badges=[['🏆','First title','Win a Section title',true],['🔥','Rivalry king','Beat your rival 3 times',true],['🎓','Developer','10 players to Varsity',true],['⭐','Unbeaten','Unbeaten league season',false],['🧱','Wall','5 straight clean sheets',true],['🌹','Senior send-off','Win on Senior Night',true],['📈','Upset artist','Win as a +400 underdog',false],['👑','Dynasty','3 State titles',false],['📰','Front page','10 Courier lead stories',true],['🎯','Set-piece guru','15 set-piece goals',false],['🕰️','Lifer','10 seasons at one school',false],['💯','Century','100 career wins',false]];
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 30%,#2b2412,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Career mode · progression</div><div class="H gold" style="font-size:72px">Coach Legacy</div></div>
      <div class="glass" style="position:absolute;left:44px;top:150px;width:420px;padding:22px"><div style="display:flex;gap:16px;align-items:center"><div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(160deg,${me.c1},#0b0f15);display:grid;place-items:center;font-size:44px;border:3px solid #ffd36b">🧢</div><div><div class="H" style="font-size:32px">Coach ${esc(co.name)}</div><div style="color:#cfd8e2;font-weight:700">${esc(me.name)}</div></div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px">${[['Legacy','B+'],['Record','41-12-9'],['Titles','2']].map(([l,v])=>`<div style="padding:10px;border-radius:14px;background:rgba(255,255,255,.06);text-align:center"><div class="lab">${l}</div><div class="H" style="font-size:26px;margin-top:4px;white-space:nowrap">${v}</div></div>`).join('')}</div>
        <div class="lab" style="margin-top:18px">Legacy points to next tier</div><div class="bar" style="margin-top:8px;height:12px"><i style="width:68%;background:linear-gradient(90deg,#ffd36b,#e98b2a)"></i></div><div style="font-size:13px;color:#93a3b6;margin-top:6px">680 / 1000 · Tier 4 unlocks a fourth assistant coach</div></div>
      <div style="position:absolute;left:490px;top:150px;width:560px"><div class="lab">Achievements · 7 of 12</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:10px">${badges.map(([i,n,dd,on])=>`<div style="padding:14px 10px;border-radius:18px;text-align:center;background:${on?'linear-gradient(160deg,rgba(255,211,107,.22),rgba(255,211,107,.04))':'rgba(255,255,255,.04)'};border:1px solid ${on?'rgba(255,211,107,.5)':'rgba(255,255,255,.1)'};${on?'':'filter:grayscale(1);opacity:.55'}"><div style="font-size:40px">${i}</div><div style="font-weight:900;margin-top:4px">${n}</div><div style="font-size:12px;color:#aebccb">${dd}</div></div>`).join('')}</div></div>
      <div style="position:absolute;right:44px;top:150px;width:470px;height:600px;background:#f3eee2;color:#1b1b1b;border-radius:6px;padding:28px;transform:rotate(2.5deg);box-shadow:0 40px 80px rgba(0,0,0,.6);font-family:Georgia,serif">
        <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #1b1b1b;padding-bottom:12px">${logo(big,70)}<div><div style="font-weight:900;font-size:22px">${esc(big.name)}</div><div style="font-size:13px">Office of the Athletic Director</div></div></div>
        <div style="margin-top:18px;font-size:16px;line-height:1.55">Coach ${esc(co.name.split(' ').slice(-1)[0])},<br><br>Your work at ${esc(me.town)} has not gone unnoticed. We would like to offer you the head coaching position for our Varsity program: a <b>bigger stadium</b>, a <b>stronger feeder program</b> and <b>higher expectations</b>.<br><br>Your career record, awards and Hall of Fame stay with you.</div>
        <div style="display:flex;gap:10px;margin-top:26px;font-family:Inter"><span class="btnc">Accept & move</span><span style="padding:10px 16px;border-radius:12px;font-weight:800;border:2px solid #1b1b1b">Stay loyal (+legacy)</span></div>
        <div style="position:absolute;right:26px;bottom:24px;font-size:12px;color:#555;font-family:Inter">Offer expires after the State final</div></div>
      <div class="tag"><b>CONCEPT 14</b><span>Coach Legacy · achievements, legacy tiers and job offers from bigger programs</span></div>`;
    document.body.appendChild(d); });
  await shot('14-coach-legacy.png');

  /* ---------- 15. KIT LAB & CLASH CHECK ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const opp=Sx(C.league.find(id=>id!==C.userSid&&colorDist(Sx(id).c1,me.c1)<130)||C.league[2]); const p=squad(C,C.userSid,'V').find(x=>x.pos==='FWD')||squad(C,C.userSid,'V')[0];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 60% 40%,#1b2433,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Customization + fix</div><div class="H gold" style="font-size:72px">Kit Lab & Clash Check</div></div>
      <div style="position:absolute;left:44px;top:160px;display:flex;gap:18px">${[['Home',me.c1,me.c2],['Away','#f1f3f5',me.c1],['Third',me.c2,me.c1]].map(([n,a,b],i)=>`<div class="glass" style="width:230px;padding:14px;text-align:center;${i===0?'border-color:#ffd36b':''}"><canvas id="kit${i}" width="400" height="480" style="width:200px;height:240px"></canvas><div class="H" style="font-size:24px;margin-top:6px">${n}</div><div style="display:flex;gap:8px;justify-content:center;margin-top:8px">${[a,b].map(c=>`<i style="width:24px;height:24px;border-radius:50%;background:${c};border:2px solid rgba(255,255,255,.4);display:inline-block"></i>`).join('')}</div></div>`).join('')}</div>
      <div class="glass" style="position:absolute;left:44px;top:520px;width:726px;padding:16px"><div class="lab">Pattern</div><div style="display:flex;gap:10px;margin-top:10px">${['Plain','Stripes','Hoops','Sash','Halves','Pinstripe','Gradient'].map((x,i)=>`<span class="chip" style="${i===1?'background:#ffd36b;color:#1d1300;border-color:#ffd36b':''}">${x}</span>`).join('')}</div><div class="lab" style="margin-top:14px">Sleeves · collar · socks</div><div style="display:flex;gap:10px;margin-top:10px">${['Contrast cuffs','V-neck','Crew','Hooped socks','Captain armband color'].map(x=>`<span class="chip">${x}</span>`).join('')}</div></div>
      <div class="glass" style="position:absolute;right:44px;top:160px;width:720px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><div class="H" style="font-size:30px">Clash check · vs ${esc(opp.town)}</div><span class="chip" style="border-color:#ff5d5d;color:#ffb3b3">⚠ Too similar for 1 in 12 fans</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px">${[['Normal vision',''],['Deuteranopia (red-green)','grayscale(.15) sepia(.55) hue-rotate(-25deg) saturate(.6)'],['Tritanopia (blue-yellow)','hue-rotate(160deg) saturate(.5)']].map(([n,flt])=>`<div style="border-radius:14px;overflow:hidden;background:#1f7040;padding:10px"><div style="display:flex;justify-content:center;gap:4px;filter:${flt}"><canvas class="cl-a" width="220" height="280" style="width:110px;height:140px"></canvas><canvas class="cl-b" width="220" height="280" style="width:110px;height:140px"></canvas></div><div style="font-size:12px;font-weight:700;text-align:center;margin-top:4px">${n}</div></div>`).join('')}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:14px"><span class="btnc">Auto-fix: wear the away kit</span><span class="btng">Colorblind-safe kits everywhere</span><span style="color:#93a3b6;font-size:13px;margin-left:auto">Contrast score 2.1 → 6.8</span></div></div>
      <div class="glass" style="position:absolute;right:44px;top:560px;width:720px;padding:16px;display:flex;gap:14px;align-items:center"><div style="font-size:34px">💡</div><div style="font-size:14.5px;color:#cfd8e2">Today the game picks the away kit by a single color-distance check. The fix adds luminance contrast and colorblind simulations, so shirts, numbers and goalkeepers stay readable on every pitch and in every weather.</div></div>
      <div class="tag"><b>CONCEPT 15</b><span>Kit Lab & Clash Check · design home/away/third kits, plus a colorblind-safe clash fix</span></div>`;
    document.body.appendChild(d);
    const ks=[{shirt:me.c1,shorts:me.c2,num:me.c2,socks:me.c1},{shirt:'#f1f3f5',shorts:me.c1,num:me.c1,socks:'#f1f3f5'},{shirt:me.c2,shorts:me.c1,num:me.c1,socks:me.c2}].map(k=>({...k,dark:mix(k.shirt,'#000000',.3),light:mix(k.shirt,'#ffffff',.18)}));
    ks.forEach((k,i)=>figDraw(document.getElementById('kit'+i),p,{kit:k,yaw:[0.6,Math.PI/2-0.1,-2.6][i],scale:0.38}));
    const ok={shirt:opp.c1,shorts:opp.c2,num:opp.c2,socks:opp.c1}; ok.dark=mix(ok.shirt,'#000000',.3); ok.light=mix(ok.shirt,'#ffffff',.18);
    const q=squad(C,opp.id,'V')[2]; document.querySelectorAll('.cl-a').forEach(cv=>figDraw(cv,p,{kit:ks[0],yaw:0.3,scale:0.36,ground:false})); document.querySelectorAll('.cl-b').forEach(cv=>figDraw(cv,q,{kit:ok,yaw:Math.PI-0.3,scale:0.36,ground:false})); });
  await shot('15-kit-lab-clash-check.png');

  /* ---------- 16. LOCKER ROOM CHEMISTRY ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)).slice(0,9);
    const traits=['Leader','Joker','Quiet pro','Hype man','Mentor','Hothead','Grinder','Showman','Rookie'];
    const pts=sq.map((p,i)=>{ const a=i/sq.length*Math.PI*2-Math.PI/2; return {p,x:460+Math.cos(a)*270,y:470+Math.sin(a)*260,t:traits[i]}; });
    const links=[[0,1,'#3ccf91'],[0,4,'#3ccf91'],[1,7,'#3ccf91'],[2,6,'#3ccf91'],[3,7,'#ffd36b'],[5,3,'#ff5d5d'],[4,8,'#3ccf91'],[5,8,'#ff5d5d'],[2,0,'#ffd36b'],[6,4,'#3ccf91']];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,#1d1630,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Squad management · depth</div><div class="H gold" style="font-size:72px">Locker Room</div></div>
      <svg style="position:absolute;left:0;top:0;width:1600px;height:900px">${links.map(([a,b,c])=>`<line x1="${pts[a].x}" y1="${pts[a].y}" x2="${pts[b].x}" y2="${pts[b].y}" stroke="${c}" stroke-width="${c==='#ff5d5d'?3:5}" stroke-dasharray="${c==='#ff5d5d'?'8 6':''}" opacity=".85"/>`).join('')}</svg>
      ${pts.map(o=>`<div style="position:absolute;left:${o.x-60}px;top:${o.y-70}px;width:120px;text-align:center"><div style="width:86px;height:100px;margin:0 auto;border-radius:50%;overflow:hidden;background:rgba(255,255,255,.08);border:3px solid ${o.t==='Leader'?'#ffd36b':'rgba(255,255,255,.25)'}">${portraitSVG(o.p,86)}</div><div style="font-weight:800;font-size:14px;margin-top:4px">${esc(o.p.ln)}</div><span class="chip" style="padding:3px 9px;font-size:11px">${o.t}</span></div>`).join('')}
      <div style="position:absolute;left:380px;top:405px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#0d1420 60%,rgba(13,20,32,0));display:grid;place-content:center;text-align:center;z-index:2"><div class="H" style="font-size:64px;color:#3ccf91">82</div><div class="lab">Chemistry</div></div>
      <div class="glass" style="position:absolute;right:44px;top:150px;width:560px;padding:18px"><div class="lab">Team morale</div><div class="bar" style="height:14px;margin-top:8px"><i style="width:78%;background:linear-gradient(90deg,#3ccf91,#ffd36b)"></i></div><div style="display:flex;justify-content:space-between;font-size:13px;color:#93a3b6;margin-top:6px"><span>Flat</span><span>Buzzing</span></div>
        <div class="lab" style="margin-top:18px">This week in the locker room</div>
        ${[['🍕','Seniors organise a team dinner','+6 chemistry · +2% finishing next game','#3ccf91'],['😤',`${esc(sq[5].ln)} unhappy about minutes`,'Start him or talk to him before Friday','#ff5d5d'],['🎤',`${esc(sq[3].ln)} runs the pregame playlist`,'+morale on Rivalry Night','#ffd36b'],['🧑‍🏫',`${esc(sq[4].ln)} mentoring ${esc(sq[8].ln)}`,'Rookie develops 10% faster','#3ccf91']].map(([i,t,s,c])=>`<div style="display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08)"><div style="font-size:28px">${i}</div><div style="flex:1"><div style="font-weight:800">${t}</div><div style="font-size:13px;color:${c}">${s}</div></div><span class="btng" style="padding:6px 10px;font-size:13px">Respond</span></div>`).join('')}
        <div style="display:flex;gap:14px;margin-top:14px;font-size:13px;color:#cfd8e2"><span><i style="display:inline-block;width:22px;height:4px;background:#3ccf91;vertical-align:middle"></i> Strong bond</span><span><i style="display:inline-block;width:22px;height:4px;background:#ffd36b;vertical-align:middle"></i> Rivals in training</span><span><i style="display:inline-block;width:22px;height:3px;border-top:3px dashed #ff5d5d;vertical-align:middle"></i> Friction</span></div></div>
      <div class="tag"><b>CONCEPT 16</b><span>Locker Room · personalities, a chemistry web and weekly dressing-room moments</span></div>`;
    document.body.appendChild(d); });
  await shot('16-locker-room-chemistry.png');

  /* ---------- 17. FITNESS & INJURIES (optional realism) ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sq=squad(C,C.userSid,'V').sort((a,b)=>ovr(b)-ovr(a)).slice(0,8); const hurt=sq[2];
    const d=document.createElement('div'); d.id='cx';
    d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 40% 40%,#0f2a33,#05080c 70%)"></div>
      <div style="position:absolute;left:44px;top:36px"><div class="K">Optional realism · settings toggle</div><div class="H gold" style="font-size:72px">Fitness & Injuries</div></div>
      <div class="glass" style="position:absolute;left:44px;top:150px;width:470px;height:660px;padding:18px;text-align:center"><div class="lab" style="text-align:left">Trainer's room</div><canvas id="inj" width="760" height="900" style="width:380px;height:450px;margin-top:6px"></canvas>
        <div style="text-align:left;margin-top:6px"><div class="H" style="font-size:28px">${esc(pname(hurt))}</div><div style="color:#ff9a9a;font-weight:800">Hamstring strain · out 2 games</div><div style="font-size:13.5px;color:#cfd8e2;margin-top:6px">Back for Rivalry Night. Rehab focus lowers the chance of a setback from 18% to 6%.</div></div></div>
      <svg style="position:absolute;left:44px;top:150px;width:470px;height:660px;pointer-events:none"><circle cx="252" cy="330" r="20" fill="rgba(255,93,93,.25)" stroke="#ff5d5d" stroke-width="3"><animate attributeName="r" values="16;24;16" dur="1.5s" repeatCount="indefinite"/></circle></svg>
      <div class="glass" style="position:absolute;left:540px;top:150px;width:1016px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center"><div class="H" style="font-size:30px">Squad fitness · before ${esc(Sx(C.rivals.heated).town)}</div><span class="chip">Next game in 4 days</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-top:14px">${sq.map((p,i)=>{ const f=i===2?0:[94,71,0,88,62,97,83,55][i]; const c=f===0?'#ff5d5d':f<65?'#ffb347':'#3ccf91'; return `<div style="display:flex;align-items:center;gap:12px"><div style="width:46px;height:54px">${portraitSVG(p,46)}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;font-weight:800"><span>${esc(pname(p))} <span style="color:#93a3b6;font-weight:600">${p.pos}</span></span><span style="color:${c}">${f===0?'Injured':f+'%'}</span></div><div class="bar" style="margin-top:6px"><i style="width:${f||100}%;background:${f===0?'repeating-linear-gradient(45deg,#ff5d5d 0 6px,#7a2020 6px 12px)':c}"></i></div></div></div>`; }).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:16px"><span class="btnc">Auto-rotate tired players</span><span class="btng">Light training this week</span><span class="btng">Medical staff upgrades</span></div></div>
      <div class="glass" style="position:absolute;left:540px;top:600px;width:1016px;padding:16px;display:flex;gap:16px;align-items:center"><div style="font-size:34px">🩺</div><div style="font-size:14.5px;color:#cfd8e2">Off by default, so results stay exactly as balanced as today. Turn it on for squad depth decisions: minutes and intensity drain fitness, and rare knocks keep a player out for a game or two. Injuries are never severe or graphic, this is high school soccer.</div></div>
      <div class="tag"><b>CONCEPT 17</b><span>Fitness & Injuries · an optional realism layer that rewards rotation and depth</span></div>`;
    document.body.appendChild(d); figDraw(document.getElementById('inj'),hurt,{yaw:Math.PI/2-0.05,scale:0.34,groundC:'rgba(91,227,255,.18)'}); });
  await shot('17-fitness-injuries.png');

  console.log(errs.join('\n')||'ok'); await browser.close();
})();
