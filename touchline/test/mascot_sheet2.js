// Sheet of the v16 mascots (or every mascot with "all"), large plus 64 px and 30 px sizes.
const { chromium } = require('./_pw');
const fs=require('fs');
const src=fs.readFileSync('src/mascots.js','utf8')+'\n'+fs.readFileSync('src/mascots2.js','utf8');
const all=process.argv[2]==='all'; const out=process.argv[3]||'test/shots/mascots2.png';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:900}});
  await p.setContent(`<body style="background:#1a1f27;margin:0;font:12px sans-serif;color:#ddd"><div id=g style="display:grid;grid-template-columns:repeat(${all?6:4},1fr);gap:6px;padding:10px"></div><script>${src}
  const pairs=[['#c8102e','#ffffff'],['#0b3d91','#f2c230'],['#006747','#f5f5f5'],['#4b2e83','#e8d3a2'],['#ff6a13','#1d1d1d'],['#004c54','#a5acaf']];
  const keys=${all?'MASCOT_LIST':'MASCOT_LIST.slice(20)'};
  document.getElementById('g').innerHTML=keys.map(([k,n],i)=>{const [a,c]=pairs[i%pairs.length];return '<div style="text-align:center;background:#232a35;border-radius:8px;padding:6px">'+mascotSVG(k,a,c,${all?170:230})+'<div>'+n+'</div>'+mascotSVG(k,'#000000','#f2a900',30)+mascotSVG(k,'#0b3d91','#f2c230',64)+mascotSVG(k,'#7a0019','#ffcc33',64)+'</div>'}).join('');</script></body>`);
  await p.screenshot({path:out,fullPage:true}); await b.close();
})();
