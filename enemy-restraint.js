const EnemyRestraint=(()=>{
  const attack={n:'restrain',wind:28,dur:32,hs:5,he:10,reach:44,dt:16,range:42,anim:'punchF',lunge:0};
  function capture(e,p){
    if(p.hp<=0||p.inv>0||p.z>0||p.restraintCooldown>0||p.heldBy||!['idle','walk','attack','hurt'].includes(p.state))return false;
    p.heldBy=e;e.heldPlayer=p;p.state='restrained';p.t=0;p.escape=0;p.atk=null;p.buf='';p.vx=p.vz=0;p.face=-e.face;
    e.state='holding';e.t=0;e.vx=0;e.next=null;e.x=p.x-e.face*(e.type==='brute'?75:58);e.y=p.y;return true;
  }
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
  return {attack,capture,release,tick};
})();
if(typeof module!=='undefined')module.exports=EnemyRestraint;
