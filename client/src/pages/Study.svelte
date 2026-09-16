<script>
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { api } from '../lib/api.js';
  import { fmtInterval } from '../lib/util.js';

  let { deckFilter = '' } = $props();

  let decks = $state([]);
  let queue = $state([]);
  let idx = $state(0);
  let revealed = $state(false);
  let busy = $state(false);
  let loading = $state(true);

  const current = $derived(queue[idx] || null);
  const total = $derived(queue.length);
  const progress = $derived(total ? Math.round((idx / total) * 100) : 0);

  async function load() {
    loading = true;
    try {
      decks = await api.get('/api/decks');
      await loadQueue();
    } finally {
      loading = false;
    }
  }

  async function loadQueue() {
    const q = deckFilter ? `?deck_id=${deckFilter}` : '';
    queue = await api.get(`/api/study/queue${q}`);
    idx = 0;
    revealed = false;
  }

  onMount(load);

  function setFilter(value) {
    window.location.hash = value ? `#/study?deck=${value}` : '#/study';
  }

  async function rate(rating) {
    if (!current || busy) return;
    busy = true;
    try {
      await api.post('/api/study/review', { card_id: current.id, rating });
      idx += 1;
      revealed = false;
    } finally {
      busy = false;
    }
  }

  const RATINGS = [
    { r: 0, label: 'Again', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30 hover:bg-rose-500/25' },
    { r: 1, label: 'Hard', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30 hover:bg-amber-500/25' },
    { r: 2, label: 'Good', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/25' },
    { r: 3, label: 'Easy', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30 hover:bg-sky-500/25' },
  ];
</script>

<div class="space-y-4">
  <header class="flex items-center justify-between gap-3">
    <h1 class="text-xl font-semibold text-zinc-100">Study</h1>
    <select class="input max-w-[180px]" value={deckFilter} onchange={(e) => setFilter(e.target.value)}>
      <option value="">All decks</option>
      {#each decks as d (d.id)}
        <option value={d.id}>{d.name}</option>
      {/each}
    </select>
  </header>

  {#if loading}
    <p class="text-zinc-600 text-sm py-8 text-center">Loading…</p>
  {:else if total === 0}
    <div class="card p-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 grid place-items-center text-emerald-400">
        <Icon name="check" cls="w-6 h-6" />
      </div>
      <p class="mt-3 text-zinc-200 font-medium">All caught up</p>
      <p class="text-sm text-zinc-500 mt-1">No cards are due right now.</p>
      <a href="#/decks" class="btn btn-ghost mt-4"><Icon name="layers" cls="w-4 h-4" />Browse decks</a>
    </div>
  {:else}
    <div>
      <div class="flex items-center justify-between text-xs text-zinc-500 mb-2">
        <span>Card {idx + 1} of {total}</span>
        <span>{progress}%</span>
      </div>
      <div class="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div class="h-full bg-indigo-500 transition-all" style="width:{progress}%"></div>
      </div>
    </div>

    <div class="card p-6 min-h-[220px] flex flex-col">
      {#if current}
        {#if current.tags}
          <div class="flex flex-wrap gap-1.5 mb-3">
            {#each current.tags.split(',').map((t) => t.trim()).filter(Boolean) as tag (tag)}
              <span class="chip bg-indigo-500/10 text-indigo-300 ring-indigo-500/30">{tag}</span>
            {/each}
          </div>
        {/if}
        <p class="text-lg text-zinc-100 leading-relaxed flex-1">{current.front}</p>

        {#if revealed}
          <div class="mt-4 pt-4 border-t border-zinc-800/70">
            <p class="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Answer</p>
            <p class="text-base text-zinc-200 whitespace-pre-wrap">{current.back || '—'}</p>
            {#if current.extra}<p class="text-sm text-zinc-500 mt-2 whitespace-pre-wrap">{current.extra}</p>{/if}
          </div>
        {/if}
      {/if}
    </div>

    {#if revealed}
      <div class="grid grid-cols-4 gap-2">
        {#each RATINGS as btn (btn.r)}
          <button class="btn {btn.cls} ring-1 flex-col gap-1 py-3" onclick={() => rate(btn.r)} disabled={busy}>
            <span class="font-semibold">{btn.label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <button class="btn btn-primary w-full py-3" onclick={() => (revealed = true)}>Show answer</button>
    {/if}
  {/if}
</div>
