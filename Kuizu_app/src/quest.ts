/**
 * KUIZU - Quest Path Page Interactive Logic
 * Renders dynamically ONLY the real quests added in Admin Panel (/api/quests)
 * Dynamic SVG wiring and responsive landscape layout with horizontal scrolling if quests exceed viewport.
 */
import './services/adminAuthGuard';

interface QuestItemData {
  id: string | number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  xp: number;
  status: 'completed' | 'current' | 'available' | 'locked';
  description: string;
  problems: string[];
  stepNumber: number;
}

let activeQuestsData: QuestItemData[] = [];
let toastTimeout: number | undefined;

export function showToast(message: string, duration: number = 3200): void {
  const toast = document.getElementById('quest-toast');
  if (!toast) return;

  if (toastTimeout) {
    window.clearTimeout(toastTimeout);
  }

  toast.textContent = message;
  toast.classList.add('show');

  toastTimeout = window.setTimeout(() => {
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

function setupUserMenu(): void {
  const avatarBtn = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');

  if (!avatarBtn || !userDropdown) return;

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = avatarBtn.getAttribute('aria-expanded') === 'true';
    avatarBtn.setAttribute('aria-expanded', String(!isExpanded));
    userDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target as Node) && !avatarBtn.contains(e.target as Node)) {
      userDropdown.classList.remove('show');
      avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });

  const popupUserHeader = document.querySelector('.popup-user-header');
  popupUserHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  const btnTheme = document.getElementById('btn-menu-theme');
  btnTheme?.addEventListener('click', () => {
    showToast('Theme switcher: Light / Dark toggled!');
  });

  const btnSettings = document.getElementById('btn-menu-settings');
  btnSettings?.addEventListener('click', () => {
    window.location.href = '/settings';
  });
}

