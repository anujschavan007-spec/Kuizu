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
let hasInteracted = false;

// DOM Elements
const canvas = document.getElementById('badge-three-canvas') as HTMLCanvasElement;
const viewport = document.getElementById('canvas-viewport') as HTMLDivElement;
const loadingState = document.getElementById('loading-state') as HTMLDivElement;
const loadingBadgeTitle = document.getElementById('loading-badge-title') as HTMLDivElement;
const headerTitle = document.getElementById('header-badge-title') as HTMLHeadingElement;
const drawerCondition = document.getElementById('drawer-condition') as HTMLDivElement;
const ambientGlow = document.getElementById('ambient-glow') as HTMLDivElement;
const dropdownToggle = document.getElementById('dropdown-toggle') as HTMLButtonElement;
const dropdownMenu = document.getElementById('dropdown-menu') as HTMLDivElement;
const btnAutoRotate = document.getElementById('ctrl-auto-rotate') as HTMLButtonElement;
const btnZoomIn = document.getElementById('ctrl-zoom-in') as HTMLButtonElement;
const btnZoomOut = document.getElementById('ctrl-zoom-out') as HTMLButtonElement;
const btnResetView = document.getElementById('ctrl-reset-view') as HTMLButtonElement;
const btnDownloadGlb = document.getElementById('ctrl-download-glb') as HTMLAnchorElement;
const btnCopyLink = document.getElementById('ctrl-copy-link') as HTMLButtonElement;
const gestureHint = document.getElementById('gesture-hint') as HTMLDivElement;
const toast = document.getElementById('badge-toast') as HTMLDivElement;
const toastMessage = document.getElementById('toast-message') as HTMLSpanElement;

/**
 * Initialize 3D Viewer Application
 */
function init(): void {
  // 1. Resolve initial badge from URL params
  const params = new URLSearchParams(window.location.search);
  const badgeIdParam = params.get('id') || params.get('badge') || params.get('trophy') || 'first-problem-solver';
  currentBadge = resolveBadgeDefinition(badgeIdParam) || ALL_BADGE_DEFINITIONS[0];

  // 2. Build Badge Switcher Dropdown
  buildBadgeDropdown();

  // 3. Setup Three.js Scene, Camera, Controls, Lights
  setupThreeScene();

  // 4. Update UI Texts & Themes
  applyBadgeMetadata(currentBadge);

  // 5. Load 3D GLB Model
  loadBadgeModel(currentBadge);

  // 6. Bind Event Listeners
  bindEvents();

  // 7. Start Render Loop
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

  // Camera
  camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  // Renderer (High Fidelity, PBR Shaders, Tone Mapping)
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

  // Orbit Controls (360° Desktop & Mobile Touch Support)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 7.5;

  // Studio Lighting
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
 * Build the Dropdown Menu containing all 6 official badges
 */
function buildBadgeDropdown(): void {
  if (!dropdownMenu) return;
  dropdownMenu.innerHTML = '';

  ALL_BADGE_DEFINITIONS.forEach((badge) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `badge-option-item ${badge.id === currentBadge.id ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="badge-color-dot" style="background-color: ${badge.accentColor}; box-shadow: 0 0 8px ${badge.accentColor}88;"></span>
      <span>${escapeHtml(badge.title)}</span>
    `;

    btn.addEventListener('click', () => {
      if (badge.id === currentBadge.id) {
        dropdownMenu.classList.remove('open');
        return;
      }
      dropdownMenu.classList.remove('open');
      switchBadge(badge);
    });

    dropdownMenu.appendChild(btn);
  });
}

/**
 * Switch Active Badge & Reload Model
 */
function switchBadge(badge: BadgeDefinition): void {
  currentBadge = badge;
  applyBadgeMetadata(badge);
  buildBadgeDropdown();

  // Update URL history without page reload
  const newUrl = `${window.location.pathname}?id=${encodeURIComponent(badge.id)}`;
  window.history.pushState({ badgeId: badge.id }, '', newUrl);

  // Load new model
  loadBadgeModel(badge);
}

/**
 * Update UI text, headers, links, and ambient lighting based on badge metadata
 */
