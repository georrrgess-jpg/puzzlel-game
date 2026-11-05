// Renders the soundtrack and the sound effects offline (no speakers needed) and measures them, so the mix can be
// checked by numbers: notation errors, peak and loudness per song and per instrument, where the energy sits in the
// spectrum, and how loud each sound effect is next to the others. Writes WAV + MP3 previews to music-out/.
// Usage: NODE_PATH=$(npm root -g) node tools/music-render.cjs [seconds=100] [song ...] [--sfx] [--parts] [--no-mp3]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'music-out');
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end() } else { r.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream' }); r.end(d) } }) });
const args = process.argv.slice(2), secs = +(args.find(a => /^\d+$/.test(a)) || 100);
const songs = args.filter(a => !/^\d/.test(a) && !a.startsWith('--')), doSfx = args.includes('--sfx'), doParts = args.includes('--parts'), mp3 = !args.includes('--no-mp3');
const db = x => x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf';
function wav(file, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(44100, 24); b.writeUInt32LE(44100 * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4) }
  fs.writeFileSync(file, b);
}
/* the numbers for one stereo render: peak, loudness (RMS), the loudest 3 s, and the share of energy per band */
function measure(L, R) {
  let pk = 0, ss = 0; const n = L.length;
  for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > pk) pk = a; if (b > pk) pk = b; ss += L[i] * L[i] + R[i] * R[i] }
  const W = 44100 * 3; let st = 0; for (let s = 0; s + W <= n; s += 44100) { let q = 0; for (let i = s; i < s + W; i++)q += L[i] * L[i] + R[i] * R[i]; st = Math.max(st, Math.sqrt(q / (2 * W))) }
  // band energies from one-pole filters (rough, but enough to see a boomy or harsh mix)
  const cuts = [120, 400, 1500, 5000], e = [0, 0, 0, 0, 0], lp = cuts.map(() => 0), k = cuts.map(f => 1 - Math.exp(-2 * Math.PI * f / 44100));
  for (let i = 0; i < n; i += 2) { const x = (L[i] + R[i]) / 2; let prev = 0; for (let j = 0; j < cuts.length; j++) { lp[j] += (x - lp[j]) * k[j]; e[j] += (lp[j] - prev) ** 2; prev = lp[j] } e[4] += (x - prev) ** 2 }
  const tot = e.reduce((a, b) => a + b, 0) || 1;
  return { peak: pk, rms: Math.sqrt(ss / (2 * n)), st, bands: e.map(x => Math.round(100 * x / tot)) };
}
(async () => {
  await new Promise(r => srv.listen(0, r)); fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(), p = await browser.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + srv.address().port + '/'); await new Promise(r => setTimeout(r, 800));
  const ids = songs.length ? songs : await p.evaluate(() => Object.keys(SONGS));
  const warn = await p.evaluate(ids => { for (const id of ids) compileSong(SONGS[id]); return MUS_WARN.slice() }, ids);
  const clash = await p.evaluate(ids => ids.flatMap(id => melodyClashes(SONGS[id])), ids);
  console.log(clash.length ? 'MELODY NOTES THAT RUB AGAINST THEIR CHORD:\n  ' + clash.join('\n  ') : 'harmony: no held melody note sits a semitone above a chord tone');
  console.log(warn.length ? 'NOTATION PROBLEMS:\n  ' + warn.join('\n  ') : 'notation: every bar adds up, every chord and melody exists');
  const get = async (id, sec, opt) => {
    const b64 = await p.evaluate(async ([id, sec, opt]) => { const [L, R] = await renderSong(id, sec, opt); const n = L.length, u = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) { u[2 * i] = Math.max(-32767, Math.min(32767, L[i] * 32767)); u[2 * i + 1] = Math.max(-32767, Math.min(32767, R[i] * 32767)) }
      let s = ''; const by = new Uint8Array(u.buffer); for (let i = 0; i < by.length; i += 32768) s += String.fromCharCode.apply(null, by.subarray(i, i + 32768)); return btoa(s) }, [id, sec, opt]);
    const buf = Buffer.from(b64, 'base64'), n = buf.length / 4, L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) { L[i] = buf.readInt16LE(i * 4) / 32767; R[i] = buf.readInt16LE(i * 4 + 2) / 32767 }
    return [L, R];
  };
  console.log('\nsong      title            peak dBFS  RMS dBFS  loudest 3s  bands <120/120-400/400-1.5k/1.5-5k/>5k %');
  for (const id of ids) {
    const title = await p.evaluate(id => SONGS[id].title, id), [L, R] = await get(id, secs, {}), m = measure(L, R);
    console.log(`${id.padEnd(9)} ${title.padEnd(16)} ${db(m.peak).padStart(8)} ${db(m.rms).padStart(9)} ${db(m.st).padStart(10)}   ${m.bands.join(' / ')}`);
    const f = path.join(OUT, id + '.wav'); wav(f, L, R);
    if (mp3) try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-codec:a', 'libmp3lame', '-q:a', '3', path.join(OUT, id + '.mp3')]) } catch (e) { console.log('  (mp3 failed: ' + e.message + ')') }
    if (doParts) {
      const parts = ['keys', 'pad', 'bass', 'arp', 'lead', 'lead2', 'dbl', 'drums', 'perc', 'fx'];
      const row = [];
      for (const part of parts) { const [a, b] = await get(id, 40, { solo: [part], from: await p.evaluate(id => SONGS[id].order.find(s => /B/.test(s)) || SONGS[id].order[1], id) }); const q = measure(a, b); if (q.rms > 1e-5) row.push(`${part} ${db(q.rms)}/${db(q.peak)}`) }
      console.log('   parts (RMS/peak dBFS): ' + row.join('  '));
    }
  }
  if (doSfx) {
    const res = await p.evaluate(async () => {
      const names = Object.keys(sfx), out = []; const saved = { ...AU }; S.sfx = true;
      const argsFor = { star: [2], combo: [5], pop: [1], tick: [1], pad: [3], bloom: [2], pluck: [4], lineBloom: [2, 1], grow: [3], clear: [2], sand: [2] };
      for (const nm of names) {
        if (typeof sfx[nm] !== 'function') continue;
        const c = new OfflineAudioContext(2, 44100 * 3, 44100); AU.ctx = c; AU.master = c.createGain(); AU.master.connect(c.destination); AU.sfx = c.createGain(); AU.sfx.connect(AU.master);
        AU.verb = c.createConvolver(); AU.verb.buffer = impulse(c, 1.8, 3); const vg = c.createGain(); vg.gain.value = .3; AU.verb.connect(vg); vg.connect(AU.master);
        AU.musVol = c.createGain(); AU.musIn = AU.musVol;
        if (!AU.noise) { const nb = c.createBuffer(1, 44100, 44100), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++)nd[i] = Math.random() * 2 - 1; AU.noise = nb }
        try { sfx[nm](...(argsFor[nm] || [])) } catch (e) { out.push([nm, 'ERROR ' + e.message]); continue }
        const b = await c.startRendering(), L = b.getChannelData(0), R = b.getChannelData(1); let pk = 0, ss = 0, n = 0, last = 0;
        for (let i = 0; i < L.length; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) pk = a; if (a > 1e-3) last = i }
        for (let i = 0; i <= last; i++) { ss += L[i] * L[i] + R[i] * R[i]; n += 2 }
        out.push([nm, pk, Math.sqrt(ss / Math.max(1, n)), last / 44100]);
      }
      Object.assign(AU, saved); return out;
    });
    console.log('\nsound effect   peak dBFS  RMS dBFS  length s');
    for (const [nm, pk, rms, len] of res) console.log(typeof pk === 'string' ? `${nm.padEnd(13)} ${pk}` : `${nm.padEnd(13)} ${db(pk).padStart(9)} ${db(rms).padStart(9)} ${len.toFixed(2).padStart(9)}`);
  }
  if (errs.length) console.log('PAGE ERRORS: ' + errs.join(' | '));
  await browser.close(); srv.close();
})();
