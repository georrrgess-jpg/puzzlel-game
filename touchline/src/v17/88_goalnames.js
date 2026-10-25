/* ===================== v18.8: goals are named for how they were scored (88) =====================
   A goal's box-score type (e.ty) says where it came from ('cross', 'header', ...), so a bicycle kick was listed everywhere as
   "Finish from a cross". Each goal now also carries e.sty, the finish the broadcast showed:
   - live (the stage that relabels the match's own events): 'bike' / 'scissor' (82), else 84's technique or header kind
     ('volley', 'chip', 'toe', 'outside', 'drive', 'place', 'dive', 'glance'), else '' (shown, nothing special); the
     match's shot list gets the same tag;
   - simulated or skipped goals (finishMatch): a Varsity/JV goal from a cross gets 82's own deterministic pick, so a bicycle
     kick a TouchlineTV clip would show is also named one (and 82's decision honours a stored 'bike' / 'scissor' / '').
   v188GoalName(e) is the display name (TouchlineTV top plays and its ticker, match reports, highlight cards, the shot table);
   v188GoalVerb(e, assist) words it for The Courier. Bicycle and scissor kicks also make the Newswire ('highlight' items) and
   rank higher among the week's top plays. Globals: v188g* / V188G. */
const V188G={name:{bike:'Bicycle kick',scissor:'Scissor kick',volley:'First-time volley',chip:'Chip',toe:'Toe-poke',outside:'Outside-of-the-boot finish',dive:'Diving header',glance:'Glancing header'},
  verb:{bike:'scored with a spectacular bicycle kick',scissor:'hooked home a scissor kick',volley:'volleyed home first time',chip:'chipped the keeper',toe:'toe-poked home',outside:'bent one in with the outside of the boot',dive:'scored with a diving header',glance:'glanced home a header'},
  pts:{bike:7,scissor:5,volley:2.5,chip:2.5,outside:2,dive:2,glance:1,toe:0.5}};
function v188GoalName(e){ if(!e) return ''; const s=e.sty&&V188G.name[e.sty]; return s||(typeof GOAL_TYPE_NAME!=='undefined'&&GOAL_TYPE_NAME[e.ty])||''; }
function v188GoalVerb(e,a){ const v=e&&e.sty&&V188G.verb[e.sty]; if(!v) return null; return v+(a&&e.ty==='cross'?` from ${pname(a)}'s cross`:''); }

/* the finish the stage showed for this goal (called as the goal is emitted) */
Stage.prototype.v188gShown=function(e){ const K=this._v186x; if(K&&K.struck&&K.e===e) return K.kind;
  const p=this.pl(e.pid); if(!p) return ''; const now=this.now;
  if(p.v187hk&&p.v187hr!=null&&now-p.v187hr<3000&&(p.v187hk==='dive'||p.v187hk==='glance')) return p.v187hk;
  if(p.v187t&&now-(p.v187tT||-9e9)<4000&&e.ty!=='pen'&&e.ty!=='fk'&&e.ty!=='header'&&e.ty!=='corner') return p.v187t;
  return ''; };
const _v188gEmit=Stage.prototype.emit;
Stage.prototype.emit=function(e){ try{ if(this.relabel&&!this.skip&&e&&e.t==='goal'&&e.sty==null) e.sty=this.v188gShown(e); }catch(err){} return _v188gEmit.apply(this,arguments); };
if(typeof liveEmit==='function'){ const _v188gLive=liveEmit;
  liveEmit=function(e){ const r=_v188gLive.apply(this,arguments);
    try{ const L=App.live; if(e&&e.t==='goal'&&e.sty&&L&&L.M){ const sh=(L.M.shots||[]).find(x=>x.m===e.m&&x.pid===e.pid&&x.res==='goal'); if(sh) sh.sty=e.sty; } }catch(err){}
    return r; }; }

