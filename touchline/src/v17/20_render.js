/* ===================== v17 MENU RENDERING (ANIMATION_PLAN Phase 1, steps 2 and 3) =====================
   The cost of render() is the browser parsing, styling and laying out the markup (measured with CDP: ParseHTML +
   UpdateLayoutTree + Layout are ~85% of it; building the strings is 1-3 ms). So the work here is "less markup":
   1. Mascot marks, crests and portraits are cached as strings. Per-instance SVG ids are re-minted on every call, so a
      cached string never yields duplicate ids. Inside the career shell, full-size marks point at ONE shared
      outline/gloss filter per palette kept in a hidden sprite (#v17-sprite) instead of carrying 22 filter nodes each,
      and view content uses the lite mark (no filter) under 60 px; mascot pickers keep the gloss.
      Outside render() (start screen, share images, test sheets) the markup is byte-identical to v16: self-contained.
   2. render() fast path: when the route and the shell markup (side nav + top bar + page head) are unchanged, only the
      #content element is replaced; the v14/v15 decorations on the shell stay as they are.
   3. Schedule: the focus matchday and the next two are expanded; every other matchday is one summary row that expands
      in place. Long cards (rounds, postseason, school history, kit lab gallery) use content-visibility:auto.
   4. The kit lab memoises kitMatchup() while its view is being built (it was called ~47 times per render). */

/* ---------- 1. mark, crest and portrait caches ---------- */
let v17MarkCtx=0;   /* 0: standalone markup (v16 behaviour). 1: career shell, modals, views (sprite filters). 2: table/list views (sprite filters, lite under v17LiteMax px) */
let v17Gloss=0;     /* >0 while a mascot picker is built: its 52 px tiles keep the outline and gloss */
let v17LiteMax=60; /* in view content, marks below this size use the lite path */
const V17_NS='http://www.w3.org/2000/svg', V17_ID='\u0001';
const v17Cache={mark:new Map(),crest:new Map(),port:new Map()};
const v17Stat={fast:0,route:0,full:0};
let v17PtN=0;
function v17Put(m,k,v){ if(m.size>4000) m.clear(); m.set(k,v); return v; }
function v17Sprite(){ let el=v17Sprite.el;
  if(!el){ el=v17Sprite.el=document.createElementNS(V17_NS,'svg'); el.setAttribute('id','v17-sprite'); el.setAttribute('aria-hidden','true'); el.setAttribute('focusable','false'); el.setAttribute('width','0'); el.setAttribute('height','0');
    el.setAttribute('style','position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none'); el.appendChild(document.createElementNS(V17_NS,'defs')); v17Sprite.ids=new Map(); }
  if(!el.isConnected&&document.body) document.body.appendChild(el);
  return el; }
/* id of the shared outline/gloss filter for a palette (created once in the sprite) */
function v17Filter(c1,c2){ const el=v17Sprite(); const k=c1+'|'+c2; let id=v17Sprite.ids.get(k); if(id) return id;
  id='v17f'+(v17Sprite.ids.size+1); el.firstChild.insertAdjacentHTML('beforeend',mascotFilter(id,mascotPalette(c1,c2))); v17Sprite.ids.set(k,id); return id; }
/* a cached template -> final markup: lite needs nothing, 'i' gets a fresh inline filter id, 's' points at the sprite */
function v17Mint(t,mode,c1,c2){ if(mode==='l') return t; return t.split(V17_ID).join(mode==='s'?v17Filter(c1,c2):'mf'+(++_mUid)); }
/* markup for a sprite-referencing string used outside the page (e.g. drawn into an Image): inline the filters it uses */
function v17Standalone(svg){ svg=String(svg); if(svg.indexOf('url(#v17f')<0) return svg; const ids=[...new Set(svg.match(/v17f\d+/g)||[])];
  const defs=ids.map(id=>{ const f=document.getElementById(id); return f?f.outerHTML:''; }).join(''); return svg.replace(/(<svg\b[^>]*>)/,'$1<defs>'+defs+'</defs>'); }

