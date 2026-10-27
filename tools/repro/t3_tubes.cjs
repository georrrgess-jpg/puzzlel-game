require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; });
  const lv = await page.evaluate(() => { let n = 1; while (__game.typeFor(n) !== 'tubes') n++; return n });
  await page.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
  // make 3 legal pours using the hint's solver path via the bot-like approach: use hint pair taps
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => __game.cur.puz.hint()); await sleep(100);
    await page.evaluate(() => { const t=[...document.querySelectorAll('#board .tube')]; const a=t.find(x=>x.dataset.h==='1'), b=t.find(x=>x.dataset.h==='2'); a.click(); b.click(); });
    await sleep(200);
  }
  console.log('moves before restart', await page.evaluate(() => document.querySelector('#hudInfo .mv').textContent));
  await page.evaluate(() => __game.cur.puz.hint());     // arm the 3.2s hint timer
  await sleep(200);
  await page.evaluate(() => document.querySelector('#restartBtn').click());
  await sleep(500);
  console.log('moves right after restart', await page.evaluate(() => [document.querySelector('#hudInfo .mv').textContent, document.querySelector('#coach').textContent]));
  await sleep(3200);
  console.log('moves 3.2s after restart', await page.evaluate(() => [document.querySelector('#hudInfo .mv').textContent, document.querySelector('#coach').textContent, JSON.stringify(__game.cur.last)]));
});
