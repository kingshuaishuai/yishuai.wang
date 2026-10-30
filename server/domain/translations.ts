import type { D1Database } from '@cloudflare/workers-types';
import { createError } from 'h3';
import type { ContentLanguage, DraftPost } from '../../shared/types';
import type { PostRow } from './types';
import { createPost, draftView, getPost } from './posts';
import { normalizeContent } from './content';

/** @param db - Database. @param id - Owner's source entry. @returns Other versions, including private drafts. */
export async function ownerTranslations(db: D1Database, id: string): Promise<Pick<DraftPost, 'id' | 'language' | 'status'>[]> {
  const source = await getPost(db, id);
  const rows = await db.prepare('SELECT * FROM posts WHERE COALESCE(translation_group,id)=? AND id!=?').bind(source.translation_group || id, id).all<PostRow>();
  return rows.results.map(row => { const draft = draftView(row); return { id: draft.id, language: draft.language, status: draft.status }; });
}
/** @param db - Database. @param id - Source entry. @param language - Language to create. @returns Existing or new blank translation draft, never an automatic publication. */
export async function createTranslation(db: D1Database, id: string, language: ContentLanguage): Promise<DraftPost> {
  const row = await getPost(db, id), source = draftView(row), group = row.translation_group || id;
  if (row.status === 'deleted') throw createError({ statusCode: 409, message: '请先恢复这篇内容。' });
  if (source.language === language) return source;
  const existing = await db.prepare("SELECT * FROM posts WHERE COALESCE(translation_group,id)=? AND COALESCE(json_extract(draft_json,'$.language'),'zh')=?").bind(group, language).first<PostRow>();
  if (existing) {
    if (existing.status === 'deleted') throw createError({ statusCode: 409, message: '此语言版本已删除，请先在管理页恢复。' });
    return draftView(existing);
  }
  try {
    return await createPost(db, row.author_id, normalizeContent({ kind: source.kind, language, coverUrl: source.coverUrl, category: source.category, tags: source.tags }), undefined, group);
  } catch (error) {
    // The unique language index makes retries and concurrent clicks share one version.
    if ((error as { statusCode?: number }).statusCode === 409) {
      const winner = await db.prepare("SELECT * FROM posts WHERE COALESCE(translation_group,id)=? AND COALESCE(json_extract(draft_json,'$.language'),'zh')=? AND status!='deleted'").bind(group, language).first<PostRow>();
      if (winner) return draftView(winner);
    }
    throw error;
  }
}
