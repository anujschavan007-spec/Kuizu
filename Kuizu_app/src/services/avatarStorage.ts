/**
 * Avatar Storage & Synchronization Service for KUIZU
 * 
 * Manages:
 * - 2D Pixar Avatar preset selections
 * - 3D GLB character model persistence (IndexedDB for reliable storage up to 200MB+)
 * - Playable vs Still mode toggles
 * - Instant synchronization across profile, headers, and Supabase backend
 */

import { supabase } from './supabaseApiBridge';

const DB_NAME = 'kuizu_avatar_db';
const DB_VERSION = 1;
const STORE_NAME = 'avatar_models';
const AVATAR_KEY = 'user_active_glb';

export interface SavedGlbAvatar {
  data: ArrayBuffer;
  fileName: string;
  mode: 'playable' | 'still';
  snapshotUrl?: string;
  updatedAt: string;
}

/**
 * Checks whether an avatar string represents a user added/saved custom avatar
 * (Pixar presets, 3D GLB canvas snapshot, custom uploads)
 * vs Google/Clerk OAuth profile identicons or fallback placeholders.
 */
export function isAddedUserAvatar(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl) return false;
  const trimmed = avatarUrl.trim();
  if (!trimmed || trimmed === '/images/home_avatar.png' || trimmed === '/images/admin_avatar.png') {
    return false;
  }
  // 1. Pixar 2D preset avatars
  if (trimmed.startsWith('/avatars/')) return true;
  // 2. 3D GLB canvas snapshot data or blob URL
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return true;
  // 3. Stored in Supabase avatars bucket
  if (trimmed.includes('supabase.co') && trimmed.includes('/avatars/')) return true;
  // 4. Any OAuth provider / Clerk identicon is Google/Clerk fetched profile, NOT an added avatar
  const isOauthOrClerkImg =
    trimmed.includes('img.clerk.com') ||
    trimmed.includes('images.clerk.dev') ||
    trimmed.includes('googleusercontent.com') ||
    trimmed.includes('avatars.githubusercontent.com');

  if (isOauthOrClerkImg) {
    return false;
  }

  // Any other custom image URL added by user
  return true;
}

/**
 * Open or initialize IndexedDB
 */
function openAvatarDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save custom .GLB avatar model to Supabase Storage & IndexedDB, streaming it everywhere
 */
