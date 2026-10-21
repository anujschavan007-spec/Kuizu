import * as THREE from 'three';
import { supabase } from './services/supabaseApiBridge';

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
  currentSpeed: number;
  lastUpdate: number;
  color: number;
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
    name: 'Sunset Highway (CS Foundations)',
    skyColor: 0x0b132b,
    fogColor: 0x0f1c3f,
    ambientColor: 0xffffff,
    sunColor: 0xffedd5,
    checkpoints: [
      {
        zPos: -450,
        title: 'Checkpoint 1: Stack vs Heap',
        topic: 'Memory Architecture',
        question: 'Which region of process memory is automatically managed by function call stack frames and CPU stack pointers?',
        options: [
          'Heap memory',
          'Stack memory',
          'Persistent SSD block storage',
          'Shared Virtual GPU cache'
        ],
        correct: 1,
        explanation: 'Stack memory automatically allocates and deallocates local variables when function execution frames enter and return.'
      },
      {
        zPos: -950,
        title: 'Checkpoint 2: Big-O Efficiency',
        topic: 'Algorithm Analysis',
        question: 'What is the average time complexity of searching a sorted array using Binary Search?',
        options: ['O(N)', 'O(N log N)', 'O(log N)', 'O(1)'],
        correct: 2,
        explanation: 'Binary search eliminates half the remaining search space with each comparison step, completing in O(log N).'
      },
      {
        zPos: -1500,
        title: 'Checkpoint 3: Hash Map Collisions',
        topic: 'Data Structures',
        question: 'What happens when two distinct keys produce the same hash index in a Hash Table?',
        options: [
          'The entire table gets dropped',
          'A Hash Collision occurs and is handled via chaining or open addressing',
          'The CPU halts with a hardware interrupt',
          'The second key overwrites the first without notification'
        ],
        correct: 1,
        explanation: 'Hash collisions are expected and properly resolved using collision resolution techniques like Separate Chaining or Linear Probing.'
      },
      {
        zPos: -2100,
        title: 'Checkpoint 4: Concurrency & Threads',
        topic: 'Operating Systems',
        question: 'What is a "Race Condition" in multi-threaded programming?',
        options: [
          'Two processes computing Fibonacci numbers simultaneously',
          'Unexpected software behavior occurring when multiple threads access shared state concurrently without synchronization',
          'A game loop running at greater than 144 frames per second',
          'Network packet congestion on an overloaded router'
        ],
        correct: 1,
        explanation: 'A race condition arises when concurrent threads execute non-atomic read-modify-write cycles on shared data without locks or mutexes.'
      },
      {
        zPos: -2700,
        title: 'Checkpoint 5: Relational DB Indexing',
        topic: 'Database Systems',
        question: 'Why are B-Trees preferred over Binary Search Trees for disk-based database indexes?',
        options: [
          'They use fewer disk read operations due to high node branching factor',
          'They only store strings, never integers',
          'They eliminate the need for SQL queries',
          'They compress data into zip files'
        ],
        correct: 0,
        explanation: 'B-Trees have wide branching factors matching OS disk page blocks, minimizing expensive disk I/O seek operations.'
      }
    ]
  },
  2: {
    id: 2,
    name: 'Midnight Cyber City (DSA & Graphs)',
    skyColor: 0x050814,
    fogColor: 0x070d1d,
    ambientColor: 0x38bdf8,
    sunColor: 0x06b6d4,
    checkpoints: [
      {
        zPos: -500,
        title: 'Checkpoint 1: Graph Traversal',
        topic: 'Graphs',
        question: 'Which algorithm guarantees finding the shortest path on an unweighted graph?',
        options: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Quicksort', 'Prim Algorithm'],
        correct: 1,
        explanation: 'BFS traverses level by level, ensuring the minimum edge hop distance in unweighted graphs.'
      },
      {
        zPos: -1100,
        title: 'Checkpoint 2: Dynamic Programming',
        topic: 'Optimization',
        question: 'What two fundamental characteristics make a problem solvable using Dynamic Programming?',
        options: [
          'Static typing and high bandwidth',
          'Optimal Substructure and Overlapping Subproblems',
          'Multithreading and recursion limit',
          'Linear memory and binary tree inputs'
        ],
        correct: 1,
        explanation: 'Dynamic programming memoizes solutions when subproblems overlap and optimal overall solutions compose from subproblem optima.'
      },
      {
        zPos: -1750,
        title: 'Checkpoint 3: Trie Data Structure',
        topic: 'Advanced Trees',
        question: 'Which real-world application heavily relies on a Trie (Prefix Tree)?',
        options: [
          'Search engine autocomplete and spell-check dictionaries',
          'Audio sound wave equalization',
          'Cryptographic hash generation',
          'CSS Flexbox calculation'
        ],
        correct: 0,
        explanation: 'Tries allow O(L) prefix lookup where L is the length of the string, ideal for search suggestions.'
      },
      {
        zPos: -2400,
        title: 'Checkpoint 4: Dijkstra Algorithm',
        topic: 'Shortest Path',
        question: 'Under what condition does standard Dijkstra algorithm fail or produce incorrect results?',
        options: [
          'On graphs with negative edge weights',
          'On directed acyclic graphs',
          'On graphs with more than 100 vertices',
          'On tree graphs'
        ],
        correct: 0,
        explanation: 'Dijkstra greedily assumes paths only increase in cost; negative edges violate this and require Bellman-Ford.'
      },
      {
        zPos: -3100,
        title: 'Checkpoint 5: LRU Cache Internals',
        topic: 'System Design',
        question: 'Which two data structures are combined to achieve O(1) get and put in an LRU Cache?',
        options: [
          'Hash Map and Doubly Linked List',
          'Binary Heap and Array',
          'Stack and Queue',
          'Red-Black Tree and Circular Buffer'
        ],
        correct: 0,
        explanation: 'The Hash Map gives O(1) key lookup, while the Doubly Linked List gives O(1) node relocation and eviction.'
      }
    ]
  },
  3: {
    id: 3,
    name: 'Electric Storm (Distributed Systems)',
    skyColor: 0x030712,
    fogColor: 0x061e38,
    ambientColor: 0x22d3ee,
    sunColor: 0x38bdf8,
    checkpoints: [
      {
        zPos: -600,
        title: 'Checkpoint 1: CAP Theorem',
        topic: 'Distributed Systems',
        question: 'According to the CAP Theorem, in the presence of a Network Partition (P), what trade-off must a system make?',
        options: [
          'Choose between Consistency (C) and Availability (A)',
          'Double the network throughput',
          'Switch from SQL to NoSQL',
          'Restart all cluster nodes simultaneously'
        ],
        correct: 0,
        explanation: 'When a network partition occurs, a distributed database must either reject writes (Consistency) or serve potentially stale data (Availability).'
      },
      {
        zPos: -1300,
        title: 'Checkpoint 2: Consistent Hashing',
        topic: 'Scalability',
        question: 'Why is Consistent Hashing utilized across distributed cache clusters (e.g. Memcached, DynamoDB)?',
        options: [
          'It minimizes cache miss remapping when adding or removing nodes (K/N keys rehashed)',
          'It completely eliminates memory usage',
          'It converts HTTP requests to WebSockets',
          'It enforces ACID transactions across servers'
        ],
        correct: 0,
        explanation: 'Consistent hashing rings ensure only a fraction of keys need remapping during node scaling events.'
      },
      {
        zPos: -2100,
        title: 'Checkpoint 3: Raft Consensus',
        topic: 'Distributed Consensus',
        question: 'What is the primary role of the Leader node in the Raft consensus protocol?',
        options: [
          'Manage log replication across followers and commit log entries',
          'Encrypt network packets with SSL',
          'Format client JSON payloads',
          'Shut down crashed servers'
        ],
        correct: 0,
        explanation: 'In Raft, the elected leader accepts client requests, appends to its log, and coordinates quorum replication to followers.'
      },
      {
        zPos: -3000,
        title: 'Checkpoint 4: Rate Limiting Algorithms',
        topic: 'API Infrastructure',
        question: 'Which rate limiting algorithm allows bursts of traffic while maintaining a steady long-term rate?',
        options: ['Token Bucket', 'Fixed Window Counter', 'Binary Heap', 'Round Robin'],
        correct: 0,
        explanation: 'Token bucket fills tokens at a constant rate and permits bursts as long as accumulated tokens exist.'
      },
      {
        zPos: -3900,
        title: 'Checkpoint 5: Idempotency Keys',
        topic: 'Distributed Transactions',
        question: 'Why do payment APIs (like Stripe) require an Idempotency-Key in HTTP headers?',
        options: [
          'To prevent duplicate charges if a network retry or timeout occurs',
          'To increase database compression',
          'To format currency symbols',
          'To authenticate user passwords'
        ],
        correct: 0,
        explanation: 'An idempotency key ensures repeated requests with the same key execute once and return the cached original result.'
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
    this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
    this.engineGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  public updatePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc) return;
    const baseFreq = 48 + speedRatio * 150;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
  }

  public playCrash() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  public playChime(isCorrect: boolean) {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCorrect ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isCorrect ? 587.33 : 220.0, now);
    if (isCorrect) {
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.2);
    } else {
      osc.frequency.exponentialRampToValueAtTime(140.0, now + 0.25);
    }

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (_) {}
      this.engineOsc = null;
    }
  }
}

