/* ===================== MASCOTS: 20 original sports-logo marks (16 more in mascots2.js), recolored per school ===================== */
const MASCOT_LIST = [
  ['patriots','Patriots',['Patriots','Minutemen','Colonials']],
  ['lions','Lions',['Lions']],
  ['bees','Hornets',['Hornets','Yellow Jackets','Bees']],
  ['eagles','Eagles',['Eagles']],
  ['tigers','Tigers',['Tigers']],
  ['bears','Bears',['Bears','Grizzlies']],
  ['wolves','Wolves',['Wolves','Wolfpack']],
  ['panthers','Panthers',['Panthers','Jaguars']],
  ['bulldogs','Bulldogs',['Bulldogs']],
  ['rams','Rams',['Rams']],
  ['knights','Knights',['Knights','Crusaders']],
  ['spartans','Spartans',['Spartans','Trojans']],
  ['falcons','Falcons',['Falcons','Hawks']],
  ['wildcats','Wildcats',['Wildcats','Bobcats']],
  ['mustangs','Mustangs',['Mustangs','Stallions','Broncos']],
  ['sharks','Sharks',['Sharks']],
  ['vikings','Vikings',['Vikings']],
  ['cardinals','Cardinals',['Cardinals']],
  ['raiders','Raiders',['Raiders','Pirates','Buccaneers']],
  ['thunder','Thunder',['Thunder','Storm','Lightning']]
];
const MASCOT_KEYS = MASCOT_LIST.map(m=>m[0]);
const MASCOT_BY = Object.fromEntries(MASCOT_LIST.map(m=>[m[0],{k:m[0],n:m[1],alt:m[2]}]));
function mascotKeyFor(name){ const n=String(name||'').toLowerCase(); for(const [k,,alts] of MASCOT_LIST) if(alts.some(a=>a.toLowerCase()===n)) return k; return 'lions'; }

const _mc = (a,b,t)=>{ const h=x=>{ x=x.replace('#',''); return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16)); }; const A=h(a),B=h(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); };
const _lum = c=>{ const x=c.replace('#',''); const v=[0,2,4].map(i=>{ let n=parseInt(x.slice(i,i+2),16)/255; return n<=0.03928?n/12.92:Math.pow((n+0.055)/1.055,2.4); }); return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]; };
const _dist = (a,b)=>{ const h=x=>{ x=x.replace('#',''); return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16)); }; const A=h(a),B=h(b); return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]); };
function mascotPalette(c1,c2){
  let P=/^#[0-9a-f]{6}$/i.test(c1||'')?c1:'#1d4ed8', S=/^#[0-9a-f]{6}$/i.test(c2||'')?c2:'#ffffff';
  if(_dist(P,S)<90) S = _lum(P)>0.35 ? '#15181e' : '#ffffff';
  const O='#0d1015';
  // keep the primary readable against the dark outline
  if(_lum(P)<0.025) P=_mc(P,'#ffffff',0.18);
  return {O, P, S, Pd:_mc(P,'#000000',0.35), Pl:_mc(P,'#ffffff',0.3), Sd:_mc(S,'#000000',0.22), Sl:_mc(S,'#ffffff',0.35), W:'#ffffff', skin:'#f0c9a2', skinD:'#d9a77c'};
}
function _star(cx,cy,n,ro,ri,rot=-Math.PI/2){ let d=''; for(let i=0;i<n*2;i++){ const r=i%2?ri:ro; const a=rot+i*Math.PI/n; d+=(i?'L':'M')+(cx+r*Math.cos(a)).toFixed(1)+' '+(cy+r*Math.sin(a)).toFixed(1); } return d+'Z'; }
const _eyes = (C, y=46, col)=>`<path d="M31 ${y-2}L45 ${y+1}L42 ${y+6}L33 ${y+4}Z" fill="${col||C.W}"/><path d="M69 ${y-2}L55 ${y+1}L58 ${y+6}L67 ${y+4}Z" fill="${col||C.W}"/><circle cx="40" cy="${y+2.5}" r="2.2" fill="${C.O}" stroke="none"/><circle cx="60" cy="${y+2.5}" r="2.2" fill="${C.O}" stroke="none"/><path d="M28 ${y-7}L47 ${y-1}M72 ${y-7}L53 ${y-1}" stroke-width="4.5" fill="none"/>`;

