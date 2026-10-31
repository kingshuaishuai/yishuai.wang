import { defineEventHandler, setHeader } from 'h3';
import { publicFriends } from '../domain/friends/store';
import { bindings } from '../utils/bindings';

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store');
  return publicFriends(bindings(event).BLOG_DB);
});
