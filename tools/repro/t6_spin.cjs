require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); });
  await page.evaluate(() => document.querySelector('#tSpin').click()); await sleep(300);
  const b = await page.evaluate(() => ({c: __game.S.coins, h: __game.S.hints, s: __game.S.skips, spinAt: __game.S.spinAt}));
  await page.evaluate(() => document.querySelector('#modal .mbtns .btn:last-child').click());
  await sleep(1500);
  await page.reload(); await sleep(1500);
  const a = await page.evaluate(() => ({c: __game.S.coins, h: __game.S.hints, s: __game.S.skips, spinAt: __game.S.spinAt, spins: __game.S.stats.spins, ready: Date.now()>=__game.S.spinAt}));
  console.log('before', b, 'after reload', a);
});
