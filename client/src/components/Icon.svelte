<script>
  import { ICONS } from '../lib/icons.js';
  let { name, cls = 'w-5 h-5', title = null } = $props();
</script>

<svg
  class={cls}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden={title ? undefined : true}
  {title}
>{@html ICONS[name] ?? ''}</svg>
