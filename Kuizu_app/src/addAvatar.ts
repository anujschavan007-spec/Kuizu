import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import confetti from 'canvas-confetti';
import { initUserHeaderProfile, updateHeaderDOM } from './services/userHeaderProfile';
import { enforceAuthGuard } from './services/authGuard';
import { supabase } from './services/supabaseApiBridge';
import { mount3dAvatarViewer, type AvatarViewerInstance } from './services/avatar3dViewer';
import {
  setPresetAvatar,
  saveGlbAvatarModel,
  getSavedGlbAvatarModel,
  getSavedGlbBlobUrl,
  isAddedUserAvatar,
  resetToGoogleProfile,
  uploadCustomAvatarImage,
  setCustomAvatarUrl
} from './services/avatarStorage';

let activeHero3dViewer: AvatarViewerInstance | null = null;

// Avatar Definition Interface
interface PixarAvatarPreset {
  id: string;
  name: string;
  role: string;
  gender: 'male' | 'female';
  image: string;
  badge: string;
}

const PIXAR_AVATARS: PixarAvatarPreset[] = [
  // 5 Male Characters
  {
    id: 'male-1',
    name: 'Alex Dev',
    role: 'Full-Stack Architect',
    gender: 'male',
    image: '/avatars/male_avatar_1.jpg',
    badge: 'Glasses • Blue Hoodie'
  },
  {
    id: 'male-2',
    name: 'Kai Cyber',
    role: 'Cyberpunk Game Dev',
    gender: 'male',
    image: '/avatars/male_avatar_2.jpg',
    badge: 'Neon Orange • Spiky'
  },
  {
    id: 'male-3',
    name: 'Rohan Tech',
    role: 'Algorithm Champion',
    gender: 'male',
    image: '/avatars/male_avatar_3.jpg',
    badge: 'Purple & Teal • Pro'
  },
  {
    id: 'male-4',
    name: 'Leo Beats',
    role: 'Creative Sound & Code',
    gender: 'male',
    image: '/avatars/male_avatar_4.jpg',
    badge: 'Headphones • Denim'
  },
  {
    id: 'male-5',
    name: 'Marcus Code',
    role: 'Competitive Programmer',
    gender: 'male',
    image: '/avatars/male_avatar_5.jpg',
    badge: 'Varsity Jacket • Gold'
  },

  // 5 Female Characters
  {
    id: 'female-1',
    name: 'Chloe Algorithm',
    role: 'AI Logic Specialist',
    gender: 'female',
    image: '/avatars/female_avatar_1.jpg',
    badge: 'Auburn Waves • Rose Gold'
  },
  {
    id: 'female-2',
    name: 'Mei Synth',
    role: 'Shaders & Graphics Pro',
    gender: 'female',
    image: '/avatars/female_avatar_2.jpg',
    badge: 'Violet Highlights • Cyber'
  },
  {
    id: 'female-3',
    name: 'Ananya Logic',
    role: 'Backend Core Builder',
    gender: 'female',
    image: '/avatars/female_avatar_3.jpg',
    badge: 'High Ponytail • Navy Tech'
  },
  {
    id: 'female-4',
    name: 'Luna Craft',
    role: 'UI / UX & Front-End',
    gender: 'female',
    image: '/avatars/female_avatar_4.jpg',
    badge: 'Pastel Braids • Headset'
  },
  {
    id: 'female-5',
    name: 'Elena Pixels',
    role: 'Creative Tech Lead',
    gender: 'female',
    image: '/avatars/female_avatar_5.jpg',
    badge: 'Curly Locks • Coral Dev'
  }
];

// 3D Viewport State
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let currentModel: THREE.Group | null = null;
let mixer: THREE.AnimationMixer | null = null;
let clock: THREE.Clock = new THREE.Clock();
let animFrameId: number | null = null;
let currentGlbBuffer: ArrayBuffer | null = null;
let currentGlbFileName = '';
let currentGlbMode: 'playable' | 'still' = 'playable';
let hasSkeletalAnimations = false;

// DOM Element References
const gridContainer = document.getElementById('avatars-grid') as HTMLDivElement;
const filterButtons = document.querySelectorAll<HTMLButtonElement>('.avatar-filter-btn');
const activeHeroImg = document.getElementById('active-avatar-preview-img') as HTMLImageElement;
const activeHeroName = document.getElementById('active-avatar-name') as HTMLElement;
const activeHeroTag = document.getElementById('active-avatar-tag') as HTMLElement;
const activeHeroTypePill = document.getElementById('active-avatar-type-pill') as HTMLElement;

