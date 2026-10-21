// Renders five concept-art boards using the game's own assets (mascots, portraits, trophies, match stage).
const { chromium } = require('./_pw');
const OUT=require('path').resolve(__dirname,'..','concepts')+'/';
(async()=>{
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  const errs=[]; page.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto(require('./_pw').DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Concept'); await page.fill('#nc-seed','concepts'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.addStyleTag({content:`
    #cx{position:fixed;inset:0;z-index:99999;overflow:hidden;font-family:Inter,sans-serif;color:#fff;background:#05080c}
    #cx *{box-sizing:border-box}
    .H{font-family:'Inter Display',Inter,sans-serif;font-weight:900;letter-spacing:-.01em;text-transform:uppercase;line-height:.92}
    .K{font-family:Inter,sans-serif;font-weight:800;letter-spacing:.28em;text-transform:uppercase;font-size:13px;color:#f5d38a}
    .tag{position:absolute;left:28px;bottom:22px;display:flex;align-items:center;gap:12px;z-index:50}
    .tag b{font-family:'Inter Display';font-weight:900;font-size:15px;letter-spacing:.2em;padding:7px 12px;border-radius:8px;background:#ffd36b;color:#1d1300}
    .tag span{font-size:14px;color:#cfd8e2;font-weight:600;background:rgba(5,8,12,.75);padding:7px 12px;border-radius:8px}
    .chip{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-weight:700;font-size:15px;backdrop-filter:blur(6px)}
    .glass{background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02)),rgba(8,12,18,.7);border:1px solid rgba(255,255,255,.14);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 30px 60px rgba(0,0,0,.45)}
    .gold{background:linear-gradient(180deg,#fff,#ffe7a6 50%,#d39b2a);-webkit-background-clip:text;background-clip:text;color:transparent}
  `});

  const shot=async(name)=>{ await page.waitForTimeout(900); await page.screenshot({path:OUT+name}); await page.evaluate(()=>{ const c=document.getElementById('cx'); if(c){ if(c._st) c._st.destroy(); c.remove(); } }); };

  /* ---------- 1. RIVALRY NIGHT ---------- */
  await page.evaluate(()=>{
    const C=App.C; const me=Sx(C.userSid); const riv=Sx(C.league.find(s=>s!==C.userSid));
    const boot=`<svg viewBox="0 0 200 260" width="300"><defs><linearGradient id="ib" x1="0" x2="1"><stop offset="0" stop-color="#4a4f57"/><stop offset=".35" stop-color="#c9ced6"/><stop offset=".5" stop-color="#f4f6f8"/><stop offset=".7" stop-color="#9aa1aa"/><stop offset="1" stop-color="#3b4048"/></linearGradient><linearGradient id="wd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a1c"/><stop offset="1" stop-color="#2a180a"/></linearGradient></defs>
      <rect x="40" y="200" width="120" height="44" rx="6" fill="url(#wd)"/><rect x="52" y="212" width="96" height="18" rx="3" fill="#c9a24a"/><text x="100" y="225.5" text-anchor="middle" font-size="9.5" font-weight="900" fill="#2a1a00" font-family="Inter">THE IRON BOOT</text>
      <path d="M78 196V80c0-10 8-16 18-16h20c8 0 12 6 12 14v62c0 8 6 12 14 14l18 4c10 2 16 10 16 20v18H78z" fill="url(#ib)" stroke="#23272d" stroke-width="3"/>
      <path d="M78 176h98" stroke="#23272d" stroke-width="3"/><g fill="#23272d">${[0,1,2,3,4].map(i=>`<circle cx="${92+i*18}" cy="190" r="4"/>`).join('')}</g>
      <path d="M96 64v-12h26v12" fill="none" stroke="url(#ib)" stroke-width="5"/><path d="M90 92h36M90 108h36M90 124h36" stroke="#23272d" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
    <div style="position:absolute;inset:0;background:linear-gradient(100deg,${me.c1} 0 49.7%,#000 49.7% 50.3%,${riv.c1} 50.3%)"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 120%,rgba(255,120,40,.55),transparent 55%),radial-gradient(ellipse at 15% 100%,rgba(255,60,30,.45),transparent 40%),radial-gradient(ellipse at 85% 100%,rgba(255,60,30,.45),transparent 40%),linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.15) 40%,rgba(0,0,0,.65))"></div>
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(100deg,rgba(255,255,255,.035) 0 2px,transparent 2px 26px)"></div>
    ${Array.from({length:70},(_,i)=>`<i style="position:absolute;left:${(i*37)%100}%;top:${55+((i*53)%40)}%;width:${4+i%6}px;height:${4+i%6}px;border-radius:50%;background:rgba(255,${150+i%90},80,${.25+((i*7)%10)/20});filter:blur(${i%3}px)"></i>`).join('')}
    <div style="position:absolute;left:0;right:0;top:38px;text-align:center"><div class="K" style="font-size:16px">Week 9 · Rivalry Night · Section ${C.section}</div>
      <div class="H gold" style="font-size:118px;margin-top:10px;filter:drop-shadow(0 8px 30px rgba(0,0,0,.7))">Rivalry Night</div></div>
    <div style="position:absolute;left:130px;top:285px;display:flex;flex-direction:column;align-items:center;gap:10px;width:360px">${logo(me,230)}<div class="H" style="font-size:52px">${esc(me.town)}</div><div class="K" style="color:#fff;opacity:.85">${esc(me.mascot)}</div></div>
    <div style="position:absolute;right:130px;top:285px;display:flex;flex-direction:column;align-items:center;gap:10px;width:360px">${logo(riv,230)}<div class="H" style="font-size:52px">${esc(riv.town)}</div><div class="K" style="color:#fff;opacity:.85">${esc(riv.mascot)}</div></div>
    <div style="position:absolute;left:50%;top:230px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center">
      <div style="filter:drop-shadow(0 0 40px rgba(255,200,120,.55)) drop-shadow(0 20px 30px rgba(0,0,0,.6))">${boot}</div>
      <div class="glass" style="margin-top:-6px;padding:14px 22px;text-align:center;width:420px"><div class="K">All-time series</div>
        <div style="display:flex;justify-content:center;gap:26px;margin-top:8px;font-family:'Inter Display';font-weight:900;font-size:40px"><span>14</span><span style="color:#8b97a6">3</span><span>11</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#aebccb;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-top:-2px"><span>${esc(me.town)} wins</span><span>Draws</span><span>${esc(riv.town)} wins</span></div>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:12px">${['W','L','W','W','D'].map(r=>`<span style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-weight:900;background:${r==='W'?'#1f9d55':r==='L'?'#c0392b':'#5b6573'}">${r}</span>`).join('')}<span style="align-self:center;font-size:12px;color:#aebccb;margin-left:6px">Last 5</span></div></div></div>
    <div style="position:absolute;left:0;right:0;bottom:78px;display:flex;justify-content:center;gap:12px">
      <span class="chip">🔥 Sold out · 2,400 fans</span><span class="chip">📣 Student section chants ×2 hype</span><span class="chip">🏆 Winner keeps the Iron Boot</span><span class="chip">⭐ +1 morale for every starter</span></div>
    <div class="tag"><b>CONCEPT 1</b><span>Rivalry Night · matchday presentation, rivalry trophy & series history</span></div>`;
    document.body.appendChild(d); });
  await shot('01-rivalry-night.png');

  /* ---------- 2. WEATHER & NIGHT GAMES ---------- */
  await page.evaluate(()=>{
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`<div id="cxs" style="position:absolute;inset:0"><canvas id="cxc"></canvas></div><canvas id="rain" width="1600" height="900" style="position:absolute;inset:0;width:100%;height:100%"></canvas>`;
    document.body.appendChild(d); const st=startMenuShow(document.getElementById('cxc')); d._st=st; st.minimap=false; });
  await page.waitForTimeout(2600);
  await page.evaluate(()=>{
    const d=document.getElementById('cx'); const cv=document.getElementById('rain'); const g=cv.getContext('2d');
    // night grade + mist + rain + puddle sheen + floodlight halos
    const vg=g.createLinearGradient(0,0,0,900); vg.addColorStop(0,'rgba(8,14,30,.55)'); vg.addColorStop(.45,'rgba(10,20,40,.25)'); vg.addColorStop(1,'rgba(4,8,16,.55)'); g.fillStyle=vg; g.fillRect(0,0,1600,900);
    for(const [x,y] of [[100,40],[1500,40]]){ const h=g.createRadialGradient(x,y,0,x,y,520); h.addColorStop(0,'rgba(220,235,255,.35)'); h.addColorStop(1,'rgba(220,235,255,0)'); g.fillStyle=h; g.fillRect(0,0,1600,900); }
    const mist=g.createLinearGradient(0,250,0,520); mist.addColorStop(0,'rgba(200,215,235,0)'); mist.addColorStop(.5,'rgba(200,215,235,.14)'); mist.addColorStop(1,'rgba(200,215,235,0)'); g.fillStyle=mist; g.fillRect(0,250,1600,270);
    for(let i=0;i<60;i++){ const x=Math.random()*1600, y=420+Math.random()*460, w=60+Math.random()*180; g.fillStyle=`rgba(190,215,255,${.04+Math.random()*.06})`; g.beginPath(); g.ellipse(x,y,w,w*.08,0,0,7); g.fill(); }
    g.strokeStyle='rgba(210,225,255,.55)'; g.lineCap='round'; for(let i=0;i<1400;i++){ const x=Math.random()*1700-50, y=Math.random()*900, l=14+Math.random()*30; g.lineWidth=Math.random()<.2?1.6:0.9; g.globalAlpha=.25+Math.random()*.5; g.beginPath(); g.moveTo(x,y); g.lineTo(x-l*.28,y+l); g.stroke(); }
    g.globalAlpha=1; for(let i=0;i<120;i++){ const x=Math.random()*1600, y=480+Math.random()*420; g.strokeStyle='rgba(220,235,255,.35)'; g.lineWidth=1; g.beginPath(); g.ellipse(x,y,6+Math.random()*8,2+Math.random()*2,0,0,7); g.stroke(); }
    const ui=document.createElement('div'); ui.innerHTML=`
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px" class="glass"><div style="padding:10px 18px;display:flex;align-items:center;gap:16px"><b class="H" style="font-size:26px">Touchline</b><span style="font-family:JetBrains Mono,monospace;font-weight:800;font-size:34px;color:#ffd36b">1 – 1</span><b class="H" style="font-size:26px">Visitors</b><span class="chip" style="font-size:13px">63'</span></div></div>
      <div class="glass" style="position:absolute;right:28px;top:26px;width:360px;padding:18px 20px"><div class="K">Matchday weather</div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:10px"><svg width="64" height="64" viewBox="0 0 64 64"><path d="M18 40a12 12 0 0 1 2-24 16 16 0 0 1 30 4 10 10 0 0 1-2 20z" fill="#cfd8e2"/>${[0,1,2,3].map(i=>`<path d="M${20+i*9} 46l-4 10" stroke="#7cc4ff" stroke-width="3" stroke-linecap="round"/>`).join('')}</svg>
        <div><div class="H" style="font-size:30px">Heavy rain</div><div style="color:#aebccb;font-weight:600">48°F · Wind 14 mph NE · Under the lights</div></div></div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:600">
          ${[['Passing accuracy','−6%','#ff8a8a'],['Long shots skid & dip','+9% keeper spills','#7cd992'],['Slide tackles','+15% · more cards','#ffd36b'],['Heavy legs after 60\'','stamina ×1.2 drain','#ff8a8a']].map(([a,b,c])=>`<div style="display:flex;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05)"><span>${a}</span><b style="color:${c}">${b}</b></div>`).join('')}</div>
        <div style="margin-top:12px;font-size:12.5px;color:#aebccb">Forecast shows 3 days out, so you can pick a heavier-touch XI or switch to a direct game plan.</div></div>
      <div class="glass" style="position:absolute;left:28px;top:26px;padding:12px 16px;display:flex;gap:10px;flex-direction:column"><div class="K">Also in this update</div>${['☀️ Golden-hour kickoffs','🌫 Fog that hides the far touchline','❄️ First-snow playoff nights','⚡ Lightning delays (30-min hold)'].map(t=>`<span style="font-weight:700;font-size:14.5px">${t}</span>`).join('')}</div>
      <div class="tag"><b>CONCEPT 2</b><span>Dynamic weather & night games · rain, fog, snow and wind that change how the match plays</span></div>`;
    ui.style.cssText='position:absolute;inset:0'; d.appendChild(ui); });
  await shot('02-weather-night-games.png');

  /* ---------- 3. SUMMER SCOUTING CAMP ---------- */
  await page.evaluate(()=>{
    const C=App.C; const me=Sx(C.userSid);
    const mk=(i)=>({id:'scout'+i+'x',sid:C.userSid,num:[7,10,4,1,9,6][i],pos:['FWD','MID','DEF','GK','FWD','MID'][i],grade:8});
    const names=[['Mateo','Reyes'],['Jaylen','Brooks'],['Owen','Castillo'],['Kai','Nakamura'],['Darius','Cole'],['Elijah','Moreno']];
    const feeders=['Cedar Ridge Middle','Northside Middle','St. Anne\'s Academy','Lakeview Middle','Cedar Ridge Middle','Pine Hollow Middle'];
    const ranges=[[62,78],[55,74],[58,66],[49,71],[40,80],[60,69]], stars=[4,3,3,3,5,3], know=[85,40,90,35,15,70];
    const card=(i)=>{ const p=mk(i); const [lo,hi]=ranges[i]; const fog=know[i]<50;
      return `<div class="glass" style="padding:16px;width:310px;position:relative;overflow:hidden">
        ${i===4?'<div style="position:absolute;bottom:20px;right:-40px;transform:rotate(-35deg);background:#ffd36b;color:#2a1a00;font-weight:900;font-size:11px;letter-spacing:.15em;padding:4px 40px">HIDDEN GEM?</div>':''}
        <div style="display:flex;gap:12px;align-items:center"><div style="width:84px;height:98px;position:relative${fog?';filter:blur(2.5px) grayscale(.5)':''}">${portraitSVG(p,84,{c1:'#2b3440',c2:'#8b97a6'})}</div>
          <div><div class="H" style="font-size:24px">${names[i][0]} ${fog?'<span style="filter:blur(4px)">'+names[i][1]+'</span>':names[i][1]}</div><div style="color:#aebccb;font-weight:600;font-size:13px">${p.pos} · Grade 8 · ${feeders[i]}</div>
          <div style="color:#ffd36b;font-size:18px;letter-spacing:2px;margin-top:2px">${'★'.repeat(stars[i])}<span style="color:#3b4552">${'★'.repeat(5-stars[i])}</span></div></div></div>
        <div style="margin-top:12px;font-size:12px;color:#aebccb;font-weight:700;letter-spacing:.12em;text-transform:uppercase;display:flex;justify-content:space-between"><span>Projected OVR</span><span style="color:#fff">${lo}–${hi}</span></div>
        <div style="height:10px;border-radius:5px;background:rgba(255,255,255,.08);margin-top:6px;position:relative"><i style="position:absolute;left:${(lo-35)/60*100}%;width:${(hi-lo)/60*100}%;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,#f5a142,#9be15d)"></i></div>
        <div style="margin-top:10px;font-size:12px;color:#aebccb;font-weight:700;letter-spacing:.12em;text-transform:uppercase;display:flex;justify-content:space-between"><span>Scouting knowledge</span><span style="color:#fff">${know[i]}%</span></div>
        <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.08);margin-top:6px"><i style="display:block;width:${know[i]}%;height:100%;border-radius:3px;background:#7cc4ff"></i></div>
        <div style="display:flex;gap:8px;margin-top:12px"><span class="chip" style="font-size:12.5px;padding:6px 10px">🔍 Scout · 2 pts</span><span class="chip" style="font-size:12.5px;padding:6px 10px;background:${i===0?'#ffd36b':''};color:${i===0?'#2a1a00':''}">✉️ ${i===0?'Committed!':'Invite to camp'}</span></div></div>`; };
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
      <div style="position:absolute;inset:0;background:radial-gradient(70% 60% at 20% 0%,rgba(255,180,80,.25),transparent 60%),linear-gradient(180deg,#1d3b2a,#0b1a12 55%,#05080c)"></div>
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 80px,transparent 80px 160px)"></div>
      <div style="position:absolute;left:44px;top:34px;display:flex;align-items:center;gap:18px">${logo(me,84)}<div><div class="K">June · Off-season · ${esc(me.name)}</div><div class="H gold" style="font-size:60px">Summer Scouting Camp</div></div></div>
      <div class="glass" style="position:absolute;right:44px;top:40px;padding:14px 20px;display:flex;gap:24px;align-items:center"><div><div class="K" style="font-size:11px">Scouting points</div><div class="H" style="font-size:40px;color:#7cc4ff">7 / 12</div></div><div><div class="K" style="font-size:11px">Roster spots</div><div class="H" style="font-size:40px">3 open</div></div><div><div class="K" style="font-size:11px">Camp days left</div><div class="H" style="font-size:40px;color:#ffd36b">4</div></div></div>
      <div style="position:absolute;left:44px;top:200px;display:grid;grid-template-columns:repeat(3,310px);gap:18px">${[0,1,2,3,4,5].map(card).join('')}</div>
      <div class="glass" style="position:absolute;right:44px;top:200px;width:420px;padding:18px 20px"><div class="K">Feeder schools</div>
        <svg viewBox="0 0 380 230" width="380" style="margin-top:8px"><rect width="380" height="230" rx="14" fill="rgba(255,255,255,.03)"/><path d="M20 180C80 140 120 170 170 120S280 60 360 70" stroke="rgba(255,255,255,.12)" stroke-width="10" fill="none"/>
          ${[[60,150,'Cedar Ridge',2],[150,70,'Northside',1],[250,150,'St. Anne\'s',1],[320,60,'Lakeview',1],[300,200,'Pine Hollow',1]].map(([x,y,n,k])=>`<circle cx="${x}" cy="${y}" r="${10+k*5}" fill="rgba(255,211,107,.18)" stroke="#ffd36b" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="#ffd36b"/><text x="${x}" y="${y-18-k*4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="Inter">${n}</text>`).join('')}
          <circle cx="190" cy="125" r="13" fill="${me.c1}" stroke="#fff" stroke-width="3"/><text x="190" y="155" text-anchor="middle" fill="#cfd8e2" font-size="11" font-weight="800" font-family="Inter">YOUR SCHOOL</text></svg>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:600">
          <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.05)">💬 <i>"Coach, he's raw but he's the fastest kid I've seen at this level."</i><div style="color:#aebccb;font-size:12px;margin-top:4px">Assistant report on Darius Cole</div></div>
          <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,.05)">📍 Rival school Pine Hollow is also scouting Mateo Reyes</div></div></div>
      <div class="tag"><b>CONCEPT 3</b><span>Summer Scouting Camp · spend scouting points to reveal 8th graders and win recruiting battles</span></div>`;
    document.body.appendChild(d); });
  await shot('03-summer-scouting-camp.png');

  /* ---------- 4. HALL OF FAME & RETIRED JERSEYS ---------- */
  await page.evaluate(()=>{
    const C=App.C; const me=Sx(C.userSid); const legend=squad(C,C.userSid,'V')[0];
    const jersey=(num,name,yr)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="width:180px;height:204px;border:5px solid #c9a24a;border-radius:6px;background:linear-gradient(160deg,#1b1208,#0b0805);box-shadow:0 20px 40px rgba(0,0,0,.6),inset 0 0 30px rgba(0,0,0,.6);display:grid;place-items:center">${shirtSVG(me.c1,me.c2,String(num),142)}</div><div class="H" style="font-size:19px">${name}</div><div style="color:#c9a24a;font-weight:800;font-size:12px;letter-spacing:.18em">RETIRED ${yr}</div></div>`;
    const banner=(t,y,w)=>`<div style="width:${w||150}px;height:240px;position:relative;filter:drop-shadow(0 18px 24px rgba(0,0,0,.6))"><div style="position:absolute;inset:0;background:linear-gradient(180deg,${me.c1},${mix(me.c1,'#000000',.35)});clip-path:polygon(0 0,100% 0,100% 88%,50% 100%,0 88%)"></div><div style="position:absolute;inset:16px 10px auto;text-align:center"><div style="font-size:38px">🏆</div><div class="H" style="font-size:22px;color:${me.c2};margin-top:6px">${t}</div><div class="H" style="font-size:40px;margin-top:8px;color:#fff">${y}</div></div><i style="position:absolute;left:-6px;right:-6px;top:-8px;height:8px;background:#8a6a24;border-radius:4px"></i></div>`;
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0a0d12,#121822 40%,#05080c)"></div>
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 3px,transparent 3px 120px),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 3px,transparent 3px 90px);opacity:.7"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:60px;background:linear-gradient(180deg,#1d242e,#0a0d12);border-bottom:6px solid #2a323d"></div>
      ${[260,640,1000,1360].map(x=>`<div style="position:absolute;left:${x}px;top:-40px;width:260px;height:720px;background:radial-gradient(ellipse at 50% 0%,rgba(255,240,200,.18),transparent 70%);filter:blur(4px)"></div>`).join('')}
      <div style="position:absolute;left:60px;top:70px;display:flex;gap:26px">${banner('State Champions',2029)}${banner('State Champions',2032)}</div>
      <div style="position:absolute;right:60px;top:70px;display:flex;gap:26px">${banner('Regional Cup',2030,130)}${banner('Section Champs',2031,130)}</div>
      <div style="position:absolute;left:50%;top:84px;transform:translateX(-50%);text-align:center"><div class="K">${esc(me.name)}</div><div class="H gold" style="font-size:78px">Hall of Fame</div><div style="color:#cfd8e2;font-weight:600;margin-top:6px">Class of 2033 induction · retired numbers hang in your stadium forever</div></div>
      <div style="position:absolute;left:50%;top:330px;transform:translateX(-50%);display:flex;gap:56px;align-items:flex-end">${jersey(9,'R. Okafor',2029)}${jersey(10,legend?pname(legend):'A. Rivera',2033)}${jersey(1,'D. Haddad',2031)}</div>
      <div class="glass" style="position:absolute;left:50%;bottom:70px;transform:translateX(-50%);width:880px;padding:18px 22px;display:flex;gap:20px;align-items:center">
        <div style="width:110px;height:128px;flex:none;filter:drop-shadow(0 10px 18px rgba(0,0,0,.5))">${legend?portraitSVG(legend,110):''}</div>
        <div style="flex:1"><div class="K">Inductee · Class of 2033</div><div class="H" style="font-size:40px;margin-top:4px">${legend?esc(pname(legend)):'A. Rivera'} · #10</div>
          <div style="display:flex;gap:10px;margin-top:10px">${[['112','Career goals'],['2','State titles'],['3×','All-League'],['2032','League MVP']].map(([v,l])=>`<div style="padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.06);text-align:center"><div class="H" style="font-size:28px;color:#ffd36b">${v}</div><div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#aebccb;font-weight:700">${l}</div></div>`).join('')}</div></div>
        <div style="display:flex;flex-direction:column;gap:8px"><span class="chip" style="background:#ffd36b;color:#2a1a00">Retire #10</span><span class="chip">Name the stand after him</span></div></div>
      <div class="tag"><b>CONCEPT 4</b><span>Hall of Fame · retired jerseys & championship banners that build your program's legacy</span></div>`;
    document.body.appendChild(d); });
  await shot('04-hall-of-fame.png');

  /* ---------- 5. TUNNEL WALKOUT & STARTING XI REVEAL ---------- */
  await page.evaluate(()=>{
    const C=App.C; const me=Sx(C.userSid); const lu=getLu(C,C.userSid,'V'); const xi=lu.slots.map(s=>({s,p:C.players[s.pid]})).filter(x=>x.p);
    const pitchX=x=>380+x/100*840, pitchY=y=>840-y/100*560;
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#1b2a3e,#05080c 70%)"></div>
      <svg style="position:absolute;inset:0" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f6d3c"/><stop offset="1" stop-color="#2c9a52"/></linearGradient></defs>
        <polygon points="500,290 1100,290 1340,880 260,880" fill="url(#gr)"/>${Array.from({length:8},(_,i)=>`<polygon points="${500+i*75},290 ${575+i*75},290 ${260+(i+1)*135},880 ${260+i*135},880" fill="rgba(255,255,255,${i%2?.035:0})"/>`).join('')}
        <polygon points="500,290 1100,290 1340,880 260,880" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/><line x1="380" y1="585" x2="1220" y2="585" stroke="rgba(255,255,255,.5)" stroke-width="2"/><ellipse cx="800" cy="585" rx="110" ry="46" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/></svg>
      ${[340,800,1260].map((x,i)=>`<div style="position:absolute;left:${x-200}px;top:-120px;width:400px;height:1000px;background:linear-gradient(180deg,rgba(255,250,225,.22),rgba(255,250,225,0) 80%);clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);transform:rotate(${(i-1)*12}deg);transform-origin:50% 0;mix-blend-mode:screen"></div>`).join('')}
      <div style="position:absolute;left:44px;top:40px"><div class="K">Pregame · Section Final</div><div class="H gold" style="font-size:72px">Tonight's<br>Starting XI</div><div style="margin-top:14px;display:flex;align-items:center;gap:12px">${logo(me,64)}<div><div class="H" style="font-size:26px">${esc(me.town)}</div><div style="color:#aebccb;font-weight:700">${esc(lu.form)} · Captain #${(C.players[lu.caps[0]]||{}).num||''}</div></div></div></div>
      ${xi.map(({s,p},i)=>{ const x=pitchX(s.x)+(pitchX(s.x)-800)*(-0.18*(s.y/100)), y=pitchY(s.y); const sc=0.8+(1-s.y/100)*0.35; const shown=i<9;
        return `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-100%) scale(${sc});display:flex;flex-direction:column;align-items:center;gap:4px;opacity:${shown?1:.25}">
          <div style="width:74px;height:86px;filter:drop-shadow(0 10px 14px rgba(0,0,0,.6))${shown?'':';filter:brightness(0)'}">${portraitSVG(p,74)}</div>
          <div style="background:rgba(6,10,16,.85);border:1px solid rgba(255,255,255,.15);padding:3px 10px;border-radius:8px;font-weight:800;font-size:13px;white-space:nowrap"><span style="color:#ffd36b;font-family:monospace">${p.num}</span> ${esc(shown?p.ln:'? ? ?')}</div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#cfd8e2">${s.role}</div></div>`; }).join('')}
      <div class="glass" style="position:absolute;right:44px;top:44px;width:330px;padding:16px 18px"><div class="K">Now walking out</div>
        <div style="display:flex;gap:14px;align-items:center;margin-top:10px">${xi[8]?`<div style="width:96px;height:112px">${portraitSVG(xi[8].p,96)}</div><div><div class="H" style="font-size:30px">${esc(pname(xi[8].p))}</div><div style="color:#aebccb;font-weight:700">#${xi[8].p.num} · ${xi[8].s.role} · OVR ${Math.round(ovr(xi[8].p))}</div><div style="margin-top:6px;color:#7cd992;font-weight:800;font-size:13px">7 goals in his last 5</div></div>`:''}</div>
        <div style="margin-top:14px;height:6px;border-radius:3px;background:rgba(255,255,255,.08)"><i style="display:block;width:82%;height:100%;border-radius:3px;background:#ffd36b"></i></div><div style="font-size:12px;color:#aebccb;margin-top:6px">9 of 11 announced · tap to skip</div></div>
      <div style="position:absolute;right:44px;bottom:80px;display:flex;gap:10px"><span class="chip">🎙 PA announcer call-outs</span><span class="chip">💡 Spotlight sweep per player</span><span class="chip">🎵 Walk-out song picker</span></div>
      <div class="tag"><b>CONCEPT 5</b><span>Tunnel walkout & starting XI reveal · a cinematic pregame before big games</span></div>`;
    document.body.appendChild(d); });
  await shot('05-starting-xi-walkout.png');

  console.log(errs.join('\n')||'no errors'); await browser.close();
})();
