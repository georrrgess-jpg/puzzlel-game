const E=require('./load');
console.log('odds', [0.5,0.45,0.25,0.3,0.7,0.85,0.95,0.02].map(p=>p+':'+E.american?E.american(p,0.06):''));
const C=E.newCareer({slot:1,seed:31}); C.phase='regular';
const all=Object.values(C.players); console.log('all traits zero:', all.every(p=>p.tr.score===0&&p.tr.assist===0&&p.tr.stop===0&&p.tr.defend===0));
const f=Object.values(C.fixtures).find(f=>f.comp==='reg'&&f.lvl==='V'&&f.h===C.userSid);
const lu=E.getLu(C,C.userSid,'V'); const st=lu.slots.find(s=>s.role==='ST'||s.role==='LW'||s.role==='RW'); const p=C.players[st.pid];
function run(){ let g=0,team=0,n=300; for(let i=0;i<n;i++){ const M=E.startMatch(C,f.id,{seedSalt:'t'+i}); E.runToEnd(C,M); g+=M.pl[p.id].g; team+=M.sc[0]; } return [(g/n).toFixed(2),(team/n).toFixed(2)]; }
console.log('striker goals/team goals, trait 0:', run());
p.tr.score=10; console.log('trait 10:', run());
p.tr.score=5; console.log('trait 5:', run());
// skill comparison: +15 shooting
p.tr.score=0; p.sk.sho=Math.min(99,p.sk.sho+15); console.log('+15 shooting skill, trait 0:', run());