// GLB Upload Elements
const dropZone = document.getElementById('glb-drop-zone') as HTMLDivElement;
const fileInput = document.getElementById('glb-file-input') as HTMLInputElement;
const btnSelectFile = document.getElementById('btn-select-glb') as HTMLButtonElement;
const canvasContainer = document.getElementById('three-viewport-container') as HTMLDivElement;
const threeCanvas = document.getElementById('glb-three-canvas') as HTMLCanvasElement;
const btnModePlayable = document.getElementById('btn-mode-playable') as HTMLButtonElement;
const btnModeStill = document.getElementById('btn-mode-still') as HTMLButtonElement;
const btnSaveGlbAvatar = document.getElementById('btn-save-glb-avatar') as HTMLButtonElement;
const glbModelStatus = document.getElementById('glb-model-status') as HTMLElement;
const glbFileInfoBox = document.getElementById('glb-file-info') as HTMLElement;
const glbFileNameLabel = document.getElementById('glb-filename-label') as HTMLElement;
const glbFileSizeLabel = document.getElementById('glb-filesize-label') as HTMLElement;
const btnResetGlb = document.getElementById('btn-reset-glb') as HTMLButtonElement;
const sampleGlbButtons = document.querySelectorAll<HTMLButtonElement>('.btn-sample-model');

// Custom Photo & Reset Elements
const btnKeepGoogleAvatar = document.getElementById('btn-keep-google-avatar') as HTMLButtonElement | null;
const customImageFileInput = document.getElementById('custom-image-file-input') as HTMLInputElement | null;
const btnBrowsePhoto = document.getElementById('btn-browse-photo') as HTMLButtonElement | null;
const inputCustomPhotoUrl = document.getElementById('input-custom-photo-url') as HTMLInputElement | null;
const btnApplyPhotoUrl = document.getElementById('btn-apply-photo-url') as HTMLButtonElement | null;

