/* ===================== CEREMONIES: trophies, fireworks, awards night ===================== */
function trophySVG(kind, s){
  const c1=s.c1, c2=s.c2; const id='t'+Math.random().toString(36).slice(2,7);
  const defs=`<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#8a5a12"/><stop offset=".28" stop-color="#e9b949"/><stop offset=".5" stop-color="#fff1b8"/><stop offset=".72" stop-color="#e2ad3c"/><stop offset="1" stop-color="#7a4d0e"/></linearGradient>
   <linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a16"/><stop offset="1" stop-color="#1a120a"/></linearGradient>
   <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <radialGradient id="${id}h" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#ffe39a" stop-opacity=".55"/><stop offset="1" stop-color="#ffe39a" stop-opacity="0"/></radialGradient></defs>`;
  const shine=(clip)=>`<g clip-path="url(#${id}c)"><rect x="-80" y="-20" width="46" height="340" fill="url(#${id}s)" transform="skewX(-18)"><animate attributeName="x" values="-120;300;300" keyTimes="0;.55;1" dur="3.2s" repeatCount="indefinite"/></rect></g><clipPath id="${id}c">${clip}</clipPath>`;
  if(kind==='section'){
    const shape='<path d="M100 18L164 36V112C164 160 134 186 100 202C66 186 36 160 36 112V36Z"/>';
    return `<svg viewBox="0 0 200 300" class="trophy-svg" aria-hidden="true">${defs}<circle cx="100" cy="125" r="96" fill="url(#${id}h)"/>
      <rect x="44" y="228" width="112" height="56" rx="6" fill="url(#${id}d)"/><rect x="62" y="244" width="76" height="24" rx="3" fill="url(#${id}g)"/><text x="100" y="261" text-anchor="middle" font-size="12" font-weight="900" fill="#4a3208" font-family="Big Shoulders Display,Arial Narrow,sans-serif">SECTION ${App.C?App.C.section:5}</text>
      <rect x="92" y="196" width="16" height="34" fill="url(#${id}g)"/>
      <path d="M100 18L164 36V112C164 160 134 186 100 202C66 186 36 160 36 112V36Z" fill="url(#${id}g)" stroke="#6b4510" stroke-width="3"/>
      <path d="M100 32L152 46V112C152 152 128 174 100 188C72 174 48 152 48 112V46Z" fill="none" stroke="#fff3c4" stroke-opacity=".6" stroke-width="2"/>
      <g transform="translate(58 58) scale(.84)">${mascotInner(s.mk||'lions',c1,c2)}</g>${shine(shape)}</svg>`;
  }
  if(kind==='regional'){
    const shape='<path d="M58 70H142C142 120 126 150 100 156C74 150 58 120 58 70Z"/><circle cx="100" cy="48" r="26"/>';
    return `<svg viewBox="0 0 200 300" class="trophy-svg" aria-hidden="true">${defs}<circle cx="100" cy="125" r="96" fill="url(#${id}h)"/>
      <path d="M70 230H130L140 280H60Z" fill="url(#${id}d)"/><rect x="74" y="246" width="52" height="16" rx="2" fill="url(#${id}g)"/>
      <path d="M90 154H110L114 212H86Z" fill="url(#${id}g)"/><ellipse cx="100" cy="216" rx="34" ry="10" fill="url(#${id}g)"/>
      <path d="M58 70H142C142 120 126 150 100 156C74 150 58 120 58 70Z" fill="url(#${id}g)" stroke="#6b4510" stroke-width="3"/>
      <path d="M58 82C40 82 38 112 62 118M142 82C160 82 162 112 138 118" fill="none" stroke="url(#${id}g)" stroke-width="7"/>
      <circle cx="100" cy="48" r="26" fill="#fafafa" stroke="#222" stroke-width="2.5"/><path d="M100 34L111 42L107 55H93L89 42Z" fill="#222"/><path d="M100 22V34M111 42L124 38M107 55L114 67M93 55L86 67M89 42L76 38" stroke="#222" stroke-width="2.4"/>
      <path d="M78 96L122 96" stroke="${c1}" stroke-width="7"/><path d="M78 96L122 96" stroke="${c2}" stroke-width="2.4"/>${shine(shape)}</svg>`;
  }
  const shape='<path d="M48 44H152V64C152 120 130 150 100 156C70 150 48 120 48 64Z"/><path d="M60 30H140L148 44H52Z"/>';
  return `<svg viewBox="0 0 200 300" class="trophy-svg" aria-hidden="true">${defs}<circle cx="100" cy="125" r="96" fill="url(#${id}h)"/>
    <path d="M52 252H148L158 290H42Z" fill="url(#${id}d)"/><path d="M62 230H138L144 254H56Z" fill="#2c1f10"/><rect x="56" y="262" width="88" height="18" rx="2" fill="url(#${id}g)"/><text x="100" y="275" text-anchor="middle" font-size="10" font-weight="900" fill="#4a3208" font-family="Big Shoulders Display,Arial Narrow,sans-serif">STATE CHAMPIONS</text>
    <path d="M84 154H116L112 196C112 206 124 212 124 222H76C76 212 88 206 88 196Z" fill="url(#${id}g)" stroke="#6b4510" stroke-width="2"/><rect x="70" y="220" width="60" height="12" rx="3" fill="url(#${id}g)"/>
    <path d="M50 58C14 56 16 112 62 118M150 58C186 56 184 112 138 118" fill="none" stroke="#6b4510" stroke-width="13"/><path d="M50 58C14 56 16 112 62 118M150 58C186 56 184 112 138 118" fill="none" stroke="url(#${id}g)" stroke-width="9"/>
    <path d="M48 44H152V64C152 120 130 150 100 156C70 150 48 120 48 64Z" fill="url(#${id}g)" stroke="#6b4510" stroke-width="3"/>
    <path d="M60 30H140L148 44H52Z" fill="url(#${id}g)" stroke="#6b4510" stroke-width="2.5"/><circle cx="100" cy="22" r="9" fill="url(#${id}g)" stroke="#6b4510" stroke-width="2"/>
    <path d="M62 52C62 92 74 126 92 144" fill="none" stroke="#fff6cf" stroke-opacity=".55" stroke-width="5"/>
    <path d="M100 74L107 90H124L110 100L115 117L100 107L85 117L90 100L76 90H93Z" fill="#fff4c9" stroke="#8a5a12" stroke-width="1.5"/>
    <path d="M24 70L10 112L22 108L28 120L36 80Z" fill="${c1}" stroke="#111" stroke-width="1.5"/><path d="M176 70L190 112L178 108L172 120L164 80Z" fill="${c2}" stroke="#111" stroke-width="1.5"/>${shine(shape)}</svg>`;
}

