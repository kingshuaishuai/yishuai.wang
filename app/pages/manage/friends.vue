<script setup lang="ts">
import { QuireAvatar, QuireButton, QuireDialogRoot, QuireDialogContent, QuireIcon } from '@quirekit/ui/vue';
import { friendDomain, type ManagedFriend } from '~~/shared/friends';
const { t, localePath } = useBlogLocale();
definePageMeta({ middleware: 'owner' });
useBlogSeo(t('友链管理', 'Friend links'), t('整理值得推荐的站点。', 'Manage sites worth recommending.'), '/manage/friends', true);
const { mutate } = useBlogSession();
const { data: friends, error: loadError, refresh } = await useFetch<ManagedFriend[]>('/api/owner/friends');
const editorOpen = ref(false), editing = ref<ManagedFriend | null>(null), deleting = ref<ManagedFriend | null>(null);
const busy = ref(false), error = ref(''), notice = ref('');
const confirming = computed({ get: () => !!deleting.value, set: value => { if (!value) deleting.value = null; } });
let trigger: HTMLElement | null = null;
/** @returns The edit control, or the persistent add button if its row was removed. */
function returnFocus(): HTMLElement | null { return trigger?.isConnected ? trigger : document.getElementById('add-friend'); }
/** @param friend - Existing snapshot or a new empty entry. @param event - Opening pointer or keyboard action. */
function edit(friend: ManagedFriend | null, event: Event): void { trigger = event.currentTarget as HTMLElement; editing.value = friend; editorOpen.value = true; }
/** Refreshes private and public data after an acknowledged save. */
async function saved(): Promise<void> { notice.value = t('友链已保存。', 'Link saved.'); await Promise.all([refresh(), refreshNuxtData('public-friends')]); }
/** @param friend - Current management snapshot. */
async function toggle(friend: ManagedFriend): Promise<void> {
  if (busy.value) return;
  busy.value = true; error.value = ''; notice.value = '';
  try {
    const { id, ...input } = friend;
    await mutate(`/api/owner/friends/${id}`, 'PUT', { ...input, visible: !friend.visible });
    await Promise.all([refresh(), refreshNuxtData('public-friends')]);
    notice.value = friend.visible ? t('已隐藏，仍可随时恢复。', 'Hidden. You can show it again anytime.') : t('已公开展示。', 'The link is now public.');
  } catch (cause: any) { error.value = cause.data?.message || t('操作未保存，请重试。', 'Could not save. Please retry.'); await refresh(); }
  finally { busy.value = false; }
}
/** Removes only the link and revision explicitly reviewed in the confirmation. */
async function remove(): Promise<void> {
  if (!deleting.value || busy.value) return;
  busy.value = true; error.value = ''; notice.value = '';
  try {
    await mutate(`/api/owner/friends/${deleting.value.id}`, 'DELETE', { version: deleting.value.version });
    deleting.value = null; await Promise.all([refresh(), refreshNuxtData('public-friends')]); notice.value = t('友链已删除。', 'Link deleted.');
  } catch (cause: any) { error.value = cause.data?.message || t('删除失败，请重试。', 'Could not delete. Please retry.'); await refresh(); }
  finally { busy.value = false; }
}
/** @param friend - Link to review. @param event - Opening action. */
function confirmDelete(friend: ManagedFriend, event: Event): void { trigger = event.currentTarget as HTMLElement; error.value = ''; deleting.value = friend; }
</script>
<template>
  <div class="friends-manager">
    <NuxtLink :to="localePath('/manage')" class="back-link"><QuireIcon name="arrowLeft" :size="16" />{{ t('创作管理', 'Manage') }}</NuxtLink>
    <div class="friends-manager-heading"><div><h1>{{ t('友链管理', 'Friend links') }}</h1><p>{{ t('把值得推荐的站点，留在这里。', 'Keep a place for sites worth recommending.') }}</p></div><NuxtLink :to="localePath('/friends')" class="text-link">{{ t('查看友链页', 'View page') }}<QuireIcon name="arrowUpRight" :size="16" /></NuxtLink></div>
    <div class="friends-manager-toolbar"><QuireButton id="add-friend" variant="solid" size="md" :disabled="busy" @click="edit(null, $event)"><template #leading><QuireIcon name="plus" /></template>{{ t('添加友链', 'Add link') }}</QuireButton><span>{{ t('按排序数字升序展示，隐藏的站点仅自己可见。', 'Ordered by ascending number. Hidden sites are only visible to you.') }}</span></div>
    <p v-if="notice" class="friends-manager-notice" role="status">{{ notice }}</p>
    <p v-if="error && !deleting" class="comment-error" role="alert">{{ error }}</p>
    <div v-if="loadError" class="friends-manager-empty" role="alert"><p>{{ t('友链暂时无法载入。', 'Links could not be loaded.') }}</p><QuireButton variant="outline" size="sm" @click="refresh()">{{ t('重试', 'Retry') }}</QuireButton></div>
    <div v-else-if="!friends?.length" class="friends-manager-empty"><QuireIcon name="link" :size="24" /><p>{{ t('还没有友链。从一个喜欢的站点开始。', 'No links yet. Start with a site you enjoy.') }}</p></div>
    <ol v-else class="friend-management-list">
      <li v-for="friend in friends" :key="friend.id">
        <span class="friend-position" :title="t('排序', 'Order')">{{ String(friend.position).padStart(2, '0') }}</span>
        <QuireAvatar :name="friend.name" :src="friend.iconUrl || undefined" :fallback="friend.name.slice(0,1)" shape="square" size="md" />
        <div class="friend-management-info"><div class="friend-management-title"><QuireButton variant="text" size="md" :disabled="busy" @click="edit(friend, $event)">{{ friend.name }}</QuireButton><span class="friend-visibility" :data-visible="friend.visible">{{ friend.visible ? t('公开', 'Public') : t('已隐藏', 'Hidden') }}</span></div><a :href="friend.url" target="_blank" rel="noopener noreferrer">{{ friendDomain(friend.url) }}<QuireIcon name="arrowUpRight" :size="12" /></a><p>{{ friend.description }}</p></div>
        <div class="friend-management-actions"><QuireButton variant="outline" size="sm" :disabled="busy" @click="edit(friend, $event)">{{ t('编辑', 'Edit') }}</QuireButton><QuireButton variant="text" size="sm" :disabled="busy" @click="toggle(friend)">{{ friend.visible ? t('隐藏', 'Hide') : t('显示', 'Show') }}</QuireButton><QuireButton variant="text" size="sm" :disabled="busy" @click="confirmDelete(friend, $event)">{{ t('删除', 'Delete') }}</QuireButton></div>
      </li>
    </ol>
    <FriendEditor v-model:open="editorOpen" :friend="editing" :return-focus="returnFocus" @saved="saved" @conflict="refresh()" />
    <QuireDialogRoot v-model:open="confirming" :final-focus-el="returnFocus" :close-on-escape="!busy" :close-on-interact-outside="!busy" role="alertdialog"><QuireDialogContent :title="t('删除这条友链？', 'Delete this link?')" :description="`${deleting?.name || ''} · ${t('删除后需要重新添加。如果只是暂时下架，可以选择隐藏。', 'You will need to add it again after deletion. Hide it instead if this is temporary.')}`" size="small" :busy="busy" :show-close="!busy" :error-text="error"><template #footer><QuireButton variant="text" size="md" :disabled="busy" @click="deleting = null">{{ t('取消', 'Cancel') }}</QuireButton><QuireButton variant="solid" size="md" :disabled="busy" @click="remove">{{ t('确认删除', 'Delete link') }}</QuireButton></template></QuireDialogContent></QuireDialogRoot>
  </div>
</template>
<style scoped src="../../assets/friends-manage.css"></style>
