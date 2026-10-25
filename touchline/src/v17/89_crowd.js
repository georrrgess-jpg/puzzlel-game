/* ===================== v18.9: a crowd that sounds like people (89) =====================
   The old crowd was three bands of filtered noise, a sawtooth "shout" buzzing every second, and an 8-bit sting and a
   sawtooth horn on goals. There are still no audio files (the game is one HTML file), so the crowd is rendered once,
   off the main thread (OfflineAudioContext), from many individually synthesised people, and then played back:
   - a person's voice: a glottal buzz (sawtooth, tilted down) plus breath noise, through three vowel formants, with
     pitch, loudness, distance (darker and quieter far away) and a place in the stereo field of its own;
   - the murmur: 36 people talking in phrases of syllables (random vowels, consonant gaps and hisses, falling pitch over
     a phrase, pauses), mixed into a 16 s seamless loop; a "lean-forward" loop of 30 raised voices and scattered claps
     that the match crossfades in as an attack nears goal;
   - reactions sung by 40-70 voices at once, each with its own pitch, vowel and timing: the goal roar ("yeah!",
     finger whistles, then applause), the near-miss "ooooh", the groan, the boo;
   - applause from 120 clappers clapping at their own rates, and the "Let's go! (clap clap)" chant, sung and clapped
     together with human looseness;
   - single shouts from the stands ("Hey!", "Come on!", "Go!", "Shoot!", "Ref!", ...) and finger whistles, dropped
     into the murmur now and then (more often in a small crowd, where you can pick out voices, and in big moments).
   Rendering is progressive: the murmur first (the crowd can start), then the reactions; until each is ready the old
   sound for it plays. The size of the crowd comes from the match's attendance. A home goal lifts the whole ground; an away goal gets the
   away supporters' cheer and a groan from the rest. The mixer switches (crowd, reactions, goal, chants) still apply.
   Globals: v189* / V189. */
