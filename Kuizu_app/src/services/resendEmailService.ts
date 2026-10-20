/**
 * Resend Email Service for KUIZU
 * 
 * Handles sending transactional emails via Resend:
 * 1. Welcome email upon new user sign-up
 * 2. Badge achievement emails when unlocking trophies
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Dispatch an email through the /api/email/send endpoint
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('Resend email dispatch warning:', data);
      return { success: false, error: data?.error || 'Email dispatch failed' };
    }

    return { success: true, simulated: Boolean(data?.simulated) };
  } catch (err: any) {
    console.warn('Error calling /api/email/send:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Send Welcome Email to a newly registered user
 */
export async function sendWelcomeEmail(toEmail: string, userName?: string): Promise<boolean> {
  if (!toEmail || !toEmail.includes('@')) return false;
  const name = userName?.trim() || 'Fellow Learner';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to KUIZU</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: linear-gradient(180deg, #131b2e 0%, #0f172a 100%); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.15); box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 36px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                🎮 KUIZU
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.9); letter-spacing: 0.5px;">
                Code • Compete • Conquer
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                Welcome aboard, ${escapeHtml(name)}! 🚀
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your account is officially active. Prepare to test your coding skills, level up your knowledge, and battle other developers in real-time.
              </p>

              <!-- Feature Grid / Highlights -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td style="padding: 12px; background: rgba(30, 41, 59, 0.6); border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1); margin-bottom: 8px;">
                    <strong style="color: #60a5fa; font-size: 15px;">🗺️ Interactive Quiz Adventure</strong>
                    <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Solve coding questions, earn stars, and unlock all 4 adventure map levels.</div>
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(30, 41, 59, 0.6); border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1); margin-bottom: 8px;">
                    <strong style="color: #f43f5e; font-size: 15px;">⚔️ 1v1 Battle Arena</strong>
                    <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Challenge players in high-speed real-time algorithm duels with live scoreboards.</div>
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="padding: 12px; background: rgba(30, 41, 59, 0.6); border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
                    <strong style="color: #a855f7; font-size: 15px;">🏆 3D Trophy Showcase</strong>
                    <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Win exclusive 3D animated badges as you complete challenges and top the leaderboard.</div>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="https://kuizu-app.vercel.app/home" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 18px rgba(79, 70, 229, 0.45); letter-spacing: 0.3px;">
                      Enter the Arena →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; text-align: center;">
                Need help or have suggestions? Reach out directly through the portal anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(148, 163, 184, 0.1); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © 2026 KUIZU Gaming Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const result = await sendEmail({
    to: toEmail,
    subject: '🎉 Welcome to KUIZU — Your Adventure Begins!',
    html,
    text: `Welcome to KUIZU, ${name}! Your account is active. Start playing at https://kuizu-app.vercel.app/home`
  });

  return result.success;
}

/**
 * Send Badge Achievement Email when a user earns a badge
 */
export async function sendBadgeWinEmail(
  toEmail: string,
  userName: string,
  badge: { id: string; title: string; subtitle: string; condition: string; accentColor?: string }
): Promise<boolean> {
  if (!toEmail || !toEmail.includes('@')) return false;
  const name = userName?.trim() || 'Champion';
  const color = badge.accentColor || '#f59e0b';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Badge Unlocked — KUIZU</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: linear-gradient(180deg, #131b2e 0%, #0f172a 100%); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.15); box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5); overflow: hidden;">
          
          <!-- Trophy Badge Header -->
          <tr>
            <td style="background: radial-gradient(circle at center, rgba(124, 58, 237, 0.3) 0%, rgba(15, 23, 42, 0.9) 70%); padding: 40px 30px 20px 30px; text-align: center;">
              <div style="font-size: 54px; line-height: 1; filter: drop-shadow(0 6px 14px rgba(245, 158, 11, 0.45));">
                🏆
              </div>
              <div style="display: inline-block; margin-top: 14px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; color: #fbbf24; letter-spacing: 1px; text-transform: uppercase;">
                Achievement Unlocked
              </div>
              <h1 style="margin: 12px 0 4px 0; font-size: 26px; font-weight: 800; color: #ffffff;">
                ${escapeHtml(badge.title)}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                ${escapeHtml(badge.subtitle)}
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 24px 32px 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1; text-align: center;">
                Congratulations <strong style="color: #ffffff;">${escapeHtml(name)}</strong>! You've officially achieved and unlocked this trophy on KUIZU.
              </p>

              <!-- Badge Achievement Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: rgba(30, 41, 59, 0.6); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.15); padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b;">Criterion Met</div>
                    <div style="font-size: 14px; color: #f1f5f9; font-weight: 600; margin-top: 4px;">
                      ${escapeHtml(badge.condition)}
                    </div>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b;">Reward XP Added</div>
                    <div style="font-size: 16px; color: #10b981; font-weight: 700; margin-top: 2px;">
                      +100 XP Level Boost ⚡
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="https://kuizu-app.vercel.app/profile" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.4); letter-spacing: 0.3px;">
                      View 3D Trophy on Profile →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0 0; font-size: 12.5px; color: #64748b; text-align: center;">
                Keep playing quizzes, participating in battles, and conquering daily challenges to unlock all 6 trophies!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(15, 23, 42, 0.95); border-top: 1px solid rgba(148, 163, 184, 0.1); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                © 2026 KUIZU Gaming Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const result = await sendEmail({
    to: toEmail,
    subject: `🏆 Badge Unlocked: ${badge.title} — KUIZU`,
    html,
    text: `Congratulations ${name}! You unlocked the badge "${badge.title}". View it on your profile: https://kuizu-app.vercel.app/profile`
  });

  return result.success;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
