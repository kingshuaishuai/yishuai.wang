<script setup lang="ts">
import { QuireButton, QuireIcon, QuireIconButton, QuirePopoverRoot, QuirePopoverTrigger, QuirePopoverContent } from '@quirekit/ui/vue';
import type { Session } from '~~/shared/types';
defineProps<{ items: { label: string; path: string }[]; identity: Session | null }>();
const emit = defineEmits<{ publishing: [] }>();
const { t, basePath, localePath } = useBlogLocale();
const route = useRoute();
const open = ref(false);
const handingOff = ref(false);
/** Closes the navigation before handing focus ownership to the publishing dialog. */
async function openPublishing(): Promise<void> {
  handingOff.value = true; open.value = false;
  await nextTick(); emit('publishing');
}
watch(open, value => { if (value) handingOff.value = false; });
let breakpoint: MediaQueryList | undefined;
/** Closes the mobile overlay when its trigger leaves the desktop layout. */
function closeOnDesktop(): void { if (breakpoint?.matches) open.value = false; }
watch(() => route.fullPath, () => { open.value = false; });
onMounted(() => {
  breakpoint = window.matchMedia('(min-width: 1081px)');
  breakpoint.addEventListener('change', closeOnDesktop);
});
onBeforeUnmount(() => breakpoint?.removeEventListener('change', closeOnDesktop));
</script>
<template>
  <QuirePopoverRoot v-model:open="open" placement="bottom-end" :restore-focus="!handingOff">
    <QuirePopoverTrigger as-child><QuireIconButton class="mobile-toggle" :label="open ? t('收起导航', 'Close navigation') : t('打开导航', 'Open navigation')" size="lg"><QuireIcon :name="open ? 'close' : 'menu'" /></QuireIconButton></QuirePopoverTrigger>
    <QuirePopoverContent :show-arrow="false" width="240px" padding="none" border="subtle" :aria-label="t('手机导航', 'Mobile navigation')">
      <nav class="mobile-nav" :aria-label="t('手机导航', 'Mobile navigation')" @click="open = false">
        <NuxtLink v-for="item in items" :key="item.path" :to="localePath(item.path)" :aria-current="basePath === item.path || (item.path !== '/' && basePath.startsWith(item.path + '/')) ? 'page' : undefined">{{ item.label }}<QuireIcon v-if="basePath === item.path" name="check" :size="16" /></NuxtLink>
        <NuxtLink v-if="identity" :to="localePath(identity.user.owner ? '/manage' : '/account')" :aria-current="basePath === (identity.user.owner ? '/manage' : '/account') ? 'page' : undefined">{{ identity.user.owner ? t('创作管理', 'Manage') : t('个人中心', 'Account') }}</NuxtLink>
        <QuireButton v-if="identity?.user.owner" class="mobile-publishing" variant="text" size="lg" aria-haspopup="dialog" aria-controls="publishing-access-dialog" @click="openPublishing">{{ t('发布接入', 'Publishing access') }}<template #trailing><QuireIcon name="link" :size="16" /></template></QuireButton>
        <NuxtLink :to="localePath('/subscribe')" :aria-current="basePath === '/subscribe' ? 'page' : undefined">{{ t('订阅', 'Subscribe') }}<RssIcon /></NuxtLink>
      </nav>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