const V189={sr:24000,bank:null,busy:false,done:false,on:true};
const V189_VOW={a:[730,1090,2440],e:[530,1840,2480],i:[270,2290,3010],o:[570,840,2410],u:[300,870,2240],ae:[660,1720,2410],uh:[640,1190,2390],er:[490,1350,1690],m:[250,1000,2200]};
const v189R=(a,b)=>a+Math.random()*(b-a);
const v189Pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- offline rendering helpers ---------- */
function v189Noise(oc){ const b=oc.createBuffer(1,oc.sampleRate*2,oc.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return b; }
/* one person: buzz + breath -> three formants -> loudness -> distance -> pan */
function v189Voice(oc,out,nz,o){ const fem=!!o.fem, k=fem?1.17:1;
  const osc=oc.createOscillator(); osc.type='sawtooth'; osc.frequency.value=o.f0||120;
  const tilt=oc.createBiquadFilter(); tilt.type='lowpass'; tilt.frequency.value=o.bright||1400; tilt.Q.value=0.5;
  const exc=oc.createGain(); osc.connect(tilt); tilt.connect(exc);
  const ns=oc.createBufferSource(); ns.buffer=nz; ns.loop=true; const nh=oc.createBiquadFilter(); nh.type='highpass'; nh.frequency.value=450; const ng=oc.createGain(); ng.gain.value=o.breath??0.15; ns.connect(nh); nh.connect(ng); ng.connect(exc);
  if(o.vib){ const l=oc.createOscillator(); l.frequency.value=o.vib; const lg=oc.createGain(); lg.gain.value=o.vibD||14; l.connect(lg); lg.connect(osc.detune); l.start(0); }
  /* nobody holds a pitch: a slow wander (and a little roughness) on every voice */
  { const l=oc.createOscillator(); l.type='triangle'; l.frequency.value=v189R(0.6,1.7); const lg=oc.createGain(); lg.gain.value=v189R(12,28); l.connect(lg); lg.connect(osc.detune); l.start(v189R(0,0.5)); }
  const env=oc.createGain(); env.gain.value=0;
  const F=[[1,6],[0.55,11],[0.22,15]].map(([g,q])=>{ const bp=oc.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q; bp.frequency.value=500; const gg=oc.createGain(); gg.gain.value=g; exc.connect(bp); bp.connect(gg); gg.connect(env); return bp; });
  const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=o.lp||5000; env.connect(lp);
  const vol=oc.createGain(); vol.gain.value=o.gain??1; lp.connect(vol);
  if(oc.createStereoPanner){ const pn=oc.createStereoPanner(); pn.pan.value=o.pan||0; vol.connect(pn); pn.connect(out); } else vol.connect(out);
  /* a fricative/hiss bus (s, sh, ts, f, h) */
  const fh=oc.createBufferSource(); fh.buffer=nz; fh.loop=true; const fb=oc.createBiquadFilter(); fb.type='highpass'; fb.frequency.value=3800; const fg=oc.createGain(); fg.gain.value=0; fh.connect(fb); fb.connect(fg); fg.connect(lp);
  osc.start(0); ns.start(0,Math.random()*1.5); fh.start(0,Math.random()*1.5);
  const T=t=>Math.max(0,t);
  return { vow(t,v,tc){ const f=V189_VOW[v]||V189_VOW.a; for(let i=0;i<3;i++) F[i].frequency.setTargetAtTime(f[i]*k,T(t),tc??0.03); },
    pitch(t,f,tc){ osc.frequency.setTargetAtTime(f,T(t),tc??0.04); },
    amp(t,a,tc){ env.gain.setTargetAtTime(a,T(t),tc??0.025); },
    hiss(t,d,a,f){ if(f) fb.frequency.setValueAtTime(f,T(t)); fg.gain.setTargetAtTime(a,T(t),0.008); fg.gain.setTargetAtTime(0,T(t+d),0.015); } }; }
/* render a graph into a buffer and normalise its loudness (RMS) so every asset sits at a known level */
async function v189Render(dur,build,rms){ const sr=V189.sr, oc=new OfflineAudioContext(2,Math.floor(sr*dur),sr); const nz=v189Noise(oc); const bus=oc.createGain(); bus.connect(oc.destination);
  build(oc,bus,nz); const b=await oc.startRendering(); return v189Norm(b,rms); }
function v189Norm(b,rms){ let s=0, n=0, pk=0; for(let c=0;c<b.numberOfChannels;c++){ const d=b.getChannelData(c); for(let i=0;i<d.length;i+=3){ s+=d[i]*d[i]; n++; } for(let i=0;i<d.length;i++) pk=Math.max(pk,Math.abs(d[i])); }
  const cur=Math.sqrt(s/Math.max(1,n)); if(!(cur>0)) return b; const g=Math.min((rms||0.1)/cur,0.95/Math.max(pk,1e-6)); for(let c=0;c<b.numberOfChannels;c++){ const d=b.getChannelData(c); for(let i=0;i<d.length;i++) d[i]*=g; } return b; }
/* a seamless loop: the last X seconds are faded into the start */
function v189Loop(ctx,b,X){ const sr=b.sampleRate, L=b.length-Math.floor(X*sr), n=Math.floor(X*sr), o=ctx.createBuffer(b.numberOfChannels,L,sr);
  for(let c=0;c<b.numberOfChannels;c++){ const s=b.getChannelData(c), d=o.getChannelData(c); for(let i=0;i<L;i++) d[i]=s[i]; for(let i=0;i<n;i++){ const w=i/n; d[i]=s[i]*Math.sqrt(w)+s[i+L]*Math.sqrt(1-w); } } return o; }
/* claps in plain JS: each clapper claps at his own rate, each clap a short burst through his hands' resonance */
function v189Claps(b,list){ const sr=b.sampleRate, L=b.length, l=b.getChannelData(0), r=b.getChannelData(1);
  for(const c of list){ const w0=2*Math.PI*c.fc/sr, al=Math.sin(w0)/(2*c.q), a0=1+al, b0=al/a0, b2=-al/a0, a1=-2*Math.cos(w0)/a0, a2=(1-al)/a0; const gl=Math.cos((c.pan+1)*Math.PI/4), gr=Math.sin((c.pan+1)*Math.PI/4);
    for(const t of c.times){ const i0=Math.floor(t*sr); if(i0<0||i0>=L) continue; const len=Math.floor(sr*c.len), dk=sr*c.len*0.22, A=c.amp*(0.75+Math.random()*0.5); let x1=0,x2=0,y1=0,y2=0;
      for(let i=0;i<len*2&&i0+i<L;i++){ const x=i<len?(Math.random()*2-1)*Math.exp(-i/dk):0; const y=b0*x+b2*x2-a1*y1-a2*y2; x2=x1; x1=x; y2=y1; y1=y; l[i0+i]+=y*A*gl; r[i0+i]+=y*A*gr; } } } }
function v189Clapper(o){ const per=v189R(0.17,0.3), t0=o.t0??v189R(0,0.35), t1=o.t1??v189R(o.dur*0.55,o.dur), times=[]; for(let t=t0;t<t1;t+=per*v189R(0.9,1.1)) times.push(t);
  const d=Math.random(); return {times,fc:v189R(900,2300),q:v189R(1.1,2.4),len:v189R(0.006,0.016),amp:(1-0.65*d)*(o.amp||1),pan:v189R(-0.9,0.9)}; }

/* ---------- the assets ---------- */
/* talk: phrases of syllables */
function v189Talk(v,t0,t1,o){ let t=t0; const base=o.f0;
  while(t<t1){ const n=3+Math.floor(Math.random()*8), dec=v189R(0.08,0.2);
    for(let s=0;s<n&&t<t1;s++){ const sd=v189R(o.sMin||0.09,o.sMax||0.22), u=s/Math.max(1,n-1); const f=base*(1+dec*(0.5-u))*v189R(0.93,1.08)*(Math.random()<0.12?1.15:1);
      v.vow(t,v189Pick(o.vowels||['a','e','i','o','u','uh','ae','er'])); v.pitch(t,f); v.amp(t,o.amp*v189R(0.6,1)); v.amp(t+sd,o.amp*0.12);
      if(Math.random()<0.25) v.hiss(t+sd,v189R(0.03,0.06),o.amp*0.11,v189Pick([3200,4200,5200]));
      t+=sd+v189R(0.03,0.08); }
    v.amp(t,0,0.05); t+=v189R(o.pMin??0.25,o.pMax??1.2); } }
async function v189Bed(hot){ const dur=14, n=hot?24:28;
  return v189Render(dur,(oc,bus,nz)=>{
    for(let k=0;k<n;k++){ const fem=Math.random()<0.45, d=Math.random(); const f0=(fem?v189R(175,240):v189R(95,140))*(hot?v189R(1.3,1.6):1);
      const v=v189Voice(oc,bus,nz,{fem,f0,pan:v189R(-0.95,0.95),lp:5200-3600*d,gain:(1-0.75*d)*v189R(0.6,1),bright:hot?2300:1400,breath:hot?0.28:0.14,vib:hot?v189R(4,6):0,vibD:hot?18:0});
      v189Talk(v,v189R(0,1.5),dur,hot?{f0,amp:1,sMin:0.16,sMax:0.45,pMin:0.1,pMax:0.6,vowels:['a','o','e','ae','uh']}:{f0,amp:1}); }
    /* the mass further away: a soft, darker wash under the voices */
    const ns=oc.createBufferSource(); ns.buffer=nz; ns.loop=true; const bp=oc.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=hot?700:480; bp.Q.value=0.7; const g=oc.createGain(); g.gain.value=hot?0.05:0.035;
    const lfo=oc.createOscillator(); lfo.frequency.value=0.13; const lg=oc.createGain(); lg.gain.value=0.012; lfo.connect(lg); lg.connect(g.gain); ns.connect(bp); bp.connect(g); g.connect(bus); ns.start(0); lfo.start(0);
  },hot?0.16:0.11).then(b=>{ if(hot){ const L=[]; for(let k=0;k<26;k++){ const t0=v189R(0,dur); L.push(v189Clapper({dur,t0,t1:t0+v189R(0.6,2.2),amp:0.5})); } v189Claps(b,L); } return b; }); }
/* many people at once: shout / ooh / groan / boo / chant voices */
function v189Crowd(oc,bus,nz,n,f){ for(let k=0;k<n;k++){ const fem=Math.random()<0.4, d=Math.random(); f(v189Voice,{fem,d,k,pan:v189R(-0.95,0.95),lp:6000-3800*d,gain:(1-0.7*d)*v189R(0.6,1)},oc,bus,nz); } }
async function v189Roar(){ const dur=7;
  const b=await v189Render(dur,(oc,bus,nz)=>{
    v189Crowd(oc,bus,nz,56,(V,o)=>{ const f0=o.fem?v189R(300,480):v189R(170,300); const v=V(oc,bus,nz,{...o,f0,bright:2600,breath:0.35,vib:v189R(4,7),vibD:22});
      let t=Math.max(0,0.04+Math.log(1/Math.max(0.02,Math.random()))*0.12); for(let s=0;s<3&&t<dur-0.5;s++){ const L=v189R(1.2,3.2)*(s?0.7:1); const w=v189Pick([['i','e','a'],['a'],['e','a'],['o'],['ae']]);
        v.vow(t,w[0],0.01); w.slice(1).forEach((x,j)=>v.vow(t+0.08*(j+1),x,0.04)); v.pitch(t,f0*0.9,0.01); v.pitch(t+0.05,f0*1.12,0.08); v.pitch(t+0.6,f0*0.95,0.6);
        v.amp(t,s?0.7:1,0.03); v.amp(t+L*0.7,0.35,0.25); v.amp(t+L,0,0.2); t+=L+v189R(0.2,0.9); } });
    for(let k=0;k<7;k++){ const t=v189R(0.4,3.5), os=oc.createOscillator(); os.type='sine'; const g=oc.createGain(); g.gain.value=0; const f=v189R(2200,3000);
      os.frequency.setValueAtTime(f*0.75,t); os.frequency.exponentialRampToValueAtTime(f*1.15,t+0.18); os.frequency.setValueAtTime(f*0.9,t+0.3); os.frequency.exponentialRampToValueAtTime(f*0.6,t+0.75);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.06,t+0.04); g.gain.setValueAtTime(0.06,t+0.2); g.gain.linearRampToValueAtTime(0,t+0.24); g.gain.linearRampToValueAtTime(0.05,t+0.32); g.gain.linearRampToValueAtTime(0,t+0.8);
      const pn=oc.createStereoPanner?oc.createStereoPanner():null; os.connect(g); if(pn){ pn.pan.value=v189R(-0.8,0.8); g.connect(pn); pn.connect(bus); } else g.connect(bus); os.start(t); os.stop(t+0.9); } },0.2);
  const L=[]; for(let k=0;k<110;k++) L.push(v189Clapper({dur,t0:v189R(0.8,2),t1:v189R(4.5,7),amp:0.45})); v189Claps(b,L); return v189Norm(b,0.2); }
