/**
 * Resend Email Service for KUIZU
 * 
 * Handles sending transactional emails via Resend:
 * 1. Welcome email upon new user sign-up
 * 2. Badge achievement emails when unlocking trophies (including 3D .glb file attachments & 360° inspection links)
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
                          <strong style="color: #a855f7; font-size: 15px; display: block;">Collectible 3D GLB Badges</strong>
                          <span style="color: #94a3b8; font-size: 13px; line-height: 1.5; display: block; margin-top: 4px;">Earn 6 distinct 3D badges with custom metallic shaders. When you win, you receive the raw .glb model directly in your email!</span>
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
 * Send Badge Achievement Email when a user earns a badge
 * Includes:
 * 1. Rich congratulations template styled with the badge's accent color
 * 2. Attached 3D .glb model file
 * 3. Direct link to interactive 3D 360° viewer on Kuizu
 * 4. Direct download link for the .glb file
 */
export async function sendBadgeWinEmail(
  toEmail: string,
  userName: string,
  badge: BadgeEmailPayload
): Promise<boolean> {
  if (!toEmail || !toEmail.includes('@')) return false;
  const name = userName?.trim() || 'Champion';
  const accent = badge.accentColor || '#38bdf8';
  const glbUrl = `https://kuizu-app.vercel.app${badge.glbModel}`;
  const interactiveViewUrl = `https://kuizu-app.vercel.app/badge?id=${encodeURIComponent(badge.id)}`;
  const glbFilename = `${badge.title.replace(/[^a-zA-Z0-9]/g, '_')}_3D_Badge.glb`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>🏆 Badge Unlocked: ${escapeHtml(badge.title)} — KUIZU</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #080c16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080c16; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background: linear-gradient(180deg, #0f172a 0%, #090e1a 100%); border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.2); box-shadow: 0 25px 65px rgba(0, 0, 0, 0.7); overflow: hidden;">
          
          <!-- Trophy Badge Header -->
          <tr>
            <td style="background: radial-gradient(circle at center, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.95) 75%); padding: 42px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(148, 163, 184, 0.1);">
              <div style="font-size: 58px; line-height: 1; filter: drop-shadow(0 8px 18px ${accent}66);">
                🏆
              </div>
              <div style="display: inline-block; margin-top: 16px; background: rgba(56, 189, 248, 0.12); border: 1px solid ${accent}66; border-radius: 9999px; padding: 5px 16px; font-size: 11px; font-weight: 800; color: ${accent}; letter-spacing: 1.5px; text-transform: uppercase;">
                Achievement Unlocked
              </div>
              <h1 style="margin: 14px 0 6px 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                ${escapeHtml(badge.title)}
              </h1>
              <p style="margin: 0; font-size: 15px; color: #94a3b8; font-weight: 500;">
                ${escapeHtml(badge.subtitle)}
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 36px 36px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #cbd5e1; text-align: center;">
                Outstanding performance, <strong style="color: #ffffff;">${escapeHtml(name)}</strong>! You've accomplished the requirements and officially added this exclusive trophy to your showcase.
              </p>

              <!-- Badge Stats Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 22px 0; background: rgba(30, 41, 59, 0.65); border-radius: 14px; border: 1px solid rgba(148, 163, 184, 0.15); padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Criterion Met</div>
                    <div style="font-size: 14px; color: #f1f5f9; font-weight: 600; margin-top: 4px; line-height: 1.4;">
                      ✅ ${escapeHtml(badge.condition)}
                    </div>
                  </td>
                </tr>
                <tr><td height="14"></td></tr>
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Reward Level Boost</div>
                    <div style="font-size: 15px; color: #10b981; font-weight: 700; margin-top: 4px;">
                      ⚡ +100 XP added to your Kuizu profile
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 3D Model Attachment & Interactive Viewer Showcase Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 26px 0; background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%); border-radius: 14px; border: 1px solid ${accent}55; padding: 22px;">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                      <span style="font-size: 20px; margin-right: 8px;">📦</span>
                      <strong style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 0.3px;">
                        3D .GLB Model Delivered
                      </strong>
                    </div>
                    <p style="margin: 0 0 14px 0; font-size: 13.5px; line-height: 1.55; color: #cbd5e1;">
                      We have attached the official 3D binary GLTF (<code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: ${accent};">${glbFilename}</code>) model directly to this email!
                    </p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.6; color: #94a3b8;">
                      <li><strong style="color: #e2e8f0;">Attached File:</strong> Included as an email attachment below.</li>
                      <li><strong style="color: #e2e8f0;">macOS / iOS:</strong> Tap or press Spacebar to view with native 3D QuickLook & AR.</li>
                      <li><strong style="color: #e2e8f0;">Windows:</strong> Double click the attachment to open in 3D Viewer.</li>
                      <li><strong style="color: #e2e8f0;">Creators:</strong> Ready for Blender, Three.js, Unity, or 3D printing.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Call To Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <!-- Primary CTA: 360 Interactive Viewer -->
                    <a href="${interactiveViewUrl}" style="display: block; max-width: 380px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 24px; border-radius: 12px; box-shadow: 0 6px 24px rgba(79, 70, 229, 0.45); letter-spacing: 0.3px; text-align: center; margin-bottom: 12px;">
                      🎮 Inspect in 3D (360° Interactive View) →
                    </a>
                    <!-- Secondary CTA: Direct GLB Download -->
                    <a href="${glbUrl}" style="display: inline-block; background: rgba(30, 41, 59, 0.85); color: #94a3b8; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 22px; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.25); letter-spacing: 0.2px;">
                      ⬇️ Direct Download .GLB File
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 22px 0 0 0; font-size: 12.5px; color: #64748b; text-align: center; line-height: 1.5;">
                Keep conquering daily quizzes and 1v1 arenas to unlock all 6 official 3D trophies!
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

  const attachments: EmailAttachment[] = [
    {
      filename: glbFilename,
      path: glbUrl
    }
  ];

  const result = await sendEmail({
    to: toEmail,
    subject: `🏆 Badge Unlocked: ${badge.title} — KUIZU`,
    html,
    text: `Congratulations ${name}! You unlocked "${badge.title}" on KUIZU! Inspect your 3D trophy at ${interactiveViewUrl} or download the attached 3D .glb model.`,
    attachments
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
