const { chromium } = require('./_pw'); const fs=require('fs');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); const p=await b.newPage({viewport:{width:1400,height:900}});
const src=fs.readFileSync('src/mascots.js','utf8')+fs.readFileSync('src/looks.js','utf8');
await p.setContent(`<body style="background:#151b24;margin:0"><div id=g style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px;padding:10px"></div><script>
const esc=s=>String(s); const App={C:null}; function hashStr(str){ let h=2166136261>>>0; str=String(str); for(let i=0;i<str.length;i++){h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; } const pname=p=>'x';
${src}
const out=[]; for(let i=0;i<60;i++){ const p={id:'p'+i*7,grade:9+(i%4),num:i+1}; out.push('<div style="background:#222b38;border-radius:8px;text-align:center">'+portraitSVG(p,100,{c1:['#c8102e','#0b3d91','#006747','#4b2e83'][i%4],c2:'#ffffff'})+'</div>'); }
document.getElementById('g').innerHTML=out.join('');</script>`);
await p.screenshot({path:'test/shots/portraits.png',fullPage:true}); await b.close(); })();
