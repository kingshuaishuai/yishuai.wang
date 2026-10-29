import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { createPublicResources } from '../src/publication/resources.ts';

/**
 * Serve the generated representations without the SPA HTML fallback.
 * @param server - Development or built-preview server.
 */
function serveResources(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use((request, response, next) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    const resource = createPublicResources().find(item => item.path === path);
    if (!resource) {
      if (path.startsWith('/articles/') && path.endsWith('.md')) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Article not found');
        return;
      }
      next();
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const links = ['</llms.txt>; rel="describedby"'];
    if (resource.canonical) links.push(`<${resource.canonical}>; rel="canonical"`);
    response.writeHead(200, { 'Content-Type': resource.contentType, 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex', Link: links.join(', ') });
    response.end(request.method === 'HEAD' ? undefined : resource.body);
  });
}

/**
 * Emit real RSS and Markdown resources beside the design build.
 * @returns Vite plugin with matching development, preview and output behavior.
 */
export function publicResources(): Plugin {
  return {
    name: 'blog-public-resources',
    configureServer: serveResources,
    configurePreviewServer: serveResources,
    generateBundle() {
      for (const resource of createPublicResources()) {
        this.emitFile({ type: 'asset', fileName: resource.path.slice(1), source: resource.body });
      }
    },
  };
}
