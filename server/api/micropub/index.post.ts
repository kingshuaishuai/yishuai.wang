import { defineEventHandler, setHeader, setResponseStatus } from 'h3';
import { postPath } from '../../../shared/language';
import { input } from '../../micropub/input';
import { authorize, requireScope } from '../../micropub/auth';
import { errorResponse, mpError } from '../../micropub/errors';
import { fromProperties, sourceProperties, updateProperties } from '../../micropub/content';
import { postFromUrl, updatePost } from '../../micropub/posts';
import { createPost, draftView, transitionPost } from '../../domain/posts';
import { canPublish } from '../../domain/content';
export default defineEventHandler(async event => {
  try {
    const data = await input(event), scopes = await authorize(event, data.accessToken), db = bindings(event).BLOG_DB, origin = siteOrigin(event);
    const action = data.action || 'create';
    if (!['create','update','delete','undelete'].includes(action)) throw mpError(400, 'Unsupported action.');
    requireScope(scopes, action);
    await rateLimit(event, 'micropub', 60, 600);
    if (action === 'create') {
      if (data.type && !data.type.includes('h-entry')) throw mpError(400, 'Only h-entry is supported.');
      const properties = data.properties || {}, content = fromProperties(properties), publish = properties['post-status']?.[0] !== 'draft';
      if (publish && !canPublish(content)) throw mpError(400, 'Content is required.');
      let post = await createPost(db, String(useRuntimeConfig(event).ownerGithubId), content, data.slug || (typeof properties['mp-slug']?.[0] === 'string' ? properties['mp-slug'][0] : undefined));
      if (publish) post = await transitionPost(db, post.id, post.version, 'publish');
      setHeader(event, 'Location', origin + postPath(post));
      setResponseStatus(event, 201); return '';
    }
    const row = await postFromUrl(db, data.url, origin);
    if (action === 'update') {
      if (!data.replace && !data.add && !data.delete) throw mpError(400, 'Provide replace, add or delete properties.');
      const properties = updateProperties(sourceProperties(draftView(row)), data);
      await updatePost(db, row, fromProperties(properties, row.kind), properties['post-status']?.[0] !== 'draft');
    } else await transitionPost(db, row.id, row.version, action === 'delete' ? 'delete' : 'restore');
    setResponseStatus(event, 204); return '';
  } catch (error) { return errorResponse(event, error); }
});
