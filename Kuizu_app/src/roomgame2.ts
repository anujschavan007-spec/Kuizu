import * as THREE from 'three';
import { supabase } from './services/supabaseApiBridge';
import { getClerk, syncClerkUserToLocalStorage } from './services/clerkService';

// ==========================================================================
// 1. DATA MODELS & TYPES
// ==========================================================================

export interface RoomRacer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  checkpoint: number;
  score: number;
  finished: boolean;
  finishTimeMs: number | null;
  finishTimeStr: string | null;
  joinedAt: number;
}

export interface CheckpointQuestion {
  zPos: number;
  title: string;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  sunColor: number;
  checkpoints: CheckpointQuestion[];
}

export interface RemoteCarInstance {
  mesh: THREE.Group;
  nameTag: THREE.Sprite;
  targetX: number;
  targetZ: number;
  targetHeading: number;
  currentSpeed: number;
  lastUpdate: number;
  color: number;
  wheels: THREE.Group[];
}

export interface OpenWorldBotInstance {
  id: string;
  name: string;
  mesh: THREE.Group;
  nameTag: THREE.Sprite;
  wheels: THREE.Group[];
  curveT: number;
  laneOffset: number;
  speed: number;
  baseSpeed: number;
  checkpoint: number;
  score: number;
  finished: boolean;
  finishTimeMs: number | null;
  finishTimeStr: string | null;
  quizPauseTimer: number;
  nitroTimer: number;
  nitroFlames: THREE.Mesh[];
  x: number;
  z: number;
  heading: number;
}

const FRIEND_CAR_COLORS = [
  0xf43f5e, // Crimson Rose
  0xa855f7, // Cyber Violet
  0x10b981, // Emerald Green
  0xf59e0b, // Amber Gold
  0xec4899, // Neon Pink
  0x3b82f6, // Royal Blue
  0x14b8a6, // Bright Teal
  0xeab308  // Electric Gold
];

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    id: 1,
    name: 'Sunset Valley (CS Foundations & Architecture)',
    skyColor: 0x9fd3ff,
    fogColor: 0x9fd3ff,
    ambientColor: 0xffffff,
    sunColor: 0xfff0d0,
    checkpoints: [
      {
        zPos: 0.17,
        title: 'Checkpoint 1: Stack vs Heap Memory',
        topic: 'Computer Architecture',
        question: 'Which region of process memory is automatically allocated and deallocated by function call frames and CPU stack pointers?',
        options: [
          'Heap memory',
          'Stack memory',
          'Persistent SSD block storage',
          'Shared Virtual GPU cache'
        ],
        correct: 1,
        explanation: 'Stack memory automatically handles local variables as execution enters and exits function call frames.'
      },
      {
        zPos: 0.34,
        title: 'Checkpoint 2: Big-O Binary Search',
        topic: 'Algorithm Analysis',
        question: 'What is the average time complexity of searching a sorted array of size N using Binary Search?',
        options: ['O(N)', 'O(N log N)', 'O(log N)', 'O(1)'],
        correct: 2,
        explanation: 'Binary search halves the remaining search interval on each comparison step, achieving O(log N).'
      },
      {
        zPos: 0.51,
        title: 'Checkpoint 3: Hash Map Collisions',
        topic: 'Data Structures',
        question: 'What happens when two different keys compute to the exact same bucket index in a Hash Table?',
        options: [
          'The entire hash table is cleared',
          'A Hash Collision occurs and is resolved via chaining or open addressing',
          'The operating system triggers a fatal bus error',
          'The second key silently overwrites the first without warning'
        ],
        correct: 1,
        explanation: 'Hash collisions are natural and resolved through techniques such as Separate Chaining or Linear Probing.'
      },
      {
        zPos: 0.68,
        title: 'Checkpoint 4: Concurrency & Race Conditions',
        topic: 'Operating Systems',
        question: 'What constitutes a "Race Condition" in multi-threaded application software?',
        options: [
          'Two processes calculating primes simultaneously',
          'Uncontrolled behavior occurring when multiple threads modify shared memory without synchronization',
          'A game loop exceeding 144 frames per second',
          'Network packet queue saturation on a network bridge'
        ],
        correct: 1,
        explanation: 'A race condition arises when non-atomic concurrent reads and writes corrupt shared state without mutex locks.'
      },
      {
        zPos: 0.85,
        title: 'Checkpoint 5: Database B-Tree Indexing',
        topic: 'Database Systems',
        question: 'Why are B-Trees preferred over Binary Search Trees for disk-based database indexes?',
        options: [
          'High node branching factor minimizes expensive disk block I/O operations',
          'They only store ASCII strings, never integers',
          'They eliminate the requirement for SQL syntax',
          'They compress relational tables into tar archives'
        ],
        correct: 0,
        explanation: 'B-Tree nodes hold many keys per node matching OS disk block page sizes, significantly reducing disk seek times.'
      }
    ]
  },
  2: {
    id: 2,
    name: 'Cyber Dunes (DSA & Graphs)',
    skyColor: 0x0f172a,
    fogColor: 0x0f172a,
    ambientColor: 0x38bdf8,
    sunColor: 0x22d3ee,
    checkpoints: [
      {
        zPos: 0.17,
        title: 'Checkpoint 1: Graph Traversal',
        topic: 'Graphs',
        question: 'Which graph traversal algorithm guarantees discovering the shortest path on an unweighted graph?',
        options: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Quicksort', 'Prim Algorithm'],
        correct: 1,
        explanation: 'BFS explores neighbor vertices level by level, ensuring minimum edge hops on unweighted graphs.'
      },
      {
        zPos: 0.34,
        title: 'Checkpoint 2: Dynamic Programming',
        topic: 'Optimization',
        question: 'What two fundamental characteristics signify that a problem can be solved with Dynamic Programming?',
        options: [
          'Static types and high throughput',
          'Optimal Substructure and Overlapping Subproblems',
          'Multithreading and tail recursion',
          'Linear memory and binary tree inputs'
        ],
        correct: 1,
        explanation: 'Dynamic programming memoizes solutions when subproblems overlap and overall optima derive from subproblem optima.'
      },
      {
        zPos: 0.51,
        title: 'Checkpoint 3: Trie Prefix Trees',
        topic: 'Advanced Trees',
        question: 'Which real-world application heavily relies on a Trie data structure?',
        options: [
          'Search engine autocomplete and spell-check dictionaries',
          'Sound wave audio equalization',
          'SHA-256 hash generation',
          'CSS Grid matrix calculations'
        ],
        correct: 0,
        explanation: 'Tries allow O(L) prefix lookups where L is string length, making autocomplete queries instantaneous.'
      },
      {
        zPos: 0.68,
        title: 'Checkpoint 4: Dijkstra Algorithm',
        topic: 'Shortest Path',
        question: 'Under what condition does Dijkstra shortest path algorithm produce incorrect results?',
        options: [
          'On graphs with negative edge weights',
          'On directed acyclic graphs',
          'On graphs containing cycles',
          'On graphs with more than 1,000 vertices'
        ],
        correct: 0,
        explanation: 'Dijkstra greedily assumes path costs monotonically increase; negative edge weights require Bellman-Ford.'
      },
      {
        zPos: 0.85,
        title: 'Checkpoint 5: LRU Cache Internals',
        topic: 'System Architecture',
        question: 'Which two data structures are combined to achieve O(1) get and put in an LRU Cache?',
        options: [
          'Hash Map and Doubly Linked List',
          'Binary Heap and Array',
          'Stack and Circular Buffer',
          'Red-Black Tree and Queue'
        ],
        correct: 0,
        explanation: 'The Hash Map supplies O(1) key indexing, while the Doubly Linked List provides O(1) element relocation and eviction.'
      }
    ]
  },
  3: {
    id: 3,
    name: 'Alpine Meadows (Distributed Systems)',
    skyColor: 0x061e38,
    fogColor: 0x0b2d52,
    ambientColor: 0x38bdf8,
    sunColor: 0x93c5fd,
    checkpoints: [
      {
        zPos: 0.17,
        title: 'Checkpoint 1: CAP Theorem',
        topic: 'Distributed Systems',
        question: 'According to the CAP Theorem, when a network partition (P) occurs, what choice must a distributed system make?',
        options: [
          'Trade off between Consistency (C) and Availability (A)',
          'Double the network packet throughput',
          'Convert SQL database to NoSQL',
          'Reboot all cluster worker nodes'
        ],
        correct: 0,
        explanation: 'When nodes cannot communicate across a partition, the system must either reject writes (Consistency) or serve stale data (Availability).'
      },
      {
        zPos: 0.34,
        title: 'Checkpoint 2: Consistent Hashing',
        topic: 'Scalability',
        question: 'Why is Consistent Hashing utilized across distributed cache clusters (e.g. Memcached, DynamoDB)?',
        options: [
          'It minimizes cache miss remapping when adding or removing server nodes (only K/N keys rehashed)',
          'It completely eliminates RAM usage',
          'It converts REST endpoints into WebSockets',
          'It guarantees two-phase commit transactions'
        ],
        correct: 0,
        explanation: 'Consistent hashing rings ensure scaling up or down nodes only invalidates a minimal fraction of keys.'
      },
      {
        zPos: 0.51,
        title: 'Checkpoint 3: Raft Consensus',
        topic: 'Distributed Consensus',
        question: 'What is the primary role of the elected Leader in the Raft consensus protocol?',
        options: [
          'Accept client write entries and coordinate quorum replication to followers',
          'Compress JSON payloads',
          'Terminate slow TCP connections',
          'Generate TLS certificates'
        ],
        correct: 0,
        explanation: 'In Raft, the elected leader manages log replication and determines when entries are committed by quorum.'
      },
      {
        zPos: 0.68,
        title: 'Checkpoint 4: Rate Limiting Algorithms',
        topic: 'API Infrastructure',
        question: 'Which rate limiting algorithm accommodates sudden bursts of traffic while enforcing a smooth long-term rate?',
        options: ['Token Bucket', 'Fixed Window Counter', 'Binary Heap', 'Round Robin'],
        correct: 0,
        explanation: 'The Token Bucket algorithm accumulates tokens up to capacity, allowing instant bursts as long as tokens are available.'
      },
      {
        zPos: 0.85,
        title: 'Checkpoint 5: Idempotency Keys',
        topic: 'Distributed Transactions',
        question: 'Why do payment APIs (like Stripe) require an Idempotency-Key header on mutation requests?',
        options: [
          'To prevent duplicate billing charges if a network timeout triggers automatic client retry',
          'To increase database compression ratio',
          'To validate user credit card numbers',
          'To format currency denominations'
        ],
        correct: 0,
        explanation: 'An idempotency key guarantees that retrying an identical request executes once and returns the cached result safely.'
      }
    ]
  }
};

