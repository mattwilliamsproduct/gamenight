const NAMES = ['Megan','Matt','Cat','Mike','Vikki','Duke','Brick','Linda','Michelle','Alexis','Ethan','Diana'];
const AVATARS = ['meg.png','dwight-wig.png','joker-cards.png','neo.png','belle.png','mario.png','frankenstein.png','jasmine.png','leia.png','toothless.png','ironman.png','barbie-beach.png'];

function profiles(names=NAMES){
  return Object.fromEntries(names.map((name,index)=>[name,{avatar:AVATARS[index%AVATARS.length],color:(index%8)+1}]));
}

function totalRounds(players,rounds){
  const totals=Object.fromEntries(players.map(player=>[player,0]));
  rounds.forEach(round=>Object.entries(round.scores||{}).forEach(([player,score])=>{totals[player]=(totals[player]||0)+score;}));
  return totals;
}

function wizardRounds(players,count){
  return Array.from({length:count},(_,roundIndex)=>{
    const round=roundIndex+1;
    const bids={},actuals={},scores={};
    players.forEach((player,index)=>{
      const bid=(index+round)%Math.min(round+1,3);
      const adjustment=(index+round)%4===0?1:((index+round)%5===0?-1:0);
      const actual=Math.max(0,Math.min(round,bid+adjustment));
      bids[player]=bid;
      actuals[player]=actual;
      scores[player]=actual===bid?20+(bid*10):(-10*Math.abs(actual-bid));
    });
    return {round,bids,actuals,scores};
  });
}

function wizardRoundsFromScores(players,scoreRows){
  return scoreRows.map((scoreRow,roundIndex)=>{
    const bids={},actuals={},scores={};
    players.forEach((player,index)=>{
      const score=Number(scoreRow[index])||0;
      if(score>=20){
        const bid=Math.max(0,Math.round((score-20)/10));
        bids[player]=bid;
        actuals[player]=bid;
      } else {
        const miss=Math.max(1,Math.round(Math.abs(score)/10));
        bids[player]=miss;
        actuals[player]=0;
      }
      scores[player]=score;
    });
    return {round:roundIndex+1,bids,actuals,scores};
  });
}

function fiveCrownsRounds(players,count){
  return Array.from({length:count},(_,roundIndex)=>{
    const round=roundIndex+1;
    const scores={};
    players.forEach((player,index)=>{
      if(index<2)scores[player]=(round+index)%4;
      else if(index<5)scores[player]=4+((round*index)%9);
      else scores[player]=11+((round+index)*3)%18;
    });
    return {round,scores};
  });
}

function makeCurrentGame(name,players,rounds,extra={}){
  return {
    name,
    originalRoster:[...players],
    currentRound:rounds.length+1,
    rounds,
    totals:totalRounds(players,rounds),
    hailMaryUsed:[],
    retired:[],
    currentScoreDrafts:{},
    dealerOffset:1,
    auditLog:[{ts:1784390400000,action:'Match Started',detail:`${name} · ${players.length} players`}],
    ...extra
  };
}

function winnersFor(game,totals){
  const values=Object.values(totals);
  const target=game==='Five Crowns'||game==='Beat the Heat'?Math.min(...values):Math.max(...values);
  return Object.keys(totals).filter(player=>totals[player]===target);
}

function historyFixture(){
  const games=['Five Crowns','Wizard','818','Flip 7 Vengeance','Beat the Heat'];
  return Array.from({length:18},(_,index)=>{
    const game=games[index%games.length];
    const roster=NAMES.slice(0,5+(index%4));
    const rounds=game==='Wizard'
      ? wizardRounds(roster,3+(index%3))
      : fiveCrownsRounds(roster,3+(index%4));
    const totals=totalRounds(roster,rounds);
    return {
      id:1784390400000-(index*86400000),
      game,
      date:`7/${18-(index%12)}/2026`,
      totals,
      winners:winnersFor(game,totals),
      rounds,
      originalRoster:roster,
      currentRound:rounds.length+1,
      hailMaryUsed:index%3===0?[roster[roster.length-1]]:[],
      retired:[]
    };
  });
}

