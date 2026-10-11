const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../street-angel.html'),'utf8');

test('game over keeps combat running but freezes pickups and stage progression; Enter exits',()=>{
 let playerTicks=0,enemyTicks=0,stops=0;
 const ctx=vm.createContext({frame:0,mode:'gameover',paused:false,banner:null,freeze:0,shake:0,
  comboT:0,lastTargetT:0,P:{x:80,y:450,hp:0,state:'idle'},enemies:[{z:0,state:'idle'}],
  items:[{x:80,y:450,k:'rice',life:100}],fx:[],hit:()=>false,
  updPlayer:()=>playerTicks++,updEnemy:()=>enemyTicks++,updWaves:()=>assert.fail('stage progressed'),
  damageVoice:{stop:()=>stops++}});
 vm.runInContext(html.slice(html.indexOf('function update(){'),html.indexOf('/* ---------- render ---------- */')),ctx);
 ctx.update();assert.equal(playerTicks,1);assert.equal(enemyTicks,1);assert.equal(ctx.P.hp,0);
 assert.equal(ctx.items[0].life,99);assert.equal(ctx.mode,'gameover');
 ctx.hit=key=>key==='Enter';ctx.update();assert.equal(ctx.mode,'title');assert.equal(stops,1);
 assert.equal(playerTicks,1);
});

test('defeated Aoi stays down at zero HP while normal death stays unchanged',()=>{
 const ctx=vm.createContext({physics:()=>{}});
 vm.runInContext(html.slice(html.indexOf('function downLogic('),html.indexOf('function startAtk(')),ctx);
 const p={kind:'player',hp:0,defeated:true,state:'down',z:0,vz:0,lt:46,t:20};
 ctx.downLogic(p);assert.equal(p.state,'down');assert.equal(p.hp,0);
 const normal={kind:'player',hp:0,state:'down',z:0,vz:0,lt:34,t:20};
 ctx.downLogic(normal);assert.equal(normal.state,'dead');
 const enemy={kind:'enemy',hp:0,state:'down',z:0,vz:0,lt:34,t:20};
 ctx.downLogic(enemy);assert.equal(enemy.state,'dead');
});

test('entry clears terminal state, supplies an enemy if needed, and disables combat controls',()=>{
 let released=0;
 const p={kind:'player',state:'dead',t:51,at:0,x:480,y:440,hp:0,lives:0,inv:40};
 const ctx=vm.createContext({P:p,mode:'play',cam:0,W:960,Y0:380,Y1:490,ST:{len:2000},enemies:[],
  banner:{},clearT:250,goT:40,freeze:10,combo:3,comboT:40,
  clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),EnemyRestraint:{release:()=>released++},
  mkEnemy:()=>({hp:40}),sfx:{ko:()=>{}},dn:()=>true,hit:()=>true});
 vm.runInContext(html.slice(html.indexOf('function enterGameOver(){'),html.indexOf('function loadStage(')),ctx);
 ctx.enterGameOver();assert.equal(ctx.mode,'gameover');assert.equal(p.defeated,true);
 assert.equal(released,1);assert.equal(ctx.enemies.length,1);assert.equal(ctx.freeze,0);assert.equal(ctx.clearT,0);
 assert.equal(p.state,'down');assert.equal(p.hp,0);assert.equal(p.lives,0);assert.equal(p.inv,0);
 vm.runInContext(html.slice(html.indexOf('function updPlayer('),html.indexOf('/* ---------- enemies ---------- */')),ctx);
 p.state='idle';p.meter=100;ctx.updPlayer(p);
 assert.equal(p.state,'idle');assert.equal(p.x,480);assert.equal(p.y,440);assert.equal(p.meter,100);
});

test('attacks hit defeated Aoi on the ground once each with bounded knockback without standing her up',()=>{
 let sparks=0,voices=0;
 const ctx=vm.createContext({freeze:0,shake:0,combo:0,EnemyRestraint:{},clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),
  spark:(x,y,z)=>{sparks++;assert.equal(z,18)},sfx:{punch(){},heavy(){},hurt(){}},damageVoice:{play:()=>voices++}});
 vm.runInContext(html.slice(html.indexOf('function strike('),html.indexOf('function spark('))+html.slice(html.indexOf('function damage('),html.indexOf('function physics(')),ctx);
 const p={kind:'player',hp:0,defeated:true,state:'down',x:480,y:440,z:0,inv:0,meter:0,lt:8};
 const e={kind:'enemy',def:{},t:5,x:440,y:440,z:0,face:1,hitSet:new Set()};
 const a={n:'punch',hs:5,he:10,reach:70,dt:24,dmg:8,down:true,kb:10,vz:9};
 ctx.strike(e,a,[p]);ctx.strike(e,a,[p]);assert.equal(sparks,1);
 e.hitSet=new Set();ctx.strike(e,a,[p]);assert.equal(sparks,2);assert.equal(voices,2);
 assert.equal(p.hp,0);assert.equal(p.state,'down');assert.equal(p.x,480);assert.equal(p.z,0);assert.equal(p.vz,4.2);assert.equal(p.vx,5);
 e.hitSet=new Set();ctx.strike(e,a,[{...p,defeated:false,hp:100}]);assert.equal(sparks,2);
});

test('defeated knockback moves through physics and settles on the ground without recovery',()=>{
 const ctx=vm.createContext({GR:.45,shake:0,fx:[],rand:()=>0});
 vm.runInContext(html.slice(html.indexOf('function physics('),html.indexOf('function startAtk(')),ctx);
 const p={kind:'player',defeated:true,state:'down',hp:0,x:480,y:440,z:0,vx:5,vz:4.2,lt:8};
 let peak=0;
 for(let i=0;i<100;i++){ctx.downLogic(p);peak=Math.max(peak,p.z)}
 assert.ok(p.x>510&&p.x<600);assert.ok(peak>10&&peak<30);
 assert.equal(p.z,0);assert.equal(p.vz,0);assert.equal(p.state,'down');assert.equal(p.hp,0);
});