const _v17Mascot=mascotSVG;
mascotSVG=function(key,c1,c2,size=64,label){
  const ctx=v17MarkCtx; const lite=size<(ctx===2&&!v17Gloss?v17LiteMax:34); const mode=lite?'l':ctx?'s':'i';
  const k=key+'|'+c1+'|'+c2+'|'+size+'|'+mode+'|'+(label||'');
  let t=v17Cache.mark.get(k);
  if(t===undefined){ const art=mascotInner(key,c1,c2,true);
    t=v17Put(v17Cache.mark,k,`<svg class="mascot${lite?' lite':''}" width="${size}" height="${size}" viewBox="${lite?'-2 -2 104 104':'-7 -7 114 116'}" role="img" aria-label="${label||((MASCOT_BY[key]||{}).n||'Mascot')} logo">${lite?art:`${mode==='i'?`<defs>${mascotFilter(V17_ID,mascotPalette(c1,c2))}</defs>`:''}<g filter="url(#${V17_ID})">${art}</g>`}</svg>`); }
  return v17Mint(t,mode,c1,c2); };

const _v17Crest=crest;
crest=function(s,size=40){ if(!s) return _v17Crest(s,size);
  const mk=s.mk||mascotKeyFor(s.mascot); const lite=size<60; const mode=lite?'l':v17MarkCtx?'s':'i';
  const k=mk+'|'+s.c1+'|'+s.c2+'|'+size+'|'+mode+'|'+(s.town||s.name||'')+'|'+(s.mascot||'');
  let t=v17Cache.crest.get(k);
  if(t===undefined){ const P=mascotPalette(s.c1,s.c2); const bg=_mc(P.P,'#05070b',0.66); const art=mascotInner(mk,s.c1,s.c2,true);
    const inner=lite?art:`${mode==='i'?`<defs>${mascotFilter(V17_ID,P)}</defs>`:''}<g filter="url(#${V17_ID})">${art}</g>`;
    t=v17Put(v17Cache.crest,k,`<svg class="crest" width="${size}" height="${(size*1.15).toFixed(1)}" viewBox="0 0 100 115" role="img" aria-label="${esc(s.town||s.name||'')} ${esc(s.mascot||'')} crest"><path d="M50 3 93 14v41c0 30-20 47-43 57C27 102 7 85 7 55V14z" fill="${bg}" stroke="${P.S}" stroke-width="5" stroke-linejoin="round"/><path d="M50 11 85 20v35c0 25-16 39-35 48C31 94 15 80 15 55V20z" fill="none" stroke="${P.P}" stroke-opacity=".55" stroke-width="2"/><g transform="translate(13 15) scale(.74)">${inner}</g></svg>`); }
  return v17Mint(t,mode,s.c1,s.c2); };

/* portraits: cached per player id + look + kit colours + number + name + size; the pattern/gradient ids are re-minted */
const _v17Portrait=portraitSVG;
portraitSVG=function(p,size=96,kit){
  const sch=p&&App.C?App.C.schools[p.sid]:null; const c1=(kit&&kit.c1)||(sch?sch.c1:'#1d4ed8'), c2=(kit&&kit.c2)||(sch?sch.c2:'#ffffff');
  const k=(p?p.id+'|'+p.num+'|'+p.fn+'|'+p.ln+'|'+p.grade:'-')+'|'+size+'|'+c1+'|'+c2+'|'+JSON.stringify(lookOf(p));
  let t=v17Cache.port.get(k);
  if(t===undefined){ const out=_v17Portrait(p,size,kit); const m=out.match(/<pattern id="([^"]+)t"/);
    t=v17Put(v17Cache.port,k,m?out.split(m[1]).join(V17_ID):out); }
  return t.indexOf(V17_ID)<0?t:t.split(V17_ID).join('pv'+(++v17PtN).toString(36)); };

/* mascot pickers are a grid of choices: keep the outline/gloss on their 52 px tiles (the new-career form, modals), except inside the
   list views (School), where 36 filtered tiles were the page's main raster cost */
const _v17Picker=mascotPicker;
mascotPicker=function(){ const keep=!(App.C&&V17_LITE_VIEWS.has(App.route)); if(keep) v17Gloss++; try{ return _v17Picker.apply(this,arguments); } finally{ if(keep) v17Gloss--; } };
/* the share-card renderer draws mascot markup into an <img>: give it self-contained filters */
if(typeof svgImg==='function'){ const _v17SvgImg=svgImg; svgImg=function(svg,size){ return _v17SvgImg(v17Standalone(svg),size); }; }

