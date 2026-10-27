require('./h.cjs')(async (page, sleep) => {
  await page.evaluate(() => { __game.closeModal(); for (const t of __game.TYPES) __game.S.seen[t] = true; });
  const lv = await page.evaluate(() => { let n = 1; while (__game.typeFor(n) !== 'tubes') n++; return n });
  await page.evaluate(n => __game.startLevel(n), lv); await sleep(2500);
  const info = await page.evaluate(() => JSON.parse(__game.cur.puz.snap()));
  console.log('tubes', JSON.stringify(info.tubes));
  // dead-end state: fill both spare tubes so no pour is possible
  const nc = info.tubes.length - 2;
  const dead = [];
  // build tubes where top colours all differ and all tubes are full except none empty -> no moves
  for (let i = 0; i < nc + 2; i++) dead.push([]);
  // 5 tubes of cap 4 with nc colours: craft generic: colours cycle so tops differ
  let c = 0; const total = nc * 4; const segs = []; for (let i=0;i<nc;i++) for(let k=0;k<4;k++) segs.push(i);
  // place round-robin into nc+2 tubes until full (cap 4) -> (nc+2)*4 > total so some partially filled; ensure tops distinct
  const t = [...Array(nc+2)].map(()=>[]); let idx=0; for (const s of segs.sort((a,b)=>((a*7)%nc)-((b*7)%nc))) {}
  console.log('nc', nc);
  const before = await page.evaluate(() => ({h: __game.S.hints, c: __game.S.coins}));
  // stuck example for 3 colours (5 tubes): [0,1,2,0],[1,2,0,1],[2,0,1,2],[ ], [ ] has moves; instead use full tubes with distinct tops and one partly filled tube whose top matches nothing and is full... use cap rule: B.length>=cap blocks pours.
  const stuck = nc===3 ? [[0,1,2,0],[1,2,0,1],[2,0,1,2],[],[]] : null;
  console.log('using real hint with no moves available? Try fill spares:');
  await page.evaluate((nc) => { const T=[];const cols=[];for(let i=0;i<nc;i++)for(let k=0;k<4;k++)cols.push(i);
     // distribute so each tube has 4 except leftover, tops all distinct and no matching tops
     const n=nc+2; for(let i=0;i<n;i++)T.push([]); let j=0; for(const c of cols){ T[j%n].push(c); j++; }
     __game.cur.puz.restore(JSON.stringify({tubes:T,moves:5})); }, nc);
  const st = await page.evaluate(() => JSON.parse(__game.cur.puz.snap()).tubes);
  console.log('state', JSON.stringify(st));
  await page.evaluate(() => { __game.S.hints = 0; __game.S.coins = 500; });
  await page.evaluate(() => document.querySelector('#hintBtn').click());
  await sleep(200);
  console.log('after hint', await page.evaluate(() => ({h: __game.S.hints, c: __game.S.coins, toast: document.querySelector('#toast').textContent, hinted: !!document.querySelector('.tube[data-h]')})));
});
