import confetti from 'canvas-confetti';
import {
  fetchPublicBattleRooms,
  createBattleRoom,
  joinBattleRoom,
  fetchBattleQuestion,
  MOCK_BATTLE_QUESTION
} from './services/battleService';
import { signOutClerk, initClerkUserSync } from './services/clerkService';
import './services/adminAuthGuard';
import type { BattleRoom, BattleQuestion } from './types';
import { soundManager } from './services/soundManager';
import { showFirstBattleParticipantBadgeModal } from './services/firstBattleBadgeModal';

// State management
let currentRoom: BattleRoom | null = null;
let currentQuestion: BattleQuestion = MOCK_BATTLE_QUESTION;
let selectedAnswers: Array<string | number> = [];
let timerInterval: ReturnType<typeof setInterval> | null = null;
let secondsRemaining = 24;
let playerScore = 0;

// DOM Elements
const btnJoinBattle = document.getElementById('btn-join-battle');
const btnCreateBattle = document.getElementById('btn-create-battle');
const modalJoinBattle = document.getElementById('modal-join-battle');
const modalCreateBattle = document.getElementById('modal-create-battle');
const modalRoomLobby = document.getElementById('modal-room-lobby');
const modalBattleArena = document.getElementById('modal-battle-arena');
const modalBattleResult = document.getElementById('modal-battle-result');

const btnCloseJoin = document.getElementById('btn-close-join-modal');
const btnCloseCreate = document.getElementById('btn-close-create-modal');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const btnCloseLobby = document.getElementById('btn-close-lobby');
const btnLeaveLobby = document.getElementById('btn-leave-lobby');
const btnExitArena = document.getElementById('btn-exit-arena');

const formJoinCode = document.getElementById('form-join-code') as HTMLFormElement | null;
const inputRoomCode = document.getElementById('input-room-code') as HTMLInputElement | null;
const joinErrorMsg = document.getElementById('join-error-msg');
const publicRoomsContainer = document.getElementById('public-rooms-container');

const formCreateRoom = document.getElementById('form-create-room') as HTMLFormElement | null;
const inputRoomTitle = document.getElementById('input-room-title') as HTMLInputElement | null;
const topicChips = document.getElementById('topic-chips');
const qcountPills = document.getElementById('qcount-pills');
const timerPills = document.getElementById('timer-pills');

// Lobby Elements
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyRoomTitle = document.getElementById('lobby-room-title');
const lobbyPlayerCount = document.getElementById('lobby-player-count');
const lobbyPlayersContainer = document.getElementById('lobby-players-container');
const btnCopyCode = document.getElementById('btn-copy-code');
const copyTextLabel = document.getElementById('copy-text-label');
const btnStartBattleMatch = document.getElementById('btn-start-battle-match');

// Arena Elements
const arenaNumbersContainer = document.getElementById('arena-numbers-container');
const arenaDropZone = document.getElementById('arena-drop-zone');
const dropZoneChips = document.getElementById('drop-zone-chips');
const arenaTimerDisplay = document.getElementById('arena-timer-display');
const btnSubmitArenaAnswer = document.getElementById('btn-submit-arena-answer');
const arenaPlayerScore = document.getElementById('arena-player-score');

// Result Elements
const resultStatScore = document.getElementById('result-stat-score');
const resultStatTime = document.getElementById('result-stat-time');
const btnResultBackLobby = document.getElementById('btn-result-back-lobby');
const btnResultPlayAgain = document.getElementById('btn-result-play-again');

// User Profile Menu Elements
const btnUserAvatar = document.getElementById('btn-user-avatar');
const userDropdown = document.getElementById('user-dropdown');
const btnThemeToggle = document.getElementById('btn-theme-toggle');

/**
 * Initialize Battle Hub
 */
async function init() {
  setupNavigationAndProfile();
  setupModalTriggers();
  setupCreateRoomForm();
  setupJoinRoomForm();
  setupArenaInteractions();
  await refreshPublicRooms();

  // Check URL params for code or id e.g. /battle?code=KZ-1234
  const urlParams = new URLSearchParams(window.location.search);
  const autoCode = urlParams.get('code') || urlParams.get('id');
  if (autoCode) {
    try {
      const room = await joinBattleRoom(autoCode);
      openRoomLobby(room);
    } catch (e) {
      console.warn('Auto join failed:', e);
    }
  }
}

/**
 * Header & Profile dropdown interactions
 */
