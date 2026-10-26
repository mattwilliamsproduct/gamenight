import {legalEight18Rounds, wizardScore} from './fixture-rules.mjs';

const NAMES = ['Megan','Matt','Cat','Mike','Vikki','Duke','Brick','Linda','Michelle','Alexis','Ethan','Diana'];
const AVATARS = ['meg.png','dwight-wig.png','joker-cards.png','neo.png','belle.png','mario.png','frankenstein.png','jasmine.png','leia.png','toothless.png','ironman.png','barbie-beach.png'];

function profiles(names=NAMES){
  return Object.fromEntries(names.map((name,index)=>[name,{avatar:AVATARS[index%AVATARS.length],color:(index%8)+1}]));
}

function totalRounds(players,rounds){
  const totals=Object.fromEntries(players.map(player=>[player,0]));
  rounds.forEach(round=>{
    Object.entries(round.scores||{}).forEach(([player,score])=>{totals[player]=(totals[player]||0)+score;});
    Object.entries(round.comeback||{}).forEach(([player,extra])=>{totals[player]=(totals[player]||0)+Number(extra||0);});
  });
  return totals;
}

function balanceActuals(players,actuals,tricks){
  let sum=players.reduce((total,player)=>total+(actuals[player]||0),0);
  let guard=0;
  while(sum>tricks && guard<400){
    const player=players[guard%players.length];
    if(actuals[player]>0){actuals[player]-=1;sum-=1;}
    guard+=1;
  }
  guard=0;
  while(sum<tricks && guard<400){
    const player=players[guard%players.length];
    if(actuals[player]<tricks){actuals[player]+=1;sum+=1;}
    guard+=1;
  }
}

function wizardRounds(players,count){
  return Array.from({length:count},(_,roundIndex)=>{
    const round=roundIndex+1;
    const bids={},actuals={};
    players.forEach((player,index)=>{
      const bid=(index+round)%Math.min(round+1,3);
      const adjustment=(index+round)%4===0?1:((index+round)%5===0?-1:0);
      bids[player]=bid;
      actuals[player]=Math.max(0,Math.min(round,bid+adjustment));
    });
    balanceActuals(players,actuals,round);
    const scores=Object.fromEntries(players.map(player=>[player,wizardScore(bids[player],actuals[player])]));
    return {round,bids,actuals,scores};
  });
}

function wizardRoundsFromScores(players,scoreRows){
  return scoreRows.map((scoreRow,roundIndex)=>{
    const bids={},actuals={};
    const tricks=roundIndex+1;
    players.forEach((player,index)=>{
      const score=Number(scoreRow[index])||0;
      if(score>=20){
        const bid=Math.max(0,Math.min(tricks,Math.round((score-20)/10)));
        bids[player]=bid;
        actuals[player]=bid;
      } else {
        const miss=Math.max(0,Math.min(tricks,Math.max(1,Math.round(Math.abs(score)/10))));
        bids[player]=miss;
        actuals[player]=0;
      }
    });
    balanceActuals(players,actuals,tricks);
    const scores=Object.fromEntries(players.map(player=>[player,wizardScore(bids[player],actuals[player])]));
    return {round:tricks,bids,actuals,scores};
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
    const count=3+(index%3);
    const rounds=game==='Wizard'
      ? wizardRounds(roster,count)
      : game==='818'
        ? legalEight18Rounds(roster,Object.fromEntries(roster.map((player,playerIndex)=>[player,30+playerIndex*8])),count)
        : game==='Beat the Heat'
          ? fiveCrownsRounds(roster,Math.min(3,count)).map(round=>({...round,scores:Object.fromEntries(Object.entries(round.scores).map(([player,score])=>[player,Math.min(12,score)]))}))
          : fiveCrownsRounds(roster,count);
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
      hailMaryUsed:[],
      retired:[]
    };
  });
}

function buriedFiveCrownsRounds(players){
  const perRound=[
    [2,3,3,4,5,6,18,20],
    [3,3,4,4,6,7,20,22],
    [2,3,4,4,6,8,21,23],
    [3,3,4,5,7,8,22,24],
    [2,3,3,4,8,9,22,24],
    [3,4,4,5,8,10,23,25],
    [3,3,4,4,8,12,24,27],
    [22,0,0,0,0,0,0,0]
  ];
  return perRound.map((scores,index)=>({
    round:index+1,
    scores:Object.fromEntries(players.map((player,playerIndex)=>[player,scores[playerIndex]]))
  }));
}

