require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); __game.S.coins = 1234; localStorage.setItem('endless-puzzle-pop-v1', JSON.stringify(__game.S)); });
  await page.click('#settingsBtn'); await sleep(300);
  await page.click('#resetBtn'); await sleep(300);
  console.log('modal', await page.evaluate(() => document.querySelector('#modal h2').textContent));
  await page.focus('#modal .mbtns .btn:first-child');
  console.log('focused', await page.evaluate(() => document.activeElement.textContent));
  await page.keyboard.press('Enter');
  await sleep(1500);
  console.log('after Enter on Cancel: coins', await page.evaluate(() => __game.S.coins), 'saved', await page.evaluate(() => !!localStorage.getItem('endless-puzzle-pop-v1')));
});
