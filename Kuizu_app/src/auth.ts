import './theme';
import confetti from 'canvas-confetti';
import { getClerk, syncClerkUserToLocalStorage } from './services/clerkService';

// Toast helper
let toastTimeout: number | undefined;
function showToast(message: string, icon = '🎉', isError = false) {
  let toast = document.getElementById('kuizu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;
  if (isError) {
    toast.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    toast.style.background = 'rgba(254, 242, 242, 0.95)';
    toast.style.color = '#991b1b';
  } else {
    toast.style.borderColor = '';
    toast.style.background = '';
    toast.style.color = '';
  }
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 4000);
}

function setButtonLoading(btn: HTMLElement | null, loading: boolean, loadingText?: string) {
  if (!btn) return;
  if (loading) {
    btn.setAttribute('data-orig-content', btn.innerHTML);
    btn.setAttribute('disabled', 'true');
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    if (loadingText) {
      btn.innerHTML = `<span style="display:inline-block;animation:spin 1s infinite linear;margin-right:8px;">⏳</span><span>${loadingText}</span>`;
    }
  } else {
    const orig = btn.getAttribute('data-orig-content');
    if (orig) btn.innerHTML = orig;
    btn.removeAttribute('disabled');
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
  }
}

// Password visibility toggle
const btnTogglePwd = document.getElementById('btn-toggle-pwd');
const inputPassword = document.getElementById('input-password') as HTMLInputElement | null;

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
function setInlineError(msg: string | null, errorField?: 'email' | 'password') {
  const banner = document.getElementById('auth-error-banner');
  const emailInput = document.getElementById('input-email');
  const passwordInput = document.getElementById('input-password');

  emailInput?.classList.remove('input-error');
  passwordInput?.classList.remove('input-error');

  if (errorField === 'email') emailInput?.classList.add('input-error');
  if (errorField === 'password') passwordInput?.classList.add('input-error');

  if (banner) {
    if (msg) {
      banner.innerHTML = `<span style="font-size: 18px; margin-right: 4px;">⚠️</span><div>${msg}</div>`;
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      banner.innerHTML = '';
      banner.style.display = 'none';
    }
  }
}

/**
 * Present Email OTP Modal if Clerk requires email verification
 */