function fiveCrownsBlowoutRounds(players){
  // Hand of 9 table: six players still at 0, Linda 108, Vikki 140 after a 0 with a past Comeback extra.
  const perRound=[
    [0,0,0,0,40,0,0,22],
    [0,0,0,0,40,0,0,22],
    [0,0,0,0,40,0,0,20],
    [0,0,0,0,24,0,0,0],
    [0,0,0,0,11,0,0,0],
    [0,0,0,0,0,0,0,44]
  ];
  return perRound.map((scores,index)=>{
    const round={
      round:index+1,
      scores:Object.fromEntries(players.map((player,playerIndex)=>[player,scores[playerIndex]]))
    };
    if(index===5) round.comeback={[players[4]]:-15};
    return round;
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
const crownsGame=makeCurrentGame('Five Crowns',crownsPlayers,buriedFiveCrownsRounds(crownsPlayers));
const crownsPreserverGame=makeCurrentGame('Five Crowns',crownsPlayers,buriedFiveCrownsRounds(crownsPlayers),{
  hailMaryUsed:['Linda']
});
const blowoutCrownsGame=makeCurrentGame('Five Crowns',crownsPlayers,fiveCrownsBlowoutRounds(crownsPlayers));
const compactCrownsPlayers=NAMES.slice(0,4);
const compactCrownsGame=makeCurrentGame('Five Crowns',compactCrownsPlayers,fiveCrownsRounds(compactCrownsPlayers,5));
const nameFitCrownsPlayers=['Megan','Vikki','Matt','Duke','Linda','Mike','Michelle'];
const nameFitCrownsGame=makeCurrentGame('Five Crowns',nameFitCrownsPlayers,[],{dealerOffset:0});
const heatPlayers=NAMES.slice(0,4);
const heatCloseRounds=[
  [15,8,5,3],
  [20,10,4,2],
  [20,12,6,1]
].map((scores,index)=>({
  round:index+1,
  scores:Object.fromEntries(heatPlayers.map((player,playerIndex)=>[player,scores[playerIndex]]))
}));
const heatCloseGame=makeCurrentGame('Beat the Heat',heatPlayers,heatCloseRounds);
const heatOverRounds=heatCloseRounds.concat([{
  round:4,
  scores:Object.fromEntries(heatPlayers.map((player,playerIndex)=>[player,[12,5,3,1][playerIndex]]))
}]);
const heatOverGame=makeCurrentGame('Beat the Heat',heatPlayers,heatOverRounds);
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
const wizardSixPlayers=NAMES.slice(0,6);
const wizardSixMidGame=makeCurrentGame('Wizard',wizardSixPlayers,wizardRounds(wizardSixPlayers,2),{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{},
  maxRounds:10
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
const heatPacePlayers=['Vikki','Matt','Linda','Michelle','Megan'];
function heatRoundsFromScores(players,scoreRows){
  return scoreRows.map((scoreRow,roundIndex)=>({
    round:roundIndex+1,
    scores:Object.fromEntries(players.map((player,index)=>[player,Number(scoreRow[index])||0]))
  }));
}
const racePlayers=['Megan','Matt','Cat','Mike'];
const raceRounds=heatRoundsFromScores(racePlayers,[
  [20,0,5,8],
  [0,20,5,8],
  [0,20,15,0],
  [0,5,5,20],
  [0,5,5,5]
]);
const raceTotals=totalRounds(racePlayers,raceRounds);
const raceMatch={
  id:909200,
  game:'Five Crowns',
  date:'8/18/2026',
  totals:raceTotals,
  winners:winnersFor('Five Crowns',raceTotals),
  rounds:raceRounds,
  originalRoster:[...racePlayers],
  currentRound:raceRounds.length+1,
  hailMaryUsed:[],
  retired:[]
};
const racePriorMegan={
  id:909100,
  game:'Five Crowns',
  date:'8/10/2026',
  totals:{Megan:40,Matt:22,Cat:28,Mike:31},
  winners:['Matt'],
  rounds:heatRoundsFromScores(racePlayers,[[10,4,8,7],[15,8,10,12],[15,10,10,12]]),
  originalRoster:[...racePlayers],
  currentRound:4,
  hailMaryUsed:[],
  retired:[]
};
const raceHistory=[raceMatch,racePriorMegan];
const race8Players=NAMES.slice(0,8);
const race8Rounds=heatRoundsFromScores(race8Players,[
  [0,12,8,15,6,20,4,10],
  [18,0,10,8,12,6,15,5],
  [6,15,0,12,8,10,20,4],
  [10,8,14,0,20,5,6,12],
  [4,20,8,10,0,12,8,15],
  [8,6,12,5,15,0,10,20]
]);
const race8Totals=totalRounds(race8Players,race8Rounds);
const race8Match={
  id:909300,
  game:'Five Crowns',
  date:'8/18/2026',
  totals:race8Totals,
  winners:winnersFor('Five Crowns',race8Totals),
  rounds:race8Rounds,
  originalRoster:[...race8Players],
  currentRound:race8Rounds.length+1,
  hailMaryUsed:[],
  retired:[]
};
const race8PriorRounds=heatRoundsFromScores(race8Players,[
  [8,10,12,14,16,18,20,22],
  [10,12,14,16,18,20,22,24],
  [12,14,16,18,20,22,24,26]
]);
const race8Prior={
  id:909250,
  game:'Five Crowns',
  date:'8/11/2026',
  totals:totalRounds(race8Players,race8PriorRounds),
  winners:['Megan'],
  rounds:race8PriorRounds,
  originalRoster:[...race8Players],
  currentRound:4,
  hailMaryUsed:[],
  retired:[]
};
const race8History=[race8Match,race8Prior];
function heatMatch(idOffset,date,scoreRows){
  const rounds=heatRoundsFromScores(heatPacePlayers,scoreRows);
  const totals=totalRounds(heatPacePlayers,rounds);
  return {
    id:1784390400000-idOffset,
    game:'Beat the Heat',
    date,
    totals,
    winners:winnersFor('Beat the Heat',totals),
    rounds,
    originalRoster:[...heatPacePlayers],
    currentRound:rounds.length+1,
    hailMaryUsed:[],
    retired:[]
  };
}
const heatPaceGame=makeCurrentGame('Beat the Heat',heatPacePlayers,heatRoundsFromScores(heatPacePlayers,[
  [6,12,14,4,15],
  [9,5,12,18,9],
  [14,14,10,6,10]
]));
const heatPaceHistory=[
  heatMatch(86400000,'8/10/2026',[
    [10,8,2,12,9],
    [12,9,3,10,11]
  ]),
  heatMatch(172800000,'8/3/2026',[
    [8,10,10,9,8],
    [9,8,10,11,10],
    [10,9,9,10,9],
    [18,20,20,16,18]
  ]),
  heatMatch(259200000,'7/27/2026',[
    [12,11,14,8,10],
    [14,12,14,10,12],
    [14,12,14,10,12],
    [20,18,20,18,20]
  ]),
  heatMatch(345600000,'7/20/2026',[
    [11,9,13,7,9],
    [13,11,13,9,11],
    [16,14,16,12,14],
    [20,18,20,18,20]
  ])
];
const lateCrownsPlayers=['Linda','Michelle','Cat','Megan','Brick'];
const lateCrownsGame=makeCurrentGame('Five Crowns',lateCrownsPlayers,heatRoundsFromScores(lateCrownsPlayers,[
  [12,10,8,15,14],
  [12,10,8,15,14],
  [12,10,8,15,14],
  [12,10,8,15,13],
  [12,10,8,15,13],
  [12,10,8,15,13],
  [12,10,0,15,13],
  [12,10,8,15,13],
  [12,10,8,15,14],
  [15,4,8,18,14]
]));
const wizardLate5Players=['Matt','Cat','Michelle','Megan','Brick'];
const wizardLate5Rounds=wizardRoundsFromScores(wizardLate5Players,[
  [40,20,30,20,-10],
  [50,30,20,20,20],
  [20,20,40,20,-10],
  [30,20,20,-10,40],
  [40,20,-10,30,20],
  [20,20,30,20,-20],
  [20,-10,20,20,40],
  [0,10,-20,-5,0]
]);
const wizardLate5Game=makeCurrentGame('Wizard',wizardLate5Players,wizardLate5Rounds,{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{},
  dealerOffset:1
});
const lateCrowns8Players=['Matt','Cat','Michelle','Mike','Megan','Linda','Vikki','Duke'];
const lateCrowns8Rounds=heatRoundsFromScores(lateCrowns8Players,[
  [0,0,8,12,10,18,15,20],
  [0,4,10,8,12,16,18,22],
  [8,0,12,10,8,14,16,18],
  [0,8,10,6,12,20,14,24],
  [5,0,8,10,6,18,12,20],
  [0,6,12,8,10,16,18,22],
  [8,0,10,12,8,20,14,18],
  [0,8,6,10,12,16,20,24],
  [10,0,8,12,6,18,14,20],
  [0,8,10,6,8,16,18,24]
]);
lateCrowns8Rounds[8].comeback={Duke:-15};
lateCrowns8Rounds[9].comeback={Duke:-15};
const lateCrowns8Game=makeCurrentGame('Five Crowns',lateCrowns8Players,lateCrowns8Rounds);
const turboLadderPlayers=['Matt','Cat','Megan','Michelle','Mike','Vikki','Linda','Duke'];
function roundsFromPlayerRows(players,scoreRows,decorate){
  return scoreRows.map((scoreRow,roundIndex)=>{
    const round={
      round:roundIndex+1,
      scores:Object.fromEntries(players.map((player,index)=>[player,Number(scoreRow[index])||0]))
    };
    if(typeof decorate==='function') decorate(round,roundIndex);
    return round;
  });
}
function wizardExactRounds(players, takersByRound){
  return takersByRound.map((takers, index)=>{
    const round=index+1;
    const actuals=Object.fromEntries(players.map(player=>[player,Number(takers[player])||0]));
    const bids={...actuals};
    const scores=Object.fromEntries(players.map(player=>[player,wizardScore(bids[player],actuals[player])]));
    return {round,bids,actuals,scores};
  });
}

const fiveCrownsLadderRounds=roundsFromPlayerRows(turboLadderPlayers,[
  [4,6,10,12,13,14,15,16],
  [3,7,11,12,13,14,16,17],
  [5,6,10,11,13,15,15,18],
  [4,8,12,13,14,14,16,16],
  [3,5,9,12,13,15,16,18],
  [4,6,11,11,13,14,15,16],
  [4,6,11,12,13,14,16,17],
  [3,6,10,11,12,14,15,16]
]);
const fiveCrownsLadderGame=makeCurrentGame('Five Crowns',turboLadderPlayers,fiveCrownsLadderRounds);

const wizardLadderRounds=wizardExactRounds(turboLadderPlayers,[
  {Matt:1},
  {Matt:1,Cat:1},
  {Matt:1,Cat:1,Megan:1},
  {Matt:1,Cat:1,Megan:1,Michelle:1},
  {Matt:1,Cat:1,Megan:1,Michelle:1,Mike:1}
]);
const wizardLadderGame=makeCurrentGame('Wizard',turboLadderPlayers,wizardLadderRounds);

const eight18LadderGame=makeCurrentGame('818',turboLadderPlayers,legalEight18Rounds(turboLadderPlayers,{
  Matt:110,Cat:108,Megan:96,Michelle:92,Mike:88,Vikki:84,Linda:80,Duke:72
},11,{dealerOffset:1}));

const flip7LadderRounds=roundsFromPlayerRows(turboLadderPlayers,[
  [28,22,16,14,12,10,8,6],
  [24,20,16,14,12,10,8,6],
  [22,18,14,12,12,10,8,6],
  [22,18,14,12,10,8,8,4],
  [22,16,14,12,10,10,8,4],
  [22,16,12,12,10,8,6,4]
]);
const flip7LadderGame=makeCurrentGame('Flip 7 Vengeance',turboLadderPlayers,flip7LadderRounds);

function roundsFromTotals(players, totals, count, decorate){
  const rows=Array.from({length:count},(_,index)=>players.map(player=>{
    const total=Number(totals[player])||0;
    const base=Math.trunc(total/count);
    return index<count-1?base:total-base*(count-1);
  }));
  return roundsFromPlayerRows(players, rows, decorate);
}

const fiveCrownsThresholdTotals={Matt:24,Cat:28,Megan:30,Michelle:32,Mike:34,Vikki:36,Linda:38,Duke:54};
const flip7ThresholdTotals={Matt:140,Cat:136,Megan:132,Michelle:130,Mike:128,Vikki:126,Linda:124,Duke:112};

const eight18ThresholdRounds=[
  {round:1,bids:{Matt:1,Cat:1,Megan:1,Michelle:1,Mike:1,Vikki:0,Linda:1,Duke:1},actuals:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:8,Linda:0,Duke:0},scores:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:8,Linda:0,Duke:0}},
  {round:2,bids:{Matt:1,Cat:1,Megan:2,Michelle:1,Mike:1,Vikki:1,Linda:0,Duke:1},actuals:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:7,Duke:0},scores:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:7,Duke:0}},
  {round:3,bids:{Matt:6,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:1,Duke:1},actuals:{Matt:6,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:16,Cat:10,Megan:10,Michelle:10,Mike:10,Vikki:10,Linda:0,Duke:0}},
  {round:4,bids:{Matt:0,Cat:5,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:1},actuals:{Matt:0,Cat:5,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:10,Cat:15,Megan:10,Michelle:10,Mike:10,Vikki:10,Linda:10,Duke:0}},
  {round:5,bids:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:4,Duke:0},scores:{Matt:10,Cat:10,Megan:10,Michelle:10,Mike:10,Vikki:10,Linda:4,Duke:10}},
  {round:6,bids:{Matt:3,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:1,Linda:0,Duke:0},actuals:{Matt:3,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:13,Cat:10,Megan:10,Michelle:10,Mike:10,Vikki:0,Linda:10,Duke:10}},
  {round:7,bids:{Matt:0,Cat:0,Megan:2,Michelle:0,Mike:0,Vikki:1,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:2,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:10,Cat:10,Megan:12,Michelle:10,Mike:10,Vikki:0,Linda:10,Duke:10}},
  {round:8,bids:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:1,Vikki:1,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:1,Linda:0,Duke:0},scores:{Matt:10,Cat:10,Megan:10,Michelle:10,Mike:0,Vikki:11,Linda:10,Duke:10}},
  {round:9,bids:{Matt:0,Cat:0,Megan:0,Michelle:1,Mike:2,Vikki:0,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:0,Michelle:0,Mike:2,Vikki:0,Linda:0,Duke:0},scores:{Matt:10,Cat:10,Megan:10,Michelle:0,Mike:12,Vikki:10,Linda:10,Duke:10}},
  {round:10,bids:{Matt:0,Cat:0,Megan:1,Michelle:3,Mike:0,Vikki:0,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:0,Michelle:3,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:10,Cat:10,Megan:0,Michelle:13,Mike:10,Vikki:10,Linda:10,Duke:10}},
  {round:11,bids:{Matt:0,Cat:1,Megan:1,Michelle:0,Mike:0,Vikki:3,Linda:0,Duke:0},actuals:{Matt:0,Cat:0,Megan:1,Michelle:0,Mike:0,Vikki:3,Linda:0,Duke:0},scores:{Matt:10,Cat:0,Megan:11,Michelle:10,Mike:10,Vikki:13,Linda:10,Duke:10}},
  {round:12,bids:{Matt:0,Cat:0,Megan:1,Michelle:0,Mike:1,Vikki:0,Linda:1,Duke:1},actuals:{Matt:1,Cat:0,Megan:1,Michelle:0,Mike:1,Vikki:0,Linda:1,Duke:1},scores:{Matt:1,Cat:10,Megan:11,Michelle:10,Mike:11,Vikki:10,Linda:11,Duke:11}}
];
const eight18ThresholdGame=makeCurrentGame('818',turboLadderPlayers,eight18ThresholdRounds);
const porch818Players=['Duke','Mike','Megan','Brick','Cat','Vikki'];
const porch818Rounds=[
  {round:1,bids:{Duke:1,Mike:1,Megan:1,Brick:1,Cat:1,Vikki:0},actuals:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:8},scores:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:8}},
  {round:2,bids:{Duke:0,Mike:1,Megan:1,Brick:1,Cat:1,Vikki:0},actuals:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:7},scores:{Duke:10,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:7}},
  {round:3,bids:{Duke:0,Mike:6,Megan:1,Brick:1,Cat:1,Vikki:1},actuals:{Duke:0,Mike:6,Megan:0,Brick:0,Cat:0,Vikki:0},scores:{Duke:10,Mike:16,Megan:0,Brick:0,Cat:0,Vikki:0}},
  {round:4,bids:{Duke:0,Mike:0,Megan:5,Brick:1,Cat:1,Vikki:1},actuals:{Duke:0,Mike:0,Megan:5,Brick:0,Cat:0,Vikki:0},scores:{Duke:10,Mike:10,Megan:15,Brick:0,Cat:0,Vikki:0}},
  {round:5,bids:{Duke:0,Mike:0,Megan:0,Brick:4,Cat:0,Vikki:1},actuals:{Duke:0,Mike:0,Megan:0,Brick:4,Cat:0,Vikki:0},scores:{Duke:10,Mike:10,Megan:10,Brick:14,Cat:10,Vikki:0}},
  {round:6,bids:{Duke:0,Mike:2,Megan:0,Brick:1,Cat:0,Vikki:1},actuals:{Duke:0,Mike:2,Megan:0,Brick:1,Cat:0,Vikki:0},scores:{Duke:10,Mike:12,Megan:10,Brick:11,Cat:10,Vikki:0}},
  {round:7,bids:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:0},actuals:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:0,Vikki:2},scores:{Duke:10,Mike:10,Megan:10,Brick:10,Cat:10,Vikki:2}},
  {round:8,bids:{Duke:0,Mike:0,Megan:1,Brick:0,Cat:1,Vikki:0},actuals:{Duke:0,Mike:0,Megan:1,Brick:0,Cat:0,Vikki:0},scores:{Duke:10,Mike:10,Megan:11,Brick:10,Cat:0,Vikki:10}},
  {round:9,bids:{Duke:0,Mike:0,Megan:0,Brick:0,Cat:1,Vikki:0},actuals:{Duke:0,Mike:0,Megan:0,Brick:1,Cat:1,Vikki:0},scores:{Duke:10,Mike:10,Megan:10,Brick:1,Cat:11,Vikki:10}}
];
const porch818Game=makeCurrentGame('818',porch818Players,porch818Rounds,{
  eight18Phase:'bidding',
  currentBids:{},
  currentScoreDrafts:{},
  maxRounds:15
});
const porch818AfterRounds=[...porch818Rounds,{round:0,hailMaryBonus:true,scores:{Cat:20}}];
const porch818AfterGame=makeCurrentGame('818',porch818Players,porch818AfterRounds,{
  eight18Phase:'bidding',
  currentBids:{},
  currentScoreDrafts:{},
  maxRounds:15,
  hailMaryUsed:['Cat'],
  assistedMatch:true
});
const rookReviewPlayers=NAMES.slice(0,4);
const rookMidRounds=[{
  round:1,
  scores:{Megan:90,Matt:90,Cat:110,Mike:110},
  rookBid:90,
  rookBidder:'Megan',
  rookPartner:'Matt',
  rookMadeIt:true
}];
const rookMidGame=makeCurrentGame('Rook',rookReviewPlayers,rookMidRounds,{
  currentRound:2,
  rookConfig:{winTarget:300,minBid:70,totalCounters:200},
  rookPhase:'results',
  rookHighBidder:'Megan',
  rookHighBid:90,
  rookTrump:'Red',
  rookCalledCard:'Rook',
  rookPartner:'Matt'
});
const rookCallingGame=makeCurrentGame('Rook',rookReviewPlayers,rookMidRounds,{
  currentRound:2,
  rookConfig:{winTarget:300,minBid:70,totalCounters:200},
  rookPhase:'calling',
  rookHighBidder:'Megan',
  rookHighBid:90
});
const wizardThresholdRounds=[
  {round:1,bids:{Matt:1,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:1},actuals:{Matt:1,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:30,Cat:20,Megan:20,Michelle:20,Mike:20,Vikki:20,Linda:20,Duke:-10}},
  {round:2,bids:{Matt:2,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:2},actuals:{Matt:2,Cat:0,Megan:0,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:40,Cat:20,Megan:20,Michelle:20,Mike:20,Vikki:20,Linda:20,Duke:-20}},
  {round:3,bids:{Matt:1,Cat:1,Megan:1,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:3},actuals:{Matt:1,Cat:1,Megan:1,Michelle:0,Mike:0,Vikki:0,Linda:0,Duke:0},scores:{Matt:30,Cat:30,Megan:30,Michelle:20,Mike:20,Vikki:20,Linda:20,Duke:-30}},
  {round:4,bids:{Matt:0,Cat:1,Megan:1,Michelle:1,Mike:1,Vikki:0,Linda:0,Duke:4},actuals:{Matt:0,Cat:1,Megan:1,Michelle:1,Mike:1,Vikki:0,Linda:0,Duke:0},scores:{Matt:20,Cat:30,Megan:30,Michelle:30,Mike:30,Vikki:20,Linda:20,Duke:-40}},
  {round:5,bids:{Matt:0,Cat:1,Megan:0,Michelle:1,Mike:1,Vikki:1,Linda:1,Duke:5},actuals:{Matt:0,Cat:1,Megan:0,Michelle:1,Mike:1,Vikki:1,Linda:1,Duke:0},scores:{Matt:20,Cat:30,Megan:20,Michelle:30,Mike:30,Vikki:30,Linda:30,Duke:-50}}
];
const wizardThresholdGame=makeCurrentGame('Wizard',turboLadderPlayers,wizardThresholdRounds);
const fiveCrownsThresholdGame=makeCurrentGame('Five Crowns',turboLadderPlayers,roundsFromTotals(turboLadderPlayers,fiveCrownsThresholdTotals,8));
const flip7ThresholdGame=makeCurrentGame('Flip 7 Vengeance',turboLadderPlayers,roundsFromTotals(turboLadderPlayers,flip7ThresholdTotals,5));

