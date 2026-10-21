/* ===================== SOUND v2 =====================
   Everything is synthesised with Web Audio (no audio files): a playful theme for the menu, a laid-back groove for the
   office, a living crowd that swells with every attack, and match effects tied to what the broadcast shows (strikes,
   touches, footsteps, bounces, the net, saves, tackles). Channels: music, crowd, whistle, goal, sfx, ui. */
(function(){
const S=Sound;
PREFS.sound=Object.assign({on:true,music:.45,crowd:.5,whistle:.55,goal:.7,sfx:.7,ui:.45,mMusic:false,mCrowd:false,mWhistle:false,mGoal:false,mSfx:false,mUi:false},PREFS.sound||{});
if(!PREFS.sound.v2){ PREFS.sound.on=true; PREFS.sound.v2=true; savePrefs(); } // sound is on by default from this version
const CH=['music','crowd','whistle','goal','sfx','ui'];
S.gestured=false;
const midi=n=>440*Math.pow(2,(n-69)/12);
S.ensure=function(){ if(!PREFS.sound.on||!this.gestured) return false;
  try{ if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false; const ctx=this.ctx=new AC();
      const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-14; comp.knee.value=12; comp.ratio.value=4; comp.attack.value=0.004; comp.release.value=0.2; comp.connect(ctx.destination);
      const m=this.master=ctx.createGain(); m.gain.value=0.9; m.connect(comp);
      // a short stadium reverb shared by the effects and the crowd
      const len=Math.floor(ctx.sampleRate*1.6), ir=ctx.createBuffer(2,len,ctx.sampleRate); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*0.6; }
      const rv=this.rev=ctx.createConvolver(); rv.buffer=ir; const rg=ctx.createGain(); rg.gain.value=0.35; rv.connect(rg); rg.connect(m);
      for(const k of CH){ const g=ctx.createGain(); g.connect(m); this.ch[k]=g; }
      for(const k of ['sfx','crowd','goal']){ const sg=ctx.createGain(); sg.gain.value=k==='sfx'?0.22:0.12; this.ch[k].connect(sg); sg.connect(rv); }
      this.noise=this.mkNoise(); this.white=this.mkWhite(); this.clapBuf=this.mkApplause(); }
    if(this.ctx.state==='suspended') this.ctx.resume(); this.vols(); return true; }catch(e){ return false; } };
S.vols=function(){ if(!this.ctx) return; const s=PREFS.sound; for(const k of CH){ const mute=s['m'+k[0].toUpperCase()+k.slice(1)]; const v=s.on&&!mute?(s[k]??0.5):0; this.ch[k].gain.setTargetAtTime(v,this.ctx.currentTime,0.05); } };
S.mkWhite=function(){ const b=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return b; };
S.mkApplause=function(){ const sr=this.ctx.sampleRate, b=this.ctx.createBuffer(1,sr*2.5,sr), d=b.getChannelData(0); for(let k=0;k<900;k++){ const t0=Math.floor(Math.random()*(d.length-sr*0.03)), len=Math.floor(sr*(0.004+Math.random()*0.012)), a=0.3+Math.random()*0.7; for(let i=0;i<len;i++) d[t0+i]+=(Math.random()*2-1)*a*Math.pow(1-i/len,2); } return b; };
/* ---------- building blocks ---------- */
function out(dest,pan){ const ctx=S.ctx; if(pan==null||!ctx.createStereoPanner) return dest; const p=ctx.createStereoPanner(); p.pan.value=clamp(pan,-0.9,0.9); p.connect(dest); return p; }
function tone(f,t,dur,o={}){ const ctx=S.ctx; const os=ctx.createOscillator(); os.type=o.type||'sine'; os.frequency.setValueAtTime(f,t); if(o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20,o.to),t+(o.glide||dur));
  if(o.vib){ const l=ctx.createOscillator(); l.frequency.value=o.vib; const lg=ctx.createGain(); lg.gain.value=o.vibD||6; l.connect(lg); lg.connect(os.detune); l.start(t); l.stop(t+dur+0.3); }
  const g=ctx.createGain(); const v=o.vol??0.2, a=o.a??0.005, r=o.r??Math.min(0.3,dur*0.6); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+a);
  if(o.sus!=null){ g.gain.setTargetAtTime(v*o.sus,t+a,o.dec||0.08); g.gain.setTargetAtTime(0.0001,t+dur,r/4); } else g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let node=os; if(o.lp){ const f2=ctx.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=o.lp; f2.Q.value=o.q||0.7; os.connect(f2); node=f2; }
  node.connect(g); g.connect(o.dest||S.ch.sfx); os.start(t); os.stop(t+dur+r+0.05); return g; }
