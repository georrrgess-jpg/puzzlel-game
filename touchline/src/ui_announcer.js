/* ===================== v10.3: STADIUM ANNOUNCER — cinematic lineup intros for both teams ===================== */
if(PREFS.sound&&PREFS.sound.voice==null) PREFS.sound.voice=0.9;
const GRADE_CALL={12:'Senior',11:'Junior',10:'Sophomore',9:'Freshman',8:'Eighth grade',7:'Seventh grade'};
const GRADE_TAG={12:'Senior',11:'Junior',10:'Sophomore',9:'Freshman',8:'8th grade',7:'7th grade'};
/* the best announcer the device offers: natural/neural voices first, deep male English voices next */
function paVoiceScore(v){ const n=v.name||''; let s=0;
  if(/natural|neural|online|premium|enhanced|wavenet/i.test(n)) s+=60;
  if(/Google UK English Male/i.test(n)) s+=45; else if(/Google US English/i.test(n)) s+=20;
  if(/(andrew|brian|christopher|guy|eric|roger|steffan|davis|tony|jason|ryan|thomas|daniel|alex|aaron|fred|arthur|evan|nathan|tom|oliver|james|reed|rocko|ralph)/i.test(n)) s+=30;
  if(/(female|zira|samantha|victoria|karen|susan|hazel|libby|aria|jenny|sonia|emma|ava|michelle|moira|tessa|fiona|serena|allison|joanna|kendra|kimberly|salli|ivy|clara|natasha|catherine)/i.test(n)) s-=40;
  if(/en[-_]US/i.test(v.lang)) s+=8; else if(/en[-_]GB/i.test(v.lang)) s+=6; else if(!/^en/i.test(v.lang)) s-=100;
  if(v.localService===false) s+=4; return s; }
const PA={ voice:null,
  ok(){ const s=PREFS.sound||{}; return !!(s.on&&!s.mVoice&&(s.voice??0.9)>0&&typeof window!=='undefined'&&window.speechSynthesis&&window.SpeechSynthesisUtterance); },
  voices(){ try{ return (speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang)).sort((a,b)=>paVoiceScore(b)-paVoiceScore(a)); }catch(e){ return []; } },
  pick(){ const vs=this.voices(); if(!vs.length) return null; const want=PREFS.sound.paVoice; this.voice=(want&&vs.find(v=>v.name===want))||vs[0]; return this.voice; },
  /* one phrase; resolves when it is finished (or after a generous estimate if the browser never reports the end) */
  say(text,o={}){ return new Promise(res=>{ const est=(o.est||700)+text.split(/\s+/).length*Math.round(360/(o.rate||0.92)); let done=false; const fin=()=>{ if(done) return; done=true; clearTimeout(t); res(); }; const t=setTimeout(fin,est+1600);
    if(!this.ok()){ clearTimeout(t); if(o.onstart) setTimeout(o.onstart,40); setTimeout(fin,est*0.7); return; }
    try{ if(!this.voice) this.pick(); const u=new SpeechSynthesisUtterance(text); if(this.voice) u.voice=this.voice; u.lang=(this.voice&&this.voice.lang)||'en-US';
      u.rate=o.rate||0.92; u.pitch=o.pitch||0.8; u.volume=clamp((PREFS.sound.voice??0.9)*(o.vol||1),0,1); let st=false; u.onstart=()=>{ st=true; o.onstart&&o.onstart(); }; u.onend=()=>{ if(!st&&o.onstart) o.onstart(); fin(); }; u.onerror=fin; speechSynthesis.speak(u); }catch(e){ fin(); } }); },
  stop(){ try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){} CIN.stopBed(); } };
