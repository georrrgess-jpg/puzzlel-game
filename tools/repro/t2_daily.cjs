require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; const S=__game.S; S.login.last=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5); S.dchal={last:S.login.last-1,streak:5,tday:-1}; });
  const r = [];
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => document.querySelector('#tDaily').click());
    await sleep(900);   // the iris transition delays the level start by ~300 ms
    // win directly through api
    await page.evaluate(() => __game.api.win(3));
    r.push(await page.evaluate(() => ({coins: __game.S.coins, dchal: {...__game.S.dchal}, daily: __game.S.stats.daily})));
    await sleep(200);
    // press Restart before the win card (1s) appears
    await page.evaluate(() => document.querySelector('#restartBtn').click());
    await sleep(300);
    r.push(await page.evaluate(() => ({cur: __game.cur && __game.cur.daily, screen: document.querySelector('.screen.active').id})));
    // now win again on the restarted daily
    await page.evaluate(() => __game.api.win(3));
    r.push(await page.evaluate(() => ({coins: __game.S.coins, dchal: {...__game.S.dchal}, daily: __game.S.stats.daily})));
    await sleep(1500);
    await page.evaluate(() => { __game.closeModal(); __game.show('home') });
    break;
  }
  console.log(JSON.stringify(r, null, 1));
});
