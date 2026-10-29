import { defineEventHandler, getRouterParam } from 'h3';
import { getPost, draftView } from '../../../domain/posts';
export default defineEventHandler(async event => { await requireOwner(event); return draftView(await getPost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!)); });
