import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALL_BADGE_DEFINITIONS, resolveBadgeDefinition, type BadgeDefinition } from './services/badgeManager';

// Active State
let currentBadge: BadgeDefinition = ALL_BADGE_DEFINITIONS[0];
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let badgeGroup: THREE.Group;
let accentPointLight: THREE.PointLight;
let currentGltfScene: THREE.Object3D | null = null;
let animationFrameId: number | null = null;

// DOM Elements
const canvas = document.getElementById('badge-three-canvas') as HTMLCanvasElement;
const viewport = document.getElementById('canvas-viewport') as HTMLDivElement;
const loadingState = document.getElementById('loading-state') as HTMLDivElement;
const ambientGlow = document.getElementById('ambient-glow') as HTMLDivElement;

/**
 * Initialize Pure 3D Badge Viewer
 */
function init(): void {
  // 1. Resolve badge from URL query params
  const params = new URLSearchParams(window.location.search);
  const badgeIdParam = params.get('id') || params.get('badge') || params.get('trophy') || 'first-problem-solver';
  currentBadge = resolveBadgeDefinition(badgeIdParam) || ALL_BADGE_DEFINITIONS[0];

  // 2. Set Document Title & Ambient Glow
  document.title = `${currentBadge.title} — 3D 360° View — KUIZU`;
  if (ambientGlow) {
    ambientGlow.style.background = `radial-gradient(circle, ${currentBadge.accentColor}26 0%, transparent 70%)`;
  }

  // 3. Setup Three.js Scene, Camera, Controls, Lights
  setupThreeScene();

  // 4. Load 3D GLB Model
  loadBadgeModel(currentBadge);

  // 5. Bind Touch, Mouse & Resize Events
  bindEvents();

  // 6. Start Render Loop
  animate();
}

/**
 * Set up Three.js WebGL Scene with Studio Lighting & OrbitControls
 */
function setupThreeScene(): void {
  const width = viewport.clientWidth || window.innerWidth;
  const height = viewport.clientHeight || window.innerHeight;

  // Scene
  scene = new THREE.Scene();

  // Perspective Camera
  camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  // High Performance WebGL Renderer with ACESFilmic Tone Mapping
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  // 360° OrbitControls (Mobile Touch + Desktop Drag + Smooth Inertia)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.2;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 7.5;

  // Balanced PBR Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc7d2fe, 1.8);
  fillLight.position.set(-4, -2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xf8fafc, 2.2);
  rimLight.position.set(0, -4, 4);
  scene.add(rimLight);

  // Dynamic Badge Color Accent Point Light
  accentPointLight = new THREE.PointLight(new THREE.Color(currentBadge.accentColor), 3.0, 10);
  accentPointLight.position.set(0, 2, 2.5);
  scene.add(accentPointLight);

  // Model Container Group
  badgeGroup = new THREE.Group();
  scene.add(badgeGroup);
}

/**
 * Load .GLB Model with auto-centering and responsive scaling
 */
function loadBadgeModel(badge: BadgeDefinition): void {
  if (loadingState) {
    loadingState.style.opacity = '1';
    loadingState.style.visibility = 'visible';
  }

  // Clear existing model if any
  if (currentGltfScene) {
    badgeGroup.remove(currentGltfScene);
    currentGltfScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
    currentGltfScene = null;
  }

  const loader = new GLTFLoader();
  loader.load(
    badge.glbModel,
    (gltf) => {
      const model = gltf.scene;

      // Center model around its bounding box center
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      // Responsive scale for mobile vs desktop
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const isMobile = window.innerWidth < 640;
        const targetScale = isMobile ? 2.3 / maxDim : 2.5 / maxDim;
        badgeGroup.scale.set(targetScale, targetScale, targetScale);
      }

      badgeGroup.rotation.set(0, 0, 0);
      badgeGroup.add(model);
      currentGltfScene = model;

      // Hide loading spinner smoothly
      if (loadingState) {
        loadingState.style.opacity = '0';
        setTimeout(() => {
          loadingState.style.visibility = 'hidden';
        }, 300);
      }
    },
    undefined,
    (err) => {
      console.error(`Failed to load 3D GLB model (${badge.glbModel}):`, err);
    }
  );
}

/**
 * Bind Interactive Listeners
 */
function bindEvents(): void {
  // Double-click or double-tap to reset camera view
  let lastTap = 0;
  viewport.addEventListener('touchend', () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      resetCamera();
    }
    lastTap = currentTime;
  });

  viewport.addEventListener('dblclick', resetCamera);

  // Spacebar to pause/resume auto-rotation, R to reset
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      controls.autoRotate = !controls.autoRotate;
    } else if (e.code === 'KeyR') {
      resetCamera();
    }
  });

  // Responsive Window Resize
  window.addEventListener('resize', onWindowResize);
}

function resetCamera(): void {
  camera.position.set(0, 0, 4.3);
  controls.target.set(0, 0, 0);
  controls.autoRotate = true;
  controls.update();
}

/**
 * Handle Window Resize Dynamically for Mobile & Desktop
 */
function onWindowResize(): void {
  const width = viewport.clientWidth || window.innerWidth;
  const height = viewport.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (currentGltfScene) {
    const isMobile = width < 640;
    const box = new THREE.Box3().setFromObject(currentGltfScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetScale = isMobile ? 2.3 / maxDim : 2.5 / maxDim;
      badgeGroup.scale.set(targetScale, targetScale, targetScale);
    }
  }
}

/**
 * Three.js Main Render Loop
 */
function animate(): void {
  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Start when DOM is loaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
