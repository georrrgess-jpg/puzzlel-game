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
const HT_PLUS=[1,3,4,5,7];
const HOWTO={};   // filled in by registerMode() from each file in js/modes/
