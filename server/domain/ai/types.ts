import type { Content } from '../../../shared/types';
import type { SummaryError, SummaryModel } from '../../../shared/ai';
/** Private settings row; encrypted_key never enters an API response. */
export type SettingsRow = { enabled: number; model: SummaryModel; encrypted_key: string | null; revision: string; updated_at: string };
/** One in-flight lease and the last complete result for a post. */
export type SummaryRow = { post_id: string; status: 'generating' | 'ready' | 'failed'; request_id: string; request_hash: string; started_at: number; summary_text: string; source_hash: string | null; model: string | null; generated_at: string | null; error_code: SummaryError | null };
/** Claimed generation contains only a published snapshot and server-owned settings. */
export type SummaryJob = { postId: string; requestId: string; hash: string; content: Content; settings: SettingsRow };
