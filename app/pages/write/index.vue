<script setup lang="ts">
const { t, localePath } = useBlogLocale();
definePageMeta({ middleware: 'owner' });
await navigateTo(localePath('/manage'), { redirectCode: 302 });
</script>
<template><p>{{ t('正在打开创作管理…') }}</p></template>