function noise(t,dur,o={}){ const ctx=S.ctx; const src=ctx.createBufferSource(); src.buffer=o.white?S.white:S.noise; src.loop=true; src.playbackRate.value=o.rate||1;
  const f=ctx.createBiquadFilter(); f.type=o.ft||'bandpass'; f.frequency.setValueAtTime(o.f||1000,t); if(o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo,t+dur); f.Q.value=o.q||1;
  const g=ctx.createGain(); const v=o.vol??0.2, a=o.a??0.003; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f); f.connect(g); g.connect(o.dest||S.ch.sfx); src.start(t,Math.random()*0.8); src.stop(t+dur+0.05); return g; }
S.now=function(){ return this.ctx?this.ctx.currentTime:0; };
/* ---------- match effects ---------- */
const last={}; const gap=(k,ms)=>{ const n=performance.now(); if(last[k]&&n-last[k]<ms) return false; last[k]=n; return true; };
S.kick=function(kind,power,pan){ if(!this.ensure()||!gap('kick',60)) return; const t=this.now()+0.005; const d=out(this.ch.sfx,pan); const p=clamp(power??0.6,0.15,1);
  // the boot through the ball: a low thump and a leather slap
  tone(150+p*40,t,0.16,{to:48,glide:0.14,vol:0.8*p+0.2,dest:d});
  noise(t,0.05+p*0.03,{f:1700+p*900,q:0.9,vol:0.35+0.5*p,dest:d,white:true});
  if(kind==='shot'||kind==='loft'||p>0.8) noise(t+0.02,0.32+p*0.2,{f:2400,fTo:700,q:0.6,vol:0.07+0.1*p,dest:d,white:true}); }  // the whoosh as it flies
S.touch=function(pan){ if(!this.ensure()||!gap('touch',90)) return; const t=this.now(); const d=out(this.ch.sfx,pan); tone(210,t,0.07,{to:90,vol:0.12,dest:d}); noise(t,0.03,{f:1300,q:1,vol:0.07,dest:d}); };
S.trap=function(pan){ if(!this.ensure()||!gap('trap',80)) return; const t=this.now(); const d=out(this.ch.sfx,pan); tone(170,t,0.09,{to:70,vol:0.2,dest:d}); noise(t,0.04,{f:900,q:0.8,vol:0.1,dest:d}); };
S.step=function(v,pan){ if(!this.ensure()||!gap('step',85)) return; const t=this.now(); const d=out(this.ch.sfx,pan); noise(t,0.06,{f:420+Math.random()*160,q:1.4,vol:0.05+0.07*clamp(v,0,1),dest:d}); };
S.bounce=function(v,pan){ if(!this.ensure()||!gap('bounce',70)) return; const t=this.now(); const d=out(this.ch.sfx,pan); const p=clamp(v/9,0.1,1); tone(120+p*60,t,0.12,{to:55,vol:0.12+0.3*p,dest:d}); noise(t,0.03,{f:900,q:0.8,vol:0.05+0.1*p,dest:d}); };
S.net=function(v,pan){ if(!this.ensure()||!gap('net',350)) return; const t=this.now(); const d=out(this.ch.sfx,pan); const p=clamp(v,0.2,1);
  noise(t,0.45,{f:3200,fTo:1400,q:0.5,vol:0.18*p+0.05,dest:d,white:true}); for(let i=0;i<5;i++) noise(t+0.03+i*0.035,0.05,{f:2600-i*200,q:3,vol:0.05*p,dest:d,white:true}); };
