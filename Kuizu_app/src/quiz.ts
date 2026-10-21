import confetti from 'canvas-confetti';
import { fetchQuizLevels, fetchLevelQuestions, submitQuizLevelAnswers } from './services/quizService';
import type { QuizLevel, QuizQuestion, QuizResult } from './types';
import './services/userHeaderProfile';
import './services/adminAuthGuard';
import { soundManager } from './services/soundManager';
import { showFirstQuizLevelBadgeModal } from './services/firstQuizLevelBadgeModal';
import { unlockBadge, isBadgeUnlocked } from './services/badgeManager';
import { initExamProctoring } from './services/proctoringService';

// State
let levels: QuizLevel[] = [];
let activeLevel: QuizLevel | null = null;
let currentQuestions: QuizQuestion[] = [];
let currentQuestionIndex = 0;
let userAnswers: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
let timerInterval: number | undefined;
let timerSecondsRemaining = 600; // 10:00

// DOM Elements: Header & Menus
const userAvatarBtn = document.getElementById('btn-user-avatar') as HTMLButtonElement | null;
const userDropdown = document.getElementById('user-dropdown') as HTMLDivElement | null;

// DOM Elements: Overview Modal
const modalLevelOverview = document.getElementById('modal-level-overview') as HTMLDivElement | null;
const btnCloseOverview = document.getElementById('btn-close-overview') as HTMLButtonElement | null;
const modalLevelBadge = document.getElementById('modal-level-badge') as HTMLDivElement | null;
const modalLevelTitle = document.getElementById('modal-level-title') as HTMLHeadingElement | null;
const modalLevelDesc = document.getElementById('modal-level-desc') as HTMLParagraphElement | null;
const modalStar1 = document.getElementById('modal-star-1') as HTMLSpanElement | null;
const modalStar2 = document.getElementById('modal-star-2') as HTMLSpanElement | null;
const modalStar3 = document.getElementById('modal-star-3') as HTMLSpanElement | null;
const modalStarsCaption = document.getElementById('modal-stars-caption') as HTMLSpanElement | null;
const modalStatQuestions = document.getElementById('modal-stat-questions') as HTMLSpanElement | null;
const modalStatXp = document.getElementById('modal-stat-xp') as HTMLSpanElement | null;
const modalStatTime = document.getElementById('modal-stat-time') as HTMLSpanElement | null;
const btnLaunchQuiz = document.getElementById('btn-launch-quiz') as HTMLButtonElement | null;

// DOM Elements: Quiz Arena (img4_level_page.png)
const arenaOverlay = document.getElementById('quiz-arena-overlay') as HTMLDivElement | null;
const btnExitArena = document.getElementById('btn-exit-arena') as HTMLButtonElement | null;
const arenaLevelIndicator = document.getElementById('arena-level-indicator') as HTMLSpanElement | null;
const arenaSegmentedProgress = document.getElementById('arena-segmented-progress') as HTMLDivElement | null;
const arenaQuestionCounter = document.getElementById('arena-question-counter') as HTMLSpanElement | null;
const arenaQuestionXp = document.getElementById('arena-question-xp') as HTMLSpanElement | null;
const timerText = document.getElementById('timer-text') as HTMLSpanElement | null;
const arenaQuestionText = document.getElementById('arena-question-text') as HTMLHeadingElement | null;
const arenaOptionsGrid = document.getElementById('arena-options-grid') as HTMLDivElement | null;
const btnQuizPrev = document.getElementById('btn-quiz-prev') as HTMLButtonElement | null;
const btnQuizNext = document.getElementById('btn-quiz-next') as HTMLButtonElement | null;

// DOM Elements: AI Explanation & Chat
const arenaAiBanner = document.getElementById('arena-ai-banner') as HTMLDivElement | null;
const aiStatusPill = document.getElementById('ai-status-pill') as HTMLSpanElement | null;
const aiBannerExplanation = document.getElementById('ai-banner-explanation') as HTMLParagraphElement | null;
const btnAskAiTutor = document.getElementById('btn-ask-ai-tutor') as HTMLButtonElement | null;

const modalAiChat = document.getElementById('modal-ai-chat') as HTMLDivElement | null;
const btnCloseAiChat = document.getElementById('btn-close-ai-chat') as HTMLButtonElement | null;
const aiContextQuestionText = document.getElementById('ai-context-question-text') as HTMLDivElement | null;
const aiContextOptionsSummary = document.getElementById('ai-context-options-summary') as HTMLDivElement | null;
const aiChatMessages = document.getElementById('ai-chat-messages') as HTMLDivElement | null;
const aiChatChips = document.getElementById('ai-chat-chips') as HTMLDivElement | null;
const aiChatForm = document.getElementById('ai-chat-form') as HTMLFormElement | null;
const aiChatInput = document.getElementById('ai-chat-input') as HTMLInputElement | null;

// Chat History Per Question ID
const questionChatHistory: Record<number, Array<{ role: 'ai' | 'user'; content: string }>> = {};

