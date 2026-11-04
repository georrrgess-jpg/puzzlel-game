// Preview sheet for jigsaw subjects: every registered subject drawn by day and at night on a plain backdrop.
// Usage: NODE_PATH=$(npm root -g) node tools/jig-subjects.cjs out.png js/jig/subjects-a.js [more files...] [--only=id1,id2]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const out = process.argv[2];
const files = process.argv.slice(3).filter(a => !a.startsWith('--'));
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  const scripts = ['js/jig/art.js', ...files].map(f => `<script>${fs.readFileSync(path.resolve(ROOT, f), 'utf8')}</script>`).join('');
  await p.setContent(`<!doctype html><html><body style="margin:0;background:#222;font:12px sans-serif;color:#fff">${scripts}<div id="g" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px"></div>
  <script>
  const {h,TIMES,subjects}=JIGART,only=${JSON.stringify(only)};
  for(const s of subjects){ if(only.length&&!only.includes(s.id))continue;
    for(const t of ['day','night']){const T=TIMES[t],R=(()=>{let a=7;return()=>{a=(a*16807)%2147483647;return a/2147483647}})();
      const o={R,id:s.id+t+'_',c:c=>h.mix(c,T.amb,T.amt),night:T.lit,t};
      const base=s.place==='sky'?110:s.place==='water'?125:s.place==='under'||s.place==='space'?140:140;
      const bg=s.place==='under'?'#1a6a9a':s.place==='space'?'#0a0a2a':t==='day'?'#8fd0ff':'#0f1a48';
      const ground=s.place==='water'?'<rect y="125" width="200" height="35" fill="'+(t==='day'?'#2a8ad0':'#1a2a5a')+'"/>':s.place==='ground'?'<rect y="140" width="200" height="20" fill="'+o.c('#5aa84a')+'"/>':'';
      let body;try{body=s.draw(o)}catch(e){body='';document.title+=' ERR '+s.id+': '+e.message}
      const d=document.createElement('div');d.style.cssText='text-align:center';
      d.innerHTML='<svg width="200" height="160" viewBox="0 0 200 160" style="display:block;border-radius:6px"><rect width="200" height="160" fill="'+bg+'"/>'+ground+'<g transform="translate(100 '+base+') scale(1.2)">'+body+'</g></svg>'+s.id+' ('+s.place+')';
      document.getElementById('g').appendChild(d)}}
  </script></body></html>`);
  await p.waitForTimeout(300);
  const t = await p.title(); if (t) errs.push(t);
  const h = await p.evaluate(() => document.body.scrollHeight); await p.setViewportSize({ width: 1300, height: Math.min(h, 16000) });
  await p.screenshot({ path: out, fullPage: true });
  console.log('subjects:', await p.evaluate(o => JIGART.subjects.filter(s => !o.length || o.includes(s.id)).length, only), errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
  await b.close();
})();
