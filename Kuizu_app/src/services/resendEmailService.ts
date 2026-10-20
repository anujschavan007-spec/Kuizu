/**
 * Resend Email Service for KUIZU
 * 
 * Handles sending transactional emails via Resend:
 * 1. Welcome email upon new user sign-up
 * 2. Orange Fire themed badge congratulations email with "View Your Badge" action button
 */

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface BadgeEmailPayload {
  id: string;
  title: string;
  subtitle: string;
  condition: string;
  glbModel: string;
  accentColor?: string;
  glowColor?: string;
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
<body style="margin: 0; padding: 0; background-color: #080c16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080c16; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #0f172a 0%, #090e1a 100%); border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.18); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
                Next-Gen Code Gaming
              </div>
              <h1 style="margin: 0; font-size: 34px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-shadow: 0 3px 12px rgba(0,0,0,0.4);">
                🎮 KUIZU
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 15px; font-weight: 500; color: rgba(255, 255, 255, 0.95); letter-spacing: 0.5px;">
                Code • Compete • Unlock 3D Trophies
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 38px 36px;">
              <h2 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                Welcome aboard, ${escapeHtml(name)}! 🚀
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.65; color: #94a3b8;">
                Your KUIZU account has been created successfully. You now have full access to interactive coding challenges, real-time 1v1 arenas, and collectible 3D awards.
              </p>

              <!-- Feature Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td style="padding: 16px; background: rgba(30, 41, 59, 0.55); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.12);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 24px; line-height: 1;">🗺️</td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #38bdf8; font-size: 15px; display: block;">Interactive Quiz Adventure</strong>
                          <span style="color: #94a3b8; font-size: 13px; line-height: 1.5; display: block; margin-top: 4px;">Progress through 4 chapters on the animated fantasy map, earn stars, and solve coding trivia.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <tr>
                  <td style="padding: 16px; background: rgba(30, 41, 59, 0.55); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.12);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 24px; line-height: 1;">⚔️</td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #f43f5e; font-size: 15px; display: block;">1v1 Real-Time Battle Arena</strong>
                          <span style="color: #94a3b8; font-size: 13px; line-height: 1.5; display: block; margin-top: 4px;">Duel against fellow developers in live algorithmic challenges with instant test runners and scoreboards.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
                <tr>
                  <td style="padding: 16px; background: rgba(30, 41, 59, 0.55); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.12);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 24px; line-height: 1;">🏆</td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #a855f7; font-size: 15px; display: block;">Collectible 3D Badges</strong>
                          <span style="color: #94a3b8; font-size: 13px; line-height: 1.5; display: block; margin-top: 4px;">Earn 6 distinct 3D badges with custom metallic shaders and view them in 360° anytime!</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="https://kuizu-app.vercel.app/home" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 38px; border-radius: 12px; box-shadow: 0 6px 24px rgba(79, 70, 229, 0.45); letter-spacing: 0.3px;">
                      Enter the Arena →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b; text-align: center;">
                Have questions or need assistance? Reply directly to this email or visit our support portal.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background: #070b13; border-top: 1px solid rgba(148, 163, 184, 0.1); text-align: center;">
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
 * Send Badge Achievement Email with Orange Fire Theme
 * Features:
 * - Blazing Orange Fire theme with radiant flame gradients
 * - Big CONGRATULATIONS header text
 * - "View Your Badge" action button linking directly to /badge?id=...
 * - Fully mobile responsive layout
 * - No .glb file attachment
 */
export async function sendBadgeWinEmail(
  toEmail: string,
  userName: string,
  badge: BadgeEmailPayload
): Promise<boolean> {
  if (!toEmail || !toEmail.includes('@')) return false;
  const name = userName?.trim() || 'Champion';
  const badgeViewUrl = `https://kuizu-app.vercel.app/badge?id=${encodeURIComponent(badge.id)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>🔥 CONGRATULATIONS! Badge Unlocked: ${escapeHtml(badge.title)} — KUIZU</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #080302; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080302; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container: Radiant Fire Border & Flame Gradient -->
        <table role="presentation" width="100%" style="max-width: 580px; background: linear-gradient(180deg, #180904 0%, #0e0503 100%); border-radius: 20px; border: 1px solid rgba(255, 107, 0, 0.45); box-shadow: 0 25px 75px rgba(255, 69, 0, 0.35); overflow: hidden;">
          
          <!-- Blazing Flame Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #d82b00 0%, #ff5100 45%, #ff8800 100%); padding: 44px 28px 30px 28px; text-align: center; border-bottom: 2px solid rgba(255, 200, 0, 0.35);">
              
              <!-- Fire Badge Pill -->
              <div style="display: inline-block; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 230, 150, 0.45); border-radius: 9999px; padding: 6px 18px; font-size: 11px; font-weight: 900; color: #fff3e0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">
                🔥 TROPHY UNLOCKED 🔥
              </div>

              <!-- BIG CONGRATULATIONS TEXT -->
              <h1 style="margin: 8px 0 4px 0; font-size: 36px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #ffffff; text-shadow: 0 3px 18px rgba(0, 0, 0, 0.7); line-height: 1.15;">
                CONGRATULATIONS!
              </h1>
              
              <!-- Subtitle -->
              <div style="font-size: 17px; font-weight: 800; color: #ffe0b2; letter-spacing: 0.5px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); margin-top: 6px;">
                YOU'VE EARNED A NEW BADGE!
              </div>

            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 34px 32px 38px 32px;">
              
              <!-- User Greeting -->
              <p style="margin: 0 0 22px 0; font-size: 16px; line-height: 1.6; color: #fed7aa; text-align: center;">
                Way to go, <strong style="color: #ffffff; font-size: 18px;">${escapeHtml(name)}</strong>! You've conquered the challenge and unlocked an official trophy on KUIZU.
              </p>

              <!-- Badge Title Card with Orange Flame Glow -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 18px 0 24px 0; background: linear-gradient(135deg, rgba(255, 81, 0, 0.16) 0%, rgba(255, 153, 0, 0.08) 100%); border-radius: 16px; border: 1px solid rgba(255, 120, 0, 0.4); padding: 22px; text-align: center;">
                <tr>
                  <td>
                    <div style="font-size: 52px; line-height: 1; filter: drop-shadow(0 6px 16px rgba(255, 107, 0, 0.6)); margin-bottom: 10px;">
                      🏆
                    </div>
                    <h2 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.3px; text-shadow: 0 2px 10px rgba(255, 100, 0, 0.3);">
                      ${escapeHtml(badge.title)}
                    </h2>
                    <p style="margin: 0; font-size: 14.5px; color: #fdba74; font-weight: 600;">
                      ${escapeHtml(badge.subtitle)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Criteria & Reward Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px 0; background: rgba(20, 8, 4, 0.7); border-radius: 14px; border: 1px solid rgba(255, 107, 0, 0.22); padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ea580c;">Requirement Completed</div>
                    <div style="font-size: 14.5px; color: #f8fafc; font-weight: 600; margin-top: 4px; line-height: 1.45;">
                      ✅ ${escapeHtml(badge.condition)}
                    </div>
                  </td>
                </tr>
                <tr><td height="14"></td></tr>
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ea580c;">Reward Added</div>
                    <div style="font-size: 15px; color: #f59e0b; font-weight: 800; margin-top: 4px;">
                      🔥 +100 XP Flame Boost added to your account
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button: "View Your Badge" (Blazing Fire Gradient) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${badgeViewUrl}" style="display: block; max-width: 380px; background: linear-gradient(135deg, #ff3d00 0%, #ff8800 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 900; padding: 17px 32px; border-radius: 12px; box-shadow: 0 8px 30px rgba(255, 61, 0, 0.6); letter-spacing: 0.5px; text-align: center; text-transform: uppercase;">
                      🔥 View Your Badge →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Encouragement Footnote -->
              <p style="margin: 22px 0 0 0; font-size: 13px; color: #9a3412; text-align: center; line-height: 1.5;">
                Keep igniting your coding streak, conquer quizzes, and unlock all 6 trophies!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 22px 28px; background: #060201; border-top: 1px solid rgba(255, 81, 0, 0.15); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #7c2d12;">
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

  // No attachments array: lightweight, fast, no .glb file attached
  const result = await sendEmail({
    to: toEmail,
    subject: `🔥 CONGRATULATIONS! You Unlocked: ${badge.title} — KUIZU`,
    html,
    text: `CONGRATULATIONS ${name}! You unlocked "${badge.title}" on KUIZU! View your badge at: ${badgeViewUrl}`
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
