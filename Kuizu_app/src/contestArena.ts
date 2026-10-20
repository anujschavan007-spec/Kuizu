import { highlightCode } from './services/codeHighlighter';
import { getCompilerSettings, saveCompilerTheme, applyCompilerTheme } from './services/compilerThemeManager';

declare const confetti: any;

interface ArenaTestCase {
  num: number;
  input: string;
  expectedOutput: string;
  yourOutput?: string;
  status?: 'Passed' | 'Failed' | 'Ready';
}

interface ArenaQuestion {
  id: string;
  num: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Array<{
    num: number;
    input: string;
    output: string;
    explanation?: string;
  }>;
  timeLimit: string;
  memLimit: string;
  attempts: string;
  starters: Record<string, string>;
  testcases: ArenaTestCase[];
  solved: boolean;
  userCode?: Record<string, string>;
  submittedCode?: string;
  submittedLang?: string;
}

// ===========================================================
// ANTI-GAMING & PROCTORING CONTROLLER FOR CONTEST COMPILER
// ===========================================================
let isContestRunning = true;
let lastAntiGamingWarningTime = 0;
let tabSwitchViolations = 0;

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Throttled warning toast for anti-gaming violations (prevents toast spamming on rapid keypresses)
function showAntiGamingWarning(message: string, duration = 3200) {
  const now = Date.now();
  if (now - lastAntiGamingWarningTime < 800) return;
  lastAntiGamingWarningTime = now;

  let toast = document.getElementById('arena-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arena-toast';
    document.body.appendChild(toast);
  }
  toast.className = 'contest-toast antigaming-warning';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  toast.classList.add('show');
  setTimeout(() => {
    toast?.classList.remove('show');
  }, duration);
}

// Clean normal toast notification
function showToast(message: string, duration = 3500) {
  let toast = document.getElementById('arena-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arena-toast';
    document.body.appendChild(toast);
  }
  toast.className = 'contest-toast';
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast?.classList.remove('show');
  }, duration);
}

function updateAntiGamingStatus(running: boolean) {
  isContestRunning = running;
  if (running) {
    document.body.classList.add('antigaming-active');
  } else {
    document.body.classList.remove('antigaming-active');
  }
}

// Initialize active anti-gaming lock for contest session
updateAntiGamingStatus(true);

