'use strict';
/* ====================== Jigsaw art: subjects B ======================
   Animals, creatures and plants for the jigsaw scenes: woodland and farm animals, wild animals, trees and flowers,
   water birds and whales, flying creatures, sea life and two space oddities. Each is drawn around its own origin
   (0,0 = middle of its base, up is -y, about 100 units tall); body colours go through o.c() so the time of day tints
   them, and things that give off light use raw colours and glow at night. */
(()=>{const {f,mix,lighten,darken,lin,rad,P,glowDef,glow,cloud,bird,spark,flower,tuft}=JIGART.h;
/* a small kit bound to one drawing: tinted gradients, a ground shadow, shiny eyes, cheek blush and mirroring */
const K=o=>{const c=o.c,u=n=>`url(#${o.id}${n})`;
  const L=(n,a,b,x2=0,y2=1)=>lin(o.id+n,[[0,c(a)],[1,c(b)]],x2,y2);
  const L3=(n,a,b,d,x2=0,y2=1)=>lin(o.id+n,[[0,c(a)],[.5,c(b)],[1,c(d)]],x2,y2);
  const Rg=(n,a,b,cx=.42,cy=.35,r=.75)=>rad(o.id+n,[[0,c(a)],[1,c(b)]],cx,cy,r);
  const sh=(rx,x=0,op=.2)=>`<ellipse cx="${f(x)}" cy="1" rx="${f(rx)}" ry="${f(Math.max(2.6,rx*.12))}" fill="${c('#1a2010')}" opacity="${op}"/>`;
  const eye=(x,y,r,col='#1e1410')=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r*1.15)}" fill="${c(col)}"/><circle cx="${f(x+r*.32)}" cy="${f(y-r*.42)}" r="${f(r*.42)}" fill="#fff"/><circle cx="${f(x-r*.36)}" cy="${f(y+r*.44)}" r="${f(r*.2)}" fill="#fff" opacity=".8"/>`;
  const bl=(x,y,r)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r*.62)}" fill="${c('#ff6f8e')}" opacity=".42"/>`;
  const mir=(a,s)=>`<g transform="matrix(-1 0 0 1 ${f(2*a)} 0)">${s}</g>`;
  const ln=(d,col,w=1,op=1)=>`<path d="${d}" fill="none" stroke="${c(col)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op<1?` opacity="${op}"`:''}/>`;
  return{c,u,L,L3,Rg,sh,eye,bl,mir,ln}};
/* a circle as path data, so many dots can share one <path> */
const circ=(x,y,r)=>`M${f(x-r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2*r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2*r)} 0`;

/* ---------------------------------------------------------------- woodland */
JIGART.subject({id:'fox',name:'Red Fox',biomes:['forest','meadow','autumn','snow'],place:'ground',w:.85,draw:o=>{const k=K(o),{c,u}=k,dk=c('#3a2016');
  return `<defs>${k.L('f','#ffa252','#d9541c')}${k.L('t','#ff9a46','#c9481a',1,0)}${k.L('w','#ffffff','#f1e0d0')}${k.Rg('h','#ffb46a','#e05e1e',.45,.3,.8)}</defs>${k.sh(44,-10)}
  <path d="M-6 -4C-36 4 -64 -16 -58 -46C-55 -62 -42 -70 -32 -62C-44 -52 -42 -30 -14 -22Z" fill="${u('t')}"/>
  <path d="M-58 -46C-55 -62 -42 -70 -32 -62L-38 -55L-41 -58L-44 -51L-48 -54L-51 -48L-55 -50Z" fill="${c('#fff6ec')}"/>
  ${k.ln('M-48 -26C-52 -32 -54 -38 -54 -44M-38 -14C-44 -16 -49 -20 -52 -26M-27 -9C-32 -9 -37 -11 -41 -14M-44 -34C-46 -40 -46 -46 -44 -50','#b8401a',1.2,.8)}
  <path d="M-24 0C-30 -16 -26 -40 -12 -50C-2 -57 14 -56 20 -46C26 -32 24 -12 20 0Z" fill="${u('f')}"/>
  <ellipse cx="-12" cy="-15" rx="14" ry="14" fill="${c('#e8682a')}"/>${k.ln('M-24 -14C-24 -24 -17 -29 -8 -29','#b8441a',1.3)}
  <ellipse cx="-15" cy="-2.2" rx="10" ry="3.8" fill="${dk}"/>
  <path d="M-4 -55C8 -55 16 -45 14 -31C13 -23 8 -18 4 -21L2 -16L0 -21L-3 -17L-4 -24C-8 -34 -10 -47 -4 -55Z" fill="${u('w')}"/>
  ${k.ln('M0 -44q2 2 4 0M2 -38q2 2 4 0M-1 -32q2 2 4 0','#e2cbb4',.9)}
  ${[1,11].map(x=>`<rect x="${x}" y="-28" width="8" height="28" rx="4" fill="${u('f')}"/><path d="M${x} -13h8v10a4 4 0 0 1 -8 0Z" fill="${dk}"/><ellipse cx="${x+4}" cy="-1.6" rx="5.6" ry="3" fill="${dk}"/>${k.ln(`M${x+2.4} -1v-1.6M${x+5.6} -1v-1.6`,'#6a4434',.7)}`).join('')}
  <path d="M-12 -80C-18 -90 -18 -100 -15 -106C-6 -102 0 -96 2 -88Z" fill="${u('f')}"/><path d="M-11 -84C-14 -91 -14 -97 -13 -101C-8 -98 -4 -94 -2 -89Z" fill="${dk}"/><path d="M-10 -86C-11 -90 -11 -93 -10 -95C-8 -92 -6 -90 -5 -88Z" fill="${c('#fff1e0')}"/>
  ${k.mir(6,`<path d="M-12 -80C-18 -90 -18 -100 -15 -106C-6 -102 0 -96 2 -88Z" fill="${u('f')}"/><path d="M-11 -84C-14 -91 -14 -97 -13 -101C-8 -98 -4 -94 -2 -89Z" fill="${dk}"/><path d="M-10 -86C-11 -90 -11 -93 -10 -95C-8 -92 -6 -90 -5 -88Z" fill="${c('#fff1e0')}"/>`)}
  <path d="M6 -92C-6 -92 -14 -86 -15 -76L-22 -63C-12 -63 -3 -57 6 -53C15 -57 24 -63 34 -63L27 -76C26 -86 18 -92 6 -92Z" fill="${u('h')}"/>
  <path d="M-22 -63C-12 -63 -3 -57 6 -53C15 -57 24 -63 34 -63C27 -67 20 -71 14 -69C12 -65 0 -65 -2 -69C-8 -71 -15 -67 -22 -63Z" fill="${c('#fffaf4')}"/>
  <path d="M6 -88C3 -82 2 -76 4 -69H8C10 -76 9 -82 6 -88Z" fill="${c('#ffcf98')}" opacity=".75"/>
  ${k.eye(-2.5,-74,3.5)}${k.eye(14.5,-74,3.5)}${k.ln('M-6.5 -75.5l-3 1.2M18.5 -75.5l3 1.2','#3a2016',1.1)}
  <path d="M2.4 -62.6Q6 -64.8 9.6 -62.6Q8 -59.4 6 -59.1Q4 -59.4 2.4 -62.6Z" fill="${dk}"/><ellipse cx="4.6" cy="-62.6" rx="1.2" ry=".6" fill="#fff" opacity=".7"/>
  ${k.ln('M6 -59.1v1.6M3.4 -56.9Q6 -55 6 -57.5Q6 -55 8.6 -56.9','#3a2016',.9)}${k.bl(-9,-65.5,3.6)}${k.bl(21,-65.5,3.6)}
  ${k.ln('M-16 -60l-3 1M-15 -58l-3 2M28 -60l3 1M27 -58l3 2','#e8d4c4',.7)}`}});

JIGART.subject({id:'owl',name:'Wise Owl',biomes:['forest','autumn','snow','mountains'],place:'ground',w:.8,draw:o=>{const k=K(o),{c,u}=k,n=o.night;
  const ir=n?rad(o.id+'e',[[0,'#fff8c0'],[.55,'#ffd83a'],[1,'#ff9a00']]):rad(o.id+'e',[[0,c('#fff4a8')],[.55,c('#ffc834')],[1,c('#d88600')]]);
  return `<defs>${k.Rg('b','#c8925e','#7a4e2c',.5,.32,.7)}${k.L('w','#fcf0de','#e6cba6')}${lin(o.id+'s',[[0,c('#5e381e')],[.45,c('#9a6a40')],[1,c('#4e2c16')]],1,0)}${k.L('tp','#f2d29c','#d6a66a')}${ir}${glowDef(o.id+'g','#ffe066',.75)}</defs>${k.sh(44)}
  <path d="M-40 1C-32 -1 -27 -6 -26 -14L-25 -34H25L26 -14C27 -6 32 -1 40 1Z" fill="${u('s')}"/>
  ${k.ln('M-18 -32C-16 -24 -19 -16 -17 -5M-8 -31C-6 -22 -9 -12 -7 -2M5 -31C7 -22 4 -14 6 -3M16 -30C14 -22 17 -14 15 -4M-26 -12C-28 -6 -32 -2 -38 0M26 -12C28 -6 32 -2 38 0','#3e2210',1.2,.55)}
  <ellipse cx="11" cy="-17" rx="3.2" ry="4.4" fill="${c('#3e2210')}"/><ellipse cx="11" cy="-17" rx="5" ry="6.4" fill="none" stroke="${c('#6e4628')}" stroke-width="1.2"/>
  <ellipse cy="-34" rx="25" ry="6" fill="${u('tp')}"/><g fill="none" stroke="${c('#b8884e')}" stroke-width=".8"><ellipse cy="-34" rx="18" ry="4.2"/><ellipse cy="-34" rx="11" ry="2.6"/><ellipse cy="-34" rx="4" ry="1"/></g><ellipse cy="-34" rx="25" ry="6" fill="none" stroke="${c('#5a341c')}" stroke-width="1.6"/>
  <g fill="${c('#6eaa3a')}"><ellipse cx="-20" cy="-30" rx="7" ry="3"/><ellipse cx="-24" cy="-26" rx="3" ry="4.5"/><ellipse cx="-14" cy="-29" rx="4" ry="2.2"/></g><g fill="${c('#8ccc4e')}"><circle cx="-21" cy="-31" r="1.4"/><circle cx="-24.5" cy="-27" r="1"/></g>
  <g transform="translate(31 0)"><path d="M-1.6 0V-6.5H1.6V0Z" fill="${c('#f6ecd8')}"/><path d="M-6 -6C-6 -12.5 6 -12.5 6 -6Z" fill="${c('#e8402e')}"/><circle cx="-2.4" cy="-8.6" r="1.1" fill="${c('#fff')}"/><circle cx="1.8" cy="-10" r=".9" fill="${c('#fff')}"/><circle cx="3.4" cy="-7.2" r=".7" fill="${c('#fff')}"/></g>
  <path d="M-21 -86C-24 -94 -26 -100 -27 -107C-20 -103 -14 -99 -10 -94Z" fill="${c('#7a4e2c')}"/>${k.mir(0,`<path d="M-21 -86C-24 -94 -26 -100 -27 -107C-20 -103 -14 -99 -10 -94Z" fill="${c('#7a4e2c')}"/>`)}
  <path d="M0 -99C17 -99 25 -87 25 -69C25 -49 17 -37 0 -36C-17 -37 -25 -49 -25 -69C-25 -87 -17 -99 0 -99Z" fill="${u('b')}"/>
  <ellipse cx="0" cy="-52" rx="15" ry="16" fill="${u('w')}"/>
  ${[[-56,3],[-50,4],[-44,3]].map(([y,nn],r)=>Array.from({length:nn},(_,i)=>{const x=(i-(nn-1)/2)*6.5;return k.ln(`M${f(x-2.2)} ${y}l2.2 2.4l2.2 -2.4`,'#b0885a',1)}).join('')).join('')}
  <path d="M-24 -76C-34 -62 -32 -44 -17 -37C-20 -50 -20 -64 -24 -76Z" fill="${c('#6e4426')}"/>${k.ln('M-27 -62q3 1 5 -1M-28 -55q3 1 6 -1M-26 -48q3 1 6 -1','#a8784a',1)}
  ${k.mir(0,`<path d="M-24 -76C-34 -62 -32 -44 -17 -37C-20 -50 -20 -64 -24 -76Z" fill="${c('#6e4426')}"/>${k.ln('M-27 -62q3 1 5 -1M-28 -55q3 1 6 -1M-26 -48q3 1 6 -1','#a8784a',1)}`)}
  ${k.ln('M-8 -94q2 -1.5 4 0M4 -94q2 -1.5 4 0M-2 -97q2 -1.5 4 0','#8a5a34',.9)}
  <circle cx="-9" cy="-76" r="11" fill="${c('#f6e6cc')}"/><circle cx="9" cy="-76" r="11" fill="${c('#f6e6cc')}"/>
  ${n?glow(o.id+'g',-9,-76,13)+glow(o.id+'g',9,-76,13):''}
  ${[-9,9].map(x=>`<circle cx="${x}" cy="-76" r="7.4" fill="url(#${o.id}e)"/><circle cx="${x}" cy="-76" r="7.4" fill="none" stroke="${c('#9a6a2a')}" stroke-width=".8"/><circle cx="${x}" cy="-76" r="3.8" fill="${c('#140a04')}"/><circle cx="${x+1.8}" cy="-78" r="1.7" fill="#fff"/><circle cx="${x-1.4}" cy="-74.4" r=".7" fill="#fff"/>`).join('')}
  ${k.ln('M-19 -86Q-10 -91 0 -81Q10 -91 19 -86','#5a3418',2.4)}
  <path d="M-3 -70.5Q0 -72.5 3 -70.5L0 -63.5Z" fill="${c('#f0a030')}"/>${k.bl(-15,-67,3)}${k.bl(15,-67,3)}
  ${k.ln('M-11 -37v2.6M-8 -37v3.2M-5 -37v2.6M5 -37v2.6M8 -37v3.2M11 -37v2.6','#e89a2a',2)}`}});

JIGART.subject({id:'deer',name:'Proud Stag',biomes:['forest','meadow','mountains','snow','autumn'],place:'ground',w:.9,draw:o=>{const k=K(o),{c,u}=k,cr=c('#f6e8d0');
  const ant=`<path d="M23 -94C18 -98 10 -98 4 -102M17 -97C16 -102 16 -105 18 -109M10 -99C8 -103 8 -106 9 -109M4 -102C2 -104 0 -105 -3 -105"/>`;
  return `<defs>${k.L('b','#c98446','#a4602a')}${k.Rg('h','#d8945a','#a8642e',.5,.3,.8)}${k.L('l','#b06a32','#8a4e22')}</defs>${k.sh(40,0)}
  <path d="M-23 -40L-22 -3h5L-16 -38ZM18 -40L22 -3h5L24 -42Z" fill="${c('#8a5228')}"/><path d="M-22.5 -4h6v4h-6ZM21.5 -4h6v4h-6Z" fill="${c('#3a2618')}"/>
  <path d="M-36 -50C-38 -62 -22 -67 -6 -65C8 -64 16 -65 22 -61C29 -55 27 -41 19 -35C7 -31 -18 -31 -28 -35C-34 -39 -36 -44 -36 -50Z" fill="${u('b')}"/>
  <path d="M-24 -34C-12 -31 6 -31 17 -35C8 -39 -12 -39 -24 -34Z" fill="${cr}"/>
  <path d="M-33 -60C-20 -64 0 -64 12 -62" fill="none" stroke="${c('#8a4e22')}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
  <ellipse cx="-32" cy="-50" rx="5" ry="8" fill="${cr}"/><path d="M-35 -57C-40 -59 -41 -54 -37 -51Z" fill="${c('#8a4e22')}"/>
  <path d="M-31 -52C-36 -42 -32 -32 -26 -28L-24 -3h6L-18 -31C-14 -40 -18 -50 -31 -52Z" fill="${u('l')}"/>
  <path d="M11 -46L13 -3h6L20 -42Z" fill="${u('l')}"/><path d="M-24.5 -4h7v4h-7ZM12.5 -4h7v4h-7Z" fill="${c('#3a2618')}"/>
  <path d="M10 -60C14 -70 18 -78 20 -86L34 -84C32 -72 28 -60 22 -52C18 -49 12 -53 10 -60Z" fill="${u('b')}"/>
  <path d="M15 -56C18 -50 22 -48 25 -52C26 -58 26 -64 27 -68C23 -66 18 -62 15 -56Z" fill="${cr}" opacity=".9"/>
  ${k.ln('M17 -58l-2 3M20 -55l-1 3M23 -55l1 3','#e2cba8',.9)}
  <g stroke="${c('#6a4a2a')}" stroke-width="3.8" fill="none" stroke-linecap="round">${ant}${k.mir(27,ant)}</g>
  <g stroke="${c('#efdcb4')}" stroke-width="2.4" fill="none" stroke-linecap="round">${ant}${k.mir(27,ant)}</g>
  <g transform="rotate(-24 13 -88)"><ellipse cx="13" cy="-88" rx="8" ry="3.8" fill="${c('#b8723a')}"/><ellipse cx="12" cy="-88" rx="5.5" ry="2.2" fill="${c('#f2c0a8')}"/></g>
  <g transform="rotate(24 41 -88)"><ellipse cx="41" cy="-88" rx="8" ry="3.8" fill="${c('#b8723a')}"/><ellipse cx="42" cy="-88" rx="5.5" ry="2.2" fill="${c('#f2c0a8')}"/></g>
  <path d="M27 -97C34 -97 37 -91 36 -85C35 -79 33 -73 31 -69C29 -67 25 -67 23 -69C21 -73 19 -79 18 -85C17 -91 20 -97 27 -97Z" fill="${u('h')}"/>
  <path d="M27 -94C25 -90 25 -86 27 -82C29 -86 29 -90 27 -94Z" fill="${c('#e8b080')}"/>
  <ellipse cx="27" cy="-71" rx="6" ry="4.8" fill="${cr}"/><ellipse cx="27" cy="-72.4" rx="3.2" ry="2.1" fill="${c('#2a1a12')}"/><circle cx="26" cy="-73" r=".6" fill="#fff" opacity=".7"/>
  ${k.ln('M25 -68.6Q27 -67.4 29 -68.6','#7a4a2a',.8)}${k.eye(22.3,-84,2.3)}${k.eye(31.7,-84,2.3)}${k.bl(20.5,-78.5,2.2)}${k.bl(33.5,-78.5,2.2)}`}});

/* ---------------------------------------------------------------- friends */
JIGART.subject({id:'bunny',name:'Little Bunny',biomes:['meadow','farm','garden','candy','forest'],place:'ground',w:.65,draw:o=>{const k=K(o),{c,u}=k,pk=c('#ffaec0');
  return `<defs>${k.L('b','#efdcc4','#cfac88')}${k.Rg('h','#f6e6d2','#d6b692',.45,.35,.8)}${k.L('ca','#ffa040','#ee6a1a',1,0)}</defs>${k.sh(34,2)}
  <circle cx="25" cy="-15" r="8.5" fill="${c('#ffffff')}"/><circle cx="23" cy="-17" r="4" fill="${c('#f2ece4')}"/>
  <path d="M-20 0C-28 -12 -26 -36 -12 -46C0 -52 18 -48 24 -34C30 -20 28 -6 22 0Z" fill="${u('b')}"/>
  <ellipse cx="11" cy="-17" rx="14" ry="14" fill="${c('#e2c6a4')}"/>${k.ln('M0 -24C2 -30 8 -32 14 -31','#b8946e',1.2)}
  <ellipse cx="5" cy="-3" rx="15" ry="4.6" fill="${c('#f6eadc')}"/><g fill="${pk}"><ellipse cx="17" cy="-3.2" rx="2.2" ry="1.6"/></g>${k.ln('M12 -1.4v-2.4M15 -1.4v-2.6','#d0b090',.8)}
  <ellipse cx="-9" cy="-24" rx="10" ry="17" fill="${c('#fffaf4')}"/>
  <g transform="rotate(28 -15 -32)"><path d="M-20 -48Q-15 -52 -10 -48L-15 -16Z" fill="${u('ca')}"/>${k.ln('M-18 -40h3M-13 -34h-3M-17 -28h3','#c84e10',.9)}<path d="M-15 -48C-19 -54 -22 -56 -24 -55C-21 -52 -18 -50 -15 -48ZM-15 -48C-15 -54 -14 -58 -11 -59C-11 -55 -13 -51 -15 -48ZM-15 -48C-11 -53 -7 -54 -5 -53C-8 -50 -12 -48 -15 -48Z" fill="${c('#4caa3a')}"/></g>
  <ellipse cx="-17" cy="-31" rx="5" ry="4" fill="${c('#f2e2ce')}"/><ellipse cx="-6" cy="-29" rx="5" ry="4" fill="${c('#f2e2ce')}"/>
  <path d="M-15 -80C-22 -92 -21 -106 -15 -109C-8 -108 -6 -96 -7 -82Z" fill="${u('b')}"/><path d="M-13 -83C-17 -92 -17 -102 -14 -105C-11 -103 -10 -94 -10 -84Z" fill="${pk}"/>
  <path d="M1 -81C5 -92 13 -102 20 -103C25 -101 20 -90 8 -78Z" fill="${u('b')}"/><path d="M3 -82C7 -90 13 -98 18 -100C20 -98 16 -90 7 -81Z" fill="${pk}"/>
  <path d="M-6 -85C-18 -85 -26 -77 -26 -66C-26 -56 -18 -49 -6 -49C6 -49 14 -56 14 -66C14 -77 6 -85 -6 -85Z" fill="${u('h')}"/>
  ${k.ln('M-9 -84.6l-1 -3M-6 -85v-3.4M-3 -84.6l1 -3','#e8d2b6',1.4)}
  ${k.eye(-14,-68,3.4)}${k.eye(3,-68,3.4)}${k.bl(-20,-60,3.6)}${k.bl(9,-60,3.6)}
  <ellipse cx="-11" cy="-57" rx="5" ry="3.8" fill="${c('#fffaf4')}"/><ellipse cx="-3" cy="-57" rx="5" ry="3.8" fill="${c('#fffaf4')}"/>
  <path d="M-9.3 -61.6H-4.7L-7 -59Z" fill="${c('#ff8aa6')}"/>${k.ln('M-7 -59v2M-9.6 -55.6Q-7 -54 -7 -57Q-7 -54 -4.4 -55.6','#7a5040',.8)}
  ${k.ln('M-16 -58l-7 -1.5M-16 -56l-7 1M2 -58l7 -1.5M2 -56l7 1','#b89a7c',.6)}`}});

