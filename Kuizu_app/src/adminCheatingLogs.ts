import './adminProfileModal';

export interface ContestViolation {
  id: string;
  contestId: string;
  contestTitle: string;
  username: string;
  userEmail: string;
  userAvatar?: string;
  violationType: 'TAB_SWITCH' | 'CLIPBOARD_PASTE' | 'CLIPBOARD_COPY' | 'CLIPBOARD_CUT' | 'DEVTOOLS_INSPECT' | 'CONTEXT_MENU' | 'TEXT_SELECTION' | string;
  details: string;
  severity: 'warning' | 'high' | 'critical';
  timestamp: string;
  status: 'flagged' | 'warned' | 'disqualified' | 'dismissed';
}

function showToast(message: string, duration = 3200) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'CD').toUpperCase();
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Recently';
  }
}

function getViolationTypeLabel(type: string): { label: string; icon: string; className: string } {
  switch (type) {
    case 'TAB_SWITCH':
      return {
        label: 'Tab Switch',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
        className: 'type-tab-switch'
      };
    case 'CLIPBOARD_PASTE':
      return {
        label: 'Prohibited Paste',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        className: 'type-paste'
      };
    case 'CLIPBOARD_COPY':
      return {
        label: 'Prohibited Copy',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
        className: 'type-copy'
      };
    case 'CLIPBOARD_CUT':
      return {
        label: 'Prohibited Cut',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
        className: 'type-cut'
      };
    case 'DEVTOOLS_INSPECT':
      return {
        label: 'DevTools / Inspect',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
        className: 'type-devtools'
      };
    case 'CONTEXT_MENU':
      return {
        label: 'Context Menu',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"></path></svg>',
        className: 'type-context'
      };
    case 'TEXT_SELECTION':
      return {
        label: 'Text Selection',
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"></path></svg>',
        className: 'type-selection'
      };
    default:
      return {
        label: type,
        icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        className: 'type-default'
      };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('cheating-search-input') as HTMLInputElement | null;
  const filterSeverity = document.getElementById('filter-severity') as HTMLSelectElement | null;
  const filterType = document.getElementById('filter-type') as HTMLSelectElement | null;
  const filterContest = document.getElementById('filter-contest') as HTMLSelectElement | null;
  const logsTbody = document.getElementById('cheating-logs-tbody');

  const kpiTotal = document.getElementById('kpi-total-violations');
  const kpiCritical = document.getElementById('kpi-critical-violations');
  const kpiCandidates = document.getElementById('kpi-flagged-users');
  const kpiContests = document.getElementById('kpi-active-contests');

  const btnRefresh = document.getElementById('btn-refresh-logs');
  const btnClear = document.getElementById('btn-clear-logs');
  const btnSimulate = document.getElementById('btn-simulate-violation');
  const streamStatusText = document.getElementById('stream-status-text');

  // Modal elements
  const modalOverlay = document.getElementById('cheat-action-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalCandidateBox = document.getElementById('modal-candidate-box');
  const actionReasonInput = document.getElementById('action-reason-input') as HTMLInputElement | null;
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');

  let violationsList: ContestViolation[] = [];
  let pendingActionViolation: ContestViolation | null = null;
  let pendingActionType: 'warn' | 'disqualify' | 'dismiss' = 'warn';

  // Fetch real violations
  async function loadViolations(showLoader = false) {
    if (showLoader && logsTbody && violationsList.length === 0) {
      logsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px; color: #94a3b8;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div class="loading-spinner" style="width: 24px; height: 24px; border: 2.5px solid rgba(59,130,246,0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
              <span>Updating live proctoring stream...</span>
            </div>
          </td>
        </tr>
      `;
    }

    try {
      const res = await fetch('/api/contests/violations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.violations)) {
          violationsList = data.violations;
          updateContestDropdownOptions();
          renderViolations();
          updateKpis();
          return;
        }
      }
    } catch {
      // Fallback to localStorage
    }

    // Client-side fallback
    try {
      const stored = localStorage.getItem('kuizu_contest_violations');
      if (stored) {
        violationsList = JSON.parse(stored);
      }
    } catch {}

    updateContestDropdownOptions();
    renderViolations();
    updateKpis();
  }

  function updateKpis() {
    const total = violationsList.length;
    const critical = violationsList.filter(v => (v.severity || '').toLowerCase() === 'critical').length;
    const uniqueUsers = new Set(violationsList.map(v => v.username || v.userEmail)).size;
    const uniqueContests = new Set(violationsList.map(v => v.contestId || v.contestTitle)).size;

    if (kpiTotal) kpiTotal.textContent = total.toLocaleString();
    if (kpiCritical) kpiCritical.textContent = critical.toLocaleString();
    if (kpiCandidates) kpiCandidates.textContent = uniqueUsers.toLocaleString();
    if (kpiContests) kpiContests.textContent = Math.max(uniqueContests, 1).toString();
  }

  function updateContestDropdownOptions() {
    if (!filterContest) return;
    const currentSelected = filterContest.value;
    const contestsMap = new Map<string, string>();

    violationsList.forEach(v => {
      const id = v.contestId || 'active-contest';
      const title = v.contestTitle || 'Live Contest';
      if (!contestsMap.has(id)) {
        contestsMap.set(id, title);
      }
    });

    let html = '<option value="all">All Contests</option>';
    contestsMap.forEach((title, id) => {
      html += `<option value="${escapeHtml(id)}">${escapeHtml(title)}</option>`;
    });
    filterContest.innerHTML = html;
    if (contestsMap.has(currentSelected)) {
      filterContest.value = currentSelected;
    }
  }

  function renderViolations() {
    if (!logsTbody) return;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const severityFilter = filterSeverity?.value || 'all';
    const typeFilter = filterType?.value || 'all';
    const contestFilter = filterContest?.value || 'all';

    const filtered = violationsList.filter(v => {
      const matchesSearch = !query ||
        (v.username && v.username.toLowerCase().includes(query)) ||
        (v.userEmail && v.userEmail.toLowerCase().includes(query)) ||
        (v.contestTitle && v.contestTitle.toLowerCase().includes(query)) ||
        (v.details && v.details.toLowerCase().includes(query)) ||
        (v.violationType && v.violationType.toLowerCase().includes(query));

      const matchesSeverity = severityFilter === 'all' || (v.severity || '').toLowerCase() === severityFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || (v.violationType || '').toLowerCase() === typeFilter.toLowerCase();
      const matchesContest = contestFilter === 'all' || v.contestId === contestFilter;

      return matchesSearch && matchesSeverity && matchesType && matchesContest;
    });

    if (filtered.length === 0) {
      logsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 56px 20px; color: #94a3b8;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(34, 197, 94, 0.12); display: flex; align-items: center; justify-content: center; color: #22c55e;">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <h3 style="font-size: 16px; font-weight: 600; color: #334155; margin: 0;">No Cheating Incidents Detected</h3>
              <p style="font-size: 13.5px; color: #64748b; margin: 0; max-width: 360px;">
                ${violationsList.length === 0 ? 'All active contest candidates are adhering to anti-gaming protocols. Live proctoring is actively monitoring tab switches and clipboard activities.' : 'No violations match your current search and filter criteria.'}
              </p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    logsTbody.innerHTML = filtered.map(item => {
      const typeInfo = getViolationTypeLabel(item.violationType);
      const initials = getInitials(item.username);
      const avatarHtml = item.userAvatar && item.userAvatar.startsWith('http')
        ? `<img src="${escapeHtml(item.userAvatar)}" alt="${escapeHtml(item.username)}" class="cheat-user-avatar" />`
        : `<div class="cheat-user-initials">${initials}</div>`;

      const severityClass = `sev-${(item.severity || 'warning').toLowerCase()}`;
      const statusClass = `status-${(item.status || 'flagged').toLowerCase()}`;
      const formattedTime = formatRelativeTime(item.timestamp);
      const exactTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return `
        <tr class="cheat-log-row" data-id="${escapeHtml(item.id)}">
          <td class="cheat-col-time" title="${new Date(item.timestamp).toLocaleString()}">
            <span class="cheat-time-rel">${formattedTime}</span>
            <span class="cheat-time-exact">${exactTime}</span>
          </td>

          <td class="cheat-col-user">
            <div class="cheat-user-cell">
              ${avatarHtml}
              <div class="cheat-user-info">
                <span class="cheat-user-name">${escapeHtml(item.username)}</span>
                <span class="cheat-user-email">${escapeHtml(item.userEmail || 'Anonymous')}</span>
              </div>
            </div>
          </td>

          <td class="cheat-col-contest">
            <div class="cheat-contest-pill" title="${escapeHtml(item.contestTitle)}">
              <span class="cheat-contest-title">${escapeHtml(item.contestTitle)}</span>
            </div>
          </td>

          <td class="cheat-col-type">
            <div class="cheat-type-pill ${typeInfo.className}">
              ${typeInfo.icon}
              <span>${typeInfo.label}</span>
            </div>
          </td>

          <td class="cheat-col-details">
            <div class="cheat-details-text" title="${escapeHtml(item.details)}">
              ${escapeHtml(item.details)}
            </div>
          </td>

          <td class="cheat-col-severity">
            <span class="cheat-severity-badge ${severityClass}">
              <span class="severity-dot"></span>
              <span>${escapeHtml(item.severity.toUpperCase())}</span>
            </span>
          </td>

          <td class="cheat-col-status">
            <span class="cheat-status-badge ${statusClass}">
              ${escapeHtml(item.status || 'flagged')}
            </span>
          </td>

          <td class="cheat-col-actions" style="text-align: right;">
            <div class="cheat-actions-wrap">
              <button class="btn-cheat-row-action btn-row-warn" data-action="warn" data-id="${escapeHtml(item.id)}" title="Warn candidate">
                Warn
              </button>
              <button class="btn-cheat-row-action btn-row-disqualify" data-action="disqualify" data-id="${escapeHtml(item.id)}" title="Disqualify candidate">
                Disqualify
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row action click listeners
    logsTbody.querySelectorAll<HTMLButtonElement>('.btn-cheat-row-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action') as 'warn' | 'disqualify' | 'dismiss';
        const record = violationsList.find(v => v.id === id);
        if (record) {
          openActionModal(record, action);
        }
      });
    });
  }

  function openActionModal(violation: ContestViolation, actionType: 'warn' | 'disqualify' | 'dismiss') {
    pendingActionViolation = violation;
    pendingActionType = actionType;

    if (!modalOverlay || !modalTitle || !modalDesc || !modalCandidateBox) return;

    if (actionType === 'disqualify') {
      modalTitle.textContent = 'Disqualify Candidate';
      modalDesc.textContent = 'This candidate will be disqualified from the current contest due to repeated or severe integrity violations.';
      if (btnModalConfirm) {
        btnModalConfirm.textContent = 'Confirm Disqualification';
        btnModalConfirm.className = 'btn-cheat-modal-confirm btn-danger-action';
      }
    } else {
      modalTitle.textContent = 'Issue Official Proctoring Warning';
      modalDesc.textContent = 'A formal anti-cheat warning will be logged against this candidate’s account.';
      if (btnModalConfirm) {
        btnModalConfirm.textContent = 'Issue Warning';
        btnModalConfirm.className = 'btn-cheat-modal-confirm';
      }
    }

    modalCandidateBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div class="cheat-user-initials" style="width: 38px; height: 38px; font-size: 14px;">${getInitials(violation.username)}</div>
        <div>
          <div style="font-weight: 600; font-size: 15px; color: #0f172a;">${escapeHtml(violation.username)}</div>
          <div style="font-size: 12.5px; color: #64748b;">${escapeHtml(violation.userEmail)}</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 13px; color: #475569; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <strong>Violation:</strong> ${escapeHtml(violation.violationType)} &mdash; ${escapeHtml(violation.details)}
      </div>
    `;

    if (actionReasonInput) actionReasonInput.value = '';
    modalOverlay.classList.add('show');
  }

  function closeActionModal() {
    if (modalOverlay) modalOverlay.classList.remove('show');
    pendingActionViolation = null;
  }

  // Handle Action Confirmation
  if (btnModalConfirm) {
    btnModalConfirm.addEventListener('click', async () => {
      if (!pendingActionViolation) return;
      const newStatus = pendingActionType === 'disqualify' ? 'disqualified' : 'warned';
      const reason = actionReasonInput?.value.trim() || '';

      try {
        await fetch('/api/contests/violations/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pendingActionViolation.id,
            status: newStatus,
            reason
          })
        });

        // Update locally
        const target = violationsList.find(v => v.id === pendingActionViolation?.id);
        if (target) {
          target.status = newStatus;
        }

        renderViolations();
        closeActionModal();
        showToast(
          newStatus === 'disqualified'
            ? `Candidate ${pendingActionViolation.username} disqualified.`
            : `Warning issued to ${pendingActionViolation.username}.`
        );
      } catch {
        showToast('Action processed locally.');
        closeActionModal();
      }
    });
  }

  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', closeActionModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeActionModal();
    });
  }

  // Search & Filter event listeners
  if (searchInput) searchInput.addEventListener('input', () => renderViolations());
  if (filterSeverity) filterSeverity.addEventListener('change', () => renderViolations());
  if (filterType) filterType.addEventListener('change', () => renderViolations());
  if (filterContest) filterContest.addEventListener('change', () => renderViolations());

  // Top action: Refresh button
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadViolations(true);
      showToast('Cheating logs refreshed');
    });
  }

  // Top action: Clear logs button
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all cheating & violation logs? This action cannot be undone.')) {
        return;
      }
      try {
        await fetch('/api/contests/violations/clear', { method: 'POST' });
      } catch {}
      violationsList = [];
      localStorage.removeItem('kuizu_contest_violations');
      renderViolations();
      updateKpis();
      showToast('All cheating logs have been cleared.');
    });
  }

  // Top action: Simulate violation for quick verification
  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      const mockCandidates = [
        { name: 'Alex Rivera', email: 'alex.rivera@kuizu.io' },
        { name: 'Samantha Chen', email: 'samantha.chen@kuizu.io' },
        { name: 'Marcus Brody', email: 'm.brody@kuizu.io' },
        { name: 'Priya Sharma', email: 'priya.sharma@kuizu.io' },
        { name: 'Devon Vance', email: 'devon.vance@kuizu.io' }
      ];
      const mockViolations = [
        { type: 'TAB_SWITCH', details: 'Navigated away from contest tab (Window blur detected)', severity: 'warning' },
        { type: 'DEVTOOLS_INSPECT', details: 'Developer Tools Console opened via F12 shortcut', severity: 'critical' },
        { type: 'CLIPBOARD_PASTE', details: 'Attempted to paste 82 lines of external code into editor', severity: 'high' },
        { type: 'CONTEXT_MENU', details: 'Repeated right-click inspect attempt on hidden test cases', severity: 'warning' },
        { type: 'TAB_SWITCH', details: 'Tab switch #4 detected. Exam proctoring alert raised', severity: 'critical' }
      ];

      const cand = mockCandidates[Math.floor(Math.random() * mockCandidates.length)];
      const viol = mockViolations[Math.floor(Math.random() * mockViolations.length)];

      const simulatedRecord: ContestViolation = {
        id: `viol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        contestId: 'weekly-default',
        contestTitle: 'Weekly Coding Contest #11',
        username: cand.name,
        userEmail: cand.email,
        violationType: viol.type,
        details: viol.details,
        severity: viol.severity as any,
        timestamp: new Date().toISOString(),
        status: 'flagged'
      };

      try {
        await fetch('/api/contests/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simulatedRecord)
        });
      } catch {}

      violationsList.unshift(simulatedRecord);
      updateContestDropdownOptions();
      renderViolations();
      updateKpis();
      showToast(`Simulated violation recorded for ${cand.name}`);
    });
  }

  // Real-time synchronization
  // 1. Cross-tab storage listener: fires instantly if candidate creates violation in arena tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'kuizu_contest_violations' || e.key === 'kuizu_last_violation_signal') {
      loadViolations(false);
    }
  });

  // 2. In-window custom event listener
  window.addEventListener('kuizu_violation_recorded', () => {
    loadViolations(false);
  });
  window.addEventListener('kuizu_violations_cleared', () => {
    violationsList = [];
    renderViolations();
    updateKpis();
  });

  // 3. Regular polling every 2.5 seconds for multi-device live stream
  setInterval(() => {
    loadViolations(false);
  }, 2500);

  // Initial load
  loadViolations(true);
});
