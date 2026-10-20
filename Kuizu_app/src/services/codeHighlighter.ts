/**
 * High-performance lightweight syntax highlighter for code editors
 * Supports: C++, Python, JavaScript/TypeScript, Java, C#, Go
 */

export function highlightCode(code: string, language: string): string {
  const lang = (language || 'cpp').toLowerCase();

  // Escape HTML entities first
  const escape = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Define keywords per language
  const keywordsMap: Record<string, string[]> = {
    cpp: [
      'int', 'long', 'float', 'double', 'char', 'bool', 'void', 'auto', 'const', 'unsigned', 'signed',
      'class', 'struct', 'union', 'enum', 'namespace', 'using', 'typedef', 'template', 'typename',
      'public', 'protected', 'private', 'virtual', 'override', 'final', 'friend', 'static', 'inline',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return',
      'goto', 'try', 'catch', 'throw', 'new', 'delete', 'sizeof', 'nullptr', 'true', 'false',
      'vector', 'string', 'map', 'unordered_map', 'set', 'unordered_set', 'pair', 'queue', 'stack',
      'priority_queue', 'cin', 'cout', 'endl', 'ios_base', 'std'
    ],
    python: [
      'def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
      'continue', 'pass', 'try', 'except', 'finally', 'raise', 'assert', 'yield', 'lambda', 'with',
      'in', 'not', 'is', 'and', 'or', 'True', 'False', 'None', 'self', 'range', 'len', 'enumerate',
      'print', 'list', 'dict', 'set', 'tuple', 'int', 'str', 'float', 'bool', 'sorted', 'map', 'filter'
    ],
    javascript: [
      'var', 'let', 'const', 'function', 'class', 'extends', 'super', 'new', 'this', 'return', 'if',
      'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'import', 'export',
      'from', 'as', 'default', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'typeof',
      'instanceof', 'void', 'delete', 'in', 'of', 'null', 'undefined', 'true', 'false', 'NaN', 'Infinity',
      'console', 'log', 'Math', 'JSON', 'Array', 'Object', 'Map', 'Set', 'Promise', 'Number', 'String'
    ],
    typescript: [
      'var', 'let', 'const', 'function', 'class', 'interface', 'type', 'enum', 'extends', 'implements',
      'super', 'new', 'this', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
      'break', 'continue', 'import', 'export', 'from', 'as', 'try', 'catch', 'finally', 'throw',
      'async', 'await', 'yield', 'typeof', 'instanceof', 'void', 'delete', 'in', 'of', 'null',
      'undefined', 'true', 'false', 'any', 'number', 'string', 'boolean', 'never', 'unknown',
      'console', 'log', 'Math', 'JSON', 'Array', 'Object', 'Map', 'Set', 'Promise'
    ],
    java: [
      'public', 'protected', 'private', 'static', 'final', 'abstract', 'class', 'interface', 'extends',
      'implements', 'new', 'this', 'super', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
      'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'import',
      'package', 'int', 'long', 'float', 'double', 'char', 'boolean', 'byte', 'short', 'void',
      'true', 'false', 'null', 'System', 'out', 'println', 'print', 'String', 'Scanner', 'List',
      'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Arrays', 'Collections', 'Math'
    ],
    csharp: [
      'using', 'namespace', 'class', 'struct', 'interface', 'public', 'private', 'protected', 'internal',
      'static', 'readonly', 'const', 'virtual', 'override', 'new', 'this', 'base', 'return', 'if', 'else',
      'for', 'foreach', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch',
      'finally', 'throw', 'int', 'long', 'float', 'double', 'char', 'bool', 'string', 'void', 'var',
      'true', 'false', 'null', 'Console', 'WriteLine', 'ReadLine', 'List', 'Dictionary', 'Math'
    ],
    go: [
      'package', 'import', 'func', 'return', 'var', 'const', 'type', 'struct', 'interface', 'if', 'else',
      'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'fallthrough', 'go', 'defer',
      'select', 'chan', 'map', 'make', 'new', 'len', 'cap', 'append', 'nil', 'true', 'false', 'int',
      'string', 'bool', 'float64', 'error', 'fmt', 'Println', 'Printf', 'Scan'
    ]
  };

  const keywords = keywordsMap[lang] || keywordsMap['cpp'];
  const keywordSet = new Set(keywords);

  // Tokenization Regex:
  // 1. Comments: //... or /*...*/ or #...
  // 2. Strings: "..." or '...' or `...`
  // 3. Preprocessor: #include ...
  // 4. Numbers: \b\d+(\.\d+)?\b
  // 5. Identifiers / Keywords: [a-zA-Z_$][a-zA-Z0-9_$]*
  // 6. Symbols / Brackets: [{}()\[\]+\-*/%!=<>&|^~;:,.]
  const isPython = lang === 'python';
  const commentRegex = isPython ? /(#[^\n]*)/g : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;

  // Split lines to keep formatting identical
  const lines = code.split('\n');

  const highlightedLines = lines.map((line) => {
    let out = '';
    let i = 0;
    const len = line.length;

    while (i < len) {
      // 1. Check for single-line comments
      if (isPython && line[i] === '#') {
        out += `<span class="syn-comment">${escape(line.slice(i))}</span>`;
        break;
      }
      if (!isPython && line[i] === '/' && line[i + 1] === '/') {
        out += `<span class="syn-comment">${escape(line.slice(i))}</span>`;
        break;
      }

      // 2. Preprocessor directive in C/C++
      if ((lang === 'cpp' || lang === 'c++') && i === 0 && line.trim().startsWith('#')) {
        const hashIdx = line.indexOf('#');
        const prefix = line.slice(0, hashIdx);
        const rest = line.slice(hashIdx);
        out += escape(prefix) + `<span class="syn-preprocessor">${escape(rest)}</span>`;
        break;
      }

      // 3. String literals (double, single, backtick)
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        let strEnd = i + 1;
        while (strEnd < len) {
          if (line[strEnd] === '\\') {
            strEnd += 2;
            continue;
          }
          if (line[strEnd] === quote) {
            strEnd++;
            break;
          }
          strEnd++;
        }
        const strVal = line.slice(i, strEnd);
        out += `<span class="syn-string">${escape(strVal)}</span>`;
        i = strEnd;
        continue;
      }

      // 4. Numbers
      if (/\d/.test(ch) && (i === 0 || !/[a-zA-Z0-9_$]/.test(line[i - 1]))) {
        let numEnd = i;
        while (numEnd < len && /[0-9.xXa-fA-F_]/.test(line[numEnd])) {
          numEnd++;
        }
        const numVal = line.slice(i, numEnd);
        out += `<span class="syn-number">${escape(numVal)}</span>`;
        i = numEnd;
        continue;
      }

      // 5. Identifiers, Keywords, Functions
      if (/[a-zA-Z_$]/.test(ch)) {
        let idEnd = i;
        while (idEnd < len && /[a-zA-Z0-9_$]/.test(line[idEnd])) {
          idEnd++;
        }
        const idVal = line.slice(i, idEnd);

        // Check if followed by '(' -> function call
        let isFunc = false;
        let lookAhead = idEnd;
        while (lookAhead < len && /\s/.test(line[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < len && line[lookAhead] === '(' && !keywordSet.has(idVal)) {
          isFunc = true;
        }

        if (keywordSet.has(idVal)) {
          out += `<span class="syn-keyword">${escape(idVal)}</span>`;
        } else if (isFunc) {
          out += `<span class="syn-function">${escape(idVal)}</span>`;
        } else if (idVal[0] === idVal[0].toUpperCase() && idVal !== idVal.toLowerCase()) {
          // PascalCase / Types
          out += `<span class="syn-type">${escape(idVal)}</span>`;
        } else {
          out += `<span class="syn-variable">${escape(idVal)}</span>`;
        }

        i = idEnd;
        continue;
      }

      // 6. Operators & Delimiters
      if (/[{}()\[\]]/.test(ch)) {
        out += `<span class="syn-bracket">${escape(ch)}</span>`;
        i++;
        continue;
      }

      if (/[+\-*/%=<>!&|^~?:;.,]/.test(ch)) {
        out += `<span class="syn-operator">${escape(ch)}</span>`;
        i++;
        continue;
      }

      // Default raw character
      out += escape(ch);
      i++;
    }

    return out;
  });

  return highlightedLines.join('\n');
}
