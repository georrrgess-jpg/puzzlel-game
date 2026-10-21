/* ===================== v10: KIT LAB — home / away / third kits, patterns, colorblind-aware clash check ===================== */
const KIT_PAL=['#000000','#111827','#1f2937','#374151','#6b7280','#9ca3af','#d1d5db','#e5e7eb','#f8fafc','#ffffff','#f5f0e1','#e8dcc0',
  '#4a1414','#7f1d1d','#991b1b','#b91c1c','#dc2626','#ef4444','#f87171','#fecaca',
  '#7c2d12','#9a3412','#c2410c','#ea580c','#f97316','#fb923c','#fdba74',
  '#713f12','#a16207','#ca8a04','#d4af37','#eab308','#facc15','#fde047','#fef08a',
  '#052e16','#14532d','#166534','#15803d','#16a34a','#22c55e','#4ade80','#84cc16','#bef264',
  '#064e3b','#065f46','#0f766e','#0d9488','#14b8a6','#5eead4',
  '#083344','#0e7490','#0891b2','#06b6d4','#67e8f9',
  '#0c1f4a','#172554','#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd',
  '#1e1b4b','#312e81','#4338ca','#6366f1','#3b0764','#581c87','#7e22ce','#a855f7','#c084fc',
  '#500724','#831843','#9d174d','#be185d','#db2777','#ec4899','#f9a8d4','#6b2d1f','#92400e','#b45309'];
const KIT_PATTERNS=[['plain','Plain'],['stripes','Stripes'],['pinstripe','Pinstripes'],['hoops','Hoops'],['pinhoops','Thin hoops'],['band','Chest band'],['sash','Sash'],['halves','Halves'],['quarters','Quarters'],['chevron','Chevron'],['gradient','Gradient'],['panels','Side panels'],['center','Center stripe'],['yoke','Shoulder yoke'],['checker','Checkerboard'],['split','Diagonal split'],['waves','Waves'],['star','Star burst']];
const KIT_SLEEVES=[['plain','Plain'],['cuffs','Contrast cuffs'],['raglan','Raglan'],['stripe','Sleeve stripes'],['long','Long sleeves']];
const KIT_COLLARS=[['crew','Crew'],['v','V-neck'],['polo','Polo'],['wrap','Wrap-over']];
const KIT_SOCKS=[['plain','Plain'],['hoops','Hooped'],['top','Contrast top'],['stripes','Twin stripes']];
const KIT_SHORTS=[['plain','Plain'],['stripe','Side stripe'],['panel','Side panel']];
const KIT_NUMS=[['solid','Solid'],['outline','Outlined'],['shadow','Drop shadow']];
const KIT_KEYS=[['home','Home'],['away','Away'],['third','Third']];
/* how much of the shirt the pattern colour covers: used for the clash check's "what colour does this kit read as from the stands" */
const KIT_COVER={plain:0,stripes:.5,pinstripe:.12,hoops:.5,pinhoops:.15,band:.2,sash:.22,halves:.5,quarters:.5,chevron:.25,gradient:.4,panels:.28,center:.17,yoke:.24,checker:.5,split:.5,waves:.4,star:.3};
const CLASH_OK=4;

