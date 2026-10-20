import './theme';
import confetti from 'canvas-confetti';
import { soundManager } from './services/soundManager';
import { showFirstDailyKuizuBadgeModal } from './services/firstDailyKuizuBadgeModal';

interface QuizQuestion {
  id: number | string;
  num: number;
  name: string;
  sourceType?: string;
  questionContent: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string;
  rewardXp?: number;
}

interface DailyQuizData {
  id: number;
  assignedDate: string;
  title: string;
  description: string;
  rewardXp: number;
  streakBonus: number;
  expiryTime: string;
  isFallback: boolean;
  isExpired: boolean;
  currentIstDate: string;
  currentIstTime: string;
  questionCount: number;
  questions: QuizQuestion[];
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
  // Elements
  const navDateText = document.getElementById('nav-date-text');
  const navXpText = document.getElementById('nav-xp-text');
  const navStreakText = document.getElementById('nav-streak-text');
  const fallbackAlert = document.getElementById('daily-fallback-alert');
  const fallbackDesc = document.getElementById('fallback-alert-desc');
  const arenaQuizTitle = document.getElementById('arena-quiz-title');
  const arenaExpiryPill = document.getElementById('arena-expiry-pill');
  const arenaTimer = document.getElementById('arena-timer');
  const arenaQuestionStep = document.getElementById('arena-question-step');
  const arenaAnsweredCount = document.getElementById('arena-answered-count');
  const arenaProgressFill = document.getElementById('arena-progress-fill');
  const arenaQuestionName = document.getElementById('arena-question-name');
  const arenaQuestionText = document.getElementById('arena-question-text');
  const arenaOptionsGrid = document.getElementById('arena-options-grid');
  const btnPrev = document.getElementById('btn-quiz-prev') as HTMLButtonElement | null;
  const btnNext = document.getElementById('btn-quiz-next') as HTMLButtonElement | null;

  // Results Modal elements
  const resultsModal = document.getElementById('daily-results-modal');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const resultsScoreBadge = document.getElementById('results-score-badge');
  const resultsFeedbackNote = document.getElementById('results-feedback-note');

  let dailyQuiz: DailyQuizData | null = null;
  let questions: QuizQuestion[] = [];
  let currentIndex = 0;
  let userAnswers: Record<string | number, 'A' | 'B' | 'C' | 'D'> = {};
  let secondsRemaining = 300; // 5 minutes
  let timerInterval: number | undefined;

