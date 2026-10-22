/* ===================== v17 Phase 0: renderer preference ('auto' | '3d' | '2d') =====================
   PREFS.renderer is the user's choice of match graphics. Nothing draws differently yet: every caller asks
   rendererFor(kind) and gets '2d' until the 3-D renderer ships (ANIMATION_PLAN Phase 3), when 'auto' starts returning
   '3d' for the kinds that support it on capable devices. kind is 'live' | 'lab' | 'tv' | 'photo' | 'menu' | 'preview'. */
const V17_RENDERERS=['auto','3d','2d'];
/* the choices shown in Settings > Appearance; Phase 3 adds ['3d','3D broadcast'] here when it ships */
const V17_RENDERER_OPTIONS=[['auto','Auto (recommended)'],['2d','Classic 2D']];
DEFAULT_PREFS.renderer='auto';
if(!V17_RENDERERS.includes(PREFS.renderer)) PREFS.renderer='auto';
function rendererFor(kind){ return '2d'; }

/* Settings > Appearance: one select, wired through the input controller (data-c -> CH.renderer on change) */
CH.renderer=el=>{ PREFS.renderer=V17_RENDERERS.includes(el.value)?el.value:'auto'; savePrefs(); };
function v17RendererField(){ const cur=PREFS.renderer||'auto'; const list=V17_RENDERER_OPTIONS.some(o=>o[0]===cur)?V17_RENDERER_OPTIONS:[...V17_RENDERER_OPTIONS,[cur,cur==='3d'?'3D broadcast':cur]];
  return `<div class="field v17-rend"><label class="lab" for="set-renderer">Match graphics</label><select id="set-renderer" data-c="renderer">${list.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${esc(l)}</option>`).join('')}</select><span class="tiny muted">How live matches, highlights and previews are drawn. Auto picks the best renderer this device can run smoothly.</span></div>`; }
const v17_settingsView=VIEWS.settings;
VIEWS.settings=function(){ const h=v17_settingsView.apply(this,arguments); const k='data-k="rm"'; const i=h.indexOf(k); const j=i<0?-1:h.indexOf('</label>',i);
  if(j>=0) return h.slice(0,j+8)+v17RendererField()+h.slice(j+8);
  const c=h.indexOf('<div class="card"><h3>Sound</h3>'); return c>=0?h.slice(0,c)+`<div class="card"><h3>Match graphics</h3>${v17RendererField()}</div>`+h.slice(c):h; };
