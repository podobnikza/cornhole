(function(root){
 'use strict';
 function schedule(names,courts,mode){
  if(names.length<2)throw Error('Vnesite vsaj dva igralca.');
  if(new Set(names).size!==names.length)throw Error('Imena igralcev morajo biti različna.');
  if(names.some(n=>n==='PROSTO'||/^Zmagovalec #/.test(n)))throw Error('Ime PROSTO in oznake Zmagovalec # so rezervirane za razpored.');
  courts=Number(courts);if(!Number.isInteger(courts)||courts<1)throw Error('Število igrišč mora biti pozitivno celo število.');
  let matches=[],id=1;
  const add=(r,slot,c,a,b)=>matches.push({id:id++,round:r,slot,court:c,a,b,sa:'',sb:''});
  if(mode==='izpadanje'){
   let size=2;while(size<names.length)size*=2;
   const byes=size-names.length,first=[];
   let p=0;
   for(let i=0;i<size/2;i++){
    const a=names[p++],b=i<byes?'PROSTO':names[p++];
    add(1,Math.floor(i/courts)+1,i%courts+1,a,b);first.push(matches[matches.length-1].id);
   }
   let prev=first,r=2,slot=Math.ceil(first.length/courts)+1;
   while(prev.length>1){let next=[];for(let i=0;i<prev.length;i+=2){add(r,slot+Math.floor(i/2/courts),(i/2)%courts+1,'Zmagovalec #'+prev[i],'Zmagovalec #'+prev[i+1]);next.push(matches[matches.length-1].id);}slot+=Math.ceil(next.length/courts);prev=next;r++;}
   return matches;
  }
  let ring=names.slice();if(ring.length%2)ring.push(null);
  let slot=1;
  for(let r=1;r<ring.length;r++){
   let pairs=[];for(let i=0;i<ring.length/2;i++){let a=ring[i],b=ring[ring.length-1-i];if(a&&b)pairs.push([a,b]);}
   // Rotate the order within rounds so the same players do not always play first.
   const shift=(r-1)%pairs.length;pairs=pairs.slice(shift).concat(pairs.slice(0,shift));
   pairs.forEach((p,i)=>add(r,slot+Math.floor(i/courts),i%courts+1,p[0],p[1]));
   slot+=Math.ceil(pairs.length/courts);ring.splice(1,0,ring.pop());
  }
  return matches;
 }
 function evaluate(data){
  const players=data.players.map(name=>({name,played:0,wins:0,losses:0,points:0,against:0,rank:null}));
  const lookup=Object.fromEntries(players.map(p=>[p.name,p]));const winners={};let invalid=0;
  const matches=data.matches.map(m=>{
   const resolve=n=>/^Zmagovalec #\d+$/.test(n)?winners[n.split('#')[1]]||n:n;
   const x={...m,a:resolve(m.a),b:resolve(m.b),done:false,error:''};
   if(x.b==='PROSTO'){winners[x.id]=x.a;x.done=true;x.bye=true;return x;}
   const blank=v=>v===''||v===null||v===undefined;
   if(blank(x.sa)&&blank(x.sb))return x;
   if(blank(x.sa)||blank(x.sb)){x.error='Nezaključen vnos';invalid++;return x;}
   const a=Number(x.sa),b=Number(x.sb);
   if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b||!lookup[x.a]||!lookup[x.b]){x.error='Preverite rezultat in igralca';invalid++;return x;}
   x.done=true;winners[x.id]=a>b?x.a:x.b;
   [[x.a,a,b],[x.b,b,a]].forEach(([name,pts,opp])=>{let p=lookup[name];p.played++;p.points+=pts;p.against+=opp;p.wins+=pts>opp?1:0;p.losses+=pts<opp?1:0;});return x;
  });
  players.sort((a,b)=>b.wins-a.wins||b.points-a.points||a.name.localeCompare(b.name,'sl'));
  players.forEach((p,i)=>{p.rank=i&&p.wins===players[i-1].wins&&p.points===players[i-1].points?players[i-1].rank:i+1;});
  return {players,matches,invalid};
 }
 const api={schedule,evaluate};if(typeof module!=='undefined')module.exports=api;root.Cornhole=api;
})(typeof globalThis!=='undefined'?globalThis:this);
