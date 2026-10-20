import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import confetti from 'canvas-confetti';

// State
let previewScene: THREE.Scene | null = null;
let previewCamera: THREE.PerspectiveCamera | null = null;
let previewRenderer: THREE.WebGLRenderer | null = null;
let previewControls: OrbitControls | null = null;
let previewGroup: THREE.Group | null = null;
let activeAnimId: number | null = null;
let currentLoadedGlbUrl = '';

// DOM Elements
const iframe = document.getElementById('avaturn-iframe') as HTMLIFrameElement;
const loadingOverlay = document.getElementById('studio-loading') as HTMLDivElement;
const previewOverlay = document.getElementById('avatar-preview-overlay') as HTMLDivElement;
const previewCanvas = document.getElementById('preview-three-canvas') as HTMLCanvasElement;
const btnClosePreview = document.getElementById('btn-close-preview') as HTMLButtonElement;
const btnDownloadGlb = document.getElementById('btn-download-avatar-glb') as HTMLAnchorElement;
const btnToggleSaved = document.getElementById('btn-toggle-saved-preview') as HTMLButtonElement;
const savedStatusPill = document.getElementById('saved-status-pill') as HTMLDivElement;
const toast = document.getElementById('studio-toast') as HTMLDivElement;
const toastMsg = document.getElementById('studio-toast-msg') as HTMLSpanElement;

/**
 * Initialize 3D Avatar Studio
 */
function initStudio(): void {
  // 1. Hide loading overlay once iframe starts rendering
  if (iframe) {
    iframe.addEventListener('load', () => {
      hideLoadingOverlay();
    });
  }
  // Safety timeout in case cross-origin iframe delays load event
  setTimeout(hideLoadingOverlay, 3500);

  // 2. Check for previously saved avatar in localStorage
  const savedGlb = localStorage.getItem('kuizu_user_avatar_glb');
  if (savedGlb && savedStatusPill) {
    savedStatusPill.style.display = 'inline-flex';
  }

  // 3. Listen for Avaturn postMessage communication (Export event with .glb URL)
  window.addEventListener('message', (event) => {
    try {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (_) {}
      }

      // Check for export event or direct url payload
      const isExportEvent =
        data?.eventName === 'export' ||
        data?.event === 'export' ||
        data?.type === 'export' ||
        data?.action === 'export';

      if (isExportEvent || (data && typeof data === 'object' && (data.url || data.data?.url))) {
        const glbUrl = data.url || data.data?.url;
        const avatarId = data.avatarId || data.data?.avatarId || `avatar_${Date.now()}`;
        if (glbUrl) {
          handleAvatarExport(glbUrl, avatarId);
        }
      }
    } catch (err) {
      console.warn('Could not parse message from Avaturn frame:', err);
    }
  });

  // 4. Bind UI Click Listeners
  bindUIEvents();
}

/**
 * Hide loading overlay with smooth transition
 */
function hideLoadingOverlay(): void {
  if (loadingOverlay) {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.visibility = 'hidden';
    }, 400);
  }
}

/**
 * Handle successful avatar creation & export
 */
function handleAvatarExport(glbUrl: string, avatarId: string): void {
  console.log('✅ [Avaturn] Received 3D Avatar GLB:', glbUrl);

  // 1. Save locally to Kuizu Profile
  localStorage.setItem('kuizu_user_avatar_glb', glbUrl);
  localStorage.setItem('kuizu_user_avatar_id', avatarId);
  localStorage.setItem('kuizu_user_avatar_glb_date', new Date().toISOString());

  if (savedStatusPill) {
    savedStatusPill.style.display = 'inline-flex';
  }

  // 2. Sync to Backend Database if logged in
  const userEmail = localStorage.getItem('kuizu_user_email');
  if (userEmail) {
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        avatarGlb: glbUrl,
        avatarId: avatarId
      })
    }).catch((err) => console.warn('Could not sync avatar to backend:', err));
  }

  // 3. Trigger Confetti celebration
  try {
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#38bdf8', '#4f46e5', '#10b981', '#f59e0b', '#ec4899']
    });
  } catch (_) {}

  // 4. Update download link
  if (btnDownloadGlb) {
    btnDownloadGlb.href = glbUrl;
    btnDownloadGlb.download = `kuizu_avatar_${avatarId}.glb`;
  }

  // 5. Open Interactive 3D Preview Modal
  openPreviewModal(glbUrl);
  showToast('3D Avatar saved to your Kuizu profile! 🚀');
}

/**
 * Open 3D Preview Modal and Render GLB with Three.js
 */
