<script setup lang="ts">
import { QuireClipboard, QuireIcon } from '@quirekit/ui/vue';
const props = defineProps<{ email: string }>();
const { t } = useBlogLocale();
const mailto = computed(() => {
  const subject = t('友链申请 · yishuai.wang', 'Friend link request · yishuai.wang');
  const body = t(
    '你好，Yishuai！\r\n\r\n想向你介绍我的站点：\r\n\r\n站点名称：\r\n站点链接：\r\n简介：\r\n图标地址（选填）：\r\n\r\n也想聊聊：\r\n',
    'Hi Yishuai,\r\n\r\nI would like to introduce my site:\r\n\r\nSite name:\r\nSite URL:\r\nIntroduction:\r\nIcon URL (optional):\r\n\r\nA little more about it:\r\n',
  );
  return `mailto:${props.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
</script>
<template>
  <div class="friend-contact" role="group" :aria-label="t('友链申请', 'Suggest a site')">
    <a :href="mailto" class="text-link" :title="email + ' · ' + t('请附上站点名称、链接和简介，图标可选。', 'Include your site name, URL and a short introduction. An icon is optional.')"><QuireIcon name="mail" :size="16" />{{ t('申请友链', 'Suggest') }}</a>
    <QuireClipboard :value="email" :target="t('申请邮箱', 'contact email')" :title="email" mode="icon" variant="text" size="sm" />
  </div>
</template>
<style scoped>
.friend-contact { display: inline-flex; align-items: center; gap: 8px; }
.friend-contact a { min-height: 36px; font-size: 13px; font-weight: 500; white-space: nowrap; }
@media(max-width:600px) { .friend-contact { gap: 4px; } .friend-contact a { font-size: 12px; } }
</style>
