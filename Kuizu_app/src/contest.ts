/**
 * Contests Page Controller (TypeScript)
 * Implements real-time date/time contest status, registration & enter modal flow,
 * and difficulty-based XP tracking.
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
  let activeLiveContestId: string = '';
  let activeContestId: string = '';

  // Registration & Completion helpers
  function getRegisteredContests(): string[] {
    try {
      return JSON.parse(localStorage.getItem('kuizu_registered_contests') || '[]');
    } catch {
      return [];
    }
  }

  function isContestRegistered(contestId: string): boolean {
    return getRegisteredContests().includes(contestId);
  }

  function markContestRegistered(contestId: string) {
    const list = getRegisteredContests();
    if (!list.includes(contestId)) {
      list.push(contestId);
      localStorage.setItem('kuizu_registered_contests', JSON.stringify(list));
    }
  }

  function getCompletedContests(): string[] {
    try {
      return JSON.parse(localStorage.getItem('kuizu_completed_contests') || '[]');
    } catch {
      return [];
    }
  }

  function isContestCompleted(contestId: string, contestObj?: any): boolean {
    if (!contestId) return false;
    const completedList = getCompletedContests();
    if (completedList.includes(contestId)) return true;
    if (localStorage.getItem(`kuizu_contest_${contestId}_completed`) === 'true') return true;

    const type = (contestObj?.type || '').toLowerCase();
    const title = (contestObj?.title || '').toLowerCase();
    if ((type === 'weekly' || title.includes('weekly')) && localStorage.getItem('kuizu_weekly_contest_completed') === 'true') {
      return true;
    }
    if ((type === 'biweekly' || title.includes('biweekly')) && localStorage.getItem('kuizu_biweekly_contest_completed') === 'true') {
      return true;
    }
    return false;
  }

  // Calculate dynamic live/upcoming/completed status based on real date & time and user completion
  function getContestStatus(c: any): 'live' | 'upcoming' | 'completed' {
    if (isContestCompleted(c?.id, c)) {
      return 'completed';
    }
    if (!c.startDate) return (c.status?.toLowerCase() === 'completed') ? 'completed' : 'upcoming';
    const start = new Date(c.startDate).getTime();
    if (isNaN(start)) return (c.status?.toLowerCase() || 'upcoming') as any;

    let end: number;
    if (c.endDate) {
      end = new Date(c.endDate).getTime();
    } else {
      const mins = parseInt(c.duration || '60', 10) || 60;
      end = start + mins * 60 * 1000;
    }

    const now = Date.now();
    if (now < start) return 'upcoming';
    if (now >= start && (!end || isNaN(end) || now <= end)) return 'live';
    return 'completed';
  }

  async function registerUserForContest(contest: any): Promise<boolean> {
    const userEmail = localStorage.getItem('kuizu_user_email') || '';
    const userName = localStorage.getItem('kuizu_user_name') || '';
    markContestRegistered(contest.id);

    try {
      await fetch(`/api/contests/${contest.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName })
      });
      return true;
    } catch {
      return true;
    }
  }

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

    const weeklyCard = document.querySelector('.card-weekly') as HTMLElement | null;
    const weeklyTitle = document.querySelector('.card-weekly .featured-contest-title');
    const weeklyBadge = document.querySelector('.card-weekly .featured-badge');
    const weeklyDuration = document.querySelector('.card-weekly .meta-val-blue');
    const weeklyBtn = document.querySelector('.card-weekly .btn-contest-details') as HTMLButtonElement | null;
    if (weekly && weeklyTitle) {
      weeklyTitle.textContent = weekly.title;
      if (weeklyDuration) weeklyDuration.textContent = weekly.duration?.includes('m') || weekly.duration?.includes('h') ? weekly.duration : `${weekly.duration || 60} mins`;
      if (weeklyBtn) weeklyBtn.setAttribute('data-contest-id', weekly.id);

      const isWeeklyDone = isContestCompleted(weekly.id, weekly);
      if (isWeeklyDone) {
        weeklyCard?.classList.add('contest-completed-card');
        if (weeklyBadge) {
          weeklyBadge.className = 'featured-badge badge-completed-pill';
          weeklyBadge.innerHTML = '✓ Completed';
        }
        if (weeklyBtn) {
          weeklyBtn.className = 'btn-contest-details btn-details-completed';
          weeklyBtn.innerHTML = '<span>Completed</span><span class="btn-arrow">✓</span>';
        }
      }
    }

    const biweeklyCard = document.querySelector('.card-biweekly') as HTMLElement | null;
    const biweeklyTitle = document.querySelector('.card-biweekly .featured-contest-title');
    const biweeklyBadge = document.querySelector('.card-biweekly .featured-badge');
    const biweeklyDuration = document.querySelector('.card-biweekly .meta-val-purple');
    const biweeklyBtn = document.querySelector('.card-biweekly .btn-contest-details') as HTMLButtonElement | null;
    if (biweekly && biweeklyTitle) {
      biweeklyTitle.textContent = biweekly.title;
      if (biweeklyDuration) biweeklyDuration.textContent = biweekly.duration?.includes('m') || biweekly.duration?.includes('h') ? biweekly.duration : `${biweekly.duration || 60} mins`;
      if (biweeklyBtn) biweeklyBtn.setAttribute('data-contest-id', biweekly.id);

      const isBiweeklyDone = isContestCompleted(biweekly.id, biweekly);
      if (isBiweeklyDone) {
        biweeklyCard?.classList.add('contest-completed-card');
        if (biweeklyBadge) {
          biweeklyBadge.className = 'featured-badge badge-completed-pill';
          biweeklyBadge.innerHTML = '✓ Completed';
        }
        if (biweeklyBtn) {
          biweeklyBtn.className = 'btn-contest-details btn-details-completed';
          biweeklyBtn.innerHTML = '<span>Completed</span><span class="btn-arrow">✓</span>';
        }
      }
    }
  }

  function renderContestsTable() {
    if (!tableBody) return;

    const filtered = contestsList.filter(c => {
      const type = (c.type || 'weekly').toLowerCase();
      const status = getContestStatus(c);

      if (currentFilter === 'all') return true;
      if (currentFilter === 'live') return status === 'live';
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
            <p style="font-size: 15px; font-weight: 500;">No contests available matching this filter.</p>
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
      const durationText = c.duration ? (c.duration.includes('m') || c.duration.includes('h') ? c.duration : `${c.duration} mins`) : '60 mins';
      
      const status = getContestStatus(c);
      const isRegistered = isContestRegistered(c.id);

      // Status Badge
      let statusBadge = '';
      if (status === 'live') {
        statusBadge = `<span class="status-badge badge-live"><span class="status-dot live-dot"></span><span>Live</span></span>`;
      } else if (status === 'upcoming') {
        statusBadge = `<span class="status-badge badge-upcoming"><span class="status-dot"></span><span>Upcoming</span></span>`;
      } else {
        statusBadge = `<span class="status-badge badge-completed"><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Completed</span></span>`;
      }

      // Action Buttons
      let actionButtons = '';
      if (status === 'live') {
        const btnText = isRegistered ? 'Enter Contest' : 'Participate';
        actionButtons = `
          <button type="button" class="btn-table-participate btn-live" data-contest-id="${c.id}" data-action="${isRegistered ? 'enter' : 'participate'}">
            <span>${btnText}</span>
          </button>
        `;
      } else if (status === 'upcoming') {
        actionButtons = `
          <button type="button" class="btn-action-remind" data-contest-id="${c.id}" style="margin-right: 6px;">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Remind Me</span>
          </button>
        `;
        if (isRegistered) {
          actionButtons += `
            <button type="button" class="btn-action-registered" data-contest-id="${c.id}" data-action="registered-info">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Registered</span>
            </button>
          `;
        } else {
          actionButtons += `
            <button type="button" class="btn-table-participate" data-contest-id="${c.id}" data-action="participate">
              <span>Participate</span>
            </button>
          `;
        }
      } else {
        actionButtons = `
          <button type="button" class="btn-action-results" data-contest-id="${c.id}" data-contest-title="${escapeHtml(c.title)}">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>View Results</span>
          </button>
        `;
      }

      return `
        <tr data-type="${type}" data-status="${status}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-name">
            <div class="contest-name-cell" style="cursor: pointer;" data-contest-id="${c.id}">
              <div class="contest-type-avatar ${avatarClass}">
                <span>&lt;/&gt;</span>
              </div>
              <div class="contest-name-info">
                <span class="contest-name-main">${escapeHtml(c.title)}</span>
                <span class="contest-name-sub">${c.problems && c.problems.length > 0 ? `${c.problems.length} challenge question${c.problems.length === 1 ? '' : 's'} included` : 'Test your coding skills with real-world problems.'}</span>
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
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');

    attachContestRowListeners();
  }

  // Handle contest participate, registration & enter modal flow
  async function handleContestAction(contestId: string) {
    const contest = contestsList.find(c => c.id === contestId);
    if (!contest) return;

    const status = getContestStatus(contest);
    const durationText = contest.duration ? (contest.duration.includes('m') || contest.duration.includes('h') ? contest.duration : `${contest.duration} mins`) : '60 mins';
    const problemsCount = contest.problems?.length || 1;

    // CASE 1: CONTEST IS LIVE (Date and time matches now)
    if (status === 'live') {
      // Register if not yet registered
      if (!isContestRegistered(contest.id)) {
        await registerUserForContest(contest);
        showToast('Registered for contest (+25 XP)!');
      }

      // Show "Enter Contest" popup modal
      activeLiveContestId = contest.id;
      const modalEnter = document.getElementById('modal-contest-enter');
      const liveName = document.getElementById('live-contest-name');
      const liveProblems = document.getElementById('live-contest-problems');
      const liveDuration = document.getElementById('live-contest-duration');

      if (liveName) liveName.textContent = contest.title;
      if (liveProblems) liveProblems.textContent = `${problemsCount} challenge question${problemsCount === 1 ? '' : 's'}`;
      if (liveDuration) liveDuration.textContent = durationText;

      if (modalEnter) modalEnter.classList.add('open');
      renderContestsTable();
      return;
    }

    // CASE 2: DATE AND TIME IS NOT MATCHING (Upcoming contest)
    if (status === 'upcoming') {
      // User can ONLY register for contest
      // Register user and award +25 XP
      await registerUserForContest(contest);
      renderContestsTable();

      // Show "Registration Confirmed" popup modal (No enter contest button)
      const modalRegistered = document.getElementById('modal-contest-registered');
      const regName = document.getElementById('registered-contest-name');
      const regTime = document.getElementById('registered-contest-time');
      const regDuration = document.getElementById('registered-contest-duration');

      if (regName) regName.textContent = contest.title;
      if (regTime) regTime.textContent = `${formatContestDate(contest.startDate)} at ${formatContestTime(contest.startDate)} (IST)`;
      if (regDuration) regDuration.textContent = durationText;

      if (modalRegistered) modalRegistered.classList.add('open');
      return;
    }

    // CASE 3: COMPLETED CONTEST
    if (status === 'completed') {
      const modalResults = document.getElementById('modal-contest-results');
      const modalResultsTitle = document.getElementById('modal-results-title');
      if (modalResultsTitle) modalResultsTitle.textContent = contest.title;
      if (modalResults) modalResults.classList.add('open');
    }
  }

  function attachContestRowListeners() {
    // Row click opens details
    document.querySelectorAll<HTMLElement>('.contest-name-cell').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-contest-id');
        if (id) openContestDetails(id);
      });
    });

    // Participate / Enter button click
    document.querySelectorAll<HTMLElement>('.btn-table-participate').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-contest-id');
        if (id) handleContestAction(id);
      });
    });

    // Registered button click shows registration info
    document.querySelectorAll<HTMLElement>('.btn-action-registered').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-contest-id');
        if (id) handleContestAction(id);
      });
    });

    // Remind Me button
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

    // View Results buttons
    document.querySelectorAll<HTMLButtonElement>('.btn-action-results').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const title = btn.getAttribute('data-contest-title') || 'Contest';
        const modalResults = document.getElementById('modal-contest-results');
        const modalResultsTitle = document.getElementById('modal-results-title');
        if (modalResultsTitle) modalResultsTitle.textContent = title;
        if (modalResults) modalResults.classList.add('open');
      });
    });
  }

  // 3. Filter dropdown interactions
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

  // 4. Modal Event Listeners
  // A. "Enter Contest" Modal (Live)
  const modalEnter = document.getElementById('modal-contest-enter');
  const btnCloseEnter = document.getElementById('btn-close-enter-modal');
  const btnCancelEnter = document.getElementById('btn-cancel-enter');
  const btnConfirmEnter = document.getElementById('btn-confirm-enter-arena');

  if (btnCloseEnter && modalEnter) {
    btnCloseEnter.addEventListener('click', () => modalEnter.classList.remove('open'));
  }
  if (btnCancelEnter && modalEnter) {
    btnCancelEnter.addEventListener('click', () => modalEnter.classList.remove('open'));
  }
  if (modalEnter) {
    modalEnter.addEventListener('click', (e) => {
      if (e.target === modalEnter) modalEnter.classList.remove('open');
    });
  }
  if (btnConfirmEnter) {
    btnConfirmEnter.addEventListener('click', () => {
      if (activeLiveContestId) {
        window.location.href = `/problem/contest/arena?id=${activeLiveContestId}`;
      } else {
        window.location.href = '/problem/contest/arena';
      }
    });
  }

  // B. "Registration Confirmed" Modal (Upcoming)
  const modalRegistered = document.getElementById('modal-contest-registered');
  const btnCloseRegistered = document.getElementById('btn-close-registered-modal');
  const btnAckRegistered = document.getElementById('btn-ack-registered');

  if (btnCloseRegistered && modalRegistered) {
    btnCloseRegistered.addEventListener('click', () => modalRegistered.classList.remove('open'));
  }
  if (btnAckRegistered && modalRegistered) {
    btnAckRegistered.addEventListener('click', () => modalRegistered.classList.remove('open'));
  }
  if (modalRegistered) {
    modalRegistered.addEventListener('click', (e) => {
      if (e.target === modalRegistered) modalRegistered.classList.remove('open');
    });
  }

  // C. "View Results" Modal
  const modalResults = document.getElementById('modal-contest-results');
  const btnCloseResults = document.getElementById('btn-close-results-modal');

  if (btnCloseResults && modalResults) {
    btnCloseResults.addEventListener('click', () => modalResults.classList.remove('open'));
    modalResults.addEventListener('click', (e) => {
      if (e.target === modalResults) modalResults.classList.remove('open');
    });
  }

  // D. "View Details & Questions" Modal
  const modalDetails = document.getElementById('modal-contest-details');
  const modalDetailsTitle = document.getElementById('modal-details-title');
  const modalDetailsBadge = document.getElementById('modal-details-badge');
  const modalProblemsList = document.getElementById('modal-details-problems-list');
  const modalProblemsBadge = document.getElementById('modal-problems-count-badge');
  const btnCloseDetails = document.getElementById('btn-close-details-modal');
  const btnRegisterContest = document.getElementById('btn-register-contest');

  function openContestDetails(contestId: string) {
    activeContestId = contestId;
    const contest = contestsList.find(c => c.id === contestId);
    if (!contest) return;

    const status = getContestStatus(contest);
    const isRegistered = isContestRegistered(contest.id);

    if (modalDetailsTitle) modalDetailsTitle.textContent = contest.title;
    if (modalDetailsBadge) {
      if (status === 'completed') {
        modalDetailsBadge.textContent = 'Completed Contest';
        modalDetailsBadge.className = 'featured-badge badge-completed-pill';
      } else if (status === 'live') {
        modalDetailsBadge.textContent = 'Live Contest';
        modalDetailsBadge.className = 'featured-badge badge-live';
      } else {
        modalDetailsBadge.textContent = contest.type === 'biweekly' ? 'Biweekly Challenge' : 'Weekly Contest';
        modalDetailsBadge.className = contest.type === 'biweekly' ? 'featured-badge badge-biweekly' : 'featured-badge badge-weekly';
      }
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
          const probObj = problemsList.find(p => p.title.toLowerCase() === probName.toLowerCase());
          const diff = probObj ? probObj.difficulty : (i === 0 ? 'Easy' : (i < 3 ? 'Medium' : 'Hard'));
          const diffColor = diff === 'Easy' ? '#10B981' : (diff === 'Hard' ? '#EF4444' : '#F59E0B');

          // If completed, allow reviewing in arena; if upcoming, solve action is locked until live
          let solveAction = '';
          if (status === 'completed') {
            solveAction = `<a href="/problem/contest/arena?id=${contest.id}&q=${i}" class="btn-solve-contest-prob" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700; text-decoration: none;"><span>Review</span><span>✓</span></a>`;
          } else if (status === 'live') {
            solveAction = `<a href="/problem/contest/arena?id=${contest.id}&q=${i}" class="btn-solve-contest-prob" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; background: #EEF2FF; color: #4F46E5; font-size: 12px; font-weight: 700; text-decoration: none;"><span>Solve</span><span>→</span></a>`;
          } else {
            solveAction = `<span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; background: #f1f5f9; color: #94a3b8; font-size: 11.5px; font-weight: 600;">Opens when Live</span>`;
          }

          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; color: #64748b; font-size: 12.5px; width: 20px;">Q${i + 1}</span>
                <div>
                  <span style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${escapeHtml(probName)}</span>
                  <span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: ${diffColor};">(${diff})</span>
                </div>
              </div>
              ${solveAction}
            </div>
          `;
        }).join('');
      }
    }

    // Configure Register / Enter button in Details modal
    if (btnRegisterContest) {
      if (status === 'live') {
        btnRegisterContest.innerHTML = `<span>${isRegistered ? 'Enter Contest Arena' : 'Register & Enter Contest'}</span><span>→</span>`;
      } else if (status === 'upcoming') {
        btnRegisterContest.innerHTML = `<span>${isRegistered ? 'Already Registered' : 'Register for Contest'}</span><span>→</span>`;
      } else {
        btnRegisterContest.innerHTML = `<span>View Contest Results</span><span>→</span>`;
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
    btnCloseDetails.addEventListener('click', () => modalDetails.classList.remove('open'));
    modalDetails.addEventListener('click', (e) => {
      if (e.target === modalDetails) modalDetails.classList.remove('open');
    });
  }

  if (btnRegisterContest && modalDetails) {
    btnRegisterContest.addEventListener('click', async () => {
      modalDetails.classList.remove('open');
      if (activeContestId) {
        handleContestAction(activeContestId);
      }
    });
  }

  // Initial load
  loadProblemsData().then(() => loadContestsData());
});
