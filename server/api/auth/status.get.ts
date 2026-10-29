import { defineEventHandler } from 'h3';
export default defineEventHandler(event => { const config = useRuntimeConfig(event); return { github: !!config.githubClientId && !!config.githubClientSecret }; });
