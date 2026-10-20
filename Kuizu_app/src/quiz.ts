import confetti from 'canvas-confetti';
import { fetchQuizLevels, fetchLevelQuestions, submitQuizLevelAnswers } from './services/quizService';
import type { QuizLevel, QuizQuestion, QuizResult } from './types';
import './services/adminAuthGuard';
import { soundManager } from './services/soundManager';
import { showFirstQuizLevelBadgeModal } from './services/firstQuizLevelBadgeModal';
import { unlockBadge, isBadgeUnlocked } from './services/badgeManager';

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

  // Render 4 Options
  if (!arenaOptionsGrid) return;
  const selectedAnswer = userAnswers[q.id];

  arenaOptionsGrid.innerHTML = q.options.map(opt => {
    const isSelected = selectedAnswer === opt.id;
    return `
      <button type="button" class="arena-option-card ${isSelected ? 'selected' : ''}" data-option="${opt.id}">
        <div class="option-letter-badge">${opt.id}</div>
        <span class="option-text">${opt.text}</span>
        <span class="option-check-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      </button>
    `;
  }).join('');

  // Attach option click listeners
  const optButtons = arenaOptionsGrid.querySelectorAll<HTMLButtonElement>('.arena-option-card');
  optButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const optId = btn.getAttribute('data-option') as 'A' | 'B' | 'C' | 'D';
      userAnswers[q.id] = optId;

      optButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
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

  // User Profile Dropdown
  if (userAvatarBtn && userDropdown) {
    userAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShown = userDropdown.classList.toggle('show');
      userAvatarBtn.setAttribute('aria-expanded', String(isShown));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !userAvatarBtn.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        userAvatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Profile Menu actions
  document.querySelector('.popup-user-header')?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  document.getElementById('btn-menu-leaderboard')?.addEventListener('click', () => {
    showToast('Quiz Leaderboard: Rank #18 with 2,450 XP');
    userDropdown?.classList.remove('show');
  });
  document.getElementById('btn-menu-theme')?.addEventListener('click', () => {
    showToast('Theme switcher coming soon');
    userDropdown?.classList.remove('show');
  });
  document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
    window.location.href = '/settings';
  });
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
}

// Expose helper on window for debugging or manual preview
(window as any).showFirstQuizLevelBadgeModal = showFirstQuizLevelBadgeModal;

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