/**
 * Main Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Mandatory authentication guard
  await enforceAuthGuard();

  // 2. Initialize unified header user profile dropdown
  initUserHeaderProfile();

  // 3. Fetch user's saved avatar directly from Supabase to guarantee fresh state
  const email = localStorage.getItem('kuizu_user_email');
  if (email) {
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('avatar, custom_avatar, google_avatar, name, avatar_glb_url, avatar_mode, avatar_glb_mode')
        .ilike('email', email.trim())
        .maybeSingle();

      if (dbUser) {
        if (dbUser.google_avatar) {
          localStorage.setItem('kuizu_google_avatar', dbUser.google_avatar);
        }
        if (dbUser.avatar_mode === '3d' && dbUser.avatar_glb_url) {
          localStorage.setItem('kuizu_avatar_mode', '3d');
          localStorage.setItem('kuizu_avatar_glb_url', dbUser.avatar_glb_url);
          localStorage.setItem('kuizu_avatar_glb_mode', dbUser.avatar_glb_mode || 'playable');
          localStorage.setItem('kuizu_user_avatar', dbUser.avatar);
          localStorage.setItem('kuizu_custom_avatar_saved', 'true');
        } else if (dbUser.custom_avatar) {
          localStorage.setItem('kuizu_user_avatar', dbUser.custom_avatar);
          localStorage.setItem('kuizu_custom_avatar', dbUser.custom_avatar);
          localStorage.setItem('kuizu_custom_avatar_saved', 'true');
          localStorage.setItem('kuizu_avatar_mode', '2d');
        } else if (isAddedUserAvatar(dbUser.avatar)) {
          localStorage.setItem('kuizu_user_avatar', dbUser.avatar);
          localStorage.setItem('kuizu_custom_avatar', dbUser.avatar);
          localStorage.setItem('kuizu_custom_avatar_saved', 'true');
          localStorage.setItem('kuizu_avatar_mode', '2d');
        } else {
          // No avatar added yet: keep Google fetched profile
          const googleImg = dbUser.google_avatar || localStorage.getItem('kuizu_google_avatar') || dbUser.avatar || '/images/home_avatar.png';
          localStorage.setItem('kuizu_user_avatar', googleImg);
          localStorage.removeItem('kuizu_custom_avatar');
          localStorage.removeItem('kuizu_custom_avatar_saved');
          localStorage.setItem('kuizu_avatar_mode', '2d');
        }
      }
    } catch (err) {
      console.warn('Supabase avatar check error on addAvatar load:', err);
    }
  }

  // Keep Google Profile Button Listener
  btnKeepGoogleAvatar?.addEventListener('click', async () => {
    btnKeepGoogleAvatar.disabled = true;
    btnKeepGoogleAvatar.textContent = 'Updating...';
    try {
      const gAvatar = await resetToGoogleProfile();
      updateHeaderDOM({ avatar: gAvatar });
      await refreshActiveAvatarCard();
      renderPixarGrid('all');
      showAvatarToast('✨ Kept your Google profile picture!');
    } catch (err) {
      console.warn('Keep Google profile error:', err);
    } finally {
      btnKeepGoogleAvatar.disabled = false;
      btnKeepGoogleAvatar.innerHTML = '<span>🔄</span><span>Keep Google Profile</span>';
    }
  });

  // Custom Photo Upload Listener
  btnBrowsePhoto?.addEventListener('click', () => customImageFileInput?.click());
  customImageFileInput?.addEventListener('change', async () => {
    const file = customImageFileInput.files?.[0];
    if (!file) return;
    showAvatarToast('⏳ Uploading your photo to Supabase...');
    const uploadedUrl = await uploadCustomAvatarImage(file);
    if (uploadedUrl) {
      updateHeaderDOM({ avatar: uploadedUrl });
      await refreshActiveAvatarCard();
      renderPixarGrid('all');
      showAvatarToast('✨ Custom profile photo updated and saved!');
    } else {
      showAvatarToast('❌ Photo upload failed. Please try a valid image file.');
    }
    customImageFileInput.value = '';
  });

  // Custom Photo URL Listener
  btnApplyPhotoUrl?.addEventListener('click', async () => {
    const url = inputCustomPhotoUrl?.value.trim();
    if (!url) return;
    await setCustomAvatarUrl(url);
    updateHeaderDOM({ avatar: url });
    await refreshActiveAvatarCard();
    renderPixarGrid('all');
    showAvatarToast('✨ Profile picture updated from URL!');
    if (inputCustomPhotoUrl) inputCustomPhotoUrl.value = '';
  });

  // 4. Render 2D Pixar avatar grid
  renderPixarGrid('all');

  // 5. Setup filter tabs
  setupFilters();

  // 6. Setup Three.js 3D Viewport
  initThreeJsViewport();

  // 7. Setup GLB File upload & drag and drop
  setupGlbUpload();

  // 8. Check for previously saved avatar state
  refreshActiveAvatarCard();

  // 9. Setup sample 3D model loaders
  setupSampleModels();
});

/**
 * Render Pixar 3D Avatar Grid Cards
 */
function renderPixarGrid(filter: 'all' | 'male' | 'female'): void {
  if (!gridContainer) return;
  gridContainer.innerHTML = '';

  const activeAvatar = localStorage.getItem('kuizu_user_avatar') || '';
  const avatarMode = localStorage.getItem('kuizu_avatar_mode') || '2d';

  const filtered = PIXAR_AVATARS.filter((av) => {
    if (filter === 'all') return true;
    return av.gender === filter;
  });

  filtered.forEach((av) => {
    const isSelected = avatarMode === '2d' && activeAvatar === av.image;

    const card = document.createElement('div');
    card.className = `avatar-card ${isSelected ? 'active' : ''}`;
    card.dataset.id = av.id;
    card.dataset.image = av.image;
    card.dataset.name = av.name;

    card.innerHTML = `
      <div class="avatar-card-image-wrap">
        <img src="${av.image}" alt="${av.name}" class="avatar-card-img" loading="lazy" />
        <div class="avatar-active-badge ${isSelected ? 'visible' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
      <div class="avatar-card-body">
        <div class="avatar-card-meta">
          <h3 class="avatar-card-name">${av.name}</h3>
          <span class="avatar-card-role">${av.role}</span>
        </div>
        <div class="avatar-card-badge">${av.badge}</div>
        <button type="button" class="btn-select-avatar ${isSelected ? 'btn-selected' : ''}">
          ${isSelected ? 'Active Avatar' : 'Set as Profile Avatar'}
        </button>
      </div>
    `;

    // Click handler for card and button
    card.addEventListener('click', (e) => {
      e.preventDefault();
      choosePixarAvatar(av);
    });

    gridContainer.appendChild(card);
  });
}

