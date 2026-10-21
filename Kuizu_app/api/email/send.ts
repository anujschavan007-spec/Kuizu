declare const process: any;
import nodemailer from 'nodemailer';

const GMAIL_USER =
  process.env.GMAIL_USER ||
  'xyz577616@gmail.com';

const GMAIL_PASS =
  process.env.GMAIL_PASS ||
  'ezxsvfmmuazjecvz';

const RESEND_API_KEY =
  process.env.RESEND_API_KEY ||
  process.env.VITE_RESEND_API_KEY ||
  're_P3Hy77vx_ZtgpEfBjeXSDxQVLRHsRrCRU';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export default async function handler(req: any, res?: any) {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).end();
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // Parse body safely across both standard Node Serverless and Web Request
  let body: any = {};
  try {
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else if (typeof req.json === 'function') {
      body = await req.json();
    }
  } catch (parseErr) {
    console.warn('[Email Handler] JSON parse warning:', parseErr);
  }

  const {
    to,
    subject,
    html,
    text,
    from = `"KUIZU" <${GMAIL_USER}>`,
    attachments
  } = body || {};

  if (!to || !subject) {
    const errorMsg = 'Recipient "to" and "subject" are required';
    if (res && typeof res.status === 'function') {
      return res.status(400).json({ success: false, error: errorMsg });
    }
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 400,
      headers: corsHeaders
    });
  }

  const sendSuccess = (data: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ success: true, ...data });
    }
    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: corsHeaders
    });
  };

  const sendError = (statusCode: number, error: any) => {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(statusCode).json({ success: false, error });
    }
    return new Response(JSON.stringify({ success: false, error }), {
      status: statusCode,
      headers: corsHeaders
    });
  };

  // Primary: Gmail SMTP (Sends to ANY email address with 0 domain restrictions)
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const cleanPass = GMAIL_PASS.replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER,
          pass: cleanPass
        }
      });

      const mailOptions: any = {
        from: from.includes('<') ? from : `"KUIZU" <${GMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')
      };

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ [Email Serverless] Dispatched via Gmail SMTP:', info.messageId, 'to:', to);
      return sendSuccess({
        service: 'gmail',
        messageId: info.messageId,
        response: info.response,
        to
      });
    } catch (gmailErr: any) {
      console.warn('⚠️ [Email Serverless] Gmail SMTP failed, falling back to Resend:', gmailErr?.message || gmailErr);
    }
  }

  // Secondary Fallback: Resend API
  if (RESEND_API_KEY) {
    try {
      const payload: Record<string, any> = {
        from: 'KUIZU <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      };
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resendData = await resendRes.json();
      if (resendRes.ok) {
        console.log('✅ [Email Serverless] Dispatched via Resend:', resendData);
        return sendSuccess({ service: 'resend', data: resendData, to });
      }
      console.warn('⚠️ [Email Serverless] Resend error:', resendData);
    } catch (resendErr: any) {
      console.warn('⚠️ [Email Serverless] Resend exception:', resendErr);
    }
  }

  return sendError(500, 'Unable to send email: all email dispatchers failed.');
}
