'use strict';
/* ====================== music: four composed songs, played live ======================
   No audio files: a small band of synthesized instruments plays written-out songs (chords, bass lines, melodies,
   drum grooves, arranged into sections) in time with the Web Audio clock.
     menu   "Pop Parade"     F major, 108 bpm: the bright, hooky theme of the menus
     play   "Garden Groove"  D major, 84 bpm, lo-fi swing   ┐
            "Brain Bounce"   Bb major, 100 bpm, bossa bounce├ a playlist that carries on from level to level
            "Starlight"      C major, 72 bpm, dreamy         ┘
   The sound effects (js/audio.js) play in the key of whatever song is on (AU.key), so they always fit the music.

   Signal flow (one shared "rig", one "player" per song so two songs can cross-fade):
     instrument note -> channel strip (level, filter, chorus, pan, sends) -> [pump] -> player out ─┐
                                                       reverb send / delay send ──> rig reverb/delay ┤
     rig sum -> mood filter (muffled behind popups) -> duck (under fanfares) -> music volume -> master */

/* ---------------- notation ----------------
   melody  bars split by '|'; tokens NOTE:len (len in 16ths), 'r:len' is a rest, '^' before a note accents it and '_'
           softens it. Every bar must add up to 16 (tools/music-render.cjs checks).
   rhythm  16 characters per bar: X accent, x hit, o soft hit, - hold the note before, . rest. Longer strings are several
           bars; the pattern repeats.
   chords  one name per bar, or two separated by ',' (half a bar each). */
const SONGS={};
const NOTE_I={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function noteNum(s){const m=/^([A-G])(#|b)?(-?\d)$/.exec(s);if(!m)throw Error('bad note '+s);return 12*(+m[3]+1)+NOTE_I[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)}
const MUS_WARN=[];
function parseMel(str,where){
  const ev=[];str.split('|').forEach((bar,bi)=>{let s=0;
    for(let tok of bar.trim().split(/\s+/).filter(Boolean)){let v=.82;if(tok[0]==='^'){v=1;tok=tok.slice(1)}else if(tok[0]==='_'){v=.58;tok=tok.slice(1)}
      const[nm,l]=tok.split(':'),d=+l;if(!(d>0))MUS_WARN.push(where+' bar '+(bi+1)+': bad token '+tok);
      if(nm!=='r')ev.push({s:bi*16+s,d,n:noteNum(nm),v});s+=d}
    if(s!==16)MUS_WARN.push(where+' bar '+(bi+1)+' has '+s+' sixteenths')});
  return ev;
}
const RV={X:1,x:.78,o:.46};
function parseRhy(str){const r=str.replace(/\s+/g,''),hits=[];
  for(let i=0;i<r.length;i++)if(RV[r[i]]){let d=1;while(r[i+d]==='-')d++;hits.push({s:i,d,v:RV[r[i]]})}
  return{len:Math.max(16,Math.ceil(r.length/16)*16),hits}}

/* ---------------- the band ---------------- */
/* a noise burst through a filter (drums, breaths, risers) */
function mNoise(P,dest,t,o){const c=P.c,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=P.rig.noise;s.loop=true;f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);f.Q.value=o.q||.8;
  if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+(o.sweep||o.dur));
  const a=o.a||.002;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(o.vol,t+a);g.gain.setTargetAtTime(0,t+a,o.dur/4);
  s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random()*.8);s.stop(t+o.dur*1.6+a)}
/* one sine partial with its own decay (mallets, bells) */
function mPart(P,dest,t,f,pk,tc,stop){const c=P.c,o=c.createOscillator(),g=c.createGain();o.frequency.value=f;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.002);g.gain.setTargetAtTime(0,t+.002,tc);
  if(stop)g.gain.setTargetAtTime(0,stop,.05);o.connect(g);g.connect(dest);o.start(t);o.stop(t+Math.min(tc*6,(stop||1e9)-t+.3)+.01)}
