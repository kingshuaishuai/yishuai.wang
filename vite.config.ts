import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { publicResources } from './tooling/public-resources.ts';

export default defineConfig({ plugins: [vue(), publicResources()] });