// ==========================================================================
// 2. WEB AUDIO SYNTHESIZER
// ==========================================================================

class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || this.engineOsc) return;

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  public updatePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc) return;
    const baseFreq = 42 + speedRatio * 160;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
  }

  public playBoosterSound() {
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
  }
}

// ==========================================================================
// 3. MAIN OPEN-HIGHWAY MULTIPLAYER GAME APP
// ==========================================================================

class RoomGame2App {
  // Current user info
  private userId: string = '';
  private userName: string = 'Racer';
  private userAvatar: string = '/images/home_avatar.png';

  // Room State
  private roomCode: string = '';
  private roomTitle: string = 'Kuizu Open Highway Cup';
  private selectedLevelId: number = 1;
  private isHost: boolean = false;
  private racersMap: Map<string, RoomRacer> = new Map();
  private channel: any = null;

  // Race Runtime State
  private raceActive: boolean = false;
  private raceStartTime: number = 0;
  private currentCheckpointIdx: number = 0;
  private xpScore: number = 0;
  private userFinished: boolean = false;
  private userFinishTimeMs: number = 0;
  private isPausedForQuiz: boolean = false;
  private quizTries: number = 0;

  // Three.js State
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private playerCar!: THREE.Group;
  private playerWheels: THREE.Group[] = [];
  private myNameTag: THREE.Sprite | null = null;
  private audio = new AudioEngine();
  private remoteCars: Map<string, RemoteCarInstance> = new Map();
  private lastPosBroadcastTime: number = 0;
  private isSinglePlayer: boolean = false;
  private aiBots: OpenWorldBotInstance[] = [];
  private botConfigs = [
    { id: 'bot_apex', name: 'ApexBot [BOT]', color: 0x10b981 },
    { id: 'bot_vortex', name: 'VortexAI [BOT]', color: 0xa855f7 },
    { id: 'bot_zenith', name: 'ZenithBot [BOT]', color: 0xf59e0b }
  ];

  // Track Curve & Waypoints
  private trackCurve!: THREE.CatmullRomCurve3;
  private trackSamples: THREE.Vector3[] = [];
  private trackTangents: THREE.Vector3[] = [];
  private trackLength: number = 0;
  private halfRoadWidth: number = 7.5;
  private numSamples: number = 700;
  private checkpointGates: Array<{ x: number; z: number; beamMat: THREE.MeshBasicMaterial; done: boolean; title: string }> = [];

  // Driving Physics & Off-road state
  private carX: number = 0;
  private carZ: number = 0;
  private carHeading: number = 0; // In radians
  private carVelocity: number = 0;
  private nearestSampleIdx: number = 0;
  private isOffRoad: boolean = false;

  // Speed and Nitro Booster
  private hasBoosterActive: boolean = false;
  private boosterEndTime: number = 0;
  private nitroFlames: THREE.Mesh[] = [];

  // Camera tracking
  private camFollowPos = new THREE.Vector3();

  // Control Inputs
  private keys: Record<string, boolean> = {
    up: false,
    dn: false,
    left: false,
    right: false
  };

  constructor() {
    this.initUser();
    this.bindDomEvents();
    this.checkUrlForRoom();
  }

  // ========================================================================
  // CLERK AUTH & GUEST MODE
  // ========================================================================