S.slide=function(pan){ if(!this.ensure()||!gap('slide',200)) return; const t=this.now(); const d=out(this.ch.sfx,pan); noise(t,0.38,{f:700,fTo:300,q:0.6,vol:0.16,dest:d,a:0.04}); };
S.tackle=function(pan){ if(!this.ensure()||!gap('tackle',200)) return; const t=this.now(); const d=out(this.ch.sfx,pan); tone(95,t,0.14,{to:50,vol:0.32,dest:d}); noise(t,0.07,{f:600,q:0.7,vol:0.14,dest:d}); this.ooh(0.35); };
S.glove=function(pan){ if(!this.ensure()||!gap('glove',150)) return; const t=this.now(); const d=out(this.ch.sfx,pan); noise(t,0.07,{f:1100,q:0.6,vol:0.35,dest:d}); tone(230,t,0.09,{to:110,vol:0.25,dest:d}); };
S.dive=function(pan){ if(!this.ensure()||!gap('dive',300)) return; const t=this.now()+0.18; const d=out(this.ch.sfx,pan); tone(80,t,0.2,{to:40,vol:0.3,dest:d}); noise(t,0.25,{f:500,fTo:250,q:0.6,vol:0.12,dest:d}); };
S.post=function(v,pan){ if(!this.ensure()||!gap('post',220)) return; const t=this.now(); const d=out(this.ch.sfx,pan); const p=clamp(v??0.7,0.2,1);
  /* the clang of a ball on an aluminium frame: two inharmonic partials ringing out over a dull thud */
  for(const [f,vv,dd] of [[1180,0.16,0.7],[1730,0.1,0.5],[2650,0.05,0.35],[620,0.08,0.4]]) tone(f,t,dd,{vol:vv*p,dest:d,a:0.002});
  tone(140,t,0.12,{to:60,vol:0.35*p,dest:d}); noise(t,0.04,{f:2200,q:0.8,vol:0.2*p,dest:d,white:true}); this.ooh(0.9); };
S.hush=function(on){ const c=this.crowd; if(!c||!this.ctx) return; c.hush=!!on; const t=this.ctx.currentTime; c.g.gain.setTargetAtTime(on?Math.min(0.16,c.lvl||0.42):(c.lvl||0.42),t,on?0.35:0.12); };
/* ---------- the crowd ---------- */
S.crowdStart=function(){ if(!this.ensure()||this.crowd) return; const ctx=this.ctx; const g=ctx.createGain(); g.gain.value=0.0001; g.gain.setTargetAtTime(0.42,ctx.currentTime,0.6); g.connect(this.ch.crowd);
  const layers=[[520,0.6,0.55],[1350,0.9,0.28],[240,0.8,0.25]].map(([f,q,v])=>{ const s=this.src(); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q; const lg=ctx.createGain(); lg.gain.value=v; s.connect(bp); bp.connect(lg); lg.connect(g); s.start(0,Math.random()); return {s,bp,f}; });
  const lfo=ctx.createOscillator(); lfo.frequency.value=0.11; const lfg=ctx.createGain(); lfg.gain.value=0.07; lfo.connect(lfg); lfg.connect(g.gain); lfo.start();
  this.crowd={g,layers,lfo,lvl:0.42}; this.crowdT=setInterval(()=>{ if(!this.crowd||!this.ctx) return; if(Math.random()<0.35) this.shout(); },900); };
S.crowdStop=function(){ clearInterval(this.crowdT); if(!this.crowd) return; const c=this.crowd; this.crowd=null; try{ c.g.gain.setTargetAtTime(0.0001,this.ctx.currentTime,0.25); setTimeout(()=>{ try{ c.layers.forEach(l=>l.s.stop()); c.lfo.stop(); }catch(e){} },1200); }catch(e){} };
/* excitement 0..1: the stadium leans forward as an attack gets near goal */
S.crowdExcite=function(x){ const c=this.crowd; if(!c||!this.ctx||c.hush) return; const lv=0.42+clamp(x,0,1)*0.5; if(Math.abs(lv-c.lvl)<0.02) return; c.lvl=lv; const t=this.ctx.currentTime; c.g.gain.setTargetAtTime(lv,t,0.5); c.layers.forEach(l=>l.bp.frequency.setTargetAtTime(l.f*(1+clamp(x,0,1)*0.35),t,0.5)); };
S.shout=function(){ if(!this.ctx||!this.crowd) return; const t=this.now(); const f=180+Math.random()*220; const d=out(this.ch.crowd,(Math.random()*2-1)*0.7);
  tone(f,t,0.35+Math.random()*0.3,{type:'sawtooth',lp:900+Math.random()*500,vol:0.012+Math.random()*0.016,to:f*(0.85+Math.random()*0.3),glide:0.4,a:0.04,dest:d}); };