const tiedPlacePlayers=['Alexis','Diana','Ethan','Megan','Matt','Linda','Mike'];
const tiedPlaceGame=makeCurrentGame('Wizard',tiedPlacePlayers,[
  {round:1,bids:{Alexis:1,Diana:0,Ethan:0,Megan:0,Matt:0,Linda:0,Mike:0},actuals:{Alexis:1,Diana:0,Ethan:0,Megan:0,Matt:0,Linda:0,Mike:0},scores:{Alexis:30,Diana:20,Ethan:20,Megan:20,Matt:20,Linda:20,Mike:20}},
  {round:2,bids:{Alexis:1,Diana:1,Ethan:0,Megan:0,Matt:0,Linda:0,Mike:0},actuals:{Alexis:1,Diana:1,Ethan:0,Megan:0,Matt:0,Linda:0,Mike:0},scores:{Alexis:30,Diana:30,Ethan:20,Megan:20,Matt:20,Linda:20,Mike:20}},
  {round:3,bids:{Alexis:1,Diana:1,Ethan:1,Megan:0,Matt:0,Linda:0,Mike:0},actuals:{Alexis:1,Diana:1,Ethan:1,Megan:0,Matt:0,Linda:0,Mike:0},scores:{Alexis:30,Diana:30,Ethan:30,Megan:20,Matt:20,Linda:20,Mike:20}},
  {round:4,bids:{Alexis:1,Diana:1,Ethan:1,Megan:1,Matt:0,Linda:0,Mike:0},actuals:{Alexis:1,Diana:1,Ethan:1,Megan:1,Matt:0,Linda:0,Mike:0},scores:{Alexis:30,Diana:30,Ethan:30,Megan:30,Matt:20,Linda:20,Mike:20}},
  {round:5,bids:{Alexis:1,Diana:1,Ethan:1,Megan:0,Matt:1,Linda:1,Mike:0},actuals:{Alexis:1,Diana:1,Ethan:1,Megan:0,Matt:1,Linda:1,Mike:0},scores:{Alexis:30,Diana:30,Ethan:30,Megan:20,Matt:30,Linda:30,Mike:20}},
  {round:6,bids:{Alexis:1,Diana:1,Ethan:0,Megan:1,Matt:1,Linda:1,Mike:1},actuals:{Alexis:1,Diana:1,Ethan:0,Megan:1,Matt:1,Linda:1,Mike:1},scores:{Alexis:30,Diana:30,Ethan:20,Megan:30,Matt:30,Linda:30,Mike:30}},
  {round:7,bids:{Alexis:2,Diana:1,Ethan:1,Megan:1,Matt:1,Linda:0,Mike:1},actuals:{Alexis:2,Diana:1,Ethan:1,Megan:1,Matt:1,Linda:0,Mike:1},scores:{Alexis:40,Diana:30,Ethan:30,Megan:30,Matt:30,Linda:20,Mike:30}}
],{
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{}
});

