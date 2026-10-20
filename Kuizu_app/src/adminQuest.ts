import './adminProfileModal';

// Admin Quests & Events Page Logic - Connected to Bun SQLite Backend

interface DbQuest {
  id: string;
  title: string;
  description: string;
  stepNumber?: number;
  status?: string;
  rewardXp?: number;
  problems?: string[];
  createdAt?: string;
}

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

interface UnifiedEvent {
  id: string;
  kind: 'quest' | 'contest';
  title: string;
  description: string;
  dateStr: string;
  timeStr: string;
  status: string;
  problems: string[];
  linkUrl: string;
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
  const searchInput = document.getElementById('admin-quest-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-quest-filter-toggle') as HTMLButtonElement | null;
  const filterMenu = document.getElementById('admin-quest-filter-menu');
  const questsContainer = document.getElementById('admin-quests-container');

  let currentFilter = 'all';
  let searchQuery = '';
  let eventsList: UnifiedEvent[] = [];

  function formatEventDate(dateStr?: string): string {
    if (!dateStr) return 'Active Now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function formatEventTime(dateStr?: string): string {
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

  async function loadAllEvents() {
    eventsList = [];

    // 1. Fetch Quests
    try {
      const res = await fetch('/api/quests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.quests)) {
          data.quests.forEach((q: DbQuest) => {
            eventsList.push({
              id: q.id,
              kind: 'quest',
              title: q.title,
              description: q.description || `Quest Step #${q.stepNumber || 1} • Learning Challenge`,
              dateStr: formatEventDate(q.createdAt),
              timeStr: '(Open Quest Path)',
              status: q.status || 'Active',
              problems: q.problems || [],
              linkUrl: `/problem/quest`
            });
          });
        }
      }
    } catch (err) {
      console.warn('Could not load quests:', err);
    }

    // 2. Fetch Contests (show as real competitive events in Quest admin too)
    try {
      const res = await fetch('/api/contests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.contests)) {
          data.contests.forEach((c: DbContest) => {
            const timeStart = formatEventTime(c.startDate);
            const timeEnd = formatEventTime(c.endDate);
            const timeSpan = timeStart && timeEnd ? `(${timeStart} - ${timeEnd})` : (timeStart ? `(${timeStart})` : '');

            eventsList.push({
              id: c.id,
              kind: 'contest',
              title: c.title,
              description: `Contest (${c.type}) • ${c.duration || 60} mins`,
              dateStr: formatEventDate(c.startDate),
              timeStr: timeSpan,
              status: c.status || 'Upcoming',
              problems: c.problems || [],
              linkUrl: `/problem/contest`
            });
          });
        }
      }
    } catch (err) {
      console.warn('Could not load contests:', err);
    }

