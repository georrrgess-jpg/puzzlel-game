'use strict';
/* ====================== audio engine ======================
   Everything is synthesized with Web Audio, so there are no asset files.
   sfx bus ──────────────┐
   music (js/music.js) ──┴─> master -> glue compressor -> soft clipper -> speakers
   Sound effects play in the key of the song that is on (AU.key, set by js/music.js), so a combo's rising notes, a
   chime or a win fanfare always sit in tune with the music under them. */
const AU={ctx:null,key:5};
function impulse(c,sec,decay){
  const len=c.sampleRate*sec,b=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;for(let i=0;i<len;i++){lp+=((Math.random()*2-1)-lp)*(.35+.5*i/len);d[i]=lp*1.8*Math.pow(1-i/len,decay)}}
  return b;
}
/* a gentle tanh curve on the very end: loud moments round off instead of clipping harshly */
function softClip(c){const w=c.createWaveShaper(),n=2048,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cv[i]=Math.tanh(x*1.15)/Math.tanh(1.15)}w.curve=cv;w.oversample='2x';return w}
function audio(){
  if(!AU.ctx){
    try{
      const c=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=12;comp.ratio.value=3.5;comp.attack.value=.005;comp.release.value=.2;
      const clip=softClip(c);
      AU.master=c.createGain();AU.master.gain.value=.9;AU.master.connect(comp);comp.connect(clip);clip.connect(c.destination);
      AU.sfx=c.createGain();AU.sfx.connect(AU.master);
      AU.musVol=c.createGain();AU.musVol.connect(AU.master);AU.musIn=AU.musVol;
      AU.verb=c.createConvolver();AU.verb.buffer=impulse(c,1.8,3);
      const vg=c.createGain();vg.gain.value=.3;AU.verb.connect(vg);vg.connect(AU.master);
      const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      applyVolumes();
    }catch(e){AU.ctx=null}
  }
  if(AU.ctx&&(AU.ctx.state==='suspended'||AU.ctx.state==='interrupted')){const p=AU.ctx.resume();if(p&&p.catch)p.catch(()=>{})}   // iOS reports 'interrupted' after a call or app switch
  return AU.ctx;
}
function applyVolumes(){
  if(!AU.ctx)return;const t=AU.ctx.currentTime;
  AU.sfx.gain.setTargetAtTime(S.sfx?S.sfxVol:0,t,.05);
  AU.musVol.gain.setTargetAtTime(S.music?S.musVol*.5:0,t,.3);
}
const now=()=>AU.ctx?AU.ctx.currentTime:0;
const mtof=n=>440*Math.pow(2,(n-69)/12);
/* a note number in the key of the current song (written in C) */
const kn=n=>n+(AU.key||0);
const kf=n=>mtof(kn(n));
/* one oscillator voice: o={f,t,dur,type,vol,a,rel(pad env),slide,slideT,lp,q,verb,bus,detune,pan,fm,fmi,fmd}
   fm: a sine modulator at f*fm whose depth (fmi, in multiples of f) dies away over fmd seconds: bells, mallets, bloops */
