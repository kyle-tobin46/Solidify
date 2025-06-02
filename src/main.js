//                === 1. Imports ===
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// HTML Elements
const slider = document.createElement("input");
slider.type = "range";
slider.min = 0;
slider.max = 360;
slider.value = 0;
slider.style.position = "absolute";
slider.style.top = "10px";
slider.style.left = "10px";
document.body.appendChild(slider);

const input = document.createElement("input");
input.type = "text";
input.value = "Math.sin(x)";
input.style.position = "absolute";
input.style.top = "40px";
input.style.left = "10px";
document.body.appendChild(input);

//                === 2. Scene Setup ===
const scene = new THREE.Scene();

//                === 3. Camera Setup ===
const d = 5;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -1000, 1000);
camera.updateProjectionMatrix();
camera.position.set(0, 0, 10);

//                === 4. Renderer Setup ===
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

//                === 5. Lights ===
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1000, 1000, 1000);
directionalLight.target.position.set(0, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//                === 6. Helpers ===
const gridSize = 100;
const gridDivisions = 100;
const gridColor = 0xeb4034;
const centerColor = 0xffffff;
const gridHelperXY = new THREE.GridHelper(gridSize, gridDivisions, gridColor, centerColor);
gridHelperXY.material.opacity = 0.2;
gridHelperXY.material.transparent = true;
gridHelperXY.rotation.x = Math.PI / 2;
scene.add(gridHelperXY);

// Center axes
function createAxisLine(start, end, color) {
  const material = new THREE.LineBasicMaterial({ color, linewidth: 4 });
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry, material);
}

scene.add(createAxisLine(new THREE.Vector3(-gridSize / 2, 0, 0), new THREE.Vector3(gridSize / 2, 0, 0), 'green'));
scene.add(createAxisLine(new THREE.Vector3(0, -gridSize / 2, 0), new THREE.Vector3(0, gridSize / 2, 0), 'green'));

// Arrows
scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), 10, 0xff00ff, 1, 0.1));
scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 10, 0xffff00, 1, 0.1));

//                === 7. Controls ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

//                === 8. Function Graphing ===
function f(x) {
  return eval(input.value);
}

const uStart = -50;
const uEnd = 50;
const uSteps = (uEnd - uStart) * 25;
const vSteps = 60;
const uRange = uEnd - uStart;

let mesh, redLineMesh, blueLineMesh;

function buildMesh(angleDeg) {
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  if (redLineMesh) {
    scene.remove(redLineMesh);
    redLineMesh.geometry.dispose();
    redLineMesh.material.dispose();
  }
  if (blueLineMesh) {
    scene.remove(blueLineMesh);
    blueLineMesh.geometry.dispose();
    blueLineMesh.material.dispose();
  }

  const angleLimit = (angleDeg / 360) * 2 * Math.PI;
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= uSteps; i++) {
    const u = uStart + (i / uSteps) * uRange;
    const y0 = f(u);
    for (let j = 0; j <= vSteps; j++) {
      const v = (j / vSteps) * angleLimit;
      const x = u;
      const y = y0 * Math.cos(v);
      const z = y0 * Math.sin(v);
      vertices.push(x, y, z);
    }
  }

  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * (vSteps + 1) + j;
      const b = a + vSteps + 1;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ 
    color: 0x0088ff, 
    side: THREE.DoubleSide, 
    transparent: true, 
    opacity: 0.8 
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Red function line
  const curvePoints = [];
  const blueCurvePoints = [];
  const lineSteps = uSteps * 2;
  for (let i = 0; i <= lineSteps; i++) {
    const x = uStart + (i / lineSteps) * uRange;
    const y = f(x);
    curvePoints.push(new THREE.Vector3(x, y, 0));
    blueCurvePoints.push(new THREE.Vector3(x, y * Math.cos(angleLimit), y * Math.sin(angleLimit)));
  }

  const redPath = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal');
  const redGeometry = new THREE.TubeGeometry(redPath, uSteps, 0.05, 12, false);
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  redLineMesh = new THREE.Mesh(redGeometry, redMaterial);
  scene.add(redLineMesh);

  const bluePath = new THREE.CatmullRomCurve3(blueCurvePoints, false, 'centripetal');
  const blueGeometry = new THREE.TubeGeometry(bluePath, uSteps, 0.04, 12, false);
  const blueMaterial = new THREE.MeshStandardMaterial({ color: 'blue' });
  blueLineMesh = new THREE.Mesh(blueGeometry, blueMaterial);
  scene.add(blueLineMesh);
}

input.addEventListener("change", () => buildMesh(parseFloat(slider.value)));
slider.addEventListener('input', () => buildMesh(parseFloat(slider.value)));
buildMesh(0);

//                === 9. Animation Loop ===
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();