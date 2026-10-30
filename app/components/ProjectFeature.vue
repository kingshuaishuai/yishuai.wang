<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
const { t } = useBlogLocale();
</script>

<template>
  <a class="project-feature" href="https://quirekit.com" target="_blank" rel="noreferrer" :aria-label="t('访问 QuireKit 官网（新窗口）')">
    <div class="project-copy"><span class="eyebrow">{{ t('正在创造') }}</span><h2 class="qk-type-page-title">QuireKit<span class="project-dot">.</span></h2><p>{{ t('从一段文字，到无限可能。') }}<br />{{ t('为创作而生的文档编辑器框架。') }}</p><span class="project-link">{{ t('探索项目') }} <QuireIcon name="arrowUpRight" :size="16" /></span></div>
    <div class="project-art" aria-hidden="true"><div class="paper paper-back"></div><div class="paper paper-front"><div class="paper-toolbar"><span></span><span></span><span></span><i></i></div><div class="paper-content"><span class="paper-eyebrow">A SPACE FOR IDEAS</span><strong>{{ t('想法，') }}<br />{{ t('成形。') }}</strong><div class="paper-rule long"></div><div class="paper-rule"></div><div class="paper-rule short"></div><div class="paper-bottom"><span>QuireKit</span><span>↗</span></div></div></div><div class="project-art-caption">WRITE. CREATE. CONNECT.</div></div>
  </a>
</template>
