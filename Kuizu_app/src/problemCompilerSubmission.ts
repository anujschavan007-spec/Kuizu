import './theme';
import './services/adminAuthGuard';
import { highlightCode } from './services/codeHighlighter';

interface SubmissionItem {
  id: number;
  problemId: string;
  problemTitle: string;
  difficulty: string;
  topicName: string;
  rewardXp: number;
  status: string;
  code: string;
  language: string;
  passedCount: number;
  totalCount: number;
  submittedAt: string;
  source?: string;
  contestId?: string;
}

let allSubmissions: SubmissionItem[] = [];
let selectedSubmission: SubmissionItem | null = null;
let currentSourceFilter: 'all' | 'practice' | 'contest' = 'all';

// DOM Elements
const submissionsRows = document.getElementById('submissions-list-rows') as HTMLDivElement | null;
const countBadge = document.getElementById('submissions-count-badge');
const pageTitle = document.getElementById('submissions-page-title');
const pageDesc = document.getElementById('submissions-page-desc');
const backToCompilerBtn = document.getElementById('btn-back-to-compiler') as HTMLAnchorElement | null;
const subFilterToggles = document.getElementById('sub-filter-toggles');

const viewerStatusBadge = document.getElementById('viewer-status-badge');
const viewerProblemTitle = document.getElementById('viewer-problem-title');
const viewerLangTag = document.getElementById('viewer-lang-tag');
const viewerSourceVal = document.getElementById('viewer-source-val');
const viewerTestcasesVal = document.getElementById('viewer-testcases-val');
const viewerRewardVal = document.getElementById('viewer-reward-val');
const viewerTimeVal = document.getElementById('viewer-time-val');
const viewerCodeBlock = document.getElementById('viewer-code-block');
const btnCopyCode = document.getElementById('btn-copy-sub-code');

// Profile & Menu Elements
const userAvatarBtn = document.getElementById('btn-user-avatar');
const userDropdown = document.getElementById('user-dropdown');
const userDisplayName = document.getElementById('user-display-name');
const menuUserName = document.getElementById('menu-user-name');
const menuUserXp = document.getElementById('menu-user-xp');

function getQueryProblemId(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id') || urlParams.get('problemId') || '';
}

function formatSubmissionDateTime(isoStr: string): { dateStr: string; timeStr: string; fullStr: string } {
  if (!isoStr) return { dateStr: '-', timeStr: '-', fullStr: '-' };
  try {
    const d = new Date(isoStr);
    const dateStr = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return {
      dateStr,
      timeStr,
      fullStr: `${dateStr}, ${timeStr}`
    };
  } catch {
    return { dateStr: isoStr, timeStr: '', fullStr: isoStr };
  }
}

function formatLanguageName(lang: string): string {
  switch (lang?.toLowerCase()) {
    case 'cpp':
    case 'c++':
      return 'C++';
    case 'python':
      return 'Python 3';
    case 'java':
      return 'Java';
    case 'javascript':
    case 'js':
      return 'JavaScript';
    case 'typescript':
    case 'ts':
      return 'TypeScript';
    default:
      return lang?.toUpperCase() || 'Code';
  }
}

