import type { SummaryError } from '~~/shared/ai';
/** Author-facing failures describe recovery without exposing raw model responses. */
export const summaryErrors: Record<SummaryError, [string, string]> = {
  credentials: ['Key 无效或无权使用，请在管理页检查配置。', 'The key was rejected. Check your settings in Manage.'],
  quota: ['DeepSeek 余额不足或请求过多，请稍后重试。', 'DeepSeek rejected the usage or rate limit. Check your balance and retry.'],
  timeout: ['生成超时，请重试。', 'Generation timed out. Please retry.'],
  provider: ['模型暂时不可用，请稍后重试。', 'The model is unavailable. Please retry later.'],
  model: ['模型配置未被接受，请检查模型 ID 及其接口兼容性。', 'The model configuration was rejected. Check the model ID and API compatibility.'],
  incomplete: ['总结没有完整生成，请重试。', 'The summary was incomplete. Please retry.'],
  too_long: ['正文超过 60,000 字符，暂不自动总结。', 'Articles over 60,000 characters are not summarized automatically.'],
  configuration: ['密钥无法读取，请在管理页重新配置。', 'The key could not be read. Reconfigure it in Manage.'],
  changed: ['文章或设置已更新，请为当前版本重新生成。', 'The article or settings changed. Generate a summary for the current version.'],
};
