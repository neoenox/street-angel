const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../enemy-restraint.js');
const {assistFrame}=require('../character-motion.js');
function scene(face=1,type='thug'){
 const p={kind:'player',x:300,y:440,z:0,face,hp:100,inv:0,state:'idle',t:0};
 const rear={x:300-face*35,y:440,z:0,hp:40,state:'attack',type:'thug'};
 assert.equal(R.capture(rear,p),true);
 const front={x:300+face*R.assistDistance({type}),y:440,z:0,hp:40,state:'idle',type,def:{}};
 return {p,rear,front};
}
test('front support grabs in both directions, lands exactly four six-damage hits and leaves',()=>{
 for(const face of [-1,1])for(const type of ['thug','yankee','brute']){
  const {p,rear,front}=scene(face,type);assert.equal(R.startAssist(front,p),true);
  assert.equal(front.face,-face);assert.equal(p.heldBy,rear);assert.equal(p.assistedBy,front);
  const hits=[];
  for(let t=1;t<=230;t++){front.t=t;R.tickAssist(front,p,(p,e,a)=>{hits.push(t);p.hp-=a.dmg});}
  assert.deepEqual(hits,[30,78,126,174]);assert.equal(p.hp,76);assert.equal(p.assistedBy,null);assert.equal(front.assistPlayer,null);
  assert.equal(front.state,'idle');assert.equal(p.heldBy,null);assert.equal(rear.heldPlayer,null);assert.equal(rear.state,'idle');
  assert.equal(p.state,'down');assert.equal(p.vz,0);assert.equal(p.vx,0);assert.equal(p.inv,0);assert.equal(R.startAssist(front,p),false);
 }
});
test('only one eligible front helper joins; no rear/airborne/boss/distant capture',()=>{
 for(const change of [{x:265},{x:360},{y:460},{z:2},{hp:0},{def:{boss:true}}]){
  const {p,front}=scene();Object.assign(front,change);assert.equal(R.startAssist(front,p),false);
 }
 const {p,rear,front}=scene();assert.equal(R.startAssist(rear,p),false);R.startAssist(front,p);
 assert.equal(R.startAssist({...front},p),false);
});
test('escape and rear interruption clean up both links; front interruption ends only its combo',()=>{
 for(const mode of ['escape','rear','front','death','stage']){
  const {p,rear,front}=scene();R.startAssist(front,p);front.t=30;
  let hits=0;const hit=()=>hits++;
  R.tickAssist(front,p,hit);assert.equal(hits,1);
  if(mode==='escape'){p.escape=7;R.tick(p,true)}
  if(mode==='rear'){rear.state='hurt';R.tick(p,false)}
  if(mode==='front'){front.state='hurt';R.tickAssist(front,p,hit)}
  if(mode==='death'){p.hp=0;R.tick(p,false)}
  if(mode==='stage')R.release(p);
  front.t=78;R.tickAssist(front,p,hit);assert.equal(hits,1);
  assert.equal(p.assistedBy,null);assert.equal(front.assistPlayer,null);
  assert.equal(!!p.heldBy,mode==='front');
  assert.notEqual(p.state,'down');
 }
});
test('timeout does not truncate an accepted combo; escape still works immediately',()=>{
 const {p,front}=scene();R.startAssist(front,p);p.t=180;R.tick(p,false);assert.equal(p.assistedBy,front);
 for(const t of R.assistHits){front.t=t;R.tickAssist(front,p,()=>{});assert.equal(p.state,'restrained')}
 front.t=209;R.tickAssist(front,p,()=>{});assert.equal(p.state,'restrained');
 front.t=210;R.tickAssist(front,p,()=>{});R.tick(p,false);assert.equal(p.heldBy,null);assert.equal(p.state,'down');
});
test('hit pose matches all four damage windows for Aoi and the helper',()=>{
 const {p,front}=scene();R.startAssist(front,p);
 for(const hit of R.assistHits){
  front.t=hit-1;assert.equal(assistFrame(front),1);assert.equal(assistFrame(p),1);
  front.t=hit;assert.equal(assistFrame(front),2);assert.equal(assistFrame(p),2);
  front.t=hit+12;assert.notEqual(assistFrame(front),2);
 }
 R.endAssist(p);assert.equal(assistFrame(front),null);assert.equal(assistFrame(p),null);
});
test('escape inputs during actual hit-stop still release both captors',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 const {p,rear,front}=scene();R.startAssist(front,p);
 const ctx=vm.createContext({P:p,EnemyRestraint:R,frame:0,mode:'play',paused:false,banner:null,freeze:8,hit:(...keys)=>keys.includes('KeyZ')});
 vm.runInContext(html.slice(html.indexOf('function update(){'),html.indexOf('/* ---------- render ---------- */')),ctx);
 for(let i=0;i<8;i++)ctx.update();
 assert.equal(p.heldBy,null);assert.equal(p.assistedBy,null);assert.equal(rear.heldPlayer,null);assert.equal(front.assistPlayer,null);
 assert.equal(p.state,'idle');assert.equal(ctx.freeze,0);
});
test('each body punch uses heavy feedback without knockdown or breaking the rear hold',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 const {p,rear,front}=scene();p.meter=0;p.vz=0;front.kind='enemy';R.startAssist(front,p);
 let heavy=0,punch=0;
 const ctx=vm.createContext({EnemyRestraint:R,freeze:0,shake:0,combo:0,
  spark:()=>{},sfx:{heavy:()=>heavy++,punch:()=>punch++,hurt:()=>{}},damageVoice:{play:()=>{}}});
 vm.runInContext(html.slice(html.indexOf('function damage('),html.indexOf('function physics(')),ctx);
 front.t=30;R.tickAssist(front,p,ctx.damage);
 assert.equal(p.hp,94);assert.equal(p.state,'restrained');assert.equal(p.heldBy,rear);
 assert.equal(ctx.freeze,10);assert.equal(ctx.shake,3);assert.equal(heavy,1);assert.equal(punch,0);
});

test('defeated Aoi can be captured from the ground and receive the complete combo at zero HP',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
 for(const face of [-1,1])for(const type of ['thug','yankee','brute']){
  const {p,rear,front}=scene(face,type);R.release(p);
  Object.assign(p,{hp:0,defeated:true,state:'down',restraintCooldown:0,meter:0});
  p.z=1;assert.equal(R.capture(rear,p),false);p.z=0;
  assert.equal(R.capture(rear,p),true);assert.equal(R.startAssist(front,p),true);
  const ctx=vm.createContext({EnemyRestraint:R,freeze:0,shake:0,combo:0,spark(){},
   sfx:{heavy(){},punch(){},hurt(){}},damageVoice:{play(){}}});
  vm.runInContext(html.slice(html.indexOf('function damage('),html.indexOf('function physics(')),ctx);
  for(const t of R.assistHits){
   p.t=t;R.tick(p,false);front.t=t;R.tickAssist(front,p,ctx.damage);
   assert.equal(p.state,'restrained');assert.equal(p.hp,0);assert.equal(p.heldBy,rear);
  }
  assert.equal(front.assistHit,4);front.t=210;R.tickAssist(front,p,ctx.damage);
  assert.equal(p.state,'down');assert.equal(p.heldBy,null);assert.equal(p.assistedBy,null);
  p.restraintCooldown=0;assert.equal(R.capture(rear,p),true);p.t=180;R.tick(p,false);
  assert.equal(p.state,'down');assert.equal(p.heldBy,null);
 }
});
