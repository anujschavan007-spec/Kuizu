import confetti from 'canvas-confetti';
import './services/adminAuthGuard';
import { signOutClerk } from './services/clerkService';
import { showFirstProblemSolverBadgeModal } from './services/firstProblemBadgeModal';
import { showQuickThinkerBadgeModal } from './services/quickThinkerBadgeModal';
import { highlightCode } from './services/codeHighlighter';
import { getCompilerSettings, saveCompilerTheme, applyCompilerTheme } from './services/compilerThemeManager';

interface ProblemSpec {
  id: string;
  num: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solvedCount: string;
  attemptsCount: string;
  rewardXp: number;
  description: string[];
  examples: Array<{
    num: number;
    input: string;
    output: string;
    explanation: string;
  }>;
  constraints: string[];
  starters: Record<string, string>;
  testcases: Array<{
    num: number;
    name?: string;
    summaryInput: string;
    summaryExpected: string;
    visibility?: string;
    details: Array<{ label: string; value: string }>;
    input?: string;
    output?: string;
  }>;
}

const PROBLEMS_DATA: Record<string, ProblemSpec> = {
  '001': {
    id: '001',
    num: '1',
    title: 'Two Sum',
    difficulty: 'Easy',
    solvedCount: '2.1K solved',
    attemptsCount: '1.2K attempts',
    rewardXp: 10,
    description: [
      'Given an array of integers <code class="code-token">`nums`</code> and an integer <code class="code-token">`target`</code>, return indices of the two numbers such that they add up to <code class="code-token">`target`</code>.',
      'You may assume that each input has exactly one solution, and you may not use the same element twice.'
    ],
    examples: [
      {
        num: 1,
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        num: 2,
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      }
    ],
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.'
    ],
    starters: {
      python: `# Problem: Two Sum
# Input: n, followed by n space-separated integers, followed by target
import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:n+1]]
    target = int(input_data[n+1])
    
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[num] = i

if __name__ == '__main__':
    solve()`,
      cpp: `// Problem: Two Sum
// Input: n, followed by n space-separated integers, followed by target
#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    if (!(cin >> n)) return 0;
    
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    int target;
    cin >> target;
    
    unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int diff = target - nums[i];
        if (seen.find(diff) != seen.end()) {
            cout << seen[diff] << " " << i << "\n";
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}`,
      javascript: `// Problem: Two Sum
const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 3) return;
    
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(Number);
    const target = parseInt(input[n + 1], 10);
    
    const seen = new Map();
    for (let i = 0; i < n; i++) {
        const diff = target - nums[i];
        if (seen.has(diff)) {
            console.log(\`\${seen.get(diff)} \${i}\`);
            return;
        }
        seen.set(nums[i], i);
    }
}

solve();`,
      typescript: `// Problem: Two Sum
import * as fs from 'fs';

function solve(): void {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 3) return;
    
    const n: number = parseInt(input[0], 10);
    const nums: number[] = input.slice(1, n + 1).map(Number);
    const target: number = parseInt(input[n + 1], 10);
    
    const seen = new Map<number, number>();
    for (let i = 0; i < n; i++) {
        const diff: number = target - nums[i];
        if (seen.has(diff)) {
            console.log(\`\${seen.get(diff)} \${i}\`);
            return;
        }
        seen.set(nums[i], i);
    }
}

solve();`,
      java: `import java.util.*;

class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int target = sc.nextInt();
        
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int diff = target - nums[i];
            if (map.containsKey(diff)) {
                System.out.println(map.get(diff) + " " + i);
                return;
            }
            map.put(nums[i], i);
        }
    }
}`,
      csharp: `using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        string input = Console.In.ReadToEnd();
        if (string.IsNullOrWhiteSpace(input)) return;
        string[] tokens = input.Split(new char[] { ' ', '\\t', '\\r', '\\n' }, StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length < 3) return;
        
        int n = int.Parse(tokens[0]);
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = int.Parse(tokens[i + 1]);
        int target = int.Parse(tokens[n + 1]);
        
        Dictionary<int, int> seen = new Dictionary<int, int>();
        for (int i = 0; i < n; i++) {
            int diff = target - nums[i];
            if (seen.ContainsKey(diff)) {
                Console.WriteLine(seen[diff] + " " + i);
                return;
            }
            seen[nums[i]] = i;
        }
    }
}`,
      go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    var n int
    if _, err := fmt.Fscan(reader, &n); err != nil {
        return
    }
    nums := make([]int, n)
    for i := 0; i < n; i++ {
        fmt.Fscan(reader, &nums[i])
    }
    var target int
    fmt.Fscan(reader, &target)
    
    seen := make(map[int]int)
    for i := 0; i < n; i++ {
        diff := target - nums[i]
        if idx, ok := seen[diff]; ok {
            fmt.Printf("%d %d\\n", idx, i)
            return
        }
        seen[nums[i]] = i
    }
}`
    },
    testcases: [
      {
        num: 1,
        summaryInput: 'Input: [2,7,11,15], 9',
        summaryExpected: 'Expected: 0 1',
        input: '4\n2 7 11 15\n9',
        output: '0 1',
        visibility: 'Sample',
        details: [
          { label: 'nums =', value: '[2, 7, 11, 15]' },
          { label: 'target =', value: '9' },
          { label: 'output =', value: '[0, 1]' }
        ]
      },
      {
        num: 2,
        summaryInput: 'Input: [3,2,4], 6',
        summaryExpected: 'Expected: 1 2',
        input: '3\n3 2 4\n6',
        output: '1 2',
        visibility: 'Sample',
        details: [
          { label: 'nums =', value: '[3, 2, 4]' },
          { label: 'target =', value: '6' },
          { label: 'output =', value: '[1, 2]' }
        ]
      },
      {
        num: 3,
        summaryInput: 'Input: [3,3], 6',
        summaryExpected: 'Expected: 0 1',
        input: '2\n3 3\n6',
        output: '0 1',
        visibility: 'Hidden',
        details: [
          { label: 'nums =', value: '[3, 3]' },
          { label: 'target =', value: '6' },
          { label: 'output =', value: '[0, 1]' }
        ]
      },
      {
        num: 4,
        summaryInput: 'Input: [1,5,3,7], 10',
        summaryExpected: 'Expected: 1 3',
        input: '4\n1 5 3 7\n10',
        output: '1 3',
        visibility: 'Hidden',
        details: [
          { label: 'nums =', value: '[1, 5, 3, 7]' },
          { label: 'target =', value: '10' },
          { label: 'output =', value: '[1, 3]' }
        ]
      }
    ]
  },
  '002': {
    id: '002',
    num: '2',
    title: 'Reverse a String',
    difficulty: 'Easy',
    solvedCount: '3.4K solved',
    attemptsCount: '1.9K attempts',
    rewardXp: 10,
    description: [
      'Write a function that reverses a string. The input string is given as an array of characters <code class="code-token">`s`</code>.',
      'You must do this by modifying the input array in-place with O(1) extra memory.'
    ],
    examples: [
      {
        num: 1,
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
        explanation: 'Reversing the character sequence gives ["o","l","l","e","h"].'
      }
    ],
    constraints: [
      '1 ≤ s.length ≤ 10⁵',
      's[i] is a printable ascii character.'
    ],
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    void reverseString(vector<char>& s) {
        // Write your code here
    }
};`,
      python: `class Solution:
    def reverseString(self, s: list[str]) -> None:
        # Write your code here in-place
        s.reverse()`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your code here
    }
}`,
      javascript: `var reverseString = function(s) {
    s.reverse();
};`
    },
    testcases: [
      {
        num: 1,
        summaryInput: 'Input: ["h","e","l","l","o"]',
        summaryExpected: 'Expected: ["o","l","l","e","h"]',
        details: [
          { label: 's =', value: '["h","e","l","l","o"]' },
          { label: 'output =', value: '["o","l","l","e","h"]' }
        ]
      }
    ]
  },
  '005': {
    id: '005',
    num: '5',
    title: 'Merge Sort',
    difficulty: 'Hard',
    solvedCount: '840 solved',
    attemptsCount: '3.4K attempts',
    rewardXp: 40,
    description: [
      'Implement Merge Sort to sort an array of integers in non-decreasing order.',
      'Your algorithm should run in <code class="code-token">O(n log n)</code> time complexity and achieve complete algorithmic stability.'
    ],
    examples: [
      {
        num: 1,
        input: 'nums = [5,2,3,1]',
        output: '[1,2,3,5]',
        explanation: 'After sorting the array, the values are arranged from smallest to largest.'
      },
      {
        num: 2,
        input: 'nums = [5,1,1,2,0,0]',
        output: '[0,0,1,1,2,5]',
        explanation: 'Duplicates are handled stably in ascending order.'
      }
    ],
    constraints: [
      '1 ≤ nums.length ≤ 5 × 10⁴',
      '-5 × 10⁴ ≤ nums[i] ≤ 5 × 10⁴'
    ],
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> sortArray(vector<int>& nums) {
        // Implement Merge Sort
        sort(nums.begin(), nums.end());
        return nums;
    }
};`,
      python: `class Solution:
    def sortArray(self, nums: list[int]) -> list[int]:
        # Implement Merge Sort
        nums.sort()
        return nums`,
      java: `import java.util.Arrays;

class Solution {
    public int[] sortArray(int[] nums) {
        Arrays.sort(nums);
        return nums;
    }
}`,
      javascript: `var sortArray = function(nums) {
    return nums.sort((a, b) => a - b);
};`
    },
    testcases: [
      {
        num: 1,
        summaryInput: 'Input: nums = [5,2,3,1]',
        summaryExpected: 'Expected: [1,2,3,5]',
        details: [
          { label: 'nums =', value: '[5,2,3,1]' },
          { label: 'output =', value: '[1,2,3,5]' }
        ]
      },
      {
        num: 2,
        summaryInput: 'Input: nums = [5,1,1,2,0,0]',
        summaryExpected: 'Expected: [0,0,1,1,2,5]',
        details: [
          { label: 'nums =', value: '[5,1,1,2,0,0]' },
          { label: 'output =', value: '[0,0,1,1,2,5]' }
        ]
      }
    ]
  },
  '006': {
    id: '006',
    num: '6',
    title: 'Longest Common Subsequence',
    difficulty: 'Hard',
    solvedCount: '620 solved',
    attemptsCount: '2.8K attempts',
    rewardXp: 40,
    description: [
      'Given two strings <code class="code-token">`text1`</code> and <code class="code-token">`text2`</code>, return the length of their longest common subsequence. If there is no common subsequence, return <code class="code-token">0</code>.',
      'A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.'
    ],
    examples: [
      {
        num: 1,
        input: 'text1 = "abcde", text2 = "ace"',
        output: '3',
        explanation: 'The longest common subsequence is "ace" and its length is 3.'
      }
    ],
    constraints: [
      '1 ≤ text1.length, text2.length ≤ 1000',
      'text1 and text2 consist of only lowercase English characters.'
    ],
    starters: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int m = text1.size(), n = text2.size();
        vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1[i - 1] == text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }
};`,
      python: `class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        m, n = len(text1), len(text2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if text1[i - 1] == text2[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[m][n]`,
      java: `class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length(), n = text2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }
}`,
      javascript: `var longestCommonSubsequence = function(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
};`
    },
    testcases: [
      {
        num: 1,
        summaryInput: 'Input: text1 = "abcde", text2 = "ace"',
        summaryExpected: 'Expected: 3',
        details: [
          { label: 'text1 =', value: '"abcde"' },
          { label: 'text2 =', value: '"ace"' },
          { label: 'output =', value: '3' }
        ]
      }
    ]
  }
};

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Parse URL Parameters
  const params = new URLSearchParams(window.location.search);
  const problemId = params.get('id') || '001';
  let problem = PROBLEMS_DATA[problemId];

  if (!problem) {
    try {
      const res = await fetch(`/api/problems/${problemId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.problem) {
          const p = data.problem;

          let rawTc = p.testCases;
          if (typeof rawTc === 'string') {
            try { rawTc = JSON.parse(rawTc); } catch { rawTc = []; }
          }

          let tcList: any[] = [];
          if (Array.isArray(rawTc) && rawTc.length > 0) {
            tcList = rawTc.map((tc: any, index: number) => {
              const inputStr = typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input || '');
              const outputStr = typeof tc.output === 'object' ? JSON.stringify(tc.output) : String(tc.output || '');
              return {
                num: tc.num || index + 1,
                name: tc.name || `Test Case ${index + 1}`,
                summaryInput: tc.summaryInput || `Input: ${inputStr.replace(/\n/g, ', ')}`,
                summaryExpected: tc.summaryExpected || `Expected: ${outputStr.replace(/\n/g, ', ')}`,
                visibility: tc.visibility || 'Sample',
                input: inputStr,
                output: outputStr,
                details: Array.isArray(tc.details) && tc.details.length > 0
                  ? tc.details
                  : [
                      { label: 'input =', value: inputStr.replace(/\n/g, ' ') },
                      { label: 'output =', value: outputStr.replace(/\n/g, ' ') }
                    ]
              };
            });
          } else if (p.sampleInput || p.sampleOutput) {
            tcList = [
              {
                num: 1,
                name: 'Test Case 1',
                summaryInput: `Input: ${p.sampleInput || 'Default'}`,
                summaryExpected: `Expected: ${p.sampleOutput || 'Output'}`,
                visibility: 'Sample',
                input: p.sampleInput || '',
                output: p.sampleOutput || '',
                details: [
                  { label: 'input =', value: p.sampleInput || 'Default' },
                  { label: 'output =', value: p.sampleOutput || 'Output' }
                ]
              }
            ];
          }

          problem = {
            id: p.id,
            num: String(parseInt(p.id, 10) || p.id),
            title: p.title,
            difficulty: p.difficulty || 'Easy',
            solvedCount: '1 solved',
            attemptsCount: '2 attempts',
            rewardXp: p.rewardXp || 10,
            description: [p.statement || p.description || 'Problem statement'],
            examples: [
              {
                num: 1,
                input: p.sampleInput || 'Standard input',
                output: p.sampleOutput || 'Standard output',
                explanation: 'Verified solution result'
              }
            ],
            constraints: ['Standard algorithmic constraints apply', 'Time limit: 1000ms'],
            starters: {
              cpp: `// Problem: ${p.title}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
              python: `# Problem: ${p.title}\ndef solve():\n    # Write your solution here\n    pass\n\nsolve()`,
              java: `// Problem: ${p.title}\npublic class Main {\n    public static void main(String[] args) {\n        // Write solution here\n    }\n}`,
              javascript: `// Problem: ${p.title}\nfunction solve() {\n    // Write solution here\n}\nsolve();`
            },
            testcases: tcList
          };
        }
      }
    } catch (err) {
      console.warn('Could not fetch custom problem from backend:', err);
    }
  }

  if (!problem) {
    problem = PROBLEMS_DATA['001'];
  }

  // 2. Set Up User Info & Profile Menu
  const savedName = localStorage.getItem('kuizu_user_name') || 'Anuj';
  const userDisplayNameEl = document.getElementById('user-display-name');
  const menuUserNameEl = document.getElementById('menu-user-name');
  if (userDisplayNameEl) userDisplayNameEl.textContent = savedName;
  if (menuUserNameEl) menuUserNameEl.textContent = savedName;

  const btnUserAvatar = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  const btnTheme = document.getElementById('btn-menu-theme');

  if (btnUserAvatar && userDropdown) {
    const toggleMenu = (e: Event) => {
      e.stopPropagation();
      const isExpanded = userDropdown.classList.toggle('show');
      btnUserAvatar.classList.toggle('open', isExpanded);
      btnUserAvatar.setAttribute('aria-expanded', String(isExpanded));
    };

    const closeMenu = () => {
      userDropdown.classList.remove('show');
      btnUserAvatar.classList.remove('open');
      btnUserAvatar.setAttribute('aria-expanded', 'false');
    };

    btnUserAvatar.addEventListener('click', toggleMenu);

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !btnUserAvatar.contains(e.target as Node)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });

    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        showToast('Theme switcher coming soon');
        closeMenu();
      });
    }
  }

  document.getElementById('btn-logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    signOutClerk();
  });

  // 3. Populate Problem Header & Texts
  const titleEl = document.getElementById('problem-title');
  const diffEl = document.getElementById('problem-difficulty');
  if (titleEl) titleEl.textContent = `${problem.num}. ${problem.title}`;
  if (diffEl) {
    diffEl.textContent = problem.difficulty;
    diffEl.className = `problem-difficulty-pill diff-${problem.difficulty.toLowerCase()}`;
  }

  // Populate Problem Description
  const descEl = document.getElementById('problem-text-content');
  if (descEl && problem.description && problem.description.length > 0) {
    descEl.innerHTML = problem.description.map(para => `<p>${para}</p>`).join('');
  }

  // Populate Problem Examples
  const examplesContainer = document.getElementById('problem-examples-container');
  if (examplesContainer && problem.examples && problem.examples.length > 0) {
    examplesContainer.innerHTML = problem.examples.map(ex => `
      <div class="problem-example-card">
        <div class="example-card-title">Example ${ex.num}</div>
        <div class="example-code-box">
          <div class="example-line"><span class="example-k">Input:</span> ${escapeHtml(ex.input)}</div>
          <div class="example-line"><span class="example-k">Output:</span> ${escapeHtml(ex.output)}</div>
          ${ex.explanation ? `<div class="example-line"><span class="example-k">Explanation:</span> ${escapeHtml(ex.explanation)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // Populate Problem Constraints
  const constraintsList = document.getElementById('problem-constraints-list');
  if (constraintsList && problem.constraints && problem.constraints.length > 0) {
    constraintsList.innerHTML = problem.constraints.map(c => `<li>${escapeHtml(c)}</li>`).join('');
  }

  // 4. Toast Notification Function
  const toastEl = document.getElementById('compiler-toast');
  let toastTimer: number;
  function showToast(message: string, duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // 5. Live Countdown Timer (00:30:00) & Problem Start Timestamp for Speed Badges
  const problemStartTime = Date.now();
  let submissionAttemptCount = 0;
  const timerDisplay = document.getElementById('timer-display');
  let totalSeconds = 30 * 60; // 30 mins
  setInterval(() => {
    if (totalSeconds > 0) {
      totalSeconds--;
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      if (timerDisplay) {
        timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }
  }, 1000);

  // 6. Code Editor Gutter, Colourful Syntax Highlighting & Auto-Closing Brackets/Tags
  const editor = document.getElementById('code-editor') as HTMLTextAreaElement | null;
  const highlightLayer = document.getElementById('editor-highlight-layer') as HTMLElement | null;
  const gutter = document.getElementById('editor-gutter');
  const langSelect = document.getElementById('code-language-select') as HTMLSelectElement | null;
  const editorBody = document.getElementById('editor-body');

  // Load User Learning Preferences
  let savedSettings: any = null;
  try {
    const rawSettings = localStorage.getItem('kuizu_user_settings_v1');
    if (rawSettings) savedSettings = JSON.parse(rawSettings);
  } catch (err) {
    console.warn('Could not read user settings', err);
  }

  const learning = savedSettings?.learning || {
    defaultLanguage: 'C++',
    autoSaveCode: true,
    fontSize: 'Medium',
    editorTheme: 'Monokai'
  };

  // 1. Apply Editor Theme to compiler body
  const themeClassMap: Record<string, string> = {
    'Monokai': 'editor-theme-monokai',
    'VS Code Dark': 'editor-theme-vscode-dark',
    'GitHub Light': 'editor-theme-github-light',
    'Dracula': 'editor-theme-dracula',
    'One Dark': 'editor-theme-onedark'
  };
  const activeThemeCls = themeClassMap[learning.editorTheme] || 'editor-theme-monokai';
  editorBody?.classList.add(activeThemeCls);

  // 2. Apply Font Size to compiler body
  const sizeClassMap: Record<string, string> = {
    'Small': 'editor-size-small',
    'Medium': 'editor-size-medium',
    'Large': 'editor-size-large'
  };
  const activeSizeCls = sizeClassMap[learning.fontSize] || 'editor-size-medium';
  editorBody?.classList.add(activeSizeCls);

  // 3. Set default language selector value if not yet set
  const langKeyMap: Record<string, string> = {
    'C++': 'cpp',
    'Python': 'python',
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'Java': 'java',
    'C': 'cpp'
  };

  if (langSelect && learning.defaultLanguage) {
    const targetVal = langKeyMap[learning.defaultLanguage];
    if (targetVal && Array.from(langSelect.options).some(o => o.value === targetVal)) {
      langSelect.value = targetVal;
    }
  }

  function updateEditor() {
    if (!editor) return;
    const code = editor.value;
    const curLang = langSelect?.value || 'cpp';

    // 1. Line numbers gutter
    if (gutter) {
      const lines = code.split('\n').length;
      let gutterHtml = '';
      for (let i = 1; i <= Math.max(lines, 14); i++) {
        gutterHtml += `<div>${i}</div>`;
      }
      gutter.innerHTML = gutterHtml;
    }

    // 2. Syntax highlighting layer (Trailing newline ensures exact height match)
    if (highlightLayer) {
      highlightLayer.innerHTML = highlightCode(code, curLang) + '\n';
    }
  }

  // Synchronize scroll between textarea, highlight layer, and gutter
  if (editor) {
    editor.addEventListener('scroll', () => {
      if (highlightLayer) {
        highlightLayer.scrollTop = editor.scrollTop;
        highlightLayer.scrollLeft = editor.scrollLeft;
      }
      if (gutter) {
        gutter.scrollTop = editor.scrollTop;
      }
    });
  }

  // Helper to get local storage code key
  function getCodeStorageKey(problemId: string, lang: string): string {
    return `kuizu_problem_code_${problemId}_${lang}`;
  }

  function loadCodeForLanguage(lang: string) {
    if (!editor) return;
    const saved = localStorage.getItem(getCodeStorageKey(problem.id, lang)) || 
                  (learning.autoSaveCode ? localStorage.getItem(`kuizu_problem_draft_${problem.id}_${lang}`) : null);
    if (saved !== null && saved !== undefined) {
      editor.value = saved;
    } else if (problem.starters && problem.starters[lang]) {
      editor.value = problem.starters[lang];
    } else if (problem.starters && problem.starters['cpp']) {
      editor.value = problem.starters['cpp'];
    }
    updateEditor();
  }

  // Connect Theme & Font Size from User Settings
  const selectCompilerTheme = document.getElementById('select-compiler-theme') as HTMLSelectElement | null;
  const editorCard = document.querySelector('.editor-card') as HTMLElement | null;
  const editorBodyEl = document.getElementById('editor-body');

  const compilerSettings = getCompilerSettings();
  applyCompilerTheme(editorBodyEl, compilerSettings.editorTheme, compilerSettings.fontSize);
  if (editorCard) applyCompilerTheme(editorCard, compilerSettings.editorTheme, compilerSettings.fontSize);

  if (selectCompilerTheme) {
    selectCompilerTheme.value = compilerSettings.editorTheme || 'Monokai';
    selectCompilerTheme.addEventListener('change', () => {
      const chosen = selectCompilerTheme.value;
      saveCompilerTheme(chosen);
      applyCompilerTheme(editorBodyEl, chosen);
      if (editorCard) applyCompilerTheme(editorCard, chosen);
      showToast(`Editor theme changed to ${chosen}`);
    });
  }

  // Set initial editor boilerplate / saved code
  if (editor && langSelect) {
    const curLang = langSelect.value || 'cpp';
    loadCodeForLanguage(curLang);
  }

  // Auto-Save code on typing
  let autoSaveDraftTimer: any = null;
  editor?.addEventListener('input', () => {
    if (!editor || !langSelect) return;
    const activeLang = langSelect.value;
    localStorage.setItem(getCodeStorageKey(problem.id, activeLang), editor.value);
    if (!learning.autoSaveCode) return;
    clearTimeout(autoSaveDraftTimer);
    autoSaveDraftTimer = setTimeout(() => {
      localStorage.setItem(`kuizu_problem_draft_${problem.id}_${activeLang}`, editor.value);
    }, 600);
  });

  // Language switch updates code boilerplate / cached code and refreshes syntax colors
  langSelect?.addEventListener('change', () => {
    const lang = langSelect.value;
    loadCodeForLanguage(lang);
    showToast(`Language set to ${langSelect.options[langSelect.selectedIndex].text}`);
  });

  // Auto-complete closing tags, brackets, and quotes mapping
  const closePairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`'
  };

  const matchingClosers = new Set([')', ']', '}', '"', "'", '`']);

  editor?.addEventListener('keydown', (e) => {
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;

    // 1. Tab key indent support
    if (e.key === 'Tab') {
      e.preventDefault();
      editor.value = val.substring(0, start) + '    ' + val.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      updateEditor();
      return;
    }

    // 2. Enter key intelligent auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : '';

      const charBefore = val[start - 1];
      const charAfter = val[start];

      // If user presses Enter between { and } or ( and )
      if ((charBefore === '{' && charAfter === '}') || (charBefore === '(' && charAfter === ')')) {
        const extraIndent = indent + '    ';
        editor.value = val.substring(0, start) + '\n' + extraIndent + '\n' + indent + val.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 1 + extraIndent.length;
      } else {
        if (charBefore === '{' || charBefore === '(' || charBefore === ':') {
          indent += '    ';
        }
        editor.value = val.substring(0, start) + '\n' + indent + val.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 1 + indent.length;
      }
      updateEditor();
      return;
    }

    // 3. Skip over closing bracket/quote if next character is already the closer
    if (matchingClosers.has(e.key) && start === end && val[start] === e.key) {
      e.preventDefault();
      editor.selectionStart = editor.selectionEnd = start + 1;
      return;
    }

    // 4. Auto-complete opening brackets, braces, and quotes
    if (closePairs[e.key]) {
      e.preventDefault();
      const closer = closePairs[e.key];
      const selectedText = val.substring(start, end);
      editor.value = val.substring(0, start) + e.key + selectedText + closer + val.substring(end);
      editor.selectionStart = start + 1;
      editor.selectionEnd = start + 1 + selectedText.length;
      updateEditor();
      return;
    }

    // 5. Backspace pair deletion (e.g., delete both () if cursor is in between)
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = val[start - 1];
      const charAfter = val[start];
      if (closePairs[charBefore] && closePairs[charBefore] === charAfter) {
        e.preventDefault();
        editor.value = val.substring(0, start - 1) + val.substring(start + 1);
        editor.selectionStart = editor.selectionEnd = start - 1;
        updateEditor();
        return;
      }
    }
  });

  editor?.addEventListener('input', () => {
    updateEditor();
    const curLang = langSelect?.value || 'cpp';
    localStorage.setItem(getCodeStorageKey(problem.id, curLang), editor.value);
  });
  updateEditor();

  // 7. Fullscreen Toggle
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  fullscreenBtn?.addEventListener('click', () => {
    editorBody?.classList.toggle('fullscreen');
    showToast(editorBody?.classList.contains('fullscreen') ? 'Fullscreen code editor enabled' : 'Exited fullscreen');
  });

  // 8. Render Test Cases Dynamically
  function renderTestCases(testcases: ProblemSpec['testcases'], executionResults?: any[]) {
    const listEl = document.getElementById('testcases-rows-list');
    const myOutputEl = document.getElementById('myoutput-content');
    const expectedEl = document.getElementById('expected-content');

    if (!listEl) return;

    if (!testcases || testcases.length === 0) {
      listEl.innerHTML = `<div style="padding: 32px 16px; text-align: center; color: #94a3b8; font-size: 14px;">No test cases provided for this problem.</div>`;
      if (myOutputEl) myOutputEl.innerHTML = `<div class="console-line text-muted">[No test cases available to execute]</div>`;
      if (expectedEl) expectedEl.innerHTML = `<div class="console-line text-muted">[No expected outputs defined]</div>`;
      return;
    }

    listEl.innerHTML = testcases.map((tc, index) => {
      const isExpanded = index === 0;
      const res = executionResults ? executionResults.find((r: any) => r.num === tc.num || r.name === tc.name) : null;
      
      let statusBadgeHtml = `
        <div class="testcase-status-badge">
          <span class="status-dot" style="background: #94a3b8;"></span>
          <span style="color: #64748b;">Ready</span>
        </div>
      `;

      if (res) {
        if (res.passed) {
          statusBadgeHtml = `
            <div class="testcase-status-badge passed">
              <span class="status-dot"></span>
              <span>Passed (${res.durationMs || 10}ms)</span>
            </div>
          `;
        } else if (res.status === 'Runtime Error') {
          statusBadgeHtml = `
            <div class="testcase-status-badge error">
              <span class="status-dot"></span>
              <span>Runtime Error</span>
            </div>
          `;
        } else {
          statusBadgeHtml = `
            <div class="testcase-status-badge failed">
              <span class="status-dot"></span>
              <span>Wrong Answer</span>
            </div>
          `;
        }
      }

      const isSample = tc.visibility === 'Sample' || tc.visibility === undefined;
      const visBadgeHtml = isSample
        ? `<span class="testcase-visibility-pill sample">Sample</span>`
        : `<span class="testcase-visibility-pill hidden">Hidden</span>`;

      const inputVal = tc.input !== undefined ? tc.input : tc.summaryInput;
      const expectedVal = tc.output !== undefined ? tc.output : tc.summaryExpected.replace(/^Expected:\s*/, '');
      const actualVal = res ? (res.actualOutput || (res.error ? `Error: ${res.error}` : 'No output')) : 'Not executed yet';

      return `
        <div class="testcase-item-card ${isExpanded ? 'expanded' : ''}">
          <div class="testcase-header-row" role="button" tabindex="0">
            <span class="testcase-num-badge">${tc.num}</span>
            <span class="testcase-summary-input">${escapeHtml(tc.summaryInput || `Input: ${inputVal}`)}</span>
            <span class="testcase-summary-expected">${escapeHtml(tc.summaryExpected || `Expected: ${expectedVal}`)}</span>
            ${visBadgeHtml}
            ${statusBadgeHtml}
            <button type="button" class="testcase-toggle-chevron" aria-label="Toggle details">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
          <div class="testcase-detail-dropdown" style="${isExpanded ? 'display: grid;' : 'display: none;'}">
            <div class="tc-detail-col">
              <span class="tc-label">Input</span>
              <code>${escapeHtml(inputVal)}</code>
            </div>
            <div class="tc-detail-col">
              <span class="tc-label">Expected Output</span>
              <code>${escapeHtml(expectedVal)}</code>
            </div>
            <div class="tc-detail-col">
              <span class="tc-label">Your Output</span>
              <code style="${res && !res.passed ? 'color: #ef4444; border-color: #fca5a5;' : ''}">${escapeHtml(actualVal)}</code>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Expected Output Pane
    if (expectedEl) {
      expectedEl.innerHTML = testcases.map(tc => {
        const outVal = tc.output || tc.summaryExpected.replace(/^Expected:\s*/, '');
        return `<div class="console-line text-code">Case ${tc.num} (${tc.visibility || 'Sample'}): ${escapeHtml(outVal)}</div>`;
      }).join('');
    }

    // Attach accordion click listeners to newly rendered cards
    const cards = listEl.querySelectorAll<HTMLDivElement>('.testcase-item-card');
    cards.forEach(card => {
      const header = card.querySelector('.testcase-header-row');
      const dropdown = card.querySelector('.testcase-detail-dropdown') as HTMLElement | null;
      header?.addEventListener('click', () => {
        const isCurrentlyExpanded = card.classList.contains('expanded');
        cards.forEach(c => {
          c.classList.remove('expanded');
          const d = c.querySelector('.testcase-detail-dropdown') as HTMLElement | null;
          if (d) d.style.display = 'none';
        });

        if (!isCurrentlyExpanded && dropdown) {
          card.classList.add('expanded');
          dropdown.style.display = 'grid';
        }
      });
    });
  }

  // Initial render of test cases
  renderTestCases(problem.testcases);

  // 9. Tab Switching (Test Cases / My Output / Expected Output)
  const tabBtns = document.querySelectorAll('.testcase-tab-btn');
  const panes = document.querySelectorAll('.testcases-content-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabKey = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(`pane-${tabKey}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 10. Run Code Button (Executes Sample Test Cases via Real Compiler)
  const runBtn = document.getElementById('btn-run-code');
  runBtn?.addEventListener('click', async () => {
    if (!editor) return;
    const code = editor.value;
    const lang = langSelect?.value || 'python';

    // In Run mode, execute sample test cases (or all if no hidden)
    const testCasesToRun = problem.testcases.filter(tc => tc.visibility === 'Sample');
    const cases = testCasesToRun.length > 0 ? testCasesToRun : problem.testcases;

    runBtn.classList.add('loading');
    runBtn.innerHTML = `
      <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;animation:adminSpin 0.8s linear infinite;">
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
          testCases: cases,
          isSubmission: false
        })
      });

      const data = await res.json();

      runBtn.classList.remove('loading');
      runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Run</span>
      `;

      if (data.success) {
        // Update Test Cases UI
        renderTestCases(problem.testcases, data.results);
        document.getElementById('tab-testcases')?.click();

        // Update My Output Tab
        const myOutputEl = document.getElementById('myoutput-content');
        if (myOutputEl) {
          myOutputEl.innerHTML = `
            <div class="console-line text-muted">[Compiler: ${escapeHtml(lang)}]</div>
            ${data.allPassed
              ? `<div class="console-line text-success">✔ All ${data.passedCount}/${data.totalCount} Sample Test Cases Passed!</div>`
              : `<div class="console-line" style="color: #ef4444; font-weight: 700;">✖ ${data.passedCount}/${data.totalCount} Test Cases Passed.</div>`
            }
            <hr style="border: 0.5px solid #334155; margin: 10px 0;" />
            ${data.results.map((r: any) => `
              <div class="console-line ${r.passed ? 'text-success' : 'text-code'}" style="${!r.passed ? 'color:#ef4444;' : ''}">
                Case ${r.num} (${r.status}): ${escapeHtml(r.actualOutput || r.error || 'Empty output')}
              </div>
            `).join('')}
          `;
        }

        if (data.allPassed) {
          showToast(`✔ All sample test cases passed! (${cases.length}/${cases.length})`, 3500);
        } else {
          showToast(`Some sample test cases did not pass. Check details below.`, 4000);
        }
      } else {
        showToast(data.error || 'Execution failed', 4000);
      }
    } catch (err: any) {
      runBtn.classList.remove('loading');
      runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Run</span>
      `;
      showToast('Error connecting to compiler backend.', 3500);
    }
  });

  // 11. Submit Code Button (Executes All Sample + Hidden Test Cases)
  const submitBtn = document.getElementById('btn-submit-code');
  submitBtn?.addEventListener('click', async () => {
    if (!editor) return;
    const code = editor.value;
    const lang = langSelect?.value || 'python';
    const allCases = problem.testcases;

    // Increment submission attempts
    submissionAttemptCount++;

    submitBtn.classList.add('loading');
    submitBtn.innerHTML = `
      <svg class="admin-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;animation:adminSpin 0.8s linear infinite;">
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
          testCases: allCases,
          isSubmission: true
        })
      });

      const data = await res.json();

      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>Submit</span>
      `;

      if (data.success) {
        // Update Test Cases view with actual results
        renderTestCases(problem.testcases, data.results);
        document.getElementById('tab-testcases')?.click();

        // Update My Output console
        const myOutputEl = document.getElementById('myoutput-content');
        if (myOutputEl) {
          myOutputEl.innerHTML = `
            <div class="console-line text-muted">[Compiler Evaluation: ${escapeHtml(lang)}]</div>
            ${data.allPassed
              ? `<div class="console-line text-success" style="font-size: 15px;">ACCEPTED (100% Tests Passed)</div>`
              : `<div class="console-line" style="color: #ef4444; font-size: 15px; font-weight: 700;">NOT ACCEPTED: ${data.passedCount}/${data.totalCount} Passed</div>`
            }
            <hr style="border: 0.5px solid #334155; margin: 10px 0;" />
            ${data.results.map((r: any) => `
              <div class="console-line ${r.passed ? 'text-success' : 'text-code'}" style="${!r.passed ? 'color:#ef4444;' : ''}">
                Case ${r.num} (${r.visibility}): ${r.passed ? 'Passed' : `${r.status}`}
              </div>
            `).join('')}
          `;
        }

        if (data.allPassed) {
          // Confetti celebration
          confetti({
            particleCount: 130,
            spread: 85,
            origin: { y: 0.6 }
          });

          // Submit problem solve to backend to award real strict XP and store submission code
          try {
            const userEmail = localStorage.getItem('kuizu_user_email') || '';
            const userName = localStorage.getItem('kuizu_user_name') || '';
            const userCode = editor?.value || '';
            const userLang = langSelect?.value || 'cpp';
            const subRes = await fetch(`/api/problems/${problem.id}/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                name: userName,
                difficulty: problem.difficulty,
                code: userCode,
                language: userLang,
                passedCount: data.passedCount || data.totalCount || 0,
                totalCount: data.totalCount || 0,
                status: 'accepted',
                source: 'practice'
              })
            });
            const subData = await subRes.json();
            if (subData?.isFirstSolve) {
              showToast(`Accepted! 100% (${data.totalCount}/${data.totalCount}) Test Cases Passed! +${subData.rewardXp} XP Awarded!`, 4500);
            } else {
              showToast(`Accepted! All test cases passed! (Already solved previously • +0 XP)`, 4500);
            }
          } catch {
            showToast(`Accepted! 100% (${data.totalCount}/${data.totalCount}) Test Cases Passed!`, 4500);
          }

          // Calculate time taken in seconds
          const elapsedSeconds = Math.floor((Date.now() - problemStartTime) / 1000);
          const isHardProblem = String(problem.difficulty).toLowerCase() === 'hard';
          const isUnder10Mins = elapsedSeconds <= 600; // <= 10 minutes
          const isFirstAttempt = submissionAttemptCount === 1;

          // Check if eligible for Quick Thinker Gold Shield 3D Badge:
          // "first time hard problem solver within 10min in 1st attempt of code submission"
          const hasEarnedQuickThinker = localStorage.getItem('kuizu_quick_thinker_earned') === 'true';

          if (isHardProblem && isUnder10Mins && isFirstAttempt && !hasEarnedQuickThinker) {
            localStorage.setItem('kuizu_quick_thinker_earned', 'true');
            setTimeout(() => {
              showQuickThinkerBadgeModal(() => {
                // If this is also the user's very first problem solved overall, show first problem badge afterwards
                if (!localStorage.getItem('kuizu_first_problem_solved')) {
                  localStorage.setItem('kuizu_first_problem_solved', 'true');
                  showFirstProblemSolverBadgeModal();
                }
              });
            }, 650);
          } else {
            // Congratulate 1st problem solver with slowly moving 3D badge modal popup in center of screen
            setTimeout(() => {
              showFirstProblemSolverBadgeModal();
            }, 650);
          }
        } else {
          // Record failed submission into history as well
          try {
            const userEmail = localStorage.getItem('kuizu_user_email') || '';
            const userName = localStorage.getItem('kuizu_user_name') || '';
            const userCode = editor?.value || '';
            const userLang = langSelect?.value || 'cpp';
            fetch(`/api/problems/${problem.id}/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                name: userName,
                difficulty: problem.difficulty,
                code: userCode,
                language: userLang,
                passedCount: data.passedCount || 0,
                totalCount: data.totalCount || 0,
                status: 'failed',
                source: 'practice'
              })
            }).catch(() => {});
          } catch {}
          showToast(`Failed on Case ${data.passedCount + 1}: ${data.results[data.passedCount]?.status || 'Wrong Answer'}.`, 4500);
        }
      } else {
        showToast(data.error || 'Evaluation error', 4000);
      }
    } catch (err: any) {
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>Submit</span>
      `;
      showToast('Error connecting to evaluation backend.', 3500);
    }
  });

  // 12. Bookmark and Share Actions
  const bookmarkBtn = document.getElementById('btn-bookmark');
  bookmarkBtn?.addEventListener('click', () => {
    bookmarkBtn.classList.toggle('active');
    const isBookmarked = bookmarkBtn.classList.contains('active');
    showToast(isBookmarked ? 'Problem added to your bookmarks!' : 'Bookmark removed.');
  });

  const shareBtn = document.getElementById('btn-share');
  shareBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Problem link copied to clipboard!');
  });

  // 13. Compiler Toggle Button
  const compilerBtn = document.getElementById('btn-toggle-compiler');
  compilerBtn?.addEventListener('click', () => {
    document.getElementById('tab-myoutput')?.click();
    showToast('Viewing compiler stdout & execution environment.');
  });

  // 14. Submissions Button
  const submissionsBtn = document.getElementById('btn-view-submissions');
  submissionsBtn?.addEventListener('click', () => {
    const curProblemId = problem?.id || '001';
    window.location.href = `/problem/qlibrary/compiler/submission?id=${curProblemId}`;
  });

  // Expose for testing and external triggers
  (window as any).showFirstProblemSolverBadgeModal = showFirstProblemSolverBadgeModal;
  (window as any).showQuickThinkerBadgeModal = showQuickThinkerBadgeModal;
});

