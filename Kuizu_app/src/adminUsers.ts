import './adminProfileModal';

// Admin Users Page Logic - Connected to Bun SQLite Backend

interface DbUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: string;
  xp: number;
  problems_solved: number;
  streak: number;
  joined_date: string;
  last_active: string;
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'KZ').toUpperCase();
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('admin-user-search') as HTMLInputElement | null;
  const filterToggle = document.getElementById('admin-filter-toggle');
  const filterMenu = document.getElementById('admin-filter-menu');
  const filterOptions = document.querySelectorAll<HTMLButtonElement>('.admin-filter-opt');
  const usersContainer = document.getElementById('admin-users-container');
  const exportBtn = document.getElementById('export-users-btn');
  const usersCountBadge = document.getElementById('users-count-badge');

  let currentFilter = 'all';
  let searchQuery = '';
  let usersList: DbUser[] = [];

  // Fetch real users from Bun backend
  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          usersList = data.users;
          renderUsers();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load users from /api/users, falling back to static markup:', err);
    }
  }

  function renderUsers() {
    if (!usersContainer) return;

    // Filter users based on query and status
    const filtered = usersList.filter(u => {
      const matchesSearch = !searchQuery || 
        u.name.toLowerCase().includes(searchQuery) || 
        u.email.toLowerCase().includes(searchQuery);
      const matchesStatus = currentFilter === 'all' || u.status.toLowerCase() === currentFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

    if (usersCountBadge) {
      usersCountBadge.textContent = `${filtered.length} users`;
    }

    if (filtered.length === 0) {
      usersContainer.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #94a3b8;">
          <p style="font-size: 16px; font-weight: 500;">No users found matching your search</p>
        </div>
      `;
      return;
    }

    usersContainer.innerHTML = filtered.map(u => {
      const initials = getInitials(u.name);
      const isActive = u.status.toLowerCase() === 'active';
      const roleBadgeClass = u.role.toLowerCase() === 'admin' ? 'admin-role-badge' : 'admin-role-badge';
      const avatarHtml = u.avatar && u.avatar.startsWith('http') 
        ? `<img src="${u.avatar}" alt="${u.name}" class="admin-avatar-initials" style="object-fit:cover; border-radius:50%;" />`
        : `<div class="admin-avatar-initials">${initials}</div>`;

      return `
        <a href="/admin/user/userprofile?student=${encodeURIComponent(u.id || u.name)}" class="admin-user-card" data-name="${u.name}" data-email="${u.email}" data-status="${u.status}">
          <div class="admin-user-card-left">
            ${avatarHtml}
            <div class="admin-user-details">
              <h3 class="admin-user-card-name">${u.name}</h3>
              <span class="admin-user-card-email">${u.email}</span>
            </div>
          </div>

          <div class="admin-user-card-badges">
            <span class="${roleBadgeClass}" style="${u.role.toLowerCase() === 'admin' ? 'background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3);' : ''}">${u.role}</span>
            <span class="admin-status-badge ${isActive ? 'active' : 'inactive'}">
              <span class="status-dot"></span>${isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div class="admin-user-card-dates">
            <div class="admin-date-col">
              <span class="admin-date-label">Joined</span>
              <span class="admin-date-val">${u.joined_date || 'Apr 2025'}</span>
            </div>
            <div class="admin-date-col">
              <span class="admin-date-label">Last Active</span>
              <span class="admin-date-val">${u.last_active || 'Today'}</span>
            </div>
          </div>

          <div class="admin-user-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </a>
      `;
    }).join('');
  }

  // Load from backend first
  await loadUsers();

  // Real-time search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      renderUsers();
    });
  }

  // Filter dropdown toggle
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
        currentFilter = opt.getAttribute('data-filter') || 'all';
        filterMenu.classList.remove('show');
        renderUsers();
        showToast(`Filtered by: ${opt.textContent}`);
      });
    });
  }

  // Export CSV
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date', 'Last Active'];
      const rows = usersList.map(u => [
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        `"${u.status}"`,
        `"${u.joined_date}"`,
        `"${u.last_active}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'kuizu_students_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${usersList.length} registered students to CSV successfully!`);
    });
  }
});
