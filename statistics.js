(function(root){
 'use strict';
 function calculate(state,name){
  const games=state.matches.filter(m=>m.done&&!m.bye).slice().sort((a,b)=>Number(a.slot)-Number(b.slot)||Number(a.id)-Number(b.id));
  const total=state.matches.filter(m=>!m.bye).length;
  const sum=games.reduce((s,m)=>s+Number(m.sa)+Number(m.sb),0),margin=games.reduce((s,m)=>s+Math.abs(Number(m.sa)-Number(m.sb)),0);
  const player=state.players.find(p=>p.name===name);
  const personal=games.filter(m=>m.a===name||m.b===name).map(m=>({...m,opponent:m.a===name?m.b:m.a,scored:Number(m.a===name?m.sa:m.sb),conceded:Number(m.a===name?m.sb:m.sa)})).map(m=>({...m,won:m.scored>m.conceded}));
  let longest=0,run=0;personal.forEach(m=>{run=m.won?run+1:0;longest=Math.max(longest,run);});
  let streak=0;for(let i=personal.length-1;i>=0&&personal[i].won===personal[personal.length-1].won;i--)streak++;
  const opponents=state.players.filter(p=>p.name!==name).map(p=>{
   const versus=personal.filter(m=>m.opponent===p.name);
   return {name:p.name,played:versus.length,wins:versus.filter(m=>m.won).length,points:versus.reduce((s,m)=>s+m.scored,0),against:versus.reduce((s,m)=>s+m.conceded,0),remaining:state.matches.filter(m=>!m.done&&!m.bye&&((m.a===name&&m.b===p.name)||(m.b===name&&m.a===p.name))).length};
  });
  const weeks=[...new Set(personal.map(m=>m.week).filter(Boolean))].sort((a,b)=>a-b).map(week=>{const list=personal.filter(m=>m.week===week);return {week,played:list.length,wins:list.filter(m=>m.won).length,points:list.reduce((s,m)=>s+m.scored,0),against:list.reduce((s,m)=>s+m.conceded,0)};});
  return {games,total,sum,average:games.length?sum/games.length:null,averageMargin:games.length?margin/games.length:null,close:games.filter(m=>Math.abs(Number(m.sa)-Number(m.sb))<=3).length,player,personal,longest,streak,opponents,weeks,
   closest:games.slice().sort((a,b)=>Math.abs(a.sa-a.sb)-Math.abs(b.sa-b.sb)).slice(0,3),
   biggest:games.slice().sort((a,b)=>Math.abs(b.sa-b.sb)-Math.abs(a.sa-a.sb)).slice(0,3)};
 }
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>n===null||n===undefined?'—':Number(n).toLocaleString('sl-SI',{maximumFractionDigits:1});
 const rate=(a,b)=>b?number(100*a/b)+' %':'—';
 const card=(label,value,note)=>`<article class="metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(note||'')}</p></article>`;
 function render(state){
  const select=document.getElementById('playerStatsSelect'),old=select.value;
  select.innerHTML=state.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'sl')).map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
  if(state.players.some(p=>p.name===old))select.value=old;
  else if(state.players.length)select.value=state.players[0].name;
  const s=calculate(state,select.value),p=s.player,n=s.personal.length;
  document.getElementById('globalMetrics').innerHTML=[card('Odigrano',`${s.games.length} / ${s.total}`,`${rate(s.games.length,s.total)} razporeda`),card('Dosežene točke skupaj',number(s.sum),'Vsota obeh igralcev na zaključenih tekmah'),card('Povprečje točk na tekmo',number(s.average),'Seštevek obeh igralcev'),card('Povprečna razlika',number(s.averageMargin),`${s.close} tekem z razliko največ 3 točke`)].join('');
  const gameList=list=>list.length?list.map(m=>`<div class="statGame"><span>${esc(m.a)} <b>${Number(m.sa)} : ${Number(m.sb)}</b> ${esc(m.b)}</span><small>${m.week?'Teden '+Number(m.week)+' · ':''}razlika ${Math.abs(m.sa-m.sb)}</small></div>`).join(''):'<p class="muted">Še ni zaključenih tekem.</p>';
  document.getElementById('closestGames').innerHTML=gameList(s.closest);document.getElementById('biggestGames').innerHTML=gameList(s.biggest);
  const compared=state.players.filter(p=>p.played).slice().sort((a,b)=>b.points/b.played-a.points/a.played||a.name.localeCompare(b.name,'sl'));
  document.getElementById('averagesRows').innerHTML=compared.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.played}</td><td>${rate(p.wins,p.played)}</td><td>${number(p.points/p.played)}</td><td>${number(p.against/p.played)}</td><td>${number((p.points-p.against)/p.played)}</td></tr>`).join('')||'<tr><td colspan="6">Še ni zaključenih tekem.</td></tr>';
  if(!p){document.getElementById('personalMetrics').innerHTML='<p>Ni igralcev.</p>';document.getElementById('playerForm').innerHTML='';document.getElementById('opponentsRows').innerHTML='';document.getElementById('weeklyRows').innerHTML='';return;}
  const best=s.personal.length?Math.max(...s.personal.map(m=>m.scored)):null;
  document.getElementById('personalMetrics').innerHTML=[card('Uspešnost',rate(p.wins,n),`${p.wins} zmag / ${p.losses} porazov`),card('Dosežene / tekmo',number(n?p.points/n:null),`${p.points} doseženih točk skupaj`),card('Prejete / tekmo',number(n?p.against/n:null),`${p.against} prejetih točk skupaj`),card('Razlika / tekmo',number(n?(p.points-p.against)/n:null),`Skupna razlika ${p.points-p.against}`),card('Največ točk na tekmi',number(best),'Med zaključenimi tekmami'),card('Najdaljši niz zmag',n?s.longest:'—','Po vrstnem redu razporeda'),card('Trenutni niz',n?`${s.streak} ${s.personal[n-1].won?'zmag':'porazov'}`:'—','Na koncu odigranih tekem v razporedu'),card('Preostale tekme',state.matches.filter(m=>!m.done&&!m.bye&&(m.a===p.name||m.b===p.name)).length,`${n} že odigranih tekem`)].join('');
  document.getElementById('playerForm').innerHTML=n?s.personal.slice(-5).map(m=>`<div class="formGame"><span class="resultBadge ${m.won?'win':'loss'}">${m.won?'Z':'P'}</span><span>${esc(m.opponent)}<small>${m.week?'Teden '+Number(m.week)+' · ':''}${m.scored} : ${m.conceded}</small></span></div>`).join(''):'<p class="muted">Igralec še nima zaključenih tekem.</p>';
  document.getElementById('opponentsRows').innerHTML=s.opponents.map(o=>`<tr><td>${esc(o.name)}</td><td>${o.played}</td><td>${o.wins}</td><td>${o.played-o.wins}</td><td>${o.played?o.points+' : '+o.against:'—'}</td><td>${o.remaining}</td></tr>`).join('');
  document.getElementById('weeklyRows').innerHTML=s.weeks.map(w=>`<tr><td>Teden ${w.week}</td><td>${w.played}</td><td>${w.wins}</td><td>${rate(w.wins,w.played)}</td><td>${number(w.points/w.played)}</td><td>${number(w.against/w.played)}</td></tr>`).join('')||'<tr><td colspan="6">Še ni zaključenih tekem po tednih.</td></tr>';
 }
 if(typeof module!=='undefined')module.exports={calculate};root.CornholeStatistics={calculate,render};
})(typeof globalThis!=='undefined'?globalThis:this);
