declare const process: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export function extractLeetCodeUsername(urlOrUsername: string): string {
  if (!urlOrUsername) return '';
  let str = urlOrUsername.trim();
  str = str.replace(/^[a-z]+:\/\//i, '');
  str = str.replace(/^(www\.)?leetcode\.com\/?/i, '');
  str = str.replace(/^u\//i, '');
  str = str.split('/')[0].split('?')[0].split('#')[0].trim();
  return str;
}

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).end();
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Extract username or URL from query params or body
  let usernameOrUrl = '';
  if (req.query && (req.query.username || req.query.url)) {
    usernameOrUrl = req.query.username || req.query.url;
  } else if (req.url && req.url.includes('?')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      usernameOrUrl = urlObj.searchParams.get('username') || urlObj.searchParams.get('url') || '';
    } catch {}
  }

  if (!usernameOrUrl && req.method === 'POST') {
    let body: any = {};
    try {
      if (req.body) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } else if (typeof req.json === 'function') {
        body = await req.json();
      }
    } catch {}
    usernameOrUrl = body.username || body.url || '';
  }

  const username = extractLeetCodeUsername(usernameOrUrl);
  if (!username) {
    const errPayload = { success: false, error: 'Username or profile URL is required' };
    if (res && typeof res.status === 'function') {
      return res.status(400).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), { status: 400, headers: corsHeaders });
  }

  // 1. Try official LeetCode GraphQL
  try {
    const gqlRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              username
              submitStatsGlobal {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
            }
          }
        `,
        variables: { username }
      })
    });

    if (gqlRes.ok) {
      const gqlData = (await gqlRes.json()) as any;
      const matched = gqlData?.data?.matchedUser;
      if (matched && matched.submitStatsGlobal?.acSubmissionNum) {
        const stats = matched.submitStatsGlobal.acSubmissionNum;
        const total = stats.find((s: any) => s.difficulty === 'All')?.count ?? 0;
        const easy = stats.find((s: any) => s.difficulty === 'Easy')?.count ?? 0;
        const medium = stats.find((s: any) => s.difficulty === 'Medium')?.count ?? 0;
        const hard = stats.find((s: any) => s.difficulty === 'Hard')?.count ?? 0;

        const payload = {
          success: true,
          username,
          solved: total,
          easy,
          medium,
          hard,
          source: 'leetcode-graphql'
        };

        if (res && typeof res.status === 'function') {
          return res.status(200).json(payload);
        }
        return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
      }
    }
  } catch (gqlErr) {
    console.warn('[LeetCode API] GraphQL fetch attempt error:', gqlErr);
  }

  // 2. Fallback to public mirror API 1
  try {
    const mirrorRes = await fetch(`https://alfa-leetcode-api.onrender.com/${username}/solved`);
    if (mirrorRes.ok) {
      const mirrorData = (await mirrorRes.json()) as any;
      const total = mirrorData.solvedProblem ?? 0;
      const payload = {
        success: true,
        username,
        solved: total,
        easy: mirrorData.easySolved ?? 0,
        medium: mirrorData.mediumSolved ?? 0,
        hard: mirrorData.hardSolved ?? 0,
        source: 'alfa-api'
      };

      if (res && typeof res.status === 'function') {
        return res.status(200).json(payload);
      }
      return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
    }
  } catch (mErr) {
    console.warn('[LeetCode API] Mirror 1 attempt error:', mErr);
  }

  // 3. Fallback to public mirror API 2
  try {
    const mirror2Res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
    if (mirror2Res.ok) {
      const m2Data = (await mirror2Res.json()) as any;
      const total = m2Data.totalSolved ?? 0;
      const payload = {
        success: true,
        username,
        solved: total,
        easy: m2Data.easySolved ?? 0,
        medium: m2Data.mediumSolved ?? 0,
        hard: m2Data.hardSolved ?? 0,
        source: 'faisalshohag-api'
      };

      if (res && typeof res.status === 'function') {
        return res.status(200).json(payload);
      }
      return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
    }
  } catch (m2Err) {
    console.warn('[LeetCode API] Mirror 2 attempt error:', m2Err);
  }

  const failPayload = { success: false, error: `Could not fetch LeetCode statistics for @${username}` };
  if (res && typeof res.status === 'function') {
    return res.status(502).json(failPayload);
  }
  return new Response(JSON.stringify(failPayload), { status: 502, headers: corsHeaders });
}
