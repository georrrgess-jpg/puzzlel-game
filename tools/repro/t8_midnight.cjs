require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; });
  await page.evaluate(() => document.querySelector('#tDaily').click()); await sleep(900);
  const d0 = await page.evaluate(() => ({type: __game.cur.type, today: today()}));
  // midnight passes while playing
  await page.evaluate(() => { const RD=Date; window.Date=class extends RD{constructor(...a){a.length?super(...a):super(RD.now()+864e5)} static now(){return RD.now()+864e5}}; });
  await page.evaluate(() => __game.api.win(3)); await sleep(1500);
  const r = await page.evaluate(() => ({today: today(), dchal: __game.S.dchal, dailyDone: dailyDone(), newType: dailyCfg().type}));
  console.log(d0, r);
  await page.evaluate(() => { __game.closeModal(); document.querySelector('#modal').classList.remove('on'); __game.show('home') });
  await page.evaluate(() => document.querySelector('#tDaily').click()); await sleep(900);
  console.log('tap daily on new day ->', await page.evaluate(() => [document.querySelector('#toast').textContent, document.querySelector('.screen.active').id]));
});