const lifePreserverVisiblePlayers=['Matt','Mike','Linda'];
const lifePreserverVisibleRounds=[
  {round:1,bids:{Matt:1,Mike:1,Linda:1},actuals:{Matt:1,Mike:0,Linda:0},scores:{Matt:30,Mike:-10,Linda:-10}},
  {round:0,hailMaryBonus:true,scores:{Linda:15}},
  {round:2,bids:{Matt:0,Mike:2,Linda:0},actuals:{Matt:0,Mike:2,Linda:0},scores:{Matt:20,Mike:40,Linda:20}},
  {round:3,bids:{Matt:0,Mike:3,Linda:0},actuals:{Matt:0,Mike:3,Linda:0},scores:{Matt:20,Mike:50,Linda:20}},
  {round:4,bids:{Matt:0,Mike:4,Linda:0},actuals:{Matt:0,Mike:4,Linda:0},scores:{Matt:20,Mike:60,Linda:20}},
  {round:5,bids:{Matt:2,Mike:3,Linda:0},actuals:{Matt:2,Mike:3,Linda:0},scores:{Matt:40,Mike:50,Linda:20}},
  {round:6,bids:{Matt:3,Mike:3,Linda:0},actuals:{Matt:3,Mike:3,Linda:0},scores:{Matt:50,Mike:50,Linda:20}},
  {round:0,hailMaryBonus:true,scores:{Mike:40}}
];
const lifePreserverVisibleGame=makeCurrentGame('Wizard',lifePreserverVisiblePlayers,lifePreserverVisibleRounds,{
  currentRound:7,
  wizardPhase:'bidding',
  currentBids:{},
  currentScoreDrafts:{},
  hailMaryUsed:['Linda','Mike']
});

