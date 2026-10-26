'use strict';
/* ====================== audio engine ======================
   Everything is synthesized with Web Audio, so there are no asset files.
   master -> compressor -> out
   sfx bus, music bus (lowpass "mood" filter -> duck gain -> music volume), shared reverb send */
const AU={ctx:null};
function impulse(c,sec,decay){
  const len=c.sampleRate*sec,b=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay)}
  return b;
}
function audio(){
  if(!AU.ctx){
    try{
      const c=new(window.AudioContext||window.webkitAudioContext)();AU.ctx=c;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.22;
      AU.master=c.createGain();AU.master.gain.value=.95;AU.master.connect(comp);comp.connect(c.destination);
      AU.sfx=c.createGain();AU.sfx.connect(AU.master);
      AU.musVol=c.createGain();AU.musVol.connect(AU.master);
      AU.duck=c.createGain();AU.duck.connect(AU.musVol);
      AU.mus=c.createBiquadFilter();AU.mus.type='lowpass';AU.mus.frequency.value=16000;AU.mus.Q.value=.5;AU.mus.connect(AU.duck);
      AU.verb=c.createConvolver();AU.verb.buffer=impulse(c,2.6,3);
      const vg=c.createGain();vg.gain.value=.35;AU.verb.connect(vg);vg.connect(AU.master);
      const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
      applyVolumes();
    }catch(e){AU.ctx=null}
  }
  if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
  return AU.ctx;
}
function applyVolumes(){
  if(!AU.ctx)return;const t=AU.ctx.currentTime;
  AU.sfx.gain.setTargetAtTime(S.sfx?S.sfxVol:0,t,.05);
  AU.musVol.gain.setTargetAtTime(S.music?S.musVol*.55:0,t,.3);
}
const now=()=>AU.ctx?AU.ctx.currentTime:0;
const mtof=n=>440*Math.pow(2,(n-69)/12);
/* one oscillator voice: o={f,t,dur,type,vol,a,rel(pad env),slide,slideT,lp,q,verb,bus,detune} */
function voice(o){
  const c=AU.ctx;if(!c)return;
  const t=o.t!=null?o.t:c.currentTime,d=o.dur||.2,v=o.vol||.2,a=o.a||.005;
  const osc=c.createOscillator(),g=c.createGain();
  osc.type=o.type||'sine';osc.frequency.setValueAtTime(o.f,t);
  if(o.slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f*o.slide),t+(o.slideT||d));
  if(o.detune)osc.detune.value=o.detune;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+a);
  if(o.rel){g.gain.setValueAtTime(v,Math.max(t+a,t+d-o.rel));g.gain.linearRampToValueAtTime(.0001,t+d)}
  else g.gain.exponentialRampToValueAtTime(.0001,t+d);
  let n=osc;
  if(o.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;f.Q.value=o.q||.7;n.connect(f);n=f}
  n.connect(g);g.connect(o.bus||AU.sfx);
  if(o.verb&&Q.sfxVerb){const s=c.createGain();s.gain.value=o.verb;g.connect(s);s.connect(AU.verb)}
  osc.start(t);osc.stop(t+d+.05);
}
/* filtered noise burst: o={t,dur,vol,type,f,f2,q,bus,verb} */
function noise(o){
  const c=AU.ctx;if(!c)return;
  const t=o.t!=null?o.t:c.currentTime,d=o.dur||.1;
  const s=c.createBufferSource();s.buffer=AU.noise;s.loop=true;
  const f=c.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);f.Q.value=o.q||1;
  if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+d);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(o.vol||.1,t+(o.a||.004));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f);f.connect(g);g.connect(o.bus||AU.sfx);
  if(o.verb&&Q.sfxVerb){const r=c.createGain();r.gain.value=o.verb;g.connect(r);r.connect(AU.verb)}
  s.start(t,Math.random()*.5);s.stop(t+d+.05);
}
const PENT=[0,2,4,7,9];
const pent=(i,base=60)=>mtof(base+PENT[((i%5)+5)%5]+12*Math.floor(i/5));
function bell(f,vol,dur,dt=0){const t=now()+dt;voice({f,dur,vol,t,verb:.4});voice({f:f*2.01,dur:dur*.55,vol:vol*.35,t,verb:.3});voice({f:f*3.03,dur:dur*.25,vol:vol*.14,t})}
function marimba(f,vol=.26,dt=0,bus){const t=now()+dt;voice({f,dur:.55,vol,t,verb:.3,bus});voice({f:f*4,dur:.06,vol:vol*.22,t,bus});voice({f:f*2,dur:.16,type:'triangle',vol:vol*.18,t,bus})}
const ok=()=>S.sfx&&audio();
const sfx={
  tick(p=1){if(!ok())return;voice({f:1250*p,dur:.045,type:'triangle',vol:.1});voice({f:640*p,dur:.07,vol:.12,slide:.6})},
  click(){if(!ok())return;noise({dur:.025,vol:.12,type:'highpass',f:3500});voice({f:880,dur:.05,type:'triangle',vol:.07})},
  flip(p=1){if(!ok())return;voice({f:300*p,dur:.15,vol:.22,slide:2.3,slideT:.07,verb:.15});noise({dur:.025,vol:.05,type:'highpass',f:5000})},
  ratchet(){if(!ok())return;const t=now();for(let i=0;i<3;i++)noise({t:t+i*.04,dur:.03,vol:.16,type:'bandpass',f:2200+i*500,q:5});voice({f:170,dur:.1,type:'triangle',vol:.12,t:t+.08,slide:.8})},
  swish(){if(!ok())return;noise({dur:.16,vol:.13,type:'bandpass',f:700,f2:3200,q:1.4});voice({f:520,dur:.08,type:'triangle',vol:.06,slide:1.5})},
  pop(p=1){if(!ok())return;voice({f:700*p,dur:.1,vol:.16,slide:.45,verb:.1})},
  good(){if(!ok())return;bell(pent(10),.17,.6);bell(pent(12),.13,.7,.08)},
  bad(){if(!ok())return;voice({f:210,dur:.22,type:'square',vol:.07,slide:.6,lp:900});voice({f:105,dur:.26,vol:.2,slide:.7})},
  coin(){if(!ok())return;const t=now();voice({f:987.8,dur:.08,type:'square',vol:.05,lp:6000,t});voice({f:1318.5,dur:.32,type:'square',vol:.05,lp:6000,t:t+.07});voice({f:2637,dur:.35,vol:.04,t:t+.07,verb:.35})},
  star(i){if(!ok())return;const f=[659.3,830.6,987.8][i]||987.8;bell(f,.24,1.4);bell(f*1.5,.08,1,.03);noise({dur:.5,vol:.05,type:'highpass',f:7000,verb:.5})},
  win(){if(!ok())return;Music.duck(2.2);const t=now();
    [60,64,67,72,76,79,84].forEach((n,i)=>voice({f:mtof(n),dur:.45,type:'triangle',vol:.13,t:t+i*.07,verb:.3}));
    [60,64,67,72].forEach(n=>voice({f:mtof(n),dur:1.6,type:'sawtooth',vol:.035,t:t+.5,a:.05,rel:.8,lp:2500,verb:.4}));
    noise({t:t+.45,dur:1.2,vol:.06,type:'highpass',f:8000,verb:.6})},
  pad(i){if(!ok())return;marimba(pent(i+5,60))},
  pour(n=1){if(!ok())return;const t=now();noise({t,dur:.25+n*.08,vol:.12,type:'bandpass',f:500,f2:1400,q:2.5});
    for(let k=0;k<n+2;k++)voice({f:280+k*90+Math.random()*60,dur:.09,vol:.12,t:t+k*.06,slide:1.9,slideT:.05,verb:.1})},
  done(){if(!ok())return;[84,88,91,96].forEach((n,i)=>bell(mtof(n),.08,.5,i*.05))},
  combo(k){if(!ok())return;bell(pent(Math.min(k,16)+3,60),.13,.55)},
  levelup(){if(!ok())return;Music.duck(2.5);const t=now();[60,64,67,72,64,67,72,76,67,72,76,84].forEach((n,i)=>voice({f:mtof(n),dur:.3,type:'square',vol:.045,t:t+i*.06,lp:4000,verb:.3}));bell(mtof(84),.2,1.6,.75)},
  chest(){if(!ok())return;noise({dur:.4,vol:.18,type:'lowpass',f:300,f2:120});[76,79,84,88,91].forEach((n,i)=>bell(mtof(n),.1,.6,.25+i*.06))},
  wheel(){if(!ok())return;noise({dur:.02,vol:.18,type:'highpass',f:2500});voice({f:1500,dur:.03,type:'triangle',vol:.05})},
  fail(){if(!ok())return;const t=now();[67,63,60,55].forEach((n,i)=>voice({f:mtof(n),dur:.38,type:'triangle',vol:.12,t:t+i*.17,verb:.25}))},
  whoosh(){if(!ok())return;noise({dur:.28,vol:.09,type:'bandpass',f:350,f2:2400,q:.9})},
  unlock(){if(!ok())return;[72,76,79,84].forEach((n,i)=>marimba(mtof(n),.18,i*.08));bell(mtof(91),.12,1,.35)}
};
let hapticsOK=true;
const buzz=ms=>{try{if(S.haptics&&navigator.vibrate)navigator.vibrate(ms)}catch(e){}};

