import confetti from 'canvas-confetti';

type RoutePath = '/' | '/sign-in' | '/sign-up';

// DOM Views
const viewLanding = document.getElementById('view-landing') as HTMLElement | null;
const viewAuth = document.getElementById('view-auth') as HTMLElement | null;

// Auth Card Elements
const authMainHeading = document.getElementById('auth-main-heading') as HTMLElement | null;
const authMainSubheading = document.getElementById('auth-main-subheading') as HTMLElement | null;
const authCardTitle = document.getElementById('auth-card-title') as HTMLElement | null;
const authCardSubtitle = document.getElementById('auth-card-subtitle') as HTMLElement | null;
const fieldSignupName = document.getElementById('field-signup-name') as HTMLElement | null;
const authBtnText = document.getElementById('auth-btn-text') as HTMLElement | null;
const authSwitchPrompt = document.getElementById('auth-switch-prompt') as HTMLElement | null;
const authSwitchLink = document.getElementById('auth-switch-link') as HTMLAnchorElement | null;
const authForm = document.getElementById('kuizu-auth-form') as HTMLFormElement | null;
const inputPassword = document.getElementById('input-password') as HTMLInputElement | null;
const btnTogglePwd = document.getElementById('btn-toggle-pwd') as HTMLButtonElement | null;

// Toast notice element
let toastTimeout: number | undefined;

function showToast(message: string, icon = '🎉') {
  let toast = document.getElementById('kuizu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 3500);
}

/**
 * Configure view and contents according to URL route path
 */
export function navigateTo(path: string, push = true) {
  // Normalize path
  let normalizedPath = path.toLowerCase().trim();
  if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  if (normalizedPath === '/login') normalizedPath = '/sign-in';
  if (normalizedPath === '/register') normalizedPath = '/sign-up';

  if (push && window.location.pathname !== normalizedPath) {
    window.history.pushState({ path: normalizedPath }, '', normalizedPath);
  }

  if (normalizedPath === '/sign-in') {
    // Configure Sign In mode
    document.title = 'Sign In • KUIZU';

    if (viewLanding) viewLanding.classList.remove('active');
    if (viewAuth) viewAuth.classList.add('active');

    if (authMainHeading) {
      authMainHeading.innerHTML = `Welcome Back to <br /><span class="brand-accent">KUIZU</span>`;
    }
    if (authMainSubheading) {
      authMainSubheading.textContent = 'Log in to continue your coding journey. Solve problems, join contests and level up your skills!';
    }
    if (authCardTitle) {
      authCardTitle.textContent = 'Login to Your Account';
    }
    if (authCardSubtitle) {
      authCardSubtitle.textContent = 'Welcome back! Please enter your details to continue.';
    }
    if (fieldSignupName) {
      fieldSignupName.style.display = 'none';
      const nameInput = fieldSignupName.querySelector('input');
      if (nameInput) nameInput.required = false;
    }
    if (authBtnText) {
      authBtnText.textContent = 'Login';
    }
    if (authSwitchPrompt) {
      authSwitchPrompt.textContent = "Don't have an account?";
    }
    if (authSwitchLink) {
      authSwitchLink.textContent = 'Sign Up';
      authSwitchLink.setAttribute('href', '/sign-up');
      authSwitchLink.setAttribute('data-path', '/sign-up');
    }
  } else if (normalizedPath === '/sign-up') {
    // Configure Sign Up mode
    document.title = 'Sign Up • KUIZU';

    if (viewLanding) viewLanding.classList.remove('active');
    if (viewAuth) viewAuth.classList.add('active');

    if (authMainHeading) {
      authMainHeading.innerHTML = `Join the Adventure with <br /><span class="brand-accent">KUIZU</span>`;
    }
    if (authMainSubheading) {
      authMainSubheading.textContent = 'Create an account to embark on quests, solve challenges, and climb the leaderboards!';
    }
    if (authCardTitle) {
      authCardTitle.textContent = 'Create Your Account';
    }
    if (authCardSubtitle) {
      authCardSubtitle.textContent = 'Start your journey! Please enter your details to register.';
    }
    if (fieldSignupName) {
      fieldSignupName.style.display = 'block';
      const nameInput = fieldSignupName.querySelector('input');
      if (nameInput) nameInput.required = true;
    }
    if (authBtnText) {
      authBtnText.textContent = 'Create Account';
    }
    if (authSwitchPrompt) {
      authSwitchPrompt.textContent = 'Already have an account?';
    }
    if (authSwitchLink) {
      authSwitchLink.textContent = 'Sign In';
      authSwitchLink.setAttribute('href', '/sign-in');
      authSwitchLink.setAttribute('data-path', '/sign-in');
    }
  } else {
    // Landing page /
    document.title = 'KUIZU • Gamified Coding Platform';

    if (viewAuth) viewAuth.classList.remove('active');
    if (viewLanding) viewLanding.classList.add('active');
  }

  // Smooth scroll to top on page navigation
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global click handler for all .route-link elements
document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.route-link') as HTMLElement | null;
  if (!target) return;

  const targetPath = target.getAttribute('data-path') || target.getAttribute('href');
  if (targetPath && (targetPath.startsWith('/') || targetPath === '')) {
    e.preventDefault();
    navigateTo(targetPath || '/');
  }
});

// Popstate listener for browser Back / Forward buttons
window.addEventListener('popstate', () => {
  navigateTo(window.location.pathname, false);
});

// Password visibility toggle
if (btnTogglePwd && inputPassword) {
  let isPasswordVisible = false;

  btnTogglePwd.addEventListener('click', () => {
    isPasswordVisible = !isPasswordVisible;
    inputPassword.type = isPasswordVisible ? 'text' : 'password';

    btnTogglePwd.innerHTML = isPasswordVisible
      ? `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
           <line x1="1" y1="1" x2="23" y2="23"></line>
         </svg>`
      : `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
           <circle cx="12" cy="12" r="3"></circle>
         </svg>`;
  });
}

// Auth Form Submission
if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const isSignUp = window.location.pathname.includes('sign-up');
    const email = (document.getElementById('input-email') as HTMLInputElement)?.value;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    showToast(
      isSignUp
        ? `Account created successfully! Welcome to KUIZU!`
        : `Signed in as ${email}! Welcome back to the Arena!`
    );
  });
}

// Social Login buttons
const btnGoogle = document.getElementById('btn-social-google');
if (btnGoogle) {
  btnGoogle.addEventListener('click', () => {
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 },
    });
    showToast('Connecting with Google authentication...');
  });
}

const btnGithub = document.getElementById('btn-social-github');
if (btnGithub) {
  btnGithub.addEventListener('click', () => {
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 },
    });
    showToast('Connecting with GitHub authentication...');
  });
}

// Forgot Password Link
const linkForgot = document.getElementById('link-forgot-pwd');
if (linkForgot) {
  linkForgot.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Password reset link sent to your email!', '📧');
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  navigateTo(window.location.pathname, false);
});

// Run once immediately in case DOM is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  navigateTo(window.location.pathname, false);
}
