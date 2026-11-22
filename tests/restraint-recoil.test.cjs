const {test}=require('node:test');
const assert=require('node:assert/strict');
const {restraintRecoil,ASSIST_TIMING}=require('../character-motion.js');

test('each body punch recoils away from the attacker and settles before the next punch',()=>{
  for(const face of [-1,1])for(const hit of ASSIST_TIMING.hits){
    const p={state:'restrained',face,assistedBy:{t:hit}};
    assert.equal(restraintRecoil(p),-face*3);
    p.assistedBy.t=hit+6;assert.equal(restraintRecoil(p),-face*1.5);
    p.assistedBy.t=hit+12;assert.equal(restraintRecoil(p),0);
    p.assistedBy.t=hit-1;assert.equal(restraintRecoil(p),0);
  }
});

test('recoil cannot leak into unassisted holds or the following down state',()=>{
  assert.equal(restraintRecoil({state:'restrained',face:1}),0);
  assert.equal(restraintRecoil({state:'down',face:1,assistedBy:{t:30}}),0);
});