function showEmailVerificationModal(
  email: string,
  onVerify: (code: string) => Promise<boolean>,
  onResend?: () => Promise<void>,
  onSkip?: () => void
) {
  let overlay = document.getElementById('auth-otp-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'auth-otp-overlay';
    overlay.className = 'auth-otp-overlay';
    overlay.innerHTML = `
      <div class="auth-otp-modal">
        <div class="auth-otp-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
        <h3 class="auth-otp-title">Verify Your Email</h3>
        <p class="auth-otp-subtitle">
          We sent a 6-digit verification code to<br/>
          <strong id="auth-otp-email-label" style="color: #4f46e5;"></strong>
        </p>
        <p style="margin: -14px 0 18px 0; font-size: 12px; color: #6366f1; background: #eef2ff; padding: 6px 10px; border-radius: 8px;">
          💡 <strong>Testing tip:</strong> In Clerk Dev Mode, the test code is <strong>424242</strong>
        </p>
        <div class="auth-otp-input-group">
          <input type="text" id="auth-otp-code" class="auth-otp-input" maxlength="6" placeholder="••••••" autocomplete="one-time-code" />
          <div id="auth-otp-error" class="auth-otp-error"></div>
        </div>
        <div class="auth-otp-actions">
          <button type="button" id="auth-otp-btn-submit" class="auth-otp-btn-submit">Verify & Continue</button>
          <div class="auth-otp-footer-links">
            <button type="button" id="auth-otp-resend" class="auth-otp-resend-btn">Resend code</button>
            <button type="button" id="auth-otp-cancel" class="auth-otp-cancel-btn">Cancel</button>
          </div>
          <button type="button" id="auth-otp-skip" style="background: none; border: none; font-size: 11.5px; color: #94a3b8; text-decoration: underline; cursor: pointer; margin-top: 8px;">
            Continue as demo user without verifying
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const emailLabel = document.getElementById('auth-otp-email-label');
  const codeInput = document.getElementById('auth-otp-code') as HTMLInputElement | null;
  const errorEl = document.getElementById('auth-otp-error');
  const btnSubmit = document.getElementById('auth-otp-btn-submit') as HTMLButtonElement | null;
  const btnResend = document.getElementById('auth-otp-resend');
  const btnCancel = document.getElementById('auth-otp-cancel');
  const btnSkip = document.getElementById('auth-otp-skip');

  if (emailLabel) emailLabel.textContent = email;
  if (codeInput) {
    codeInput.value = '';
    setTimeout(() => codeInput.focus(), 200);
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  overlay.classList.add('show');

  const closeOverlay = () => {
    overlay?.classList.remove('show');
  };

  btnCancel?.replaceWith(btnCancel.cloneNode(true));
  const newBtnCancel = document.getElementById('auth-otp-cancel');
  newBtnCancel?.addEventListener('click', closeOverlay);

  btnSkip?.replaceWith(btnSkip.cloneNode(true));
  const newBtnSkip = document.getElementById('auth-otp-skip');
  newBtnSkip?.addEventListener('click', () => {
    closeOverlay();
    if (onSkip) onSkip();
  });

  btnResend?.replaceWith(btnResend.cloneNode(true));
  const newBtnResend = document.getElementById('auth-otp-resend');
  newBtnResend?.addEventListener('click', async () => {
    try {
      showToast('Sending a new code...', '✉️');
      if (onResend) await onResend();
      showToast('New code sent to your email!', '✉️');
    } catch (err: any) {
      showToast(err?.message || 'Failed to resend code', '⚠️', true);
    }
  });

  const submitAction = async () => {
    const code = codeInput?.value.trim();
    if (!code || code.length < 6) {
      if (errorEl) {
        errorEl.textContent = 'Please enter the complete 6-digit code';
        errorEl.style.display = 'block';
      }
      return;
    }

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Verifying...';
      }
      if (errorEl) errorEl.style.display = 'none';

      const success = await onVerify(code);
      if (success) {
        closeOverlay();
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      if (errorEl) {
        errorEl.textContent =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Invalid verification code. Please try again.';
        errorEl.style.display = 'block';
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Verify & Continue';
      }
    }
  };

  btnSubmit?.replaceWith(btnSubmit.cloneNode(true));
  const newBtnSubmit = document.getElementById('auth-otp-btn-submit');
  newBtnSubmit?.addEventListener('click', submitAction);

  codeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAction();
    }
  });
}

// Handle Form Submission (Sign In & Sign Up connected to Clerk)
const form = document.querySelector('form.auth-form-fields') as HTMLFormElement | null;
const submitBtn = document.getElementById('auth-submit-btn');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isSignUp = form.getAttribute('data-auth-mode') === 'signup';
    const emailInput = document.getElementById('input-email') as HTMLInputElement | null;
    const passwordInput = document.getElementById('input-password') as HTMLInputElement | null;
    const nameInput = document.getElementById('input-name') as HTMLInputElement | null;

    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    setInlineError(null);

    if (!email) {
      setInlineError('Please enter your email address.', 'email');
      return;
    }
    if (!password) {
      setInlineError('Please enter your password.', 'password');
      return;
    }

    // Clerk security setting check
    if (isSignUp && password.length < 15) {
      setInlineError(
        'Password must be at least 15 characters long (e.g. <code>MySecurePassword123!</code>). This is required by your Clerk instance security settings.',
        'password'
      );
      showToast('Password must be 15+ characters', '⚠️', true);
      return;
    }

    try {
      setButtonLoading(submitBtn, true, isSignUp ? 'Creating Account...' : 'Signing In...');
      const clerk = await getClerk();
      const client = clerk.client;
      if (!client) throw new Error('Clerk client not initialized');

      // Clear any prior lingering session to avoid session_exists error
      if (clerk.session) {
        try {
          await clerk.signOut();
        } catch (_) {}
      }

      if (isSignUp) {
        // --- Sign Up with Clerk ---
        const fullName = nameInput?.value.trim() || '';
        const [firstName, ...rest] = fullName.split(' ');
        const lastName = rest.join(' ');

        let signUpRes: any;
        try {
          signUpRes = await client.signUp.create({
            emailAddress: email,
            password: password,
            firstName: firstName || email.split('@')[0],
            lastName: lastName || undefined,
          });
        } catch (createErr: any) {
          // If a sign up attempt was already initialized in this browser session, update it
          if (client.signUp && client.signUp.status !== 'complete') {
            signUpRes = await client.signUp.update({
              emailAddress: email,
              password: password,
              firstName: firstName || email.split('@')[0],
              lastName: lastName || undefined,
            });
          } else {
            throw createErr;
          }
        }

        if (signUpRes.status === 'complete') {
          await clerk.setActive({ session: signUpRes.createdSessionId });
          syncClerkUserToLocalStorage(clerk.user);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          showToast('Account created! Welcome to KUIZU!', '🎉');
          setTimeout(() => {
            window.location.href = '/home';
          }, 800);
        } else if (
          signUpRes.status === 'missing_requirements' ||
          signUpRes.unverifiedFields?.includes('email_address')
        ) {
          // Send verification OTP to email
          try {
            await (signUpRes || client.signUp).prepareEmailAddressVerification({ strategy: 'email_code' });
          } catch (prepErr) {
            console.warn('Prepare verification warning:', prepErr);
          }
          showToast('Verification code sent to your email inbox!', '✉️');

          showEmailVerificationModal(
            email,
            async (code: string) => {
              const verifyRes = await (signUpRes || client.signUp).attemptEmailAddressVerification({ code });
              if (verifyRes.status === 'complete') {
                await clerk.setActive({ session: verifyRes.createdSessionId });
                syncClerkUserToLocalStorage(clerk.user);
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                showToast('Email verified! Welcome to KUIZU!', '🎉');
                setTimeout(() => {
                  window.location.href = '/home';
                }, 800);
                return true;
              }
              return false;
            },
            async () => {
              await (signUpRes || client.signUp).prepareEmailAddressVerification({ strategy: 'email_code' });
            },
            () => {
              // Direct login fallback
              localStorage.setItem('kuizu_user_name', fullName || email.split('@')[0]);
              localStorage.setItem('kuizu_user_email', email);
              localStorage.setItem('kuizu_logged_in', 'true');
              window.location.href = '/home';
            }
          );
        } else {
          showToast(`Account status: ${signUpRes.status}`, 'ℹ️');
        }
      } else {
        // --- Sign In with Clerk ---
        const signInRes = await client.signIn.create({
          identifier: email,
          password: password,
        });

        if (signInRes.status === 'complete') {
          await clerk.setActive({ session: signInRes.createdSessionId });
          syncClerkUserToLocalStorage(clerk.user || signInRes.userData);
          confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
          showToast('Welcome back! Opening your dashboard...', '🚀');
          setTimeout(() => {
            window.location.href = '/home';
          }, 800);
        } else if (signInRes.status === 'needs_first_factor') {
          showToast('Second factor verification required.', '🔐');
        } else {
          showToast(`Sign in status: ${signInRes.status}`, 'ℹ️');
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const code = err?.errors?.[0]?.code;
      let msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Authentication failed. Please check your credentials.';

      let errorField: 'email' | 'password' | undefined;

      if (code === 'form_password_length_too_short') {
        msg = 'Password must be at least 15 characters long (e.g. <code>MySecurePassword123!</code>). This is enforced by your Clerk project security settings.';
        errorField = 'password';
      } else if (code === 'form_password_pwned') {
        msg = 'This password was found in a public data breach. Please choose a more unique password (e.g. <code>KuizuSecret#2026!XYZ</code>).';
        errorField = 'password';
      } else if (code === 'form_identifier_exists') {
        msg = 'An account with this email already exists. <a href="/sign-in">Click here to Sign In</a>';
        errorField = 'email';
      } else if (code === 'form_password_incorrect') {
        msg = 'Incorrect password. Please try again or click "Forgot password?".';
        errorField = 'password';
      } else if (code === 'form_identifier_not_found') {
        msg = 'No account found with this email. <a href="/sign-up">Click here to Sign Up</a>';
        errorField = 'email';
      }

      setInlineError(msg, errorField);
      showToast(msg, '⚠️', true);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// Google OAuth via Clerk
const btnGoogle = document.getElementById('btn-social-google');
if (btnGoogle) {
  btnGoogle.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      setButtonLoading(btnGoogle, true, 'Connecting Google...');
      const clerk = await getClerk();
      const client = clerk.client;
      if (!client) throw new Error('Clerk client not initialized');
      const isSignUp = form?.getAttribute('data-auth-mode') === 'signup';
      const redirectUrl = `${window.location.origin}/sso-callback`;
      const redirectUrlComplete = `${window.location.origin}/home`;

      if (isSignUp) {
        await client.signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        });
      } else {
        await client.signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        });
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      // If sign in says user not found, try signing up with Google
      if (err?.errors?.[0]?.code === 'form_identifier_not_found') {
        try {
          const clerk = await getClerk();
          if (clerk.client) {
            await clerk.client.signUp.authenticateWithRedirect({
              strategy: 'oauth_google',
              redirectUrl: `${window.location.origin}/sso-callback`,
              redirectUrlComplete: `${window.location.origin}/home`,
            });
            return;
          }
        } catch (_) {}
      }
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Google authentication failed.';
      showToast(msg, '⚠️', true);
    } finally {
      setButtonLoading(btnGoogle, false);
    }
  });
}

// GitHub OAuth via Clerk
const btnGithub = document.getElementById('btn-social-github');
if (btnGithub) {
  btnGithub.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      setButtonLoading(btnGithub, true, 'Connecting GitHub...');
      const clerk = await getClerk();
      const client = clerk.client;
      if (!client) throw new Error('Clerk client not initialized');
      const isSignUp = form?.getAttribute('data-auth-mode') === 'signup';
      const redirectUrl = `${window.location.origin}/sso-callback`;
      const redirectUrlComplete = `${window.location.origin}/home`;

      if (isSignUp) {
        await client.signUp.authenticateWithRedirect({
          strategy: 'oauth_github',
          redirectUrl,
          redirectUrlComplete,
        });
      } else {
        await client.signIn.authenticateWithRedirect({
          strategy: 'oauth_github',
          redirectUrl,
          redirectUrlComplete,
        });
      }
    } catch (err: any) {
      console.error('GitHub OAuth error:', err);
      if (err?.errors?.[0]?.code === 'form_identifier_not_found') {
        try {
          const clerk = await getClerk();
          if (clerk.client) {
            await clerk.client.signUp.authenticateWithRedirect({
              strategy: 'oauth_github',
              redirectUrl: `${window.location.origin}/sso-callback`,
              redirectUrlComplete: `${window.location.origin}/home`,
            });
            return;
          }
        } catch (_) {}
      }
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'GitHub authentication failed. Ensure GitHub is enabled in your Clerk Dashboard.';
      showToast(msg, '⚠️', true);
    } finally {
      setButtonLoading(btnGithub, false);
    }
  });
}

/**
 * Interactive Forgot Password Modal
 * Step 1: Prompt for user email and request code via Clerk
 * Step 2: Prompt for 6-digit code and new password, verify code & reset password with Clerk
 */
function showForgotPasswordModal() {
  let overlay = document.getElementById('forgot-pwd-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'forgot-pwd-overlay';
    overlay.className = 'auth-otp-overlay';
    overlay.innerHTML = `
      <div class="auth-otp-modal forgot-modal-card">
        <button type="button" class="forgot-modal-close" id="btn-forgot-close" aria-label="Close modal">&times;</button>
        
        <!-- Icon -->
        <div class="auth-otp-icon-wrap" style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); color: #4f46e5;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <!-- STEP 1: Enter Email -->
        <div id="forgot-step-1" class="forgot-step-pane">
          <h3 class="auth-otp-title">Forgot Password?</h3>
          <p class="auth-otp-subtitle">
            Enter your registered email ID and we'll send a 6-digit verification code to reset your password.
          </p>

          <div id="forgot-step1-error" class="auth-otp-error" style="margin-bottom: 14px; text-align: left;"></div>

          <div class="auth-input-group" style="text-align: left; margin-bottom: 20px;">
            <label class="auth-label" for="forgot-input-email" style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Email Address</span>
            </label>
            <div class="input-with-icon" style="position: relative;">
              <input 
                type="email" 
                id="forgot-input-email" 
                class="auth-text-input" 
                placeholder="name@example.com" 
                style="width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; outline: none;" 
                required 
              />
            </div>
          </div>

          <div class="auth-otp-actions">
            <button type="button" id="btn-forgot-send-code" class="auth-otp-btn-submit" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Send Verification Code</span>
              <span class="auth-btn-arrow">→</span>
            </button>
            <button type="button" id="btn-forgot-cancel-1" class="auth-otp-cancel-btn" style="margin-top: 6px;">Back to Login</button>
          </div>
        </div>

        <!-- STEP 2: Enter Verification Code & New Password -->
        <div id="forgot-step-2" class="forgot-step-pane" style="display: none;">
          <h3 class="auth-otp-title">Verify & Reset Password</h3>
          <p class="auth-otp-subtitle" style="margin-bottom: 12px;">
            Enter the 6-digit verification code sent to<br/>
            <strong id="forgot-confirmed-email" style="color: #4f46e5;"></strong>
          </p>

          <p style="margin: 0 0 16px 0; font-size: 12px; color: #6366f1; background: #eef2ff; padding: 6px 10px; border-radius: 8px;">
            💡 <strong>Testing tip:</strong> In Clerk Dev Mode, the test code is <strong>424242</strong>
          </p>

          <div id="forgot-step2-error" class="auth-otp-error" style="margin-bottom: 14px; text-align: left;"></div>

          <!-- Code Input -->
          <div class="auth-input-group" style="text-align: left; margin-bottom: 16px;">
            <label class="auth-label" for="forgot-input-code" style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>6-Digit Verification Code</span>
            </label>
            <input 
              type="text" 
              id="forgot-input-code" 
              class="auth-otp-input" 
              maxlength="6" 
              placeholder="••••••" 
              autocomplete="one-time-code" 
            />
          </div>

          <!-- New Password Input -->
          <div class="auth-input-group" style="text-align: left; margin-bottom: 16px;">
            <label class="auth-label" for="forgot-input-new-pwd" style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>New Password</span>
            </label>
            <div style="position: relative;">
              <input 
                type="password" 
                id="forgot-input-new-pwd" 
                class="auth-text-input" 
                placeholder="At least 8 characters" 
                style="width: 100%; box-sizing: border-box; padding: 12px 42px 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; outline: none;" 
                required 
              />
              <button type="button" id="btn-toggle-new-pwd" aria-label="Toggle password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>

          <!-- Confirm New Password Input -->
          <div class="auth-input-group" style="text-align: left; margin-bottom: 20px;">
            <label class="auth-label" for="forgot-input-confirm-pwd" style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">
              <span>Confirm New Password</span>
            </label>
            <input 
              type="password" 
              id="forgot-input-confirm-pwd" 
              class="auth-text-input" 
              placeholder="Re-enter new password" 
              style="width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 15px; outline: none;" 
              required 
            />
          </div>

          <div class="auth-otp-actions">
            <button type="button" id="btn-forgot-reset-submit" class="auth-otp-btn-submit" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Verify & Change Password</span>
              <span class="auth-btn-arrow">→</span>
            </button>
            <div class="auth-otp-footer-links" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
              <button type="button" id="btn-forgot-resend" class="auth-otp-resend-btn">Resend code</button>
              <button type="button" id="btn-forgot-back-step1" class="auth-otp-cancel-btn">Change email</button>
            </div>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(overlay);
  }

  // DOM Elements
  const step1 = document.getElementById('forgot-step-1') as HTMLDivElement | null;
  const step2 = document.getElementById('forgot-step-2') as HTMLDivElement | null;
  const inputEmail = document.getElementById('forgot-input-email') as HTMLInputElement | null;
  const confirmedEmailEl = document.getElementById('forgot-confirmed-email') as HTMLElement | null;
  const inputCode = document.getElementById('forgot-input-code') as HTMLInputElement | null;
  const inputNewPwd = document.getElementById('forgot-input-new-pwd') as HTMLInputElement | null;
  const inputConfirmPwd = document.getElementById('forgot-input-confirm-pwd') as HTMLInputElement | null;
  const errorStep1 = document.getElementById('forgot-step1-error') as HTMLDivElement | null;
  const errorStep2 = document.getElementById('forgot-step2-error') as HTMLDivElement | null;
  const btnSendCode = document.getElementById('btn-forgot-send-code') as HTMLButtonElement | null;
  const btnResetSubmit = document.getElementById('btn-forgot-reset-submit') as HTMLButtonElement | null;
  const btnClose = document.getElementById('btn-forgot-close');
  const btnCancel1 = document.getElementById('btn-forgot-cancel-1');
  const btnBackStep1 = document.getElementById('btn-forgot-back-step1');
  const btnResend = document.getElementById('btn-forgot-resend');
  const btnToggleNewPwd = document.getElementById('btn-toggle-new-pwd');

  let currentTargetEmail = '';

  // Prefill email from the sign-in form if user already typed it
  const signinEmailInput = document.getElementById('input-email') as HTMLInputElement | null;
  if (inputEmail && signinEmailInput?.value.trim()) {
    inputEmail.value = signinEmailInput.value.trim();
  }

  // Reset steps state
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  if (errorStep1) {
    errorStep1.textContent = '';
    errorStep1.style.display = 'none';
  }
  if (errorStep2) {
    errorStep2.textContent = '';
    errorStep2.style.display = 'none';
  }
  if (inputCode) inputCode.value = '';
  if (inputNewPwd) inputNewPwd.value = '';
  if (inputConfirmPwd) inputConfirmPwd.value = '';

  overlay.classList.add('show');
  setTimeout(() => inputEmail?.focus(), 150);

  const closeModal = () => {
    overlay?.classList.remove('show');
  };

  if (btnClose) btnClose.onclick = closeModal;
  if (btnCancel1) btnCancel1.onclick = closeModal;

  // Toggle password visibility in new password field
  if (btnToggleNewPwd && inputNewPwd) {
    let showPwd = false;
    btnToggleNewPwd.onclick = () => {
      showPwd = !showPwd;
      inputNewPwd.type = showPwd ? 'text' : 'password';
      btnToggleNewPwd.innerHTML = showPwd
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    };
  }

  // Back to step 1
  if (btnBackStep1) {
    btnBackStep1.onclick = () => {
      if (step2) step2.style.display = 'none';
      if (step1) step1.style.display = 'block';
      setTimeout(() => inputEmail?.focus(), 150);
    };
  }

  // STEP 1: Send verification code to the email ID via Clerk
  if (btnSendCode) {
    btnSendCode.onclick = async () => {
      const email = inputEmail?.value.trim() || '';
      if (!email || !email.includes('@')) {
        if (errorStep1) {
          errorStep1.textContent = 'Please enter a valid email address.';
          errorStep1.style.display = 'block';
        }
        inputEmail?.focus();
        return;
      }

      if (errorStep1) {
        errorStep1.textContent = '';
        errorStep1.style.display = 'none';
      }

      setButtonLoading(btnSendCode, true, 'Sending Code...');
      try {
        const clerk = await getClerk();
        if (!clerk.client) throw new Error('Clerk authentication service is unavailable');

        await clerk.client.signIn.create({
          strategy: 'reset_password_email_code',
          identifier: email,
        });

        currentTargetEmail = email;
        if (confirmedEmailEl) confirmedEmailEl.textContent = email;

        // Transition to Step 2
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        setTimeout(() => inputCode?.focus(), 150);
        showToast(`Verification code sent to ${email}`, '✉️');
      } catch (err: any) {
        console.error('Password reset request error:', err);
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Failed to send code. Please verify your email ID.';
        if (errorStep1) {
          errorStep1.textContent = msg;
          errorStep1.style.display = 'block';
        }
        showToast(msg, '⚠️', true);
      } finally {
        setButtonLoading(btnSendCode, false);
      }
    };
  }

  // Resend code in Step 2
  if (btnResend) {
    btnResend.onclick = async () => {
      if (!currentTargetEmail) return;
      setButtonLoading(btnResend, true, 'Resending...');
      try {
        const clerk = await getClerk();
        if (!clerk.client) throw new Error('Clerk client not initialized');
        await clerk.client.signIn.create({
          strategy: 'reset_password_email_code',
          identifier: currentTargetEmail,
        });
        showToast('New verification code sent to your email!', '✉️');
      } catch (err: any) {
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Failed to resend verification code.';
        showToast(msg, '⚠️', true);
      } finally {
        setButtonLoading(btnResend, false);
      }
    };
  }

  // STEP 2: Verify code and change password
  if (btnResetSubmit) {
    btnResetSubmit.onclick = async () => {
      const code = inputCode?.value.trim() || '';
      const newPassword = inputNewPwd?.value || '';
      const confirmPassword = inputConfirmPwd?.value || '';

      if (!code) {
        if (errorStep2) {
          errorStep2.textContent = 'Please enter the 6-digit verification code sent to your email.';
          errorStep2.style.display = 'block';
        }
        inputCode?.focus();
        return;
      }

      if (newPassword.length < 8) {
        if (errorStep2) {
          errorStep2.textContent = 'Password must be at least 8 characters long.';
          errorStep2.style.display = 'block';
        }
        inputNewPwd?.focus();
        return;
      }

      if (newPassword !== confirmPassword) {
        if (errorStep2) {
          errorStep2.textContent = 'Passwords do not match. Please re-enter.';
          errorStep2.style.display = 'block';
        }
        inputConfirmPwd?.focus();
        return;
      }

      if (errorStep2) {
        errorStep2.textContent = '';
        errorStep2.style.display = 'none';
      }

      setButtonLoading(btnResetSubmit, true, 'Verifying & Resetting...');

      try {
        const clerk = await getClerk();
        if (!clerk.client) throw new Error('Clerk client not initialized');

        const result = await clerk.client.signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code: code,
          password: newPassword,
        });

        if (result.status === 'complete') {
          if (result.createdSessionId) {
            await clerk.setActive({ session: result.createdSessionId });
          }
          if (clerk.user) {
            syncClerkUserToLocalStorage(clerk.user);
          }

          closeModal();

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          showToast('🎉 Password verified and changed successfully! Logging you in...', '🔑');

          setTimeout(() => {
            window.location.href = '/home';
          }, 1200);
        } else {
          const statusMsg = `Password reset status: ${result.status}. Please check requirements.`;
          if (errorStep2) {
            errorStep2.textContent = statusMsg;
            errorStep2.style.display = 'block';
          }
          showToast(statusMsg, '⚠️', true);
        }
      } catch (err: any) {
        console.error('Password reset attempt error:', err);
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Failed to verify code or change password.';
        if (errorStep2) {
          errorStep2.textContent = msg;
          errorStep2.style.display = 'block';
        }
        showToast(msg, '⚠️', true);
      } finally {
        setButtonLoading(btnResetSubmit, false);
      }
    };
  }
}

// Forgot password link click handler
const linkForgot = document.getElementById('link-forgot-pwd');
if (linkForgot) {
  linkForgot.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPasswordModal();
  });
}

// Auto-check if already signed in with Clerk
(async () => {
  try {
    const clerk = await getClerk();
    if (clerk.user) {
      syncClerkUserToLocalStorage(clerk.user);
    }
  } catch (err) {
    console.warn('Initial Clerk check:', err);
  }
})();