const INS={
  /* electric piano (two-operator FM, like a Rhodes): bright when struck, then a mellow ring */
  ep(P,ch,t,n,d,v){const c=P.c,f=mtof(n),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();
    car.frequency.value=f;mod.frequency.value=f;P.wob(car);
    mg.gain.setValueAtTime(f*(.5+1.5*v)*(P.s.epBright||1),t);mg.gain.setTargetAtTime(f*.1,t,.16);mod.connect(mg);mg.connect(car.frequency);
    const pk=.13*v,dec=Math.max(.45,1.5-(n-55)*.03);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.004);g.gain.setTargetAtTime(0,t+.004,dec);g.gain.setTargetAtTime(0,t+d,.1);
    car.connect(g);g.connect(ch);const e=t+d+.7;car.start(t);mod.start(t);car.stop(e);mod.stop(e)},
  /* warm pad: a chord of slightly detuned saws through one slowly opening filter */
  pad(P,ch,t,notes,d,v){const c=P.c,f=c.createBiquadFilter(),g=c.createGain(),top=P.s.padTop||1500,rel=1.6;
    f.type='lowpass';f.Q.value=.6;f.frequency.setValueAtTime(top*.3,t);f.frequency.linearRampToValueAtTime(top,t+Math.min(2.4,d*.6));f.frequency.linearRampToValueAtTime(top*.45,t+d+rel);
    const pk=.05*v,at=Math.min(.9,d*.35);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+at);g.gain.setValueAtTime(pk,t+d);g.gain.linearRampToValueAtTime(0,t+d+rel);
    for(const n of notes)for(const dt of P.lite?[0]:[-8,8]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=mtof(n);o.detune.value=dt;P.wob(o);o.connect(f);o.start(t);o.stop(t+d+rel+.05)}
    f.connect(g);g.connect(ch)},
  /* plucked synth for arpeggios: a saw whose filter snaps shut */
  pluck(P,ch,t,n,d,v){const c=P.c,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=mtof(n);P.wob(o);
    f.type='lowpass';f.Q.value=2.2;f.frequency.setValueAtTime(600+2600*v*(P.s.pluckBright||1),t);f.frequency.setTargetAtTime(360,t,.06);
    const pk=.17*v;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.003);g.gain.setTargetAtTime(0,t+.003,.15);g.gain.setTargetAtTime(0,t+d,.05);
    o.connect(f);f.connect(g);g.connect(ch);o.start(t);o.stop(t+d+.5)},
  /* the menu's lead: a soft square-and-triangle voice with a filter blip and a little vibrato on held notes */
  lead(P,ch,t,n,d,v){const c=P.c,fr=mtof(n),o1=c.createOscillator(),o2=c.createOscillator(),m=c.createGain(),f=c.createBiquadFilter(),g=c.createGain();
    o1.type='triangle';o2.type='square';o1.frequency.value=fr;o2.frequency.value=fr;o2.detune.value=5;m.gain.value=.2;o2.connect(m);
    f.type='lowpass';f.Q.value=1.1;f.frequency.setValueAtTime(fr*7+1500,t);f.frequency.setTargetAtTime(fr*2.6+700,t,.1);
    if(d>.3){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=5.4;lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,t+.18);lg.gain.linearRampToValueAtTime(fr*.006,t+.45);
      l.connect(lg);lg.connect(o1.frequency);lg.connect(o2.frequency);l.start(t);l.stop(t+d+.3)}
    const pk=.3*v,end=t+Math.max(.06,d-.02);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.006);g.gain.setTargetAtTime(pk*.6,t+.006,.2);g.gain.setTargetAtTime(0,end,.07);
    o1.connect(f);m.connect(f);f.connect(g);g.connect(ch);o1.start(t);o2.start(t);o1.stop(end+.5);o2.stop(end+.5)},
  /* marimba: a wooden bar (fundamental, the 4th partial, a knock) */
  mallet(P,ch,t,n,d,v){const f=mtof(n),pk=.4*v;mPart(P,ch,t,f,pk,.3);mPart(P,ch,t,f*3.98,pk*.22,.04);mPart(P,ch,t,f*9.8,pk*.05,.012)},
  /* kalimba: a thumb-piano tine (a round fundamental and a bright, quickly fading overtone) */
  kalimba(P,ch,t,n,d,v){const f=mtof(n),pk=.4*v;mPart(P,ch,t,f,pk,.5);mPart(P,ch,t,f*5.95,pk*.13,.05);mPart(P,ch,t,f*2,pk*.05,.12)},
  /* glockenspiel bell */
  bell(P,ch,t,n,d,v){const f=mtof(n),pk=.24*v;mPart(P,ch,t,f,pk,.6);mPart(P,ch,t,f*2.76,pk*.32,.2);mPart(P,ch,t,f*5.4,pk*.12,.07)},
  /* flute-like whistle: a breathy start, then a pure tone with vibrato */
  flute(P,ch,t,n,d,v){const c=P.c,fr=mtof(n),o=c.createOscillator(),o2=c.createOscillator(),m=c.createGain(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();
    o.frequency.value=fr;o2.type='triangle';o2.frequency.value=fr*2;m.gain.value=.08;o2.connect(m);
    l.frequency.value=5;lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,t+.15);lg.gain.linearRampToValueAtTime(fr*.007,t+.4);l.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
    const pk=.24*v,end=t+Math.max(.08,d-.03),at=P.s.fluteAttack||.05;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+at);g.gain.setTargetAtTime(pk*.82,t+at,.25);g.gain.setTargetAtTime(0,end,.09);
    o.connect(g);m.connect(g);g.connect(ch);mNoise(P,ch,t,{type:'bandpass',f:fr*1.6,q:2,vol:pk*.35,dur:.12,a:.02});
    for(const x of[o,o2,l]){x.start(t);x.stop(end+.6)}},
  /* bass: a sine for weight plus a filtered saw so it is still heard on a phone speaker; 'pizz' plucks short */
  bass(P,ch,t,n,d,v){const c=P.c,f=mtof(n),o=c.createOscillator(),s=c.createOscillator(),sg=c.createGain(),lp=c.createBiquadFilter(),g=c.createGain(),pz=P.s.pizz;
    o.frequency.value=f;s.type='sawtooth';s.frequency.value=f;sg.gain.value=P.s.bassGrit||.35;
    lp.type='lowpass';lp.Q.value=1.4;lp.frequency.setValueAtTime(f*(pz?9:6)+250,t);lp.frequency.setTargetAtTime(f*2.5+160,t,pz?.06:.12);
    const pk=.15*v,end=t+Math.max(.05,d-.015);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.006);g.gain.setTargetAtTime(pk*(pz?0:.75),t+.006,pz?.2:.35);g.gain.setTargetAtTime(0,end,.04);
    s.connect(sg);sg.connect(lp);o.connect(lp);lp.connect(g);g.connect(ch);o.start(t);s.start(t);o.stop(end+.3);s.stop(end+.3)},
  /* ---- drums ---- */
  kick(P,ch,t,v){const c=P.c,o=c.createOscillator(),g=c.createGain(),hi=P.s.kickHi||150;
    o.frequency.setValueAtTime(hi,t);o.frequency.exponentialRampToValueAtTime(47,t+.09);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*v,t+.002);g.gain.setTargetAtTime(0,t+.002,P.s.kickLen||.11);
    o.connect(g);g.connect(ch);o.start(t);o.stop(t+.7);mNoise(P,ch,t,{type:'highpass',f:2600,vol:.08*v,dur:.012});P.pumpAt(t)},
  snare(P,ch,t,v){const c=P.c,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(205,t);o.frequency.exponentialRampToValueAtTime(165,t+.06);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*v,t+.002);g.gain.setTargetAtTime(0,t+.002,.045);o.connect(g);g.connect(ch);o.start(t);o.stop(t+.4);
    mNoise(P,ch,t,{type:'bandpass',f:P.s.snareF||2000,q:.7,vol:.32*v,dur:.2})},
  clap(P,ch,t,v){for(let i=0;i<3;i++)mNoise(P,ch,t+i*.011,{type:'bandpass',f:1250,q:1.1,vol:.2*v,dur:.02});mNoise(P,ch,t+.033,{type:'bandpass',f:1150,q:.9,vol:.24*v,dur:.22})},
  hat(P,ch,t,v){mNoise(P,ch,t,{type:'highpass',f:7600,vol:.45*v,dur:.05})},
  ohat(P,ch,t,v){mNoise(P,ch,t,{type:'highpass',f:6800,vol:.2*v,dur:.32})},
  shaker(P,ch,t,v){mNoise(P,ch,t,{type:'bandpass',f:6400,q:1.3,vol:.36*v,dur:.07,a:.008})},
  rim(P,ch,t,v){mPart(P,ch,t,1720,.2*v,.014);mNoise(P,ch,t,{type:'bandpass',f:2600,q:3,vol:.26*v,dur:.03})},
  tom(P,ch,t,v,f=120){const c=P.c,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f*1.5,t);o.frequency.exponentialRampToValueAtTime(f,t+.08);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.42*v,t+.003);g.gain.setTargetAtTime(0,t+.003,.12);o.connect(g);g.connect(ch);o.start(t);o.stop(t+.8)},
  /* a soft cymbal swell at the top of a section, and a rising wash before one */
  crash(P,ch,t,v){mNoise(P,ch,t,{type:'highpass',f:4200,vol:.16*v,dur:1.6,a:.004});mNoise(P,ch,t,{type:'bandpass',f:9000,q:.6,vol:.08*v,dur:.9})},
  riser(P,ch,t,v,len){mNoise(P,ch,t,{type:'bandpass',f:500,f2:7000,sweep:len,q:1.4,vol:.13*v,dur:len*.28,a:len*.92})}
};
const DRUM={k:'kick',s:'snare',c:'clap',h:'hat',oh:'ohat',sh:'shaker',r:'rim',t:'tom'};

