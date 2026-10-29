import { defineEventHandler, getQuery } from 'h3';
import { authorize, requireScope } from '../../micropub/auth';
import { errorResponse, mpError } from '../../micropub/errors';
import { postFromUrl } from '../../micropub/posts';
import { sourceProperties } from '../../micropub/content';
import { draftView } from '../../domain/posts';
export default defineEventHandler(async event => {
  try {
    const scopes = await authorize(event); const query = getQuery(event), origin = siteOrigin(event);
    if (query.q === 'config') return { 'media-endpoint': origin + '/api/micropub/media', 'syndicate-to': [], 'post-types': [{ type: 'article', name: '文章' }, { type: 'note', name: '短记' }, { type: 'photo', name: '照片' }] };
    if (query.q === 'syndicate-to') return { 'syndicate-to': [] };
    if (query.q === 'source') {
      requireScope(scopes, 'update');
      const properties = sourceProperties(draftView(await postFromUrl(bindings(event).BLOG_DB, query.url, origin)));
      const requested = query['properties[]'] ?? query.properties;
      if (requested) { const keys = Array.isArray(requested) ? requested : [requested]; return { properties: Object.fromEntries(keys.filter((key): key is string => typeof key === 'string').filter(key => key in properties).map(key => [key, properties[key]])) }; }
      return { type: ['h-entry'], properties };
    }
    throw mpError(400, 'Unsupported query.');
  } catch (error) { return errorResponse(event, error); }
});
