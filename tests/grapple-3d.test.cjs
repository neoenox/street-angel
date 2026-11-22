const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.join(__dirname,'../grapple-3d');
async function runtime(){
 const url=pathToFileURL(path.join(root,'vendor/three/build/three.module.js')).href;
 const THREE=await import(url);
 const source=fs.readFileSync(path.join(root,'ik.js'),'utf8').replace("'three'",JSON.stringify(url));
 const {solveArm}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 return {THREE,solveArm};
}
test('3D hold cycle closes, releases, stays bounded and loops continuously',async()=>{
 const {poseAt}=await import(pathToFileURL(path.join(root,'motion.mjs')).href);
 assert.equal(poseAt(0).grip,0);assert.equal(poseAt(4).grip,1);assert.equal(poseAt(9).grip,0);
 assert.deepEqual(poseAt(0),poseAt(10));assert.equal(poseAt(2,'release').grip,0);
 for(let t=0;t<10;t+=.01){const p=poseAt(t);assert.ok(p.grip>=0&&p.grip<=1);assert.ok(p.approach>=0&&p.approach<=1);assert.ok(Math.abs(p.struggle)<=.025)}
});
test('two-bone solver reaches a target without changing segment lengths',async()=>{
 const {THREE:T,solveArm}=await runtime();
 for(const scale of [.85,1,1.15]){
  const root=new T.Group(),a=new T.Bone(),b=new T.Bone(),c=new T.Bone();
  root.scale.setScalar(scale);root.add(a);a.add(b);b.add(c);b.position.y=.4;c.position.y=.6;root.updateMatrixWorld(true);
  const target=new T.Vector3(.3,.5,-.25),pole=new T.Vector3(.7,.3,-.2);
  solveArm(a,b,c,target,pole);const end=c.getWorldPosition(new T.Vector3());
  assert.ok(end.distanceTo(target)<1e-6);assert.equal(b.position.y,.4);assert.equal(c.position.y,.6);
  solveArm(a,b,c,new T.Vector3(0,4,0),pole);assert.ok(c.getWorldPosition(new T.Vector3()).length()<=scale+1e-6);
 }
});
test('downloaded GLB is embedded and contains both arms and walking animation',()=>{
 const bytes=fs.readFileSync(path.join(root,'models/RobotExpressive.glb'));
 assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 for(const n of ['UpperArm.L','LowerArm.L','Palm1.L','UpperArm.R','LowerArm.R','Palm1.R'])assert.ok(gltf.nodes.some(o=>o.name===n));
 assert.ok(gltf.animations.some(a=>a.name==='Walking'));assert.ok(gltf.buffers.every(b=>!b.uri));
});
test('third-party files match their recorded download hashes',()=>{
 const {createHash}=require('node:crypto');
 const lock=JSON.parse(fs.readFileSync(path.join(root,'assets.lock.json'),'utf8'));
 for(const asset of lock.files){
  const bytes=fs.readFileSync(path.join(root,asset.path));
  assert.equal(bytes.length,asset.bytes,asset.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);
 }
});
