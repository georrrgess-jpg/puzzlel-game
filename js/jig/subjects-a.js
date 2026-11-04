'use strict';
/* ====================== Jigsaw subjects A: buildings, vehicles and objects ======================
   Lighthouse, windmill, castle, cabin, cottage, pagoda, pyramid, igloo, treehouse, mushroom house, barn, observatory,
   Ferris wheel, tent, train, camper van, clock tower, ice-cream cart, temple, tiki hut and rocket on the ground; boats on
   the water; a balloon, an airship and a UFO in the sky; a submarine, a shipwreck and a treasure chest under the sea; an
   astronaut, a space station and a moon buggy in space. Each draws itself around its own base (see art.js), wraps body
   colours in o.c() for the time of day, and switches its windows, lamps and flames on at night. */
(()=>{const {f,mix,lighten,darken,lin,rad,P,glowDef,glow,cloud,bird,spark}=JIGART.h;
/* ---- shared bits ---- */
/* defs most subjects need: the window-glass gradient (warm and lit at night) and the warm light halo */
const D=o=>o.night?glowDef(o.id+'g','#ffcf6a',.8)+glowDef(o.id+'f','#ff9a3a',.75)+lin(o.id+'w',[[0,'#fff6c4'],[1,'#ffb54a']]):lin(o.id+'w',[[0,o.c('#e4f6ff')],[.45,o.c('#a4dcff')],[1,o.c('#5fa8e8')]]);
const halo=(o,x,y,r)=>o.night?glow(o.id+'g',x,y,r):'';
const shadow=(o,rx,cx=0,cy=0)=>`<ellipse cx="${f(cx)}" cy="${f(cy+.4)}" rx="${f(rx)}" ry="${f(Math.min(3,Math.max(2,rx*.07)))}" fill="${o.c('#1a1028')}" opacity=".26"/>`;
const glint=(o,x,y,w,h)=>o.night?'':`<path d="${P([[x+w*.16,y+h*.66],[x+w*.52,y+h*.14],[x+w*.76,y+h*.14],[x+w*.4,y+h*.66]])}" fill="${o.c('#ffffff')}" opacity=".7"/>`;
/* a window with its top-left at x,y. k.fr frame colour, k.b glazing bars (0 none, 1 upright, 2 cross), k.arch round top, k.sw frame width */
const win=(o,x,y,w,h,k={})=>{const fr=o.c(k.fr||'#4a3220'),b=k.b??2,sw=k.sw??1.1,r=w/2;
  const sh=k.arch?`<path d="M${f(x)} ${f(y+h)}V${f(y+r)}A${f(r)} ${f(r)} 0 0 1 ${f(x+w)} ${f(y+r)}V${f(y+h)}Z"`:`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${k.rx?` rx="${k.rx}"`:''}`;
  return `${sh} fill="url(#${o.id}w)" stroke="${fr}" stroke-width="${sw}" stroke-linejoin="round"/>${halo(o,x+w/2,y+h/2,Math.max(w,h)*1.3)}${b?`<path d="M${f(x+w/2)} ${f(y)}V${f(y+h)}${b>1?`M${f(x)} ${f(y+h*(k.arch?.6:.5))}H${f(x+w)}`:''}" stroke="${fr}" stroke-width="${f(sw*.65)}"/>`:''}${glint(o,x,y+(k.arch?r*.6:0),w,h-(k.arch?r*.6:0))}`};
/* a row of plain windows drawn as one shape: L=[[x,y,w,h],...], k.arch, k.fr frame colour, k.sw frame width */
const wrow=(o,L,k={})=>`<path d="${L.map(([x,y,w,h])=>k.arch?`M${f(x)} ${f(y+h)}V${f(y+w/2)}A${f(w/2)} ${f(w/2)} 0 0 1 ${f(x+w)} ${f(y+w/2)}V${f(y+h)}Z`:`M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`).join('')}" fill="url(#${o.id}w)" stroke="${o.c(k.fr||'#4a3220')}" stroke-width="${k.sw??1}" stroke-linejoin="round"/>${o.night?L.map(([x,y,w,h])=>halo(o,x+w/2,y+h/2,Math.max(w,h)*1.05)).join(''):`<path d="${L.map(([x,y,w,h])=>{const yy=y+(k.arch?w*.3:0),hh=h-(k.arch?w*.3:0);return`M${f(x+w*.16)} ${f(yy+hh*.66)}L${f(x+w*.52)} ${f(yy+hh*.14)}H${f(x+w*.76)}L${f(x+w*.4)} ${f(yy+hh*.66)}Z`}).join('')}" fill="${o.c('#ffffff')}" opacity=".7"/>`}`;
/* a round porthole window */
const port=(o,x,y,r,fr='#8a8a9a')=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${o.id}w)" stroke="${o.c(fr)}" stroke-width="${f(r*.32)}"/>${halo(o,x,y,r*2.3)}${o.night?'':`<path d="M${f(x-r*.55)} ${f(y+r*.1)}A${f(r*.6)} ${f(r*.6)} 0 0 1 ${f(x+r*.1)} ${f(y-r*.55)}" fill="none" stroke="${o.c('#ffffff')}" stroke-width="${f(r*.22)}" stroke-linecap="round" opacity=".8"/>`}`;
/* a flame standing on x,y (s=1 is 12 tall); real light, so raw colours, with a halo at night */
const FL='M0 0C-4 0 -5.2 -3.6 -3.6 -6.4C-2.6 -8.2 -1.2 -9 -.6 -12C1.4 -10 4.6 -7.6 4.2 -3.6C4 -1.2 2.4 0 0 0Z';
const flame=(o,x,y,s)=>`${o.night?glow(o.id+'f',x,y-5*s,15*s):''}<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path d="${FL}" fill="#ff6a2a"/><path d="${FL}" fill="#ffb43a" transform="translate(0 -.4) scale(.7)"/><path d="${FL}" fill="#fff4b8" transform="scale(.36)"/></g>`;
/* a palm tree from its foot x,y: height h, top leaning by lean */
const palm=(o,x,y,h,lean=0)=>{const c=o.c,tx=x+lean,ty=y-h,tw=Math.max(1.4,h*.065),cx=x+lean*.15,cy=y-h*.55,L=h*.46;
  const B=t=>[(1-t)**2*x+2*(1-t)*t*cx+t*t*tx,(1-t)**2*y+2*(1-t)*t*cy+t*t*ty];
  let s=`<path d="M${f(x-tw)} ${f(y)}Q${f(cx-tw*.7)} ${f(cy)} ${f(tx-tw*.5)} ${f(ty)}H${f(tx+tw*.5)}Q${f(cx+tw*.7)} ${f(cy)} ${f(x+tw)} ${f(y)}Z" fill="${c('#a8743e')}"/><path d="${Array.from({length:9},(_,i)=>{const[a,b]=B((i+.6)/10),w=tw*(1-(i+.6)/20);return`M${f(a-w)} ${f(b)}Q${f(a)} ${f(b+1.3)} ${f(a+w)} ${f(b-.3)}`}).join('')}" stroke="${c('#6e4420')}" stroke-width=".7" fill="none"/>`;
  [-165,-135,-108,-72,-45,-15,-90].forEach((a,i)=>{const r=a*Math.PI/180,co=Math.cos(r),dx=co*L,dy=Math.sin(r)*L*.7+L*.32*Math.abs(co),mx=tx+dx*.5,my=ty+dy*.5-L*.22;
    s+=`<path d="M${f(tx)} ${f(ty)}Q${f(mx-co*1.5)} ${f(my-3.2)} ${f(tx+dx)} ${f(ty+dy)}Q${f(mx+co*1.2)} ${f(my+2.6)} ${f(tx)} ${f(ty)}Z" fill="${c(i%2?'#3f9a3a':'#57b84a')}"/><path d="M${f(tx)} ${f(ty)}Q${f(mx)} ${f(my)} ${f(tx+dx)} ${f(ty+dy)}" stroke="${c('#2c6e2c')}" stroke-width=".55" fill="none"/>`});
  return s+[[-1.6,1.6],[1.6,1.8],[0,3]].map(([a,b])=>`<circle cx="${f(tx+a)}" cy="${f(ty+b)}" r="${f(Math.max(1.1,h*.035))}" fill="${c('#7a4e26')}"/>`).join('')};
/* brick / stone mortar lines over a box */
const mort=(o,x0,x1,y0,y1,dy=5,bw=8,col='#9a8a72',op=.5)=>{let d='';for(let y=y1-dy,i=0;y>y0+.5;y-=dy,i++){d+=`M${f(x0)} ${f(y)}H${f(x1)}`;for(let x=x0+(i%2?bw/2:bw);x<x1-1;x+=bw)d+=`M${f(x)} ${f(y)}v${f(dy)}`}return`<path d="${d}" stroke="${o.c(col)}" stroke-width=".5" opacity="${op}" fill="none"/>`};
const pick=(o,a)=>a[Math.floor(o.R()*a.length)];

/* =================== ground =================== */
JIGART.subject({id:'lighthouse',name:'Lighthouse',biomes:['coast','island','lake','snow'],place:'ground',w:.75,draw:o=>{const c=o.c,I=o.id,n=o.night,hw=y=>16+(y+8)*6/62,
  band=(a,b)=>P([[-hw(a),a],[-hw(b),b],[hw(b),b],[hw(a),a]]),red=c('#dc3b3b'),wh=c('#f6f1ea'),dk=c('#34303e');
  return `<defs>${D(o)}${lin(I+'s',[[0,c('#ffffff'),.42],[.38,c('#ffffff'),0],[.6,c('#000000'),0],[1,c('#000000'),.3]],1,0)}${rad(I+'r',[[0,c('#b8b6c2')],[1,c('#5a566a')]],.35,.3,.8)}${rad(I+'d',[[0,c('#ff7a68')],[1,c('#a8262a')]],.3,.3,.9)}${n?lin(I+'b',[[0,'#fff4c0',.7],[1,'#fff4c0',0]],1,0)+glowDef(I+'L','#fff0b0',1):''}</defs>
  ${n?`<path d="M4 -88L64 -102V-74Z" fill="url(#${I}b)"/><path d="M4 -88L64 -102V-74Z" fill="url(#${I}b)" transform="scale(-1 1)"/>`:''}${shadow(o,42)}
  ${[[-24,-3,11,6],[26,-3,12,6.5],[-34,0,7,4],[36,0,7,3.5]].map(([x,y,a,b])=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="url(#${I}r)"/><ellipse cx="${f(x-a*.3)}" cy="${f(y-b*.45)}" rx="${f(a*.35)}" ry="${f(b*.22)}" fill="${c('#ffffff')}" opacity=".3"/>`).join('')}
  <path d="${band(-8,-24)}" fill="${wh}"/><path d="${band(-24,-40)}" fill="${red}"/><path d="${band(-40,-56)}" fill="${wh}"/><path d="${band(-56,-70)}" fill="${red}"/><path d="${band(-8,-70)}" fill="url(#${I}s)"/>
  <path d="M${f(-hw(-24))} -24H${f(hw(-24))}M${f(-hw(-40))} -40H${f(hw(-40))}M${f(-hw(-56))} -56H${f(hw(-56))}" stroke="${c('#8a2024')}" stroke-width=".6" opacity=".6"/>
  <rect x="-20" y="-11" width="40" height="6" rx="1.2" fill="${c('#a8a4b0')}"/><rect x="-20" y="-11" width="40" height="1.5" rx=".7" fill="${c('#d8d4de')}"/>${mort(o,-20,20,-9.5,-5,4.5,6,'#6a6676',.5)}
  <path d="M-5 -11V-21A5 5 0 0 1 5 -21V-11Z" fill="${c('#2c6a84')}" stroke="${c('#1c3a4a')}" stroke-width="1"/><path d="M-1.7 -25V-11M1.7 -25V-11" stroke="${c('#1c3a4a')}" stroke-width=".5"/><circle cx="3" cy="-16.5" r=".6" fill="${c('#ffd84a')}"/>
  <rect x="-1.5" y="-30.5" width="3" height="3.4" rx=".6" fill="${n?'#ffe9a0':c('#fff2c0')}" stroke="${dk}" stroke-width=".5"/>${halo(o,0,-29,7)}
  <circle cx="10.5" cy="-16" r="2.8" fill="none" stroke="${c('#ffffff')}" stroke-width="1.6"/><circle cx="10.5" cy="-16" r="2.8" fill="none" stroke="${red}" stroke-width="1.6" stroke-dasharray="2.2 2.2"/>
  ${win(o,-7.5,-37,5,7,{arch:1,b:1,fr:'#34303e'})}${win(o,2,-53,4.8,6.6,{arch:1,b:1,fr:'#34303e'})}${win(o,-5.5,-67,4.4,6,{arch:1,b:1,fr:'#34303e'})}
  ${[-12,-6,0,6,12].map(x=>`<path d="M${x-1.4} -73V-71L${x} -68.5L${x+1.4} -71V-73Z" fill="${dk}"/>`).join('')}
  <rect x="-9" y="-82" width="18" height="8" fill="${wh}"/><rect x="-9" y="-82" width="18" height="8" fill="url(#${I}s)"/>
  <rect x="-7.5" y="-94" width="15" height="12" fill="${n?'#fff6cc':c('#cdeeff')}" stroke="${dk}" stroke-width="1"/><circle cx="0" cy="-88" r="3.6" fill="${n?'#ffffff':c('#ffd970')}"/>${n?glow(I+'L',0,-88,24):`<path d="M-6 -84L-2 -93M3.5 -84L6.5 -90" stroke="${c('#ffffff')}" stroke-width="1" opacity=".8"/>`}
  <path d="M-2.5 -94V-82M2.5 -94V-82" stroke="${dk}" stroke-width="1"/>
  <rect x="-16" y="-75.5" width="32" height="3.4" rx=".8" fill="${dk}"/><path d="M-15.5 -81H15.5${[-15,-11.25,-7.5,-3.75,0,3.75,7.5,11.25,15].map(x=>`M${x} -81V-75.5`).join('')}" stroke="${dk}" stroke-width=".8"/>
  <path d="M-11 -94Q-10.5 -101.5 0 -105.5Q10.5 -101.5 11 -94Z" fill="url(#${I}d)"/><rect x="-11.5" y="-95.4" width="23" height="2.2" rx="1.1" fill="${c('#8a2024')}"/><path d="M-6 -97Q-4 -102 0 -103.5" stroke="${c('#ffffff')}" stroke-width=".9" opacity=".45" fill="none"/>
  <circle cx="0" cy="-106.6" r="1.8" fill="${dk}"/><rect x="-.4" y="-110" width=".8" height="3" fill="${dk}"/>`}});

JIGART.subject({id:'windmill',name:'Windmill',biomes:['meadow','farm','lake','autumn'],place:'ground',w:.8,draw:o=>{const c=o.c,I=o.id,R=o.R,hw=y=>21+y*9/62,a=f(33+R()*24),wd=c('#5a3a22'),
  fac=(p,q,col)=>`<path d="${P([[hw(-4)*p,-4],[hw(-62)*p,-62],[hw(-62)*q,-62],[hw(-4)*q,-4]])}" fill="${c(col)}"/>`,
  tul=(x,y)=>{const t=c(pick(o,['#ff4a5a','#ffcf3a','#ff8ad0','#ff7a2a','#c86aff']));return`<path d="M${x} ${y}V${y-5}" stroke="${c('#3f8a3a')}" stroke-width=".7"/><path d="M${x-1.4} ${y-4.6}Q${x} ${y-2.6} ${x+1.4} ${y-4.6}V${y-7}L${x+.5} ${y-6}L${x} ${y-7.4}L${x-.5} ${y-6}L${x-1.4} ${y-7}Z" fill="${t}"/>`},
  sail=`<rect x="-5.2" y="-47" width="16" height="36" fill="${c('#f8f0e0')}" opacity=".0"/><rect x="1.3" y="-47" width="9.5" height="36" fill="${c('#faf2e2')}"/><rect x="7" y="-47" width="3.8" height="36" fill="${c('#000000')}" opacity=".07"/>
    <path d="${Array.from({length:10},(_,i)=>`M-5 ${-47+i*4}H10.8`).join('')}M-5 -47V-11M10.8 -47V-11M6 -47V-11" stroke="${c('#7a5434')}" stroke-width=".7" fill="none"/><rect x="-1.3" y="-49" width="2.6" height="49" rx="1" fill="${c('#6a4428')}"/>`;
  return `<defs>${D(o)}${rad(I+'c',[[0,c('#b08250')],[1,c('#553420')]],.35,.3,.85)}</defs>${shadow(o,36)}
  ${fac(-1,-.42,'#f6ecd6')}${fac(-.42,.42,'#e3d2b0')}${fac(.42,1,'#c2aa84')}
  <path d="${Array.from({length:12},(_,i)=>{const y=-8.5-i*4.6;return`M${f(-hw(y))} ${f(y)}H${f(hw(y))}`}).join('')}" stroke="${c('#9a8466')}" stroke-width=".45" opacity=".5"/>
  <path d="M${f(-hw(-4)*.42)} -4L${f(-hw(-62)*.42)} -62M${f(hw(-4)*.42)} -4L${f(hw(-62)*.42)} -62" stroke="${c('#a08868')}" stroke-width=".7"/>
  <rect x="-23.5" y="-5.5" width="47" height="5.5" rx="1" fill="${c('#a89c90')}"/>${mort(o,-23.5,23.5,-5.5,0,2.75,6,'#6a6070',.6)}
  <path d="M-5.5 -5.5V-14A5.5 5.5 0 0 1 5.5 -14V-5.5Z" fill="${c('#7a4426')}" stroke="${c('#4a2a14')}" stroke-width="1"/><path d="M-1.8 -19V-5.5M1.8 -19V-5.5M-5 -9H-2M-5 -15H-2" stroke="${c('#4a2a14')}" stroke-width=".55"/><circle cx="3.2" cy="-11" r=".6" fill="${c('#ffd84a')}"/>
  <path d="M-4 -27V-34A4 4 0 0 1 4 -34V-27Z" fill="${c('#7a4426')}" stroke="${c('#4a2a14')}" stroke-width=".8"/>
  <rect x="-6.6" y="-51" width="3" height="8" fill="${c('#4a8a4a')}"/><rect x="3.6" y="-51" width="3" height="8" fill="${c('#4a8a4a')}"/>${win(o,-3.4,-51,6.8,8,{fr:'#5a3a22'})}
  <path d="M-19 -13L-28.5 -25M19 -13L28.5 -25" stroke="${wd}" stroke-width="1.5"/><rect x="-30" y="-27.5" width="60" height="3" rx=".6" fill="${c('#7a5232')}"/>
  <path d="M-29.5 -33.5H29.5${Array.from({length:11},(_,i)=>`M${-29+i*5.8} -33.5V-27.5`).join('')}" stroke="${wd}" stroke-width=".9"/>
  <rect x="-16" y="-62.5" width="32" height="3.4" rx="1.2" fill="${c('#4a2e1a')}"/><path d="M-15 -60Q-16 -73 0 -78Q16 -73 15 -60Z" fill="url(#${I}c)"/>
  <path d="M-10 -61Q-9 -70 -3 -75M-4 -61Q-3 -70 1 -76.5M4 -61Q4 -69 6 -75M10 -61Q10 -68 9 -72" stroke="${c('#3a2414')}" stroke-width=".6" opacity=".55" fill="none"/><circle cx="0" cy="-78.6" r="1.4" fill="${c('#4a2e1a')}"/>
  <g transform="translate(0 -64) rotate(${a})">${[0,90,180,270].map(r=>`<g transform="rotate(${r})">${sail}</g>`).join('')}</g>
  <circle cx="0" cy="-64" r="3.8" fill="${c('#4a2e1a')}"/><circle cx="-1" cy="-65" r="1.3" fill="${c('#b08a5a')}"/>
  <path d="M8.5 0Q7.5 -6 10 -8.2Q11.5 -9.6 13 -8.2Q15.5 -6 14.5 0Z" fill="${c('#ecdcb8')}"/><path d="M13.5 0Q12.8 -5 15 -7Q16.4 -8 17.8 -7Q20 -5 19.4 0Z" fill="${c('#e0cca4')}"/><path d="M9.6 -6.8H13.4M14.6 -5.8H18.6" stroke="${c('#8a6a42')}" stroke-width=".6"/>
  ${[-36,-32.5,-29,-25.5,25.5,29,32.5,36].map((x,i)=>`<ellipse cx="${x}" cy="-1.4" rx="2.6" ry="1.8" fill="${c(i%2?'#3f9a3a':'#4fae46')}"/>${tul(x,-1)}`).join('')}`}});

JIGART.subject({id:'castle',name:'Castle',biomes:['meadow','mountains','forest','lake','candy','snow','autumn'],place:'ground',w:1.05,draw:o=>{const c=o.c,I=o.id,R=o.R,rf=pick(o,['#e2445a','#3d6fd8','#8a52d8','#2e9a8a']),st=c('#e8ddca'),
  mer=(x0,x1,y,nn,fl,h=5)=>{const w=(x1-x0)/(2*nn-1);return`<path d="${Array.from({length:nn},(_,i)=>`M${f(x0+2*i*w)} ${y}v${-h}h${f(w)}v${h}Z`).join('')}" fill="${fl}"/>`},
  cone=(x,yb,hw,ya)=>{const m=yb-(yb-ya)*.45;return`<path d="M${x-hw} ${yb}Q${f(x-hw*.3)} ${f(m)} ${x} ${ya}Q${f(x+hw*.3)} ${f(m)} ${x+hw} ${yb}Q${x} ${yb+3} ${x-hw} ${yb}Z" fill="url(#${I}r)"/><path d="M${x} ${ya}Q${f(x-hw*.22)} ${f(m)} ${f(x-hw*.5)} ${yb+1.6}M${x} ${ya}Q${f(x+hw*.15)} ${f(m)} ${f(x+hw*.3)} ${yb+2}M${f(x-hw*.62)} ${f(yb-(yb-ya)*.3)}Q${x} ${f(yb-(yb-ya)*.3+2)} ${f(x+hw*.62)} ${f(yb-(yb-ya)*.3)}M${f(x-hw*.85)} ${f(yb-(yb-ya)*.1)}Q${x} ${f(yb-(yb-ya)*.1+2.4)} ${f(x+hw*.85)} ${f(yb-(yb-ya)*.1)}" stroke="${c(darken(rf,.4))}" stroke-width=".6" opacity=".55" fill="none"/>`},
  flag=(x,y)=>`<path d="M${x} ${y}V${y-6.5}" stroke="${c('#4a3a2a')}" stroke-width=".7"/><path d="M${x} ${y-6.8}Q${x+3} ${y-7.6} ${x+7} ${y-5.6}Q${x+3} ${y-4.6} ${x} ${y-3.8}Z" fill="${c('#ffd23d')}"/>`,
  tower=x=>`<rect x="${x-11}" y="-62" width="22" height="62" fill="url(#${I}t)"/>${mort(o,x-11,x+11,-62,0,5,7,'#9a8a72',.45)}<rect x="${x-13}" y="-67" width="26" height="5.4" rx="1" fill="url(#${I}t)"/>${[-9,-3,3,9].map(d=>`<path d="M${x+d-2.4} -61.6A2.4 2.4 0 0 0 ${x+d+2.4} -61.6Z" fill="${c('#b8a88e')}"/>`).join('')}${cone(x,-66,14.5,-94)}${flag(x,-94)}
    ${win(o,x-3,-53,6,9,{arch:1,b:1,fr:'#6a5a4a'})}<rect x="${x-.9}" y="-33" width="1.8" height="8" rx=".9" fill="${c('#3a2e28')}"/><rect x="${x-2.4}" y="-30" width="4.8" height="1.6" rx=".8" fill="${c('#3a2e28')}"/>`,
  ban=x=>`<rect x="${x-.6}" y="-35.4" width="8.2" height="1.2" rx=".6" fill="${c('#6a4a2a')}"/><path d="M${x} -34.4h7v15l-3.5 -3l-3.5 3Z" fill="${c(rf)}"/><path d="M${x+.8} -34.4v13.6" stroke="${c('#ffffff')}" stroke-width=".5" opacity=".35"/><circle cx="${x+3.5}" cy="-27" r="1.9" fill="${c('#ffd23d')}"/>`;
  return `<defs>${D(o)}${lin(I+'t',[[0,c('#f8f0e4')],[.45,c('#e4d8c4')],[1,c('#a8987e')]],1,0)}${lin(I+'v',[[0,c('#efe6d4')],[1,c('#cfc2aa')]])}${lin(I+'r',[[0,c(lighten(rf,.25))],[.5,c(rf)],[1,c(darken(rf,.35))]],1,0)}</defs>${shadow(o,58)}
  <rect x="-22" y="-64" width="44" height="30" fill="${c('#d6c9b2')}"/>${mort(o,-22,22,-64,-34,5,8,'#9a8a72',.45)}${mer(-22,22,-64,5,c('#d6c9b2'))}
  <rect x="-10" y="-84" width="20" height="22" fill="url(#${I}t)"/>${mort(o,-10,10,-84,-64,5,7,'#9a8a72',.4)}<rect x="-12" y="-88" width="24" height="5" rx="1" fill="url(#${I}t)"/>${cone(0,-87,13.5,-104)}${flag(0,-103)}
  ${win(o,-3,-81,6,9,{arch:1,b:1,fr:'#6a5a4a'})}${win(o,-17,-59,5.5,9,{arch:1,b:1,fr:'#6a5a4a'})}${win(o,11.5,-59,5.5,9,{arch:1,b:1,fr:'#6a5a4a'})}
  <rect x="-31" y="-36" width="62" height="36" fill="url(#${I}v)"/>${mort(o,-31,31,-36,0,5,8)}${mer(-31,31,-36,7,c('#efe6d4'))}<rect x="-31" y="-36.5" width="62" height="1.4" fill="${c('#b8a88e')}"/>
  ${tower(-42)}${tower(42)}
  ${ban(-25.5)}${ban(18.5)}
  <path d="M-11 0V-17A11 11 0 0 1 11 -17V0Z" fill="${c('#c8bba4')}"/><path d="${Array.from({length:7},(_,i)=>{const r=i*Math.PI/6;return`M${f(-Math.cos(r)*8.5)} ${f(-17-Math.sin(r)*8.5)}L${f(-Math.cos(r)*11)} ${f(-17-Math.sin(r)*11)}`}).join('')}" stroke="${c('#8a7a62')}" stroke-width=".6"/>
  <path d="M-8.5 0V-17A8.5 8.5 0 0 1 8.5 -17V0Z" fill="${o.night?'#ffb860':c('#2a1c18')}"/>${o.night?glow(I+'g',0,-9,14):''}
  <path d="M-6 -24.5V-13M-3 -25.4V-13M0 -25.6V-13M3 -25.4V-13M6 -24.5V-13M-7.6 -21H7.6M-8.2 -17H8.2M-8.4 -13.4H8.4" stroke="${c('#4a4a56')}" stroke-width=".8"/>
  <path d="M-8.5 0H8.5L11 4H-11Z" fill="${c('#8a5a32')}"/><path d="M-9.2 1.3H9.2M-10 2.7H10" stroke="${c('#5a3a1e')}" stroke-width=".5"/>
  <rect x="-15.2" y="-22" width="1.6" height="5" fill="${c('#4a3a2a')}"/><rect x="13.6" y="-22" width="1.6" height="5" fill="${c('#4a3a2a')}"/>${flame(o,-14.4,-22,.45)}${flame(o,14.4,-22,.45)}
  ${[[-50,-4,5],[-46,-9,4],[-53,-10,3.6],[-49,-15,3.4],[-44,-3,3.6]].map(([x,y,r],i)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c(i%2?'#4a9a42':'#3a8a3a')}"/>`).join('')}`}});

JIGART.subject({id:'cabin',name:'Log Cabin',biomes:['forest','mountains','snow','lake','autumn'],place:'ground',w:1,draw:o=>{const c=o.c,I=o.id,n=o.night,lp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  let rows='',side='',ends='';for(let i=0;i<7;i++){const y=-6-i*5.72;rows+=`<rect x="-41" y="${f(y)}" width="56" height="5.9" rx="2.9" fill="url(#${I}l)"/>`;
    side+=`<path d="M15 ${f(y+5.8)}L44 ${f(y+3.2)}V${f(y+.6)}L15 ${f(y)}Z" fill="url(#${I}m)"/><path d="M15 ${f(y+5.8)}L44 ${f(y+3.2)}" stroke="${c('#3e200e')}" stroke-width=".5"/>`;
    ends+=[-41,15].map(x=>`<circle cx="${x}" cy="${f(y+2.95)}" r="3"/><circle cx="${x}" cy="${f(y+2.95)}" r="1.3"/>`).join('')}
  let sh='';for(let t=.1;t<.95;t+=.1){const a=lp([19,-37],[-13,-68],t),b=lp([49,-40],[17,-70],t);sh+=`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;for(let s=(t*10%2<1?.08:.16);s<1;s+=.16){const p=lp(a,b,s);sh+=`M${f(p[0])} ${f(p[1])}l-3 3`}}
  return `<defs>${D(o)}${lin(I+'l',[[0,c('#c8844a')],[.45,c('#9a5a2e')],[1,c('#683818')]])}${lin(I+'m',[[0,c('#8a4e26')],[1,c('#5a3014')]])}${lin(I+'r',[[0,c('#7a3a2e')],[1,c('#4e2018')]],1,1)}</defs>${shadow(o,52,-2)}
  <path d="M15 0L44 -3V-42L15 -40Z" fill="${c('#5a3014')}"/>${side}
  ${rows}<path d="M-40 -40L-13 -66L14 -40Z" fill="${c('#8a5530')}"/><path d="${[-34,-29,-24,-19,-14,-9,-4,1,6,11].map(x=>`M${x} -40V${f(-40-(27-Math.abs(x+13))*26/27)}`).join('')}" stroke="${c('#5a3418')}" stroke-width=".6"/>
  <g fill="${c('#dca46c')}" stroke="${c('#8a5a30')}" stroke-width=".55">${ends}</g>${port(o,-13,-50.5,4.4,'#4a2a14')}
  <rect x="31" y="-79" width="10" height="34" fill="${c('#9a929c')}"/>${[[32,-77,4,3],[36.5,-76,4,3.4],[31.5,-72,5,3],[37,-71.5,3.6,3],[32,-67,3.6,3.2],[36,-66.5,4.6,3],[31.5,-61,4.6,3],[36.6,-60.6,4,3.4],[32,-55,4,3]].map(([x,y,w,h],i)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="${c(i%3?'#b4aeb8':'#7e7684')}"/>`).join('')}<rect x="29.6" y="-81.5" width="12.8" height="3" rx="1" fill="${c('#6a6270')}"/>
  <path d="M-13 -68L19 -37L49 -40L17 -70Z" fill="url(#${I}r)"/><path d="${sh}" stroke="${c('#2e120c')}" stroke-width=".55" opacity=".55" fill="none"/>
    <path d="M-47.5 -35.5L-13 -69.5L20.5 -35.5" stroke="${c('#4a2418')}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-47.5 -36.3L-13 -70.3L20.5 -36.3" stroke="${c('#8a4a34')}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  ${[[38,-87,4,.6],[42,-95,5.4,.48],[48,-103,6.6,.36]].map(([x,y,r,op])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#eef0f6')}" opacity="${op}"/>`).join('')}
  <rect x="-5" y="-27" width="13" height="27" fill="${c('#4e2810')}"/><rect x="-4" y="-26" width="11" height="26" fill="${c('#7a4422')}"/><path d="M-1.3 -26V0M1.5 -26V0M4.3 -26V0M-4 -21H7M-4 -5H7M-4 -5L7 -21" stroke="${c('#4e2810')}" stroke-width=".6" fill="none"/><circle cx="5.6" cy="-13" r=".8" fill="${c('#ffd84a')}"/>
  <path d="M10 -31.5h3.4v2" stroke="${c('#2a2a2a')}" stroke-width=".6" fill="none"/><rect x="11.6" y="-29.5" width="3.6" height="4.6" rx=".6" fill="${n?'#ffd27a':c('#fff0c0')}" stroke="${c('#2a2a2a')}" stroke-width=".6"/>${halo(o,13.4,-27,8)}
  <rect x="-38.6" y="-31" width="3.8" height="13" fill="${c('#3f6e46')}"/><rect x="-20.4" y="-31" width="3.8" height="13" fill="${c('#3f6e46')}"/><path d="M-38.6 -28.5h3.8M-38.6 -26h3.8M-38.6 -23.5h3.8M-38.6 -21h3.8M-20.4 -28.5h3.8M-20.4 -26h3.8M-20.4 -23.5h3.8M-20.4 -21h3.8" stroke="${c('#2a4a30')}" stroke-width=".45"/>${win(o,-34.4,-31,13.6,13,{fr:'#4a2a14',sw:1.4})}
  <g transform="translate(29 -24) skewY(-5) translate(-29 24)">${win(o,24.5,-30,9,11,{fr:'#3a1e0c',sw:1.2})}</g>
  <rect x="-7" y="-2.8" width="17" height="3" rx=".6" fill="${c('#8a5a32')}"/>
  ${(W=>`<g fill="${c('#d8985a')}" stroke="${c('#7a4a26')}" stroke-width=".55">${W.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.45"/>`).join('')}</g><path d="${W.map(([x,y])=>`M${x} ${y}h.01`).join('')}" stroke="${c('#9a6436')}" stroke-width="1.6" stroke-linecap="round"/>`)([[22,-2.5],[27,-2.5],[32,-2.5],[37,-2.5],[42,-2.5],[24.5,-7.2],[29.5,-7.2],[34.5,-7.2],[39.5,-7.2],[27,-11.9],[32,-11.9],[37,-11.9]])}
  <path d="M-57 0V-7.5H-47V0Z" fill="${c('#8a5a32')}"/><ellipse cx="-52" cy="-7.5" rx="5" ry="1.6" fill="${c('#dcae78')}"/><path d="M-52 -7.5L-46 -16" stroke="${c('#a87a4a')}" stroke-width="1.2" stroke-linecap="round"/><path d="M-54.2 -9.4L-51.2 -13.8L-49 -11.2Q-51.5 -9 -54.2 -9.4Z" fill="${c('#a8b0bc')}"/>`}});

JIGART.subject({id:'cottage',name:'Cottage',biomes:['meadow','farm','forest','autumn','garden'],place:'ground',w:1.1,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,dc=pick(o,['#3a6ab8','#2f8a5a','#c8443a','#7a4ab0']),
  fc=['#ff4a6a','#ffcf3a','#ff8ad0','#ffffff','#c86aff','#ff7a2a'],tim=c('#5a3a24'),
  box=x=>`<rect x="${x-1}" y="-18.4" width="16" height="4.4" rx=".8" fill="${c('#8a5a32')}"/><path d="M${x} -16.2H${x+14}" stroke="${c('#5a3a1e')}" stroke-width=".5"/>${Array.from({length:7},(_,i)=>`<circle cx="${f(x+.6+i*2.15)}" cy="${f(-19.6-R()*1.4)}" r="${f(1.3+R()*.5)}" fill="${c(fc[Math.floor(R()*6)])}"/>`).join('')}${[1,5,9,13].map(d=>`<ellipse cx="${x+d}" cy="-18.4" rx="1.6" ry=".9" fill="${c('#3f8a3a')}"/>`).join('')}`;
  let th='';for(let i=0;i<70;i++){const x=-46+R()*92,yt=-86+52*Math.pow(Math.abs(x)/52,1.8),y=yt+3+R()*Math.max(1,-37-yt-3);th+=`M${f(x)} ${f(y)}l${f(x*.05)} ${f(3+R()*2)}`}
  const rose=Array.from({length:15},(_,i)=>{const t=i/14,a=Math.PI*t,x=t<.25?-10.5:t>.75?10.5:-Math.cos((t-.25)*2*Math.PI)*10.5,y=t<.25?-2-t*4*15:t>.75?-2-(1-t)*4*15:-17-Math.sin((t-.25)*2*Math.PI)*10.5;return[x,y]});
  return `<defs>${D(o)}${lin(I+'t',[[0,c('#f6d78a')],[.6,c('#d8a64e')],[1,c('#a8782e')]])}${lin(I+'p',[[0,c('#fbf3e2')],[1,c('#e8dabc')]])}</defs>${shadow(o,54)}
  <rect x="22" y="-100" width="9" height="34" fill="${c('#b8503a')}"/>${mort(o,22,31,-100,-66,3,4.5,'#7a2e20',.7)}<rect x="21" y="-101" width="11" height="2.4" fill="${c('#8a3a2a')}"/><rect x="23" y="-104.5" width="3" height="3.6" fill="${c('#c8683a')}"/><rect x="27" y="-104" width="3" height="3.1" fill="${c('#c8683a')}"/>
  <rect x="-40" y="-40" width="80" height="40" fill="url(#${I}p)"/>
  <path d="M-41 -40H41M-41 -1.5H41" stroke="${tim}" stroke-width="3"/><path d="M-39.5 -40V0M39.5 -40V0M-14.5 -40V0M14.5 -40V0M-39.5 -38L-34 -32M-14.5 -38L-20 -32M39.5 -38L34 -32M14.5 -38L20 -32" stroke="${tim}" stroke-width="2.6"/>
  ${[-36,-30,-24,-18,18,24,30,36].map((x,i)=>`<ellipse cx="${x}" cy="-3.6" rx="3" ry="2.4" fill="${c(i%2?'#b4aca4':'#c8c0b6')}"/>`).join('')}
  <path d="M-52 -33C-56 -46 -44 -60 -34 -68C-22 -82 -10 -88 0 -88C10 -88 22 -82 34 -68C44 -60 56 -46 52 -33C36 -28 -36 -28 -52 -33Z" fill="url(#${I}t)"/>
  <path d="${th}" stroke="${c('#9a6a28')}" stroke-width=".6" opacity=".55" fill="none"/>
  <path d="M-30 -74Q0 -96 30 -74" stroke="${c('#c8964a')}" stroke-width="3.2" fill="none" stroke-dasharray=".1 3.4" stroke-linecap="round"/><path d="M-52 -33C-36 -28 36 -28 52 -33" stroke="${c('#9a6a2a')}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M-13.5 -52Q-13 -71 0 -72Q13 -71 13.5 -52Q0 -50 -13.5 -52Z" fill="url(#${I}t)"/>${win(o,-5,-64,10,9,{arch:1,fr:'#6a4a2a'})}<path d="M-12.5 -55Q-12 -74 0 -75Q12 -74 12.5 -55" stroke="${c('#9a6a2a')}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${win(o,-33,-31,14,12,{fr:'#ffffff',sw:1.3})}${win(o,19,-31,14,12,{fr:'#ffffff',sw:1.3})}${box(-33)}${box(19)}
  <path d="M-9.5 0V-19A9.5 9.5 0 0 1 9.5 -19V0Z" fill="${c('#c8bcaa')}"/><path d="M-7 0V-19A7 7 0 0 1 7 -19V0Z" fill="${c(dc)}"/><path d="M-2.4 -25.5V0M2.4 -25.5V0" stroke="${c(darken(dc,.35))}" stroke-width=".6"/>${port(o,0,-18,2.3,darken(dc,.3))}<circle cx="4.3" cy="-10" r=".8" fill="${c('#ffd84a')}"/>
  <path d="M${rose.map(([x,y])=>`${f(x)} ${f(y)}`).join('L')}" stroke="${c('#3f7a34')}" stroke-width="1" fill="none"/>${rose.map(([x,y],i)=>`<circle cx="${f(x+(i%2?1:-1))}" cy="${f(y)}" r="${i%3?1.1:1.5}" fill="${c(i%3?'#4a9a3a':'#ff6a9a')}"/>`).join('')}
  <rect x="11.8" y="-26" width="2.6" height="3.4" rx=".5" fill="${n?'#ffd27a':c('#fff0c0')}" stroke="${c('#2a2a2a')}" stroke-width=".5"/>${halo(o,13.1,-24.3,7)}
  ${[[-4,2.2],[1.5,2.8],[-1,.8]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.2" fill="${c('#b8b0a6')}"/>`).join('')}
  ${[-1,1].map(s=>`<path d="M${s*44} -9H${s*63}M${s*44} -4H${s*63}" stroke="${c('#e8e2d6')}" stroke-width="1.3"/>${[47,51,55,59,63].map(x=>`<path d="M${s*x-1.1} 0V-11L${s*x} -12.6L${s*x+1.1} -11V0Z" fill="${c('#faf6ee')}"/>`).join('')}`).join('')}
  ${[[-42,-4,4.4],[-45,-8,3.4],[43,-4,4.4],[46,-8,3.2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#4a9a42')}"/><circle cx="${x-1}" cy="${y-1.4}" r="1" fill="${c(fc[Math.floor(R()*6)])}"/><circle cx="${x+1.6}" cy="${y+.6}" r=".9" fill="${c(fc[Math.floor(R()*6)])}"/>`).join('')}`}});

JIGART.subject({id:'pagoda',name:'Pagoda',biomes:['garden','mountains','lake'],place:'ground',w:.75,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,rc=pick(o,['#2f6a6a','#3a4a5e','#4a3a5a']),red=c('#c8382a'),gold=c('#e8b23a'),
  T=[[18,-6,18],[15,-28,12],[12,-44,11],[9.5,-59,10]];
  const tier=([bw,y0,bh],i)=>{const yt=y0-bh,rw=bw+12,yb=yt+1.5,h=8,tip=yb-h*.55;
    return `<rect x="${-bw}" y="${yt}" width="${bw*2}" height="${bh}" fill="${c('#f4ead8')}"/>
    ${i?win(o,-bw*.5,yt+4,bw,bh-7.2,{b:0,fr:'#8a2a1e'})+`<path d="${[-.3,-.1,.1,.3].map(k=>`M${f(k*bw)} ${yt+4}V${y0-3.2}`).join('')}" stroke="${c('#8a2a1e')}" stroke-width=".55"/>`:`<rect x="-6" y="${yt+5}" width="12" height="${bh-5}" fill="${n?'#ffc870':c('#7a2018')}"/>${halo(o,0,y0-6,12)}<path d="M0 ${yt+5}V${y0}" stroke="${c('#4a120c')}" stroke-width=".8"/>${[-3,3].map(x=>[0,1,2].map(j=>`<circle cx="${x}" cy="${yt+9+j*3.5}" r=".55" fill="${gold}"/>`).join('')).join('')}${win(o,-15,yt+6,6,7,{b:1,fr:'#8a2a1e'})}${win(o,9,yt+6,6,7,{b:1,fr:'#8a2a1e'})}`}
    <rect x="${-bw}" y="${yt}" width="2.8" height="${bh}" fill="${red}"/><rect x="${bw-2.8}" y="${yt}" width="2.8" height="${bh}" fill="${red}"/><rect x="${-bw}" y="${yt}" width="${bw*2}" height="2.6" fill="${red}"/>
    <rect x="${-bw}" y="${yt+2.6}" width="${bw*2}" height="2" fill="${c('#000000')}" opacity=".15"/>
    ${i?`<rect x="${-bw-2}" y="${y0-3.2}" width="${bw*2+4}" height="1.2" fill="${red}"/><path d="${Array.from({length:Math.round(bw)},(_,j)=>`M${f(-bw-1+j*(bw*2+2)/(Math.round(bw)-1))} ${y0-2}V${y0}`).join('')}" stroke="${red}" stroke-width=".6"/>`:''}
    <rect x="${f(-rw*.55)}" y="${yb}" width="${f(rw*1.1)}" height="2.2" fill="${c('#6a2a1e')}"/>
    <path d="M${-rw} ${f(tip)}Q${f(-rw*.72)} ${yb+1} ${f(-rw*.42)} ${yb+1}H${f(rw*.42)}Q${f(rw*.72)} ${yb+1} ${rw} ${f(tip)}Q${f(rw*.7)} ${f(yb-h*.5)} ${f(rw*.45)} ${yb-h}H${f(-rw*.45)}Q${f(-rw*.7)} ${f(yb-h*.5)} ${-rw} ${f(tip)}Z" fill="url(#${I}r)"/>
    <path d="${[-4,-3,-2,-1,0,1,2,3,4].map(k=>`M${f(k*rw*.42/4.5)} ${yb-h+.6}L${f(k*rw*.8/4.5)} ${f(yb+.6-(Math.abs(k)>3?1.6:0))}`).join('')}" stroke="${c(darken(rc,.4))}" stroke-width=".5" opacity=".7"/>
    <rect x="${f(-rw*.47)}" y="${yb-h-.8}" width="${f(rw*.94)}" height="1.6" rx=".8" fill="${c(darken(rc,.25))}"/><path d="M${-rw} ${f(tip)}Q${f(-rw*.72)} ${yb+1} ${f(-rw*.42)} ${yb+1}H${f(rw*.42)}Q${f(rw*.72)} ${yb+1} ${rw} ${f(tip)}" stroke="${gold}" stroke-width=".8" fill="none"/>
    ${[-1,1].map(s=>`<circle cx="${s*rw}" cy="${f(tip)}" r="1.1" fill="${gold}"/>`+(i?`<path d="M${s*rw} ${f(tip)}v2.6" stroke="${gold}" stroke-width=".4"/><path d="M${s*rw-1} ${f(tip+4.4)}Q${s*rw} ${f(tip+1.6)} ${s*rw+1} ${f(tip+4.4)}Z" fill="${gold}"/>`:`<path d="M${s*rw} ${f(tip)}v4" stroke="${c('#3a2a2a')}" stroke-width=".4"/><ellipse cx="${s*rw}" cy="${f(tip+7)}" rx="2.4" ry="3.1" fill="${n?'#ffb04a':c('#e8443a')}"/><path d="M${s*rw-1.6} ${f(tip+4.2)}h3.2M${s*rw-1.6} ${f(tip+9.8)}h3.2" stroke="${c('#3a2a2a')}" stroke-width=".7"/>${o.night?glow(I+'f',s*rw,tip+7,9):''}`)).join('')}`};
  return `<defs>${D(o)}${lin(I+'r',[[0,c(lighten(rc,.25))],[1,c(darken(rc,.15))]])}</defs>${shadow(o,40,6)}
  <rect x="-30" y="-6" width="60" height="6" fill="${c('#b4ac9e')}"/>${mort(o,-30,30,-6,0,3,7,'#7a7268',.6)}<rect x="-30" y="-6.6" width="60" height="1.4" fill="${c('#d4cec4')}"/><rect x="-8" y="-2" width="16" height="2" fill="${c('#a8a094')}"/>
  ${[...T].reverse().map((t,j)=>tier(t,T.length-1-j)).join('')}
  <rect x="-3" y="-80" width="6" height="4" fill="${c(darken(rc,.2))}"/><rect x="-.8" y="-102" width="1.6" height="22" fill="${gold}"/>${Array.from({length:7},(_,i)=>`<ellipse cx="0" cy="${-83-i*2.6}" rx="${f(3.4-i*.2)}" ry=".9" fill="${gold}"/>`).join('')}<path d="M0 -109.5Q3.2 -105 0 -102Q-3.2 -105 0 -109.5Z" fill="${gold}"/>
  <rect x="40" y="-3" width="8" height="3" fill="${c('#a8a49c')}"/><rect x="42.6" y="-14" width="2.8" height="11" fill="${c('#a8a49c')}"/><rect x="40" y="-16" width="8" height="2" fill="${c('#98948c')}"/><rect x="41" y="-22" width="6" height="6" fill="${c('#b8b4ac')}"/><rect x="42.4" y="-21" width="3.2" height="4" fill="${n?'#ffd27a':c('#3a3a40')}"/>${halo(o,44,-19,9)}<path d="M38 -22L44 -27L50 -22Z" fill="${c('#8a8680')}"/><circle cx="44" cy="-27.6" r="1.2" fill="${c('#8a8680')}"/>`}});

JIGART.subject({id:'pyramid',name:'Pyramid',biomes:['desert','canyon'],place:'ground',w:1.25,draw:o=>{const c=o.c,I=o.id,R=o.R,A=[4,-98],L=[-62,0],F=[14,3],Rt=[60,-2],lp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  let co='',jt='';for(let k=0;k<16;k++){const t=k/18,t2=(k+1)/18;if(k){const a=lp(L,A,t),b=lp(F,A,t),d=lp(Rt,A,t);co+=`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(d[0])} ${f(d[1])}`}
    for(const[p,q,m]of[[L,F,5],[F,Rt,3]])for(let j=0;j<m;j++){const s=(j+(k%2?.5:.15)+R()*.2)/m;if(s>.97)continue;const a=lp(lp(p,A,t),lp(q,A,t),s),b=lp(lp(p,A,t2),lp(q,A,t2),s);jt+=`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`}}
  const g1=lp(L,A,.88),g2=lp(F,A,.88),g3=lp(Rt,A,.88);
  return `<defs>${lin(I+'a',[[0,c('#fbe2a4')],[1,c('#e2b06a')]],1,1)}${lin(I+'b',[[0,c('#c8945a')],[1,c('#946436')]],1,1)}${lin(I+'g',[[0,c('#fff2a0')],[1,c('#e0a82a')]],1,1)}</defs>${shadow(o,58,2)}
  <path d="${P([L,F,A])}" fill="url(#${I}a)"/><path d="${P([F,Rt,A])}" fill="url(#${I}b)"/>
  <path d="${co}" stroke="${c('#8a5a2a')}" stroke-width=".6" opacity=".45" fill="none"/><path d="${jt}" stroke="${c('#8a5a2a')}" stroke-width=".5" opacity=".35" fill="none"/>
  <path d="${P([g1,g2,A])}" fill="url(#${I}g)"/><path d="${P([g2,g3,A])}" fill="${c('#c8901e')}"/><path d="M${F[0]} ${F[1]}L${A[0]} ${A[1]}" stroke="${c('#fff2cc')}" stroke-width=".8" opacity=".6"/>
  ${spark(4,-98,4.5,c('#fffbe0'),.9)}
  <path d="M-17.5 2L-16 -9H-8L-6.5 2Z" fill="${c('#d8a868')}"/><path d="M-16.6 -1.6H-7.4M-16.2 -4.8H-7.8" stroke="${c('#9a6a36')}" stroke-width=".5"/>
  <path d="M-16 -9L-15 -19.5H-9L-8 -9Z" fill="${c('#3a2412')}"/><rect x="-17.6" y="-22" width="11.2" height="2.6" fill="${c('#e8c488')}"/><path d="M-17 -22L-12 -26.5L-7 -22" stroke="${c('#9a6a36')}" stroke-width=".7" fill="none"/>
  <rect x="38" y="-5" width="7" height="5" fill="${c('#d8b070')}"/><rect x="44" y="-3.4" width="6" height="3.4" fill="${c('#c8a060')}"/><rect x="-2" y="-2.8" width="5" height="3.6" fill="${c('#e0b878')}" transform="rotate(-8)"/>
  <ellipse cx="-36" cy="2" rx="13" ry="2" fill="${c('#4ab4e0')}" stroke="${c('#e8d09a')}" stroke-width=".8"/><path d="M-42 1.6H-34" stroke="${c('#ffffff')}" stroke-width=".6" opacity=".7"/>
  ${palm(o,-42,3,45,-1)}${palm(o,47,3,36,0)}
  ${[[-26,2],[-22,1.4],[30,2],[57,2.4]].map(([x,y])=>`<path d="M${x-3} ${y}Q${x-2} ${y-4} ${x-3.5} ${y-6}M${x} ${y}Q${x+.5} ${y-5} ${x} ${y-7}M${x+3} ${y}Q${x+2} ${y-4} ${x+4} ${y-5.5}" stroke="${c('#6a9a3a')}" stroke-width=".9" fill="none" stroke-linecap="round"/>`).join('')}`}});

JIGART.subject({id:'igloo',name:'Igloo',biomes:['snow'],place:'ground',w:1.15,draw:o=>{const c=o.c,I=o.id,n=o.night,hw=y=>50*Math.sqrt(Math.max(0,1-(y/56)**2)),Y=k=>-k*8.2,bl=c('#9cbcdc');
  let cs='',jt='';for(let k=1;k<7;k++){const y=Y(k),w=hw(y);cs+=`M${f(-w)} ${f(y)}Q0 ${f(y+3)} ${f(w)} ${f(y)}`}
  for(let k=0;k<6;k++){const m=Math.max(2,8-k);for(let j=0;j<=m;j++){const s=(j+(k%2?.5:0))/m*2-1;if(Math.abs(s)>.93)continue;const yb=k?Y(k)+1.5*(1-s*s):0,yt=Y(k+1)+1.5*(1-s*s);jt+=`M${f(s*hw(Y(k))*.97)} ${f(yb)}L${f(s*hw(Y(k+1))*.97)} ${f(yt)}`}}
  const sb=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${I}s)" stroke="${c('#b8cde4')}" stroke-width=".6"/>`;
  return `<defs>${D(o)}${rad(I+'s',[[0,c('#ffffff')],[.55,c('#eaf4fd')],[1,c('#a8c6e4')]],.35,.28,.85)}${n?rad(I+'k',[[0,'#ffe2a0'],[1,'#ff9a40']],.5,.8,.8)+glowDef(I+'L','#ffb050',.9):''}</defs>${shadow(o,56)}
  <path d="M-22 -48L-24 -97" stroke="${c('#8a6a4a')}" stroke-width="1.4"/><path d="M-24 -97Q-17 -99 -9 -95.5Q-16 -92 -23.5 -89Z" fill="${c('#e8443a')}"/><path d="M-23.8 -93.6Q-17 -95.4 -12 -93.2" stroke="${c('#ffffff')}" stroke-width="1.2" fill="none"/>
  <path d="M-50 0A50 56 0 0 1 50 0Z" fill="url(#${I}s)"/><path d="${cs}" stroke="${bl}" stroke-width=".8" fill="none"/><path d="${jt}" stroke="${bl}" stroke-width=".7" fill="none"/>
  <path d="M-36 -36Q-26 -48 -12 -52" stroke="${c('#ffffff')}" stroke-width="2.4" stroke-linecap="round" opacity=".7" fill="none"/>
  <rect x="20" y="-38" width="11" height="8" rx="1.6" fill="${n?'#ffcf80':c('#c8ecff')}" stroke="${c('#8ab4dc')}" stroke-width=".7" transform="rotate(-14 25 -34)"/>${halo(o,25.5,-34,12)}${n?'':`<path d="M22.6 -32.4L25.6 -37.6" stroke="${c('#ffffff')}" stroke-width="1" opacity=".9"/>`}
  <path d="M-19 1A19 28 0 0 1 19 1Z" fill="url(#${I}s)" stroke="${bl}" stroke-width=".7"/><path d="M-15 1A15 22.5 0 0 1 15 1" stroke="${bl}" stroke-width=".7" fill="none"/>
  <path d="${[25,52,78,102,128,155].map(d=>{const r=d*Math.PI/180;return`M${f(-Math.cos(r)*15)} ${f(1-Math.sin(r)*22.5)}L${f(-Math.cos(r)*19)} ${f(1-Math.sin(r)*28)}M${f(-Math.cos(r+.2)*10.5)} ${f(1-Math.sin(r+.2)*16)}L${f(-Math.cos(r+.2)*15)} ${f(1-Math.sin(r+.2)*22.5)}`}).join('')}" stroke="${bl}" stroke-width=".7"/>
  <path d="M-10.5 1V-6.5A10.5 10.5 0 0 1 10.5 -6.5V1Z" fill="${n?`url(#${I}k)`:c('#24365a')}"/>${n?glow(I+'L',0,-5,22):''}<path d="M-10.5 1V-6.5A10.5 10.5 0 0 1 10.5 -6.5" stroke="${c('#7a9cc4')}" stroke-width="1" fill="none"/>
  ${sb(-50,-7,7.5)}${sb(-50,-18.5,5.4)}${sb(-50,-27.2,4)}<path d="M-54 -22.6Q-50 -21 -46 -22.6L-45.6 -21Q-50 -19.4 -54.4 -21Z" fill="${c('#e8443a')}"/><path d="M-46.4 -21.4L-44 -14L-42.4 -15Z" fill="${c('#e8443a')}"/>
  <path d="M-49.6 -26.4L-45.4 -25.6L-49.6 -25.2Z" fill="${c('#ff8a2a')}"/><circle cx="-51.4" cy="-28.4" r=".6" fill="${c('#2a2a3a')}"/><circle cx="-48.6" cy="-28.6" r=".6" fill="${c('#2a2a3a')}"/><circle cx="-50" cy="-17" r=".6" fill="${c('#2a2a3a')}"/><circle cx="-50" cy="-14.6" r=".6" fill="${c('#2a2a3a')}"/>
  <path d="M-55 -18.5L-61 -23M-58.6 -21.2L-60 -24.4M-45 -18.5L-40 -22.6" stroke="${c('#6a4a2a')}" stroke-width=".8" fill="none"/><rect x="-54" y="-33" width="8" height="1.4" fill="${c('#2a2a3a')}"/><rect x="-52.6" y="-37.6" width="5.2" height="4.8" fill="${c('#2a2a3a')}"/>
  <rect x="46" y="-52" width="3" height="52" rx="1.5" fill="${c('#e8443a')}" transform="rotate(-7 47.5 0)"/><rect x="50.5" y="-50" width="3" height="50" rx="1.5" fill="${c('#3a7ae8')}" transform="rotate(-4 52 0)"/><path d="M47.4 -10.4h3.4" stroke="${c('#2a2a3a')}" stroke-width="1.2" transform="rotate(-6 50 0)"/>
  <path d="M43 1L55 -44M58 1L50 -44" stroke="${c('#4a4a5a')}" stroke-width=".8"/><ellipse cx="44.6" cy="-5" rx="2" ry=".6" fill="${c('#4a4a5a')}"/><ellipse cx="56.6" cy="-5" rx="2" ry=".6" fill="${c('#4a4a5a')}"/>
  <ellipse cx="-30" cy="1" rx="12" ry="3" fill="${c('#f4f9ff')}"/><ellipse cx="32" cy="1" rx="12" ry="2.6" fill="${c('#f4f9ff')}"/>${[[28,-2,2.2],[32,-1.6,2],[30,-4.6,1.9]].map(([x,y,r])=>sb(x,y,r)).join('')}`}});


JIGART.subject({id:'treehouse',name:'Treehouse',biomes:['forest','jungle','meadow','autumn'],place:'ground',w:1.05,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,g=['#55b24a','#3a8a3a','#86d064'],
  pl=['#c8945a','#b8844a','#d8a468','#a87440'],bc=['#ff5a6a','#ffcf3a','#4ab4ff','#7ad04a','#c86aff'];
  const bun=Array.from({length:9},(_,i)=>{const x=-22+i*5.5,y=-71.5+Math.sin(i/8*Math.PI)*2.6;return`<path d="M${f(x-1.8)} ${f(y)}L${f(x+1.8)} ${f(y+.3)}L${f(x)} ${f(y+3.6)}Z" fill="${c(bc[i%5])}"/>`}).join('');
  return `<defs>${D(o)}${lin(I+'b',[[0,c('#a8703e')],[.5,c('#8a5a30')],[1,c('#5a3418')]],1,0)}${lin(I+'p',[[0,c('#e0603e')],[1,c('#b03a28')]])}</defs>${shadow(o,34)}
  ${[[-32,-78,19],[0,-88,20],[32,-80,19],[-16,-94,14],[17,-94,14],[-46,-64,12],[46,-66,12]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c(g[1])}"/>`).join('')}
  <path d="M-17 0Q-9 -5 -8 -20L-7.5 -50Q-17 -60 -32 -68L-29 -72Q-15 -64 -5 -58Q-2 -70 -4 -84L2 -84Q3 -68 5.5 -58Q18 -66 30 -76L33 -72Q20 -62 9 -52Q22 -60 40 -64L41 -60Q22 -57 9 -46L9 -20Q10 -5 18 0Z" fill="url(#${I}b)"/>
  <path d="M-3 -6Q-2 -26 -3 -46M3 -10Q4 -30 2 -44M-5.6 -28Q-5 -36 -6 -42M5 -26Q6 -32 5.4 -38" stroke="${c('#4a2a12')}" stroke-width=".6" opacity=".6" fill="none"/><ellipse cx="1" cy="-30" rx="1.6" ry="2.2" fill="${c('#3a1e0c')}"/>
  <path d="M-8 -34L-26 -47M8 -34L26 -47" stroke="${c('#6a4426')}" stroke-width="2"/>
  <rect x="-21" y="-74" width="42" height="24" fill="${c('#c8945a')}"/>${Array.from({length:10},(_,i)=>`<rect x="${-21+i*4.2}" y="-74" width="4.2" height="24" fill="${c(pl[Math.floor(R()*4)])}" stroke="${c('#7a5030')}" stroke-width=".4"/>`).join('')}
  <circle cx="-17" cy="-64" r=".5" fill="${c('#5a3a22')}"/><circle cx="17" cy="-56" r=".5" fill="${c('#5a3a22')}"/>
  ${win(o,-15.5,-68,11,10,{fr:'#5a3a22',sw:1.3})}<rect x="4" y="-68" width="10" height="18" fill="${c('#6a3e1e')}"/><rect x="5" y="-67" width="8" height="17" fill="${c('#8a5430')}"/><path d="M7.6 -67V-50M10.4 -67V-50" stroke="${c('#5a3418')}" stroke-width=".5"/><circle cx="11.6" cy="-58" r=".7" fill="${c('#ffd84a')}"/>
  <path d="M-27 -72L0 -92L27 -72Q0 -70 -27 -72Z" fill="url(#${I}p)"/><path d="M-20 -76.2Q0 -75 20 -76.2M-13 -81.4Q0 -80.4 13 -81.4M-6.5 -86.5H6.5" stroke="${c('#8a2a1e')}" stroke-width=".7" fill="none"/><path d="M-28 -71.6L0 -92.6L28 -71.6" stroke="${c('#7a2a1a')}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
  ${port(o,0,-79.5,3,'#7a2a1a')}<path d="M0 -92.6V-100" stroke="${c('#5a3a22')}" stroke-width=".7"/><path d="M0 -100L6 -98.4L0 -96.8Z" fill="${c('#ffcf3a')}"/>
  ${bun}<path d="M-23 -71.6Q0 -66 23 -71.6" stroke="${c('#5a3a22')}" stroke-width=".4" fill="none"/>
  <rect x="-31" y="-50" width="62" height="4" rx=".6" fill="${c('#9a6436')}"/><path d="M-31 -48H31" stroke="${c('#6a4020')}" stroke-width=".5"/>
  <path d="M-30 -56H30${Array.from({length:13},(_,i)=>`M${-30+i*5} -56V-50`).join('')}" stroke="${c('#6a4020')}" stroke-width="1"/>
  <path d="M-27 -46V0M-21 -46V0${Array.from({length:10},(_,i)=>`M-27 ${-42+i*4.4}H-21`).join('')}" stroke="${c('#c8a46a')}" stroke-width=".9"/>
  <path d="M37 -62V-27M38.4 -62V-27" stroke="${c('#c8a46a')}" stroke-width=".7"/><ellipse cx="37.7" cy="-23" rx="6.4" ry="4" fill="none" stroke="${c('#2a2a30')}" stroke-width="2.6"/>
  <path d="M29 -50V-46" stroke="${c('#2a2a2a')}" stroke-width=".5"/><rect x="27.4" y="-46" width="3.2" height="4" rx=".6" fill="${n?'#ffd27a':c('#fff0c0')}" stroke="${c('#2a2a2a')}" stroke-width=".5"/>${halo(o,29,-44,8)}
  ${[[-46,-80,11],[46,-82,11],[-30,-97,9],[30,-97,9],[-53,-68,7],[53,-70,7],[-38,-60,6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c(g[0])}"/><circle cx="${f(x-r*.3)}" cy="${f(y-r*.35)}" r="${f(r*.45)}" fill="${c(g[2])}"/>`).join('')}
  ${[[-24,-86],[36,-92],[-44,-72],[20,-102],[50,-60],[-10,-104]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="${c('#e8443a')}"/><circle cx="${x-.5}" cy="${y-.5}" r=".5" fill="${c('#ffffff')}" opacity=".6"/>`).join('')}
  <path d="M-20 0Q-24 -3 -28 -1M18 0Q24 -3 28 0" stroke="${c('#6a4020')}" stroke-width="2" fill="none" stroke-linecap="round"/>`}});

JIGART.subject({id:'mushroomhouse',name:'Mushroom House',biomes:['forest','meadow','candy','autumn'],place:'ground',w:1,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,cap=pick(o,[['#ff5a4a','#b8202a'],['#ff6aa8','#c02a6a'],['#ff8a3a','#c04a1a']]),
  sm=(x,s,col)=>`<rect x="${f(x-1.6*s)}" y="${f(-9*s)}" width="${f(3.2*s)}" height="${f(9*s)}" rx="${f(1.2*s)}" fill="${c('#f6ead2')}"/><path d="M${f(x-7*s)} ${f(-8*s)}Q${f(x-7*s)} ${f(-14*s)} ${x} ${f(-14.5*s)}Q${f(x+7*s)} ${f(-14*s)} ${f(x+7*s)} ${f(-8*s)}Q${x} ${f(-6.5*s)} ${f(x-7*s)} ${f(-8*s)}Z" fill="${c(col)}"/><circle cx="${f(x-2.6*s)}" cy="${f(-11*s)}" r="${f(1.2*s)}" fill="${c('#fff8ee')}"/><circle cx="${f(x+2.4*s)}" cy="${f(-12.2*s)}" r="${f(.9*s)}" fill="${c('#fff8ee')}"/>`;
  return `<defs>${D(o)}${rad(I+'c',[[0,c(lighten(cap[0],.2))],[.55,c(cap[0])],[1,c(cap[1])]],.38,.25,.85)}${lin(I+'s',[[0,c('#fffaf0')],[.5,c('#f2e4c8')],[1,c('#c8b08a')]],1,0)}</defs>${shadow(o,46)}
  <ellipse cx="0" cy="-44" rx="46" ry="7.5" fill="${c('#e6d0ae')}"/><path d="${Array.from({length:15},(_,i)=>{const x=-42+i*6;return`M${f(x*.3)} -45L${x} ${f(-44+7.5*Math.sqrt(1-(x/46)**2))}`}).join('')}" stroke="${c('#b89a74')}" stroke-width=".6"/>
  <path d="M-24 0C-30 -18 -27 -40 -20 -50H20C27 -40 30 -18 24 0Z" fill="url(#${I}s)"/><path d="M-16 -6Q-18 -24 -14 -42M14 -4Q17 -22 13 -40M-6 -36Q-7 -42 -5 -48" stroke="${c('#d8c4a0')}" stroke-width=".6" fill="none"/>
  <path d="M-54 -46C-56 -78 -30 -104 0 -104C30 -104 56 -78 54 -46C40 -40 -40 -40 -54 -46Z" fill="url(#${I}c)"/>
  ${[[-30,-72,7],[-8,-90,6],[18,-80,8],[39,-61,5],[-45,-56,4],[2,-63,5],[26,-94,3.4],[-23,-93,3.6],[-16,-53,3],[30,-50,3],[-40,-80,3]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r*.85)}" fill="${c('#fff8ee')}"/><ellipse cx="${f(x+r*.2)}" cy="${f(y+r*.3)}" rx="${f(r*.7)}" ry="${f(r*.45)}" fill="${c('#e8d8c8')}" opacity=".6"/>`).join('')}
  <path d="M-40 -76Q-30 -96 -10 -100" stroke="${c('#ffffff')}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".35"/>
  <path d="M32 -84V-97H37V-86" fill="${c('#8a8a96')}"/><rect x="31" y="-100" width="7" height="3" rx=".8" fill="${c('#5a5a66')}"/><circle cx="37" cy="-104" r="2.4" fill="${c('#eef0f6')}" opacity=".6"/><circle cx="41.6" cy="-107" r="1.8" fill="${c('#eef0f6')}" opacity=".45"/>
  <path d="M-9.5 0V-17A9.5 9.5 0 0 1 9.5 -17V0Z" fill="${c('#6a4022')}"/><path d="M-8 0V-17A8 8 0 0 1 8 -17V0Z" fill="${c('#9a6236')}"/><path d="M-4 -24V0M0 -25V0M4 -24V0" stroke="${c('#6a4022')}" stroke-width=".55"/>${port(o,0,-16,2.6,'#6a4022')}<circle cx="5" cy="-8" r="1.1" fill="none" stroke="${c('#e8b84a')}" stroke-width=".6"/>
  ${port(o,-15,-33,4.4,'#7a4a26')}${port(o,15.5,-27,4,'#7a4a26')}<rect x="10.5" y="-22.4" width="10" height="3" rx=".6" fill="${c('#8a5a32')}"/>${['#ff5a8a','#ffcf3a','#ffffff','#c86aff'].map((x,i)=>`<circle cx="${12+i*2.4}" cy="-23" r="1.1" fill="${c(x)}"/>`).join('')}
  <path d="M-10.6 -24Q-13.5 -24 -13.5 -21" stroke="${c('#2a2a2a')}" stroke-width=".6" fill="none"/><rect x="-15" y="-21" width="3" height="4" rx=".6" fill="${n?'#ffd27a':c('#fff0c0')}" stroke="${c('#2a2a2a')}" stroke-width=".5"/>${halo(o,-13.5,-19,8)}
  <path d="M20 0Q24 -10 22 -18Q20 -26 24 -34" stroke="${c('#3f8a3a')}" stroke-width=".9" fill="none"/>${[[22,-4],[23,-10],[21,-16],[22,-23],[23.5,-30]].map(([x,y],i)=>`<ellipse cx="${x+(i%2?1.4:-1.4)}" cy="${y}" rx="1.6" ry="1" fill="${c('#4aa040')}"/>`).join('')}
  <ellipse cx="0" cy="1.6" rx="11" ry="2" fill="${c('#b4aca2')}"/><ellipse cx="-2" cy="1.1" rx="7" ry="1.1" fill="${c('#ccc4ba')}"/>
  ${sm(38,1,cap[0])}${sm(47,.6,'#b07ad8')}${sm(-38,.8,'#c8843a')}
  ${[[-28,0],[30,0],[-46,0],[54,0]].map(([x,y])=>`<path d="M${x-2} ${y}Q${x-1.6} ${y-3} ${x-2.6} ${y-4.6}M${x} ${y}Q${x+.3} ${y-3.4} ${x} ${y-5.4}M${x+2} ${y}Q${x+1.6} ${y-3} ${x+2.8} ${y-4.2}" stroke="${c('#4a9a3a')}" stroke-width=".8" fill="none" stroke-linecap="round"/>`).join('')}`}});

JIGART.subject({id:'barn',name:'Red Barn',biomes:['farm','meadow','autumn'],place:'ground',w:1.1,draw:o=>{const c=o.c,I=o.id,n=o.night,wh=c('#f6f2ea'),lp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],
  ln=(a,b)=>`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`,front='M-56 0V-42L-50 -64L-32 -80L-14 -64L-8 -42V0Z';
  let sh='';for(const[a,b,c2,d]of[[[-8,-42],[-14,-64],[22,-44],[16,-66]],[[-14,-64],[-32,-80],[16,-66],[-2,-82]]])for(let t=.2;t<.99;t+=.2){const p=lp(a,b,t),q=lp(c2,d,t);sh+=ln(p,q);for(let s=(t*5%2<1?.06:.14);s<1;s+=.16){const m=lp(p,q,s);sh+=`M${f(m[0])} ${f(m[1])}l-.8 ${f(-(b[1]-a[1])*.2)}`}}
  const door=x=>`<rect x="${x}" y="-31" width="15" height="31" fill="${c('#b8302a')}" stroke="${wh}" stroke-width="1.6"/><path d="M${x} -31L${x+15} 0M${x+15} -31L${x} 0" stroke="${wh}" stroke-width="1.6"/>`;
  return `<defs>${D(o)}${lin(I+'m',[[0,c('#eef1f6')],[.35,c('#cfd4de')],[1,c('#7e889a')]],1,0)}${lin(I+'q',[[0,c('#de4632')],[1,c('#ae2a22')]])}${lin(I+'r',[[0,c('#7a7a8c')],[1,c('#4a4a5a')]])}<clipPath id="${I}c"><path d="${front}"/></clipPath></defs>${shadow(o,58,-4)}
  <rect x="28" y="-76" width="22" height="76" fill="url(#${I}m)"/><path d="${Array.from({length:9},(_,i)=>`M28 ${-8-i*8}Q39 ${-6.6-i*8} 50 ${-8-i*8}`).join('')}" stroke="${c('#6a7282')}" stroke-width=".6" fill="none"/>
  <path d="M28 -76Q28 -91 39 -92Q50 -91 50 -76Z" fill="url(#${I}m)"/><path d="M31 -82Q34 -89 39 -90" stroke="${c('#ffffff')}" stroke-width="1.2" fill="none" opacity=".7"/><rect x="37" y="-95" width="4" height="3.4" fill="${c('#8a94a6')}"/>
  <path d="M44.5 -2V-78M47.5 -2V-78${Array.from({length:25},(_,i)=>`M44.5 ${-4-i*3}H47.5`).join('')}" stroke="${c('#5a6272')}" stroke-width=".55"/>
  <path d="M-8 0L22 -3V-44L-8 -42Z" fill="${c('#a42622')}"/><path d="${Array.from({length:8},(_,i)=>{const x=-4.6+i*3.6,t=(x+8)/30;return`M${f(x)} ${f(-3*t)}V${f(-42-2*t)}`}).join('')}" stroke="${c('#7a1a18')}" stroke-width=".55"/>
  <g transform="translate(7 -26) skewY(-5.7) translate(-7 26)">${win(o,-1,-31,8,9,{fr:'#f6f2ea',sw:1.2})}${win(o,11,-31.2,8,9,{fr:'#f6f2ea',sw:1.2})}</g>
  <path d="M-8 -42L22 -44M22 -3V-44" stroke="${wh}" stroke-width="1.2"/>
  <path d="${P([[-8,-42],[-14,-64],[16,-66],[22,-44]])}" fill="url(#${I}r)"/><path d="${P([[-14,-64],[-32,-80],[-2,-82],[16,-66]])}" fill="${c('#8a8a9c')}"/><path d="${sh}" stroke="${c('#34343e')}" stroke-width=".5" opacity=".6" fill="none"/>
  <rect x="-22" y="-90" width="10" height="9" fill="${wh}"/><path d="M-20.5 -88H-13.5M-20.5 -86H-13.5M-20.5 -84H-13.5" stroke="${c('#5a5a66')}" stroke-width=".7"/><path d="M-24 -89.6L-17 -96.6L-10 -89.6Z" fill="${c('#5a5a6a')}"/>
  <path d="M-17 -96.6V-106M-21.5 -103H-12.5" stroke="${c('#3a3a44')}" stroke-width=".7"/><path d="M-12.5 -103l-1.6 -1.1v2.2Z M-21.5 -103l-1.4 -1.4h2Z" fill="${c('#3a3a44')}"/><circle cx="-17" cy="-98" r=".9" fill="${c('#e8b84a')}"/>
  <path d="${front}" fill="url(#${I}q)"/><g clip-path="url(#${I}c)"><path d="${Array.from({length:13},(_,i)=>`M${-52.5+i*3.5} 0V-80`).join('')}" stroke="${c('#8a1e1a')}" stroke-width=".55"/></g>
  <path d="M-56 0V-42L-50 -64L-32 -80L-14 -64L-8 -42V0" stroke="${wh}" stroke-width="2.2" stroke-linejoin="round" fill="none"/><path d="M-57.5 -41L-50.5 -65.5L-32 -82L-13.5 -65.5L-6.5 -41" stroke="${c('#4a4a58')}" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
  <path d="M-49 -33.4H-15" stroke="${c('#3a3a44')}" stroke-width="1.2"/>${door(-47)}${door(-32)}
  <rect x="-38" y="-62" width="12" height="12" fill="${c('#7a1a18')}" stroke="${wh}" stroke-width="1.3"/><path d="M-38 -62L-26 -50M-26 -62L-38 -50" stroke="${wh}" stroke-width="1.1"/><path d="M-37 -50l1 3l1 -3l1.4 3.4l1 -3.4l1.6 3l.6 -3l1.4 3.2l.8 -3.2l1 2.6l.6 -2.6" stroke="${c('#f0c84a')}" stroke-width=".8" fill="none"/>
  <rect x="-33.2" y="-73" width="2.4" height="5" fill="${c('#5a3a22')}"/><path d="M-32 -68V-64" stroke="${c('#5a3a22')}" stroke-width=".5"/><path d="M-32 -38V-41.4H-27.4" stroke="${c('#2a2a32')}" stroke-width=".9" fill="none"/><path d="M-30 -41.4H-24.8L-26 -39.4H-28.8Z" fill="${c('#2a2a32')}"/><ellipse cx="-27.4" cy="-39" rx="1.6" ry=".8" fill="${n?'#ffe9a0':c('#fff2c0')}"/>${halo(o,-27.4,-37,9)}
  ${[[6,-6.4,6.4],[19,-5.8,5.8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#e8c460')}" stroke="${c('#c89a3a')}" stroke-width=".8"/><path d="M${x} ${y}m-1 0a1 1 0 1 1 2 0a2 2 0 1 1 -4 0a3 3 0 1 1 6 0a4 4 0 1 1 -8 0" stroke="${c('#b8862a')}" stroke-width=".55" fill="none"/>`).join('')}
  <g transform="translate(-4 -1)"><ellipse cx="0" cy="-2.6" rx="3.2" ry="2.6" fill="${c('#ffffff')}"/><circle cx="2.4" cy="-5.4" r="1.6" fill="${c('#ffffff')}"/><path d="M2 -7.2l.5 -1l.5 .8l.5 -.9l.4 1.1Z" fill="${c('#e8302a')}"/><path d="M3.8 -5.6l1.4 .4l-1.4 .5Z" fill="${c('#ffb02a')}"/><circle cx="2.8" cy="-5.8" r=".35" fill="${c('#2a2a2a')}"/><path d="M-.6 0V1M.8 0V1" stroke="${c('#ffb02a')}" stroke-width=".5"/></g>`}});

JIGART.subject({id:'observatory',name:'Observatory',biomes:['mountains','desert','snow','canyon'],place:'ground',w:1.05,draw:o=>{const c=o.c,I=o.id,n=o.night,X=y=>36*Math.sqrt(Math.max(0,1-((y+46)/34)**2)),
  mer=s=>'M'+[-79.6,-78,-75,-71,-66,-60,-54,-48,-46].map(y=>`${f(s*X(y))} ${y}`).join('L'),
  slit=P([...[-46,-50,-56,-62,-68,-73,-77,-79.4].map(y=>[.04*X(y),y]),...[-79.4,-77,-73,-68,-62,-56,-50,-46].map(y=>[.34*X(y),y])]);
  return `<defs>${D(o)}${lin(I+'b',[[0,c('#f6f4f0')],[.5,c('#dedad2')],[1,c('#a8a49c')]],1,0)}${rad(I+'d',[[0,c('#ffffff')],[.5,c('#d6dce8')],[1,c('#8a94aa')]],.35,.3,.8)}${lin(I+'t',[[0,c('#ffffff')],[.6,c('#d8dce6')],[1,c('#9aa2b4')]],1,0)}</defs>${shadow(o,46)}
  ${n?spark(-38,-92,3,'#fff6c0')+spark(44,-104,2.4,'#ffffff')+spark(52,-80,1.8,'#fff6c0'):''}
  <rect x="-34" y="-46" width="68" height="46" fill="url(#${I}b)"/>${mort(o,-34,34,-46,0,6,10,'#8a867e',.35)}<rect x="-36" y="-4" width="72" height="4" fill="${c('#a8a49c')}"/>
  ${win(o,-28,-37,5.6,11,{arch:1,b:1,fr:'#6a6a7a'})}${win(o,-17,-37,5.6,11,{arch:1,b:1,fr:'#6a6a7a'})}${win(o,11.4,-37,5.6,11,{arch:1,b:1,fr:'#6a6a7a'})}${win(o,22.4,-37,5.6,11,{arch:1,b:1,fr:'#6a6a7a'})}
  <path d="M-7 -4V-17A7 7 0 0 1 7 -17V-4Z" fill="${c('#c8c4bc')}"/><path d="M-5.4 -4V-17A5.4 5.4 0 0 1 5.4 -17V-4Z" fill="${c('#2a4a7a')}"/><path d="M0 -22.4V-4" stroke="${c('#1a2a4a')}" stroke-width=".7"/><circle cx="-1.4" cy="-11" r=".5" fill="${c('#ffd84a')}"/><circle cx="1.4" cy="-11" r=".5" fill="${c('#ffd84a')}"/>
  <rect x="-1.4" y="-28" width="2.8" height="3" rx=".6" fill="${n?'#ffe9a0':c('#fff2c0')}"/>${halo(o,0,-26.5,7)}<path d="M-10 0V-4H10V0Z" fill="${c('#b8b4ac')}"/><path d="M-10 -2H10" stroke="${c('#8a867e')}" stroke-width=".5"/>
  <rect x="-37" y="-49" width="74" height="4" rx="1" fill="${c('#c8c4bc')}"/>
  <path d="M-36 -46A36 34 0 0 1 36 -46Z" fill="url(#${I}d)"/><path d="${[-.82,-.55,-.25,.62,.86].map(mer).join('')}M${f(-X(-62))} -62Q0 -59 ${f(X(-62))} -62" stroke="${c('#7a8498')}" stroke-width=".6" fill="none"/>
  <path d="${slit}" fill="${c('#141430')}"/><path d="${mer(.04)}${mer(.34)}" stroke="${c('#5a6478')}" stroke-width="1" fill="none"/>
  <g transform="translate(9 -58) rotate(38)"><rect x="-4.2" y="-34" width="8.4" height="36" rx="1" fill="url(#${I}t)"/><rect x="-4.7" y="-35" width="9.4" height="4.2" rx="1" fill="${c('#3a3a4a')}"/><rect x="-4.4" y="-18" width="8.8" height="2" fill="${c('#d8a83a')}"/><rect x="-4.4" y="-6" width="8.8" height="2" fill="${c('#d8a83a')}"/><ellipse cx="0" cy="-35" rx="4" ry="1.3" fill="${n?'#bfe0ff':c('#2a4a8a')}"/><rect x="2" y="-28" width="3.6" height="8" rx="1" fill="${c('#9aa2b4')}"/></g>
  <path d="M-30 -60Q-24 -73 -10 -77" stroke="${c('#ffffff')}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".6"/>
  <rect x="-38" y="-46.6" width="76" height="2" rx="1" fill="${c('#6a7488')}"/>
  <path d="M48 0V-16" stroke="${c('#7a7e8a')}" stroke-width="1.4"/><ellipse cx="48" cy="-20" rx="8" ry="3" fill="${c('#f4f4f8')}" stroke="${c('#9aa2b4')}" stroke-width=".7" transform="rotate(-32 48 -20)"/><path d="M48 -20L52 -27" stroke="${c('#7a7e8a')}" stroke-width=".7"/><circle cx="52.2" cy="-27.4" r="1" fill="${c('#e8443a')}"/>
  ${[[-44,-1.4,6,3],[38,-1,4,2.4],[-38,-.6,3.4,2]].map(([x,y,a,b])=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${c('#9a8e86')}"/><ellipse cx="${x-a*.3}" cy="${y-b*.4}" rx="${f(a*.4)}" ry="${f(b*.3)}" fill="${c('#c8beb4')}"/>`).join('')}`}});

JIGART.subject({id:'ferriswheel',name:'Ferris Wheel',biomes:['city','coast','candy','meadow'],place:'ground',w:1,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,H=-58,Rr=42,a0=R()*45,acc=pick(o,['#ff5a8a','#2fb6c8','#ff8a3a']),
  cols=['#ff5a6a','#ffb03a','#4ac0ff','#7ad04a','#b06aff','#ff7ad0','#ffe04a','#3ad0b0'],lc=['#fff27a','#ff8ad8','#8affea'];
  let zz='M',sp='';for(let i=0;i<=32;i++){const a=i*Math.PI/16,r=i%2?Rr:Rr-4.5;zz+=`${f(Math.cos(a)*r)} ${f(H+Math.sin(a)*r)}${i<32?'L':''}`}
  for(let i=0;i<16;i++){const a=i*Math.PI/8;sp+=`M0 ${H}L${f(Math.cos(a)*Rr)} ${f(H+Math.sin(a)*Rr)}`}
  const gon=Array.from({length:8},(_,k)=>{const a=(a0+k*45)*Math.PI/180,x=f(Math.cos(a)*Rr),y=f(H+Math.sin(a)*Rr),col=cols[k];
    return `<path d="M${x} ${y}V${f(y+4)}" stroke="${c('#5a5a6a')}" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="1" fill="${c('#5a5a6a')}"/><path d="M${f(x-5.6)} ${f(y+5)}Q${x} ${f(y+.6)} ${f(x+5.6)} ${f(y+5)}Z" fill="${c(darken(col,.15))}"/><rect x="${f(x-5)}" y="${f(y+5)}" width="10" height="7" rx="1.6" fill="${c(col)}"/><rect x="${f(x-3.8)}" y="${f(y+6)}" width="7.6" height="3.4" rx=".6" fill="url(#${I}w)"/>${halo(o,x,y+7.6,6)}<rect x="${f(x-5)}" y="${f(y+10.6)}" width="10" height="1.4" rx=".6" fill="${c(darken(col,.3))}"/>`}).join('');
  return `<defs>${D(o)}${n?glowDef(I+'L','#fff2a0',.7):''}</defs>${shadow(o,40)}
  <path d="M-20 -3L0 ${H}L20 -3" stroke="${c('#9aa0b4')}" stroke-width="2.6" fill="none"/>
  <circle cx="0" cy="${H}" r="${Rr}" fill="none" stroke="${c('#f2f4fa')}" stroke-width="2.2"/><circle cx="0" cy="${H}" r="${Rr-4.5}" fill="none" stroke="${c('#f2f4fa')}" stroke-width="1.2"/><path d="${zz}" stroke="${c(acc)}" stroke-width=".8" fill="none"/>
  <path d="${sp}" stroke="${c('#dfe3ee')}" stroke-width=".7"/><circle cx="0" cy="${H}" r="${Rr*.42}" fill="none" stroke="${c(acc)}" stroke-width="1"/>
  ${Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,x=f(Math.cos(a)*Rr),y=f(H+Math.sin(a)*Rr);return(n?glow(I+'L',x,y,3.4):'')+`<circle cx="${x}" cy="${y}" r=".95" fill="${n?lc[i%3]:c('#fff8e0')}"/>`}).join('')}
  ${gon}
  <path d="M-29 0L0 ${H}L29 0" stroke="${c('#5a6078')}" stroke-width="3.8" fill="none" stroke-linejoin="round"/><path d="M-29 0L0 ${H}L29 0" stroke="${c('#c8ccda')}" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M-17.4 -24H17.4M-9.4 -42H9.4" stroke="${c('#8a90a4')}" stroke-width="1.4"/>
  <circle cx="0" cy="${H}" r="5.6" fill="${c('#4a4e62')}"/><circle cx="0" cy="${H}" r="2.6" fill="${c(acc)}"/><circle cx="-.8" cy="${H-.8}" r=".8" fill="${c('#ffffff')}" opacity=".7"/>
  <rect x="-34" y="-4" width="68" height="4" rx=".6" fill="${c('#8a6a5a')}"/><path d="M-34 -2.6H34" stroke="${c('#6a4a3a')}" stroke-width=".5"/>
  <g transform="translate(43 0)">${[0,1,2,3,4,5].map(i=>`<rect x="${-7+i*2.4}" y="-18" width="2.4" height="18" fill="${c(i%2?'#ffffff':'#e8443a')}"/>`).join('')}<rect x="-7.6" y="-14" width="15.2" height="7" fill="${c('#f6f2ea')}"/>${win(o,-5.6,-13.4,11.2,5.4,{b:1,fr:'#8a3a2a'})}<rect x="-8.4" y="-7.2" width="16.8" height="1.6" fill="${c('#8a3a2a')}"/>
    <path d="M-9 -18L0 -26L9 -18Z" fill="${c('#e8443a')}"/><path d="M-9 -18q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0q1.5 2 3 0" fill="${c('#ffffff')}"/><path d="M0 -26V-31" stroke="${c('#5a5a6a')}" stroke-width=".6"/><path d="M0 -31L4.5 -29.6L0 -28.2Z" fill="${c('#ffcf3a')}"/></g>`}});

JIGART.subject({id:'tent',name:'Campsite',biomes:['forest','mountains','lake','desert','canyon','snow'],place:'ground',w:1.5,draw:o=>{const c=o.c,I=o.id,n=o.night,tc=pick(o,['#ff8a3a','#3aa86a','#3a7ae8','#e8443a']);
  return `<defs>${D(o)}${lin(I+'a',[[0,c(lighten(tc,.15))],[1,c(tc)]])}${lin(I+'b',[[0,c(darken(tc,.18))],[1,c(darken(tc,.34))]])}${n?rad(I+'k',[[0,'#fff0b0'],[1,'#ff9a40']],.5,.8,.8):''}</defs>${shadow(o,50,-6)}
  <path d="M-20 -66L20 -62L36 -2L8 0Z" fill="url(#${I}b)"/><path d="M-20 -66L20 -62M-6 -64.6L18 -1.2M7 -63.4L27 -1.6" stroke="${c(darken(tc,.5))}" stroke-width=".6" opacity=".6"/>
  <path d="M-48 0L-20 -66L8 0Z" fill="url(#${I}a)"/><path d="M-20 -66L-34 -33M-20 -66L-6 -33" stroke="${c(lighten(tc,.35))}" stroke-width=".7" opacity=".5"/>
  <path d="M-36 0L-20 -50L-4 0Z" fill="${n?`url(#${I}k)`:c('#3a2418')}"/>${halo(o,-20,-14,26)}<ellipse cx="-20" cy="-3.6" rx="10" ry="3.4" fill="${c('#3a6ae8')}"/><path d="M-28 -4.4Q-20 -2 -12 -4.4" stroke="${c('#2a4ab8')}" stroke-width=".6" fill="none"/><ellipse cx="-25.6" cy="-5" rx="3" ry="2" fill="${c('#f2f2f6')}"/>
  <path d="M-20 -50L-36 0L-44 -1Q-34 -18 -20 -50Z" fill="${c(lighten(tc,.32))}"/><path d="M-20 -50L-4 0L4 -1Q-6 -18 -20 -50Z" fill="${c(lighten(tc,.32))}"/><circle cx="-37.4" cy="-14" r="1" fill="none" stroke="${c('#5a3a22')}" stroke-width=".6"/><circle cx="-2.6" cy="-14" r="1" fill="none" stroke="${c('#5a3a22')}" stroke-width=".6"/>
  <path d="M-48 0L-20 -66L8 0" stroke="${c(darken(tc,.35))}" stroke-width="1.3" stroke-linejoin="round" fill="none"/><rect x="-20.6" y="-72" width="1.2" height="7" fill="${c('#6a6a76')}"/><path d="M-19.4 -72L-12 -70.2L-19.4 -68.4Z" fill="${c('#ffcf3a')}"/>
  <path d="M-20 -66L-59 1" stroke="${c('#e8e0c8')}" stroke-width=".5"/><path d="M-60 2L-58 -1.4" stroke="${c('#5a5a66')}" stroke-width="1.2"/>
  <rect x="-58" y="-17" width="11" height="17" rx="3" fill="${c('#c8443a')}"/><rect x="-57" y="-19" width="9" height="5" rx="2" fill="${c('#a8302a')}"/><rect x="-56" y="-9" width="7" height="6" rx="1.4" fill="${c('#a8302a')}"/><path d="M-55 -15V-1M-50 -15V-1" stroke="${c('#5a2a1e')}" stroke-width=".6"/><rect x="-58" y="-2.4" width="11" height="3" rx="1.4" fill="${c('#3a6a4a')}"/>
  <rect x="12" y="-5" width="18" height="5" rx="2.5" fill="${c('#8a5a32')}"/><ellipse cx="29.4" cy="-2.5" rx="1.6" ry="2.4" fill="${c('#d8a06a')}"/><path d="M14 -3.4H26" stroke="${c('#5a3a1e')}" stroke-width=".5"/>
  ${[[34.5,-.6],[38,-2],[42,-2.6],[46.5,-2.6],[50.5,-2],[53.6,-.6],[44,.6],[38.6,.6],[49.4,.6]].map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.8" fill="${c(i%2?'#8a8692':'#a8a4ae')}"/>`).join('')}
  <path d="M37 -.6L51 -4.4M37 -4.4L51 -.6" stroke="${c('#6a4020')}" stroke-width="2.4" stroke-linecap="round"/>
  ${flame(o,44,-2.4,1.5)}${flame(o,39.6,-2,.75)}${flame(o,48.6,-2,.85)}
  ${n?'':`<path d="M44 -22Q41 -28 44 -33Q47 -38 43 -44" stroke="${c('#c8c8d0')}" stroke-width="1.6" fill="none" opacity=".45" stroke-linecap="round"/>`}
  ${[[41,-24],[47.6,-28],[43.6,-32]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".6" fill="#ffb03a"/>`).join('')}`}});

JIGART.subject({id:'train',name:'Steam Train',biomes:['meadow','mountains','desert','farm','snow','autumn','canyon'],place:'ground',w:1.2,draw:o=>{const c=o.c,I=o.id,n=o.night,bc=pick(o,['#2f8a4e','#2a58b0','#c0322a']),dk=c('#2e2e38'),gd=c('#e8b84a'),
  wh=(x,y,r,sp=6)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${dk}"/><circle cx="${x}" cy="${y}" r="${f(r*.8)}" fill="${c('#c8382a')}"/><path d="${Array.from({length:sp},(_,i)=>{const a=i*Math.PI/sp;return`M${f(x-Math.cos(a)*r*.8)} ${f(y-Math.sin(a)*r*.8)}L${f(x+Math.cos(a)*r*.8)} ${f(y+Math.sin(a)*r*.8)}`}).join('')}" stroke="${c('#8a1e18')}" stroke-width="${f(r*.12)}"/><circle cx="${x}" cy="${y}" r="${f(r*.22)}" fill="${c('#d8dce6')}"/>`;
  return `<defs>${D(o)}${lin(I+'b',[[0,c(darken(bc,.25))],[.3,c(lighten(bc,.2))],[1,c(darken(bc,.4))]])}${lin(I+'l',[[0,c(lighten(bc,.1))],[1,c(darken(bc,.2))]])}${lin(I+'s',[[0,c('#ffffff')],[1,c('#c8ccd8')]])}</defs>${shadow(o,64)}
  <path d="M-65 2L-63 -2H63L65 2Z" fill="${c('#9a9084')}"/>${Array.from({length:19},(_,i)=>`<rect x="${-62+i*6.8}" y="-3" width="3.6" height="2.6" fill="${c('#6a4a32')}"/>`).join('')}<rect x="-65" y="-4.4" width="130" height="1.6" fill="${c('#7a7e8a')}"/><path d="M-65 -4.2H65" stroke="${c('#d0d4de')}" stroke-width=".4"/>
  ${[[52,-70,6],[46,-80,7.5],[36,-89,8.5],[24,-96,8]].map(([x,y,r])=>`<circle cx="${x+1}" cy="${y+1.4}" r="${r}" fill="${c('#b8bccb')}" opacity=".8"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${I}s)" opacity=".92"/>`).join('')}
  <rect x="-60" y="-17" width="54" height="4" fill="${dk}"/><rect x="-4" y="-18" width="7" height="2.6" fill="${dk}"/>
  <rect x="-62" y="-50" width="58" height="34" rx="2" fill="${c('#f4e6c8')}"/><rect x="-62" y="-32" width="58" height="16" rx="1" fill="${c('#8a2a3a')}"/><path d="M-62 -32.6H-4" stroke="${gd}" stroke-width="1"/><path d="M-60 -20H-6" stroke="${c('#6a1a2a')}" stroke-width=".5"/>
  <path d="M-64 -49.4Q-33 -58 -2 -49.4Z" fill="${c('#4a4a58')}"/>${[-50,-33,-16].map(x=>`<rect x="${x}" y="-55.6" width="4" height="2" rx=".6" fill="${c('#3a3a46')}"/>`).join('')}
  ${wrow(o,[0,1,2,3,4].map(i=>[-58+i*10.6,-46,7.4,10]),{fr:'#6a4a2a'})}<path d="M-61 -44V-20M-5 -44V-20" stroke="${c('#c8b48a')}" stroke-width=".7"/>
  ${[[-56,-15,13],[-22,-15,13]].map(([x,y,w])=>`<rect x="${x}" y="${y}" width="${w}" height="3.4" rx=".8" fill="${c('#3a3a46')}"/>`).join('')}${wh(-53,-8.6,4.4,4)}${wh(-44,-8.6,4.4,4)}${wh(-19,-8.6,4.4,4)}${wh(-10,-8.6,4.4,4)}
  <rect x="2" y="-24" width="60" height="4" fill="${dk}"/><path d="M2 -22.8H62" stroke="${c('#c8382a')}" stroke-width=".7"/><rect x="5" y="-20" width="52" height="6" fill="${dk}"/>
  <rect x="21" y="-46" width="32" height="22" rx="2" fill="url(#${I}b)"/>${[27,37,47].map(x=>`<rect x="${x}" y="-46" width="1.6" height="22" fill="${gd}"/>`).join('')}
  <rect x="51" y="-46" width="8" height="22" rx="2" fill="${dk}"/><path d="M55 -46V-24" stroke="${c('#4a4a58')}" stroke-width=".8"/>
  <path d="M50 -46L51.4 -58L48.4 -63H59.6L56.6 -58L58 -46Z" fill="${dk}"/><rect x="48" y="-65" width="12" height="2.4" rx=".6" fill="${c('#4a4a58')}"/><path d="M50.2 -61.4L51.4 -50" stroke="${c('#6a6a78')}" stroke-width=".8"/>
  <path d="M33 -46Q33 -53 37 -53Q41 -53 41 -46Z" fill="${gd}"/><path d="M24.6 -46Q24.6 -50.5 27.4 -50.5Q30.2 -50.5 30.2 -46Z" fill="${c(darken(bc,.2))}"/><path d="M44 -46l.6 -4h2.4l.6 4Z" fill="${gd}"/><rect x="23" y="-51" width="1.6" height="5" fill="${gd}"/>
  <rect x="2" y="-62" width="20" height="38" fill="url(#${I}l)"/><path d="M0 -61Q12 -67 24 -61V-58.6H0Z" fill="${dk}"/>${win(o,6,-56,11,10,{fr:'#2e2e38',b:1,sw:1.3})}<rect x="7" y="-40" width="10" height="5" rx=".6" fill="${gd}"/><path d="M9 -37.5h6" stroke="${dk}" stroke-width=".8" stroke-dasharray="1 .8"/>
  <rect x="55" y="-53" width="5" height="6" rx="1" fill="${dk}"/><circle cx="60" cy="-50" r="2.2" fill="${n?'#fff6c0':c('#fff2c0')}" stroke="${gd}" stroke-width=".6"/>${halo(o,61,-50,12)}
  <rect x="45" y="-22" width="11" height="9" rx="1.6" fill="${c('#6a6e7c')}"/><circle cx="47" cy="-20" r=".5" fill="${c('#d0d4de')}"/><circle cx="54" cy="-20" r=".5" fill="${c('#d0d4de')}"/><circle cx="47" cy="-15" r=".5" fill="${c('#d0d4de')}"/><circle cx="54" cy="-15" r=".5" fill="${c('#d0d4de')}"/>
  ${wh(9,-9.4,5.4,5)}${wh(24,-12.6,8.4)}${wh(39,-12.6,8.4)}${wh(52,-8.6,4.4,4)}<path d="M28 -10.6H43L49 -17.6" stroke="${c('#d8dce6')}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M58 -14H62L65 -4H56Z" fill="${c('#c8382a')}"/><path d="M59 -12L58 -4M61 -12L61 -4M63 -10L64 -4" stroke="${c('#8a1e18')}" stroke-width=".6"/>`}});

JIGART.subject({id:'camper',name:'Camper Van',biomes:['coast','desert','canyon','meadow','mountains','autumn'],place:'ground',w:1.5,draw:o=>{const c=o.c,I=o.id,n=o.night,bc=pick(o,['#2fb6a8','#ff8a3a','#e8443a','#3a8ae8']),cu=pick(o,['#ff8a5a','#ffcf3a','#ff6aa8']),sb=pick(o,['#ffcf3a','#ff6aa8','#4ac0ff']),ch=c('#c8ccd8'),
  wl=x=>`<circle cx="${x}" cy="-11" r="11" fill="${c('#2a2a32')}"/><circle cx="${x}" cy="-11" r="6.4" fill="${c('#f0ece4')}"/><circle cx="${x}" cy="-11" r="4.4" fill="${c(bc)}"/><circle cx="${x}" cy="-11" r="2.2" fill="${ch}"/>${[0,1,2,3,4].map(i=>{const a=i*1.2566;return`<circle cx="${f(x+Math.cos(a)*3.3)}" cy="${f(-11+Math.sin(a)*3.3)}" r=".45" fill="${c('#8a8e9a')}"/>`}).join('')}<path d="M${x-8} -15A9 9 0 0 1 ${x-2} -19.4" stroke="${c('#5a5a66')}" stroke-width=".8" fill="none"/>`,
  crt=(x,y,w,h)=>`<path d="M${x} ${y}h${f(w*.3)}Q${f(x+w*.12)} ${f(y+h*.45)} ${x} ${f(y+h*.9)}Z" fill="${c(cu)}"/><path d="M${f(x+w)} ${y}h${f(-w*.3)}Q${f(x+w*.88)} ${f(y+h*.45)} ${f(x+w)} ${f(y+h*.9)}Z" fill="${c(cu)}"/>`,
  dai=(x,y)=>`${[0,1,2,3,4,5].map(i=>{const a=i*1.0472;return`<ellipse cx="${f(x+Math.cos(a)*2.4)}" cy="${f(y+Math.sin(a)*2.4)}" rx="1.6" ry="1" transform="rotate(${f(i*60)} ${f(x+Math.cos(a)*2.4)} ${f(y+Math.sin(a)*2.4)})" fill="${c('#ffffff')}"/>`}).join('')}<circle cx="${x}" cy="${y}" r="1.3" fill="${c('#ffcf3a')}"/>`;
  return `<defs>${D(o)}${lin(I+'u',[[0,c('#ffffff')],[1,c('#f2e8d2')]])}${lin(I+'l',[[0,c(lighten(bc,.1))],[1,c(darken(bc,.2))]])}${n?lin(I+'h',[[0,'#fff6c0',.6],[1,'#fff6c0',0]],1,0):''}</defs>${shadow(o,56)}
  ${n?'<path d="M56 -32L65 -36V-22Z" fill="url(#'+I+'h)"/>':''}
  <rect x="-46" y="-67" width="82" height="1.6" fill="${c('#3a3a44')}"/>${[-40,-6,28].map(x=>`<rect x="${x}" y="-66" width="1.6" height="3" fill="${c('#3a3a44')}"/>`).join('')}
  <path d="M-48 -70Q-40 -74.6 0 -74.6Q36 -74.6 46 -71Q36 -67.4 0 -67.4Q-40 -67.4 -48 -70Z" fill="${c(sb)}"/><path d="M-44 -70.6Q0 -72.6 42 -71" stroke="${c('#ffffff')}" stroke-width="1" fill="none" opacity=".8"/><path d="M-30 -74.2V-67.6M-26 -74.4V-67.5" stroke="${c(darken(sb,.3))}" stroke-width=".8"/>
  <path d="M-56 -16V-52Q-56 -64 -44 -64H38Q50 -64 53 -52L57 -30Q58 -16 50 -16Z" fill="url(#${I}u)"/>
  <path d="M-56 -36H55.9L57 -30Q58 -16 50 -16H-56Z" fill="url(#${I}l)"/><path d="M-56 -36H55.9" stroke="${ch}" stroke-width="1.2"/><rect x="-50" y="-62.6" width="90" height="1.4" rx=".7" fill="${c('#ffffff')}" opacity=".7"/>
  ${win(o,-51,-58,12,13,{b:0,fr:'#3a3a44',sw:1.2,rx:2})}${crt(-51,-58,12,13)}${win(o,-35,-58,16,13,{b:1,fr:'#3a3a44',sw:1.2,rx:1.4})}${crt(-35,-58,16,13)}${win(o,-15,-58,16,13,{b:0,fr:'#3a3a44',sw:1.2,rx:1.4})}${crt(-15,-58,16,13)}${win(o,9,-58,14,13,{b:0,fr:'#3a3a44',sw:1.2,rx:1.4})}
  <path d="M29 -58H47.4L51.4 -45H29Z" fill="url(#${I}w)" stroke="${c('#3a3a44')}" stroke-width="1.2" stroke-linejoin="round"/>${halo(o,40,-51,10)}${n?'':`<path d="M33 -47L37 -56H40L36 -47Z" fill="${c('#ffffff')}" opacity=".6"/>`}
  <path d="M-17.5 -60V-17M6.5 -60V-17M26.5 -60V-17" stroke="${c('#8a8478')}" stroke-width=".7"/><rect x="-14.6" y="-34" width="4" height="1.4" rx=".7" fill="${ch}"/><rect x="21" y="-34" width="4" height="1.4" rx=".7" fill="${ch}"/>
  <path d="M-53 -30h7M-53 -28h7M-53 -26h7M-53 -24h7" stroke="${c(darken(bc,.35))}" stroke-width=".7"/>${dai(-6,-26)}${dai(2,-22)}${dai(-1,-29.5)}
  <path d="M-47 -16A13 13 0 0 1 -21 -16Z" fill="${c('#2a2a32')}"/><path d="M19 -16A13 13 0 0 1 45 -16Z" fill="${c('#2a2a32')}"/>${wl(-34)}${wl(32)}
  <rect x="-59" y="-24" width="6" height="5" rx="1" fill="${ch}"/><rect x="52" y="-24" width="8" height="5" rx="1.2" fill="${ch}"/><rect x="53" y="-22.6" width="6" height=".8" fill="${c('#ffffff')}" opacity=".7"/>
  <circle cx="55" cy="-32" r="2.8" fill="${ch}"/><circle cx="55" cy="-32" r="2" fill="${n?'#fff6c0':c('#fff6d8')}"/>${halo(o,55.6,-32,9)}<rect x="53.4" y="-27.4" width="3" height="1.6" rx=".6" fill="${n?'#ffb03a':c('#ffa03a')}"/>
  <path d="M46 -46L49.6 -49" stroke="${c('#3a3a44')}" stroke-width=".8"/><rect x="48.4" y="-52" width="2.6" height="3.6" rx=".8" fill="${c('#3a3a44')}"/>`}});

JIGART.subject({id:'clocktower',name:'Clock Tower',biomes:['city','meadow','snow'],place:'ground',w:.5,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,hr=R()*360,mn=R()*360,dk=c('#2a2a34'),gd=c('#d8a83a'),
  cor=(y)=>`<rect x="-24" y="${y}" width="48" height="3" fill="${c('#ddd2bc')}"/><path d="${Array.from({length:12},(_,i)=>`M${-22.6+i*4} ${y+3}h2v1.2h-2Z`).join('')}" fill="${c('#b8ac94')}"/>`,
  quo=(y0,y1)=>{let s='';for(let y=y1,i=0;y>y0;y-=4,i++)s+=`<rect x="-22" y="${y-4}" width="${i%2?4:6}" height="3.6" fill="${c('#ece4d2')}"/><rect x="${i%2?18:16}" y="${y-4}" width="${i%2?4:6}" height="3.6" fill="${c('#b8ac94')}"/>`;return s};
  return `<defs>${D(o)}${lin(I+'s',[[0,c('#efe6d4')],[.5,c('#d8ccb4')],[1,c('#ac9e84')]],1,0)}${lin(I+'b',[[0,c('#d07a58')],[.5,c('#b8603e')],[1,c('#8a4028')]],1,0)}${lin(I+'r',[[0,c('#5ab4a0')],[.5,c('#3a8a7a')],[1,c('#24605a')]],1,0)}${n?glowDef(I+'L','#fff2c0',.85):''}</defs>${shadow(o,30)}
  <rect x="-24" y="-4" width="48" height="4" fill="${c('#a8a090')}"/><rect x="-22" y="-24" width="44" height="20" fill="url(#${I}s)"/>${quo(-24,-4)}
  <path d="M-8.4 -4V-15A8.4 8.4 0 0 1 8.4 -15V-4Z" fill="${c('#c8bca4')}"/><path d="M-6.4 -4V-15A6.4 6.4 0 0 1 6.4 -15V-4Z" fill="${c('#3a5a3a')}"/><path d="M0 -21.4V-4M-6 -12H6" stroke="${c('#24402a')}" stroke-width=".6"/><circle cx="-1.4" cy="-9" r=".55" fill="${gd}"/><circle cx="1.4" cy="-9" r=".55" fill="${gd}"/>
  ${[-13,13].map(x=>`<path d="M${x} -16.6V-18.6" stroke="${dk}" stroke-width=".6"/><rect x="${x-1.5}" y="-16.6" width="3" height="4" rx=".6" fill="${n?'#ffe9a0':c('#fff2c0')}" stroke="${dk}" stroke-width=".5"/>${halo(o,x,-14.6,7)}`).join('')}
  ${cor(-27)}<rect x="-19" y="-44" width="38" height="17" fill="url(#${I}b)"/>${mort(o,-19,19,-44,-27,2.4,5,'#6a2a18',.55)}
  ${win(o,-10,-42,4.4,12,{arch:1,b:1,fr:'#5a4a3a'})}${win(o,5.6,-42,4.4,12,{arch:1,b:1,fr:'#5a4a3a'})}
  <rect x="-21" y="-47" width="42" height="3" fill="${c('#ddd2bc')}"/><rect x="-22" y="-71" width="44" height="24" fill="url(#${I}s)"/><rect x="-22" y="-71" width="3" height="24" fill="${c('#f2eadb')}"/><rect x="19" y="-71" width="3" height="24" fill="${c('#a8987c')}"/>
  ${n?glow(I+'L',0,-59,24):''}<circle cx="0" cy="-59" r="12.4" fill="${gd}"/><circle cx="0" cy="-59" r="10.8" fill="${n?'#fff4c8':c('#fbf6e8')}"/><circle cx="0" cy="-59" r="10.8" fill="none" stroke="${c('#8a6a2a')}" stroke-width=".5"/>
  <path d="${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,l=i%3?1.6:2.8;return`M${f(Math.sin(a)*9.6)} ${f(-59-Math.cos(a)*9.6)}L${f(Math.sin(a)*(9.6-l))} ${f(-59-Math.cos(a)*(9.6-l))}`}).join('')}" stroke="${dk}" stroke-width=".9"/>
  <path d="M0 -59L${f(Math.sin(hr*Math.PI/180)*5.6)} ${f(-59-Math.cos(hr*Math.PI/180)*5.6)}" stroke="${dk}" stroke-width="1.5" stroke-linecap="round"/><path d="M0 -59L${f(Math.sin(mn*Math.PI/180)*8.4)} ${f(-59-Math.cos(mn*Math.PI/180)*8.4)}" stroke="${dk}" stroke-width=".9" stroke-linecap="round"/><circle cx="0" cy="-59" r="1.1" fill="${gd}"/>
  ${cor(-74)}<rect x="-16" y="-86" width="32" height="12" fill="url(#${I}s)"/><path d="M-7 -74V-81A7 7 0 0 1 7 -81V-74Z" fill="${c('#2a2430')}"/>${n?glow(I+'g',0,-79,9):''}<path d="M-3.6 -76.4Q-3.6 -82 0 -82.6Q3.6 -82 3.6 -76.4H4.4V-75.4H-4.4V-76.4Z" fill="${gd}"/><circle cx="0" cy="-74.8" r=".9" fill="${gd}"/>
  ${[-11.5,11.5].map(x=>`<path d="M${x-2} -75V-80A2 2 0 0 1 ${x+2} -80V-75Z" fill="${c('#2a2430')}"/>`).join('')}<rect x="-19" y="-88.6" width="38" height="2.8" rx=".6" fill="${c('#ddd2bc')}"/>
  <path d="M-19.5 -88L0 -107.4L19.5 -88Z" fill="url(#${I}r)"/><path d="M-14.4 -93H14.4M-9.4 -98H9.4M-4.4 -103H4.4M0 -107L-6 -88.4M0 -107L6 -88.4" stroke="${c('#1e4a44')}" stroke-width=".55" opacity=".7"/>
  <path d="M0 -107.4V-110" stroke="${gd}" stroke-width=".8"/><circle cx="0" cy="-107.8" r="1.1" fill="${gd}"/>
  ${[[-26,-3,4],[-28.6,-6,3],[26,-3,4],[28.4,-6.4,3]].map(([x,y,r],i)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c(i%2?'#3f9a3a':'#4aa844')}"/><circle cx="${x+.6}" cy="${y-1}" r=".8" fill="${c(i<2?'#ff6a8a':'#ffcf3a')}"/>`).join('')}`}});

JIGART.subject({id:'icecreamcart',name:'Ice-Cream Cart',biomes:['coast','island','city','candy'],place:'ground',w:.88,draw:o=>{const c=o.c,I=o.id,n=o.night,[ca,cb]=pick(o,[['#ff6a8a','#ffd6e0'],['#2fc0b0','#c6f2ea'],['#ffa03a','#ffe4c0'],['#8a7aff','#e2dcff']]),wh=c('#ffffff'),
  E=Array.from({length:9},(_,k)=>{const x=-46+k*10.5;return[x,-83+2.6*((x+4)/42)**2]}),bl=['#fff27a','#ff8ad8','#8affea','#ffb03a'];
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="M-46 -80.4Q-44 -99 -4 -101Q36 -99 38 -80.4Z"/></clipPath>${lin(I+'b',[[0,c(cb)],[1,c(darken(cb,.12))]])}${rad(I+'h',[[0,c('#ffffff'),.35],[1,c('#000000'),.12]],.3,.2,.9)}${n?glowDef(I+'L','#fff2a0',.75):''}</defs>${shadow(o,38,-2)}
  <rect x="-4.8" y="-97" width="1.6" height="51" fill="${c('#c8ccd8')}"/>
  <g clip-path="url(#${I}k)">${E.slice(0,8).map(([x,y],k)=>`<path d="M-4 -101L${f(x)} ${f(y+1)}L${f(E[k+1][0])} ${f(E[k+1][1]+1)}Z" fill="${k%2?wh:c(ca)}"/>`).join('')}<rect x="-50" y="-104" width="92" height="26" fill="url(#${I}h)"/></g>
  ${E.slice(0,8).map(([x,y],k)=>{const[x2,y2]=E[k+1];return`<path d="M${f(x)} ${f(y)}Q${f((x+x2)/2)} ${f((y+y2)/2+5)} ${f(x2)} ${f(y2)}Z" fill="${k%2?c(ca):wh}"/>`}).join('')}<circle cx="-4" cy="-101.6" r="1.6" fill="${c(ca)}"/>
  ${n?E.map(([x,y],k)=>glow(I+'L',x,y+.5,3.6)+`<circle cx="${f(x)}" cy="${f(y+.5)}" r=".9" fill="${bl[k%4]}"/>`).join('')+glow(I+'L',-4,-78,10):''}<path d="M-4 -82V-79" stroke="${c('#5a5a66')}" stroke-width=".5"/><circle cx="-4" cy="-78" r="1.4" fill="${n?'#fff6c0':c('#fff2c0')}"/>
  <rect x="-28.6" y="-58" width="5" height="8" rx="1" fill="${c('#c8ccd8')}"/>${[0,1,2].map(i=>`<path d="M${-29.6} ${-58-i*2.6}L${-26.1} ${-50.6-i*2.6}L${-22.6} ${-58-i*2.6}Z" fill="${c(i?'#d8a058':'#c88a44')}" stroke="${c('#9a6a2a')}" stroke-width=".4"/>`).join('')}
  ${[[10,'#ff8ab0'],[16,'#fff2a0'],[22,'#a8f0c8']].map(([x,col])=>`<path d="M${x-3.4} -50A3.4 3.4 0 0 1 ${x+3.4} -50Z" fill="${c(col)}"/>`).join('')}<rect x="6" y="-60" width="20" height="10" rx="2" fill="${n?'#fff6d0':c('#d8f2ff')}" opacity="${n?.45:.55}" stroke="${c('#c8ccd8')}" stroke-width=".8"/>${halo(o,16,-54,10)}<path d="M9 -52L12 -58" stroke="${wh}" stroke-width=".8" opacity=".8"/>
  <rect x="-36" y="-50" width="64" height="4" rx="1.4" fill="${c('#eef0f6')}"/><path d="M-36 -47.4H28" stroke="${c('#b8bcc8')}" stroke-width=".5"/>
  <rect x="-34" y="-46" width="60" height="32" rx="3" fill="url(#${I}b)"/>${[-32,-28,-24,12,16,20].map(x=>`<rect x="${x}" y="-42" width="2" height="25" rx="1" fill="${c(ca)}" opacity=".75"/>`).join('')}
  <path d="M-34 -43${Array.from({length:15},()=>'q2 2.4 4 0').join('')}V-46H-34Z" fill="${wh}"/>
  <rect x="-16" y="-41" width="24" height="24" rx="3" fill="${wh}"/><rect x="-14.6" y="-39.6" width="21.2" height="21.2" rx="2.4" fill="none" stroke="${c(ca)}" stroke-width=".7"/>
  <path d="M-9 -31L1 -31L-4 -19Z" fill="${c('#e0a85a')}"/><path d="M-7.4 -28.4L-1.6 -22.6M-5.4 -30.6L.2 -25M-.6 -28.4L-6.4 -22.6M-2.6 -30.6L-8.2 -25" stroke="${c('#a8702e')}" stroke-width=".5"/>
  <circle cx="-6.6" cy="-33" r="3.4" fill="${c('#ff8ab0')}"/><circle cx="-1.4" cy="-33" r="3.4" fill="${c('#a8f0c8')}"/><circle cx="-4" cy="-37.4" r="3.2" fill="${c('#8a5a3a')}"/><circle cx="-4" cy="-41" r="1.1" fill="${c('#e8302a')}"/><circle cx="-5" cy="-38.4" r=".8" fill="${wh}" opacity=".6"/>
  <path d="M26 -38H38Q41 -38 41 -42" stroke="${c('#c8ccd8')}" stroke-width="1.6" fill="none"/><rect x="39.4" y="-47" width="3.2" height="6" rx="1.4" fill="${c('#3a3a44')}"/><circle cx="33" cy="-39.6" r="1.4" fill="${c('#e8b84a')}"/>
  <path d="M18 -14L21 0M16 -14L13 0" stroke="${c('#8a8e9a')}" stroke-width="1.4"/><rect x="11" y="-1" width="12" height="1.6" rx=".8" fill="${c('#5a5a66')}"/>
  <circle cx="-18" cy="-12" r="12" fill="${c('#2a2a32')}"/><circle cx="-18" cy="-12" r="9.6" fill="none" stroke="${c(ca)}" stroke-width="1.4"/><path d="${Array.from({length:8},(_,i)=>{const a=i*Math.PI/8;return`M${f(-18-Math.cos(a)*9)} ${f(-12-Math.sin(a)*9)}L${f(-18+Math.cos(a)*9)} ${f(-12+Math.sin(a)*9)}`}).join('')}" stroke="${c('#d8dce6')}" stroke-width=".55"/><circle cx="-18" cy="-12" r="2" fill="${c('#d8dce6')}"/>`}});

JIGART.subject({id:'temple',name:'Ancient Temple',biomes:['jungle','desert','canyon','volcano'],place:'ground',w:1.2,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,lv=c('#3f8a34'),
  T=[0,1,2,3,4].map(i=>[-i*13,58-i*7.5]),leaf=(x,y,a,L)=>{const r=a*Math.PI/180,tx=x+Math.cos(r)*L,ty=y+Math.sin(r)*L,mx=(x+tx)/2,my=(y+ty)/2,px=-Math.sin(r)*L*.22,py=Math.cos(r)*L*.22;return`M${f(x)} ${f(y)}Q${f(mx+px)} ${f(my+py)} ${f(tx)} ${f(ty)}Q${f(mx-px)} ${f(my-py)} ${f(x)} ${f(y)}Z`},
  fern=(x,s)=>[0,1].map(j=>`<path d="${[-160,-130,-105,-80,-55,-25].filter((_,i)=>i%2===j).map((a,i)=>leaf(x,0,a,(14+j*4)*s)).join('')}" fill="${c(j?'#3f9a3a':'#57b84a')}"/>`).join(''),
  vine=(x,y,L)=>{let d=`M${x} ${y}`,lv2='';for(let k=1;k<=L;k++){const xx=x+(k%2?1.4:-1.4),yy=y+k*3;d+=`Q${f(xx)} ${f(yy-1.5)} ${x} ${yy}`;lv2+=leaf(x,yy-1,k%2?20:160,3.2)}return`<path d="${d}" stroke="${lv}" stroke-width=".7" fill="none"/><path d="${lv2}" fill="${c('#4aa040')}"/>`};
  let tiers='',deco='',gq='',gd='';T.forEach(([y0,hb],i)=>{const ht=hb-2.5;tiers+=`<path d="${P([[-hb,y0],[-ht,y0-13],[ht,y0-13],[hb,y0]])}" fill="url(#${I}s)"/>${mort(o,-ht,ht,y0-11.8,y0,4,9,'#6a5a3e',.4)}<rect x="${-ht-1}" y="${y0-13}" width="${ht*2+2}" height="1.6" fill="${c('#e4d8b8')}"/>`;
    for(let k=0;k<Math.floor((ht-14)/7);k++)for(const sg of[-1,1]){const x=sg*(17+k*7);gq+=`M${f(x-1.6)} ${y0-8.6}h3.2v3.2h-3.2Z`;gd+=`M${x} ${y0-7}h.01`}
    {const sg=i%2?1:-1,x=sg*(16+R()*(ht-20));deco+=vine(f(x),y0-12,2+Math.floor(R()*3))+`<ellipse cx="${f(x+sg*3)}" cy="${y0-12.4}" rx="4.4" ry="1.2" fill="${c('#5aa040')}"/>`}});
  tiers+=`<path d="${gq}" fill="none" stroke="${c('#7a6a4a')}" stroke-width=".55"/><path d="${gd}" stroke="${c('#7a6a4a')}" stroke-width="1.1" stroke-linecap="round"/>`;
  return `<defs>${D(o)}${lin(I+'s',[[0,c('#d4c6a2')],[1,c('#9a8a68')]])}${lin(I+'h',[[0,c('#d8cca8')],[1,c('#ac9c78')]],1,0)}${n?rad(I+'k',[[0,'#ffe2a0'],[1,'#ff9a40']],.5,.8,.8):''}</defs>${shadow(o,60)}
  ${tiers}<path d="M-13 0L-9 -65H9L13 0Z" fill="${c('#ddd0ae')}"/><path d="${Array.from({length:19},(_,i)=>{const y=-3.4-i*3.25,w=13-(i+1)*3.25*4/65;return`M${f(-w)} ${f(y)}H${f(w)}`}).join('')}" stroke="${c('#9a8a66')}" stroke-width=".6"/><path d="M-13 0L-9 -65M13 0L9 -65" stroke="${c('#a89874')}" stroke-width="2.2"/>
  ${deco}<path d="M30 -18l2 3l-1.4 2.6l2 3M-36 -6l-2 2.4l1.6 2" stroke="${c('#5a4a32')}" stroke-width=".6" fill="none"/>
  <rect x="-19" y="-88" width="38" height="23" fill="url(#${I}h)"/>${mort(o,-19,19,-84,-65,4,8,'#6a5a3e',.35)}<rect x="-21" y="-91" width="42" height="3.4" fill="${c('#e4d8b8')}"/>
  <path d="M-12 -91V-104H12V-91ZM-8.6 -94V-100.6H-3V-94ZM3 -94V-100.6H8.6V-94Z" fill="url(#${I}h)" fill-rule="evenodd"/><path d="M-12 -104H12" stroke="${c('#e4d8b8')}" stroke-width="1.2"/>
  <rect x="-8.4" y="-84.8" width="16.8" height="3" fill="${c('#b4a482')}"/><rect x="-5" y="-88" width="3" height="2.6" fill="${c('#6a5a3e')}"/><rect x="2" y="-88" width="3" height="2.6" fill="${c('#6a5a3e')}"/>
  <path d="M-6 -65V-81.8H6V-65Z" fill="${n?`url(#${I}k)`:c('#1e160e')}"/>${halo(o,0,-72,14)}
  ${[-12,12].map(x=>`<rect x="${x-.8}" y="-73" width="1.6" height="8" fill="${c('#5a3a22')}"/><path d="M${x-2} -73h4l-.6 2h-2.8Z" fill="${c('#7a5a3a')}"/>${flame(o,x,-73,.55)}`).join('')}
  ${vine(-17,-91,4)}${vine(15,-91,3)}${vine(10,-104,2)}<ellipse cx="-14" cy="-91.4" rx="5" ry="1.4" fill="${c('#5aa040')}"/><ellipse cx="6" cy="-104.4" rx="5" ry="1.2" fill="${c('#5aa040')}"/>
  <rect x="44" y="-6" width="8" height="6" fill="${c('#b8a882')}" transform="rotate(12 48 -3)"/><rect x="34" y="-4" width="6" height="4.4" fill="${c('#a8987a')}" transform="rotate(-8 37 -2)"/>${fern(-50,.8)}${fern(52,.7)}${fern(-22,.5)}`}});

JIGART.subject({id:'tikihut',name:'Tiki Hut',biomes:['island','coast','volcano'],place:'ground',w:1,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,hw=y=>50*(y+104)/44,
  band=(yb,col)=>{let pts=[[0,-104],[-hw(yb),yb]];for(let x=-hw(yb)+3;x<hw(yb);x+=3)pts.push([x,yb+((x/3|0)%2?2.8:-.4)]);pts.push([hw(yb),yb]);return`<path d="${P(pts)}" fill="${c(col)}"/><path d="${Array.from({length:Math.floor(hw(yb)/3)},(_,i)=>{const x=-hw(yb)+4+i*6;return`M${f(x*.9)} ${f(yb-8)}L${f(x)} ${f(yb+1.4)}`}).join('')}" stroke="${c('#8a6424')}" stroke-width=".55" opacity=".6"/>`},
  pole=(x)=>`<rect x="${x-1.7}" y="-38" width="3.4" height="38" fill="${c('#8a5a32')}"/><path d="M${x-1.7} -12h3.4M${x-1.7} -10.6h3.4M${x-1.7} -30h3.4M${x-1.7} -28.6h3.4" stroke="${c('#e0c890')}" stroke-width=".6"/>`;
  const bam=`<rect x="-28" y="-66" width="56" height="26" fill="${c('#c8a058')}"/>`+Array.from({length:8},(_,i)=>`<rect x="${-24.5+i*7}" y="-66" width="3.5" height="26" fill="${c('#d8b46a')}"/>`).join('')+`<path d="${Array.from({length:16},(_,i)=>{const x=-28+i*3.5,y1=-62+R()*6;return`M${x+.3} ${f(y1)}h2.9M${x+.3} ${f(y1+9+R()*4)}h2.9M${x} -66v26`}).join('')}" stroke="${c('#8a6a2a')}" stroke-width=".5"/>`;
  return `<defs>${D(o)}${n?rad(I+'k',[[0,'#ffe2a0'],[1,'#ff9a40']],.5,.8,.8):''}</defs>${shadow(o,50)}
  <path d="M-30 -36L-12 -10M-12 -36L-30 -10M12 -36L30 -10M30 -36L12 -10" stroke="${c('#7a4a26')}" stroke-width="1"/>${[-30,-12,12,30].map(pole).join('')}
  ${bam}<path d="M-28 -66H28" stroke="${c('#8a6a2a')}" stroke-width=".8"/>
  <path d="M-7 -40V-58H7V-40Z" fill="${n?`url(#${I}k)`:c('#3a2416')}"/>${halo(o,0,-48,14)}${[-5,-2.5,0,2.5,5].map((x,i)=>`<path d="M${x} -58V-46" stroke="${c('#8a5a32')}" stroke-width=".4"/>${[0,1,2].map(j=>`<circle cx="${x}" cy="${-55+j*3.6}" r=".75" fill="${c(['#ff5a6a','#ffcf3a','#3ac0ff','#ffffff'][(i+j)%4])}"/>`).join('')}`).join('')}<path d="M-7.6 -58.6H7.6M-7.6 -58.6V-40M7.6 -58.6V-40" stroke="${c('#6a4020')}" stroke-width="1.2"/>
  ${win(o,-23.5,-58,10,9,{fr:'#6a4020',sw:1.3})}${win(o,13.5,-58,10,9,{fr:'#6a4020',sw:1.3})}
  <rect x="-38" y="-41" width="76" height="4.4" fill="${c('#a8743e')}"/><path d="${Array.from({length:19},(_,i)=>`M${-36+i*4} -41v4.4`).join('')}" stroke="${c('#6a4020')}" stroke-width=".5"/>
  <path d="M-37 -36.6Q0 -30 37 -36.6" stroke="${c('#3f8a3a')}" stroke-width=".8" fill="none"/>${Array.from({length:13},(_,i)=>{const t=i/12,x=-37+74*t,y=-36.6+6.6*4*t*(1-t)*.5*2*.5*2;return`<circle cx="${f(x)}" cy="${f(-36.6+6.6*t*(1-t)*2)}" r="1.3" fill="${c(['#ff5a8a','#ffcf3a','#ffffff','#ff8a3a'][i%4])}"/>`}).join('')}
  ${band(-60,'#c89a48')}${band(-74,'#d8ac58')}${band(-88,'#e4bc68')}<path d="M-3 -104L0 -110L3 -104Z" fill="${c('#c89a48')}"/><rect x="-3.4" y="-101" width="6.8" height="2.4" rx=".8" fill="${c('#8a5a2a')}"/>
  <path d="M26 -37L36 0M31 -37L41 0${Array.from({length:7},(_,i)=>{const t=(i+.6)/7.4;return`M${f(26+10*t)} ${f(-37+37*t)}H${f(31+10*t)}`}).join('')}" stroke="${c('#9a6a3a')}" stroke-width="1.1"/>
  <g transform="translate(-50 0)"><rect x="-6" y="-30" width="12" height="30" rx="3" fill="${c('#9a6436')}"/><rect x="-6" y="-30" width="4" height="30" rx="2" fill="${c('#b47a46')}"/>
    ${[-150,-120,-90,-60,-30].map((a,i)=>{const r=a*Math.PI/180;return`<path d="M0 -29L${f(Math.cos(r)*10)} ${f(-29+Math.sin(r)*10)}" stroke="${c(['#3fae46','#ffcf3a','#e8443a','#ffcf3a','#3fae46'][i])}" stroke-width="2.2" stroke-linecap="round"/>`}).join('')}
    <path d="M-5 -24H5" stroke="${c('#5a3418')}" stroke-width="1.6"/><ellipse cx="-2.4" cy="-20.4" rx="2.2" ry="2.6" fill="${c('#f6ead2')}"/><ellipse cx="2.4" cy="-20.4" rx="2.2" ry="2.6" fill="${c('#f6ead2')}"/><circle cx="-2.2" cy="-20" r="1" fill="${c('#2a1a10')}"/><circle cx="2.2" cy="-20" r="1" fill="${c('#2a1a10')}"/>
    <path d="M-1 -18L0 -14L1 -18Z" fill="${c('#6a3a1a')}"/><rect x="-4.4" y="-12.4" width="8.8" height="4.6" rx="1.4" fill="${c('#3a1e0e')}"/><path d="M-3 -12.4V-7.8M-1 -12.4V-7.8M1 -12.4V-7.8M3 -12.4V-7.8" stroke="${c('#f6ead2')}" stroke-width=".6"/><path d="M-5 -4H5M-5 -2H5" stroke="${c('#5a3418')}" stroke-width=".7"/></g>
  <path d="M47 0L45 -34" stroke="${c('#c8a058')}" stroke-width="1.6"/><path d="M43 -34h4.6l-.8 -3h-3Z" fill="${c('#7a4a26')}"/><path d="M42.6 -36.6h5.4" stroke="${c('#5a3418')}" stroke-width=".7"/>${flame(o,45.4,-37,.9)}
  <path d="M-22 -.6l1 -2.2l1 2.2l2.4 .2l-1.8 1.5l.6 2.3l-2.2 -1.2l-2.2 1.2l.6 -2.3l-1.8 -1.5Z" fill="${c('#ff8a4a')}"/><path d="M18 0q1.6 -3.6 3.2 0Z" fill="${c('#ffd0c0')}"/>`}});

JIGART.subject({id:'rocket',name:'Rocket',biomes:['desert','canyon','snow','meadow'],place:'ground',w:.8,draw:o=>{const c=o.c,I=o.id,n=o.night,rd=c('#e2402e'),tw=c('#d8402e');
  let lat='';for(let y=-8;y>-96;y-=11)lat+=`M20 ${y}L34 ${y-11}M34 ${y}L20 ${y-11}M20 ${y}H34`;
  return `<defs>${D(o)}${lin(I+'b',[[0,c('#c8ccd8')],[.3,c('#ffffff')],[.7,c('#e8eaf2')],[1,c('#9aa0b4')]],1,0)}${lin(I+'n',[[0,c('#ff7a5a')],[.5,c('#e2402e')],[1,c('#a82418')]],1,0)}${n?glowDef(I+'R','#ff5040',.85)+glowDef(I+'L','#fff6d0',.8):''}</defs>${shadow(o,46)}
  <rect x="19" y="-98" width="2.4" height="90" fill="${tw}"/><rect x="33" y="-98" width="2.4" height="90" fill="${tw}"/><path d="${lat}" stroke="${tw}" stroke-width=".9"/>
  <rect x="17" y="-101" width="20" height="3" fill="${c('#8a8e9a')}"/><path d="M27 -101V-108" stroke="${c('#5a5e6a')}" stroke-width=".7"/>${n?glow(I+'R',27,-108.4,6):''}<circle cx="27" cy="-108.4" r="1.2" fill="${n?'#ff6a5a':c('#e83a3a')}"/>
  <rect x="2" y="-78" width="18" height="3.6" fill="${c('#8a8e9a')}"/><path d="M3 -82H19${[4,8,12,16,19].map(x=>`M${x} -82V-78`).join('')}" stroke="${c('#5a5e6a')}" stroke-width=".6"/>
  <path d="M20 -42Q10 -46 2 -40" stroke="${c('#3a3a44')}" stroke-width="1.6" fill="none"/>
  ${[[37,-62],[37,-32]].map(([x,y])=>`<rect x="${x-1}" y="${y-2}" width="4" height="4" rx=".8" fill="${c('#5a5e6a')}"/><circle cx="${x}" cy="${y}" r="1.3" fill="${n?'#fff6d0':c('#f4f4f8')}"/>${n?glow(I+'L',x-2,y,9):''}`).join('')}
  <rect x="-40" y="-8" width="78" height="8" fill="${c('#9a9aa6')}"/><rect x="-40" y="-8" width="78" height="1.4" fill="${c('#c8c8d2')}"/><rect x="-40" y="-5.6" width="78" height="2.8" fill="${c('#2a2a32')}"/><path d="${Array.from({length:20},(_,i)=>{const x=-40+i*4;return`M${x} -2.8L${x+2} -5.6H${x+3.4}L${x+1.4} -2.8Z`}).join('')}" fill="${c('#ffcf2a')}"/><rect x="-17" y="-2.8" width="18" height="2.8" fill="${c('#3a3a44')}"/>
  <path d="M-20 -8L-14 -19M4 -8L-2 -19" stroke="${c('#6a6e7a')}" stroke-width="2"/>
  <path d="M-14.4 -22H-1.6L0 -15H-16Z" fill="${c('#4a4a56')}"/><path d="M-15 -17H-1" stroke="${c('#6a6a78')}" stroke-width=".6"/>
  <path d="M-18 -44L-28 -27V-16L-18 -24Z" fill="${rd}"/><path d="M2 -44L12 -27V-16L2 -24Z" fill="${c('#b82a1e')}"/>
  <rect x="-18" y="-87" width="20" height="65" rx="1.6" fill="url(#${I}b)"/>
  <path d="M-18 -86.4Q-17.2 -100 -8 -110Q1.2 -100 2 -86.4Z" fill="url(#${I}n)"/><path d="M-14 -90Q-12 -100 -8.6 -105" stroke="${c('#ffffff')}" stroke-width="1" fill="none" opacity=".45"/>
  <rect x="-18" y="-58" width="20" height="4" fill="${rd}"/><rect x="-18" y="-30" width="20" height="3" fill="${c('#3a3a44')}"/><path d="M-18 -44H2M-18 -67H2" stroke="${c('#a8acb8')}" stroke-width=".5"/>
  <path d="M-17 -52.6h18M-17 -32.6h18" stroke="${c('#8a8e9a')}" stroke-width=".5" stroke-dasharray=".6 1.8"/><rect x="-15.4" y="-50" width="6" height="4" fill="${c('#3a6ae8')}"/><path d="M-15.4 -48.6h6M-15.4 -47.2h6" stroke="${c('#ffffff')}" stroke-width=".45"/>
  <rect x="-9.6" y="-42" width="3.2" height="22" fill="${c('#c8301e')}"/>${port(o,-8,-72,4,'#9aa2b4')}
  ${[[-26,-7,5],[-33,-4,4],[8,-6,4.6],[14,-3,3.4],[-20,-4,3.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#f6f6fa')}" opacity=".9"/>`).join('')}`}});

/* =================== water (y=0 is the water line) =================== */
JIGART.subject({id:'sailboat',name:'Sailboat',biomes:['coast','island','lake'],place:'water',w:.8,draw:o=>{const c=o.c,I=o.id,n=o.night,ac=pick(o,['#e8443a','#2a6ad8','#ffb02a','#2fb6a8']),
  B=t=>[(1-t)**2*-1.2+2*(1-t)*t*-14+t*t*-37,(1-t)**2*-102+2*(1-t)*t*-64+t*t*-21.4],b8=B(.8),b9=B(.9);
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="M-42 -9L44 -12Q41 0 28 8L-30 8Q-40 3 -42 -9Z"/></clipPath>${lin(I+'s',[[0,c('#ffffff')],[1,c('#dde2ee')]],1,0)}${lin(I+'h',[[0,c('#ffffff')],[1,c('#d6dce8')]])}${n?glowDef(I+'L','#ffffff',.8):''}</defs>
  <path d="M0 -104L44 -12M0 -104L-42 -9M0 -80L-5 -12M0 -80L5 -12M-5 -64H5" stroke="${c('#5a5e6a')}" stroke-width=".4"/>
  <path d="M-1.2 -102Q-14 -64 -37 -21.4L-1.2 -22.4Z" fill="url(#${I}s)"/><path d="${P([[-1.2,b8[1]],b8,b9,[-1.2,b9[1]]])}" fill="${c(ac)}"/>${[.25,.5,.72].map(t=>{const b=B(t);return`<path d="M-1.2 ${f(b[1])}L${f(b[0])} ${f(b[1])}" stroke="${c('#c8ccd8')}" stroke-width=".6"/>`}).join('')}
  <path d="M2.4 -94Q24 -52 42 -13.4L4 -21Z" fill="url(#${I}s)"/><path d="M2.4 -94Q24 -52 42 -13.4" stroke="${c(ac)}" stroke-width="1.4" fill="none"/><path d="M5 -40L30 -26M4 -60L18 -42" stroke="${c('#c8ccd8')}" stroke-width=".5"/>
  <rect x="-.8" y="-104" width="1.6" height="93" fill="${c('#c8ccd8')}"/><path d="M.8 -104L8.4 -102.2L.8 -100.4Z" fill="${c(ac)}"/>${n?glow(I+'L',0,-105,7)+'<circle cx="0" cy="-105" r="1" fill="#ffffff"/>':''}
  <path d="M0 -22L-38 -20" stroke="${c('#8a8e9a')}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M-24 -9.6L-22 -17Q-21 -18.5 -18 -18.5H2Q5 -18.5 6 -16L8 -10.4Z" fill="${c('#f2f4f8')}"/><path d="M-22.4 -16H6.4" stroke="${c('#c8ccd8')}" stroke-width=".5"/>${[-19,-12,-5].map(x=>win(o,x,-15.4,5,3.2,{b:0,rx:1,fr:'#3a4a6a',sw:.8})).join('')}
  <g clip-path="url(#${I}k)"><rect x="-44" y="-14" width="90" height="12" fill="url(#${I}h)"/><rect x="-44" y="-2" width="90" height="2.6" fill="${c(ac)}"/><rect x="-44" y=".6" width="90" height="10" fill="${c('#1e3a6a')}"/></g>
  <path d="M-42 -9L44 -12" stroke="${c(ac)}" stroke-width="1.4" stroke-linecap="round"/><path d="M-41.4 -6L42.6 -9" stroke="${c('#8a94aa')}" stroke-width=".5"/>${[-20,-8,4,16].map((x,i)=>port(o,x,-4.4-i*.3,1.5,'#8a94aa')).join('')}
  <path d="M29 1.6Q36 -1.4 45 1.8M-46 1.6Q-41 -.8 -35 1.4M-22 9.4Q0 11 22 9.4" stroke="${c('#ffffff')}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/>`}});

JIGART.subject({id:'pirateship',name:'Pirate Ship',biomes:['coast','island','volcano'],place:'water',w:1.05,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,wd=c('#6a4022'),hull='M-58 -44L-30 -44L-30 -30L34 -30L40 -34L52 -35Q50 -16 40 -2Q34 6 24 8L-40 8Q-52 2 -55 -16Z',
  sail=(x,yt,yb,wt,wb)=>`<path d="M${x-wt} ${yt}L${x+wt} ${yt}Q${x+wb+3} ${(yt+yb)/2} ${x+wb} ${yb}Q${x} ${yb+3.4} ${x-wb} ${yb}Q${x-wb-3} ${(yt+yb)/2} ${x-wt} ${yt}Z" fill="url(#${I}s)"/><path d="M${f(x-wt*.4)} ${yt}Q${f(x-wb*.48)} ${(yt+yb)/2} ${f(x-wb*.42)} ${yb+1.6}M${f(x+wt*.4)} ${yt}Q${f(x+wb*.48)} ${(yt+yb)/2} ${f(x+wb*.42)} ${yb+1.6}" stroke="${c('#c8b48a')}" stroke-width=".5" fill="none"/><rect x="${f(x-wt*.2+R()*wt*.6)}" y="${f(yt+3+R()*(yb-yt-9))}" width="3.4" height="3" fill="${c('#d8c49a')}" stroke="${c('#a8946a')}" stroke-width=".3" stroke-dasharray=".6 .5"/><path d="M${x-wt-2} ${yt}H${x+wt+2}" stroke="${wd}" stroke-width="1.5" stroke-linecap="round"/>`;
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="${hull}"/></clipPath>${lin(I+'h',[[0,c('#9a6236')],[1,c('#4a2a14')]])}${lin(I+'s',[[0,c('#fbf2da')],[1,c('#d8c8a2')]],1,1)}</defs>
  <path d="M-4 -104L26 -92L63 -41.6M-42 -86L-4 -98M-55 -42L-42 -86M-30 -30L-4 -94M20 -30L-4 -94M34 -30L26 -90M48 -34L26 -90" stroke="${c('#3a2a1e')}" stroke-width=".45" fill="none"/>
  <path d="M-42 -44V-86M-4 -30V-109M26 -30V-92" stroke="${wd}" stroke-width="2.4"/>
  <path d="M26 -88L62.6 -42L45 -36Z" fill="url(#${I}s)"/><path d="M47 -34L64 -42.6" stroke="${wd}" stroke-width="1.8" stroke-linecap="round"/>
  ${sail(-42,-82,-62,10,12)}${sail(-4,-94,-78,12,15)}${sail(-4,-76,-52,16,20)}${sail(26,-86,-70,10,13)}${sail(26,-68,-46,13,16)}
  <circle cx="-4" cy="-65" r="4.2" fill="${c('#2a2a2a')}"/><rect x="-6.4" y="-62" width="4.8" height="3" rx="1" fill="${c('#2a2a2a')}"/><circle cx="-5.6" cy="-65.4" r="1.1" fill="${c('#f0e4c4')}"/><circle cx="-2.4" cy="-65.4" r="1.1" fill="${c('#f0e4c4')}"/><path d="M-11 -58L3 -54M3 -58L-11 -54" stroke="${c('#2a2a2a')}" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M-8 -98H0L-1 -101.6H-7Z" fill="${wd}"/>
  <path d="M-4 -108.8Q2 -110.2 9 -108.4V-102.2Q2 -104 -4 -102.6Z" fill="${c('#1e1e24')}"/><circle cx="2.6" cy="-106.4" r="1.5" fill="${c('#f4f0e6')}"/><path d="M.4 -103.8L4.8 -104.4" stroke="${c('#f4f0e6')}" stroke-width=".6"/>
  <path d="${hull}" fill="url(#${I}h)"/><g clip-path="url(#${I}k)"><path d="${Array.from({length:11},(_,i)=>`M-60 ${-40+i*4.4}H60`).join('')}" stroke="${c('#3a200e')}" stroke-width=".5"/><rect x="-60" y="-24" width="120" height="3.2" fill="${c('#e8b84a')}"/><rect x="-60" y="2" width="120" height="8" fill="${c('#2a1a10')}"/></g>
  ${[-20,-8,4,16,28].map(x=>`<rect x="${x-2.2}" y="-17.6" width="4.4" height="4.4" fill="${c('#2a1a10')}" stroke="${c('#a8302a')}" stroke-width=".7"/><circle cx="${x}" cy="-15.4" r="1.1" fill="${c('#5a5a62')}"/>`).join('')}
  ${[-54,-48.4,-42.8].map(x=>win(o,x,-41,4.2,5,{b:1,fr:'#e8b84a',sw:.8})).join('')}
  <path d="M-58 -48H-30${Array.from({length:8},(_,i)=>`M${-57.4+i*3.8} -48V-44`).join('')}M-30 -33.6H34${Array.from({length:17},(_,i)=>`M${-28+i*3.8} -33.6V-30`).join('')}M36 -38H52${[38,42,46,50].map(x=>`M${x} -38V-34.4`).join('')}" stroke="${c('#7a4a26')}" stroke-width=".8"/>
  <path d="M-58 -44V-52" stroke="${c('#2a2a2a')}" stroke-width=".7"/><rect x="-60" y="-56" width="4" height="4.6" rx=".8" fill="${n?'#ffd27a':c('#fff0c0')}" stroke="${c('#2a2a2a')}" stroke-width=".6"/>${halo(o,-58,-53.6,10)}
  <path d="M38 2Q46 -2 54 2M-60 2Q-52 -1 -46 1.6M-30 9.6Q0 11.4 26 9.6" stroke="${c('#ffffff')}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/>`}});

JIGART.subject({id:'paddlesteamer',name:'Paddle Steamer',biomes:['lake','coast'],place:'water',w:1.1,draw:o=>{const c=o.c,I=o.id,n=o.night,wh=c('#fbf8f0'),rd=c('#c8382a'),dk=c('#2a2a34'),gd=c('#e8b84a'),hull='M-48 -14H60L56 -4Q52 6 40 8H-40Q-48 4 -48 -14Z',
  rail=(x0,x1,y)=>`<path d="M${x0} ${y-4}H${x1}${Array.from({length:Math.floor((x1-x0)/3)+1},(_,i)=>`M${x0+i*3} ${y-4}V${y}`).join('')}" stroke="${wh}" stroke-width=".6"/>`,
  trim=(x0,x1,y)=>`<path d="M${x0} ${y}${Array.from({length:Math.floor((x1-x0)/3)},()=>'q1.5 2.2 3 0').join('')}Z" fill="${wh}"/>`;
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="${hull}"/></clipPath>${lin(I+'h',[[0,c('#ffffff')],[1,c('#d8dce6')]])}${lin(I+'d',[[0,c('#fffaf0')],[1,c('#e8e0cc')]])}</defs>
  <g><circle cx="-51" cy="-12" r="12.6" fill="none" stroke="${rd}" stroke-width="1.6"/><circle cx="-51" cy="-12" r="8" fill="none" stroke="${rd}" stroke-width="1"/><path d="${Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return`M-51 -12L${f(-51+Math.cos(a)*12.6)} ${f(-12+Math.sin(a)*12.6)}`}).join('')}" stroke="${rd}" stroke-width=".8"/>${Array.from({length:10},(_,i)=>{const a=i*36;return`<rect x="-52.2" y="-25" width="2.4" height="5" fill="${c('#8a2a1e')}" transform="rotate(${a} -51 -12)"/>`}).join('')}<circle cx="-51" cy="-12" r="2.4" fill="${dk}"/></g>
  <path d="M-48 -14L-40 -30" stroke="${dk}" stroke-width="1.4"/>
  ${[16,26].map(x=>`<rect x="${x-2.6}" y="-96" width="5.2" height="50" fill="${dk}"/><path d="M${x-2.6} -96l-1.4 -3l1 .8l.8 -2l1 1.6l.8 -2l.8 2l1 -1.6l.8 2l1 -.8l-1.4 3Z" fill="${gd}"/><rect x="${x-2.6}" y="-90" width="5.2" height="1.2" fill="${gd}"/>`).join('')}<path d="M18.6 -82H23.4" stroke="${dk}" stroke-width=".8"/>
  <circle cx="14" cy="-103" r="3.4" fill="${c('#c8ccd8')}" opacity=".7"/><circle cx="8" cy="-106" r="2.6" fill="${c('#c8ccd8')}" opacity=".5"/><circle cx="25" cy="-103.6" r="2.8" fill="${c('#c8ccd8')}" opacity=".6"/>
  <path d="${hull}" fill="url(#${I}h)"/><g clip-path="url(#${I}k)"><rect x="-50" y="-1" width="112" height="10" fill="${rd}"/><path d="M-50 -2H62" stroke="${gd}" stroke-width=".8"/></g>
  <rect x="-44" y="-30" width="90" height="16" fill="url(#${I}d)"/>${wrow(o,Array.from({length:12},(_,i)=>[-40+i*7.2,-27,4,7]),{arch:1,fr:'#8a2a1e',sw:.8})}${rail(-46,50,-14)}
  <rect x="-48" y="-32.4" width="100" height="2.4" fill="${wh}"/><rect x="-48" y="-30.4" width="100" height=".8" fill="${rd}"/>${trim(-46,50,-29.6)}
  <rect x="-36" y="-46" width="68" height="14" fill="url(#${I}d)"/>${wrow(o,Array.from({length:8},(_,i)=>[-32+i*7.6,-43,4,6.4]),{arch:1,fr:'#8a2a1e',sw:.8})}${rail(-38,34,-32)}
  <rect x="-40" y="-48.4" width="76" height="2.4" fill="${wh}"/><rect x="-40" y="-46.4" width="76" height=".8" fill="${rd}"/>${trim(-38,34,-45.6)}
  <rect x="-12" y="-60" width="18" height="12" fill="${wh}"/>${[-10,-4,2].map(x=>win(o,x,-57.6,4.4,5.4,{b:0,fr:'#3a3a44',sw:.7})).join('')}<path d="M-15 -60H9L6 -63.4H-12Z" fill="${rd}"/><path d="M-3 -63.4V-72" stroke="${dk}" stroke-width=".6"/><path d="M-3 -72L4 -70.4L-3 -68.8Z" fill="${rd}"/>
  <path d="M58 -14V-24" stroke="${dk}" stroke-width=".5"/><path d="M58 -24L63 -22.6L58 -21.2Z" fill="${c('#2a6ad8')}"/>
  <circle cx="40" cy="-21" r="2.4" fill="none" stroke="${c('#ffffff')}" stroke-width="1.2"/><circle cx="40" cy="-21" r="2.4" fill="none" stroke="${rd}" stroke-width="1.2" stroke-dasharray="1.9 1.9"/>
  <path d="M46 2Q52 -1 58 1.6M-64 1Q-58 -3 -52 1Q-46 -2 -40 1.4M-34 9.6Q0 11.4 36 9.6" stroke="${c('#ffffff')}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/>`}});

/* =================== sky (y=0 is the lowest point) =================== */
JIGART.subject({id:'balloon',name:'Hot Air Balloon',biomes:['meadow','mountains','desert','canyon','farm','coast','lake','autumn','candy','city'],place:'sky',w:.72,draw:o=>{const c=o.c,I=o.id,n=o.night,
  pal=pick(o,[['#ff5a5a','#ffd23a'],['#3a8ae8','#ffffff'],['#ff7ad0','#8ae0ff'],['#7ad04a','#ffcf3a'],['#ff8a3a','#ffffff'],['#ff5a5a','#ff9a3a','#ffd23a','#6ad04a','#3ab0ff','#7a6aff','#d86aff','#ff6aa8']]),
  X=u=>u<=.5?38*Math.sqrt(Math.max(0,1-(1-u/.5)**2)):38-29*((u-.5)/.5)**1.3,Y=u=>-106+76*u,U=[0,.03,.08,.15,.24,.35,.5,.62,.75,.88,1],S=k=>Math.sin((-90+k*22.5)*Math.PI/180),
  edge=(s,us)=>us.map(u=>[s*X(u),Y(u)]),bd=(u)=>Array.from({length:13},(_,i)=>{const t=(-90+i*15)*Math.PI/180;return[Math.sin(t)*X(u),Y(u)+2.4*Math.cos(t)]});
  const gores=Array.from({length:8},(_,k)=>`<path d="${P([...edge(S(k),U),...edge(S(k+1),[...U].reverse())])}" fill="${c(pal[k%pal.length])}"/>`).join('');
  const b1=bd(.5),b2=bd(.57);
  return `<defs>${D(o)}${rad(I+'h',[[0,c('#ffffff'),.45],[.45,c('#ffffff'),0],[.8,c('#000000'),.08],[1,c('#000000'),.3]],.32,.28,.75)}${n?glowDef(I+'L','#ffb050',.55):''}</defs>
  ${gores}<path d="${P([...b1,...[...b2].reverse()])}" fill="${c(pal.length>2?'#ffffff':darken(pal[0],.25))}"/>${b1.filter((_,i)=>i%2).map(([x,y],i)=>`<circle cx="${f(x)}" cy="${f(y+2.6)}" r="1.2" fill="${c(pal.length>2?'#ff5a8a':pal[1])}"/>`).join('')}
  <path d="${P([...edge(-1,U),...edge(1,[...U].reverse())])}" fill="url(#${I}h)"/>${n?glow(I+'L',0,-40,22):''}
  <path d="M-9 -30L-6.4 -24H6.4L9 -30Z" fill="${c(darken(pal[0],.3))}"/>
  <path d="M-8.6 -29L-7.4 -13M-3 -28L-3 -13M3 -28L3 -13M8.6 -29L7.4 -13" stroke="${c('#6a5a4a')}" stroke-width=".5"/>
  <rect x="-4" y="-22.4" width="8" height="3" rx=".6" fill="${c('#8a8e9a')}"/>${flame(o,0,-22.4,.5)}
  <circle cx="-3.4" cy="-15.4" r="2" fill="${c('#f2c8a0')}"/><path d="M-5.4 -16Q-3.4 -18.6 -1.4 -16Z" fill="${c('#6a3a1e')}"/><circle cx="3.2" cy="-15.6" r="2" fill="${c('#e8b088')}"/><path d="M1.2 -16.2H5.2L4.6 -17.8H1.8Z" fill="${c('#e8443a')}"/><path d="M5 -14.6L8.4 -19" stroke="${c('#e8b088')}" stroke-width="1" stroke-linecap="round"/>
  <rect x="-8" y="-13" width="16" height="13" rx="1.8" fill="${c('#b8844a')}"/><path d="M-8 -9.4H8M-8 -6.2H8M-8 -3H8${[-6,-2,2,6].map(x=>`M${x} -12.4V-9.4M${x+2} -9.4V-6.2M${x} -6.2V-3M${x+2} -3V0`).join('')}" stroke="${c('#7a4e26')}" stroke-width=".5"/>
  <rect x="-9" y="-14.4" width="18" height="2.8" rx="1.3" fill="${c('#6a3e1e')}"/>${[-1,1].map(s=>`<path d="M${s*8} -11v2" stroke="${c('#6a5a4a')}" stroke-width=".4"/><ellipse cx="${s*8.6}" cy="-7.6" rx="1.6" ry="2" fill="${c('#e8d8b0')}"/>`).join('')}`}});

JIGART.subject({id:'airship',name:'Airship',biomes:['city','mountains','coast','snow'],place:'sky',w:1.45,draw:o=>{const c=o.c,I=o.id,n=o.night,eb=pick(o,['#c8ccd8','#e8443a','#3a7ae8','#f2e6c8']),ac=eb==='#e8443a'?'#ffcf3a':'#e8443a',
  env='M58 -50C58 -66 40 -74 6 -74C-30 -74 -52 -62 -56 -50C-52 -38 -30 -26 6 -26C40 -26 58 -34 58 -50Z',
  fin=(pts)=>`<path d="${P(pts)}" fill="${c(ac)}"/><path d="M${pts[0][0]} ${pts[0][1]}L${pts[2][0]} ${pts[2][1]}" stroke="${c('#ffffff')}" stroke-width="1" opacity=".6"/>`,
  pod=(x,y)=>`<path d="M${x+6} ${y+5}L${x+12} ${y+9}" stroke="${c('#5a5a66')}" stroke-width=".8"/><ellipse cx="${x}" cy="${y}" rx="5.4" ry="2.6" fill="${c('#8a90a4')}"/><ellipse cx="${x-5.6}" cy="${y}" rx=".8" ry="5" fill="${c('#d8dce6')}" opacity=".85"/><circle cx="${x-5.6}" cy="${y}" r="1" fill="${c('#3a3a44')}"/>`;
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="${env}"/></clipPath>${lin(I+'e',[[0,c(lighten(eb,.5))],[.35,c(lighten(eb,.15))],[1,c(darken(eb,.32))]])}${n?glowDef(I+'R','#ff4a3a',.9)+glowDef(I+'G','#4aff8a',.9):''}</defs>
  ${fin([[-36,-64],[-54,-84],[-62,-84],[-55,-58]])}${fin([[-36,-36],[-54,-16],[-62,-16],[-55,-42]])}
  <path d="M-14 -27L-12 -17M18 -27L16 -17M-2 -26L0 -18" stroke="${c('#5a5a66')}" stroke-width=".6"/>
  <path d="${env}" fill="url(#${I}e)"/><g clip-path="url(#${I}k)"><rect x="-60" y="-52.4" width="120" height="5.4" fill="${c(ac)}"/><rect x="51" y="-76" width="10" height="52" fill="${c(darken(eb,.2))}"/>
    <path d="${[-38,-22,-6,10,26,42].map(x=>`M${x} -76Q${x+5} -50 ${x} -24`).join('')}" stroke="${c(darken(eb,.4))}" stroke-width=".6" opacity=".5" fill="none"/></g>
  <path d="M-30 -68Q6 -74 40 -67" stroke="${c('#ffffff')}" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>
  <circle cx="22" cy="-61.6" r="4.6" fill="${c('#ffffff')}" stroke="${c(ac)}" stroke-width="1"/>${spark(22,-61.6,3.2,c(ac))}
  ${fin([[-40,-52],[-63,-54],[-63,-46],[-40,-48]])}
  <path d="M-16 -18H20Q24 -18 22 -12L18 -2Q16 0 12 0H-8Q-12 0 -14 -2L-18 -12Q-19 -18 -16 -18Z" fill="${c('#efe8da')}"/><path d="M-17.6 -6H20.6" stroke="${c(ac)}" stroke-width="1.6"/><path d="M-16 -18H20" stroke="${c('#8a8478')}" stroke-width="1"/>
  ${[0,1,2,3,4,5].map(i=>win(o,-12.6+i*5.4,-15.6,3.4,5,{b:0,fr:'#5a5a66',sw:.6,rx:.8})).join('')}
  ${pod(-24,-22)}${pod(28,-22).replace(`M34 -17L40 -13`,'M22 -17L16 -13')}
  ${n?glow(I+'R',-62,-84,7)+glow(I+'G',-62,-16,7):''}<circle cx="-62" cy="-84" r="1.2" fill="${n?'#ff6a5a':c('#e8443a')}"/><circle cx="-62" cy="-16" r="1.2" fill="${n?'#6aff9a':c('#3ac06a')}"/>`}});

JIGART.subject({id:'ufo',name:'Flying Saucer',biomes:['desert','canyon','farm','snow','city','meadow'],place:'sky',w:1,draw:o=>{const c=o.c,I=o.id,n=o.night,lc=['#fffa8a','#8affea','#ff8ad8'],
  bm=n?'#d8ffb0':'#fffbd0',lights=Array.from({length:9},(_,i)=>{const t=(.1+i*.1)*Math.PI;return[f(Math.cos(t)*48),f(-80+Math.sin(t)*7.4)]});
  return `<defs>${D(o)}${lin(I+'b',[[0,bm,n?.6:.4],[1,bm,n?.1:.04]])}${lin(I+'m',[[0,c('#f6f8fc')],[.5,c('#b8c0d0')],[1,c('#6a7286')]])}${rad(I+'d',[[0,n?'#e6fff6':c('#e6fbff'),.75],[1,n?'#7ae8c8':c('#8ad8f0'),.6]],.4,.35,.7)}${n?glowDef(I+'L','#d8ffb0',.7)+glowDef(I+'R','#fff6c0',.8):''}</defs>
  <path d="M-13 -72H13L38 0H-38Z" fill="url(#${I}b)"/><ellipse cx="0" cy="-1" rx="38" ry="3.6" fill="${bm}" opacity="${n?.3:.2}"/>
  ${[[-14,-12],[16,-22],[-8,-52],[9,-46],[-20,-30]].map(([x,y],i)=>spark(x,y,1.6+i%2,n?'#f0fff0':c('#ffffff'),.8)).join('')}
  <g transform="translate(0 -34) rotate(-16)"><path d="M-11 -1Q-17 2 -16 7" stroke="${c('#ffffff')}" stroke-width="1" fill="none"/><circle cx="-16" cy="7.4" r="1.2" fill="${c('#2a2a32')}"/>
    ${[[-8,4],[-4,4.8],[4,4.8],[7.6,4]].map(([x,y])=>`<rect x="${x-1.1}" y="${y}" width="2.2" height="6" rx=".8" fill="${c('#ffffff')}"/><rect x="${x-1.1}" y="${y+4.6}" width="2.2" height="1.6" fill="${c('#3a3a42')}"/>`).join('')}
    <ellipse cx="0" cy="0" rx="11" ry="6.5" fill="${c('#ffffff')}" stroke="${c('#c8c8d4')}" stroke-width=".5"/><ellipse cx="-4" cy="-2" rx="3.4" ry="2.4" fill="${c('#2a2a32')}"/><ellipse cx="5" cy="1.6" rx="2.6" ry="2" fill="${c('#2a2a32')}"/><ellipse cx="1.4" cy="-4.4" rx="2" ry="1.2" fill="${c('#2a2a32')}"/><ellipse cx="1" cy="5.4" rx="2.2" ry="1.2" fill="${c('#ffb0c0')}"/>
    <path d="M10 -6Q9 -9 11 -10M14 -6Q15 -9 13.6 -10" stroke="${c('#f2e6c8')}" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="8.6" cy="-5" rx="1.8" ry="1" fill="${c('#8a8e9a')}"/><ellipse cx="12.4" cy="-3" rx="4.4" ry="3.6" fill="${c('#ffffff')}"/><ellipse cx="14.8" cy="-1.2" rx="2.6" ry="2" fill="${c('#ffb0b8')}"/><circle cx="14" cy="-1.4" r=".4" fill="${c('#7a3a40')}"/><circle cx="15.6" cy="-1.2" r=".4" fill="${c('#7a3a40')}"/><circle cx="11.6" cy="-4.6" r=".7" fill="${c('#2a2a32')}"/></g>
  <path d="M-30 -79A30 9 0 0 0 30 -79Z" fill="${c('#7a8094')}"/><ellipse cx="0" cy="-72.4" rx="12" ry="2.4" fill="${n?bm:c('#fff6c0')}"/>${n?glow(I+'L',0,-72,16):''}
  <ellipse cx="0" cy="-80" rx="52" ry="9" fill="url(#${I}m)"/><path d="M-52 -80A52 9 0 0 0 52 -80" stroke="${c('#5a6278')}" stroke-width="1" fill="none"/><path d="M-46 -81.6Q0 -76 46 -81.6" stroke="${c('#ffffff')}" stroke-width=".8" fill="none" opacity=".6"/>
  <ellipse cx="0" cy="-84.6" rx="34" ry="6" fill="${c('#dfe4ee')}"/><path d="M-34 -84.6A34 6 0 0 0 34 -84.6" stroke="${c('#9aa2b4')}" stroke-width=".7" fill="none"/>
  <ellipse cx="0" cy="-87.4" rx="6" ry="3" fill="${c('#6ad04a')}"/><path d="M-2 -100L-4.6 -105.6M2 -100L4.6 -105.6" stroke="${c('#5ac040')}" stroke-width=".8"/><circle cx="-4.6" cy="-105.8" r="1.2" fill="${c('#ff7ad0')}"/><circle cx="4.6" cy="-105.8" r="1.2" fill="${c('#ff7ad0')}"/>
  <path d="M5 -88Q9 -90 10 -95" stroke="${c('#6ad04a')}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="10.2" cy="-95.6" r="1.6" fill="${c('#6ad04a')}"/>
  <ellipse cx="0" cy="-95" rx="6.6" ry="7" fill="${c('#7ad85a')}"/><ellipse cx="-2.8" cy="-95.6" rx="2" ry="2.8" fill="${c('#141420')}" transform="rotate(-15 -2.8 -95.6)"/><ellipse cx="2.8" cy="-95.6" rx="2" ry="2.8" fill="${c('#141420')}" transform="rotate(15 2.8 -95.6)"/><circle cx="-3.2" cy="-96.8" r=".7" fill="${c('#ffffff')}"/><circle cx="2.4" cy="-96.8" r=".7" fill="${c('#ffffff')}"/><path d="M-1.6 -91.4Q0 -90.2 1.6 -91.4" stroke="${c('#2a5a20')}" stroke-width=".6" fill="none"/>
  <path d="M-20 -86A20 19 0 0 1 20 -86Z" fill="url(#${I}d)"/>${n?glow(I+'L',0,-94,16):''}<path d="M-13 -92A14 13 0 0 1 -4 -102" stroke="${c('#ffffff')}" stroke-width="1.4" fill="none" opacity=".75" stroke-linecap="round"/><path d="M-20.4 -86H20.4" stroke="${c('#9aa2b4')}" stroke-width="1.2"/>
  ${lights.map(([x,y],i)=>(n?glow(I+'R',x,y,4.4):'')+`<circle cx="${x}" cy="${y}" r="1.5" fill="${n?lc[i%3]:c(['#ffe9a0','#a8f0e0','#ffc0e8'][i%3])}"/>`).join('')}`}});

/* =================== under the sea =================== */
JIGART.subject({id:'submarine',name:'Yellow Submarine',biomes:['underwater'],place:'under',w:1.55,draw:o=>{const c=o.c,I=o.id,n=o.night,hull='M-48 -18Q-48 -36 -30 -36H30Q50 -36 50 -18Q50 0 30 0H-30Q-48 0 -48 -18Z',bl='#fffbd0';
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="${hull}"/></clipPath>${lin(I+'h',[[0,c('#ffe680')],[.35,c('#ffcf2a')],[1,c('#d88a10')]])}${lin(I+'b',[[0,bl,n?.7:.4],[1,bl,0]],1,0)}${n?glowDef(I+'L',bl,.9):''}</defs>
  <path d="M50 -18L65 -30V-6Z" fill="url(#${I}b)"/>
  ${[[-62,-30,1.6],[-60,-38,2.2],[-63,-47,1.4],[-58,-55,2.6],[-61,-64,1.6],[24,-64,1.4],[28,-72,2],[22,-80,1.2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#bfe8ff')}" fill-opacity=".25" stroke="${c('#e6f8ff')}" stroke-width=".5"/><circle cx="${f(x-r*.35)}" cy="${f(y-r*.35)}" r="${f(r*.3)}" fill="${c('#ffffff')}"/>`).join('')}
  <path d="M-44 -32L-56 -40H-60L-56 -26Z" fill="${c('#e8a820')}"/><path d="M-44 -4L-56 4H-60L-56 -10Z" fill="${c('#d89a18')}"/>
  <path d="M-46 -26L-58 -22V-14L-46 -10Z" fill="${c('#e8a820')}"/><ellipse cx="-60.4" cy="-23" rx="1.6" ry="5" fill="${c('#c8ccd8')}"/><ellipse cx="-60.4" cy="-13" rx="1.6" ry="5" fill="${c('#a8acb8')}"/><circle cx="-59.4" cy="-18" r="2" fill="${c('#6a6e7a')}"/>
  <path d="M-10 -35L-6 -52Q-5 -55 -2 -55H14Q17 -55 18 -52L22 -35Z" fill="url(#${I}h)"/><path d="M-6 -55H18" stroke="${c('#8a8e9a')}" stroke-width=".8"/>${[-4,0,4,8,12,16].map(x=>`<path d="M${x} -55V-58" stroke="${c('#8a8e9a')}" stroke-width=".5"/>`).join('')}<path d="M-4.6 -58H16.6" stroke="${c('#8a8e9a')}" stroke-width=".6"/>
  <rect x="10" y="-70" width="2" height="15" fill="${c('#9aa0ae')}"/><rect x="10" y="-72" width="9" height="3.6" rx="1" fill="${c('#9aa0ae')}"/><circle cx="19" cy="-70.2" r="1.6" fill="${c('#2a4a8a')}"/>
  <path d="M-8 -55V-63" stroke="${c('#5a5a66')}" stroke-width=".5"/><path d="M-8 -63L-2.6 -61.4L-8 -59.8Z" fill="${c('#e8443a')}"/>${port(o,6,-45,3,'#b8bcc8')}
  <path d="${hull}" fill="url(#${I}h)"/><g clip-path="url(#${I}k)"><rect x="-50" y="-9" width="102" height="3.4" fill="${c('#e8443a')}"/><rect x="12" y="-40" width="4" height="44" fill="${c('#e8443a')}"/></g>
  <path d="M-40 -32Q0 -38 40 -32" stroke="${c('#fff6c0')}" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/><path d="${Array.from({length:14},(_,i)=>`M${-40+i*6.2} -29.6h.01M${-40+i*6.2} -3.4h.01`).join('')}" stroke="${c('#a86a10')}" stroke-width="1" stroke-linecap="round"/>
  ${[-26,-10,30].map(x=>port(o,x,-19,4.6,'#b8bcc8')).join('')}
  <path d="M30 -12L40 -8L42 -5L30 -8Z" fill="${c('#c88a10')}"/><circle cx="48.6" cy="-18" r="2.2" fill="${n?bl:c('#fff6c0')}" stroke="${c('#b8bcc8')}" stroke-width=".8"/>${n?glow(I+'L',50,-18,10):''}`}});

JIGART.subject({id:'sunkenship',name:'Sunken Ship',biomes:['underwater'],place:'under',w:1.3,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,hull='M-44 -40L-38 -43L-33 -38L-27 -45L30 -44L47 -50L41 -24Q32 -6 14 -4H-34Q-44 -12 -44 -26L-39 -30L-46 -35Z',
  kelp=(x,h,col)=>{let d=`M${x} 0`;for(let i=1;i<=6;i++)d+=`Q${x+(i%2?5:-5)} ${f(-h*(i-.5)/6)} ${x} ${f(-h*i/6)}`;return`<path d="${d}" stroke="${c(col)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>${[1,2,3,4,5].map(i=>`<ellipse cx="${x+(i%2?3:-3)}" cy="${f(-h*i/6)}" rx="2.6" ry="1.2" fill="${c(col)}" transform="rotate(${i%2?-30:30} ${x+(i%2?3:-3)} ${f(-h*i/6)})"/>`).join('')}`};
  return `<defs>${D(o)}<clipPath id="${I}k"><path d="${hull}"/></clipPath>${lin(I+'h',[[0,c('#86704a')],[1,c('#3e3020')]])}${lin(I+'s',[[0,c('#f0dca4')],[1,c('#c8ae72')]])}${n?glowDef(I+'A','#c8fff0',.9):''}</defs>
  ${kelp(-52,46,'#3f9a5a')}${kelp(54,38,'#4aa860')}
  <g transform="rotate(-10 0 -10)">
    <path d="M-2 -44L-7 -88L-4 -86L-6 -92L-2 -88Z" fill="${c('#6a5032')}"/><path d="M-16 -78L10 -82" stroke="${c('#6a5032')}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-15 -77.6L9 -81.4L8 -64L5 -66L4 -58L0 -62L-3 -56L-6 -63L-10 -58L-12 -66Z" fill="${c('#d8ccaa')}" opacity=".85"/><circle cx="-2" cy="-71" r="2" fill="${c('#2a5a7a')}" opacity=".7"/><circle cx="4" cy="-74" r="1.2" fill="${c('#2a5a7a')}" opacity=".7"/>
    <path d="M24 -44L26 -62L28 -60L29 -64L30 -44Z" fill="${c('#6a5032')}"/>
    <path d="${hull}" fill="url(#${I}h)"/><g clip-path="url(#${I}k)"><path d="${Array.from({length:9},(_,i)=>`M-50 ${-40+i*4.4}H50`).join('')}" stroke="${c('#2a2014')}" stroke-width=".5"/><rect x="-50" y="-33" width="100" height="2.6" fill="${c('#a8884a')}"/></g>
    <path d="M-12 -26L-8 -30L-4 -27L-2 -21L-7 -18L-11 -21Z" fill="${c('#141008')}"/><path d="M22 -20L26 -24L30 -20L27 -15Z" fill="${c('#141008')}"/>
    ${[-28,8].map(x=>`<circle cx="${x}" cy="-37.6" r="2.6" fill="${c('#1e2a34')}" stroke="${c('#c8a050')}" stroke-width="1"/>`).join('')}
    <path d="M-24 -44V-48M-18 -44V-49M-12 -44V-47M14 -44V-48M20 -44.6V-49M-24 -48L-12 -48" stroke="${c('#6a5032')}" stroke-width=".9"/>
    ${[[-30,-14],[-26,-11],[-22,-15],[18,-10],[36,-30],[33,-27],[-40,-30]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.3" fill="${c('#e8e2d2')}" stroke="${c('#a8a090')}" stroke-width=".4"/>`).join('')}
    <path d="M40 -44Q42 -52 38 -58M44 -46Q48 -52 46 -60" stroke="${c('#4aa860')}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
  <path d="M-63 2Q-50 -10 -20 -12Q20 -14 50 -8Q60 -4 63 2Z" fill="url(#${I}s)"/><path d="M-40 -4Q-30 -6 -20 -4M8 -6Q18 -8 28 -6M-8 -1Q2 -3 12 -1" stroke="${c('#b89a5a')}" stroke-width=".7" fill="none"/>
  <g transform="translate(40 -9) rotate(18)"><path d="M0 -16V4M-4 -12H4M-7 0Q0 7 7 0" stroke="${c('#6a7078')}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="0" cy="-18" r="2" fill="none" stroke="${c('#6a7078')}" stroke-width="1.2"/><path d="M-8.6 -1.4L-6 1.6L-9 2.4ZM8.6 -1.4L6 1.6L9 2.4Z" fill="${c('#6a7078')}"/></g>
  <path d="M-44 -4Q-46 -10 -42 -14M-44 -4Q-40 -10 -38 -12M-42 -9Q-46 -12 -48 -12" stroke="${c('#ff7a9a')}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M16 -8l1 -2.2l1 2.2l2.4 .2l-1.8 1.5l.6 2.3l-2.2 -1.2l-2.2 1.2l.6 -2.3l-1.8 -1.5Z" fill="${c('#ff8a3a')}"/>
  <g transform="translate(-34 -60)"><ellipse cx="0" cy="0" rx="5" ry="3" fill="${c('#ffcf3a')}"/><path d="M4.6 0L8.4 -3V3Z" fill="${c('#ffb02a')}"/><path d="M-1 -2.6V2.6" stroke="${c('#3a8ae8')}" stroke-width="1"/><circle cx="-2.8" cy="-.6" r=".7" fill="${c('#1a1a2a')}"/></g>
  <g transform="translate(-34 -26)"><path d="M3 -5Q5 -12 10 -12" stroke="${c('#4a4a5a')}" stroke-width=".6" fill="none"/>${n?glow(I+'A',10,-12,8):''}<circle cx="10" cy="-12" r="1.4" fill="${n?'#e8fff6':c('#bfeedd')}"/><ellipse cx="0" cy="0" rx="6" ry="5" fill="${c('#4a4a62')}"/><path d="M5.6 -1L10 -4V4Z" transform="scale(-1 1)" fill="${c('#4a4a62')}"/><path d="M1 1.6L5.4 .4" stroke="${c('#ffffff')}" stroke-width=".6" stroke-dasharray=".6 .6"/><circle cx="2.4" cy="-1.8" r=".9" fill="${c('#ffffff')}"/></g>
  ${[[-14,-56,1.6],[-12,-64,1.2],[-15,-72,2],[24,-34,1.2],[26,-42,1.8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c('#e6f8ff')}" stroke-width=".5"/>`).join('')}`}});

JIGART.subject({id:'treasurechest',name:'Treasure Chest',biomes:['underwater'],place:'under',w:1.3,draw:o=>{const c=o.c,I=o.id,R=o.R,n=o.night,gd=c('#e8b84a'),
  gem=(x,y,s,col)=>`<path d="${P([[x-3*s,y],[x-1.8*s,y-2*s],[x+1.8*s,y-2*s],[x+3*s,y],[x,y+3.4*s]])}" fill="${c(col)}"/><path d="${P([[x-1.8*s,y-2*s],[x+1.8*s,y-2*s],[x+.8*s,y],[x-.8*s,y]])}" fill="${c(lighten(col,.45))}"/><path d="M${f(x-3*s)} ${y}H${f(x+3*s)}" stroke="${c(darken(col,.3))}" stroke-width=".4"/>`;
  const coins=[];for(let i=0;i<46;i++){const x=-29+R()*58,top=-40-17*(1-(x/31)**2);coins.push([x,top+R()*(-40-top+2)])}coins.sort((a,b)=>a[1]-b[1]);
  return `<defs>${D(o)}${rad(I+'c',[[0,c('#fff6b0')],[.6,c('#ffd23a')],[1,c('#d89a1a')]],.35,.35,.7)}${lin(I+'o',[[0,c('#a8683a')],[1,c('#6a3a1a')]])}${lin(I+'s',[[0,c('#f0dca4')],[1,c('#c8ae72')]])}${n?glowDef(I+'L','#ffd060',.6):''}</defs>
  <path d="M-60 2Q-44 -10 0 -10Q44 -10 60 2Z" fill="url(#${I}s)"/>
  ${[[-50,'#3f9a5a',30],[52,'#4aa860',24]].map(([x,col,h])=>`<path d="M${x} 0Q${x-5} ${f(-h*.3)} ${x} ${f(-h*.55)}Q${x+5} ${f(-h*.8)} ${x} ${-h}" stroke="${c(col)}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M${x+3} 0Q${x+7} ${f(-h*.3)} ${x+3} ${f(-h*.65)}" stroke="${c(col)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join('')}
  <path d="M-28 -48Q-36 -70 -32 -88Q0 -96 32 -88Q36 -70 28 -48Z" fill="${c('#5a2c14')}"/><path d="M-26 -52Q-32 -70 -29 -85Q0 -92 29 -85Q32 -70 26 -52Z" fill="${c('#8a2a3a')}"/><path d="M-30 -66Q0 -72 30 -66M-28 -76Q0 -82 29 -76" stroke="${c('#6a1a2a')}" stroke-width=".6" fill="none"/>
  <path d="M-32 -88Q0 -96 32 -88" stroke="${gd}" stroke-width="2.4" fill="none"/><path d="M-22 -50Q-27 -70 -23 -89.6M22 -50Q27 -70 23 -89.6" stroke="${gd}" stroke-width="2.6" fill="none"/>
  <path d="M-34 -40L-28 -48H28L34 -40Z" fill="${c('#3a1a0e')}"/>
  ${n?glow(I+'L',0,-50,34):''}<g fill="url(#${I}c)" stroke="${c('#b8801a')}" stroke-width=".5">${coins.map(([x,y])=>`<circle cx="${f(x)}" cy="${f(y)}" r="3"/>`).join('')}</g><path d="${coins.map(([x,y])=>`M${f(x-1.8)} ${f(y)}a1.8 1.8 0 0 1 3.6 0`).join('')}" fill="none" stroke="${c('#c8901e')}" stroke-width=".4"/>
  <g transform="translate(6 -60)"><path d="M-7 0V-6L-4 -3L0 -9L4 -3L7 -6V0Z" fill="${gd}" stroke="${c('#b8801a')}" stroke-width=".5"/><rect x="-7" y="-1.4" width="14" height="2.4" fill="${c('#d8a030')}"/><circle cx="0" cy="-.2" r="1" fill="${c('#e8302a')}"/><circle cx="-4" cy="-.2" r=".8" fill="${c('#3a8ae8')}"/><circle cx="4" cy="-.2" r=".8" fill="${c('#3ac06a')}"/><circle cx="0" cy="-9.4" r=".9" fill="${gd}"/></g>
  ${gem(-14,-50,1.3,'#e8304a')}${gem(18,-49,1.1,'#2ab06a')}${gem(-4,-45,1,'#3a7ae8')}${gem(24,-43,.9,'#a85ae8')}
  <rect x="-34" y="-40" width="68" height="34" rx="1.4" fill="url(#${I}o)"/><path d="M-34 -29H34M-34 -18H34" stroke="${c('#4a2410')}" stroke-width=".7"/>
  <rect x="-35" y="-41.4" width="70" height="4" rx="1" fill="${gd}"/><rect x="-35" y="-9" width="70" height="3.4" rx="1" fill="${gd}"/>${[-26,22].map(x=>`<rect x="${x}" y="-40" width="4" height="34" fill="${gd}"/>${[-35,-27,-19,-11].map(y=>`<circle cx="${x+2}" cy="${y}" r=".6" fill="${c('#a8701a')}"/>`).join('')}`).join('')}
  <path d="M-5 -36H5V-26Q5 -22 0 -21Q-5 -22 -5 -26Z" fill="${gd}" stroke="${c('#a8701a')}" stroke-width=".6"/><circle cx="0" cy="-30.4" r="1.3" fill="${c('#2a1a0e')}"/><path d="M-.6 -30L-1 -26.4H1L.6 -30Z" fill="${c('#2a1a0e')}"/>
  <path d="M-30 -41Q-22 -26 -10 -40.6" stroke="${c('#c8c0d0')}" stroke-width=".4" fill="none"/><g fill="${c('#f8f4fc')}" stroke="${c('#c8c0d0')}" stroke-width=".3">${Array.from({length:11},(_,i)=>{const t=i/10,x=(1-t)**2*-30+2*(1-t)*t*-22+t*t*-10,y=(1-t)**2*-41+2*(1-t)*t*-26+t*t*-40.6;return`<circle cx="${f(x)}" cy="${f(y)}" r="1.3"/>`}).join('')}</g>
  ${[[-42,-3],[-37,-1.4],[38,-3],[44,-1],[31,0],[-46,0]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3" ry="1.4" fill="url(#${I}c)" stroke="${c('#b8801a')}" stroke-width=".4"/>`).join('')}${gem(36,-6,.8,'#e8304a')}
  <path d="M-24 -1Q-24 -6 -20 -6.4Q-16 -6 -16 -1Z" fill="${c('#ffb0a0')}"/><path d="M-20 -6.2V-1M-22.4 -5.4L-21.4 -1M-17.6 -5.4L-18.6 -1" stroke="${c('#e8806a')}" stroke-width=".4"/>
  ${[[-16,-58,3.4],[14,-62,2.8],[-26,-46,2.4],[30,-40,2],[2,-68,2.4]].map(([x,y,s])=>spark(x,y,s,n?'#fffbe0':c('#ffffff'),.9)).join('')}
  ${[[40,-30,1.6],[42,-38,1.1],[38,-46,2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c('#e6f8ff')}" stroke-width=".5"/>`).join('')}`}});

/* =================== space =================== */
JIGART.subject({id:'astronaut',name:'Astronaut',biomes:['space'],place:'space',w:.95,draw:o=>{const c=o.c,I=o.id,n=o.night,su=c('#f4f6fa'),ln=c('#b8bcca'),
  limb=(d,w)=>`<path d="${d}" stroke="${ln}" stroke-width="${w+1.8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${su}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ring=(x,y,a,w)=>`<path d="M${f(x-Math.cos(a)*w)} ${f(y-Math.sin(a)*w)}L${f(x+Math.cos(a)*w)} ${f(y+Math.sin(a)*w)}" stroke="${c('#c8ccd8')}" stroke-width="1.2"/>`;
  return `<defs>${D(o)}${rad(I+'h',[[0,c('#ffffff')],[.7,c('#e8eaf2')],[1,c('#a8acbc')]],.35,.3,.8)}${lin(I+'v',[[0,c('#fff2b0')],[.45,c('#e8a83a')],[1,c('#7a4a14')]],1,1)}${lin(I+'s',[[0,c('#ffffff')],[1,c('#d0d4e0')]],1,0)}${n?glowDef(I+'L','#fff6d0',.8):''}</defs>
  <path d="M-14 -46Q-30 -40 -28 -28Q-26 -14 -40 -14Q-54 -14 -50 -26Q-46 -36 -62 -32" stroke="${c('#d8dce6')}" stroke-width="1.3" fill="none"/>
  <rect x="-19" y="-78" width="38" height="40" rx="5" fill="${c('#c8ccd8')}"/><rect x="-19" y="-78" width="38" height="5" rx="2" fill="${c('#a8acb8')}"/><path d="M15 -78L19 -92" stroke="${c('#8a8e9a')}" stroke-width=".9"/><circle cx="19" cy="-92.6" r="1.3" fill="${n?'#ff6a5a':c('#e8443a')}"/>
  ${limb('M-7 -40L-12 -22L-10 -9',11)}${limb('M7 -40L15 -25L22 -15',11)}${ring(-11.6,-24,0,5.6)}${ring(15,-25.6,-.5,5.6)}
  <rect x="-16.4" y="-9" width="12.6" height="9" rx="3" fill="${c('#8a8e9a')}"/><rect x="-16.4" y="-2.4" width="12.6" height="2.4" rx="1" fill="${c('#5a5e6a')}"/><g transform="rotate(-35 23 -13)"><rect x="17" y="-17" width="12.6" height="9" rx="3" fill="${c('#8a8e9a')}"/><rect x="17" y="-10.4" width="12.6" height="2.4" rx="1" fill="${c('#5a5e6a')}"/></g>
  ${limb('M-13 -62L-26 -66L-30 -79',9)}${limb('M13 -62L25 -54L30 -45',9)}${ring(-26,-66,1.3,4.6)}${ring(25,-54,.6,4.6)}
  <circle cx="-30.6" cy="-82" r="4.4" fill="${c('#e8eaf2')}" stroke="${ln}" stroke-width=".8"/><rect x="-34" y="-80" width="7" height="2.6" rx="1" fill="${c('#e8443a')}"/><circle cx="30.8" cy="-42.4" r="4.4" fill="${c('#e8eaf2')}" stroke="${ln}" stroke-width=".8"/><rect x="27" y="-47.6" width="7" height="2.6" rx="1" fill="${c('#e8443a')}" transform="rotate(30 30.5 -46.3)"/>
  <rect x="-15" y="-68" width="30" height="32" rx="8" fill="url(#${I}s)" stroke="${ln}" stroke-width=".9"/><path d="M-15 -42H15" stroke="${c('#c8ccd8')}" stroke-width="1.6"/>
  <rect x="-8" y="-61" width="16" height="12" rx="1.6" fill="${c('#8a90a4')}"/>${[['#ff5a5a',-4.6],['#5aff8a',0],['#5ab4ff',4.6]].map(([col,x])=>(n?glow(I+'L',x,-57.6,3.4):'')+`<circle cx="${x}" cy="-57.6" r="1.3" fill="${n?col:c(col)}"/>`).join('')}<rect x="-5.6" y="-54.6" width="11.2" height="3.6" rx=".6" fill="${n?'#8affea':c('#3a5a6a')}"/><path d="M-4 -52.8h5" stroke="${n?'#1a6a5a':c('#8ad8e0')}" stroke-width=".5"/>
  <rect x="6.4" y="-66.6" width="6" height="4" fill="${c('#3a6ae8')}"/><path d="M6.4 -65.4h6M6.4 -64h6" stroke="${c('#ffffff')}" stroke-width=".4"/><rect x="6.4" y="-66.6" width="2.4" height="2" fill="${c('#e8443a')}"/>
  <ellipse cx="0" cy="-71" rx="10.4" ry="3.2" fill="${c('#a8acb8')}"/><circle cx="0" cy="-86" r="15" fill="url(#${I}h)"/>
  <ellipse cx="0" cy="-86" rx="11" ry="9.6" fill="url(#${I}v)" stroke="${c('#8a8e9a')}" stroke-width="1"/><path d="M-7.6 -88Q-6 -93 -1 -94.4" stroke="${c('#ffffff')}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/><circle cx="5" cy="-82" r="2.2" fill="${c('#4ab4ff')}" opacity=".75"/><path d="M3.6 -82.8Q5 -84 6.6 -83" stroke="${c('#6ad04a')}" stroke-width=".8" fill="none" opacity=".8"/>${spark(-4,-82,1.2,c('#ffffff'),.85)}${spark(6.4,-89,.9,c('#ffffff'),.8)}
  <rect x="9" y="-99" width="4.4" height="3" rx="1" fill="${c('#8a8e9a')}" transform="rotate(35 11 -97.5)"/>${n?glow(I+'L',12,-98.6,7):''}<circle cx="12.2" cy="-98.4" r="1" fill="${n?'#fff6d0':c('#fff2c0')}"/>`}});

JIGART.subject({id:'spacestation',name:'Space Station',biomes:['space'],place:'space',w:1.6,draw:o=>{const c=o.c,I=o.id,n=o.night,gd=c('#e8b84a'),
  panel=(x,y,h)=>`<path d="M${x+6.5} ${y<-40?y+h:y}V-40" stroke="${c('#9aa0ae')}" stroke-width=".8"/><rect x="${x}" y="${y}" width="13" height="${h}" fill="url(#${I}p)" stroke="${gd}" stroke-width=".7"/><path d="M${x+6.5} ${y}V${y+h}${Array.from({length:Math.floor(h/4.2)},(_,i)=>`M${x} ${f(y+4.2*(i+1))}H${x+13}`).join('')}" stroke="${c('#6a8ae8')}" stroke-width=".4"/><path d="M${x+1} ${y+h*.7}L${x+12} ${y+h*.2}" stroke="${c('#ffffff')}" stroke-width="2" opacity=".18"/>`;
  let tr='M-64 -41.5H64M-64 -38.5H64';for(let x=-64;x<64;x+=3)tr+=`M${x} -41.5L${x+3} -38.5`;
  return `<defs>${D(o)}${lin(I+'p',[[0,c('#3a5ad8')],[1,c('#1a2a7a')]],1,1)}${lin(I+'m',[[0,c('#ffffff')],[.4,c('#d8dce6')],[1,c('#8a90a4')]])}${n?glowDef(I+'R','#ff4a3a',.9)+glowDef(I+'G','#4aff8a',.9):''}</defs>
  <path d="${tr}" stroke="${c('#b8bcc8')}" stroke-width=".7"/>
  ${panel(-60,-76,30)}${panel(-45,-76,30)}${panel(32,-76,30)}${panel(47,-76,30)}${panel(-60,-34,30)}${panel(-45,-34,30)}${panel(32,-34,30)}${panel(47,-34,30)}
  <rect x="-6" y="-32" width="12" height="18" rx="2" fill="${c('#e8c060')}"/><path d="M-5 -28L-1 -26L-4 -22L1 -19M2 -30L5 -26L2 -22" stroke="${c('#b8902a')}" stroke-width=".5" fill="none"/>
  <path d="M0 -14V-9" stroke="${c('#9aa0ae')}" stroke-width="1.2"/><path d="M-9 -8Q0 2 9 -8Z" fill="${c('#f4f4f8')}"/><ellipse cx="0" cy="-8" rx="9" ry="1.8" fill="${c('#d8dce6')}" stroke="${c('#9aa0ae')}" stroke-width=".5"/><path d="M0 -8V-3" stroke="${c('#8a8e9a')}" stroke-width=".6"/><circle cx="0" cy="-2.6" r=".9" fill="${c('#8a8e9a')}"/>
  <rect x="-7" y="-66" width="14" height="20" rx="2" fill="url(#${I}m)"/><rect x="-4" y="-70" width="8" height="4" fill="${c('#9aa0ae')}"/><path d="M-5 -70L-3 -80H3L5 -70Z" fill="${c('#f2f2f6')}"/><path d="M-3 -80Q0 -83 3 -80" fill="${c('#d8dce6')}"/>${port(o,0,-74.6,1.4,'#8a8e9a')}${port(o,0,-58,2.4,'#9aa0ae')}
  <rect x="-28" y="-48" width="56" height="16" rx="5" fill="url(#${I}m)"/><path d="M-20 -48V-32M-10 -48V-32M10 -48V-32M20 -48V-32" stroke="${c('#8a90a4')}" stroke-width=".6"/><rect x="-28" y="-41" width="56" height="2" fill="${c('#c8ccd8')}"/>
  ${[-23,-15,15,23].map(x=>port(o,x,-44.6,1.8,'#8a90a4')).join('')}
  <path d="M16 -48L26 -60L22 -68" stroke="${c('#f4f4f8')}" stroke-width="2.2" fill="none" stroke-linejoin="round"/><circle cx="26" cy="-60" r="1.6" fill="${c('#8a90a4')}"/><path d="M20 -70L22 -68L24 -71" stroke="${c('#8a90a4')}" stroke-width="1" fill="none"/>
  <rect x="-26" y="-60" width="7" height="10" fill="${c('#f4f4f8')}" stroke="${c('#c8ccd8')}" stroke-width=".5"/><path d="M-26 -57h7M-26 -54h7M-22.5 -50V-48" stroke="${c('#c8ccd8')}" stroke-width=".5"/>
  ${n?glow(I+'R',-64,-40,7)+glow(I+'G',64,-40,7):''}<circle cx="-64" cy="-40" r="1.3" fill="${n?'#ff6a5a':c('#e8443a')}"/><circle cx="64" cy="-40" r="1.3" fill="${n?'#6aff9a':c('#3ac06a')}"/>`}});

JIGART.subject({id:'rover',name:'Moon Buggy',biomes:['space'],place:'space',w:1.25,draw:o=>{const c=o.c,I=o.id,n=o.night,fl=pick(o,[['#3a6ae8','#ffffff'],['#e8443a','#ffcf3a'],['#2fb6a8','#ffffff']]),
  wheel=(x,y,r,dim)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c(dim?'#6a6e7a':'#8a8e9a')}"/><path d="${Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return`M${f(x+Math.cos(a)*(r-2.2))} ${f(y+Math.sin(a)*(r-2.2))}L${f(x+Math.cos(a+.3)*r)} ${f(y+Math.sin(a+.3)*r)}`}).join('')}" stroke="${c('#4a4e5a')}" stroke-width=".7"/><circle cx="${x}" cy="${y}" r="${f(r*.55)}" fill="${c(dim?'#3a3a46':'#4a4e5a')}"/><circle cx="${x}" cy="${y}" r="${f(r*.25)}" fill="${c('#e8b84a')}"/>`;
  return `<defs>${D(o)}${rad(I+'r',[[0,c('#d8d4e0')],[.6,c('#a8a4b4')],[1,c('#66627a')]],.4,.25,.8)}${n?lin(I+'b',[[0,'#fff6c0',.6],[1,'#fff6c0',0]],1,0)+glowDef(I+'L','#fff6d0',.8):''}</defs>
  <path d="M-50 0Q-57 -10 -46 -20Q-36 -30 -14 -28Q0 -33 18 -29Q40 -31 48 -18Q57 -8 50 0Q0 4 -50 0Z" fill="url(#${I}r)"/>
  ${[[-30,-12,6.4,2.6],[12,-9,8,3],[36,-19,4,1.8],[-8,-22,3,1.2],[-44,-5,3.4,1.4]].map(([x,y,a,b])=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${c('#7a768a')}"/><path d="M${x-a} ${y}A${a} ${b} 0 0 0 ${x+a} ${y}" stroke="${c('#e2deea')}" stroke-width=".8" fill="none"/>`).join('')}
  <path d="M-48 -24h2M-43 -25h2M-38 -26.4h2M-33 -27.4h2" stroke="${c('#5a566a')}" stroke-width="1.2"/>
  ${n?'<path d="M33 -44L64 -52V-36Z" fill="url(#'+I+'b)"/>':''}
  ${wheel(-20,-36,7,1)}${wheel(26,-36,7,1)}
  <path d="M-30 -80V-46" stroke="${c('#c8ccd8')}" stroke-width=".9"/><rect x="-30" y="-81" width="15" height="9" fill="${c(fl[0])}"/><path d="M-30 -78h15M-30 -75h15" stroke="${c(fl[1])}" stroke-width=".9"/>${spark(-25.6,-77.4,2,c(fl[1]))}<path d="M-30 -81H-15" stroke="${c('#c8ccd8')}" stroke-width=".7"/>
  <path d="M24 -46V-64" stroke="${c('#9aa0ae')}" stroke-width="1.2"/><g transform="rotate(-25 23 -68)"><path d="M14 -68Q23 -63 32 -68Z" fill="${c('#e8eaf2')}"/><ellipse cx="23" cy="-68" rx="9" ry="1.8" fill="${c('#f6f6fa')}" stroke="${c('#9aa0ae')}" stroke-width=".5"/><path d="M23 -68V-73M16 -68L23 -73M30 -68L23 -73" stroke="${c('#9aa0ae')}" stroke-width=".5"/></g>
  <rect x="17" y="-60" width="6" height="4" rx=".8" fill="${c('#5a5e6a')}"/><circle cx="23" cy="-58" r="1.2" fill="${c('#2a4a8a')}"/>
  <rect x="-18" y="-41" width="32" height="6" fill="${c('#e8c060')}"/><path d="M-16 -38L-10 -40L-4 -37L2 -40L8 -37" stroke="${c('#b8902a')}" stroke-width=".5" fill="none"/>
  <path d="M-33 -46H31L34 -42L31 -40H-30Z" fill="${c('#c8ccd8')}"/><path d="M-33 -46H31" stroke="${c('#f4f6fa')}" stroke-width="1"/>
  ${[-14,-2].map(x=>`<path d="M${x} -46V-50H${x+8}V-46Z" fill="${c('#3a5ab8')}"/><path d="M${x} -50L${x-1.4} -58H${x+1.6}L${x+2.4} -50Z" fill="${c('#3a5ab8')}"/>`).join('')}
  <path d="M13 -46L11 -55" stroke="${c('#8a8e9a')}" stroke-width="1.2"/><path d="M8 -55.6H14" stroke="${c('#5a5e6a')}" stroke-width="1.4" stroke-linecap="round"/><rect x="9.2" y="-53" width="5" height="3.2" rx=".6" fill="${n?'#8affea':c('#3a5a6a')}"/>
  <rect x="31" y="-46" width="3" height="3.4" rx=".6" fill="${c('#8a8e9a')}"/><circle cx="33.6" cy="-44.3" r="1.2" fill="${n?'#fff6d0':c('#fff2c0')}"/>${n?glow(I+'L',34,-44,8):''}
  <path d="M-30 -40A10 10 0 0 1 -10 -40M16 -40A10 10 0 0 1 36 -40" stroke="${c('#e8eaf2')}" stroke-width="2" fill="none"/>
  ${wheel(-20,-34,7.4,0)}${wheel(26,-34,7.4,0)}`}});

/*END*/
})();