try{ if(window.speechSynthesis){ PA.pick(); speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',()=>PA.pick()); } }catch(e){}
function gradeCall(p){ return GRADE_CALL[p.grade]||(p.grade?`Grade ${p.grade}`:''); }
function gradeTag(p){ return GRADE_TAG[p.grade]||(p.grade?`Grade ${p.grade}`:''); }

/* ---------- the cinematic layer: a stadium chime, a drum-and-drone bed, risers and impacts, all in a big reverb ---------- */
const CIN={ bed:null,
  on(){ return typeof Sound!=='undefined'&&PREFS.sound.on&&!PREFS.sound.mGoal&&(typeof fxOn!=='function'||fxOn('introfx'))&&Sound.ensure(); },
  io(){ const ctx=Sound.ctx; if(this.ctx!==ctx){ this.ctx=ctx; const out=ctx.createGain(); out.gain.value=0.9; out.connect(Sound.ch.goal);
      const rv=ctx.createConvolver(); const len=Math.floor(ctx.sampleRate*3.2), ir=ctx.createBuffer(2,len,ctx.sampleRate); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++){ const t=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-t,2.6)*(i<ctx.sampleRate*0.02?0.3:1); } } rv.buffer=ir;
      const wet=ctx.createGain(); wet.gain.value=0.55; rv.connect(wet); wet.connect(out); this.out=out; this.rv=rv; } return {ctx,out:this.out,rv:this.rv}; },
  osc(type,f,t,dur,vol,o={}){ const {ctx,out,rv}=this.io(); const os=ctx.createOscillator(); os.type=type; os.frequency.setValueAtTime(f,t); if(o.to) os.frequency.exponentialRampToValueAtTime(o.to,t+(o.glide||dur));
    const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+(o.a||0.005)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    let n=os; if(o.lp){ const f2=ctx.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=o.lp; os.connect(f2); n=f2; } n.connect(g); g.connect(o.dry===false?rv:out); if(o.send!==0){ const s2=ctx.createGain(); s2.gain.value=o.send??0.6; g.connect(s2); s2.connect(rv); } os.start(t); os.stop(t+dur+0.1); return g; },
  noise(t,dur,vol,o={}){ const {ctx,out,rv}=this.io(); const s=ctx.createBufferSource(); s.buffer=Sound.white||Sound.noise; s.loop=true; const f=ctx.createBiquadFilter(); f.type=o.ft||'bandpass'; f.frequency.setValueAtTime(o.f||800,t); if(o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo,t+dur); f.Q.value=o.q||0.8;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+(o.a||0.01)); if(o.sus){ g.gain.setValueAtTime(vol,t+dur-(o.r||0.1)); g.gain.linearRampToValueAtTime(0.0001,t+dur); } else g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(f); f.connect(g); g.connect(out); const s2=ctx.createGain(); s2.gain.value=o.send??0.5; g.connect(s2); s2.connect(rv); s.start(t,Math.random()); s.stop(t+dur+0.1); return g; },
  chime(){ if(!this.on()) return; const t=Sound.ctx.currentTime+0.02; [[783.99,0],[622.25,0.42],[523.25,0.84]].forEach(([f,o])=>{ this.osc('sine',f,t+o,1.4,0.16,{send:0.9}); this.osc('triangle',f*2,t+o,0.6,0.03,{send:0.9}); }); },
  boom(k=1){ if(!this.on()) return; const t=Sound.ctx.currentTime+0.01; this.osc('sine',72,t,1.6,0.75*k,{to:28,glide:1.2,send:0.35}); this.osc('sawtooth',110,t,0.35,0.12*k,{to:55,lp:900,send:0.8}); this.noise(t,0.5,0.35*k,{ft:'lowpass',f:1600,fTo:120,send:0.9}); this.osc('square',220,t,0.18,0.03*k,{lp:2400,send:1}); },
  riser(dur=1.1){ if(!this.on()) return; const t=Sound.ctx.currentTime+0.01; this.noise(t,dur,0.16,{f:500,fTo:6000,q:1.2,a:dur*0.9,sus:true,r:0.05,send:0.6}); this.osc('sine',180,t,dur,0.05,{to:720,glide:dur,a:dur*0.8,send:0.5}); },
  whoosh(){ if(!this.on()) return; const t=Sound.ctx.currentTime+0.01; this.noise(t,0.8,0.25,{f:4000,fTo:300,q:0.9,a:0.08,send:0.8}); },
  roar(k=1){ if(!this.on()) return; const t=Sound.ctx.currentTime+0.05; this.noise(t,2.2,0.22*k,{f:700,q:0.6,a:0.25,send:0.3}); this.noise(t,1.8,0.12*k,{f:1800,q:0.7,a:0.2,send:0.3}); if(Sound.applause) Sound.applause(0.45*k,2); },
  /* the bed: a low drone with a filter that opens over time and a war-drum pattern; ducks while the announcer talks */
  startBed(){ if(!this.on()||this.bed) return; const {ctx,out,rv}=this.io(); const t=ctx.currentTime+0.02; const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.32,t+2.4); g.connect(out); const s2=ctx.createGain(); s2.gain.value=0.4; g.connect(s2); s2.connect(rv);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(180,t); lp.frequency.exponentialRampToValueAtTime(1100,t+14); lp.Q.value=2; lp.connect(g);
    const nodes=[]; for(const [f,d] of [[55,-6],[55,7],[82.41,-4],[110,3]]){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=d; const og=ctx.createGain(); og.gain.value=f<60?0.28:0.16; o.connect(og); og.connect(lp); o.start(t); nodes.push(o); }
    const sub=ctx.createOscillator(); sub.frequency.value=41.2; const sg=ctx.createGain(); sg.gain.value=0.35; sub.connect(sg); sg.connect(g); sub.start(t); nodes.push(sub);
    let beat=0; const bpm=92, spb=60/bpm; const pat=[1,0,0.55,0,1,0,0.55,0.7]; const tick=()=>{ if(!this.bed) return; const now=ctx.currentTime; while(this.bed.next<now+0.25){ const v=pat[beat%pat.length]; if(v){ const tt=this.bed.next; this.osc('sine',95,tt,0.55,0.55*v*this.bed.lvl,{to:46,glide:0.35,send:0.45}); this.noise(tt,0.12,0.12*v*this.bed.lvl,{ft:'lowpass',f:900,send:0.4}); } beat++; this.bed.next+=spb/2; } };
    this.bed={g,nodes,next:t+0.6,lvl:1,iv:setInterval(tick,90)}; },
  duck(on){ const b=this.bed; if(!b) return; b.lvl=on?0.45:1; b.g.gain.setTargetAtTime(on?0.13:0.32,Sound.ctx.currentTime,0.18); },
  stopBed(){ const b=this.bed; if(!b) return; this.bed=null; clearInterval(b.iv); try{ const t=Sound.ctx.currentTime; b.g.gain.cancelScheduledValues(t); b.g.gain.setTargetAtTime(0.0001,t,0.5); setTimeout(()=>b.nodes.forEach(n=>{ try{ n.stop(); }catch(e){} }),2600); }catch(e){} } };