const recordsHealPlayers=[...NAMES];
function recordsHealAssistedMatch(){
  const played=Object.fromEntries(recordsHealPlayers.map(player=>[player,player==='Brick'?0:12]));
  const rounds=[
    {round:1,scores:played},
    {round:0,hailMaryBonus:true,scores:{Brick:-18}}
  ];
  const totals=totalRounds(recordsHealPlayers,rounds);
  return {
    id:1785200000001,
    game:'Five Crowns',
    date:'10/11/2026',
    totals,
    winners:['Brick'],
    rounds,
    originalRoster:[...recordsHealPlayers],
    currentRound:2,
    maxRounds:11,
    hailMaryUsed:['Brick'],
    assistedMatch:true,
    retired:[],
    completed:true
  };
}
function recordsHealPlainMatch(){
  const played=Object.fromEntries(recordsHealPlayers.map(player=>[player,player==='Matt'?4:10]));
  const rounds=[{round:1,scores:played}];
  const totals=totalRounds(recordsHealPlayers,rounds);
  return {
    id:1785200000002,
    game:'Five Crowns',
    date:'10/18/2026',
    totals,
    winners:['Matt'],
    rounds,
    originalRoster:[...recordsHealPlayers],
    currentRound:2,
    maxRounds:11,
    hailMaryUsed:[],
    assistedMatch:false,
    retired:[],
    completed:true
  };
}