/* ---------- colour science ---------- */
function hexLin(h){ return hexRgb(h).map(v=>{ v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); }
function linHex(c){ return rgbHex(...c.map(v=>{ v=clamp(v,0,1); return 255*(v<=0.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-0.055); })); }
function linLab(c){ const X=(0.4124*c[0]+0.3576*c[1]+0.1805*c[2])/0.95047, Y=0.2126*c[0]+0.7152*c[1]+0.0722*c[2], Z=(0.0193*c[0]+0.1192*c[1]+0.9505*c[2])/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116; const fx=f(X), fy=f(Y), fz=f(Z); return [116*fy-16, 500*(fx-fy), 200*(fy-fz)]; }
/* Machado et al. (2009) full-severity colour-vision-deficiency matrices, applied in linear RGB */
const CVD={deutan:[0.367322,0.860646,-0.227968,0.280085,0.672501,0.047413,-0.011820,0.042940,0.968881],
  protan:[0.152286,1.052583,-0.204868,0.114503,0.786281,0.099216,-0.003882,-0.048116,1.051998],
  tritan:[1.255528,-0.076749,-0.178779,-0.078411,0.930809,0.147602,0.004733,0.691367,0.303900]};
function cvdLin(c,mode){ const m=CVD[mode]; if(!m) return c; return [0,1,2].map(i=>clamp(m[i*3]*c[0]+m[i*3+1]*c[1]+m[i*3+2]*c[2],0,1)); }
function cvdHex(h,mode){ return mode&&CVD[mode]? linHex(cvdLin(hexLin(h),mode)) : h; }
function hexA(h,a){ const [r,g,b]=hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function contrastOn(c){ return lum(c)>0.36?'#111111':'#ffffff'; }

/* ---------- kit data ---------- */
function kitDefaults(s){
  const id=s.id||(s.c1+s.c2); const r=rngFrom(hashStr('kit:'+id)); const pick=a=>a[Math.floor(r()*a.length)];
  const user=typeof App!=='undefined'&&App.C&&s.id===App.C.userSid;
  const c1=s.c1||'#1d4ed8', c2=s.c2||'#ffffff'; const close=colorDist(c1,c2)<110;
  const home={shirt:c1,pc:c2,trim:c2,shorts:c2,socks:c1,num:c2,pat:user?'plain':pick(['plain','plain','plain','stripes','hoops','band','sash','panels','yoke','center','pinstripe','plain','chevron']),
    sleeve:user?'plain':pick(['plain','cuffs','plain','raglan','plain']),collar:pick(['crew','v','v','polo']),sockPat:pick(['plain','top','top','hoops']),shortsPat:pick(['plain','plain','stripe']),numStyle:'solid'};
  const awayBase=close||lum(c2)>0.82?'#f4f5f7':c2;
  const away={shirt:awayBase,pc:c1,trim:c1,shorts:awayBase===c2?c1:c1,socks:awayBase,num:c1,pat:user?'plain':pick(['plain','plain','sash','band','pinstripe','halves','panels']),
    sleeve:pick(['plain','cuffs','cuffs']),collar:home.collar,sockPat:pick(['plain','top']),shortsPat:home.shortsPat,numStyle:'solid'};
  const dark=lum(c1)>0.12? '#1b1f27' : mix(c1,'#ffffff',0.85);
  const third={shirt:dark,pc:mix(dark,c1,0.35),trim:c1,shorts:dark,socks:dark,num:c1,pat:pick(['pinstripe','pinhoops','gradient','plain','chevron']),sleeve:'cuffs',collar:'v',sockPat:'top',shortsPat:'stripe',numStyle:'outline'};
  return {home,away,third};
}
function kitSet(s){ const d=kitDefaults(s); if(!s||!s.kits) return d; const o={}; for(const [k] of KIT_KEYS) o[k]={...d[k],...(s.kits[k]||{})}; return o; }
/* fill in derived colours and make the numbers readable whatever the user picked */
function kitFinish(k){ k={...k}; if(colorDist(k.shirt,k.num)<85&&colorDist(k.pc||k.shirt,k.num)<85) k.num=contrastOn(k.shirt);
  k.dark=mix(k.shirt,'#000000',.3); k.light=mix(k.shirt,'#ffffff',.18); k.sleeveC=k.sleeve==='raglan'?k.pc:k.shirt; return k; }
function ensureKits(s){ if(!s.kits){ const d=kitDefaults(s); s.kits=JSON.parse(JSON.stringify(d)); } for(const [k] of KIT_KEYS) if(!s.kits[k]) s.kits[k]={...kitDefaults(s)[k]}; return s.kits; }

/* ---------- clash check ---------- */
function kitTone(k){ const c=KIT_COVER[k.pat]||0; const a=hexLin(k.shirt), b=hexLin(k.pc||k.shirt); return a.map((v,i)=>v*(1-c)+b[i]*c); }
function kitDE(a,b,mode){ const A=linLab(cvdLin(kitTone(a),mode)), B=linLab(cvdLin(kitTone(b),mode)); const As=linLab(cvdLin(hexLin(a.shorts),mode)), Bs=linLab(cvdLin(hexLin(b.shorts),mode));
  return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2])*0.85+Math.hypot(As[0]-Bs[0],As[1]-Bs[1],As[2]-Bs[2])*0.15; }
function clashScore(a,b,mode){ return Math.min(10,kitDE(a,b,mode)/8); }
function clashReport(a,b){ const n=clashScore(a,b), d=clashScore(a,b,'deutan'), p=clashScore(a,b,'protan'), t=clashScore(a,b,'tritan'); return {n,d,p,t,rg:Math.min(d,p),cb:Math.min(n,d,p)}; }
function cbKitsOn(){ return !(typeof App!=='undefined'&&App.C&&App.C.settings&&App.C.settings.cbKits===false); }
function clashEff(a,b){ const r=clashReport(a,b); return cbKitsOn()?r.cb:r.n; }
/* the away side picks the first of its kits that reads clearly against the home kit (its preference first) */
function kitPick(h,a){ const H=kitFinish(kitSet(h).home), S=kitSet(a);
  const pref=a.kitPref&&a.kitPref!=='auto'?a.kitPref:null; const order=pref?[pref,...['away','third','home'].filter(k=>k!==pref)]:['away','third','home'];
  const cand=order.map(key=>{ const kit=kitFinish(S[key]); return {key,kit,score:clashEff(H,kit)}; });
  if(pref&&cand[0].score>=2.6) return cand[0];
  const ok=cand.find(c=>c.score>=CLASH_OK); if(ok) return ok;
  const best=cand.reduce((x,y)=>y.score>x.score?y:x); if(best.score>=2.6) return best;
  /* nothing they own works: a plain change kit in white or charcoal */
  const mk=sh=>kitFinish({...S.away,shirt:sh,pc:sh,shorts:sh,socks:sh,pat:'plain',num:a.c1||'#1d4ed8',trim:a.c1||'#1d4ed8'});
  const w=mk('#f4f5f7'), b=mk('#16191f'); const sw=clashEff(H,w), sb=clashEff(H,b); return sw>=sb?{key:'change',kit:w,score:sw}:{key:'change',kit:b,score:sb}; }
