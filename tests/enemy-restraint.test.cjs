const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../enemy-restraint.js');
function pair(){return [{hp:36,state:'attack',x:240,y:450},{hp:100,state:'idle',x:200,y:450,z:0,inv:0,vx:3,vz:0,t:0}]}
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
