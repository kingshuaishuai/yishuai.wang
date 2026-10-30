/** Convenient model suggestions, not a restriction on future DeepSeek identifiers. */
export const summaryModels = ['deepseek-flash', 'deepseek-v4-pro'] as const;
/** Model identifier chosen by the author. */
export type SummaryModel = string;
/** Safe owner configuration; the saved credential is never returned. */
export type AiSettings = { enabled: boolean; model: SummaryModel; hasKey: boolean; encryptionReady: boolean; revision: string };
/** Only complete summaries matching the current published content are public. */
export type AiSummary = { text: string; generatedAt: string };
/** Actionable failure codes exclude provider responses and credentials. */
export type SummaryError = 'credentials' | 'quota' | 'timeout' | 'provider' | 'model' | 'incomplete' | 'too_long' | 'configuration' | 'changed';
/** Author view of the published snapshot's summary lifecycle. */
export type SummaryStatus = { status: 'disabled' | 'unpublished' | 'missing' | 'stale' | 'generating' | 'ready' | 'failed'; summary: AiSummary | null; error: SummaryError | null };
/** Events delivered only to an authenticated author during a manual generation. */
export type SummaryEvent = { type: 'delta'; text: string } | { type: 'complete'; summary: AiSummary } | { type: 'error'; code: SummaryError };