const GK_POOL=[['#b6f23f','#1b1b1b'],['#ff6fcf','#1b1b1b'],['#ffb000','#1b1b1b'],['#22d3ee','#0b1d2a'],['#7c3aed','#ffffff'],['#f97316','#1b1b1b'],['#111827','#facc15'],['#e5e7eb','#111827']];
function kitMatchup(h,a){ const home=kitFinish(kitSet(h).home); const ap=kitPick(h,a); const away=ap.kit;
  const used=[]; const gk=[0,1].map(i=>{ const start=i===0?0:1; for(let j=0;j<GK_POOL.length;j++){ const [sh,num]=GK_POOL[(start+j*1)%GK_POOL.length]; if(used.includes(sh)) continue; const k={shirt:sh,pc:sh,trim:num,shorts:'#1b1b1b',num,socks:sh,pat:'plain',sleeve:'long',collar:'crew',sockPat:'plain',shortsPat:'plain',numStyle:'solid'};
      if(clashEff(k,home)>=3.6&&clashEff(k,away)>=3.6){ used.push(sh); return kitFinish(k); } } const [sh,num]=GK_POOL[i]; return kitFinish({shirt:sh,pc:sh,trim:num,shorts:'#1b1b1b',num,socks:sh,pat:'plain',sleeve:'long'}); });
  return {team:[home,away],gk,keys:['home',ap.key],score:clashEff(home,away),report:clashReport(home,away)}; }
function simKit(k,mode){ if(!mode) return k; const o={...k}; for(const f of ['shirt','pc','trim','shorts','socks','num','dark','light','sleeveC']) if(o[f]) o[f]=cvdHex(o[f],mode); return o; }

/* ---------- painting: the pattern is described once, in torso space (a: across, -1..1; h: hem 0 → collar 1) ---------- */
function kitPolys(pat){ const R=(a0,a1,h0,h1)=>[[a0,h0],[a1,h0],[a1,h1],[a0,h1]]; const o=[];
  switch(pat){
    case 'stripes': for(const c of [-0.8,-0.4,0,0.4,0.8]) o.push(R(c-0.1,c+0.1,-0.3,1.3)); break;
    case 'pinstripe': for(let c=-1.375;c<=1.4;c+=0.25) o.push(R(c-0.022,c+0.022,-0.3,1.3)); break;
    case 'hoops': for(const c of [0.06,0.36,0.66,0.96]) o.push(R(-1.8,1.8,c-0.08,c+0.08)); break;
    case 'pinhoops': for(let c=0.04;c<1.15;c+=0.12) o.push(R(-1.8,1.8,c-0.02,c+0.02)); break;
    case 'band': o.push(R(-1.8,1.8,0.5,0.72)); break;
    case 'sash': o.push([[-1.6,1.3],[-1.08,1.3],[1.6,-0.3],[1.08,-0.3]]); break;
    case 'halves': o.push(R(0,1.8,-0.3,1.3)); break;
    case 'quarters': o.push(R(0,1.8,0.5,1.3),R(-1.8,0,-0.3,0.5)); break;
    case 'chevron': o.push([[-1.8,1.06],[0,0.62],[1.8,1.06],[1.8,0.84],[0,0.4],[-1.8,0.84]]); break;
    case 'panels': o.push(R(-1.8,-0.68,-0.3,1.3),R(0.68,1.8,-0.3,1.3)); break;
    case 'center': o.push(R(-0.17,0.17,-0.3,1.3)); break;
    case 'yoke': o.push([[-1.8,1.3],[1.8,1.3],[1.8,0.8],[0,0.66],[-1.8,0.8]]); break;
    case 'checker': for(let i=-2;i<4;i++) for(let j=0;j<6;j++) if(((i+j)%2+2)%2===0) o.push(R(-1+i*0.5,-0.5+i*0.5,-0.05+j*0.25,0.2+j*0.25)); break;
    case 'split': o.push([[-1.8,-0.3],[1.8,-0.3],[1.8,1.3]]); break;
    case 'waves': for(const c of [0.15,0.55,0.95]){ const pts=[]; for(let i=0;i<=12;i++){ const a=-1.8+i*0.3; pts.push([a,c+Math.sin(a*3.2)*0.06]); } for(let i=12;i>=0;i--){ const a=-1.8+i*0.3; pts.push([a,c+0.14+Math.sin(a*3.2)*0.06]); } o.push(pts); } break;
    case 'star': for(let i=0;i<8;i++){ const a0=i/8*Math.PI*2, a1=a0+Math.PI/16; o.push([[0,0.55],[Math.cos(a0)*2.4,0.55+Math.sin(a0)*1.6],[Math.cos(a1)*2.4,0.55+Math.sin(a1)*1.6]]); } break;
  } return o; }