/* fireworks + confetti particle field */
class Fireworks {
  constructor(canvas, colors){ this.cv=canvas; this.g=canvas.getContext('2d'); this.cols=colors; this.p=[]; this.rk=[]; this.conf=[]; this.alive=true; this.t=0; this.launch=0; this.dur=9; this.resize(); this.loop=this.loop.bind(this); this.last=performance.now(); requestAnimationFrame(this.loop); this.onr=()=>this.resize(); window.addEventListener('resize',this.onr); for(let i=0;i<160;i++) this.addConf(true); }
  resize(){ const d=Math.min(2,window.devicePixelRatio||1); this.W=innerWidth; this.H=innerHeight; this.cv.width=this.W*d; this.cv.height=this.H*d; this.g.setTransform(d,0,0,d,0,0); }
  addConf(init){ this.conf.push({x:Math.random()*this.W, y:init?-Math.random()*this.H:-20, vy:50+Math.random()*90, vx:(Math.random()-.5)*40, r:Math.random()*6, vr:(Math.random()-.5)*6, w:6+Math.random()*6, h:3+Math.random()*4, c:this.cols[Math.floor(Math.random()*this.cols.length)], f:Math.random()*6}); }
  boom(x,y){ const n=70+Math.floor(Math.random()*40); const c=this.cols[Math.floor(Math.random()*this.cols.length)]; const c2=this.cols[Math.floor(Math.random()*this.cols.length)]; for(let i=0;i<n;i++){ const a=Math.random()*6.283, v=60+Math.random()*190; this.p.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.2+Math.random()*0.9,c:i%3?c:c2,s:1.6+Math.random()*1.8}); } }
  restart(){ this.t=0; this.launch=0; }
  stop(){ this.alive=false; window.removeEventListener('resize',this.onr); }
  loop(now){ if(!this.alive||!this.cv.isConnected){ this.stop(); return; } const dt=Math.min(0.05,(now-this.last)/1000); this.last=now; this.t+=dt; const g=this.g;
    g.globalCompositeOperation='source-over'; g.clearRect(0,0,this.W,this.H);
    if(this.t>1.2 && this.t<this.dur){ this.launch-=dt; if(this.launch<=0){ this.launch=0.35+Math.random()*0.5; this.rk.push({x:this.W*(0.12+Math.random()*0.76), y:this.H+10, vy:-(this.H*0.9+Math.random()*this.H*0.3), tgt:this.H*(0.12+Math.random()*0.3)}); } }
    if(this.t<this.dur+4 && this.conf.length<220 && Math.random()<0.6) this.addConf(false);
    g.globalCompositeOperation='lighter';
    for(const r of this.rk){ r.y+=r.vy*dt; r.vy*=0.985; g.fillStyle='rgba(255,230,170,.9)'; g.beginPath(); g.arc(r.x,r.y,2.2,0,7); g.fill(); g.fillStyle='rgba(255,200,120,.35)'; g.fillRect(r.x-1,r.y,2,18); if(r.y<=r.tgt){ r.dead=true; this.boom(r.x,r.y); } }
    this.rk=this.rk.filter(r=>!r.dead);
    for(const q of this.p){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vx*=0.975; q.vy=q.vy*0.975+90*dt; q.life-=dt; g.globalAlpha=Math.max(0,Math.min(1,q.life)); g.fillStyle=q.c; g.beginPath(); g.arc(q.x,q.y,q.s,0,7); g.fill(); }
    g.globalAlpha=1; this.p=this.p.filter(q=>q.life>0);
    g.globalCompositeOperation='source-over';
    for(const q of this.conf){ q.y+=q.vy*dt; q.x+=q.vx*dt+Math.sin(this.t*2+q.f)*0.6; q.r+=q.vr*dt; g.save(); g.translate(q.x,q.y); g.rotate(q.r); g.scale(1,Math.cos(this.t*5+q.f)); g.fillStyle=q.c; g.fillRect(-q.w/2,-q.h/2,q.w,q.h); g.restore(); }
    this.conf=this.conf.filter(q=>q.y<this.H+20);
    requestAnimationFrame(this.loop); }
}

