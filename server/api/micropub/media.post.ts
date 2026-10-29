import { defineEventHandler, getHeader, setHeader, setResponseStatus } from 'h3';
import { authorize, requireScope } from '../../micropub/auth';
import { errorResponse, mpError } from '../../micropub/errors';
import { storeImage } from '../../domain/media';
export default defineEventHandler(async event => {
  try {
    const scopes = await authorize(event); requireScope(scopes, scopes.has('media') ? 'media' : 'create');
    await rateLimit(event, 'micropub-media', 30, 600);
    const bytes = await readBytes(event, 9 * 1024 * 1024);
    const form = await new Request('http://local/upload', { method: 'POST', body: bytes as BodyInit, headers: { 'Content-Type': getHeader(event, 'content-type') || '' } }).formData();
    const file = form.get('file'); if (!(file instanceof File)) throw mpError(400, 'The file field is required.');
    const url = await storeImage(bindings(event), file);
    setHeader(event, 'Location', siteOrigin(event) + url); setResponseStatus(event, 201); return '';
  } catch (error) { return errorResponse(event, error); }
});
