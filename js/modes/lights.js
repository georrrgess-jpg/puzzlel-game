'use strict';
/* ---------- Lights Out ---------- */
registerMode('lights',{name:'Lights Out',icon:'💡',col:'#f5b82e',tip:'Tap a square to flip it and its neighbours. Turn every light off.'},{goal:'Turn every light off.',steps:['Tap any square.','It flips itself and the squares touching it. Lit squares go dark and dark squares light up.','Keep going until the whole board is dark. Fewer taps earn more stars. Watch the star meter!'],
    demo:()=>htStage(mini(3,idx(9),i=>`<i class="${HT_PLUS.includes(i)?'on':''} ${i===4?'tap':''}">${i===4?HT_F:''}</i>`),
      mini(3,idx(9),i=>`<i class="${HT_PLUS.includes(i)?'chg off':''}"></i>`)+'<div class="okbadge">✓</div>','Tap the middle square','It and its 4 neighbours flip. All dark!')});
MAKERS.lights=function({R,tier,board,api}){
  const n=Math.min(6,3+Math.floor(tier/4));
  const pats={
    plus:[[0,0],[1,0],[-1,0],[0,1],[0,-1]],
    x:[[0,0],[1,1],[1,-1],[-1,1],[-1,-1]],
    box:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
  };
  const avail=['plus'];if(tier>=6)avail.push('x');if(tier>=10)avail.push('box');
  const pat=tier<6?'plus':R.pick(avail),offs=pats[pat];
  const apply=(g,i)=>{for(const j of gfx.hits(i,n,offs))g[j]^=1};
  const k=Math.min(Math.ceil(n*n*.3),2+Math.floor(tier*.4));
  let sol,grid;
  do{
    const idx=shuffle([...Array(n*n).keys()],R).slice(0,k);
    sol=Array(n*n).fill(0);idx.forEach(i=>sol[i]=1);
    grid=Array(n*n).fill(0);idx.forEach(i=>apply(grid,i));
  }while(grid.every(v=>!v));
  const par=k,s3=par+3+Math.floor(par*.25),s2=par*2+6;
  let U=Array(n*n).fill(0),moves=0;
  const wrap=el('div','grid glass lo');wrap.style.gridTemplateColumns=`repeat(${n},1fr)`;wrap.style.setProperty('--n',n);
  const cells=grid.map((_,i)=>{
    const c=el('button','cell light','<u></u><i><b></b></i><em></em>');
    c.style.setProperty('--fl',(2.4+((i*7)%5)*.35)+'s');c.style.setProperty('--fo',-((i*13)%9)*.3+'s');
    c.setAttribute('aria-label',`Light, row ${(i/n|0)+1} column ${i%n+1}`);c.onclick=()=>press(i);gfx.tidy(c);wrap.appendChild(c);return c});
  const glowEl=el('i','lglow');wrap.prepend(glowEl);   // the board glow is its own element: its opacity (not a custom property on the grid) follows the number of lit bulbs
  board.appendChild(wrap);api.stagger(cells);
  const clearPv=gfx.preview(cells,i=>gfx.hits(i,n,offs),api.over);
  function render(){
    cells.forEach((c,i)=>{clearTimeout(c._lt);c.classList.toggle('on',!!grid[i]);c.setAttribute('aria-pressed',grid[i]?'true':'false')});
    glow();api.moves(moves,s3,s2)}
  function glow(){
    const lit=grid.filter(v=>v).length;
    glowEl.style.opacity=Math.min(1,.15+lit/(n*n)*1.6).toFixed(3);
    api.coach(lit?`💡 ${lit} light${lit>1?'s':''} on`:'🌙 All dark!');
    return lit}
  api.setTip(`Tap a square: it and its pattern ${patIcon(offs)} flip. Turn every light off. Hold a square to preview.`);
  function press(i){
    if(api.over())return;
    const need=sol[i]^U[i],before=grid.slice();apply(grid,i);U[i]^=1;moves++;
    const lit=glow();sfx.flip(1+(n*n-lit)/(n*n)*.7);buzz(8);
    const x0=i%n,y0=(i/n)|0;
    /* read phase first, then one write phase: a forced reflow per cell is what made big boards stutter */
    const changed=[];cells.forEach((c,j)=>{if(before[j]!==grid[j])changed.push(j)});
    const pos=changed.map(j=>centerOf(cells[j])),[cx,cy]=centerOf(cells[i]),cw=cells[i].offsetWidth;
    const acc=gfx.acc(),offN=changed.filter(j=>before[j]&&!grid[j]).length;
    changed.forEach((j,k)=>{const c=cells[j],d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0),ms=d*65;
      /* restart the squash and flash by switching to the twin keyframes (see lights.css): no forced reflow */
      if(!FL_RM){c.style.setProperty('--d',ms+'ms');again(c,'f')}
      clearTimeout(c._lt);
      const set=()=>{c.classList.toggle('on',!!grid[j]);c.setAttribute('aria-pressed',grid[j]?'true':'false');
        if(before[j]&&!grid[j]&&gfx.live(c)){if(!FL_RM)again(c,'p');burst(pos[k][0],pos[k][1],acc,offN>2?4:6,.5)}};
      ms?c._lt=setTimeout(set,ms+60):set();
    });
    ring(cx,cy,'var(--acc)',cw*2.4);
    need?api.good(cells[i]):api.meh();
    cells.forEach(c=>c.classList.remove('hint'));
    api.moves(moves,s3,s2);api.commit();
    if(!lit){
      clearPv();wrap.classList.add('dark');
      /* B2: a diagonal wave of light sweeps the board as it goes dark, then a moon bursts from the middle */
      if(!FL_RM){cells.forEach((c,j)=>{c.style.setProperty('--d',((j%n)+((j/n)|0))*50+'ms');again(c,'w')});
        setTimeout(()=>{if(!wrap.isConnected||Q.modal)return;const[mx,my]=centerOf(wrap);burst(mx,my,'#9fb4ff',14,1.1);ring(mx,my,'#9fb4ff',wrap.offsetWidth*.9,800);floatText(mx,my-wrap.offsetHeight*.12,'🌙',true)},300+n*100)}
      cells.forEach((c,j)=>{const d=Math.abs(j%n-x0)+Math.abs(((j/n)|0)-y0);
        setTimeout(()=>{if(!gfx.live(c))return;const[x,y]=centerOf(c);burst(x,y,'#ffffff',5,.45);c.classList.add('twk')},150+d*60)});
      api.win(starsFor(moves,s3,s2));
    }
  }
  render();
  return{
    snap:()=>JSON.stringify({grid,U,moves}),
    restore(s){({grid,U,moves}=JSON.parse(s));wrap.classList.remove('dark');render()},
    hint(){const rem=cells.filter((_,i)=>sol[i]^U[i]);if(rem.length)api.flash(R.pick(rem)||rem[0])}
  };
};