/* ====================== generative music ====================== */
const CHORDS=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]];
const ROOTS=[48,45,41,43];
const MEL=[72,74,76,79,81,84,86,88];
const Music={
  mode:'menu',timer:null,step:0,next:0,mi:3,
  start(){if(this.timer||!AU.ctx)return;this.next=AU.ctx.currentTime+.15;this.timer=setInterval(()=>this.tick(),30)},
  setMode(m){
    if(this.mode===m)return;this.mode=m;
    if(AU.ctx)AU.mus.frequency.setTargetAtTime(m==='play'?2200:16000,AU.ctx.currentTime,.8);
  },
  duck(sec){if(!AU.ctx)return;const g=AU.duck.gain,t=AU.ctx.currentTime;g.cancelScheduledValues(t);g.setTargetAtTime(.18,t,.05);g.setTargetAtTime(1,t+sec,.6)},
  tick(){
    const c=AU.ctx;if(!c)return;
    if(!S.music||c.state!=='running'){this.next=c.currentTime+.1;return}
    const s16=60/(this.mode==='play'?84:102)/4;
    if(this.next<c.currentTime-.2)this.next=c.currentTime+.05;
    while(this.next<c.currentTime+.25){this.sched(this.step,this.next,s16);this.next+=s16;this.step++}
  },
  sched(s,t,s16){
    const bus=AU.mus,b=Math.floor(s/16)%4,k=s%16,ch=CHORDS[b],play=this.mode==='play';
    // warm pad
    if(k===0)ch.forEach((n,i)=>voice({f:mtof(n),t,dur:s16*16+.3,type:i%2?'triangle':'sawtooth',vol:play?.028:.024,a:.5,rel:.6,lp:play?900:1400,verb:.5,bus,detune:i%2?7:-7}));
    // bass
    if(play?(k===0||k===8):(k===0||k===6||k===10))voice({f:mtof(ROOTS[b]),t,dur:s16*(k===0?5:3),type:'triangle',vol:.2,lp:520,bus});
    // arpeggio
    const arpEvery=play?4:2;
    if(k%arpEvery===0&&!(play&&Math.random()<.3)){const ai=(k/arpEvery)%8,ord=[0,1,2,3,2,1,0,2][ai];voice({f:mtof(ch[ord]+12),t,dur:play?.5:.28,type:play?'sine':'triangle',vol:play?.06:.055,verb:.4,bus})}
    // wandering melody
    if((k===0||k===6||k===8||k===12)&&Math.random()<(play?.28:.42)){
      this.mi=clamp(this.mi+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)],0,MEL.length-1);
      const f=mtof(MEL[this.mi]);voice({f,t,dur:.7,vol:.065,verb:.6,bus});voice({f:f*2,t,dur:.12,vol:.02,bus});
    }
    // drums
    if(!play){
      if(k===0||k===8||(k===11&&b===3))voice({f:130,t,dur:.28,vol:.42,slide:.32,slideT:.12,bus});
      if(k%4===2)noise({t,dur:.04,vol:.045,type:'highpass',f:7500,bus});
      if(k===4||k===12)noise({t,dur:.14,vol:.07,type:'bandpass',f:1700,q:.8,verb:.25,bus});
    }else if(k%2===0)noise({t,dur:.03,vol:k%4===2?.028:.014,type:'highpass',f:8000,bus});
  }
};
document.addEventListener('visibilitychange',()=>{if(!AU.ctx)return;if(document.hidden)AU.ctx.suspend();else AU.ctx.resume()});

