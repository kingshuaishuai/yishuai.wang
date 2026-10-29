import { defineEventHandler } from 'h3';
import { profile } from '../domain/avatars';

export default defineEventHandler(event => profile(bindings(event), String(useRuntimeConfig(event).ownerGithubId)));
