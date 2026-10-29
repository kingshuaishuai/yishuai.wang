<script setup lang="ts">
import { QuireProseSource } from '@quirekit/ui/vue';
defineOptions({ inheritAttrs: false });
</script>

<template>
  <QuireProseSource v-bind="$attrs" :default-collapsed="false"><slot /></QuireProseSource>
</template>