// ==========================================================================
// 3. AI HIGHWAY TRAFFIC CONTROLLER
// ==========================================================================

const HIGHWAY_LANES = [-6.6, -2.2, 2.2, 6.6];

interface TrafficVehicle {
  mesh: THREE.Group;
  speed: number;
  lane: number;
  width: number;
  length: number;
}

class TrafficController {
  public vehicles: TrafficVehicle[] = [];
  private scene: THREE.Scene;
  private colors = [0x2563eb, 0x06b6d4, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x475569];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initTraffic(count: number, startZ: number) {
    this.clear();
    for (let i = 0; i < count; i++) {
      const laneIdx = Math.floor(Math.random() * HIGHWAY_LANES.length);
      const laneX = HIGHWAY_LANES[laneIdx];
      const zPos = startZ - 60 - i * (45 + Math.random() * 30);
      const speed = 0.45 + Math.random() * 0.35;
      const isTruck = i % 4 === 0;

      const vehicle = this.buildVehicle(isTruck, laneX, zPos, speed, laneIdx);
      this.vehicles.push(vehicle);
      this.scene.add(vehicle.mesh);
    }
  }

  private buildVehicle(isTruck: boolean, x: number, z: number, speed: number, lane: number): TrafficVehicle {
    const group = new THREE.Group();
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];

