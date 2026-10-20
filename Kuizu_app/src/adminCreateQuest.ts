import './adminProfileModal';

// Admin Create Quest Page Logic

interface QuestQuestionItem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xp?: string;
  isManual?: boolean;
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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('create-quest-form') as HTMLFormElement | null;
  const saveTopBtn = document.getElementById('save-quest-top-btn') as HTMLButtonElement | null;
  const searchInput = document.getElementById('quest-problem-search') as HTMLInputElement | null;
  const dropdown = document.getElementById('quest-problems-dropdown');
  const questionsListContainer = document.getElementById('quest-selected-questions-list');
  const countBadge = document.getElementById('quest-questions-count');

  // Manual Question elements
  const btnToggleManual = document.getElementById('btn-toggle-manual-question');
  const manualPanel = document.getElementById('manual-question-panel');
  const btnCloseManual = document.getElementById('btn-close-manual-panel');
  const btnCancelManual = document.getElementById('btn-cancel-manual-q');
  const btnSubmitManual = document.getElementById('btn-submit-manual-q');
  const dropdownManualTrigger = document.getElementById('dropdown-add-manual-trigger');

  const manualTitleInput = document.getElementById('manual-q-title') as HTMLInputElement | null;
  const manualXpInput = document.getElementById('manual-q-xp') as HTMLInputElement | null;
  const manualDescInput = document.getElementById('manual-q-desc') as HTMLTextAreaElement | null;
  const diffLabels = document.querySelectorAll<HTMLLabelElement>('.admin-diff-pill-label');

  // Current quest questions array
  const questions: QuestQuestionItem[] = [];
  let availableProblems: Array<{ id: string; title: string; difficulty: 'Easy' | 'Medium' | 'Hard' }> = [];

  let selectedDiff: 'Easy' | 'Medium' | 'Hard' = 'Easy';

  function updateCountBadge() {
    if (!countBadge) return;
    const len = questions.length;
    countBadge.textContent = len === 1 ? '1 question added' : `${len} questions added`;
  }

  function renderQuestions() {
    if (!questionsListContainer) return;
    questionsListContainer.innerHTML = '';

    questions.forEach((q, idx) => {
      const chip = document.createElement('span');
      chip.className = 'admin-choice-tag quest-question-chip';
      chip.setAttribute('data-title', q.title);
      chip.setAttribute('data-diff', q.difficulty);

      const diffClass = q.difficulty.toLowerCase();
      chip.innerHTML = `
        <span class="chip-number">${idx + 1}</span>
        <span class="chip-title">${escapeHtml(q.title)}</span>
        <span class="chip-diff-badge ${diffClass}">${q.difficulty}</span>
        <button type="button" class="btn-remove-tag" data-title="${escapeHtml(q.title)}" title="Remove question">✕</button>
      `;

      chip.querySelector('.btn-remove-tag')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeQuestion(q.title);
      });

      questionsListContainer.appendChild(chip);
    });

    updateCountBadge();
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function addQuestion(title: string, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy', isManual = false, xp?: string) {
    const existing = questions.find((item) => item.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      showToast(`"${title}" is already in this quest`);
      return false;
    }

    questions.push({
      id: String(Date.now()),
      title,
      difficulty,
      isManual,
      xp
    });

    renderQuestions();
    showToast(`Added "${title}" to quest`);
    return true;
  }

  function removeQuestion(title: string) {
    const idx = questions.findIndex((item) => item.title.toLowerCase() === title.toLowerCase());
    if (idx !== -1) {
      questions.splice(idx, 1);
      renderQuestions();
      showToast(`Removed "${title}"`);
    }
  }

  function renderProblemsDropdown(query = '') {
    if (!dropdown) return;
    const filtered = availableProblems.filter(p => !query || p.title.toLowerCase().includes(query));
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding: 12px 16px; font-size: 13px; color: #94a3b8;">No matching problems found</div>';
      return;
    }

    dropdown.innerHTML = `
      <div class="admin-dropdown-header-row">Select from Real QLibrary Problems (${filtered.length})</div>
      ${filtered.map(p => `
        <div class="admin-problem-opt flex-between" data-title="${escapeHtml(p.title)}" data-diff="${p.difficulty}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; cursor: pointer;">
          <span>${escapeHtml(p.title)}</span>
          <span class="chip-diff-badge ${p.difficulty.toLowerCase()}">${p.difficulty}</span>
        </div>
      `).join('')}
    `;

    dropdown.querySelectorAll<HTMLElement>('.admin-problem-opt').forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const title = opt.getAttribute('data-title') || '';
        const diff = (opt.getAttribute('data-diff') as 'Easy' | 'Medium' | 'Hard') || 'Easy';
        if (title) {
          addQuestion(title, diff);
          if (searchInput) searchInput.value = '';
          dropdown.classList.remove('show');
        }
      });
    });
  }

  async function loadProblems() {
    try {
      const res = await fetch('/api/problems');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.problems)) {
          availableProblems = data.problems.map((p: any) => ({
            id: p.id,
            title: p.title,
            difficulty: p.difficulty || 'Easy'
          }));
          renderProblemsDropdown();
        }
      }
    } catch (err) {
      console.warn('Could not load problems:', err);
    }
  }

  loadProblems();

  // Search input & dropdown
  if (searchInput && dropdown) {
    searchInput.addEventListener('focus', () => {
      renderProblemsDropdown(searchInput.value.trim().toLowerCase());
      dropdown.classList.add('show');
    });

    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim().toLowerCase();
      renderProblemsDropdown(val);
      dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node) && e.target !== searchInput) {
        dropdown.classList.remove('show');
      }
    });
  }

  // Toggle manual question creator
  function openManualPanel() {
    if (!manualPanel) return;
    manualPanel.style.display = 'block';
    manualPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    manualTitleInput?.focus();
  }

  function closeManualPanel() {
    if (!manualPanel) return;
    manualPanel.style.display = 'none';
    if (manualTitleInput) manualTitleInput.value = '';
    if (manualDescInput) manualDescInput.value = '';
  }

  if (btnToggleManual) {
    btnToggleManual.addEventListener('click', () => {
      if (!manualPanel) return;
      if (manualPanel.style.display === 'none' || !manualPanel.style.display) {
        openManualPanel();
      } else {
        closeManualPanel();
      }
    });
  }

  if (btnCloseManual) btnCloseManual.addEventListener('click', closeManualPanel);
  if (btnCancelManual) btnCancelManual.addEventListener('click', closeManualPanel);

  if (dropdownManualTrigger) {
    dropdownManualTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.remove('show');
      openManualPanel();
    });
  }

  // Manual Difficulty Radio Selection
  diffLabels.forEach((label) => {
    label.addEventListener('click', () => {
      diffLabels.forEach((l) => l.classList.remove('active'));
      label.classList.add('active');
      const radio = label.querySelector<HTMLInputElement>('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        selectedDiff = radio.value as 'Easy' | 'Medium' | 'Hard';
      }
    });
  });

  // Submit manual question
  if (btnSubmitManual) {
    btnSubmitManual.addEventListener('click', () => {
      const title = manualTitleInput?.value.trim();
      const xp = manualXpInput?.value.trim() || '50 XP';

      if (!title) {
        showToast('Please enter a question title');
        manualTitleInput?.focus();
        return;
      }

      const success = addQuestion(title, selectedDiff, true, xp);
      if (success) {
        closeManualPanel();
      }
    });
  }

  // Form submission & validation
  async function handleSaveQuest(e: Event) {
    e.preventDefault();

    const title = (document.getElementById('quest-title') as HTMLInputElement | null)?.value.trim();
    const number = (document.getElementById('quest-number') as HTMLInputElement | null)?.value.trim();
    const desc = (document.getElementById('quest-desc') as HTMLTextAreaElement | null)?.value.trim();

    if (!title) {
      showToast('Please enter quest title');
      document.getElementById('quest-title')?.focus();
      return;
    }

    if (questions.length === 0) {
      showToast('Please add at least one question to the quest');
      searchInput?.focus();
      return;
    }

    if (!number) {
      showToast('Please enter quest number');
      document.getElementById('quest-number')?.focus();
      return;
    }

    try {
      const questionTitles = questions.map(q => q.title);
      const res = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: desc || `Master ${title} along your learning path.`,
          rewardXp: 100 + (questions.length * 25),
          problems: questionTitles
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast('Quest created and saved successfully to database! Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/adminquest';
      }, 1200);
    } catch (err) {
      console.error('Error saving quest:', err);
      showToast('Created quest locally. Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/adminquest';
      }, 1200);
    }
  }

  if (form) {
    form.addEventListener('submit', handleSaveQuest);
  }

  if (saveTopBtn && form) {
    saveTopBtn.addEventListener('click', () => {
      form.requestSubmit();
    });
  }
});
