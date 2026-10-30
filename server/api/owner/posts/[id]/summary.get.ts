import { defineEventHandler, getRouterParam } from 'h3';
import { getPost } from '../../../../domain/posts';
import { summaryStatus } from '../../../../domain/ai/read';
export default defineEventHandler(async event => {
  await requireOwner(event);
  const db = bindings(event).BLOG_DB;
  return summaryStatus(db, await getPost(db, getRouterParam(event, 'id')!));
});