    const width = isTruck ? 2.6 : 2.2;
    const length = isTruck ? 7.2 : 4.4;
    const height = isTruck ? 2.6 : 1.35;

    // Body
    const bodyGeo = new THREE.BoxGeometry(width, height * 0.65, length);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height * 0.45;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(width * 0.88, height * 0.5, length * (isTruck ? 0.32 : 0.55));
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, height * 0.85, isTruck ? -length * 0.28 : 0);
    group.add(cabin);

    // Headlights (Yellow/White)
    const hlGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-width * 0.35, height * 0.4, -length * 0.51);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(width * 0.35, height * 0.4, -length * 0.51);
    group.add(hl1, hl2);

    // Taillights (Red)
    const tlGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(tlGeo, tlMat);
    tl1.position.set(-width * 0.35, height * 0.4, length * 0.51);
    const tl2 = new THREE.Mesh(tlGeo, tlMat);
    tl2.position.set(width * 0.35, height * 0.4, length * 0.51);
    group.add(tl1, tl2);

    group.position.set(x, 0, z);
    return { mesh: group, speed, lane, width, length };
  }

  public update(playerZ: number) {
    for (const v of this.vehicles) {
      v.mesh.position.z -= v.speed;

      // Recycle vehicle ahead if player passed it
      if (v.mesh.position.z > playerZ + 40) {
        const laneIdx = Math.floor(Math.random() * HIGHWAY_LANES.length);
        v.lane = laneIdx;
        v.mesh.position.x = HIGHWAY_LANES[laneIdx];
        v.mesh.position.z = playerZ - 350 - Math.random() * 120;
      }
    }
  }

  public checkCollision(playerBox: THREE.Box3): boolean {
    const trafficBox = new THREE.Box3();
    for (const v of this.vehicles) {
      trafficBox.setFromObject(v.mesh);
      if (playerBox.intersectsBox(trafficBox)) {
        return true;
      }
    }
    return false;
  }

  public clear() {
    for (const v of this.vehicles) {
      this.scene.remove(v.mesh);
    }
    this.vehicles = [];
  }
}

// ==========================================================================
// 4. MAIN MULTIPLAYER ROOM GAME APP
// ==========================================================================

class RoomGameApp {
  // Current user info
  private userId: string = '';
  private userName: string = 'Racer';
  private userAvatar: string = '/images/home_avatar.png';

  // Room State
  private roomCode: string = '';
  private roomTitle: string = 'Kuizu Highway Showdown';
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
  private quizOpenTime: number = 0;

  // Three.js State
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private playerCar!: THREE.Group;
  private checkpointGates: THREE.Group[] = [];
  private traffic!: TrafficController;
  private audio = new AudioEngine();
  private remoteCars: Map<string, RemoteCarInstance> = new Map();
  private lastPosBroadcastTime: number = 0;