function vowel(t,dur,o){ // a crowd vowel: noise through two formant filters, pitched by a buzz
  const ctx=S.ctx; const dest=o.dest||S.ch.crowd; const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(o.vol,t+o.rise); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); g.connect(dest);
  for(const [F,q,v] of o.formants){ const s=S.src(); const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.setValueAtTime(F,t); if(o.fall) bp.frequency.exponentialRampToValueAtTime(F*o.fall,t+dur); bp.Q.value=q; const lg=ctx.createGain(); lg.gain.value=v; s.connect(bp); bp.connect(lg); lg.connect(g); s.start(t,Math.random()); s.stop(t+dur+0.1); } }
S.ooh=function(k){ if(!this.ensure()) return; vowel(this.now(),1.6,{vol:0.55*(k??1),rise:0.25,formants:[[320,4,1],[820,5,0.6]],fall:0.8}); };
S.boo=function(){ if(!this.ensure()) return; vowel(this.now(),1.8,{vol:0.45,rise:0.35,formants:[[260,5,1],[620,5,0.5]],fall:0.9}); };
S.applause=function(k,dur){ if(!this.ensure()) return; const ctx=this.ctx, t=this.now(); const s=ctx.createBufferSource(); s.buffer=this.clapBuf; s.loop=true; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2100; bp.Q.value=0.5; const g=ctx.createGain(); const v=0.5*(k??1), D=dur||2.4;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+0.25); g.gain.setTargetAtTime(0.0001,t+D*0.6,D*0.2); s.connect(bp); bp.connect(g); g.connect(this.ch.crowd); s.start(t); s.stop(t+D+0.8); };
S.save=function(){ this.applause(0.7,2.2); this.ooh(0.4); };
S.miss=function(){ this.ooh(1); };
/* ---------- the big moment ---------- */
S.goal=function(){ if(!this.ensure()) return; const t=this.now();
  for(const [f,q,v] of [[900,0.7,1],[1900,0.9,0.5],[420,0.8,0.5]]){ const s=this.src(); const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q; const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+0.3); g.gain.exponentialRampToValueAtTime(0.001,t+4.2); s.connect(bp); bp.connect(g); g.connect(this.ch.goal); s.start(t); s.stop(t+4.3); }
  this.horn(t+0.15); this.sting(t+0.05); this.applause(0.9,4); this.chant(t+1.6); };
