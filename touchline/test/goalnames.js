// v18.8 goals named for their finish (src/v17/88_goalnames.js): simulated rounds tag goals from a cross with 82's pick
// (e.sty 'bike' / 'scissor'), and the name reaches TouchlineTV's top plays (ranked high), match reports, The Courier's
// wording and the Newswire ('highlight' items); a stored tag is what a stage replaying the goal shows; untagged and
// technique-tagged goals keep their old names where there is no special word; no page errors.
const { chromium, DIST } = require('./_pw');
let fails=0; const ok=(c,msg)=>{ console.log((c?'PASS ':'FAIL ')+msg); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Name Coach'); await page.fill('#nc-seed','names1');
  await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const R=await page.evaluate(()=>{ const C=App.C; for(let i=0;i<8;i++){ simRound(C); try{ advance(C); }catch(e){} }
    let cross=0, bikes=[], wrongName=0, notCross=0; for(const fid in C.logs){ const lg=C.logs[fid], f=C.fixtures[fid]; for(const e of lg.ev||[]){ if(e.t!=='goal') continue; if(e.ty==='cross') cross++;
      if(e.sty==='bike'||e.sty==='scissor'){ if(e.ty!=='cross'||!v188gEligible(e)) notCross++; if(v188GoalName(e)!==(e.sty==='bike'?'Bicycle kick':'Scissor kick')) wrongName++; bikes.push({fid,lvl:f.lvl,e}); } } }
    const plain=Object.values(C.logs).flatMap(lg=>(lg.ev||[]).filter(e=>e.t==='goal'&&!e.sty)).slice(0,20).every(e=>v188GoalName(e)===GOAL_TYPE_NAME[e.ty]);
    const hl=C.news.filter(n=>n.type==='highlight'); const bikeV=bikes.filter(x=>x.lvl==='V'||x.lvl==='JV');
    const is=courierIssues(C); let tvBike=null, tvTop=null; for(const x of is){ const tp=topPlays(C,x,5); const i=tp.findIndex(t=>t.sty==='bike'); if(i>=0&&!tvBike){ tvBike={rank:i+1,name:v188GoalName(tp[i])}; } if(!tvTop&&tp.length) tvTop=tp[0]; }
    let story=null; if(bikes.length){ const f=C.fixtures[bikes[0].fid]; story=storyOf(C,f).paras.join(' '); }
    return {cross,bikes:bikes.length,bikeV:bikeV.length,wrongName,notCross,plain,hl:hl.map(n=>n.text),tvBike,story:story&&/bicycle kick|scissor kick/.test(story),storyText:story&&story.slice(0,300),fid:bikes.length?bikes[0].fid:null}; });
  console.log(JSON.stringify({...R,hl:R.hl.slice(0,3)}));
  ok(R.bikes>=1, `simulated rounds: goals from a cross are tagged as bicycle / scissor kicks (${R.bikes} of ${R.cross} cross goals)`);
  ok(R.wrongName===0&&R.notCross===0, 'tagged goals are eligible crosses and named "Bicycle kick" / "Scissor kick"');
  ok(R.plain, 'untagged goals keep their old names');
  ok(R.hl.length===R.bikeV&&R.hl.every(t=>/scores with a (bicycle|scissor) kick in the \d+(st|nd|rd|th) minute of a \d+-\d+ (win|loss|draw) (over|at|to|with) /.test(t)), `the Newswire carries each Varsity/JV bicycle or scissor kick (${R.hl.length} items, e.g. "${R.hl[0]||''}")`);
  ok(R.tvBike&&R.tvBike.name==='Bicycle kick'&&R.tvBike.rank<=2, `TouchlineTV top plays name it "Bicycle kick" and rank it high (${JSON.stringify(R.tvBike)})`);
  ok(R.story, `The Courier's match story words it as one ("${(R.storyText||'').slice(0,160)}...")`);
  /* the match report lists the goal by its finish */
  if(R.fid){ await page.evaluate(fid=>{ A.openFixture({dataset:{id:fid}}); },R.fid).catch(()=>{}); await page.waitForTimeout(400);
    const txt=await page.evaluate(()=>document.body.innerText); ok(/Bicycle kick|Scissor kick/.test(txt), 'the match report names the goal "Bicycle kick" / "Scissor kick"'); await page.keyboard.press('Escape').catch(()=>{}); }
  /* the Newswire tab shows the highlight */
  await page.evaluate(()=>{ App.modal=null; App.route='news'; App.params={nv:'wire'}; render(); }); await page.waitForTimeout(300);
  const wire=await page.evaluate(()=>document.body.innerText); ok(/scores with a (bicycle|scissor) kick/.test(wire)&&/Highlight/.test(wire), 'the Newswire tab lists it, with a Highlight filter');
  /* a stage replaying a tagged goal shows that finish; a goal stored as '' (shown live, nothing special) never becomes one */
  const D=await page.evaluate(()=>{ const cv=document.createElement('canvas'); cv.width=600; cv.height=360; document.body.appendChild(cv);
    const {T,looks,mk:side}=labTeams(); const st=new Stage(cv,T,{lookup:pid=>looks[pid]}); st.setSides([side(0,'4-3-3'),side(1,'4-4-2')]); st.setKeeper(0,'L00'); st.setKeeper(1,'L10'); st.goalTs=1;
    const pid=[...st.players.values()].find(p=>p.side===0&&!p.gk).pid;
    const mk=sty=>({t:'goal',s:0,pid,ty:'cross',m:30,sc:[1,0],sty,seq:[{pid:'x',x:10,y:85,a:'cross'},{pid,x:50,y:88,a:'shot'}]});
    const r={bike:st.v186xDecide(mk('bike')),none:st.v186xDecide(mk('')),vol:st.v186xDecide(mk('volley'))}; st.destroy(); cv.remove(); return r; });
  ok(D.bike&&D.bike.kind==='bike'&&!D.none&&!D.vol, `a stored tag decides the replayed finish (bike ${JSON.stringify(D.bike)}, '' ${JSON.stringify(D.none)}, volley ${JSON.stringify(D.vol)})`);
  ok(errs.length===0, 'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
  console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
