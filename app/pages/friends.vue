<script setup lang="ts">
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
import type { FriendLink } from '~~/shared/friends';
const { t, localePath } = useBlogLocale();
const { identity } = useBlogSession();
const config = useRuntimeConfig();
useBlogSeo(t('友链', 'Friends'), t('一些值得慢慢读的个人站点。技术、创造，以及真实的生活。', 'Personal sites worth taking time to read. Technology, making things, and life.'), '/friends');
const { data: friends, error, refresh } = await useFetch<FriendLink[]>('/api/friends', { key: 'public-friends' });
</script>
<template>
  <div class="friends-page">
    <div class="page-intro"><span class="eyebrow">{{ t('从这里，去往别处', 'A few paths beyond this page') }}</span><h1 class="qk-type-display">{{ t('友链', 'Friends') }}</h1><p>{{ t('一些值得慢慢读的个人站点。关于技术、创造，以及真实的生活。', 'Personal sites worth taking time to read — on technology, making things, and life.') }}</p></div>
    <div class="friends-heading">
      <h2>{{ t('喜欢的站点', 'Sites I enjoy') }}<span v-if="friends?.length" class="friends-count">{{ String(friends.length).padStart(2, '0') }}</span></h2>
      <div class="friends-heading-actions">
        <FriendContact :email="config.public.friendRequestEmail" />
        <NuxtLink v-if="identity?.user.owner" :to="localePath('/manage/friends')" class="friends-manage-link text-link" :aria-label="t('管理友链', 'Manage links')" :title="t('管理友链', 'Manage links')"><QuireIcon name="settings" :size="16" /><span class="friends-manage-label">{{ t('管理友链', 'Manage links') }}</span></NuxtLink>
      </div>
    </div>
    <div v-if="error" class="friends-feedback" role="alert"><p>{{ t('友链暂时无法载入。', 'Could not load the links.') }}</p><QuireButton variant="outline" size="sm" @click="refresh()">{{ t('重试', 'Retry') }}</QuireButton></div>
    <div v-else-if="friends?.length" class="friends-grid"><FriendCard v-for="friend in friends" :key="friend.id" :friend="friend" /></div>
    <p v-else class="friends-feedback">{{ t('正在慢慢整理，欢迎过些时候再来看看。', 'I am gathering a few recommendations. Check back soon.') }}</p>
  </div>
</template>
<style scoped>
.friends-page .page-intro { padding: 28px 0 20px; }
.friends-page .page-intro h1 { margin: 8px 0 10px; line-height: 1.35; }
.friends-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0 18px; }
.friends-heading h2 { display: flex; align-items: baseline; gap: 10px; margin: 0; font-size: 14px; font-weight: 500; }
.friends-heading-actions { display: flex; align-items: center; flex-shrink: 0; gap: 16px; }
.friends-count { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--qk-color-text-tertiary); }
.friends-manage-link { min-height: 36px; font-size: 12px; font-weight: 400; }
.friends-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.friends-feedback { padding-block: 24px; display: flex; align-items: center; flex-wrap: wrap; gap: 16px; color: var(--qk-color-text-secondary); }
@media(max-width:720px) { .friends-page .page-intro { padding: 20px 0 18px; } .friends-grid { grid-template-columns: 1fr; } }
@media(max-width:600px) { .friends-heading-actions { gap: 4px; } .friends-heading h2 { font-size: 13px; gap: 8px; } .friends-manage-link { width: 32px; justify-content: center; } .friends-manage-label { display: none; } }
</style>
