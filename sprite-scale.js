/* World-size calibration, shared by gameplay and the character viewer.
   Compare head / torso size with the combat guard, not the pose's total height:
   a raised fist, bent knees, hair or a lying opponent changes the bounding box. */
const SPRITE_SCALES={
  aoi_walk4:1.04,
  'characters/aoi_attack_v2':1,
  aoi_jump:.90,
  aoi_hit:.82,
  'characters/aoi_restraint_v3':1,
  'characters/aoi_assist_v1':1,
  thug_walk:1,
  'characters/thug_combat_v2':1,
  'characters/thug_restraint_v2':1,
  'characters/thug_assist_v1':.90,
  yk_walk:.80,
  'characters/yankee_combat_v2':.88,
  'characters/yankee_restraint_v2':.82,
  'characters/yankee_assist_v1':.76,
  br_walk:1,
  br_cmb:1,
  'characters/brute_restraint_v2':.82,
  'characters/brute_assist_v1':.82,
  'characters/boss_motion_v2':.84,
  'characters/boss_combat_v2':1,
  'characters/mount_v1':.82,
  'characters/yankee_hold_v1':1,
  'characters/brute_hold_v1':1,
  'characters/boss_hold_v1':1,
};
function spriteScale(asset){return SPRITE_SCALES[asset]??1}
if(typeof module!=='undefined')module.exports={spriteScale,SPRITE_SCALES};
