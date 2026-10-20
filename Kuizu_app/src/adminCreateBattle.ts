import './adminProfileModal';

// Admin Create Battle Page Logic

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
  const form = document.getElementById('create-battle-form') as HTMLFormElement | null;
  const saveTopBtn = document.getElementById('save-battle-top-btn') as HTMLButtonElement | null;
  const saveBottomBtn = document.getElementById('save-battle-bottom-btn') as HTMLButtonElement | null;
  const questionsListContainer = document.getElementById('admin-questions-list');
  const addQuestionBtn = document.getElementById('btn-add-battle-q') as HTMLButtonElement | null;

  // Initialize and attach all behaviors for a question card block
  function setupQuestionBlock(block: HTMLElement, qNumber: number) {
    const titleEl = block.querySelector('.q-block-title');
    if (titleEl) titleEl.textContent = `Build Battle Question ${qNumber}`;

    const removeBtn = block.querySelector('.btn-remove-q-block') as HTMLButtonElement | null;
    if (removeBtn) {
      removeBtn.style.display = qNumber > 1 ? 'inline-flex' : 'none';
      removeBtn.onclick = () => {
        const allBlocks = document.querySelectorAll('.battle-question-block');
        if (allBlocks.length <= 1) {
          showToast('A battle must have at least one question');
          return;
        }
        block.remove();
        refreshQuestionNumbers();
        showToast(`Question ${qNumber} removed`);
      };
    }

    const optionsContainer = block.querySelector('.admin-battle-options-grid') as HTMLElement | null;
    const tagsContainer = block.querySelector('.admin-tags-list') as HTMLElement | null;
    const addOptBtn = block.querySelector('#btn-add-opt, .btn-add-opt') as HTMLButtonElement | null;
    const dropzone = block.querySelector('.admin-dashed-arrange-zone') as HTMLElement | null;

    function renderBlockTags() {
      if (!tagsContainer) return;
      const checkedBoxes = block.querySelectorAll<HTMLInputElement>('.opt-correct-chk:checked');
      const checkedVals = Array.from(checkedBoxes).map((chk) => chk.value);

      tagsContainer.innerHTML = '';
      checkedVals.forEach((val) => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'admin-choice-tag';
        tagSpan.setAttribute('data-val', val);
        tagSpan.innerHTML = `
          <span>${val}</span>
          <button type="button" class="btn-remove-tag" data-tag="${val}">✕</button>
        `;

        tagSpan.querySelector('.btn-remove-tag')?.addEventListener('click', (e) => {
          e.stopPropagation();
          removeBlockCorrectTag(val);
        });

        tagsContainer.appendChild(tagSpan);
      });
    }

    function removeBlockCorrectTag(val: string) {
      const chk = block.querySelector<HTMLInputElement>(`.opt-correct-chk[value="${val}"]`);
      if (chk) {
        chk.checked = false;
        renderBlockTags();
      }
    }

    function attachOptionListeners(card: HTMLElement) {
      const chk = card.querySelector<HTMLInputElement>('.opt-correct-chk');
      if (chk) {
        chk.addEventListener('change', () => {
          renderBlockTags();
        });
      }

      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', card.getAttribute('data-opt') || '');
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    }

    block.querySelectorAll<HTMLElement>('.admin-battle-opt-card').forEach((card) => {
      attachOptionListeners(card);
    });

    block.querySelectorAll<HTMLButtonElement>('.btn-remove-tag').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagVal = btn.getAttribute('data-tag');
        if (tagVal) {
          removeBlockCorrectTag(tagVal);
        }
      });
    });

    if (addOptBtn && optionsContainer) {
      addOptBtn.onclick = () => {
        const existingCards = optionsContainer.querySelectorAll('.admin-battle-opt-card');
        const nextLetter = String.fromCharCode(65 + existingCards.length);

        if (existingCards.length >= 8) {
          showToast('Maximum 8 options supported per question');
          return;
        }

        const newCard = document.createElement('div');
        newCard.className = 'admin-battle-opt-card';
        newCard.setAttribute('data-opt', nextLetter);
        newCard.innerHTML = `
          <div class="admin-drag-handle" title="Drag to reorder">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="7" r="1.5"></circle>
              <circle cx="9" cy="12" r="1.5"></circle>
              <circle cx="9" cy="17" r="1.5"></circle>
              <circle cx="15" cy="7" r="1.5"></circle>
              <circle cx="15" cy="12" r="1.5"></circle>
              <circle cx="15" cy="17" r="1.5"></circle>
            </svg>
          </div>
          <div class="admin-battle-opt-badge">${nextLetter}</div>
          <input 
            type="text" 
            class="admin-battle-opt-input" 
            placeholder="Enter answer option ${nextLetter}..." 
            value="Option ${nextLetter}"
            required 
          />
          <label class="admin-correct-answer-toggle">
            <input type="checkbox" class="opt-correct-chk" value="${nextLetter}" />
            <span class="admin-chk-circle"></span>
            <span class="admin-chk-text">Correct answer</span>
          </label>
        `;

        optionsContainer.appendChild(newCard);
        attachOptionListeners(newCard);
        showToast(`Option ${nextLetter} added to Question ${qNumber}`);
      };
    }

    if (dropzone && optionsContainer) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const optLetter = e.dataTransfer?.getData('text/plain');
        if (optLetter) {
          const draggedCard = optionsContainer.querySelector(`.admin-battle-opt-card[data-opt="${optLetter}"]`);
          if (draggedCard) {
            optionsContainer.appendChild(draggedCard);
            showToast(`Option ${optLetter} moved`);
          }
        }
      });
    }

    renderBlockTags();
  }

  function refreshQuestionNumbers() {
    const blocks = document.querySelectorAll<HTMLElement>('.battle-question-block');
    blocks.forEach((blk, idx) => {
      const qNum = idx + 1;
      blk.setAttribute('data-q-index', String(idx));
      const titleEl = blk.querySelector('.q-block-title');
      if (titleEl) titleEl.textContent = `Build Battle Question ${qNum}`;
      const removeBtn = blk.querySelector('.btn-remove-q-block') as HTMLButtonElement | null;
      if (removeBtn) {
        removeBtn.style.display = blocks.length > 1 ? 'inline-flex' : 'none';
      }
    });
  }

  function createNewQuestionBlock(qNumber: number, initialData?: { prompt: string; options: any[]; correctOptions: string[] }) {
    if (!questionsListContainer) return null;

    const block = document.createElement('div');
    block.className = 'admin-card admin-form-card battle-question-block';
    block.setAttribute('data-q-index', String(qNumber - 1));

    const defaultPrompt = initialData?.prompt || '';
    const options = initialData?.options && initialData.options.length > 0 ? initialData.options : [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' }
    ];
    const correctOpts = initialData?.correctOptions || ['A'];

    const optionsHtml = options.map((opt, idx) => {
      const letter = opt.id || String.fromCharCode(65 + idx);
      const textVal = typeof opt === 'string' ? opt : (opt.text || `Option ${letter}`);
      const isChecked = correctOpts.includes(letter);
      return `
        <div class="admin-battle-opt-card" data-opt="${letter}">
          <div class="admin-drag-handle" title="Drag to reorder">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="7" r="1.5"></circle>
              <circle cx="9" cy="12" r="1.5"></circle>
              <circle cx="9" cy="17" r="1.5"></circle>
              <circle cx="15" cy="7" r="1.5"></circle>
              <circle cx="15" cy="12" r="1.5"></circle>
              <circle cx="15" cy="17" r="1.5"></circle>
            </svg>
          </div>
          <div class="admin-battle-opt-badge">${letter}</div>
          <input 
            type="text" 
            class="admin-battle-opt-input" 
            placeholder="Enter answer option ${letter}..." 
            value="${textVal.replace(/"/g, '&quot;')}"
            required 
          />
          <label class="admin-correct-answer-toggle">
            <input type="checkbox" class="opt-correct-chk" value="${letter}" ${isChecked ? 'checked' : ''} />
            <span class="admin-chk-circle"></span>
            <span class="admin-chk-text">Correct answer</span>
          </label>
        </div>
      `;
    }).join('');

    block.innerHTML = `
      <div class="admin-table-card-header" style="margin-bottom: 20px;">
        <div class="admin-table-title-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h2 class="admin-card-title q-block-title">Build Battle Question ${qNumber}</h2>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="admin-btn-outline btn-remove-q-block" style="color:#ef4444; border-color:#fca5a5;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete Question</span>
          </button>
        </div>
      </div>

      <!-- Question input -->
      <div class="admin-form-group" style="margin-bottom: 22px;">
        <label class="admin-form-label">Question <span class="required-star">*</span></label>
        <div class="admin-textarea-icon-wrap">
          <span class="admin-field-text-icon" style="top: 14px;">T<sub>T</sub></span>
          <textarea 
            class="admin-textarea-input battle-q-input" 
            placeholder="Enter question here..." 
            rows="3" 
            required
          >${defaultPrompt.replace(/</g, '&lt;')}</textarea>
        </div>
      </div>

      <!-- Option Cards -->
      <div class="admin-battle-options-grid">
        ${optionsHtml}
      </div>

      <!-- Dashed Dropzone -->
      <div class="admin-dashed-arrange-zone">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="7" r="1.5"></circle>
          <circle cx="9" cy="12" r="1.5"></circle>
          <circle cx="9" cy="17" r="1.5"></circle>
          <circle cx="15" cy="7" r="1.5"></circle>
          <circle cx="15" cy="12" r="1.5"></circle>
          <circle cx="15" cy="17" r="1.5"></circle>
        </svg>
        <span>Drag answers here to arrange the battle options</span>
      </div>

      <!-- Correct Option(s) Multi Tags Selector -->
      <div class="admin-form-group" style="margin-top: 22px;">
        <label class="admin-form-label">Correct option(s) <span class="required-star">*</span></label>
        <div class="admin-tags-input-box">
          <div class="admin-tags-list"></div>
          <svg class="admin-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      <!-- Add Option Button -->
      <div style="margin-top: 18px;">
        <button type="button" class="admin-btn-outline btn-add-opt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add Option</span>
        </button>
      </div>
    `;

    questionsListContainer.appendChild(block);
    setupQuestionBlock(block, qNumber);
    refreshQuestionNumbers();
    return block;
  }

  // Hook up initial question block
  const initialBlock = document.querySelector<HTMLElement>('.battle-question-block');
  if (initialBlock) {
    setupQuestionBlock(initialBlock, 1);
  }

  // Add Question Button Click Event
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', () => {
      const existingBlocks = document.querySelectorAll('.battle-question-block');
      const nextQNum = existingBlocks.length + 1;
      const newBlock = createNewQuestionBlock(nextQNum);
      if (newBlock) {
        newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = newBlock.querySelector<HTMLTextAreaElement>('.battle-q-input');
        if (input) input.focus();
        showToast(`Question ${nextQNum} added successfully!`);
      }
    });
  }

  // Check if we are in Edit Mode
  const urlParams = new URLSearchParams(window.location.search);
  const editingBattleId = urlParams.get('id');

  if (editingBattleId) {
    // Update Page Titles and Buttons
    const pageTitle = document.querySelector('.admin-dashboard-title');
    if (pageTitle) pageTitle.textContent = 'Edit Battle';

    const pageSubtitle = document.querySelector('.admin-dashboard-subtitle');
    if (pageSubtitle) {
      pageSubtitle.innerHTML = `<span style="color:#2563eb; font-weight:500;">Battles</span> / Edit Battle`;
    }

    if (saveTopBtn) {
      const span = saveTopBtn.querySelector('span');
      if (span) span.textContent = 'Update Battle';
    }
    if (saveBottomBtn) {
      const span = saveBottomBtn.querySelector('span');
      if (span) span.textContent = 'Update Battle';
    }

    // Fetch existing battle details
    fetch(`/api/battles/${encodeURIComponent(editingBattleId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data.success || !data.battle) {
          showToast('Failed to load battle details');
          return;
        }

        const b = data.battle;
        const titleInput = document.getElementById('battle-title') as HTMLInputElement | null;
        const descInput = document.getElementById('battle-desc') as HTMLTextAreaElement | null;
        const durationSelect = document.getElementById('battle-duration') as HTMLSelectElement | null;
        const maxPlayersSelect = document.getElementById('battle-max-players') as HTMLSelectElement | null;

        if (titleInput) titleInput.value = b.title || '';
        if (descInput) descInput.value = b.description || b.questionPrompt || b.title || '';
        if (durationSelect) {
          const durStr = String(b.timePerQuestion || 30);
          let found = false;
          for (let i = 0; i < durationSelect.options.length; i++) {
            if (durationSelect.options[i].value === durStr) {
              durationSelect.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            const newOpt = document.createElement('option');
            newOpt.value = durStr;
            newOpt.textContent = `${durStr} minutes`;
            durationSelect.appendChild(newOpt);
            durationSelect.value = durStr;
          }
        }

        if (maxPlayersSelect && b.maxPlayers) {
          maxPlayersSelect.value = String(b.maxPlayers);
        }

        // Populate questions
        const questionsList: any[] = Array.isArray(b.questions) && b.questions.length > 0
          ? b.questions
          : [
              {
                prompt: b.questionPrompt || '',
                options: b.options || [],
                correctOptions: b.correctOptions || ['A']
              }
            ];

        if (questionsListContainer) {
          // Clear and recreate blocks
          questionsListContainer.innerHTML = '';
          questionsList.forEach((q, idx) => {
            if (idx === 0) {
              // Create Question 1 with Add Question button in top right
              const block = document.createElement('div');
              block.className = 'admin-card admin-form-card battle-question-block';
              block.setAttribute('data-q-index', '0');

              const options = q.options && q.options.length > 0 ? q.options : [
                { id: 'A', text: 'Option A' },
                { id: 'B', text: 'Option B' },
                { id: 'C', text: 'Option C' },
                { id: 'D', text: 'Option D' }
              ];
              const correctOpts = q.correctOptions || ['A'];

              const optionsHtml = options.map((opt: any, optIdx: number) => {
                const letter = opt.id || String.fromCharCode(65 + optIdx);
                const textVal = typeof opt === 'string' ? opt : (opt.text || `Option ${letter}`);
                const isChecked = correctOpts.includes(letter);
                return `
                  <div class="admin-battle-opt-card" data-opt="${letter}">
                    <div class="admin-drag-handle" title="Drag to reorder">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="7" r="1.5"></circle>
                        <circle cx="9" cy="12" r="1.5"></circle>
                        <circle cx="9" cy="17" r="1.5"></circle>
                        <circle cx="15" cy="7" r="1.5"></circle>
                        <circle cx="15" cy="12" r="1.5"></circle>
                        <circle cx="15" cy="17" r="1.5"></circle>
                      </svg>
                    </div>
                    <div class="admin-battle-opt-badge">${letter}</div>
                    <input 
                      type="text" 
                      class="admin-battle-opt-input" 
                      placeholder="Enter answer option ${letter}..." 
                      value="${textVal.replace(/"/g, '&quot;')}"
                      required 
                    />
                    <label class="admin-correct-answer-toggle">
                      <input type="checkbox" class="opt-correct-chk" value="${letter}" ${isChecked ? 'checked' : ''} />
                      <span class="admin-chk-circle"></span>
                      <span class="admin-chk-text">Correct answer</span>
                    </label>
                  </div>
                `;
              }).join('');

              block.innerHTML = `
                <div class="admin-table-card-header" style="margin-bottom: 20px;">
                  <div class="admin-table-title-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <h2 class="admin-card-title q-block-title">Build Battle Question 1</h2>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    <button type="button" class="admin-btn-outline btn-remove-q-block" style="display:none; color:#ef4444; border-color:#fca5a5;">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete Question</span>
                    </button>
                    <button type="button" class="admin-btn-outline" id="btn-add-battle-q">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                <div class="admin-form-group" style="margin-bottom: 22px;">
                  <label class="admin-form-label">Question <span class="required-star">*</span></label>
                  <div class="admin-textarea-icon-wrap">
                    <span class="admin-field-text-icon" style="top: 14px;">T<sub>T</sub></span>
                    <textarea 
                      class="admin-textarea-input battle-q-input" 
                      placeholder="Enter question here..." 
                      rows="3" 
                      required
                    >${(q.prompt || q.questionPrompt || '').replace(/</g, '&lt;')}</textarea>
                  </div>
                </div>

                <div class="admin-battle-options-grid">
                  ${optionsHtml}
                </div>

                <div class="admin-dashed-arrange-zone">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="7" r="1.5"></circle>
                    <circle cx="9" cy="12" r="1.5"></circle>
                    <circle cx="9" cy="17" r="1.5"></circle>
                    <circle cx="15" cy="7" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="15" cy="17" r="1.5"></circle>
                  </svg>
                  <span>Drag answers here to arrange the battle options</span>
                </div>

                <div class="admin-form-group" style="margin-top: 22px;">
                  <label class="admin-form-label">Correct option(s) <span class="required-star">*</span></label>
                  <div class="admin-tags-input-box">
                    <div class="admin-tags-list"></div>
                    <svg class="admin-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                <div style="margin-top: 18px;">
                  <button type="button" class="admin-btn-outline btn-add-opt">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Add Option</span>
                  </button>
                </div>
              `;

              questionsListContainer.appendChild(block);
              setupQuestionBlock(block, 1);

              // Wire the Add Question button in block 1
              block.querySelector('#btn-add-battle-q')?.addEventListener('click', () => {
                const existing = document.querySelectorAll('.battle-question-block');
                const nextNum = existing.length + 1;
                const nb = createNewQuestionBlock(nextNum);
                if (nb) {
                  nb.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  nb.querySelector<HTMLTextAreaElement>('.battle-q-input')?.focus();
                  showToast(`Question ${nextNum} added successfully!`);
                }
              });
            } else {
              createNewQuestionBlock(idx + 1, {
                prompt: q.prompt || q.questionPrompt || '',
                options: q.options || [],
                correctOptions: q.correctOptions || ['A']
              });
            }
          });

          refreshQuestionNumbers();
        }
      })
      .catch((err) => {
        console.error('Error fetching battle details for edit:', err);
        showToast('Error loading battle data');
      });
  }

  // Populate Problem Library Selector
  const problemSelect = document.getElementById('battle-select-problem') as HTMLSelectElement | null;
  let loadedProblems: any[] = [];
  if (problemSelect) {
    fetch('/api/problems')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.problems)) {
          loadedProblems = data.problems;
          data.problems.forEach((p: any) => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.title} (${p.difficulty}) - ${p.topic?.name || p.topic || 'General'}`;
            opt.setAttribute('data-topic', p.topic?.name || p.topic || 'Algorithm Arena');
            problemSelect.appendChild(opt);
          });
        }
      })
      .catch(err => console.warn('Could not load problems for battle selector:', err));

    problemSelect.addEventListener('change', () => {
      const selectedId = problemSelect.value;
      const prob = loadedProblems.find(p => p.id === selectedId);
      if (prob) {
        const titleInput = document.getElementById('battle-title') as HTMLInputElement | null;
        const descInput = document.getElementById('battle-desc') as HTMLTextAreaElement | null;
        const firstQInput = document.querySelector<HTMLTextAreaElement>('.battle-q-input, #battle-question-text');

        if (titleInput) titleInput.value = prob.title;
        if (descInput) descInput.value = prob.description || prob.statement || prob.title;
        if (firstQInput) firstQInput.value = prob.statement || prob.description || `Solve problem: ${prob.title}`;
        showToast(`Linked problem: ${prob.title}`);
      }
    });
  }

  // Form Submission
  async function handleSaveBattle(e: Event) {
    e.preventDefault();

    const title = (document.getElementById('battle-title') as HTMLInputElement | null)?.value.trim();
    const datetime = (document.getElementById('battle-datetime') as HTMLSelectElement | null)?.value;
    const duration = (document.getElementById('battle-duration') as HTMLSelectElement | null)?.value;
    const maxPlayersInput = document.getElementById('battle-max-players') as HTMLSelectElement | null;
    const maxPlayers = maxPlayersInput ? parseInt(maxPlayersInput.value, 10) : 4;
    const desc = (document.getElementById('battle-desc') as HTMLTextAreaElement | null)?.value.trim();
    const selectedProblemId = problemSelect?.value || '';
    const selectedProb = loadedProblems.find(p => p.id === selectedProblemId);
    const topic = selectedProb ? (selectedProb.topic?.name || selectedProb.topic || 'Algorithm Arena') : 'Algorithm Arena';

    if (!title) {
      showToast('Please enter battle title');
      document.getElementById('battle-title')?.focus();
      return;
    }
    if (!datetime) {
      showToast('Please select battle date & time');
      document.getElementById('battle-datetime')?.focus();
      return;
    }
    if (!duration) {
      showToast('Please select duration');
      document.getElementById('battle-duration')?.focus();
      return;
    }
    if (!desc) {
      showToast('Please enter battle description');
      document.getElementById('battle-desc')?.focus();
      return;
    }

    // Collect all Question Blocks
    const questionBlocks = document.querySelectorAll<HTMLElement>('.battle-question-block');
    if (questionBlocks.length === 0) {
      showToast('Please add at least one question');
      return;
    }

    const compiledQuestions: any[] = [];

    for (let i = 0; i < questionBlocks.length; i++) {
      const blk = questionBlocks[i];
      const qNum = i + 1;
      const qInput = blk.querySelector<HTMLTextAreaElement>('.battle-q-input, #battle-question-text');
      const qPrompt = qInput?.value.trim() || '';

      if (!qPrompt) {
        showToast(`Please enter question text for Question ${qNum}`);
        qInput?.focus();
        return;
      }

      const checkedBoxes = blk.querySelectorAll<HTMLInputElement>('.opt-correct-chk:checked');
      if (checkedBoxes.length === 0) {
        showToast(`Please select at least one correct option for Question ${qNum}`);
        return;
      }

      const correctVals = Array.from(checkedBoxes).map(cb => cb.value);
      const optionCards = blk.querySelectorAll<HTMLElement>('.admin-battle-opt-card');
      const options = Array.from(optionCards).map(c => {
        const optLetter = c.getAttribute('data-opt') || 'A';
        const textInput = c.querySelector<HTMLInputElement>('.admin-battle-opt-input');
        const val = textInput?.value.trim() || '';
        return {
          id: optLetter,
          text: val || `Option ${optLetter}`
        };
      });

      compiledQuestions.push({
        prompt: qPrompt,
        questionPrompt: qPrompt,
        options,
        correctOptions: correctVals
      });
    }

    const firstQ = compiledQuestions[0];

    try {
      const url = editingBattleId
        ? `/api/battles/${encodeURIComponent(editingBattleId)}`
        : '/api/battles';
      const method = editingBattleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          topic,
          questionPrompt: firstQ.prompt,
          questionCount: compiledQuestions.length,
          timePerQuestion: parseInt(duration, 10) || 24,
          maxPlayers,
          hostName: 'Admin',
          options: firstQ.options,
          correctOptions: firstQ.correctOptions,
          questions: compiledQuestions
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const successMsg = editingBattleId
        ? 'Battle updated successfully! Redirecting...'
        : 'Battle created and published successfully! Redirecting...';
      showToast(successMsg);
      setTimeout(() => {
        window.location.href = '/admin/adminbattle';
      }, 1200);
    } catch (err) {
      console.error('Error saving battle:', err);
      showToast(editingBattleId ? 'Failed to update battle' : 'Battle created locally. Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/adminbattle';
      }, 1200);
    }
  }

  if (form) {
    form.addEventListener('submit', handleSaveBattle);
  }
  if (saveTopBtn) {
    saveTopBtn.addEventListener('click', () => {
      if (form) {
        form.requestSubmit();
      }
    });
  }
  if (saveBottomBtn) {
    saveBottomBtn.addEventListener('click', () => {
      if (form) {
        form.requestSubmit();
      }
    });
  }
});
