/**
 * KUIZU Main Leaderboard (Home Section) Logic
 * Dynamically fetches and renders 300+ real students from Supabase (/api/users)
 * Supports Descending/Ascending order filter, real-time instant XP updates via WebSockets & polling,
 * live search, and smooth pagination/view-all capacity for 300 students.
 */
import confetti from 'canvas-confetti';
import './services/adminAuthGuard';
import { supabase } from './services/supabaseApiBridge';

export interface LeaderboardUser {
  id: string;
  rank: string;
  name: string;
  email: string;
  student_id: string;
  avatar: string;
  xp: number;
  streak: number;
  quiz_level: number;
  problems_solved: number;
  present_classes: number;
}

// State
let allUsers: LeaderboardUser[] = [];
let prevXpMap = new Map<string, number>();
let sortField: 'xp' | 'streak' | 'quiz_level' | 'name' = 'xp';
let sortOrder: 'desc' | 'asc' = 'desc';
let searchQuery: string = '';
let currentPage: number = 1;
const PAGE_SIZE: number = 50;
let isViewAll: boolean = false;
let realtimeChannel: any = null;
let pollTimer: any = null;

// Clean notification toast without emojis
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
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name: string): string {
  const parts = (name || 'Learner').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || 'L').slice(0, 2).toUpperCase();
}

function renderAvatarHtml(name: string, avatarUrl: string, imgClass: string): string {
  if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
    return `<img src="${avatarUrl}" alt="${escapeHtml(name)}" class="${imgClass}" onerror="this.outerHTML='<div class=\\'user-cell-avatar\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;\\'>${getInitials(name)}</div>';" />`;
  }
  return `<div class="user-cell-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;">${getInitials(name)}</div>`;
}

/**
 * Fetch latest users from Supabase API
 */
async function loadLeaderboardData(isSilent: boolean = false): Promise<void> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const rawUsers: any[] = data.users || [];

    // Map into LeaderboardUser objects
    const mapped: LeaderboardUser[] = rawUsers.map((u, index) => ({
      id: u.id,
      rank: `#${index + 1}`,
      name: u.name || 'Student',
      email: u.email || '',
      student_id: u.student_id || `STU${String(index + 1).padStart(3, '0')}`,
      avatar: u.avatar || '',
      xp: Number(u.xp) || 0,
      streak: Number(u.streak) || 0,
      quiz_level: Number(u.quiz_level) || 1,
      problems_solved: Number(u.problems_solved) || 0,
      present_classes: Number(u.present_classes) || 0
    }));

    // Detect if XP changed for any user and record flash animation
    const flashMap = new Map<string, 'up' | 'down'>();
    if (prevXpMap.size > 0) {
      for (const u of mapped) {
        const oldXp = prevXpMap.get(u.id);
        if (oldXp !== undefined && oldXp !== u.xp) {
          flashMap.set(u.id, u.xp > oldXp ? 'up' : 'down');
        }
      }
    }

    // Update prevXpMap
    prevXpMap.clear();
    for (const u of mapped) {
      prevXpMap.set(u.id, u.xp);
    }

    allUsers = mapped;

    // Update capacity live indicator
    const capacityText = document.getElementById('capacity-counter-text');
    if (capacityText) {
      capacityText.textContent = `${allUsers.length} Students Live`;
    }

    // Always sort podium by standard XP descending
    renderPodium();

    // Render table with active sort & pagination
    renderTable(flashMap);
  } catch (err) {
    if (!isSilent) {
      console.warn('Could not load real users for leaderboard:', err);
    }
  }
}

/**
 * Filter and sort users list based on current settings
 */
function getFilteredAndSortedUsers(): LeaderboardUser[] {
  let list = [...allUsers];

  // 1. Search Query Filter
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((u) => {
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.student_id.toLowerCase().includes(q) ||
        u.rank.toLowerCase().includes(q)
      );
    });
  }

  // 2. Sorting
  list.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'xp') {
      comparison = b.xp - a.xp;
    } else if (sortField === 'streak') {
      comparison = b.streak - a.streak;
    } else if (sortField === 'quiz_level') {
      comparison = b.quiz_level - a.quiz_level;
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    }

    // Tie-breaker
    if (comparison === 0 && sortField !== 'xp') {
      comparison = b.xp - a.xp;
    }

    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return list;
}

/**
 * Render Top 3 Podium Cards (Rank 1 Gold, Rank 2 Silver, Rank 3 Bronze)
 */
