import { mount } from 'svelte';
import App from './App.svelte';
import './index.css';

// iOS Safari: block pinch-to-zoom gestures (viewport meta alone is not enough)
document.addEventListener('gesturestart', (e) => e.preventDefault());

export default mount(App, {
  target: document.getElementById('app'),
});