/* ---------------- the songs ---------------- */
/* chord dictionary entries: [bass note, electric-piano voicing, pad voicing] */
const ch_=(b,k,p)=>({b,k,p:p||k.map(n=>n+12)});
SONGS.menu={id:'menu',title:'Pop Parade',bpm:108,swing:0,key:5,gain:.72,
  padTop:1700,kickHi:165,
  chords:{F:ch_(41,[57,60,64,67],[65,69,72]),Am7:ch_(45,[55,60,64,69],[64,69,72]),Bbmaj7:ch_(46,[57,60,62,65],[62,65,70]),
    C:ch_(48,[55,60,64,67],[64,67,72]),Csus:ch_(48,[55,60,65,67],[65,67,72]),C7:ch_(48,[55,58,64,67],[64,67,70]),
    Dm7:ch_(50,[57,60,62,65],[62,65,69]),Gm7:ch_(43,[55,58,62,65],[62,65,70]),'F/A':ch_(45,[57,60,64,67],[65,69,72]),
    Bb:ch_(46,[58,60,62,65],[62,65,70]),C7sus:ch_(48,[55,58,60,65],[65,67,70])},
  ins:{keys:'ep',pad:'pad',bass:'bass',arp:'pluck',lead:'lead',lead2:'mallet',dbl:'bell'},
  mix:{keys:{vol:.75,pan:-.12,verb:.22,pump:1,ch:1},pad:{vol:.9,verb:.35,pump:1,ch:1},bass:{vol:.95,pump:.5},arp:{vol:.55,pan:.3,verb:.15,dly:.3,pump:1},
    lead:{vol:.95,pan:.05,verb:.25,dly:.22},lead2:{vol:.9,pan:-.2,verb:.3,dly:.18},dbl:{vol:.55,pan:.25,verb:.4,dly:.2},drums:{vol:.85},perc:{vol:.8,pan:.22}},
  drums:{
    popA:{k:'x.....x.x.......',c:'....x.......x...',h:'..x...x...x...x.'},
    popB:{k:'X.....x.x.....x.',c:'....X.......X...',h:'x.x.x.x.x.x.x.xo',sh:'.o.o.o.o.o.o.o.o'},
    popA2:{k:'x.....x.x.......',c:'....x.......x...',h:'..x...x...x...x.',sh:'.o.o.o.o.o.o.o.o'},
    half:{k:'x...............x.........x.....',r:'........x...............x.......',sh:'o...o...o...o...'},
    fill:{k:'x.....x.x.......',s:'........o.oxoxXX',c:'....x...........'},
    fillB:{k:'X.....x.x.......',c:'....X...........',t:'........x.x.x.xx'}},
  mel:{
    A:  '_A4:3 C5:3 F5:4 E5:2 C5:4 | r:2 E5:4 D5:2 C5:4 A4:4 | D5:3 F5:3 A5:4 G5:2 F5:4 | E5:6 F5:2 G5:8 |'+
        '_A4:3 C5:3 F5:4 E5:2 C5:4 | r:2 E5:4 G5:2 A5:4 G5:4 | F5:4 D5:4 D5:2 F5:2 G5:4 | F5:8 E5:8',
    hook:'r:2 C5:2 D5:2 ^F5:6 D5:2 F5:2 | ^G5:6 F5:2 E5:4 C5:4 | r:2 C5:2 D5:2 ^E5:6 G5:2 E5:2 | D5:6 C5:2 A4:8 |'+
        'r:2 C5:2 D5:2 ^F5:6 D5:2 F5:2 | ^G5:6 A5:2 Bb5:4 A5:2 G5:2 | ^A5:6 G5:2 F5:4 D5:4 | G5:4 F5:2 E5:2 E5:4 C5:2 E5:2',
    bridge:'A5:8 G5:4 F5:4 | D5:16 | F5:8 E5:4 D5:4 | C5:16 | A5:8 G5:4 F5:4 | D5:8 F5:8 | Bb5:8 A5:4 G5:4 | G5:8 E5:8'},
  sections:{
    intro:{bars:4,ch:'F Am7 Bbmaj7 Csus,C',pad:.7,keys:{r:'x---------------',v:.55},arp:{r:'x.x.x.x.x.x.x.x.',seq:[0,1,2,3,4,3,2,1],v:.45},riser:1},
    A:{bars:8,ch:'F Am7 Bbmaj7 C F Am7 Bbmaj7,Gm7 Csus,C',pad:.55,keys:{r:'x-----x---x-----',v:.7},
      bass:{r:'x--x--x-x--x--x-',seq:[0,0,12,0,7,12]},drums:'popA',lead2:'A',crash:1,fill:'fill'},
    B:{bars:8,ch:'Bb C Am7 Dm7 Bb C F/A,Dm7 Gm7,C7',pad:.8,keys:{r:'x--x--x-x--x--x-',v:.6},
      bass:{r:'x-x-x-x-x-x-x-x-',seq:[0,0,12,0,0,12,0,7]},drums:'popB',lead:'hook',crash:1,fill:'fillB'},
    A2:{bars:8,ch:'F Am7 Bbmaj7 C F Am7 Bbmaj7,Gm7 Csus,C',pad:.6,keys:{r:'x-----x---x-----',v:.7},
      bass:{r:'x--x--x-x--x--x-',seq:[0,0,12,0,7,12]},drums:'popA2',lead2:'A',arp:{r:'x.x.x.x.x.x.x.x.',seq:[0,2,1,3,2,4,3,1],v:.4,oct:1},crash:1,fill:'fill'},
    B2:{bars:8,ch:'Bb C Am7 Dm7 Bb C F/A,Dm7 Gm7,C7',pad:.85,keys:{r:'x--x--x-x--x--x-',v:.62},
      bass:{r:'x-x-x-x-x-x-x-x-',seq:[0,0,12,0,0,12,0,7]},drums:'popB',lead:'hook',dbl:'hook',arp:{r:'xxxxxxxxxxxxxxxx',seq:[0,1,2,3,4,3,2,1],v:.3,oct:1},crash:1,fill:'fillB'},
    bridge:{bars:8,ch:'Dm7 Bbmaj7 Gm7 C7sus Dm7 Bbmaj7 Gm7 C7sus,C7',pad:.9,keys:{r:'x-------x-------',v:.5},
      bass:{r:'x---------------',seq:[0]},drums:'half',lead:'bridge',riser:1}},
  order:['intro','A','B','A2','B2','bridge','B2'],loopTo:1};

