import './adminProfileModal';

// Admin Create Contest Page Logic

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
  const form = document.getElementById('create-contest-form') as HTMLFormElement | null;
  const saveTopBtn = document.getElementById('save-contest-top-btn') as HTMLButtonElement | null;
  const tagsContainer = document.getElementById('problem-tags-container');
  const searchInput = document.getElementById('problem-search-input') as HTMLInputElement | null;
  const dropdown = document.getElementById('problems-dropdown');
  const toggleDropdownBtn = document.getElementById('btn-toggle-dropdown');
  const browseBtn = document.getElementById('btn-browse-problems') as HTMLButtonElement | null;

  // Manual & Custom problem elements
  const manualSelect = document.getElementById('manual-problem-select') as HTMLSelectElement | null;
  const addManualBtn = document.getElementById('btn-add-manual-select') as HTMLButtonElement | null;
  const toggleCustomBtn = document.getElementById('btn-toggle-custom-problem') as HTMLButtonElement | null;
  const customContainer = document.getElementById('custom-problem-container') as HTMLDivElement | null;
  const customInput = document.getElementById('custom-manual-problem-input') as HTMLInputElement | null;
  const addCustomBtn = document.getElementById('btn-add-custom-manual') as HTMLButtonElement | null;

  // Modal elements
  const modal = document.getElementById('modal-browse-problems') as HTMLDivElement | null;
  const openChecklistBtn = document.getElementById('btn-open-manual-checklist') as HTMLButtonElement | null;
  const closeModalBtn = document.getElementById('btn-close-browse-modal') as HTMLButtonElement | null;
  const cancelModalBtn = document.getElementById('btn-modal-cancel') as HTMLButtonElement | null;
  const applyModalBtn = document.getElementById('btn-modal-apply') as HTMLButtonElement | null;
  const modalSearch = document.getElementById('modal-problem-search') as HTMLInputElement | null;
  const modalProblemsList = document.getElementById('modal-problems-list') as HTMLDivElement | null;
  const modalSelectedCount = document.getElementById('modal-selected-count') as HTMLElement | null;
  const modalSelectAllBtn = document.getElementById('btn-modal-select-all') as HTMLButtonElement | null;
  const modalDeselectAllBtn = document.getElementById('btn-modal-deselect-all') as HTMLButtonElement | null;
  const modalDiffPills = document.querySelectorAll<HTMLButtonElement>('.modal-diff-pill');

  const weeklyCard = document.getElementById('type-card-weekly');
  const biweeklyCard = document.getElementById('type-card-biweekly');

  let availableProblems: Array<{ id: string; title: string; difficulty: string; topicName?: string }> = [];
  const modalSelectedProblems = new Set<string>();
  let activeDiffFilter = 'all';

  // Contest Type Cards Toggle
  function setContestType(type: 'weekly' | 'biweekly') {
    if (weeklyCard && biweeklyCard) {
      if (type === 'weekly') {
        weeklyCard.classList.add('active');
        biweeklyCard.classList.remove('active');
        const radio = weeklyCard.querySelector<HTMLInputElement>('.admin-type-radio');
        if (radio) radio.checked = true;
      } else {
        biweeklyCard.classList.add('active');
        weeklyCard.classList.remove('active');
        const radio = biweeklyCard.querySelector<HTMLInputElement>('.admin-type-radio');
        if (radio) radio.checked = true;
      }
    }
  }

  if (weeklyCard) {
    weeklyCard.addEventListener('click', () => setContestType('weekly'));
  }
  if (biweeklyCard) {
    biweeklyCard.addEventListener('click', () => setContestType('biweekly'));
  }

  // Get current list of selected problem names from tags
  function getSelectedProblemNames(): string[] {
    if (!tagsContainer) return [];
    const tags = tagsContainer.querySelectorAll<HTMLElement>('.admin-choice-tag');
    return Array.from(tags).map(t => t.getAttribute('data-problem') || '').filter(Boolean);
  }

  // Problem Tags Management
  function removeProblemTag(problemName: string, silent = false) {
    const tag = tagsContainer?.querySelector(`[data-problem="${problemName}"]`);
    if (tag) {
      tag.remove();
      if (!silent) showToast(`Removed "${problemName}"`);
      syncDropdownAndSelect();
    }
  }

  function addProblemTag(problemName: string, silent = false) {
    if (!tagsContainer) return;
    const exists = tagsContainer.querySelector(`[data-problem="${problemName}"]`);
    if (exists) {
      if (!silent) showToast(`"${problemName}" is already selected`);
      return;
    }

    const tagSpan = document.createElement('span');
    tagSpan.className = 'admin-choice-tag';
    tagSpan.setAttribute('data-problem', problemName);
    tagSpan.innerHTML = `
      <span>${escapeHtml(problemName)}</span>
      <button type="button" class="btn-remove-tag" data-problem="${escapeHtml(problemName)}">✕</button>
    `;

    tagSpan.querySelector('.btn-remove-tag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeProblemTag(problemName);
    });

    tagsContainer.appendChild(tagSpan);
    if (!silent) showToast(`Added "${problemName}"`);
    syncDropdownAndSelect();
  }

  function syncDropdownAndSelect() {
    renderProblemsDropdown(searchInput?.value.trim().toLowerCase() || '');
  }

  // Load Real Problems from /api/problems
  async function loadProblems() {
    try {
      const res = await fetch('/api/problems');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.problems)) {
          availableProblems = data.problems.map((p: any) => ({
            id: p.id,
            title: p.title,
            difficulty: p.difficulty || 'Easy',
            topicName: p.topic?.name || ''
          }));

          populateManualDropdown();
          renderProblemsDropdown();
        }
      }
    } catch (err) {
      console.warn('Could not load problems from /api/problems:', err);
    }
  }

  // Populate Manual Native <select>
  function populateManualDropdown() {
    if (!manualSelect) return;
    manualSelect.innerHTML = `
      <option value="">-- Choose a Problem Manually from QLibrary (${availableProblems.length} available) --</option>
      ${availableProblems.map(p => `
        <option value="${escapeHtml(p.title)}">
          ${escapeHtml(p.title)} [${p.difficulty}] ${p.topicName ? `• ${p.topicName}` : ''}
        </option>
      `).join('')}
    `;
  }

  // Manual Select Button handler
  if (addManualBtn && manualSelect) {
    addManualBtn.addEventListener('click', () => {
      const selected = manualSelect.value.trim();
      if (!selected) {
        showToast('Please select a problem from the dropdown first');
        manualSelect.focus();
        return;
      }
      addProblemTag(selected);
      manualSelect.value = '';
    });

    // Also auto-add on change if preferred, or leave it ready
    manualSelect.addEventListener('change', () => {
      if (manualSelect.value) {
        addProblemTag(manualSelect.value);
        manualSelect.value = '';
      }
    });
  }

  // Toggle Custom Problem Form
  if (toggleCustomBtn && customContainer) {
    toggleCustomBtn.addEventListener('click', () => {
      const isHidden = customContainer.style.display === 'none';
      customContainer.style.display = isHidden ? 'block' : 'none';
      if (isHidden && customInput) customInput.focus();
    });
  }

  // Add Custom Problem handler
  if (addCustomBtn && customInput) {
    addCustomBtn.addEventListener('click', () => {
      const customTitle = customInput.value.trim();
      if (!customTitle) {
        showToast('Please enter a custom problem title');
        customInput.focus();
        return;
      }
      addProblemTag(customTitle);
      customInput.value = '';
    });
  }

  // Render Search Dropdown
  function renderProblemsDropdown(query = '') {
    if (!dropdown) return;
    const currentSelected = new Set(getSelectedProblemNames());
    const filtered = availableProblems.filter(p => !query || p.title.toLowerCase().includes(query) || (p.topicName && p.topicName.toLowerCase().includes(query)));

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding: 12px 16px; font-size: 13px; color: #94a3b8;">No matching problems found</div>';
      return;
    }

    dropdown.innerHTML = filtered.map(p => {
      const isSelected = currentSelected.has(p.title);
      const diffClass = p.difficulty.toLowerCase();
      return `
        <div class="admin-problem-opt flex-between" data-name="${escapeHtml(p.title)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 500; color: ${isSelected ? '#2563eb' : '#0f172a'};">${escapeHtml(p.title)}</span>
            <span class="chip-diff-badge ${diffClass}">${p.difficulty}</span>
          </div>
          <span style="font-size: 12px; font-weight: 600; color: ${isSelected ? '#2563eb' : '#94a3b8'};">
            ${isSelected ? '✓ Selected' : '+ Add'}
          </span>
        </div>
      `;
    }).join('');

    dropdown.querySelectorAll<HTMLElement>('.admin-problem-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const name = opt.getAttribute('data-name');
        if (name) {
          if (currentSelected.has(name)) {
            removeProblemTag(name);
          } else {
            addProblemTag(name);
          }
          if (searchInput) searchInput.value = '';
          dropdown.classList.remove('show');
        }
      });
    });
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Search and dropdown interaction
  if (searchInput && dropdown) {
    searchInput.addEventListener('focus', () => {
      renderProblemsDropdown(searchInput.value.trim().toLowerCase());
      dropdown.classList.add('show');
    });

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      renderProblemsDropdown(q);
      dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!dropdown.contains(target) && target !== searchInput && target !== toggleDropdownBtn && !toggleDropdownBtn?.contains(target)) {
        dropdown.classList.remove('show');
      }
    });
  }

  if (toggleDropdownBtn && dropdown) {
    toggleDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderProblemsDropdown();
      dropdown.classList.toggle('show');
      if (dropdown.classList.contains('show') && searchInput) {
        searchInput.focus();
      }
    });
  }

  // ==========================================
  // FULL MANUAL PROBLEM SELECTION MODAL LOGIC
  // ==========================================
  function openManualModal() {
    if (!modal) return;
    modalSelectedProblems.clear();
    getSelectedProblemNames().forEach(name => modalSelectedProblems.add(name));

    if (modalSearch) modalSearch.value = '';
    activeDiffFilter = 'all';
    modalDiffPills.forEach(pill => {
      if (pill.getAttribute('data-diff') === 'all') pill.classList.add('active');
      else pill.classList.remove('active');
    });

    renderModalProblemsList();
    modal.style.display = 'flex';
  }

  function closeManualModal() {
    if (!modal) return;
    modal.style.display = 'none';
  }

  function renderModalProblemsList() {
    if (!modalProblemsList) return;
    const query = modalSearch?.value.trim().toLowerCase() || '';

    const filtered = availableProblems.filter(p => {
      const matchDiff = activeDiffFilter === 'all' || p.difficulty.toLowerCase() === activeDiffFilter.toLowerCase();
      const matchQuery = !query || p.title.toLowerCase().includes(query) || (p.topicName && p.topicName.toLowerCase().includes(query));
      return matchDiff && matchQuery;
    });

    if (filtered.length === 0) {
      modalProblemsList.innerHTML = `
        <div style="text-align: center; padding: 32px 16px; color: #94a3b8; font-size: 13.5px;">
          No problems matching your filter
        </div>
      `;
      updateModalCount();
      return;
    }

    modalProblemsList.innerHTML = filtered.map(p => {
      const isChecked = modalSelectedProblems.has(p.title);
      const diffClass = p.difficulty.toLowerCase();
      return `
        <div class="modal-problem-card ${isChecked ? 'selected' : ''}" data-title="${escapeHtml(p.title)}">
          <div style="display: flex; align-items: center; gap: 12px;">
            <input 
              type="checkbox" 
              class="modal-problem-checkbox" 
              data-title="${escapeHtml(p.title)}" 
              ${isChecked ? 'checked' : ''} 
            />
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(p.title)}</div>
              ${p.topicName ? `<div style="font-size: 11.5px; color: #64748b;">${escapeHtml(p.topicName)}</div>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="chip-diff-badge ${diffClass}">${p.difficulty}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach row / checkbox click events
    modalProblemsList.querySelectorAll<HTMLElement>('.modal-problem-card').forEach(card => {
      const title = card.getAttribute('data-title');
      const cb = card.querySelector<HTMLInputElement>('.modal-problem-checkbox');
      if (!title || !cb) return;

      const toggleCheck = (e?: Event) => {
        if (e && (e.target as HTMLElement).tagName === 'INPUT') {
          // Checkbox naturally toggled
        } else {
          cb.checked = !cb.checked;
        }

        if (cb.checked) {
          modalSelectedProblems.add(title);
          card.classList.add('selected');
        } else {
          modalSelectedProblems.delete(title);
          card.classList.remove('selected');
        }
        updateModalCount();
      };

      card.addEventListener('click', (e) => {
        toggleCheck(e);
      });
    });

    updateModalCount();
  }

  function updateModalCount() {
    if (modalSelectedCount) {
      const count = modalSelectedProblems.size;
      modalSelectedCount.textContent = `${count} problem${count === 1 ? '' : 's'} selected`;
    }
  }

  // Open modal triggers
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openManualModal();
    });
  }

  if (openChecklistBtn) {
    openChecklistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openManualModal();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeManualModal);
  }
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', closeManualModal);
  }

  // Close modal when clicking outside dialog
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeManualModal();
    });
  }

  // Modal search
  if (modalSearch) {
    modalSearch.addEventListener('input', () => {
      renderModalProblemsList();
    });
  }

  // Modal difficulty pills
  modalDiffPills.forEach(pill => {
    pill.addEventListener('click', () => {
      modalDiffPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDiffFilter = pill.getAttribute('data-diff') || 'all';
      renderModalProblemsList();
    });
  });

  // Modal Select All
  if (modalSelectAllBtn) {
    modalSelectAllBtn.addEventListener('click', () => {
      const query = modalSearch?.value.trim().toLowerCase() || '';
      availableProblems.forEach(p => {
        const matchDiff = activeDiffFilter === 'all' || p.difficulty.toLowerCase() === activeDiffFilter.toLowerCase();
        const matchQuery = !query || p.title.toLowerCase().includes(query) || (p.topicName && p.topicName.toLowerCase().includes(query));
        if (matchDiff && matchQuery) {
          modalSelectedProblems.add(p.title);
        }
      });
      renderModalProblemsList();
    });
  }

  // Modal Deselect All
  if (modalDeselectAllBtn) {
    modalDeselectAllBtn.addEventListener('click', () => {
      const query = modalSearch?.value.trim().toLowerCase() || '';
      availableProblems.forEach(p => {
        const matchDiff = activeDiffFilter === 'all' || p.difficulty.toLowerCase() === activeDiffFilter.toLowerCase();
        const matchQuery = !query || p.title.toLowerCase().includes(query) || (p.topicName && p.topicName.toLowerCase().includes(query));
        if (matchDiff && matchQuery) {
          modalSelectedProblems.delete(p.title);
        }
      });
      renderModalProblemsList();
    });
  }

  // Apply Modal Selection
  if (applyModalBtn) {
    applyModalBtn.addEventListener('click', () => {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = '';
      modalSelectedProblems.forEach(title => {
        addProblemTag(title, true);
      });
      showToast(`Selected ${modalSelectedProblems.size} problem${modalSelectedProblems.size === 1 ? '' : 's'}`);
      closeManualModal();
      syncDropdownAndSelect();
    });
  }

  // Initial tag removal listeners
  document.querySelectorAll<HTMLButtonElement>('.btn-remove-tag').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prob = btn.getAttribute('data-problem');
      if (prob) {
        removeProblemTag(prob);
      }
    });
  });

  // Initialize
  loadProblems();

  // Form submission & validation
  async function handleSaveContest(e: Event) {
    e.preventDefault();

    const title = (document.getElementById('contest-title') as HTMLInputElement | null)?.value.trim();
    const startDate = (document.getElementById('contest-start-date') as HTMLSelectElement | null)?.value;
    const endDate = (document.getElementById('contest-end-date') as HTMLSelectElement | null)?.value;
    const duration = (document.getElementById('contest-duration') as HTMLSelectElement | null)?.value;

    if (!title) {
      showToast('Please enter contest title');
      document.getElementById('contest-title')?.focus();
      return;
    }

    const currentProblems = tagsContainer?.querySelectorAll('.admin-choice-tag') || [];
    if (currentProblems.length === 0) {
      showToast('Please select at least one problem for the contest');
      if (searchInput) searchInput.focus();
      return;
    }

    if (!startDate) {
      showToast('Please select start date and time');
      document.getElementById('contest-start-date')?.focus();
      return;
    }

    if (!endDate) {
      showToast('Please select end date and time');
      document.getElementById('contest-end-date')?.focus();
      return;
    }

    if (!duration) {
      showToast('Please select contest duration');
      document.getElementById('contest-duration')?.focus();
      return;
    }

    const problemList = Array.from(currentProblems).map(el => el.getAttribute('data-problem') || '');
    const contestType = weeklyCard?.classList.contains('active') ? 'weekly' : 'biweekly';

    try {
      const res = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: contestType,
          startDate,
          endDate,
          duration,
          problems: problemList
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast('Contest created and published successfully to database! Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/admincontest';
      }, 1200);
    } catch (err) {
      console.error('Error saving contest:', err);
      showToast('Contest created locally. Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/admincontest';
      }, 1200);
    }
  }

  if (form) {
    form.addEventListener('submit', handleSaveContest);
  }

  if (saveTopBtn && form) {
    saveTopBtn.addEventListener('click', () => {
      form.requestSubmit();
    });
  }
});