function setupNavigationAndProfile() {
  if (btnUserAvatar && userDropdown) {
    btnUserAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.contains('show');
      userDropdown.classList.toggle('show', !isOpen);
      btnUserAvatar.classList.toggle('open', !isOpen);
      btnUserAvatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !btnUserAvatar.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        btnUserAvatar.classList.remove('open');
        btnUserAvatar.setAttribute('aria-expanded', 'false');
      }
    });

    if (window.location.hash === '#open-popup') {
      userDropdown.classList.add('show');
      btnUserAvatar.classList.add('open');
      btnUserAvatar.setAttribute('aria-expanded', 'true');
    }

    document.querySelector('.popup-user-header')?.addEventListener('click', () => {
      window.location.href = '/profile';
    });

    document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
      window.location.href = '/settings';
    });

    document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOutClerk();
    });
  }

  initClerkUserSync();

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
    });
  }
}

/**
 * Modal Opening & Closing Handlers
 */
function setupModalTriggers() {
  btnJoinBattle?.addEventListener('click', async () => {
    openModal(modalJoinBattle);
    await refreshPublicRooms();
    inputRoomCode?.focus();
  });

  btnCreateBattle?.addEventListener('click', () => {
    openModal(modalCreateBattle);
    inputRoomTitle?.focus();
  });

  btnCloseJoin?.addEventListener('click', () => closeModal(modalJoinBattle));
  btnCloseCreate?.addEventListener('click', () => closeModal(modalCreateBattle));
  btnCancelCreate?.addEventListener('click', () => closeModal(modalCreateBattle));
  btnCloseLobby?.addEventListener('click', () => closeModal(modalRoomLobby));
  btnLeaveLobby?.addEventListener('click', () => closeModal(modalRoomLobby));

  btnExitArena?.addEventListener('click', () => {
    if (confirm('Are you sure you want to exit the live battle?')) {
      stopArenaTimer();
      soundManager.fadeOutGameBgm();
      modalBattleArena?.classList.remove('open');
    }
  });

  // Close modals when clicking backdrop
  [modalJoinBattle, modalCreateBattle, modalRoomLobby, modalBattleResult].forEach((modal) => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // ESC key closes topmost open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [modalBattleResult, modalRoomLobby, modalCreateBattle, modalJoinBattle].forEach((modal) => {
        if (modal?.classList.contains('open')) closeModal(modal);
      });
    }
  });
}

