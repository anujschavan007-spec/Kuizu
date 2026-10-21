import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import confetti from 'canvas-confetti';
import { triggerBadgeAwardEmail, unlockBadge } from './badgeManager';

let activeAnimationId: number | null = null;
let activeRenderer: THREE.WebGLRenderer | null = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let manualRotationVelocity = { x: 0, y: 0 };

export function showFirstDailyKuizuBadgeModal(onCloseCallback?: () => void): void {
  // Ensure badge is unlocked and first-time email is sent to user
  try {
    unlockBadge('daily-kuizu-solver');
    triggerBadgeAwardEmail('daily-kuizu-solver');
  } catch (_) {}

  // Prevent duplicate modals
  if (document.getElementById('daily-badge-3d-modal-overlay')) {
    return;
  }

  // Create Modal Overlay
  const overlay = document.createElement('div');
  overlay.id = 'daily-badge-3d-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    padding: 16px;
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  overlay.innerHTML = `
    <div id="daily-badge-3d-modal-card" style="
      max-width: 440px;
      width: 100%;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8);
      overflow: hidden;
      position: relative;
      text-align: center;
      padding: 32px 28px 28px 28px;
      transform: scale(0.92) translateY(12px);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <!-- Close Button (Top-Right) -->
      <button type="button" id="daily-badge-modal-close-btn" aria-label="Close" style="
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
      <div style="display: inline-flex; align-items: center; gap: 7px; padding: 6px 16px; border-radius: 9999px; background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
        <span>Achievement Unlocked</span>
      </div>

      <!-- Title & Subtitle -->
      <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.02em;">
        Daily Kuizu Solver
      </h2>
      <p style="font-size: 14.5px; color: #64748b; margin: 0 auto 20px auto; max-width: 340px; line-height: 1.5;">
        Your first daily challenge is complete.
      </p>

      <!-- 3D Canvas Box -->
      <div id="daily-badge-canvas-container" style="
        width: 100%;
        height: 290px;
        background: #f4f6fa;
        border-radius: 22px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      ">
        <canvas id="daily-badge-3d-canvas" style="width: 100%; height: 100%; outline: none; cursor: grab;"></canvas>

        <!-- Loading Indicator -->
        <div id="daily-badge-3d-loading" style="
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
          <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 28px; height: 28px; color: #4f46e5; animation: adminSpin 0.8s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span style="font-size: 12px; font-weight: 600; color: #64748b;">Loading 3D Silver Badge...</span>
        </div>

        <!-- Badge Category / Level Caption -->
        <div style="
          position: absolute;
          bottom: 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
          pointer-events: none;
        ">
          Silver Badge
        </div>
      </div>

      <!-- Action Button (View Results -> Acts as Close Button) -->
      <button type="button" id="daily-badge-modal-claim-btn" style="
        width: 100%;
        margin-top: 24px;
        padding: 15px 24px;
        border-radius: 16px;
        border: none;
        background: #4f46e5;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.4);
        transition: all 0.2s;
      ">
        <span>View Results</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger Entrance Animation
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    const card = document.getElementById('daily-badge-3d-modal-card');
    if (card) {
      card.style.transform = 'scale(1) translateY(0)';
    }
  });

  // Confetti explosion
  try {
    confetti({
      particleCount: 130,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#4f46e5', '#818cf8', '#94a3b8', '#cbd5e1', '#38bdf8']
    });
  } catch (err) {
    console.warn('Confetti error:', err);
  }

  // Setup Close Handler (Both 'X' and 'View Results' close the modal)
  const closeModal = () => {
    overlay.style.opacity = '0';
    const card = document.getElementById('daily-badge-3d-modal-card');
    if (card) {
      card.style.transform = 'scale(0.92) translateY(12px)';
    }

    setTimeout(() => {
      // Clean up Three.js animation and renderer
      if (activeAnimationId !== null) {
        cancelAnimationFrame(activeAnimationId);
        activeAnimationId = null;
      }
      if (activeRenderer) {
        activeRenderer.dispose();
        activeRenderer.forceContextLoss();
        activeRenderer = null;
      }
      overlay.remove();
      if (onCloseCallback) {
        onCloseCallback();
      }
    }, 320);
  };

  document.getElementById('daily-badge-modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('daily-badge-modal-claim-btn')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Initialize Three.js 3D Badge Scene
  init3DDailyBadgeScene();
}

function init3DDailyBadgeScene(): void {
  const canvas = document.getElementById('daily-badge-3d-canvas') as HTMLCanvasElement | null;
  const container = document.getElementById('daily-badge-canvas-container');
  const loadingIndicator = document.getElementById('daily-badge-3d-loading');
  if (!canvas || !container) return;

  const width = container.clientWidth || 384;
  const height = container.clientHeight || 290;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  activeRenderer = renderer;

  // Lighting tailored for pristine silver and chrome reflections
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 3.2);
  mainLight.position.set(4, 6, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xc7d2fe, 1.9);
  fillLight.position.set(-4, -2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xf8fafc, 2.0);
  rimLight.position.set(0, -4, 4);
  scene.add(rimLight);

  // Badge Model Group
  const badgeGroup = new THREE.Group();
  scene.add(badgeGroup);

  // Load GLB Model
  const loader = new GLTFLoader();
  const badgeModelPath = '/badges/kuizu_first_kuizu_solver_silver_badge.glb';

  loader.load(
    badgeModelPath,
    (gltf) => {
      const model = gltf.scene;

      // Center model around its bounding box center
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;

      // Scale to comfortably fit the viewport
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const desiredScale = 2.5 / maxDim;
        badgeGroup.scale.set(desiredScale, desiredScale, desiredScale);
      }

      // Add to group
      badgeGroup.add(model);

      // Hide loading overlay
      if (loadingIndicator) {
        loadingIndicator.style.opacity = '0';
        setTimeout(() => {
          loadingIndicator.style.display = 'none';
        }, 300);
      }
    },
    undefined,
    (err) => {
      console.error('Failed to load 3D daily kuizu badge GLB:', err);
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `
          <div style="font-size: 13px; color: #64748b; font-weight: 600;">Daily Kuizu Solver Badge Unlocked</div>
        `;
      }
    }
  );

  // Mouse / Pointer Interaction for 3D Drag Rotation
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
      // Slow, steady 3D rotation around Y-axis
      badgeGroup.rotation.y += 0.009;

      // Subtle natural floating bob on Y
      badgeGroup.position.y = Math.sin(elapsedTime * 1.6) * 0.09;

      // Gentle side tilt
      const targetRotX = Math.sin(elapsedTime * 1.2) * 0.06;
      badgeGroup.rotation.x += (targetRotX - badgeGroup.rotation.x) * 0.05;

      // Smooth damping on manual rotation momentum
      manualRotationVelocity.x *= 0.95;
      manualRotationVelocity.y *= 0.95;
      badgeGroup.rotation.y += manualRotationVelocity.y;
      badgeGroup.rotation.x += manualRotationVelocity.x;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize listener
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