// Fallback questions with clean, accurate test cases (all start as 'Ready', no fake passed)
const DEFAULT_CONTEST_QUESTIONS: ArenaQuestion[] = [
  {
    id: 'contest-q1',
    num: 1,
    title: 'Sum of Two Numbers',
    difficulty: 'Easy',
    description: 'Given two integers A and B, return their sum.\n\nThe input consists of two integers. The output should be the sum of the two integers.',
    inputFormat: 'The first line contains an integer A. The second line contains an integer B.',
    outputFormat: 'Print the sum of A and B.',
    constraints: ['1 ≤ A, B ≤ 10⁹', 'Time limit: 1 sec | Memory limit: 256 MB'],
    examples: [
      {
        num: 1,
        input: '5\n7',
        output: '12',
        explanation: '5 + 7 = 12'
      }
    ],
    timeLimit: '1 sec',
    memLimit: '256 MB',
    attempts: '1.2K attempts',
    starters: {
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << a + b << endl;\n    }\n    return 0;\n}`,
      python: `import sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if len(lines) >= 2:\n        a = int(lines[0])\n        b = int(lines[1])\n        print(a + b)\n\nif __name__ == '__main__':\n    main()`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(a + b);\n        }\n    }\n}`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (input.length >= 2) {\n    const a = parseInt(input[0], 10);\n    const b = parseInt(input[1], 10);\n    console.log(a + b);\n}`,
      typescript: `import * as fs from 'fs';\nconst input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\nif (input.length >= 2) {\n    const a = parseInt(input[0], 10);\n    const b = parseInt(input[1], 10);\n    console.log(a + b);\n}`,
      csharp: `using System;\n\nclass Program {\n    static void Main() {\n        string input = Console.ReadLine();\n        if (input != null) {\n            string[] parts = input.Split(' ');\n            if (parts.Length >= 2) {\n                Console.WriteLine(int.Parse(parts[0]) + int.Parse(parts[1]));\n            }\n        }\n    }\n}`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    var a, b int\n    if _, err := fmt.Scan(&a, &b); err == nil {\n        fmt.Println(a + b)\n    }\n}`
    },
    testcases: [
      { num: 1, input: '5\n7', expectedOutput: '12', yourOutput: '-', status: 'Ready' },
      { num: 2, input: '100\n200', expectedOutput: '300', yourOutput: '-', status: 'Ready' },
      { num: 3, input: '-1\n5', expectedOutput: '4', yourOutput: '-', status: 'Ready' }
    ],
    solved: false
  },
  {
    id: 'contest-q2',
    num: 2,
    title: 'Find the Maximum',
    difficulty: 'Medium',
    description: 'Given an array of N integers, find the maximum element present in the array.',
    inputFormat: 'The first line contains N. The second line contains N space-separated integers.',
    outputFormat: 'Print the maximum value found in the array.',
    constraints: ['1 ≤ N ≤ 10⁵', '-10⁹ ≤ A[i] ≤ 10⁹'],
    examples: [
      {
        num: 1,
        input: '5\n1 8 3 9 2',
        output: '9',
        explanation: 'The largest number among 1, 8, 3, 9, 2 is 9.'
      }
    ],
    timeLimit: '1 sec',
    memLimit: '256 MB',
    attempts: '950 attempts',
    starters: {
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    long long maxVal = -1e18;\n    for (int i = 0; i < n; i++) {\n        long long x;\n        cin >> x;\n        if (x > maxVal) maxVal = x;\n    }\n    cout << maxVal << endl;\n    return 0;\n}`,
      python: `import sys\n\ndef main():\n    nums = list(map(int, sys.stdin.read().split()))\n    if len(nums) > 1:\n        print(max(nums[1:]))\n\nif __name__ == '__main__':\n    main()`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            long max = Long.MIN_VALUE;\n            for (int i = 0; i < n; i++) {\n                long x = sc.nextLong();\n                if (x > max) max = x;\n            }\n            System.out.println(max);\n        }\n    }\n}`,
      javascript: `const fs = require('fs');\nconst nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nif (nums.length > 1) {\n    console.log(Math.max(...nums.slice(1)));\n}`,
      typescript: `import * as fs from 'fs';\nconst nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nif (nums.length > 1) {\n    console.log(Math.max(...nums.slice(1)));\n}`,
      csharp: `using System;\nusing System.Linq;\n\nclass Program {\n    static void Main() {\n        var tokens = Console.In.ReadToEnd().Split(new[] {' ', '\\n', '\\r', '\\t'}, StringSplitOptions.RemoveEmptyEntries);\n        if (tokens.Length > 1) {\n            long max = tokens.Skip(1).Select(long.Parse).Max();\n            Console.WriteLine(max);\n        }\n    }\n}`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    var n int\n    if _, err := fmt.Scan(&n); err == nil && n > 0 {\n        var maxVal, x int64\n        fmt.Scan(&maxVal)\n        for i := 1; i < n; i++ {\n            fmt.Scan(&x)\n            if x > maxVal { maxVal = x }\n        }\n        fmt.Println(maxVal)\n    }\n}`
    },
    testcases: [
      { num: 1, input: '5\n1 8 3 9 2', expectedOutput: '9', yourOutput: '-', status: 'Ready' },
      { num: 2, input: '3\n-5 -2 -9', expectedOutput: '-2', yourOutput: '-', status: 'Ready' },
      { num: 3, input: '4\n100 100 50 100', expectedOutput: '100', yourOutput: '-', status: 'Ready' }
    ],
    solved: false
  },
  {
    id: 'contest-q3',
    num: 3,
    title: 'Reverse a String',
    difficulty: 'Medium',
    description: 'Given a string S, reverse the string characters and output the reversed string.',
    inputFormat: 'A single string S without spaces.',
    outputFormat: 'Print the reversed string.',
    constraints: ['1 ≤ |S| ≤ 10⁴', 'S consists of ASCII characters.'],
    examples: [
      {
        num: 1,
        input: 'hello',
        output: 'olleh',
        explanation: 'Reversing "hello" produces "olleh".'
      }
    ],
    timeLimit: '1 sec',
    memLimit: '256 MB',
    attempts: '1.5K attempts',
    starters: {
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        reverse(s.begin(), s.end());\n        cout << s << endl;\n    }\n    return 0;\n}`,
      python: `import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    print(s[::-1])\n\nif __name__ == '__main__':\n    main()`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String s = sc.next();\n            System.out.println(new StringBuilder(s).reverse().toString());\n        }\n    }\n}`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(s.split('').reverse().join(''));`,
      typescript: `import * as fs from 'fs';\nconst s = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(s.split('').reverse().join(''));`,
      csharp: `using System;\n\nclass Program {\n    static void Main() {\n        string s = Console.ReadLine();\n        if (s != null) {\n            char[] arr = s.ToCharArray();\n            Array.Reverse(arr);\n            Console.WriteLine(new string(arr));\n        }\n    }\n}`,
      go: `package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    var s string\n    if _, err := fmt.Scan(&s); err == nil {\n        r := []rune(s)\n        for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {\n            r[i], r[j] = r[j], r[i]\n        }\n        fmt.Println(string(r))\n    }\n}`
    },
    testcases: [
      { num: 1, input: 'hello', expectedOutput: 'olleh', yourOutput: '-', status: 'Ready' },
      { num: 2, input: 'kuizu', expectedOutput: 'uziuk', yourOutput: '-', status: 'Ready' },
      { num: 3, input: 'racecar', expectedOutput: 'racecar', yourOutput: '-', status: 'Ready' }
    ],
    solved: false
  },
  {
    id: 'contest-q4',
    num: 4,
    title: 'Check for Palindrome',
    difficulty: 'Hard',
    description: 'Determine if a given string is a palindrome, considering only alphanumeric characters and ignoring cases.',
    inputFormat: 'A single string S.',
    outputFormat: 'Print "true" if the string is a palindrome, otherwise "false".',
    constraints: ['1 ≤ |S| ≤ 2 * 10⁵'],
    examples: [
      {
        num: 1,
        input: 'racecar',
        output: 'true',
        explanation: '"racecar" is a palindrome.'
      }
    ],
    timeLimit: '1.5 sec',
    memLimit: '256 MB',
    attempts: '680 attempts',
    starters: {
      cpp: `#include <iostream>\n#include <string>\n#include <cctype>\nusing namespace std;\n\nint main() {\n    string s, clean = "";\n    if (getline(cin, s)) {\n        for (char c : s) {\n            if (isalnum(c)) clean += tolower(c);\n        }\n        int l = 0, r = (int)clean.length() - 1;\n        bool isPal = true;\n        while (l < r) {\n            if (clean[l++] != clean[r--]) { isPal = false; break; }\n        }\n        cout << (isPal ? "true" : "false") << endl;\n    }\n    return 0;\n}`,
      python: `import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    clean = [c.lower() for c in s if c.isalnum()]\n    print("true" if clean == clean[::-1] else "false")\n\nif __name__ == '__main__':\n    main()`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : "";\n        StringBuilder sb = new StringBuilder();\n        for (char c : s.toCharArray()) {\n            if (Character.isLetterOrDigit(c)) sb.append(Character.toLowerCase(c));\n        }\n        String clean = sb.toString();\n        String rev = sb.reverse().toString();\n        System.out.println(clean.equals(rev) ? "true" : "false");\n    }\n}`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8');\nconst clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\nconst rev = clean.split('').reverse().join('');\nconsole.log(clean === rev ? 'true' : 'false');`,
      typescript: `import * as fs from 'fs';\nconst s = fs.readFileSync(0, 'utf-8');\nconst clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\nconst rev = clean.split('').reverse().join('');\nconsole.log(clean === rev ? 'true' : 'false');`,
      csharp: `using System;\nusing System.Linq;\n\nclass Program {\n    static void Main() {\n        string s = Console.ReadLine() ?? "";\n        string clean = new string(s.ToLower().Where(char.IsLetterOrDigit).ToArray());\n        string rev = new string(clean.Reverse().ToArray());\n        Console.WriteLine(clean == rev ? "true" : "false");\n    }\n}`,
      go: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n    "unicode"\n)\n\nfunc main() {\n    scanner := bufio.NewScanner(os.Stdin)\n    if scanner.Scan() {\n        s := scanner.Text()\n        var clean []rune\n        for _, r := range s {\n            if unicode.IsLetter(r) || unicode.IsDigit(r) {\n                clean = append(clean, unicode.ToLower(r))\n            }\n        }\n        isPal := true\n        for i, j := 0, len(clean)-1; i < j; i, j = i+1, j-1 {\n            if clean[i] != clean[j] { isPal = false; break }\n        }\n        if isPal { fmt.Println("true") } else { fmt.Println("false") }\n    }\n}`
    },
    testcases: [
      { num: 1, input: 'racecar', expectedOutput: 'true', yourOutput: '-', status: 'Ready' },
      { num: 2, input: 'hello', expectedOutput: 'false', yourOutput: '-', status: 'Ready' },
      { num: 3, input: 'A man a plan a canal Panama', expectedOutput: 'true', yourOutput: '-', status: 'Ready' }
    ],
    solved: false
  },
  {
    id: 'contest-q5',
    num: 5,
    title: 'Fibonacci Series',
    difficulty: 'Hard',
    description: 'Calculate the N-th Fibonacci number modulo 10⁹ + 7. F(0) = 0, F(1) = 1.',
    inputFormat: 'A single non-negative integer N.',
    outputFormat: 'Print the N-th Fibonacci number mod 1000000007.',
    constraints: ['0 ≤ N ≤ 10⁵'],
    examples: [
      {
        num: 1,
        input: '4',
        output: '3',
        explanation: 'F(0)=0, F(1)=1, F(2)=1, F(3)=2, F(4)=3'
      }
    ],
    timeLimit: '1 sec',
    memLimit: '256 MB',
    attempts: '890 attempts',
    starters: {
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    if (n == 0) { cout << 0; return 0; }\n    long long a = 0, b = 1, mod = 1e9 + 7;\n    for (int i = 2; i <= n; i++) {\n        long long c = (a + b) % mod;\n        a = b;\n        b = c;\n    }\n    cout << b << endl;\n    return 0;\n}`,
      python: `import sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n = int(lines[0])\n    if n == 0: print(0); return\n    a, b = 0, 1\n    mod = 10**9 + 7\n    for _ in range(2, n + 1):\n        a, b = b, (a + b) % mod\n    print(b)\n\nif __name__ == '__main__':\n    main()`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            if (n == 0) { System.out.println(0); return; }\n            long a = 0, b = 1, mod = 1000000007L;\n            for (int i = 2; i <= n; i++) {\n                long c = (a + b) % mod;\n                a = b;\n                b = c;\n            }\n            System.out.println(b);\n        }\n    }\n}`,
      javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);\nif (n === 0) { console.log(0); } else {\n    let a = 0n, b = 1n, mod = 1000000007n;\n    for (let i = 2; i <= n; i++) {\n        let c = (a + b) % mod;\n        a = b;\n        b = c;\n    }\n    console.log(b.toString());\n}`,
      typescript: `import * as fs from 'fs';\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);\nif (n === 0) { console.log(0); } else {\n    let a = 0n, b = 1n, mod = 1000000007n;\n    for (let i = 2; i <= n; i++) {\n        let c = (a + b) % mod;\n        a = b;\n        b = c;\n    }\n    console.log(b.toString());\n}`,
      csharp: `using System;\n\nclass Program {\n    static void Main() {\n        string input = Console.ReadLine();\n        if (input != null && int.TryParse(input, out int n)) {\n            if (n == 0) { Console.WriteLine(0); return; }\n            long a = 0, b = 1, mod = 1000000007L;\n            for (int i = 2; i <= n; i++) {\n                long c = (a + b) % mod;\n                a = b;\n                b = c;\n            }\n            Console.WriteLine(b);\n        }\n    }\n}`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    var n int\n    if _, err := fmt.Scan(&n); err == nil {\n        if n == 0 { fmt.Println(0); return }\n        a, b, mod := int64(0), int64(1), int64(1000000007)\n        for i := 2; i <= n; i++ {\n            c := (a + b) % mod\n            a = b\n            b = c\n        }\n        fmt.Println(b)\n    }\n}`
    },
    testcases: [
      { num: 1, input: '4', expectedOutput: '3', yourOutput: '-', status: 'Ready' },
      { num: 2, input: '10', expectedOutput: '55', yourOutput: '-', status: 'Ready' },
      { num: 3, input: '0', expectedOutput: '0', yourOutput: '-', status: 'Ready' }
    ],
    solved: false
  }
];

let questions: ArenaQuestion[] = [...DEFAULT_CONTEST_QUESTIONS];
let currentIndex = 0;

// Elements
const questionTracker = document.getElementById('arena-question-tracker');
const ratioTracker = document.getElementById('arena-ratio-tracker');
const progressBar = document.getElementById('arena-progress-bar');
const prevBtn = document.getElementById('btn-prev-question') as HTMLButtonElement | null;
const nextBtn = document.getElementById('btn-next-question') as HTMLButtonElement | null;
const resetBtn = document.getElementById('btn-reset-code') as HTMLButtonElement | null;

const problemTitle = document.getElementById('arena-problem-title');
const difficultyPill = document.getElementById('arena-difficulty-pill');
const timeLimit = document.getElementById('arena-time-limit');
const memLimit = document.getElementById('arena-mem-limit');
const attemptsCount = document.getElementById('arena-attempts-count');
const problemDesc = document.getElementById('arena-problem-desc');
const inputFormat = document.getElementById('arena-problem-input-format');
const outputFormat = document.getElementById('arena-problem-output-format');
const constraintsList = document.getElementById('arena-problem-constraints');
const examplesContainer = document.getElementById('arena-examples-container');

const codeEditor = document.getElementById('arena-code-editor') as HTMLTextAreaElement | null;
const highlightLayer = document.getElementById('arena-highlight-layer');
const gutter = document.getElementById('arena-gutter');
const langSelect = document.getElementById('arena-code-language') as HTMLSelectElement | null;
const runBtn = document.getElementById('btn-arena-run') as HTMLButtonElement | null;
const submitBtn = document.getElementById('btn-arena-submit') as HTMLButtonElement | null;
const fullscreenBtn = document.getElementById('btn-arena-fullscreen');
const editorBody = document.getElementById('arena-editor-body');

const testcasesRows = document.getElementById('arena-testcases-rows');
const tcBanner = document.getElementById('arena-tc-banner');
const tcBannerText = document.getElementById('arena-tc-banner-text');

const questionsList = document.getElementById('arena-questions-list');
const sidebarTitle = document.getElementById('arena-sidebar-title');

// Sidebar toggle buttons & elements
const arenaGrid = document.querySelector('.contest-arena-grid');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnToggleSidebarTop = document.getElementById('btn-toggle-sidebar-top');
const btnSeeAllQuestions = document.getElementById('btn-see-all-questions');
const labelSidebarToggle = document.getElementById('label-sidebar-toggle');

// Tabs
const tabCases = document.getElementById('tab-arena-cases');
const tabMyOutput = document.getElementById('tab-arena-myoutput');
const tabExpected = document.getElementById('tab-arena-expected');
const panelCases = document.getElementById('arena-panel-testcases');
const panelMyOutput = document.getElementById('arena-panel-myoutput');
const panelExpected = document.getElementById('arena-panel-expected');
const consoleBox = document.getElementById('arena-console-box');
const expectedBox = document.getElementById('arena-expected-box');

// Contest Summary Modal Elements
const btnSubmitContest = document.getElementById('btn-submit-contest') as HTMLButtonElement | null;
const modalContestSummary = document.getElementById('modal-contest-summary');
const btnCloseSummaryModal = document.getElementById('btn-close-summary-modal');
const btnSummaryClose = document.getElementById('btn-summary-close');
const summaryModalTitle = document.getElementById('summary-modal-title');
const summarySolvedCount = document.getElementById('summary-solved-count');
const summaryXpEarned = document.getElementById('summary-xp-earned');
const summaryStatusLabel = document.getElementById('summary-status-label');
const summaryQuestionTabs = document.getElementById('summary-question-tabs');
const summaryCodeTitle = document.getElementById('summary-code-title');
const summaryCodeDiff = document.getElementById('summary-code-diff');
const summaryCodeLang = document.getElementById('summary-code-lang');
const btnCopySummaryCode = document.getElementById('btn-copy-summary-code');
const summaryCodeBlock = document.getElementById('summary-code-block');

// Theme & Font Size Setup from Settings
const selectArenaTheme = document.getElementById('select-arena-theme') as HTMLSelectElement | null;
const arenaEditorCard = document.querySelector('.arena-editor-card') as HTMLElement | null;
const arenaEditorBodyEl = document.getElementById('arena-editor-body');
const btnArenaSubmissions = document.getElementById('btn-arena-submissions') as HTMLAnchorElement | null;

const arenaCompilerSettings = getCompilerSettings();
applyCompilerTheme(arenaEditorBodyEl, arenaCompilerSettings.editorTheme, arenaCompilerSettings.fontSize);
if (arenaEditorCard) applyCompilerTheme(arenaEditorCard, arenaCompilerSettings.editorTheme, arenaCompilerSettings.fontSize);

if (selectArenaTheme) {
  selectArenaTheme.value = arenaCompilerSettings.editorTheme || 'Monokai';
  selectArenaTheme.addEventListener('change', () => {
    const chosen = selectArenaTheme.value;
    saveCompilerTheme(chosen);
    applyCompilerTheme(arenaEditorBodyEl, chosen);
    if (arenaEditorCard) applyCompilerTheme(arenaEditorCard, chosen);
    showToast(`Arena theme set to ${chosen}`);
  });
}

function getCodeStorageKey(problemId: string, lang: string): string {
  return `kuizu_problem_code_${problemId}_${lang}`;
}

function getStoredOrStarterCode(q: ArenaQuestion, lang: string): string {
  const localSaved = localStorage.getItem(getCodeStorageKey(q.id, lang));
  if (localSaved !== null && localSaved !== undefined) return localSaved;
  if (q.userCode && q.userCode[lang]) return q.userCode[lang];
  if (q.starters && q.starters[lang]) return q.starters[lang];
  if (q.starters && q.starters['cpp']) return q.starters['cpp'];
  return `// Write your ${lang.toUpperCase()} solution here`;
}