/**
 * Handle 2D Pixar avatar selection
 */
function choosePixarAvatar(avatar: PixarAvatarPreset): void {
  // Update storage & backend
  setPresetAvatar(avatar.image, avatar.name);

  // Trigger celebration confetti
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 }
    });
  } catch (_) {}

  // Update UI cards
  document.querySelectorAll('.avatar-card').forEach((el) => {
    const isCurrent = (el as HTMLElement).dataset.image === avatar.image;
    el.classList.toggle('active', isCurrent);
    const badge = el.querySelector('.avatar-active-badge');
    if (badge) badge.classList.toggle('visible', isCurrent);
    const btn = el.querySelector('.btn-select-avatar');
    if (btn) {
      btn.textContent = isCurrent ? 'Active Avatar' : 'Set as Profile Avatar';
      btn.classList.toggle('btn-selected', isCurrent);
    }
  });

  refreshActiveAvatarCard();
  updateHeaderDOM({ avatar: avatar.image });
  showAvatarToast(`✨ Profile avatar updated to ${avatar.name}!`);
}

/**
 * Setup category filter pills (All, Male, Female)
 */
function setupFilters(): void {
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = (btn.dataset.filter || 'all') as 'all' | 'male' | 'female';
      renderPixarGrid(filter);
    });
  });
}

/**
 * Refresh Active Avatar Hero Card
 */
async function refreshActiveAvatarCard(): Promise<void> {
  const avatarMode = localStorage.getItem('kuizu_avatar_mode') || '2d';
  const avatarImg = localStorage.getItem('kuizu_user_avatar') || '/images/home_avatar.png';
  const userName = localStorage.getItem('kuizu_user_name') || 'Kuizu Learner';

  if (activeHeroImg) activeHeroImg.src = avatarImg;
  if (activeHeroName) activeHeroName.textContent = userName;

  if (avatarMode === '3d') {
    const glbName = localStorage.getItem('kuizu_avatar_glb_name') || 'Custom 3D Model';
    const glbMode = localStorage.getItem('kuizu_avatar_glb_mode') || 'playable';
    if (activeHeroTag) activeHeroTag.textContent = `3D GLB Character (${glbMode.toUpperCase()}) • ${glbName}`;
    if (activeHeroTypePill) {
      activeHeroTypePill.textContent = '3D Avatar Active';
      activeHeroTypePill.className = 'hero-type-pill pill-3d';
    }
  } else {
    // Find matching preset
    const match = PIXAR_AVATARS.find((a) => a.image === avatarImg);
    if (match) {
      if (activeHeroTag) activeHeroTag.textContent = `${match.name} • ${match.role}`;
      if (activeHeroTypePill) {
        activeHeroTypePill.textContent = '2D Pixar Avatar';
        activeHeroTypePill.className = 'hero-type-pill pill-2d';
      }
    } else if (isAddedUserAvatar(avatarImg)) {
      if (activeHeroTag) activeHeroTag.textContent = 'Pixar 3D Profile Avatar';
      if (activeHeroTypePill) {
        activeHeroTypePill.textContent = 'Custom Avatar Active';
        activeHeroTypePill.className = 'hero-type-pill pill-2d';
      }
    } else {
      if (activeHeroTag) activeHeroTag.textContent = 'Google Account Profile';
      if (activeHeroTypePill) {
        activeHeroTypePill.textContent = 'Google Profile';
        activeHeroTypePill.className = 'hero-type-pill';
      }
    }
  }

  // Toggle Keep Google Profile button
  const isCustomSaved = localStorage.getItem('kuizu_custom_avatar_saved') === 'true';
  const hasCustom = isCustomSaved || isAddedUserAvatar(avatarImg) || avatarMode === '3d';
  if (btnKeepGoogleAvatar) {
    btnKeepGoogleAvatar.style.display = hasCustom ? 'inline-flex' : 'none';
  }

  // Mount/unmount 3D interactive character in active preview circle
  const previewCircle = document.querySelector<HTMLElement>('.active-preview-circle');
  if (avatarMode === '3d' && previewCircle) {
    const glbUrl = localStorage.getItem('kuizu_avatar_glb_url');
    if (!activeHero3dViewer) {
      activeHero3dViewer = await mount3dAvatarViewer(previewCircle, {
        glbUrl: glbUrl || undefined,
        showControls: true
      });
    }
  } else {
    if (activeHero3dViewer) {
      activeHero3dViewer.unmount();
      activeHero3dViewer = null;
    }
  }
}

