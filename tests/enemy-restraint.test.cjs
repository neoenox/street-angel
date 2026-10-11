const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../enemy-restraint.js');
test('enemy AI grabs on its first close-range update without entering windup',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 const [e,p]=pair();Object.assign(e,{kind:'enemy',type:'thug',face:-1,x:235,y:450,z:0,t:0,at:0,flash:0,entered:true,cd:0,next:R.attack,def:{spd:1,atks:[]}});
 Object.assign(p,{kind:'player'});e.state='idle';
 const ctx=vm.createContext({P:p,EnemyRestraint:R,ST:{tok:2,len:3000},cam:0,W:960,Y0:400,Y1:500,tokens:()=>0,
 clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),pick:a=>a[0],sfx:{warn(){}},damage(){throw Error('grabs must not damage')}});
 vm.runInContext(html.slice(html.indexOf('function strike(a,A,targets){'),html.indexOf('function spark('))+html.slice(html.indexOf('function steer('),html.indexOf('/* ---------- flow ---------- */')),ctx);
 ctx.updEnemy(e);assert.equal(e.state,'holding');assert.equal(p.state,'restrained');assert.equal(p.t,0);assert.equal(R.attack.wind,0);assert.equal(R.attack.hs,0);
 R.release(p);p.restraintCooldown=0;p.face=1;e.x=235;e.state='idle';e.cd=0;e.next=R.attack;
 e.def.atks=[{n:'jab',wind:18,range:60,dt:22}];ctx.updEnemy(e);
 assert.equal(p.state,'idle');assert.equal(e.atk.n,'jab');assert.equal(e.state,'windup');
 // A front-selected punch is replaced once the thug gets behind Aoi.
 for(const face of [-1,1])for(const next of [null,e.def.atks[0]]){
  p.face=face;p.restraintCooldown=0;e.x=p.x-face*35;e.state='idle';e.cd=0;e.next=next;
  ctx.updEnemy(e);assert.equal(e.state,'holding');assert.equal(p.state,'restrained');
  R.release(p);
 }
 // During the recapture cooldown the ordinary punch remains available.
 p.face=1;e.x=p.x-35;e.state='idle';e.cd=0;e.next=null;
 ctx.updEnemy(e);assert.equal(e.atk.n,'jab');assert.equal(e.state,'windup');
 // A punch already in progress also becomes a grab when it lands from behind.
 p.restraintCooldown=0;e.t=5;e.face=1;e.hitSet=new Set();e.state='attack';
 ctx.strike(e,{n:'jab',hs:5,he:11,reach:70,dt:22},[p]);
 assert.equal(e.state,'holding');assert.equal(p.state,'restrained');assert.equal(p.hp,100);
 // A queued or already-started grab by a second enemy becomes a real punch.
 p.assistUsed=true; // Once a front combo has been used, other enemies use normal attacks.
 const jab={n:'jab',wind:18,dur:28,hs:5,he:11,reach:70,range:60,dt:22,dmg:6};
 for(const state of ['idle','windup','attack']){
  const other={...e,heldPlayer:null,def:{spd:1,atks:[jab]},x:p.x-35,face:1,state,cd:0,next:R.attack,atk:R.attack,t:0,hitSet:new Set()};
  ctx.updEnemy(other);assert.equal(other.atk.n,'jab');assert.equal(other.state,'windup');assert.equal(p.heldBy,e);
 }
 const other={...e,heldPlayer:null,type:'thug',x:p.x-35,face:1,state:'attack',t:5,hitSet:new Set()};
 ctx.damage=(target,attacker,attack)=>{target.hp-=attack.dmg};
 ctx.strike(other,jab,[p]);assert.equal(p.hp,94);assert.equal(p.heldBy,e);assert.equal(e.heldPlayer,p);
});
function pair(){return [{hp:36,state:'attack',x:235,y:450,face:-1},{hp:100,state:'idle',x:200,y:450,face:-1,z:0,inv:0,vx:3,vz:0,t:0}]}
test('real damage preserves restraint, timer and escape progress until lethal damage',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 const ctx=vm.createContext({EnemyRestraint:R,freeze:0,shake:0,combo:0,spark(){},sfx:{hurt(){},punch(){},heavy(){}},damageVoice:{play(){}}});
 vm.runInContext(html.slice(html.indexOf('function damage(t,a,A){'),html.indexOf('function physics(e){')),ctx);
 const [e,p]=pair();p.kind='player';p.meter=0;R.capture(e,p);p.t=80;p.escape=4;
 const a={kind:'enemy',def:{},x:170,hitSet:new Set()};
 for(const down of [false,true,false,true]){
  ctx.damage(p,a,{dmg:6,down,kb:10,vz:8});
  assert.equal(p.state,'restrained');assert.equal(p.heldBy,e);assert.equal(e.heldPlayer,p);
  assert.equal(p.t,80);assert.equal(p.escape,4);assert.equal(p.face,-1);assert.equal(p.vx,0);assert.equal(p.vz,0);assert.equal(p.inv,0);
 }
 assert.equal(p.hp,76);R.tick(p,false);assert.equal(p.heldBy,e);
 ctx.damage(p,a,{dmg:100});assert.equal(p.hp,0);assert.equal(p.heldBy,null);assert.equal(e.heldPlayer,null);assert.equal(p.state,'down');
});
test('captor stays behind the player, facing the same direction on either side',()=>{
 for(const type of ['thug','yankee','brute'])for(const face of [-1,1]){
  const [e,p]=pair();p.face=face;Object.assign(e,{type,face,x:p.x-face*35});assert.equal(R.capture(e,p),true);
  assert.equal(p.face,face);assert.ok((p.x-e.x)*face>0);assert.equal(e.y,p.y);
  p.x+=10;R.align(e,p);assert.ok((p.x-e.x)*face>0);
 }
});
test('front, side and out-of-range grabs fail without turning or moving the player',()=>{
 for(const face of [-1,1])for(const offset of [35,0,-7,-45]){
  const [e,p]=pair();p.face=face;e.x=p.x+face*offset;
  assert.equal(R.capture(e,p),false);assert.equal(p.state,'idle');assert.equal(p.face,face);assert.equal(p.x,200);
 }
 const [e,p]=pair();p.face=1;e.x=165;assert.equal(R.isBehind(e,p),true);p.face=-1;
 assert.equal(R.capture(e,p),false);
});
test('capture holds in place without damage, throwing, or invulnerability',()=>{
 const [e,p]=pair();assert.equal(R.capture(e,p),true);assert.equal(p.state,'restrained');assert.equal(e.state,'holding');assert.equal(p.hp,100);assert.equal(p.x,200);assert.equal(p.vx,0);
 p.t=180;R.tick(p,false);assert.equal(p.state,'idle');assert.equal(p.inv,0);assert.equal(p.z,0);assert.equal(e.state,'idle');assert.equal(R.capture(e,p),false);
});
test('eight separate presses escape; holding a key does not advance progress',()=>{
 const [e,p]=pair();R.capture(e,p);for(let i=0;i<30;i++)R.tick(p,false);assert.equal(p.escape,0);
 for(let i=0;i<7;i++)R.tick(p,true);assert.equal(p.state,'restrained');R.tick(p,true);assert.equal(p.state,'idle');assert.equal(p.heldBy,null);assert.equal(e.heldPlayer,null);
});
test('airborne, protected, downed and already held players cannot be captured',()=>{
 for(const change of [{z:1},{inv:1},{state:'down'},{state:'getup'},{state:'dead'},{restraintCooldown:1}]){
 const [e,p]=pair();Object.assign(p,change);assert.equal(R.capture(e,p),false);
 }
 const [e,p]=pair();R.capture(e,p);assert.equal(R.capture({hp:30,state:'attack'},p),false);
});
test('interrupting either fighter releases the link without replacing hit reactions',()=>{
 const [e,p]=pair();R.capture(e,p);e.state='hurt';R.tick(p,false);assert.equal(p.state,'idle');assert.equal(e.state,'hurt');
 const [e2,p2]=pair();R.capture(e2,p2);p2.state='down';R.tick(p2,false);assert.equal(p2.state,'down');assert.equal(e2.state,'idle');
});
