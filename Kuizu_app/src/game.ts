import * as THREE from 'three';

// ==========================================================================
// 1. GAME DATA STRUCTURES & SYLLABUS LEVELS
// ==========================================================================

export interface CheckpointQuestion {
  zPos: number; // distance along highway (in units, 1 unit ~ 1 meter)
  title: string;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface GameLevel {
  id: number;
  name: string;
  subtitle: string;
  theme: 'sunset' | 'cyber' | 'storm';
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  sunColor: number;
  sunIntensity: number;
  trafficSpeedMin: number;
  trafficSpeedMax: number;
  trafficCount: number;
  totalDistance: number;
  checkpoints: CheckpointQuestion[];
}

const GAME_LEVELS: GameLevel[] = [
  // LEVEL 1: Sunset Highway (Programming Foundations & Logic)
  {
    id: 1,
    name: 'Level 1: Sunset Highway',
    subtitle: 'Programming Foundations & Logic',
    theme: 'sunset',
    skyColor: 0x1e1b4b,
    fogColor: 0x2e1065,
    ambientColor: 0xfde68a,
    sunColor: 0xf59e0b,
    sunIntensity: 1.1,
    trafficSpeedMin: 0.35,
    trafficSpeedMax: 0.65,
    trafficCount: 12,
    totalDistance: 2750,
    checkpoints: [
      {
        zPos: -450,
        title: 'Checkpoint 1: Recursion & Memory',
        topic: 'Data Structures & Logic',
        question: 'What occurs when a recursive function lacks a terminating base case?',
        options: [
          'The function switches automatically to an iterative loop',
          'It causes a Call Stack Overflow error due to infinite frames',
          'The compiler returns zero and terminates execution safely',
          'It executes in O(1) constant time without memory allocation'
        ],
        correct: 1,
        explanation: 'Study Buddy: Every recursive call adds an execution frame to the Call Stack. Without a base case, frames accumulate indefinitely until allocated stack memory is completely exhausted, raising a Stack Overflow.'
      },
      {
        zPos: -950,
        title: 'Checkpoint 2: Array vs Linked List',
        topic: 'Memory Architecture',
        question: 'Why does an Array offer faster element access at index i compared to a Linked List?',
        options: [
          'Arrays store elements in contiguous memory allowing O(1) pointer arithmetic',
          'Linked lists store data exclusively on disk instead of RAM',
          'Arrays do not require memory allocation in computer memory',
          'Linked lists only support integer data types'
        ],
        correct: 0,
        explanation: 'Study Buddy: Arrays occupy contiguous blocks of memory. The address of any element index i is calculated directly via base_address + (i * element_size) in constant O(1) time.'
      },
      {
        zPos: -1500,
        title: 'Checkpoint 3: Time Complexity',
        topic: 'Algorithm Analysis',
        question: 'What is the worst-case time complexity of finding an element in an unsorted array of size N?',
        options: [
          'O(log N)',
          'O(1)',
          'O(N)',
          'O(N^2)'
        ],
        correct: 2,
        explanation: 'Study Buddy: In an unsorted array, the target element could be located at the very end or absent entirely, requiring a linear scan through all N elements (O(N)).'
      },
      {
        zPos: -2100,
        title: 'Checkpoint 4: Stack LIFO Principle',
        topic: 'Abstract Data Types',
        question: 'Which real-world software feature fundamentally relies on a Stack data structure?',
        options: [
          'Browser back button and editor Undo/Redo operations',
          'Printer spooling job queue',
          'Streaming live video over UDP protocol',
          'Generating random cryptographic primes'
        ],
        correct: 0,
        explanation: 'Study Buddy: Stacks operate strictly on Last-In, First-Out (LIFO). The most recent action is always the first one undone, making it ideal for Undo/Redo and navigation histories.'
      },
      {
        zPos: -2700,
        title: 'Checkpoint 5: Pointer & References',
        topic: 'System Memory',
        question: 'What is a "Dangling Pointer" in low-level programming (C/C++)?',
        options: [
          'A pointer that points to the NULL address',
          'A pointer pointing to a deallocated/freed memory location',
          'A pointer stored inside an array',
          'A pointer that contains an integer instead of a character'
        ],
        correct: 1,
        explanation: 'Study Buddy: When heap memory is freed or goes out of scope while a pointer still holds its memory address, dereferencing it leads to undefined behavior or segmentation faults.'
      }
    ]
  },

  // LEVEL 2: Midnight Cyber City (DSA & Algorithms)
  {
    id: 2,
    name: 'Level 2: Midnight Cyber City',
    subtitle: 'Algorithms & Advanced Data Structures',
    theme: 'cyber',
    skyColor: 0x050814,
    fogColor: 0x070d1d,
    ambientColor: 0x38bdf8,
    sunColor: 0x06b6d4,
    sunIntensity: 0.9,
    trafficSpeedMin: 0.50,
    trafficSpeedMax: 0.85,
    trafficCount: 15,
    totalDistance: 3250,
    checkpoints: [
      {
        zPos: -500,
        title: 'Checkpoint 1: Binary Search Trees',
        topic: 'Search Trees',
        question: 'What invariant must every node in a valid Binary Search Tree (BST) satisfy?',
        options: [
          'Left subtree keys < Node key < Right subtree keys',
          'All leaf nodes must be at the exact same depth',
          'Each node must have exactly two non-null children',
          'Keys must be stored alphabetically as strings'
        ],
        correct: 0,
        explanation: 'Study Buddy: In a BST, all keys in the left child subtree are strictly smaller than the parent, and all keys in the right child subtree are strictly greater.'
      },
      {
        zPos: -1100,
        title: 'Checkpoint 2: Hash Table Collisions',
        topic: 'Hashing',
        question: 'What is the average-case time complexity of inserting a key into a Hash Map with uniform hashing?',
        options: [
          'O(N)',
          'O(N log N)',
          'O(1)',
          'O(log N)'
        ],
        correct: 2,
        explanation: 'Study Buddy: With an effective hash function and reasonable load factor, hash collisions are minimal, providing constant O(1) average-time lookups and insertions.'
      },
      {
        zPos: -1750,
        title: 'Checkpoint 3: QuickSort vs MergeSort',
        topic: 'Sorting Algorithms',
        question: 'Why is MergeSort strictly preferred over QuickSort for sorting Linked Lists?',
        options: [
          'MergeSort does not require random index access and operates efficiently with sequential pointer traversal',
          'QuickSort cannot operate on numbers',
          'MergeSort requires zero additional memory for arrays',
          'QuickSort is O(N^3) in the best case'
        ],
        correct: 0,
        explanation: 'Study Buddy: MergeSort divides lists sequentially without needing O(1) random array indexing, making linked list merging fast with O(1) auxiliary pointer updates.'
      },
      {
        zPos: -2400,
        title: 'Checkpoint 4: Dijkstra Algorithm',
        topic: 'Graph Theory',
        question: 'What is a critical limitation of Dijkstra Shortest Path Algorithm on weighted graphs?',
        options: [
          'It cannot handle undirected graphs',
          'It fails to produce correct results on graphs containing negative edge weights',
          'It only runs on binary trees',
          'It requires vertex count to be a power of two'
        ],
        correct: 1,
        explanation: 'Study Buddy: Dijkstra algorithm assumes once a node is visited its distance is minimal. Negative edge weights violate this greedy assumption, requiring the Bellman-Ford algorithm instead.'
      },
      {
        zPos: -3200,
        title: 'Checkpoint 5: Dynamic Programming',
        topic: 'Optimization',
        question: 'Which two properties must a computational problem exhibit to be solved with Dynamic Programming?',
        options: [
          'Optimal Substructure and Overlapping Subproblems',
          'Random variables and continuous derivatives',
          'Polynomial roots and prime factors',
          'Linear memory and binary output'
        ],
        correct: 0,
        explanation: 'Study Buddy: Dynamic programming solves subproblems once and caches the results (memoization/tabulation) because identical subproblems repeat and subproblem optimal solutions form the global solution.'
      }
    ]
  },

  // LEVEL 3: Electric Storm (Full-Stack & Systems Architecture)
  {
    id: 3,
    name: 'Level 3: Electric Storm Highway',
    subtitle: 'Full-Stack Architecture & High-Scale Systems',
    theme: 'storm',
    skyColor: 0x030712,
    fogColor: 0x0b132b,
    ambientColor: 0x818cf8,
    sunColor: 0x6366f1,
    sunIntensity: 0.85,
    trafficSpeedMin: 0.65,
    trafficSpeedMax: 1.05,
    trafficCount: 18,
    totalDistance: 4050,
    checkpoints: [
      {
        zPos: -600,
        title: 'Checkpoint 1: WebSocket vs HTTP/1.1',
        topic: 'Networking & Protocols',
        question: 'Why are WebSockets preferred for real-time multiplayer leaderboards over HTTP polling?',
        options: [
          'They maintain a persistent full-duplex TCP pipeline with minimal frame header overhead',
          'WebSockets eliminate the need for an internet connection',
          'HTTP/1.1 cannot transmit JSON payloads',
          'WebSockets run on client hardware without servers'
        ],
        correct: 0,
        explanation: 'Study Buddy: HTTP polling requires repeated TLS handshakes and bulky HTTP header exchanges. WebSockets keep a lightweight single TCP socket open for bi-directional live push.'
      },
      {
        zPos: -1300,
        title: 'Checkpoint 2: Redis In-Memory Store',
        topic: 'Caching & State',
        question: 'Which Redis data structure is engineered for lightning-fast real-time student leaderboard rankings?',
        options: [
          'Sorted Set (ZSET with ZADD and ZREVRANGE)',
          'Plain Text Blob',
          'Unordered Set',
          'Bitfield array'
        ],
        correct: 0,
        explanation: 'Study Buddy: Redis Sorted Sets use a skip-list combined with a hash table to keep elements ordered by score with O(log N) updates and range queries.'
      },
      {
        zPos: -2100,
        title: 'Checkpoint 3: Database Indexing',
        topic: 'Database Engineering',
        question: 'Why do relational databases (PostgreSQL/MySQL) utilize B+ Trees for primary key indexes?',
        options: [
          'B+ Trees store all records in leaf nodes connected sequentially for fast range scans and logarithmic depth',
          'B+ Trees encrypt passwords automatically',
          'B+ Trees compress tables into zip archives',
          'B+ Trees do not require disk read operations'
        ],
        correct: 0,
        explanation: 'Study Buddy: In B+ Trees, internal nodes only store navigation keys while all data resides in linked leaf nodes. This maximizes branching factor and makes both key lookups and range scans (BETWEEN) extremely fast.'
      },
      {
        zPos: -3000,
        title: 'Checkpoint 4: Database ACID Properties',
        topic: 'Transactions',
        question: 'In ACID transaction guarantees, what does the "I" (Isolation) ensure?',
        options: [
          'Concurrent transactions execute independently without dirty reads or conflicting states',
          'Transactions run exclusively in one thread',
          'Data is duplicated across multiple continents',
          'Database logs are deleted after every query'
        ],
        correct: 0,
        explanation: 'Study Buddy: Isolation ensures that intermediate transaction operations remain invisible to other concurrent queries until committed, preventing race conditions.'
      },
      {
        zPos: -4000,
        title: 'Checkpoint 5: Asynchronous Event Loops',
        topic: 'Node.js & Concurrency',
        question: 'How does Node.js handle thousands of concurrent I/O operations despite running on a single JavaScript thread?',
        options: [
          'Via the libuv Event Loop and non-blocking asynchronous system kernel notifications (epoll/kqueue)',
          'It spawns a new operating system process for each HTTP request',
          'It runs code directly on the graphics card GPU',
          'It translates JavaScript into synchronous assembly instructions'
        ],
        correct: 0,
        explanation: 'Study Buddy: Node.js delegates I/O calls to the OS kernel or libuv worker thread pool. When the operation completes, the event loop pushes the callback to the queue without ever blocking the main thread.'
      }
    ]
  }
];

// ==========================================================================
// 2. WEB AUDIO SYNTHESIZER (ZERO EXTERNAL ASSET DEPENDENCIES)
// ==========================================================================

class HighwayAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.05, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public startEngine() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      // Low pass filter to make engine rumble deep and smooth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc || this.isMuted) return;
    const baseFreq = 50 + speedRatio * 140; // 50Hz to 190Hz
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
  }

  public playCrashSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Crash noise burst
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const crashFilter = this.ctx.createBiquadFilter();
    crashFilter.type = 'lowpass';
    crashFilter.frequency.setValueAtTime(800, now);
    crashFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    const crashGain = this.ctx.createGain();
    crashGain.gain.setValueAtTime(0.4, now);
    crashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    whiteNoise.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  public playChime(isCorrect: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCorrect ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isCorrect ? 587.33 : 196.0, now); // D5 or G3
    if (isCorrect) {
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.2); // A5
    } else {
      osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.25); // C3
    }

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
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
// 3. AI TRAFFIC VEHICLE CLASS
// ==========================================================================

interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  lane: number;
  length: number;
  width: number;
  modelType: 'sedan' | 'muscle' | 'truck';
}

const HIGHWAY_LANES = [-6.6, -2.2, 2.2, 6.6]; // 4 distinct highway lanes

class TrafficManager {
  public cars: TrafficCar[] = [];
  private scene: THREE.Scene;
  private colors = [0x2563eb, 0x06b6d4, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xec4899, 0xf8fafc, 0x334155];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initTraffic(count: number, minSpeed: number, maxSpeed: number, startZ: number) {
    // Clear old traffic meshes
    this.destroy();

    for (let i = 0; i < count; i++) {
      const laneIdx = Math.floor(Math.random() * HIGHWAY_LANES.length);
      const laneX = HIGHWAY_LANES[laneIdx];
      // Distribute cars ahead of player with generous spacing
      const zPos = startZ - 50 - i * (35 + Math.random() * 25);
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const isTruck = i % 4 === 0;

      const car = this.createTrafficVehicle(isTruck ? 'truck' : (i % 3 === 0 ? 'muscle' : 'sedan'), laneX, zPos, speed, laneIdx);
      this.cars.push(car);
      this.scene.add(car.mesh);
    }
  }

  private createTrafficVehicle(type: 'sedan' | 'muscle' | 'truck', x: number, z: number, speed: number, lane: number): TrafficCar {
    const group = new THREE.Group();
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];

