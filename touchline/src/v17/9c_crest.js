/* ===================== v18.17 CREST STUDIO (core) =====================
   A school crest is {sh: shape, fd: field, em: emblem (mascot key), rb: ribbon text} drawn by crest(), so it carries to every
   place a crest already appears (schedule, tables, State Poll, the pitch and stadium in 3-D ...). Your school keeps the classic
   shield until you edit it in the Crest Studio (s.crest); every other school, including the State Poll schools, gets a seeded
   design from its id and the career seed. Small sizes drop the emblem and keep the shape and field; the ribbon shows from 64 px.
   Identifiers v1817c / V1817C. */
const V1817C={
  SH:{shield:'M50 3 93 14v41c0 30-20 47-43 57C27 102 7 85 7 55V14z',heater:'M8 6H92V46C92 78 72 98 50 110C28 98 8 78 8 46Z',round:'M3 57a47 47 0 1 0 94 0a47 47 0 1 0 -94 0Z',hex:'M50 4L93 29V85L50 110L7 85V29Z',diamond:'M50 3L97 57L50 111L3 57Z',banner:'M9 5H91V86L50 110L9 86Z'},
  SHN:{shield:'Shield',heater:'Heater',round:'Roundel',hex:'Hexagon',diamond:'Diamond',banner:'Banner'},
  FD:['classic','solid','split','chevron','bend','pales'], FDN:{classic:'Classic',solid:'Solid',split:'Split',chevron:'Chevron',bend:'Diagonal',pales:'Stripes'},
  CLIP:'\u0002', n:0 };
const v1817cR=(...k)=>rngFrom(hashStr(['crest',...k].join('|')));
function v1817cWpick(r,list){ const t=list.reduce((a,x)=>a+x[1],0); let v=r()*t; for(const [k,w] of list){ v-=w; if(v<=0) return k; } return list[0][0]; }
/* the design a school wears */
function v1817cDef(s){ const mk=s.mk||mascotKeyFor(s.mascot); const d=s.crest; if(d) return {sh:V1817C.SH[d.sh]?d.sh:'shield',fd:V1817C.FD.includes(d.fd)?d.fd:'classic',em:d.em&&MASCOT_BY[d.em]?d.em:mk,rb:String(d.rb||'').slice(0,14)};
  const C=App&&App.C; if(C&&s.id===C.userSid) return {sh:'shield',fd:'classic',em:mk,rb:''};
  const r=v1817cR(C?C.seed:'',s.vid||s.id||s.town||'');
  return {sh:v1817cWpick(r,[['shield',38],['heater',20],['round',12],['hex',12],['banner',10],['diamond',8]]),fd:v1817cWpick(r,[['classic',16],['solid',22],['chevron',20],['split',16],['bend',14],['pales',12]]),em:mk,rb:r()<0.45?'EST '+(1888+Math.floor(r()*92)):''}; }
function v1817cSig(d){ return d.sh+'.'+d.fd+'.'+d.em+'.'+d.rb; }
function v1817cField(fd,A,B,dark){
  if(fd==='classic') return `<rect width="100" height="115" fill="${dark}"/>`;
  if(fd==='solid') return `<rect width="100" height="115" fill="${A}"/>`;
  if(fd==='split') return `<rect width="100" height="115" fill="${A}"/><rect x="50" width="50" height="115" fill="${B}"/>`;
  if(fd==='chevron') return `<rect width="100" height="115" fill="${A}"/><polygon points="0 60 50 86 100 60 100 115 0 115" fill="${B}"/><polygon points="0 74 50 100 100 74 100 115 0 115" fill="${A}" opacity=".9"/>`;
  if(fd==='bend') return `<rect width="100" height="115" fill="${A}"/><polygon points="100 8 100 115 0 115 0 108" fill="${B}"/>`;
  return `<rect width="100" height="115" fill="${A}"/>${[12,40,68].map(x=>`<rect x="${x}" width="14" height="115" fill="${B}"/>`).join('')}`; }
