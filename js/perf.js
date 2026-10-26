'use strict';
/* ====================== graphics quality tiers ======================
   high  - everything on (flagship phones, desktops)
   med   - lighter background, fewer particles, no always-on decoration in play
   low   - "battery saver": static background, minimal particles, no decorative loops
   Auto mode watches real frame times and steps DOWN when the device struggles; players can also force a tier
   in Settings. CSS reads the html.q-high / q-med / q-low class (css/perf.css); JS reads Q.* numbers. */
const Q=(()=>{
  const root=document.documentElement;
  const P={
    high:{pcap:200,pscale:1,bgScale:.55,bgFps:24,sfxVerb:true},
    med:{pcap:110,pscale:.55,bgScale:.45,bgFps:12,sfxVerb:true},
    low:{pcap:50,pscale:.28,bgScale:.35,bgFps:0,sfxVerb:false}
  };
  const ORDER=['high','med','low'];
  const q={tier:'high',modal:false,auto:true,listeners:[],
    on(fn){q.listeners.push(fn)},
    set(t){
      if(!P[t]||t===q.tier&&root.classList.contains('q-'+t))return;
      ORDER.forEach(o=>root.classList.toggle('q-'+o,o===t));
      q.tier=t;Object.assign(q,P[t]);q.listeners.forEach(f=>{try{f(t)}catch(e){}});
    },
    /* choose from the player's setting, else a hardware guess */
    apply(){
      const pref=typeof S!=='undefined'&&S.gfx;
      if(P[pref]){q.auto=false;q.set(pref);return}
      q.auto=true;
      const cores=navigator.hardwareConcurrency||6,mem=navigator.deviceMemory||4;
      q.set(mem<=2||cores<=2?'low':mem<=3||cores<=4?'med':'high');
    },
    setModal(on){if(q.modal===on)return;q.modal=on;root.classList.toggle('modal-open',on);q.listeners.forEach(f=>{try{f(q.tier)}catch(e){}})}
  };
  /* auto-downgrade: ignores the first 3 s (page load is always busy) and any frame gaps from tab switches; then
   three slow 70-frame windows in a row (average under ~33 fps) drop one tier. It never steps back up, to avoid flip-flopping. */
  let n=0,sum=0,last=0,slow=0;
  (function watch(t){
    requestAnimationFrame(watch);
    const dt=t-last;last=t;
    if(!q.auto||document.hidden||dt>250||dt<=0||t<3000){if(dt>250||t<3000)n=sum=0;return}
    sum+=dt;if(++n<70)return;
    const avg=sum/n;n=sum=0;
    if(avg>30){if(++slow>=3){slow=0;const i=ORDER.indexOf(q.tier);if(i<ORDER.length-1)q.set(ORDER[i+1])}}else slow=0;
  })(performance.now());
  return q;
})();
Q.apply();
