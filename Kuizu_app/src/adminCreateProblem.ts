import './adminProfileModal';

// Admin Create Problem Page Logic

function showToast(message: string, duration = 3000) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('create-problem-form') as HTMLFormElement | null;
  const saveTopBtn = document.getElementById('save-problem-top-btn');
  const saveBottomBtn = document.getElementById('save-problem-bottom-btn');
  const statementArea = document.getElementById('prob-statement-text') as HTMLTextAreaElement | null;
  const pageTitle = document.querySelector('.admin-dashboard-title');
  const pageSubtitle = document.querySelector('.admin-dashboard-subtitle');

  interface ProblemExample {
    id: string;
    input: string;
    output: string;
    explanation?: string;
  }
  let problemExamples: ProblemExample[] = [];

  // Check if editing existing problem: ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const editProblemId = urlParams.get('id');

  if (editProblemId) {
    if (pageTitle) pageTitle.textContent = 'Edit Problem';
    if (pageSubtitle) {
      pageSubtitle.innerHTML = `<a href="/admin/uploadproblem" style="color:#2563eb; font-weight:500; text-decoration:none;">Upload Problem</a> / Edit Problem`;
    }
    if (saveTopBtn) {
      const span = saveTopBtn.querySelector('span');
      if (span) span.textContent = 'Save Changes';
    }
    if (saveBottomBtn) {
      const span = saveBottomBtn.querySelector('span');
      if (span) span.textContent = 'Save Changes';
    }

    try {
      const res = await fetch(`/api/problems/${editProblemId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.problem) {
          const p = data.problem;
          const titleInput = document.getElementById('prob-title') as HTMLInputElement | null;
          const diffSelect = document.getElementById('prob-difficulty') as HTMLSelectElement | null;
          const tagsSelect = document.getElementById('prob-tags') as HTMLSelectElement | null;
          const idInput = document.getElementById('prob-id') as HTMLInputElement | null;
          const descInput = document.getElementById('prob-desc') as HTMLTextAreaElement | null;
          const inFmtInput = document.getElementById('prob-input-format') as HTMLTextAreaElement | null;
          const outFmtInput = document.getElementById('prob-output-format') as HTMLTextAreaElement | null;

          if (titleInput) titleInput.value = p.title || '';
          if (diffSelect && p.difficulty) diffSelect.value = p.difficulty;
          if (tagsSelect && p.topic?.name) {
            tagsSelect.value = p.topic.name;
          }
          if (idInput) idInput.value = p.id || editProblemId;
          if (descInput) descInput.value = p.description || '';
          if (statementArea) statementArea.value = p.statement || '';
          if (inFmtInput) inFmtInput.value = p.inputFormat || '';
          if (outFmtInput) outFmtInput.value = p.outputFormat || '';

          // Populate test cases if present
          const tcTbodyEl = document.getElementById('test-cases-tbody');
          if (tcTbodyEl && Array.isArray(p.testCases) && p.testCases.length > 0) {
            tcTbodyEl.innerHTML = p.testCases.map((tc: any, index: number) => {
              const isSample = tc.visibility === 'Sample';
              const badge = isSample
                ? `<span class="admin-status-badge active"><span class="status-dot"></span>Sample</span>`
                : `<span class="admin-status-badge hidden-vis"><span class="status-dot"></span>Hidden</span>`;
              return `
                <tr data-tc-id="${tc.id || index + 1}">
                  <td class="text-muted">${index + 1}</td>
                  <td class="font-semibold tc-name">${tc.name || `Test Case ${index + 1}`}</td>
                  <td class="tc-input font-mono">${(tc.input || '').replace(/\n/g, '<br>')}</td>
                  <td class="tc-output font-mono">${(tc.output || '').replace(/\n/g, '<br>')}</td>
                  <td>${badge}</td>
                  <td style="text-align: right;">
                    <div class="admin-action-icons-wrap">
                      <button type="button" class="admin-icon-btn btn-edit-tc" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                      </button>
                      <button type="button" class="admin-icon-btn btn-delete-tc" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('');
            bindTcActions();
          }

          // Load existing example if present on the problem
          if (p.sampleInput || p.sampleOutput) {
            problemExamples = [
              {
                id: 'ex-initial',
                input: p.sampleInput || '',
                output: p.sampleOutput || '',
                explanation: ''
              }
            ];
            renderExamples();
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load problem for edit:', err);
    }
  }

  // ----------------------------------------------------
  // LeetCode & GeeksforGeeks Problem Auto-Fetcher
  // ----------------------------------------------------
  const fetcherPlatform = document.getElementById('fetcher-platform') as HTMLSelectElement | null;
  const fetcherQueryInput = document.getElementById('fetcher-query-input') as HTMLInputElement | null;
  const btnFetchProblem = document.getElementById('btn-fetch-problem-details') as HTMLButtonElement | null;
  const fetcherStatusBox = document.getElementById('fetcher-status-box');

  if (fetcherPlatform && fetcherQueryInput) {
    fetcherPlatform.addEventListener('change', () => {
      if (fetcherPlatform.value === 'leetcode') {
        fetcherQueryInput.placeholder = 'Enter problem number (e.g. 1) or slug (e.g. two-sum)...';
      } else {
        fetcherQueryInput.placeholder = 'Enter GFG problem slug (e.g. parenthesis-checker2744) or URL...';
      }
    });
  }

  // Pre-load LeetCode number-to-slug mapping from public data
  let leetCodeMap: Record<string, string> = {};
  fetch('/data/leetcode_slug_map.json')
    .then(r => r.json())
    .then(data => { leetCodeMap = data; })
    .catch(() => {});

  async function handleProblemFetch() {
    const rawQuery = fetcherQueryInput?.value.trim() || '';
    if (!rawQuery) {
      showToast('Please enter a problem number, slug, or URL.');
      fetcherQueryInput?.focus();
      return;
    }

    const platform = fetcherPlatform?.value || 'leetcode';

    if (fetcherStatusBox) {
      fetcherStatusBox.style.display = 'block';
      fetcherStatusBox.style.background = '#eff6ff';
      fetcherStatusBox.style.color = '#1d4ed8';
      fetcherStatusBox.style.border = '1px solid #bfdbfe';
      fetcherStatusBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>
          <span>Fetching details from <strong>${platform === 'leetcode' ? 'LeetCode' : 'GeeksforGeeks'}</strong> for "${rawQuery}"...</span>
        </div>
      `;
    }

    if (btnFetchProblem) {
      btnFetchProblem.setAttribute('disabled', 'true');
      btnFetchProblem.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Fetching...</span>
      `;
    }

    try {
      // If LeetCode number is given, check our client-side map first to accelerate lookup
      let queryToSend = rawQuery;
      if (platform === 'leetcode' && /^\d+$/.test(rawQuery) && leetCodeMap[rawQuery]) {
        queryToSend = leetCodeMap[rawQuery];
      }

      const res = await fetch(`/api/fetchProblem?platform=${platform}&query=${encodeURIComponent(queryToSend)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Could not find ${platform.toUpperCase()} problem`);
      }

      // Populate form fields
      const titleInput = document.getElementById('prob-title') as HTMLInputElement | null;
      const diffSelect = document.getElementById('prob-difficulty') as HTMLSelectElement | null;
      const tagsSelect = document.getElementById('prob-tags') as HTMLSelectElement | null;
      const idInput = document.getElementById('prob-id') as HTMLInputElement | null;
      const descInput = document.getElementById('prob-desc') as HTMLTextAreaElement | null;

      if (titleInput && data.title) {
        titleInput.value = data.title;
      }
      if (diffSelect && data.difficulty) {
        diffSelect.value = data.difficulty;
      }
      if (idInput && data.problemId) {
        idInput.value = data.problemId;
      }
      if (descInput && data.description) {
        descInput.value = data.description;
      }
      if (statementArea && data.statement) {
        statementArea.value = data.statement;
      }

      // Match or add topic
      if (tagsSelect && data.topic) {
        let matchedOption = false;
        for (let i = 0; i < tagsSelect.options.length; i++) {
          if (tagsSelect.options[i].value.toLowerCase().includes(data.topic.toLowerCase()) ||
              data.topic.toLowerCase().includes(tagsSelect.options[i].value.toLowerCase())) {
            tagsSelect.selectedIndex = i;
            matchedOption = true;
            break;
          }
        }
        if (!matchedOption && data.topic) {
          const newOpt = document.createElement('option');
          newOpt.value = data.topic;
          newOpt.textContent = data.topic;
          tagsSelect.appendChild(newOpt);
          tagsSelect.value = data.topic;
        }
      }

      // Populate Test Cases table if any were parsed
      const tcTbodyEl = document.getElementById('test-cases-tbody');
      if (tcTbodyEl && Array.isArray(data.testCases) && data.testCases.length > 0) {
        tcTbodyEl.innerHTML = data.testCases.map((tc: any, index: number) => {
          const isSample = tc.visibility === 'Sample' || index === 0;
          const badge = isSample
            ? `<span class="admin-status-badge active"><span class="status-dot"></span>Sample</span>`
            : `<span class="admin-status-badge hidden-vis"><span class="status-dot"></span>Hidden</span>`;
          return `
            <tr data-tc-id="${tc.id || index + 1}">
              <td class="text-muted">${index + 1}</td>
              <td class="font-semibold tc-name">${tc.name || `Test Case ${index + 1}`}</td>
              <td class="tc-input font-mono">${(tc.input || '').replace(/\n/g, '<br>')}</td>
              <td class="tc-output font-mono">${(tc.output || '-').replace(/\n/g, '<br>')}</td>
              <td>${badge}</td>
              <td style="text-align: right;">
                <div class="admin-action-icons-wrap">
                  <button type="button" class="admin-icon-btn btn-edit-tc" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                  <button type="button" class="admin-icon-btn btn-delete-tc" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        bindTcActions();
      }

      // Add to problem examples
      if (data.sampleInput || (data.testCases && data.testCases[0]?.input)) {
        problemExamples = [
          {
            id: 'ex-fetched',
            input: data.sampleInput || data.testCases[0]?.input || '',
            output: data.sampleOutput || data.testCases[0]?.output || '',
            explanation: ''
          }
        ];
        renderExamples();
      }

      if (fetcherStatusBox) {
        fetcherStatusBox.style.display = 'block';
        fetcherStatusBox.style.background = '#ecfdf5';
        fetcherStatusBox.style.color = '#065f46';
        fetcherStatusBox.style.border = '1px solid #a7f3d0';
        fetcherStatusBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#059669" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span><strong>Successfully fetched:</strong> ${data.title} (${data.difficulty})</span>
              <span style="color: #047857; font-size: 12px;">• Ready to review and click "Save Problem"</span>
            </div>
            ${data.originalUrl ? `
              <a href="${data.originalUrl}" target="_blank" style="color: #047857; font-weight: 700; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                <span>Open ${platform === 'leetcode' ? 'LeetCode' : 'GFG'}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            ` : ''}
          </div>
        `;
      }

      showToast(`Fetched "${data.title}"! Review details and click Save Problem.`);
    } catch (err: any) {
      console.error('[handleProblemFetch] Error:', err);
      if (fetcherStatusBox) {
        fetcherStatusBox.style.display = 'block';
        fetcherStatusBox.style.background = '#fef2f2';
        fetcherStatusBox.style.color = '#991b1b';
        fetcherStatusBox.style.border = '1px solid #fecaca';
        fetcherStatusBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#dc2626" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${err.message || 'Failed to fetch problem. Please verify the problem number or slug.'}</span>
          </div>
        `;
      }
      showToast(err.message || 'Failed to fetch problem details.', 4000);
    } finally {
      if (btnFetchProblem) {
        btnFetchProblem.removeAttribute('disabled');
        btnFetchProblem.innerHTML = `
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Fetch Problem</span>
        `;
      }
    }
  }

  btnFetchProblem?.addEventListener('click', handleProblemFetch);
  fetcherQueryInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProblemFetch();
    }
  });

  // Rich text formatting toolbar
  document.querySelectorAll<HTMLButtonElement>('.admin-editor-tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!statementArea) return;
      const action = btn.getAttribute('data-action');
      const start = statementArea.selectionStart;
      const end = statementArea.selectionEnd;
      const selected = statementArea.value.substring(start, end);

      let replacement = '';
      if (action === 'bold') {
        replacement = `**${selected || 'bold text'}**`;
      } else if (action === 'italic') {
        replacement = `*${selected || 'italic text'}*`;
      } else if (action === 'underline') {
        replacement = `<u>${selected || 'underlined text'}</u>`;
      } else if (action === 'link') {
        replacement = `[${selected || 'link text'}](https://example.com)`;
      } else if (action === 'bullet') {
        replacement = `\n• ${selected || 'item'}`;
      } else if (action === 'number') {
        replacement = `\n1. ${selected || 'first item'}`;
      } else if (action === 'code') {
        replacement = `\`\`\`\n${selected || '// code here'}\n\`\`\``;
      }

      statementArea.setRangeText(replacement, start, end, 'end');
      statementArea.focus();
    });
  });

  // Copy buttons for Examples
  document.querySelectorAll<HTMLButtonElement>('.admin-copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.innerText || targetEl.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied to clipboard!');
        });
      }
    });
  });

  // Test Case Modal Handling
  const tcModal = document.getElementById('test-case-modal');
  const closeTcModal = document.getElementById('close-tc-modal');
  const cancelTcBtn = document.getElementById('cancel-tc-btn');
  const btnAddTc = document.getElementById('btn-add-test-case');
  const tcForm = document.getElementById('tc-form') as HTMLFormElement | null;
  const tcTbody = document.getElementById('test-cases-tbody');

  const modalTcTitle = document.getElementById('tc-modal-title');
  const modalTcEditId = document.getElementById('modal-tc-edit-id') as HTMLInputElement | null;
  const modalTcName = document.getElementById('modal-tc-name') as HTMLInputElement | null;
  const modalTcInput = document.getElementById('modal-tc-input') as HTMLTextAreaElement | null;
  const modalTcOutput = document.getElementById('modal-tc-output') as HTMLTextAreaElement | null;
  const modalTcVis = document.getElementById('modal-tc-visibility') as HTMLSelectElement | null;

  function checkTcEmptyState() {
    if (!tcTbody) return;
    const validRows = tcTbody.querySelectorAll('tr:not(#test-cases-empty-row)');
    const emptyRow = document.getElementById('test-cases-empty-row');
    if (validRows.length === 0) {
      if (!emptyRow) {
        tcTbody.innerHTML = `
          <tr id="test-cases-empty-row">
            <td colspan="6" style="text-align: center; padding: 36px 16px; background: #f8fafc; color: #64748b;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8;">
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span style="font-weight: 600; font-size: 14px; color: #475569;">No test cases added yet</span>
                <span style="font-size: 13px; color: #94a3b8;">Click "+ Add Test Case" above to manually add test cases, or "Upload Test Cases" to import.</span>
              </div>
            </td>
          </tr>
        `;
      }
    } else {
      if (emptyRow) {
        emptyRow.remove();
      }
    }
  }

  function openTcModal(isEdit = false, trElement?: HTMLElement) {
    if (!tcModal) return;
    if (isEdit && trElement) {
      if (modalTcTitle) modalTcTitle.textContent = 'Edit Test Case';
      if (modalTcEditId) modalTcEditId.value = trElement.getAttribute('data-tc-id') || '';
      if (modalTcName) modalTcName.value = trElement.querySelector('.tc-name')?.textContent || '';
      if (modalTcInput) modalTcInput.value = (trElement.querySelector('.tc-input') as HTMLElement)?.innerText || '';
      if (modalTcOutput) modalTcOutput.value = (trElement.querySelector('.tc-output') as HTMLElement)?.innerText || '';
      const isSample = trElement.querySelector('.admin-status-badge')?.textContent?.includes('Sample');
      if (modalTcVis) modalTcVis.value = isSample ? 'Sample' : 'Hidden';
    } else {
      if (modalTcTitle) modalTcTitle.textContent = 'Add Test Case';
      if (modalTcEditId) modalTcEditId.value = '';
      const validRows = tcTbody?.querySelectorAll('tr:not(#test-cases-empty-row)') || [];
      const nextIdx = validRows.length + 1;
      if (modalTcName) modalTcName.value = `Test Case ${nextIdx}`;
      if (modalTcInput) modalTcInput.value = '';
      if (modalTcOutput) modalTcOutput.value = '';
      if (modalTcVis) modalTcVis.value = nextIdx === 1 ? 'Sample' : 'Hidden';
    }
    tcModal.style.display = 'flex';
    modalTcInput?.focus();
  }

  function hideTcModal() {
    if (tcModal) tcModal.style.display = 'none';
  }

  if (btnAddTc) btnAddTc.addEventListener('click', () => openTcModal(false));
  if (closeTcModal) closeTcModal.addEventListener('click', hideTcModal);
  if (cancelTcBtn) cancelTcBtn.addEventListener('click', hideTcModal);

  window.addEventListener('click', (e) => {
    if (e.target === tcModal) hideTcModal();
  });

  // Rebind table edit/delete actions
  function bindTcActions() {
    document.querySelectorAll<HTMLButtonElement>('.btn-delete-tc').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const row = btn.closest('tr');
        if (confirm('Delete this test case?')) {
          row?.remove();
          reindexTcRows();
          showToast('Test case removed.');
        }
      };
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-edit-tc').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const row = btn.closest('tr') as HTMLElement | null;
        if (row) openTcModal(true, row);
      };
    });
  }

  function reindexTcRows() {
    if (!tcTbody) return;
    const validRows = tcTbody.querySelectorAll('tr:not(#test-cases-empty-row)');
    validRows.forEach((tr, index) => {
      const idxCell = (tr as HTMLTableRowElement).cells[0];
      if (idxCell) idxCell.textContent = `${index + 1}`;
    });
    checkTcEmptyState();
  }

  bindTcActions();
  checkTcEmptyState();

  // Test Case form submit
  if (tcForm) {
    tcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = modalTcEditId?.value;
      const name = modalTcName?.value.trim() || 'Test Case';
      const input = modalTcInput?.value.trim() || '';
      const output = modalTcOutput?.value.trim() || '';
      const vis = modalTcVis?.value || 'Hidden';
      const isSample = vis === 'Sample';

      const badgeHtml = isSample
        ? `<span class="admin-status-badge active"><span class="status-dot"></span>Sample</span>`
        : `<span class="admin-status-badge hidden-vis"><span class="status-dot"></span>Hidden</span>`;

      if (editId) {
        // Edit existing
        const row = tcTbody?.querySelector<HTMLTableRowElement>(`tr[data-tc-id="${editId}"]`);
        if (row) {
          const nameEl = row.querySelector('.tc-name');
          const inputEl = row.querySelector('.tc-input');
          const outputEl = row.querySelector('.tc-output');
          const visCell = row.cells[4];

          if (nameEl) nameEl.textContent = name;
          if (inputEl) inputEl.innerHTML = input.replace(/\n/g, '<br>');
          if (outputEl) outputEl.innerHTML = output.replace(/\n/g, '<br>');
          if (visCell) visCell.innerHTML = badgeHtml;
          showToast('Test case updated!');
        }
      } else {
        tcRowHelper(name, input, output, vis);
        showToast('New test case added!');
      }

      hideTcModal();
    });
  }

  function tcRowHelper(name: string, input: string, output: string, visibility: string) {
    const emptyRow = document.getElementById('test-cases-empty-row');
    if (emptyRow) emptyRow.remove();

    const isSample = visibility === 'Sample';
    const badgeHtml = isSample
      ? `<span class="admin-status-badge active"><span class="status-dot"></span>Sample</span>`
      : `<span class="admin-status-badge hidden-vis"><span class="status-dot"></span>Hidden</span>`;
    const newId = Date.now().toString() + Math.random().toString().slice(2, 6);
    const validRows = tcTbody?.querySelectorAll('tr:not(#test-cases-empty-row)') || [];
    const rowCount = validRows.length + 1;
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-tc-id', newId);
    newRow.innerHTML = `
      <td class="text-muted">${rowCount}</td>
      <td class="font-semibold tc-name">${name}</td>
      <td class="tc-input font-mono">${input.replace(/\n/g, '<br>')}</td>
      <td class="tc-output font-mono">${output.replace(/\n/g, '<br>')}</td>
      <td>${badgeHtml}</td>
      <td style="text-align: right;">
        <div class="admin-action-icons-wrap">
          <button type="button" class="admin-icon-btn btn-edit-tc" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button type="button" class="admin-icon-btn btn-delete-tc" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    tcTbody?.appendChild(newRow);
    bindTcActions();
  }

  // Upload test cases file handler (JSON, CSV, TXT)
  const fileInput = document.getElementById('test-case-file-input') as HTMLInputElement | null;
  const btnUploadTc = document.getElementById('btn-upload-test-cases');
  if (btnUploadTc && fileInput) {
    btnUploadTc.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        try {
          // If JSON
          if (file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
            const parsed = JSON.parse(text);
            const list = Array.isArray(parsed) ? parsed : (parsed.testCases || parsed.testcases || parsed.cases || []);
            if (Array.isArray(list) && list.length > 0) {
              if (tcTbody) tcTbody.innerHTML = '';
              list.forEach((item, idx) => {
                const name = item.name || `Test Case ${idx + 1}`;
                const input = typeof item.input === 'object' ? JSON.stringify(item.input) : String(item.input || '');
                const output = typeof item.output === 'object' ? JSON.stringify(item.output) : String(item.output || '');
                const vis = item.visibility === 'Sample' ? 'Sample' : (item.visibility || (idx === 0 ? 'Sample' : 'Hidden'));
                tcRowHelper(name, input, output, vis);
              });
              showToast(`Imported ${list.length} test cases from "${file.name}"!`);
              return;
            }
          }

          // If CSV / TXT
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length > 0) {
            if (tcTbody) tcTbody.innerHTML = '';
            let count = 0;
            lines.forEach((line, idx) => {
              const delimiter = line.includes('\t') ? '\t' : (line.includes('|') ? '|' : ',');
              const parts = line.split(delimiter).map(p => p.trim());
              if (parts.length >= 2) {
                const name = `Test Case ${count + 1}`;
                const input = parts[0];
                const output = parts[1];
                const vis = parts[2] === 'Sample' ? 'Sample' : (count === 0 ? 'Sample' : 'Hidden');
                tcRowHelper(name, input, output, vis);
                count++;
              }
            });
            showToast(`Imported ${count} test cases from "${file.name}"!`);
          }
        } catch (err) {
          console.error('Failed to parse test cases file:', err);
          showToast(`Error parsing file: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    });
  }

  // ========================================================
  // Dynamic Examples Management (Add / Edit / Delete Examples)
  // ========================================================
  const btnAddExample = document.getElementById('btn-add-example');
  const examplesContainer = document.getElementById('examples-container');
  const exampleModal = document.getElementById('example-modal');
  const closeExampleModal = document.getElementById('close-example-modal');
  const cancelExampleBtn = document.getElementById('cancel-example-btn');
  const exampleForm = document.getElementById('example-form') as HTMLFormElement | null;
  const modalExTitle = document.getElementById('example-modal-title');
  const modalExEditId = document.getElementById('modal-example-edit-id') as HTMLInputElement | null;
  const modalExInput = document.getElementById('modal-example-input') as HTMLTextAreaElement | null;
  const modalExOutput = document.getElementById('modal-example-output') as HTMLTextAreaElement | null;
  const modalExExp = document.getElementById('modal-example-explanation') as HTMLTextAreaElement | null;

  function openExampleModal(isEdit = false, item?: ProblemExample) {
    if (!exampleModal) return;
    if (isEdit && item) {
      if (modalExTitle) modalExTitle.textContent = 'Edit Example';
      if (modalExEditId) modalExEditId.value = item.id;
      if (modalExInput) modalExInput.value = item.input;
      if (modalExOutput) modalExOutput.value = item.output;
      if (modalExExp) modalExExp.value = item.explanation || '';
    } else {
      if (modalExTitle) modalExTitle.textContent = 'Add Example';
      if (modalExEditId) modalExEditId.value = '';
      if (modalExInput) modalExInput.value = '';
      if (modalExOutput) modalExOutput.value = '';
      if (modalExExp) modalExExp.value = '';
    }
    exampleModal.style.display = 'flex';
    modalExInput?.focus();
  }

  function hideExampleModal() {
    if (exampleModal) exampleModal.style.display = 'none';
  }

  function renderExamples() {
    if (!examplesContainer) return;

    if (problemExamples.length === 0) {
      examplesContainer.innerHTML = `
        <div id="examples-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 32px 16px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; color: #94a3b8;">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <p style="margin: 0; font-size: 14px; font-weight: 500;">No examples added yet.</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Click "+ Add Example" above to add input/output demonstration cases.</p>
        </div>
      `;
      return;
    }

    examplesContainer.innerHTML = problemExamples.map((ex, idx) => {
      const num = idx + 1;
      const inputId = `sample-input-${ex.id}`;
      const outputId = `sample-output-${ex.id}`;

      return `
        <!-- Example ${num} Container (Grid spans 2 columns) -->
        <div class="admin-example-group-wrap" style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; position: relative; background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
          
          <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 4px;">
            <span style="font-size: 13px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></span>
              Example ${num}
            </span>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="admin-icon-btn btn-edit-example" data-id="${ex.id}" title="Edit Example" style="padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Edit
              </button>
              <button type="button" class="admin-icon-btn btn-delete-example" data-id="${ex.id}" title="Delete Example" style="padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; color: #ef4444; background: #ffffff; border: 1px solid #fee2e2; border-radius: 6px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </div>

          <!-- Input Box -->
          <div class="admin-example-box" style="background: #ffffff;">
            <div class="admin-example-header">
              <span class="admin-example-label">Sample Input ${num}</span>
              <button type="button" class="admin-copy-btn btn-copy-ex" data-target="${inputId}" title="Copy Input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="admin-example-content font-mono" id="${inputId}" style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #0f172a;">${escapeHtml(ex.input)}</div>
          </div>

          <!-- Output Box -->
          <div class="admin-example-box" style="background: #ffffff;">
            <div class="admin-example-header">
              <span class="admin-example-label">Sample Output ${num}</span>
              <button type="button" class="admin-copy-btn btn-copy-ex" data-target="${outputId}" title="Copy Output">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="admin-example-content font-mono" id="${outputId}" style="white-space: pre-wrap; font-size: 13px; line-height: 1.5; color: #0f172a;">${escapeHtml(ex.output)}</div>
          </div>

          ${ex.explanation ? `
            <div style="grid-column: 1 / -1; font-size: 12px; color: #64748b; background: #f1f5f9; padding: 8px 12px; border-radius: 8px;">
              <strong style="color: #334155;">Explanation:</strong> ${escapeHtml(ex.explanation)}
            </div>
          ` : ''}

        </div>
      `;
    }).join('');

    // Attach copy button events
    examplesContainer.querySelectorAll('.btn-copy-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = targetId ? document.getElementById(targetId) : null;
        if (targetEl) {
          navigator.clipboard.writeText(targetEl.textContent || '');
          showToast('Copied to clipboard!');
        }
      });
    });

    // Attach edit button events
    examplesContainer.querySelectorAll('.btn-edit-example').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        const item = problemExamples.find(x => x.id === id);
        if (item) openExampleModal(true, item);
      });
    });

    // Attach delete button events
    examplesContainer.querySelectorAll('.btn-delete-example').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        if (confirm('Delete this example?')) {
          problemExamples = problemExamples.filter(x => x.id !== id);
          renderExamples();
          showToast('Example deleted.');
        }
      });
    });
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (btnAddExample) btnAddExample.addEventListener('click', () => openExampleModal(false));
  if (closeExampleModal) closeExampleModal.addEventListener('click', hideExampleModal);
  if (cancelExampleBtn) cancelExampleBtn.addEventListener('click', hideExampleModal);

  window.addEventListener('click', (e) => {
    if (e.target === exampleModal) hideExampleModal();
  });

  if (exampleForm) {
    exampleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = modalExInput?.value.trim() || '';
      const output = modalExOutput?.value.trim() || '';
      const explanation = modalExExp?.value.trim() || '';
      const editId = modalExEditId?.value;

      if (!input || !output) {
        showToast('Please provide both Sample Input and Sample Output.');
        return;
      }

      if (editId) {
        // Edit existing example
        const idx = problemExamples.findIndex(x => x.id === editId);
        if (idx !== -1) {
          problemExamples[idx] = { id: editId, input, output, explanation };
          showToast('Example updated!');
        }
      } else {
        // Add new example
        const newId = `ex-${Date.now()}`;
        problemExamples.push({ id: newId, input, output, explanation });
        showToast('Example added!');
      }

      hideExampleModal();
      renderExamples();
    });
  }

  // Initial render of empty state or loaded examples
  renderExamples();

  // Form submission handling
  async function handleProblemSave(e?: Event) {
    if (e) e.preventDefault();
    const title = (document.getElementById('prob-title') as HTMLInputElement)?.value.trim();
    const difficulty = (document.getElementById('prob-difficulty') as HTMLSelectElement)?.value;
    const tags = (document.getElementById('prob-tags') as HTMLSelectElement)?.value;
    const desc = (document.getElementById('prob-desc') as HTMLTextAreaElement)?.value.trim();
    const statement = statementArea?.value.trim();
    const inputFmt = (document.getElementById('prob-input-format') as HTMLTextAreaElement)?.value.trim();
    const outputFmt = (document.getElementById('prob-output-format') as HTMLTextAreaElement)?.value.trim();

    if (!title) {
      showToast('Please enter a Problem Title.');
      document.getElementById('prob-title')?.focus();
      return;
    }
    if (!difficulty) {
      showToast('Please select a Difficulty.');
      document.getElementById('prob-difficulty')?.focus();
      return;
    }
    if (!tags) {
      showToast('Please select a Topic/Tag.');
      document.getElementById('prob-tags')?.focus();
      return;
    }
    if (!desc) {
      showToast('Please provide a short description.');
      document.getElementById('prob-desc')?.focus();
      return;
    }
    if (!statement) {
      showToast('Please write the Problem Statement.');
      statementArea?.focus();
      return;
    }

    // Collect all test cases from the table
    const testCases: any[] = [];
    const rows = tcTbody?.querySelectorAll('tr:not(#test-cases-empty-row)') || [];
    rows.forEach((tr, index) => {
      const name = tr.querySelector('.tc-name')?.textContent?.trim() || `Test Case ${index + 1}`;
      const inputEl = tr.querySelector('.tc-input') as HTMLElement | null;
      const outputEl = tr.querySelector('.tc-output') as HTMLElement | null;
      const input = inputEl ? inputEl.innerText.trim() : '';
      const output = outputEl ? outputEl.innerText.trim() : '';
      const isSample = tr.querySelector('.admin-status-badge')?.textContent?.includes('Sample');
      const visibility = isSample ? 'Sample' : 'Hidden';

      if (input || output) {
        testCases.push({
          id: index + 1,
          num: index + 1,
          name,
          input,
          output,
          summaryInput: `Input: ${input.replace(/\n/g, ', ')}`,
          summaryExpected: `Expected: ${output.replace(/\n/g, ', ')}`,
          visibility,
          details: [
            { label: 'input', value: input.replace(/\n/g, ' ') },
            { label: 'output', value: output.replace(/\n/g, ' ') }
          ]
        });
      }
    });

    // Use user-added examples if present, else fallback to first sample test case
    let sampleInput = '';
    let sampleOutput = '';

    if (problemExamples.length > 0) {
      sampleInput = problemExamples[0].input;
      sampleOutput = problemExamples[0].output;
    } else {
      const firstSample = testCases.find(tc => tc.visibility === 'Sample') || testCases[0];
      sampleInput = firstSample ? firstSample.input : '';
      sampleOutput = firstSample ? firstSample.output : '';
    }

    try {
      const xpMap: Record<string, number> = { Easy: 10, Medium: 20, Hard: 40 };
      const rewardXp = xpMap[difficulty] || 10;

      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          difficulty,
          topic: tags,
          rewardXp,
          description: desc,
          statement,
          inputFormat: inputFmt,
          outputFormat: outputFmt,
          sampleInput,
          sampleOutput,
          testCases
        })
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      showToast('Problem successfully saved! Redirecting to Upload Problem...');
      setTimeout(() => {
        window.location.href = '/admin/uploadproblem';
      }, 1200);
    } catch (err) {
      console.error('Error creating problem:', err);
      showToast('Saved problem locally. Redirecting to Upload Problem...');
      setTimeout(() => {
        window.location.href = '/admin/uploadproblem';
      }, 1200);
    }
  }

  if (saveTopBtn) saveTopBtn.addEventListener('click', handleProblemSave);
  if (form) form.addEventListener('submit', handleProblemSave);
});
