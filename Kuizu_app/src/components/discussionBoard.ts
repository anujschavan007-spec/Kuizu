/**
 * KUIZU Question Discussion Board Component
 * Reusable discussion board for Problem Compiler and Contest Arena.
 * Features:
 * - Real-time discussion threads scoped by problem_id
 * - Like / Unlike buttons with toggle logic and persistent counts
 * - Automatic +15 XP reward when a post receives > 15 likes (idempotent, single reward per post)
 * - Per-post & board-level "Share Discussion" button with clipboard link copy
 * - Live Supabase Realtime synchronization
 * - Beautiful LeetCode-grade clean UI with dark mode support
 */
import confetti from 'canvas-confetti';
import { supabase } from '../services/supabaseApiBridge';

export interface DiscussionItem {
  id: number | string;
  problem_id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  title?: string;
  content: string;
  likes_count: number;
  dislikes_count: number;
  liked_by: string[];
  disliked_by: string[];
  xp_awarded: boolean;
  created_at: string;
}

export interface DiscussionBoardOptions {
  problemId: string;
  containerEl: HTMLElement;
  currentUser?: {
    name: string;
    email: string;
    avatar?: string;
    id?: string;
  };
  onXpChange?: (newXp: number) => void;
}

// Clean Toast Helper
function showToast(message: string): void {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'settings-toast';
  toast.innerHTML = `<span class="toast-text">${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTimeAgo(dateString: string): string {
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export class DiscussionBoard {
  private problemId: string;
  private containerEl: HTMLElement;
  private currentUser: { name: string; email: string; avatar?: string; id?: string };
  private discussions: DiscussionItem[] = [];
  private isExpanded: boolean = false;
  private channel: any = null;
  private onXpChange?: (newXp: number) => void;

  constructor(options: DiscussionBoardOptions) {
    this.problemId = options.problemId;
    this.containerEl = options.containerEl;
    this.onXpChange = options.onXpChange;

    // Resolve user from options, localStorage keys, or kuizu_user_profile
    let storedEmail = localStorage.getItem('kuizu_user_email') || '';
    let storedName = localStorage.getItem('kuizu_user_name') || '';
    let storedAvatar = localStorage.getItem('kuizu_user_avatar') || '';
    let storedId = localStorage.getItem('kuizu_user_id') || '';

    try {
      const rawProfile = localStorage.getItem('kuizu_user_profile');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        if (!storedEmail && parsed.email) storedEmail = parsed.email;
        if (!storedName && (parsed.name || parsed.fullName)) storedName = parsed.name || parsed.fullName;
        if (!storedAvatar && (parsed.avatar || parsed.avatarUrl)) storedAvatar = parsed.avatar || parsed.avatarUrl;
        if (!storedId && parsed.id) storedId = parsed.id;
      }
    } catch {}

    this.currentUser = options.currentUser || {
      name: storedName || 'Student',
      email: storedEmail,
      avatar: storedAvatar || '/images/home_avatar.png',
      id: storedId
    };

    // Auto-expand if URL has #discussion anchor
    if (typeof window !== 'undefined' && window.location.hash.includes('discussion')) {
      this.isExpanded = true;
    }

    this.renderSkeleton();
    this.bindHeaderEvents();
    this.fetchDiscussions().then(() => {
      this.handleHashScroll();
    });
    this.initRealtime();
  }

  private handleHashScroll(): void {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#discussion-')) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('discussion-highlight-glow');
        setTimeout(() => target.classList.remove('discussion-highlight-glow'), 3000);
      }
    }
  }

  public setProblemId(newProblemId: string): void {
    if (this.problemId === newProblemId) return;
    this.problemId = newProblemId;
    this.fetchDiscussions();
  }

  private renderSkeleton(): void {
    this.containerEl.innerHTML = `
      <div class="problem-discussion-board-card" id="discussion-board-card">
        <!-- Accordion Header matching Screenshot -->
        <div class="discussion-board-header" id="discussion-board-toggle" role="button" tabindex="0" aria-expanded="${this.isExpanded}">
          <div class="discussion-header-left">
            <div class="discussion-icon-wrap">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <div class="discussion-header-title-row" style="display: flex; align-items: center; gap: 8px;">
                <h3 class="discussion-heading" style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">Discussion Board</h3>
                <span class="discussion-count-badge" id="discussion-count-badge" style="background: #EFF6FF; color: #2563EB; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">0</span>
              </div>
              <p class="discussion-subtext" style="margin: 2px 0 0 0; font-size: 12.5px; color: #64748B;">Ask questions, share hints, and discuss solutions</p>
            </div>
          </div>
          <div class="discussion-header-right" style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn-share-board-pill" id="btn-share-board" title="Share discussion link" style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; border: 1.5px solid #E2E8F0; background: #FFFFFF; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>Share</span>
            </button>
            <svg class="discussion-chevron" id="discussion-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" style="transition: transform 0.2s ease; transform: ${this.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- Collapsible Content -->
        <div class="discussion-board-body" id="discussion-board-body" style="display: ${this.isExpanded ? 'block' : 'none'}; padding: 16px 20px 20px 20px; border-top: 1px solid #F1F5F9;">
          <!-- Post Input Box -->
          <div class="discussion-create-box" id="discussion-create-box" style="margin-bottom: 20px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px;">
            ${this.renderCreateBoxContent()}
          </div>

          <!-- Discussions List Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 12.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">All Discussions</span>
            <span id="discussion-reward-tip" style="font-size: 11.5px; color: #D97706; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>★ Earn +15 XP when your discussion reaches 16+ likes</span>
            </span>
          </div>

          <!-- List Container -->
          <div class="discussion-items-list" id="discussion-items-list" style="display: flex; flex-direction: column; gap: 12px;">
            <div style="text-align: center; padding: 24px; color: #94A3B8; font-size: 13px;">Loading discussions...</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCreateBoxContent(): string {
    const isAuthenticated = Boolean(this.currentUser.email);

    if (!isAuthenticated) {
      return `
        <div style="text-align: center; padding: 12px 8px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">Sign in to join the discussion, ask questions, and earn community XP!</p>
          <a href="/sign-in" class="btn-discuss-signin" style="display: inline-block; padding: 6px 16px; border-radius: 8px; background: #2563EB; color: #FFFFFF; font-size: 12.5px; font-weight: 700; text-decoration: none;">
            Sign In with KUIZU
          </a>
        </div>
      `;
    }

    return `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <div class="user-avatar-tiny" style="width: 32px; height: 32px; border-radius: 50%; background: #EFF6FF; border: 1.5px solid #CBD5E1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #2563EB; flex-shrink: 0;">
          ${(this.currentUser.name || 'U').slice(0, 2).toUpperCase()}
        </div>
        <div style="flex: 1;">
          <input type="text" id="discussion-input-title" placeholder="Topic title (optional)..." style="width: 100%; box-sizing: border-box; padding: 6px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 13px; margin-bottom: 6px; background: #FFFFFF; color: #0F172A;" />
          <textarea id="discussion-input-content" placeholder="Share your insights, edge cases, complexity hints, or questions (code not allowed)..." rows="3" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 13px; font-family: inherit; line-height: 1.45; resize: vertical; background: #FFFFFF; color: #0F172A;"></textarea>
          
          <!-- Code Blocked Warning Banner -->
          <div id="discussion-code-warning" style="display: none; margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; font-size: 12px; font-weight: 600; line-height: 1.4; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
            <span>Code detected. Code cannot be posted in discussions. Please describe your approach or logic in plain text.</span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
            <span style="font-size: 11.5px; color: #94A3B8;">Code sharing is disabled on this board</span>
            <button type="button" id="btn-post-discussion" style="padding: 7px 16px; border-radius: 8px; background: #2563EB; color: #FFFFFF; font-size: 12.5px; font-weight: 700; border: none; cursor: pointer; transition: background 0.15s ease;">
              Post Discussion
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindHeaderEvents(): void {
    const toggle = this.containerEl.querySelector('#discussion-board-toggle');
    const body = this.containerEl.querySelector('#discussion-board-body') as HTMLElement | null;
    const chevron = this.containerEl.querySelector('#discussion-chevron') as HTMLElement | null;
    const btnShareBoard = this.containerEl.querySelector('#btn-share-board');

    toggle?.addEventListener('click', (e) => {
      // Ignore if clicking on share button directly
      if ((e.target as HTMLElement).closest('#btn-share-board')) return;

      this.isExpanded = !this.isExpanded;
      if (body) body.style.display = this.isExpanded ? 'block' : 'none';
      if (chevron) chevron.style.transform = this.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      toggle.setAttribute('aria-expanded', String(this.isExpanded));
    });

    btnShareBoard?.addEventListener('click', (e) => {
      e.stopPropagation();
      const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(this.problemId)}#discussion`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Discussion board link copied to clipboard!');
      }).catch(() => {
        showToast(`Link: ${shareUrl}`);
      });
    });

    // Code detection function for front-end
    const checkCodeContent = (text: string): boolean => {
      if (!text) return false;
      if (/```[\s\S]*?```/.test(text) || /`[^`]{3,}`/.test(text)) return true;
      if (/<\s*(?:script|div|span|p|code|pre|table|button|input|form)\b[^>]*>/i.test(text)) return true;

      const codePatterns = [
        /#\s*include\s*<.*?>/,
        /using\s+namespace\s+std\s*;/,
        /\b(?:public|private|protected)\s+(?:static\s+)?(?:void|int|float|double|char|string|boolean|class)\b/,
        /\b(?:def|function|class)\s+[a-zA-Z_]\w*\s*\(/,
        /\b(?:const|let|var)\s+[a-zA-Z_]\w*\s*=\s*(?:function|\(.*?\)|\{)/,
        /\b(?:int|float|double|char|void|long|bool)\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*\{/,
        /\bfor\s*\([^;]*;[^;]*;[^)]*\)/,
        /\bwhile\s*\(.*?\)\s*\{/,
        /\bif\s*\(.*?\)\s*\{/,
        /\bconsole\.(?:log|error|warn)\s*\(/,
        /\bSystem\.out\.println\s*\(/,
        /\bprintf\s*\(.*?\)\s*;/,
        /\bcout\s*<<\s*/,
        /\bcin\s*>>\s*/,
        /\bprint\s*\([^)]*\)/,
        /\breturn\s+[a-zA-Z0-9_\(\)]+;/,
        /;\s*\n\s*[a-zA-Z_]\w*\s*=/
      ];

      for (const pattern of codePatterns) {
        if (pattern.test(text)) return true;
      }

      const braceCount = (text.match(/[{}]/g) || []).length;
      const semiCount = (text.match(/;/g) || []).length;
      if (braceCount >= 2 && semiCount >= 2) return true;

      return false;
    };

    // Real-time input listener to block code immediately
    const inputTitle = this.containerEl.querySelector('#discussion-input-title') as HTMLInputElement | null;
    const inputContent = this.containerEl.querySelector('#discussion-input-content') as HTMLTextAreaElement | null;
    const warningBox = this.containerEl.querySelector('#discussion-code-warning') as HTMLElement | null;
    const btnPost = this.containerEl.querySelector('#btn-post-discussion') as HTMLButtonElement | null;

    const validateInputs = () => {
      const text = `${inputTitle?.value || ''}\n${inputContent?.value || ''}`;
      const hasCode = checkCodeContent(text);
      if (warningBox) {
        warningBox.style.display = hasCode ? 'flex' : 'none';
      }
      if (btnPost) {
        if (hasCode) {
          btnPost.disabled = true;
          btnPost.style.opacity = '0.5';
          btnPost.style.cursor = 'not-allowed';
          btnPost.title = 'Code is not allowed in discussions';
        } else {
          btnPost.disabled = false;
          btnPost.style.opacity = '1';
          btnPost.style.cursor = 'pointer';
          btnPost.title = '';
        }
      }
      return hasCode;
    };

    inputTitle?.addEventListener('input', validateInputs);
    inputContent?.addEventListener('input', validateInputs);

    // Post button event
    btnPost?.addEventListener('click', () => {
      if (validateInputs()) {
        showToast('Code detected! Comments containing code are blocked.');
        return;
      }
      this.handlePostDiscussion();
    });
  }

  public async fetchDiscussions(): Promise<void> {
    try {
      const res = await fetch(`/api/discussions?problem_id=${encodeURIComponent(this.problemId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.discussions = data.discussions || [];

      // Update badge
      const countBadge = this.containerEl.querySelector('#discussion-count-badge');
      if (countBadge) {
        countBadge.textContent = String(this.discussions.length);
      }

      this.renderDiscussionsList();
    } catch (e) {
      console.warn('Could not fetch discussions:', e);
      const listEl = this.containerEl.querySelector('#discussion-items-list');
      if (listEl) {
        listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #94A3B8; font-size: 13px;">No discussions yet. Be the first to share your thoughts!</div>`;
      }
    }
  }

  private renderDiscussionsList(): void {
    const listEl = this.containerEl.querySelector('#discussion-items-list');
    if (!listEl) return;

    if (this.discussions.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 12px; color: #64748B;">
          <div style="font-size: 24px; margin-bottom: 6px;">💬</div>
          <div style="font-weight: 700; color: #1E293B; font-size: 14px;">No discussions yet for this question</div>
          <div style="font-size: 12.5px; margin-top: 4px;">Share your explanation, ask questions, or help fellow students to earn XP!</div>
        </div>
      `;
      return;
    }

    const currentEmail = (this.currentUser.email || '').toLowerCase();

    listEl.innerHTML = this.discussions.map((d) => {
      const isAuthor = currentEmail && d.user_email?.toLowerCase() === currentEmail;
      const userLiked = Array.isArray(d.liked_by) && d.liked_by.includes(currentEmail);
      const userDisliked = Array.isArray(d.disliked_by) && d.disliked_by.includes(currentEmail);
      const hasEarnedXp = d.xp_awarded || d.likes_count > 15;

      return `
        <div class="discussion-item-card" id="discussion-${d.id}" style="background: #FFFFFF; border: 1.5px solid ${hasEarnedXp ? '#FDE68A' : '#E2E8F0'}; border-radius: 12px; padding: 14px; transition: all 0.2s ease;">
          <!-- Top Row: Author & Time & XP Badge -->
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #EFF6FF; border: 1px solid #DBEAFE; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #2563EB;">
                ${(d.user_name || 'S').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 13.5px; font-weight: 700; color: #0F172A;">${escapeHtml(d.user_name)}</span>
                  ${isAuthor ? `<span style="font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #EFF6FF; color: #2563EB; font-weight: 700;">YOU</span>` : ''}
                </div>
                <div style="font-size: 11.5px; color: #64748B;">${formatTimeAgo(d.created_at)}</div>
              </div>
            </div>

            ${hasEarnedXp ? `
              <span class="badge-xp-awarded-pill" title="This discussion earned +15 XP for passing 15 likes!" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 9999px; background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; font-size: 11px; font-weight: 800;">
                <span>★ +15 XP Earned</span>
              </span>
            ` : ''}
          </div>

          <!-- Title if provided -->
          ${d.title ? `<div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">${escapeHtml(d.title)}</div>` : ''}

          <!-- Content Body -->
          <div style="font-size: 13px; line-height: 1.5; color: #334155; white-space: pre-wrap; word-break: break-word; margin-bottom: 12px;">${escapeHtml(d.content)}</div>

          <!-- Bottom Actions Row: Like, Unlike, Share, Delete -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #F1F5F9; padding-top: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <!-- Like Button -->
              <button type="button" class="btn-disc-like ${userLiked ? 'active' : ''}" data-id="${d.id}" title="Like this discussion" style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; border: 1.5px solid ${userLiked ? '#2563EB' : '#E2E8F0'}; background: ${userLiked ? '#EFF6FF' : '#FFFFFF'}; color: ${userLiked ? '#2563EB' : '#475569'}; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="${userLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
                <span class="like-counter">${d.likes_count || 0}</span>
              </button>

              <!-- Unlike / Dislike Button -->
              <button type="button" class="btn-disc-dislike ${userDisliked ? 'active' : ''}" data-id="${d.id}" title="Unlike this discussion" style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; border: 1.5px solid ${userDisliked ? '#EF4444' : '#E2E8F0'}; background: ${userDisliked ? '#FEF2F2' : '#FFFFFF'}; color: ${userDisliked ? '#EF4444' : '#475569'}; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="${userDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                </svg>
                <span class="dislike-counter">${d.dislikes_count || 0}</span>
              </button>

              <!-- Share Discussion Button -->
              <button type="button" class="btn-disc-share" data-id="${d.id}" title="Share this specific comment" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                <span>Share</span>
              </button>
            </div>

            <!-- Delete if author or admin -->
            ${isAuthor || currentEmail === 'anujschavan007@gmail.com' ? `
              <button type="button" class="btn-disc-delete" data-id="${d.id}" title="Delete comment" style="border: none; background: transparent; color: #94A3B8; cursor: pointer; padding: 4px; border-radius: 4px; display: inline-flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.bindItemActions();
  }

  private bindItemActions(): void {
    const listEl = this.containerEl.querySelector('#discussion-items-list');
    if (!listEl) return;

    // Like Button Clicks
    listEl.querySelectorAll('.btn-disc-like').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.handleVote(id, 'like');
      });
    });

    // Unlike / Dislike Button Clicks
    listEl.querySelectorAll('.btn-disc-dislike').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.handleVote(id, 'dislike');
      });
    });

    // Share Button Clicks
    listEl.querySelectorAll('.btn-disc-share').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(this.problemId)}#discussion-${id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('Discussion comment link copied to clipboard!');
        }).catch(() => {
          showToast(`Link: ${shareUrl}`);
        });
      });
    });

    // Delete Button Clicks
    listEl.querySelectorAll('.btn-disc-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id && confirm('Are you sure you want to delete this discussion post?')) {
          this.handleDelete(id);
        }
      });
    });
  }

  private async handlePostDiscussion(): Promise<void> {
    if (!this.currentUser.email) {
      showToast('Please sign in to post on the discussion board.');
      return;
    }

    const inputTitle = this.containerEl.querySelector('#discussion-input-title') as HTMLInputElement | null;
    const inputContent = this.containerEl.querySelector('#discussion-input-content') as HTMLTextAreaElement | null;
    const btnPost = this.containerEl.querySelector('#btn-post-discussion') as HTMLButtonElement | null;

    const title = inputTitle?.value?.trim() || '';
    const content = inputContent?.value?.trim() || '';

    if (!content) {
      showToast('Please enter some text before posting.');
      inputContent?.focus();
      return;
    }

    if (btnPost) {
      btnPost.disabled = true;
      btnPost.textContent = 'Posting...';
    }

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: this.problemId,
          user_id: this.currentUser.id,
          user_name: this.currentUser.name,
          user_email: this.currentUser.email,
          user_avatar: this.currentUser.avatar,
          title,
          content
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit discussion');
      }

      if (inputTitle) inputTitle.value = '';
      if (inputContent) inputContent.value = '';

      showToast('Discussion posted successfully!');
      await this.fetchDiscussions();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not post'}`);
    } finally {
      if (btnPost) {
        btnPost.disabled = false;
        btnPost.textContent = 'Post Discussion';
      }
    }
  }

  private async handleVote(discussionId: string, action: 'like' | 'dislike'): Promise<void> {
    if (!this.currentUser.email) {
      showToast('Please sign in to like or unlike discussions.');
      return;
    }

    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(discussionId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: this.currentUser.email,
          action
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Vote failed');
      }

      // Check if +15 XP was rewarded for crossing 15 likes!
      if (data.xp_rewarded) {
        if (data.author_email?.toLowerCase() === this.currentUser.email.toLowerCase()) {
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          showToast('Achievement Unlocked: Your discussion reached 16+ likes! +15 XP awarded!');
          // Increment local XP in profile
          try {
            const raw = localStorage.getItem('kuizu_user_profile');
            if (raw) {
              const p = JSON.parse(raw);
              const newXp = (Number(p.xp) || 0) + 15;
              p.xp = String(newXp);
              localStorage.setItem('kuizu_user_profile', JSON.stringify(p));
              const menuXpEl = document.getElementById('menu-user-xp');
              if (menuXpEl) menuXpEl.textContent = `${newXp.toLocaleString()} XP`;
            }
          } catch {}
          if (this.onXpChange) this.onXpChange(15);
        } else {
          showToast('Helpful discussion reached 16+ likes! Author was awarded +15 XP!');
        }
      }

      // Refresh list
      await this.fetchDiscussions();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Vote failed'}`);
    }
  }

  private async handleDelete(discussionId: string): Promise<void> {
    try {
      const res = await fetch(`/api/discussions/${encodeURIComponent(discussionId)}?email=${encodeURIComponent(this.currentUser.email)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: this.currentUser.email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete');
      }

      showToast('Discussion deleted');
      await this.fetchDiscussions();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not delete'}`);
    }
  }

  private initRealtime(): void {
    try {
      this.channel = supabase
        .channel(`discussion-${this.problemId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'question_discussions' },
          (payload: any) => {
            if (payload.new && payload.new.problem_id === this.problemId) {
              this.fetchDiscussions();
            } else if (payload.old) {
              this.fetchDiscussions();
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not available:', e);
    }
  }

  public destroy(): void {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch {}
    }
  }
}

/**
 * Convenient factory function to attach discussion board to container element
 */
export function initDiscussionBoard(options: DiscussionBoardOptions): DiscussionBoard {
  return new DiscussionBoard(options);
}