function renderPodium(): void {
  // Always sorted by XP descending for podium winners
  const topThree = [...allUsers].sort((a, b) => b.xp - a.xp);

  // Rank 1 (Gold, Center)
  const u1 = topThree[0];
  const podiumCard1 = document.getElementById('podium-card-rank-1');
  if (podiumCard1 && u1) {
    const avatarWrap = podiumCard1.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u1.name, u1.avatar, 'podium-avatar-img');
    }
    const nameEl = podiumCard1.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u1.name;
    const rankPill = podiumCard1.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = '#01';
    const xpSpan = podiumCard1.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u1.xp.toLocaleString()} XP`;

    podiumCard1.onclick = () => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.3 } });
      showToast(`Rank #1: ${u1.name} with ${u1.xp.toLocaleString()} XP`);
    };
  }

  // Rank 2 (Silver, Left)
  const u2 = topThree[1];
  const podiumCard2 = document.getElementById('podium-card-rank-2');
  if (podiumCard2 && u2) {
    const avatarWrap = podiumCard2.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u2.name, u2.avatar, 'podium-avatar-img');
    }
    const nameEl = podiumCard2.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u2.name;
    const rankPill = podiumCard2.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = '#02';
    const xpSpan = podiumCard2.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u2.xp.toLocaleString()} XP`;

    podiumCard2.onclick = () => {
      showToast(`Rank #2: ${u2.name} with ${u2.xp.toLocaleString()} XP`);
    };
  }

  // Rank 3 (Bronze, Right)
  const u3 = topThree[2];
  const podiumCard3 = document.getElementById('podium-card-rank-3');
  if (podiumCard3 && u3) {
    const avatarWrap = podiumCard3.querySelector('.podium-avatar-wrap');
    if (avatarWrap) {
      avatarWrap.innerHTML = renderAvatarHtml(u3.name, u3.avatar, 'podium-avatar-img');
    }
    const nameEl = podiumCard3.querySelector('.podium-user-name');
    if (nameEl) nameEl.textContent = u3.name;
    const rankPill = podiumCard3.querySelector('.podium-rank-pill');
    if (rankPill) rankPill.textContent = '#03';
    const xpSpan = podiumCard3.querySelector('.podium-xp-score span');
    if (xpSpan) xpSpan.textContent = `${u3.xp.toLocaleString()} XP`;

    podiumCard3.onclick = () => {
      showToast(`Rank #3: ${u3.name} with ${u3.xp.toLocaleString()} XP`);
    };
  }
}

/**
 * Render the 300-student Leaderboard Table
 */
