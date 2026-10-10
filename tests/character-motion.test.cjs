const { test } = require('node:test');
const assert = require('node:assert/strict');
const { enemyPose, playerAttackFrame } = require('../character-motion.js');

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