function showTrophy(title, s, yr, extra={}){
  document.querySelector('.ceremony')?.remove();
  const kind = extra.kind || (/State/.test(title)?'state':/Regional/.test(title)?'regional':'section');
  const el=document.createElement('div'); el.className='ceremony'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',`${title} ${yr}`);
  el.style.setProperty('--c1',s.c1); el.style.setProperty('--c2',s.c2);
  const letters=title.toUpperCase().split('').map((ch,i)=>`<span style="animation-delay:${1100+i*45}ms">${ch===' '?'&nbsp;':esc(ch)}</span>`).join('');
  const chips=(extra.chips||[]).map((c,i)=>`<span class="chip" style="animation-delay:${2100+i*120}ms">${c}</span>`).join('');
  el.innerHTML=`<canvas class="cer-fx" aria-hidden="true"></canvas><div class="spot l" aria-hidden="true"></div><div class="spot r" aria-hidden="true"></div><div class="cer-floor" aria-hidden="true"></div>
   <div class="cer-stage"><div class="cer-trophy">${trophySVG(kind,s)}</div><div class="cer-year">${yr}</div><h1 class="cer-title">${letters}</h1>
   <div class="cer-team">${logo(s,56)}<div><b>${esc(s.name)}</b><span>${esc(s.mascot)}</span></div></div><div class="cer-chips">${chips}</div>
   <div class="cer-btns"><button class="btn ghost" data-a="cerAgain">Celebrate again</button><button class="btn pri play" data-a="closeCeremony" id="cer-go">Continue</button></div></div>`;
  document.body.appendChild(el);
  if(!reducedMotion()) el._fw=new Fireworks(el.querySelector('.cer-fx'),[s.c1,s.c2,'#ffd36b','#ffffff','#ffb347']);
  Sound.fanfare(); setTimeout(()=>{ if(el.isConnected) Sound.chant(); },1900);
  setTimeout(()=>el.querySelector('#cer-go')?.focus(),400);
}
function titleChips(C, fid){ const f=C.fixtures[fid]; if(!f) return []; const u=C.userSid; const opp=f.h===u?f.a:f.h; const us=f.h===u?f.hg:f.ag, them=f.h===u?f.ag:f.hg;
  const chips=[`Final: ${us}–${them}${f.pk?` (${f.h===u?f.pk[0]:f.pk[1]}–${f.h===u?f.pk[1]:f.pk[0]} pens)`:f.et?' aet':''} vs ${esc(Sx(opp).town)}`];
  const t=standings(C,'V').find(r=>r.sid===u); if(t) chips.push(`League ${t.w}-${t.d}-${t.l}`);
  const top=squad(C,u,'V').map(p=>({p,b:seasonBucket(p,C.year,'V','reg'),q:seasonBucket(p,C.year,'V','post')})).map(x=>({p:x.p,g:(x.b?x.b.g:0)+(x.q?x.q.g:0)})).sort((a,b)=>b.g-a.g)[0];
  if(top&&top.g) chips.push(`Top scorer: ${esc(pname(top.p))} (${top.g})`);
  return chips; }

