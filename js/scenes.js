'use strict';
/* ====================== menu scenery ======================
   One illustrated backdrop per menu screen (home: twilight floating islands, map: an enchanted valley, shop: sunset lake),
   drawn once as inline SVG into a fixed layer behind the screens. Only the Levels scene moves, through a separate layer of
   transform/opacity animations (SCENES.fx.map) that the compositor runs without repainting the picture; the
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

  /* Levels: an enchanted valley at night. Static here; js/scenes.js adds MAPFX (aurora, stars, fireflies...) on top */
  const pine=(x,y,h,c)=>`<path d="M${x} ${y-h}L${x+h*.28} ${y-h*.45}H${x+h*.14}L${x+h*.36} ${y}H${x-h*.36}L${x-h*.14} ${y-h*.45}H${x-h*.28}Z" fill="${c}"/>`;
  const crystal=(x,y,s,g)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 0L-12 -70L0 -95L10 -60L8 0Z" fill="url(#${g})"/><path d="M4 0L18 -50L30 -62L34 -30L26 0Z" fill="url(#${g})" opacity=".85"/><path d="M-30 0L-34 -32L-24 -44L-14 -8Z" fill="url(#${g})" opacity=".8"/><path d="M-12 -70L0 -95L-4 -40Z" fill="#fff" opacity=".5"/><path d="M18 -50L30 -62L24 -20Z" fill="#fff" opacity=".3"/></g>`;
  const shroom=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-16" r="22" fill="url(#gm)"/><rect x="-2.5" y="-14" width="5" height="14" rx="2" fill="#e8dcff"/><path d="M-11 -13Q0 -28 11 -13Z" fill="${c}"/><circle cx="-4" cy="-18" r="1.6" fill="#fff" opacity=".8"/><circle cx="4" cy="-16" r="1.2" fill="#fff" opacity=".7"/></g>`;
  const castle=(x,y)=>`<g transform="translate(${x} ${y})" fill="#24154f"><rect x="-34" y="-40" width="68" height="40"/><rect x="-46" y="-70" width="16" height="70"/><rect x="30" y="-62" width="16" height="62"/><rect x="-10" y="-92" width="20" height="60"/>
    <path d="M-50 -70L-38 -96L-26 -70ZM26 -62L38 -86L50 -62ZM-14 -92L0 -124L14 -92Z"/><rect x="-1" y="-140" width="2" height="18"/><path d="M1 -140L14 -135L1 -130Z" fill="#ff7ab0"/>
    ${[[-38,-56],[38,-48],[0,-76],[-18,-24],[18,-24],[0,-22]].map(([a,b])=>`<rect x="${a-2.5}" y="${b-4}" width="5" height="8" rx="2.5" fill="#ffd27a"/>`).join('')}<circle cx="0" cy="-40" r="70" fill="url(#gl)" opacity=".35"/></g>`;
  const map=svg(defs(`<linearGradient id="ms" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090622"/><stop offset=".35" stop-color="#1d1252"/><stop offset=".55" stop-color="#46226e"/><stop offset=".66" stop-color="#8a3c7c"/><stop offset=".67" stop-color="#2b1a62"/><stop offset="1" stop-color="#0c0828"/></linearGradient>
    <linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaff" stop-opacity=".95"/><stop offset="1" stop-color="#7fd8ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="cc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8fbff"/><stop offset=".5" stop-color="#4fc8ff"/><stop offset="1" stop-color="#3a5ae0"/></linearGradient>
    <linearGradient id="cm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0ff"/><stop offset=".5" stop-color="#d06aff"/><stop offset="1" stop-color="#6a2ad0"/></linearGradient>
    <radialGradient id="mh"><stop offset="0" stop-color="#ffe9c8" stop-opacity=".55"/><stop offset=".35" stop-color="#ffb8e0" stop-opacity=".18"/><stop offset="1" stop-color="#ffb8e0" stop-opacity="0"/></radialGradient>
    <radialGradient id="mo" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf0"/><stop offset=".7" stop-color="#ffeec4"/><stop offset="1" stop-color="#ffd9a0"/></radialGradient>
    <radialGradient id="gm"><stop offset="0" stop-color="#ff8ad8" stop-opacity=".55"/><stop offset="1" stop-color="#ff8ad8" stop-opacity="0"/></radialGradient>
    <linearGradient id="lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3a9a" stop-opacity=".55"/><stop offset="1" stop-color="#6a3a9a" stop-opacity="0"/></linearGradient>`)+
    `<rect width="1200" height="900" fill="url(#ms)"/>${stars(90,560,3)}
    <circle cx="700" cy="190" r="230" fill="url(#mh)"/>
    <path d="M0 520L80 440L150 480L240 380L330 470L410 410L470 440L540 360L620 450L700 400L790 470L860 390L950 460L1040 380L1120 450L1200 410V603H0Z" fill="#3b2272"/>
    <path d="M240 380L270 410L255 408L262 430L240 400L222 425ZM1040 380L1066 410L1050 408L1058 428L1040 400L1022 422Z" fill="#c9b8ff" opacity=".35"/>
    ${castle(540,368)}
    <path d="M0 560L110 500L200 540L300 490L420 548L520 515L640 556L760 505L880 552L980 500L1100 545L1200 515V603H0Z" fill="#2a1858"/>
    ${[...Array(26)].map((_,k)=>pine(20+k*46+r(k,9)*20,600-r(k,8)*14,40+r(k,7)*36,'#1c1044')).join('')}
    ${lights([[205,296,.7],[985,244,.8],[1030,246,.7],[534,560,.6],[300,585,.6],[880,588,.6]])}
    <rect x="0" y="603" width="1200" height="120" fill="url(#lk)"/>
    <path d="M0 603H1200" stroke="#ff9ad0" stroke-width="2" opacity=".35"/>
    <path d="M0 0H250L220 130L270 280L200 440L250 640L190 900H0Z" fill="#241650"/><path d="M1200 0H950L990 150L930 310L1000 470L940 660L1010 900H1200Z" fill="#241650"/>
    <path d="M0 0H150L120 170L170 340L100 530L140 900H0Z" fill="#170d3a"/><path d="M1200 0H1060L1090 190L1040 370L1100 550L1050 900H1200Z" fill="#170d3a"/>
    ${island(230,300,150,1)}${island(1000,250,190,1)}${island(860,430,80,0,'#5a4a8a','#33285e')}${island(380,190,70,0,'#5a4a8a','#33285e')}
    ${[[170,650,1.6,'cc'],[100,740,1,'cm'],[1030,620,1.7,'cm'],[1100,720,1.1,'cc'],[60,430,.9,'cc'],[1150,390,1,'cm']].map(([x,y,s,g])=>crystal(x,y,s,g)).join('')}
    <path d="M0 790Q150 760 300 785T600 780T900 790T1200 776V900H0Z" fill="#140a34"/>
    ${[[300,800,1.2,'#ff6ab8'],[340,812,.8,'#c86aff'],[480,820,1,'#ff6ab8'],[760,812,1.1,'#c86aff'],[820,822,.75,'#ff6ab8'],[930,800,1.2,'#ff6ab8'],[600,834,.8,'#c86aff']].map(([x,y,s,c])=>shroom(x,y,s,c)).join('')}
    <path d="M0 850Q120 828 240 848T480 845T720 852T960 842T1200 850V900H0Z" fill="#0a0620"/>
    ${[...Array(30)].map((_,k)=>{const x=k*41+r(k,4)*20,h=14+r(k,5)*22;return`<path d="M${x} 852Q${x-4} ${852-h*.6} ${x-8} ${852-h}M${x+4} 852Q${x+6} ${852-h*.7} ${x+12} ${852-h*.85}" stroke="#0a0620" stroke-width="4" fill="none" stroke-linecap="round"/>`}).join('')}`);
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
  /* the moving parts of the Levels scene: HTML layers on a 1200 x 900 "sfx" stage that lines up with the SVG (same slice fit),
     animated with transform and opacity only so the compositor does all the work */
  const P=(x,y)=>`left:${(x/12).toFixed(2)}%;top:${(y/9).toFixed(2)}%`;
  const brightStars=seed=>`<svg viewBox="0 0 1200 560" preserveAspectRatio="none">${Array.from({length:22},(_,i)=>{const x=(r(i,seed)*1200).toFixed(0),y=(r(i,seed+1)*520).toFixed(0),k=(1.4+r(i,seed+2)*1.8).toFixed(1);
    return`<path d="M${x} ${y-k*3}L${+x+k*.6} ${y-k*.6}L${+x+k*3} ${y}L${+x+k*.6} ${+y+k*.6}L${x} ${+y+k*3}L${x-k*.6} ${+y+k*.6}L${x-k*3} ${y}L${x-k*.6} ${y-k*.6}Z" fill="#fff"/>`}).join('')}</svg>`;
  const ribbon=(id,c1,c2,d)=>`<svg viewBox="0 0 1200 300" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".3" stop-color="${c1}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${id}m"><rect width="1200" height="300" fill="url(#${id}v)"/></mask><filter id="${id}b" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>
    <path d="${d}" fill="url(#${id})" mask="url(#${id}m)" filter="url(#${id}b)"/></svg>`;
  const cloud=`<svg viewBox="0 0 300 90"><path d="M20 70Q10 46 40 44Q44 18 80 24Q100 2 136 16Q170 0 190 28Q230 20 236 46Q280 44 272 70Z" fill="#c8b4ff"/></svg>`;
  const flyPts=[[330,420],[420,560],[520,690],[610,470],[680,620],[760,720],[850,540],[930,660],[460,760],[640,780],[300,660],[900,780],[560,600],[740,420],[200,560],[1000,560],[380,350],[820,330]];
  const mapFx=`<div class="sfx">
    <div class="aur a1" style="${P(0,40)}">${ribbon('ra','#5dffc0','#4fc8ff','M0 170C200 80 380 220 600 140S980 60 1200 150L1200 230C980 150 800 250 600 220S200 170 0 250Z')}</div>
    <div class="aur a2" style="${P(0,10)}">${ribbon('rb','#c77dff','#ff7ab8','M0 120C240 200 420 60 640 130S1000 210 1200 100L1200 170C1000 260 820 180 620 200S220 250 0 190Z')}</div>
    <div class="tw t1">${brightStars(21)}</div><div class="tw t2">${brightStars(37)}</div>
    <div class="halo" style="${P(470,-40)}"></div>
    <div class="moon" style="${P(640,130)};width:10%"><svg viewBox="0 0 120 120"><defs><radialGradient id="mo2" cx=".4" cy=".35"><stop offset="0" stop-color="#fffdf0"/><stop offset=".7" stop-color="#ffeec4"/><stop offset="1" stop-color="#ffd9a0"/></radialGradient></defs><circle cx="60" cy="60" r="56" fill="url(#mo2)"/><circle cx="42" cy="46" r="9" fill="#f0d9a8" opacity=".55"/><circle cx="78" cy="76" r="6" fill="#f0d9a8" opacity=".5"/><circle cx="66" cy="38" r="4" fill="#f0d9a8" opacity=".45"/></svg></div>
    <i class="shoot s1" style="${P(900,60)}"></i><i class="shoot s2" style="${P(560,30)}"></i>
    <div class="cl c1" style="${P(140,250)}">${cloud}</div><div class="cl c2" style="${P(700,330)}">${cloud}</div><div class="cl c3" style="${P(420,120)}">${cloud}</div>
    <div class="fall" style="${P(246,304)};width:${(150*.07/12).toFixed(2)}%;height:${(150*.9/9).toFixed(2)}%"><b></b></div>
    <div class="fall" style="${P(1020,254)};width:${(190*.07/12).toFixed(2)}%;height:${(190*.9/9).toFixed(2)}%"><b></b></div>
    ${[0,1,2,3,4,5,6].map(i=>`<i class="glint" style="${P(700-(70-i*8),618+i*20)};width:${((70-i*8)*2/12).toFixed(2)}%;animation-delay:${-i*.7}s"></i>`).join('')}
    ${[[170,570,1.6],[1030,540,1.7],[100,710,1],[1100,690,1.1],[60,410,.9],[1150,370,1]].map(([x,y,s],i)=>`<i class="cglow" style="${P(x,y)};--s:${s};animation-delay:${-i*1.3}s"></i>`).join('')}
    <div class="mist m1"></div><div class="mist m2"></div>
    ${flyPts.map(([x,y],i)=>`<i class="ff" style="${P(x,y)};--dx:${(18+r(i,51)*40).toFixed(0)}px;--dy:${(14+r(i,52)*30).toFixed(0)}px;animation-duration:${(9+r(i,53)*8).toFixed(1)}s,${(2.4+r(i,54)*2.4).toFixed(1)}s;animation-delay:${(-r(i,55)*12).toFixed(1)}s,${(-r(i,56)*4).toFixed(1)}s"></i>`).join('')}
  </div>`;
  return{home,map,shop,fx:{map:mapFx}};
})();
/* the scene layer follows the active screen; play has none (its own background canvas shows there) */
const Scene=(()=>{
  const el_=document.createElement('div');el_.id='scene';el_.setAttribute('aria-hidden','true');
  const bg=document.getElementById('bg');bg.after(el_);
  const made={};
  function show(id){
    if(id==='jig')id='map';   // the Jigsaw hub shares the Levels scene
    const k=SCENES[id]&&id!=='fx'?id:null;
    for(const n in made)made[n].classList.toggle('on',n===k);
    if(k&&!made[k]){const d=document.createElement('div');d.className='scn on';d.innerHTML=SCENES[k].replace(/id="(\w+)"/g,`id="${k}-$1"`).replace(/url\(#(\w+)\)/g,`url(#${k}-$1)`);/* ids unique per scene */if(SCENES.fx[k])d.insertAdjacentHTML('beforeend',`<div class="fx">${SCENES.fx[k]}</div>`);el_.appendChild(d);made[k]=d}
    el_.classList.toggle('on',!!k);
    /* the canvas is hidden behind a scene, and a jigsaw board covers the screen: draw it once and stop */
    if(typeof BG!=='undefined'&&BG.setStill)BG.setStill(!!k||(id==='play'&&typeof cur!=='undefined'&&!!cur&&!!cur.jig));   // the canvas is hidden behind the scene: draw it once and stop
  }
  return{show};
})();
