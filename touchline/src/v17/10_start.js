/* ===================== v17 START SCREEN: compositor-only menu backdrop (ANIMATION_PLAN Phase 1 step 1) =====================
   The mascot parade used to be 72 inline SVGs (two copies of the 36 mascots), each with its own SVG filter plus a CSS
   drop-shadow. It is now drawn ONCE per session into a single wide canvas strip (36 cells of 86 x 80 CSS px at the device
   pixel ratio, the drop shadow baked in with canvas shadowBlur). The strip is cut into 6 tiles of 6 mascots, each encoded
   to a PNG data URL (small synchronous encodes, one per frame slice: toBlob's idle-time PNG encoder took > 1 s next to the
   demo match), and shown as the background of 72 plain cells inside .parade-in. The track moves by one transform animation
   (translateX -50% = one strip, so the loop is seamless) and each cell keeps the old hover lift. Nothing is shown until the
   strip is ready (the cells reserve their space, so there is no layout jump); it is remade only when devicePixelRatio
   changes. The beams, logo and the rest of the start-screen motion are CSS only (10_start.css).
   Do not touch Stage/startMenuShow here (the demo canvas belongs to the stage housekeeping work). */
const V17_PARADE={cell:86, size:58, h:80, x0:14, per:6, shY:6, shBlur:10, shC:'rgba(0,0,0,.6)'};
let v17ParadeStrip={dpr:0, tiles:null, job:null};
function v17ParadeDpr(){ return Math.min(3, Math.max(1, window.devicePixelRatio||1)); }
/* markup for renderStart (ui_views.js): 2 x 36 empty cells; data-t is the tile, --c the column inside it */
function v17ParadeHTML(){ const n=MASCOT_LIST.length, per=V17_PARADE.per; let cells='';
  for(let i=0;i<2*n;i++){ const k=i%n; cells+=`<i data-t="${Math.floor(k/per)}" style="--c:${k%per}"></i>`; }
  return `<div class="parade v17-parade${v17ParadeStrip.tiles?' v17-ready':''}" aria-hidden="true"><div class="parade-in">${cells}</div></div>`; }
/* the wordmark plus an aria-hidden copy laid exactly over it that carries the periodic glint (opacity only, outside the
   word's drop-shadow filter, so the glint never makes the compositor re-filter the logo) */
function v17LogoWord(word){ return `<span class="v17-lw"><span class="logo-word" aria-label="Touchline">${word}</span><span class="logo-word v17-glint" aria-hidden="true">${word}</span></span>`; }
const v17Frame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
function v17SvgImage(svg){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }); }
function v17ParadeApply(){ const T=v17ParadeStrip.tiles; if(!T) return; let st=document.getElementById('v17-pstrip');
  if(!st){ st=document.createElement('style'); st.id='v17-pstrip'; (document.head||document.documentElement).appendChild(st); }
  st.textContent=T.map((t,i)=>`.v17-parade .parade-in i[data-t="${i}"]{background-image:url("${t.url}");background-size:${t.cols*V17_PARADE.cell}px ${V17_PARADE.h}px}`).join('\n');
  document.querySelectorAll('.v17-parade').forEach(p=>p.classList.add('v17-ready')); }
/* draws the strip, then encodes it tile by tile, in slices of <= ~6 ms per frame; abandons the job if the start screen
   goes away (it starts again on the next start-screen render) */
