const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../street-angel.html'),'utf8');
const playerCode=html.slice(html.indexOf('function updPlayer(p){'),html.indexOf('/* ---------- enemies ---------- */'));
const strikeCode=html.slice(html.indexOf('function strike(a,A,targets){'),html.indexOf('function spark('));
function fixture(){
  const ctx=vm.createContext({dn:()=>false,hit:()=>false,clamp:(v,a,b)=>Math.max(a,Math.min(v,b)),cam:0,W:960,ST:{len:3000},Y0:400,Y1:500,
    damage:t=>{t.hp-=6},sfx:{special(){},ko(){}},ATK:{special:{dur:42}},
    startAtk:(p,A)=>{p.state='attack';p.atk=A},shake:0});
  vm.runInContext(playerCode+strikeCode,ctx);
  const p={kind:'player',state:'hurt',hp:100,maxhp:100,t:15,stun:16,at:0,inv:0,flash:0,landT:0,x:200,y:450,z:0,vx:0,lives:3};
  return {ctx,p};
}
test('a new attack can hit immediately after hit-stun ends, but a single attack cannot hit twice',()=>{
  const {ctx,p}=fixture();ctx.updPlayer(p);assert.equal(p.state,'idle');assert.equal(p.inv,0);
  const attacker={t:5,face:1,x:170,y:450,z:0,hitSet:new Set()},attack={hs:4,he:8,reach:60};
  ctx.strike(attacker,attack,[p]);assert.equal(p.hp,94);
  ctx.strike(attacker,attack,[p]);assert.equal(p.hp,94);
  attacker.hitSet=new Set();ctx.strike(attacker,attack,[p]);assert.equal(p.hp,88);
});
test('standing up after damage adds no invulnerability; respawn protection remains',()=>{
  const {ctx,p}=fixture();p.state='getup';p.t=27;ctx.updPlayer(p);assert.equal(p.state,'idle');assert.equal(p.inv,0);
  p.state='getup';p.t=27;p.inv=132;ctx.updPlayer(p);assert.equal(p.inv,131);
  p.state='dead';p.t=50;p.hp=0;ctx.updPlayer(p);assert.equal(p.inv,160);assert.equal(p.hp,100);
});
test('special-move invulnerability still starts normally',()=>{
  const {ctx,p}=fixture();p.state='idle';p.meter=50;ctx.hit=(...keys)=>keys.includes('KeyC');
  ctx.updPlayer(p);assert.equal(p.state,'attack');assert.equal(p.inv,48);
});
