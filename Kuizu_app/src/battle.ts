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
import { showFirstLooserBadgeModal } from './services/firstLooserBadgeModal';
import { unlockBadge, isBadgeUnlocked } from './services/badgeManager';

// State management
interface LiveBattlePlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  solvedCount: number;
  isYou: boolean;
  isHost?: boolean;
  rank: number;
  lastSolveTime?: number;
  hasJustSolved?: boolean;
}

const DEFAULT_BATTLE_QUESTIONS: BattleQuestion[] = [
  {
    id: 1,
    tag: 'QUESTION 1 OF 4',
    prompt: 'Which of these are prime numbers?',
    timeLimitSeconds: 20,
    items: [
      { id: 1, value: 1, isPrime: false },
      { id: 2, value: 2, isPrime: true },
      { id: 3, value: 3, isPrime: true },
      { id: 4, value: 4, isPrime: false },
      { id: 5, value: 5, isPrime: true },
      { id: 6, value: 6, isPrime: false },
      { id: 7, value: 7, isPrime: true },
      { id: 8, value: 8, isPrime: false },
      { id: 9, value: 9, isPrime: false },
      { id: 11, value: 11, isPrime: true },
      { id: 12, value: 12, isPrime: false }
    ],
    targetPrimeIds: [2, 3, 5, 7, 11]
  },
  {
    id: 2,
    tag: 'QUESTION 2 OF 4',
    prompt: 'Which of these are powers of 2?',
    timeLimitSeconds: 20,
    items: [
      { id: 1, value: 1, isPrime: false },
      { id: 2, value: 2, isPrime: true },
      { id: 3, value: 3, isPrime: false },
      { id: 4, value: 4, isPrime: true },
      { id: 6, value: 6, isPrime: false },
      { id: 8, value: 8, isPrime: true },
      { id: 12, value: 12, isPrime: false },
      { id: 16, value: 16, isPrime: true },
      { id: 24, value: 24, isPrime: false },
      { id: 32, value: 32, isPrime: true }
    ],
    targetPrimeIds: [1, 2, 4, 8, 16, 32]
  },
  {
    id: 3,
    tag: 'QUESTION 3 OF 4',
    prompt: 'Select all even Fibonacci numbers',
    timeLimitSeconds: 20,
    items: [
      { id: 1, value: 1, isPrime: false },
      { id: 2, value: 2, isPrime: true },
      { id: 3, value: 3, isPrime: false },
      { id: 5, value: 5, isPrime: false },
      { id: 8, value: 8, isPrime: true },
      { id: 13, value: 13, isPrime: false },
      { id: 21, value: 21, isPrime: false },
      { id: 34, value: 34, isPrime: true },
      { id: 55, value: 55, isPrime: false }
    ],
    targetPrimeIds: [2, 8, 34]
  },
  {
    id: 4,
    tag: 'QUESTION 4 OF 4',
    prompt: 'Identify all multiples of 3',
    timeLimitSeconds: 20,
    items: [
      { id: 2, value: 2, isPrime: false },
      { id: 3, value: 3, isPrime: true },
      { id: 5, value: 5, isPrime: false },
      { id: 6, value: 6, isPrime: true },
      { id: 8, value: 8, isPrime: false },
      { id: 9, value: 9, isPrime: true },
      { id: 11, value: 11, isPrime: false },
      { id: 12, value: 12, isPrime: true },
      { id: 14, value: 14, isPrime: false },
      { id: 15, value: 15, isPrime: true }
    ],
    targetPrimeIds: [3, 6, 9, 12, 15]
  }
];

let currentRoom: BattleRoom | null = null;
let battleQuestions: BattleQuestion[] = [];
let currentQuestionIndex = 0;
let currentQuestion: BattleQuestion = MOCK_BATTLE_QUESTION;
let selectedAnswers: Array<string | number> = [];
let questionTimerInterval: ReturnType<typeof setInterval> | null = null;
let secondsRemaining = 20;
let mainTimerInterval: ReturnType<typeof setInterval> | null = null;
let mainSecondsRemaining = 80;
let playerScore = 0;
let roomPlayers: LiveBattlePlayer[] = [];
let scheduledSolveTimeouts: Array<ReturnType<typeof setTimeout>> = [];
let isQuestionSubmitting = false;

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
const arenaMainTimerDisplay = document.getElementById('arena-main-timer-display');
const btnSubmitArenaAnswer = document.getElementById('btn-submit-arena-answer');
const arenaPlayerScore = document.getElementById('arena-player-score');
const arenaQStepLabel = document.getElementById('arena-q-step-label');