function openPreviewModal(glbUrl: string): void {
  if (!previewOverlay) return;
  previewOverlay.classList.add('show');

  if (btnDownloadGlb) {
    btnDownloadGlb.href = glbUrl;
  }

  // If already loaded this exact model, just start animation
  if (currentLoadedGlbUrl === glbUrl && previewRenderer) {
    startAnimationLoop();
    return;
  }

  currentLoadedGlbUrl = glbUrl;
  initThreePreview(glbUrl);
}

/**
 * Close Preview Modal
 */
function closePreviewModal(): void {
  if (previewOverlay) {
    previewOverlay.classList.remove('show');
  }
  if (activeAnimId !== null) {
    cancelAnimationFrame(activeAnimId);
    activeAnimId = null;
  }
}

/**
 * Initialize Three.js WebGL Stage for Full-Body Avatar Rendering
 */
function initThreePreview(glbUrl: string): void {
  const container = previewCanvas.parentElement;
  if (!previewCanvas || !container) return;

  const width = container.clientWidth || 400;
  const height = container.clientHeight || 280;

  // Cleanup old renderer if exists
  if (previewRenderer) {
    previewRenderer.dispose();
  }

  // Scene
  previewScene = new THREE.Scene();

  // Camera
  previewCamera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  previewCamera.position.set(0, 1.2, 3.2);

  // WebGL Renderer
  previewRenderer = new THREE.WebGLRenderer({
    canvas: previewCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  previewRenderer.setSize(width, height);
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  previewRenderer.toneMappingExposure = 1.3;

  // OrbitControls
  previewControls = new OrbitControls(previewCamera, previewCanvas);
  previewControls.enableDamping = true;
  previewControls.dampingFactor = 0.05;
  previewControls.autoRotate = true;
  previewControls.autoRotateSpeed = 2.0;
  previewControls.target.set(0, 0.9, 0); // Focus near avatar chest/head
  previewControls.minDistance = 1.0;
  previewControls.maxDistance = 5.0;

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
  previewScene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
  keyLight.position.set(3, 5, 4);
  previewScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc7d2fe, 1.6);
  fillLight.position.set(-3, 2, -3);
  previewScene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
  rimLight.position.set(0, -2, 3);
  previewScene.add(rimLight);

  // Avatar Model Group
  previewGroup = new THREE.Group();
  previewScene.add(previewGroup);

  // Load GLB via GLTFLoader
  const loader = new GLTFLoader();
  loader.load(
    glbUrl,
    (gltf) => {
      const model = gltf.scene;

      // Center model bounding box around ground plane
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= box.min.y; // Stand on floor
      model.position.z -= center.z;

      // Fit height comfortably in frame
      if (size.y > 0) {
        const desiredScale = 1.7 / size.y;
        previewGroup?.scale.set(desiredScale, desiredScale, desiredScale);
      }

      previewGroup?.add(model);
      previewControls?.target.set(0, 0.9, 0);
      previewControls?.update();
    },
    undefined,
    (err) => {
      console.warn('Could not load 3D preview GLB:', err);
    }
  );

  startAnimationLoop();
}

function startAnimationLoop(): void {
  if (activeAnimId !== null) {
    cancelAnimationFrame(activeAnimId);
  }

  const loop = () => {
    activeAnimId = requestAnimationFrame(loop);
    if (previewControls && previewRenderer && previewScene && previewCamera) {
      previewControls.update();
      previewRenderer.render(previewScene, previewCamera);
    }
  };
  loop();
}

/**
 * Bind UI Buttons
 */
function bindUIEvents(): void {
  // Close Modal
  btnClosePreview?.addEventListener('click', closePreviewModal);

  // View Saved Avatar Button
  btnToggleSaved?.addEventListener('click', () => {
    const savedGlb = localStorage.getItem('kuizu_user_avatar_glb');
    if (savedGlb) {
      openPreviewModal(savedGlb);
    } else {
      showToast('Create your avatar in the studio first! 🎨');
    }
  });

  // Responsive Resize
  window.addEventListener('resize', () => {
    if (previewCanvas && previewCanvas.parentElement && previewCamera && previewRenderer) {
      const container = previewCanvas.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;
      previewCamera.aspect = width / height;
      previewCamera.updateProjectionMatrix();
      previewRenderer.setSize(width, height);
    }
  });
}

/**
 * Display Floating Toast
 */
let toastTimer: any = null;
function showToast(message: string, icon: string = '✨'): void {
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  const iconEl = document.getElementById('studio-toast-icon');
  if (iconEl) iconEl.textContent = icon;

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Start studio on load
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initStudio);
} else {
  initStudio();
}