function updateEditor() {
  if (!codeEditor) return;
  const code = codeEditor.value;
  const curLang = langSelect?.value || 'cpp';

  if (gutter) {
    const lines = code.split('\n').length;
    let gutterHtml = '';
    for (let i = 1; i <= Math.max(lines, 12); i++) {
      gutterHtml += `<div>${i}</div>`;
    }
    gutter.innerHTML = gutterHtml;
  }

  if (highlightLayer) {
    highlightLayer.innerHTML = highlightCode(code, curLang) + '\n';
  }
}

// ===========================================================
// ANTI-GAMING: COPY/PASTE & INSPECT BLOCKERS (SELECTION ALLOWED)
// ===========================================================
const isInspectShortcut = (e: KeyboardEvent): boolean => {
  if (e.key === 'F12') return true;
  const isCmdOrCtrl = e.ctrlKey || e.metaKey;
  if ((e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
      (e.metaKey && e.altKey && ['I', 'i', 'J', 'j', 'C', 'c', 'U', 'u'].includes(e.key))) {
    return true;
  }
  if (isCmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
    return true;
  }
  if (isCmdOrCtrl && (e.key === 's' || e.key === 'S')) {
    return true;
  }
  return false;
};

if (codeEditor) {
  codeEditor.addEventListener('input', () => {
    const curQ = questions[currentIndex];
    const curLang = langSelect?.value || 'cpp';
    if (curQ) {
      if (!curQ.userCode) curQ.userCode = {};
      const userCodeMap = curQ.userCode;
      if (userCodeMap) userCodeMap[curLang] = codeEditor.value;
      localStorage.setItem(getCodeStorageKey(curQ.id, curLang), codeEditor.value);
    }
    updateEditor();
  });

  codeEditor.addEventListener('scroll', () => {
    if (highlightLayer) {
      highlightLayer.scrollTop = codeEditor.scrollTop;
      highlightLayer.scrollLeft = codeEditor.scrollLeft;
    }
    if (gutter) {
      gutter.scrollTop = codeEditor.scrollTop;
    }
  });

  codeEditor.addEventListener('keydown', (e) => {
    // 1. Allow Tab for code indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
      updateEditor();
      return;
    }

    // Ignore standalone modifier keys (Cmd, Ctrl, Shift, Alt)
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    if (isContestRunning) {
      // 2. Disable Inspect & DevTools shortcuts
      if (isInspectShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        showAntiGamingWarning('Developer Tools and Inspect are disabled on this page.');
        return;
      }

      // 3. Block Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        showAntiGamingWarning('Copying code is disabled during the contest.');
        return;
      }

      // 4. Block Cut (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        showAntiGamingWarning('Cutting code is disabled during the contest.');
        return;
      }

      // 5. Block Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        showAntiGamingWarning('Pasting external code is prohibited during the contest.');
        return;
      }

      // Code dragging, text selection (mouse, Shift+Arrows, Ctrl+A/Cmd+A) and Undo (Ctrl+Z) are allowed!
    }
  });

  // Block copy, cut, and paste on the code editor
  const blockEditorCopy = (e: ClipboardEvent) => {
    if (isContestRunning) {
      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) e.clipboardData.clearData();
      showAntiGamingWarning('Copying code is disabled during the contest.');
    }
  };

  const blockEditorCut = (e: ClipboardEvent) => {
    if (isContestRunning) {
      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) e.clipboardData.clearData();
      showAntiGamingWarning('Cutting code is disabled during the contest.');
    }
  };

  const blockEditorPaste = (e: ClipboardEvent) => {
    if (isContestRunning) {
      e.preventDefault();
      e.stopPropagation();
      showAntiGamingWarning('Pasting external code is prohibited during the contest.');
    }
  };

  codeEditor.addEventListener('copy', blockEditorCopy);
  codeEditor.addEventListener('cut', blockEditorCut);
  codeEditor.addEventListener('paste', blockEditorPaste);
}

