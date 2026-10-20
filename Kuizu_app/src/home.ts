import confetti from 'canvas-confetti';

import { initClerkUserSync, signOutClerk } from './services/clerkService';
import './services/adminAuthGuard';

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

let currentUserXp = 0;
let currentUserStreak = 0;

// Set dynamic user greeting & real XP from API
async function syncHomeUserData() {
  const storedName = localStorage.getItem('kuizu_user_name');
  const storedEmail = localStorage.getItem('kuizu_user_email');
  const greetingEl = document.getElementById('home-greeting');
  const menuUserName = document.getElementById('menu-user-name');
  const pillXpEl = document.getElementById('pill-xp');
  const pillStreakEl = document.getElementById('pill-streak');
  const menuUserXpEl = document.getElementById('menu-user-xp');

  if (storedName) {
    if (greetingEl) greetingEl.textContent = `Hi, ${storedName}`;
    if (menuUserName) menuUserName.textContent = storedName;
  } else {
    if (greetingEl) greetingEl.textContent = 'Hi, Anuj';
    if (menuUserName) menuUserName.textContent = 'Anuj Chavan';
  }

  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      const users: any[] = data.users || [];
      const matched = users.find((u: any) =>
        (storedEmail && u.email && u.email.toLowerCase() === storedEmail.toLowerCase()) ||
        (storedName && u.name && u.name.toLowerCase() === storedName.toLowerCase())
      ) || users[0];

      if (matched) {
        currentUserXp = Number(matched.xp) || 0;
        currentUserStreak = Math.max(0, Number(matched.streak) || 0);

        const streakValEl = document.getElementById('pill-streak-val') || pillStreakEl?.querySelector('.metric-val');
        if (streakValEl) {
          streakValEl.textContent = `${currentUserStreak} Days`;
        }
        const xpValEl = document.getElementById('pill-xp-val') || pillXpEl?.querySelector('.metric-val');
        if (xpValEl) {
          xpValEl.textContent = `${currentUserXp.toLocaleString()} XP`;
        }
        if (menuUserXpEl) {
          menuUserXpEl.textContent = `${currentUserXp.toLocaleString()} XP`;
        }
      }
    }
  } catch (err) {
    console.warn('Could not sync user XP on home page:', err);
  }
}

syncHomeUserData();
initClerkUserSync().then(() => {
  syncHomeUserData();
});

// User Profile Avatar Dropdown Menu
const btnAvatar = document.getElementById('btn-user-avatar');
const userDropdown = document.getElementById('user-dropdown');

if (btnAvatar && userDropdown) {
  btnAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userDropdown.classList.contains('show');
    userDropdown.classList.toggle('show', !isOpen);
    btnAvatar.classList.toggle('open', !isOpen);
    btnAvatar.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target as Node) && e.target !== btnAvatar) {
      userDropdown.classList.remove('show');
      btnAvatar.classList.remove('open');
      btnAvatar.setAttribute('aria-expanded', 'false');
    }
  });

  if (window.location.hash === '#open-popup') {
    userDropdown.classList.add('show');
    btnAvatar.classList.add('open');
  }
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
  showToast(`${currentUserStreak} Days Streak. Practice every day to maintain consistency.`);
});

const pillXp = document.getElementById('pill-xp');
pillXp?.addEventListener('click', () => {
  confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 } });
  showToast(`${currentUserXp.toLocaleString()} Total XP earned from real activities.`);
});

// Navigation tabs
['tab-problems', 'tab-quiz', 'tab-battle'].forEach((tabId) => {
  const tab = document.getElementById(tabId);
  tab?.addEventListener('click', () => {
    const tabName = tabId.replace('tab-', '').toUpperCase();
    showToast(`Navigating to ${tabName} Arena...`);
  });
});

// Profile Popup Menu actions
const popupUserHeader = document.querySelector('.popup-user-header');
popupUserHeader?.addEventListener('click', () => {
  window.location.href = '/profile';
});

const btnLeaderboard = document.getElementById('btn-menu-leaderboard');
btnLeaderboard?.addEventListener('click', (e) => {
  e.stopPropagation();
  window.location.href = '/problem/mainleaderboard';
});

const btnTheme = document.getElementById('btn-menu-theme');
btnTheme?.addEventListener('click', (e) => {
  e.stopPropagation();
  showToast("Theme Switcher: Light / Pastel Sky Active");
  userDropdown?.classList.remove('show');
  btnAvatar?.classList.remove('open');
});

const btnSettings = document.getElementById('btn-menu-settings');
btnSettings?.addEventListener('click', () => {
  window.location.href = '/settings';
});

const btnLogout = document.getElementById('btn-logout');
btnLogout?.addEventListener('click', (e) => {
  e.preventDefault();
  signOutClerk();
});

