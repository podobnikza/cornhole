/* Included tournament statistics */
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

'use strict';
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current,endpoint='',loading=false;
try{endpoint=localStorage.getItem('cornhole-endpoint')||'';}catch{}
const shared=new URLSearchParams(location.search).get('source');if(shared)endpoint=shared;
$('endpoint').value=endpoint;
function example(){
 const players=['Luka','Ana','Marko','Nina','Jan','Maja','Rok','Eva','Tim','Sara','Nejc','Tina'];
 const matches=Cornhole.schedule(players,2,'liga');
 matches.slice(0,15).forEach((m,i)=>{m.sa=i%3===0?14+i%5:21+i%3;m.sb=i%3===0?21:9+i%10;});
 return {title:'Cornhole med prijatelji',mode:'liga',courts:2,players,matches,demo:true};
}
function render(data){
 if(!Array.isArray(data.players)||!Array.isArray(data.matches)||data.players.some(p=>typeof p!=='string')||new Set(data.players).size!==data.players.length)throw Error('Podatki preglednice niso v pričakovani obliki.');
 current={...data,...Cornhole.evaluate(data)};
 const courtWord=Number(data.courts)%100===1?'igrišče':Number(data.courts)%100===2?'igrišči':[3,4].includes(Number(data.courts)%100)?'igrišča':'igrišč';
 $('subtitle').textContent=`${data.title||'Cornhole turnir'} · posamezno · ${data.mode==='izpadanje'?'izpadanje':'vsak z vsakim'} · ${data.courts} ${courtWord}`;
 $('connection').textContent=data.snapshot?'POSNETEK VAŠIH REZULTATOV':data.demo?'PREDSTAVITVENI PODATKI':data.local?'LOKALNI PREIZKUS':'POVEZANO S PREGLEDNICO';
 const ranked=current.players,finished=current.matches.filter(m=>m.done&&!m.bye),total=current.matches.filter(m=>!m.bye).length;
 const pending=current.matches.filter(m=>!m.done),slot=pending.length?Math.min(...pending.map(m=>Number(m.slot))):null;
 const leaders=finished.length?ranked.filter(p=>p.rank<=3):[];
 const places=[...new Set(leaders.map(p=>p.rank))];
 $('podium').innerHTML=places.map(rank=>{const group=leaders.filter(p=>p.rank===rank),p=group[0];return `<article><span class="place">${['','🥇','🥈','🥉'][rank]} ${rank}. mesto${group.length>1?' · deljeno':''}</span><h2>${escapeHtml(group.map(p=>p.name).join(', '))}</h2><p><b>${p.wins}</b> zmag &nbsp; / &nbsp; <b>${p.points}</b> točk</p></article>`;}).join('');
 const best=key=>{const max=Math.max(0,...ranked.map(p=>p[key]));return {max,names:max?ranked.filter(p=>p[key]===max).map(p=>p.name).join(', '):'Še brez rezultatov'};};
 const wins=best('wins'),points=best('points');
 const upcoming=pending.find(m=>Number(m.slot)===slot);
 const stats=[['Odigrane tekme',`${finished.length} / ${total}`,`${ranked.length} igralcev`],['Največ zmag',wins.max,wins.names],['Največ točk',points.max,points.names],['Naslednji termin',slot===null?'Zaključeno':upcoming.week?'T'+Number(upcoming.week)+' · '+String(upcoming.slotLabel).split(' ')[0]:slot,slot===null?'Vse tekme odigrane':upcoming.week?'Teden '+Number(upcoming.week)+' · '+upcoming.slotLabel:'Dokončajte prejšnji termin pred naslednjim']];
 $('stats').innerHTML=stats.map(([label,value,note])=>`<div class="stat"><small>${label}</small><strong>${value}</strong><span>${escapeHtml(note)}</span></div>`).join('');
 $('rankRows').innerHTML=ranked.map(p=>`<tr><td>${p.rank}.</td><td><b>${escapeHtml(p.name)}</b></td><td>${p.played}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.points}</td><td>${p.against}</td></tr>`).join('');
 let notice=data.snapshot?'Prikaz poslanega razporeda in rezultatov. Za samodejno osveževanje povežite obstoječo preglednico v Nastavitvah.':data.demo?'Prikaz uporablja izmišljene rezultate. Za svoj turnir odprite Nastavitve.':data.local?'Lokalni preizkus brez povezave s preglednico. Rezultati se ne delijo med napravami.':'';
 if(data.mode==='izpadanje'){const last=current.matches[current.matches.length-1];notice+=' Pri izpadanju je lestvica statistična; prvaka določa finale.';if(last&&last.done&&!last.bye)notice+=` Prvak: ${Number(last.sa)>Number(last.sb)?last.a:last.b}.`;}
 if(current.invalid)notice+=` Opozorilo: ${current.invalid} tekem ima nepopoln ali neveljaven rezultat in ne šteje v lestvico.`;
 $('notice').textContent=notice;
 const next=pending.filter(m=>Number(m.slot)===slot),first=next[0];
 $('upNext').innerHTML=slot===null?'':`<h2>Naslednje neodigrane · ${first.week?'teden '+Number(first.week):'termin '+slot}</h2><div class="nextGrid">`+next.map(m=>`<article><small>IGRIŠČE ${Number(m.court)}</small><p>${escapeHtml(m.a)} <span>proti</span> ${escapeHtml(m.b)}</p></article>`).join('')+'</div>';
 const selectedWeek=$('weekFilter').value,weeks=[...new Set(current.matches.map(m=>m.week).filter(Boolean))].sort((a,b)=>a-b);
 $('weekFilter').innerHTML='<option value="all">Vsi tedni</option>'+weeks.map(w=>`<option value="${w}">Teden ${w}</option>`).join('');
 if(weeks.includes(Number(selectedWeek)))$('weekFilter').value=selectedWeek;
 renderMatches();
 CornholeStatistics.render(current);
}
function renderMatches(){
 if(!current)return;const filter=$('filter').value,week=$('weekFilter').value;let round=null;
 $('matchRows').innerHTML=current.matches.filter(m=>(week==='all'||Number(m.week)===Number(week))&&(filter==='all'||(filter==='done'?m.done:!m.done))).map(m=>{
 const group=m.week?'w'+m.week:m.round;
 const heading=round!==group?`<h3 class="roundTitle">${m.week?'Teden '+Number(m.week):(current.mode==='izpadanje'?'Izločilni krog ':'Krog ')+Number(m.round)}</h3>`:'';round=group;
 return heading+`<div class="match"><small>${escapeHtml(m.slotLabel||'Termin '+Number(m.slot))}<br>Igrišče ${Number(m.court)}${m.week?'<br>RR '+Number(m.round)+' · cikel '+Number(m.cycle):''}</small><span>${escapeHtml(m.a)}</span><span class="score">${m.bye?'→':m.done?`${Number(m.sa)} : ${Number(m.sb)}`:'— : —'}</span><span>${escapeHtml(m.b)}${m.error?`<br><small>${escapeHtml(m.error)}</small>`:''}</span></div>`;
 }).join('')||'<p class="muted">Ni tekem za izbrani filter.</p>';
}
function validEndpoint(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(u.pathname))throw Error('Vnesite naslov Google Apps Script aplikacije, ki se konča z /exec.');return u.href;}
async function refresh(){
 if(!endpoint||loading)return;loading=true;
 try{const url=validEndpoint(endpoint),response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Povezava ni uspela.');const data=await response.json();if(data.error)throw Error(data.error);render(data);$('updated').textContent='Osveženo '+new Date().toLocaleTimeString('sl-SI')+' · vsakih 15 s';}
 catch(e){$('connection').textContent='POVEZAVA NI USPELA';$('notice').textContent='Podatkov ni bilo mogoče osvežiti. '+e.message+' Preverite javni dostop namestitve. Prejšnji prikaz ostaja nespremenjen.';}
 finally{loading=false;}
}
function lockSettings(){
 $('settings').hidden=true;$('settingsToggle').textContent='🔒 Nastavitve';$('settingsToggle').setAttribute('aria-expanded','false');
}
$('settingsToggle').onclick=()=>{
 if(!$('settings').hidden){lockSettings();return;}
 $('unlockText').value='';$('unlockError').textContent='';$('unlockDialog').showModal();$('unlockText').focus();
};
$('unlockCancel').onclick=()=>$('unlockDialog').close();
$('unlockForm').onsubmit=e=>{
 e.preventDefault();
 if($('unlockText').value.trim()!=='ODKLENI'){$('unlockError').textContent='Za odklep vpišite ODKLENI.';return;}
 $('unlockDialog').close();$('settings').hidden=false;$('settingsToggle').textContent='🔒 Zakleni nastavitve';$('settingsToggle').setAttribute('aria-expanded','true');
 $('endpoint').focus();
};
$('connect').onclick=()=>{try{endpoint=validEndpoint($('endpoint').value.trim());try{localStorage.setItem('cornhole-endpoint',endpoint);}catch{}const u=new URL(location.href);u.searchParams.set('source',endpoint);history.replaceState(null,'',u);$('settingsMessage').textContent='Povezava je shranjena v tem brskalniku. Povezavo v naslovni vrstici delite s prijatelji.';refresh();}catch(e){$('settingsMessage').textContent=e.message;}};
$('demo').onclick=()=>{endpoint='';try{localStorage.removeItem('cornhole-endpoint');}catch{}const u=new URL(location.href);u.searchParams.delete('source');history.replaceState(null,'',u);render(example());$('updated').textContent='Primer prikaza';};
$('generate').onclick=()=>{try{const players=$('names').value.split('\n').map(s=>s.trim()).filter(Boolean),courts=Number($('courts').value),mode=$('mode').value;const matches=Cornhole.schedule(players,courts,mode);endpoint='';render({title:'Preizkus razporeda',players,courts,mode,matches,local:true});$('updated').textContent='Lokalni preizkus';$('settingsMessage').textContent=`Ustvarjeno: ${matches.length} tekem oziroma prostih prehodov. Za vnos rezultatov uporabite preglednico.`;}catch(e){$('settingsMessage').textContent=e.message;}};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});};
$('filter').onchange=renderMatches;
$('weekFilter').onchange=renderMatches;
$('playerStatsSelect').onchange=()=>{if(current)CornholeStatistics.render(current);};
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('ranking').hidden=button.dataset.tab!=='ranking';$('matches').hidden=button.dataset.tab!=='matches';$('statistics').hidden=button.dataset.tab!=='statistics';});
$('names').value=example().players.join('\n');
if(endpoint){$('connection').textContent='POVEZOVANJE …';refresh();}else render(window.CornholeSnapshot||example());
setInterval(refresh,15000);
