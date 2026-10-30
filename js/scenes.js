'use strict';
/* ====================== menu scenery ======================
   One static illustrated backdrop per menu screen (home: twilight floating islands, map: crystal caves, shop: sunset lake),
   drawn once as inline SVG into a fixed layer behind the screens. Nothing here animates: a menu costs one paint, and the
   animated canvas background (BG in fx.js) is told to stand still while a scene covers it.
   Each scene is 1200 x 900 and anchored to the bottom (xMidYMax slice): phones see the middle third, desktops the whole width,
   so every scene keeps its main features in the middle. */
const SCENES=(()=>{
  const r=(n,s=1)=>{let x=Math.sin(n*12.9898+s*78.233)*43758.5453;return x-Math.floor(x)};   // a fixed pseudo-random, so scenes never change
  const stars=(n,h,seed)=>Array.from({length:n},(_,i)=>`<circle cx="${(r(i,seed)*1200).toFixed(0)}" cy="${(r(i,seed+1)*h).toFixed(0)}" r="${(.6+r(i,seed+2)*1.4).toFixed(1)}" fill="#fff" opacity="${(.25+r(i,seed+3)*.6).toFixed(2)}"/>`).join('');
  const lights=(pts,c='#ffcf7a')=>pts.map(([x,y,s=1])=>`<circle cx="${x}" cy="${y}" r="${9*s}" fill="url(#gl)" opacity=".8"/><rect x="${x-2.2*s}" y="${y-3*s}" width="${4.4*s}" height="${6*s}" rx="1" fill="${c}"/>`).join('');
  const flies=(n,y0,y1,seed)=>Array.from({length:n},(_,i)=>{const x=(r(i,seed)*1200).toFixed(0),y=(y0+r(i,seed+1)*(y1-y0)).toFixed(0);return`<circle cx="${x}" cy="${y}" r="10" fill="url(#gf)"/><circle cx="${x}" cy="${y}" r="2" fill="#fff8c0"/>`}).join('');
  const defs=extra=>`<defs>
    <radialGradient id="gl"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
    <radialGradient id="gf"><stop offset="0" stop-color="#fff3a0" stop-opacity=".85"/><stop offset="1" stop-color="#fff3a0" stop-opacity="0"/></radialGradient>${extra}</defs>`;
  const svg=(body)=>`<svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${body}</svg>`;
  /* a floating rock island with grass on top and a waterfall */
  const island=(x,y,w,fall,c1='#4a3a7a',c2='#2a1f4e')=>`<g transform="translate(${x} ${y})">
    <path d="M${-w/2} 0Q${-w*.3} ${w*.55} 0 ${w*.8}Q${w*.32} ${w*.5} ${w/2} 0Z" fill="${c2}"/><path d="M${-w/2} 0Q${-w*.2} ${w*.35} ${w*.1} ${w*.45}Q${w*.3} ${w*.25} ${w/2} 0Z" fill="${c1}"/>
    <path d="M${-w/2-4} 2Q0 ${-w*.12} ${w/2+4} 2Q0 ${w*.06} ${-w/2-4} 2Z" fill="#3f8a5a"/>
    ${fall?`<rect x="${w*.12}" y="4" width="${w*.07}" height="${w*.9}" fill="url(#wf)" opacity=".75"/>`:''}</g>`;

  const home=svg(defs(`<linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1240"/><stop offset=".55" stop-color="#3d1f6e"/><stop offset="1" stop-color="#6a3a8e"/></linearGradient>
    <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#bfe8ff" stop-opacity="0"/></linearGradient>
    <radialGradient id="hm"><stop offset="0" stop-color="#ffd6f0" stop-opacity=".5"/><stop offset="1" stop-color="#ffd6f0" stop-opacity="0"/></radialGradient>`)+
    `<rect width="1200" height="900" fill="url(#hs)"/>${stars(70,420,1)}<circle cx="820" cy="150" r="190" fill="url(#hm)"/><circle cx="820" cy="150" r="38" fill="#ffe9f6" opacity=".9"/>
    <path d="M0 560L90 470L170 520L260 430L360 500L440 450L520 520L600 470L700 520L790 440L880 500L980 430L1080 490L1200 450V900H0Z" fill="#4d2a7a" opacity=".85"/>
    <path d="M0 620L120 560L230 600L330 545L460 610L560 570L660 615L780 560L900 610L1020 565L1120 600L1200 580V900H0Z" fill="#3a1f62"/>
    ${island(140,330,170,1)}${island(1060,300,190,1)}${island(330,250,90,0,'#5a4a8a','#33285e')}${island(900,240,80,0,'#5a4a8a','#33285e')}
    ${lights([[120,520],[205,540],[980,505],[1050,530,1.2],[450,575,.8],[760,580,.8]])}
    <path d="M0 760Q80 700 160 740T320 730T480 760T640 740T800 760T960 735T1120 755T1200 740V900H0Z" fill="#221142"/>
    <path d="M0 820Q100 780 200 810T400 800T600 820T800 805T1000 820T1200 805V900H0Z" fill="#160a2e"/>
    ${[[60,800],[250,812],[950,808],[1140,800],[420,830],[780,828]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><path d="M0 0Q-14 -40 -30 -60M0 0Q4 -50 -2 -78M0 0Q16 -38 32 -58" stroke="#2c1a4e" stroke-width="7" fill="none" stroke-linecap="round"/>${[[-30,-60],[-2,-78],[32,-58]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="8" fill="${['#ff8fd0','#ffd166','#b98bff'][i%3]}" opacity=".85"/>`).join('')}</g>`).join('')}
    ${flies(14,560,860,7)}`);

  const map=svg(defs(`<linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c33"/><stop offset=".6" stop-color="#241a5e"/><stop offset="1" stop-color="#1a1048"/></linearGradient>
    <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd8ff" stop-opacity=".9"/><stop offset="1" stop-color="#7fd8ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="cc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bff4ff"/><stop offset=".5" stop-color="#4fc8ff"/><stop offset="1" stop-color="#3a5ae0"/></linearGradient>
    <linearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6ff"/><stop offset=".5" stop-color="#d06aff"/><stop offset="1" stop-color="#6a2ad0"/></linearGradient>
    <radialGradient id="cg"><stop offset="0" stop-color="#7fd0ff" stop-opacity=".45"/><stop offset="1" stop-color="#7fd0ff" stop-opacity="0"/></radialGradient>`)+
    `<rect width="1200" height="900" fill="url(#ms)"/>${stars(26,500,3)}
    <path d="M0 0H300L270 120L320 260L250 420L300 600L230 900H0Z" fill="#2a1f5a"/><path d="M1200 0H900L940 140L880 300L950 460L890 640L960 900H1200Z" fill="#2a1f5a"/>
    <path d="M0 0H200L170 160L220 330L150 520L190 900H0Z" fill="#1c1442"/><path d="M1200 0H1010L1040 180L990 360L1050 540L1000 900H1200Z" fill="#1c1442"/>
    <rect x="232" y="260" width="22" height="640" fill="url(#wf)" opacity=".55"/><rect x="940" y="300" width="26" height="600" fill="url(#wf)" opacity=".55"/>
    ${[[170,640,1.6,'cc'],[110,720,1,'cm'],[1020,600,1.7,'cm'],[1090,700,1.1,'cc'],[300,780,.8,'cm'],[880,800,.9,'cc'],[60,420,.9,'cc'],[1140,380,1,'cm']].map(([x,y,s,g])=>`<circle cx="${x}" cy="${y-30*s}" r="${90*s}" fill="url(#cg)"/><g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 0L-12 -70L0 -95L10 -60L8 0Z" fill="url(#${g})"/><path d="M4 0L18 -50L30 -62L34 -30L26 0Z" fill="url(#${g})" opacity=".85"/><path d="M-30 0L-34 -32L-24 -44L-14 -8Z" fill="url(#${g})" opacity=".8"/><path d="M-12 -70L0 -95L-4 -40Z" fill="#fff" opacity=".45"/></g>`).join('')}
    <path d="M0 820Q200 790 400 812T800 808T1200 815V900H0Z" fill="#120a30"/>${flies(10,300,860,11)}`);

  const shop=svg(defs(`<linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26164f"/><stop offset=".45" stop-color="#7a3a8a"/><stop offset=".62" stop-color="#ff9a6a"/><stop offset=".66" stop-color="#ffc08a"/></linearGradient>
    <linearGradient id="sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a8a"/><stop offset="1" stop-color="#2a1748"/></linearGradient>
    <radialGradient id="sg"><stop offset="0" stop-color="#ffe0a0" stop-opacity=".75"/><stop offset="1" stop-color="#ffe0a0" stop-opacity="0"/></radialGradient>`)+
    `<rect width="1200" height="600" fill="url(#ss)"/>${stars(30,260,5)}<circle cx="600" cy="560" r="240" fill="url(#sg)"/><circle cx="600" cy="585" r="70" fill="#ffd27a"/>
    <path d="M0 600L60 470L120 520L170 380L240 460L300 600Z" fill="#3a1f5a"/><path d="M1200 600L1150 440L1090 500L1040 360L980 460L900 600Z" fill="#3a1f5a"/>
    <path d="M0 600L40 540L90 560L130 500L200 600Z" fill="#2a1546"/><path d="M1200 600L1160 520L1110 550L1070 490L1000 600Z" fill="#2a1546"/>
    <rect y="596" width="1200" height="304" fill="url(#sw)"/>${[0,1,2,3,4,5].map(i=>`<rect x="${600-(140-i*18)}" y="${612+i*16}" width="${2*(140-i*18)}" height="5" rx="2.5" fill="#ffd9a0" opacity="${(.7-i*.1).toFixed(2)}"/>`).join('')}
    ${lights([[160,540],[230,500,1.2],[1050,520],[1110,560],[300,575,.8],[940,570,.8]])}
    <path d="M0 900V760Q60 720 120 760Q170 700 230 750Q290 690 340 760L360 900Z" fill="#1c0e34"/><path d="M1200 900V750Q1140 710 1090 755Q1030 700 980 750Q930 700 880 770L860 900Z" fill="#1c0e34"/>
    ${[[80,740],[200,720],[300,745],[1100,730],[990,720],[900,750]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="11" fill="${['#ff8fd0','#ff6ab0','#ffb3e0'][i%3]}" opacity=".9"/><circle cx="${x}" cy="${y}" r="4" fill="#ffd166"/>`).join('')}
    ${flies(10,460,820,13)}`);
  return{home,map,shop};
})();
/* the scene layer follows the active screen; play has none (its own background canvas shows there) */
const Scene=(()=>{
  const el_=document.createElement('div');el_.id='scene';el_.setAttribute('aria-hidden','true');
  const bg=document.getElementById('bg');bg.after(el_);
  const made={};
  function show(id){
    const k=SCENES[id]?id:null;
    for(const n in made)made[n].classList.toggle('on',n===k);
    if(k&&!made[k]){const d=document.createElement('div');d.className='scn on';d.innerHTML=SCENES[k].replace(/id="(\w+)"/g,`id="${k}-$1"`).replace(/url\(#(\w+)\)/g,`url(#${k}-$1)`);/* ids unique per scene */el_.appendChild(d);made[k]=d}
    el_.classList.toggle('on',!!k);
    if(typeof BG!=='undefined'&&BG.setStill)BG.setStill(!!k);   // the canvas is hidden behind the scene: draw it once and stop
  }
  return{show};
})();
