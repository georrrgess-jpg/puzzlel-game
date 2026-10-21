/* ===================== v13 MENU POLISH: clearer navigation, a phone tab bar, layout fixes ===================== */
/* the sidebar, regrouped by what a coach is doing: today's match, the team, the competition, the stories, the club */
(function(){ const L=Object.fromEntries(NAV.filter(n=>n[0]).map(n=>[n[0],n[1]]));
  const groups=[['Matchday',['office','matchday','schedule','presched']],['Team',['squads','dev','camp']],['Competition',['league','post','awards','records']],['Stories',['news','capsule','history','tourneys','hof']],['Club',['school','kits','settings']]];
  const rename={dev:'Development',league:'League Table',schedule:'Match Schedule',records:'Record Book'};
  const seen=new Set(), out=[];
  for(const [g,ids] of groups){ const items=ids.filter(id=>L[id]!=null); if(!items.length) continue; out.push([null,g]); for(const id of items){ out.push([id,rename[id]||L[id]]); seen.add(id); } }
  for(const n of NAV) if(n[0]&&!seen.has(n[0])) out.push(n);
  NAV.length=0; NAV.push(...out); })();

/* a bottom tab bar on phones: the five places a coach goes most, always one tap away */
const TABBAR=[['office','Office'],['squads','Squads'],['schedule','Schedule'],['league','Table'],['_more','More']];
function tabbarSync(){ let bar=document.getElementById('tabbar'); const show=!!(App.C&&document.querySelector('.side')&&!document.body.classList.contains('locked'));
  if(!show){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement('nav'); bar.id='tabbar'; bar.setAttribute('aria-label','Quick navigation'); document.body.appendChild(bar); }
  const badges=(typeof navBadges==='function'&&App.C)?navBadges(App.C):{}; const r=App.route;
  bar.innerHTML=TABBAR.map(([k,l])=>k==='_more'?`<button class="tb ${document.body.classList.contains('navopen')?'on':''}" data-a="burger" aria-label="All sections">${icon('menu')}<span>${l}</span></button>`
    :`<button class="tb ${r===k?'on':''}" data-a="go" data-r="${k}" ${r===k?'aria-current="page"':''}>${icon(NAV_ICON[k]||k)}<span>${l}</span>${badges[k]?'<i class="tb-dot"></i>':''}</button>`).join(''); }
const _renderPolish=render; render=function(){ const out=_renderPolish.apply(this,arguments); try{ tabbarSync(); }catch(e){} return out; };
/* going to a new section starts at the top of it */
const _goPolish=A.go; A.go=el=>{ const changed=el&&el.dataset&&el.dataset.r!==App.route; _goPolish(el); if(changed){ try{ window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'}); }catch(e){} } };