// Live Leaderboard Elements
const arenaLiveLeaderboardPanel = document.getElementById('arena-live-leaderboard-panel');
const btnToggleLiveLb = document.getElementById('btn-toggle-live-lb');
const btnToggleLiveLbText = document.getElementById('btn-toggle-live-lb-text');
const btnCloseLiveLb = document.getElementById('btn-close-live-lb');
const liveLbPlayersList = document.getElementById('live-lb-players-list');
const liveLbQIndicator = document.getElementById('live-lb-q-indicator');
const liveLbPlayersCount = document.getElementById('live-lb-players-count');
const liveLbTickerText = document.getElementById('live-lb-ticker-text');

// Result Elements
const resultStatScore = document.getElementById('result-stat-score');
const resultStatTime = document.getElementById('result-stat-time');
const btnResultBackLobby = document.getElementById('btn-result-back-lobby');
const btnResultPlayAgain = document.getElementById('btn-result-play-again');
const finalBattleLeaderboardTable = document.getElementById('final-battle-leaderboard-table');
const finalBattleRoomTag = document.getElementById('final-battle-room-type-tag');
const btnView3dBattleBadge = document.getElementById('btn-view-3d-battle-badge');
const btnView3dBattleBadgeText = document.getElementById('btn-view-3d-battle-badge-text');

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
  setupLiveLeaderboardToggle();
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
 * Live Leaderboard Toggle Setup
 */
function setupLiveLeaderboardToggle() {
  const toggleLb = () => {
    if (!arenaLiveLeaderboardPanel) return;
    const isCollapsed = arenaLiveLeaderboardPanel.classList.toggle('collapsed');
    if (btnToggleLiveLb) {
      btnToggleLiveLb.classList.toggle('active', !isCollapsed);
    }
    if (btnToggleLiveLbText) {
      btnToggleLiveLbText.textContent = isCollapsed ? 'Show Leaderboard' : 'Leaderboard';
    }
  };

  btnToggleLiveLb?.addEventListener('click', toggleLb);
  btnCloseLiveLb?.addEventListener('click', toggleLb);
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
  });

  btnCloseJoin?.addEventListener('click', () => closeModal(modalJoinBattle));
  btnCreateBattle?.addEventListener('click', () => openModal(modalCreateBattle));
  btnCloseCreate?.addEventListener('click', () => closeModal(modalCreateBattle));
  btnCancelCreate?.addEventListener('click', () => closeModal(modalCreateBattle));

  btnCloseLobby?.addEventListener('click', () => {
    stopLobbyPolling();
    closeModal(modalRoomLobby);
  });

  btnLeaveLobby?.addEventListener('click', () => {
    stopLobbyPolling();
    closeModal(modalRoomLobby);
  });

  btnExitArena?.addEventListener('click', () => {
    if (confirm('Are you sure you want to abandon the battle? Current progress will be lost.')) {
      stopArenaTimers();
      clearScheduledSolveEvents();
      soundManager.fadeOutGameBgm();
      modalBattleArena?.classList.remove('open');
      currentRoom = null;
    }
  });
}

