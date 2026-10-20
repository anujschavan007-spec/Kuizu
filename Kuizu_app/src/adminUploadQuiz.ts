import './adminProfileModal';

// Admin Upload Quiz Page Logic - Connected to Bun SQLite Backend

interface DbQuiz {
  id: number;
  name: string;
  description: string;
  status: string;
  stars: number;
  maxStars: number;
  questionCount: number;
  rewardXp: number;
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
  const searchInput = document.getElementById('admin-level-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-level-filter-toggle');
  const filterMenu = document.getElementById('admin-level-filter-menu');
  const filterOptions = document.querySelectorAll<HTMLButtonElement>('#admin-level-filter-menu .admin-filter-opt');
  const levelsContainer = document.getElementById('admin-levels-container');

  let quizzesList: DbQuiz[] = [];
  let searchQuery = '';
  let currentSort = 'all';

  async function loadQuizzes() {
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.quizzes)) {
          quizzesList = data.quizzes;
          renderLevels();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load quizzes from /api/quizzes:', err);
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

  function renderLevels() {
    if (!levelsContainer) return;

    let filtered = quizzesList.filter(q => {
      const title = (q.name || `Quiz ${q.id}`).toLowerCase();
      const desc = (q.description || '').toLowerCase();
      return !searchQuery || title.includes(searchQuery) || desc.includes(searchQuery);
    });

    if (currentSort === 'recent') {
      filtered = [...filtered].reverse();
    } else if (currentSort === 'quizzes') {
      filtered = [...filtered].sort((a, b) => (b.rewardXp || 0) - (a.rewardXp || 0));
    }

    const createQuizCardHtml = `
      <a href="/admin/createquiz" class="admin-create-level-card" id="card-create-level">
        <div class="admin-create-level-icon-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <div class="admin-create-level-content">
          <h3 class="admin-create-level-title">Create Quiz</h3>
          <p class="admin-create-level-subtitle">Add a new quiz and challenge your students</p>
        </div>
      </a>
    `;

    if (filtered.length === 0) {
      levelsContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 24px; color: #64748b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
              <path d="M12 12v9"></path>
              <path d="m16 16-4-4-4 4"></path>
            </svg>
          </div>
          <h3 style="font-size: 17px; font-weight: 600; color: #0f172a; margin: 0 0 6px 0;">No quizzes uploaded yet</h3>
          <p style="font-size: 14px; color: #64748b; margin: 0;">Click below to create your first quiz.</p>
        </div>
        ${createQuizCardHtml}
      `;
      return;
    }

    levelsContainer.innerHTML = filtered.map((q, idx) => {
      const badgeText = `Q${idx + 1}`;
      const dateText = formatDate((q as any).createdAt || (q as any).created_at);
      return `
        <div class="admin-level-card admin-quiz-card-clickable" data-id="${q.id}" data-title="${q.name}">
          <div class="admin-level-card-left">
            <div class="admin-level-badge">${badgeText}</div>
            <div class="admin-level-details">
              <h3 class="admin-level-name">${q.name}</h3>
              <span class="admin-level-quizzes-count">Level ${(q as any).levelNumber || (q as any).level_number || 1} • 1 Quiz • ${(q as any).rewardXp || (q as any).reward_xp || 150} XP</span>
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
              <a href="/admin/createquiz?id=${q.id}" class="admin-level-edit-btn" title="Edit Quiz">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                <span>Edit</span>
              </a>

              <div class="admin-level-menu-wrap">
                <button class="admin-level-dots-btn" title="More options" data-level-id="${q.id}">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="admin-dropdown-menu" id="menu-${q.id}">
                  <a href="/admin/createquiz?id=${q.id}" class="admin-dropdown-item">Edit Quiz</a>
                  <button class="admin-dropdown-item btn-delete-quiz" data-id="${q.id}" style="color: #ef4444;">Delete Quiz</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') + createQuizCardHtml;

    // Make entire card clickable to navigate directly to edit
    document.querySelectorAll<HTMLElement>('.admin-quiz-card-clickable').forEach((card) => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.admin-level-menu-wrap') || target.closest('a')) {
          return;
        }
        const id = card.getAttribute('data-id');
        if (id) {
          window.location.href = `/admin/createquiz?id=${id}`;
        }
      });
    });

    // Attach listeners for dots menus
    document.querySelectorAll<HTMLButtonElement>('.admin-level-dots-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const levelId = btn.getAttribute('data-level-id');
        const targetMenu = document.getElementById(`menu-${levelId}`);
        document.querySelectorAll('.admin-dropdown-menu').forEach((m) => {
          if (m !== targetMenu) m.classList.remove('show');
        });
        targetMenu?.classList.toggle('show');
      });
    });

    // Attach delete quiz listener
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-quiz').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Close all dropdown menus immediately
        document.querySelectorAll('.admin-dropdown-menu').forEach((m) => m.classList.remove('show'));

        const id = btn.getAttribute('data-id');
        if (!id) return;

        const card = btn.closest<HTMLElement>('.admin-level-card');
        const quizName = card?.getAttribute('data-title') || 'this quiz';

        if (!confirm(`Are you sure you want to permanently delete "${quizName}"? This action cannot be undone.`)) {
          return;
        }

        btn.disabled = true;
        try {
          const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
          if (res.ok) {
            showToast('Quiz deleted permanently');
            // Optimistically remove from list immediately for fast UI feedback
            quizzesList = quizzesList.filter((item) => String(item.id) !== String(id));
            renderLevels();
            // Re-sync with backend
            await loadQuizzes();
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.error || 'Failed to delete quiz');
            btn.disabled = false;
          }
        } catch (err) {
          console.error('Delete quiz error:', err);
          showToast('Network error while deleting quiz');
          btn.disabled = false;
        }
      });
    });
  }

  // Global click to close dropdown menus
  document.addEventListener('click', () => {
    document.querySelectorAll('.admin-dropdown-menu').forEach((m) => m.classList.remove('show'));
  });

  await loadQuizzes();

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderLevels();
    });
  }

  // Filter dropdown
  if (filterToggle && filterMenu) {
    filterToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!filterToggle.contains(e.target as Node) && !filterMenu.contains(e.target as Node)) {
        filterMenu.classList.remove('show');
      }
    });

    filterOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        filterOptions.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        currentSort = opt.getAttribute('data-filter') || 'all';
        filterMenu.classList.remove('show');
        renderLevels();
        showToast(`Sorted by: ${opt.textContent}`);
      });
    });
  }
});
