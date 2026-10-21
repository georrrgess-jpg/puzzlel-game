/* ===================== v14 DESIGN SYSTEM: "Matchday program" =====================
   Identity comes from the user's school: --team / --team2 tokens drive the chenille patch,
   the jacket-cuff stripes and the active states. Amber (--accent) stays reserved for actions and live play. */
function teamTokens(){
  const r=document.documentElement.style; const C=App.C; const D=App.draft; const s=(C&&C.schools&&Sx(C.userSid)) || (!C&&D&&App.modal&&App.modal.type==='newCareer'&&App.modal.step===2&&D.schools?D.schools[D.userSid]:null);
  if(!s){ for(const k of ['--team','--team2','--team-hi','--team2-hi','--team-ink']) r.removeProperty(k); document.body.classList.remove('has-team'); return; }
  const P=mascotPalette(s.c1,s.c2); const tc=themeColors(); const surf=validHex(tc.surface)?tc.surface:'#131c26';
  const dark=lum(tc.bg||'#0b1016')<.3; const hi=dark?'#f4f7fa':'#0d1014';
  r.setProperty('--team',P.P); r.setProperty('--team2',P.S);
  r.setProperty('--team-hi',towards(P.P,hi,3.1,surf)); r.setProperty('--team2-hi',towards(P.S,hi,3.1,surf));
  r.setProperty('--team-ink',contrast('#ffffff',P.P)>=contrast('#111111',P.P)?'#ffffff':'#111111');
  document.body.classList.add('has-team');
}
function v14Patch(s,size=58){ const mk=s.mk||mascotKeyFor(s.mascot);
  return `<span class="patch" style="--pc:${s.c1};--ps:${mascotPalette(s.c1,s.c2).S};width:${size}px;height:${size}px" aria-hidden="true"><span class="patch-felt"></span><span class="patch-stitch"></span>${mascotSVG(mk,s.c1,s.c2,Math.round(size*.78))}</span>`; }
const V14_PHASES=[['preseason','Preseason'],['regular','League'],['sectionals','Sectionals'],['regional','Regional'],['states','States'],['offseason','Offseason']];
function v14Decorate(){
  const C=App.C; if(!C) return; const s=Sx(C.userSid);
  const br=$('.side .brand'); if(br&&!br.dataset.v14){ br.dataset.v14='1';
    br.innerHTML=`${v14Patch(s,58)}<div class="brand-t"><b>Touchline</b><small>${esc(s.town)} ${esc(s.mascot)}</small></div>`;
    br.insertAdjacentHTML('afterend','<div class="cuff" aria-hidden="true"></div>'); }
}
const _render14=render; render=function(){ const r=_render14.apply(this,arguments); try{ v14Decorate(); }catch(e){ console.warn(e); } return r; };
const _apply14=applyTheme; applyTheme=function(){ const r=_apply14.apply(this,arguments); try{ teamTokens(); }catch(e){} return r; };
const _rmodal14=renderModal; renderModal=function(){ if(!App.C) try{ teamTokens(); }catch(e){} return _rmodal14.apply(this,arguments); };
