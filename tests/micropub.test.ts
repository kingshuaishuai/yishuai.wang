import { describe, expect, it } from 'vitest';
import { fromProperties, sourceProperties, updateProperties } from '../server/micropub/content';
import { verifiedScopes, requireScope } from '../server/micropub/auth';
import { returnPath } from '../server/utils/security';
import type { DraftPost } from '../shared/types';
/** @param properties - Test source. @returns Owner projection for source round trips. */
function draft(properties: Record<string, unknown[]>): DraftPost { return { ...fromProperties(properties), id: 'test', slug: 'test', status: 'published', version: 1, updatedAt: '2026-10-29T00:00:00Z', publishedAt: '2026-10-29T00:00:00Z' }; }

describe('Micropub semantics', () => {
  it('distinguishes plaintext, HTML and Markdown without losing unknown properties', () => {
    const plain = draft({ content: ['**plain**'], custom: [{ nested: true }] });
    expect(plain.sourceFormat).toBe('text'); expect(plain.markdown).toContain('\\*');
    expect(sourceProperties(plain).content).toEqual(['**plain**']);
    expect(sourceProperties(plain).custom).toEqual([{ nested: true }]);
    const html = draft({ name: ['文章'], content: [{ html: '<p><strong>Hello</strong></p>' }] });
    expect(html.kind).toBe('article'); expect(html.markdown).toContain('**Hello**');
    expect(sourceProperties(html).content).toEqual([{ html: '<p><strong>Hello</strong></p>' }]);
  });
  it('round trips photo source without adding another copy on every update', () => {
    const first = draft({ content: ['照片'], photo: ['https://example.test/photo.png'], category: ['日常'] });
    expect(first.markdown.match(/photo.png/g)?.length).toBe(1);
    const updated = fromProperties(updateProperties(sourceProperties(first), { add: { category: ['散步'] } }));
    expect(updated.markdown.match(/photo.png/g)?.length).toBe(1);
    expect(updated.tags).toEqual(['日常', '散步']);
  });
  it('implements replace, add and both delete forms without mutating the original', () => {
    const original = { name: ['原题'], category: ['a', 'b'], content: ['正文'] };
    const changed = updateProperties(original, { replace: { name: ['新题'] }, add: { category: ['c'] }, delete: { category: ['b'] } });
    expect(changed).toEqual({ name: ['新题'], category: ['a', 'c'], content: ['正文'] });
    expect(updateProperties(changed, { delete: ['name'] }).name).toBeUndefined();
    expect(original.name).toEqual(['原题']);
  });
  it('requires active, unexpired tokens for the exact author URL and operation scope', () => {
    const token = { active: true, me: 'https://yishuai.wang/', scope: 'create update' };
    expect(verifiedScopes(token, 'https://yishuai.wang').has('create')).toBe(true);
    for (const value of [{ ...token, active: false }, { ...token, exp: 1 }]) expect(() => verifiedScopes(value, 'https://yishuai.wang')).toThrow();
    for (const me of ['https://yishuai.wang/another', 'https://evil.test/', 'https://user:pass@yishuai.wang/']) expect(() => verifiedScopes({ ...token, me }, 'https://yishuai.wang')).toThrow();
    expect(() => requireScope(verifiedScopes(token, 'https://yishuai.wang'), 'delete')).toThrow();
  });
  it('never returns an external or ambiguous OAuth redirect', () => {
    for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil']) expect(returnPath(path)).toBe('/');
    expect(returnPath('/articles/entry#comments')).toBe('/articles/entry#comments');
  });
});