/* ---------- 2. render(): mark context + shell reuse ----------
   v17Swap(app, sideHtml, topHtml, viewHtml) is called by render() in place of the whole-shell innerHTML:
   - same route and identical shell markup: only #content is replaced;
   - another route, and the shell markup differs only by the active-route markers (class "on", aria-current) and the
     page head under the top bar: those markers are copied onto the live shell, the page head and #content replaced;
   - anything else (badges, record, sound, sim menu, search text, theme...): the whole shell is rebuilt as before. */
/* views whose small marks sit in tables and lists: marks under v17LiteMax px drop the filter there (in the others they
   keep it, through the sprite). In these views today that changes only the 34 px standings badges in League. */
const V17_LITE_VIEWS=new Set(['league','schedule','school','squads','kits']);
function v17View(fn){ const prev=v17MarkCtx; v17MarkCtx=V17_LITE_VIEWS.has(App.route)?2:1; try{ return fn(); } finally{ v17MarkCtx=prev; } }
const v17Shell={key:null,nkey:null,content:null};  /* last shell markup (exact and normalised) and the live #content element */
const V17_ROUTE_EL='.nav[data-r],.tn-tab,.tn-btn,.tn-item';
function v17Norm(h){ return h.replace(/aria-current="page"/g,'').replace(/ class="([^"]*)"/g,(m,c)=>' class="'+c.split(' ').filter(x=>x&&x!=='on').join(' ')+'"').replace(/\s+/g,' ').replace(/ >/g,'>'); }
/* copy the active-route markers from freshly built shell markup onto the live shell; false if they do not line up */
function v17Mark(app,c,markup){ const tpl=document.createElement('template'); tpl.innerHTML=markup;
  const a=tpl.content.querySelectorAll(V17_ROUTE_EL), b=[...app.querySelectorAll(V17_ROUTE_EL)].filter(el=>!c.contains(el)); if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++){ const x=a[i], y=b[i]; if(x.tagName!==y.tagName||x.getAttribute('data-r')!==y.getAttribute('data-r')) return false; }
  for(let i=0;i<a.length;i++){ const x=a[i], y=b[i]; if(y.className!==x.className) y.className=x.className; const ac=x.getAttribute('aria-current'); if(ac==null) y.removeAttribute('aria-current'); else if(y.getAttribute('aria-current')!==ac) y.setAttribute('aria-current',ac); }
  return true; }
function v17Swap(app,side,top,view){
  const key=App.route+'\u0002'+side+'\u0002'+top; const c=v17Shell.content;
  const live=!!(c&&c.isConnected&&c.parentNode&&c.parentNode.parentNode===app&&c.parentNode.firstElementChild&&c.parentNode.firstElementChild.tagName==='HEADER');
  /* a full render used to drop focus from the shell, which is what closes an open top-bar drop-down */
  const unfocus=()=>{ const a=document.activeElement; if(a&&a!==document.body&&app.contains(a)&&!c.contains(a)&&!a.matches('input,select,textarea')) a.blur(); };
  const clearSearch=()=>{ const sr=app.querySelector('#sres'); if(sr&&sr.firstChild) sr.innerHTML=''; };
  if(live&&key===v17Shell.key){ unfocus(); clearSearch(); c.className='content view-'+App.route; c.innerHTML=view; v17Stat.fast++; return true; }
  const hi=top.lastIndexOf('</header>'); const hdr=hi<0?null:top.slice(0,hi+9), head=hi<0?'':top.slice(hi+9);
  const nkey=hdr==null?null:v17Norm(side)+'\u0002'+v17Norm(hdr);
  if(live&&nkey!=null&&nkey===v17Shell.nkey&&v17Mark(app,c,side+hdr)){ unfocus(); clearSearch();
    const main=c.parentNode; let n=main.firstElementChild.nextSibling; while(n&&n!==c){ const nx=n.nextSibling; n.remove(); n=nx; }
    if(head) c.insertAdjacentHTML('beforebegin',head);
    /* a new #content element per route change, as the full render made: a leftover polishView timer from the previous page must only touch the detached old one */
    const nc=document.createElement('main'); nc.id='content'; nc.className='content view-'+App.route; nc.innerHTML=view; c.replaceWith(nc); v17Shell.content=nc; v17Shell.key=key; v17Stat.route++; return true; }
  app.innerHTML=side+`<div class="main">${top}<main class="content view-${App.route}" id="content">${view}</main></div>`;
  v17Shell.key=key; v17Shell.nkey=nkey; v17Shell.content=app.querySelector('#content'); v17Stat.full++; return true; }
