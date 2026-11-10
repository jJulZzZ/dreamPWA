<script lang="ts">
  import { tick } from 'svelte';

  export let label: string;
  export let values: string[] = [];
  export let max: number | undefined = undefined;

  let inputs: HTMLInputElement[] = [];

  async function add() {
    if (max !== undefined && values.length >= max) return;
    values = [...values, ''];
    await tick();
    inputs[values.length - 1]?.focus();
  }

  function remove(index: number) {
    values = values.filter((_, i) => i !== index);
  }

  function update(index: number, value: string) {
    values = values.map((item, i) => i === index ? value : item);
  }
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
    <button type="button" class="tag-add" aria-label={`Ajouter : ${label}`} disabled={max !== undefined && values.length >= max} on:click={add}>+</button>
  </div>
</fieldset>