function openModal(el: HTMLElement | null) {
  if (el) {
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(el: HTMLElement | null) {
  if (el) {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Join Form Setup
 */
function setupJoinRoomForm() {
  if (!formJoinCode) return;

  formJoinCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = inputRoomCode?.value.trim().toUpperCase() || '';
    if (!code) return;

    if (joinErrorMsg) joinErrorMsg.textContent = '';

    try {
      const room = await joinBattleRoom(code);
      closeModal(modalJoinBattle);
      openRoomLobby(room);
    } catch (err: any) {
      if (joinErrorMsg) {
        joinErrorMsg.textContent = err.message || 'Battle room not found. Check code & retry.';
      }
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
          const isAdmin = Boolean(room.isAdminBattle || room.hostName === 'Admin' || room.hostId === 'usr_admin');
          return `
          <div class="public-room-item" style="${isAdmin ? 'border-color: rgba(99, 102, 241, 0.35); background: rgba(245, 243, 255, 0.6);' : ''}">
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <h4 class="room-meta-title">${escapeHtml(room.title)}</h4>
                ${isAdmin ? '<span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; background:#e0e7ff; color:#4338ca;">ADMIN</span>' : ''}
              </div>
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

  topicChips?.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      topicChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  qcountPills?.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      qcountPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

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
    const questionCount = parseInt(qcountPills?.querySelector('.pill.active')?.getAttribute('data-count') || '4', 10);
    const timePerQuestion = parseInt(timerPills?.querySelector('.pill.active')?.getAttribute('data-timer') || '20', 10);
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
          currentRoom.isAdminBattle = Boolean(data.battle.isAdminBattle);
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

  if (btnCopyCode) {
    btnCopyCode.onclick = () => {
      navigator.clipboard.writeText(room.roomCode);
      if (copyTextLabel) copyTextLabel.textContent = 'Copied!';
      setTimeout(() => {
        if (copyTextLabel) copyTextLabel.textContent = 'Copy';
      }, 2000);
    };
  }

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
 * Live Battle Arena Initialization
 */
async function startBattleArena(room: BattleRoom) {
  stopLobbyPolling();
  currentRoom = room;

  // Initialize Questions Series
  battleQuestions = [...DEFAULT_BATTLE_QUESTIONS];
  try {
    const fetchedQ = await fetchBattleQuestion(room.id, 0);
    if (fetchedQ && fetchedQ.items && fetchedQ.items.length > 0) {
      battleQuestions[0] = fetchedQ;
    }
  } catch {}

  currentQuestionIndex = 0;
  playerScore = 0;
  secondsRemaining = room.timePerQuestion || 20;
  mainSecondsRemaining = (room.timePerQuestion || 20) * battleQuestions.length;
  isQuestionSubmitting = false;

  // Initialize Room Players for Live Leaderboard
  initLiveLeaderboardPlayers(room);

  // Update Top Bar & Match Status
  const arenaStatusLabel = document.getElementById('arena-match-status-label');
  if (arenaStatusLabel) {
    const maxP = room.maxPlayers || roomPlayers.length || 4;
    const isAdmin = Boolean(room.isAdminBattle || room.hostName === 'Admin' || room.hostId === 'usr_admin');
    arenaStatusLabel.textContent = isAdmin ? `Live Admin Battle (${maxP} Players)` : (maxP === 2 ? 'Live 1v1 Battle' : `Live ${maxP}-Player Arena`);
  }

  renderParticipantsBar();
  if (arenaPlayerScore) arenaPlayerScore.textContent = '0';

  // Load Question 1
  loadQuestion(0);

  // Start Dual Timers
  startArenaTimers();

  // Play background music
  soundManager.playGameBgm();

  modalBattleArena?.classList.add('open');
}

/**
 * Setup and populate the live leaderboard player list
 */
function initLiveLeaderboardPlayers(room: BattleRoom) {
  const storedUser = localStorage.getItem('kuizu_user');
  let currentUserName = localStorage.getItem('kuizu_user_name') || 'You';
  let currentUserAvatar = '/images/home_avatar.png';
  let currentUserId = 'usr_you';

  try {
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.name) currentUserName = parsed.name;
      if (parsed.avatar) currentUserAvatar = parsed.avatar;
      if (parsed.id) currentUserId = parsed.id;
    }
  } catch {}

  const players: LiveBattlePlayer[] = [
    {
      id: currentUserId,
      name: `${currentUserName} (You)`,
      avatar: currentUserAvatar,
      score: 0,
      solvedCount: 0,
      isYou: true,
      rank: 1
    }
  ];

  // Add room players or default competitors matching screenshot
  const competitors = [
    { name: 'Student 774', avatar: '/images/home_avatar.png' },
    { name: 'Student 375', avatar: '/images/home_avatar.png' },
    { name: 'Anuj Chavan', avatar: '/images/home_avatar.png' }
  ];

  if (room.players && room.players.length > 1) {
    room.players.forEach((p, idx) => {
      if (p.id !== currentUserId && !p.name.includes('(You)')) {
        players.push({
          id: p.id || `usr_rival_${idx}`,
          name: p.name,
          avatar: p.avatar || '/images/home_avatar.png',
          score: 0,
          solvedCount: 0,
          isYou: false,
          isHost: p.isHost,
          rank: players.length + 1
        });
      }
    });
  }

  // Ensure at least 4 active competing players in the room
  let compIdx = 0;
  while (players.length < 4 && compIdx < competitors.length) {
    const comp = competitors[compIdx++];
    if (!players.some((p) => p.name === comp.name)) {
      players.push({
        id: `usr_bot_${compIdx}`,
        name: comp.name,
        avatar: comp.avatar,
        score: 0,
        solvedCount: 0,
        isYou: false,
        rank: players.length + 1
      });
    }
  }

  roomPlayers = players;
  if (liveLbPlayersCount) {
    liveLbPlayersCount.textContent = String(roomPlayers.length);
  }

  renderLiveLeaderboard();
  setLiveTicker('Match started! Solve questions quickly to climb the live leaderboard.');
}

/**
 * Render the Top Bar Participant avatars
 */
function renderParticipantsBar() {
  const participantsBar = document.getElementById('arena-participants-bar');
  if (participantsBar && roomPlayers.length > 0) {
    participantsBar.innerHTML = roomPlayers
      .map(
        (p) => `
        <div class="arena-p-chip" title="${escapeHtml(p.name)}" style="${p.isYou ? 'border-color: #8b5cf6; background: #faf5ff;' : ''}">
          <img src="${p.avatar || '/images/home_avatar.png'}" class="arena-p-avatar" alt="${escapeHtml(p.name)}" />
          <span>${escapeHtml(p.isYou ? 'You' : (p.name.length > 11 ? p.name.slice(0, 10) + '..' : p.name))}</span>
        </div>
      `
      )
      .join('');
  }
}

/**
 * Load a specific question by index
 */
function loadQuestion(index: number) {
  clearScheduledSolveEvents();
  currentQuestionIndex = index;
  currentQuestion = battleQuestions[index] || battleQuestions[0];
  selectedAnswers = [];
  isQuestionSubmitting = false;
  secondsRemaining = currentRoom?.timePerQuestion || 20;

  // Update prompt and step indicators
  const promptEl = document.getElementById('arena-q-prompt');
  if (promptEl) {
    promptEl.textContent = currentQuestion.prompt;
  }

  if (arenaQStepLabel) {
    arenaQStepLabel.textContent = `QUESTION ${index + 1} OF ${battleQuestions.length}`;
  }

  if (liveLbQIndicator) {
    liveLbQIndicator.textContent = `Question ${index + 1} of ${battleQuestions.length}`;
  }

  renderArenaNumbers();
  renderSelectedChips();
  updateTimerDisplays();

  // Schedule real-time solves by other room players for this question
  scheduleCompetitorSolvesForQuestion(index);
}

/**
 * Render Number Tiles Grid
 */
function renderArenaNumbers() {
  if (!arenaNumbersContainer) return;

  const tintClasses = ['tint-blue', 'tint-green', 'tint-purple'];

  arenaNumbersContainer.innerHTML = currentQuestion.items
    .map((item, idx) => {
      const tint = tintClasses[idx % tintClasses.length];
      const isSelected = selectedAnswers.some((ans) => String(ans) === String(item.value));
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

  arenaNumbersContainer.querySelectorAll<HTMLButtonElement>('.number-card').forEach((btn) => {
    const val = btn.getAttribute('data-value') || '';

    btn.addEventListener('click', () => {
      if (isQuestionSubmitting) return;
      if (!selectedAnswers.some((ans) => String(ans) === String(val))) {
        selectedAnswers.push(val);
        renderArenaNumbers();
        renderSelectedChips();
      }
    });

    btn.addEventListener('dragstart', (e: DragEvent) => {
      if (isQuestionSubmitting || selectedAnswers.some((ans) => String(ans) === String(val))) {
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

    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
      arenaDropZone?.classList.remove('active-drag');
    });
  });
}

/**
 * Render Dropped Answer Chips
 */
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

  dropZoneChips.querySelectorAll('.dropped-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (isQuestionSubmitting) return;
      const val = chip.getAttribute('data-value') || '';
      selectedAnswers = selectedAnswers.filter((v) => String(v) !== String(val));
      renderArenaNumbers();
      renderSelectedChips();
    });
  });
}

function setupArenaInteractions() {
  if (arenaDropZone) {
    arenaDropZone.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
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
      if (isQuestionSubmitting) return;
      const val = e.dataTransfer?.getData('text/plain');
      if (val && !selectedAnswers.some((ans) => String(ans) === String(val))) {
        selectedAnswers.push(val);
        renderArenaNumbers();
        renderSelectedChips();
      }
    });
  }

  btnSubmitArenaAnswer?.addEventListener('click', () => {
    if (!isQuestionSubmitting) {
      evaluateCurrentAnswer();
    }
  });

  btnResultBackLobby?.addEventListener('click', () => {
    closeModal(modalBattleResult);
    modalBattleArena?.classList.remove('open');
    currentRoom = null;
  });

  btnResultPlayAgain?.addEventListener('click', () => {
    closeModal(modalBattleResult);
    if (currentRoom) {
      startBattleArena(currentRoom);
    }
  });
}

/**
 * Schedule real-time solves by rival participants
 */
function scheduleCompetitorSolvesForQuestion(qIndex: number) {
  clearScheduledSolveEvents();

  if (qIndex === 0) {
    // Question 1: Student 774 solves first problem -> name moves to top of live leaderboard
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 774', 120, '⚡ Student 774 solved first question! Took Rank #1.');
      }, 6500)
    );

    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Anuj Chavan', 110, '⚡ Anuj Chavan submitted solution! (+110 pts)');
      }, 13000)
    );
  } else if (qIndex === 1) {
    // Question 2: Student 375 submits 2nd question -> rank on battle leaderboard updates live!
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 375', 135, '🔥 Student 375 submitted 2nd question! Rank updated live.');
      }, 7000)
    );

    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 774', 115, '⚡ Student 774 solved Question 2 (+115 pts)');
      }, 14000)
    );
  } else if (qIndex === 2) {
    // Question 3
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 375', 120, '⚡ Student 375 solved Question 3! Leading with 3 solves.');
      }, 8500)
    );
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Anuj Chavan', 120, '⚡ Anuj Chavan solved Question 3 (+120 pts)');
      }, 13500)
    );
  } else {
    // Question 4
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 774', 125, '⚡ Student 774 completed Question 4 (+125 pts)');
      }, 7500)
    );
    scheduledSolveTimeouts.push(
      setTimeout(() => {
        applyCompetitorSolve('Student 375', 110, '⚡ Student 375 completed Question 4 (+110 pts)');
      }, 12500)
    );
  }
}

function clearScheduledSolveEvents() {
  scheduledSolveTimeouts.forEach((t) => clearTimeout(t));
  scheduledSolveTimeouts = [];
}

/**
 * Apply solve event for a room competitor and update live leaderboard in real-time
 */
function applyCompetitorSolve(name: string, addedScore: number, tickerMsg: string) {
  const p = roomPlayers.find((player) => player.name.includes(name));
  if (!p) return;

  p.solvedCount += 1;
  p.score += addedScore;
  p.lastSolveTime = Date.now();
  p.hasJustSolved = true;

  sortAndRankPlayers();
  renderLiveLeaderboard();
  setLiveTicker(tickerMsg);

  setTimeout(() => {
    p.hasJustSolved = false;
  }, 1300);
}

/**
 * Sort room players by Score DESC, then Solved Count DESC
 */
function sortAndRankPlayers() {
  roomPlayers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    return (a.lastSolveTime || 0) - (b.lastSolveTime || 0);
  });

  roomPlayers.forEach((p, idx) => {
    p.rank = idx + 1;
  });
}

/**
 * Render the Live Leaderboard Cards
 */
function renderLiveLeaderboard() {
  if (!liveLbPlayersList) return;

  liveLbPlayersList.innerHTML = roomPlayers
    .map((p) => {
      const rankClass = p.rank === 1 ? 'rank-1' : (p.rank === 2 ? 'rank-2' : (p.rank === 3 ? 'rank-3' : ''));
      const isYouClass = p.isYou ? 'is-you' : '';
      const flashClass = p.hasJustSolved ? 'has-just-solved' : '';
      const rankIcon = p.rank === 1 ? '🥇' : (p.rank === 2 ? '🥈' : (p.rank === 3 ? '🥉' : `${p.rank}`));

      return `
        <div class="live-lb-player-card ${rankClass} ${isYouClass} ${flashClass}" data-player-id="${p.id}">
          <div class="live-lb-rank-num">${rankIcon}</div>
          <img src="${p.avatar || '/images/home_avatar.png'}" class="live-lb-avatar" alt="${escapeHtml(p.name)}" />
          <div class="live-lb-player-info">
            <h5 class="live-lb-name">${escapeHtml(p.name)}</h5>
            <span class="live-lb-solved-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>${p.solvedCount} Solved</span>
            </span>
          </div>
          <div class="live-lb-player-score">${p.score} <span style="font-size:11px;font-weight:600;color:#94a3b8;">pts</span></div>
        </div>
      `;
    })
    .join('');
}

function setLiveTicker(text: string) {
  if (liveLbTickerText) {
    liveLbTickerText.textContent = text;
  }
}

/**
 * Start Question Timer and Overall Match Timer
 */
function startArenaTimers() {
  stopArenaTimers();
  updateTimerDisplays();

  // Question Timer
  questionTimerInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerDisplays();

    if (secondsRemaining <= 0) {
      handleQuestionTimeExpired();
    }
  }, 1000);

  // Overall Match Timer
  mainTimerInterval = setInterval(() => {
    mainSecondsRemaining--;
    updateTimerDisplays();

    if (mainSecondsRemaining <= 0) {
      stopArenaTimers();
      setLiveTicker('⏱️ Main battle timer expired! Calculating final standings...');
      setTimeout(() => endBattleMatch(), 900);
    }
  }, 1000);
}

function stopArenaTimers() {
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }
  if (mainTimerInterval) {
    clearInterval(mainTimerInterval);
    mainTimerInterval = null;
  }
}

function updateTimerDisplays() {
  // Question Timer
  if (arenaTimerDisplay) {
    const mm = String(Math.floor(Math.max(0, secondsRemaining) / 60)).padStart(2, '0');
    const ss = String(Math.max(0, secondsRemaining) % 60).padStart(2, '0');
    arenaTimerDisplay.textContent = `${mm}:${ss}`;
  }

  // Main Match Timer
  if (arenaMainTimerDisplay) {
    const mmm = String(Math.floor(Math.max(0, mainSecondsRemaining) / 60)).padStart(2, '0');
    const mss = String(Math.max(0, mainSecondsRemaining) % 60).padStart(2, '0');
    arenaMainTimerDisplay.textContent = `${mmm}:${mss}`;
  }
}

/**
 * When Question Timer runs out -> transition to next question
 */
function handleQuestionTimeExpired() {
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }

  setLiveTicker(`⏰ Time over for Question ${currentQuestionIndex + 1}! Moving to next...`);

  setTimeout(() => {
    advanceToNextQuestion();
  }, 1100);
}

/**
 * Evaluate User's Submitted Solution for current question
 */
function evaluateCurrentAnswer() {
  if (isQuestionSubmitting) return;
  isQuestionSubmitting = true;

  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }

  const targetPrimes = currentQuestion.targetPrimeIds || [];
  const isCorrect =
    selectedAnswers.length > 0 &&
    targetPrimes.length > 0 &&
    selectedAnswers.length === targetPrimes.length &&
    targetPrimes.every((p) => selectedAnswers.some((ans) => String(ans) === String(p)));

  const you = roomPlayers.find((p) => p.isYou);
  if (you) {
    if (isCorrect) {
      const addedPoints = 120 + Math.max(0, secondsRemaining * 2);
      you.score += addedPoints;
      you.solvedCount += 1;
      you.lastSolveTime = Date.now();
      you.hasJustSolved = true;
      playerScore = you.score;
      if (arenaPlayerScore) arenaPlayerScore.textContent = String(playerScore);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setLiveTicker(`🎉 You solved Question ${currentQuestionIndex + 1} correctly! (+${addedPoints} pts)`);
    } else {
      setLiveTicker(`Question ${currentQuestionIndex + 1} completed! Target answers: ${targetPrimes.join(', ')}`);
    }

    sortAndRankPlayers();
    renderLiveLeaderboard();

    setTimeout(() => {
      you.hasJustSolved = false;
    }, 1300);
  }

  // Brief pause to show result, then advance to next question
  setTimeout(() => {
    advanceToNextQuestion();
  }, 1200);
}

/**
 * Advance to next question or end battle match
 */
function advanceToNextQuestion() {
  const nextIdx = currentQuestionIndex + 1;

  if (nextIdx < battleQuestions.length && mainSecondsRemaining > 0) {
    loadQuestion(nextIdx);
    startArenaTimers();
  } else {
    // All questions played or main timer expired -> end battle match!
    endBattleMatch();
  }
}

/**
 * Match Concludes for all participants
 */
function endBattleMatch() {
  stopArenaTimers();
  clearScheduledSolveEvents();
  soundManager.fadeOutGameBgm();

  sortAndRankPlayers();
  renderLiveLeaderboard();

  const totalPlayers = roomPlayers.length;
  const you = roomPlayers.find((p) => p.isYou);
  const userRank = you ? you.rank : totalPlayers;
  const userScore = you ? you.score : playerScore;
  const userSolved = you ? you.solvedCount : 0;

  // Determine if this was an Admin Battle
  const isAdminBattle = Boolean(
    currentRoom?.isAdminBattle ||
    currentRoom?.hostName?.toLowerCase() === 'admin' ||
    currentRoom?.hostId === 'usr-admin' ||
    currentRoom?.hostId === 'usr_admin' ||
    currentRoom?.title?.toLowerCase().includes('admin')
  );

  // Check if User Rank is within the last 3 ranks
  const isWithinLast3 = totalPlayers >= 3 ? (userRank >= totalPlayers - 2) : (userRank > 1);

  // Update Result Modal Stats
  if (resultStatScore) resultStatScore.textContent = `+${userScore}`;
  if (resultStatTime) {
    const elapsed = Math.max(12, ((currentRoom?.timePerQuestion || 20) * battleQuestions.length) - mainSecondsRemaining);
    resultStatTime.textContent = `${elapsed}s`;
  }

  const titleEl = document.getElementById('result-status-title');
  const subEl = document.getElementById('result-status-sub');

  if (userRank === 1) {
    if (titleEl) titleEl.textContent = '🏆 1ST PLACE - VICTORY!';
    if (subEl) subEl.textContent = `Flawless execution! You solved ${userSolved} of ${battleQuestions.length} questions and took #1!`;
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 }
    });
  } else if (isAdminBattle && isWithinLast3) {
    if (titleEl) titleEl.textContent = 'MATCH COMPLETE - DEVIL TROPHY UNLOCKED';
    if (subEl) subEl.textContent = `You finished #${userRank} in the Admin Battle Arena! Fought with honor and claimed First Looser!`;
  } else {
    if (titleEl) titleEl.textContent = `MATCH COMPLETE - #${userRank} PLACE`;
    if (subEl) subEl.textContent = `Great battle! You scored ${userScore} points across ${battleQuestions.length} questions.`;
  }

  // Render Final Live Battle Specific Leaderboard inside Result Dialog
  renderFinalBattleLeaderboard(isAdminBattle, totalPlayers);

  // Record Attendance to backend
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

  // -----------------------------------------------------------
  // AWARD BADGES:
  // 1. ALL participants get First Battle Participation badge
  //    (/badges/kuizu_first_battle_participant_red_badge_big_swords.glb)
  // 2. Last 3 participants in Admin Battles get First Looser badge
  //    (/badges/kuizu_first_looser_devil_fixed.glb)
  // -----------------------------------------------------------
  const isFirstBattle = !isBadgeUnlocked('first-battle-participation');
  unlockBadge('first-battle-participation');

  const isEligibleForFirstLooser = isAdminBattle && isWithinLast3;

  if (btnView3dBattleBadgeText) {
    btnView3dBattleBadgeText.textContent = isEligibleForFirstLooser ? 'Inspect 3D Devil Badge' : 'Inspect 3D Battle Badge';
  }

  if (isEligibleForFirstLooser) {
    const isFirstTimeLooser = !isBadgeUnlocked('first-looser');
    unlockBadge('first-looser');

    if (isFirstTimeLooser) {
      // Pop up the 3D Devil First Looser claim badge modal!
      showFirstLooserBadgeModal(() => {
        openModal(modalBattleResult);
      });
      return;
    }
  } else if (isFirstBattle) {
    // Pop up First Battle Participant 3D modal
    showFirstBattleParticipantBadgeModal(() => {
      openModal(modalBattleResult);
    });
    return;
  }

  // Already claimed or unlocked previously; directly show battle results modal
  openModal(modalBattleResult);
}

/**
 * Render the final live battle specific leaderboard table
 */
function renderFinalBattleLeaderboard(isAdminBattle: boolean, totalPlayers: number) {
  if (finalBattleRoomTag) {
    finalBattleRoomTag.textContent = isAdminBattle ? 'Admin Battle Arena (Official)' : 'Live Arena Duel';
  }

  if (!finalBattleLeaderboardTable) return;

  finalBattleLeaderboardTable.innerHTML = roomPlayers
    .map((p) => {
      const isWinner = p.rank === 1;
      const isLast3 = totalPlayers >= 3 ? p.rank >= totalPlayers - 2 : p.rank > 1;
      const isLooserBadgeHolder = isAdminBattle && isLast3;

      let badgePillHtml = '';
      if (isWinner) {
        badgePillHtml = `<span class="final-lb-badge-pill winner-pill">👑 Champion</span>`;
      } else if (isLooserBadgeHolder) {
        badgePillHtml = `<span class="final-lb-badge-pill looser-pill">😈 First Looser</span>`;
      } else {
        badgePillHtml = `<span class="final-lb-badge-pill participant-pill">⚔️ Participant</span>`;
      }

      const rankBadge = p.rank === 1 ? '🥇' : (p.rank === 2 ? '🥈' : (p.rank === 3 ? '🥉' : `#${p.rank}`));
      const rowClass = p.isYou ? 'is-you' : (isLooserBadgeHolder ? 'is-looser' : '');

      return `
        <div class="final-lb-row ${rowClass} rank-${p.rank}">
          <div class="final-lb-rank">${rankBadge}</div>
          <img src="${p.avatar || '/images/home_avatar.png'}" class="final-lb-avatar" alt="${escapeHtml(p.name)}" />
          <div class="final-lb-info">
            <h5 class="final-lb-name">${escapeHtml(p.name)}</h5>
            <div class="final-lb-sub">
              <span>${p.solvedCount}/${battleQuestions.length} Solved</span>
              <span>•</span>
              <span>Accuracy: ${Math.round((p.solvedCount / battleQuestions.length) * 100)}%</span>
            </div>
          </div>
          <div class="final-lb-score">${p.score} pts</div>
          ${badgePillHtml}
        </div>
      `;
    })
    .join('');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Hook 3D badge inspection button in results modal
btnView3dBattleBadge?.addEventListener('click', () => {
  const you = roomPlayers.find((p) => p.isYou);
  const userRank = you ? you.rank : roomPlayers.length;
  const isAdminBattle = Boolean(currentRoom?.isAdminBattle || currentRoom?.hostName?.toLowerCase() === 'admin');
  const isWithinLast3 = roomPlayers.length >= 3 ? userRank >= roomPlayers.length - 2 : userRank > 1;

  if (isAdminBattle && isWithinLast3) {
    showFirstLooserBadgeModal();
  } else {
    showFirstBattleParticipantBadgeModal();
  }
});

// Expose modal openers on window for debugging & testing
(window as any).showFirstBattleParticipantBadgeModal = showFirstBattleParticipantBadgeModal;
(window as any).showFirstLooserBadgeModal = showFirstLooserBadgeModal;

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