const _v17Render=render;
render=function(){ const prev=v17MarkCtx; v17MarkCtx=App.C?1:0; if(!App.C) v17ShellDirty();
  try{ return _v17Render.apply(this,arguments); } finally{ v17MarkCtx=prev; } };
/* anything else that rewrites the shell must not be mistaken for an unchanged one */
function v17ShellDirty(){ v17Shell.key=null; v17Shell.nkey=null; }

/* ---------- 3. schedule: focus matchdays expanded, the rest one row each ---------- */
const v17Rounds=new Map();  /* 'year|lvl|rd' -> true (open) / false (closed), set by the user */
function v17RoundOpen(C,lvl,rd,focus){ const u=v17Rounds.get(C.year+'|'+lvl+'|'+rd); if(u!=null) return u; if(App.params.rall==='1') return true; return focus>=0&&rd>=focus&&rd<=focus+2; }
function v17GameRow(C,f){ const mine=f.h===C.userSid||f.a===C.userSid;
  return `<div class="li click" data-a="openFixture" data-id="${f.id}" ${mine?'style="background:color-mix(in srgb,var(--accent) 8%,transparent)"':''}>${crest(Sx(f.h),18)}<div class="grow trunc small">${esc(Sx(f.h).town)} <span class="muted">vs</span> ${esc(Sx(f.a).town)}${isRivalry(C,f.h,f.a)?' <span class="pill" style="border-color:var(--bad)">Rivalry</span>':''}</div><b class="mono">${f.st==='d'?`${f.hg}–${f.ag}`:'—'}</b>${crest(Sx(f.a),18)}</div>`; }
function v17RoundSummary(C,games){ const u=C.userSid; const f=games.find(g=>g.h===u||g.a===u); const done=games.filter(g=>g.st==='d').length;
  let me='';
  if(f){ const home=f.h===u, opp=Sx(home?f.a:f.h);
    if(f.st==='d'){ const w=f.w===u, l=f.w&&f.w!==u; const gf=home?f.hg:f.ag, ga=home?f.ag:f.hg;
      me=`<span class="pill" style="background:${w?'var(--good)':l?'var(--bad)':'var(--surface2)'};color:${w||l?'#0b0b0b':'inherit'}">${w?'W':l?'L':'D'}</span><b class="mono">${gf}–${ga}</b>`; }
    me+=`<span class="v17-rdopp">${home?'vs':'at'} ${crest(opp,18)}<span class="trunc">${esc(opp.town)}</span></span>`; }
  return {me,info:`${games.length} games${done&&done<games.length?` · ${done} played`:''}`}; }
function v17RoundCard(C,lvl,rd,games,focus){
  const cur=C.phase==='regular'&&rd===C.md; const open=v17RoundOpen(C,lvl,rd,focus);
  const tog=`data-a="v17Round" data-rd="${rd}" data-lvl="${lvl}" aria-expanded="${open}"`;
  if(open) return `<div class="card v17-rd" data-rd="${rd}" ${cur?'style="border-color:var(--accent)"':''}><div class="hd"><h3>Matchday ${rd+1}</h3><span class="row v17-rdh">${cur?'<span class="chip acc">Next up</span>':''}<button class="v17-rdt" ${tog} aria-label="Collapse matchday ${rd+1}">${icon('caret',16)}</button></span></div><div class="list">${games.map(f=>v17GameRow(C,f)).join('')}</div></div>`;
  const s=v17RoundSummary(C,games);
  return `<div class="card v17-rd v17-rdc" data-rd="${rd}" ${cur?'style="border-color:var(--accent)"':''}><h3 class="v17-rdh3"><button class="v17-rdsum" ${tog} aria-label="Matchday ${rd+1}: show all ${games.length} games"><span class="v17-rdtitle">Matchday ${rd+1}</span><span class="v17-rdme">${s.me}</span><span class="v17-rdn tiny muted">${s.info}</span><span class="v17-rdt" aria-hidden="true">${icon('caret',16)}</span></button></h3></div>`; }
