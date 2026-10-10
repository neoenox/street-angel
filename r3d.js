/* 3D character layer: Quaternius CC0 mannequins + animation libraries, drawn by three.js into an offscreen canvas */
(()=>{
const T=THREE;
const R={ok:false,failed:false,err:''};window.R3D=R;
let renderer,scene,cam,glc,hemi,dir,W=960,H=540,K=1;
const proto={},CL={},rigs=new Map(),geoCache={};
const parse=buf=>new Promise((res,rej)=>new T.GLTFLoader().parse(buf,'',res,rej));
/* local dev serves the .glb files; the published page ships them as base64 text */
const load=async name=>{
  try{const r=await fetch('assets/'+name+'.glb');if(r.ok){const b=await r.arrayBuffer();if(new Uint8Array(b,0,4)[0]===0x67)return parse(b)}}catch(e){}
  const t=await (await fetch('assets/'+name+'.b64.txt')).text(),bin=atob(t),u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return parse(u.buffer);
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;

/* UAL1 uses Blender style bone names, UAL2 / the mannequins use Unreal style names */
const MAP={'DEF-hips':'pelvis','DEF-spine001':'spine_01','DEF-spine002':'spine_02','DEF-spine003':'spine_03','DEF-neck':'neck_01','DEF-head':'Head'};
for(const s of['L','R']){const l=s.toLowerCase();Object.assign(MAP,{['DEF-shoulder'+s]:'clavicle_'+l,['DEF-upper_arm'+s]:'upperarm_'+l,['DEF-forearm'+s]:'lowerarm_'+l,['DEF-hand'+s]:'hand_'+l,['DEF-thigh'+s]:'thigh_'+l,['DEF-shin'+s]:'calf_'+l,['DEF-foot'+s]:'foot_'+l,['DEF-toe'+s]:'ball_'+l});
  for(const f of['index','middle','pinky','ring'])for(const n of['01','02','03'])MAP['DEF-f_'+f+n+s]=f+'_'+n+'_'+l;
  for(const n of['01','02','03'])MAP['DEF-thumb'+n+s]='thumb_'+n+'_'+l}

/* ---------- palettes (vertex colours by dominant bone) ---------- */
const SK='#f7d2b0',WH='#f4f4f8';
const PAL={
 aoi:{head:SK,neck:SK,chest:'#f4f4f8',waist:'#f4f4f8',pelvis:'#27346b',uarm:SK,larm:SK,hand:'#e8344f',thigh:SK,calf:'#1f2a5a',foot:'#f4f4f8'},
 thug:{head:'#e8b48f',neck:'#e8b48f',chest:'#c7342b',waist:'#c7342b',pelvis:'#2b3a55',uarm:'#e8b48f',larm:'#e8b48f',hand:'#e8b48f',thigh:'#2b3a55',calf:'#2b3a55',foot:'#1b1b1b'},
 yankee:{head:'#e3ab85',neck:'#e3ab85',chest:'#1f9d8b',waist:'#1f9d8b',pelvis:'#d9d9e0',uarm:'#1f9d8b',larm:'#1f9d8b',hand:'#e3ab85',thigh:'#d9d9e0',calf:'#d9d9e0',foot:'#ffffff'},
 brute:{head:'#d4986f',neck:'#d4986f',chest:'#4b4b57',waist:'#4b4b57',pelvis:'#5b4a2f',uarm:'#d4986f',larm:'#d4986f',hand:'#d4986f',thigh:'#5b4a2f',calf:'#5b4a2f',foot:'#222222'},
 boss:{head:'#e0a98a',neck:'#e0a98a',chest:'#14141c',waist:'#c7342b',pelvis:'#14141c',uarm:'#14141c',larm:'#14141c',hand:'#e0a98a',thigh:'#14141c',calf:'#14141c',foot:'#111111'}
};
const CAT=n=>{n=n.toLowerCase();if(n==='head')return'head';if(n.startsWith('neck'))return'neck';
  if(n.startsWith('spine_03')||n.startsWith('spine_02')||n.startsWith('clavicle'))return'chest';if(n==='spine_01')return'waist';
  if(n==='pelvis'||n==='root')return'pelvis';if(n.startsWith('upperarm'))return'uarm';if(n.startsWith('lowerarm'))return'larm';
  if(/^(hand|index|middle|pinky|ring|thumb)/.test(n))return'hand';if(n.startsWith('thigh'))return'thigh';if(n.startsWith('calf'))return'calf';return'foot'};

function skinned(root){const a=[];root.traverse(o=>{if(o.isSkinnedMesh)a.push(o)});return a}
function dominant(mesh,i){const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight;let b=0,m=-1;for(let k=0;k<4;k++){const w=sw.array[i*4+k];if(w>m){m=w;b=si.array[i*4+k]}}return mesh.skeleton.bones[b].name}
function measure(root){
  root.updateMatrixWorld(true);
  const ms=skinned(root),all=new T.Box3(),hb=new T.Box3(),pb=new T.Box3(),v=new T.Vector3();
  for(const m of ms){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);all.expandByPoint(v);const c=CAT(dominant(m,i));if(c==='head')hb.expandByPoint(v);else if(c==='pelvis')pb.expandByPoint(v)}}
  const bone={};root.traverse(o=>{if(o.isBone){bone[o.name]=new T.Vector3().setFromMatrixPosition(o.matrixWorld)}});
  const hs=hb.getSize(new T.Vector3());
  return{height:all.max.y-all.min.y,minY:all.min.y,headC:hb.getCenter(new T.Vector3()),headS:hs,pelvisW:pb.getSize(new T.Vector3()).x,bone};
}
function geosFor(key,src,info){
  if(geoCache[key])return geoCache[key];
  const pal={};for(const k in PAL[key])pal[k]=new T.Color(PAL[key][k]);
  const out=skinned(src).map(m=>{const g=m.geometry.clone(),n=g.attributes.position.count,col=new Float32Array(n*3);
    for(let i=0;i<n;i++){const c=pal[CAT(dominant(m,i))];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
    g.setAttribute('color',new T.BufferAttribute(col,3));return g});
  return geoCache[key]=out;
}


/* ---------- fitted clothing shells: body triangles of the chosen bones, pushed out along the normal ---------- */
const SHELL={
 aoi:{chest:['#f4f4f8',.009],waist:['#f4f4f8',.009],pelvis:['#27346b',.013],hand:['#e8344f',.018],calf:['#1f2a5a',.009],foot:['#f4f4f8',.016]},
 thug:{chest:['#c7342b',.014],waist:['#c7342b',.014],pelvis:['#2b3a55',.016],thigh:['#2b3a55',.016],calf:['#2b3a55',.016],foot:['#1b1b1b',.024],hand:['#e8b48f',.012]},
 yankee:{chest:['#1f9d8b',.018],waist:['#1f9d8b',.018],uarm:['#1f9d8b',.016],larm:['#1f9d8b',.016],pelvis:['#d9d9e0',.034],thigh:['#d9d9e0',.036],calf:['#d9d9e0',.034],foot:['#ffffff',.02]},
 brute:{chest:['#4b4b57',.026],waist:['#4b4b57',.024],pelvis:['#5b4a2f',.02],thigh:['#5b4a2f',.02],calf:['#5b4a2f',.02],foot:['#222222',.026],hand:['#d4986f',.024]},
 boss:{chest:['#14141c',.02],waist:['#c7342b',.016],uarm:['#14141c',.018],larm:['#14141c',.016],pelvis:['#14141c',.018],thigh:['#14141c',.018],calf:['#14141c',.018],foot:['#111111',.024]}
};
const shellCache={};
function shellsFor(key,src){
  if(shellCache[key])return shellCache[key];
  const S=SHELL[key];if(!S)return shellCache[key]=[];
  const cols={};for(const k in S)cols[k]=new T.Color(S[k][0]);
  return shellCache[key]=skinned(src).map(m=>{
    const g=m.geometry,n=g.attributes.position.count,P=g.attributes.position.array,N=g.attributes.normal.array;
    const u=1/m.matrixWorld.getMaxScaleOnAxis(),pos=new Float32Array(n*3),col=new Float32Array(n*3),ok=new Uint8Array(n);
    for(let i=0;i<n;i++){
      const cat=CAT(dominant(m,i)),s=S[cat];
      let nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2];const l=Math.hypot(nx,ny,nz)||1;
      if(s){ok[i]=1;const d=s[1]*u/l;pos[i*3]=P[i*3]+nx*d;pos[i*3+1]=P[i*3+1]+ny*d;pos[i*3+2]=P[i*3+2]+nz*d;const c=cols[cat];col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
      else{pos[i*3]=P[i*3];pos[i*3+1]=P[i*3+1];pos[i*3+2]=P[i*3+2]}
    }
    const src2=g.index?g.index.array:null,idx=[];
    if(src2){for(let i=0;i<src2.length;i+=3){const a=src2[i],b=src2[i+1],c=src2[i+2];if(ok[a]&&ok[b]&&ok[c])idx.push(a,b,c)}}
    const sg=new T.BufferGeometry();
    sg.setAttribute('position',new T.BufferAttribute(pos,3));sg.setAttribute('normal',g.attributes.normal.clone());
    sg.setAttribute('skinIndex',g.attributes.skinIndex.clone());sg.setAttribute('skinWeight',g.attributes.skinWeight.clone());
    sg.setAttribute('color',new T.BufferAttribute(col,3));sg.setIndex(idx);
    return sg;
  });
}

/* ---------- accessories ---------- */
const GM=new T.DataTexture(new Uint8Array([150,200,255]),3,1,T.LuminanceFormat);GM.minFilter=GM.magFilter=T.NearestFilter;GM.needsUpdate=true;
const mat=(c,o)=>{o=Object.assign({},o||{});delete o.roughness;return new T.MeshToonMaterial(Object.assign({color:c,gradientMap:GM,side:T.DoubleSide},o))};
function attach(bone,obj,pos,rot){
  const wm=new T.Matrix4().compose(pos,rot||new T.Quaternion(),new T.Vector3(1,1,1));
  bone.updateWorldMatrix(true,false);
  obj.matrix.copy(new T.Matrix4().copy(bone.matrixWorld).invert().multiply(wm));obj.matrixAutoUpdate=false;bone.add(obj);
}
function mkHair(info,c1,c2,len,op){
  op=op||{};const YO=op.yo||0,A0=op.a0==null?-1.35:op.a0,A1=op.a1==null?1.35:op.a1,RS=op.rs||1,ZO=op.zo||0;
  const Rn=18,C=13,pos=new Float32Array(Rn*C*3),col=new Float32Array(Rn*C*3),idx=[],a=new T.Color(c1),b=new T.Color(c2),m=new T.Color();
  for(let j=0;j<Rn;j++)for(let i=0;i<C;i++){m.copy(a).lerp(b,Math.pow(j/(Rn-1),.8)*.8+(i%2?.06:0));const o=(j*C+i)*3;col[o]=m.r;col[o+1]=m.g;col[o+2]=m.b}
  for(let j=0;j<Rn-1;j++)for(let i=0;i<C-1;i++){const p=j*C+i;idx.push(p,p+1,p+C,p+1,p+C+1,p+C)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,3));geo.setIndex(idx);
  const mesh=new T.Mesh(geo,mat(0xffffff,{vertexColors:true}));mesh.frustumCulled=false;
  const hc=info.headC,hs=info.headS;
  mesh.userData.update=(lag,time)=>{
    for(let j=0;j<Rn;j++){const t=j/(Rn-1);
      for(let i=0;i<C;i++){const ang=A0+(A1-A0)*(i/(C-1));
        const bulge=1+.28*Math.sin(Math.min(1,t*1.4)*Math.PI*.85),taper=1-.62*t*t;
        const rx=hs.x*.58*bulge*taper*RS,rz=hs.z*.5*(1+.25*Math.sin(Math.min(1,t*1.4)*Math.PI*.85))*taper*RS;
        const y=hc.y+hs.y*.18+YO-t*len,cz=hc.z-hs.z*.04-t*.045+ZO;
        const o=(j*C+i)*3,wv=Math.sin(time*2.4+t*5+i*.3)*.012*t;
        pos[o]=hc.x+rx*Math.sin(ang)+lag.x*t*t*1.6+wv;
        pos[o+1]=y;
        pos[o+2]=cz-rz*Math.cos(ang)+lag.z*t*t*1.6}}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
  };
  mesh.userData.update({x:0,z:0},0);
  return mesh;
}
function capSphere(info,color,thetaLen,r,upY,backZ){
  const hs=info.headS,hc=info.headC;
  const g=new T.SphereGeometry(1,24,16,0,Math.PI*2,0,thetaLen),m=new T.Mesh(g,mat(color,{roughness:.5}));
  m.scale.set(hs.x*.5*r,hs.y*.5*r,hs.z*.5*r*1.04);
  const o=new T.Object3D();o.add(m);o.userData.pos=new T.Vector3(hc.x,hc.y+hs.y*upY,hc.z+backZ*hs.z);return o;
}
const ACC={
 aoi(rig,info,B){
   const hs=info.headS,hc=info.headC,H=B.Head,HAIR=0x1b1630;
   const cap=capSphere(info,HAIR,Math.PI*.62,1.1,.04,-.06);attach(H,cap,cap.userData.pos);
   const fr=new T.Mesh(new T.SphereGeometry(1,20,10,Math.PI/2-1.05,2.1,0,Math.PI*.42),mat(0x241c42));
   fr.scale.set(hs.x*.5*1.1,hs.y*.5*1.13,hs.z*.5*1.14);const fo=new T.Object3D();fo.add(fr);attach(H,fo,new T.Vector3(hc.x,hc.y+hs.y*.06,hc.z+hs.z*.02));
   // red hair tie at the root of the ponytail
   const tie=new T.Mesh(new T.TorusGeometry(hs.x*.1,hs.x*.035,8,14),mat(0xe8344f));const to=new T.Object3D();to.add(tie);
   attach(H,to,new T.Vector3(hc.x,hc.y+hs.y*.34,hc.z-hs.z*.5),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2.4,0,0)));
   face(rig,info,B,{lash:true,mouth:'#c04a60'});
   // pleated school skirt
   const rt=info.pelvisW*.55,sk=new T.Mesh(new T.CylinderGeometry(rt,rt*1.6,.2,24,1,true),mat(0x27346b));const so=new T.Object3D();so.add(sk);
   attach(B.pelvis,so,new T.Vector3(info.bone.pelvis.x,info.bone.pelvis.y-.05,info.bone.pelvis.z));
   const hem=new T.Mesh(new T.TorusGeometry(rt*1.6,.007,6,28),mat(0xf4f4f8));hem.rotation.x=Math.PI/2;const ho=new T.Object3D();ho.add(hem);
   attach(B.pelvis,ho,new T.Vector3(info.bone.pelvis.x,info.bone.pelvis.y-.15,info.bone.pelvis.z));
   // sailor collar and ribbon
   const col=new T.Mesh(new T.CylinderGeometry(rt*1.05,rt*1.3,.075,20,1,true),mat(0x1f2a5a));const co=new T.Object3D();co.add(col);
   attach(B.spine_03,co,new T.Vector3(info.bone.spine_03.x,info.bone.spine_03.y+.1,info.bone.spine_03.z-.01));
   const rb=new T.Mesh(new T.ConeGeometry(.07,.16,4),mat(0xe8344f));rb.rotation.x=Math.PI;rb.scale.z=.35;const ro=new T.Object3D();ro.add(rb);
   attach(B.spine_03,ro,new T.Vector3(info.bone.spine_03.x,info.bone.spine_03.y+.02,info.bone.spine_03.z+.15));
   const kn=new T.Mesh(new T.SphereGeometry(.02,8,6),mat(0xe8344f));const ko=new T.Object3D();ko.add(kn);
   attach(B.spine_03,ko,new T.Vector3(info.bone.spine_03.x,info.bone.spine_03.y+.1,info.bone.spine_03.z+.15));
   // high ponytail + two short side locks
   const hair=mkHair(info,'#1b1630','#3a3f8a',.56,{a0:-.55,a1:.55,rs:.55,yo:.09,zo:-.09});rig.wrap.add(hair);rig.hair=hair;
   const lockL=mkHair(info,'#241c42','#3a3f8a',.2,{a0:1.75,a1:2.2,rs:1.0,zo:.01}),lockR=mkHair(info,'#241c42','#3a3f8a',.2,{a0:-2.2,a1:-1.75,rs:1.0,zo:.01});
   rig.wrap.add(lockL,lockR);rig.locks=[lockL,lockR];
 },
 thug(rig,info,B){
   const hs=info.headS,hc=info.headC;
   for(let i=0;i<8;i++){const t=i/7,c=new T.Mesh(new T.ConeGeometry(hs.x*.1,hs.y*(.34-Math.abs(t-.5)*.18),6),mat(0xff4fa3));const o=new T.Object3D();o.add(c);
     attach(B.Head,o,new T.Vector3(hc.x,hc.y+hs.y*.5+.01,hc.z+hs.z*(t-.5)*.9),new T.Quaternion().setFromEuler(new T.Euler((t-.5)*.7,0,0)))}
   face(rig,info,B,{});
 },
 yankee(rig,info,B){
   const hs=info.headS,hc=info.headC;
   const cap=capSphere(info,0x1c1c1c,Math.PI*.5,1.08,.05,-.04);attach(B.Head,cap,cap.userData.pos);
   const bd=new T.Mesh(new T.TorusGeometry(hs.x*.52,hs.y*.05,8,24),mat(0x2f7de1));bd.rotation.x=Math.PI/2;const o=new T.Object3D();o.add(bd);attach(B.Head,o,new T.Vector3(hc.x,hc.y+hs.y*.2,hc.z-hs.z*.02));
   const kn=new T.Mesh(new T.BoxGeometry(hs.x*.5,hs.y*.2,.02),mat(0x2f7de1));const ko=new T.Object3D();ko.add(kn);attach(B.Head,ko,new T.Vector3(hc.x,hc.y+hs.y*.15,hc.z-hs.z*.55));
   face(rig,info,B,{});
 },
 brute(rig,info,B){
   const hs=info.headS,hc=info.headC;
   const sh=new T.Mesh(new T.BoxGeometry(hs.x*.95,hs.y*.13,hs.z*.2),mat(0x0a0a0a));const o=new T.Object3D();o.add(sh);attach(B.Head,o,new T.Vector3(hc.x,hc.y+hs.y*.05,hc.z+hs.z*.42));
   const bd=new T.Mesh(new T.SphereGeometry(1,16,10,0,Math.PI*2,Math.PI*.55,Math.PI*.4),mat(0x3a2a22));bd.scale.set(hs.x*.5*1.05,hs.y*.5*1.05,hs.z*.5*1.08);const bo=new T.Object3D();bo.add(bd);attach(B.Head,bo,new T.Vector3(hc.x,hc.y,hc.z+.005));
 },
 boss(rig,info,B){
   const hs=info.headS,hc=info.headC;
   const cap=capSphere(info,0x111111,Math.PI*.55,1.1,.05,-.05);attach(B.Head,cap,cap.userData.pos);
   const pm=new T.Mesh(new T.SphereGeometry(1,16,12),mat(0x111111));pm.scale.set(hs.x*.5,hs.y*.22,hs.z*.42);const po=new T.Object3D();po.add(pm);attach(B.Head,po,new T.Vector3(hc.x,hc.y+hs.y*.55,hc.z+hs.z*.3));
   const sh=new T.Mesh(new T.BoxGeometry(hs.x*.95,hs.y*.13,hs.z*.2),mat(0x0a0a0a));const o=new T.Object3D();o.add(sh);attach(B.Head,o,new T.Vector3(hc.x,hc.y+hs.y*.05,hc.z+hs.z*.42));
   // long coat (open at the front)
   const top=info.bone.spine_03.y+.08,bot=info.bone.calf_l.y+.08,h=top-bot,r=info.pelvisW*.62;
   const coat=new T.Mesh(new T.CylinderGeometry(r*1.15,r*1.75,h,24,1,true,Math.PI*.5+.7,Math.PI*2-1.4),mat(0x0b0b11));
   const co=new T.Object3D();co.add(coat);attach(B.pelvis,co,new T.Vector3(info.bone.pelvis.x,bot+h/2,info.bone.pelvis.z-.02));
   const sash=new T.Mesh(new T.CylinderGeometry(r*1.02,r*1.02,.05,20,1,true),mat(0xc7342b));const so=new T.Object3D();so.add(sash);attach(B.spine_01,so,new T.Vector3(info.bone.pelvis.x,info.bone.pelvis.y+.05,info.bone.pelvis.z));
 }
};
function face(rig,info,B,o){
  const hs=info.headS,hc=info.headC,er=hs.x*.125;
  for(const sx of[-1,1]){
    const e=new T.Mesh(new T.SphereGeometry(er,10,8),mat(0x19121f,{roughness:.3}));e.scale.set(.8,1.25,.5);const ob=new T.Object3D();ob.add(e);
    attach(B.Head,ob,new T.Vector3(hc.x+sx*hs.x*.2,hc.y+hs.y*.04,hc.z+hs.z*.53));
    const hl=new T.Mesh(new T.SphereGeometry(er*.32,6,6),new T.MeshBasicMaterial({color:0xffffff}));const hb=new T.Object3D();hb.add(hl);attach(B.Head,hb,new T.Vector3(hc.x+sx*hs.x*.2+er*.25,hc.y+hs.y*.04+er*.5,hc.z+hs.z*.54+er*.45));
    const br=new T.Mesh(new T.BoxGeometry(er*2.6,er*.35,er*.4),mat(0x19121f));br.rotation.z=sx*.12;const bo=new T.Object3D();bo.add(br);attach(B.Head,bo,new T.Vector3(hc.x+sx*hs.x*.2,hc.y+hs.y*.04+er*2.2,hc.z+hs.z*.53));
  }
  const m=new T.Mesh(new T.SphereGeometry(er*1.3,8,6),mat(o.mouth?new T.Color(o.mouth):0x7a3a30));m.scale.set(1.2,.35,.4);const mo=new T.Object3D();mo.add(m);
  attach(B.Head,mo,new T.Vector3(hc.x,hc.y-hs.y*.24,hc.z+hs.z*.51));
}

