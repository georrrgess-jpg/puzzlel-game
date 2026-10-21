const E=require('./load');
const C=E.newCareer({slot:1,seed:99});
let g=0; while(C.phase!=='offseason'&&g++<200){ E.simRound(C); E.advance(C); }
for(const id of [...C.tourneys[C.year].st[0].map(f=>[C.fixtures[f].h,C.fixtures[f].a]).flat(), C.tourneys[C.year].s6]) console.log(C.schools[id].name, C.schools[id].ext, E.xiRating(C,id,'V').toFixed(1));