S.horn=function(t){ if(!this.ensure()) return; t=t??this.now(); for(const [f,v] of [[369.99,0.11],[466.16,0.09],[554.37,0.06]]) tone(f,t,0.95,{type:'sawtooth',lp:2200,vol:v,a:0.02,sus:0.9,dec:0.1,r:0.25,to:f*0.97,glide:0.9,dest:this.ch.goal}); };
S.sting=function(t){ if(!this.ensure()) return; t=t??this.now(); [[72,0],[76,0.09],[79,0.18],[84,0.3]].forEach(([n,o],i)=>tone(midi(n),t+o,i===3?0.7:0.16,{type:'square',lp:3200,vol:0.07,a:0.004,dest:this.ch.goal})); };
S.chant=function(t0){ if(!this.ensure()) return; t0=t0||this.now(); const pat=[0,.42,.84,1.05,1.26]; for(let rep=0;rep<2;rep++) for(const o of pat){ const t=t0+rep*1.9+o; noise(t,0.09,{ft:'highpass',f:1300,q:0.7,vol:0.45,dest:this.ch.goal}); } };
S.whistle=function(kind){ if(!this.ensure()) return; const t0=this.now(); const blasts= kind==='ft'?[[0,.35],[.45,.35],[.9,.9]] : kind==='ht'?[[0,.3],[.4,.7]] : kind==='card'?[[0,.45]] : kind==='pen'?[[0,.26]] : [[0,.6]];
  for(const [o,d] of blasts){ const t=t0+o; const os=this.ctx.createOscillator(); os.type='sine'; os.frequency.value=2900; const lfo=this.ctx.createOscillator(); lfo.type='square'; lfo.frequency.value=38; const lg=this.ctx.createGain(); lg.gain.value=120; lfo.connect(lg); lg.connect(os.frequency);
    const g=this.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.3,t+0.02); g.gain.setValueAtTime(0.3,t+d-0.05); g.gain.linearRampToValueAtTime(0.0001,t+d); os.connect(g); g.connect(this.ch.whistle); os.start(t); lfo.start(t); os.stop(t+d+0.05); lfo.stop(t+d+0.05);
    noise(t,d,{f:3000,q:2,vol:0.03,dest:this.ch.whistle}); }
  if(kind==='card') setTimeout(()=>this.boo(),350); };
/* full-time jingle for your result, and the trophy fanfare */
S.result=function(r){ if(!this.ensure()) return; const t=this.now()+1.5; const seq= r==='win'? [[72,0,.14],[76,.14,.14],[79,.28,.14],[84,.42,.5],[83,.42,.5],[88,.62,.6]] : r==='draw'? [[72,0,.2],[74,.2,.2],[72,.4,.45]] : [[67,0,.28],[66,.3,.28],[65,.6,.28],[64,.9,.8]];
  for(const [n,o,d] of seq) tone(midi(n),t+o,d,{type:r==='loss'?'triangle':'square',lp:r==='loss'?1400:3000,vol:r==='loss'?0.12:0.07,vib:r==='loss'&&o>0.8?5:0,vibD:30,dest:this.ch.goal}); };
S.fanfare=function(){ if(!this.ensure()) return; const t=this.now()+0.05; const brass=(n,o,d,v)=>{ tone(midi(n),t+o,d,{type:'sawtooth',lp:2600,vol:v||0.06,a:0.015,sus:0.85,dec:0.1,dest:this.ch.goal}); tone(midi(n-12),t+o,d,{type:'triangle',vol:(v||0.06)*0.8,a:0.015,sus:0.85,dec:0.1,dest:this.ch.goal}); };
  [[67,0,.18],[67,.2,.12],[67,.34,.12],[72,.48,.6],[76,.48,.6],[79,.48,.6],[74,1.12,.18],[77,1.3,.18],[84,1.5,1.1],[79,1.5,1.1],[76,1.5,1.1]].forEach(([n,o,d])=>brass(n,o,d)); this.applause(0.8,4); };
