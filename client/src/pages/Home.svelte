<script>
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { api } from '../lib/api.js';
  import { fmtNum } from '../lib/util.js';

  let stats = $state(null);
  let decks = $state([]);
  let loading = $state(true);

  async function load() {
    try {
      [stats, decks] = await Promise.all([api.get('/api/stats'), api.get('/api/decks')]);
    } finally {
      loading = false;
    }
  }
  onMount(load);

  const tiles = $derived(
    stats
      ? [
          { label: 'Cards', value: stats.totalCards, icon: 'card', tone: 'text-indigo-400' },
          { label: 'Due now', value: stats.dueNow, icon: 'refresh', tone: 'text-amber-400' },
          { label: 'Reviewed today', value: stats.reviewedToday, icon: 'check', tone: 'text-emerald-400' },
          { label: 'Decks', value: stats.totalDecks, icon: 'layers', tone: 'text-sky-400' },
        ]
      : []
  );
</script>

<div class="space-y-6">
  <section class="card p-5 bg-gradient-to-br from-indigo-500/15 to-transparent">
    <p class="text-sm text-zinc-400">Ready to review?</p>
    <div class="mt-1 flex items-end justify-between gap-4">
      <div>
        <p class="text-4xl font-bold text-zinc-100">
          {#if stats !== null}
            {fmtNum(stats.dueNow)}
          {:else}
            …
          {/if}
        </p>
        <p class="text-sm text-zinc-400 mt-1">cards due right now</p>
      </div>
      <a href="#/study" class="btn btn-primary" class:opacity-40={stats ? stats.dueNow === 0 : true}>
        <Icon name="study" cls="w-4 h-4" />Study
      </a>
    </div>
  </section>

  <section class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {#each tiles as t (t.label)}
      <div class="card p-4">
        <div class="flex items-center gap-2 {t.tone}">
          <Icon name={t.icon} cls="w-4 h-4" />
          <span class="text-[11px] uppercase tracking-wide text-zinc-500">{t.label}</span>
        </div>
        <p class="mt-2 text-2xl font-semibold text-zinc-100">{fmtNum(t.value)}</p>
      </div>
    {/each}
  </section>

  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-zinc-300">Decks</h2>
      <a href="#/decks" class="text-xs text-indigo-400 hover:text-indigo-300">Manage</a>
    </div>
    {#if loading}
      <p class="text-zinc-600 text-sm py-6 text-center">Loading…</p>
    {:else if decks.length === 0}
      <div class="card p-6 text-center">
        <p class="text-zinc-400 text-sm">No decks yet.</p>
        <a href="#/decks" class="btn btn-primary mt-3"><Icon name="plus" cls="w-4 h-4" />Create a deck</a>
      </div>
    {:else}
      <div class="grid sm:grid-cols-2 gap-3">
        {#each decks as d (d.id)}
          <a href="#/deck/{d.id}" class="card p-4 flex items-center gap-3 hover:ring-indigo-500/40 transition-all">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{d.color}"></span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-zinc-100 truncate">{d.name}</p>
              <p class="text-xs text-zinc-500">{fmtNum(d.card_count)} cards</p>
            </div>
            {#if d.due_count > 0}
              <span class="chip bg-amber-500/10 text-amber-300 ring-amber-500/30">{d.due_count} due</span>
            {:else}
              <span class="chip bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">up to date</span>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>