  private async initUser() {
    let authenticated = false;
    let name = '';
    let email = '';
    let avatar = '/images/home_avatar.png';

    // 1. Check live Clerk authentication
    try {
      const clerk = await getClerk();
      if (clerk && clerk.user) {
        authenticated = true;
        syncClerkUserToLocalStorage(clerk.user);
        const emailAddr = clerk.user.primaryEmailAddress?.emailAddress || '';
        const emailPrefix = emailAddr ? emailAddr.split('@')[0] : '';
        name = clerk.user.firstName || clerk.user.fullName || (emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : '');
        email = emailAddr;
        if (clerk.user.imageUrl) {
          avatar = clerk.user.imageUrl;
        }
      }
    } catch (e) {
      console.warn('Clerk user check:', e);
    }

    // 2. Fallback to cached localStorage user profile
    if (!authenticated) {
      const cachedName = localStorage.getItem('kuizu_user_name');
      const cachedEmail = localStorage.getItem('kuizu_user_email');
      const isLoggedIn = localStorage.getItem('kuizu_logged_in') === 'true';

      if (isLoggedIn && (cachedName || cachedEmail)) {
        authenticated = true;
        if (cachedName) {
          name = cachedName;
        } else if (cachedEmail) {
          const emailPrefix = cachedEmail.split('@')[0];
          name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
        email = cachedEmail || '';
        const cachedAvatar = localStorage.getItem('kuizu_user_avatar') || localStorage.getItem('kuizu_google_avatar');
        if (cachedAvatar) avatar = cachedAvatar;
      }
    }

    // 3. If authenticated, apply user name
    if (authenticated && name) {
      this.userName = name;
      this.userId = email ? `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}` : `usr_${Math.random().toString(36).substring(2, 9)}`;
      this.userAvatar = avatar;
      this.updateUserHud();
      return;
    }

    // 4. If unauthenticated, check if guest name was already set in session
    const sessionGuestName = sessionStorage.getItem('kuizu_guest_racer_name');
    if (sessionGuestName) {
      this.userName = sessionGuestName;
      this.userId = `guest_${Math.random().toString(36).substring(2, 8)}`;
      this.userAvatar = '/images/home_avatar.png';
      this.updateUserHud();
    } else {
      // Show Auth / Guest popup modal
      this.showAuthGateModal();
    }
  }

  private showAuthGateModal() {
    const modal = document.getElementById('modal-auth-gate');
    const signinBtn = document.getElementById('btn-auth-signin') as HTMLAnchorElement | null;
    const guestInput = document.getElementById('input-guest-name') as HTMLInputElement | null;
    const submitGuestBtn = document.getElementById('btn-submit-guest');

    if (modal) modal.style.display = 'flex';

    if (signinBtn) {
      signinBtn.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }

    if (guestInput && !guestInput.value) {
      guestInput.value = `Racer_${Math.floor(100 + Math.random() * 900)}`;
    }

    const applyGuest = () => {
      const chosenName = guestInput?.value.trim() || `GuestRacer_${Math.floor(100 + Math.random() * 900)}`;
      this.userName = chosenName;
      this.userId = `guest_${Math.random().toString(36).substring(2, 8)}`;
      this.userAvatar = '/images/home_avatar.png';
      sessionStorage.setItem('kuizu_guest_racer_name', chosenName);

      if (modal) modal.style.display = 'none';
      this.updateUserHud();

      // Update 3D name tag if already created
      if (this.myNameTag && this.playerCar) {
        this.playerCar.remove(this.myNameTag);
        this.myNameTag = this.createNameTagSprite(this.userName, this.isHost);
        this.playerCar.add(this.myNameTag);
      }
    };

    submitGuestBtn?.addEventListener('click', applyGuest);
    guestInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyGuest();
    });
  }

  private updateUserHud() {
    const nameEl = document.getElementById('rg-user-name');
    const avatarEl = document.getElementById('rg-user-avatar') as HTMLImageElement | null;
    const hudRacerEl = document.getElementById('hud-racer-name');

    if (nameEl) nameEl.textContent = this.userName;
    if (avatarEl && this.userAvatar) avatarEl.src = this.userAvatar;
    if (hudRacerEl) hudRacerEl.textContent = this.userName;
  }

  // ========================================================================
  // DOM BINDINGS & SCREEN ROUTING
  // ========================================================================

  private bindDomEvents() {
    // Create Room
    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      const titleInput = document.getElementById('input-create-title') as HTMLInputElement | null;
      const levelSelect = document.getElementById('select-create-level') as HTMLSelectElement | null;
      const title = titleInput?.value.trim() || 'Kuizu Open Highway Cup';
      const levelId = parseInt(levelSelect?.value || '1', 10);
      this.createRoom(title, levelId);
    });

    // Join Room
    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const codeInput = document.getElementById('input-join-code') as HTMLInputElement | null;
      const code = codeInput?.value.trim().toUpperCase();
      if (!code) {
        this.showJoinError('Please enter a 6-digit room code.');
        return;
      }
      this.joinRoom(code);
    });

    // Single Player Play vs Bots
    document.getElementById('btn-play-single')?.addEventListener('click', () => {
      const selectLevel = document.getElementById('select-single-level') as HTMLSelectElement | null;
      const levelId = parseInt(selectLevel?.value || '1', 10);
      this.startSinglePlayer(levelId);
    });

    // Add Bot in Lobby
    document.getElementById('btn-add-bot')?.addEventListener('click', () => {
      this.addAIBotToLobby();
    });

    // Copy Code / Share
    document.getElementById('btn-copy-code')?.addEventListener('click', () => this.copyRoomLink());
    document.getElementById('btn-copy-room-link')?.addEventListener('click', () => this.copyRoomLink());

    // Exit / Leave Room
    document.getElementById('btn-exit-room')?.addEventListener('click', () => this.leaveRoom());

    // Host Start Game
    document.getElementById('btn-start-race')?.addEventListener('click', () => {
      if (this.isHost) {
        this.broadcastStartGame();
      }
    });

    // Continue button after answering quiz
    document.getElementById('btn-continue-drive')?.addEventListener('click', () => this.resumeDriving());

    // Return to Lobby from Leaderboard
    document.getElementById('btn-lb-lobby')?.addEventListener('click', () => {
      window.location.href = `/roomgame2?room=${this.roomCode}`;
    });

    // Host Restart
    document.getElementById('btn-lb-restart')?.addEventListener('click', () => {
      window.location.href = `/roomgame2?room=${this.roomCode}`;
    });

    // Keyboard Inputs (Desktop)
    window.addEventListener('keydown', (e) => {
      const k = this.mapKeyboardKey(e.key);
      if (k) {
        this.keys[k] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = this.mapKeyboardKey(e.key);
      if (k) this.keys[k] = false;
    });

    // Mobile Touch Controls
    const bindTouchBtn = (id: string, action: 'up' | 'dn' | 'left' | 'right') => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        this.keys[action] = true;
        btn.setPointerCapture(e.pointerId);
      });
      ['pointerup', 'pointercancel'].forEach(ev => {
        btn.addEventListener(ev, () => {
          this.keys[action] = false;
        });
      });
    };

    bindTouchBtn('touch-left', 'left');
    bindTouchBtn('touch-right', 'right');
    bindTouchBtn('touch-up', 'up');
    bindTouchBtn('touch-down', 'dn');
  }

  private mapKeyboardKey(k: string): 'up' | 'dn' | 'left' | 'right' | null {
    k = k.toLowerCase();
    if (k === 'arrowup' || k === 'w') return 'up';
    if (k === 'arrowdown' || k === 's') return 'dn';
    if (k === 'arrowleft' || k === 'a') return 'left';
    if (k === 'arrowright' || k === 'd') return 'right';
    return null;
  }

  private showJoinError(msg: string) {
    const errEl = document.getElementById('join-error-msg');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  private copyRoomLink() {
    const url = `${window.location.origin}/roomgame2?room=${this.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('btn-copy-code');
      if (btn) {
        const oldText = btn.textContent;
        btn.textContent = 'Link Copied!';
        setTimeout(() => { btn.textContent = oldText; }, 2000);
      }
    });
  }

  // ========================================================================
  // SUPABASE REALTIME ROOM & PRESENCE
  // ========================================================================

  private async createRoom(title: string, levelId: number) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `KZ-${randomDigits}`;

    this.roomCode = code;
    this.roomTitle = title;
    this.selectedLevelId = levelId;
    this.isHost = true;

    window.history.replaceState({}, '', `/roomgame2?room=${code}`);

    await this.connectRealtimeChannel();
    this.renderLobbyView();
  }

  private async joinRoom(code: string) {
    this.roomCode = code.toUpperCase();
    this.isHost = false;

    window.history.replaceState({}, '', `/roomgame2?room=${this.roomCode}`);

    await this.connectRealtimeChannel();
    this.renderLobbyView();
  }

  private async connectRealtimeChannel() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    const channelName = `highway2-room-${this.roomCode}`;
    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.userId }
      }
    });

    // 1. Presence Sync
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this.syncPresences(state);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: any) => {
        if (newPresences) {
          for (const p of newPresences) {
            this.racersMap.set(p.id, p);
          }
          this.renderRacersGrid();
          this.renderLiveLeaderboard();
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
        if (leftPresences) {
          for (const p of leftPresences) {
            this.racersMap.delete(p.id);
            const remote = this.remoteCars.get(p.id);
            if (remote && this.scene) {
              this.scene.remove(remote.mesh);
              this.remoteCars.delete(p.id);
            }
          }
          this.renderRacersGrid();
          this.renderLiveLeaderboard();
        }
      })
      // 2. Broadcast Events
      .on('broadcast', { event: 'START_RACE' }, (payload: any) => {
        this.handleStartRaceBroadcast(payload.payload);
      })
      .on('broadcast', { event: 'PLAYER_POS' }, (payload: any) => {
        this.handleRemotePlayerPos(payload.payload);
      })
      .on('broadcast', { event: 'CHECKPOINT_UPDATE' }, (payload: any) => {
        this.handleCheckpointBroadcast(payload.payload);
      })
      .on('broadcast', { event: 'FINISH_RACE' }, (payload: any) => {
        this.handleFinishBroadcast(payload.payload);
      });

    // Subscribe and track self
    await this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        const initialSelf: RoomRacer = {
          id: this.userId,
          name: this.userName,
          avatar: this.userAvatar,
          isHost: this.isHost,
          checkpoint: 0,
          score: 0,
          finished: false,
          finishTimeMs: null,
          finishTimeStr: null,
          joinedAt: Date.now()
        };
        this.racersMap.set(this.userId, initialSelf);
        await this.channel.track(initialSelf);
        this.renderRacersGrid();
      }
    });
  }

  private syncPresences(state: Record<string, any[]>) {
    for (const key of Object.keys(state)) {
      const presences = state[key];
      if (presences && presences.length > 0) {
        const p = presences[presences.length - 1];
        const existing = this.racersMap.get(p.id);
        if (existing && existing.finished) {
          p.finished = true;
          p.finishTimeMs = existing.finishTimeMs;
          p.finishTimeStr = existing.finishTimeStr;
        }
        this.racersMap.set(p.id, p);
      }
    }
    this.renderRacersGrid();
    this.renderLiveLeaderboard();
  }

  private checkUrlForRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const clean = roomParam.trim().toUpperCase();
      this.joinRoom(clean);
    }
  }

  private renderLobbyView() {
    const initialActions = document.getElementById('lobby-initial-actions');
    const activeLobby = document.getElementById('lobby-active-room');
    const headerInfo = document.getElementById('header-room-info');
    const headerCode = document.getElementById('header-room-code');
    const activeCode = document.getElementById('active-room-code');
    const activeTitle = document.getElementById('active-room-title');
    const activeTrack = document.getElementById('active-room-track');
    const hostControls = document.getElementById('host-controls');
    const guestWaiting = document.getElementById('guest-waiting');
    const exitBtn = document.getElementById('btn-exit-room');
    const roomBadge = document.getElementById('room-status-badge');

    if (initialActions) initialActions.style.display = 'none';
    if (activeLobby) activeLobby.style.display = 'block';
    if (headerInfo) headerInfo.style.display = 'flex';
    if (exitBtn) exitBtn.style.display = 'inline-flex';
    if (headerCode) headerCode.textContent = this.roomCode;
    if (activeCode) activeCode.textContent = this.roomCode;
    if (activeTitle) activeTitle.textContent = this.roomTitle;
    if (roomBadge) roomBadge.textContent = 'Room Lobby';

    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
    if (activeTrack) activeTrack.textContent = `Course: ${levelCfg.name}`;

    if (this.isHost) {
      if (hostControls) hostControls.style.display = 'block';
      if (guestWaiting) guestWaiting.style.display = 'none';
    } else {
      if (hostControls) hostControls.style.display = 'none';
      if (guestWaiting) guestWaiting.style.display = 'block';
    }

    this.renderRacersGrid();
  }

  private renderRacersGrid() {
    const racersGrid = document.getElementById('racers-grid');
    const racersCount = document.getElementById('racers-count');
    if (!racersGrid) return;

    const racers = Array.from(this.racersMap.values());
    if (racersCount) racersCount.textContent = `${racers.length}`;

    racersGrid.innerHTML = racers.map(racer => {
      const isSelf = racer.id === this.userId;
      return `
        <div class="rg-racer-card">
          <img src="${racer.avatar || '/images/home_avatar.png'}" alt="${racer.name}" class="rg-racer-avatar ${isSelf ? 'is-self' : ''}" />
          <div>
            <div class="rg-racer-name">${racer.name} ${isSelf ? '(You)' : ''}</div>
            <div class="rg-racer-tag ${racer.isHost ? 'is-host' : ''}">
              ${racer.isHost ? 'Room Host' : 'Challenger'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  private leaveRoom() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
    window.location.href = '/roomgame2';
  }

  // ========================================================================
  // RACE START (SYNCHRONIZED LAUNCH)
  // ========================================================================

  private broadcastStartGame() {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'START_RACE',
      payload: {
        levelId: this.selectedLevelId,
        title: this.roomTitle
      }
    });
    this.launchCountdownSequence();
  }

  private handleStartRaceBroadcast(payload: any) {
    if (payload.levelId) {
      this.selectedLevelId = payload.levelId;
    }
    if (payload.title) {
      this.roomTitle = payload.title;
    }
    this.launchCountdownSequence();
  }

  private launchCountdownSequence() {
    const lobbyScreen = document.getElementById('screen-lobby');
    const gameScreen = document.getElementById('screen-game');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countNumber = document.getElementById('countdown-number');
    const roomBadge = document.getElementById('room-status-badge');

    if (lobbyScreen) lobbyScreen.style.display = 'none';
    if (gameScreen) gameScreen.style.display = 'block';
    if (countdownOverlay) countdownOverlay.style.display = 'flex';
    if (roomBadge) roomBadge.textContent = 'Race In Progress';

    // Initialize 3D open-highway scene
    this.initThreeScene();

    let step = 3;
    if (countNumber) countNumber.textContent = `${step}`;

    const timer = setInterval(() => {
      step--;
      if (step > 0) {
        if (countNumber) countNumber.textContent = `${step}`;
      } else if (step === 0) {
        if (countNumber) countNumber.textContent = 'GO!';
      } else {
        clearInterval(timer);
        if (countdownOverlay) countdownOverlay.style.display = 'none';
        this.raceActive = true;
        this.raceStartTime = performance.now();
        this.audio.startEngine();
      }
    }, 900);
  }

  // ========================================================================
  // THREE.JS 3D OPEN HIGHWAY & SCENERY INITIALIZATION
  // ========================================================================

  private initThreeScene() {
    if (this.renderer) return;

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(levelCfg.skyColor);
    this.scene.fog = new THREE.Fog(levelCfg.fogColor, 80, 520);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1500);

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight(levelCfg.ambientColor, 0x5f8a52, 0.95);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(levelCfg.sunColor, 0.9);
    sun.position.set(160, 240, 90);
    this.scene.add(sun);

    // 5. Track Geometry (Open-world CatmullRom Curve)
    const points2D = [
      [0, 0],
      [0, -120],
      [40, -260],
      [140, -360],
      [280, -380],
      [400, -320],
      [450, -200],
      [420, -80],
      [480, 40],
      [600, 100],
      [720, 60],
      [800, -40]
    ];
    const curvePoints = points2D.map(p => new THREE.Vector3(p[0], 0, p[1]));
    this.trackCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
    this.trackLength = this.trackCurve.getLength();

    this.trackSamples = [];
    this.trackTangents = [];
    for (let i = 0; i <= this.numSamples; i++) {
      this.trackSamples.push(this.trackCurve.getPointAt(i / this.numSamples));
      this.trackTangents.push(this.trackCurve.getTangentAt(i / this.numSamples));
    }

    // Build ribbon road mesh
    const roadPositions: number[] = [];
    const roadUvs: number[] = [];
    const roadIndices: number[] = [];

    for (let i = 0; i <= this.numSamples; i++) {
      const p = this.trackSamples[i];
      const t = this.trackTangents[i];
      const nx = -t.z;
      const nz = t.x;
      const vv = (i / this.numSamples) * (this.trackLength / 18);

      roadPositions.push(p.x + nx * this.halfRoadWidth, 0.03, p.z + nz * this.halfRoadWidth);
      roadPositions.push(p.x - nx * this.halfRoadWidth, 0.03, p.z - nz * this.halfRoadWidth);
      roadUvs.push(0, vv, 1, vv);

      if (i < this.numSamples) {
        const a = i * 2;
        roadIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    // Road Texture Canvas (Asphalt + Dashed yellow center + White edge curbs)
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 256;
    texCanvas.height = 256;
    const g = texCanvas.getContext('2d')!;
    g.fillStyle = '#2d3340';
    g.fillRect(0, 0, 256, 256);
    // Noise grain
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = `rgba(${i % 2 ? 255 : 0}, ${i % 2 ? 255 : 0}, ${i % 2 ? 255 : 0}, 0.04)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // White lane boundaries
    g.fillStyle = '#f8fafc';
    g.fillRect(10, 0, 6, 256);
    g.fillRect(240, 0, 6, 256);
    // Yellow dashed center line
    g.fillStyle = '#ffc83d';
    g.fillRect(125, 20, 6, 110);

    const roadTex = new THREE.CanvasTexture(texCanvas);
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.anisotropy = 8;

    const roadMesh = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92, side: THREE.DoubleSide })
    );
    this.scene.add(roadMesh);

    // 6. Massive Ground Terrain Plane (Open World Physics!)
    const groundGeo = new THREE.PlaneGeometry(4000, 4000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d7039, roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(400, -0.02, -150);
    this.scene.add(ground);

    // 7. Scenery: Rolling Hills around perimeter
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const height = 130 + Math.random() * 160;
      const hillMesh = new THREE.Mesh(
        new THREE.ConeGeometry(170 + Math.random() * 90, height, 5),
        new THREE.MeshStandardMaterial({ color: 0x5a7590, roughness: 1.0 })
      );
      hillMesh.position.set(400 + Math.cos(angle) * 1150, height / 2 - 4, -150 + Math.sin(angle) * 950);
      this.scene.add(hillMesh);
    }

    // 8. Scenery: 320 Trees (Pine Cone + Trunk)
    const treeTop = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 7, 7), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 320);
    const treeTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }), 320);
    const m4 = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const cl = new THREE.Color();
    let treeCount = 0;

    while (treeCount < 320) {
      const tx = -260 + Math.random() * 1350;
      const tz = -650 + Math.random() * 850;
      const distToRoad = this.calcDistToRoad(tx, tz).dist;
      if (distToRoad < 20) continue; // Keep trees clear from direct road lanes

      const s = 0.8 + Math.random() * 1.1;
      m4.compose(new THREE.Vector3(tx, 3.8 * s, tz), quat, new THREE.Vector3(s, s, s));
      treeTop.setMatrixAt(treeCount, m4);

      m4.compose(new THREE.Vector3(tx, 1.1 * s, tz), quat, new THREE.Vector3(s, s, s));
      treeTrunk.setMatrixAt(treeCount, m4);

      treeTop.setColorAt(treeCount, cl.setHSL(0.3 + Math.random() * 0.06, 0.5, 0.18 + Math.random() * 0.12));
      treeCount++;
    }
    this.scene.add(treeTop, treeTrunk);

    // 9. Build Checkpoint Gates along the CatmullRom Curve
    this.buildCheckpointGates(levelCfg);

    // 10. Build Player Car
    this.buildPlayerCar();

    // 11. Initial Position and Heading
    const startPt = this.trackSamples[0];
    const startTg = this.trackTangents[0];
    this.carX = startPt.x;
    this.carZ = startPt.z;
    this.carHeading = Math.atan2(startTg.x, startTg.z);
    this.carVelocity = 0;
    this.playerCar.position.set(this.carX, 0, this.carZ);
    this.playerCar.rotation.y = this.carHeading;

    // Window Resize listener
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Spawn AI Bots if present
    this.spawnAIBots();

    // Start Game Loop
    this.animate();
  }

  private calcDistToRoad(x: number, z: number, fromIdx: number = -1): { idx: number; dist: number } {
    let bestDistSq = 1e12;
    let bestIdx = fromIdx;
    let lo = 0;
    let hi = this.numSamples;

    if (fromIdx >= 0) {
      lo = Math.max(0, fromIdx - 28);
      hi = Math.min(this.numSamples, fromIdx + 28);
    }

    for (let k = lo; k <= hi; k++) {
      const pt = this.trackSamples[k];
      const dx = pt.x - x;
      const dz = pt.z - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = k;
      }
    }

    // If local search hopped off or diverged, search full curve
    if (fromIdx >= 0 && bestDistSq > 1200) {
      return this.calcDistToRoad(x, z, -1);
    }

    return { idx: bestIdx, dist: Math.sqrt(bestDistSq) };
  }

  // ========================================================================
  // CHECKPOINT GATES & LABELS
  // ========================================================================

  private buildCheckpointGates(levelCfg: LevelConfig) {
    this.checkpointGates = [];
    const fractions = [0.17, 0.34, 0.51, 0.68, 0.85];

    fractions.forEach((f, idx) => {
      const pt = this.trackCurve.getPointAt(f);
      const tg = this.trackCurve.getTangentAt(f);
      const group = new THREE.Group();
      group.position.copy(pt);
      group.rotation.y = Math.atan2(tg.x, tg.z);

      // Gate pillars
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 });
      [-1, 1].forEach(side => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 10.5, 16), pillarMat);
        pillar.position.set(side * (this.halfRoadWidth + 2.0), 5.2, 0);
        group.add(pillar);
      });

      // Banner Crossbar
      const labelTex = this.createGateLabelTexture(`CHECK-IN ${idx + 1}/5`);
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(2 * (this.halfRoadWidth + 2.0), 3.6),
        new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide })
      );
      banner.position.y = 10.5;
      group.add(banner);

      // Glowing Vertical Beacon Cylinder
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffc83d,
        transparent: true,
        opacity: idx === 0 ? 0.35 : 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(this.halfRoadWidth * 0.95, this.halfRoadWidth * 0.95, 48, 28, 1, true),
        beamMat
      );
      beam.position.y = 24;
      group.add(beam);

      this.scene.add(group);

      const qInfo = levelCfg.checkpoints[idx] || { title: `Checkpoint ${idx + 1}` };
      this.checkpointGates.push({
        x: pt.x,
        z: pt.z,
        beamMat,
        done: false,
        title: qInfo.title
      });
    });
  }

  private createGateLabelTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffc83d';
    ctx.fillRect(0, 114, 512, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 58);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  private updateGateBeams() {
    this.checkpointGates.forEach((gate, idx) => {
      if (gate.done) {
        gate.beamMat.color.set(0x10b981);
        gate.beamMat.opacity = 0.12;
      } else if (idx === this.currentCheckpointIdx) {
        gate.beamMat.color.set(0xffc83d);
        gate.beamMat.opacity = 0.38;
      } else {
        gate.beamMat.color.set(0x38bdf8);
        gate.beamMat.opacity = 0.12;
      }
    });
  }

  // ========================================================================
  // PLAYER CAR & 3D NAME TAG
  // ========================================================================

  private buildPlayerCar() {
    this.playerCar = new THREE.Group();
    this.playerWheels = [];

    // Chassis (Aerodynamic Coupe)
    const bodyGeo = new THREE.BoxGeometry(2.1, 0.7, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.28, metalness: 0.65 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.72;
    this.playerCar.add(body);

    // Roof & Cabin
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.62, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x16243a, roughness: 0.1, metalness: 0.85 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.34, -0.22);
    this.playerCar.add(cabin);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 18);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.85 });
    const wheelPositions: [number, number, number][] = [
      [1.08, 0.44, 1.35],
      [-1.08, 0.44, 1.35],
      [1.08, 0.44, -1.35],
      [-1.08, 0.44, -1.35]
    ];

    wheelPositions.forEach(p => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(p[0], p[1], p[2]);

      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.rotation.z = Math.PI / 2;
      wheelGroup.add(wMesh);

      // Hubcap
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.06), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      wheelGroup.add(hub);

      this.playerCar.add(wheelGroup);
      this.playerWheels.push(wheelGroup);
    });

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.7, 0.82, -2.2);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(0.7, 0.82, -2.2);
    this.playerCar.add(hl1, hl2);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.4, 0.18, 0.1);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(tlGeo, tlMat);
    tl1.position.set(-0.7, 0.85, 2.2);
    const tl2 = new THREE.Mesh(tlGeo, tlMat);
    tl2.position.set(0.7, 0.85, 2.2);
    this.playerCar.add(tl1, tl2);

    // Ground Shadow Circle
    const sh = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.05;
    this.playerCar.add(sh);

    // Floating 3D Name Tag Sprite above Player's Car
    this.myNameTag = this.createNameTagSprite(this.userName, this.isHost);
    this.playerCar.add(this.myNameTag);

    // Dual Nitro Exhaust Flames (Hidden until booster active)
    const flameGeo = new THREE.ConeGeometry(0.22, 1.3, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 });
    const flame1 = new THREE.Mesh(flameGeo, flameMat);
    flame1.rotation.x = Math.PI / 2;
    flame1.position.set(-0.65, 0.55, 2.7);
    const flame2 = new THREE.Mesh(flameGeo, flameMat);
    flame2.rotation.x = Math.PI / 2;
    flame2.position.set(0.65, 0.55, 2.7);
    flame1.visible = false;
    flame2.visible = false;
    this.playerCar.add(flame1, flame2);
    this.nitroFlames = [flame1, flame2];

    this.scene.add(this.playerCar);
  }

  private createNameTagSprite(name: string, isHost: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = isHost ? '#f59e0b' : '#22d3ee';
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(6, 6, 244, 60, 16);
      } else {
        ctx.rect(6, 6, 244, 60);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cleanName = name.length > 13 ? name.slice(0, 12) + '...' : name;
      ctx.fillText(cleanName, 128, 36);
    }

    const texture = new THREE.CanvasTexture(canvas);

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.9, 0);
    sprite.scale.set(4.2, 1.18, 1.0);
    return sprite;
  }

  // ========================================================================
  // REMOTE MULTIPLAYER CAR INSTANCES
  // ========================================================================

  private getOrCreateRemoteCar(userId: string, name: string): RemoteCarInstance {
    let remote = this.remoteCars.get(userId);
    if (!remote) {
      const group = new THREE.Group();
      const colorIdx = Math.abs(this.hashString(userId)) % FRIEND_CAR_COLORS.length;
      const carColor = FRIEND_CAR_COLORS[colorIdx];

      // Chassis
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.7, 4.4),
        new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3, metalness: 0.6 })
      );
      body.position.y = 0.72;
      group.add(body);

      // Cabin
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.62, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x16243a, roughness: 0.1, metalness: 0.85 })
      );
      cabin.position.set(0, 1.34, -0.22);
      group.add(cabin);

      // Wheels
      const wheels: THREE.Group[] = [];
      const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.85 });
      const wheelPositions: [number, number, number][] = [
        [1.08, 0.44, 1.35],
        [-1.08, 0.44, 1.35],
        [1.08, 0.44, -1.35],
        [-1.08, 0.44, -1.35]
      ];
      wheelPositions.forEach(p => {
        const wg = new THREE.Group();
        wg.position.set(p[0], p[1], p[2]);
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        wg.add(w);
        group.add(wg);
        wheels.push(wg);
      });

      // Name tag
      const racer = this.racersMap.get(userId);
      const isHost = racer?.isHost ?? false;
      const nameTag = this.createNameTagSprite(name, isHost);
      group.add(nameTag);

      this.scene.add(group);

      remote = {
        mesh: group,
        nameTag,
        targetX: 0,
        targetZ: 0,
        targetHeading: 0,
        currentSpeed: 0,
        lastUpdate: performance.now(),
        color: carColor,
        wheels
      };
      this.remoteCars.set(userId, remote);
    }
    return remote;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private handleRemotePlayerPos(payload: any) {
    if (payload.userId === this.userId) return;

    const remote = this.getOrCreateRemoteCar(payload.userId, payload.name);
    remote.targetX = payload.x;
    remote.targetZ = payload.z;
    remote.targetHeading = payload.heading;
    remote.currentSpeed = payload.speed;
    remote.lastUpdate = performance.now();
  }

  private broadcastPosition() {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'PLAYER_POS',
      payload: {
        userId: this.userId,
        name: this.userName,
        x: this.carX,
        z: this.carZ,
        heading: this.carHeading,
        speed: this.carVelocity,
        checkpoint: this.currentCheckpointIdx,
        score: this.xpScore,
        offRoad: this.isOffRoad
      }
    });
  }

  // ========================================================================
  // NITRO SPEED BOOSTER
  // ========================================================================

  private activateBooster(durationSeconds: number = 7.0) {
    this.hasBoosterActive = true;
    this.boosterEndTime = performance.now() + durationSeconds * 1000;
    this.audio.playBoosterSound();

    const banner = document.getElementById('booster-banner');
    if (banner) banner.style.display = 'flex';
    this.nitroFlames.forEach(f => (f.visible = true));
  }

  private deactivateBooster() {
    this.hasBoosterActive = false;
    this.boosterEndTime = 0;

    const banner = document.getElementById('booster-banner');
    if (banner) banner.style.display = 'none';
    this.nitroFlames.forEach(f => (f.visible = false));
  }

  // ========================================================================
  // SINGLE PLAYER & AI BOTS LOGIC
  // ========================================================================

  private startSinglePlayer(levelId: number) {
    this.isSinglePlayer = true;
    this.isHost = true;
    this.selectedLevelId = levelId;
    this.roomTitle = 'Open Highway Single Player Arena';
    this.roomCode = `SP-${Math.floor(1000 + Math.random() * 9000)}`;

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    // Add local user
    this.racersMap.clear();
    this.racersMap.set(this.userId, {
      id: this.userId,
      name: this.userName,
      avatar: this.userAvatar,
      isHost: true,
      checkpoint: 0,
      score: 0,
      finished: false,
      finishTimeMs: null,
      finishTimeStr: null,
      joinedAt: Date.now()
    });

    // Add 3 default bots
    this.botConfigs.forEach(b => {
      this.racersMap.set(b.id, {
        id: b.id,
        name: b.name,
        avatar: '/images/home_avatar.png',
        isHost: false,
        checkpoint: 0,
        score: 0,
        finished: false,
        finishTimeMs: null,
        finishTimeStr: null,
        joinedAt: Date.now()
      });
    });

    this.launchCountdownSequence();
  }

  private addAIBotToLobby() {
    const existingCount = Array.from(this.racersMap.values()).filter(r => r.id.startsWith('bot_')).length;
    if (existingCount >= 6) return;

    const baseBot = this.botConfigs[existingCount % this.botConfigs.length];
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 100)}`;
    const botName = existingCount < this.botConfigs.length ? baseBot.name : `OpenRacer_${existingCount + 1} [BOT]`;

    this.racersMap.set(botId, {
      id: botId,
      name: botName,
      avatar: '/images/home_avatar.png',
      isHost: false,
      checkpoint: 0,
      score: 0,
      finished: false,
      finishTimeMs: null,
      finishTimeStr: null,
      joinedAt: Date.now()
    });

    this.renderRacersGrid();
  }

  private spawnAIBots() {
    this.aiBots = [];
    const botRacers = Array.from(this.racersMap.values()).filter(r => r.id.startsWith('bot_'));
    const offsets = [-3.8, 0, 3.8, -2.0, 2.0];

    botRacers.forEach((b, idx) => {
      const group = new THREE.Group();
      const botColor = this.botConfigs[idx % this.botConfigs.length]?.color || 0x10b981;

      // Chassis
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.7, 4.4),
        new THREE.MeshStandardMaterial({ color: botColor, roughness: 0.3, metalness: 0.6 })
      );
      body.position.y = 0.72;
      group.add(body);

      // Cabin
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.62, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x16243a, roughness: 0.1, metalness: 0.85 })
      );
      cabin.position.set(0, 1.34, -0.22);
      group.add(cabin);

      // Wheels
      const wheels: THREE.Group[] = [];
      const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.85 });
      const wheelPositions: [number, number, number][] = [
        [1.08, 0.44, 1.35],
        [-1.08, 0.44, 1.35],
        [1.08, 0.44, -1.35],
        [-1.08, 0.44, -1.35]
      ];
      wheelPositions.forEach(p => {
        const wg = new THREE.Group();
        wg.position.set(p[0], p[1], p[2]);
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        wg.add(w);
        group.add(wg);
        wheels.push(wg);
      });

      // Name Tag
      const nameTag = this.createNameTagSprite(b.name, false);
      group.add(nameTag);

      // Nitro Flames
      const flameGeo = new THREE.ConeGeometry(0.22, 1.3, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 });
      const f1 = new THREE.Mesh(flameGeo, flameMat);
      f1.rotation.x = Math.PI / 2;
      f1.position.set(-0.65, 0.55, 2.7);
      const f2 = new THREE.Mesh(flameGeo, flameMat);
      f2.rotation.x = Math.PI / 2;
      f2.position.set(0.65, 0.55, 2.7);
      f1.visible = false;
      f2.visible = false;
      group.add(f1, f2);

      const laneOffset = offsets[idx % offsets.length];
      const startT = Math.max(0.002, 0.012 - idx * 0.003);
      const pt = this.trackCurve.getPointAt(startT);
      const tg = this.trackCurve.getTangentAt(startT);
      const nx = -tg.z;
      const nz = tg.x;
      const heading = Math.atan2(tg.x, tg.z);

      const posX = pt.x + nx * laneOffset;
      const posZ = pt.z + nz * laneOffset;

      group.position.set(posX, 0, posZ);
      group.rotation.y = heading;
      this.scene.add(group);

      this.aiBots.push({
        id: b.id,
        name: b.name,
        mesh: group,
        nameTag,
        wheels,
        curveT: startT,
        laneOffset,
        speed: 36 + Math.random() * 6,
        baseSpeed: 36 + Math.random() * 6,
        checkpoint: 0,
        score: 0,
        finished: false,
        finishTimeMs: null,
        finishTimeStr: null,
        quizPauseTimer: 0,
        nitroTimer: 0,
        nitroFlames: [f1, f2],
        x: posX,
        z: posZ,
        heading
      });
    });
  }

  private updateAIBots(now: number, dt: number) {
    const fractions = [0.17, 0.34, 0.51, 0.68, 0.85];

    for (const bot of this.aiBots) {
      if (this.camera) {
        bot.nameTag.quaternion.copy(this.camera.quaternion);
      }

      if (bot.finished) {
        continue;
      }

      // Checkpoint quiz pause simulation
      if (bot.quizPauseTimer > 0) {
        bot.quizPauseTimer -= dt;
        if (bot.quizPauseTimer <= 0) {
          // Solved quiz!
          bot.checkpoint++;
          bot.score += 20;

          // 60% chance of nitro booster
          if (Math.random() > 0.4) {
            bot.nitroTimer = 4.0;
            bot.nitroFlames.forEach(f => (f.visible = true));
          }

          const racerEntry = this.racersMap.get(bot.id);
          if (racerEntry) {
            racerEntry.checkpoint = bot.checkpoint;
            racerEntry.score = bot.score;
          }

          // Check if finished final checkpoint
          if (bot.checkpoint >= 5) {
            bot.finished = true;
            const elapsedMs = now - this.raceStartTime;
            bot.finishTimeMs = elapsedMs;
            const minutes = Math.floor(elapsedMs / 60000);
            const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
            bot.finishTimeStr = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;

            if (racerEntry) {
              racerEntry.finished = true;
              racerEntry.finishTimeMs = bot.finishTimeMs;
              racerEntry.finishTimeStr = bot.finishTimeStr;
            }
            this.renderLiveLeaderboard();
          }
          this.renderMiniOpponentsTracker();
        }
        continue;
      }

      // Nitro speed handling
      if (bot.nitroTimer > 0) {
        bot.nitroTimer -= dt;
        bot.speed = bot.baseSpeed * 1.55;
        if (bot.nitroTimer <= 0) {
          bot.speed = bot.baseSpeed;
          bot.nitroFlames.forEach(f => (f.visible = false));
        }
      }

      // Progress along curve
      bot.curveT += (bot.speed / this.trackLength) * dt;

      if (bot.curveT >= 1.0) {
        bot.curveT = 0.999;
        if (!bot.finished) {
          bot.finished = true;
          const elapsedMs = now - this.raceStartTime;
          bot.finishTimeMs = elapsedMs;
          const minutes = Math.floor(elapsedMs / 60000);
          const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
          bot.finishTimeStr = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
          const racerEntry = this.racersMap.get(bot.id);
          if (racerEntry) {
            racerEntry.finished = true;
            racerEntry.finishTimeMs = bot.finishTimeMs;
            racerEntry.finishTimeStr = bot.finishTimeStr;
          }
          this.renderLiveLeaderboard();
        }
      }

      const clampedT = Math.min(0.999, Math.max(0.001, bot.curveT));
      const pt = this.trackCurve.getPointAt(clampedT);
      const tg = this.trackCurve.getTangentAt(clampedT);
      const nx = -tg.z;
      const nz = tg.x;

      bot.x = pt.x + nx * bot.laneOffset;
      bot.z = pt.z + nz * bot.laneOffset;
      bot.heading = Math.atan2(tg.x, tg.z);

      bot.mesh.position.set(bot.x, 0, bot.z);
      bot.mesh.rotation.y = bot.heading;

      // Wheel rotation
      bot.wheels.forEach(w => {
        w.children[0].rotation.x += (bot.speed * dt) / 0.44;
      });

      // Checkpoint trigger
      if (bot.checkpoint < fractions.length && bot.curveT >= fractions[bot.checkpoint]) {
        bot.quizPauseTimer = 2.2 + Math.random() * 2.5; // Simulate bot reading & answering
      }
    }
  }

  // ========================================================================
  // ANIMATION LOOP & OPEN-WORLD TERRAIN CAR PHYSICS
  // ========================================================================

  private lastTime: number = performance.now();

  private animate = () => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.raceActive && !this.isPausedForQuiz && !this.userFinished) {
      // 1. Calculate distance from track center to determine if driving off-road
      const roadInfo = this.calcDistToRoad(this.carX, this.carZ, this.nearestSampleIdx);
      this.nearestSampleIdx = roadInfo.idx;
      this.isOffRoad = roadInfo.dist > (this.halfRoadWidth + 0.5);

      // Surface indicator
      const surfaceTag = document.getElementById('hud-surface-tag');
      if (surfaceTag) {
        if (this.isOffRoad) {
          surfaceTag.className = 'rg-surface-tag rg-surface-offroad';
          surfaceTag.textContent = 'OFF-ROAD TERRAIN';
        } else {
          surfaceTag.className = 'rg-surface-tag rg-surface-road';
          surfaceTag.textContent = 'ON-ROAD';
        }
      }

      // 2. Handle Nitro Booster Countdown
      if (this.hasBoosterActive) {
        const remaining = Math.max(0, (this.boosterEndTime - now) / 1000);
        const timeEl = document.getElementById('booster-time-text');
        if (timeEl) timeEl.textContent = `${remaining.toFixed(1)}s`;

        // Flickering flame scale
        this.nitroFlames.forEach(f => {
          const s = 0.8 + Math.random() * 0.45;
          f.scale.set(s, s, 1);
        });

        if (remaining <= 0) {
          this.deactivateBooster();
        }
      }

      // 3. Acceleration & Speed Physics (Allow driving outside of the road!)
      let maxForwardSpeed = this.isOffRoad ? 26 : 48; // km/h equivalent base
      if (this.hasBoosterActive) {
        maxForwardSpeed = this.isOffRoad ? 50 : 82; // Nitro boost speed!
      }

      const accelRate = this.hasBoosterActive ? 32 : 24;
      const brakeRate = 40;

      if (this.keys.up) {
        this.carVelocity += (this.carVelocity < 0 ? brakeRate : accelRate) * dt;
      } else if (this.keys.dn) {
        this.carVelocity -= (this.carVelocity > 0 ? brakeRate : 16) * dt;
      } else {
        // Natural friction coasting
        this.carVelocity -= Math.sign(this.carVelocity) * Math.min(Math.abs(this.carVelocity), 6 * dt);
      }

      // Aerodynamic and terrain drag
      this.carVelocity -= this.carVelocity * (this.isOffRoad ? 1.4 : 0.12) * dt;
      this.carVelocity = Math.max(-12, Math.min(maxForwardSpeed, this.carVelocity));

      // 4. Steering (Heading angle)
      const steerInput = (this.keys.left ? 1 : 0) - (this.keys.right ? 1 : 0);
      const steerFactor = 1.9 * dt * Math.min(1, Math.abs(this.carVelocity) / 9) * (this.carVelocity < 0 ? -1 : 1);
      this.carHeading += steerInput * steerFactor;

      // 5. Update Car Coordinates (Velocity vector)
      this.carX += Math.sin(this.carHeading) * this.carVelocity * dt;
      this.carZ += Math.cos(this.carHeading) * this.carVelocity * dt;

      // 6. Checkpoint Proximity Detection (Open-World Cylinder Range)
      const currentGate = this.checkpointGates[this.currentCheckpointIdx];
      if (currentGate) {
        const distToGate = Math.hypot(this.carX - currentGate.x, this.carZ - currentGate.z);

        const bannerDist = document.getElementById('next-cp-dist');
        const bannerName = document.getElementById('next-cp-name');
        if (bannerDist) bannerDist.textContent = `${Math.round(distToGate)}`;
        if (bannerName) bannerName.textContent = currentGate.title;

        // Reaching within 12 meters of gate opens checkpoint quiz
        if (distToGate < 12) {
          this.triggerCheckpointQuiz(this.currentCheckpointIdx);
        }
      }

      // 7. Audio pitch update
      this.audio.updatePitch(Math.abs(this.carVelocity) / maxForwardSpeed);

      // 8. Broadcast telemetry to peers (~22 times/sec)
      if (this.channel && now - this.lastPosBroadcastTime > 45) {
        this.lastPosBroadcastTime = now;
        this.broadcastPosition();
      }
    }

    // Update Player Car Mesh
    if (this.playerCar) {
      this.playerCar.position.set(this.carX, 0, this.carZ);
      this.playerCar.rotation.y = this.carHeading;

      // Rotate wheels
      this.playerWheels.forEach(w => {
        w.children[0].rotation.x += (this.carVelocity * dt) / 0.44;
      });

      // Keep Name Tag facing Camera
      if (this.myNameTag && this.camera) {
        this.myNameTag.quaternion.copy(this.camera.quaternion);
      }
    }

    // Third-person Camera Follow
    if (this.camera) {
      const fx = Math.sin(this.carHeading);
      const fz = Math.cos(this.carHeading);
      const targetCamPos = new THREE.Vector3(
        this.carX - fx * 9.5,
        4.6,
        this.carZ - fz * 9.5
      );

      if (this.camFollowPos.lengthSq() === 0) {
        this.camFollowPos.copy(targetCamPos);
      }
      this.camFollowPos.lerp(targetCamPos, 1 - Math.exp(-6 * dt));
      this.camera.position.copy(this.camFollowPos);
      this.camera.lookAt(this.carX + fx * 8, 1.4, this.carZ + fz * 8);

      // Dynamic FOV warp when boosting
      const targetFov = this.hasBoosterActive ? 74 : (62 + Math.min(12, Math.abs(this.carVelocity) * 0.25));
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
    }

    // Update Navigation Compass Arrow (Points directly to active checkpoint!)
    const activeGate = this.checkpointGates[Math.min(this.currentCheckpointIdx, this.checkpointGates.length - 1)];
    if (activeGate) {
      const targetAngle = Math.atan2(activeGate.x - this.carX, activeGate.z - this.carZ);
      let relativeAngle = targetAngle - this.carHeading;
      relativeAngle = Math.atan2(Math.sin(relativeAngle), Math.cos(relativeAngle));

      const navArrow = document.getElementById('nav-arrow');
      if (navArrow) {
        navArrow.style.transform = `rotate(${-relativeAngle}rad)`;
      }
    }

    // Update HUD Speedometer
    const speedKmh = Math.round(Math.abs(this.carVelocity) * 3.6);
    const speedEl = document.getElementById('hud-speed');
    const rpmFill = document.getElementById('hud-rpm-fill');
    if (speedEl) speedEl.textContent = `${speedKmh}`;
    if (rpmFill) {
      const percent = Math.min(100, Math.round((speedKmh / 90) * 100));
      rpmFill.style.width = `${percent}%`;
    }

    // Interpolate Remote Cars
    for (const [id, remote] of this.remoteCars.entries()) {
      remote.mesh.position.x += (remote.targetX - remote.mesh.position.x) * 0.22;
      remote.mesh.position.z += (remote.targetZ - remote.mesh.position.z) * 0.22;

      // Heading rotation
      const diffHeading = remote.targetHeading - remote.mesh.rotation.y;
      remote.mesh.rotation.y += Math.atan2(Math.sin(diffHeading), Math.cos(diffHeading)) * 0.25;

      // Wheels rotation
      remote.wheels.forEach(w => {
        w.children[0].rotation.x += (remote.currentSpeed * dt) / 0.44;
      });

      // Keep 3D name tag facing camera
      if (this.camera) {
        remote.nameTag.quaternion.copy(this.camera.quaternion);
      }

      // Cleanup inactive remote players (> 20s)
      if (now - remote.lastUpdate > 20000) {
        this.scene.remove(remote.mesh);
        this.remoteCars.delete(id);
      }
    }

    // Update AI Bots
    this.updateAIBots(now, dt);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  // ========================================================================
  // CHECKPOINT QUIZ & BOOSTER ACTIVATION
  // ========================================================================

  private triggerCheckpointQuiz(cpIndex: number) {
    this.isPausedForQuiz = true;
    this.carVelocity = 0;
    this.quizTries = 0;

    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
    const qData = levelCfg.checkpoints[cpIndex % levelCfg.checkpoints.length];

    const modal = document.getElementById('quiz-modal');
    const badge = document.getElementById('quiz-badge');
    const questionText = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const feedback = document.getElementById('quiz-feedback');
    const continueBtn = document.getElementById('btn-continue-drive');

    if (badge) badge.textContent = `Checkpoint ${cpIndex + 1} of 5`;
    if (questionText) questionText.textContent = qData.question;
    if (feedback) {
      feedback.style.display = 'none';
      feedback.textContent = '';
      feedback.className = 'rg-quiz-feedback';
    }
    if (continueBtn) continueBtn.style.display = 'none';

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      qData.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'rg-quiz-opt-btn';
        btn.textContent = optText;
        btn.addEventListener('click', () => {
          this.handleQuizAnswer(optIdx, qData, btn);
        });
        optionsContainer.appendChild(btn);
      });
    }

    if (modal) modal.style.display = 'flex';
  }

  private handleQuizAnswer(selectedIndex: number, qData: CheckpointQuestion, clickedBtn: HTMLButtonElement) {
    const feedback = document.getElementById('quiz-feedback');
    const continueBtn = document.getElementById('btn-continue-drive');
    const allButtons = document.querySelectorAll('.rg-quiz-opt-btn') as NodeListOf<HTMLButtonElement>;

    if (selectedIndex === qData.correct) {
      // Correct!
      clickedBtn.classList.add('is-correct');
      allButtons.forEach(b => (b.disabled = true));

      const points = this.quizTries === 0 ? 20 : 10;
      this.xpScore += points;

      if (feedback) {
        feedback.className = 'rg-quiz-feedback is-correct';
        feedback.innerHTML = `
          <strong>Correct! +${points} XP</strong>. ${qData.explanation}
          ${this.quizTries === 0 ? '<div style="margin-top: 4px; color: #22d3ee; font-weight: 800;">7s Nitro Speed Booster Activated!</div>' : ''}
        `;
        feedback.style.display = 'block';
      }

      // Activate nitro booster if correct on first try
      if (this.quizTries === 0) {
        this.activateBooster(7.0);
      } else {
        this.deactivateBooster();
      }

      // Mark checkpoint gate cleared
      if (this.checkpointGates[this.currentCheckpointIdx]) {
        this.checkpointGates[this.currentCheckpointIdx].done = true;
      }
      this.currentCheckpointIdx++;
      this.updateGateBeams();
      this.updateHudStats();

      // Broadcast checkpoint progress
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'CHECKPOINT_UPDATE',
          payload: {
            userId: this.userId,
            checkpoint: this.currentCheckpointIdx,
            score: this.xpScore
          }
        });
      }

      if (continueBtn) {
        continueBtn.style.display = 'inline-flex';
        continueBtn.innerHTML = `
          <span>${this.currentCheckpointIdx >= 5 ? 'Finish Race & View Podium' : 'Continue Driving'}</span>
          <svg class="rg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;
      }
    } else {
      // Wrong answer
      clickedBtn.classList.add('is-wrong');
      clickedBtn.disabled = true;
      this.quizTries++;
      this.deactivateBooster();

      if (feedback) {
        feedback.className = 'rg-quiz-feedback is-wrong';
        feedback.textContent = 'Incorrect answer. Try another option to proceed!';
        feedback.style.display = 'block';
      }
    }
  }

  private resumeDriving() {
    const modal = document.getElementById('quiz-modal');
    if (modal) modal.style.display = 'none';

    if (this.currentCheckpointIdx >= 5) {
      this.finishUserRace();
    } else {
      this.isPausedForQuiz = false;
      this.carVelocity = 15; // Smooth launch back onto terrain
    }
  }

  private handleCheckpointBroadcast(payload: any) {
    const racer = this.racersMap.get(payload.userId);
    if (racer) {
      racer.checkpoint = payload.checkpoint;
      racer.score = payload.score;
    }
    this.renderMiniOpponentsTracker();
    this.renderLiveLeaderboard();
  }

  private updateHudStats() {
    const xpEl = document.getElementById('hud-xp-score');
    const cpEl = document.getElementById('hud-cp-count');
    if (xpEl) xpEl.textContent = `${this.xpScore} XP`;
    if (cpEl) cpEl.textContent = `${Math.min(this.currentCheckpointIdx, 5)}`;
    this.renderMiniOpponentsTracker();
  }

  private renderMiniOpponentsTracker() {
    const container = document.getElementById('opponents-bars-container');
    if (!container) return;

    const racers = Array.from(this.racersMap.values());
    container.innerHTML = racers.map(r => {
      const isYou = r.id === this.userId;
      let statusText = '';
      if (r.finished) {
        statusText = 'Finished';
      } else if (isYou) {
        statusText = `CP ${this.currentCheckpointIdx}/5`;
      } else {
        statusText = `CP ${r.checkpoint}/5`;
      }
      return `
        <div class="rg-opp-chip ${r.finished ? 'is-finished' : ''}">
          <span class="rg-opp-chip-name">${r.name} ${isYou ? '(You)' : ''}</span>
          <span class="rg-opp-chip-status">${statusText}</span>
        </div>
      `;
    }).join('');
  }

  // ========================================================================
  // RACE FINISH & LIVE LEADERBOARD (PENDING / FINISHED VIEW)
  // ========================================================================

  private finishUserRace() {
    this.userFinished = true;
    this.raceActive = false;
    this.audio.stopEngine();

    const elapsedMs = performance.now() - this.raceStartTime;
    this.userFinishTimeMs = elapsedMs;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = ((elapsedMs % 60000) / 1000).toFixed(1);
    const timeStr = `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;

    // Award race completion bonus XP
    this.xpScore += 30;

    const self = this.racersMap.get(this.userId);
    if (self) {
      self.finished = true;
      self.finishTimeMs = elapsedMs;
      self.finishTimeStr = timeStr;
      self.score = this.xpScore;
    }

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'FINISH_RACE',
        payload: {
          userId: this.userId,
          name: this.userName,
          finishTimeMs: elapsedMs,
          finishTimeStr: timeStr,
          score: this.xpScore
        }
      });
    }

    this.openLiveLeaderboardModal();
  }

  private handleFinishBroadcast(payload: any) {
    const racer = this.racersMap.get(payload.userId);
    if (racer) {
      racer.finished = true;
      racer.finishTimeMs = payload.finishTimeMs;
      racer.finishTimeStr = payload.finishTimeStr;
      racer.score = payload.score;
    }

    this.renderMiniOpponentsTracker();
    this.renderLiveLeaderboard();
  }

  private openLiveLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'flex';
    this.renderLiveLeaderboard();
  }

  private renderLiveLeaderboard() {
    const tableBody = document.getElementById('lb-table-body');
    const summaryEl = document.getElementById('lb-status-summary');
    const footerHint = document.getElementById('lb-footer-hint');
    const btnRestart = document.getElementById('btn-lb-restart');
    if (!tableBody) return;

    const racers = Array.from(this.racersMap.values());

    // Sort finished by time ascending, pending by checkpoint descending
    racers.sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishTimeMs || 0) - (b.finishTimeMs || 0);
      }
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      return b.checkpoint - a.checkpoint;
    });

    const pendingCount = racers.filter(r => !r.finished).length;

    if (summaryEl) {
      if (pendingCount > 0) {
        summaryEl.innerHTML = `You completed the course! Waiting for <strong>${pendingCount} racer${pendingCount > 1 ? 's' : ''}</strong> to cross the finish line...`;
      } else {
        summaryEl.innerHTML = `All racers have finished! Podium standings locked.`;
      }
    }

    if (footerHint) {
      if (pendingCount > 0) {
        footerHint.innerHTML = `
          <div class="rg-spinner rg-spinner-sm"></div>
          <span>Syncing live standings via Supabase Realtime...</span>
        `;
      } else {
        footerHint.innerHTML = `
          <span class="text-emerald" style="font-weight: 800;">Race Complete! Podium locked.</span>
        `;
        if (this.isHost && btnRestart) {
          btnRestart.style.display = 'inline-flex';
          btnRestart.onclick = () => {
            window.location.href = `/roomgame2?room=${this.roomCode}`;
          };
        }
      }
    }

    tableBody.innerHTML = racers.map((r, idx) => {
      const isYou = r.id === this.userId;
      const posClass = idx === 0 ? 'rg-pos-1' : (idx === 1 ? 'rg-pos-2' : (idx === 2 ? 'rg-pos-3' : ''));

      let statusBadge = '';
      let timeDisplay = '';

      if (r.finished) {
        statusBadge = `
          <span class="rg-lb-status-badge rg-lb-status-finished">
            <svg class="rg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Finished
          </span>
        `;
        timeDisplay = `<span style="font-family: var(--font-mono); font-weight: 800; color: #22d3ee;">${r.finishTimeStr || '--'}</span>`;
      } else {
        statusBadge = `
          <span class="rg-lb-status-badge rg-lb-status-racing">
            <span class="rg-live-dot" style="width: 6px; height: 6px;"></span>
            Racing
          </span>
        `;
        timeDisplay = `<span style="color: var(--text-dim); font-size: 12px;">In Progress</span>`;
      }

      return `
        <tr class="${isYou ? 'is-you' : ''} ${posClass}">
          <td><span class="rg-pos-badge">#${idx + 1}</span></td>
          <td>
            <div class="rg-lb-racer-cell">
              <img src="${r.avatar || '/images/home_avatar.png'}" alt="${r.name}" class="rg-lb-avatar" />
              <span class="rg-lb-name">${r.name} ${isYou ? '(You)' : ''}</span>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td><strong style="color: #6ee7b7;">${r.checkpoint}/5</strong></td>
          <td>${timeDisplay}</td>
          <td><strong style="color: #fbbf24;">${r.score} XP</strong></td>
        </tr>
      `;
    }).join('');
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new RoomGame2App();
});