/* ---------- the walkout: the opponents first, a VS slam, then your XI with the full treatment ---------- */
liveWalkout=function(done){
  const L=App.live; const C=App.C; const f=C.fixtures[L.fid]; const el=$('#lv-intro'); const M=L.M; const u=M.user; if(!el||u<0){ done(); return; }
  const both=(C.settings.introBoth||'both')==='both';
  const team=i=>{ const S=M.sides[i]; const sid=i===0?f.h:f.a; const sch=Sx(sid); const xi=S.slots.map(s=>({s,p:C.players[s.pid]})).filter(x=>x.p).sort((a,b)=>(a.s.role==='GK'?-1:0)-(b.s.role==='GK'?-1:0)||a.s.y-b.s.y);
    return {i,sid,sch,S,xi,cap:((getLu(C,sid,'V')||{}).caps||[])[0],co:C.coaches[sch.coachId],home:sid===f.h}; };
  const mine=team(u), them=team(1-u); if(!mine.xi.length){ done(); return; }
  const kits=kitsFor(f); const kc=T=>kits.team[T.home?0:1].shirt;
  const X=s=>50+(s.x-50)*(0.62+0.38*(1-s.y/100)), Y=s=>88-s.y*0.62; const rm=reducedMotion(); const voice=PA.ok();
  el.insertAdjacentHTML('beforeend',`<div class="walk" data-a="liveIntroSkip"></div>`); const W=el.querySelector('.walk');
  let fired=false; const alive=()=>!fired&&App.live===L&&W.isConnected; const mic=on=>{ const m=W.querySelector('.pa-mic'); if(m) m.classList.toggle('live',!!on); if(on) CIN.duck(true); else CIN.duck(false); };
  const call=html=>{ const c=W.querySelector('#pa-call'); if(!c) return; c.classList.remove('in'); void c.offsetWidth; c.innerHTML=html; c.classList.add('in'); };
  const go=()=>{ if(fired) return; fired=true; PA.stop(); clearTimeout(L.walkT); W.classList.add('out'); setTimeout(()=>W.remove(),420); done(); };
  L.introGo=go;
  const stageFor=(T,mineTeam)=>{ W.style.setProperty('--c1',kc(T)); W.className='walk '+(mineTeam?'walk-mine':'walk-them');
    W.innerHTML=`<div class="walk-bg"></div><div class="walk-pitch"></div>${[0,1,2].map(i=>`<i class="walk-beam b${i}"></i>`).join('')}<div class="walk-flash"></div>
    <div class="walk-title"><div class="eyebrow">${esc(fixtureLabel(f))} · ${esc(T.S.form)}</div><h2>${mineTeam?'Tonight\'s<br>Starting XI':(T.home?'The home<br>side':'The<br>visitors')}</h2><div class="walk-team">${logo(T.sch,54)}<b>${esc(T.sch.town)}</b><span>${esc(T.sch.mascot)}</span></div></div>
    <div class="walk-now"><div class="pa-head"><span class="pa-mic ${voice?'':'off'}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="eyebrow">${voice?'On the PA':'Now walking out'}</div></div><div id="wk-now"><div class="pa-intro">${mineTeam?'Ladies and gentlemen…':'Introducing…'}</div></div><div class="walk-prog"><i id="wk-prog"></i></div><small id="wk-n"></small></div>
    <div class="pa-call" id="pa-call" aria-live="polite"></div>
    ${T.xi.map(({s,p},i)=>`<div class="wk-tok" id="wk${i}" style="left:${X(s)}%;top:${Y(s)}%;--sc:${(0.8+(1-s.y/100)*0.35).toFixed(2)}"><span class="wk-face">${portraitSVG(p,64)}</span><b><i>${p.num}</i> ${esc(p.ln)}${p.id===T.cap?' <em>C</em>':''}</b><small>${s.role}</small></div>`).join('')}
    <small class="walk-skip">Tap to skip</small>`; };
  const prog=(T,i)=>{ const pr=W.querySelector('#wk-prog'); if(pr) pr.style.setProperty('--p',((i+1)/T.xi.length).toFixed(4)); const n=W.querySelector('#wk-n'); if(n) n.textContent=`${i+1} of ${T.xi.length} announced`; };
  const card=(T,i)=>{ const {s,p}=T.xi[i]; const now=W.querySelector('#wk-now'); if(now) now.innerHTML=`<div class="wk-card"><span class="wk-big">${portraitSVG(p,84)}</span><div><b>${esc(pname(p))}</b><small>#${p.num} · ${esc(gradeTag(p))} · ${s.role}${p.id===T.cap?' · Captain':''}</small></div></div>`; };
  const flash=()=>{ const fl=W.querySelector('.walk-flash'); if(fl){ fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); } };
  if(rm){ stageFor(mine,true); let i=0; const step=()=>{ if(!alive()) return; if(i<mine.xi.length){ W.querySelector('#wk'+i)?.classList.add('in'); i++; L.walkT=setTimeout(step,120); } else L.walkT=setTimeout(go,900); }; L.walkT=setTimeout(step,300); return; }
  /* skipping: during the other team's calls a tap jumps to yours; "Skip all" (or a tap during yours) ends the walkout */
  let skipT=false, wakeT=null; const onT=()=>alive()&&!skipT; const skipped=new Promise(r=>{ wakeT=r; });
  const skipThem=()=>{ if(skipT||!alive()) return; skipT=true; try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){} clearTimeout(L.walkT); mic(false); wakeT(); };
  L.introAll=go;
  (async()=>{ let wr=null; const wait=ms=>new Promise(r=>{ wr=r; L.walkT=setTimeout(r,ms); }); skipped.then(()=>wr&&wr());
    const sayT=(t,o)=>Promise.race([PA.say(t,o),skipped]);
    CIN.startBed(); CIN.chime();
    /* the opponents: quick, one breath per player, polite applause — skippable */
    if(both&&them.xi.length){ stageFor(them,false); L.introGo=skipThem;
      W.querySelector('.walk-skip').outerHTML=`<div class="walk-skipbar"><button class="btn sm" data-a="paSkipThem">Skip to ${esc(mine.sch.mascot)} ⏭</button><button class="btn sm ghost" data-a="paSkipAll">Skip all</button></div>`;
      await wait(500); if(onT()){
      call(`<span class="pa-k">${them.home?'The home side':'The visitors'}</span><b>${esc(them.sch.town)} ${esc(them.sch.mascot)}</b>`); mic(true);
      await sayT(`The starting lineup for ${them.home?'the home team, the':'the visiting'} ${them.sch.town} ${them.sch.mascot}.`,{rate:1.15,pitch:0.86}); mic(false); }
      for(let i=0;i<them.xi.length&&onT();i++){ const {s,p}=them.xi[i]; prog(them,i);
        call(`<span class="pa-num">#${p.num}</span><span class="pa-grade">${esc(gradeTag(p))}</span><b class="pa-name quick">${esc(p.fn)} <strong>${esc(p.ln)}</strong></b><span class="pa-role">${esc(s.role)}</span>`);
        mic(true); await sayT(`Number ${p.num}, ${gradeCall(p)}, ${p.fn} ${p.ln}.`,{rate:1.2,pitch:0.86,est:350,onstart:()=>{ setTimeout(()=>{ if(!onT()) return; W.querySelector('#wk'+i)?.classList.add('in'); card(them,i); },300); }}); mic(false); if(!onT()) break;
        W.querySelector('#wk'+i)?.classList.add('in'); card(them,i); if(Sound.applause) Sound.applause(0.16,0.6); await wait(voice?60:380); }
      if(!alive()) return;
      if(onT()){ await wait(200);
        /* the slam */
        if(onT()){ W.className='walk walk-vs'; W.innerHTML=`<div class="walk-bg"></div><div class="vs-wrap"><div class="vs-side l" style="--c:${kc(them)}">${logo(them.sch,150)}<b>${esc(them.sch.town)}</b></div><div class="vs-x">VS</div><div class="vs-side r" style="--c:${kc(mine)}">${logo(mine.sch,150)}<b>${esc(mine.sch.town)}</b></div></div><small class="walk-skip">Tap to skip</small>`;
          CIN.whoosh(); await wait(300); if(onT()){ CIN.boom(1.1); await wait(750); } } }
      if(!alive()) return; }
    /* your XI: the punchy version — number, grade and first name in one breath, an impact on the surname */
    L.introGo=go; stageFor(mine,true); CIN.riser(1.2); await wait(450); if(!alive()) return;
    call(`<span class="pa-k">Starting lineup</span><b>${esc(mine.sch.town)} ${esc(mine.sch.mascot)}</b>`); mic(true);
    await PA.say(`Ladies and gentlemen, it's time to meet your ${mine.sch.town}`,{rate:1.0,pitch:0.78}); if(!alive()) return;
    await PA.say(`${mine.sch.mascot}!`,{rate:0.8,pitch:0.62,est:300,onstart:()=>{ CIN.boom(1.2); flash(); CIN.roar(1); }}); mic(false); if(!alive()) return; await wait(300);
    for(let i=0;i<mine.xi.length;i++){ if(!alive()) return; const {s,p}=mine.xi[i]; const isCap=p.id===mine.cap; prog(mine,i);
      call(`<span class="pa-num">#${p.num}</span><span class="pa-grade">${esc(gradeTag(p))}${isCap?' · Captain':''}</span><b class="pa-name">${esc(p.fn)} <strong>${esc(p.ln)}</strong></b><span class="pa-role">${esc(s.role)}</span>`);
      mic(true); CIN.riser(0.9);
      await PA.say(`Number ${p.num}! ${gradeCall(p)}${isCap?', and your captain':''}, ${p.fn}`,{rate:1.08,pitch:0.8,est:350}); if(!alive()) return;
      await PA.say(`${p.ln}!`,{rate:0.82,pitch:0.62,est:250,onstart:()=>{ if(!alive()) return; CIN.boom(isCap?1.25:1); flash(); W.querySelector('#wk'+i)?.classList.add('in'); card(mine,i); }}); mic(false); if(!alive()) return;
      W.querySelector('#wk'+i)?.classList.add('in'); card(mine,i); CIN.roar(isCap?1.2:0.85); await wait(voice?180:550); }
    if(!alive()) return;
    call(`<span class="pa-k">Head coach</span><b>${esc(mine.co?mine.co.name:'Coach')}</b>`); mic(true);
    await PA.say(`And your head coach, ${mine.co?mine.co.name:'Coach'}!`,{rate:1.0,pitch:0.7,onstart:()=>{ setTimeout(()=>{ if(!alive()) return; CIN.boom(1.3); flash(); CIN.roar(1.3); },700); }}); mic(false); if(!alive()) return;
    await wait(700); CIN.stopBed(); if(alive()) go(); })();
};
/* a stray announcement never outlives the live screen */
const _closeLivePA=closeLiveAndContinue; closeLiveAndContinue=async function(){ PA.stop(); return _closeLivePA.apply(this,arguments); };
/* pick and preview the announcer in Settings */
A.paTest=()=>{ PREFS.sound.on=true; Sound.gestured=true; Sound.ensure(); PA.pick(); CIN.chime(); setTimeout(async()=>{ await PA.say('Number ten!',{rate:0.92,pitch:0.8}); await PA.say('Senior...',{rate:0.9,pitch:0.78}); await PA.say(App.C?Sx(App.C.userSid).mascot+' forever':'Touchline',{rate:0.82,pitch:0.76}); },900); };
CH.paVoice=el=>{ PREFS.sound.paVoice=el.value||null; savePrefs(); PA.voice=null; PA.pick(); A.paTest(); };
function paSettings(){ const vs=PA.voices(); const cur=(PA.voice&&PA.voice.name)||''; const s=App.C.settings;
  return `<div class="field"><span class="lab">Lineup intros</span>${seg('set_introBoth',[['both','Both teams'],['mine','My team only']],s.introBoth||'both')}</div>
  <div class="field"><label class="lab" for="pa-voice">Announcer voice</label><div class="row"><select id="pa-voice" data-c="paVoice">${vs.length?vs.map(v=>`<option value="${esc(v.name)}" ${v.name===cur?'selected':''}>${esc(v.name)}${paVoiceScore(v)>=60?' ★':''}</option>`).join(''):'<option value="">Device default</option>'}</select><button class="btn sm" data-a="paTest">▶ Test</button></div><span class="tiny muted">★ marks the most natural voices on this device. Microsoft Edge and Chrome include the best ones.</span></div>`; }
A.paSkipThem=()=>{ const L=App.live; if(L&&L.introGo) L.introGo(); };
A.paSkipAll=()=>{ const L=App.live; if(L&&L.introAll) L.introAll(); };
const _settingsPA=VIEWS.settings; VIEWS.settings=()=>{ const h=_settingsPA(); const k='<span class="tiny muted">Big games = postseason and Rivalry Night.'; const i=h.indexOf(k); if(i<0) return h; const j=h.indexOf('</div>',i); return h.slice(0,j+6)+paSettings()+h.slice(j+6); };
