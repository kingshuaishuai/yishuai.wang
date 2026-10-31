<script setup lang="ts">
import { QuireAvatar, QuireIcon } from '@quirekit/ui/vue';
import { friendDomain, type FriendLink } from '~~/shared/friends';
defineProps<{ friend: FriendLink }>();
const { t, locale } = useBlogLocale();
</script>
<template>
  <a class="friend-card" :href="friend.url" target="_blank" rel="noopener noreferrer" :aria-label="`${friend.name} · ${t('在新标签页打开', 'Opens in a new tab')}`">
    <div class="friend-card-identity"><QuireAvatar :name="friend.name" :fallback="friend.name.slice(0, 1)" :src="friend.iconUrl || undefined" shape="square" size="lg" /><div><h2>{{ friend.name }}</h2><span>{{ friendDomain(friend.url) }}</span></div><QuireIcon class="friend-card-arrow" name="arrowUpRight" :size="20" /></div>
    <p>{{ locale === 'en' && friend.descriptionEn ? friend.descriptionEn : friend.description }}</p>
    <span class="friend-card-visit">{{ t('去读一读', 'Visit the site') }}</span>
  </a>
</template>
<style scoped>
.friend-card { display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 20px; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-group); background: var(--qk-color-surface-page); }
.friend-card-identity { display: flex; align-items: center; gap: 12px; }
.friend-card-identity > div { min-width: 0; }
.friend-card h2 { margin: 0; font-size: 19px; line-height: 1.4; font-weight: 600; letter-spacing: -.02em; overflow-wrap: anywhere; }
.friend-card-identity span { display: block; margin-top: 4px; font-size: 12px; color: var(--qk-color-text-tertiary); overflow-wrap: anywhere; }
.friend-card-arrow { margin-left: auto; flex-shrink: 0; color: var(--qk-color-text-tertiary); }
.friend-card p { margin: 0; color: var(--qk-color-text-secondary); font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; white-space: pre-line; }
.friend-card-visit { display: inline-flex; align-items: center; gap: 8px; margin-top: auto; font-size: 12px; color: var(--qk-color-text-tertiary); }
.friend-card:hover { border-color: var(--qk-color-border-default); background: var(--qk-color-surface-subtle); }
.friend-card:hover .friend-card-arrow, .friend-card:hover .friend-card-visit { color: var(--qk-color-text-primary); }
@media (prefers-reduced-motion: no-preference) { .friend-card { transition: background .18s, border-color .18s; } .friend-card-arrow { transition: transform .18s; } .friend-card:hover .friend-card-arrow { transform: translate(2px,-2px); } }
@media(max-width:600px) { .friend-card { padding: 18px; gap: 12px; } .friend-card h2 { font-size: 18px; } }
</style>
