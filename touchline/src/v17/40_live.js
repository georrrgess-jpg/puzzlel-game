/* ===== v17 · 40_live: the live screen's commentary feed appends instead of rebuilding =====
   renderFeed (ui_live.js) rebuilt the whole Commentary list on every minute and every event, so every line was
   re-created and replayed its pop animation each time. The feed is newest-first (feedPush unshifts), so new
   lines are inserted at the top and existing nodes are left alone. The full rebuild (the original renderFeed)
   still runs when the panel shows another tab, when the tab changes, when the panel node is new, when the
   feed array was replaced or shrank, or when anything else rewrote the panel. Other tabs are unchanged.
   Also here: the live panel is a layout/paint containment boundary (40_live.css). */
const v17RenderFeed0=renderFeed;
function v17FeedItem(x,i){ return `<div class="fe ${x.cls} ${x.fresh&&i===0?'new':''}"><span class="m">${x.m}</span><span>${x.txt}</span></div>`; }
renderFeed=function(){
  const L=App.live; const body=$('#lv-pbody');
  if(!L||!body||L.tab!=='feed'){ if(L) L.v17feed=null; return v17RenderFeed0.apply(this,arguments); }
  const F=L.feed, st=L.v17feed, n=F.length;
  /* what is on screen is exactly the list we rendered last time, and the feed only grew at the top */
  const same=st&&st.body===body&&st.n>0&&n>=st.n&&F[n-st.n]===st.top&&body.firstElementChild===st.first&&body.childElementCount===st.count;
  if(!same){ const r=v17RenderFeed0.apply(this,arguments); L.v17feed=n?{body,n,top:F[0],first:body.firstElementChild,count:body.childElementCount}:null; return r; }
  const add=n-st.n; if(!add) return;
  body.insertAdjacentHTML('afterbegin',F.slice(0,add).map(v17FeedItem).join('')); F[0].fresh=false;
  L.v17feed={body,n,top:F[0],first:body.firstElementChild,count:body.childElementCount}; };
