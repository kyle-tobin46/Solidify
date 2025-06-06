// === 1. Imports ===
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// === GLOBALS ===
let mesh,
    redLineMesh,
    secondRedLineMesh,
    blueLineMesh,
    secondBlueLineMesh,
    axisLine,
    pinkMesh,        // rotating ribbon at current angle
    staticPinkMesh,  // ribbon at angle = 0
    capMeshStart,    // blue end-cap at x = uStart
    capMeshEnd;      // blue end-cap at x = uEnd
let domainLines = [];

// Camera-animation state
let isCameraAnimating = false;
const cameraStartPos = new THREE.Vector3();
const cameraEndPos = new THREE.Vector3();
let animStartTime = 0;
const animDuration = 500; // ms

// === SCENE, CAMERA, RENDERER SETUP ===
const scene = new THREE.Scene();

const d = 5;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, -1000, 1000
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x263238);
renderer.shadowMap.enabled = true;
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

// === LIGHTS ===
{
  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(5, 10, 7.5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left   = -2;
  dirLight.shadow.camera.right  = +2;
  dirLight.shadow.camera.top    = +2;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.mapSize.width  = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.radius = 4;
  scene.add(dirLight);
}

// === GRID HELPER ===
const gridHelperXY = new THREE.GridHelper(100, 100, 0xeb4034, 0xffffff);
gridHelperXY.material.opacity = 0.2;
gridHelperXY.material.transparent = true;
gridHelperXY.rotation.x = Math.PI / 2;
scene.add(gridHelperXY);

// === ORBIT CONTROLS ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// === MATERIAL HELPERS ===
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

function createBlueMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x0288D1,
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

// === VALUE PARSING ===
function parseValue(raw) {
  let s = raw.trim().replace(/\s+/g, '');
  if (s === '') return NaN;
  s = s.replace(/\^/g, '**');
  s = s.replace(
    /\b(sin|cos|tan|asin|acos|atan|sqrt|log|exp|abs)\b/gi,
    match => 'Math.' + match.toLowerCase()
  );
  s = s.replace(/\bpi\b/gi, 'Math.PI');
  s = s.replace(/\be\b/gi, 'Math.E');
  try {
    return eval(s);
  } catch {
    return NaN;
  }
}

// === EQUATION PARSING & EVALUATORS ===
function parseEquation(equationRaw) {
  let s = equationRaw.trim().replace(/\s+/g, '');
  if (!s.includes('=')) {
    s = 'y=' + s;
  }
  const [lhs, rhs] = s.split('=');
  let expr = '';
  if (lhs.toLowerCase() === 'y') {
    expr = rhs;
  } else if (lhs.toLowerCase() === 'x') {
    const m = rhs.match(/^([0-9]*\.?[0-9]+)\*?y$/i);
    if (m) {
      const coef = parseFloat(m[1]);
      expr = `(x/${coef})`;
    } else if (rhs.toLowerCase() === 'y') {
      expr = 'x';
    } else {
      expr = rhs;
    }
  } else {
    expr = s;
  }
  expr = expr.replace(/\^/g, '**');
  expr = expr.replace(
    /\b(sin|cos|tan|asin|acos|atan|sqrt|log|exp|abs)\b/gi,
    match => 'Math.' + match.toLowerCase()
  );
  expr = expr.replace(/\bpi\b/gi, 'Math.PI');
  expr = expr.replace(/\be\b/gi, 'Math.E');
  return expr;
}

function f(x) {
  try {
    const parsed = parseEquation(document.querySelector('#func1-input').value);
    return eval(parsed);
  } catch {
    return NaN;
  }
}

function f2(x, isYAxis, axisValue) {
  const raw = document.querySelector('#func2-input').value.trim();
  if (!raw) {
    return axisValue;
  }
  try {
    const parsed2 = parseEquation(raw);
    return eval(parsed2);
  } catch {
    return axisValue;
  }
}

// === CAMERA ANIMATION HELPER ===
function animateCameraTo(x, y, z) {
  cameraStartPos.copy(camera.position);
  cameraEndPos.set(x, y, z);
  animStartTime = performance.now();
  isCameraAnimating = true;
}

// === BUILD MESH ===
function buildMesh(angleDeg) {
  // 1) Parse domain endpoints
  let uStart = parseValue(document.querySelector('#x-min-input').value);
  let uEnd   = parseValue(document.querySelector('#x-max-input').value);
  if (isNaN(uStart) || isNaN(uEnd) || uStart === uEnd) return;
  if (uStart > uEnd) {
    [uStart, uEnd] = [uEnd, uStart];
  }

  // 2) Determine axis
  const axisRaw = document.querySelector('#axis-input').value.trim().replace(/\s+/g, '');
  let isYAxis = false;
  let axisValue = 0;
  if (axisRaw.toLowerCase().startsWith("x=")) {
    isYAxis = true;
    axisValue = parseFloat(axisRaw.split("=")[1]);
  } else if (axisRaw.toLowerCase().startsWith("y=")) {
    axisValue = parseFloat(axisRaw.split("=")[1]);
  }

  // 3) Clamp endpoints so that both f and f2 are finite
  const sampleCount = 100;
  const delta = (uEnd - uStart) / sampleCount;
  function bothFinite(x) {
    return isFinite(f(x)) && isFinite(f2(x, isYAxis, axisValue));
  }

  let clampedStart = uStart;
  if (!bothFinite(clampedStart)) {
    for (let i = 0; i <= sampleCount; i++) {
      const testX = uStart + i * delta;
      if (bothFinite(testX)) {
        clampedStart = testX;
        break;
      }
    }
  }

  let clampedEnd = uEnd;
  if (!bothFinite(clampedEnd)) {
    for (let i = 0; i <= sampleCount; i++) {
      const testX = uEnd - i * delta;
      if (bothFinite(testX)) {
        clampedEnd = testX;
        break;
      }
    }
  }

  if (clampedStart >= clampedEnd) return; // no valid overlap

  uStart = clampedStart;
  uEnd = clampedEnd;

  // 4) Now generate everything as before, but using [uStart, uEnd]
  const uSteps = 200;
  const vSteps = 120;
  const uStepsRed = 8000;
  const uRange = uEnd - uStart;
  const angleLimit = (angleDeg / 360) * 2 * Math.PI;

  // Dispose previous
  [
    mesh, redLineMesh, secondRedLineMesh, blueLineMesh, secondBlueLineMesh,
    axisLine, pinkMesh, staticPinkMesh, capMeshStart, capMeshEnd
  ].forEach(obj => {
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
  mesh = redLineMesh = secondRedLineMesh = blueLineMesh = secondBlueLineMesh =
  axisLine = pinkMesh = staticPinkMesh = capMeshStart = capMeshEnd = null;

  // ––– Red Function Line (f(x)) –––
  const redPts = [];
  for (let i = 0; i <= uStepsRed; i++) {
    const x = -50 + (i / uStepsRed) * 100;
    const yVal = f(x);
    redPts.push(new THREE.Vector3(x, yVal, 0));
  }
  redLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(redPts),
    createLineMaterial("#fc2803")
  );
  scene.add(redLineMesh);

  // ––– Red Line for f₂(x) –––
  const secondRedPts = [];
  for (let i = 0; i <= uStepsRed; i++) {
    const x = -50 + (i / uStepsRed) * 100;
    const yVal = f2(x, isYAxis, axisValue);
    secondRedPts.push(new THREE.Vector3(x, yVal, 0));
  }
  secondRedLineMesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(secondRedPts),
    createLineMaterial("#fc2803")
  );
  scene.add(secondRedLineMesh);

  // ––– Axis of Rotation Line (dashed) –––
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

  // ––– Domain-Boundary Dashed Lines –––
  const domainMat = new THREE.LineDashedMaterial({
    color: 'pink',
    dashSize: 0.2,
    gapSize: 0.1,
    linewidth: 1
  });
  [uStart, uEnd].forEach(u => {
    const yOuter = f(u);
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

      // Vertical dashed from (u, yInner) to (u, yOuter)
      const startV = new THREE.Vector3(u, yInner, 0);
      const endV   = new THREE.Vector3(u, yOuter,  0);
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

      // Vertical dashed from (u, yInner) to (u, yOuter)
      const startU = new THREE.Vector3(u, yInner, 0);
      const endU   = new THREE.Vector3(u, yOuter,  0);
      const geoU = new THREE.BufferGeometry().setFromPoints([startU, endU]);
      const lineU = new THREE.Line(geoU, domainMat);
      lineU.computeLineDistances();
      scene.add(lineU);
      domainLines.push(lineU);
    }
  });

  // ––– Generate Full Solid of Revolution –––
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
      const a  = i * stride + j * 2;
      const b  = a + stride;
      const c  = b + 2;
      const d  = a + 2;
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

  // ––– Blue Rotated Curve for f(x) –––
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

  // ––– Blue Rotated Curve for f₂(x) –––
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

  // ––– Rotating PINK RIBBON (angle > 0) –––
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

  // ––– STATIC PINK RIBBON (angle = 0) –––
  const ribbonVertsStatic = [];
  const ribbonIndicesStatic = [];
  for (let i = 0; i <= uSteps; i++) {
    const u = uStart + (i / uSteps) * uRange;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

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

  // ––– END-CAP at x = uStart –––
  {
    const capVerts = [];
    const capIndices = [];
    const u = uStart;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    for (let j = 0; j <= vSteps; j++) {
      const v = (j / vSteps) * angleLimit;
      if (isYAxis) {
        const dx = u - axisValue;
        const xO = axisValue + dx * Math.cos(v);
        const yO = yOuter;
        const zO = dx * Math.sin(v);
        const xI = axisValue + dx * Math.cos(v);
        const yI = yInner;
        const zI = dx * Math.sin(v);
        capVerts.push(xO, yO, zO, xI, yI, zI);
      } else {
        const dyOuter = yOuter - axisValue;
        const xO = u;
        const yO = axisValue + dyOuter * Math.cos(v);
        const zO = dyOuter * Math.sin(v);
        const dyInner = yInner - axisValue;
        const xI = u;
        const yI = axisValue + dyInner * Math.cos(v);
        const zI = dyInner * Math.sin(v);
        capVerts.push(xO, yO, zO, xI, yI, zI);
      }
    }
    for (let j = 0; j < vSteps; j++) {
      const a = 2 * j;
      const b = 2 * j + 1;
      const c = 2 * (j + 1);
      const d = 2 * (j + 1) + 1;
      capIndices.push(a, c, b, b, c, d);
    }
    const capGeo = new THREE.BufferGeometry();
    capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capVerts, 3));
    capGeo.setIndex(capIndices);
    capGeo.computeVertexNormals();

    capMeshStart = new THREE.Mesh(capGeo, createBlueMaterial());
    capMeshStart.castShadow = true;
    capMeshStart.receiveShadow = true;
    scene.add(capMeshStart);
  }

  // ––– END-CAP at x = uEnd –––
  {
    const capVerts = [];
    const capIndices = [];
    const u = uEnd;
    const yOuter = f(u);
    const yInner = f2(u, isYAxis, axisValue);

    for (let j = 0; j <= vSteps; j++) {
      const v = (j / vSteps) * angleLimit;
      if (isYAxis) {
        const dx = u - axisValue;
        const xO = axisValue + dx * Math.cos(v);
        const yO = yOuter;
        const zO = dx * Math.sin(v);
        const xI = axisValue + dx * Math.cos(v);
        const yI = yInner;
        const zI = dx * Math.sin(v);
        capVerts.push(xO, yO, zO, xI, yI, zI);
      } else {
        const dyOuter = yOuter - axisValue;
        const xO = u;
        const yO = axisValue + dyOuter * Math.cos(v);
        const zO = dyOuter * Math.sin(v);
        const dyInner = yInner - axisValue;
        const xI = u;
        const yI = axisValue + dyInner * Math.cos(v);
        const zI = dyInner * Math.sin(v);
        capVerts.push(xO, yO, zO, xI, yI, zI);
      }
    }
    for (let j = 0; j < vSteps; j++) {
      const a = 2 * j;
      const b = 2 * j + 1;
      const c = 2 * (j + 1);
      const d = 2 * (j + 1) + 1;
      capIndices.push(a, c, b, b, c, d);
    }
    const capGeo = new THREE.BufferGeometry();
    capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capVerts, 3));
    capGeo.setIndex(capIndices);
    capGeo.computeVertexNormals();

    capMeshEnd = new THREE.Mesh(capGeo, createBlueMaterial());
    capMeshEnd.castShadow = true;
    capMeshEnd.receiveShadow = true;
    scene.add(capMeshEnd);
  }
}

// === EVENTS & HOOKUPS ===
const angleSlider = document.querySelector('#angle-slider');
angleSlider.addEventListener('input', () => buildMesh(parseFloat(angleSlider.value)));

[
  '#func1-input',
  '#func2-input',
  '#x-min-input',
  '#x-max-input',
  '#axis-input'
].forEach(selector => {
  document.querySelector(selector).addEventListener('change', () => {
    buildMesh(parseFloat(angleSlider.value));
  });
});

document.querySelector('#front-view-btn').addEventListener('click', () => {
  animateCameraTo(0, 0, 10);
});

document.querySelector('#side-view-btn').addEventListener('click', () => {
  animateCameraTo(10, 0, 0);
});

document.querySelector('#top-view-btn').addEventListener('click', () => {
  animateCameraTo(0, 10, 0);
});

// === INITIAL BUILD & RENDER LOOP ===
buildMesh(0);

function animate() {
  requestAnimationFrame(animate);

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