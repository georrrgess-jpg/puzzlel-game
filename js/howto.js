'use strict';
/* ====================== how-to cards ======================
   Each demo is a looping two-state "stage": the BEFORE state (with a pulsing finger on the
   square to tap) cross-fades into the AFTER state, where the squares that changed pop. */
const HT_F='<em class="fing">👆</em>',HT_F2='<em class="fing f2">👆</em>';
const htStage=(before,after,capB,capA)=>`<div class="htstage"><div class="hst sb">${before}<small><b>1</b>${capB}</small></div><div class="hst sa">${after}<small><b>2</b>${capA}</small></div></div><div class="sdots"><i></i><i></i></div>`;
const mini=(n,cells,f,sz=30)=>`<div class="mini" style="grid-template-columns:repeat(${n},${sz}px)">${cells.map(f).join('')}</div>`;
const idx=n=>[...Array(n).keys()];
const tube=(segs,cls='',extra='')=>`<div class="mt ${cls}">${segs.map((c,i)=>`<b class="${cls.includes('grow')&&i===segs.length-1?'chg dropin':''}" style="background:${COLORS[c]}"></b>`).join('')}${extra}</div>`;
const patIcon=o=>`<span class="mini sm pat" style="grid-template-columns:repeat(3,10px)">${idx(9).map(i=>`<i class="${o.some(([dx,dy])=>dx===i%3-1&&dy===((i/3)|0)-1)?'on':''}"></i>`).join('')}</span>`;
const FL={r:COLORS[0],b:COLORS[6],y:COLORS[2],g:COLORS[3]};
const floodDemo=(cells,own,chg=[])=>mini(4,idx(16),i=>`<i class="${own.includes(i)?'own':''} ${chg.includes(i)?'chg':''}" style="background:${FL[cells[i]]}"></i>`,24);
const htCbRow=tap=>`<div class="cbrow">${['r','b','y','g'].map(k=>`<i class="${k===tap?'tap':''}" style="background:${FL[k]}">${k===tap?HT_F:''}</i>`).join('')}</div>`;
const slideDemo=(nums,tap,mv)=>mini(3,idx(9),i=>`<i class="${i===tap?'tap':''} ${i===mv?'chg slid':''}" style="${nums[i]===''?'visibility:hidden':''}">${nums[i]}${i===tap?HT_F:''}</i>`);
const HT_PLUS=[1,3,4,5,7];
const HOWTO={
  lights:{goal:'Turn every light off.',steps:['Tap any square.','It flips itself and the squares touching it. Lit squares go dark and dark squares light up.','Keep going until the whole board is dark. Fewer taps earn more stars. Watch the star meter!'],
    demo:()=>htStage(mini(3,idx(9),i=>`<i class="${HT_PLUS.includes(i)?'on':''} ${i===4?'tap':''}">${i===4?HT_F:''}</i>`),
      mini(3,idx(9),i=>`<i class="${HT_PLUS.includes(i)?'chg off':''}"></i>`)+'<div class="okbadge">✓</div>','Tap the middle square','It and its 4 neighbours flip. All dark!')},
  tubes:{goal:'Make every tube hold a single colour.',steps:['Tap a tube to pick up its top colour.','Tap another tube to pour. It must be empty, or already have the same colour on top. Tubes you can pour into glow.','Fill each tube with 4 of one colour. The empty tubes are spare space.'],
    demo:()=>htStage(`<div class="mtrow">${tube([0,6],'tap',HT_F)+tube([6],'tap2',HT_F2)+tube([])}</div>`,`<div class="mtrow">${tube([0])+tube([6,6],'grow')+tube([])}</div>`,
      'Tap the tube with blue on top, then the blue tube','The blue pours across')},
  rotate:{goal:'Point every arrow up.',steps:['Tap an arrow.','It and the arrows touching it turn a quarter turn clockwise.','An arrow turns green when it points up. Make them all green.'],
    demo:()=>htStage(mini(3,idx(9),i=>`<i class="${i===4?'tap':''} ${HT_PLUS.includes(i)?'':'ok'}"><span class="ar">${HT_PLUS.includes(i)?'←':'↑'}</span>${i===4?HT_F:''}</i>`),
      mini(3,idx(9),i=>`<i class="ok ${HT_PLUS.includes(i)?'chg turn':''}"><span class="ar">↑</span></i>`),'Tap the middle arrow','Five arrows turn. All up!')},
  slide:{goal:'Put the numbers in order, with the gap in the bottom-right corner.',steps:['Tap a tile next to the gap, or swipe it, to slide it in.','Tap a tile further along the same row or column to slide several at once.','Tiles with a white glowing outline are already in the right place.'],
    demo:()=>htStage(slideDemo([1,2,3,4,5,6,7,'',8],8,-1),slideDemo([1,2,3,4,5,6,7,8,''],-1,7),'Tap the 8, next to the gap','It slides in. Numbers in order!')},
  flood:{goal:'Turn the whole board one colour before you run out of moves.',steps:['You own the white-outlined area in the top-left corner.','Tap a colour button to turn your area that colour.','Your area swallows every touching square of that colour. Grow it until it covers the board.'],
    demo:()=>htStage(floodDemo(['r','r','b','y','r','b','b','y','g','g','b','y','g','y','y','y'],[0,1,4])+htCbRow('b'),
      floodDemo(['b','b','b','y','b','b','b','y','g','g','b','y','g','y','y','y'],[0,1,2,4,5,6,10],[0,1,2,4,5,6,10])+htCbRow(''),'Your area is red. Tap blue','Your area grows over the blue')},
  memory:{goal:'Copy the pattern the pads play.',steps:['Watch the pads light up and play notes.','When it says Your turn, tap the same pads in the same order.','Every round adds one more pad. You have 4 lives, and one slip still earns 3 stars.'],
    demo:()=>htStage(mini(2,idx(4),i=>`<i class="pd ${['s1','','s2','s3'][i]}" style="background:${COLORS[i]}">${['1','','2','3'][i]}</i>`,40),
      mini(2,idx(4),i=>`<i class="pd ${['t1','','t2','t3'][i]}" style="background:${COLORS[i]}">${['1','','2','3'][i]}</i>`,40),'Watch: pad 1, 2, 3','Tap them in the same order')}
};
