import type { D1Database } from '@cloudflare/workers-types';
import type { Translation } from '../../../shared/types';
import { postPath } from '../../../shared/language';
import type { DiscoveryEntry, DiscoveryRow } from './types';

/** @param db - Site database. @returns Published metadata, with only existing public language equivalents. */
export async function discoveryEntries(db: D1Database): Promise<DiscoveryEntry[]> {
  const rows = await db.prepare(`SELECT id,slug,kind,COALESCE(translation_group,id) AS translationGroup,
    COALESCE(json_extract(published_json,'$.language'),'zh') AS language,
    json_extract(published_json,'$.title') AS title,json_extract(published_json,'$.summary') AS summary,
    published_updated_at AS updatedAt FROM posts
    WHERE status='published' AND published_json IS NOT NULL ORDER BY published_at DESC,id`).all<DiscoveryRow>();
  const groups = new Map<string, Translation[]>();
  for (const row of rows.results) {
    const group = groups.get(row.translationGroup) ?? [];
    group.push({ language: row.language, url: postPath(row) });
    groups.set(row.translationGroup, group);
  }
  return rows.results.map(row => ({ title: row.title, summary: row.summary, language: row.language,
    url: postPath(row), updatedAt: row.updatedAt,
    translations: groups.get(row.translationGroup)!.sort((a, b) => a.language.localeCompare(b.language)) }));
}