function renderTable(flashMap?: Map<string, 'up' | 'down'>): void {
  const tbody = document.getElementById('main-leaderboard-tbody') || document.querySelector('.main-leaderboard-tbody');
  if (!tbody) return;

  const filtered = getFilteredAndSortedUsers();
  const totalCount = filtered.length;

  if (totalCount === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 36px; color: #94A3B8; font-weight: 600;">No students match your search</td></tr>`;
    updatePaginationUI(0, 0, 0);
    return;
  }

  // Calculate slice
  let displayList: LeaderboardUser[] = [];
  let startIndex = 0;
  let endIndex = totalCount;

  if (isViewAll) {
    displayList = filtered;
    startIndex = 0;
    endIndex = totalCount;
  } else {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    startIndex = (currentPage - 1) * PAGE_SIZE;
    endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
    displayList = filtered.slice(startIndex, endIndex);
  }

  updatePaginationUI(startIndex + 1, endIndex, totalCount);

  // Generate HTML
  tbody.innerHTML = displayList.map((user, idx) => {
    const absRank = startIndex + idx + 1;
    const isTop1 = absRank === 1 && sortOrder === 'desc' && sortField === 'xp';
    const isTop2 = absRank === 2 && sortOrder === 'desc' && sortField === 'xp';
    const isTop3 = absRank === 3 && sortOrder === 'desc' && sortField === 'xp';

    let rowClass = 'main-leaderboard-row';
    if (isTop1) rowClass += ' row-rank-1';
    else if (isTop2) rowClass += ' row-rank-2';
    else if (isTop3) rowClass += ' row-rank-3';

    // Flash animation if XP changed live
    if (flashMap && flashMap.has(user.id)) {
      const dir = flashMap.get(user.id);
      rowClass += dir === 'up' ? ' row-xp-flash-up' : ' row-xp-flash-down';
    }

    const avatarHtml = renderAvatarHtml(user.name, user.avatar, 'user-cell-avatar');

    // Level pill color
    let levelPillClass = 'pill-blue';
    if (user.quiz_level >= 4) levelPillClass = 'pill-purple';
    else if (user.quiz_level === 3) levelPillClass = 'pill-green';
    else if (user.quiz_level === 2) levelPillClass = 'pill-indigo';

    return `
      <tr class="${rowClass}" data-user-id="${user.id}" tabindex="0">
        <!-- Rank Column -->
        <td class="col-pos">
          ${isTop1 || isTop2 || isTop3 ? `
            <div class="pos-badge-wrap">
              <div class="pos-crown-box crown-box-${isTop1 ? '1' : isTop2 ? '2' : '3'}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V17H19V19Z"/>
                </svg>
              </div>
              <span class="pos-number">${absRank}</span>
            </div>
          ` : `
            <span class="pos-standard-number">${absRank}</span>
          `}
        </td>

        <!-- Learner Column -->
        <td class="col-user">
          <div class="user-cell-group">
            ${avatarHtml}
            <div>
              <span class="user-name-text" style="display: block;">${escapeHtml(user.name)}</span>
              <span style="font-size: 11.5px; color: #64748B;">${escapeHtml(user.email.split('@')[0])}</span>
            </div>
          </div>
        </td>

        <!-- Student ID -->
        <td class="col-rank-tag">
          <span class="rank-tag-text">${escapeHtml(user.student_id)}</span>
        </td>

        <!-- XP Column -->
        <td class="col-xp">
          <div class="xp-cell-group">
            <svg class="cell-star-icon star-gold" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span class="xp-val-text">${user.xp.toLocaleString()}</span>
          </div>
        </td>

        <!-- Streak Days -->
        <td class="col-streak">
          <div class="streak-cell-group">
            <span class="flame-icon">🔥</span>
            <span class="streak-val-text">${user.streak} days</span>
          </div>
        </td>

        <!-- Level -->
        <td class="col-level" style="text-align: right;">
          <span class="level-pill-badge ${levelPillClass}">Lv. ${user.quiz_level}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Row Click Handlers
  tbody.querySelectorAll<HTMLTableRowElement>('.main-leaderboard-row').forEach((row) => {
    row.addEventListener('click', () => {
      const uid = row.getAttribute('data-user-id');
      const u = allUsers.find(item => item.id === uid);
      if (u) {
        showToast(`${u.name} (${u.student_id}): ${u.xp.toLocaleString()} XP • ${u.streak}d streak • Level ${u.quiz_level}`);
      }
    });
  });
}

/**
 * Update pagination UI text and buttons
 */
function updatePaginationUI(start: number, end: number, total: number): void {
  const infoEl = document.getElementById('leaderboard-pagination-info');
  const btnPrev = document.getElementById('btn-page-prev') as HTMLButtonElement | null;
  const btnNext = document.getElementById('btn-page-next') as HTMLButtonElement | null;
  const pageBadge = document.getElementById('pagination-pages-badge');
  const btnViewAll = document.getElementById('btn-toggle-view-all');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (infoEl) {
    if (total === 0) {
      infoEl.textContent = 'Showing 0 Students';
    } else if (isViewAll) {
      infoEl.textContent = `Showing all ${total} Students`;
    } else {
      infoEl.textContent = `Showing ${start} - ${end} of ${total} Students`;
    }
  }

  if (pageBadge) {
    pageBadge.textContent = isViewAll ? `All ${total} Students` : `Page ${currentPage} / ${totalPages}`;
  }

  if (btnPrev) {
    btnPrev.disabled = isViewAll || currentPage <= 1;
  }

  if (btnNext) {
    btnNext.disabled = isViewAll || currentPage >= totalPages;
  }

  if (btnViewAll) {
    btnViewAll.textContent = isViewAll ? 'Paginated View' : `View All (${total})`;
  }
}

/**
 * Setup Supabase Realtime channel for instant live updates
 */
function initRealtimeUpdates(): void {
  try {
    realtimeChannel = supabase
      .channel('public:users:leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload: any) => {
          console.log('[Live Leaderboard] Realtime update event:', payload.eventType);
          // Reload fresh data immediately
          loadLeaderboardData(true);
        }
      )
      .subscribe((status: string) => {
        console.log('[Live Leaderboard] Realtime subscription status:', status);
      });
  } catch (err) {
    console.warn('[Live Leaderboard] Could not initialize realtime channel:', err);
  }

  // Active polling fallback every 3.5s to ensure live updates even behind proxies/firewalls
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    loadLeaderboardData(true);
  }, 3500);

  // Listen for local XP changes or window regain focus
  window.addEventListener('focus', () => loadLeaderboardData(true));
  window.addEventListener('storage', (e) => {
    if (e.key?.includes('xp') || e.key?.includes('user')) {
      loadLeaderboardData(true);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Load & Realtime Sync
  loadLeaderboardData();
  initRealtimeUpdates();

  // 2. Back button
  const btnBack = document.getElementById('btn-leaderboard-back');
  btnBack?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/home';
    }
  });

  // 3. Search Filter across 300 students
  const searchInput = document.getElementById('leaderboard-search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      currentPage = 1;
      renderTable();
    });
  }

  // 4. Sort Order Filter Dropdown
  const btnSortToggle = document.getElementById('btn-sort-order-toggle');
  const sortFilterMenu = document.getElementById('sort-filter-menu');
  const sortOrderLabel = document.getElementById('sort-order-label');

  if (btnSortToggle && sortFilterMenu) {
    btnSortToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sortFilterMenu.classList.contains('show');
      sortFilterMenu.classList.toggle('show', !isOpen);
      btnSortToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!sortFilterMenu.contains(e.target as Node) && !btnSortToggle.contains(e.target as Node)) {
        sortFilterMenu.classList.remove('show');
        btnSortToggle.setAttribute('aria-expanded', 'false');
      }
    });

    const sortOptions = sortFilterMenu.querySelectorAll<HTMLButtonElement>('.sort-option-item');
    sortOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const order = (opt.getAttribute('data-order') || 'desc') as 'desc' | 'asc';
        const field = (opt.getAttribute('data-field') || 'xp') as any;

        sortOrder = order;
        sortField = field;

        // Update active class
        sortOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        // Update trigger label
        if (sortOrderLabel) {
          sortOrderLabel.textContent = opt.textContent?.trim() || 'Sort';
        }

        btnSortToggle.classList.toggle('active-desc', sortOrder === 'desc');
        sortFilterMenu.classList.remove('show');
        btnSortToggle.setAttribute('aria-expanded', 'false');

        currentPage = 1;
        renderTable();
        showToast(`Leaderboard sorted: ${sortField.toUpperCase()} (${sortOrder === 'desc' ? 'Descending' : 'Ascending'})`);
      });
    });
  }

  // 5. Pagination Controls for 300 Students
  const btnPrev = document.getElementById('btn-page-prev');
  const btnNext = document.getElementById('btn-page-next');
  const btnToggleViewAll = document.getElementById('btn-toggle-view-all');

  btnPrev?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      document.querySelector('.main-leaderboard-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  btnNext?.addEventListener('click', () => {
    const totalCount = getFilteredAndSortedUsers().length;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      document.querySelector('.main-leaderboard-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  btnToggleViewAll?.addEventListener('click', () => {
    isViewAll = !isViewAll;
    renderTable();
    showToast(isViewAll ? 'Displaying all 300 students in single scroll' : 'Switched to page-by-page view');
  });

  // 6. User Profile Dropdown
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
  }

  // Header Dropdown Navigation Links
  document.querySelector('.popup-user-header')?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
    window.location.href = '/settings';
  });

  document.getElementById('btn-menu-theme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-theme') || document.documentElement.classList.contains('dark-mode');
    showToast(isDark ? 'Dark theme enabled' : 'Light theme enabled');
  });

  // 7. Time Filter Options (Today / This Week / This Month / All Time)
  const btnTimeFilter = document.getElementById('btn-time-filter');
  const timeFilterMenu = document.getElementById('time-filter-menu');
  const filterSelectedLabel = document.getElementById('filter-selected-label');

  if (btnTimeFilter && timeFilterMenu) {
    btnTimeFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = timeFilterMenu.classList.contains('show');
      timeFilterMenu.classList.toggle('show', !isOpen);
      btnTimeFilter.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!timeFilterMenu.contains(e.target as Node) && !btnTimeFilter.contains(e.target as Node)) {
        timeFilterMenu.classList.remove('show');
        btnTimeFilter.setAttribute('aria-expanded', 'false');
      }
    });

    const timeOptions = timeFilterMenu.querySelectorAll<HTMLButtonElement>('.time-filter-option');
    timeOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const val = opt.getAttribute('data-value') || 'All Time';
        if (filterSelectedLabel) filterSelectedLabel.textContent = val;
        timeFilterMenu.classList.remove('show');
        btnTimeFilter.setAttribute('aria-expanded', 'false');
        showToast(`Filtered: ${val}`);
      });
    });
  }
});
