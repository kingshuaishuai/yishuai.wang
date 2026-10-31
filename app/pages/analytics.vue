<script setup lang="ts">
import { QuireButton, QuireCollapsible, QuireIcon, QuireSelect, QuireSwitch } from '@quirekit/ui/vue';
import type { AnalyticsReport, AnalyticsSettings } from '~~/shared/analytics';
const { t, locale, localePath } = useBlogLocale();
definePageMeta({ middleware: 'owner' });
useBlogSeo(t('访问统计', 'Traffic'), t('了解文章如何被看见。', 'See how your writing reaches readers.'), '/analytics', true);
const { mutate } = useBlogSession();
const days = ref('7'), saving = ref(false), message = ref('');
const rangeItems = computed(() => [{ value: '7', label: t('最近 7 天', 'Last 7 days') }, { value: '30', label: t('最近 30 天', 'Last 30 days') }]);
const { data, error, status, refresh } = await useFetch<AnalyticsReport>('/api/owner/analytics', { query: { days } });
/** @param value - Nonnegative metric. @returns Localized readable number. */
function number(value: number): string { return value.toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US'); }
const metrics = computed(() => data.value ? [
  { label: t('浏览次数', 'Page views'), value: data.value.totals.views, note: t('公开页面的有效浏览', 'Public pages') },
  { label: t('日访客合计', 'Daily visitors'), value: data.value.totals.dailyVisitors, note: t('同一访客跨天会重复计数', 'Summed across days') },
  { label: t('文章浏览', 'Article views'), value: data.value.totals.articleViews, note: t('仅文章详情页', 'Articles only') },
] : []);
/** @param checked - Requested counter visibility. */
async function toggleCounts(checked: boolean | undefined): Promise<void> {
  if (saving.value || !data.value) return;
  saving.value = true; message.value = '';
  try {
    const settings = await mutate<AnalyticsSettings>('/api/owner/analytics/settings', 'PUT', { publicCounts: !!checked });
    data.value.settings = settings;
    message.value = t('已保存', 'Saved');
  } catch { message.value = t('保存失败，请重试。', 'Could not save. Please retry.'); }
  finally { saving.value = false; }
}
</script>
<template>
  <div class="analytics-page">
    <NuxtLink :to="localePath('/manage')" class="back-link"><QuireIcon name="arrowLeft" :size="16" />{{ t('创作管理', 'Manage') }}</NuxtLink>
    <div class="analytics-heading"><div><h1>{{ t('访问统计', 'Traffic') }}</h1><p>{{ t('看见文字抵达的地方。', 'Where your words find readers.') }}</p></div><div class="analytics-controls"><QuireSelect v-model="days" :items="rangeItems" :label="t('统计范围', 'Date range')" width="132px" size="md" /><QuireButton variant="text" size="md" :disabled="status === 'pending'" @click="refresh()">{{ t('刷新', 'Refresh') }}</QuireButton></div></div>
    <p v-if="error" class="comment-error" role="alert">{{ t('统计暂时无法加载，请重试。', 'Traffic could not be loaded. Please retry.') }}</p>
    <div v-else-if="data" :aria-busy="status === 'pending'">
      <dl class="analytics-metrics"><div v-for="metric in metrics" :key="metric.label"><dt>{{ metric.label }}</dt><dd><strong>{{ number(metric.value) }}</strong><span>{{ metric.note }}</span></dd></div></dl>
      <p v-if="!data.totals.views" class="analytics-empty">{{ t('还没有记录到访问。真实访客停留后，数据会出现在这里；你自己的访问不计入。', 'No visits recorded yet. Visits appear after readers stay on a page; your own visits are excluded.') }}</p>
      <AnalyticsTrend :daily="data.daily" />
      <div class="analytics-lists">
        <section><div class="analytics-section-title"><h2>{{ t('热门文章', 'Top articles') }}</h2><span>{{ t('浏览次数', 'Views') }}</span></div><p v-if="!data.pages.length" class="analytics-empty">{{ t('这段时间还没有文章浏览。', 'No article views in this period.') }}</p><ol v-else class="analytics-ranking"><li v-for="(page, index) in data.pages" :key="page.path"><span class="analytics-rank">{{ index + 1 }}</span><NuxtLink v-if="page.published" :to="page.path">{{ page.title || page.path }}</NuxtLink><span v-else>{{ page.title || page.path }} <small>{{ t('已撤下', 'Unpublished') }}</small></span><strong>{{ number(page.views) }}</strong></li></ol></section>
        <section><div class="analytics-section-title"><h2>{{ t('访问来源', 'Sources') }}</h2><span>{{ t('浏览次数', 'Views') }}</span></div><p v-if="!data.sources.length" class="analytics-empty">{{ t('来源会随访问记录。', 'Sources appear as visits arrive.') }}</p><ol v-else class="analytics-ranking"><li v-for="source in data.sources" :key="source.source"><span>{{ source.source === 'direct' ? t('直接访问 / 站内', 'Direct / internal') : source.source }}</span><strong>{{ number(source.views) }}</strong></li></ol></section>
      </div>
      <div class="analytics-setting"><QuireSwitch :checked="data.settings.publicCounts" :disabled="saving" :label="t('在文章标题下显示浏览次数', 'Show view counts below article titles')" :description="t('展示自统计启用以来的累计次数。', 'Shows cumulative views since tracking began.')" @update:checked="toggleCounts" /><span role="status">{{ message }}</span></div>
      <QuireCollapsible :title="t('统计口径与隐私', 'How counting works')" variant="plain" size="md"><div class="analytics-method"><p>{{ t('从', 'Tracking since') }} {{ new Date(data.settings.startedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { timeZone: 'Asia/Shanghai' }) }} {{ t('开始记录，不补算历史访问。日期统一使用北京时间。', '— no historical traffic is estimated. Days use Asia/Shanghai time.') }}</p><p>{{ t('页面连续可见 5 秒后计数；同一浏览器、同一页面在每个半小时窗口内只计一次。作者登录后的访问、已识别的爬虫，以及开启 DNT / GPC 的浏览器不计入。浏览次数不代表读完文章。', 'A page counts after five continuous visible seconds, once per browser and page in each half-hour window. Signed-in author visits, recognized bots, and browsers requesting DNT / GPC are excluded. A view does not mean a completed read.') }}</p><p>{{ t('日访客按当天的匿名浏览器标识估算，跨设备或清除浏览器数据会重复计数。仅保存汇总及短期去重哈希，不保存原始 IP、完整来源网址或跨天身份。来源按当前页面会话的入口域名归属；RSS 阅读器内的阅读不计入。', 'Daily visitors are estimated using a daily anonymous browser ID; other devices or cleared storage count separately. Only aggregates and short-lived deduplication hashes are stored, without raw IPs, full referrer URLs or cross-day identity. Sources use the entry domain of the current page session. Reading inside RSS readers is not counted.') }}</p></div></QuireCollapsible>
    </div>
  </div>
</template>
<style scoped src="../assets/analytics.css"></style>
