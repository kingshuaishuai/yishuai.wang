import { defineEventHandler, getHeader, createError } from 'h3';
import { storeImage } from '../../domain/media';
export default defineEventHandler(async event => {
  await requireOwner(event, true);
  await rateLimit(event, 'image', 30, 600);
  const bytes = await readBytes(event, 9 * 1024 * 1024);
  let form: FormData;
  try { form = await new Request('http://local/upload', { method: 'POST', headers: { 'Content-Type': getHeader(event, 'content-type') || '' }, body: bytes as BodyInit }).formData(); }
  catch { throw createError({ statusCode: 400, message: '上传格式无效。' }); }
  const file = form.get('file'), postId = form.get('postId');
  if (!(file instanceof File)) throw createError({ statusCode: 400, message: '请选择一张图片。' });
  return { url: await storeImage(bindings(event), file, typeof postId === 'string' ? postId : undefined) };
});
