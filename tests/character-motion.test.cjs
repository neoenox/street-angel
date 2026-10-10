const { test } = require('node:test');
const assert = require('node:assert/strict');
const { enemyPose, playerAttackFrame, playerIdleFrame,characterBreath,spriteFacing } = require('../character-motion.js');
const {restraintFrame}=require('../character-motion.js');

test('restraint uses dedicated reach, grip, struggle and release poses without replacing other reactions',()=>{
 assert.equal(restraintFrame({state:'windup',atk:{n:'restrain'}}),0);
 assert.equal(restraintFrame({state:'attack',t:5,atk:{n:'restrain',he:10}}),1);
 assert.equal(restraintFrame({state:'holding',t:16}),2);
 assert.equal(restraintFrame({state:'restrained',t:0}),0);
 assert.equal(restraintFrame({state:'restrained',t:18}),2);
 assert.equal(restraintFrame({state:'idle',restraintExit:12}),3);
 assert.equal(restraintFrame({state:'hurt',restraintExit:12}),null);
 assert.equal(restraintFrame({state:'idle',restraintExit:0}),null);
});

test('every character holds one static idle frame at all times',()=>{
 for(const style of ['aoi','thug','yankee','brute','boss'])for(const t of [0,24,59,120,600]){
  assert.equal(style==='aoi'?playerIdleFrame(t):enemyPose({styKey:style,state:'idle',t}).frame,style==='aoi'?3:0);
  assert.equal(characterBreath(style,t,'idle'),1);
 }
});

test('boss charge and slam show different anticipation before damage starts', () => {
  assert.deepEqual(enemyPose({styKey:'boss',state:'windup',t:10,atk:{n:'rush'}}), {sheet:0,frame:4});
  assert.deepEqual(enemyPose({styKey:'boss',state:'windup',t:10,atk:{n:'slam'}}), {sheet:0,frame:6});
  assert.deepEqual(enemyPose({styKey:'boss',state:'attack',t:12,atk:{n:'slam',hs:12,he:20,dur:58}}), {sheet:0,frame:7});
});
test('a kick is extended throughout the first active damage frame', () => {
  assert.equal(enemyPose({styKey:'yankee',state:'attack',t:6,atk:{n:'kick',hs:7,he:20}}).frame, 4);
  assert.equal(enemyPose({styKey:'yankee',state:'attack',t:7,atk:{n:'kick',hs:7,he:20}}).frame, 5);
  assert.equal(enemyPose({styKey:'yankee',state:'attack',t:21,atk:{n:'kick',hs:7,he:20}}).frame, 7);
});
test('grounded knockdown and standing recovery do not reuse an airborne pose', () => {
  assert.equal(enemyPose({state:'down',z:0,lt:8}).frame, 11);
  assert.equal(enemyPose({state:'getup',t:26}).frame, 15);
});
test('Aoi jab, cross, uppercut and kick reach their hit poses at damage onset', () => {
  for (const [anim, expected] of [['punchF',1],['punchB',5],['upper',10],['kick',13]])
    assert.equal(playerAttackFrame(anim,7,7,12),expected);
  assert.equal(playerAttackFrame('upper',2,7,12),8);
  assert.equal(playerAttackFrame('kick',18,7,12),15);
});

test('Brute anticipation is corrected in both directions without reversing the hit or other fighters', () => {
  for(const face of [-1,1]){
    const wind=enemyPose({styKey:'brute',state:'windup'});
    assert.equal(spriteFacing('brute',wind.sheet,wind.frame,face),-face);
    for(let frame=0;frame<16;frame++){
      assert.equal(spriteFacing('brute',0,frame,face),face);
      if(frame!==4)assert.equal(spriteFacing('brute',1,frame,face),face);
      for(const style of ['aoi','thug','yankee','boss'])assert.equal(spriteFacing(style,1,frame,face),face);
    }
  }
});
