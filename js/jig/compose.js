'use strict';
/* ====================== Jigsaw art: biomes and the composer ======================
   JIGART.compose(n) builds puzzle picture n: {svg, title, sub, biome, time, main, side}.
   How n picks the parts, so pictures do not repeat:
   - the 18 biomes take turns in a fixed order, so neighbouring puzzles never share a biome;
   - on its j-th turn a biome walks through every (main subject x time of day) pair it allows, in a scrambled order
     with no repeats, which is roughly 1,000 puzzles before any (biome, subject, time) comes back;
   - the side subject, layout, mirror image, details, weather and frame colour come from a random source seeded with n,
     so even then the picture is different.
   Layers, back to front: sky, sun/moon/stars, far land, sky subjects, middle land, main subject, near land and its
   details, side subject, weather, then a thin inner border that marks the edge and corner pieces. */
(()=>{
const {W,H,TIMES,h:{f,mix,lighten,darken,lin,rad,P,glowDef,glow,cloud,pine,bird,stars,spark,flower,tuft}}=JIGART;
/* ---------- shape helpers ---------- */
const pts=(R,y,amp,n,x0=-4,x1=W+4)=>Array.from({length:n+1},(_,i)=>[x0+(x1-x0)*i/n,y+(R()*2-1)*amp]);
/* a smooth line through points, closed down to `bottom` */
const smooth=(p,bottom=H+2)=>{let d=`M${f(p[0][0])} ${f(bottom)}L${f(p[0][0])} ${f(p[0][1])}`;
  for(let i=0;i<p.length-1;i++){const[x0,y0]=p[i],[x1,y1]=p[i+1],m=(x0+x1)/2;d+=`C${f(m)} ${f(y0)} ${f(m)} ${f(y1)} ${f(x1)} ${f(y1)}`}
  const e=p[p.length-1];return d+`L${f(e[0])} ${f(bottom)}Z`};
/* just the line itself (for foam, shore lines) */
const curve=p=>{let d=`M${f(p[0][0])} ${f(p[0][1])}`;for(let i=0;i<p.length-1;i++){const[x0,y0]=p[i],[x1,y1]=p[i+1],m=(x0+x1)/2;d+=`C${f(m)} ${f(y0)} ${f(m)} ${f(y1)} ${f(x1)} ${f(y1)}`}return d};
const yAt=(p,x)=>{for(let i=0;i<p.length-1;i++){const[x0,y0]=p[i],[x1,y1]=p[i+1];if(x>=x0&&x<=x1){const t=(x-x0)/(x1-x0),s=t*t*(3-2*t);return y0+(y1-y0)*s}}return p[p.length-1][1]};
const hill=(p,fill,bottom)=>`<path d="${smooth(p,bottom)}" fill="${fill}"/>`;
/* a jagged ridge (mountains) through n peaks; returns the points too, for snow caps */
const peaks=(R,base,top,n)=>{const p=[[-4,base]];for(let i=0;i<n;i++){const x=(i+.5)/n*W+(R()-.5)*W/n*.5;p.push([x-W/n*.42,base-(top*.35)*R()],[x,base-top*(.6+R()*.4)])}p.push([W+4,base-top*.3*R()]);return p};
const ridge=(p,fill,bottom=H+2)=>`<path d="${P([[p[0][0],bottom],...p,[p[p.length-1][0],bottom]])}" fill="${fill}"/>`;
const caps=(p,c,base)=>p.filter((q,i)=>i%2===0&&i>0&&q[1]<base-30).map(([x,y])=>{const d=(base-y)*.22;return`<path d="${P([[x,y],[x+d*.9,y+d],[x+d*.4,y+d*.8],[x,y+d*1.15],[x-d*.45,y+d*.75],[x-d*.9,y+d]])}" fill="${c}"/>`}).join('');
const scatter=(R,n,x0,x1,y0,y1,fn)=>Array.from({length:n},(_,i)=>fn(x0+R()*(x1-x0),y0+R()*(y1-y0),i)).join('');
const rock=(x,y,s,c,c2)=>`<path d="M${f(x-7*s)} ${f(y)}Q${f(x-8*s)} ${f(y-6*s)} ${f(x-2*s)} ${f(y-8*s)}Q${f(x+6*s)} ${f(y-9*s)} ${f(x+8*s)} ${f(y-2*s)}L${f(x+8*s)} ${f(y)}Z" fill="${c}"/><path d="M${f(x-2*s)} ${f(y-8*s)}Q${f(x+4*s)} ${f(y-8*s)} ${f(x+6*s)} ${f(y-4*s)}" stroke="${c2}" stroke-width="${f(1.2*s)}" fill="none" stroke-linecap="round" opacity=".7"/>`;
const ellipseShadow=(x,y,rx)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx*.18)}" fill="#000" opacity=".18"/>`;
const tree=(x,y,s,c,c2,trunk)=>`<g><rect x="${f(x-1.6*s)}" y="${f(y-12*s)}" width="${f(3.2*s)}" height="${f(12*s)}" rx="${f(s)}" fill="${trunk}"/><circle cx="${f(x)}" cy="${f(y-17*s)}" r="${f(8*s)}" fill="${c}"/><circle cx="${f(x-5*s)}" cy="${f(y-13*s)}" r="${f(5.5*s)}" fill="${c}"/><circle cx="${f(x+5*s)}" cy="${f(y-13.5*s)}" r="${f(5.8*s)}" fill="${c2}"/><circle cx="${f(x-2.5*s)}" cy="${f(y-20*s)}" r="${f(3*s)}" fill="${lighten(c,.25)}" opacity=".7"/></g>`;
const butterfly=(x,y,s,c)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M0 0C-4 -6 -9 -4 -7 0C-9 3 -4 5 0 1Z" fill="${c}"/><path d="M0 0C4 -6 9 -4 7 0C9 3 4 5 0 1Z" fill="${c}"/><path d="M0 -3V3" stroke="#2a1a2a" stroke-width="1"/></g>`;
const firefly=(x,y,s,id)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(7*s)}" fill="url(#${id})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(1.2*s)}" fill="#fff8c0"/>`;
const leaf=(x,y,s,c,a)=>`<path d="M0 -4C3 -3 4 1 0 5C-4 1 -3 -3 0 -4Z" fill="${c}" transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(s)})"/>`;
const reeds=(x,y,s,c)=>`<g stroke="${c}" stroke-width="${f(1.3*s)}" stroke-linecap="round" fill="none"><path d="M${f(x)} ${f(y)}Q${f(x-2*s)} ${f(y-12*s)} ${f(x-4*s)} ${f(y-24*s)}M${f(x+3*s)} ${f(y)}Q${f(x+4*s)} ${f(y-14*s)} ${f(x+2*s)} ${f(y-28*s)}M${f(x+6*s)} ${f(y)}Q${f(x+9*s)} ${f(y-10*s)} ${f(x+12*s)} ${f(y-19*s)}"/></g><rect x="${f(x+.8*s)}" y="${f(y-31*s)}" width="${f(2.6*s)}" height="${f(8*s)}" rx="${f(1.3*s)}" fill="#7a4a2a"/>`;
const waves=(R,n,x0,x1,y0,y1,c,o=.6)=>scatter(R,n,x0,x1,y0,y1,(x,y)=>{const w=6+R()*10;return`<path d="M${f(x)} ${f(y)}q${f(w/4)} ${f(-w/6)} ${f(w/2)} 0t${f(w/2)} 0" fill="none" stroke="${c}" stroke-width="1.1" stroke-linecap="round" opacity="${o}"/>`});

/* ---------- biomes ----------
   draw(o, R) -> {far, mid, near, front, gy(x): where a ground subject stands, wy: the waterline (or null),
   fy: where a foreground side subject stands}. o.c tints a colour for the time of day; o.T is the time; o.id prefixes ids. */
const LAND=['ground','sky'],SHORE=['ground','water','sky'];
const B=(k,where,places,draw,o={})=>JIGART.biome({k,where,places,draw,...o});
const ALLT=['day','golden','sunset','dusk','night','dawn'],COLD=[...ALLT,'aurora'];
/* lit windows on far buildings, glowing only after dark */
const winCol=(o,R)=>o.T.lit?(R()<.2?'#7fe6ff':'#ffd98a'):o.c('#bcd6ee');

B('meadow','in the Meadow',LAND,(o,R)=>{const c=o.c,p1=pts(R,226,9,5),p2=pts(R,250,8,4),p3=pts(R,292,7,3),p4=pts(R,350,6,3);
  const path=`<path d="M${f(120+R()*60)} ${H}C150 ${H-40} ${f(190+R()*30)} 330 160 300S150 285 ${f(150+R()*20)} 290" fill="none" stroke="${c('#e8c890')}" stroke-width="16" stroke-linecap="round" opacity=".85"/>`;
  return{far:hill(p1,c('#8fc0d8'))+hill(p2,c('#7fbf8a'))+scatter(R,7,0,W,248,262,(x,y)=>tree(x,yAt(p2,x)+4,.7+R()*.3,c('#4a9a5a'),c('#3a8a4a'),c('#5a3a2a'))),
    mid:hill(p3,c('#6cc35a'))+path+scatter(R,26,0,W,300,342,(x,y)=>tuft(x,y,.8,c('#4aa040'))),
    near:hill(p4,c('#58b048'))+scatter(R,34,0,W,356,398,(x,y,i)=>i%3?flower(x,y,.9+R()*.6,['#ff6a8a','#ffd23a','#ffffff','#b98bff','#ff9a3d'][i%5]):tuft(x,y,1.1,c('#3f9a38'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:o.T.lit?['fireflies']:['butterflies']};
},{times:ALLT});

B('mountains','in the Mountains',LAND,(o,R)=>{const c=o.c,a=peaks(R,240,150,3),b=peaks(R,262,100,4),p3=pts(R,296,6,3),p4=pts(R,352,7,3);
  return{far:ridge(a,c('#8a9ac8'))+caps(a,c('#f4f8ff'),240)+ridge(b,c('#6a7ab0'))+caps(b,c('#e8f0ff'),262),
    mid:hill(pts(R,276,8,4),c('#5a9a6a'))+scatter(R,12,0,W,270,286,(x,y)=>pine(x,y+6,14+R()*10,c('#2f6a4a'),c('#3a7a52')))+hill(p3,c('#6ab45a'))+scatter(R,18,0,W,304,340,(x,y)=>tuft(x,y,.8,c('#4a9a40'))),
    near:hill(p4,c('#5aa64a'))+scatter(R,5,0,W,360,392,(x,y)=>rock(x,y,1.2+R(),c('#9aa0b0'),c('#ffffff')))+scatter(R,16,0,W,358,398,(x,y,i)=>i%2?flower(x,y,.9,['#b98bff','#ffffff','#ffd23a'][i%3]):tuft(x,y,1,c('#3f9038'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:o.t==='night'||o.t==='aurora'?['snow']:[]};
},{times:COLD});

const sea=(o,R,y0,y1,c1,c2)=>`<defs>${lin(o.id+'sea',[[0,c1],[1,c2]])}</defs><rect x="0" y="${y0}" width="${W}" height="${y1-y0+2}" fill="url(#${o.id}sea)"/>`+waves(R,22,0,W,y0+6,y1-6,'#ffffff',.45);
B('coast','by the Sea',SHORE,(o,R)=>{const c=o.c,T=o.T,hz=230,sh=pts(R,312,7,3),p4=pts(R,356,5,3),cliff=R()<.5;
  return{far:sea(o,R,hz,318,c(T.water[0]),c(T.water[1]))+`<path d="M${cliff?-4:W+4} ${hz+1}L${cliff?-4:W+4} ${hz-34}Q${cliff?40:W-40} ${hz-40} ${cliff?70:W-70} ${hz+1}Z" fill="${c('#7a8aa8')}"/>`+(T.lit?'':scatter(R,3,40,260,hz+4,hz+30,(x,y)=>`<path d="M${f(x)} ${f(y)}l6 -9l4 9z" fill="#ffffff"/><path d="M${f(x-3)} ${f(y)}h13l-2 3h-9z" fill="${c('#8a5a3a')}"/>`)),
    mid:hill(sh,c('#f2d8a0'))+`<path d="${curve(sh)}" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`+scatter(R,8,0,W,320,346,(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="1.5" fill="${c('#e0b880')}"/>`),
    near:hill(p4,c('#ecc88a'))+scatter(R,6,0,W,360,396,(x,y,i)=>i%2?`<path d="M${f(x)} ${f(y-5)}l1.5 3.5h3.8l-3 2.4l1.2 3.7l-3.5 -2.2l-3.5 2.2l1.2 -3.7l-3 -2.4h3.8z" fill="${c('#ff8a5a')}"/>`:`<path d="M${f(x-5)} ${f(y)}a5 5 0 0 1 10 0z" fill="${c('#ffe0e8')}"/><path d="M${f(x)} ${f(y)}v-4M${f(x-3)} ${f(y)}l1 -3M${f(x+3)} ${f(y)}l-1 -3" stroke="${c('#e0a0b0')}" stroke-width=".8"/>`)+scatter(R,5,0,W,362,398,(x,y)=>tuft(x,y,1.3,c('#a0b060'))),
    gy:x=>yAt(sh,x)+14,wy:262,fy:H-8,weather:[]};
},{times:COLD});

B('island','on a Tropical Island',SHORE,(o,R)=>{const c=o.c,hz=228,sh=pts(R,316,6,3),p4=pts(R,358,5,3),ix=R()<.5?60:240;
  const isl=`<ellipse cx="${ix}" cy="${hz+2}" rx="44" ry="9" fill="${c('#e8d090')}"/><path d="M${ix-30} ${hz}Q${ix} ${hz-22} ${ix+30} ${hz}Z" fill="${c('#3a9a5a')}"/>`+[ix-10,ix+12].map((x,i)=>`<path d="M${x} ${hz-4}q${i?3:-3} -14 ${i?-1:1} -26" stroke="${c('#8a5a32')}" stroke-width="2.4" fill="none"/>${[-1,1].map(d=>`<path d="M${x+(i?-1:1)} ${hz-30}q${d*8} -4 ${d*14} 4q${d*-7} -1 ${d*-14} -4z" fill="${c('#2fa84f')}"/>`).join('')}`).join('');
  return{far:sea(o,R,hz,322,c(mix(o.T.water[0],'#2fe0d0',.35)),c(mix(o.T.water[1],'#1ab0c0',.3)))+isl,
    mid:hill(sh,c('#fff0c8'))+`<path d="${curve(sh.map(([x,y])=>[x,y-2]))}" fill="none" stroke="#fff" stroke-width="4" opacity=".85"/>`,
    near:hill(p4,c('#fbe4b0'))+scatter(R,7,0,W,362,396,(x,y,i)=>i%3?`<path d="M${f(x-4)} ${f(y)}a4 4 0 0 1 8 0z" fill="${c(['#ff9ab0','#fff','#ffd0a0'][i%3])}"/>`:`<path d="M${f(x)} ${f(y-5)}l1.5 3.5h3.8l-3 2.4l1.2 3.7l-3.5 -2.2l-3.5 2.2l1.2 -3.7l-3 -2.4h3.8z" fill="${c('#ff6a4a')}"/>`),
    gy:x=>yAt(sh,x)+14,wy:264,fy:H-8,weather:[]};
},{times:ALLT});

B('lake','by the Lake',SHORE,(o,R)=>{const c=o.c,T=o.T,hz=240,tl=pts(R,hz-10,6,9),sh=pts(R,316,6,3),p4=pts(R,358,6,3);
  const trees=scatter(R,16,0,W,hz-4,hz,(x,y)=>pine(x,hz+2,18+R()*16,c('#2a5a4a'),c('#346a52')));
  const refl=`<g opacity=".35" transform="translate(0 ${2*hz+4}) scale(1 -1)">${hill(tl,c('#5a8a9a'),hz+60)}</g>`;
  return{far:hill(pts(R,hz-30,14,4),c('#8a9ac8'),hz+4)+hill(tl,c('#3e6e5e'),hz+4)+trees+`<defs>${lin(o.id+'lk',[[0,c(T.water[0])],[1,c(T.water[1])]])}</defs><rect y="${hz}" width="${W}" height="${320-hz}" fill="url(#${o.id}lk)"/>`+refl+waves(R,14,0,W,hz+10,310,'#ffffff',.35)
      +scatter(R,5,0,W,hz+30,305,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="7" ry="2.6" fill="${c('#4a9a4a')}"/><path d="M${f(x)} ${f(y)}l6 -1" stroke="${c('#2a6a2a')}" stroke-width="1"/>${R()<.5?`<circle cx="${f(x+2)}" cy="${f(y-2)}" r="2" fill="${c('#ffb0d0')}"/>`:''}`),
    mid:hill(sh,c('#7ac060'))+scatter(R,6,0,W,312,330,(x,y)=>reeds(x,y,.9,c('#4a8a3a'))),
    near:hill(p4,c('#62aa4c'))+scatter(R,20,0,W,362,398,(x,y,i)=>i%3?tuft(x,y,1.1,c('#3f8a38')):flower(x,y,1,['#ffffff','#ffd23a','#7fb8ff'][i%3])),
    gy:x=>yAt(sh,x)+14,wy:276,fy:H-8,weather:T.lit?['fireflies']:[]};
},{times:COLD});

B('forest','in the Forest',LAND,(o,R)=>{const c=o.c,p3=pts(R,300,6,3),p4=pts(R,356,6,3),day=!o.T.lit;
  const row=(n,y,h,col,col2)=>scatter(R,n,-10,W+10,y,y+6,(x,yy)=>pine(x,yy,h*(.8+R()*.4),col,col2));
  return{far:row(14,236,70,c('#5a7a9a'),c('#6a8aa8'))+row(14,256,80,c('#3a6a5a'),c('#447a62'))+(day?`<defs>${lin(o.id+'ray',[[0,'#fff8d0',.5],[1,'#fff8d0',0]])}</defs>`+[0,1,2].map(i=>`<path d="M${f(60+i*70+R()*20)} 0L${f(90+i*70)} 0L${f(150+i*60)} 330L${f(110+i*60)} 330Z" fill="url(#${o.id}ray)" opacity=".35"/>`).join(''):''),
    mid:row(9,282,95,c('#24533e'),c('#2c6248'))+hill(p3,c('#5a9a48'))+scatter(R,8,0,W,306,336,(x,y,i)=>i%2?`<g><rect x="${f(x-1.2)}" y="${f(y-6)}" width="2.4" height="6" fill="#f4ead8"/><path d="M${f(x-5)} ${f(y-5)}a5 4 0 0 1 10 0z" fill="${c(i%4?'#e84a4a':'#e8a040')}"/><circle cx="${f(x-1.5)}" cy="${f(y-7)}" r=".9" fill="#fff"/></g>`:tuft(x,y,1,c('#3f8a38'))),
    near:hill(p4,c('#4a8a3c'))+`<rect x="${R()<.5?-10:200}" y="${f(yAt(p4,100)-6)}" width="110" height="14" rx="7" fill="${c('#7a4a2a')}"/>`+scatter(R,16,0,W,360,398,(x,y,i)=>i%3?`<path d="M${f(x)} ${f(y)}q-6 -10 -12 -12M${f(x)} ${f(y)}q0 -12 2 -16M${f(x)} ${f(y)}q6 -9 13 -10" stroke="${c('#2f7a3a')}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`:tuft(x,y,1.2,c('#3a7a32'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:o.T.lit?['fireflies']:[]};
},{times:COLD});

B('desert','in the Desert',LAND,(o,R)=>{const c=o.c,p1=pts(R,236,10,3),p2=pts(R,262,12,3),p3=pts(R,300,8,2),p4=pts(R,356,6,3),mx=R()<.5?50:230;
  return{far:`<path d="M${mx-40} 240V214h12v-8h50v8h12V240Z" fill="${c('#c8805a')}"/><path d="M${mx-28} 214h50" stroke="${c('#e0a070')}" stroke-width="2"/>`+hill(p1,c('#f0c080'))+hill(p2,c('#e8b070')),
    mid:hill(p3,c('#f4cc88'))+waves(R,10,0,W,306,340,c('#d8a060'),.6),
    near:hill(p4,c('#f0c27a'))+scatter(R,4,0,W,360,394,(x,y)=>rock(x,y,1+R()*.8,c('#c08a5a'),c('#f4d8a8')))+scatter(R,5,0,W,362,396,(x,y,i)=>i%2?`<circle cx="${f(x)}" cy="${f(y-5)}" r="5" fill="none" stroke="${c('#a07a4a')}" stroke-width="1.2"/><path d="M${f(x-4)} ${f(y-7)}l8 4M${f(x-3)} ${f(y-2)}l7 -6" stroke="${c('#a07a4a')}" stroke-width="1"/>`:`<path d="M${f(x)} ${f(y)}v-12M${f(x)} ${f(y-6)}h-4v-4M${f(x)} ${f(y-8)}h4v-3" stroke="${c('#4a9a5a')}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:[]};
},{times:ALLT});

B('canyon','in the Canyon',LAND,(o,R)=>{const c=o.c,p3=pts(R,300,5,2),p4=pts(R,356,5,3);
  const butte=(x,w,top,base,col,col2)=>`<path d="M${x-w/2-8} ${base}L${x-w/2} ${top+6}Q${x-w/2} ${top} ${x-w/2+6} ${top}H${x+w/2-6}Q${x+w/2} ${top} ${x+w/2} ${top+6}L${x+w/2+8} ${base}Z" fill="${col}"/>`+[1,2,3].map(i=>`<path d="M${f(x-w/2-i*2.4)} ${f(top+(base-top)*i/4)}H${f(x+w/2+i*2.4)}" stroke="${col2}" stroke-width="2.4" opacity=".55"/>`).join('');
  return{far:butte(40+R()*30,50,150+R()*30,252,c('#c86a4a'),c('#a04a32'))+butte(200+R()*50,70,170+R()*20,256,c('#d8784e'),c('#b05a3a'))+butte(120+R()*30,36,196,258,c('#b85a3e'),c('#903a28')),
    mid:hill(pts(R,268,8,4),c('#c8704a'))+hill(p3,c('#e09060'))+waves(R,8,0,W,306,336,c('#b86a40'),.5),
    near:hill(p4,c('#d8865a'))+scatter(R,5,0,W,360,394,(x,y)=>rock(x,y,1.1+R(),c('#a85a3a'),c('#f0b080')))+scatter(R,4,0,W,362,396,(x,y)=>tuft(x,y,1.2,c('#8a9a4a'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:[]};
},{times:ALLT});

B('snow','in the Snow',LAND,(o,R)=>{const c=o.c,a=peaks(R,248,130,3),p3=pts(R,298,7,3),p4=pts(R,356,6,3);
  return{far:ridge(a,c('#a8b8e0'))+caps(a,c('#ffffff'),248)+hill(pts(R,262,8,4),c('#dfe8fa'))+scatter(R,10,0,W,262,272,(x,y)=>pine(x,y+4,16+R()*12,c('#2f5a5a'),c('#ffffff'))),
    mid:hill(p3,c('#f0f6ff'))+scatter(R,8,0,W,304,336,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(8+R()*8)}" ry="2" fill="${c('#c8d8f4')}"/>`),
    near:hill(p4,c('#ffffff'))+scatter(R,6,0,W,362,396,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(10+R()*10)}" ry="2.4" fill="${c('#d0dcf4')}"/>`)+scatter(R,3,0,W,360,392,(x,y)=>pine(x,y,22+R()*10,c('#2f5a5a'),c('#ffffff'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:['snow']};
},{times:COLD});

B('farm','on the Farm',LAND,(o,R)=>{const c=o.c,p1=pts(R,240,8,4),p3=pts(R,298,6,3),p4=pts(R,356,5,3);
  const cols=['#9ad060','#e8d070','#7ab850','#c8b060','#a8d878'];
  const fields=Array.from({length:5},(_,i)=>{const x0=i*64-10+R()*10;return`<path d="M${f(x0)} 262L${f(x0+70)} 262L${f(x0+80)} 288L${f(x0-12)} 288Z" fill="${c(cols[(i+Math.floor(R()*5))%5])}"/>`+[0,1,2].map(k=>`<path d="M${f(x0+k*20)} 264L${f(x0+k*22+4)} 286" stroke="${c('#5a8a3a')}" stroke-width="1" opacity=".5"/>`).join('')}).join('');
  const fence=y=>`<g stroke="${c('#8a5a32')}" stroke-width="3" stroke-linecap="round">${Array.from({length:9},(_,i)=>`<path d="M${i*38+8} ${y}v-20"/>`).join('')}<path d="M0 ${y-15}H${W}M0 ${y-7}H${W}" stroke-width="2.4"/></g>`;
  return{far:hill(p1,c('#7ab0c8'))+fields+scatter(R,5,0,W,256,262,(x,y)=>tree(x,y,.8,c('#4a9a4a'),c('#3a8a3a'),c('#6a4a2a'))),
    mid:hill(p3,c('#78c050'))+scatter(R,14,0,W,304,336,(x,y)=>tuft(x,y,.9,c('#4a9a38'))),
    near:hill(p4,c('#68b040'))+fence(370)+scatter(R,3,0,W,372,398,(x,y)=>`<rect x="${f(x-9)}" y="${f(y-10)}" width="18" height="11" rx="3" fill="${c('#e8c860')}"/><path d="M${f(x-9)} ${f(y-6)}h18M${f(x-9)} ${f(y-2)}h18" stroke="${c('#c8a040')}" stroke-width="1"/>`)+scatter(R,10,0,W,378,398,(x,y,i)=>flower(x,y,.9,['#ff6a8a','#ffd23a','#fff'][i%3])),
    gy:x=>yAt(p3,x)+12,fy:H-6,wy:null,weather:o.T.lit?['fireflies']:['butterflies']};
},{times:ALLT});

B('city','in the City',LAND,(o,R)=>{const c=o.c,p3=pts(R,300,3,3),lit=o.T.lit;
  const sky=(n,y0,hmin,hmax,col)=>{let x=-6,s='';while(x<W){const w=18+R()*24,h=hmin+R()*(hmax-hmin),top=y0-h;s+=`<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h+2)}" fill="${col}"/>`;
    if(R()<.3)s+=`<path d="M${f(x+w/2)} ${f(top-12)}V${f(top)}" stroke="${col}" stroke-width="2"/>`;
    for(let yy=top+5;yy<y0-4;yy+=7)for(let xx=x+3;xx<x+w-4;xx+=6)if(R()<(lit?.45:.6))s+=`<rect x="${f(xx)}" y="${f(yy)}" width="3" height="4" fill="${winCol(o,R)}" opacity="${f(.55+R()*.45)}"/>`;x+=w+1}return s};
  const lamp=x=>`<path d="M${x} 352V312" stroke="${c('#3a3a5a')}" stroke-width="3"/><path d="M${x-6} 312h12l-3 -8h-6z" fill="${c('#3a3a5a')}"/><circle cx="${x}" cy="309" r="3" fill="${lit?'#fff2b0':c('#e8e8f0')}"/>${lit?`<circle cx="${x}" cy="309" r="22" fill="url(#${o.id}lg)"/>`:''}`;
  return{far:`<defs>${glowDef(o.id+'lg','#ffe9a0',.7)}</defs>`+sky(0,252,40,120,c('#7a8ab8'))+sky(0,272,30,90,c('#4e5a8a')),
    mid:hill(p3,c('#6ab858'))+`<rect y="${f(yAt(p3,150)+16)}" width="${W}" height="10" fill="${c('#c8c0b0')}"/>`+scatter(R,5,0,W,300,312,(x,y)=>tree(x,y+12,1,c('#3e9a4e'),c('#2e8a42'),c('#6a4a2a'))),
    near:`<rect y="350" width="${W}" height="${H-350}" fill="${c('#9a98a8')}"/><path d="M0 350H${W}" stroke="${c('#c8c6d4')}" stroke-width="3"/>`+Array.from({length:8},(_,i)=>`<path d="M${i*40+10} 352v48" stroke="${c('#7a7888')}" stroke-width="1"/>`).join('')+lamp(R()<.5?40:260)+scatter(R,3,0,W,370,396,(x,y)=>`<circle cx="${f(x)}" cy="${f(y-7)}" r="8" fill="${c('#4a9a4a')}"/><circle cx="${f(x+5)}" cy="${f(y-9)}" r="5" fill="${c('#5aaa5a')}"/>`),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:[]};
},{times:ALLT});

B('garden','in the Zen Garden',LAND,(o,R)=>{const c=o.c,p3=pts(R,300,4,3),lit=o.T.lit,px=R()<.5?60:240;
  const lantern=(x,y)=>`<g fill="${c('#9a9aa8')}"><rect x="${x-3}" y="${y-8}" width="6" height="8"/><rect x="${x-8}" y="${y-12}" width="16" height="4" rx="1"/><rect x="${x-6}" y="${y-22}" width="12" height="10" rx="1"/><path d="M${x-11} ${y-22}L${x} ${y-30}L${x+11} ${y-22}Z"/></g><rect x="${x-3.5}" y="${y-20}" width="7" height="6" fill="${lit?'#ffd27a':c('#3a3a48')}"/>${lit?`<circle cx="${x}" cy="${y-17}" r="18" fill="url(#${o.id}gl)"/>`:''}`;
  return{far:`<defs>${glowDef(o.id+'gl','#ffd27a',.75)}</defs>`+hill(pts(R,212,24,3),c('#b8a8d8'))+hill(pts(R,236,14,4),c('#9a90c8'))+scatter(R,5,0,W,246,252,(x,y)=>tree(x,y+6,1,c('#ff9ec4'),c('#ff8ab8'),c('#5a3424'))),
    mid:hill(p3,c('#d8d0b8'))+Array.from({length:6},(_,i)=>`<path d="M-4 ${310+i*6}Q150 ${304+i*6} 304 ${312+i*6}" stroke="${c('#c0b498')}" stroke-width="1.2" fill="none"/>`).join('')+scatter(R,4,0,W,312,338,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="4" fill="${c('#a8a4a8')}"/>`),
    near:`<ellipse cx="${px}" cy="384" rx="70" ry="26" fill="${c('#3a8aa8')}"/><ellipse cx="${px}" cy="380" rx="62" ry="20" fill="${c('#4aa4c4')}"/>`+[0,1].map(i=>`<path d="M${px-20+i*28} ${376+i*6}c4 -3 9 -3 12 0c-3 3 -8 3 -12 0z" fill="${c(i?'#ffffff':'#ff7a3a')}"/>`).join('')+`<rect y="350" width="${W}" height="6" fill="${c('#8ab870')}"/>`+lantern(px>150?50:250,372)+scatter(R,6,0,W,356,368,(x,y)=>tuft(x,y,1,c('#5a9a48'))),
    gy:x=>yAt(p3,x)+12,fy:H-10,wy:null,weather:['petals']};
},{times:ALLT});

B('jungle','in the Jungle',LAND,(o,R)=>{const c=o.c,p3=pts(R,300,6,3),p4=pts(R,358,6,3);
  const blob=(n,y,s,col)=>scatter(R,n,-10,W+10,y,y+12,(x,yy)=>`<circle cx="${f(x)}" cy="${f(yy)}" r="${f(s*(.7+R()*.6))}" fill="${col}"/>`);
  const mon=(x,y,s,a,col)=>`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0C-14 -10 -16 -34 0 -48C16 -34 14 -10 0 0Z" fill="${col}"/><path d="M0 0V-46" stroke="${darken(col,.25)}" stroke-width="1.4"/>${[-1,1].map(d=>[14,24,34].map(yy=>`<path d="M0 ${-yy}l${d*9} -5" stroke="${darken(col,.25)}" stroke-width="1"/>`).join('')).join('')}</g>`;
  return{far:blob(14,228,22,c('#3a7a5a'))+blob(14,250,20,c('#2e6a48'))+hill(pts(R,264,6,4),c('#2a6a40')),
    mid:hill(p3,c('#4a9a3a'))+scatter(R,6,0,W,300,330,(x,y,i)=>`<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="${['#ff4a6a','#ffb020','#ff6ad8'][i%3]}"/><circle cx="${f(x)}" cy="${f(y)}" r="1" fill="#ffe08a"/>`),
    near:hill(p4,c('#3a8a30'))+mon(-6,H,1.4,35,c('#2f8a3a'))+mon(W+6,H,1.4,-35,c('#3a9a42'))+mon(30,H+4,1,10,c('#4aaa4a'))+mon(W-30,H+4,1,-12,c('#2a7a34'))+
      `<path d="M${f(20+R()*30)} 0q6 40 -4 80q-4 20 4 36M${f(240+R()*30)} 0q-6 50 4 90" stroke="${c('#3a7a2a')}" stroke-width="2.6" fill="none"/>`+scatter(R,6,0,W,8,110,(x,y)=>leaf(x,y,1.4,c('#4a9a3a'),R()*360)),
    gy:x=>yAt(p3,x)+12,fy:H-10,wy:null,weather:o.T.lit?['fireflies']:[]};
},{times:ALLT});

B('volcano','by the Volcano',LAND,(o,R)=>{const c=o.c,vx=R()<.5?80:220,p3=pts(R,300,6,3),p4=pts(R,358,6,3);
  return{far:`<defs>${glowDef(o.id+'lv','#ff7a2a',.9)}${lin(o.id+'vc',[[0,c('#6a4a5a')],[1,c('#3a2a3a')]])}</defs>`+hill(pts(R,256,6,4),c('#3a8aa8'),300)+`<path d="M${vx-120} 262L${vx-26} 132Q${vx} 124 ${vx+26} 132L${vx+120} 262Z" fill="url(#${o.id}vc)"/><path d="M${vx-26} 132Q${vx} 126 ${vx+26} 132L${vx+14} 150L${vx+4} 140L${vx-6} 160L${vx-14} 142Z" fill="#ff6a2a"/>`+glow(o.id+'lv',vx,130,48)+
      [0,1,2].map(i=>`<circle cx="${vx-8+i*10+R()*6}" cy="${108-i*16}" r="${12+i*5}" fill="${c('#8a8098')}" opacity="${.6-i*.15}"/>`).join('')+`<path d="M${vx+4} 140q-6 30 4 60q4 20 -6 50" stroke="#ff8a3a" stroke-width="3" fill="none" opacity=".85"/>`,
    mid:hill(p3,c('#4a6a3e'))+scatter(R,8,0,W,304,336,(x,y)=>tuft(x,y,1,c('#2f6a2a'))),
    near:hill(p4,c('#3a3440'))+scatter(R,4,0,W,364,396,(x,y)=>`<path d="M${f(x-14)} ${f(y)}l6 -2l5 3l7 -3l6 2" stroke="#ff7a2a" stroke-width="2" fill="none" stroke-linecap="round"/>`)+scatter(R,5,0,W,360,394,(x,y)=>rock(x,y,1+R(),c('#4a4452'),c('#8a8098'))),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:['embers']};
},{times:ALLT});

B('autumn','in the Autumn Woods',LAND,(o,R)=>{const c=o.c,p3=pts(R,298,6,3),p4=pts(R,356,6,3),cols=['#e8742a','#d84a2a','#f0b030','#c85a2a'];
  return{far:hill(pts(R,232,10,4),c('#c8a08a'))+scatter(R,14,-10,W+10,246,256,(x,y,i)=>tree(x,y+6,1+R()*.4,c(cols[i%4]),c(cols[(i+1)%4]),c('#5a3a2a')))+hill(pts(R,262,6,4),c('#d8b060')),
    mid:hill(p3,c('#d8a848'))+scatter(R,14,0,W,302,340,(x,y,i)=>leaf(x,y,1,c(cols[i%4]),R()*360)),
    near:hill(p4,c('#c89038'))+scatter(R,3,0,W,366,392,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y-7)}" rx="10" ry="8" fill="${c('#f08a20')}"/><path d="M${f(x-4)} ${f(y-14)}q4 4 0 13M${f(x+4)} ${f(y-14)}q-4 4 0 13" stroke="${c('#c86a10')}" stroke-width="1" fill="none"/><path d="M${f(x)} ${f(y-15)}q2 -4 4 -4" stroke="${c('#4a6a2a')}" stroke-width="2" fill="none"/>`)+scatter(R,16,0,W,360,398,(x,y,i)=>leaf(x,y,1.2,c(cols[i%4]),R()*360)),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:['leaves']};
},{times:ALLT});

B('candy','in Candy Land',LAND,(o,R)=>{const c=o.c,p3=pts(R,298,6,3),p4=pts(R,356,6,3);
  const drip=(p,col)=>hill(p,col)+p.slice(1,-1).map(([x,y])=>`<path d="M${f(x-4)} ${f(y)}q4 ${f(8+R()*10)} 8 0z" fill="${col}"/>`).join('');
  const cane=(x,y)=>`<path d="M${f(x)} ${f(y)}V${f(y-26)}a6 6 0 0 1 12 0" stroke="${c('#ffffff')}" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="M${f(x)} ${f(y)}V${f(y-26)}a6 6 0 0 1 12 0" stroke="${c('#ff4a6a')}" stroke-width="4.4" fill="none" stroke-dasharray="3 3" stroke-linecap="round"/>`;
  return{far:drip(pts(R,236,12,5),c('#ffc0de'))+drip(pts(R,258,10,4),c('#b8f0dc'))+scatter(R,4,0,W,226,246,(x,y,i)=>`<path d="M${f(x)} ${f(y+20)}V${f(y)}" stroke="#fff" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y-6)}" r="7" fill="${c(['#ff6aa8','#7ad0ff','#ffd23a','#b98bff'][i%4])}"/><path d="M${f(x-5)} ${f(y-6)}a5 5 0 0 1 10 0" stroke="#fff" stroke-width="1.6" fill="none"/>`),
    mid:drip(p3,c('#fff0f6'))+scatter(R,26,0,W,300,342,(x,y,i)=>`<rect x="${f(x)}" y="${f(y)}" width="4" height="1.6" rx=".8" fill="${['#ff4a8a','#4ac0ff','#ffd23a','#6ad06a','#b98bff'][i%5]}" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/>`),
    near:hill(p4,c('#ffd6ea'))+scatter(R,4,0,W,368,396,(x,y,i)=>`<path d="M${f(x-8)} ${f(y)}q0 -12 8 -12q8 0 8 12z" fill="${c(['#ff6aa8','#6ad0a0','#ffb030','#9a7aff'][i%4])}"/><ellipse cx="${f(x-2)}" cy="${f(y-8)}" rx="2" ry="1.4" fill="#fff" opacity=".6"/>`)+cane(R()<.5?30:250,394),
    gy:x=>yAt(p3,x)+12,fy:H-8,wy:null,weather:['sparkles']};
},{times:['day','golden','sunset','dusk','night','dawn']});

/* underwater and space draw their own sky; their "times" are lighting moods */
B('underwater','under the Sea',['under'],(o,R)=>{const c=o.c,t=o.t,deep=t==='night'||t==='dusk';
  const top={day:'#3ad0e8',golden:'#6ad8c8',dusk:'#1a6aa8',night:'#0a2a5a',sunset:'#4ab8c8',dawn:'#8ae0e0'}[t],bot={day:'#0a5a9a',golden:'#1a6a8a',dusk:'#0a2a5a',night:'#030c26',sunset:'#3a3a8a',dawn:'#2a6aa8'}[t];
  const floor=pts(R,334,8,3),p4=pts(R,366,5,3);
  const weed=(x,y,h,col)=>`<path d="M${f(x)} ${f(y)}q-6 ${f(-h/4)} 0 ${f(-h/2)}t0 ${f(-h/2)}" stroke="${col}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const coral=(x,y,s,col)=>`<g stroke="${col}" stroke-width="${f(3.4*s)}" stroke-linecap="round" fill="none"><path d="M${f(x)} ${f(y)}V${f(y-18*s)}M${f(x)} ${f(y-8*s)}l${f(-8*s)} ${f(-8*s)}v${f(-6*s)}M${f(x)} ${f(y-12*s)}l${f(7*s)} ${f(-7*s)}v${f(-7*s)}"/></g>`;
  return{sky:`<defs>${lin(o.id+'uw',[[0,top],[1,bot]])}${lin(o.id+'rb',[[0,'#ffffff',deep?.12:.4],[1,'#ffffff',0]])}</defs><rect width="${W}" height="${H}" fill="url(#${o.id}uw)"/>`+
      [0,1,2,3].map(i=>`<path d="M${f(40+i*70+R()*20)} -2L${f(66+i*70)} -2L${f(120+i*60)} 300L${f(84+i*60)} 300Z" fill="url(#${o.id}rb)"/>`).join('')+
      `<path d="M0 10q25 -8 50 0t50 0t50 0t50 0t50 0t50 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="${deep?.15:.45}"/>`+
      scatter(R,deep?40:0,0,W,20,330,(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(.6+R())}" fill="#9affea" opacity="${f(.4+R()*.5)}"/>`),
    far:hill(pts(R,282,16,5),c(mix(bot,'#2a4a6a',.3)))+scatter(R,3,0,W,120,240,(x,y)=>Array.from({length:6},(_,i)=>`<path d="M${f(x+i*7)} ${f(y+(i%2)*5)}c3 -3 7 -3 10 0c-3 3 -7 3 -10 0z" fill="${c('#ffd04a')}" opacity=".9"/>`).join('')),
    mid:hill(floor,c('#e8d4a0'))+scatter(R,6,0,W,334,350,(x,y,i)=>weed(x,y,40+R()*30,c(['#2fa86a','#4ac080'][i%2]))),
    near:hill(p4,c('#d8c088'))+scatter(R,5,0,W,368,396,(x,y,i)=>coral(x,y,1+R()*.6,c(['#ff6a8a','#ff9a4a','#b98bff','#ff5ad0'][i%4])))+scatter(R,6,0,W,372,398,(x,y,i)=>i%2?`<path d="M${f(x)} ${f(y-5)}l1.5 3.5h3.8l-3 2.4l1.2 3.7l-3.5 -2.2l-3.5 2.2l1.2 -3.7l-3 -2.4h3.8z" fill="${c('#ff7a4a')}"/>`:`<path d="M${f(x-5)} ${f(y)}a5 5 0 0 1 10 0z" fill="${c('#fff0e0')}"/>`),
    gy:x=>yAt(floor,x)+14,fy:H-8,wy:null,weather:['bubbles']};
},{times:['day','golden','dusk','night','sunset','dawn'],ownSky:true});

B('space','in Outer Space',['space'],(o,R)=>{const t=o.t,c=o.c;
  const neb={dusk:['#ff6ad8','#8a5aff'],night:['#4a8aff','#2ad0ff'],aurora:['#4affb0','#2ab0ff'],sunset:['#ff8a4a','#ff4a8a'],golden:['#ffd04a','#2ad0b0'],dawn:['#ff9ad8','#6ab0ff']}[t];
  const gr=pts(R,348,6,3);
  const planet=(x,y,r,col,ring)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${o.id}pl)"/><path d="M${f(x-r)} ${f(y)}a${f(r)} ${f(r)} 0 0 0 ${f(2*r)} 0" fill="#000" opacity=".25"/>${ring?`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r*1.8)}" ry="${f(r*.4)}" fill="none" stroke="${c('#ffe0b0')}" stroke-width="${f(r*.16)}" opacity=".85" transform="rotate(-14 ${f(x)} ${f(y)})"/>`:''}`;
  const px=R()<.5?60:240;
  /* space is kept colourful everywhere (three nebula clouds and a band of the Milky Way across it), so no two pieces
     of a 5x5 puzzle are plain black */
  const ma=-25-R()*20,mx=W/2+R()*60-30,my=170+R()*60;
  return{sky:`<defs>${lin(o.id+'sp',[[0,'#0a0828'],[.55,'#16124a'],[1,'#2a1a5a']])}${rad(o.id+'n1',[[0,neb[0],.75],[.5,neb[0],.3],[1,neb[0],0]])}${rad(o.id+'n2',[[0,neb[1],.7],[.5,neb[1],.28],[1,neb[1],0]])}${rad(o.id+'n3',[[0,'#ffffff',.35],[.4,neb[0],.25],[1,neb[1],0]])}${lin(o.id+'mw',[[0,'#ffffff',0],[.5,'#f4ecff',.22],[1,'#ffffff',0]],0,1)}${rad(o.id+'pl',[[0,'#ffd0a0'],[.7,'#e0805a'],[1,'#8a3a4a']],.35,.3,.8)}${rad(o.id+'p2',[[0,'#d8f4ff'],[.7,'#5ab0e0'],[1,'#2a4a8a']],.35,.3,.8)}</defs><rect width="${W}" height="${H}" fill="url(#${o.id}sp)"/>`+
      `<ellipse cx="${f(70+R()*60)}" cy="${f(90+R()*60)}" rx="150" ry="95" fill="url(#${o.id}n1)"/><ellipse cx="${f(190+R()*70)}" cy="${f(210+R()*60)}" rx="150" ry="110" fill="url(#${o.id}n2)"/><ellipse cx="${f(60+R()*180)}" cy="${f(280+R()*40)}" rx="110" ry="60" fill="url(#${o.id}n3)"/>`+
      `<g transform="translate(${f(mx)} ${f(my)}) rotate(${f(ma)})"><rect x="-260" y="-34" width="520" height="68" fill="url(#${o.id}mw)"/>${Array.from({length:70},()=>`<circle cx="${f(R()*520-260)}" cy="${f((R()+R()-1)*30)}" r="${f(.4+R()*.9)}" fill="#fff" opacity="${f(.4+R()*.6)}"/>`).join('')}</g>`+
      stars(R,140,0,W,0,340)+scatter(R,14,0,W,0,330,(x,y,i)=>spark(x,y,2+R()*3.5,i%3?'#fff':neb[i%2],.95))+planet(px,70+R()*40,22+R()*14,'',R()<.6)+
      `<circle cx="${f(W-px+R()*40-20)}" cy="${f(60+R()*30)}" r="11" fill="url(#${o.id}p2)"/><path d="M${f(W-px+R()*40-31)} ${f(68)}a11 11 0 0 0 22 0" fill="#000" opacity=".2"/>`+
      `<path d="M${f(R()*120)} ${f(30+R()*60)}l60 26" stroke="#fff" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>`,
    far:'',mid:'',
    near:hill(gr,c('#8a88a8'))+hill(pts(R,372,5,3),c('#a8a6c4'))+scatter(R,8,0,W,354,398,(x,y)=>{const r=4+R()*8;return`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r*.35)}" fill="${c('#6a6888')}"/><path d="M${f(x-r)} ${f(y)}a${f(r)} ${f(r*.35)} 0 0 0 ${f(2*r)} 0" stroke="${c('#c8c6e0')}" stroke-width="1" fill="none"/>`}),
    gy:x=>290,fy:H-10,wy:null,weather:[]};
},{times:['dusk','night','aurora','sunset','golden','dawn'],ownSky:true});

/* ---------- the sky for a time of day ---------- */
function skyFor(o,R,sunX){
  const T=o.T,id=o.id;let s=`<defs>${lin(id+'sky',T.sky)}${glowDef(id+'sun',T.sun,.75)}${rad(id+'lit',[[0,T.sun,.32],[1,T.sun,0]])}</defs><rect width="${W}" height="${H}" fill="url(#${id}sky)"/>`;
  const sy=T.sunY*H;
  /* a wide soft light around the sun or moon, so every part of the sky is a slightly different colour */
  s+=`<ellipse cx="${f(sunX)}" cy="${f(sy)}" rx="${W*.9}" ry="${H*.5}" fill="url(#${id}lit)"/>`;
  if(T.stars)s+=stars(R,T.stars,0,W,0,H*.55)+scatter(R,Math.round(T.stars/12),0,W,0,H*.45,(x,y)=>spark(x,y,1.6+R()*2.2,'#fff',.85));
  if(T.aurora)s+=`<defs>${lin(id+'au',[[0,'#7dffb0',0],[.5,'#5dffc8',.7],[1,'#2bd6ff',0]],1,0)}${lin(id+'av',[[0,'#c88bff',0],[.5,'#9b6bff',.55],[1,'#ff7ad9',0]],1,0)}</defs>`+
    `<path d="M-10 ${f(H*.3)}C60 ${f(H*.08)} 120 ${f(H*.36)} 180 ${f(H*.16)}S270 ${f(H*.06)} 310 ${f(H*.22)}" fill="none" stroke="url(#${id}au)" stroke-width="22" stroke-linecap="round" opacity=".85"/>`+
    `<path d="M-10 ${f(H*.2)}C70 ${f(H*.02)} 140 ${f(H*.26)} 200 ${f(H*.1)}S280 ${f(H*.12)} 310 ${f(H*.08)}" fill="none" stroke="url(#${id}av)" stroke-width="12" stroke-linecap="round" opacity=".75"/>`+
    `<path d="M-10 ${f(H*.38)}C70 ${f(H*.24)} 150 ${f(H*.42)} 220 ${f(H*.28)}S290 ${f(H*.3)} 310 ${f(H*.32)}" fill="none" stroke="url(#${id}au)" stroke-width="9" opacity=".6"/>`;
  if(T.moon){s+=glow(id+'sun',sunX,sy,46)+`<circle cx="${f(sunX)}" cy="${f(sy)}" r="15" fill="#fff6dc"/><circle cx="${f(sunX-4)}" cy="${f(sy-3)}" r="3" fill="#e8dcc0" opacity=".7"/><circle cx="${f(sunX+5)}" cy="${f(sy+4)}" r="2.2" fill="#e8dcc0" opacity=".7"/>`;
    if(R()<.5)s+=`<path d="M${f(R()*200+20)} ${f(30+R()*60)}l40 18" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`}
  else{const r=o.t==='sunset'||o.t==='dawn'?26:18;s+=glow(id+'sun',sunX,sy,r*3.4)+`<circle cx="${f(sunX)}" cy="${f(sy)}" r="${r}" fill="${T.sun}"/>`;
    if(o.t==='day'&&R()<.25)s+=`<g opacity=".45" fill="none" stroke-width="5">${['#ff5a5a','#ffb03a','#ffe04a','#5ad06a','#4aa0ff','#9a6aff'].map((col,i)=>`<path d="M${30} ${H*.62}A${130-i*5} ${130-i*5} 0 0 1 ${290} ${H*.62}" stroke="${col}" transform="translate(0 ${i*5})"/>`).join('')}</g>`}
  /* clouds spread across the width (they also tell the sky pieces apart) */
  const nc=T.lit&&o.t==='night'?2:4;
  for(let i=0;i<nc;i++)s+=cloud(20+i*(260/nc)+R()*50,H*(.1+R()*.32),1.4+R()*1.4,T.cloud,o.t==='night'?.35:.8);
  if(!T.lit)s+=scatter(R,3+Math.floor(R()*3),30,270,H*.12,H*.36,(x,y)=>bird(x,y,1.6+R()*.8,o.t==='day'?'#2a3a5a':'#3a2a4a'));
  return s;
}
/* ---------- weather and floating details ---------- */
function weatherFor(kinds,o,R){
  let s='';const id=o.id;
  for(const k of kinds){
    if(k==='fireflies')s+=`<defs>${glowDef(id+'ff','#fff3a0',.85)}</defs>`+scatter(R,14,10,W-10,180,390,(x,y)=>firefly(x,y,1+R()*.6,id+'ff'));
    else if(k==='butterflies')s+=scatter(R,3,30,270,200,330,(x,y,i)=>butterfly(x,y,1+R()*.5,['#ff7ab0','#ffd23a','#7ab8ff'][i%3]));
    else if(k==='snow')s+=scatter(R,60,0,W,0,H,(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(.8+R()*1.6)}" fill="#fff" opacity="${f(.5+R()*.5)}"/>`);
    else if(k==='petals')s+=scatter(R,18,0,W,0,H,(x,y)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.4" ry="1.3" fill="#ffa8cc" opacity=".9" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/>`);
    else if(k==='leaves')s+=scatter(R,14,0,W,0,H*.8,(x,y,i)=>leaf(x,y,1.1,['#e8742a','#d84a2a','#f0b030'][i%3],R()*360));
    else if(k==='embers')s+=scatter(R,22,0,W,60,330,(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(.8+R()*1.2)}" fill="#ffb04a" opacity="${f(.5+R()*.5)}"/>`);
    else if(k==='bubbles')s+=scatter(R,26,0,W,10,380,(x,y)=>{const r=1.5+R()*4;return`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#ffffff" fill-opacity=".12" stroke="#ffffff" stroke-opacity=".7" stroke-width=".9"/><circle cx="${f(x-r*.35)}" cy="${f(y-r*.35)}" r="${f(r*.25)}" fill="#fff" opacity=".8"/>`});
    else if(k==='sparkles')s+=scatter(R,12,0,W,10,380,(x,y)=>spark(x,y,2+R()*3,'#ffffff',.9));
  }
  return s;
}
/* the inner border: a fine double line with little stars in the corners, so edge and corner pieces are easy to spot */
const border=fc=>`<rect x="5" y="5" width="${W-10}" height="${H-10}" rx="10" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="2"/><rect x="10" y="10" width="${W-20}" height="${H-20}" rx="7" fill="none" stroke="${fc}" stroke-opacity=".8" stroke-width="1.4"/>`+
  [[16,16],[W-16,16],[16,H-16],[W-16,H-16]].map(([x,y])=>spark(x,y,6,'#ffffff',.95)+spark(x,y,3,fc,1)).join('');

/* ---------- picking the parts for puzzle n ---------- */
const ORDER=['meadow','coast','forest','desert','snow','garden','mountains','island','autumn','city','lake','candy','canyon','underwater','farm','jungle','volcano','space'];
const FRAMES=['#ff4f8b','#ffb020','#2bc4ff','#8c5bff','#3ad67a','#ff7a3d','#ff5ad8','#18c7b4','#ffd23a','#4a7dff','#ff3d4d','#b47aff'];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const stepFor=N=>{let s=Math.max(1,Math.round(N*.618));while(gcd(s,N)!==1)s++;return s};
/* the side subject is something else that belongs in the biome, of another kind where that matters (never two balloons
   or two boats); a main subject with no partner goes alone */
/* a few subjects that also suit a biome their artist did not list (keeps the smallest biome varied for thousands of puzzles) */
const EXTRA={volcano:['balloon','airship','tent','observatory']};
const inBiome=(s,k)=>s.biomes.includes(k)||(EXTRA[k]||[]).includes(s.id);
const partner=(m,s)=>s!==m&&!(m.place==='sky'&&s.place==='sky')&&(s.place!==m.place||s.place==='ground'||s.place==='under'||s.place==='space');
const pairsOf=mains=>{const r=[];for(const m of mains){const ss=mains.filter(s=>partner(m,s));if(ss.length)ss.forEach(s=>r.push([m,s]));else r.push([m,null])}return r};
function partsFor(n){
  const biomes=JIGART.biomes,subjects=JIGART.subjects,k=Math.max(0,n-1),j=Math.floor(k/ORDER.length);
  /* a biome with nothing to show in it (never the case with the full art set) hands its turn to the next one */
  let bk,bm,fits,mains=[];
  for(let t=0;t<ORDER.length&&!mains.length;t++){bk=ORDER[(k+t)%ORDER.length];bm=biomes.find(b=>b.k===bk);fits=s=>inBiome(s,bk)&&bm.places.includes(s.place);
    mains=subjects.filter(fits);if(!mains.length)mains=subjects.filter(s=>bm.places.includes(s.place))}
  if(!mains.length)throw new Error('no jigsaw subjects');
  /* the walk goes through every (main subject, side subject, time of day) the biome allows, in a scrambled order;
     the first visit to each biome is in one of its brightest lights (day, golden hour or sunset), so the opening
     puzzles look their best */
  const pairs=pairsOf(mains),times=bm.times,P=pairs.length,T=times.length,N=P*T,off=hashSeed(k%ORDER.length,5)%N,idx0=off%P+P*Math.min(T-1,[0,1,0,2,0,1][k%6]);
  let idx=j?(j*stepFor(N)+off)%N:idx0;if(j&&idx===idx0)idx=(off+(N>1?1:0))%N;
  const[main,side]=pairs[idx%P],tk=times[Math.floor(idx/P)%T];
  const R=rngOf(hashSeed(n,4242));
  return{n,bm,main,side,tk,R,cycle:Math.floor(j/N)};
}
/* scale and position for a subject: the main one fills about 40% of the height, the side one sits in the foreground */
function place(s,role,b,x){
  const cap=(sc,maxW)=>Math.min(sc,maxW/(100*(s.w||1)));
  if(role==='main'){
    if(s.place==='ground')return{x,y:b.gy(x),s:cap(1.75,250)};
    if(s.place==='water')return{x,y:b.wy+6,s:cap(1.5,250)};
    if(s.place==='sky')return{x,y:H*.5,s:cap(1.45,220)};
    return{x,y:s.place==='space'?H*.76:b.gy(x),s:cap(1.65,250)};
  }
  if(s.place==='ground'||s.place==='under'||s.place==='space')return{x,y:b.fy,s:cap(.9,120)};
  if(s.place==='water')return{x,y:b.wy+16,s:cap(.75,110)};
  return{x,y:H*.3,s:cap(.62,100)};
}
const drawSub=(s,pl,o,flip,tag)=>{let body='';try{body=s.draw({...o,id:o.id+tag+'_'})}catch(e){body=''}
  return`<g transform="translate(${f(pl.x)} ${f(pl.y)}) scale(${f(pl.s*(flip?-1:1))} ${f(pl.s)})">${body}</g>`};
function compose(n){
  const{bm,main,side,tk,R,cycle}=partsFor(n),T=JIGART.TIMES[tk],id='j'+n+'_';
  const o={R,id,t:tk,T,night:T.lit,c:col=>mix(col,T.amb,T.amt)};
  const left=R()<.5,mx=W*(left?.42:.58),sx=W*(left?.8:.2),flip=R()<.5,fc=FRAMES[(n*7+cycle)%FRAMES.length];
  const b=bm.draw(o,R);
  const sunX=W*(left?.78:.22)+R()*30-15;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*2}" height="${H*2}" preserveAspectRatio="none">`;
  svg+=b.sky||skyFor(o,R,sunX);
  svg+=b.far||'';
  const mp=place(main,'main',b,mx),sp=side?place(side,'side',b,sx):null;
  if(main.place==='sky')svg+=drawSub(main,mp,o,flip,'m');
  if(side&&side.place==='sky')svg+=drawSub(side,sp,o,!flip,'s');
  svg+=b.mid||'';
  if(side&&side.place==='water')svg+=drawSub(side,sp,o,!flip,'s');
  if(main.place!=='sky')svg+=drawSub(main,mp,o,flip,'m');
  svg+=b.near||'';
  if(side&&side.place!=='sky'&&side.place!=='water')svg+=drawSub(side,sp,o,!flip,'s');
  svg+=weatherFor(b.weather||[],o,R);
  svg+=border(fc)+'</svg>';
  const tname={day:'Daytime',golden:'Golden hour',sunset:'Sunset',dusk:'Dusk',night:'Night',dawn:'Dawn',aurora:'Northern lights'}[tk];
  const mood=bm.k==='underwater'?{day:'Sunlit shallows',golden:'Warm lagoon',dusk:'Deep blue',night:'Glowing depths',sunset:'Coral sunset',dawn:'Morning reef'}[tk]:bm.k==='space'?{dusk:'Pink nebula',night:'Blue nebula',aurora:'Green nebula',sunset:'Orange nebula',golden:'Golden nebula',dawn:'Rose nebula'}[tk]:tname;
  return{svg,title:`${main.name} ${bm.where}`+(cycle?' '+['II','III','IV','V','VI','VII','VIII','IX'][Math.min(cycle-1,7)]:''),sub:mood,biome:bm.k,time:tk,main:main.id,side:side&&side.id,frame:fc};
}
/* how many different (biome, main subject, time, side subject) pictures there are before the walk repeats */
const variety=()=>JIGART.biomes.reduce((a,b)=>a+pairsOf(JIGART.subjects.filter(s=>inBiome(s,b.k)&&b.places.includes(s.place))).length*b.times.length,0);
Object.assign(JIGART,{compose,variety,FRAMES});
})();