/* ---------- init ---------- */
R.init=async(w,h)=>{
  try{
    W=w;H=h;
    glc=document.createElement('canvas');glc.width=W;glc.height=H;
    renderer=new T.WebGLRenderer({canvas:glc,alpha:true,antialias:true});renderer.setSize(W*2,H*2,false);renderer.setClearColor(0x000000,0);
    scene=new T.Scene();hemi=new T.HemisphereLight(0xffffff,0x8a7a99,.55);dir=new T.DirectionalLight(0xffe0c0,.9);dir.position.set(-300,700,900);scene.add(hemi,dir);
    cam=new T.OrthographicCamera(0,W,H,0,1,6000);cam.position.z=3000;
    const [fe,a1,a2]=await Promise.all([load('female'),load('anim1'),load('anim2')]);
    const keep=t=>!/^root\.position/.test(t.name);
    a2.animations.forEach(c=>{CL[c.name]=new T.AnimationClip(c.name,c.duration,c.tracks.filter(keep))});
    a1.animations.forEach(c=>{
      const tr=[];for(const t of c.tracks){const i=t.name.lastIndexOf('.'),b=t.name.slice(0,i),p=t.name.slice(i);if(b==='root'){if(p!=='.position')tr.push(t);continue}
        if(!MAP[b])continue;tr.push(new t.constructor(MAP[b]+p,t.times,t.values))}
      CL[c.name]=new T.AnimationClip(c.name,c.duration,tr)});
    proto.f=fe.scene;proto.m=a2.scene;
    proto.fi=measure(proto.f);proto.mi=measure(proto.m);
    K=158/proto.mi.height;
    R.ok=true;
  }catch(err){console.warn('3D init failed',err);R.failed=true;R.err=String(err)}
};
R.setTheme=th=>{if(!dir)return;const c={dusk:[0xffd2a0,0xffffff,.55],night:[0x9ab4ff,0xb8c4ff,.5],hideout:[0xff9a7a,0xffc8b8,.5]}[th]||[0xffffff,0xffffff,.9];dir.color.setHex(c[0]);hemi.color.setHex(c[1]);hemi.intensity=c[2]};

