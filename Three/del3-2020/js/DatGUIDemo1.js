/**
 * Demonstrerer bruk av dat.GUI fra /code.google.com/p/dat-gui
 *
 * NB! Viktig med renderer.domElement i addControls(renderer) pga. dat-gui (hvis ikke henger kontrollen fast i musepekeren).
 *
 * Bruk 'H' til å vise/skjule dat-gui-menyen.
 *
 * Se: http://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
 *
 * Bruker standard javascript / WebGL-inputhåndtering (keyboard)
 * wasd + pil opp / ned (fart)
 *  og ekstra fartskontroll (dat.GUI)
 */
//Globale varianbler:
let renderer;
let scene;
let camera;

//rotasjoner
let angle = 0.0;
let lastTime = 0.0;

//Roter & zoom:
let controls; //rotere, zoone hele scenen.

let SIZE = 200;

let helicopter;			//Helikoptermodellen.
let MAX_SPEED = 200;

let speedVector = new THREE.Vector3(-3, 0, -1);		//Fartsvektor.
let positionVector = new THREE.Vector3(-3, 0, -1); 	//Posisjonsvetor.
let delta = Math.PI / 100;  							//Hvor mye fartsvektoren roterer
let axis = new THREE.Vector3(0, 1, 0);			//Hvilken akse fartsvektoren roterer rundt.

//Tar vare på tastetrykk:
let currentlyPressedKeys = {};

//Figurer som helikoptret kan kræsje i:
let collidableMeshList = [];

//Lager en dat-gui "klasse":
let datGuiMenuElements = function () {
	this.message = "Velg fart & farge!";
	this.heliSpeed = 10;
	this.groundColor = "#ffae23";
	this.cubeMixColor = "#22aeee";
}
let datGUIs = new datGuiMenuElements();  //Instansierer

let meshPlane;
let tCube;		//Tekstur til kuben.
let meshCube;		//Kubens mesh.

//NB!
let clock = new THREE.Clock();

import * as THREE from '../../lib/three/build/three.module.js';
import { TrackballControls } from '../../lib/three/examples/jsm/controls/TrackballControls.js';
import { addCoordSystem} from "../../lib/wfa-coord.js";
import { fineCollisionTest, coarseCollisionTest } from "../../lib/wfa-collision.js";
import * as dat from "../../lib/datgui/build/dat.gui.module.js";

export function main() {
	//Henter referanse til canvaset:
	let mycanvas = document.getElementById('webgl');

	//Lager en scene:
	scene = new THREE.Scene();

	//Lager et rendererobjekt (og setter st�rrelse):
	renderer = new THREE.WebGLRenderer({canvas: mycanvas, antialias: true});
	renderer.setClearColor(0xBFD104, 0xff);  //farge, alphaverdi.
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMapEnabled = true; //NB!
	renderer.shadowMapType = THREE.PCFSoftShadowMap; //THREE.BasicShadowMap;

	//Oppretter et kamera:
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.x = 130;
	camera.position.y = 200;
	camera.position.z = 150;
	camera.up = new THREE.Vector3(0, 1, 0);
	let target = new THREE.Vector3(0.0, 0.0, 0.0);
	camera.lookAt(target);

	//Lys:
	let spotLight = new THREE.SpotLight(0xffffff); //hvitt lys
	spotLight.position.set(0, 400, 0);
	spotLight.castShadow = true;
	spotLight.shadowMapWidth = 1024;
	spotLight.shadowMapHeight = 1024;
	spotLight.shadowCameraNear = 200;
	spotLight.shadowCameraFar = 410;
	//spotLight.shadowCameraVisible = true;		//NB!! Viser lyskildens posisjon og utstrekning.
	scene.add(spotLight);

	//Retningsorientert lys:
	let directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0); //farge, intensitet (1=default)
	directionalLight1.position.set(2, 1, 4);
	scene.add(directionalLight1);

	let directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0); //farge, intensitet (1=default)
	directionalLight2.position.set(-2, 1, -4);
	scene.add(directionalLight2);

	//Legg modeller til scenen:
	addModels();

	//Koordinatsystem:
	addCoordSystem(scene);

	//Roter/zoom hele scenen:
	addControls(renderer);

	//Håndterer endring av vindusstørrelse:
	window.addEventListener('resize', onWindowResize, false);

	//Input - standard Javascript / WebGL:
	document.addEventListener('keyup', handleKeyUp, false);
	document.addEventListener('keydown', handleKeyDown, false);

	//Oppretter en dat.GUI(): Legger menyelementene inn i datGUIs:
	let gui = new dat.GUI();
	gui.add(datGUIs, 'message');
	gui.add(datGUIs, 'heliSpeed', 0, MAX_SPEED);
	gui.addColor(datGUIs, 'groundColor');
	gui.addColor(datGUIs, 'cubeMixColor');

	//Animer!
	animate();
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;
}

