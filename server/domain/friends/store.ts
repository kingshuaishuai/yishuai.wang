import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import type { D1Database } from '@cloudflare/workers-types';
import type { FriendInput, FriendLink, ManagedFriend } from '../../../shared/friends';

const publicColumns = 'id,name,url,description,description_en AS descriptionEn,icon_url AS iconUrl';
const managedColumns = publicColumns + ',position,visible,version';
const order = 'ORDER BY position,created_at,id';

/** @param db - Bound database. @returns Visible recommendations, without private management fields. */
export async function publicFriends(db: D1Database): Promise<FriendLink[]> {
  return (await db.prepare(`SELECT ${publicColumns} FROM friend_links WHERE visible=1 ${order}`).all<FriendLink>()).results;
}

/** @param db - Bound database. @returns All recommendations in their public display order. */
export async function managedFriends(db: D1Database): Promise<ManagedFriend[]> {
  const rows = (await db.prepare(`SELECT ${managedColumns} FROM friend_links ${order}`).all<ManagedFriend>()).results;
  return rows.map(row => ({ ...row, visible: !!row.visible }));
}

/** @param db - Bound database. @param id - Link identity. @returns Current management snapshot. */
async function getFriend(db: D1Database, id: string): Promise<ManagedFriend> {
  const row = await db.prepare(`SELECT ${managedColumns} FROM friend_links WHERE id=?`).bind(id).first<ManagedFriend>();
  if (!row) throw createError({ statusCode: 404, message: '这条友链已不存在。' });
  return { ...row, visible: !!row.visible };
}

/** @param error - Database failure. Converts only the known duplicate constraint into a useful conflict. */
function handleConflict(error: unknown): never {
  if (String(error).includes('UNIQUE constraint failed: friend_links.url')) {
    throw createError({ statusCode: 409, message: '这个站点已经添加过了，请编辑已有友链。' });
  }
  throw error;
}

/** @param db - Bound database. @param input - Validated fields. @returns Persisted link with revision. */
export async function createFriend(db: D1Database, input: FriendInput): Promise<ManagedFriend> {
  const id = uuid(), now = new Date().toISOString();
  try {
    await db.prepare('INSERT INTO friend_links(id,name,url,description,description_en,icon_url,position,visible,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(id, input.name, input.url, input.description, input.descriptionEn, input.iconUrl, input.position, Number(input.visible), now, now).run();
  } catch (error) { handleConflict(error); }
  return getFriend(db, id);
}

/** @param db - Bound database. @param id - Link identity. @param version - Expected revision. @param input - Validated replacement. @returns Updated snapshot. */
export async function updateFriend(db: D1Database, id: string, version: number, input: FriendInput): Promise<ManagedFriend> {
  let changes: number;
  try {
    const result = await db.prepare('UPDATE friend_links SET name=?,url=?,description=?,description_en=?,icon_url=?,position=?,visible=?,version=version+1,updated_at=? WHERE id=? AND version=?')
      .bind(input.name, input.url, input.description, input.descriptionEn, input.iconUrl, input.position, Number(input.visible), new Date().toISOString(), id, version).run();
    changes = result.meta.changes;
  } catch (error) { handleConflict(error); }
  if (!changes) {
    await getFriend(db, id);
    throw createError({ statusCode: 409, message: '友链已在别处更新，请关闭后重新打开编辑。' });
  }
  return getFriend(db, id);
}

/** @param db - Bound database. @param id - Confirmed link identity. @param version - Revision the author reviewed. */
export async function deleteFriend(db: D1Database, id: string, version: number): Promise<void> {
  const result = await db.prepare('DELETE FROM friend_links WHERE id=? AND version=?').bind(id, version).run();
  if (!result.meta.changes) {
    await getFriend(db, id);
    throw createError({ statusCode: 409, message: '友链已在别处更新，请刷新后重试。' });
  }
}