function openModalForData(data: QuestItemData) {
  const modal = document.getElementById('quest-modal');
  const modalBadge = document.getElementById('modal-badge');
  const modalTitle = document.getElementById('modal-title');
  const modalDiff = document.getElementById('modal-diff');
  const modalXp = document.getElementById('modal-xp');
  const modalDesc = document.getElementById('modal-desc');
  const modalProblemsList = document.getElementById('modal-problems-list');
  const modalStart = document.getElementById('btn-modal-start') as HTMLAnchorElement | null;

  if (!data) return;

  if (modalBadge) modalBadge.textContent = `Quest Step #${data.stepNumber} • ${data.status}`;
  if (modalTitle) modalTitle.textContent = data.title;
  if (modalDiff) {
    modalDiff.textContent = data.difficulty;
    modalDiff.className = `modal-diff ${data.difficulty.toLowerCase()}`;
  }
  if (modalXp) modalXp.textContent = `+${data.xp} XP`;
  if (modalDesc) modalDesc.textContent = data.description;

  // Populate problem list with direct solve links
  if (modalProblemsList) {
    if (data.problems && data.problems.length > 0) {
      modalProblemsList.innerHTML = data.problems.map((prob) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; transition: border-color 0.15s ease;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 13.5px; font-weight: 600; color: #0f172a;">${escapeHtml(prob)}</span>
            <span class="chip-diff-badge ${data.difficulty.toLowerCase()}">${data.difficulty}</span>
          </div>
          <a href="/problem/qlibrary/compiler?id=${encodeURIComponent(prob)}" class="admin-save-quiz-top-btn" style="padding: 6px 14px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px; white-space: nowrap;">
            Solve ➔
          </a>
        </div>
      `).join('');
    } else {
      modalProblemsList.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 8px 0;">No questions attached yet</div>';
    }
  }

  if (modalStart) {
    if (data.problems && data.problems.length > 0) {
      modalStart.href = `/problem/qlibrary/compiler?id=${encodeURIComponent(data.problems[0])}`;
      modalStart.textContent = `Solve "${data.problems[0]}" in Compiler ➔`;
    } else {
      modalStart.href = '/problems';
      modalStart.textContent = 'Explore Problems ➔';
    }
  }

  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeModal() {
  const modal = document.getElementById('quest-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Dynamically computes responsive coordinates for N quest nodes
 * Creates an organic winding path from left to right.
 */
function computeNodeCoordinates(count: number, width: number, height: number): Array<{ x: number; y: number }> {
  const coords: Array<{ x: number; y: number }> = [];
  if (count === 0) return coords;

  const leftPadding = 140;
  const rightPadding = 140;
  const availableWidth = width - leftPadding - rightPadding;

  const stepX = count > 1 ? availableWidth / (count - 1) : 0;

  // Height wave patterns (y positions in pixels) within safe bounds (160 to 390)
  // Keeps nodes and their popup cards completely inside the 560px height viewport
  const yPresets = [380, 240, 360, 210, 340, 230, 350, 220];

  for (let i = 0; i < count; i++) {
    const x = Math.round(count === 1 ? width / 2 : leftPadding + i * stepX);
    let y = 300;
    if (i < yPresets.length) {
      y = yPresets[i];
    } else {
      // Gentle wave alternation for subsequent quests
      y = (i % 2 === 0) ? 360 : 230;
    }
    coords.push({ x, y: Math.min(height - 150, Math.max(160, y)) });
  }

  return coords;
}

/**
 * Render Dynamic SVG Wiring Paths between nodes
 */
function renderWiringSvg(coords: Array<{ x: number; y: number }>, quests: QuestItemData[], width: number, height: number): void {
  const svg = document.getElementById('quest-wiring-svg');
  if (!svg) return;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${height}`);

  if (coords.length < 2) {
    svg.innerHTML = '';
    return;
  }

  let pathsHtml = `
    <defs>
      <linearGradient id="activeWiringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
    </defs>
  `;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const q1 = quests[i];
    const q2 = quests[i + 1];

    // Smooth cubic bezier curve control points
    const dx = p2.x - p1.x;
    const cp1x = p1.x + dx * 0.45;
    const cp1y = p1.y;
    const cp2x = p2.x - dx * 0.45;
    const cp2y = p2.y;

    const pathD = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;

    let strokeColor = '#94A3B8';
    let strokeClass = 'wiring-segment wiring-locked';
    let strokeWidth = '3';
    let strokeDash = '8 8';

    if (q1.status === 'completed' && q2.status === 'completed') {
      strokeColor = '#10B981';
      strokeClass = 'wiring-segment wiring-completed';
      strokeWidth = '3.5';
    } else if (q1.status === 'completed' && (q2.status === 'current' || q2.status === 'available')) {
      strokeColor = '#3B82F6';
      strokeClass = 'wiring-segment wiring-active';
      strokeWidth = '3.5';
    }

    pathsHtml += `
      <path
        d="${pathD}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${strokeDash}"
        class="${strokeClass}"
      />
    `;
  }

  svg.innerHTML = pathsHtml;
}

/**
 * Render Dynamic Quest Nodes onto the Map Layer
 */
function renderMapNodes(coords: Array<{ x: number; y: number }>, quests: QuestItemData[]): void {
  const container = document.getElementById('quest-nodes-layer');
  if (!container) return;

  if (quests.length === 0) {
    container.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255,255,255,0.92); padding: 24px 36px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        <h3 style="margin: 0 0 6px 0; color: #1e293b; font-size: 18px;">No Quests Created Yet</h3>
        <p style="margin: 0; color: #64748b; font-size: 13.5px;">Quests added from the Admin Quest page will appear along this path.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = quests.map((q, idx) => {
    const pt = coords[idx];
    const isCompleted = q.status === 'completed';
    const isCurrent = q.status === 'current' || (!isCompleted && idx === 1);
    const isLast = idx === quests.length - 1;

    let nodeCircleClass = 'circle-locked';
    let badgeClass = 'badge-locked';
    let iconSvg = `
      <svg class="node-icon lock-icon" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2"></rect>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
      </svg>
    `;

    if (isCompleted) {
      nodeCircleClass = idx === 0 ? 'circle-green' : 'circle-gold';
      badgeClass = idx === 0 ? 'badge-green' : 'badge-gold';
      iconSvg = idx === 0
        ? `<svg class="node-icon check-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg class="node-icon star-icon" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    } else if (isCurrent) {
      nodeCircleClass = 'circle-blue active-pulse';
      badgeClass = 'badge-blue';
      iconSvg = `
        <svg class="node-icon code-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      `;
    } else if (isLast) {
      nodeCircleClass = 'circle-locked';
      iconSvg = `
        <svg class="node-icon crown-icon" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"></path>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      `;
    }

    const anchorClass = isCompleted ? 'node-status-completed' : (isCurrent ? 'node-status-current' : 'node-status-locked');
    const diffClass = q.difficulty.toLowerCase();
    // If node is in lower portion (y > 300), position card above circle so it never gets clipped at bottom
    const cardPositionClass = pt.y > 310 ? 'card-above' : '';

    return `
      <div class="quest-node-anchor ${anchorClass} ${isLast ? 'node-status-legend' : ''}" style="left: ${pt.x}px; top: ${pt.y}px; pointer-events: auto;" data-quest-id="${escapeHtml(String(q.id))}">
        <button type="button" class="quest-node-circle ${nodeCircleClass}" aria-label="Quest ${idx + 1}: ${escapeHtml(q.title)}">
          <div class="node-halo-ring ${isCurrent ? 'active-glow' : ''}"></div>
          <div class="node-inner-disk">
            ${iconSvg}
          </div>
          <span class="node-number-badge ${badgeClass}">${idx + 1}</span>
        </button>
        <div class="quest-node-card ${isCurrent ? 'active-card' : ''} ${cardPositionClass}">
          <div class="node-card-title">${escapeHtml(q.title)}</div>
          <div class="node-card-meta">
            <span class="meta-difficulty ${diffClass}">${q.difficulty}</span>
            <span class="meta-dot">•</span>
            <span class="meta-xp">${q.xp} XP</span>
          </div>
          ${isCurrent ? `
            <button type="button" class="quest-continue-btn btn-open-current-quest" data-quest-id="${escapeHtml(String(q.id))}">
              <span>Continue</span>
              <span class="btn-arrow">→</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener to nodes
  container.querySelectorAll<HTMLElement>('.quest-node-anchor').forEach((node) => {
    node.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.btn-open-current-quest')) return;
      const qId = node.getAttribute('data-quest-id');
      const item = activeQuestsData.find((q) => String(q.id) === String(qId));
      if (item) openModalForData(item);
    });
  });

  // Attach click to continue buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-open-current-quest').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qId = btn.getAttribute('data-quest-id');
      const item = activeQuestsData.find((q) => String(q.id) === String(qId));
      if (item) openModalForData(item);
    });
  });
}