function addModels() {
	//Plan:
	let gPlane = new THREE.PlaneGeometry(SIZE * 2, SIZE * 2);
	let mPlane = new THREE.MeshLambertMaterial({color: datGUIs.groundColor, side: THREE.DoubleSide});
	meshPlane = new THREE.Mesh(gPlane, mPlane);
	meshPlane.rotation.x = Math.PI / 2;
	meshPlane.receiveShadow = true;	//NB!
	scene.add(meshPlane);
	//collidableMeshList.push(meshPlane);

	//Helikopter:
	addHeliModel();

	//Kube:
	//Definerer geometri og materiale (her kun farge) for en kube:
	let gCube = new THREE.BoxGeometry(40, 40, 40);
	tCube = THREE.ImageUtils.loadTexture("images/bird1.png");
	let mCube = new THREE.MeshPhongMaterial({map: tCube, color: datGUIs.cubeMixColor});
	meshCube = new THREE.Mesh(gCube, mCube);
	meshCube.name = "meshCube";
	//Legger kuben til scenen:
	meshCube.position.x = -70;
	meshCube.position.y = 20;
	meshCube.position.z = -100;
	meshCube.castShadow = true;
	scene.add(meshCube);
	collidableMeshList.push(meshCube);
	meshCube.geometry.computeBoundingSphere();

	let gCube1 = new THREE.BoxGeometry(40, 40, 40);
	let tCube1 = THREE.ImageUtils.loadTexture("images/metal1.jpg");
	let mCube1 = new THREE.MeshPhongMaterial({map: tCube1});
	let cube1 = new THREE.Mesh(gCube1, mCube1);
	cube1.name = "cubeOne";
	//Legger kuben til scenen:
	cube1.position.x = 70;
	cube1.position.y = 20;
	cube1.position.z = -100;
	cube1.castShadow = true;
	scene.add(cube1);
	collidableMeshList.push(cube1);
	cube1.geometry.computeBoundingSphere();
}

function addHeliModel() {
	//Konteiner:
	helicopter = new THREE.Object3D();

	//Cockpit:
	let texCocpit = THREE.ImageUtils.loadTexture('images/metal1.jpg');
	let gCockpit = new THREE.SphereGeometry(5, 16, 16);					//radius, widthSegments, heightSegments,
	gCockpit.computeBoundingSphere();
	let mCockpit = new THREE.MeshPhongMaterial({map: texCocpit});
	let meshCockpit = new THREE.Mesh(gCockpit, mCockpit);
	meshCockpit.castShadow = true;
	meshCockpit.name = "cockpit";
	meshCockpit.position.x = 0;
	meshCockpit.position.y = 0;
	meshCockpit.position.z = 0;
	helicopter.add(meshCockpit);

	//Body:
	let texBody = THREE.ImageUtils.loadTexture('images/metal1.jpg');
	let gBody = new THREE.CylinderGeometry(1.0, 4, 12, 8, 4, false);
	gBody.computeBoundingSphere();
	let mBody = new THREE.MeshPhongMaterial({map: texBody});
	let meshBody = new THREE.Mesh(gBody, mBody);
	meshBody.castShadow = true;
	meshBody.name = "body";
	meshBody.rotation.z = Math.PI / 2;
	meshBody.position.x = -7;
	meshBody.position.y = 0;
	meshBody.position.z = 0;
	helicopter.add(meshBody);

	//Rotor:
	let texRotor = THREE.ImageUtils.loadTexture('images/chocchip.png');
	let gRotor = new THREE.BoxGeometry(0.2, 20, 1);
	gRotor.computeBoundingSphere();
	let mRotor = new THREE.MeshPhongMaterial({map: texRotor});//new THREE.MeshBasicMaterial({ color:0x00de88});
	let meshRotor = new THREE.Mesh(gRotor, mRotor);
	meshRotor.name = "rotor";
	meshRotor.rotation.z = Math.PI / 2;
	meshRotor.rotation.y = Math.PI / 5;
	meshRotor.position.x = 0;
	meshRotor.position.y = 5;
	meshRotor.position.z = 0;
	meshRotor.castShadow = true;	//Skygge fra rotoren.
	helicopter.add(meshRotor);

	//Bakrotor:
	let gBRotor = new THREE.BoxGeometry(5, 1, 0.2);
	gBRotor.computeBoundingSphere();
	let mBRotor = new THREE.MeshPhongMaterial({map: texRotor});//new THREE.MeshBasicMaterial({ color:0x00de88});
	let meshBRotor = new THREE.Mesh(gBRotor, mBRotor);
	meshBRotor.name = "bakrotor";
	meshBRotor.position.x = -13.0;
	meshBRotor.position.y = 1;
	meshBRotor.position.z = 0;
	helicopter.add(meshBRotor);

	scene.add(helicopter);

	//Skygge?
	helicopter.castShadow = true;	//NB!
	//Flytter hele helikoptret:
	helicopter.position.y = 20;
}

