const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../street-angel.html'),'utf8');
test('title never draws legacy fallback while either modern sprite is loading',()=>{
  for(const ready of [[],['aoi'],['thug'],['aoi','thug']]){
    const draws=[],shadows=[];
    const ctx=vm.createContext({frame:0,STAGES:[{}],STY:{aoi:{},thug:{}},ET:{thug:{}},W:960,H:540,
      buildBG:()=>({}),mkFighter:e=>e,drawBG(){},g:{fillRect(){}},txt(){},mayStart:()=>false,
      hasSprite:e=>ready.includes(e.styKey),shadow:e=>shadows.push(e.styKey),
      drawCharacters:list=>draws.push(...list.map(e=>e.styKey))});
    vm.runInContext(html.slice(html.indexOf('let titleBG='),html.indexOf('/* ---------- loop ---------- */')),ctx);
    ctx.drawTitle();assert.deepEqual(draws,ready);assert.deepEqual(shadows,ready);
  }
});
