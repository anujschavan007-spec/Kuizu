declare const process: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// OnlineCompiler.io Piston compatible runtime versions
const PISTON_CONFIG: Record<string, { language: string; version: string; compiler: string }> = {
  python: { language: 'python', version: '3.10.0', compiler: 'python-3.14' },
  py: { language: 'python', version: '3.10.0', compiler: 'python-3.14' },
  python3: { language: 'python', version: '3.10.0', compiler: 'python-3.14' },
  cpp: { language: 'c++', version: '10.2.0', compiler: 'g++-15' },
  'c++': { language: 'c++', version: '10.2.0', compiler: 'g++-15' },
  c: { language: 'c', version: '10.2.0', compiler: 'gcc-15' },
  java: { language: 'java', version: '15.0.2', compiler: 'openjdk-25' },
  javascript: { language: 'javascript', version: '18.15.0', compiler: 'nodejs-24' },
  js: { language: 'javascript', version: '18.15.0', compiler: 'nodejs-24' },
  typescript: { language: 'typescript', version: '5.0.3', compiler: 'typescript-deno' },
  ts: { language: 'typescript', version: '5.0.3', compiler: 'typescript-deno' }
};

// Judge0 fallback mapping (Community Edition open instance)
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  py: 71,
  python3: 71,
  cpp: 54,
  'c++': 54,
  c: 50,
  java: 62,
  javascript: 63,
  js: 63,
  typescript: 74,
  ts: 74
};

interface TestCasePayload {
  num?: number;
  name?: string;
  visibility?: string;
  input?: string;
  output?: string;
  expectedOutput?: string;
  summaryExpected?: string;
}

/**
 * Execute code with OnlineCompiler.io Piston Alternative
 * Gracefully falls back to Judge0 if key is not yet set or during setup.
 */
