/* v18.12 Gameday Graphics: edge cases (3-digit milestones, coach wins, keepers, hat tricks, long names, many scorers, losses,
   draws, penalties, away games with three tags, 14 seniors, a goalkeeper's Hall of Fame) in every style and both formats.
   node test/plan/gameday_stress.js [outDir]  ->  stress-*.png */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'../shots/v1812/gameday')); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Stress Coach'); await page.fill('#nc-seed','gd-stress'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  await page.evaluate(()=>{ const C=App.C; for(let i=0;i<8;i++){ simRound(C); try{ advance(C); }catch(e){} } });
  const cases=await page.evaluate(()=>{ const C=App.C, u=C.userSid; const ps=Object.values(C.players).filter(p=>p.sid===u&&p.lvl==='V'); const gk=ps.find(p=>p.pos==='GK'), st=ps.find(p=>p.pos==='FWD')||ps[0], def=ps.find(p=>p.pos==='DEF');
    const fin=Object.values(C.fixtures).filter(f=>f.st==='d'&&f.lvl==='V'&&(f.h===u||f.a===u)&&C.logs[f.id]); const away=fin.find(f=>f.a===u)||fin[0]; const home=fin.find(f=>f.h===u)||fin[0];
    const sc=[[0,'Mendoza-Rodriguez',4,0],[0,'Mendoza-Rodriguez',17,0],[0,'Okonkwo',22,0],[0,'Van der Berg',31,1],[0,'Li',45,0],[0,'Okonkwo',58,0],[0,'Nielsen',66,0],[0,'Garcia',71,0],[0,'Brooks',88,0],[1,'Castro',12,0],[1,'Castro',54,0]];
    const pm={pid:st.id,nm:'Maximilian Featherstonehaugh',rt:9.4,g:3,a:2,sh:9,sot:6,sv:0,tk:1,role:'ST'};
    const E=(o)=>({yr:C.year,t:0,pv:1,m:{},...o});
    return [
      ['gameday-away',E({id:'S1',k:'gameday',fid:away.id,pid:st.id,wk:'Wk 4'}),'tags'],
      ['final-win-big',E({id:'S2',k:'final',fid:home.id,pid:st.id,wk:'Wk 3',m:{sc,pm}}),'sc'],
      ['final-pens',E({id:'S3',k:'final',fid:away.id,pid:gk.id,wk:'Sec SF',m:{sc:sc.slice(0,2),pm:{pid:gk.id,nm:pname(gk),rt:8.8,g:0,a:0,sh:0,sv:11,tk:0,role:'GK'}}}),'pk'],
      ['milestone-100',E({id:'S4',k:'milestone',fid:home.id,pid:st.id,wk:'Wk 9',m:{kind:'goals',v:100,short:'100 GOALS',title:'100 career goals',unit:'CAREER GOALS',first:1,most:1}})],
      ['milestone-wins',E({id:'S5',k:'milestone',fid:home.id,pid:st.id,wk:'Wk 9',m:{kind:'wins',v:50,short:'50 WINS',title:'50 career wins',unit:'CAREER WINS',coach:'Dolores Whitaker-Nakamura'}})],
      ['milestone-cs',E({id:'S6',k:'milestone',fid:home.id,pid:gk.id,wk:'Wk 9',m:{kind:'cs',v:25,short:'25 CLEAN SHEETS',title:'25 career clean sheets',unit:'CAREER CLEAN SHEETS',first:0,most:1}})],
      ['milestone-hat',E({id:'S7',k:'milestone',fid:home.id,pid:st.id,wk:'Wk 6',m:{kind:'hat',v:3,short:'HAT TRICK',title:'hat trick',unit:'HAT TRICK'}})],
      ['milestone-ast',E({id:'S8',k:'milestone',fid:home.id,pid:def.id,wk:'Wk 9',m:{kind:'ast',v:25,short:'25 ASSISTS',title:'25 career assists',unit:'CAREER ASSISTS'}})],
      ['potw-gk',E({id:'S9',k:'potw',fid:home.id,pid:gk.id,wk:'Wk 7',m:{rt:9.1,g:0,a:0,sh:0,sv:9,tk:0,role:'GK',lg:1,wkn:7}})],
      ['potw-def',E({id:'S10',k:'potw',fid:home.id,pid:def.id,wk:'Wk 7',m:{rt:8.4,g:0,a:1,sh:1,sv:0,tk:7,role:'CB',lg:0,wkn:7}})],
      ['senior-14',E({id:'S11',k:'senior',fid:home.id,pid:st.id,wk:'Wk 14',m:{ids:ps.map(p=>p.id).slice(0,14)}})],
      ['hof-gk',E({id:'S12',k:'hof',pid:gk.id,yr:C.year,m:{yr:C.year,h:{pid:gk.id,name:pname(gk)+' III',num:gk.num,pos:'GK',g:0,a:2,sv:312,cs:31,gp:58,awards:['gk','tmvp'],titles:['State Champions']}}})]]; });
  for(const [name,e,kind] of cases){ for(const st of ['varsity','chrome','news']){ for(const fmt of (st==='varsity'?['portrait','square']:['portrait'])){
      const url=await page.evaluate(async([e,st,fmt,kind])=>{ const C=App.C; if(kind==='tags'){ V1812G.tagHooks.length=0; V1812G.tagHooks.push(()=>['RIVALRY NIGHT','SENIOR NIGHT','RANKED #3']); } const M=v1812gModel(C,e); if(!M) return null; if(kind==='pk'){ M.pk=[5,4]; M.res='W'; M.us=2; M.th=2; } const cv=await v1812gPoster(M,st,{fmt}); return cv.toDataURL('image/png'); },[e,st,fmt,kind||'']);
      if(!url){ console.log(name,'no model'); continue; } fs.writeFileSync(path.join(OUT,`stress-${name}-${st}${fmt==='square'?'-sq':''}.png`),Buffer.from(url.split(',')[1],'base64')); } } }
  console.log('errors',errs.slice(0,6)); await b.close(); })();