function v17ParadeBuild(){ const dpr=v17ParadeDpr();
  if(v17ParadeStrip.tiles&&v17ParadeStrip.dpr===dpr){ v17ParadeApply(); return Promise.resolve(true); }
  if(v17ParadeStrip.job&&v17ParadeStrip.job.dpr===dpr) return v17ParadeStrip.job.p;
  const job={dpr}; v17ParadeStrip.job=job;
  const live=()=>v17ParadeStrip.job===job&&!!document.getElementById('start');
  job.p=(async()=>{ try{
    const P=V17_PARADE, list=MASCOT_LIST, n=list.length, px=Math.round(P.size*dpr), ch=Math.round(P.h*dpr);
    const cv=document.createElement('canvas'); cv.width=Math.round(n*P.cell*dpr); cv.height=ch;
    const g=cv.getContext('2d'); if(!g) return false;
    /* canvas shadowBlur B is a Gaussian of sigma B/2, the same as a CSS drop-shadow blur radius B; neither scales with the
       transform, so both are given in device pixels */
    g.shadowColor=P.shC; g.shadowOffsetX=0; g.shadowOffsetY=P.shY*dpr; g.shadowBlur=P.shBlur*dpr;
    const imgs=list.map(([k],i)=>{ const cp=COLOR_PAIRS[(i*7)%COLOR_PAIRS.length];
      const svg=mascotSVG(k,cp[0],cp[1],P.size).replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"').replace(`width="${P.size}" height="${P.size}"`,`width="${px}" height="${px}"`);
      return v17SvgImage(svg); });
    await v17Frame(); let t0=performance.now();
    const slice=async()=>{ if(performance.now()-t0>6){ await v17Frame(); t0=performance.now(); } return live(); };
    for(let i=0;i<n;i++){ if(!live()) return false;
      const im=await imgs[i]; if(!live()) return false;
      if(im) g.drawImage(im, Math.round((i*P.cell+P.x0)*dpr), 0, px, px);
      if(!await slice()) return false; }
    const tiles=[];
    for(let t=0;t*P.per<n;t++){ const cols=Math.min(P.per,n-t*P.per), sx=Math.round(t*P.per*P.cell*dpr), sw=Math.round((t*P.per+cols)*P.cell*dpr)-sx;
      const tc=document.createElement('canvas'); tc.width=sw; tc.height=ch; tc.getContext('2d').drawImage(cv,sx,0,sw,ch,0,0,sw,ch);
      let url=''; try{ url=tc.toDataURL('image/png'); }catch(e){} if(!url||url.length<32) return false;
      tiles.push({url,cols}); if(!await slice()) return false; }
    await Promise.all(tiles.map(t=>{ try{ const im=new Image(); im.src=t.url; return im.decode?im.decode().catch(()=>{}):null; }catch(e){ return null; } }));
    if(v17ParadeStrip.job!==job) return false;
    v17ParadeStrip={dpr, tiles, job:null}; v17ParadeApply(); return true;
  }catch(e){ console.warn('v17 parade', e); return false; }
  finally{ if(v17ParadeStrip.job===job) v17ParadeStrip.job=null; } })();
  return job.p; }
/* the career cards and the continue hero carry full-size mascots (each an inline SVG with its own filter). They are swapped
   for <img> copies of the same SVG, rasterised once by the image decoder, so the start screen holds no live SVG filter at
   all. They are still invisible at that point (the cards and the hero fade in after 1.1 s), so the async image load never shows. */
function v17MascotsToImg(root){ if(!root||typeof XMLSerializer==='undefined') return; const xs=new XMLSerializer();
  root.querySelectorAll('.slot-wm>svg.mascot,.slot-logo>svg.mascot,.ch-logo>svg.mascot').forEach(svg=>{ try{
    const im=document.createElement('img'); im.className='mascot v17-mimg'; im.alt=''; im.decoding='async';
    im.width=+svg.getAttribute('width')||64; im.height=+svg.getAttribute('height')||64;
    im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xs.serializeToString(svg)); svg.replaceWith(im); }catch(e){} }); }
/* after every start-screen render: swap the card mascots, then make (or reuse) the parade strip */
const _v17RenderStart=renderStart;
renderStart=async function(){ const r=await _v17RenderStart.apply(this,arguments);
  try{ const ui=document.querySelector('#start .start-ui'); v17MascotsToImg(ui); if(document.querySelector('.v17-parade')) v17ParadeBuild(); }catch(e){ console.warn(e); } return r; };
/* devicePixelRatio changes (browser zoom, moving the window to another screen): rebuild while the old strip stays up */
let v17ParadeRz=0;
window.addEventListener('resize',()=>{ clearTimeout(v17ParadeRz); v17ParadeRz=setTimeout(()=>{ if(document.querySelector('.v17-parade')&&v17ParadeStrip.dpr!==v17ParadeDpr()) v17ParadeBuild(); },250); });
