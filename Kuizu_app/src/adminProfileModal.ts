import './services/adminAuthGuard';
import { AUTHORIZED_ADMIN_EMAIL } from './services/adminAuthGuard';

// Reusable Admin Profile Modal Handler
export function setupAdminProfileModal() {
  const adminEmail = localStorage.getItem('kuizu_user_email') || AUTHORIZED_ADMIN_EMAIL;
  const adminName = localStorage.getItem('kuizu_user_name') || 'Admin';
  const adminAvatar = localStorage.getItem('kuizu_user_avatar') || '/images/admin_avatar.png';

  // Function to sync admin avatar everywhere on admin pages
  function syncAdminAvatarUI(avatarUrl: string, name?: string) {
    document.querySelectorAll<HTMLImageElement>(
      '.admin-avatar-circle img, .admin-profile-modal-avatar, #sidebar-admin-avatar-img, #admin-account-avatar-preview'
    ).forEach(img => {
      img.src = avatarUrl;
    });
    if (name) {
      document.querySelectorAll<HTMLElement>(
        '.admin-user-name, #admin-profile-modal-title'
      ).forEach(el => {
        el.textContent = name;
      });
    }
  }

  // Ensure modal markup exists in document
  let modalBackdrop = document.getElementById('admin-profile-modal-backdrop');
  if (!modalBackdrop) {
    const modalHtml = `
      <div class="admin-profile-modal-backdrop" id="admin-profile-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
        <div class="admin-profile-modal-card" id="admin-profile-modal-card">
          <!-- Close Button -->
          <button type="button" class="admin-profile-modal-close" id="admin-profile-close-btn" aria-label="Close Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- Top Header Row -->
          <div class="admin-profile-modal-header">
            <div class="admin-profile-modal-avatar-wrap">
              <img src="${adminAvatar}" alt="Admin Avatar" class="admin-profile-modal-avatar" />
            </div>
            <div class="admin-profile-modal-identity">
              <h2 class="admin-profile-modal-name" id="admin-profile-modal-title">${adminName}</h2>
              <div class="admin-profile-role-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14.5l-3.5-3.5 1.41-1.41L11 13.67l5.59-5.59L18 9.5l-7 7z"/>
                </svg>
                <span>Administrator</span>
              </div>
            </div>
          </div>

          <!-- Profile Details List -->
          <div class="admin-profile-details-list">
            <!-- Name Row -->
            <div class="admin-profile-detail-row">
              <div class="admin-profile-detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Name</span>
              </div>
              <span class="admin-profile-detail-value">Admin</span>
            </div>

            <!-- Role Row -->
            <div class="admin-profile-detail-row">
              <div class="admin-profile-detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Role</span>
              </div>
              <span class="admin-profile-detail-value">Administrator</span>
            </div>

            <!-- Email Row -->
            <div class="admin-profile-detail-row">
              <div class="admin-profile-detail-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>Email</span>
              </div>
              <span class="admin-profile-detail-value">${adminEmail}</span>
            </div>
          </div>

          <!-- Sign Out Button -->
          <button type="button" class="admin-profile-signout-btn" id="admin-profile-signout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalBackdrop = document.getElementById('admin-profile-modal-backdrop');
  }

  const closeBtn = document.getElementById('admin-profile-close-btn');
  const modalCard = document.getElementById('admin-profile-modal-card');
  const signoutBtn = document.getElementById('admin-profile-signout-btn');

  function openModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Open triggers: any admin-user-info or #admin-user-profile-btn element
  const adminBtns = document.querySelectorAll('.admin-user-info, #admin-user-profile-btn');
  adminBtns.forEach(btn => {
    btn.setAttribute('style', 'cursor: pointer;');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
    btn.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  });

  // Close triggers
  closeBtn?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeModal();
    }
  });

  // Escape key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop?.classList.contains('active')) {
      closeModal();
    }
  });

  // Sign out handler
  signoutBtn?.addEventListener('click', () => {
    signoutBtn.innerHTML = `
      <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span>Signing Out...</span>
    `;
    setTimeout(() => {
      window.location.href = '/sign-in';
    }, 600);
  });

  // Immediately apply synced avatar and name to DOM
  syncAdminAvatarUI(adminAvatar, adminName);

  // Real-time synchronization listeners
  window.addEventListener('storage', (e) => {
    if (e.key === 'kuizu_user_avatar' || e.key === 'kuizu_user_name') {
      const curAvatar = localStorage.getItem('kuizu_user_avatar') || '/images/admin_avatar.png';
      const curName = localStorage.getItem('kuizu_user_name') || 'Admin';
      syncAdminAvatarUI(curAvatar, curName);
    }
  });

  window.addEventListener('kuizu:avatar_changed', (e: any) => {
    const curAvatar = e.detail?.avatarUrl || localStorage.getItem('kuizu_user_avatar') || '/images/admin_avatar.png';
    const curName = localStorage.getItem('kuizu_user_name') || 'Admin';
    syncAdminAvatarUI(curAvatar, curName);
  });

  return { openModal, closeModal };
}

// Auto-run if script is directly included
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupAdminProfileModal());
  } else {
    setupAdminProfileModal();
  }
}
