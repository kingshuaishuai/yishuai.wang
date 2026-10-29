import { defineEventHandler, getRouterParam } from 'h3';
import { getPublicPost } from '../../domain/posts';
export default defineEventHandler(event => getPublicPost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, 'note'));
