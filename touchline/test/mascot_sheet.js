const { chromium } = require('./_pw');
const fs=require('fs');
const src=fs.readFileSync('src/mascots.js','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:1400}});
  await p.setContent(`<body style="background:#1a1f27;margin:0;font:12px sans-serif;color:#ddd"><div id=g style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:10px"></div><script>${src}
  const pairs=[['#c8102e','#f2c230'],['#0b3d91','#ffffff'],['#006747','#f5f5f5'],['#4b2e83','#e8d3a2']];
  document.getElementById('g').innerHTML=MASCOT_LIST.map(([k,n],i)=>{const [a,c]=pairs[i%4];return '<div style="text-align:center;background:#232a35;border-radius:8px;padding:6px">'+mascotSVG(k,a,c,250)+'<div>'+n+'</div>'+mascotSVG(k,'#000000','#f2a900',30)+mascotSVG(k,'#0b3d91','#f2c230',64)+mascotSVG(k,'#ff6a13','#1d1d1d',30)+'</div>'}).join('');</script></body>`);
  await p.screenshot({path:'test/shots/mascots.png',fullPage:true}); await b.close();
})();