async function v189Sung(kind){ const dur=kind==='boo'?3.2:2.8;
  return v189Render(dur,(oc,bus,nz)=>{
    v189Crowd(oc,bus,nz,kind==='boo'?36:44,(V,o)=>{ const ooh=kind==='ooh', boo=kind==='boo'; const f0=boo?(o.fem?v189R(170,230):v189R(100,150)):(o.fem?v189R(230,340):v189R(130,210));
      const v=V(oc,bus,nz,{...o,f0,bright:ooh?1800:1500,breath:0.22,vib:v189R(4,6.5),vibD:boo?20:12});
      const t=v189R(0.01,ooh?0.14:0.3);
      if(ooh){ v.vow(t,'u',0.01); v.vow(t+0.5,'o',0.25); v.pitch(t,f0*0.85,0.01); v.pitch(t+0.02,f0*1.18,0.16); v.pitch(t+0.55,f0*0.72,0.45); v.amp(t,1,0.07); v.amp(t+0.6,0.55,0.3); v.amp(t+1.5,0,0.25); }
      else if(boo){ v.vow(t,'u',0.01); v.pitch(t,f0,0.01); v.pitch(t+1,f0*v189R(0.92,1.04),0.6); v.amp(t,0.9,0.15); v.amp(t+1.6,0.5,0.3); v.amp(t+2.3,0,0.25); }
      else { v.vow(t,'ae',0.01); v.vow(t+0.25,'o',0.3); v.pitch(t,f0*1.12,0.01); v.pitch(t+0.1,f0*0.7,0.5); v.amp(t,0.9,0.08); v.amp(t+0.7,0.45,0.25); v.amp(t+1.5,0,0.25); } });
  },0.16); }