// Global Window Listeners for Copy, Cut, Paste Blockers
window.addEventListener('copy', (e) => {
  if (isContestRunning) {
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) e.clipboardData.clearData();
    showAntiGamingWarning('Copying code is prohibited during the active contest.');
  }
}, true);

window.addEventListener('cut', (e) => {
  if (isContestRunning) {
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) e.clipboardData.clearData();
    showAntiGamingWarning('Cutting code is prohibited during the active contest.');
  }
}, true);

window.addEventListener('paste', (e) => {
  if (isContestRunning) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Pasting is prohibited during the active contest.');
  }
}, true);

// Disable right-click context menu and inspect for this page only
window.addEventListener('contextmenu', (e) => {
  if (isContestRunning) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Right-click context menu and inspect are disabled on this page.');
  }
}, true);

// Global keyboard shortcut guard for Inspect & DevTools on this page
window.addEventListener('keydown', (e) => {
  if (!isContestRunning) return;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

  if (isInspectShortcut(e)) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Developer Tools and Inspect are disabled on this page.');
    return;
  }

  // Block copy/cut/paste shortcuts globally across the page
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Copying is disabled during the contest.');
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Cutting is disabled during the contest.');
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault();
    e.stopPropagation();
    showAntiGamingWarning('Pasting is prohibited during the contest.');
    return;
  }
}, true);

// Tab Switch & Visibility Proctoring
document.addEventListener('visibilitychange', () => {
  if (!isContestRunning) return;
  if (document.hidden) {
    tabSwitchViolations++;
  } else {
    showAntiGamingWarning(`⚠️ Tab switch detected! (Violation #${tabSwitchViolations}). Contest activity is monitored.`, 4000);
  }
});

// Disable text selection on Problem Description during contest
const problemSpecCard = document.querySelector('.arena-problem-spec-card');
if (problemSpecCard) {
  problemSpecCard.addEventListener('selectstart', (e) => {
    if (isContestRunning) {
      e.preventDefault();
      showAntiGamingWarning('Text selection is disabled during the contest.');
    }
  });
}


