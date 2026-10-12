import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {poseAt} from './motion.mjs';
import {solveArm} from './ik.js';

const $=id=>document.getElementById(id),scene=new THREE.Scene();
scene.background=new THREE.Color('#101923');scene.fog=new THREE.Fog('#101923',9,23);
const host=$('scene');
const camera=new THREE.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.05,50);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
$('scene').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,-.35);
controls.enableDamping=true;controls.minDistance=2.7;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.49;
const views={side:[5,2.7,-.4],front:[0,2.6,5],back:[3,2.6,-5],angle:[4,2.8,4]};
function setView(name){camera.position.fromArray(views[name]);controls.update()}
setView('angle');
scene.add(new THREE.HemisphereLight(0xc6e5ff,0x35404f,2.5));
const key=new THREE.DirectionalLight(0xffebd4,4);key.position.set(3,7,5);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.normalBias=.02;scene.add(key);
const rim=new THREE.DirectionalLight(0x78d9e5,2);rim.position.set(-4,3,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x24303c,roughness:.95}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(12,24,0x4f6475,0x344451);grid.position.y=.002;scene.add(grid);
let actors,mode='cycle',time=0,paused=false,scale=1,last=performance.now(),metrics={};
const world=o=>o.getWorldPosition(new THREE.Vector3());
function bone(root,name){let found;root.traverse(o=>{if(o.isBone&&o.name.replaceAll('_','').replaceAll('.','')===name.replaceAll('.',''))found=o});if(!found)throw Error('必要な骨が見つかりません: '+name);return found}
function createActor(source,color){
  const root=new THREE.Group(),model=clone(source.scene);root.add(model);scene.add(root);
  const mixer=new THREE.AnimationMixer(model),idle=source.animations.find(a=>a.name==='Idle');
  const idleAction=idle?mixer.clipAction(idle).play():null;
  const walkingClip=source.animations.find(a=>a.name==='Walking');
  const walking=walkingClip?mixer.clipAction(walkingClip).play():null;
  if(walking)walking.setEffectiveWeight(0);
  mixer.setTime(0);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),height=box.max.y-box.min.y;
  model.scale.multiplyScalar(1.8/height);model.position.y=-box.min.y*1.8/height;model.updateMatrixWorld(true);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const recolor=m=>{m=m.clone();if(m.color)m.color.lerp(new THREE.Color(color),.62);return m};o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material)}});
  const bones={};for(const name of ['Body','Abdomen','Head','UpperArm.L','LowerArm.L','Palm1.L','Middle1.L','UpperArm.R','LowerArm.R','Palm1.R','Middle1.R'])bones[name]=bone(model,name);
  const rest=[];model.traverse(o=>{if(o.isBone)rest.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()])});
  return {root,model,mixer,bones,rest,idleAction,walking};
}
function reset(actor,t,walkWeight=0,backwards=false){
  for(const [o,p,q,s]of actor.rest){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s)}
  actor.idleAction?.setEffectiveWeight(1-walkWeight);
  actor.walking?.setEffectiveWeight(walkWeight);actor.walking?.setEffectiveTimeScale(backwards?-1:1);
  actor.mixer.setTime(t);actor.root.updateMatrixWorld(true);
}
function arm(actor,side,target,pole,weight,end='Palm1'){
  solveArm(actor.bones['UpperArm.'+side],actor.bones['LowerArm.'+side],actor.bones[end+'.'+side],target,pole,weight);
}
function updatePose(){
  if(!actors)return;
  const [victim,holder]=actors,p=poseAt(time,mode);
  victim.root.position.set(0,0,0);holder.root.position.set(0,0,THREE.MathUtils.lerp(-1.65,-.90,p.approach));
  holder.root.scale.setScalar(scale);
  const moving=p.approach>0&&p.approach<1;
  reset(victim,time);reset(holder,time,moving?1-p.grip:0,p.phase==='解除');
  // Upper-body struggle only; root and feet stay planted during the hold.
  victim.bones.Abdomen.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),p.struggle));
  victim.bones.Head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.sin(time*3)*.05*p.grip));
  victim.root.updateMatrixWorld(true);
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    const target=new THREE.Vector3(sign*.20,.78,-.27);
    // Targets follow torso movement; IK handles both actors independently.
    target.x+=p.struggle*.7;
    arm(victim,side,target,new THREE.Vector3(sign*.65,1.00,-.3),p.grip);
    const contact=world(victim.bones['Palm1.'+side]);
    contact.z-=.035;
    arm(holder,side,contact,new THREE.Vector3(sign*.64,.88,holder.root.position.z+.14),p.grip,'Middle1');
  }
  victim.root.updateMatrixWorld(true);holder.root.updateMatrixWorld(true);
  const errors=['L','R'].map(side=>{const target=world(victim.bones['Palm1.'+side]);target.z-=.035;return world(holder.bones['Middle1.'+side]).distanceTo(target)});
  metrics={phase:p.phase,grip:p.grip,scale,maxContactError:Math.max(...errors),left:errors[0],right:errors[1],mode,time,paused};
  $('status').textContent=p.phase+(paused?'（停止中）':'');
  $('metrics').textContent=p.grip>.999?`手の追従誤差：${(metrics.maxContactError*100).toFixed(1)} cm`:'接近・解除中';
}
function changeMode(next){mode=next;time=0;paused=false;$('pause').textContent='停止';updatePose();for(const name of ['cycle','hold','release'])$(name).classList.toggle('active',name===mode)}
for(const name of ['cycle','hold','release'])$(name).onclick=()=>changeMode(name);
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'再生':'停止';updatePose()};
$('size').oninput=e=>{scale=+e.target.value;$('sizeValue').textContent=Math.round(scale*100)+'%';updatePose()};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>setView(button.dataset.view);
addEventListener('resize',()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('error').textContent='描画が中断しました。ページを再読み込みしてください。'});
try{
  const gltf=await new GLTFLoader().loadAsync('./models/RobotExpressive.glb');
  actors=[createActor(gltf,0x279fd4),createActor(gltf,0xff973f)];
  for(const button of document.querySelectorAll('button:disabled'))button.disabled=false;
  changeMode('cycle');
}catch(error){$('status').textContent='読み込めませんでした';$('error').textContent=error.message;console.error(error)}
function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)time+=dt;updatePose();controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}
requestAnimationFrame(loop);
if(new URLSearchParams(location.search).has('debug'))window.__grapple={
  snapshot:()=>({...metrics,actors:actors?.map(a=>({bones:Object.keys(a.bones),position:a.root.position.toArray(),scale:a.root.scale.x}))}),
  pose:(next,t=0,size=1)=>{mode=next;time=t;scale=size;paused=true;$('size').value=size;$('sizeValue').textContent=Math.round(size*100)+'%';$('pause').textContent='再生';for(const name of ['cycle','hold','release'])$(name).classList.toggle('active',name===mode);updatePose();renderer.render(scene,camera);return {...metrics}},
  view:name=>{setView(name);renderer.render(scene,camera)},
};
