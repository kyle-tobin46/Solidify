// === 1. Imports ===
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// === 2. Global Variables ===
let mesh,
    redLineMesh,
    secondRedLineMesh,
    blueLineMesh,
    secondBlueLineMesh,
    axisLine,
    pinkMesh,        // rotating ribbon
    staticPinkMesh;  // static ribbon
let domainLines = [];

// Camera‐animation state
let isCameraAnimating = false;
const cameraStartPos = new THREE.Vector3();
const cameraEndPos = new THREE.Vector3();
let animStartTime = 0;
const animDuration = 500; // milliseconds

// === 3. Input Elements ===
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

const xMinInput = document.createElement("input");
xMinInput.type = "number";
xMinInput.value = "-1";
xMinInput.style.position = "absolute";
xMinInput.style.top = "70px";
xMinInput.style.left = "10px";
document.body.appendChild(xMinInput);

const xMaxInput = document.createElement("input");
xMaxInput.type = "number";
xMaxInput.value = "1";
xMaxInput.style.position = "absolute";
xMaxInput.style.top = "100px";
xMaxInput.style.left = "10px";
document.body.appendChild(xMaxInput);

const axisInput = document.createElement("input");
axisInput.type = "text";
axisInput.value = "y = 0";
axisInput.style.position = "absolute";
axisInput.style.top = "130px";
axisInput.style.left = "10px";
axisInput.placeholder = "axis of rotation";
document.body.appendChild(axisInput);

const secondFuncInput = document.createElement("input");
secondFuncInput.type = "text";
secondFuncInput.value = "";
secondFuncInput.style.position = "absolute";
secondFuncInput.style.top = "160px";
secondFuncInput.style.left = "10px";
secondFuncInput.placeholder = "second function (optional)";
document.body.appendChild(secondFuncInput);

// === Buttons for Camera Views ===
const frontBtn = document.createElement("button");
frontBtn.innerText = "Front View";
frontBtn.style.position = "absolute";
frontBtn.style.top = "190px";
frontBtn.style.left = "10px";
document.body.appendChild(frontBtn);

const sideBtn = document.createElement("button");
sideBtn.innerText = "Side View";
sideBtn.style.position = "absolute";
sideBtn.style.top = "220px";
sideBtn.style.left = "10px";
document.body.appendChild(sideBtn);

const topBtn = document.createElement("button");
topBtn.innerText = "Top View";
topBtn.style.position = "absolute";
topBtn.style.top = "250px";
topBtn.style.left = "10px";
document.body.appendChild(topBtn);

// === 4. Scene & Camera Setup ===
const scene = new THREE.Scene();

const d = 5;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, -1000, 1000
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// === 5. Renderer Setup (with Shadows) ===
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x263238);               // dark background
renderer.shadowMap.enabled = true;               // enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

window.addEventListener('resize', () => {
  const newAspect = window.innerWidth / window.innerHeight;
  camera.left   = -d * newAspect;
  camera.right  =  d * newAspect;
  camera.top    =  d;
  camera.bottom = -d;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === 6. Lights ===
{
  // Ambient Light
  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambient);

  // Directional Light (casts shadows)
  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(5, 10, 7.5);
  dirLight.castShadow = true;

  // Configure shadow camera for sharper shadows
  dirLight.shadow.camera.left   = -2;
  dirLight.shadow.camera.right  = +2;
  dirLight.shadow.camera.top    = +2;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.mapSize.width  = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.radius = 4; // soften edges

  scene.add(dirLight);
}

// === 7. Grid Helper (XY plane) ===
const gridHelperXY = new THREE.GridHelper(100, 100, 0xeb4034, 0xffffff);
gridHelperXY.material.opacity = 0.2;
gridHelperXY.material.transparent = true;
gridHelperXY.rotation.x = Math.PI / 2; // rotate from XZ into XY
scene.add(gridHelperXY);

// === 8. Orbit Controls ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// === 9. Helpers: Create PBR Materials ===
function createRibbonMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xE91E63, 
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    clipShadows: true,
    shadowSide: THREE.DoubleSide
  });
}

function createSolidMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xFFC107,       
    metalness: 0.1,
    roughness: 0.75,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    clipShadows: true,
    shadowSide: THREE.DoubleSide
  });
}

function createLineMaterial(colorString) {
  return new THREE.LineBasicMaterial({ color: colorString });
}

