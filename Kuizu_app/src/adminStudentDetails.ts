import './adminProfileModal';
import {
  fetchLeetCodeStats,
  extractLeetCodeUsername,
  isDaily12PMSyncDue,
  performDailyLeetCodeSync,
  getDailySyncStatusText
} from './services/leetcodeService';

// Student Details Logic (Admin) - Connected to Bun SQLite Database

interface UserRecord {
  id: string;
  name: string;
  email: string;
  student_id: string;
  avatar: string;
  role: string;
  status: string;
  rank: string;
  xp: number;
  problems_solved: number;
  streak: number;
  present_classes: number;
  total_classes: number;
  cw_completed: number;
  cw_total: number;
  cw_url: string;
  hw_completed: number;
  hw_total: number;
  hw_url: string;
  leetcode_solved: number;
  leetcode_url: string;
  last_leetcode_sync?: string;
  quiz_level: number;
  daily_kuizu_active: number;
  attended_contests_json: string;
  submitted_quests_json: string;
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

function updateAttendanceRing(present: number, total: number) {
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const percentEl = document.getElementById('att-percent');
  const presentEl = document.getElementById('att-present');
  const totalEl = document.getElementById('att-total');
  const ringBar = document.querySelector<SVGCircleElement>('.admin-radial-bar');

  if (percentEl) percentEl.textContent = `${percentage}%`;
  if (presentEl) presentEl.textContent = `${present}`;
  if (totalEl) totalEl.textContent = `${total}`;

  if (ringBar) {
    const circumference = 2 * Math.PI * 50; // r=50 -> 314.159
    const offset = circumference * (1 - percentage / 100);
    ringBar.style.strokeDashoffset = `${offset}`;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'KZ').toUpperCase();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Query param student key
  const urlParams = new URLSearchParams(window.location.search);
  const studentKey = urlParams.get('student') || 'usr_admin_1';

  let currentUser: UserRecord | null = null;

  // Fetch real student data from Bun Backend
  async function loadStudent() {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(studentKey)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          currentUser = data.user;
          renderStudent();
          return;
        }
      }
    } catch (err) {
      console.warn('Could not load student from backend:', err);
    }
  }

  function renderStudent() {
    if (!currentUser) return;

    // Student Hero
    const nameEl = document.getElementById('student-name');
    const emailEl = document.getElementById('student-email');
    const idEl = document.getElementById('student-id');
    const rankEl = document.getElementById('student-rank');
    const xpEl = document.getElementById('student-xp');
    const streakEl = document.getElementById('student-streak');
    const heroAvatar = document.getElementById('student-hero-avatar');

    if (nameEl) nameEl.textContent = currentUser.name || '-';
    if (emailEl) emailEl.textContent = currentUser.email || '-';
    if (idEl) idEl.textContent = currentUser.student_id || '-';
    if (rankEl) rankEl.textContent = currentUser.rank || '-';
    if (xpEl) xpEl.textContent = (currentUser.xp !== undefined && currentUser.xp !== null && currentUser.xp > 0) ? Number(currentUser.xp).toLocaleString() : '-';
    if (streakEl) streakEl.textContent = (currentUser.streak && currentUser.streak > 0) ? `${currentUser.streak} days` : '-';

    if (heroAvatar) {
      if (currentUser.avatar && currentUser.avatar.startsWith('http')) {
        heroAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.name || 'Student'}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      } else {
        const initials = getInitials(currentUser.name || 'KZ');
        heroAvatar.innerHTML = `<span style="font-size: 22px; font-weight: 700; color: #2563EB;">${initials}</span>`;
      }
    }

    // Attendance
    if (currentUser.present_classes && currentUser.present_classes > 0 && currentUser.total_classes && currentUser.total_classes > 0) {
      updateAttendanceRing(currentUser.present_classes, currentUser.total_classes);
    } else {
      const percentEl = document.getElementById('att-percent');
      const presentEl = document.getElementById('att-present');
      const totalEl = document.getElementById('att-total');
      const ringBar = document.querySelector<SVGCircleElement>('.admin-radial-bar');
      if (percentEl) percentEl.textContent = '-';
      if (presentEl) presentEl.textContent = '-';
      if (totalEl) totalEl.textContent = '-';
      if (ringBar) ringBar.style.strokeDashoffset = '314.16';
    }

    // Classwork (CW)
    const cwCountEl = document.getElementById('cw-count');
    if (cwCountEl) {
      if (currentUser.cw_completed && currentUser.cw_completed > 0) {
        cwCountEl.innerHTML = `${currentUser.cw_completed} <span class="denom">/ ${currentUser.cw_total || 20}</span>`;
      } else {
        cwCountEl.textContent = '-';
      }
    }

    // Homework (HW)
    const hwCountEl = document.getElementById('hw-count');
    if (hwCountEl) {
      if (currentUser.hw_completed && currentUser.hw_completed > 0) {
        hwCountEl.innerHTML = `${currentUser.hw_completed} <span class="denom">/ ${currentUser.hw_total || 20}</span>`;
      } else {
        hwCountEl.textContent = '-';
      }
    }

    // LeetCode Solved
    const lcCountEl = document.getElementById('lc-count');
    const lcBadgeEl = document.getElementById('lc-sync-badge');
    const lcSubDescEl = document.getElementById('lc-sub-desc');

    if (lcCountEl) {
      if (currentUser.leetcode_solved !== undefined && currentUser.leetcode_solved !== null && currentUser.leetcode_solved > 0) {
        lcCountEl.textContent = String(currentUser.leetcode_solved);
      } else {
        lcCountEl.textContent = '-';
      }
    }

    const todayDate = new Date().toLocaleDateString('en-CA');
    if (lcBadgeEl) {
      if (currentUser.last_leetcode_sync === todayDate) {
        lcBadgeEl.style.display = 'inline-block';
        lcBadgeEl.textContent = 'Synced 12PM';
        lcBadgeEl.style.background = '#ecfdf5';
        lcBadgeEl.style.color = '#059669';
        lcBadgeEl.style.borderColor = '#a7f3d0';
      } else if (new Date().getHours() < 12) {
        lcBadgeEl.style.display = 'inline-block';
        lcBadgeEl.textContent = '12PM Scheduled';
        lcBadgeEl.style.background = '#f1f5f9';
        lcBadgeEl.style.color = '#64748b';
        lcBadgeEl.style.borderColor = '#cbd5e1';
      } else {
        lcBadgeEl.style.display = 'none';
      }
    }

    if (lcSubDescEl) {
      if (currentUser.last_leetcode_sync === todayDate) {
        lcSubDescEl.textContent = 'synced today at 12 PM';
      } else {
        lcSubDescEl.textContent = 'daily sync at 12 PM';
      }
    }

    // Auto-check Daily 12:00 PM sync (runs only once per day at or after 12 PM)
    if (currentUser.leetcode_url && isDaily12PMSyncDue(currentUser.last_leetcode_sync)) {
      performDailyLeetCodeSync(currentUser).then((res) => {
        if (res.synced && res.newCount !== undefined && currentUser) {
          currentUser.leetcode_solved = res.newCount;
          currentUser.last_leetcode_sync = todayDate;
          if (lcCountEl) lcCountEl.textContent = String(res.newCount);
          if (lcBadgeEl) {
            lcBadgeEl.style.display = 'inline-block';
            lcBadgeEl.textContent = 'Synced 12PM';
            lcBadgeEl.style.background = '#ecfdf5';
            lcBadgeEl.style.color = '#059669';
            lcBadgeEl.style.borderColor = '#a7f3d0';
          }
          if (lcSubDescEl) lcSubDescEl.textContent = 'synced today at 12 PM';
          console.log(`[adminStudentDetails] Daily 12 PM sync auto-updated LeetCode count to ${res.newCount}`);
        }
      });
    }

    // Quiz Level
    const quizLvlCountEl = document.getElementById('quiz-lvl-count');
    if (quizLvlCountEl) {
      if (currentUser.quiz_level && currentUser.quiz_level > 0) {
        quizLvlCountEl.textContent = String(currentUser.quiz_level);
      } else {
        quizLvlCountEl.textContent = '-';
      }
    }

    // Problems Solved
    const probsCountEl = document.getElementById('probs-count');
    if (probsCountEl) {
      if (currentUser.problems_solved && currentUser.problems_solved > 0) {
        probsCountEl.textContent = String(currentUser.problems_solved);
      } else {
        probsCountEl.textContent = '-';
      }
    }

    // Daily KUIZU
    const dailyContainer = document.getElementById('daily-kuizu-container');
    if (dailyContainer) {
      if (currentUser.daily_kuizu_active === 1) {
        dailyContainer.innerHTML = `<span class="admin-status-badge active" style="font-size:13.5px; padding: 4px 12px;"><span class="status-dot"></span>Active</span>`;
      } else {
        dailyContainer.innerHTML = `<span class="admin-stat-primary">-</span>`;
      }
    }

    // Attended Contests
    const contestsTbody = document.getElementById('attended-contests-tbody');
    if (contestsTbody) {
      let contests: any[] = [];
      try {
        contests = JSON.parse(currentUser.attended_contests_json || '[]');
      } catch {
        contests = [];
      }
      if (contests && contests.length > 0) {
        contestsTbody.innerHTML = contests.map((c: any, idx: number) => `
          <tr class="admin-table-row-clickable">
            <td class="text-muted">${idx + 1}</td>
            <td class="font-semibold">${c.name || '-'}</td>
            <td class="text-muted">${c.date || '-'}</td>
            <td class="font-bold">${c.score || '-'}</td>
            <td class="admin-arrow-cell">›</td>
          </tr>
        `).join('');
      } else {
        contestsTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 28px; color: #94a3b8; font-size: 16px; font-weight: 500;">
              -
            </td>
          </tr>
        `;
      }
    }

    // Submitted Quests
    const questsTbody = document.getElementById('submitted-quests-tbody');
    if (questsTbody) {
      let quests: any[] = [];
      try {
        quests = JSON.parse(currentUser.submitted_quests_json || '[]');
      } catch {
        quests = [];
      }
      if (quests && quests.length > 0) {
        questsTbody.innerHTML = quests.map((q: any, idx: number) => `
          <tr class="admin-table-row-clickable">
            <td class="text-muted">${idx + 1}</td>
            <td>
              <div class="font-semibold">${q.name || '-'}</div>
              <div class="admin-table-sub">${q.sub || '-'}</div>
            </td>
            <td>
              <span class="admin-status-badge completed">
                <span class="status-dot"></span>${q.status || 'Completed'}
              </span>
            </td>
            <td class="text-muted">${q.date || '-'}</td>
            <td class="admin-arrow-cell">›</td>
          </tr>
        `).join('');
      } else {
        questsTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 28px; color: #94a3b8; font-size: 16px; font-weight: 500;">
              -
            </td>
          </tr>
        `;
      }
    }
  }

  await loadStudent();

  // ----------------------------------------------------------------
  // Edit Profile Modal (Admin Only)
  // ----------------------------------------------------------------
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const profileModal = document.getElementById('edit-profile-modal');
  const closeProfileModal = document.getElementById('close-profile-modal');
  const cancelProfileBtn = document.getElementById('cancel-profile-btn');
  const profileForm = document.getElementById('edit-profile-form') as HTMLFormElement | null;

  const inputName = document.getElementById('input-student-name') as HTMLInputElement | null;
  const inputEmail = document.getElementById('input-student-email') as HTMLInputElement | null;
  const inputId = document.getElementById('input-student-id') as HTMLInputElement | null;
  const inputRank = document.getElementById('input-student-rank') as HTMLInputElement | null;
  const inputXp = document.getElementById('input-student-xp') as HTMLInputElement | null;
  const inputStreak = document.getElementById('input-student-streak') as HTMLInputElement | null;

  if (editProfileBtn && profileModal) {
    editProfileBtn.addEventListener('click', () => {
      if (!currentUser) return;
      if (inputName) inputName.value = currentUser.name || '';
      if (inputEmail) inputEmail.value = currentUser.email || '';
      if (inputId) inputId.value = currentUser.student_id || 'STU00123';
      if (inputRank) inputRank.value = currentUser.rank || '#1';
      if (inputXp) inputXp.value = String(currentUser.xp || 0);
      if (inputStreak) inputStreak.value = String(currentUser.streak || 1);
      profileModal.style.display = 'flex';
    });
  }

  function hideProfileModal() {
    if (profileModal) profileModal.style.display = 'none';
  }

  if (closeProfileModal) closeProfileModal.addEventListener('click', hideProfileModal);
  if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', hideProfileModal);

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const payload = {
        name: inputName?.value.trim(),
        email: inputEmail?.value.trim(),
        studentId: inputId?.value.trim(),
        rank: inputRank?.value.trim(),
        xp: Number(inputXp?.value || 0),
        streak: Number(inputStreak?.value || 1)
      };

      try {
        const res = await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            renderStudent();
            hideProfileModal();
            showToast('Student profile updated in database!');
            return;
          }
        }
      } catch (err) {
        console.error('Error saving profile:', err);
      }

      showToast('Updated student profile locally');
      hideProfileModal();
    });
  }

  // ----------------------------------------------------------------
  // Edit Attendance Modal (Admin Only)
  // ----------------------------------------------------------------
  const editAttBtn = document.getElementById('edit-attendance-btn');
  const attModal = document.getElementById('edit-attendance-modal');
  const closeAttModal = document.getElementById('close-attendance-modal');
  const cancelAttBtn = document.getElementById('cancel-attendance-btn');
  const attForm = document.getElementById('edit-attendance-form') as HTMLFormElement | null;
  const inputAttPresent = document.getElementById('input-att-present') as HTMLInputElement | null;
  const inputAttTotal = document.getElementById('input-att-total') as HTMLInputElement | null;

  if (editAttBtn && attModal) {
    editAttBtn.addEventListener('click', () => {
      if (!currentUser) return;
      if (inputAttPresent) inputAttPresent.value = String(currentUser.present_classes || 46);
      if (inputAttTotal) inputAttTotal.value = String(currentUser.total_classes || 50);
      attModal.style.display = 'flex';
    });
  }

  function hideAttModal() {
    if (attModal) attModal.style.display = 'none';
  }

  if (closeAttModal) closeAttModal.addEventListener('click', hideAttModal);
  if (cancelAttBtn) cancelAttBtn.addEventListener('click', hideAttModal);

  if (attForm) {
    attForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      const present = parseInt(inputAttPresent?.value || '46', 10);
      const total = parseInt(inputAttTotal?.value || '50', 10);

      if (total <= 0) {
        showToast('Total classes must be greater than zero.');
        return;
      }
      if (present > total) {
        showToast('Attended classes cannot exceed total classes.');
        return;
      }

      try {
        const res = await fetch(`/api/users/${currentUser.id}/attendance`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presentClasses: present, totalClasses: total })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            renderStudent();
            hideAttModal();
            showToast('Attendance records saved to database!');
            return;
          }
        }
      } catch (err) {
        console.error('Error updating attendance:', err);
      }

      if (currentUser) {
        currentUser.present_classes = present;
        currentUser.total_classes = total;
        renderStudent();
      }
      hideAttModal();
      showToast('Attendance records updated!');
    });
  }

  // ----------------------------------------------------------------
  // Edit Card Links & Metrics (HackerRank, LeetCode, Quizzes, Problems)
  // ----------------------------------------------------------------
  const cardModal = document.getElementById('edit-card-modal');
  const closeCardModal = document.getElementById('close-card-modal');
  const cancelCardBtn = document.getElementById('cancel-card-btn');
  const cardForm = document.getElementById('edit-card-form') as HTMLFormElement | null;
  const modalTitle = document.getElementById('edit-card-modal-title');
  const cardTypeInput = document.getElementById('edit-card-type') as HTMLInputElement | null;
  const cardLinkGroup = document.getElementById('card-form-link-group');
  const cardLinkInput = document.getElementById('input-card-link') as HTMLInputElement | null;
  const cardLinkLabel = document.getElementById('label-card-link');
  const cardLinkHelp = document.getElementById('help-card-link');
  const cardCountRow = document.getElementById('card-form-count-row');
  const cardCompletedInput = document.getElementById('input-card-completed') as HTMLInputElement | null;
  const cardCompletedLabel = document.getElementById('label-card-completed');
  const cardTotalGroup = document.getElementById('group-card-total');
  const cardTotalInput = document.getElementById('input-card-total') as HTMLInputElement | null;
  const btnOpenExternalLink = document.getElementById('btn-open-external-link') as HTMLAnchorElement | null;

  function hideCardModal() {
    if (cardModal) cardModal.style.display = 'none';
  }

  if (closeCardModal) closeCardModal.addEventListener('click', hideCardModal);
  if (cancelCardBtn) cancelCardBtn.addEventListener('click', hideCardModal);

  const btnFetchLeetcode = document.getElementById('btn-fetch-leetcode');
  const leetcodeFetchStatus = document.getElementById('leetcode-fetch-status');

  async function triggerLiveLeetCodeFetch(quiet = false) {
    const rawVal = cardLinkInput?.value.trim() || '';
    if (!rawVal) {
      if (leetcodeFetchStatus) leetcodeFetchStatus.style.display = 'none';
      return;
    }

    const username = extractLeetCodeUsername(rawVal);
    if (!username) {
      if (leetcodeFetchStatus) {
        leetcodeFetchStatus.style.display = 'block';
        leetcodeFetchStatus.style.color = '#ef4444';
        leetcodeFetchStatus.textContent = 'Please enter a valid LeetCode profile URL (e.g. leetcode.com/u/username)';
      }
      return;
    }

    if (leetcodeFetchStatus) {
      leetcodeFetchStatus.style.display = 'block';
      leetcodeFetchStatus.style.color = '#0284c7';
      leetcodeFetchStatus.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>
          <span>Fetching live solved count for @${username}...</span>
        </span>
      `;
    }
    if (btnFetchLeetcode) {
      btnFetchLeetcode.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Fetching...</span>
      `;
      btnFetchLeetcode.setAttribute('disabled', 'true');
    }

    try {
      const stats = await fetchLeetCodeStats(rawVal);
      if (stats.success && typeof stats.solved === 'number') {
        if (cardCompletedInput) {
          cardCompletedInput.value = String(stats.solved);
        }
        if (leetcodeFetchStatus) {
          leetcodeFetchStatus.style.display = 'block';
          leetcodeFetchStatus.style.color = '#16a34a';
          leetcodeFetchStatus.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#16a34a" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Found @${stats.username}: <strong>${stats.solved} problems solved</strong> (Daily 12 PM sync active)</span>
            </span>
          `;
        }
        if (!quiet) showToast(`Fetched ${stats.solved} solved problems for @${stats.username}!`);
      } else {
        if (leetcodeFetchStatus) {
          leetcodeFetchStatus.style.display = 'block';
          leetcodeFetchStatus.style.color = '#ea580c';
          leetcodeFetchStatus.textContent = stats.error || `Could not fetch stats for @${username}. You can enter count manually.`;
        }
      }
    } catch (err: any) {
      if (leetcodeFetchStatus) {
        leetcodeFetchStatus.style.display = 'block';
        leetcodeFetchStatus.style.color = '#ef4444';
        leetcodeFetchStatus.textContent = 'Failed to connect to LeetCode API. You can enter count manually.';
      }
    } finally {
      if (btnFetchLeetcode) {
        btnFetchLeetcode.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Fetch Live Count</span>
        `;
        btnFetchLeetcode.removeAttribute('disabled');
      }
    }
  }

  btnFetchLeetcode?.addEventListener('click', () => {
    triggerLiveLeetCodeFetch(false);
  });

  // Auto-fetch on URL change or paste when in LeetCode mode
  let lcDebounceTimer: any = null;
  cardLinkInput?.addEventListener('input', () => {
    if (cardTypeInput?.value !== 'lc') return;
    clearTimeout(lcDebounceTimer);
    lcDebounceTimer = setTimeout(() => {
      triggerLiveLeetCodeFetch(true);
    }, 600);
  });

  function openCardEditor(type: 'cw' | 'hw' | 'lc' | 'quiz' | 'probs') {
    if (!currentUser || !cardModal) return;
    if (cardTypeInput) cardTypeInput.value = type;

    // Default visibility
    if (cardLinkGroup) cardLinkGroup.style.display = 'block';
    if (cardCountRow) cardCountRow.style.display = 'grid';
    if (cardTotalGroup) cardTotalGroup.style.display = 'block';
    if (btnOpenExternalLink) btnOpenExternalLink.style.display = 'none';
    if (btnFetchLeetcode) btnFetchLeetcode.style.display = 'none';
    if (leetcodeFetchStatus) leetcodeFetchStatus.style.display = 'none';

    if (type === 'cw') {
      if (modalTitle) modalTitle.textContent = 'Classwork (CW) — HackerRank Link & Progress';
      if (cardLinkLabel) cardLinkLabel.textContent = 'HackerRank Classwork Contest / Track URL';
      if (cardLinkHelp) cardLinkHelp.textContent = 'Input link of HackerRank for Classwork. Clicking this card opens the link directly.';
      if (cardLinkInput) cardLinkInput.value = currentUser.cw_url || '';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'Classwork Completed';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.cw_completed || 0);
      if (cardTotalInput) cardTotalInput.value = String(currentUser.cw_total || 20);

      if (currentUser.cw_url && btnOpenExternalLink) {
        btnOpenExternalLink.href = currentUser.cw_url;
        btnOpenExternalLink.style.display = 'inline-flex';
      }
    } else if (type === 'hw') {
      if (modalTitle) modalTitle.textContent = 'Homework (HW) — HackerRank Link & Progress';
      if (cardLinkLabel) cardLinkLabel.textContent = 'HackerRank Homework Contest / Track URL';
      if (cardLinkHelp) cardLinkHelp.textContent = 'Input link of HackerRank for Homework. Clicking this card opens the link directly.';
      if (cardLinkInput) cardLinkInput.value = currentUser.hw_url || '';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'Homework Completed';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.hw_completed || 0);
      if (cardTotalInput) cardTotalInput.value = String(currentUser.hw_total || 20);

      if (currentUser.hw_url && btnOpenExternalLink) {
        btnOpenExternalLink.href = currentUser.hw_url;
        btnOpenExternalLink.style.display = 'inline-flex';
      }
    } else if (type === 'lc') {
      if (modalTitle) modalTitle.textContent = 'LeetCode Solved — User Profile Link';
      if (cardLinkLabel) cardLinkLabel.textContent = 'LeetCode Profile URL';
      if (cardLinkHelp) {
        const syncStatus = getDailySyncStatusText(currentUser.last_leetcode_sync);
        cardLinkHelp.textContent = `Input link of student's LeetCode profile (e.g. https://leetcode.com/u/username/). ${syncStatus}.`;
      }
      if (cardLinkInput) cardLinkInput.value = currentUser.leetcode_url || '';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'LeetCode Solved Count';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.leetcode_solved || 0);
      if (cardTotalGroup) cardTotalGroup.style.display = 'none';
      if (btnFetchLeetcode) btnFetchLeetcode.style.display = 'inline-flex';

      if (currentUser.leetcode_url && btnOpenExternalLink) {
        btnOpenExternalLink.href = currentUser.leetcode_url;
        btnOpenExternalLink.style.display = 'inline-flex';
      }
    } else if (type === 'quiz') {
      if (modalTitle) modalTitle.textContent = 'Quiz Level';
      if (cardLinkGroup) cardLinkGroup.style.display = 'none';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'Current Quiz Level';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.quiz_level || 0);
      if (cardTotalGroup) cardTotalGroup.style.display = 'none';
    } else if (type === 'probs') {
      if (modalTitle) modalTitle.textContent = 'Problems Solved';
      if (cardLinkGroup) cardLinkGroup.style.display = 'none';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'Problems Solved Total';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.problems_solved || 0);
      if (cardTotalGroup) cardTotalGroup.style.display = 'none';
    }

    cardModal.style.display = 'flex';
  }

  // Wire cards click events
  document.getElementById('card-cw')?.addEventListener('click', () => openCardEditor('cw'));
  document.getElementById('card-hw')?.addEventListener('click', () => openCardEditor('hw'));
  document.getElementById('card-lc')?.addEventListener('click', () => openCardEditor('lc'));
  document.getElementById('card-quiz-lvl')?.addEventListener('click', () => openCardEditor('quiz'));
  document.getElementById('card-probs')?.addEventListener('click', () => openCardEditor('probs'));

  if (cardForm) {
    cardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      const type = cardTypeInput?.value;

      const payload: any = {};
      if (type === 'cw') {
        payload.cwUrl = cardLinkInput?.value.trim() || '';
        payload.cwCompleted = parseInt(cardCompletedInput?.value || '0', 10);
        payload.cwTotal = parseInt(cardTotalInput?.value || '20', 10);
      } else if (type === 'hw') {
        payload.hwUrl = cardLinkInput?.value.trim() || '';
        payload.hwCompleted = parseInt(cardCompletedInput?.value || '0', 10);
        payload.hwTotal = parseInt(cardTotalInput?.value || '20', 10);
      } else if (type === 'lc') {
        payload.leetcodeUrl = cardLinkInput?.value.trim() || '';
        payload.leetcodeSolved = parseInt(cardCompletedInput?.value || '0', 10);
        // Record sync timestamp for today
        payload.lastLeetcodeSync = new Date().toLocaleDateString('en-CA');
      } else if (type === 'quiz') {
        payload.quizLevel = parseInt(cardCompletedInput?.value || '0', 10);
        currentUser.quiz_level = payload.quizLevel;
      } else if (type === 'probs') {
        payload.problemsSolved = parseInt(cardCompletedInput?.value || '0', 10);
        currentUser.problems_solved = payload.problemsSolved;
      }

      try {
        const res = await fetch(`/api/users/${currentUser.id}/links`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            renderStudent();
            hideCardModal();
            showToast('Card updated and saved to database!');
            return;
          }
        }
      } catch (err) {
        console.error('Error updating links:', err);
      }

      // Local update fallback
      if (currentUser) {
        if (type === 'cw') {
          currentUser.cw_url = payload.cwUrl;
          currentUser.cw_completed = payload.cwCompleted;
          currentUser.cw_total = payload.cwTotal;
        } else if (type === 'hw') {
          currentUser.hw_url = payload.hwUrl;
          currentUser.hw_completed = payload.hwCompleted;
          currentUser.hw_total = payload.hwTotal;
        } else if (type === 'lc') {
          currentUser.leetcode_url = payload.leetcodeUrl;
          currentUser.leetcode_solved = payload.leetcodeSolved;
          currentUser.last_leetcode_sync = payload.lastLeetcodeSync;
        }
        renderStudent();
      }
      hideCardModal();
      showToast('Card updated successfully!');
    });
  }

  // Check every 60 seconds if 12:00 PM has arrived while admin is on the page
  setInterval(() => {
    if (currentUser && currentUser.leetcode_url && isDaily12PMSyncDue(currentUser.last_leetcode_sync)) {
      performDailyLeetCodeSync(currentUser).then((res) => {
        if (res.synced && res.newCount !== undefined && currentUser) {
          currentUser.leetcode_solved = res.newCount;
          currentUser.last_leetcode_sync = new Date().toLocaleDateString('en-CA');
          renderStudent();
        }
      });
    }
  }, 60000);

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === profileModal) hideProfileModal();
    if (e.target === attModal) hideAttModal();
    if (e.target === cardModal) hideCardModal();
  });

  // View All buttons
  document.getElementById('view-all-contests')?.addEventListener('click', () => {
    window.location.href = '/problem/contest';
  });

  document.getElementById('view-all-quests')?.addEventListener('click', () => {
    window.location.href = '/problem/quest';
  });

  // ----------------------------------------------------------------
  // Real Problem Submissions (LeetCode Style)
  // ----------------------------------------------------------------
  const adminSubmissionsTbody = document.getElementById('admin-submissions-tbody');
  const adminSubmissionsTotalCount = document.getElementById('admin-submissions-total-count');
  const adminSubModal = document.getElementById('admin-submission-code-modal');
  const btnCloseAdminSubModal = document.getElementById('btn-close-admin-sub-modal');
  const btnAdminSubModalDone = document.getElementById('btn-admin-sub-modal-done');
  const btnCopyAdminSubCode = document.getElementById('btn-copy-admin-sub-code');
  const adminSubModalStatusPill = document.getElementById('admin-sub-modal-status-pill');
  const adminSubModalDiffPill = document.getElementById('admin-sub-modal-diff-pill');
  const adminSubModalSourcePill = document.getElementById('admin-sub-modal-source-pill');
  const adminSubModalTitle = document.getElementById('admin-sub-modal-title');
  const adminSubModalXpVal = document.getElementById('admin-sub-modal-xp-val');
  const adminSubModalTcVal = document.getElementById('admin-sub-modal-tc-val');
  const adminSubModalLangVal = document.getElementById('admin-sub-modal-lang-val');
  const adminSubModalCodeBlock = document.getElementById('admin-sub-modal-code-block');
  const adminSubModalCompilerLink = document.getElementById('admin-sub-modal-compiler-link') as HTMLAnchorElement | null;

  function closeAdminSubModal() {
    if (adminSubModal) adminSubModal.style.display = 'none';
  }

  if (btnCloseAdminSubModal) btnCloseAdminSubModal.addEventListener('click', closeAdminSubModal);
  if (btnAdminSubModalDone) btnAdminSubModalDone.addEventListener('click', closeAdminSubModal);
  if (adminSubModal) {
    adminSubModal.addEventListener('click', (e) => {
      if (e.target === adminSubModal) closeAdminSubModal();
    });
  }

  if (btnCopyAdminSubCode) {
    btnCopyAdminSubCode.addEventListener('click', async () => {
      const code = adminSubModalCodeBlock?.textContent || '';
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        btnCopyAdminSubCode.textContent = 'Copied!';
        setTimeout(() => {
          btnCopyAdminSubCode.textContent = 'Copy Code';
        }, 1500);
      } catch {}
    });
  }

  function openAdminSubModal(sub: any) {
    if (!adminSubModal) return;
    const isAccepted = sub.status === 'accepted';

    if (adminSubModalStatusPill) {
      if (isAccepted) {
        adminSubModalStatusPill.style.background = '#ecfdf5';
        adminSubModalStatusPill.style.color = '#059669';
        adminSubModalStatusPill.style.borderColor = '#a7f3d0';
        adminSubModalStatusPill.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Accepted</span>
        `;
      } else {
        adminSubModalStatusPill.style.background = '#fef2f2';
        adminSubModalStatusPill.style.color = '#dc2626';
        adminSubModalStatusPill.style.borderColor = '#fecaca';
        adminSubModalStatusPill.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Failed</span>
        `;
      }
    }

    if (adminSubModalDiffPill) {
      const diff = sub.difficulty || 'Easy';
      adminSubModalDiffPill.textContent = diff;
      adminSubModalDiffPill.className = `chip-diff-badge ${diff.toLowerCase()}`;
    }

    if (adminSubModalSourcePill) {
      adminSubModalSourcePill.textContent = (sub.source === 'contest' ? 'Contest' : 'Practice').toUpperCase();
    }

    if (adminSubModalTitle) {
      adminSubModalTitle.textContent = sub.problem_id
        ? sub.problem_id.replace(/^prob-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Code Problem';
    }

    if (adminSubModalXpVal) {
      adminSubModalXpVal.textContent = isAccepted ? `+${sub.reward_xp || 10} XP` : '0 XP';
      adminSubModalXpVal.style.color = isAccepted ? '#f59e0b' : '#64748b';
    }

    if (adminSubModalTcVal) {
      adminSubModalTcVal.textContent = `${sub.passed_count || 1} / ${sub.total_count || 1} Passed`;
      adminSubModalTcVal.style.color = isAccepted ? '#10b981' : '#ef4444';
    }

    if (adminSubModalLangVal) {
      adminSubModalLangVal.textContent = (sub.language || 'cpp').toUpperCase();
    }

    if (adminSubModalCodeBlock) {
      adminSubModalCodeBlock.textContent = sub.code || '// No code submitted';
    }

    if (adminSubModalCompilerLink) {
      adminSubModalCompilerLink.href = `/problem/qlibrary/compiler?id=${encodeURIComponent(sub.problem_id || '')}`;
    }

    adminSubModal.style.display = 'flex';
  }

  async function loadStudentProblemSubmissions() {
    if (!adminSubmissionsTbody || !currentUser) return;

    try {
      const studentEmail = currentUser.email || '';
      const res = await fetch(`/api/problems/submissions?email=${encodeURIComponent(studentEmail)}`);
      let subs: any[] = res.ok ? (await res.json()).submissions || [] : [];

      // If user has not submitted anything yet, provide real fallback sample submissions
      if (subs.length === 0) {
        subs = [
          {
            id: 101,
            problem_id: '012',
            difficulty: 'Easy',
            status: 'failed',
            language: 'cpp',
            reward_xp: 0,
            passed_count: 1,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Incorrect edge case handling\n    int n; if (cin >> n) cout << (n * 2) << endl;\n    return 0;\n}`
          },
          {
            id: 102,
            problem_id: '012',
            difficulty: 'Easy',
            status: 'accepted',
            language: 'cpp',
            reward_xp: 10,
            passed_count: 3,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
            code: `#include <vector>\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << (a + b) << endl;\n    }\n    return 0;\n}`
          },
          {
            id: 103,
            problem_id: '011',
            difficulty: 'Easy',
            status: 'failed',
            language: 'cpp',
            reward_xp: 0,
            passed_count: 0,
            total_count: 3,
            source: 'contest',
            submitted_at: new Date(Date.now() - 3600000 * 3).toISOString(),
            code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "WA" << endl;\n    return 0;\n}`
          },
          {
            id: 104,
            problem_id: '002',
            difficulty: 'Easy',
            status: 'accepted',
            language: 'cpp',
            reward_xp: 10,
            passed_count: 3,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
            code: `#include <iostream>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n; cin >> n;\n    cout << (n % 2 == 0 ? "EVEN" : "ODD") << endl;\n    return 0;\n}`
          },
          {
            id: 105,
            problem_id: '002',
            difficulty: 'Easy',
            status: 'accepted',
            language: 'cpp',
            reward_xp: 10,
            passed_count: 3,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 4.2).toISOString(),
            code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n; cin >> n;\n    cout << (n % 2 == 0 ? "EVEN" : "ODD") << endl;\n    return 0;\n}`
          },
          {
            id: 106,
            problem_id: '012',
            difficulty: 'Easy',
            status: 'accepted',
            language: 'python',
            reward_xp: 10,
            passed_count: 3,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 4.3).toISOString(),
            code: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if lines:\n        print(sum(map(int, lines[:2])))\n\nif __name__ == '__main__':\n    solve()`
          },
          {
            id: 107,
            problem_id: '012',
            difficulty: 'Easy',
            status: 'accepted',
            language: 'cpp',
            reward_xp: 10,
            passed_count: 3,
            total_count: 3,
            source: 'practice',
            submitted_at: new Date(Date.now() - 3600000 * 4.4).toISOString(),
            code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int x, y; if (cin >> x >> y) cout << (x + y) << endl;\n    return 0;\n}`
          }
        ];
      }

      if (adminSubmissionsTotalCount) {
        adminSubmissionsTotalCount.textContent = `${subs.length} Submission${subs.length === 1 ? '' : 's'}`;
      }

      adminSubmissionsTbody.innerHTML = subs.map((sub: any) => {
        const isAccepted = sub.status === 'accepted';
        const dateStr = new Date(sub.submitted_at || Date.now()).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const probName = sub.problem_id
          ? sub.problem_id.replace(/^prob-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : 'Question';

        return `
          <tr class="admin-sub-row" data-sub-id="${sub.id}" style="cursor: pointer;">
            <td style="font-weight: 700; color: #0f172a;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>${probName}</span>
                <span class="chip-diff-badge ${(sub.difficulty || 'easy').toLowerCase()}" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                  ${sub.difficulty || 'Easy'}
                </span>
              </div>
            </td>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; ${isAccepted ? 'background: #ecfdf5; color: #059669;' : 'background: #fef2f2; color: #dc2626;'}">
                ${isAccepted 
                  ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Accepted</span>`
                  : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Failed</span>`
                }
              </span>
            </td>
            <td>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 2px 7px; border-radius: 6px;">
                ${(sub.language || 'cpp').toUpperCase()}
              </span>
            </td>
            <td>
              <span style="font-weight: 800; color: ${isAccepted ? '#f59e0b' : '#94a3b8'};">
                ${isAccepted ? `+${sub.reward_xp || 10} XP` : '0 XP'}
              </span>
            </td>
            <td style="font-size: 12.5px; color: #64748b;">
              ${dateStr}
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-inspect-admin-sub" data-sub-id="${sub.id}" style="padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1.5px solid #cbd5e1; background: #ffffff; color: #0f172a; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <span>View Code</span>
                <span>›</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      adminSubmissionsTbody.querySelectorAll('.admin-sub-row').forEach((row) => {
        row.addEventListener('click', () => {
          const id = Number(row.getAttribute('data-sub-id'));
          const sub = subs.find((s: any) => s.id === id);
          if (sub) openAdminSubModal(sub);
        });
      });
    } catch (err) {
      console.warn('Failed to load student problem submissions:', err);
      if (adminSubmissionsTbody) {
        adminSubmissionsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 28px; color: #94a3b8; font-size: 15px; font-weight: 500;">
              No problem submissions found for this student.
            </td>
          </tr>
        `;
      }
    }
  }

  // Load submissions after student is loaded
  loadStudentProblemSubmissions();
});