S.unlock=function(){ if(!this.ensure()) return; const t=this.now(); [84,88,91,96].forEach((n,i)=>tone(midi(n),t+i*0.06,0.35,{type:'triangle',vol:0.08,dest:this.ch.ui})); tone(midi(103),t+0.26,0.6,{vol:0.03,vib:7,vibD:15,dest:this.ch.ui}); };
/* ---------- interface ---------- */
S.ui=function(kind){ if(!this.ensure()) return; const t=this.now(), d=this.ch.ui;
  switch(kind){
    case 'click': tone(1250,t,0.045,{to:900,vol:0.09,dest:d}); noise(t,0.015,{f:4000,q:1,vol:0.03,dest:d,white:true}); break;
    case 'nav': tone(520,t,0.09,{to:780,glide:0.07,vol:0.08,dest:d,type:'triangle'}); break;
    case 'open': tone(midi(79),t,0.12,{vol:0.07,type:'triangle',dest:d}); tone(midi(84),t+0.06,0.16,{vol:0.07,type:'triangle',dest:d}); break;
    case 'close': tone(midi(84),t,0.1,{vol:0.06,type:'triangle',dest:d}); tone(midi(77),t+0.05,0.14,{vol:0.06,type:'triangle',dest:d}); break;
    case 'on': tone(midi(76),t,0.07,{vol:0.07,dest:d}); tone(midi(83),t+0.05,0.1,{vol:0.07,dest:d}); break;
    case 'off': tone(midi(83),t,0.07,{vol:0.07,dest:d}); tone(midi(76),t+0.05,0.1,{vol:0.07,dest:d}); break;
    case 'success': [72,76,79,84].forEach((n,i)=>tone(midi(n),t+i*0.055,0.22,{type:'triangle',vol:0.07,dest:d})); break;
    case 'error': tone(150,t,0.16,{type:'square',lp:900,vol:0.06,dest:d}); tone(140,t+0.09,0.16,{type:'square',lp:900,vol:0.06,dest:d}); break;
    case 'pop': tone(600,t,0.08,{to:1300,glide:0.05,vol:0.07,dest:d}); break;
    case 'tick': tone(1800,t,0.025,{vol:0.03,dest:d}); break;
    case 'swoosh': noise(t,0.25,{f:800,fTo:3000,q:0.8,vol:0.07,dest:d,white:true}); break;
  } };
/* ---------- music: a tiny sequencer with two tracks ---------- */
// chord roots and triads (MIDI) for the 16-bar loop: A section then B section
const PROG=[[48,[60,64,67]],[45,[57,60,64]],[41,[57,60,65]],[43,[59,62,67]],[48,[60,64,67]],[45,[57,60,64]],[41,[57,60,65]],[48,[60,64,67]],
            [41,[57,60,65]],[43,[59,62,67]],[40,[59,64,67]],[45,[57,60,64]],[41,[57,60,65]],[43,[59,62,67]],[48,[60,64,67]],[48,[60,64,67]]];
// lead melody: per bar, [eighth, note, length in eighths]
const MEL=[[[0,72,1],[1,76,1],[2,79,2],[4,76,1],[5,79,1],[6,81,2]],[[0,79,2],[2,76,1],[3,72,1],[4,74,2],[6,76,2]],[[0,77,1],[1,76,1],[2,74,1],[3,72,1],[4,74,3]],[[0,71,2],[2,74,2],[4,79,4]],
  [[0,72,1],[1,76,1],[2,79,2],[4,76,1],[5,79,1],[6,81,2]],[[0,79,1],[1,81,1],[2,79,1],[3,76,1],[4,72,2],[6,76,2]],[[0,77,2],[2,76,2],[4,74,2],[6,71,2]],[[0,72,6]],
  [[0,81,1],[1,81,1],[2,81,1],[3,79,1],[4,77,2],[6,76,2]],[[0,74,1],[1,74,1],[2,74,1],[3,76,1],[4,79,4]],[[0,79,1],[1,79,1],[2,79,1],[3,77,1],[4,76,2],[6,74,2]],[[0,72,2],[2,76,2],[4,81,4]],
  [[0,84,2],[2,81,2],[4,77,2],[6,81,2]],[[0,83,2],[2,79,2],[4,74,2],[6,79,2]],[[0,84,1],[1,83,1],[2,81,1],[3,79,1],[4,76,2],[6,74,2]],[[0,72,2]]];
const TRACKS={ menu:{bpm:118,swing:0.14,lead:1,drums:1,bass:1,stabs:1,pad:0.4},
               office:{bpm:96,swing:0.2,lead:0.45,drums:0.55,bass:0.8,stabs:0.7,pad:1,leadOct:-12,soft:true} };
