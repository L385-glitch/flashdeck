<script>
  import Icon from '../components/Icon.svelte';
  import SideNav from '../components/SideNav.svelte';
  import { api } from '../lib/api.js';
  import Home from './Home.svelte';
  import Decks from './Decks.svelte';
  import DeckDetail from './DeckDetail.svelte';
  import Study from './Study.svelte';

  let { route } = $props();

  let counts = $state({ decks: 0, study: 0 });
  let theme = $state(localStorage.getItem('flashdeck-theme') === 'light' ? 'light' : 'dark');
  let navMode = $state(localStorage.getItem('flashdeck-nav') === 'sidebar' ? 'sidebar' : 'bottom');
  let drawerOpen = $state(false);

  function toggleNavMode() {
    navMode = navMode === 'bottom' ? 'sidebar' : 'bottom';
    drawerOpen = false;
    try {
      localStorage.setItem('flashdeck-nav', navMode);
    } catch {
      /* ignore */
    }
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', theme === 'light');
    try {
      localStorage.setItem('flashdeck-theme', theme);
    } catch {
      /* ignore */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#ffffff' : '#09090b';
  }

  async function loadCounts() {
    try {
      const [decks, stats] = await Promise.all([api.get('/api/decks'), api.get('/api/stats')]);
      counts = { decks: decks.length, study: stats.dueNow };
    } catch {
      /* ignore */
    }
  }

  loadCounts();
  $effect(() => {
    route.page;
    route.id;
    loadCounts();
  });
</script>

<div class="min-h-screen flex">
  <aside class="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-950/60 p-4 sticky top-0 h-screen">
    <SideNav page={route.page} counts={counts} theme={theme} onThemeToggle={toggleTheme} />
  </aside>

  <div class="flex-1 min-w-0 flex flex-col">
    {#if navMode === 'sidebar'}
      <div
        class="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur px-3 py-2"
        style="padding-top: calc(env(safe-area-inset-top, 0px) + 0.5rem)"
      >
        <button
          type="button"
          aria-label="Open menu"
          onclick={() => (drawerOpen = true)}
          class="rounded-lg p-1.5 text-zinc-300 hover:bg-zinc-800/70"
        >
          <Icon name="menu" cls="w-5 h-5" />
        </button>
        <span class="font-semibold text-zinc-100 tracking-tight">Flashdeck</span>
      </div>
    {/if}

    <main
      class="flex-1 max-w-[calc(50%_+_36rem)] w-full mx-auto {navMode === 'sidebar'
        ? 'p-4 md:p-8'
        : 'p-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] md:p-8'}"
    >
      {#key route.page + (route.id || '') + (route.query?.deck || '')}
        {#if route.page === 'home'}
          <Home />
        {:else if route.page === 'decks'}
          <Decks />
        {:else if route.page === 'deck'}
          <DeckDetail id={route.id} />
        {:else if route.page === 'study'}
          <Study deckFilter={route.query?.deck || ''} />
        {:else}
          <Home />
        {/if}
      {/key}
    </main>

    {#if navMode === 'bottom'}
      <nav
        class="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-center gap-1 overflow-x-auto border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
      >
        {#each ['home', 'decks', 'study'] as id (id)}
          <a
            href="#/{id}"
            class="shrink-0 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium {route.page === id
              || (id === 'decks' && route.page === 'deck')
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-400'}"
          >
            <Icon name={id === 'home' ? 'home' : id === 'decks' ? 'layers' : 'study'} cls="w-4 h-4" />{id[0].toUpperCase() + id.slice(1)}
          </a>
        {/each}
        <button
          type="button"
          aria-label="Use sidebar"
          onclick={toggleNavMode}
          class="shrink-0 flex items-center rounded-lg px-2.5 py-2 text-zinc-400"
        >
          <Icon name="panelLeft" cls="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Toggle theme"
          onclick={toggleTheme}
          class="shrink-0 flex items-center rounded-lg px-2.5 py-2 text-zinc-400"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} cls="w-4 h-4" />
        </button>
      </nav>
    {/if}
  </div>

  {#if navMode === 'sidebar' && drawerOpen}
    <div class="md:hidden fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close menu"
        class="absolute inset-0 bg-black/60 cursor-pointer"
        onclick={() => (drawerOpen = false)}
      ></button>
      <aside
        class="absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col overflow-y-auto border-r border-zinc-800/60 bg-zinc-950 p-4"
        style="padding-top: calc(env(safe-area-inset-top, 0px) + 1rem); padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem)"
      >
        <SideNav
          page={route.page}
          counts={counts}
          theme={theme}
          onThemeToggle={toggleTheme}
          navMode={navMode}
          onNavModeToggle={toggleNavMode}
          onNavigate={() => (drawerOpen = false)}
        />
      </aside>
    </div>
  {/if}
</div>
