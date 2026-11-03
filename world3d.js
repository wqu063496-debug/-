/* Mystery Town v30 — actual polygonal Three.js/WebGL world, not a rotated backdrop.
   All board stations, routes and pieces are rebuilt from the live engine state. */
(()=>{
'use strict';
if(!window.THREE){console.warn('Three.js CDN unavailable: using 2D fallback');return;}
const $3=id=>document.getElementById(id);
let scene,camera,renderer,world,raycaster,mouse,canvas,liveGame=null,oldBoard=null,oldRoads=null,positions=[],stations=[],pawnMeshes=[],pickables=[],angle=.72,elevation=.78,distance=35,drag=null,ready=false,frame=0;
const C={normal:0xe9d9b6,evidence:0x55cdb7,event:0xb96cf4,scene:0xff9478,interview:0x70a6ff,coin:0xffc654,card:0x80d46f,buzzer:0xff375a,informant:0x30e4ee};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.12,...extra});
const material={grass:mat(0x204b40),road:mat(0xc7b5a1),roadSide:mat(0x4c3b54),river:mat(0x0a6594,{metalness:.65,roughness:.18}),gold:mat(0xf3c46d,{metalness:.8,roughness:.18}),window:new THREE.MeshBasicMaterial({color:0xffd985}),roof:mat(0x303c7a),stone:mat(0x5b6674),pink:mat(0xf5a4d5),green:mat(0x286a56),trunk:mat(0x6c4a37)};
function mesh(geometry,m,x=0,y=0,z=0,parent=world){const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(w,h,d,m,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent)}
function sphere(r,m,x,y,z,parent){return mesh(new THREE.SphereGeometry(r,9,7),m,x,y,z,parent)}
function cylinder(rt,rb,h,m,x,y,z,parent){return mesh(new THREE.CylinderGeometry(rt,rb,h,10),m,x,y,z,parent)}
function cone(r,h,m,x,y,z,parent){return mesh(new THREE.ConeGeometry(r,h,5),m,x,y,z,parent)}
function seeded(i){const v=Math.sin(i*98.371+4.77)*43758.545;return v-Math.floor(v)}
function init(){if(!window.THREE)return false;const shell=$3('cityCanvas')?.parentElement;if(!shell)return false;
 canvas=document.createElement('div');canvas.id='world3d';canvas.title='3Dフィールド：ドラッグで回転・ホイールで拡大・マスをタップして移動';shell.appendChild(canvas);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0c1533);scene.fog=new THREE.FogExp2(0x0c1533,.014);
 camera=new THREE.PerspectiveCamera(48,1,.1,160);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;canvas.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0x93b9ff,0x1c251c,2.0));const moon=new THREE.DirectionalLight(0xc9dcff,2.6);moon.position.set(-13,28,12);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.left=-30;moon.shadow.camera.right=30;moon.shadow.camera.top=30;moon.shadow.camera.bottom=-30;scene.add(moon);
 const warm=new THREE.PointLight(0xffb35d,55,30);warm.position.set(0,9,0);scene.add(warm);
 raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();
 const dom=renderer.domElement;dom.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};dom.setPointerCapture(e.pointerId)});
 dom.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.px,dy=e.clientY-drag.py;drag.px=e.clientX;drag.py=e.clientY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved){angle-=dx*.009;elevation=Math.max(.25,Math.min(1.47,elevation+dy*.006));updateCamera();}}else{const id=pick(e);if(id!==null&&liveGame){const t=liveGame.board[id];$3('gridHover').textContent=`${id+1}番マス｜${t.type}｜${t.zone}`}}});
 dom.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const id=pick(e);if(id!==null&&liveGame){if(typeof g!=='undefined'&&g.phase==='choice'&&!E.current(g).bot&&!fxBusy&&gateUnlocked){if(E.reachable(g,E.current(g).pos,g.roll).includes(id))moveAnimated(id);else showToast('出目の歩数で到達できません')}}}drag=null});
 dom.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(12,Math.min(58,distance+Math.sign(e.deltaY)*2));updateCamera()},{passive:false});
 window.addEventListener('resize',resize);resize();updateCamera();ready=true;requestAnimationFrame(animate);return true;
}
function resize(){if(!renderer||!canvas)return;const w=canvas.clientWidth||900,h=canvas.clientHeight||550;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
function updateCamera(){if(!camera)return;const flat=Math.cos(elevation)*distance;camera.position.set(Math.sin(angle)*flat,Math.sin(elevation)*distance+1,Math.cos(angle)*flat);camera.lookAt(0,0,0);if(typeof ORBIT!=='undefined'){$3('orbitStatus').textContent=`3D 回転 ${Math.round(angle*180/Math.PI)}° / 高さ ${Math.round(elevation*180/Math.PI)}°`}}
function pick(e){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(pickables,false);return hits.length?hits[0].object.userData.tileId:null}
function roadBetween(a,b){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);const o=box(1.01,.22,len+.16,material.roadSide,(a.x+b.x)/2,.26,(a.z+b.z)/2);o.rotation.y=Math.atan2(dx,dz);const top=box(.77,.06,len+.12,material.road,(a.x+b.x)/2,.41,(a.z+b.z)/2);top.rotation.y=o.rotation.y;for(let j=1;j<len/.36;j++){const t=j/(len/.36),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;const line=box(.8,.014,.015,material.stone,x,.45,z);line.rotation.y=o.rotation.y}}
// Shared architectural materials keep the many detailed meshes inexpensive.
const architecture={
 cream:mat(0xe6cfb1),brick:mat(0x9d6271),blue:mat(0x9caac1),timber:mat(0x533a45),trim:mat(0xf4d8a4),roof:mat(0x263a77,{metalness:.3}),roofRed:mat(0x813e5e),glass:new THREE.MeshBasicMaterial({color:0xffd98d}),glassBlue:new THREE.MeshBasicMaterial({color:0x8be7ff}),awning:mat(0xc74b69),iron:mat(0x292b42),clock:mat(0xffe4b0),clockHand:mat(0x423149),door:mat(0x553b54)
};
function roofGable(x,y,z,w,d,m=architecture.roof){
 // Real sloping roof planes, visible from all camera directions.
 const shape=new THREE.BufferGeometry();const v=[-w/2,0,-d/2, w/2,0,-d/2,0,w*.56,0, -w/2,0,d/2,w/2,0,d/2,0,w*.56,0];
 const faces=[0,2,3,3,2,5,1,4,2,4,5,2,0,3,1,1,3,4];const coords=[];for(const i of faces)coords.push(v[i*3],v[i*3+1],v[i*3+2]);shape.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));shape.computeVertexNormals();return mesh(shape,new THREE.MeshStandardMaterial({color:m.color,roughness:.45,side:THREE.DoubleSide}),x,y,z);
}
function windowDetail(x,y,z,side='front',scale=1){
 const g=new THREE.Group();world.add(g);g.position.set(x,y,z);if(side==='back')g.rotation.y=Math.PI;if(side==='left')g.rotation.y=-Math.PI/2;if(side==='right')g.rotation.y=Math.PI/2;
 box(.29*scale,.39*scale,.055,architecture.trim,0,0,0,g);box(.235*scale,.33*scale,.066,architecture.glass,0,0,.035,g);
 box(.035*scale,.33*scale,.078,architecture.timber,0,0,.075,g);box(.25*scale,.027*scale,.078,architecture.timber,0,0,.075,g);
 box(.36*scale,.055*scale,.12,architecture.trim,0,-.22*scale,.03,g);
}
function tower(x,z,height=2.6){
 cylinder(.37,.45,height,architecture.cream,x,height/2+.15,z);cone(.65,1.05,architecture.roof,x,height+.67,z);
 cylinder(.045,.045,.4,material.gold,x,height+1.34,z);sphere(.1,material.gold,x,height+1.56,z);
 for(let k=0;k<4;k++){const a=k*Math.PI/2;const win=box(.19,.39,.05,architecture.glass,x+Math.sin(a)*.405,height*.64,z+Math.cos(a)*.405);win.rotation.y=a}
}
function house(x,z,i,style=0){
 const w=.9+seeded(i)*.42,d=.85+seeded(i+3)*.36,h=1.05+seeded(i+1)*.65;
 const wall=[architecture.cream,architecture.brick,architecture.blue][style%3];
 box(w,h,d,wall,x,h/2+.13,z);
 // Stone foundation, cornice, roof, gutters and ridge ornaments.
 box(w+.16,.19,d+.15,material.stone,x,.16,z);box(w+.12,.12,d+.12,architecture.trim,x,h+.16,z);
 roofGable(x,h+.22,z,w+.28,d+.28,style===1?architecture.roofRed:architecture.roof);
 const floors=h>1.35?2:1;
 for(let f=0;f<floors;f++)for(const k of [-1,1]){
   windowDetail(x+k*w*.26,.65+f*.55,z+d/2+.045,'front',.78);
   windowDetail(x+k*w*.26,.65+f*.55,z-d/2-.045,'back',.78);
 }
 for(const side of ['left','right'])windowDetail(x+(side==='left'?-w/2-.04:w/2+.04),.9,z,side,.78);
 box(.26,.53,.07,architecture.door,x,.41,z+d/2+.095);
 sphere(.027,material.gold,x+.07,.43,z+d/2+.145);
 // Decorative pilasters and gable medallion.
 for(const k of [-1,1])box(.07,h,.07,architecture.trim,x+k*(w/2-.06),h/2+.15,z+d/2+.04);
 sphere(.105,material.gold,x,h+.37,z+d/2+.065);
 if(style===1){ // Shops: striped canopy, hanging sign, balcony rail.
  box(w*.85,.075,.37,architecture.awning,x,.87,z+d/2+.29);
  for(let k=-2;k<=2;k++)box(w*.085,.08,.38,k%2?architecture.trim:architecture.awning,x+k*w*.17,.9,z+d/2+.29);
  box(.36,.29,.06,architecture.trim,x+w*.39,1.15,z+d/2+.15);
  box(w*.75,.035,.09,material.gold,x,1.22,z+d/2+.16);
  for(let k=-2;k<=2;k++)box(.025,.23,.025,architecture.iron,x+k*w*.14,1.1,z+d/2+.18);
 }
 if(style===2){ // Victorian homes: dormer and turret.
  box(.29,.38,.32,wall,x+w*.18,h+.53,z);roofGable(x+w*.18,h+.76,z,.38,.39);
  if(i%4===0)tower(x+w*.55,z-d*.3,h+1.0);
 }
 if(i%7===0){ // An illuminated lantern outside the entrance.
  cylinder(.027,.03,.54,material.gold,x-w*.55,.38,z+d*.6);
  sphere(.12,architecture.glass,x-w*.55,.7,z+d*.6);
 }
}
function tree(x,z,i){cylinder(.08,.11,.65,material.trunk,x,.38,z);const blossom=seeded(i)>.57;const foliage=blossom?material.pink:material.green;for(let k=0;k<3;k++)sphere(.42+seeded(i+k)*.15,foliage,x+(k-1)*.24,1.03+(k%2)*.26,z+(k-1)*.12)}
function lamp(x,z){cylinder(.055,.075,1.4,material.gold,x,.75,z);sphere(.18,new THREE.MeshBasicMaterial({color:0xffdf8c}),x,1.54,z);const light=new THREE.PointLight(0xffbc61,2.2,3.5);light.position.set(x,1.54,z);world.add(light)}
function castle(){
 // Multi-wing gothic palace with actual turrets, gables, colonnade and stained glass.
 const x=0,z=-6.7;
 box(5.3,.65,3.8,material.stone,x,.33,z);
 box(4.6,2.45,2.5,architecture.cream,x,1.85,z);
 box(5,.17,2.8,architecture.trim,x,3.13,z);
 roofGable(x,3.25,z,5.2,3.15);
 for(const wing of [-1,1]){
   box(1.35,1.8,2.2,architecture.blue,x+wing*2.9,1.45,z);
   roofGable(x+wing*2.9,2.4,z,1.7,2.5,architecture.roofRed);
   tower(x+wing*3.75,z-.8,3.45);tower(x+wing*2.0,z-1.2,3.05);
   for(let f=0;f<2;f++)windowDetail(x+wing*2.9,1.1+f*.65,z+1.14,'front',.95);
 }
 for(let k=-3;k<=3;k++){
   if(k!==0){windowDetail(k*.53,1.5,z+1.3,'front',1.0);windowDetail(k*.53,2.4,z+1.3,'front',.82)}
 }
 // Glowing central entrance, pointed gothic window and grand staircase.
 box(.84,1.4,.1,architecture.door,x,1.05,z+1.35);
 box(.73,1.14,.11,architecture.glass,x,1.17,z+1.43);
 cone(.52,.6,architecture.trim,x,2.1,z+1.45);
 for(let j=0;j<5;j++)box(1.3+j*.18,.12,.38,material.stone,x,.25+j*.12,z+1.7+j*.34);
 for(let k=-2;k<=2;k++){
   const bx=k*.7;box(.08,1.1,.12,architecture.trim,bx,1.05,z+1.34);
   cone(.11,.3,material.gold,bx,1.73,z+1.36);
 }
 // Decorative clock on the front spire.
 tower(x,z-.45,4.4);
 cylinder(.29,.29,.065,architecture.clock,x,3.88,z+1.33).rotation.x=Math.PI/2;
 box(.035,.22,.06,architecture.clockHand,x,3.91,z+1.39);
 box(.16,.035,.06,architecture.clockHand,x+.07,3.85,z+1.39);
 for(const k of [-1,1]){
   box(.12,1.5,.12,material.gold,k*2.4,1.35,z+1.55);
   sphere(.15,architecture.glass,k*2.4,2.13,z+1.55);
 }
}
function makeTerrain(){box(27,.65,20,material.grass,0,-.35,0);for(let i=0;i<4;i++){const colors=[0x245640,0x59466e,0x8a5839,0x286254];const x=i%2?6.65:-6.65,z=i<2?-4.95:4.95;box(13.1,.09,9.8,mat(colors[i]),x,.02,z)}
 // Actual water meshes and banks, not a 2D background.
 const water=box(2.6,.06,19.9,material.river,2.9,.07,0);water.rotation.y=-.11;
 for(let z=-8;z<=8;z+=2.8){const bridge=box(3.1,.38,.9,material.stone,2.9,.47,z);bridge.rotation.y=-.11;for(const sx of [-1,1])box(.12,.4,.9,material.gold,2.9+sx*1.55,.78,z)}
 for(let i=0;i<48;i++){let x=(seeded(i+99)-.5)*25,z=(seeded(i+119)-.5)*18;if(Math.abs(x-2.9)<1.7)continue; if(i%4===0)lamp(x,z);else tree(x,z,i)}
 for(let i=0;i<29;i++){let x=(seeded(i+200)-.5)*24,z=(seeded(i+270)-.5)*17;if(Math.abs(x-2.9)<2.4||Math.abs(x)<2&&z< -5)continue;house(x,z,i,i%3)}
 castle();cylinder(1.1,1.2,.25,material.stone,-2.5,.22,-.3);cylinder(.6,.8,.8,material.stone,-2.5,.72,-.3);sphere(.35,new THREE.MeshBasicMaterial({color:0x45dfff}),-2.5,1.3,-.3);const fountainLight=new THREE.PointLight(0x45ddff,9,6);fountainLight.position.set(-2.5,1.8,-.3);world.add(fountainLight)
}
function build(game){if(!ready||!game)return; if(world){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values(material).includes(o.material))o.material.dispose()})}world=new THREE.Group();scene.add(world);pickables=[];stations=[];pawnMeshes=[];positions=[];makeTerrain();
 for(let id=0;id<150;id++){const q=E.gridCoord(id);positions[id]={x:(q.x-7)*1.66,z:(q.y-4.5)*1.87}}
 for(let i=0;i<150;i++)for(const j of E.neighbors(game,i))if(j>i)roadBetween(positions[i],positions[j]);
 for(let id=0;id<150;id++){const p=positions[id],tile=game.board[id];const type=tile.type||'normal';const color=C[type]||C.normal;const tileMat=mat(color,{emissive:color,emissiveIntensity:type==='buzzer'||type==='informant'?.32:.09,metalness:.35,roughness:.25});
 const base=box(1.1,.31,1.1,material.roadSide,p.x,.52,p.z);const top=box(.96,.17,.96,tileMat,p.x,.76,p.z);top.userData.tileId=id;pickables.push(top);stations[id]=top;
 if(type==='buzzer'){cylinder(.22,.27,.28,mat(0xd81935,{emissive:0xf00028,emissiveIntensity:.8}),p.x,1.01,p.z)}
 else if(type==='informant'){cone(.34,.6,mat(0x1c354d),p.x,1.14,p.z);sphere(.22,material.gold,p.x,1.49,p.z)}
 else if(type==='evidence'||type==='card'){const emblem=type==='evidence'?material.gold:material.window;box(.4,.07,.4,emblem,p.x,.89,p.z)}
 }
 for(let i=0;i<4;i++){const group=new THREE.Group();const color=[0x4bbaff,0xff5f6b,0x61df9a,0xffcf58][i];cylinder(.3,.39,.22,material.gold,0,.08,0,group);cone(.22,.48,mat(color,{metalness:.5}),0,.42,0,group);sphere(.2,material.gold,0,.78,0,group);world.add(group);pawnMeshes.push(group)}updatePawns(game)
}
function updatePawns(game){if(!game||!pawnMeshes.length)return;for(let i=0;i<game.players.length;i++){const p=game.players[i],pos=positions[p.pos];if(!pos)continue;const offset=(i-1.5)*.17;pawnMeshes[i].position.set(pos.x+offset,.9,pos.z+offset)}}
function sync(){if(!ready||typeof g==='undefined'||!g)return;if(g!==liveGame||g.board!==oldBoard||g.roads!==oldRoads){liveGame=g;oldBoard=g.board;oldRoads=g.roads;build(g)}else{ // Informant relocation and other live tile mutations.
 for(let i=0;i<150;i++){const t=g.board[i],o=stations[i];if(!o)continue;const col=C[t.type]||C.normal;if(o.userData.lastType!==t.type){o.material.color.setHex(col);o.material.emissive.setHex(col);o.material.emissiveIntensity=t.type==='informant'||t.type==='buzzer'?.32:.09;o.userData.lastType=t.type}}
 updatePawns(g)}
}
function animate(){requestAnimationFrame(animate);if(!ready)return;if(++frame%5===0)sync();renderer.render(scene,camera)}
function controls(){const oldOrbit=window.orbitCamera;window.orbitCamera=(dy,dp)=>{angle+=dy*Math.PI/180;elevation=Math.max(.25,Math.min(1.47,elevation+dp*Math.PI/180));updateCamera()};window.resetOrbit=()=>{angle=.72;elevation=.78;distance=35;updateCamera()};const oldDraw=window.drawCity;window.drawCity=function(...args){if(typeof oldDraw==='function')oldDraw(...args);sync()};}
window.addEventListener('DOMContentLoaded',()=>{try{if(init())controls();else console.warn('Three.js unavailable; using the original playable Canvas map')}catch(err){console.error('3D initialization failed, Canvas fallback active',err);canvas?.remove()}});
})();