/* the markup (ids: V17_ID for the mascot filter, V1817C.CLIP for the clip path) */
function v1817cBuild(s,size,d,mode){ const P=mascotPalette(s.c1,s.c2); const dark=_mc(P.P,'#05070b',0.66); const path=V1817C.SH[d.sh];
  const showEm=size>=28; const showRb=!!d.rb&&size>=64; const art=showEm?mascotInner(d.em,s.c1,s.c2,true):'';
  const inner=!showEm?'':mode==='l'?art:`${mode==='i'?`<defs>${mascotFilter(V17_ID,P)}</defs>`:''}<g filter="url(#${V17_ID})">${art}</g>`;
  const emT=showRb?'translate(18 7) scale(.64)':d.sh==='round'||d.sh==='diamond'?'translate(17 20) scale(.66)':'translate(13 15) scale(.74)';
  const rb=showRb?`<g><path d="M6 81H94L91 97H9Z" fill="#f2ead6" stroke="${_mc(P.P,'#000',0.35)}" stroke-width="1.6" stroke-linejoin="round"/><text x="50" y="93.4" text-anchor="middle" font-family="'Big Shoulders Display',Oswald,'Arial Narrow',sans-serif" font-weight="900" font-size="${d.rb.length>10?10.5:12.5}" letter-spacing="1.2" fill="#1b1712">${esc(d.rb.toUpperCase())}</text></g>`:'';
  return `<svg class="crest v1817c" width="${size}" height="${(size*1.15).toFixed(1)}" viewBox="0 0 100 115" role="img" aria-label="${esc(s.town||s.name||'')} ${esc(s.mascot||'')} crest"><defs><clipPath id="${V1817C.CLIP}"><path d="${path}"/></clipPath></defs>`+
    `<g clip-path="url(#${V1817C.CLIP})">${v1817cField(d.fd,s.c1,s.c2,dark)}</g><path d="${path}" fill="none" stroke="${P.S}" stroke-width="5" stroke-linejoin="round"/>`+
    `<path d="${path}" transform="translate(50 57) scale(.86) translate(-50 -57)" fill="none" stroke="${d.fd==='classic'?P.P:'#ffffff'}" stroke-opacity="${d.fd==='classic'?.55:.35}" stroke-width="2"/>${showEm?`<g transform="${emT}">${inner}</g>`:''}${rb}</svg>`; }
const v1817cCache=new Map();
{ const _cr=crest; crest=function(s,size=40){ if(!s) return _cr(s,size); const d=v1817cDef(s); const mk=s.mk||mascotKeyFor(s.mascot);
  if(d.sh==='shield'&&d.fd==='classic'&&!d.rb&&d.em===mk) return _cr(s,size);
  const lite=size<60; const mode=lite?'l':(typeof v17MarkCtx!=='undefined'&&v17MarkCtx)?'s':'i';
  const k=v1817cSig(d)+'|'+s.c1+'|'+s.c2+'|'+size+'|'+mode+'|'+(s.town||s.name||'')+'|'+(s.mascot||''); let t=v1817cCache.get(k);
  if(t===undefined){ if(v1817cCache.size>3000) v1817cCache.clear(); t=v1817cBuild(s,size,d,mode); v1817cCache.set(k,t); }
  const out=typeof v17Mint==='function'?v17Mint(t,mode,s.c1,s.c2):t.split(V17_ID).join('mfc'+(++V1817C.n));
  return out.split(V1817C.CLIP).join('cc'+(++V1817C.n)); }; }
/* a design drawn directly (the studio previews) */
function v1817cDraw(s,size,d){ const t=v1817cBuild(s,size,d,'i'); return t.split(V17_ID).join('mfc'+(++V1817C.n)).split(V1817C.CLIP).join('cc'+(++V1817C.n)); }