// DOM Elements: Results Modal
const modalQuizResults = document.getElementById('modal-quiz-results') as HTMLDivElement | null;
const resultsLevelSubtitle = document.getElementById('results-level-subtitle') as HTMLParagraphElement | null;
const resultsStarsRow = document.getElementById('results-stars-row') as HTMLDivElement | null;
const resultsStarsLabel = document.getElementById('results-stars-label') as HTMLParagraphElement | null;
const resultsScoreText = document.getElementById('results-score-text') as HTMLSpanElement | null;
const resultsXpText = document.getElementById('results-xp-text') as HTMLSpanElement | null;
const btnResultsContinue = document.getElementById('btn-results-continue') as HTMLButtonElement | null;
const btnReopenQuizBadge3D = document.getElementById('btn-reopen-quiz-badge-3d') as HTMLButtonElement | null;

/**
 * Toast Helper
 */
let toastTimer: number | undefined;
function showToast(message: string): void {
  let toast = document.getElementById('kuizu-toast') as HTMLDivElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-banner';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;

  toast.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.classList.remove('show'), 2800);
}

/**
 * Confetti celebration trigger
 */
function launchConfetti(): void {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    console.warn('Confetti error', e);
  }
}

/**
 * Update the map level nodes on the canvas
 */
function updateMapNodes(): void {
  const mapWrapper = document.querySelector('.quiz-map-wrapper');
  if (!mapWrapper) return;

  // Track rendered level IDs
  const renderedIds = new Set<number>();

  levels.forEach((lvl) => {
    const lvlNum = Number(lvl.id ?? (lvl as any).levelNumber ?? 1);
    renderedIds.add(lvlNum);

    // Level 1 is always unlocked or completed by default, never locked
    if (lvlNum === 1 && lvl.status === 'locked') {
      lvl.status = 'unlocked';
    }

    let nodeEl = document.getElementById(`node-level-${lvlNum}`);
    
    // If not found in static template, create a dynamic map level node
    if (!nodeEl) {
      nodeEl = document.createElement('div');
      nodeEl.id = `node-level-${lvlNum}`;
      nodeEl.setAttribute('data-level', String(lvlNum));
      const left = lvl.position?.leftPercent ?? (14 + ((lvlNum - 1) * 22) % 70);
      const top = lvl.position?.topPercent ?? (72 - ((lvlNum - 1) * 10) % 40);
      nodeEl.style.cssText = `left: ${left}%; top: ${top}%;`;
      mapWrapper.appendChild(nodeEl);
    } else {
      nodeEl.setAttribute('data-level', String(lvlNum));
      nodeEl.style.display = '';
    }

    nodeEl.className = `map-level-node level-${lvlNum}-node ${lvl.status}`;

    // Bind click listener directly
    nodeEl.onclick = () => handleLevelClick(lvlNum);

    const isUnlocked = lvl.status === 'unlocked' || lvl.status === 'completed';
    nodeEl.innerHTML = `
      <div class="node-sign-bubble ${isUnlocked ? 'wooden-sign-unlocked' : 'bubble-locked'}">
        <span class="sign-lvl-title">${escapeHtml(lvl.name || `Level ${lvlNum}`)}</span>
        <span class="sign-status-pill ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}">
          ${
            isUnlocked
              ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${lvl.status === 'completed' ? 'Completed' : 'Unlocked'}</span>`
              : `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>Locked</span>`
          }
        </span>
      </div>
      <button type="button" class="pedestal-disc-btn ${isUnlocked ? 'disc-golden' : 'disc-stone'}" aria-label="Open Level ${lvlNum}">
        <span class="pedestal-outer-ring">
          <span class="pedestal-inner-circle">
            ${
              !isUnlocked
                ? `<span class="pedestal-lock-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 11h-1V7A6 6 0 0 0 6 7v4H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM8 7a4 4 0 0 1 8 0v4H8V7z"/></svg></span>`
                : ''
            }
            <span class="pedestal-number">${lvlNum}</span>
          </span>
        </span>
        ${isUnlocked ? '<span class="pedestal-flag-marker">🚩</span>' : ''}
      </button>
      <div class="node-stars-row" id="stars-level-${lvlNum}">
        <span class="level-star ${lvl.stars >= 1 ? 'star-filled' : 'star-empty'}">★</span>
        <span class="level-star ${lvl.stars >= 2 ? 'star-filled' : 'star-empty'}">★</span>
        <span class="level-star ${lvl.stars >= 3 ? 'star-filled' : 'star-empty'}">★</span>
      </div>
    `;
  });

  // For static nodes in the HTML template that don't have a corresponding level:
  [1, 2, 3, 4].forEach(n => {
    if (!renderedIds.has(n)) {
      const el = document.getElementById(`node-level-${n}`);
      if (el) {
        if (n === 1) {
          // Level 1 is NEVER locked!
          el.className = 'map-level-node level-1-node unlocked';
          el.innerHTML = `
            <div class="node-sign-bubble wooden-sign-unlocked">
              <span class="sign-lvl-title">Level 1</span>
              <span class="sign-status-pill badge-unlocked">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Unlocked</span>
              </span>
            </div>
            <button type="button" class="pedestal-disc-btn disc-golden" aria-label="Open Level 1">
              <span class="pedestal-outer-ring">
                <span class="pedestal-inner-circle">
                  <span class="pedestal-number">1</span>
                </span>
              </span>
              <span class="pedestal-flag-marker">🚩</span>
            </button>
            <div class="node-stars-row" id="stars-level-1">
              <span class="level-star star-empty">★</span>
              <span class="level-star star-empty">★</span>
              <span class="level-star star-empty">★</span>
            </div>
          `;
          el.onclick = () => handleLevelClick(1);
        } else {
          el.className = `map-level-node level-${n}-node locked`;
          el.innerHTML = `
            <div class="node-sign-bubble bubble-locked">
              <span class="sign-lvl-title">Level ${n}</span>
              <span class="sign-status-pill badge-locked">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Locked</span>
              </span>
            </div>
            <button type="button" class="pedestal-disc-btn disc-stone" aria-label="Open Level ${n} (Locked)">
              <span class="pedestal-outer-ring">
                <span class="pedestal-inner-circle">
                  <span class="pedestal-lock-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 11h-1V7A6 6 0 0 0 6 7v4H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM8 7a4 4 0 0 1 8 0v4H8V7z"/></svg>
                  </span>
                  <span class="pedestal-number">${n}</span>
                </span>
              </span>
            </button>
            <div class="node-stars-row" id="stars-level-${n}">
              <span class="level-star star-empty">★</span>
              <span class="level-star star-empty">★</span>
              <span class="level-star star-empty">★</span>
            </div>
          `;
          el.onclick = () => showToast(`Complete Level ${n - 1} with at least 1 star to unlock Level ${n}!`);
        }
      }
    }
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Handle clicking on a level node
 */
function handleLevelClick(lvlId: number): void {
  let level = levels.find(l => Number(l.id ?? (l as any).levelNumber) === lvlId);

  // Guarantee Level 1 object is always available and unlocked
  if (lvlId === 1) {
    if (!level) {
      level = {
        id: 1,
        name: 'Syntax & Variables',
        description: 'Learn variables, primitives, operators, and basic programming fundamentals.',
        status: 'unlocked',
        stars: 0,
        maxStars: 3,
        questionCount: 3,
        rewardXp: 30,
        timeLimitSeconds: 600,
        position: { leftPercent: 14.0, topPercent: 72.0 }
      };
      levels.unshift(level);
    }
    if (level.status === 'locked') {
      level.status = 'unlocked';
    }
  }

  if (!level) return;

  const nodeEl = document.getElementById(`node-level-${lvlId}`);

  // If locked, shake and warn
  if (level.status === 'locked') {
    if (nodeEl) {
      nodeEl.classList.add('shake');
      setTimeout(() => nodeEl.classList.remove('shake'), 450);
    }
    showToast(`Complete Level ${lvlId - 1} with at least 1 star to unlock Level ${lvlId}!`);
    return;
  }

  // Open Level Overview Modal
  openLevelOverview(level);
}

/**
 * Open Level Overview Modal
 */
function openLevelOverview(level: QuizLevel): void {
  activeLevel = level;
  if (!modalLevelOverview) return;

  if (modalLevelBadge) modalLevelBadge.textContent = `Level ${level.id}`;
  if (modalLevelTitle) modalLevelTitle.textContent = level.name;
  if (modalLevelDesc) modalLevelDesc.textContent = level.description;
  if (modalStatQuestions) modalStatQuestions.textContent = String(level.questionCount);
  if (modalStatXp) modalStatXp.textContent = `+${level.rewardXp} XP`;
  if (modalStatTime) modalStatTime.textContent = '10:00';

  // 3 Stars Progress
  if (modalStar1) modalStar1.className = `modal-star ${level.stars >= 1 ? 'star-active' : ''}`;
  if (modalStar2) modalStar2.className = `modal-star ${level.stars >= 2 ? 'star-active' : ''}`;
  if (modalStar3) modalStar3.className = `modal-star ${level.stars >= 3 ? 'star-active' : ''}`;
  if (modalStarsCaption) modalStarsCaption.textContent = `${level.stars} / 3 Stars Earned`;

  modalLevelOverview.classList.add('show');
}

/**
 * Close Level Overview Modal
 */
function closeLevelOverview(): void {
  modalLevelOverview?.classList.remove('show');
}

/**
 * Launch Playable Quiz Arena (Matching img4_level_page.png)
 */
async function launchQuizArena(): Promise<void> {
  if (!activeLevel) return;
  closeLevelOverview();

  // Load questions for level
  try {
    currentQuestions = await fetchLevelQuestions(activeLevel.id);
  } catch (err) {
    console.error('Error fetching questions:', err);
    showToast('Failed to load quiz questions. Using defaults.');
  }

  currentQuestionIndex = 0;
  userAnswers = {};
  timerSecondsRemaining = activeLevel.timeLimitSeconds || 600;

  if (arenaLevelIndicator) {
    arenaLevelIndicator.textContent = `Level ${activeLevel.id}`;
  }

  renderQuestion();
  startTimer();

  // Play Game Background Music configured in Admin Settings
  soundManager.playGameBgm();

  arenaOverlay?.classList.add('show');
}

/**
 * Format seconds to MM:SS
 */
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Start Countdown Timer
 */
function startTimer(): void {
  if (timerInterval) clearInterval(timerInterval);
  if (timerText) timerText.textContent = formatTime(timerSecondsRemaining);

  timerInterval = window.setInterval(() => {
    timerSecondsRemaining--;
    if (timerText) timerText.textContent = formatTime(timerSecondsRemaining);

    if (timerSecondsRemaining <= 0) {
      clearInterval(timerInterval);
      showToast('Time is up! Submitting quiz...');
      handleQuizSubmit();
    }
  }, 1000);
}

/**
 * Render Segmented Progress Bar (Matches question count, exactly 3 for 3 stars)
 */
function updateProgressBar(): void {
  if (!arenaSegmentedProgress) return;
  const count = currentQuestions.length || 3;
  
  // Re-render segments if count differs
  if (arenaSegmentedProgress.children.length !== count) {
    arenaSegmentedProgress.innerHTML = Array.from({ length: count })
      .map(() => `<div class="progress-segment"></div>`)
      .join('');
  }

  const segments = arenaSegmentedProgress.querySelectorAll<HTMLDivElement>('.progress-segment');
  segments.forEach((seg, idx) => {
    seg.classList.remove('active', 'completed');
    if (idx < currentQuestionIndex) {
      seg.classList.add('completed');
    } else if (idx === currentQuestionIndex) {
      seg.classList.add('active');
    }
  });
}

/**
 * Render Current Question & Option Cards (Matching img4_level_page.png)
 */
function renderQuestion(): void {
  const q = currentQuestions[currentQuestionIndex];
  if (!q) return;

  updateProgressBar();

  // Question Counter & XP
  if (arenaQuestionCounter) {
    arenaQuestionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
  }
  if (arenaQuestionXp) {
    arenaQuestionXp.textContent = `+${q.rewardXp} XP`;
  }
  if (arenaQuestionText) {
    arenaQuestionText.textContent = q.question;
  }

  // Previous button state
  if (btnQuizPrev) {
    btnQuizPrev.disabled = currentQuestionIndex === 0;
  }

  // Next / Submit button state
  if (btnQuizNext) {
    const isLast = currentQuestionIndex === currentQuestions.length - 1;
    btnQuizNext.innerHTML = isLast
      ? `<span>Submit Quiz</span>
         <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <polyline points="20 6 9 17 4 12"></polyline>
         </svg>`
      : `<span>Next</span>
         <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <line x1="5" y1="12" x2="19" y2="12"></line>
           <polyline points="12 5 19 12 12 19"></polyline>
         </svg>`;
  }

  // Render 4 Options with locking & instant feedback
  if (!arenaOptionsGrid) return;
  const selectedAnswer = userAnswers[q.id];
  const isAlreadyAnswered = Boolean(selectedAnswer);

  arenaOptionsGrid.innerHTML = q.options.map(opt => {
    let extraClasses = '';
    let iconSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    if (isAlreadyAnswered) {
      extraClasses += ' locked';
      if (opt.id === q.correctOption) {
        extraClasses += ' correct';
      } else if (opt.id === selectedAnswer) {
        extraClasses += ' wrong';
        iconSvg = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        extraClasses += ' dimmed';
      }
    }

    return `
      <button type="button" class="arena-option-card ${extraClasses}" data-option="${opt.id}" ${isAlreadyAnswered ? 'disabled' : ''}>
        <div class="option-letter-badge">${opt.id}</div>
        <span class="option-text">${escapeHtml(opt.text)}</span>
        <span class="option-check-icon">
          ${iconSvg}
        </span>
      </button>
    `;
  }).join('');

  // Update AI Explanation Banner state
  updateAiBannerState(q, selectedAnswer);

  // Attach option click listeners
  const optButtons = arenaOptionsGrid.querySelectorAll<HTMLButtonElement>('.arena-option-card');
  optButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Locked: If already answered, do not allow changing
      if (userAnswers[q.id]) return;

      const optId = btn.getAttribute('data-option') as 'A' | 'B' | 'C' | 'D';
      userAnswers[q.id] = optId;

      const isCorrect = optId === q.correctOption;

      // Lock all options immediately
      optButtons.forEach(b => {
        b.classList.add('locked');
        b.disabled = true;
      });

      // Show correct/wrong colors & trigger sound effects immediately
      if (isCorrect) {
        btn.classList.add('correct');
        // Trigger correct sound effect immediately
        soundManager.playCorrectAnswerSound();
        launchSmallSparkle();
      } else {
        btn.classList.add('wrong');
        const iconWrap = btn.querySelector('.option-check-icon');
        if (iconWrap) {
          iconWrap.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `;
        }
        // Trigger wrong sound effect immediately
        soundManager.playWrongAnswerSound();

        // Reveal the correct option in vivid green
        const correctBtn = arenaOptionsGrid.querySelector<HTMLButtonElement>(`[data-option="${q.correctOption}"]`);
        if (correctBtn) {
          correctBtn.classList.add('correct');
        }
      }

      // Dim non-selected, non-correct options
      optButtons.forEach(b => {
        if (!b.classList.contains('correct') && !b.classList.contains('wrong')) {
          b.classList.add('dimmed');
        }
      });

      // Immediately reveal the AI explanation banner below
      updateAiBannerState(q, optId);
    });
  });
}

