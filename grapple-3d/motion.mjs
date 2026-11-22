export const CYCLE_SECONDS=10;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function poseAt(time,mode='cycle'){
  if(mode==='hold')return {phase:'拘束・もがく',grip:1,approach:1,struggle:Math.sin(time*Math.PI*5)*.025};
  if(mode==='release')return {phase:'解除',grip:1-smooth(time/1.3),approach:1-smooth(time/2),struggle:0};
  const t=((time%CYCLE_SECONDS)+CYCLE_SECONDS)%CYCLE_SECONDS;
  const approach=t<6.5?smooth((t-.5)/2):1-smooth((t-7)/2);
  const grip=t<6.5?smooth((t-2)/1.2):1-smooth((t-6.5)/1.3);
  return {phase:t<.5?'待機':t<3.2?'背後からつかむ':t<6.5?'拘束・もがく':t<9?'解除':'待機',grip,approach,struggle:Math.sin(t*Math.PI*5)*.025*grip};
}