SONGS.garden={id:'garden',title:'Garden Groove',bpm:84,swing:.2,key:2,gain:.74,
  padTop:1100,kickHi:120,kickLen:.13,snareF:1500,wobble:7,crackle:.018,epBright:.8,bassGrit:.2,
  chords:{Gmaj9:ch_(43,[59,62,66,69],[62,66,71]),'F#m7':ch_(42,[57,61,64,68],[61,64,69]),Em9:ch_(40,[55,59,62,66],[59,62,67]),
    A9sus:ch_(45,[55,59,62,64],[62,64,69]),A7:ch_(45,[55,61,64,66],[61,64,67]),Bm9:ch_(47,[57,61,62,66],[62,66,69]),
    Gm6:ch_(43,[58,62,64,67],[62,64,70])},
  ins:{keys:'ep',pad:'pad',bass:'bass',arp:'bell',lead:'kalimba',lead2:'flute'},
  mix:{keys:{vol:.95,pan:-.1,verb:.3,pump:.6,ch:1,lp:5000},pad:{vol:.7,verb:.45,ch:1,pump:.6},bass:{vol:1},arp:{vol:.8,pan:.3,verb:.4,dly:.35},
    lead:{vol:1,pan:.12,verb:.3,dly:.25},lead2:{vol:.8,pan:-.15,verb:.4,dly:.2},drums:{vol:.95,lp:7000},perc:{vol:.75,pan:.2,lp:9000}},
  drums:{
    boom:{k:'x.........x..x..',s:'....x.......x...',h:'x.o.x.o.x.o.x.oo'},
    boom2:{k:'x......x..x.....',s:'....x.......x..o',h:'x.o.x.o.x.oox.o.',sh:'..o...o...o...o.'},
    fill:{k:'x.........x.....',s:'....x.....o.xoxx',h:'x.o.x.o.x.......'}},
  mel:{
    A:'r:2 B4:2 D5:2 F#5:6 E5:4 | r:2 A4:2 C#5:2 E5:6 C#5:2 A4:2 | B4:8 r:4 D5:2 E5:2 | F#5:4 E5:4 C#5:8 |'+
      'r:2 B4:2 D5:2 F#5:4 A5:2 F#5:4 | E5:4 C#5:2 A4:6 B4:4 | D5:4 E5:2 G5:6 F#5:4 | E5:8 r:8',
    B:'F#5:6 E5:2 D5:4 C#5:4 | B4:6 A4:2 B4:4 D5:4 | E5:6 F#5:2 G5:4 B5:4 | A5:8 G#5:4 E5:4 |'+
      'F#5:6 E5:2 D5:4 C#5:4 | B4:6 A4:2 B4:2 D5:2 F#5:4 | E5:6 D5:2 Bb4:8 | A4:8 C#5:4 E5:4'},
  sections:{
    intro:{bars:4,ch:'Gmaj9 F#m7 Em9 A9sus,A7',keys:{r:'x-----x--x------',v:.6},pad:.5,fill:'fill'},
    A:{bars:8,ch:'Gmaj9 F#m7 Em9 A9sus,A7 Gmaj9 F#m7 Em9 A9sus,A7',keys:{r:'x-----x--x------',v:.72},bass:{r:'x-------x-----x-',seq:[0,7,12]},drums:'boom',fill:'fill'},
    A2:{bars:8,ch:'Gmaj9 F#m7 Em9 A9sus,A7 Gmaj9 F#m7 Em9 A9sus,A7',keys:{r:'x-----x--x------',v:.7},bass:{r:'x-------x-----x-',seq:[0,7,12]},drums:'boom2',lead:'A',pad:.35,fill:'fill'},
    B:{bars:8,ch:'Bm9 Gmaj9 Em9 F#m7 Bm9 Gmaj9 Gm6 A9sus,A7',keys:{r:'x-----x--x------',v:.7},bass:{r:'x-------x-----x-',seq:[0,7,12]},drums:'boom2',lead2:'B',pad:.6,crash:1,fill:'fill'},
    down:{bars:4,ch:'Em9 F#m7 Gmaj9 A9sus,A7',keys:{r:'x---------------',v:.55},pad:.7,arp:{r:'x..x..x...x..x..',seq:[0,2,4,3,5,6],v:.6,oct:1},riser:1}},
  order:['intro','A','A2','B','A2','down','B'],loopTo:1};

