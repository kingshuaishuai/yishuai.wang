import { ref } from 'vue';

/** Reads the fragment without treating article heading fragments as routes.
 * @returns Current local preview route.
 */
function currentPath(): string {
  return window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '/';
}

export const route = ref(currentPath());

/** Applies browser history navigation and returns reading to the page start. */
function synchronizeRoute(): void {
  route.value = currentPath();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', synchronizeRoute);