JIGART.subject({id:'bear',name:'Brown Bear',biomes:['forest','mountains','lake','autumn'],place:'ground',w:.82,draw:o=>{const k=K(o),{c,u}=k,lt=c('#e2b888');
  const ear=`<circle cx="-19" cy="-91" r="8.5" fill="${u('b')}"/><circle cx="-19" cy="-90" r="4.6" fill="${c('#d49a6a')}"/>`;
  const foot=`<ellipse cx="-20" cy="-9" rx="11" ry="9.5" fill="${c('#8a5430')}"/><ellipse cx="-20" cy="-7" rx="6" ry="4.6" fill="${lt}"/>${[-25,-20,-15].map(x=>`<circle cx="${x}" cy="-13.4" r="2" fill="${lt}"/>`).join('')}`;
  return `<defs>${k.Rg('b','#b07444','#6c3e20',.45,.3,.85)}${k.Rg('p','#7aa8e0','#3a5aa8',.35,.3,.8)}${k.L('hn','#ffd050','#f0a020')}</defs>${k.sh(42)}
  <ellipse cx="0" cy="-33" rx="32" ry="31" fill="${u('b')}"/><ellipse cx="0" cy="-30" rx="20" ry="21" fill="${c('#c4925e')}"/>
  ${k.ln('M-6 -46q2 2 4 0M2 -42q2 2 4 0M-4 -36q2 2 4 0','#a87444',.9)}
  ${foot}${k.mir(0,foot)}
  <g transform="translate(0 -19)"><path d="M-11 -9C-15 -2 -14 8 -8 11H8C14 8 15 -2 11 -9Z" fill="${u('p')}"/><rect x="-12" y="-12" width="24" height="4.6" rx="2.2" fill="${c('#2e4a90')}"/>
  <path d="M-10 -12C-10 -15 10 -15 10 -12V-9C8 -9 8 -4 6 -4C4 -4 4 -8 2 -8V-3C2 0 -2 0 -2 -3V-8C-5 -8 -6 -9 -10 -9Z" fill="${u('hn')}"/><path d="M-6 -1C-2 -3 3 -3 7 -1C4 3 -3 3 -6 -1Z" fill="${c('#fff2b0')}" opacity=".9"/><ellipse cx="-6" cy="2" rx="2" ry="3.5" fill="${c('#ffffff')}" opacity=".35"/></g>
  <path d="M-27 -46C-32 -36 -26 -22 -12 -20C-6 -21 -8 -27 -12 -29C-18 -32 -20 -40 -18 -46Z" fill="${c('#8a5430')}"/><path d="M27 -46C32 -36 26 -22 12 -20C6 -21 8 -27 12 -29C18 -32 20 -40 18 -46Z" fill="${c('#8a5430')}"/>
  ${ear}${k.mir(0,ear)}<circle cx="0" cy="-72" r="24" fill="${u('b')}"/>
  ${k.ln('M-22 -64l-4 2M-21 -59l-4 3M22 -64l4 2M21 -59l4 3M-3 -95l-1 -3M2 -95l1 -3','#7a4a28',1.2)}
  <ellipse cx="0" cy="-63" rx="11.5" ry="9" fill="${lt}"/><path d="M-4.6 -68Q0 -70.5 4.6 -68Q3.6 -64 0 -63.4Q-3.6 -64 -4.6 -68Z" fill="${c('#2a160c')}"/><ellipse cx="-1.4" cy="-67.6" rx="1.3" ry=".7" fill="#fff" opacity=".7"/>
  ${k.ln('M0 -63.4v2M-3 -59.6Q0 -57.6 0 -61.2Q0 -57.6 3 -59.6','#4a2a16',.9)}${k.eye(-9,-77,3.2)}${k.eye(9,-77,3.2)}${k.bl(-14,-66,3.6)}${k.bl(14,-66,3.6)}
  <g transform="translate(30 -84)"><ellipse cx="-2" cy="-3" rx="2.4" ry="3.6" fill="${c('#ffffff')}" opacity=".85" transform="rotate(-25 -2 -3)"/><ellipse cx="2" cy="-3" rx="2.4" ry="3.6" fill="${c('#ffffff')}" opacity=".85" transform="rotate(25 2 -3)"/><ellipse rx="4.4" ry="3.2" fill="${c('#ffd23a')}"/><path d="M-1.6 -3V3M1.2 -3V3" stroke="${c('#2a1a0a')}" stroke-width="1.2"/><circle cx="3.4" cy="-.6" r=".6" fill="${c('#2a1a0a')}"/></g>
  ${k.ln('M24 -82q-4 3 -8 1q-4 -2 -6 2','#8a6a3a',.6,.7)}`}});

JIGART.subject({id:'cat',name:'Tabby Cat',biomes:['city','farm','garden','meadow','autumn'],place:'ground',w:.72,draw:o=>{const k=K(o),{c,u}=k,st='#c4581a',wh=c('#fff8f0');
  const ear=`<path d="M-22 -74C-24 -84 -23 -92 -20 -98C-14 -94 -10 -90 -7 -84Z" fill="${u('f')}"/><path d="M-19.5 -79C-20.5 -85 -20 -90 -18.5 -93C-15 -90 -13 -88 -11 -84Z" fill="${c('#ffb0b8')}"/>`;
  const tail='M15 -5C33 -1 38 -14 33 -27C30 -34 33 -42 39 -42';
  return `<defs>${k.L('f','#ffb05c','#e57a26')}${k.Rg('h','#ffbc6e','#e8822c',.45,.32,.8)}${rad(o.id+'e',[[0,c('#d8ff8a')],[1,c('#4ea83a')]],.5,.5,.6)}</defs>${k.sh(36,4)}
  <path d="${tail}" fill="none" stroke="${u('f')}" stroke-width="7.5" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${c(st)}" stroke-width="7.6" stroke-dasharray="2.6 5.4" stroke-dashoffset="-4"/>
  <path d="M-20 0C-26 -14 -22 -38 -8 -48C2 -54 16 -50 20 -40C26 -26 24 -10 18 0Z" fill="${u('f')}"/>
  <path d="M2 -1C-3 -8 -1 -26 10 -30C21 -30 24 -14 20 -1Z" fill="${c('#f08a34')}"/>
  ${k.ln('M12 -45C16 -43 19 -40 20 -36M17 -32C21 -30 23 -26 23 -22M6 -26C11 -24 14 -21 15 -18M5 -18C9 -16 12 -13 13 -10','#c4581a',2)}
  <ellipse cx="9" cy="-2.6" rx="9" ry="3.6" fill="${wh}"/>
  <path d="M-12 -48C-4 -50 4 -44 4 -34C4 -26 -2 -20 -8 -22C-14 -28 -16 -40 -12 -48Z" fill="${wh}"/>
  ${[-14,-4].map(x=>`<rect x="${x}" y="-30" width="8" height="30" rx="4" fill="${u('f')}"/><path d="M${x} -8h8v4a4 4 0 0 1 -8 0Z" fill="${wh}"/><ellipse cx="${x+4}" cy="-2.2" rx="5.2" ry="2.8" fill="${wh}"/>${k.ln(`M${x+2.4} -1v-1.8M${x+5.6} -1v-1.8`,'#e0c8b4',.7)}${k.ln(`M${x} -22h3M${x} -16h3`,st,1.4)}`).join('')}
  ${ear}${k.mir(-4,ear)}
  <path d="M-4 -86C-17 -86 -25 -78 -25 -68C-25 -58 -15 -52 -4 -52C7 -52 17 -58 17 -68C17 -78 9 -86 -4 -86Z" fill="${u('h')}"/>
  ${k.ln('M-10 -84l1.4 5M-4 -86v6M2 -84l-1.4 5M-25 -67h5M-24.5 -63l5 -1M17 -67h-5M16.5 -63l-5 -1','#c4581a',1.8)}
  <ellipse cx="-8" cy="-59" rx="5.6" ry="4.4" fill="${wh}"/><ellipse cx="0" cy="-59" rx="5.6" ry="4.4" fill="${wh}"/>
  ${[-11.5,3.5].map(x=>`<ellipse cx="${x}" cy="-69" rx="3.8" ry="4.3" fill="url(#${o.id}e)"/><ellipse cx="${x}" cy="-69" rx="1.3" ry="3.4" fill="${c('#1a1208')}"/><circle cx="${x+1.3}" cy="-70.8" r="1.2" fill="#fff"/><circle cx="${x-1.1}" cy="-67.2" r=".5" fill="#fff"/>`).join('')}
  <path d="M-6 -62.8H-2L-4 -60.6Z" fill="${c('#ff8aa0')}"/>${k.ln('M-4 -60.6v1.4M-6.4 -57.8Q-4 -56.2 -4 -59.2Q-4 -56.2 -1.6 -57.8','#7a3a20',.8)}
  ${k.bl(-17,-60,3.4)}${k.bl(9,-60,3.4)}${k.ln('M-12 -59l-10 -2M-12 -57.4l-10 1M4 -59l10 -2M4 -57.4l10 1','#ffffff',.6,.9)}
  ${k.ln('M-19 -53Q-4 -46 11 -53','#e8344a',3.6)}<circle cx="-4" cy="-48.6" r="3.2" fill="${c('#ffd23a')}"/><circle cx="-5" cy="-49.6" r="1" fill="#fff" opacity=".8"/><path d="M-4 -48v2.6" stroke="${c('#a87a10')}" stroke-width=".8"/>`}});

JIGART.subject({id:'puppy',name:'Happy Puppy',biomes:['meadow','farm','city','coast'],place:'ground',w:.85,draw:o=>{const k=K(o),{c,u}=k,br=c('#c47a3a'),db=c('#8e4e22');
  const ear=`<path d="M-16 -77C-27 -76 -30 -60 -27 -49C-24 -43 -18 -45 -16 -51C-13 -60 -13 -70 -16 -77Z" fill="${db}"/><path d="M-19 -72C-24 -66 -25 -58 -24 -52" fill="none" stroke="${c('#6e3a16')}" stroke-width="1" opacity=".6"/>`;
  return `<defs>${k.L('w','#fffaf2','#e6d4c0')}${k.Rg('h','#d68a48','#a85e28',.45,.3,.8)}</defs>${k.sh(38,4)}
  <path d="M16 -26C25 -32 29 -42 27 -52" fill="none" stroke="${br}" stroke-width="6" stroke-linecap="round"/><path d="M27.6 -47C28 -50 27.8 -52 27 -54" fill="none" stroke="${c('#ffffff')}" stroke-width="6" stroke-linecap="round"/>
  <path d="M-20 0C-24 -14 -22 -36 -10 -44C0 -50 14 -46 20 -36C26 -22 24 -8 20 0Z" fill="${u('w')}"/>
  <path d="M6 -46C16 -45 23 -34 22 -20C17 -25 11 -28 5 -30C3 -36 3 -42 6 -46Z" fill="${br}"/>
  <ellipse cx="12" cy="-12" rx="12" ry="12" fill="${c('#f6ece0')}"/><ellipse cx="15" cy="-15" rx="5" ry="4" fill="${br}" opacity=".85"/><ellipse cx="7" cy="-2.6" rx="9" ry="3.4" fill="${c('#fffaf2')}"/>
  ${[-14,-3].map(x=>`<rect x="${x}" y="-30" width="8.5" height="30" rx="4.2" fill="${u('w')}"/><ellipse cx="${x+4.2}" cy="-2.4" rx="5.6" ry="3" fill="${c('#fffaf2')}"/>${k.ln(`M${x+2.6} -1v-2M${x+5.8} -1v-2`,'#d6c0a8',.8)}`).join('')}
  ${k.ln('M-10 -40q3 2 6 0M-8 -35q3 2 6 0','#e2cfba',1)}
  ${k.ln('M-17 -46Q-3 -40 11 -46','#e8344a',3.6)}<circle cx="-3" cy="-40.6" r="3.4" fill="${c('#ffd23a')}"/><circle cx="-3" cy="-40.6" r="1.6" fill="none" stroke="${c('#c89a10')}" stroke-width=".6"/>
  <path d="M-2 -85C-16 -85 -22 -76 -22 -66C-22 -56 -14 -50 -2 -50C10 -50 18 -56 18 -66C18 -76 12 -85 -2 -85Z" fill="${u('h')}"/>
  <path d="M-2 -84C-5 -76 -6 -70 -8 -64C-6 -58 2 -58 4 -64C2 -70 1 -76 -2 -84Z" fill="${c('#ffffff')}"/>
  ${ear}${k.mir(-2,ear)}
  <ellipse cx="-2" cy="-57.5" rx="10.5" ry="7.5" fill="${c('#fffaf2')}"/>
  ${k.eye(-9.5,-68,3.4)}${k.eye(5.5,-68,3.4)}<ellipse cx="-10" cy="-74.5" rx="2" ry="1.2" fill="${c('#6e3a16')}"/><ellipse cx="6" cy="-74.5" rx="2" ry="1.2" fill="${c('#6e3a16')}"/>
  <path d="M-6 -62.4Q-2 -65 2 -62.4Q1.4 -59 -2 -58.6Q-5.4 -59 -6 -62.4Z" fill="${c('#1e1410')}"/><ellipse cx="-3.4" cy="-62.4" rx="1.3" ry=".7" fill="#fff" opacity=".7"/>
  <path d="M-4.6 -54.6Q-5 -48 -2 -47.8Q1 -48 0.6 -54.6Z" fill="${c('#ff7a8e')}"/>${k.ln('M-2 -53.6v3.6','#d84a62',.7)}
  ${k.ln('M-2 -58.6v2.6M-7 -55.6Q-2 -52.6 -2 -56.4Q-2 -52.6 3 -55.6','#5a3020',.9)}${k.bl(-13,-59.5,3.4)}${k.bl(9,-59.5,3.4)}
  <g transform="translate(30 -6.5)"><circle r="6.5" fill="${c('#ff4a5a')}"/><path d="M-6.2 -1.8Q0 1.6 6.2 -1.8" fill="none" stroke="${c('#ffffff')}" stroke-width="1.8"/><circle cx="-2" cy="-3" r="1.4" fill="#fff" opacity=".6"/></g>`}});

