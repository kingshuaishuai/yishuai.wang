import { createApp } from 'vue';
import '@quirekit/unocss-preset/quirekit.css';
import '@quirekit/incremark/styles.css';
import './styles/base.css';
import './styles/home.css';
import './styles/content.css';
import './styles/account.css';
import './styles/comments.css';
import App from './App.vue';

createApp(App).mount('#app');