SONGS.bounce={id:'bounce',title:'Brain Bounce',bpm:100,swing:.08,key:-2,gain:.68,
  padTop:1400,pizz:1,kickHi:140,epBright:1.15,bassGrit:.5,
  chords:{Bbmaj7:ch_(46,[57,60,62,65],[62,65,69]),Gm7:ch_(43,[57,58,62,65],[62,65,70]),Cm7:ch_(48,[55,58,62,63],[63,67,70]),
    F7:ch_(41,[57,60,63,67],[63,69,72]),F7sus:ch_(41,[55,58,63,65],[65,70,72]),Ebmaj7:ch_(39,[58,62,65,67],[63,67,70]),
    Dm7:ch_(50,[57,60,62,65],[62,65,69])},
  ins:{keys:'ep',pad:'pad',bass:'bass',arp:'mallet',lead:'flute',lead2:'mallet'},
  mix:{keys:{vol:.75,pan:-.18,verb:.2,ch:1},pad:{vol:.5,verb:.4,ch:1},bass:{vol:1.05},arp:{vol:.8,pan:.28,verb:.25,dly:.15},
    lead:{vol:1,pan:.08,verb:.3,dly:.2},lead2:{vol:.8,pan:-.25,verb:.3,dly:.15},drums:{vol:.85},perc:{vol:.9,pan:-.2}},
  drums:{
    bossa:{k:'x......xx......x',r:'x..x..x...x..x..',sh:'xooxooxoxooxooxo'},
    bossa2:{k:'x......xx......x',r:'x..x..x...x..x..',sh:'xooxooxoxooxooxo',h:'..x...x...x...x.'},
    fill:{k:'x......x........',r:'x..x..x.........',t:'........x.x.xx.x'}},
  mel:{
    A:'D5:2 F5:2 A5:4 G5:2 F5:2 D5:4 | Bb4:6 r:2 C5:2 D5:2 F5:4 | Eb5:2 G5:2 Bb5:4 A5:2 G5:2 Eb5:4 | C5:6 r:2 Eb5:2 D5:2 C5:2 A4:2 |'+
      'D5:2 F5:2 A5:4 G5:2 F5:2 D5:4 | Bb4:6 r:2 D5:2 F5:2 A5:4 | G5:4 F5:2 Eb5:2 D5:4 C5:4 | Bb4:8 A4:4 C5:4',
    B:'G5:6 F5:2 G5:2 Bb5:2 G5:4 | F5:6 D5:2 F5:2 A5:2 F5:4 | Eb5:6 D5:2 Eb5:2 G5:2 Bb5:4 | A5:8 G5:4 Eb5:4 |'+
      'G5:6 F5:2 G5:2 Bb5:2 D6:4 | C6:6 A5:2 F5:4 D5:4 | D5:4 F5:4 Eb5:4 G5:4 | F5:8 Eb5:4 A4:4',
    cnt:'G4:4 r:4 Bb4:4 r:4 | F4:4 r:4 A4:4 r:4 | G4:4 r:4 Eb5:4 r:4 | A4:4 r:4 C5:4 r:4 |'+
      'G4:4 r:4 Bb4:4 r:4 | F4:4 r:4 A4:4 r:4 | Bb4:4 r:4 G4:4 r:4 | F4:4 r:4 A4:4 r:4'},
  sections:{
    intro:{bars:2,ch:'Ebmaj7 F7sus',keys:{r:'x-.x-.x-.x-.x-x-',v:.6},bass:{r:'x-----x-x-----x-',seq:[0,7,7,0]},drums:'bossa'},
    A:{bars:8,ch:'Bbmaj7 Gm7 Cm7 F7 Bbmaj7 Gm7 Cm7 F7sus,F7',keys:{r:'x-.x-.x-.x-.x-x-',v:.65},bass:{r:'x-----x-x-----x-',seq:[0,7,7,0]},drums:'bossa',arp:{r:'x.x...x.x.x...x.',seq:[2,3,1,2,0,1],v:.55,oct:1},fill:'fill'},
    A2:{bars:8,ch:'Bbmaj7 Gm7 Cm7 F7 Bbmaj7 Gm7 Cm7 F7sus,F7',keys:{r:'x-.x-.x-.x-.x-x-',v:.65},bass:{r:'x-----x-x-----x-',seq:[0,7,7,0]},drums:'bossa2',lead:'A',crash:1,fill:'fill'},
    B:{bars:8,ch:'Ebmaj7 Dm7 Cm7 F7 Ebmaj7 Dm7 Gm7,Cm7 F7sus,F7',keys:{r:'x-.x-.x-.x-.x-x-',v:.65},bass:{r:'x-----x-x-----x-',seq:[0,7,7,0]},drums:'bossa2',lead:'B',pad:.6,crash:1,fill:'fill'},
    B2:{bars:8,ch:'Ebmaj7 Dm7 Cm7 F7 Ebmaj7 Dm7 Gm7,Cm7 F7sus,F7',keys:{r:'x-.x-.x-.x-.x-x-',v:.65},bass:{r:'x-----x-x-----x-',seq:[0,7,7,0]},drums:'bossa2',lead:'B',lead2:'cnt',pad:.7,fill:'fill'}},
  order:['intro','A','A2','B','A2','B2'],loopTo:1};

SONGS.star={id:'star',title:'Starlight',bpm:72,swing:.1,key:0,gain:.8,
  padTop:1300,kickHi:110,kickLen:.14,wobble:4,fluteAttack:.09,epBright:.7,bassGrit:.18,
  chords:{Fmaj9:ch_(41,[57,60,64,67],[64,69,72]),G6:ch_(43,[59,62,64,69],[62,67,71]),Em7:ch_(40,[55,59,62,64],[59,64,67]),
    Am9:ch_(45,[55,59,60,64],[60,64,69]),Dm9:ch_(38,[53,57,60,64],[62,65,69]),Cmaj7:ch_(48,[55,59,62,64],[64,67,71]),
    E7:ch_(40,[56,59,62,64],[59,64,68])},
  ins:{keys:'ep',pad:'pad',bass:'bass',arp:'bell',lead:'flute',lead2:'kalimba',dbl:'bell'},
  mix:{dbl:{vol:.45,pan:.2,verb:.5,dly:.3},keys:{vol:.8,pan:-.15,verb:.4,ch:1},pad:{vol:1.1,verb:.55,ch:1},bass:{vol:.9},arp:{vol:.85,pan:.3,verb:.5,dly:.45},
    lead:{vol:.95,pan:.08,verb:.45,dly:.25},lead2:{vol:.85,pan:-.2,verb:.45,dly:.3},drums:{vol:.7,lp:6000},perc:{vol:.7,pan:.25}},
  drums:{
    soft:{k:'x.........x.....',r:'........x.......',sh:'x.o.x.o.x.o.x.o.'},
    soft2:{k:'x.........x.....',r:'........x.....o.',sh:'x.o.x.o.x.o.x.o.',oh:'..............x.'}},
  mel:{
    A:'E5:6 G5:2 A5:8 | G5:4 E5:4 D5:8 | B4:6 D5:2 E5:8 | C5:8 B4:4 A4:4 |'+
      'A4:6 C5:2 F5:8 | E5:4 D5:4 B4:8 | G4:4 B4:4 E5:4 D5:4 | E5:6 D5:2 B4:4 G#4:4',
    B:'A5:6 G5:2 E5:8 | G5:4 E5:4 B4:8 | D5:6 E5:2 G5:8 | E5:12 r:4 |'+
      'A5:6 G5:2 E5:4 C6:4 | B5:6 G5:2 E5:8 | F5:6 E5:2 D5:4 A4:4 | B4:8 G#4:8'},
  sections:{
    intro:{bars:4,ch:'Fmaj9 G6 Em7 Am9',pad:.8,arp:{r:'x..x..x.x..x..x.',seq:[0,1,2,3,4,3],v:.55,oct:1}},
    A:{bars:8,ch:'Fmaj9 G6 Em7 Am9 Dm9 G6 Cmaj7 E7',pad:.7,keys:{r:'x-------x-----x-',v:.55},bass:{r:'x---------------',seq:[0]},arp:{r:'x..x..x.x..x..x.',seq:[0,1,2,3,4,3],v:.45,oct:1},drums:'soft',lead2:'A'},
    B:{bars:8,ch:'Fmaj9 Cmaj7 G6 Am9 Fmaj9 Cmaj7 Dm9 E7',pad:.8,keys:{r:'x-------x-----x-',v:.55},bass:{r:'x-------x-------',seq:[0,7]},drums:'soft2',lead:'B',crash:1},
    A2:{bars:8,ch:'Fmaj9 G6 Em7 Am9 Dm9 G6 Cmaj7 E7',pad:.75,keys:{r:'x-------x-----x-',v:.55},bass:{r:'x-------x-------',seq:[0,7]},arp:{r:'x..x..x.x..x..x.',seq:[0,2,4,3,5,4],v:.4,oct:1},drums:'soft2',lead:'A',crash:1},
    B2:{bars:8,ch:'Fmaj9 Cmaj7 G6 Am9 Fmaj9 Cmaj7 Dm9 E7',pad:.85,keys:{r:'x-------x-----x-',v:.55},bass:{r:'x-------x-------',seq:[0,7]},drums:'soft2',lead:'B',dbl:'B',arp:{r:'x..x..x.x..x..x.',seq:[0,1,2,3,4,3],v:.35,oct:2}}},
  order:['intro','A','B','A2','B2'],loopTo:1};