async function v189Applause(){ const dur=5.5, sr=V189.sr; const ctx=new OfflineAudioContext(2,Math.floor(sr*dur),sr); const b=ctx.createBuffer(2,Math.floor(sr*dur),sr);
  const L=[]; for(let k=0;k<120;k++) L.push(v189Clapper({dur,t0:v189R(0,0.45),t1:v189R(2.2,dur-0.2)})); v189Claps(b,L); return v189Norm(b,0.14); }
/* "Let's go!" (clap clap) x4, loose like real people */
async function v189Chant(){ const beat=0.42, bars=4, dur=bars*beat*4+0.8;
  const b=await v189Render(dur,(oc,bus,nz)=>{
    v189Crowd(oc,bus,nz,36,(V,o)=>{ const f0=o.fem?v189R(260,330):v189R(150,200); const v=V(oc,bus,nz,{...o,f0,bright:2200,breath:0.3,vib:5,vibD:10});
      for(let bar=0;bar<bars;bar++){ if(Math.random()<0.12) continue; const t=bar*beat*4+v189R(-0.02,0.03), fade=1-bar*0.14;
        v.vow(t,'e',0.01); v.pitch(t,f0,0.01); v.amp(t,fade,0.02); v.amp(t+0.16,0.1*fade,0.02); v.hiss(t+0.14,0.07,0.5*fade,4500);
        v.vow(t+beat,'o',0.02); v.pitch(t+beat,f0*0.94,0.02); v.amp(t+beat,fade,0.025); v.amp(t+beat+0.32,0,0.05); } }); },0.12);
  const L=[]; for(let k=0;k<70;k++){ const times=[]; for(let bar=0;bar<bars;bar++) for(const q of [2,3]) if(Math.random()<0.95) times.push(bar*beat*4+q*beat+(Math.random()+Math.random()-1)*0.03);
    const d=Math.random(); L.push({times,fc:v189R(900,2300),q:v189R(1.1,2.4),len:v189R(0.006,0.016),amp:1-0.6*d,pan:v189R(-0.9,0.9)}); }
  v189Claps(b,L); return v189Norm(b,0.15); }