function voice(o){
  const c=AU.ctx;if(!c)return;
  const t=o.t!=null?o.t:c.currentTime,d=o.dur||.2,v=o.vol||.2,a=o.a||.005;
  const osc=c.createOscillator(),g=c.createGain();
  osc.type=o.type||'sine';osc.frequency.setValueAtTime(o.f,t);
  if(o.slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f*o.slide),t+(o.slideT||d));
  if(o.detune)osc.detune.value=o.detune;
  let mod=null;
  if(o.fm){mod=c.createOscillator();const mg=c.createGain();mod.frequency.setValueAtTime(o.f*o.fm,t);if(o.slide)mod.frequency.exponentialRampToValueAtTime(Math.max(20,o.f*o.fm*o.slide),t+(o.slideT||d));
    mg.gain.setValueAtTime(o.f*(o.fmi||1),t);mg.gain.setTargetAtTime(0,t,o.fmd||.08);mod.connect(mg);mg.connect(osc.frequency)}
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+a);
  if(o.rel){g.gain.setValueAtTime(v,Math.max(t+a,t+d-o.rel));g.gain.linearRampToValueAtTime(.0001,t+d)}
  else g.gain.exponentialRampToValueAtTime(.0001,t+d);
  let n=osc;
  if(o.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;f.Q.value=o.q||.7;n.connect(f);n=f}
  n.connect(g);let out=g;
  if(o.pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=o.pan;g.connect(p);out=p}
  out.connect(o.bus||AU.sfx);
  if(o.verb&&Q.sfxVerb){const s=c.createGain();s.gain.value=o.verb;out.connect(s);s.connect(AU.verb)}
  osc.start(t);osc.stop(t+d+.05);if(mod){mod.start(t);mod.stop(t+d+.05)}
}
/* filtered noise burst: o={t,dur,vol,type,f,f2,q,bus,verb,a,pan,pan2} (pan2: the sound travels across while it plays) */
function noise(o){
  const c=AU.ctx;if(!c)return;
  const t=o.t!=null?o.t:c.currentTime,d=o.dur||.1;
  const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const f=c.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);f.Q.value=o.q||1;
  if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+d);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(o.vol||.1,t+(o.a||.004));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f);f.connect(g);let out=g;
  if((o.pan||o.pan2)&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.setValueAtTime(o.pan||0,t);if(o.pan2!=null)p.pan.linearRampToValueAtTime(o.pan2,t+d);g.connect(p);out=p}
  out.connect(o.bus||AU.sfx);
  if(o.verb&&Q.sfxVerb){const r=c.createGain();r.gain.value=o.verb;out.connect(r);r.connect(AU.verb)}
  s.start(t,Math.random()*.5);s.stop(t+d+.05);
}
const PENT=[0,2,4,7,9];
const pent=(i,base=60)=>mtof(base+(AU.key||0)+PENT[((i%5)+5)%5]+12*Math.floor(i/5));
/* glockenspiel: a pure tone with the bar's two inharmonic overtones */
function bell(f,vol,dur,dt=0,pan=0){const t=now()+dt;voice({f,dur,vol,t,verb:.4,pan});voice({f:f*2.76,dur:dur*.45,vol:vol*.3,t,verb:.3,pan});voice({f:f*5.4,dur:dur*.18,vol:vol*.11,t,pan})}
/* marimba: a wooden bar (fundamental, the 4th partial, a mallet knock) */
function marimba(f,vol=.26,dt=0,bus,pan=0){const t=now()+dt;voice({f,dur:.6,vol,t,verb:.28,bus,pan});voice({f:f*3.98,dur:.08,vol:vol*.24,t,bus,pan});voice({f:f*9.8,dur:.025,vol:vol*.07,t,bus,pan})}
/* a soft FM chime (ratio 3.5: glassy), for confirmations */
function chime(n,vol,dt=0,dur=.9,pan=0){const t=now()+dt,f=mtof(n);voice({f,dur,vol,t,fm:3.5,fmi:1.6,fmd:.12,verb:.35,pan});voice({f:f*2,dur:dur*.4,vol:vol*.18,t,pan})}
const ok=()=>S.sfx&&audio();
const sfx={
  /* ---- interface ---- */
  /* a button: a soft wooden tock */
  click(){if(!ok())return;voice({f:kf(84),dur:.05,vol:.06,slide:.8,slideT:.03,fm:2,fmi:.5,fmd:.01});noise({dur:.016,vol:.05,type:'bandpass',f:2700,q:1.4})},
  tick(p=1){if(!ok())return;voice({f:1450*p,dur:.026,type:'triangle',vol:.05});voice({f:720*p,dur:.045,vol:.07,slide:.75})},
  /* a bubble: a quick upward bloop */
  pop(p=1){if(!ok())return;voice({f:360*p,dur:.1,vol:.15,slide:2.5,slideT:.045,fm:1,fmi:.7,fmd:.025});noise({dur:.012,vol:.03,type:'highpass',f:5200})},
  swish(){if(!ok())return;noise({dur:.15,vol:.1,type:'bandpass',f:900,f2:3600,q:1.3,pan:-.4,pan2:.4});voice({f:kf(79),dur:.07,type:'triangle',vol:.04,slide:1.5})},
  whoosh(){if(!ok())return;noise({dur:.3,vol:.085,type:'bandpass',f:320,f2:2600,q:.9,pan:-.5,pan2:.5,a:.06});noise({dur:.22,vol:.03,type:'highpass',f:5000,f2:9000,a:.08})},
  /* ---- feedback ---- */
  good(){if(!ok())return;chime(kn(79),.12);chime(kn(84),.1,.075)},
  /* "not that one": two soft, falling wooden notes, never a buzzer */
  bad(){if(!ok())return;const t=now();voice({f:kf(55),dur:.15,type:'triangle',vol:.12,slide:.85,lp:1000,t});voice({f:kf(54),dur:.2,type:'triangle',vol:.1,slide:.8,lp:850,t:t+.085});noise({dur:.05,vol:.04,type:'lowpass',f:500,t})},
  bonk(){if(!ok())return;voice({f:150,dur:.13,type:'triangle',vol:.14,slide:.62,lp:900});noise({dur:.04,vol:.05,type:'lowpass',f:420})},
  /* a combo climbs the scale: every good move in a row is one note higher */
  combo(k){if(!ok())return;const i=Math.min(k,16)+3;marimba(pent(i,60),.17);if(k>=3)bell(pent(i+5,60),.035+Math.min(k,8)*.004,.5,.03)},
  /* ---- rewards ---- */
  coin(){if(!ok())return;const t=now();voice({f:kf(83),dur:.07,type:'triangle',vol:.085,t});voice({f:kf(88),dur:.42,type:'triangle',vol:.085,t:t+.065,verb:.25});
    voice({f:kf(100),dur:.28,vol:.022,t:t+.065,verb:.4});noise({t:t+.06,dur:.14,vol:.018,type:'highpass',f:9000})},
  star(i){if(!ok())return;const n=kn([76,79,84][i]||84),t=now();
    voice({f:kf(48),dur:.22,vol:.12,slide:.6,slideT:.12,t});bell(mtof(n),.15,1.4,0,(i-1)*.3);bell(mtof(n+12),.06,.9,.03,(i-1)*.3);
    noise({dur:.55,vol:.045,type:'highpass',f:7500,verb:.5,t:t+.01})},
  /* the level is won: a rising mallet run, a warm chord swelling under it, bells and sparkle on top */
  win(){if(!ok())return;Music.duck(2.6);const t=now();
    voice({f:kf(36),dur:.5,vol:.2,slide:.5,slideT:.2,t});
    [60,64,67,72,76,79,84].forEach((n,i)=>marimba(kf(n),.15,i*.055,undefined,(i/6-.5)*.6));
    [60,64,67,72,76].forEach((n,i)=>voice({f:kf(n),dur:1.7,type:'sawtooth',vol:.026,t:t+.38,a:.08,rel:.9,lp:2200,verb:.45,detune:i%2?6:-6}));
    bell(kf(88),.1,1.4,.42,-.3);bell(kf(91),.09,1.4,.5,.3);
    noise({t:t+.4,dur:1.3,vol:.05,type:'highpass',f:8000,verb:.6})},
  levelup(){if(!ok())return;Music.duck(2.6);const t=now();
    [60,64,67,72,64,67,72,76,67,72,76,84].forEach((n,i)=>voice({f:kf(n),dur:.28,type:'triangle',vol:.075,t:t+i*.055,fm:2,fmi:.5,fmd:.05,verb:.3,pan:(i%4/3-.5)*.5}));
    bell(kf(84),.18,1.6,.7);bell(kf(91),.06,1.2,.74);noise({t:t+.66,dur:.9,vol:.04,type:'highpass',f:8000,verb:.5})},
  /* a chest: a wooden thump and creak, then the treasure glitters */
  chest(){if(!ok())return;const t=now();noise({dur:.35,vol:.16,type:'lowpass',f:320,f2:110,t});voice({f:95,dur:.25,vol:.18,slide:.6,t});
    noise({t:t+.05,dur:.22,vol:.04,type:'bandpass',f:900,f2:420,q:7});[76,79,84,88,91].forEach((n,i)=>bell(kf(n),.085,.6,.22+i*.06,(i/4-.5)*.6))},
  unlock(){if(!ok())return;[72,76,79,84].forEach((n,i)=>marimba(kf(n),.16,i*.075));bell(kf(91),.11,1,.33)},
  fail(){if(!ok())return;const t=now();[67,64,62,60].forEach((n,i)=>voice({f:kf(n),dur:.42,type:'triangle',vol:.1,t:t+i*.18,lp:1600,verb:.25}));voice({f:kf(36),dur:.6,vol:.12,t:t+.55,lp:300})},
  done(){if(!ok())return;[84,88,91,96].forEach((n,i)=>bell(kf(n),.07,.55,i*.05,(i/3-.5)*.5))},
  sparkle(){if(!ok())return;[88,91,95,100].forEach((n,i)=>bell(kf(n),.045,.5,i*.045,(i/3-.5)*.6))},
  wheel(){if(!ok())return;noise({dur:.016,vol:.07,type:'highpass',f:2600});voice({f:1500,dur:.025,type:'triangle',vol:.04})},
  /* ---- pieces in the hand ---- */
  /* a piece is set down: a short, woody thock with a hint of a note */
  tok(){if(!ok())return;voice({f:kf(43),dur:.11,vol:.15,slide:.62,slideT:.05});noise({dur:.028,vol:.06,type:'bandpass',f:1300,q:2.2});voice({f:kf(79),dur:.09,vol:.03,fm:3.98,fmi:.3,fmd:.02})},
  lift(){if(!ok())return;voice({f:kf(76),dur:.07,type:'triangle',vol:.1,slide:1.3,slideT:.05})},
  pad(i){if(!ok())return;marimba(pent(i+5,60))}
};
let hapticsOK=true;
const buzz=ms=>{try{if(S.haptics&&navigator.vibrate)navigator.vibrate(ms)}catch(e){}};
document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;if(document.hidden)AU.ctx.suspend();else AU.ctx.resume()});

