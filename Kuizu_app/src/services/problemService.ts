import type { Problem, Badge, FilterOptions } from '../types/index.ts';

/**
 * Backend API Configuration
 * When connecting to your real backend server, set USE_MOCK = false
 * and configure API_BASE_URL (e.g. 'http://localhost:5000/api' or '/api')
 */
export const USE_MOCK = false;
export const API_BASE_URL = '/api';

// Initial Mock Dataset matching img2_prblms.png exactly
export const mockBadges: Badge[] = [
  {
    id: 'badge-1',
    title: 'First Solve',
    subtitle: 'Solved 1st problem',
    type: 'first-solve',
    iconColor: '#10b981'
  },
  {
    id: 'badge-2',
    title: '7-Day Streak',
    subtitle: 'Learning streak 7 days',
    type: 'streak',
    iconColor: '#8b5cf6'
  },
  {
    id: 'badge-3',
    title: 'Problem Solver',
    subtitle: 'Solved 10 problems',
    type: 'solver',
    iconColor: '#3b82f6'
  },
  {
    id: 'badge-4',
    title: 'Quick Thinker',
    subtitle: 'Solved in under 10 mins',
    type: 'quick',
    iconColor: '#f59e0b'
  }
];

export const mockProblems: Problem[] = [
  {
    id: '001',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topic: { name: 'Arrays', icon: 'arrays' },
    rewardXp: 10
  },
  {
    id: '002',
    title: 'Reverse a String',
    slug: 'reverse-a-string',
    difficulty: 'Easy',
    topic: { name: 'Strings', icon: 'strings' },
    rewardXp: 10
  },
  {
    id: '003',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'Medium',
    topic: { name: 'Stack', icon: 'stack' },
    rewardXp: 20
  },
  {
    id: '004',
    title: 'Binary Search',
    slug: 'binary-search',
    difficulty: 'Medium',
    topic: { name: 'Searching', icon: 'searching' },
    rewardXp: 20
  },
  {
    id: '005',
    title: 'Merge Sort',
    slug: 'merge-sort',
    difficulty: 'Hard',
    topic: { name: 'Sorting', icon: 'sorting' },
    rewardXp: 40
  },
  {
    id: '006',
    title: 'Longest Common Subsequence',
    slug: 'longest-common-subsequence',
    difficulty: 'Hard',
    topic: { name: 'Dynamic Programming', icon: 'dp' },
    rewardXp: 40
  }
];

/**
 * Fetch Problems from backend API or fallback to mock data
 */
export async function fetchProblems(filters?: FilterOptions): Promise<Problem[]> {
  if (!USE_MOCK) {
    try {
      const params = new URLSearchParams();
      if (filters?.searchQuery) params.append('q', filters.searchQuery);
      if (filters?.difficulty && filters.difficulty !== 'All') params.append('difficulty', filters.difficulty);
      if (filters?.topic && filters.topic !== 'All') params.append('topic', filters.topic);

      const res = await fetch(`${API_BASE_URL}/problems?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.problems)) {
        return data.problems;
      }
      return Array.isArray(data) ? data : mockProblems;
    } catch (err) {
      console.warn('Backend API unavailable, falling back to local dataset:', err);
    }
  }

  // Local filter logic
  let results = [...mockProblems];

  if (filters?.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    results = results.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.topic.name.toLowerCase().includes(q) ||
      p.id.includes(q)
    );
  }

  if (filters?.difficulty && filters.difficulty !== 'All') {
    results = results.filter(p => p.difficulty === filters.difficulty);
  }

  if (filters?.topic && filters.topic !== 'All') {
    results = results.filter(p => p.topic.name.toLowerCase() === filters.topic?.toLowerCase());
  }

  return results;
}

/**
 * Fetch Badges from backend API or fallback to mock data
 */
export async function fetchBadges(): Promise<Badge[]> {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/badges`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend API unavailable, falling back to local badges:', err);
    }
  }
  return mockBadges;
}
