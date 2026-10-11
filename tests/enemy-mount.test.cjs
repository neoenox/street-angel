const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const M=require('../enemy-mount.js'),R=require('../enemy-restraint.js');
const html=fs.readFileSync(path.join(__dirname,'../street-angel.html'),'utf8');
const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
function pair(face=1,state='idle'){
 const p={kind:'player',styKey:'aoi',hp:100,state,x:480,y:440,z:0,vz:0,vx:0,face,inv:0,meter:0,t:0,at:0,lt:8};
 const e={kind:'enemy',styKey:'thug',type:'thug',hp:36,state:'idle',x:p.x-face*130,y:440,z:0,face,def:{spd:1,cd:[60,90],atks:[]},hitSet:new Set(),t:0,at:0,entered:true,cd:0};
 return [e,p];
}
function ctxFor(e,p){
 const ctx=vm.createContext({EnemyMount:M,EnemyRestraint:R,P:p,enemies:[e],ST:{len:3000,tok:2},cam:0,W:960,Y0:380,Y1:490,
  GR:.45,fx:[],rand:()=>0,ri:()=>60,pick:a=>a[0],enemyFlankTarget:()=>null,clamp,
  freeze:0,shake:0,combo:0,damageVoice:{play(){}},spark(){},sfx:{punch(){},heavy(){},hurt(){},warn(){}},hit:()=>false,dn:()=>false});
 vm.runInContext(html.slice(html.indexOf('function strike('),html.indexOf('function spark('))+html.slice(html.indexOf('function damage('),html.indexOf('/* ---------- flow ---------- */')),ctx);
 return ctx;
}
test('AI charges for 42 ticks, then tackles standing and down Aoi from both sides',()=>{
 for(const face of [-1,1])for(const state of ['idle','down']){
  const [e,p]=pair(face,state),ctx=ctxFor(e,p);
  // Down AI must prefer tackle even when a normal attack was already queued.
  if(state==='down'){e.next={n:'jab'};ctx.updEnemy(e)}else assert.ok(M.start(e,p));
  assert.equal(e.state,'mountCharge');const x=e.x;
  for(let i=0;i<41;i++)ctx.updEnemy(e);
  assert.equal(e.x,x);assert.equal(p.state,state);
  ctx.updEnemy(e);assert.equal(e.state,'mountTackle');
  for(let i=0;i<26&&e.state==='mountTackle';i++)ctx.updEnemy(e);
  assert.equal(e.state,'mounting');assert.equal(p.state,'mounted');assert.equal(p.mountedBy,e);
 }
});
test('sideways / jumping / recovery dodge works and a missed tackle has recovery',()=>{
 for(const change of [{y:475},{state:'jump',z:20},{state:'getup'}]){
  const [e,p]=pair();M.start(e,p);e.t=42;M.approach(e,p);Object.assign(p,change);
  for(let t=1;t<=26;t++){e.t=t;M.approach(e,p)}
  assert.equal(p.mountedBy,undefined);assert.equal(e.state,'idle');assert.equal(e.cd,120);
 }
 const [e,p]=pair();M.start(e,p);p.x=e.x-100;e.t=42;M.approach(e,p);assert.equal(e.vx,7);
});
test('four separated real damage hits preserve mount and end down, including zero-HP defeat mode',()=>{
 for(const defeated of [false,true]){
  const [e,p]=pair();e.x=p.x-30;if(defeated)Object.assign(p,{hp:0,defeated:true,state:'down'});
  const ctx=ctxFor(e,p);assert.ok(M.capture(e,p));
  for(let t=1;t<=234;t++){
   e.t=t;M.tick(e,p,ctx.damage);
   if(t<234)assert.equal(p.state,'mounted');
   assert.equal(e.mountHit,M.timing.hits.filter(h=>h<=t).length);
  }
  assert.equal(p.hp,defeated?0:76);assert.equal(p.state,'down');assert.equal(p.mountedBy,null);assert.equal(e.mountPlayer,null);
  assert.equal(p.vx,0);assert.equal(p.vz,0);assert.ok(p.mountCooldown>0);
 }
});
test('eight fresh presses escape, holding does not; defeated controls stay disabled',()=>{
 const [e,p]=pair();e.x=p.x-30;M.capture(e,p);
 for(let i=0;i<30;i++)M.escape(p,false);assert.equal(p.escape,0);
 for(let i=0;i<7;i++)M.escape(p,true);assert.equal(p.state,'mounted');
 M.escape(p,true);assert.equal(p.state,'down');assert.equal(e.state,'idle');
 p.defeated=true;p.mountCooldown=0;M.capture(e,p);
 for(let i=0;i<20;i++)M.escape(p,true);assert.equal(p.escape,0);
});
test('normal grounded Aoi waits for input and gets up; airborne and defeated Aoi do not',()=>{
 const [e,p]=pair(1,'down'),ctx=ctxFor(e,p);
 for(let i=0;i<120;i++)ctx.updPlayer(p);assert.equal(p.state,'down');
 ctx.hit=(...keys)=>keys.includes('KeyZ');ctx.updPlayer(p);assert.equal(p.state,'getup');
 p.state='down';p.z=15;p.vz=1;ctx.updPlayer(p);assert.equal(p.state,'down');
 Object.assign(p,{defeated:true,hp:0,z:0,vz:0});ctx.updPlayer(p);assert.equal(p.state,'down');
});
test('mount rejects other captors, airborne/protected/other enemy types and interrupts safely',()=>{
 for(const change of [{heldBy:{}},{mountedBy:{}},{inv:1},{z:10},{state:'restrained'},{state:'getup'},{mountCooldown:10}]){
  const [e,p]=pair();e.x=p.x-30;Object.assign(p,change);assert.equal(M.capture(e,p),false);
 }
 const [e,p]=pair();e.type='yankee';assert.equal(M.start(e,p),false);e.type='thug';e.x=p.x-30;M.capture(e,p);
 e.state='hurt';M.escape(p,false);assert.equal(p.state,'down');assert.equal(e.state,'hurt');
});
test('third-party punches keep mount, lethal hits and hitting the mounted thug release it',()=>{
 for(const target of ['player','enemy']){
  const [e,p]=pair();e.x=p.x-30;const ctx=ctxFor(e,p);M.capture(e,p);
  if(target==='player'){
   ctx.damage(p,{...e,mountPlayer:null},{dmg:6,down:true,kb:12});assert.equal(p.state,'mounted');
   ctx.damage(p,{...e,mountPlayer:null},{dmg:100});assert.equal(p.mountedBy,null);assert.equal(p.hp,0);
  }else{
   e.maxhp=36;e.def.score=0;Object.assign(ctx,{comboT:0,score:0,lastTargetT:0});
   ctx.damage(e,{...p,kind:'player'},{dmg:5});assert.equal(p.mountedBy,null);assert.equal(e.mountPlayer,null);assert.equal(e.state,'hurt');
  }
 }
});
test('mount poses share every hit window and return to windup between punches',()=>{
 const [e,p]=pair();e.x=p.x-30;M.capture(e,p);
 for(const t of M.timing.hits){e.t=t;assert.equal(M.frame(e),3);assert.equal(M.frame(p),5);e.t=t+10;assert.equal(M.frame(e),2);assert.equal(M.frame(p),4)}
});
test('fresh input during production hit-stop escapes without advancing attack time',()=>{
 const [e,p]=pair();e.x=p.x-30;M.capture(e,p);p.escape=7;e.t=36;
 const ctx=ctxFor(e,p);Object.assign(ctx,{frame:0,mode:'play',paused:false,banner:null,freeze:8,comboT:0,lastTargetT:0,hit:(...keys)=>keys.includes('KeyZ')});
 vm.runInContext(html.slice(html.indexOf('function update(){'),html.indexOf('/* ---------- render ---------- */')),ctx);
 ctx.update();assert.equal(p.state,'down');assert.equal(p.mountedBy,null);assert.equal(e.state,'idle');assert.equal(ctx.freeze,7);
});
test('linked mount draws as a group behind an unrelated foreground fighter',()=>{
 const [e,p]=pair();e.x=p.x-30;M.capture(e,p);const front={state:'idle',y:p.y+8,name:'front'},draws=[];
 p.name='aoi';e.name='thug';
 const ctx=vm.createContext({drawMount:x=>{draws.push(x.name);return true},drawRestraint:x=>{draws.push(x.name);return true},warn(){}});
 vm.runInContext(html.slice(html.indexOf('function drawCharacters('),html.indexOf('function shadow(')),ctx);
 ctx.drawCharacters([front,e,p]);assert.deepEqual(draws,['aoi','thug','front']);
});