//Legger til roter/zoom av scenen:
function addControls(renderer) {
	//NB! Viktit med renderer.domElement her pga. dat-gui (hvis ikke henger kontrollen fast i musepekeren).
	controls = new TrackballControls(camera, renderer.domElement);
	controls.addEventListener('change', render);
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 10;
	controls.panSpeed = 0.8;

	controls.noZoom = false;
	controls.noPan = false;

	controls.staticMoving = true;
	controls.dynamicDampingFactor = 0.3;
}

function animate() {
	requestAnimationFrame(animate);
	let elapsed = clock.getDelta(); // NB! Bruker Clock. Forløpt tid siden siste kall på draw().
	let rotationSpeed = Math.PI;  // Bestemmer rotasjonshastighet.
	angle = angle + (rotationSpeed * elapsed);
	angle %= (Math.PI * 2); // "Rull rundt" dersom angle >= 360 grader.

	//Roterer helikoptrets rotor:
	let rotor = helicopter.getObjectByName("rotor", true);  //true = recursive...
	//showDebug("rotor.name=" + rotor.name);
	if (rotor != undefined)
		rotor.rotation.y = angle;

	let bakrotor = helicopter.getObjectByName("bakrotor", true);  //true = recursive...
	if (bakrotor != undefined)
		bakrotor.rotation.z = angle;

	positionVector.x = positionVector.x + (speedVector.x * datGUIs.heliSpeed * elapsed);
	positionVector.y = 0;
	positionVector.z = positionVector.z + (speedVector.z * datGUIs.heliSpeed * elapsed);

	helicopter.position.x = positionVector.x;
	helicopter.position.z = positionVector.z;
	helicopter.rotation.y = getRotationAngleUsingAtan2();

	//Oppdaterer boundingsphere:
	let cockpit = helicopter.getObjectByName("cockpit", true);  //true = recursive...
	if (cockpit != undefined)
		cockpit.geometry.computeBoundingSphere();

	let body = helicopter.getObjectByName("body", true);  //true = recursive...
	if (body != undefined)
		body.geometry.computeBoundingSphere();

	//Endrer fargen på planet:
	//meshPlane.material.color =  datGUIs.groundColor;//datGUIs.groundColor;
	let material = new THREE.MeshLambertMaterial({color: datGUIs.groundColor, side: THREE.DoubleSide});
	meshPlane.material = material;

	let cubeMaterial = new THREE.MeshPhongMaterial({map: tCube, color: datGUIs.cubeMixColor});
	meshCube.material = cubeMaterial;

	//Sjekker input:
	keyCheck(elapsed);

	//Oppdater trackball-kontrollen:
	controls.update();

	//Kollisjonsdeteksjon:
	collisionTest();

	//Tegner scenen med gitt kamera:
	render();
}

//Sjekker tastaturet:
function keyCheck(elapsed) {

	if (currentlyPressedKeys[65]) { //A
		let matrix = new THREE.Matrix4().makeRotationAxis(axis, delta);
		speedVector.applyMatrix4(matrix);
	}
	if (currentlyPressedKeys[83]) {	//S
		datGUIs.heliSpeed -= 1;
		if (datGUIs.heliSpeed <= 0)
			datGUIs.heliSpeed = 0.0;
	}
	if (currentlyPressedKeys[87]) {	//W
		datGUIs.heliSpeed += 1;
		if (datGUIs.heliSpeed >= MAX_SPEED)
			datGUIs.heliSpeed = MAX_SPEED;
	}
	if (currentlyPressedKeys[68]) {	//D
		let matrix = new THREE.Matrix4().makeRotationAxis(axis, -delta);
		speedVector.applyMatrix4(matrix);
	}

	//Høyde (V/B):
	if (currentlyPressedKeys[86]) { //V
		helicopter.position.y -= 0.3;
	}
	if (currentlyPressedKeys[66]) {	//B
		helicopter.position.y += 0.3;
	}
}

//Enkel kollisjonstest:
function collisionTest() {
	//Sjekker de ulike helikopterdelene mot collidableMeshList dvs. kubene:
	let cockpit = helicopter.getObjectByName("cockpit", true);
	cockpit.updateMatrixWorld();
	collisionTestMesh(cockpit);
	let body = helicopter.getObjectByName("body", true);
	body.updateMatrixWorld();
	collisionTestMesh(body);
	let rotor = helicopter.getObjectByName("rotor", true);
	rotor.updateMatrixWorld();
	collisionTestMesh(rotor);
}

function collisionTestMesh(_mesh) {
	//Gjør først grovsjekk vha. boundingsphere:
	if (coarseCollisionTest(_mesh, collidableMeshList)) {		//Se wfa-collision.js
		//Dersom overlapp mellom sfærene gjøres en finere sjekk vha. Raycast
		if (fineCollisionTest(_mesh, collidableMeshList)) {  	//Se wfa-collision.js
			datGUIs.heliSpeed = 0;
			datGUIs.heliHeight = 20;
			positionVector = new THREE.Vector3(-3, 0, -1);
		}
	}
}

function render() {
	renderer.render(scene, camera);
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	controls.handleResize();
	render();
}

function getRotationAngleUsingAtan2() {
	return Math.atan2(speedVector.x, speedVector.z) - Math.PI / 2;
}
