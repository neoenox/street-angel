const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../street-angel.html'),'utf8');

test('unique holds draw the registered pair once and never overwrite foreground or recolor Aoi',()=>{
 for(const type of ['yankee','brute','boss'])for(const face of [-1,1]){
  const p={styKey:'aoi',state:'restrained',face,scale:1,flash:8};
  const e={type,state:'holding',heldPlayer:p};p.heldBy=e;
  const calls=[],translations=[],img={complete:true,naturalWidth:400};
  const ctx=vm.createContext({HOLD_PAIRS:{[type]:{frames:[{}],img}},restraintSway:()=>.5,restraintRecoil:()=>-face*3,spriteScale:()=>1,
    g:{save(){},restore(){},translate(...xy){translations.push(xy)}},blit:(...a)=>calls.push(a)});
  vm.runInContext(html.slice(html.indexOf('function drawUniqueRestraint('),html.indexOf('function drawRestraint(')),ctx);
  assert.equal(ctx.drawUniqueRestraint(e),true);assert.equal(calls.length,0);
  assert.equal(ctx.drawUniqueRestraint(p),true);assert.equal(calls.length,1);
  assert.equal(calls[0][0].flash,0);assert.equal(calls[0][4],face);
  assert.deepEqual(translations,[[.5-face*3,0]]);
  assert.equal(ctx.drawUniqueRestraint(p,true),true);assert.equal(calls.length,1);
  p.state='idle';assert.equal(ctx.drawUniqueRestraint(p),false);
 }
});

test('head occlusion ends within the restrained group before unrelated foreground fighters',()=>{
 for(const face of [-1,1]){
  const p={name:'aoi',styKey:'aoi',state:'restrained',y:440,face};
  const rear={name:'rear',heldPlayer:p,y:440},helper={name:'helper',assistPlayer:p,y:440};
  p.heldBy=rear;p.assistedBy=helper;
  const front={name:'front',y:448},back={name:'back',y:420},draws=[];
  const ctx=vm.createContext({drawRestraint:(e,head)=>{draws.push(e.name+(head?':head':''));return true},warn:()=>{}});
  vm.runInContext(html.slice(html.indexOf('function drawCharacters('),html.indexOf('function shadow(')),ctx);
  ctx.drawCharacters([front,helper,back,p,rear]);
  assert.deepEqual(draws,['back','rear','aoi','helper','aoi:head','front']);
 }
});

test('hiding the grip clips only its own draw and restores the context for other sprites',()=>{
 let depth=0;const clips=[],images=[],scales=[];
 const g={filter:'none',save(){depth++},restore(){depth--},translate(){},scale(...s){scales.push(s)},
  beginPath(){},rect(){},clip(rule){clips.push({rule,depth})},drawImage(){images.push(depth)}};
 Object.defineProperty(g,'globalCompositeOperation',{set:()=>assert.fail('shared scene must not be erased')});
 const ctx=vm.createContext({g,cam:0,CHARACTER_PROFILES:{aoi:{width:1}},characterBreath:()=>1});
 vm.runInContext(html.slice(html.indexOf('function blit('),html.indexOf('/* combat sheet layout')),ctx);
 const f=[{x:0,y:0,w:300,h:300,ax:120,ay:300}];
 const e={x:480,y:440,z:0,scale:1,styKey:'aoi',face:-1};
 ctx.blit(e,f,{},0,-1,1,false,[254,77,60,61]);
 assert.equal(depth,0);assert.equal(clips.length,1);assert.equal(clips[0].rule,'evenodd');assert.equal(clips[0].depth,1);
 ctx.blit(e,f,{},0,1,1);
 assert.equal(depth,0);assert.equal(clips.length,1);assert.deepEqual(images,[1,1]);
 assert.deepEqual(scales,[[-1,1],[1,1]]);
});
