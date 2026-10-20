import './adminProfileModal';

// Admin Upload Problem Page Logic - Connected to Bun SQLite Backend

interface DbProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topic?: {
    name: string;
    icon: string;
  };
  rewardXp: number;
  description?: string;
  statement?: string;
  sampleInput?: string;
  sampleOutput?: string;
  createdAt?: string;
  testCaseCount?: number;
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
  const searchInput = document.getElementById('admin-problem-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-problem-filter-toggle');
  const filterMenu = document.getElementById('admin-problem-filter-menu');
  const filterOptions = document.querySelectorAll<HTMLButtonElement>('#admin-problem-filter-menu .admin-filter-opt');
  const filterLabel = document.getElementById('filter-label');
  const problemsContainer = document.getElementById('admin-problems-container');

  let problemsList: DbProblem[] = [];
  let searchQuery = '';
  let currentFilter = 'all';

  async function loadProblems() {
    try {
      const res = await fetch('/api/problems');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.problems)) {
          problemsList = data.problems;
          renderProblems();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load problems from /api/problems:', err);
    }
  }

  function formatDate(isoStr?: string) {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  }

  function getDifficultyColor(diff?: string) {
    const d = (diff || 'Easy').toLowerCase();
    if (d === 'hard') return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
    if (d === 'medium') return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
    return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
  }

  function renderProblems() {
    if (!problemsContainer) return;

    let filtered = problemsList.filter(p => {
      const title = (p.title || '').toLowerCase();
      const topicName = (p.topic?.name || '').toLowerCase();
      const desc = (p.description || p.statement || '').toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery) || topicName.includes(searchQuery) || desc.includes(searchQuery);

      if (!matchesSearch) return false;

      if (currentFilter === 'easy') return (p.difficulty || '').toLowerCase() === 'easy';
      if (currentFilter === 'medium') return (p.difficulty || '').toLowerCase() === 'medium';
      if (currentFilter === 'hard') return (p.difficulty || '').toLowerCase() === 'hard';

      return true;
    });

    if (currentFilter === 'recent') {
      filtered = [...filtered].reverse();
    } else if (currentFilter === 'xp-high') {
      filtered = [...filtered].sort((a, b) => (b.rewardXp || 0) - (a.rewardXp || 0));
    }

    const createProblemCardHtml = `
      <a href="/admin/createproblem" class="admin-create-level-card" id="card-create-problem">
        <div class="admin-create-level-icon-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div class="admin-create-level-content">
          <h3 class="admin-create-level-title">Create Problem</h3>
          <p class="admin-create-level-subtitle">Add a new coding problem with custom test cases & solutions</p>
        </div>
      </a>
    `;

    if (filtered.length === 0) {
      problemsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 24px; color: #64748b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <h3 style="font-size: 17px; font-weight: 600; color: #0f172a; margin: 0 0 6px 0;">No problems found</h3>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Click below to create a new coding problem.</p>
        </div>
        ${createProblemCardHtml}
      `;
      return;
    }

    const itemsHtml = filtered.map((p, idx) => {
      const badgeText = `P${idx + 1}`;
      const dateText = formatDate(p.createdAt);
      const diffStyle = getDifficultyColor(p.difficulty);
      const topicName = p.topic?.name || 'General';
      const tcText = p.testCaseCount ? `${p.testCaseCount} Test Cases` : 'Test Cases Included';

      return `
        <div class="admin-level-card admin-problem-card-row" data-id="${p.id}" data-title="${p.title}">
          <div class="admin-level-card-left">
            <div class="admin-level-badge" style="background: #2563eb; color: #ffffff;">${badgeText}</div>
            <div class="admin-level-details">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h3 class="admin-level-name" style="margin: 0;">${p.title}</h3>
                <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${diffStyle.bg}; color: ${diffStyle.text}; border: 1px solid ${diffStyle.border};">
                  ${p.difficulty || 'Easy'}
                </span>
              </div>
              <span class="admin-level-quizzes-count" style="margin-top: 4px; display: block;">
                ${topicName} • ${p.rewardXp || 10} XP • ${tcText}
              </span>
            </div>
          </div>

          <div class="admin-level-card-right">
            <div class="admin-level-card-date">
              <svg class="admin-level-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div class="admin-level-date-col">
                <span class="admin-level-date-label">Created On</span>
                <span class="admin-level-date-val">${dateText}</span>
              </div>
            </div>

            <div class="admin-level-card-actions">
              <a href="/admin/createproblem?id=${p.id}" class="admin-level-edit-btn" title="Edit Problem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                <span>Edit</span>
              </a>

              <div class="admin-level-menu-wrap">
                <button class="admin-level-dots-btn" title="More options" data-problem-id="${p.id}">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="admin-dropdown-menu" id="menu-${p.id}">
                  <a href="/admin/createproblem?id=${p.id}" class="admin-dropdown-item">Edit Problem</a>
                  <a href="/problem/qlibrary/compiler?id=${p.id}" target="_blank" class="admin-dropdown-item">View in Compiler</a>
                  <button class="admin-dropdown-item btn-delete-problem" data-id="${p.id}" style="color: #ef4444;">Delete Problem</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    problemsContainer.innerHTML = itemsHtml + createProblemCardHtml;
    attachCardEvents();
  }

  function attachCardEvents() {
    // Dropdown toggles
    document.querySelectorAll('.admin-level-dots-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.problemId;
        const menu = document.getElementById(`menu-${id}`);
        const isShown = menu?.classList.contains('show');
        document.querySelectorAll('.admin-dropdown-menu').forEach(m => m.classList.remove('show'));
        if (!isShown && menu) {
          menu.classList.add('show');
        }
      });
    });

    // Delete problem buttons
    document.querySelectorAll('.btn-delete-problem').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;

        const target = problemsList.find(p => p.id === id);
        const name = target?.title || 'this problem';
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
          return;
        }

        try {
          const res = await fetch(`/api/problems/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast(`Deleted "${name}"`);
            problemsList = problemsList.filter(p => p.id !== id);
            renderProblems();
          } else {
            showToast('Failed to delete problem');
          }
        } catch (err) {
          console.error('Delete problem error:', err);
          showToast('Network error while deleting problem');
        }
      });
    });
  }

  // Search input event
  searchInput?.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
    renderProblems();
  });

  // Filter dropdown toggle
  filterToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    filterMenu?.classList.toggle('show');
  });

  filterOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      filterOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentFilter = opt.dataset.filter || 'all';
      if (filterLabel) {
        filterLabel.textContent = opt.textContent || 'Filter';
      }
      filterMenu?.classList.remove('show');
      renderProblems();
    });
  });

  // Close menus on outside click
  document.addEventListener('click', () => {
    filterMenu?.classList.remove('show');
    document.querySelectorAll('.admin-dropdown-menu').forEach(m => m.classList.remove('show'));
  });

  // Initial load
  await loadProblems();
});
