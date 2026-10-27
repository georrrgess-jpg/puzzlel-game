/* ===================== v18.17 CREST STUDIO (screen) =====================
   Club -> Crest Studio: shape, field, emblem (any of the mascots) and ribbon, a large live preview, five quick variants from the
   same colours, and how it reads on the scoreboard, a jersey chest, the stadium sign; save it as a PNG with a clear background.
   Undo, reset to the classic shield, surprise me. Saved on the school (s.crest). */
const V1817S={ undo:[] };
function v1817sMe(){ const C=App.C; return C&&C.schools[C.userSid]; }
function v1817sSet(patch,noUndo){ const s=v1817sMe(); if(!s) return; const cur=v1817cDef(s); if(!noUndo){ V1817S.undo.push(s.crest?{...s.crest}:null); if(V1817S.undo.length>40) V1817S.undo.shift(); } s.crest={...cur,...patch}; try{ queueSave(); }catch(e){} }
function v1817sAbbr(s){ const w=String(s.town||s.name||'').replace(/[^A-Za-z ]/g,'').trim().split(/\s+/); return (w.length>1&&w[0].length<4?w[0][0]+w[1].slice(0,2):w[0].slice(0,3)).toUpperCase(); }
const V1817S_VAR=[['round','split'],['hex','bend'],['banner','pales'],['heater','chevron'],['diamond','bend']];
function v1817sLive(C){ const s=v1817sMe(); const d=v1817cDef(s); const opp=Sx(C.rivals.heated)||Sx(C.league.find(x=>x!==C.userSid));
  return `<div class="v1817-card"><span class="v1817-k">Scoreboard</span><div class="v1817-sb">${crest(s,30)}<b>${esc(v1817sAbbr(s))}</b><span>2 – 1</span><b>${esc(v1817sAbbr(opp))}</b>${crest(opp,30)}</div></div>
   <div class="v1817-card v1817-row"><span class="v1817-k">Jersey chest</span><span class="v1817-shirt">${shirtSVG(s.c1,s.c2,'10',112)}<i>${crest(s,22)}</i></span><p>The crest scales down cleanly. Small sizes drop the emblem and keep the shape and field.</p></div>
   <div class="v1817-card"><span class="v1817-k">Stadium sign</span>${v1817sSign(s)}</div>
   <button class="v1817-card v1817-row v1817-png" data-a="v1817Png"><span class="v1817-pngc">${crest(s,40)}</span><span><b>Save as an image</b><small>PNG with a clear background, for avatars and posters</small></span></button>`; }
function v1817sSign(s){ return `<div class="v1817-sign" style="--c1:${s.c1};--c2:${s.c2}">${crest(s,52)}<span><b>Home of the ${esc(s.mascot)}</b><small>${esc(s.name)}</small></span></div>`; }
function v1817sPick(k,list,cur,s,d){ return list.map(v=>{ const dd={...d,[k]:v,rb:''}; const lab=k==='sh'?V1817C.SHN[v]:k==='fd'?V1817C.FDN[v]:(MASCOT_BY[v]||{}).n||v;
  return `<button class="v1817-opt ${cur===v?'on':''}" data-a="v1817Set" data-k="${k}" data-v="${esc(v)}" title="${esc(lab)}" aria-label="${esc(lab)}" aria-pressed="${cur===v}">${k==='em'?mascotSVG(v,s.c1,s.c2,40,lab):v1817cDraw(s,40,dd)}</button>`; }).join(''); }
VIEWS.crest=()=>{ const C=App.C; const s=v1817sMe(); const d=v1817cDef(s); const em=(typeof MASCOT_KEYS!=='undefined'?MASCOT_KEYS:Object.keys(MASCOT_BY));
  const vars=V1817S_VAR.map(([sh,fd])=>{ const dd={...d,sh,fd}; return `<button class="v1817-var" data-a="v1817Var" data-sh="${sh}" data-fd="${fd}" title="${V1817C.SHN[sh]} · ${V1817C.FDN[fd]}">${v1817cDraw(s,74,dd)}</button>`; }).join('');
  return `<div class="v1817"><section class="v1817-l">
    <div class="v1817-hero"><span class="v1812p-kick">Identity</span><p>Build your school crest from a shape, a field, an emblem and a ribbon. It carries through the scoreboard, the schedule, the tables, the State Poll and the stadium.</p></div>
    <div class="v1817-card"><h3>Shape</h3><div class="v1817-opts">${v1817sPick('sh',Object.keys(V1817C.SH),d.sh,s,d)}</div></div>
    <div class="v1817-card"><h3>Field</h3><div class="v1817-opts">${v1817sPick('fd',V1817C.FD,d.fd,s,d)}</div></div>
    <div class="v1817-card"><h3>Emblem <small>${em.length} mascots</small></h3><div class="v1817-opts v1817-ems">${v1817sPick('em',em,d.em,s,d)}</div></div>
    <div class="v1817-card"><h3>Ribbon</h3><div class="v1817-rb"><input type="text" id="v1817-rb" maxlength="14" value="${esc(d.rb)}" placeholder="EST 1962" aria-label="Ribbon text"><button class="btn sm" data-a="v1817Trim">Trim</button><button class="btn sm ghost" data-a="v1817Est">Use a year</button></div><small class="muted">Shows on crests 64 px and up. Leave it empty for none.</small></div>
  </section>
  <section class="v1817-c"><div class="v1817-big" id="v1817-big">${v1817cDraw(s,300,d)}</div>
    <div class="v1817-tools"><button class="btn sm ghost" data-a="v1817Undo" ${V1817S.undo.length?'':'disabled'}>Undo</button><button class="btn sm ghost" data-a="v1817Reset">Classic shield</button><button class="btn sm" data-a="v1817Surprise">Surprise me</button></div>
    <p class="v1817-cap">Preview updates as you edit</p><div class="v1817-vars">${vars}</div><p class="v1817-cap">Five quick variants from the same colors</p></section>
  <section class="v1817-r" id="v1817-live">${v1817sLive(C)}</section></div>`; };
