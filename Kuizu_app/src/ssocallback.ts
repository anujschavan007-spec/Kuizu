import { getClerk, syncClerkUserToLocalStorage } from './services/clerkService';

async function handleCallback() {
  const statusEl = document.getElementById('callback-status');
  try {
    const clerk = await getClerk();

    // Clerk completes the OAuth redirect token handshake
    await clerk.handleRedirectCallback({
      signInForceRedirectUrl: '/home',
      signUpForceRedirectUrl: '/home'
    });

    if (clerk.user) {
      syncClerkUserToLocalStorage(clerk.user);
    }

    if (statusEl) {
      statusEl.textContent = 'Welcome back! Opening your KUIZU dashboard...';
    }

    window.location.href = '/home';
  } catch (err: any) {
    console.error('SSO callback error:', err);

    try {
      const clerk = await getClerk();
      if (clerk.user) {
        syncClerkUserToLocalStorage(clerk.user);
        window.location.href = '/home';
        return;
      }
    } catch (_) {}

    if (statusEl) {
      statusEl.textContent =
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        'Authentication failed. Redirecting to sign in...';
    }

    setTimeout(() => {
      window.location.href = '/sign-in';
    }, 2500);
  }
}

handleCallback();