function selectSubmission(item: SubmissionItem) {
  selectedSubmission = item;

  // Highlight active row
  document.querySelectorAll('.sub-row').forEach(row => {
    row.classList.toggle('active', row.getAttribute('data-sub-id') === String(item.id));
  });

  if (viewerStatusBadge) {
    const isAccepted = item.status === 'accepted';
    viewerStatusBadge.textContent = isAccepted ? 'ACCEPTED' : (item.status || 'FAILED').toUpperCase();
    viewerStatusBadge.className = `viewer-status-badge ${isAccepted ? 'accepted' : 'failed'}`;
  }

  if (viewerProblemTitle) {
    viewerProblemTitle.textContent = `${item.problemTitle}`;
  }

  if (viewerLangTag) {
    viewerLangTag.textContent = formatLanguageName(item.language);
  }

  if (viewerSourceVal) {
    const isContest = item.source === 'contest';
    viewerSourceVal.textContent = isContest ? (item.contestId ? `Contest (${item.contestId})` : 'Contest') : 'Q-Library';
    viewerSourceVal.style.color = isContest ? '#9333ea' : '#2563eb';
    viewerSourceVal.style.fontWeight = '700';
  }

  if (viewerTestcasesVal) {
    if (item.totalCount > 0) {
      viewerTestcasesVal.textContent = `${item.passedCount}/${item.totalCount} Passed`;
    } else {
      viewerTestcasesVal.textContent = item.status === 'accepted' ? 'All Passed' : 'Failed';
    }
  }

  if (viewerRewardVal) {
    if (item.rewardXp > 0) {
      viewerRewardVal.textContent = `+${item.rewardXp} XP (First Solve)`;
      viewerRewardVal.style.color = '#059669';
    } else {
      viewerRewardVal.textContent = `+0 XP (Already Solved Previously)`;
      viewerRewardVal.style.color = '#64748b';
    }
  }

  if (viewerTimeVal) {
    const dt = formatSubmissionDateTime(item.submittedAt);
    viewerTimeVal.textContent = dt.fullStr;
  }

  if (viewerCodeBlock) {
    const rawCode = item.code || '// No code recorded for this submission';
    viewerCodeBlock.innerHTML = highlightCode(rawCode, item.language || 'cpp');
  }
}

function getFilteredSubmissions(): SubmissionItem[] {
  if (currentSourceFilter === 'practice') {
    return allSubmissions.filter(s => (s.source || 'practice') !== 'contest');
  }
  if (currentSourceFilter === 'contest') {
    return allSubmissions.filter(s => s.source === 'contest');
  }
  return allSubmissions;
}

function applyFilterAndRender() {
  const filtered = getFilteredSubmissions();
  renderSubmissionsTable(filtered);
}

function renderSubmissionsTable(items: SubmissionItem[]) {
  if (!submissionsRows) return;

  if (countBadge) {
    countBadge.textContent = `${items.length} ${items.length === 1 ? 'Submission' : 'Submissions'}`;
  }

  if (items.length === 0) {
    const filterLabel = currentSourceFilter === 'contest' ? 'contest' : currentSourceFilter === 'practice' ? 'Q-Library practice' : '';
    submissionsRows.innerHTML = `
      <div class="sub-empty-state">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <h4>No ${filterLabel ? filterLabel + ' ' : ''}submissions found</h4>
        <p>No recorded submissions match this filter. Try selecting another filter or submit code in the compiler!</p>
      </div>
    `;
    return;
  }

  submissionsRows.innerHTML = items.map((sub, idx) => {
    const isAccepted = sub.status === 'accepted';
    const isContest = sub.source === 'contest';
    const dt = formatSubmissionDateTime(sub.submittedAt);
    return `
      <div class="sub-row ${idx === 0 ? 'active' : ''}" data-sub-id="${sub.id}" title="Click to view code submitted at ${dt.fullStr}">
        <span class="sub-status-col">
          <span class="sub-status-pill ${isAccepted ? 'accepted' : 'failed'}">
            ${isAccepted ? `
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Accepted</span>
            ` : `
              <span>Failed</span>
            `}
          </span>
        </span>
        <span class="sub-source-col">
          <span class="sub-source-pill ${isContest ? 'contest' : 'practice'}">
            ${isContest ? 'Contest' : 'Q-Library'}
          </span>
        </span>
        <span class="sub-problem-col">
          <span class="sub-prob-title">${sub.problemTitle}</span>
          <span class="sub-prob-id">#${sub.problemId}</span>
        </span>
        <span class="sub-lang-col">
          <span class="sub-lang-tag">${formatLanguageName(sub.language)}</span>
        </span>
        <span class="sub-reward-col">
          <span class="sub-xp-val ${sub.rewardXp > 0 ? 'awarded' : 'zero'}" title="${sub.rewardXp > 0 ? 'XP Awarded' : 'Already solved previously (0 XP)'}">
            ${sub.rewardXp > 0 ? `+${sub.rewardXp} XP` : `+0 XP`}
          </span>
        </span>
        <span class="sub-time-col">
          <span class="sub-time-date">${dt.dateStr}</span>
          <span class="sub-time-clock">${dt.timeStr}</span>
        </span>
      </div>
    `;
  }).join('');

  // Attach click listeners to rows
  const rows = submissionsRows.querySelectorAll('.sub-row');
  rows.forEach(r => {
    r.addEventListener('click', () => {
      const subId = Number(r.getAttribute('data-sub-id'));
      const found = allSubmissions.find(s => s.id === subId);
      if (found) {
        selectSubmission(found);
      }
    });
  });

  // Select first by default
  if (items.length > 0) {
    selectSubmission(items[0]);
  }
}

