/**
 * KUIZU Main Leaderboard (Home Section) Logic
 * Dynamically fetches and renders real users from /api/users with strictly calculated XP and verified rankings.
 */
import confetti from 'canvas-confetti';
import './services/adminAuthGuard';

interface LeaderboardUser {
  id: string;
  rank: string;
  name: string;
  email: string;
  avatar: string;
  xp: number;
  streak: number;
  quiz_level?: number;
  problems_solved?: number;
  present_classes?: number;
}

let usersList: LeaderboardUser[] = [];

// Toast notification helper without emojis
function showToast(message: string): void {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'settings-toast';
  toast.innerHTML = `<span class="toast-text">${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name: string): string {
  const parts = (name || 'Learner').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || 'L').slice(0, 2).toUpperCase();
}

function renderAvatarHtml(name: string, avatarUrl: string, imgClass: string, fallbackClass: string): string {
  if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
    return `<img src="${avatarUrl}" alt="${escapeHtml(name)}" class="${imgClass}" onerror="this.outerHTML='<div class=\\'avatar-initials-fallback ${fallbackClass}\\'>${getInitials(name)}</div>';" />`;
  }
  return `<div class="avatar-initials-fallback ${fallbackClass}">${getInitials(name)}</div>`;
}

async function loadLeaderboardData(): Promise<void> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const rawUsers: any[] = data.users || [];

    // Strictly sort by XP descending, then problems solved, then present classes, then name
    rawUsers.sort((a, b) => {
      const xpA = Number(a.xp) || 0;
      const xpB = Number(b.xp) || 0;
      if (xpB !== xpA) return xpB - xpA;

      const probA = Number(a.problems_solved) || 0;
      const probB = Number(b.problems_solved) || 0;
      if (probB !== probA) return probB - probA;

      const attA = Number(a.present_classes) || 0;
      const attB = Number(b.present_classes) || 0;
      if (attB !== attA) return attB - attA;

      return (a.name || '').localeCompare(b.name || '');
    });

    usersList = rawUsers.map((u, index) => ({
      id: u.id,
      rank: `#${index + 1}`,
      name: u.name || 'Student',
      email: u.email || '',
      avatar: u.avatar || '',
      xp: Number(u.xp) || 0,
      streak: Number(u.streak) || 0,
      quiz_level: Number(u.quiz_level) || 1,
      problems_solved: Number(u.problems_solved) || 0,
      present_classes: Number(u.present_classes) || 0
    }));

    renderPodium();
    renderTable();
  } catch (err) {
    console.warn('Could not load real users for leaderboard:', err);
  }
}

function renderPodium(): void {
  // Rank 1 (Gold, Center)
  const u1 = usersList[0];
  const podiumCard1 = document.getElementById('podium-card-rank-1');
  if (podiumCard1 && u1) {
    const avatarWrap = podiumCard1.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u1.name, u1.avatar, 'podium-avatar-img', 'size-lg');
    }
    const nameEl = podiumCard1.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u1.name;
    const rankPill = podiumCard1.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = u1.rank;
    const xpSpan = podiumCard1.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u1.xp.toLocaleString()} XP`;

    podiumCard1.onclick = () => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.3 } });
      showToast(`Rank #1: ${u1.name} with ${u1.xp.toLocaleString()} XP`);
    };
  }

  // Rank 2 (Silver, Left)
  const u2 = usersList[1];
  const podiumCard2 = document.getElementById('podium-card-rank-2');
  if (podiumCard2 && u2) {
    const avatarWrap = podiumCard2.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u2.name, u2.avatar, 'podium-avatar-img', 'size-lg');
    }
    const nameEl = podiumCard2.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u2.name;
    const rankPill = podiumCard2.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = u2.rank;
    const xpSpan = podiumCard2.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u2.xp.toLocaleString()} XP`;

    podiumCard2.onclick = () => {
      showToast(`Rank #2: ${u2.name} with ${u2.xp.toLocaleString()} XP`);
    };
  }

  // Rank 3 (Bronze, Right)
  const u3 = usersList[2];
  const podiumCard3 = document.getElementById('podium-card-rank-3');
  if (podiumCard3 && u3) {
    const avatarWrap = podiumCard3.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u3.name, u3.avatar, 'podium-avatar-img', 'size-lg');
    }
    const nameEl = podiumCard3.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u3.name;
    const rankPill = podiumCard3.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = u3.rank;
    const xpSpan = podiumCard3.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u3.xp.toLocaleString()} XP`;

    podiumCard3.onclick = () => {
      showToast(`Rank #3: ${u3.name} with ${u3.xp.toLocaleString()} XP`);
    };
  }
}

