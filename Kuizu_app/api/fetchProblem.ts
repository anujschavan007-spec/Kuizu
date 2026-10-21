declare const process: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Clean HTML to clean readable text/markdown for problem statements
function cleanHtmlToText(html: string): string {
  if (!html) return '';
  let str = html;
  str = str.replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return '\n```\n' + code.replace(/<[^>]+>/g, '').trim() + '\n```\n';
  });
  str = str.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  str = str.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  str = str.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  str = str.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  str = str.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  str = str.replace(/<p>/gi, '\n\n');
  str = str.replace(/<\/p>/gi, '');
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<li>/gi, '\n• ');
  str = str.replace(/<\/li>/gi, '');
  str = str.replace(/<ol>|<ul>|<\/ol>|<\/ul>/gi, '\n');
  str = str.replace(/<[^>]+>/g, '');
  str = str.replace(/&nbsp;/g, ' ');
  str = str.replace(/&lt;/g, '<');
  str = str.replace(/&gt;/g, '>');
  str = str.replace(/&amp;/g, '&');
  str = str.replace(/&quot;/g, '"');
  str = str.replace(/&#39;/g, "'");
  str = str.replace(/\n{3,}/g, '\n\n').trim();
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

  // Parse query params: platform ('leetcode' | 'gfg'), query (number, slug, or url)
  let platform = '';
  let query = '';

  if (req.query) {
    platform = (req.query.platform || '').toLowerCase();
    query = req.query.query || req.query.number || req.query.slug || req.query.url || '';
  }
  
  if (!query && req.url && req.url.includes('?')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      platform = (urlObj.searchParams.get('platform') || '').toLowerCase();
      query = urlObj.searchParams.get('query') || urlObj.searchParams.get('number') || urlObj.searchParams.get('slug') || urlObj.searchParams.get('url') || '';
    } catch {}
  }

  if (!query && req.method === 'POST') {
    let body: any = {};
    try {
      if (req.body) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } else if (typeof req.json === 'function') {
        body = await req.json();
      }
    } catch {}
    platform = (body.platform || platform || '').toLowerCase();
    query = body.query || body.number || body.slug || body.url || '';
  }

  query = (query || '').trim();
  if (!query) {
    const errPayload = { success: false, error: 'Problem number, slug or URL is required.' };
    if (res && typeof res.status === 'function') return res.status(400).json(errPayload);
    return new Response(JSON.stringify(errPayload), { status: 400, headers: corsHeaders });
  }

  // Auto-detect platform if not provided
  if (!platform) {
    if (query.includes('geeksforgeeks.org') || query.includes('gfg')) {
      platform = 'gfg';
    } else {
      platform = 'leetcode';
    }
  }

  // ----------------------------------------------------
  // 1. LEETCODE FETCHER
  // ----------------------------------------------------
  if (platform === 'leetcode') {
    let titleSlug = '';
    const isNum = /^\d+$/.test(query);

    // If query is a URL, parse slug out: e.g. https://leetcode.com/problems/two-sum/
    if (query.includes('leetcode.com/problems/')) {
      const parts = query.split('leetcode.com/problems/')[1]?.split('/')[0]?.split('?')[0];
      if (parts) titleSlug = parts;
    } else if (!isNum) {
      titleSlug = query.toLowerCase().replace(/\s+/g, '-');
    }

    // If number provided, resolve number -> slug
    if (isNum || !titleSlug) {
      try {
        const listRes = await fetch('https://leetcode.com/api/problems/all/', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (listRes.ok) {
          const listData = (await listRes.json()) as any;
          const targetNum = parseInt(query, 10);
          const pairs = listData?.stat_status_pairs || [];
          const found = pairs.find((p: any) => p.stat?.frontend_question_id === targetNum || p.stat?.question_id === targetNum);
          if (found && found.stat?.question__title_slug) {
            titleSlug = found.stat.question__title_slug;
          }
        }
      } catch (listErr) {
        console.warn('[fetchProblem] LeetCode list map error:', listErr);
      }
    }

    if (!titleSlug) {
      titleSlug = query.toLowerCase().replace(/\s+/g, '-');
    }

    // Query LeetCode GraphQL
    try {
      const gqlQuery = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            titleSlug
            content
            difficulty
            isPaidOnly
            topicTags {
              name
              slug
            }
            exampleTestcaseList
            sampleTestCase
          }
        }
      `;

      const gqlRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Referer': 'https://leetcode.com'
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { titleSlug }
        })
      });

      if (gqlRes.ok) {
        const gqlData = (await gqlRes.json()) as any;
        const q = gqlData?.data?.question;
        if (q && q.title) {
          const rawContent = q.content || '';
          const cleanedText = cleanHtmlToText(rawContent);

          // Extract short description (first non-empty paragraph)
          const paragraphs = cleanedText.split('\n\n').filter(p => p.trim().length > 0);
          const shortDesc = paragraphs[0]?.slice(0, 280) || `LeetCode Problem #${q.questionFrontendId}: ${q.title}`;

          // Primary topic tag
          const topicName = q.topicTags?.[0]?.name || 'Arrays';
          const tagsList = (q.topicTags || []).map((t: any) => t.name);

          // Extract sample test cases
          const testCases: any[] = [];
          if (Array.isArray(q.exampleTestcaseList) && q.exampleTestcaseList.length > 0) {
            q.exampleTestcaseList.slice(0, 5).forEach((exStr: string, idx: number) => {
              testCases.push({
                id: idx + 1,
                num: idx + 1,
                name: `Test Case ${idx + 1}`,
                input: exStr.trim(),
                output: '',
                visibility: idx === 0 ? 'Sample' : 'Hidden'
              });
            });
          }

          const responseData = {
            success: true,
            platform: 'leetcode',
            problemNumber: q.questionFrontendId,
            problemId: `LC-${q.questionFrontendId}`,
            title: q.title,
            slug: q.titleSlug,
            difficulty: q.difficulty || 'Easy',
            topic: topicName,
            tags: tagsList,
            description: shortDesc,
            statement: cleanedText || rawContent,
            sampleInput: testCases[0]?.input || '',
            sampleOutput: testCases[0]?.output || '',
            testCases,
            originalUrl: `https://leetcode.com/problems/${q.titleSlug}/`
          };

          if (res && typeof res.status === 'function') return res.status(200).json(responseData);
          return new Response(JSON.stringify(responseData), { status: 200, headers: corsHeaders });
        }
      }
    } catch (gqlErr) {
      console.warn('[fetchProblem] LeetCode GraphQL error:', gqlErr);
    }

    const notFoundPayload = {
      success: false,
      error: `Could not find LeetCode problem "${query}". Please check the problem number or title slug.`
    };
    if (res && typeof res.status === 'function') return res.status(404).json(notFoundPayload);
    return new Response(JSON.stringify(notFoundPayload), { status: 404, headers: corsHeaders });
  }

  // ----------------------------------------------------
  // 2. GEEKSFORGEEKS (GFG) FETCHER
  // ----------------------------------------------------
  if (platform === 'gfg') {
    let slug = query.trim();

    // If full URL provided: https://www.geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1
    if (slug.includes('geeksforgeeks.org/problems/')) {
      const match = slug.match(/geeksforgeeks\.org\/problems\/([^/?#]+)/i);
      if (match && match[1]) slug = match[1];
    } else {
      slug = slug.replace(/^\/+|\/+$/g, '');
    }

    // Try fetching via GFG Next.js page data
    const gfgUrlsToTry = [
      `https://www.geeksforgeeks.org/problems/${encodeURIComponent(slug)}/1`,
      `https://www.geeksforgeeks.org/problems/${encodeURIComponent(slug)}`,
      `https://www.geeksforgeeks.org/problems/${encodeURIComponent(slug.toLowerCase().replace(/\s+/g, '-'))}/1`
    ];

    let foundProblem: any = null;

    for (const testUrl of gfgUrlsToTry) {
      try {
        const pageRes = await fetch(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
          if (nextDataMatch && nextDataMatch[1]) {
            const nextJson = JSON.parse(nextDataMatch[1]);
            const papi = nextJson?.props?.pageProps?.initialState?.problemApi;
            if (papi && papi.queries) {
              for (const qKey of Object.keys(papi.queries)) {
                const qObj = papi.queries[qKey];
                if (qObj && qObj.data && typeof qObj.data === 'object' && qObj.data.problem_name) {
                  foundProblem = qObj.data;
                  break;
                }
              }
            }
          }
        }
      } catch (gfgErr) {
        console.warn(`[fetchProblem] GFG page fetch error for ${testUrl}:`, gfgErr);
      }

      if (foundProblem) break;
    }

    if (foundProblem) {
      const rawQuestion = foundProblem.problem_question || '';
      const cleanStatement = cleanHtmlToText(rawQuestion);
      const paragraphs = cleanStatement.split('\n\n').filter(p => p.trim().length > 0);
      const shortDesc = paragraphs[0]?.slice(0, 280) || `GeeksforGeeks Problem: ${foundProblem.problem_name}`;

      // Map topic tags
      const topicTags: string[] = foundProblem.tags?.topic_tags || [];
      const primaryTopic = topicTags[0] || 'Arrays';

      // Test cases
      const testCases: any[] = [];
      if (foundProblem.test_cases) {
        testCases.push({
          id: 1,
          num: 1,
          name: 'Sample 1',
          input: String(foundProblem.test_cases).trim(),
          output: '',
          visibility: 'Sample'
        });
      }

      // Map difficulty (School, Basic -> Easy)
      let diff = foundProblem.difficulty || 'Easy';
      if (diff === 'School' || diff === 'Basic') diff = 'Easy';
      if (diff !== 'Easy' && diff !== 'Medium' && diff !== 'Hard') diff = 'Medium';

      const responseData = {
        success: true,
        platform: 'gfg',
        problemNumber: foundProblem.id || '',
        problemId: `GFG-${foundProblem.id || slug}`,
        title: foundProblem.problem_name,
        slug: foundProblem.slug || slug,
        difficulty: diff,
        topic: primaryTopic,
        tags: topicTags,
        description: shortDesc,
        statement: cleanStatement || rawQuestion,
        sampleInput: testCases[0]?.input || '',
        sampleOutput: testCases[0]?.output || '',
        testCases,
        originalUrl: `https://www.geeksforgeeks.org/problems/${foundProblem.slug || slug}/1`
      };

      if (res && typeof res.status === 'function') return res.status(200).json(responseData);
      return new Response(JSON.stringify(responseData), { status: 200, headers: corsHeaders });
    }

    const notFoundPayload = {
      success: false,
      error: `Could not find GeeksforGeeks problem "${query}". Please provide the GFG problem slug or full link (e.g. parenthesis-checker2744 or full URL).`
    };
    if (res && typeof res.status === 'function') return res.status(404).json(notFoundPayload);
    return new Response(JSON.stringify(notFoundPayload), { status: 404, headers: corsHeaders });
  }

  const badPlatform = { success: false, error: 'Platform must be "leetcode" or "gfg".' };
  if (res && typeof res.status === 'function') return res.status(400).json(badPlatform);
  return new Response(JSON.stringify(badPlatform), { status: 400, headers: corsHeaders });
}
