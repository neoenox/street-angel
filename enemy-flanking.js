// Return a waypoint around the player's side while another enemy engages.
function enemyFlankTarget(e,p,others,minX,maxX,minY,maxY){
  if(p.defeated||!['idle','walk','attack','hurt','jump','jatk'].includes(p.state))return null;
  const allies=others.filter(o=>o!==e&&o.hp>0&&!o.rm);
  if(!allies.length){e.flankUntil=0;return null}
  const engaged=allies.some(o=>['windup','attack'].includes(o.state));
  if(engaged)e.flankUntil=e.at+180;
  if(!(e.flankUntil>e.at))return null;
  const behind=(e.x-p.x)*p.face;
  if(behind<-24&&Math.abs(e.y-p.y)<18)return null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
  const rearX=clamp(p.x-p.face*68,minX,maxX);
  // At a wall there may be no room behind; keep normal combat available.
  if((rearX-p.x)*p.face>=-30)return null;
  const preferred=e.id%2?1:-1;
  const lane=clamp(p.y+preferred*48,minY,maxY);
  const laneY=Math.abs(lane-p.y)>=32?lane:clamp(p.y-preferred*48,minY,maxY);
  if(behind<-24)return {x:rearX,y:p.y};
  return {x:Math.abs(e.y-laneY)>8?e.x:rearX,y:laneY};
}
if(typeof module!=='undefined')module.exports={enemyFlankTarget};
