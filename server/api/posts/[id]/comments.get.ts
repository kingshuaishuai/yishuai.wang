import { defineEventHandler, getRouterParam } from 'h3';
import { listComments } from '../../../domain/comments';
export default defineEventHandler(event => listComments(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, String(useRuntimeConfig(event).ownerGithubId)));
