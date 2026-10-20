import './adminProfileModal';

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

// Date Range Picker Dropdown
const btnDate = document.getElementById('btn-admin-date');
const dateMenu = document.getElementById('admin-date-menu');
const currentDateRangeEl = document.getElementById('admin-current-date-range');

if (btnDate && dateMenu) {
  btnDate.addEventListener('click', (e) => {
    e.stopPropagation();
    dateMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!dateMenu.contains(e.target as Node) && !btnDate.contains(e.target as Node)) {
      dateMenu.classList.remove('show');
    }
  });

  const menuItems = dateMenu.querySelectorAll('.date-menu-item');
  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      menuItems.forEach((m) => m.classList.remove('active'));
      item.classList.add('active');
      const range = item.getAttribute('data-range') || 'Apr 21, 2025 – Apr 27, 2025';
      if (currentDateRangeEl) currentDateRangeEl.textContent = range;
      dateMenu.classList.remove('show');
      showToast(`Filter applied: ${range}`);
    });
  });
}

// Engagement Chart Multi-Period Datasets
interface ChartData {
  days: string[];
  values: number[];
  points: string;
}

const CHART_DATASETS: Record<string, ChartData> = {
  '7': {
    days: ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27'],
    values: [360, 492, 348, 440, 524, 610, 836],
    points: '60,172 143,148 226,174 309,158 392,143 475,128 558,80'
  },
  '30': {
    days: ['Apr 01', 'Apr 06', 'Apr 11', 'Apr 16', 'Apr 21', 'Apr 24', 'Apr 27'],
    values: [420, 580, 510, 690, 720, 790, 836],
    points: '60,161 143,132 226,145 309,112 392,107 475,94 558,80'
  },
  '90': {
    days: ['Feb 01', 'Feb 15', 'Mar 01', 'Mar 15', 'Apr 01', 'Apr 15', 'Apr 27'],
    values: [280, 390, 450, 580, 640, 730, 836],
    points: '60,185 143,166 226,155 309,132 392,121 475,105 558,80'
  }
};

const rangeButtons = document.querySelectorAll('.range-btn');
const chartLine = document.getElementById('engagement-chart-line');
const chartPointsGroup = document.getElementById('chart-data-points');
const chartXLabelsRow = document.getElementById('chart-x-labels-row');
const tooltip = document.getElementById('chart-tooltip');

function renderChart(period: string) {
  const data = CHART_DATASETS[period] || CHART_DATASETS['7'];

  if (chartLine) {
    chartLine.setAttribute('points', data.points);
  }

  if (chartXLabelsRow) {
    chartXLabelsRow.innerHTML = data.days.map((d) => `<span>${d}</span>`).join('');
  }

  if (chartPointsGroup) {
    const coords = data.points.split(' ');
    chartPointsGroup.innerHTML = coords
      .map((pair, idx) => {
        const [x, y] = pair.split(',');
        const isLast = idx === coords.length - 1;
        return `<circle cx="${x}" cy="${y}" r="${isLast ? 5 : 4.5}" class="chart-point ${isLast ? 'active-point' : ''}" data-date="${data.days[idx]}" data-val="${data.values[idx]}" />`;
      })
      .join('');

    attachPointTooltips();
  }
}

function attachPointTooltips() {
  const points = document.querySelectorAll('.chart-point');
  points.forEach((pt) => {
    pt.addEventListener('mouseenter', (e) => {
      const target = e.currentTarget as SVGCircleElement;
      const date = target.getAttribute('data-date');
      const val = target.getAttribute('data-val');
      if (tooltip && date && val) {
        tooltip.innerHTML = `<strong>${date}</strong>: ${val} active students`;
        tooltip.style.display = 'block';

        const rect = target.getBoundingClientRect();
        const containerRect = document.getElementById('engagement-chart-container')?.getBoundingClientRect();
        if (containerRect) {
          const left = rect.left - containerRect.left + rect.width / 2;
          const top = rect.top - containerRect.top - 36;
          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
        }
      }
    });

    pt.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.style.display = 'none';
    });
  });
}

attachPointTooltips();

rangeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    rangeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const days = btn.getAttribute('data-days') || '7';
    renderChart(days);
    showToast(`Engagement view updated to ${days} days`);
  });
});

// Activity Rows Click Interaction
const activityRows = document.querySelectorAll('.activity-row');
activityRows.forEach((row) => {
  row.addEventListener('click', () => {
    const details = row.getAttribute('data-activity') || 'Recent student action';
    showToast(details);
  });
});

// View All Modal Logic
const modalOverlay = document.getElementById('admin-modal-overlay');
const modalTitle = document.getElementById('admin-modal-title');
const modalBody = document.getElementById('admin-modal-body');
const btnModalClose = document.getElementById('btn-admin-modal-close');