function applyBadgeMetadata(badge: BadgeDefinition): void {
  document.title = `${badge.title} — 3D Badge 360° View — KUIZU`;

  if (headerTitle) {
    headerTitle.textContent = badge.title;
  }
  if (drawerCondition) {
    drawerCondition.textContent = badge.condition;
  }
  if (loadingBadgeTitle) {
    loadingBadgeTitle.textContent = `Loading ${badge.title}...`;
  }
  if (ambientGlow) {
    ambientGlow.style.background = `radial-gradient(circle, ${badge.accentColor}26 0%, transparent 70%)`;
  }
  if (btnDownloadGlb) {
    btnDownloadGlb.href = badge.glbModel;
    btnDownloadGlb.download = `${badge.title.replace(/[^a-zA-Z0-9]/g, '_')}_3D_Badge.glb`;
  }
  if (accentPointLight) {
    accentPointLight.color.set(badge.accentColor);
  }
}

/**
 * Load .GLB Model with auto-centering and responsive scaling
 */
function loadBadgeModel(badge: BadgeDefinition): void {
  // Show Loading Spinner
  if (loadingState) {
    loadingState.style.opacity = '1';
    loadingState.style.visibility = 'visible';
  }

  // Remove existing model from group
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

      // Compute bounding box and center model perfectly
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      // Adaptive scaling based on device width
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const isMobile = window.innerWidth < 640;
        const targetScale = isMobile ? 2.3 / maxDim : 2.5 / maxDim;
        badgeGroup.scale.set(targetScale, targetScale, targetScale);
      }

      // Reset orientation
      badgeGroup.rotation.set(0, 0, 0);

      // Add to group
      badgeGroup.add(model);
      currentGltfScene = model;

      // Hide loading spinner with smooth fade
      if (loadingState) {
        loadingState.style.opacity = '0';
        setTimeout(() => {
          loadingState.style.visibility = 'hidden';
        }, 350);
      }
    },
    undefined,
    (err) => {
      console.error(`Failed to load 3D GLB model (${badge.glbModel}):`, err);
      if (loadingState) {
        loadingState.innerHTML = `
          <div style="font-size: 14px; color: #f87171; font-weight: 700;">Could not load 3D model</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Please check internet connection or retry</div>
        `;
      }
    }
  );
}

/**
 * Bind interactive controls and UI buttons
 */
function bindEvents(): void {
  // Dismiss gesture hint on first touch/click
  const dismissHint = () => {
    if (!hasInteracted && gestureHint) {
      hasInteracted = true;
      gestureHint.classList.add('hidden');
    }
  };
  viewport.addEventListener('pointerdown', dismissHint, { passive: true });
  window.addEventListener('touchstart', dismissHint, { passive: true });

  // Toggle Dropdown Menu
  dropdownToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target as Node) && e.target !== dropdownToggle) {
      dropdownMenu.classList.remove('open');
    }
  });

  // Auto-Rotate Button Toggle
  btnAutoRotate?.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAutoRotate.classList.toggle('active', controls.autoRotate);
    showToast(controls.autoRotate ? '360° Auto-Rotate: ON' : '360° Auto-Rotate: OFF', '🔄');
  });

  // Zoom In Button
  btnZoomIn?.addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 0.4);
    controls.update();
  });

  // Zoom Out Button
  btnZoomOut?.addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -0.4);
    controls.update();
  });

  // Reset View Button
  btnResetView?.addEventListener('click', () => {
    camera.position.set(0, 0, 4.3);
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    btnAutoRotate.classList.add('active');
    controls.update();
    showToast('Camera reset to default view', '🎯');
  });

  // Copy Direct Link Button
  btnCopyLink?.addEventListener('click', async () => {
    const shareUrl = `${window.location.origin}/badge?id=${encodeURIComponent(currentBadge.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard!', '📋');
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Link copied to clipboard!', '📋');
    }
  });

  // Keyboard Shortcuts (Space = Auto-Rotate, R = Reset)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      controls.autoRotate = !controls.autoRotate;
      btnAutoRotate.classList.toggle('active', controls.autoRotate);
    } else if (e.code === 'KeyR') {
      btnResetView?.click();
    }
  });

  // Handle Browser Back / Forward popstate
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('badge') || 'first-problem-solver';
    const badge = resolveBadgeDefinition(id);
    if (badge && badge.id !== currentBadge.id) {
      switchBadge(badge);
    }
  });

  // Responsive Window Resize
  window.addEventListener('resize', onWindowResize);
}

/**
 * Handle Window Resize Dynamically
 */
function onWindowResize(): void {
  const width = viewport.clientWidth || window.innerWidth;
  const height = viewport.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Adaptive scale check
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
 * Display Floating Toast
 */
let toastTimeout: any = null;
function showToast(message: string, icon: string = '✨'): void {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  const iconEl = document.getElementById('toast-icon');
  if (iconEl) iconEl.textContent = icon;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

/**
 * Three.js Main Render Loop
 */
function animate(): void {
  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start when DOM is loaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
