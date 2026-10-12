import {Vector3,Quaternion} from 'three';
const pos=o=>o.getWorldPosition(new Vector3());
function aim(bone,end,target){
  const origin=pos(bone),from=pos(end).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
  if(from.lengthSq()<.5||to.lengthSq()<.5)return;
  const turn=new Quaternion().setFromUnitVectors(from,to);
  const world=bone.getWorldQuaternion(new Quaternion());
  const parent=bone.parent.getWorldQuaternion(new Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(turn.multiply(world)));
  bone.updateWorldMatrix(false,true);
}
// Analytic two-bone IK, with a pole controlling the elbow's bend direction.
export function solveArm(upper,lower,end,target,pole,weight=1){
  if(weight<=0)return;
  const originalUpper=upper.quaternion.clone(),originalLower=lower.quaternion.clone();
  const a=pos(upper),b=pos(lower),c=pos(end),l1=a.distanceTo(b),l2=b.distanceTo(c);
  const delta=target.clone().sub(a),rawDistance=delta.length();
  const d=Math.max(Math.abs(l1-l2)+1e-5,Math.min(l1+l2-1e-5,rawDistance));
  const axis=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d);
  const bend=pole.clone().sub(a);bend.addScaledVector(axis,-bend.dot(axis));
  if(bend.lengthSq()<1e-8)bend.set(1,0,0).addScaledVector(axis,-axis.x);
  bend.normalize();
  const elbow=a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  aim(upper,lower,elbow);aim(lower,end,a.clone().addScaledVector(axis,d));
  const solvedUpper=upper.quaternion.clone(),solvedLower=lower.quaternion.clone();
  upper.quaternion.copy(originalUpper).slerp(solvedUpper,weight);
  lower.quaternion.copy(originalLower).slerp(solvedLower,weight);
  upper.updateWorldMatrix(false,true);
}
