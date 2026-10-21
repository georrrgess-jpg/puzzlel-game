/* ===================== v10.2: MATCH SOUND MIXER — choose exactly which sounds play during a match ===================== */
const SFX_GROUPS=[
  ['ball','Ball strikes & touches','Kicks, first touches, headers, bounces',['kick','touch','trap','bounce'],'⚽'],
  ['steps','Footsteps','Studs on the turf around the ball',['step'],'👟'],
  ['net','Net','The ball rippling the net',['net'],'🥅'],
  ['post','Woodwork','The clang off the post or crossbar',['post'],'🔔'],
  ['keeper','Goalkeeper','Glove saves and dives',['glove','dive'],'🧤'],
  ['tackles','Tackles & slides','Challenges and slide tackles',['tackle','slide'],'🦵'],
  ['crowd','Crowd atmosphere','The crowd bed that swells with every attack',['shout'],'🏟️'],
  ['reactions','Crowd reactions','Oohs, groans, boos and applause',['ooh','boo','applause'],'😮'],
  ['goal','Goal roar & horn','The eruption, goal horn and sting',['horn','sting'],'📣'],
  ['chants','Chants','Clap-along chants after goals',['chant'],'👏'],
  ['whistle','Referee whistle','Kickoff, fouls, cards, half and full time',['whistle'],'🟨'],
  ['voice','Stadium announcer','Starting lineup calls on the PA',[],'🎙️'],
  ['introfx','Lineup intro music & hits','The drum bed, PA chime and impacts during lineup intros',[],'🥁'],
  ['jingle','Result jingle & fanfares','The final-whistle sting and trophy fanfares',['result','fanfare'],'🎺']];
const MIX_PRESETS=[
  ['full','Full stadium','Everything on',g=>true],
  ['tv','TV broadcast','No footsteps or chants',g=>!['steps','chants'].includes(g)],
  ['pitch','Pitchside','Only what happens on the field',g=>['ball','steps','net','post','keeper','tackles','whistle'].includes(g)],
  ['crowd','In the stands','Crowd and big moments only',g=>['crowd','reactions','goal','chants','whistle','voice','introfx','jingle'].includes(g)],
  ['quiet','Essentials','Whistle, goals and the ball',g=>['ball','net','goal','whistle'].includes(g)]];
function fxOn(k){ const fx=PREFS.sound.fx; return !fx||fx[k]!==false; }
(function(){ const S=Sound;
  for(const [k,,,fns] of SFX_GROUPS) for(const fn of fns){ const orig=S[fn]; if(typeof orig!=='function') continue; S[fn]=function(){ if(!fxOn(k)) return; return orig.apply(this,arguments); }; }
  /* the goal roar is one call that also fires applause and chants: keep those when only the roar is switched off */
  const goal0=S.goal; S.goal=function(){ if(fxOn('goal')) return goal0.apply(this,arguments); if(!this.ensure()) return; this.applause(0.9,4); this.chant(this.now()+1.6); };
  const cs0=S.crowdStart; S.crowdStart=function(){ if(!fxOn('crowd')) return; return cs0.apply(this,arguments); };
  const ex0=S.crowdExcite; S.crowdExcite=function(){ if(!fxOn('crowd')) return; return ex0.apply(this,arguments); };
})();
if(typeof PA!=='undefined'){ const ok0=PA.ok; PA.ok=function(){ return fxOn('voice')&&ok0.call(this); }; }

function mixerHTML(where){ const so=PREFS.sound; const on=so.on; const cur=MIX_PRESETS.find(([,,,f])=>SFX_GROUPS.every(([k])=>fxOn(k)===f(k)));
  const vol=(k,l,m)=>`<div class="mx-vol"><label for="mx-${where}-${k}">${l}</label><input type="range" id="mx-${where}-${k}" min="0" max="1" step="0.05" value="${so[k]??0.6}" data-c="vol" data-k="${k}" ${on&&!so[m]?'':'disabled'}><button class="mx-mute ${so[m]?'on':''}" data-a="mixMute" data-k="${m}" aria-pressed="${!!so[m]}" title="${so[m]?'Unmute':'Mute'}">${so[m]?'🔇':'🔊'}</button></div>`;
  return `<div class="mx ${on?'':'off'}">
    <div class="mx-master"><div><b>Match sound</b><span>${on?'On':'Everything is muted'}</span></div><button class="mx-sw ${on?'on':''}" data-a="mixMaster" role="switch" aria-checked="${on}" aria-label="Sound on or off"><i></i></button></div>
    <div class="mx-presets" role="group" aria-label="Sound presets">${MIX_PRESETS.map(([k,n,d])=>`<button class="mx-pre ${cur&&cur[0]===k?'on':''}" data-a="mixPreset" data-k="${k}" title="${esc(d)}" aria-pressed="${!!(cur&&cur[0]===k)}">${esc(n)}</button>`).join('')}</div>
    <div class="mx-list">${SFX_GROUPS.map(([k,n,d,,ic])=>{ const v=fxOn(k); return `<button class="mx-row ${v?'on':''}" data-a="mixToggle" data-k="${k}" role="switch" aria-checked="${v}" ${on?'':'disabled'}><span class="mx-ic" aria-hidden="true">${ic}</span><span class="mx-t"><b>${esc(n)}</b><small>${esc(d)}</small></span><span class="mx-sw ${v?'on':''}" aria-hidden="true"><i></i></span></button>`; }).join('')}</div>
    <details class="mx-vols" ${where==='set'?'open':''}><summary>Volume levels</summary>${vol('sfx','On-field effects','mSfx')}${vol('crowd','Crowd','mCrowd')}${vol('goal','Goals, chants & fanfares','mGoal')}${vol('whistle','Whistle','mWhistle')}${vol('voice','Announcer','mVoice')}${vol('music','Menu music','mMusic')}${vol('ui','Menu clicks','mUi')}</details></div>`; }
