/* Playwright shim so the test scripts run anywhere.
   - Finds Playwright in the sandbox location, else `npm i playwright` in the project.
   - `chromium.launch(opts)` drops an `executablePath` that does not exist on this machine (Playwright then uses its own
     Chromium, or set PW_CHROME=/path/to/chrome).
   - DIST is the file:// URL of the standalone build. */
const fs=require('fs'), path=require('path');
let pw; try{ pw=require('/opt/npm-tools/node_modules/playwright'); }catch(e){ pw=require('playwright'); }
/* If Playwright's own Chromium revision is not installed (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD environments), use any
   chromium-N/chrome-linux[64]/chrome found under PLAYWRIGHT_BROWSERS_PATH (or ~/.cache/ms-playwright). */
function findChrome(){ const roots=[process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(process.env.HOME||'', '.cache','ms-playwright')].filter(Boolean);
  for(const root of roots){ let dirs=[]; try{ dirs=fs.readdirSync(root).filter(d=>/^chromium-\d+$/.test(d)).sort().reverse(); }catch(e){ continue; }
    for(const d of dirs){ for(const sub of ['chrome-linux64/chrome','chrome-linux/chrome']){ const f=path.join(root,d,sub); if(fs.existsSync(f)) return f; } } }
  return null; }
const chromium={ ...pw.chromium, launch(opts={}){ const o={...opts}; if(process.env.PW_CHROME) o.executablePath=process.env.PW_CHROME; else if(o.executablePath&&!fs.existsSync(o.executablePath)) delete o.executablePath;
  if(!o.executablePath){ let own=null; try{ own=pw.chromium.executablePath(); }catch(e){} if(!own||!fs.existsSync(own)){ const f=findChrome(); if(f) o.executablePath=f; } }
  return pw.chromium.launch(o); } };
const DIST='file://'+path.resolve(__dirname,'..','dist','touchline-standalone.html');
module.exports={ ...pw, chromium, DIST };