  function formatDateDisplay(dateStr: string): string {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      if (secondsRemaining <= 0) {
        clearInterval(timerInterval);
        submitQuiz();
        return;
      }
      secondsRemaining--;
      const mins = Math.floor(secondsRemaining / 60);
      const secs = secondsRemaining % 60;
      if (arenaTimer) {
        arenaTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }, 1000);
  }

  // Load Today's Daily Quiz
  async function loadQuiz() {
    try {
      const res = await fetch('/api/daily-quiz/today');
      if (!res.ok) throw new Error('Failed to load quiz');
      const data = await res.json();
      if (!data.success || !data.dailyQuiz) throw new Error('No quiz found');

      dailyQuiz = data.dailyQuiz;
      questions = dailyQuiz?.questions || [];

      if (!dailyQuiz || questions.length === 0) {
        if (arenaQuestionText) arenaQuestionText.textContent = 'No questions available for today.';
        return;
      }

      // Populate Header & Meta
      if (navDateText) navDateText.textContent = formatDateDisplay(dailyQuiz.assignedDate);
      if (navXpText) navXpText.textContent = `${dailyQuiz.rewardXp} XP`;
      if (navStreakText) navStreakText.textContent = `+${dailyQuiz.streakBonus} Streak`;
      if (arenaQuizTitle) arenaQuizTitle.textContent = dailyQuiz.title;

      // Handle Fallback Alert
      if (dailyQuiz.isFallback) {
        if (fallbackAlert) fallbackAlert.style.display = 'flex';
        if (fallbackDesc) {
          fallbackDesc.textContent = `No new daily quiz was added for today (${dailyQuiz.currentIstDate}). Showing the previous quiz from ${formatDateDisplay(dailyQuiz.assignedDate)} as fallback. Complete this challenge to keep your streak!`;
        }
      } else if (dailyQuiz.isExpired) {
        if (fallbackAlert) {
          fallbackAlert.style.display = 'flex';
          fallbackAlert.style.borderColor = '#fca5a5';
          fallbackAlert.style.background = '#fff1f2';
          fallbackAlert.style.color = '#9f1239';
        }
        const titleEl = document.getElementById('fallback-alert-title');
        if (titleEl) {
          titleEl.textContent = 'Daily Challenge Expired at 12:00 PM IST';
          titleEl.style.color = '#be123c';
        }
        if (fallbackDesc) {
          fallbackDesc.textContent = `Today's 12:00 PM IST expiry window has passed. You can still practice this challenge to earn your XP and streak bonus!`;
          fallbackDesc.style.color = '#be123c';
        }
        if (arenaExpiryPill) {
          arenaExpiryPill.textContent = '⏰ Expired (12 PM IST)';
          arenaExpiryPill.style.color = '#e11d48';
          arenaExpiryPill.style.background = '#ffe4e6';
          arenaExpiryPill.style.borderColor = '#fecdd3';
        }
      }

      currentIndex = 0;
      renderCurrentQuestion();
      startTimer();

      // Play Game Background Music configured in Admin Settings
      soundManager.playGameBgm();
    } catch (err) {
      console.error('Error loading daily quiz:', err);
      if (arenaQuestionText) arenaQuestionText.textContent = 'Could not connect to daily quiz server. Please try again.';
    }
  }

  function renderCurrentQuestion() {
    if (!questions || questions.length === 0) return;
    const q = questions[currentIndex];
    const total = questions.length;

    // Step indicators
    if (arenaQuestionStep) arenaQuestionStep.textContent = `Question ${currentIndex + 1} of ${total}`;
    if (arenaQuestionName) arenaQuestionName.textContent = q.name || `Question ${currentIndex + 1}`;
    if (arenaQuestionText) arenaQuestionText.textContent = q.questionContent || 'Question Content';

    const answeredCount = Object.keys(userAnswers).length;
    if (arenaAnsweredCount) arenaAnsweredCount.textContent = `${answeredCount} of ${total} Answered`;

    // Progress bar fill
    if (arenaProgressFill) {
      const pct = Math.round(((currentIndex + 1) / total) * 100);
      arenaProgressFill.style.width = `${pct}%`;
    }

    // Prev / Next button states
    if (btnPrev) {
      btnPrev.disabled = currentIndex === 0;
      btnPrev.style.opacity = currentIndex === 0 ? '0.45' : '1';
      btnPrev.style.cursor = currentIndex === 0 ? 'not-allowed' : 'pointer';
    }

    if (btnNext) {
      const isLast = currentIndex === total - 1;
      btnNext.innerHTML = isLast 
        ? `<span>Submit Quiz</span>` 
        : `<span>Next</span> <span>&rarr;</span>`;
    }

    // Render Options A, B, C, D
    if (arenaOptionsGrid) {
      const options = [
        { key: 'A', text: q.optionA },
        { key: 'B', text: q.optionB },
        { key: 'C', text: q.optionC },
        { key: 'D', text: q.optionD }
      ];

      arenaOptionsGrid.innerHTML = options.map(opt => {
        const isSelected = userAnswers[q.id] === opt.key;
        const borderCol = isSelected ? '#4f46e5' : '#e2e8f0';
        const bgCol = isSelected ? '#eef2ff' : '#ffffff';
        const textCol = isSelected ? '#312e81' : '#1e293b';
        const badgeBg = isSelected ? '#4f46e5' : '#f1f5f9';
        const badgeText = isSelected ? '#ffffff' : '#64748b';

        return `
          <button type="button" class="daily-option-btn ${isSelected ? 'selected' : ''}" data-option="${opt.key}" style="
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            padding: 14px 18px;
            border-radius: 12px;
            border: 2px solid ${borderCol};
            background: ${bgCol};
            cursor: pointer;
            text-align: left;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: ${isSelected ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none'};
          ">
            <span class="daily-option-badge" style="
              width: 32px;
              height: 32px;
              border-radius: 8px;
              background: ${badgeBg};
              color: ${badgeText};
              font-weight: 700;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">${opt.key}</span>
            <span class="daily-option-text" style="font-size: 15px; font-weight: 600; color: ${textCol}; flex: 1;">
              ${opt.text || `Option ${opt.key}`}
            </span>
            ${isSelected ? `<span style="color: #4f46e5; font-size: 18px; font-weight: 800;">✓</span>` : ''}
          </button>
        `;
      }).join('');

      // Attach option click listeners
      arenaOptionsGrid.querySelectorAll<HTMLButtonElement>('.daily-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const optKey = btn.getAttribute('data-option') as 'A' | 'B' | 'C' | 'D';
          userAnswers[q.id] = optKey;
          renderCurrentQuestion();
        });
      });
    }
  }

  // Keyboard shortcut listener (A, B, C, D or 1, 2, 3, 4)
  window.addEventListener('keydown', (e) => {
    if (!questions || questions.length === 0) return;
    const key = e.key.toUpperCase();
    const q = questions[currentIndex];
    const keyMap: Record<string, 'A' | 'B' | 'C' | 'D'> = {
      'A': 'A', '1': 'A',
      'B': 'B', '2': 'B',
      'C': 'C', '3': 'C',
      'D': 'D', '4': 'D'
    };
    if (keyMap[key]) {
      userAnswers[q.id] = keyMap[key];
      renderCurrentQuestion();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      btnNext?.click();
    } else if (e.key === 'ArrowLeft') {
      btnPrev?.click();
    }
  });

  // Navigation button handlers
  btnPrev?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentQuestion();
    }
  });

  btnNext?.addEventListener('click', () => {
    if (!questions || questions.length === 0) return;
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderCurrentQuestion();
    } else {
      submitQuiz();
    }
  });

  async function submitQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    soundManager.fadeOutGameBgm();

    try {
      const res = await fetch('/api/daily-quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyQuizId: dailyQuiz?.id,
          answers: userAnswers,
          email: localStorage.getItem('kuizu_user_email') || '',
          name: localStorage.getItem('kuizu_user_name') || ''
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Confetti celebration
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 }
        });

        const score = data.score || 0;
        const total = data.totalQuestions || questions.length;
        const pct = Math.round((score / total) * 100);

        if (resultsScoreBadge) {
          resultsScoreBadge.textContent = `${score} / ${total} (${pct}%)`;
          resultsScoreBadge.style.background = pct >= 66 ? '#dcfce7' : (pct >= 33 ? '#fef3c7' : '#fee2e2');
          resultsScoreBadge.style.color = pct >= 66 ? '#15803d' : (pct >= 33 ? '#b45309' : '#b91c1c');
        }

        if (resultsFeedbackNote) {
          resultsFeedbackNote.textContent = pct === 100 
            ? 'Perfect score! All syllabus questions mastered for today.'
            : (pct >= 50 ? 'Solid work! Syllabus concepts reinforced successfully.' : 'Good practice! Review syllabus topics to level up.');
        }

        // Congratulate 1st daily kuizu attended with slowly moving 3D silver badge modal popup in center of screen
        showFirstDailyKuizuBadgeModal(() => {
          if (resultsModal) resultsModal.style.display = 'flex';
        });
      } else {
        showToast('Error recording quiz submission.');
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      showToast('Error submitting quiz to server.');
    }
  }

  // Hook re-inspect 3D silver badge button
  document.getElementById('btn-view-3d-daily-badge')?.addEventListener('click', () => {
    showFirstDailyKuizuBadgeModal();
  });

  // Expose on window for testing & verification
  (window as any).showFirstDailyKuizuBadgeModal = showFirstDailyKuizuBadgeModal;

  // Load Quiz on startup
  await loadQuiz();
});
