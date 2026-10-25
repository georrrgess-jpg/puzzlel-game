/* Renders the v18.9 crowd bank in the real build and saves every asset as a WAV, plus a 26 s "match moment" mix laid out
   the way a live match plays them (murmur, an attack building, a near miss, a booking, then a goal: roar, applause,
   the chant) -> outDir/*.wav.   node test/plan/crowd_audio.js <outDir> */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||'/tmp/crowd_audio'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const page=await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='warning'||m.type()==='error') errs.push(m.text()); });
  await page.goto(DIST); await page.waitForTimeout(500);
  const t0=Date.now(); await page.evaluate(()=>{ PREFS.sound.on=true; Sound.gestured=true; Sound.ensure(); });
  await page.waitForFunction(()=>V189.bank&&V189.bank.hot||V189.failed,null,{timeout:180000}); const msBed=Date.now()-t0;
  await page.waitForFunction(()=>V189.done||V189.failed,null,{timeout:180000}); const ms=Date.now()-t0;
  const R=await page.evaluate(async TL=>{ const B=V189.bank; if(!B) return {failed:true};
    const wav=buf=>{ const n=buf.length, ch=buf.numberOfChannels, sr=buf.sampleRate, dv=new DataView(new ArrayBuffer(44+n*ch*2)); const W=(o,s)=>{ for(let i=0;i<s.length;i++) dv.setUint8(o+i,s.charCodeAt(i)); };
      W(0,'RIFF'); dv.setUint32(4,36+n*ch*2,true); W(8,'WAVE'); W(12,'fmt '); dv.setUint32(16,16,true); dv.setUint16(20,1,true); dv.setUint16(22,ch,true); dv.setUint32(24,sr,true); dv.setUint32(28,sr*ch*2,true); dv.setUint16(32,ch*2,true); dv.setUint16(34,16,true); W(36,'data'); dv.setUint32(40,n*ch*2,true);
      const C=[...Array(ch)].map((_,c)=>buf.getChannelData(c)); let o=44; for(let i=0;i<n;i++) for(let c=0;c<ch;c++){ dv.setInt16(o,Math.max(-1,Math.min(1,C[c][i]))*32767,true); o+=2; }
      let s=''; const u=new Uint8Array(dv.buffer); for(let i=0;i<u.length;i+=32768) s+=String.fromCharCode.apply(null,u.subarray(i,i+32768)); return btoa(s); };
    const sr0=0; const out={}; for(const k of ['bed','hot','roar','ooh','aww','boo','applause','chant','shouts']) out[k]={wav:wav(B[k]),dur:+B[k].duration.toFixed(2)};
    /* the match moment, mixed offline with the same gains the live code uses */
    const sr=32000, D=TL==='bike'?17.2:26, oc=new OfflineAudioContext(2,sr*D,sr); const bus=oc.createGain(); bus.gain.value=0.9; bus.connect(oc.destination);
    const ir=oc.createBuffer(2,sr*1.6,sr); for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3.2)*0.6; } const rv=oc.createConvolver(); rv.buffer=ir; const rg=oc.createGain(); rg.gain.value=0.35*0.12; rv.connect(rg); rg.connect(bus);
    const crowd=oc.createGain(); crowd.gain.value=0.5; crowd.connect(bus); crowd.connect(rv); const goal=oc.createGain(); goal.gain.value=0.7; goal.connect(bus); goal.connect(rv);
    const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.5; const cg=oc.createGain(); lp.connect(cg); cg.connect(crowd);
    const loop=(buf,g0)=>{ const s=oc.createBufferSource(); s.buffer=buf; s.loop=true; const g=oc.createGain(); g.gain.value=g0; s.connect(g); g.connect(lp); s.start(0); return g; };
    const bedG=loop(B.bed,1), hotG=loop(B.hot,0.0001); const base=0.5+0.5*0.55;
    const ex=(t,x)=>{ cg.gain.setTargetAtTime(base*(1+0.7*x),t,0.6); hotG.gain.setTargetAtTime(0.0001+1.1*Math.pow(x,1.3),t,0.6); bedG.gain.setTargetAtTime(1-0.35*x,t,0.6); lp.frequency.setTargetAtTime(3000+4500*x,t,0.6); };
    cg.gain.value=base; lp.frequency.value=3000; ex(0,0);
    const play=(buf,t,vol,o={})=>{ const s=oc.createBufferSource(); s.buffer=buf; s.playbackRate.value=o.rate||1; const g=oc.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+(o.a||0.02)); if(o.dur) g.gain.setTargetAtTime(0.0001,t+o.dur*0.7,o.dur*0.12);
      let n=g; if(o.pan!=null){ const p=oc.createStereoPanner(); p.pan.value=o.pan; g.connect(p); n=p; } s.connect(g); n.connect(o.dest||crowd); s.start(t,o.off||0,o.len); };
    const sh=(t,i,v,pan)=>{ const [o,l]=B.spans[i%B.spans.length]; play(B.shouts,t,v,{off:o,len:l,dur:l,pan}); };
    if(TL==='bike'){ /* the bicycle-kick clip: the attack reaches the final third, the kick at 2.8 s, the goal at 3.4 s */
      ex(0,0.45); sh(0.6,1,0.15,-0.4); ex(1.4,0.8); ex(2.4,1); sh(2.0,4,0.16,0.5); play(B.roar,3.4,1,{dest:goal}); play(B.roar,3.47,0.45,{rate:0.97,pan:0.3,dest:goal}); ex(4,1); ex(7.5,0.6); play(B.chant,8.6,0.55,{dest:goal}); ex(11,0.3); sh(12.5,6,0.13,-0.3); ex(14,0.2); }
    else { play(B.applause,0.2,0.35*base,{dur:3}); sh(3.1,1,0.16,-0.5); sh(5.0,6,0.12,0.6);
    ex(6,0.35); ex(8,0.7); sh(8.4,4,0.18,0.3); ex(9.2,1); play(B.ooh,9.6,0.75); ex(11,0.3); sh(12.2,5,0.16,-0.4);
    play(B.boo,13.4,0.6); ex(15.5,0.6); ex(16.8,1); play(B.roar,17.4,1,{dest:goal}); play(B.roar,17.47,0.45,{rate:0.97,pan:0.3,dest:goal}); ex(18,1); ex(21,0.5); play(B.chant,22.6-0.0,0.55,{dest:goal}); }
    const mix=await oc.startRendering(); out.moment={wav:wav(mix),dur:D};
    return out; },process.env.TL||'');
  if(R.failed){ console.log('bank failed', errs); await b.close(); process.exit(1); }
  for(const [k,v] of Object.entries(R)){ fs.writeFileSync(path.join(OUT,k+'.wav'),Buffer.from(v.wav,'base64')); }
  console.log(JSON.stringify({renderMs:ms,bedMs:msBed,assets:Object.fromEntries(Object.entries(R).map(([k,v])=>[k,v.dur])),errors:errs.slice(0,5)}));
  await b.close(); })();