export async function saveGlbAvatarModel(
  buffer: ArrayBuffer,
  fileName: string,
  mode: 'playable' | 'still' = 'playable',
  snapshotUrl?: string
): Promise<boolean> {
  try {
    const userEmail = localStorage.getItem('kuizu_user_email') || 'user';
    const cleanEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    // 1. Save locally in IndexedDB for immediate responsiveness
    try {
      const db = await openAvatarDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: SavedGlbAvatar = {
        data: buffer,
        fileName,
        mode,
        snapshotUrl,
        updatedAt: new Date().toISOString()
      };
      await new Promise<void>((resolve, reject) => {
        const req = store.put(record, AVATAR_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (idbErr) {
      console.warn('IndexedDB write warning:', idbErr);
    }

    // 2. Upload .GLB file to Supabase Storage bucket ('avatars') for streaming
    let glbStreamUrl = '';
    try {
      const glbFilePath = `models/${cleanEmail}_3d_avatar.glb`;
      const glbBlob = new Blob([buffer], { type: 'model/gltf-binary' });
      const { error: glbUploadErr } = await supabase.storage
        .from('avatars')
        .upload(glbFilePath, glbBlob, {
          contentType: 'model/gltf-binary',
          upsert: true
        });

      if (!glbUploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(glbFilePath);
        glbStreamUrl = urlData.publicUrl;
        console.log('[avatarStorage] Streamed 3D GLB uploaded to Supabase:', glbStreamUrl);
      } else {
        console.warn('Supabase GLB upload error:', glbUploadErr);
      }
    } catch (storageErr) {
      console.warn('Supabase storage upload exception:', storageErr);
    }

    // 3. Upload snapshot PNG to Supabase Storage
    let finalSnapshotUrl = snapshotUrl || '';
    if (snapshotUrl && snapshotUrl.startsWith('data:image/')) {
      try {
        const snapshotFilePath = `snapshots/${cleanEmail}_avatar.png`;
        const res = await fetch(snapshotUrl);
        const snapshotBlob = await res.blob();
        const { error: snapErr } = await supabase.storage
          .from('avatars')
          .upload(snapshotFilePath, snapshotBlob, {
            contentType: 'image/png',
            upsert: true
          });
        if (!snapErr) {
          const { data: snapUrlData } = supabase.storage.from('avatars').getPublicUrl(snapshotFilePath);
          finalSnapshotUrl = snapUrlData.publicUrl;
        }
      } catch (snapEx) {
        console.warn('Snapshot upload warning:', snapEx);
      }
    }

    // 4. Update localStorage state
    localStorage.setItem('kuizu_avatar_mode', '3d');
    localStorage.setItem('kuizu_avatar_glb_mode', mode);
    localStorage.setItem('kuizu_avatar_glb_name', fileName);
    if (glbStreamUrl) {
      localStorage.setItem('kuizu_avatar_glb_url', glbStreamUrl);
    }
    if (finalSnapshotUrl) {
      localStorage.setItem('kuizu_user_avatar', finalSnapshotUrl);
      localStorage.setItem('kuizu_custom_avatar', finalSnapshotUrl);
      localStorage.setItem('kuizu_custom_avatar_saved', 'true');
      updateCachedUserProfileAvatar(finalSnapshotUrl);
    }

    // 5. Update Supabase users database row
    try {
      await supabase
        .from('users')
        .update({
          avatar: finalSnapshotUrl || snapshotUrl,
          custom_avatar: finalSnapshotUrl || snapshotUrl,
          avatar_glb_url: glbStreamUrl || undefined,
          avatar_mode: '3d',
          avatar_glb_mode: mode,
          last_active: 'Today'
        })
        .ilike('email', userEmail.trim());
    } catch (dbErr) {
      console.warn('Supabase users 3D update error:', dbErr);
    }

    // 6. Notify DOM & active viewers
    notifyAvatarChange(finalSnapshotUrl || '', '3d', mode);

    return true;
  } catch (err) {
    console.warn('Failed to save 3D GLB avatar:', err);
    return false;
  }
}

/**
 * Retrieve saved .GLB avatar model from IndexedDB
 */
export async function getSavedGlbAvatarModel(): Promise<SavedGlbAvatar | null> {
  try {
    const db = await openAvatarDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return await new Promise((resolve, reject) => {
      const req = store.get(AVATAR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get GLB avatar from IndexedDB:', err);
    return null;
  }
}

/**
 * Create a Blob URL from saved IndexedDB model
 */
export async function getSavedGlbBlobUrl(): Promise<{ url: string; mode: 'playable' | 'still' } | null> {
  const model = await getSavedGlbAvatarModel();
  if (!model || !model.data) return null;
  const blob = new Blob([model.data], { type: 'model/gltf-binary' });
  return {
    url: URL.createObjectURL(blob),
    mode: model.mode || 'playable'
  };
}

/**
 * Set a 2D Pixar avatar preset as active
 */
export async function setPresetAvatar(avatarPath: string, avatarName?: string): Promise<void> {
  localStorage.setItem('kuizu_user_avatar', avatarPath);
  localStorage.setItem('kuizu_custom_avatar', avatarPath);
  localStorage.setItem('kuizu_custom_avatar_saved', 'true');
  localStorage.setItem('kuizu_avatar_mode', '2d');
  localStorage.removeItem('kuizu_avatar_glb_mode');
  localStorage.removeItem('kuizu_avatar_glb_url');
  localStorage.removeItem('kuizu_avatar_glb_name');

  updateCachedUserProfileAvatar(avatarPath);
  notifyAvatarChange(avatarPath, '2d');
  await syncAvatarToBackend(avatarPath, avatarName);
}

/**
 * Upload a custom user photo (PNG, JPG, WebP) to Supabase Storage and set as avatar
 */
export async function uploadCustomAvatarImage(file: File): Promise<string | null> {
  try {
    const userEmail = localStorage.getItem('kuizu_user_email') || 'user';
    const cleanEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `custom_uploads/${cleanEmail}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type || 'image/png',
        upsert: true
      });

    if (uploadErr) {
      console.warn('Custom avatar image upload error:', uploadErr);
      return null;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await setPresetAvatar(publicUrl, 'Custom Photo');
    return publicUrl;
  } catch (err) {
    console.warn('Upload custom avatar error:', err);
    return null;
  }
}

/**
 * Set a custom avatar image URL (external link or uploaded image)
 */
export async function setCustomAvatarUrl(imageUrl: string, label?: string): Promise<void> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return;
  await setPresetAvatar(trimmed, label || 'Custom URL');
}

/**
 * Reset avatar to Google fetched profile picture
 */
export async function resetToGoogleProfile(): Promise<string> {
  const email = localStorage.getItem('kuizu_user_email') || '';
  const googleAvatar = localStorage.getItem('kuizu_google_avatar') || '/images/home_avatar.png';

  localStorage.removeItem('kuizu_custom_avatar');
  localStorage.removeItem('kuizu_custom_avatar_saved');
  localStorage.setItem('kuizu_user_avatar', googleAvatar);
  localStorage.setItem('kuizu_avatar_mode', '2d');
  localStorage.removeItem('kuizu_avatar_glb_mode');
  localStorage.removeItem('kuizu_avatar_glb_url');
  localStorage.removeItem('kuizu_avatar_glb_name');

  updateCachedUserProfileAvatar(googleAvatar);
  notifyAvatarChange(googleAvatar, '2d');

  if (email) {
    try {
      await supabase
        .from('users')
        .update({
          avatar: googleAvatar,
          custom_avatar: null,
          avatar_mode: '2d',
          avatar_glb_url: null,
          avatar_glb_mode: null,
          last_active: 'Today'
        })
        .ilike('email', email.trim());
    } catch (e) {
      console.warn('Reset to Google profile Supabase error:', e);
    }

    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          avatar: googleAvatar,
          isResetToGoogle: true,
          avatarMode: '2d'
        })
      });
    } catch (_) {}
  }

  return googleAvatar;
}

/**
 * Synchronize avatar update to cached user profile object
 */
function updateCachedUserProfileAvatar(avatarUrl: string): void {
  try {
    const cachedProfileRaw = localStorage.getItem('kuizu_user_profile');
    if (cachedProfileRaw) {
      const profile = JSON.parse(cachedProfileRaw);
      profile.avatar = avatarUrl;
      localStorage.setItem('kuizu_user_profile', JSON.stringify(profile));
    }
  } catch (_) {}
}

/**
 * Notify all components and tabs of avatar change
 */
function notifyAvatarChange(avatarUrl: string, mode: '2d' | '3d', glbMode?: 'playable' | 'still'): void {
  if (typeof document !== 'undefined') {
    const currentEmail = localStorage.getItem('kuizu_user_email') || '';
    const isAdmin = currentEmail.trim().toLowerCase() === 'anujschavan007@gmail.com';

    // Standard user-facing avatar selectors on all pages
    const userFacingSelectors = [
      '#btn-user-avatar img',
      '.user-nav-avatar',
      '.popup-avatar-img',
      '.profile-avatar-img',
      '.profile-hero-avatar',
      '#menu-user-avatar',
      '.home-user-avatar',
      '#active-avatar-preview-img',
      '.settings-avatar-img',
      '#modal-preview-avatar'
    ];

    // Admin-facing avatar selectors
    const adminFacingSelectors = [
      '.admin-avatar-circle img',
      '.admin-profile-modal-avatar',
      '#sidebar-admin-avatar-img',
      '#admin-account-avatar-preview'
    ];

    const activeSelectors = isAdmin
      ? [...userFacingSelectors, ...adminFacingSelectors]
      : userFacingSelectors;

    const avatarElements = document.querySelectorAll<HTMLImageElement>(activeSelectors.join(', '));
    avatarElements.forEach((img) => {
      if (avatarUrl) img.src = avatarUrl;
    });

    // Notify window and storage
    window.dispatchEvent(
      new CustomEvent('kuizu:avatar_changed', {
        detail: {
          avatarUrl,
          mode,
          glbMode,
          isAdmin,
          glbUrl: localStorage.getItem('kuizu_avatar_glb_url') || ''
        }
      })
    );
  }
}

/**
 * Sync avatar updates to database API & Supabase directly
 */
async function syncAvatarToBackend(avatarUrl: string, label?: string): Promise<void> {
  try {
    const email = localStorage.getItem('kuizu_user_email');
    if (!email) return;

    const cleanEmail = email.trim();
    const is3d = localStorage.getItem('kuizu_avatar_mode') === '3d';
    const glbUrl = localStorage.getItem('kuizu_avatar_glb_url');
    const glbMode = localStorage.getItem('kuizu_avatar_glb_mode');

    // Direct Supabase update for immediate, guaranteed persistence
    try {
      const res = await supabase
        .from('users')
        .update({
          avatar: avatarUrl,
          custom_avatar: avatarUrl,
          avatar_mode: is3d ? '3d' : '2d',
          avatar_glb_url: is3d ? glbUrl : null,
          avatar_glb_mode: is3d ? glbMode : null,
          last_active: 'Today'
        })
        .ilike('email', cleanEmail);
      if (res.error) {
        console.warn('Direct Supabase avatar update error:', res.error);
      } else {
        console.log('[avatarStorage] Direct Supabase avatar saved successfully:', avatarUrl);
      }
    } catch (sbErr) {
      console.warn('Direct Supabase avatar update exception:', sbErr);
    }

    // Also sync through API bridge
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        avatar: avatarUrl,
        customAvatar: avatarUrl,
        isCustomAvatar: true,
        avatarMode: localStorage.getItem('kuizu_avatar_mode') || '2d',
        avatarGlbMode: localStorage.getItem('kuizu_avatar_glb_mode') || undefined,
        avatarLabel: label
      })
    });
  } catch (err) {
    console.warn('Backend avatar sync warning:', err);
  }
}
