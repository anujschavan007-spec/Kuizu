import './adminProfileModal';
import { enforceAdminGuard } from './services/adminAuthGuard';

interface DailyQuizEntry {
  id: number;
  assignedDate: string;
  title: string;
  description: string;
  expiryTime: string;
  rewardXp: number;
  streakBonus: number;
  quizIds: number[];
  quizzes: { id: number; name: string; level_number?: number }[];
  questions?: any[];
  questionCount?: number;
  status: string;
  createdAt: string;
}

function showToast(message: string, duration = 3000) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Strict Admin Email Guard check
  const isAllowed = await enforceAdminGuard();
  if (!isAllowed) {
    return;
  }

  const container = document.getElementById('admin-dailykuizu-container');
  const searchInput = document.getElementById('admin-dailykuizu-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-dailykuizu-filter-toggle');
  const filterMenu = document.getElementById('admin-dailykuizu-filter-menu');

  let dailyQuizzes: DailyQuizEntry[] = [];
  let currentFilter = 'all';
  let searchQuery = '';

  function getTodayISTString(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateDisplay(dateStr: string): string {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  async function loadDailyQuizzes() {
    try {
      const res = await fetch('/api/daily-quizzes');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.dailyQuizzes)) {
          dailyQuizzes = data.dailyQuizzes;
          renderCards();
          return;
        }
      }
      renderCards();
    } catch (err) {
      console.warn('Failed to load daily quizzes:', err);
      renderCards();
    }
  }

  function renderCards() {
    if (!container) return;
    const todayStr = getTodayISTString();

    let filtered = dailyQuizzes.filter((dq) => {
      // Search filter
      const matchesSearch = 
        dq.title.toLowerCase().includes(searchQuery) ||
        dq.assignedDate.toLowerCase().includes(searchQuery) ||
        (dq.description && dq.description.toLowerCase().includes(searchQuery));
      if (!matchesSearch) return false;

      // Status filter
      const isToday = dq.assignedDate === todayStr;
      const isUpcoming = dq.assignedDate > todayStr;
      const isPrevious = dq.assignedDate < todayStr;

      if (currentFilter === 'active') return isToday;
      if (currentFilter === 'upcoming') return isUpcoming;
      if (currentFilter === 'previous') return isPrevious;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 64px 20px; color: #94a3b8; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 12px; color: #cbd5e1;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p style="font-size: 15px; font-weight: 600; color: #475569; margin: 0 0 6px 0;">No Daily Kuizu Found</p>
          <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0;">
            ${searchQuery || currentFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Click "Create Daily Kuizu" to schedule your first challenge.'}
          </p>
          <a href="/admin/daily-kuizu/createkuizu" class="admin-create-quiz-top-btn" style="text-decoration:none; display: inline-flex;">
            <span>Create Daily Kuizu</span>
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((dq) => {
      const isToday = dq.assignedDate === todayStr;
      const isUpcoming = dq.assignedDate > todayStr;

      let statusClass = 'completed';
      let statusLabel = 'Previous';
      if (isToday) {
        statusClass = 'active';
        statusLabel = 'Active';
      } else if (isUpcoming) {
        statusClass = 'upcoming';
        statusLabel = 'Upcoming';
      }

      const qCount = dq.questionCount || (dq.questions ? dq.questions.length : (dq.quizIds ? dq.quizIds.length : 0));

      return `
        <div class="admin-battle-card" style="position: relative; display: flex; align-items: center; justify-content: space-between; text-decoration: none; cursor: pointer;" onclick="window.location.href='/admin/daily-kuizu/createkuizu?date=${encodeURIComponent(dq.assignedDate)}'">
          <div class="admin-battle-card-left" style="flex: 1; min-width: 0;">
            <div class="admin-battle-icon-badge" style="background: #eff6ff; color: #2563eb;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="m9 16 2 2 4-4"></path>
              </svg>
            </div>
            <div class="admin-battle-details" style="min-width: 0;">
              <h3 class="admin-battle-card-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dq.title}</h3>
              <span class="admin-battle-card-code">
                ${formatDateDisplay(dq.assignedDate)} • ${qCount} Questions • ${dq.rewardXp || 15} XP • +${dq.streakBonus || 5} Streak
              </span>
            </div>
          </div>

          <div class="admin-battle-card-right" style="display: flex; align-items: center; gap: 14px; flex-shrink: 0;">
            <span class="admin-battle-status-badge ${statusClass}">
              <span class="status-dot"></span>${statusLabel}
            </span>

            <div class="admin-user-card-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  await loadDailyQuizzes();

  // Search input event
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderCards();
    });
  }

  // Filter toggle
  if (filterToggle && filterMenu) {
    filterToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!filterMenu.contains(e.target as Node) && e.target !== filterToggle) {
        filterMenu.classList.remove('show');
      }
    });

    const filterOpts = filterMenu.querySelectorAll<HTMLButtonElement>('.admin-filter-opt');
    filterOpts.forEach((opt) => {
      opt.addEventListener('click', () => {
        filterOpts.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        currentFilter = opt.getAttribute('data-filter') || 'all';
        filterMenu.classList.remove('show');
        renderCards();
      });
    });
  }
});