/**
 * Small confetti sparkle on correct answer
 */
function launchSmallSparkle(): void {
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#fde68a']
    });
  } catch {}
}

/**
 * Update the AI explanation banner below the question options
 */
function updateAiBannerState(q: QuizQuestion, selectedAnswer?: 'A' | 'B' | 'C' | 'D'): void {
  if (!arenaAiBanner) return;

  if (!selectedAnswer) {
    arenaAiBanner.style.display = 'none';
    return;
  }

  const isCorrect = selectedAnswer === q.correctOption;
  if (aiStatusPill) {
    aiStatusPill.className = `ai-status-pill ${isCorrect ? 'status-correct' : 'status-wrong'}`;
    aiStatusPill.textContent = isCorrect ? 'Correct Answer! ⭐' : 'Incorrect Choice';
  }

  if (aiBannerExplanation) {
    const correctOpt = q.options.find(o => o.id === q.correctOption);
    const explanationText = q.explanation || `Option ${q.correctOption} (${correctOpt?.text || ''}) is the verified correct answer.`;
    aiBannerExplanation.textContent = explanationText;
  }

  arenaAiBanner.style.display = 'flex';
}

/**
 * Open Interactive AI Chat Modal for the current quiz question
 */
function openAiChatModal(): void {
  const q = currentQuestions[currentQuestionIndex];
  if (!q || !modalAiChat) return;

  const userChoice = userAnswers[q.id];
  const correctOpt = q.options.find(o => o.id === q.correctOption);

  // Set question context
  if (aiContextQuestionText) {
    aiContextQuestionText.textContent = q.question;
  }

  if (aiContextOptionsSummary) {
    aiContextOptionsSummary.innerHTML = q.options.map(opt => {
      const isCorrect = opt.id === q.correctOption;
      const isUserWrong = userChoice === opt.id && !isCorrect;
      let badge = '';
      let cls = 'ai-context-option-pill';
      if (isCorrect) {
        cls += ' is-correct';
        badge = ' ✓ Correct';
      } else if (isUserWrong) {
        cls += ' is-user-wrong';
        badge = ' ✗ Your choice';
      }
      return `<span class="${cls}">${opt.id}: ${escapeHtml(opt.text)}${badge}</span>`;
    }).join('');
  }

  // Initialize chat history for this question if empty
  if (!questionChatHistory[q.id] || questionChatHistory[q.id].length === 0) {
    const isCorrect = userChoice === q.correctOption;
    const initialGreeting = isCorrect
      ? `🎉 **Great job!** You nailed this question with **Option ${q.correctOption} (${correctOpt?.text || ''})**.\n\n` +
        `**Explanation:** ${q.explanation || 'This is the verified correct answer based on programming specifications.'}\n\n` +
        `💡 Would you like to explore a code example, common traps, or test edge cases? Ask me anything below!`
      : `👋 Let's review this question together!\n\n` +
        `The correct answer is **Option ${q.correctOption}: ${correctOpt?.text || ''}**.\n\n` +
        `**Explanation:** ${q.explanation || 'Review the core concept for this question.'}\n\n` +
        `⚠️ ${userChoice ? `You selected Option ${userChoice}. ` : ''}Feel free to ask me any question about why this is correct or how to remember this concept!`;

    questionChatHistory[q.id] = [
      { role: 'ai', content: initialGreeting }
    ];
  }

  renderAiChatMessages(q.id);

  modalAiChat.classList.add('show');
  modalAiChat.setAttribute('aria-hidden', 'false');
  if (aiChatInput) {
    aiChatInput.value = '';
    setTimeout(() => aiChatInput?.focus(), 150);
  }
}