/* ---------- sounds of the modes ---------- */
sfx.bloom=i=>{if(!ok())return;marimba(pent(i*2+4,60),.24);bell(pent(i*2+9,60),.09,.7,.05)};
/* a thread of Star Threads: a plucked string, one scale step higher each time */
sfx.pluck=i=>{if(!ok())return;const f=pent((i||0)%10+7,60);voice({f,dur:.9,type:'triangle',vol:.14,verb:.45,fm:2,fmi:.4,fmd:.06});voice({f:f*2,dur:.25,vol:.045,verb:.3})};
/* a line of Block Garden blooms: a bright upward arpeggio per line, a shimmer on top, a soft whoosh under it */
sfx.lineBloom=(n,combo=0)=>{if(!ok())return;const t0=now(),b=Math.min(4,combo)*2;
  for(let k=0;k<5+Math.min(3,n)*2;k++)marimba(pent(k+3+b,60),.16,k*.045,undefined,(k%5/4-.5)*.6);
  [0,1,2].forEach(k=>bell(pent(10+b+k*2,60),.055,.9,.22+k*.06));
  noise({t:t0,dur:.45,vol:.055,type:'bandpass',f:1800,f2:5200,q:.7,verb:.35,pan:-.4,pan2:.4})};
/* two plants merge: a rising chime, brighter the higher the stage */
sfx.grow=v=>{if(!ok())return;const t0=now();voice({f:pent(v*2+2,60),t:t0,dur:.16,type:'triangle',vol:.11,slide:1.5,slideT:.12});
  marimba(pent(v*2+5,60),.22,.07);bell(pent(v*2+10,60),.075+v*.01,.8,.12);if(v>=4)bell(pent(v*2+12,60),.055,1,.2);
  noise({t:t0+.02,dur:.16,vol:.03,type:'highpass',f:5000,verb:.3})};
sfx.clear=n=>{if(!ok())return;for(let k=0;k<Math.min(4,n+1);k++)marimba(pent(k*2+5,60),.18,k*.07);noise({dur:.18,vol:.045,type:'highpass',f:6000,verb:.3})};
/* sand pouring: a soft hiss that falls in pitch, plus a few quiet grain ticks */
sfx.sand=n=>{if(!ok())return;const t=now();
  noise({t,dur:.3+n*.1,vol:.09,type:'bandpass',f:3400,f2:1700,q:.8,verb:.08});
  noise({t:t+.06,dur:.22+n*.08,vol:.04,type:'highpass',f:6800});
  for(let k=0;k<2+n;k++)noise({t:t+.28+k*.05,dur:.025,vol:.055,type:'bandpass',f:900+Math.random()*800,q:3,pan:(Math.random()-.5)*.5})};
