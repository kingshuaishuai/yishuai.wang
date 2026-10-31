export default defineNuxtConfig({
  compatibilityDate: '2026-10-29',
  // Production builds must not overwrite Vite's live development files.
  $production: { buildDir: '.nuxt-production' },
  build: { transpile: [/@quirekit\//, /^@lezer\//, 'katex', '@ark-ui/vue'] },
  devtools: { enabled: false },
  hooks: {
    'pages:extend'(pages) {
      // Both languages share components; URL identity keeps SSR and navigation deterministic.
      const originals = [...pages];
      pages.push(...originals.map(page => ({ ...page, name: `en-${page.name}`, path: `/en${page.path === '/' ? '' : page.path}` })));
    },
  },
  sourcemap: { client: false, server: false },
  css: ['@quirekit/unocss-preset/quirekit.css', '@quirekit/incremark/styles.css',
    '~/assets/base.css', '~/assets/home.css', '~/assets/content.css', '~/assets/account.css',
    '~/assets/comments.css', '~/assets/ink.css', '~/assets/manage.css', '~/assets/code.css'],
  runtimeConfig: {
    ownerGithubId: '', githubClientId: '', githubClientSecret: '', aiSettingsSecret: '',
    indieauthTokenEndpoint: '', indieauthAuthorizationEndpoint: '',
    indieauthIntrospectionEndpoint: '', indieauthIntrospectionAuthorization: '',
    public: { siteUrl: 'https://yishuai.wang', indexable: false, friendRequestEmail: 'kwyishuai@163.com' },
  },
  app: { head: {
    htmlAttrs: { lang: 'zh-CN', 'data-qk-theme': 'ink', 'data-qk-scheme': 'light', class: 'qk-scrollbars' },
    viewport: 'width=device-width, initial-scale=1',
    link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  } },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: { deployConfig: true, nodeCompat: true },
    routeRules: {
      '/api/**': { headers: { 'cache-control': 'private, no-store' } },
      '/write/**': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/manage/**': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/login': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/analytics': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/en/analytics': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/account': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/en/write/**': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/en/manage/**': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/en/login': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
      '/en/account': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
    },
  },
  // Lezer's node properties must share one runtime across language parsers and SSR highlighting.
  vite: { $server: { resolve: { noExternal: [/@quirekit\//, /^@lezer\//, /katex/] } }, optimizeDeps: { include: ['@lezer/highlight', '@quirekit/cm-language', '@quirekit/md-editor', '@quirekit/ui', '@quirekit/ui/vue', '@quirekit/incremark/vue', '@quirekit/md-editor/vue', '@quirekit/msfe-core', '@quirekit/msfe-starter-kit', '@quirekit/msfe-vue', '@quirekit/cm-state', '@quirekit/cm-view', '@quirekit/inkwash', '@quirekit/inkwash/vue', 'uuid'] }, resolve: { dedupe: ['vue', '@quirekit/cm-state', '@quirekit/cm-view', '@lezer/common', '@lezer/highlight', '@lezer/lr'] },
    ssr: { noExternal: [/^@quirekit\//, /^@lezer\//, '@ark-ui/vue', 'katex'] },
  },
});
