'use strict';
/* ====================== Jigsaw art: the toolkit ======================
   Every jigsaw picture is a scene put together from parts: a time of day (sky, light, sun or moon), a biome (land and
   water), a main subject, a smaller side subject, scattered details and a decorative border. Picture n always comes out
   the same (it is built from a seeded random source), and the parts combine into many thousands of different pictures.
   The canvas is 300 x 400 (3:4, portrait), so a puzzle fills a phone screen.
   Subjects (js/jig/subjects-*.js) are drawn around their own origin: (0,0) is the middle of their base, up is -y and a
   subject is about 100 units tall. The composer (js/jig/compose.js) places and scales them. */
const JIGART=(()=>{
  const W=300,H=400;
  const f=n=>Math.round(n*10)/10;
  /* ---- colour ---- */
  const hex=c=>{c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(c.slice(i,i+2),16))};
  const toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t))};
  const lighten=(c,t)=>mix(c,'#ffffff',t),darken=(c,t)=>mix(c,'#000000',t);
  /* ---- svg pieces ---- */
  const st=s=>s.map(([o,c,a])=>`<stop offset="${o}" stop-color="${c}"${a!=null?` stop-opacity="${a}"`:''}/>`).join('');
  const lin=(id,s,x2=0,y2=1,x1=0,y1=0)=>`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(s)}</linearGradient>`;
  const rad=(id,s,cx=.5,cy=.5,r=.5)=>`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st(s)}</radialGradient>`;
  const P=pts=>'M'+pts.map(([x,y])=>`${f(x)} ${f(y)}`).join('L')+'Z';
  const glowDef=(id,c,a=.85)=>rad(id,[[0,c,a],[.4,c,a*.45],[1,c,0]]);
  const glow=(id,x,y,r)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${id})"/>`;
  const cloud=(x,y,s,c='#fff',o=.9)=>`<g opacity="${o}" fill="${c}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(12*s)}" ry="${f(4.5*s)}"/><circle cx="${f(x-4*s)}" cy="${f(y-3*s)}" r="${f(5*s)}"/><circle cx="${f(x+3*s)}" cy="${f(y-4.5*s)}" r="${f(6.5*s)}"/><circle cx="${f(x+8*s)}" cy="${f(y-1.5*s)}" r="${f(4*s)}"/></g>`;
  const pine=(x,y,h,c,c2)=>{const w=h*.42;return`<g><rect x="${f(x-h*.04)}" y="${f(y-h*.14)}" width="${f(h*.08)}" height="${f(h*.14)}" fill="#3b2412"/>${[0,1,2].map(i=>{const t=y-h*.12-i*h*.27,ww=w*(1-i*.25);return`<path d="${P([[x-ww,t],[x,t-h*.42],[x+ww,t]])}" fill="${i%2&&c2?c2:c}"/>`}).join('')}</g>`};
  const bird=(x,y,s,c='#2a1a3a')=>`<path d="M${f(x-3*s)} ${f(y)}q${f(1.5*s)} ${f(-1.6*s)} ${f(3*s)} 0q${f(1.5*s)} ${f(-1.6*s)} ${f(3*s)} 0" fill="none" stroke="${c}" stroke-width="${f(.7*s)}" stroke-linecap="round"/>`;
  const stars=(R,n,x0,x1,y0,y1,col='#fff')=>Array.from({length:n},()=>{const r=R();return`<circle cx="${f(x0+R()*(x1-x0))}" cy="${f(y0+R()*(y1-y0))}" r="${f(.35+r*1.1)}" fill="${col}" opacity="${f(.35+R()*.65)}"/>`}).join('');
  /* a 4-point twinkle star */
  const spark=(x,y,s,c='#fff',o=1)=>`<path d="M${f(x)} ${f(y-s)}L${f(x+s*.22)} ${f(y-s*.22)}L${f(x+s)} ${f(y)}L${f(x+s*.22)} ${f(y+s*.22)}L${f(x)} ${f(y+s)}L${f(x-s*.22)} ${f(y+s*.22)}L${f(x-s)} ${f(y)}L${f(x-s*.22)} ${f(y-s*.22)}Z" fill="${c}" opacity="${o}"/>`;
  const flower=(x,y,s,c,ctr='#ffd23a')=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M0 0V8" stroke="#3f8a3a" stroke-width="1.2"/>${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-2.6" rx="1.7" ry="2.6" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="1.5" fill="${ctr}"/></g>`;
  const tuft=(x,y,s,c)=>`<path d="M${f(x-3*s)} ${f(y)}Q${f(x-2*s)} ${f(y-5*s)} ${f(x-3.5*s)} ${f(y-8*s)}M${f(x)} ${f(y)}Q${f(x+.5*s)} ${f(y-6*s)} ${f(x)} ${f(y-10*s)}M${f(x+3*s)} ${f(y)}Q${f(x+2*s)} ${f(y-5*s)} ${f(x+4*s)} ${f(y-7.5*s)}" stroke="${c}" stroke-width="${f(1.1*s)}" fill="none" stroke-linecap="round"/>`;
  const H_={W,H,f,hex,toHex,mix,lighten,darken,st,lin,rad,P,glowDef,glow,cloud,pine,bird,stars,spark,flower,tuft};

  /* ---- times of day ----
     amb/amt: every body colour is pulled toward the ambient light by this much (o.c(colour) in a subject), so one
     drawing works at noon and at midnight. lit: windows, lamps and lanterns glow. */
  const TIMES={
    dawn:   {name:'at Dawn',     amb:'#ff9fbe',amt:.16,lit:false,sky:[[0,'#2f3a8a'],[.45,'#b980c8'],[.8,'#ffb38a'],[1,'#ffe3b0']],sun:'#fff0c8',sunY:.5, cloud:'#ffd6e4',water:['#8a7ac0','#3a3a7a'],stars:10},
    day:    {name:'',            amb:'#ffffff',amt:0,  lit:false,sky:[[0,'#2f8cff'],[.55,'#7fcbff'],[1,'#d9f4ff']],             sun:'#fffbe0',sunY:.14,cloud:'#ffffff',water:['#3fb0e8','#1a6ab8'],stars:0},
    golden: {name:'in Golden Light',amb:'#ffc070',amt:.14,lit:false,sky:[[0,'#4a8ee0'],[.5,'#9fc8f0'],[.8,'#ffd9a0'],[1,'#ffbf7a']],sun:'#fff2c0',sunY:.3,cloud:'#fff1d6',water:['#5aa0d0','#2a5a9a'],stars:0},
    sunset: {name:'at Sunset',   amb:'#ff7a5a',amt:.24,lit:true, sky:[[0,'#2a1a5e'],[.42,'#b8407a'],[.75,'#ff8a5b'],[1,'#ffd27a']],sun:'#fff0c0',sunY:.52,cloud:'#ffb0a0',water:['#c0608a','#3a1f5a'],stars:6},
    dusk:   {name:'at Dusk',     amb:'#4a3a8a',amt:.36,lit:true, sky:[[0,'#0f1440'],[.5,'#3e2a78'],[1,'#c0608a']],                sun:'#ffe9c8',sunY:.2, cloud:'#8a6ab0',water:['#5a4a9a','#1a1640'],stars:40,moon:true},
    night:  {name:'at Night',    amb:'#1a2458',amt:.5, lit:true, sky:[[0,'#04071c'],[.55,'#0f1a48'],[1,'#22306a']],                sun:'#fff6d8',sunY:.16,cloud:'#3a4a7a',water:['#1e2c66','#070c26'],stars:80,moon:true},
    aurora: {name:'under the Northern Lights',amb:'#173a4e',amt:.5,lit:true,sky:[[0,'#030a1c'],[.6,'#0c2a44'],[1,'#1a4a5a']],sun:'#f0fff8',sunY:.14,cloud:'#2a4a5a',water:['#14404a','#04141e'],stars:70,moon:true,aurora:true}
  };
  const subjects=[],biomes=[];
  /* a subject: {id, name, biomes:[biome keys], place:'ground'|'water'|'sky'|'under'|'space', w:width/height,
     draw(o) -> markup}. o = {R, id (prefix for gradient ids), c(colour) (time-of-day tint), night, t (time key)} */
  const subject=d=>{if(subjects.some(s=>s.id===d.id))throw new Error('duplicate subject '+d.id);subjects.push(d)};
  const biome=d=>biomes.push(d);
  return{W,H,h:H_,TIMES,subjects,biomes,subject,biome};
})();
