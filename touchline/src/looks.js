/* ===================== PLAYER APPEARANCE: generation, portraits, sprites ===================== */
const LOOK = {
  skin:['#ffe1c9','#f7d2b3','#efc19c','#e5ae86','#d69c72','#c88b5f','#b4774c','#9e643e','#875335','#71442b','#5c3723','#47291a'],
  hairCol:['#100c0a','#2b1a10','#4a2c1a','#6b4325','#8c5b2c','#b4824b','#d9b56a','#efd9a3','#a13e1c','#6f2b17'],
  hairColName:['Black','Dark brown','Brown','Chestnut','Light brown','Dark blonde','Blonde','Platinum','Red','Auburn'],
  eyeCol:{brown:'#5a3a1e',dark:'#2a1a0e',hazel:'#7a6230',green:'#3f7a46',blue:'#3d6fa8',grey:'#6b7884'},
  face:['oval','round','square','long','heart'],
  eyes:['round','almond','narrow','wide','sleepy'],
  brows:['soft','thin','thick','arched','straight'],
  nose:['button','straight','wide','long','hooked'],
  mouth:['neutral','smile','grin','smirk','serious'],
  hair:['buzz','crop','fade','curly','afro','sideswept','spiky','mohawk','long','bun','braids','twists','locs','mullet','bald'],
  facial:['none','stubble','mustache','goatee','chinstrap'],
  boots:['#111111','#f4f4f4','#b6f23f','#ff7a1a','#2f7cf6','#ff4fa3','#e6bd57','#e53935'],
  band:[null,'#ffffff','#111111','#e53935','#2f7cf6','#f5c518'],
  build:['lean','average','stocky'],
  sleeves:['short','long'], ears:['small','normal','big']
};
const LOOK_LABEL={face:'Face shape',eyes:'Eyes',eyeCol:'Eye color',brows:'Eyebrows',nose:'Nose',mouth:'Expression',hair:'Hairstyle',facial:'Facial hair',build:'Build',sleeves:'Sleeves',ears:'Ears'};
const cap=s=>s[0].toUpperCase()+s.slice(1);
function defaultLook(id, grade){
  let h=hashStr('look'+id); const r=()=>{ h=Math.imul(h^(h>>>15),2246822507)>>>0; h=Math.imul(h^(h>>>13),3266489909)>>>0; h^=h>>>16; return (h>>>0)/4294967296; };
  const pk=a=>a[Math.floor(r()*a.length)];
  const skin=Math.floor(r()*LOOK.skin.length);
  const dark=skin>=6;
  const hairPool = dark? ['buzz','crop','fade','curly','afro','braids','twists','locs','fade','buzz','bald','sideswept'] : ['buzz','crop','fade','curly','sideswept','spiky','mohawk','long','bun','mullet','crop','sideswept'];
  let hc = dark ? (r()<0.9?Math.floor(r()*2):Math.floor(r()*4)) : (r()<0.5?Math.floor(r()*4):Math.floor(r()*10));
  const eyeCol = skin<=4&&r()<0.55 ? pk(['blue','green','grey','hazel','brown']) : pk(['brown','dark','brown','hazel']);
  const older=(grade||10)>=11;
  return {skin, face:pk(LOOK.face), eyes:pk(LOOK.eyes), eyeCol, brows:pk(LOOK.brows), nose:pk(LOOK.nose), mouth:pk(LOOK.mouth), hair:pk(hairPool), hairCol:hc,
    facial: older&&r()<0.22 ? pk(['stubble','stubble','mustache','goatee','chinstrap']) : 'none', freckles: skin<=3&&r()<0.25, ears:pk(LOOK.ears),
    band: r()<0.15 ? Math.floor(1+r()*(LOOK.band.length-1)) : 0, boots:Math.floor(r()*LOOK.boots.length), build:pk(['lean','average','average','stocky']), sleeves:r()<0.18?'long':'short', tape:r()<0.3};
}
function lookOf(p){ if(!p) return defaultLook('x',10); if(p.look) return p.look; return defaultLook(p.id,p.grade); }
function randomLook(seed){ return defaultLook(seed+':'+Math.random(), 11); }