langSelect?.addEventListener('change', () => {
  const curQ = questions[currentIndex];
  const curLang = langSelect.value || 'cpp';
  if (curQ && codeEditor) {
    codeEditor.value = getStoredOrStarterCode(curQ, curLang);
    updateEditor();
  }
});

// Render question details
function renderQuestion(index: number) {
  if (index < 0 || index >= questions.length) return;
  currentIndex = index;
  const q = questions[index];

  // Topbar Tracker
  if (questionTracker) questionTracker.textContent = `Question ${index + 1} of ${questions.length}`;
  if (ratioTracker) ratioTracker.textContent = `${index + 1}/${questions.length}`;
  if (progressBar) progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;

  // Stepper buttons state
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === questions.length - 1;

  // Problem Spec
  if (problemTitle) problemTitle.textContent = `${q.num}. ${q.title}`;
  if (difficultyPill) {
    difficultyPill.textContent = q.difficulty;
    difficultyPill.className = `arena-diff-pill diff-${q.difficulty.toLowerCase()}`;
  }
  if (timeLimit) timeLimit.textContent = q.timeLimit || '1 sec';
  if (memLimit) memLimit.textContent = q.memLimit || '256 MB';
  if (attemptsCount) attemptsCount.textContent = q.attempts || '1.2K attempts';
  if (problemDesc) problemDesc.textContent = q.description;
  if (inputFormat) inputFormat.textContent = q.inputFormat;
  if (outputFormat) outputFormat.textContent = q.outputFormat;

  if (constraintsList) {
    constraintsList.innerHTML = q.constraints.map(c => `<li>${escapeHtml(c)}</li>`).join('');
  }

  if (examplesContainer) {
    examplesContainer.innerHTML = q.examples.map(ex => `
      <div class="arena-example-card">
        <div class="arena-example-label">Example ${ex.num}</div>
        <div class="arena-example-field">
          <span class="arena-example-k">Input</span>
          <div class="arena-example-box">${escapeHtml(ex.input)}</div>
        </div>
        <div class="arena-example-field">
          <span class="arena-example-k">Output</span>
          <div class="arena-example-box">${escapeHtml(ex.output)}</div>
        </div>
        ${ex.explanation ? `
          <div class="arena-example-field">
            <span class="arena-example-k">Explanation</span>
            <p class="arena-example-exp">${escapeHtml(ex.explanation)}</p>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // Submissions Link
  if (btnArenaSubmissions) {
    btnArenaSubmissions.href = `/problem/qlibrary/compiler/submission?id=${q.id}`;
  }

  // Code Editor
  if (codeEditor && langSelect) {
    const curLang = langSelect.value || 'cpp';
    codeEditor.value = getStoredOrStarterCode(q, curLang);
    updateEditor();
  }

  // Test Cases Table
  renderTestCases(q);

  // Questions Sidebar
  renderQuestionsSidebar();
}

// Smooth question switching
function switchQuestion(newIndex: number) {
  if (newIndex < 0 || newIndex >= questions.length || newIndex === currentIndex) return;

  // 1. Save currently typed code in userCode cache
  if (codeEditor && questions[currentIndex]) {
    const q = questions[currentIndex];
    const curLang = langSelect?.value || 'cpp';
    if (!q.userCode) {
      q.userCode = {};
    }
    const userCodeMap = q.userCode;
    if (userCodeMap) userCodeMap[curLang] = codeEditor.value;
  }

  // 2. Smooth fade animation
  const specBody = document.querySelector('.arena-spec-scroll-body') as HTMLElement | null;
  const editorBodyEl = document.getElementById('arena-editor-body');

  if (specBody) specBody.style.opacity = '0.35';
  if (editorBodyEl) editorBodyEl.style.opacity = '0.35';

  setTimeout(() => {
    renderQuestion(newIndex);
    if (specBody) specBody.style.opacity = '1';
    if (editorBodyEl) editorBodyEl.style.opacity = '1';
  }, 120);
}

function renderTestCases(q: ArenaQuestion) {
  if (!testcasesRows) return;

  testcasesRows.innerHTML = q.testcases.map((tc, i) => {
    const isPassed = tc.status === 'Passed';
    const isFailed = tc.status === 'Failed';
    const yourOut = tc.yourOutput !== undefined && tc.yourOutput !== null ? tc.yourOutput : '-';

    return `
      <tr>
        <td class="tc-num-cell">${tc.num || i + 1}</td>
        <td class="tc-mono-cell">${escapeHtml(tc.input).replace(/\n/g, '<br/>')}</td>
        <td class="tc-mono-cell">${escapeHtml(tc.expectedOutput).replace(/\n/g, '<br/>')}</td>
        <td class="tc-mono-cell">${escapeHtml(yourOut).replace(/\n/g, '<br/>')}</td>
        <td>
          <span class="tc-status-pill ${isPassed ? 'status-passed' : isFailed ? 'status-failed' : 'status-ready'}">
            ${isPassed ? `
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Passed</span>
            ` : isFailed ? `
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Failed</span>
            ` : `
              <span>Ready</span>
            `}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (tcBanner && tcBannerText) {
    if (q.solved) {
      tcBanner.style.display = 'flex';
      tcBannerText.textContent = 'All test cases passed!';
      tcBanner.className = 'arena-tc-banner success';
    } else {
      tcBanner.style.display = 'none';
    }
  }

  // Populate Expected Output Panel
  if (expectedBox) {
    expectedBox.innerHTML = q.testcases.map(tc => `
      <div style="margin-bottom: 12px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="font-weight: 700; color: #64748b; font-size: 12px; margin-bottom: 6px;">Case ${tc.num}:</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #1e293b; margin-bottom: 4px;"><strong>Input:</strong> ${escapeHtml(tc.input).replace(/\n/g, ' ')}</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #16a34a; font-weight: 700;"><strong>Expected Output:</strong> ${escapeHtml(tc.expectedOutput)}</div>
      </div>
    `).join('');
  }
}

function renderQuestionsSidebar() {
  if (!questionsList) return;
  if (sidebarTitle) sidebarTitle.textContent = `Questions (${questions.length})`;

  questionsList.innerHTML = questions.map((q, idx) => {
    const isActive = idx === currentIndex;
    const isSolved = q.solved;
    const diffClass = `diff-${q.difficulty.toLowerCase()}`;

    return `
      <div class="arena-question-item ${isActive ? 'active' : ''}" data-idx="${idx}">
        <div class="arena-question-item-left">
          <div class="arena-question-num-circle">${q.num}</div>
          <div class="arena-question-item-info">
            <span class="arena-q-title">${escapeHtml(q.title)}</span>
            <span class="arena-diff-pill ${diffClass}">${q.difficulty}</span>
          </div>
        </div>
        <div class="arena-question-item-right">
          ${isSolved ? `
            <div class="arena-solved-indicator">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#16a34a" stroke="#ffffff" stroke-width="2">
                <circle cx="12" cy="12" r="10" fill="#16a34a"></circle>
                <polyline points="16 9 10 15 7 12" fill="none" stroke="#ffffff" stroke-width="2.5"></polyline>
              </svg>
              <span>Solved</span>
            </div>
          ` : `
            <div class="arena-not-attempted-indicator">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94a3b8" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Not Attempted</span>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Attach smooth click listener to each question item
  questionsList.querySelectorAll('.arena-question-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = Number(item.getAttribute('data-idx'));
      switchQuestion(idx);
    });
  });
}

// Steppers
prevBtn?.addEventListener('click', () => {
  if (currentIndex > 0) switchQuestion(currentIndex - 1);
});

nextBtn?.addEventListener('click', () => {
  if (currentIndex < questions.length - 1) switchQuestion(currentIndex + 1);
});

// Reset Starter Code
resetBtn?.addEventListener('click', () => {
  const curQ = questions[currentIndex];
  const curLang = langSelect?.value || 'cpp';
  if (curQ && codeEditor) {
    if (curQ.userCode) delete curQ.userCode[curLang];
    if (curQ.starters && curQ.starters[curLang]) {
      codeEditor.value = curQ.starters[curLang];
    } else if (curQ.starters && curQ.starters['cpp']) {
      codeEditor.value = curQ.starters['cpp'];
    }
    updateEditor();
    showToast('Starter code restored.');
  }
});

// Fullscreen Editor Toggle
fullscreenBtn?.addEventListener('click', () => {
  if (!editorBody) return;
  if (!document.fullscreenElement) {
    editorBody.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Tabs for Testcases Panel
tabCases?.addEventListener('click', () => {
  tabCases.classList.add('active');
  tabMyOutput?.classList.remove('active');
  tabExpected?.classList.remove('active');
  if (panelCases) panelCases.style.display = 'block';
  if (panelMyOutput) panelMyOutput.style.display = 'none';
  if (panelExpected) panelExpected.style.display = 'none';
});

tabMyOutput?.addEventListener('click', () => {
  tabCases?.classList.remove('active');
  tabMyOutput.classList.add('active');
  tabExpected?.classList.remove('active');
  if (panelCases) panelCases.style.display = 'none';
  if (panelMyOutput) panelMyOutput.style.display = 'block';
  if (panelExpected) panelExpected.style.display = 'none';
});

tabExpected?.addEventListener('click', () => {
  tabCases?.classList.remove('active');
  tabMyOutput?.classList.remove('active');
  tabExpected.classList.add('active');
  if (panelCases) panelCases.style.display = 'none';
  if (panelMyOutput) panelMyOutput.style.display = 'none';
  if (panelExpected) panelExpected.style.display = 'block';
});

// -----------------------------------------------------------
// REAL COMPILER: RUN CODE (Executes code via /api/execute)
// -----------------------------------------------------------
runBtn?.addEventListener('click', async () => {
  const curQ = questions[currentIndex];
  if (!curQ || !codeEditor) return;

  const code = codeEditor.value;
  const lang = langSelect?.value || 'python';

  runBtn.disabled = true;
  runBtn.innerHTML = `
    <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;animation:adminSpin 0.8s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10"></path>
    </svg>
    <span>Running...</span>
  `;

  try {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang,
        code,
        testCases: curQ.testcases.map((tc, idx) => ({
          num: idx + 1,
          input: tc.input,
          output: tc.expectedOutput
        })),
        isSubmission: false
      })
    });

    const data = await res.json();
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      <span>Run</span>
    `;

    if (data.success && Array.isArray(data.results)) {
      // Map results back to real test cases
      data.results.forEach((r: any, idx: number) => {
        if (curQ.testcases[idx]) {
          curQ.testcases[idx].yourOutput = r.actualOutput !== undefined && r.actualOutput !== null 
            ? String(r.actualOutput).trim() 
            : (r.error || 'No output');
          curQ.testcases[idx].status = r.passed ? 'Passed' : 'Failed';
        }
      });

      renderTestCases(curQ);

      // Update My Output console tab
      if (consoleBox) {
        consoleBox.innerHTML = `
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px;">Execution Finished (${lang.toUpperCase()})</div>
          ${data.allPassed
            ? `<div style="color: #16a34a; font-weight: 700; margin-bottom: 6px;">✔ All ${data.passedCount}/${data.totalCount} sample test cases passed!</div>`
            : `<div style="color: #dc2626; font-weight: 700; margin-bottom: 6px;">✖ ${data.passedCount}/${data.totalCount} test cases passed.</div>`
          }
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            ${data.results.map((r: any) => `
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${r.passed ? '#15803d' : '#b91c1c'};">
                Case ${r.num}: ${r.passed ? 'Passed' : `Failed (Output: "${escapeHtml(r.actualOutput || r.error || '')}", Expected: "${escapeHtml(r.expectedOutput || '')}")`}
              </div>
            `).join('')}
          </div>
        `;
      }

      if (data.allPassed) {
        showToast(`✔ All sample test cases passed! (${data.passedCount}/${data.totalCount})`);
        if (tcBanner && tcBannerText) {
          tcBanner.style.display = 'flex';
          tcBannerText.textContent = `All ${curQ.testcases.length} sample test cases passed!`;
          tcBanner.className = 'arena-tc-banner success';
        }
      } else {
        showToast(`Some test cases failed (${data.passedCount}/${data.totalCount}). Check details.`);
        if (tcBanner && tcBannerText) {
          tcBanner.style.display = 'flex';
          tcBannerText.textContent = `${data.passedCount}/${data.totalCount} test cases passed.`;
          tcBanner.className = 'arena-tc-banner failed';
        }
      }
    } else {
      showToast(data.error || 'Execution failed', 4000);
      if (consoleBox) {
        consoleBox.innerHTML = `
          <div style="color: #dc2626; font-weight: 700;">Execution Error</div>
          <div style="color: #64748b; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-top: 6px;">${escapeHtml(data.error || 'Compiler error or timeout')}</div>
        `;
      }
    }
  } catch (err: any) {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      <span>Run</span>
    `;
    showToast('Could not connect to compiler execution service.');
  }
});

// -----------------------------------------------------------
// REAL COMPILER: SUBMIT CODE (Evaluates against test cases & awards XP)
// -----------------------------------------------------------
submitBtn?.addEventListener('click', async () => {
  const curQ = questions[currentIndex];
  if (!curQ || !codeEditor) return;

  const code = codeEditor.value;
  const lang = langSelect?.value || 'python';

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;animation:adminSpin 0.8s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10"></path>
    </svg>
    <span>Evaluating...</span>
  `;

  try {
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang,
        code,
        testCases: curQ.testcases.map((tc, idx) => ({
          num: idx + 1,
          input: tc.input,
          output: tc.expectedOutput
        })),
        isSubmission: true
      })
    });

    const data = await res.json();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      <span>Submit</span>
    `;

    if (data.success && Array.isArray(data.results)) {
      // Map results back to real test cases
      data.results.forEach((r: any, idx: number) => {
        if (curQ.testcases[idx]) {
          curQ.testcases[idx].yourOutput = r.actualOutput !== undefined && r.actualOutput !== null 
            ? String(r.actualOutput).trim() 
            : (r.error || 'No output');
          curQ.testcases[idx].status = r.passed ? 'Passed' : 'Failed';
        }
      });

      renderTestCases(curQ);

      if (data.allPassed) {
        // ALL TEST CASES PASSED -> Mark Solved!
        curQ.solved = true;
        if (!curQ.userCode) curQ.userCode = {};
        curQ.userCode[lang] = code;
        curQ.submittedCode = code;
        curQ.submittedLang = lang;
        renderQuestionsSidebar();

        const diffLower = (curQ.difficulty || 'Easy').toLowerCase();
        const rewardXp = diffLower === 'hard' ? 40 : (diffLower === 'medium' ? 20 : 10);

        // Submit solve to backend to award real strict XP & increment streak
        const userEmail = localStorage.getItem('kuizu_user_email') || '';
        const userName = localStorage.getItem('kuizu_user_name') || '';
        const contestUrlParams = new URLSearchParams(window.location.search);
        const currentContestId = contestUrlParams.get('contestId') || contestUrlParams.get('id') || '';
        let awardedXp = rewardXp;
        let isFirst = true;

        try {
          const res = await fetch(`/api/problems/${curQ.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userEmail,
              name: userName,
              difficulty: curQ.difficulty,
              code,
              language: lang,
              passedCount: data.passedCount,
              totalCount: data.totalCount,
              status: 'accepted',
              source: 'contest',
              contestId: currentContestId
            })
          });
          const subData = await res.json();
          awardedXp = typeof subData?.rewardXp === 'number' ? subData.rewardXp : rewardXp;
          isFirst = subData?.isFirstSolve !== false;
        } catch {}

        // Confetti celebration
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        }

        if (isFirst) {
          showToast(`Accepted! +${awardedXp} XP (${curQ.difficulty}) awarded to your profile!`, 4000);
        } else {
          showToast(`Accepted! All test cases passed! (Already solved previously • +0 XP)`, 4000);
        }

        if (tcBanner && tcBannerText) {
          tcBanner.style.display = 'flex';
          tcBannerText.textContent = isFirst 
            ? `All test cases passed! +${awardedXp} XP (${curQ.difficulty}) awarded!`
            : `All test cases passed! (Already solved previously • +0 XP)`;
          tcBanner.className = 'arena-tc-banner success';
        }

        // Check if all questions in this contest are solved
        const allQuestionsSolved = questions.every(q => q.solved);
        if (allQuestionsSolved) {
          setTimeout(() => {
            if (typeof confetti === 'function') {
              confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.5 }
              });
            }
            openContestSummaryModal(true);
          }, 1400);
        }
      } else {
        // Test cases failed - also record into submission history
        const userEmail = localStorage.getItem('kuizu_user_email') || '';
        const userName = localStorage.getItem('kuizu_user_name') || '';
        const contestUrlParams = new URLSearchParams(window.location.search);
        const currentContestId = contestUrlParams.get('contestId') || contestUrlParams.get('id') || '';
        fetch(`/api/problems/${curQ.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            name: userName,
            difficulty: curQ.difficulty,
            code,
            language: lang,
            passedCount: data.passedCount || 0,
            totalCount: data.totalCount || 0,
            status: 'failed',
            source: 'contest',
            contestId: currentContestId
          })
        }).catch(() => {});

        showToast(`Submission Failed: ${data.passedCount}/${data.totalCount} test cases passed.`, 4000);
        if (tcBanner && tcBannerText) {
          tcBanner.style.display = 'flex';
          tcBannerText.textContent = `Submission Failed: ${data.passedCount}/${data.totalCount} test cases passed.`;
          tcBanner.className = 'arena-tc-banner failed';
        }
      }
    } else {
      showToast(data.error || 'Submission evaluation failed', 4000);
    }
  } catch (err: any) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      <span>Submit</span>
    `;
    showToast('Could not connect to compiler execution service.');
  }
});

