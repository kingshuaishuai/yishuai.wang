import { describe, expect, it } from 'vitest';
import { highlightCode } from '../app/lib/code-highlighting';

describe('article code highlighting', () => {
  it.each([
    ['ts', 'const message: string = "你好";\n// 原文\n'],
    ['python', 'def greet(name):\n    return "Hello " + name\n'],
    ['json', '{"message": "你好", "enabled": true, "count": 3}\n'],
    ['bash', 'echo "Hello"\n'],
  ])('parses %s with the editor language catalog and preserves source', async (language, code) => {
    const tokens = await highlightCode(code, language);
    expect(tokens.map(token => token.text).join('')).toBe(code);
    expect(tokens.some(token => token.className.includes('tok-string'))).toBe(true);
    expect(tokens.some(token => token.className !== '')).toBe(true);
  });

  it('keeps HTML-like strings as text and unknown languages as plain source', async () => {
    const code = 'const html = "<img src=x onerror=alert(1)>";\n';
    const tokens = await highlightCode(code, 'JS');
    expect(tokens.map(token => token.text).join('')).toBe(code);
    expect(tokens.find(token => token.text.includes('<img'))?.className).toContain('tok-string');
    expect(await highlightCode(code, 'unknown-language')).toEqual([{ text: code, className: '' }]);
  });
});
