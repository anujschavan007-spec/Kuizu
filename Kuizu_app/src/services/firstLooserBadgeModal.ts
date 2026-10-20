import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import confetti from 'canvas-confetti';

let activeAnimationId: number | null = null;
let activeRenderer: THREE.WebGLRenderer | null = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let manualRotationVelocity = { x: 0, y: 0 };

export function showFirstLooserBadgeModal(onCloseCallback?: () => void): void {
  // Prevent duplicate modals
  if (document.getElementById('first-looser-badge-3d-modal-overlay')) {
    return;
  }

  // Create Modal Overlay
  const overlay = document.createElement('div');
  overlay.id = 'first-looser-badge-3d-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    padding: 16px;
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  overlay.innerHTML = `
    <div id="first-looser-badge-3d-modal-card" style="
      max-width: 440px;
      width: 100%;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8);
      overflow: hidden;
      position: relative;
      text-align: center;
      padding: 32px 28px 28px 28px;
      transform: scale(0.92) translateY(12px);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <!-- Close Button (Top-Right) -->
      <button type="button" id="first-looser-modal-close-btn" aria-label="Close" style="
        position: absolute;
        top: 20px;
        right: 20px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 10;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Achievement Pill -->
      <div style="display: inline-flex; align-items: center; gap: 7px; padding: 6px 16px; border-radius: 9999px; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M14.5 9.5 21 3"></path>
          <path d="m3 21 6.5-6.5"></path>
          <path d="M16 3h5v5"></path>
          <path d="M3 16v5h5"></path>
        </svg>
        <span>Battle Honor Unlocked</span>
      </div>

      <!-- Title & Subtitle -->
      <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.02em;">
        First Looser
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0 auto 20px auto; max-width: 360px; line-height: 1.5;">
        Every legend faces defeat before triumph. You fought with true warrior spirit in the Admin Battle Arena and claimed your Devil First Looser trophy!
      </p>

      <!-- 3D Canvas Box -->
      <div id="first-looser-canvas-container" style="
        width: 100%;
        height: 290px;
        background: radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, #f8fafc 80%);
        border-radius: 22px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(239, 68, 68, 0.15);
      ">
        <canvas id="first-looser-3d-canvas" style="width: 100%; height: 100%; outline: none; cursor: grab;"></canvas>

        <!-- Loading Indicator -->
        <div id="first-looser-3d-loading" style="
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(244, 246, 250, 0.95);
          gap: 10px;
          transition: opacity 0.3s;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 28px; height: 28px; color: #ef4444; animation: spin 0.8s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">Loading 3D Trophy...</span>
        </div>

        <!-- Badge Category Caption -->
        <div style="
          position: absolute;
          bottom: 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ef4444;
          pointer-events: none;
        ">
          Red Swords Trophy
        </div>
      </div>

      <!-- Action Button (Claim Badge -> Acts as Close Button) -->
      <button type="button" id="first-looser-modal-claim-btn" style="
        width: 100%;
        margin-top: 24px;
        padding: 15px 24px;
        border-radius: 16px;
        border: none;
        background: #ef4444;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 8px 20px -4px rgba(239, 68, 68, 0.4);
        transition: all 0.2s;
      ">
        <span>Claim Badge</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger Entrance Transitions
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    const card = document.getElementById('first-looser-badge-3d-modal-card');
    if (card) {
      card.style.transform = 'scale(1) translateY(0)';
    }
  });

  // Confetti celebration (Red & Gold)
  confetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#ef4444', '#f59e0b', '#dc2626', '#ffffff']
  });

  // Cleanup helper
  const closeModal = () => {
    if (activeAnimationId !== null) {
      cancelAnimationFrame(activeAnimationId);
      activeAnimationId = null;
    }

    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleResize);

    overlay.style.opacity = '0';
    const card = document.getElementById('first-looser-badge-3d-modal-card');
    if (card) {
      card.style.transform = 'scale(0.92) translateY(12px)';
    }

    setTimeout(() => {
      if (activeRenderer) {
        activeRenderer.dispose();
        activeRenderer = null;
      }
      overlay.remove();
      if (onCloseCallback) {
        onCloseCallback();
      }
    }, 300);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // Close triggers
  document.getElementById('first-looser-modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('first-looser-modal-claim-btn')?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // -------------------------------------------------------------
  // THREE.JS 3D BADGE RENDERER
  // -------------------------------------------------------------
  const canvas = document.getElementById('first-looser-3d-canvas') as HTMLCanvasElement;
  const container = document.getElementById('first-looser-canvas-container');
  const loadingIndicator = document.getElementById('first-looser-3d-loading');

  if (!canvas || !container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 5.0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  activeRenderer = renderer;

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
  mainLight.position.set(4, 5, 4);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xfca5a5, 2.0);
  fillLight.position.set(-4, -2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
  rimLight.position.set(0, -4, 4);
  scene.add(rimLight);

  // Badge Model Group
  const badgeGroup = new THREE.Group();
  scene.add(badgeGroup);

  // Load GLB Model
  const loader = new GLTFLoader();
  const badgeModelPath = '/badges/kuizu_first_looser_devil_fixed.glb';

  loader.load(
    badgeModelPath,
    (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const desiredScale = 2.5 / maxDim;
        badgeGroup.scale.set(desiredScale, desiredScale, desiredScale);
      }

      badgeGroup.add(model);

      if (loadingIndicator) {
        loadingIndicator.style.opacity = '0';
        setTimeout(() => {
          loadingIndicator.style.display = 'none';
        }, 300);
      }
    },
    undefined,
    (err) => {
      console.error('Failed to load 3D first looser badge GLB:', err);
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `
          <div style="font-size: 13px; color: #64748b; font-weight: 600;">First Looser Badge Unlocked</div>
        `;
      }
    }
  );

  // Pointer Interaction for 3D Drag Rotation
  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    canvas.style.cursor = 'grabbing';
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    manualRotationVelocity.x = deltaY * 0.008;
    manualRotationVelocity.y = deltaX * 0.008;

    badgeGroup.rotation.y += manualRotationVelocity.y;
    badgeGroup.rotation.x += manualRotationVelocity.x;

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }
  });

  // Animation Loop with Smooth Slow Motion
  const clock = new THREE.Clock();

  function animate(): void {
    activeAnimationId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (!isDragging) {
      badgeGroup.rotation.y += 0.009;
      badgeGroup.position.y = Math.sin(elapsedTime * 1.6) * 0.09;
      const targetRotX = Math.sin(elapsedTime * 1.2) * 0.06;
      badgeGroup.rotation.x += (targetRotX - badgeGroup.rotation.x) * 0.05;

      manualRotationVelocity.x *= 0.95;
      manualRotationVelocity.y *= 0.95;
      badgeGroup.rotation.y += manualRotationVelocity.y;
      badgeGroup.rotation.x += manualRotationVelocity.x;
    }

    renderer.render(scene, camera);
  }

  animate();

  const handleResize = () => {
    if (!container || !activeRenderer) return;
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };

  window.addEventListener('resize', handleResize);
}
