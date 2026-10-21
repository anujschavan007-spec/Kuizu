/**
 * Interactive 3D Avatar Viewer & Streamer for KUIZU
 * 
 * Streams and renders 3D .GLB character avatars in-place with:
 * - OrbitControls 360° rotation
 * - Zoom in / Zoom out via mouse scroll, touch pinch, and interactive overlay buttons
 * - Playable skeletal animations & subtle procedural idle breathing
 * - Automatic streaming from Supabase Storage and IndexedDB fallback
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getSavedGlbAvatarModel } from './avatarStorage';

export interface AvatarViewerInstance {
  unmount: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export interface MountViewerOptions {
  glbUrl?: string;
  mode?: 'playable' | 'still';
  showControls?: boolean;
  onLoaded?: () => void;
  onError?: (err: any) => void;
}

/**
 * Mount an interactive 3D avatar viewer inside any avatar container element
 */
export async function mount3dAvatarViewer(
  container: HTMLElement,
  options: MountViewerOptions = {}
): Promise<AvatarViewerInstance | null> {
  if (!container || typeof window === 'undefined') return null;

  // Cleanup any previous viewer in this container
  const existingWrapper = container.querySelector('.kuizu-3d-avatar-canvas-wrap');
  if (existingWrapper) {
    existingWrapper.remove();
  }

  // Determine GLB source URL
  let glbUrl = options.glbUrl || localStorage.getItem('kuizu_avatar_glb_url') || '';
  let glbMode = options.mode || (localStorage.getItem('kuizu_avatar_glb_mode') as 'playable' | 'still') || 'playable';
  let modelBuffer: ArrayBuffer | null = null;

  // Fallback to IndexedDB if no remote URL is present yet
  if (!glbUrl) {
    const cached = await getSavedGlbAvatarModel();
    if (cached && cached.data) {
      modelBuffer = cached.data;
      glbMode = options.mode || cached.mode || 'playable';
    } else {
      return null;
    }
  }

  // Hide any static img element inside container while 3D viewer is active
  const staticImg = container.querySelector<HTMLImageElement>('img');
  if (staticImg) {
    staticImg.style.display = 'none';
  }

  // Create wrapper
  const wrap = document.createElement('div');
  wrap.className = 'kuizu-3d-avatar-canvas-wrap';
  wrap.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100%;
    border-radius: inherit;
    overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0a0f1d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width: 100%; height: 100%; display: block; border-radius: inherit; cursor: grab;';
  wrap.appendChild(canvas);

  // Zoom overlay controls pill
  if (options.showControls !== false) {
    const controlsOverlay = document.createElement('div');
    controlsOverlay.className = 'avatar-3d-zoom-controls';
    controlsOverlay.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 3px 6px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      z-index: 10;
      opacity: 0.85;
      transition: opacity 0.2s ease;
    `;
    controlsOverlay.innerHTML = `
      <button type="button" class="btn-3d-zoom-in" title="Zoom In" style="background:transparent;border:none;color:#f8fafc;font-size:13px;font-weight:700;cursor:pointer;padding:2px 5px;line-height:1;">+</button>
      <span style="color:#64748b;font-size:10px;">|</span>
      <button type="button" class="btn-3d-zoom-out" title="Zoom Out" style="background:transparent;border:none;color:#f8fafc;font-size:13px;font-weight:700;cursor:pointer;padding:2px 5px;line-height:1;">−</button>
      <span style="color:#64748b;font-size:10px;">|</span>
      <button type="button" class="btn-3d-reset" title="Reset Camera" style="background:transparent;border:none;color:#38bdf8;font-size:11px;font-weight:700;cursor:pointer;padding:2px 4px;line-height:1;">⟲</button>
    `;
    wrap.appendChild(controlsOverlay);

    // Zoom button interactions
    controlsOverlay.querySelector('.btn-3d-zoom-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomIn();
    });
    controlsOverlay.querySelector('.btn-3d-zoom-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomOut();
    });
    controlsOverlay.querySelector('.btn-3d-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      resetView();
    });
  }

  container.appendChild(wrap);

  // Three.js Scene Setup
  const width = container.clientWidth || 160;
  const height = container.clientHeight || 160;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.15, 2.3);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // OrbitControls (Enable Zoom & 360 Rotation)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.0;
  controls.minDistance = 0.6;
  controls.maxDistance = 5.0;
  controls.maxPolarAngle = Math.PI / 2 + 0.15;
  controls.target.set(0, 0.85, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(2, 3, 2.5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.9);
  fillLight.position.set(-2, 1.5, 1.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
  rimLight.position.set(0, 2.5, -2);
  scene.add(rimLight);

  // Circular Pedestal
  const platformGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.3
  });
  const platform = new THREE.Mesh(platformGeo, platformMat);
  platform.position.y = -0.02;
  scene.add(platform);

  let currentModel: THREE.Group | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  const clock = new THREE.Clock();
  let animId: number | null = null;
  let hasAnimations = false;

  function zoomIn() {
    if (!camera) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 0.3);
    controls.update();
  }

  function zoomOut() {
    if (!camera) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -0.3);
    controls.update();
  }

  function resetView() {
    camera.position.set(0, 1.15, 2.3);
    controls.target.set(0, 0.85, 0);
    controls.update();
  }

  // Animation Loop
  function animate() {
    animId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer && glbMode === 'playable' && hasAnimations) {
      mixer.update(delta);
    } else if (currentModel && glbMode === 'playable') {
      const time = clock.getElapsedTime();
      currentModel.position.y = Math.sin(time * 1.8) * 0.025;
      currentModel.rotation.y += 0.003;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Load Model
  const loader = new GLTFLoader();

  const onGltfParsed = (gltf: any) => {
    const model = gltf.scene;
    currentModel = model;

    // Center and scale to target avatar height (1.5 units)
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetHeight = 1.5;
    const scale = maxDim > 0 ? targetHeight / maxDim : 1;
    model.scale.set(scale, scale, scale);

    box.setFromObject(model);
    box.getCenter(center);
    model.position.x = -center.x;
    model.position.y = -box.min.y;
    model.position.z = -center.z;

    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      hasAnimations = true;
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip: any) => {
        mixer!.clipAction(clip).play();
      });
    }

    options.onLoaded?.();
  };

  try {
    if (modelBuffer) {
      loader.parse(modelBuffer, '', onGltfParsed, (err) => {
        console.warn('Failed parsing model buffer for avatar viewer:', err);
        options.onError?.(err);
      });
    } else if (glbUrl) {
      loader.load(
        glbUrl,
        onGltfParsed,
        undefined,
        (err) => {
          console.warn('Failed streaming GLB from Supabase:', err);
          options.onError?.(err);
        }
      );
    }
  } catch (loadErr) {
    console.warn('Avatar 3D load exception:', loadErr);
    options.onError?.(loadErr);
  }

  // Resize Observer
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    }
  });
  resizeObserver.observe(container);

  return {
    unmount: () => {
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (mixer) mixer.stopAllAction();
      if (scene && currentModel) scene.remove(currentModel);
      renderer.dispose();
      wrap.remove();
      if (staticImg) staticImg.style.display = '';
    },
    zoomIn,
    zoomOut,
    resetView
  };
}
