import type { Content } from '../../../shared/types';
import { digest } from '../../utils/security';
/** @param content - Published article only. @returns Stable identity excluding cover, description and draft edits. */
export function summaryHash(content: Content): Promise<string> {
  return digest(JSON.stringify(['summary-v1', content.language || 'zh', content.title, content.markdown]));
}
