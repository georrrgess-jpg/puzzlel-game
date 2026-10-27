require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; __game.S.coins=500; __game.S.skips=0;});
  const lv = await page.evaluate(() => { let n = 1; while (__game.typeFor(n) !== 'blocks') n++; return n });
  await page.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
  // run the bot until the level is finished (internal finished flag); stop when api.over or after bot places the winning piece
  const r = await page.evaluate(async () => { for (let k=0;k<200;k++){ const s=JSON.parse(__game.cur.puz.snap()); if(!__game.cur.puz._bot())return 'botstuck'; await new Promise(r=>setTimeout(r,0));
      // finished is internal; detect by a hint toast check: try placing again returns false when finished
      if(__game.cur.puz._bot()===false) return 'finished-after '+k; } return 'loop'; });
  console.log(r, await page.evaluate(() => ({over: __game.cur.over, unlocked: __game.S.unlocked, coins: __game.S.coins})));
  await page.evaluate(() => { document.querySelector('#hintBtn').click(); });
  await page.evaluate(() => { document.querySelector('#skipBtn').click(); });
  await sleep(100);
  console.log('modal', await page.evaluate(() => document.querySelector('#modal.on h2')?.textContent));
  await page.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click());
  await sleep(2000);
  console.log(await page.evaluate((lv) => ({level: __game.cur.level, stars: __game.S.stars[lv], coins: __game.S.coins, wins: __game.S.stats.wins, hints: __game.S.hints}), lv));
});
