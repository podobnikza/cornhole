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
 $('connection').textContent=data.demo?'PREDSTAVITVENI PODATKI':data.local?'LOKALNI PREIZKUS':'POVEZANO S PREGLEDNICO';
 const ranked=current.players,finished=current.matches.filter(m=>m.done&&!m.bye),total=current.matches.filter(m=>!m.bye).length;
 const pending=current.matches.filter(m=>!m.done),slot=pending.length?Math.min(...pending.map(m=>Number(m.slot))):null;
 const leaders=finished.length?ranked.filter(p=>p.rank<=3):[];
 const places=[...new Set(leaders.map(p=>p.rank))];
 $('podium').innerHTML=places.map(rank=>{const group=leaders.filter(p=>p.rank===rank),p=group[0];return `<article><span class="place">${['','🥇','🥈','🥉'][rank]} ${rank}. mesto${group.length>1?' · deljeno':''}</span><h2>${escapeHtml(group.map(p=>p.name).join(', '))}</h2><p><b>${p.wins}</b> zmag &nbsp; / &nbsp; <b>${p.points}</b> točk</p></article>`;}).join('');
 const best=key=>{const max=Math.max(0,...ranked.map(p=>p[key]));return {max,names:max?ranked.filter(p=>p[key]===max).map(p=>p.name).join(', '):'Še brez rezultatov'};};
 const wins=best('wins'),points=best('points');
 const stats=[['Odigrane tekme',`${finished.length} / ${total}`,`${ranked.length} igralcev`],['Največ zmag',wins.max,wins.names],['Največ točk',points.max,points.names],['Naslednji termin',slot===null?'Zaključeno':slot,slot===null?'Vse tekme odigrane':'Dokončajte prejšnji termin pred naslednjim']];
 $('stats').innerHTML=stats.map(([label,value,note])=>`<div class="stat"><small>${label}</small><strong>${value}</strong><span>${escapeHtml(note)}</span></div>`).join('');
 $('rankRows').innerHTML=ranked.map(p=>`<tr><td>${p.rank}.</td><td><b>${escapeHtml(p.name)}</b></td><td>${p.played}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.points}</td><td>${p.against}</td></tr>`).join('');
 let notice=data.demo?'Prikaz uporablja izmišljene rezultate. Za svoj turnir odprite Nastavitve.':data.local?'Lokalni preizkus brez povezave s preglednico. Rezultati se ne delijo med napravami.':'';
 if(data.mode==='izpadanje'){const last=current.matches[current.matches.length-1];notice+=' Pri izpadanju je lestvica statistična; prvaka določa finale.';if(last&&last.done&&!last.bye)notice+=` Prvak: ${Number(last.sa)>Number(last.sb)?last.a:last.b}.`;}
 if(current.invalid)notice+=` Opozorilo: ${current.invalid} tekem ima nepopoln ali neveljaven rezultat in ne šteje v lestvico.`;
 $('notice').textContent=notice;
 $('upNext').innerHTML=slot===null?'':`<h2>Na vrsti · termin ${slot}</h2><div class="nextGrid">`+pending.filter(m=>Number(m.slot)===slot).map(m=>`<article><small>IGRIŠČE ${Number(m.court)} · TEKMA #${Number(m.id)}</small><p>${escapeHtml(m.a)} <span>proti</span> ${escapeHtml(m.b)}</p></article>`).join('')+'</div>';
 renderMatches();
}
function renderMatches(){
 if(!current)return;const filter=$('filter').value;let round=null;
 $('matchRows').innerHTML=current.matches.filter(m=>filter==='all'||(filter==='done'?m.done:!m.done)).map(m=>{
 const heading=round!==m.round?`<h3 class="roundTitle">${current.mode==='izpadanje'?'Izločilni krog':'Krog'} ${Number(m.round)}</h3>`:'';round=m.round;
 return heading+`<div class="match"><small>#${Number(m.id)} · termin ${Number(m.slot)}<br>Igrišče ${Number(m.court)}</small><span>${escapeHtml(m.a)}</span><span class="score">${m.bye?'→':m.done?`${Number(m.sa)} : ${Number(m.sb)}`:'— : —'}</span><span>${escapeHtml(m.b)}${m.error?`<br><small>${escapeHtml(m.error)}</small>`:''}</span></div>`;
 }).join('')||'<p class="muted">Ni tekem za izbrani filter.</p>';
}
function validEndpoint(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(u.pathname))throw Error('Vnesite naslov Google Apps Script aplikacije, ki se konča z /exec.');return u.href;}
async function refresh(){
 if(!endpoint||loading)return;loading=true;
 try{const url=validEndpoint(endpoint),response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Povezava ni uspela.');const data=await response.json();if(data.error)throw Error(data.error);render(data);$('updated').textContent='Osveženo '+new Date().toLocaleTimeString('sl-SI')+' · vsakih 15 s';}
 catch(e){$('connection').textContent='POVEZAVA NI USPELA';$('notice').textContent='Podatkov ni bilo mogoče osvežiti. '+e.message+' Preverite javni dostop namestitve. Prejšnji prikaz ostaja nespremenjen.';}
 finally{loading=false;}
}
$('settingsToggle').onclick=()=>{$('settings').hidden=!$('settings').hidden;};
$('connect').onclick=()=>{try{endpoint=validEndpoint($('endpoint').value.trim());try{localStorage.setItem('cornhole-endpoint',endpoint);}catch{}const u=new URL(location.href);u.searchParams.set('source',endpoint);history.replaceState(null,'',u);$('settingsMessage').textContent='Povezava je shranjena v tem brskalniku. Povezavo v naslovni vrstici delite s prijatelji.';refresh();}catch(e){$('settingsMessage').textContent=e.message;}};
$('demo').onclick=()=>{endpoint='';try{localStorage.removeItem('cornhole-endpoint');}catch{}const u=new URL(location.href);u.searchParams.delete('source');history.replaceState(null,'',u);render(example());$('updated').textContent='Primer prikaza';};
$('generate').onclick=()=>{try{const players=$('names').value.split('\n').map(s=>s.trim()).filter(Boolean),courts=Number($('courts').value),mode=$('mode').value;const matches=Cornhole.schedule(players,courts,mode);endpoint='';render({title:'Preizkus razporeda',players,courts,mode,matches,local:true});$('updated').textContent='Lokalni preizkus';$('settingsMessage').textContent=`Ustvarjeno: ${matches.length} tekem oziroma prostih prehodov. Za vnos rezultatov uporabite preglednico.`;}catch(e){$('settingsMessage').textContent=e.message;}};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});};
$('filter').onchange=renderMatches;
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('ranking').hidden=button.dataset.tab!=='ranking';$('matches').hidden=button.dataset.tab!=='matches';});
$('names').value=example().players.join('\n');
if(endpoint){$('connection').textContent='POVEZOVANJE …';refresh();}else render(example());
setInterval(refresh,15000);
