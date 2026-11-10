<script lang="ts">
  import { onMount } from 'svelte';

  // The 3 × 3 orbit pattern is adapted from Svelte Bits' LatticeLoader.
  const cells = [0, 1, 2, 7, null, 3, 6, 5, 4];
  let elapsed = 0;
  $: timeLabel = elapsed < 60
    ? `${elapsed.toFixed(1)} s`
    : `${Math.floor(elapsed / 60)} min ${(elapsed % 60).toFixed(1)} s`;

  onMount(() => {
    const started = performance.now();
    const timer = window.setInterval(() => { elapsed = (performance.now() - started) / 1000; }, 100);
    return () => window.clearInterval(timer);
  });
</script>

<div class="loader" role="status" aria-label="Analyse en cours">
  <span class="lattice" aria-hidden="true">
    {#each cells as delay}
      <span class:hole={delay === null} style={`animation-delay: ${(delay ?? 0) * 108}ms`}></span>
    {/each}
  </span>
  <span aria-hidden="true">Analyse en cours</span>
  <span class="timer" aria-hidden="true">{timeLabel}</span>
</div>

<style>
  .loader { display: flex; align-items: center; gap: 10px; margin-top: 14px; color: #c6b0ff; font-size: 14px; font-weight: 500; }
  .lattice { display: grid; flex: none; grid-template-columns: repeat(3, 6px); gap: 3px; }
  .lattice span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .15; animation: lattice-orbit 864ms cubic-bezier(.77, 0, .175, 1) infinite; }
  .lattice .hole { opacity: .07; animation: none; }
  .timer { color: #a99fb5; font: 12px "DM Mono", monospace; font-variant-numeric: tabular-nums; }
  @keyframes lattice-orbit { 0%, 62%, 100% { opacity: .15; } 18%, 42% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .lattice span { animation: none; opacity: .65; } .lattice .hole { opacity: .07; } }
</style>
