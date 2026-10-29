import { access, cp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createServer } from 'node:net';

// Serve a completed snapshot so the next build cannot remove live Worker files.
await access('.output/server/wrangler.json');
// A second preview command must not replace the first one's live snapshot.
await new Promise<void>((resolvePort, reject) => {
  const probe = createServer();
  probe.once('error', () => reject(new Error('3288 已在使用，请先停止已有预览服务。')));
  probe.listen(3288, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolvePort()));
});
await rm('.preview', { recursive: true, force: true });
await cp('.output', '.preview', { recursive: true });
const envArgs: string[] = [];
try { await access('.env'); envArgs.push('--env-file', resolve('.env')); } catch { /* Runtime bindings may come from the process environment. */ }
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', '.preview/server/wrangler.json', '--persist-to', resolve('.wrangler/state'), '--ip', '127.0.0.1', '--port', '3288', ...envArgs], { stdio: 'inherit' });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', code => { process.exitCode = code ?? 1; });
