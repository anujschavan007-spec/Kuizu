import './adminProfileModal';
import { enforceAdminGuard } from './services/adminAuthGuard';

interface QuestionItem {
  id: string | number;
  name: string;
  sourceType: 'quiz' | 'problem' | 'manual';
  sourceId?: number | string | null;
  questionContent: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  rewardXp?: number;
}

interface QuizItem {
  id: number;
  name: string;
  description?: string;
  levelNumber?: number;
  questionCount?: number;
  questionContent?: string;
  options?: { a?: string; b?: string; c?: string; d?: string };
  correctOption?: string;
}

interface ProblemItem {
  id: number;
  title: string;
  description?: string;
  difficulty?: string;
  topicName?: string;
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

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce strictly admin access (anujschavan007@gmail.com)
  const isAllowed = await enforceAdminGuard();
  if (!isAllowed) {
    return;
  }

  // State
  let selectedQuestions: QuestionItem[] = [];
  let availableQuizzes: QuizItem[] = [];
  let availableProblems: ProblemItem[] = [];

  // Form Elements
  const form = document.getElementById('create-dailykuizu-form') as HTMLFormElement | null;
  const targetDateInput = document.getElementById('daily-target-date') as HTMLInputElement | null;
  const expirySelect = document.getElementById('daily-expiry-time') as HTMLSelectElement | null;
  const titleInput = document.getElementById('daily-title') as HTMLInputElement | null;
  const descInput = document.getElementById('daily-description') as HTMLTextAreaElement | null;
  const rewardXpInput = document.getElementById('daily-reward-xp') as HTMLInputElement | null;
  const streakBonusInput = document.getElementById('daily-streak-bonus') as HTMLInputElement | null;
  const saveBtn = document.getElementById('save-dailykuizu-btn') as HTMLButtonElement | null;
  const pageTitle = document.getElementById('page-heading-title');

  // Question Tray Elements
  const questionsList = document.getElementById('selected-questions-list');
  const countBadgeNumber = document.getElementById('selected-count-number');
  const validationMsg = document.getElementById('selection-validation-msg');

  // Source Elements
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.source-tab-btn');
  const tabPanels = document.querySelectorAll<HTMLElement>('.source-tab-panel');
  const quizzesContainer = document.getElementById('quizzes-source-list');
  const problemsContainer = document.getElementById('problems-source-list');
  const searchQuizzesInput = document.getElementById('search-quizzes-input') as HTMLInputElement | null;
  const searchProblemsInput = document.getElementById('search-problems-input') as HTMLInputElement | null;

  // Custom Question Form Elements
  const customQuestionInput = document.getElementById('custom-question-text') as HTMLTextAreaElement | null;
  const customOpt0 = document.getElementById('custom-opt-0') as HTMLInputElement | null;
  const customOpt1 = document.getElementById('custom-opt-1') as HTMLInputElement | null;
  const customOpt2 = document.getElementById('custom-opt-2') as HTMLInputElement | null;
  const customOpt3 = document.getElementById('custom-opt-3') as HTMLInputElement | null;
  const customExplanation = document.getElementById('custom-explanation') as HTMLInputElement | null;
  const btnAddCustom = document.getElementById('btn-add-custom-question') as HTMLButtonElement | null;