function v17Focus(C){ return C.phase==='regular'?C.md:C.phase==='preseason'?0:-1; }
function v17RegRounds(C,lvl){ const rounds={}; for(const f of Object.values(C.fixtures)) if(f.yr===C.year&&f.lvl===lvl&&f.comp==='reg') (rounds[f.rd]=rounds[f.rd]||[]).push(f); return rounds; }
VIEWS.schedule = ()=>{
  const C=App.C; const lvl=App.params.lvl||'V'; const showPre = C.phase==='preseason' || (C.phase==='regular'&&C.md===0);
  const fx=Object.values(C.fixtures).filter(f=>f.yr===C.year&&f.lvl===lvl);
  const pre=fx.filter(f=>f.comp==='pre').sort((a,b)=>a.rd-b.rd);
  const rounds={}; for(const f of fx.filter(f=>f.comp==='reg')) (rounds[f.rd]=rounds[f.rd]||[]).push(f);
  const keys=Object.keys(rounds).map(Number).sort((a,b)=>a-b); const focus=v17Focus(C);
  /* played rows, then the focus matchdays side by side, then upcoming rows; one plain grid when everything is open */
  const groups=App.params.rall==='1'||focus<0?[['g2',keys]]:[['g2',keys.filter(rd=>rd<focus)],['v17-now',keys.filter(rd=>rd>=focus&&rd<=focus+2)],['g2',keys.filter(rd=>rd>focus+2)]];
  const anyClosed=keys.some(rd=>!v17RoundOpen(C,lvl,rd,focus));
  let html=`<div class="row" style="justify-content:space-between">${seg('lvl',LVLS.map(l=>[l,LVL_NAME[l]]),lvl)}<div class="row">${keys.length>3?`<button class="btn sm ghost" data-a="v17AllRounds" data-v="${anyClosed?'1':''}">${anyClosed?'Expand all matchdays':'Collapse matchdays'}</button>`:''}${C.phase==='preseason'?'<button class="btn" data-a="skipPre">Skip preseason</button>':''}</div></div>`;
  if(showPre && lvl==='V') html+=`<div class="card"><h3>Preseason Cup</h3><p class="small muted" style="margin-top:0">Three friendlies to test lineups. They give small development boosts, count only in preseason stats, and never touch league standings or records.</p><div class="list">${pre.map(f=>resultRow(f)).join('')}</div></div>`;
  html+=groups.filter(g=>g[1].length).map(([cls,ks])=>`<div class="grid ${cls} v17-rounds">${ks.map(rd=>v17RoundCard(C,lvl,rd,rounds[rd],focus)).join('')}</div>`).join('');
  const post=fx.filter(f=>['sec','rgn','st'].includes(f.comp)).sort((a,b)=>fxOrder(a)-fxOrder(b));
  if(post.length) html+=`<div class="card v17-cv v17-post"><h3>Postseason</h3><div class="list">${post.map(f=>resultRow(f,f.h===C.userSid||f.a===C.userSid?C.userSid:f.h)).join('')}</div></div>`;
  return html;
};
/* expand / collapse one matchday in place: no full render, the page does not move */
A.v17Round=el=>{ const C=App.C; const rd=+el.dataset.rd, lvl=el.dataset.lvl||'V'; const card=el.closest('.v17-rd'); const games=v17RegRounds(C,lvl)[rd]; if(!card||!games) return;
  const focus=v17Focus(C); v17Rounds.set(C.year+'|'+lvl+'|'+rd,!v17RoundOpen(C,lvl,rd,focus));
  card.outerHTML=v17View(()=>v17RoundCard(C,lvl,rd,games,focus));
  const b=document.querySelector(`.v17-rd[data-rd="${rd}"] [data-a="v17Round"]`); if(b) b.focus({preventScroll:true}); };
A.v17AllRounds=el=>{ const C=App.C; for(const k of [...v17Rounds.keys()]) if(k.startsWith(C.year+'|')) v17Rounds.delete(k); if(el.dataset.v) App.params.rall='1'; else delete App.params.rall; App.keepScroll=true; render(); };

/* ---------- 4. kit lab: kitMatchup() is pure for one view build, so memoise it there ---------- */
let v17KitMemo=null;
const _v17KitMatchup=kitMatchup;
kitMatchup=function(h,a){ if(!v17KitMemo||!h||!a||h.id==null||a.id==null) return _v17KitMatchup.apply(this,arguments); const k=h.id+'|'+a.id; let r=v17KitMemo.get(k); if(!r){ r=_v17KitMatchup.apply(this,arguments); v17KitMemo.set(k,r); } return r; };
const _v17Kits=VIEWS.kits;
VIEWS.kits=function(){ const outer=!v17KitMemo; if(outer) v17KitMemo=new Map(); try{ return _v17Kits.apply(this,arguments); } finally{ if(outer) v17KitMemo=null; } };