/**
 * Initialize Three.js Viewport
 */
function initThreeJsViewport(): void {
  if (!threeCanvas || !canvasContainer) return;

  const width = canvasContainer.clientWidth || 500;
  const height = canvasContainer.clientHeight || 420;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1d);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.2, 2.5);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 6;
  controls.minDistance = 0.8;
  controls.maxPolarAngle = Math.PI / 2 + 0.1;
  controls.target.set(0, 0.9, 0);

  // Studio Lighting
  setupStudioLighting(scene);

  // Circular Ground Platform with Subtle Grid
  const platformGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 32);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x111b30,
    metalness: 0.6,
    roughness: 0.3
  });
  const platform = new THREE.Mesh(platformGeo, platformMat);
  platform.position.y = -0.025;
  platform.receiveShadow = true;
  scene.add(platform);

  // Grid helper
  const grid = new THREE.GridHelper(3, 16, 0x3b82f6, 0x1e293b);
  grid.position.y = 0.001;
  scene.add(grid);

  // Resize Listener
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();

  // Load existing 3D avatar if available in IndexedDB
  loadExistingSavedGlb();
}

/**
 * Configure Studio Lighting for 3D Character
 */
function setupStudioLighting(targetScene: THREE.Scene): void {
  // Ambient Soft Light
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  targetScene.add(ambient);

  // Key Light (Warm White)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(2, 3, 2.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  targetScene.add(keyLight);

  // Fill Light (Cool Blue)
  const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.9);
  fillLight.position.set(-2.5, 2, 1.5);
  targetScene.add(fillLight);

  // Rim / Hair Light (Vibrant Cyan / Purple)
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  rimLight.position.set(0, 2.5, -2.5);
  targetScene.add(rimLight);
}

/**
 * Handle Window Resize for 3D Viewport
 */
function onWindowResize(): void {
  if (!canvasContainer || !camera || !renderer) return;
  const w = canvasContainer.clientWidth;
  const h = canvasContainer.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/**
 * Animation Render Loop
 */
function animate(): void {
  animFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer && currentGlbMode === 'playable' && hasSkeletalAnimations) {
    mixer.update(delta);
  } else if (currentModel && currentGlbMode === 'playable') {
    // If no skeletal animation, provide subtle procedural breathing/floating
    const time = clock.getElapsedTime();
    currentModel.position.y = Math.sin(time * 1.8) * 0.03;
    currentModel.rotation.y += 0.004;
  }

  if (controls) {
    controls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/**
 * Setup GLB Upload Handlers
 */
function setupGlbUpload(): void {
  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    });
  }

  // Drag and drop zone
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  // Mode Toggles (Playable vs Still)
  if (btnModePlayable && btnModeStill) {
    btnModePlayable.addEventListener('click', () => set3dDisplayMode('playable'));
    btnModeStill.addEventListener('click', () => set3dDisplayMode('still'));
  }

  // Zoom and View Controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  btnZoomIn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!camera || !controls) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 0.35);
    controls.update();
  });

  btnZoomOut?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!camera || !controls) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -0.35);
    controls.update();
  });

  btnZoomReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!camera || !controls) return;
    camera.position.set(0, 1.2, 2.4);
    controls.target.set(0, 0.9, 0);
    controls.update();
  });

  // Save 3D Avatar Button
  if (btnSaveGlbAvatar) {
    btnSaveGlbAvatar.addEventListener('click', saveCurrentGlbToProfile);
  }

  // Reset Model
  if (btnResetGlb) {
    btnResetGlb.addEventListener('click', resetGlbViewport);
  }
}

/**
 * Process Selected .GLB File
 */