  // Calculate default IST Date
  function getTodayISTString(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTomorrowISTString(): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5) + (86400000));
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Pre-fill target date from query param or default tomorrow
  const urlParams = new URLSearchParams(window.location.search);
  const editDateParam = urlParams.get('date');

  if (targetDateInput) {
    targetDateInput.value = editDateParam || getTomorrowISTString();
    if (editDateParam && pageTitle) {
      pageTitle.textContent = 'Edit Daily Kuizu';
    }
  }

  // Load existing daily quiz if editing
  async function loadExistingIfPresent(dateStr: string) {
    try {
      const res = await fetch('/api/daily-quizzes');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.dailyQuizzes)) {
          const match = data.dailyQuizzes.find((q: any) => q.assignedDate === dateStr);
          if (match) {
            if (titleInput) titleInput.value = match.title || '';
            if (descInput) descInput.value = match.description || '';
            if (expirySelect) expirySelect.value = match.expiryTime || '12:00 PM IST';
            if (rewardXpInput) rewardXpInput.value = String(match.rewardXp || 15);
            if (streakBonusInput) streakBonusInput.value = String(match.streakBonus || 5);

            if (Array.isArray(match.questions) && match.questions.length > 0) {
              selectedQuestions = match.questions.map((q: any, idx: number) => ({
                id: q.id || `q_${Date.now()}_${idx}`,
                name: q.name || `Question ${idx + 1}`,
                sourceType: q.sourceType || 'manual',
                sourceId: q.sourceId || null,
                questionContent: q.questionContent || '',
                optionA: q.optionA || '',
                optionB: q.optionB || '',
                optionC: q.optionC || '',
                optionD: q.optionD || '',
                correctOption: q.correctOption || 'A',
                explanation: q.explanation || '',
                rewardXp: q.rewardXp || 10
              }));
              renderQuestionsTray();
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not load existing daily quiz for date:', err);
    }
  }

  if (editDateParam) {
    await loadExistingIfPresent(editDateParam);
  }

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => {
        b.classList.remove('active');
        b.style.color = '#64748b';
        b.style.borderBottom = '2px solid transparent';
        b.style.fontWeight = '500';
      });
      btn.classList.add('active');
      btn.style.color = '#2563eb';
      btn.style.borderBottom = '2px solid #2563eb';
      btn.style.fontWeight = '600';

      tabPanels.forEach((panel) => {
        panel.style.display = panel.id === targetTab ? 'block' : 'none';
      });
    });
  });

  // Render Tray
  function renderQuestionsTray() {
    if (!questionsList || !countBadgeNumber) return;

    countBadgeNumber.textContent = String(selectedQuestions.length);

    if (validationMsg) {
      if (selectedQuestions.length < 3) {
        validationMsg.style.display = 'flex';
        validationMsg.style.background = '#fffbeb';
        validationMsg.style.borderColor = '#fef3c7';
        validationMsg.style.color = '#b45309';
        validationMsg.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Please select at least 3 questions (currently ${selectedQuestions.length} selected).</span>
        `;
      } else if (selectedQuestions.length > 5) {
        validationMsg.style.display = 'flex';
        validationMsg.style.background = '#fff1f2';
        validationMsg.style.borderColor = '#ffe4e6';
        validationMsg.style.color = '#be123c';
        validationMsg.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>Maximum 5 questions allowed (currently ${selectedQuestions.length} selected). Remove some questions to proceed.</span>
        `;
      } else {
        validationMsg.style.display = 'flex';
        validationMsg.style.background = '#f0fdf4';
        validationMsg.style.borderColor = '#dcfce7';
        validationMsg.style.color = '#15803d';
        validationMsg.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Valid daily challenge: ${selectedQuestions.length} questions selected (3 to 5 required).</span>
        `;
      }
    }

    if (selectedQuestions.length === 0) {
      questionsList.innerHTML = `
        <div id="empty-tray-state" style="text-align: center; padding: 36px 16px; border: 1.5px dashed #e2e8f0; border-radius: 12px; color: #94a3b8;">
          <p style="font-size: 14px; font-weight: 500; margin: 0 0 4px 0; color: #64748b;">No Questions Added Yet</p>
          <p style="font-size: 13px; margin: 0;">Use the sources below to add questions from Quizzes, Problems, or create custom questions.</p>
        </div>
      `;
      return;
    }

    questionsList.innerHTML = selectedQuestions.map((q, idx) => {
      let sourceBadgeColor = '#2563eb';
      let sourceBadgeBg = '#eff6ff';
      let sourceLabel = 'Quiz';

      if (q.sourceType === 'problem') {
        sourceBadgeColor = '#7c3aed';
        sourceBadgeBg = '#f5f3ff';
        sourceLabel = 'Problem';
      } else if (q.sourceType === 'manual') {
        sourceBadgeColor = '#059669';
        sourceBadgeBg = '#ecfdf5';
        sourceLabel = 'Manual';
      }

      const snippet = q.questionContent.length > 90 ? q.questionContent.substring(0, 90) + '...' : q.questionContent;

      return `
        <div class="tray-question-item" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          transition: border-color 0.15s;
        ">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <span style="
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background: #f1f5f9;
              color: #475569;
              font-size: 12px;
              font-weight: 700;
              flex-shrink: 0;
            ">${idx + 1}</span>

            <span style="
              display: inline-flex;
              align-items: center;
              padding: 2px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              color: ${sourceBadgeColor};
              background: ${sourceBadgeBg};
              flex-shrink: 0;
              text-transform: uppercase;
            ">${sourceLabel}</span>

            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${q.name}
              </div>
              <div style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
                ${snippet || 'No text preview'}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 12px;">
            <button type="button" class="btn-move-up" data-index="${idx}" title="Move Up" style="
              border: 1px solid #e2e8f0;
              background: #ffffff;
              color: #64748b;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              cursor: ${idx === 0 ? 'not-allowed' : 'pointer'};
              opacity: ${idx === 0 ? '0.4' : '1'};
            " ${idx === 0 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>

            <button type="button" class="btn-move-down" data-index="${idx}" title="Move Down" style="
              border: 1px solid #e2e8f0;
              background: #ffffff;
              color: #64748b;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              cursor: ${idx === selectedQuestions.length - 1 ? 'not-allowed' : 'pointer'};
              opacity: ${idx === selectedQuestions.length - 1 ? '0.4' : '1'};
            " ${idx === selectedQuestions.length - 1 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <button type="button" class="btn-remove-q" data-index="${idx}" title="Remove question" style="
              border: 1px solid #fee2e2;
              background: #fff5f5;
              color: #ef4444;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach button listeners
    questionsList.querySelectorAll<HTMLButtonElement>('.btn-remove-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        selectedQuestions.splice(idx, 1);
        renderQuestionsTray();
      });
    });

    questionsList.querySelectorAll<HTMLButtonElement>('.btn-move-up').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        if (idx > 0) {
          const temp = selectedQuestions[idx];
          selectedQuestions[idx] = selectedQuestions[idx - 1];
          selectedQuestions[idx - 1] = temp;
          renderQuestionsTray();
        }
      });
    });

    questionsList.querySelectorAll<HTMLButtonElement>('.btn-move-down').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        if (idx < selectedQuestions.length - 1) {
          const temp = selectedQuestions[idx];
          selectedQuestions[idx] = selectedQuestions[idx + 1];
          selectedQuestions[idx + 1] = temp;
          renderQuestionsTray();
        }
      });
    });
  }

  // Load Quizzes from Server
  async function loadQuizzes() {
    if (!quizzesContainer) return;
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.quizzes || []);
        availableQuizzes = list;
        renderQuizzesList();
      } else {
        quizzesContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #ef4444; font-size: 14px;">Failed to load quizzes.</div>';
      }
    } catch (err) {
      console.warn('Error loading quizzes:', err);
      quizzesContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #ef4444; font-size: 14px;">Error connecting to quizzes API.</div>';
    }
  }

  function renderQuizzesList() {
    if (!quizzesContainer) return;
    const query = searchQuizzesInput ? searchQuizzesInput.value.trim().toLowerCase() : '';

    const filtered = availableQuizzes.filter((q) => {
      return q.name.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      quizzesContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 14px;">No quizzes found matching search.</div>';
      return;
    }

    quizzesContainer.innerHTML = filtered.map((q) => {
      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        ">
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 14px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${q.name}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 1px;">
              Level ${q.levelNumber || 1} • ${q.questionCount || 1} Question(s)
            </div>
          </div>
          <button type="button" class="btn-add-quiz-to-tray" data-id="${q.id}" style="
            border: 1px solid #dbeafe;
            background: #eff6ff;
            color: #2563eb;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>
      `;
    }).join('');

    quizzesContainer.querySelectorAll<HTMLButtonElement>('.btn-add-quiz-to-tray').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (selectedQuestions.length >= 5) {
          showToast('Maximum 5 questions allowed for Daily Kuizu.');
          return;
        }

        const qId = Number(btn.getAttribute('data-id'));
        const quiz = availableQuizzes.find((q) => q.id === qId);
        if (!quiz) return;

        const options = quiz.options || {};
        selectedQuestions.push({
          id: `quiz_${quiz.id}_${Date.now()}`,
          name: quiz.name,
          sourceType: 'quiz',
          sourceId: quiz.id,
          questionContent: quiz.questionContent || quiz.name,
          optionA: options.a || 'Option A',
          optionB: options.b || 'Option B',
          optionC: options.c || 'Option C',
          optionD: options.d || 'Option D',
          correctOption: (quiz.correctOption as any) || 'A',
          rewardXp: 10
        });

        renderQuestionsTray();
        showToast(`Added "${quiz.name}" to Daily Kuizu.`);
      });
    });
  }

  if (searchQuizzesInput) {
    searchQuizzesInput.addEventListener('input', renderQuizzesList);
  }

  // Load Problems from Server
  async function loadProblems() {
    if (!problemsContainer) return;
    try {
      const res = await fetch('/api/problems');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.problems || []);
        availableProblems = list;
        renderProblemsList();
      } else {
        problemsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #ef4444; font-size: 14px;">Failed to load problems.</div>';
      }
    } catch (err) {
      console.warn('Error loading problems:', err);
      problemsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #ef4444; font-size: 14px;">Error connecting to problems API.</div>';
    }
  }

  function renderProblemsList() {
    if (!problemsContainer) return;
    const query = searchProblemsInput ? searchProblemsInput.value.trim().toLowerCase() : '';

    const filtered = availableProblems.filter((p) => {
      return p.title.toLowerCase().includes(query) || (p.topicName && p.topicName.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      problemsContainer.innerHTML = '<div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 14px;">No problems found matching search.</div>';
      return;
    }

    problemsContainer.innerHTML = filtered.map((p) => {
      const diff = (p.difficulty || 'Medium').toLowerCase();
      let diffBg = '#f1f5f9';
      let diffColor = '#475569';
      if (diff === 'easy') {
        diffBg = '#ecfdf5';
        diffColor = '#059669';
      } else if (diff === 'medium') {
        diffBg = '#eff6ff';
        diffColor = '#2563eb';
      } else if (diff === 'hard') {
        diffBg = '#fef2f2';
        diffColor = '#dc2626';
      }

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        ">
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${p.title}
              </span>
              <span style="font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: ${diffBg}; color: ${diffColor}; text-transform: capitalize;">
                ${p.difficulty || 'Medium'}
              </span>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 1px;">
              ${p.topicName ? `Topic: ${p.topicName}` : 'Coding Challenge'}
            </div>
          </div>
          <button type="button" class="btn-add-problem-to-tray" data-id="${p.id}" style="
            border: 1px solid #f3e8ff;
            background: #faf5ff;
            color: #7c3aed;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>
      `;
    }).join('');

    problemsContainer.querySelectorAll<HTMLButtonElement>('.btn-add-problem-to-tray').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (selectedQuestions.length >= 5) {
          showToast('Maximum 5 questions allowed for Daily Kuizu.');
          return;
        }

        const pId = Number(btn.getAttribute('data-id'));
        const prob = availableProblems.find((p) => p.id === pId);
        if (!prob) return;

        selectedQuestions.push({
          id: `problem_${prob.id}_${Date.now()}`,
          name: prob.title,
          sourceType: 'problem',
          sourceId: prob.id,
          questionContent: `What is the optimal approach and time complexity for solving "${prob.title}"?`,
          optionA: 'O(N) with Hash Map / Sliding Window',
          optionB: 'O(N^2) Brute Force Search',
          optionC: 'O(N log N) Sorting then Two Pointers',
          optionD: 'O(log N) Binary Search over sorted space',
          correctOption: 'A',
          explanation: `Optimal solution for ${prob.title} utilizes single-pass linear time scanning.`,
          rewardXp: 15
        });

        renderQuestionsTray();
        showToast(`Added "${prob.title}" to Daily Kuizu.`);
      });
    });
  }

  if (searchProblemsInput) {
    searchProblemsInput.addEventListener('input', renderProblemsList);
  }

  // Handle Add Custom Question
  if (btnAddCustom) {
    btnAddCustom.addEventListener('click', () => {
      if (selectedQuestions.length >= 5) {
        showToast('Maximum 5 questions allowed for Daily Kuizu.');
        return;
      }

      const qText = customQuestionInput ? customQuestionInput.value.trim() : '';
      const optA = customOpt0 ? customOpt0.value.trim() : '';
      const optB = customOpt1 ? customOpt1.value.trim() : '';
      const optC = customOpt2 ? customOpt2.value.trim() : '';
      const optD = customOpt3 ? customOpt3.value.trim() : '';
      const explanation = customExplanation ? customExplanation.value.trim() : '';

      if (!qText) {
        showToast('Please enter the question prompt.');
        customQuestionInput?.focus();
        return;
      }

      if (!optA || !optB || !optC || !optD) {
        showToast('Please fill out all four options (A, B, C, D).');
        return;
      }

      const checkedRadio = document.querySelector<HTMLInputElement>('input[name="custom-correct-opt"]:checked');
      const val = checkedRadio ? checkedRadio.value : '0';
      const mapValToLetter: Record<string, 'A' | 'B' | 'C' | 'D'> = {
        '0': 'A',
        '1': 'B',
        '2': 'C',
        '3': 'D'
      };
      const correctOption = mapValToLetter[val] || 'A';

      selectedQuestions.push({
        id: `custom_${Date.now()}`,
        name: qText.substring(0, 40) + (qText.length > 40 ? '...' : ''),
        sourceType: 'manual',
        sourceId: null,
        questionContent: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption,
        explanation,
        rewardXp: 10
      });

      // Clear inputs
      if (customQuestionInput) customQuestionInput.value = '';
      if (customOpt0) customOpt0.value = '';
      if (customOpt1) customOpt1.value = '';
      if (customOpt2) customOpt2.value = '';
      if (customOpt3) customOpt3.value = '';
      if (customExplanation) customExplanation.value = '';

      renderQuestionsTray();
      showToast('Custom question added to challenge tray.');
    });
  }

  // Handle Form Submission / Save
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const assignedDate = targetDateInput ? targetDateInput.value.trim() : '';
      const title = titleInput ? titleInput.value.trim() : '';
      const description = descInput ? descInput.value.trim() : '';
      const expiryTime = expirySelect ? expirySelect.value : '12:00 PM IST';
      const rewardXp = rewardXpInput ? parseInt(rewardXpInput.value, 10) || 15 : 15;
      const streakBonus = streakBonusInput ? parseInt(streakBonusInput.value, 10) || 5 : 5;

      if (!assignedDate) {
        showToast('Please select a target scheduled date.');
        targetDateInput?.focus();
        return;
      }

      if (!title) {
        showToast('Please enter a challenge title.');
        titleInput?.focus();
        return;
      }

      if (selectedQuestions.length < 3 || selectedQuestions.length > 5) {
        showToast(`Please select between 3 and 5 questions (currently ${selectedQuestions.length}).`);
        return;
      }

      // Format payload
      const quizIds = selectedQuestions
        .filter((q) => q.sourceType === 'quiz' && q.sourceId)
        .map((q) => Number(q.sourceId))
        .filter((id) => !isNaN(id));

      const payload = {
        assignedDate,
        title,
        description,
        expiryTime,
        rewardXp,
        streakBonus,
        quizIds,
        questions: selectedQuestions.map((q, idx) => ({
          id: idx + 1,
          num: idx + 1,
          name: q.name,
          sourceType: q.sourceType,
          sourceId: q.sourceId,
          questionContent: q.questionContent,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation || '',
          rewardXp: q.rewardXp || 10
        }))
      };

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await fetch('/api/daily-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Daily Kuizu saved successfully!');
          setTimeout(() => {
            window.location.href = '/admin/daily-kuizu';
          }, 800);
        } else {
          showToast(data.error || 'Failed to save daily kuizu.');
          saveBtn.disabled = false;
          saveBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Daily Kuizu</span>
          `;
        }
      } catch (err) {
        console.error('Error saving daily quiz:', err);
        showToast('Network error while saving daily kuizu.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Save Daily Kuizu</span>
        `;
      }
    });
  }

  // Load available quiz and problem sources in background
  loadQuizzes();
  loadProblems();
  renderQuestionsTray();
});