/* single voices from the stands, laid end to end; each entry is [start, length] in seconds */
const V189_SHOUTS=[['hey',[['h',0.05],['e',0.12],['i',0.25]]],['comeon',[['uh',0.15],['m',0.06],['o',0.42]]],['go',[['o',0.3],['u',0.2]]],['yeah',[['i',0.07],['e',0.1],['a',0.38]]],
  ['shoot',[['sh',0.12],['u',0.32]]],['ref',[['er',0.08],['e',0.22],['f',0.1]]],['letsgo',[['e',0.14],['ts',0.06],['o',0.42]]],['yes',[['i',0.08],['e',0.2],['s',0.14]]],['come on ref',[['uh',0.12],['m',0.05],['o',0.2],['er',0.08],['e',0.2],['f',0.08]]],['away',[['uh',0.08],['u',0.05],['e',0.22],['i',0.12]]]];
async function v189Shouts(){ const gap=1.3, dur=V189_SHOUTS.length*gap+0.4; const spans=[];
  const b=await v189Render(dur,(oc,bus,nz)=>{ let t0=0.05;
    for(const [,seq] of V189_SHOUTS){ const fem=Math.random()<0.4, f0=fem?v189R(260,360):v189R(140,220); const v=v189Voice(oc,bus,nz,{fem,f0,pan:0,lp:v189R(4200,6500),gain:1,bright:2400,breath:0.3,vib:5,vibD:16});
      let t=t0; v.pitch(t,f0*0.95,0.01);
      for(const [s,d] of seq){ if(s==='h'||s==='sh'||s==='f'||s==='s'||s==='ts'){ v.hiss(t,d,s==='h'?0.25:0.6,s==='sh'?2600:s==='h'?1800:5000); v.amp(t,0.04,0.01); }
        else { v.vow(t,s,0.02); v.amp(t,1,0.02); v.pitch(t+0.02,f0*1.08,0.06); v.pitch(t+d*0.6,f0*0.9,0.1); } t+=d; }
      v.amp(t,0,0.04); spans.push([t0,t-t0+0.3]); t0+=gap; } },0.12);
  return {b,spans}; }

