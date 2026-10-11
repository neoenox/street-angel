const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../enemy-restraint.js');
test('each enemy captures from its own side and keeps its hold aligned on both facings',()=>{
 for(const type of ['thug','yankee','brute','boss'])for(const face of [-1,1]){
  const p={x:300,y:440,z:0,hp:100,state:'idle',face};
  const front=type==='yankee',e={type,hp:40,state:'attack',x:p.x+face*(front?35:-35),y:440};
  assert.equal(R.capture(e,p),true,type);
  assert.equal(e.face,front?-face:face);assert.equal(p.face,face);
  assert.equal(R.style(e),{thug:'rearWrist',yankee:'collar',brute:'bearhug',boss:'armlock'}[type]);
  p.x+=20;R.align(e,p);assert.equal(Math.sign((e.x-p.x)*face),front?1:-1);
  const helper={type:'thug',def:{},hp:30,z:0};
  assert.equal(R.canAssist(helper,p),!front);
  if(!front){
   Object.assign(helper,{x:p.x+face*R.assistDistance(helper,p),y:p.y,state:'idle'});
   assert.equal(R.startAssist(helper,p),true);
   const hits=[];for(const t of R.assistHits){helper.t=t;R.tickAssist(helper,p,(_,__,a)=>hits.push(a.dmg))}
   assert.deepEqual(hits,[6,6,6,6]);R.endAssist(p);
  }
  for(let i=0;i<8;i++)R.tick(p,true);
  assert.equal(p.heldBy,null);assert.equal(e.heldPlayer,null);assert.equal(p.state,'idle');
  p.restraintCooldown=0;e.x=p.x+face*(front?-35:35);
  assert.equal(R.capture(e,p),false);
 }
});
test('enemy AI chooses the collar and boss arm lock without reusing rear-only eligibility',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 for(const type of ['yankee','boss'])for(const face of [-1,1]){
  const p={kind:'player',x:300,y:440,z:0,hp:100,state:'idle',face};
  const e={kind:'enemy',type,styKey:type,hp:80,state:'idle',x:300+face*(type==='yankee'?35:-35),y:440,z:0,cd:0,t:0,at:0,face:-face,entered:true,next:R.attack,def:{boss:type==='boss',spd:1,atks:[]}};
  const ctx=vm.createContext({P:p,EnemyRestraint:R,enemyFlankTarget:()=>null,enemies:[e],ST:{tok:2,len:3000},cam:0,W:960,Y0:400,Y1:500,tokens:()=>0,clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),pick:a=>a[0],sfx:{warn(){}},damage(){throw Error('hold should not deal damage')}});
  vm.runInContext(html.slice(html.indexOf('function strike(a,A,targets){'),html.indexOf('function spark('))+html.slice(html.indexOf('function steer('),html.indexOf('/* ---------- flow ---------- */')),ctx);
  ctx.updEnemy(e);assert.equal(e.state,'holding');assert.equal(p.heldBy,e);
 }
});
test('new holds respect protection, interruption and zero-HP defeat recovery rules',()=>{
 for(const type of ['yankee','brute','boss']){
  const pair=()=>{
   const p={x:300,y:440,z:0,hp:100,state:'idle',face:1};
   return [{type,hp:40,state:'attack',x:type==='yankee'?335:265,y:440},p];
  };
  for(const change of [{inv:1},{z:1},{restraintCooldown:10},{state:'mounted'},{state:'down'}]){
   const [e,p]=pair();Object.assign(p,change);assert.equal(R.capture(e,p),false);
  }
  const [e,p]=pair();Object.assign(p,{hp:0,defeated:true,state:'down'});
  assert.equal(R.capture(e,p),true);e.state='hurt';R.tick(p,false);
  assert.equal(p.state,'down');assert.equal(p.hp,0);assert.equal(p.heldBy,null);
  const [a,b]=pair();R.capture(a,b);b.t=180;R.tick(b,false);
  assert.equal(b.state,'idle');assert.equal(b.restraintExit,0);assert.equal(a.restraintExit,0);
 }
});
