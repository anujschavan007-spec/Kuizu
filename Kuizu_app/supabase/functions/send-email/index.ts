import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const RESEND_API_KEY =
  Deno.env.get("RESEND_API_KEY") ||
  "re_P3Hy77vx_ZtgpEfBjeXSDxQVLRHsRrCRU";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text, from = "KUIZU <onboarding@resend.dev>", attachments } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ success: false, error: "to and subject required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload: Record<string, any> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: res.ok, data }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
