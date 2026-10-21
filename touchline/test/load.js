// Loads data.js + engine.js into one VM context so tests run against the exact shipped code.
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=['data.js','mascots.js','engine.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8').replace(/if \(typeof module[^\n]*\n?/g,'')).join('\n');
const ctx={console,Math,JSON,Object,Array,Set,Map,String,Number,Date};
vm.createContext(ctx);
vm.runInContext(src+'\n;this.E={CELEBS,CELEB_BY,celebFor,celebProgress,celebUnlocked,setCeleb,isSeniorNight,seniorNightFixture,seniorsOf,seniorNightRecord,courierIssues,topPlays,playerOfWeek,moneyline2,newCareer,startMatch,stepMatch,finishMatch,runToEnd,resumeSecondHalf,simRound,advance,roundFixtures,userFixture,roundDone,standings,simProbs,american,promote,rollover,ovr,squad,getLu,validateLineup,autoLineup,bestFormation,setLineup,finalizeAwards,leaders,seasonRecords,careerRecords,matchWinnerIdx,SPEECHES,STRATS,FORMS,ROLE_GROUP,eff,migrate,evaluate,briefing,milestones,teamSeasonRecords,xiRating,effStadium,repairLineup,squad,careerTotals,hashStr,LVLS,celebHave};',ctx);
module.exports=ctx.E;