function paintKitPattern(g,kit,TP,mf){ const pat=kit.pat; if(!pat||pat==='plain') return;
  if(pat==='gradient'){ const a=TP(0,1.05), b=TP(0,-0.05); const gr=g.createLinearGradient(a[0],a[1],b[0],b[1]); gr.addColorStop(0.1,hexA(kit.pc,0)); gr.addColorStop(1,hexA(kit.pc,1)); g.fillStyle=gr; g.beginPath(); [[-1.8,-0.3],[1.8,-0.3],[1.8,1.3],[-1.8,1.3]].forEach(([x,h],i)=>{ const p=TP(x,h); i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]); }); g.fill(); return; }
  g.fillStyle=kit.pc; for(const poly of kitPolys(pat)){ g.beginPath(); poly.forEach(([a,h],i)=>{ const p=TP(a*mf,h); i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]); }); g.closePath(); g.fill(); } }

/* a flat shirt drawing for chips, cards and the editor */
let _svgId=0;
function kitSVG(kit,size=56,opts={}){ kit=kitFinish(kit); const id='ks'+(++_svgId); const X=a=>(60+a*32).toFixed(1), Y=h=>(104-h*88).toFixed(1);
  const body='M40 16 L22 22 L5 42 L18 55 L28 47 L28 106 L92 106 L92 47 L102 55 L115 42 L98 22 L80 16 Q60 31 40 16 Z';
  let pat='';
  if(kit.pat==='gradient') pat=`<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="${kit.pc}" stop-opacity="0"/><stop offset="1" stop-color="${kit.pc}"/></linearGradient><rect x="0" y="0" width="120" height="120" fill="url(#${id}g)"/>`;
  else pat=kitPolys(kit.pat).map(poly=>`<polygon points="${poly.map(([a,h])=>X(-a)+','+Y(h)).join(' ')}" fill="${kit.pc}"/>`).join('');
  const sl=kit.sleeve==='raglan'?`<path d="M40 16 L22 22 L5 42 L18 55 L28 47 L36 30 Z M80 16 L98 22 L115 42 L102 55 L92 47 L84 30 Z" fill="${kit.pc}"/>`:'';
  const cuff=kit.sleeve==='cuffs'||kit.sleeve==='long'?`<path d="M5 42 L18 55 M115 42 L102 55" stroke="${kit.trim}" stroke-width="5"/>`:kit.sleeve==='stripe'?`<path d="M14 30 L26 41 M18 26 L30 37 M106 30 L94 41 M102 26 L90 37" stroke="${kit.trim}" stroke-width="2.4"/>`:'';
  const col=kit.collar==='v'?`<path d="M40 16 L60 36 L80 16" fill="none" stroke="${kit.trim}" stroke-width="4"/>`:kit.collar==='polo'?`<path d="M40 16 L52 34 L60 26 L68 34 L80 16" fill="${kit.trim}" stroke="${kit.trim}" stroke-width="2"/><path d="M60 26 L60 44" stroke="${kit.trim}" stroke-width="2.2"/>`:kit.collar==='wrap'?`<path d="M40 16 L64 38 M80 16 L56 38" stroke="${kit.trim}" stroke-width="4"/>`:`<path d="M40 16 Q60 31 80 16" fill="none" stroke="${kit.trim}" stroke-width="5"/>`;
  const num=opts.num!=null?`<text x="60" y="${opts.back?80:62}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="${opts.back?38:13}" fill="${kit.num}" ${kit.numStyle==='outline'?`stroke="${kit.trim===kit.num?contrastOn(kit.num):kit.trim}" stroke-width="1.6" paint-order="stroke"`:''}>${esc(opts.num)}</text>`:'';
  return `<svg class="shirt-svg" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath><linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".65" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>
    <g clip-path="url(#${id})"><path d="${body}" fill="${kit.shirt}"/>${pat}${sl}${cuff}<path d="${body}" fill="url(#${id}s)"/></g>${col}${num}<path d="${body}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.6"/></svg>`; }