function rookFinishedNight(){
  return {
    id:1784390000001,
    game:'Rook',
    date:'10/20/2026',
    originalRoster:['Megan','Matt','Cat','Mike'],
    retired:['Mike'],
    totals:{Megan:90,Matt:90,Cat:110,Mike:40},
    winners:['Cat'],
    completed:true,
    currentRound:2,
    rounds:[{round:1,scores:{Megan:90,Matt:90,Cat:110,Mike:40},rookBid:90,rookBidder:'Megan',rookPartner:'Matt',rookMadeIt:true}]
  };
}

function recordsAssisted818Match(){
  const roster=['Megan','Matt','Cat','Mike','Duke'];
  const rounds=legalEight18Rounds(roster,Object.fromEntries(roster.map((player,index)=>[player,36+index*7])),5);
  rounds.push({round:0,hailMaryBonus:true,scores:{Duke:12}});
  const totals=totalRounds(roster,rounds);
  return {
    id:1785200000003,
    game:'818',
    date:'10/19/2026',
    totals,
    winners:winnersFor('818',totals),
    rounds,
    originalRoster:[...roster],
    currentRound:6,
    maxRounds:15,
    hailMaryUsed:['Duke'],
    assistedMatch:true,
    retired:[],
    completed:true
  };
}

// 818 bid-accuracy fixtures.
// Legacy/inconsistent-score fixtures store a score that is not the shelf formula.
// Bid accuracy ignores that score and compares bid with actual.
// Rule-consistent 818: an exact bid scores tricks + 10, and a miss scores the tricks taken.
export const EIGHT18_BID_ACCURACY_ROUNDS = {
  legacyMiss: {
    round: 1,
    bids: { Ada: 3 },
    actuals: { Ada: 2 },
    scores: { Ada: 15 },
    fixtureKind: 'legacy-inconsistent-score'
  },
  legacyExactZero: {
    round: 1,
    bids: { Bea: 0 },
    actuals: { Bea: 0 },
    scores: { Bea: 0 },
    fixtureKind: 'legacy-inconsistent-score'
  },
  standardMiss: {
    round: 2,
    bids: { Dee: 3 },
    actuals: { Dee: 2 },
    scores: { Dee: 2 },
    fixtureKind: 'rule-consistent-818'
  },
  standardExactZero: {
    round: 2,
    bids: { Eve: 0 },
    actuals: { Eve: 0 },
    scores: { Eve: 10 },
    fixtureKind: 'rule-consistent-818'
  }
};

function finishedMatchFromGame(game,id){
  return {
    id,
    game:game.name,
    date:'9/28/2026',
    totals:{...game.totals},
    winners:winnersFor(game.name, game.totals),
    rounds:JSON.parse(JSON.stringify(game.rounds)),
    originalRoster:[...game.originalRoster],
    currentRound:game.currentRound,
    hailMaryUsed:[...(game.hailMaryUsed||[])],
    lifePreserverHeld:[...(game.lifePreserverHeld||[])],
    retired:[...(game.retired||[])]
  };
}