/**
 * Render Lower Real Quests List
 */
function renderRealQuestsList(quests: QuestItemData[]): void {
  const container = document.getElementById('real-quests-events-container');
  if (!container) return;

  if (quests.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px; background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 14px; color: #64748b;">
        <p style="margin: 0; font-size: 15px; font-weight: 500;">No quests found in admin panel.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = quests.map((item, idx) => {
    const badgeClass = item.status === 'completed' ? 'active' : (item.status === 'current' ? 'active' : 'ongoing');
    const badgeLabel = item.status === 'completed' ? 'Completed' : (item.status === 'current' ? 'Active' : 'Available');

    const problemChips = item.problems && item.problems.length > 0
      ? item.problems.map(p => `
          <a href="/problem/qlibrary/compiler?id=${encodeURIComponent(p)}" class="problem-solve-chip" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: #EEF2FF; color: #4F46E5; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid #C7D2FE; transition: all 0.15s ease;">
            <span>${escapeHtml(p)}</span>
            <span style="font-size: 11px; color: #4F46E5; opacity: 0.8;">➔ Solve</span>
          </a>
        `).join('')
      : '<span style="color: #94a3b8; font-size: 13px;">No problems linked</span>';

    return `
      <div class="real-quest-card" data-id="${item.id}" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); display: flex; flex-direction: column; gap: 14px; transition: transform 0.15s ease, border-color 0.15s ease;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="admin-battle-icon-badge admin-quest-icon-badge" style="width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="22" height="22">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #0f172a;">${escapeHtml(item.title)}</h3>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 5px; background: #ecfdf5; color: #059669;">
                  Step #${idx + 1}
                </span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 13.5px; color: #64748b;">${escapeHtml(item.description)}</p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="admin-status-badge ${badgeClass}" style="margin: 0;">
              <span class="status-dot"></span>${badgeLabel}
            </span>
            <span style="font-size: 13px; font-weight: 700; color: #f59e0b; background: #fffbeb; border: 1px solid #fef3c7; padding: 4px 10px; border-radius: 20px;">
              +${item.xp} XP
            </span>
          </div>
        </div>

        <div style="padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Questions (${item.problems.length}):</span>
            ${problemChips}
          </div>
          <button type="button" class="btn-open-quest-details admin-btn-outline" data-id="${item.id}" style="padding: 6px 16px; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer;">
            Quest Details ↗
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.btn-open-quest-details').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = activeQuestsData.find((q) => String(q.id) === String(id));
      if (item) openModalForData(item);
    });
  });
}

/**
 * Update Header Progress Pill with exact quest count
 */
function updateHeaderProgress(quests: QuestItemData[]): void {
  const countLabel = document.getElementById('quest-progress-highlight');
  const fillBar = document.getElementById('quest-progress-fill');
  const xpEarned = document.getElementById('quest-xp-highlight');

  const total = quests.length;
  const completed = quests.filter((q) => q.status === 'completed').length;
  const totalXp = quests.reduce((acc, q) => acc + (q.status === 'completed' ? q.xp : 0), 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (countLabel) countLabel.textContent = `${completed} / ${total}`;
  if (fillBar) fillBar.style.width = `${percent}%`;
  if (xpEarned) xpEarned.textContent = `+${totalXp} XP`;
}

/**
 * Load ONLY Real Quests from Admin Panel (/api/quests)
 */
async function loadQuestsData(): Promise<void> {
  activeQuestsData = [];

  try {
    const res = await fetch('/api/quests');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.quests)) {
        data.quests.forEach((q: any, idx: number) => {
          let diff: 'Easy' | 'Medium' | 'Hard' | 'Expert' = 'Medium';
          if (idx === 0) diff = 'Easy';
          else if (idx === 1) diff = 'Medium';
          else if (idx === 2) diff = 'Hard';
          else diff = (q.rewardXp || 100) >= 200 ? 'Expert' : ((q.rewardXp || 100) >= 150 ? 'Hard' : 'Medium');

          activeQuestsData.push({
            id: q.id,
            title: q.title,
            difficulty: diff,
            xp: q.rewardXp || 100,
            status: idx === 0 ? 'completed' : (idx === 1 ? 'current' : (q.status === 'completed' ? 'completed' : 'available')),
            description: q.description || `Quest Step #${q.stepNumber || idx + 1}`,
            problems: q.problems || [],
            stepNumber: q.stepNumber || idx + 1,
          });
        });
      }
    }
  } catch (err) {
    console.error('Failed to load quests from /api/quests:', err);
    showToast('Could not load quests from backend.');
  }

  const count = activeQuestsData.length;

  // Dynamic landscape card width:
  // Give each quest node at least 260px of comfortable horizontal spacing
  // Minimum width is 1400px so map always looks expansive and majestic
  const landscapeCard = document.getElementById('quest-landscape-map');
  const baseCardWidth = Math.max(1400, count * 260);
  const cardHeight = 560;

  if (landscapeCard) {
    landscapeCard.style.width = `${baseCardWidth}px`;
    landscapeCard.style.minWidth = `${baseCardWidth}px`;
  }

  // Compute node coordinates
  const coords = computeNodeCoordinates(count, baseCardWidth, cardHeight);

  // Render SVG wiring
  renderWiringSvg(coords, activeQuestsData, baseCardWidth, cardHeight);

  // Render nodes
  renderMapNodes(coords, activeQuestsData);

  // Render bottom cards
  renderRealQuestsList(activeQuestsData);

  // Update header progress pill
  updateHeaderProgress(activeQuestsData);

  // Update scroll buttons state
  updateScrollButtons();
}

