/* v18.12 Gameday Graphics: the pose library as a contact sheet (3-D figure, transparent cutouts on grey), outfield player and keeper.
   node test/plan/gameday_poses.js [out.png]  ->  test/shots/v1812/gameday/poses.png */
const { chromium, DIST } = require('../_pw'); const fs=require('fs'), path=require('path');
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'../shots/v1812/gameday/poses.png')); fs.mkdirSync(path.dirname(OUT),{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}); const page=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(DIST); await page.waitForTimeout(500);
  await page.click('[data-a="newCareerForm"][data-slot="1"]'); await page.fill('#nc-name','Pose Coach'); await page.fill('#nc-seed','gd-poses'); await page.click('[data-a="ncNext"]'); await page.waitForTimeout(200); await page.click('[data-a="createCareer"]'); await page.waitForTimeout(800);
  const url=await page.evaluate(async()=>{ const C=App.C, u=C.userSid; const fw=Object.values(C.players).find(p=>p.sid===u&&p.pos==='FWD'), gk=Object.values(C.players).find(p=>p.sid===u&&p.pos==='GK');
    const names=Object.keys(V1812G_POSES).filter(k=>k!=='bust'); const cw=330, ch=430; const cols=6; const rows=Math.ceil(names.length*2/cols); const sheet=document.createElement('canvas'); sheet.width=cols*cw; sheet.height=rows*ch; const g=sheet.getContext('2d'); g.fillStyle='#3a4250'; g.fillRect(0,0,sheet.width,sheet.height);
    let i=0; for(const who of [fw,gk]){ const star=v1812gStar(C,who.id,null); for(const n of names){ const c=v1812gCapture3D(star,n,330,{}); const col=i%cols, row=Math.floor(i/cols); const x=col*cw, y=row*ch; g.fillStyle=(col+row)%2?'#3a4250':'#434c5c'; g.fillRect(x,y,cw,ch);
        if(c){ const s=Math.min(1,(cw-10)/c.cv.width,(ch-30)/c.cv.height); const w=c.cv.width*s, h=c.cv.height*s; g.drawImage(c.cv,x+(cw-w)/2,y+(ch-h)/2+8,w,h); } g.fillStyle='#fff'; g.font='16px sans-serif'; g.fillText(n+(who===gk?' (GK)':''),x+8,y+20); i++; } }
    return sheet.toDataURL('image/png'); });
  fs.writeFileSync(OUT,Buffer.from(url.split(',')[1],'base64')); console.log('saved',OUT,errs.slice(0,3)); await b.close(); })();