const sharedHistory=historyFixture();
const wizardPlayers=NAMES.slice(0,10);
const wizardGame=makeCurrentGame('Wizard',wizardPlayers,wizardRounds(wizardPlayers,5),{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{}
});
const crownsPlayers=NAMES.slice(0,8);
const crownsGame=makeCurrentGame('Five Crowns',crownsPlayers,fiveCrownsRounds(crownsPlayers,7),{
  hailMaryUsed:['Linda']
});
const compactCrownsPlayers=NAMES.slice(0,4);
const compactCrownsGame=makeCurrentGame('Five Crowns',compactCrownsPlayers,fiveCrownsRounds(compactCrownsPlayers,5));
const celebrationPlayers=NAMES.slice(0,8);
const celebrationGame=makeCurrentGame('Wizard',celebrationPlayers,wizardRounds(celebrationPlayers,3),{
  wizardPhase:'scoring',
  currentBids:Object.fromEntries(celebrationPlayers.map((player,index)=>[player,index%2])),
  currentScoreDrafts:{}
});
const wizardScoringPlayers=NAMES.slice(0,8);
const wizardScoringGame=makeCurrentGame('Wizard',wizardScoringPlayers,[],{
  wizardPhase:'scoring',
  currentBids:Object.fromEntries(wizardScoringPlayers.map((player,index)=>[player,index===1?1:0])),
  currentScoreDrafts:{}
});
const wizardEarlyGame=makeCurrentGame('Wizard',wizardScoringPlayers,wizardRounds(wizardScoringPlayers,2),{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{}
});
const recordChasePlayers=NAMES.slice(0,8);
const recordChaseGame=makeCurrentGame('Wizard',recordChasePlayers,wizardRoundsFromScores(recordChasePlayers,[
  [30,20,20,40,30,20,-10,-20],
  [40,30,20,-10,-10,-10,-10,-10]
]),{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{}
});
const recordChaseHistoryPlayers=recordChasePlayers.filter(player=>player!=='Brick');
const recordChaseHistoryScores=[
  [[20,30,-10,-10,20,20,-10],[30,40,40,20,20,30,-10]],
  [[30,20,20,-10,20,-10,-10],[30,40,30,30,30,-10,-10]],
  [[20,40,20,-10,30,-10,-10],[20,40,20,-10,30,20,20]],
  [[20,20,30,-10,20,-20,20],[30,30,30,20,30,20,20]]
];
const recordChaseHistory=recordChaseHistoryScores.map((scoreRows,index)=>{
  const rounds=wizardRoundsFromScores(recordChaseHistoryPlayers,scoreRows);
  const totals=totalRounds(recordChaseHistoryPlayers,rounds);
  return {
    id:1784390400000-((index+1)*604800000),
    game:'Wizard',
    date:`7/${10-index}/2026`,
    totals,
    winners:winnersFor('Wizard',totals),
    rounds,
    originalRoster:[...recordChaseHistoryPlayers],
    currentRound:3,
    hailMaryUsed:[],
    retired:[]
  };
});

export const QA_SURFACES = [
  {id:'home',label:'Home setup'},
  {id:'scorecard',label:'Scorecard'},
  {id:'entry-bids',label:'Bid entry'},
  {id:'entry-scores',label:'Score entry'},
  {id:'actions',label:'Actions menu'},
  {id:'settings',label:'Settings'},
  {id:'profiles',label:'Profiles'},
  {id:'whammy',label:'WHAMMY'},
  {id:'nolie',label:'Nolie'}
];

export const QA_SCENARIOS = {
  'home-party':{
    label:'Busy Home Table',
    description:'Six seated players, six on deck, and full profile history.',
    defaultSurface:'home',
    data:{allPlayers:[...NAMES],players:NAMES.slice(0,6),history:sharedHistory,playerProfiles:profiles(),currentGame:null}
  },
  'wizard-10':{
    label:'Wizard · 10 Players',
    description:'A nearly full Wizard scorecard with bidding and scoring entry states.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...wizardPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardGame}
  },
  'wizard-scoring-8':{
    label:'Wizard · Scoring · 8 Players',
    description:'Eight-player Wizard immediately after bids lock, with bid pills visible and every row required to fit.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...wizardScoringPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardScoringGame}
  },
  'wizard-early-8':{
    label:'Wizard · Early Game · 8 Players',
    description:'Eight-player Wizard after two rounds, with identity and total required to remain visually adjacent.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...wizardScoringPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardEarlyGame}
  },
  'record-chase-preview':{
    label:'Record Chase · Varied Paces',
    description:'Eight-player Wizard with best-pace, usual-pace, and fresh-start stories for reviewing the compact scorecard concept.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...recordChasePlayers],history:recordChaseHistory,playerProfiles:profiles(),currentGame:recordChaseGame}
  },
  'five-crowns-preservers':{
    label:'Five Crowns · Life Preservers',
    description:'Eight players deep into the game with both available and used Life Preservers.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...crownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:crownsGame}
  },
  'five-crowns-4':{
    label:'Five Crowns · 4 Players',
    description:'A short table that should use the full scoreboard height with large names, totals, and avatars.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...compactCrownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:compactCrownsGame}
  },
  'whammy-8':{
    label:'Celebrations · 8 Players',
    description:'Crowded WHAMMY and Nolie states for modal fit checks.',
    defaultSurface:'whammy',
    data:{allPlayers:[...NAMES],players:[...celebrationPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:celebrationGame},
    celebrations:{
      whammy:{round:4,winner:'Diana',scores:celebrationPlayers.map((player,index)=>({player,score:player==='Diana'?50:(index%2?-10:0)}))},
      nolie:{type:'nolie',round:4,scores:celebrationPlayers.map((player,index)=>({player,score:20+((index%3)*10)}))}
    }
  },
  'profile-yearbook':{
    label:'Cabana Crew Yearbook',
    description:'Twelve profiles with enough history to fill filters, stats, and badges.',
    defaultSurface:'profiles',
    data:{allPlayers:[...NAMES],players:NAMES.slice(0,6),history:sharedHistory,playerProfiles:profiles(),currentGame:null}
  }
};

export function cloneScenario(id){
  const scenario=QA_SCENARIOS[id]||QA_SCENARIOS['home-party'];
  return JSON.parse(JSON.stringify(scenario));
}
