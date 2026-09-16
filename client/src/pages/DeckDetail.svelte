<script>
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { api } from '../lib/api.js';
  import { fmtNum, fmtInterval } from '../lib/util.js';

  let { id } = $props();

  let deck = $state(null);
  let cards = $state([]);
  let loading = $state(true);
  let error = $state('');

  let showForm = $state(false);
  let editingId = $state(null);
  let saving = $state(false);
  let form = $state({ front: '', back: '', extra: '', tags: '' });

  let showImport = $state(false);
  let importMode = $state('append');
  let importText = $state('');
  let importName = $state('');
  let importing = $state(false);
  let importResult = $state(null);

  async function load() {
    loading = true;
    error = '';
    try {
      [deck, cards] = await Promise.all([
        api.get(`/api/decks`),
        api.get(`/api/cards?deck_id=${id}`),
      ]);
      deck = deck.find((d) => d.id === Number(id)) || null;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  let flashMsg = $state('');
  let flashTimer = null;
  function flash(msg) {
    error = '';
    flashMsg = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flashMsg = ''), 2000);
  }

  function openAdd() {
    editingId = null;
    form = { front: '', back: '', extra: '', tags: '' };
    showForm = true;
  }

  function openEdit(c) {
    editingId = c.id;
    form = { front: c.front, back: c.back, extra: c.extra, tags: c.tags };
    showForm = true;
  }

  async function saveCard() {
    if (!form.front.trim()) return;
    saving = true;
    try {
      if (editingId) {
        await api.patch(`/api/cards/${editingId}`, form);
      } else {
        await api.post('/api/cards', { ...form, deck_id: Number(id) });
      }
      showForm = false;
      editingId = null;
      form = { front: '', back: '', extra: '', tags: '' };
      await load();
      flash(editingId ? 'Card updated' : 'Card added');
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }

  async function deleteCard(c) {
    if (!confirm(`Delete card “${c.front.slice(0, 40)}”?`)) return;
    await api.del(`/api/cards/${c.id}`);
    cards = cards.filter((x) => x.id !== c.id);
    flash('Card deleted');
  }

  async function deleteDeck() {
    if (!confirm(`Delete deck “${deck.name}” and all its cards?`)) return;
    await api.del(`/api/decks/${id}`);
    window.location.hash = '#/decks';
  }

  let fileInput;
  let dragActive = $state(false);

  function readFile(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      error = 'Please choose a .csv file';
      return;
    }
    error = '';
    importName = file.name;
    const reader = new FileReader();
    reader.onload = () => (importText = String(reader.result));
    reader.readAsText(file);
  }

  function onFile(e) {
    readFile(e.target.files?.[0]);
    e.target.value = '';
  }

  function chooseFile() {
    fileInput?.click();
  }

  function onDrop(e) {
    e.preventDefault();
    dragActive = false;
    readFile(e.dataTransfer?.files?.[0]);
  }

  function onDragOver(e) {
    e.preventDefault();
    dragActive = true;
  }

  function onDragLeave() {
    dragActive = false;
  }

  async function doImport() {
    if (!importText.trim()) return;
    importing = true;
    importResult = null;
    error = '';
    try {
      importResult = await api.post('/api/import', {
        csv: importText,
        deck_id: Number(id),
        mode: importMode,
      });
      importText = '';
      importName = '';
      await load();
    } catch (e) {
      error = e.message;
    } finally {
      importing = false;
    }
  }

  function exportCsv() {
    window.location.href = `/api/export?deck_id=${id}`;
  }
</script>

