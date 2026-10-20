import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CoinInstance {
  id: string;
  canvas: HTMLCanvasElement;
  card: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  badgeGroup: THREE.Group;
  isHovered: boolean;
  mouseTarget: { x: number; y: number };
  index: number;
  disposed: boolean;
}

let activeCoins: CoinInstance[] = [];
let animFrameId: number | null = null;
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();
const loadingPromises = new Map<string, Promise<THREE.Group>>();

/**
 * Load and cache a GLTF model
 */
async function loadModel(url: string): Promise<THREE.Group> {
  const cached = modelCache.get(url);
  if (cached) {
    return cached.clone(true);
  }

  const existingPromise = loadingPromises.get(url);
  if (existingPromise) {
    const model = await existingPromise;
    return model.clone(true);
  }

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        // Compute bounding box and center
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        scene.position.x -= center.x;
        scene.position.y -= center.y;
        scene.position.z -= center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const desiredScale = 2.65 / maxDim;
          scene.scale.set(desiredScale, desiredScale, desiredScale);
        }

        // Cache the centered & scaled template
        modelCache.set(url, scene);
        loadingPromises.delete(url);
        resolve(scene.clone(true));
      },
      undefined,
      (err) => {
        console.error(`Failed to load GLB badge model at ${url}:`, err);
        loadingPromises.delete(url);
        reject(err);
      }
    );
  });

  loadingPromises.set(url, promise);
  return promise;
}

/**
 * Global shared animation loop for all active badge coins
 */
function startAnimationLoop(): void {
  if (animFrameId !== null) return;

  const clock = new THREE.Clock();

  const tick = () => {
    animFrameId = requestAnimationFrame(tick);
    const elapsedTime = clock.getElapsedTime();

    for (let i = 0; i < activeCoins.length; i++) {
      const coin = activeCoins[i];
      if (coin.disposed) continue;

      if (coin.isHovered) {
        // Tilt smoothly toward cursor
        coin.badgeGroup.rotation.y += (coin.mouseTarget.x - coin.badgeGroup.rotation.y) * 0.08;
        coin.badgeGroup.rotation.x += (coin.mouseTarget.y - coin.badgeGroup.rotation.x) * 0.08;
        coin.badgeGroup.position.y += (0 - coin.badgeGroup.position.y) * 0.08;
      } else {
        // Natural elegant spinning & floating
        coin.badgeGroup.rotation.y += 0.009;
        // Gentle bobbing
        coin.badgeGroup.position.y = Math.sin(elapsedTime * 1.5 + coin.index * 0.9) * 0.06;
        // Return X tilt to zero
        coin.badgeGroup.rotation.x += (0 - coin.badgeGroup.rotation.x) * 0.05;
      }

      coin.renderer.render(coin.scene, coin.camera);
    }
  };

  animFrameId = requestAnimationFrame(tick);
}

/**
 * Initialize a 3D Coin on a specific canvas
 */
export async function initBadge3DCoin(
  canvas: HTMLCanvasElement,
  card: HTMLElement,
  glbUrl: string,
  badgeId: string,
  index: number
): Promise<void> {
  const width = canvas.clientWidth || 110;
  const height = canvas.clientHeight || 110;

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.3);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power'
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Lighting setup for rich metallic reflections
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc7d2fe, 2.0);
  fillLight.position.set(-4, -2, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfef08a, 1.8);
  rimLight.position.set(0, -4, 4);
  scene.add(rimLight);

  const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
  topLight.position.set(0, 5, -2);
  scene.add(topLight);

  // Badge Model Group
  const badgeGroup = new THREE.Group();
  scene.add(badgeGroup);

  const coin: CoinInstance = {
    id: badgeId,
    canvas,
    card,
    scene,
    camera,
    renderer,
    badgeGroup,
    isHovered: false,
    mouseTarget: { x: 0, y: 0 },
    index,
    disposed: false
  };

  // Setup card mouse interactions
  const handleMouseMove = (e: MouseEvent) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    coin.mouseTarget.x = x * 0.9;
    coin.mouseTarget.y = y * 0.55;
  };

  const handleMouseEnter = () => {
    coin.isHovered = true;
  };

  const handleMouseLeave = () => {
    coin.isHovered = false;
  };

  card.addEventListener('mousemove', handleMouseMove);
  card.addEventListener('mouseenter', handleMouseEnter);
  card.addEventListener('mouseleave', handleMouseLeave);

  activeCoins.push(coin);
  startAnimationLoop();

  // Load the model
  try {
    const model = await loadModel(glbUrl);
    if (!coin.disposed) {
      badgeGroup.add(model);
      canvas.style.opacity = '1';

      // Hide loading spinner if present
      const spinner = card.querySelector('.badge-coin-spinner') as HTMLElement | null;
      if (spinner) {
        spinner.style.opacity = '0';
        setTimeout(() => spinner.remove(), 250);
      }
    }
  } catch (err) {
    console.warn(`Badge 3D model could not be displayed for ${badgeId}:`, err);
  }
}

/**
 * Dispose all currently active 3D coin instances
 */
export function disposeAllBadge3DCoins(): void {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  for (let i = 0; i < activeCoins.length; i++) {
    const coin = activeCoins[i];
    coin.disposed = true;
    try {
      coin.renderer.dispose();
      coin.renderer.forceContextLoss();
    } catch (_) {}
  }

  activeCoins = [];
}
