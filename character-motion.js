/* Sprite selection follows the existing damage windows; it never changes combat rules. */
function playerAttackFrame(anim, t, hs, he) {
  const row = {punchF:0, punchB:4, upper:8, kick:12}[anim];
  if (row == null) return null;
  const phase = anim === 'upper'
    ? t < hs * .5 ? 0 : t < hs ? 1 : t <= he ? 2 : 3
    : t < hs ? 0 : t <= hs + (he - hs) / 2 ? 1 : t <= he ? 2 : 3;
  return row + phase;
}

function enemyPose(e) {
  const st=e.state, A=e.atk||{}, t=e.t||0;
  if(e.styKey==='boss' && (st==='windup'||st==='attack')) {
    if(A.n==='rush')return st==='windup'||t<A.hs ? {sheet:0,frame:4}
      : t<=A.he ? {sheet:0,frame:5} : {sheet:1,frame:0};
    if(A.n==='slam')return st==='windup'||t<A.hs ? {sheet:0,frame:6}
      : t<=A.he ? {sheet:0,frame:7}
      : {sheet:1,frame:t<A.he+(A.dur-A.he)*.6?14:0};
  }
  let frame=0;
  if(st==='holding')frame=5;
  else if(st==='windup')frame=4;
  else if(st==='attack')frame=t<A.hs?4:t<=A.hs+(A.he-A.hs)/2?5:t<=A.he?6:7;
  else if(st==='hurt')frame=t/Math.max(1,e.stun||16)<.5?2:3;
  else if(st==='down'||st==='dead')frame=e.z>1.5?(t<26?(e.vz>0&&t<14?8:9):10):(e.lt||0)<5?10:11;
  else if(st==='getup'){const p=t/28;frame=p<.18?12:p<.5?13:p<.8?14:15}
  return {sheet:1,frame};
}

// Brute's overhead anticipation alone was drawn facing left in the source atlas.
// Correct at draw time around the same anchor; hit/recovery and other sheets face right.
function spriteFacing(style,sheet,frame,face){return style==='brute'&&sheet===1&&frame===4?-face:face}

// A shared profile is used by the game and the character lineup.
const CHARACTER_PROFILES={
  aoi:{width:1,breath:.003,period:52},
  thug:{width:.90,breath:.005,period:35},
  yankee:{width:.95,breath:.003,period:43},
  brute:{width:1.02,breath:.004,period:70},
  boss:{width:.94,breath:.002,period:66},
};
function characterBreath(){return 1}
function playerIdleFrame(){return 3}
function restraintFrame(e){
  if(e.restraintExit>0&&(e.state==='idle'||e.state==='walk'))return 3;
  if(e.state==='restrained')return (e.t||0)<8?0:1+(Math.floor(((e.t||0)-8)/10)%2);
  if(e.state==='holding')return 1+(Math.floor((e.t||0)/16)%2);
  if(e.atk?.n==='restrain'){
    if(e.state==='windup')return 0;
    if(e.state==='attack')return (e.t||0)<=e.atk.he?1:3;
  }
  return null;
}
if(typeof module!=='undefined')module.exports={enemyPose,playerAttackFrame,playerIdleFrame,restraintFrame,CHARACTER_PROFILES,characterBreath,spriteFacing};
