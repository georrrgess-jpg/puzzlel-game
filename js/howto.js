'use strict';
/* ====================== how-to cards ====================== */
const dm=(inner,cap)=>`<div class="dm">${inner}<small>${cap}</small></div>`;
const ARR='<span class="arr">→</span>';
const mini=(n,cells,f)=>`<div class="mini" style="grid-template-columns:repeat(${n},22px)">${cells.map(f).join('')}</div>`;
const idx=n=>[...Array(n).keys()];
const tube=(segs,cls='')=>`<div class="mt ${cls}">${segs.map(c=>`<b style="background:${COLORS[c]}"></b>`).join('')}</div>`;
const patIcon=o=>`<span class="mini sm pat" style="grid-template-columns:repeat(3,10px)">${idx(9).map(i=>`<i class="${o.some(([dx,dy])=>dx===i%3-1&&dy===((i/3)|0)-1)?'on':''}"></i>`).join('')}</span>`;
const FL={r:COLORS[0],b:COLORS[6],y:COLORS[2],g:COLORS[3]};
const floodDemo=(cells,own)=>mini(4,idx(16),i=>`<i class="${own.includes(i)?'own':''}" style="background:${FL[cells[i]]}"></i>`);
const slideDemo=(nums,tap)=>mini(3,idx(9),i=>`<i class="${i===tap?'tap':''}" style="${nums[i]===''?'visibility:hidden':''}">${nums[i]}</i>`);
const HOWTO={
  lights:{goal:'Turn every light off.',steps:['Tap any square.','It flips itself and the squares touching it. Lit squares go dark and dark squares light up.','Keep going until the whole board is dark. Fewer taps earn more stars. Watch the star meter!'],
    demo:()=>dm(mini(3,idx(9),i=>`<i class="${i===4?'tap':''}"></i>`),'Tap the middle square')+ARR+dm(mini(3,idx(9),i=>`<i class="${[1,3,4,5,7].includes(i)?'on':''}"></i>`),'It and its 4 neighbours flip')},
  tubes:{goal:'Make every tube hold a single colour.',steps:['Tap a tube to pick up its top colour.','Tap another tube to pour. It must be empty, or already have the same colour on top. Tubes you can pour into glow.','Fill each tube with 4 of one colour. The empty tubes are spare space.'],
    demo:()=>dm(tube([0,6],'tap')+tube([6])+tube([]),'Tap the tube with blue on top, then the tube with blue')+ARR+dm(tube([0])+tube([6,6])+tube([]),'The blue pours across')},
  rotate:{goal:'Point every arrow up.',steps:['Tap an arrow.','It and the arrows touching it turn a quarter turn clockwise.','An arrow turns green when it points up. Make them all green.'],
    demo:()=>dm(mini(3,idx(9),i=>`<i class="${i===4?'tap':''}">${[1,3,4,5,7].includes(i)?'←':'↑'}</i>`),'Tap the middle arrow')+ARR+dm(mini(3,idx(9),()=>'<i class="ok">↑</i>'),'Five arrows turn once')},
  slide:{goal:'Put the numbers in order, with the gap in the bottom-right corner.',steps:['Tap a tile next to the gap, or swipe it, to slide it in.','Tap a tile further along the same row or column to slide several at once.','Tiles with a white glowing outline are already in the right place.'],
    demo:()=>dm(slideDemo([1,2,3,4,5,6,'',8,7],7),'Tap the 8, next to the gap')+ARR+dm(slideDemo([1,2,3,4,5,6,7,8,''],-1),'It slides in. Numbers in order!')},
  flood:{goal:'Turn the whole board one colour before you run out of moves.',steps:['You own the white-outlined area in the top-left corner.','Tap a colour button to turn your area that colour.','Your area swallows every touching square of that colour. Grow it until it covers the board.'],
    demo:()=>dm(floodDemo(['r','r','b','y','r','b','b','y','g','g','b','y','g','y','y','y'],[0,1,4]),'Your area is red')+ARR+dm(floodDemo(['b','b','b','y','b','b','b','y','g','g','b','y','g','y','y','y'],[0,1,2,4,5,6,10]),'Tap blue: it grows')},
  memory:{goal:'Copy the pattern the pads play.',steps:['Watch the pads light up and play notes.','When it says Your turn, tap the same pads in the same order.','Every round adds one more pad. Three mistakes ends the level.'],
    demo:()=>dm(mini(2,idx(4),i=>`<i style="background:${COLORS[i]};width:34px;height:34px;font-size:16px">${['1','','2','3'][i]}</i>`),'Watch: pad 1, 2, 3')+ARR+dm(mini(2,idx(4),i=>`<i class="${[0,2,3].includes(i)?'tap':''}" style="background:${COLORS[i]};width:34px;height:34px;font-size:16px">${['1','','2','3'][i]}</i>`),'Tap them in the same order')}
};