const MASCOT_ART = {
  lions:C=>`<path d="${_star(50,52,16,46,35)}" fill="${C.S}"/><path d="${_star(50,52,16,38,30,-Math.PI/2+0.2)}" fill="${C.Sd}" stroke="none"/>
    <circle cx="31" cy="27" r="7" fill="${C.P}"/><circle cx="69" cy="27" r="7" fill="${C.P}"/>
    <path d="M50 23C66 23 75 35 75 50C75 62 69 72 62 78L50 85L38 78C31 72 25 62 25 50C25 35 34 23 50 23Z" fill="${C.P}"/>
    <path d="M50 30L45 41L50 46L55 41Z" fill="${C.Pd}" stroke="none"/>
    <ellipse cx="43" cy="65" rx="9" ry="7" fill="${C.Pl}"/><ellipse cx="57" cy="65" rx="9" ry="7" fill="${C.Pl}"/><ellipse cx="50" cy="75" rx="6" ry="4.5" fill="${C.Pl}"/>
    <path d="M43 56L57 56L50 64Z" fill="${C.O}"/>${_eyes(C,45)}`,
  tigers:C=>`<circle cx="26" cy="25" r="10" fill="${C.P}"/><circle cx="74" cy="25" r="10" fill="${C.P}"/><circle cx="26" cy="25" r="4.5" fill="${C.W}" stroke="none"/><circle cx="74" cy="25" r="4.5" fill="${C.W}" stroke="none"/>
    <path d="M50 20C68 20 82 34 82 52C82 60 79 66 74 70L78 75L65 77L50 87L35 77L22 75L26 70C21 66 18 60 18 52C18 34 32 20 50 20Z" fill="${C.P}"/>
    <g fill="${C.O}" stroke="none"><path d="M50 21L46 32L50 37L54 32Z"/><path d="M37 24L39 35L44 30Z"/><path d="M63 24L61 35L56 30Z"/><path d="M18 50L31 52L20 57Z"/><path d="M20 61L32 61L24 66Z"/><path d="M82 50L69 52L80 57Z"/><path d="M80 61L68 61L76 66Z"/></g>
    <ellipse cx="42" cy="66" rx="10" ry="8" fill="${C.W}"/><ellipse cx="58" cy="66" rx="10" ry="8" fill="${C.W}"/><ellipse cx="50" cy="77" rx="7" ry="5" fill="${C.W}"/>
    <path d="M44 57L56 57L50 64Z" fill="${C.Pd}"/>${_eyes(C,45,C.S)}`,
  bears:C=>`<circle cx="25" cy="27" r="12" fill="${C.P}"/><circle cx="75" cy="27" r="12" fill="${C.P}"/><circle cx="25" cy="27" r="5.5" fill="${C.Pd}" stroke="none"/><circle cx="75" cy="27" r="5.5" fill="${C.Pd}" stroke="none"/>
    <path d="M50 21C70 21 82 34 82 52C82 71 68 85 50 85C32 85 18 71 18 52C18 34 30 21 50 21Z" fill="${C.P}"/>
    <ellipse cx="50" cy="65" rx="18" ry="14" fill="${C.Pl}"/><ellipse cx="50" cy="57" rx="8" ry="5.5" fill="${C.O}"/><ellipse cx="47" cy="55.5" rx="2.3" ry="1.3" fill="${C.W}" stroke="none"/>
    <path d="M37 68Q50 79 63 68L61 75Q50 84 39 75Z" fill="${C.O}"/><path d="M41 70L43 75L45 71ZM55 71L57 75L59 70Z" fill="${C.W}" stroke="none"/>${_eyes(C,42)}`,
  wolves:C=>`<path d="M50 20L62 29L73 9L77 36C83 44 85 52 81 60L67 74L57 86L50 89L43 86L33 74L19 60C15 52 17 44 23 36L27 9L38 29Z" fill="${C.P}"/>
    <path d="M30 17L35 30L28 33Z" fill="${C.Pd}"/><path d="M70 17L65 30L72 33Z" fill="${C.Pd}"/>
    <path d="M23 52L36 58L44 71L50 75L56 71L64 58L77 52L70 67L58 81L50 87L42 81L30 67Z" fill="${C.Sl}"/>
    <path d="M50 29L46 44L50 54L54 44Z" fill="${C.Pd}" stroke="none"/>
    <path d="M44 60L56 60L50 68Z" fill="${C.O}"/>${_eyes(C,44,C.S)}`,
  panthers:C=>`<path d="M24 36L21 12L41 24Z" fill="${C.P}"/><path d="M76 36L79 12L59 24Z" fill="${C.P}"/><path d="M27 31L25 18L35 25Z" fill="${C.Pl}" stroke="none"/><path d="M73 31L75 18L65 25Z" fill="${C.Pl}" stroke="none"/>
    <path d="M50 22C68 22 81 36 81 51C81 61 75 69 67 73L50 82L33 73C25 69 19 61 19 51C19 36 32 22 50 22Z" fill="${C.P}"/>
    <path d="M45 52L55 52L50 58Z" fill="${C.Pd}"/>
    <path d="M35 61Q50 56 65 61L61 78Q50 85 39 78Z" fill="${C.O}"/>
    <g fill="${C.W}" stroke="none"><path d="M39 61.5L42 71L45 60.5Z"/><path d="M55 60.5L58 71L61 61.5Z"/><path d="M42 78L44 71L46 79Z"/><path d="M54 79L56 71L58 78Z"/></g>
    <path d="M44 74Q50 77 56 74" fill="none" stroke="${C.Pd}" stroke-width="2"/>${_eyes(C,42,C.S)}`,
  wildcats:C=>`<path d="M26 34L28 9L32 2L34 12L42 24Z" fill="${C.P}"/><path d="M74 34L72 9L68 2L66 12L58 24Z" fill="${C.P}"/>
    <path d="M50 22C64 22 74 30 78 42L89 50L80 56L87 64L74 66L64 78L50 85L36 78L26 66L13 64L20 56L11 50L22 42C26 30 36 22 50 22Z" fill="${C.P}"/>
    <ellipse cx="42" cy="65" rx="9" ry="7" fill="${C.W}"/><ellipse cx="58" cy="65" rx="9" ry="7" fill="${C.W}"/>
    <g fill="${C.Pd}" stroke="none"><circle cx="44" cy="31" r="2"/><circle cx="50" cy="28" r="2"/><circle cx="56" cy="31" r="2"/><circle cx="50" cy="35" r="1.6"/></g>
    <path d="M44 56L56 56L50 63Z" fill="${C.O}"/><path d="M42 74Q50 79 58 74" fill="none"/>${_eyes(C,44,C.S)}`,
  bulldogs:C=>`<path d="M24 30C14 30 6 38 8 50C10 56 16 58 20 54Z" fill="${C.Pd}"/><path d="M76 30C86 30 94 38 92 50C90 56 84 58 80 54Z" fill="${C.Pd}"/>
    <path d="M50 23C70 23 84 33 86 49C88 61 82 71 75 75C70 83 61 87 50 87C39 87 30 83 25 75C18 71 12 61 14 49C16 33 30 23 50 23Z" fill="${C.P}"/>
    <path d="M37 33Q50 29 63 33M39 38Q50 35 61 38" fill="none" stroke-width="2.5"/>
    <path d="M30 56C30 49 70 49 70 56C72 66 64 74 50 74C36 74 28 66 30 56Z" fill="${C.Pl}"/>
    <path d="M41 52L59 52L55 59L45 59Z" fill="${C.O}"/>
    <path d="M33 70Q50 81 67 70L63 79Q50 86 37 79Z" fill="${C.O}"/><path d="M39 73L41 67L43 74ZM57 74L59 67L61 73Z" fill="${C.W}" stroke="none"/>
    <path d="M22 86Q50 97 78 86L76 95Q50 104 24 95Z" fill="${C.S}"/><g fill="${C.W}"><path d="M32 89L35 83L38 91Z"/><path d="M47 91L50 85L53 92Z"/><path d="M62 91L65 83L68 89Z"/></g>${_eyes(C,43)}`,
  rams:C=>`<path d="M42 34C30 16 6 22 8 44C10 62 32 62 32 48C32 39 20 39 20 48" fill="none" stroke="${C.O}" stroke-width="15"/><path d="M42 34C30 16 6 22 8 44C10 62 32 62 32 48C32 39 20 39 20 48" fill="none" stroke="${C.S}" stroke-width="9"/>
    <path d="M58 34C70 16 94 22 92 44C90 62 68 62 68 48C68 39 80 39 80 48" fill="none" stroke="${C.O}" stroke-width="15"/><path d="M58 34C70 16 94 22 92 44C90 62 68 62 68 48C68 39 80 39 80 48" fill="none" stroke="${C.S}" stroke-width="9"/>
    <g stroke="${C.Sd}" stroke-width="1.6"><path d="M12 34L18 37M16 26L20 31M24 22L26 28M88 34L82 37M84 26L80 31M76 22L74 28"/></g>
    <path d="M50 26C61 26 66 38 65 52L61 78Q50 92 39 78L35 52C34 38 39 26 50 26Z" fill="${C.P}"/>
    <path d="M44 28L50 22L56 28L50 40Z" fill="${C.Pd}"/>
    <ellipse cx="50" cy="77" rx="10" ry="8" fill="${C.Pl}"/><path d="M45 76Q47 79 48 75M55 76Q53 79 52 75" fill="none" stroke-width="2"/>
    <path d="M36 47L46 50L43 54Z" fill="${C.W}"/><path d="M64 47L54 50L57 54Z" fill="${C.W}"/><circle cx="42" cy="51" r="1.8" fill="${C.O}" stroke="none"/><circle cx="58" cy="51" r="1.8" fill="${C.O}" stroke="none"/><path d="M34 43L47 47M66 43L53 47" stroke-width="3.5" fill="none"/>`,
  eagles:C=>`<path d="M54 56L94 20L97 95L44 95Z" fill="${C.P}"/><path d="M70 60L84 44L80 66ZM62 76L80 66L74 86Z" fill="${C.Pd}" stroke="none"/>
    <path d="M89 26C75 13 50 13 36 25C31 30 27 35 25 40L45 48C47 60 53 72 63 82L71 70L77 78L84 63L93 65C95 50 95 36 89 26Z" fill="${C.W}"/>
    <path d="M66 22C74 28 80 38 82 48M58 58C66 62 72 66 78 70" fill="none" stroke-width="1.8" stroke="${C.O}"/>
    <path d="M38 27C26 26 12 30 8 39C6 45 10 51 16 51C16 47 19 45 23 45L45 47L44 36Z" fill="${C.S}"/><path d="M16 51C19 49 22 49 26 50" fill="none" stroke-width="2"/>
    <path d="M41 31L62 28L56 38Z" fill="${C.Pd}"/><ellipse cx="52" cy="37" rx="5" ry="3.6" fill="${C.S}"/><circle cx="51" cy="37" r="2" fill="${C.O}" stroke="none"/><path d="M38 33L62 27" stroke-width="4"/>`,
  falcons:C=>`<g transform="translate(100 0) scale(-1 1)"><path d="M52 60L92 32L94 94L42 94Z" fill="${C.Pd}"/>
    <path d="M86 24C72 12 48 14 36 28C30 35 28 42 28 48L44 52C46 64 52 74 62 84L84 84C92 70 94 54 92 40C91 33 89 28 86 24Z" fill="${C.P}"/>
    <path d="M44 52C46 64 52 74 62 84L72 84C64 76 58 66 56 54Z" fill="${C.W}"/>
    <path d="M52 44C54 54 58 62 64 70L58 72C52 64 48 54 47 46Z" fill="${C.O}"/>
    <path d="M37 30C27 30 17 34 14 42C12 48 16 52 21 52C21 49 23 47 26 47L44 50L43 38Z" fill="${C.S}"/>
    <path d="M40 35L60 31L55 41Z" fill="${C.O}"/><circle cx="51" cy="38" r="5" fill="${C.S}"/><circle cx="50" cy="38" r="2.2" fill="${C.O}" stroke="none"/><path d="M40 34L62 30" stroke-width="4"/></g>`,
  cardinals:C=>`<path d="M36 46L24 6L40 24L43 10L54 34Z" fill="${C.P}"/>
    <path d="M20 97C13 77 17 56 32 44C44 34 62 32 74 40C82 46 84 58 80 68C74 82 62 91 50 97Z" fill="${C.P}"/>
    <path d="M30 70C38 76 48 78 58 74M28 82C36 87 44 88 52 86" fill="none" stroke="${C.Pd}" stroke-width="2.5"/>
    <path d="M57 39C66 37 76 40 82 46L80 61C71 65 62 62 55 55Z" fill="${C.O}"/>
    <path d="M78 44L97 52L78 61Z" fill="${C.S}"/><path d="M79 52L95 52" stroke-width="1.6"/>
    <circle cx="66" cy="48" r="4.5" fill="${C.W}"/><circle cx="67" cy="48" r="2" fill="${C.O}" stroke="none"/><path d="M58 42L74 45" stroke-width="3" stroke="${C.P}"/>`,
  sharks:C=>`<path d="M40 37L52 10L63 35Z" fill="${C.P}"/>
    <path d="M6 52L16 46C34 32 60 30 80 38C88 42 94 48 97 55L80 56L91 65C70 75 44 77 24 71L8 81L12 65L2 58Z" fill="${C.P}"/>
    <path d="M28 64C48 68 68 67 80 61L91 65C70 75 44 77 26 71Z" fill="${C.W}"/>
    <path d="M80 56L97 55L91 65Z" fill="${C.O}"/><g fill="${C.W}" stroke="none"><path d="M82 56L84 60L86 56Z"/><path d="M87 56L89 60L91 56Z"/><path d="M84 63L86 59L88 63Z"/></g>
    <path d="M52 64L46 84L63 68Z" fill="${C.Pd}"/>
    <path d="M60 46Q62 52 60 58M64 46Q66 52 64 58M68 47Q70 52 68 57" fill="none" stroke-width="1.8"/>
    <path d="M70 41L82 44L79 49Z" fill="${C.W}"/><circle cx="76" cy="45.5" r="1.8" fill="${C.O}" stroke="none"/><path d="M69 39L84 43" stroke-width="3.5"/>`,
  knights:C=>`<path d="M50 15C56 3 76 2 86 10C74 9 64 13 57 22Z" fill="${C.S}"/><path d="M60 10C66 7 74 7 80 9" fill="none" stroke="${C.Sd}" stroke-width="1.8"/>
    <path d="M16 84L84 84L90 97L10 97Z" fill="${C.Pd}"/>
    <path d="M27 26C27 13 73 13 73 26L75 74C75 84 25 84 25 74Z" fill="${C.P}"/>
    <path d="M33 22C40 18 46 18 48 20L46 76C40 76 34 74 32 72Z" fill="${C.Pl}" stroke="none" opacity=".55"/>
    <rect x="28" y="43" width="44" height="7" rx="1" fill="${C.O}"/><rect x="46.5" y="18" width="7" height="58" fill="${C.S}"/>
    <g fill="${C.O}" stroke="none"><circle cx="36" cy="60" r="1.6"/><circle cx="36" cy="66" r="1.6"/><circle cx="64" cy="60" r="1.6"/><circle cx="64" cy="66" r="1.6"/></g>`,
  spartans:C=>`<path d="M20 26C26 4 72 -2 92 22L84 28C68 12 38 14 30 30Z" fill="${C.S}"/><path d="M34 14L38 22M46 8L48 17M58 7L58 16M70 9L68 17M80 14L76 21" stroke="${C.Sd}" stroke-width="2"/>
    <path d="M72 22C52 15 30 23 26 45L24 71L37 75L39 59L48 59L50 86L73 86C81 73 83 57 81 45C79 33 77 25 72 22Z" fill="${C.P}"/>
    <path d="M29 45L50 45L46 53L31 55Z" fill="${C.O}"/>
    <path d="M38 59L38 72M50 59C56 68 62 76 72 80" fill="none" stroke="${C.Pd}" stroke-width="2.4"/>
    <path d="M60 30C66 34 70 42 70 52" fill="none" stroke="${C.Pl}" stroke-width="3"/>`,
  vikings:C=>`<path d="M31 32C17 31 9 20 11 6C17 17 26 21 35 23Z" fill="#f2ead8"/><path d="M69 32C83 31 91 20 89 6C83 17 74 21 65 23Z" fill="#f2ead8"/>
    <path d="M28 40C28 16 72 16 72 40Z" fill="${C.P}"/><rect x="26" y="37" width="48" height="7" rx="2" fill="${C.S}"/><rect x="47" y="21" width="6" height="16" fill="${C.S}"/>
    <path d="M31 46C31 66 40 91 50 96C60 91 69 66 69 46L62 58L50 62L38 58Z" fill="${C.S}"/>
    <path d="M34 44L66 44L64 58L50 62L36 58Z" fill="${C.skin}"/>
    <path d="M36 61C42 57 46 57 50 60C54 57 58 57 64 61C58 64 54 64 50 62C46 64 42 64 36 61Z" fill="${C.Sd}"/>
    <rect x="47" y="44" width="6" height="12" fill="${C.Pd}"/>
    <path d="M37 47L45 49L43 52Z" fill="${C.W}"/><path d="M63 47L55 49L57 52Z" fill="${C.W}"/><circle cx="42" cy="50" r="1.7" fill="${C.O}" stroke="none"/><circle cx="58" cy="50" r="1.7" fill="${C.O}" stroke="none"/>
    <path d="M42 72L42 86M58 72L58 86" stroke="${C.Sd}" stroke-width="2"/>`,
  mustangs:C=>`<path d="M62 14C80 9 93 22 95 34L86 32C93 44 91 57 83 66L84 50L76 34ZM70 20C82 22 88 30 89 38" fill="${C.S}"/>
    <path d="M70 16L60 12L54 20C40 24 28 34 20 50L12 62C10 68 16 74 22 72L34 66C40 70 46 72 52 68L56 86L82 90C87 70 85 46 77 30Z" fill="${C.P}"/>
    <path d="M60 14L56 1L67 12Z" fill="${C.P}"/>
    <path d="M30 60C36 62 42 62 48 58" fill="none" stroke-width="2"/><ellipse cx="18" cy="64" rx="3" ry="2.2" fill="${C.O}"/>
    <path d="M34 34L48 36L44 42Z" fill="${C.W}"/><circle cx="42" cy="38" r="1.8" fill="${C.O}" stroke="none"/><path d="M32 32L50 35" stroke-width="3.5"/>
    <path d="M58 54C62 62 64 72 64 84" fill="none" stroke="${C.Pd}" stroke-width="2.5"/>`,
  raiders:C=>`<path d="M14 90L86 18M86 90L14 18" stroke="${C.O}" stroke-width="10"/><path d="M14 90L86 18M86 90L14 18" stroke="${C.S}" stroke-width="5"/>
    <path d="M10 82L22 94M90 82L78 94" stroke="${C.Pd}" stroke-width="7"/>
    <path d="M50 16C70 16 82 29 82 46C82 58 74 64 70 66L70 79L30 79L30 66C26 64 18 58 18 46C18 29 30 16 50 16Z" fill="${C.W}"/>
    <path d="M17 41C17 21 31 12 50 12C69 12 83 21 83 41C70 33 30 33 17 41Z" fill="${C.P}"/><g fill="${C.S}" stroke="none"><circle cx="34" cy="26" r="2.2"/><circle cx="50" cy="21" r="2.2"/><circle cx="66" cy="26" r="2.2"/></g>
    <path d="M80 34L96 29L91 43ZM82 39L97 49L84 51Z" fill="${C.P}"/>
    <path d="M20 37L80 56" stroke-width="2.5"/><ellipse cx="38" cy="48" rx="9" ry="8" fill="${C.O}"/><ellipse cx="62" cy="49" rx="7.5" ry="7" fill="${C.O}"/>
    <path d="M50 56L45 64L55 64Z" fill="${C.O}"/>
    <path d="M33 68L67 68M38 66L38 79M44 66L44 79M50 66L50 79M56 66L56 79M62 66L62 79" fill="none" stroke-width="2"/>`,
  thunder:C=>`<path d="M24 50C14 50 10 40 18 34C18 22 32 16 42 22C46 12 64 10 70 22C82 20 90 30 86 40C94 44 92 56 82 56L28 56C26 56 24 54 24 50Z" fill="${C.P}"/>
    <path d="M30 32C32 27 38 25 42 27M58 21C62 19 66 21 68 25" fill="none" stroke="${C.Pl}" stroke-width="3"/>
    <path d="M57 38L35 71L50 71L39 98L74 57L57 57L67 38Z" fill="${C.S}"/><path d="M60 41L45 64" stroke="${C.Sl}" stroke-width="2.5"/>
    <path d="M20 66L14 76M28 70L22 82M78 64L84 74" stroke="${C.S}" stroke-width="3"/>`,
  patriots:C=>`<circle cx="35" cy="58" r="15" fill="${C.W}"/><path d="M23 66L13 59L14 74Z" fill="${C.P}"/>
    <path d="M40 76L46 95L72 95L73 74Z" fill="${C.P}"/><path d="M48 78L56 95L60 78Z" fill="${C.S}"/>
    <path d="M41 40C47 38 63 40 69 44L73 52L79 58L73 62L75 66L71 69L71 75C65 81 53 82 45 78C39 70 37 54 41 40Z" fill="${C.skin}"/>
    <path d="M61 74L70 72" fill="none" stroke-width="2"/>
    <path d="M12 40L46 19L88 32L81 40C71 36 57 36 45 42L23 47Z" fill="${C.P}"/>
    <path d="M23 47L45 42C57 36 71 36 81 40" fill="none" stroke="${C.S}" stroke-width="3.5"/>
    <path d="${_star(45,31,5,6,2.6)}" fill="${C.S}" stroke-width="1.5"/>
    <path d="M56 49L66 49L63 54Z" fill="${C.O}"/><path d="M54 46L68 47" stroke-width="3"/>`,
  bees:C=>{ const body = _lum(C.S)>0.8 ? C.P : C.S; return `
    <path d="M57 41C51 20 62 7 73 13C77 24 67 37 59 43Z" fill="#e8f4ff" opacity=".92"/><path d="M51 43C38 27 42 12 52 14C59 22 57 35 53 45Z" fill="#dcecfb" opacity=".92"/>
    <path d="M14 63C14 49 31 41 47 45L56 52C52 66 40 76 25 74C19 72 14 68 14 63Z" fill="${body}"/>
    <g fill="${C.O}" stroke="none"><path d="M22 50C25 58 26 66 24 74L30 74C33 66 32 56 28 47Z"/><path d="M35 45C38 54 38 64 35 73L41 71C44 62 43 52 40 45Z"/></g>
    <path d="M14 63L1 70L15 68Z" fill="${C.O}"/>
    <circle cx="58" cy="50" r="11" fill="${C.Pd}"/>
    <path d="M54 60L50 70M60 61L60 72M64 59L68 69" stroke-width="2.5" fill="none"/>
    <path d="M73 31C70 19 64 15 58 17M81 31C84 19 90 15 96 19" fill="none" stroke-width="2.5"/>
    <circle cx="77" cy="44" r="14" fill="${body}"/>
    <path d="M71 35L89 37L85 48L72 44Z" fill="${C.O}"/><circle cx="83" cy="40" r="1.8" fill="${C.W}" stroke="none"/>
    <path d="M78 54Q84 56 88 51" fill="none" stroke-width="2.5"/>`; }
};

