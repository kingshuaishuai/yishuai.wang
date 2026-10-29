export default defineNuxtConfig({
  compatibilityDate: '2026-10-29',
  build: { transpile: [/@quirekit\//, 'katex', '@ark-ui/vue'] },
  devtools: { enabled: false },
  sourcemap: { client: false, server: false },
  css: ['@quirekit/unocss-preset/quirekit.css', '@quirekit/incremark/styles.css',
    '~/assets/base.css', '~/assets/home.css', '~/assets/content.css', '~/assets/account.css',
    '~/assets/comments.css', '~/assets/ink.css', '~/assets/manage.css'],
  runtimeConfig: {
    ownerGithubId: '', githubClientId: '', githubClientSecret: '',
    indieauthTokenEndpoint: '', indieauthAuthorizationEndpoint: '',
    indieauthIntrospectionEndpoint: '', indieauthIntrospectionAuthorization: '',
    public: { siteUrl: 'https://yishuai.wang', indexable: false },
  },
  app: { head: {
    htmlAttrs: { lang: 'zh-CN', 'data-qk-theme': 'precision', 'data-qk-scheme': 'light', class: 'qk-scrollbars' },
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
    },
  },
  vite: { $server: { resolve: { noExternal: [/@quirekit\//, /katex/] } }, optimizeDeps: { include: ['@quirekit/ui', '@quirekit/ui/vue', '@quirekit/incremark/vue', '@quirekit/md-editor/vue', '@quirekit/msfe-core', '@quirekit/msfe-starter-kit', '@quirekit/msfe-vue', '@quirekit/cm-state', '@quirekit/cm-view', '@quirekit/inkwash', '@quirekit/inkwash/vue', 'uuid'] }, resolve: { dedupe: ['vue', '@quirekit/cm-state', '@quirekit/cm-view'] },
    ssr: { noExternal: [/^@quirekit\//, '@ark-ui/vue', 'katex'] },
  },
});
