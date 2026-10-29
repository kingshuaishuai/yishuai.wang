<script setup lang="ts">
import { QuireAvatar, QuireIcon } from '@quirekit/ui/vue';
import type { Profile } from '~~/shared/types';
const { data: author } = await useFetch<Profile>('/api/profile', { key: 'site-profile' });
useBlogSeo('关于', 'Yishuai，开发者，QuireKit 作者。创造，也记录。', '/about');
</script>
<template><div class="page-intro"><span class="eyebrow">很高兴在这里遇见你</span><div class="about-identity"><QuireAvatar name="Yishuai" fallback="Y" :src="author?.avatarUrl || undefined" size="xl" /><h1 class="qk-type-display">我是 Yishuai。</h1></div><p>开发者，QuireKit 作者。喜欢把想法做成可以使用的东西。</p></div><div class="about-body"><section><h2 class="qk-type-section-title">创造，也记录。</h2><p>这里是我的个人空间。你会看到正在做的项目、开发过程中的思考，以及一些生活里的小事。</p><p>我希望这里保持简单，让作品说话，让文字有足够的呼吸空间。偶尔回来更新，慢慢积累。</p></section><section><h2 class="qk-type-section-title">最近在做什么</h2><a href="https://quirekit.com" target="_blank" rel="noreferrer" class="about-project"><span>QuireKit</span><span>文档编辑器框架</span><QuireIcon name="arrowUpRight" :size="16" /></a><p>也在用它搭建这个博客，让阅读和写作回到自己的地方。</p></section><section><h2 class="qk-type-section-title">保持联系</h2><p>你可以通过 RSS 订阅这里的文章，用自己喜欢的阅读器接收更新。</p><a href="/subscribe" class="text-link">订阅文章更新 <QuireIcon name="arrowUpRight" :size="16" /></a></section></div></template>
