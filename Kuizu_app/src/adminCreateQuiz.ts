import './adminProfileModal';

// Admin Create Quiz Page Logic

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
  const saveBtn = document.getElementById('save-quiz-btn');
  const form = document.getElementById('create-quiz-form') as HTMLFormElement | null;
  const questionSelect = document.getElementById('quiz-question-select') as HTMLSelectElement | null;
  const questionBody = document.getElementById('question-body') as HTMLTextAreaElement | null;
  const optionA = document.getElementById('option-a') as HTMLInputElement | null;
  const optionB = document.getElementById('option-b') as HTMLInputElement | null;
  const optionC = document.getElementById('option-c') as HTMLInputElement | null;
  const optionD = document.getElementById('option-d') as HTMLInputElement | null;
  const titleInput = document.getElementById('quiz-title') as HTMLInputElement | null;
  const descInput = document.getElementById('quiz-description') as HTMLTextAreaElement | null;
  const pageTitle = document.querySelector('.admin-dashboard-title');
  const pageSubtitle = document.querySelector('.admin-dashboard-subtitle');

  // Detect Edit Mode from URL query: ?id=...
  const urlParams = new URLSearchParams(window.location.search);
  const editQuizId = urlParams.get('id');

  const levelSelect = document.getElementById('quiz-level-select') as HTMLSelectElement | null;

  if (editQuizId) {
    if (pageTitle) pageTitle.textContent = 'Edit Quiz';
    if (pageSubtitle) pageSubtitle.textContent = 'Update quiz details and options';
    if (saveBtn) {
      const labelSpan = saveBtn.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Save Quiz';
    }

    // Fetch existing quiz details
    try {
      const res = await fetch(`/api/quizzes/${editQuizId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.quiz) {
          const q = data.quiz;
          if (titleInput) titleInput.value = q.name || '';
          if (descInput) descInput.value = q.description || '';
          if (questionBody) questionBody.value = q.questionContent || '';
          if (optionA) optionA.value = q.options?.a || '';
          if (optionB) optionB.value = q.options?.b || '';
          if (optionC) optionC.value = q.options?.c || '';
          if (optionD) optionD.value = q.options?.d || '';
          if (levelSelect && q.levelNumber) levelSelect.value = String(q.levelNumber);

          const radio = document.querySelector<HTMLInputElement>(`input[name="correct-option"][value="${q.correctOption || 'A'}"]`);
          if (radio) radio.checked = true;

          if (questionSelect) questionSelect.value = 'custom';
        }
      }
    } catch (err) {
      console.warn('Could not load quiz details for editing:', err);
    }
  }

  // Preset question data
  const questionPresets: Record<string, { q: string; a: string; b: string; c: string; d: string; correct: string }> = {
    q1: {
      q: 'What is the time complexity of searching an element in a balanced binary search tree (BST)?',
      a: 'O(1)',
      b: 'O(log n)',
      c: 'O(n)',
      d: 'O(n log n)',
      correct: 'B'
    },
    q2: {
      q: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
      a: 'Stack',
      b: 'Queue',
      c: 'Binary Tree',
      d: 'Graph',
      correct: 'B'
    },
    q3: {
      q: 'In CSS, what does the property "box-sizing: border-box" do?',
      a: 'Adds a default black border to all elements',
      b: 'Includes padding and border in the element\'s total width and height',
      c: 'Excludes padding from layout calculations',
      d: 'Forces elements into a flexbox container',
      correct: 'B'
    }
  };

  // Populate preset questions
  if (questionSelect) {
    questionSelect.addEventListener('change', () => {
      const val = questionSelect.value;
      if (val && questionPresets[val]) {
        const preset = questionPresets[val];
        if (questionBody) questionBody.value = preset.q;
        if (optionA) optionA.value = preset.a;
        if (optionB) optionB.value = preset.b;
        if (optionC) optionC.value = preset.c;
        if (optionD) optionD.value = preset.d;

        const radio = document.querySelector<HTMLInputElement>(`input[name="correct-option"][value="${preset.correct}"]`);
        if (radio) radio.checked = true;

        showToast('Question details populated!');
      } else if (val === 'custom') {
        if (questionBody) questionBody.value = '';
        if (optionA) optionA.value = '';
        if (optionB) optionB.value = '';
        if (optionC) optionC.value = '';
        if (optionD) optionD.value = '';
        questionBody?.focus();
      }
    });
  }

  // Rich Text Editor Toolbar actions
  document.querySelectorAll<HTMLButtonElement>('.admin-editor-tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!questionBody) return;
      const action = btn.getAttribute('data-action');
      const start = questionBody.selectionStart;
      const end = questionBody.selectionEnd;
      const selected = questionBody.value.substring(start, end);

      let replacement = '';
      if (action === 'bold') {
        replacement = `**${selected || 'bold text'}**`;
      } else if (action === 'italic') {
        replacement = `*${selected || 'italic text'}*`;
      } else if (action === 'bullet') {
        replacement = `\n• ${selected || 'list item'}`;
      } else if (action === 'number') {
        replacement = `\n1. ${selected || 'first item'}`;
      } else if (action === 'link') {
        replacement = `[${selected || 'link text'}](https://example.com)`;
      }

      questionBody.setRangeText(replacement, start, end, 'end');
      questionBody.focus();
    });
  });

  // Save Quiz handler
  let isSubmitting = false;

  async function handleSave(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSubmitting) return;

    const title = titleInput?.value.trim();
    const qText = questionBody?.value.trim();

    if (!title) {
      showToast('Please enter a Quiz Title.');
      titleInput?.focus();
      return;
    }

    if (!qText) {
      showToast('Please enter the question content.');
      questionBody?.focus();
      return;
    }

    if (!optionA?.value.trim() || !optionB?.value.trim() || !optionC?.value.trim() || !optionD?.value.trim()) {
      showToast('Please fill in all 4 options (A, B, C, D).');
      return;
    }

    const correctRadio = document.querySelector<HTMLInputElement>('input[name="correct-option"]:checked');
    const correctOpt = correctRadio ? correctRadio.value : 'A';

    isSubmitting = true;
    if (saveBtn) {
      saveBtn.setAttribute('disabled', 'true');
      saveBtn.style.opacity = '0.6';
      saveBtn.style.pointerEvents = 'none';
      const labelSpan = saveBtn.querySelector('span');
      if (labelSpan) labelSpan.textContent = 'Saving...';
    }

    const chosenLevel = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;

    const payload = {
      name: title,
      description: descInput?.value.trim() || `Master ${title} concepts and fundamentals.`,
      levelNumber: chosenLevel,
      questionCount: 1,
      rewardXp: 150,
      questionContent: qText,
      optionA: optionA?.value.trim(),
      optionB: optionB?.value.trim(),
      optionC: optionC?.value.trim(),
      optionD: optionD?.value.trim(),
      correctOption: correctOpt
    };

    try {
      const endpoint = editQuizId ? `/api/quizzes/${editQuizId}` : '/api/quizzes';
      const method = editQuizId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      showToast(editQuizId ? 'Quiz updated successfully! Redirecting...' : 'Quiz created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/admin/uploadquiz';
      }, 900);
    } catch (err: any) {
      console.error('Quiz save error:', err);
      showToast(err?.message || 'Failed to save quiz. Please check required fields.');
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleSave(e);
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSave(e);
    });
  }
});