/* turn a song into bars of events, once */
function compileSong(S_){
  if(S_.bars)return S_;
  const secs={};
  for(const[name,sc]of Object.entries(S_.sections)){
    const bars=[...Array(sc.bars)].map(()=>[...Array(16)].map(()=>[]));
    const names=sc.ch.trim().split(/\s+/);if(names.length!==sc.bars)MUS_WARN.push(S_.id+'.'+name+': '+names.length+' chords for '+sc.bars+' bars');
    const chordAt=(b,s)=>{const parts=(names[b]||names[names.length-1]).split(','),nm=parts[s>=8&&parts.length>1?1:0],c=S_.chords[nm];if(!c)MUS_WARN.push(S_.id+': no chord '+nm);return c||S_.chords[Object.keys(S_.chords)[0]]};
    const put=(b,s,e)=>{if(b<sc.bars)bars[b][s].push(e)};
    for(let b=0;b<sc.bars;b++){
      /* pad: one long chord per chord change */
      if(sc.pad){const parts=(names[b]||'').split(',');parts.forEach((_,i)=>{const s=i*(16/parts.length);put(b,s,{p:'pad',notes:chordAt(b,s).p,d:16/parts.length,v:sc.pad})})}
      const lay=(part,cfg,mk)=>{if(!cfg)return;const R=parseRhy(cfg.r),cyc=R.len/16,off=(b%cyc)*16;let i=0;
        for(const h of R.hits){if(h.s<off||h.s>=off+16)continue;const s=h.s-off;mk(s,h,i++)}};
      lay('keys',sc.keys,(s,h)=>put(b,s,{p:'keys',notes:chordAt(b,s).k,d:h.d,v:h.v*(sc.keys.v||.7)}));
      lay('bass',sc.bass,(s,h,i)=>put(b,s,{p:'bass',n:chordAt(b,s).b+sc.bass.seq[i%sc.bass.seq.length],d:h.d,v:h.v*(sc.bass.v||.9)}));
      lay('arp',sc.arp,(s,h,i)=>{const c=chordAt(b,s).k,ix=sc.arp.seq[i%sc.arp.seq.length];put(b,s,{p:'arp',n:c[ix%c.length]+12*Math.floor(ix/c.length)+12*(sc.arp.oct||0),d:h.d,v:h.v*(sc.arp.v||.5)})});
      if(sc.drums&&!(sc.fill&&b===sc.bars-1))drumBar(S_.drums[sc.drums],b,(s,e)=>put(b,s,e));
      if(sc.fill&&b===sc.bars-1)drumBar(S_.drums[sc.fill],0,(s,e)=>put(b,s,e));
    }
    for(const part of['lead','lead2','dbl'])if(sc[part]){const src=S_.mel[sc[part]];if(!src){MUS_WARN.push(S_.id+': no melody '+sc[part]);continue}
      for(const e of parseMel(src,S_.id+'.'+sc[part]))put(Math.floor(e.s/16),e.s%16,{p:part,n:e.n+(part==='dbl'?12:0),d:e.d,v:e.v})}
    if(sc.crash)put(0,0,{p:'fx',fx:'crash',v:.9});
    if(sc.riser)put(sc.bars-1,0,{p:'fx',fx:'riser',v:.9});
    secs[name]=bars;
  }
  S_.bars=secs;return S_;
}
/* harmony check for tools/music-render.cjs: melody notes that rub against the chord under them */
function melodyClashes(S_){const out=[];
  for(const[name,sc]of Object.entries(S_.sections)){const names=sc.ch.trim().split(/\s+/);
    for(const part of['lead','lead2'])if(sc[part])for(const e of parseMel(S_.mel[sc[part]],'')){const b=Math.floor(e.s/16),st=e.s%16,parts=(names[b]||'').split(','),cn=parts[st>=8&&parts.length>1?1:0],c=S_.chords[cn];if(!c)continue;
      const pcs=new Set([c.b%12,...c.k.map(n=>n%12)]),pc=e.n%12;
      if(!pcs.has(pc)&&pcs.has((pc+11)%12)&&(e.d>=4||st%4===0))out.push(S_.id+'.'+name+' bar '+(b+1)+' step '+st+': '+sc[part]+' note '+e.n+' over '+cn)}}
  return out}
