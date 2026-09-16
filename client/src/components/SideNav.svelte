<script>
  import Icon from './Icon.svelte';
  import { NAV } from '../lib/nav.js';

  let { page, counts, theme, onThemeToggle, navMode = null, onNavModeToggle = null, onNavigate = null } = $props();
</script>

<a href="#/home" class="flex items-center gap-2.5 px-2 mb-8" onclick={onNavigate}>
  <div class="w-9 h-9 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/40 grid place-items-center text-indigo-400">
    <Icon name="card" cls="w-5 h-5" />
  </div>
  <span class="font-semibold text-zinc-100 tracking-tight">Flashdeck</span>
</a>

<nav class="flex flex-col gap-0.5 flex-1">
  {#each NAV as item (item.id)}
    <a
      href="#/{item.id}"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {page === item.id
        || (item.id === 'decks' && page === 'deck')
        ? 'bg-zinc-800/70 text-zinc-100'
        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}"
      onclick={onNavigate}
    >
      <Icon name={item.icon} cls="w-[18px] h-[18px]" />
      <span class="flex-1">{item.label}</span>
      {#if counts[item.id] > 0}
        <span class="text-[11px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">{counts[item.id]}</span>
      {/if}
    </a>
  {/each}
</nav>

<div class="flex flex-col gap-0.5 border-t border-zinc-800/60 pt-3 mt-3">
  {#if navMode}
    <button
      type="button"
      onclick={onNavModeToggle}
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
    >
      <Icon name={navMode === 'sidebar' ? 'panelBottom' : 'panelLeft'} cls="w-[18px] h-[18px]" />
      {navMode === 'sidebar' ? 'Bottom tabs' : 'Sidebar'}
    </button>
  {/if}
  <button
    type="button"
    role="switch"
    aria-checked={theme === 'light'}
    aria-label="Appearance"
    onclick={onThemeToggle}
    class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer"
  >
    <Icon name={theme === 'dark' ? 'sun' : 'moon'} cls="w-[18px] h-[18px] shrink-0" />
    <span class="flex-1 text-left">Appearance</span>
    <span
      class="relative h-5 w-9 shrink-0 rounded-full ring-1 transition-colors {theme === 'light'
        ? 'bg-indigo-500/80 ring-indigo-500'
        : 'bg-zinc-800 ring-zinc-700'}"
    >
      <span
        class="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white transition-all {theme === 'light'
          ? 'left-[18px]'
          : 'left-0.5'}"
      ></span>
    </span>
  </button>
</div>
