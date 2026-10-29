import { computed, ref } from 'vue';
import type { PreviewRole } from './types';

const key = 'yishuai-preview-role';
/** Restores only a clearly labelled local preview identity. @returns Valid preview role. */
function restoreRole(): PreviewRole {
  try {
    const saved = sessionStorage.getItem(key);
    return saved === 'owner' || saved === 'reader' ? saved : 'guest';
  } catch { return 'guest'; }
}
export const previewRole = ref<PreviewRole>(restoreRole());
export const previewName = computed(() => previewRole.value === 'owner' ? 'Yishuai' : '读者');
export const loginReturnPath = ref('/');
export const resumeComment = ref('');

/** Changes local presentation only; production authorization belongs on the server.
 * @param role - Identity to preview.
 */
export function setPreviewRole(role: PreviewRole): void {
  previewRole.value = role;
  try { sessionStorage.setItem(key, role); } catch { /* Keep the in-memory preview usable. */ }
}

/** Opens the account design while preserving the current writing or reading task.
 * @param path - Local route to resume after selecting a preview identity.
 */
export function openLogin(path: string): void {
  loginReturnPath.value = path.startsWith('/') && path !== '/login' ? path : '/';
  window.location.hash = '/login';
}
