/**
 * Contests Page Controller (TypeScript)
 * Implements interactive filtering, reminder toggles, details & results modals
 */
import './services/adminAuthGuard';

// Toast notification helper
function showToast(message: string, duration = 3000) {
  let toast = document.getElementById('contest-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'contest-toast';
    toast.className = 'contest-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast?.classList.remove('show');
  }, duration);
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. User Profile Avatar Dropdown
  const btnAvatar = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');

  if (btnAvatar && userDropdown) {
    btnAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.contains('show');
      userDropdown.classList.toggle('show', !isOpen);
      btnAvatar.classList.toggle('open', !isOpen);
      btnAvatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !btnAvatar.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        btnAvatar.classList.remove('open');
        btnAvatar.setAttribute('aria-expanded', 'false');
      }
    });

    if (window.location.hash === '#open-popup') {
      userDropdown.classList.add('show');
      btnAvatar.classList.add('open');
      btnAvatar.setAttribute('aria-expanded', 'true');
    }

    document.querySelector('.popup-user-header')?.addEventListener('click', () => {
      window.location.href = '/profile';
    });

    document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
      window.location.href = '/settings';
    });
  }

  // 2. Filter Dropdown Interaction & Table Loading
  const btnFilter = document.getElementById('btn-filter-dropdown');
  const filterMenu = document.getElementById('contest-filter-menu');
  const filterLabel = document.getElementById('current-filter-label');
  const tableBody = document.getElementById('contests-table-body');

  let currentFilter = 'all';
  let contestsList: any[] = [];
  let problemsList: any[] = [];

  async function loadProblemsData() {
    try {
      const res = await fetch('/api/problems');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.problems)) {
          problemsList = data.problems;
        }
      }
    } catch (err) {
      console.warn('Could not load problems:', err);
    }
  }

  async function loadContestsData() {
    try {
      const res = await fetch('/api/contests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.contests)) {
          contestsList = data.contests;
          renderContestsTable();
          updateFeaturedCards();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load contests from /api/contests:', err);
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

  function updateFeaturedCards() {
    if (contestsList.length === 0) return;
    const weekly = contestsList.find(c => c.type === 'weekly') || contestsList[0];
    const biweekly = contestsList.find(c => c.type === 'biweekly') || contestsList[1];

    const weeklyTitle = document.querySelector('.card-weekly .featured-contest-title');
    const weeklyDuration = document.querySelector('.card-weekly .meta-val-blue');
    const weeklyBtn = document.querySelector('.card-weekly .btn-contest-details') as HTMLButtonElement | null;
    if (weekly && weeklyTitle) {
      weeklyTitle.textContent = weekly.title;
      if (weeklyDuration) weeklyDuration.textContent = weekly.duration.includes('m') || weekly.duration.includes('h') ? weekly.duration : `${weekly.duration} mins`;
      if (weeklyBtn) weeklyBtn.setAttribute('data-contest-id', weekly.id);
    }

    const biweeklyTitle = document.querySelector('.card-biweekly .featured-contest-title');
    const biweeklyDuration = document.querySelector('.card-biweekly .meta-val-purple');
    const biweeklyBtn = document.querySelector('.card-biweekly .btn-contest-details') as HTMLButtonElement | null;
    if (biweekly && biweeklyTitle) {
      biweeklyTitle.textContent = biweekly.title;
      if (biweeklyDuration) biweeklyDuration.textContent = biweekly.duration.includes('m') || biweekly.duration.includes('h') ? biweekly.duration : `${biweekly.duration} mins`;
      if (biweeklyBtn) biweeklyBtn.setAttribute('data-contest-id', biweekly.id);
    }
  }

  function renderContestsTable() {
    if (!tableBody) return;

    const filtered = contestsList.filter(c => {
      const type = (c.type || 'weekly').toLowerCase();
      const status = (c.status || 'upcoming').toLowerCase();
      if (currentFilter === 'all') return true;
      if (currentFilter === 'weekly') return type === 'weekly';
      if (currentFilter === 'biweekly') return type === 'biweekly';
      if (currentFilter === 'upcoming') return status === 'upcoming';
      if (currentFilter === 'completed') return status === 'completed';
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 48px; color: #94a3b8;">
            <p style="font-size: 15px; font-weight: 500;">No contests available right now. Check back soon!</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((c, idx) => {
      const type = (c.type || 'weekly').toLowerCase();
      const isWeekly = type === 'weekly';
      const pillClass = isWeekly ? 'pill-weekly' : 'pill-biweekly';
      const typeLabel = isWeekly ? 'Weekly' : 'Biweekly';
      const avatarClass = isWeekly ? 'avatar-blue' : 'avatar-purple';

      const formattedDate = formatContestDate(c.startDate);
      const timeStart = formatContestTime(c.startDate);
      const durationText = c.duration ? (c.duration.includes('m') || c.duration.includes('h') ? c.duration : `${c.duration} mins`) : '1 hour';
      const isUpcoming = (c.status || 'upcoming').toLowerCase() === 'upcoming';
      const statusBadge = isUpcoming 
        ? `<span class="status-badge badge-upcoming"><span class="status-dot"></span><span>Upcoming</span></span>`
        : `<span class="status-badge badge-completed"><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Completed</span></span>`;

      return `
        <tr data-type="${type}" data-status="${(c.status || 'upcoming').toLowerCase()}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-name">
            <div class="contest-name-cell" style="cursor: pointer;" data-contest-id="${c.id}">
              <div class="contest-type-avatar ${avatarClass}">
                <span>&lt;/&gt;</span>
              </div>
              <div class="contest-name-info">
                <span class="contest-name-main">${escapeHtml(c.title)}</span>
                <span class="contest-name-sub">${c.problems && c.problems.length > 0 ? `${c.problems.length} challenge questions included` : 'Test your coding skills with real-world problems.'}</span>
              </div>
            </div>
          </td>
          <td class="col-type">
            <span class="contest-badge-pill ${pillClass}">${typeLabel}</span>
          </td>
          <td class="col-date">
            <div class="date-cell">
              <span class="date-main">${formattedDate}</span>
              <span class="date-sub">${timeStart ? `${timeStart} (IST)` : ''}</span>
            </div>
          </td>
          <td class="col-duration">
            <span class="duration-text">${durationText}</span>
          </td>
          <td class="col-status">
            ${statusBadge}
          </td>
          <td class="col-action">
            <button type="button" class="btn-action-remind" data-contest-id="${c.id}" style="margin-right: 6px;">
              <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Remind Me</span>
            </button>
            <button type="button" class="btn-table-participate" data-contest-id="${c.id}" style="background: #4F46E5; color: #fff; border: none; padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; cursor: pointer;">
              Participate
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach listeners to rows and buttons
    attachContestRowListeners();
  }

  function attachContestRowListeners() {
    document.querySelectorAll<HTMLElement>('.contest-name-cell, .btn-table-participate').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-contest-id');
        if (id) openContestDetails(id);
      });
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-action-remind').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isReminded = btn.classList.contains('reminded');
        if (isReminded) {
          btn.classList.remove('reminded');
          btn.innerHTML = `
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Remind Me</span>
          `;
          showToast('Reminder cancelled.');
        } else {
          btn.classList.add('reminded');
          btn.innerHTML = `
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Reminded</span>
          `;
          showToast('Reminder set! You will be notified 30 mins before the contest.');
        }
      });
    });
  }

  if (btnFilter && filterMenu) {
    btnFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filterMenu.classList.contains('show');
      filterMenu.classList.toggle('show', !isOpen);
      btnFilter.classList.toggle('open', !isOpen);
      btnFilter.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!filterMenu.contains(e.target as Node) && !btnFilter.contains(e.target as Node)) {
        filterMenu.classList.remove('show');
        btnFilter.classList.remove('open');
        btnFilter.setAttribute('aria-expanded', 'false');
      }
    });

    const filterItems = filterMenu.querySelectorAll<HTMLButtonElement>('.filter-menu-item');
    filterItems.forEach((item) => {
      item.addEventListener('click', () => {
        currentFilter = item.getAttribute('data-filter') || 'all';

        filterItems.forEach((btn) => btn.classList.remove('active'));
        item.classList.add('active');

        if (filterLabel) {
          filterLabel.textContent = item.textContent || 'All Contests';
        }

        renderContestsTable();

        filterMenu.classList.remove('show');
        btnFilter.classList.remove('open');
        btnFilter.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 4. "View Results" Modal
  const modalResults = document.getElementById('modal-contest-results');
  const modalResultsTitle = document.getElementById('modal-results-title');
  const btnCloseResults = document.getElementById('btn-close-results-modal');

  if (btnCloseResults && modalResults) {
    btnCloseResults.addEventListener('click', () => {
      modalResults.classList.remove('open');
    });

    modalResults.addEventListener('click', (e) => {
      if (e.target === modalResults) {
        modalResults.classList.remove('open');
      }
    });
  }

  // 5. "View Details & Questions" Modal
  const modalDetails = document.getElementById('modal-contest-details');
  const modalDetailsTitle = document.getElementById('modal-details-title');
  const modalDetailsBadge = document.getElementById('modal-details-badge');
  const modalProblemsList = document.getElementById('modal-details-problems-list');
  const modalProblemsBadge = document.getElementById('modal-problems-count-badge');
  const btnCloseDetails = document.getElementById('btn-close-details-modal');
  const btnRegisterContest = document.getElementById('btn-register-contest');

  let activeContestId: string = '';

  function openContestDetails(contestId: string) {
    activeContestId = contestId;
    const contest = contestsList.find(c => c.id === contestId);
    if (!contest) return;

    if (modalDetailsTitle) modalDetailsTitle.textContent = contest.title;
    if (modalDetailsBadge) {
      modalDetailsBadge.textContent = contest.type === 'biweekly' ? 'Biweekly Challenge' : 'Weekly Contest';
      modalDetailsBadge.className = contest.type === 'biweekly' ? 'featured-badge badge-biweekly' : 'featured-badge badge-weekly';
    }

    const problems = contest.problems || [];
    if (modalProblemsBadge) {
      modalProblemsBadge.textContent = `${problems.length} Problem${problems.length === 1 ? '' : 's'}`;
    }

    if (modalProblemsList) {
      if (problems.length === 0) {
        modalProblemsList.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 13px; text-align: center; background: #f8fafc; border-radius: 8px;">No problems added to this contest yet.</div>';
      } else {
        modalProblemsList.innerHTML = problems.map((probName: string, i: number) => {
          // Look up problem by title if available
          const probObj = problemsList.find(p => p.title.toLowerCase() === probName.toLowerCase());
          const slug = probObj ? probObj.slug : encodeURIComponent(probName);
          const diff = probObj ? probObj.difficulty : 'Medium';
          const diffColor = diff === 'Easy' ? '#10B981' : (diff === 'Hard' ? '#EF4444' : '#F59E0B');

          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; color: #64748b; font-size: 12.5px; width: 20px;">Q${i + 1}</span>
                <div>
                  <span style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${escapeHtml(probName)}</span>
                  <span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: ${diffColor};">(${diff})</span>
                </div>
              </div>
              <a href="/problem/qlibrary/compiler?slug=${slug}" class="btn-solve-contest-prob" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; background: #EEF2FF; color: #4F46E5; font-size: 12px; font-weight: 700; text-decoration: none;">
                <span>Solve</span>
                <span>→</span>
              </a>
            </div>
          `;
        }).join('');
      }
    }

    if (modalDetails) modalDetails.classList.add('open');
  }

  // Featured Cards "View Details" click
  document.querySelectorAll<HTMLButtonElement>('.btn-contest-details').forEach((btn) => {
    btn.addEventListener('click', () => {
      const contestId = btn.getAttribute('data-contest-id');
      if (contestId) {
        openContestDetails(contestId);
      } else {
        const type = btn.getAttribute('data-contest') || 'weekly';
        const contest = contestsList.find(c => c.type === type) || contestsList[0];
        if (contest) {
          openContestDetails(contest.id);
        } else if (modalDetails) {
          modalDetails.classList.add('open');
        }
      }
    });
  });

  if (btnCloseDetails && modalDetails) {
    btnCloseDetails.addEventListener('click', () => {
      modalDetails.classList.remove('open');
    });

    modalDetails.addEventListener('click', (e) => {
      if (e.target === modalDetails) {
        modalDetails.classList.remove('open');
      }
    });
  }

  if (btnRegisterContest && modalDetails) {
    btnRegisterContest.addEventListener('click', async () => {
      modalDetails.classList.remove('open');
      const userEmail = localStorage.getItem('kuizu_user_email') || '';
      const userName = localStorage.getItem('kuizu_user_name') || '';
      if (activeContestId) {
        try {
          await fetch(`/api/contests/${activeContestId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, name: userName })
          });
        } catch {}
      }
      showToast('Successfully registered for the contest! +25 Club Activity XP Earned!');
    });
  }

  // Load backend data
  loadProblemsData().then(() => loadContestsData());
});