// -----------------------------------------------------------
// CLOSE / TOGGLE QUESTIONS SIDEBAR
// -----------------------------------------------------------
function toggleQuestionsSidebar() {
  if (!arenaGrid) return;
  const isCollapsed = arenaGrid.classList.toggle('sidebar-collapsed');
  
  if (btnToggleSidebarTop) {
    btnToggleSidebarTop.classList.toggle('active', isCollapsed);
  }
  if (labelSidebarToggle) {
    labelSidebarToggle.textContent = isCollapsed ? 'Show Questions' : 'Questions';
  }
}

btnCloseSidebar?.addEventListener('click', toggleQuestionsSidebar);
btnToggleSidebarTop?.addEventListener('click', toggleQuestionsSidebar);
btnSeeAllQuestions?.addEventListener('click', toggleQuestionsSidebar);

// -----------------------------------------------------------
// CONTEST SUBMISSION & CODE REVIEW MODAL
// -----------------------------------------------------------
let selectedSummaryIndex = 0;
let currentSummaryCode = '';

function renderSummaryQuestionCode(idx: number) {
  const q = questions[idx];
  if (!q) return;

  if (summaryCodeTitle) {
    summaryCodeTitle.textContent = `${q.num}. ${q.title}`;
  }
  if (summaryCodeDiff) {
    summaryCodeDiff.textContent = q.difficulty;
    summaryCodeDiff.className = `arena-diff-pill diff-${q.difficulty.toLowerCase()}`;
  }

  const curLang = langSelect?.value || 'cpp';
  const lang = q.submittedLang || (q.userCode && q.userCode[curLang] ? curLang : Object.keys(q.userCode || {})[0] || curLang);

  let writtenCode = '';
  if (q.submittedCode) {
    writtenCode = q.submittedCode;
  } else if (q.userCode && q.userCode[lang]) {
    writtenCode = q.userCode[lang];
  } else if (idx === currentIndex && codeEditor?.value) {
    writtenCode = codeEditor.value;
  } else if (q.starters && q.starters[lang]) {
    writtenCode = q.starters[lang];
  } else if (q.starters && q.starters['cpp']) {
    writtenCode = q.starters['cpp'];
  } else {
    writtenCode = '// No code written for this question';
  }

  currentSummaryCode = writtenCode;

  if (summaryCodeLang) {
    summaryCodeLang.textContent = lang.toUpperCase();
  }

  if (summaryCodeBlock) {
    summaryCodeBlock.innerHTML = highlightCode(writtenCode, lang);
  }
}

