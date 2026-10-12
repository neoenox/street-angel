const {test}=require('node:test'),assert=require('node:assert/strict');
const {enemyFlankTarget:target}=require('../enemy-flanking.js');
test('other enemies go around the side and reach the rear in either facing',()=>{
 for(const face of [-1,1]){
  const p={x:480,y:440,face,state:'idle'},lead={hp:40,state:'attack'};
  const e={id:2,hp:40,at:0,x:480+face*100,y:440,state:'idle'};
  let passedSide=false,reached=false;
  for(let t=0;t<250;t++){
   e.at++;const dest=target(e,p,[e,lead],14,946,380,500);
   if(!dest){reached=true;break}
   if(Math.abs(e.y-p.y)>30)passedSide=true;
   const dx=dest.x-e.x,dy=dest.y-e.y,d=Math.hypot(dx,dy),s=Math.min(2,d);
   if(d){e.x+=dx/d*s;e.y+=dy/d*s*.72}
  }
  assert.ok(passedSide);assert.ok(reached);assert.ok((e.x-p.x)*face<-30);
  assert.ok(Math.abs(e.y-p.y)<18);
 }
});
test('flanking tolerates cooldowns and walls without blocking normal or restraint combat',()=>{
 const p={x:480,y:440,face:1,state:'idle'},e={id:1,at:10,x:580,y:440},other={hp:40,state:'attack'};
 assert.ok(target(e,p,[e,other],14,946,380,500));other.state='idle';e.at=40;
 assert.ok(target(e,p,[e,other],14,946,380,500));e.at=191;
 assert.equal(target(e,p,[e,other],14,946,380,500),null);
 other.state='attack';
 for(const state of ['restrained','down','dead','getup'])assert.equal(target(e,{...p,state},[e,other],14,946,380,500),null);
 assert.equal(target(e,{...p,defeated:true},[e,other],14,946,380,500),null);
 assert.equal(target(e,{...p,x:18},[e,other],14,946,380,500),null);
 assert.equal(target(e,p,[e,{...other,hp:0}],14,946,380,500),null);
});