  // Driving Physics
  private playerSpeed: number = 0;
  private maxSpeed: number = 1.65;
  private accel: number = 0.026;
  private friction: number = 0.965;
  private keys: Record<string, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
  };

  constructor() {
    this.initUser();
    this.bindDomEvents();
    this.checkUrlForRoom();
  }

  // Read authenticated user or guest profile
  private initUser() {
    try {
      const stored = localStorage.getItem('kuizu_user');
      if (stored) {
        const u = JSON.parse(stored);
        this.userId = u.id || `usr_${Math.random().toString(36).substring(2, 9)}`;
        this.userName = u.name || u.username || 'Racer';
        this.userAvatar = u.avatar || localStorage.getItem('kuizu_avatar') || '/images/home_avatar.png';
      } else {
        this.userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
        this.userName = `Racer_${Math.floor(100 + Math.random() * 900)}`;
      }
    } catch (_) {
      this.userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
      this.userName = 'Racer_1';
    }

    const nameEl = document.getElementById('rg-user-name');
    const avatarEl = document.getElementById('rg-user-avatar') as HTMLImageElement | null;
    const hudRacerName = document.getElementById('hud-racer-name');

    if (nameEl) nameEl.textContent = this.userName;
    if (avatarEl) avatarEl.src = this.userAvatar;
    if (hudRacerName) hudRacerName.textContent = this.userName;
  }

  private checkUrlForRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const input = document.getElementById('input-join-code') as HTMLInputElement | null;
      if (input) input.value = roomParam.trim().toUpperCase();
      this.joinRoom(roomParam.trim().toUpperCase());
    }
  }

  // ========================================================================
  // DOM BINDINGS & SCREEN ROUTING
  // ========================================================================

  private bindDomEvents() {
    // Create Room
    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      const titleInput = document.getElementById('input-create-title') as HTMLInputElement | null;
      const levelSelect = document.getElementById('select-create-level') as HTMLSelectElement | null;
      const title = titleInput?.value.trim() || 'Kuizu Highway Showdown';
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
      window.location.href = `/roomgame?room=${this.roomCode}`;
    });

    // Keyboard Inputs
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });
  }

  private showJoinError(msg: string) {
    const errEl = document.getElementById('join-error-msg');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  private copyRoomLink() {
    const url = `${window.location.origin}/roomgame?room=${this.roomCode}`;
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
  // SUPABASE REALTIME ROOM CONNECTION & PRESENCE
  // ========================================================================

  private async createRoom(title: string, levelId: number) {
    // Generate clean 6-digit room code e.g. KZ-5829
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `KZ-${randomDigits}`;

    this.roomCode = code;
    this.roomTitle = title;
    this.selectedLevelId = levelId;
    this.isHost = true;

    // Update URL without reload
    window.history.replaceState({}, '', `/roomgame?room=${code}`);

    await this.connectRealtimeChannel();
    this.renderLobbyView();
  }

  private async joinRoom(code: string) {
    this.roomCode = code.toUpperCase();
    this.isHost = false;

    window.history.replaceState({}, '', `/roomgame?room=${this.roomCode}`);

    await this.connectRealtimeChannel();
    this.renderLobbyView();
  }

  private async connectRealtimeChannel() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    const channelName = `highway-room-${this.roomCode}`;
    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.userId }
      }
    });

    // 1. Presence Sync (Connected racers in the room)
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
        // Preserve finish times if already finished
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

  private renderLobbyView() {
    const actionsBox = document.getElementById('lobby-initial-actions');
    const activeLobby = document.getElementById('lobby-active-room');
    const headerRoomInfo = document.getElementById('header-room-info');
    const headerCode = document.getElementById('header-room-code');
    const btnExit = document.getElementById('btn-exit-room');

    if (actionsBox) actionsBox.style.display = 'none';
    if (activeLobby) activeLobby.style.display = 'block';
    if (headerRoomInfo) headerRoomInfo.style.display = 'flex';
    if (headerCode) headerCode.textContent = this.roomCode;
    if (btnExit) btnExit.style.display = 'inline-flex';

    const titleEl = document.getElementById('active-room-title');
    const codeEl = document.getElementById('active-room-code');
    const trackEl = document.getElementById('active-room-track');

    if (titleEl) titleEl.textContent = this.roomTitle;
    if (codeEl) codeEl.textContent = this.roomCode;
    if (trackEl) {
      const cfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
      trackEl.textContent = `Course: ${cfg.name}`;
    }

    const hostControls = document.getElementById('host-controls');
    const guestWaiting = document.getElementById('guest-waiting');

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
    const grid = document.getElementById('racers-grid');
    const countEl = document.getElementById('racers-count');
    if (!grid) return;

    const racers = Array.from(this.racersMap.values());
    if (countEl) countEl.textContent = `${racers.length}`;

    grid.innerHTML = racers.map(r => {
      const isYou = r.id === this.userId;
      return `
        <div class="rg-racer-card ${isYou ? 'is-you' : ''}">
          <img src="${r.avatar || '/images/home_avatar.png'}" alt="${r.name}" class="rg-racer-avatar" />
          <div class="rg-racer-meta">
            <div class="rg-racer-name">${r.name} ${isYou ? '<span class="text-cyan">(You)</span>' : ''}</div>
            <div class="rg-racer-tags">
              ${r.isHost ? '<span class="rg-tag-host">Host</span>' : ''}
              <span class="rg-tag-ready">Ready</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  private leaveRoom() {
    this.clearRemoteCars();
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    window.location.href = '/roomgame';
  }

  // ========================================================================
  // SYNCHRONIZED RACE LAUNCH (3... 2... 1... GO!)
  // ========================================================================

  private broadcastStartGame() {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'START_RACE',
      payload: {
        levelId: this.selectedLevelId,
        roomTitle: this.roomTitle,
        countdown: 3
      }
    });
    // Trigger locally
    this.handleStartRaceBroadcast({
      levelId: this.selectedLevelId,
      roomTitle: this.roomTitle,
      countdown: 3
    });
  }

  private handleStartRaceBroadcast(payload: any) {
    if (this.raceActive) return;
    this.selectedLevelId = payload.levelId || 1;

    // Switch screens: hide lobby, show game screen
    const lobbyScreen = document.getElementById('screen-lobby');
    const gameScreen = document.getElementById('screen-game');
    const statusBadge = document.getElementById('room-status-badge');

    if (lobbyScreen) lobbyScreen.style.display = 'none';
    if (gameScreen) gameScreen.style.display = 'block';
    if (statusBadge) {
      statusBadge.textContent = 'Race In Progress';
      statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      statusBadge.style.color = '#10b981';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
    }

    // Launch Three.js 3D world
    this.initThreeWorld();

    // Stagger starting grid across 4 lanes so racers don't overlap
    const racerKeys = Array.from(this.racersMap.keys());
    const myGridIndex = Math.max(0, racerKeys.indexOf(this.userId));
    const startingGridX = [-2.2, 2.2, -6.6, 6.6];
    const initialLaneX = startingGridX[myGridIndex % startingGridX.length];
    if (this.playerCar) {
      this.playerCar.position.set(initialLaneX, 0, 0);
    }

    // Broadcast starting position so everyone sees each other lined up on the highway
    this.broadcastPosition();

    // Start 3-second synchronized countdown
    this.runCountdown(payload.countdown || 3);
  }

  private runCountdown(seconds: number) {
    const modal = document.getElementById('countdown-overlay');
    const numEl = document.getElementById('countdown-number');
    if (modal) modal.style.display = 'flex';

    let count = seconds;
    if (numEl) numEl.textContent = `${count}`;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        if (numEl) numEl.textContent = `${count}`;
      } else if (count === 0) {
        if (numEl) {
          numEl.textContent = 'GO!';
          numEl.style.color = '#10b981';
        }
      } else {
        clearInterval(timer);
        if (modal) modal.style.display = 'none';
        this.raceActive = true;
        this.raceStartTime = performance.now();
        this.audio.startEngine();
      }
    }, 1000);
  }

  // ========================================================================
  // THREE.JS 3D RACE ENGINE & PHYSICS LOOP
  // ========================================================================

  private initThreeWorld() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.clearRemoteCars();
    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(levelCfg.skyColor);
    this.scene.fog = new THREE.Fog(levelCfg.fogColor, 70, 240);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Lights
    const ambient = new THREE.AmbientLight(levelCfg.ambientColor, 0.7);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(levelCfg.sunColor, 0.9);
    dir.position.set(30, 60, 40);
    this.scene.add(dir);

    // Ground Grass / Terrains
    const groundGeo = new THREE.PlaneGeometry(500, 5000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x071520 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -2000;
    this.scene.add(ground);

    // Highway Asphalt
    const roadGeo = new THREE.PlaneGeometry(18, 5000);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, -2000);
    this.scene.add(road);

    // Road Stripes
    for (let z = 20; z > -4500; z -= 14) {
      const stripeGeo = new THREE.PlaneGeometry(0.35, 6);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.04, z);
      this.scene.add(stripe);
    }

    // Roadside Streetlights / Neon Poles
    for (let z = 0; z > -4500; z -= 35) {
      [-10.5, 10.5].forEach(xPos => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.2, 8, 8),
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        pole.position.set(xPos, 4, z);

        const neon = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 8, 8),
          new THREE.MeshBasicMaterial({ color: levelCfg.sunColor })
        );
        neon.position.set(xPos, 8, z);
        this.scene.add(pole, neon);
      });
    }

    // Build Player Car
    this.buildPlayerCar();

    // Build Checkpoint Gates
    this.buildCheckpointGates(levelCfg);

    // AI Traffic Controller
    this.traffic = new TrafficController(this.scene);
    this.traffic.initTraffic(18, 0);

    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start Animation Loop
    this.animate();
  }

  private buildPlayerCar() {
    this.playerCar = new THREE.Group();

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(2.3, 0.8, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25, metalness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    this.playerCar.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.6, 2.3);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.3, -0.2);
    this.playerCar.add(cabin);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
    const wheelPos: [number, number, number][] = [
      [-1.2, 0.44, 1.3],
      [1.2, 0.44, 1.3],
      [-1.2, 0.44, -1.3],
      [1.2, 0.44, -1.3]
    ];
    wheelPos.forEach(p => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(p[0], p[1], p[2]);
      this.playerCar.add(wheel);
    });

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.8, 0.6, -2.25);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(0.8, 0.6, -2.25);
    this.playerCar.add(hl1, hl2);

    this.playerCar.position.set(0, 0, 0);
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
      const displayStr = isHost ? `${name.slice(0, 10)} (Host)` : name.slice(0, 14);
      ctx.fillText(displayStr, 128, 36);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4.2, 1.2, 1);
    sprite.position.set(0, 3.2, 0);
    return sprite;
  }

  private buildRemotePlayerCar(name: string, colorHex: number, isHost: boolean): RemoteCarInstance {
    const group = new THREE.Group();

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(2.3, 0.8, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.6, 2.3);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.3, -0.2);
    group.add(cabin);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
    const wheelPos: [number, number, number][] = [
      [-1.2, 0.44, 1.3],
      [1.2, 0.44, 1.3],
      [-1.2, 0.44, -1.3],
      [1.2, 0.44, -1.3]
    ];
    wheelPos.forEach(p => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(p[0], p[1], p[2]);
      group.add(wheel);
    });

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(-0.8, 0.6, -2.25);
    const hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(0.8, 0.6, -2.25);
    group.add(hl1, hl2);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.38, 0.2, 0.1);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(tlGeo, tlMat);
    tl1.position.set(-0.8, 0.6, 2.25);
    const tl2 = new THREE.Mesh(tlGeo, tlMat);
    tl2.position.set(0.8, 0.6, 2.25);
    group.add(tl1, tl2);

    // Floating Name Tag
    const nameTag = this.createNameTagSprite(name, isHost);
    group.add(nameTag);

    return {
      mesh: group,
      nameTag,
      targetX: 0,
      targetZ: 0,
      currentSpeed: 0,
      lastUpdate: performance.now(),
      color: colorHex
    };
  }

  private handleRemotePlayerPos(data: any) {
    if (!data || !data.userId || data.userId === this.userId) return;

    let remote = this.remoteCars.get(data.userId);
    if (!remote && this.scene) {
      const racerData = this.racersMap.get(data.userId);
      const isHost = Boolean(racerData?.isHost);
      const colorIndex = Math.abs(data.userId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % FRIEND_CAR_COLORS.length;
      const carColor = FRIEND_CAR_COLORS[colorIndex];

      remote = this.buildRemotePlayerCar(data.name || 'Friend', carColor, isHost);
      remote.mesh.position.set(data.x, 0, data.z);
      this.scene.add(remote.mesh);
      this.remoteCars.set(data.userId, remote);
    }

    if (remote) {
      remote.targetX = data.x;
      remote.targetZ = data.z;
      remote.currentSpeed = data.speed || 0;
      remote.lastUpdate = performance.now();
    }

    if (data.checkpoint !== undefined) {
      const racer = this.racersMap.get(data.userId);
      if (racer && !racer.finished) {
        racer.checkpoint = data.checkpoint;
      }
    }

    this.renderMiniOpponentsTracker();
  }

  private broadcastPosition() {
    if (!this.channel || !this.playerCar) return;
    this.channel.send({
      type: 'broadcast',
      event: 'PLAYER_POS',
      payload: {
        userId: this.userId,
        name: this.userName,
        x: this.playerCar.position.x,
        z: this.playerCar.position.z,
        speed: this.playerSpeed,
        checkpoint: this.currentCheckpointIdx
      }
    });
  }

  private clearRemoteCars() {
    for (const remote of this.remoteCars.values()) {
      if (this.scene) {
        this.scene.remove(remote.mesh);
      }
    }
    this.remoteCars.clear();
  }

  private buildCheckpointGates(levelCfg: LevelConfig) {
    this.checkpointGates = [];
    levelCfg.checkpoints.forEach((cp, idx) => {
      const gate = new THREE.Group();

      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 7.5, 12);
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

      const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
      pLeft.position.set(-8.5, 3.75, 0);
      const pRight = new THREE.Mesh(pillarGeo, pillarMat);
      pRight.position.set(8.5, 3.75, 0);

      const bannerGeo = new THREE.BoxGeometry(17.7, 1.5, 0.6);
      const bannerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(0, 7.2, 0);

      const padGeo = new THREE.PlaneGeometry(17, 4.5);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.06;

      gate.add(pLeft, pRight, banner, pad);
      gate.position.set(0, 0, cp.zPos);
      this.scene.add(gate);
      this.checkpointGates.push(gate);
    });
  }

  // Physics animation loop
  private animate = () => {
    requestAnimationFrame(this.animate);

    if (this.raceActive && !this.isPausedForQuiz && !this.userFinished) {
      const fwd = this.keys.ArrowUp || this.keys.w;
      const bwd = this.keys.ArrowDown || this.keys.s;
      const left = this.keys.ArrowLeft || this.keys.a;
      const right = this.keys.ArrowRight || this.keys.d;

      // Acceleration
      if (fwd) {
        this.playerSpeed = Math.min(this.maxSpeed, this.playerSpeed + this.accel);
      } else if (bwd) {
        this.playerSpeed = Math.max(-this.maxSpeed * 0.4, this.playerSpeed - this.accel);
      } else {
        this.playerSpeed *= this.friction;
      }

      // Steering
      if (Math.abs(this.playerSpeed) > 0.02) {
        if (left) this.playerCar.position.x = Math.max(-7.4, this.playerCar.position.x - 0.18);
        if (right) this.playerCar.position.x = Math.min(7.4, this.playerCar.position.x + 0.18);
      }

      this.playerCar.position.z -= this.playerSpeed;

      // Update Audio Engine Sound
      this.audio.updatePitch(Math.abs(this.playerSpeed) / this.maxSpeed);

      // Camera smoothly tracks car
      this.camera.position.x += (this.playerCar.position.x * 0.5 - this.camera.position.x) * 0.1;
      this.camera.position.y = 4.3;
      this.camera.position.z = this.playerCar.position.z + 10.5;
      this.camera.lookAt(this.playerCar.position.x, 1.3, this.playerCar.position.z - 16);

      // Update Traffic
      this.traffic.update(this.playerCar.position.z);

      // Check Collision with Traffic
      const playerBox = new THREE.Box3().setFromObject(this.playerCar);
      if (this.traffic.checkCollision(playerBox)) {
        this.handleCarCrash();
      }

      // Update HUD Speedometer
      const kmh = Math.round(Math.abs(this.playerSpeed) * 115);
      const speedEl = document.getElementById('hud-speed');
      const rpmEl = document.getElementById('hud-rpm-fill');
      if (speedEl) speedEl.textContent = `${kmh}`;
      if (rpmEl) rpmEl.style.width = `${Math.min(100, Math.round((kmh / 190) * 100))}%`;

      // Checkpoint Progress Check
      const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
      if (this.currentCheckpointIdx < levelCfg.checkpoints.length) {
        const nextCp = levelCfg.checkpoints[this.currentCheckpointIdx];
        const dist = Math.max(0, Math.round(this.playerCar.position.z - nextCp.zPos));

        const nameEl = document.getElementById('next-cp-name');
        const distEl = document.getElementById('next-cp-dist');
        if (nameEl) nameEl.textContent = nextCp.title;
        if (distEl) distEl.textContent = `${dist}`;

        if (this.playerCar.position.z <= nextCp.zPos) {
          this.triggerCheckpointQuiz(this.currentCheckpointIdx);
        }
      }

      // Broadcast local car telemetry to friends (~22 times/sec)
      const now = performance.now();
      if (this.channel && now - this.lastPosBroadcastTime > 45) {
        this.lastPosBroadcastTime = now;
        this.broadcastPosition();
      }
    }

    // Smoothly interpolate (lerp) all remote friend cars toward their broadcast positions
    const nowTime = performance.now();
    for (const [id, remote] of this.remoteCars.entries()) {
      remote.mesh.position.x += (remote.targetX - remote.mesh.position.x) * 0.22;
      remote.mesh.position.z += (remote.targetZ - remote.mesh.position.z) * 0.22;

      // Subtle chassis steer tilt based on horizontal motion
      const diffX = remote.targetX - remote.mesh.position.x;
      remote.mesh.rotation.y = -diffX * 0.12;
      remote.mesh.rotation.z = -diffX * 0.04;

      // Keep 3D floating name tag facing the camera
      if (this.camera) {
        remote.nameTag.quaternion.copy(this.camera.quaternion);
      }

      // Cleanup if player went inactive for > 20 seconds
      if (nowTime - remote.lastUpdate > 20000) {
        this.scene.remove(remote.mesh);
        this.remoteCars.delete(id);
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private handleCarCrash() {
    this.audio.playCrash();
    this.playerSpeed = 0.1;
    // Shift slightly into safe lane
    this.playerCar.position.x = 0;

    const crashToast = document.getElementById('crash-banner');
    if (crashToast) {
      crashToast.style.display = 'flex';
      setTimeout(() => {
        crashToast.style.display = 'none';
      }, 1800);
    }
  }

  // ========================================================================
  // CHECKPOINTS, QUIZ & LIVE REALTIME STATUS BROADCAST
  // ========================================================================

  private triggerCheckpointQuiz(cpIndex: number) {
    this.isPausedForQuiz = true;
    this.playerSpeed = 0;
    this.quizOpenTime = performance.now();

    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
    const cp = levelCfg.checkpoints[cpIndex];

    const badgeEl = document.getElementById('quiz-badge');
    const qEl = document.getElementById('quiz-question');
    const optsDiv = document.getElementById('quiz-options');
    const feedbackDiv = document.getElementById('quiz-feedback');
    const continueBtn = document.getElementById('btn-continue-drive');

    if (badgeEl) badgeEl.textContent = cp.title;
    if (qEl) qEl.textContent = cp.question;
    if (feedbackDiv) feedbackDiv.style.display = 'none';
    if (continueBtn) continueBtn.style.display = 'none';

    if (optsDiv) {
      optsDiv.innerHTML = '';
      cp.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'rg-opt-btn';
        btn.innerHTML = `<span>${optText}</span><span class="text-dim">#${idx + 1}</span>`;
        btn.onclick = () => this.evaluateQuizAnswer(cpIndex, idx, btn);
        optsDiv.appendChild(btn);
      });
    }

    const modal = document.getElementById('quiz-modal');
    if (modal) modal.style.display = 'flex';
  }

  private evaluateQuizAnswer(cpIndex: number, selectedIdx: number, clickedBtn: HTMLButtonElement) {
    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
    const cp = levelCfg.checkpoints[cpIndex];
    const optsDiv = document.getElementById('quiz-options');
    const feedbackDiv = document.getElementById('quiz-feedback');
    const continueBtn = document.getElementById('btn-continue-drive');

    if (optsDiv) {
      optsDiv.querySelectorAll('button').forEach(b => (b.disabled = true));
    }

    const isCorrect = selectedIdx === cp.correct;
    this.audio.playChime(isCorrect);

    if (isCorrect) {
      clickedBtn.classList.add('is-correct');
      this.xpScore += 20;
      if (feedbackDiv) {
        feedbackDiv.style.display = 'block';
        feedbackDiv.className = 'rg-quiz-feedback bg-emerald';
        feedbackDiv.style.background = 'rgba(16, 185, 129, 0.15)';
        feedbackDiv.style.border = '1px solid rgba(16, 185, 129, 0.35)';
        feedbackDiv.style.color = '#a7f3d0';
        feedbackDiv.innerHTML = `<strong>Spot On! (+20 XP)</strong> Excellent grasp of this concept.`;
      }
    } else {
      clickedBtn.classList.add('is-wrong');
      const allBtns = optsDiv?.querySelectorAll('button');
      if (allBtns && allBtns[cp.correct]) {
        allBtns[cp.correct].classList.add('is-correct');
      }
      this.xpScore += 10;
      if (feedbackDiv) {
        feedbackDiv.style.display = 'block';
        feedbackDiv.style.background = 'rgba(245, 158, 11, 0.15)';
        feedbackDiv.style.border = '1px solid rgba(245, 158, 11, 0.35)';
        feedbackDiv.style.color = '#fde68a';
        feedbackDiv.innerHTML = `<strong>Participation XP (+10 XP)</strong><br/><span style="margin-top:4px;display:block;">${cp.explanation}</span>`;
      }
    }

    // Update Gate colors to emerald
    if (this.checkpointGates[cpIndex]) {
      this.checkpointGates[cpIndex].children.forEach((c: any) => {
        if (c.material && c.material.color) {
          c.material.color.setHex(0x10b981);
        }
      });
    }

    this.currentCheckpointIdx++;
    const hudCp = document.getElementById('hud-cp-count');
    const hudXp = document.getElementById('hud-xp-score');
    if (hudCp) hudCp.textContent = `${this.currentCheckpointIdx}`;
    if (hudXp) hudXp.textContent = `${this.xpScore} XP`;

    // Broadcast checkpoint update to all room members
    this.broadcastCheckpoint(this.currentCheckpointIdx, this.xpScore);

    if (continueBtn) continueBtn.style.display = 'inline-flex';
  }

  private resumeDriving() {
    const modal = document.getElementById('quiz-modal');
    if (modal) modal.style.display = 'none';

    const levelCfg = LEVEL_CONFIGS[this.selectedLevelId] || LEVEL_CONFIGS[1];
    if (this.currentCheckpointIdx >= levelCfg.checkpoints.length) {
      // User has cleared all checkpoints! Finish the race!
      this.finishUserRace();
    } else {
      this.isPausedForQuiz = false;
    }
  }

  private broadcastCheckpoint(cp: number, score: number) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'CHECKPOINT_UPDATE',
      payload: {
        userId: this.userId,
        checkpoint: cp,
        score
      }
    });

    // Update self in map
    const self = this.racersMap.get(this.userId);
    if (self) {
      self.checkpoint = cp;
      self.score = score;
    }
    this.renderMiniOpponentsTracker();
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

  // Mini HUD tracker during racing
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
        const remote = this.remoteCars.get(r.id);
        if (remote && this.playerCar) {
          const diffM = Math.round(this.playerCar.position.z - remote.mesh.position.z);
          if (diffM > 0) {
            statusText = `${diffM}m ahead`;
          } else {
            statusText = `${Math.abs(diffM)}m behind`;
          }
        } else {
          statusText = `CP ${r.checkpoint}/5`;
        }
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

    // Award bonus XP
    this.xpScore += 30;

    // Update self in map
    const self = this.racersMap.get(this.userId);
    if (self) {
      self.finished = true;
      self.finishTimeMs = elapsedMs;
      self.finishTimeStr = timeStr;
      self.score = this.xpScore;
    }

    // Broadcast finish event to all room participants
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

    // Open Live Leaderboard immediately
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

    // Sorting:
    // 1. Finished racers sorted by finishTimeMs ascending
    // 2. Pending racers sorted by checkpoint descending
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
        summaryEl.innerHTML = `You finished the race! Waiting for <strong>${pendingCount} racer${pendingCount > 1 ? 's' : ''}</strong> to cross the finish line...`;
      } else {
        summaryEl.innerHTML = `All racers have crossed the finish line! Podium locked.`;
      }
    }

    if (footerHint) {
      if (pendingCount > 0) {
        footerHint.innerHTML = `
          <div class="rg-spinner rg-spinner-sm"></div>
          <span>Waiting for pending racers... Standings update live automatically.</span>
        `;
      } else {
        footerHint.innerHTML = `
          <span class="text-emerald" style="font-weight: 800;">Race Concluded! Final podium locked.</span>
        `;
        if (this.isHost && btnRestart) {
          btnRestart.style.display = 'inline-flex';
          btnRestart.onclick = () => {
            window.location.href = `/roomgame?room=${this.roomCode}`;
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
          <span class="rg-status-finished">
            <svg class="rg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Finished</span>
          </span>
        `;
        timeDisplay = `<span class="rg-lb-time text-emerald">${r.finishTimeStr}</span>`;
      } else {
        statusBadge = `
          <span class="rg-status-pending">
            <div class="rg-spinner rg-spinner-sm"></div>
            <span>Pending (Racing...)</span>
          </span>
        `;
        timeDisplay = `<span class="rg-lb-time text-dim">--:--</span>`;
      }

      return `
        <tr class="${isYou ? 'rg-lb-row-self' : ''}">
          <td class="rg-lb-pos ${posClass}">#${idx + 1}</td>
          <td>
            <div class="rg-lb-player-cell">
              <img src="${r.avatar || '/images/home_avatar.png'}" alt="${r.name}" class="rg-lb-avatar" />
              <div>
                <span class="rg-lb-name">${r.name}</span>
                ${isYou ? '<span class="rg-lb-you-tag">YOU</span>' : ''}
              </div>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td><strong class="text-cyan">Checkpoint ${r.checkpoint} / 5</strong></td>
          <td>${timeDisplay}</td>
          <td><span class="rg-lb-score">${r.score} XP</span></td>
        </tr>
      `;
    }).join('');
  }
}

// Instantiate application on page load
window.addEventListener('DOMContentLoaded', () => {
  new RoomGameApp();
});