    let width = 2.3;
    let length = 4.6;
    let height = 1.4;

    if (type === 'truck') {
      width = 2.6;
      length = 7.8;
      height = 2.6;

      // Heavy Truck Chassis
      const cabGeo = new THREE.BoxGeometry(width, 1.8, 2.4);
      const cabMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(0, 1.4, -2.4);
      cab.castShadow = true;
      group.add(cab);

      // Cargo Container
      const cargoGeo = new THREE.BoxGeometry(width * 1.05, 2.4, 5.0);
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.2 });
      const cargo = new THREE.Mesh(cargoGeo, cargoMat);
      cargo.position.set(0, 1.7, 1.3);
      cargo.castShadow = true;
      group.add(cargo);

      // Warning hazard strip on back
      const hazardGeo = new THREE.PlaneGeometry(width * 0.9, 0.4);
      const hazardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const hazard = new THREE.Mesh(hazardGeo, hazardMat);
      hazard.position.set(0, 1.8, 3.82);
      group.add(hazard);

      // 6 Truck Wheels
      const tWheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12);
      const tWheelMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
      const tWheelPositions = [
        [-1.35, 0.55, -2.4], [1.35, 0.55, -2.4],
        [-1.35, 0.55, 1.0], [1.35, 0.55, 1.0],
        [-1.35, 0.55, 2.8], [1.35, 0.55, 2.8]
      ];
      tWheelPositions.forEach(pos => {
        const w = new THREE.Mesh(tWheelGeo, tWheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(pos[0], pos[1], pos[2]);
        group.add(w);
      });
    } else {
      // Standard / Muscle Cyber Sedan
      const bodyGeo = new THREE.BoxGeometry(width, 0.8, length);
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      body.castShadow = true;
      group.add(body);

      // Cabin / Windshield
      const cabinGeo = new THREE.BoxGeometry(width * 0.85, 0.65, length * 0.52);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 1.35, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // 4 Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 14);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
      const wheelPositions = [
        [-1.22, 0.44, 1.4], [1.22, 0.44, 1.4],
        [-1.22, 0.44, -1.4], [1.22, 0.44, -1.4]
      ];
      wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(pos[0], pos[1], pos[2]);
        group.add(w);
      });
    }

    // Taillights (Red Neon Glow)
    const tailLightGeo = new THREE.PlaneGeometry(0.6, 0.22);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tailL = new THREE.Mesh(tailLightGeo, tailLightMat);
    tailL.position.set(-width * 0.35, 0.8, length * 0.5 + 0.02);
    const tailR = new THREE.Mesh(tailLightGeo, tailLightMat);
    tailR.position.set(width * 0.35, 0.8, length * 0.5 + 0.02);
    group.add(tailL, tailR);

    // Headlights (Cyan / Warm White)
    const headLightGeo = new THREE.PlaneGeometry(0.6, 0.22);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headL = new THREE.Mesh(headLightGeo, headLightMat);
    headL.rotation.y = Math.PI;
    headL.position.set(-width * 0.35, 0.8, -length * 0.5 - 0.02);
    const headR = new THREE.Mesh(headLightGeo, headLightMat);
    headR.rotation.y = Math.PI;
    headR.position.set(width * 0.35, 0.8, -length * 0.5 - 0.02);
    group.add(headL, headR);

    group.position.set(x, 0, z);

    return {
      mesh: group,
      speed,
      lane,
      length,
      width,
      modelType: type
    };
  }

  public update(playerZ: number, roadMaxZ: number) {
    this.cars.forEach(car => {
      // AI cars drive forward along negative Z at their cruising speed
      car.mesh.position.z -= car.speed;

      // Recycle cars that fall far behind the player (e.g. 50m behind)
      if (car.mesh.position.z > playerZ + 45) {
        // Find an open lane ahead
        const newLaneIdx = Math.floor(Math.random() * HIGHWAY_LANES.length);
        car.mesh.position.x = HIGHWAY_LANES[newLaneIdx];
        car.lane = newLaneIdx;
        // Position far ahead of player (180 to 280 units ahead)
        car.mesh.position.z = playerZ - (180 + Math.random() * 110);
      }

      // If car reaches end of highway, loop it backward
      if (car.mesh.position.z < roadMaxZ - 100) {
        car.mesh.position.z = playerZ - (150 + Math.random() * 80);
      }
    });
  }

  public checkCollision(playerBox: THREE.Box3): TrafficCar | null {
    const tempBox = new THREE.Box3();
    for (const car of this.cars) {
      tempBox.setFromObject(car.mesh);
      // Shrink collision box slightly to allow razor-thin near misses
      tempBox.expandByVector(new THREE.Vector3(-0.25, -0.1, -0.3));
      if (playerBox.intersectsBox(tempBox)) {
        return car;
      }
    }
    return null;
  }

  public destroy() {
    this.cars.forEach(c => {
      this.scene.remove(c.mesh);
    });
    this.cars = [];
  }
}

