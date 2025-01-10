import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({ mass: 0 });
floorBody.addShape(floorShape);
floorBody.position.set(0, -5, 0);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(floorBody);

const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshPhongMaterial({
  color: 0x0a1a2f,
  shininess: 100,
  specular: 0x3399ff
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5;
scene.add(floor);

const wallShape = new CANNON.Plane();
const wallPositions = [
  { pos: [10, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [-10, 0, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [0, 0, -10], rot: [0, 0, 0] },
  { pos: [0, 0, 10], rot: [0, Math.PI, 0] }
];

wallPositions.forEach(({ pos, rot }) => {
  const wallBody = new CANNON.Body({ mass: 0 });
  wallBody.addShape(wallShape);
  wallBody.position.set(...pos);
  wallBody.quaternion.setFromEuler(...rot);
  world.addBody(wallBody);
});

const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 4
});
const innerLight = new THREE.Mesh(sphereGeometry, sphereMaterial);

const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
const cubeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.9,
  thickness: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.6,
  ior: 1.5,
  attenuationColor: 0x68ccff,
  attenuationDistance: 0.5
});
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.add(innerLight);
scene.add(cube);

const cubeLight = new THREE.PointLight(0x00ffff, 4, 12);
cubeLight.position.set(0, 0, 0);
cube.add(cubeLight);

const cubeShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
const cubeBody = new CANNON.Body({
  mass: 5,
  shape: cubeShape,
  linearDamping: 0.1,
  angularDamping: 0.2,
  material: new CANNON.Material({ restitution: 0.7, friction: 0.5 })
});
world.addBody(cubeBody);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x001a33, 0.5));

const pointLight1 = new THREE.PointLight(0x00ffff, 1, 20);
pointLight1.position.set(5, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff00ff, 1, 20);
pointLight2.position.set(-5, 5, -5);
scene.add(pointLight2);

camera.position.set(0, 2, 10);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

const playerBody = new CANNON.Body({
  mass: 5,
  shape: new CANNON.Sphere(1),
  position: new CANNON.Vec3(0, 2, 10),
  linearDamping: 0.9
});
world.addBody(playerBody);

let canJump = false;
const contactNormal = new CANNON.Vec3();
const upAxis = new CANNON.Vec3(0, 1, 0);

playerBody.addEventListener('collide', (e) => {
  const contact = e.contact;
  contact.ni.negate(contactNormal);
  if (contactNormal.dot(upAxis) > 0.5) {
    canJump = true;
  }
});

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let pitch = 0;
let yaw = 0;

document.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const edgeThreshold = 0.8;
  const rotationSpeed = 0.05;

  if (mouseX > edgeThreshold) {
    yaw -= rotationSpeed;
  } else if (mouseX < -edgeThreshold) {
    yaw += rotationSpeed;
  }

  if (mouseY > edgeThreshold) {
    pitch = Math.min(pitch + rotationSpeed, Math.PI / 2);
  } else if (mouseY < -edgeThreshold) {
    pitch = Math.max(pitch - rotationSpeed, -Math.PI / 2);
  }

  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
});

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'Space':
      if (canJump) {
        playerBody.velocity.y = 10;
        canJump = false;
      }
      break;
  }
});

document.addEventListener('mousedown', () => {
  isDragging = true;
  cubeBody.mass = 0;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  cubeBody.mass = 5;
});

document.addEventListener('mousemove', (event) => {
  if (isDragging) {
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    const movementSpeed = 0.05;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const right = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize();

    cubeBody.position.x += (deltaX * right.x - deltaY * cameraDirection.x) * movementSpeed;
    cubeBody.position.y += deltaY * 0.05;
    cubeBody.position.z += (deltaX * right.z - deltaY * cameraDirection.z) * movementSpeed;

    cubeBody.velocity.set(0, 0, 0);
    cubeBody.angularVelocity.set(0, 0, 0);
  }

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
});

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(15, 15, 15);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.1;
spotLight.decay = 2;
spotLight.distance = 200;
scene.add(spotLight);

function animate() {
  requestAnimationFrame(animate);

  const delta = 1 / 60;

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationY(yaw);

  direction.z = Number(moveBackward) - Number(moveForward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();
  direction.applyMatrix4(rotationMatrix);

  const speed = 20.0;
  if (moveForward || moveBackward || moveLeft || moveRight) {
    playerBody.velocity.x = direction.x * speed;
    playerBody.velocity.z = direction.z * speed;
  } else {
    playerBody.velocity.x *= 0.9;
    playerBody.velocity.z *= 0.9;
  }

  camera.position.copy(playerBody.position);

  world.step(delta);

  cube.position.copy(cubeBody.position);
  cube.quaternion.copy(cubeBody.quaternion);
  cubeLight.position.copy(cube.position);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
