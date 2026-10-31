import type { ContentLanguage, PublicPost, Translation } from '../../../shared/types';

/** Metadata needed by discovery files, without either draft or published bodies. */
export type DiscoveryEntry = Pick<PublicPost, 'title' | 'summary' | 'language' | 'url' | 'updatedAt'> & { translations: Translation[] };
/** Database projection deliberately excludes Markdown, rendered HTML and private drafts. */
export type DiscoveryRow = {
  id: string; slug: string; kind: 'article' | 'note'; language: ContentLanguage;
  title: string; summary: string; updatedAt: string; translationGroup: string;
};
