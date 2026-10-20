import './adminProfileModal';

// Admin Battles Page Logic - Connected to Bun SQLite Backend

interface DbBattle {
  id: string;
  roomCode: string;
  title: string;
  topic: string;
  questionPrompt: string;
  questionCount: number;
  timePerQuestion: number;
  maxPlayers?: number;
  status: string;
  hostName?: string;
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('admin-battle-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-battle-filter-toggle') as HTMLButtonElement | null;
  const filterMenu = document.getElementById('admin-battle-filter-menu');
  const battlesContainer = document.getElementById('admin-battles-container');

  let currentFilter = 'all';
  let searchQuery = '';
  let battlesList: DbBattle[] = [];

  async function loadBattles() {
    try {
      const res = await fetch('/api/battles');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.battles)) {
          battlesList = data.battles;
          renderBattles();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load battles from /api/battles:', err);
    }
  }

  function renderBattles() {
    if (!battlesContainer) return;

    const filtered = battlesList.filter((b) => {
      const matchesSearch = !searchQuery || 
        b.title.toLowerCase().includes(searchQuery) || 
        b.topic.toLowerCase().includes(searchQuery) ||
        b.roomCode.toLowerCase().includes(searchQuery);
      const matchesFilter = currentFilter === 'all' || b.status.toLowerCase() === currentFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      battlesContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #94a3b8;">
          <p style="font-size: 16px; font-weight: 500;">No battles found</p>
        </div>
      `;
      return;
    }

    battlesContainer.innerHTML = filtered.map((b) => {
      const isWaiting = b.status === 'waiting' || b.status === 'active';
      const statusClass = isWaiting ? 'active' : 'completed';
      const statusLabel = isWaiting ? 'Active' : 'Completed';

      return `
        <a href="/admin/adminbattle/createbattle?id=${encodeURIComponent(b.id)}" class="admin-battle-card" data-title="${b.title}" data-status="${b.status}">
          <div class="admin-battle-card-left">
            <div class="admin-battle-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
                <line x1="13" y1="19" x2="19" y2="13"></line>
                <line x1="16" y1="16" x2="20" y2="20"></line>
                <line x1="19" y1="21" x2="21" y2="19"></line>
                <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline>
                <line x1="5" y1="14" x2="11" y2="20"></line>
              </svg>
            </div>
            <div class="admin-battle-details">
              <h3 class="admin-battle-card-name">${b.title}</h3>
              <span class="admin-battle-card-code">${b.roomCode} • ${b.topic} • Max ${b.maxPlayers || 4} Members</span>
            </div>
          </div>

          <div class="admin-battle-card-right">
            <span class="admin-battle-status-badge ${statusClass}">
              <span class="status-dot"></span>${statusLabel}
            </span>
            <div class="admin-user-card-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  await loadBattles();

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderBattles();
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
        renderBattles();
        filterMenu.classList.remove('show');
      });
    });
  }
});