MODALS.awardsNight = m => { const C=App.C; const A=C.awards[m.yr]; if(!A) return '';
  const cards=AWARD_ORDER.filter(k=>A.list[k]).map((k,i)=>{ const a=A.list[k]; const p=Px(a.pid); const s=Sx(a.sid); const mine=isUser(a.sid);
    return `<div class="flip ${mine?'mine':''}" style="animation-delay:${300+i*260}ms"><div class="flip-in"><div class="flip-back"><span>TOUCHLINE</span><b>${m.yr}</b></div><div class="flip-front" style="--c1:${s.c1};--c2:${s.c2}"><span class="eyebrow">${esc(AWARD_NAME[k])}</span><div class="aw-logo">${p?`<span class="aw-fface">${portraitSVG(p,66)}</span>`:''}<span class="aw-fl">${logo(s,30)}</span></div><b class="aw-name">${pLink(a.pid)}</b><span class="small muted">${esc(s.town)} · ${p?p.pos:''}</span>${statChips(awardStats(k,a,m.yr))}${mine?'<span class="pill aw-you">Your program</span>':''}</div></div></div>`; }).join('');
  const coy=A.coy?`<div class="flip ${isUser(A.coy.sid)?'mine':''}" style="animation-delay:${300+AWARD_ORDER.length*260}ms"><div class="flip-in"><div class="flip-back"><span>TOUCHLINE</span><b>${m.yr}</b></div><div class="flip-front" style="--c1:${Sx(A.coy.sid).c1};--c2:${Sx(A.coy.sid).c2}"><span class="eyebrow">Coach of the Year</span><div class="aw-logo">${logo(Sx(A.coy.sid),58)}</div><b class="aw-name">${esc(C.coaches[A.coy.cid]?.name||'')}</b><span class="small muted">${esc(Sx(A.coy.sid).town)}</span></div></div></div>`:'';
  const mineAL=[...A.al1,...A.al2].filter(id=>{ const p=Px(id); return p&&isUser(p.sid); });
  return modalShell(`<h2>${m.yr} Awards Night</h2>`, `<div class="awards-stage"><div class="awgrid">${cards}${coy}</div>${mineAL.length?`<div class="notice good">All-League honors for your players: ${mineAL.map(id=>pLink(id)).join(', ')}</div>`:''}</div>`, `<button class="btn" data-a="go" data-r="awards">Full awards page</button><button class="btn pri" data-a="closeModal">Continue</button>`,'wide awardsmodal'); };
