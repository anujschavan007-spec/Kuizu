import confetti from 'canvas-confetti';

import './services/userHeaderProfile';
import './services/adminAuthGuard';
import { mount3dAvatarViewer, type AvatarViewerInstance } from './services/avatar3dViewer';
import { getSavedGlbAvatarModel } from './services/avatarStorage';

let homeAvatar3dInstance: AvatarViewerInstance | null = null;

async function syncHome3dAvatar() {
  const container = document.querySelector<HTMLElement>('.profile-avatar-container');
  if (!container) return;

  const mode = localStorage.getItem('kuizu_avatar_mode');
  const glbUrl = localStorage.getItem('kuizu_avatar_glb_url');
  const hasLocalModel = Boolean(await getSavedGlbAvatarModel());

  if (mode === '3d' && (glbUrl || hasLocalModel)) {
    if (homeAvatar3dInstance) {
      homeAvatar3dInstance.unmount();
      homeAvatar3dInstance = null;
    }
    homeAvatar3dInstance = await mount3dAvatarViewer(container, {
      glbUrl: glbUrl || undefined,
      showControls: true
    });
  } else {
    if (homeAvatar3dInstance) {
      homeAvatar3dInstance.unmount();
      homeAvatar3dInstance = null;
    }
  }
}

// Initial mount check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => syncHome3dAvatar());
} else {
  syncHome3dAvatar();
}

window.addEventListener('kuizu:avatar_changed', (e: any) => {
  const newAvatar = e.detail?.avatarUrl || localStorage.getItem('kuizu_user_avatar');
  if (newAvatar) {
    const profileImg = document.querySelector<HTMLImageElement>('.profile-avatar-img, .home-user-avatar');
    if (profileImg) profileImg.src = newAvatar;
  }
  syncHome3dAvatar();
});

// Toast helper without emojis
let toastTimeout: number | undefined;
function showToast(message: string) {
  let toast = document.getElementById('kuizu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="font-weight: 500;">${message}</span>`;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 3200);
}


// "Start Quiz →" Action
const btnStartQuiz = document.getElementById('btn-start-quiz');
const btnArrowQuiz = document.getElementById('btn-arrow-quiz');

function launchQuiz() {
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.6 }
  });
  window.location.href = '/dailyquiz';
}

btnStartQuiz?.addEventListener('click', launchQuiz);
btnArrowQuiz?.addEventListener('click', launchQuiz);

// Dynamically load active Daily Quiz info on Home Card
async function loadDailyQuizCardInfo() {
  const subtitleEl = document.getElementById('daily-quiz-card-subtitle');
  const xpEl = document.getElementById('daily-quiz-card-xp');
  const streakEl = document.getElementById('daily-quiz-card-streak');

  try {
    const res = await fetch('/api/daily-quiz/today');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.dailyQuiz) {
        const dq = data.dailyQuiz;
        if (subtitleEl) {
          const qCount = dq.questionCount || 3;
          if (dq.isFallback) {
            subtitleEl.innerHTML = `<span style="color:#d97706; font-weight:600;">Previous Daily Quiz</span> • ${qCount} questions`;
          } else if (dq.isExpired) {
            subtitleEl.innerHTML = `<span>${dq.title}</span> • ${qCount} questions • <span style="color:#e11d48; font-weight:600;">Expired 12 PM</span>`;
          } else {
            subtitleEl.textContent = `${dq.title} • ${qCount} questions • Expires 12 PM IST`;
          }
        }
        if (xpEl) xpEl.textContent = `${dq.rewardXp || 15} XP`;
        if (streakEl) streakEl.textContent = `+${dq.streakBonus || 5} Streak`;
      }
    }
  } catch (err) {
    console.warn('Failed to load daily quiz info:', err);
  }
}
loadDailyQuizCardInfo();

// "View Activity →" Action
const btnViewClub = document.getElementById('btn-view-club');
const btnArrowClub = document.getElementById('btn-arrow-club');

function launchClub() {
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.6 }
  });
  window.location.href = '/problem/contest';
}

btnViewClub?.addEventListener('click', launchClub);
btnArrowClub?.addEventListener('click', launchClub);

// Streak & XP interaction
const pillStreak = document.getElementById('pill-streak');
pillStreak?.addEventListener('click', () => {
  confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 } });
  const streak = Number(localStorage.getItem('kuizu_user_streak')) || 1;
  showToast(`${streak} Days Streak. Practice every day to maintain consistency.`);
});

const pillXp = document.getElementById('pill-xp');
pillXp?.addEventListener('click', () => {
  confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 } });
  const xp = Number(localStorage.getItem('kuizu_user_xp')) || 0;
  showToast(`${xp.toLocaleString()} Total XP earned from real activities.`);
});

// Navigation tabs
['tab-problems', 'tab-quiz', 'tab-battle'].forEach((tabId) => {
  const tab = document.getElementById(tabId);
  tab?.addEventListener('click', () => {
    const tabName = tabId.replace('tab-', '').toUpperCase();
    showToast(`Navigating to ${tabName} Arena...`);
  });
});

