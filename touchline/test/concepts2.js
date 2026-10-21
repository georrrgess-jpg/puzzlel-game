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


  /* ---------- 6. SENIOR NIGHT ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const sr=squad(C,C.userSid,'V').sort((a,b)=>b.grade-a.grade||ovr(b)-ovr(a)).slice(0,5); const star=sr[0];
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,#2a3550,#05080c 70%)"></div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(180deg,#1f6d3c,#123d22)"></div>
    ${[22,50,78].map(x=>`<div style="position:absolute;left:${x}%;top:-10%;width:420px;height:110%;transform:translateX(-50%);background:linear-gradient(180deg,rgba(255,245,215,.25),rgba(255,245,215,0) 85%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%)"></div>`).join('')}
    <div style="position:absolute;left:44px;top:36px"><div class="K">Final home game · ${esc(me.name)}</div><div class="H gold" style="font-size:86px">Senior Night</div><div style="color:#cfd8e2;font-weight:600;margin-top:6px;max-width:520px">Before the last home game, each senior walks out with his family to a spotlight, a framed jersey and his career in numbers.</div></div>
    <div style="position:absolute;left:50%;bottom:120px;transform:translateX(-50%);display:flex;gap:26px;align-items:flex-end">${sr.map((p,i)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:6px;opacity:${i===2?1:.85};transform:scale(${i===2?1.18:.92})"><div style="width:110px;height:128px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.6))">${portraitSVG(p,110)}</div><div style="display:flex;gap:4px">${[0,1].map(k=>`<div style="width:30px;height:46px;border-radius:15px 15px 6px 6px;background:${['#c96a5a','#4b6a9e','#8a6a4a','#5a8a6a'][(i+k)%4]};opacity:.85"></div>`).join('')}<span style="font-size:22px;align-self:flex-end">💐</span></div><div class="H" style="font-size:20px">${esc(p.ln)}</div><div style="color:#ffd36b;font-weight:800;font-size:12px;letter-spacing:.14em">#${p.num} · CLASS OF ${C.year+ (12-p.grade)}</div></div>`).join('')}</div>
    <div class="glass" style="position:absolute;right:44px;top:44px;width:400px;padding:18px 20px"><div class="K">Now honoring</div>
      <div style="display:flex;gap:14px;align-items:center;margin-top:10px"><div style="width:120px;height:140px;border:4px solid #c9a24a;border-radius:6px;background:#140d06;display:grid;place-items:center">${shirtSVG(me.c1,me.c2,String(sr[2]?sr[2].num:10),100)}</div><div><div class="H" style="font-size:30px">${esc(pname(sr[2]||star))}</div><div style="color:#aebccb;font-weight:600;margin-top:4px">4 years · Modified → JV → Varsity</div></div></div>
      <div style="display:flex;gap:8px;margin-top:14px">${[['38','Varsity goals'],['21','Assists'],['2×','All-League']].map(([v,l])=>`<div style="flex:1;padding:8px;border-radius:12px;background:rgba(255,255,255,.06);text-align:center"><div class="H" style="font-size:26px;color:#ffd36b">${v}</div><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#aebccb;font-weight:700">${l}</div></div>`).join('')}</div>
      <div style="margin-top:12px;font-size:13px;color:#cfd8e2">🎙 "Joined as a 7th grader who couldn't reach the ball past midfield…"</div></div>
    <div class="tag"><b>CONCEPT 6</b><span>Senior Night · a send-off for your graduating class before the last home game</span></div>`; document.body.appendChild(d); });
  await shot('06-senior-night.png');

  /* ---------- 7. TRAINING WEEK ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const xi=squad(C,C.userSid,'V').slice(0,6);
    const days=['Mon','Tue','Wed','Thu','Fri']; const drills=[['🎯','Finishing','SHO +','#f5a142'],['🧱','Defensive shape','DEF +','#7cc4ff'],['⚡','Sprints','SPD + · fatigue','#ff8a8a'],['🚩','Set pieces','Corners & FKs','#9be15d'],['🧘','Recovery','Sharpness ↑','#c3a6ff']];
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0e1b14,#05080c)"></div>
    <svg style="position:absolute;left:44px;top:170px" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" rx="18" fill="#1f6d3c"/>${Array.from({length:8},(_,i)=>`<rect x="${i*80}" y="0" width="40" height="420" fill="rgba(255,255,255,.035)"/>`).join('')}<rect x="20" y="20" width="600" height="380" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/><rect x="20" y="120" width="90" height="180" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/><rect x="0" y="175" width="20" height="70" fill="#eee"/>
      ${[[150,120],[190,170],[230,120],[270,170],[310,120],[350,170]].map(([x,y])=>`<path d="M${x-8} ${y+8}L${x} ${y-8}L${x+8} ${y+8}Z" fill="#ff8a3d"/>`).join('')}
      <path d="M150 300 C 240 250, 300 330, 420 260" stroke="#ffd36b" stroke-width="3" stroke-dasharray="8 6" fill="none"/><path d="M420 260 L 140 210" stroke="#fff" stroke-width="3" stroke-dasharray="4 6"/><circle cx="140" cy="210" r="7" fill="#fff"/>
      <text x="40" y="400" fill="rgba(255,255,255,.7)" font-family="Inter" font-weight="800" font-size="14">DRILL: overlap, cut back, finish first time</text></svg>
    ${xi.slice(0,5).map((p,i)=>`<div style="position:absolute;left:${180+i*90}px;top:${380+(i%2)*60}px;width:56px;height:65px">${portraitSVG(p,56)}</div>`).join('')}
    <div style="position:absolute;left:44px;top:36px"><div class="K">Between matchdays</div><div class="H gold" style="font-size:72px">Training Week</div></div>
    <div class="glass" style="position:absolute;right:44px;top:44px;width:820px;padding:18px 20px"><div class="K">Weekly plan · drag drills into days</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px">${days.map((dname,i)=>`<div style="border-radius:14px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.18);padding:10px;min-height:150px"><div style="font-weight:900;letter-spacing:.14em;font-size:12px;color:#aebccb">${dname.toUpperCase()}</div>${[drills[i],drills[(i+2)%5]].slice(0,i===4?1:2).map(([ic,n,e,c])=>`<div style="margin-top:8px;padding:8px;border-radius:10px;background:${c}22;border:1px solid ${c}66"><div style="font-weight:800">${ic} ${n}</div><div style="font-size:12px;color:${c};font-weight:700">${e}</div></div>`).join('')}</div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05)"><div class="K" style="font-size:11px">Squad sharpness</div>${xi.slice(0,4).map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span style="width:110px;font-weight:700;font-size:13px">${esc(p.ln)}</span><div style="flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.08)"><i style="display:block;height:100%;width:${[86,72,64,91][i]}%;border-radius:4px;background:linear-gradient(90deg,#f5a142,#9be15d)"></i></div><b style="width:30px;text-align:right">${[86,72,64,91][i]}</b></div>`).join('')}</div>
        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05)"><div class="K" style="font-size:11px">This week's focus</div><div class="H" style="font-size:28px;margin-top:6px">Finishing</div><div style="color:#aebccb;font-size:13.5px;margin-top:4px">Forwards +0.4 SHO growth this week. Too many sprints raises tiredness for Friday's game.</div><div style="margin-top:8px;display:flex;gap:6px"><span class="chip" style="font-size:12px">🔥 Mini-game: finishing drill</span></div></div></div></div>
    <div class="tag"><b>CONCEPT 7</b><span>Training Week · plan practices, run quick drill mini-games, manage sharpness and fatigue</span></div>`; document.body.appendChild(d); });
  await shot('07-training-week.png');

  /* ---------- 8. STUDENT SECTION & TIFO ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid);
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`
    <div style="position:absolute;inset:0;background:#05080c"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:640px;background:repeating-linear-gradient(0deg,#0d1118 0 3px,#121a24 3px 38px)"></div>
    <div style="position:absolute;left:50%;top:40px;transform:translateX(-50%);width:1120px;height:520px;border-radius:10px;overflow:hidden;background:linear-gradient(180deg,${me.c1},${mix(me.c1,'#000000',.35)});box-shadow:0 30px 70px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;gap:40px">
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 2px,transparent 2px 22px),repeating-linear-gradient(90deg,rgba(0,0,0,.12) 0 2px,transparent 2px 22px)"></div>
      <div style="position:relative;filter:drop-shadow(0 10px 30px rgba(0,0,0,.5))">${logo(me,360)}</div>
      <div style="position:relative"><div class="H" style="font-size:120px;color:${me.c2};text-shadow:0 8px 0 rgba(0,0,0,.3)">${esc(me.mascot)}</div><div class="H" style="font-size:54px;color:#fff;margin-top:10px">Never alone</div></div></div>
    ${Array.from({length:120},(_,i)=>`<div style="position:absolute;left:${(i%40)*2.55}%;top:${560+Math.floor(i/40)*34}px;width:26px;height:34px"><div style="width:16px;height:16px;border-radius:50%;margin:0 auto;background:${['#f1c6a5','#c88b5f','#8d5a3b','#e0b090','#5c3723'][i%5]}"></div><div style="width:24px;height:18px;border-radius:8px 8px 0 0;background:${i%3?me.c1:'#fff'}"></div></div>`).join('')}
    <div class="glass" style="position:absolute;right:44px;bottom:70px;width:440px;padding:16px 18px"><div class="K">Student section · The ${esc(me.mascot)} Den</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span style="font-weight:800">Hype</span><div style="flex:1;height:14px;border-radius:7px;background:rgba(255,255,255,.08)"><i style="display:block;width:84%;height:100%;border-radius:7px;background:linear-gradient(90deg,#ffd36b,#ff7a3d)"></i></div><b>84</b></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">${['⚪ Whiteout','⚫ Blackout','🌴 Hawaiian night','🎨 Tifo reveal ✓'].map((t,i)=>`<span class="chip" style="font-size:13px;${i===3?'background:#ffd36b;color:#2a1a00':''}">${t}</span>`).join('')}</div>
      <div style="margin-top:10px;font-size:13px;color:#cfd8e2">Wins, rivalry games and big performances raise hype. Packed stands unlock themed nights, chants and pregame tifos.</div></div>
    <div class="glass" style="position:absolute;left:44px;bottom:70px;padding:14px 18px"><div class="K">Tonight</div><div class="H" style="font-size:34px;margin-top:4px">Tifo reveal · 2,400 fans</div></div>
    <div class="tag"><b>CONCEPT 8</b><span>Student Section & Hype · themed nights, chants and giant tifo reveals in your stadium</span></div>`; document.body.appendChild(d); });
  await shot('08-student-section-tifo.png');

  /* ---------- 9. SIGNATURE CELEBRATIONS ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const p=squad(C,C.userSid,'V').find(x=>x.pos==='FWD')||squad(C,C.userSid,'V')[0];
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 40%,#1c3a2a,#05080c 70%)"></div>
    <div style="position:absolute;left:44px;top:36px"><div class="K">Unlockable · player customization</div><div class="H gold" style="font-size:76px">Signature Celebrations</div></div>
    <div style="position:absolute;left:44px;top:200px;display:flex;gap:14px">${[0,1,2,3,4].map(i=>`<div class="glass" style="width:190px;height:270px;padding:10px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end"><canvas id="cel${i}" width="340" height="400" style="width:170px;height:200px"></canvas><div style="font-weight:800;margin-top:4px">${['Knee slide','Arms wide','Corner-flag jig','Shush the crowd','Backflip'][i]}</div><div style="font-size:12px;color:${i<3?'#7cd992':'#aebccb'}">${i<3?'Unlocked':['10 career goals','Rivalry winner'][i-3]}</div></div>`).join('')}</div>
    <div class="glass" style="position:absolute;right:44px;top:200px;width:420px;padding:18px"><div class="K">Equipped</div><div style="display:flex;gap:12px;align-items:center;margin-top:10px"><div style="width:90px;height:105px">${portraitSVG(p,90)}</div><div><div class="H" style="font-size:28px">${esc(pname(p))}</div><div style="color:#aebccb;font-weight:600">#${p.num} · ${p.pos}</div><div style="margin-top:6px;font-weight:800;color:#ffd36b">Knee slide → Arms wide</div></div></div>
      <div style="margin-top:12px;font-size:13.5px;color:#cfd8e2">Each player gets a signature move that plays after his goals, in the live broadcast and in replays. New moves unlock from milestones: hat tricks, rivalry winners, playoff goals.</div></div>
    <div class="tag"><b>CONCEPT 9</b><span>Signature Celebrations · unlockable goal celebrations for every player</span></div>`; document.body.appendChild(d);
    const T={h:{c1:me.c1,c2:me.c2,town:me.town,mk:me.mk},a:{c1:'#333',c2:'#999'},id:'cel'}; const kit=kitsForSchools(T.h,T.a).team[0];
    const poses=[{celeb:true,rot:-0.25},{celeb:true},{celeb:true,face:-1},{sad:false,kickT:1},{jumpT:0}];
    poses.forEach((ps,i)=>{ const cv=document.getElementById('cel'+i); const g=cv.getContext('2d'); g.scale(2,2); const fake={now:300,own:null,hands:false,ball:{x:0},hairBack:Stage.prototype.hairBack,hairFront:Stage.prototype.hairFront,proj:()=>[85,185,72]}; const fig={x:0,y:0,look:lookOf(p),hgt:70,num:p.num,face:ps.face||1,ph:0,spd:0,seed:i,kickT:-9e9,trip:-9e9,jumpT:-9e9,celeb:!!ps.celeb,gk:false};
      if(i===0){ fig.slideT=60; } if(i===4){ fig.jumpT=40; } if(i===3){ fig.sad=true; }
      g.fillStyle='rgba(60,170,90,.35)'; g.beginPath(); g.ellipse(85,186,70,12,0,0,7); g.fill(); Stage.prototype.drawFigure.call(fake,g,fig,kit,false); }); });
  await shot('09-signature-celebrations.png');

  /* ---------- 10. LOCAL NEWSPAPER & HIGHLIGHT REEL ---------- */
  await page.evaluate(()=>{ const C=App.C; const me=Sx(C.userSid); const p=squad(C,C.userSid,'V')[1]; const riv=Sx(C.rivals.heated);
    const d=document.createElement('div'); d.id='cx'; d.innerHTML=`<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a1f27,#05080c)"></div>
    <div style="position:absolute;left:60px;top:50px;width:820px;height:790px;background:#f3eee2;color:#1b1b1b;transform:rotate(-2deg);box-shadow:0 40px 80px rgba(0,0,0,.6);padding:26px 32px;font-family:Georgia,'DejaVu Serif',serif">
      <div style="display:flex;justify-content:space-between;font-size:12px;border-bottom:1px solid #999;padding-bottom:6px;font-family:Inter"><span>SATURDAY, OCTOBER 17</span><span>SPORTS · B1</span><span>75¢</span></div>
      <div style="font-size:64px;font-weight:900;text-align:center;letter-spacing:-.02em;margin:8px 0 4px">The ${esc(me.town)} Courier</div>
      <div style="border-top:4px double #222;border-bottom:1px solid #222;height:8px"></div>
      <div style="font-size:54px;font-weight:900;line-height:1;margin-top:18px">${esc(me.mascot.toUpperCase())} STUN ${esc(riv.town.toUpperCase())} IN 3–2 THRILLER</div>
      <div style="display:flex;gap:20px;margin-top:16px"><div style="width:330px;height:300px;background:#2c6e44;position:relative;overflow:hidden;filter:grayscale(1) contrast(1.2)"><div style="position:absolute;left:60px;top:30px;width:220px;height:257px">${portraitSVG(p,220)}</div></div>
        <div style="flex:1;font-size:15.5px;line-height:1.5;column-count:1"><b>By Staff Writer</b><br>${esc(pname(p))} buried a stoppage-time winner to hand ${esc(me.town)} the rivalry trophy for the first time in three years. "We never stopped believing," the senior said…<br><br><i>Inside:</i> Section standings, Player of the Week, and Coach's Corner.</div></div></div>
    <div style="position:absolute;right:70px;top:70px;width:380px;height:760px;border-radius:44px;background:#0b0f15;border:10px solid #222a35;box-shadow:0 40px 80px rgba(0,0,0,.6);overflow:hidden">
      <div style="padding:18px 16px"><div class="H" style="font-size:24px">TouchlineTV</div><div style="color:#aebccb;font-size:13px">Top 5 plays of the week</div></div>
      ${[1,2,3].map(i=>`<div style="margin:0 14px 14px;border-radius:16px;overflow:hidden;background:#121a24"><div style="height:150px;background:linear-gradient(180deg,#2a8f52,#1f6d3c);position:relative"><div style="position:absolute;left:12px;top:10px;font-family:'Inter Display';font-weight:900;font-size:40px;color:#ffd36b">#${i}</div><div style="position:absolute;right:20px;bottom:0;width:90px;height:105px">${portraitSVG(squad(C,C.userSid,'V')[i+1],90)}</div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center;font-size:20px">▶</div></div><div style="padding:10px 12px;font-size:13.5px"><b>${['Bicycle kick vs '+esc(riv.town),'40-yard screamer','Double save at the death'][i-1]}</b><div style="color:#aebccb;font-size:12px;margin-top:2px">❤ ${[2.4,1.8,1.1][i-1]}k · 💬 ${[312,190,88][i-1]}</div></div></div>`).join('')}</div>
    <div class="tag"><b>CONCEPT 10</b><span>Local newspaper & highlight reel · weekly front pages and a top-plays feed built from your matches</span></div>`; document.body.appendChild(d); });
  await shot('10-newspaper-highlights.png');

  console.log(errs.join('\n')||'no errors'); await browser.close();
})();
