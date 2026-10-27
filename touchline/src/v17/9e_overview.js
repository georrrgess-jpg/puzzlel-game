/* ===================== v18.17 phase 2: THE OVERVIEW, DECLUTTERED =====================
   Same layout up top (your school, the Starting XI, the next match), then:
     "This week": the coach's decisions and any letter in the mailbox, as one row of one-tap items (they used to make the
       school card twice as tall, and the letter sat above everything);
     Youth watch, Training focus and the Section table, as before;
     the spotlight: the State Poll and the Gameday Graphics side by side;
     "Around the program": the County Map, results, development, leaders, milestones, the Press box and school news become one
       card with tabs (it was seven stacked cards). The tab you pick is remembered; "Customize overview" still decides what is in it.
   A last wrapper on VIEWS.office regroups the finished markup (every card is still built by its own feature), so nothing else
   changes and every button keeps its action. Identifiers v1817o / V1817O. */
const V1817O={ tab:null };
function v1817oKey(t){ return String(t||'').toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'')||'panel'; }
function v1817oRestructure(h){
  const t=document.createElement('template'); t.innerHTML=h; const root=t.content; const grid=root.querySelector('.ov-grid'); if(!grid) return h;
  grid.classList.add('v1817o-grid');
  /* this week */
  const items=[]; const dec=grid.querySelector('.ov-team .tc-dec'); let done='';
  if(dec){ const chip=dec.querySelector('.hd .chip'); done=chip?chip.textContent:''; dec.querySelectorAll('.dec').forEach(b=>items.push(b)); dec.remove(); }
  const mail=root.querySelector('.v1816-ovmail'); if(mail){ const b=document.createElement('button'); b.className='dec v1817o-mail'; b.dataset.a='v1816Open'; b.dataset.m=mail.dataset.m;
    b.innerHTML=`<span class="dec-ico">✉️</span><span class="grow"><b>${mail.querySelector('b')?mail.querySelector('b').innerHTML:'A letter'}</b><small>Coach’s mailbox · your call</small></span><span class="dec-go"></span>`; items.unshift(b); mail.remove(); }
  const week=document.createElement('section'); week.className='ov-card v1817o-week';
  week.innerHTML=`<div class="v1817o-wh"><h3>This week</h3>${done?`<span class="chip">${done}</span>`:''}</div><div class="v1817o-items"></div>`;
  const box=week.querySelector('.v1817o-items'); if(items.length) items.forEach(b=>box.appendChild(b)); else box.innerHTML='<p class="v1817o-clear">All set for this week. Nothing waiting on you.</p>';
  const match=grid.querySelector('.ov-match'); if(match) match.after(week); else grid.appendChild(week);
  /* the spotlight */
  const poll=grid.querySelector('.v1812p-ovcard'); const gd=root.querySelector('.v1812g-off');
  if(poll||gd){ const spot=document.createElement('div'); spot.className='v1817o-spot'+(poll&&gd?' two':''); grid.after(spot); if(poll) spot.appendChild(poll); if(gd) spot.appendChild(gd); }
  /* around the program: one card with tabs */
  const more=root.querySelector('.ov-more'), mh=root.querySelector('.ov-more-h');
  if(more&&more.children.length){ const cards=[...more.children]; const tabs=cards.map(c=>{ const hh=c.querySelector('h2,h3'); const title=hh?hh.textContent.trim():'More'; return {c,title,key:v1817oKey(title)}; });
    const want=V1817O.tab&&tabs.some(x=>x.key===V1817O.tab)?V1817O.tab:tabs[0].key;
    const feed=document.createElement('section'); feed.className='v1817o-feed';
    const cust=mh&&mh.querySelector('[data-a="panelsOpen"]');
    feed.innerHTML=`<div class="v1817o-fh"><h2>Around the program</h2><div class="v1817o-tabs" role="tablist">${tabs.map(x=>`<button role="tab" class="${x.key===want?'on':''}" aria-selected="${x.key===want}" data-a="v1817oTab" data-k="${x.key}">${esc(x.title)}</button>`).join('')}</div></div><div class="v1817o-panels"></div>`;
    if(cust) feed.querySelector('.v1817o-fh').appendChild(cust);
    const P=feed.querySelector('.v1817o-panels'); for(const x of tabs){ const w=document.createElement('div'); w.className='v1817o-panel'; w.dataset.k=x.key; w.setAttribute('role','tabpanel'); if(x.key!==want) w.hidden=true; w.appendChild(x.c); P.appendChild(w); }
    if(mh) mh.remove(); more.replaceWith(feed); }
  return t.innerHTML;
}
{ const _of=VIEWS.office; VIEWS.office=function(){ const h=_of.apply(this,arguments); try{ return v1817oRestructure(h); }catch(e){ console.warn('overview',e); return h; } }; }
A.v1817oTab=el=>{ const k=el.dataset.k; V1817O.tab=k; const f=el.closest('.v1817o-feed'); if(!f) return;
  f.querySelectorAll('.v1817o-tabs button').forEach(b=>{ const on=b.dataset.k===k; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
  f.querySelectorAll('.v1817o-panel').forEach(p=>{ const on=p.dataset.k===k; p.hidden=!on; if(on&&!reducedMotion()) p.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'}); });
  try{ tabIndicators(f); }catch(e){} };

/* ---------- menus: ordered and labelled in small groups; "More" is "Stories" ---------- */
const V1817O_MENU={
  squads:[['Roster',['squads','tryouts']],['Development',['dev','growth','camp']],['People',['families','cards']]],
  schedule:[['',['schedule','matchday','presched']]],
  league:[['Standings',['league','statepoll','countymap']],['Postseason & honors',['post','awards','records']]],
  school:[['Identity',['school','crest','kits']],['Media',['gameday']],['',['settings']]],
  _more:[['News',['news','capsule']],['Archive',['history','tourneys','hof']]] };
for(const t of TOPNAV){ const key=t[0]||'_more'; const G=V1817O_MENU[key]; if(!G) continue; if(!t[0]) t[1]='Stories';
  const order=G.flatMap(g=>g[1]); const rest=t[3].filter(k=>!order.includes(k)); t[3].splice(0,t[3].length,...order.filter(k=>t[3].includes(k)||VIEWS[k]),...rest); }
{ const _top=v15Top; v15Top=function(C){ let h=_top.apply(this,arguments); try{ const tp=document.createElement('template'); tp.innerHTML=h;
    tp.content.querySelectorAll('.tn-tab.has-dd:not(.tn-gear)').forEach(tab=>{ const dd=tab.querySelector('.tn-dd'); if(!dd) return; const first=dd.querySelector('[data-r]'); if(!first) return;
      const t=TOPNAV.find(x=>x[3].includes(first.dataset.r)); const G=t&&V1817O_MENU[t[0]||'_more']; if(!G) return;
      for(const [lab,ks] of G){ if(!lab) continue; const it=[...dd.querySelectorAll('.tn-item[data-r]')].find(b=>ks.includes(b.dataset.r)); if(it){ const s=document.createElement('div'); s.className='tn-sec'; s.textContent=lab; it.before(s); } } });
    h=tp.innerHTML; }catch(e){ console.warn('menus',e); } return h; }; }
