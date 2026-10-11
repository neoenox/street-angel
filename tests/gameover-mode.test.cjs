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

test('defeated Aoi recovers from a down at zero HP while normal death stays unchanged',()=>{
 const ctx=vm.createContext({physics:()=>{}});
 vm.runInContext(html.slice(html.indexOf('function downLogic('),html.indexOf('function startAtk(')),ctx);
 const p={kind:'player',hp:0,defeated:true,state:'down',z:0,vz:0,lt:46,t:20};
 ctx.downLogic(p);assert.equal(p.state,'getup');assert.equal(p.hp,0);
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
 assert.equal(p.state,'getup');assert.equal(p.hp,0);assert.equal(p.lives,0);assert.equal(p.inv,0);
 vm.runInContext(html.slice(html.indexOf('function updPlayer('),html.indexOf('/* ---------- enemies ---------- */')),ctx);
 p.state='idle';p.meter=100;ctx.updPlayer(p);
 assert.equal(p.state,'idle');assert.equal(p.x,480);assert.equal(p.y,440);assert.equal(p.meter,100);
});