async function executeSingleTestCase(
  code: string,
  langKey: string,
  stdin: string,
  onlineCompilerKey?: string
): Promise<{ stdout: string; stderr: string; exitCode: number; timeMs: number }> {
  const startTime = Date.now();

  // 1. Try OnlineCompiler.io Piston API endpoint
  if (onlineCompilerKey) {
    try {
      const pConf = PISTON_CONFIG[langKey] || PISTON_CONFIG['python'];
      const ocRes = await fetch('https://api.onlinecompiler.io/api/v2/piston/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': onlineCompilerKey.startsWith('Bearer ') ? onlineCompilerKey : `Bearer ${onlineCompilerKey}`
        },
        body: JSON.stringify({
          language: pConf.language,
          version: pConf.version,
          files: [{ content: code }],
          stdin
        })
      });

      if (ocRes.ok) {
        const ocData: any = await ocRes.json();
        const run = ocData.run || {};
        return {
          stdout: (run.stdout || '').trim(),
          stderr: (run.stderr || ocData.message || '').trim(),
          exitCode: run.code ?? (run.stderr ? 1 : 0),
          timeMs: Date.now() - startTime
        };
      } else {
        const errText = await ocRes.text();
        console.warn('[OnlineCompiler.io Piston] HTTP Error:', ocRes.status, errText);
      }
    } catch (e: any) {
      console.warn('[OnlineCompiler.io Piston] Connection warning:', e.message);
    }
  }

  // 2. High-speed open runner via Judge0 CE public engine
  try {
    const langId = JUDGE0_LANGUAGE_IDS[langKey] || 71;
    const judge0Res = await fetch('https://ce.judge0.com/submissions?wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kuizu-OnlineCompiler-Client/1.0'
      },
      body: JSON.stringify({
        language_id: langId,
        source_code: code,
        stdin
      })
    });

    if (judge0Res.ok) {
      const jData: any = await judge0Res.json();
      const stdout = (jData.stdout || '').trim();
      const stderr = (jData.stderr || jData.compile_output || jData.message || '').trim();
      const isAccepted = jData.status?.id === 3;
      const timeMs = jData.time ? Math.round(parseFloat(jData.time) * 1000) : Date.now() - startTime;

      return {
        stdout,
        stderr,
        exitCode: isAccepted ? 0 : (jData.status?.id || 1),
        timeMs
      };
    }
  } catch (jErr: any) {
    console.warn('[Judge0 Fallback] Failed:', jErr.message);
  }

  // 3. Fallback: JS in-memory evaluation if language is JS/TS
  if (langKey === 'javascript' || langKey === 'js' || langKey === 'typescript' || langKey === 'ts') {
    try {
      const logs: string[] = [];
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        error: (...args: any[]) => logs.push(args.join(' ')),
        warn: (...args: any[]) => logs.push(args.join(' '))
      };
      const fn = new Function('console', 'input', `${code}`);
      const res = fn(customConsole, stdin);
      const output = logs.length > 0 ? logs.join('\n') : (res !== undefined ? String(res) : '');
      return {
        stdout: output.trim(),
        stderr: '',
        exitCode: 0,
        timeMs: Date.now() - startTime
      };
    } catch (evalErr: any) {
      return {
        stdout: '',
        stderr: evalErr.message || String(evalErr),
        exitCode: 1,
        timeMs: Date.now() - startTime
      };
    }
  }

  throw new Error('All compiler backends unreachable. Please verify network or API keys.');
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

  if (req.method !== 'POST') {
    if (res && typeof res.status === 'function') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }
    return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  let body: any = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body;
  } else if (typeof req.json === 'function') {
    try {
      body = await req.json();
    } catch {}
  }

  const { language = 'python', code = '', testCases = [] } = body;
  const langKey = String(language).toLowerCase().trim();

  if (!code || typeof code !== 'string') {
    const errPayload = { success: false, error: 'Code content is required for execution.' };
    if (res && typeof res.status === 'function') {
      return res.status(400).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), { status: 400, headers: corsHeaders });
  }

  // Load OnlineCompiler.io or Piston key from environment if provided
  const onlineCompilerKey =
    process.env.ONLINECOMPILER_API_KEY ||
    process.env.PISTON_API_KEY ||
    '';

  const cases: TestCasePayload[] = Array.isArray(testCases) && testCases.length > 0
    ? testCases
    : [{ num: 1, name: 'Default Test Case', input: '', output: '' }];

  const results: any[] = [];
  let anyFailed = false;

  try {
    for (let i = 0; i < cases.length; i++) {
      const tc = cases[i];
      const stdinInput = String(tc.input || '');
      const expectedOut = String(tc.output || tc.expectedOutput || tc.summaryExpected || '').trim();

      const execResult = await executeSingleTestCase(code, langKey, stdinInput, onlineCompilerKey);

      const actualOut = execResult.stdout;
      const tcError = execResult.stderr;
      const tcExitCode = execResult.exitCode;
      const durationMs = execResult.timeMs;

      // Pass verification
      const passed = expectedOut ? (tcExitCode === 0 && actualOut === expectedOut) : (tcExitCode === 0);
      if (!passed) anyFailed = true;

      results.push({
        num: tc.num || i + 1,
        name: tc.name || `Test Case ${i + 1}`,
        visibility: tc.visibility || (i === 0 ? 'Sample' : 'Hidden'),
        input: stdinInput,
        expected: expectedOut,
        expectedOutput: expectedOut,
        actual: actualOut,
        actualOutput: actualOut,
        status: passed ? 'Passed' : (tcError ? 'Runtime Error / Compilation Error' : 'Wrong Answer'),
        passed,
        error: tcError,
        exitCode: tcExitCode,
        durationMs
      });
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const allPassed = !anyFailed;

    const responsePayload = {
      success: true,
      allPassed,
      passed: allPassed,
      passedCount,
      totalCount,
      results,
      stdout: results.map(r => r.actual).filter(Boolean).join('\n')
    };

    if (res && typeof res.status === 'function') {
      return res.status(200).json(responsePayload);
    }
    return new Response(JSON.stringify(responsePayload), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error('[/api/execute] Execution error:', err);
    const errPayload = {
      success: false,
      error: err.message || 'Execution failed on compiler backend.'
    };
    if (res && typeof res.status === 'function') {
      return res.status(500).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), { status: 500, headers: corsHeaders });
  }
}