// ==========================================================================
// 4. MAIN GAME ENGINE CONTROLLER
// ==========================================================================

class KuizuHighwayRacer {
  // DOM References
  private canvas: HTMLCanvasElement;
  private hudSpeedVal: HTMLElement;
  private hudSpeedBar: HTMLElement;
  private hudLevelVal: HTMLElement;
  private hudXpVal: HTMLElement;
  private hudStreakVal: HTMLElement;
  private hudCpCompleted: HTMLElement;
  private hudCpTotal: HTMLElement;
  private hudStageName: HTMLElement;
  private bannerCpTitle: HTMLElement;
  private bannerCpDist: HTMLElement;
  private btnSoundToggle: HTMLElement;
  private iconSoundOn: HTMLElement;
  private iconSoundOff: HTMLElement;

  // Modals
  private quizModal: HTMLElement;
  private quizGateTitle: HTMLElement;
  private quizQuestionText: HTMLElement;
  private quizOptionsList: HTMLElement;
  private quizFeedbackBox: HTMLElement;
  private feedbackHeadline: HTMLElement;
  private feedbackBody: HTMLElement;
  private btnContinueDrive: HTMLElement;

  private crashModal: HTMLElement;
  private crashDistVal: HTMLElement;
  private crashCpVal: HTMLElement;
  private crashStageVal: HTMLElement;
  private btnRestartGame: HTMLElement;

  private victoryModal: HTMLElement;
  private victoryXpList: HTMLElement;
  private btnNextLevel: HTMLElement;

  private levelsModal: HTMLElement;
  private btnOpenLevels: HTMLElement;
  private btnCloseLevels: HTMLElement;

  // Audio Engine
  private audio: HighwayAudioEngine;

  // Three.js Core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // World Elements
  private playerCar: THREE.Group;
  private playerBodyMesh!: THREE.Mesh;
  private trafficManager: TrafficManager;
  private checkpointGates: Array<{
    group: THREE.Group;
    padMesh: THREE.Mesh;
    bannerMesh: THREE.Mesh;
    zPos: number;
    title: string;
  }> = [];
  private highwayMesh: THREE.Mesh | null = null;
  private stripesGroup: THREE.Group = new THREE.Group();
  private streetlightsGroup: THREE.Group = new THREE.Group();
  private sceneryGroup: THREE.Group = new THREE.Group();
  private particlesGroup: THREE.Group = new THREE.Group();

  // Driving & State
  private currentLevelIndex: number = 0;
  private currentLevel: GameLevel;
  private studentXP: number = 120;
  private studentStreak: number = 6;
  private currentCPIndex: number = 0;
  private isPausedForQuiz: boolean = false;
  private isCrashed: boolean = false;
  private quizOpenTime: number = 0;
  private xpAuditLog: string[] = ['[Start] Highway Session Initialized (+120 XP)'];

  // Physics Telemetry
  private speed: number = 0;
  private maxSpeed: number = 1.65;
  private acceleration: number = 0.028;
  private deceleration: number = 0.045;
  private steeringSpeed: number = 0.22;
  private friction: number = 0.978;
  private roadBoundX: number = 9.2;
  private cameraShake: number = 0;

