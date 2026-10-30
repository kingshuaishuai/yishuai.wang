import { defineEventHandler } from 'h3';
export default defineEventHandler(event => feedResponse(event, 'article'));
