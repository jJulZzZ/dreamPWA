<script lang="ts">
  import { tick } from 'svelte';
  import { normalise } from './lib/utils';

  export let label: string;
  export let values: string[] = [];
  export let suggestions: string[] = [];
  export let max: number | undefined = undefined;

  let inputs: HTMLInputElement[] = [];
  let searchInput: HTMLInputElement;
  let expanded = false;
  let search = '';
  $: available = suggestions.filter((item) => !values.some((value) => normalise(value) === normalise(item)) && normalise(item).includes(normalise(search)));

  async function openList() {
    expanded = !expanded;
    search = '';
    if (expanded) { await tick(); searchInput?.focus(); }
  }
  async function addCustom() {
    expanded = false;
    values = [...values, ''];
    await tick();
    inputs[values.length - 1]?.focus();
  }
  function addExisting(value: string) {
    values = [...values, value];
    expanded = false;
  }
  function remove(index: number) { values = values.filter((_, i) => i !== index); }
  function update(index: number, value: string) { values = values.map((item, i) => i === index ? value : item); }
</script>

<fieldset class="tag-field">
  <legend>{label}{#if max} <span class="tag-limit">({values.length}/{max})</span>{/if}</legend>
  <div class="tag-list">
    {#each values as value, index}
      <div class="tag-box">
        <input bind:this={inputs[index]} value={value} size={Math.max(4, value.length)} aria-label={`${label} ${index + 1}`} on:input={(event) => update(index, event.currentTarget.value)} on:blur={() => { if (!values[index]?.trim()) remove(index); }} on:keydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
        <button type="button" class="tag-remove" aria-label={`Supprimer ${value || label}`} on:mousedown|preventDefault on:click={() => remove(index)}>×</button>
      </div>
    {/each}
    <button type="button" class="tag-add" aria-label={`Ajouter : ${label}`} aria-expanded={expanded} disabled={max !== undefined && values.length >= max} on:click={openList}>+</button>
  </div>
  {#if expanded}
    <div class="tag-picker">
      <input bind:this={searchInput} bind:value={search} aria-label={`Rechercher : ${label}`} placeholder="Rechercher…" on:keydown={(event) => { if (event.key === 'Escape') expanded = false; }} />
      <div class="tag-options">
        {#each available as item}
          <button type="button" on:click={() => addExisting(item)}>{item}</button>
        {:else}
          <p>Aucun élément disponible.</p>
        {/each}
      </div>
      <button type="button" class="tag-custom" on:click={addCustom}>+ Ajouter un nouveau</button>
    </div>
  {/if}
</fieldset>