function openModal(modal: HTMLElement | null) {
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal: HTMLElement | null) {
  if (!modal) return;
  if (modal === modalRoomLobby) {
    stopLobbyPolling();
  }
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

/**
 * Join Battle by Code & Public List
 */
function setupJoinRoomForm() {
  if (!formJoinCode || !inputRoomCode) return;

  // Auto uppercase and format room code
  inputRoomCode.addEventListener('input', () => {
    inputRoomCode.value = inputRoomCode.value.toUpperCase();
    if (joinErrorMsg) joinErrorMsg.style.display = 'none';
  });

  formJoinCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = inputRoomCode.value.trim();
    if (!code) return;

    try {
      const btn = document.getElementById('btn-submit-join');
      if (btn) btn.innerText = 'Joining...';
      const room = await joinBattleRoom(code);
      closeModal(modalJoinBattle);
      openRoomLobby(room);
    } catch (err: unknown) {
      if (joinErrorMsg) {
        joinErrorMsg.textContent = err instanceof Error ? err.message : 'Invalid room code';
        joinErrorMsg.style.display = 'block';
      }
    } finally {
      const btn = document.getElementById('btn-submit-join');
      if (btn) btn.innerHTML = `<span>Join Room</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    }
  });
}

async function refreshPublicRooms() {
  if (!publicRoomsContainer) return;
  publicRoomsContainer.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">Loading available rooms...</div>';

  try {
    const rooms = await fetchPublicBattleRooms();
    if (rooms.length === 0) {
      publicRoomsContainer.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">No active public rooms right now. Create one!</div>';
      return;
    }

    publicRoomsContainer.innerHTML = rooms
      .map(
        (room) => {
          const isFull = room.players.length >= room.maxPlayers;
          return `
          <div class="public-room-item">
            <div>
              <h4 class="room-meta-title">${escapeHtml(room.title)}</h4>
              <p class="room-meta-sub">${escapeHtml(room.topic)} • ${room.players.length}/${room.maxPlayers} players ${isFull ? '<strong style="color:#ef4444;font-size:12px;">(FULL)</strong>' : ''}</p>
            </div>
            <button 
              type="button" 
              class="btn-quick-join" 
              data-room-code="${room.roomCode}"
              data-full="${isFull ? 'true' : 'false'}"
              style="${isFull ? 'background:#cbd5e1;cursor:not-allowed;color:#64748b;border-color:#cbd5e1;' : ''}"
            >
              ${isFull ? 'Room Full' : `Join (${room.roomCode})`}
            </button>
          </div>
        `;
        }
      )
      .join('');

    // Attach listeners to quick join buttons
    publicRoomsContainer.querySelectorAll<HTMLButtonElement>('.btn-quick-join').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const isFull = btn.getAttribute('data-full') === 'true';
        const code = btn.getAttribute('data-room-code');
        if (isFull) {
          alert('This battle room is already full! Please try another room or create your own.');
          return;
        }
        if (code) {
          closeModal(modalJoinBattle);
          const room = await joinBattleRoom(code);
          openRoomLobby(room);
        }
      });
    });
  } catch (_e) {
    publicRoomsContainer.innerHTML = '<div style="color:#ef4444;font-size:13px;">Failed to load active rooms.</div>';
  }
}

/**
 * Create Room Form Setup
 */
function setupCreateRoomForm() {
  if (!formCreateRoom) return;

  // Topic selector pills
  topicChips?.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      topicChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Question count selector
  qcountPills?.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      qcountPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // Timer selector
  timerPills?.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      timerPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  formCreateRoom.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = inputRoomTitle?.value.trim() || 'Live Arena Battle';
    const topic = topicChips?.querySelector('.chip.active')?.getAttribute('data-topic') || 'Math & Primes';
    const questionCount = parseInt(qcountPills?.querySelector('.pill.active')?.getAttribute('data-count') || '5', 10);
    const timePerQuestion = parseInt(timerPills?.querySelector('.pill.active')?.getAttribute('data-timer') || '24', 10);
    const maxPlayersSelect = document.getElementById('select-create-max-players') as HTMLSelectElement | null;
    const maxPlayers = maxPlayersSelect ? parseInt(maxPlayersSelect.value, 10) : 4;

    const newRoom = await createBattleRoom({
      title,
      topic,
      questionCount,
      timePerQuestion,
      maxPlayers
    });

    closeModal(modalCreateBattle);
    openRoomLobby(newRoom);
  });
}

let lobbyPollInterval: ReturnType<typeof setInterval> | null = null;

function stopLobbyPolling() {
  if (lobbyPollInterval) {
    clearInterval(lobbyPollInterval);
    lobbyPollInterval = null;
  }
}

function startLobbyPolling(roomCode: string) {
  stopLobbyPolling();
  lobbyPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/battles/${encodeURIComponent(roomCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.battle && currentRoom) {
          currentRoom.players = Array.isArray(data.battle.players) ? data.battle.players : currentRoom.players;
          currentRoom.maxPlayers = data.battle.maxPlayers || currentRoom.maxPlayers;
          renderLobbyPlayers();
        }
      }
    } catch (e) {
      console.warn('Lobby polling err:', e);
    }
  }, 2500);
}

function renderLobbyPlayers() {
  if (!currentRoom) return;
  const lobbyMaxCount = document.getElementById('lobby-max-player-count');
  if (lobbyPlayerCount) lobbyPlayerCount.textContent = `${currentRoom.players.length}`;
  if (lobbyMaxCount) lobbyMaxCount.textContent = `${currentRoom.maxPlayers}`;

  if (lobbyPlayersContainer) {
    lobbyPlayersContainer.innerHTML = currentRoom.players
      .map(
        (p) => `
        <div class="lobby-player-row">
          <div class="lobby-player-meta">
            <img src="${p.avatar || '/images/home_avatar.png'}" alt="${escapeHtml(p.name)}" class="lobby-player-avatar" />
            <span class="lobby-player-name">${escapeHtml(p.name)} ${p.isHost ? '👑' : ''}</span>
          </div>
          <span class="player-status-tag">READY</span>
        </div>
      `
      )
      .join('');
  }
}

/**
 * Room Lobby Display & Interactions
 */
function openRoomLobby(room: BattleRoom) {
  currentRoom = room;

  if (lobbyRoomTitle) lobbyRoomTitle.textContent = room.title;
  if (lobbyRoomCode) lobbyRoomCode.textContent = room.roomCode;
  renderLobbyPlayers();
  startLobbyPolling(room.roomCode);

  // Copy code button
  if (btnCopyCode) {
    btnCopyCode.onclick = () => {
      navigator.clipboard.writeText(room.roomCode);
      if (copyTextLabel) copyTextLabel.textContent = 'Copied!';
      setTimeout(() => {
        if (copyTextLabel) copyTextLabel.textContent = 'Copy';
      }, 2000);
    };
  }

  // Start battle match
  if (btnStartBattleMatch) {
    btnStartBattleMatch.onclick = () => {
      stopLobbyPolling();
      closeModal(modalRoomLobby);
      startBattleArena(room);
    };
  }

  openModal(modalRoomLobby);
}

/**
 * Question Arena Cloned from img6_battle_Qpage.png
 */
async function startBattleArena(room: BattleRoom) {
  stopLobbyPolling();
  currentRoom = room;
  currentQuestion = await fetchBattleQuestion(room.id, 0);
  selectedAnswers = [];
  playerScore = 0;
  secondsRemaining = room.timePerQuestion || 24;

  const promptEl = document.getElementById('arena-q-prompt');
  if (promptEl) {
    promptEl.textContent = currentQuestion.prompt || 'Choose the correct answer';
  }

  // Update Match Status Title based on max players
  const arenaStatusLabel = document.getElementById('arena-match-status-label');
  if (arenaStatusLabel) {
    const maxP = room.maxPlayers || 4;
    if (maxP === 2) {
      arenaStatusLabel.textContent = 'Live 1v1 Battle';
    } else {
      arenaStatusLabel.textContent = `Live ${maxP}-Player Arena`;
    }
  }

  // Render All Active Participants in the Live Arena Bar
  const participantsBar = document.getElementById('arena-participants-bar');
  if (participantsBar && currentRoom.players) {
    participantsBar.innerHTML = currentRoom.players
      .map(
        (p) => `
        <div class="arena-p-chip" title="${escapeHtml(p.name)}">
          <img src="${p.avatar || '/images/home_avatar.png'}" class="arena-p-avatar" alt="${escapeHtml(p.name)}" />
          <span>${escapeHtml(p.name.length > 12 ? p.name.slice(0, 10) + '..' : p.name)}</span>
        </div>
      `
      )
      .join('');
  }

  if (arenaPlayerScore) arenaPlayerScore.textContent = '0';
  renderArenaNumbers();
  renderSelectedChips();
  startArenaTimer();

  // Play Game Background Music configured in Admin Settings
  soundManager.playGameBgm();

  modalBattleArena?.classList.add('open');
}

function renderArenaNumbers() {
  if (!arenaNumbersContainer) return;

  // Alternate colors matching battle styles
  const tintClasses = ['tint-blue', 'tint-green', 'tint-purple'];

  arenaNumbersContainer.innerHTML = currentQuestion.items
    .map((item, idx) => {
      const tint = tintClasses[idx % tintClasses.length];
      const isSelected = selectedAnswers.some(ans => String(ans) === String(item.value));
      const displayVal = item.label ? `${item.label}: ${item.value}` : String(item.value);
      return `
        <button
          type="button"
          class="number-card ${tint} ${isSelected ? 'selected' : ''}"
          data-value="${escapeHtml(String(item.value))}"
          aria-label="Option ${escapeHtml(displayVal)}"
          draggable="${isSelected ? 'false' : 'true'}"
        >
          <div class="number-card-grip">
            <span></span><span></span><span></span>
          </div>
          <span class="number-card-val">${escapeHtml(displayVal)}</span>
        </button>
      `;
    })
    .join('');

  // Number / Option click & drag handlers
  arenaNumbersContainer.querySelectorAll<HTMLButtonElement>('.number-card').forEach((btn) => {
    const val = btn.getAttribute('data-value') || '';

    // Click handler to toggle/add selection
    btn.addEventListener('click', () => {
      if (!selectedAnswers.some(ans => String(ans) === String(val))) {
        selectedAnswers.push(val);
        renderArenaNumbers();
        renderSelectedChips();
      }
    });

    // HTML5 Dragstart
    btn.addEventListener('dragstart', (e: DragEvent) => {
      if (selectedAnswers.some(ans => String(ans) === String(val))) {
        e.preventDefault();
        return;
      }
      btn.classList.add('dragging');
      arenaDropZone?.classList.add('active-drag');

      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', val);
        e.dataTransfer.effectAllowed = 'copyMove';
      }
    });

    // HTML5 Dragend
    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
      arenaDropZone?.classList.remove('active-drag');
    });
  });
}

function renderSelectedChips() {
  if (!dropZoneChips) return;

  if (selectedAnswers.length === 0) {
    dropZoneChips.innerHTML = '<span style="color:#94a3b8;font-size:13px;font-style:italic;">No answers dropped yet</span>';
    return;
  }

  dropZoneChips.innerHTML = selectedAnswers
    .map(
      (val) => `
      <div class="dropped-chip" data-value="${escapeHtml(String(val))}" title="Click to remove">
        <span>${escapeHtml(String(val))}</span>
        <span class="dropped-chip-remove">&times;</span>
      </div>
    `
    )
    .join('');

  // Chip click to remove
  dropZoneChips.querySelectorAll('.dropped-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-value') || '';
      selectedAnswers = selectedAnswers.filter((v) => String(v) !== String(val));
      renderArenaNumbers();
      renderSelectedChips();
    });
  });
}

function setupArenaInteractions() {
  // Drop Zone Drag & Drop Handlers
  if (arenaDropZone) {
    // Must prevent default on dragover for drop to fire
    arenaDropZone.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      arenaDropZone.classList.add('active-drag');
    });

    arenaDropZone.addEventListener('dragenter', (e: DragEvent) => {
      e.preventDefault();
      arenaDropZone.classList.add('active-drag');
    });

    arenaDropZone.addEventListener('dragleave', (e: DragEvent) => {
      const rect = arenaDropZone.getBoundingClientRect();
      if (
        e.clientX <= rect.left ||
        e.clientX >= rect.right ||
        e.clientY <= rect.top ||
        e.clientY >= rect.bottom
      ) {
        arenaDropZone.classList.remove('active-drag');
      }
    });

    arenaDropZone.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      arenaDropZone.classList.remove('active-drag');
      const val = e.dataTransfer?.getData('text/plain');
      if (val && !selectedAnswers.some((ans) => String(ans) === String(val))) {
        selectedAnswers.push(val);
        renderArenaNumbers();
        renderSelectedChips();
      }
    });

    // Clicking drop zone selects/toggles
    arenaDropZone.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.dropped-chip')) return;
    });
  }

  // Submit Answer
  btnSubmitArenaAnswer?.addEventListener('click', () => {
    evaluateAnswer();
  });

  // Result dialog buttons
  btnResultBackLobby?.addEventListener('click', () => {
    closeModal(modalBattleResult);
    modalBattleArena?.classList.remove('open');
  });

  btnResultPlayAgain?.addEventListener('click', () => {
    closeModal(modalBattleResult);
    if (currentRoom) {
      startBattleArena(currentRoom);
    }
  });
}

function startArenaTimer() {
  stopArenaTimer();
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerDisplay();

    if (secondsRemaining <= 0) {
      stopArenaTimer();
      evaluateAnswer();
    }
  }, 1000);
}

function stopArenaTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!arenaTimerDisplay) return;
  const mm = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const ss = String(secondsRemaining % 60).padStart(2, '0');
  arenaTimerDisplay.textContent = `${mm}:${ss}`;
}

function evaluateAnswer() {
  stopArenaTimer();
  soundManager.fadeOutGameBgm();

  const targetPrimes = currentQuestion.targetPrimeIds || [];
  const isCorrect =
    selectedAnswers.length > 0 &&
    targetPrimes.length > 0 &&
    selectedAnswers.length === targetPrimes.length &&
    targetPrimes.every((p) => selectedAnswers.some(ans => String(ans) === String(p)));

  const timeTaken = (currentRoom?.timePerQuestion || 24) - Math.max(0, secondsRemaining);
  const earnedScore = isCorrect ? 120 + Math.max(0, secondsRemaining * 2) : Math.max(20, selectedAnswers.length * 10);

  if (resultStatScore) resultStatScore.textContent = `+${earnedScore}`;
  if (resultStatTime) resultStatTime.textContent = `${timeTaken}s`;

  const titleEl = document.getElementById('result-status-title');
  const subEl = document.getElementById('result-status-sub');

  if (isCorrect) {
    if (titleEl) titleEl.textContent = 'VICTORY!';
    if (subEl) subEl.textContent = 'Flawless! Your answer was correct!';
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  } else {
    if (titleEl) titleEl.textContent = 'MATCH COMPLETE';
    if (subEl) subEl.textContent = `Correct answer was: ${targetPrimes.join(', ')}`;
  }

  // Record battle attendance and award 50 XP
  try {
    const userEmail = localStorage.getItem('kuizu_user_email') || '';
    const userName = localStorage.getItem('kuizu_user_name') || '';
    const battleId = currentRoom?.id || '';
    if (battleId) {
      fetch(`/api/battles/${battleId}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName })
      }).catch(() => {});
    }
  } catch {}

  // Congratulate 1st battle participant with slowly moving 3D badge modal popup in center of screen
  showFirstBattleParticipantBadgeModal(() => {
    openModal(modalBattleResult);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Hook re-inspect 3D badge button
document.getElementById('btn-view-3d-battle-badge')?.addEventListener('click', () => {
  showFirstBattleParticipantBadgeModal();
});

// Expose on window for testing & verification
(window as any).showFirstBattleParticipantBadgeModal = showFirstBattleParticipantBadgeModal;

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