/* ---------- Kit Lab view ---------- */
NAV.splice(NAV.findIndex(n=>n[0]==='school')+1,0,['kits','Kit Lab']);
NAV_ICON.kits='kits'; TITLES.kits='Kit Lab';
ICON.kits='<path d="M8 3 4 5 2 10l3 1.5V21h14v-9.5L22 10l-2-5-4-2c-.6 1.6-2.1 2.6-4 2.6S8.6 4.6 8 3z"/>';
const KIT_TARGETS=[['shirt','Shirt'],['pc','Pattern'],['trim','Trim & collar'],['shorts','Shorts'],['socks','Socks'],['num','Numbers']];
function klSchool(){ const C=App.C; return (App.params.ksid&&C.settings.manager&&Sx(App.params.ksid))?Sx(App.params.ksid):Sx(C.userSid); }
function klModel(s){ const sq=squad(App.C,s.id,'V').filter(p=>p.pos!=='GK').sort((a,b)=>ovr(b)-ovr(a)); return sq[0]||null; }
function klOpp(s){ const C=App.C; const others=C.league.filter(id=>id!==s.id); let id=App.params.kopp; if(!id||!others.includes(id)){ const f=s.id===C.userSid?userFixture(C):null; id=f&&others.includes(f.h===s.id?f.a:f.h)?(f.h===s.id?f.a:f.h):others[0]; } return Sx(id); }
function klVenue(s,o){ const C=App.C; if(App.params.kven) return App.params.kven; const f=s.id===C.userSid?userFixture(C):null; if(f&&(f.h===o.id||f.a===o.id)) return f.h===s.id?'home':'away'; return 'away'; }
function scoreChip(v,label){ const ok=v>=CLASH_OK, mid=v>=2.6; return `<span class="cl-score ${ok?'ok':mid?'mid':'bad'}" title="${label||'Clash score'}">${v.toFixed(1)}</span>`; }
VIEWS.kits=()=>{ const C=App.C; const s=klSchool(); const set=kitSet(s); const key=App.params.kk||'home'; const kit=set[key]; const tgt=App.params.kt||'shirt'; const model=klModel(s);
  const opp=klOpp(s); const ven=klVenue(s,opp); const mu=ven==='home'?kitMatchup(s,opp):kitMatchup(opp,s); const mine=ven==='home'?0:1; const rep=mu.report; const myKey=mu.keys[mine];
  const card=([k,l])=>{ const kk=set[k]; const worn=k==='home'?'Every home game':k==='away'?'First choice away':'Change kit when the others clash'; return `<button class="kl-card ${k===key?'on':''}" data-a="setParam" data-k="kk" data-v="${k}" aria-pressed="${k===key}">
      <canvas class="kl-fig" data-klfig="${k}" aria-hidden="true"></canvas><b>${l}</b><span class="kl-sw">${['shirt','pc','shorts','socks'].map(f=>`<i style="background:${kk[f]}"></i>`).join('')}</span><span class="tiny muted">${worn}</span></button>`; };
  const chipRow=(field,list,cur)=>`<div class="kl-chips">${list.map(([v,l])=>`<button class="lk-chip ${cur===v?'on':''}" data-a="klSet" data-k="${field}" data-v="${v}" aria-pressed="${cur===v}">${esc(l)}</button>`).join('')}</div>`;
  const pats=`<div class="kl-pats">${KIT_PATTERNS.map(([v,l])=>`<button class="kl-pat ${kit.pat===v?'on':''}" data-a="klSet" data-k="pat" data-v="${v}" aria-pressed="${kit.pat===v}" title="${l}">${kitSVG({...kit,pat:v},46)}<span>${l}</span></button>`).join('')}</div>`;
  const cur=kit[tgt]; const pal=[...new Set([s.c1,s.c2,...KIT_PAL])];
  const palette=`<div class="kl-pal" role="radiogroup" aria-label="Color">${pal.map(c=>`<button class="kl-col ${c.toLowerCase()===String(cur).toLowerCase()?'on':''}" style="background:${c}" data-a="klColor" data-v="${c}" role="radio" aria-checked="${c===cur}" aria-label="${c}"></button>`).join('')}<label class="kl-custom" title="Custom color"><input type="color" value="${cur}" data-c="klColor" aria-label="Custom color"><span>+</span></label></div>`;
  const vis=[['','Normal vision','Most fans'],['deutan','Red-green (deuteranopia)','About 1 in 12 men'],['tritan','Blue-yellow (tritanopia)','Rare']];
  const warn=rep.n>=CLASH_OK&&rep.rg<CLASH_OK?`<span class="chip cl-warn">⚠ Too similar for about 1 in 12 fans</span>`:rep.n<CLASH_OK?`<span class="chip cl-warn">⚠ These kits clash</span>`:`<span class="chip cl-good">✓ Clear for every fan</span>`;
  const myScores=KIT_KEYS.map(([k,l])=>{ const other=mu.team[1-mine]; const sc=clashEff(kitFinish(set[k]),other); return `<div class="cl-row ${k===myKey?'on':''}">${kitSVG(set[k],34)}<span>${l}</span>${scoreChip(sc)}${k===myKey?'<b class="tiny">Worn</b>':''}</div>`; }).join('');
  const others=C.league.filter(id=>id!==s.id).map(Sx);
  const report=others.map(o=>{ const h=kitMatchup(s,o), a=kitMatchup(o,s); const name=k=>({home:'Home',away:'Away',third:'Third',change:'Change kit'})[k]||k;
    return `<div class="cl-rep"><span class="cl-team">${teamBadge(o,22)}<b>${esc(o.town)}</b></span><span class="cl-cell"><span>Home: they wear <b>${name(h.keys[1])}</b></span>${scoreChip(h.score)}</span><span class="cl-cell"><span>Away: you wear <b>${name(a.keys[1])}</b></span>${scoreChip(a.score)}</span></div>`; }).join('');
  const issues=others.filter(o=>kitMatchup(s,o).score<CLASH_OK||kitMatchup(o,s).score<CLASH_OK).length;
  return `${C.settings.manager?`<div class="row"><span class="lab">Manager Mode · editing</span><select data-c="param" data-k="ksid" aria-label="School">${opts(C.league.map(id=>[id,Sx(id).name+(isUser(id)?' (you)':'')]),s.id)}</select></div>`:''}
  <section class="kl-hero"><div><span class="eyebrow">Kit Lab · ${esc(s.name)}</span><h2>Design your kits</h2><p class="small">Three kits, ${KIT_PATTERNS.length} patterns, ${pal.length}+ colors and custom trims. The away side automatically wears whichever kit reads most clearly against the home team, checked for colorblind fans too.</p></div>
    <div class="kl-cards">${KIT_KEYS.map(card).join('')}</div></section>
  <div class="grid kl-grid" style="align-items:start"><div class="col">
    <div class="card"><div class="hd"><h3>${KIT_KEYS.find(k=>k[0]===key)[1]} kit · colors</h3><div class="row"><button class="btn sm" data-a="klRandom">🎲 Surprise me</button><button class="btn sm ghost" data-a="klReset">Reset</button></div></div>
      <div class="kl-tgts">${KIT_TARGETS.map(([k,l])=>`<button class="kl-tgt ${k===tgt?'on':''}" data-a="setParam" data-k="kt" data-v="${k}" aria-pressed="${k===tgt}"><i style="background:${kit[k]}"></i>${l}</button>`).join('')}</div>
      ${palette}
      <div class="row tiny muted" style="margin-top:8px">School colors <button class="kl-col sm" style="background:${s.c1}" data-a="klColor" data-v="${s.c1}" aria-label="Primary"></button><button class="kl-col sm" style="background:${s.c2}" data-a="klColor" data-v="${s.c2}" aria-label="Secondary"></button><span class="grow"></span>${key!=='home'?`<button class="btn sm ghost" data-a="klCopy" data-v="home">Copy design from Home</button>`:`<button class="btn sm ghost" data-a="klSwap">Swap shirt & pattern colors</button>`}</div></div>
    <div class="card"><h3>Pattern</h3>${pats}</div>
    <div class="card kl-details"><h3>Details</h3>
      <div class="kl-drow"><span class="lab">Sleeves</span>${chipRow('sleeve',KIT_SLEEVES,kit.sleeve)}</div>
      <div class="kl-drow"><span class="lab">Collar</span>${chipRow('collar',KIT_COLLARS,kit.collar)}</div>
      <div class="kl-drow"><span class="lab">Socks</span>${chipRow('sockPat',KIT_SOCKS,kit.sockPat)}</div>
      <div class="kl-drow"><span class="lab">Shorts</span>${chipRow('shortsPat',KIT_SHORTS,kit.shortsPat)}</div>
      <div class="kl-drow"><span class="lab">Numbers</span>${chipRow('numStyle',KIT_NUMS,kit.numStyle)}</div></div>
    <div class="card"><h3>Presets</h3><div class="kl-presets">${KIT_PRESETS.map(p=>`<button class="kl-preset" data-a="klPreset" data-v="${p.k}">${kitSVG(presetKit(s,kit,p),40)}<span>${esc(p.n)}</span></button>`).join('')}</div></div>
  </div><div class="col">
    <div class="card cl-card"><div class="hd"><h3>Clash check</h3>${warn}</div>
      <div class="row"><select data-c="param" data-k="kopp" aria-label="Opponent">${opts(others.map(o=>[o.id,o.name]),opp.id)}</select>${seg('kven',[['home','We are home'],['away','We are away']],ven)}</div>
      <div class="cl-panes">${vis.map(([m,l,n])=>`<figure class="cl-pane"><canvas data-klclash="${m}" aria-hidden="true"></canvas><figcaption><b>${l}</b><span>${n}</span>${scoreChip(m===''?rep.n:m==='deutan'?rep.rg:rep.t)}</figcaption></figure>`).join('')}</div>
      <div class="cl-mine"><span class="lab">Your kits against ${esc(opp.town)}'s ${ven==='home'?({home:'Home',away:'Away',third:'Third',change:'change'})[mu.keys[1]]:'Home'} kit</span>${myScores}</div>
      <div class="row" style="margin-top:10px"><button class="btn pri" data-a="klAutoFix">Auto-fix</button><span class="tiny muted grow">Scores run 0–10; 4 or more reads clearly from the stands. Auto-fix picks the clearest kit and, if none of yours work, recolors your third kit so it clears every opponent.</span></div></div>
    <div class="card"><h3>Kit settings</h3>
      <label class="toggle"><input type="checkbox" data-c="setting" data-k="cbKits" ${cbKitsOn()?'checked':''}> Colorblind-safe kits everywhere</label><p class="tiny muted" style="margin:.3em 0 .8em">Every match in the league checks kits against red-green colorblindness as well as normal vision before picking the away kit.</p>
      ${s.id===C.userSid||C.settings.manager?`<div class="field"><span class="lab">Away games: preferred kit</span>${seg('kitPref_',[['auto','Auto'],['away','Away'],['third','Third'],['home','Home']],s.kitPref||'auto','data-s="'+s.id+'"')}<span class="tiny muted">Your preference is used unless it badly clashes with the home team.</span></div>`:''}</div>
    <div class="card"><div class="hd"><h3>League clash report</h3><span class="chip ${issues?'cl-warn':'cl-good'}">${issues?issues+' to check':'All clear'}</span></div><div class="cl-reps">${report}</div></div>
  </div></div>`; };