/* ---------- detail layer: fur, feathers, rivets and highlights drawn over each mark (v14) ---------- */
const MASCOT_DETAIL = {
  lions:C=>`<g fill="none" stroke="${C.Sd}" stroke-width="1.6" opacity=".9"><path d="M22 34L28 38M17 50L24 51M21 66L27 63M33 80L36 74M67 80L64 74M79 66L73 63M83 50L76 51M78 34L72 38M50 12L50 19"/></g>
    <path d="M37 28C42 25 47 25 50 26C53 25 58 25 63 28" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".75"/>
    <g fill="${C.O}" stroke="none" opacity=".75"><circle cx="40" cy="64" r="1"/><circle cx="37" cy="67" r="1"/><circle cx="41" cy="68.5" r="1"/><circle cx="60" cy="64" r="1"/><circle cx="63" cy="67" r="1"/><circle cx="59" cy="68.5" r="1"/></g>
    <path d="M30 52C31 62 36 70 42 75" fill="none" stroke="${C.Pd}" stroke-width="2.2" opacity=".8"/><path d="M70 52C69 62 64 70 58 75" fill="none" stroke="${C.Pd}" stroke-width="2.2" opacity=".8"/>`,
  tigers:C=>`<path d="M34 25C42 22 58 22 66 25" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>
    <g fill="${C.O}" stroke="none" opacity=".7"><circle cx="38" cy="65" r="1"/><circle cx="41" cy="68.5" r="1"/><circle cx="62" cy="65" r="1"/><circle cx="59" cy="68.5" r="1"/></g>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".8"><path d="M26 72L33 70M74 72L67 70M44 84L50 81L56 84"/></g>`,
  bears:C=>`<path d="M34 26C42 22 58 22 66 26" fill="none" stroke="${C.Pl}" stroke-width="2.6" opacity=".7"/>
    <g fill="${C.Pd}" stroke="none"><path d="M18 56L13 60L19 61L15 66L21 66L19 71L24 70Z"/><path d="M82 56L87 60L81 61L85 66L79 66L81 71L76 70Z"/></g>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".85"><path d="M30 37L33 34M70 37L67 34M46 27L48 31M54 27L52 31"/></g>
    <path d="M40 58C44 62 56 62 60 58" fill="none" stroke="${C.P}" stroke-width="1.6" opacity=".7"/>`,
  wolves:C=>`<g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".85"><path d="M24 46L30 47M22 54L29 54M76 46L70 47M78 54L71 54M44 22L47 27M56 22L53 27"/></g>
    <path d="M38 31C44 27 56 27 62 31" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".7"/>
    <g fill="${C.W}" stroke="none"><path d="M45 69L47 74L48 69Z"/><path d="M52 69L53 74L55 69Z"/></g>`,
  panthers:C=>`<path d="M35 28C42 25 58 25 65 28" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>
    <g fill="${C.O}" stroke="none" opacity=".7"><circle cx="38" cy="58" r="1"/><circle cx="35" cy="61" r="1"/><circle cx="62" cy="58" r="1"/><circle cx="65" cy="61" r="1"/></g>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".8"><path d="M22 58C24 64 28 68 33 71M78 58C76 64 72 68 67 71M50 30L50 38"/></g>`,
  wildcats:C=>`<g fill="${C.Pd}" stroke="none"><path d="M28 30L29 14L33 26Z"/><path d="M72 30L71 14L67 26Z"/></g>
    <g fill="none" stroke="${C.O}" stroke-width="1.2" opacity=".7"><path d="M30 64L16 61M31 68L18 70M70 64L84 61M69 68L82 70"/></g>
    <g fill="${C.Pd}" stroke="none"><circle cx="34" cy="40" r="1.6"/><circle cx="66" cy="40" r="1.6"/><circle cx="30" cy="56" r="1.4"/><circle cx="70" cy="56" r="1.4"/></g>`,
  bulldogs:C=>`<path d="M32 28C42 24 58 24 68 28" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".65"/>
    <g fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".85"><path d="M22 58C24 66 28 72 33 75M78 58C76 66 72 72 67 75M44 46L41 50M56 46L59 50"/></g>
    <ellipse cx="45" cy="54" rx="2.2" ry="1.2" fill="${C.W}" stroke="none" opacity=".8"/>`,
  rams:C=>`<path d="M44 34C46 30 48 29 50 29C52 29 54 30 56 34" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".75"/>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".85"><path d="M40 60C41 66 42 70 44 72M60 60C59 66 58 70 56 72"/></g>
    <g fill="none" stroke="${C.Sd}" stroke-width="1.4"><path d="M10 50L16 49M14 58L19 54M90 50L84 49M86 58L81 54"/></g>`,
  eagles:C=>`<g fill="none" stroke="${C.O}" stroke-width="1.4" opacity=".55"><path d="M48 50L56 46M52 58L62 54M58 66L68 62M72 34L80 30M76 42L86 40"/></g>
    <path d="M14 38C18 33 26 31 34 31" fill="none" stroke="${C.Sl}" stroke-width="2.4" opacity=".9"/><ellipse cx="33" cy="35" rx="2.4" ry="1.2" fill="${C.O}" stroke="none"/>
    <circle cx="52.6" cy="36" r=".9" fill="${C.W}" stroke="none"/>`,
  falcons:C=>`<g transform="translate(100 0) scale(-1 1)"><g fill="none" stroke="${C.Pd}" stroke-width="1.6" opacity=".8"><path d="M64 26C72 30 80 38 84 48M74 54L86 52M70 64L84 66"/></g>
    <path d="M18 40C22 35 28 33 36 33" fill="none" stroke="${C.Sl}" stroke-width="2.2" opacity=".9"/><circle cx="51.6" cy="37" r=".9" fill="${C.W}" stroke="none"/>
    <g fill="${C.Pd}" stroke="none"><path d="M60 88L66 80L70 88Z"/><path d="M70 88L76 79L80 88Z"/></g></g>`,
  cardinals:C=>`<path d="M34 58C46 53 60 56 70 65C66 72 58 77 48 80L40 88L41 82L33 90L34 83L26 90C26 78 28 66 34 58Z" fill="${C.Pd}" stroke="${C.O}" stroke-width="2.4"/>
    <g fill="none" stroke="${C.P}" stroke-width="1.6" opacity=".9"><path d="M38 63C46 61 55 63 62 68M36 70C43 69 50 71 55 74M34 77C39 77 43 78 46 79"/></g>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8"><path d="M30 14L38 34M42 16L46 32"/></g>
    <path d="M40 40C48 36 56 35 62 37" fill="none" stroke="${C.Pl}" stroke-width="2.6" opacity=".8"/>
    <path d="M80 47L92 52" fill="none" stroke="${C.Sl}" stroke-width="2" opacity=".9"/><circle cx="67.8" cy="47" r=".9" fill="${C.W}" stroke="none"/>`,
  sharks:C=>`<path d="M22 50C38 40 58 38 76 42" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>
    <path d="M34 68C46 71 62 70 74 66" fill="none" stroke="${C.O}" stroke-width="1.2" opacity=".3"/>
    <path d="M44 15L50 30" fill="none" stroke="${C.Pl}" stroke-width="1.8" opacity=".7"/><circle cx="76.6" cy="45" r=".7" fill="${C.W}" stroke="none"/>`,
  knights:C=>`<path d="M62 6C66 9 70 9 74 7M66 12C70 13 74 12 78 10" fill="none" stroke="${C.Sd}" stroke-width="1.4"/>
    <g fill="${C.Pl}" stroke="none" opacity=".9"><circle cx="31" cy="30" r="1.5"/><circle cx="69" cy="30" r="1.5"/><circle cx="30" cy="73" r="1.5"/><circle cx="70" cy="73" r="1.5"/></g>
    <path d="M30 43L44 43" stroke="${C.Pl}" stroke-width="1.2" opacity=".5"/><path d="M48.5 20L48.5 74" stroke="${C.Sl}" stroke-width="1.4" opacity=".8"/>
    <g fill="none" stroke="${C.P}" stroke-width="1.4" opacity=".9"><path d="M24 90L76 90"/></g>`,
  spartans:C=>`<g fill="${C.Pl}" stroke="none" opacity=".9"><circle cx="33" cy="66" r="1.5"/><circle cx="33" cy="61" r="1.5"/><circle cx="66" cy="78" r="1.5"/></g>
    <path d="M32 40C36 32 44 27 54 26" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>
    <path d="M30 20C42 9 66 7 84 20" fill="none" stroke="${C.Sl}" stroke-width="2" opacity=".85"/>`,
  vikings:C=>`<g fill="none" stroke="#c9bfa8" stroke-width="1.6"><path d="M15 16L20 14M19 23L24 20M85 16L80 14M81 23L76 20"/></g>
    <g fill="${C.Sl}" stroke="none"><circle cx="31" cy="40.5" r="1.3"/><circle cx="40" cy="40.5" r="1.3"/><circle cx="60" cy="40.5" r="1.3"/><circle cx="69" cy="40.5" r="1.3"/></g>
    <path d="M34 34C36 26 42 22 47 22" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".75"/>
    <g fill="none" stroke="${C.Sd}" stroke-width="1.6"><path d="M50 66L50 92M46 68C46 76 47 82 48 88M54 68C54 76 53 82 52 88"/></g>
    <g fill="${C.Sd}" stroke="${C.O}" stroke-width="1.6"><rect x="39" y="84" width="6" height="4" rx="1"/><rect x="55" y="84" width="6" height="4" rx="1"/></g>`,
  mustangs:C=>`<g fill="none" stroke="${C.Sd}" stroke-width="1.6"><path d="M74 20C80 24 84 30 86 36M70 26C76 32 80 40 82 48"/></g>
    <path d="M40 30C48 26 58 22 64 20" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>
    <path d="M24 66C26 68 28 68 30 66" fill="none" stroke-width="1.6"/><g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".8"><path d="M66 50C70 58 72 68 72 80"/></g>`,
  raiders:C=>`<g fill="none" stroke="${C.Pd}" stroke-width="1.6" opacity=".9"><path d="M26 30C34 26 42 24 50 24M58 24C64 24 70 26 76 30"/></g>
    <g fill="none" stroke="#9aa3ad" stroke-width="1.4"><path d="M28 56L32 60M72 54L68 58M47 70L47 76M53 70L53 76"/></g>
    <circle cx="35" cy="46" r="1.4" fill="${C.W}" stroke="none" opacity=".7"/>`,
  thunder:C=>`<g fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".85"><path d="M28 50C30 46 34 44 38 45M48 48C50 43 56 41 60 43M70 50C72 45 78 44 82 47"/></g>
    <path d="M34 22C40 18 46 18 50 21" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>`,
  patriots:C=>`<path d="M27 50C24 54 24 60 27 64M32 46C29 52 29 62 33 68" fill="none" stroke="#c9ced6" stroke-width="1.6"/>
    <path d="M47 51C44 55 45 60 48 62" fill="none" stroke="${C.skinD}" stroke-width="2"/>
    <path d="M24 44L44 39C56 33 70 33 80 37" fill="none" stroke="${C.Sl}" stroke-width="1.2" stroke-dasharray="2 2" opacity=".9"/>
    <path d="M45 72C51 76 60 76 66 72" fill="none" stroke="${C.skinD}" stroke-width="1.6" opacity=".8"/>`,
  bees:C=>`<g fill="none" stroke="#a9c3dc" stroke-width="1.1"><path d="M60 38C62 30 66 22 71 16M55 40C52 32 50 24 51 17"/></g>
    <path d="M22 54C28 50 36 48 44 49" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>
    <path d="M70 37C74 35 80 35 84 37" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>`
};

