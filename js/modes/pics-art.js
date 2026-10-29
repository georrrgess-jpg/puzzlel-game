'use strict';
/* ====================== Picture Pop art ======================
   Every picture is drawn in SVG at 120 wide and H tall: H=80 for two-piece pictures (two 60x80 halves) and H=160 for
   four-piece pictures (four 60x80 quarters). Each scene is a function (H, p, R) -> markup, where p prefixes its ids
   (gradients must be unique per scene and size) and R is a seeded random source, so a picture always looks the same.
   Kinds: landscapes, animals, still life, space, underwater, architecture and abstract art. */
const PIC_ART=(()=>{
  const f=n=>Math.round(n*10)/10;
  const st=s=>s.map(([o,c,a])=>`<stop offset="${o}" stop-color="${c}"${a!=null?` stop-opacity="${a}"`:''}/>`).join('');
  const lin=(id,s,x2=0,y2=1,x1=0,y1=0)=>`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st(s)}</linearGradient>`;
  const rad=(id,s,cx=.5,cy=.5,r=.5)=>`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st(s)}</radialGradient>`;
  const box=(fill,y=0,h=999,x=0,w=120)=>`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"/>`;
  const P=pts=>'M'+pts.map(([x,y])=>`${f(x)} ${f(y)}`).join('L')+'Z';
  /* a ridge line from left to right through the given peaks, closed down to y=bottom */
  const ridge=(peaks,bottom,fill,op=1)=>`<path d="${P([[0,bottom],...peaks,[120,bottom]])}" fill="${fill}"${op<1?` opacity="${op}"`:''}/>`;
  const stars=(R,n,maxY,col='#fff')=>Array.from({length:n},()=>{const r=R();return`<circle cx="${f(R()*120)}" cy="${f(R()*maxY)}" r="${f(.25+r*.75)}" fill="${col}" opacity="${f(.35+R()*.65)}"/>`}).join('');
  const cloud=(x,y,s,c='#fff',o=.9)=>`<g opacity="${o}" fill="${c}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(12*s)}" ry="${f(4.5*s)}"/><circle cx="${f(x-4*s)}" cy="${f(y-3*s)}" r="${f(5*s)}"/><circle cx="${f(x+3*s)}" cy="${f(y-4.5*s)}" r="${f(6.5*s)}"/><circle cx="${f(x+8*s)}" cy="${f(y-1.5*s)}" r="${f(4*s)}"/></g>`;
  const pine=(x,y,h,c,c2)=>{const w=h*.42;return`<g><rect x="${f(x-h*.04)}" y="${f(y-h*.14)}" width="${f(h*.08)}" height="${f(h*.14)}" fill="#3b2412"/>${[0,1,2].map(i=>{const t=y-h*.12-i*h*.27,ww=w*(1-i*.25);return`<path d="${P([[x-ww,t],[x,t-h*.42],[x+ww,t]])}" fill="${i%2&&c2?c2:c}"/>`}).join('')}</g>`};
  const bird=(x,y,s,c='#2a1a3a')=>`<path d="M${f(x-3*s)} ${f(y)}q${f(1.5*s)} ${f(-1.6*s)} ${f(3*s)} 0q${f(1.5*s)} ${f(-1.6*s)} ${f(3*s)} 0" fill="none" stroke="${c}" stroke-width="${f(.7*s)}" stroke-linecap="round"/>`;
  const glow=(id,x,y,r,c,a=.8)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${id})"/>`;
  const glowDef=(id,c,a=.85)=>rad(id,[[0,c,a],[.4,c,a*.45],[1,c,0]]);
  const S=H=>H>100?1.6:1;   // subject scale: the portrait (four-piece) canvas has room for a bigger subject

  return [
  /* ---------- landscapes ---------- */
  {n:'Sunset Peaks',k:'landscape',d:(H,p,R)=>{const hz=H*.64,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#2a1a5e'],[.45,'#b8407a'],[.78,'#ff8a5b'],[1,'#ffd27a']])}${glowDef(p+'g','#ffe2a0')}${lin(p+'w',[[0,'#5a2f6e'],[1,'#1c1238']])}${lin(p+'m1',[[0,'#8a4a8a'],[1,'#5a2c66']])}${lin(p+'m2',[[0,'#4a2456'],[1,'#2a1438']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${glow(p+'g',80,hz-6,34*m,'#ffe2a0')}<circle cx="80" cy="${f(hz-5*m)}" r="${f(8*m)}" fill="#fff4c8"/>
    ${[18,30,42].map((x,i)=>bird(x+i*4,H*.18+i*3*m,m*.9)).join('')}
    ${ridge([[0,hz-18*m],[14,hz-27*m],[28,hz-17*m],[46,hz-34*m],[60,hz-22*m],[74,hz-30*m],[92,hz-19*m],[106,hz-28*m],[120,hz-20*m]],hz,`url(#${p}m1)`,.85)}
    ${ridge([[0,hz-8*m],[16,hz-20*m],[24,hz-14*m],[38,hz-24*m],[52,hz-10*m],[70,hz-16*m],[86,hz-6*m],[100,hz-18*m],[120,hz-9*m]],hz,`url(#${p}m2)`)}
    <path d="${P([[38,hz-24*m],[33,hz-18*m],[36,hz-19*m],[39,hz-17*m],[42,hz-20*m]])}" fill="#f4d9ef" opacity=".85"/><path d="${P([[16,hz-20*m],[12,hz-15*m],[15,hz-16*m],[18,hz-14*m],[20,hz-16.5*m]])}" fill="#f4d9ef" opacity=".8"/>
    ${box(`url(#${p}w)`,hz,H)}${[0,1,2,3,4,5].map(i=>`<rect x="${f(80-(12-i*1.8)*m)}" y="${f(hz+2*m+i*3.2*m)}" width="${f((24-i*3.6)*m)}" height="${f(1.1*m)}" rx="${f(.5*m)}" fill="#ffd9a0" opacity="${f(.85-i*.12)}"/>`).join('')}
    ${[6,14,104,112].map((x,i)=>pine(x,hz+3*m,(10+i%2*3)*m,'#140b24')).join('')}`}},
  {n:'Northern Lights',k:'landscape',d:(H,p,R)=>{const hz=H*.7,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#050a24'],[.6,'#0f2a4a'],[1,'#1c4a5e']])}${lin(p+'a',[[0,'#7dffb0',0],[.5,'#5dffc8',.75],[1,'#2bd6ff',0]],1,0)}${lin(p+'b',[[0,'#c88bff',0],[.5,'#9b6bff',.55],[1,'#ff7ad9',0]],1,0)}${lin(p+'n',[[0,'#e9f4ff'],[1,'#9fb8d8']])}${glowDef(p+'w','#ffcf6a',.9)}</defs>
    ${box(`url(#${p}s)`,0,H)}${stars(R,40,hz)}
    <path d="M-5 ${f(H*.42)}C25 ${f(H*.12)} 45 ${f(H*.5)} 70 ${f(H*.24)}S110 ${f(H*.1)} 125 ${f(H*.3)}" fill="none" stroke="url(#${p}a)" stroke-width="${f(9*m)}" stroke-linecap="round" opacity=".9"/>
    <path d="M-5 ${f(H*.3)}C30 ${f(H*.05)} 55 ${f(H*.38)} 80 ${f(H*.14)}S115 ${f(H*.2)} 125 ${f(H*.12)}" fill="none" stroke="url(#${p}b)" stroke-width="${f(5*m)}" stroke-linecap="round" opacity=".8"/>
    <path d="M-5 ${f(H*.5)}C30 ${f(H*.3)} 60 ${f(H*.56)} 90 ${f(H*.36)}S118 ${f(H*.4)} 125 ${f(H*.42)}" fill="none" stroke="url(#${p}a)" stroke-width="${f(4*m)}" opacity=".6"/>
    ${ridge([[0,hz-6*m],[30,hz-12*m],[60,hz-5*m],[90,hz-13*m],[120,hz-7*m]],H,'#0b1f33')}
    ${[4,12,20,96,104,112,118].map((x,i)=>pine(x,hz+(i%3)*m,(13+(i*7)%6)*m,'#071420')).join('')}
    ${ridge([[0,hz+2*m],[40,hz-1*m],[80,hz+3*m],[120,hz]],H,`url(#${p}n)`)}
    <g transform="translate(60 ${f(hz+2*m)}) scale(${f(m)})"><path d="M-11 0V-9L0 -17L11 -9V0Z" fill="#5a3420"/><path d="M-13 -8L0 -19L13 -8" fill="none" stroke="#eef6ff" stroke-width="3" stroke-linejoin="round"/><rect x="-3" y="-7" width="6" height="5" fill="#ffd27a"/><rect x="5" y="-21" width="3" height="6" fill="#4a2a18"/></g>
    ${glow(p+'w',60,hz-1*m,10*m)}`}},
  {n:'Tropical Beach',k:'landscape',d:(H,p,R)=>{const hz=H*.5,sand=H*.74,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#4fb8ff'],[1,'#bdf0ff']])}${lin(p+'o',[[0,'#1f8fd6'],[.6,'#2fc9d6'],[1,'#7ff0e0']])}${lin(p+'d',[[0,'#ffe7a8'],[1,'#f2c27a']])}${glowDef(p+'g','#fffbe0',.9)}${lin(p+'t',[[0,'#8a5a32'],[1,'#c08a52']],1,0)}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${glow(p+'g',24,H*.16,22*m)}<circle cx="24" cy="${f(H*.16)}" r="${f(6*m)}" fill="#fffbe6"/>${cloud(70,H*.16,.9*m)}${cloud(104,H*.26,.6*m,'#fff',.8)}
    ${box(`url(#${p}o)`,hz,sand-hz+2)}${[0,1,2,3].map(i=>`<path d="M${f(10+i*28)} ${f(hz+(4+i*3)*m)}q4 -2 8 0t8 0" fill="none" stroke="#e6ffff" stroke-width="${f(.6*m)}" opacity=".7"/>`).join('')}
    <g transform="translate(92 ${f(hz-1)}) scale(${f(.5*m)})"><path d="M-8 0H8L5 4H-5Z" fill="#fff"/><path d="M0 -1V-18L9 -2Z" fill="#fff"/><path d="M-1 -2V-14L-8 -2Z" fill="#ff6b6b"/></g>
    <path d="M0 ${f(sand)}Q40 ${f(sand-5*m)} 80 ${f(sand-2*m)}T120 ${f(sand-4*m)}V${H}H0Z" fill="url(#${p}d)"/><path d="M0 ${f(sand)}Q40 ${f(sand-5*m)} 80 ${f(sand-2*m)}T120 ${f(sand-4*m)}" fill="none" stroke="#fff" stroke-width="${f(1.2*m)}" opacity=".85"/>
    <g transform="translate(34 ${f(H*.95)}) scale(${f(m)})"><path d="M0 0C2 -12 -1 -24 6 -36" fill="none" stroke="url(#${p}t)" stroke-width="3.2" stroke-linecap="round"/>
      ${[[-20,6],[-6,-12],[10,-14],[22,4],[14,12],[-12,14]].map(([dx,dy])=>`<path d="M6 -36Q${6+dx*.5} ${-40+dy*.3-6} ${6+dx} ${-36+dy}Q${6+dx*.45} ${-36+dy*.3} 6 -36" fill="#2fa84f" stroke="#1c7a36" stroke-width=".6"/>`).join('')}<circle cx="5" cy="-34" r="1.8" fill="#6a3a18"/><circle cx="8" cy="-35" r="1.6" fill="#7a4a22"/></g>
    <g transform="translate(86 ${f(H*.92)}) scale(${f(m)})"><path d="M-6 0a6 3 0 0 1 12 0z" fill="#ff8fa3"/><path d="M-4 0l-3 -6h3zM4 0l3 -6h-3z" fill="#ffb3c1"/></g>`}},
  {n:'Night City',k:'architecture',d:(H,p,R)=>{const hz=H*.72,m=H/80;
    const bl=[[0,22,10],[9,34,9],[17,26,8],[24,44,10],[33,30,9],[41,52,11],[51,36,9],[59,28,8],[66,46,10],[75,32,9],[83,40,10],[92,26,8],[99,38,10],[108,30,12]];
    return `<defs>${lin(p+'s',[[0,'#0a0a2a'],[.6,'#2a1a5a'],[1,'#ff6a8a']])}${lin(p+'w',[[0,'#2a1a4a'],[1,'#07061a']])}${glowDef(p+'m','#fff6d0',.6)}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${stars(R,26,hz*.6)}${glow(p+'m',94,H*.17,16*m)}<circle cx="94" cy="${f(H*.17)}" r="${f(5.5*m)}" fill="#fff4d8"/><circle cx="96.5" cy="${f(H*.16)}" r="${f(4.6*m)}" fill="#3a2a6a" opacity=".55"/>
    ${bl.map(([x,h,w],i)=>{const top=hz-h*m*.9,c=['#1c1840','#231d4e','#18143a'][i%3];let win='';for(let yy=top+3*m;yy<hz-2*m;yy+=4*m)for(let xx=x+1.5;xx<x+w-2;xx+=3){if(R()<.42)win+=`<rect x="${f(xx)}" y="${f(yy)}" width="1.4" height="${f(1.8*m)}" fill="${R()<.25?'#7fe6ff':'#ffd98a'}" opacity="${f(.6+R()*.4)}"/>`}
      return`<rect x="${x}" y="${f(top)}" width="${w}" height="${f(hz-top+1)}" fill="${c}"/>${i===5?`<rect x="${x+w/2-.6}" y="${f(top-8*m)}" width="1.2" height="${f(8*m)}" fill="#3a3466"/><circle cx="${x+w/2}" cy="${f(top-8*m)}" r="1.2" fill="#ff4d6d"/>`:''}${win}`}).join('')}
    ${box(`url(#${p}w)`,hz,H)}${[0,1,2,3,4,5,6].map(i=>`<rect x="${f(8+i*16+R()*4)}" y="${f(hz+2*m+R()*(H-hz-4*m))}" width="${f(4+R()*6)}" height="${f(.8*m)}" fill="${R()<.5?'#ffd98a':'#7fe6ff'}" opacity=".5"/>`).join('')}
    <rect x="0" y="${f(hz)}" width="120" height="${f(.8*m)}" fill="#ff8fb0" opacity=".5"/>`}},
  {n:'Lighthouse Cove',k:'landscape',d:(H,p,R)=>{const hz=H*.62,m=H/80,lx=84;
    return `<defs>${lin(p+'s',[[0,'#1a2a5a'],[.55,'#6a4a8a'],[1,'#ffb07a']])}${lin(p+'o',[[0,'#2a4a7a'],[1,'#0f1f3a']])}${lin(p+'b',[[0,'#fff6c0',.85],[1,'#fff6c0',0]],1,0)}${lin(p+'c',[[0,'#4a3a3a'],[1,'#2a1f24']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${stars(R,14,H*.3)}${cloud(28,H*.24,.8*m,'#ffd0c0',.5)}
    <path d="M${lx} ${f(H*.3)}L-10 ${f(H*.12)}L-10 ${f(H*.4)}Z" fill="url(#${p}b)" opacity=".55"/><path d="M${lx} ${f(H*.3)}L130 ${f(H*.18)}L130 ${f(H*.42)}Z" fill="url(#${p}b)" opacity=".35" transform="scale(-1 1) translate(${-2*lx} 0)"/>
    ${box(`url(#${p}o)`,hz,H)}${[0,1,2,3,4].map(i=>`<path d="M${f(4+i*22)} ${f(hz+(5+i*4)*m)}q5 -2 10 0t10 0" fill="none" stroke="#9ec8ff" stroke-width="${f(.5*m)}" opacity=".5"/>`).join('')}
    <path d="M60 ${H}C62 ${f(hz+6*m)} 70 ${f(hz-4*m)} 80 ${f(hz-6*m)}S104 ${f(hz-7*m)} 112 ${f(hz-2*m)}L120 ${f(hz+4*m)}V${H}Z" fill="url(#${p}c)"/>
    <g transform="translate(${lx} ${f(hz-5*m)}) scale(${f(m)})"><path d="M-5 0L-3.6 -26H3.6L5 0Z" fill="#f4f0ea"/>${[0,1,2].map(i=>`<path d="M${f(-4.8+i*.5)} ${f(-4-i*8)}L${f(-4.5+i*.5)} ${f(-8-i*8)}H${f(4.5-i*.5)}L${f(4.8-i*.5)} ${f(-4-i*8)}Z" fill="#e84a4a"/>`).join('')}
      <rect x="-5" y="-28" width="10" height="2.4" fill="#2a2a3a"/><rect x="-3" y="-33" width="6" height="5" fill="#fff3a0"/><circle cx="0" cy="-30.5" r="5" fill="#fff6c0" opacity=".45"/><path d="M-4 -33L0 -37L4 -33Z" fill="#2a2a3a"/></g>
    <path d="M10 ${f(hz+3*m)}h${f(9*m)}l${f(-2*m)} ${f(2*m)}h${f(-6*m)}z" fill="#1a1426"/><path d="M14 ${f(hz+3*m)}v${f(-7*m)}l${f(4*m)} ${f(6*m)}z" fill="#f0e0d0"/>`}},
  {n:'Cherry Blossom',k:'landscape',d:(H,p,R)=>{const hz=H*.66,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#ffd6e4'],[.6,'#fff0e6'],[1,'#e6f4ff']])}${lin(p+'f',[[0,'#ffffff'],[.3,'#dfe8ff'],[1,'#8aa0d8']])}${rad(p+'b',[[0,'#ffe6f0'],[.6,'#ff9ec4'],[1,'#e06a9a']],.4,.35,.7)}${lin(p+'g',[[0,'#a8e08a'],[1,'#5aa84a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}<circle cx="96" cy="${f(H*.2)}" r="${f(7*m)}" fill="#ff7a6a" opacity=".85"/>
    <path d="${P([[20,hz],[58,hz-34*m],[64,hz-34*m],[104,hz]])}" fill="url(#${p}f)"/><path d="${P([[50,hz-26*m],[58,hz-34*m],[64,hz-34*m],[72,hz-26*m],[66,hz-28*m],[61,hz-25*m],[56,hz-28*m]])}" fill="#fff"/>
    ${ridge([[0,hz-3*m],[30,hz-6*m],[70,hz-2*m],[120,hz-5*m]],H,`url(#${p}g)`)}
    <path d="M22 ${H}C24 ${f(H*.8)} 20 ${f(H*.62)} 30 ${f(H*.5)}M26 ${f(H*.68)}C34 ${f(H*.62)} 42 ${f(H*.56)} 48 ${f(H*.48)}" fill="none" stroke="#5a3424" stroke-width="${f(2.6*m)}" stroke-linecap="round"/>
    ${Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2,r=(5+R()*7)*Math.min(m,1.4);return`<circle cx="${f(36+Math.cos(a)*r*1.5)}" cy="${f(H*.42+Math.sin(a)*r*.8)}" r="${f((4.4+R()*3)*Math.min(m,1.4))}" fill="url(#${p}b)"/>`}).join('')}
    ${Array.from({length:14},()=>{const x=f(34+R()*84),y=f(R()*H*.95);return`<ellipse cx="${x}" cy="${y}" rx="${f(1.2*m)}" ry="${f(.7*m)}" fill="#ff8ab8" transform="rotate(${f(R()*180)} ${x} ${y})" opacity=".85"/>`}).join('')}
    <g transform="translate(92 ${f(hz+1*m)}) scale(${f(m*.8)})"><rect x="-7" y="-14" width="1.6" height="14" fill="#d8323a"/><rect x="5.4" y="-14" width="1.6" height="14" fill="#d8323a"/><path d="M-10 -14Q0 -16.5 10 -14V-12.4Q0 -14.6 -10 -12.4Z" fill="#d8323a"/><rect x="-8" y="-11" width="16" height="1.3" fill="#d8323a"/></g>`}},
  {n:'Desert Mesa',k:'landscape',d:(H,p,R)=>{const hz=H*.6,m=H/80;
    const cact=(x,y,s)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" fill="#3f9a5a" stroke="#2a6a3e" stroke-width=".5"><rect x="-2.4" y="-22" width="4.8" height="22" rx="2.4"/><path d="M-2 -10H-7Q-9 -10 -9 -12V-17a1.8 1.8 0 0 1 3.6 0V-13.6H-2Z"/><path d="M2 -14H6.8V-19a1.8 1.8 0 0 1 3.6 0V-13Q10.4 -11 8.4 -11H2Z"/></g>`;
    return `<defs>${lin(p+'s',[[0,'#ff9a5a'],[.5,'#ffc07a'],[1,'#ffe6b0']])}${glowDef(p+'g','#fff2c0',.9)}${lin(p+'r',[[0,'#d8704a'],[1,'#9a3f2a']])}${lin(p+'d',[[0,'#f2b56a'],[1,'#d88a4a']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${glow(p+'g',60,hz-8*m,30*m)}<circle cx="60" cy="${f(hz-9*m)}" r="${f(9*m)}" fill="#fff0c0"/>
    <path d="${P([[4,hz],[10,hz-18*m],[34,hz-18*m],[40,hz]])}" fill="url(#${p}r)"/><path d="${P([[78,hz],[84,hz-24*m],[98,hz-24*m],[104,hz-12*m],[112,hz-12*m],[118,hz]])}" fill="url(#${p}r)"/>
    <path d="${P([[10,hz-18*m],[34,hz-18*m],[33,hz-16*m],[11,hz-16*m]])}" fill="#ffb07a" opacity=".6"/>
    <path d="M0 ${f(hz)}Q30 ${f(hz-4*m)} 60 ${f(hz+2*m)}T120 ${f(hz-1*m)}V${H}H0Z" fill="url(#${p}d)"/><path d="M0 ${f(hz+12*m)}Q40 ${f(hz+6*m)} 80 ${f(hz+12*m)}T120 ${f(hz+10*m)}V${H}H0Z" fill="#c8783e" opacity=".7"/>
    ${cact(22,hz+16*m,m*1.05)}${cact(98,hz+20*m,m*.8)}${cact(70,hz+5*m,m*.45)}
    ${[0,1,2].map(i=>bird(48+i*7,H*.18+i*2*m,m*.8,'#7a3a2a')).join('')}`}},
  {n:'Hidden Waterfall',k:'landscape',d:(H,p,R)=>{const m=H/80;
    return `<defs>${lin(p+'s',[[0,'#7fd6ff'],[1,'#d8f6ff']])}${lin(p+'c',[[0,'#5a6a5a'],[1,'#34443a']],1,0)}${lin(p+'w',[[0,'#ffffff'],[1,'#a8e6ff']])}${lin(p+'p',[[0,'#3fc9d6'],[1,'#1a7a9a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${cloud(30,H*.14,.7*m)}${cloud(96,H*.1,.5*m,'#fff',.8)}
    <path d="M0 ${f(H*.22)}C10 ${f(H*.2)} 30 ${f(H*.24)} 46 ${f(H*.26)}V${f(H*.7)}H0Z" fill="url(#${p}c)"/><path d="M120 ${f(H*.18)}C108 ${f(H*.2)} 88 ${f(H*.22)} 74 ${f(H*.26)}V${f(H*.7)}H120Z" fill="url(#${p}c)"/>
    ${[[4,.2],[18,.22],[30,.24],[92,.2],[106,.19]].map(([x,y])=>`<circle cx="${x}" cy="${f(H*y)}" r="${f(7*m)}" fill="#3fae5a"/><circle cx="${x+6}" cy="${f(H*y+2*m)}" r="${f(5*m)}" fill="#5ac86a"/>`).join('')}
    <rect x="46" y="${f(H*.25)}" width="28" height="${f(H*.5)}" fill="url(#${p}w)"/>${[0,1,2,3,4,5].map(i=>`<rect x="${f(48+i*4.4)}" y="${f(H*.26)}" width="1" height="${f(H*.46)}" fill="#8ad8ff" opacity=".6"/>`).join('')}
    <ellipse cx="60" cy="${f(H*.82)}" rx="62" ry="${f(H*.14)}" fill="url(#${p}p)"/>${[0,1,2,3,4].map(i=>`<circle cx="${f(44+i*8)}" cy="${f(H*.74)}" r="${f((4+R()*3)*m)}" fill="#fff" opacity=".8"/>`).join('')}
    ${[[6,.9],[112,.86]].map(([x,y])=>`<path d="M${x} ${f(H*y)}q4 -${f(10*m)} 0 -${f(18*m)}q6 6 4 18z" fill="#2f8a4a"/><path d="M${x} ${f(H*y)}q-6 -${f(8*m)} -2 -${f(14*m)}q4 6 2 14z" fill="#4aa85a"/>`).join('')}
    <path d="M0 ${H}V${f(H*.9)}Q30 ${f(H*.86)} 60 ${f(H*.92)}T120 ${f(H*.9)}V${H}Z" fill="#2f6a3a"/>`}},
  {n:'Tulip Windmill',k:'landscape',d:(H,p,R)=>{const hz=H*.5,m=H/80;
    const rows=['#ff4d6d','#ffd23d','#ff8fd0','#ff7a3a','#b06bff'];
    return `<defs>${lin(p+'s',[[0,'#5ab8ff'],[1,'#d6f0ff']])}${lin(p+'g',[[0,'#7ad86a'],[1,'#3f9a3a']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${cloud(24,H*.16,.8*m)}${cloud(100,H*.22,.6*m)}
    ${ridge([[0,hz-2*m],[40,hz-5*m],[80,hz-1*m],[120,hz-4*m]],H,`url(#${p}g)`)}
    ${rows.map((c,i)=>{const y0=hz+(2+i*i*1.5+i*3)*m,th=(1.6+i*1.4)*m;return`<path d="M-10 ${f(y0+th)}L60 ${f(hz)}L130 ${f(y0+th)}V${f(y0+th*2)}L60 ${f(hz)}L-10 ${f(y0+th*2)}Z" fill="${c}" opacity=".95"/>`}).join('')}
    ${Array.from({length:18},()=>{const x=R()*120,y=H*.8+R()*H*.18;return`<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.3*m)}" fill="${rows[Math.floor(R()*5)]}"/><rect x="${f(x-.2)}" y="${f(y)}" width=".4" height="${f(2*m)}" fill="#2f7a2a"/>`}).join('')}
    <g transform="translate(82 ${f(hz+2*m)}) scale(${f(m)})"><path d="M-6 0L-4.4 -22H4.4L6 0Z" fill="#a8613a"/><path d="M-5.6 -21L0 -27L5.6 -21Z" fill="#6a3420"/><rect x="-1.6" y="-6" width="3.2" height="6" fill="#3a2010"/><rect x="-1.2" y="-15" width="2.4" height="3" fill="#ffe0a0"/>
      <g transform="translate(0 -21) rotate(18)">${[0,90,180,270].map(a=>`<g transform="rotate(${a})"><rect x="-1" y="-20" width="2" height="19" fill="#5a3420"/><rect x="1" y="-19" width="5.4" height="14" fill="#f4ead8" stroke="#8a6a4a" stroke-width=".4"/></g>`).join('')}<circle r="1.6" fill="#3a2010"/></g></g>`}},
  {n:'Autumn Lane',k:'landscape',d:(H,p,R)=>{const hz=H*.48,m=H/80;
    const tree=(x,y,s,c)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><rect x="-1" y="-10" width="2" height="10" fill="#5a3420"/><circle cy="-14" r="7" fill="${c}"/><circle cx="-4" cy="-11" r="5" fill="${c}"/><circle cx="4" cy="-11" r="5" fill="${c}"/><circle cx="-2" cy="-16" r="3" fill="#fff" opacity=".18"/></g>`;
    const cols=['#e85a2a','#f0a030','#d8342a','#ffc94a','#b8461e'];
    return `<defs>${lin(p+'s',[[0,'#ffd0a0'],[1,'#fff0d8']])}${lin(p+'r',[[0,'#9a8a7a'],[1,'#5a4a42']])}${lin(p+'g',[[0,'#c8a24a'],[1,'#8a6a2a']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}${ridge([[0,hz-5*m],[50,hz-9*m],[120,hz-4*m]],hz+1,'#d89a6a',.7)}${box(`url(#${p}g)`,hz,H)}
    <path d="M56 ${f(hz)}L64 ${f(hz)}L104 ${H}H16Z" fill="url(#${p}r)"/><path d="M60 ${f(hz+2*m)}V${f(hz+6*m)}M60 ${f(hz+10*m)}V${f(hz+16*m)}M60 ${f(hz+22*m)}V${H}" stroke="#ffe8a0" stroke-width="${f(.8*m)}" stroke-dasharray="${f(3*m)} ${f(4*m)}"/>
    ${[[50,.0,.4],[44,.08,.55],[36,.2,.75],[24,.38,1],[8,.6,1.3],[70,.0,.4],[76,.08,.55],[84,.2,.75],[96,.38,1],[112,.6,1.3]].map(([x,dy,s],i)=>tree(x,hz+dy*(H-hz)+2*m,s*m,cols[i%5])).join('')}
    ${Array.from({length:16},()=>`<ellipse cx="${f(R()*120)}" cy="${f(hz+R()*(H-hz))}" rx="${f(.9*m)}" ry="${f(.5*m)}" fill="${cols[Math.floor(R()*5)]}"/>`).join('')}`}},
  {n:'Volcano Island',k:'landscape',d:(H,p,R)=>{const hz=H*.72,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#2a0f1a'],[.5,'#8a2a2a'],[1,'#ff7a3a']])}${lin(p+'v',[[0,'#4a2a2a'],[1,'#1a0f14']])}${lin(p+'l',[[0,'#fff0a0'],[.4,'#ffb030'],[1,'#ff3a1a']])}${glowDef(p+'g','#ff9a3a',.9)}${lin(p+'o',[[0,'#3a1a2a'],[1,'#120814']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${stars(R,10,H*.25,'#ffd0a0')}
    ${[[50,.26,10],[66,.2,12],[58,.12,9],[72,.08,7]].map(([x,y,r])=>`<circle cx="${x}" cy="${f(H*y)}" r="${f(r*m)}" fill="#3a2a30" opacity=".75"/>`).join('')}
    ${glow(p+'g',60,H*.36,24*m)}
    <path d="${P([[14,hz],[52,H*.36],[68,H*.36],[106,hz]])}" fill="url(#${p}v)"/>
    <path d="M54 ${f(H*.36)}Q50 ${f(H*.5)} 42 ${f(hz-2*m)}L46 ${f(hz-2*m)}Q56 ${f(H*.5)} 60 ${f(H*.37)}ZM64 ${f(H*.36)}Q70 ${f(H*.52)} 80 ${f(hz-1*m)}L84 ${f(hz-1*m)}Q74 ${f(H*.5)} 66 ${f(H*.36)}Z" fill="url(#${p}l)"/>
    <path d="M52 ${f(H*.36)}Q60 ${f(H*.3)} 68 ${f(H*.36)}Z" fill="#fff0a0"/>${Array.from({length:9},()=>`<circle cx="${f(52+R()*16)}" cy="${f(H*(.12+R()*.2))}" r="${f((.6+R()*1.1)*m)}" fill="${R()<.5?'#ffd060':'#ff6a2a'}"/>`).join('')}
    ${box(`url(#${p}o)`,hz,H)}<rect x="40" y="${f(hz+2*m)}" width="44" height="${f(1*m)}" fill="#ff8a3a" opacity=".5"/><rect x="48" y="${f(hz+5*m)}" width="26" height="${f(.8*m)}" fill="#ff8a3a" opacity=".35"/>
    ${[8,18,104,114].map(x=>`<g transform="translate(${x} ${f(hz+1)}) scale(${f(m*.7)})"><path d="M0 0C1 -6 0 -10 2 -14" fill="none" stroke="#1a0a10" stroke-width="1.4"/><path d="M2 -14q-6 -1 -9 3M2 -14q6 -1 9 3M2 -14q-3 -4 -7 -4M2 -14q4 -4 7 -3" fill="none" stroke="#1a0a10" stroke-width="1.4" stroke-linecap="round"/></g>`).join('')}`}},

  /* ---------- animals ---------- */
  {n:'Snow Fox',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'s',[[0,'#bcd8ff'],[1,'#eef6ff']])}${lin(p+'f',[[0,'#ff9a4a'],[1,'#d8582a']])}${lin(p+'n',[[0,'#ffffff'],[1,'#d8e6f6']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${[10,22,98,110].map((x,i)=>pine(x,H*.74,(24+i%2*6)*m*.8,'#6a8aa8','#7a9ab8')).join('')}
    <path d="M0 ${f(H*.72)}Q60 ${f(H*.66)} 120 ${f(H*.72)}V${H}H0Z" fill="url(#${p}n)"/>
    <g transform="translate(60 ${f(H*.86)}) scale(${f(s*1.05)})">
      <path d="M10 -6C24 -8 30 -20 22 -30C26 -20 18 -12 8 -14Z" fill="url(#${p}f)"/><path d="M22 -30C26 -22 22 -16 16 -14C22 -18 24 -24 22 -30Z" fill="#fff"/>
      <ellipse cx="0" cy="-12" rx="12" ry="13" fill="url(#${p}f)"/><ellipse cx="0" cy="-8" rx="6" ry="9" fill="#fff"/>
      <path d="M-11 -30L-14 -44L-4 -36ZM11 -30L14 -44L4 -36Z" fill="#d8582a"/><path d="M-11 -32L-12.5 -40L-7 -35ZM11 -32L12.5 -40L7 -35Z" fill="#3a1a10"/>
      <path d="M-12 -30C-12 -40 12 -40 12 -30C12 -24 6 -20 0 -18C-6 -20 -12 -24 -12 -30Z" fill="url(#${p}f)"/><path d="M-10 -26C-6 -24 -3 -20 0 -18C3 -20 6 -24 10 -26C6 -22 3 -20 0 -19.6C-3 -20 -6 -22 -10 -26Z" fill="#fff"/>
      <ellipse cx="-5" cy="-29" rx="1.6" ry="2" fill="#1a0f0a"/><ellipse cx="5" cy="-29" rx="1.6" ry="2" fill="#1a0f0a"/><circle cx="-4.4" cy="-29.8" r=".6" fill="#fff"/><circle cx="5.6" cy="-29.8" r=".6" fill="#fff"/>
      <ellipse cx="0" cy="-20.4" rx="1.6" ry="1.1" fill="#1a0f0a"/><rect x="-6" y="-2" width="4" height="3" rx="1.5" fill="#3a1a10"/><rect x="2" y="-2" width="4" height="3" rx="1.5" fill="#3a1a10"/></g>
    ${Array.from({length:26},()=>`<circle cx="${f(R()*120)}" cy="${f(R()*H)}" r="${f((.4+R()*.8)*m)}" fill="#fff" opacity=".9"/>`).join('')}`}},
  {n:'Moonlit Owl',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'s',[[0,'#0f1a3a'],[1,'#2a3a6a']])}${glowDef(p+'m','#fff6d0',.55)}${rad(p+'o',[[0,'#c89a6a'],[1,'#7a5232']],.5,.4,.6)}${rad(p+'e',[[0,'#fff6a0'],[.6,'#ffc83a'],[1,'#c87a00']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${stars(R,24,H)}${glow(p+'m',60,H*.42,40*m)}<circle cx="60" cy="${f(H*.42)}" r="${f(18*m)}" fill="#fff3d0"/><circle cx="54" cy="${f(H*.38)}" r="${f(3*m)}" fill="#e8d8b0"/><circle cx="66" cy="${f(H*.5)}" r="${f(2.2*m)}" fill="#e8d8b0"/>
    <path d="M-4 ${f(H*.8)}C30 ${f(H*.74)} 70 ${f(H*.82)} 124 ${f(H*.72)}" fill="none" stroke="#2a1a10" stroke-width="${f(4*m)}" stroke-linecap="round"/><path d="M90 ${f(H*.76)}q8 -6 14 -4" fill="none" stroke="#2a1a10" stroke-width="${f(2*m)}"/><ellipse cx="104" cy="${f(H*.72)}" rx="${f(4*m)}" ry="${f(2*m)}" fill="#2f5a3a"/>
    <g transform="translate(60 ${f(H*.79)}) scale(${f(s)})">
      <ellipse cx="0" cy="-15" rx="13" ry="16" fill="url(#${p}o)"/><path d="M-12 -24L-13 -34L-5 -28ZM12 -24L13 -34L5 -28Z" fill="#7a5232"/>
      <ellipse cx="0" cy="-10" rx="8" ry="10" fill="#f0dcc0"/>${[0,1,2,3].map(i=>`<path d="M${-5+i*3.4} ${-12+i%2*3}q1.6 1.6 3.2 0" fill="none" stroke="#b08a5a" stroke-width=".7"/>`).join('')}
      <circle cx="-5" cy="-22" r="5.4" fill="#f6ead6"/><circle cx="5" cy="-22" r="5.4" fill="#f6ead6"/><circle cx="-5" cy="-22" r="3.6" fill="url(#${p}e)"/><circle cx="5" cy="-22" r="3.6" fill="url(#${p}e)"/>
      <circle cx="-5" cy="-22" r="1.8" fill="#120a04"/><circle cx="5" cy="-22" r="1.8" fill="#120a04"/><circle cx="-4.2" cy="-23" r=".7" fill="#fff"/><circle cx="5.8" cy="-23" r=".7" fill="#fff"/>
      <path d="M-1.4 -18.6L0 -15.4L1.4 -18.6Z" fill="#e8a030"/><path d="M-13 -14C-17 -6 -14 0 -9 1C-12 -4 -12 -9 -13 -14ZM13 -14C17 -6 14 0 9 1C12 -4 12 -9 13 -14Z" fill="#6a4426"/>
      <path d="M-4 1v2M-2 1v2.4M2 1v2.4M4 1v2" stroke="#e8a030" stroke-width="1" stroke-linecap="round"/></g>`}},
  {n:'Koi Pond',k:'animal',d:(H,p,R)=>{const m=H/80;
    const koi=(x,y,a,s,c1,c2)=>`<g transform="translate(${f(x)} ${f(y)}) rotate(${a}) scale(${f(s)})"><path d="M-14 0C-10 -6 6 -6 12 0C6 6 -10 6 -14 0Z" fill="${c1}"/><path d="M-13 0L-21 -5Q-18 0 -21 5Z" fill="${c1}" opacity=".85"/><path d="M-4 -4.6Q0 -2 4 -4.6Q2 -1 -4 -4.6Z" fill="${c2}"/><ellipse cx="2" cy="1.5" rx="4" ry="2" fill="${c2}"/><path d="M0 4L-4 9L2 4.6Z" fill="${c1}" opacity=".8"/><path d="M0 -4L-4 -9L2 -4.6Z" fill="${c1}" opacity=".8"/><circle cx="9" cy="-1.5" r=".9" fill="#1a0a04"/></g>`;
    const pad=(x,y,r,a)=>`<path d="M${f(x)} ${f(y)}m${f(r)} 0a${f(r)} ${f(r*.8)} 0 1 1 -${f(r*.3)} -${f(r*.6)}L${f(x)} ${f(y)}Z" fill="#3fae5a" stroke="#2a8a44" stroke-width=".5" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
    return `<defs>${rad(p+'w',[[0,'#5ad8d0'],[.7,'#1f9aa8'],[1,'#0f5a6a']],.5,.5,.75)}</defs>
    ${box(`url(#${p}w)`,0,H)}${[[30,.3,10],[88,.65,14],[60,.5,22]].map(([x,y,r])=>`<circle cx="${x}" cy="${f(H*y)}" r="${f(r*m)}" fill="none" stroke="#bff6f0" stroke-width="${f(.5*m)}" opacity=".35"/>`).join('')}
    ${koi(42,H*.36,-18,m*1.1,'#ff7a2a','#fff6ea')}${koi(80,H*.66,160,m*1.15,'#fff6ea','#ff4a2a')}${koi(96,H*.22,40,m*.7,'#ffd04a','#fff')}
    ${pad(14,H*.78,7*m,20)}${pad(106,H*.48,6*m,-60)}${pad(22,H*.14,5*m,110)}${pad(70,H*.9,5*m,200)}
    <g transform="translate(16 ${f(H*.76)}) scale(${f(m)})">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-3" rx="1.8" ry="3.4" fill="#ffc0d8" transform="rotate(${a})"/>`).join('')}<circle r="1.4" fill="#ffd23d"/></g>
    ${Array.from({length:8},()=>`<circle cx="${f(R()*120)}" cy="${f(R()*H)}" r="${f((.6+R())*m)}" fill="#e6fffb" opacity=".5"/>`).join('')}`}},
  {n:'Sleepy Cat',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'w',[[0,'#f6d8b0'],[1,'#e8b888']])}${lin(p+'n',[[0,'#1a2a5a'],[1,'#3a4a8a']])}${lin(p+'c',[[0,'#ff9ab0'],[1,'#d85a7a']])}${lin(p+'k',[[0,'#ffb35a'],[1,'#e07a2a']])}</defs>
    ${box(`url(#${p}w)`,0,H)}${[0,1,2,3,4,5,6].map(i=>`<rect x="${i*18}" y="0" width="8" height="${H}" fill="#fff" opacity=".12"/>`).join('')}
    <rect x="12" y="${f(H*.1)}" width="40" height="${f(H*.42)}" rx="2" fill="url(#${p}n)" stroke="#fff" stroke-width="${f(2*m)}"/><path d="M32 ${f(H*.1)}V${f(H*.52)}M12 ${f(H*.31)}H52" stroke="#fff" stroke-width="${f(1.4*m)}"/>
    <circle cx="24" cy="${f(H*.2)}" r="${f(4*m)}" fill="#fff3c0"/>${stars(()=>R(),0,0)}${[[40,.17],[46,.26],[20,.42],[44,.44]].map(([x,y])=>`<circle cx="${x}" cy="${f(H*y)}" r="${f(.6*m)}" fill="#fff"/>`).join('')}
    <g transform="translate(98 ${f(H*.62)}) scale(${f(m)})"><path d="M-7 0H7L5 10H-5Z" fill="#c8643a"/><rect x="-8" y="-1.5" width="16" height="3" rx="1" fill="#a84a2a"/>${[-50,-20,10,40,-80].map(a=>`<path d="M0 -1Q${f(Math.sin(a/57)*6)} -10 ${f(Math.sin(a/57)*12)} ${f(-14+Math.abs(a)/10)}Q${f(Math.sin(a/57)*4)} -8 0 -1Z" fill="#3fae5a"/>`).join('')}</g>
    <ellipse cx="60" cy="${f(H*.86)}" rx="${f(40*Math.min(1.3,s))}" ry="${f(8*m)}" fill="url(#${p}c)"/><ellipse cx="60" cy="${f(H*.84)}" rx="${f(34*Math.min(1.3,s))}" ry="${f(4*m)}" fill="#ffc0d0" opacity=".6"/>
    <g transform="translate(60 ${f(H*.82)}) scale(${f(s)})">
      <path d="M14 -2C24 0 26 -8 20 -10C24 -6 20 -3 14 -4Z" fill="url(#${p}k)"/><ellipse cx="0" cy="-7" rx="17" ry="9" fill="url(#${p}k)"/>
      ${[-8,-2,4].map(x=>`<path d="M${x} -15q2 4 0 8" fill="none" stroke="#c8641e" stroke-width="1.4" stroke-linecap="round"/>`).join('')}
      <circle cx="-13" cy="-10" r="7.5" fill="url(#${p}k)"/><path d="M-19 -14L-19 -22L-13 -17ZM-7 -14L-6 -22L-11 -17Z" fill="#e07a2a"/><path d="M-18 -16L-18 -20L-15 -17Z" fill="#ffc0b0"/>
      <path d="M-17 -10q1.6 1.2 3.2 0M-12 -10q1.6 1.2 3.2 0" fill="none" stroke="#3a1a0a" stroke-width=".8" stroke-linecap="round"/><path d="M-14.2 -7.4l.8 .8l.8 -.8z" fill="#ff7a8a"/>
      <path d="M-21 -8h-5M-21 -6.6l-4.6 1.4M-5 -8h5M-5 -6.6l4.6 1.4" stroke="#fff" stroke-width=".4"/></g>
    <text x="${f(36)}" y="${f(H*.6)}" font-size="${f(5*m)}" fill="#7a5a8a" font-family="sans-serif" font-weight="700" opacity=".7">z</text><text x="${f(30)}" y="${f(H*.52)}" font-size="${f(7*m)}" fill="#7a5a8a" font-family="sans-serif" font-weight="700" opacity=".6">z</text>`}},
  {n:'Penguin Pals',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    const peng=(x,y,sc,flip)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc*(flip?-1:1))} ${f(sc)})"><ellipse cx="0" cy="-12" rx="8" ry="12" fill="#1a2030"/><ellipse cx="0" cy="-10" rx="5.6" ry="9" fill="#fff"/><circle cx="0" cy="-22" r="6" fill="#1a2030"/><path d="M-3.4 -22a3.4 3 0 0 1 6.8 0" fill="#fff" opacity=".9"/><circle cx="-1.8" cy="-22.4" r="1" fill="#000"/><circle cx="1.8" cy="-22.4" r="1" fill="#000"/><path d="M-1.6 -20L0 -17.6L1.6 -20Z" fill="#ff9a2a"/><path d="M-8 -16Q-12 -8 -9 -4Q-8 -10 -7 -13Z" fill="#1a2030"/><path d="M8 -16Q12 -8 9 -4Q8 -10 7 -13Z" fill="#1a2030"/><ellipse cx="-3" cy="0" rx="2.6" ry="1.2" fill="#ff9a2a"/><ellipse cx="3" cy="0" rx="2.6" ry="1.2" fill="#ff9a2a"/><ellipse cx="-3" cy="-16" rx="1.4" ry="1" fill="#ffb3c1" opacity=".7"/></g>`;
    return `<defs>${lin(p+'s',[[0,'#7ac8ff'],[1,'#e0f4ff']])}${lin(p+'i',[[0,'#ffffff'],[1,'#bfe0f6']])}${lin(p+'o',[[0,'#3a8ad8'],[1,'#1a4a8a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${cloud(20,H*.16,.7*m)}<circle cx="100" cy="${f(H*.16)}" r="${f(6*m)}" fill="#fffbe0"/>
    <path d="${P([[64,H*.6],[76,H*.3],[84,H*.38],[96,H*.24],[110,H*.6]])}" fill="url(#${p}i)"/><path d="${P([[76,H*.3],[80,H*.45],[84,H*.38]])}" fill="#a8d0ee"/>
    ${box(`url(#${p}o)`,H*.6,H)}${[0,1,2].map(i=>`<path d="M${f(10+i*36)} ${f(H*.66+i*2*m)}q5 -2 10 0" fill="none" stroke="#bfe6ff" stroke-width="${f(.5*m)}" opacity=".7"/>`).join('')}
    <path d="M-4 ${f(H*.72)}Q30 ${f(H*.64)} 74 ${f(H*.72)}L70 ${f(H*.9)}Q30 ${f(H*.96)} -4 ${f(H*.9)}Z" fill="url(#${p}i)"/><path d="M-4 ${f(H*.9)}Q30 ${f(H*.96)} 70 ${f(H*.9)}L68 ${f(H)}H-4Z" fill="#9ac8e6"/>
    ${peng(26,H*.78,s*.95,false)}${peng(46,H*.76,s*.75,true)}<g transform="translate(108 ${f(H*.76)}) scale(${f(m)})"><path d="M-6 0Q0 -4 6 0Q0 3 -6 0Z" fill="#8ab4d8"/></g>`}},
  {n:'Butterfly Meadow',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'s',[[0,'#bff0ff'],[1,'#f0fff0']])}${rad(p+'a',[[0,'#ffe680'],[.45,'#ff9a2a'],[1,'#d8402a']],.3,.3,.9)}${rad(p+'b',[[0,'#9ae0ff'],[1,'#3a6ae0']],.4,.4,.8)}${lin(p+'g',[[0,'#8ae07a'],[1,'#3a9a3a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${ridge([[0,H*.74],[40,H*.7],[80,H*.76],[120,H*.7]],H,`url(#${p}g)`)}
    ${Array.from({length:22},()=>{const x=R()*120,y=H*.74+R()*H*.24,c=['#ff6b9a','#ffd23d','#fff','#b98bff'][Math.floor(R()*4)];return`<path d="M${f(x)} ${f(y)}v${f(-4*m)}" stroke="#2f8a3a" stroke-width="${f(.5*m)}"/><circle cx="${f(x)}" cy="${f(y-4*m)}" r="${f(1.4*m)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y-4*m)}" r="${f(.5*m)}" fill="#ffb02e"/>`}).join('')}
    <g transform="translate(60 ${f(H*.42)}) scale(${f(s*1.1)}) rotate(-8)">
      <path d="M0 -2C-6 -22 -30 -26 -30 -10C-30 0 -12 2 0 0Z" fill="url(#${p}a)" stroke="#3a1a0a" stroke-width="1"/><path d="M0 -2C6 -22 30 -26 30 -10C30 0 12 2 0 0Z" fill="url(#${p}a)" stroke="#3a1a0a" stroke-width="1"/>
      <path d="M0 1C-4 14 -22 20 -22 10C-22 4 -10 2 0 1Z" fill="url(#${p}b)" stroke="#3a1a0a" stroke-width="1"/><path d="M0 1C4 14 22 20 22 10C22 4 10 2 0 1Z" fill="url(#${p}b)" stroke="#3a1a0a" stroke-width="1"/>
      ${[[-22,-12,3],[22,-12,3],[-14,-18,2],[14,-18,2],[-14,10,2.4],[14,10,2.4]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9"/><circle cx="${x}" cy="${y}" r="${f(r*.45)}" fill="#3a1a0a"/>`).join('')}
      <ellipse cx="0" cy="0" rx="1.8" ry="9" fill="#2a1a10"/><path d="M-1 -8Q-4 -16 -8 -18M1 -8Q4 -16 8 -18" fill="none" stroke="#2a1a10" stroke-width=".8"/><circle cx="-8" cy="-18" r="1" fill="#2a1a10"/><circle cx="8" cy="-18" r="1" fill="#2a1a10"/></g>
    <path d="M20 ${f(H*.3)}q6 -6 10 2q4 -8 10 -2" fill="none" stroke="#fff" stroke-width="${f(.6*m)}" stroke-dasharray="1.5 1.5" opacity=".8"/>`}},
  {n:'Whale Song',k:'animal',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'w',[[0,'#3ac0f0'],[.5,'#1a6ac0'],[1,'#0a2a6a']])}${lin(p+'b',[[0,'#5a7ab8'],[1,'#2a3a7a']])}${lin(p+'r',[[0,'#ffffff',.5],[1,'#ffffff',0]])}</defs>
    ${box(`url(#${p}w)`,0,H)}${[[20,8],[44,6],[76,10],[100,7]].map(([x,w])=>`<path d="M${x} 0L${x+w} 0L${x+w*3} ${H}L${x+w*1.5} ${H}Z" fill="url(#${p}r)" opacity=".35"/>`).join('')}
    <g transform="translate(60 ${f(H*.55)}) scale(${f(Math.min(s*1.15,1.3))})">
      <path d="M-40 0C-36 -14 -10 -18 10 -12C24 -8 32 -2 36 -8L44 -16L42 -4L48 0L38 2C30 8 18 12 2 12C-20 12 -38 8 -40 0Z" fill="url(#${p}b)"/>
      <path d="M-38 2C-30 9 -10 11 6 10C-8 14 -30 12 -38 2Z" fill="#cfe0ff"/>${[0,1,2,3,4,5].map(i=>`<path d="M${-30+i*6} ${4+i*.4}l3 5" stroke="#9ab4e0" stroke-width=".7"/>`).join('')}
      <path d="M-14 6C-14 14 -6 18 -2 16C-6 13 -8 10 -8 6Z" fill="#3a4a8a"/><circle cx="-30" cy="-2" r="1.3" fill="#0a1030"/><path d="M-36 2Q-33 3.4 -30 2.6" fill="none" stroke="#0a1030" stroke-width=".7"/>
      ${[[-20,-8,2],[-6,-12,1.6],[4,-10,2.2],[16,-8,1.5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#7a9ad8" opacity=".6"/>`).join('')}</g>
    ${Array.from({length:12},()=>{const x=R()*120,y=R()*H*.5;return`<circle cx="${f(x)}" cy="${f(y)}" r="${f((.6+R()*1.4)*m)}" fill="none" stroke="#e0f6ff" stroke-width="${f(.4*m)}" opacity=".8"/>`}).join('')}
    ${[0,1,2,3,4].map(i=>`<g transform="translate(${f(90+i*5)} ${f(H*.2+i%2*4*m)}) scale(${f(m*.5)})"><path d="M-4 0Q0 -2.4 4 0Q0 2.4 -4 0ZM-4 0L-6.4 -2V2Z" fill="#ffd23d"/></g>`).join('')}`}},

  /* ---------- space & sky ---------- */
  {n:'Ringed Planet',k:'space',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${rad(p+'n',[[0,'#b04aff',.6],[1,'#b04aff',0]])}${rad(p+'n2',[[0,'#2ad8ff',.45],[1,'#2ad8ff',0]])}${rad(p+'p',[[0,'#ffe0a0'],[.5,'#f0a050'],[1,'#a04a2a']],.35,.35,.75)}${lin(p+'r',[[0,'#fff0c0',.2],[.5,'#ffe0a0',.9],[1,'#fff0c0',.2]],1,0)}</defs>
    ${box('#070720',0,H)}<ellipse cx="24" cy="${f(H*.3)}" rx="${f(40*m)}" ry="${f(26*m)}" fill="url(#${p}n)"/><ellipse cx="100" cy="${f(H*.75)}" rx="${f(36*m)}" ry="${f(24*m)}" fill="url(#${p}n2)"/>${stars(R,50,H)}
    <g transform="translate(62 ${f(H*.5)}) scale(${f(s)}) rotate(-16)">
      <path d="M-38 0A38 9 0 0 1 38 0" fill="none" stroke="url(#${p}r)" stroke-width="4"/><circle r="18" fill="url(#${p}p)"/>
      ${[-9,-3,4,10].map((y,i)=>`<path d="M${-Math.sqrt(324-y*y)} ${y}A18 18 0 0 0 ${Math.sqrt(324-y*y)} ${y}" fill="none" stroke="${i%2?'#c86a3a':'#ffd08a'}" stroke-width="${1.6+i%2}" opacity=".5"/>`).join('')}
      <path d="M-38 0A38 9 0 0 0 38 0" fill="none" stroke="url(#${p}r)" stroke-width="4"/><path d="M-30 0A30 6 0 0 0 30 0" fill="none" stroke="#a06a3a" stroke-width="1" opacity=".6"/></g>
    <circle cx="${f(18)}" cy="${f(H*.74)}" r="${f(5*m)}" fill="#c8d0e0"/><circle cx="${f(16.5)}" cy="${f(H*.72)}" r="${f(1.2*m)}" fill="#9aa4b8"/><circle cx="${f(20)}" cy="${f(H*.77)}" r="${f(.8*m)}" fill="#9aa4b8"/>
    <path d="M96 ${f(H*.12)}l${f(18*m)} ${f(6*m)}" stroke="#fff" stroke-width="${f(.7*m)}" stroke-linecap="round" opacity=".8"/>`}},
  {n:'Rocket Launch',k:'space',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'s',[[0,'#0a0a2a'],[.7,'#3a2a7a'],[1,'#ff7a6a']])}${lin(p+'b',[[0,'#e8eef8'],[.5,'#ffffff'],[1,'#a8b4c8']],1,0)}${lin(p+'f',[[0,'#fff6a0'],[.5,'#ffa030'],[1,'#ff3a1a',0]])}</defs>
    ${box(`url(#${p}s)`,0,H)}${stars(R,34,H*.7)}
    ${Array.from({length:9},(_,i)=>`<circle cx="${f(36+i*6+R()*4)}" cy="${f(H*(.88+R()*.08))}" r="${f((6+R()*5)*m)}" fill="#e8e0f0" opacity="${f(.7+R()*.3)}"/>`).join('')}
    <g transform="translate(60 ${f(H*.56)}) scale(${f(s)}) rotate(8)">
      <path d="M-5 14Q0 40 5 14Z" fill="url(#${p}f)"/><path d="M-3 14Q0 28 3 14Z" fill="#fffbe0"/>
      <path d="M-7 4L-14 16L-6 13ZM7 4L14 16L6 13Z" fill="#e84a5a"/><path d="M0 -28C8 -18 8 4 6 14H-6C-8 4 -8 -18 0 -28Z" fill="url(#${p}b)"/>
      <path d="M0 -28C4 -23 6 -18 6.6 -14H-6.6C-6 -18 -4 -23 0 -28Z" fill="#e84a5a"/><circle cx="0" cy="-5" r="3.6" fill="#2a6ae0" stroke="#a8b4c8" stroke-width="1.2"/><circle cx="-1" cy="-6" r="1.1" fill="#bfe0ff"/><rect x="-1" y="4" width="2" height="10" fill="#e84a5a"/></g>
    ${[0,1,2].map(i=>`<circle cx="${f(18+i*40+R()*10)}" cy="${f(H*(.2+R()*.3))}" r="${f(.9*m)}" fill="#fff"/><path d="M${f(18+i*40)} ${f(H*.18)}h1" stroke="#fff"/>`).join('')}`}},
  {n:'Hot Air Balloons',k:'sky',d:(H,p,R)=>{const m=H/80;
    const bal=(x,y,sc,c1,c2)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc)})"><path d="M0 -16C12 -16 14 -4 6 6L3 10H-3L-6 6C-14 -4 -12 -16 0 -16Z" fill="${c1}"/><path d="M0 -16C5 -16 6 -4 3 10H-3C-6 -4 -5 -16 0 -16Z" fill="${c2}"/><path d="M0 -16C1.6 -16 2 -4 1 10H-1C-2 -4 -1.6 -16 0 -16Z" fill="${c1}"/><path d="M-3 10L-2.4 14M3 10L2.4 14" stroke="#5a3420" stroke-width=".5"/><rect x="-2.6" y="14" width="5.2" height="3.4" rx=".6" fill="#a8683a"/><path d="M-9 -10Q-6 -14 -2 -15" fill="none" stroke="#fff" stroke-width="1" opacity=".5"/></g>`;
    return `<defs>${lin(p+'s',[[0,'#ffb88a'],[.5,'#ffe0c0'],[1,'#c8e8ff']])}${lin(p+'h',[[0,'#7ac88a'],[1,'#3a8a5a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${cloud(18,H*.3,.7*m,'#fff',.85)}${cloud(100,H*.46,.9*m,'#fff',.8)}
    ${ridge([[0,H*.8],[30,H*.72],[60,H*.8],[90,H*.7],[120,H*.78]],H,'#9ad0a0')}${ridge([[0,H*.88],[40,H*.82],[80,H*.9],[120,H*.84]],H,`url(#${p}h)`)}
    ${bal(42,H*.36,1.5*m,'#ff4d6d','#ffd23d')}${bal(88,H*.22,1*m,'#4d8dff','#9be5ff')}${bal(18,H*.6,.7*m,'#9b6bff','#ff9ad0')}${bal(104,H*.66,.6*m,'#2ecc8f','#fff6a0')}
    ${[0,1].map(i=>bird(66+i*6,H*.5+i*2*m,m*.7,'#7a4a5a')).join('')}`}},

  /* ---------- underwater & nature ---------- */
  {n:'Coral Reef',k:'underwater',d:(H,p,R)=>{const m=H/80;
    const fish=(x,y,sc,c,d)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc*d)} ${f(sc)})"><path d="M-6 0C-4 -4 4 -4 6 0C4 4 -4 4 -6 0ZM-6 0L-10 -3V3Z" fill="${c}"/><path d="M-1 -3.4V3.4" stroke="#fff" stroke-width="1.2" opacity=".85"/><circle cx="3.4" cy="-.8" r=".7" fill="#111"/></g>`;
    return `<defs>${lin(p+'w',[[0,'#3ae0f0'],[.6,'#1a8ad0'],[1,'#0a3a7a']])}${lin(p+'r',[[0,'#fff',.4],[1,'#fff',0]])}${lin(p+'d',[[0,'#f2d8a0'],[1,'#c8a46a']])}</defs>
    ${box(`url(#${p}w)`,0,H)}${[10,40,72,100].map((x,i)=>`<path d="M${x} 0h${6+i%2*4}l${14} ${f(H*.8)}h-8Z" fill="url(#${p}r)" opacity=".3"/>`).join('')}
    <path d="M0 ${f(H*.86)}Q40 ${f(H*.8)} 80 ${f(H*.86)}T120 ${f(H*.84)}V${H}H0Z" fill="url(#${p}d)"/>
    <g transform="translate(24 ${f(H*.86)}) scale(${f(m)})" fill="none" stroke="#ff6a8a" stroke-width="2.4" stroke-linecap="round"><path d="M0 0V-14M0 -8L-6 -14V-20M0 -10L5 -18M-6 -14L-9 -18"/></g>
    <g transform="translate(92 ${f(H*.88)}) scale(${f(m)})" fill="none" stroke="#ffb02e" stroke-width="2.2" stroke-linecap="round"><path d="M0 0V-12L-5 -18M0 -8L6 -16V-20M-5 -18L-7 -22"/></g>
    <g transform="translate(60 ${f(H*.88)}) scale(${f(m)})"><ellipse cx="0" cy="-4" rx="10" ry="6" fill="#b06bff"/>${[-6,-2,2,6].map(x=>`<circle cx="${x}" cy="-8" r="2" fill="#d8b0ff"/>`).join('')}</g>
    ${[[8,.82],[40,.86],[112,.84]].map(([x,y])=>`<path d="M${x} ${f(H*y)}q-2 -${f(8*m)} 2 -${f(14*m)}q-4 ${f(6*m)} -2 ${f(14*m)}z" fill="#2fae6a"/>`).join('')}
    ${fish(36,H*.38,1.3*m,'#ff8a2a',1)}${fish(84,H*.5,1.1*m,'#ffd23d',-1)}${fish(70,H*.24,.8*m,'#ff4d9a',1)}${fish(18,H*.6,.8*m,'#4dffd0',-1)}
    <g transform="translate(100 ${f(H*.24)}) scale(${f(m)})"><path d="M-6 0A6 6 0 0 1 6 0Q3 1.6 0 0Q-3 1.6 -6 0Z" fill="#ffb3e0" opacity=".85"/>${[-4,-1.4,1.4,4].map(x=>`<path d="M${x} .6q-1 4 .6 8" fill="none" stroke="#ffb3e0" stroke-width=".6"/>`).join('')}</g>
    ${Array.from({length:10},()=>`<circle cx="${f(R()*120)}" cy="${f(R()*H*.8)}" r="${f((.5+R())*m)}" fill="none" stroke="#e0fbff" stroke-width="${f(.4*m)}"/>`).join('')}`}},
  {n:'Mushroom Glade',k:'nature',d:(H,p,R)=>{const m=H/80,s=S(H);
    const mush=(x,y,sc,c)=>`<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc)})"><path d="M-3 0Q-4 -8 -2.4 -12H2.4Q4 -8 3 0Z" fill="#f6ead6"/><path d="M-12 -11C-12 -22 12 -22 12 -11Q0 -8 -12 -11Z" fill="${c}"/><circle cx="-5" cy="-15" r="1.8" fill="#fff"/><circle cx="3" cy="-17" r="1.4" fill="#fff"/><circle cx="7" cy="-13" r="1.2" fill="#fff"/><circle cx="-1" cy="-12.6" r="1" fill="#fff"/></g>`;
    return `<defs>${lin(p+'s',[[0,'#1a2a3a'],[1,'#2a5a4a']])}${rad(p+'l',[[0,'#e0ff8a',.9],[1,'#e0ff8a',0]])}${lin(p+'g',[[0,'#3a7a3a'],[1,'#1a3a24']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${[6,22,100,114].map((x,i)=>`<rect x="${x}" y="0" width="${f((6+i%2*3)*m)}" height="${H}" fill="#14241e"/>`).join('')}
    <path d="M0 ${f(H*.74)}Q60 ${f(H*.66)} 120 ${f(H*.74)}V${H}H0Z" fill="url(#${p}g)"/>
    ${mush(48,H*.86,s*1.2,'#e83a3a')}${mush(74,H*.84,s*.8,'#ff7a3a')}${mush(30,H*.8,s*.5,'#e83a3a')}${mush(92,H*.9,s*.55,'#c83a8a')}
    ${Array.from({length:14},()=>{const x=R()*120,y=R()*H*.8;return`<circle cx="${f(x)}" cy="${f(y)}" r="${f(4*m)}" fill="url(#${p}l)"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(.6*m)}" fill="#f6ffc0"/>`}).join('')}
    ${Array.from({length:10},()=>{const x=R()*120;return`<path d="M${f(x)} ${f(H*.98)}q1 -${f(5*m)} 3 -${f(7*m)}" fill="none" stroke="#5aae4a" stroke-width="${f(.6*m)}"/>`}).join('')}`}},
  {n:'Fairy Castle',k:'architecture',d:(H,p,R)=>{const m=H/80,s=S(H);
    const tower=(x,y,w,h,c)=>`<rect x="${f(x-w/2)}" y="${f(y-h)}" width="${f(w)}" height="${f(h)}" fill="#f2e6ff"/><rect x="${f(x+w*.15)}" y="${f(y-h)}" width="${f(w*.35)}" height="${f(h)}" fill="#d8c8f0"/><path d="${P([[x-w/2-1.4,y-h],[x,y-h-w*1.4],[x+w/2+1.4,y-h]])}" fill="${c}"/><path d="M${f(x)} ${f(y-h-w*1.4)}v-4l3 1.2l-3 1.2" fill="#ffd23d" stroke="#8a6a2a" stroke-width=".3"/><rect x="${f(x-.9)}" y="${f(y-h*.6)}" width="1.8" height="${f(h*.18)}" rx=".9" fill="#5a4a8a"/>`;
    return `<defs>${lin(p+'s',[[0,'#9ad8ff'],[1,'#fff0fa']])}${lin(p+'h',[[0,'#8ae08a'],[1,'#3a9a5a']])}</defs>
    ${box(`url(#${p}s)`,0,H)}${['#ff6a6a','#ffb03a','#ffe04a','#6ad86a','#4aa8ff','#a86aff'].map((c,i)=>`<path d="M-10 ${f(H*.8)}A${f(70-i*3.4)} ${f(H*.62-i*3.4)} 0 0 1 130 ${f(H*.8)}" fill="none" stroke="${c}" stroke-width="3.4" opacity=".4"/>`).join('')}
    ${cloud(16,H*.2,.7*m)}${cloud(104,H*.16,.6*m)}
    <path d="M0 ${f(H*.8)}Q30 ${f(H*.62)} 60 ${f(H*.7)}T120 ${f(H*.74)}V${H}H0Z" fill="url(#${p}h)"/>
    <g transform="translate(60 ${f(H*.72)}) scale(${f(s)}) translate(-60 0)">
      <rect x="44" y="-16" width="32" height="16" fill="#efe2ff"/>${[44,50,56,62,68,74].map(x=>`<rect x="${x}" y="-19" width="3" height="3" fill="#efe2ff"/>`).join('')}<path d="M56 0V-8a4 4 0 0 1 8 0V0Z" fill="#6a4a3a"/>
      ${tower(42,0,8,26,'#ff6aa8')}${tower(78,0,8,26,'#ff6aa8')}${tower(60,-16,9,20,'#9b6bff')}${tower(51,-10,5,14,'#4aa8ff')}${tower(69,-10,5,14,'#4aa8ff')}</g>`}},
  {n:'Cozy Cabin Lake',k:'landscape',d:(H,p,R)=>{const hz=H*.6,m=H/80;
    return `<defs>${lin(p+'s',[[0,'#ff9a8a'],[.5,'#ffc8a0'],[1,'#fff0c8']])}${lin(p+'w',[[0,'#6aa8c8'],[1,'#2a5a7a']])}${lin(p+'g',[[0,'#5a9a4a'],[1,'#2a5a2a']])}</defs>
    ${box(`url(#${p}s)`,0,hz+1)}<circle cx="30" cy="${f(hz-6*m)}" r="${f(10*m)}" fill="#fff0c0" opacity=".9"/>
    ${ridge([[0,hz-14*m],[24,hz-22*m],[50,hz-12*m],[80,hz-26*m],[120,hz-14*m]],hz,'#b87a8a',.8)}
    ${[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120].map((x,i)=>pine(x,hz+1,(9+(i*5)%7)*m,'#2a4a3a','#345a44')).join('')}
    ${box(`url(#${p}w)`,hz,H)}<rect x="0" y="${f(hz)}" width="120" height="${f(2*m)}" fill="#2a4a3a" opacity=".5"/>
    ${[0,1,2,3].map(i=>`<rect x="${f(22-i*1.5)}" y="${f(hz+3*m+i*3*m)}" width="${f(16+i*3)}" height="${f(.8*m)}" fill="#ffe0b0" opacity="${f(.6-i*.12)}"/>`).join('')}
    <path d="M70 ${f(hz+1*m)}h40v${f(2*m)}h-40z" fill="#7a5232"/>${[74,82,90,98,106].map(x=>`<rect x="${x}" y="${f(hz+3*m)}" width="1.2" height="${f(4*m)}" fill="#5a3a22"/>`).join('')}
    <g transform="translate(96 ${f(hz-.5*m)}) scale(${f(m)})"><rect x="-9" y="-9" width="18" height="9" fill="#8a5a32"/>${[-7,-4,-1,2,5].map(y=>'').join('')}<path d="M-11 -8L0 -16L11 -8Z" fill="#5a2a1a"/><rect x="-6" y="-7" width="4" height="4" fill="#ffd27a"/><rect x="2" y="-6" width="3.4" height="6" fill="#3a2010"/><rect x="5" y="-17" width="2.4" height="5" fill="#4a2a18"/></g>
    <path d="M100 ${f(hz-17*m)}q-3 -3 0 -6q3 -3 0 -6" fill="none" stroke="#fff" stroke-width="${f(1*m)}" opacity=".5"/>
    <g transform="translate(46 ${f(hz+9*m)}) scale(${f(m)})"><path d="M-8 0Q0 4 8 0L6 2Q0 4 -6 2Z" fill="#c8683a"/><path d="M0 0V-7" stroke="#5a3a22" stroke-width=".6"/></g>`}},

  /* ---------- still life ---------- */
  {n:'Sweet Cupcake',k:'still life',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'b',[[0,'#ffd6e6'],[1,'#ffb0cc']])}${lin(p+'c',[[0,'#ffe0b8'],[1,'#e8a868']],1,0)}${lin(p+'f',[[0,'#fff0f6'],[1,'#ff9ac4']])}${rad(p+'r',[[0,'#ff8a9a'],[.6,'#e8203a'],[1,'#9a0a1a']],.35,.35,.7)}</defs>
    ${box(`url(#${p}b)`,0,H)}${Array.from({length:30},(_,i)=>`<circle cx="${(i%6)*22+(Math.floor(i/6)%2)*11}" cy="${f(Math.floor(i/6)*H/4.5+6)}" r="${f(1.8*m)}" fill="#fff" opacity=".55"/>`).join('')}
    <path d="M-2 ${f(4*m)}Q60 ${f(18*m)} 122 ${f(4*m)}" fill="none" stroke="#fff" stroke-width="${f(.8*m)}"/>${[0,1,2,3,4,5,6,7].map(i=>{const x=6+i*15,y=4*m+Math.sin((i+.5)/8*Math.PI)*12*m;return`<path d="M${f(x-4)} ${f(y-1)}L${f(x+4)} ${f(y-1)}L${x} ${f(y+7*Math.min(m,1.4))}Z" fill="${['#ff4f8b','#ffb020','#2bc4ff','#8c5bff','#3ad67a','#ff7a3d','#ff5ad8','#18c7b4'][i]}"/>`}).join('')}
    ${[[14,.45,'#ff4f8b'],[104,.4,'#8c5bff'],[18,.78,'#2bc4ff'],[100,.8,'#ffb020']].map(([x,y,c])=>`<path transform="translate(${x} ${f(H*y)}) scale(${f(Math.min(m,1.4)*.9)})" d="M0 3C-6 -1 -4 -6 0 -3C4 -6 6 -1 0 3Z" fill="${c}"/>`).join('')}
    <ellipse cx="60" cy="${f(H*.92)}" rx="${f(28*Math.min(s,1.4))}" ry="${f(3*m)}" fill="#d87a9a" opacity=".5"/>
    <g transform="translate(60 ${f(H*.9)}) scale(${f(s*1.1)})">
      <path d="M-14 -16L-10 0H10L14 -16Z" fill="url(#${p}c)"/>${[-10,-5,0,5,10].map(x=>`<path d="M${x*1.25} -16L${x} 0" stroke="#c8884a" stroke-width=".8"/>`).join('')}
      <path d="M-16 -16C-20 -22 -12 -26 -8 -24C-10 -32 4 -34 4 -26C10 -30 18 -24 12 -20C20 -20 18 -14 14 -14Z" fill="url(#${p}f)"/>
      <path d="M-10 -22C-4 -20 4 -20 10 -22M-6 -28C-2 -26 2 -26 4 -27" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
      ${Array.from({length:12},()=>`<rect x="${f(-12+R()*24)}" y="${f(-26+R()*10)}" width="2" height=".7" rx=".35" fill="${['#ffd23d','#4dd8ff','#7aff8a','#b98bff','#fff'][Math.floor(R()*5)]}" transform="rotate(${f(R()*180)} 0 ${f(-20)})"/>`).join('')}
      <path d="M1 -32Q4 -38 8 -40" fill="none" stroke="#3a7a2a" stroke-width=".9"/><circle cx="0" cy="-31" r="4" fill="url(#${p}r)"/><circle cx="-1.4" cy="-32.4" r="1" fill="#fff" opacity=".7"/></g>`}},
  {n:'Tea Time',k:'still life',d:(H,p,R)=>{const m=H/80,s=S(H);
    return `<defs>${lin(p+'w',[[0,'#d8f0e6'],[1,'#a8d8c8']])}${lin(p+'t',[[0,'#ffffff'],[.6,'#e8f0ff'],[1,'#b8c8e8']],1,0)}${lin(p+'tb',[[0,'#c8844a'],[1,'#8a4a22']])}</defs>
    ${box(`url(#${p}w)`,0,H*.7)}${Array.from({length:8},(_,i)=>`<path d="M${i*16} 0V${f(H*.7)}" stroke="#fff" stroke-width="4" opacity=".25"/>`).join('')}
    <g transform="translate(22 ${f(H*.24)}) scale(${f(Math.min(m,1.4))})"><circle r="9" fill="#fff" stroke="#c8844a" stroke-width="2"/>${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>`<rect x="-.4" y="-8" width=".8" height="${i%3?1.2:2.2}" fill="#7a4a22" transform="rotate(${i*30})"/>`).join('')}<path d="M0 0V-5.6M0 0L4 2" stroke="#3a2010" stroke-width="1" stroke-linecap="round"/><circle r="1" fill="#e84a5a"/></g>
    <g transform="translate(94 ${f(H*.2)}) scale(${f(Math.min(m,1.4))})"><rect x="-12" y="-9" width="24" height="18" rx="1.5" fill="#c8844a"/><rect x="-10" y="-7" width="20" height="14" fill="#9ad8ff"/><path d="M-10 7L-3 -1L2 4L5 1L10 7Z" fill="#3fae5a"/><circle cx="5" cy="-3" r="2" fill="#fff3a0"/></g>
    <g transform="translate(97 ${f(H*.48)}) scale(${f(Math.min(m,1.3))})"><rect x="-14" y="0" width="28" height="2" rx="1" fill="#8a5a32"/><path d="M-9 0h6l-1 -5h-4z" fill="#e8704a"/><path d="M-6 -5q-4 -6 -1 -9M-6 -5q3 -6 6 -7M-6 -5q-1 -5 -5 -6" fill="none" stroke="#3fae5a" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="-7" width="3" height="7" fill="#4a7dff"/><rect x="6.4" y="-6" width="3" height="6" fill="#ff4f8b"/><rect x="9.8" y="-8" width="2.6" height="8" fill="#ffb020"/></g>
    ${box(`url(#${p}tb)`,H*.7,H)}<rect x="0" y="${f(H*.7)}" width="120" height="${f(1.6*m)}" fill="#e8b07a"/>
    <g transform="translate(52 ${f(H*.74)}) scale(${f(s)})">
      <ellipse cx="0" cy="0" rx="20" ry="3" fill="#000" opacity=".15"/><path d="M14 -16C26 -20 28 -12 16 -6" fill="none" stroke="#b8c8e8" stroke-width="2.6"/><path d="M-14 -12L-26 -22L-24 -18L-15 -6Z" fill="url(#${p}t)"/>
      <path d="M-16 -2C-20 -10 -18 -22 0 -22S20 -10 16 -2Z" fill="url(#${p}t)"/><rect x="-14" y="-3" width="28" height="3" rx="1.4" fill="#d8e0f6"/>
      <path d="M-10 -22Q0 -27 10 -22Z" fill="#d8e0f6"/><circle cx="0" cy="-26" r="2" fill="#ff8aa8"/>
      ${[[-8,-12],[0,-15],[8,-11],[-4,-7],[5,-6]].map(([x,y])=>`<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(a=>`<ellipse cy="-1.4" rx=".9" ry="1.5" fill="#ff8aa8" transform="rotate(${a})"/>`).join('')}<circle r=".7" fill="#ffd23d"/></g>`).join('')}</g>
    <g transform="translate(96 ${f(H*.76)}) scale(${f(s*.8)})"><ellipse cx="0" cy="0" rx="12" ry="2.6" fill="#fff"/><path d="M-8 -9H8L6 -1H-6Z" fill="#fff"/><path d="M8 -7Q13 -6 7 -3" fill="none" stroke="#fff" stroke-width="1.4"/><ellipse cx="0" cy="-9" rx="8" ry="1.6" fill="#a8582a"/>
      <path d="M-2 -12q-2 -3 0 -6q2 -3 0 -6M3 -12q-2 -3 0 -6" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/></g>
    <g transform="translate(18 ${f(H*.78)}) scale(${f(m)})"><circle cx="0" cy="-3" r="4" fill="#e8a858"/><circle cx="-1.2" cy="-3.6" r=".6" fill="#7a4a22"/><circle cx="1.4" cy="-2.4" r=".6" fill="#7a4a22"/></g>`}},

  /* ---------- abstract art ---------- */
  {n:'Rose Window',k:'abstract',no4:true,d:(H,p,R)=>{const m=H/80,cx=60,cy=H/2,r=Math.min(56,H*.46);
    const cols=['#e8203a','#1a5ae0','#ffc81a','#1aa85a','#9a2ae0','#ff7a1a'];
    let seg='';const n=12;
    for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
      for(const [r0,r1,o] of [[r*.28,r*.62,0],[r*.62,r,1]]){const pts=[[cx+Math.cos(a0)*r0,cy+Math.sin(a0)*r0],[cx+Math.cos(a0)*r1,cy+Math.sin(a0)*r1],[cx+Math.cos(a1)*r1,cy+Math.sin(a1)*r1],[cx+Math.cos(a1)*r0,cy+Math.sin(a1)*r0]];
        seg+=`<path d="${P(pts)}" fill="${cols[(i+o*3)%6]}" stroke="#1a1020" stroke-width="${f(1.4*m)}" stroke-linejoin="round"/>`}}
    return `<defs>${rad(p+'g',[[0,'#fff',.55],[1,'#fff',0]],.4,.35,.6)}</defs>
    ${box('#1a1020',0,H)}${Array.from({length:Math.ceil(H/10)},(_,y)=>Array.from({length:12},(_,x)=>`<rect x="${x*10+((y%2)*5)}" y="${y*10}" width="9" height="9" fill="${['#3a2a4a','#2a1f3a','#4a2a3a'][(x+y)%3]}"/>`).join('')).join('')}
    <circle cx="${cx}" cy="${f(cy)}" r="${f(r+3*m)}" fill="#c8a24a"/>${seg}
    ${Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return`<circle cx="${f(cx+Math.cos(a)*r*.16)}" cy="${f(cy+Math.sin(a)*r*.16)}" r="${f(r*.09)}" fill="${cols[i%6]}" stroke="#1a1020" stroke-width="${f(m)}"/>`}).join('')}
    <circle cx="${cx}" cy="${f(cy)}" r="${f(r*.08)}" fill="#ffe680" stroke="#1a1020" stroke-width="${f(m)}"/><circle cx="${cx}" cy="${f(cy)}" r="${f(r)}" fill="url(#${p}g)"/>`}},
  {n:'Bauhaus Shapes',k:'abstract',d:(H,p,R)=>{const m=H/80;
    return `${box('#f4ead6',0,H)}<rect x="0" y="${f(H*.62)}" width="120" height="${f(H*.38)}" fill="#1a3a6a"/>
    <circle cx="34" cy="${f(H*.42)}" r="${f(20*Math.min(m,1.35))}" fill="#e8402a"/><path d="M34 ${f(H*.42-20*Math.min(m,1.35))}A${f(20*Math.min(m,1.35))} ${f(20*Math.min(m,1.35))} 0 0 1 34 ${f(H*.42+20*Math.min(m,1.35))}Z" fill="#ffc81a"/>
    <path d="${P([[70,H*.62],[94,H*.14],[118,H*.62]])}" fill="#1a1a2a"/><rect x="58" y="${f(H*.2)}" width="${f(16*m*.8)}" height="${f(16*m*.8)}" fill="#ffc81a" transform="rotate(15 66 ${f(H*.26)})"/>
    ${[0,1,2,3,4].map(i=>`<rect x="${8+i*6}" y="${f(H*.7)}" width="3" height="${f(H*.24)}" fill="#f4ead6"/>`).join('')}
    <circle cx="94" cy="${f(H*.8)}" r="${f(9*m*.8)}" fill="none" stroke="#e8402a" stroke-width="${f(3*m*.8)}"/><path d="M50 ${f(H*.94)}A14 14 0 0 1 78 ${f(H*.94)}Z" fill="#ffc81a"/>
    <path d="M0 ${f(H*.08)}H54" stroke="#1a1a2a" stroke-width="${f(2*m)}"/><circle cx="108" cy="${f(H*.1)}" r="${f(4*m)}" fill="#1a3a6a"/>`}},
  {n:'Mosaic Fish',k:'abstract',no4:true,d:(H,p,R)=>{const m=H/80,s=Math.min(S(H),1.15);
    const cell=4;let tiles='';
    for(let y=0;y<H;y+=cell)for(let x=0;x<120;x+=cell){const dx=(x-60)/(46*s),dy=(y-H/2)/(20*s);const inF=dx*dx+dy*dy<1,tail=x<60-38*s&&x>60-56*s&&Math.abs(y-H/2)<(60-38*s-x)*-.9;
      const c=inF?(['#ff7a1a','#ffa23a','#ff5a1a'][Math.floor(R()*3)]):tail?'#ff8a2a':(['#1a8ad0','#2a9ae0','#1a7ac0','#3aaae6'][Math.floor(R()*4)]);
      tiles+=`<rect x="${x+.3}" y="${y+.3}" width="${cell-.6}" height="${cell-.6}" rx=".6" fill="${c}"/>`}
    return `${box('#0a3a6a',0,H)}${tiles}<circle cx="${f(60+30*s)}" cy="${f(H/2-4*s)}" r="${f(3.4*s)}" fill="#fff"/><circle cx="${f(60+30.6*s)}" cy="${f(H/2-4*s)}" r="${f(1.6*s)}" fill="#111"/>
    ${[0,1,2].map(i=>`<path d="M${f(60-8*s+i*10*s)} ${f(H/2-17*s)}q${f(3*s)} ${f(17*s)} 0 ${f(34*s)}" fill="none" stroke="#fff6e0" stroke-width="${f(1.6*s)}" opacity=".85"/>`).join('')}
    ${[0,1,2].map(i=>`<circle cx="${f(60+50*s+i*2)}" cy="${f(H/2-10*s-i*7*s)}" r="${f((1.4+i*.6)*s)}" fill="none" stroke="#e0f6ff" stroke-width="${f(.6*s)}"/>`).join('')}`}},
  {n:'Paper Mountains',k:'abstract',no4:true,d:(H,p,R)=>{const m=H/80;
    const cols=['#ffd6a0','#ffb08a','#f0807a','#c85a7a','#8a3a7a','#4a2a6a'];
    return `${box('#fff2dc',0,H)}<circle cx="86" cy="${f(H*.26)}" r="${f(12*m)}" fill="#ff7a5a"/>
    ${cols.map((c,i)=>{const b=H*(.36+i*.11),a=(6+i)*m;let d=`M0 ${f(H)}V${f(b)}`;for(let x=0;x<=120;x+=10)d+=`L${x} ${f(b-Math.abs(Math.sin(x/17+i*1.3))*a)}`;return`<path d="${d}V${H}Z" fill="${c}"/><path d="${d.replace(`M0 ${f(H)}V`,'M0 ')}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="${f(1.2*m)}" transform="translate(0 ${f(1.2*m)})"/>`}).join('')}
    ${[0,1,2].map(i=>bird(20+i*8,H*.2+i*2*m,m*.8,'#4a2a6a')).join('')}`}}
  ];
})();