/* presets keep this kit's own colors and change its design */
const KIT_PRESETS=[
  {k:'classic',n:'Classic',d:{pat:'plain',sleeve:'cuffs',collar:'crew',sockPat:'top',shortsPat:'plain',numStyle:'solid'}},
  {k:'retro',n:'Retro stripes',d:{pat:'stripes',sleeve:'plain',collar:'polo',sockPat:'hoops',shortsPat:'plain',numStyle:'outline'}},
  {k:'hoops',n:'Throwback hoops',d:{pat:'hoops',sleeve:'plain',collar:'crew',sockPat:'hoops',shortsPat:'plain',numStyle:'solid'}},
  {k:'sash',n:'Bold sash',d:{pat:'sash',sleeve:'cuffs',collar:'v',sockPat:'top',shortsPat:'stripe',numStyle:'solid'}},
  {k:'modern',n:'Modern fade',d:{pat:'gradient',sleeve:'raglan',collar:'v',sockPat:'top',shortsPat:'panel',numStyle:'shadow'}},
  {k:'elite',n:'Elite panels',d:{pat:'panels',sleeve:'stripe',collar:'wrap',sockPat:'stripes',shortsPat:'stripe',numStyle:'solid'}},
  {k:'chevron',n:'Chevron',d:{pat:'chevron',sleeve:'cuffs',collar:'v',sockPat:'top',shortsPat:'plain',numStyle:'solid'}},
  {k:'checker',n:'Checkmate',d:{pat:'checker',sleeve:'plain',collar:'crew',sockPat:'plain',shortsPat:'plain',numStyle:'outline'}},
  {k:'blackout',n:'Blackout',c:s=>({shirt:'#14171d',pc:'#262b35',trim:s.c1,shorts:'#14171d',socks:'#14171d',num:s.c1}),d:{pat:'pinstripe',sleeve:'cuffs',collar:'v',sockPat:'top',shortsPat:'stripe',numStyle:'outline'}},
  {k:'ice',n:'Ice white',c:s=>({shirt:'#f8fafc',pc:'#dbe3ec',trim:s.c1,shorts:'#f8fafc',socks:'#f8fafc',num:s.c1}),d:{pat:'pinhoops',sleeve:'cuffs',collar:'crew',sockPat:'top',shortsPat:'plain',numStyle:'solid'}},
  {k:'gold',n:'Championship gold',c:s=>({shirt:'#d4af37',pc:'#b8932a',trim:'#111827',shorts:'#111827',socks:'#d4af37',num:'#111827'}),d:{pat:'yoke',sleeve:'cuffs',collar:'polo',sockPat:'top',shortsPat:'plain',numStyle:'solid'}},
  {k:'split',n:'Split decision',d:{pat:'split',sleeve:'raglan',collar:'crew',sockPat:'stripes',shortsPat:'panel',numStyle:'outline'}}];