{#if loading}
  <p class="text-zinc-600 text-sm py-8 text-center">Loading…</p>
{:else if !deck}
  <div class="card p-8 text-center">
    <p class="text-zinc-400 text-sm">Deck not found.</p>
    <a href="#/decks" class="btn btn-ghost mt-3"><Icon name="chevronLeft" cls="w-4 h-4" />Back to decks</a>
  </div>
{:else}
  <div class="space-y-4">
    <a href="#/decks" class="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
      <Icon name="chevronLeft" cls="w-4 h-4" />Decks
    </a>

    <header class="card p-4">
      <div class="flex items-start gap-3">
        <span class="w-3.5 h-3.5 rounded-full mt-1.5 shrink-0" style="background:{deck.color}"></span>
        <div class="flex-1 min-w-0">
          <h1 class="text-lg font-semibold text-zinc-100 truncate">{deck.name}</h1>
          {#if deck.description}<p class="text-sm text-zinc-500">{deck.description}</p>{/if}
          <p class="text-xs text-zinc-600 mt-1">
            {fmtNum(deck.card_count)} cards · {fmtNum(deck.due_count)} due
          </p>
        </div>
        <button class="btn btn-danger" onclick={deleteDeck} aria-label="Delete deck">
          <Icon name="trash" cls="w-4 h-4" />
        </button>
      </div>
    </header>

    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" onclick={openAdd}><Icon name="plus" cls="w-4 h-4" />Add card</button>
      <button class="btn btn-ghost" onclick={() => (showImport = !showImport)}>
        <Icon name="upload" cls="w-4 h-4" />Import CSV
      </button>
      <button class="btn btn-ghost" onclick={exportCsv}><Icon name="download" cls="w-4 h-4" />Export</button>
      <button class="btn btn-ghost" onclick={() => (window.location.hash = `#/study?deck=${id}`)}>
        <Icon name="study" cls="w-4 h-4" />Study
      </button>
    </div>

    {#if flashMsg}<p class="text-xs text-emerald-400">{flashMsg}</p>{/if}

    {#if showForm}
      <div class="card p-4 space-y-2">
        <p class="text-sm font-medium text-zinc-300">{editingId ? 'Edit card' : 'New card'}</p>
        <input class="input w-full" placeholder="Front (question)" bind:value={form.front} />
        <textarea class="input w-full min-h-[70px] resize-y" placeholder="Back (answer)" bind:value={form.back}></textarea>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input class="input" placeholder="Extra (optional)" bind:value={form.extra} />
          <input class="input" placeholder="Tags (optional)" bind:value={form.tags} />
        </div>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-ghost" onclick={() => { showForm = false; editingId = null; }}>Cancel</button>
          <button class="btn btn-primary" onclick={saveCard} disabled={saving || !form.front.trim()}>
            {saving ? 'Saving…' : editingId ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    {/if}

    {#if showImport}
      <div
        class="card p-4 space-y-3"
        ondrop={onDrop}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
      >
        <p class="text-sm font-medium text-zinc-300">Import CSV</p>
        <p class="text-xs text-zinc-500">Columns: <code class="text-zinc-400">front,back,extra,tags</code>. A header row is skipped automatically.</p>

        <div
          class="rounded-lg border-2 border-dashed p-5 text-center transition-colors {dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700'}"
        >
          <p class="text-sm {dragActive ? 'text-indigo-300' : 'text-zinc-400'}">
            {dragActive ? 'Drop the file here' : 'Drag & drop your .csv here, or'}
          </p>
          <button class="btn btn-primary mt-2" onclick={chooseFile}>
            <Icon name="upload" cls="w-4 h-4" />{importName || 'Choose a .csv file…'}
          </button>
          <input type="file" accept=".csv,text/csv" class="hidden" bind:this={fileInput} onchange={onFile} />
        </div>

        <div class="flex items-center gap-4 text-sm">
          <label class="flex items-center gap-1.5 text-zinc-300">
            <input type="radio" value="append" bind:group={importMode} />Append
          </label>
          <label class="flex items-center gap-1.5 text-zinc-300">
            <input type="radio" value="replace" bind:group={importMode} />Replace all
          </label>
        </div>
        {#if error}<p class="text-xs text-rose-400">{error}</p>{/if}
        {#if importResult}
          <p class="text-xs text-emerald-400">
            Imported {fmtNum(importResult.imported)} cards{importResult.skipped ? `, skipped ${importResult.skipped}` : ''}.
          </p>
        {/if}
        <div class="flex gap-2 justify-end">
          <button class="btn btn-ghost" onclick={() => (showImport = false)}>Close</button>
          <button class="btn btn-primary" onclick={doImport} disabled={importing || !importText.trim()}>
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    {/if}

    <section class="space-y-2">
      {#if cards.length === 0}
        <div class="card p-6 text-center">
          <p class="text-zinc-400 text-sm">No cards in this deck yet.</p>
        </div>
      {:else}
        {#each cards as c (c.id)}
          <div class="card p-4">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-100">{c.front}</p>
                {#if c.back}<p class="text-sm text-zinc-400 mt-0.5">{c.back}</p>{/if}
                {#if c.extra}<p class="text-xs text-zinc-600 mt-0.5">{c.extra}</p>{/if}
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span class="chip bg-zinc-800/60 text-zinc-400 ring-zinc-700/60">
                    <Icon name="refresh" cls="w-3 h-3" />{fmtInterval(c.interval)}
                  </span>
                  {#if c.tags}
                    {#each c.tags.split(',').map((t) => t.trim()).filter(Boolean) as tag (tag)}
                      <span class="chip bg-indigo-500/10 text-indigo-300 ring-indigo-500/30">{tag}</span>
                    {/each}
                  {/if}
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <button class="text-zinc-500 hover:text-zinc-200 cursor-pointer" aria-label="Edit" onclick={() => openEdit(c)}>
                  <Icon name="edit" cls="w-4 h-4" />
                </button>
                <button class="text-zinc-500 hover:text-rose-400 cursor-pointer" aria-label="Delete" onclick={() => deleteCard(c)}>
                  <Icon name="trash" cls="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </section>
  </div>
{/if}
