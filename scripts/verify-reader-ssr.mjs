import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

assert.equal(typeof window, 'undefined', 'The probe must run without window.');
assert.equal(typeof document, 'undefined', 'The probe must run without document.');

// Process the package's CSS imports through the application bundler, as an SSR
// framework would. Vue stays external so its Node entry keeps CommonJS support.
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  ssr: { noExternal: [/^@quirekit\//, 'katex'] },
});

try {
  const { renderReaderFixture } = await server.ssrLoadModule('/verification/reader-ssr-entry.ts');
  const html = await renderReaderFixture();

  assert.match(html, /<h1\b[^>]*>[\s\S]*?服务端可读标题[\s\S]*?<\/h1>/);
  assert.match(html, /<p\b[^>]*>[\s\S]*?这是服务端直接生成的正文。/);
  assert.match(html, /<a\b[^>]*href="\/articles\/second-post"/);
  assert.match(html, /<h2\b[^>]*>[\s\S]*?小节标题[\s\S]*?<\/h2>/);
  assert.match(html, /<pre\b[\s\S]*?const answer = 42;/);
  assert.match(html, /<table\b[\s\S]*?内容一[\s\S]*?<\/table>/);

  console.log(`Reader SSR passed: headings, paragraph, link, code and table (${Buffer.byteLength(html)} bytes).`);
  console.log('Scope: published component under Node + Vite SSR; Nuxt production and Workers remain to be verified.');
} finally {
  await server.close();
}
