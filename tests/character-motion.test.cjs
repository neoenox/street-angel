const { test } = require('node:test');
const assert = require('node:assert/strict');
const { enemyPose, playerAttackFrame, playerIdleFrame,characterBreath,spriteFacing } = require('../character-motion.js');
const {restraintFrame,restraintSway}=require('../character-motion.js');

test('restraint keeps a single grip pose without replacing other reactions',()=>{
 assert.equal(restraintFrame({state:'windup',atk:{n:'restrain'}}),0);
 assert.equal(restraintFrame({state:'attack',t:5,atk:{n:'restrain',he:10}}),1);
 assert.equal(restraintFrame({state:'holding',t:16}),1);
 assert.equal(restraintFrame({state:'restrained',t:0}),1);
 assert.equal(restraintFrame({state:'restrained',t:18}),1);
 assert.equal(restraintFrame({state:'idle',restraintExit:12}),3);
 assert.equal(restraintFrame({state:'hurt',restraintExit:12}),null);
 assert.equal(restraintFrame({state:'idle',restraintExit:0}),null);
});

test('restraint tremor repeats regularly, mirrors and stops on release',()=>{
 for(let t=0;t<=180;t++){
  const p={styKey:'aoi',state:'restrained',t,face:1};
  assert.ok(Math.abs(restraintSway(p))<=.9);
  assert.ok(Math.abs(restraintSway({...p,t:t+12})-restraintSway(p))<1e-12);
  assert.equal(restraintSway({...p,face:-1}),-restraintSway(p));
  assert.equal(restraintSway({...p,state:'idle'}),0);
  assert.equal(restraintSway({...p,styKey:'thug',state:'holding'}),0);
  assert.equal(restraintFrame(p),1);
 }
 assert.equal(restraintSway({styKey:'aoi',state:'restrained',t:0,face:1}),0);
 assert.equal(restraintSway({styKey:'aoi',state:'restrained',t:3,face:1}),.9);
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

test('No draw-time mirroring anywhere: packed atlases already face right (brute frame 4 was mirror-fixed in the asset)', () => {
  for(const face of [-1,1]){
    for(let frame=0;frame<16;frame++){
      for(const style of ['aoi','thug','yankee','brute','boss']){
        assert.equal(spriteFacing(style,0,frame,face),face);
        assert.equal(spriteFacing(style,1,frame,face),face);
      }
    }
  }
});
test('Brute grab squeezes with alternating frames while holding', () => {
  const grab={hs:8,he:160,grab:{}};
  assert.equal(enemyPose({styKey:'brute',state:'attack',t:0,atk:grab}).frame,4);
  assert.equal(enemyPose({styKey:'brute',state:'attack',t:9,atk:grab}).frame,6);
  assert.equal(enemyPose({styKey:'brute',state:'attack',t:15,atk:grab}).frame,5);
  assert.equal(enemyPose({styKey:'brute',state:'holding',t:0}).frame,5);
  assert.equal(enemyPose({styKey:'brute',state:'holding',t:7}).frame,6);
});