function drumBar(kit,b,put){if(!kit)return;for(const[k,pat]of Object.entries(kit)){const R=parseRhy(pat),cyc=R.len/16,off=(b%cyc)*16;
  for(const h of R.hits)if(h.s>=off&&h.s<off+16)put(h.s-off,{p:k==='h'||k==='oh'||k==='sh'||k==='r'?'perc':'drums',dr:DRUM[k],v:h.v})}}

/* ---------------- the mixing desk shared by every song ---------------- */
function hallIR(c,sec){const sr=c.sampleRate,len=Math.floor(sr*sec),b=c.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;
    for(let i=0;i<len;i++){const x=i/len,k=.18+.72*x;   // the tail darkens as it fades, like a real room
      lp+=((Math.random()*2-1)-lp)*(1-k);d[i]=lp*Math.pow(1-x,2.4)*(2.2+3*x)*Math.min(1,i/(sr*.006))}
    for(let r=0;r<7;r++){const at=Math.floor(sr*(.011+r*.009+Math.random()*.006));if(at<len)d[at]+=(Math.random()<.5?-1:1)*(.5-r*.05)}}
  return b}
function mkRig(c,dest,noiseBuf){
  const r={c,noise:noiseBuf};
  r.sum=c.createGain();
  r.mood=c.createBiquadFilter();r.mood.type='lowpass';r.mood.frequency.value=18000;r.mood.Q.value=.5;
  const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=38;hp.Q.value=.6;
  const air=c.createBiquadFilter();air.type='highshelf';air.frequency.value=5000;air.gain.value=3;
  r.duck=c.createGain();r.sum.connect(hp);hp.connect(air);air.connect(r.mood);r.mood.connect(r.duck);r.duck.connect(dest);
  /* hall reverb with a short pre-delay */
  r.verb=c.createConvolver();r.verb.buffer=hallIR(c,2.7);r.verbIn=c.createDelay(.1);r.verbIn.delayTime.value=.022;r.verbIn.connect(r.verb);
  const vr=c.createGain();vr.gain.value=.8;r.verb.connect(vr);vr.connect(r.sum);
  /* ping-pong delay (dotted eighths of the current song), darker on every repeat */
  r.dly=c.createGain();const d1=c.createDelay(2),d2=c.createDelay(2),fb=c.createGain(),lp=c.createBiquadFilter(),m=c.createChannelMerger(2),ret=c.createGain();
  fb.gain.value=.34;lp.type='lowpass';lp.frequency.value=2600;ret.gain.value=.55;
  r.dly.connect(d1);d1.connect(m,0,0);d1.connect(d2);d2.connect(m,0,1);d2.connect(lp);lp.connect(fb);fb.connect(d1);m.connect(ret);ret.connect(r.sum);
  r.setDelay=(sec,t)=>{d1.delayTime.setTargetAtTime(sec,t,.05);d2.delayTime.setTargetAtTime(sec,t,.05)};
  return r;
}
/* stereo chorus: two short delays swept in opposite directions (width and shimmer on keys and pads) */
function mkChorus(c){const inp=c.createGain(),out=c.createGain(),dl=c.createDelay(.05),dr=c.createDelay(.05),lfo=c.createOscillator(),lg=c.createGain(),rg=c.createGain(),m=c.createChannelMerger(2),dry=c.createGain();
  dl.delayTime.value=.013;dr.delayTime.value=.019;lfo.frequency.value=.55;lg.gain.value=.0025;rg.gain.value=-.0025;
  lfo.connect(lg);lfo.connect(rg);lg.connect(dl.delayTime);rg.connect(dr.delayTime);inp.connect(dl);inp.connect(dr);dl.connect(m,0,0);dr.connect(m,0,1);
  const wet=c.createGain();wet.gain.value=.5;m.connect(wet);wet.connect(out);dry.gain.value=.75;inp.connect(dry);dry.connect(out);
  return{inp,out,osc:lfo}}

/* ---------------- a song being played ---------------- */
function Player(rig,song,at,pos){
  const c=rig.c,P=this;P.c=c;P.rig=rig;P.s=compileSong(song);P.lite=typeof Q!=='undefined'&&Q.tier==='low';
  P.out=c.createGain();P.out.gain.value=0;const lv=c.createGain();lv.gain.value=song.gain||1;P.out.connect(lv);lv.connect(rig.sum);
  P.vs=c.createGain();P.vs.connect(rig.verbIn);P.ds=c.createGain();P.ds.connect(rig.dly);
  P.pg=c.createGain();P.pg.connect(P.out);P.oscs=[];
  /* the lo-fi tape wobble: one slow wave shared by every note's pitch */
  if(song.wobble){const l=c.createOscillator(),g=c.createGain();l.frequency.value=.45;g.gain.value=song.wobble;l.connect(g);l.start(at);P.oscs.push(l);P.wobG=g}
  P.wob=o=>{if(P.wobG)P.wobG.connect(o.detune)};
  P.ch={};
  for(const part of['keys','pad','bass','arp','lead','lead2','dbl','drums','perc','fx']){const m=(song.mix||{})[part]||{vol:.8,verb:.4};
    const g=c.createGain();g.gain.value=m.vol;let n=g;
    if(m.lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=m.lp;f.Q.value=.5;n.connect(f);n=f}
    if(m.ch&&!P.lite){const ch=mkChorus(c);n.connect(ch.inp);n=ch.out;ch.osc.start(at);P.oscs.push(ch.osc)}
    if(m.pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=m.pan;n.connect(p);n=p}
    if(m.pump){const pm=c.createGain(),dr=c.createGain();pm.gain.value=m.pump;dr.gain.value=1-m.pump;n.connect(pm);pm.connect(P.pg);n.connect(dr);dr.connect(P.out)}else n.connect(P.out);
    if(m.verb){const s=c.createGain();s.gain.value=m.verb;n.connect(s);s.connect(P.vs)}
    if(m.dly){const s=c.createGain();s.gain.value=m.dly;n.connect(s);s.connect(P.ds)}
    P.ch[part]=g}
  /* vinyl crackle under the lo-fi song: a short loop of random clicks */
  if(song.crackle&&!P.lite){const sr=c.sampleRate,b=c.createBuffer(1,sr*2,sr),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++){if(Math.random()<.0009)d[i]=(Math.random()*2-1)*(.3+Math.random()*.7);else if(Math.random()<.02)d[i]=(Math.random()*2-1)*.04}
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;s.loop=true;f.type='highpass';f.frequency.value=1800;g.gain.value=song.crackle*8;
    s.connect(f);f.connect(g);g.connect(P.out);s.start(at);P.oscs.push(s)}
  P.s16=60/song.bpm/4;P.t=at;P.sec=pos?pos.sec:0;P.bar=0;P.step=0;P.done=0;
  rig.setDelay(P.s16*3,at);
}
Player.prototype.fade=function(to,t,tc){for(const g of[this.out,this.vs,this.ds])g.gain.setTargetAtTime(to,t,tc)};
Player.prototype.pumpAt=function(t){const g=this.pg.gain;g.setTargetAtTime(.5,t,.006);g.setTargetAtTime(1,t+.035,.1)};
Player.prototype.stop=function(t){this.fade(0,t,.35);for(const o of this.oscs)try{o.stop(t+3)}catch(e){}};
/* schedule every sixteenth that starts before `until` */
Player.prototype.run=function(until,now){
  const S_=this.s;
  /* fell behind (the page was busy): skip ahead on the beat grid instead of playing a burst of late notes */
  if(this.t<now-.08){const k=Math.ceil((now-this.t)/this.s16);for(let i=0;i<k;i++)this.adv()}
  while(this.t<until){
    if(this.once&&this.done)break;   // a playlist song stops at the end of its arrangement; the next song starts there
    const name=S_.order[this.sec],bars=S_.bars[name],ev=bars[this.bar][this.step];
    let t=this.t+(this.step%2?S_.swing*this.s16:0);
    for(const e of ev)this.play(e,t+Math.random()*.007);   // a few ms of human looseness
    this.adv();
  }
};
Player.prototype.adv=function(){const S_=this.s;this.t+=this.s16;
  if(++this.step<16)return;this.step=0;
  if(++this.bar<S_.bars[S_.order[this.sec]].length)return;this.bar=0;
  if(++this.sec>=S_.order.length){this.sec=S_.loopTo||0;this.done++}};