TITLES.crest='Crest Studio'; NAV_ICON.crest='shield'; if(typeof NAV_DESC!=='undefined') NAV_DESC.crest='Shape, field, emblem and ribbon';
{ const i=NAV.findIndex(n=>n[0]==='school'); if(i>=0&&!NAV.some(n=>n[0]==='crest')) NAV.splice(i+1,0,['crest','Crest Studio']); }
{ const g=TOPNAV.find(t=>t[0]==='school'); if(g&&!g[3].includes('crest')){ const j=g[3].indexOf('kits'); g[3].splice(j>=0?j+1:1,0,'crest'); } }
if(typeof V17_LITE_VIEWS!=='undefined') V17_LITE_VIEWS.add('crest');
const v1817sRe=()=>{ App.keepScroll=true; render(); };
A.v1817Set=el=>{ v1817sSet({[el.dataset.k]:el.dataset.v}); v1817sRe(); };
A.v1817Var=el=>{ v1817sSet({sh:el.dataset.sh,fd:el.dataset.fd}); v1817sRe(); };
A.v1817Undo=()=>{ const s=v1817sMe(); if(!V1817S.undo.length) return; const p=V1817S.undo.pop(); if(p) s.crest=p; else delete s.crest; try{ queueSave(); }catch(e){} v1817sRe(); };
A.v1817Reset=()=>{ const s=v1817sMe(); V1817S.undo.push(s.crest?{...s.crest}:null); delete s.crest; try{ queueSave(); }catch(e){} v1817sRe(); };
A.v1817Surprise=()=>{ const s=v1817sMe(); const r=rngFrom((Date.now()^hashStr(s.id))>>>0); const sh=pick(r,Object.keys(V1817C.SH)), fd=pick(r,V1817C.FD.filter(f=>f!=='classic')); v1817sSet({sh,fd}); v1817sRe(); };
function v1817sTrim(t){ return String(t||'').toUpperCase().replace(/[^A-Z0-9 &'.\-]/g,'').replace(/\s+/g,' ').trim().slice(0,12); }
A.v1817Trim=()=>{ const i=$('#v1817-rb'); const v=v1817sTrim(i?i.value:''); v1817sSet({rb:v}); v1817sRe(); };
A.v1817Est=()=>{ const s=v1817sMe(); const r=v1817cR('est',s.id); v1817sSet({rb:'EST '+(1900+Math.floor(r()*80))}); v1817sRe(); };
/* the ribbon updates the previews as you type, without redrawing the page (the cursor stays) */
document.addEventListener('input',e=>{ if(!e.target||e.target.id!=='v1817-rb'||!App.C) return; const s=v1817sMe(); const d=v1817cDef(s); const v=e.target.value.slice(0,14);
  if(!V1817S.typing){ V1817S.undo.push(s.crest?{...s.crest}:null); V1817S.typing=true; } s.crest={...d,rb:v}; clearTimeout(V1817S.t); V1817S.t=setTimeout(()=>{ V1817S.typing=false; try{ queueSave(); }catch(x){} },600);
  const big=$('#v1817-big'); if(big) big.innerHTML=v1817cDraw(s,300,s.crest); const live=$('#v1817-live'); if(live) live.innerHTML=v1817sLive(App.C); });
/* PNG with a clear background */
function v1817sPngBlob(s,px){ return new Promise(res=>{ const d=v1817cDef(s); let svg=v1817cDraw(s,px,d); svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
  const img=new Image(); img.onload=()=>{ const cv=document.createElement('canvas'); cv.width=px; cv.height=Math.round(px*1.15); const g=cv.getContext('2d'); g.drawImage(img,0,0,cv.width,cv.height); cv.toBlob(b=>res(b),'image/png'); }; img.onerror=()=>res(null);
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }); }
A.v1817Png=async()=>{ const s=v1817sMe(); const b=await v1817sPngBlob(s,1024); if(!b){ toast('The image could not be made on this device.'); return; } const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=(s.town||'school').replace(/[^A-Za-z0-9]+/g,'-').toLowerCase()+'-crest.png'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); toast('Crest saved as an image'); };
/* School & Stadium: the sign over the gate, and a way into the studio */
{ const _sv=VIEWS.school; VIEWS.school=function(){ let h=_sv.apply(this,arguments); try{ const s=v1817sMe(); const card=`<section class="v1817-gate">${v1817sSign(s)}<button class="btn sm" data-a="go" data-r="crest">Edit crest</button></section>`;
  const i=h.indexOf('</section>'); h=i>=0?h.slice(0,i+10)+card+h.slice(i+10):card+h; }catch(e){ console.warn('crest school',e); } return h; }; }
