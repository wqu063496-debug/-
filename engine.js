(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MysteryEngine=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EVIDENCE=['ロープ','ナイフ','手袋','ゴミ袋','シャベル'],ZONES=['住宅街','商店街','中心街','裏山'],MOTIVES=['快楽犯','復讐','金','思想','権力'],TIMES=['0時','6時','12時','18時'],SUSPECTS=['容疑者A','容疑者B','容疑者C','容疑者D','容疑者E'],TRAITS=['マスク','帽子','ジーンズ','運動靴','黒い','外国人','背が高い','猫背','女性','眼鏡'];
const CARDS=[{name:'鑑識',type:'tech',price:20,weight:10},{name:'聞き上手',type:'tech',price:20,weight:10},{name:'タクシーチケット',type:'use',price:10,cost:3,weight:10},{name:'閃く',type:'use',price:100,cost:5,weight:5},{name:'足止め',type:'use',price:30,cost:4,weight:10},{name:'監視カメラ確認',type:'use',price:30,cost:2,weight:15},{name:'辻褄',type:'use',price:30,cost:2,weight:15},{name:'宝くじ',type:'use',price:5,cost:1,weight:5},{name:'情報提供',type:'use',price:20,cost:2,weight:10},{name:'証拠品情報',type:'use',price:35,cost:4,weight:5},{name:'透徹',type:'tech',price:50,weight:5}];
const EVENT_WEIGHTS=[30,10,7,7,6,5,5,5,5,10,10];
const rand=(rng,n)=>Math.floor(rng()*n),pick=(rng,a)=>a[rand(rng,a.length)];
function shuffle(rng,a){a=a.slice();for(let i=a.length-1;i>0;i--){let j=rand(rng,i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function weighted(rng,weights){let total=weights.reduce((a,b)=>a+b,0),v=rng()*total;for(let i=0;i<weights.length;i++){v-=weights[i];if(v<0)return i}return weights.length-1}
function unique(rng,a,n){return shuffle(rng,a).slice(0,n)}
function makeBoard(rng){let types=[...Array(10).fill('evidence'),...Array(20).fill('event'),...Array(10).fill('scene'),...Array(10).fill('interview'),...Array(30).fill('coin'),...Array(10).fill('card'),...Array(60).fill('normal')];
// Reserve 2 or 3 of scene/interview in each zone.
let board=Array.from({length:150},(_,i)=>({id:i,zone:(()=>{let row=Math.floor(i/15),col=row%2?14-i%15:i%15;return row<5?(col<8?'住宅街':'商店街'):(col<8?'裏山':'中心街')})(),type:'normal'}));
const allocations=[3,2,3,2];let used=new Set();
for(const type of ['scene','interview'])for(let z=0;z<4;z++){let slots=shuffle(rng,board.filter(t=>t.zone===ZONES[z]&&!used.has(t.id))).slice(0,allocations[z]);for(let s of slots){s.type=type;used.add(s.id)}}
let rest=shuffle(rng,board.filter(t=>!used.has(t.id)));let needs={evidence:10,event:20,coin:30,card:10};let idx=0;for(let [type,count]of Object.entries(needs))for(let i=0;i<count;i++)rest[idx++].type=type;
// Two buzzer spaces per district, and one independent informant space.
for(const zone of ZONES){for(const tile of shuffle(rng,board.filter(t=>t.zone===zone&&t.type==='normal')).slice(0,2)){tile.type='buzzer';tile.buzzerEvidence=pick(rng,EVIDENCE)} }
const informant=pick(rng,board.filter(t=>t.type==='normal'));informant.type='informant';
let evidenceSlots=shuffle(rng,board.filter(t=>t.type==='evidence'));
// Each evidence appears in at least two different shops; remaining slots diversified.
let pairs=EVIDENCE.flatMap(x=>[x,x]);let extra=EVIDENCE.flatMap(x=>[x,x]);let assignments=shuffle(rng,pairs.concat(extra));
for(let attempt=0;attempt<100;attempt++){let ok=true;for(let i=0;i<10;i++)if(assignments[2*i]===assignments[2*i+1])ok=false;if(ok)break;assignments=shuffle(rng,assignments)}
for(let i=0;i<10;i++){let a=assignments[2*i],b=assignments[2*i+1];if(a===b)b=EVIDENCE[(EVIDENCE.indexOf(a)+1)%5];evidenceSlots[i].stock=[a,b]}
let cardSlots=shuffle(rng,board.filter(t=>t.type==='card'));let cardNames=CARDS.map(c=>c.name);let all=shuffle(rng,cardNames.concat(Array.from({length:30-cardNames.length},()=>CARDS[weighted(rng,CARDS.map(c=>c.weight))].name)));for(let i=0;i<10;i++){let stock=all.slice(i*3,i*3+3);if(new Set(stock).size<3){let pool=shuffle(rng,cardNames.filter(n=>!stock.includes(n)));stock=[...new Set(stock)];while(stock.length<3)stock.push(pool.shift())}cardSlots[i].stock=stock}
return board}
function newGame(options={}){let rng=options.rng||Math.random,botCount=options.botCount===undefined?3:options.botCount;let humans=options.humans===undefined?4-botCount:options.humans;if(botCount+humans!==4||humans<1||botCount<0)throw Error('4 players required');let names=options.names||[];
let solution={evidence:pick(rng,EVIDENCE),zone:pick(rng,ZONES),motive:pick(rng,MOTIVES),time:pick(rng,TIMES),suspect:pick(rng,SUSPECTS)};
let traitSets=[],seen=new Set();for(let i=0;i<5;i++){let arr,key;do{arr=unique(rng,TRAITS,3);key=arr.slice().sort().join('|')}while(seen.has(key));seen.add(key);traitSets.push(arr)}
let order=shuffle(rng,[0,1,2,3]);let players=Array.from({length:4},(_,i)=>({id:i,name:names[i]||((i<humans?'探偵':'BOT')+(i+1)),bot:i>=humans,pos:[0,38,75,113][i],coins:0,evidence:[],cards:[],notes:{zones:{},times:{},excludedSuspects:[],traits:[],motive:null,knownSuspect:null,wrongAnswers:[],evidenceShops:[],knownEvidence:null},actions:0,cycleDistance:0,skip:0}));order.forEach((id,i)=>players[id].coins=[10,20,30,30][i]);let prices=Object.fromEntries(EVIDENCE.map(x=>[x,50+rand(rng,101)]));let game={board:makeBoard(rng),roads:buildRoads(rng),solution,traitSets,prices,players,order,turn:0,phase:'roll',roll:null,round:0,inference:null,winner:null,log:[],rng,allInferenceCount:0,destinationChallenge:null,disasterEvent:null,thiefEvent:null,eventRates:{destination:options.eventRates?.destination??30,disaster:options.eventRates?.disaster??30,thief:options.eventRates?.thief??30}};say(game,'事件発生！ 事件の真相は非公開です。');return game}
function say(g,s){g.log.unshift(s);if(g.log.length>70)g.log.length=70}
const current=g=>g.players[g.order[g.turn]];
function roll(g){if(g.phase!=='roll')throw Error('not roll phase');g.roll=1+rand(g.rng,6);g.phase='choice';say(g,`${current(g).name}の出目は${g.roll}`);return g.roll}
function endTurn(g){let p=current(g);p.actions++;advanceThief(g);if(p.actions%5===0){}g.turn=(g.turn+1)%4;g.roll=null;g.phase='roll';if(g.turn===0){g.round++;if(g.round%5===0){startInference(g,'all');return}}let next=current(g);if(next.skip>0){next.skip--;say(g,`${next.name}は1回休み`);endTurn(g)}}
// Grid board: 15 columns x 10 rows, serpentine IDs for backwards compatibility.
const GRID_W=15,GRID_H=10;
function gridCoord(id){let row=Math.floor(id/GRID_W),off=id%GRID_W;return {x:row%2?GRID_W-1-off:off,y:row}}
function gridId(x,y){if(x<0||x>=GRID_W||y<0||y>=GRID_H)return -1;return y*GRID_W+(y%2?GRID_W-1-x:x)}
// Randomized connected street graph, built afresh for every case.
// The original 150 space identifiers and their zones remain unchanged.
function buildRoads(rng){
 const adj=Array.from({length:150},()=>new Set());
 const link=(a,b)=>{if(a<0||b<0||a===b)return;adj[a].add(b);adj[b].add(a)};
 const visited=new Set([0]),front=[0];
 // Randomized growing tree guarantees connectivity, using physical neighbors.
 while(front.length){let at=front[rand(rng,front.length)],p=gridCoord(at);
  let opts=[[p.x-1,p.y],[p.x+1,p.y],[p.x,p.y-1],[p.x,p.y+1]].map(([x,y])=>gridId(x,y)).filter(n=>n>=0&&!visited.has(n));
  if(!opts.length){front.splice(front.indexOf(at),1);continue}
  let to=opts[rand(rng,opts.length)];link(at,to);visited.add(to);front.push(to)
 }
 // Extra junctions create route choices, but not a full grid.
 for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
  let a=gridId(x,y);for(let [xx,yy] of [[x+1,y],[x,y+1]]){
   let b=gridId(xx,yy);if(b>=0&&!adj[a].has(b)&&rng()<.22)link(a,b)
  }
 }
 return adj.map(set=>[...set].sort((a,b)=>a-b))
}
const neighbors=(g,id)=>g.roads[id]||[];
function reachable(g,origin,steps){let front=new Set([origin]);for(let i=0;i<steps;i++){
 let next=new Set();for(let p of front)for(let n of neighbors(g,p))next.add(n);front=next
 }return [...front].sort((a,b)=>a-b)}
function pathTo(g,origin,destination,steps){
 let layer=new Map([[origin,[origin]]]);
 for(let i=0;i<steps;i++){let next=new Map();for(let [pos,path] of layer)for(let n of neighbors(g,pos))if(!next.has(n))next.set(n,[...path,n]);layer=next}
 return layer.get(destination)||null
}
function shortestDistance(g,a,b){if(a===b)return 0;let seen=new Set([a]),front=[a],d=0;while(front.length){d++;let next=[];for(let p of front)for(let n of neighbors(g,p)){if(n===b)return d;if(!seen.has(n)){seen.add(n);next.push(n)}}front=next}return Infinity}
function completeMove(g,p){p.cycleDistance+=g.roll;say(g,`${p.name}は${g.roll}マス進み、${g.board[p.pos].zone}へ`);g.phase='tile';g.route=null;resolveTile(g,p,g.board[p.pos])}
function move(g,destination){if(g.phase!=='choice')throw Error('cannot move');let p=current(g);
 const options=reachable(g,p.pos,g.roll);let target=destination===undefined?options[rand(g.rng,options.length)]:Number(destination);
 const path=pathTo(g,p.pos,target,g.roll);if(!path)throw Error('出目の歩数で到達できないマスです');
 p.pos=target;catchThief(g,p);g.lastRoute=path;checkBuzzers(g,p,path.slice(1));checkDestinationChallenge(g,p,path);completeMove(g,p);return path
}
function checkBuzzers(g,p,visited){
 for(const id of visited){if(g.board[id].type==='buzzer'&&p.evidence.includes(g.board[id].buzzerEvidence)){
  g.lastBuzzer={serial:(g.lastBuzzer?.serial||0)+1,playerId:p.id,playerName:p.name,space:id,evidence:g.board[id].buzzerEvidence};
  say(g,`🚨 ブザー反応！ ${p.name}が指定証拠品「${g.board[id].buzzerEvidence}」を持って${id+1}番マスを通過した！`)
 }}
}
// A challenge is shared by all detectives; each detective may claim its reward once.
function checkDestinationChallenge(g,p,path){
 const c=g.destinationChallenge;
 if(!c||c.completed.includes(p.id)||!path.includes(c.tileId))return;
 c.completed.push(p.id);
 const n=updateDeductions(g,p);
 const unknown=[];
 if(!n.knownEvidence)unknown.push('evidence');
 if(!ZONES.some(z=>n.zones[z]===true))unknown.push('zone');
 if(!n.motive)unknown.push('motive');
 if(!TIMES.some(t=>n.times[t]==='確定'))unknown.push('time');
 if(!n.knownSuspect)unknown.push('suspect');
 const category=unknown.length?pick(g.rng,unknown):null;
 if(category==='evidence')n.knownEvidence=g.solution.evidence;
 if(category==='zone')n.zones[g.solution.zone]=true;
 if(category==='motive')n.motive=g.solution.motive;
 if(category==='time')n.times[g.solution.time]='確定';
 if(category==='suspect'){
  n.excludedSuspects=SUSPECTS.filter(x=>x!==g.solution.suspect);
  updateDeductions(g,p);
 }
 g.lastChallengeReward={serial:(g.lastChallengeReward?.serial||0)+1,playerId:p.id,playerName:p.name,category,detail:category?({evidence:'証拠品',zone:'殺人現場',motive:'動機',time:'死亡時刻',suspect:'犯人'}[category]+'が確定した！'):'すでに5項目すべて判明している'};
 say(g,`🎯 ${p.name}が目的地${c.tileId+1}番マスに到達！ ${g.lastChallengeReward.detail}`);
}
function spawnThief(g){
 const candidates=g.board.filter(t=>!g.players.some(p=>p.pos===t.id));
 const score=t=>{const distances=g.players.map(p=>shortestDistance(g,t.id,p.pos));return Math.min(...distances)*10-(Math.max(...distances)-Math.min(...distances))};
 const best=candidates.sort((a,b)=>score(b)-score(a));const chosen=best[0];if(!chosen)return;
 g.thiefEvent={pos:chosen.id,startedAt:g.allInferenceCount};
 g.lastWorldEvent={serial:(g.lastWorldEvent?.serial||0)+1,type:'thief',title:'泥棒が出現！',detail:`黒い駒が${chosen.id+1}番マスに出現。捕まえると異なる探偵カードを3枚獲得！`};
 say(g,'🦹 泥棒が現れた！')
}
function advanceThief(g){
 const thief=g.thiefEvent;if(!thief)return;
 let pos=thief.pos;
 for(let step=0;step<3;step++){
  const next=neighbors(g,pos).filter(id=>!g.players.some(p=>p.pos===id));if(!next.length)break;
  const scored=next.map(id=>({id,dist:Math.min(...g.players.map(p=>shortestDistance(g,id,p.pos)))}));
  const max=Math.max(...scored.map(x=>x.dist));pos=pick(g.rng,scored.filter(x=>x.dist===max)).id;
 }
 thief.pos=pos;
}
function catchThief(g,p){
 if(!g.thiefEvent||p.pos!==g.thiefEvent.pos)return false;
 const cards=unique(g.rng,CARDS.map(c=>c.name),3);cards.forEach(name=>grantCard(g,p,name));
 g.thiefEvent=null;
 g.lastWorldEvent={serial:(g.lastWorldEvent?.serial||0)+1,type:'thiefCaught',title:`${p.name}が泥棒を捕まえた！`,detail:`探偵カードを3種類獲得：${cards.join('・')}`};
 say(g,`🦹 ${p.name}が泥棒を捕まえた！`);return true
}
function finishAllInference(g){
 g.allInferenceCount++;g.players.forEach(q=>q.cycleDistance=0);g.destinationChallenge=null;
 const rates=g.eventRates||{destination:30,disaster:30,thief:30};
 if(g.rng()<(rates.destination||0)/100){
  const tile=pick(g.rng,g.board);g.destinationChallenge={tileId:tile.id,startedAt:g.allInferenceCount,completed:[]};
  g.lastChallengeEvent={serial:(g.lastChallengeEvent?.serial||0)+1,tileId:tile.id,zone:tile.zone};
  say(g,`🎯 緊急目的地イベント！ ${tile.id+1}番マスへ！`);
 }else if(g.rng()<(rates.disaster||0)/100){
  const zone=pick(g.rng,ZONES);g.disasterEvent={zone,startedAt:g.allInferenceCount};
  g.lastWorldEvent={serial:(g.lastWorldEvent?.serial||0)+1,type:'disaster',title:'天災警報！',detail:`次の全体推理タイムまでに${zone}へ避難！ 避難できなければ推理をスキップし、所持証拠品・カードをすべて失う`};
  say(g,`🔥 天災警報：${zone}へ避難せよ！`);
 }else if(g.rng()<(rates.thief||0)/100){spawnThief(g)}
}
function informant(g,category){if(g.phase!=='informant')throw Error('not at informant');const p=current(g);if(p.coins<300)throw Error('300コインが必要です');if(!['evidence','zone','motive','time','suspect'].includes(category))throw Error('項目を選択してください');p.coins-=300;const value=g.solution[category];
 if(category==='evidence')p.notes.knownEvidence=value;
 if(category==='zone')p.notes.zones[value]=true;
 if(category==='motive')p.notes.motive=value;
 if(category==='time')p.notes.times[value]='確定';
 if(category==='suspect'){const excluded=pick(g.rng,SUSPECTS.filter(s=>s!==g.solution.suspect&&!p.notes.excludedSuspects.includes(s)));if(excluded)p.notes.excludedSuspects.push(excluded);}
 updateDeductions(g,p);
 // The dealer disappears from the used location and relocates to a currently empty tile.
 const previous=g.board.find(t=>t.type==='informant');
 const available=g.board.filter(t=>t.type==='normal' && !g.players.some(q=>q.pos===t.id));
 if(previous && available.length){
  const destination=pick(g.rng,available);
  previous.type='normal';destination.type='informant';
  g.lastInformantMove={serial:(g.lastInformantMove?.serial||0)+1,from:previous.id,to:destination.id,playerId:p.id};
  say(g,`🕵️ 情報屋は${previous.id+1}番マスから別の空白マスへ移動した`);
 }
 g.lastDiscovery={serial:(g.lastDiscovery?.serial||0)+1,kind:'informant',playerId:p.id,playerName:p.name,headline:'情報屋からの極秘情報',detail:category==='suspect'?'犯人候補の除外情報：'+(p.notes.excludedSuspects[p.notes.excludedSuspects.length-1]||'新しい除外対象なし'):({evidence:'正解の証拠品',zone:'殺人現場',motive:'動機',time:'死亡時刻'})[category]+'：'+value};say(g,`${p.name}は情報屋に300コインを支払い極秘情報を得た`);endTurn(g);return category==='suspect'?(p.notes.excludedSuspects[p.notes.excludedSuspects.length-1]||null):value}
function skipInformant(g){if(g.phase!=='informant')throw Error('not at informant');endTurn(g)}
function grantCard(g,p,name){p.cards.push(name);say(g,`${p.name}は「${name}」を入手`)}
function randomCard(g){return CARDS[weighted(g.rng,CARDS.map(c=>c.weight))].name}
function suspectReasoning(g,p){
 const n=p.notes;
 const traits=[...new Set(n.traits||[])];
 const explicitlyExcluded=[...new Set(n.excludedSuspects||[])];
 const eliminated=SUSPECTS.map((suspect,i)=>({suspect, reasons:[...(explicitlyExcluded.includes(suspect)?['捜査で犯人ではないと判明']:[]),...traits.filter(t=>!g.traitSets[i].includes(t)).map(t=>'特徴「'+t+'」に一致しない')]}));
 const candidates=eliminated.filter(x=>x.reasons.length===0).map(x=>x.suspect);
 return {candidates,traits,explicitlyExcluded,eliminated:eliminated.filter(x=>x.reasons.length>0),confirmed:candidates.length===1?candidates[0]:null};
}
function updateDeductions(g,p){
 const n=p.notes;
 const result=suspectReasoning(g,p);
 n.suspectCandidates=result.candidates;
 n.knownSuspect=result.confirmed;
 const remaining=ZONES.filter(zone=>n.zones[zone]!==false);
 if(!ZONES.some(zone=>n.zones[zone]===true)&&remaining.length===1)n.zones[remaining[0]]=true;
 n.zoneCandidates=ZONES.filter(zone=>n.zones[zone]!==false);
 return n;
}
function revealScene(g,p,zone){
 let yes=g.solution.zone===zone;p.notes.zones[zone]=yes;
 let detail=zone+'は'+(yes?'殺人現場だった！':'現場ではなかった');
 let timeResult=null;
 if(yes){
  const success=p.cards.includes('鑑識')||g.rng()<.5;
  if(success){const t=g.solution.time;p.notes.times[t]='確定';timeResult='死亡時刻「'+t+'」が判明した！';}
  else{timeResult='死亡時刻の調査は失敗した（誤った時刻は表示しません）';}
 }
 g.lastDiscovery={serial:(g.lastDiscovery?.serial||0)+1,kind:'scene',playerId:p.id,playerName:p.name,zone,headline:yes?'現場を特定！':'現場ではないと判明',detail,timeResult};
 updateDeductions(g,p);say(g,`${p.name}：${zone}は${yes?'殺人現場':'殺人現場ではない'}`);
 if(timeResult)say(g,`${p.name}：${timeResult}`);
}
function revealInterview(g,p,choose){let motive=choose==='motive'||(choose!=='trait'&&g.rng()<.2);if(motive){p.notes.motive=g.solution.motive;g.lastDiscovery={serial:(g.lastDiscovery?.serial||0)+1,kind:'interview',playerId:p.id,playerName:p.name,headline:'動機の手掛かり',detail:'動機：'+g.solution.motive};say(g,`${p.name}は動機「${g.solution.motive}」を確認`)}else{let idx=SUSPECTS.indexOf(g.solution.suspect),trait=pick(g.rng,g.traitSets[idx]);if(!p.notes.traits.includes(trait))p.notes.traits.push(trait);updateDeductions(g,p);g.lastDiscovery={serial:(g.lastDiscovery?.serial||0)+1,kind:'interview',playerId:p.id,playerName:p.name,headline:'目撃証言を入手',detail:'犯人の特徴：'+trait};say(g,`${p.name}は犯人の特徴「${trait}」を確認`)}}
function resolveTile(g,p,t){if(t.type==='coin'){const bonus=Math.floor(g.round/5)*10;const n=5+bonus+rand(g.rng,26);p.coins+=n;g.lastCoinGain={serial:(g.lastCoinGain?.serial||0)+1,playerId:p.id,playerName:p.name,amount:n,round:g.round+1};say(g,`${p.name}は${n}コイン獲得（${g.round+1}周目・獲得範囲${5+bonus}～${30+bonus}コイン）`);endTurn(g)}else if(t.type==='scene'){revealScene(g,p,t.zone);endTurn(g)}else if(t.type==='interview'){if(p.cards.includes('聞き上手')&&!p.bot){g.phase='interview-choice'}else{revealInterview(g,p);endTurn(g)}}else if(t.type==='evidence'||t.type==='card'){if(t.type==='evidence'){if(!Array.isArray(p.notes.evidenceShops))p.notes.evidenceShops=[];if(!p.notes.evidenceShops.includes(t.id)){p.notes.evidenceShops.push(t.id);p.notes.evidenceShops.sort((a,b)=>a-b);say(g,`🔍 ${p.name}は${t.id+1}番マス（${t.zone}）に証拠品ショップがあることを確認した`)} }g.phase='shop';say(g,`${p.name}は${t.type==='card'?'カード':'証拠品'}の販売マスに到着`)}else if(t.type==='informant'){g.phase='informant';say(g,`${p.name}は情報屋に到着`)}else if(t.type==='event'){resolveEvent(g,p)}else endTurn(g)}
function interviewChoice(g,choice){if(g.phase!=='interview-choice')throw Error('not interview');revealInterview(g,current(g),choice);endTurn(g)}
function resolveEvent(g,p){let e=weighted(g.rng,EVENT_WEIGHTS);g.lastEvent={serial:(g.lastEvent?.serial||0)+1,id:e,playerId:p.id,playerName:p.name,space:p.pos};say(g,`イベント番号${e+1}発生`);switch(e){case 0:grantCard(g,p,randomCard(g));break;case 1:g.players.forEach(q=>grantCard(g,q,randomCard(g)));break;case 2:revealScene(g,p,g.board[p.pos].zone);break;case 3:revealInterview(g,p);break;case 4:startInference(g,'single',p.id);return;case 5:startInference(g,'single',pick(g.rng,g.players).id);return;case 6:p.skip++;break;case 7:pick(g.rng,g.players.filter(q=>q.id!==p.id)).skip++;break;case 8:g.players.forEach(q=>{const excluded=pick(g.rng,SUSPECTS.filter(s=>s!==g.solution.suspect&&!q.notes.excludedSuspects.includes(s)));if(excluded)q.notes.excludedSuspects.push(excluded);updateDeductions(g,q)});say(g,'全員が犯人ではない容疑者の情報を1件入手した');break;case 9:p.evidence.push(pick(g.rng,EVIDENCE));break;case 10:p.coins+=10;break}endTurn(g)}
function shop(g,name){if(g.phase!=='shop')throw Error('not shopping');let p=current(g),t=g.board[p.pos];if(!t.stock.includes(name))throw Error('not stocked');let card=CARDS.find(c=>c.name===name),price=card?card.price:g.prices[name];if(!card&&p.evidence.includes(name))throw Error('同じ証拠品は同じ探偵が2個購入できません');if(p.coins<price)throw Error('insufficient coins');p.coins-=price;if(card)grantCard(g,p,name);else p.evidence.push(name);say(g,`${p.name}が${name}を${price}コインで購入`);endTurn(g)}
function skipShop(g){if(g.phase!=='shop')throw Error('not shop');endTurn(g)}
function useCard(g,name,arg){if(g.phase!=='choice')throw Error('not card phase');let p=current(g),card=CARDS.find(c=>c.name===name);if(!card||card.type!=='use'||!p.cards.includes(name)||card.cost>g.roll)throw Error('card unavailable');p.cards.splice(p.cards.indexOf(name),1);say(g,`${p.name}が「${name}」を使用`);switch(name){case 'タクシーチケット':{let z=ZONES.includes(arg)&&arg!==g.board[p.pos].zone?arg:pick(g.rng,ZONES.filter(z=>z!==g.board[p.pos].zone));p.pos=pick(g.rng,g.board.filter(t=>t.zone===z)).id;catchThief(g,p);break}case '閃く':startInference(g,'single',p.id);return;case '足止め':{let target=g.players.find(q=>q.id===Number(arg)&&q.id!==p.id)||pick(g.rng,g.players.filter(q=>q.id!==p.id));target.skip++;break}case '監視カメラ確認':{let candidate=pick(g.rng,SUSPECTS.filter(s=>s!==g.solution.suspect&&!p.notes.excludedSuspects.includes(s)));if(candidate&&!p.notes.excludedSuspects.includes(candidate))p.notes.excludedSuspects.push(candidate);updateDeductions(g,p);break}case '辻褄':{let candidate=pick(g.rng,TIMES.filter(t=>t!==g.solution.time&&p.notes.times[t]!=='除外'));if(candidate)p.notes.times[candidate]='除外';break}case '宝くじ':if(g.rng()<.2)p.coins+=100;break;case '証拠品情報':{let candidates=g.board.filter(t=>t.type==='evidence'&&!p.notes.evidenceShops.includes(t.id));let tile=pick(g.rng,candidates.length?candidates:g.board.filter(t=>t.type==='evidence'));if(!p.notes.evidenceShops.includes(tile.id))p.notes.evidenceShops.push(tile.id);g.lastDiscovery={serial:(g.lastDiscovery?.serial||0)+1,kind:'card',playerId:p.id,playerName:p.name,headline:'証拠品ショップを発見',detail:`${tile.id+1}番マス（${tile.zone}）に証拠品ショップがあると分かった`};say(g,`${p.name}は証拠品ショップの場所を特定`);break}case '情報提供':{let idx=SUSPECTS.indexOf(g.solution.suspect),trait=pick(g.rng,g.traitSets[idx]);if(!p.notes.traits.includes(trait))p.notes.traits.push(trait);updateDeductions(g,p);break}}endTurn(g)}
function startInference(g,kind,id){
 if(kind==='all'){
  if(g.thiefEvent){g.lastWorldEvent={serial:(g.lastWorldEvent?.serial||0)+1,type:'thiefEscape',title:'泥棒が逃走した！',detail:'黒い駒は街から姿を消した'};g.thiefEvent=null}
  if(g.disasterEvent){const zone=g.disasterEvent.zone;for(const p of g.players){if(g.board[p.pos].zone!==zone){p.evidence=[];p.cards=[];p.disasterSkip=true;say(g,`🔥 ${p.name}は避難に失敗！ 証拠品と探偵カードをすべて失った`)}else p.disasterSkip=false}g.lastDisasterResult={serial:(g.lastDisasterResult?.serial||0)+1,zone,failed:g.players.filter(p=>p.disasterSkip).map(p=>p.name)};g.disasterEvent=null}
 }
 let queue=kind==='all'?g.players.slice().sort((a,b)=>b.cycleDistance-a.cycleDistance||g.order.indexOf(a.id)-g.order.indexOf(b.id)).filter(p=>!p.disasterSkip).map(p=>p.id):[id];
 if(kind==='all')g.players.forEach(p=>p.disasterSkip=false);
 if(!queue.length){g.inference=null;finishAllInference(g);endTurn(g);return}
 g.inference={kind,queue,index:0};g.phase='inference';say(g,`${kind==='all'?'全員':'個人'}推理タイム開始`)
}
function infer(g,answer){if(g.phase!=='inference')throw Error('not inference');let p=g.players[g.inference.queue[g.inference.index]];let correct=Object.keys(g.solution).every(k=>answer[k]===g.solution[k])&&p.evidence.includes(g.solution.evidence)&&g.board[p.pos].zone===g.solution.zone;if(correct){g.winner=p.id;g.phase='finished';say(g,`${p.name}が事件を解決！`);return true}const wrongRecord={evidence:answer.evidence,zone:answer.zone,motive:answer.motive,time:answer.time,suspect:answer.suspect};
// 「透徹」は回答した5項目だけを比較する。所持品・現在地の勝利条件は含めない。
if(p.cards.includes('透徹'))wrongRecord.wrongCount=['evidence','zone','motive','time','suspect'].filter(k=>answer[k]!==g.solution[k]).length;
p.notes.wrongAnswers.push(wrongRecord);say(g,`${p.name}の推理は不正解`);g.inference.index++;if(g.inference.index>=g.inference.queue.length){let all=g.inference.kind==='all';g.inference=null;if(all)finishAllInference(g);endTurn(g)}return false}
function botAction(g){if(g.phase==='finished')return;if(g.phase==='inference'){let p=g.players[g.inference.queue[g.inference.index]];if(!p.bot)return;let traits=p.notes.traits,candidates=SUSPECTS.filter(s=>!p.notes.excludedSuspects.includes(s)&&traits.every(t=>g.traitSets[SUSPECTS.indexOf(s)].includes(t)));let ans={evidence:pick(g.rng,p.evidence.length?p.evidence:EVIDENCE),zone:ZONES.find(z=>p.notes.zones[z]===true)||pick(g.rng,ZONES),motive:p.notes.motive||pick(g.rng,MOTIVES),time:Object.keys(p.notes.times).find(t=>p.notes.times[t]==='確定')||pick(g.rng,TIMES.filter(t=>p.notes.times[t]!=='除外')),suspect:p.notes.knownSuspect||pick(g.rng,candidates.length?candidates:SUSPECTS)};infer(g,ans);return}
let p=current(g);if(!p.bot)return;if(g.phase==='roll'){roll(g);return}if(g.phase==='choice'){if(p.cards.includes('監視カメラ確認')&&g.roll>=2&&g.rng()<.35)useCard(g,'監視カメラ確認');else if(p.cards.includes('辻褄')&&g.roll>=2&&g.rng()<.35)useCard(g,'辻褄');else if(p.cards.includes('情報提供')&&g.roll>=2&&g.rng()<.35)useCard(g,'情報提供');else if(p.cards.includes('宝くじ')&&g.roll>=1&&g.rng()<.3)useCard(g,'宝くじ');else if(p.cards.includes('閃く')&&g.roll>=5&&p.evidence.includes(g.solution.evidence)&&g.board[p.pos].zone===g.solution.zone)useCard(g,'閃く');else move(g);return}if(g.phase==='informant'){if(p.coins>=300&&g.rng()<.45){let cat=['evidence','zone','motive','time','suspect'].find(k=>k==='evidence'?!p.notes.knownEvidence:k==='zone'?!Object.values(p.notes.zones).includes(true):k==='motive'?!p.notes.motive:k==='time'?!Object.values(p.notes.times).includes('確定'):!p.notes.knownSuspect);if(cat)informant(g,cat);else skipInformant(g)}else skipInformant(g);return}if(g.phase==='shop'){let t=g.board[p.pos],items=t.stock.filter(n=>(t.type!=='evidence'||!p.evidence.includes(n))&&p.coins>=(CARDS.find(c=>c.name===n)?.price||g.prices[n]));if(t.type==='evidence')items.sort((a,b)=>(p.evidence.includes(a)?1:0)-(p.evidence.includes(b)?1:0));if(items.length&&g.rng()<.8)shop(g,items[0]);else skipShop(g);return}if(g.phase==='interview-choice')interviewChoice(g,p.notes.motive?'trait':'motive')}
function publicState(g){return {...g,solution:undefined,rng:undefined,players:g.players.map(p=>({...p,notes:p.notes})),log:g.log.slice()}}
return {EVIDENCE,ZONES,MOTIVES,TIMES,SUSPECTS,TRAITS,CARDS,newGame,current,roll,move,shop,skipShop,informant,skipInformant,useCard,interviewChoice,infer,botAction,publicState,updateDeductions,suspectReasoning,makeBoard,gridCoord,gridId,neighbors,reachable,shortestDistance,pathTo,buildRoads};
});