export const QA_SURFACES = [
  {id:'home',label:'Home setup'},
  {id:'scorecard',label:'Scorecard'},
  {id:'entry-bids',label:'Bid entry'},
  {id:'entry-scores',label:'Score entry'},
  {id:'actions',label:'Actions menu'},
  {id:'settings',label:'Settings'},
  {id:'profiles',label:'Profiles'},
  {id:'whammy',label:'WHAMMY'},
  {id:'nolie',label:'Nolie'},
  {id:'race',label:'Path replay'}
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
  'wizard-6-mid':{
    label:'Wizard · Mid · 6 Players',
    description:'Six-player Wizard after two rounds (R3 of 10). Add a seventh to confirm the match shortens to 8 rounds.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...wizardSixPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardSixMidGame}
  },
  'record-chase-preview':{
    label:'Record Chase · Varied Paces',
    description:'Eight-player Wizard with best-pace, usual-pace, and fresh-start stories for reviewing the compact scorecard concept.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...recordChasePlayers],history:recordChaseHistory,playerProfiles:profiles(),currentGame:recordChaseGame}
  },
  'beat-the-heat-pace':{
    label:'Beat the Heat · Pace Audit',
    description:'Linda sits on 36 with a 5-point two-round career best, so pace must compare this point in past games instead of those final totals.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...heatPacePlayers],history:heatPaceHistory,playerProfiles:profiles(),currentGame:heatPaceGame}
  },
  'five-crowns-late':{
    label:'Five Crowns · Late Totals',
    description:'Five players through Hand of 13, with three-digit totals and Michelle on the card for name-fit and centering checks.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...lateCrownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:lateCrownsGame}
  },
  'wizard-late-5':{
    label:'Wizard · Late · 5 Players',
    description:'Matt/Cat/Michelle/Megan/Brick on Round 9 of 12 with View Pace chrome and Brick as dealer — tablet banner and Michelle name-fit stress case.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...wizardLate5Players],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardLate5Game}
  },
  'five-crowns-late-8':{
    label:'Five Crowns · Late · 8 Players',
    description:'Eight players on Hand of 13 with View Pace on, so Best/Avg/Worst sit beside the latest five rounds.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...lateCrowns8Players],history:sharedHistory,playerProfiles:profiles(),currentGame:lateCrowns8Game}
  },
  'five-crowns-comeback':{
    label:'Five Crowns · Comeback',
    description:'Eight players on Hand of 11, with Brick and Linda out of reach of first and Comeback extras on.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...crownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:crownsGame}
  },
  'five-crowns-preservers':{
    label:'Five Crowns · Life Preservers',
    description:'Eight players on Hand of 11, with Brick crushed in seventh and still holding a Life Preserver while Linda has used hers.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...crownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:crownsPreserverGame}
  },
  'five-crowns-turbo-ladder':{
    label:'Five Crowns · Turbo Ladder',
    description:'Eight-player Five Crowns after 8 of 11: Matt and Cat have no extra, then Megan −10 through Duke −35.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:fiveCrownsLadderGame}
  },
  'wizard-turbo-ladder':{
    label:'Wizard · Turbo Ladder',
    description:'Eight-player Wizard after 5 of 7: Matt and Cat have no extra, then Megan +5 through Duke +20 (Wizard caps at +20).',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardLadderGame}
  },
  'eight18-turbo-ladder':{
    label:'818 · Turbo Ladder',
    description:'Eight-player 818 after 11 of 15: Matt and Cat have no extra, then Megan +8, Michelle +9, and Mike through Duke +10.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:eight18LadderGame}
  },
  'flip7-turbo-ladder':{
    label:'Flip 7 · Turbo Ladder',
    description:'Eight-player Flip 7 mid-session: Matt and Cat have no extra, then Megan +10 and Michelle through Duke +20.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:flip7LadderGame}
  },
  'eight18-life-preserver-threshold':{
    label:'818 · Life Preserver Threshold',
    description:'Eight-player 818 after 12 of 15. Duke is 19 behind 1st — the first legal hole that unlocks only Duke, with three rounds left.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:eight18ThresholdGame}
  },
  'eight18-porch-lp':{
    label:'818 · Porch Life Preserver',
    description:'Six-player 818 on R10 of 15. Cat is 39 behind Duke — the wheel should give about +20 (two made bids), not +11 and not a ticket to 1st.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...porch818Players],history:sharedHistory,playerProfiles:profiles(),currentGame:porch818Game}
  },
  'wizard-life-preserver-threshold':{
    label:'Wizard · Life Preserver Threshold',
    description:'Eight-player Wizard after 5 of 7. Duke is far enough behind 1st that only he unlocks a Life Preserver. Nobody else has one.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:wizardThresholdGame}
  },
  'five-crowns-life-preserver-threshold':{
    label:'Five Crowns · Life Preserver Threshold',
    description:'Eight-player Five Crowns after 8 of 11. Duke is 30 behind 1st — the closest hole that still unlocks a Life Preserver. Nobody else has one.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:fiveCrownsThresholdGame}
  },
  'flip7-life-preserver-threshold':{
    label:'Flip 7 · Life Preserver Threshold',
    description:'Eight-player Flip 7 after 5 banks. Duke is 28 behind 1st — the closest hole that still unlocks a Life Preserver. Nobody else has one.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...turboLadderPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:flip7ThresholdGame}
  },
  'five-crowns-blowout':{
    label:'Five Crowns · Blowout Comeback',
    description:'Hand of 9 with six players at 0, Linda at 108, and Vikki at 140 after a 0 with Comeback extra in the R6 cell.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...crownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:blowoutCrownsGame}
  },
  'five-crowns-4':{
    label:'Five Crowns · 4 Players',
    description:'A short table that should use the full scoreboard height with large names, totals, and avatars.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...compactCrownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:compactCrownsGame}
  },
  'five-crowns-name-fit-7':{
    label:'Five Crowns · Name Fit · 7 Players',
    description:'Seven-player first-round iPad regression case for avatar reordering, dealer styling, and full player names.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...nameFitCrownsPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:nameFitCrownsGame}
  },
  'beat-the-heat-close':{
    label:'Beat the Heat · Close to 66',
    description:'Four players with Megan at 55 heat, one round away from the 66-heat finish line.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...heatPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:heatCloseGame}
  },
  'beat-the-heat-over':{
    label:'Beat the Heat · Match Complete',
    description:'Four players after Megan reaches 67 heat, so the scorecard should already show Match Complete.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...heatPlayers],history:sharedHistory,playerProfiles:profiles(),currentGame:heatOverGame}
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
  },
  'postgame-race':{
    label:'Post-Game · Path Replay',
    description:'Finished Five Crowns with a first-to-last collapse, plus a prior game so Megan’s new personal best can show under the chart.',
    defaultSurface:'race',
    data:{allPlayers:[...NAMES],players:[...racePlayers],history:raceHistory,playerProfiles:profiles(),currentGame:null}
  },
  'postgame-race-8':{
    label:'Post-Game · Path Replay · 8 Players',
    description:'Eight-player Five Crowns path replay for color, type size, and auto-highlight cycling.',
    defaultSurface:'race',
    data:{allPlayers:[...NAMES],players:[...race8Players],history:race8History,playerProfiles:profiles(),currentGame:null}
  },
  'postgame-race-8-plain':{
    label:'Post-Game · Path Replay · 8 Players · No Records',
    description:'Same eight-player Five Crowns path replay with no personal-best or worst notes under the chart.',
    defaultSurface:'race',
    data:{allPlayers:[...NAMES],players:[...race8Players],history:[race8Match],playerProfiles:profiles(),currentGame:null}
  },
  'wizard-tied-places':{
    label:'Wizard · Tied Places',
    description:'Seven-player Wizard. Megan and Matt share 4th. Linda and Mike share 6th.',
    defaultSurface:'scorecard',
    data:{
      allPlayers:[...tiedPlacePlayers],
      players:[...tiedPlacePlayers],
      history:[finishedMatchFromGame(tiedPlaceGame,1785100000001)],
      playerProfiles:profiles(),
      currentGame:tiedPlaceGame
    }
  },
  'wizard-life-preserver-visible':{
    label:'Wizard · Life Preserver On The Card',
    description:'Linda’s +15 follows hand 1 and is hidden by Pace. Mike’s +40 follows hand 6 and stays on that cell. The spin is not an extra round.',
    defaultSurface:'scorecard',
    data:{
      allPlayers:[...lifePreserverVisiblePlayers],
      players:[...lifePreserverVisiblePlayers],
      history:[finishedMatchFromGame(lifePreserverVisibleGame,1785100000002)],
      playerProfiles:profiles(),
      currentGame:lifePreserverVisibleGame
    }
  },
  'rook-bid-setup':{
    label:'Rook · Bid setup',
    description:'Four-player Rook at the contract editor, plus one finished night with a retired seat.',
    defaultSurface:'scorecard',
    data:{
      allPlayers:[...NAMES],
      players:NAMES.slice(0,4),
      history:[rookFinishedNight()],
      playerProfiles:profiles(),
      currentGame:makeCurrentGame('Rook', NAMES.slice(0,4), [], {
        currentRound:1,
        rookConfig:{winTarget:300,minBid:70,totalCounters:200},
        rookPhase:'bidSetup',
        totals:Object.fromEntries(NAMES.slice(0,4).map(player=>[player,0]))
      })
    }
  },
  'records-assisted-heal':{
    label:'Records · Assisted Match Heal',
    description:'Twelve players. Brick’s Five Crowns Life Preserver is −18 on round 0 beside a real 0 hand. Unassisted score records use the other match.',
    defaultSurface:'home',
    data:{
      allPlayers:[...NAMES],
      players:[...NAMES],
      history:[recordsHealAssistedMatch(),recordsHealPlainMatch()],
      playerProfiles:profiles(),
      currentGame:null
    }
  },
  'empty-table':{
    label:'Empty porch',
    description:'No seated players, no history, and no live match.',
    defaultSurface:'home',
    data:{allPlayers:[],players:[],history:[],playerProfiles:{},currentGame:null}
  },
  'eight18-porch-lp-after':{
    label:'818 · Porch Life Preserver After',
    description:'Same porch 818 table after Cat’s +20 Life Preserver (Hail Mary) spin.',
    defaultSurface:'scorecard',
    data:{allPlayers:[...NAMES],players:[...porch818Players],history:sharedHistory,playerProfiles:profiles(),currentGame:porch818AfterGame}
  },
  'rook-midgame':{
    label:'Rook · Midgame',
    description:'Four-player Rook after one made bid so the scorecard and results modal have numbers.',
    defaultSurface:'scorecard',
    data:{
      allPlayers:[...NAMES],
      players:[...rookReviewPlayers],
      history:sharedHistory,
      playerProfiles:profiles(),
      currentGame:rookMidGame
    }
  },
  'rook-calling':{
    label:'Rook · Trump and partner',
    description:'Four-player Rook after the bid, ready to name trump and the called card.',
    defaultSurface:'scorecard',
    data:{
      allPlayers:[...NAMES],
      players:[...rookReviewPlayers],
      history:sharedHistory,
      playerProfiles:profiles(),
      currentGame:rookCallingGame
    }
  },
  'demo-seed':{
    label:'TEMP Demo Seed',
    description:'Preview-only porch night pack: finished nights for all six games, Fame and Shame, one assisted 818, one retired seat, one live Resume match, and a Rook night with contracts.',
    defaultSurface:'home',
    data:{
      allPlayers:[...NAMES],
      players:[...crownsPlayers],
      history:[...sharedHistory,rookFinishedNight(),recordsAssisted818Match()],
      playerProfiles:profiles(),
      currentGame:JSON.parse(JSON.stringify(crownsGame))
    }
  }
};

export function cloneScenario(id){
  const scenario=QA_SCENARIOS[id]||QA_SCENARIOS['home-party'];
  return JSON.parse(JSON.stringify(scenario));
}