async function handleFileSelection(file: File): Promise<void> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'glb' && ext !== 'gltf') {
    showAvatarToast('⚠️ Please upload a valid .glb or .gltf 3D file.');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    showAvatarToast('⚠️ File is too large. Max size is 50MB.');
    return;
  }

  if (glbModelStatus) glbModelStatus.textContent = 'Loading 3D character...';

  currentGlbFileName = file.name;
  const arrayBuffer = await file.arrayBuffer();
  currentGlbBuffer = arrayBuffer;

  // Display file info
  if (glbFileInfoBox) glbFileInfoBox.style.display = 'flex';
  if (glbFileNameLabel) glbFileNameLabel.textContent = file.name;
  if (glbFileSizeLabel) glbFileSizeLabel.textContent = formatBytes(file.size);

  loadGlbFromBuffer(arrayBuffer, file.name);
}

/**
 * Load GLB into Three.js from ArrayBuffer
 */
function loadGlbFromBuffer(buffer: ArrayBuffer, fileName: string): void {
  if (!scene) return;

  const loader = new GLTFLoader();

  loader.parse(
    buffer,
    '',
    (gltf) => {
      // Clear previous model
      if (scene && currentModel) {
        scene.remove(currentModel);
        currentModel = null;
      }
      if (mixer) {
        mixer.stopAllAction();
        mixer = null;
      }

      const model = gltf.scene;
      currentModel = model;

      // Center and scale model properly
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const targetHeight = 1.8;
      const scale = maxDim > 0 ? targetHeight / maxDim : 1;
      model.scale.set(scale, scale, scale);

      // Re-center on platform
      box.setFromObject(model);
      box.getCenter(center);
      model.position.x = -center.x;
      model.position.y = -box.min.y;
      model.position.z = -center.z;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      if (scene) {
        scene.add(model);
      }

      // Setup Animations if present
      hasSkeletalAnimations = Boolean(gltf.animations && gltf.animations.length > 0);
      if (hasSkeletalAnimations) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          const action = mixer!.clipAction(clip);
          action.play();
        });
        if (glbModelStatus) {
          glbModelStatus.textContent = `✅ Loaded: ${fileName} (${gltf.animations.length} animation(s) detected)`;
        }
      } else {
        if (glbModelStatus) {
          glbModelStatus.textContent = `✅ Loaded: ${fileName} (Static character pose)`;
        }
      }

      // Reset camera to frame character
      if (camera && controls) {
        camera.position.set(0, 1.2, 2.4);
        controls.target.set(0, 0.9, 0);
        controls.update();
      }

      if (btnSaveGlbAvatar) btnSaveGlbAvatar.disabled = false;
      showAvatarToast(`🎉 3D Model "${fileName}" loaded! Rotate with mouse.`);
    },
    (err) => {
      console.error('Error parsing GLB buffer:', err);
      if (glbModelStatus) glbModelStatus.textContent = '❌ Failed to parse 3D file.';
      showAvatarToast('❌ Failed to load 3D model.');
    }
  );
}

/**
 * Toggle Display Mode: Playable vs Still
 */
function set3dDisplayMode(mode: 'playable' | 'still'): void {
  currentGlbMode = mode;

  if (btnModePlayable && btnModeStill) {
    btnModePlayable.classList.toggle('active', mode === 'playable');
    btnModeStill.classList.toggle('active', mode === 'still');
  }

  if (mode === 'still') {
    if (mixer) {
      mixer.timeScale = 0; // Pause animation mixer
    }
    if (currentModel) {
      currentModel.position.y = 0;
    }
    showAvatarToast('🧍 Still Mode Activated (Static Pose)');
  } else {
    if (mixer) {
      mixer.timeScale = 1; // Resume animation mixer
    }
    showAvatarToast('🎮 Playable Mode Activated (Dynamic Animations)');
  }
}

/**
 * Save Current 3D GLB to Profile
 */
async function saveCurrentGlbToProfile(): Promise<void> {
  if (!currentGlbBuffer || !renderer || !scene || !camera) {
    showAvatarToast('⚠️ Please upload or select a 3D model first.');
    return;
  }

  btnSaveGlbAvatar.disabled = true;
  btnSaveGlbAvatar.textContent = 'Saving 3D Avatar...';

  try {
    // 1. Take a snapshot headshot from the 3D canvas
    renderer.render(scene, camera);
    const snapshotUrl = renderer.domElement.toDataURL('image/png');

    // 2. Persist to IndexedDB
    const success = await saveGlbAvatarModel(
      currentGlbBuffer,
      currentGlbFileName || 'my_3d_avatar.glb',
      currentGlbMode,
      snapshotUrl
    );

    if (success) {
      // Confetti burst
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });

      refreshActiveAvatarCard();
      updateHeaderDOM({ avatar: snapshotUrl });
      showAvatarToast('🎉 3D Character successfully set as your profile avatar!');
    } else {
      showAvatarToast('⚠️ Could not save 3D avatar.');
    }
  } catch (err) {
    console.error('Error saving 3D avatar:', err);
    showAvatarToast('❌ Error saving avatar.');
  } finally {
    btnSaveGlbAvatar.disabled = false;
    btnSaveGlbAvatar.textContent = 'Set as 3D Profile Character';
  }
}

