import { getPlatformProxy } from 'wrangler';
import { articles, notes } from './fixtures/sample-content';
import { createPost, transitionPost } from '../server/domain/posts';
import { normalizeContent } from '../server/domain/content';
import type { Bindings } from '../server/domain/types';

// This helper only talks to local emulation; production migrations never insert demo content.
const platform = await getPlatformProxy<Bindings>({ persist: true, remoteBindings: false, envFiles: [] });
try {
  const samples = [...articles.map(a => ({ slug: a.slug, kind: 'article' as const, title: a.title, summary: a.summary, markdown: a.content, category: a.category, date: a.date.replaceAll('.', '-') })),
    ...notes.map((n, i) => ({ slug: `sample-note-${i + 1}`, kind: 'note' as const, title: '', summary: n.text, markdown: n.text, category: n.mood, date: `2026-${n.date.replace('.', '-')}` }))];
  let added = 0;
  for (const sample of samples) {
    if (await platform.env.BLOG_DB.prepare('SELECT id FROM posts WHERE slug=?').bind(sample.slug).first()) continue;
    const draft = await createPost(platform.env.BLOG_DB, '25154825', normalizeContent(sample), sample.slug);
    await transitionPost(platform.env.BLOG_DB, draft.id, draft.version, 'publish');
    await platform.env.BLOG_DB.prepare('UPDATE posts SET published_at=?,published_updated_at=? WHERE id=?').bind(`${sample.date}T08:00:00.000Z`, `${sample.date}T08:00:00.000Z`, draft.id).run();
    added++;
  }
  console.log(`已加入 ${added} 篇本地示例内容。已有内容保持原样。`);
} finally { await platform.dispose(); }
