/* ===================== MASCOTS II: 16 more original marks (v16) =====================
   Same construction as the first 20: flat team-colour fills, a dark 3px keyline from mascotInner,
   a detail layer for fur / scales / highlights, then the shared outline-ring + gloss filter. */
(function(){
const M=(x)=>`<g transform="translate(100 0) scale(-1 1)">${x}</g>`;   // mirror for symmetric marks
const fur=C=>_lum(C.S)>0.5?C.S:'#f2f4f7';
const ART={
  phoenix:C=>`${[0,1].map(i=>{ const w=`<path d="M46 58C34 60 18 54 8 38L20 40L8 22L24 30L18 10L34 26L36 12L44 30L48 40Z" fill="${C.S}"/><path d="M46 54C36 54 26 48 20 40L28 40L22 28L32 33L30 20L40 32L44 42Z" fill="${C.P}" stroke="none"/>`; return i?M(w):w; }).join('')}
    <path d="M42 74L30 96L44 88L50 98L56 88L70 96L58 74Z" fill="${C.S}"/><path d="M45 76L40 90L50 84L60 90L55 76Z" fill="${C.P}" stroke="none"/>
    <path d="M50 30C61 30 66 42 62 56L58 74C54 80 46 80 42 74L38 56C34 42 39 30 50 30Z" fill="${C.P}"/>
    <path d="M42 22L40 6L48 16L50 2L54 16L62 6L58 24Z" fill="${C.S}"/>
    <circle cx="50" cy="30" r="12" fill="${C.P}"/>
    <path d="M45 33L50 46L55 33Z" fill="${C.S}"/>
    <path d="M38 26L48 30L46 34L40 32Z" fill="${C.W}"/><path d="M62 26L52 30L54 34L60 32Z" fill="${C.W}"/><circle cx="45" cy="31" r="1.6" fill="${C.O}" stroke="none"/><circle cx="55" cy="31" r="1.6" fill="${C.O}" stroke="none"/><path d="M37 23L49 28M63 23L51 28" stroke-width="3.5" fill="none"/>`,
  dragons:C=>`<path d="M42 38C28 32 14 22 6 8C20 14 34 20 50 28Z" fill="${C.S}"/><path d="M52 30C44 20 40 10 42 0C50 8 58 18 64 28Z" fill="${C.Sd}"/>
    <path d="M14 96C12 72 20 52 34 40C44 32 56 26 70 28L94 36L92 44L76 46L90 54L86 61L68 59C58 64 50 74 48 96Z" fill="${C.P}"/>
    <path d="M24 70L8 66L18 58L6 52L20 48L12 38L28 40" fill="${C.S}"/>
    <path d="M66 59L86 61L82 67L64 67Z" fill="${C.Pd}"/>
    <path d="M74 46L76 51L78 46ZM80 46L81.5 50L83 46ZM70 59L71.5 55L73 59ZM76 60L77.5 56L79 60Z" fill="${C.W}" stroke-width="1.5"/>
    <path d="M58 35L72 37L68 42L59 40Z" fill="${C.S}"/><path d="M64 36.5L65 41" stroke-width="2.4"/><path d="M55 31L74 35" stroke-width="4"/>
    <ellipse cx="88" cy="39.5" rx="2" ry="1.4" fill="${C.O}" stroke="none"/>`,
  gators:C=>`<path d="M18 62L92 57C97 57 97 64 92 66L40 75C28 77 18 72 18 62Z" fill="${C.Pd}"/>
    <path d="M26 56L94 49L94 58L26 63Z" fill="#7a1f1f" stroke="none"/>
    <path d="M8 55C9 41 23 32 40 32L50 30C56 21 67 21 70 30L94 38C99 40 99 47 94 49L60 53L26 56C16 57 8 58 8 55Z" fill="${C.P}"/>
    <path d="M30 55L33 61L36 54.6L39 60.5L42 54.3L45 60L48 54L51 59.6L54 53.7L57 59.2L60 53.4L63 58.8L66 53L69 58.4L72 52.7L75 58L78 52.4L81 57.6L84 52L87 57.2L90 51.6" fill="none" stroke="${C.W}" stroke-width="2.6" stroke-linejoin="miter"/>
    <path d="M12 44L16 37L20 44L24 36L28 43L32 35L36 42" fill="${C.Pd}"/>
    <circle cx="61" cy="30" r="8.5" fill="${C.P}"/><ellipse cx="62" cy="30" rx="5.5" ry="4.2" fill="${C.S}"/><path d="M62 26.5V33.5" stroke-width="2.4"/><path d="M53 26L70 28" stroke-width="3.6"/>
    <ellipse cx="91" cy="40" rx="2.2" ry="1.4" fill="${C.O}" stroke="none"/>`,
  scorpions:C=>`${[0,1].map(i=>{ const a=`<path d="M38 64L26 72L18 84" fill="none" stroke-width="7"/><path d="M38 64L26 72L18 84" fill="none" stroke="${C.P}" stroke-width="3.5"/><path d="M8 84C6 72 18 66 26 74L20 81L30 86C26 96 12 96 8 84Z" fill="${C.P}"/><path d="M36 50L22 46M36 56L20 58M38 62L24 66" fill="none" stroke-width="3"/>`; return i?M(a):a; }).join('')}
    <ellipse cx="50" cy="56" rx="14" ry="18" fill="${C.P}"/>
    <path d="M38 50Q50 54 62 50M37 58Q50 62 63 58M38 66Q50 70 62 66" fill="none" stroke="${C.Pd}" stroke-width="2.2"/>
    <path d="M40 72C40 84 60 84 60 72Z" fill="${C.Pd}"/><circle cx="46" cy="76" r="1.8" fill="${C.S}" stroke="none"/><circle cx="54" cy="76" r="1.8" fill="${C.S}" stroke="none"/>
    <circle cx="50" cy="38" r="8" fill="${C.P}"/><circle cx="55" cy="27" r="7" fill="${C.P}"/><circle cx="63" cy="18" r="6" fill="${C.P}"/><circle cx="73" cy="13" r="5" fill="${C.P}"/>
    <path d="M77 9C90 6 95 18 88 27L84 19L78 15Z" fill="${C.S}"/>`,
  owls:C=>`<path d="M50 16L62 25L78 8L80 34C91 46 89 70 77 82C69 91 31 91 23 82C11 70 9 46 20 34L22 8L38 25Z" fill="${C.P}"/>
    <path d="M28 18L30 30L36 26ZM72 18L70 30L64 26Z" fill="${C.Pd}" stroke="none"/>
    <circle cx="37" cy="47" r="15" fill="${C.Pl}"/><circle cx="63" cy="47" r="15" fill="${C.Pl}"/>
    <circle cx="37" cy="48" r="9.5" fill="${C.S}"/><circle cx="63" cy="48" r="9.5" fill="${C.S}"/><circle cx="38" cy="49" r="4.6" fill="${C.O}" stroke="none"/><circle cx="62" cy="49" r="4.6" fill="${C.O}" stroke="none"/><circle cx="39.5" cy="47.4" r="1.4" fill="${C.W}" stroke="none"/><circle cx="63.5" cy="47.4" r="1.4" fill="${C.W}" stroke="none"/>
    <path d="M20 31L50 43L80 31L80 38L50 50L20 38Z" fill="${C.P}"/>
    <path d="M45 52L55 52L50 65Z" fill="${C.S}"/>`,
  cyclones:C=>`${[0,1,2,3,4].map(i=>{ const y=16+i*14, a=12+i*6, b=88-i*6; return `<path d="M${a} ${y}Q50 ${y+9} ${b} ${y}L${b-5} ${y+11}Q50 ${y+20} ${a+5} ${y+11}Z" fill="${i%2?C.S:C.P}"/>`; }).join('')}
    <path d="M42 86Q48 100 58 86Z" fill="${C.P}"/>
    <path d="M6 30L12 34M90 52L97 48M10 62L16 60M86 76L93 80" stroke="${C.S}" stroke-width="3"/>
    <rect x="84" y="20" width="7" height="5" rx="1" fill="${C.Pd}" transform="rotate(20 87 22)"/><rect x="8" y="46" width="6" height="5" rx="1" fill="${C.Pd}" transform="rotate(-24 11 48)"/>
    <path d="M30 34L44 38L42 43L33 41Z" fill="${C.W}"/><path d="M70 34L56 38L58 43L67 41Z" fill="${C.W}"/><circle cx="39" cy="40" r="2" fill="${C.O}" stroke="none"/><circle cx="61" cy="40" r="2" fill="${C.O}" stroke="none"/><path d="M27 29L46 35M73 29L54 35" stroke-width="4.5" fill="none"/>`,
  bison:C=>`${[0,1].map(i=>{ const h=`<path d="M32 36C16 37 6 28 9 12C15 22 24 26 35 26Z" fill="${C.S}"/>`; return i?M(h):h; }).join('')}
    <path d="M50 16C68 16 81 27 83 41L81 59C79 73 69 81 64 89L36 89C31 81 21 73 19 59L17 41C19 27 32 16 50 16Z" fill="${C.Pd}"/>
    <path d="M30 20L34 12L38 19L42 10L46 18L50 8L54 18L58 10L62 19L66 12L70 20" fill="${C.Pd}"/>
    <path d="M50 30C62 30 68 40 66 54L62 74C58 84 42 84 38 74L34 54C32 40 38 30 50 30Z" fill="${C.P}"/>
    <ellipse cx="50" cy="76" rx="13" ry="9" fill="${C.Pl}"/><ellipse cx="45" cy="77" rx="2.6" ry="3.4" fill="${C.O}" stroke="none"/><ellipse cx="55" cy="77" rx="2.6" ry="3.4" fill="${C.O}" stroke="none"/>
    <path d="M40 85L44 97L50 89L56 97L60 85" fill="${C.Pd}"/>
    <path d="M36 47L45 50L42 54Z" fill="${C.W}"/><path d="M64 47L55 50L58 54Z" fill="${C.W}"/><circle cx="42" cy="50.6" r="1.8" fill="${C.O}" stroke="none"/><circle cx="58" cy="50.6" r="1.8" fill="${C.O}" stroke="none"/><path d="M34 43L47 47M66 43L53 47" stroke-width="3.5" fill="none"/>`,
  cobras:C=>`<path d="M16 87C16 74 84 74 84 87C84 97 16 97 16 87Z" fill="${C.Pd}"/>
    <path d="M50 14C71 14 87 31 85 51C83 63 71 67 61 61L50 65L39 61C29 67 17 63 15 51C13 31 29 14 50 14Z" fill="${C.P}"/>
    <path d="M50 30C60 30 66 40 62 50L50 56L38 50C34 40 40 30 50 30Z" fill="${C.S}"/><circle cx="44" cy="44" r="3.4" fill="${C.Pd}" stroke="none"/><circle cx="56" cy="44" r="3.4" fill="${C.Pd}" stroke="none"/>
    <path d="M41 82C39 72 43 66 46 60L54 60C57 66 61 72 59 82Z" fill="${C.P}"/>
    <path d="M44 64H56M43 70H57M42 76H58" stroke="${C.Pd}" stroke-width="2"/>
    <path d="M50 30V39L46.5 43M50 39L53.5 43" fill="none" stroke="#e23b3b" stroke-width="2.4"/>
    <path d="M50 -1C64 -1 72 8 70 18L61 30C56 35 44 35 39 30L30 18C28 8 36 -1 50 -1Z" fill="${C.P}"/>
    <path d="M45 31L46.5 38L48.5 32ZM51.5 32L53.5 38L55 31Z" fill="${C.W}" stroke-width="1.4"/>
    <path d="M36 11L47 15L44 20L37 17Z" fill="${C.S}"/><path d="M64 11L53 15L56 20L63 17Z" fill="${C.S}"/><path d="M42 13.5V18.5M58 13.5V18.5" stroke-width="2"/><path d="M33 8L48 13M67 8L52 13" stroke-width="3.6" fill="none"/>
    <ellipse cx="46" cy="25" rx="1.4" ry="1" fill="${C.O}" stroke="none"/><ellipse cx="54" cy="25" rx="1.4" ry="1" fill="${C.O}" stroke="none"/>`,
  yetis:C=>`<path d="M50 4L58 14L70 8L72 20L86 18L82 30L96 36L86 46L96 58L84 64L90 78L76 78L74 92L62 86L50 98L38 86L26 92L24 78L10 78L16 64L4 58L14 46L4 36L18 30L14 18L28 20L30 8L42 14Z" fill="${fur(C)}"/>
    <path d="M50 28C66 28 74 40 72 56C70 72 62 80 50 80C38 80 30 72 28 56C26 40 34 28 50 28Z" fill="${C.P}"/>
    <path d="M28 43L50 50L72 43L72 49L50 57L28 49Z" fill="${C.Pd}"/>
    <path d="M35 50L45 53L42 57Z" fill="${C.W}"/><path d="M65 50L55 53L58 57Z" fill="${C.W}"/><circle cx="41" cy="53.5" r="1.8" fill="${C.O}" stroke="none"/><circle cx="59" cy="53.5" r="1.8" fill="${C.O}" stroke="none"/>
    <path d="M46 58L54 58L50 63Z" fill="${C.O}"/>
    <path d="M37 65Q50 75 63 65L59 73Q50 79 41 73Z" fill="${C.O}"/><path d="M40 67L42 73L44 68.6ZM56 68.6L58 73L60 67Z" fill="${C.W}" stroke="none"/>`,
  krakens:C=>`${[[30,58,10,72,16,90],[40,62,30,80,40,94],[60,62,70,80,60,94],[70,58,90,72,84,90],[24,48,6,52,4,36],[76,48,94,52,96,36]].map(([x0,y0,x1,y1,x2,y2])=>`<path d="M${x0} ${y0}Q${x1} ${y1} ${x2} ${y2}" fill="none" stroke="${C.O}" stroke-width="13"/><path d="M${x0} ${y0}Q${x1} ${y1} ${x2} ${y2}" fill="none" stroke="${C.P}" stroke-width="7.5"/>`).join('')}
    <path d="M50 6C71 6 83 22 81 41C79 56 67 64 50 64C33 64 21 56 19 41C17 22 29 6 50 6Z" fill="${C.P}"/>
    <path d="M50 10C62 10 70 18 72 28" fill="none" stroke="${C.Pl}" stroke-width="3"/>
    <path d="M38 54Q50 61 62 54" fill="none" stroke="${C.Pd}" stroke-width="2.6"/>
    ${_eyes(C,38,C.S)}`,
  mammoths:C=>`<path d="M50 6C74 6 90 22 88 44C86 60 76 66 70 70L30 70C24 66 14 60 12 44C10 22 26 6 50 6Z" fill="${C.Pd}"/>
    <path d="M24 16L28 8L33 14L38 5L43 12L50 3L57 12L62 5L67 14L72 8L76 16" fill="${C.Pd}"/>
    <path d="M50 22C64 22 72 34 70 48L64 62L36 62L30 48C28 34 36 22 50 22Z" fill="${C.P}"/>
    <path d="M43 58C42 74 44 86 52 94C58 99 67 94 62 88C56 86 56 76 57 58Z" fill="${C.P}"/>
    <path d="M45 66H55M45.5 73H55.5M47 80H56" stroke="${C.Pd}" stroke-width="2"/>
    <path d="M36 60C25 72 23 86 33 97C30 84 34 74 43 66Z" fill="#f4efe2"/><path d="M64 60C75 72 77 86 67 97C70 84 66 74 57 66Z" fill="#f4efe2"/>
    ${_eyes(C,40)}`,
  coyotes:C=>`<path d="M20 96L10 90L18 84L8 76L18 72L10 62L22 58L16 48L28 48" fill="${C.Pd}"/><path d="M18 96C16 72 22 54 30 43L28 9L44 30L52 17L56 34C64 36 74 42 84 48L96 54C98 58 94 62 90 62L76 64C70 70 60 72 54 77C50 85 46 91 44 97Z" fill="${C.P}"/>
    <path d="M31 33L30 18L40 31Z" fill="${C.Pd}" stroke="none"/>
    <path d="M44 97C46 86 52 77 62 71L76 65C66 76 58 85 57 97Z" fill="${fur(C)}"/>
    <path d="M74 60L94 59.5L92 64L76 66Z" fill="${C.O}"/><path d="M78 60L79.5 63L81 60ZM84 60L85.5 62.6L87 60Z" fill="${C.W}" stroke="none"/>
    <path d="M51 40L66 43L61 49L53 46Z" fill="${C.S}"/><path d="M60 42.6V47.6" stroke-width="2.4"/><path d="M48 36L69 41" stroke-width="4"/>
    <ellipse cx="95" cy="55" rx="2.6" ry="2" fill="${C.O}" stroke="none"/>
    <path d="M24 66L18 74M28 76L22 86" stroke="${C.Pd}" stroke-width="2.4"/>`,
  mantas:C=>`<path d="M42 21C37 12 39 5 44 3L48 19Z" fill="${C.P}"/><path d="M58 21C63 12 61 5 56 3L52 19Z" fill="${C.P}"/>
    <path d="M50 82V99" stroke-width="3"/>
    <path d="M50 18C62 18 70 28 80 36C88 42 96 45 98 53C86 52 76 56 70 64C64 72 58 80 50 82C42 80 36 72 30 64C24 56 14 52 2 53C4 45 12 42 20 36C30 28 38 18 50 18Z" fill="${C.P}"/>
    <path d="M50 30C58 30 63 40 60 52L50 62L40 52C37 40 42 30 50 30Z" fill="${C.S}"/>
    <path d="M26 44L40 48M74 44L60 48M22 50L36 54M78 50L64 54" stroke="${C.Pd}" stroke-width="2.4"/>
    <path d="M36 26L45 28L43 32Z" fill="${C.W}"/><path d="M64 26L55 28L57 32Z" fill="${C.W}"/><circle cx="42" cy="28.8" r="1.5" fill="${C.O}" stroke="none"/><circle cx="58" cy="28.8" r="1.5" fill="${C.O}" stroke="none"/><path d="M34 23L47 27M66 23L53 27" stroke-width="3" fill="none"/>`,
  rhinos:C=>`${[0,1].map(i=>{ const e=`<path d="M26 36L14 12L36 26Z" fill="${C.P}"/><path d="M26 30L20 18L31 26Z" fill="${C.Pd}" stroke="none"/>`; return i?M(e):e; }).join('')}
    <path d="M50 20C67 20 79 29 81 44L79 62C77 77 67 89 50 91C33 89 23 77 21 62L19 44C21 29 33 20 50 20Z" fill="${C.P}"/>
    <path d="M24 56C28 62 30 70 28 78M76 56C72 62 70 70 72 78" fill="none" stroke="${C.Pd}" stroke-width="2.6"/>
    <path d="M36 74C36 66 64 66 64 74C64 86 36 86 36 74Z" fill="${C.Pl}"/>
    <ellipse cx="44" cy="76" rx="2.4" ry="3.2" fill="${C.O}" stroke="none"/><ellipse cx="56" cy="76" rx="2.4" ry="3.2" fill="${C.O}" stroke="none"/>
    <path d="M42 70L50 2L58 70Z" fill="${C.S}"/><path d="M50 8L47 40" stroke="${C.Sl}" stroke-width="2" opacity=".9"/>
    <path d="M44 86Q50 89 56 86" fill="none" stroke-width="2.2"/>
    ${_eyes(C,46)}`,
  foxes:C=>`${[0,1].map(i=>{ const e=`<path d="M25 41L17 6L45 27Z" fill="${C.P}"/><path d="M26 34L22 16L37 28Z" fill="${C.Pd}" stroke="none"/>`; return i?M(e):e; }).join('')}
    <path d="M50 22C64 22 76 30 82 42L95 58L72 66L56 84L50 88L44 84L28 66L5 58L18 42C24 30 36 22 50 22Z" fill="${C.P}"/>
    <path d="M7 58L28 64L44 82L50 86L56 82L72 64L93 58L76 73L58 89L50 93L42 89L24 73Z" fill="${C.W}"/>
    <path d="M50 24L46 36L50 42L54 36Z" fill="${C.Pd}" stroke="none"/>
    <path d="M44 78L56 78L50 86Z" fill="${C.O}"/>
    ${_eyes(C,49,C.S)}`,
  huskies:C=>`${[0,1].map(i=>{ const e=`<path d="M24 40L22 8L46 26Z" fill="${C.P}"/><path d="M26 32L25 16L38 26Z" fill="#f2f4f7" stroke="none"/>`; return i?M(e):e; }).join('')}
    <path d="M50 20C70 20 84 34 84 52C84 72 70 86 50 88C30 86 16 72 16 52C16 34 30 20 50 20Z" fill="${C.P}"/>
    <path d="M50 30L58 44C66 44 76 48 78 58C76 72 64 82 50 84C36 82 24 72 22 58C24 48 34 44 42 44Z" fill="#f2f4f7"/>
    <path d="M50 22L45 36L50 42L55 36Z" fill="${C.Pd}" stroke="none"/>
    <ellipse cx="50" cy="66" rx="7" ry="5" fill="${C.O}"/><ellipse cx="48" cy="64.5" rx="2" ry="1.1" fill="${C.W}" stroke="none"/>
    <path d="M42 74Q50 80 58 74" fill="none" stroke-width="2.4"/>
    <path d="M32 50L45 53L42 58L34 56Z" fill="#7fd3ff"/><path d="M68 50L55 53L58 58L66 56Z" fill="#7fd3ff"/><circle cx="41" cy="54.4" r="2" fill="${C.O}" stroke="none"/><circle cx="59" cy="54.4" r="2" fill="${C.O}" stroke="none"/><path d="M29 45L47 50M71 45L53 50" stroke-width="4.2" fill="none"/>`
};
const DETAIL={
  phoenix:C=>`<path d="M44 36C46 40 48 44 50 46" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".7"/><path d="M48 50L50 66M44 56L46 70M56 56L54 70" fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".85"/><path d="M14 26L22 32M86 26L78 32" stroke="${C.Sl}" stroke-width="2" opacity=".8"/>`,
  dragons:C=>`<path d="M30 52C26 62 24 74 24 88M38 50C34 62 32 76 32 92" fill="none" stroke="${C.Pd}" stroke-width="2.2" opacity=".8"/><path d="M36 42C46 34 56 30 66 30" fill="none" stroke="${C.Pl}" stroke-width="2.6" opacity=".7"/><path d="M30 8C33 16 38 22 44 26" fill="none" stroke="${C.Sl}" stroke-width="1.8"/>`,
  gators:C=>`<path d="M16 42C24 37 34 34 44 34" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="${C.Pd}" stroke="none"><circle cx="70" cy="36" r="1.3"/><circle cx="76" cy="38" r="1.3"/><circle cx="82" cy="40" r="1.3"/><circle cx="73" cy="42" r="1.3"/><circle cx="79" cy="44" r="1.3"/></g><path d="M30 68L40 67M46 66L56 65M62 64L72 63" stroke="${C.P}" stroke-width="1.6" opacity=".8"/>`,
  scorpions:C=>`<path d="M44 44C46 42 50 41 54 42" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".75"/><path d="M12 80C14 76 18 74 22 76" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".7"/><path d="M88 80C86 76 82 74 78 76" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".7"/><path d="M84 12L87 18" stroke="${C.Sl}" stroke-width="1.8"/>`,
  owls:C=>`<g fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".85"><path d="M38 70L44 74L50 70L56 74L62 70M34 77L40 81L46 77M54 77L60 81L66 77"/></g><path d="M26 30C32 24 40 22 46 24" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><path d="M16 56C14 66 18 76 24 82M84 56C86 66 82 76 76 82" fill="none" stroke="${C.Pd}" stroke-width="2.2" opacity=".8"/>`,
  cyclones:C=>`<path d="M22 22Q50 30 78 22" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".7"/><path d="M36 64Q50 70 64 64" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".6"/><path d="M44 78Q50 82 56 78" fill="none" stroke="${C.Sl}" stroke-width="2" opacity=".7"/>`,
  bison:C=>`<path d="M42 34C46 32 54 32 58 34" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="none" stroke="${C.P}" stroke-width="2" opacity=".7"><path d="M24 50L28 54M22 60L27 62M76 50L72 54M78 60L73 62M26 70L30 72M74 70L70 72"/></g><path d="M12 16C16 20 22 24 28 25" fill="none" stroke="${C.Sl}" stroke-width="1.8"/><path d="M88 16C84 20 78 24 72 25" fill="none" stroke="${C.Sl}" stroke-width="1.8"/>`,
  cobras:C=>`<path d="M24 34C28 24 36 18 44 16" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="${C.Pd}" stroke="none" opacity=".8"><circle cx="24" cy="48" r="1.6"/><circle cx="28" cy="56" r="1.6"/><circle cx="76" cy="48" r="1.6"/><circle cx="72" cy="56" r="1.6"/></g><path d="M24 84C34 80 66 80 76 84" fill="none" stroke="${C.P}" stroke-width="2" opacity=".7"/><path d="M42 6C46 4 54 4 58 6" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".75"/>`,
  yetis:C=>`<path d="M38 32C44 29 56 29 62 32" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="none" stroke="#b9c2cc" stroke-width="1.6" opacity=".9"><path d="M20 24L26 30M80 24L74 30M12 52L20 52M88 52L80 52M22 74L28 70M78 74L72 70"/></g>`,
  krakens:C=>`<g fill="${C.S}" stroke="none"><circle cx="14" cy="80" r="1.6"/><circle cx="12" cy="86" r="1.4"/><circle cx="34" cy="86" r="1.6"/><circle cx="38" cy="92" r="1.4"/><circle cx="66" cy="86" r="1.6"/><circle cx="62" cy="92" r="1.4"/><circle cx="86" cy="80" r="1.6"/><circle cx="88" cy="86" r="1.4"/><circle cx="6" cy="44" r="1.4"/><circle cx="94" cy="44" r="1.4"/></g><g fill="${C.Pd}" stroke="none" opacity=".75"><circle cx="30" cy="22" r="2.6"/><circle cx="70" cy="20" r="2.2"/><circle cx="26" cy="32" r="1.6"/></g>`,
  mammoths:C=>`<path d="M40 26C44 24 56 24 60 26" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="none" stroke="${C.P}" stroke-width="2" opacity=".7"><path d="M18 40L22 46M16 50L21 54M82 40L78 46M84 50L79 54"/></g><path d="M30 72C28 80 29 88 33 94M70 72C72 80 71 88 67 94" fill="none" stroke="#c9c1ad" stroke-width="1.6"/>`,
  coyotes:C=>`<path d="M36 46C42 40 52 37 60 37" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><path d="M60 52C66 54 72 56 78 56" fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".85"/><path d="M50 88C52 82 56 78 60 76" fill="none" stroke="#b9c2cc" stroke-width="1.6"/>`,
  mantas:C=>`<path d="M30 34C38 26 44 22 50 22" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><path d="M50 36V54" stroke="${C.Sd}" stroke-width="2" opacity=".8"/><g fill="${C.Pd}" stroke="none" opacity=".8"><circle cx="18" cy="46" r="1.4"/><circle cx="82" cy="46" r="1.4"/></g>`,
  rhinos:C=>`<path d="M30 30C38 25 44 24 46 24M70 30C62 25 56 24 54 24" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="${C.Pd}" stroke="none" opacity=".8"><circle cx="30" cy="66" r="1.4"/><circle cx="70" cy="66" r="1.4"/><circle cx="34" cy="60" r="1.2"/><circle cx="66" cy="60" r="1.2"/></g>`,
  foxes:C=>`<path d="M36 28C42 25 58 25 64 28" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="none" stroke="#b9c2cc" stroke-width="1.6"><path d="M18 62L28 66M82 62L72 66M24 70L32 72M76 70L68 72"/></g><g fill="${C.O}" stroke="none" opacity=".7"><circle cx="42" cy="72" r=".9"/><circle cx="58" cy="72" r=".9"/></g>`,
  huskies:C=>`<path d="M34 26C40 22 60 22 66 26" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/><g fill="none" stroke="#b9c2cc" stroke-width="1.6"><path d="M24 66L32 68M76 66L68 68M28 74L35 74M72 74L65 74"/></g>`
};
const LIST=[['phoenix','Phoenix',['Phoenix','Firebirds','Flames']],['dragons','Dragons',['Dragons','Wyverns']],['gators','Gators',['Gators','Crocs']],['scorpions','Scorpions',['Scorpions','Stingers']],
  ['owls','Owls',['Owls','Night Owls']],['cyclones','Cyclones',['Cyclones','Hurricanes','Twisters']],['bison','Bison',['Bison','Buffaloes','Stampede']],['cobras','Cobras',['Cobras','Vipers','Rattlers']],
  ['yetis','Yetis',['Yetis','Sasquatch','Avalanche']],['krakens','Krakens',['Krakens','Octopi']],['mammoths','Mammoths',['Mammoths','Titans']],['coyotes','Coyotes',['Coyotes','Jackals']],
  ['mantas','Stingrays',['Stingrays','Mantas']],['rhinos','Rhinos',['Rhinos','Juggernauts']],['foxes','Foxes',['Foxes','Silver Foxes']],['huskies','Huskies',['Huskies','Malamutes']]];
for(const [k,n,alt] of LIST){ MASCOT_ART[k]=ART[k]; MASCOT_DETAIL[k]=DETAIL[k]; MASCOT_LIST.push([k,n,alt]); MASCOT_KEYS.push(k); MASCOT_BY[k]={k,n,alt}; }
})();