/* ----- portrait SVG (0 0 120 140) ----- */
function portraitSVG(p, size=96, kit){
  const L=lookOf(p); const S=LOOK.skin[L.skin]||LOOK.skin[3]; const Sd=_mc(S,'#3a2010',0.22); const Sl=_mc(S,'#ffffff',0.18);
  const H=LOOK.hairCol[L.hairCol]||LOOK.hairCol[0]; const Hd=_mc(H,'#000000',0.3); const Hl=_mc(H,'#ffffff',0.22);
  const sch=p&&App.C?App.C.schools[p.sid]:null; const c1=(kit&&kit.c1)||(sch?sch.c1:'#1d4ed8'), c2=(kit&&kit.c2)||(sch?sch.c2:'#ffffff');
  const id='pt'+Math.random().toString(36).slice(2,7);
  const HEAD={oval:'M60 26C80 26 88 42 88 60C88 80 76 96 60 96C44 96 32 80 32 60C32 42 40 26 60 26Z',round:'M60 28C82 28 90 44 90 62C90 82 78 94 60 94C42 94 30 82 30 62C30 44 38 28 60 28Z',square:'M60 26C80 26 88 38 88 56L87 74C86 86 74 96 60 96C46 96 34 86 33 74L32 56C32 38 40 26 60 26Z',long:'M60 22C78 22 86 38 86 58C86 82 74 100 60 100C46 100 34 82 34 58C34 38 42 22 60 22Z',heart:'M60 26C82 26 90 40 89 56C88 74 74 95 60 98C46 95 32 74 31 56C30 40 38 26 60 26Z'};
  const head=HEAD[L.face]||HEAD.oval; const chin={oval:96,round:94,square:96,long:100,heart:98}[L.face]||96;
  const er={small:4.2,normal:5.2,big:6.6}[L.ears]||5.2;
  // hair layers
  const back={afro:`<circle cx="60" cy="50" r="38" fill="${H}"/><circle cx="60" cy="50" r="38" fill="url(#${id}t)" opacity=".5"/>`,long:`<path d="M30 54C26 80 30 104 38 112L82 112C90 104 94 80 90 54Z" fill="${Hd}"/>`,locs:Array.from({length:9},(_,i)=>`<path d="M${34+i*6.5} 46Q${32+i*6.5} 80 ${34+i*6.8} ${100+(i%3)*6}" stroke="${H}" stroke-width="5.5" stroke-linecap="round" fill="none"/>`).join(''),mullet:`<path d="M34 60C32 82 38 98 44 104L76 104C82 98 88 82 86 60Z" fill="${Hd}"/>`,bun:`<circle cx="60" cy="18" r="10" fill="${H}"/>`}[L.hair]||'';
  const capP='M31 58C30 36 42 22 60 22C78 22 90 36 89 58C86 46 80 38 60 38C40 38 34 46 31 58Z';
  const front={
    buzz:`<path d="${capP}" fill="${H}" opacity=".75"/><path d="${capP}" fill="url(#${id}t)" opacity=".5"/>`,
    crop:`<path d="M30 56C29 34 42 21 60 21C78 21 91 34 90 56C88 46 84 40 76 38C70 42 58 43 46 40C38 42 33 48 30 56Z" fill="${H}"/>`,
    fade:`<path d="M34 46C36 30 46 21 60 21C74 21 84 30 86 46C78 38 70 36 60 36C50 36 42 38 34 46Z" fill="${H}"/><path d="M31 58C31 50 33 46 35 44L35 56Z M89 58C89 50 87 46 85 44L85 56Z" fill="${H}" opacity=".35"/>`,
    curly:Array.from({length:12},(_,i)=>{ const a=Math.PI*(1.05+i*0.083); return `<circle cx="${(60+Math.cos(a)*27).toFixed(1)}" cy="${(52+Math.sin(a)*27).toFixed(1)}" r="8" fill="${i%2?H:Hd}"/>`; }).join('')+`<path d="M36 44C40 30 80 30 84 44C76 38 44 38 36 44Z" fill="${H}"/>`,
    afro:`<path d="M30 50C30 34 44 24 60 24C76 24 90 34 90 50C82 42 72 40 60 40C48 40 38 42 30 50Z" fill="${H}"/>`,
    sideswept:`<path d="M30 58C28 34 42 20 62 20C80 20 92 34 90 54C84 44 76 38 66 38C54 46 40 46 32 50Z" fill="${H}"/><path d="M44 30C56 26 70 28 80 36" stroke="${Hl}" stroke-width="2" fill="none" opacity=".6"/>`,
    spiky:`<path d="M31 56L30 40L36 42L36 28L44 34L46 20L54 30L60 16L66 30L74 20L76 34L84 28L84 42L90 40L89 56C84 44 74 40 60 40C46 40 36 44 31 56Z" fill="${H}"/>`,
    mohawk:`<path d="M52 44L50 14L56 22L60 10L64 22L70 14L68 44Z" fill="${H}"/><path d="${capP}" fill="${H}" opacity=".18"/>`,
    long:`<path d="M30 60C28 34 42 20 60 20C78 20 92 34 90 60C88 48 82 40 72 36C64 44 48 46 38 42C34 46 31 52 30 60Z" fill="${H}"/>`,
    bun:`<path d="${capP}" fill="${H}"/>`,
    braids:`<path d="${capP}" fill="${H}"/>${Array.from({length:6},(_,i)=>`<path d="M${40+i*8} 25Q${42+i*8} 34 ${42+i*7} 42" stroke="${Hl}" stroke-width="1.6" fill="none" opacity=".7"/>`).join('')}`,
    twists:`<path d="${capP}" fill="${H}"/>${Array.from({length:14},(_,i)=>`<ellipse cx="${36+(i%7)*8}" cy="${i<7?30:38}" rx="3.4" ry="5" fill="${i%2?Hd:Hl}"/>`).join('')}`,
    locs:`<path d="${capP}" fill="${H}"/>${Array.from({length:7},(_,i)=>`<path d="M${38+i*7} 28Q${40+i*7} 36 ${38+i*7} 44" stroke="${Hd}" stroke-width="3" fill="none"/>`).join('')}`,
    mullet:`<path d="M31 56C30 34 42 21 60 21C78 21 90 34 89 56C86 46 78 40 60 40C44 40 34 46 31 56Z" fill="${H}"/>`,
    bald:`<ellipse cx="52" cy="36" rx="9" ry="4" fill="#ffffff" opacity=".22"/>`
  }[L.hair]||'';
  // eyes
  const ec=LOOK.eyeCol[L.eyeCol]||LOOK.eyeCol.brown;
  const eye=(x)=>{ const k=L.eyes; const ry={round:4,almond:3.2,narrow:2.3,wide:4.6,sleepy:3.6}[k]||3.6, rx={round:4.6,almond:5.4,narrow:5,wide:5.4,sleepy:5}[k]||5;
    let o = k==='almond' ? `<path d="M${x-rx} 60Q${x} ${60-ry*1.8} ${x+rx} 60Q${x} ${60+ry*1.3} ${x-rx} 60Z" fill="#fbfbf7"/>` : `<ellipse cx="${x}" cy="60" rx="${rx}" ry="${ry}" fill="#fbfbf7"/>`;
    o+=`<circle cx="${x}" cy="60.3" r="${Math.min(2.9,ry*0.85)}" fill="${ec}"/><circle cx="${x}" cy="60.3" r="1.3" fill="#111"/><circle cx="${x+0.9}" cy="59.3" r=".7" fill="#fff"/>`;
    if(k==='sleepy') o+=`<path d="M${x-rx-0.5} 59.5Q${x} ${55.2} ${x+rx+0.5} 59.5L${x+rx+0.5} 56L${x-rx-0.5} 56Z" fill="${S}"/><path d="M${x-rx} 59.5Q${x} 56 ${x+rx} 59.5" stroke="${Sd}" stroke-width="1" fill="none"/>`;
    return o; };
  const bw={thin:1.3,soft:2.2,thick:3.6,arched:2.4,straight:2.6}[L.brows]||2.2; const bc=_mc(H,'#000000',0.15);
  const brow=(x,m)=> L.brows==='arched'? `M${x-6*m} 54Q${x} 47.5 ${x+6*m} 53` : L.brows==='straight'? `M${x-6} 52.5L${x+6} 52.5` : `M${x-6*m} 54Q${x} 50.5 ${x+6*m} 52.5`;
  const nose={button:`<path d="M58 72Q60 74.5 62 72" stroke="${Sd}" stroke-width="1.6" fill="none"/>`,straight:`<path d="M59 62L57.5 71Q60 73.5 62.5 71" stroke="${Sd}" stroke-width="1.5" fill="none"/>`,wide:`<path d="M60 63L57 70M54.5 71.5Q60 75.5 65.5 71.5" stroke="${Sd}" stroke-width="1.6" fill="none"/>`,long:`<path d="M60 60L58 74Q60 76 62.5 74" stroke="${Sd}" stroke-width="1.5" fill="none"/>`,hooked:`<path d="M59 61Q63 68 61 73Q59 74 57 72.5" stroke="${Sd}" stroke-width="1.6" fill="none"/>`}[L.nose];
  const my=chin-14;
  const mouth={neutral:`<path d="M53 ${my}Q60 ${my+1.5} 67 ${my}" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round"/>`,smile:`<path d="M52 ${my-1}Q60 ${my+6} 68 ${my-1}" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,grin:`<path d="M51 ${my-1.5}Q60 ${my+8} 69 ${my-1.5}Z" fill="#5a2018"/><path d="M52.5 ${my-0.8}Q60 ${my+2.6} 67.5 ${my-0.8}Z" fill="#fff"/>`,smirk:`<path d="M53 ${my+0.5}Q61 ${my+2} 68 ${my-2.5}" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,serious:`<path d="M53 ${my+1}Q60 ${my-1.5} 67 ${my+1}" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`}[L.mouth];
  const facial={none:'',stubble:`<path d="M36 72C38 88 48 ${chin} 60 ${chin}C72 ${chin} 82 88 84 72C78 84 70 ${chin-6} 60 ${chin-6}C50 ${chin-6} 42 84 36 72Z" fill="${H}" opacity=".28"/><path d="M50 ${my-5}Q60 ${my-8} 70 ${my-5}" stroke="${H}" stroke-width="2.5" opacity=".25" fill="none"/>`,mustache:`<path d="M50 ${my-4}Q60 ${my-9} 70 ${my-4}Q65 ${my-3} 60 ${my-5}Q55 ${my-3} 50 ${my-4}Z" fill="${H}"/>`,goatee:`<path d="M54 ${my+4}Q60 ${chin+3} 66 ${my+4}Q60 ${my+7} 54 ${my+4}Z" fill="${H}"/><path d="M52 ${my-4}Q60 ${my-8} 68 ${my-4}" stroke="${H}" stroke-width="2.4" fill="none"/>`,chinstrap:`<path d="M34 66C36 86 48 ${chin+1} 60 ${chin+1}C72 ${chin+1} 84 86 86 66" stroke="${H}" stroke-width="3.5" fill="none"/>`}[L.facial]||'';
  const frk=L.freckles? [[44,68],[47,70],[50,67],[70,68],[73,70],[76,67],[46,73],[74,73]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="${_mc(S,'#7a3a1a',0.5)}"/>`).join(''):'';
  const band=LOOK.band[L.band]?`<path d="M30.5 46C40 40 80 40 89.5 46L89 52C80 46 40 46 31 52Z" fill="${LOOK.band[L.band]}"/>`:'';
  const nm=p&&p.num!=null?p.num:'';
  const tc=_dist(c1,c2)<80?(_lum(c1)>.4?'#111':'#fff'):c2;
  return `<svg class="portrait" width="${size}" height="${(size*140/120).toFixed(0)}" viewBox="0 0 120 140" role="img" aria-label="Portrait of ${esc(p?pname(p):'player')}"><defs><pattern id="${id}t" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".9" fill="#000" opacity=".35"/></pattern><radialGradient id="${id}f" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${Sl}"/><stop offset="1" stop-color="${S}"/></radialGradient></defs>
   ${back}
   <path d="M10 140C14 112 34 104 60 104C86 104 106 112 110 140Z" fill="${c1}"/><path d="M10 140C14 112 34 104 60 104C86 104 106 112 110 140" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
   <path d="M49 86L49 104C52 110 68 110 71 104L71 86Z" fill="${Sd}"/><path d="M46 104L60 120L74 104" stroke="${tc}" stroke-width="4" fill="none" stroke-linejoin="round"/>
   <text x="60" y="136" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="13" fill="${tc}">${esc(nm)}</text>
   <ellipse cx="${31}" cy="63" rx="${er}" ry="${er*1.5}" fill="${S}"/><ellipse cx="${89}" cy="63" rx="${er}" ry="${er*1.5}" fill="${S}"/><ellipse cx="31" cy="63" rx="${er*0.45}" ry="${er*0.8}" fill="${Sd}" opacity=".5"/><ellipse cx="89" cy="63" rx="${er*0.45}" ry="${er*0.8}" fill="${Sd}" opacity=".5"/>
   <path d="${head}" fill="url(#${id}f)"/><path d="${head}" fill="none" stroke="${Sd}" stroke-width="1" opacity=".6"/>
   <ellipse cx="44" cy="72" rx="6" ry="3.5" fill="#e88" opacity=".14"/><ellipse cx="76" cy="72" rx="6" ry="3.5" fill="#e88" opacity=".14"/>
   ${frk}${eye(48)}${eye(72)}<path d="${brow(48,1)}" stroke="${bc}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="${brow(72,1)}" stroke="${bc}" stroke-width="${bw}" fill="none" stroke-linecap="round" transform="translate(144 0) scale(-1 1)"/>
   ${nose}${facial}${mouth}${front}${band}</svg>`;
}
function hairColOf(L){ return LOOK.hairCol[L.hairCol]||LOOK.hairCol[0]; }
function skinOf(L){ return LOOK.skin[L.skin]||LOOK.skin[3]; }
