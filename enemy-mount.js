/* Grounded tackle / mount. Timings are simulation ticks (60 Hz). */
const EnemyMount=(()=>{
  const timing={charge:42,tackle:26,hits:[36,90,144,198],impact:10,end:234,escape:8};
  const punch={n:'mountPunch',dmg:6,kb:0,stun:0,hitStop:8,heavy:true};
  function eligible(e,p){
    return e.type==='thug'&&e.hp>0&&!e.rm&&e.z===0&&!p.heldBy&&!p.mountedBy&&
      !(p.mountCooldown>0)&&!(p.inv>0)&&(p.hp>0||p.defeated)&&p.z===0&&
      ['idle','walk','attack','hurt','down'].includes(p.state);
  }
  function start(e,p){
    if(!eligible(e,p)||Math.abs(e.x-p.x)>170||Math.abs(e.y-p.y)>18)return false;
    e.state='mountCharge';e.t=0;e.face=p.x>=e.x?1:-1;e.vx=0;e.next=null;e.atk=null;return true;
  }
  function capture(e,p){
    if(!eligible(e,p)||Math.abs(e.x-p.x)>42||Math.abs(e.y-p.y)>18)return false;
    p.mountedBy=e;e.mountPlayer=p;p.state='mounted';p.t=0;p.escape=0;p.atk=null;p.buf='';
    p.face=e.face;p.z=p.vx=p.vz=0;p.hurtN=0;p.hurtT=null;
    e.state='mounting';e.t=0;e.mountHit=0;e.vx=0;align(e,p);return true;
  }
  function align(e,p){e.x=p.x+e.face*18;e.y=p.y;e.vx=0}
  function release(p){
    const e=p.mountedBy;if(!e)return;
    p.mountedBy=null;e.mountPlayer=null;p.mountCooldown=240;
    if(p.state==='mounted'){p.state='down';p.t=0;p.lt=8;p.z=p.vx=p.vz=0;p.atk=null}
    if(e.state==='mounting'){e.state='idle';e.t=0;e.cd=120;e.vx=0;e.next=null}
  }
  function escape(p,pressed){
    const e=p.mountedBy;if(!e)return;
    if(e.hp<=0||e.rm||e.state!=='mounting'||p.state!=='mounted'||(p.hp<=0&&!p.defeated)){release(p);return}
    if(pressed&&!p.defeated)p.escape++;
    if(p.escape>=timing.escape)release(p);
  }
  function tick(e,p,hit){
    if(e.mountPlayer!==p||p.mountedBy!==e)return;
    escape(p,false);if(p.mountedBy!==e)return;
    align(e,p);
    if(e.mountHit<timing.hits.length&&e.t>=timing.hits[e.mountHit]){
      e.mountHit++;e.hitSet=new Set();hit(p,e,punch);
    }
    if(e.t>=timing.end)release(p);
  }
  function approach(e,p){
    if(e.state==='mountCharge'){
      if(!eligible(e,p)){e.state='idle';e.t=0;e.cd=90;return}
      if(e.t>=timing.charge){e.state='mountTackle';e.t=0;e.vx=e.face*7}
      return;
    }
    // Direction locks when the charge begins; the tackle never tracks a dodge.
    e.x+=e.vx;
    if(capture(e,p))return;
    if(e.t>=timing.tackle){e.state='idle';e.t=0;e.cd=120;e.vx=0}
  }
  function frame(e){
    if(e.state==='mountCharge')return 0;
    if(e.state==='mountTackle')return 1;
    const a=e.mountPlayer?e:e.mountedBy;
    if(!a)return null;
    const impact=timing.hits.some(t=>a.t>=t&&a.t<t+timing.impact);
    return e.mountPlayer?(impact?3:2):(impact?5:4);
  }
  return {timing,punch,eligible,start,capture,align,release,escape,tick,approach,frame};
})();
if(typeof module!=='undefined')module.exports=EnemyMount;