    renderEvents();
  }

  function renderEvents() {
    if (!questsContainer) return;

    const filtered = eventsList.filter((ev) => {
      const matchesSearch = !searchQuery ||
        ev.title.toLowerCase().includes(searchQuery) ||
        ev.description.toLowerCase().includes(searchQuery) ||
        ev.problems.some(p => p.toLowerCase().includes(searchQuery));
      const evStatusLower = ev.status.toLowerCase();
      const matchesFilter = currentFilter === 'all' || evStatusLower === currentFilter.toLowerCase() ||
        (currentFilter === 'active' && (evStatusLower === 'available' || evStatusLower === 'active' || evStatusLower === 'ongoing'));
      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      questsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #94a3b8; background: #fff; border-radius: 16px; border: 1.5px dashed #e2e8f0;">
          <p style="font-size: 16px; font-weight: 600; color: #475569;">No active quests or contests found</p>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Create your first quest or contest to see it displayed here</p>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
            <a href="/admin/adminquest/createquest" class="admin-save-quiz-top-btn" style="padding: 8px 18px; text-decoration: none; font-size: 13px; border-radius: 8px;">+ Create Quest</a>
            <a href="/admin/admincontest/createcontest" class="admin-btn-outline" style="padding: 8px 18px; text-decoration: none; font-size: 13px; border-radius: 8px;">+ Create Contest</a>
          </div>
        </div>
      `;
      return;
    }

    questsContainer.innerHTML = filtered.map((ev) => {
      let statusLower = ev.status.toLowerCase();
      if (statusLower === 'available') statusLower = 'active';
      const statusClass = statusLower === 'active' || statusLower === 'ongoing' ? 'active' : (statusLower === 'upcoming' ? 'upcoming' : 'ended');
      const statusLabel = ev.status === 'available' ? 'Active' : ev.status;

      const problemsBadges = ev.problems && ev.problems.length > 0
        ? ev.problems.map(p => `
            <a href="/problem/qlibrary/compiler?id=${encodeURIComponent(p)}" title="Click to solve problem" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: #EEF2FF; color: #4F46E5; font-size: 11.5px; font-weight: 600; margin-right: 4px; margin-top: 4px; text-decoration: none; transition: background 0.15s ease;">
              <span>${escapeHtml(p)}</span>
              <span style="font-size: 10px; opacity: 0.7;">↗</span>
            </a>
          `).join('')
        : '<span style="color: #94a3b8; font-size: 12px;">No problems added</span>';

      return `
        <div class="admin-battle-card admin-quest-card" data-id="${ev.id}" data-kind="${ev.kind}" data-title="${escapeHtml(ev.title)}" data-status="${statusLower}" style="position: relative;">
          <div class="admin-battle-card-left" style="flex: 1.4;">
            <div class="admin-battle-icon-badge ${ev.kind === 'contest' ? 'admin-contest-icon-badge' : 'admin-quest-icon-badge'}">
              ${ev.kind === 'contest' ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                </svg>
              `}
            </div>
            <div class="admin-battle-details">
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 class="admin-battle-name" style="margin: 0;">${escapeHtml(ev.title)}</h3>
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${ev.kind === 'contest' ? '#fdf2f8; color: #db2777' : '#ecfdf5; color: #059669'};">
                  ${ev.kind}
                </span>
              </div>
              <span class="admin-battle-sub">${escapeHtml(ev.description)}</span>
              <div style="margin-top: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Questions (${ev.problems.length}):</span>
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
              <span class="admin-battle-meta-label">Schedule</span>
              <span class="admin-battle-meta-val">${ev.dateStr}</span>
              ${ev.timeStr ? `<span class="admin-contest-meta-time">${ev.timeStr}</span>` : ''}
            </div>
          </div>

          <div class="admin-battle-status-col">
            <span class="admin-status-badge ${statusClass}">
              <span class="status-dot"></span>${statusLabel}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <a href="${ev.linkUrl}" class="admin-btn-outline" style="padding: 6px 12px; font-size: 12px; text-decoration: none;" title="View on user portal">
              View
            </a>
            <button type="button" class="btn-delete-event" data-id="${ev.id}" data-kind="${ev.kind}" data-title="${escapeHtml(ev.title)}" title="Delete event" style="background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach delete handlers
    questsContainer.querySelectorAll<HTMLButtonElement>('.btn-delete-event').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const kind = btn.getAttribute('data-kind');
        const title = btn.getAttribute('data-title');
        if (!id || !kind) return;

        if (confirm(`Are you sure you want to delete ${kind} "${title}"?`)) {
          try {
            const endpoint = kind === 'contest' ? `/api/contests/${id}` : `/api/quests/${id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (res.ok) {
              showToast(`Deleted ${kind} "${title}"`);
              loadAllEvents();
            } else {
              showToast(`Failed to delete ${kind}`);
            }
          } catch (err) {
            console.error('Error deleting event:', err);
            showToast(`Error deleting ${kind}`);
          }
        }
      });
    });
  }

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderEvents();
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
        renderEvents();
        filterMenu.classList.remove('show');
      });
    });
  }

  // Initial load
  loadAllEvents();
});