/**
 * Close AI Chat Modal
 */
function closeAiChatModal(): void {
  modalAiChat?.classList.remove('show');
  modalAiChat?.setAttribute('aria-hidden', 'true');
}

/**
 * Render Chat Messages
 */
function renderAiChatMessages(qId: number): void {
  if (!aiChatMessages) return;
  const history = questionChatHistory[qId] || [];

  aiChatMessages.innerHTML = history.map(msg => {
    return `<div class="ai-msg-bubble ${msg.role}">${renderMarkdown(msg.content)}</div>`;
  }).join('');

  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

/**
 * Send User Chat Message
 */
function sendUserChatMessage(text: string): void {
  const q = currentQuestions[currentQuestionIndex];
  if (!q || !text.trim() || !aiChatMessages) return;

  const qId = q.id;
  if (!questionChatHistory[qId]) questionChatHistory[qId] = [];

  // 1. Add user message
  questionChatHistory[qId].push({ role: 'user', content: text.trim() });
  renderAiChatMessages(qId);
  if (aiChatInput) aiChatInput.value = '';

  // 2. Add temporary typing bubble
  const typingEl = document.createElement('div');
  typingEl.className = 'ai-msg-bubble ai';
  typingEl.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; font-style: italic; color: #64748b;">
    <span class="ai-pulse-indicator"></span> Kuizu AI Tutor is thinking...
  </span>`;
  aiChatMessages.appendChild(typingEl);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

  // 3. Generate response after brief realistic delay
  setTimeout(() => {
    typingEl.remove();
    const reply = generateAiTutorResponse(q, text.trim(), userAnswers[q.id]);
    questionChatHistory[qId].push({ role: 'ai', content: reply });
    renderAiChatMessages(qId);
  }, 450);
}

/**
 * Intelligent Pedagogical AI Tutor Response Engine
 */
function generateAiTutorResponse(q: QuizQuestion, query: string, userChoice?: 'A' | 'B' | 'C' | 'D'): string {
  const qText = q.question.toLowerCase();
  const queryLower = query.toLowerCase();
  const correctOpt = q.options.find(o => o.id === q.correctOption);
  const correctText = correctOpt?.text || '';

  // 1. Code example requested
  if (queryLower.includes('code') || queryLower.includes('example') || queryLower.includes('syntax')) {
    if (qText.includes('block-scoped') || qText.includes('let') || qText.includes('const') || qText.includes('var')) {
      return `Here is a clear code example contrasting \`let\`/\`const\` with \`var\`:\n\n` +
        `\`\`\`javascript\n` +
        `// 1. Block Scope (let & const)\n` +
        `if (true) {\n` +
        `  let blockScoped = "Available ONLY inside this block";\n` +
        `  const constantVal = 3.14159;\n` +
        `  var functionScoped = "Leaks outside this block!";\n` +
        `}\n\n` +
        `console.log(functionScoped); // Prints: "Leaks outside this block!"\n` +
        `// console.log(blockScoped); // ReferenceError: blockScoped is not defined\n` +
        `\`\`\`\n\n` +
        `* **Rule of Thumb:** Always use \`const\` by default. Use \`let\` when you intend to reassign. Avoid \`var\` in modern software.`;
    }
    if (qText.includes('strict equality') || qText.includes('===') || qText.includes('coercion')) {
      return `Here is how \`===\` (strict) differs from \`==\` (loose coercion):\n\n` +
        `\`\`\`javascript\n` +
        `// Loose Equality (==) performs type conversion automatically\n` +
        `console.log(42 == '42');         // true (string converted to number)\n` +
        `console.log(0 == false);        // true (false coerced to 0)\n` +
        `console.log(null == undefined); // true\n\n` +
        `// Strict Equality (===) validates BOTH value and data type\n` +
        `console.log(42 === '42');        // false (Number !== String)\n` +
        `console.log(0 === false);       // false (Number !== Boolean)\n` +
        `console.log(null === undefined);// false (Null !== Undefined)\n` +
        `\`\`\`\n\n` +
        `* **Best Practice:** Always use \`===\` to prevent unexpected type coercion bugs.`;
    }
    if (qText.includes('primitive') || qText.includes('array') || qText.includes('object')) {
      return `Primitives vs Reference Types in JavaScript:\n\n` +
        `\`\`\`javascript\n` +
        `// Primitives (Stored by value directly on call stack):\n` +
        `// string, number, boolean, null, undefined, symbol, bigint\n` +
        `let score = 100;\n` +
        `let copy = score;\n` +
        `copy = 200;\n` +
        `console.log(score); // 100 (original untouched)\n\n` +
        `// Objects & Arrays (Stored by reference in heap memory):\n` +
        `let items = [1, 2, 3];\n` +
        `let ref = items;\n` +
        `ref.push(99);\n` +
        `console.log(items); // [1, 2, 3, 99] (both point to same memory!)\n` +
        `\`\`\`\n\n` +
        `* That's why \`Array\` is an Object reference type, not a primitive!`;
    }
    if (qText.includes('typeof null')) {
      return `The historical \`typeof null\` quirk:\n\n` +
        `\`\`\`javascript\n` +
        `console.log(typeof null);      // "object" (heritage quirk from 1995!)\n` +
        `console.log(typeof undefined); // "undefined"\n` +
        `console.log(null === null);    // true\n` +
        `\`\`\`\n\n` +
        `* In the initial 1995 JavaScript engine, values were tagged with 32-bit type indicators. The object tag was \`000\`, and \`null\` was represented as the NULL pointer (\`0x00\`), mistakenly returning \`"object"\`!`;
    }
    if (qText.includes('hash map') || qText.includes('o(1)') || qText.includes('complexity')) {
      return `Hash Map O(1) Constant Time Retrieval:\n\n` +
        `\`\`\`javascript\n` +
        `const studentGrades = new Map();\n` +
        `studentGrades.set("Alice", "A+");\n` +
        `studentGrades.set("Bob", "B");\n\n` +
        `// O(1) immediate lookup via hashing function\n` +
        `console.log(studentGrades.get("Alice")); // "A+" in O(1) time\n` +
        `\`\`\`\n\n` +
        `* Instead of iterating through elements one-by-one like an array (O(n)), a hash map computes the memory bucket directly from the key.`;
    }
    if (qText.includes('fifo') || qText.includes('queue') || qText.includes('stack')) {
      return `Queue FIFO (First-In, First-Out):\n\n` +
        `\`\`\`javascript\n` +
        `class Queue {\n` +
        `  constructor() { this.data = []; }\n` +
        `  enqueue(item) { this.data.push(item); }\n` +
        `  dequeue() { return this.data.shift(); } // removes oldest element\n` +
        `}\n\n` +
        `const q = new Queue();\n` +
        `q.enqueue("Customer 1");\n` +
        `q.enqueue("Customer 2");\n` +
        `console.log(q.dequeue()); // "Customer 1" (First in, first served!)\n` +
        `\`\`\`\n\n` +
        `* Contrast with Stack (LIFO: Last-In, First-Out).`;
    }
    return `Here is a code example illustrating this concept:\n\n` +
      `\`\`\`javascript\n` +
      `// Target concept: ${correctText}\n` +
      `const answer = "${correctText}";\n` +
      `console.log("Verified answer:", answer);\n` +
      `\`\`\`\n\n` +
      `* This directly implements the solution for: "${q.question}"`;
  }

  // 2. Why is this correct?
  if (queryLower.includes('why') || queryLower.includes('correct') || queryLower.includes('reason')) {
    return `**Why Option ${q.correctOption} ("${correctText}") is the correct answer:**\n\n` +
      `${q.explanation ? q.explanation + '\n\n' : ''}` +
      `* **Core Specification:** In computer science, **${correctText}** meets the exact criteria defined in: *"${q.question}"*.\n\n` +
      `* **Other Choices Breakdown:**\n` +
      q.options.filter(o => o.id !== q.correctOption).map(o => `  - **Option ${o.id} (${o.text}):** Incorrect because it violates or does not satisfy this definition.`).join('\n') +
      `\n\n💡 Would you like a code snippet demonstrating this?`;
  }

  // 3. Common traps / mistakes
  if (queryLower.includes('trap') || queryLower.includes('mistake') || queryLower.includes('common') || queryLower.includes('error')) {
    return `⚠️ **Common Traps & Mistakes Students Make on This Topic:**\n\n` +
      `1. **Confusing similar naming conventions:** Believing options like ${q.options.map(o => `"${o.text}"`).join(', ')} behave identically.\n` +
      `2. **Assumptions about implicit behavior:** Overlooking type coercion or scoping rules.\n` +
      `3. **Interview Gotchas:** Questions like this are staples in technical screenings to test depth of knowledge beyond just writing basic syntax.\n\n` +
      `* **Pro Tip:** Keep in mind that **${correctText}** is the standard solution here!`;
  }

  // 4. Explain simply / beginner
  if (queryLower.includes('simply') || queryLower.includes('beginner') || queryLower.includes('simple') || queryLower.includes('easy')) {
    return `👶 **Simple Beginner Explanation:**\n\n` +
      `Imagine you need the right tool for a specific task:\n\n` +
      `* For *"${q.question}"*, the tool built explicitly for this is **${correctText}**.\n` +
      `* The other choices either do something different or belong to older or other languages.\n\n` +
      `Remember this rule of thumb: whenever you encounter this question, look for **${correctText}**!`;
  }

  // 5. General / Custom queries
  return `Great question! Here is how it applies to *"${q.question}"*:\n\n` +
    `* The correct answer is **Option ${q.correctOption}: ${correctText}**.\n` +
    `* Regarding your query *"${query}"*: ${q.explanation || 'this is a fundamental concept in software engineering'}.\n\n` +
    `Feel free to ask any other follow-up question, or click one of the suggestion chips!`;
}