/* 82 decides a goal's special finish again whenever a stage plays it: a stored tag wins (same finish in clips as named) */
const _v188gDecide=Stage.prototype.v186xDecide;
Stage.prototype.v186xDecide=function(e){ if(e&&e.sty!=null&&!this._v186xForce&&!V186X.force){ if(!V186X.on||this.rm||this.skip||this.demo||this.so||e.t!=='goal') return null;
    const pl=this.pl(e.pid); if(!pl||pl.off||pl.gk) return null;
    const d=_v188gDecide.call(this,Object.assign({},e,{sty:undefined}));
    if(e.sty==='bike'||e.sty==='scissor'){ if(d) return {kind:e.sty}; return this.goalTs>=V186X.minTs&&v188gEligible(e)?{kind:e.sty}:null; }
    return null; }
  return _v188gDecide.apply(this,arguments); };
/* the shape 82 needs for a special: a goal finished after a cross, the shot at least minD from the goal line */
function v188gEligible(e){ const seq=e.seq; if(!seq||seq.length<2) return false; const last=seq[seq.length-1], prev=seq[seq.length-2];
  if(last.a!=='shot'||prev.a!=='cross'||last.pid!==e.pid) return false; const X=livePos(e.s,last.x,last.y)[0], gx=e.s===0?105:0; return Math.abs(X-gx)>=V186X.minD; }

/* simulated goals: 82's pure pick, then the Newswire */
if(typeof finishMatch==='function'){ const _v188gFinish=finishMatch;
  finishMatch=function(C,M){ const f=C&&M&&C.fixtures[M.fid]; const done=f&&f.st==='d';
    try{ if(!done&&M.ev) for(const e of M.ev){ if(e.t!=='goal'||e.sty!=null||e.ty!=='cross'||!v188gEligible(e)) continue; const P=C.players[e.pid]; if(!P||P.pos==='GK') continue;
        const k=v186xPick({tech:v186xTech(P),lvl:f.lvl,ty:'cross',pid:e.pid,m:e.m,sc:e.sc,s:e.s}); if(k) e.sty=k; } }catch(err){}
    const r=_v188gFinish.apply(this,arguments);
    try{ if(!done&&f&&f.st==='d'&&(f.lvl==='V'||f.lvl==='JV')) for(const e of M.ev){ if(e.t!=='goal'||(e.sty!=='bike'&&e.sty!=='scissor')) continue; const P=C.players[e.pid]; if(!P) continue;
        const sid=e.s===0?f.h:f.a, opp=e.s===0?f.a:f.h, us=e.s===0?f.hg:f.ag, th=e.s===0?f.ag:f.hg, T=C.schools[sid].town+(f.lvl==='JV'?' JV':''), O=C.schools[opp].town;
        const res=us>th?`${us}-${th} win`:us<th?`${us}-${th} loss`:`${us}-${th} draw`, where=us<th?'to':us===th?'with':(e.s===0?'over':'at');
        addNews(C,'highlight',`${pname(P)} (${T}) scores with ${e.sty==='bike'?'a bicycle kick':'a scissor kick'} in the ${ordinal(e.m)} minute of a ${res} ${where} ${O}`,sid,{pid:P.id,fid:f.id}); } }catch(err){}
    return r; }; }

/* TouchlineTV: top plays carry the finish and a bicycle kick ranks near the top of the week */
if(typeof playScore==='function'){ const _v188gScore=playScore; playScore=function(C,f,e){ return _v188gScore.apply(this,arguments)+((e&&e.sty&&V188G.pts[e.sty])||0); }; }
if(typeof topPlays==='function'){ const _v188gTop=topPlays;
  topPlays=function(C,issue){ const out=_v188gTop.apply(this,arguments);
    try{ for(const t of out){ const lg=C.logs[t.fid]; const g=lg&&lg.ev?lg.ev.filter(x=>x.t==='goal')[t.i]:null; if(g&&g.sty) t.sty=g.sty; } }catch(err){}
    return out; }; }