  // Controls State
  private keys: Record<string, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false
  };

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.hudSpeedVal = document.getElementById('hud-speed-val')!;
    this.hudSpeedBar = document.getElementById('hud-speed-bar')!;
    this.hudLevelVal = document.getElementById('hud-level-val')!;
    this.hudXpVal = document.getElementById('hud-xp-val')!;
    this.hudStreakVal = document.getElementById('hud-streak-val')!;
    this.hudCpCompleted = document.getElementById('hud-cp-completed')!;
    this.hudCpTotal = document.getElementById('hud-cp-total')!;
    this.hudStageName = document.getElementById('hud-stage-name')!;
    this.bannerCpTitle = document.getElementById('banner-cp-title')!;
    this.bannerCpDist = document.getElementById('banner-cp-dist')!;
    this.btnSoundToggle = document.getElementById('btn-sound-toggle')!;
    this.iconSoundOn = document.getElementById('icon-sound-on')!;
    this.iconSoundOff = document.getElementById('icon-sound-off')!;

    this.quizModal = document.getElementById('quiz-modal')!;
    this.quizGateTitle = document.getElementById('quiz-gate-title')!;
    this.quizQuestionText = document.getElementById('quiz-question-text')!;
    this.quizOptionsList = document.getElementById('quiz-options-list')!;
    this.quizFeedbackBox = document.getElementById('quiz-feedback-box')!;
    this.feedbackHeadline = document.getElementById('feedback-headline')!;
    this.feedbackBody = document.getElementById('feedback-body')!;
    this.btnContinueDrive = document.getElementById('btn-continue-drive')!;

    this.crashModal = document.getElementById('crash-modal')!;
    this.crashDistVal = document.getElementById('crash-dist-val')!;
    this.crashCpVal = document.getElementById('crash-cp-val')!;
    this.crashStageVal = document.getElementById('crash-stage-val')!;
    this.btnRestartGame = document.getElementById('btn-restart-game')!;

    this.victoryModal = document.getElementById('victory-modal')!;
    this.victoryXpList = document.getElementById('victory-xp-list')!;
    this.btnNextLevel = document.getElementById('btn-next-level')!;

    this.levelsModal = document.getElementById('levels-modal')!;
    this.btnOpenLevels = document.getElementById('btn-open-levels')!;
    this.btnCloseLevels = document.getElementById('btn-close-levels')!;

    this.audio = new HighwayAudioEngine();

    // Load saved XP and streak from Kuizu
    try {
      const savedXp = Number(localStorage.getItem('kuizu_user_xp')) || Number(localStorage.getItem('kuizu_game_xp'));
      if (savedXp) this.studentXP = savedXp;
      const savedStreak = Number(localStorage.getItem('kuizu_user_streak'));
      if (savedStreak) this.studentStreak = savedStreak;
    } catch (_) {}

    this.hudXpVal.textContent = `${this.studentXP}`;
    this.hudLevelVal.textContent = `${Math.floor(this.studentXP / 100) + 1}`;
    this.hudStreakVal.textContent = `${this.studentStreak}`;

    // Initialize with Level 1
    this.currentLevel = GAME_LEVELS[0];

    // Three.js World
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 700);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    this.ambientLight = new THREE.AmbientLight(this.currentLevel.ambientColor, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(this.currentLevel.sunColor, this.currentLevel.sunIntensity);
    this.dirLight.position.set(40, 70, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Groups
    this.scene.add(this.stripesGroup);
    this.scene.add(this.streetlightsGroup);
    this.scene.add(this.sceneryGroup);
    this.scene.add(this.particlesGroup);

    // Player Car & Traffic
    this.playerCar = this.createPlayerCar();
    this.scene.add(this.playerCar);
    this.trafficManager = new TrafficManager(this.scene);

    // Wire Event Listeners
    this.initEvents();

    // Build Current Level
    this.buildLevel(0);

    // Start Rendering Loop
    this.animate();
  }

  // ==========================================
  // BUILD PLAYER CYBER CAR
  // ==========================================
  private createPlayerCar(): THREE.Group {
    const car = new THREE.Group();

    // Chassis Base
    const chassisGeo = new THREE.BoxGeometry(2.4, 0.85, 4.8);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.2,
      metalness: 0.85
    });
    this.playerBodyMesh = new THREE.Mesh(chassisGeo, chassisMat);
    this.playerBodyMesh.position.y = 0.75;
    this.playerBodyMesh.castShadow = true;
    car.add(this.playerBodyMesh);

    // Cockpit / Aerodynamic Canopy
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.65, 2.5);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x070d19,
      roughness: 0.05,
      metalness: 0.95
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.4, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Rear Cyber Spoiler
    const spoilerWingGeo = new THREE.BoxGeometry(2.3, 0.12, 0.6);
    const spoilerWingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    const spoiler = new THREE.Mesh(spoilerWingGeo, spoilerWingMat);
    spoiler.position.set(0, 1.6, 2.15);
    car.add(spoiler);

    const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const p1 = new THREE.Mesh(pillarGeo, spoilerWingMat);
    p1.position.set(-0.85, 1.35, 2.15);
    const p2 = new THREE.Mesh(pillarGeo, spoilerWingMat);
    p2.position.set(0.85, 1.35, 2.15);
    car.add(p1, p2);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.42, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
    const wheelPositions = [
      [-1.3, 0.48, 1.5], [1.3, 0.48, 1.5],
      [-1.3, 0.48, -1.5], [1.3, 0.48, -1.5]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      car.add(wheel);
    });

    // Twin High-Intensity Front Headlights
    const headLightGeo = new THREE.PlaneGeometry(0.65, 0.22);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hL = new THREE.Mesh(headLightGeo, headLightMat);
    hL.rotation.y = Math.PI;
    hL.position.set(-0.85, 0.8, -2.41);
    const hR = new THREE.Mesh(headLightGeo, headLightMat);
    hR.rotation.y = Math.PI;
    hR.position.set(0.85, 0.8, -2.41);
    car.add(hL, hR);

    // Glowing Cyan Underglow Strip
    const underglowGeo = new THREE.PlaneGeometry(2.2, 4.4);
    const underglowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
    const underglow = new THREE.Mesh(underglowGeo, underglowMat);
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.y = 0.08;
    car.add(underglow);

    // Red Tail Lights
    const tailGeo = new THREE.PlaneGeometry(0.7, 0.22);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tL = new THREE.Mesh(tailGeo, tailMat);
    tL.position.set(-0.85, 0.82, 2.41);
    const tR = new THREE.Mesh(tailGeo, tailMat);
    tR.position.set(0.85, 0.82, 2.41);
    car.add(tL, tR);

    return car;
  }

  // ==========================================
  // LEVEL BUILDER & ENVIRONMENT GENERATOR
  // ==========================================
  public buildLevel(levelIdx: number) {
    this.currentLevelIndex = levelIdx;
    this.currentLevel = GAME_LEVELS[levelIdx];
    this.currentCPIndex = 0;
    this.isCrashed = false;
    this.isPausedForQuiz = false;
    this.speed = 0;

    // Reset Player Car position to start of track
    this.playerCar.position.set(0, 0, 0);
    this.playerCar.rotation.set(0, 0, 0);

    // Update HUD
    this.hudStageName.textContent = this.currentLevel.name;
    this.hudCpCompleted.textContent = '0';
    this.hudCpTotal.textContent = `${this.currentLevel.checkpoints.length}`;

    // Apply Sky & Fog Theme
    this.scene.background = new THREE.Color(this.currentLevel.skyColor);
    this.scene.fog = new THREE.Fog(this.currentLevel.fogColor, 70, 320);

    this.ambientLight.color.setHex(this.currentLevel.ambientColor);
    this.dirLight.color.setHex(this.currentLevel.sunColor);
    this.dirLight.intensity = this.currentLevel.sunIntensity;

    // Clear Previous Level Meshes
    if (this.highwayMesh) {
      this.scene.remove(this.highwayMesh);
      this.highwayMesh.geometry.dispose();
    }
    while (this.stripesGroup.children.length > 0) {
      this.stripesGroup.remove(this.stripesGroup.children[0]);
    }
    while (this.streetlightsGroup.children.length > 0) {
      this.streetlightsGroup.remove(this.streetlightsGroup.children[0]);
    }
    while (this.sceneryGroup.children.length > 0) {
      this.sceneryGroup.remove(this.sceneryGroup.children[0]);
    }
    this.checkpointGates.forEach(g => this.scene.remove(g.group));
    this.checkpointGates = [];

    const totalZ = this.currentLevel.totalDistance + 600;

    // 1. Vast Ground Terrain
    const groundGeo = new THREE.PlaneGeometry(500, totalZ);
    const groundColor = this.currentLevel.theme === 'sunset' ? 0x0f172a : (this.currentLevel.theme === 'cyber' ? 0x050814 : 0x020617);
    const groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -totalZ / 2 + 100;
    this.sceneryGroup.add(ground);

    // 2. 4-Lane Asphalt Highway
    const roadWidth = 22;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, totalZ);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x131a29,
      roughness: 0.65,
      metalness: 0.1
    });
    this.highwayMesh = new THREE.Mesh(roadGeo, roadMat);
    this.highwayMesh.rotation.x = -Math.PI / 2;
    this.highwayMesh.position.y = 0.02;
    this.highwayMesh.position.z = -totalZ / 2 + 100;
    this.highwayMesh.receiveShadow = true;
    this.scene.add(this.highwayMesh);

    // 3. Lane Dash Markings (Dividing 4 Lanes)
    const laneDividers = [-4.4, 0, 4.4];
    for (let z = 50; z > -totalZ; z -= 14) {
      laneDividers.forEach(xPos => {
        const stripeGeo = new THREE.PlaneGeometry(0.35, 6);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(xPos, 0.04, z);
        this.stripesGroup.add(stripe);
      });
    }

    // Outer Solid Highway Boundary Lines
    [-10.8, 10.8].forEach(xPos => {
      const lineGeo = new THREE.PlaneGeometry(0.4, totalZ);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(xPos, 0.04, -totalZ / 2 + 100);
      this.stripesGroup.add(line);
    });

    // 4. Concrete Side Barriers with Neon Reflectors
    [-11.4, 11.4].forEach((xPos, sideIdx) => {
      const barrierGeo = new THREE.BoxGeometry(0.6, 1.0, totalZ);
      const barrierMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(xPos, 0.5, -totalZ / 2 + 100);
      this.sceneryGroup.add(barrier);

      // Neon Top Light Strip
      const neonStripGeo = new THREE.BoxGeometry(0.12, 0.1, totalZ);
      const neonColor = sideIdx === 0 ? 0x06b6d4 : 0x3b82f6;
      const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });
      const neonStrip = new THREE.Mesh(neonStripGeo, neonMat);
      neonStrip.position.set(xPos + (sideIdx === 0 ? 0.3 : -0.3), 1.02, -totalZ / 2 + 100);
      this.sceneryGroup.add(neonStrip);
    });

    // 5. Passing Streetlights & Horizon Cyber-Towers
    for (let z = 20; z > -totalZ; z -= 45) {
      [-13.5, 13.5].forEach((xPos, sideIdx) => {
        const poleGroup = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.22, 10, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 5;

        // Overhang Arm
        const armGeo = new THREE.BoxGeometry(3.5, 0.15, 0.15);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(sideIdx === 0 ? 1.7 : -1.7, 9.8, 0);

        // Glowing Lamp Fixture
        const lampGeo = new THREE.BoxGeometry(0.9, 0.2, 0.4);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(sideIdx === 0 ? 3.2 : -3.2, 9.7, 0);

        poleGroup.add(pole, arm, lamp);
        poleGroup.position.set(xPos, 0, z);
        this.streetlightsGroup.add(poleGroup);
      });

      // Roadside Cyber Architecture / Glowing Towers
      if (Math.abs(z) % 90 === 0) {
        [-28 - Math.random() * 15, 28 + Math.random() * 15].forEach(bX => {
          const bH = 25 + Math.random() * 45;
          const bW = 12 + Math.random() * 10;
          const bGeo = new THREE.BoxGeometry(bW, bH, 16);
          const bMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
          const building = new THREE.Mesh(bGeo, bMat);
          building.position.set(bX, bH / 2, z);
          this.sceneryGroup.add(building);

          // Glowing Window Grid
          const winGeo = new THREE.PlaneGeometry(bW * 0.8, bH * 0.8);
          const winMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.6 });
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(bX + (bX > 0 ? -bW / 2 - 0.05 : bW / 2 + 0.05), bH / 2, z);
          win.rotation.y = bX > 0 ? -Math.PI / 2 : Math.PI / 2;
          this.sceneryGroup.add(win);
        });
      }
    }

    // 6. Checkpoint Holographic Arches (spaced with longer distances)
    this.currentLevel.checkpoints.forEach((cp, idx) => {
      const gateGroup = new THREE.Group();

      // Giant Gate Pillars
      const pGeo = new THREE.CylinderGeometry(0.45, 0.55, 10, 16);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
      const pLeft = new THREE.Mesh(pGeo, pMat);
      pLeft.position.set(-11.2, 5, 0);
      const pRight = new THREE.Mesh(pGeo, pMat);
      pRight.position.set(11.2, 5, 0);

      // Neon Ring Accents around pillars
      for (let r = 2; r <= 8; r += 2) {
        const ringGeo = new THREE.TorusGeometry(0.65, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const rL = new THREE.Mesh(ringGeo, ringMat);
        rL.rotation.x = Math.PI / 2;
        rL.position.set(-11.2, r, 0);
        const rR = new THREE.Mesh(ringGeo, ringMat);
        rR.rotation.x = Math.PI / 2;
        rR.position.set(11.2, r, 0);
        gateGroup.add(rL, rR);
      }

      // Overhead Electronic Arch Banner
      const archGeo = new THREE.BoxGeometry(23.2, 2.2, 1.2);
      const archMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, 9.8, 0);

      // Glowing Neon Checkpoint Sign Bar
      const signBarGeo = new THREE.BoxGeometry(22.6, 1.4, 0.4);
      const signBarMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
      const signBar = new THREE.Mesh(signBarGeo, signBarMat);
      signBar.position.set(0, 9.8, 0.55);

      // Holographic Ground Check-in Pad
      const padGeo = new THREE.PlaneGeometry(21.8, 6.5);
      const padMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0, 0.06, 0);

      gateGroup.add(pLeft, pRight, arch, signBar, pad);
      gateGroup.position.z = cp.zPos;
      this.scene.add(gateGroup);

      this.checkpointGates.push({
        group: gateGroup,
        padMesh: pad,
        bannerMesh: signBar,
        zPos: cp.zPos,
        title: cp.title
      });
    });

    // 7. Spawn Dynamic Traffic
    this.trafficManager.initTraffic(
      this.currentLevel.trafficCount,
      this.currentLevel.trafficSpeedMin,
      this.currentLevel.trafficSpeedMax,
      0
    );

    // Update banner for first checkpoint
    this.updateCheckpointBanner();
  }

  // ==========================================
  // EVENT WIRING & INPUT HANDLING
  // ==========================================
  private initEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }

      // Quick restart via Spacebar when crashed
      if (e.code === 'Space' && this.isCrashed) {
        e.preventDefault();
        this.restartLevel();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Sound toggle button
    this.btnSoundToggle.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.iconSoundOn.style.display = isMuted ? 'none' : 'block';
      this.iconSoundOff.style.display = isMuted ? 'block' : 'none';
    });

    // Continue driving button in Quiz Modal
    this.btnContinueDrive.addEventListener('click', () => {
      this.closeQuizModal();
    });

    // Restart button in Crash Modal
    this.btnRestartGame.addEventListener('click', () => {
      this.restartLevel();
    });

    // Next Level button in Victory Modal
    this.btnNextLevel.addEventListener('click', () => {
      this.victoryModal.classList.remove('is-active');
      const nextIdx = (this.currentLevelIndex + 1) % GAME_LEVELS.length;
      this.buildLevel(nextIdx);
    });

    // Level selector modal triggers
    this.btnOpenLevels.addEventListener('click', () => {
      this.levelsModal.classList.add('is-active');
    });

    this.btnCloseLevels.addEventListener('click', () => {
      this.levelsModal.classList.remove('is-active');
    });

    document.querySelectorAll('.level-select-row').forEach(row => {
      row.addEventListener('click', () => {
        const lvl = parseInt(row.getAttribute('data-level') || '1', 10) - 1;
        document.querySelectorAll('.level-select-row').forEach(r => r.classList.remove('is-selected'));
        row.classList.add('is-selected');
        this.levelsModal.classList.remove('is-active');
        this.buildLevel(lvl);
      });
    });
  }

  // ==========================================
  // QUIZ CHECKPOINT CHALLENGE MODAL FLOW
  // ==========================================
  private triggerCheckpointQuiz(cpIndex: number) {
    this.isPausedForQuiz = true;
    this.speed = 0;
    this.quizOpenTime = performance.now();

    const cp = this.currentLevel.checkpoints[cpIndex];
    this.quizGateTitle.textContent = `${cp.title} • ${cp.topic}`;
    this.quizQuestionText.textContent = cp.question;

    this.quizOptionsList.innerHTML = '';
    this.quizFeedbackBox.className = 'quiz-feedback-box';
    this.btnContinueDrive.classList.remove('show');

    cp.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option-btn';
      btn.innerHTML = `<span>${optText}</span><span class="quiz-option-num">#${idx + 1}</span>`;
      btn.onclick = () => this.evaluateAnswer(cpIndex, idx, btn);
      this.quizOptionsList.appendChild(btn);
    });

    this.quizModal.classList.add('is-active');
  }

  private evaluateAnswer(cpIndex: number, selectedIdx: number, clickedBtn: HTMLButtonElement) {
    const responseTime = performance.now() - this.quizOpenTime;
    const cp = this.currentLevel.checkpoints[cpIndex];
    const allBtns = this.quizOptionsList.querySelectorAll<HTMLButtonElement>('.quiz-option-btn');
    allBtns.forEach(b => (b.disabled = true));

    const isCorrect = selectedIdx === cp.correct;
    this.audio.playChime(isCorrect);

    let antiSpamWarning = '';
    if (responseTime < 1200) {
      antiSpamWarning = '<div style="margin-top:6px; font-size:12px; color:#fca5a5;">Anti-Gaming Shield: Answer submitted in less than 1.2s. Consider reading options carefully.</div>';
    }

    if (isCorrect) {
      clickedBtn.classList.add('correct');
      this.awardXP(25, `${cp.title} (+25 XP Challenge Cleared)`);
      this.quizFeedbackBox.className = 'quiz-feedback-box is-correct';
      this.feedbackHeadline.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Spot On! Perfect Execution (+25 XP)</span>
      `;
      this.feedbackBody.innerHTML = `<div>${cp.explanation}</div>${antiSpamWarning}`;
    } else {
      clickedBtn.classList.add('wrong');
      allBtns[cp.correct].classList.add('correct');
      this.awardXP(15, `${cp.title} (+15 Participation XP)`);
      this.quizFeedbackBox.className = 'quiz-feedback-box is-wrong';
      this.feedbackHeadline.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Concept Review (+15 XP)</span>
      `;
      this.feedbackBody.innerHTML = `<div>${cp.explanation}</div>${antiSpamWarning}`;
    }

    // Turn checkpoint gate in 3D world to glowing emerald green
    const gateObj = this.checkpointGates[cpIndex];
    (gateObj.padMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
    (gateObj.bannerMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);

    this.currentCPIndex++;
    this.hudCpCompleted.textContent = `${this.currentCPIndex}`;
    this.btnContinueDrive.classList.add('show');
  }

  private closeQuizModal() {
    this.quizModal.classList.remove('is-active');

    // If all checkpoints completed, show victory!
    if (this.currentCPIndex >= this.currentLevel.checkpoints.length) {
      this.triggerStageVictory();
    } else {
      this.isPausedForQuiz = false;
      this.updateCheckpointBanner();
    }
  }

  // ==========================================
  // STAGE VICTORY SCREEN
  // ==========================================
  private triggerStageVictory() {
    this.isPausedForQuiz = true;
    this.awardXP(60, `Stage Victory: ${this.currentLevel.name} (+60 Bonus XP)`);

    // Increment streak
    this.studentStreak++;
    this.hudStreakVal.textContent = `${this.studentStreak}`;

    // Populate Audit Log
    this.victoryXpList.innerHTML = this.xpAuditLog.map(item => `<div>• ${item}</div>`).join('');
    this.victoryModal.classList.add('is-active');
  }

  // ==========================================
  // HIGHWAY COLLISION CRASH FLOW
  // ==========================================
  private triggerHighwayCrash() {
    this.isCrashed = true;
    this.speed = 0;
    this.cameraShake = 1.4;

    this.audio.playCrashSound();
    this.audio.stopEngine();

    // Spawn 3D crash particles
    this.spawnCrashExplosion(this.playerCar.position.clone());

    // Update crash stats
    const distMetres = Math.abs(Math.round(this.playerCar.position.z));
    this.crashDistVal.textContent = `${distMetres}`;
    this.crashCpVal.textContent = `${this.currentCPIndex}`;
    this.crashStageVal.textContent = `Lvl ${this.currentLevel.id}`;

    // Show crash modal after brief shock moment
    setTimeout(() => {
      this.crashModal.classList.add('is-active');
    }, 450);
  }

  private spawnCrashExplosion(pos: THREE.Vector3) {
    const particleCount = 35;
    for (let i = 0; i < particleCount; i++) {
      const pGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const pMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xef4444 : 0xf59e0b
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(pos);
      p.position.y += 0.8;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.45,
        Math.random() * 0.35 + 0.1,
        (Math.random() - 0.5) * 0.45
      );

      this.particlesGroup.add(p);

      // Animate particle briefly then remove
      let life = 0;
      const interval = setInterval(() => {
        p.position.add(vel);
        vel.y -= 0.015; // gravity
        life++;
        if (life > 28) {
          clearInterval(interval);
          this.particlesGroup.remove(p);
          pGeo.dispose();
        }
      }, 16);
    }
  }

  private restartLevel() {
    this.crashModal.classList.remove('is-active');
    this.buildLevel(this.currentLevelIndex);
  }

  // ==========================================
  // GAMIFICATION & XP DISPATCH
  // ==========================================
  private awardXP(amount: number, reason: string) {
    this.studentXP += amount;
    const calculatedLevel = Math.floor(this.studentXP / 100) + 1;
    this.hudXpVal.textContent = `${this.studentXP}`;
    this.hudLevelVal.textContent = `${calculatedLevel}`;
    this.xpAuditLog.push(`+${amount} XP — ${reason}`);

    // Sync to localStorage
    try {
      localStorage.setItem('kuizu_game_xp', `${this.studentXP}`);
      localStorage.setItem('kuizu_user_xp', `${this.studentXP}`);
    } catch (_) {}
  }

  private updateCheckpointBanner() {
    if (this.currentCPIndex < this.currentLevel.checkpoints.length) {
      const nextCP = this.currentLevel.checkpoints[this.currentCPIndex];
      const dist = Math.max(0, Math.round(this.playerCar.position.z - nextCP.zPos));
      this.bannerCpTitle.textContent = nextCP.title;
      this.bannerCpDist.textContent = `${dist}`;
    }
  }

  // ==========================================
  // MAIN ANIMATION & PHYSICS ENGINE
  // ==========================================
  private animate = () => {
    requestAnimationFrame(this.animate);

    if (!this.isPausedForQuiz && !this.isCrashed) {
      // 1. Controls & Acceleration Physics
      const forward = this.keys.ArrowUp || this.keys.w;
      const backward = this.keys.ArrowDown || this.keys.s;
      const left = this.keys.ArrowLeft || this.keys.a;
      const right = this.keys.ArrowRight || this.keys.d;

      if (forward) {
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration);
        this.audio.startEngine();
      } else if (backward) {
        this.speed = Math.max(-this.maxSpeed * 0.4, this.speed - this.deceleration);
      } else {
        this.speed *= this.friction;
      }

      // Steering
      if (Math.abs(this.speed) > 0.02) {
        if (left) {
          this.playerCar.position.x = Math.max(-this.roadBoundX, this.playerCar.position.x - this.steeringSpeed);
          this.playerCar.rotation.y = THREE.MathUtils.lerp(this.playerCar.rotation.y, 0.08, 0.15);
        } else if (right) {
          this.playerCar.position.x = Math.min(this.roadBoundX, this.playerCar.position.x + this.steeringSpeed);
          this.playerCar.rotation.y = THREE.MathUtils.lerp(this.playerCar.rotation.y, -0.08, 0.15);
        } else {
          this.playerCar.rotation.y = THREE.MathUtils.lerp(this.playerCar.rotation.y, 0, 0.15);
        }
      }

      // Move player forward (negative Z along highway)
      this.playerCar.position.z -= this.speed;

      // Update Audio Engine Pitch
      this.audio.updateEnginePitch(Math.abs(this.speed) / this.maxSpeed);

      // Update Speedometer UI (scaled to km/h)
      const kmh = Math.abs(Math.round(this.speed * 115));
      this.hudSpeedVal.textContent = `${kmh}`;
      this.hudSpeedBar.style.width = `${Math.min(100, (kmh / 190) * 100)}%`;

      // 2. Traffic Vehicle Updates
      this.trafficManager.update(this.playerCar.position.z, -this.currentLevel.totalDistance);

      // 3. Collision Detection against Traffic
      const playerBox = new THREE.Box3().setFromObject(this.playerCar);
      const hitCar = this.trafficManager.checkCollision(playerBox);
      if (hitCar) {
        this.triggerHighwayCrash();
      }

      // 4. Checkpoint Trigger Detection
      if (this.currentCPIndex < this.currentLevel.checkpoints.length) {
        const nextCP = this.currentLevel.checkpoints[this.currentCPIndex];
        const dist = Math.max(0, Math.round(this.playerCar.position.z - nextCP.zPos));
        this.bannerCpDist.textContent = `${dist}`;

        // When player car passes or reaches the checkpoint gate Z coordinate
        if (this.playerCar.position.z <= nextCP.zPos) {
          this.triggerCheckpointQuiz(this.currentCPIndex);
        }
      }

      // 5. Camera Follow Physics
      const targetCamX = this.playerCar.position.x * 0.45;
      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.12;
      this.camera.position.y = 4.4;
      this.camera.position.z = this.playerCar.position.z + 11.2;

      // Look ahead of car down highway
      const lookZ = this.playerCar.position.z - 18;
      this.camera.lookAt(this.playerCar.position.x * 0.3, 1.4, lookZ);
    }

    // Camera shake effect on impact
    if (this.cameraShake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= 0.88;
    }

    this.renderer.render(this.scene, this.camera);
  };
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new KuizuHighwayRacer();
});