function renderSummaryQuestionTabs() {
  if (!summaryQuestionTabs) return;
  summaryQuestionTabs.innerHTML = questions.map((q, idx) => `
    <button type="button" class="summary-q-tab ${idx === selectedSummaryIndex ? 'active' : ''} ${q.solved ? 'is-solved' : ''}" data-idx="${idx}">
      <span class="status-dot"></span>
      <span>Q${idx + 1}: ${escapeHtml(q.title.length > 18 ? q.title.slice(0, 16) + '...' : q.title)}</span>
    </button>
  `).join('');

  summaryQuestionTabs.querySelectorAll('.summary-q-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number((btn as HTMLElement).dataset.idx);
      selectedSummaryIndex = idx;
      renderSummaryQuestionTabs();
      renderSummaryQuestionCode(idx);
    });
  });
}

function openContestSummaryModal(autoTriggered = false) {
  // 1. Save currently written code for the active question
  if (codeEditor && questions[currentIndex]) {
    const curQ = questions[currentIndex];
    const curLang = langSelect?.value || 'cpp';
    if (!curQ.userCode) curQ.userCode = {};
    curQ.userCode[curLang] = codeEditor.value;
  }

  // 2. Compute solved count & XP
  const solvedCount = questions.filter(q => q.solved).length;
  let totalXp = 0;
  questions.forEach(q => {
    if (q.solved) {
      const diff = (q.difficulty || 'Easy').toLowerCase();
      totalXp += diff === 'hard' ? 40 : (diff === 'medium' ? 20 : 10);
    }
  });
  // Contest completion bonus
  totalXp += 25;

  if (summarySolvedCount) {
    summarySolvedCount.textContent = `${solvedCount} / ${questions.length}`;
  }
  if (summaryXpEarned) {
    summaryXpEarned.textContent = `+${totalXp} XP`;
  }
  if (summaryStatusLabel) {
    summaryStatusLabel.textContent = 'Submitted';
  }
  if (summaryModalTitle) {
    summaryModalTitle.textContent = autoTriggered
      ? 'All Questions Solved! Contest Completed!'
      : 'Contest Submitted Successfully!';
  }

  // 3. Render tabs and display current question code
  selectedSummaryIndex = currentIndex;
  renderSummaryQuestionTabs();
  renderSummaryQuestionCode(selectedSummaryIndex);

  // 4. Send contest submission record to server
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get('contestId') || urlParams.get('id');
  const userEmail = localStorage.getItem('kuizu_user_email') || '';
  const userName = localStorage.getItem('kuizu_user_name') || '';

  if (contestId) {
    fetch(`/api/contests/${contestId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, name: userName })
    }).catch(() => {});
  }

  // 5. Open Modal & switch to review mode
  updateAntiGamingStatus(false);
  modalContestSummary?.classList.add('open');
  showToast('Contest submitted successfully! +25 XP earned!', 3500);
}

function closeContestSummaryModal() {
  modalContestSummary?.classList.remove('open');
}

btnSubmitContest?.addEventListener('click', () => openContestSummaryModal(false));
btnCloseSummaryModal?.addEventListener('click', closeContestSummaryModal);
btnSummaryClose?.addEventListener('click', closeContestSummaryModal);
modalContestSummary?.addEventListener('click', (e) => {
  if (e.target === modalContestSummary) closeContestSummaryModal();
});

btnCopySummaryCode?.addEventListener('click', async () => {
  if (!currentSummaryCode) return;
  try {
    await navigator.clipboard.writeText(currentSummaryCode);
    if (btnCopySummaryCode) {
      btnCopySummaryCode.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#10b981" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span style="color:#10b981;">Copied!</span>
      `;
      setTimeout(() => {
        if (btnCopySummaryCode) {
          btnCopySummaryCode.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy Code</span>
          `;
        }
      }, 2000);
    }
  } catch {
    showToast('Failed to copy code to clipboard');
  }
});

// -----------------------------------------------------------
// LOAD REAL CONTEST DATA & REAL TEST CASES
// -----------------------------------------------------------
async function loadContestData() {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get('contestId') || urlParams.get('id');

  if (contestId) {
    try {
      const [contestRes, problemsRes] = await Promise.all([
        fetch(`/api/contests/${contestId}`),
        fetch('/api/problems')
      ]);

      if (contestRes.ok) {
        const cData = await contestRes.json();
        const pData = problemsRes.ok ? await problemsRes.json() : { problems: [] };
        const allDbProblems = pData.problems || [];
        const contest = cData.contest;

        if (contest) {
          if (contest.status === 'completed' || contest.status === 'finished') {
            updateAntiGamingStatus(false);
          } else {
            updateAntiGamingStatus(true);
          }
        }

        if (contest && Array.isArray(contest.problems) && contest.problems.length > 0) {
          const loadedQuestions: ArenaQuestion[] = contest.problems.map((probName: string, i: number) => {
            const dbProb = allDbProblems.find((p: any) => p.title.toLowerCase() === probName.toLowerCase());

            // Build REAL test cases from database
            let realTestCases: ArenaTestCase[] = [];
            if (dbProb) {
              const rawTc = dbProb.testCases || (dbProb.test_cases_json ? JSON.parse(dbProb.test_cases_json) : []);
              if (Array.isArray(rawTc) && rawTc.length > 0) {
                realTestCases = rawTc.map((tc: any, tcIdx: number) => ({
                  num: tcIdx + 1,
                  input: String(tc.input || '').trim(),
                  expectedOutput: String(tc.output || tc.summaryExpected?.replace(/^Expected:\s*/, '') || '').trim(),
                  yourOutput: '-',
                  status: 'Ready'
                }));
              }
            }

            // Fallback to sampleInput & sampleOutput if testcases list is empty
            if (realTestCases.length === 0 && dbProb?.sampleInput) {
              realTestCases.push({
                num: 1,
                input: String(dbProb.sampleInput).trim(),
                expectedOutput: String(dbProb.sampleOutput || '').trim(),
                yourOutput: '-',
                status: 'Ready'
              });
            }

            // Final fallback if no input provided
            if (realTestCases.length === 0) {
              realTestCases = [
                { num: 1, input: '14', expectedOutput: 'true', yourOutput: '-', status: 'Ready' },
                { num: 2, input: '7', expectedOutput: 'true', yourOutput: '-', status: 'Ready' },
                { num: 3, input: '12', expectedOutput: 'false', yourOutput: '-', status: 'Ready' }
              ];
            }

            const diff = dbProb ? dbProb.difficulty : (i === 0 ? 'Easy' : (i < 3 ? 'Medium' : 'Hard'));

            return {
              id: dbProb ? dbProb.id : `contest-${contest.id}-q${i + 1}`,
              num: i + 1,
              title: probName,
              difficulty: diff,
              description: dbProb?.description || `Solve the challenge question: ${probName}.`,
              inputFormat: dbProb?.inputFormat || 'Read inputs from standard input.',
              outputFormat: dbProb?.outputFormat || 'Print answer to standard output.',
              constraints: ['1 ≤ N ≤ 10⁵', 'Standard competitive programming limits apply.'],
              examples: [
                {
                  num: 1,
                  input: dbProb?.sampleInput || realTestCases[0]?.input || 'Sample input',
                  output: dbProb?.sampleOutput || realTestCases[0]?.expectedOutput || 'Sample output',
                  explanation: 'Verified solution result'
                }
              ],
              timeLimit: '1 sec',
              memLimit: '256 MB',
              attempts: '1.2K attempts',
              starters: {
                cpp: `// Contest Question: ${probName}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    int n;\n    if (cin >> n) {\n        // solve here\n    }\n    return 0;\n}`,
                python: `# Contest Question: ${probName}\nimport sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    # solve here\n\nif __name__ == '__main__':\n    main()`,
                java: `// Contest Question: ${probName}\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // solve here\n    }\n}`,
                javascript: `// Contest Question: ${probName}\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n// solve here`,
                typescript: `import * as fs from 'fs';\nconst input = fs.readFileSync(0, 'utf-8').trim();\n// solve here`,
                csharp: `using System;\n\nclass Program {\n    static void Main() {\n        // solve here\n    }\n}`,
                go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // solve here\n}`
              },
              testcases: realTestCases,
              solved: false
            };
          });

          if (loadedQuestions.length > 0) {
            questions = loadedQuestions;
          }
        }
      }
    } catch (err) {
      console.warn('Using default contest arena questions:', err);
    }
  }

  // Initial render of first question
  renderQuestion(0);
}

loadContestData();