function presetKit(s,kit,p){ return {...kit,...(p.c?p.c(s):{}),...p.d}; }

/* ---------- actions ---------- */
function klEdit(fn){ const s=klSchool(); const K=ensureKits(s); const key=App.params.kk||'home'; fn(K[key],s,K); App.odds.clear(); queueSave(); App.keepScroll=true; render(); }
A.klColor=el=>klEdit(k=>{ k[App.params.kt||'shirt']=el.dataset.v; });
CH.klColor=el=>klEdit(k=>{ k[App.params.kt||'shirt']=el.value; });
A.klSet=el=>klEdit(k=>{ k[el.dataset.k]=el.dataset.v; });
A.klPreset=el=>{ const p=KIT_PRESETS.find(x=>x.k===el.dataset.v); if(!p) return; klEdit((k,s)=>Object.assign(k,p.c?p.c(s):{},p.d)); Sound.ui('success'); };
A.klReset=()=>klEdit((k,s)=>{ const d=kitDefaults(s)[App.params.kk||'home']; for(const f in k) delete k[f]; Object.assign(k,d); });
A.klCopy=el=>klEdit((k,s,K)=>{ const src=K[el.dataset.v]; for(const f of ['pat','sleeve','collar','sockPat','shortsPat','numStyle']) k[f]=src[f]; });
A.klSwap=()=>klEdit(k=>{ const t=k.shirt; k.shirt=k.pc; k.pc=t; });
A.klRandom=()=>klEdit(k=>{ const r=Math.random; const pick=a=>a[Math.floor(r()*a.length)]; const base=pick(KIT_PAL); let acc=pick(KIT_PAL); for(let i=0;i<20&&colorDist(base,acc)<140;i++) acc=pick(KIT_PAL);
  Object.assign(k,{shirt:base,pc:acc,trim:r()<.5?acc:contrastOn(base),shorts:r()<.5?base:acc,socks:r()<.6?base:acc,num:contrastOn(base),pat:pick(KIT_PATTERNS)[0],sleeve:pick(KIT_SLEEVES)[0],collar:pick(KIT_COLLARS)[0],sockPat:pick(KIT_SOCKS)[0],shortsPat:pick(KIT_SHORTS)[0],numStyle:pick(KIT_NUMS)[0]}); });
