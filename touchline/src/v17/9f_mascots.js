/* ===================== v18.18 MASCOTS, REDRAWN =====================
   The weakest marks are redrawn as full sports-logo heads in the same construction as the rest (team-colour fills, the dark
   3px keyline from mascotInner, shading in the darker / lighter tones, white eyes and teeth, the shared ring + gloss filter):
   rams, dragons, gators, coyotes, mustangs, rhinos. Every school still gets its own colours. Identifiers v1818m. */
(function(){
const M=x=>`<g transform="translate(100 0) scale(-1 1)">${x}</g>`;
const N='stroke="none"';
const ART={
  /* a ram head, straight on: spiral horns with ridges, a wool cap, a long face, a pale muzzle, an angry brow */
  rams:C=>{ const sp='M41 31C36 15 17 11 9 25C2 38 9 55 22 56C31 57 35 48 30 42C26 38 20 40 20 46C20 50 24 52 27 50';
    const half=`<path d="${sp}" fill="none" stroke="${C.O}" stroke-width="16" stroke-linecap="round"/>
    <path d="${sp}" fill="none" stroke="${C.S}" stroke-width="11" stroke-linecap="round"/>
    <path d="${sp}" fill="none" stroke="${C.Sd}" stroke-width="10" stroke-dasharray="1.8 4.2" opacity=".75"/>
    <path d="M37 22C31 14 19 13 13 21C9 27 8 34 9 40" fill="none" stroke="${C.Sl}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M33 47C27 45 20 48 17 53C22 56 29 56 34 52Z" fill="${C.P}"/><path d="M32 49C27 48 23 50 21 53C25 54 29 54 32 52Z" fill="${C.Pd}" ${N}/>`;
    return `${half}${M(half)}
    <path d="M50 21C61 21 68 28 68 40L65 62C63 75 57 85 50 91C43 85 37 75 35 62L32 40C32 28 39 21 50 21Z" fill="${C.P}"/>
    <path d="M50 28C55 28 58 33 58 39L56 60C55 68 53 74 50 78C47 74 45 68 44 60L42 39C42 33 45 28 50 28Z" fill="${C.Pd}" ${N} opacity=".35"/>
    <path d="M34 34C34 22 43 16 50 18C57 16 66 22 66 34C62 30 58 31 56 34C54 30 46 30 44 34C42 31 38 30 34 34Z" fill="${C.Pl}"/>
    <g fill="none" stroke="${C.P}" stroke-width="1.8" opacity=".8"><path d="M41 24Q44 27 42 30M50 21Q53 24 51 28M58 24Q61 27 59 30"/></g>
    <path d="M40 66C40 61 45 58 50 58C55 58 60 61 60 66C60 79 55 87 50 91C45 87 40 79 40 66Z" fill="${C.Pl}"/>
    <path d="M44 73C44 70 46.4 69 47.8 70.6C48.8 71.8 48 74.6 46.4 75.2C45 75.6 44 75 44 73Z" fill="${C.O}" ${N}/><path d="M56 73C56 70 53.6 69 52.2 70.6C51.2 71.8 52 74.6 53.6 75.2C55 75.6 56 75 56 73Z" fill="${C.O}" ${N}/>
    <path d="M45 83Q50 87 55 83" fill="none" stroke-width="2.4"/><path d="M50 78V84" stroke-width="2"/>
    <path d="M34 45L47 47L46 54L37 53Z" fill="${C.W}"/><path d="M66 45L53 47L54 54L63 53Z" fill="${C.W}"/>
    <circle cx="43.4" cy="50.2" r="2.6" fill="${C.O}" ${N}/><circle cx="56.6" cy="50.2" r="2.6" fill="${C.O}" ${N}/><circle cx="44.2" cy="49.3" r=".9" fill="${C.W}" ${N}/><circle cx="57.4" cy="49.3" r=".9" fill="${C.W}" ${N}/>
    <path d="M33 41L48 45.5M67 41L52 45.5" stroke-width="3.4" fill="none"/>`; },
  /* a dragon head in profile, jaws wide open: swept horns, a spiked frill, fangs, a glowing slit eye, belly plates down the neck */
  dragons:C=>`
    <path d="M42 30C34 18 22 8 4 4C16 12 26 22 30 36Z" fill="${C.S}"/><path d="M36 24C28 17 18 11 9 8" fill="none" stroke="${C.Sl}" stroke-width="2" opacity=".8"/>
    <path d="M52 28C50 16 44 6 34 -2C40 10 42 20 40 32Z" fill="${C.S}"/>
    <path d="M30 40L10 31L22 46L2 50L22 58L8 70L28 66L24 82L38 70Z" fill="${C.Pd}"/>
    <path d="M26 58C28 74 32 86 36 99L66 99C60 87 55 75 55 62Z" fill="${C.P}"/>
    <g fill="${C.Pl}"><path d="M38 72L53 70L54 77L40 79Z"/><path d="M40 82L56 80L57 87L42 89Z"/><path d="M43 92L59 90L60 98L44 99Z"/></g>
    <path d="M50 56L91 51L86 70L56 66Z" fill="#4a0a12"/>
    <path d="M58 62C66 58 76 58 84 60C78 64 68 66 58 62Z" fill="#e0607a" ${N}/>
    <path d="M26 47C26 32 37 23 52 24C63 25 71 29 77 34L94 39C98 40 99 47 95 49L91 51L52 56C38 58 26 56 26 47Z" fill="${C.P}"/>
    <path d="M30 39C38 29 52 27 64 30" fill="none" stroke="${C.Pl}" stroke-width="2.6" opacity=".75"/>
    <path d="M50 62L86 70C90 71 90 76 86 77L62 80C54 81 48 74 47 68Z" fill="${C.P}"/>
    <path d="M54 74C62 76 72 76 82 75" fill="none" stroke="${C.Pl}" stroke-width="2" opacity=".8"/>
    <g fill="${C.W}"><path d="M60 55.2L62.6 63.4L65.6 54.6Z"/><path d="M72 53.8L74 60.8L76.6 53.4Z"/><path d="M82.4 52.6L83.8 57.6L85.8 52.4Z"/><path d="M64 66.4L67.4 59.8L69.6 67.4Z"/><path d="M76 69L78.4 63.8L80.2 69.6Z"/></g>
    <path d="M88 41.5C90 40.6 92.5 41.4 92.6 43" fill="none" stroke-width="2.6"/>
    <path d="M42 36C50 30 62 29 72 34L68 37.5L46 40.5Z" fill="${C.Pd}"/>
    <path d="M49 41L67 38.5L61 46.5Z" fill="${C.S}"/><ellipse cx="59" cy="42.2" rx="1.3" ry="3.2" fill="${C.O}" ${N}/>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".85"><path d="M32 45C34 49 38 51 42 51M36 52C38 54 42 54 46 54"/></g>`,
  /* a gator rising from the water, jaws open: eye bump with a slit pupil, a zigzag of teeth, scutes along the back */
  gators:C=>`
    <path d="M8 90C8 66 18 50 34 44L44 62C40 72 36 80 34 92Z" fill="${C.P}"/>
    <g fill="${C.Pd}"><path d="M10 78L13 70L17 76Z"/><path d="M14 66L18 58L22 64Z"/><path d="M20 56L26 49L29 56Z"/></g>
    <path d="M42 51L96 44L90 62L48 63Z" fill="#4a0a12"/><path d="M56 59C66 55 76 55 86 57C78 61 66 62 56 59Z" fill="#e0607a" ${N}/>
    <path d="M34 44C36 32 46 25 58 26L92 32C99 34 99 42 93 44L50 52C42 53 36 50 34 44Z" fill="${C.P}"/>
    <path d="M44 30C46 22 52 18 58 19C64 20 66 26 64 32Z" fill="${C.P}"/><circle cx="92.4" cy="35" r="4.6" fill="${C.P}"/><circle cx="93.4" cy="34.2" r="1.2" fill="${C.O}" ${N}/>
    <path d="M48 27L62 24.6L59 30.4L50 30.6Z" fill="${C.S}"/><ellipse cx="55.4" cy="27.4" rx="1.2" ry="2.8" fill="${C.O}" ${N}/><path d="M45 23.6L62 21" stroke-width="3.2"/>
    <g fill="${C.Pd}" ${N} opacity=".7"><ellipse cx="70" cy="34" rx="3.2" ry="1.8"/><ellipse cx="79" cy="35.4" rx="2.8" ry="1.6"/><ellipse cx="42" cy="40" rx="2.6" ry="1.8"/><ellipse cx="60" cy="37" rx="2.6" ry="1.6"/><ellipse cx="86" cy="37.6" rx="2" ry="1.3"/></g>
    <path d="M40 62L90 61C96 62 96 69 90 70L56 74C47 74 40 69 40 62Z" fill="${C.Pl}"/>
    <path d="M40 66C38 76 38 84 40 94L54 94C51 86 51 78 55 73Z" fill="${C.Pl}"/><g fill="none" stroke="${C.P}" stroke-width="1.8" opacity=".7"><path d="M40 79H52M40 86H52"/></g>
    <g fill="${C.W}"><path d="M52 51.2L54.4 57L56.8 50.8Z"/><path d="M60.4 50.2L62.6 56L65 49.8Z"/><path d="M69 49L71 54.6L73.2 48.6Z"/><path d="M77.6 47.8L79.4 53L81.4 47.4Z"/><path d="M86 46.8L87.4 51L89 46.4Z"/><path d="M57 63.4L59.4 58.4L61.8 63.6Z"/><path d="M66 63L68.4 58L70.6 63Z"/><path d="M75 62.4L77.2 57.6L79.4 62.4Z"/><path d="M84 61.6L85.6 57.6L87.4 61.6Z"/></g>
    <path d="M2 94Q12 86 22 94T42 94T62 94T82 94T100 92L100 100L2 100Z" fill="${C.S}"/><path d="M6 97Q14 93 22 97M44 97Q52 93 60 97M76 97Q84 93 92 97" fill="none" stroke="${C.Sd}" stroke-width="1.8"/>`,
  /* a coyote howling at a full moon */
  coyotes:C=>`
    <circle cx="70" cy="34" r="27" fill="${C.S}"/><g fill="${C.Sd}" ${N} opacity=".5"><circle cx="80" cy="24" r="4.6"/><circle cx="88" cy="40" r="3.2"/><circle cx="76" cy="52" r="3.6"/><circle cx="64" cy="14" r="2.4"/></g>
    <g transform="translate(-4 -3) scale(1.08)">
    <path d="M28 99C26 84 30 70 38 60L62 56C68 66 72 82 74 99Z" fill="${C.P}"/>
    <path d="M38 99L42 90L36 86L44 82L38 76L46 73L42 67L52 69L50 62L60 65L60 58L68 70L66 80L72 86L70 99Z" fill="${C.W}"/>
    <path d="M38 64C32 54 31 44 35 37L44 30L56 26L61 8L69 27C73 36 71 48 63 57L54 64Z" fill="${C.P}"/>
    <path d="M60.6 12L65 25.5L58.4 26.4Z" fill="${C.Pd}" ${N}/>
    <path d="M37 34L19 11C17 8.4 20 5.4 23 7.4L51 26Z" fill="${C.P}"/>
    <path d="M23.4 13.4L42 33L38.4 39.4L20.8 22.4Z" fill="#4a0a12"/><path d="M25 19C31 24 36 29 40 34" stroke="#e0607a" stroke-width="3.4" ${N}/>
    <path d="M33 44L19 25C17.4 22.8 20 20.4 22.4 22L45 36Z" fill="${C.Pd}"/>
    <g fill="${C.W}"><path d="M28 16.6L28.6 20.6L31.4 18.8Z"/><path d="M24.4 23.4L27 21.6L27.8 25Z"/></g>
    <ellipse cx="20.4" cy="8.6" rx="3" ry="2.4" transform="rotate(45 20.4 8.6)" fill="${C.O}" ${N}/>
    <path d="M44 37Q48.4 33.6 53 36" fill="none" stroke-width="2.6"/><path d="M42 33L54 30" stroke-width="2.4"/>
    <path d="M36 46L30 50L37 52L31 58L39 58" fill="${C.Pl}"/>
    <g fill="none" stroke="${C.Pd}" stroke-width="1.8" opacity=".85"><path d="M42 48C46 52 52 54 58 52M44 56C48 58 52 59 56 58"/></g>
    <path d="M46 30C52 28 58 30 62 34" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".7"/></g>`,
  /* a mustang in profile, mane flying */
  mustangs:C=>`
    <path d="M46 12C34 16 24 28 22 42L10 50L22 54L8 66L24 68L14 82L32 78L32 96L48 92Z" fill="${C.S}"/>
    <g fill="none" stroke="${C.Sd}" stroke-width="2" opacity=".8"><path d="M40 18C32 26 28 36 28 46M34 56C28 62 24 68 22 74M38 70C36 78 36 86 38 92"/></g>
    <path d="M38 98C36 78 38 60 44 46C46 34 52 26 60 22L64 8L70 22C76 26 80 32 84 42L92 58C96 66 93 72 86 72L78 72C74 72 71 70 69 66C64 72 62 80 62 98Z" fill="${C.P}"/>
    <path d="M64 10L67.6 21L62 22Z" fill="${C.Pd}"/>
    <path d="M58 24C52 28 50 34 52 40C56 34 60 30 66 28Z" fill="${C.S}"/>
    <path d="M78 54L91 59C95 66 92 72 86 72L78 72C73 71 71 66 73 60Z" fill="${C.Pl}"/><ellipse cx="86.4" cy="64.4" rx="2.4" ry="3.2" fill="${C.O}" ${N}/>
    <path d="M78 70C80 73 84 74 86 73" fill="none" stroke-width="2"/>
    <path d="M64 38L76 36L74 42L66 42Z" fill="${C.W}"/><circle cx="70.4" cy="39.6" r="2.1" fill="${C.O}" ${N}/><path d="M62 35L78 32" stroke-width="3"/>
    <g fill="none" stroke="${C.Pd}" stroke-width="2" opacity=".8"><path d="M58 50C62 56 66 60 70 62M48 60C50 70 52 80 52 92"/></g>
    <path d="M60 46C66 44 72 46 76 50" fill="none" stroke="${C.Pl}" stroke-width="2.2" opacity=".7"/>`,
  /* a charging rhino: a great horn, a second horn, armoured folds */
  rhinos:C=>`
    <path d="M4 99C2 82 8 70 20 64L38 80L34 99Z" fill="${C.P}"/>
    <path d="M12 56C12 40 25 30 42 30L58 32C68 34 76 42 82 52L93 64C97 72 93 80 85 80L60 82C44 84 28 80 20 72C15 67 12 62 12 56Z" fill="${C.P}"/>
    <path d="M76 56C79 42 86 30 97 21C97 36 94 50 89 64Z" fill="${C.S}"/><path d="M82 46C85 38 89 32 94 27" fill="none" stroke="${C.Sl}" stroke-width="2.2" opacity=".9"/>
    <path d="M64 42C65 34 68 28 74 23C74 32 73 38 71 44Z" fill="${C.S}"/>
    <path d="M28 34L18 14L38 27Z" fill="${C.P}"/><path d="M27.6 30L22 19.6L33.4 27Z" fill="${C.Pd}" ${N}/>
    <path d="M44 32C50 30 58 31 64 34L62 40C56 37 50 36 44 37Z" fill="${C.Pd}"/>
    <path d="M50 46L63 43.6L61 50L52 50.4Z" fill="${C.W}"/><circle cx="57.4" cy="47.2" r="2.1" fill="${C.O}" ${N}/><path d="M48 42.6L65 39.4" stroke-width="3.2"/>
    <path d="M70 76C76 79 84 79 89 76" fill="none" stroke-width="2.4"/><ellipse cx="88" cy="68" rx="1.8" ry="2.8" fill="${C.O}" ${N}/>
    <path d="M22 70C34 78 50 80 66 78" fill="none" stroke="${C.Pd}" stroke-width="2.4"/>
    <g fill="none" stroke="${C.Pd}" stroke-width="2.2"><path d="M30 40C26 50 26 60 32 70M40 42C38 54 40 64 46 74M70 58C66 64 64 70 64 78"/><path d="M12 78C16 84 18 92 18 99"/></g>
    <path d="M24 44C30 38 38 35 46 34" fill="none" stroke="${C.Pl}" stroke-width="2.4" opacity=".7"/>`,
};
for(const k in ART){ MASCOT_ART[k]=ART[k]; MASCOT_DETAIL[k]=()=>''; }
})();