// === 10. Function Evaluators ===
function f(x) {
  return eval(input.value);
}
function f2(x, isYAxis, axisValue) {
  if (!secondFuncInput.value.trim()) {
    return axisValue;
  }
  try {
    return eval(secondFuncInput.value);
  } catch {
    return axisValue;
  }
}

// === 11. Camera Animation Helper ===
function animateCameraTo(x, y, z) {
  cameraStartPos.copy(camera.position);
  cameraEndPos.set(x, y, z);
  animStartTime = performance.now();
  isCameraAnimating = true;
}

// Hook up view buttons:
frontBtn.addEventListener("click", () => {
  // Front view → positive Z
  animateCameraTo(0, 0, 10);
});
sideBtn.addEventListener("click", () => {
  // Side view → positive X
  animateCameraTo(10, 0, 0);
});
topBtn.addEventListener("click", () => {
  // Top‐down → positive Y
  animateCameraTo(0, 10, 0);
});

// === 12. Mesh Builder ===
function buildMesh(angleDeg) {
  const uStart = parseFloat(xMinInput.value);
  const uEnd   = parseFloat(xMaxInput.value);
  if (isNaN(uStart) || isNaN(uEnd) || uStart === uEnd) return;

  const uSteps = 200;
  const vSteps = 120;
  const uStepsRed = 8000;
  const uRange = uEnd - uStart;
  const angleLimit = (angleDeg / 360) * 2 * Math.PI;

  // Parse axis ("x = ..." or "y = ...")
  const axisRaw = axisInput.value.trim();
  let isYAxis = false;
  let axisValue = 0;
  if (axisRaw.startsWith("x")) {
    isYAxis = true;
    axisValue = parseFloat(axisRaw.split("=")[1].trim());
  } else if (axisRaw.startsWith("y")) {
    axisValue = parseFloat(axisRaw.split("=")[1].trim());
  }

  // Dispose previous objects (including staticPinkMesh)
  [mesh, redLineMesh, secondRedLineMesh, blueLineMesh, secondBlueLineMesh, axisLine, pinkMesh, staticPinkMesh].forEach(obj => {
    if (obj) {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  });
  domainLines.forEach(line => {
    scene.remove(line);
    if (line.geometry) line.geometry.dispose();
    if (line.material) line.material.dispose();
  });
  domainLines = [];
  mesh = redLineMesh = secondRedLineMesh = blueLineMesh = secondBlueLineMesh = axisLine = pinkMesh = staticPinkMesh = null;

  // === Red Function Line (f(x)) ===
  const redPts = [];
  for (let i = 0; i <= uStepsRed; i++) {
    const x = -50 + (i / uStepsRed) * 100;
    redPts.push(new THREE.Vector3(x, f(x), 0));
  }
  redLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(redPts),
    createLineMaterial("#fc2803")
  );
  scene.add(redLineMesh);

  // === Red Line for f₂(x) ===
  const secondRedPts = [];
  for (let i = 0; i <= uStepsRed; i++) {
    const x = -50 + (i / uStepsRed) * 100;
    secondRedPts.push(new THREE.Vector3(x, f2(x, isYAxis, axisValue), 0));
  }
  secondRedLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(secondRedPts),
    createLineMaterial("#fc2803")
  );
  scene.add(secondRedLineMesh);

  // === Axis of Rotation Line (dashed) ===
  const axisMat = new THREE.LineDashedMaterial({
    color: 0xffa500,
    dashSize: 0.5,
    gapSize: 0.5,
    linewidth: 2
  });
  const axisPts = isYAxis
    ? [new THREE.Vector3(axisValue, -50, 0), new THREE.Vector3(axisValue, 50, 0)]
    : [new THREE.Vector3(-50, axisValue, 0), new THREE.Vector3(50, axisValue, 0)];
  axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPts), axisMat);
  axisLine.computeLineDistances();
  scene.add(axisLine);

  // === Domain‐Boundary Dashed Lines ===
  const domainMat = new THREE.LineDashedMaterial({
    color: 'pink',
    dashSize: 0.2,
    gapSize: 0.1,
    linewidth: 1
  });
  [uStart, uEnd].forEach(u => {
    const yFunc = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    if (isYAxis) {
      // Horizontal dashed from axis to inner
      const startH = new THREE.Vector3(axisValue, yInner, 0);
      const endH   = new THREE.Vector3(u,       yInner, 0);
      const geoH = new THREE.BufferGeometry().setFromPoints([startH, endH]);
      const lineH = new THREE.Line(geoH, domainMat);
      lineH.computeLineDistances();
      scene.add(lineH);
      domainLines.push(lineH);

      // Vertical dashed from (u, yInner) to (u, yFunc)
      const startV = new THREE.Vector3(u, yInner, 0);
      const endV   = new THREE.Vector3(u, yFunc,  0);
      const geoV = new THREE.BufferGeometry().setFromPoints([startV, endV]);
      const lineV = new THREE.Line(geoV, domainMat);
      lineV.computeLineDistances();
      scene.add(lineV);
      domainLines.push(lineV);
    } else {
      // Vertical dashed from axis to inner
      const startV = new THREE.Vector3(u, axisValue, 0);
      const endV   = new THREE.Vector3(u, yInner,   0);
      const geoV = new THREE.BufferGeometry().setFromPoints([startV, endV]);
      const lineV = new THREE.Line(geoV, domainMat);
      lineV.computeLineDistances();
      scene.add(lineV);
      domainLines.push(lineV);

      // Vertical dashed from (u, yInner) to (u, yFunc)
      const startU = new THREE.Vector3(u, yInner, 0);
      const endU   = new THREE.Vector3(u, yFunc,  0);
      const geoU = new THREE.BufferGeometry().setFromPoints([startU, endU]);
      const lineU = new THREE.Line(geoU, domainMat);
      lineU.computeLineDistances();
      scene.add(lineU);
      domainLines.push(lineU);
    }
  });

  // === Generate Full Solid of Revolution ===
  const vertices = [], indices = [];
  for (let i = 0; i <= uSteps; i++) {
    const u = uStart + (i / uSteps) * uRange;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    for (let j = 0; j <= vSteps; j++) {
      const v = (j / vSteps) * angleLimit;
      const pushPt = (r, yVal) => {
        if (isYAxis) {
          const dx = u - axisValue;
          const x = axisValue + dx * r;
          const y = yVal;
          const z = dx * Math.sin(v);
          vertices.push(x, y, z);
        } else {
          const dy = yVal - axisValue;
          const x = u;
          const y = axisValue + dy * r;
          const z = dy * Math.sin(v);
          vertices.push(x, y, z);
        }
      };
      pushPt(Math.cos(v), yOuter);
      pushPt(Math.cos(v), yInner);
    }
  }

  const stride = (vSteps + 1) * 2;
  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * stride + j * 2;
      const b = a + stride;
      const c = b + 2;
      const d = a + 2;
      const a2 = a + 1, b2 = b + 1, c2 = c + 1, d2 = d + 1;
      // Outer surface
      indices.push(a, b, d);
      indices.push(b, c, d);
      // Inner surface
      indices.push(c2, b2, d2);
      indices.push(b2, a2, d2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  mesh = new THREE.Mesh(geometry, createSolidMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // === Blue Rotated Curve for f(x) ===
  const bluePts = [];
  for (let i = 0; i <= uSteps * 2; i++) {
    const x = uStart + (i / (uSteps * 2)) * uRange;
    const y = f(x);
    if (isYAxis) {
      const dx = x - axisValue;
      bluePts.push(new THREE.Vector3(
        axisValue + dx * Math.cos(angleLimit),
        y,
        dx * Math.sin(angleLimit)
      ));
    } else {
      const dy = y - axisValue;
      bluePts.push(new THREE.Vector3(
        x,
        axisValue + dy * Math.cos(angleLimit),
        dy * Math.sin(angleLimit)
      ));
    }
  }
  blueLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(bluePts),
    createLineMaterial("blue")
  );
  scene.add(blueLineMesh);

  // === Blue Rotated Curve for f₂(x) ===
  const secondBluePts = [];
  for (let i = 0; i <= uSteps * 2; i++) {
    const x = uStart + (i / (uSteps * 2)) * uRange;
    const y = f2(x, isYAxis, axisValue);
    if (isYAxis) {
      const dx = x - axisValue;
      secondBluePts.push(new THREE.Vector3(
        axisValue + dx * Math.cos(angleLimit),
        y,
        dx * Math.sin(angleLimit)
      ));
    } else {
      const dy = y - axisValue;
      secondBluePts.push(new THREE.Vector3(
        x,
        axisValue + dy * Math.cos(angleLimit),
        dy * Math.sin(angleLimit)
      ));
    }
  }
  secondBlueLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(secondBluePts),
    createLineMaterial("cyan")
  );
  scene.add(secondBlueLineMesh);

  // === Rotating PINK RIBBON ===
  const ribbonVerts = [];
  const ribbonIndices = [];
  for (let i = 0; i <= uSteps; i++) {
    const u = uStart + (i / uSteps) * uRange;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    if (isYAxis) {
      const dx = u - axisValue;
      const xO = axisValue + dx * Math.cos(angleLimit);
      const yO = yOuter;
      const zO = dx * Math.sin(angleLimit);
      const xI = axisValue + dx * Math.cos(angleLimit);
      const yI = yInner;
      const zI = dx * Math.sin(angleLimit);
      ribbonVerts.push(xO, yO, zO, xI, yI, zI);
    } else {
      const dyO = yOuter - axisValue;
      const xO = u;
      const yO = axisValue + dyO * Math.cos(angleLimit);
      const zO = dyO * Math.sin(angleLimit);
      const dyI = yInner - axisValue;
      const xI = u;
      const yI = axisValue + dyI * Math.cos(angleLimit);
      const zI = dyI * Math.sin(angleLimit);
      ribbonVerts.push(xO, yO, zO, xI, yI, zI);
    }
  }
  for (let i = 0; i < uSteps; i++) {
    const a = 2 * i;
    const b = 2 * i + 1;
    const c = 2 * (i + 1);
    const d = 2 * (i + 1) + 1;
    ribbonIndices.push(a, c, b, b, c, d);
  }
  const ribbonGeometry = new THREE.BufferGeometry();
  ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
  ribbonGeometry.setIndex(ribbonIndices);
  ribbonGeometry.computeVertexNormals();

  pinkMesh = new THREE.Mesh(ribbonGeometry, createRibbonMaterial());
  pinkMesh.castShadow = true;
  pinkMesh.receiveShadow = true;
  scene.add(pinkMesh);

  // === STATIC PINK RIBBON (angle = 0) ===
  const ribbonVertsStatic = [];
  const ribbonIndicesStatic = [];
  for (let i = 0; i <= uSteps; i++) {
    const u = uStart + (i / uSteps) * uRange;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    // angleLimit = 0 → cos(0)=1, sin(0)=0
    if (isYAxis) {
      const dx = u - axisValue;
      const xO = axisValue + dx * 1;
      const yO = yOuter;
      const zO = 0;
      const xI = axisValue + dx * 1;
      const yI = yInner;
      const zI = 0;
      ribbonVertsStatic.push(xO, yO, zO, xI, yI, zI);
    } else {
      const dyO = yOuter - axisValue;
      const xO = u;
      const yO = axisValue + dyO * 1;
      const zO = 0;
      const dyI = yInner - axisValue;
      const xI = u;
      const yI = axisValue + dyI * 1;
      const zI = 0;
      ribbonVertsStatic.push(xO, yO, zO, xI, yI, zI);
    }
  }
  for (let i = 0; i < uSteps; i++) {
    const a = 2 * i;
    const b = 2 * i + 1;
    const c = 2 * (i + 1);
    const d = 2 * (i + 1) + 1;
    ribbonIndicesStatic.push(a, c, b, b, c, d);
  }
  const ribbonGeometryStatic = new THREE.BufferGeometry();
  ribbonGeometryStatic.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertsStatic, 3));
  ribbonGeometryStatic.setIndex(ribbonIndicesStatic);
  ribbonGeometryStatic.computeVertexNormals();

  staticPinkMesh = new THREE.Mesh(ribbonGeometryStatic, createRibbonMaterial());
  staticPinkMesh.castShadow = true;
  staticPinkMesh.receiveShadow = true;
  scene.add(staticPinkMesh);
}

// === 13. Events ===
slider.addEventListener("input", () => buildMesh(parseFloat(slider.value)));
[input, xMinInput, xMaxInput, axisInput, secondFuncInput].forEach(el =>
  el.addEventListener("change", () => buildMesh(parseFloat(slider.value)))
);

// === 14. Initial Render & Animation ===
buildMesh(0);

function animate() {
  requestAnimationFrame(animate);

  // Smooth camera interpolation:
  if (isCameraAnimating) {
    const now = performance.now();
    const elapsed = now - animStartTime;
    const t = Math.min(elapsed / animDuration, 1);

    camera.position.lerpVectors(cameraStartPos, cameraEndPos, t);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);

    if (t >= 1) {
      isCameraAnimating = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
