<script setup lang="ts">
definePageMeta({ middleware: 'owner' });
await navigateTo('/manage', { redirectCode: 302 });
</script>
<template><p>正在打开创作管理…</p></template>
