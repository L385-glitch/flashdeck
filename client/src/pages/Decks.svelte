<script>
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { api } from '../lib/api.js';
  import { fmtNum } from '../lib/util.js';

  let decks = $state([]);
  let loading = $state(true);
  let creating = $state(false);
  let name = $state('');
  let description = $state('');
  let saving = $state(false);
  let error = $state('');

  async function load() {
    try {
      decks = await api.get('/api/decks');
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function create() {
    if (!name.trim()) return;
    saving = true;
    error = '';
    try {
      const d = await api.post('/api/decks', { name: name.trim(), description: description.trim() });
      decks = [d, ...decks];
      name = '';
      description = '';
      creating = false;
      window.location.hash = `#/deck/${d.id}`;
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
</script>

<div class="space-y-4">
  <header class="flex items-center justify-between">
    <h1 class="text-xl font-semibold text-zinc-100">Decks</h1>
    <button class="btn btn-primary" onclick={() => (creating = !creating)}>
      <Icon name="plus" cls="w-4 h-4" />New deck
    </button>
  </header>

  {#if creating}
    <div class="card p-4 space-y-2">
      <input
        class="input w-full"
        placeholder="Deck name (e.g. Spanish, Organic Chemistry)"
        bind:value={name}
        onkeydown={(e) => e.key === 'Enter' && create()}
      />
      <input class="input w-full" placeholder="Description (optional)" bind:value={description} />
      {#if error}<p class="text-xs text-rose-400">{error}</p>{/if}
      <div class="flex gap-2 justify-end">
        <button class="btn btn-ghost" onclick={() => (creating = false)}>Cancel</button>
        <button class="btn btn-primary" onclick={create} disabled={saving || !name.trim()}>
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="text-zinc-600 text-sm py-8 text-center">Loading…</p>
  {:else if decks.length === 0}
    <div class="card p-8 text-center">
      <p class="text-zinc-400 text-sm">No decks yet. Create one, or import a CSV.</p>
    </div>
  {:else}
    <div class="space-y-2">
      {#each decks as d (d.id)}
        <a href="#/deck/{d.id}" class="card p-4 flex items-center gap-3 hover:ring-indigo-500/40 transition-all">
          <span class="w-3 h-3 rounded-full shrink-0" style="background:{d.color}"></span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-zinc-100 truncate">{d.name}</p>
            {#if d.description}<p class="text-xs text-zinc-500 truncate">{d.description}</p>{/if}
          </div>
          <span class="text-xs text-zinc-500 shrink-0">{fmtNum(d.card_count)} cards</span>
          {#if d.due_count > 0}
            <span class="chip bg-amber-500/10 text-amber-300 ring-amber-500/30 shrink-0">{d.due_count} due</span>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>
