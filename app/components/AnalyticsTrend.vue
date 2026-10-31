<script setup lang="ts">
import { QuireCollapsible } from '@quirekit/ui/vue';
import type { AnalyticsDay } from '~~/shared/analytics';
const props = defineProps<{ daily: AnalyticsDay[] }>();
const { t, locale } = useBlogLocale();
const peak = computed(() => Math.max(1, ...props.daily.map(day => day.views)));
const selected = ref<string | null>(null);
const active = computed(() => props.daily.find(day => day.day === selected.value) ?? props.daily.at(-1));
/** @param value - Daily metric. @returns Locale-formatted count. */
function number(value: number): string { return value.toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US'); }
</script>
<template>
  <section class="analytics-trend" :aria-label="t('每日浏览趋势', 'Daily views')">
    <div class="analytics-section-title"><h2>{{ t('浏览趋势', 'Views over time') }}</h2><p v-if="active" aria-live="polite">{{ active.day.slice(5).replace('-', '.') }} · {{ number(active.views) }} {{ t('次浏览', 'views') }} · {{ number(active.visitors) }} {{ t('位访客', 'visitors') }}</p></div>
    <div class="analytics-bars" @mouseleave="selected = null">
      <button v-for="day in daily" :key="day.day" type="button" class="analytics-bar" :class="{ 'is-active': active?.day === day.day }" :aria-label="`${day.day}: ${day.views} ${t('次浏览', 'views')}, ${day.visitors} ${t('位访客', 'visitors')}`" @focus="selected = day.day" @mouseenter="selected = day.day" @click="selected = day.day">
        <span :style="{ height: `${day.views / peak * 100}%` }" :class="{ 'is-empty': !day.views }" />
      </button>
    </div>
    <div class="analytics-axis" aria-hidden="true"><span>{{ daily[0]?.day.slice(5).replace('-', '.') }}</span><span>{{ daily.at(-1)?.day.slice(5).replace('-', '.') }}</span></div>
    <QuireCollapsible :title="t('查看每日数据', 'Daily breakdown')" variant="plain" size="sm">
      <div class="analytics-table-scroll"><table class="analytics-table"><thead><tr><th>{{ t('日期', 'Date') }}</th><th>{{ t('浏览', 'Views') }}</th><th>{{ t('当日访客', 'Daily visitors') }}</th></tr></thead><tbody><tr v-for="day in daily" :key="day.day"><td>{{ day.day }}</td><td>{{ number(day.views) }}</td><td>{{ number(day.visitors) }}</td></tr></tbody></table></div>
    </QuireCollapsible>
  </section>
</template>
