import './adminProfileModal';

// Admin Contests Page Logic - Connected to Bun SQLite Backend

interface DbContest {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: string;
  problems: string[];
  registeredCount: number;
  createdAt: string;
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('admin-contest-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-contest-filter-toggle') as HTMLButtonElement | null;
  const filterMenu = document.getElementById('admin-contest-filter-menu');
  const contestsContainer = document.getElementById('admin-contests-container');

  let currentFilter = 'all';
  let searchQuery = '';
  let contestsList: DbContest[] = [];

  async function loadContests() {
    try {
      const res = await fetch('/api/contests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.contests)) {
          contestsList = data.contests;
          renderContests();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load contests from /api/contests:', err);
    }

    if (contestsContainer) {
      contestsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #94a3b8;">
          <p style="font-size: 16px; font-weight: 500;">No contests created yet</p>
          <a href="/admin/admincontest/createcontest" style="display: inline-block; margin-top: 12px; color: #4f46e5; font-weight: 600; text-decoration: none;">+ Create First Contest</a>
        </div>
      `;
    }
  }

  function formatContestDate(dateStr: string): string {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function formatContestTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderContests() {
    if (!contestsContainer) return;

    const filtered = contestsList.filter((c) => {
      const matchesSearch = !searchQuery ||
        c.title.toLowerCase().includes(searchQuery) ||
        c.type.toLowerCase().includes(searchQuery) ||
        c.problems.some(p => p.toLowerCase().includes(searchQuery));
      const matchesFilter = currentFilter === 'all' || c.status.toLowerCase() === currentFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      contestsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #94a3b8;">
          <p style="font-size: 16px; font-weight: 500;">No contests found</p>
          <a href="/admin/admincontest/createcontest" style="display: inline-block; margin-top: 12px; color: #4f46e5; font-weight: 600; text-decoration: none;">+ Create New Contest</a>
        </div>
      `;
      return;
    }

    contestsContainer.innerHTML = filtered.map((c) => {
      const statusLower = (c.status || 'upcoming').toLowerCase();
      const statusClass = statusLower === 'active' ? 'active' : (statusLower === 'upcoming' ? 'upcoming' : 'ended');
      const statusLabel = c.status || 'Upcoming';
      const formattedDate = formatContestDate(c.startDate);
      const timeStart = formatContestTime(c.startDate);
      const timeEnd = formatContestTime(c.endDate);
      const timeSpan = timeStart && timeEnd ? `(${timeStart} - ${timeEnd})` : (timeStart ? `(${timeStart})` : '');

      const problemsBadges = c.problems && c.problems.length > 0 
        ? c.problems.map(p => `<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: #EEF2FF; color: #4F46E5; font-size: 11.5px; font-weight: 600; margin-right: 4px; margin-top: 4px;">${escapeHtml(p)}</span>`).join('')
        : '<span style="color: #94a3b8; font-size: 12px;">No questions linked</span>';

      return `
        <a href="/problem/contest" class="admin-battle-card admin-contest-card" data-title="${escapeHtml(c.title)}" data-status="${statusLower}">
          <div class="admin-battle-card-left" style="flex: 1.4;">
            <div class="admin-battle-icon-badge admin-contest-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
              </svg>
            </div>
            <div class="admin-battle-details">
              <h3 class="admin-battle-name">${escapeHtml(c.title)}</h3>
              <div style="margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
                <span style="font-size: 11.5px; font-weight: 700; color: #64748B; text-transform: uppercase;">Questions (${c.problems.length}):</span>
                ${problemsBadges}
              </div>
            </div>
          </div>

          <div class="admin-battle-date-col">
            <svg class="admin-battle-col-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <div class="admin-battle-meta-text">
              <span class="admin-battle-meta-label">Date & Time</span>
              <span class="admin-battle-meta-val">${formattedDate}</span>
              <span class="admin-contest-meta-time">${timeSpan}</span>
            </div>
          </div>

          <div class="admin-battle-participants-col">
            <svg class="admin-battle-col-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <div class="admin-battle-meta-text">
              <span class="admin-battle-meta-label">Participants</span>
              <span class="admin-battle-meta-val">${c.registeredCount || 0}</span>
            </div>
          </div>

          <div class="admin-battle-status-col">
            <span class="admin-status-badge ${statusClass}">
              <span class="status-dot"></span>${statusLabel}
            </span>
          </div>

          <div class="admin-battle-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </a>
      `;
    }).join('');
  }

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderContests();
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

    filterMenu.querySelectorAll<HTMLButtonElement>('.admin-filter-opt').forEach((optBtn) => {
      optBtn.addEventListener('click', () => {
        filterMenu.querySelectorAll('.admin-filter-opt').forEach((b) => b.classList.remove('active'));
        optBtn.classList.add('active');
        currentFilter = optBtn.getAttribute('data-filter') || 'all';
        renderContests();
        filterMenu.classList.remove('show');
      });
    });
  }

  await loadContests();
});
