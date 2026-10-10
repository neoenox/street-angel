const EnemyRestraint=(()=>{
  const attack={n:'restrain',wind:0,dur:20,hs:0,he:6,reach:44,dt:16,range:42,anim:'punchF',lunge:0};
  function isBehind(e,p){return (e.x-p.x)*p.face<-8}
  function capture(e,p){
    if(!isBehind(e,p)||Math.abs(e.x-p.x)>attack.reach||Math.abs(e.y-p.y)>attack.dt||p.hp<=0||p.inv>0||p.z>0||p.restraintCooldown>0||p.heldBy||!['idle','walk','attack','hurt'].includes(p.state))return false;
    e.face=p.face;p.heldBy=e;e.heldPlayer=p;p.state='restrained';p.t=0;p.escape=0;p.atk=null;p.buf='';p.vx=p.vz=0;
    e.state='holding';e.t=0;e.vx=0;e.next=null;align(e,p);return true;
  }
  function align(e,p){e.x=p.x-e.face*(e.type==='brute'?46:38);e.y=p.y}
  function release(p){
    const e=p.heldBy;if(!e)return;
    p.heldBy=null;e.heldPlayer=null;p.restraintCooldown=300;
    if(p.state==='restrained'){p.state='idle';p.t=0;p.vx=0;p.restraintExit=12}
    if(e.state==='holding'){e.state='idle';e.t=0;e.cd=90;e.restraintExit=12}
  }
  function tick(p,pressed){
    const e=p.heldBy;
    if(!e)return;
    if(e.hp<=0||e.rm||e.state!=='holding'||p.hp<=0||p.state!=='restrained'){release(p);return}
    if(pressed)p.escape++;
    if(p.t>=180||p.escape>=8)release(p);
  }
  return {attack,capture,release,tick,align,isBehind};
})();
if(typeof module!=='undefined')module.exports=EnemyRestraint;