Player.prototype.play=function(e,t){
  const S_=this.s,d=(e.d||1)*this.s16;
  if(e.dr){const v=e.v*(1+(Math.random()-.5)*.14);INS[e.dr](this,this.ch[e.p],t,v);return}
  if(e.fx){INS[e.fx](this,this.ch.fx,t,e.v,16*this.s16);return}
  const ins=INS[S_.ins[e.p]],ch=this.ch[e.p];if(!ins)return;
  if(e.p==='pad'){ins(this,ch,t,e.notes,d,e.v);return}
  if(e.notes){e.notes.forEach((n,i)=>ins(this,ch,t+i*.007,n,d,e.v*(.92+Math.random()*.14)));return}
  ins(this,ch,t,e.n,d,e.v*(.93+Math.random()*.1));
};

/* ---------------- what is playing, and when ---------------- */
const PLAYLIST=['garden','bounce','star'];
const Music={
  mode:'menu',rig:null,cur:null,timer:null,pli:0,pos:{},muffled:false,
  start(){if(!AU.ctx)return;
    if(!this.rig){this.rig=mkRig(AU.ctx,AU.musIn,AU.noise);Q.on(()=>this.muffle(Q.modal))}
    if(!this.timer)this.timer=setInterval(()=>this.tick(),45);
    this.pick();this.tick()},
  setMode(m){this.mode=m;if(this.rig)this.pick()},
  songFor(){return this.mode==='play'?PLAYLIST[this.pli%PLAYLIST.length]:'menu'},
  pick(){const id=this.songFor();if(this.cur&&this.cur.s.id===id)return;this.switchTo(id)},
  /* at: hand over exactly on a bar line (the playlist); otherwise cross-fade now (menus <-> levels) */
  switchTo(id,at){
    const c=AU.ctx,t=at||c.currentTime;
    if(this.cur){this.pos[this.cur.s.id]={sec:this.cur.sec};this.cur.stop(t);const old=this.cur;setTimeout(()=>{for(const g of[old.out,old.vs,old.ds])try{g.disconnect()}catch(e){}},(t-c.currentTime+4)*1000);this.cur=null}
    if(!S.music)return;
    /* a song comes back at the top of the section it was in (or from its start the first time) */
    const st=at||t+.12,P=new Player(this.rig,SONGS[id],st,this.pos[id]);P.fade(1,st,at?.02:.5);this.cur=P;AU.key=SONGS[id].key;
  },
  tick(){
    const c=AU.ctx;if(!c||!this.rig)return;
    if(!S.music){if(this.cur){this.pos[this.cur.s.id]={sec:this.cur.sec};this.cur.stop(c.currentTime);this.cur=null}return}
    if(c.state!=='running')return;
    if(!this.cur){this.pick();if(!this.cur)return}
    const P=this.cur;P.once=this.mode==='play';P.run(c.currentTime+.6,c.currentTime);
    /* in levels, each song plays its whole arrangement once, then the next one takes over */
    if(this.mode==='play'&&P.done>=1){this.pli++;this.switchTo(this.songFor(),P.t);this.pos[P.s.id]={sec:0}}
  },
  duck(sec){if(!this.rig)return;const g=this.rig.duck.gain,t=AU.ctx.currentTime;g.cancelScheduledValues(t);g.setTargetAtTime(.22,t,.04);g.setTargetAtTime(1,t+sec,.7)},
  /* behind a popup the music sounds as if from the next room */
  muffle(on){if(!this.rig||this.muffled===on)return;this.muffled=on;this.rig.mood.frequency.setTargetAtTime(on?1400:18000,AU.ctx.currentTime,on?.25:.4)},
  nowPlaying(){return this.cur?SONGS[this.cur.s.id].title:SONGS[this.songFor()].title}
};

/* ---------------- offline rendering (tools/music-render.cjs listens to the songs this way) ---------------- */
async function renderSong(id,sec,opt={}){
  const sr=44100,c=new OfflineAudioContext(2,sr*sec,sr),nb=c.createBuffer(1,sr,sr),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const out=c.createGain();out.gain.value=opt.gain||1;out.connect(c.destination);
  const rig=mkRig(c,out,nb),song=SONGS[id],P=new Player(rig,song,0,null);P.out.gain.value=1;P.vs.gain.value=1;P.ds.gain.value=1;
  if(opt.solo)for(const[k,g]of Object.entries(P.ch))if(!opt.solo.includes(k))g.gain.value=0;
  if(opt.from){P.sec=song.order.indexOf(opt.from)}
  P.run(sec-.5,0);
  const b=await c.startRendering();return[b.getChannelData(0),b.getChannelData(1)];
}
