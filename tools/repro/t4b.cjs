require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; });
  const lv = await page.evaluate(() => { let n = 1; while (__game.typeFor(n) !== 'blocks') n++; return n });
  await page.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
  await page.evaluate(() => { const s=JSON.parse(__game.cur.puz.snap()); const N=Math.sqrt(s.G.length);
    // checkerboard: no 2-cell piece fits, and tray of 2+ cell pieces
    s.G=s.G.map((_,i)=>((i%N)+((i/N)|0))%2?1:0); s.tray=[1,1,2]; __game.cur.puz.restore(JSON.stringify(s)); __game.S.hints=0; __game.S.coins=500; });
  await sleep(300);
  await page.evaluate(() => document.querySelector('#hintBtn').click()); await sleep(100);
  console.log(await page.evaluate(() => ({h: __game.S.hints, c: __game.S.coins, toast: document.querySelector('#toast').textContent, statsHints: __game.S.stats.hints, hinted: __game.cur.hinted})));
});