function mixRefresh(){ for(const el of document.querySelectorAll('[data-mixer]')){ const open=el.querySelector('details.mx-vols')?.open; el.innerHTML=mixerHTML(el.dataset.mixer); const d=el.querySelector('details.mx-vols'); if(d&&open!=null) d.open=open; } document.querySelectorAll('.sndbtn').forEach(b=>{ const big=b.classList.contains('big'); b.outerHTML=soundBtn(big); }); }
function mixApply(){ savePrefs(); Sound.vols&&Sound.vols(); const L=App.live; if(L&&!L.paused&&PREFS.sound.on){ if(fxOn('crowd')) Sound.crowdStart(); else Sound.crowdStop(); } else if(!fxOn('crowd')) Sound.crowdStop(); if(!fxOn('voice')&&typeof PA!=='undefined') PA.stop(); mixRefresh(); }
const MIX_SAMPLE={ball:()=>Sound.kick('shot',0.75),steps:()=>{ Sound.step(0.9); setTimeout(()=>Sound.step(0.9),180); },net:()=>Sound.net(0.9),post:()=>Sound.post(0.7),keeper:()=>Sound.glove(),tackles:()=>Sound.tackle(),crowd:()=>{},reactions:()=>Sound.ooh(0.8),goal:()=>Sound.horn(),chants:()=>Sound.chant(),whistle:()=>Sound.whistle(),voice:()=>{ if(typeof PA!=='undefined') PA.say('Testing, one, two.'); },introfx:()=>{ if(typeof CIN!=='undefined'){ CIN.chime(); setTimeout(()=>CIN.boom(1),900); } },jingle:()=>Sound.result('win')};
A.mixToggle=el=>{ const k=el.dataset.k; const fx=PREFS.sound.fx||(PREFS.sound.fx={}); fx[k]=!fxOn(k); mixApply(); if(fx[k]&&PREFS.sound.on){ Sound.gestured=true; Sound.ensure(); try{ MIX_SAMPLE[k]&&MIX_SAMPLE[k](); }catch(e){} } };
A.mixPreset=el=>{ const p=MIX_PRESETS.find(x=>x[0]===el.dataset.k); if(!p) return; const fx=PREFS.sound.fx||(PREFS.sound.fx={}); for(const [k] of SFX_GROUPS) fx[k]=!!p[3](k); if(!PREFS.sound.on) setSound(true); mixApply(); toast(`Sound preset: ${p[1]}`); };
A.mixMaster=()=>{ setSound(!PREFS.sound.on); mixRefresh(); };
A.mixMute=el=>{ const k=el.dataset.k; PREFS.sound[k]=!PREFS.sound[k]; mixApply(); };
/* the pop-over on the live broadcast */
A.mixOpen=()=>{ let p=$('#mix-pop'); if(p){ A.mixClose(); return; } document.body.insertAdjacentHTML('beforeend',`<div id="mix-pop" role="dialog" aria-label="Match sounds"><div class="mx-head"><b>Match sounds</b><button class="mx-x" data-a="mixClose" aria-label="Close">✕</button></div><div data-mixer="pop"></div></div>`); mixRefresh(); const b=document.querySelector('[data-a="mixOpen"]'); if(b) b.setAttribute('aria-expanded','true'); };
A.mixClose=()=>{ const p=$('#mix-pop'); if(p) p.remove(); const b=document.querySelector('[data-a="mixOpen"]'); if(b) b.setAttribute('aria-expanded','false'); };
document.addEventListener('pointerdown',e=>{ const p=$('#mix-pop'); if(p&&!p.contains(e.target)&&!e.target.closest('[data-a="mixOpen"]')) A.mixClose(); },true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('#mix-pop')){ e.preventDefault(); e.stopPropagation(); A.mixClose(); } },true);
function mixBtn(){ return `<button class="btn sm ghost mixbtn" data-a="mixOpen" aria-haspopup="dialog" aria-expanded="false" title="Choose which sounds play">🎚️ Sounds</button>`; }
/* add the mixer button beside the sound toggle on the live control bar, and close it when the match screen goes away */
const _updateLiveMix=updateLive; updateLive=function(scoreOnly){ _updateLiveMix.apply(this,arguments); if(scoreOnly) return; const s=document.querySelector('#lv-ctrl .sndbtn'); if(s&&!document.querySelector('#lv-ctrl .mixbtn')) s.insertAdjacentHTML('afterend',mixBtn()); };
const _closeLiveMix=closeLiveAndContinue; closeLiveAndContinue=async function(){ A.mixClose(); return _closeLiveMix.apply(this,arguments); };
/* and the same controls in Settings */
const _settingsMix=VIEWS.settings; VIEWS.settings=()=>{ const h=_settingsMix(); const card=`<div class="card"><h3>Match sounds</h3><p class="small muted" style="margin-top:0">Pick exactly what you hear during live matches. Turning a sound on plays a quick sample. You can also change these mid-game with the 🎚️ Sounds button on the broadcast.</p><div data-mixer="set">${mixerHTML('set')}</div></div>`;
  const i=h.indexOf('<div class="card"><h3>About</h3>'); return i>0?h.slice(0,i)+card+h.slice(i):h+card; };