/* ---------- sounds for the drag modes ---------- */
sfx.tok=()=>{if(!ok())return;voice({f:210,dur:.1,vol:.3,slide:.5,slideT:.07});noise({dur:.035,vol:.1,type:'bandpass',f:1100,q:2})};
sfx.lift=()=>{if(!ok())return;voice({f:520,dur:.08,type:'triangle',vol:.1,slide:1.4,slideT:.06})};
sfx.bonk=()=>{if(!ok())return;voice({f:160,dur:.14,type:'triangle',vol:.16,slide:.6})};
sfx.bloom=i=>{if(!ok())return;marimba(pent(i*2+4,60),.26);bell(pent(i*2+9,60),.1,.7,.05)};
sfx.pluck=i=>{if(!ok())return;const f=pent((i||0)%10+7,60);voice({f,dur:.9,type:'triangle',vol:.16,verb:.45});voice({f:f*2,dur:.25,vol:.05,verb:.3})};
sfx.sparkle=()=>{if(!ok())return;[88,91,95,100].forEach((n,i)=>bell(mtof(n),.05,.5,i*.045))};
/* a line of Block Garden blooms: a bright upward arpeggio per line, a shimmer on top, a soft whoosh under it */
sfx.lineBloom=(n,combo=0)=>{if(!ok())return;const t0=now(),b=Math.min(4,combo)*2;
  for(let k=0;k<5+Math.min(3,n)*2;k++)marimba(pent(k+3+b,60),.18,k*.045);
  [0,1,2].forEach(k=>bell(pent(10+b+k*2,60),.06,.9,.22+k*.06));
  noise({t:t0,dur:.45,vol:.06,type:'bandpass',f:1800,f2:5200,q:.7,verb:.35})};