/**
 * Reset GLB Viewport
 */
function resetGlbViewport(): void {
  if (currentModel && scene) {
    scene.remove(currentModel);
    currentModel = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }
  currentGlbBuffer = null;
  currentGlbFileName = '';

  if (glbFileInfoBox) glbFileInfoBox.style.display = 'none';
  if (btnSaveGlbAvatar) btnSaveGlbAvatar.disabled = true;
  if (glbModelStatus) glbModelStatus.textContent = 'No 3D model loaded';
  if (fileInput) fileInput.value = '';

  showAvatarToast('3D Viewport reset');
}

/**
 * Load Existing Saved GLB on Startup if any
 */
async function loadExistingSavedGlb(): Promise<void> {
  const avatarMode = localStorage.getItem('kuizu_avatar_mode');
  if (avatarMode !== '3d') return;

  const saved = await getSavedGlbAvatarModel();
  if (saved && saved.data) {
    currentGlbBuffer = saved.data;
    currentGlbFileName = saved.fileName;
    currentGlbMode = saved.mode || 'playable';

    if (glbFileInfoBox) glbFileInfoBox.style.display = 'flex';
    if (glbFileNameLabel) glbFileNameLabel.textContent = saved.fileName;
    if (glbFileSizeLabel) glbFileSizeLabel.textContent = formatBytes(saved.data.byteLength);

    loadGlbFromBuffer(saved.data, saved.fileName);
    set3dDisplayMode(currentGlbMode);
    return;
  }

  // Fallback: Stream directly from Supabase Storage URL
  const glbUrl = localStorage.getItem('kuizu_avatar_glb_url');
  if (glbUrl) {
    try {
      if (glbModelStatus) glbModelStatus.textContent = 'Streaming 3D avatar from Supabase Storage...';
      const res = await fetch(glbUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        currentGlbBuffer = buffer;
        currentGlbFileName = localStorage.getItem('kuizu_avatar_glb_name') || '3d_avatar.glb';
        currentGlbMode = (localStorage.getItem('kuizu_avatar_glb_mode') as 'playable' | 'still') || 'playable';

        if (glbFileInfoBox) glbFileInfoBox.style.display = 'flex';
        if (glbFileNameLabel) glbFileNameLabel.textContent = currentGlbFileName;
        if (glbFileSizeLabel) glbFileSizeLabel.textContent = formatBytes(buffer.byteLength);

        loadGlbFromBuffer(buffer, currentGlbFileName);
        set3dDisplayMode(currentGlbMode);
      }
    } catch (e) {
      console.warn('Could not stream existing 3D avatar:', e);
    }
  }
}

/**
 * Setup Sample 3D Model Buttons
 */
function setupSampleModels(): void {
  sampleGlbButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const modelUrl = btn.dataset.url;
      const modelName = btn.dataset.name || 'Sample 3D Model';
      if (!modelUrl) return;

      if (glbModelStatus) glbModelStatus.textContent = `Downloading ${modelName}...`;

      try {
        const res = await fetch(modelUrl);
        const buffer = await res.arrayBuffer();
        currentGlbBuffer = buffer;
        currentGlbFileName = `${modelName}.glb`;

        if (glbFileInfoBox) glbFileInfoBox.style.display = 'flex';
        if (glbFileNameLabel) glbFileNameLabel.textContent = currentGlbFileName;
        if (glbFileSizeLabel) glbFileSizeLabel.textContent = formatBytes(buffer.byteLength);

        loadGlbFromBuffer(buffer, currentGlbFileName);
      } catch (err) {
        console.warn('Failed to load sample model:', err);
        showAvatarToast('⚠️ Failed to download sample model.');
      }
    });
  });
}

/**
 * Format bytes helper
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Toast Notification Helper
 */
function showAvatarToast(message: string): void {
  const toast = document.getElementById('avatar-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}