S.musicStart=function(which){ which=which||(App.C?'office':'menu'); if(!this.ensure()) return; if(this.music&&this.music.which===which) return; this.musicStop(true);
  const ctx=this.ctx, T=TRACKS[which]; const bus=ctx.createGain(); bus.gain.value=0.0001; bus.gain.setTargetAtTime(T.soft?1.7:2.1,ctx.currentTime,0.6); bus.connect(this.ch.music);
  const e8=60/T.bpm/2; let step=0, next=ctx.currentTime+0.12; const M=this.music={which,bus,id:0};
  const hat=(t,v)=>noise(t,0.035,{ft:'highpass',f:7000,q:0.7,vol:v,dest:bus,white:true});
  const kickD=(t,v)=>tone(140,t,0.2,{to:42,glide:0.16,vol:v,dest:bus});
  const snare=(t,v)=>{ noise(t,0.16,{f:1900,q:0.6,vol:v,dest:bus,white:true}); tone(220,t,0.08,{to:150,vol:v*0.6,dest:bus,type:'triangle'}); };
  const pluck=(n,t,v,dur)=>{ tone(midi(n),t,dur||0.22,{type:'triangle',vol:v,dest:bus}); tone(midi(n+12),t,0.08,{vol:v*0.35,dest:bus}); };
  const tick=()=>{ if(this.music!==M) return; while(next<ctx.currentTime+0.18){ const bar=Math.floor(step/8)%16, e=step%8, loop=Math.floor(step/128); const t=next+(e%2?e8*T.swing:0);
      const [root,tri]=PROG[bar]; const fillBar=bar===7||bar===15;
      // drums
      if(T.drums){ const dv=T.drums; if(e===0||e===4||(e===5&&bar%2===1&&!T.soft)) kickD(t,0.34*dv); if(e===2||e===6){ if(T.soft) noise(t,0.05,{f:2600,q:2,vol:0.05*dv,dest:bus,white:true}); else snare(t,0.13*dv); }
        hat(t,(e%2?0.025:0.04)*dv); if(fillBar&&e>=5&&!T.soft) snare(t+e8*0.5,0.08*dv); }
      // bass: root, octave bounce, fifth, walk-up into the next chord
      if(T.bass){ const nb=PROG[(bar+1)%16][0]; const pat=[root,null,root+12,null,root+7,null,root,nb>root?nb-1:nb+1][e]; if(pat!=null) tone(midi(pat),t,e8*1.6,{type:'triangle',lp:900,vol:0.16*T.bass,dest:bus}); }
      // off-beat chord stabs, marimba-like
      if(T.stabs&&(e===1||e===3||e===5||e===7)) tri.forEach(n=>pluck(n,t,0.028*T.stabs,0.18));
      // warm pad on the downbeat
      if(T.pad&&e===0) tri.forEach(n=>tone(midi(n-12),t,e8*7.6,{type:'sawtooth',lp:1100,vol:0.018*T.pad,a:0.25,sus:0.8,dec:0.4,r:0.5,dest:bus}));
      // lead (every other pass of the loop adds a sparkle arpeggio instead in the A section)
      if(T.lead){ const arp=loop%2===1&&bar<8; if(arp){ if(e%2===0) pluck(tri[(e/2)%3]+12,t,0.03*T.lead,0.2); }
        else for(const [o,n,len] of MEL[bar]) if(o===e) tone(midi(n+(T.leadOct||0)),t,e8*len*0.92,{type:T.soft?'triangle':'square',lp:T.soft?1800:2600,vol:(T.soft?0.06:0.045)*T.lead,a:0.008,sus:0.7,dec:0.08,r:0.08,vib:5.5,vibD:9,dest:bus}); }
      next+=e8; step++; } };
  M.id=setInterval(tick,30); tick(); };
S.musicStop=function(fast){ const M=this.music; if(!M) return; this.music=null; clearInterval(M.id); try{ M.bus.gain.setTargetAtTime(0.0001,this.ctx.currentTime,fast?0.08:0.4); setTimeout(()=>{ try{ M.bus.disconnect(); }catch(e){} },fast?600:2000); }catch(e){} };
S.syncMenu=function(){ if(!PREFS.sound.on){ this.musicStop(); this.crowdStop(); return; } if(!this.ensure()) return; if(App.live){ this.musicStop(); } else this.musicStart(App.C?'office':'menu'); };
/* the first gesture unlocks audio (browsers block it before then) */
const unlock=()=>{ if(S.gestured) return; S.gestured=true; if(PREFS.sound.on){ S.ensure(); S.syncMenu(); } };
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,unlock,{capture:true,passive:true}));
})();