/**
 * Setup smooth horizontal scrolling, drag-to-scroll and button controls
 */
function setupMapScrolling(): void {
  const scrollWrapper = document.getElementById('quest-map-scroll-wrapper');
  const btnPrev = document.getElementById('btn-quest-scroll-prev');
  const btnNext = document.getElementById('btn-quest-scroll-next');

  if (!scrollWrapper) return;

  // 1. Mouse wheel horizontal scroll conversion
  scrollWrapper.addEventListener(
    'wheel',
    (e) => {
      // If user scrolls vertically with standard mousewheel, scroll horizontally
      if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        scrollWrapper.scrollLeft += e.deltaY * 1.2;
      }
    },
    { passive: false }
  );

  // 2. Click and Drag to Pan / Scroll
  let isDown = false;
  let startX = 0;
  let scrollLeftStart = 0;
  let hasMoved = false;

  scrollWrapper.addEventListener('mousedown', (e) => {
    // Ignore clicks on buttons, links, or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select')) return;

    isDown = true;
    hasMoved = false;
    scrollWrapper.classList.add('is-dragging');
    startX = e.pageX - scrollWrapper.offsetLeft;
    scrollLeftStart = scrollWrapper.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    scrollWrapper.classList.remove('is-dragging');
  });

  scrollWrapper.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollWrapper.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMoved = true;
    }
    scrollWrapper.scrollLeft = scrollLeftStart - walk;
  });

  // 3. Arrow buttons for seamless scrolling
  btnPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    scrollWrapper.scrollBy({ left: -380, behavior: 'smooth' });
  });

  btnNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    scrollWrapper.scrollBy({ left: 380, behavior: 'smooth' });
  });

  // Listen to scroll to update button visibility
  scrollWrapper.addEventListener('scroll', updateScrollButtons, { passive: true });
  window.addEventListener('resize', updateScrollButtons);
}