/* ---------- rigs ---------- */
function keyOf(e){return e.styKey}
const OUT=new T.MeshBasicMaterial({color:0x140d1c,side:T.BackSide,skinning:true});
OUT.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex> transformed += normalize(normal)*0.012;')};
function makeRig(e){
  const key=keyOf(e),female=key==='aoi',src=female?proto.f:proto.m,info=female?proto.fi:proto.mi;
  const clone=T.SkeletonUtils.clone(src);clone.updateMatrixWorld(true);
  const geos=geosFor(key,src,info),ms=skinned(clone);
  ms.forEach((m,i)=>{m.geometry=geos[i];m.material=new T.MeshToonMaterial({vertexColors:true,gradientMap:GM,side:T.DoubleSide,skinning:true});m.frustumCulled=false});
  const mats=ms.map(m=>m.material);
  ms.forEach(m=>{const o=new T.SkinnedMesh(m.geometry,OUT);o.bind(m.skeleton,m.bindMatrix);o.frustumCulled=false;m.parent.add(o)});
  shellsFor(key,src).forEach((sg,i)=>{const m=ms[i],mt=new T.MeshToonMaterial({vertexColors:true,gradientMap:GM,side:T.DoubleSide,skinning:true});mats.push(mt);
    const s=new T.SkinnedMesh(sg,mt);s.bind(m.skeleton,m.bindMatrix);s.frustumCulled=false;m.parent.add(s);
    const o=new T.SkinnedMesh(sg,OUT);o.bind(m.skeleton,m.bindMatrix);o.frustumCulled=false;m.parent.add(o)});
  const B={};clone.traverse(o=>{if(o.isBone)B[o.name]=o});
  const wrap=new T.Group();wrap.add(clone);scene.add(wrap);
  const rig={wrap,clone,B,ms,mats,info,mixer:new T.AnimationMixer(clone),acts:{},cur:'',yaw:null,lag:new T.Vector3(),pv:null,pw:null,hair:null,key};
  ACC[key]&&ACC[key](rig,info,B);
  rig.wrap.traverse(o=>{if(o.isMesh)o.frustumCulled=false});
  return rig;
}
function playClip(rig,name,o){
  const clip=CL[name];if(!clip)return null;
  let a=rig.acts[name];if(!a){a=rig.mixer.clipAction(clip);rig.acts[name]=a}
  if(rig.cur!==name){
    const prev=rig.acts[rig.cur];a.reset();a.setLoop(o.loop?T.LoopRepeat:T.LoopOnce,Infinity);a.clampWhenFinished=true;a.enabled=true;a.setEffectiveWeight(1);a.paused=false;a.play();
    if(prev&&prev!==a)prev.crossFadeTo(a,o.fade==null?.12:o.fade,false);
    rig.cur=name;
  }
  if(o.time!=null){a.paused=true;a.time=clamp(o.time,0,clip.duration)}else{a.paused=false;a.setEffectiveTimeScale(o.ts||1)}
  return clip;
}
const AN={punchF:'Punch_Jab',punchB:'Punch_Cross',upper:'Melee_Hook',hammer:'OverhandThrow',shoulder:'Sword_Dash_RM'};
function chooseAnim(rig,e){
  const st=e.state,A=e.atk,isP=e.kind==='player',dur=n=>CL[n]?CL[n].duration:1;
  switch(st){
    case'idle':return{n:'Idle_Loop',loop:1};
    case'walk':return{n:isP?'Jog_Fwd_Loop':'Walk_Loop',loop:1,ts:isP?1.15:clamp(e.def.spd*.8,.7,1.7)};
    case'jump':return{n:'Jump_Loop',loop:1};
    case'jatk':return{n:'Jump_Loop',loop:1,proc:'jkick'};
    case'windup':case'attack':{
      const wu=st==='windup',tot=wu?A.wind:A.dur,an=AN[A.anim];
      if(an){const d=dur(an),k=wu?clamp(e.t/A.wind,0,1)*.3:.3+clamp(e.t/A.dur,0,1)*.7;return{n:an,time:k*d}}
      return{n:'Idle_Loop',loop:1,proc:A.anim,wu};
    }
    case'hurt':return{n:e.t%2<1&&e.hurtAlt?'Hit_Head':'Hit_Chest',time:clamp(e.t/(e.stun||16),0,1)*dur('Hit_Chest')};
    case'held':return{n:'Hit_Chest',time:(e.t%12)/12*dur('Hit_Chest')};
    case'holding':return{n:'Idle_Loop',loop:1};
    case'down':case'dead':return{n:'Hit_Knockback',time:Math.min(dur('Hit_Knockback'),e.t/60)};
    case'getup':return{n:'LayToIdle',time:clamp(e.t/28,0,1)*dur('LayToIdle')};
  }
  return{n:'Idle_Loop',loop:1};
}
const _q=new T.Quaternion(),_pq=new T.Quaternion(),_ax=new T.Vector3(),_wq=new T.Quaternion();
function rotX(rig,bone,ang){
  if(!bone||!ang)return;
  bone.parent.getWorldQuaternion(_pq);
  rig.wrap.getWorldQuaternion(_wq);
  _ax.set(1,0,0).applyQuaternion(_wq);
  _q.setFromAxisAngle(_ax,ang);
  const qd=_pq.clone().invert().multiply(_q).multiply(_pq);
  bone.quaternion.premultiply(qd);bone.updateMatrixWorld(true);
}
function procedural(rig,e,mode,wu){
  const A=e.atk,B=rig.B;let ch=0,ex=0;
  if(mode==='kick'||mode==='spin'){
    if(wu){ch=clamp(e.t/A.wind,0,1)}
    else if(e.t<A.hs){ex=clamp(e.t/A.hs,0,1);ch=1}
    else if(e.t<=A.he){ex=1;ch=1}
    else{const r=clamp((e.t-A.he)/(Math.max(1,Math.min(A.dur,40)-A.he)),0,1);ex=1-r;ch=1-r}
    if(mode==='spin'){ch=1;ex=clamp(e.t/5,0,1)}
    rotX(rig,B.spine_01,.14*ex);rotX(rig,B.spine_02,.14*ex);
    rotX(rig,B.thigh_r,-(ch*.85+ex*.6));rotX(rig,B.calf_r,ch*1.7*(1-ex)+.1);
    rotX(rig,B.thigh_l,.12*ex);
  }else if(mode==='jkick'){
    rotX(rig,B.spine_01,.12);rotX(rig,B.spine_02,.12);
    rotX(rig,B.thigh_r,-1.2);rotX(rig,B.calf_r,.1);rotX(rig,B.thigh_l,-.5);rotX(rig,B.calf_l,1.3);
  }
}
const _v=new T.Vector3(),_d=new T.Vector3();
function sync(rig,e,o){
  const w=rig.wrap;
  w.visible=true;
  if(e.inv>0&&e.kind==='player'&&Math.floor(o.frame/3)%2)w.visible=false;
  if(e.state==='dead'&&e.kind==='enemy'&&e.t>30&&Math.floor(e.t/3)%2)w.visible=false;
  const tx=e.x-o.cam,ty=H-(e.y-e.z);
  w.position.set(tx,ty,e.y);
  w.scale.setScalar(K*e.scale);
  let tgt=(e.face>0?1:-1)*(Math.PI/2-.42);
  if(rig.yaw==null)rig.yaw=tgt;
  rig.yaw+=(tgt-rig.yaw)*.3;
  let yaw=rig.yaw;
  if(e.state==='attack'&&e.atk&&e.atk.anim==='spin')yaw+=e.face*(e.t/e.atk.dur)*Math.PI*4;
  w.rotation.y=yaw;
  const an=chooseAnim(rig,e);
  playClip(rig,an.n,an);
  rig.mixer.update(o.dt);
  w.updateMatrixWorld(true);
  if(an.proc)procedural(rig,e,an.proc,an.wu);
  // hair physics-lite
  if(rig.hair){
    const hb=rig.B.Head;hb.getWorldPosition(_v);w.worldToLocal(_v);
    const wp=w.position,pv=rig.pv||_v.clone(),pw=rig.pw||wp.clone();
    _d.copy(_v).sub(pv);
    const dw=new T.Vector3().copy(wp).sub(pw).applyQuaternion(w.quaternion.clone().invert()).divideScalar(w.scale.x);
    _d.add(dw);
    rig.lag.multiplyScalar(.86).addScaledVector(_d,-.9);
    const L=rig.lag;L.x=clamp(L.x,-.22,.22);L.y=0;L.z=clamp(L.z,-.22,.22);
    rig.pv=_v.clone();rig.pw=wp.clone();
    rig.hair.position.set(_v.x-proto.fi.bone.Head.x,_v.y-proto.fi.bone.Head.y,_v.z-proto.fi.bone.Head.z);
    rig.hair.userData.update(L,o.frame/60);
    for(const hh of[rig.hair2].concat(rig.locks||[])){if(hh){hh.position.copy(rig.hair.position);hh.userData.update(L,o.frame/60+.7)}}
  }
  const fl=e.flash>0?.55:0;
  for(const m of rig.mats)m.emissive.setScalar(fl);
}
R.rigs=rigs;R.CL=CL;
R.prune=list=>{const keep=new Set(list);for(const[e,rg]of rigs)if(!keep.has(e)){scene.remove(rg.wrap);rg.mats.forEach(m=>m.dispose());rigs.delete(e)}};
R.draw=(list,o)=>{
  if(!R.ok)return false;
  for(const rg of rigs.values())rg.wrap.visible=false;
  if(!list.length)return true;
  for(const e of list){let rg=rigs.get(e);if(!rg){rg=makeRig(e);rigs.set(e,rg)}sync(rg,e,o)}
  renderer.render(scene,cam);
  o.g.drawImage(glc,0,0,W,H);
  return true;
};
})();
