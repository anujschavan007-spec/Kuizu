import './adminProfileModal';

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
    if (lcCountEl) {
      if (currentUser.leetcode_solved && currentUser.leetcode_solved > 0) {
        lcCountEl.textContent = String(currentUser.leetcode_solved);
      } else {
        lcCountEl.textContent = '-';
      }
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

  function openCardEditor(type: 'cw' | 'hw' | 'lc' | 'quiz' | 'probs') {
    if (!currentUser || !cardModal) return;
    if (cardTypeInput) cardTypeInput.value = type;

    // Default visibility
    if (cardLinkGroup) cardLinkGroup.style.display = 'block';
    if (cardCountRow) cardCountRow.style.display = 'grid';
    if (cardTotalGroup) cardTotalGroup.style.display = 'block';
    if (btnOpenExternalLink) btnOpenExternalLink.style.display = 'none';

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
      if (cardLinkHelp) cardLinkHelp.textContent = 'Input link of student\'s LeetCode profile (e.g. https://leetcode.com/u/username/).';
      if (cardLinkInput) cardLinkInput.value = currentUser.leetcode_url || '';
      if (cardCompletedLabel) cardCompletedLabel.textContent = 'LeetCode Solved Count';
      if (cardCompletedInput) cardCompletedInput.value = String(currentUser.leetcode_solved || 0);
      if (cardTotalGroup) cardTotalGroup.style.display = 'none';

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
      } else if (type === 'quiz') {
        currentUser.quiz_level = parseInt(cardCompletedInput?.value || '0', 10);
      } else if (type === 'probs') {
        currentUser.problems_solved = parseInt(cardCompletedInput?.value || '0', 10);
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
        }
        renderStudent();
      }
      hideCardModal();
      showToast('Card updated successfully!');
    });
  }

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
});