function updateScrollButtons(): void {
  const scrollWrapper = document.getElementById('quest-map-scroll-wrapper');
  const btnPrev = document.getElementById('btn-quest-scroll-prev');
  const btnNext = document.getElementById('btn-quest-scroll-next');

  if (!scrollWrapper || !btnPrev || !btnNext) return;

  const maxScroll = scrollWrapper.scrollWidth - scrollWrapper.clientWidth;
  if (maxScroll <= 10) {
    btnPrev.style.display = 'none';
    btnNext.style.display = 'none';
    return;
  }

  btnPrev.style.display = scrollWrapper.scrollLeft > 20 ? 'flex' : 'none';
  btnNext.style.display = scrollWrapper.scrollLeft < maxScroll - 20 ? 'flex' : 'none';
}

function setupModalDismissals(): void {
  const modal = document.getElementById('quest-modal');
  const modalClose = document.getElementById('btn-close-quest-modal');
  const modalCancel = document.getElementById('btn-modal-cancel');

  modalClose?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  modalCancel?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      const userDropdown = document.getElementById('user-dropdown');
      const avatarBtn = document.getElementById('btn-user-avatar');
      userDropdown?.classList.remove('show');
      avatarBtn?.setAttribute('aria-expanded', 'false');
    }
  });
}

function initQuestPage(): void {
  setupUserMenu();
  setupModalDismissals();
  setupMapScrolling();
  loadQuestsData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuestPage);
} else {
  initQuestPage();
}