/**
 * Lightweight Markdown renderer for AI chat messages
 */
function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks ```language ... ```
  html = html.replace(/```([a-z0-9]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold **...**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Bullet points
  html = html.replace(/^\* (.*$)/gim, '• $1<br>');
  html = html.replace(/^- (.*$)/gim, '• $1<br>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

  return html;
}

/**
 * Handle Next or Submit
 */
async function handleNextOrSubmit(): Promise<void> {
  const currentQ = currentQuestions[currentQuestionIndex];
  if (!userAnswers[currentQ.id]) {
    showToast('Please select an option to continue!');
    return;
  }

  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    await handleQuizSubmit();
  }
}

/**
 * Submit Quiz Answers & Show Results
 */
async function handleQuizSubmit(): Promise<void> {
  if (timerInterval) clearInterval(timerInterval);
  if (!activeLevel) return;

  // Fade out Game BGM upon completing level
  soundManager.fadeOutGameBgm();

  arenaOverlay?.classList.remove('show');

  try {
    const result: QuizResult = await submitQuizLevelAnswers(activeLevel.id, userAnswers);

    // Refresh levels
    levels = await fetchQuizLevels();
    updateMapNodes();

    // Populate Results Modal
    if (resultsLevelSubtitle) {
      resultsLevelSubtitle.textContent = `Great job on Level ${activeLevel.id}: ${activeLevel.name}!`;
    }
    if (resultsScoreText) {
      resultsScoreText.textContent = `${result.score} / ${result.totalQuestions}`;
    }
    if (resultsXpText) {
      resultsXpText.textContent = `+${result.xpEarned} XP`;
    }
    if (resultsStarsLabel) {
      resultsStarsLabel.textContent = `${result.starsEarned} / 3 Stars Earned`;
    }

    // 3 Stars Row
    if (resultsStarsRow) {
      resultsStarsRow.innerHTML = `
        <span class="res-star ${result.starsEarned >= 1 ? 'star-gold' : ''}">★</span>
        <span class="res-star ${result.starsEarned >= 2 ? 'star-gold' : ''}">★</span>
        <span class="res-star ${result.starsEarned >= 3 ? 'star-gold' : ''}">★</span>
      `;
    }

    // Launch celebratory confetti if completed
    if (result.starsEarned >= 1) {
      launchConfetti();
    }

    // Check if user submitted Level 1 and achieved 3 stars:
    // Congratulate them with the 3D slow-moving Pink Quiz Level Solver Badge!
    // Check if user solved their first quiz level:
    // Congratulate them with the 3D slow-moving Pink Quiz Level Solver Badge!
    const isFirstQuizLevel = !isBadgeUnlocked('first-quiz-level-solver');

    if (btnReopenQuizBadge3D) {
      if (isBadgeUnlocked('first-quiz-level-solver') || isFirstQuizLevel) {
        btnReopenQuizBadge3D.style.display = 'inline-flex';
      } else {
        btnReopenQuizBadge3D.style.display = 'none';
      }
    }

    if (isFirstQuizLevel) {
      // Pop up the 3D Pink Badge Modal in the center of the screen
      unlockBadge('first-quiz-level-solver');
      showFirstQuizLevelBadgeModal(() => {
        modalQuizResults?.classList.add('show');
      });
    } else {
      modalQuizResults?.classList.add('show');
    }
  } catch (err) {
    console.error('Quiz submission error:', err);
    showToast('Error submitting quiz answers.');
  }
}

/**
 * Exit arena confirmation
 */
function exitArena(): void {
  if (confirm('Are you sure you want to exit? Your current progress will not be saved.')) {
    if (timerInterval) clearInterval(timerInterval);
    soundManager.fadeOutGameBgm();
    arenaOverlay?.classList.remove('show');
  }
}

/**
 * Setup Event Listeners
 */
function setupListeners(): void {
  // Map Level Nodes Clicks
  [1, 2, 3, 4].forEach(lvlId => {
    const nodeEl = document.getElementById(`node-level-${lvlId}`);
    nodeEl?.addEventListener('click', () => handleLevelClick(lvlId));
  });

  // Overview Modal Close & Launch
  btnCloseOverview?.addEventListener('click', closeLevelOverview);
  modalLevelOverview?.addEventListener('click', (e) => {
    if (e.target === modalLevelOverview) closeLevelOverview();
  });
  btnLaunchQuiz?.addEventListener('click', launchQuizArena);

  // Arena Controls
  btnExitArena?.addEventListener('click', exitArena);
  btnQuizPrev?.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
    }
  });
  btnQuizNext?.addEventListener('click', handleNextOrSubmit);

  // AI Explanation & Chat Controls
  btnAskAiTutor?.addEventListener('click', openAiChatModal);
  btnCloseAiChat?.addEventListener('click', closeAiChatModal);
  modalAiChat?.addEventListener('click', (e) => {
    if (e.target === modalAiChat) closeAiChatModal();
  });

  // AI Prompt Chips
  aiChatChips?.querySelectorAll<HTMLButtonElement>('.ai-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) sendUserChatMessage(prompt);
    });
  });

  // AI Chat Form Submit
  aiChatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = aiChatInput?.value?.trim();
    if (text) {
      sendUserChatMessage(text);
    }
  });

  // Results Modal Continue
  btnResultsContinue?.addEventListener('click', () => {
    modalQuizResults?.classList.remove('show');
    showToast('Adventure map updated! Choose your next level.');
  });

  // Re-inspect 3D Pink Badge
  btnReopenQuizBadge3D?.addEventListener('click', () => {
    modalQuizResults?.classList.remove('show');
    showFirstQuizLevelBadgeModal(() => {
      modalQuizResults?.classList.add('show');
    });
  });

  // User Profile Dropdown is handled automatically by userHeaderProfile service
}

/**
 * Initializer
 */
async function init(): Promise<void> {
  setupListeners();

  try {
    levels = await fetchQuizLevels();
    updateMapNodes();
  } catch (err) {
    console.error('Failed to load quiz levels:', err);
  }

  // Active anti-cheating proctoring during timed quiz
  initExamProctoring({
    getContestInfo: () => ({
      contestId: activeLevel ? `quiz-level-${activeLevel.id}` : 'quiz-general',
      contestTitle: activeLevel ? `${activeLevel.name || 'Level ' + activeLevel.id} (Quiz)` : 'Kuizu Quiz Exam',
      isRunning: Boolean(arenaOverlay?.classList.contains('show'))
    }),
    onWarning: (msg) => showToast(msg),
    allowCopyPaste: false
  });
}

// Expose helper on window for debugging or manual preview
(window as any).showFirstQuizLevelBadgeModal = showFirstQuizLevelBadgeModal;

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