/* the whole bank, rendered once in the background */
Sound.v189Build=function(){ if(V189.done||V189.busy||!this.ctx||typeof OfflineAudioContext==='undefined') return; V189.busy=true; const ctx=this.ctx, B=V189.bank={};
  (async()=>{ B.bed=v189Loop(ctx,await v189Bed(false),2); B.hot=v189Loop(ctx,await v189Bed(true),2);
    /* the murmur is enough to start a waiting match; the reactions follow a few seconds later (until then the old ones play) */
    if(this.v189Want&&!this.crowd) this.crowdStart();
    B.applause=await v189Applause(); B.ooh=await v189Sung('ooh'); B.roar=await v189Roar(); B.aww=await v189Sung('aww'); B.boo=await v189Sung('boo'); B.chant=await v189Chant();
    const sh=await v189Shouts(); B.spans=sh.spans; B.shouts=sh.b; V189.done=true; V189.busy=false; })().catch(e=>{ V189.busy=false; V189.failed=true; if(typeof console!=='undefined') console.warn('v18.9 crowd',e); }); };

/* ---------- playback ---------- */
(function(){ const S=Sound; const old={crowdStart:S.crowdStart,crowdStop:S.crowdStop,crowdExcite:S.crowdExcite,hush:S.hush,ooh:S.ooh,boo:S.boo,applause:S.applause,save:S.save,miss:S.miss,goal:S.goal,chant:S.chant};
  const fx=k=>typeof fxOn!=='function'||fxOn(k), has=k=>V189.on&&!!V189.bank&&!!V189.bank[k], ready=()=>has('bed')&&has('hot');
  const ens0=S.ensure; S.ensure=function(){ const r=ens0.apply(this,arguments); if(r&&V189.on&&!V189.done&&!V189.busy&&!V189.failed) this.v189Build(); return r; };
  /* one buffer, played once: gain, pan, start offset, rate, a send to the stadium reverb */
  S.v189Play=function(buf,o={}){ const ctx=this.ctx; if(!ctx||!buf) return null; const t=o.t??ctx.currentTime+0.01;
    const s=ctx.createBufferSource(); s.buffer=buf; s.playbackRate.value=o.rate||1; const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(o.vol??0.5,t+(o.a??0.02));
    if(o.dur){ g.gain.setTargetAtTime(0.0001,t+o.dur*0.7,o.dur*0.12); }
    let n=g; if(o.pan!=null&&ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=clamp(o.pan,-0.95,0.95); g.connect(p); n=p; }
    s.connect(g); n.connect(o.dest||this.ch.crowd); s.start(t,o.off||0,o.len||undefined); if(o.dur) s.stop(t+o.dur+0.6); return {s,g}; };
  /* how big is tonight's crowd: 0 (a few dozen) .. 1 (a packed state final) */
  const size=()=>{ try{ const a=App.live&&App.live.M&&App.live.M.att; if(a) return clamp(Math.log10(Math.max(30,a)/30)/Math.log10(5000/30),0,1); }catch(e){} return 0.5; };
  S.crowdStart=function(){ if(!fx('crowd')||!this.ensure()) return;
    /* the bank is still rendering: the crowd comes in when it is ready (no fallback to the old buzzing crowd meanwhile) */
    if(!ready()){ if(V189.on&&!V189.failed&&typeof OfflineAudioContext!=='undefined'){ this.v189Want=true; this.v189Build(); return; } return old.crowdStart.apply(this,arguments); }
    if(this.crowd) return; this.v189Want=false; const ctx=this.ctx, B=V189.bank, z=size(), t=ctx.currentTime;
    const g=ctx.createGain(); g.gain.value=0.0001; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3000; lp.Q.value=0.5; lp.connect(g); g.connect(this.ch.crowd);
    const loop=(buf,v)=>{ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; const gg=ctx.createGain(); gg.gain.value=v; s.connect(gg); gg.connect(lp); s.start(t,Math.random()*buf.duration); return {s,g:gg}; };
    const bed=loop(B.bed,1), hot=loop(B.hot,0.0001); const lvl=0.5+0.5*z;
    g.gain.setTargetAtTime(lvl,t,0.8);
    this.crowd={g,lp,bed,hot,lvl,base:lvl,size:z,x:0,hush:false,v189:true};
    if(B.applause) this.v189Play(B.applause,{vol:0.35*lvl,dur:3});
    clearInterval(this.crowdT); this.crowdT=setInterval(()=>this.v189Tick(),450); };
  S.v189Tick=function(){ const c=this.crowd; if(!c||!c.v189||!this.ctx||c.hush) return; const B=V189.bank; const x=c.x||0;
    /* single voices: easier to pick out in a small crowd, more of them when the stands lean forward */
    if(B.shouts&&Math.random()<0.05+0.1*(1-c.size)+0.18*x){ const [o,l]=v189Pick(B.spans); this.v189Play(B.shouts,{off:o,len:l,dur:l,vol:v189R(0.07,0.2)*(0.6+0.6*(1-c.size)),pan:v189R(-0.85,0.85),rate:v189R(0.94,1.06)}); }
    if(Math.random()<0.012+0.04*x) this.v189Whistle(v189R(0.03,0.07));
    if(B.applause&&x>0.75&&Math.random()<0.05) this.v189Play(B.applause,{vol:0.12,dur:1.6,off:v189R(0,2),pan:v189R(-0.6,0.6)}); };
  S.v189Whistle=function(v){ const ctx=this.ctx, t=ctx.currentTime+0.01, f=v189R(2100,3000); const os=ctx.createOscillator(); os.type='sine'; const g=ctx.createGain();
    os.frequency.setValueAtTime(f*0.75,t); os.frequency.exponentialRampToValueAtTime(f*1.15,t+0.16); os.frequency.setValueAtTime(f*0.95,t+0.3); os.frequency.exponentialRampToValueAtTime(f*0.62,t+0.72);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+0.04); g.gain.setValueAtTime(v,t+0.18); g.gain.linearRampToValueAtTime(0,t+0.23); g.gain.linearRampToValueAtTime(v*0.8,t+0.31); g.gain.linearRampToValueAtTime(0,t+0.78);
    let n=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=v189R(-0.8,0.8); g.connect(p); n=p; } os.connect(g); n.connect(this.ch.crowd); os.start(t); os.stop(t+0.85); };
  S.crowdStop=function(){ this.v189Want=false; const c=this.crowd; if(!c||!c.v189) return old.crowdStop.apply(this,arguments); clearInterval(this.crowdT); this.crowd=null;
    try{ const t=this.ctx.currentTime; c.g.gain.setTargetAtTime(0.0001,t,0.3); setTimeout(()=>{ try{ c.bed.s.stop(); c.hot.s.stop(); }catch(e){} },1500); }catch(e){} };
  /* excitement 0..1: the raised-voice loop comes in, the whole crowd gets louder and brighter */
  S.crowdExcite=function(x){ const c=this.crowd; if(!c||!c.v189) return old.crowdExcite.apply(this,arguments); if(!fx('crowd')||!this.ctx||c.hush) return; x=clamp(x,0,1); if(Math.abs(x-c.x)<0.03) return; c.x=x; const t=this.ctx.currentTime;
    c.lvl=c.base*(1+0.7*x); c.g.gain.setTargetAtTime(c.lvl,t,0.6); c.hot.g.gain.setTargetAtTime(0.0001+1.1*Math.pow(x,1.3),t,0.6); c.bed.g.gain.setTargetAtTime(1-0.35*x,t,0.6); c.lp.frequency.setTargetAtTime(3000+4500*x,t,0.6); };
  S.hush=function(on){ const c=this.crowd; if(!c||!c.v189) return old.hush.apply(this,arguments); if(!this.ctx) return; c.hush=!!on; const t=this.ctx.currentTime; c.g.gain.setTargetAtTime(on?Math.min(0.18,c.lvl):c.lvl,t,on?0.35:0.12); };
  const gapT={}; const gap=(k,ms)=>{ const n=performance.now(); if(gapT[k]&&n-gapT[k]<ms) return false; gapT[k]=n; return true; };
  S.ooh=function(k){ if(!fx('reactions')) return; if(!has('ooh')) return old.ooh.apply(this,arguments); if(!this.ensure()||!gap('ooh',900)) return; const B=V189.bank; this.v189Play(B.ooh,{vol:0.75*clamp(k??1,0.15,1.2),rate:v189R(0.95,1.05)}); };
  S.v189Aww=function(k){ if(!fx('reactions')||!has('aww')||!this.ensure()||!gap('aww',900)) return; this.v189Play(V189.bank.aww,{vol:0.7*(k??1),rate:v189R(0.95,1.04)}); };
  S.boo=function(){ if(!fx('reactions')) return; if(!has('boo')) return old.boo.apply(this,arguments); if(!this.ensure()||!gap('boo',1500)) return; this.v189Play(V189.bank.boo,{vol:0.6,rate:v189R(0.96,1.03)}); };
  S.applause=function(k,dur){ if(!fx('reactions')) return; if(!has('applause')) return old.applause.apply(this,arguments); if(!this.ensure()) return; const D=Math.min(dur||2.4,5.3); this.v189Play(V189.bank.applause,{vol:0.6*(k??1),dur:D,a:0.15}); };
  S.save=function(){ if(!has('applause')||!has('ooh')) return old.save.apply(this,arguments); this.applause(0.6,2.4); this.ooh(0.45); };
  S.miss=function(){ if(!has('ooh')||!has('aww')) return old.miss.apply(this,arguments); if(Math.random()<0.5) this.ooh(0.9); else this.v189Aww(0.85); };
  S.chant=function(t0){ if(!fx('chants')) return; if(!has('chant')) return old.chant.apply(this,arguments); if(!this.ensure()) return; const t=Math.max(this.ctx.currentTime+0.01,t0||0); this.v189Play(V189.bank.chant,{t,vol:0.55,dest:this.ch.goal}); };
  /* the goal: who scored decides who roars (the home end is most of the ground) */
  S.goal=function(){ if(!has('roar')||!has('aww')||!has('chant')) return old.goal.apply(this,arguments); if(!this.ensure()) return; const B=V189.bank, away=this.v189Side==='away', t=this.ctx.currentTime+0.02;
    if(fx('goal')){ if(away){ this.v189Play(B.roar,{t,vol:0.35,pan:v189R(-0.7,0.7),dest:this.ch.goal}); }
      else { this.v189Play(B.roar,{t,vol:1,dest:this.ch.goal}); this.v189Play(B.roar,{t:t+0.07,vol:0.45,rate:0.97,pan:v189R(-0.5,0.5),dest:this.ch.goal}); } }
    if(away){ this.v189Aww(0.8); if(fx('reactions')) this.v189Play(B.applause,{t:t+0.4,vol:0.18,dur:2.5,pan:v189R(-0.7,0.7)}); return; }
    if(fx('chants')&&this.crowd) this.chant(t+5.2); };
})();
/* the live match tells the goal roar which end scored */
if(typeof liveEmit==='function'){ const _v189Live=liveEmit;
  liveEmit=function(e){ const S=Sound; const prev=S.v189Side; try{ if(e&&(e.t==='goal'||e.t==='kick')) S.v189Side=e.s===1?'away':'home'; }catch(err){}
    try{ return _v189Live.apply(this,arguments); } finally{ S.v189Side=prev; } }; }
