<script lang="ts">
  import { formatDate, parseFrenchDate } from './lib/utils';

  export let label: string;
  export let value: string;
  export let valid = true;

  let text = formatDate(value);
  let lastValue = value;
  $: if (value !== lastValue) {
    lastValue = value;
    text = formatDate(value);
    valid = true;
  }

  function chooseDate(event: Event) {
    const picked = (event.currentTarget as HTMLInputElement).value;
    if (!picked) return;
    lastValue = picked;
    value = picked;
    text = formatDate(picked);
    valid = true;
  }

  function openPicker(event: MouseEvent) {
    const input = event.currentTarget as HTMLInputElement;
    if (typeof input.showPicker === 'function') {
      event.preventDefault();
      input.showPicker();
    }
  }

  function update(event: Event) {
    text = (event.currentTarget as HTMLInputElement).value;
    const parsed = parseFrenchDate(text);
    valid = parsed !== null;
    if (parsed) {
      lastValue = parsed;
      value = parsed;
    }
  }
</script>

<div class="date-control">
  <label>{label}
    <input type="text" placeholder="JJ/MM/AAAA" maxlength="10" value={text} on:input={update} aria-invalid={!valid} aria-describedby={!valid ? `${label}-date-error` : undefined} />
  </label>
  <input class="date-picker" type="date" aria-label={`Choisir la date : ${label}`} value={value} on:click={openPicker} on:change={chooseDate} />
  {#if !valid}<span class="date-error" id={`${label}-date-error`}>Saisissez une date valide au format JJ/MM/AAAA.</span>{/if}
</div>
