// login claim double-tap
require('./h.cjs')(async (page, sleep) => {
  const before = await page.evaluate(() => ({on: document.querySelector('#modal').classList.contains('on'), txt: document.querySelector('#modal h2')?.textContent, coins: __game.S.coins}));
  console.log('before', before);
  await page.evaluate(() => { const b = document.querySelector('#modal .mbtns .btn:last-child'); b.click(); b.click(); });
  await sleep(900);
  console.log('after two taps', await page.evaluate(() => ({coins: __game.S.coins, hints: __game.S.hints, login: __game.S.login})));
});
