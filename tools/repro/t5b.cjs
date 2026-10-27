require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; });
  const lv = await page.evaluate(() => { let n = 1; while (__game.typeFor(n) !== 'blocks') n++; return n });
  await page.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
  const k = await page.evaluate(() => { let k=0; while(__game.cur.puz._bot())k++; return k });
  console.log('bot moves', k, 'over', await page.evaluate(()=>__game.cur.over));
  await sleep(1600);
  console.log('after wait over', await page.evaluate(()=>[__game.cur.over, document.querySelector('#modal.on .ribbon')?.textContent]));
});