/* two plants merge: a rising chime, brighter the higher the stage */
sfx.grow=v=>{if(!ok())return;const t0=now();voice({f:pent(v*2+2,60),t:t0,dur:.16,type:'triangle',vol:.12,slide:1.5,slideT:.12});
  marimba(pent(v*2+5,60),.24,.07);bell(pent(v*2+10,60),.08+v*.01,.8,.12);if(v>=4)bell(pent(v*2+12,60),.06,1,.2);
  noise({t:t0+.02,dur:.16,vol:.035,type:'highpass',f:5000,verb:.3})};
sfx.clear=n=>{if(!ok())return;for(let k=0;k<Math.min(4,n+1);k++)marimba(pent(k*2+5,60),.2,k*.07);noise({dur:.18,vol:.05,type:'highpass',f:6000,verb:.3})};

/* sand pouring: a soft hiss that falls in pitch, plus a few quiet grain ticks */
sfx.sand=n=>{if(!ok())return;const t=now();
  noise({t,dur:.3+n*.1,vol:.1,type:'bandpass',f:3400,f2:1700,q:.8,verb:.08});
  noise({t:t+.06,dur:.22+n*.08,vol:.045,type:'highpass',f:6800});
  for(let k=0;k<2+n;k++)noise({t:t+.28+k*.05,dur:.025,vol:.06,type:'bandpass',f:900+Math.random()*800,q:3})};