function renderTable(): void {
  const tbody = document.querySelector('.main-leaderboard-tbody');
  if (!tbody) return;

  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No learners found</td></tr>`;
    return;
  }

  tbody.innerHTML = usersList.map((user, index) => {
    const isTop1 = index === 0;
    const isTop2 = index === 1;
    const isTop3 = index === 2;

    let rankBadgeClass = 'table-rank-normal';
    if (isTop1) rankBadgeClass = 'table-rank-1';
    else if (isTop2) rankBadgeClass = 'table-rank-2';
    else if (isTop3) rankBadgeClass = 'table-rank-3';

    const avatarHtml = renderAvatarHtml(user.name, user.avatar, 'table-user-avatar', 'size-sm');

    return `
      <tr class="main-leaderboard-row ${isTop1 ? 'row-first-place' : ''}" data-user-id="${user.id}">
        <!-- Rank Column -->
        <td class="col-rank">
          <div class="table-rank-badge ${rankBadgeClass}">${index + 1}</div>
        </td>

        <!-- Learner Column -->
        <td class="col-user">
          <div class="table-user-cell">
            ${avatarHtml}
            <div class="table-user-meta">
              <span class="user-name-text">${escapeHtml(user.name)}</span>
              <span class="user-sub-id">${escapeHtml(user.email ? user.email.split('@')[0] : user.rank)}</span>
            </div>
          </div>
        </td>

        <!-- Streak Days -->
        <td class="col-streak">
          <div class="streak-pill-cell">
            <span class="streak-val-text">${user.streak}d</span>
          </div>
        </td>

        <!-- Level -->
        <td class="col-level">
          <span class="level-pill-badge">Level ${user.quiz_level || 1}</span>
        </td>

        <!-- XP Column -->
        <td class="col-xp">
          <div class="xp-val-cell">
            <span class="xp-val-text">${user.xp.toLocaleString()}</span>
            <span class="xp-unit-text">XP</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row Click Handlers
  const tableRows = tbody.querySelectorAll<HTMLTableRowElement>('.main-leaderboard-row');
  tableRows.forEach((row) => {
    row.addEventListener('click', () => {
      const name = row.querySelector('.user-name-text')?.textContent?.trim() || 'Learner';
      const xp = row.querySelector('.xp-val-text')?.textContent?.trim() || '0';
      showToast(`${name}: ${xp} XP`);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Load real data from backend
  loadLeaderboardData();

  // Back button
  const btnBack = document.getElementById('btn-leaderboard-back');
  btnBack?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/home';
    }
  });

  // User Profile Dropdown
  const btnUserAvatar = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  if (btnUserAvatar && userDropdown) {
    btnUserAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.contains('show');
      userDropdown.classList.toggle('show', !isOpen);
      btnUserAvatar.classList.toggle('open', !isOpen);
      btnUserAvatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !btnUserAvatar.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        btnUserAvatar.classList.remove('open');
        btnUserAvatar.setAttribute('aria-expanded', 'false');
      }
    });

    if (window.location.hash === '#open-popup') {
      userDropdown.classList.add('show');
      btnUserAvatar.classList.add('open');
      btnUserAvatar.setAttribute('aria-expanded', 'true');
    }
  }

  // Profile Popup Header Click -> Redirects to /profile
  document.querySelector('.popup-user-header')?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  // Settings click
  document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
    window.location.href = '/settings';
  });

  // Theme toggle
  document.getElementById('btn-menu-theme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    showToast(isDark ? 'Dark theme enabled' : 'Light theme enabled');
  });

  // Filter Dropdown
  const btnFilter = document.getElementById('btn-time-filter');
  const filterMenu = document.getElementById('time-filter-menu');
  const filterLabel = document.getElementById('filter-selected-label');

  if (btnFilter && filterMenu) {
    btnFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filterMenu.classList.contains('show');
      filterMenu.classList.toggle('show', !isOpen);
      btnFilter.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!filterMenu.contains(e.target as Node) && !btnFilter.contains(e.target as Node)) {
        filterMenu.classList.remove('show');
        btnFilter.setAttribute('aria-expanded', 'false');
      }
    });

    const filterOptions = document.querySelectorAll<HTMLButtonElement>('.time-filter-option');
    filterOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value') || 'All Time';
        if (filterLabel) filterLabel.textContent = value;
        filterMenu.classList.remove('show');
        btnFilter.setAttribute('aria-expanded', 'false');
        showToast(`Filtered leaderboard: ${value}`);
      });
    });
  }
});
