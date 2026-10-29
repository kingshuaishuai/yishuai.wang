import { defineEventHandler, sendNoContent, setHeaders } from 'h3';

/** Allow browser Micropub clients to send bearer tokens and read creation URLs. */
export default defineEventHandler(event => {
  const path = event.path.split('?')[0];
  if (path !== '/api/micropub' && !path?.startsWith('/api/micropub/')) return;
  setHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'Location, Link',
    'Access-Control-Max-Age': '600',
  });
  if (event.method === 'OPTIONS') return sendNoContent(event);
});