JIGART.subject({id:'penguin',name:'Penguin Pals',biomes:['snow','coast'],place:'ground',w:.9,draw:o=>{const k=K(o),{c,u}=k;
  return `<defs>${k.L('k','#34405a','#141a28')}${k.L('w','#ffffff','#dbe4ee')}${k.L('y','#ffb020','#fff2b0')}${k.Rg('ch','#d6dce6','#9aa4b4',.4,.3,.8)}</defs>${k.sh(46,4)}
  <ellipse cx="-17" cy="-1" rx="6" ry="2.4" fill="${c('#ff9a2a')}"/><ellipse cx="-3" cy="-1" rx="6" ry="2.4" fill="${c('#ff9a2a')}"/>
  <path d="M-34 -60C-43 -48 -45 -34 -41 -24C-36 -32 -32 -44 -31 -56Z" fill="${c('#1e2638')}"/><path d="M12 -60C20 -48 23 -36 19 -26C15 -34 13 -46 11 -56Z" fill="${c('#1e2638')}"/>
  <path d="M-10 -101C2 -101 8 -91 8 -79C14 -67 18 -45 14 -23C12 -9 4 -1 -10 -1C-26 -1 -34 -9 -36 -23C-38 -45 -32 -67 -28 -79C-28 -91 -22 -101 -10 -101Z" fill="${u('k')}"/>
  <path d="M-10 -80C0 -80 6 -64 8 -46C10 -26 5 -5 -10 -4C-25 -5 -30 -24 -28 -44C-26 -64 -20 -80 -10 -80Z" fill="${u('w')}"/>
  <path d="M-19 -77C-15 -83 -5 -83 -1 -77C2 -72 0 -66 -10 -63C-20 -66 -22 -72 -19 -77Z" fill="${u('y')}" opacity=".95"/>
  <path d="M1 -92C6 -88 7 -82 3 -76C1 -80 0 -86 1 -92Z" fill="${c('#ffa418')}"/><path d="M-21 -92C-26 -88 -27 -82 -23 -76C-21 -80 -20 -86 -21 -92Z" fill="${c('#ffa418')}"/>
  <ellipse cx="-10" cy="-92" rx="9" ry="5.5" fill="${c('#2a3450')}" opacity=".6"/>
  ${k.eye(-15.5,-89,2.4,'#0a0a14')}${k.eye(-4.5,-89,2.4,'#0a0a14')}
  <path d="M-13 -85Q-10 -86.5 -7 -85L-10 -78.5Z" fill="${c('#2a2a34')}"/><path d="M-12 -84.6Q-10 -85.4 -8 -84.6L-9 -83Z" fill="${c('#ff8a3a')}"/>
  ${k.bl(-20.5,-83,2.6)}${k.bl(.5,-83,2.6)}${k.ln('M-16 -56q3 2 6 0M-12 -48q3 2 6 0M-18 -40q3 2 6 0','#c6d2e0',.9)}
  <g transform="translate(29 0)"><ellipse cx="-4" cy="-.8" rx="3.6" ry="1.6" fill="${c('#4a4a58')}"/><ellipse cx="4" cy="-.8" rx="3.6" ry="1.6" fill="${c('#4a4a58')}"/>
  <path d="M-12 -24C-17 -18 -17 -10 -14 -7C-12 -12 -11 -18 -10 -22ZM12 -24C17 -18 17 -10 14 -7C12 -12 11 -18 10 -22Z" fill="${c('#a0a8b8')}"/>
  <path d="M0 -50C9 -50 13 -43 13 -35C16 -27 16 -12 12 -6C10 -1 5 0 0 0C-5 0 -10 -1 -12 -6C-16 -12 -16 -27 -13 -35C-13 -43 -9 -50 0 -50Z" fill="${u('ch')}"/>
  ${[[-13,-30],[-14,-20],[13,-30],[14,-20],[-9,-4],[9,-4],[0,-1.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="${c('#b4bccb')}"/>`).join('')}
  <ellipse cx="0" cy="-18" rx="7" ry="10" fill="${c('#e6eaf0')}"/>
  <path d="M0 -51C9 -51 14 -45 14 -37C9 -40 -9 -40 -14 -37C-14 -45 -9 -51 0 -51Z" fill="${c('#1e2232')}"/>
  <ellipse cx="0" cy="-35.5" rx="10.5" ry="6.6" fill="${c('#ffffff')}"/><path d="M-14 -37C-9 -40 9 -40 14 -37C10 -34 6 -32 0 -32C-6 -32 -10 -34 -14 -37Z" fill="none"/>
  ${k.eye(-4.4,-36,2,'#0a0a14')}${k.eye(4.4,-36,2,'#0a0a14')}<path d="M-1.6 -33.4L1.6 -33.4L0 -31Z" fill="${c('#2a2a34')}"/>${k.bl(-7.5,-33,1.9)}${k.bl(7.5,-33,1.9)}
  ${k.ln('M-2 -50.6l-1 -2.4M0 -51v-2.8M2 -50.6l1 -2.4','#1e2232',1.2)}</g>`}});
/* ---------------------------------------------------------------- wild and farm animals */
JIGART.subject({id:'polarbear',name:'Polar Bears',biomes:['snow'],place:'ground',w:1.15,draw:o=>{const k=K(o),{c,u}=k,sd=c('#c6d4e4'),ns=c('#1e2230');
  const paw=x=>k.ln(`M${x+3} -.6v-2.4M${x+6.5} -.6v-2.6M${x+10} -.6v-2.4`,'#a8b8cc',.9);
  return `<defs>${k.L('b','#ffffff','#d8e2ee')}${k.Rg('h','#ffffff','#d4deea',.4,.3,.8)}${k.L('l','#e4ebf3','#c6d2e2')}</defs>${k.sh(54,4)}
  <path d="M-36 -40C-34 -28 -32 -14 -31 -4C-31 -1 -20 -1 -20 -3C-21 -14 -20 -28 -18 -36ZM18 -42C21 -30 24 -16 24 -4C24 -1 35 -1 35 -3C34 -14 34 -28 36 -38Z" fill="${sd}"/>
  <path d="M-52 -46C-55 -62 -42 -74 -22 -73C-8 -72 4 -76 18 -72C32 -68 40 -54 36 -40C32 -31 22 -31 10 -32C-6 -30 -32 -28 -44 -32C-50 -35 -52 -40 -52 -46Z" fill="${u('b')}"/>
  ${k.ln('M-40 -62q4 -2 8 0M-22 -66q4 -2 8 0M-4 -66q4 -2 8 0M-30 -52q4 -2 8 0M-12 -56q4 -2 8 0M8 -58q4 -2 8 0','#bccbdc',1)}
  <path d="M-51 -50C-55 -36 -50 -20 -45 -8C-46 -2 -43 0 -38 0H-29C-26 0 -26 -3 -28 -6C-30 -14 -27 -26 -21 -36C-28 -44 -40 -50 -51 -50Z" fill="${u('l')}"/>
  <path d="M4 -50C10 -36 12 -18 10 -6C9 -2 11 0 15 0H24C27 0 27 -3 26 -6C24 -16 25 -30 31 -44C24 -50 12 -52 4 -50Z" fill="${u('l')}"/>
  ${paw(-44)}${paw(11)}${k.ln('M-46 -30C-42 -26 -36 -25 -30 -27','#c0cede',1.2)}
  <path d="M-52 -58C-56 -58 -57 -54 -54 -52Z" fill="${sd}"/>
  <path d="M18 -68C28 -73 39 -71 45 -66L47 -47C37 -42 26 -40 19 -45Z" fill="${u('b')}"/>
  <circle cx="35" cy="-70" r="4.4" fill="${sd}"/><circle cx="35" cy="-70" r="2.2" fill="${c('#9aa8bc')}"/><circle cx="49" cy="-71.5" r="4.4" fill="${sd}"/><circle cx="49" cy="-71.5" r="2.2" fill="${c('#9aa8bc')}"/>
  <path d="M43 -73C53 -73 58 -66 58 -60C61 -59 64 -55 63 -51C61 -46 55 -45 50 -46C43 -45 34 -48 32 -56C30 -64 35 -73 43 -73Z" fill="${u('h')}"/>
  <ellipse cx="56" cy="-53.5" rx="7" ry="5.6" fill="${c('#eef3f8')}"/><path d="M57.6 -58.4Q61.6 -60 64 -57.6Q63.4 -54.6 60.6 -54.4Q58 -55.2 57.6 -58.4Z" fill="${ns}"/><circle cx="59.8" cy="-58.4" r=".7" fill="#fff" opacity=".7"/>
  ${k.ln('M60.6 -54.4v1.6M56 -50.6Q58.4 -49 60.6 -52.6','#4a5468',.9)}${k.eye(40.5,-63,2.4)}${k.eye(51,-63.5,2.4)}${k.bl(37.5,-56.5,2.8)}${k.bl(51,-56,2.4)}
  <g transform="translate(-16 -70)"><path d="M-10 0C-12 -10 -6 -18 2 -18C10 -18 14 -10 12 0Z" fill="${u('b')}"/><ellipse cx="-6" cy="-1" rx="4" ry="2.6" fill="${c('#eef3f8')}"/><ellipse cx="7" cy="-1" rx="4" ry="2.6" fill="${c('#eef3f8')}"/>
  <circle cx="-6" cy="-29" r="3.6" fill="${sd}"/><circle cx="8" cy="-29" r="3.6" fill="${sd}"/><circle cx="-6" cy="-29" r="1.8" fill="${c('#9aa8bc')}"/><circle cx="8" cy="-29" r="1.8" fill="${c('#9aa8bc')}"/>
  <circle cx="1" cy="-21" r="10.5" fill="${u('h')}"/><ellipse cx="1" cy="-16.6" rx="5" ry="3.8" fill="${c('#eef3f8')}"/><path d="M-1.2 -19.2Q1 -20.6 3.2 -19.2Q2.6 -17 1 -16.8Q-.6 -17 -1.2 -19.2Z" fill="${ns}"/>
  ${k.ln('M1 -16.8v1M-1 -14.6Q1 -13.4 3 -14.6','#4a5468',.7)}${k.eye(-3.4,-23,1.8)}${k.eye(5.4,-23,1.8)}${k.bl(-5.6,-17.6,2)}${k.bl(7.6,-17.6,2)}</g>`}});

JIGART.subject({id:'panda',name:'Giant Panda',biomes:['garden','forest','mountains','jungle'],place:'ground',w:1,draw:o=>{const k=K(o),{c,u}=k,bk=c('#22222c');
  const stalk=(x,h,w)=>{let s=`<rect x="${f(x-w/2)}" y="${f(-h)}" width="${w}" height="${f(h)}" rx="${f(w/3)}" fill="url(#${o.id}bm)"/>`;for(let y=-14;y>-h+6;y-=16)s+=`<rect x="${f(x-w/2-.6)}" y="${y}" width="${f(w+1.2)}" height="1.8" rx=".9" fill="${c('#4a8a2a')}"/>`;return s};
  const leaf=(x,y,a,l=16)=>`<path d="M0 0C${f(l*.3)} -3 ${f(l*.7)} -3 ${l} 0C${f(l*.7)} 3 ${f(l*.3)} 3 0 0Z" fill="${c(a>90||a<-90?'#5aa83a':'#78c44a')}" transform="translate(${f(x)} ${f(y)}) rotate(${a})"/>`;
  const ear=`<circle cx="-18" cy="-89" r="8.5" fill="${bk}"/><circle cx="-18" cy="-88" r="4" fill="${c('#3e3e4a')}"/>`;
  const foot=`<ellipse cx="-20" cy="-9" rx="11" ry="9.5" fill="${bk}"/><ellipse cx="-20" cy="-7" rx="5.6" ry="4.4" fill="${c('#6a5a62')}"/>${[-25,-20,-15].map(x=>`<circle cx="${x}" cy="-13.2" r="1.8" fill="${c('#6a5a62')}"/>`).join('')}`;
  const patch=`<path d="M-4 -74C-6 -79 -12 -80 -15 -76C-18 -72 -17 -65 -13 -64C-8 -63 -3 -69 -4 -74Z" fill="${bk}"/><circle cx="-10" cy="-71" r="3.2" fill="${c('#ffffff')}"/><circle cx="-10" cy="-71" r="2.3" fill="${c('#1a1410')}"/><circle cx="-9.2" cy="-72" r="1" fill="#fff"/>`;
  return `<defs>${k.L('bm','#9ad85a','#5aa834',1,0)}${k.Rg('w','#ffffff','#dcdfe8',.45,.3,.85)}</defs>${k.sh(46)}
  ${stalk(-42,96,6)}${stalk(-31,76,5)}${stalk(40,92,6)}${stalk(50,66,4.5)}
  ${[[-42,-96,-120],[-42,-96,-70],[-42,-86,-150],[-42,-74,-30],[-31,-76,-140],[-31,-66,-40],[40,-92,-60],[40,-92,-110],[40,-80,-20],[40,-70,-160],[50,-66,-40],[50,-58,-130]].map(([x,y,a])=>leaf(x,y,a)).join('')}
  <ellipse cx="0" cy="-33" rx="30" ry="30" fill="${u('w')}"/>
  <path d="M-29 -42C-24 -56 24 -56 29 -42C24 -46 16 -48 10 -46C4 -44 -4 -44 -10 -46C-16 -48 -24 -46 -29 -42Z" fill="${bk}"/>
  ${foot}${k.mir(0,foot)}
  <path d="M-28 -44C-34 -32 -26 -20 -12 -20C-6 -22 -8 -28 -12 -30C-18 -32 -20 -38 -18 -44Z" fill="${bk}"/>
  <g transform="rotate(16 14 -26)"><rect x="11" y="-82" width="6" height="66" rx="2" fill="url(#${o.id}bm)"/>${[-66,-50,-34].map(y=>`<rect x="10.4" y="${y}" width="7.2" height="1.8" rx=".9" fill="${c('#4a8a2a')}"/>`).join('')}${leaf(14,-82,-120,14)}${leaf(14,-82,-60,14)}${leaf(14,-74,-10,12)}</g>
  <path d="M28 -44C34 -34 28 -22 16 -21C10 -22 10 -28 14 -30C20 -32 22 -38 20 -44Z" fill="${bk}"/><ellipse cx="17" cy="-24" rx="5.6" ry="4.6" fill="${bk}"/>
  ${ear}${k.mir(0,ear)}<ellipse cx="0" cy="-70" rx="24" ry="21.5" fill="${u('w')}"/>
  ${patch}${k.mir(0,patch)}
  <path d="M-3.6 -63Q0 -65 3.6 -63Q2.8 -60 0 -59.6Q-2.8 -60 -3.6 -63Z" fill="${bk}"/>${k.ln('M0 -59.6v1.6M-3 -56.4Q0 -54.6 0 -58Q0 -54.6 3 -56.4','#3a3a44',.9)}
  ${k.bl(-15,-60.5,3.6)}${k.bl(15,-60.5,3.6)}${k.ln('M-6 -89q2 -1.6 4 0M2 -89q2 -1.6 4 0','#c8ccd8',.9)}`}});

JIGART.subject({id:'elephant',name:'Baby Elephant',biomes:['jungle','desert','meadow'],place:'ground',w:1.15,draw:o=>{const k=K(o),{c,u}=k,dk=c('#7a88a6');
  const nails=x=>`<path d="M${x+1.5} 0a2 2 0 0 1 4 0ZM${x+6} 0a2 2 0 0 1 4 0ZM${x+10.5} 0a2 2 0 0 1 4 0Z" fill="${c('#f2eee6')}"/>`;
  return `<defs>${k.L('b','#b2bed4','#8492ae')}${k.Rg('h','#bcc8dc','#8896b2',.45,.32,.8)}${k.L('l','#a4b0c8','#7e8ca8')}</defs>${k.sh(52,4)}
  <path d="M-36 -40V-1H-22V-36ZM8 -40V-1H22V-36Z" fill="${dk}"/>${nails(-36)}${nails(8)}
  <path d="M-47 -42C-49 -64 -32 -79 -8 -79C14 -79 26 -70 30 -56C32 -44 28 -32 20 -29L-38 -29C-44 -31 -47 -36 -47 -42Z" fill="${u('b')}"/>
  ${k.ln('M-40 -60q6 -3 12 0M-30 -70q6 -3 12 0M-36 -48q6 -3 12 0','#9aa6c0',1.1)}
  <path d="M-47 -50C-52 -46 -54 -40 -53 -34" fill="none" stroke="${dk}" stroke-width="2" stroke-linecap="round"/><path d="M-53 -36C-56 -33 -55 -29 -52 -29C-50 -31 -50 -34 -53 -36Z" fill="${c('#5a6684')}"/>
  <path d="M-44 -44V-1H-29V-36ZM0 -44V-1H15V-40Z" fill="${u('l')}"/>${nails(-44)}${nails(0)}${k.ln('M-44 -14h4M2 -14h4M-44 -10h3M2 -10h3','#7480a0',.9)}
  <circle cx="32" cy="-66" r="22" fill="${u('h')}"/>
  <path d="M40 -68C52 -70 58 -80 56 -94C55 -100 61 -103 64 -98C65 -82 61 -60 45 -51Z" fill="${u('h')}"/>
  ${k.ln('M48 -67l3 2.4M52 -73l3.4 1.4M54 -80l3.6 .6M55 -87l3.6 0M56 -94l3.4 -1','#8492ae',1)}
  <ellipse cx="60.4" cy="-98.6" rx="2.4" ry="1.6" fill="${c('#6a7898')}" transform="rotate(-30 60.4 -98.6)"/>
  <path d="M41 -55C45 -50 50 -50 53 -53C49 -52 46 -54 44 -57Z" fill="${c('#fffaf0')}"/>
  <path d="M36 -50Q40 -46 44 -50" fill="none" stroke="${c('#5a6684')}" stroke-width="1.2" stroke-linecap="round"/><path d="M38 -49.4Q40 -47 42 -49.4Z" fill="${c('#ff8aa0')}"/>
  <path d="M22 -86C6 -90 -4 -76 0 -60C3 -48 12 -44 22 -47C27 -58 28 -76 22 -86Z" fill="${c('#9aa6c2')}"/><path d="M19 -81C8 -83 2 -73 4 -62C6 -54 12 -51 19 -53C23 -61 23 -73 19 -81Z" fill="${c('#f6bccb')}"/>
  ${k.ln('M22 -86C27 -76 27 -58 22 -47','#7a88a6',1.4)}
  ${k.eye(37,-71,2.8)}${k.ln('M33 -77q4 -3 8 0','#5a6684',1.1)}${k.bl(40,-62,3.2)}
  <g transform="translate(-16 -79)"><ellipse cx="0" cy="-5" rx="6" ry="5" fill="${c('#ffd23a')}"/><circle cx="4.6" cy="-10" r="4" fill="${c('#ffd23a')}"/><path d="M8.4 -10.6L11.4 -9.6L8.4 -8.6Z" fill="${c('#ff8a2a')}"/><circle cx="5.6" cy="-10.8" r=".9" fill="${c('#1a1410')}"/><path d="M-6 -6C-10 -9 -12 -8 -12 -6C-10 -4 -8 -4 -6 -4Z" fill="${c('#f0b020')}"/><path d="M-2 -5C0 -2 3 -2 4 -4" fill="none" stroke="${c('#e0a010')}" stroke-width="1"/>${k.ln('M-1 0v1.6M2 0v1.6','#ff8a2a',.9)}</g>`}});

JIGART.subject({id:'giraffe',name:'Tall Giraffe',biomes:['desert','meadow','jungle'],place:'ground',w:.75,draw:o=>{const k=K(o),{c,u}=k,R=o.R,pc=c('#c8702a'),hf=c('#4a2a18');
  const body='M-28 -58C-30 -66 -22 -70 -12 -71C0 -74 12 -80 18 -72C22 -64 20 -52 12 -48L-20 -47C-26 -48 -28 -52 -28 -58Z',neck='M6 -68C12 -80 20 -92 25 -100L37 -97C31 -86 26 -74 21 -60Z';
  const blob=(x,y,r)=>P(Array.from({length:6},(_,i)=>{const a=i*Math.PI/3+R()*.4,q=r*(.75+R()*.35);return[x+Math.cos(a)*q,y+Math.sin(a)*q]}));
  const sp=[[-22,-62,5],[-11,-65,5.5],[0,-68,5],[10,-70,4.5],[-16,-53,4.4],[-4,-55,5],[8,-58,4.6],[16,-62,3.2],[12,-73,3],[17,-82,3.4],[22,-90,3],[26,-97,2.4],[14,-66,2.6],[20,-74,2.8]];
  const leg=(x,top,cl)=>`<path d="M${x-1.4} ${top}C${x-.6} ${top+12} ${x+.8} -32 ${x+.8} -24L${x+1} -3h4.6L${x+5.4} -24C${x+5.6} -32 ${x+7.4} ${top+12} ${x+7.6} ${top}Z" fill="${cl}"/><ellipse cx="${x+3.2}" cy="-24" rx="3" ry="1.8" fill="${cl}"/><rect x="${x}" y="-4" width="6.4" height="4" rx="1.2" fill="${hf}"/>`;
  return `<defs>${k.L('b','#ffd886','#f2b24a')}${k.L('d','#e8bc6a','#d09440')}<clipPath id="${o.id}cl"><path d="${body}"/><path d="${neck}"/></clipPath></defs>${k.sh(32,-2)}
  ${leg(-17,-54,u('d'))}${leg(15,-56,u('d'))}
  <path d="M-27 -60C-31 -56 -32 -48 -31 -40" fill="none" stroke="${c('#c88a3a')}" stroke-width="1.6" stroke-linecap="round"/><path d="M-31 -42C-34 -38 -33 -34 -30 -34C-29 -37 -29 -40 -31 -42Z" fill="${hf}"/>
  <path d="${body}" fill="${u('b')}"/><path d="${neck}" fill="${u('b')}"/>
  <g clip-path="url(#${o.id}cl)" fill="${pc}">${sp.map(([x,y,r])=>`<path d="${blob(x,y,r)}" stroke="${pc}" stroke-width="1.6" stroke-linejoin="round"/>`).join('')}</g>
  <path d="M21 -60C25 -74 30 -84 36 -95" fill="none" stroke="${c('#a8501e')}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 1.4"/>
  <path d="M-12 -49C-4 -47 6 -47 12 -49" fill="none" stroke="${c('#fff0c8')}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
  ${leg(-25,-52,u('b'))}${leg(6,-52,u('b'))}
  <path d="M31 -103L30 -109M37 -103L38.5 -109" stroke="${c('#d89a4a')}" stroke-width="2.2" stroke-linecap="round"/><circle cx="30" cy="-109" r="2" fill="${hf}"/><circle cx="38.6" cy="-109" r="2" fill="${hf}"/>
  <g transform="rotate(-20 25 -101)"><ellipse cx="25" cy="-101" rx="5" ry="2.2" fill="${c('#f2b24a')}"/><ellipse cx="25" cy="-101" rx="3.2" ry="1.1" fill="${c('#ffb8a8')}"/></g>
  <g transform="rotate(20 45 -100)"><ellipse cx="45" cy="-100" rx="5" ry="2.2" fill="${c('#f2b24a')}"/><ellipse cx="45" cy="-100" rx="3.2" ry="1.1" fill="${c('#ffb8a8')}"/></g>
  <path d="M34 -106C40 -106 43 -101 43 -96C46 -94 47 -90 45 -87C43 -84 38 -84 35 -85C30 -86 27 -90 27 -96C27 -102 30 -106 34 -106Z" fill="${u('b')}"/>
  <ellipse cx="40.5" cy="-88.6" rx="5.6" ry="4" fill="${c('#ffe2b0')}"/><ellipse cx="38.6" cy="-89.6" rx=".9" ry=".6" fill="${hf}"/><ellipse cx="43" cy="-89.6" rx=".9" ry=".6" fill="${hf}"/>
  ${k.ln('M38 -86.4Q40.6 -85 43 -86.6','#8a4a20',.8)}<path d="M33 -102C33 -99 35 -98 37 -99" fill="none" stroke="${pc}" stroke-width="2.4" stroke-linecap="round"/>
  ${k.eye(32,-96.5,2)}${k.eye(40,-97,2)}${k.ln('M29.6 -99l-1.4 -1M30.6 -99.6l-.8 -1.4M42.4 -99.6l1.2 -1.2','#4a2a18',.6)}${k.bl(30,-92,2.2)}`}});

JIGART.subject({id:'camel',name:'Desert Camel',biomes:['desert','canyon'],place:'ground',w:1.1,draw:o=>{const k=K(o),{c,u}=k,ft=c('#8e5a2c');
  const leg=(x,cl)=>`<path d="M${x} -46C${x+1} -34 ${x} -24 ${x+1} -16C${x+1} -10 ${x} -6 ${x-1} -2C${x-1} 0 ${x+9} 0 ${x+9} -2C${x+8} -6 ${x+7} -10 ${x+7} -16C${x+8} -24 ${x+8} -34 ${x+8} -44Z" fill="${cl}"/><ellipse cx="${x+4}" cy="-17" rx="4.4" ry="2.8" fill="${cl}"/><path d="M${x-1.4} -.4H${x+9.6}" stroke="${ft}" stroke-width="2" stroke-linecap="round"/>`;
  return `<defs>${k.L('b','#ecbe7c','#c88e4c')}${k.L('d','#cfa062','#aa743c')}${k.Rg('h','#f0c482','#c88e4c',.45,.3,.8)}${k.L('r','#e8344a','#b81e3a')}</defs>${k.sh(50,4)}
  ${leg(-28,u('d'))}${leg(14,u('d'))}
  <path d="M-40 -48C-46 -46 -48 -40 -47 -32" fill="none" stroke="${c('#b07a3c')}" stroke-width="1.8" stroke-linecap="round"/><path d="M-47 -34C-50 -30 -49 -26 -46 -26C-45 -29 -45 -32 -47 -34Z" fill="${ft}"/>
  <path d="M-41 -50C-43 -60 -38 -66 -32 -66C-30 -82 -14 -86 -9 -70C-4 -84 12 -86 14 -68C20 -66 26 -60 26 -52C26 -44 20 -40 12 -40L-33 -40C-39 -42 -41 -46 -41 -50Z" fill="${u('b')}"/>
  ${k.ln('M-28 -78q2 -2 4 0M-22 -81q2 -2 4 0M0 -80q2 -2 4 0M6 -78q2 -2 4 0','#c48a4a',1)}
  <path d="M-16 -70C-12 -74 -6 -74 -2 -70L4 -50L-24 -50Z" fill="${u('r')}"/><path d="M-21 -60H1M-23 -55H3" stroke="${c('#ffd23a')}" stroke-width="1.6"/><path d="M-22 -57.5H2" stroke="${c('#2aa0b8')}" stroke-width="1.4"/>
  ${[-23,-18,-13,-8,-3,2].map(x=>`<path d="M${x} -50v3.4" stroke="${c('#ffd23a')}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${x}" cy="-46" r="1.3" fill="${c('#ff8a2a')}"/>`).join('')}
  ${leg(-36,u('b'))}${leg(6,u('b'))}
  <path d="M16 -60C24 -56 30 -54 34 -62C36 -70 38 -80 43 -85L53 -81C48 -73 46 -63 42 -55C38 -45 26 -42 18 -46Z" fill="${u('b')}"/>
  ${k.ln('M22 -52q2 -2 2 -5M28 -51q2 -2 2 -5M34 -54q1 -2 1 -5','#d8a868',1)}
  ${k.ln('M30 -56Q38 -60 41 -70','#e8344a',2)}${[[33,-58],[37,-62],[40,-67]].map(([x,y])=>`<path d="M${x} ${y}v4" stroke="${c('#ffd23a')}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${x}" cy="${y+4.4}" r="1.3" fill="${c('#2aa0b8')}"/>`).join('')}
  <path d="M40 -92C44 -96 52 -96 56 -92C61 -90 64 -86 63 -82C62 -78 58 -77 54 -78L46 -79C41 -80 38 -86 40 -92Z" fill="${u('h')}"/>
  <ellipse cx="42" cy="-94" rx="2.6" ry="4" fill="${c('#c88e4c')}" transform="rotate(-30 42 -94)"/>${k.ln('M44 -95l-1 -3M46.6 -95.6v-3.2M49 -95.4l1 -2.8','#a8743c',1.2)}
  <ellipse cx="59" cy="-84.6" rx="4.4" ry="3.6" fill="${c('#f6d6a4')}"/>${k.ln('M60.6 -86.4l1.4 .8M55 -80.4Q58 -78.6 61.4 -80.6','#6a4020',.8)}
  ${k.eye(51,-88.6,2.4)}${k.ln('M48.6 -90.6l-1.4 -1.4M49.6 -91.6l-.6 -1.8M51 -91.8v-1.8','#3a2010',.7)}${k.bl(53,-83,2.6)}`}});

JIGART.subject({id:'tiger',name:'Tiger Cub',biomes:['jungle','forest'],place:'ground',w:.88,draw:o=>{const k=K(o),{c,u}=k,st=c('#2a1a14'),wh=c('#fffaf2');
  const tail='M20 -8C34 -6 40 -18 36 -32C34 -38 38 -46 44 -46';
  const ear=`<circle cx="-17" cy="-87" r="7.5" fill="${st}"/><circle cx="-17" cy="-86" r="5.8" fill="${u('h')}"/><circle cx="-17" cy="-85" r="3.4" fill="${wh}"/>`;
  const side=`<path d="M-25 -76L-15 -73L-24 -71ZM-25.5 -68L-16 -67L-25 -64.4Z" fill="${st}"/><path d="M-26 -60C-28 -56 -22 -51 -14 -52L-17 -59Z" fill="${wh}"/><ellipse cx="-11" cy="-79" rx="3" ry="1.6" fill="${wh}"/>`;
  const haunch=`<ellipse cx="-19" cy="-15" rx="11" ry="14" fill="${u('b')}"/><path d="M-30 -20L-21 -19L-29 -16ZM-29 -10L-22 -10L-28 -7ZM-26 -27L-19 -25L-24 -24Z" fill="${st}"/><ellipse cx="-22" cy="-3" rx="9" ry="3.4" fill="${wh}"/>`;
  return `<defs>${k.L('b','#ffa448','#e8701a')}${k.Rg('h','#ffb25a','#ec781e',.45,.32,.8)}</defs>${k.sh(42,4)}
  <path d="${tail}" fill="none" stroke="${u('b')}" stroke-width="7" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${st}" stroke-width="7.2" stroke-dasharray="2.4 5" stroke-dashoffset="-3"/><circle cx="44" cy="-46" r="3.5" fill="${st}"/>
  <path d="M-22 0C-30 -16 -26 -44 -12 -52C-4 -56 4 -56 12 -52C26 -44 30 -16 22 0Z" fill="${u('b')}"/>
  ${haunch}${k.mir(0,haunch)}
  <path d="M-10 -52C-4 -48 4 -48 10 -52C12 -40 8 -26 0 -24C-8 -26 -12 -40 -10 -52Z" fill="${wh}"/>
  ${[-11.5,2.5].map(x=>`<rect x="${x}" y="-34" width="9" height="34" rx="4.5" fill="${u('b')}"/><path d="M${x} -24h4l-4 2.4ZM${x+9} -18h-4l4 2.4ZM${x} -12h4l-4 2.4Z" fill="${st}"/><ellipse cx="${x+4.5}" cy="-3" rx="6.4" ry="3.6" fill="${wh}"/>${k.ln(`M${x+2.4} -1v-2.4M${x+4.5} -.8v-2.6M${x+6.6} -1v-2.4`,'#d8c4b0',.7)}`).join('')}
  ${k.ln('M-22 -40l6 2M-23 -33l6 1.4M22 -40l-6 2M23 -33l-6 1.4','#2a1a14',2)}
  ${ear}${k.mir(0,ear)}<ellipse cx="0" cy="-70" rx="25" ry="21" fill="${u('h')}"/>
  ${side}${k.mir(0,side)}
  <path d="M-2 -90L0 -82L2 -90ZM-7 -89L-4.6 -83L-3.4 -89ZM7 -89L4.6 -83L3.4 -89Z" fill="${st}"/>${k.ln('M-6 -79h12','#2a1a14',1.6)}
  <ellipse cx="-5" cy="-60" rx="6.4" ry="5" fill="${wh}"/><ellipse cx="5" cy="-60" rx="6.4" ry="5" fill="${wh}"/><ellipse cx="0" cy="-55" rx="5" ry="3" fill="${wh}"/>
  ${[-9,9].map(x=>`<circle cx="${x}" cy="-71" r="3.8" fill="${c('#ffcf4a')}"/><circle cx="${x}" cy="-71" r="2.6" fill="${c('#1a1208')}"/><circle cx="${x+1.2}" cy="-72.4" r="1.1" fill="#fff"/><circle cx="${x-1}" cy="-69.8" r=".5" fill="#fff"/>`).join('')}
  <path d="M-3.4 -64.6Q0 -66.4 3.4 -64.6Q2.6 -61.8 0 -61.4Q-2.6 -61.8 -3.4 -64.6Z" fill="${c('#ff8a9a')}"/>${k.ln('M0 -61.4v1.8M-3.2 -58.2Q0 -56.4 0 -59.6Q0 -56.4 3.2 -58.2','#5a2a1a',.9)}
  ${k.bl(-15,-62,3.4)}${k.bl(15,-62,3.4)}${k.ln('M-9 -60l-11 -2M-9 -58l-11 1.4M9 -60l11 -2M9 -58l11 1.4','#ffffff',.6,.9)}`}});

JIGART.subject({id:'cow',name:'Dairy Cow',biomes:['farm','meadow','mountains'],place:'ground',w:1.35,draw:o=>{const k=K(o),{c,u}=k,bk=c('#2a2a34'),hf=c('#4a3a34');
  const body='M-47 -46C-49 -62 -37 -68 -21 -68L14 -68C26 -68 32 -60 32 -50C32 -40 26 -34 18 -34L-39 -34C-45 -36 -47 -40 -47 -46Z';
  const leg=(x,cl,sp)=>`<rect x="${x}" y="-44" width="8.5" height="42" rx="3" fill="${cl}"/>${sp?`<path d="M${x} -40h8.5v10c-3 2 -6 1 -8.5 -1Z" fill="${bk}"/>`:''}<rect x="${x-.4}" y="-5" width="9.3" height="5" rx="1.6" fill="${hf}"/>`;
  const ear=`<g transform="rotate(-18 27 -76)"><ellipse cx="27" cy="-76" rx="7.5" ry="3.6" fill="${c('#f0f0f4')}"/><ellipse cx="27.6" cy="-76" rx="5" ry="2" fill="${c('#ffb8c4')}"/></g><path d="M34 -82C32 -86 30 -88 27 -88C29 -86 30 -84 31 -81Z" fill="${c('#f2e6c8')}"/>`;
  return `<defs>${k.L('b','#ffffff','#dcdce6')}${k.Rg('h','#ffffff','#dedee8',.45,.3,.8)}${k.L('m','#ffc8d0','#f49aaa')}<clipPath id="${o.id}cl"><path d="${body}"/></clipPath></defs>${k.sh(54,-6)}
  ${leg(-35,c('#d0d0dc'),0)}${leg(20,c('#d0d0dc'),0)}
  <path d="M-46 -60C-52 -54 -52 -46 -50 -38" fill="none" stroke="${c('#d6d6e0')}" stroke-width="2" stroke-linecap="round"/><path d="M-50 -40C-54 -36 -53 -31 -49 -31C-48 -34 -48 -37 -50 -40Z" fill="${bk}"/>
  <path d="${body}" fill="${u('b')}"/>
  <g clip-path="url(#${o.id}cl)" fill="${bk}"><path d="M-40 -70C-28 -72 -18 -66 -20 -58C-22 -50 -32 -48 -38 -52C-44 -50 -50 -56 -48 -62Z"/><path d="M-2 -70C8 -70 12 -62 8 -56C4 -50 -6 -54 -8 -60C-10 -64 -8 -70 -2 -70Z"/><path d="M-14 -44C-8 -46 -2 -42 -4 -36L-6 -32H-18C-20 -38 -18 -43 -14 -44Z"/><path d="M22 -56C28 -58 34 -54 34 -48C30 -44 24 -44 20 -48C18 -52 20 -55 22 -56Z"/></g>
  <path d="M-26 -36C-26 -30 -14 -30 -14 -36Z" fill="${u('m')}"/>${k.ln('M-23 -32v3M-17 -32v3','#e88a9a',1.6)}
  ${leg(-43,u('b'),1)}${leg(12,u('b'),0)}
  <path d="M22 -66C26 -72 34 -72 37 -66L37 -52C30 -48 24 -46 22 -50Z" fill="${u('b')}"/>
  ${k.ln('M24 -52Q32 -46 40 -52','#e8344a',2.6)}<path d="M28.4 -48.4H35.6L36.6 -41.6H27.4Z" fill="${c('#ffcc3a')}"/><ellipse cx="32" cy="-41.6" rx="5" ry="1.4" fill="${c('#e8a820')}"/><circle cx="32" cy="-40" r="1.2" fill="${c('#8a6010')}"/><path d="M30 -47v4" stroke="#fff" stroke-width=".8" opacity=".6"/>
  ${ear}${k.mir(42,ear)}
  <path d="M31 -78C31 -86 53 -86 53 -78L54 -62C54 -57 30 -57 30 -62Z" fill="${u('h')}"/>
  <path d="M44 -84C50 -85 53 -80 53 -74C50 -72 46 -73 44 -76C42 -79 42 -83 44 -84Z" fill="${bk}"/>
  ${k.ln('M38 -84l1 -3M41 -85v-3M44 -84l-1 -3','#c8c8d4',1.2)}
  <ellipse cx="42" cy="-57" rx="13" ry="8.4" fill="${u('m')}"/><ellipse cx="37.6" cy="-58" rx="1.8" ry="2.4" fill="${c('#c85a72')}"/><ellipse cx="46.4" cy="-58" rx="1.8" ry="2.4" fill="${c('#c85a72')}"/>
  ${k.ln('M38 -53.4Q42 -51 46 -53.4','#c85a72',.9)}${k.eye(36.6,-71,2.6)}${k.eye(47.6,-71,2.6)}${k.bl(33.4,-64.6,2.6)}${k.bl(50.6,-64.6,2.6)}`}});

JIGART.subject({id:'sheep',name:'Woolly Sheep',biomes:['farm','meadow','mountains'],place:'ground',w:1.3,draw:o=>{const k=K(o),{c,u}=k,fc=c('#3e3846'),hf=c('#2a2430');
  const wool=[[-38,-50,10],[-30,-62,11],[-16,-68,11],[0,-68,11],[14,-62,10],[20,-50,9],[10,-40,10],[-6,-38,10],[-22,-38,10],[-34,-42,8],[-20,-54,12],[-2,-54,12]];
  const leg=(x,cl)=>`<rect x="${x}" y="-38" width="6" height="36" rx="3" fill="${cl}"/><rect x="${x-.4}" y="-4" width="6.8" height="4" rx="1.4" fill="${hf}"/>`;
  return `<defs>${k.Rg('w','#ffffff','#e2dfe8',.38,.3,.75)}${k.Rg('h','#5a5266','#2e2836',.45,.3,.8)}</defs>${k.sh(46,0)}
  ${leg(-28,c('#2e2836'))}${leg(10,c('#2e2836'))}
  ${wool.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r+1}" fill="${c('#cfcbd8')}"/>`).join('')}
  ${wool.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${u('w')}"/>`).join('')}
  ${wool.map(([x,y,r])=>k.ln(`M${f(x-r*.4)} ${f(y+r*.1)}q${f(r*.25)} ${f(-r*.4)} ${f(r*.5)} 0q${f(r*.25)} ${f(r*.4)} ${f(r*.4)} ${f(-r*.2)}`,'#d4d0dc',.9)).join('')}
  <circle cx="-46" cy="-54" r="4.6" fill="${u('w')}"/>
  ${leg(-36,fc)}${leg(2,fc)}
  <g transform="rotate(-20 21 -64)"><ellipse cx="21" cy="-64" rx="8" ry="3.6" fill="${fc}"/><ellipse cx="21.6" cy="-64" rx="5" ry="1.8" fill="${c('#ffb0c0')}"/></g><g transform="rotate(20 51 -64)"><ellipse cx="51" cy="-64" rx="8" ry="3.6" fill="${fc}"/><ellipse cx="50.4" cy="-64" rx="5" ry="1.8" fill="${c('#ffb0c0')}"/></g>
  <path d="M36 -72C45 -72 48 -64 47 -56C46 -48 41 -43 36 -43C31 -43 26 -48 25 -56C24 -64 27 -72 36 -72Z" fill="${u('h')}"/>
  ${[[29,-72,5],[36,-75,6],[43,-72,5],[32,-77,4.4],[40,-78,4.4]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${u('w')}"/>`).join('')}
  ${[31,41].map(x=>`<ellipse cx="${x}" cy="-60" rx="3.6" ry="3.8" fill="${c('#ffffff')}"/><circle cx="${x+.4}" cy="-59.6" r="2.4" fill="${c('#140e18')}"/><circle cx="${x+1.2}" cy="-60.6" r=".9" fill="#fff"/>`).join('')}
  ${k.bl(28.6,-53.6,2.6)}${k.bl(43.4,-53.6,2.6)}${k.ln('M34.4 -51.6l1.6 1l1.6 -1M36 -50.6v1.4M33.6 -48Q36 -46.6 38.4 -48','#8a7a92',.9)}
  <path d="M38 -47.6C42 -46 46 -44 50 -40" fill="none" stroke="${c('#4caa3a')}" stroke-width="1" stroke-linecap="round"/>${flower(50.5,-41,1.1,c('#ffffff'),c('#ffcc2a')).replace('<path d="M0 0V8" stroke="#3f8a3a" stroke-width="1.2"/>','')}`}});
JIGART.subject({id:'unicorn',name:'Rainbow Unicorn',biomes:['candy','meadow','forest','mountains'],place:'ground',w:1.05,draw:o=>{const k=K(o),{c,u}=k,gd=c('#f2c040');
  const rb=['#ff6b9a','#ffa04a','#ffd84a','#6ad07a','#5ab4ff','#a07aff'];
  const mane=i=>`M${f(30-i*1.6)} ${f(-101+i*.9)}C${f(19-i*2)} ${f(-99+i)} ${f(15-i*2)} ${f(-91+i)} ${f(17-i*2)} -83C${f(12-i*2)} -79 ${f(8-i*2)} -73 ${f(11-i*2)} -66C${f(6-i*2)} -64 ${f(3-i*2)} -59 ${f(6-i*2.2)} ${f(-53+i)}`;
  const tail=i=>`M${f(-35-i*.6)} ${f(-60+i*1.6)}C${f(-48-i*1.4)} ${f(-62+i)} ${f(-54-i*1.6)} -50 ${f(-50-i*1.6)} -40C${f(-47-i*1.4)} -32 ${f(-52-i*1.6)} -25 ${f(-57-i*1.2)} ${f(-22+i*.6)}`;
  const leg=(x,cl)=>`<path d="M${x} -44C${x} -30 ${x+1.4} -16 ${x+.6} -6H${x+6.6}C${x+6.6} -16 ${x+8} -30 ${x+8} -42Z" fill="${cl}"/><ellipse cx="${x+3.6}" cy="-7.4" rx="5" ry="2.6" fill="${c('#fff6fc')}"/><path d="M${x-.6} -6h8.4l.6 6h-9.6Z" fill="${gd}"/><path d="M${x+.4} -5.2h2" stroke="#fff" stroke-width=".8" opacity=".7"/>`;
  return `<defs>${k.L('b','#ffffff','#e6dcf6')}${k.Rg('h','#ffffff','#e8e0f6',.4,.3,.8)}${k.L('l','#efe8fa','#d8ccee')}${k.L('hn','#fff6c0','#f0b830',1,0)}</defs>${k.sh(46,-2)}
  ${leg(-26,c('#d6cce8'))}${leg(18,c('#d6cce8'))}
  ${rb.map((cl,i)=>`<path d="${tail(i)}" fill="none" stroke="${c(cl)}" stroke-width="3.4" stroke-linecap="round"/>`).join('')}
  <path d="M-38 -50C-40 -62 -28 -68 -12 -66L12 -66C24 -68 30 -60 30 -50C30 -40 24 -36 16 -36L-30 -36C-36 -38 -38 -44 -38 -50Z" fill="${u('b')}"/>
  ${k.ln('M-30 -40C-20 -38 0 -38 14 -40','#d8ccec',1.4)}${k.ln('M-26 -54C-24 -50 -20 -48 -16 -48','#d8ccec',1.2)}
  ${leg(-34,u('l'))}${leg(10,u('l'))}
  <path d="M-38 -50C-38 -40 -34 -34 -26 -34C-20 -36 -18 -44 -20 -52C-24 -58 -36 -58 -38 -50Z" fill="${u('b')}"/><path d="M-36 -44C-34 -38 -30 -36 -25 -37" fill="none" stroke="${c('#d8ccec')}" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M10 -60C14 -72 18 -82 24 -88L38 -86C34 -76 31 -64 27 -54Z" fill="${u('b')}"/>
  ${rb.map((cl,i)=>`<path d="${mane(i)}" fill="none" stroke="${c(cl)}" stroke-width="3.4" stroke-linecap="round"/>`).join('')}
  <path d="M27 -95L28 -103L33 -97Z" fill="${c('#f4eefc')}"/><path d="M28.6 -97.4L29 -101L31.4 -98Z" fill="${c('#ffb8d0')}"/>
  <path d="M24 -94C28 -100 38 -100 42 -94C46 -88 50 -82 50 -76C50 -71 46 -69 42 -70C36 -71 30 -74 26 -80C23 -84 22 -90 24 -94Z" fill="${u('h')}"/>
  <ellipse cx="45.6" cy="-75" rx="5" ry="4.4" fill="${c('#ffd8e6')}"/><ellipse cx="47.6" cy="-76.4" rx="1" ry=".7" fill="${c('#c87a9a')}"/>${k.ln('M42.4 -71.6Q45 -70.4 47.4 -72','#c87a9a',.9)}
  <path d="M33 -98L45 -110L39.4 -96Z" fill="${u('hn')}"/>${k.ln('M35.4 -99.6l3.6 .4M37.6 -102.2l3 .4M40 -104.8l2.4 .4','#d89a1a',1)}
  ${rb.slice(0,4).map((cl,i)=>`<path d="M${f(31-i*.6)} ${f(-97+i*.4)}C${f(34+i)} ${f(-93+i*.6)} ${f(35+i)} ${f(-90+i)} ${f(33+i*.6)} ${f(-87+i)}" fill="none" stroke="${c(cl)}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}
  <ellipse cx="38" cy="-86" rx="3.4" ry="4" fill="${c('#2a1a3a')}"/><circle cx="39.2" cy="-87.6" r="1.4" fill="#fff"/><circle cx="37" cy="-84.4" r=".6" fill="#fff"/>
  ${k.ln('M35 -89l-1.6 -1.6M36.2 -89.8l-.8 -2M37.6 -90.2v-2','#2a1a3a',.7)}${k.bl(40,-79,3)}
  ${[[-48,-80,3.4],[-30,-82,2.4],[54,-96,3],[56,-60,2.6],[-58,-60,2]].map(([x,y,s])=>spark(x,y,s,o.night?'#fff6c0':c('#ffe680'),.9)).join('')}`}});

JIGART.subject({id:'hedgehog',name:'Hedgehog',biomes:['forest','autumn','garden','meadow'],place:'ground',w:1.45,draw:o=>{const k=K(o),{c,u}=k;
  let sp='';[[50,.0],[42,.5],[33,.25],[24,.7]].forEach(([r,o2],j)=>{let dd='',h='';for(let a=194+o2*8+j*3;a<=330-j*6;a+=9-j){const q=a*Math.PI/180,d=.075,ry=1.12;
    const b1=[-6+Math.cos(q-d)*r,-4+Math.sin(q-d)*r*ry],b2=[-6+Math.cos(q+d)*r,-4+Math.sin(q+d)*r*ry],t=[-6+Math.cos(q-.05)*(r+12),-4+Math.sin(q-.05)*(r+12)*ry];
    dd+=P([b1,t,b2]);h+=`M${f(t[0])} ${f(t[1])}L${f((t[0]*2+b1[0])/3)} ${f((t[1]*2+b1[1])/3)}`}
    sp+=`<path d="${dd}" fill="${c(j%2?'#6a4630':'#4e3220')}"/><path d="${h}" stroke="${c('#e2c49a')}" stroke-width="1.1" stroke-linecap="round"/>`});
  return `<defs>${k.Rg('b','#9a7050','#5a3a26',.4,.3,.8)}${k.L('f','#f8dcb4','#e0b888')}${k.Rg('ap','#ff7a6a','#c81e2a',.35,.3,.8)}</defs>${k.sh(50,2)}
  <path d="M-54 -2C-56 -40 -32 -60 -6 -60C20 -60 34 -44 36 -24L30 -2Z" fill="${u('b')}"/>${sp}
  <path d="M6 -40C20 -44 32 -32 44 -21C48 -17 48 -12 43 -10C32 -5 18 -2 4 -2C-2 -14 -2 -32 6 -40Z" fill="${u('f')}"/>
  <path d="M6 -40C14 -42 20 -38 24 -34C16 -36 10 -34 6 -28Z" fill="${c('#6a4630')}"/>
  <circle cx="46.5" cy="-17" r="4" fill="${c('#2a1a14')}"/><circle cx="45.4" cy="-18.2" r="1.3" fill="#fff" opacity=".7"/>
  <circle cx="17" cy="-36" r="5" fill="${c('#e8b888')}"/><circle cx="17" cy="-36" r="2.8" fill="${c('#f4a8a8')}"/>
  ${k.eye(28,-25,3)}${k.ln('M25 -30.4l-1 -1.6M27 -31l-.4 -1.8','#3a2414',.7)}${k.bl(31,-17,3.4)}${k.ln('M39 -11Q42 -9 44.6 -11.4','#8a5030',.9)}
  <ellipse cx="0" cy="-1.6" rx="6" ry="3" fill="${c('#c8906a')}"/><ellipse cx="24" cy="-1.6" rx="6" ry="3" fill="${c('#c8906a')}"/>${k.ln('M-2 -1v-1.6M1 -1v-1.6M22 -1v-1.6M25 -1v-1.6','#8a5a3a',.7)}
  <g transform="translate(-10 -64)"><circle cx="-4" cy="0" r="9" fill="${u('ap')}"/><circle cx="4" cy="0" r="9" fill="${u('ap')}"/><ellipse cx="-4" cy="-3" rx="2.6" ry="3.6" fill="#fff" opacity=".45"/><path d="M0 -8C0 -11 1 -13 2.6 -14.4" stroke="${c('#6a4020')}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M1.6 -12C5 -16 10 -15 11 -12C8 -10 4 -10 1.6 -12Z" fill="${c('#5aaa3a')}"/></g>
  <g transform="translate(-34 -46) rotate(-30)"><path d="M0 0C4 -6 12 -6 16 0C12 6 4 6 0 0Z" fill="${c('#ff9a2a')}"/>${k.ln('M0 0H16M5 0l3 -3M5 0l3 3M10 0l2.6 -2.6M10 0l2.6 2.6','#d86a10',.7)}</g>
  `}});

JIGART.subject({id:'snowman',name:'Jolly Snowman',biomes:['snow'],place:'ground',w:.75,draw:o=>{const k=K(o),{c,u}=k,cl=c('#22222c'),tw=c('#7a4e2a');
  return `<defs>${k.Rg('s','#ffffff','#cfdff0',.38,.3,.8)}${k.L('hat','#3a3a4a','#16161e',1,0)}${k.L('sc','#ff4a5a','#d81e3a')}${k.L('cr','#ffa040','#ee6a1a')}</defs>${k.sh(36)}
  <ellipse cx="0" cy="-1" rx="30" ry="4" fill="${c('#eaf2fa')}"/>
  <path d="M-15 -58L-36 -76M-28 -69L-36 -66M-31 -72L-33 -80" stroke="${tw}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M15 -56L38 -64M30 -61L35 -70M33 -62L40 -58" stroke="${tw}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M-41 -80C-44 -84 -40 -88 -37 -85L-35 -82C-34 -80 -36 -77 -38 -77Z" fill="${c('#3a8ae0')}"/><path d="M-36.5 -79.5L-33.8 -76.6" stroke="${c('#ffffff')}" stroke-width="1.6"/>
  <circle cx="0" cy="-23" r="23" fill="${u('s')}"/><circle cx="0" cy="-55" r="16.5" fill="${u('s')}"/>
  ${k.ln('M-14 -12q-2 4 0 8M10 -36q6 -1 10 2','#c4d6ea',1.2)}
  ${[[-40,1],[-52,1],[-28,.9],[-14,1.2]].map(([y,r])=>`<circle cx="0" cy="${y}" r="${f(2.2*r)}" fill="${cl}"/>`).join('')}
  <circle cx="0" cy="-81" r="12.5" fill="${u('s')}"/>
  ${k.eye(-4.5,-84,1.9,'#22222c')}${k.eye(4.5,-84,1.9,'#22222c')}${k.bl(-7.4,-78.6,2.4)}${k.bl(7.4,-78.6,2.4)}
  <path d="M-.6 -82C4 -81.6 10 -80.4 15 -78.4C10 -78 4 -78.2 -.6 -79Z" fill="${u('cr')}"/>${k.ln('M3 -81.6l.6 1.8M7 -80.8l.4 1.6','#c8501a',.6)}
  ${[-5,-2.6,0,2.6,5].map((x,i)=>`<circle cx="${x}" cy="${f(-75.6+Math.abs(x)*-.24+ (i===2?.6:0))}" r=".95" fill="${cl}"/>`).join('')}
  <path d="M-14 -71C-6 -66 6 -66 14 -71L14 -66C6 -61 -6 -61 -14 -66Z" fill="${u('sc')}"/>
  <path d="M-12 -66L-15 -48L-8 -47L-6 -63Z" fill="${u('sc')}"/>${[-10,-6,2,8].map(x=>`<path d="M${x} -70.2v6" stroke="${c('#ffffff')}" stroke-width="1.6"/>`).join('')}
  <path d="M-13.6 -60L-7.2 -59.2M-14.4 -54L-7.8 -53.2" stroke="${c('#ffffff')}" stroke-width="1.6"/>${k.ln('M-14.6 -47.4v2.4M-12.4 -47v2.4M-10.2 -46.8v2.4','#d81e3a',1)}
  <ellipse cx="0" cy="-92" rx="17" ry="3.4" fill="${u('hat')}"/><path d="M-10.5 -92.6L-11 -109.4H11L10.5 -92.6Z" fill="${u('hat')}"/><path d="M-10.7 -96.6H10.7V-92.8H-10.7Z" fill="${c('#e8344a')}"/>
  <path d="M5 -95.6C7 -99 11 -100 13 -98C11 -96 8 -95 5 -95.6ZM5 -95.6C4 -99 1 -101 -2 -100C-1 -97 2 -95.4 5 -95.6Z" fill="${c('#2a8a3a')}"/><circle cx="4.4" cy="-96" r="1.5" fill="${c('#e8202a')}"/><circle cx="6.6" cy="-95" r="1.4" fill="${c('#e8202a')}"/>
  <ellipse cx="-6" cy="-104" rx="1.3" ry="4" fill="#fff" opacity=".18"/>
  <g transform="translate(31 -63)"><ellipse cx="0" cy="-4" rx="5" ry="4.2" fill="${c('#8a6a50')}"/><path d="M1 -3C2 -1 2 1 0 2C-3 1 -4 -1 -2 -3Z" fill="${c('#ff6a3a')}"/><circle cx="3.6" cy="-7.4" r="3.4" fill="${c('#8a6a50')}"/><path d="M6.6 -8L9 -7.2L6.6 -6.4Z" fill="${c('#f0a020')}"/><circle cx="4.6" cy="-8" r=".8" fill="${c('#1a1010')}"/><path d="M-4 -5L-9 -6L-5 -2Z" fill="${c('#6a5040')}"/></g>`}});

/* ---------------------------------------------------------------- trees and plants */
JIGART.subject({id:'oak',name:'Old Oak and Swing',biomes:['meadow','farm','lake','autumn'],place:'ground',w:1.15,draw:o=>{const k=K(o),{c,u}=k,R=o.R;
  const back=[[-40,-78,20],[-20,-90,19],[4,-92,18],[28,-88,19],[46,-76,17],[-52,-64,12],[54,-64,10],[0,-74,22],[-24,-70,16],[26,-72,16],[-46,-90,12],[44,-94,11]];
  const mid=[[-36,-82,15],[-14,-94,14],[10,-96,13],[32,-86,14],[-4,-80,16],[18,-78,13],[-28,-72,11],[44,-74,11],[-50,-70,9],[50,-82,9]];
  const hi=[[-38,-89,8],[-16,-100,7],[10,-102,6.4],[32,-93,7],[-3,-88,8],[20,-84,6],[46,-79,5]];
  return `<defs>${lin(o.id+'t',[[0,c('#5a3a22')],[.45,c('#8a5e3a')],[1,c('#4a2e1a')]],1,0)}${k.Rg('g1','#4a9a3e','#2e6a2c',.4,.3,.8)}${k.Rg('g2','#6cbc4c','#3e8a38',.38,.3,.8)}${k.Rg('g3','#9ade6a','#6cbc4c',.4,.35,.75)}</defs>${k.sh(40,4)}
  <path d="M-22 1C-15 -1 -12 -6 -11 -16C-10 -32 -9 -46 -8 -60L8 -60C9 -46 10 -32 11 -16C12 -6 15 -1 22 1Z" fill="${u('t')}"/>
  ${k.ln('M-5 -6C-3 -20 -6 -34 -3 -50M4 -10C6 -24 3 -36 5 -52M-9 -24C-8 -30 -8 -36 -7 -42','#3e2414',1.2,.6)}
  <ellipse cx="2" cy="-30" rx="3.2" ry="4.6" fill="${c('#2e1a0c')}"/><ellipse cx="2" cy="-30" rx="4.8" ry="6.2" fill="none" stroke="${c('#6a4428')}" stroke-width="1.4"/>
  <path d="M-6 -54C-16 -62 -26 -66 -38 -74M5 -50C18 -52 32 -52 50 -55M2 -58C4 -70 6 -80 4 -90M-4 -58C-10 -72 -18 -82 -22 -88" stroke="${c('#6a4428')}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g fill="${u('g1')}">${back.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <path d="M8 -50C20 -52 34 -52 50 -55" stroke="${c('#7a5232')}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
  <g fill="${u('g2')}">${mid.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <g fill="${u('g3')}" opacity=".9">${hi.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  ${Array.from({length:16},(_,i)=>{const [x,y,r]=back[i%back.length],a=R()*6.28,d=r*(.3+R()*.5);return `<path d="M${f(x+Math.cos(a)*d)} ${f(y+Math.sin(a)*d)}q2 -3 4 0q-2 3 -4 0Z" fill="${c('#2e6a2c')}" opacity=".7"/>`}).join('')}
  ${[[-30,-58],[-12,-56],[16,-58],[38,-62],[-44,-56],[56,-58]].map(([x,y])=>`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="1.6" rx="2" ry="2.6" fill="${c('#c8843a')}"/><path d="M-2.4 .4C-2.4 -2 2.4 -2 2.4 .4Z" fill="${c('#7a5232')}"/><path d="M0 -1.4v-1.6" stroke="${c('#5a3a22')}" stroke-width=".8"/></g>`).join('')}
  <path d="M28 -52L27 -14M44 -54L45 -14" stroke="${c('#d8b878')}" stroke-width="1.2"/><path d="M28 -52L27 -14M44 -54L45 -14" stroke="${c('#a88a4a')}" stroke-width="1.2" stroke-dasharray="1 1.4"/>
  <rect x="22" y="-15" width="28" height="4" rx="1.4" fill="${c('#a8743e')}"/><rect x="22" y="-15" width="28" height="1.4" rx=".7" fill="${c('#d49a5a')}"/>
  ${k.ln('M26 -53.6q2 -1.6 4 0M42 -55.6q2 -1.6 4 0','#c8a868',1.4)}
  ${tuft(-18,1,1.1,c('#4a9a3e'))}${tuft(18,1,1,c('#4a9a3e'))}${flower(-28,-1,.8,c('#ffffff'))}${flower(-34,0,.7,c('#ffd23a'),c('#e8801a'))}`}});

JIGART.subject({id:'sakura',name:'Cherry Blossom Tree',biomes:['garden','lake','mountains'],place:'ground',w:1.12,draw:o=>{const k=K(o),{c,u}=k,R=o.R;
  const cl=[[-40,-70,15],[-26,-84,17],[-6,-92,16],[14,-91,16],[34,-80,16],[48,-66,12],[-52,-58,10],[0,-76,17],[22,-68,13],[-20,-66,13],[-48,-80,9],[44,-90,9]];
  const pet=(x,y,a)=>`<path d="M0 0C1.6 -1.6 3.4 -1 3.6 0C3.4 1 1.6 1.6 0 0Z" fill="${c('#ffb4cc')}" transform="translate(${f(x)} ${f(y)}) rotate(${a})"/>`;
  return `<defs>${lin(o.id+'t',[[0,c('#4a2e30')],[.5,c('#7a5050')],[1,c('#3e2428')]],1,0)}${k.Rg('p1','#ffb0c8','#f283a8',.4,.3,.8)}${k.Rg('p2','#ffd0de','#ffa8c4',.38,.3,.75)}</defs>${k.sh(38,0)}
  <path d="M-16 1C-10 -2 -6 -10 -6 -22C-6 -34 -12 -42 -8 -52L6 -50C2 -42 6 -32 7 -20C8 -10 12 -2 18 1Z" fill="${u('t')}"/>
  ${k.ln('M-4 -14h4M0 -26h4M-6 -36h3M1 -42h3M-2 -8h5','#c8a0a0',1,.6)}
  <path d="M-6 -48C-16 -54 -26 -62 -40 -70M-2 -50C-2 -62 -6 -74 -6 -90M4 -48C14 -56 24 -64 34 -78M18 -60C26 -60 36 -62 46 -66M-20 -58C-24 -66 -26 -74 -26 -84" stroke="${u('t')}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
  <g fill="${u('p1')}">${cl.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
  <g fill="${u('p2')}" opacity=".95">${cl.map(([x,y,r])=>`<circle cx="${f(x-r*.18)}" cy="${f(y-r*.22)}" r="${f(r*.62)}"/>`).join('')}</g>
  ${cl.map(([x,y,r])=>Array.from({length:3},()=>{const a=R()*6.28,d=r*(.4+R()*.55),bx=f(x+Math.cos(a)*d),by=f(y+Math.sin(a)*d),sc=.9+R()*.5;
    return `<circle cx="${bx}" cy="${by}" r="${f(1.9*sc)}" fill="none" stroke="${c(R()<.5?'#ffffff':'#ffe4ee')}" stroke-width="${f(2.9*sc)}" stroke-dasharray="0 ${f(2.39*sc)}" stroke-linecap="round"/><circle cx="${bx}" cy="${by}" r="${f(.8*sc)}" fill="${c('#ff5a8a')}"/>`}).join('')).join('')}
  ${Array.from({length:10},()=>pet(-56+R()*112,-48+R()*44,R()*360)).join('')}
  ${[[-10,1],[14,1]].map(([x])=>pet(x,-1,R()*180)).join('')}`}});

JIGART.subject({id:'cactus',name:'Saguaro Cacti',biomes:['desert','canyon'],place:'ground',w:1,draw:o=>{const k=K(o),{c,u}=k,g=c('#4aa046'),gd=c('#2e7a34'),gl=c('#86d070');
  const ribs=(x,w,y0,y1)=>[-.3,0,.3].map(t=>`<path d="M${f(x+t*w)} ${y0}V${y1}" stroke="${gd}" stroke-width=".9" opacity=".7"/>`).join('');
  const spines=(x,w,y0,y1)=>{let s='';for(let y=y0-4;y>y1+4;y-=7)for(const t of[-.45,0,.45])s+=`M${f(x+t*w-1)} ${f(y)}h2M${f(x+t*w)} ${f(y-1)}v2`;return `<path d="${s}" stroke="${c('#fff6d8')}" stroke-width=".55" opacity=".85"/>`};
  const arm=(d,w)=>`<path d="${d}" stroke="${gd}" stroke-width="${w+1.6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${g}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const fl=(x,y,s,col)=>`<path d="${[-75,-40,-5,30,65,100,-110].map(a=>{const q=(a-90)*Math.PI/180;return circ(x+Math.cos(q)*2.8*s,y+Math.sin(q)*2.8*s,1.9*s)}).join('')}" fill="${c(col)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4*s)}" fill="${c('#ffd23a')}"/>`;
  return `<defs>${lin(o.id+'b',[[0,c('#3e9040')],[.4,c('#6cc060')],[1,c('#2e7a34')]],1,0)}${k.Rg('br','#7ad06a','#3a8a3e',.4,.3,.75)}</defs>${k.sh(48,0)}
  ${arm('M-6 -44H-26Q-34 -44 -34 -52V-72',12)}${arm('M4 -56H18Q24 -56 24 -62V-84',11)}
  ${k.ln('M-32 -54V-70M22 -64V-82','#86d070',2,.7)}
  <rect x="-17" y="-100" width="22" height="100" rx="11" fill="${u('b')}"/>${ribs(-6,22,-2,-96)}${spines(-6,22,-2,-98)}
  ${k.ln('M-34 -60v-6M-31 -66v-4M24 -70v-6M21 -76v-4','#fff6d8',.6,.8)}
  ${fl(-6,-100,1.2,'#ffffff')}${fl(-34,-74,1,'#ffffff')}${fl(24,-86,1,'#fff0f4')}${fl(-12,-97,.8,'#fff6e8')}
  ${arm('M-44 0V-46',9)}${k.ln('M-46 -4V-44','#86d070',1.6,.7)}${arm('M-44 -26H-50Q-54 -26 -54 -30V-36',6)}${spines(-44,8,-2,-46)}${fl(-44,-48,.9,'#ff7aa8')}
  <ellipse cx="34" cy="-11" rx="13" ry="11.5" fill="${u('br')}"/>${[-8,-3.5,0,3.5,8].map(x=>`<path d="M${34+x} -21.6Q${34+x*1.5} -11 ${34+x} -.4" stroke="${gd}" stroke-width=".8" fill="none" opacity=".75"/>`).join('')}
  ${[[28,-16],[40,-16],[34,-6],[26,-8],[42,-8]].map(([x,y])=>`<path d="M${x-1} ${y}h2M${x} ${y-1}v2" stroke="${c('#fff6d8')}" stroke-width=".6"/>`).join('')}
  ${fl(30,-22,.8,'#ff5a9a')}${fl(37,-23,.9,'#ff7ab0')}${fl(43,-19,.7,'#ff5a9a')}
  <path d="M-30 1C-30 -4 -24 -6 -20 -3C-18 -6 -12 -5 -12 1Z" fill="${c('#b88a66')}"/><path d="M48 1C48 -3 52 -5 56 -3C58 -2 58 0 58 1Z" fill="${c('#a87a58')}"/>
  ${k.ln('M-27 -2q2 -1 4 0','#d8b08a',.8)}`}});

JIGART.subject({id:'palm',name:'Coconut Palms',biomes:['island','coast','volcano','desert'],place:'ground',w:1.05,draw:o=>{const k=K(o),{c,u}=k;
  const trunk=(x0,x1,y1,cx,cy,w0,w1)=>{const B=t=>[(1-t)*(1-t)*x0+2*(1-t)*t*cx+t*t*x1,2*(1-t)*t*cy+t*t*y1];const n=14;let L=[],Rr=[],rings='';
    for(let i=0;i<=n;i++){const t=i/n,p=B(t),q=B(Math.min(1,t+.01)),p0=B(Math.max(0,t-.01)),dx=q[0]-p0[0],dy=q[1]-p0[1],l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,w=(w0+(w1-w0)*t)/2;
      L.push([p[0]+nx*w,p[1]+ny*w]);Rr.push([p[0]-nx*w,p[1]-ny*w]);if(i&&i<n)rings+=`<path d="M${f(p[0]+nx*w)} ${f(p[1]+ny*w)}Q${f(p[0]+dx/l*2.4)} ${f(p[1]+dy/l*2.4)} ${f(p[0]-nx*w)} ${f(p[1]-ny*w)}" stroke="${c('#8a6236')}" stroke-width="1" fill="none"/>`}
    return `<path d="${P([...L,...Rr.reverse()])}" fill="url(#${o.id}t)"/>${rings}`};
  const frond=(x,y,a,len,dr)=>{const q=a*Math.PI/180,pt=t=>[x+Math.cos(q)*len*t,y+Math.sin(q)*len*t+dr*len*t*t];let up=[],dn=[];
    for(let i=0;i<=10;i++){const t=i/10,p=pt(t),p2=pt(Math.min(1,t+.02)),p1=pt(Math.max(0,t-.02)),dx=p2[0]-p1[0],dy=p2[1]-p1[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,w=Math.sin(Math.PI*Math.min(1,t*1.15))*len*.2*(i%2?1:.55)+.4;
      up.push([p[0]+nx*w+dx/l*(i%2?2:0),p[1]+ny*w+dy/l*(i%2?2:0)]);dn.push([p[0]-nx*w+dx/l*(i%2?2:0),p[1]-ny*w+dy/l*(i%2?2:0)])}
    const m=[pt(0),pt(.5),pt(1)];return `<path d="${P([...up,...dn.reverse()])}" fill="url(#${o.id}f)"/><path d="M${f(m[0][0])} ${f(m[0][1])}Q${f(m[1][0]*2-(m[0][0]+m[2][0])/2)} ${f(m[1][1]*2-(m[0][1]+m[2][1])/2)} ${f(m[2][0])} ${f(m[2][1])}" stroke="${c('#3a7a2a')}" stroke-width="1" fill="none"/>`};
  const crown=(x,y,s)=>{const fr=[[200,.55],[235,.42],[265,.36],[300,.4],[335,.55],[160,.9],[20,.9]];
    return fr.slice(5).map(([a,d])=>frond(x,y,a,30*s,d)).join('')+`${[[-3,3],[3,3.4],[0,6.4]].map(([dx,dy])=>`<circle cx="${f(x+dx*s)}" cy="${f(y+dy*s)}" r="${f(3.6*s)}" fill="${c('#7a4e26')}"/><circle cx="${f(x+dx*s-1)}" cy="${f(y+dy*s-1)}" r="${f(1.2*s)}" fill="${c('#a87444')}"/>`).join('')}`+fr.slice(0,5).map(([a,d])=>frond(x,y,a,32*s,d)).join('')};
  return `<defs>${lin(o.id+'t',[[0,c('#c89a5e')],[.5,c('#e2bc82')],[1,c('#a87a46')]],1,0)}${k.L('f','#7ad04a','#3a9a34')}</defs>${k.sh(46,0)}
  <path d="M-38 1C-30 -6 -8 -8 4 -6C20 -8 36 -6 44 1Z" fill="${c('#f2d8a0')}"/>
  ${trunk(6,30,-64,10,-30,10,6.4)}${trunk(-4,-24,-80,-4,-40,11,6.8)}
  ${crown(30,-64,.82)}${crown(-24,-80,1)}
  <g transform="translate(-26 -2)"><path d="M0 -4L1.2 -1.2L4 -1L1.8 .8L2.6 3.6L0 2L-2.6 3.6L-1.8 .8L-4 -1L-1.2 -1.2Z" fill="${c('#ff8a5a')}"/></g>
  <path d="M30 -.6C30 -4 36 -4 36 -.6Z" fill="${c('#ffd0c0')}"/>${k.ln('M31.4 -1v-2M33 -1v-2.6M34.6 -1v-2','#e8a090',.6)}`}});

JIGART.subject({id:'sunflower',name:'Sunflowers',biomes:['farm','meadow'],place:'ground',w:1,draw:o=>{const k=K(o),{c,u}=k;
  const head=(x,y,r,a)=>{const q0=a*Math.PI/180;let bk='',fr='',s1='',s2='';
    for(let i=0;i<32;i++){const q=q0+(i+.5)*Math.PI/16,rr=i%2?r*1.32:r*.9;bk+=(i?'L':'M')+f(x+Math.cos(q)*rr)+' '+f(y+Math.sin(q)*rr)}
    for(let i=0;i<16;i++){const q=q0+i*Math.PI/8,cs=Math.cos(q),sn=Math.sin(q),b=r*.45,t=r*1.38,m=r*.9,w=r*.32;
      fr+=`M${f(x+cs*b)} ${f(y+sn*b)}Q${f(x+cs*m-sn*w)} ${f(y+sn*m+cs*w)} ${f(x+cs*t)} ${f(y+sn*t)}Q${f(x+cs*m+sn*w)} ${f(y+sn*m-cs*w)} ${f(x+cs*b)} ${f(y+sn*b)}Z`}
    for(const [k2,col] of [[.12,'#2e1a0c'],[.22,'#5a3414'],[.32,'#2e1a0c'],[.42,'#7a4a1c']]){const rr=r*k2,nn=Math.max(5,Math.round(6.283*rr/(r*.11)));s1+=`<circle cx="${x}" cy="${y}" r="${f(rr)}" fill="none" stroke="${c(col)}" stroke-width="${f(r*.08)}" stroke-dasharray="0 ${f(6.283*rr/nn)}" stroke-linecap="round" transform="rotate(${k2*300} ${x} ${y})"/>`}
    return `<path d="${bk}Z" fill="${c('#f09a1a')}" stroke="${c('#f09a1a')}" stroke-width="${f(r*.14)}" stroke-linejoin="round"/><path d="${fr}" fill="url(#${o.id}p)" stroke="${c('#f0a020')}" stroke-width=".5"/><circle cx="${x}" cy="${y}" r="${f(r*.55)}" fill="url(#${o.id}c)"/>${s1}<circle cx="${x}" cy="${y}" r="${f(r*.55)}" fill="none" stroke="${c('#c87a1a')}" stroke-width="${f(r*.06)}"/>`};
  const leaf=(x,y,a,s)=>`<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0C4 -8 16 -10 22 -4C18 4 6 6 0 0Z" fill="url(#${o.id}l)"/><path d="M0 0C8 -3 14 -4 21 -4M7 -2.4l3 -3.6M12 -3.4l3 -3M8 -2.6l2.4 2.6M13 -3.6l2.6 2.4" stroke="${c('#2e7a2a')}" stroke-width=".7" fill="none"/></g>`;
  return `<defs>${k.L('p','#ffe04a','#ffbc1a')}${k.Rg('c','#8a5a2a','#4a2a12',.4,.35,.7)}${k.L('l','#7cc85a','#3e9a3a')}${k.L('s','#5aa83a','#3e8a2e',1,0)}</defs>${k.sh(40,0)}
  <path d="M-34 0C-34 -20 -36 -40 -36 -64" stroke="${c('#4a9a34')}" stroke-width="3.6" fill="none"/><path d="M28 0C28 -16 30 -34 30 -50" stroke="${c('#4a9a34')}" stroke-width="3.4" fill="none"/><path d="M-4 0C-2 -30 -6 -60 -4 -80" stroke="${c('#4a9a34')}" stroke-width="4.2" fill="none"/>
  ${leaf(-35,-30,200,1.1)}${leaf(-35,-44,-20,.9)}${leaf(29,-22,-30,1)}${leaf(29,-34,195,.85)}${leaf(-4,-40,-25,1.2)}${leaf(-3,-58,200,1.1)}${leaf(-5,-20,195,1.1)}
  ${head(-36,-66,17,-12)}${head(30,-52,15,10)}${head(-4,-83,20,4)}
  <g transform="translate(10 -40) rotate(-25)"><ellipse rx="3" ry="2.4" fill="${c('#e8202a')}"/><path d="M0 -2.4V2.4" stroke="${c('#1a1010')}" stroke-width=".6"/><circle cx="2.8" cy="0" r="1.3" fill="${c('#1a1010')}"/><circle cx="-1.2" cy="-1" r=".6" fill="${c('#1a1010')}"/><circle cx="1" cy="1.2" r=".6" fill="${c('#1a1010')}"/><circle cx="-1.4" cy="1.2" r=".5" fill="${c('#1a1010')}"/></g>
  <g transform="translate(22 -82)"><ellipse cx="-1.4" cy="-3.4" rx="2.4" ry="3.6" fill="${c('#ffffff')}" opacity=".85" transform="rotate(-25 -1.4 -3.4)"/><ellipse cx="1.8" cy="-3.4" rx="2.4" ry="3.6" fill="${c('#ffffff')}" opacity=".85" transform="rotate(25 1.8 -3.4)"/><ellipse rx="4.4" ry="3.2" fill="${c('#ffd23a')}"/><path d="M-1.6 -3V3M1.2 -3V3" stroke="${c('#2a1a0a')}" stroke-width="1.2"/><circle cx="3.4" cy="-.6" r=".6" fill="${c('#2a1a0a')}"/></g>
  ${k.ln('M18 -80q-4 3 -8 1q-4 -2 -6 2','#8a6a3a',.6,.7)}${tuft(-18,1,1,c('#4a9a3e'))}${tuft(14,1,.9,c('#4a9a3e'))}`}});

JIGART.subject({id:'lollipoptree',name:'Lollipop Tree',biomes:['candy'],place:'ground',w:.95,draw:o=>{const k=K(o),{c,u}=k;
  const swirl=(x,y,r,a,b,turns)=>{let d='';for(let i=0;i<=70;i++){const t=i/70,q=t*turns*6.283,rr=r*.92*t;d+=(i?'L':'M')+f(x+Math.cos(q)*rr)+' '+f(y+Math.sin(q)*rr)}
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c(a)}"/><path d="${d}" fill="none" stroke="${c(b)}" stroke-width="${f(r*.2)}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${o.id}gl)"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c(mix(a,'#000000',.15))}" stroke-width="1"/><path d="M${f(x-r*.62)} ${f(y-r*.42)}A${f(r*.75)} ${f(r*.75)} 0 0 1 ${f(x-r*.1)} ${f(y-r*.74)}" stroke="#fff" stroke-width="${f(r*.12)}" fill="none" stroke-linecap="round" opacity=".7"/>`};
  const stick=(x0,y0,x1,y1)=>`<path d="M${x0} ${y0}L${x1} ${y1}" stroke="${c('#f6f0f4')}" stroke-width="3" stroke-linecap="round"/>`;
  const gum=(x,col,s=1)=>`<path d="M${f(x-6*s)} 0C${f(x-6*s)} ${f(-9*s)} ${f(x+6*s)} ${f(-9*s)} ${f(x+6*s)} 0Z" fill="${c(col)}"/><ellipse cx="${f(x-2*s)}" cy="${f(-5*s)}" rx="${f(1.4*s)}" ry="${f(2*s)}" fill="#fff" opacity=".55"/>${[[-3,-2],[2,-3],[0,-6],[3.4,-1]].map(([dx,dy])=>`<circle cx="${f(x+dx*s)}" cy="${f(dy*s)}" r="${f(.5*s)}" fill="#fff" opacity=".8"/>`).join('')}`;
  return `<defs>${rad(o.id+'gl',[[0,'#ffffff',0],[.75,'#ffffff',0],[1,'#ffffff',.35]],.4,.35,.7)}<clipPath id="${o.id}cl"><rect x="-5" y="-62" width="10" height="62" rx="3"/></clipPath></defs>${k.sh(40,0)}
  ${stick(-3,-46,-34,-62)}${stick(3,-42,34,-58)}
  <rect x="-5" y="-62" width="10" height="62" rx="3" fill="${c('#fff8fa')}"/><g clip-path="url(#${o.id}cl)">${Array.from({length:10},(_,i)=>`<path d="${P([[-6,-i*8+2],[6,-i*8-6],[6,-i*8-2],[-6,-i*8+6]])}" fill="${c('#ff4a7a')}"/>`).join('')}<rect x="-5" y="-62" width="3" height="62" fill="#fff" opacity=".35"/></g>
  ${swirl(-36,-64,13,'#6ad8b0','#ffffff',3)}${swirl(36,-60,13,'#ffc83a','#ff7a3a',3)}${swirl(0,-82,26,'#ff7ab0','#ffffff',4)}
  <g transform="translate(0 -56)"><path d="M0 0C-6 -6 -14 -6 -14 0C-14 6 -6 6 0 0ZM0 0C6 -6 14 -6 14 0C14 6 6 6 0 0Z" fill="${c('#5ab4ff')}"/><path d="M0 0L-5 12L-2 12ZM0 0L5 12L2 12Z" fill="${c('#3a94e8')}"/><circle r="3" fill="${c('#3a94e8')}"/><path d="M-10 -2C-8 -3 -6 -2 -5 -1M10 -2C8 -3 6 -2 5 -1" stroke="#fff" stroke-width=".8" fill="none" opacity=".6"/></g>
  ${gum(-20,'#a07aff')}${gum(22,'#ff6a6a',.9)}${gum(-32,'#ffd23a',.7)}${gum(34,'#6ad07a',.7)}
  ${[[-24,-90],[24,-92],[-50,-80],[50,-78]].map(([x,y])=>spark(x,y,3,o.night?'#fff6d0':c('#ffffff'),.9)).join('')}`}});
/* ---------------------------------------------------------------- on the water (y=0 is the water line) */
const ripples=(c,xs,w=1)=>xs.map(([x,r],i)=>`<path d="M${f(x-r)} ${f(2+i%2*2.4)}q${f(r/2)} -2 ${f(r)} 0t${f(r)} 0" fill="none" stroke="${c('#ffffff')}" stroke-width="${w}" stroke-linecap="round" opacity=".6"/>`).join('');

JIGART.subject({id:'swan',name:'Graceful Swan',biomes:['lake','garden'],place:'water',w:1.1,draw:o=>{const k=K(o),{c,u}=k,bk=c('#1e1a22');
  const neck='M-21 -20C-34 -36 -32 -50 -24 -60C-17 -69 -16 -78 -22 -83';
  return `<defs>${k.L('b','#ffffff','#dde4ee')}${k.L('w','#ffffff','#e6ebf3')}${k.L('bk','#ff9a3a','#ee6a1a')}</defs>
  <ellipse cx="0" cy="3" rx="46" ry="5" fill="${c('#ffffff')}" opacity=".22"/>
  <path d="M-34 1C-38 -10 -28 -22 -12 -24C4 -26 22 -30 36 -42C38 -30 36 -14 28 -4C20 3 -22 5 -34 1Z" fill="${u('b')}"/>
  <path d="${neck}" fill="none" stroke="${c('#d8e0ea')}" stroke-width="11" stroke-linecap="round"/><path d="${neck}" fill="none" stroke="${c('#ffffff')}" stroke-width="9" stroke-linecap="round"/>
  <path d="M-26 -36C-29 -46 -27 -54 -22 -60" fill="none" stroke="${c('#e6ebf3')}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M-16 -20C-6 -36 16 -46 36 -54C34 -42 26 -28 10 -18C0 -14 -12 -14 -16 -20Z" fill="${u('w')}"/>
  ${[[30,-46],[24,-38],[16,-30],[6,-23],[20,-50],[10,-42],[0,-33],[-8,-25]].map(([x,y])=>`<path d="M${x} ${y}q-3 5 -8 4" fill="none" stroke="${c('#c8d2e0')}" stroke-width="1.1" stroke-linecap="round"/>`).join('')}
  <path d="M36 -54C38 -50 38 -46 36 -42L32 -46Z" fill="${c('#eef2f8')}"/>
  <circle cx="-24" cy="-83" r="7.4" fill="${c('#ffffff')}"/>
  <path d="M-29 -86C-31 -88 -34 -88 -35 -85L-31 -81Z" fill="${bk}"/><path d="M-30.4 -85.6C-36 -85 -41 -82 -43 -78C-38 -77 -33 -78 -29.6 -80.4Z" fill="${u('bk')}"/><path d="M-43 -78L-40 -79L-41 -77.4Z" fill="${bk}"/>
  ${k.eye(-25.4,-85,1.8)}${k.bl(-22,-80.6,2.4)}
  ${ripples(c,[[-30,8],[6,10],[34,6]])}
  <g transform="translate(48 0)"><ellipse cx="0" cy="-4.4" rx="9" ry="5.6" fill="${c('#c4c8d4')}"/><path d="M6 -6C9 -9 10 -11 9 -13" stroke="${c('#c4c8d4')}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M-6 -6C-9 -10 -8 -14 -6 -16" stroke="${c('#c4c8d4')}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-17" r="4" fill="${c('#ced2dc')}"/><path d="M-9.6 -17.4L-13 -15.6L-9.4 -15.2Z" fill="${c('#5a5460')}"/>
  ${k.eye(-6.8,-17.8,1.1)}${k.ln('M-2 -5q3 -2 6 0','#aab0be',.9)}</g>${ripples(c,[[48,6]],.8)}`}});

JIGART.subject({id:'ducks',name:'Mother Duck and Ducklings',biomes:['lake','farm','garden'],place:'water',w:1.65,draw:o=>{const k=K(o),{c,u}=k,mk=c('#7a5232');
  const chick=(x,y,s,fl)=>`<g transform="translate(${x} ${y}) scale(${fl?-s:s} ${s})"><path d="M-8 0C-10 -6 -6 -11 0 -10C5 -10 8 -12 10 -15C11 -9 10 -2 6 1C2 2 -6 2 -8 0Z" fill="url(#${o.id}dk)"/>
    <path d="M-3 -6C1 -9 5 -8 7 -6C4 -3 0 -3 -3 -6Z" fill="${c('#f4c42a')}"/><circle cx="-6" cy="-15" r="5.4" fill="url(#${o.id}dk)"/><path d="M-6 -20.4l-1 -2.2M-5 -20.4l.6 -2.4" stroke="${c('#f4c42a')}" stroke-width=".9" stroke-linecap="round"/>
    <path d="M-10.6 -15.6C-13 -15.6 -14.6 -14.4 -14 -13C-12.6 -12.4 -11 -12.8 -10 -13.6Z" fill="${c('#ff9a2a')}"/>${k.eye(-7.4,-16.4,1.15)}${k.bl(-6,-12.6,1.5)}</g>`;
  return `<defs>${k.L('b','#c8956a','#9a6a44')}${k.Rg('h','#b8885e','#7a5232',.4,.35,.8)}${k.L('wg','#a87a50','#6e4a2c')}${k.Rg('dk','#fff3a0','#ffd23a',.4,.35,.8)}${k.L('bk','#ffaa4a','#e8781e')}</defs>
  <ellipse cx="-10" cy="3" rx="56" ry="5" fill="${c('#ffffff')}" opacity=".2"/>
  <path d="M-56 -3C-60 -15 -50 -28 -34 -30C-18 -32 0 -32 12 -46C16 -34 14 -16 6 -4C-2 3 -46 5 -56 -3Z" fill="${u('b')}"/>
  ${[[-46,-14],[-38,-8],[-28,-14],[-18,-8],[-8,-12],[2,-8],[-40,-20],[-50,-8]].map(([x,y])=>`<path d="M${x} ${y}l2 2l2 -2" fill="none" stroke="${mk}" stroke-width="1" stroke-linecap="round" opacity=".75"/>`).join('')}
  <path d="M-55 -27C-57 -40 -55 -48 -53 -54L-38 -54C-38 -46 -36 -36 -32 -27Z" fill="${u('b')}"/>
  <circle cx="-46" cy="-60" r="12.5" fill="${u('h')}"/><path d="M-56 -66C-52 -73 -42 -74 -36 -68C-42 -70 -50 -70 -56 -66Z" fill="${c('#5a3a22')}"/>
  <path d="M-56 -66Q-46 -70 -37 -64" fill="none" stroke="${c('#e8cfa8')}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="-47" cy="-55" rx="6" ry="3.6" fill="${c('#d8b088')}" opacity=".8"/>${k.ln('M-45 -62.4Q-41 -62.6 -36.4 -60.4M-56 -61.8l2.6 -.3','#4a2e1a',1.2)}
  <path d="M-57 -62C-63 -62 -70 -59 -69 -55C-65 -53.6 -60 -54.6 -56 -56.6Z" fill="${u('bk')}"/><ellipse cx="-63" cy="-58" rx="1.6" ry=".9" fill="${c('#4a2e1a')}"/>${k.ln('M-68 -55.6Q-63 -55.4 -57 -57.4','#c85a10',.8)}
  ${k.eye(-49,-62.6,2.4)}${k.bl(-50,-55.6,2.8)}
  <path d="M-36 -28C-22 -36 -4 -38 6 -34C2 -20 -14 -14 -32 -16C-38 -18 -40 -24 -36 -28Z" fill="${u('wg')}"/>
  <path d="M-22 -21L-2 -26L1 -21L-19 -16Z" fill="${c('#3a6ae0')}"/><path d="M-22 -21L-2 -26M-19 -16L1 -21" stroke="${c('#ffffff')}" stroke-width="1"/>
  ${k.ln('M-30 -26q4 -2 8 -1M-26 -31q5 -2 10 -1M-12 -33q4 -1 8 0','#c8a07a',1)}
  ${chick(-16,-31,.9,0)}
  ${chick(28,0,1,0)}${chick(48,0,.92,0)}
  ${ripples(c,[[-40,10],[-6,10],[28,7],[48,6]])}`}});

JIGART.subject({id:'whale',name:'Humpback Whale',biomes:['coast','island'],place:'water',w:1.15,draw:o=>{const k=K(o),{c,u}=k,sp=c('#e2f6ff');
  const arc='M-14 -44C-18 -62 -28 -74 -42 -80C-34 -72 -28 -62 -22 -46Z';
  return `<defs>${k.L('b','#5a8ae6','#2a4aa8')}${k.L('bl','#e6eeff','#bccbf0')}${k.L('s','#ffffff','#bfe8ff')}</defs>
  <ellipse cx="0" cy="2" rx="62" ry="5" fill="${c('#ffffff')}" opacity=".25"/>
  <path d="M38 1C40 -10 44 -20 46 -28L52 -27C51 -18 50 -8 51 1Z" fill="${u('b')}"/>
  <path d="M49 -27C40 -30 32 -38 30 -48C38 -47 45 -43 49 -36C53 -43 59 -47 65 -48C63 -38 57 -30 49 -27Z" fill="${u('b')}"/>
  <path d="M31 -46C38 -45 44 -41 48 -35M64 -46C60 -44 54 -40 50 -35" fill="none" stroke="${c('#8ab0f2')}" stroke-width="1" opacity=".8"/>
  <path d="M-56 1C-56 -24 -36 -44 -10 -44C12 -44 26 -32 32 -16C34 -8 36 -3 38 1Z" fill="${u('b')}"/>
  <path d="M-55 1C-54 -6 -48 -11 -38 -11C-30 -11 -24 -6 -20 1Z" fill="${u('bl')}"/>${k.ln('M-48 -8L-46 1M-42 -10L-40 1M-36 -10.6L-34 1M-30 -9.6L-28.6 1','#9aaee0',.9)}
  <path d="M-54 -14Q-42 -8 -26 -14" fill="none" stroke="${c('#1a3478')}" stroke-width="1.4" stroke-linecap="round"/>
  ${k.eye(-27,-20,2.6)}${k.bl(-22,-14,3.4)}
  ${[[-44,-30,2],[-38,-36,1.6],[-30,-40,2],[-48,-22,1.4],[-20,-38,1.4],[6,-38,1.2],[14,-34,1.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#8ab0f2')}" opacity=".75"/>`).join('')}
  <path d="M2 -14C10 -8 20 -6 26 -10C22 -2 10 0 2 -4Z" fill="${c('#3a5ec0')}"/>
  <ellipse cx="-12" cy="-43.6" rx="3.6" ry="1.4" fill="${c('#1a3478')}"/>
  <path d="${arc}" fill="${u('s')}"/>${k.mir(-12,`<path d="${arc}" fill="${u('s')}"/>`)}
  <path d="M-15 -44C-18 -64 -16 -84 -12 -96C-8 -84 -6 -64 -9 -44Z" fill="${u('s')}"/>
  ${[[-44,-82,3.4],[-38,-90,2.4],[20,-82,3.4],[14,-90,2.4],[-12,-100,3.8],[-20,-104,2.2],[-4,-104,2.4],[-50,-74,2],[26,-74,2],[-28,-96,1.8],[4,-96,1.8]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${sp}"/>`).join('')}
  ${k.ln('M-12 -50V-84M-30 -62Q-34 -70 -40 -76M6 -62Q10 -70 16 -76','#ffffff',1.2,.8)}
  ${[[-58,-4,5],[-50,-2,4],[36,-3,4],[56,-2,4]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#ffffff')}" opacity=".85"/>`).join('')}
  ${ripples(c,[[-44,10],[-4,12],[32,8],[58,5]])}`}});

JIGART.subject({id:'flamingo',name:'Flamingos',biomes:['lake','island','coast'],place:'water',w:.95,draw:o=>{const k=K(o),{c,u}=k,lg=c('#f07898'),bk=c('#1e1a22');
  const body='M-28 -58C-30 -68 -16 -74 -2 -72C10 -70 16 -64 14 -56C12 -50 0 -46 -12 -48C-20 -50 -26 -52 -28 -58Z';
  return `<defs>${k.L('b','#ffb4c8','#ff7aa0')}${k.L('w','#ff8cac','#f05a88')}${k.L('bk','#fff2ea','#f0d8d0')}</defs>
  <ellipse cx="0" cy="2" rx="50" ry="4.6" fill="${c('#ffffff')}" opacity=".2"/>
  <g transform="translate(34 6) scale(.78)"><path d="M-6 -50L-8 0M2 -50L4 0" stroke="${lg}" stroke-width="2.4" stroke-linecap="round"/><circle cx="-7.2" cy="-25" r="1.8" fill="${lg}"/><circle cx="3.2" cy="-25" r="1.8" fill="${lg}"/>
  <path d="${body}" fill="${u('b')}" transform="translate(0 2)"/><path d="M-28 -56C-20 -66 -6 -66 6 -60C0 -52 -16 -50 -28 -56Z" fill="${u('w')}"/><path d="M-30 -58L-36 -54L-28 -52Z" fill="${bk}"/>
  <path d="M10 -64C22 -64 24 -48 22 -34C21 -24 22 -16 24 -10" fill="none" stroke="${c('#ff9ab4')}" stroke-width="5" stroke-linecap="round"/>
  <circle cx="24" cy="-9" r="5" fill="${c('#ff9ab4')}"/><path d="M22 -5C22 0 25 4 28 4C30 0 29 -4 27 -6Z" fill="${u('bk')}"/><path d="M26 2C27 4 29 5 30 3L28.6 1Z" fill="${bk}"/>${k.eye(25.6,-10.4,1.3)}</g>
  <path d="M-11 -48L-10 -24L-11 1" stroke="${lg}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-10" cy="-25" r="2.2" fill="${lg}"/>
  <path d="M-5 -48L-1 -34L-14 -38" stroke="${lg}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-1" cy="-34" r="2" fill="${lg}"/>
  <path d="${body}" fill="${u('b')}"/>
  <path d="M-28 -57C-20 -68 -4 -70 8 -62C2 -52 -14 -50 -28 -57Z" fill="${u('w')}"/>
  ${[[-22,-58],[-14,-60],[-6,-60],[-18,-54],[-10,-54],[2,-58]].map(([x,y])=>`<path d="M${x} ${y}q3 3 6 1" fill="none" stroke="${c('#e04a7a')}" stroke-width="1" stroke-linecap="round" opacity=".8"/>`).join('')}
  <path d="M-29 -60L-37 -58L-34 -54L-29 -55Z" fill="${bk}"/><path d="M-30 -56L-36 -52L-28 -53Z" fill="${c('#e04a7a')}"/>
  <path d="M10 -66C18 -76 16 -86 6 -90C-2 -94 -2 -102 6 -104" fill="none" stroke="${c('#ff9ab4')}" stroke-width="5.4" stroke-linecap="round"/>
  <path d="M12 -70C16 -76 15 -82 9 -86" fill="none" stroke="${c('#ffc4d4')}" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="8" cy="-102" r="5.8" fill="${c('#ffa4bc')}"/>
  <path d="M12 -105C17 -106 21 -103 21 -98L19 -93C18 -96 16 -99 12 -99Z" fill="${u('bk')}"/><path d="M21 -98L19 -93C18 -95 18.4 -97 19.6 -98.6Z" fill="${bk}"/>
  ${k.eye(9,-103.6,1.6)}${k.bl(7,-99,2)}
  ${ripples(c,[[-11,6],[30,6]])}`}});

/* ---------------------------------------------------------------- in the sky (y=0 is the lowest point) */
JIGART.subject({id:'dragon',name:'Friendly Dragon',biomes:['mountains','volcano','canyon','forest','snow'],place:'sky',w:1.35,draw:o=>{const k=K(o),{c,u}=k,n=o.night,hn=c('#fff0c8');
  const spikes=[[30,-66,-60],[20,-67,-80],[9,-66,-95],[-3,-63,-115],[-14,-57,-130],[-23,-50,-138],[-31,-41,-142],[-38,-32,-148]];
  return `<defs>${k.L('b','#6ad47a','#2e9a52')}${k.Rg('h','#7ce08a','#34a058',.45,.3,.8)}${k.L('bl','#fff2c0','#ffd884')}${k.L('w1','#a0f0b8','#4ab874',0,1)}${k.L('w2','#6ac48a','#2e8a52')}${lin(o.id+'fi',[[0,'#fff6c0'],[.45,'#ffd23a'],[1,'#ff6a2a',.9]],1,0)}${glowDef(o.id+'g','#ffb84a',n?.8:.45)}</defs>
  <g transform="translate(-3 0) scale(.92)">
  <path d="M-2 -62C-4 -76 -10 -90 -22 -100C-28 -94 -38 -90 -46 -88C-42 -82 -42 -76 -48 -72C-40 -68 -36 -62 -34 -56C-24 -58 -12 -62 -2 -62Z" fill="${u('w2')}"/>
  ${k.ln('M-2 -62L-22 -100M-6 -62L-46 -88M-12 -60L-48 -72','#1e6a3a',1.4,.8)}
  <path d="M26 -62C14 -68 -4 -66 -16 -56C-28 -46 -36 -36 -44 -22C-48 -15 -52 -11 -58 -8C-50 -10 -44 -16 -38 -24C-30 -34 -22 -38 -10 -36C4 -33 18 -36 28 -46Z" fill="${u('b')}"/>
  <path d="M-54 -9C-58 -13 -65 -11 -65 -5C-63 0 -58 0 -56 -1C-56 -4 -55 -6 -54 -9Z" fill="${c('#ff9a3a')}"/>
  ${spikes.map(([x,y,a])=>`<path d="M-3 0L0 -5.6L3 0Z" fill="${c('#ff9a3a')}" transform="translate(${x} ${y}) rotate(${a+90})"/>`).join('')}
  <path d="M27 -47C18 -38 4 -35 -10 -37C-22 -39 -30 -33 -38 -24C-30 -30 -20 -32 -10 -31C4 -29 18 -33 27 -42Z" fill="${u('bl')}"/>
  ${k.ln('M18 -43l-1 5M10 -40l-.6 5M2 -38v5M-6 -37v5M-14 -37l.6 4.4M-22 -35l1 4','#e8b860',.9)}
  <path d="M-14 -40C-16 -32 -12 -28 -6 -28M-6 -28l2 2M-6 -28l3 -.4" stroke="${c('#34a058')}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M20 -42C20 -36 24 -34 28 -34" stroke="${c('#34a058')}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  ${k.ln('M28 -34l2 1.4M28 -34l2 -.6M-4 -28l2 1.4','#fff0c8',1)}
  <path d="M18 -62C26 -66 32 -72 36 -76L44 -64C38 -58 32 -50 24 -46Z" fill="${u('b')}"/>
  <path d="M8 -60C10 -74 12 -90 6 -106C-2 -100 -12 -96 -22 -94C-18 -88 -18 -82 -24 -78C-18 -74 -14 -68 -16 -60C-8 -62 0 -60 8 -60Z" fill="${u('w1')}"/>
  ${k.ln('M8 -60L6 -106M6 -61L-22 -94M2 -61L-24 -78','#2e8a52',1.6)}${k.ln('M8 -60C10 -74 12 -90 6 -106','#2e8a52',2.4)}
  <path d="M40 -84C36 -90 32 -94 28 -98C34 -97 39 -94 43 -89ZM45 -87C44 -93 42 -98 40 -102C45 -99 48 -95 49 -90Z" fill="${hn}"/>
  <path d="M35 -80C30 -84 28 -88 29 -91C33 -89 36 -86 38 -83Z" fill="${c('#ff9a3a')}"/>
  <path d="M34 -78C34 -88 46 -92 52 -86C54 -84 56 -80 60 -78C64 -76 64 -68 60 -66C54 -64 44 -64 38 -68C35 -70 34 -74 34 -78Z" fill="${u('h')}"/>
  <ellipse cx="57" cy="-70" rx="6" ry="4" fill="${c('#a8f0b4')}" opacity=".7"/><ellipse cx="59" cy="-74" rx="1.2" ry=".8" fill="${c('#1e5a32')}"/><ellipse cx="62.2" cy="-73.4" rx="1" ry=".7" fill="${c('#1e5a32')}"/>
  ${k.ln('M50 -68Q55 -66 60 -68','#1e5a32',1)}<path d="M53 -67.4L54 -65.6L55 -67.2Z" fill="#fff"/>
  <ellipse cx="46" cy="-79.6" rx="4" ry="4.6" fill="${c('#ffffff')}"/><circle cx="47" cy="-79" r="3" fill="${c('#1a1410')}"/><circle cx="48.2" cy="-80.6" r="1.3" fill="#fff"/><circle cx="46" cy="-77.6" r=".6" fill="#fff"/>
  ${k.ln('M42 -84.6Q46 -87 50 -85','#1e5a32',1.2)}${k.bl(48,-71.4,3)}
  ${glow(o.id+'g',68,-71,n?13:9)}<path d="M63 -72C66 -76 69 -77 72 -74C70 -73 70 -71 71.4 -69.6C69 -70 68 -68 70 -66.4C67 -66 64 -68 63 -72Z" fill="url(#${o.id}fi)"/></g>`}});

JIGART.subject({id:'parrot',name:'Scarlet Macaw',biomes:['jungle','island'],place:'sky',w:.85,draw:o=>{const k=K(o),{c,u}=k;
  const wing='M0 0C-8 -10 -16 -26 -20 -44L-14 -43L-12 -50L-6 -46L-2 -52L3 -45L6 -49L9 -38C10 -24 9 -12 6 0Z';
  const band=(tx,ty,a)=>[[1,'#2a6ae0'],[.8,'#2ab868'],[.6,'#ffd23a'],[.42,'#ff3a3a']].map(([s,cl])=>`<path d="${wing}" fill="${c(cl)}" transform="translate(${tx} ${ty}) rotate(${a}) scale(${s})"/>`).join('')+`<path d="M-14 -43L-10 -30M-6 -46L-5 -32M3 -45L1 -32" stroke="${c('#1a4aa8')}" stroke-width=".8" fill="none" transform="translate(${tx} ${ty}) rotate(${a})"/>`;
  return `<defs>${k.L('b','#ff4a40','#d41e2a')}${k.Rg('h','#ff5a4a','#d81e2a',.4,.35,.8)}${k.L('t1','#ff3a3a','#2a6ae0')}${k.L('t2','#ff6a3a','#2ab8d8')}</defs>
  ${band(6,-60,-52)}
  <path d="M-4 -44C-14 -32 -30 -16 -46 -2C-38 -4 -20 -18 -2 -38Z" fill="${u('t2')}"/>
  <path d="M-2 -42C-10 -28 -22 -12 -36 1C-28 0 -14 -14 2 -36Z" fill="${u('t1')}"/>${k.ln('M-4 -40L-34 -1M-4 -42L-44 -3','#a81e2a',.8,.7)}
  <ellipse cx="10" cy="-54" rx="19" ry="10.5" fill="${u('b')}" transform="rotate(-32 10 -54)"/>
  ${k.ln('M4 -50q3 2 6 0M10 -54q3 2 6 0M-2 -46q3 2 6 0','#b81e2a',.9)}
  <path d="M4 -44C6 -40 10 -40 12 -42M8 -46C10 -42 14 -42 15 -44" stroke="${c('#5a5a68')}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="28" cy="-69" r="10" fill="${u('h')}"/>
  <path d="M27 -74C31 -76 35 -74 36 -70C36 -66 33 -64 30 -65C27 -66 25 -70 27 -74Z" fill="${c('#fff4f0')}"/>${k.ln('M29 -68.6h4M29.4 -66.6h3.4','#e8b8b8',.6)}
  <path d="M35 -72C40 -74 45 -71 45 -66C45 -62 43 -59 41 -58C41 -61 40 -63 37 -63C35 -65 34 -69 35 -72Z" fill="${c('#f6efe0')}"/><path d="M37 -63C40 -63 41 -61 41 -58C39 -58 37 -59 36 -61Z" fill="${c('#22222c')}"/>
  ${k.eye(31.4,-71,1.9)}${k.bl(30,-64,1.8)}
  ${band(14,-58,-12)}`}});
/* ---------------------------------------------------------------- under the sea (y=0 is the lowest point) */
/* a tapering, curling tube (tentacle, tail): starts at x,y heading a0 degrees, turns cu degrees in all, tighter toward the tip */
const tube=(x,y,a0,cu,len,w0,w1,N=26)=>{let a=a0*Math.PI/180,px=x,py=y;const pts=[],L=[],Rr=[],ds=len/N;
  for(let i=0;i<=N;i++){const t=i/N,w=w0+(w1-w0)*t,nx=-Math.sin(a),ny=Math.cos(a);pts.push([px,py,nx,ny,w]);L.push([px+nx*w,py+ny*w]);Rr.push([px-nx*w,py-ny*w]);
    px+=Math.cos(a)*ds;py+=Math.sin(a)*ds;a+=cu*Math.PI/180*2*t/N}
  return{d:P([...L,...Rr.reverse()]),pts,tip:pts[N]}};
const bubbles=(c,xs)=>xs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#e8faff')}" fill-opacity=".25" stroke="${c('#ffffff')}" stroke-width=".7" stroke-opacity=".8"/><circle cx="${f(x-r*.35)}" cy="${f(y-r*.35)}" r="${f(r*.25)}" fill="#fff" opacity=".8"/>`).join('');

JIGART.subject({id:'turtle',name:'Sea Turtle',biomes:['underwater'],place:'under',w:1,draw:o=>{const k=K(o),{c,u}=k,ln=c('#3e5a2a');
  const hex=(x,y,r)=>P(Array.from({length:6},(_,i)=>[x+Math.cos(i*Math.PI/3)*r,y+Math.sin(i*Math.PI/3)*r*.85]));
  const fl=(d,s)=>`<path d="${d}" fill="url(#${o.id}fl)"/>${s.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#f2e2b0')}" opacity=".7"/>`).join('')}`;
  return `<defs>${k.Rg('sh','#c8b45a','#6a7a32',.42,.38,.7)}${k.L('fl','#a8c87a','#6a9a4a')}${k.Rg('h','#b8d48a','#78a456',.4,.35,.8)}${k.L('sc','#e2c46a','#b48a3a')}</defs>
  ${bubbles(c,[[34,-92,3],[40,-100,2.2],[30,-104,1.6]])}
  <g transform="translate(-2 -52) scale(.88) rotate(-20)">
  ${fl('M14 -16C10 -30 2 -42 -6 -48C-2 -40 0 -30 -2 -18Z',[[4,-30,1.6],[0,-38,1.2],[6,-22,1.4]])}${fl('M14 16C10 30 2 42 -6 48C-2 40 0 30 -2 18Z',[[4,30,1.6],[0,38,1.2],[6,22,1.4]])}
  ${fl('M-24 -14C-30 -20 -38 -22 -42 -18C-38 -14 -32 -10 -26 -8Z',[])}${fl('M-24 14C-30 20 -38 22 -42 18C-38 14 -32 10 -26 8Z',[])}
  <path d="M-30 -3L-40 0L-30 3Z" fill="${c('#8ab45e')}"/>
  <path d="M30 -6C36 -11 46 -10 49 -3C51 3 46 9 38 8C34 8 31 5 30 2Z" fill="${u('h')}"/>
  ${[[38,-5,1.4],[42,-7,1.2],[36,0,1.3]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#e6f0c0')}" opacity=".7"/>`).join('')}
  <g transform="rotate(20 43 -3)">${k.eye(43,-3,2.4)}</g>${k.bl(43,3,2.4)}${k.ln('M45 5Q48 5 49.6 2.6','#3e5a2a',.9)}
  <ellipse cx="0" cy="0" rx="33" ry="26" fill="${c('#e2cf8a')}"/><ellipse cx="-1" cy="-1" rx="31" ry="24" fill="${u('sh')}"/>
  <g fill="${u('sc')}" stroke="${ln}" stroke-width="1.2" stroke-linejoin="round">${[[-14,0,8.5],[0,0,9],[14,0,8]].map(([x,y,r])=>`<path d="${hex(x,y,r)}"/>`).join('')}${[[-12,-14,7],[2,-15.4,7.4],[16,-13,6],[-12,14,7],[2,15.4,7.4],[16,13,6]].map(([x,y,r])=>`<path d="${hex(x,y,r)}"/>`).join('')}</g>
  ${[[-14,0],[0,0],[14,0]].map(([x,y])=>`<path d="${hex(x,y,3.6)}" fill="${c('#f6e0a0')}" opacity=".7"/>`).join('')}
  ${Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;return `<path d="M${f(Math.cos(a)*27)} ${f(Math.sin(a)*21)}L${f(Math.cos(a)*32)} ${f(Math.sin(a)*25)}" stroke="${ln}" stroke-width="1"/>`}).join('')}
  <ellipse cx="-8" cy="-12" rx="12" ry="4" fill="#fff" opacity=".18" transform="rotate(-12 -8 -12)"/></g>`}});

JIGART.subject({id:'octopus',name:'Happy Octopus',biomes:['underwater'],place:'under',w:1.2,draw:o=>{const k=K(o),{c,u}=k;
  const arms=[[-18,-56,155,170,44,6,1],[18,-56,25,-170,44,6,1],[-22,-50,118,200,56,7.4,0],[-12,-48,100,150,58,7.4,0],[-4,-47,92,-230,50,7.4,0],[4,-47,88,230,50,7.4,0],[12,-48,80,-150,58,7.4,0],[22,-50,62,-200,56,7.4,0]];
  const arm=([x,y,a,cu,l,w,back])=>{const t=tube(x,y,a,cu,l,w,1.2,18),s=cu>0?1:-1;let sk='';for(let i=3;i<17;i+=2){const [px,py,nx,ny,ww]=t.pts[i];sk+=circ(px+s*nx*ww*.5,py+s*ny*ww*.5,ww*.34)}sk=`<path d="${sk}" fill="${c('#ffd6e6')}"/>`;
    return `<path d="${t.d}" fill="${back?c('#c8407a'):`url(#${o.id}a)`}" stroke="${c('#b8306a')}" stroke-width=".6"/><circle cx="${f(t.tip[0])}" cy="${f(t.tip[1])}" r="1.2" fill="${back?c('#c8407a'):c('#e0508a')}"/>${back?'':sk}`};
  return `<defs>${k.Rg('h','#ffa0c8','#d8407e',.4,.3,.85)}${k.L('a','#f472a8','#d8407e')}</defs><g transform="translate(0 10)">
  ${arms.filter(a=>a[6]).map(arm).join('')}
  <path d="M-26 -60C-30 -84 -16 -100 0 -100C16 -100 30 -84 26 -60C24 -50 14 -46 0 -46C-14 -46 -24 -50 -26 -60Z" fill="${u('h')}"/>
  ${arms.filter(a=>!a[6]).map(arm).join('')}
  ${[[-14,-88,3],[10,-92,2.4],[16,-80,2],[-18,-76,1.8],[2,-95,1.6],[20,-68,1.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#ffc4dc')}" opacity=".8"/>`).join('')}
  <ellipse cx="-8" cy="-90" rx="7" ry="4" fill="#fff" opacity=".25" transform="rotate(-25 -8 -90)"/>
  ${[-9,9].map(x=>`<ellipse cx="${x}" cy="-66" rx="6" ry="7" fill="${c('#ffffff')}"/><ellipse cx="${x+.6}" cy="-65" rx="3.8" ry="4.6" fill="${c('#2a1030')}"/><circle cx="${x+2}" cy="-67" r="1.7" fill="#fff"/><circle cx="${x-.8}" cy="-63" r=".7" fill="#fff"/>`).join('')}
  ${k.bl(-16,-58,3.4)}${k.bl(16,-58,3.4)}<path d="M-4 -55Q0 -51 4 -55" fill="none" stroke="${c('#7a1a4a')}" stroke-width="1.2" stroke-linecap="round"/>
  ${bubbles(c,[[32,-92,3],[37,-100,2],[28,-104,1.5]])}</g>`}});

JIGART.subject({id:'jellyfish',name:'Glowing Jellyfish',biomes:['underwater'],place:'under',w:.85,draw:o=>{const k=K(o),{c}=k,n=o.night,R=o.R;
  const jelly=(x,y,r,col,id,face)=>{const h=r*1.15,lo=y+h*.15;let ten='';
    for(let i=0;i<5;i++){const tx=x-r*.75+i*r*.375,l=r*2.6+R()*r;ten+=`<path d="M${f(tx)} ${f(lo)}q${f(r*.18)} ${f(l/8)} 0 ${f(l/4)}t0 ${f(l/4)}t0 ${f(l/4)}t0 ${f(l/4)}" fill="none" stroke="${col}" stroke-width=".9" opacity=".75"/>`}
    const arm=(dx,s)=>`<path d="M${f(x+dx)} ${f(lo)}q${f(r*.3*s)} ${f(r*.5)} 0 ${f(r)}t0 ${f(r)}t0 ${f(r*.9)}" fill="none" stroke="${lighten(col,.35)}" stroke-width="${f(r*.16)}" stroke-linecap="round" opacity=".85"/>`;
    let sc='';for(let i=0;i<7;i++){const sx=x-r+i*r*2/7;sc+=`q${f(r/7)} ${f(r*.22)} ${f(r*2/7)} 0`}
    return `${glow(id,x,y,r*(n?2.6:1.8))}${ten}${arm(-r*.25,1)}${arm(r*.2,-1)}
    <path d="M${f(x-r)} ${f(lo)}C${f(x-r)} ${f(y-h*1.05)} ${f(x+r)} ${f(y-h*1.05)} ${f(x+r)} ${f(lo)}" fill="url(#${o.id}${id.slice(-1)}b)" />
    <path d="M${f(x-r)} ${f(lo)}${sc}" fill="${col}" opacity=".6"/>
    <path d="M${f(x-r*.6)} ${f(lo-r*.1)}C${f(x-r*.6)} ${f(y-h*.55)} ${f(x+r*.6)} ${f(y-h*.55)} ${f(x+r*.6)} ${f(lo-r*.1)}" fill="none" stroke="#fff" stroke-width=".8" opacity=".45"/>
    ${[-.35,0,.35].map(t=>`<path d="M${f(x+t*r*.5)} ${f(y-h*.68)}Q${f(x+t*r*1.3)} ${f(y-h*.2)} ${f(x+t*r*1.9)} ${f(lo)}" fill="none" stroke="#fff" stroke-width=".6" opacity=".35"/>`).join('')}
    <ellipse cx="${f(x-r*.4)}" cy="${f(y-h*.55)}" rx="${f(r*.22)}" ry="${f(r*.12)}" fill="#fff" opacity=".7" transform="rotate(-30 ${f(x-r*.4)} ${f(y-h*.55)})"/>
    ${face?`${[-1,1].map(s=>`<ellipse cx="${f(x+s*r*.3)}" cy="${f(y-h*.12)}" rx="${f(r*.09)}" ry="${f(r*.12)}" fill="#3a1a4a"/><circle cx="${f(x+s*r*.3+r*.03)}" cy="${f(y-h*.16)}" r="${f(r*.04)}" fill="#fff"/>`).join('')}<path d="M${f(x-r*.1)} ${f(y+h*.02)}q${f(r*.1)} ${f(r*.08)} ${f(r*.2)} 0" fill="none" stroke="#3a1a4a" stroke-width=".8" stroke-linecap="round"/>${[-1,1].map(s=>`<ellipse cx="${f(x+s*r*.5)}" cy="${f(y)}" rx="${f(r*.1)}" ry="${f(r*.06)}" fill="#ff6a9a" opacity=".6"/>`).join('')}`:''}`};
  const A=n?1:.75,cols=[['#ff8ad8','p'],['#a88aff','v'],['#6ae4ff','c']];
  return `<defs>${cols.map(([cl,s])=>glowDef(o.id+'g'+s,cl,n?.55:.3)+rad(o.id+s+'b',[[0,lighten(cl,.7),A],[.6,cl,A*.85],[1,darken(cl,.15),A*.7]],.45,.3,.75)).join('')}</defs>
  ${jelly(26,-70,14,'#a88aff',o.id+'gv',0)}${jelly(-36,-40,11,'#6ae4ff',o.id+'gc',0)}${jelly(-8,-84,20,'#ff8ad8',o.id+'gp',1)}
  ${bubbles(c,[[30,-100,2],[-40,-70,1.6],[14,-46,1.4]])}`}});

JIGART.subject({id:'clownfish',name:'Clownfish and Anemone',biomes:['underwater'],place:'under',w:1.15,draw:o=>{const k=K(o),{c,u}=k,R=o.R,bk=c('#1a1418');
  const body='M-20 0C-18 -12 -4 -15 8 -13C16 -11 22 -6 22 0C22 6 16 10 8 12C-4 14 -18 12 -20 0Z';
  const fish=(x,y,s,fl,cid)=>`<g transform="translate(${x} ${y}) scale(${fl?-s:s} ${s})">
    <path d="M-18 0L-29 -10C-32 -4 -32 4 -29 10Z" fill="${u('o')}" stroke="${bk}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-10 -12C-6 -21 4 -21 9 -12Z" fill="${u('o')}" stroke="${bk}" stroke-width="1.2"/><path d="M-6 11C-3 18 3 17 5 11Z" fill="${u('o')}" stroke="${bk}" stroke-width="1.2"/>
    <path d="${body}" fill="${u('o')}"/><clipPath id="${o.id}${cid}"><path d="${body}"/></clipPath>
    <g clip-path="url(#${o.id}${cid})" fill="none"><path d="M9 -16Q13 0 9 16M-5 -16Q-1 0 -5 16M-17 -16Q-15 0 -17 16" stroke="${bk}" stroke-width="6.4"/><path d="M9 -16Q13 0 9 16M-5 -16Q-1 0 -5 16M-17 -16Q-15 0 -17 16" stroke="${c('#ffffff')}" stroke-width="4.2"/></g>
    <path d="${body}" fill="none" stroke="${c('#c84a10')}" stroke-width=".8"/><ellipse cx="2" cy="4" rx="5" ry="2.6" fill="${c('#ff8a3a')}" stroke="${bk}" stroke-width=".8" transform="rotate(25 2 4)"/>
    <circle cx="15" cy="-3" r="3.6" fill="${c('#ffffff')}"/><circle cx="15.6" cy="-2.8" r="2.6" fill="${c('#1a1418')}"/><circle cx="16.4" cy="-3.8" r="1" fill="#fff"/>
    <path d="M17 5Q19.4 6 21 4" fill="none" stroke="${c('#7a2a0a')}" stroke-width=".9" stroke-linecap="round"/>${k.bl(12,3,1.8)}</g>`;
  let ten='';for(let i=0;i<26;i++){const t=i/25,bx=-30+t*60,a=-90+(t-.5)*120+(R()-.5)*20,l=20+R()*16+(1-Math.abs(t-.5)*2)*8,q=a*Math.PI/180,ex=bx+Math.cos(q)*l,ey=-14+Math.sin(q)*l,cx=bx+Math.cos(q)*l*.5+(R()-.5)*10;
    ten+=`<path d="M${f(bx)} -14Q${f(cx)} ${f(-14+Math.sin(q)*l*.5)} ${f(ex)} ${f(ey)}" stroke="${c(i%2?'#ff6aa8':'#f05090')}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${f(ex)}" cy="${f(ey)}" r="2.6" fill="${c('#ffd0e4')}"/>`}
  return `<defs>${k.L('o','#ffa040','#ff6a10')}${k.L('st','#b06ad8','#7a3aa8')}</defs>
  <path d="M-32 0C-34 -8 -32 -14 -30 -16H30C32 -14 34 -8 32 0Z" fill="${u('st')}"/>${k.ln('M-24 -3v-10M-12 -2v-12M0 -2v-12M12 -2v-12M24 -3v-10','#c896f0',1,.6)}
  ${ten}
  ${fish(-24,-46,.7,0,'c1')}${fish(12,-78,1,1,'c2')}
  ${bubbles(c,[[-6,-92,2.4],[-2,-100,1.8],[-8,-106,1.4]])}`}});

JIGART.subject({id:'seahorse',name:'Seahorse',biomes:['underwater'],place:'under',w:.7,draw:o=>{const k=K(o),{c,u}=k;
  const tl=tube(3,-30,100,330,38,7.2,1.2,30);
  const weed='M-22 0C-26 -16 -16 -30 -22 -46C-28 -60 -18 -76 -24 -92';
  return `<defs>${k.L('b','#ffd24a','#f08a2a',1,0)}${k.L('be','#fff0b0','#ffc860')}${k.L('w','#7ad06a','#3a9a4a')}</defs>
  <path d="${weed}" fill="none" stroke="${u('w')}" stroke-width="5" stroke-linecap="round"/>
  ${[[-22,-46,-1],[-24,-70,1],[-20,-24,1],[-23,-90,-1]].map(([x,y,s])=>`<path d="M${x} ${y}C${x+s*8} ${y-6} ${x+s*14} ${y-4} ${x+s*18} ${y-10}C${x+s*12} ${y-2} ${x+s*6} ${y+2} ${x} ${y+2}Z" fill="${c('#5ab85a')}"/>`).join('')}
  <path d="${tl.d}" fill="${u('b')}"/>${tl.pts.filter((_,i)=>i%3===1&&i<27).map(([x,y,nx,ny,w])=>`<path d="M${f(x+nx*w)} ${f(y+ny*w)}L${f(x-nx*w)} ${f(y-ny*w)}" stroke="${c('#d8701a')}" stroke-width=".8"/>`).join('')}
  <path d="M-6 -54C-12 -50 -16 -44 -14 -38C-10 -40 -6 -44 -4 -48Z" fill="${c('#ffe080')}" stroke="${c('#e89a2a')}" stroke-width=".8"/>${k.ln('M-6 -52l-6 6M-5 -50l-7 8M-5 -48l-5 7','#e89a2a',.6)}
  <path d="M2 -98C-6 -98 -10 -92 -10 -84C-10 -76 -8 -70 -6 -62C-4 -50 -6 -40 -4 -30C-2 -26 6 -26 10 -32C16 -40 18 -50 14 -60C10 -66 8 -72 10 -76C14 -78 18 -78 24 -78C28 -78 30 -82 28 -86C24 -88 18 -88 14 -88C12 -94 8 -98 2 -98Z" fill="${u('b')}"/>
  <path d="M8 -70C14 -64 16 -52 12 -42C9 -36 6 -32 2 -30C6 -38 8 -50 6 -60Z" fill="${u('be')}"/>${[-62,-56,-50,-44,-38].map(y=>k.ln(`M${f(6+(y+50)*-.08)} ${y}q3 1 ${f(7-Math.abs(y+52)*.15)} -1`,'#e8a040',.9)).join('')}
  ${[[-10,-84],[-10,-76],[-8,-68],[-7,-60],[-6,-52],[-6,-44],[-5,-36]].map(([x,y])=>`<path d="M${x} ${y}l-3 -1.4l2.4 3Z" fill="${c('#f08a2a')}"/>`).join('')}
  <path d="M-2 -97L-1 -103L2 -98L4 -104L6 -97L8 -101L8 -95Z" fill="${c('#ffb83a')}"/>
  ${[[0,-80,1.4],[-4,-68,1.2],[2,-56,1.1],[-2,-42,1],[-6,-90,1]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#e8701a')}" opacity=".7"/>`).join('')}
  <circle cx="6" cy="-88" r="4.6" fill="${c('#ffffff')}"/><circle cx="7" cy="-88" r="3.2" fill="${c('#2a1408')}"/><circle cx="8.2" cy="-89.4" r="1.3" fill="#fff"/><circle cx="6" cy="-86.6" r=".6" fill="#fff"/>
  ${k.ln('M3 -92.6l-1.4 -1.6M5 -93.4l-.4 -1.8','#7a3a10',.7)}${k.bl(10,-81,2.4)}<ellipse cx="27.4" cy="-82" rx="1" ry="2.6" fill="${c('#c86a1a')}"/>
  ${bubbles(c,[[30,-92,2.4],[33,-99,1.8],[29,-105,1.3]])}`}});

JIGART.subject({id:'manta',name:'Manta Ray',biomes:['underwater'],place:'under',w:1.2,draw:o=>{const k=K(o),{c,u}=k;
  const yfish=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-5 0C-3 -3 3 -3 5 0C3 3 -3 3 -5 0ZM-4 0L-8 -3V3Z" fill="${c('#ffd23a')}"/><path d="M-1 -2.4V2.4" stroke="${c('#2a6ae0')}" stroke-width="1"/><circle cx="2.6" cy="-.4" r=".7" fill="${c('#1a1418')}"/></g>`;
  return `<defs>${k.Rg('b','#4a5e9a','#1e2a52',.5,.3,.8)}${k.L('e','#7a90c8','#3a4a80')}</defs>
  <path d="M0 -30C1 -20 3 -10 6 0" fill="none" stroke="${c('#1e2a52')}" stroke-width="2" stroke-linecap="round"/>
  <path d="M-9 -80C-22 -78 -42 -70 -62 -52C-46 -48 -32 -42 -20 -33C-12 -26 -6 -24 0 -24C6 -24 12 -26 20 -33C32 -42 46 -48 62 -52C42 -70 22 -78 9 -80Z" fill="${u('b')}"/>
  <path d="M-62 -52C-46 -48 -32 -42 -20 -33C-12 -26 -6 -24 0 -24C6 -24 12 -26 20 -33C32 -42 46 -48 62 -52C46 -46 32 -38 20 -28C12 -22 6 -20 0 -20C-6 -20 -12 -22 -20 -28C-32 -38 -46 -46 -62 -52Z" fill="${u('e')}"/>
  <path d="M-12 -70C-22 -66 -30 -60 -34 -54C-26 -56 -18 -58 -12 -62ZM12 -70C22 -66 30 -60 34 -54C26 -56 18 -58 12 -62Z" fill="${c('#e8eef8')}" opacity=".9"/>
  ${[[-24,-48,1.6],[-14,-42,1.2],[18,-46,1.4],[28,-52,1.1],[-36,-56,1.1],[6,-40,1.2],[-4,-50,1],[40,-56,1]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c('#8aa0d8')}" opacity=".7"/>`).join('')}
  ${k.ln('M0 -76V-30M-8 -40Q0 -36 8 -40','#3a4a80',1,.7)}
  <path d="M-9 -79C-14 -84 -16 -90 -12 -94C-10 -90 -7 -86 -4 -82Z" fill="${u('e')}"/><path d="M9 -79C14 -84 16 -90 12 -94C10 -90 7 -86 4 -82Z" fill="${u('e')}"/>
  <path d="M-6 -80Q0 -76 6 -80" fill="none" stroke="${c('#e8eef8')}" stroke-width="1.4" stroke-linecap="round"/>
  ${k.eye(-10,-74,2.2,'#0e1428')}${k.eye(10,-74,2.2,'#0e1428')}<circle cx="-10" cy="-74" r="3.4" fill="none" stroke="${c('#8aa0d8')}" stroke-width=".7"/><circle cx="10" cy="-74" r="3.4" fill="none" stroke="${c('#8aa0d8')}" stroke-width=".7"/>
  ${k.bl(-14,-69,2.2)}${k.bl(14,-69,2.2)}
  ${yfish(40,-88,1.3)}${yfish(50,-80,1)}${yfish(-46,-82,1.1)}${bubbles(c,[[-2,-96,2.2],[3,-103,1.6]])}`}});

/* ---------------------------------------------------------------- in space (y=0 is the lowest point) */
JIGART.subject({id:'spacewhale',name:'Star Whale',biomes:['space'],place:'space',w:1.35,draw:o=>{const k=K(o),{c,u}=k,n=o.night,st=n?'#fff6c8':'#fffbe8';
  return `<defs>${lin(o.id+'b',[[0,c('#7a6ae8')],[.5,c('#5a4ac8')],[1,c('#3a2a8a')]],0,1)}${lin(o.id+'n',[[0,c('#ff8ad8'),.0],[1,c('#ff8ad8'),.55]],1,0)}${k.L('bl','#f0e8ff','#c8b8f0')}${glowDef(o.id+'g','#fff2a8',n?.9:.6)}${k.Rg('pl','#ffc078','#e8704a',.35,.3,.8)}</defs>
  <g transform="translate(0 12)">
  ${[[-30,-76],[-44,-86],[-58,-96]].map(([x,y],i)=>spark(x,y,3-i*.6,st,.8-i*.15)).join('')}
  <path d="M-55 -64C-64 -72 -64 -86 -58 -94C-54 -86 -52 -80 -50 -76C-48 -84 -42 -92 -34 -94C-36 -84 -42 -74 -50 -66Z" fill="${u('b')}"/>
  <path d="M50 -46C50 -66 30 -76 6 -76C-18 -76 -32 -64 -44 -56C-49 -55 -53 -58 -56 -64L-50 -50C-36 -38 -14 -26 10 -26C34 -26 50 -32 50 -46Z" fill="${u('b')}"/>
  <path d="M50 -46C50 -66 30 -76 6 -76C-18 -76 -32 -64 -44 -56C-49 -55 -53 -58 -56 -64L-50 -50C-36 -38 -14 -26 10 -26C34 -26 50 -32 50 -46Z" fill="url(#${o.id}n)"/>
  <path d="M50 -44C46 -34 30 -28 10 -28C-8 -28 -24 -34 -36 -42C-20 -38 -4 -36 12 -36C30 -36 44 -40 50 -44Z" fill="${u('bl')}"/>${k.ln('M36 -38l-2 6M26 -36.6l-1.6 6.6M16 -36l-1 7M6 -36l-.6 7M-4 -36.6v6.6M-14 -38v6','#a898d8',.8)}
  <path d="M14 -32C10 -22 0 -14 -8 -12C-4 -20 0 -28 4 -34Z" fill="${c('#4a3aa8')}"/>
  ${[[-30,-62],[-18,-68],[-6,-70],[2,-62],[-12,-56],[14,-70]].map(([x,y],i,a)=>i?`<path d="M${a[i-1][0]} ${a[i-1][1]}L${x} ${y}" stroke="${st}" stroke-width=".5" opacity=".6"/>`:'').join('')}
  ${[[-30,-62,1.4],[-18,-68,1.8],[-6,-70,1.3],[2,-62,1.6],[-12,-56,1.2],[14,-70,1.4],[24,-60,1],[-38,-54,1],[30,-68,.9],[-24,-48,.9]].map(([x,y,r])=>glow(o.id+'g',x,y,r*3.6)+`<circle cx="${x}" cy="${y}" r="${r}" fill="${st}"/>`).join('')}
  <ellipse cx="0" cy="-70" rx="16" ry="3" fill="#fff" opacity=".2"/>
  ${k.eye(33,-54,2.8)}${k.ln('M50 -44Q40 -40 30 -45','#2a1a6a',1.3)}${k.bl(38,-46,3.4)}
  <g transform="translate(40 -94)"><circle r="7" fill="${u('pl')}"/><path d="M-6 -2.4Q0 -4 6 -1.6" stroke="${c('#ffe0b0')}" stroke-width="1" fill="none" opacity=".7"/><ellipse rx="13" ry="3.2" fill="none" stroke="${c('#ffe4a8')}" stroke-width="1.6" transform="rotate(-18)"/><path d="M-6.6 -.4A7 7 0 0 1 6.6 -.4" fill="${u('pl')}" transform="rotate(-18)"/></g>
  ${spark(-8,-92,4,st,.95)}${spark(56,-70,3,st,.9)}${spark(-60,-36,2.6,st,.8)}${spark(22,-12,2.6,st,.8)}</g>`}});

JIGART.subject({id:'alien',name:'Little Alien',biomes:['space'],place:'space',w:1.1,draw:o=>{const k=K(o),{c,u}=k,n=o.night;
  const lt=['#ff5a7a','#ffd23a','#5ae0ff','#7aff8a','#ff9a3a'];
  return `<defs>${k.Rg('rk','#a898b8','#5a4a6a',.4,.3,.8)}${k.Rg('g','#a0f070','#3aa84a',.42,.3,.8)}${k.L('m','#e8eef6','#8a96b0')}${rad(o.id+'d',[[0,'#e8ffff',.85],[1,'#7ad8f0',.55]],.35,.3,.8)}${glowDef(o.id+'gl','#fff6a0',n?.85:.5)}${lin(o.id+'bm',[[0,'#fff6a0',n?.55:.3],[1,'#fff6a0',0]])}</defs>
  <path d="M-38 -10C-40 -16 -30 -20 -18 -20C-4 -22 14 -20 26 -16C34 -13 34 -6 28 -3C20 0 -24 1 -32 -3C-36 -5 -38 -7 -38 -10Z" fill="${u('rk')}"/>
  ${[[-24,-12,4,1.6],[14,-10,5,1.8],[0,-6,2.6,1],[26,-12,2,.8]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c('#4a3a5a')}"/><path d="M${x-rx} ${y}A${rx} ${ry} 0 0 0 ${x+rx} ${y}" fill="none" stroke="${c('#c8b8d8')}" stroke-width=".6"/>`).join('')}
  <path d="M28 -100L40 -66L52 -100Z" fill="url(#${o.id}bm)" transform="translate(-6 18)"/>
  <g transform="translate(34 -84)">
  <path d="M-12 -2C-12 -14 12 -14 12 -2Z" fill="url(#${o.id}d)" stroke="${c('#bfeaff')}" stroke-width=".6"/><path d="M-6 -8Q-4 -11 0 -11.4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".9"/>
  <ellipse cx="0" cy="0" rx="22" ry="6.4" fill="${u('m')}"/><ellipse cx="0" cy="-1.6" rx="16" ry="2.6" fill="${c('#ffffff')}" opacity=".45"/><path d="M-14 4C-8 8 8 8 14 4" fill="none" stroke="${c('#6a7690')}" stroke-width="1.6"/>
  ${[-16,-8,0,8,16].map((x,i)=>`${n?glow(o.id+'gl',x,2,5):''}<circle cx="${x}" cy="${f(2-Math.abs(x)*.12)}" r="1.6" fill="${lt[i]}"/>`).join('')}</g>
  <g transform="translate(-6 -20)">
  <path d="M-7 0V-6M5 0V-6" stroke="${c('#3aa84a')}" stroke-width="4.4" stroke-linecap="round"/><ellipse cx="-8" cy="0" rx="4.6" ry="2.4" fill="${c('#3aa84a')}"/><ellipse cx="6" cy="0" rx="4.6" ry="2.4" fill="${c('#3aa84a')}"/>
  <path d="M-12 -4C-14 -14 -10 -26 0 -26C10 -26 14 -14 12 -4Z" fill="${u('g')}"/><ellipse cx="0" cy="-12" rx="6" ry="7" fill="${c('#d8ffb0')}" opacity=".8"/>
  <path d="M-11 -20C-17 -16 -20 -10 -20 -5" stroke="${c('#5ac85a')}" stroke-width="3.6" fill="none" stroke-linecap="round"/><circle cx="-20" cy="-4" r="2.6" fill="${c('#5ac85a')}"/>
  <path d="M11 -20C17 -24 20 -30 22 -38" stroke="${c('#5ac85a')}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <g fill="${c('#6ad06a')}"><circle cx="22" cy="-40" r="3"/><ellipse cx="19.4" cy="-43" rx="1.2" ry="2.2"/><ellipse cx="22.4" cy="-44.4" rx="1.2" ry="2.4"/><ellipse cx="25.4" cy="-43" rx="1.2" ry="2.2"/></g>
  ${k.ln('M28 -42q2 2 0 4M31 -44q3 3 0 6','#ffffff',.8,.7)}
  <path d="M-4 -46C-8 -54 -12 -60 -14 -64M6 -46C9 -54 12 -60 16 -64" stroke="${c('#5ac85a')}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  ${glow(o.id+'gl',-14,-65,n?8:5)}${glow(o.id+'gl',16,-65,n?8:5)}<circle cx="-14" cy="-65" r="3" fill="#fff36a"/><circle cx="16" cy="-65" r="3" fill="#fff36a"/><circle cx="-15" cy="-66" r="1" fill="#fff"/><circle cx="15" cy="-66" r="1" fill="#fff"/>
  <ellipse cx="0" cy="-37" rx="19" ry="15" fill="${u('g')}"/>
  ${[-7.5,7.5].map(x=>`<ellipse cx="${x}" cy="-38" rx="5.4" ry="6.6" fill="${c('#141024')}" transform="rotate(${x>0?12:-12} ${x} -38)"/><ellipse cx="${x+1.6}" cy="-40.6" rx="2" ry="2.6" fill="#fff"/><circle cx="${x-1.4}" cy="-35" r="1" fill="#fff" opacity=".8"/>`).join('')}
  ${k.bl(-12,-30,3)}${k.bl(12,-30,3)}<path d="M-4 -29Q0 -25 4 -29" fill="${c('#7a2a4a')}" stroke="${c('#2a5a2a')}" stroke-width=".8"/>
  <ellipse cx="-6" cy="-48" rx="5" ry="2" fill="#fff" opacity=".3" transform="rotate(-20 -6 -48)"/></g>
  ${spark(-40,-60,3,n?'#fff6c8':c('#fffbe8'),.9)}${spark(-50,-36,2.2,n?'#fff6c8':c('#fffbe8'),.8)}${spark(54,-56,2.4,n?'#fff6c8':c('#fffbe8'),.8)}${spark(-30,-92,2,n?'#fff6c8':c('#fffbe8'),.8)}`}});

})();