const _setParamK=A.setParam; A.setParam=el=>{ if(el.dataset.k==='kitPref_'){ const s=Sx(el.dataset.s)||klSchool(); s.kitPref=el.dataset.v; App.odds.clear(); queueSave(); App.keepScroll=true; render(); return; } _setParamK(el); };
A.klAutoFix=()=>{ const C=App.C; const s=klSchool(); const opp=klOpp(s); const ven=klVenue(s,opp); const mu=ven==='home'?kitMatchup(s,opp):kitMatchup(opp,s); const mine=ven==='home'?0:1;
  const others=C.league.filter(id=>id!==s.id).map(Sx);
  const worst=()=>Math.min(...others.map(o=>Math.min(kitMatchup(s,o).score,kitMatchup(o,s).score)));
  if(s.kitPref&&s.kitPref!=='auto'&&mu.score<CLASH_OK){ s.kitPref='auto'; }
  let msg='';
  if(worst()<CLASH_OK){ /* recolor the third kit to the palette color that clears the most opponents */
    const K=ensureKits(s); const homes=others.map(o=>kitFinish(kitSet(o).home)); const T=K.third; let best=null;
    for(const c of KIT_PAL){ const k=kitFinish({...T,shirt:c,pc:mix(c,contrastOn(c),0.18),shorts:c,socks:c,num:contrastOn(c),trim:contrastOn(c)}); const sc=Math.min(...homes.map(h=>clashEff(h,k))); if(!best||sc>best.sc) best={c,sc,k}; }
    if(best){ Object.assign(T,{shirt:best.c,pc:mix(best.c,contrastOn(best.c),0.18),shorts:best.c,socks:best.c,num:contrastOn(best.c),trim:contrastOn(best.c)}); msg=`Third kit recolored so it reads clearly against every home kit in the league (worst case ${best.sc.toFixed(1)}).`; }
  }
  const now=ven==='home'?kitMatchup(s,opp):kitMatchup(opp,s); const name=({home:'Home',away:'Away',third:'Third',change:'change'})[now.keys[mine]];
  if(!msg) msg=now.score>=CLASH_OK?`No clash. You wear your ${name} kit against ${opp.town} (score ${now.score.toFixed(1)}).`:`Switched to the ${name} kit (score ${now.score.toFixed(1)}).`;
  App.params.kk=now.keys[mine]==='change'?'third':now.keys[mine]; App.odds.clear(); queueSave(); App.keepScroll=true; render(); Sound.ui('success'); toast(msg); };

/* ---------- live figures on the page ---------- */
function klFigLoop(){ if(App.route!=='kits'){ App._klRun=false; return; } const C=App.C; const s=klSchool(); const set=kitSet(s); const model=klModel(s); const t=performance.now();
  for(const cv of document.querySelectorAll('[data-klfig]')){ const st=cv._st||(cv._st={}); if(!st.g||cv.clientWidth!==st.W){ Object.assign(st,prepCanvas(cv)); st.F=stageFake(st.W,st.H,0.44); st.fig=model?figOf(model):{x:0,y:0,look:defaultLook('kl',10),hgt:70,num:10,face:1,yaw:0,ph:0,spd:0,seed:1,kickT:-9e9,trip:-9e9,jumpT:-9e9,side:0}; st.fig.gk=false; }
    const key=cv.dataset.klfig; const on=cv.closest('.kl-card.on'); st.F.now=t; st.fig.yaw=(on?t/1600:Math.PI/2-0.35+Math.sin(t/1400+key.length)*0.5); st.fig.spd=0; st.fig.ph=0;
    spotlightBg(st.g,st.W,st.H,on?'rgba(255,211,107,.45)':undefined); st.F.drawFigure(st.g,st.fig,kitFinish(set[key]),false); }
  const opp=document.querySelector('[data-klclash]')?klOpp(s):null;
  if(opp){ const ven=klVenue(s,opp); const mu=ven==='home'?kitMatchup(s,opp):kitMatchup(opp,s); const om=klModel(opp);
    for(const cv of document.querySelectorAll('[data-klclash]')){ const st=cv._st||(cv._st={}); if(!st.g||cv.clientWidth!==st.W){ Object.assign(st,prepCanvas(cv)); st.figs=[0,1].map(i=>{ const m=i===(ven==='home'?0:1)?model:om; const f=m?figOf(m):{x:0,y:0,look:defaultLook('kc'+i,10),hgt:70,num:7+i,face:1,yaw:0,ph:0,spd:0,seed:1,kickT:-9e9,trip:-9e9,jumpT:-9e9}; f.gk=false; f.side=i; return f; }); }
      const mode=cv.dataset.klclash; const g=st.g, W=st.W, H=st.H; g.clearRect(0,0,W,H); g.fillStyle=cvdHex('#2f8a4c',mode); g.fillRect(0,0,W,H); g.fillStyle=cvdHex('#2a7c44',mode); for(let i=0;i<6;i+=2) g.fillRect(i*W/6,0,W/6,H);
      st.figs.forEach((f,i)=>{ const F=stageFake(W,H,0.3); F.proj=()=>[W*(i?0.7:0.3),H*0.92,H*0.33]; F.now=t; f.spd=5.5; f.ph=t/1000*9+i*1.7; f.yaw=i?Math.PI-0.25:0.25; F.drawFigure(g,f,simKit(mu.team[i],mode),false); }); } }
  requestAnimationFrame(klFigLoop); }
const _renderK=render; render=function(){ _renderK.apply(this,arguments); if(App.route==='kits'&&!App._klRun){ App._klRun=true; requestAnimationFrame(klFigLoop); } };