// Setup filter toggles
if (subFilterToggles) {
  const toggleButtons = subFilterToggles.querySelectorAll<HTMLButtonElement>('.sub-toggle-pill');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = (btn.getAttribute('data-filter') || 'all') as 'all' | 'practice' | 'contest';
      currentSourceFilter = filter;
      applyFilterAndRender();
    });
  });
}

async function loadSubmissions() {
  const userEmail = localStorage.getItem('kuizu_user_email') || '';
  const userName = localStorage.getItem('kuizu_user_name') || '';
  const problemId = getQueryProblemId();

  if (backToCompilerBtn) {
    backToCompilerBtn.href = problemId ? `/problem/qlibrary/compiler?id=${problemId}` : '/problems';
  }

  try {
    const params = new URLSearchParams();
    if (userEmail) params.append('email', userEmail);
    if (userName) params.append('name', userName);
    if (problemId) params.append('problemId', problemId);

    const res = await fetch(`/api/problems/submissions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      allSubmissions = data.submissions || [];

      if (problemId && allSubmissions.length > 0) {
        if (pageTitle) pageTitle.textContent = `${allSubmissions[0].problemTitle} Submissions`;
        if (pageDesc) pageDesc.textContent = `All submitted solutions for problem #${problemId} (${allSubmissions[0].problemTitle})`;
      } else if (problemId) {
        if (pageTitle) pageTitle.textContent = `Problem #${problemId} Submissions`;
      }

      applyFilterAndRender();
    }
  } catch (err) {
    console.error('Failed to load submissions:', err);
  }
}

async function syncUserData() {
  const storedName = localStorage.getItem('kuizu_user_name') || 'Anuj';
  if (userDisplayName) userDisplayName.textContent = storedName.split(' ')[0];
  if (menuUserName) menuUserName.textContent = storedName;

  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      const users: any[] = data.users || [];
      const storedEmail = localStorage.getItem('kuizu_user_email') || '';
      const matched = users.find((u: any) =>
        (storedEmail && u.email && u.email.toLowerCase() === storedEmail.toLowerCase()) ||
        (storedName && u.name && u.name.toLowerCase() === storedName.toLowerCase())
      ) || users[0];

      if (matched && menuUserXp) {
        menuUserXp.textContent = `${(Number(matched.xp) || 0).toLocaleString()} XP`;
      }
    }
  } catch {}
}

// User Menu Events
if (userAvatarBtn && userDropdown) {
  userAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userDropdown.classList.contains('show');
    userDropdown.classList.toggle('show', !isOpen);
    userAvatarBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target as Node) && e.target !== userAvatarBtn) {
      userDropdown.classList.remove('show');
    }
  });
}

// Copy Code Button
btnCopyCode?.addEventListener('click', () => {
  if (!selectedSubmission?.code) return;
  navigator.clipboard.writeText(selectedSubmission.code).then(() => {
    const originalText = btnCopyCode.querySelector('span')?.textContent || 'Copy';
    const span = btnCopyCode.querySelector('span');
    if (span) span.textContent = 'Copied!';
    setTimeout(() => {
      if (span) span.textContent = originalText;
    }, 2000);
  });
});

// Init
syncUserData();
loadSubmissions();
