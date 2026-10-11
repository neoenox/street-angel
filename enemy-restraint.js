const EnemyRestraint=(()=>{
  const attack={n:'restrain',wind:0,dur:20,hs:0,he:6,reach:44,dt:16,range:42,anim:'punchF',lunge:0};
  function isBehind(e,p){return (e.x-p.x)*p.face<-8}
  function capture(e,p){
    if(!isBehind(e,p)||Math.abs(e.x-p.x)>attack.reach||Math.abs(e.y-p.y)>attack.dt||(p.hp<=0&&!p.defeated)||p.inv>0||p.z>0||p.restraintCooldown>0||p.heldBy||!(['idle','walk','attack','hurt'].includes(p.state)||(p.defeated&&p.state==='down')))return false;
    e.face=p.face;p.heldBy=e;e.heldPlayer=p;p.state='restrained';p.t=0;p.escape=0;p.atk=null;p.buf='';p.vx=p.vz=0;
    p.assistUsed=false;
    e.state='holding';e.t=0;e.vx=0;e.next=null;align(e,p);return true;
  }
  function align(e,p){e.x=p.x-e.face*(e.type==='brute'?46:38);e.y=p.y}
  function release(p){
    endAssist(p);
    const e=p.heldBy;if(!e)return;
    p.heldBy=null;e.heldPlayer=null;p.restraintCooldown=300;
    if(p.state==='restrained'){p.state='idle';p.t=0;p.vx=0;p.restraintExit=12}
    if(p.defeated){p.state='down';p.t=0;p.lt=8;p.z=p.vx=p.vz=0;p.restraintExit=0}
    if(e.state==='holding'){e.state='idle';e.t=0;e.cd=90;e.restraintExit=12}
  }
  function tick(p,pressed){
    const e=p.heldBy;
    if(!e)return;
    if(e.hp<=0||e.rm||e.state!=='holding'||(p.hp<=0&&!p.defeated)||p.state!=='restrained'){release(p);return}
    if(pressed)p.escape++;
    if((p.t>=180&&!p.assistedBy)||p.escape>=8)release(p);
  }
  const assistTiming=typeof module!=='undefined'?require('./character-motion.js').ASSIST_TIMING:ASSIST_TIMING;
  const assistHits=assistTiming.hits;
  const bellyHit={n:'bellyHit',dmg:6,kb:0,stun:0,hitStop:10,heavy:true};
  function canAssist(e,p){
    return !e.def?.boss&&e!==p.heldBy&&!p.assistUsed&&!p.assistedBy&&p.state==='restrained'&&(p.hp>0||p.defeated)&&p.heldBy?.state==='holding';
  }
  function assistDistance(e){return (e.type==='brute'?72:84)*(e.scale||1)}
  function alignAssist(e,p){e.face=-p.face;e.x=p.x+p.face*assistDistance(e);e.y=p.y;e.vx=0}
  function startAssist(e,p){
    if(!canAssist(e,p)||e.hp<=0||e.z>0||(e.x-p.x)*p.face<=8||Math.abs(e.x-p.x-p.face*assistDistance(e))>14||Math.abs(e.y-p.y)>16)return false;
    p.assistedBy=e;p.assistUsed=true;e.assistPlayer=p;e.state='assisting';e.t=0;e.assistHit=0;e.atk=null;e.next=null;e.hitSet=new Set();alignAssist(e,p);return true;
  }
  function endAssist(p){
    const e=p.assistedBy;if(!e)return;
    p.assistedBy=null;e.assistPlayer=null;
    if(e.state==='assisting'){e.state='idle';e.t=0;e.cd=120;e.vx=0}
  }
  function tickAssist(e,p,hit){
    if(p.assistedBy!==e||e.assistPlayer!==p)return;
    if(e.hp<=0||e.rm||e.state!=='assisting'||(p.hp<=0&&!p.defeated)||p.state!=='restrained'||!p.heldBy){endAssist(p);return}
    alignAssist(e,p);
    if(e.assistHit<4&&e.t>=assistHits[e.assistHit]){
      e.assistHit++;e.hitSet=new Set();hit(p,e,bellyHit);
    }
    if(p.assistedBy===e&&e.t>=assistTiming.end){
      if(e.assistHit===4){
        release(p);
        // Collapse in place after the completed combo; this is not a throw.
        p.state='down';p.t=0;p.lt=0;p.z=0;p.vx=0;p.vz=0;
        p.atk=null;p.restraintExit=0;p.inv=0;p.hurtN=0;p.hurtT=null;
      }else endAssist(p);
    }
  }
  return {attack,capture,release,tick,align,isBehind,canAssist,startAssist,endAssist,tickAssist,alignAssist,assistDistance,assistHits};
})();
if(typeof module!=='undefined')module.exports=EnemyRestraint;
