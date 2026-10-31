import { readFile, readdir } from 'node:fs/promises';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import type { Bindings } from '../../server/domain/types';

/** @returns An isolated real D1-compatible database with every committed migration applied. */
export async function testDatabase(): Promise<PlatformProxy<Bindings>> {
  const platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../../migrations/', import.meta.url))).filter(file => file.endsWith('.sql')).sort()) {
    const schema = await readFile(new URL('../../migrations/' + file, import.meta.url), 'utf8');
    for (const sql of schema.split(';').map(value => value.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  return platform;
}