/* Standalone mascot mark (0..100 box). v14: outline ring, drop shadow and bevel via one inline filter. */
let _mUid=0;
function mascotRing(C){ return _lum(C.S)>0.55 ? C.S : (_lum(C.P)>0.55 ? C.P : '#f4f6f9'); }
function mascotFilter(id, C){ return `<filter id="${id}" x="-12%" y="-12%" width="124%" height="128%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="d1"/><feFlood flood-color="${mascotRing(C)}"/><feComposite in2="d1" operator="in" result="ring"/>
  <feMorphology in="SourceAlpha" operator="dilate" radius="4.2" result="d2"/><feFlood flood-color="${C.O}"/><feComposite in2="d2" operator="in" result="outer"/>
  <feOffset in="d2" dy="2.6" result="o2"/><feGaussianBlur in="o2" stdDeviation="1.8"/><feComponentTransfer result="shadow"><feFuncA type="linear" slope=".55"/></feComponentTransfer>
  <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="bl"/>
  <feSpecularLighting in="bl" surfaceScale="4" specularConstant=".9" specularExponent="22" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="28"/></feSpecularLighting>
  <feComposite in="sp" in2="SourceAlpha" operator="in" result="spec"/>
  <feOffset in="bl" dx="-1.6" dy="-2.6" result="up"/><feComposite in="SourceAlpha" in2="up" operator="out" result="edge"/><feFlood flood-color="#000" flood-opacity=".32"/><feComposite in2="edge" operator="in" result="inner"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="outer"/><feMergeNode in="ring"/><feMergeNode in="SourceGraphic"/><feMergeNode in="inner"/><feMergeNode in="spec"/></feMerge></filter>`; }
function mascotInner(key, c1, c2, lite){ const C=mascotPalette(c1,c2); const f=MASCOT_ART[key]||MASCOT_ART.lions; const dt=MASCOT_DETAIL[key]||MASCOT_DETAIL.lions;
  const art=`<g stroke="${C.O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${f(C)}${dt(C)}</g>`;
  if(lite) return art;
  const id='mf'+(++_mUid); return `<defs>${mascotFilter(id,C)}</defs><g filter="url(#${id})">${art}</g>`; }
function mascotSVG(key, c1, c2, size=64, label){ const lite=size<34; return `<svg class="mascot${lite?' lite':''}" width="${size}" height="${size}" viewBox="${lite?'-2 -2 104 104':'-7 -7 114 116'}" role="img" aria-label="${label||((MASCOT_BY[key]||{}).n||'Mascot')} logo">${mascotInner(key,c1,c2,lite)}</svg>`; }