const RANKING_DATA: Record<string, { title: string; rows: Array<{ rank: number; name: string; val: string }> }> = {
  xp: {
    title: 'Top Students by XP',
    rows: []
  },
  leetcode: {
    title: 'Top Students by LeetCode Solved',
    rows: [
      { rank: 1, name: 'Anuj Chavan', val: '0 Solved' },
      { rank: 2, name: 'Pravin Ghodake', val: '0 Solved' },
      { rank: 3, name: 'Pranav', val: '0 Solved' },
      { rank: 4, name: 'Ananya Sharma', val: '0 Solved' }
    ]
  },
  cw: {
    title: 'Top Students by Classwork (CW)',
    rows: [
      { rank: 1, name: 'Anuj Chavan', val: '0 / 20' },
      { rank: 2, name: 'Pravin Ghodake', val: '0 / 20' },
      { rank: 3, name: 'Pranav', val: '0 / 20' }
    ]
  },
  hw: {
    title: 'Top Students by Homework (HW)',
    rows: [
      { rank: 1, name: 'Anuj Chavan', val: '0 / 20' },
      { rank: 2, name: 'Pravin Ghodake', val: '0 / 20' },
      { rank: 3, name: 'Pranav', val: '0 / 20' }
    ]
  }
};

// Fetch real strictly calculated users from API
fetch('/api/users')
  .then((res) => res.json())
  .then((data) => {
    if (data.users && Array.isArray(data.users)) {
      RANKING_DATA.xp.rows = data.users.map((u: any, idx: number) => ({
        rank: idx + 1,
        name: u.name,
        val: `${Number(u.xp || 0).toLocaleString()} XP`
      }));

      const tbodyXp = document.getElementById('ranking-tbody-xp');
      if (tbodyXp) {
        tbodyXp.innerHTML = data.users.slice(0, 5).map((u: any, idx: number) => `
          <tr>
            <td class="ranking-num">${idx + 1}</td>
            <td class="ranking-student">
              <div class="student-avatar-wrap">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <span class="student-name">${u.name}</span>
            </td>
            <td class="ranking-val">
              <div class="val-bold">${Number(u.xp || 0).toLocaleString()}</div>
              <div class="val-sub">XP</div>
            </td>
          </tr>
        `).join('');
      }
    }
  })
  .catch((err) => console.warn('Could not load real users for admin ranking modal:', err));

const viewAllBtns = document.querySelectorAll('.ranking-view-all');
viewAllBtns.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = btn.getAttribute('data-target') || 'xp';
    const config = RANKING_DATA[target];

    if (config && modalTitle && modalBody && modalOverlay) {
      modalTitle.textContent = config.title;
      modalBody.innerHTML = `
        <div class="modal-ranking-list">
          ${config.rows
            .map(
              (r) => `
            <div class="modal-ranking-row">
              <span class="modal-rank-badge ${r.rank <= 3 ? 'rank-top' : ''}">#${r.rank}</span>
              <div class="student-avatar-wrap">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <span class="modal-student-name">${r.name}</span>
              <span class="modal-score-val">${r.val}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `;
      modalOverlay.classList.add('show');
    } else if (btn.id === 'btn-view-all-activity' && modalTitle && modalBody && modalOverlay) {
      modalTitle.textContent = 'Recent Activity Log';
      modalBody.innerHTML = `
        <div class="modal-activity-list">
          <p style="font-size: 13.5px; color: #64748b; margin-bottom: 12px;">Full historical record of recent platform transactions and student completions.</p>
          <div class="activity-row"><span class="activity-pill pill-user">🔵 User</span> <strong>Pravin Ghodake</strong> registered • Today</div>
          <div class="activity-row"><span class="activity-pill pill-quiz">🟣 Quiz</span> <strong>Anuj Chavan</strong> completed Level 4 • Today</div>
          <div class="activity-row"><span class="activity-pill pill-problem">🟢 Problem</span> <strong>Admin</strong> published "Two Sum" • Today</div>
          <div class="activity-row"><span class="activity-pill pill-battle">🔵 Battle</span> Room created by <strong>Team Alpha</strong> • Today</div>
          <div class="activity-row"><span class="activity-pill pill-contest">🟠 Contest</span> <strong>Weekly Coding Contest</strong> launched • Today</div>
        </div>
      `;
      modalOverlay.classList.add('show');
    }
  });
});

btnModalClose?.addEventListener('click', () => {
  modalOverlay?.classList.remove('show');
});

modalOverlay?.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('show');
  }
});

// Admin Settings Gear
const btnSettings = document.getElementById('btn-admin-settings');
btnSettings?.addEventListener('click', () => {
  window.location.href = '/settings';
});

// Sidebar nav items feedback
const navItems = document.querySelectorAll('.admin-nav-item');
navItems.forEach((nav) => {
  nav.addEventListener('click', (e) => {
    const href = nav.getAttribute('href');
    if (href === '/admin' && !nav.classList.contains('active')) {
      navItems.forEach((n) => n.classList.remove('active'));
      nav.classList.add('active');
    }
  });
});
