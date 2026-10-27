const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = '/home/user/puzzlel-game';
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = async function(fn, opts={}) {
  await new Promise(r => srv.listen(0, r)); const PORT = srv.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:400,height:800}, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  if(opts.init) await page.addInitScript(opts.init);
  await page.goto('http://localhost:' + PORT + '/'); await sleep(1400);
  try { await fn(page, sleep, PORT); } catch(e){ console.log('ERR', e) }
  console.log('pageerrors:', errs);
  await browser.close(); srv.close();
};
